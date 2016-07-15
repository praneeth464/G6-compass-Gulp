/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
ThrowdownTrainingCampPageView:true
*/
ThrowdownTrainingCampPageView = PageView.extend({
    initialize: function (opts) {
        'use strict';
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'throwdownTrainingCamp';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);
    }
});