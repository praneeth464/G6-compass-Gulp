/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
PageView,
TemplateManager,
SSIParticipantSubmitClaimModel,
SSIParticipantSubmitClaimPageView:true
*/
SSIParticipantSubmitClaimPageView = PageView.extend({

    //init function
    initialize: function(opts){

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

        //template names
        this.tpl = 'ssiSubmitClaimFormTpl';
        this.tplPath = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';

        this.model = new SSIParticipantSubmitClaimModel({});

        this.actNum = 2;

        this.model.loadData();

        this.setupEvents();

    },

    events: {
        "click .ssiClaimFileUpload": "attachDocument",
        "click .removeLink": "updateAttachment",
        "change #country": "updateAddressFields",
        //These need to be capital classes because of the way BE his sending the JSON name attribute.
        //Ideally there would be a separate attribute to indicate if it's a decimal and needs special validation.
        "keyup .Quantity, .Amount input": "validateNumericInput",
        "click .ssiFileUploadWrap .icon-info-sign": "docInfoPopover",

        //form actions
        "click .ssiClaimFormPreview": "storeFormData",
        "click .ssiClaimFormEdit": "editForm",
        "click .ssiClaimFormSubmit": "submitForm",
        "click .ssiClaimFormCancel": "confirmCancel",
        "click .ssiClaimDialogConfirm": "cancelSave",
        "click .ssiClaimDialogCancel": function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    setupEvents: function(){
        this.model.on('loadDataFinished', this.render, this);

        this.on('error:genericAjax', this.handleAjaxError, this);
        this.model.on('error:genericAjax', this.handleAjaxError, this);
    },

    render: function(){
        var that = this,
            $cont = this.$el.find('#ssiClaimFormTpl');

        TemplateManager.get(this.tpl, function(tpl, vars, subTpls) {
            that.subTpls = subTpls;

            $cont.empty().append(tpl(that.model.toJSON()));

            that.$el.find('.datepickerTrigger').datepicker({ endDate: '+0d' });

            that.$el.find('.addressGroup:not(.country)').hide();

        }, this.tplPath);
    },

    updateAddressFields: function(e){
        var $tar = $(e.currentTarget),
            $value = $tar.val(),
            $address3 = this.$el.find('.address3'),
            northAmerica = ['ca' , 'us' , 'mx'];

        if($tar.find('option:selected').hasClass('defaultOption')){
            this.$el.find('.addressGroup:not(.country)').hide();
            return;
        }

        this.$el.find('.addressGroup').show();

        if(  _.contains( northAmerica, $value ) ) {

            $address3.hide();
            this.populateStateList( $value );

        } else {
            this.$el.find('.state').hide();
        }
    },

    populateStateList: function(countryCode){
        var list = this.$el.find('.state option');

        _.each( list, function(opt) {
            $(opt).hide();

            if( $(opt).hasClass( countryCode ) ){
                $(opt).show();
            }
        });
    },

    validateNumericInput: function(e) {
        // ^-?(\d{1,9})?(\.\d{0,4})?$
        var $tar = $(e.target),
            v = $tar.val(),
            decPlaces = this.model.get('measureActivityIn') == 'currency' ? '2' : '4',
            reStr = "^-?(\\d{1,9})?(\\.\\d{0,"+(decPlaces)+"})?$",
            regEx = new RegExp(reStr);

        if(!regEx.test(v)) {
            // if not matching our regex, then set the value back to what it was
            // or empty string if no last val
            $tar.val($tar.data('lastVal') || '');
        } else {
            // store this passing value, we will use this to reset the field
            // if a new value doesn't match
            $tar.data('lastVal', v);
        }

    },

    previewForm: function(params){
        var $previewBtns = this.$el.find('.ssiClaimPreviewActions'),
            $previewCont = this.$el.find('.ssiClaimPreviewView'),
            $form = this.$el.find('#ssiClaimFormTpl'),
            $formBtns = this.$el.find('.ssiClaimFormActions');

        $previewCont.show();
        $previewBtns.show();
        $form.hide();
        $formBtns.hide();

        _.each(params, function(key, value){
            if(key === ""){
                key = '&nbsp';
            }

            $previewCont.find('dl')
                        .append('<dt>'+value+ '</dt> <dd>'+key+'</dd>');
        });

    },

    storeFormData: function(e){
        var $form = this.$el.find('.ssiPaxSubmitClaimForm'),
            arr = $form.serializeArray(),
            params = {},
            view = this;

        e.preventDefault();

        if(this.validateForm($form)){
            _.each(arr, function(el){
                var value = _.values(el),
                    dispName = view.$el.find('[name="' + value[0] + '"]').data('displayName'),
                    dispVal = view.$el.find('[name="' + value[0] + '"] option:selected').attr('name'),
                    fileDisp = view.$el.find('[name="' + value[0] + '"]').siblings('.ssiClaimDocDisplay').html(),
                    visibleDisp = view.$el.find('[name="' + value[0] + '"]').is(":visible");

                if(!dispName || !visibleDisp) return false;

                //was super nice each loop until we had to check for different data. Two below IF statements grab a separate value for display of select option name and file name.
                if(dispVal){
                    value[1] = dispVal;
                }

                if(fileDisp){
                    value[1] = fileDisp;
                }

                params[dispName] = value[1];
            });

            this.previewForm(params);
        }
    },

    editForm: function(e){
         var $previewBtns = this.$el.find('.ssiClaimPreviewActions'),
            $previewCont = this.$el.find('.ssiClaimPreviewView'),
            $form = this.$el.find('#ssiClaimFormTpl'),
            $formBtns = this.$el.find('.ssiClaimFormActions');

        e.preventDefault();

        $previewCont.hide().find('dl').empty();
        $previewBtns.hide();
        $form.show();
        $formBtns.show();

    },

    docInfoPopover: function(e){
        var $tar = $(e.target),
            $cont = this.$el.find('.ssiAttachDocInfoPopover');

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont);
        }
    },

    attachPopover: function($trig, cont){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: "left center",
                at: "right center",
                container: this.$el,
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
                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });

    },

    attachDocument: function(e){
        var $form = this.$el.find('#ssiClaimDocUpload'),
            $tar = $(e.currentTarget),
            $inp = $tar.parents().find('#ssiClaimDoc'),
            that = this,
            startSpin = function() {
                G5.util.showSpin(that.$el.find('.ssiFileUploadWrap'));
            },
            stopSpin = function() {
                G5.util.hideSpin(that.$el.find('.ssiFileUploadWrap'));
            };

        if(!$tar.data('qtip')){
            this.attachPopover($tar, this.$el.find('.ssiClaimAddDocPopover'));

            $form.fileupload({
                url: G5.props.URL_JSON_SSI_CLAIM_UPLOAD_DOCUMENT,
                dataType: 'g5json',
                beforeSend: function(){
                    $tar.qtip('hide');
                    startSpin();
                },
                done: function(e, data) {
                    var msg = data.result.data.messages[0];

                    if(msg.isSuccess){
                        $inp.html('');
                        that.updateAttachment(msg.docURL, msg.description);
                    }else {
                        var $m = that.$el.find('.contestErrorsModal'),
                            $l = $m.find('.errorsList');

                        $l.empty().append('<li>' + msg.text + '</li>');

                        $m.modal();
                    }
                    stopSpin();
                }
            });
        }
    },

    updateAttachment: function (url, name){
        var $attachCont = this.$el.find('.ssiClaimDocDisplayWrap'),
            $attach = $attachCont.find('.ssiClaimDocDisplay'),
            $hiddenInp = this.$el.find('#ssiClaimDocHidden'),
            $hiddenInpDesc = this.$el.find('#ssiClaimDocHiddenDesc'),
            $removeLink = $attachCont.find('.removeLink'),
            $browseBtn = this.$el.find('.ssiClaimFileUpload');

        if(!url.currentTarget){
            $attach.html('<a href="'+url+'" target="_blank">'+name+'</a>');
            $hiddenInpDesc.val(name);
            $hiddenInp.val(url);
            $attachCont.show();
            $removeLink.show();
            $browseBtn.hide();
        } else {
            $attach.html('');
            $attachCont.hide();
            $hiddenInp.val('');
            $removeLink.hide();
            $browseBtn.show();
        }
    },

    confirmCancel: function(e){
        var $tar = $(e.target),
            $cont = this.$el.find('.ssiClaimCancelConfirm');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont);
        }
    },

    cancelSave: function(e){
        var $tar = $(e.target),
            url = $tar.data('url');

        e.preventDefault();

        if(url) {
            window.location = url;
        }

    },

    handleAjaxError: function(error) {
        var $m = this.$el.find('.contestErrorsModal'),
            $l = $m.find('.errorsList');

        if(!_.isArray(error) && error.text) {
            error = [error]; // make it an array
        }

        $l.empty();

        _.each(error, function(e) {
            $l.append('<li>' + e.text + '</li>');
        });

        $m.modal();
    },

    validateForm: function(form){
        var $form = form;

        if(!G5.util.formValidate($form.find('.validateme'))) {
            var $valTips = $form.find('.validate-tooltip:visible');
            // if val tips, then we have errors
            if($valTips.length) {
                return false;
            } else {
                return true;
            }
        }else {
            return true;
        }
    },

    submitForm: function(e){
        var $form = this.$el.find('.ssiPaxSubmitClaimForm'),
            $tar = $(e.target),
            url = $form.attr('action'),
            data = $form.serialize(),
            that = this;

        e.preventDefault();

        this.model.ajaxGeneric(url, data, function(data){
            G5.util.showSpin(that.$el, { cover: true });

            $tar.attr('disabled', 'disabled');

            if(data.forwardUrl) {
                window.location = data.forwardUrl;
            }
        });
    }
});
