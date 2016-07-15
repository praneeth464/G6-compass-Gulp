/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
PageView,
EngagementRecognizedModelView,
EngagementPageRecognizedView:true
*/
EngagementPageRecognizedView = PageView.extend({
    initialize: function() {
        console.log('[INFO] EngagementPageRecognizedView: initialized', this);

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        var defaults = {
            mode : 'user'
        };

        this.options = $.extend(true, {}, defaults, this.options);

        this.recognizedView = new EngagementRecognizedModelView({
            el: this.$el.find('.engagementRecognizedModelView'),
            autoLoad: true,
            mode: this.options.mode,
            type: this.options.type,
            detail: this.options.detail || {},
            // userId is only used by user mode, nodeId by team mode
            userId : this.options.userId || null,
            nodeId : this.options.nodeId || null,
            modelUrl : this.options.modelUrl || null,
            modelParams : this.options.modelParams || null
        });
    },

    events: {},

    render: function() {
        // this.$el.find('.span12').html( this.modelView.$el );
    }
});
