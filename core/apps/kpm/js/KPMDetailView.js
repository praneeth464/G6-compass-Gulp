/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
FusionCharts,
G5,
TemplateManager,
KPMDetailView:true
*/
KPMDetailView = Backbone.View.extend({
    initialize : function(opts) {
        var settings = {};

        this.settings = $.extend(true, {}, settings, opts);
    },

    render: function() {
        var that = this;

        G5.util.showSpin(this.$el);

        TemplateManager.get(this.tplName, function(tpl) {
            that.$el.empty().append( tpl(that.model) );

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
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
        var that = this;

        if( objRoot ) {
            if( objRoot.chartData ) {
                this.trigger('chartDataLoaded');
            }
            else {
                $.ajax({
                    url: objRoot.chartUrl,
                    type: 'POST',
                    data: objRoot.chartUrlParams,
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
        // forces FusionCharts to render in javascript only (no Flash)
        FusionCharts.setCurrentRenderer('javascript');
        // helps to ameliorate conflict with modernizr.js
        FusionCharts.options.allowIESafeXMLParsing = false;

        objRoot.chart = new FusionCharts({
            type : objRoot.chartData.chart.chartType,
            id : this.settings.type + 'Chart',
            width : "100%",
            height: "100%",
            renderAt : objRoot.$chartContainer.attr('id'),
            dataSource : objRoot.chartData,
            dataFormat : "json"
        });
        // objRoot.chart.configure(this.thisFavorite.chartConfigure);
        objRoot.chart.render();

        if( this._fusionChart && this._fusionChart.length ) {
            this._fusionChart.push(objRoot.chart);
        }
        else {
            this._fusionChart = [objRoot.chart];
        }
    },

    destroy: function() {
        this.$el.empty();

        if( this._fusionChart ) {
            _.each(this._fusionChart, function(chart) {
                chart.dispose();
            });
            this._fusionChart = null;
        }
    },

    getType: function() {
        return this.settings.type;
    }
});