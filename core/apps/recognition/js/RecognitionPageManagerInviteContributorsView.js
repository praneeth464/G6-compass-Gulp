/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
PageView,
ContributorsView,
RecognitionPageManagerInviteContributorsView:true
*/
RecognitionPageManagerInviteContributorsView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts) {
        //set the appname
        this.appName = 'recognition';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);


        //form prefix for array data (on struts generated form @ top of document)
        this.contribFormNamePrefix = 'claimContributorFormBeans';

        //dom elements
        this.$sendForm = this.$el.find('#sendForm');
        this.$dataForm = opts.$dataForm || this.$el.find('#dataForm');
        if (this.$dataForm.length === 0) {
            console.error('[ERROR] RecognitionPageSendView - no #dataForm set or found');
        }

        //form settings data
        this.formSettings = this.parseForm(this.$dataForm); //preset data (promo/node, recip, etc...)

        // do the deeds
        this.initForm();
        this.initContributorsSection();


    },

    events: {

        //action buttons
        "click #recognitionButtonSend": "submitForm",
        "click #recognitionButtonPreview": "submitForm",
        "click #recognitionButtonCancel": "cancelClick",
        "click #inviteContribsCancelDialogConfirm": "cancelForm",
        "click #inviteContribsCancelDialogCancel": function(e) {
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        },
        // contribs view tab nav
        "click .purlBtn.nextBtn": "doContribNextStep",
        "click .purlBtn.backBtn": "doContribBackStep"
    },

    // for contribs view
    getFormSettings: function() {
        return this.formSettings;
    },

    // for contribs view
    getPromoSetup: function() {
        var promoObj = {id: this.formSettings.promotionId};
        return promoObj;
    },

    // gross, reconstruct a face Recip.View for ContributorsView
    getRecipientView: function() {
        var rv = {};
        rv.model = new Backbone.Collection();
        if (this.getFormSettings().recipientId) {
            rv.model.add({id: this.getFormSettings().recipientId});
        }
        return rv;
    },

    // ===================
    // SECTION FUNCTIONS
    // ===================

    initForm: function() {

        // inherit any server errors from the dataForm
        this.inheritErrorsFromDataForm();

        // give the send form the same action as the struts form
        this.$sendForm.attr('action', this.$dataForm.attr('action'));

        // use method from struts in send form
        if (this.formSettings.method) {
            this.$sendForm.find('#sendFormMethod').val(this.formSettings.method);
        } else {
            this.$sendForm.find('#sendFormMethod').remove();
        }
    },


    initContributorsSection: function() {
        var $section = this.$el.find('.contributorsSection');
        this.contributorsView = new ContributorsView({
            el : $section.find('#contributorsView'),
            parentView: this, //give a pointer to this view
            contribFormNamePrefix: this.contribFormNamePrefix, // form name for contribs
            contributorTeamsSearchFilters: this.getFormSettings().contributorTeamsSearchFilters
        });

        this.updateActionButtons();

        // when all steps complete, enable submit
        this.contributorsView.on('stepChanged', function() {
            this.updateActionButtons();
        }, this);

        // update search params on rendered
        this.contributorsView.on('rendered', function() {
            this.contributorsView.updateContribSearchViewParams();

            // disable send button if isLaunchedAsMode() is true
            if (this.isLaunchedAsMode()) {
                this.$el.find('#recognitionButtonSend').remove();
            }
        }, this);

        // disable submit at first
        this.$el.find('#recognitionButtonSend').attr('disabled', 'disabled');
        // when all steps complete, enable submit
        this.contributorsView.on('stepChanged', function(status) {

            this.$el.find('#recognitionButtonSend').removeAttr('disabled');
        }, this);
    },

    inheritErrorsFromDataForm: function() {
        var $err = this.$dataForm.find('.error'); // extract server error

        if ($err.length) {
            this.$el.find('#serverErrorsContainer')
                .append($err).slideDown(G5.props.ANIMATION_DURATION);
        }
    },

    // check if this form has been launched as another user
    isLaunchedAsMode: function() {
        return this.formSettings.isLaunchedAs && this.formSettings.isLaunchedAs == 'true';
    },

    updateActionButtons: function() {
        var $sec = this.$el.find('.form-actions'),
            $next = $sec.find('.nextBtn'),
            $back = $sec.find('.backBtn'),
            $submit = $sec.find('#recognitionButtonSend'),
            wizTabs = this.contributorsView ? this.contributorsView.getWizardTabs() : null,
            activeTabName = wizTabs ? wizTabs.getActiveTab() : null;

        activeTabName = activeTabName ? activeTabName.get('name') : null;

        switch (activeTabName) {
            case 'stepCoworkers':
                $next.show();
                $back.hide();
                $submit.hide();
                break;
            case 'stepOthers':
                $next.show();
                $back.show();
                $submit.hide();
                break;
            case 'stepPreview':
                $next.hide();
                $back.show();
                $submit.show();
                break;
        }
    },


    // ===================
    // EVENT FUNCTIONS
    // ===================

    // SUBMIT
    submitForm: function(e) {
        var $tar = $(e.currentTarget);
        e.preventDefault();

        if($tar.hasClass('disabled')) {
            return false;
        }

        $tar.attr('disabled', 'disabled').spin();
        $tar.siblings('.btn').attr('disabled', 'disabled');

        this.$sendForm.submit();
    },

    cancelForm: function(e) {
        e.preventDefault();
        if (this.options.cancelUrl) {
            window.location = this.options.cancelUrl;
        } else {
            console.error('[ERROR] RecognitionPageManagerInviteContributorsView: no cancelUrl set');
        }
    },

    cancelClick: function(e) {
        var $tar = $(e.currentTarget);
        e.preventDefault();
        if (!$tar.data('qtip')) {
            this.addConfirmTip($tar, this.$el.find('.inviteContribsCancelDialog'));
        }
    },


    doContribBackStep: function(e) {
        e.preventDefault();
        this.contributorsView.goBackAStep();
    },
    doContribNextStep: function(e) {
        e.preventDefault();
        this.contributorsView.goToNextStep();
    },

    // ===================
    // UTILITY FUNCTIONS
    // ===================

    // FORM PARSE: return a JSON object with recognition form data
    parseForm: function($f) {
        var that = this,
            arry = $f.serializeArray(),
            json = {};

        //put the form inputs in an object (filter out array obj elements)
        _.each(arry, function(input) {
            if (input.name.match(/\[(\d+)\]/) === null) {
                json[input.name] = input.value;
                // any values that need to be converted to JSON
                if (input.name === 'contributorTeamsSearchFilters') {
                    if ($.trim(json[input.name])) { // has data
                        json[input.name] = JSON.parse(json[input.name]);
                    } else { // no data, let's just pretend like there wasn't an input for this
                        delete json[input.name];
                    }
                }
            }
        });

        //json.recipients = this.parseObjectsFromForm(arry, that.recipFormNamePrefix);
        json.contributors = this.parseObjectsFromForm(arry, that.contribFormNamePrefix);

        return json;
    },

    // FORM PARSE: return json array of recipients
    parseObjectsFromForm: function(formArray, prefix) {
        var map = {}, //map pax id to props
            arry,
            count = -1; //recip count

        _.each(formArray, function(inp) {
            var brkt, num, key;
            if (inp.name.indexOf(prefix) > -1) {
                //extract count
                if (inp.name == prefix + 'Count') {
                    count = parseInt(inp.value,10);
                }
                //extract data
                else {
                        brkt = inp.name.match(/\[(\d+)\]/); //just the [#] part
                        num = brkt.length === 2 ? parseInt(brkt[1],10) : false; //get the number
                        key = inp.name.match(/\]\.(.+)$/)[1]; //get the key

                        map['recip' + num] ? true : map['recip' + num] = {};//not set? set it
                        map['recip' + num][key] = inp.value;
                    }
            }
        });

        arry = _.toArray(map); //turn it into an array
        if (arry.length !== count) {
            console.error('[ERROR] RecognitionPageSendView - dataForm [' + prefix + '] counts do not match '
                + arry.length + ' != ' + count);
        }

        console.log('[INFO] RecognitionPageSendView - DATA FORM - found ' + arry.length + ' pax of type [' + prefix + ']');

        return arry;
    },

    //add confirm tooltip
    addConfirmTip: function($trig, cont) {
        //attach qtip and show
        var myPos = 'left center',
            myAt = 'right center',
            setPosForMobile = function() {
                if ($(window).width() < 479) {
                    myPos = 'bottom center';
                    myAt = 'top center';
                }
            }();

        $trig.qtip({
            content: {text: cont},
            position: {
                my: myPos,
                at: myAt,
                container: this.$el
            },
            show: {
                event: 'click',
                ready: true
            },
            hide: {
                event: 'unfocus',
                fixed: true,
                delay: 200
            },
            style: {
                classes: 'ui-tooltip-shadow ui-tooltip-light participantPopoverQtip',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    },


    //add confirm tooltip
    addInstructionTip: function($trig, cont, $container) {
        //attach qtip and show
        $trig.qtip({
            content: {text: cont},
            position: {
                my: 'left center',
                at: 'right center',
                container: $container || this.$el
            },
            show: {
                event: false,
                ready: true
            },
            hide: {
                event: 'click',
                fixed: true,
                delay: 200
            },
            style: {
                classes: 'ui-tooltip-shadow ui-tooltip-light ui-tooltip-instruction',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    },


    // add validate qtip
    addValidateTip: function($trig, content, $cont) {
        $trig.qtip({
            content: {
               text: content
            },
            position: {
                my: 'left center',
                at: 'right center',
                container: $cont || this.$sendForm
            },
            show : {
                ready : true,
                delay: false
            },
            hide : {
                event : 'focus blur',
                delay: 500
            },
            //only show the qtip once
            events: {
                show : function(evt, api) {},
                hide : function(evt, api) {
                    api.destroy();
                },
                render : function(evt, api) {}
            },
            style: {
                classes: 'ui-tooltip-shadow ui-tooltip-red validate-tooltip',
                tip: {
                    width: 10,
                    height: 5
                }
            }
        });
    },

    clearQTips: function() {
        // clear all validation tooltips
        this.$sendForm.find('.validate-tooltip').qtip('hide');
    }


});
