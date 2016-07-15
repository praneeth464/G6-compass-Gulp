/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
G5,
KPMDetailView,
KPMDetailScoreView:true
*/
KPMDetailScoreView = KPMDetailView.extend({
    initialize : function(opts) {
        console.log('[INFO] KPMDetailScoreView: initialized', this);

        //this is how we call the super-class initialize function (inherit its magic)
        KPMDetailView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass KPMDetailView
        this.events = _.extend({},KPMDetailView.prototype.events,this.events);

        this.tplName = this.settings.tplName || 'kpmDetailScore';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'kpm/tpl/';

        // build a non-Backbone model inside this view
        this.model = this.processData(opts && opts.data);
    },

    processData: function(data) {
        data = _.map(data, function(i, k) {
            i.type = k;
            i.diff = i.actual - i.target;
            i.ontrack = i.diff === 0 ? 'ontrack' : i.diff > 0 ? 'ahead' : 'behind';
            i.diff = i.diff > 0 ? '+'+i.diff : i.diff.toString();
            return i;
        });

        return data;
    }
});