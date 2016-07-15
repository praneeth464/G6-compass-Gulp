/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
alert,
$,
_,
G5,
Backbone,
Modernizr,
TemplateManager,
RecognitionEzView:true
*/
RecognitionEzView = Backbone.View.extend({

    //override super-class initialize function
    events: {
        'click   #EZModuleCommentCheckSpell'    : 'toggleLanguageDropdown',
        'click   #ezRecognitionContinueBtn'     : 'postComplexRecognition',
        'click   #ezRecognitionCardBtn'         : 'postComplexRecognition',
        'keyup   .recognition-comment'          : 'updateCharacterCount',
        'change  #ezRecognitionPromotionSelect' : 'onChangePromotion',
        'click   .lang'                         : 'setSpellCheckLang',
        'click   #ezRecognitionSendBtn'         : 'postRecognition',
        'click   #ezRecognitionCancelBtn'       : 'resetModule',
        'click   #ezRecChangeRecipLink'         : 'resetModule'
    },
    initialize: function(opts) {
        /*
         *
         * Takes the passed options and stores them in the view for later use.
         *
         */

        // console.log("initialized", opts);

        if (!Modernizr.input.placeholder) {
            this.$el.find('input, textarea').placeholder();
        }

        this.close     = opts.close;

        this.recipient = opts.recipient;

        this.loadRecipientInfo();
    },
    loadRecipientInfo: function() {
        /*
         *
         * Takes the selected recipient and passes it's information to
         * the server, waits for a response, and passes that data on
         * to be templated.
         *
         * [1] Passed information.
         *
         * [2] Ajax request for recipent recognition form JSON.
         *
         */

        var self            = this,
            activeRecipient = this.recipient, // [1]
            requestedData   = null;

        requestedData = $.ajax({ // [2]
            dataType   : 'g5json',
            type: "POST",
            url        : G5.props.URL_JSON_EZ_RECOGNITION_MEMBER_INFO,
            data       : {
                            recipientId     : activeRecipient.id,
                            recipientNodeId : activeRecipient.nodes[0].id
                         },
            beforeSend : function() {
                // add a dataLoading class to the modal while we wait
                self.$el.addClass('dataLoading');
                G5.util.showSpin(self.$el);
            },
            success : function( serverResp ) {
                // remove the dataLoading class from the modal
                self.$el.removeClass('dataLoading');
                console.log("[INFO] RecognitionEzView: submitRecipient ajax call successfully returned this JSON object: ", serverResp);
                self.renderRecipientRecognitionForm(serverResp.data);
                self.promotions = serverResp.data.promotions;
            },
            error : function( jqXHR, textStatus, errorThrown ) {
                console.log("[ERROR] requestPromotionList: ", jqXHR, textStatus, errorThrown);
                self.resetModule();
            },
            complete: function( jqXHR, textStatus ) {
                console.log("[INFO] RecognitionEzView: submitRecipient ajax call completed");
                G5.util.hideSpin(self.$el);
                self.trigger("loadComplete", jqXHR, textStatus); // broadcast status
            }
        });

        requestedData.fail(function(jqXHR, textStatus) {
            console.log( "[INFO] EZRecognitionCollection: requestPromotionList Request failed: " + textStatus );
        });
    },
    updateRecipient: function(recipient) {
        /*
         *
         * Takes the new recipient and resets the view.
         *
         * [1] Passed information.
         *
         */

        this.recipient = recipient; // [1]

        this.loadRecipientInfo();
    },
    renderRecipientRecognitionForm: function(info) {
        var self            = this,
            tplName         = 'recognitionModuleFlipSide',
            tplUrl          = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'recognition/tpl/',
            recipientInfo   = info.recipientInfo[0],
            activeRecipient = this.recipient,
            data = {
                recipientNodeId : activeRecipient.nodes[0].id,
                recipientId     : activeRecipient.id,
                recipNodesObj   : JSON.stringify(activeRecipient.nodes),

                department      : recipientInfo.departmentName,
                countryCode     : recipientInfo.countryCode,
                countryName     : recipientInfo.countryName,
                firstName       : recipientInfo.firstName,
                profilePicURL   : recipientInfo.avatarUrl,
                lastName        : recipientInfo.lastName,
                orgName         : recipientInfo.orgName,
                title           : recipientInfo.jobName,
                location        : recipientInfo.city,

                hasPromotions   : info.promotions && info.promotions.length,
                hasOnePromotion : info.promotions && info.promotions.length == 1,
                hasOrgUnits     : info.nodes && info.nodes.length > 1, // if only one, then hidden input is used
                promotions      : info.promotions,
                orgUnits        : info.nodes,

                spellChecker    : _.chain(G5.props.spellCheckerLocalization) // document this
                                    .map(function( value, name ) {
                                        return {
                                            "langTitle" : value.menu,
                                            "lang"      : name
                                        };
                                    })
                                    .filter(function( obj ) {
                                        return _.indexOf(G5.props.spellCheckerLocalesToUse, obj.lang) !== -1;
                                    })
                                    .sortBy(function( obj ) {
                                        return obj.langTitle;
                                    })
                                    .value()
            };

        TemplateManager.get(tplName, function(tpl){
            self.$el.append(tpl(data));
            self.$el.find(".ezRecLiner").hide();
            self.trigger("templateReady"); // broadcast status

            self.$el.find("#ezRecognitionCommentBox, .ezRecFormBtnsWrapper:not(.empty)").hide();

            // check to see how many promotions there are. If just one, select it
            if( data.hasPromotions && data.promotions.length === 1 ) {
                self.$el.find('#ezRecognitionPromotionSelect option:last').prop('selected','selected');
                self.$el.find('#ezRecognitionPromotionSelect').change();
            }
        }, tplUrl);
    },
    onChangePromotion: function( event ) {
        console.log("--------------  onChangePromotion  --------------");
        console.log("change promotion called", event);
        console.log("-------------- /onChangePromotion  --------------");

        /*
         *
         * Actions to be taken when the promotion drop down is changed
         *
         * [1] $selected.data() returns: { settings.iseasy : boolean, settings.hasecard : boolean, settings.hascomments : boolean }
         *     However, IE7 has issues when calling .data() without a passed parameter.
         *     This is the cleanest way to make it work for all browsers.
         *
         */

        var $selected  = $(event.currentTarget).find(":selected"),
            settings   = (function(){ // [1]
                            return {
                                "hascomments" : $selected.data("hascomments"),
                                "hasecard"    : $selected.data("hasecard"),
                                "iseasy"      : $selected.data("iseasy")
                            };
                         }()),
            $formParts = this.$el.find("#ezRecognitionCommentBox, .ezRecFormBtnsWrapper:not(.empty)");

        if ( $selected.val() !== '' ) {

            $formParts.show();

            this.$el.find("#ezRecognitionCardBtn")[ settings.iseasy ? "show" : "hide" ]();
            this.$el.find("#ezRecognitionSendBtn")[ settings.iseasy ? "show" : "hide" ]();
            this.$el.find("#ezRecognitionContinueBtn")[ !settings.iseasy ? "show" : "hide" ]();
            this.$el.find("#ezRecognitionCommentBox")[ settings.hascomments ? "show" : "hide" ]();

            this.setRecognitionValue("promotionId", $selected.val())
                .setRecognitionValue("hasECard", settings.hasecard);

        } else {
            $formParts.hide();
        }
    },
    updateCharacterCount: function(event) {
        /*
         *
         * Updates Remaining Character counter in view.
         *
         */

        var $textarea = $(event.currentTarget),
            $counter  = this.$el.find("#ezRecharCount"),
            charCount = $textarea.val().length,
            maxChars  = $textarea.data("max-chars"),
            remaining = maxChars - charCount;

        $counter.html(remaining);
    },
    postRecognition: function(event) {
        /*
         *
         * "EZ" form submission. Posts form information via ajax.
         *
         * [1] function to return the proper orgUnit
         *
         * [2] prevent multiple form submissions
         *
         */

        event.preventDefault();

        if ( !this.validateForm() ) {
            return false;
        }

        console.log("validation success");

        var self     = this,
            $btn     = $(event.currentTarget),
            dataSent = null,
            formParams = $(event.target).closest('form').serializeArray(),
            params   = {
                        recipientId : this.recipient.id,
                        comments    : this.$el.find("#ezRecognitionCommentBox textarea").val(),
                        promotionId : this.$el.find("#ezRecognitionPromotionSelect").val(),
                        nodeId      : null,
                        responseType: 'html'
                       };

        params.nodeId = (function(){ // [1]
                            var value     = null,
                                orgSelect = self.$el.find("#ezRecognitionOrgUnitSelect");

                            if ( orgSelect.length > 0 ) {
                                value = orgSelect.find(":selected").val();
                            } else {
                                value = self.$el.find("#singleOrgUnitId").val();
                            }

                            return value;
                        }());

        // convert the serialized array [{name:foo,value:bar},{name:fee,value:baz}] to two arrays of keys and values [foo,fee],[bar,baz] for the _.object() function and then convert to an object {foo:bar, fee:baz}
        formParams = _.object(_.pluck(formParams,'name'),_.pluck(formParams,'value'));
        params = $.extend({}, params, formParams);

        dataSent = $.ajax({
            type: "POST",
            url: G5.props.URL_JSON_EZ_RECOGNITION_SEND_EZRECOGNITION,
            data: params,
            dataType: "g5html",
            beforeSend: function() {
                $btn.button("loading"); // [2]
            },
            success: function(serverResp, status){
                // console.log("[INFO] EZRecognitionCollection: postEzRecognition ajax post successfully posted this JSON object: ", serverResp);
                console.log("[INFO] EZRecognitionCollection: server returned html");

                self.resetModule();

                var $serverResp = $('<div />', {
                                    "class" : "modal fade autoModal recognitionResponseModal",
                                    "html"  : serverResp
                                  });

                $serverResp.modal("show");
            },
            error: function(jqXHR, status) {
                alert("Server error: " + status);
            },
            complete: function() {
                $btn.button("reset");
            }
        });

        dataSent.fail(function(jqXHR, textStatus) {
            console.log( "[INFO] EZRecognitionCollection: postEzRecognition ajax post failed: " + textStatus, jqXHR );
        });
    },
    setRecognitionValue: function(name, value, callback) {
        /*
         *
         * Create or update hidden inputs used when submitting a complex recognition's
         * values to another page.
         *
         */

        var $form  = this.$el.find("#complexRecognition"),
            $input = $form.find("[name='" + name + "']"),
            createInput = function() {
                return $("<input />", {
                        "type" : "hidden",
                        "name" : name,
                        "id"   : name
                       }).appendTo($form);
            };

        if ( $input.length === 0 ) {
            console.log("create input");
            $input = createInput();
        }

        $input.val(value);

        if ( !!callback ) {
            callback.call(this);
        }

        return this;
    },
    postComplexRecognition: function(event) {
        /*
         *
         * Creates needed hidden inputs and triggers the form submit event.
         *
         * [1] Make sure check to see if the promotion allows comments
         *
         * [2] Set the nodeId value if the user has multiple orgUnits
         *
         */

        event.preventDefault();

        /* We don't need to validate when posting to the long form
        if ( !this.validateForm() ) {
            return false;
        }

        console.log("validation success");
        */

        var self           = this,
            $selectedPromo = this.$el.find("#ezRecognitionPromotionSelect :selected"),
            promoData      = $selectedPromo.data(),
            commentValue   = (function(){
                                if ( promoData.hascomments ) { // [1]
                                    return self.$el.find(".recognition-comment").val();
                                } else {
                                    return "";
                                }
                             }()),
            orgSelect      = self.$el.find("#ezRecognitionOrgUnitSelect");

        if ( orgSelect.length > 0 ) {
            this.setRecognitionValue("nodeId", orgSelect.find(":selected").val()); // [2]
        }

        this.setRecognitionValue("comments", commentValue, function() {
            this.$el.find("#complexRecognition").submit();
        });
    },
    validateForm : function() {

        this.allowOverflow(true);

        var $validate       = this.$el.find('.ezRecLiner .validateme'),
            promotionId     = this.$el.find("#ezRecognitionPromotionSelect :selected").val(),
            activePromotion = _.where(this.promotions, { id: parseInt( promotionId, 10 ) })[0];

        // if we aren't going to include comments, we shouldn't validate their existence
        if ( !activePromotion.attributes.commentsActive ) {
            $validate = $.grep($validate, function(el){
                return !($(el).find("#comments").length !== 0);
            });

            $validate = $($validate);
        }

        if( !G5.util.formValidate($validate) ) {
            return false;
        }

        this.allowOverflow(false);
        return true;
    },
    toggleLanguageDropdown: function(event) {

        var $btn  = $(event.currentTarget);

        this.allowOverflow( !$btn.hasClass('open') );
    },
    allowOverflow: function( allow ) {
        /*
         *
         * [1] Toggles class to show over flow on element so menus don't get cut off
         *
         */

        if ( !allow ) {
            this.$el.removeClass("hasOverflow"); // [1]
        } else {
            this.$el.addClass("hasOverflow"); // [1]
        }
    },
    setSpellCheckLang: function(event) {

        var self         = this,
            lang         = $(event.currentTarget).data("lang"),
            localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ lang ]),
            $commentBox  = this.$el.find("#ezRecognitionCommentBox textarea");

        if( !self.$el.find('#ezRecognitionCommentBox .badwordsContainer').length ) {
            self.$el.find("#ezRecognitionCommentBox").append('<div class="badwordsContainer"><div class="badwordsWrapper"><div class="badwordsContent" /></div></div>');
        }

        $commentBox
            .spellchecker({
                    url: G5.props.spellcheckerUrl,
                    lang: lang,
                    localization : localization,
                    engine: "jazzy",
                    suggestBoxPosition: "above",
                    innerDocument: false,
                    wordlist: {
                        action: "html",
                        element: self.$el.find('#ezRecognitionCommentBox .badwordsContent')
                    }
                })
            // and call the spellchecker
            .spellchecker("check", {
                callback : function(result){
                    if(result===true) {
                        self.$el.find('#ezRecognitionCommentBox .spellcheck-badwords').remove();
                        alert(localization.noMisspellings);
                    }
                    else {
                        self.$el.find('#ezRecognitionCommentBox .spellcheck-badwords')
                            .prepend('<strong>'+localization.menu+':</strong>')
                            .append('<a class="close"><i class="icon-remove" /></a>');
                    }
                },
                localization : lang
            });

        // add a click handler for the badwords box close
        this.$el.find('#ezRecognitionCommentBox').on('click', '.spellcheck-badwords .close', function() {
            self.$el.find('#ezRecognitionCommentBox .spellcheck-badwords').remove();
        });
    },
    resetModule: function(event) {
        if ( !!event ) {
            event.preventDefault();
        }

        this.close();
    }
});