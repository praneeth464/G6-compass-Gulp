/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
TemplateManager,
PageView,
SelectAudienceParticipantsView,
CommunicationsImageUploadView,
CommunicationsNewsEditModel,
CommunicationsNewsEditView:true
*/
CommunicationsNewsEditView = PageView.extend({

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
            type: "news",
            formData: {
                sizes: ['2x2','4x2','4x4','page']
            }
        });
        this.imageUploadView.on('saveImages', this.doSaveImages, this);

        //create model
        this.communicationsNewsEditModel = new CommunicationsNewsEditModel({});

        this.communicationsNewsEditModel.loadData();

        this.$el.find('.datepickerTrigger').datepicker();
        this.$el.find('.richtext').htmlarea( G5.props.richTextEditor );
        this.checkForServerErrors();

        //If model did not have data, it feches data from server, page then renders on 'loadStandingsDataFinished'
        this.communicationsNewsEditModel.on('loadDataFinished', function() {
            self.render();
            self.renderNewsInfo();
        });

        this.on('newsRendered', function(){
            self.renderAudience();
            self.displayNewsTable();
            self.renderChooseImages();
        });

        this.on('newsImagesRendered', function(){
            self.cardCycleInit();
        });

        this.communicationsNewsEditModel.on('newsAdded', function(newData, isAdded){
            self.render(newData, isAdded);
        });

        this.communicationsNewsEditModel.on('newsRemoved', function(news){
            self.render(news);
        });

        this.communicationsNewsEditModel.on('imageAdded', function(newData){
            self.updateImageDisplay(newData);
        });

        this.communicationsNewsEditModel.on('newsUpdated', function(news){
            self.doUpdateNews(news);
        });
    },
    events: {
        'click .addLanguageContent a': 'addNewContent',
        'click #thumbnailSelect li': 'chooseImage',
        'click .saveContent': 'doSaveNews',
        'click .cancelContent': 'confirmCancelSave',
        'click .editColumn a': 'doEditNews',
        'click .defaultColumn input': 'doSetDefault',
        'click .remParticipantControl': 'confirmRemoveNews',
        'click #newsRemoveDialogConfirm': "doRemoveNews",
        'click .newsSubmit': 'submitForm',
        'click .newsCancel': 'confirmCancelNews',
        'click #saveCancelDialogConfirm': 'doCancelSave',
        'click #newsCancelDialogConfirm': 'doCancelNews',
        "click #saveCancelDialogCancel, #newsCancelDialogCancel, #newsRemoveDialogCancel":function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        },
        'click #thumbnailPager a': 'cardCyclePager'
    },
    render: function(newData, isAdded) {
        var $newsCont = this.$el.find('#newsTable tbody'),
            self = this,
            tplName = 'CommunicationsNewsEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/',
            news = this.communicationsNewsEditModel.get('newsTable').news;

        G5.util.hideSpin( this.$el );

        //Push values to template
        TemplateManager.get('newsTable', function(tpl) {
            if(isAdded){
                // check to see if this is the first one and mark it the default
                if( news.length == 1 ) {
                    newData.isDefaultLang = true;
                }

                $newsCont.append(tpl(newData));
            }else {
                $newsCont.html('');
                _.each(news, function(story){
                    $newsCont.append(tpl(story));
                });
            }
            self.trigger('newsRendered');
        });
    },
    renderAudience: function(){
        if(!this.newsSelectAudience){
            this.newsSelectAudience = new SelectAudienceParticipantsView({
                el: this.$el.find('.selectAudienceTableWrapper'),
                dataParams: {page:'communicationsNews'}
            });
        }
    },
    renderNewsInfo: function(){
        var model = this.communicationsNewsEditModel,
            $newsTitle = this.$el.find('#newsTitle'),
            $newsStartDate = this.$el.find('#newsStartDate'),
            $newsEndDate = this.$el.find('#newsEndDate');

        //fill in values
        if(model){
            $newsTitle.val(model.get('newsTitle'));
            $newsStartDate.val(model.get('newsStartDate'));
            $newsEndDate.val(model.get('newsEndDate'));
        }
    },
    displayNewsTable: function(){
        var $addedNews = this.$el.find('#newsTable'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $submitBtn = this.$el.find('.newsSubmit'),
            $newContent = this.$el.find('.newsAddNewContent');

        if($addedNews.find('tbody').children().length<1){
            $addedNews.responsiveTable({destroy: true});

            $addedNews.hide();
            $addAnotherBtn.addClass('disabled');
            $submitBtn.attr('disabled', '');
            this.checkAvailableLangs();
            $newContent.show();
        } else {
            $addedNews.show();
            if( this.checkAvailableLangs() !== false ) {
                $addAnotherBtn.removeClass('disabled');
            }
            $submitBtn.removeAttr('disabled');
            $newContent.hide();

            this.disableDefault();
            $addedNews.responsiveTable();
        }
    },
    checkAvailableLangs: function(selectedLang) {
        var $chooseLang = this.$el.find('#chooseLanguage'),
            $langs = $chooseLang.find('option'),
            news = this.communicationsNewsEditModel.get('newsTable').news,
            usedLangs = _.pluck(news, 'language');

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
        var $addedBanners = this.$el.find('#newsTable'),
            $defaultCol = $addedBanners.find('.defaultColumn input');

        if($defaultCol.hasClass('systemDefault')){
            _.each($defaultCol, function(){
                $defaultCol.attr('disabled', '');
            });
        }
    },
    renderChooseImages: function(){
        var $newsImages = this.$el.find('.chooseImagesSection'),
            tplName = 'CommunicationsNewsEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/',
            self = this;

        $newsImages.empty();

        TemplateManager.get('chooseImages', function(tpl, vars, subTpls){
            self.subTpls = subTpls;
            $newsImages.append(tpl(self.communicationsNewsEditModel.toJSON()));
            self.trigger('newsImagesRendered');
        }, this.tplPath);
    },
    chooseImage: function(e){
        var $tar = $(e.currentTarget),
            $li = this.$el.find('#thumbnailSelect li'),
            id = $tar.data('id'),
            modelImgs = this.communicationsNewsEditModel.get('newsImages').images,
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
                        imageUrl : selectedImage[0].imageSize162x162,
                        size : "page"
                    }
                ]
            };
        }
        /*
         *  NOTE: uncomment this section only if we want to copy images from the first item when clicking upload the first time
         *  NOTE: this would probably be best done in the addNewContent method as part of a bigger data copy
         *
        else if(this.communicationsNewsEditModel.get('newsTable').news.length) {
            preloadedImages = {
                images: [
                    {
                        imageUrl : this.communicationsNewsEditModel.get('newsTable').news[0].imageSize4x4,
                        size : "4x4"
                    },
                    {
                        imageUrl : this.communicationsNewsEditModel.get('newsTable').news[0].imageSize4x2,
                        size : "4x2"
                    },
                    {
                        imageUrl : this.communicationsNewsEditModel.get('newsTable').news[0].imageSize2x2,
                        size : "2x2"
                    },
                    {
                        imageUrl : this.communicationsNewsEditModel.get('newsTable').news[0].imageSize162x162,
                        size : "page"
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
            $addNews = this.$el.find('.newsAddNewContent'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $textarea = this.$el.find('.richtext');

        e.preventDefault();

        if($addAnotherBtn.hasClass('disabled')){
            e.preventDefault();
            return false;
        }

        this.checkAvailableLangs();

        $addNews.slideDown(G5.props.ANIMATION_DURATION, function() {
            $textarea.htmlarea( G5.props.richTextEditor );
        });
        this.$el.find('.newsAddedContent').addClass('isEditing');
        $addAnotherBtn.addClass('disabled');
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
    doSaveImages: function(images) {
        var imageData = {
            id: null,
            isUploaded: true,
            imageSize162x162: _.where(images, {size: 'page'})[0].imageUrl,
            imageSize2x2: _.where(images, {size: '2x2'})[0].imageUrl,
            imageSize4x2: _.where(images, {size: '4x2'})[0].imageUrl,
            imageSize4x4: _.where(images, {size: '4x4'})[0].imageUrl
        };

        this.communicationsNewsEditModel.addImage(imageData);
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
    doSaveNews: function(e){
        var self = this,
            $tar = $(e.currentTarget),
            $addNews = this.$el.find('.newsAddNewContent'),
            $addAnotherBtn = this.$el.find('.addLanguageContent a'),
            $languageDisp = this.$el.find('#chooseLanguage option:selected').text(),
            $language = this.$el.find('#chooseLanguage option:selected').val(),
            $story = this.$el.find('#newsMessage textarea').val(),
            $headline = this.$el.find('#newsHeadline').val(),
            modelImages = this.communicationsNewsEditModel.get('newsImages').images,
            $imageId = this.$el.find('#thumbnailContainer .selected').data('id'),
            modelImageId,
            newsId,
            modelImg162x162,
            modelImg2x2,
            modelImg4x2,
            modelImg4x4;

        e.preventDefault();

        if(!G5.util.formValidate($addNews.find('.validateme'))) {
            // invalid, was generic error, qtip visible (we use this below)
            return false;
        }

        _.each(modelImages, function(image){
            if($imageId === image.id){
                modelImg162x162 = image.imageSize162x162;
                modelImg2x2 = image.imageSize2x2;
                modelImg4x2 = image.imageSize4x2;
                modelImg4x4 = image.imageSize4x4;

                modelImageId = image.id;
            }
        });

        $addNews.slideUp(G5.props.ANIMATION_DURATION, function(){
            var $newsTableId = self.$el.find('.newsAddedContent .hasEdited').data('newsid'),
                $newsIndexId = self.$el.find('.newsAddedContent .hasEdited').data('indexid'),
                data;

            if($newsTableId){
                newsId = $newsTableId.toString();
            }

            //Save data
            data = {
                id: null || newsId,
                index: null || $newsIndexId,
                languageDisplay: $languageDisp,
                language: $language,
                headline: $headline,
                imageId: null || modelImageId,
                imageSize162x162: modelImg162x162,
                imageSize2x2: modelImg2x2,
                imageSize4x2: modelImg4x2,
                imageSize4x4: modelImg4x4,
                story: $story
            };

            if(self.$el.find('.newsAddedContent tr').hasClass('hasEdited')){
                self.$el.find('.newsAddedContent tr').removeClass('hasEdited');
                self.communicationsNewsEditModel.updateNews(data);
            }else {
                self.communicationsNewsEditModel.addNews(data);
            }

            if(self.$el.find('.newsAddedContent').hasClass('isEditing')){
                self.$el.find('.newsAddedContent').removeClass('isEditing');
            }

            if( self.checkAvailableLangs() !== false ) {
                $addAnotherBtn.removeClass('disabled');
            }
            $tar.removeAttr('disabled');
            self.$el.find('.newsSubmit').removeAttr('disabled').removeClass('disabled');
        });

        this.resetForm();
    },
    doEditNews: function(e){
        var $tar = $(e.currentTarget),
            $row = $tar.parents('tr'),
            rowId = $row.data('newsid'),
            $addNews = this.$el.find('.newsAddNewContent'),
            $newsLanguage = $addNews.find('#chooseLanguage'),
            $newsIdHidden = this.$el.find('#newsId'),
            $newsBtn = this.$el.find('.addLanguageContent a'),
            $newsStory = this.$el.find('#newsMessage textarea'),
            $newsHeadline = this.$el.find('#newsHeadline'),
            $newsThumb = this.$el.find('#thumbnailSelect li'),
            $selectedImage = this.$el.find('.selectedImageInput');

        e.preventDefault();

        if( $row.closest('.newsAddedContent').hasClass('isEditing') ) {
            return false;
        }
        $row.closest('.newsAddedContent').addClass('isEditing');

        this.$el.find('.newsSubmit').attr('disabled','disabled').addClass('disabled');

        $row.addClass('isEditing hasEdited');

        $addNews.slideDown(G5.props.ANIMATION_DURATION, function() {
            // trigger the resize event on the window so the carousel inside the image picker calibrates itself properly
            $(window).resize();
        });
        this.$el.find('.richtext').htmlarea( G5.props.richTextEditor );
        $newsBtn.addClass('disabled');

        if($row.hasClass('isEditing')) {
            var $editing = this.$el.find('tr.isEditing'),
                $newLanguageName = $editing.find('.languageColumn span').attr('data-language'),
                $newHeadline = $editing.find('.headlineColumn').text(),
                $storyColumn = $editing.find('.storyColumn').text(),
                $imageId = $editing.find('.imageColumn img').data('id').toString(),
                newsObj = _.where(this.communicationsNewsEditModel.get('newsTable').news, {id:rowId.toString()})[0];

            if( $imageId.match('addedImage') ) {
                $newsThumb.filter('.uploadContainer')
                    .addClass('selected')
                    .data('id', $imageId)
                    .find('img').show().attr('src', newsObj.imageSize2x2);
                this.updateImageDisplay({
                    id:$imageId,
                    imageSize4x4:newsObj.imageSize4x4
                });
                $selectedImage.attr('checked', 'checked').val('on');
            }
            else {
                $newsThumb.filter('.uploadContainer')
                    .data('id','')
                    .find('img').hide();
                _.each($newsThumb, function(thumb){
                    if($(thumb).data('id').toString() === $imageId){
                        $(thumb).addClass('selected').trigger('click');
                    }
                });
            }

            $selectedImage.val('on');
            $newsLanguage.val($newLanguageName);
            $newsHeadline.val($newHeadline);
            $newsIdHidden.val(rowId);
            $newsStory.val($storyColumn);

            this.checkAvailableLangs($newLanguageName);

            $row.removeClass('isEditing');
            this.$el.find('.richtext').htmlarea('updateHtmlArea', G5.props.richTextEditor );
        }
    },
    doUpdateNews: function(updatedData){
        var $newsTable = this.$el.find('.newsAddedContent tbody'),
            $newsTableRow = $newsTable.find('tr'),
            self = this,
            tplName = 'CommunicationsNewsEdit',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/';

        _.each($newsTableRow, function(row){
            var newDataId = $(row).data('newsid').toString();

            if(newDataId === updatedData.id) {
                //Push values to template
                TemplateManager.get('newsTable', function(tpl) {
                    $(row).replaceWith(tpl(updatedData));
                });
            }
        });
    },
    doSetDefault: function(e){
        var $tar = $(e.target).closest('input'),
            id = $tar.closest('tr').data('newsid'),
            news = this.communicationsNewsEditModel.get('newsTable').news;

        _.each(news, function(item, index) {
            if( id == item.id ) {
                news[index].isDefaultLang = true;
            }
            else {
                news[index].isDefaultLang = false;
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
        this.$el.find('.newsAddNewContent').slideUp(G5.props.ANIMATION_DURATION, function() {
            that.$el.find('.addLanguageContent a').removeClass('disabled');
            if(that.$el.find('.newsAddedContent').hasClass('isEditing')){
                that.$el.find('.newsAddedContent').removeClass('isEditing');
            }
            that.$el.find('.newsSubmit').removeAttr('disabled').removeClass('disabled');
        });
        that.resetForm();
    },
    confirmCancelNews: function(e){
        var $tar = $(e.currentTarget),
            $cancelDialog = this.$el.find('.newsCancelConfirm');
        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cancelDialog, this.$el);
        }
    },
    doCancelNews: function(e){
        var $btn = this.$el.find(".newsCancel");
        if($btn.data('url')) {
            e.preventDefault();
            window.location = $btn.data('url');
        }
    },
    confirmRemoveNews: function(e){
        var $tar = $(e.currentTarget),
            $popoverCont = this.$el.find('.newsRemoveConfirmDialog');

        if( $tar.closest('.newsAddedContent').hasClass('isEditing') ) {
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
    doRemoveNews: function(e){
        var $tar = $(e.currentTarget),
            $row = this.$el.find('.newsAddedContent tr'),
            id;

            $tar.closest('.qtip').qtip('hide');

            if($row.hasClass('isHiding')) {
                id = $('.isHiding').data('newsid').toString();
                $('.isHiding').hide().removeClass('isHiding');
            }

            this.communicationsNewsEditModel.removeNews(id);
            e.preventDefault();
    },
    resetForm: function(){
        var $inp = this.$el.find('.newsAddNewContent input[type="text"]'),
            $lang = this.$el.find('#chooseLanguage'),
            $textarea = this.$el.find('.richtext'),
            $selectedImage = this.$el.find('.selectedImageInput'),
            $selectedThumb = this.$el.find('#thumbnailSelect li'),
            $userDefaultLang = this.$el.find('#userDefaultLanguage').val(),
            $largeImage = this.$el.find('.imageLargeWrapper');

        $inp.val('');
        $lang.val($userDefaultLang);
        $textarea.val('');
        $selectedImage.removeAttr('checked');
        $selectedThumb.removeClass('selected');
        $selectedThumb.filter('.uploadContainer')
                    .data('id', '')
                    .find('img').hide().attr('src', '');
        $largeImage.html('');

        // removing validation errors
        this.$el.find('.newsAddNewContent .validateme').each(function() {
            G5.util.formValidateMarkField('valid', $(this));
        });

        $textarea.htmlarea('dispose',G5.props.richTextEditor);

        //darn IE9 issues with richtext editor causing inputs to not be clickable after save. Below seems to fix.
        $textarea.focus().blur();
    },
    validateForm: function(){
        var $newsForm = this.$el.find('.newsInfo');

        if(!G5.util.formValidate($newsForm.find('.validateme'))) {
            var $valTips = $newsForm.find('.validate-tooltip:visible');
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
            this.$el.find('.newsAddNewContent').remove();
            this.$el.find('.sendForm').submit();
        }
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
