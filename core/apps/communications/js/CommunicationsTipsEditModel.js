//CommunicationsTipsEditModel -- collection of recognitions
/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
CommunicationsTipsEditModel:true
*/
CommunicationsTipsEditModel = Backbone.Model.extend({
    // Bug 58246 - related.
    // tipLength is use to keep track of the index so it is unique
    tipLength: 0,
    initialize: function(opts) {
        this.tipIdIncrementer = 0;

    },
    loadData : function(opts) {
        var self = this,
            data = {};

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_COMMUNICATION_TIPS_DATA,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data;

                    // start the index off with elements from the backend
                    self.tipLength = data.tipsTable.tips.length;

                    self.set(data);

                    //notify listener
                    self.trigger('loadDataFinished', data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] CommunicationsTipsEditModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    loadAudienceData: function(opts){
        var self = this,
            data = {};

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_COMMUNICATION_AUDIENCE_DATA,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data;

                    self.set(data);

                    //notify listener
                    self.trigger('loadAudienceDataFinished', data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] CommunicationsTipsEditModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    addTip: function(newData){
        var tips = this.get('tipsTable').tips,
            isAdded = true;

            newData.id = 'addedTip' + this.tipIdIncrementer;

            newData.index = this.tipLength;

            tips.push(newData);

            this.tipIdIncrementer += 1;
            this.tipLength += 1;

            this.trigger('tipAdded', newData, isAdded);

    },
    updateTip: function(updatedData){
        var tips = this.get('tipsTable').tips,
            self = this;

        _.each(tips, function(tip, index){
            if(tip.id === updatedData.id){

                tip = $.extend({}, tip, updatedData);
                tips[index] = tip;

                self.trigger('tipUpdated', tip);
            }
        });
    },
    removeTip: function(id){
        var tips = this.get('tipsTable').tips;

        for (var i = 0; i < tips.length; i++)
            if (tips[i].id && tips[i].id === id) {
                tips.splice(i, 1);
                break;
            }

        this.trigger('tipRemoved', tips);

    },
});