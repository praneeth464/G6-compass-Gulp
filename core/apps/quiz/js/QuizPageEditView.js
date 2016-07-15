/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
PageView,
QuizModel,
QuizEditTabIntroView,
QuizEditTabMaterialsView,
QuizEditTabQuestionsView,
QuizEditTabResultsView,
QuizEditTabPreviewView,
WizardTabsView,
QuizPageEditView:true
*/
QuizPageEditView = PageView.extend({

    initialize: function(opts) {

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass ModuleView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        // WizardTabsView (init'd inside initTabs())
        this.wizTabs = null;

        // the model
        this.quizModel = new QuizModel(opts.quizJson);

        // move simple input data from Model to DOM
        this.saveModelToInputs();

        // initialize the tab content views
        this.initTabs();

        if(this.quizModel.get("quizStatus") === "undrconstr" || this.quizModel.get("quizStatus") === "pending"){
            this.$el.find('.saveDraftBtn').show();
        }

        this.setupEvents();

        this.isIe7OrIe8 = $.browser.msie && ($.browser.version === "8.0" || $.browser.version === "7.0");
        this.isIe9 = $.browser.msie && ($.browser.version === "9.0");
        // for DEV
        // this.goFromStepToStep('','stepPreview',null);

        this.update();

    },

    events: {
        // next button events
        'click  .nextBtn' : 'goToNextStep',

        // back button events
        'click .stepContent .backBtn' : 'goBackAStep',

        // save draft
        'click .saveDraftBtn' : 'doSaveDraft',

        // submit button
        'click .submitBtn' : 'doSubmitForm'
    },
    setupEvents: function() {
        this.quizModel.on('saveStarted', this.handleSaveStarted, this);
        this.quizModel.on('saveEnded', this.handleSaveEnded, this);
        this.quizModel.on('saveSuccess', this.handleSaveSuccess, this);
        this.quizModel.on('saveError', this.handleSaveError, this);
    },

    // initialize the tab views
    initTabs: function() {
        var that = this;

        // init WizardTabsView
        this.wizTabs = new WizardTabsView({
            el: this.$el.find('.wizardTabsView'),
            onTabClick: function(e, originTab, destTab, wtv) {
                // our handleTabClick function replaces the standard function in WTV
                that.handleTabClick(e, originTab, destTab, wtv);
            },
            scrollOnTabActivate: true
        });

        // let the name of the tab objects match the corresponding data-tab-name + 'TabView'
        // this will allow tab nav/validate logic to flow naturally from the names
        this.stepIntroTabView = new QuizEditTabIntroView({
            el: '#quizEditTabIntroView',
            containerView: this
        });

        this.stepMaterialsTabView = new QuizEditTabMaterialsView({
            el: '#quizEditTabMaterialsView',
            containerView: this
        });

        this.stepQuestionsTabView = new QuizEditTabQuestionsView({
            el: '#quizEditTabQuestionsView',
            containerView: this
        });

        this.stepResultsTabView = new QuizEditTabResultsView({
            el: '#quizEditTabResultsView',
            containerView: this
        });

        this.stepPreviewTabView = new QuizEditTabPreviewView({
            el: '#quizEditTabPreviewView',
            containerView: this
        });

    },



    handleSaveStarted: function() {
        var $bts = this.$el.find('.submitBtn,.saveDraftBtn');
        $bts.attr('disabled', 'disabled').spin();
        $bts.siblings('.btn').attr('disabled', 'disabled');
    },
    handleSaveEnded: function() {
        var $bts = this.$el.find('.submitBtn, .saveDraftBtn');
        $bts.removeAttr('disabled').spin(false);
        $bts.siblings('.btn').removeAttr('disabled');

        this.update();
    },
    handleSaveSuccess: function(serverData) {
        var fwdUrl = serverData.forwardUrl;
        if (fwdUrl) {
            window.location = fwdUrl;
        }
    },
    handleSaveError: function(errors) {
        var $m = this.$el.find('.quizErrorsModal'),
            $l = $m.find('.errorsList');

        $l.empty();
        _.each(errors, function(e) {
            $l.append('<li>' + e.text + '</li>');
        });

        $m.modal();
    },


    update: function() {
        // status class to hide/show stuff
        var status = this.quizModel.get("quizStatus");

        this.$el.removeClass(function(i, c) {
            c = c.match(/[a-z]+Mode/i);
            return c && c.length ? c[0] : false;
        }).addClass(status + 'Mode');

        // hide the saveDraftBtn when/if the status == 'active' (complete)
        if (this.quizModel.get("quizStatus") === "active") {
            this.$el.find('.saveDraftBtn').hide();
        }
    },




    goToNextStep: function(e) {
        var $tar = $(e.currentTarget),
            fromTab = this.wizTabs.getActiveTab(),
            toTab = this.wizTabs.getNextTab();

        e.preventDefault();
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'), $tar);
    },
    goBackAStep: function(e) {
        var $tar = $(e.currentTarget),
            fromTab = this.wizTabs.getActiveTab(),
            toTab = this.wizTabs.getPrevTab();

        e.preventDefault();
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'), $tar);
    },
    // handle tab click (this is a callback that has been passed to WizardTabsView)
    handleTabClick: function(e, fromTab, toTab, wizTabView) {
        e.preventDefault();

        // exit if the toTab is locked
        if (toTab.get('state') === 'locked') { return; }

        // exit if the current tab was clicked
        if (fromTab.get('name') === toTab.get('name')) { return; }

        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'), $(e.currentTarget));
    },

    doSaveDraft: function(e) {
        var valRes = this.stepIntroTabView.validateDraft();

        e.preventDefault();
        if (valRes.valid) {
            this.saveInputsToModel();
            this.quizModel.save(true);/*isDraft*/
        } else {
            this.onNavErrorTip(valRes.msgClass, $(e.currentTarget));
        }
    },
    doSubmitForm: function(e) {
        e.preventDefault();
        this.quizModel.save(); // triggers ajax and events that this view listens for
    },
    // generic from step to step checking for validation (guts of tab nav logic)
    goFromStepToStep: function(fromName, toName, $target) {
        var // call the validation func of apropo tab if it exists
            fObjKey = fromName + 'TabView',
            tObjKey = toName + 'TabView',
            hasUpdFunc = this[tObjKey] && this[tObjKey].updateTab,
            validationRes = this[fObjKey] && this[fObjKey].validate ? this[fObjKey].validate() : null,
            goingDirection = this.wizTabs.getTabByName(fromName).get('id') > this.wizTabs.getTabByName(toName).get('id') ? 'backward' : 'forward';

        // there was a validation function + not valid
        if (goingDirection == 'forward' && validationRes && !validationRes.valid) {
            // if the target is a tab, it means the user has clicked on the next tab in the wizard, but we want the error to display on the current step's tab
            if( $target.hasClass('wtTab') ) {
                $target = this.wizTabs.getTabByName(fromName).$tab;
            }
            this.wizTabs.setTabState(fromName, 'incomplete'); // tab "error" state
            this.onNavErrorTip(validationRes.msgClass, $target); // apply msg class to error element
            // lock next tabs to prevent the user from moving forward with an error
            this.wizTabs.setTabState(this.wizTabs.getNextTab().id, 'locked', true);
        }
        else {
            // store plain jane input values in model
            this.saveInputsToModel();

            // update if has method
            if (hasUpdFunc) { this[tObjKey].updateTab(); }

            // mark fromTab complete ONLY if we're going forward
            if (goingDirection == 'forward' && fromName) {
                this.wizTabs.setTabState(fromName, 'complete'); // complete
            }

            // unlock destination tab and activate
            this.wizTabs.setTabState(toName, 'unlocked'); // unlock
            this.wizTabs.activateTab(toName); // go to tab

            // set all tabs after current tab to locked (this may be contentious behavior)
            // yep, this is contentious. If the user is going backward, we should be able to click on the tab for the next step
            // ooh. Super contentious. If the user backs up all the way to the beginning, the tabs shouldn't re-lock when going forward again. Turning this off for now and we'll just have to trust the locked state.
            // if (goingDirection == 'forward' && this.wizTabs.getNextTab()) {
            //     this.wizTabs.setTabState(this.wizTabs.getNextTab().id, 'locked', true);
            // }
        }
    },


    // display a qtip for next/back buttons or tab clicks (uses class name to show proper error)
    onNavErrorTip: function(msgClass, $target) {
        var $cont = this.$el.find('.errorTipWrapper .errorTip').clone(),
            isBtn = $target.hasClass('btn')||$target.is('input');

        $cont.find('.'+msgClass).show(); // show our message

        //attach qtip and show
        $target.qtip({
            content:{text: $cont},
            position:{
                my: isBtn?'bottom center':'top center',
                at: isBtn?'top center':'bottom center',
                effect: this.isIe7OrIe8 ? false : true,
                viewport: true,
                adjust: {
                    method: 'shift none'
                }
            },
            show:{
                event:false,
                ready:true
            },
            hide:{
                event:'unfocus click',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-red quizErrorQTip',
                tip: {
                    corner: true,
                    width: 10,
                    height: 5
                }
            }
        });
    },

    // display an error tip on target (uses class name to show proper error)
    genericErrorTip: function(msgClass, $target, opts) {
        var $cont = this.$el.find('.errorTipWrapper .errorTip').clone(),
            defOpts = {
                content:{text: $cont},
                position:{
                    my: 'bottom center',
                    at: 'top center',
                    effect: this.isIe7OrIe8 ? false : true,
                    viewport: true,
                    adjust: {
                        method: 'shift none'
                    }
                },
                show:{
                    event:false,
                    ready:true
                },
                hide:{
                    event:'unfocus click',
                    fixed:true,
                    delay:200
                },
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-red quizErrorQTip',
                    tip: {
                        corner: true,
                        width: 10,
                        height: 5
                    }
                }
            };

        // perform a deep merge, where opts overrides defOpts
        opts = $.extend(true, defOpts, opts||{});

        $cont.find('.'+msgClass).show(); // show our message

        //attach qtip and show
        $target.qtip(opts);
    },


    // save simple inputs from page to model using  data-model-key ATTR
    saveInputsToModel: function() {
        var that = this;

        // loop through els and check for data-model-key to lookup value in Model
        this.$el.find('.stepContent').find('input, textarea').each(function() {
            var $t = $(this),
                checkedVal,
                mk = $t.data('modelKey'),
                mv = mk ? $t.val() : null,
                type = $t.attr('type');


            if (mk) {
                if (type=='radio') { // set to boolean true/false if one of those strings is the value
                    //console.log('MK',mk);
                    checkedVal = that.$el.find('.stepContent [data-model-key='+mk+']:checked').val();
                    checkedVal = checkedVal ? checkedVal.toLowerCase() : checkedVal;
                    if (checkedVal === 'true') { mv = true; }
                    else if (checkedVal === 'false') { mv = false; }
                    else { mv = typeof checkedVal === 'undefined' ? null : checkedVal; }
                }
                if (type=='checkbox') { // boolean
                    mv = $t.is(':checked');
                }
                //console.log('Inputs->Model',mk,'...',mv);
                that.quizModel.set(mk, mv, {silent:true});
            }
        });
    },

    // put inputs from model into DOM els (for simple INPUT,TEXTAREA)
    saveModelToInputs: function() {
        var that = this;

        // loop through els with data-model-key and set els vals in Model
        this.$el.find('.stepContent').find('[data-model-key]').each(function() {
            var $t = $(this),
                mk = $t.data('modelKey'),
                mv = that.quizModel.get(mk),
                valsMatch = mv===$t.val(),
                tValLc = $t.val().toLowerCase(),
                type = $t.attr('type');

            if (typeof mv !== 'undefined' && mv!==null && mv!=='') { // if model has value
                if (type=='radio') { // radio case (booleans or groups)
                    // if value of model equals value of element
                    // if value of element is 'true' and value of model is TRUE (boolean)
                    if ( valsMatch ||
                        (tValLc==='true' && mv===true) ||
                        (tValLc==='false' && mv===false) ) {
                        $t.attr('checked','checked');
                    } else {
                        $t.removeAttr('checked');
                    }
                }
                else if (type=='checkbox') { // checkboxes (booleans)
                    if ( mv===true) {
                        $t.attr('checked','checked');
                    } else {
                        $t.removeAttr('checked');
                    }
                }
                else { // strings
                    if (mv) {
                        $t.val(mv);
                    }
                }
                //console.log('Model->Inputs k,v,$v',mk,mv,$t.val());
            }


        });
    }

});