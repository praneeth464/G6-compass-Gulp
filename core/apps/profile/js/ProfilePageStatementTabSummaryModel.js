/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
ProfilePageStatementTabSummaryModel:true
*/
ProfilePageStatementTabSummaryModel = Backbone.Model.extend({
    defaults: {
    },

    initialize: function () {
        'use strict';
    },

    loadModel: function (props) {
        'use strict';
        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PROFILE_PAGE_STATEMENT_TAB_SUMMARY,
            data: props || {},
            success: function (servResp) {
                that.set(servResp.data.ProfilePageStatementTabSummary);
                that.trigger('dataLoaded');
            }
        });
    }
});
