/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
QuizTakeTabQuestionsView:true
*/
QuizTakeTabQuestionsView = Backbone.View.extend({

    initialize: function(opts) {
        // QuizPageEditView parent container for this tab
        this.containerView = opts.containerView;

        // quiz model
        this.quizTakeModel = this.containerView.quizTakeModel;
        // template
        this.tpl = opts.tpl;

        this.setupEvents();
    },

    events: {
        // submit question event
        'click .submitQuestionBtn' : 'submitQuestion',

        // next button events
        'click  .nextQuestionBtn' : 'goToNextQuestion',

        // save for later events
        'click  .saveForLaterBtn' : 'saveForLater'
    },

    setupEvents: function() {
        this.quizTakeModel.on('quizQuestionLoaded', this.render, this);
        this.quizTakeModel.on('quizAnswerLoaded', this.render, this);
        this.quizTakeModel.on('quizAnswerError', this.render, this);
    },

    activate: function() {
        var currentQuestion = this.quizTakeModel.get('currentQuestion');

        // if all questions have already been answered when this tab is activated, we lock it down
        if( this.quizTakeModel.get('_allQuestionsAnswered') ) {
            this.render({
                _isCompleted : true
            });
        }
        // if a question is currently rendered in the view, we present it as-is
        else if( this._questionRendered ) {
            return;
        }
        // otherwise, we load a fresh question from the server
        else {
            this.quizTakeModel.loadQuestion(currentQuestion);

            if( this.$el.find('form').length ) {
                G5.util.showSpin(this.$el.find('form'), {cover:true,classes:'pageView'});
            }
            else {
                G5.util.showSpin(this.$el);
            }
        }
    },

    render: function(question, opts) {
        question = question || this.quizTakeModel.get('questions')[0];
        var that = this,
            extended = {};

        // check for options
        if( opts ) {
            if( opts.error === true ) {
                extended.isError = true;
                extended.errorType = opts.type;
            }
        }

        // metadata
        question._isFirst = this.quizTakeModel.get('questions').length == 1 ? true : false;
        question._isLast = this.quizTakeModel.get('questions').length == this.quizTakeModel.get('totalQuestions') ? true : false;
        question.quizId = this.quizTakeModel.get('id');

        TemplateManager.get(this.tpl, function(tpl) {
            that.$el.html( tpl(_.extend({}, question, extended)) );
        });
        this._questionRendered = question.number;
    },

    submitQuestion: function(e) {
        e.preventDefault();

        var $form = $(e.target).closest('form'),
            $validate = $form.find('.validateme'),
            data = $form.serializeArray();

        if( !G5.util.formValidate($validate) ) {
            return false;
        }

        $form.find('input').attr('disabled','disabled').addClass('disabled');

        this.quizTakeModel.loadAnswer(data);
        G5.util.showSpin(this.$el.find('form'), {cover:true,classes:'pageView'});
    },

    goToNextQuestion: function(e) {
        e.preventDefault();

        this.quizTakeModel.loadQuestion(this._questionRendered + 1);
        G5.util.showSpin(this.$el.find('form'), {cover:true,classes:'pageView'});
    },

    saveForLater: function(e) {
        e.preventDefault();

        this.containerView.$el.find(".saveForLaterResponseModal").modal("show");
    }

});
