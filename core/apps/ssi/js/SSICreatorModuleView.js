/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
G5,
SSIModuleView,
SSICreatorModuleView:true
*/
SSICreatorModuleView = SSIModuleView.extend({

    initialize: function() {
        'use strict';

        //this is how we call the super-class initialize function (inherit its magic)
        SSIModuleView.prototype.initialize.apply(this, arguments);

        // flag for templates
        this.model.set('isCreator', true);

    },

    getDataUrl: function () {
        return G5.props.URL_JSON_SSI_MASTER_CREATOR;
    }

});
