/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
ProfilePagePersonalInformationTabModel,
ProfilePagePersonalInformationTabCollection:true
*/
ProfilePagePersonalInformationTabCollection = Backbone.Collection.extend({
    model: ProfilePagePersonalInformationTabModel,

    initialize: function () {
        'use strict';
    },

    loadContent: function (props) {
        'use strict';
        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PROFILE_PAGE_PERSONAL_INFORMATION,
            data: props || {},
            success: function (servResp) {
                that.reset(servResp.data.ProfilePagePersonalInformationTab);
                that.trigger('dataLoaded');
            }
        });
    }
});
