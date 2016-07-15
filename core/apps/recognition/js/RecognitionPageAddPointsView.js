/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
PageView,
TemplateManager,
AwardeeCollectionView,
RecognitionPageAddPointsView:true
*/

/*
    This is essentially a small subset of RecognitionPageSendView 
    + some HTML from public recognition detail
*/
RecognitionPageAddPointsView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var that = this;

        // struts prefix for the recipient
        this.recipFormNamePrefix = 'claimRecipientFormBeans';

        //set the appname
        this.appName = 'recognition';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.$sendForm = this.$el.find('#sendForm');

        this.$el.find('.recognitionInformation .profile-popover').participantPopover();

        // initialize awardee view
        this.awardeeView = new AwardeeCollectionView({
            el : this.$el.find('#recipientsView'),
            tplName :'participantRowAwardItem', //override the default template
            model : new Backbone.Collection(this.getPromoSetup().recipients),
            parentView: this, //give a pointer to this view
            isHideRemove: true // hide remove functionality
        });

        // render nodes
        this.renderNodes();

        // attach plugin

        this.$el.find('#comments').htmlarea(G5.props.richTextEditor);

    },


    renderNodes: function() {
        var that = this,
            $nodesWrapper = this.$el.find('.nodesWrapper');
        TemplateManager.get('nodes', function(tpl){
            var $sel;

            // render out nodes
            $nodesWrapper.empty().append(tpl(that.getPromoSetup()));

            // set active node in select element
            $sel = $nodesWrapper.find('#orgUnitSelect');
            $sel.val(that.getNodeSetup().id);
        });
    },


    // AwardeeCollectionView interface functions
    getPromoSetup: function() {
        if(!this.promoSetup) { 
            this.promoSetup = this.parseForm(this.$el.find('#dataForm')); 
            if(this.promoSetup.awardMin) {this.promoSetup.awardMin=parseInt(this.promoSetup.awardMin,10);}
            if(this.promoSetup.awardMax) {this.promoSetup.awardMax=parseInt(this.promoSetup.awardMax,10);}
            if(this.promoSetup.awardFixed) {this.promoSetup.awardFixed=parseInt(this.promoSetup.awardFixed,10);}
        }
        return this.promoSetup;
    },
    getNodeSetup: function() {
        var ns = this.getPromoSetup().nodes,
            nId = parseInt(this.getPromoSetup().nodeId,10),
            actNode;

        if(nId) { // there is a nodeId set
            actNode = _.where(ns,{id:nId});
            actNode = actNode.length===1 ? actNode[0] : null;
        } else { // no node id set, set nodeId to first
            actNode = ns[0];
            this.promoSetup.nodeId = actNode.id;
        }

        return actNode;
    },
    hasBudget: function() {
        var node = this.getNodeSetup(),
            hasBudg = node.budgetId&&node.budgetId!==null;

        return hasBudg;
    }, 
    getCalcSetup: function() {return null;},




    // FORM PARSE: return a JSON object with recognition form data
    parseForm: function($f){
        var that = this,
            arry = $f.serializeArray(),
            json = {};

        //put the form inputs in an object (filter out array obj elements)
        _.each(arry, function(input){
            if( input.name.match(/\[(\d+)\]/) === null) {
                json[input.name] = input.value;
                if(input.name==='nodes') {
                    json[input.name] = JSON.parse(input.value);
                }
            } 
        });

        json.recipients = this.parseObjectsFromForm(arry, that.recipFormNamePrefix);

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
            console.error('[ERROR] RecognitionPageAddPointsView - dataForm ['+prefix+'] counts do not match '
                + arry.length + ' != '+ count);
        }

        console.log('[INFO] RecognitionPageAddPointsView - DATA FORM - found ' + arry.length + ' pax of type ['+prefix+']');

        return  arry;
    },

    events: {
        //action buttons
        "click #recognitionButtonSubmit":"submitForm",
        "click #recognitionButtonCancel":"recognitionButtonCancelClick",
        "click #recognitionSendCancelDialogConfirm":"cancelForm",
        "click #recognitionSendCancelDialogCancel":function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        },

        "keyup .commentInputTxt ":"enforceMaxLength",
        "blur .commentInputTxt ":"enforceMaxLength",
        "mouseup .commentInputTxt ":"enforceMaxLength",

        "change #orgUnitSelect":"doOrgUnitChange"
    },

    doOrgUnitChange: function() {
        var $nidSel = this.$el.find('#orgUnitSelect');
        this.getPromoSetup().nodeId = $nidSel.val();
        
        // AwardeeCollectionView listens for this, it will update its budget when
        // this occurs
        this.trigger('promoNodeChange',this.getPromoSetup(),this.getNodeSetup());
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

    

    // SUBMIT 
    submitForm: function(e) {
        var that = this,
            data = this.$el.find('#sendForm').serializeArray(),
            $tar = $(e.target);

        e.preventDefault();

        $tar.attr('disabled','disabled').spin();

        if(this.validateForm()) {
            // destroy the search table so any junk input is removed
            this.$el.find('.participantSearchTableWrapper').remove();

            // send the form
            this.$sendForm.submit();
        } else {
            // remove wait state
            setTimeout(function(){
                $tar.removeAttr('disabled').spin(false);
            },1000);
            
        }
        
    },

    // VALIDATE - oh what a mess
    validateForm: function(e) {
        var $trig,
            $avw = this.awardeeView.$wrapper,
            $valTips;

        // clear validation qtip (they will be added again if errors exist)
        this.clearQTips();

        // award ranges
        this.awardeeView.validateRangeOfAll();

        // budget - hard cap error
        $trig = $avw.find('.budgetMin');
        if( this.awardeeView.model.length && $avw.is(':visible') 
            && this.getNodeSetup().budgetId 
            && this.getNodeSetup().amount 
            && !this.getNodeSetup().isSoftCap
            && this.awardeeView.getBudgetRemaining()
            && this.awardeeView.getBudgetRemaining() < 0) {

            // show budget overdrawn
            this.addValidateTip($trig,$avw.data('msgValidationOverBudget'),$avw);

        } else {
            $trig.qtip('hide');
        }

        // generic validation check, not silent, no focus on first error (we do our own scrollTo on this page)
        if(!G5.util.formValidate(this.$sendForm.find('.validateme'), false, {noFocus:true})) {
            // invalid, was generic error, qtip visible (we use this below)
        }

        $valTips = this.$sendForm.find('.validate-tooltip:visible');
        // if val tips, then we have errors
        if($valTips.length) {
            
            $.scrollTo($valTips.get(0),{
                duration:G5.props.ANIMATION_DURATION*2,
                onAfter: function(){
                    $($valTips.get(0)).data('qtip').elements.tooltip
                        .animate({left:'+=20'},300).animate({left:'-=20'},300)
                        .animate({left:'+=10'},200).animate({left:'-=10'},200);
                },
                offset:{top:-20}
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


    // ===================
    // UTILITY FUNCTIONS
    // ===================

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
    },

    enforceMaxLength: function(e) {
        var $tar = $(e.target),
            ml = $tar.attr('maxlength');
        // only for IE and textareas with maxlength attrs
        if(!$.browser.msie||!ml) {return;} 

        ml = parseInt(ml,10);
        if($tar.val().length > ml) {
            $tar.val( $tar.val().slice(0,ml) );
        }
    }

});