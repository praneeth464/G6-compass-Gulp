/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
Backbone,
SurveyModel,
InstantPollCollection:true
*/
InstantPollCollection = Backbone.Collection.extend({
    initialize: function(opts) {
        console.log('[info] InstantPollCollection: initialized');

        this.on('pollDataLoaded', this.processData);
    },

    comparator: function(model) {
        // this pulls all the polls with 'isComplete' = false to the front of the list, despite the comparison appearing to do the opposite.
        return model.get('isComplete') === true;
    },

    loadData: function() {
        var that = this;

        $.ajax({
            url: G5.props.URL_JSON_INSTANT_POLL_COLLECTION,
            type: "POST",
            dataType: 'g5json',
            success: function(servResp) {
                // that.reset(servResp.data.polls ? servResp.data.polls : {});
                _.each(servResp.data.polls, function(poll) {
                    var s = new SurveyModel({}, {
                        surveyJson : poll,
                        url: {
                            submit: G5.props.URL_JSON_INSTANT_POLL_SUBMIT_SURVEY
                        }
                    });
                    s.loadSurveyData();

                    that.add(s);
                });

                that.trigger('pollDataLoaded');
            }
        });
    }
});