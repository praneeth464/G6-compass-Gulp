/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
QuizPageView:true
*/
QuizPageView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'quiz';
        this.tabSetEditCurrent = false;
        this.tabSetViewingCurrent = false;
        this.currentTabName = "";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        // make the table responsive
        that.$el.find('table.table').responsiveTable();
    }

});