/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
PageView,
ParticipantSearchView,
AwardeeCollectionView,
DrawToolView,
ContributorsView,
RecognitionPageBadgesView,
RecognitionPageSendView:true
*/
RecognitionPageSendView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var that = this;

        //set the appname
        this.appName = 'recognition';

        //sections which change when promo changes
        this.promoDependentSectionNames = [
            'ecards',
            'behavior',
            'message',
            'copies',
            'deliverDate',
            'deliverDatePurl',
            'anniversaryCelebrate',
            'recognitionPrivate',
            'contributors',
            'team'
        ];


        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);


        //form prefix for array data (on struts generated form @ top of document)
        this.recipFormNamePrefix = 'claimRecipientFormBeans';
        this.contribFormNamePrefix = 'claimContributorFormBeans';

        //dom elements
        this.$sendForm = this.$el.find('#sendForm');
        this.$dataForm = opts.$dataForm||this.$el.find('#dataForm');
        if(this.$dataForm.length===0){
            console.error('[ERROR] RecognitionPageSendView - no #dataForm set or found');
        }
        this.$promo = this.$sendForm.find('#promotionId');
        this.$node = this.$sendForm.find('#nodeId');
        this.$customFormEls = this.$dataForm.find('.customFormContent').detach();

        //detached dom elements
        this.detachedElements = {};

        // if we haven't been passed formSetup data, we need to cancel the init and wait for the load to happen
        if( !opts.formSetup ) {
            // hiding the contents of the view so the user doesn't try to interact with "broken" stuff
            this.$el.find('.row').hide();
            // tossing up a spinner so the user is convinced that something—anything!—is happening while they wait
            G5.util.showSpin(this.$el, {
                cover : true,
                classes : 'pageView'
            });
            // undoing the event delegation so it doesn't accidentally happen twice once we actually get our data
            this.undelegateEvents();

            // let's go get the formData from an external URL
            $.ajax({
                dataType : 'g5json',
                type: "POST",
                url : G5.props.URL_JSON_SEND_RECOGNITION_GET_FORMSETUP,
                data: {},
                error: function(jqXHR, textStatus, errorThrown) {
                    G5.util.hideSpin( $('#recognitionPageSendView') );
                    that.$el.find('#serverErrorsContainer')
                        .show()
                        .html('<p>' + textStatus + ': ' + jqXHR.status + ' ' + errorThrown + '</p>')
                        .siblings().hide()
                        .closest('.row').show();
                },
                success: function(servResp){
                    that.reinitialize({ formSetup : servResp.data.formSetup });
                }
            });

            // prevent the rest of the initialize function from running, as it'll puke horribly without its precious formSetup
            return;
        }

        //form setups data
        this.formSetup = this.prepareFormSetup(opts.formSetup);
        this.activePromotionSetup = null;
        this.activeNodeSetup = null;
        this.calcSetup = null;

        //form settings data
        this.formSettings = this.parseForm(this.$dataForm); //preset data (promo/node, recip, etc...)

        // happens once after initialize() unless special circumstances
        this.on('eventsDelegated',function(){ this.triggerPreselectedItems(); },this);

        // 1 - start the cascade of events to build the form and set its states
        this.initForm();

    },

    // for late-arriving formSetup data
    reinitialize:function(opts) {
        var fullOpts = $.extend({},this.options,opts);

        this.$el.find('.row').show();
        G5.util.hideSpin(this.$el);

        this.initialize(fullOpts);
        this.delegateEvents();
    },

    events: {
        //promo
        "change #promotionId":"promoChanged",
        "click #recognitionButtonChangePromo":"changePromoButtonClick",
        "click #recognitionButtonChangePromoConfirm":"changePromoConfirmButtonClick",
        "click #recognitionButtonChangePromoCancel":"changePromoCancelButtonClick",
        "click .doViewRules":"showRulesModal",

        //node
        "change #nodeId":"nodeChanged",
        "click #recognitionButtonChangeNode":"changeNodeButtonClick",
        "click #recognitionButtonChangeNodeConfirm":"changeNodeConfirmButtonClick",
        "click #recognitionButtonChangeNodeCancel":"changeNodeCancelButtonClick",

        //copies
        "blur #sendCopyToOthers":"validateCopyOthers",
        "click input[type=checkbox][readonly=readonly]":function(e){e.preventDefault();e.stopPropagation();},

        //recipients
        "click #recognitionButtonShowRecipientSearch":"showRecipientSearch",

        //action buttons
        "click #recognitionButtonSend":"submitForm",
        "click #recognitionButtonPreview":"submitForm",
        "click #recognitionButtonSendPurl": "submitForm",
        "click #recognitionButtonCancel":"recognitionButtonCancelClick",
        "click #recognitionSendCancelDialogConfirm":"cancelForm",
        "click #recognitionSendCancelDialogCancel":function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        },

        //misc
        "change .deliverDatePurlSection .datepickerInp":"purlDateChanged",

        // contribs view tab nav
        "click .purlBtn.nextBtn":"doContribNextStep",
        "click .purlBtn.backBtn":"doContribBackStep"
    },

    // TRICKY -- overriding Backbone.View.delegateEvents() method
    // - this adds an event to trigger DOM events on initialization of View
    // - initialize() happens before delegateEvents()
    delegateEvents: function(events) {
        PageView.prototype.delegateEvents.apply(this, arguments);
        this.trigger('eventsDelegated');
    },
    // INIT Behavior -- trigger change on elements that have been selected
    // - node and promo change events should trigger cascade of changes
    triggerPreselectedItems: function(){
        if(this.$promo.val()){ this.$promo.trigger('change'); }
        if(this.$node.val()){ this.nodeChanged({target:this.$node}); }
    },

    // ===================
    // SECTION FUNCTIONS
    // ===================

    initForm: function(){
        // promotion change triggers cascade of events that
        // inits the rest of the form
        this.initSection('promotion');

        // if promotion doesn't have a value after init, then we know it was not set by struts form
        if(!this.$promo.val()){
            this.showInstructions();
        }

        // inherit any server errors from the dataForm
        this.inheritErrorsFromDataForm();

        // inject custom elements from data (struts) form
        this.injectCustomFormElements();

        // give the send form the same action as the struts form
        this.$sendForm.attr('action',this.$dataForm.attr('action'));

        // use method from struts in send form
        if(this.formSettings.method) {
            this.$sendForm.find('#sendFormMethod').val(this.formSettings.method);
        } else {
            this.$sendForm.find('#sendFormMethod').remove();
        }

    },

    //superficial show of node dep. sections
    initAndShowNodeDependentSections: function(){
        var that = this,
            $searchSec = this.$el.find('fieldset.formSection.participantSearchSection'),
            $recipSec = this.$el.find('fieldset.formSection.recipientsSection');

        // recipients first, as the recip view is handed to search view
        this.initSection('recipients');
        this.initSection('participantSearch');

        $searchSec.slideDown(G5.props.ANIMATION_DURATION);
        $recipSec.slideDown(G5.props.ANIMATION_DURATION);
    },


    //superficial hide of node dep. sections
    hideNodeDependentSections: function(){
        var that = this,
            $searchSec = this.$el.find('fieldset.formSection.participantSearchSection'),
            $recipSec = this.$el.find('fieldset.formSection.recipientsSection');

        $searchSec.slideUp(G5.props.ANIMATION_DURATION);
        $recipSec.slideUp(G5.props.ANIMATION_DURATION);
    },


    //superficial show of promo dep. sections
    showPromoDependentSections: function(){
        var that = this,
            animCnt=-1; // animation time multiplier

        // EXCEPTIONS
        // copies section is based on granular settings
        this.activePromotionSetup.copiesActive = this.isCopiesSectionActive();
        // deliverDatePurlActive derived from isPurl
        this.activePromotionSetup.deliverDatePurlActive = this.isPurl();


        _.each(this.promoDependentSectionNames, function(name,i){
            var $section = that.$el.find('fieldset.formSection.'+name+'Section');
            if(that.activePromotionSetup[name+'Active'] && !$section.is(':visible')){
                animCnt++;
                $section.children().not('.hide').show();
                setTimeout(function(){
                    $section.slideDown(G5.props.ANIMATION_DURATION);
                },G5.props.ANIMATION_DURATION*animCnt);
            }
        });


        // show any custom section (using special class 'customSection' + id + formSetup json)
        this.$el.find('fieldset.formSection.customSection').each(function(){
            var $sec = $(this);
            if(that.activePromotionSetup[$sec.attr('id')+'Active'] && !$sec.is(':visible')){
                animCnt++;
                //$sec.slideDown(G5.props.ANIMATION_DURATION*2*animCnt);
                setTimeout(function(){
                    $sec.slideDown(G5.props.ANIMATION_DURATION);
                },G5.props.ANIMATION_DURATION*animCnt);
            }
        });

        this.updatePageTitle();

        // show the actions section now
        this.$el.find('.formSection.actionsSection').show();

        // show the actions for non-purl, purl has actions built into the contrib. wizard
        // if(!this.isPurl()) {
        //     this.$el.find('.formSection.actionsSection').show();
        // }
    },

    // set the page title
    updatePageTitle: function() {
        if(!this.origTitle){ this.origTitle = this.getPageTitle(); }
        // Superclass func. - PageView.setPageTitle()
        this.setPageTitle(this.getPromoSetup().pageTitle||this.origTitle);
    },

    //superficial hide of sections
    hidePromoDependentSections: function(){
        var that = this;

        if(that.activePromotionSetup){//is there an active promo setup?
            _.each(this.promoDependentSectionNames, function(name){
                var $section = that.$el.find('fieldset.formSection.'+name+'Section');
                if(that.activePromotionSetup[name+'Active'] && $section.is(':visible')){
                    $section.slideUp(G5.props.ANIMATION_DURATION);
                }
            });
        }

        //hide any custom section (using special class 'customSection' + id + formSetup json)
        this.$el.find('fieldset.formSection.customSection').each(function(){
            var $sec = $(this);
            if(that.activePromotionSetup
                && that.activePromotionSetup[$sec.attr('id')+'Active']
                && $sec.is(':visible')){

                $sec.slideUp(G5.props.ANIMATION_DURATION);
            }
        });

        // hide the actions for non-purl, purl has actions built into the contrib. wizard
        // if(!this.isPurl()) {
        //     this.$el.find('.formSection.actionsSection').hide();
        // }

    },

    //set values and init views
    initPromoDependentSections: function(){
        var that = this;

        // if has rules, show link
        if(this.getPromoSetup() && this.getPromoSetup().rulesText) {
            this.$el.find('.doViewRules').show();
        } else {
            this.$el.find('.doViewRules').hide();
        }

        _.each(this.promoDependentSectionNames, function(name){
            that.initSection(name);
        });

        //init custom sections
        this.$el.find('fieldset.formSection.customSection').each(function(){
            var $sec = $(this);
            that.initCustomSection($sec);
        });
    },

    //init a section - fill in its values and set it up
    initSection: function(sectionName){
        var funcName,
            $section = this.$el.find('fieldset.formSection.'+sectionName+'Section');

        //capitalize
        sectionName = sectionName.charAt(0).toUpperCase()+sectionName.slice(1);
        funcName = 'init'+sectionName+'Section';

        //if this function exists, then call it -- pass the form section
        if(typeof this[funcName] === 'function'){
            this[funcName]($section);
        }
    },

    //detach a section so it won't be a part of the html/form
    detachSection: function($section){
        var $children = $section.children();
        //if not empty, then attach contents
        if($children.length > 0){
            $section.slideUp(G5.props.ANIMATION_DURATION,function(){
                $section.data('detachedChildren',$children.detach());
            });
        }
    },

    //attach a previously detached section so it is a part of the html/form
    attachSection: function($section){
        //if we have data for detached children
        if($section.data('detachedChildren')){
            $section.append($section.data('detachedChildren'));
            //clear data
            $section.removeData('detachedChildren');
        }

        // ??? even if we didn't attach, we still want to leave this thing hidden
        if($section.is(':visible')){
            //$section.slideUp(G5.props.ANIMATION_DURATION);
        }
    },

    //this happens only once for PROMOTION, at page init
    initPromotionSection: function($section){
        var that = this,
            name,
            $promo = $section.find('#promotionId');

        _.each(this.formSetup.promotions, function(promo){
            var opt = that.make('option',{value:promo.id},promo.name);
            $promo.append(opt);
        });

        // is there a particular value to be set?
        // dataForm and sendForm must have matching 'name' attributes (curr: promotionId)
        name = $promo.attr('name');
        if(this.formSettings[name]){ // if this value from dataForm exists
            $promo.val(this.formSettings[name]); // set the val
            delete this.formSettings[name]; // ensure this happens once only
        }

        this.populateNodes();
    },

    initParticipantSearchSection: function($section){
        if(this.recipientSearchView){
            // clear out current search
            this.recipientSearchView.model.removeAllFilters();
            // hide the recip search overlay
            this.$el.find('.addRecipientsWrapper').hide();
            // make sure the search is visible
            this.recipientSearchView.$el.show();

        } else {
            // page level reference to participant search view
            this.recipientSearchView = new ParticipantSearchView({
                el : $section.find('#participantSearchView'),
                participantCollectionView : this.recipientView,
                selectMode: this.isSingleSelectMode()?'single':'multiple',
                extraParams: {
                    promotionId: this.activePromotionSetup.id,
                    nodeId: this.activeNodeSetup.id
                }
            });

            //if there are recipients passed from server, then display add recips butt
            if(this.recipientView.model.length==1) {
                this.recipientSearchView.$el.hide(); //hide search
                $section.find('.addRecipientsWrapper').show()
                    .find('.recipientInfo').text(
                        this.recipientView.model.at(0).get('firstName')+' '+
                        this.recipientView.model.at(0).get('lastName')
                    ); //show brief
            }
            // 0 or more than 1 recip
            else {
                this.recipientSearchView.$el.show();
            }
        }

        if(this.activePromotionSetup&&this.isPurl()){
            var $searchHeadline = $section.find('.findRecipientTitle'),
                $addBtn = $section.find('.addRecipientsWrapper .btn');

            $searchHeadline.text($searchHeadline.data('purlTitle'));
            $addBtn.text($addBtn.data('purlTitle'));
        }


    },

    initRecipientsSection: function($section){
        if(this.recipientView){
            // clear selected recips
            this.recipientView.model.reset();

        } else {
            // initial state
            this.recipientView = new AwardeeCollectionView({
                el : $section.find('#recipientsView'),
                tplName :'participantRowAwardItem', //override the default template
                model : new Backbone.Collection(this.formSettings.recipients),
                parentView: this, //give a pointer to this view
                max: this.activePromotionSetup.maxRecipients||0
            });

            // trigger event in case of PURL recip set
            this.recipientView.model.on('add',function(o){
                if(this.isPurl()) {
                    this.trigger('purlRecipientSet', o, o.get('nodes') ? o.get('nodes')[0].id : null);
                }
            }, this);

            // hide the single participant name, and show search whenever there is a remove
            // (for the case of single data form user being deleted, and name remaining)
            this.recipientView.model.on('remove',function(o){
                this.showRecipientSearch();
            }, this);

            // trigger event in case of PURL recip NodeId change
            this.recipientView.on('recipientNodeIdChange', function(obj){
                if(this.isPurl()) {

                    this.trigger('recipientNodeIdChange',
                        this.recipientView.model.get(obj.recipientId),
                        obj.nodeId);
                }
            }, this);

            // show a message if max recipients exceeded (Nomination type of Promo)
            this.recipientView.on('maxRecipientsExceeded', function(max){
                var $theMsg = $section.find('.maxRecipientsExceededMsg').clone().show();
                // whoa, this is wierd, but sort of ok
                $theMsg.html($theMsg.html().replace('{{max}}',max));
                this.recipientSearchView.showTableMsg($theMsg);
            }, this);

            delete this.formSettings.recipients;
        }

        if(this.activePromotionSetup&&this.isPurl()){
            var $searchHeadline = $section.find('.selectRecipientTitle');

            $searchHeadline.text($searchHeadline.data('purlTitle'));
        }
    },

    initTeamSection: function($section){
        var $tn = $section.find('#teamName');
        if(this.activePromotionSetup&&this.activePromotionSetup.teamActive){
            this.attachSection($section);
            if(this.formSettings.teamName) {
                $tn.val(this.formSettings.teamName);
                delete this.formSettings.teamName;
            }
        } else {
            //hide and detach
            this.detachSection($section);
        }
    },

    initEcardsSection: function($section){
        var that = this, $dtEl;
        if(this.activePromotionSetup&&this.activePromotionSetup.ecardsActive){
            this.attachSection($section);

            if(this.drawToolView) { // remove
                this.drawToolView.undelegateEvents();
                this.drawToolView.$el.removeData().unbind();
                this.drawToolView.remove();
                this.drawToolView = null; // deref
            }

            $dtEl = $section.find('#drawToolShell');

            if(!$dtEl.length) {
                $section.append('<div id="drawToolShell"/>');
                $dtEl = $section.find('#drawToolShell');
            }

            //$dtEl.hide(); // this should cause it to toggle open (DrawToolView logic)

            this.drawToolView = new DrawToolView({
                el:$dtEl,
                drawingToolSettings: {
                    eCards: that.getPromoSetup().eCards,
                    drawToolCardType: that.formSettings.cardType||"none",
                    drawToolCardId: that.formSettings.cardId||"",
                    drawToolCardUrl: that.formSettings.cardUrl||"",
                    drawingData: that.formSettings.drawingData||"",
                    canDraw: that.getPromoSetup().drawToolSettings.canDraw,
                    canUpload: that.getPromoSetup().drawToolSettings.canUpload,
                    sizes: that.getPromoSetup().drawToolSettings.sizes,
                    colors: that.getPromoSetup().drawToolSettings.colors
                }
            });

            // clear these out (use them once only)
            if(this.formSettings.cardType) delete this.formSettings.cardType;
            if(this.formSettings.cardId) delete this.formSettings.cardId;
            if(this.formSettings.cardUrl) delete this.formSettings.cardUrl;
            if(this.formSettings.drawingData) delete this.formSettings.drawingData;

        } else {
            //hide and detach
            this.detachSection($section);

        }
    },

    initBehaviorSection: function($section){
        var that = this,
            behavs, $behavs, name, $validation, req;

        if(this.activePromotionSetup && this.activePromotionSetup.behaviorActive){
            this.attachSection($section);
            this.badgesView = new RecognitionPageBadgesView({
                el: '#recognitionFieldsetBehavior',
                containerView: this,
                defaultBehavior: $('#dataForm [name = selectedBehavior]').val()
            });

            this.badgesView.on('badgeIdUpdated', function(id) {
                G5.util.formValidate(that.$el.find('#recognitionFieldsetBehavior .validateme'));
            });
        } else {
            this.detachSection($section);
        }
    },

    initMessageSection: function($section){
        var $com = $section.find('#comments');

        if(this.activePromotionSetup&&this.activePromotionSetup.messageActive) {
            this.attachSection($section);
            $com = $section.find('#comments');

            // clear comments
            $com.val('');

            // remove old plugin (attaching at end)
            if( $com.length && _.has($com.get(0),'jhtmlareaObject') ) {
                $com.htmlarea('dispose');
            }

            // comments from data form?
            if(this.formSettings.comments) {
                $com.val(this.formSettings.comments);
                delete this.formSettings.comments;
            }

            // attach plugin
            $com.htmlarea(G5.props.richTextEditor);

        } else {
            if( $com.length && _.has($com.get(0),'jhtmlareaObject') ) { // has plugin?
                $com.htmlarea('dispose'); // must dispose, otherwise croaks on detach
            }
            this.detachSection($section);
        }
    },

    initCopiesSection: function($section){
        var $ctMan = $section.find('#sendCopyToManager'),
            $ctMe = $section.find('#sendCopyToMe'),
            $ctOth = $section.find('#sendCopyToOthers'),
            isMan = this.activePromotionSetup&&this.activePromotionSetup.copyManagerActive,
            isMe = this.activePromotionSetup&&this.activePromotionSetup.copyMeActive,
            isOth = this.activePromotionSetup&&this.activePromotionSetup.copyOthersActive,
            copAct = isMan || isMe || isOth; // if any of these, then copy section active

        if(copAct){
            // attach full section
            this.attachSection($section);

            $ctMan = $ctMan.length ? $ctMan : $section.find('#sendCopyToManager');
            $ctMe = $ctMe.length ? $ctMe : $section.find('#sendCopyToMe');
            $ctOth = $ctOth.length ? $ctOth : $section.find('#sendCopyToOthers');

            // set active states
            $section.find('.copyManagerWrapper')[isMan?'removeClass':'addClass']('hide')
               .find('input')[isMan?'removeAttr':'attr']('disabled','disabled');

            $section.find('.copyMeWrapper')[isMe?'removeClass':'addClass']('hide')
                .find('input')[isMe?'removeAttr':'attr']('disabled','disabled');

            $section.find('.copyOthersWrapper')[isOth?'removeClass':'addClass']('hide')
                .find('input')[isOth?'removeAttr':'attr']('disabled','disabled');


            // set value stats
            $ctMan.prop('checked',this.formSettings[$ctMan.attr('name')]==="on");
            delete this.formSettings[$ctMan.attr('name')];

            $ctMe.prop('checked',this.formSettings[$ctMe.attr('name')]==="on");
            delete this.formSettings[$ctMe.attr('name')];

            $ctOth.val(this.formSettings[$ctOth.attr('name')]);
            delete this.formSettings[$ctOth.attr('name')];

            // handle copyManagerAlways
            if(this.activePromotionSetup.copyManagerAlways){
                $ctMan.prop('checked',true).attr('readonly','readonly');
            } else {
                $ctMan.removeAttr('readonly'); // might be checked
            }


        } else {
            this.detachSection($section);
            $ctMan.prop('checked',false);
            $ctMe.prop('checked',false);
            $ctOth.val('');

            $ctMan.prop('checked',false).removeAttr('readonly');
        }
    },

    initDeliverDateSection: function($section){
        var name,$inp,delDateStr;

        if(this.activePromotionSetup&&this.activePromotionSetup.deliverDateActive){

            delDateStr = this.activePromotionSetup.defaultDeliverDate||'';
            this.attachSection($section);

            $section.find('.datepickerTrigger').datepicker();

            $inp = $section.find('.datepickerInp');
            name = $inp.attr('name');
            // does struts dataForm have a date?
            if(this.formSettings[name]){
                $inp.val(this.formSettings[name]);
                delete this.formSettings[name];
            }
            // does the promotion JSON have a date?
            else {
                $inp.val(delDateStr);
            }

            $section.find('.datepickerTrigger').datepicker('update');

        } else {
            this.detachSection($section);
        }
    },

    initDeliverDatePurlSection: function($section){
        var name,$inp,delDateStr,$dpTrig;

        if(this.activePromotionSetup&&this.isPurl()){

            delDateStr = this.activePromotionSetup.defaultDeliverDate||'';
            this.attachSection($section);

            $dpTrig = $section.find('.datepickerTrigger');
            $dpTrig.datepicker();

            $inp = $section.find('.datepickerInp');
            name = $inp.attr('name');
            // does struts dataForm have a date?
            if(this.formSettings[name]){
                $inp.val(this.formSettings[name]);
                delete this.formSettings[name];
                // datepicker update looks at data-date first before inside INPUT
                $dpTrig.removeData('date').datepicker('update');
                //trigger date change (populates Contribs open/close)
                this.purlDateChanged();
            }
            // does the promo JSON have a date?
            else {
                $inp.val(delDateStr);
                // datepicker update looks at data-date first before inside INPUT
                $dpTrig.removeData('date').datepicker('update');
                this.purlDateChanged();
            }


        } else {
            this.detachSection($section);
        }
    },

    initAnniversaryCelebrateSection: function($section){
        var that = this,
            annivYears = this.activePromotionSetup.anniversaryYears;

        if(this.activePromotionSetup&&this.activePromotionSetup.anniversaryCelebrateActive){
            this.attachSection($section);

            var $yearInp = $section.find('#anniversaryYears'),
                $dayInp = $section.find('#anniversaryDays'),
                yearName = $yearInp.attr('name'),
                dayName = $dayInp.attr('name');

            if(annivYears) {
                // from data form?
                if(this.formSettings[yearName]) {
                    $yearInp.val(this.formSettings[yearName]);
                    delete this.formSettings[yearName];
                }
                //$section.find('.annivDateDays').hide();
                $section.find('.annivDateYears').show();

            } else {
                // from data form?
                if(this.formSettings[dayName]) {
                    $dayInp.val(this.formSettings[dayName]);
                    delete this.formSettings[dayName];
                }

                //$section.find('.annivDateYears').hide();
                $section.find('.annivDateDays').show();
            }
        } else {
            this.detachSection($section);
        }
    },

    initRecognitionPrivateSection: function($section){
        if(this.activePromotionSetup&&this.activePromotionSetup.recognitionPrivateActive){
            this.attachSection($section);

             var $privateInp = $section.find('#makeRecPrivate'),
                name = $privateInp.attr('name');

            // from data form?
            if(this.formSettings[name]) {
                $privateInp.prop('checked',this.formSettings[name]==="true");
                delete this.formSettings[name];
            }
        } else {
            this.detachSection($section);
        }
    },

    initContributorsSection: function($section){
        //only for PURL
        if(this.activePromotionSetup&&
            this.activePromotionSetup.contributorsActive&&this.isPurl()){

            // IMPORTANT - hide the normal buttons - this view has the form buttons
            //this.$el.find('.formSection.actionsSection').hide();

            this.attachSection($section);
            // get contrib view up and going

            if(!this.contributorsView){
                // initial state
                this.contributorsView = new ContributorsView({
                    el : $section.find('#contributorsView'),
                    parentView: this, //give a pointer to this view
                    contribFormNamePrefix: this.contribFormNamePrefix, // input name for contribs
                    contributorTeamsSearchFilters: this.getFormSettings().contributorTeamsSearchFilters,
                    // do not show the invitation sent column for Send a Recognition (its impossible for invitations to have been sent during creation)
                    showInvitedColumn: false
                });

                this.updateActionButtons();

                // when all steps complete, enable submit
                this.contributorsView.on('stepChanged', function() {
                    this.updateActionButtons();
                }, this);
            }

        } else {
            // IMPORTANT - show the normal buttons - this view has the form buttons
            // this.$el.find('.formSection.actionsSection').show();

            // enable submit
            this.$el.find('#recognitionButtonPreview').removeAttr('disabled');
            if(this.contributorsView) {
                this.contributorsView.resetStepsAndData();
            }
            this.detachSection($section);

            this.updateActionButtons();
        }
    },

    updateActionButtons: function() {
        var $sec = this.$el.find('.formSection.actionsSection'),
            $next = $sec.find('.nextBtn'),
            $back = $sec.find('.backBtn'),
            $preview = $sec.find('#recognitionButtonPreview'),
            $sendPurl = $sec.find('#recognitionButtonSendPurl'),
            wizTabs = this.contributorsView ? this.contributorsView.getWizardTabs() : null,
            activeTabName = wizTabs ? wizTabs.getActiveTab() : null;

        activeTabName = activeTabName ? activeTabName.get('name') : null;

        //$preview.find('.msg').hide();

        // PURL
        if(this.isPurl()) {
            $sendPurl.show();
            $preview.hide();
            switch(activeTabName) {
                case 'stepCoworkers':
                    $next.show();
                    $back.hide();
                    $sendPurl.hide();
                    break;
                case 'stepOthers':
                    $next.show();
                    $back.show();
                    $sendPurl.hide();
                    break;
                case 'stepPreview':
                    $next.hide();
                    $back.show();
                    $sendPurl.show();
                    break;
            }
        }
        // not PURL
        else {
            //$sec.find('.purlBtn').hide();
            $sendPurl.hide();
            $preview.show();
        }
    },

    initCustomSection: function($sec) {
        if(this.activePromotionSetup&&this.activePromotionSetup[$sec.attr('id')+'Active']) {
            this.attachSection($sec);
            // any generic plugins -- make sure to handle multiple shows of same element
            $sec.find('.datepickerTrigger').datepicker();
        } else {
            this.detachSection($sec);
        }
    },

    inheritErrorsFromDataForm: function() {
        var $err = this.$dataForm.find('.error'); // extract server error

        if($err.length) {
            this.$el.find('#serverErrorsContainer')
                .append($err).slideDown(G5.props.ANIMATION_DURATION);
        }
    },

    injectCustomFormElements: function(){
        var that = this;
        //assume the immediate children are all pass-through elements/inputs that need
        // to live in the sendForm
        this.$customFormEls.children().each(function(){
            var $this = $(this),
                elId = $this.attr('id'),
                $ph = that.$sendForm.find('[data-form-placeholder-id='+elId+']');

            $ph.replaceWith($this); //replace the placeholder with actual el

            //attach any plugins that these elements might use
            $this.placeholder();
        });
    },

    populateNodes: function(){
        var that = this,
            nodes = this.formSetup.nodes,
            $nWrap = this.$node.closest('.nodeWrapper'),
            name;

        this.$node.find('option').not('.defaultOption').remove();

        _.each(nodes, function(node){
            var opt = that.make('option',{value:node.id},node.name);
            that.$node.append(opt);
        });

        //MORE than one node
        if(nodes.length>1) {
            $nWrap.show();

            // is there a particular value to be set?
            // dataFrom and sendForm must have matching 'name' attributes (curr: promotionId)
            name = this.$node.attr('name');
            if(this.formSettings[name]){ // if this value from dataForm exists
                this.$node.val(this.formSettings[name]); // set the val
                delete this.formSettings[name]; // ensure this happens once only
            }

        } else { //ONLY ONE node
            if(nodes.length===1){
                $nWrap.hide();
                //if only one node, make sure its selected and triggered
                this.$node.val(nodes[0].id).trigger('change');
            }
        }
    },

    // show instruction if user presented with blank form (just promo/node)
    showInstructions: function(){
        if(!this.$promo.val() && this.$promo.is(':visible')) {
            this.addInstructionTip(this.$promo,this.$promo.data('msgInstructions'),
                this.$el.find('.promoWrapper'));
        }

        if(!this.$node.val() && this.$node.is(':visible')) {
            this.addInstructionTip(this.$node,this.$node.data('msgInstructions'),
                this.$el.find('.nodeWrapper'));
        }
    },


    // ===================
    // EVENT FUNCTIONS
    // ===================

    promoChanged: function(e){
        var pVal = this.$promo.val(),
            pName = this.$promo.find(':selected').text();

        // view level access to active form setup (promo object)
        this.activePromotionSetup = this.getFormSetupByPromoId(pVal);

        // this will setup and attach elements
        this.initPromoDependentSections();

        // do visual stuff - hide DD, show button
        if(pVal){
            this.$promo.closest('.promoWrapper').hide();
            this.$promo.closest('.promotionSection')
                .find('.promoChangeWrapper').fadeIn(G5.props.ANIMATION_DURATION)
                .find('.recognitionPromotionName').text(pName);
        }

        // do stuff dependent on node and promo
        this.nodeOrPromoChanged();
    },

    // PROMO visual state and change dialogs funcs
    changePromoButtonClick: function(e){
        var $tar = $(e.target);
        e.preventDefault();
        // show a qtip
        if(!$tar.data('qtip')){
            this.addConfirmTip($tar,
                this.$promo.closest('.promotionSection').find('.promoChangeConfirmDialog')
            );
        }
    },
    changePromoConfirmButtonClick: function(e){
        this.$promo.closest('.promotionSection').find('.promoChangeWrapper').hide();
        this.$promo.closest('.promoWrapper').fadeIn(G5.props.ANIMATION_DURATION);
        this.$promo.closest('.promotionSection')
            .find('#recognitionButtonChangePromo').qtip('hide');
        e.preventDefault();
    },
    changePromoCancelButtonClick: function(e){
        this.$promo.closest('.promotionSection')
            .find('#recognitionButtonChangePromo').qtip('hide');
        e.preventDefault();
    },
    showRulesModal: function(e){
        var $rulesModal = $('body').find('#rulesModal'),
            $cont = $rulesModal.find('.modal-body').empty();

        e?e.preventDefault():false;

        $cont.append(this.getPromoSetup().rulesText||'ERROR, modal found no rulesText on promo');

        $rulesModal.modal();
    },

    // RECIPIENT SEARCH show
    showRecipientSearch: function(e){
        var $arw = this.$el.find('.participantSearchSection .addRecipientsWrapper'),
            $b = $arw.find('#recognitionButtonShowRecipientSearch'),
            $rsv = this.recipientSearchView.$el;

        e?e.preventDefault():false; // if its from a DOM event (click)

        $arw.hide(); // hide the name and add button

        $rsv.slideDown(G5.props.ANIMATION_DURATION);

        $b.text($b.data('msgHide'));
        $b.removeClass('btn-primary').addClass('btn-success');
    },

    nodeChanged: function(e){
        var nVal = this.$node.val(),
            nName = this.$node.find(':selected').text();

        // do visual stuff - hide DD, show button
        if(nVal && this.$node.find('option').length>1){
            this.$node.closest('.nodeControls').hide();
            this.$node.closest('.nodeWrapper')
                .find('.nodeChangeWrapper').fadeIn()
                .find('.recognitionNodeName').text(nName);
        }

        // do node + promo dependent stuff
        this.nodeOrPromoChanged();
    },

    // NODE visual state and change dialogs funcs
    changeNodeButtonClick: function(e){
        var $tar = $(e.target);
        e.preventDefault();
        // show a qtip
        if(!$tar.data('qtip')){
            this.addConfirmTip($tar,
                this.$node.closest('.nodeWrapper').find('.nodeChangeConfirmDialog')
            );
        }
    },
    changeNodeConfirmButtonClick: function(e){
        this.$node.closest('.nodeWrapper').find('.nodeChangeWrapper').hide();
        this.$node.closest('.nodeControls').fadeIn();
        this.$node.closest('.nodeWrapper')
            .find('#recognitionButtonChangeNode').qtip('hide');

        e?e.preventDefault():false;
    },
    changeNodeCancelButtonClick: function(e){
        this.$node.closest('.nodeWrapper')
            .find('#recognitionButtonChangeNode').qtip('hide');
        e.preventDefault();
    },
    resetNode: function(){
        // hides the selected item EL, shows control
        this.changeNodeConfirmButtonClick();
        // set to 'choose one' selection, trigger change which hides form sections
        this.$node.val('').trigger('change');
    },

    nodeOrPromoChanged: function(){
        if(this.$promo.val() && this.$node.val()){
            // show form and ask server if node ok + budget data
            this.checkPromoAndNode();
        } else {
            // hide everything
            this.clearQTips();
            this.hidePromoDependentSections();
            this.hideNodeDependentSections();

            // TO-DO: show tips on promo or node select
        }
    },

    recognitionButtonCancelClick: function(e) {
        var $tar = $(e.currentTarget);
        e.preventDefault();
        if(!$tar.data('qtip')) {
            this.addConfirmTip($tar,
                this.$el.find('.formSection.actionsSection .recognitionSendCancelDialog')
            );
        }
    },

    checkPromoAndNode: function(){
        var pid = this.$promo.val(),
            nid = this.$node.val(),
            promo = this.activePromotionSetup,
            that = this;

        // return false means we are already checking
        if(!this.start_checkPromoAndNode()){ return; } //EXIT

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse
            url: G5.props.URL_JSON_SEND_RECOGNITION_CHECK_PROMO_NODE,
            data: {promotionId:pid,nodeId:nid},
            success:function(serverResp){
                var err = serverResp.getFirstError(),
                    $err = that.$el.find('.promotionSection').find('.generalPromoNodeError');

                if(!err){
                    // set active node data (budget info)
                    that.activeNodeSetup = serverResp.data.node;
                    // set preselected contribs (if any)
                    //that.preselectedContributors = serverResp.data.preselectedContributors;
                    //console.log(that.preselectedContributors,'SDFSDFSDFSDFSDF');

                    //set the budget calc data
                    if (serverResp.data.recognitionCalculator){
                        that.calcSetup = serverResp.data.recognitionCalculator;
                    }

                    // if there was an error, hide it
                    $err.slideUp(G5.props.ANIMATION_DURATION);

                    // make changes to parti. search
                    if(that.recipientSearchView){
                        that.recipientSearchView.model.ajaxParam('promotionId',promo.id);
                        that.recipientSearchView.model.ajaxParam('nodeId',that.activeNodeSetup.id);
                        that.recipientSearchView
                            .setParticipantSelectModeSingle(that.isSingleSelectMode());
                    }

                    if(that.recipientView){
                        that.recipientView.setMaxRecipients(promo.maxRecipients);
                    }

                    that.clearQTips();
                    that.initAndShowNodeDependentSections();
                    that.showPromoDependentSections();

                    // let our fans know what is up
                    that.trigger('promoNodeChange');
                } else {
                    // show error
                    $err.find('strong').text(err.name);
                    $err.find('span').text(err.text);
                    $err.slideDown(G5.props.ANIMATION_DURATION);

                    // reset node
                    that.resetNode();
                }
                // unlock this method
                that.end_checkPromoAndNode();
            }
        });
    },
    // call this at start of check
    start_checkPromoAndNode: function(){
        if(this._checkingPromoAndNode){
            return false; // signal that a check is in process
        }
        this._checkingPromoAndNode = true; // set lock flag
        this.$promo.attr('disabled','disabled');
        this.$node.attr('disabled','disabled');
        return true;
    },
    // call this at end of check
    end_checkPromoAndNode: function(){
        this.$promo.removeAttr('disabled');
        this.$node.removeAttr('disabled');
        this._checkingPromoAndNode = false; // release lock, flag false
    },

    purlDateChanged: function(e){
        var $sec = this.$el.find('.deliverDatePurlSection'),
            $pDate = $sec.find('.datepickerTrigger'),
            $pDateInp = $sec.find('.datepickerInp'),
            $opDate = $sec.find('#contributionsOpen'),
            $clDate = $sec.find('#contributionsClose'),
            d,y,yFmt,dFmt; //yesterday formatted and today formatted

        if($pDate && $pDateInp.val()){
            // make sure .datepicker attached
            if(!$pDate.data('datepicker')){$pDate.datepicker();}

            d = $pDate.data('datepicker').date,
            y = new Date(d.getTime()), // clone d from datepicker

            // set date minus one day
            y.setUTCDate(d.getUTCDate() - 1);


            //use exposed DPGlobal obj from datepicker plugin to format
            yFmt = $.fn.datepicker.DPGlobal.formatDate(y,$pDate.data('datepicker').format,
                        $pDate.data('datepicker').language);
            dFmt = $.fn.datepicker.DPGlobal.formatDate(d,$pDate.data('datepicker').format,
                        $pDate.data('datepicker').language);

            //set closed date DOM element
            $clDate.text(yFmt);
        }
    },

    // keyup validate method for copy others
    validateCopyOthers: function(e){
        var $tar = $(e.target);
        G5.util.formValidate($tar.closest('.validateme'), false, {noFocus:true});
    },

    // SUBMIT
    submitForm: function(e) {
        var that = this,
            data = this.$sendForm.serializeArray(),
            $tar = $(e.target).closest('button'),
            $badge = this.$el.find('#selectedBehavior');

        if ($badge.val() == "noBadge") {
            $badge.val('');
        }
        e.preventDefault();

        $tar.attr('disabled','disabled').spin();
        $tar.siblings('.btn').attr('disabled','disabled');

        if(this.validateForm()) {
            // destroy the search table so any junk input is removed
            this.$el.find('.participantSearchTableWrapper').remove();

            // send the form
            this.$sendForm.submit();
        } else {
            // remove wait state
            setTimeout(function(){
                $tar.removeAttr('disabled').spin(false);
                $tar.siblings('.btn').removeAttr('disabled');
            },1000);

        }

    },

    // VALIDATE - oh what a mess
    validateForm: function(e) {
        var $trig,
            $rsv = this.recipientSearchView.$el,
            $rvw = this.recipientView.$wrapper,
            $valTips;

        // clear validation qtip (they will be added again if errors exist)
        this.clearQTips();


        // generic validation check, not silent, no focus on first error (we do our own scrollTo on this page)
        if(!G5.util.formValidate(this.$sendForm.find('.validateme'), false, {noFocus:true})) {
            // invalid, was generic error, qtip visible (we use this below)
        }

        // recipient nonempty
        if(!this.recipientView.model.length && $rsv.is(':visible')) {
            $trig = $rsv.find('.participantSearchInput');
            this.addValidateTip($trig,$rsv.data('msgValidation'), $rsv);
        }

        // award ranges
        this.recipientView.validateRangeOfAll();

        // budget - hard cap error
        $trig = $rvw.find('.budgetMin');
        if( this.recipientView.model.length && $rvw.is(':visible')
            && this.getNodeSetup().budgetId
            && this.getNodeSetup().amount >= 0
            && !this.getNodeSetup().isSoftCap
            && this.recipientView.getBudgetRemaining()
            && this.recipientView.getBudgetRemaining() < 0) {

            // show budget overdrawn
            this.addValidateTip($trig,$rvw.data('msgValidationOverBudget'),$rvw);

        } else {
            $trig.qtip('hide');
        }

        $valTips = this.$sendForm.find('.validate-tooltip:visible');
        // if val tips, then we have errors
        if($valTips.length) {

            $.scrollTo($valTips.get(0),{
                duration:G5.props.ANIMATION_DURATION*2,
                offset: { top:-40, left:0 },
                onAfter: function(){
                    $($valTips.get(0)).data('qtip').elements.tooltip
                        .animate({left:'+=20'},300).animate({left:'-=20'},300)
                        .animate({left:'+=10'},200).animate({left:'-=10'},200);
                }
            });
            return false;
        }

        return true; // VALID - yay
    },

    cancelForm: function(e) {
        var $btn = this.$el.find(".actionsSection #recognitionButtonCancel");
        if($btn.data('url')) {
            e.preventDefault();
            window.location = $btn.data('url');
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

    // before the view consumes this JSON, do stuff to it
    prepareFormSetup: function(json) {
        // if a promotion has an array of strings, 'customSections'
        // create attributes off the promotion for each with key=<string>Active, val=true
        // these are used to render and show the sections
        // *this was done by request, as creating individual attrs on the promo object is difficult on the JAVA side
        //  but an array is easy
        _.each(json.promotions, function(p) {
            if(p.customSections) {
                _.each(p.customSections, function(cs) {
                    if(p[cs+'Active']) {
                        console.error('[ERROR] RecognitionPageSendView - promo setup JSON'+
                            ' <section>Active conflict: [promo.'+cs+'Active] already set');
                    } else {
                        p[cs+'Active'] = true;
                    }
                });
            }
        });

        return json;
    },



    // FORM PARSE: return a JSON object with recognition form data
    parseForm: function($f){
        var that = this,
            arry = $f.serializeArray(),
            json = {};

        //put the form inputs in an object (filter out array obj elements)
        _.each(arry, function(input){
            if( input.name.match(/\[(\d+)\]/) === null) {
                json[input.name] = input.value;
                // any values that need to be converted to JSON
                if(input.name === 'contributorTeamsSearchFilters') {
                    if( $.trim(json[input.name]) ) { // has data
                        json[input.name] = JSON.parse(json[input.name]);
                    } else { // no data, let's just pretend like there wasn't an input for this
                        delete json[input.name];
                    }
                }
            }
        });

        json.recipients = this.parseObjectsFromForm(arry, that.recipFormNamePrefix);
        json.contributors = this.parseObjectsFromForm(arry, that.contribFormNamePrefix);

        return json;
    },

    // FORM PARSE: return json array of recipients
    parseObjectsFromForm: function(formArray, prefix){
        var that = this,
            map = {}, //map pax id to props
            arry,
            count = -1; //recip count

        _.each(formArray, function(inp){
            var brkt,num,key;

            if(inp.name.indexOf(prefix)>-1){
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
                    if(key === 'nodes') {
                        // special case for the nodes -- they are a string to be converted to JSON
                        map['recip'+num][key] = JSON.parse(map['recip'+num][key]);
                    }
                }
            }
        });

        arry = _.toArray(map); //turn it into an array
        if(arry.length!==count){
            console.error('[ERROR] RecognitionPageSendView - dataForm ['+prefix+'] counts do not match '
                + arry.length + ' != '+ count);
        }

        console.log('[INFO] RecognitionPageSendView - DATA FORM - found ' + arry.length + ' pax of type ['+prefix+']');

        return  arry;
    },

    // get form setup by promo id
    getFormSetupByPromoId: function(pid){
        return _.find(this.formSetup.promotions, function(su){
            return su.id == pid;
        });
    },

    getPromoSetup: function(){
        return this.activePromotionSetup;
    },

    getNodeSetup: function(){
        return this.activeNodeSetup;
    },

	getCalcSetup: function() {
        return this.calcSetup;
    },

    getRecipientView: function() {
        return this.recipientView;
    },

    // getPreselectedContributors: function(){
    //     return this.preselectedContributors;
    // },

    getFormSettings: function(){
        return this.formSettings; // from the struts form at top
    },

    isPurl: function(){
        return this.activePromotionSetup && this.activePromotionSetup.promoType === 'purl';
    },

    // does the current node have a budget?
    hasBudget: function(){
        var node = this.getNodeSetup(),
            hasBudg = node.budgetId&&node.budgetId!==null;

        return hasBudg;
    },

    isSingleSelectMode: function(){
        return this.activePromotionSetup.maxRecipients === 1 || this.isPurl();
    },

    // coppies section is active based on composite values
    isCopiesSectionActive: function(){
        var isMan = this.activePromotionSetup&&this.activePromotionSetup.copyManagerActive,
            isMe = this.activePromotionSetup&&this.activePromotionSetup.copyMeActive,
            isOth = this.activePromotionSetup&&this.activePromotionSetup.copyOthersActive,
            copAct = isMan || isMe || isOth; // if any of these, then copy section active

        return copAct;
    },

    //add confirm tooltip
    addConfirmTip: function($trig, cont){
        //attach qtip and show
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'left center',
                at: 'right center',
                container: this.$el,
                viewport: $('body'),
                adjust: {method:'shift none'}
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


    //add instruction tooltip
    addInstructionTip: function($trig, cont, $container){
        //attach qtip and show
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'left center',
                at: 'right center',
                container: $container||this.$el,
                viewport: $('body'),
                adjust: {method:'shift none'}
            },
            show:{
                event:false,
                ready:true,
                effect:false
            },
            hide:{
                event:'click',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light ui-tooltip-instruction',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            events: { // for narrow screens the tooltip will be disp. below (doesn't update on resize)
                visible: function(event,api){
                    var overlap = false,
                        $tar = api.elements.target,
                        $tip = api.elements.tooltip;

                    overlap = $tar.offset().left+$tar.width() - 10 > $tip.offset().left;
                    if(overlap){
                        api.set({
                            'position.at':'bottom center',
                            'position.my':'top center'
                        });
                    }
                }
            }
        });
    },


    // add validate qtip
    addValidateTip: function($trig, content, $cont){
        $trig.qtip({
            content: {
               text: content
            },
            position:{
                my: 'left center',
                at: 'right center',
                container: $cont||this.$sendForm
            },
            show : {
                ready : true,
                delay:false
            },
            hide : {
                event : 'focus blur',
                delay: 500
            },
            //only show the qtip once
            events:{
                show : function(evt,api) {},
                hide : function(evt,api) {
                    api.destroy();
                },
                render : function(evt,api) {}
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-red validate-tooltip',
                tip: {
                    width: 10,
                    height: 5
                }
            }
        });
    },

    clearQTips: function(){
        // clear all validation tooltips
        this.$sendForm.find('.validate-tooltip').qtip('hide');
    }


});
