/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
SSIContestEditTranslationsView:true
*/
SSIContestEditTranslationsView = Backbone.View.extend({

    tagName: 'div',
    className: 'ssiContestEditTranslationsView',

    initialize: function(opts) {
        var that = this;

        this.tpl = opts.tpl;
        this.subTpls = opts.subTpls;
        this.translationName = opts.translationName;
        this.contMod = opts.contMod;
        this.pageView = opts.pageView;
        this.collection = new Backbone.Collection(this.contMod.get(this.translationName));

        this.$el.addClass(this.translationName+'TranslationsView');

        // ajax to server for input to check unique
        this.isCheckUniqueInput = opts.isCheckUniqueInput;

        // are there uploads for each translation?
        this.hasUploadables = opts.hasUploadables;

        this.setupEvents();
    },

    events: {
        'blur .defLangTrans input': 'doInputBlur',
        'blur .transItemCont input': 'doInputBlur',
        'blur .defLangTrans textarea': 'doInputBlur',
        'blur .transItemCont textarea': 'doInputBlur',

        'click .hideTranslationsBtn': 'doHideTrans',
        'click .showTranslationsBtn': 'doShowTrans',

        'click .remDocBtn': 'doRemUpload'
    },

    setupEvents: function() {
        this.contMod.on('defaultLanguageChanged', this.handleDefLangChange, this);
        this.contMod.on('languageSelectStateChanged', this.handleLanguageSelectStateChanged, this);

        // check unique input AJAX events
        this.contMod.on('start:checkUniqueInput:'+this.translationName, this.handleCheckUniqueInputStart, this);
        this.contMod.on('error:checkUniqueInput:'+this.translationName, this.handleCheckUniqueInputError, this);
        this.contMod.on('success:checkUniqueInput:'+this.translationName, this.handleCheckUniqueInputSuccess, this);
        this.contMod.on('end:checkUniqueInput:'+this.translationName, this.handleCheckUniqueInputEnd, this);

        if(this.hasUploadables) {
            this.collection.on('change', this.handleUploadableChange, this);
        }

    },


    /* **************************************************
        UI Update/Render
    ***************************************************** */
    justRender: function() {
        this.$el.html( this.tpl({}) );
        this.renderTranslations();
    },

    renderInto: function($parent) {
        this.justRender();
        $parent.append(this.$el);

        this.update();
        return this.$el;
    },

    render: function() {
        this.justRender();
        this.update();

        return this.$el;
    },

    renderTranslations: function() {
        var $list = this.$el.find('.transItemList'),
            that = this;

        $list.empty();

        this.collection.each(function(t){
            if(that.isDefTrans(t)) { return; } // don't render def lang in list
            var tv = new that.ItemView({
                    contMod: that.contMod,
                    model: t,
                    tpl: that.subTpls.transItem
                }),
                $tv = tv.render();
            $list.append($tv);
            that.updateDocumentUploader($tv);
        });

    },

    update: function() {
        var $tw = this.$el.find('.translationsWrapper'),
            hasAnUpload;

        this.updateDefault();

        // show hide list of trans based on num translations
        if(this.collection.length <= 1) {
            $tw.slideUp(G5.props.ANIMATION_DURATION);
        } else {
            if(this.hasUploadables) {
                hasAnUpload = this.collection.filter(
                    function(d){ return d.get('url') ? true : false;
                }).length ? true : false;
                if(hasAnUpload) {
                    $tw.slideDown();
                } else {
                    $tw.slideUp(G5.props.ANIMATION_DURATION);
                }
            } else {
                $tw.slideDown(G5.props.ANIMATION_DURATION);
            }

        }

        this.updateCheckUniqueInput();


        // setup charcount on nekkid textareas (descrptions)
        this.pageView.initNakedCharCount(this.$el);

        // setup richtext
        this.updateRichText();

    },

    updateDefault: function() {
        var dt = this.getDefTrans(),
            $defTextArea = this.$el.find('.defLangTrans textarea');

        // SET VALUE and LANGUAGE ID
        this.$el.find('.defLangTrans').data('languageId', dt.get('languageId'));
        this.$el.find('.defLangTrans input, .defLangTrans textarea')
            .val(dt.get('text'))
            .data('languageId', dt.get('languageId'));

        // TEXTAREA - trigger event
        $defTextArea.trigger('keyup'); // for plaintext charcount update

        // RICHTEXT - trigger event
        if($defTextArea.get(0) && $defTextArea.get(0).jhtmlareaObject) {
            $($defTextArea.get(0).jhtmlareaObject.editor.body).trigger('keyup');
        }

        // UPLOADABLES is special
        if(this.hasUploadables) {
            this.updateDefaultUploadable();
        }
    },

    updateCheckUniqueInput: function() {
        var wasValid = this.getDefTrans().get('wasValid'),
            $dtInput = this.$el.find('.defLangTrans input');

        // hide all unique check shizz
        if(this.isCheckUniqueInput) {
            if( typeof wasValid === 'boolean' ) {
                this.setUniqueOkOn($dtInput, wasValid);
            } else {
                $dtInput.siblings('.valid, .invalid, .invalidMsg').hide();
            }
        }
    },

    updateRichText: function() {
        var that = this;
        this.$el.find('.richtext').htmlarea(G5.props.richTextEditor);
        this.$el.find('.richtext').each( function(){
            var thisRichText = this;
            // oh you know I'm nasty!
            this.jhtmlareaObject.editor.body.onblur = function(){
                that.doInputBlur({target: thisRichText});
            };
        });
    },


    /* **************************************************
        UPLOADER
    ***************************************************** */
    updateDefaultUploadable: function() {
        var defDoc = this.getDefTrans();
        this.$el.find('.defLangTrans').data('languageId', defDoc.get('languageId'));
        this.updateUploadable(defDoc.get('languageId'));
    },

    updateUploadable: function(langId) {
        var dt = this.getDefTrans(),
            $w = this.transWrapForLang(langId),
            doc = this.addGet(langId),
            isSet = doc.get('id') ? true : false;

        //console.log($w);

        // default document states
        $w.find('.uploadDocBtn, .documentFileInput')[isSet ? 'hide' : 'show']();
        $w.find('.docOrigName')[isSet ? 'show' : 'hide']()
            .text(doc ? doc.get('originalFilename') : '');
        $w.find('.remDocBtn')[isSet ? 'show' : 'hide' ]().data('languageId', doc.get('languageId'));
        $w.find('.docDispNameInput').val(doc ? doc.get('name') : '');

        if(isSet) {
            // slide down disp name inp and focus if its val is falsey
            $w.find('.dispNameWrap').slideDown( function() {
                var $inp = $w.find('.dispNameWrap input');
                if(!$inp.val()) { $inp.focus(); }
            });
        } else {
            $w.find('.dispNameWrap').slideUp();
        }

        this.updateDocumentUploader($w);
    },

   // update state of upload controls (both for default and translations)
    updateDocumentUploader: function($m) {
        var that = this,
            startSpin = function() {
                $m.find('.fileInputWrapper').hide();
                $m.find('.uploadingIndicator').show().find('.uploadingSpinner').spin();
            },
            stopSpin = function() {
                $m.find('.uploadingIndicator').hide().find('.uploadingSpinner').spin(false);
                $m.find('.fileInputWrapper').show();
                $m.find('.uploadingIndicator .bar').css('width','0%').text('0%');
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
                    that.pageView.genericErrorTip('msgUnsupportedFileType', $tar, {hide:{event:"unfocus click"}});
                }
            },
            beforeSend: startSpin,
            done: function(e, data) {
                var props = data.result.data.properties,
                    langId = $m.find('.uploaderFileInput').data('languageId');
                if(props.isSuccess){
                    that.handleFileUploaded(langId, props);
                } else {
                    showError( props.errorText || "File upload failed - server did not provide [errorText]" );
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


    /* **************************************************
        UI Actions - clicks etc.
    ***************************************************** */
    doInputBlur: function(e) {
        var $tar = $(e.target),
            lId = $tar.data('languageId'),
            v = $tar.val();
        // AJAX unique check
        if(this.isCheckUniqueInput) {
            this.addGet(lId).set('text', v);
            this.checkUniqueInput(this.translationName, lId, v);
        }
        // UPLOADABLE display name
        else if(this.hasUploadables) {
            if($tar.hasClass('docDispNameInput')) {
                this.addGet(lId).set('name', v);
                this.pushThisCollectionToContestModel();
            }
        }
        // VANILLA, just push vals to model(s)
        else {
            this.addGet(lId).set('text', v);
            this.pushThisCollectionToContestModel();
        }
    },

    doHideTrans: function(e) {
        e.preventDefault();
        this.$el.find('.translationsEditor').slideUp();
        this.$el.find('.translationsSummary').slideDown();
    },

    doShowTrans: function(e, instant) {
        if(e) e.preventDefault();
        this.$el.find('.translationsEditor')[instant ? 'show' : 'slideDown']();
        this.$el.find('.translationsSummary')[instant ? 'hide' : 'slideUp']();
    },

    doRemUpload: function(e) {
        var $tar = $(e.target),
            $tip = this.$el.find('.docRemoveDialog'),
            langId = $tar.data('languageId');

        // confirm callback
        function doIt() {
            this.addGet(langId).set({
                id: null,
                name: null,
                originalFilename: null,
                url: null
            });
            this.pushThisCollectionToContestModel();
            this.renderTranslations();
        }

        // confirm dialog qtip
        G5.util.questionTip($tar, $tip.clone(), {
                position:{
                    my: 'left center',
                    at: 'right center'
                }
            },
            doIt.bind(this)
        );

    },


    /* *****************************************************
        Handlers - what to do when stuff happens to things
    ******************************************************** */
    handleDefLangChange: function(o) {
        this.addGet(o.newDefLang, {silent: true})
            .set('isDefault', true);

        this.collection
            .where({ languageId: o.lastDefLang.id })[0]
            .set('isDefault', false);

        this.renderTranslations();
        this.update();
    },

    handleLanguageSelectStateChanged: function(lang) {
        if(lang.isSelected) {
            this.addGet(lang);
        } else {
            this.collection.remove(
                this.collection.where({languageId: lang.id}),
                {silent: true}
            );
        }

        this.renderTranslations();
        this.update();
    },

    handleCheckUniqueInputStart: function(params) {
        this.trigger('start:busy');

        var lid = params.language,
            $input = this.$el.find('input').filter( function(){
                return $(this).data('languageId') === lid;
            });

        this.pageView.lockNav('checkUniqueInput_'+lid);
        this.setUniqueSpinStateOn($input, true);
    },

    handleCheckUniqueInputSuccess: function(resp, params) {
        var lid = params.language,
            lMod = this.addGet(lid),
            $input = this.$el.find('input').filter( function(){
                return $(this).data('languageId') === lid;
            });

        lMod.set('wasValid', true);
        lMod.set('text', $input.val());

        this.pushThisCollectionToContestModel();
        this.setUniqueOkOn($input, true);
    },

    handleCheckUniqueInputEnd: function(params) {
        var lid = params.language,
            $input = this.$el.find('input').filter( function(){
                return $(this).data('languageId') === lid;
            });

        this.pageView.unlockNav('checkUniqueInput_'+lid);

        this.setUniqueSpinStateOn($input, false);
        this.trigger('end:busy');
    },

    handleCheckUniqueInputError: function(errText, params) {
        var lid = params.language,
            lMod = this.addGet(lid),
            $input = this.$el.find('input').filter( function(){
                return $(this).data('languageId') === lid;
            });

        this.addGet(lid).set('wasValid', false);
        lMod.set('text', $input.val());

        this.pushThisCollectionToContestModel();
        this.setUniqueOkOn($input, false, errText);
    },

    handleFileUploaded: function(langId, props) {
        var $trans = this.transWrapForLang(langId),
            name = $trans.find('.docDispNameInput').val(),
            transObj = this.addGet(langId);

        transObj.set({
            languageId: langId,
            id: props.fileUrl,
            name: name,
            url: props.fileUrl,
            originalFilename: props.originalFilename
        });

        this.pushThisCollectionToContestModel(); // push local Collection to ContestModel

        this.renderTranslations();

        // to display translations when the file dl was the first dl
        this.update();
    },

    handleUploadableChange: function(model, what) {
        if(what.changes.originalFilename) { // this was an upload
            // update aproppriate UI
            this.updateUploadable(model.get('languageId'));
        }
    },


    /* **************************************************
        Utility
    ***************************************************** */
    clearTextFromTranslations: function() {
        this.collection.each( function(t){ t.set('text',''); });

        this.render();
        this.pushThisCollectionToContestModel();
    },

    addGet: function(lang, opts) {
        var trans;

        opts = opts||{};

        if(lang.id) { // is language obj (id == lang ident)
            trans = this.collection.where({languageId: lang.id});
            if(!trans.length) { // add it
                this.collection.add({ languageId: lang.id }, opts);
                trans = this.collection.where({languageId: lang.id})[0];
            } else {
                trans = trans[0];
            }
            return trans;
        } else if(typeof lang === 'string') { // languageId
            return this.collection.where({languageId: lang})[0];
        }
    },

    getDefTrans: function() {
        var dl = this.contMod.getDefaultLanguage();

        return this.addGet(dl);
    },

    isDefTrans: function(trans) {
        return this.contMod.getDefaultLanguage().id == trans.get('languageId');
    },

    checkUniqueInput: function(transName, languageId, value) {
        this.clearUniqueOkNotOk(this.transWrapForLang(languageId).find('input'));

        if(!value) { return; }

        this.contMod.checkUniqueInput(transName, languageId, value);
    },

    setUniqueSpinStateOn: function($el, isOn) {
        var $s = $el.siblings('.uniqueTranslationCheckSpinner');

        if(isOn) {
            this.clearUniqueOkNotOk($el);
        }

        $s[isOn ? 'show' : 'hide']().spin(isOn);
    },

    setUniqueOkOn: function($el, isOk, msg) {
        var $yay = $el.siblings('.valid'),
            $boo = $el.siblings('.invalid'),
            $msg = $el.siblings('.invalidMsg');

        $msg.text('');
        this.clearUniqueOkNotOk($el);

        if(isOk) {
            $yay.fadeIn();
        } else {
            $boo.fadeIn();
            if(msg) { $msg.text(msg).fadeIn(); }
        }
    },

    clearUniqueOkNotOk: function($el) {
        $el.siblings('.valid, .invalid, .invalidMsg').hide();
    },

    pushThisCollectionToContestModel: function() {
        this.contMod.set(this.translationName, this.collection.map(function(t){
            var js = t.toJSON();

            delete js.isDefault;
            delete js.wasValid;

            return js;
        }));
    },

    transWrapForLang: function(langId) {
        var $wrap = this.$el.find('.transItemCont, .defLangTrans').filter( function() {
                return $(this).data('languageId') === langId;
            });

            return $wrap;
    },

    validate: function() {
        var hasErr = false,
            atLeastOneUploadable;

        atLeastOneUploadable = this.collection.filter(
            function(upTranny) { return upTranny.get('url') ? true : false;
        }).length > 0;

        // all fields required for all languages
        this.collection.each( function(t) {
            if(hasErr) return;

            var $w = this.transWrapForLang(t.get('languageId'));

            if(this.hasUploadables) {
                if(atLeastOneUploadable) {
                    // note: for uploadables, if one is added, then all must be added
                    if(!t.get('url')) {
                        this.doShowTrans(null, true/*instant*/);
                        this.errorTip('uploadReq', $w.find('.uploadDocBtn'));
                        hasErr = true;
                        return;
                    }
                    if(!t.get('name')) {
                        this.doShowTrans(null, true/*instant*/);
                        this.errorTip('required', $w.find('.docDispNameInput'));
                        hasErr = true;
                        return;
                    }
                }// atLeastOneUploadable
            } else { // text field only
                if(!t.get('text')) {
                    this.doShowTrans(null, true/*instant*/);
                    this.errorTip('required', $w.find('input, textarea:visible, .jHtmlArea'));
                    hasErr = true;
                    return;
                }
                if(this.isCheckUniqueInput && t.get('wasValid') === false) {
                    this.doShowTrans(null, true/*instant*/);
                    this.errorTip('notUnique', $w.find('input'));
                    hasErr = true;
                    return;
                }
            }
        }.bind(this) );

        return !hasErr;
    },

    // display an error tip on target (uses class name to show proper error)
    errorTip: function(msgKey, $target, opts) {
        var msg = JSON.parse(this.$el.find('.errMsgs').text())[msgKey],
            defOpts = {
                content:{text: msg},
                position:{
                    my: 'bottom center',
                    at: 'top center',
                    effect: false,
                    viewport: true,
                    adjust: {
                        method: 'shift none'
                    }
                },
                show:{
                    event:false,
                    ready:true
                },
                hide:{
                    event:'unfocus click',
                    fixed:true,
                    delay:200
                },
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-red',
                    tip: {
                        corner: true,
                        width: 10,
                        height: 5
                    }
                }
            };

        // perform a deep merge, where opts overrides defOpts
        opts = $.extend(true, defOpts, opts||{});

        //attach qtip and show
        $target.qtip(opts);
    },

    disable: function() {
        this.$el.find('.defLangTrans input, .transItemCont input').prop('disabled','disabled');
    },

    setDisplayOnly: function() {
        // hide def lang input
        this.$el.find('.defLangTrans').hide();
        // set display only of name
        this.$el.find('.defTransContDispOnly').show()
            .find('b').text(this.getDefTrans().get('text'));
        // cheapo, just disable the INPUTS for translations
        this.disable();
    },


    /* ********************************************************************
        ItemView shove a SIMPLE view in here
        (if it gets gnarly, move it out and give it SSI* name)
    *********************************************************************** */
    ItemView: Backbone.View.extend({
        tagName: 'div',
        className: 'transItem clearfix',
        initialize: function(opts) {
            this.tpl = opts.tpl;
            this.model = opts.model;
            this.contMod = opts.contMod;
        },

        render: function() {
            var x = this.model.toJSON();

            // set the lang name from master lang list (trans objects have the id string only)
            x.languageName = this.contMod.getLanguageById(x.languageId).name;

            // unique name validity
            x.showInvalidStuff = x.wasValid === false;
            x.showValidStuff = x.wasValid === true;

            return this.$el.append(this.tpl(x));
        }
    })
});
