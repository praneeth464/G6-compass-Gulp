/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
ProfilePageAlertsTabMessageDetailCollection:true
*/
ProfilePageAlertsTabMessageDetailCollection = Backbone.Collection.extend({

    initialize: function () {
        'use strict';
    },

    loadMessage: function (props) {
        'use strict';
        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PROFILE_PAGE_ALERTS_TAB_MESSAGE_DETAIL,
            data: props || {},
            success: function (servResp) {
                that.reset(servResp.data.ProfilePageAlertsTabMessageDetail);
                that.trigger('dataLoaded');
            }
        });
    }
});
