/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
EngagementDetailRecView,
EngagementDetailRecRecvView:true
*/
EngagementDetailRecRecvView = EngagementDetailRecView.extend({
    initialize: function() {

        //this is how we call the super-class initialize function (inherit its magic)
        EngagementDetailRecView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass EngagementDetailRecView
        this.events = _.extend({},EngagementDetailRecView.prototype.events,this.events);

    }
});