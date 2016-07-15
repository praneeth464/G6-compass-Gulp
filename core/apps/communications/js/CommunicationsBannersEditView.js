/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
_,
$,
G5,
TemplateManager,
PageView,
SelectAudienceParticipantsView,
CommunicationsImageUploadView,
CommunicationsBannersEditModel,
CommunicationsBannersEditView:true
*/
CommunicationsBannersEditView = PageView.extend({

    initialize: function(opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'communications';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        // image upload view
        this.imageUploadView = new CommunicationsImageUploadView({
            el: "#uploadImageModal",
            type: "banner",
            formData: {
                sizes: ['2x1','2x2','4x2','4x4']
            }
        });
        this.imageUploadView.on('saveImages', this.doSaveImages, this);

        //create model
        this.communicationsBannersEditModel = new CommunicationsBannersEditModel({});

        this.communicationsBannersEditModel.loadData();

        this.$el.find('.datepickerTrigger').datepicker();
        this.checkForServerErrors();

        //If model did not have data, it feches data from server, page then renders on 'loadStandingsDataFinished'
        this.communicationsBannersEditModel.on('loadDataFinished', function() {
            self.render();
            self.renderBannerInfo();
        });

        this.on('bannersRendered', function(){
            self.renderAudience();
            self.displayBannerTable();
            self.renderChooseImages();
        });

        this.on('bannerImagesRendered', function(){
            self.cardCycleInit();
        });

        this.on('docUploaded', function(){
            self.updateDocAttachment();
        });

        this.communicationsBannersEditModel.on('bannerAdded', function(newData, isAdded){
            self.render(newData, isAdded);
        });

        this.communicationsBannersEditModel.on('bannerRemoved', function(banners){
            self.render(banners);
        });

        this.communicationsBannersEditModel.on('imageAdded', function(newData){
            self.updateImageDisplay(newData);
        });

        this.communicationsBannersEditModel.on('bannerUpdated', function(banner){
            self.doUpdateBanner(banner);
        });
    },
    events: {
        //adding
        'click .addLanguageContent a': 'addNewContent',
        'click .addUrlBanner': 'addUrlBanner',
        'click .attachUrlBanner': 'doAttachUrl',
        'click .addDocBanner': 'doAttachDoc',
        //removing
        'click .removeLink': 'doUnattachUrlDoc',
        'click .remParticipantControl': 'confirmRemoveBanner',
        'click #bannerRemoveDialogConfirm': "doRemoveBanner",
        //edit
        'click .editColumn a': 'doEditBanner',
        'click .defaultColumn input': 'doSetDefault',
        //images
        'click #thumbnailSelect li': 'chooseImage',
        //save & validate
        'keyup #bannerURL': 'validateUrl',
        'change #bannerDoc': 'validateDoc',
        'click .saveContent': 'doSaveBanner',
        'click .cancelContent': 'confirmCancelSave',
        'click .bannerSubmit': 'submitForm',
        'click .bannerCancel': 'confirmCancelBanner',
        'click #saveCancelDialogConfirm': 'doCancelSave',
        'click #bannerCancelDialogConfirm': 'doCancelBanner',
        "click #saveCancelDialogCancel, #bannerCancelDialogCancel, #bannerRemoveDialogCancel":function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        },
        'click #thumbnailPager a': 'cardCyclePager'
    },
    render: function(newData, isAdded) {
        var $bannerCont = this.$el.find('#bannersTable tbody'),
            self = this,
            tplName = 'CommunicationsBannerEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/',
            banners = this.communicationsBannersEditModel.get('bannerTable').banners;

        G5.util.hideSpin( this.$el );

        //Push values to template
        TemplateManager.get('bannersTable', function(tpl) {
            if(isAdded){
                // check to see if this is the first one and mark it the default
                if( banners.length == 1 ) {
                    newData.isDefaultLang = true;
                }

                $bannerCont.append(tpl(newData));
            }else {
                $bannerCont.html('');
                _.each(banners, function(banner){
                    $bannerCont.append(tpl(banner));

                });
            }
            self.trigger('bannersRendered');
        });
    },
    renderAudience: function(){
        if(!this.bannersSelectAudience){
            this.bannersSelectAudience = new SelectAudienceParticipantsView({
                el: this.$el.find('.selectAudienceTableWrapper'),
                dataParams: {page:'communicationsBanners'}
            });
        }
    },
    renderBannerInfo: function(){
        var model = this.communicationsBannersEditModel,
            $bannerTitle = this.$el.find('#bannerTitle'),
            $bannerStartDate = this.$el.find('#bannerStartDate'),
            $bannerEndDate = this.$el.find('#bannerEndDate');

        //fill in values
        if(model){
            $bannerTitle.val(model.get('bannerTitle'));
            $bannerStartDate.val(model.get('bannerStartDate'));
            $bannerEndDate.val(model.get('bannerEndDate'));
        }
    },
    displayBannerTable: function(){
        var $addedBanners = this.$el.find('#bannersTable'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $submitBtn = this.$el.find('.bannerSubmit'),
            $newContent = this.$el.find('.bannerAddNewContent');

        if($addedBanners.find('tbody').children().length<1){
            $addedBanners.responsiveTable({destroy: true});

            $addedBanners.hide();
            $addAnotherBtn.addClass('disabled');
            $submitBtn.attr('disabled', '');
            this.checkAvailableLangs();
            $newContent.show();
        } else {
            $addedBanners.show();
            if( this.checkAvailableLangs() !== false ) {
                $addAnotherBtn.removeClass('disabled');
            }
            $submitBtn.removeAttr('disabled');
            $newContent.hide();

            this.disableDefault();
            $addedBanners.responsiveTable();
        }
    },
    checkAvailableLangs: function(selectedLang) {
        var $chooseLang = this.$el.find('#chooseLanguage'),
            $langs = $chooseLang.find('option'),
            banners = this.communicationsBannersEditModel.get('bannerTable').banners,
            usedLangs = _.pluck(banners, 'language');

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
        var $addedBanners = this.$el.find('#bannersTable'),
            $defaultCol = $addedBanners.find('.defaultColumn input');

        if($defaultCol.hasClass('systemDefault')){
            _.each($defaultCol, function(){
                $defaultCol.attr('disabled', '');
            });
        }
    },
    renderChooseImages: function(){
        var $bannerImages = this.$el.find('.chooseImagesSection'),
            tplName = 'CommunicationsBannerEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/',
            self = this;

        $bannerImages.empty();

        TemplateManager.get('chooseImages', function(tpl, vars, subTpls){
            self.subTpls = subTpls;
            $bannerImages.append(tpl(self.communicationsBannersEditModel.toJSON()));
            self.trigger('bannerImagesRendered');
        }, this.tplPath);
    },
    chooseImage: function(e){
        var $tar = $(e.currentTarget),
            $li = this.$el.find('#thumbnailSelect li'),
            id = $tar.data('id'),
            modelImgs = this.communicationsBannersEditModel.get('bannerImages').images,
            $imageCont = this.$el.find('.imageLargeWrapper'),
            $selectedImage = this.$el.find('.selectedImageInput'),
            selectedImage = _.where(modelImgs, {id: id}),
            preloadedImages;

        if( selectedImage.length ) {
            preloadedImages = {
                images: [
                    {
                        imageUrl : selectedImage[0].imageSize4x4,
                        size : "4x4"
                    },
                    {
                        imageUrl : selectedImage[0].imageSize4x2,
                        size : "4x2"
                    },
                    {
                        imageUrl : selectedImage[0].imageSize2x2,
                        size : "2x2"
                    },
                    {
                        imageUrl : selectedImage[0].imageSize2x1,
                        size : "2x1"
                    }
                ]
            };
        }
        /*
         *  NOTE: uncomment this section only if we want to copy images from the first item when clicking upload the first time
         *  NOTE: this would probably be best done in the addNewContent method as part of a bigger data copy
         *
        else if(this.communicationsBannersEditModel.get('bannerTable').banners.length) {
            preloadedImages = {
                images: [
                    {
                        imageUrl : this.communicationsBannersEditModel.get('bannerTable').banners[0].imageSize4x4,
                        size : "4x4"
                    },
                    {
                        imageUrl : this.communicationsBannersEditModel.get('bannerTable').banners[0].imageSize4x2,
                        size : "4x2"
                    },
                    {
                        imageUrl : this.communicationsBannersEditModel.get('bannerTable').banners[0].imageSize2x2,
                        size : "2x2"
                    },
                    {
                        imageUrl : this.communicationsBannersEditModel.get('bannerTable').banners[0].imageSize2x1,
                        size : "2x1"
                    }
                ]
            };
        }
         *
         */

        if( $tar.hasClass('uploadContainer') ) {
            this.imageUploadView.showModal(preloadedImages);
            return;
        }

        $imageCont.find('img').remove();
        $li.removeClass('selected');
        $tar.addClass('selected');

        $selectedImage.attr('checked', 'checked').val('on');

        if( selectedImage.length ) {
            $imageCont.html('<img src="'+selectedImage[0].imageSize4x4+'"/>');
        }
    },
    addNewContent: function(e){
        var that = this,
            $addBanner = this.$el.find('.bannerAddNewContent'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a');

        e.preventDefault();

        if($addAnotherBtn.hasClass('disabled')){
            e.preventDefault();
            return false;
        }

        this.checkAvailableLangs();

        $addBanner.slideDown(G5.props.ANIMATION_DURATION);
        this.$el.find('.bannerAddedContent').addClass('isEditing');
        $addAnotherBtn.addClass('disabled');
    },
    addDocumentBanner: function(e){
        var $tar = $(e.currentTarget),
            $popoverCont = this.$el.find('.addDocBannerPopover'),
            $attachBtn = this.$el.find('.attachDocBanner'),
            $form = this.$el.find('.sendForm');

        e.preventDefault();

        $attachBtn.attr('disabled','');

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $popoverCont, this.$el);
        }
    },
    addUrlBanner: function(e){
        var $tar = $(e.currentTarget),
            $popoverCont = this.$el.find('.addUrlBannerPopover'),
            $attachBtn = this.$el.find('.attachUrlBanner'),
            $form = this.$el.find('.sendForm');

        e.preventDefault();

        $attachBtn.attr('disabled','');

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $popoverCont, this.$el);
        }

        this.validateUrl();
    },
    attachPopover: function($trig, cont, $container, $viewport){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'left center',
                at: 'right center',
                container: $container,
                viewport: $viewport || $(window),
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
            $inp = $tar.parents().find('#bannerURL'),
            $attachCont = this.$el.find('.bannerDisplayAttached span'),
            $hiddenInp = this.$el.find('#bannerLink'),
            $removeLink = this.$el.find('.removeLink'),
            $docForm = this.$el.find('#bannerDocUpload');

        $attachCont.html($inp.val()).attr('title', $inp.val());
        $hiddenInp.val($inp.val());
        $removeLink.show();

        $tar.closest('.qtip').qtip('hide');
        $inp.val('');
        $docForm[0].reset();
    },
    doAttachDoc: function(e){
        var self = this,
            $form = this.$el.find('#bannerDocUpload'),
            $tar = $(e.currentTarget),
            $inp = $tar.parents().find('#bannerContentDoc'),
            $container = this.$el.find('.bannerDisplayAttached');

        e.preventDefault();

        if(!$tar.data('qtip')){
            this.attachPopover($tar, this.$el.find('.addDocBannerPopover'), this.$el);

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
                        self.communicationsBannersEditModel.set('bannerDoc', msg.docURL);

                        $inp.val('');
                        self.trigger('docUploaded');
                    } else {
                        alert(msg.text);
                    }

                    G5.util.hideSpin($container);
                    self.$el.find('.saveContent').removeAttr('disabled').removeClass('disabled');
                }
            });
        }
    },
    updateDocAttachment: function(){
        var $attachCont = this.$el.find('.bannerDisplayAttached'),
            $attach = $attachCont.find('.bannerDisplayLink'),
            $hiddenInp = this.$el.find('#bannerLink'),
            $removeLink = $attachCont.find('.removeLink'),
            docUrl = this.communicationsBannersEditModel.get('bannerDoc'),
            $urlInp = this.$el.find('#bannerURL');

        G5.util.hideSpin($attachCont);
        $attach.html(docUrl);
        $hiddenInp.val(docUrl);
        $removeLink.show();
        $urlInp.val('');
    },
    doUnattachUrlDoc: function() {
        var $attachCont = this.$el.find('.bannerDisplayAttached'),
            $attach = $attachCont.find('.bannerDisplayLink'),
            $hiddenInp = $attachCont.find('#bannerLink'),
            $removeLink = $attachCont.find('.removeLink');

        $attach.html('');
        $hiddenInp.val('');
        $removeLink.hide();
    },
    doSaveImages: function(images) {
        var imageData = {
            id: null,
            isUploaded: true,
            imageSize2x1: _.where(images, {size: '2x1'})[0].imageUrl,
            imageSize2x2: _.where(images, {size: '2x2'})[0].imageUrl,
            imageSize4x2: _.where(images, {size: '4x2'})[0].imageUrl,
            imageSize4x4: _.where(images, {size: '4x4'})[0].imageUrl
        };

        this.communicationsBannersEditModel.addImage(imageData);
    },
    updateImageDisplay: function(newData){
        var $uploadContainer = this.$el.find('.uploadContainer'),
            $largeImage = this.$el.find('.imageLargeWrapper'),
            $selectedImage = this.$el.find('.selectedImageInput'),
            imageId = newData.id;

        $uploadContainer.attr('data-id', imageId);
        $largeImage.html('<img src="'+newData.imageSize4x4+'" />');
        if( imageId.match('addedImage') ) {
            this.$el.find('#thumbnailSelect li').filter('.uploadContainer')
                .data('id', imageId)
                .addClass('selected')
                .siblings().removeClass('selected')
                .end().find('img').show().attr('src', newData.imageSize2x2);

            $selectedImage.attr('checked', 'checked').val('on');
        }
    },
    doSaveBanner: function(e){
        var self = this,
            $tar = $(e.currentTarget),
            $addBanner = this.$el.find('.bannerAddNewContent'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $languageDisp = this.$el.find('#chooseLanguage option:selected').text(),
            $language = this.$el.find('#chooseLanguage option:selected').val(),
            $link = this.$el.find('.bannerDisplayAttached span').html(),
            modelImages = this.communicationsBannersEditModel.get('bannerImages').images,
            $imageId = this.$el.find('#thumbnailContainer .selected').data('id'),
            modelImageId,
            bannerId,
            modelImg2x1,
            modelImg2x2,
            modelImg4x2,
            modelImg4x4;

        e.preventDefault();

        if(!G5.util.formValidate($addBanner.find('.validateme'))) {
            // invalid, was generic error, qtip visible (we use this below)
            return false;
        }

        _.each(modelImages, function(image){
            if($imageId === image.id){
                modelImg2x1 = image.imageSize2x1;
                modelImg2x2 = image.imageSize2x2;
                modelImg4x2 = image.imageSize4x2;
                modelImg4x4 = image.imageSize4x4;

                modelImageId = image.id;
            }
        });

        $addBanner.slideUp(G5.props.ANIMATION_DURATION, function(){
            var $bannerTableId = self.$el.find('.bannerAddedContent .hasEdited').data('bannerid'),
                $bannerIndexId = self.$el.find('.bannerAddedContent .hasEdited').data('indexid'),
                data;

            if($bannerTableId){
                bannerId = $bannerTableId.toString();
            }

            //Save data
            data = {
                id: null || bannerId,
                index: null || $bannerIndexId,
                languageDisplay: $languageDisp,
                language: $language,
                imageId: null || modelImageId,
                imageSize2x1: modelImg2x1,
                imageSize2x2: modelImg2x2,
                imageSize4x2: modelImg4x2,
                imageSize4x4: modelImg4x4,
                link: $link
            };

            if(self.$el.find('.bannerAddedContent tr').hasClass('hasEdited')){
                self.$el.find('.bannerAddedContent tr').removeClass('hasEdited');
                self.communicationsBannersEditModel.updateBanner(data);
            }else {
                self.communicationsBannersEditModel.addBanner(data);
            }

            if(self.$el.find('.bannerAddedContent').hasClass('isEditing')){
                self.$el.find('.bannerAddedContent').removeClass('isEditing');
            }

            if( self.checkAvailableLangs() !== false ) {
                $addAnotherBtn.removeClass('disabled');
            }
            $tar.removeAttr('disabled');
            self.$el.find('.bannerSubmit').removeAttr('disabled').removeClass('disabled');
        });

        this.resetForm();
    },
    doEditBanner: function(e){
        var $tar = $(e.currentTarget),
            $row = $tar.parents('tr'),
            rowId = $row.data('bannerid'),
            $addBanner = this.$el.find('.bannerAddNewContent'),
            $bannerLanguage = $addBanner.find('#chooseLanguage'),
            $bannerLink = $addBanner.find('.bannerDisplayAttached span'),
            $bannerLinkHidden = this.$el.find('#bannerLink'),
            $removeLink = $addBanner.find('.removeLink'),
            $bannerIdHidden = this.$el.find('#bannerId'),
            $bannerBtn = this.$el.find('.addLanguageContent a'),
            $bannerThumb = this.$el.find('#thumbnailSelect li'),
            $selectedImage = this.$el.find('.selectedImageInput');

        e.preventDefault();

        if( $row.closest('.bannerAddedContent').hasClass('isEditing') ) {
            return false;
        }
        $row.closest('.bannerAddedContent').addClass('isEditing');

        this.$el.find('.bannerSubmit').attr('disabled','disabled').addClass('disabled');

        $row.addClass('isEditing hasEdited');

        $addBanner.slideDown(G5.props.ANIMATION_DURATION, function() {
            // trigger the resize event on the window so the carousel inside the image picker calibrates itself properly
            $(window).resize();
        });
        $bannerBtn.addClass('disabled');

        if($row.hasClass('isEditing')) {
            var $editing = this.$el.find('tr.isEditing'),
                $newLink = $editing.find('.linkColumn').text(),
                $newLanguageName = $editing.find('.languageColumn span').attr('data-language'),
                $imageId = $editing.find('.imageColumn img').data('id').toString(),
                bannerObj = _.where(this.communicationsBannersEditModel.get('bannerTable').banners, {id:rowId.toString()})[0];

            if( $imageId.match('addedImage') ) {
                $bannerThumb.filter('.uploadContainer')
                    .addClass('selected')
                    .data('id', $imageId)
                    .find('img').show().attr('src', bannerObj.imageSize2x2);
                this.updateImageDisplay({
                    id:$imageId,
                    imageSize4x4:bannerObj.imageSize4x4
                });
                $selectedImage.attr('checked', 'checked').val('on');
            }
            else {
                $bannerThumb.filter('.uploadContainer')
                    .data('id','')
                    .find('img').hide();
                _.each($bannerThumb, function(thumb){
                    if($(thumb).data('id').toString() === $imageId){
                        $(thumb).addClass('selected').trigger('click');
                    }
                });
            }

            $selectedImage.val('on');
            $bannerLanguage.val($newLanguageName);
            $bannerLink.html($newLink);
            $bannerLinkHidden.val($newLink);
            $removeLink[$bannerLinkHidden.val()?'show':'hide']();
            $bannerIdHidden.val(rowId);

            this.checkAvailableLangs($newLanguageName);

            $row.removeClass('isEditing');
        }
    },
    doUpdateBanner: function(updatedData){
        var $bannerTable = this.$el.find('.bannerAddedContent tbody'),
            $bannerTableRow = $bannerTable.find('tr'),
            self = this,
            tplName = 'CommunicationsBannerEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/',
            banners = this.communicationsBannersEditModel.get('bannerTable').banners;

        _.each($bannerTableRow, function(row){
            var newDataId = $(row).data('bannerid').toString();

            if(newDataId === updatedData.id) {
                //Push values to template
                TemplateManager.get('bannersTable', function(tpl) {
                    $(row).replaceWith(tpl(updatedData));
                });
            }
        });
    },
    doSetDefault: function(e){
        var $tar = $(e.target).closest('input'),
            id = $tar.closest('tr').data('bannerid'),
            banners = this.communicationsBannersEditModel.get('bannerTable').banners;

        _.each(banners, function(item, index) {
            if( id == item.id ) {
                banners[index].isDefaultLang = true;
            }
            else {
                banners[index].isDefaultLang = false;
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
        this.$el.find('.bannerAddNewContent').slideUp(G5.props.ANIMATION_DURATION, function() {
            that.$el.find('.addLanguageContent a').removeClass('disabled');
            if(that.$el.find('.bannerAddedContent').hasClass('isEditing')){
                that.$el.find('.bannerAddedContent').removeClass('isEditing');
            }
            that.$el.find('.bannerSubmit').removeAttr('disabled').removeClass('disabled');
        });
        that.resetForm();
    },
    confirmCancelBanner: function(e){
        var $tar = $(e.currentTarget),
            $cancelDialog = this.$el.find('.bannerCancelConfirm');
        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cancelDialog, this.$el);
        }
    },
    doCancelBanner: function(e){
        var $btn = this.$el.find(".bannerCancel");
        if($btn.data('url')) {
            e.preventDefault();
            window.location = $btn.data('url');
        }
    },
    confirmRemoveBanner: function(e){
        var $tar = $(e.currentTarget),
            $popoverCont = this.$el.find('.bannerRemoveConfirmDialog'),
            $form = this.$el.find('.sendForm');

        if( $tar.closest('.bannerAddedContent').hasClass('isEditing') ) {
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
    doRemoveBanner: function(e){
        var $tar = $(e.currentTarget),
            $row = this.$el.find('.bannerAddedContent tr'),
            id;

            $tar.closest('.qtip').qtip('hide');

            if($row.hasClass('isHiding')) {
                id = $('.isHiding').data('bannerid').toString();
                $('.isHiding').hide().removeClass('isHiding');
            }

            this.communicationsBannersEditModel.removeBanner(id);
            e.preventDefault();
    },
    resetForm: function(){
        var $inp = this.$el.find('.bannerAddNewContent input[type="text"]'),
            $link = this.$el.find('.bannerDisplayAttached span'),
            $lang = this.$el.find('#chooseLanguage'),
            $selectedImage = this.$el.find('.selectedImageInput'),
            $selectedThumb = this.$el.find('#thumbnailSelect li'),
            $userDefaultLang = this.$el.find('#userDefaultLanguage').val(),
            $largeImage = this.$el.find('.imageLargeWrapper'),
            $removeLink = this.$el.find('.removeLink');

        $inp.val('');
        $link.html('');
        $lang.val($userDefaultLang);
        $selectedImage.removeAttr('checked');
        $selectedThumb.removeClass('selected');
        $selectedThumb.filter('.uploadContainer')
                    .data('id', '')
                    .find('img').hide().attr('src', '');
        $largeImage.html('');
        $removeLink.hide();

        // removing validation errors
        this.$el.find('.bannerAddNewContent .validateme').each(function() {
            G5.util.formValidateMarkField('valid', $(this));
        });
    },
    validateForm: function(){
        var $bannerForm = this.$el.find('.bannerInfo');

        if(!G5.util.formValidate($bannerForm.find('.validateme'))) {
            var $valTips = $bannerForm.find('.validate-tooltip:visible');
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
        }else {
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
                        container: this.$el.find('.bannerAddedContent'),
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
            this.$el.find('.bannerAddNewContent').remove();
            this.$el.find('.sendForm').submit();
        }
    },
    validateUrl: function(){
        var $inp = this.$el.find('#bannerURL'),
            $attachBtn = this.$el.find('.attachUrlBanner'),
            urlRe = /^(https?:\/\/)?[\da-z\.-]+\.[a-z\.]{2,6}.*$/;

        $attachBtn[urlRe.test($inp.val())?'removeAttr':'attr']('disabled','disabled');
    },
    validateDoc: function(){
        var $attachBtn = this.$el.find('.attachDocBanner');

        $attachBtn.removeAttr('disabled');
    },
    cardCycleInit: function() {
        var self = this,
            cc, calculate, bindToWindow;

        // create an object on the base view
        this.cardCycle = {
            // start with a bunch of handy-dandy references
            $parent : this.$el.find('.thumbnailWrapper'),
            $container : this.$el.find('#thumbnailContainer'),
            $pager : this.$el.find('#thumbnailPager'),
            $list : this.$el.find('#thumbnailSelect'),
            $cards : this.$el.find('#thumbnailSelect li')
        };

        // create a reference to the object that's easier to type and read
        cc = this.cardCycle;

        // this calculation is broken out so we can redo it every time the window resizes
        calculate = function() {
            // how many fit horizontally in the window?
            cc.numX = Math.floor(cc.$container.width() / cc.$cards.first().outerWidth(true));
            // how many fit vertically in the window?
            cc.numY = Math.floor(cc.$container.height() / cc.$cards.first().outerHeight());
            // alright then, how many fit in the window altogether?
            cc.numFit = cc.numX * cc.numY;
            // divide the total number of cards by the number that fit per window
            cc.numSteps = Math.ceil(cc.$cards.length / cc.numFit);
            // use the full height of a step and the number that fit vertically to figure out how far we slide each time
            cc.stepSize = cc.numY * cc.$cards.first().outerHeight(true);
            // find the selected card to make sure we show it in the view, or default to the first one
            cc.showThumb = cc.showThumb || Math.max(cc.$cards.filter('.selected').index(), 0);
            // figure out which step holds the currently selected one
            cc.showStep = Math.floor(cc.showThumb / cc.numFit);

            // if there is one or fewer (ha) steps to show, hide the pager controls
            if ( cc.numSteps <= 1 ) {
                cc.$pager.find('a').hide();
            }
            else {
                cc.$pager.find('a').show();
            }

            // set an explicit height on the full list, just in case
            cc.$list.css({
                height : cc.stepSize * cc.numSteps
            });

            //Update Scroll Information
            self.calculateCardCyclePagerMeta();

            // scroll into position instantly
            self.cardCycleScroll(0);
        };
        // run that calculation
        calculate();

        // we use _'s handy once() method to make sure we only bind to the window resize one time
        bindToWindow = _.once(function() {
            // on the resize, we bind an throttled version of calculate that will only fire every half second at most
            $(window).on('resize', _.throttle(calculate, 500));
        });
        // and bind it
        bindToWindow();
    },
    cardCyclePager: function(e) {
        e.preventDefault();

        // first check to see if the target is the previous link
        var goToStep = $(e.target).data('pager') == 'prev' || $(e.target).closest('a').data('pager') == 'prev'
                    // if so, check to see if we're going below zero
                    ? this.cardCycle.showStep - 1 < 0
                        // if so, restart at the end by using the total number of steps and subtracting 1 to get to our zero-based index
                        ? this.cardCycle.numSteps - 1
                        // if not, go backwards one
                        : this.cardCycle.showStep - 1
                    // if we're not previous, we're next
                    : this.cardCycle.showStep + 1;

        // divide the step by the number of steps and take the remainder
        this.cardCycle.showStep = goToStep % this.cardCycle.numSteps;

        // log the top-left visible card in the card cycle as the one to keep visible if/when resizing
        this.cardCycle.showThumb = this.cardCycle.numFit * this.cardCycle.showStep + 1;

        // scroll it
        this.cardCycleScroll();

        //Update Scroll Information
        this.calculateCardCyclePagerMeta();
    },
    cardCycleScroll: function(duration) {
        var coords = {
                // calculate the top by measuring the size of the step and multiplying by the number of step we're on
                top : this.cardCycle.stepSize * this.cardCycle.showStep,
                // we never scroll left/right
                left : 0
            };

        // scroll it
        this.cardCycle.$container.scrollTo(coords, {
            // use the default duration or the one passed to the function
            duration: duration === undefined ? G5.props.ANIMATION_DURATION : duration
        });
    },
    calculateCardCyclePagerMeta: function() {
        var tpl = this.subTpls.eCardThumbnailPagerMeta,
            cc = this.cardCycle,
            json = {};

        cc.$pager.find('#thumbnailPagerMeta').remove();

        if( cc.$container.length ) {
            json.total = cc.$cards.length;
            json.actualStep = cc.showStep + 1;
            json.startNumber = ((json.actualStep * cc.numFit) - cc.numFit) + 1;
            json.endNumber = Math.min(json.actualStep * cc.numFit, json.total);

            cc.$pager.append(tpl(json));
        }
        else {
            json = {};
            return;
        }
    },
    checkForServerErrors: function() {
        if ($("#serverReturnedErrored").val() === "true"){
            $("#communicationsErrorBlock").slideDown('fast'); //show error block
        }
    }
});