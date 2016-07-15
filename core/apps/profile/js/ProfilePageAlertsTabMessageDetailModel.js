/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
ProfilePageAlertsTabMessageDetailModel:true
*/
ProfilePageAlertsTabMessageDetailModel = Backbone.Model.extend({
    defaults: {
        "messageDate": "Date not set",
        "messageTitle": "Title not set",
        "promotionName": "Promotion Name not set",
        "messageText": "Text not set"
    },

    initialize: function () {
        'use strict';
    }
});
