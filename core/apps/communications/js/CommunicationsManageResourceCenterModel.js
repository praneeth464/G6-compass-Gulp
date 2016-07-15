//CommunicationsManageResourceCenterModel -- collection of recognitions
/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
Backbone,
G5,
CommunicationsManageResourceCenterModel:true
*/
CommunicationsManageResourceCenterModel = Backbone.Model.extend({
    initialize: function(opts) {
        var self = this;

    },
    loadData : function(opts) {
        var self = this,
            data = {
                currentPage: this.get('currentPage'),
                statusType: this.get('statusType')
            };

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_COMMUNICATION_RESOURCE_CENTER_TABLE,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data,
                        resourceJson;

                    resourceJson = data;

                    self.set(resourceJson);

                    //notify listener
                    self.trigger('loadDataFinished', resourceJson);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] CommunicationsManageResourceCenterModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    update: function(opts){
         if(opts.type === 'getResources'){
            this.set('currentPage', opts.data.pageNumber);
         }
         if(opts.type === 'status'){
            this.set('statusType', opts.data.statusType);
         }
         this.loadData();
    }
});