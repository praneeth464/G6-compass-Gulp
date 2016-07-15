/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
PageView,
WizardTabsView,
ParticipantCollectionView,
ParticipantSearchView,
PlateauAwardsPageView,
GoalquestPageEditView:true
*/
GoalquestPageEditView = PageView.extend({

    NARROW_THRESHOLD: 700, // body < this means we go into narrow mode (levels)

    initialize: function(opts) {
        var that = this;

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass ModuleView
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.$form = this.$el.find('.gqEditForm');

        // build model for some of the elements
        this.formModel = new Backbone.Model();
        this.extractFormData(); // populate the model

        // if no partner step, remove its tab and tab contents BEFORE wiz tabs init
        if(!this.formModel.get('showPartnerStep')) {
            this.$el.find('.wtTab[data-tab-name="stepPartner"]').remove();
            this.$el.find('.wizardTabsContent .stepPartnerContent').remove();
        }

        // init WizardTabsView
        this.wizTabs = new WizardTabsView({
            el: this.$el.find('.wizardTabsView'),
            onTabClick: function(e,ot,dt,wtv){
                // our handleTabClick function replaces the standard function in WTV
                that.handleTabClick(e,ot,dt,wtv);
            },
            scrollOnTabActivate: true
        });

        // init pax search
        this.initPartnerStep();

        // wire stuff up
        this.setupEvents();

        // initialize view
        this.initView();

        // initial update
        this.updateView();
    },

    events: {
        // next button events
        'click .stepOverviewContent .nextBtn':'goToNextStep',
        'click .stepRulesContent .nextBtn':'goToNextStep',
        'click .stepGoalContent .nextBtn':'goToNextStep',
        'click .stepPartnerContent .nextBtn':'goToNextStep',

        // back button events
        'click .stepContent .backBtn':'goBackAStep',

        // level change
        'change .levelIdInput':'doLevelIdChange',

        // award browse buttons
        'click .awardBtn .btn':'doViewAwardLevels',

        // yes / no select a partner
        'change .selectPartnerYesInput':'doSelectPartnerYesChange',

        // submit button
        'click .submitBtn':'doSubmitForm'
    },

    setupEvents: function() {
        this.formModel.on('change',this.updateLevels,this);
        this.formModel.on('change',this.updateSubmitStep,this);

        this.wizTabs.on('afterTabActivate',this.updateLevels,this);
        this.wizTabs.on('afterTabActivate',this.updateSubmitStep,this);

        this.formModel.on('change:selectPartnerYes',this.updatePartnerStep,this);
    },


    // generic next step
    goToNextStep: function(e) {
        var $tar = $(e.currentTarget),
            fromTab = this.wizTabs.getActiveTab(),
            toTab = this.wizTabs.getNextTab();

        e.preventDefault();
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'), $tar);
    },
    // generic back step
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
        if( toTab.get('state') === 'locked' ) { return; }

        // exit if the current tab was clicked
        if( fromTab.get('name') === toTab.get('name') ) { return; }
        
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'), $(e.currentTarget));
    },
    // generic from step to step checking for validation (guts of tab nav logic)
    goFromStepToStep: function(fromName, toName, $target) {
        var valFuncName = 'validate_'+fromName,
            hasValFunc = this[valFuncName]?true:false,
            validationRes = hasValFunc?this[valFuncName]():null;

        // there was a validation function + not valid
        if($target.hasClass("backBtn") === false && $target.hasClass("stateComplete") === false && validationRes && !validationRes.valid) {
            this.wizTabs.setTabState(fromName, 'incomplete'); // tab "error" state
            this.onNavErrorTip(validationRes.msgClass, $target, validationRes.vars||{}); // apply msg class to error element
        }
        // assume validation passed
        else {
            // if it is not the back button, we change the state
            if( $target.hasClass("backBtn") === false ) {
                this.wizTabs.setTabState(fromName, 'complete'); // complete 
                this.wizTabs.setTabState(toName, 'unlocked'); // unlock
            }
            this.wizTabs.activateTab(toName); // go to tab
        }
    },
    doSubmitForm: function(e) {
        var isSelPartYes = this.formModel.get('selectPartnerYes'),
            partPref = this.formModel.get('partnerPrefix'),
            regEx = new RegExp(partPref+'(\\[[0-9]+\\]|Count)');

        e?e.preventDefault():false;

        // clear out partner inputs if selected NO partners
        if( isSelPartYes === false ) {
            this.$form.find('input').filter(function(){
                var name = $(this).attr('name');
                return regEx.test(name);
            }).remove();
        }

        this.$form.submit();
    },



    // validate funcs
    validate_stepGoal: function() {
        var levId = this.formModel.get('levelId'),        
            isSelPlatAw = this.formModel.get('isSelectablePlateauAward'),
            selPlatAwId = this.formModel.get('selectedPlateauAwardId'),
            platAwReq = this.formModel.get('isPlateauAwardRequired'),
            isPlatType = this.formModel.get('awardType')==='plateau';

        // require a level be selected
        if(!levId) {
            return {
                valid: false,
                msgClass: 'msgNoLevel'
            };
        } 

        // if plateau item required, check to see its been set
        if(isPlatType && isSelPlatAw && platAwReq && !selPlatAwId) {
            return {
                valid: false,
                msgClass: 'msgNoPlatAw'
            };
        }

        return {valid:true};
    },
    validate_stepPartner: function() {
        var isChecked = this.$el.find('.selectPartnerYesInput:checked').length > 0,
            wantsPartners = this.formModel.get('selectPartnerYes'),
            numPartners = this.partnerView.model.length,
            hasPartners = numPartners > 0,
            maxPartners = parseInt(this.formModel.get('maxPartners'),10);

        // require to check one radio
        if(!isChecked) {
            return {
                valid: false,
                msgClass: 'msgNoPartnerYesPref'
            };
        }

        // if checked yes, require at least one partner
        if(wantsPartners && !hasPartners) {
            return {
                valid: false,
                msgClass: 'msgNoPartners'
            };
        }

        // if checked yes, and over max num partners
        if(wantsPartners && numPartners > maxPartners) {
            return {
                valid: false,
                msgClass: 'msgMaxPartners',
                vars: {
                    count: maxPartners,
                    removeCount: numPartners - maxPartners
                }
            };
        }

        return {valid:true};
    },



    // user initiated actions
    doLevelIdChange: function(e) {
        var $t = $(e.currentTarget);

        this.formModel.set({
            // set levelId 
            levelId: $t.val(),
            // clear out plateau award selection
            selectedPlateauAwardId: null,
            selectedPlateauAwardName: null,
            selectedPlateauAwardImgUrl: null
        });
    },
    doPlateauAwardSelect: function(award) {
        var isSelPlatAw = this.formModel.get('isSelectablePlateauAward'),
            selPlatAwId = this.formModel.get('selectedPlateauAwardId'),
            selPlatAwName = this.formModel.get('selectedPlateauAwardName'),
            selPlatAwImgUrl = this.formModel.get('selectedPlateauAwardImgUrl');

        if(!isSelPlatAw) return;

        this.formModel.set({
            levelId: award.levelId,
            selectedPlateauAwardId: award.awardId,
            selectedPlateauAwardName: award.awardName,
            selectedPlateauAwardImgUrl: award.awardImgUrl
        });
    },
    doSelectPartnerYesChange: function(e) {
        var val = this.$el.find('.selectPartnerYesInput:checked').val();

        this.formModel.set({
            'selectPartnerYes': val.toLowerCase()==='true'?true:false
        });
    },



    // initialize the view, run once on init
    initView: function() {
        var $levItems = this.$el.find('.levelItem'),
            awType = this.formModel.get('awardType'),
            isSelPlatAw = this.formModel.get('isSelectablePlateauAward');

        // add a class to style for diff awd types (points|plateau)
        $levItems.addClass(awType+'AwardType');

        // show hide things for awardTypes
        if( awType === 'plateau' ) {
            $levItems.find('.awardValue').hide();
        } 
        else if( awType === 'points') {
            $levItems.find('.awardName,.awardBtn').hide();
        }

    },
    // init partner stuff
    initPartnerStep: function() {
        var partnerPrefix = this.formModel.get('partnerPrefix');

        // exit if this is not shown
        if(!this.formModel.get('showPartnerStep')) { return; }

        // initial state
        this.partnerView = new ParticipantCollectionView({
            el : this.$el.find('.partnerView'),
            tplName :'partnerRow', //override the default template with this inline tpl
            model : new Backbone.Collection(this.formModel.get('partners')),
            feedToTpl: { // pass the partner prefix into the json
                partnerPrefix: partnerPrefix
            }
        });

        // hickity hack (give it the proper prefix for the partner beans STRUTS stuff)
        this.$form.find('.participantCount').attr('name',partnerPrefix+'Count');

        // page level reference to participant search view
        this.partnerSearchView = new ParticipantSearchView({
            el: this.$el.find('.partnerSearchView'),
            participantCollectionView: this.partnerView, // sync it
            selectMode: 'multiple',
            extraParams: {
                promotionId: this.formModel.get('promotionId'),
                goalId: this.formModel.get('goalId')
            }
        });
    },



    // update funcs
    updateView: function() {
        this.updateActiveTab();
        this.updateLevels();
        this.updatePartnerStep();
        this.updateSubmitStep();
    },
    updateActiveTab: function() {
        var id = this.formModel.get('activeStep'),
            prevTabs,
            that = this;

        if(id) {
            // unlock and set the desired tab
            this.wizTabs.setTabState(id,'unlocked');
            this.wizTabs.activateTab(id);

            // set all tabs up to this one to 'complete' state
            prevTabs = this.wizTabs.getAllPrevTabs();
            _.each(prevTabs, function(t){
                that.wizTabs.setTabState(t.get('id'),'complete');
            });
        }
    },
    updateLevels: function() {
        var $selLev = this.$form.find('.levelIdInput:checked'), // selected radio
            $levIt = $selLev.closest('.levelItem'),
            isPlatType = this.formModel.get('awardType')==='plateau',
            isSelPlatAw = this.formModel.get('isSelectablePlateauAward'),
            selPlatAwId = this.formModel.get('selectedPlateauAwardId'),
            selPlatAwName = this.formModel.get('selectedPlateauAwardName'),
            selPlatAwImgUrl = this.formModel.get('selectedPlateauAwardImgUrl'),
            levelId = this.formModel.get('levelId'),
            isNarrow = $('body').width() < this.NARROW_THRESHOLD;

        // sync level if necessary
        if(levelId+'' !== $selLev.val()+'') {
            $selLev = this.$form.find('.levelIdInput[value="'+levelId+'"]').prop('checked',true);
            $levIt = $selLev.closest('.levelItem');
        }

        // hide all buttons (show buttons only on active)
        this.$form.find('.awardBtn').hide();

        // empty and hide all awardNames
        this.$form.find('.awardName').empty().hide();

        // clear input for plat aw id
        this.$form.find('.selectedPlateauAwardIdInput').val('');

        // add active class
        this.$form.find('.levelItem').removeClass('active'); // clear
        $levIt.addClass('active');

        // add narrow class if apropo
        this.$form.find('.levelItem').removeClass('isNarrow');
        $levIt.addClass(isNarrow?'isNarrow':'');

        // add selectable class if apropo
        this.$form.find('.levelItem').removeClass('isSelectable');
        $levIt.addClass(isPlatType&&isSelPlatAw ? 'isSelectable' : '');

        // add selected class if apropo
        this.$form.find('.levelItem').removeClass('isSelected');
        $levIt.addClass(isPlatType&&selPlatAwId ? 'isSelected' : '');
        

        // show/set apropo elements for active level
        if(isPlatType&&isSelPlatAw) {
            if(selPlatAwId) {
                $levIt.find('.awardName')
                    .html(this.formModel.get('selectedPlateauAwardName'))
                    .show();
                this.$form.find('.awardEdit').show();
            } else {
                this.$form.find('.awardSet').show();
            }
        } else if(isPlatType) {
            console.log('wut');
            this.$form.find('.awardBrowse').show();
        }

        // syc hidden plateau award inputs
        this.$form.find('.selectedPlateauAwardIdInput').val(selPlatAwId||'');
        this.$form.find('.selectedPlateauAwardNameInput').val(selPlatAwName||'');
        this.$form.find('.selectedPlateauAwardImgUrlInput').val(selPlatAwImgUrl||'');

        // display of selected plateau award
        this.updateSelectedPlateauAwardTip();
    },
    updateSelectedPlateauAwardTip: function() {
        var $selLev = this.$form.find('.levelIdInput:checked'), // selected radio
            $levIt = $selLev.closest('.levelItem'),
            $qtipCont = this.$form.find('.selectedPlateauAwardWrapper .selectedPlateauAward').clone(), // qtip content
            isSelPlatAw = this.formModel.get('isSelectablePlateauAward'),
            selPlatAwId = this.formModel.get('selectedPlateauAwardId'),
            selPlatAwName = this.formModel.get('selectedPlateauAwardName'),
            selPlatAwImgUrl = this.formModel.get('selectedPlateauAwardImgUrl'),
            isPlatType = this.formModel.get('awardType')==='plateau',
            isIe7 = $.browser.msie&&$.browser.version==='7.0',
            isNarrow = $('body').width() < this.NARROW_THRESHOLD; // switch the orientation of qtip for narrow

        // must be selectable plateau type and visible to do this
        if( !isPlatType || !isSelPlatAw || !$selLev.is(':visible')) { return; }

        // destroy all qtips (destroy instead of hide b/c of ie7/8 issues)
        this.$el.find('.selectedPlateauAwardQTip').qtip('destroy');

        // fill in DOM elements
        $qtipCont.removeClass('noAward');
        $qtipCont.addClass(isNarrow?'isNarrow':'');
        if(selPlatAwId) {
            $qtipCont.find('.paTitle').html(selPlatAwName);
            $qtipCont.find('.paImg').empty().append('<img src="'+selPlatAwImgUrl+'">');
        } else {
            $qtipCont.addClass('noAward');
        }

        if( !$levIt.data('qtip') ) {
            // create qtip
            $levIt.qtip({
                content:{text: $qtipCont},
                position:{
                    my: isNarrow?'top center':'right center',
                    at: isNarrow?'bottom center':'right center',
                    container: $selLev.closest('.levelsWrapper'),
                    viewport: $selLev.closest('.levelsWrapper'),
                    adjust:{
                        method: isNarrow?'none':'none shift',
                        x: isNarrow?20:10,
                        y: isNarrow?-5:10
                    },
                    effect: false
                },
                show:{ event:false, ready:false, effect:false },
                hide:{ event:false, effect:false },
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-light selectedPlateauAwardQTip',
                    tip: {
                        corner: isNarrow?true:'left center',
                        width: 40,
                        height: 20
                    }
                }
            });
        }

        $levIt.qtip('show');
        
        if(isIe7){ // hack display issue in ie7
            $levIt.data('qtip').elements.tooltip.css('zoom',1);
        }
        

    },
    updatePartnerStep: function() {
        var $searchSlider = this.$el.find('.partnerSearchSlidingWrapper'), 
            isShowSearch = this.formModel.get('selectPartnerYes');

        if(isShowSearch) { 
            this.partnerSearchView.$el.show();
            $searchSlider.slideDown(G5.props.ANIMATION_DURATION);
        } else {
            $searchSlider.slideUp(G5.props.ANIMATION_DURATION);
        }
    },
    // kind of a silly function that copies values from selected level
    updateSubmitStep: function() {
        var that = this,
            $gs = this.$el.find('.stepGoalContent'),
            $ss = this.$el.find('.stepSubmitContent'),
            $platImgCont = this.$el.find('.submitPlateauAwardImageContent'),
            $partners = this.$el.find('.submitPartners'),
            isPlatType = this.formModel.get('awardType')==='plateau',      
            isSelPlatAw = this.formModel.get('isSelectablePlateauAward'),
            selPlatAwId = this.formModel.get('selectedPlateauAwardId'),
            selPlatAwName = this.formModel.get('selectedPlateauAwardName'),
            selPlatAwImgUrl = this.formModel.get('selectedPlateauAwardImgUrl'),
            selPartYes = this.formModel.get('selectPartnerYes');

        // all classes that need to pull data from the 'goal' tab marked with .dyn
        $ss.find('.dyn').each(function(){
            var $t = $(this),
                contClass = $t.attr('class').match(/submit([a-z]+)/i)[1],
                $src;

            // lowercase first char
            contClass = contClass.charAt(0).toLowerCase() + contClass.slice(1);
            $src = that.$el.find('.levelItem.active .'+contClass);

            // dump the contents from contentClass into this .dyn element (make sure this is done after level updated)
            if($src.length) {
                $t.html($src.html());
            }

            // show hide based on the 'display' css value of $src (hokey, yes, a bit)
            $t[ $src.css('display') === 'none' ? 'hide' : 'show' ]();

            // special case
            if($t.hasClass('dyn_showIfCont') && $src.length) {
                $t.show();
            }
        });

        // is plateau type but plateau awards not selectable OR no award selected
        if(isPlatType && (!isSelPlatAw||!selPlatAwId) ) {
            // level name
            $ss.find('.submitAwardName.dyn')
                .html($gs.find('.levelItem.active .levelName').html()).show();
            // browse btn (why not? level name is redundant)
            // $ss.find('.submitAwardName.dyn')
            //     .html($gs.find('.levelItem.active .awardBtn.awardBrowse').clone()).show(); 
        }

        //baseProgramDeets

        // award image/title update
        $platImgCont.hide();
        if(isSelPlatAw&&selPlatAwId) {
            $platImgCont.show();
            $platImgCont.find('.paTitle').html(selPlatAwName);
            $platImgCont.find('.paImg').empty().append('<img src="'+selPlatAwImgUrl+'">');
        }

        // partners update
        this.$el.find('.partnerOnly').hide();
        if(selPartYes&&this.partnerView.model.length>0) {
            this.$el.find('.partnerOnly').show();
            $partners.empty();
            _.each(that.partnerView.model.models,function(p){
                $partners.append('<span class="label">'+p.get('firstName')+' '+p.get('lastName')+'</span> ');
            });
        }

    },



    // plateau awards modal
    doViewAwardLevels: function(e){
        var that = this,
            isSelectMode = $(e.target).closest('.awardBtn').hasClass('awardSet') || $(e.target).closest('.awardBtn').hasClass('awardEdit'),
            levelId = $(e.target).closest('.levelItem').find('.levelIdInput').val();

        e ? e.preventDefault() : false;

        // modal stuff
        if(!this.$merchModal) {
            this.$merchModal = this.$el.find('#levelMerchModal').detach();
            $('body').append(this.$merchModal); // move it to body

            // possible events: show|shown|hide|hidden
            this.$merchModal.on('shown',function(){
                that.updateMerchModal(that._lastLevId); 
            }); 
            // clear awards contents on hidden
            this.$merchModal.on('hidden',function(){ 
                that.$merchModal.find('.modal-body').empty(); 
            }); 

            // create modal
            this.$merchModal.modal({
                backdrop:true,
                keyboard:true,
                show:false
            });   
        }

        this.$merchModal
            .data('isSelectModeOverride', isSelectMode)
            .data('levelId', levelId)
            .modal('show'); 
    },
    // init and manage PlateauAwardsPageView
    updateMerchModal: function(levelId){
        var that = this;

        if(!this.$merchModal) { return; } // exit if no dom element


        // using an overridable global var to find where the Plat. Aw. Pg. is
        $.ajax({
            url: G5.props.URL_PAGE_PLATEAU_AWARDS
        }).done(function(html){       
            // clean out script from html -- regular page has some
            // we will insantiate manually
            html = html.replace(/<script>[\s\S]*<\/script>/ig,'');
            that.$merchModal.find('.modal-body').empty().append(html);
            // insantiate page view - hand it the promoId/levelId
            that.plateauAwardsPageView = new PlateauAwardsPageView({
                el:that.$merchModal.find('#plateauAwardsPageView'),
                showPromotionSelect: false,
                isSelectMode: that.formModel.get('isSelectablePlateauAward') && that.$merchModal.data('isSelectModeOverride'),
                isSheetMode: true,
                promotionId: that.formModel.get('promotionId'),
                levelId: that.$merchModal.data('levelId') || that.formModel.get('levelId')
            });

            // listen for award select
            that.plateauAwardsPageView.on('awardSelected', that.doPlateauAwardSelect, that);
        });
    },




    // extract form data and put in our model
    extractFormData: function(){
        var that = this,
            serializedForm = this.$form.serializeArray(),
            $inputs = this.$form.find('input[class$="Input"]'),
            json = {},
            $pp = this.$form.find('input[name$="Count"]'), // try to discover the partnerPrefix
            partnerPrefix = $pp.length ? $pp.attr('name').replace('Count','') : 'partners';
        
        // turn off autocomplete (FF mainly)
        $inputs.attr('autocomplete', 'off');

        // any input element with a class name containing *Input gets dumped into JSON
        $inputs.each(function(){ 
            var $t = $(this),
                k = $t.attr('class').match(/([a-zA-Z]+)Input/),
                v = $t.val(),
                wasBoolStr = false;

            k = k&&k.length===2 ? k[1] : null; // extract the key from the regex match
            
            // convert true false strings to boolean values
            if( typeof v === 'string' && /^true$|^false$/i.test(v) ) {
                // we know we have a string of "true" or "false"
                v = /^true$/i.test(v); // true for true, false for false ;)
                wasBoolStr = true;
            }

            // if its a radio (several inputs with same name/key)
            if(wasBoolStr && $t.is('[type=radio]')) {
                json[k] = json[k]||$t.is(':checked')&&/^true$/i.test($t.val()); // accumulate truey-ness
            } 

            // if its normal value
            else {
                json[k] = v; // assign
            }

        });

        // special case for level id
        json.levelId = $inputs.filter('.levelIdInput:checked').val()||null;

        json.partners = this.extractFormPartners(serializedForm, partnerPrefix);
        json.partnerPrefix = partnerPrefix;
        
        this.formModel.set(json);
    },
    // go through and extract the partners
    extractFormPartners: function(formArray, prefix){
        var that = this,
            map = {}, //map pax id to props
            arry,
            count = -1; //recip count

        _.each(formArray, function(inp){
            var brkt,num,key;

            if(inp.name.indexOf(prefix)===0){
                //extract count
                if(inp.name == prefix+'Count'){
                    count = parseInt(inp.value, 10);
                }
                //extract data
                else {
                    brkt = inp.name.match(/\[(\d+)\]/); //just the [#] part
                    num = brkt.length===2?parseInt(brkt[1],10):false; //get the number
                    key = inp.name.match(/\]\.(.+)$/)[1]; //get the key

                    map['recip'+num]?true:map['recip'+num]={};//not set? set it
                    map['recip'+num][key] = inp.value;        
                }

                // pax collection view will render its own inputs, remove these after collecting
                that.$el.find('[name="'+inp.name+'"]').remove();
            }
        });


        arry = _.toArray(map); //turn it into an array
        if(arry.length!==count){
            console.error('[ERROR] GoalquestPageEditView - extractFormPartners() ['+prefix+'] counts do not match '
                + arry.length + ' != '+ count);
        }

        console.log('[INFO] GoalquestPageEditView - extractFormPartners() - found ' + arry.length + ' pax of type ['+prefix+']');

        return  arry;
    },



    // display a qtip on next button
    onNavErrorTip: function(msgClass, $target, vars){
        var $cont = this.$el.find('.nextBtnTipWrapper .nextBtnTip').clone(),
            $msg = $cont.find('.'+msgClass),
            msg = $msg.html(),
            isBtn = $target.hasClass('btn');

        // fill in placeholder vals
        if(vars) {
            _.each(vars,function(v,k){
                msg = msg.replace('{'+k+'}',v);
            });
            $msg.html(msg);
        }

        $msg.show(); // show our message

        //attach qtip and show
        $target.qtip({
            content:{text: $cont},
            position:{
                my: isBtn?'bottom center':'top center',
                at: isBtn?'top center':'bottom center'
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
                classes:'ui-tooltip-shadow ui-tooltip-red gqNextBtnQTip',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    }

});