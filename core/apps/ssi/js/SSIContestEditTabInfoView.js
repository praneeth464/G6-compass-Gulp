/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
BadgesSelectorView,
SSIContestEditTabInfoView:true
*/
SSIContestEditTabInfoView = Backbone.View.extend({

    initialize: function(opts) {
        // var that = this;

        // SSIContestPageEditView parent container for this tab
        this.containerView = opts.containerView;

        // shortcut to contest model
        this.contMod = this.containerView.contestModel;

        this.initInputs();
        this.setupEvents();

    },

    events: {
        // hide any error qtips that may have opened on validateme check
        'focus .contestNameInput':function(e){
            var $t = $(e.currentTarget);
            if($t.data('qtip')) { $t.qtip('hide'); }
        },
        'blur .contestNameInput': 'doContestNameCheck',
        'change .date': 'updateDate',
        'click .showMessageText': 'updateMessageText',
        'change .contestApproversLists select': 'doApproversChange',

        'click .nameTranslationsWrapper .addTranslationsBtn': 'doNamesFetch',
        'click .nameTranslationsWrapper .showTranslationsBtn': 'doNamesFetch',
        'click .nameTranslationsWrapper .hideTranslationsBtn': 'doNamesHide',
        'click .nameTranslationsWrapper .addAnotherTranslationBtn': 'doNameAdd',
        'blur .nameTranslationsWrapper .nameInput': 'doContestNameTransCheck',

        'click .documentsWrapper .remDocBtn': 'doDocRemove',
        'click .documentsTranslationsWrapper .addTranslationsBtn': 'doDocsFetch',
        'click .documentsTranslationsWrapper .showTranslationsBtn': 'doDocsFetch',
        'click .documentsTranslationsWrapper .hideTranslationsBtn': 'doDocsHide',
        'click .documentsTranslationsWrapper .addAnotherTranslationBtn': 'doDocsAdd',
        'blur .docDispNameInput': 'doDocumentTransSetName',
        'blur .documentsTranslationsWrapper .documentInput': 'doDocumentTransSetName',

        'click .descriptionTranslationsWrapper .addTranslationsBtn': 'doDescriptionsFetch',
        'click .descriptionTranslationsWrapper .showTranslationsBtn': 'doDescriptionsFetch',
        'click .descriptionTranslationsWrapper .hideTranslationsBtn': 'doDescriptionsHide',
        'click .descriptionTranslationsWrapper .addAnotherTranslationBtn': 'doDescriptionAdd',

        'click .messageTranslationsWrapper .addTranslationsBtn': 'doMessagesFetch',
        'click .messageTranslationsWrapper .showTranslationsBtn': 'doMessagesFetch',
        'click .messageTranslationsWrapper .hideTranslationsBtn': 'doMessagesHide',
        'click .messageTranslationsWrapper .addAnotherTranslationBtn': 'doMessageAdd',

        'keyup .defaultDescriptionInput,.descriptionInput': 'doDescriptionTransSetText',
        'change .defaultDescriptionInput,.descriptionInput': 'doDescriptionTransSetText'
    },

    setupEvents: function() {
        var cm = this.containerView.contestModel;
        // check contest name events
        cm.on('start:checkName',this.handleCheckNameStart,this);
        cm.on('end:checkName',this.handleCheckNameEnd,this);
        cm.on('success:checkName',this.handleCheckNameSuccess,this);
        cm.on('error:checkName',this.handleCheckNameError,this);

        // listen for approvers load
        cm.on('start:fetchApprovers',this.handleFetchApproversStart,this);
        cm.on('end:fetchApprovers',this.handleFetchApproversEnd,this);

        // names
        cm.on('start:fetchTranslations:names',this.handleFetchTranslationsNamesStart,this);
        cm.on('end:fetchTranslations:names',this.handleFetchTranslationsNamesEnd,this);
        cm.on('add:nameTranslation',this.updateNameTranslations,this);

        // documents
        cm.on('change:documents',this.updateDocuments,this);
        cm.on('start:fetchTranslations:documents',this.handleFetchTranslationsDocsStart,this);
        cm.on('end:fetchTranslations:documents',this.handleFetchTranslationsDocsEnd,this);
        cm.on('add:documentTranslation',this.updateDocuments,this);

        // descriptions
        cm.on('start:fetchTranslations:descriptions',this.handleFetchTranslationsDescriptionsStart,this);
        cm.on('end:fetchTranslations:descriptions',this.handleFetchTranslationsDescriptionsEnd,this);
        cm.on('add:translation:descriptions',this.updateDescriptions,this);

        // messages
        cm.on('start:fetchTranslations:messages',this.handleFetchTranslationsMessagesStart,this);
        cm.on('end:fetchTranslations:messages',this.handleFetchTranslationsMessagesEnd,this);
        cm.on('add:translation:messages',this.updateMessages,this);


        // award them now only
        if(cm.get('contestType') === cm.TYPES.AWARD_THEM_NOW) {
            this.contMod.on('change:measureType', this.updateCurrTypeSel, this);
            this.contMod.on('change:measureType', this.updateOtherPayoutTypeSel, this);
            this.contMod.on('change:payoutType', this.updateOtherPayoutTypeSel, this);
            this.contMod.on('change:payoutType', this.containerView.updateBillTo, this.containerView);
        }
    },

    // init form elements
    initInputs: function() {
        var rtProps = _.clone(G5.props.richTextEditor);
        rtProps.toolbar = _.filter(rtProps.toolbar, function (tool) {
            // not sure if there's a better pattern to follow for this
            return tool && tool.css && tool.css === 'checkSpelling';
        });
        this.$el.find('.richtext').htmlarea( rtProps );

        this.updateDocumentUploader(this.$el.find('.documentsWrapper'));

        if(this.isAtn()) {
            this.containerView.updateBillTo();
        }

        this.updateMessageText(); // bootstrapped

        this.renderCurrencyAndOtherSelects();

        this.updateFieldDisablement();
    },

    updateDate: function(e) {
        var $tar = $(e.target),
            k = $tar.data('modelKey');
        this.containerView.contestModel.set(k,$tar.val());
    },

    // disable some fields depending on contest status
    updateFieldDisablement: function() {
        var cm = this.contMod,
            s = cm.get('status'),
            d = _.bind( function(s) {
                    return this.$el.find(s).prop('disabled','disabled');
                }, this);


        if(s == cm.STATUSES.PENDING) {
            // contest approvers (not on ATN type)
            // http://bugzilla.biworldwide.com/bugzilla/show_bug.cgi?id=60658
            if(cm.get('contestType') != cm.TYPES.AWARD_THEM_NOW) {
                d('.contestApproversLists select');
            }
        }


        if(s == cm.STATUSES.LIVE) {
            // contest name
            d('.contestNameInput');

            // datepickers
            if(!this._datesDisabled) {
                // start date (move input el out of datepicker el)
                this.$el.find('.startDateTrigger')
                    .before( d('.startDateInput').clone() )
                    .hide()
                    .closest('.validateme').removeClass('validateme');
                // tile start date (move input el out of datepicker el)
                this.$el.find('.tileStartDateTrigger')
                    .before( d('.tileStartDateInput').clone() )
                    .hide()
                    .closest('.validateme').removeClass('validateme');
                this._datesDisabled = true;
            }

            // contest approvers (not on ATN type)
            if(cm.get('contestType') != cm.TYPES.AWARD_THEM_NOW) {
                d('.contestApproversLists select');
            }


            // if ATN then extra disableds
            if(cm.get('contestType') == cm.TYPES.AWARD_THEM_NOW) {
                // measure type
                d('.measureTypeRadio').closest('.validateme').removeClass('validateme');
                // currency
                d('#currencyTypeSelect');
                // measure type
                d('.payoutTypeRadio').closest('.validateme').removeClass('validateme');
                // currency
                d('#otherPayoutTypeSelect');
                // badge
                if(this.badgesSelectorView) {
                    this.badgesSelectorView.disable();
                }
            }
        }
    },

    handleFetchTranslationsDocsStart: function() {
        var $w = this.$el.find('.documentsTranslationsWrapper');

        $w.find('.documentsTranslationsSummary').hide();

        $w.find('.spinWrap').show();
        $w.find('.ajaxSpinner').show().spin(true);
    },

    handleFetchTranslationsDocsEnd: function() {
        var $w = this.$el.find('.documentsTranslationsWrapper');

        //this.updateNameTranslations(); // render table of names

        $w.find('.ajaxSpinner').spin(false).hide();
        $w.find('.spinWrap').slideUp(G5.ANIMATION_DURATION);

        $w.find('.documentsTranslationsEditor').slideDown(G5.ANIMATION_DURATION);

    },

    doDocsHide: function(e) {
        var $w = this.$el.find('.documentsTranslationsWrapper');

        e.preventDefault();

        $w.find('.documentsTranslationsEditor').slideUp(G5.ANIMATION_DURATION);
        $w.find('.documentsTranslationsSummary').slideDown(G5.ANIMATION_DURATION);
        this.updateDocuments();
    },

    doDocsAdd: function(e) {
        e.preventDefault();

        // do nothing if disabled
        if($(e.target).hasClass('disabled')) { return; }

        this.containerView.contestModel.addNewDocTranslation();
    },

    doDocsFetch: function(e) {
        e.preventDefault();
        // listeners will modify gui as stuff happens
        this.containerView.contestModel.fetchTranslationsDocuments();
    },

    doDocumentTransSetName: function(e) {
        var $tar = $(e.target),
            name = $tar.val(),
            lang = null;

        // if existing trans
        lang = $tar.closest('tr').find('.fileInputWrapper').data('docLang')||
            $tar.closest('tr').find('select').val()||
            this.containerView.contestModel.get('defaultLanguage');

        this.containerView.contestModel.setDocumentTranslationNameByLang(name, lang);
    },

    doDocRemove: function(e) {
        var that = this,
            $tar = $(e.target);

        e.preventDefault();

        G5.util.questionTip(
            $tar,
            this.$el.find('.docRemoveDialog').clone(),
            { position:{my:'left center',at:'right center'} },//qtip2 opts
            function() { that.contMod.remDefaultDocumentTranslation(); },
            null /* cancel cb */
        );

    },

    // update docs summary info
    updateDocuments: function(){
        var $dw = this.$el.find('.documentsTranslationsWrapper'),
            docCnt = this.containerView.contestModel.get('documentsTranslationCount'),
            docs = this.containerView.contestModel.prepareTranslationsArray('documents'),
            defDoc = this.containerView.contestModel.getDefaultTranslationByName('documents'),
            langs = this.containerView.contestModel.get('languages'),
            that = this;

        if(!defDoc.id) { defDoc = null; } // server returns a default document with empty strings except for def lang

        // default document states
        this.$el.find('.documentsWrapper .uploadDocBtn, .documentsWrapper .documentFileInput')[defDoc?'hide':'show']();
        this.$el.find('.documentsWrapper .docOrigName')[defDoc?'show':'hide']()
            .text(defDoc?defDoc.originalFilename:'');
        this.$el.find('.documentsWrapper .remDocBtn, .documentsWrapper .docDisplayName')[defDoc?'show':'hide']();
        this.$el.find('.documentsWrapper .docDispNameInput').val(defDoc?defDoc.name:'');

        docCnt = docCnt>0 ? docCnt-1 : 0;

        // translations summary and edit
        $dw.find('.translationsCountMsg b').text(docCnt);
        $dw.find('.translationsCountMsg')[docCnt?'show':'hide']();
        $dw.find('.addTranslationsBtn')[docCnt?'hide':'show']();
        $dw.find('.showTranslationsBtn')[docCnt?'show':'hide']();

        // if there is a new doc, don't allow add new
        // if there is max num trans, don't allow add new
        if(_.find(docs,function(d){return d._isNew;}) || docs.length === langs.length-1) {
            $dw.find('.addAnotherTranslationBtn').addClass('disabled').attr('disabled','disabled');
        } else {
            $dw.find('.addAnotherTranslationBtn').removeClass('disabled').removeAttr('disabled');
        }

        // render table
        TemplateManager.get('documentItems', function(tpl) {
            $dw.find('.translationsTable tbody').empty().append(tpl({
                docs: docs,
                languages: langs
            }));
            // setup the uploader for each
            $dw.find('.fileInputCell').each(function(){
                that.updateDocumentUploader($(this));
            });
        });

    },

    // update state of upload controls (both for default and translations)
    updateDocumentUploader: function($m) {
        var that = this,
            // init docLang with default lang, on callback will check to see
            // if it is in translation table and change this val if needed
            docLang = this.containerView.contestModel.get('defaultLanguage'),
            startSpin = function() {
                $m.find('.fileInputWrapper').hide();
                $m.find('.uploadingIndicator').show().find('.uploadingSpinner').spin();
            },
            stopSpin = function() {
                $m.find('.uploadingIndicator').hide().find('.uploadingSpinner').spin(false);
                $m.find('.fileInputWrapper').show();
                $m.find('.uploadingIndicator .bar').css('width','0%').text('0%');
                $m.find('.docDisplayName').show().find('input').focus();
            },
            showError = function(errorContent) {
                $m.find('.uploadError').show().find('span').html(errorContent);
            },
            hideError = function() {
                $m.find('.uploadError').hide().find('span').html('');
            };

        // upload pluggy (its smart enough to know only to
        // get attached once even though it gets called every update)
        $m.find('.uploaderFileInput').fileupload({
            url: G5.props.URL_JSON_CONTEST_DOCUMENT_UPLOAD,
            dataType: 'g5json',
            formData: {},
            add: function(e, fuData) {
                var f = fuData.files[0],
                    regEx = /\.(pdf|doc|docx)$/i,
                    $tar = $m.find('.uploaderFileInput:visible');

                if(regEx.test(f.name)) {
                    // continue normal behavior
                    fuData.submit();
                } else {
                    // throw error tip up, also add 'click' to hide events in addition to 'unfocus' so a click
                    // on the upload button will also hide the qtip
                    that.containerView.genericErrorTip('msgUnsupportedFileType', $tar, {hide:{event:'unfocus click'}});
                }

            },
            beforeSend: startSpin,
            done: function(e, data) {
                var props = data.result.data.properties,
                    docObj = null,
                    name = $m.closest('tr').find('.documentInput').val()||that.$el.find('.docDispNameInput').val();

                // if existing trans
                docLang = $m.find('.fileInputWrapper').data('docLang')||docLang;
                // if new trans
                docLang = $m.closest('tr').find('select').val()||docLang;
                // else its default

                if(props.isSuccess){
                    // might be an error hanging out
                    hideError();

                    docObj = {
                        language: docLang,
                        id: props.fileUrl,
                        name: name,
                        url: props.fileUrl,
                        originalFilename: props.originalFilename
                    };

                    // if its new
                    if($m.find('.fileInputWrapper').data('docIsNew')){
                        docObj._isNew = true; // model will use this to match
                    }

                    that.containerView.contestModel.addDocument(docObj);
                } else {
                    showError(props.errorText||'File upload failed - server did not provide [errorText]');
                }

                stopSpin();
            },
            error: function(xhr, status, error) {
                stopSpin();
                showError(status+': '+error);
            }
        });

        // hide any upload errors hanging out
        hideError();
    },

    // this check name stuff could be cleaner and easier to understand, but we have to go quick+dirty
    // due to time constraints
    handleCheckNameStart: function(lang) {
        var $sel = this.$el.find('.nameTranslationsEditor tr select').filter(function(i){
                return $(this).val() === lang;
            }),
            $spin = null;

        this.containerView.lockNav('contestNameCheck_'+lang);

        // if $sel length is 0, then this is existing trans, look elsewhere
        if(!$sel.length) {
            $sel = this.$el.find('.nameTranslationsEditor .nameInput[data-name-lang='+lang+']');
        }

        // is this def lang?
        if(this.containerView.contestModel.isDefLang(lang)) {
            $spin = this.$el.find('.defLangNameTrans .contestNameCheckingSpinnner');
        } else {
            $spin = $sel.closest('tr').find('.contestNameCheckingSpinnner');
        }

        $spin.show().spin(true);
    },

    handleCheckNameEnd: function(lang) {
        var $sel = this.$el.find('.nameTranslationsEditor tr select').filter(function(i){
                return $(this).val() === lang;
            }),
            $spin;

        this.containerView.unlockNav('contestNameCheck_'+lang);

        // if $sel length is 0, then this is existing trans, look elsewhere
        if(!$sel.length) {
            $sel = this.$el.find('.nameTranslationsEditor .nameInput[data-name-lang='+lang+']');
        }

        // is def lang?
        if(this.containerView.contestModel.isDefLang(lang)) {
            $spin = this.$el.find('.defLangNameTrans .contestNameCheckingSpinnner');
        } else {
            $spin = $sel.closest('tr').find('.contestNameCheckingSpinnner');
        }

        $spin.spin(false).hide();
    },

    handleCheckNameSuccess: function(lang) {
        this.updateContestNameValidDisp(true, null, lang);
    },

    handleCheckNameError: function(msg, lang) {
        this.updateContestNameValidDisp(false, msg, lang);
    },

    updateContestNameValidDisp: function(isValid, erMsg, lang) {
        var $sel = this.$el.find('.nameTranslationsEditor tr select').filter(function(i){
                return $(this).val() === lang;
            }),
            $okIcon = null,
            $erIcon = null,
            $erMsg = null;

        // if $sel length is 0, then this is existing trans, look elsewhere
        if(!$sel.length) {
            $sel = this.$el.find('.nameTranslationsEditor .nameInput[data-name-lang='+lang+']');
        }

        // is default language?
        if(this.containerView.contestModel.isDefLang(lang)) {
            $okIcon = this.$el.find('.defLangNameTrans .contestNameValid');
            $erIcon = this.$el.find('.defLangNameTrans .contestNameInvalid');
            $erMsg = this.$el.find('.defLangNameTrans .contestNameInvalidMsg');
        } else {
            $okIcon = $sel.closest('tr').find('.contestNameValid');
            $erIcon = $sel.closest('tr').find('.contestNameInvalid');
            $erMsg = $sel.closest('tr').find('.contestNameInvalidMsg');
        }

        $okIcon[isValid?'show':'hide']();
        $erIcon[isValid?'hide':'show']();
        $erMsg[isValid?'hide':'show']();
        $erMsg.text(erMsg||'');
    },

    handleFetchApproversStart: function() {
        var $sw = this.$el.find('.approversAjaxSpinner');
        $sw.show().find('.ajaxSpinner').show().spin(true);
    },

    handleFetchApproversEnd: function() {
        var $sw = this.$el.find('.approversAjaxSpinner');
        $sw.find('.ajaxSpinner').spin(false).hide();
        $sw.hide();
        this.updateApprovers();
    },

    updateApprovers: function() {
        var $wrap = this.$el.find('.approversWrapper'),
            $list = $wrap.find('.contestApproversLists'),
            cm = this.containerView.contestModel,
            apps = cm.get('contestApprovers'),
            that = this;

        if(apps&&apps.length>0) {
            // button (selected) badge content
            TemplateManager.get('approvers', function(tpl) {
                $list.append(tpl({contestApprovers:apps}));
                if(apps.length === 1) { // hide level name if only one level
                    $wrap.find('.levelLabel').hide();
                }
                that.updateFieldDisablement();
            });
            $wrap.show();

        } else {
            $wrap.hide();
        }
    },

    doApproversChange: function(e){
        var $tar = $(e.target),
            levId = $tar.data('levelId'),
            vals = $tar.val();

        this.containerView.contestModel.setSelectedApprovers(levId, vals);
    },

    handleFetchTranslationsNamesStart: function() {
        var $w = this.$el.find('.nameTranslationsWrapper');

        $w.find('.nameTranslationsSummary').hide();

        $w.find('.spinWrap').show();
        $w.find('.ajaxSpinner').show().spin(true);
    },

    handleFetchTranslationsNamesEnd: function() {
        var $w = this.$el.find('.nameTranslationsWrapper');

        this.updateNameTranslations(); // render table of names

        $w.find('.ajaxSpinner').spin(false).hide();
        $w.find('.spinWrap').slideUp(G5.ANIMATION_DURATION);

        $w.find('.nameTranslationsEditor').slideDown(G5.ANIMATION_DURATION);

    },

    doNamesFetch: function(e) {
        e.preventDefault();
        // listeners will modify gui as stuff happens
        this.containerView.contestModel.fetchTranslationsNames();
    },

    doNamesHide: function(e) {
        var $w = this.$el.find('.nameTranslationsWrapper');

        e.preventDefault();

        $w.find('.nameTranslationsEditor').slideUp(G5.ANIMATION_DURATION);
        $w.find('.nameTranslationsSummary').slideDown(G5.ANIMATION_DURATION);
        this.updateNameTranslations();
    },

    doNameAdd: function(e) {
        e.preventDefault();
        this.containerView.contestModel.addNewNameTranslation();
    },

    // the main contest name check
    doContestNameCheck: function() {
        var $cni = this.$el.find('.contestNameInput'),
            defLang = this.containerView.contestModel.get('defaultLanguage');

        if($cni.val().length) {
            this.containerView.contestModel.setNameTranslationByLang($cni.val(), defLang);
            this.containerView.contestModel.checkContestName($cni.val(), defLang);
        }
    },

    // the contest name translations
    doContestNameTransCheck: function(e) {
        var $tar = $(e.target),
            name = $tar.val(),
            langId = $tar.data('nameLang')||$tar.closest('tr').find('select').val();

        if(name.length) {
            this.containerView.contestModel.setNameTranslationByLang(name, langId);
            this.containerView.contestModel.checkContestName(name, langId);
        }

        // well, lock the select, cuz this gets saved with the selected option
        $tar.closest('tr').find('select').attr('disabled','disabled');
    },

    updateNameTranslations: function() {
        var $w = this.$el.find('.nameTranslationsWrapper'),
            cnt = this.containerView.contestModel.get('namesTranslationCount'),
            trans = this.containerView.contestModel.prepareTranslationsArray('names'),
            defName = this.containerView.contestModel.getDefaultTranslationByName('names'),
            langs = this.containerView.contestModel.get('languages');

        // one translation is default
        cnt = cnt>0 ? cnt-1 : 0;

        this.$el.find('.defLangNameTrans .contestNameInput').val(defName.text);

        $w.find('.showTranslationsBtn')[cnt?'show':'hide']();
        $w.find('.translationsCountMsg')[cnt?'show':'hide']().find('b').text(cnt);

        $w.find('.addTranslationsBtn')[cnt?'hide':'show']();

        // render table
        TemplateManager.get('nameItems', function(tpl) {
            $w.find('.translationsTable tbody').empty().append(tpl({
                names:trans,
                languages:langs
            }));
        });
    },

    handleFetchTranslationsDescriptionsStart: function() {
        var $w = this.$el.find('.descriptionTranslationsWrapper');

        $w.find('.descriptionTranslationsSummary').hide();

        $w.find('.spinWrap').show();
        $w.find('.ajaxSpinner').show().spin(true);
    },

    handleFetchTranslationsDescriptionsEnd: function() {
        var $w = this.$el.find('.descriptionTranslationsWrapper');

        this.updateDescriptions(); // render table of translations

        $w.find('.ajaxSpinner').spin(false).hide();
        $w.find('.spinWrap').slideUp(G5.ANIMATION_DURATION);
        $w.find('.descriptionTranslationsEditor').slideDown(G5.ANIMATION_DURATION);

    },

    doDescriptionsFetch: function(e) {
        e.preventDefault();
        // listeners will modify gui as stuff happens
        this.containerView.contestModel.fetchTranslationsDescriptions();
    },

    doDescriptionAdd: function(e) {
        e.preventDefault();

        this.containerView.contestModel.addNewDescTranslation();
    },

    doDescriptionTransSetText: function(e) {
        var $tar = $(e.target),
            text = $tar.val(),
            lang = null;

        // if existing trans or new (select/option)
        lang = $tar.closest('tr').find('.descriptionInputWrapper').data('descLang')||
            $tar.closest('tr').find('select').val()||
            this.containerView.contestModel.get('defaultLanguage');

        this.containerView.contestModel.setDescriptionTranslationTextByLang(text, lang);
    },

    doDescriptionsHide: function(e) {
        var $w = this.$el.find('.descriptionTranslationsWrapper');

        e.preventDefault();

        $w.find('.descriptionTranslationsEditor').slideUp(G5.ANIMATION_DURATION);
        $w.find('.descriptionTranslationsSummary').slideDown(G5.ANIMATION_DURATION);

        this.updateDescriptions();
    },

    updateDescriptions: function() {
        var $w = this.$el.find('.descriptionTranslationsWrapper'),
            $ddi = this.$el.find('.defaultDescriptionInput'),
            cnt = this.containerView.contestModel.get('descriptionsTranslationCount'),
            trans = this.containerView.contestModel.prepareTranslationsArray('descriptions'),
            defDesc = this.containerView.contestModel.getDefaultTranslationByName('descriptions'),
            langs = this.containerView.contestModel.get('languages');

        // one translation is default
        cnt = cnt>0 ? cnt-1 : 0;

        // set val
        $ddi.val(defDesc.text);

        $w.find('.showTranslationsBtn')[cnt?'show':'hide']();
        $w.find('.translationsCountMsg')[cnt?'show':'hide']().find('b').text(cnt);

        $w.find('.addTranslationsBtn')[cnt?'hide':'show']();

        // render table
        TemplateManager.get('descriptionItems', function(tpl) {
            $w.find('.translationsTable tbody').empty().append(tpl({
                descriptions: trans,
                languages: langs
            }));
        });
    },

    // show hide message stuff based on checkbox
    updateMessageText: function(e) {
        var $visCheck = this.$el.find('.showMessageText'),
            $guts = this.$el.find('.messageTextGuts'),
            $txt = this.$el.find('.defaultMessageInput'),
            incMess = this.contMod.get('includeMessage');

        // if model is different from control, and this is not from a UI interaction
        // THEN set control to model state (basically init the value on tab/step load)
        // *when there is a UI interaction, the UI runs the show, not the model
        if(!e && incMess != $visCheck.is(':checked')) {
            $visCheck.prop('checked', incMess);
        }


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

    handleFetchTranslationsMessagesStart: function() {
        var $w = this.$el.find('.messageTranslationsWrapper');

        $w.find('.messageTranslationsSummary').hide();

        $w.find('.spinWrap').show();
        $w.find('.ajaxSpinner').show().spin(true);
    },

    handleFetchTranslationsMessagesEnd: function() {
        var $w = this.$el.find('.messageTranslationsWrapper');

        this.updateMessages(); // render table of translations

        $w.find('.ajaxSpinner').spin(false).hide();
        $w.find('.spinWrap').slideUp(G5.ANIMATION_DURATION);

        $w.find('.messageTranslationsEditor').slideDown(G5.ANIMATION_DURATION);

    },

    doMessagesFetch: function(e) {
        e.preventDefault();
        // listeners will modify gui as stuff happens
        this.containerView.contestModel.fetchTranslationsMessages();
    },

    doMessageAdd: function(e) {
        e.preventDefault();

        this.containerView.contestModel.addNewMessageTranslation();
    },

    doMessageTransSetText: function(e) {
        var $tar = $(e.target),
            text = $tar.val(),
            lang = null;

        text = $('<div>' + text + '</div>').text();

        // if existing trans or new (select/option) or default
        lang = $tar.closest('tr').find('.messageInputWrapper').data('messLang')||
            $tar.closest('tr').find('select').val()||
            this.containerView.contestModel.get('defaultLanguage');

        this.containerView.contestModel.setMessageTranslationTextByLang(text, lang);
    },

    doMessagesHide: function(e) {
        var $w = this.$el.find('.messageTranslationsWrapper');

        e.preventDefault();

        $w.find('.messageTranslationsEditor').slideUp(G5.ANIMATION_DURATION);
        $w.find('.messageTranslationsSummary').slideDown(G5.ANIMATION_DURATION);

        this.updateMessages();
    },

    updateMessages: function() {
        var $w = this.$el.find('.messageTranslationsWrapper'),
            $dmi = this.$el.find('.defaultMessageInput'),
            cnt = this.containerView.contestModel.get('messagesTranslationCount'),
            trans = this.containerView.contestModel.prepareTranslationsArray('messages'),
            defDesc = this.containerView.contestModel.getDefaultTranslationByName('messages'),
            langs = this.containerView.contestModel.get('languages'),
            that = this;

        // one translation is default
        cnt = cnt>0 ? cnt-1 : 0;

        // set val, and trigger keyup so richtext editor gets updated with text
        $dmi.val(defDesc.text).trigger('keyup');

        // cause update of charcount (yes, this is gross and so is that ⬆)
        $($dmi.get(0).jhtmlareaObject.editor.body).trigger('keyup');

        // always update this fool to the model
        if(!$dmi[0].jhtmlareaObject.editor.body.onkeyup) {
            $dmi[0].jhtmlareaObject.editor.body.onkeyup = function(){
                that.doMessageTransSetText({target: $dmi[0]});
            };
        }

        $w.find('.showTranslationsBtn')[cnt?'show':'hide']();
        $w.find('.translationsCountMsg')[cnt?'show':'hide']().find('b').text(cnt);

        $w.find('.addTranslationsBtn')[cnt?'hide':'show']();

        // render table
        TemplateManager.get('messageItems', function(tpl) {
            $w.find('.translationsTable tbody').empty().append(tpl({
                messages: trans,
                languages: langs
            }));
            // setup richtext
            $w.find('.richtext').htmlarea(G5.props.richTextEditor);
            $w.find('.richtext').each(function(){
                var thisRichText = this;
                // console.log(this.jhtmlareaObject);
                // oh you know I'm nasty!
                this.jhtmlareaObject.editor.body.onkeyup = function(){
                    that.doMessageTransSetText({target: thisRichText});
                };
            });
        });
    },


    // ***************************
    // award them now stuff
    // ***************************

    isAtn: function() {
        return this.contMod.get('contestType') === this.contMod.TYPES.AWARD_THEM_NOW;
    },

    isAtnEdit: function() {
        return  this.isAtn() && this.contMod.get('awardThemNowStatus') === 'editInfo';
    },

    // when editing award them now, many fields will be locked down
    updateAwardThemNow: function() {
        var cm = this.contMod,
            n = cm.getDefaultTranslationByName('names'),
            label;

        // billCodes
        if(this.isAtn()) {
           this.containerView.updateBillTo();
        }

        // make sure we are behaving properly (we are, aren't we?)
        if(!this.isAtnEdit()) { return; }

        // NAME
        this.$el.find('.defLangNameTrans').hide();
        this.$el.find('.awardThemNowOnly.defTransContNameDispOnly').show()
            .find('b').text(n.text);

        // START DATE
        this.$el.find('.startDateWrapper').hide();
        this.$el.find('.awardThemNowOnly.startDateDispOnly').show()
            .find('b').text(cm.get('startDate'));

        // MEASURE TYPE
        label = this.$el.find('.measureTypeRadio[value='+cm.get('measureType')+']').closest('label').text();
        this.$el.find('.measureActivityContGroup').hide();
        this.$el.find('.awardThemNowOnly.measureTypeDispOnly').show()
            .find('.dispTxt').text(label);

        // PAYOUT TYPE
        label = this.$el.find('.payoutTypeRadio[value='+cm.get('payoutType')+']').closest('label').text();
        this.$el.find('.payoutContGroup').hide();
        this.$el.find('.awardThemNowOnly.payoutTypeDispOnly').show()
            .find('.dispTxt').text(label);

        // PAYOUT TYPE VIZ
        this.containerView.updatePayoutTypeVisibility();

        // BADGE
        this.badgesSelectorView.disable();

        // BILL TO
        label = this.$el.find('.billToRadio[value='+cm.get('billTo')+']').closest('label').text();
        this.$el.find('.billToWrapper label').hide();
        this.$el.find('.billToWrapper .otherBillToCodesWrapper').hide();
        this.$el.find('.awardThemNowOnly.billToDispOnly').show()
            .find('.dispTxt').text(label);
    },

    updateIncludePersonalMessageVisibility: function() {
        this.$el.find('.personalMessageWrapper')[this.isAtn() ? 'hide' : 'show']();
    },

    updateDatesForAtn: function() {
        this.$el.find('.tileDispStartDateWrapper')[this.isAtn() ? 'hide' : 'show']();
    },

    renderCurrencyAndOtherSelects: function() {
        if(!this.isAtn()) {
            return; // only for award them now
        }

        var cm = this.contMod,
            mt = this.contMod.get('measureType'),
            pt = this.contMod.get('payoutType'),
            ren,
            $cts = this.$el.find('#currencyTypeSelect'),
            $opt = this.$el.find('#otherPayoutTypeSelect'),
            that = this;

        TemplateManager.get('currencyTypeOptions', function(tpl) {
            // render template to string
            ren = tpl( {'currencyTypes': cm.get('currencyTypes')} );

            // both selects share the same data
            $cts.empty().append(ren);
            $opt.empty().append(ren);

            // show stuff
            that.$el.find('.displayForAwardThemNow').show();

            // INIT set the activity measure
            that.$el.find('[name=measureType][value='+mt+']').prop('checked', true);

            // INIT set the payout type
            that.$el.find('[name=payoutType][value='+pt+']').prop('checked', true);
        });

    },

    updateCurrTypeSel: function() {
        if(!this.isAtn()) {
            return; // only for award them now
        }

        var mt = this.contMod.get('measureType'),
            ct = this.contMod.get('currencyTypeId'),
            $ctw = this.$el.find('.currencyTypeWrapper'),
            $cts = this.$el.find('#currencyTypeSelect');

        // show/hide the currency type dropdown
        if(mt === 'currency') {
            $ctw.show();
        } else {
            $ctw.hide();
        }

        // sync val if needed
        if(ct+'' !== $cts.val()+'') {
            $cts.find('option[value='+ct+']').prop('selected', true);
        }
    },

    updateOtherPayoutTypeSel: function() {
        if(!this.isAtn()) {
            return; // only for award them now
        }

        var pt = this.contMod.get('payoutType'),
            mt = this.contMod.get('measureType'),
            opt = this.contMod.get('otherPayoutTypeId'),
            $optw = this.$el.find('.otherPayoutTypeWrapper'),
            $opts = this.$el.find('#otherPayoutTypeSelect');

        // show/hide the currency type dropdown
        if(mt == 'currency' || pt != 'other') {
            $optw.slideUp();
        } else {
            $optw.slideDown();
        }

        // sync val if needed
        if(pt+'' !== $opts.val()+'') {
            $opts.find('option[value='+opt+']').prop('selected', true);
        }
    },

    initBadges: function() {
        if(!this.isAtn()) {
            return; // only for award them now
        }

        var $bw = this.$el.find('.badgesOuterWrapper'),
            that = this;
        // just hide the badge section if not using badges
        if(!this.contMod.payoutsIsUsingBadges()) {
            $bw.hide();
            return;
        }

        $bw.show();

        if(this.badgesSelectorView) { return; } // musta initialized this already

        // badges widget
        this.badgesSelectorView = new BadgesSelectorView({
            el: this.$el.find('.badgesSelectorView'),
            collection: new Backbone.Collection(this.contMod.get('badges')),
            selectedBadgeId: this.contMod.get('badgeId')||null
        });

        this.badgesSelectorView.on('badgeChanged', function(badgeModel) {
            that.contMod.set('badgeId', badgeModel.get('id'));
        }, this);
    },


    /* **************************************************
        TAB FUNCTIONS - ContestEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        var cm = this.containerView.contestModel;

        // make sure we have the bootstrapped nextUrl value (in case we were on a diff step)
        this.containerView.reloadBootstrappedContestJsonByKey('nextUrl');

        // call fetch approvers AJAX load
        cm.fetchApprovers();

        this.updateNameTranslations();
        this.updateDocuments();

        this.updateDescriptions();
        this.updateMessages();

        this.updateIncludePersonalMessageVisibility();
        this.updateDatesForAtn();
        this.updateCurrTypeSel();
        this.updateOtherPayoutTypeSel();
        this.initBadges();

        // special stuff for award them now contestType
        this.updateAwardThemNow();

        // setup charcount on nekkid textareas
        this.containerView.initNakedCharCount();

        // date vals model --> UI
        this.$el.find('.startDateInput').val(cm.get('startDate'));
        this.$el.find('.endDateInput').val(cm.get('endDate'));
        this.$el.find('.tileStartDateInput').val(cm.get('tileStartDate'));

        // init datepicker
        this.initDatepickers();

	// bz59834
	this.updateFieldDisablement();
    },

    initDatepickers: function() {
        var $sd = this.$el.find('.startDateTrigger'),
            $ed = this.$el.find('.endDateTrigger'),
            todayDate;

        // init plugin
        this.$el.find('.datepickerTrigger').datepicker();

        // hmmm, we'll see on this
        // set the endDate (disable all days before today)
        // $ed.datepicker('setStartDate', $sd.data('dateTodaydate'));

        // Commenting this block out as per http://bugzilla.biworldwide.com/bugzilla/show_bug.cgi?id=62404
        if (!this.isAtn()) {
            // set the startDate (disable all days before today)
            //$sd.datepicker('setStartDate', $sd.data('dateTodaydate'));
        } else {
            // set the startDate (disable all days after today)
            $sd.datepicker('setEndDate', $sd.data('dateTodaydate'));
        }

        // Remove the if block above and uncomment this block to resolve 62404
        // if (this.isAtn()) {
        //     // set the startDate (disable all days after today)
        //     $sd.datepicker('setEndDate', $sd.data('dateTodaydate'));
        // }
    },

    // validate the state of elements within this tab
    validate: function() {
        var $validate = this.$el.find('.validateme:visible'),
            isValid = G5.util.formValidate($validate), // simple check uses global formValidate
            cm = this.containerView.contestModel,
            todayDate = this.$el.find('.startDateTrigger').data('datepicker').todayDate,
            startDate = this.$el.find('.startDateTrigger').data('datepicker').date,
            endDate = this.$el.find('.endDateTrigger').data('datepicker').date,
            tileStartDate = this.$el.find('.tileStartDateTrigger').data('datepicker').date;

        // failed generic validation tests (requireds mostly)
        if(!isValid) {
            return { msgClass: 'msgGenericError', valid: false };
        }

        // did the contest name check out with the server (is it unique)
        if(!cm.validateNames()) {
            return { msgClass: 'msgContestNameNotUnique', valid: false };
        }

        // START DATE -  not for LIVE contests OR awardThemNow edit
        if(cm.get('status') !== cm.STATUSES.LIVE && !this.isAtnEdit()) {

            // awardThemNow has diff rule (must be in past or today)
            if(this.isAtn()) {
                if(startDate > todayDate) {
                    return { msgClass: 'msgStartDateTooLate', valid: false };
                }
            }
            // normal start date rule (must be after or on today)
            else {
                // bz62404
                // if(startDate < todayDate) {
                //     return { msgClass: 'msgStartDateTooEarly', valid: false };
                // }
            }
        }

        if(!this.isAtn()) {
            if(endDate <= startDate) {
                return { msgClass: 'msgEndDateTooEarly', valid: false };
            }
        } else {
            if(endDate < startDate) {
                return { msgClass: 'msgEndDateTooEarly', valid: false };
            }
        }


        // not for awardThemNow
        if(!this.isAtn()) {
            if(tileStartDate > startDate) {
                return { msgClass: 'msgTileStartDateTooLate', valid: false };
            }
        }


        if(!cm.validateDocDispNames()) {
            return { msgClass: 'msgDocMustHaveDispName', valid: false };
        }

        if(!cm.validateApprovers()) {
            return { msgClass: 'msgApproversReq', valid: false };
        }

        if(this.isAtn()) {

            if(!cm.validateBillTo()) {
                return { msgClass: 'msgBillToDataReq', valid: false };
            }
            if(!cm.validateBillToCode()) {
                return { msgClass: 'msgBillToCodeReq', valid: false };
            }

            if(!cm.get('measureType')) {
                return { msgClass: 'msgActivityTypeReq', valid: false };
            }
            if(!cm.get('payoutType')) {
                return { msgClass: 'msgPayoutTypeReq', valid: false };
            }

            if(cm.payoutsIsUsingBadges()) {
                // bz59983 - SSI Create Contest -  Award Them Now_v1.7.docx
                // "no badge" is acceptable
                // uncomment if badge becomes required
                // if(!cm.get('badgeId') || cm.get('badgeId') === 'noBadge') {
                //     return { msgClass: 'msgBadgeReq', valid: false };
                // }
            }
        }


        return {valid:true};
    },

    // special validate function to check if its ok to 'save draft'
    validateDraft: function() {
        var cm = this.containerView.contestModel;

        // did the quiz name check out with the server (is it unique)
        if(!cm.validateDraft()) {
            return { msgClass: 'msgSaveDraftNameIssue', valid: false };
        }

        return { valid: true };
    }

});
