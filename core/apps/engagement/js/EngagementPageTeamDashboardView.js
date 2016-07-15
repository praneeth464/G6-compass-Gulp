/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
EngagementPageDashboardView,
EngagementPageTeamDashboardView:true
*/
EngagementPageTeamDashboardView = EngagementPageDashboardView.extend({
    initialize: function() {
        console.log('[INFO] EngagementPageTeamDashboardView: initialized', this);

        // this is how we call the super-class initialize function (inherit its magic)
        EngagementPageDashboardView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass EngagementPageDashboardView
        this.events = _.extend({}, EngagementPageDashboardView.prototype.events, this.events);
    },

    events: {},

    render: function() {
    }
});
