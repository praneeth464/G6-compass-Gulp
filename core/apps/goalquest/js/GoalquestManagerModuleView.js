/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
ModuleView,
GoalquestManagerModuleView:true
*/
GoalquestManagerModuleView = ModuleView.extend({

    initialize: function(opts) {

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

    }

});