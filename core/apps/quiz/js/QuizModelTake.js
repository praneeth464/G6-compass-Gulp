/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
QuizModelTake:true
*/
QuizModelTake = Backbone.Model.extend({
    initialize: function(attr,opts) {
        this.options = opts;

        this.on('quizDataLoaded', this.processQuizData, this);
    },

    loadQuizData: function() {
        var that = this;

        if( this.options && this.options.quizJson ) {
            this.set(this.options.quizJson);

            that.trigger('quizDataLoaded');
        }
        else {
            $.ajax({
                url: G5.props.URL_JSON_QUIZ_PAGE_TAKE_QUIZ,
                dataType: 'g5json',
                type: "POST",
                success: function(servResp) {
                    that.set(servResp.data.quizJson ? servResp.data.quizJson : {});

                    that.trigger('quizDataLoaded');
                }
            });
        }
    },

    processQuizData: function() {
        // massage the question data a little bit if our currentQuestion is offset from the start
        _.each(this.get('questions'), function(q) {
            // pluck all the IDs from the answers where isCorrect == true
            q.correctAnswerId = _.pluck(_.where(q.answers, {isCorrect:true}), 'id');
            // pluck all the text strings from the answers where isCorrect == true and join them into a single string
            q.correctAnswerText = _.pluck(_.where(q.answers, {isCorrect:true}), 'text').join(', ');
            // pluck all the EXPs from the answers where isCorrect == true
            q.correctAnswerExplanation = _.pluck(_.where(q.answers, {isCorrect:true}), 'exp');
            // check to see if the selectedAnswerId is in the array of correct answers
            q.answeredCorrectly = _.indexOf(q.correctAnswerId, q.selectedAnswerId) >= 0;
        });

        // if the questions array contains the same number of questions as the totalQuestions value (or more, just in case), then we assume they've all been answered
        this.set('_allQuestionsAnswered', this.get('questions') && this.get('questions').length >= this.get('totalQuestions'));

        this.trigger('quizDataProcessed');
    },

    loadQuestion: function(number) {
        var that = this;

        if( !this.get('questions') || !this.get('questions').length ) {
            this.set('questions', []);
        }

        $.ajax({
            url: G5.props.URL_JSON_QUIZ_PAGE_TAKE_QUESTION,
            data: {number:number},
            dataType: 'g5json',
            type: "POST",
            success: function(servResp) {
                that.get('questions').push(servResp.data.question);

                // if the questions array contains the same number of questions as the totalQuestions value (or more, just in case), then we assume they've all been answered
                that.set('_allQuestionsLoaded', that.get('questions').length >= that.get('totalQuestions'));

                that.trigger('quizQuestionLoaded', servResp.data.question);
            }
        });
    },

    loadAnswer: function(data) {
        var that = this,
            id = _.where(data, {name : "questionId"})[0].value,
            selectedAnswerId = _.where(data, {name : "selectedAnswer"})[0].value;

        // handle both integer and string IDs
        id = parseInt(id, 10) || id;
        selectedAnswerId = parseInt(selectedAnswerId, 10) || selectedAnswerId;

        // set the chosen answer on the question
        this.getQuestion(id).selectedAnswerId = selectedAnswerId;

        $.ajax({
            url: G5.props.URL_JSON_QUIZ_PAGE_TAKE_ANSWER,
            type: "POST",
            data: data,
            dataType: 'g5json',
            success: function(servResp) {
                var qid = servResp.data.question.id,
                    question, aid, answers;

                // make sure the question ID we submitted equals the question ID that came back
                if( qid !== id ) {
                    that.getQuestion(id).selectedAnswerId = null;
                    that.trigger('quizAnswerError', that.getQuestion(id), {error: true, type: 'mismatch'});
                    return false;
                }

                // cache the local question object
                question = that.getQuestion(qid);
                // note: 'aid' and 'answers' are always arrays
                // 'aid' are the correct answer IDs as sent from the server
                aid = _.pluck(servResp.data.question.correctAnswers, 'id');
                // 'answers' are the full answer objects corresponding to each of the correct answer IDs
                answers = that.getAnswers(qid, aid);

                // make sure the server provided answer(s) that exist(s) in the current question object
                if( !answers ) {
                    that.getQuestion(id).selectedAnswerId = null;
                    that.trigger('quizAnswerError', that.getQuestion(id), {error: true, type: 'noserveranswer'});
                    return false;
                }

                // check to see if there is a quizJson update sent along with the quiz question
                if( servResp.data.quizJson ) {
                    that.set(servResp.data.quizJson);
                }

                // store the correct answer IDs in the question object
                question.correctAnswerId = aid;
                // store the correct answer text in the question object, turning an array of multiple answers into a single string
                question.correctAnswerText = _.pluck(answers, 'text').join(', ');
                // check to see if the selectedAnswerId is in the array of correct answers
                question.answeredCorrectly = _.indexOf(question.correctAnswerId, question.selectedAnswerId) >= 0;
                // grab the explanation for the correct answer(s) from the server response
                question.correctAnswerExplanation = _.pluck(servResp.data.question.correctAnswers, 'exp');
                // grab the explanation for the incorrect answer from the server response
                question.incorrectAnswerExplanation = question.answeredCorrectly ? null : _.where(servResp.data.question.incorrectAnswers, {id: question.selectedAnswerId})[0].exp;
                // set the 'isCorrect' flag to true on the correct answer(s) in the question object
                // set the 'exp' value on the correct answer(s) in the question object
                _.each(answers, function(a) {
                    a.isCorrect = true;
                    a.exp = _.where(servResp.data.question.correctAnswers, {id: a.id})[0].exp;
                });

                // if we've loaded all the questions, then we've also answered all the questions
                that.set('_allQuestionsAnswered', that.get('_allQuestionsLoaded'));

                that.trigger('quizAnswerLoaded', question);
            }
        });
    },

    buildResults: function() {
        // figure out how many questions were answered correctly
        this.set('questionsCorrect', _.where(this.get('questions'), {answeredCorrectly:true}).length);
        // figure out if the user answered enough to pass the quiz
        this.set('userPassed', this.get('questionsCorrect') >= this.get('passingScore'));
        // determine of there is any sort of award to show
        this.set('showAward', this.get('userPassed') && (this.get('quizAward') || this.get('badge') || this.get('certificate')));
        // if attempts are limited and there are more than 0 remaining, figure out how many are left over
        this.set('attemptsRemaining', this.get('isAttemptsLimit') === true && this.get('allowedAttempts') > 0 ? this.get('allowedAttempts') - this.get('attemptsUsed') - 1 : null);
        // if attempts are left over (explicit or unlimited) and the user has not passed, we allow retakes
        this.set('allowRetake', (this.get('attemptsRemaining') > 0 || this.get('isAttemptsLimit') === false) && this.get('userPassed') === false);
    },

    getQuestion: function(id) {
        return _.where(this.get('questions'), {id: id})[0];
    },

    getAnswers: function(qid, aid) {
        // aid is always an array of IDs
        // this will always return an array
        return _.filter(this.getQuestion(qid).answers, function(a) { return _.indexOf(aid, a.id) >= 0; });
    }
});