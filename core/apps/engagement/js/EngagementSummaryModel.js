/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
Backbone,
EngagementSummaryModel:true
*/
EngagementSummaryModel = Backbone.Model.extend({
    initialize: function() {
        console.log('[INFO] EngagementSummaryModel: initialized', this);

        this.processData();
    },

    processData: function() {
        // pull information over from the parent engagement model
        this.set({
            asof: this.collection.engagementModel.get('asof'),
            timeFrameType: this.collection.engagementModel.get('timeFrameType'),
            timeFrameId: this.collection.engagementModel.get('timeFrameId'),
            teamMemCount: this.collection.engagementModel.get('teamMemCount'),
            isScoreActive: this.collection.engagementModel.get('isScoreActive'),
            // areTargetsShown can never be true when isScoreActive is false
            areTargetsShown: this.collection.engagementModel.get('isScoreActive') === false ? false : this.collection.engagementModel.get('areTargetsShown'),
            mode: this.collection.engagementModel.get('mode')
        });
    }
});
