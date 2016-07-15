/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
$,
_,
G5,
TemplateManager,
PageView,
SelectAudienceParticipantsView,
CommunicationsResourceCenterEditModel,
CommunicationsResourceCenterEditView:true
*/
CommunicationsResourceCenterEditView = PageView.extend({

    initialize: function(opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'communications';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create model
        this.communicationsResourceEditModel = new CommunicationsResourceCenterEditModel({});

        this.communicationsResourceEditModel.loadData();

        this.$el.find('.datepickerTrigger').datepicker();

        this.checkForServerErrors();

        //If model did not have data, it feches data from server, page then renders on 'loadStandingsDataFinished'
        this.communicationsResourceEditModel.on('loadDataFinished', function() {
            self.render();
            self.renderResourceInfo();
        });

        this.on('resourcesRendered', function(){
            self.renderAudience();
            self.displayResourceTable();
        });

        this.on('docUploaded', function(){
            self.updateDocAttachment();
        });

        this.communicationsResourceEditModel.on('resourceRemoved', function(resources){
            self.render(resources);
        });

        this.communicationsResourceEditModel.on('resourceAdded', function(isAdded, newData){
            self.render(isAdded, newData);
        });

        this.communicationsResourceEditModel.on('resourceUpdated', function(resource){
            self.doUpdateResource(resource);
        });

    },
    events: {
        'click .addLanguageContent a': 'addNewContent',
        'click .addDocResource': 'doAttachDoc',
        'click .addUrlResource': 'addUrlResource',
        'keyup #resourceContentURL': 'validateUrl',
        'change #resourceContentDoc': 'validateDoc',
        'click .attachUrlResource': 'doAttachUrl',
        'click .removeLink': 'doUnattachUrlDoc',
        'click .saveContent': 'doSaveResource',
        'click .cancelContent': 'confirmCancelSave',
        'click .editColumn a': 'doEditResource',
        'click .defaultColumn input': 'doSetDefault',
        'click .remParticipantControl': 'confirmRemoveResource',
        'click .resourceContentSubmit': 'submitForm',
        'click .resourceContentCancel': 'confirmCancelResource',
        'click #saveCancelDialogConfirm': 'doCancelSave',
        'click #resourceCenterCancelDialogConfirm': 'doCancelResource',
        'click #resourceRemoveDialogConfirm': "doRemoveResource",
        'click #saveCancelDialogCancel, #resourceRemoveDialogCancel, #resourceCenterCancelDialogCancel':function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },
    render: function(newData, isAdded) {
        var $resourceCont = this.$el.find('#resourceCenterContentTable tbody'),
            self = this,
            tplName = 'CommunicationsResourceCenterEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/',
            resources = this.communicationsResourceEditModel.get('resourceTable').resources;

        G5.util.hideSpin(this.$el);

        //Push values to template
        TemplateManager.get('resourceCenterContentTable', function(tpl) {
            if(isAdded){
                // check to see if this is the first one and mark it the default
                if( resources.length == 1 ) {
                    newData.isDefaultLang = true;
                }

                $resourceCont.append(tpl(newData));
            }else {
                $resourceCont.html('');
                _.each(resources, function(resource){
                    $resourceCont.append(tpl(resource));
                });
            }
            self.trigger('resourcesRendered');
        });
    },
    renderAudience: function(){
        if(!this.resourceCenterSelectAudience) {
            this.resourceCenterSelectAudience = new SelectAudienceParticipantsView({
                el: this.$el.find('.selectAudienceTableWrapper'),
                dataParams: {page:'communicationsResourceCenter'}
            });
        }
    },
    renderResourceInfo: function(){
        var model = this.communicationsResourceEditModel,
            $resourceTitle = this.$el.find('#resourceTitle'),
            $resourceStartDate = this.$el.find('#resourceStartDate'),
            $resourceEndDate = this.$el.find('#resourceEndDate');

        //fill in values
        if(model){
            $resourceTitle.val(model.get('resourceTitle'));
            $resourceStartDate.val(model.get('resourceStartDate'));
            $resourceEndDate.val(model.get('resourceEndDate'));
        }
    },
    displayResourceTable: function(){
        var $addedResources = this.$el.find('#resourceCenterContentTable'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $submitBtn = this.$el.find('.resourceContentSubmit'),
            $newContent = this.$el.find('.resourceCenterAddNewContent');

        if($addedResources.find('tbody').children().length<1){
            $addedResources.responsiveTable({destroy: true});

            $addedResources.hide();
            $addAnotherBtn.addClass('disabled');
            $submitBtn.attr('disabled', '');
            this.checkAvailableLangs();
            $newContent.show();
        } else {
            $addedResources.show();
            if( this.checkAvailableLangs() !== false ) {
                $addAnotherBtn.removeClass('disabled');
            }
            $submitBtn.removeAttr('disabled');
            $newContent.hide();

            this.disableDefault();
            $addedResources.responsiveTable();
        }
    },
    checkAvailableLangs: function(selectedLang) {
        var $chooseLang = this.$el.find('#chooseLanguage'),
            $langs = $chooseLang.find('option'),
            resources = this.communicationsResourceEditModel.get('resourceTable').resources,
            usedLangs = _.pluck(resources, 'language');

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
        var $addedBanners = this.$el.find('#resourceCenterContentTable'),
            $defaultCol = $addedBanners.find('.defaultColumn input');

        if($defaultCol.hasClass('systemDefault')){
            _.each($defaultCol, function(){
                $defaultCol.attr('disabled', '');
            });
        }
    },
    addNewContent: function(e){
        var $addResourceCont = this.$el.find('.resourceCenterAddNewContent'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a');

        e.preventDefault();

        if($addAnotherBtn.hasClass('disabled')){
            e.preventDefault();
            return false;
        }

        this.checkAvailableLangs();

        $addResourceCont.slideDown(G5.props.ANIMATION_DURATION);
        this.$el.find('.resourceCenterAddedContent').addClass('isEditing');
        $addAnotherBtn.addClass('disabled');
    },
    addDocumentResource: function(e){
        var $tar = $(e.currentTarget),
            $popoverCont = this.$el.find('.addDocResourcePopover'),
            $attachBtn = this.$el.find('.attachDocResource'),
            $form = this.$el.find('.sendForm');

        e.preventDefault();

        $attachBtn.attr('disabled','');

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $popoverCont, $form);
        }
    },
    addUrlResource: function(e){
        var $tar = $(e.currentTarget),
            $popoverCont = this.$el.find('.addUrlResourcePopover'),
            $attachBtn = this.$el.find('.attachUrlResource'),
            $form = this.$el.find('.sendForm');

        e.preventDefault();

        $attachBtn.attr('disabled','');

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $popoverCont, $form);
        }
        this.validateUrl();
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
    doAttachUrl: function(e){
        var $tar = $(e.currentTarget),
            $inp = $tar.parents().find('#resourceContentURL'),
            $attachCont = this.$el.find('.resourceDisplayAttached .resourceDisplayLink'),
            $hiddenInp = this.$el.find('#resourceCenterLink'),
            $removeLink = this.$el.find('.removeLink');

        $attachCont.html($inp.val()).attr('title', $inp.val());
        $hiddenInp.val($inp.val());
        $removeLink.show();

        $tar.closest('.qtip').qtip('hide');

        $inp.val('');
    },
    doAttachDoc: function(e){
        var self = this,
            $form = this.$el.find('#resourceDocUpload'),
            $tar = $(e.currentTarget),
            $inp = $tar.parents().find('#resourceContentDoc'),
            $container = this.$el.find('.resourceDisplayAttached');

        e.preventDefault();

        if(!$tar.data('qtip')){
            this.attachPopover($tar, this.$el.find('.addDocResourcePopover'), this.$el);

            $form.fileupload({
                url: G5.props.URL_JSON_COMMUNICATION_UPLOAD_DOCUMENT,
                dataType: 'g5json',
                beforeSend: function(){
                    $tar.qtip('hide');
                    G5.util.showSpin($container);
                    self.$el.find('.saveContent').attr('disabled','disabled').addClass('disabled');
                },
                done: function(e, data) {
                    var msg = data.result.data.messages[0];

                    if(msg.isSuccess){
                        // set the document data on the model
                        self.communicationsResourceEditModel.set('resourceDoc', msg.docURL);

                        $inp.val('');
                        self.trigger('docUploaded');
                    }
                    else {
                        alert(msg.text);
                    }

                    G5.util.hideSpin($container);
                    self.$el.find('.saveContent').removeAttr('disabled').removeClass('disabled');
                }
            });
        }
    },
    updateDocAttachment: function(){
        var $attachCont = this.$el.find('.resourceDisplayAttached'),
            $attach = $attachCont.find('.resourceDisplayLink'),
            $hiddenInp = this.$el.find('#resourceCenterLink'),
            $removeLink = $attachCont.find('.removeLink'),
            docUrl = this.communicationsResourceEditModel.get('resourceDoc');

        G5.util.hideSpin($attachCont);
        $attach.html(docUrl);
        $hiddenInp.val(docUrl);
        $removeLink.show();
    },
    doUnattachUrlDoc: function() {
        var $attachCont = this.$el.find('.resourceDisplayAttached'),
            $attach = $attachCont.find('.resourceDisplayLink'),
            $hiddenInp = $attachCont.find('#resourceCenterLink'),
            $removeLink = $attachCont.find('.removeLink');

        $attach.html('');
        $hiddenInp.val('');
        $removeLink.hide();
    },
    doSaveResource: function(e){
        var self = this,
            $tar = $(e.currentTarget),
            $addResourceCont = this.$el.find('.resourceCenterAddNewContent'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $languageDisp = this.$el.find('#chooseLanguage option:selected').text(),
            $language = this.$el.find('#chooseLanguage option:selected').val(),
            $title = this.$el.find('#resourceContentLinkTitle').val(),
            $link = this.$el.find('.resourceDisplayAttached span').html(),
            resourceId;

        e.preventDefault();

        if(!G5.util.formValidate($addResourceCont.find('.validateme'))) {
            // invalid, was generic error, qtip visible (we use this below)
            return false;
        }

        $addResourceCont.slideUp(G5.props.ANIMATION_DURATION, function(){
            var $resourceTableId = self.$el.find('.resourceCenterAddedContent .hasEdited').data('resourceid'),
                $resourceIndexId = self.$el.find('.resourceCenterAddedContent .hasEdited').data('indexid'),
                data;

            if($resourceTableId){
                resourceId = $resourceTableId.toString();
            }

            //Save data
            data = {
                id: null || resourceId,
                index: null || $resourceIndexId,
                languageDisplay: $languageDisp,
                language: $language,
                title: $title,
                link: $link
            };

            if(self.$el.find('.resourceCenterAddedContent tr').hasClass('hasEdited')){
                self.$el.find('.resourceCenterAddedContent tr').removeClass('hasEdited');
                self.communicationsResourceEditModel.updateResource(data);
            }else {
                self.communicationsResourceEditModel.addResource(data);
            }

            if(self.$el.find('.resourceCenterAddedContent').hasClass('isEditing')){
                self.$el.find('.resourceCenterAddedContent').removeClass('isEditing');
            }

            if( self.checkAvailableLangs() !== false ) {
                $addAnotherBtn.removeClass('disabled');
            }
            $tar.removeAttr('disabled');
            self.$el.find('.resourceContentSubmit').removeAttr('disabled').removeClass('disabled');
        });

        this.resetForm();
    },
    doEditResource: function(e){
        var $tar = $(e.currentTarget),
            $row = $tar.parents('tr'),
            rowId = $row.data('resourceid'),
            $addResourceCont = this.$el.find('.resourceCenterAddNewContent'),
            $resourceLanguage = $addResourceCont.find('#chooseLanguage'),
            $resourceTitle = $addResourceCont.find('#resourceContentLinkTitle'),
            $resourceLink = $addResourceCont.find('.resourceDisplayAttached span'),
            $resourceLinkHidden = this.$el.find('#resourceCenterLink'),
            $removeLink = $addResourceCont.find('.removeLink'),
            $resourceIdHidden = this.$el.find('#resourceContentId'),
            $resourceBtn = this.$el.find('.addLanguageContent a');

        e.preventDefault();

        if( $row.closest('.resourceCenterAddedContent').hasClass('isEditing') ) {
            return false;
        }
        $row.closest('.resourceCenterAddedContent').addClass('isEditing');

        this.$el.find('.resourceContentSubmit').attr('disabled','disabled').addClass('disabled');

        $row.addClass('isEditing hasEdited');

        $addResourceCont.slideDown(G5.props.ANIMATION_DURATION);
        $resourceBtn.addClass('disabled');

        if($row.hasClass('isEditing')) {
            var $editing = this.$el.find('tr.isEditing'),
                $newTitle = $editing.find('.titleColumn').text(),
                $newLink = $editing.find('.linkColumn').text(),
                $newLanguageName = $editing.find('.languageColumn span').attr('data-language');

            $resourceLanguage.val($newLanguageName);
            $resourceTitle.val($newTitle);
            $resourceLink.html($newLink);
            $resourceLinkHidden.val($newLink);
            $removeLink[$resourceLinkHidden.val()?'show':'hide']();
            $resourceIdHidden.val(rowId);

            this.checkAvailableLangs($newLanguageName);

            $row.removeClass('isEditing');
        }
    },
    doUpdateResource: function(updatedData){
        var $resTable = this.$el.find('.resourceCenterAddedContent tbody'),
            $resTableRow = $resTable.find('tr'),
            self = this,
            tplName = 'CommunicationsResourceCenterEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/';

        _.each($resTableRow, function(row){
            var newDataId = $(row).data('resourceid').toString();

            if(newDataId === updatedData.id) {
                //Push values to template
                TemplateManager.get('resourceCenterContentTable', function(tpl) {
                    $(row).replaceWith(tpl(updatedData));
                });
            }
        });
    },
    doSetDefault: function(e){
        var $tar = $(e.target).closest('input'),
            id = $tar.closest('tr').data('resourceid'),
            resources = this.communicationsResourceEditModel.get('resourceTable').resources;

        _.each(resources, function(item, index) {
            if( id == item.id ) {
                resources[index].isDefaultLang = true;
            }
            else {
                resources[index].isDefaultLang = false;
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
        this.$el.find('.resourceCenterAddNewContent').slideUp(G5.props.ANIMATION_DURATION, function() {
            that.$el.find('.addLanguageContent a').removeClass('disabled');
            if(that.$el.find('.resourceCenterAddedContent').hasClass('isEditing')){
                that.$el.find('.resourceCenterAddedContent').removeClass('isEditing');
            }
            that.$el.find('.resourceContentSubmit').removeAttr('disabled').removeClass('disabled');
        });
        that.resetForm();
    },
    confirmCancelResource: function(e){
        var $tar = $(e.currentTarget),
            $cancelDialog = this.$el.find('.resourceCenterCancelConfirm');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cancelDialog, this.$el);
        }
    },
    doCancelResource: function(e){
        var $btn = this.$el.find(".resourceContentCancel");

        if($btn.data('url')) {
            e.preventDefault();
            window.location = $btn.data('url');
        }
    },
    confirmRemoveResource: function(e){
        var $tar = $(e.currentTarget),
            $popoverCont = this.$el.find('.resourceRemoveConfirmDialog');

        if( $tar.closest('.resourceCenterAddedContent').hasClass('isEditing') ) {
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
    doRemoveResource: function(e){
        var $tar = $(e.currentTarget),
            $row = this.$el.find('.resourceCenterAddedContent tr'),
            id;

        $tar.closest('.qtip').qtip('hide');

        if($row.hasClass('isHiding')) {
            id = $('.isHiding').data('resourceid').toString();
            $('.isHiding').hide().removeClass('isHiding');
        }

        this.communicationsResourceEditModel.removeResource(id);
        e.preventDefault();
    },
    resetForm: function(){
        var $inp = this.$el.find('.resourceCenterAddNewContent input[type="text"]'),
            $link = this.$el.find('.resourceDisplayAttached span'),
            $lang = this.$el.find('#chooseLanguage'),
            $userDefaultLang = this.$el.find('#userDefaultLanguage').val(),
            $removeLink = this.$el.find('.removeLink');

        $inp.val('');
        $link.html('');
        $lang.val($userDefaultLang);
        $removeLink.hide();

        // removing validation errors
        this.$el.find('.resourceCenterAddNewContent .validateme').each(function() {
            G5.util.formValidateMarkField('valid', $(this));
        });
    },
    validateForm: function(){
        var $resourceForm = this.$el.find('.resourceCenterInfo');

        if(!G5.util.formValidate($resourceForm.find('.validateme'))) {
            var $valTips = $resourceForm.find('.validate-tooltip:visible');
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
                        container: this.$el.find('.resourceCenterAddedContent'),
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
            this.$el.find('.resourceCenterAddNewContent').remove();
            this.$el.find('.sendForm').submit();
        }
    },
    validateUrl: function(){
        var $inp = this.$el.find('#resourceContentURL'),
            $attachBtn = this.$el.find('.attachUrlResource'),
            urlRe = /^(https?:\/\/)?[\da-z\.-]+\.[a-z\.]{2,6}.*$/;

        $attachBtn[urlRe.test($inp.val())?'removeAttr':'attr']('disabled','disabled');
    },
    validateDoc: function(){
        var $attachBtn = this.$el.find('.attachDocResource');

        $attachBtn.removeAttr('disabled');
    },
    checkForServerErrors: function() {
        if ($("#serverReturnedErrored").val() === "true"){
            $("#communicationsErrorBlock").slideDown('fast'); //show error block
        }
    }
});