/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
CommunicationsImageUploadView:true
*/
CommunicationsImageUploadView = Backbone.View.extend({

    uploadPreviewTplName: "uploadPreview",

    initialize: function (options) {
        var _self = this;

        this.parentView = options.parentView;

        this.$modalBody = this.$el.find(".modal-body");
        this.$upForm = this.$el.find(".imageUploadForm");
        this.$uploadSaveButton = this.$el.find(".imageUploadSave");
        this.$imageUploadContainer = this.$modalBody.find(".imageUploadFormContainer");
        this.$imagePreviewContainer = this.$modalBody.find(".imageUploadPreviewContainer");

        this.$uploadSaveButton.prop("disabled", true).addClass("disabled");

        this.$upForm.fileupload({
            url: G5.props.URL_JSON_COMMUNICATION_UPLOAD_IMAGES,
            dataType: 'g5json',
            formData: options.formData,
            add: function(e, data) {
                _self.handleImageAdd(e, data);
            },
            done: function(e, data) {
                if (G5.util.formValidateHandleJsonErrors($(e.target), data.result.data.messages) && data.result.data.messages.length) {
                    var extractedData = _self.extractPreviewData(data.result.data.messages[0]);
                    _self.handleImageUpload(extractedData);
                }
                else {
                    _self.$upForm.data("uploadData", "");
                    _self.$imageUploadContainer.show();

                    G5.util.hideSpin(_self.$modalBody);

                    _self.$uploadSaveButton.prop("disabled", false).removeClass("disabled");
                }
            }
        });

        TemplateManager.get(this.uploadPreviewTplName, function (tpl) {
            _self.uploadPreviewTpl = tpl;
        }, null, null, false);
    },

    events: {
        "click .replaceAllImages" : "handleReplaceAllImages",
        "click .replaceImageBtn" : "handleReplaceImageTip",
        "click .imageUploadSave" : "handleSave",
        "click .imageUploadCancel" : "handleCancel",
        "click #uploadCancelDialogConfirm" : "handleCancelConfirm",
        "click #uploadCancelDialogCancel" : function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    render: function (data) {
        var rendered = this.uploadPreviewTpl(data);

        this.$imagePreviewContainer.html(rendered);
    },

    handleImageAdd: function (e, data) {
        this.$upForm.data("uploadData", data);

        this.handleSubmit(e);
    },

    handleImageUpload: function (data) {
        G5.util.hideSpin(this.$modalBody);

        this.$uploadSaveButton.prop("disabled", false).removeClass("disabled");

        data.type = this.options.type;

        this.images = _.flatten(_.omit(data, 'type'));

        this.render(data);
        this.$imageUploadContainer.hide();
        this.$imagePreviewContainer.show();
    },

    handleSubmit: function (e) {
        var data = this.$upForm.data("uploadData");

        e.preventDefault();

        if (data && typeof data.submit === "function") {
            this.$imageUploadContainer.hide();

            G5.util.showSpin(this.$modalBody);

            this.$uploadSaveButton.prop("disabled", true).addClass("disabled");

            data.submit();
        }
    },

    handleReplaceAllImages: function(e) {
        if(e) {
            e.preventDefault();
        }

        this.images = [];

        this.$imagePreviewContainer.empty().hide();
        this.$upForm.removeData('uploadData');
        this.$imageUploadContainer.show();
        this.$uploadSaveButton.prop("disabled", true).addClass("disabled");
    },

    handleReplaceImageTip: function(e) {
        var that = this,
            $tar = $(e.target).closest('.replaceImageBtn'),
            size = $tar.data('size'),
            $cont = this.$el.find('#uploadReplacementImage').clone().removeAttr('id'),
            $replaceForm = $cont.find('.uploadReplacementImageForm'),
            $preview = $tar.closest('.module');

        e.preventDefault();

        if( $tar.hasClass('disabled') || $tar.is('disabled') ) {
            return false;
        }

        $cont.find('#replacementImageSize').val(size);

        // if the tooltip has been initialized, show it and bail
        if( $tar.data('qtip') ) {
            $tar.qtip('show');
            return false;
        }

        // otherwise, we can assume that we need to init the tooltip...
        $tar.qtip({
            content: $cont,
            position:{
                my: 'left middle',
                at: 'right middle',
                container: this.$el.find('.imageUploadPreviewContainer'),
                viewport: this.$el.find('.imageUploadPreviewContainer'),
                adjust: {
                    method: 'shift none',
                    effect: false
                }
            },
            show:{
                event:'click',
                ready:true
            },
            hide:{
                event:'unfocus',
                fixed:true,
                effect:false
            },
            events:{
                show: function(e,api) {
                    if( api.elements.target.hasClass('disabled') ) {
                        e.preventDefault();
                    }
                },
                hide: function(e,api) {
                    api.elements.tooltip.find('.globalerrors').remove();
                }
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light replaceImageTip',
                padding: 0,

                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });

        // ...and the file upload form
        $replaceForm.fileupload({
            url: G5.props.URL_JSON_COMMUNICATION_UPLOAD_IMAGES,
            dataType: 'g5json',
            formData: {
                sizes: [size]
            },
            beforeSend: function() {
                $tar.qtip('hide');
                $tar.attr('disabled', 'disabled').addClass('disabled');
                G5.util.showSpin($preview.find('.module-liner'), {cover:true});
            },
            done: function(e, data) {
                var $form = $(e.target),
                    $tar = $(e.target).closest('.ui-tooltip').qtip().elements.target,
                    $module = $tar.closest(".module"),
                    messages = data.result.data.messages[0];

                //error validation
                if( !G5.util.formValidateHandleJsonErrors($form, data.result.data.messages) ) {
                    G5.util.hideSpin($preview.find('.module-liner'));
                    $tar.removeAttr('disabled').removeClass('disabled').qtip('show');
                    return false;
                }

                if( messages.images.length ) {
                    var newImg = messages.images[0],
                        toReplace = _.where(that.images, {size: newImg.size})[0];

                    if( toReplace ) {
                        that.images[_.indexOf(that.images, toReplace)] = newImg;
                    }

                    G5.util.hideSpin($module.find('.module-liner'));
                    $module.find('img').attr('src', newImg.imageUrl);
                    $tar.removeAttr('disabled').removeClass('disabled');
                }
            }
        });
    },

    handleSave: function(e) {
        if( this.options.formData.sizes.length == this.images.length ) {
            this.trigger('saveImages', this.images);
            this.hideModal();
        }
    },

    handleCancel: function(e) {
        var $tar = $(e.currentTarget),
            $cancelDialog = this.$el.find('.uploadCancelConfirm');

        if(!this.images || this.images.length <= 0 || _.isEqual(this.images, this.preloadedImages)) {
            this.hideModal(e);
            return;
        }

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cancelDialog, this.$el, this.$el);
        }
        $tar.qtip('show');
    },

    handleCancelConfirm: function(e) {
        this.handleReplaceAllImages(e);
        this.hideModal();
    },

    extractPreviewData: function (data) {
        var extracted = {};

        extracted.modules = [];

        _.each(data.images, function (message) {
            if (message.size === "page") {
                extracted.page = {
                    imageUrl: message.imageUrl,
                    size: message.size
                };
            }
            else { // assume module size
                extracted.modules.push({
                    imageUrl: message.imageUrl,
                    size: message.size
                });
            }
        });

        return extracted;
    },

    showModal: function(data) {
        if(data && data.images && data.images.length) {
            this.preloadedImages = data.images;
            data = this.extractPreviewData(data);
            this.handleImageUpload(data);
        }
        else {
            this.handleReplaceAllImages();
        }

        this.$el.modal('show');
    },

    hideModal: function(e) {
        this.$el.modal('hide');
    },

    attachPopover: function($trig, cont, $container, $viewport){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'right center',
                at: 'left center',
                container: $container,
                viewport: $viewport || $(window),
                adjust: {
                    method: 'shift none'
                }
            },
            show:{
                event:false,
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
    }

});
