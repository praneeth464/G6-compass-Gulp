/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
CelebrationChooseAwardModuleView:true
*/
CelebrationChooseAwardModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var thisView = this;

         //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //dev module specific init stuff here

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        // this.endDate = opts.endDate;

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 }
            ],
            { silent: true }
        );

        this.on('templateLoaded', function() {
            thisView.renderCountdown();
        });

    },
    renderCountdown: function(){
        var self = this,
        countdownInterval,
        $countdownEl = self.$el.find('#redeemCountdown');

        this.endDate = self.tplVariables.endDate;

        if($countdownEl.length > 0){
            // start the promotion countdown
            this.initCountdown($countdownEl, this.endDate, countdownInterval);
        }
    },
    initCountdown: function($clock, targetdate, interval) {
        var t = new Date(targetdate);

        function calcDate() {
            var n = new Date();   // current date (now)
            var i = (t-n) / 1000; // difference between target and now
            var c = {};           // object representing the countdown
            var x;

            if ( n >= t ) {
                clearInterval(interval);
            }
            else {
                c.d = Math.floor( i / 86400 );
                c.h = Math.floor( i / 3600 % 24 );
                c.m = Math.floor( i / 60 % 60 );
                c.s = Math.floor( i % 60 );
            }

            for ( x in c ) {
                if (c.hasOwnProperty(x)) {
                    var temp = c[x].toString();
                    if( temp.length === 1 ) {
                        c[x] = '0'+temp;
                    }
                    else {
                        c[x] = temp;
                    }

                    $clock.find('.'+x+' span.cd-digit').html(c[x]);
                }
            }

            return false; // return false to prevent mobile safari from jumping to top of page
        }

        // run it the first time, then every second
        calcDate();
        interval = setInterval( calcDate, 1000 );
    }

});