/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
PageView,
EngagementModelView,
EngagementPageDashboardView:true
*/
EngagementPageDashboardView = PageView.extend({
    initialize: function() {
        console.log('[INFO] EngagementPageDashboardView: initialized', this);

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        var defaults = {
            mode : 'user'
        };

        this.options = $.extend(true, {}, defaults, this.options);

        this.modelView = new EngagementModelView({
            el: this.$el.find('.engagementModelView'),
            mode: this.options.mode,
            // userId is only used by user mode, nodeId by team mode
            userId : this.options.userId || null,
            nodeId : this.options.nodeId || null
        });

        this.modelView.on('tabActivated', function($tab, view) {
            this.router.navigate(view.nameId);
        }, this);

        this.router = new Backbone.Router({
            routes: {
                ":tab" : "loadTab"
            }
        });
        this.router.on('route:loadTab', function(name) {
            this.modelView.handleRoute(name);
        }, this);
        Backbone.history.start();
    },

    events: {},

    render: function() {

        // this.$el.find('.span12').html( this.modelView.$el );
    }
});
