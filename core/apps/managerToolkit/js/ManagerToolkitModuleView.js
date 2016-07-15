/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
ResourceCenterModuleView,
ManagerToolkitModuleView:true
*/
// NOTE: the ManagerToolkitModule is being treated as a virtual clone of the ResourceCenterModule. Both have the same behavior, and the Manager Toolkit can be thought of a special type of Resource Center
ManagerToolkitModuleView = ResourceCenterModuleView.extend({

    initialize:function() {

        //this is how we call the super-class initialize function
        ResourceCenterModuleView.prototype.initialize.apply(this, arguments);

        //merge events from the superclass ResourceCenterModuleView
        this.events = _.extend({},ResourceCenterModuleView.prototype.events,this.events);

        // apply the resourceCenter class to make use of all the styling for that module
        this.$el.addClass('resourceCenter');
    }
});