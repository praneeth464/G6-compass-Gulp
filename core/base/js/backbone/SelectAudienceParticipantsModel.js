/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
Backbone,
console,
SelectAudienceParticipantsView,
G5,
SelectAudienceParticipantsModel:true
*/
SelectAudienceParticipantsModel = Backbone.Model.extend({
    initialize: function(opts) {


    },
    loadData: function(opts){
        var self = this,
            data = {};

            data = $.extend({}, data, opts&&opts.dataParams)

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_SELECT_AUDIENCE_DATA,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data;

                    self.set(data);

                    //notify listener
                    self.trigger('loadDataFinished', data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] CommunicationsResourceCenterEditModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    }
});