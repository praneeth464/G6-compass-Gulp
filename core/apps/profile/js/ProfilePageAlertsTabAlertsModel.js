/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
ProfilePageAlertsTabAlertModel:true
*/
ProfilePageAlertsTabAlertModel = Backbone.Model.extend({
    defaults: {
        alertSubject: "Alert subject not set.",
        alertText: "",
        datePostedSort: "Date not set",
        datePostedDisplay: "Date not set",
        dueDateSort: "Date not set",
        dueDateDisplay: "Date not set",
        isLink: false,
        alertLinkText : "",
        alertLinkUrl: "",
        isManagerAlert: false,
        openNewWindow: false
    },
    idAttribute: "alertId",
    initialize: function () {
        "use strict";
    }
});
