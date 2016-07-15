/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
G5,
EngagementDetailView,
EngagementDetailScoreView:true
*/
EngagementDetailScoreView = EngagementDetailView.extend({
    initialize : function() {
        console.log('[INFO] EngagementDetailScoreView: initialized', this);

        //this is how we call the super-class initialize function (inherit its magic)
        EngagementDetailView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass EngagementDetailView
        this.events = _.extend({},EngagementDetailView.prototype.events,this.events);

        this.tplName = this.options.tplName || 'engagementDetailScore';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'engagement/tpl/';

        // build a non-Backbone model inside this view
        this.model = this.processData(this.options && this.options.data);
    },

    processData: function(data) {
        data = _.map(data, function(i, k) {
            // test to make sure each object is actually an object before operating on it
            if( _.isObject(i) ) {
                i.type = k;
                i.diff = i.actual - i.target;
                i.ontrack = i.diff === 0 ? 'ontrack' : i.diff > 0 ? 'ahead' : 'behind';
                i.diff = i.diff > 0 ? '+'+i.diff : i.diff.toString();
                return i;
            }
        });

        // clear out any objects with undefined values
        data = _.reject(data, function(o) { return !o; });

        // build an object to send to the template
        data = {
            details : data,
            areTargetsShown : this.options.engagementModel.get('areTargetsShown'),
            timeframeType : this.options.engagementModel.get('timeframeType')
        };

        return data;
    },

    renderDone: function() {
        var that = this;

        this.$el.find('.table').responsiveTable();
        // because this table uses custom fonts, we need to wait a moment before making it responsive. Gross to the nth degree.
        setTimeout(function() {
            that.$el.find('.table').responsiveTable({reset: true});
        }, 100);

        //this is how we call the super-class renderDone function (inherit its magic)
        EngagementDetailView.prototype.renderDone.apply(this, arguments);
    }
});