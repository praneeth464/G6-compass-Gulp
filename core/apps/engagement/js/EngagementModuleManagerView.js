/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
EngagementModuleView,
EngagementModuleManagerView:true
*/
EngagementModuleManagerView = EngagementModuleView.extend({
    initialize: function() {

        this.mode = 'team';

        //this is how we call the super-class initialize function (inherit its magic)
        EngagementModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass EngagementModuleView
        this.events = _.extend({},EngagementModuleView.prototype.events,this.events);
    }
});
