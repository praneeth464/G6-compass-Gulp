/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
SSIContestModel,
TemplateManager,
WizardTabsView,
SSIContestEditTabDataCollectionView,
SSIContestEditTabInfoView,
SSIContestEditTabParticipantsManagersView,
SSIContestEditTabPreviewView,
SSIContestPageEditView:true
*/
SSIContestPageEditView = PageView.extend({

    initialize: function(opts) {

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        // WizardTabsView (init'd inside initTabs())
        this.wizTabs = null;
        this.wizTabsJson = opts.tabsJson;

        // the model
        this.contestModel = new SSIContestModel(opts.contestJson);
        this.bootstrappedContestJson = opts.contestJson;

        // contest type specific data (for wiz tabs especially)
        this.contestTypeJson = opts.contestTypeJson;

        // initialize the tab content views
        this.initTabs();

        this.setupEvents();

        this.isIe7OrIe8 = $.browser.msie && ($.browser.version === "8.0" || $.browser.version === "7.0");
        this.isIe9 = $.browser.msie && ($.browser.version === "9.0");
        // for DEV
        // this.goFromStepToStep('','stepPreview',null);

        //this.update();

        // this is a way to lock down nav from multiple sources (see lockNav, unlockNav)
        this.navLockKeys = {};
        this.navLockBtns = {
            back: '.backBtn',
            next: '.nextBtn',
            save: '.saveDraftBtn'
        };

    },

    events: {
        // next button events
        'click  .nextBtn' : 'goToNextStep',

        // back button events
        'click .stepContent .backBtn' : 'goBackAStep',

        // save draft
        'click .saveDraftBtn' : 'doSaveDraft',

        // create contest
        'click .submitBtn' : 'doCreateContest',

        // save contest (edit mode)
        'click .saveBtn' : 'doEditModeSave',

        // autoBind
        'change .autoBind' : 'doAutoBind',

        // click lock after
        'click .ssiContestPageEditViewLockPageAfter': 'doPageAfterClick',

        // award them now buttons
        'click .cancelAtnBtn': 'doCancelAtnBtnClick',
        'click .saveAtnBtn': 'doSaveAtnBtnClick',
        'click .issueAwardsBtn': 'doIssueAwardsBtnClick'
    },

    setupEvents: function() {
        this.contestModel.on('saveStarted', this.handleSaveStarted, this);
        this.contestModel.on('saveEnded', this.handleSaveEnded, this);
        this.contestModel.on('saveSuccess', this.handleSaveSuccess, this);
        this.contestModel.on('saveError', this.handleSaveError, this);

        this.contestModel.on('error:genericAjax', this.handleAjaxError, this);

        // for some contestTypes, save is handled on the tabView for Payouts
        this.stepPayoutsTabView.on('saveSuccess', this.handleSaveSuccess, this);

        // for the managers tab, save is handled by tabview
        this.stepParticipantsManagersTabView.on('saveSuccess', this.handleSaveSuccess, this);

        // for the create button on preview step
        this.contestModel.on('start:createContest', this.handleCreateContestStart, this);
        this.contestModel.on('end:createContest', this.handleCreateContestEnd, this);
        this.contestModel.on('success:createContest', this.handleCreateContestSuccess, this);

        // award them now btn ajax handlers
        this.contestModel.on('start:awardThemNowAjax', this.handleAwardThemNowAjaxStart, this);
        this.contestModel.on('end:awardThemNowAjax', this.handleAwardThemNowAjaxEnd, this);
        this.contestModel.on('success:awardThemNowAjax', this.handleAwardThemNowAjaxSuccess, this);

        // for billTo
        this.contestModel.on('change:billTo', this.updateBillTo, this);

    },

    reloadBootstrappedContestJsonByKey: function(key) {
        // because info step uses bootstrapped data, when returning to step info step from
        // other step, nextUrl needs to be reset to the bootstrapped value
        // * maybe other values will also need to be updated in a similar fashion
        this.contestModel.set(key, this.bootstrappedContestJson[key]);
    },

    // initialize the tab views
    initTabs: function() {
        var that = this,
            cm = this.contestModel,
            ct = cm.get('contestType'),
            awThNStat = cm.get('awardThemNowStatus'),
            cTypeSuffix = null,
            ctJson = this.contestTypeJson,
            actTabs = ctJson.activeTabsByContestType,
            tabNames = ctJson.tabNamesByContestType,
            hideWizTabs = false;

        // set the suffix of the Class name we are looking for when tab specific to contest type
        switch(ct) {
            case 'doThisGetThat': cTypeSuffix = 'dtgt'; break;
            case 'stepItUp': cTypeSuffix = 'siu'; break;
            case 'awardThemNow': cTypeSuffix = 'atn'; break;
            case 'stackRank': cTypeSuffix = 'sr'; break;
            default: cTypeSuffix = ct;
        }


        // adjust displayed tabs by contestType (eg: award them now)
        if(actTabs && actTabs[ct]) {
            // reject any tabs with IDs not in the activeTabs id array
            this.wizTabsJson = _.reject(that.wizTabsJson, function(wt) {
                return !_.contains(actTabs[ct], wt.id);
            });
        }

        // adjust tab names by contestType (eg: award them now)
        if(tabNames && tabNames[ct]) {
            // check each wizard tab name against the keys of tabNamesByContestType
            _.each(this.wizTabsJson, function(wt) {
                if(tabNames[ct][wt.name]) {
                    wt.wtName = tabNames[ct][wt.name];
                }
            });
        }

        // AWARD THEM NOW: special case
        if(ct == cm.TYPES.AWARD_THEM_NOW) {
            if(awThNStat == 'editInfo') {
                // info step only
                cm.set('currentStep', 1);
                // hide tabs (modal mode for info step)
                hideWizTabs = true;
            }

            if(awThNStat == 'issueMoreAwards') {
                // go to step 2 (skip info step)
                cm.set('currentStep', 2);
                // remove first step for steps with id > 1
                this.wizTabsJson = _.reject(that.wizTabsJson, function(wt) {
                    return wt.name == 'stepInfo';
                });
            }
        }


        // init WizardTabsView
        this.wizTabs = new WizardTabsView({
            el: this.$el.find('.wizardTabsView'),
            tabsJson: this.wizTabsJson,
            onTabClick: function(e, originTab, destTab, wtv) {
                // our handleTabClick function replaces the standard function in WTV
                that.handleTabClick(e, originTab, destTab, wtv);
            },
            scrollOnTabActivate: true
        });

        // let the name of the tab objects match the corresponding data-tab-name + 'TabView'
        // this will allow tab nav/validate logic to flow naturally from the names
        this.stepInfoTabView = new SSIContestEditTabInfoView({
            el: '#ssiContestEditTabInfoView',
            containerView: this
        });

        this.stepParticipantsManagersTabView = new SSIContestEditTabParticipantsManagersView({
            el: '#contestEditTabParticipantsManagersView',
            containerView: this
        });

        this.stepPayoutsTabView = new window['SSIContestEditTabPayoutsView_'+cTypeSuffix]({
            el: '#contestEditTabPayoutsView .contestSpecificView',
            containerView: this
        });

        this.stepDataCollectionTabView = new SSIContestEditTabDataCollectionView({
            el: '#contestEditTabDataCollectionView',
            containerView: this
        });

        this.stepPreviewTabView = new SSIContestEditTabPreviewView({
            el: '#contestEditTabPreviewView',
            containerView: this
        });

        // activate apropo tab
        this.wizTabs.on('tabsInitialized', function() {
            that.jumpToStep(cm.getCurrentStepName());
            that.updateBottomControls();

            if(hideWizTabs) {
                that.wizTabs.$el.hide();
            }
        });

    },

    initNakedCharCount: function($el) {
        if(!$el) { $el = this.$el; }

        $el.find('.charCount').each( function() {
            var $t = $(this),
                $ta = $el.find($t.data('charsFrom')),
                onKU,
                max;

            if($ta.length && !$ta.data('_charCounter')) {
                onKU = function() {
                    var max = $ta.data('maxChars'),
                        rem = max - $ta.val().length;

                    $t.find('b').text(rem);
                    $t[rem < 51 ? 'addClass' : 'removeClass']('warning'); // make it red, or sth
                };

                onKU();

                $ta.on('keyup', onKU);
                $ta.data('_charCounter', $t);
            }

        });
    },

    lockPage: function() {
        var $blocker = $('<div class="ssiContestPageEditViewLockPage">LOADING&nbsp;</div>');

        this.$el.prepend($blocker);
        G5.util.showSpin($blocker);

        setTimeout(function() {
            $blocker.css('opacity', 0.5); // css transition will fade it
        }, 0);
    },

    unlockPage: function() {
        var $blocker = this.$el.find('.ssiContestPageEditViewLockPage');

        $blocker.css('opacity', 0.0);

        setTimeout(function() {
            $blocker.remove();
        }, 300);
    },

    lockPageAfter: function($el, msg) {
        var $blocker = $('<div class="ssiContestPageEditViewLockPageAfter">'+
                '<div class="msg hide">'+(msg||'&nbsp;')+'</div>&nbsp;</div>');

        if(this.$el.find('.ssiContestPageEditViewLockPageAfter').length) {
            return;
        }

        this.$el.prepend($blocker);
        this.adjustPageAfterPos($el, $blocker);
        // allow clicks on back button
        this.$el.find('.backBtn,.saveDraftBtn').css({position: 'relative', 'z-index': 9000});
    },

    adjustPageAfterPos: function($el, $bl) {
        if(!$bl.parent().length) { return; }

        var top = $el.offset().top,
            h = this.$el.outerHeight() - top + this.$el.offset().top,
            that = this;

        // height and top pos
        $bl.css({top: top+'px', height: h+'px'});

        // width and left pos
        $bl.css({width: this.$el.outerWidth(), left: this.$el.offset().left});

        // keep on keeping on...
        setTimeout( function() {
            that.adjustPageAfterPos($el, $bl);
        }, 300);
    },

    unlockPageAfter: function() {
        var $blocker = this.$el.find('.ssiContestPageEditViewLockPageAfter');

        $blocker.remove();
        // return back button to normal style
        this.$el.find('.backBtn,.saveDraftBtn').css({position: '', 'z-index': ''});
    },

    doPageAfterClick: function(e) {
        var $blocker = this.$el.find('.ssiContestPageEditViewLockPageAfter'),
            $msg = $blocker.find('.msg');

        this.showErrorModal($msg.text());
    },

    // nav locking system for all the different async cases of lockage (not thread safe, ha ha)
    lockNav: function(key, btns) {
        btns = btns&&btns.length ? btns : _.keys(this.navLockBtns);

        this.navLockKeys[key] = btns; // set the key
        this.setNavLockState(true, btns);
    },

    unlockNav: function(key) {
        var lockKeys = null,
            toUnlock = this.navLockKeys[key]; // array of btns to unlock for key

        delete this.navLockKeys[key]; // clear the key

        lockKeys = _.keys(this.navLockKeys); // get keys

        _.each(this.navLockKeys, function(v,k){
            _.each(v, function(b){
                if(_.contains(toUnlock,b)) { toUnlock = _.without(toUnlock, b); }
            });
        });

        this.setNavLockState(false, toUnlock);
    },

    clearNavLocks: function() {
        var that = this;

        _.each(this.navLockKeys, function(v,k) {
            that.unlockNav(k);
        });
    },

    setNavLockState: function(isLock, btns) {
        var $cntCnts = this.$el.find('.stepContentControls'),
            nlbs = this.navLockBtns;

        _.each(btns, function(b){
            var bSel = nlbs[b];
            if(bSel) {
               if(isLock) { $cntCnts.find(bSel).attr('disabled','disabled'); }
               else { $cntCnts.find(bSel).removeAttr('disabled'); }
            }
        });
    },

    handleSaveStarted: function() {
        var $bts = this.$el.find('.nextBtn,.saveDraftBtn');

        $bts.spin();

        this.lockNav('handleSaveStarted');
    },

    handleSaveEnded: function() {
        var $bts = this.$el.find('.nextBtn, .saveDraftBtn');

        $bts.spin(false);

        this.unlockNav('handleSaveStarted');
    },

    handleSaveSuccess: function(serverData, fromStep, toStep, isDraft) {
        var tObjKey,
            fObjKey,
            hasUpdFunc,
            hasLeaveFunc,
            goingDirection,
            fwdUrl = this.contestModel.get('saveAsDraftForwardUrl'),
            fromId, toId;

        //console.log('...............',serverData, fromStep, toStep, isDraft);

        // CASE: if isDraft and not navigating and we have fwd url
        if(isDraft /* && !fromStep */ && !toStep && fwdUrl ) {
            window.location = fwdUrl;
            return;
        }

        // CASE: save success on fromStep - toStep
        if(fromStep && toStep) {
            tObjKey = toStep + 'TabView';
            hasUpdFunc = this[tObjKey] && this[tObjKey].updateTab;
            fObjKey = fromStep + 'TabView';
            hasLeaveFunc = this[fObjKey] && this[fObjKey].leaveTab;
            fromId = this.wizTabs.getTabByName(fromStep).get('id');
            toId = this.wizTabs.getTabByName(toStep).get('id');
            goingDirection = fromId > toId ? 'backward' : 'forward';


            // assume all locks cleared on step change, toTab.update can do stuff to nav
            this.clearNavLocks();

            // set the active step/tab
            this.contestModel.setStepByName(toStep);

            // mark fromTab complete ONLY if we're going forward
            if (goingDirection == 'forward' && fromStep) {
                this.wizTabs.setTabState(fromStep, 'complete'); // complete
            }

            // unlock destination tab and activate
            this.wizTabs.setTabState(toStep, 'unlocked'); // unlock
            this.wizTabs.activateTab(toStep); // go to tab

            // leave if has method
            if(hasLeaveFunc) { this[fObjKey].leaveTab(); }

            // update if has method
            if (hasUpdFunc) { this[tObjKey].updateTab(goingDirection); }

            return;
        }

    },

    handleSaveError: function(errors) {
        if(!_.isArray(errors)) {
            errors = [errors]; // make it an array
        }

        errors = _.map(errors, function(e) {
            return e.text||e;
        });

        this.showErrorModal(errors);
    },

    handleCreateContestStart: function() {
        this.lockPage();
    },

    handleCreateContestEnd: function() {
        this.unlockPage();
    },

    handleCreateContestSuccess: function(dat) {
        if(dat.forwardUrl) {
            window.location = dat.forwardUrl;
        }
    },

    handleAjaxError: function(error) {
        this.handleSaveError(error);
    },

    update: function() {
        // status class to hide/show stuff
        var status = this.contestModel.get("contestStatus");

        this.$el.removeClass(function(i, c) {
            c = c.match(/[a-z]+Mode/i);
            return c && c.length ? c[0] : false;
        }).addClass(status + 'Mode');

        // hide the saveDraftBtn when/if the status == 'active' (complete)
        if (this.contestModel.get("contestStatus") === "active") {
            this.$el.find('.saveDraftBtn').hide();
        }
    },

    // this is mainly for the special button situation for awardThemNow contest types
    updateBottomControls: function() {
        var STATUSES = this.contestModel.STATUSES,
            ATN_STATUSES = this.contestModel.ATN_STATUSES,
            ct = this.contestModel.get('contestType'),
            status = this.contestModel.get('status'),
            atnStatus = this.contestModel.get('awardThemNowStatus'),
            actTabName = this.wizTabs.getActiveTab().get('name');

        if(ct != this.contestModel.TYPES.AWARD_THEM_NOW) {

            if(status == STATUSES.LIVE) {
                this.$el.find('.saveDraftBtn').hide();
            } else {
                this.$el.find('.saveDraftBtn').show();
            }

            // final step buttons
            if(status && status !== STATUSES.DRAFT) {
                // hide create button
                this.$el.find('.submitBtn').hide();
                // show save button
                this.$el.find('.saveBtn').show();
            }
        }

        // this is contestType = awardThemNow
        else {

            // hide save as draft button
            this.$el.find('.saveDraftBtn').hide();

            // show "cancel" button
            this.$el.find('.cancelAtnBtn').show();

            // on first step and in edit mode
            if(atnStatus == ATN_STATUSES.EDIT_INFO && actTabName == 'stepInfo') {
                // hide next button
                this.$el.find('.nextBtn').hide();
                // show 'save' button
                this.$el.find('.saveAtnBtn').show();
            }

            // NOT on first step or last step and NOT create mode
            if(atnStatus != ATN_STATUSES.CREATE && actTabName != 'stepInfo' && actTabName != 'stepPreview') {

                if(actTabName == 'stepParticipantsManagers') {
                    this.$el.find('.backBtn').hide();
                } else {
                    this.$el.find('.backBtn').show();
                }

                // show next button
                this.$el.find('.nextBtn').show();
                // hide 'save' button
                this.$el.find('.saveAtnBtn').hide();
            }

            if(actTabName == 'stepPreview') {

                // show issue awards button
                this.$el.find('.issueAwardsBtn').show();

                // hide normal submit
                this.$el.find('.submitBtn').hide();
            }

        }// contestType = awardThemNow

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
        var valRes = this.stepInfoTabView.validateDraft(),
            currTabObjKey = this.wizTabs.getActiveTab().get('name') + 'TabView',
            hasSaveDraftFunc = this[currTabObjKey] && this[currTabObjKey].saveAsDraft;

        e.preventDefault();

        if (valRes.valid) {
            if(hasSaveDraftFunc) {
                // current tab has its own saveAsDraft function, use it instead of the contest model's
                this[currTabObjKey].saveAsDraft();
            } else {
                this.contestModel.save(null, null, true);/*isDraft*/
            }

        } else {
            this.onNavErrorTip(valRes.msgClass, $(e.currentTarget));
        }
    },

    doCreateContest: function(e) {
        e.preventDefault();

        this.contestModel.createContest();
    },

    doEditModeSave: function(e) {
        //TODO: Make sure this can safely be deleted.

        // just follow the link in the JSP/HTML
        // e.preventDefault();
        // window.location = G5.props.URL_JSON_PARTICIPANT_PROFILE;
    },

    doSaveAtnBtnClick: function(e) {
        this.contestModel.awardThemNowAjax('saveAtn');
    },

    doCancelAtnBtnClick: function(e) {
        this.contestModel.awardThemNowAjax('cancelAtn');
    },

    doIssueAwardsBtnClick: function(e) {
        this.contestModel.awardThemNowAjax('issueAwardsAtn');
    },

    handleAwardThemNowAjaxStart: function() {
        this.lockPage();
    },

    handleAwardThemNowAjaxSuccess: function(dat) {
        if(dat.forwardUrl) {
            window.location = dat.forwardUrl;
        }
    },

    handleAwardThemNowAjaxEnd: function() {
        this.unlockPage();
    },

    // generic from step to step checking for validation (guts of tab nav logic)
    // * be careful with this monster
    goFromStepToStep: function(fromName, toName, $target) {
        var // call the validation func of apropo tab if it exists
            fObjKey = fromName + 'TabView',
            hasSaveFunc = this[fObjKey] && this[fObjKey].save,
            validationRes,
            goingDirection = this.wizTabs.getTabByName(fromName).get('id') > this.wizTabs.getTabByName(toName).get('id') ? 'backward' : 'forward';

        // there was a validation function + not valid
        if(goingDirection == 'forward') {
            // find the validation function for the active step view and call it if it exists
            validationRes = this[fObjKey] && this[fObjKey].validate ? this[fObjKey].validate() : null;
        }

        if(goingDirection == 'forward' && validationRes && !validationRes.valid) {
                // if the target is a tab, it means the user has clicked on the next tab in the wizard,
                // but we want the error to display on the current step's tab
                if( $target.hasClass('wtTab') ) {
                    $target = this.wizTabs.getTabByName(fromName).$tab;
                }
                this.wizTabs.setTabState(fromName, 'incomplete'); // tab "error" state
                this.onNavErrorTip(validationRes.msgClass, validationRes.$target || $target); // apply msg class to error element
                // lock next tabs to prevent the user from moving forward with an error
                this.wizTabs.setTabState(this.wizTabs.getNextTab().id, 'locked', true);

        }
        // FE says this is valid, now try to save current data to server and see if we get any errors
        else {

            // if the fromName is stepPreview, it follows that this is "back" click,
            // and we save nothing from the preview step, so hit the save handler directly
            if(fromName == 'stepPreview') {
                this.handleSaveSuccess({}, fromName, toName, false /*isDraft*/);
                return;
            }
            // is there a custom save handler in the tab?
            if(hasSaveFunc) {
                this[fObjKey].save(fromName, toName, goingDirection == 'backward');
            } else {
                this.contestModel.save(fromName, toName,  goingDirection == 'backward');
            }

        }
    },

    // jump to a step without validation or anything
    jumpToStep: function(toName) {
        var that = this,
            tObjKey = toName + 'TabView',
            hasUpdFunc = this[tObjKey] && this[tObjKey].updateTab;

        // unlock and activate
        this.wizTabs.setTabState(toName, 'unlocked');
        this.wizTabs.activateTab(toName);

        // unlock all prev tabs
        _.each(this.wizTabs.getAllPrevTabs(), function(t){
            that.wizTabs.setTabState(t.id,'complete');
        });

        // call update func on tab
        if(hasUpdFunc) { this[tObjKey].updateTab(); }
    },

    // magic to bind UI changes of std form inputs to the model
    doAutoBind: function(e) {
        var $tar = $(e.target),
            k = $tar.data('modelKey'),
            ucK,
            v = $tar.attr('type')=='checkbox' ? $tar.prop('checked') : $tar.val(),
            cm = this.contestModel;

        //console.log(k,ucK,v,cm);
        if(k && v !== undefined) {
            ucK = k.charAt(0).toUpperCase()+k.slice(1); // upper case

            if(cm['set'+ucK]) {
                cm['set'+ucK](v); // Model has custom method to set this value
            } else {
                cm.set(k,v); // generic Model set method
            }
        } else {
            console.error('[ERROR] SSIContestPageEditView: doAutoBind no dataKey or key not in model. k=',k,'v=',v);
        }
    },

    // display a qtip for next/back buttons or tab clicks (uses class name to show proper error)
    onNavErrorTip: function(msgClass, $target) {
        var $cont = this.$el.find('.errorTipWrapper .errorTip').clone(),
            isBtn = $target.hasClass('btn')||$target.is('input');

        $cont.find('.'+msgClass).show(); // show our message

        // if message non existing, just put the class name in
        if(!$cont.find('.'+msgClass).length) {
            $cont = $('<div>['+msgClass+']</div>');
        }

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
                classes:'ui-tooltip-shadow ui-tooltip-red ssiErrorQTip',
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
                    classes:'ui-tooltip-shadow ui-tooltip-red ssiErrorQTip',
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

    // Display a (list) of strings in a modal.
    showErrorModal: function(content) {
        var $m = this.$el.find('.contestErrorsModal'),
            $l = $m.find('.errorsList');

        if(!_.isArray(content)) { content = [content]; } // arrayify

        $l.empty();

        _.each(content, function(c) {
            $l.append('<li>' + c + '</li>');
        });

        $m.modal();
    },

    // Payout views share this function, and Info view uses it for ATN
    updatePayoutTypeVisibility: function() {
        var hideOther = this.contestModel.get('optionShowPayoutTypeOther') === false,
            hidePoints = this.contestModel.get('optionShowPayoutTypePoints') === false,
            $pts = this.$el.find('label[for="payoutTypePoints"],label[for="payoutTypePoints_infoStep"]'),
            $oth = this.$el.find('label[for="payoutTypeOther"],label[for="payoutTypeOther_infoStep"]');

        if(hideOther) {$oth.hide();}
        if(hidePoints) {$pts.hide();}
    },

    // used in
    // - info step (step 1) (for award them now)
    // - payout step (step 3) (all other contest types)
    updateBillTo: function() {
        var that = this,
            $root = this.$el.find('.billToRoot:visible'),
            $wrap = $root.find('.billToWrapper'),
            $codes = $wrap.find('.otherBillToCodesWrapper'),
            cm = this.contestModel,
            bt = cm.get('billTo'),
            ptIsPts = cm.get('payoutType') == 'points',
            bcReq = cm.get('billCodeRequired'),
            $c1 = this.$el.find('#billToCode1'),
            $c2 = this.$el.find('#billToCode2'),
            c1 = cm.get('billToCode1'),
            c2 = cm.get('billToCode2');

        if(!$root.length) { return; } // something is wrong, we should have a $root element

        // hide/show bill to section
        // on the first call of this function the wrap doesn't yet exists
        // and its visibility is initialized by handlebars -- after that
        // this will do stuff
        $wrap[ptIsPts && bcReq ? 'slideDown' : 'slideUp']();

        // render the template if needed - initialize visibility in HaBa
        if(!$wrap.length && !this._renderingBillTo) {
            this._renderingBillTo = true; //yuck
            TemplateManager.get('billTo', function(tpl, vars, subTpls) {
                $root.append(tpl(_.extend({_initVisible: ptIsPts && bcReq}, this.contestModel.toJSON())));
                this._renderingBillTo = false;
                this.updateBillTo();
            }.bind(this));
        } else {
            // make sure proper radio button checked
            if(bt != $wrap.find('.billToRadio:selected').val()){
                $wrap.find('.billToRadio[value='+bt+']').prop('checked', true);
            }
            // if no billTo value then deselect all radios
            if(!bt) {
                $wrap.find('.billToRadio').prop('checked', false);
            }

            // update billCode 1 and/or 2 if necessary
            if(c1 !== $c1.val()) { $c1.val(c1); }
            if(c2 !== $c2.val()) { $c2.val(c2); }

            if( bt === 'other' ) {
                $codes.slideDown();
            } else {
                $codes.slideUp();
            }

            // maybe it should be disabled
            if(cm.get('status') == cm.STATUSES.LIVE) {
                // also remove flag class to validate
                this.$el.find('.billToWrapper')
                    .removeClass('validateme')
                    .find('input')
                    .prop('disabled', 'disabled');
            }
        }
    }

    /*
                                                                    ,     ,
                                                                    )\___/(
                                                                   {(@)v(@)}
                                                                    {|~~~|}
                                                                    {/^^^\}
                                                                     `m-m`
    */
});
