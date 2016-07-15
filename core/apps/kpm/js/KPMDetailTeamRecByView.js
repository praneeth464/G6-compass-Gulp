/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
KPMDetailTeamView,
KPMDetailTeamRecByView:true
*/
KPMDetailTeamRecByView = KPMDetailTeamView.extend({
    initialize: function() {

        //this is how we call the super-class initialize function (inherit its magic)
        KPMDetailTeamView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass KPMDetailTeamView
        this.events = _.extend({},KPMDetailTeamView.prototype.events,this.events);

    }
});