/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
ModuleView,
ApprovalsModuleView:true
*/
ApprovalsModuleView = ModuleView.extend({

    initialize: function(opts) {

        console.log("[INFO] ApprovalsModuleView: Approvals Module View initialized");

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon-only - smallest
            {w:2,h:1}, // icon+title
            {w:2,h:2} // 2x2 square
        ],{silent:true});        
    }
});
