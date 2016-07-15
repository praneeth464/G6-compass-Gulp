/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
G5,
EngagementDetailView,
EngagementDetailVisitsView:true
*/
EngagementDetailVisitsView = EngagementDetailView.extend({
    initialize : function() {
        console.log('[INFO] EngagementDetailVisitsView: initialized', this);

        //this is how we call the super-class initialize function (inherit its magic)
        EngagementDetailView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass EngagementDetailView
        this.events = _.extend({},EngagementDetailView.prototype.events,this.events);

        this.tplName = this.options.tplName || 'engagementDetailVisits';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'engagement/tpl/';

        // build a non-Backbone model inside this view
        this.model = this.processData(this.options && this.options.data);

        // these listeners only need to be added when we're rending team mode with its chart
        if( this.options.mode == 'team' ) {
           this.on('renderDone', function() {
                this.model.$chartContainer = this.$el.find('.chartContainer');
                this.loadChartData(this.model);
            }, this);
            this.on('chartDataLoaded', function() {
                this.renderChart(this.model);
            }, this);
        }
    },

    processData: function(data) {
        data.type = this.options.type;

        return data;
    },

    renderPreAppend: function() {
        this.model.mode = this.options.mode;
    },

    /*
     * removed skin-related coloring at business owners' request (bugzilla #56990)
    buildChartPaletteColors: function() {
        //this is how we call the super-class buildChartPaletteColors function (inherit its magic)
        EngagementDetailView.prototype.buildChartPaletteColors.apply(this, arguments);

        // reverse the order of the paletteColors for this detail (so the visits color is first) but only if we don't have the two placeholder colors at the end of the list
        this.chartStyle.paletteColors = this.chartStyle.paletteColors.match(/#cccccc,#333333$/) ? this.chartStyle.paletteColors : this.chartStyle.paletteColors.split(',').reverse().toString();
    }
    */
});