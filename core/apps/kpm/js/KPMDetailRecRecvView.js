/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
KPMDetailRecView,
KPMDetailRecRecvView:true
*/
KPMDetailRecRecvView = KPMDetailRecView.extend({
    initialize: function() {

        //this is how we call the super-class initialize function (inherit its magic)
        KPMDetailRecView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass KPMDetailRecView
        this.events = _.extend({},KPMDetailRecView.prototype.events,this.events);

    }
});