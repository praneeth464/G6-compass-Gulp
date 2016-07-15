/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
Backbone,
KPMSummaryModel:true
*/
KPMSummaryModel = Backbone.Model.extend({
    initialize: function() {
        console.log('[INFO] KPMSummaryModel: initialized', this);

        this.processData();
    },

    processData: function() {
        // pull information over from the parent kpm model
        this.set({
            asof: this.collection.kpmModel.get('asof'),
            timeFrameType: this.collection.kpmModel.get('timeFrameType'),
            timeFrameId: this.collection.kpmModel.get('timeFrameId'),
            teamMemCount: this.collection.kpmModel.get('teamMemCount')
        });
    }
});
