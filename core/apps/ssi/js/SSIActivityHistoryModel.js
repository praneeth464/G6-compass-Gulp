/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
Backbone,
console,
SSIActivityHistoryView,
G5,
SSIActivityHistoryModel:true
*/
SSIActivityHistoryModel = Backbone.Model.extend({
    loadData: function(opts){
        var self = this,
            data = {};

            data = $.extend({}, data, opts);

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_SSI_ACTIVITY_HISTORY_TABLE,
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
                    console.log("[ERROR] SSIActivityHistoryModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    }
});