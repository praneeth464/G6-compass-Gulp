/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
CelebrationAnniversaryFactsModuleView:true
*/
CelebrationAnniversaryFactsModuleView = ModuleView.extend({

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
            that.renderCycle();
        });

    },
    renderCycle: function () {
       this.startCycle({
            fit: true,
            containerResize: 1,
            slideResize: false,
            delay: 2000
        }, false); //start the carousel
    }
});