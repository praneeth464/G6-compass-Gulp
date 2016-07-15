/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
ModuleView,
CelebrationCompanyTimelineModuleView:true
*/
CelebrationCompanyTimelineModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        // var that = this;

        ModuleView.prototype.initialize.apply(this, arguments); // this is how we call the super-class initialize function (inherit its magic)
        this.events = _.extend({}, ModuleView.prototype.events, this.events); // inherit events from the superclass ModuleView

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 }
            ],
            { silent: true }
        );

        /*
         * removed the carousel to turn this into a click-through
        this.on('templateLoaded', function(){
            that.renderCycle();
        });
         *
         */

    }/*,
     * removed the carousel to turn this into a click-through
    renderCycle: function () {
       this.startCycle({
            fit: true,
            containerResize: 1,
            slideResize: false,
            timeout: 0
        }, "arrows"); //start the carousel
    }
     *
     */
});