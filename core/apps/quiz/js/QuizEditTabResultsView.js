/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
QuizEditTabResultsView:true
*/
QuizEditTabResultsView = Backbone.View.extend({

    initialize: function(opts) {        
        var qm = opts.containerView.quizModel;

        // QuizPageEditView parent container for this tab
        this.containerView = opts.containerView;

        // rechtext plugin
        this.$el.find('.richtext').htmlarea( G5.props.richTextEditor );

        qm.on('badgeIdChanged', this.updateBadgeId, this);
        qm.on('certificateIdChanged', this.updateCertificateId, this);

        this.render();

        // make sure the notify text is shown/hidden based on checkbox
        this.updateNotifyText();
    },


    events: {
        "click .badgeItem a":"doBadgeItemSelect",
        "click .certItem":"doCertItemSelect",
        "click .showCertificateSelector":"updateCertSelector",
        "click .showNotifyText":"updateNotifyText",
        "click .isAttemptsLimitInput": "clearAttemptInput",
        "click .allowedAttemptsInputLabel":"fixClickOnRadioLabel",

        "blur .passingScoreInput, .allowedAttemptsInput":"doCleanWholeNumbers"
    },

    fixClickOnRadioLabel: function(e) {
        var $t = $(e.target);
        // for FF - b/c it wants to move focus to the radio inside the LABEL when 
        // INPUT is clicked
        var qm = this.containerView.quizModel;
        // if quiz is active
        if(qm.get('quizStatus') === 'active') {
            if($t.hasClass('allowedAttemptsInput')) {
                e.preventDefault();
                $('input.isAttemptsLimitTrue').prop('checked', 'checked');
            }
        }
    },  
    clearAttemptInput: function(e) {
        var $t = $(e.target);
        //remove text value from specific number input when unlimited radio is checked
        if(!$t.hasClass('isAttemptsLimitTrue')) {       
            $('input.allowedAttemptsInput').val(" ");
        }
    },
    // USER EVENTS
    doBadgeItemSelect: function(e) {
        var $tar = $(e.currentTarget),
            bid = $tar.data('badgeId');

        e.preventDefault();

        this.containerView.quizModel.setBadgeId(bid);
    },
    doCertItemSelect: function(e) {
        var $tar = $(e.currentTarget),
            cid = $tar.data('certId');

        e.preventDefault();

        this.containerView.quizModel.setCertificateId(cid);
    },
    // for inputs that should only have whole numbers
    doCleanWholeNumbers: function(e) {
        var $tar = $(e.currentTarget),
            n = parseInt($tar.val(),10); // parseInt will round the number

        if(n) { // could be NaN
            $tar.val(n);
        } else { // clear it
            $tar.val('');
        }
    },


    // MODEL EVENTS
    updateBadgeId: function(id) {
        var that = this,
            $btn = this.$el.find('.badgeBtn'),
            bObj = this.containerView.quizModel.getBadgeById(id),
            $howTo = this.$el.find('.howToEarnBadge');

        // button (selected) badge content
        TemplateManager.get('badgeBtn', function(tpl) {
            $btn.empty();
            $btn.append(tpl(bObj||that.noBadgeJson));
        });

        // how to earn text
        if(bObj&&bObj.howToEarnText) {
            $howTo.show().find('span').html(bObj.howToEarnText);
        } else {
            $howTo.hide();
        }
    },
    updateCertificateId: function(id) {
        var that = this,
            $cnt = this.$el.find('.certSelected'),
            $certs = this.$el.find('.certItems .certItem'),
            cObj = this.containerView.quizModel.getCertificateById(id);

        // set active tab on apropo cert thumbnail
        $certs.removeClass('active');
        this.$el.find('[data-cert-id='+id+']').addClass('active');

        TemplateManager.get('certSelected', function(tpl) {
            $cnt.empty();
            $cnt.append(tpl(cObj||that.noCertJson));
        });
    },
    updateCertSelector: function() {
        var $visCheck = this.$el.find('.showCertificateSelector'),
            $certSelGuts = this.$el.find('.certificateGuts');

        // this just syncs the visibility of the selector with the checkbox
        if($visCheck.is(':checked')) {
            $certSelGuts.slideDown(G5.props.ANIMATION_DURATION);
        } else {
            // empty the certificate id (will cause 'no cert' vis)
            this.containerView.quizModel.setCertificateId(null);
            $certSelGuts.slideUp(G5.props.ANIMATION_DURATION);
        }
    },
    updateNotifyText: function() {
        var $visCheck = this.$el.find('.showNotifyText'),
            $guts = this.$el.find('.notifyTextGuts'),
            $txt = this.$el.find('.notifyText');

        // this just syncs the visibility of the selector with the checkbox
        if($visCheck.is(':checked')) {
            $guts.slideDown(G5.props.ANIMATION_DURATION);
        } else {
            // clear text, keyup triggers update of richtext iframe
            $txt.val('').trigger('keyup');
            // trigger other updates on richtext pluggy
            $($txt.get(0).jhtmlareaObject.editor.body).trigger('keyup');
            $guts.slideUp(G5.props.ANIMATION_DURATION);
        }
    },


    render: function() {
        this.renderBadges();
        this.renderCerts();
        this.setPermissions();
    },
    renderBadges: function() {
        var that = this,
            qm = this.containerView.quizModel,
            badges = qm.get('badges'),
            hasBadges = badges && badges.length,
            $badgesCont = this.$el.find('.badgesSelector'),
            $badges = $badgesCont.find('.badgeItems');
        
        // we will use this elsewhere
        this.noBadgeJson = $badgesCont.data('noBadgeJson');

        //no badges? hide and return.
        if(!hasBadges) {
            $badgesCont.hide();
            return;
        }

        TemplateManager.get('badgeItem', function(tpl) {
            _.each(badges, function(b){
                $badges.append(tpl(b));
            });

            $badges.prepend(tpl(that.noBadgeJson));
        });
    },
    renderCerts: function() {
        var that = this,
            qm = this.containerView.quizModel,
            certs = qm.get('certificates'),
            hasCerts = certs && certs.length,
            $certsCont = this.$el.find('.certificatesSelector'),
            $certs = $certsCont.find('.certItems');

        // used later
        this.noCertJson = $certsCont.data('noCertJson');

        // no certs, hide and return
        if(!hasCerts) {
            $certsCont.hide();
            return;
        }

        TemplateManager.get('certItem', function(tpl) {
            _.each(certs, function(c) {
                $certs.append(tpl(c));
            });
        });

        // add class if more than N items
        if(certs.length > 20) {
            $certs.addClass('thumbShrinker');
        }
    },
    setPermissions: function() {
        var qm = this.containerView.quizModel;
        // if quiz is active
        if(qm.get('quizStatus') === 'active') {
            // disable question remove button
            this.$el.find('#passingScore').prop('readonly', true);
            this.$el.find('.allowedAttemptsInput').prop('disabled', true);
            this.$el.find('.isAttemptsLimitInput').prop('disabled', true);            
            this.$el.find('.isRandomQuestionOrderInput').prop('disabled', true);
            this.$el.find('.allowedAttemptsInput').prop('readonly', true);
            this.$el.find('a.btn.badgeBtn').addClass('disabled');
            this.$el.find('.showCertificateSelector').prop('disabled', true);
            this.$el.find('.certItems').hide();
        }
    },


    /* **************************************************
        TAB FUNCTIONS - QuizEditTab*View interface
    ***************************************************** */
    // update contents
    updateTab: function() {
        var qm = this.containerView.quizModel;

        // num questions
        this.$el.find('.numQuestionsTxt').text(qm.getNumberOfQuestions());

        // badge selection
        this.updateBadgeId(qm.get('badgeId'));

        // certificate selection
        this.updateCertificateId(qm.get('certificateId'));
    },
    // validate the state of elements within this tab
    validate: function() {
        var qm = this.containerView.quizModel,

            $passingScore = this.$el.find('.passingScoreInput'),
            passingScore = parseInt($passingScore.val(),10),
            maxScore = qm.getNumberOfQuestions(),

            $attempts = this.$el.find('.allowedAttemptsInput'), // num attempts
            attempts = parseInt($attempts.val(),10),
            $attLimFirst = this.$el.find('.isAttemptsLimitInput:eq(0)'), // radios (on,off)
            $attLimChecked = this.$el.find('.isAttemptsLimitInput:checked'), // checked
            isAttemptsLimit = $attLimChecked.length && $attLimChecked.val() === 'true', //is on?

            $randomOrderFirst = this.$el.find('.isRandomQuestionOrderInput:eq(0)'),
            isRandomOrderChecked = this.$el.find('.isRandomQuestionOrderInput:checked').length,

            $showCert = this.$el.find('.showCertificateSelector'),

            $isNotifyTxt = this.$el.find('.showNotifyText'),
            $input = this.$el.find('.notifyText'),
            notifyTxt = ( $input.length == 1 ) ?
                ( ( $input.attr('type') == 'checkbox' || $input.attr('type') == 'radio' ) && $input.attr('checked') != 'checked' ) ? false
                    : $input.val()
                : $input.serializeArray(),

            // selectedCertId = qm.get('certificateId'),
            // selectedBadgeId = qm.get('badgeId'),
            isValid = true;

        notifyTxt = $.trim($("<span>"+notifyTxt+"</span>").text()); // use browser to strip HTML


        // FIELDS - show error on input using parent view genericErrorTip

        // passing score 
        if( _.isNaN(passingScore)) { // required
            this.containerView.genericErrorTip('msgPassingScoreReq', $passingScore);
            isValid = false;
        } else if (passingScore && (passingScore < 0 ||passingScore > maxScore)) { // in range
            this.containerView.genericErrorTip('msgPassingScoreRange', $passingScore);
            isValid = false;
        }

        // attempts
        if(!$attLimChecked.length) { // att lim not checked
            this.containerView.genericErrorTip('msgAttemptLimitSelectReq', $attLimFirst);
            isValid = false;
        } else if (isAttemptsLimit && ( (!attempts) || attempts < 0) ) { // att lim input incorrect
            this.containerView.genericErrorTip('msgAttemptLimitReq', $attempts);
            isValid = false;
        }   

        // random order
        if(!isRandomOrderChecked) {
            this.containerView.genericErrorTip('msgIsRandomSelectReq', $randomOrderFirst);
            isValid = false;
        }


        // TODO - budget and/or certificate might be required? if so add checks for them

        // notify pax
        if($isNotifyTxt.is(':checked') && notifyTxt.length === 0) {
            this.containerView.genericErrorTip('msgNotifyTextReq', $isNotifyTxt);
            isValid = false;
        }


        // NEXT/ TAB tip comes from this
        // failed generic validation test(s)
        if(!isValid) { 
            return { msgClass: 'msgGenericError', valid: false }; 
        }

        return {valid:true};
    }


});