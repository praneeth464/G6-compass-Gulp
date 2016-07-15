/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
CelebrationAnniversaryFactsModuleView:true
*/
CelebrationCorporateVideoModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        ModuleView.prototype.initialize.apply(this, arguments); // this is how we call the super-class initialize function (inherit its magic)
        this.events = _.extend({}, ModuleView.prototype.events, this.events); // inherit events from the superclass ModuleView

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 }
            ],
            { silent: true }
        );
        

        this.on('templateLoaded', function(){
            that.detachModal();
        });

    },
    events: {
        "click .btn-vid-play": "doInitVideo"
    },
    doInitVideo: function(){
        var that = this;
         $('#corporateVideoModal').on('shown',function(){
            that.initVideoJs();
        });
    },
    initVideoJs: function(){
        var idOfVideoElement = 'celebrationVideo';
        // if the video element doesn't exist, we kick out of this method
        if( !$('#'+idOfVideoElement).length ) {
            return;
        }
        // otherwise, initialize the videojs
        if(_V_) { // global reference to videojs lib
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
    },
    detachModal: function (e) {
        var cVidModal = this.$el.find('#corporateVideoModal');

        cVidModal.detach();

        $('body').append(cVidModal);

        this.initVideoJs();
    }
});