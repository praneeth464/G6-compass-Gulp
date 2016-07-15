/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
console,
$,
_,
G5,
PageView,
LoginPageFirstTimeView:true
*/
LoginPageFirstTimeView = PageView.extend({
        //override super-class initialize function
    initialize : function(opts) {
        console.log("[Info] SelfEnrollmentLoginPageFirstTimeView initialized", this);
        var self = this;
        //set the appname (getTpl() method uses this)
        this.appName = 'loginFirstTime';
        //Path to ID generated from server side
        this.generatedIdUrl = G5.props.URL_JSON_SELFENROLLMENT_GENERATE_USERID;
        //Path to duplicate Id check
        this.checkUserIdUrl = G5.props.URL_JSON_SELFENROLLMENT_CHECK_USERID;
        //Path to country location info
        this.locationsUrl = G5.props.URL_JSON_SELFENROLLMENT_LOCATIONS;
        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);
        if ($('#selfEnrollmentFirstTimeLoginPageForm').length > 0) {
            this.pageType = "selfEnrollment";
        } else if ($('#firstTimeLoginPageForm').length > 0) {
            this.pageType = "firstTimeLogin";
        }
        //definitions for validation
        this.$countryPhoneOptions = this.$el.find("#countryPhoneCode");
        this.$countryPhoneCode = this.$el.find("#countryPhoneCode :selected");
        this.$phoneNumberElm = this.$el.find("#phoneNumber");
        this.$primaryPhoneType = this.$el.find("#phoneType");
        this.$emailType = this.$el.find("#emailType");
        this.$emailElm = this.$el.find("#emailAddress");

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.synchPageTop();

        this.checkForFirstField();

        this.isIE = this.checkIE();

        this.isID();
        // datepickers
        this.$el.find('.datepickerTrigger').datepicker();

        //Check for  Hidden Errors
        this.checkForServerErrors();
        //Set Phone and EmailAddress inputs.
    },

    events: {
        "click .nextSectionBtn": "scrollNext",
        "click .nextandClearSectionBtn": "scrollandClearNext",
        "click #submitBtn" : "submitTheForm",
        "click .selectTextAlerts": "selectTextAlerts",
        "click .generateId" : "generateId",
        "blur #userName" : "checkId",
        "change #selectCountry" : "updateLocations",
        "change #firstName" : "isID",
        "change #lastName" : "isID",
        "change #phoneType" : "checkPhoneInputs",
        "change #countryPhoneCode" : "checkPhoneInputs",
        "change #emailType" : "checkEmailAddress"
    },

    synchPageTop: function() {
        this.$el.find("fieldset").first().addClass("first");
    },

    checkForServerErrors: function() {
        var $check = $('#ssn'), $errors = $('.errors div'), $selected, selector, i;
        if ($check && $check.length) {
            console.log("Errors: ", $errors);
            for (i = $errors.length - 1; i >= 0; i -= 1) {
                $selected = $errors[i].getAttribute('data-error-field');
                console.log('Data test: ', $selected);
                selector = $('[name="' + $selected + '"]');
                if (selector && selector.length) {
                    //G5.util.formValidate($('[name="'+$selected+'"]'));
                } else {
                    $('#serverReturnedErrored').after($errors[i]);
                }
                $("#firstTimeLoginErrorBlock").slideDown('fast'); //show error block
                $('.firstTimeLoginFieldSet').show(); //show all fields
                $(".nextSectionBtn").hide(); //hide all continue buttons
                $("#submitBtn").closest('.form-actions').show(); //show submit button
                this.showUploadedPhoto(); //show previously uploaded photo
            }

        } else {
            if ($("#serverReturnedErrored").val() === "true") {
                $("#firstTimeLoginErrorBlock").slideDown('fast'); //show error block
                $('.firstTimeLoginFieldSet').show(); //show all fields
                $(".nextSectionBtn").hide(); //hide all continue buttons
                $("#submitBtn").closest('.form-actions').show(); //show submit button
                this.showUploadedPhoto(); //show previously uploaded photo
            }
        }

        this.checkPhoneInputs();
        this.checkEmailAddress();
    },

    checkForFirstField: function() {
        //all the fieldsets in the html are conditionally there or not, this function checks to see which of them is first.
        var $firstField = $('body').find("fieldset").filter(".firstTimeLoginFieldSet").first(),
            $nextTarget;
        if (!$firstField.is(":visible")) {
            //if first field is not visible
            $nextTarget = $firstField.next('.firstTimeLoginFieldSet');
            $firstField.show();
            this.initFieldset($firstField);
            if ($nextTarget.val() === undefined) {
                //there is only one section
                $firstField.find(".nextSectionBtn").hide(); //hidde continue button
                $("#submitBtn").closest('.form-actions').show(); //and show the submit button
            }
        }
    },

    scrollNext : function(event) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;
        var that = this,
            $target = $(window.event ? window.event.srcElement : event ? event.target : null),
            $targetParent = $target.closest('.firstTimeLoginFieldSet'),
            $nextTarget = $targetParent.next('.firstTimeLoginFieldSet'),
            $validateTargets = $targetParent.find(".validateme");

        if (G5.util.formValidate($validateTargets)) {
            $target.hide(); //hide the continue button from the current section (changed from fadeOut to prevent a goofy jump)
            $nextTarget.slideDown(G5.props.ANIMATION_DURATION, function() {
                $(document).scrollTo($nextTarget, G5.props.ANIMATION_DURATION, {axis : 'y'}); //slide down the next section and scroll to it
                if ($nextTarget.next(".firstTimeLoginFieldSet").val() === undefined) { //check if there's another section
                    $nextTarget.find(".nextSectionBtn").hide(); //if no next section, hide the continue button
                    $("#submitBtn").closest('.form-actions').show(); //and show the submit button
                }
                that.initFieldset($nextTarget);
            });
        }
    },
    scrollandClearNext : function(event) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;
        var self = this,
            $target = $(window.event ? window.event.srcElement : event ? event.target : null),
            $targetParent = $target.closest('.firstTimeLoginFieldSet'),
            $nextTarget = $targetParent.next('.firstTimeLoginFieldSet'),
            $validateTargets = $targetParent.find(".validateme");

        if ($("[name=TermsAndConditionsRadios]:checked").val() === "accept") {
            $('#termsAndConditions div.validateme').removeClass('validateme').addClass("validatemeoff");
            $target.hide(); //hide the continue button from the current section (changed from fadeOut to prevent a goofy jump)
            $targetParent.slideUp(G5.props.ANIMATION_DURATION, function() {
                $targetParent.hide();
            });
            $nextTarget.slideDown(G5.props.ANIMATION_DURATION, function() {
                $(document).scrollTo($nextTarget, G5.props.ANIMATION_DURATION, {axis : 'y'}); //slide down the next section and scroll to it
                if ($nextTarget.next(".firstTimeLoginFieldSet").val() === undefined) { //check if there's another section
                    $nextTarget.find(".nextSectionBtn").hide(); //if no next section, hide the continue button
                    $("#submitBtn").closest('.form-actions').show(); //and show the submit button
                }
                self.initFieldset($nextTarget);
            });
            self.checkPhoneInputs();
            self.checkEmailAddress();
        } else {
            $('#termsAndConditions validatemeoff').removeClass('validatemeoff').addClass("validateme");
            console.log('Not Valid:');
            G5.util.formValidate($validateTargets);
        }
    },
    initFieldset : function($fieldset) {
        // throw all the random initialization triggers in here, but try to keep the individual initialization processes in a separate method
        switch ($fieldset.attr('id')) {
        case "personalInfo":
            this.initPersonalInfo();
            break;
        case "myPreferences":
            this.initMyPreferences();
            break;
        default:
            return;
        }
    },

    initPersonalInfo : function() {
        var that = this,
            $photoInput = $("#profilePicUpload"),
            $imgElm = $photoInput.siblings("img"),
            loadSpinner = function() {
                var opts = {
                        lines: 13, // The number of lines to draw
                        length: 7, // The length of each line
                        width: 3, // The line thickness
                        radius: 6, // The radius of the inner circle
                        corners: 1, // Corner roundness (0..1)
                        rotate: 0, // The rotation offset
                        color: '#000', // #rgb or #rrggbb
                        speed: 1, // Rounds per second
                        trail: 60, // Afterglow percentage
                        shadow: false, // Whether to render a shadow
                        hwaccel: false, // Whether to use hardware acceleration
                        className: 'spinner', // The CSS class to assign to the spinner
                        zIndex: 2e9, // The z-index (defaults to 2000000000)
                        top: 15, // Top position relative to parent in px 30
                        left: 12 // Left position relative to parent in px 39
                    };

                if (that.isIE) {
                    opts.top += 60;
                }

                $("#personalInfo").spin(opts);
            };

        $photoInput.fileupload({
            url: G5.props.URL_JSON_FIRST_TIME_LOGIN_PHOTO_UPLOAD,
            dataType: 'g5json',
            beforeSend: function() {
                loadSpinner();
            },
            done: function(e, data) {
                console.log('[INFO] uploadPicture finished.');
                if (data.result.data.properties.isSuccess === true) {
                    console.log('[INFO] Server response: (success)', data);
                    var thumbNail = data.result.data.properties.avatarUrl;

                    $("#personalInfo").spin(false); //stop the spinner

                    $imgElm.attr("src", thumbNail).fadeIn();

                } else {
                    $("#personalInfo").spin(false); //stop the spinner
                    console.log('[ERROR] server failure:' + data.result.data.messages[0].text);
                    alert(data.result.data.messages[0].text);
                }
            }
        });
    },

    initMyPreferences: function() {
        var that = this,
            $textAlertWrapper = this.$el.find('#allTextAlertsWrapper'),
            $conditionalFields = this.$el.find('#telephoneCountryCode, #phoneNumber, #txtAlertTerms'),
            somethingChecked = $textAlertWrapper.find('input:checked').length ? true : false;

        $conditionalFields
            .prop('disabled', !somethingChecked)
            .closest('.validateme').each(function() {
                G5.util.formValidateMarkField('valid', $(this));
                $(this).removeClass('validateme');
            });

        $textAlertWrapper.find('input').one('change', function() {
            that.initMyPreferences();
        });
    },

    selectTextAlerts: function(e) {
        e.preventDefault();
        var $textAlertWrapper = this.$el.find('#allTextAlertsWrapper');

        $textAlertWrapper.find('input').prop('checked', $(e.target).hasClass('selectAll'));
        this.initMyPreferences();
    },
    validateTextAlerts: function() {
        var validAlertSettings = true,
            $myPreferencesWrapper = this.$el.find('#myPreferences'),
            $textAlertWrapper = this.$el.find('#allTextAlertsWrapper'),
            $phoneNumber = this.$el.find('#phoneNumber'),
            $txtAlertTerms = this.$el.find('#txtAlertTerms'),
            somethingChecked = $textAlertWrapper.find('input:checked').length ? true : false;

        // if this section doesn't exist on the page, kick out.
        if( !$myPreferencesWrapper.length ) {
            return validAlertSettings;
        }

        // if we're in the first time login page
        if ( this.pageType == "firstTimeLogin" ) {
            // if anything is checked, we have to validate the phone number and terms checkbox and return the result
            if( somethingChecked ) {
                $phoneNumber.closest('.control-group').addClass('validateme');
                $txtAlertTerms.closest('.control-group').addClass('validateme');
                validAlertSettings = G5.util.formValidate($myPreferencesWrapper.find('.validateme'));
            }
            // if nothing is checked, clear out any leftover validation messages on the fields and return true
            else {
                $myPreferencesWrapper.find('.validateme').each(function() {
                    G5.util.formValidateMarkField('valid', $(this));
                    $(this).removeClass('validateme');
                });
                validAlertSettings = true;
            }
        }

        // return the validation results
        return validAlertSettings;
    },
    checkPhoneInputs : function() {
        var self = this;
        //Check form type, if user is on selfEnrollment page, the phoneNumber has diffrent validation rules than on the firstTimeLogin page.
        if (self.pageType == "selfEnrollment") {
            self.$countryPhoneCode = self.$el.find("#countryPhoneCode :selected");
            self.$phoneNumberElm = self.$el.find("#phoneNumber");
            if (self.$primaryPhoneType.val() !== null && self.$primaryPhoneType.val() !== undefined && self.$primaryPhoneType.val() !== '') {
                self.$countryPhoneOptions.prop('disabled', false);
                if (self.$countryPhoneCode.val() !== null && self.$countryPhoneCode.val() !== undefined && self.$countryPhoneCode.val() !== '') {
                    self.$phoneNumberElm.prop('disabled', false);
                } else {
                    self.$phoneNumberElm.val('').prop('disabled', true);
                }
            } else {
                self.$countryPhoneOptions.prop('disabled', true);
                self.$phoneNumberElm.val('').prop('disabled', true);
            }
        }
    },
    checkEmailAddress : function() {
        var self = this;
        self.$emailType = self.$el.find("#emailType :selected");
        self.$emailAddressElm = self.$el.find("#emailAddress");
        //Check form type, if user is on selfEnrollment page, the phoneNumber has diffrent validation rules than on the firstTimeLogin page.
        if (self.pageType == "selfEnrollment") {
            if (self.$emailType.val() !== null && self.$emailType.val() !== undefined && self.$emailType.val() !== '') {
                self.$emailAddressElm.prop('disabled', false);
            } else {
                self.$emailAddressElm.prop('disabled', true);
            }
        }
    },
    checkIE: function() {
        var isIE = false;

        if ($.browser.msie) {
            isIE = true;
        }

        return isIE;
    },

    showUploadedPhoto: function() {
        //if the server returns with errors, this will show their photo if they had already uploaded one
        var $photoUrl = this.$el.find("#previousPhotoUrl").val(),
            $thumbnail;
        if ($photoUrl !== undefined && $photoUrl !== "") {
            $thumbnail = this.$el.find("#profilePicUpload").siblings("img");
            $thumbnail.attr("src", $photoUrl);
        }
    },
    getEnabledInputs: function() {
        var $validate = this.$el.find(".validateme")
                            .filter(function() {
                                return $(this).find('input, select').prop('disabled') !== true;
                            });
        return $validate;
    },
    getDisabledInputs: function() {
        var $unvalidate = this.$el.find('.validateme.error')
                              .filter(function() {
                                  return $(this).find('input, select').prop('disabled') === true;
                              });
        return $unvalidate;
    },

    submitTheForm: function(e) {
        var self = this;
        if (self.checkFormTypes() === false) {
            e.preventDefault();
            return false;
        }
    },

    checkFormTypes: function() {
        var textAlertsValid = true,
            allValid = true;

        textAlertsValid = this.validateTextAlerts();
        if (!textAlertsValid) {allValid = false;}

        G5.util.formValidate(this.getEnabledInputs());

        this.getDisabledInputs().each(function() {
            G5.util.formValidateMarkField('valid', $(this));
        });

        if ($('.validateme.error').length >= 1){
            allValid = false;
        }
        return allValid;
    },
    generateId: function(e) {
        var $locs = this.$el.find('#userName'),
            locUrl = this.generatedIdUrl,
            firstName = $.trim($('#firstName').val()),
            lastName = $.trim($('#lastName').val()),
            params = {"firstName": firstName, "lastName": lastName};
        $.ajax({
            url : locUrl,
            type : 'post',
            data : params,
            dataType : 'g5json'
        }).done(function(data, textStatus, jqXHR) {
            //var mess = data.data.messages;
            console.log("[INFO] SelfEnrollmentLoginPageFirstTimeView: generateId ajax post sucess: ", data.data);
            $locs.val(data.data.userName);
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log("[ERROR] SelfEnrollmentLoginPageFirstTimeView: ", textStatus + ' (' + errorThrown + ') URL:' + locUrl);
            //guess we can just leave it disabled
        });
    },
    checkId: function(e) {
        var $locs = this.$el.find('#userName'),
            locUrl = this.checkUserIdUrl,
            username = $.trim($('#userName').val()),
            params,
            $form = $(e.target).closest('form'),
            $trigger = $form.data('trigger') || $("button:submit").filter(":visible");
        if (username !== '') {
            params = {"userName" : username};
            $.ajax({
                url : locUrl,
                type : 'post',
                data : params,
                dataType : 'g5json'
            }).done(function(data, textStatus, jqXHR) {
                //var mess = data.data.messages;
                console.log("[INFO] SelfEnrollmentLoginPageFirstTimeView: generateId ajax post sucess: ", data.data);
                //$locs.val(data.data.userName);

                if (data.data.messages.length <= 1) {
                    G5.util.formValidateHandleJsonErrors($form, data.data.messages);
                    return false;
                }

            }).fail(function(jqXHR, textStatus, errorThrown) {
                console.log("[ERROR] SelfEnrollmentLoginPageFirstTimeView: ", textStatus + ' (' + errorThrown + ') URL:' + locUrl);
                //guess we can just leave it disabled
            });
        }
    },
    isID : function() {
        if ($.trim($('#firstName').val()) === '' || $.trim($('#lastName').val()) === '') {
            $('.generateId').attr("disabled", "disabled");
        } else {$('.generateId').removeAttr("disabled"); }
    },
    updateLocations: function() {
        var self = this,
            $locs = this.$el.find('select#selectState'),
            oldLocVal = $locs.val(),
            $c = this.$el.find('select#selectCountry'),
            cVal = $c.val(),
            cKey = $c.attr('name'),
            locUrl = this.locationsUrl,
            params = {},
            enableLocs = function() {$locs.removeAttr('disabled'); },
            ajaxReq;

        // if country select is disabled, don't update locs
        if ($c.attr('disabled')) {
            return; //exit
        }

        params[cKey] = cVal;

        $locs.empty().append('<option>...</option>').attr('disabled', 'disabled');
        console.log($locs);
        ajaxReq = $.ajax({
            url : locUrl,
            type : 'post',
            data : params,
            dataType : 'g5json'
        }).done(function(data, textStatus, jqXHR) {
            var locs = data.data.locations;
            $locs.empty();
            enableLocs();

            _.each(locs, function(l) {
                $locs.append('<option value="' + l.code + '">' + l.name + '</option>');
            });

            // if there was a selected loc (validation error edit)
            if (oldLocVal) { $locs.val(oldLocVal); }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('[ERROR] ManagerToolkitPageRosterEditView: '
                + textStatus + ' (' + errorThrown + ') URL:' + locUrl);
            //guess we can just leave it disabled
        });

    }
});