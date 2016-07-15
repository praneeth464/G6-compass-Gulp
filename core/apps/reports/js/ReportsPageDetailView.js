/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
$,
_,
Backbone,
FusionCharts,
G5,
TemplateManager,
ReportsPageView,
ReportsChangeFiltersPopoverView,
ReportsFavoritesPopoverView,
BreadcrumbView,
PaginationView,
ReportsPageDetailView:true
*/
ReportsPageDetailView = Backbone.View.extend({

    el : '#reportsPageDetailView',

    initialize: function(opts){
        var thisView = this,
            defaults = {};

        this.options = $.extend(true, defaults, opts);

        this.parentView = opts && opts.parentView || new ReportsPageView();
        this.reportId = this.model.get('id');

        this.tplName = 'reportsPageDetail';
        this.tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'reports/tpl/';

        // forces FusionCharts to render in javascript only (no Flash)
        FusionCharts.setCurrentRenderer('javascript');
        // helps to ameliorate conflict with modernizr.js
        FusionCharts.options.allowIESafeXMLParsing = false;

        this.model.on('fullDataLoaded', function(opts) {
            opts = opts ? opts : {};

            switch(opts.type) {
                case "drill" :
                case "urlparams" :
                    thisView.chartsDispose();
                    thisView.render();
                    break;
                case "tabular" :
                    thisView.processFullData();
                    thisView.renderTabularData();
                    break;
                case "changefilters" :
                    thisView.resetView();
                    thisView.chartsDispose();
                    thisView.render();
                    break;
                default :
                    thisView.chartsDispose();
                    thisView.render();
            }
        });

        this.model.on('fullDataLoadFailed', function(a,b,c) {
            thisView.renderDataLoadError(a,b,c);
        });

        this.model.on('activeChartSet', function() {
            thisView.charts.selected = thisView.model.getActiveChart();
            thisView.charts.selectedIndex = thisView.model.getActiveChartIndex();

            thisView.chartsActivate();
        });

        this.on('renderDone', function(success) {
            if( success === false ) { return false; }
            thisView.postRender();
        });
    },

    events : {
        'click .exportCsvButton' : 'exportCsv',
        'click #exportChartPdf' : 'chartsExportPdf',
        'click #resultsTableWrapper a' : 'tableClickHandler',
        'contextmenu #resultsTableWrapper a' : 'tableRightClickHandler'
    },

    // methods are alphabetized from here on down
    // ================

    breadcrumbClickHandler: function(crumb) {
        // note that without using .toJSON we would be operating directly on the urlParams as stored in the model instead of creating a copy
        // ultimately, we're going to set the stored params so operating directly is exactly what we want to do, but this is safer juuuuust in case
        var crumbParams = this.model.getUrlParams(crumb).toJSON();

        G5.util.showSpin( this.$el, {
                cover : true
        } );

        // java has requested that we set this value to true when going back up a breadcrumb trail
        crumbParams.nodeAndBelow = true;
        // when clicking on the top level crumb, java requested we add a parameter to the request
        crumbParams.rootLevel = crumb === 0 ? true : null;
        // this is why we don't want to operate directly on the model's stored params even though we're updating the same object we just copied
        this.model.updateUrlParams(crumbParams, crumb);

        this.model.setActiveUrlParams(crumb);
    },

    chartsActivate: function() {
        var thisView = this,
            $chartDisplaysTop = this.$el.find('.chartDisplaysTop'),
            chartDisplaysTop = this.charts.selected.chartDisplaysTop || $chartDisplaysTop.data('default');

        this.charts.$root.find('.chartThumbs li').eq(this.charts.selectedIndex).addClass('activeSlide');

        this.chartsGenerate(this.charts.selectedIndex);

        this.$el.find('#chartName').text( this.charts.selected.displayName );
        this.$el.find('.chartDisplaysTop').text( chartDisplaysTop );

    },

    chartsDispose: function() {
        if( this.charts ) {
            _.each(this.charts.FC, function(chart) {
                FusionCharts(chart.id).dispose();
            });
        }
    },

    chartsExportPdf: function(e) {
        'use strict';
        e.preventDefault();

        //Get reference to chart.
        var chart = FusionCharts.items[this.charts.selected.id];

        if ( (chart !== null) && (!$('#exportChartPdf').hasClass('disabled')) ) {
           // Now, we proceed with exporting only if chart has finished rendering.
           if (chart.hasRendered() !== true)
           {
                  alert("Please wait for the chart to finish rendering, before you can invoke exporting");
                  return;
           }

           // call exporting function
           chart.exportChart( {exportFormat: 'PDF', exportTargetWindow:'_blank'} );
           $('#exportChartPdf').addClass('disabled').delay(5000).removeClass('disabled');
        } // if chart exists

    },

    chartsGenerate: function(index) {
        'use strict';
        var thisView = this,
            $chartContainer = this.charts.$root.find('.reportsChart-moveable-item').eq(index),
            workingChart = this.model.getActiveChart(),
            chartId = workingChart.id;

        // check to see if the chart has been generated
        // if so, kick us out of here
        if( this.charts.FC[chartId] ) {
            return false;
        }

        // check to see if the chart already has its data
        // if so, skip the ajax
        if( workingChart.data ) {
            this.chartsGenerateFC(workingChart);
            return false;
        }

        G5.util.showSpin($chartContainer);

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: workingChart.dataUrl,
            data: {},
            error: function(jqXHR, textStatus, errorThrown) {
                $chartContainer.html(
                    thisView.make('p', {}, textStatus + ': ' + jqXHR.status + ' ' + errorThrown )
                );
            },
            success: function(servResp){
                workingChart.data = servResp.data;

                // put parameters from chartSet into individual chart data feed objects
                workingChart.data.chart = $.extend(
                    true,                                   // deep merge = true
                    {},                                     // start with an empty object
                    {                                       // add some defaults
                        showZeroPies : false                    // don't show pie wedges that represent 0%
                    },
                    workingChart.fusionChartsParameters,    // merge in the fusionChartsParameters from chartSet
                    servResp.data.chart                     // then overwrite with any values passed explicitly in the individual chart JSON feed
                );

                // store the shared configuration data with this chart
                workingChart.data.configure = thisView.model.get('chartConfigure');

                thisView.chartsGenerateFC(workingChart);
            }
        });

    },

    chartsGenerateFC: function(chart) {
        // render charts into chart container
        // check to see if the chart exists in the FC object and if so, render it
        if (FusionCharts.items[chart.id]) {
            this.charts.FC[chart.id] = FusionCharts.items[chart.id].render();
        }
        // if it doesn't exist yet, render it from the start
        else {
            this.charts.FC[chart.id] = new FusionCharts({
                type : chart.chartType,
                id : chart.id,
                width : "100%",
                height: "100%",
                renderAt : "chartContainer-"+chart.id,
                dataSource : chart.data,
                dataFormat : "json"
            });
            this.charts.FC[chart.id].configure(chart.data.configure);
            this.charts.FC[chart.id].render();
        }
    },

    chartsRender: function() {
        var thisView = this,
            modData = thisView.model.get('chartSet');

        this.charts = {
            $root : this.$el.find('#chartRow'),
            set : modData,
            FC : {},
            selected : this.model.getActiveChart(),
            selectedIndex : this.model.getActiveChartIndex()
        };

        // bail if we don't have any charts
        if( !this.charts.set.length ) {
            return false;
        }

        // set up the cycle if there is more than one chart
        if( this.charts.set.length > 1 ) {
            this.charts.$root.find('#chartInFocus').cycle({
                fx:     'scrollHorz',
                speed:  'fast',
                timeout: 0,
                startingSlide: thisView.charts.selectedIndex,
                pager:  '.chartThumbs',
                pagerAnchorBuilder: function(idx) {
                    // return selector string for existing anchor
                    return '.chartThumbs li:eq(' + idx + ')';
                },
                after: function(curr, next, opts){
                    thisView.model.setActiveChartByIndex(opts.currSlide);
                    // thisView.chartsActivate(opts.currSlide);
                }
            });
        }
        // otherwise, "click" the only one
        else {
            this.model.setActiveChartByIndex(0);
            // this.chartsActivate(0);
        }
    },

    exportCsv: function(e, force) {
        if( e.preventDefault ) { e.preventDefault(); }

        var thisView = this,
            $tar = $(e.target).closest('a');

        // if large audiences are set to true, we make an ajax request to fire off the report process on the backend
        if( G5.props.REPORTS_LARGE_AUDIENCE === true ) {
            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: $tar.attr('href'),
                data: {},
                error: function(jqXHR, textStatus, errorThrown) {
                    thisView.$el.prepend('<p class="alert alert-error">' + textStatus + ': ' + jqXHR.status + ' ' + errorThrown + '</p>');
                },
                success: function(servResp){
                    // Shouldn't ever be a response to process
                    // This event should always result in a serverCommand in the JSON
                    return;
                }
            });
        }
        // if large audiences are set to false, we treat this like a normal link
        else {
            window.location.assign($tar.attr('href'));
        }
    },

    handleSpecialCases: function() {
        // this handles all those special reports and their behaviors -- export only, show params, etc.
        var thisView = this;

        // export only reports
        if( this.model.get('exportOnly') ) {
            // exportCsv is expecting a jQuery event object with an attribute of target (like any good jQ event object would have)
            // we fake the object by only sending the target it's expecting so it can dig out the HREF from the A tag
            this.exportCsv({ target : $('<a href="'+this.tplJson.tabularData.meta.exportFullReportUrl[0].url+'" />') }, true);
            this.$el.find('#exportFullReport .exportCsvButton').hide();
            // thisView.$el.find('#exportFullReport .exportCsvButton').children().first().trigger('click');
        }

        // force parameters

        // test to see if this report has the forceParametersPopover set to true in the JSON...
        // ...AND if BOTH of the following resolve to a falsy value
        //      - the _suppressParametersPopover flag
        //      - a selectedChartId was set in the JSON
        if( this.model.get('forceParametersPopover') && !(this._suppressParametersPopover || this.model.get('selectedChartId')) ) {
            this.$el.find('.reportsChangeFiltersPopoverTrigger').qtip('show');
        }
        // if we aren't forcing the parameters popver, it is safe to assume that we can suppress it from here on
        else {
            this._suppressParametersPopover = true;
        }
    },

    // hideSpin: function($el) {
    //     $el.find('.spin, .spincover').remove();
    // },

    paginationClickHandler: function(page) {
        G5.util.showSpin( this.$el.find('#tabularResultsContainer'), {
            cover : true
        } );

        this.model.loadFullData({force: true, data: {
                pageNumber : page
            },
            type : 'tabular'
        });
    },

    postRender: function() {
        var thisView = this;

        this.chartsRender();

        this.renderColumnDefinitionsPopover();

        this.renderChangeFiltersPopover();

        this.renderFavoriteReportsPopover();

        this.handleSpecialCases();
    },

    preRender: function(ajaxdata) {
        var thisView = this;

        this.$el.empty().show();
        G5.util.showSpin(this.$el);

        // reset the forceParametersPopover trigger when we reload the view from scratch
        // (ideally, we'd do this reset logic in the handleSpecialCases method, but that gets called every time the model gets new data and I couldn't figure out the best way to work around that)
        if( this.model.get('forceParametersPopover') ) {
            thisView._suppressParametersPopover = false;
        }

        // load full data
        this.model.loadFullData({ data : ajaxdata });

    },

    processFullData: function() {
        var tplJson = this.model.toJSON(); // local variable to use while processing

        // kicking this to a separate method for readability and potential convenience
        tplJson.tabularData = this.processTabularData(tplJson.tabularData);


        // each report has a special CM key containing the full translated string for the "As of" text
        // the key ouput will have a {0} placeholder where the timestamp value is inserted
        // this allows the translations to have plain text and the timestamp in any order
        // we embed this CM output as a tplVariable in our reportsPageDetail Handlebars template
        // we also have an asOfTimestamp subTpl embedded in our reportsPageDetail Handlebars template
        // we pass the report.reportDetailAsOfTimestamp value from the JSON to the subTpl, then replace the {0} with the rendered output
        // the final string is assigned to report.reportDetailAsOfTimestampFormatted in the JSON to be passed to the main template
        if(this.tplVariables.asOfTimestamp) {
            tplJson.reportDetailAsOfTimestampFormatted = G5.util.cmReplace({
                cm: this.tplVariables.asOfTimestamp,
                subs: [
                    this.subTpls.asOfTimestamp({reportDetailAsOfTimestamp: tplJson.reportDetailAsOfTimestamp})
                ]
            });
        }


        // take the finished JSON and give it over to the view
        this.tplJson = tplJson;
        // console.log(this.tplJson);
    },

    processTabularData: function(tabularData) {
        var thisView = this,
            urlColIndexes = [],
            urlCols = [],
            mergeAndPurge;

        // UTILITY function - URL merge and purge to collapse rows down to useful objects
        mergeAndPurge = function(row) {
            // iterate through each of the urlColIndexes (IN order)
            // 5.4 fix: sort only works alphabetically. Needs a sort function inside to compare numbers.
            _.each(urlColIndexes.sort(function(a, b){return a-b}), function(place) {
                // find the column in the row at the preceding index and set some values
                row[place-1] = {
                    link : true,
                    text : row[place-1],
                    url : row[place],
                    urlName : urlCols[place].name,
                    target : urlCols[place].target
                };
            });

            // chuck url columns out of the list (iterating through the urlColIndexes backwards because .splice resets indexes)
            _.each(urlColIndexes.reverse(), function(place) {
                row.splice(place, 1);
            });

            _.each(row, function(col, place, list) {
                col = _.isObject(col) ? col : {
                    text : col
                };
                col.type = tabularData.meta.columns[place].type;

                if( tabularData.meta.sortedOn == tabularData.meta.columns[place].id ) {
                    col.sortedOn = true;
                    col.sortedBy = tabularData.meta.sortedBy || 'asc';
                }

                row[place] = col;
            });

            return row;
        };


        // flatten the tabular data from an array to a single object (this seems dangerous, but that's how Sam is treating it in his JS)
        tabularData = tabularData[0];

        // determine if we need a summary row and if so build the object
        if( _.any(tabularData.meta.columns, function(col) { return col.summary; }) ) {
            tabularData.meta.summary = _.pluck(tabularData.meta.columns, 'summary');
        }

        // iterate through each meta column
        _.each(tabularData.meta.columns, function(col, index, list) {
            // if the column is type URL
            if( col.type == 'URL' ) {
                // add the index of the column to the urlColIndexes array and the column itself to the urlCols array
                urlColIndexes.push(index);
                urlCols[index] = col;
            }
            // otherwise
            else {
                // if the column is sortable
                if( col.sortable ) {
                    // mark if this column is the one on which the table is sorted
                    col.sortedOn = tabularData.meta.sortedOn == col.id ? true : false;
                    // default to ascending sort, but mark with the actual sort state
                    col.sortedBy = tabularData.meta.sortedOn == col.id ? tabularData.meta.sortedBy : 'asc';
                    // Handlebars helper because #if can't compare values
                    col.sortedByDesc = col.sortedBy == 'desc' ? true : false;
                }
            }
        });

        // chuck url columns out of the list (iterating through the urlColIndexes backwards because .splice resets indexes)
        _.each(urlColIndexes.reverse(), function(place) {
            tabularData.meta.columns.splice(place, 1);
        });

        // check to see if we have any results
        if( tabularData.results.length ) {
            // iterate through each row of results and do the URL merge and purge
            _.each(tabularData.results, function(row) {
                row = mergeAndPurge(row);
            });
        }

        // iterate through the summary row and do the URL merge and purge
        if( tabularData.meta.summary ) {
            tabularData.meta.summary = mergeAndPurge(tabularData.meta.summary);
        }

        // kick it back to the caller
        return tabularData;
    },

    render: function(opts) {
        var thisView = this,
            reportId = opts && opts.reportId || this.reportId;

        // console.log('rendering...?', reportId);

        TemplateManager.get(this.tplName,function(tpl,vars,subTpls){
            // console.log('TemplateManager callback...');
            // store our subTpls globally for access from elsewhere
            thisView.subTpls = subTpls;
            thisView.tplVariables = vars;

            thisView.processFullData();

            // clean out the view root and append our rendered template
            thisView.$el
                .empty()
                .html(
                    tpl( thisView.tplJson )
                );

            thisView.renderTabularData();
            thisView.renderPagination();
            thisView.renderBreadCrumbs();

            // trigger a renderDone event
            thisView.trigger('renderDone');
        },this.tplUrl);
    },

    renderBreadCrumbs: function() {
        var thisView = this;

        if( !this.tabularBreadcrumbs ) {
            this.tabularBreadcrumbs = new BreadcrumbView({
                el : this.$el.find('#breadCrumbs'),
                crumbs : this.model.get('urlParams').pluck("displayName"),
                showRootWhenAlone : false,
                ajax : true,
                tpl : this.subTpls.breadcrumbTpl || false
            });

            this.tabularBreadcrumbs.on('goToCrumb', function(crumb) {
                thisView.breadcrumbClickHandler(crumb);
            });

            this.on('renderDone', function() {
                thisView.tabularBreadcrumbs.setProperties({
                    crumbs : thisView.model.get('urlParams').pluck("displayName")
                });
            });
        }
        else {
            this.tabularBreadcrumbs.setElement( this.$el.find('#breadCrumbs') );
        }
    },

    renderChangeFiltersPopover: function() {
        if( !this.$el.find('.reportsChangeFiltersPopoverTrigger').length ) {
            return false;
        }

        var thisView = this;

        this.$el.find('.reportsChangeFiltersPopoverTrigger').each(function(){
            thisView.changeFiltersPopoverView = new ReportsChangeFiltersPopoverView({
                position:{
                    target: $('#reportsPageDetailView'),
                        my: 'top center',
                        at: 'top center',
                 container: $('.reports.page'),
                  viewport: $(window),
                    adjust: {method:'shift none'}/*,
                    adjust: {
                         x: 11,
                         y: 36
                    }*/
                },
                trigger: this,
                parentView: thisView
            }); // ReportsChangeFiltersPopoverView
        }); // popover trigger
    },

    renderColumnDefinitionsPopover: function() {
        var thisView = this,
        $dataContainer = this.$el.find('#reportDefinitionListContents dl').children();

        if( !$dataContainer.length ) {
            this.$el.find('#reportDefinitionListContents').remove();
            this.$el.find('.columnDefinitions-popover').remove();
            return false;
        }

        this.$el.find('.columnDefinitions-popover').qtip({
            content : $('#reportDefinitionListContents').html(),
            position : {
                my : 'left center',
                at : 'right center',
                container : thisView.$el
            },
            style : {
                classes : 'ui-tooltip-shadow ui-tooltip-light columnDefinitionsPopover',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            show: {
                event: 'click'
            },
            hide: {
                event: 'click unfocus'
            }
        }).click(function(e) {
            e.preventDefault();
        });
    },

    renderDataLoadError: function(jqXHR, textStatus, errorThrown) {
        // clean out the view root and append our error messaging
        this.$el
            .empty()
            .html(
                this.make('p', {}, textStatus + ': ' + jqXHR.status + ' ' + errorThrown )
            );

        // trigger a renderDone event just in case and include a false argument to indicate failure
        this.trigger('renderDone', false);
    },

    renderFavoriteReportsPopover: function() {
        if( !this.$el.find('#reportsFavoritesPopoverTrigger').length ) {
            return false;
        }

        var thisView = this;

        this.$el.find('#reportsFavoritesPopoverTrigger').each(function(){
            thisView.favoritesPopoverView = new ReportsFavoritesPopoverView({
                position:{
                    // target: $('#reportsPageDetailView'),
                        my: 'top center',
                        at: 'top center',
                 container: $('.reports.page'),
                  viewport: $(window),
                    adjust: {method:'shift none'}/*,
                    adjust: {
                         x: -183,
                         y: -209
                    } */
                },
                tip: {
                    corner: false
                },
                trigger: this,
                showViewMyReportsLink: true,
                triggeredFromModuleView: false
            }); // ReportsFavoritesPopoverView
        });
    },

    renderPagination: function() {
        var thisView = this;

        // if our data is paginated, add a special pagination view
        if( this.tplJson.tabularData.meta.maxRows > this.model.getUrlParams().get('resultsPerPage') ) {
            // if no pagination view exists, create a new one
            if( !this.tabularPagination ) {
                this.tabularPagination = new PaginationView({
                    el : this.$el.find('.paginationControls'),
                    // pages: 20,
                    // current: 4,
                    pages : Math.ceil(this.tplJson.tabularData.meta.maxRows / this.model.getUrlParams().get('resultsPerPage')),
                    current : this.model.getUrlParams().get('pageNumber'),
                    per : this.model.getUrlParams().get('resultsPerPage'),
                    total : this.tplJson.tabularData.meta.maxRows,
                    ajax : true,
                    showCounts : false,
                    tpl : this.subTpls.paginationTpl || false
                });

                this.tabularPagination.on('goToPage', function(page) {
                    thisView.paginationClickHandler(page);
                });

                this.model.on('fullDataLoaded', function() {
                    thisView.tabularPagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.tplJson.tabularData.meta.maxRows / thisView.model.getUrlParams().get('resultsPerPage')),
                        current : thisView.model.getUrlParams().get('pageNumber')
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.tabularPagination.setElement( this.$el.find('.paginationControls') );

                // we know that pagination should exist because of the if with maxRows, so we need to explicitly render with proper data if it has no children
                if( !this.tabularPagination.$el.children().length ) {
                    this.tabularPagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.tplJson.tabularData.meta.maxRows / thisView.model.getUrlParams().get('resultsPerPage')),
                        current : thisView.model.getUrlParams().get('pageNumber')
                    });
                }
            }
        }
    },

    renderTabularData: function() {
        var thisView = this,
            renderTpl;

        // utility function
        renderTpl = function(tpl) {
            // get rid of the spinner
            G5.util.hideSpin( thisView.$el.find('#tabularResultsContainer') );

            // clean out the table container and append our rendered template
            thisView.$el.find('#resultsTableWrapper')
                .empty()
                .html(
                    tpl(thisView.tplJson)
                );

            thisView.$el.find('#resultsTableWrapper table').responsiveTable({
                pinLeft : [0]
            });

            // trigger a renderDone event
            thisView.trigger('renderTabularDataDone');
        };

        if( this.subTpls.tableTpl ) {
            renderTpl(this.subTpls.tableTpl);
        }
        else {
            // due to postRender relying on the contents of the tabular data, we need to set "false" for "async" when falling into the TemplateManager routine
            TemplateManager.get('reportsTable',function(tpl,vars,subTpls){
                renderTpl(tpl);
            },this.tplUrl,null,false);
            // "null" is the "noHandlebars" option, "false" is the "async" option
        }

    },

    resetView: function() {
        this.model.resetUrlParams();
    },

    // showSpin: function($el, opts) {
    //     var settings = {
    //         cover : false
    //     };
    //     settings = $.extend(settings, opts);

    //     $el
    //         .append('<span class="spin" />')
    //         .find('.spin').spin();

    //     if( settings.cover ) {
    //         $el.find('.spin').wrap('<div class="spincover" />');
    //     }
    // },

    tableClickHandler: function(e) {
        e.preventDefault();

        var thisView = this,
            $tar = $(e.target).closest('a');

        // for table headers
        if( $tar.closest('.sortable').length ) {
            var $newTar = $tar.closest('.sortable'),
                sortData = $newTar.data(),
                addlData = $.query.load( $newTar.find('a').attr('href'), {responseType: 'html'}, function(responseText, textStatus, XMLHttpRequest){ G5.serverTimeout(responseText); } ).keys;

            G5.util.showSpin( this.$el.find('#tabularResultsContainer'), {
                cover : true
            } );

            this.model.loadFullData({
                force: true,
                data: $.extend(
                    true,       // deep merge = true
                    {},         // start with an empty object
                    addlData,   // merge in addlData
                    {           // then overwrite with these values
                        pageNumber : 1,
                        sortedOn : sortData.sortById,
                        sortedBy : sortData.sortedOn === true && sortData.sortedBy == 'asc' ? 'desc' : 'asc'
                    }
                ),
                type : 'tabular'
            });
        }

        // for table cells
        else if( $tar.closest('tbody, tfoot').length ) {
            var drillData = $.query.load( $tar.attr('href') ).keys,
                displayName = $tar.text(),
                linkTarget = $tar.attr('target');

            // extend the drillData with some defaults
            drillData = $.extend({
                sortedOn : 1,
                sortedBy : 'asc', // or desc
                pageNumber : 1
            }, drillData);

            // if the link has a special target, we aren't doing a JSON load
            if( linkTarget ) {
                switch( linkTarget ) {
                    case '_blank' :
                    case '_parent' :
                    case '_self' :
                    case '_top' :
                        break;
                    case '_sheet' :
                        G5.util.doSheetOverlay(false, $tar.attr('href'), $tar.data('urlName'));
                        break;
                    default :
                        break;
                }
                return;
            }

            G5.util.showSpin( this.$el, {
                cover : true
            } );

            this.model.loadFullData({
                force: true,
                data: drillData,
                addParams : true,
                type : 'drill',
                displayName : displayName
            });
        }
    },

    tableRightClickHandler: function(e) {
        // prevent context menus from showing up when right-clicking in the table
        // from http://stackoverflow.com/a/4920257
        e.preventDefault();
    }

});
