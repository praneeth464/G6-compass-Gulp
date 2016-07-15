/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
QuizEditTabQuestionsView:true
*/
QuizEditTabQuestionsView = Backbone.View.extend({

    initialize: function(opts) {
        var that = this;

        // QuizPageEditView parent container for this tab
        this.containerView = opts.containerView;

        // quiz model
        this.quizModel = this.containerView.quizModel;
        // questions collection
        this.questions = this.containerView.quizModel.questions;

        // question item tpl is inline, so this will execute and get assigned immediately when we pass "false" for "async"
        TemplateManager.get('questionItem', function(tpl, tplVars, subTpls) {
            that.itemTpl = tpl;
        },null,null,false);
        // "null" is the "url" option, "null" is the "noHandlebars" option, "false" is the "async" option

        // answer tpl is inline, so this will execute and get assigned immediately when we pass "false" for "async"
        TemplateManager.get('questionAnswer', function(tpl, tplVars, subTpls) {
            that.ansTpl = tpl;
        },null,null,false);
        // "null" is the "url" option, "null" is the "noHandlebars" option, "false" is the "async" option
        this.setupEvents();
        this.render();
        this.initInputs();
    },

    events: {

        // question list
        'click .questionList .questionItem:not(.questionActive) .questionEdit'  : 'doEditQuestion',
        'click .newQuestion .questionInput'                                     : 'doEditQuestion',
        'click .questionList .questionItem:not(.questionActive) .removeControl' : 'doRemoveQuestion',

        // active question
        'click .saveNewQuestionBtn,.saveQuestionBtn'                            : 'doSaveQuestionCheck',
        'click .cancelQuestionBtn'                                              : 'doCancelQuestion',
        'click #activeQuestionMask'                                             : 'doMaskClick',

        // answers
        'click .correctToggleBtn'                                               : 'doSetCorrectAnswer',
        'blur .answerInput'                                                     : 'doAnswerBlur',
        'click .answerRemoveBtn'                                                : 'doAnswerRemove',
        'click .addAnswerBtn'                                                   : 'doAnswerAdd'
    },
    initInputs: function() {
        // if quiz is active
        if (this.quizModel.get('quizStatus') === 'active') {
            // disable question remove button
            this.$el.find('.questionRemove.isSaved').hide();
        }
    },
    setupEvents: function() {
        var that = this;

        this.quizModel.on('questionUpdated', this.updateQuestionItem, this);

        this.quizModel.on('questionSaved', this.render, this);
        this.quizModel.on('questionSaved', this.updateQuestionItem, this);
        this.quizModel.on('questionRemoved', this.render, this);

        // this.quizModel.on('questionFileAdded', this.updateQuestionItem, this);
        // this.quizModel.on('questionFileRemoved', this.updateQuestionItem, this);
        this.quizModel.on('questionAnswerChanged', this.updateQuestionAnswer, this);
        this.quizModel.on('questionAnswerRemoved', this.updateQuestionAnswers, this);
        this.quizModel.on('questionAnswerAdded', this.updateQuestionAnswers, this);
        this.quizModel.on('createdNewQ', this.disableNewQuestionInput, this);

    },
    disableNewQuestionInput: function() {
        var numQs = this.quizModel.getNumberOfQuestions();
        if (numQs === 20 || this.quizModel.get('quizStatus') === 'active') {
            this.$el.find('.newQuestion .questionInput').prop("disabled", true);
            return;
        }
        return this.$el.find('.newQuestion .questionInput').prop("disabled", false);
    },
    doSetCorrectAnswer: function(e) {
        console.log('current Quiz status: ', this.quizModel.get('quizStatus'));
        if (this.quizModel.get('quizStatus') == "active") {return; }
        var $tar = $(e.currentTarget),
            q = this.getQuestionForEl($tar),
            ansId = $tar.closest('.answerItem').data('answerId');
        e.preventDefault();
        this.quizModel.setCorrectAnswerOnQuestion(ansId, q);
    },
    doAnswerAdd: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            q = this.getQuestionForEl($tar),
            $q = this.getElForQuestion(q),
            validRes = this.validateAnswers(q);

        e.preventDefault();
        if (!validRes.valid) {
            this.containerView.genericErrorTip(validRes.msgClass, $tar, validRes.qTipOpts);
            return; // EXIT
        } else {
            that.quizModel.addAnswerToQuestion(q);
            $q.find('.answerInput:last').focus();
        }
    },
    doAnswerRemove: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            q = this.getQuestionForEl($tar),
            $q = this.getElForQuestion(q),
            $tip = this.$el.find('.answerRemoveDialog'),
            ansId = $tar.closest('.answerItem').data('answerId'),
            $a = this.getAnswerElById($q, ansId);

        e.preventDefault();
        G5.util.questionTip($tar, $tip.clone(), {
                position: {
                    my: 'right center',
                    at: 'left center'
                }
            },
            function() { // confirm callback
                $a.slideUp(G5.props.ANIMATION_DURATION, function() {
                    that.quizModel.removeAnswerFromQuestion(ansId, q);
                });
            }
        );
    },
    doAnswerBlur: function(e) {
        var $tar = $(e.currentTarget), // text input element
            $ans = $tar.closest('.answerItem'), // answer wraping element
            ansId = $ans.data('answerId'),
            q = this.getQuestionForEl($tar);

        this.quizModel.setAnswerOnQuestion(ansId, $tar.val(), q);
    },
    doSaveQuestionCheck: function(e) {
        //remove empty questions pre-validation
        this.quizModel.emptyAnswerCheck();
        // if the button clicked is saving an existing question, we're fine. Otherwise, validate how many.
        var validRes = $(e.target).hasClass('saveQuestionBtn') ? { valid: true } : this.validateNumQuestion();
        if (!validRes.valid) {
            this.containerView.genericErrorTip(validRes.msgClass, $(e.currentTarget), validRes.qTipOpts);
            return; // EXIT
        }

        this.doSaveQuestion(e);
    },
    doSaveQuestion: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            q = this.getQuestionForEl($tar),
            $q = this.getElForQuestion(q),
            validRes = this.validateQuestionItem(q),
            updatedData = null;

        e.preventDefault();

        if (!validRes.valid) {
            this.containerView.genericErrorTip(validRes.msgClass, $tar, validRes.qTipOpts);
            return; // EXIT
        }

        $q.find('.questionDetails').slideUp(G5.props.ANIMATION_DURATION, function() {

            // SAVE STUFF
            updatedData = {
                isNew: false, // this is now a part of the list
                isEditing: false,
                text: $q.find('.questionInput').val(), // every type gets text
                isJustAdded: q.get('isNew') // flag this as going from new to the list
            };

            // answers are saved as they are entered

            // save the question via the model
            that.quizModel.saveQuestionById(q.get('id'), updatedData); // send data to model

        });
    },
    doCancelQuestion: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            q = this.getQuestionForEl($tar);
        e.preventDefault();

        this.quizModel.revertQuestionById(q.get('id'));

        this.quizModel.updateQuestionById(q.get('id'), {isEditing: false});
    },
    doEditQuestion: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            q = this.getQuestionForEl($tar);

        e.preventDefault();

        if (!q.get('isEditing')) {// only if not already editing
            this.quizModel.updateQuestionById(q.get('id'), {isEditing: true});
        }

        //IE to set the focus on question input after adding course materials in previous step
        //possibly beacuse of issues with the rich text editor
        if(that.containerView.isIe7OrIe8 || that.containerView.isIe9){
            //for some reason IE gets focused but cannot type so need to blur the input
            $('.questionInput').blur();
            setTimeout(function(){
                //then focus back on input again
                $('.questionInput').focus();
            }, 1);
        }

    },
    doRemoveQuestion: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            q = this.getQuestionForEl($tar),
            $q = this.getElForQuestion(q),
            $tip = this.$el.find('.questionRemoveDialog');

        e.preventDefault();

        G5.util.questionTip($tar, $tip.clone(), {
                position: {
                    my: 'right center',
                    at: 'left center'
                }
            },
            function() { // confirm callback
                $q.slideUp(G5.props.ANIMATION_DURATION, function() {
                    that.quizModel.removeQuestionById(q.get('id'));
                    that.initInputs();
                });
            }
        );
        this.quizModel.getNumberOfQuestions();
    },
    doQuestionOrderChanged: function(e, ui) {
        var that = this,
            $qs = this.$el.find('.questionList .questionItem');
        // Now we have a new order that is only represented by the indexes of the .questionItem elements
        // so we must loop through and set the proper model (and element) number to the index+1.
        // * We have an exceptional case here, where the DOM view is updated already, so we don't need/want to listen
        //   for number changes to update the dom. We do it right here, in the 'do*' function.
        $qs.each(function(i) {
            var $m = $(this),
                m = that.getQuestionForEl($m),
                $pn = $m.find('.questionNumber');

            // superficial
            $pn.text(i + 1);

            // model
            that.quizModel.setQuestionNumberById(m.get('id'), i + 1);
        });
    },
    // mask click only happens when the active question item needs confirmation to save
    doMaskClick: function(e) {
        var $mask = $('#activeQuestionMask'),
            edQ = this.quizModel.questions.where({isEditing: true}),
            jostle,
            $edQ,
            $btn;

        edQ = edQ.length ? edQ[0] : null;

        if (!edQ) {
            $mask.hide();
            return;
        }

        $edQ = this.getElForQuestion(edQ);
        $btn = $edQ.find('.saveQuestionBtn:visible,.saveNewQuestionBtn:visible');

        // use QuizPageEditView method
        this.containerView.onNavErrorTip('msgQuestionModified', $btn);

        // jostle function
        jostle = function() {
            $btn.data('qtip').elements.tooltip
                .animate({top: '-=20'}, 300).animate({top: '+=20'}, 300)
                .animate({top: '-=10'}, 200).animate({top: '+=10'}, 200);
        };

        $.scrollTo($btn, {
            axis: 'y',
            duration: 200,
            offset: {
                top: -$(window).height() + $btn.outerHeight() + 20
            },
            onAfter: jostle
        });

    },



    /* ***************************************************************************
        TAB FUNCTION(S) - QuizEditTab*View interface - QuizPageEditView will call
    ****************************************************************************** */
    validate: function() {
        var numQs = this.quizModel.getNumberOfQuestions(); // num questions in list

        // not empty
        if (numQs === 0) {
            return { msgClass: 'msgQuestionMustHaveOne', valid: false }; // invalid
        }

        return { valid: true }; // valid
    },
    validateNumQuestion: function() {
        var numQs = this.quizModel.getNumberOfQuestions(); // num questions in list

        // too many
        if (numQs === 20) {
            return { msgClass: 'msgQuestionTooManyQuestions', valid: false, qTipOpts: {
                position: {
                    my: 'top center',
                    at: 'bottom center'
                }
            }
                };
        }
        return { valid: true }; // valid
    },
    render: function() {
        this.updateHeaders(); // headers might change whenever we render the list
        this.renderQuestions();
    },
    renderQuestions: function() {
        var that = this,
            qm = this.quizModel,
            listQs = qm.questions.where({isNew: false}),
            newQ = qm.questions.where({isNew: true}),
            $qList = this.$el.find('.questionList'),
            $newQ = this.$el.find('.newQuestion'),
            $m = null,
            json = null;


        // list
        $qList.empty();
        _.each(listQs, function appendQItemToDom(m) {
            $m = that.renderQItem(m);
            $m.find('.questionTypeWrapper').hide();
            $qList.append($m);
            if (m.get('isJustAdded')) {
                // FF 20.x Having some issues with this so TRY and CATCH to make sure we continue instead of terminating process/thread
                // this fails fairly gracefully and its a recent bug in FF, so it should eventually go away
                try {
                    G5.util.animBg($m, 'background-flash');
                } catch (err) {
                    console.log('[ERROR] QuizEditTabQuestionsView: (this is a FF 20.x issue ATM) error on trying to animate BG of :', $m[0]);
                }
                m.unset('isJustAdded'); // clear these out, don't need them any more
            }
        });

        this.updateSortable(); // set sortable state

        // new
        $newQ.empty();
        _.each(newQ, function(m) {
            $newQ.append(that.renderQItem(m));
        });

        // disable the additional question input if we're at the max from the start
        this.disableNewQuestionInput();
    },
    renderQItem: function(qModel) {
        var $q, json;

        json = qModel.toJSON();
        json.cid = qModel.cid;
        json.quizComplete = this.quizModel.get('quizStatus') === 'active';
        $q = $(this.itemTpl(json));

        // add answers
        this.renderAnswersInto($q, qModel);

        return $q;
    },
    renderAnswersInto: function($q, qModel) {
        var that = this,
            $ansList = $q.find('.answerList'),
            answers = qModel.get('answers'),
            $none;

        $ansList.empty();
        _.each(answers, function(ans) {
            $ansList.append(that.ansTpl(ans));
        });
        // indicate no answers
        if (!answers || answers.length === 0) {
            $none = $('<div>' + $ansList.data('msgNone') + '</div>');
            $none.addClass('answerItem noAnswers');
            $ansList.append($none);
        }
        //Disable remove if active
        if (this.quizModel.get('quizStatus') === 'active') {
            // disable question remove button
            this.$el.find('.answerRemoveBtn').hide();
            this.$el.find('.incorrectIndicator').hide();
        }
    },

    updateHeaders: function() {
        var hasListQs = this.questions.where({'isNew': false}).length > 0, // old question is in list
            $headers = this.$el.find('.headerDescriptions'),
            $empty = this.$el.find('.noQuestions');

        $headers[hasListQs  ? 'show' : 'hide']();
        $empty[hasListQs    ? 'hide' : 'show']();
    },
    updateQuestionItem: function(q) {
        var that = this,
            isShowCont = q.get('isEditing'),
            $qList = this.$el.find('.questionList'),
            $q = this.getElForQuestion(q),
            $text = $q.find('.questionInput'),
            $newQ = null;

        that.initInputs();
        if ($q.length === 0) { return; }

        // "activate"
        if (isShowCont) {
            if ($q.find('.questionDetails:hidden').length) { // its hidden
                $q.addClass('questionActive');
                $q.find('.questionDetails:hidden').slideDown(G5.props.ANIMATION_DURATION, function() {
                    if (that.containerView.isIe7OrIe8) {
                        //  <3 ie7
                        $q.find('.questionItemActions').css('zoom', 1);
                    }
                });
                $.scrollTo($q, 200, {axis: 'y', offset: {top: -20}});
            }
            $qList.sortable("option", "disabled", true);
        } else {// "deactivate"
            $q.removeClass('questionActive');
            $q.find('.questionDetails:visible').slideUp(G5.props.ANIMATION_DURATION);
            this.updateSortable();
        }

        // // the question text in DOM might not reflect model data (for cancel updates)
        $q.find('.questionInput').val(q.get('text')); // update dom question text
        this.renderAnswersInto($q, q); // re-render the list of answers

        // masking when apropo
        if (q.get('isEditing')) {
            $q.addClass('quizMaskOn');
            // ie7 and .sortable() sometimes leaves a z-index of 1000 on our element
            if ($.browser.msie && $.browser.version === '7.0') {
                $q.css('z-index', '');
            }
            this.showMask(true);
        } else {
            this.showMask(false);
            $q.removeClass('quizMaskOn');
        }

    },
    // full (re-)render of answer list
    updateQuestionAnswers: function(q) {
        var $q = this.getElForQuestion(q);
        this.renderAnswersInto($q, q);
    },
    // for now this only has to update the isCorrect and text
    updateQuestionAnswer: function(q, a) {
        var $q = this.getElForQuestion(q),
            $a = this.getAnswerElById($q, a.id);

        // check mark (isCorrect)
        if (a.isCorrect) {
            $q.find('.answerItem').removeClass('correctAnswer');
            $a.addClass('correctAnswer');
        }
        // text
        $a.find('.answerInput').val(a.text);
    },
    showMask: function(isShow) {
        var $mask = this.containerView.$el.find('#activeQuestionMask');

        if (isShow) {
            $mask.show();
        } else {
            $mask.hide();
        }
    },
    updateSortable: function() {
        var that = this,
            $mList = this.$el.find('.questionList'),
            listQs = this.quizModel.questions.where({isNew: false});

        // not sure if this should be allowed when quiz status is complete
        // if not then this is the place to return

        // lazy-attach plugin
        if (!$mList.data('sortable')) {
            // jquery ui sortable (drag and drop to change number/order)
            $mList.sortable({
                axis: 'y',
                delay: 100, // before draging delay (allow clicks)
                placeholder: 'questionPlaceholder',
                //revert: 200, // aniqe to resting pos (ms)
                update: function(e, ui) {
                    that.doQuestionOrderChanged(e, ui); // do stuff when order changed
                }
            });
        }

        // disable/enable
        $mList.sortable("option", "disabled", listQs.length < 2);
    },

    // active question item validation
    validateQuestionItem: function(q) {
        var $q         = this.getElForQuestion(q),
            qText      = $q.find('.questionInput').val(),
            aCount     = 0,
            answers    = q.get('answers'),
            hasAnswers = true,
            hasCorrect = false,
            listQs     = this.quizModel.questions.where({isNew: false}), // questions in list
            qMatch     = this.quizModel.questions.where({isNew: false, text: qText}), // questions with same text
            isQDupe    = qMatch.length === 1 && qMatch[0].get('id') !== q.get('id'),
            ansUnique  = true,
            qUnique    = true;

        // NOTE: put these in an as intuitive as possible order

        // must have question text
        if (!$.trim(qText)) {
            return { msgClass: 'msgQuestionMustHaveText', valid: false };
        }

        // question must be unique
        if (isQDupe) {
            return { msgClass: 'msgQuestionDuplicateQuestion', valid: false };
        }

        // find if each ans has text + has correct ans
        _.each(answers, function(a) {
            if (!$.trim(a.text)) { hasAnswers = false; }

            //count how many answers have text and increase number
            if ($.trim(a.text)) {aCount++; }
            if (a.isCorrect) { hasCorrect = true; }
        });

        // must have at least two answers with text
        if (aCount <= 1) {
            return { msgClass: 'msgQuestionMustHaveTwoAnswers', valid: false, qTipOpts: {
                position: {
                    my: 'top center',
                    at: 'bottom center'
                }
            }//qTipOpts
                }; // return obj
        }
        // must have answers and each must be unique
        if (answers.length !== _.uniq(answers, function(a) {return a.text; }).length && hasAnswers === true) {
            return { msgClass: 'msgQuestionDuplicateAnswer', valid: false };
        }

        // must have a correct answer
        if (!hasCorrect) {
            return { msgClass: 'msgQuestionMustHaveCorrect', valid: false };
        }

        return { valid: true };
    },
    qHasAnswers: function(ans) {
        if (ans > 9) {
            return { msgClass: 'msgQuestionTooManyAnswers', valid: false };
        } else {
            return { valid: true};
        }
    },

    validateAnswers: function(q) {
        var $q = this.getElForQuestion(q),
            qText = $q.find('.questionInput').val(),
            answers = q.get('answers');

        // NOTE: put these in an as intuitive as possible order

        // must have less than x answers
        return this.qHasAnswers(answers.length);
    },


    // Question: Model - Element mapping
    getElForQuestion: function(questionModel) {
        return questionModel ? this.$el.find('[data-cid="' + questionModel.cid + '"]') : null;
    },
    getQuestionForEl: function($el) {
        $el = $el.hasClass('.questionItem') ? $el : $el.closest('.questionItem');
        return this.quizModel.questions.get($el.data('questionId'));
    },

    getAnswerElById: function($question, answerId) {
        return $question.find('[data-answer-id=' + answerId + ']');
    }

});