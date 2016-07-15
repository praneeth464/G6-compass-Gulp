/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
ActiveQuizCollection:true
*/
ActiveQuizCollection = Backbone.Collection.extend({

    initialize: function () {

    },

    loadContent: function (props) {

        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_QUIZ_PAGE_ACTIVE_QUIZ,
            data: props || {},
            success: function (servResp) {
                that.reset(servResp.data.quizPageActiveQuiz);
                that.trigger('dataLoaded');
            }
        });
    }
});
