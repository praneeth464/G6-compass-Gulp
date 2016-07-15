/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
KPMDetailTeamView,
KPMDetailTeamRecView:true
*/
KPMDetailTeamRecView = KPMDetailTeamView.extend({
    initialize: function() {

        //this is how we call the super-class initialize function (inherit its magic)
        KPMDetailTeamView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass KPMDetailTeamView
        this.events = _.extend({},KPMDetailTeamView.prototype.events,this.events);

    }
});