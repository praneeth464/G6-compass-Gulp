//CommunicationsManageTipsModel -- collection of recognitions
/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
Backbone,
G5,
CommunicationsManageTipsModel:true
*/
CommunicationsManageTipsModel = Backbone.Model.extend({
    initialize: function(opts) {
        var self = this;

    },
    loadData : function(opts) {
        var self = this,
            data = {
                currentPage: this.get('currentPage'),
                sortedOn: this.get('sortedOn'),
                sortedBy: this.get('sortedBy'),
                statusType: this.get('statusType')
            };

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_COMMUNICATION_TIPS_TABLE,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data,
                        tipsJson;

                    tipsJson = data;

                    self.set(tipsJson);

                    //notify listener
                    self.trigger('loadDataFinished', tipsJson);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] CommunicationsManageTipsModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    update: function(opts){
         if(opts.type === 'getTips'){
            this.set('currentPage', opts.data.pageNumber);
         }
         if(opts.type === 'tabular'){
            this.set('sortedOn', opts.data.sortedOn);
            this.set('sortedBy', opts.data.sortedBy);
            this.set('currentPage', opts.data.pageNumber);
         }
         if(opts.type === 'status'){
            this.set('statusType', opts.data.statusType);
         }
         this.loadData();
    }
});