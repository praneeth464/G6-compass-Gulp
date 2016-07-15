/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
ModuleView,
FusionCharts,
G5,
ReportsModuleView:true
*/
ReportsModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function(opts){
        "use strict";
        var that = this;

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // half-size big
            {w:4,h:4}  // biggest
        ],{silent:true});

        //report index
        this.reportIndex = this.model.get('reportIndex');

        //listen for data updates (there is one on a onthespot card return JSON)
        G5.ServerResponse.on('dataUpdate_reportsFavorites',function(data){
            var newIndex = false;

            for (var i = 0; i < data.favorites.length; i++) {
                if (that.favoriteId === data.favorites[i].id) {
                    newIndex = i;
                } // if
            } // for each favoriteId on page

            if ( (that.reportIndex !== newIndex) && (newIndex !== false) ) {
                that.model.setOrder(newIndex);
                that.reportIndex = newIndex;
            } // if

            if (newIndex === false) {
                that.emptyModule();
                that.model.setOrder(data.favorites.length);
                that.reportIndex = data.favorites.length;
            } // if

        },this); // on

        this.on('templateLoaded', function(tpl, vars, subTpls) {
            // console.log(tpl, vars, subTpls);
            that.tplVars = vars;
            that.subTpls = subTpls;

            //it is now safe to load chart (trigger render)
            that.loadChart();
        });
    }, // initialize

    // populate module & draw charts
    render: function(){
        "use strict";
        var that = this;

        this.getTemplateAnd(function(tpl){
            //when template manager has the template, render it to this element
            that.$el.append( tpl( _.extend({},that.model.toJSON(),{cid:that.cid}) ));

            that.$el.find('.reportsModule')
                .append('<span class="spin" />')
                .find('.spin').spin({color: '#e5e5e5'});
            //it is now safe to load chart (trigger render)
            // that.loadChart();

            //in initial load, templates may miss out on filter event
            //so we do filter change work here just in case
            that.doFilterChangeWork();
        }); // getTemplateAnd

        return this;//chaining
    }, // render

    // load JSON for this chart
    loadChart: function(){
        "use strict";
        var that = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_REPORTS_MODULE,
            data: {
                method : 'display',
                newIndex : this.reportIndex
            },
            error: function(jqXHR, textStatus, errorThrown) {
                that.$el.find('#chartContainer'+that.reportIndex).html(
                    that.make('p', {}, textStatus + ': ' + jqXHR.status + ' ' + errorThrown )
                );
            },
            success: function(servResp){
                var json = {};

                // if no favorite in servResp
                if (servResp.data.favorites.length === 0) {
                    that.emptyModule();
                }
                else {
                    that.favoriteId = servResp.data.favorites[0].id;
                    // else process favorite data & populate template
                    that.thisFavorite = servResp.data.favorites[0];

                    json.clickThruUrl = G5.props.URL_REPORTS_ALL + (G5.props.URL_REPORTS_ALL.indexOf("?") !== -1 ? '&' : '?') + 'reportId=' + that.thisFavorite.parentId + '&dashboardItemId=' + that.thisFavorite.id;
                    json.displayName = that.thisFavorite.displayName;
                    json.favoriteParameters = that.thisFavorite.favoriteParameters;
                    json.reportIndex = that.reportIndex;

                    that.$el.find('.reportsModule').html( that.subTpls.favoriteTpl(json) );

                    that.renderChart();
                } // if
            } // ajax success
        }); // ajax
    }, // loadChart

    emptyModule: function(){
        "use strict";

        // console.log(this.$el);
        this.$el.find('.reportsModule').html( this.subTpls.addTpl({}) );

        this.$el.find('.reportsModule').click(function(){
            window.location.href = G5.props.URL_REPORTS_ALL;
        });

        // I'm not sure what this does, but I kept it in here just in case we come across a new error now that I changed this to use subTpls

        /* var myChartGenerated = [],
            chartIdIWantToDelete = '';

        // need to determine whether chart exists
        // if so, use fusioncharts dispose method
        chartIdIWantToDelete = this.$el.find('[id^=chartId]').attr('id');//'chartId' + this.reportIndex;

        if ($('#'+chartIdIWantToDelete).length > 0) {
            FusionCharts(chartIdIWantToDelete).dispose();
        }
        this.$el.find('#chartContainer'+this.reportIndex+' .spin').spin(false);*/

    }, // emptyModule

    renderChart: function(){
        "use strict";
        var that = this,
            i = this.reportIndex;

        this.$el
            .find('.chartContainer .spin')
            .spin({color: '#e5e5e5'});

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: that.thisFavorite.dataUrl,
            error: function(jqXHR, textStatus, errorThrown) {
                that.$el.find('#chartContainer'+i).html(
                    that.make('p', {}, textStatus + ': ' + jqXHR.status + ' ' + errorThrown )
                );
            },
            data: {},
            success: function(servResp){
                var data = servResp.data;
                // forces FusionCharts to render in javascript only (no Flash)
                FusionCharts.setCurrentRenderer('javascript');
                // helps to ameliorate conflict with modernizr.js
                FusionCharts.options.allowIESafeXMLParsing = false;

                // copy fusionChartsParemeters into the location that FC expects it to be
                data.chart = $.extend(
                    true,                                       // deep merge = true
                    {},                                         // start with an empty object
                    {                                           // add some defaults
                        showZeroPies : false                        // don't show pie wedges that represent 0%
                    },
                    that.thisFavorite.fusionChartsParameters,   // merge in the fusionChartsParameters from chartSet
                    servResp.data.chart                         // then overwrite with any values passed explicitly in the individual chart JSON feed
                );

                that.chart = new FusionCharts({
                    type : that.thisFavorite.chartType,
                    id : "chartId"+i,
                    width : "100%",
                    height: "100%",
                    renderAt : "chartContainer"+i,
                    dataSource : data,
                    dataFormat : "json"
                });
                that.chart.configure(that.thisFavorite.chartConfigure);
                that.chart.render();
            } // chart data JSON success
        }); // individual chart ajax

        return this;
    } // renderChart

}); // extend
