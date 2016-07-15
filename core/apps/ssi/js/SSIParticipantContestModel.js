/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
G5,
Backbone,
SSIParticipantContestModel:true
*/
SSIParticipantContestModel = Backbone.Model.extend({
    defaults: {

    },

    toJSON: function () {
        // debugger
        var json = Backbone.Model.prototype.toJSON.call(this);

        if (G5.props.URL_SSI_STACK_RANK_PARTICIPANT_PAGE) {
            json.participantDetailPageUrl = G5.props.URL_SSI_STACK_RANK_PARTICIPANT_PAGE;
        }

        return json;
    }
});
