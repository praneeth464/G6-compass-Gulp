/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
FusionCharts,
G5,
TemplateManager,
EngagementDetailView:true
*/
EngagementDetailView = Backbone.View.extend({
    initialize : function() {
        var defaults = {};

        this.options = $.extend(true, {}, defaults, this.options);

        this.chartStyle = {
            showBorder : 0,
            bgAlpha : 0,
            canvasBgAlpha : 0,
            usePlotGradientColor : 0,
            showPlotBorder : 0,
            plotBorderThickness : 0,
            canvasBorderThickness : 0,
            plotBorderAlpha : 0,
            showXAxisLine: 1,
            xAxisLineColor: "#666666",
            xAxisLineThickness: 1,
            divLineAlpha : 25,
            divLineColor : '#808080',
            divLineThickness : 1,
            showZeroPlaneValue : 1,
            zeroPlaneColor : '#000000',
            zeroPlaneThickness : 1,
            showAlternateHGridColor : 1,
            alternateHGridColor : '#ffffff',
            alternateHGridAlpha : 0,
            showShadow : 0,
            use3DLighting : 0
            /*
             * removed skin-related coloring at business owners' request (bugzilla #56990)
            paletteColors : [] // to be converted to a string when used
            */
        };

        this.on('renderDone', this.renderDone, this);
    },

    render: function() {
        var that = this;

        G5.util.showSpin(this.$el);

        TemplateManager.get(this.tplName, function(tpl, vars, subs) {
            that.tplVars = vars;
            that.subTpls = subs;

            that.renderPreAppend();

            that.$el.empty().append( tpl(that.model) );
            that.$el.addClass('type-'+that.options.type);

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
    },

    renderPreAppend: function() {},
    renderDone: function() {
        this.$el.css('height', '');
    },

    /*
     * objRoot assumes a certain format for attributes:
     * .chartData = JSON data retrieved or provided in FusionCharts format
     * .chartUrl = URL to retrieve FusionCharts JSON
     * .chartUrlParams = additional parameters passed with the request for the chartUrl
     * .chart = FusionCharts object (created by renderChart)
     * .$chartContainer = jQ object target for spinner and rendering
     */
    loadChartData: function(objRoot) {
        var that = this,
            data = $.extend({}, this.options.engagementModel.params, objRoot.chartUrlParams);

        // remove a few unnecessary data attributes
        data = _.omit(data, ['timeframeNavigate', 'timeframeName']);

        if( objRoot ) {
            if( objRoot.chartData ) {
                this.trigger('chartDataLoaded');
            }
            else {
                if(!objRoot.chartUrl) {
                    return false;
                }

                $.ajax({
                    url: objRoot.chartUrl,
                    type: 'POST',
                    data: data,
                    dataType: 'g5json',
                    beforeSend: function() {
                        G5.util.showSpin(objRoot.$chartContainer);
                    }
                })
                .fail(function(jqXHR, textStatus, errorThrown) {
                    objRoot.$chartContainer.html('<p>' + textStatus + ': ' + jqXHR.status + ' ' + errorThrown + '</p>');
                })
                .done(function(servResp){
                    objRoot.chartData = servResp.data;

                    that.trigger('chartDataLoaded');
                }); // chart data JSON success
            }
        }
    },

    renderChart: function(objRoot) {
        // if the chart DOM element is missing, bail
        if( !objRoot.$chartContainer.length || !objRoot.$chartContainer.is(':visible') ) {
            return false;
        }

        // forces FusionCharts to render in javascript only (no Flash)
        FusionCharts.setCurrentRenderer('javascript');
        // helps to ameliorate conflict with modernizr.js
        FusionCharts.options.allowIESafeXMLParsing = false;

        /*
         * removed skin-related coloring at business owners' request (bugzilla #56990)
        this.buildChartPaletteColors();
        */

        objRoot.chartData.chart = $.extend(
            true,                                   // deep merge = true
            {},                                     // start with an empty object
            {                                       // add some defaults
                showZeroPies : false                    // don't show pie wedges that represent 0%
            },
            objRoot.chartData.chart,                // then overwrite with any values passed explicitly in the individual chart JSON feed,
            this.chartStyle                         // finally, override with computed chart styles
        );

        objRoot.chart = new FusionCharts({
            type : objRoot.chartData.chart.chartType.replace(/3D/i, "2d").toLowerCase(),
            id : this.options.type + 'Chart',
            width : "100%",
            height: "100%",
            renderAt : objRoot.$chartContainer.attr('id'),
            dataSource : objRoot.chartData,
            dataFormat : "json"
        });
        objRoot.chart.configure(objRoot.chartData.chartConfigure);
        objRoot.chart.render();

        if( this._fusionChart && this._fusionChart.length ) {
            this._fusionChart.push(objRoot.chart);
        }
        else {
            this._fusionChart = [objRoot.chart];
        }
    },

    /*
     * removed skin-related coloring at business owners' request (bugzilla #56990)
    buildChartPaletteColors: function() {
        var that = this;

        if( $.isArray(this.chartStyle.paletteColors) ) {
            // pull the colors of each of the tabs in the summary to use as the color scheme on the FusionChart
            this.options.engagementModelView.summaryView.$el.find('.tab').each(function() {
                that.chartStyle.paletteColors.push( G5.util.rgbToHex($(this).css('background-color')) );
            });
            // reduce down to unique colors
            this.chartStyle.paletteColors = _.uniq(this.chartStyle.paletteColors);

            // if there is only one color in the list, add two grays as placeholder colors so the charts have a little color variation
            if( this.chartStyle.paletteColors.length <= 1 ) {
                this.chartStyle.paletteColors.push('#cccccc','#333333');
            }
            // turn into a string for FusionCharts
            this.chartStyle.paletteColors = this.chartStyle.paletteColors.toString();
        }
    },
    */

    destroy: function() {
        this.undelegateEvents();
        this.$el.empty();
        this.$el.removeClass('type-'+this.options.type);

        if( this._fusionChart ) {
            _.each(this._fusionChart, function(chart) {
                chart.dispose();
            });
            this._fusionChart = null;
        }
    },

    getType: function() {
        return this.options.type;
    }
});