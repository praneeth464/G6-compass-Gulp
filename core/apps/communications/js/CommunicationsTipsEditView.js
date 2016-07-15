/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
$,
_,
G5,
TemplateManager,
PageView,
SelectAudienceParticipantsView,
CommunicationsTipsEditModel,
CommunicationsTipsEditView:true
*/
CommunicationsTipsEditView = PageView.extend({

    initialize: function(opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'communications';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create model
        this.communicationsTipsEditModel = new CommunicationsTipsEditModel({});

        this.communicationsTipsEditModel.loadData();

        this.renderSpellcheck();
        this.updateContribComment();
        this.checkForServerErrors();

        this.communicationsTipsEditModel.on('loadDataFinished', function() {
            self.render();
            self.renderTipInfo();
        });

        this.on('tipsRendered', function(){
            self.renderAudience();
            self.displayTipsTable();
        });

        this.communicationsTipsEditModel.on('tipAdded', function(newData, isAdded){
            self.render(newData, isAdded);
        });

        this.communicationsTipsEditModel.on('tipRemoved', function(tips){
            self.render(tips);
        });

        this.communicationsTipsEditModel.on('tipUpdated', function(tip){
            self.doUpdateTip(tip);
        });

        this.$el.find('.datepickerTrigger').datepicker();

    },
    events: {
        'click .addLanguageContent a': 'addNewContent',
        "keyup .contribCommentInp": "updateContribComment",
        "blur .contribCommentInp": "updateContribComment",
        "paste .contribCommentInp": "updateContribComment",
        "click .contribCommentWrapper .dropdown-menu li a": "doContribCommentSpellCheck",
        'click .saveContent': 'doSaveTip',
        'click .cancelContent': 'confirmCancelSave',
        'click .editColumn a': 'doEditTip',
        'click .defaultColumn input': 'doSetDefault',
        'click .remParticipantControl': 'confirmRemoveTip',
        'click .tipSubmit': 'submitForm',
        'click .tipCancel': 'confirmCancelTip',
        'click #saveCancelDialogConfirm': 'doCancelSave',
        'click #tipsCancelDialogConfirm': 'doCancelTip',
        'click #tipRemoveDialogConfirm': "doRemoveTip",
        'click #saveCancelDialogCancel, #tipRemoveDialogCancel, #tipsCancelDialogCancel':function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },
    render: function(newData, isAdded) {
        var $tipCont = this.$el.find('#tipsContentTable tbody'),
            self = this,
            tplName = 'CommunicationsResourceCenterEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/',
            tips = this.communicationsTipsEditModel.get('tipsTable').tips;

        G5.util.hideSpin( this.$el );

        //Push values to template
        TemplateManager.get('tipsContentTable', function(tpl) {
            if(isAdded){
                // check to see if this is the first one and mark it the default
                if( tips.length == 1 ) {
                    newData.isDefaultLang = true;
                }

                $tipCont.append(tpl(newData));
            }else {
                $tipCont.html('');
                _.each(tips, function(tip){
                    $tipCont.append(tpl(tip));
                });
            }
            self.trigger('tipsRendered');
        });
    },
    renderAudience: function(){
        if(!this.tipsSelectAudience){
            this.tipsSelectAudience = new SelectAudienceParticipantsView({
                el: this.$el.find('.selectAudienceTableWrapper'),
                dataParams: {page:'communicationsTips'}
            });
        }
    },
    renderTipInfo: function(){
        var model = this.communicationsTipsEditModel,
            $tipTitle = this.$el.find('#tipTitle'),
            $tipStartDate = this.$el.find('#tipStartDate'),
            $tipEndDate = this.$el.find('#tipEndDate');

        //fill in values
        if(model){
            $tipTitle.val(model.get('tipTitle'));
            $tipStartDate.val(model.get('tipStartDate'));
            $tipEndDate.val(model.get('tipEndDate'));
        }
    },
    renderSpellcheck: function() {
        var $langs = this.$el.find('.commentTools .spellchecker .dropdown-menu');

        // append each language listed in the spellCheckerLocalesToUse array
        _.each(G5.props.spellCheckerLocalesToUse, function(v) {
            var l = G5.props.spellCheckerLocalization[v];
            if(l) {
                $langs.append('<li><a href="'+v+'">'+l.menu+'</a></li>');
            }
        });
    },
    displayTipsTable: function(){
        var $addedTips = this.$el.find('#tipsContentTable'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $submitBtn = this.$el.find('.tipSubmit'),
            $newContent = this.$el.find('.tipAddNewContent');

        if($addedTips.find('tbody').children().length<1){
            $addedTips.responsiveTable({destroy: true});

            $addedTips.hide();
            $addAnotherBtn.addClass('disabled');
            $submitBtn.attr('disabled', '');
            this.checkAvailableLangs();
            $newContent.show();
        } else {
            $addedTips.show();
            if( this.checkAvailableLangs() !== false ) {
                $addAnotherBtn.removeClass('disabled');
            }
            $submitBtn.removeAttr('disabled');
            $newContent.hide();

            this.disableDefault();
            $addedTips.responsiveTable();
        }
    },
    checkAvailableLangs: function(selectedLang) {
        var $chooseLang = this.$el.find('#chooseLanguage'),
            $langs = $chooseLang.find('option'),
            tips = this.communicationsTipsEditModel.get('tipsTable').tips,
            usedLangs = _.pluck(tips, 'language');

        if( !selectedLang && $langs.length <= usedLangs.length ) {
            return false;
        }

        $langs.each(function() {
            var $lang = $(this);

            if( _.indexOf(usedLangs, $lang.val()) >= 0 && $lang.val() != selectedLang ) {
                $lang.attr('disabled', 'disabled');
            }
            else {
                $lang.removeAttr('disabled');
            }
        });

        $chooseLang.val( selectedLang || $langs.not(':disabled').first().val() );
    },
    disableDefault: function(){
        var $addedTips = this.$el.find('#tipsContentTable'),
            $defaultCol = $addedTips.find('.defaultColumn input');

        if($defaultCol.hasClass('systemDefault')){
            _.each($defaultCol, function(){
                $defaultCol.attr('disabled', '');
            });
        }
    },
    addNewContent: function(e){
        var $addTipCont = this.$el.find('.tipAddNewContent'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a');

        e.preventDefault();

        if($addAnotherBtn.hasClass('disabled')){
            e.preventDefault();
            return false;
        }

        this.checkAvailableLangs();

        this.updateContribComment();
        $addTipCont.slideDown(G5.props.ANIMATION_DURATION);
        this.$el.find('.tipsAddedContent').addClass('isEditing');
        $addAnotherBtn.addClass('disabled');
    },
    updateContribComment: function() {
        var $inp = this.$el.find('.contribCommentInp'),
            maxChars = parseInt($inp.attr('maxlength'),10),
            $remChars = this.$el.find('.commentTools .remChars');

        // enforce maxlength (ie only)
        if($.browser.msie && $inp.val().length > maxChars) {
            $inp.val( $inp.val().slice(0,maxChars));
        }

        // remaining chars
        $remChars.text($.format.number(maxChars-$inp.val().length));
    },
    doContribCommentSpellCheck: function(e) {
        var $tar = $(e.currentTarget),
            lang = $tar.attr('href'),
            localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ lang ]),
            $comment = this.$el.find('.contribCommentInp'),
            $badWords;

        e.preventDefault();

        if( !this.$el.find('.contribCommentWrapper .badwordsContainer').length ) {
            this.$el.find(".contribCommentWrapper").append('<div class="badwordsContainer"><div class="badwordsWrapper"><div class="badwordsContent" /></div></div>');
        }
        $badWords = this.$el.find('.contribCommentWrapper .badwordsContent');

        $comment.spellchecker({
            url: G5.props.spellcheckerUrl,
            lang: lang,
            localization : localization,
            engine: "jazzy",
            suggestBoxPosition: "above",
            innerDocument: false,
            wordlist: {
                action: "html",
                element: $badWords
            }
        });

        $comment.spellchecker('check',{
            localization: lang,
            callback: function(result) {
                if(result===true) {
                    $badWords.find('.spellcheck-badwords').remove();
                    alert(localization.noMisspellings);
                }
                else {
                    $badWords.find('.spellcheck-badwords')
                        .prepend('<strong>'+localization.menu+':</strong>')
                        .append('<a class="close"><i class="icon-remove" /></a>');
                }
            }
        });

        // add a click handler for the badwords box close
        $badWords.on('click', '.close', function() {
            $badWords.find('.spellcheck-badwords').remove();
        });
    },
    attachPopover: function($trig, cont, $container){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'left center',
                at: 'right center',
                container: $container,
                viewport: $(window),
                adjust: {
                    method: 'shift none'
                }
            },
            show:{
                event:'click',
                ready:true
            },
            hide:{
                event:'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light participantPopoverQtip',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    },
    doSaveTip: function(e){
        var self = this,
            $tar = $(e.currentTarget),
            $addTipCont = this.$el.find('.tipAddNewContent'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $languageDisp = this.$el.find('#chooseLanguage option:selected').text(),
            $language = this.$el.find('#chooseLanguage option:selected').val(),
            $content = this.$el.find('.contribCommentInp').val(),
            tipId;

        e.preventDefault();

        if(!G5.util.formValidate($addTipCont.find('.validateme'))) {
            // invalid, was generic error, qtip visible (we use this below)
            return false;
        }

        $addTipCont.slideUp(G5.props.ANIMATION_DURATION, function(){
           var $tipTableId = self.$el.find('.tipsAddedContent .hasEdited').data('tipid'),
                $tipIndexId = self.$el.find('.tipsAddedContent .hasEdited').data('indexid'),
                data;

            if($tipTableId){
                tipId = $tipTableId.toString();
            }
            //Save data
            data = {
                id: null || tipId,
                index: null || $tipIndexId,
                languageDisplay: $languageDisp,
                language: $language,
                content: $content
            };

            if(self.$el.find('.tipsAddedContent tr').hasClass('hasEdited')){
                 self.$el.find('.tipsAddedContent tr').removeClass('hasEdited');
                self.communicationsTipsEditModel.updateTip(data);
            }else {
                self.communicationsTipsEditModel.addTip(data);
            }

            if(self.$el.find('.tipsAddedContent').hasClass('isEditing')){
                self.$el.find('.tipsAddedContent').removeClass('isEditing');
            }

            if( self.checkAvailableLangs() !== false ) {
                $addAnotherBtn.removeClass('disabled');
            }
            $tar.removeAttr('disabled');
            self.$el.find('.tipSubmit').removeAttr('disabled').removeClass('disabled');
        });

        this.resetForm();
    },
    doEditTip: function(e){
        var $tar = $(e.currentTarget),
            $row = $tar.parents('tr'),
            rowId = $row.data('tipid'),
            $addTipCont = this.$el.find('.tipAddNewContent'),
            $tipLanguage = $addTipCont.find('#chooseLanguage'),
            $tipContent = $addTipCont.find('.contribCommentInp'),
            $tipIdHidden = this.$el.find('#tipId'),
            $addTipBtn = this.$el.find('.addLanguageContent a');

        e.preventDefault();

        if( $row.closest('.tipsAddedContent').hasClass('isEditing') ) {
            return false;
        }
        $row.closest('.tipsAddedContent').addClass('isEditing');

        this.$el.find('.tipSubmit').attr('disabled','disabled').addClass('disabled');

        $row.addClass('isEditing hasEdited');

        $addTipCont.slideDown(G5.props.ANIMATION_DURATION);
        $addTipBtn.addClass('disabled');

        if($row.hasClass('isEditing')) {
            var $editing = this.$el.find('tr.isEditing'),
                $newContent = $editing.find('.contentColumn').text(),
                $newLanguageName = $editing.find('.languageColumn span').attr('data-language');

            $tipLanguage.val($newLanguageName);
            $tipContent.val($newContent);
            this.updateContribComment();
            $tipIdHidden.val(rowId);

            this.checkAvailableLangs($newLanguageName);

            $row.removeClass('isEditing');
        }
    },
    doUpdateTip: function(updatedData){
        var $tipTable = this.$el.find('.tipsAddedContent tbody'),
            $tipTableRow = $tipTable.find('tr'),
            self = this,
            tplName = 'CommunicationsResourceCenterEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/';

        _.each($tipTableRow, function(row){
            var newDataId = $(row).data('tipid').toString();

            if(newDataId === updatedData.id) {
                //Push values to template
                TemplateManager.get('tipsContentTable', function(tpl) {
                    $(row).replaceWith(tpl(updatedData));
                });
            }
        });
    },
    doSetDefault: function(e){
        var $tar = $(e.target).closest('input'),
            id = $tar.closest('tr').data('tipid'),
            tips = this.communicationsTipsEditModel.get('tipsTable').tips;

        _.each(tips, function(item, index) {
            if( id == item.id ) {
                tips[index].isDefaultLang = true;
            }
            else {
                tips[index].isDefaultLang = false;
            }
        });

        if( $tar.closest('.isEditing').length > 0 ) {
            return false;
        }
    },
    confirmCancelSave: function(e){
        var $tar = $(e.currentTarget),
            $cancelDialog = this.$el.find('.saveCancelConfirm');
        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cancelDialog, this.$el);
        }
    },
    doCancelSave: function(e) {
        e.preventDefault();

        var that = this;

        this.$el.find('.cancelContent').qtip('hide');
        this.$el.find('.tipAddNewContent').slideUp(G5.props.ANIMATION_DURATION, function() {
            that.$el.find('.addLanguageContent a').removeClass('disabled');
            if(that.$el.find('.tipsAddedContent').hasClass('isEditing')){
                that.$el.find('.tipsAddedContent').removeClass('isEditing');
            }
            that.$el.find('.tipSubmit').removeAttr('disabled').removeClass('disabled');
        });
        that.resetForm();
    },
    confirmCancelTip: function(e){
        var $tar = $(e.currentTarget),
            $cancelDialog = this.$el.find('.tipsCancelConfirm');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cancelDialog, this.$el);
        }
    },
    doCancelTip: function(e){
        var $btn = this.$el.find(".tipCancel");

        if($btn.data('url')) {
            e.preventDefault();
            window.location = $btn.data('url');
        }
    },
    confirmRemoveTip: function(e){
        var $tar = $(e.currentTarget),
            $popoverCont = this.$el.find('.tipRemoveConfirmDialog');

        if( $tar.closest('.tipsAddedContent').hasClass('isEditing') ) {
            return false;
        }
        if($tar.hasClass('disabled')){
            return false;
        }

        $tar.parents('tr').addClass('isHiding');

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $popoverCont.eq(0).clone(true), this.$el);
        }
    },
    doRemoveTip: function(e){
        var $tar = $(e.currentTarget),
            $row = this.$el.find('.tipsAddedContent tr'),
            id;

        $tar.closest('.qtip').qtip('hide');

        if($row.hasClass('isHiding')) {
            id = $('.isHiding').data('tipid').toString();
            $('.isHiding').hide().removeClass('isHiding');
        }

        this.communicationsTipsEditModel.removeTip(id);
        e.preventDefault();
    },
    resetForm: function(){
        var $textarea = this.$el.find('.tipAddNewContent textarea'),
            $lang = this.$el.find('#chooseLanguage'),
            $userDefaultLang = this.$el.find('#userDefaultLanguage').val();

        $textarea.val('');
        $lang.val($userDefaultLang);

        // removing validation errors
        this.$el.find('.tipAddNewContent .validateme').each(function() {
            G5.util.formValidateMarkField('valid', $(this));
        });
    },
    validateForm: function(){
        var $tipForm = this.$el.find('.tipsSection');

        if(!G5.util.formValidate($tipForm.find('.validateme'))) {
            var $valTips = $tipForm.find('.validate-tooltip:visible');
            // if val tips, then we have errors
            if($valTips.length) {

                $.scrollTo($valTips.get(0),{
                    duration:G5.props.ANIMATION_DURATION*2,
                    onAfter: function(){
                        $($valTips.get(0)).data('qtip').elements.tooltip
                            .animate({left:'+=20'},300).animate({left:'-=20'},300)
                            .animate({left:'+=10'},200).animate({left:'-=10'},200);
                    },
                    offset:{top:-20}
                });
                return false;
            }
        } else {
            return true;
        }
    },
    validateRadios: function(){
        var $defaultCol = this.$el.find('.defaultColumn'),
            $defaultRadio = $defaultCol.find('input[type=radio]:checked'),
            cont = $defaultCol.find('.validateme').data('validateFailMsgs');


            if($defaultRadio.size() > 0){
                _.each($defaultCol, function(){
                     $defaultCol.find('.control-group').removeClass('validateme error');
                });

                return true;
            } else {
                this.$el.find('.defaultHeader').qtip({
                    content:{text: cont},
                    position:{
                        my: 'bottom center',
                        at: 'top center',
                        container: this.$el.find('.tipsAddedContent'),
                        viewport: this.$el || $(window),
                        adjust: {
                            method: 'shift none'
                        }
                    },
                    show:{
                        ready:true
                    },
                    hide:{
                        event: false,
                        fixed: true
                    },
                    style:{
                        classes:'ui-tooltip-shadow ui-tooltip-red validate-tooltip',
                        tip: {
                            corner: true,
                            width: 20,
                            height: 10
                        }
                    }
                });

                $defaultCol.find('.validateme').addClass('error');

                return false;
            }
    },
    submitForm: function(e){
        var data = this.$el.find('form').serializeArray();

        e.preventDefault();

        if(this.validateForm() && this.validateRadios()){
            this.$el.find('.tipAddNewContent').remove();
            this.$el.find('.sendForm').submit();
        }
    },
    checkForServerErrors: function() {
        if ($("#serverReturnedErrored").val() === "true"){
            $("#communicationsErrorBlock").slideDown('fast'); //show error block
        }
    }
});