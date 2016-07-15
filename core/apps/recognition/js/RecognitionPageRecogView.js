/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
RecognitionPageRecogView:true
*/
RecognitionPageRecogView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'recognition';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.initVideoJs();
    },
    initVideoJs: function() {
        var idOfVideoElement = 'recognitionVideo',
            $videoWrapper = this.$el.find('.recognitionVideoWrapper');

        // if the video element doesn't exist, we kick out of this method
        if( !$('#'+idOfVideoElement).length ) {
            $videoWrapper.hide();
            return;
        }
        // otherwise, initialize the videojs
        if(_V_) { // global reference to videojs lib
            $videoWrapper.show();
            _V_(idOfVideoElement).ready(function() {
                var player = this,
                    aspRat = 9/16, // aspect ratio
                    // resize callback
                    onResize = function() {
                        var w = document.getElementById(player.id).parentElement.offsetWidth;
                        player.width(w).height(w*aspRat);
                    };

                // initial call to resize function
                onResize();
                // bind to window resize event
                window.onresize = onResize;
            });
        }
    }

});