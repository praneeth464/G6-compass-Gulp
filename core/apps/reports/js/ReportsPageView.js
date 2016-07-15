/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
PageView,
ReportCollection,
ReportsPageAllView,
ReportsPageDetailView,
ReportsPageView:true
*/
ReportsPageView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        'use strict';
        var thisView = this;

        this.historyStack = [];

        //set the appname (getTpl() method uses this)
        this.appName = 'reports';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        // create a router to handle individual leaderboard loads
/*        this.router = new Backbone.Router({
            routes : {
                "report/:report" : "selectSet",
                "report/:report/:chart" : "selectBoard"
            }
        });
        this.router.on("route:selectSet", function(set) {
            thisView.routedSet = set;
        });
        this.router.on("route:selectBoard", function(set, board) {
            thisView.routedSet = set;
            thisView.routedBoard = board;

            // if the data model already exists
            if( thisView.model ) {
                // if the set is already active
                if( thisView.$setSelect.val() == set ) {
                    console.log('set already active');
                    thisView.$boardSelect.val(board).change();
                }
                // change to the other set
                else {
                    console.log('set not yet active');
                    thisView.$setSelect.val(set);
                    thisView.lbSetChange(null, true);
                    thisView.$boardSelect.val(board).change();
                }
            }
        });
        Backbone.history.start();*/

        // create the data model and load the data
        this.model = new ReportCollection();
        this.model.loadData();

        // create a storage place for the subviews for the data model
        this.model.views = new Backbone.Collection();

        // create a spinner next to the drop down to indicate loading of reports list
        this.$el.find('.page-topper .control-group')
            .append('<span class="spin" />')
            .find('.spin').spin();

        // when the reports list data has finished loading...
        this.model.on('dataLoaded', function() {
            // get the selected report from the options and set it in the model
            thisView.model.setActiveReportById(thisView.options.params.reportId || thisView.options.reportId);
            // render the dropdown
            thisView.renderDropDown();
            // get rid of the spinner
            thisView.$el.find('.page-topper .control-group .spin').remove();
        });
        // ...unless it failed.
        this.model.on('dataLoadFailed', function(a,b,c) {
            // In which case, take the error and shove it into the dropdown
            thisView.renderDropDownError(a,b,c);
        });

        // listen for the active report getting set in our data model
        this.model.on('activeReportSet', function() {
            // get the active report from the model. if it is null or undefined, make it an empty string
            var reportId = thisView.model.getActiveReportId() || '';

            // set the dropdown value
            thisView.$el.find('#reportsSelect').val(reportId);

            // check to see if the last item in the history stack does not match the selected reportId
            if( _.last(thisView.historyStack) != reportId ) {
                // add the current value of the of the drop-down to the stack
                thisView.historyStack.push(reportId);
            }

            // render the child view
            thisView.renderChildView();
        });

        // listen to clicks on our back link in the pageView
        this.pageNav.on('pageBackLinkClicked', function(view, event) {
            thisView.pageBackLinkClick(event);
        });

    },

    events:{
        'change #reportsSelect' : 'dropDownChange'
    }, // events

    render: function(){

    }, // render

    renderDropDown: function() {
        var thisView = this,
            $target = this.$el.find('#reportsSelect'),
            categoryList = _.unique(this.model.pluck('category').sort(), true);

        // empty out the drop down
        $target.empty();

        // append the "All Reports" option
        $target.append(
            thisView.make('option', { value : '' }, $target.data('allReportsText') )
        );

        // loop through the categories
        _.each(categoryList, function(cat, i) {
            var $optgroup = $(thisView.make('optgroup', { label: cat })),
                reports = _.sortBy( thisView.model.where({ category : cat }), function(report) {
                    return report.get('displayName');
                });

            $target.append($optgroup);

            // loop through each of the reports in this category
            _.each(reports, function(report) {
                report = report.toJSON();

                // append an option to the select for each set
                $optgroup.append(
                    thisView.make('option', { value : report.id }, report.displayName )
                );
            });
        });

        $target.val( this.model.getActiveReportId() );

        this.trigger('renderDropDownDone');
    },

    renderDropDownError: function(jqXHR, textStatus, errorThrown) {
        var thisView = this,
            $target = this.$el.find('#reportsSelect');

        $target.empty();

        $target.append(
            thisView.make('option', {}, textStatus + ': ' + jqXHR.status + ' ' + errorThrown )
        );
    },

    renderChildView: function() {
        var thisView = this,
            activeReportId = this.model.getActiveReportId(),
            ajaxdata = { clearForm : true };

        // hide the visible child view element
        this.$el.find('.childview:visible').hide();

        // check to see if the active report exists
        // if not, render all reports
        if( activeReportId === null ) {
            // check to see if an all view has yet to be created
            if( !this.reportsPageAllView ) {
                // if not, create one
                this.reportsPageAllView = new ReportsPageAllView({ parentView : this });

                // listen for the render to get finished
                this.reportsPageAllView.on('renderDone', function() {});
            }
            else {
                this.reportsPageAllView.render();
            }
        }
        // otherwise, render a specific detail report
        else {
            // check to see if the current model has a detail view created for it
            // if not, create one and store it in our local views Collection
            if( !this.model.views.get( activeReportId ) ) {
                this.model.views.add({
                    id : activeReportId,
                    view : new ReportsPageDetailView({
                        parentView : this,
                        model : this.model.getActiveReport()
                    })
                });

                // listen for the render to get finished
                this.model.views.get( activeReportId ).get('view').on('renderDone', function() {
                    // console.log(this);
                });

                if( this.options.params.reportId === activeReportId || this.options.reportId == activeReportId ) {
                    ajaxdata.dashboardItemId = this.options.dashboardItemId;
                    ajaxdata = $.extend({}, ajaxdata, this.options.params || {});
                }
            }
            // otherwise, the view has already been created and we're just notifying the server of the switch
            else {
                this.model.views.get( activeReportId ).get('view').on('renderDone', function() {
                    thisView.model.views.get( activeReportId ).get('view').delegateEvents();
                });
                // NOTE: originally, a user could switch between views without re-initializing, but the back end code resets itself entirely. notifyOnly was a way to ignore the resulting JSON response and render with the current view data. This has been turned off until the back end code is changed to accommodate.
                // ajaxdata.notifyOnly = true;
                // NOTE: instead, we're going to tell the model to reset itself
                ajaxdata.resetModel = true;
            }

            // if a detail view has already been assigned, remove the events so we don't get duplicate triggers
            if( this.reportsPageDetailView ) {
                this.reportsPageDetailView.undelegateEvents();
            }

            // assign the detail view to the one we've created
            this.reportsPageDetailView = this.model.views.get( activeReportId ).get('view');
            this.reportsPageDetailView.preRender(ajaxdata);

        }
    },

    dropDownChange: function(opts){
        'use strict';

        // get the value of the drop-down
        var val = this.$el.find('#reportsSelect').val();

        // set the value of the active report
        this.model.setActiveReportById(val);

    },

    pageBackLinkClick: function(e) {
        // console.log(e.preventDefault);
        // if there are IDs stored in the historyStack array, let's get nitty gritty
        if( this.historyStack.length > 1 ) {
            e.preventDefault();
            // (event.preventDefault) ? event.preventDefault() : event.returnValue = false;
            // alternative to the next line: this.historyStack.pop();
            this.historyStack = this.historyStack.slice(0, this.historyStack.length - 1);
            this.model.setActiveReportById( this.historyStack[this.historyStack.length - 1] );
        }
        // if not, let the back button do its thing
    }

});