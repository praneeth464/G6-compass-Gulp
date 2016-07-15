/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
Backbone,
SSIApproveContestDetailsModel:true
*/
SSIApproveContestDetailsModel = Backbone.Model.extend({
    initialize: function(opts){
        clientState = opts.clientState;
    },

    loadTableData: function(pageData){
        var self = this,
            params = {
                clientState: clientState
            };

            params = $.extend(true, {}, params, pageData);

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: params.url,
                data: params,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data;

                    data = $.extend(true, {}, data, params);

                    self.set(data);

                    //notify listener
                    self.trigger('loadDataFinished', data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] SSIApproveContestDetailsModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    }
});
