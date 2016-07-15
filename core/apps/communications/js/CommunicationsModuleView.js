/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
ModuleView,
CommunicationsModuleView:true
*/
CommunicationsModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        ModuleView.prototype.initialize.apply(this, arguments); // this is how we call the super-class initialize function (inherit its magic)
        this.events = _.extend({}, ModuleView.prototype.events, this.events); // inherit events from the superclass ModuleView

        this.model.set(
            'allowedDimensions', [
                { w:2, h:1 },
                { w:2, h:2 },
                { w:4, h:2 },
                { w:4, h:4 }

            ],
            { silent: true }
        );
    }
});
