/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
SSIParticipantSubmitClaimDetailView:true
*/
SSIParticipantSubmitClaimDetailView = PageView.extend({

    //init function
    initialize:function(opts){

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

    }
});
