/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
Backbone,
console,
G5,
SSIAdminContestDetailsModel:true
*/
SSIAdminContestDetailsModel = Backbone.Model.extend({
    initialize: function(attributes, opts) {

        this.options = this.opts;

        this.params = this.params || {};
    },

    loadData: function(params){
        var self = this,
            data = {};

            data = $.extend({}, data, params);

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_SSI_ADMIN_CONTEST_DETAILS_TABLE,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var resp = serverResp.data.participants;

                    self.set(resp);

                    //notify listener
                    self.trigger('loadDataFinished', resp);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] SSIActivityHistoryModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    }
});
