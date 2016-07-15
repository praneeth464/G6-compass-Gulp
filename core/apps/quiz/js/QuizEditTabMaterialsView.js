/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
QuizEditTabMaterialsView:true
*/
QuizEditTabMaterialsView = Backbone.View.extend({

    // from: http://regexlib.com/REDetails.aspx?regexp_id=96
    HTTP_URL_RE:"(http|ftp|https):\\/\\/[\\w\\-_]+(\\.[\\w\\-_]+)+([\\w\\-\\.,@?^=%&amp;:/~\\+#]*[\\w\\-\\@?^=%&amp;/~\\+#])?",

    initialize: function(opts) {
        var that = this;

        // QuizPageEditView parent container for this tab
        this.containerView = opts.containerView;

        // quiz model
        this.quizModel = this.containerView.quizModel;
        // materials collection
        this.materials = this.containerView.quizModel.materials;

        // material item tpl is inline, so this will execute and get assigned immediately when we pass "false" for "async"
        TemplateManager.get('materialItem',function(tpl,tplVars,subTpls){
            that.itemTpl=tpl;
            that.pdfItemTpl = subTpls.pdfItem;
        },null,null,false);
        // "null" is the "url" option, "null" is the "noHandlebars" option, "false" is the "async" option

        this.setupEvents();
        this.render();
    },

    events: {
        'click .materialTypes .btn':'doMaterialTypeClick',
        'click .pdfRemoveBtn':'doPdfRemove',
        'click .saveNewMaterialBtn,.saveMaterialBtn':'doSaveMaterial',
        'click .cancelMaterialBtn':'doCancelMaterial',
        'click #activeMaterialMask':'doMaskClick',

        'click .materialList .materialItem .materialEdit':'doEditMaterial',
        'click .materialList .materialItem .removeControl':'doRemoveMaterial',

        'blur .pdfTitleInput':'doPdfTitleBlur'
    },


    setupEvents: function() {
        var that = this;

        this.quizModel.on('materialUpdated', this.updateMaterialItem, this);

        this.quizModel.on('materialSaved', this.render, this);
        this.quizModel.on('materialSaved', this.updateMaterialItem, this);
        this.quizModel.on('materialRemoved', this.render, this);

        this.quizModel.on('materialFileAdded', this.updateMaterialItem, this);
        this.quizModel.on('materialFileRemoved', this.updateMaterialItem, this);
        this.quizModel.on('materialFileNameChanged', this.updateMaterialItem, this);

    },


    doMaterialTypeClick: function(e) {
        var $tar = $(e.currentTarget),
            mat = this.getMaterialForEl($tar),
            numMatValRes = this.validateNumMaterials();
        e.preventDefault();

        // stop this action if max materials
        if(!numMatValRes.valid) {
            this.containerView.genericErrorTip(numMatValRes.msgClass, $tar);
            return;
        }

        // stop this action if this material type is active and editing
        if(mat.get('type')===$tar.data('fileType') && mat.get('isEditing')) {
            return;
        }

        this.quizModel.updateMaterialById( mat.get('id'), {
            'type': $tar.data('fileType'),
            'isEditing':true,
            'files': [] // clear out files
        });
    },
    doPdfRemove: function(e) {
        var $tar = $(e.currentTarget),
            mat = this.getMaterialForEl($tar),
            fileId = $tar.closest('.pdfItem').data('pdfId');
        e.preventDefault();
        this.quizModel.removeFileFromMaterial(fileId, mat);
    },
    // pdf title inputs are volitile, they will disapear when the list is added/removed from
    // so we want to save any title entries on blur
    doPdfTitleBlur: function(e) {
        var $tar = $(e.currentTarget),
            mat = this.getMaterialForEl($tar),
            fileId = $tar.closest('.pdfItem').data('pdfId');

        this.quizModel.setFileNameOnMaterial(fileId, $tar.val(), mat);
    },
    doSaveMaterial: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            mat = this.getMaterialForEl($tar),
            $mat = this.getElForMaterial(mat),
            validRes = this.validateMaterialItem(mat),
            updatedData = null;

        e.preventDefault();

        if(!validRes.valid) {
            this.containerView.genericErrorTip(validRes.msgClass, $tar);
            return; // EXIT
        }

        $mat.find('.materialTypeDependantWrapper').slideUp(G5.props.ANIMATION_DURATION, function(){

            // SAVE STUFF
            updatedData = {
                isNew: false, // this is now a part of the list
                isEditing: false,
                text: $mat.find('.materialText').val(), // every type gets text
                isJustAdded: mat.get('isNew') // flag this as going from new to the list
            };

            // save the single URL as a single file for VIDEO TYPE
            if(mat.get('type')==='video') {
                updatedData.files = [{
                    id: null,
                    name: null,
                    url: $mat.find('.videoUrlInput').val()
                }];
            }

            // other types have already saved their goodies in the model (image and pdf types)
            that.quizModel.saveMaterialById(mat.get('id'), updatedData); // send data to model

        });
    },
    doCancelMaterial: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            mat = this.getMaterialForEl($tar);
        e.preventDefault();
        if(!mat.get('isNew')) { // revert if its a list item
            this.quizModel.revertMaterialById(mat.get('id'));
        }
        this.quizModel.updateMaterialById(mat.get('id'), {isEditing:false});
    },
    doEditMaterial: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            mat = this.getMaterialForEl($tar);
        e.preventDefault();
        this.quizModel.updateMaterialById(mat.get('id'), {isEditing:true});
    },
    doRemoveMaterial: function(e) {
        var that = this,
            $tar = $(e.currentTarget),
            mat = this.getMaterialForEl($tar),
            $mat = this.getElForMaterial(mat),
            $tip = this.$el.find('.materialRemoveDialog');
        e.preventDefault();

        G5.util.questionTip($tar, $tip.clone(), {
                position:{
                    my: 'right center',
                    at: 'left center'
                }
            },
            function() { // confirm callback
                $mat.slideUp(G5.props.ANIMATION_DURATION, function(){
                    that.quizModel.removeMaterialById(mat.get('id'));
                });
            }
        );
    },
    doMaterialOrderChanged: function(e,ui) {
        var that = this,
            $mats = this.$el.find('.materialList .materialItem');
        // Now we have a new order that is only represented by the indexes of the .materialItem elements
        // so we must loop through and set the proper model (and element) pageNumber to the index+1.
        // * We have an exceptional case here, where the DOM view is updated already, so we don't need/want to listen
        //   for pageNumber changes to update the dom. We do it right here, in the 'do*' function.
        $mats.each(function(i){
            var $m = $(this),
                m = that.getMaterialForEl($m),
                $pn = $m.find('.materialPage');

            // superficial
            $pn.text(i+1);

            // model
            that.quizModel.setMaterialPageNumberById(m.get('id'),i+1);
        });

    },
    // mask click only happens when the active material item needs confirmation to save
    doMaskClick: function(e) {
        var $mask = $('#activeMaterialMask'),
            edMat = this.quizModel.materials.where({isEditing:true}),
            jostle,
            $edMat,$btn;

        edMat = edMat.length ? edMat[0] : null;

        if(!edMat) {
            $mask.hide();
            return;
        }

        $edMat = this.getElForMaterial(edMat);
        $btn = $edMat.find('.saveMaterialBtn:visible,.saveNewMaterialBtn:visible');

        // use QuizPageEditView method
        this.containerView.onNavErrorTip('msgMaterialModified',$btn);

        // jostle function
        jostle = function() {
            $btn.data('qtip').elements.tooltip
                .animate({top:'-=20'},300).animate({top:'+=20'},300)
                .animate({top:'-=10'},200).animate({top:'+=10'},200);
        };

        $.scrollTo($btn,{
            axis:'y',
            duration: 200,
            offset:{
                top: -$(window).height() + $btn.outerHeight() + 20
            },
            onAfter: jostle
        });

    },



    /* ***************************************************************************
        TAB FUNCTION(S) - QuizEditTab*View interface - QuizPageEditView will call
    ****************************************************************************** */
    validate: function() {
        return { valid: true }; // valid
    },
    // re-usable
    validateNumMaterials: function() {
        var listMats = this.quizModel.materials.where({isNew:false}); // materials in list

        if(listMats.length >= 10) {
            return { msgClass: 'msgMaterialsTooMany', valid: false };
        }

        return { valid: true };
    },



    render: function() {
        this.updateHeaders(); // headers might change whenever we render the list
        this.renderMaterials();
    },
    renderMaterials: function() {
        var that = this,
            qm = this.quizModel,
            listMats = qm.materials.where({isNew:false}),
            newMat = qm.materials.where({isNew:true}),
            $matList = this.$el.find('.materialList'),
            $newMat = this.$el.find('.newMaterial'),
            $m = null,
            json = null;


        // list
        $matList.empty();
        _.each(listMats, function appendMatItemToDom(m){
            $m = that.renderMatItem(m);
            $m.find('.materialTypeWrapper').hide();
            $matList.append($m);
            if(m.get('isJustAdded')) {
                // FF 20.x Having some issues with this so TRY and CATCH to make sure we continue instead of terminating process/thread
                // this fails fairly gracefully and its a recent bug in FF, so it should eventually go away
                try {
                    G5.util.animBg($m,'background-flash');
                } catch(err) {
                    console.log('[ERROR] QuizEditTabMaterialsView: (this is a FF 20.x issue ATM) error on trying to animate BG of :',$m[0]);
                }

                m.unset('isJustAdded'); // clear these out, don't need them any more
            }
        });

        this.updateSortable(); // set sortable state

        // new
        $newMat.empty();
        _.each(newMat, function(m){
            $newMat.append( that.renderMatItem(m) );
        });

    },
    renderMatItem: function(matModel) {
        var $m,json;
        json = matModel.toJSON();
        json.cid = matModel.cid;
        $m = $(this.itemTpl(json));
        return $m;
    },

    updateHeaders: function() {
        var hasListMats = this.materials.where({'isNew':false}).length>0, // old material is in list
            $headers = this.$el.find('.headerDescriptions'),
            $empty = this.$el.find('.noMaterials');

        $headers[hasListMats?'show':'hide']();
        $empty[hasListMats?'hide':'show']();
    },
    updateMaterialItem: function(m) {
        var that = this,
            isShowCont = m.get('isEditing'),
            $mList = this.$el.find('.materialList'),
            $m = this.getElForMaterial(m),
            $text = $m.find('.materialText'),
            typeUpdateFuncName = 'updateMaterialItem_'+m.get('type'),
            typeWrapCls = '.'+m.get('type')+'TypeWrapper',
            attRichtext;

        if($m.length===0) { return; }

        // troublesome richtext plugin
        attRichtext = function() {
            var $oldFocus = $(document.activeElement);

            $text.val(m.get('text'));

            // original is rendered in through tpl, so no need to update this text from the model
            if(_.has($text.get(0),'jhtmlareaObject')) { // has richtext plugin
                $text.htmlarea( 'dispose' ); // destroy previous plugin
            }
            $text.htmlarea( G5.props.richTextEditor ); // attach richtext plugin

            // as always when hiding showing richtext we have issues in ie8/7
            // for some reason after rendering the list, a click on the content window with the mouse
            // doesn't work unless tabbed into or sth like the call below focuses at least once
            // after this focus, click focusing and cursor positioning works
            if(that.containerView.isIe7OrIe8 || that.containerView.isIe9) {
                $text[0].jhtmlareaObject.iframe[0].contentWindow.focus();
                $oldFocus.focus(); // back to last focused
            }

        };

        // file type buttons
        // remove last active
        $m.find('.materialTypes .btn').removeClass('active');
        // set new active if isEditing
        if(m.get('isEditing')) {
            $m.find('.materialTypes .btn')
                .filter('[data-file-type="'+m.get('type')+'"]')
                .addClass('active');
        }


        // show type dependant content
        if(isShowCont) {
            if($m.find('.materialTypeDependantWrapper:hidden').length) { // its hidden
                $m.addClass('materialActive');
                $m.find('.materialTypeDependantWrapper:hidden').slideDown(G5.props.ANIMATION_DURATION, function(){
                    if(that.containerView.isIe7OrIe8) {
                        attRichtext();
                        //  <3 ie7
                        $m.find('.materialItemActions').css('zoom',1);
                    }
                });
                $.scrollTo($m, 200, {axis:'y',offset:{top:-20}} );
                if(!that.containerView.isIe7OrIe8) {
                    attRichtext();
                }

            }
            $mList.sortable( "option", "disabled", true );
        } else {
            $m.removeClass('materialActive');
            $m.find('.materialTypeDependantWrapper:visible').slideUp(G5.props.ANIMATION_DURATION);
            this.updateSortable();
        }

        // show the proper type contents
        $m.find('.typeContentWrapper:not('+typeWrapCls+')').slideUp(G5.props.ANIMATION_DURATION);
        $m.find(typeWrapCls+':hidden').slideDown(G5.props.ANIMATION_DURATION);




        // updates for material type
        if(typeof this[typeUpdateFuncName] === 'function') {
            this[typeUpdateFuncName](m,$m); // call it
        }

        // masking when apropo
        if(m.get('isEditing')) {
            $m.addClass('quizMaskOn');
            // ie7 and .sortable() sometimes leaves a z-index of 1000 on our element
            if($.browser.msie&&$.browser.version==='7.0') {
                $m.css('z-index','');
            }
            this.showMask(true);
        }else{
            this.showMask(false);
            $m.removeClass('quizMaskOn');
        }

    },
    showMask: function(isShow) {
        var $mask = this.containerView.$el.find('#activeMaterialMask');

        if(isShow) {
            $mask.show();
        } else {
            $mask.hide();
        }
    },
    updateSortable: function() {
        var that = this,
            $mList = this.$el.find('.materialList'),
            listMats = this.quizModel.materials.where({isNew:false});

        // lazy-attach plugin
        if(!$mList.data('sortable')){
            // jquery ui sortable (drag and drop to change pageNumber/order)
            $mList.sortable({
                axis: 'y',
                delay: 100, // before draging delay (allow clicks)
                placeholder: 'materialPlaceholder',
                //revert: 200, // animate to resting pos (ms)
                update: function(e,ui) {
                    that.doMaterialOrderChanged(e,ui); // do stuff when order changed
                }
            });
        }

        // disable/enable
        $mList.sortable( "option", "disabled", listMats.length<2 );
    },
    // special update for pdf type material
    updateMaterialItem_pdf: function(m,$m) {
        var that = this,
            $pdfItems = $m.find('.pdfItems');

        // not pdf type? exit
        if(m.get('type')!=='pdf') { return; } // only for pdftype

        // pdf type has an uploader, let's update that
        this.updateMaterialUploader(m,$m);

        // render each pdf file
        // * setTimeout pushes this call to the end of the stack
        // - this is required for IE8 + our current version of JQuery
        // - IE8 will fail if an element triggers its own removal (unless we push call to EOF stack)
        setTimeout(function(){
            $pdfItems.empty();
            _.each(m.get('files'),function(fileObj){
                $pdfItems.append(that.pdfItemTpl(fileObj));
            });
        },0);

        // placeholder for old browsers
        $pdfItems.find('.pdfTitleInput').placeholder();

        // set proper upload btn text
        $m.find('.pdfBtnMsg').hide();
        m.get('files').length ? $m.find('.hasPdfsMsg').show() : $m.find('.noPdfsMsg').show();
    },

    // special update for image type material
    updateMaterialItem_image: function(m,$m) {
        var that = this,
            imgUrl = m.get('files')&&m.get('files').length ? m.get('files')[0].url : null,
            $upImgWrap = $m.find('.uploadedImageWrapper'),
            $noneImgWrap = $m.find('.emptyImageWrapper');

        // not pdf type? exit
        if(m.get('type')!=='image') { return; } // only for imagetype

        // image type has an uploader, let's update that
        this.updateMaterialUploader(m,$m);

        // render image
        $upImgWrap.empty();
        if(imgUrl) {
            $upImgWrap.show().append($('<img>').attr('src',imgUrl));
            $noneImgWrap.hide();
        }else {
            $upImgWrap.hide();
            $noneImgWrap.show();
        }

        // set proper upload btn text
        $m.find('.imageBtnMsg').hide();
        m.get('files').length ? $m.find('.hasImageMsg').show() : $m.find('.noImageMsg').show();
    },

    // special update for video type material
    updateMaterialItem_video: function(m,$m) {
        var that = this,
            videoUrl = m.get('files')&&m.get('files').length ? m.get('files')[0].url : null,
            $videoUrl = $m.find('.videoUrlInput');

        // not pdf type? exit
        if(m.get('type')!=='video') { return; } // only for videotypes

        // update URL
        if(videoUrl) {
            $videoUrl.val(videoUrl);
        }
    },

    // update state of upload controls
    updateMaterialUploader: function(m, $m) {
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
            },
            fileType = m.get('type'); // image, pdf

        // upload pluggy (its smart enough to know only to
        // get attached once even though it gets called every update)
        $m.find('.uploaderFileInput').fileupload({
            url: G5.props.URL_JSON_QUIZ_MATERIAL_UPLOAD,
            dataType: 'g5json',
            formData: {fileType: m.get('type')},
            add: function(e, fuData) {
                var f = fuData.files[0],
                    regExes = {
                        pdf: /\.pdf$/i,
                        image: /\.(gif|jpg|jpeg|png)$/i
                    },
                    $tar = $m.find('.uploaderFileInput:visible');

                if(regExes[fileType].test(f.name)) {
                    // continue normal behavior
                    fuData.submit();
                } else {
                    // throw error tip up, also add 'click' to hide events in addition to 'unfocus' so a click
                    // on the upload button will also hide the qtip
                    that.containerView.genericErrorTip('msgFileType_'+fileType, $tar, {hide:{event:"unfocus click"}});
                }

            },
            beforeSend: startSpin,
            done: function(e, data) {
                var props = data.result.data.properties;
                if(props.isSuccess){
                    that.quizModel.addFileToMaterial({
                        id: props.fileUrl,
                        name: '', // no name yet
                        url: props.fileUrl,
                        originalFilename: props.originalFilename
                    },m);
                } else {
                    showError(props.errorText||"File upload failed - server did not provide [errorText]");
                }

                stopSpin();
            },
            error: function(xhr, status, error) {
                stopSpin();
                showError(status+': '+error);
            }
        });
        /*
         * Turns out this only ever fires when a chunk is finished sending
         * Our uploads aren't chunked (at this point in time), so it only ever returns 100%
         * Makes for a pretty pointless progress bar
         *
        .bind('fileuploadprogress',function(evt,data) {
            var percentUploaded = parseInt(data.loaded/data.total*100, 10);
            // show progress if browser supports
            $m.find('.uploadingIndicator .progress')[data.lengthComputable?'show':'hide']();
            // adjust progress width and text
            $m.find('.uploadingIndicator .bar')
                .css('width',percentUploaded+'%')
                .text(percentUploaded+'%');
        });
         *
         */

        // hide any upload errors hanging out
        hideError();
    },

    // active material item validation
    validateMaterialItem: function(mat) {
        var $mat = this.getElForMaterial(mat),
            type = mat.get('type'),
            files = mat.get('files'),
            urlRe = new RegExp(this.HTTP_URL_RE,'i'),
            $matText = $mat.find('textarea.materialText'),
            matText = $('<div/>').html($matText.val()).text(), // use browser to strip HTML
            matTextMaxChars = parseInt($matText.data('maxChars'),10),
            i = 0;

        // text
        if(!$.trim(matText)) {
            return { msgClass: 'msgMaterialMustHaveText', valid: false };
        }

        // text max chars
        if(matTextMaxChars && (matText.length > matTextMaxChars) ) {
            return { msgClass: 'msgMaterialTooManyChars', valid: false };
        }

        // image
        if(type==='image' && mat.get('files').length!==1) {
            return { msgClass: 'msgMaterialMustHaveImage', valid: false };
        }

        // pdf
        if(type==='pdf') {

            // make sure we have at least one pdf
            if(files.length===0) {
                return { msgClass: 'msgMaterialMustHavePdf', valid: false };
            }

            // make sure we don't have too many
            if(files.length > 10) {
                return { msgClass: 'msgMaterialTooManyPdfs', valid: false };
            }

            // make sure each pdf has a title (these are set on blur)
            for(i=0; i<files.length; i++) {
                if(files[i].name.trim()==='') {
                    return { msgClass: 'msgMaterialMustHavePdfTitle', valid: false };
                }
            }
        }

        // video
        if(type==='video') {
            // bad video URL format
            if(!urlRe.test($mat.find('.videoUrlInput').val())) {
                return { msgClass: 'msgMaterialVideoUrlFormat', valid: false };
            }
        }

        return {valid:true};
    },





    // Material: Model - Element mapping
    getElForMaterial: function(materialModel) {
        return materialModel?this.$el.find('[data-cid="'+materialModel.cid+'"]'):null;
    },
    getMaterialForEl: function($el) {
        $el = $el.hasClass('.materialItem') ? $el : $el.closest('.materialItem');
        return this.quizModel.materials.get($el.data('materialId'));
    }

});
