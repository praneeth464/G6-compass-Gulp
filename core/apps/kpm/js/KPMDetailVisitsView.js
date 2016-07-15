/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
G5,
KPMDetailView,
KPMDetailVisitsView:true
*/
KPMDetailVisitsView = KPMDetailView.extend({
    initialize : function(opts) {
        console.log('[INFO] KPMDetailVisitsView: initialized', this);

        //this is how we call the super-class initialize function (inherit its magic)
        KPMDetailView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass KPMDetailView
        this.events = _.extend({},KPMDetailView.prototype.events,this.events);

        this.tplName = this.settings.tplName || 'kpmDetailVisits';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'kpm/tpl/';

        // build a non-Backbone model inside this view
        this.model = this.processData(opts && opts.data);

        this.on('renderDone', function() {
            this.model.$chartContainer = this.$el.find('.chartContainer');
            this.loadChartData(this.model);
        }, this);
        this.on('chartDataLoaded', function() {
            this.renderChart(this.model);
        }, this);
    },

    processData: function(data) {
        data.type = this.settings.type;

        return data;
    }
});