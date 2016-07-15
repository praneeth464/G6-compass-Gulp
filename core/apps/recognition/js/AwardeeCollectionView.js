/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
TemplateManager,
ParticipantCollectionView,
PlateauAwardsPageView,
AwardeeCollectionView:true
*/

/** AWARDEE PARTICIPANTS VIEW - extends ParticipantCollectionView **/
AwardeeCollectionView = ParticipantCollectionView.extend({
    initialize:function(opts){
        var that = this;

        this.parentView = opts.parentView;
        this.maxRecipients = opts.max||0;
        this.isHideRemove = opts.isHideRemove||false;

        this.calcObj = null;
        this.savedCalcObj = null;
        this.savedCalcRows = [];
        this.calcData;
        this.didCalc = false;

        this.parentView.on('promoNodeChange',function(p,n){
            this.handlePromoNodeChange(p,n);
        },this);

        // stolen from the constructor (needs to be done before handlPromoNodeChange())
        this.$wrapper = this.$el.closest('.participantCollectionViewWrapper');
        this.$wrapper.on('click','.sameForAllTip a',function(e){that.doSameForAllClick(e);});

        // set the count param name
        this.$wrapper.find('.participantCount').attr('name',
            this.parentView.recipFormNamePrefix+'Count');

        this.handlePromoNodeChange();

        //inherit events from the superclass
        this.events = _.extend({},this.constructor.__super__.events,this.events);

        //this is how we call the super-class, this will render
        this.constructor.__super__.initialize.apply(this, arguments);

        this.model.on('change',function(m,e){
            if(e.changes.awardQuantity||e.changes.awardLevelId) {
                this.updateBudget(m);
            }
        },this);

        this.on('shown',function(){
            // this is for galaxy s3 native browser, just get it to trigger a layout update so the
            // remove button is positioned properly (this happens after slide down)
            // DETECT: at least limit this to the offending Android version
            if(navigator&&navigator.userAgent&&navigator.userAgent.indexOf('Android 4.1.1')){
                that.$wrapper.find('tbody .remParticipantControl').css('position','relative');
            }
        });

    },

    events: {
        // budget
        "keyup .awardPointsInp":"doPointsKeyup",
        "keydown .awardPointsInp":"doPointsKeydown",
        "focus .awardPointsInp":"doPointsFocus",
        "blur .awardPointsInp":"hideSameForAllTip",
        "change .awardLevelSel":"doLevelSel",
        "focus .awardLevelSel":"showSameForAllTip",
        "blur .awardLevelSel":"hideSameForAllTip",

        // select recipient node
        "click .showRecipNodes":"showRecipNodesTip",
        "click .changeRecipNodeTip a":"selectRecipNode",

        // merch modal
        "click .viewAwardLevels":"doViewAwardLevels",

        //recognition calculator popover
        "click .calcLink":"doViewRecognitionCalculator"
    },

    showRecipNodesTip: function(e) {
        var $el = $(e.currentTarget),
            onShow;
        e.preventDefault();

        //have it already?
        if($el.data('qtip')) { return; }

        //onShow func -- style selected
        onShow = function(evt,api) {
            var $ns = api.elements.content.find('a');
            // clear selected style
            $ns.removeClass('selected').find('i').remove();

            $ns.prepend('<i class="icon icon-check-empty"></i>');
            // match based on text (yes, gross, ikno)
            $ns = $ns.filter(function(){
                return $(this).text() == $el.find('.limitedWidth').text();
            }).addClass('selected');
            $ns.find('i').remove();
            $ns.prepend('<i class="icon icon-check"></i>');
        };

        $el.qtip({
            content: $el.closest('.participant').find('.changeRecipNodeTip'),
            position:{my:'bottom center',at:'top center',container: $el.closest('.participant')},
            show:{ready:true, event:'click', effect:false},
            hide:{event:'unfocus', effect:false},
            style:{classes:'ui-tooltip-shadow ui-tooltip-light',tip:{width:10,height:5}},
            events:{show:onShow}
        });

        // IE8 - two lines below are for initial position bug in IE8
        $el.qtip('show');
        $el.qtip('reposition');
        // EOF IE8

    },

    selectRecipNode: function(e) {
        var $tar = $(e.target);
        e.preventDefault();

        if($tar.hasClass('icon')){
            $tar = $tar.closest('a');
        }

        // because of the checkboxes and IE7
        $tar.find('i').remove();

        // change the hidden input value for this recip to selected node id val/text
        this.$el.find('#'+$tar.data('inputId')).val($tar.data('nodeId'));
        this.$el.find('#'+$tar.data('dispId')+' .limitedWidth').text($tar.text());

        // hide the qtip containing the clicked element
        $tar.closest('.qtip').qtip('hide');

        this.trigger("recipientNodeIdChange",{
            recipientId: $tar.data('recipientId'),
            nodeId: $tar.data('nodeId')
        });

    },


    // promo(setup) and node(setup) come from the parent view
    handlePromoNodeChange: function(){
        var promo = this.parentView.getPromoSetup(),
            node = this.parentView.getNodeSetup(),
            calc = this.parentView.getCalcSetup(),
            at = promo.awardType,
            atCap = at.charAt(0).toUpperCase()+at.slice(1),
            $awdTh = this.$wrapper.find('th.award'),
            $dedTh = this.$wrapper.find('th.calcDeduction'),
            $rmTh = this.$wrapper.find('th.remove');

        // start these out visible
        $awdTh.show();
        $dedTh.show();

        // set the text via data attrs
        $awdTh.text($awdTh.data('msg'+atCap));

        // if no budget, then hide deduction column
        if(!this.parentView.hasBudget()) {
            $dedTh.hide();
        }

        // change some elements for various AwardType states
        if(at === 'none') {
            // hide middle columns
            $awdTh.hide();
            $dedTh.hide();
        } else if (at === 'pointsRange') {
            // add the range to the TH
            $awdTh.text($awdTh.text()+ ' ('+promo.awardMin+'-'+promo.awardMax+')');
        } else if (at === 'pointsFixed') {
            // display 'award' TH
        } else if (at === 'levels') {
            // hide the deduction TH
            $dedTh.hide();
        } else if (at === 'calculated') {
            // if calc not provided by server, then don't show this column
            if(!calc) {
                $awdTh.hide();
            }

            // display calc stuff
            this.calcObj = calc;

            // if (calc.attributes.showPayTable){
            //     var that = this;
            //     $("#recogCalcPayoutTableLink").show().click(function(event){
            //         event.preventDefault ? event.preventDefault() : event.returnValue = false;
            //         that.showRecogCalcPayout(this);
            //     });
            // }
        }

        // hide the remove function?
        if(this.isHideRemove) {
            $rmTh.hide();
        }

        // we only want to update the budgets if the AwardeeCollectionView is visible on the page. Qtip gets a little confused otherwise
        if( this.$el.is(':visible') ) {
            this.updateBudget();
        }
        this.renderEmpty();
    },

    // override parent method -- adding some massage of json
    addParticipant:function(participant, index){
        var that = this;

        // first check to see if participant is a model or a collection
        // if the latter, run this same addParticipant method on each of its models
        if( participant.models ) {
            _.each(participant.models, function(model, index) {
                that.addParticipant(model);
            });
            return;
        }

        var json = participant.toJSON(),
            promo = this.parentView.getPromoSetup(),
            awardType = promo.awardType,
            node = this.parentView.getNodeSetup();

        // limit max num
        if(this.maxRecipients>0 && this.model.length>this.maxRecipients){
            // undo add
            this.model.remove(participant);
            this.$wrapper.find('.recipCount').shake();
            this.updateRecipCount();
            this.trigger('maxRecipientsExceeded',this.maxRecipients);
            return;
        }


        json.cid = participant.cid;

        //adding variables for handlebars tpl
        json._isAwardNone = awardType === 'none';
        json._isAwardRange = awardType === 'pointsRange';
        json._isAwardFixed = awardType === 'pointsFixed';
        json._isAwardLevels = awardType === 'levels';
        json._isAwardCalc = awardType === 'calculated' && this.parentView.getCalcSetup();
        json._isAwardCalcLevels = promo.isAwardCalcLevels||false;
        json._awardMin = promo.awardMin||false;
        json._awardMax = promo.awardMax||false;
        json._awardFixed = promo.awardFixed||false;
        json._awardLevels = promo.awardLevels?promo.awardLevels[json.countryCode]:false;
        json._isShowRemCol = this.isHideRemove ? false : true;
        // match data coming in @ top of form
        json._paxName = this.parentView.recipFormNamePrefix;
        json._isShowCalcCol =
            !(json._isAwardNone||json._isAwardLevels) // not none or level awtype
            && this.parentView.hasBudget(); // and has a budget
        json._hasBudget = this.parentView.hasBudget(); // has budget?

        // if fixed award points but no awardQuantity, then set it
        if(json._isAwardFixed&&promo.awardFixed){
            // this is silent because there are updates always after attachment
            // (see Tpl Manager get callback() )
            participant.set({awardQuantity:promo.awardFixed}, {silent:true});
        }

        // pull out selected node for template
        if(json.nodes && json.nodes.length && json.nodeId) {
            json._selNode = _.where(json.nodes, {id: parseInt(json.nodeId, 10)})[0];
        }
        // first node is defaultNode
        else if(json.nodes && json.nodes.length) {
            json._selNode = json.nodes[0];
        }

        // pass on a stringified nodes to tpl (passing on for STRUTS)
        if(json.nodes) {
            json._nodesJsonString = JSON.stringify(json.nodes);
        }


        json.autoIndex = this.autoIncrement;
        this.autoIncrement++;

        TemplateManager.get(this.tplName,function(tpl){
            var $pi = $(tpl(json));
            that.$el.prepend($pi);
            G5.util.animBg($pi.find('td'),'background-flash');

            //set level if level
            if(awardType === 'levels'){
                /*  NOTE on hackey line:
                    AwardLevel is submitted as awardLevel, but dataForm is expecting
                    awardLevelId for edits. So when we see an awardLevel on the recip
                    we copy it into awardLevelId. Calculator deals with this mismatch
                    by submitting both awardLevel AND awardLevelId with the same val.*/
                if(json.awardLevel && !json.awardLevelId) json.awardLevelId = json.awardLevel;
                /* end hackeyness */

                $pi.find('.award select').val(json.awardLevelId).trigger('change');

                // ie9 does not pick the first if there is no match on the json above
                if(!$pi.find('.award select').val()) {
                    $pi.find('.award select').val($pi.find('.award select option:first').val());
                }
            }

            //attach parti. popover.
            $pi.find('.participant-popover').participantPopover();

            that.renderEmpty();
            that.updateCount();
            that.updateBudget();
            that.errorTipsReposition();
            that.updateRecipCount();

            // when a user clicks edit from the preview page, we need to transfer
            // calculator values to each parti, this is a stopgap hack to the
            // already quite hacky implementation of calculator
            that.renderCalcInputsForPaxHack(json,$pi);

            if ((index + 1) >= that.model.length){
                that.checkForSavedCalc();
            }

        }, G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/');

        return this;

    },
    // override parent method -- adding some logic
    removeParticipant:function(participant){
        var that = this;
        this.$el.find('[data-participant-cid='+participant.cid+']').remove();
        that.renderEmpty();
        this.updateCount();
        this.updateBudget(); // this will register the budge. change (loss of a recip.)
        this.errorTipsReposition();
        this.updateRecipCount();
        return this;
    },

    // update everything related to budget (deductions etc.)
    updateBudget: function(){
        var that = this,
            totalDedPrecise = 0, // precise deduction from non-rounded points
            totalDed = 0, // duduction from rounded points per recip
            awType = this.parentView.getPromoSetup().awardType,
            node = this.parentView.getNodeSetup(),
            budgetAmount = node.amount,
            budgetUsed = node.amountUsed,
            isSoftCap = node.isSoftCap,
            $budg = this.$wrapper.find('.budgetDeduction'),
            $bar = $budg.find('.progress .bar'),
            budgetToolTipClasses = 'ui-tooltip-shadow ui-tooltip-darkx remBudgTip',
            calcBudgRem,
            isShowBudg = this.parentView.hasBudget()&&awType!='none', // showing the budget info?
            isTotalRoundingDiscrepancy = false;

        //use the DOM to loop
        this.$el.find('.participant-item[data-participant-cid]').each(function(){
            var $pax = $(this),
                pax = that.model.getByCid($pax.data('participantCid')),
                awd = awType==='levels' ?
                    that.getValueOfLevelFor(pax) : pax.get('awardQuantity')||0,
                // LEVELS -- use 1 as country ratio - as per discussion with Prabu
                cRatio = awType==='levels' ? 1 : pax.get('countryRatio'),
                dedPrecise = awd*cRatio,
                ded = Math.round(dedPrecise);

            totalDedPrecise+=dedPrecise; // raw, unrounded points
            totalDed+=ded; // rounded points

            $pax.find('.calcDeduction').text(ded);
            $pax.find('.calcDeduction').data('deductionPrecise', dedPrecise); // keep track of what this was
        });

        this.budgetRemaining = calcBudgRem = Math.round(budgetAmount - totalDedPrecise);
        //console.log('calcRem: '+calcBudgRem, 'budgeAmount: '+budgetAmount, 'budgetUsed: '+budgetUsed, 'totalDed: '+totalDed);

        // handle a line-item VS total discrepancy
        isTotalRoundingDiscrepancy = Math.round(totalDedPrecise) !== totalDed
            || budgetAmount-Math.round(totalDedPrecise) !== Math.round(budgetAmount-totalDedPrecise);
        $budg.find('.discrepancyWarning')[isTotalRoundingDiscrepancy?'show':'hide']();

        // update budget visuals
        $budg[isShowBudg?'show':'hide']();
        if(isShowBudg){
            $budg.find('.budgetMax').text(budgetAmount+budgetUsed);
            $bar.css('width', (calcBudgRem<0 ? 0 : Math.floor(((calcBudgRem)/(budgetAmount+budgetUsed))*100) )+'%');

            // attach qtip budget
            if(!$bar.data('qtip')){ // lazy build the budg qtip
                $bar.qtip({
                    content: calcBudgRem,
                    position:{
                        my:'bottom center',
                        at:'right top',
                        container: this.$wrapper,
                        viewport: this.$wrapper
                    },
                    show:{ready:true,delay:false},
                    hide:false,
                    style:{
                        classes:budgetToolTipClasses + ' ui-tooltip-green',
                        tip: {
                            width: 10,
                            height: 5
                        }
                    }
                });
                // in certain cases the qtip will be initialized, but he $bar position is changing (the section is sliding down)
                // so we need to catch that case b/c the tip will not be positioned correctly (this is gross, yes)
                setTimeout(function(){$bar.qtip('reposition');},100);
            // adjust qtip budget
            } else { // budg qtip is already created, just update it
                $bar.qtip('show');
                $bar.qtip('reposition');
                if($bar.qtip().elements.content) {

                    $bar.qtip().elements.content.animateNumber(calcBudgRem,400,{},
                        function(){
                            // if visible, reposition
                            if($bar.is(':visible')) {
                                // warning class if over budget
                                $bar.qtip('option', 'style.classes', budgetToolTipClasses + ' ui-tooltip-' + (calcBudgRem<0 ? 'red' : 'green'));
                                $bar.qtip('redraw');
                                $bar.qtip('reposition');
                            }
                        }
                    );
                }
            }

            // mini validation for the over budget tooltip
            if( calcBudgRem<0 && !isSoftCap ) {
                this.parentView.addValidateTip( this.$wrapper.find('.budgetMin'), this.$wrapper.data('msgValidationOverBudget'), this.$wrapper );
            }
            else {
                this.$wrapper.find('.budgetMin').qtip('destroy');
            }
        }// isShowBudg IF
        else {
            // qtip container is not in $budg, so we need to hide it this way
            if($bar.data('qtip')) {
                $bar.qtip('hide');
            }
        }// isShowBudg ELSE
    },

    getBudgetRemaining: function() {
        return this.budgetRemaining||false;
    },

    doPointsKeyup: function(e){
        var $tar = $(e.target);
        this.setAwardPointsFor($tar, true);

        // nominations - all inputs sync
        if(this.maxRecipients>0){
            this.setAllAwardRanges($tar.val());
        }
    },
    doPointsKeydown: function(e){
        var $tar = $(e.target),
            $nxtInp = $tar.closest('.participant-item')
                .next('.participant-item').find('.awardPointsInp');

        // filter non-numerics
        this.filterNonNumericKeydown(e);

        // if enter||tab press, focus on next input
        if(e.which===13||e.which===9){
            e.preventDefault(); // stop it
            $nxtInp.length?$nxtInp.focus().select():false; // move to next inp
        }



    },
    doPointsFocus: function(e){
        var $tar = $(e.currentTarget);
		//Emulate select all text on tablet
        if($tar.val()==='0'||$tar.val()===0) {
            setTimeout(function(){
                if ($tar[0].setSelectionRange){
                    $tar[0].setSelectionRange(0,4000);
                }
                else{
                    $tar.select();
                }
            },0);
        }

        this.showSameForAllTip(e);
    },

    // helper, filter non-numeric keydown
    filterNonNumericKeydown: function(event){
        // http://stackoverflow.com/questions/995183/how-to-allow-only-numeric-0-9-in-html-inputbox-using-jquery
        // Allow: backspace, delete, tab, escape, and enter
        if ( event.keyCode == 46 || event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 27 || event.keyCode == 13 ||
             // Allow: Ctrl+A
            (event.keyCode == 65 && event.ctrlKey === true) ||
             // Allow: home, end, left, right
            (event.keyCode >= 35 && event.keyCode <= 39)) {
                 // let it happen, don't do anything
                 return ;
        }
        else {
            // Ensure that it is a number and stop the keypress
            if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
                event.preventDefault();
            }
        }

    },
    // sync model to input element and validate
    setAwardPointsFor: function($el, emptyOk, isSilent){
        var pax = this.getParticipantByDomEl($el);

        // validate range
        this.validateRangeOf($el, emptyOk);
        // set value on model
        pax.set('awardQuantity',$el.val(), {silent: isSilent?true:false});

    },
    validateRangeOf: function($el, emptyOk){
        if(!this.parentView.getPromoSetup()) {return;}
        var castNum = function(x){ // convert strings to nums
                return typeof x === 'string' ? parseInt(x,10) : x;
            },
            val = castNum($el.val()||0), // if '' then put a zero in there
            errTxt = $el.data('msgErrOutOfRange')||'value out of range',
            rMin = castNum(this.parentView.getPromoSetup().awardMin),
            rMax = castNum(this.parentView.getPromoSetup().awardMax);

        // EMPTY
        if(emptyOk && $el.val()===''){
            this.errorTip($el,'',true); // destroy any error tips
            return true;
        }

        // OUT of RANGE ERROR
        if(val < rMin || val > rMax){
            // disp error
            this.errorTip($el,errTxt);
            return false;
        }

        // NO ERROR
        this.errorTip($el,'',true); // destroy any error tips
        return true;
    },
    validateRangeOfAll: function(){
        var that = this;
        this.$el.find('.awardPointsInp').each(function(){that.validateRangeOf($(this));});
    },

    doLevelSel: function(e, isSilent){
        var $tar = $(e.target),
            pax = this.getParticipantByDomEl($tar);

        pax.set('awardLevelId',$tar.val(), {silent: isSilent?true:false});

        // nominations - all inputs sync
        if(this.maxRecipients>0){
            this.setAllLevels($tar.val());
        }
    },

    doSameForAllClick: function(e){
        var that = this,
            $tar = $(e.target),
            // find the active input: the link is in a tooltip with a qtip
            // which has a reference to the triggering element (target)
            $actInp = $tar.closest('.ui-tooltip').data('qtip').elements.target;

        e.preventDefault();

        that.setAllAwardRanges($actInp.val());
        that.setAllLevels($actInp.val());

    },

    setAllAwardRanges: function(val){
        var that = this;
        this.$el.find('input.awardPointsInp').each(function(){
            var $this = $(this);
            if($this.val() !== val) {
                $this.val(val);
                // alters the value in the model and triggers budg. update
                that.setAwardPointsFor($this,false,true);
            }
        });
        this.updateBudget();
        // this.trigger('sameForAllFinished');
    },
    setAllLevels: function(val){
        var that = this;
        this.$el.find('select.awardLevelSel').each(function(){
            var $this = $(this);
            // not current value
            if($this.val() !== val) {
                // contains an option for new value
                if($this.find('option[value='+val+']').length>0){
                    $this.val(val);
                    // alters the value in the model and triggers budg. update
                    that.doLevelSel({target:$this},true);
                }
            }
        });
        this.updateBudget();
        // this.trigger('sameForAllFinished');
    },

    // same for all tooltip
    showSameForAllTip: function(e){
        var $el = $(e.target);

        // NO TIP: single recips OR nominations (maxRecipients set > 0)
        if(this.model.length == 1 || this.maxRecipients>0){ return; }

        //error tip active? then do nothing (just let the error have the stage)
        if($el.data('qtip_error')&&
            $el.data('qtip_error').elements.tooltip.is(':visible')){
            return;
        }

        //have it already?
        if($el.data('qtip_sfa')) {
            $el.data('qtip_sfa').show();
            return;
        }

        $el.qtip({
            content: this.$wrapper.find('#sameForAllTipTpl').clone().removeAttr('id'),
            position:{my:'left center',at:'right center',container: this.$wrapper},
            show:{ready:true,event:false},
            hide:false,
            //only show the qtip once
            events:{hide:function(evt,api){$el.qtip('destroy');}},
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    width: 10,
                    height: 5
                }
            }
        });

        $el.data('qtip_sfa',$el.data('qtip')).removeData('qtip');

    },
    hideSameForAllTip: function(e){
        var $el = $(e.target);
        // allow some time for a click to occur on the link
        setTimeout(function(){
            if($el.data('qtip_sfa')) { $el.data('qtip_sfa').hide();}
        },100);
    },

    updateRecipCount: function(){
        var $rc = this.$wrapper.find('.recipCount'),
            $num = $rc.find('.num'),
            $den = $rc.find('.den');

        if(this.maxRecipients>0){
            $num.text(this.model.length);
            $den.text(this.maxRecipients);
            $rc.show();
        } else {
            $rc.hide();
        }
    },

    doViewAwardLevels: function(e){
        var $tar = $(e.target),
            that = this;

        // obj level ref to last clicked level idthat._lastLevId
        this._lastLevId = $tar.closest('td').find('select').val();

        e.preventDefault();

        // modal stuff
        if(!this.$merchModal) {
            this.$merchModal = this.$wrapper.find('#levelMerchModal').detach();
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

        this.$merchModal.modal('show');

    },

    // init and manage PlateauAwardsPageView
    updateMerchModal: function(levelId){
        var that = this;
        if(!this.$merchModal) { return; } // exit if no dom element
        TemplateManager.get('plateauAwardsPage',function(html){
            // clean out script from html -- regular page has some
            // we will insantiate manually
            html = html.replace(/<script>[\s\S]*<\/script>/ig,'');
            that.$merchModal.find('.modal-body').empty().append(html);
            // insantiate page view - hand it the promoId/levelId
            new PlateauAwardsPageView({
                el:that.$merchModal.find('#plateauAwardsPageView'),
                showPromotionSelect: false,
                promotionId: that.parentView.getPromoSetup().id,
                levelId: levelId||'none'
            });
        }, G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'plateauAwards/tpl/', true);
    },

    doViewRecognitionCalculator: function(event) {
        var that = this,
            tplName = 'calculatorTemplate',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'recognition/tpl/',
            theWeightLabel,
            theScoreLabel,
            thisQtip,
            $anchor = $(event.target);


        var getCriteriaElements = function() {
            var theCriteriaElement = "",
                i = 0,
                j = 0;

            for (i = 0; i < that.calcObj.criteria.length; i++ ) {
                var thisCriteriaRow = that.calcObj.criteria[i];
                var thisRowLabel = thisCriteriaRow.label;
                var thisRowId = thisCriteriaRow.id;
                var theCriteriaWrapper = "<div class='recCalcCriteriaWrapper' data-criteria-id='" + thisRowId + "'>";
                var thisRatingSelectInner = [];
                // filling the text of first option later from a TPL element (should do the whole select element in handlebars, but this is calc and its not worth the effort ATM)
                var thisRatingSelectOutter = "<select class='recogCalcRatingSelect'><option value='undefined' class='msgSelRatingTarget'>[dynamic js]</option>";

                for (j = 0; j < thisCriteriaRow.ratings.length; j++) {
                    var thisRatingOption = thisCriteriaRow.ratings[j];

                    thisRatingSelectInner.push("<option value='" + thisRatingOption.value + "' data-ratingId='" + thisRatingOption.id + "'>" + thisRatingOption.label + "</option>");
                }

                //close up the select element
                thisRatingSelectOutter += thisRatingSelectInner + "</select>";

                theCriteriaElement += theCriteriaWrapper + "<label>" + thisRowLabel + "</label>" + thisRatingSelectOutter + "<span id='criteriaWeightElm' class='criteriaWeightElm'></span><span id='criteriaScoreElm' class='criteriaScoreElm'></span></div>";
            }

            return theCriteriaElement;
        };

        var bindTheSelects = function(theQtip) {
            var $theSelects = theQtip.find(".recogCalcRatingSelect");

            $theSelects.change(function() {
                if (selectsAllReady($theSelects)){
                    that.doSendCalculatorRatings($theSelects, theQtip);
                }
            });
        };

        var selectsAllReady = function($elms) {
            var isReady = true;

            $elms.each(function(){
                var $this = $(this);

                if ($this.val() === "undefined" || $this.val() === undefined){
                    isReady = false;
                }
            });

            return isReady;
        };

        var bindCloseButton = function(theQtip) {
            var $theCloseBtn = theQtip.find("#recogCalcCloseBtn");

            $theCloseBtn.click(function() {
               theQtip.qtip("hide");

            });
        };

        var bindPayoutLink = function($this) {
            $this.find("#recogCalcPayoutTableLink").off().click(function(event){
                event.preventDefault ? event.preventDefault() : event.returnValue = false;
                that.showRecogCalcPayout(this);
            });
        };

        // QTip has built in shift function, you just need to set the 'viewport'
        // var getQtipOffset = function() {
        //     var calcWidth = 750,
        //         anchorPos = $anchor.offset(),
        //         windowWidth,
        //         offSet = 0;

        //         if (anchorPos.left > calcWidth || anchorPos.left < (calcWidth / 2)){
        //             windowWidth = $(window).width(),
        //             offSet = -((windowWidth / 2) - (calcWidth / 2));
        //         }

        //         return offSet;
        // }

        if (this.calcObj.attributes.hasWeight){
            theWeightLabel = this.calcObj.attributes.weightLabel;
        }else{
            theWeightLabel = "";
        }

        if (this.calcObj.attributes.hasScore){
            theScoreLabel =  this.calcObj.attributes.scoreLabel;
        }else{
            theScoreLabel = "";
        }

        var renderedTemplate = "";

        $anchor.qtip({
            content:{
                text: ''
            },
            position:{
                my: 'top center',
                at: 'bottom center',
                adjust: {
                    // x: getQtipOffset(),
                    // y: 0
                    method: 'shift none' // shift x-axis inside viewport
                },
                container: $('body'),
                //Used to fix qtip position in in ie7&8.
                effect:false,
                viewport: $('body')// $('body'), // shift will try to keep tip inside this
            },
            show:{
                ready:false,
                event: false
            },
            hide:{
                event: false,
                fixed:true,
                delay:200
            },
            style:{
                padding: 0,
                classes:'ui-tooltip-shadow ui-tooltip-light recogCalcTipWrapper',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            events:{
                show:function(event,api){
                    var $this = $(this);
                    bindTheSelects($this);
                    bindCloseButton($this);
                    thisQtip = $this;
                    $('.recogCalcTipWrapper').not(thisQtip).hide(); //hide any other open calculators
                    $(".recogCalcPayoutTableLink").not($this.find("#recogCalcPayoutTableLink")).qtip("hide");
                    that.trigger('recogCalcShowing');
                },
                visible:function(){
                    var $this = $(this),
                        scrollOffset = -($(window).height() / 2) + ($this.height() / 2);
                    bindPayoutLink($this);
                    $this.find("#recogCalcPayoutTableLink").click(); //open the payout link
                    $.scrollTo($this, 500, {offset: {top: scrollOffset, left:0} });
                },
                hide:function(){
                    $(this).find("#recogCalcPayoutTableLink").qtip("hide");
                }
            }
        });

        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        TemplateManager.get(tplName, function(tpl){
                var data = {
                    weightLabel: theWeightLabel,
                    scoreLabel: theScoreLabel,
                    criteriaDiv: getCriteriaElements(),
                    hasWeight: that.calcObj.attributes.hasWeight,
                    hasScore: that.calcObj.attributes.hasScore,
                    showPayTable: that.calcObj.attributes.showPayTable
                };
                renderedTemplate = $(tpl(data));
                renderedTemplate.find('.msgSelRatingTarget').html(renderedTemplate.find('.msgSelectRatingInstruction').html());

                $anchor.qtip('option', 'content.text', renderedTemplate);
                $anchor.qtip("show");
                that.doRenderPreviousCalcInfo($anchor.closest("tr"), thisQtip);
            }, tplUrl);
    },

    doSendCalculatorRatings: function($theSelects, theQtip) {
        var thisScope = this;

        var getCriteriaInfo = function() {
            var theObj = {};

            $theSelects.each(function(i) {
                var $this = $(this);
                var thisRatingValue = parseInt($this.val(), 10);
                var thisCriteriaId = parseInt($this.parent().attr("data-criteria-id"), 10);

                var thisCriteriaObj = {
                    criteriaRating: thisRatingValue,
                    criteriaId: thisCriteriaId
                };

                theObj['criteria['+i+'].criteriaRating'] = thisRatingValue;
                theObj['criteria['+i+'].criteriaId'] = thisCriteriaId;

            });

            return theObj;
        };

        var theData = {
            promotionId: $("#promotionId").val(),
            participantId: $($(".recogCalcTipWrapper").qtip('api').options.position.target).closest("tr").attr("data-participant-id")
        };

        theData = $.extend({}, theData, getCriteriaInfo());

        var dataSent = $.ajax({
                type: "POST",
                dataType: 'g5json',
                url: G5.props.URL_JSON_SEND_RECOGNITION_CALCULATOR_INFO,
                 data: theData,
                 beforeSend: function(){
                    console.log( "[INFO] AwardeeCollectionView: doSendCalculatorRatings ajax post starting. Sending this: ", theData);
                 },
                success: function(serverResp){
                    console.log( "[INFO] AwardeeCollectionView: doSendCalculatorRatings ajax post sucess: ", serverResp);
                    thisScope.doUpdateRecogCalcValues(serverResp.data, theQtip, false);
                }
            });

            dataSent.fail(function(jqXHR, textStatus) {
                console.log( "[INFO] AwardeeCollectionView: doSendCalculatorRatings ajax post failed: " + textStatus, jqXHR );
            });
    },

    doUpdateRecogCalcValues: function(data, theQtip, hasPreviousData) {
        var that = this,
            $theCalcElm = theQtip.find("#recogCalcInnerWrapper"),
            scorElmTplName = 'recognitionCalculatorScoreWrapperTemplate',
            scorElmTplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'recognition/tpl/',
            $theCalc = theQtip.find("#recogCalcScoreWrapper"),
            rangedElm = "",
            theFixedAmount = "",
            theTotalScore,
            theAwardLevel,
            savedData = data,

            hasRangedAward = function() {
                var hasRanged = false;

                if (that.calcObj.attributes.awardType === "range"){
                    hasRanged = true;
                    rangedElm = "<span>(" + data.awardRange.min + " - " + data.awardRange.max + ")</span><input type='text' data-range-max='" + data.awardRange.max + "' data-range-min='" + data.awardRange.min + "'>";
                }

                return hasRanged;
            },

            hasFixedAward = function() {
                var hasFixed = false;

                if (that.calcObj.attributes.awardType === "fixed"){
                    theFixedAmount = data.fixedAward;
                    hasFixed = true;
                }

                return hasFixed;
            },

            hasAwardLevel = function() {
                var hasAwardLevel = false;

                if (that.calcObj.attributes.awardType === "merchlevel"){
                    theAwardLevel = data.awardLevel.name + " (" + data.awardLevel.value + ")" + "<input type='hidden' id='calcAwardLevelId' value='" + data.awardLevel.id + "'>";
                    hasAwardLevel = true;
                }

                return hasAwardLevel;
            },

            is_int = function(value){
                if((parseFloat(value) == parseInt(value, 10)) && !isNaN(value)){
                    return true;
                } else {
                    return false;
                }
            },

            bindAwardInput = function() {
                var $theInput = theQtip.find("input"),
                    $saveButton = theQtip.find("#recogCalcScoreWrapper").find("button"),
                    $rangeText = $theInput.closest("p"),
                    maxAward = parseInt($theInput.attr("data-range-max"), 10),
                    minAward = parseInt($theInput.attr("data-range-min"), 10);

                if (hasRangedAward()){
                    $theInput.keyup(function() {
                        if ($theInput.val() > maxAward || $theInput.val() < minAward || !is_int($theInput.val())){
                            $theInput.addClass("input-error");
                            $saveButton.attr('disabled', 'disabled');
                            $rangeText.addClass("range-error");
                        }else if ($theInput.hasClass("input-error")){
                            $theInput.removeClass("input-error");
                            $saveButton.removeAttr('disabled');
                            $rangeText.removeClass("range-error");
                        }else if ($saveButton.attr("disabled") === "disabled"){
                            $saveButton.removeAttr('disabled');
                        }
                    });
                }else{
                    $saveButton.removeAttr('disabled');
                }
            },

            bindSaveButton = function() {
                var $theButton = theQtip.find("#recogCalcScoreWrapper").find("button");

                $theButton.off();

                $theButton.click(function() {
                    if (allCriteriaSelected()){
                        that.doSaveCalculatedAward(savedData, theQtip);
                    }
                });
            },

            renderPreviousRatingSeletions = function(){
                var thisCriteria,
                i =0;
                for (i = 0; i < data.criteria.length; i++) {
                    thisCriteria = data.criteria[i];

                    $(".recCalcCriteriaWrapper[data-criteria-id='" + thisCriteria.criteriaId + "']").find("select").val(thisCriteria.criteriaRating);
                }
            },

            allCriteriaSelected = function() {
                var allSelected = true,
                    $criteriaSelects = theQtip.find("select");

                $criteriaSelects.each(function() {
                    var $theSelect = $(this);

                    if ($theSelect.val() === "undefined"){
                        allSelected = false;
                        $theSelect.addClass("input-error");
                    }else{
                        $theSelect.removeClass("input-error");
                    }
                });

                return allSelected;
            },

            theData = {
                isRange: hasRangedAward(),
                awardRange: rangedElm,
                totalScore: data.totalScore,
                hasFixed: hasFixedAward(),
                hasAwardLevel: hasAwardLevel(),
                awardLevel: theAwardLevel,
                fixedAmount: theFixedAmount
            };


        for (var i = data.criteria.length - 1; i >= 0; i--) {
            var theCriteria = data.criteria[i],
                $theRow = $theCalcElm.find("div[data-criteria-id='" + theCriteria.criteriaId + "']");

            if (that.calcObj.attributes.hasWeight){
                $theRow.find("#criteriaWeightElm").html(theCriteria.criteriaWeight);
            }

            if (that.calcObj.attributes.hasScore){
                $theRow.find("#criteriaScoreElm").html(theCriteria.criteriaScore);
            }
        }

        var startTxt, selectAmtText;

        //check to see if score template is there. If not, make it and populate it. If it is, just populate.
        if (!$theCalc.hasClass("recogCalcScoreWrapper")) {
            TemplateManager.get(scorElmTplName, function(tpl){
                theQtip.find("#recogCalcWrapper").append(tpl(theData));
                bindAwardInput();
                bindSaveButton();

                if (hasPreviousData){
                    renderPreviousRatingSeletions();
                }
            }, scorElmTplUrl);
        }else{
            if (theData.isRange){
                startTxt = $theCalc.find("p").text();
                selectAmtText = startTxt.substring(0, startTxt.indexOf("("));
                $theCalc.find("p").html(selectAmtText + " " + theData.awardRange); //update the range award
                bindAwardInput();
                bindSaveButton();
            }else if(theData.hasFixed){
                startTxt = $theCalc.find("p").text();
                selectAmtText = startTxt.substring(0, startTxt.indexOf(":"));
                bindSaveButton();
                $theCalc.find("p").html(selectAmtText + ": " + theData.fixedAmount); //update the fixed award
            }else{
                //must be merch level
                startTxt = $theCalc.find("p").text();
                selectAmtText = startTxt.substring(0, startTxt.indexOf(":"));
                bindSaveButton();
                $theCalc.find("p").html(selectAmtText + ': ' + data.awardLevel.name + ' (' + data.awardLevel.value + ')'); //update the fixed award
            }

            $theCalc.find("#recogCalcTotal").html(data.totalScore); //update total score

        }

    },

    doSaveCalculatedAward: function(data, theQtip) {
        var theCalcAwardObj = data,
            $anchor = $(theQtip.qtip('api').options.position.target),
            $thisRow = $anchor.closest("tr"),
            $rowSiblings = $thisRow.siblings("tr.participant-item");

        if (this.calcObj.attributes.awardType === "range"){
            theCalcAwardObj.awardedAmount = theQtip.find("input").val();
        }else if (this.calcObj.attributes.awardType === "fixed"){
            theCalcAwardObj.awardedAmount = data.fixedAward;
        }else{
            theCalcAwardObj.awardedAmount = theQtip.find("#calcAwardLevelId").val();
        }

        this.savedCalcObj = theCalcAwardObj;

        console.log( "[INFO] AwardeeCollectionView: doSaveCalculatedAward: saved this calcInfo: ", this.savedCalcObj);

        //if the calc obj is not a merchlevel award, do the normal save
        if (this.calcObj.attributes.awardType !== "merchlevel"){
            $anchor.siblings("input").val(theCalcAwardObj.awardedAmount);
            $anchor.text(theCalcAwardObj.awardedAmount);
        }else{
            //if it is a merchlevel, change the name of the input and display the award level name
            var thisInputName = $thisRow.find("[name*='.userId']").attr("name");
            var thisRatingIdName = thisInputName.substr(0, thisInputName.indexOf('.userId'));
            if (thisRatingIdName === "" || thisRatingIdName === undefined){
                thisRatingIdName = thisInputName.substr(0, thisInputName.indexOf('.awardLevel')); //in case we don't need to change the name
            }
            $anchor.siblings("input").not("[name*='calculatorResultBeans']").attr("name", thisRatingIdName + ".awardLevel").val(theCalcAwardObj.awardedAmount);
            $anchor.text(theCalcAwardObj.awardLevel.name + " (" + theCalcAwardObj.awardLevel.value + ")");
            $anchor.append("<input type='hidden' name='" + thisRatingIdName + ".awardLevelName' value='" + theCalcAwardObj.awardLevel.name +"'>", "<input type='hidden' name='" + thisRatingIdName + ".awardLevelValue' value='" + theCalcAwardObj.awardLevel.value + "'>", "<input type='hidden' name='" + thisRatingIdName + ".awardLevelId' value='" + theCalcAwardObj.awardLevel.id + "'>");
        }

        if (this.calcObj.attributes.awardType !== "merchlevel")
        {
            $thisRow.find(".calcDeduction").text(theCalcAwardObj.awardedAmount);
        }
        else
        {
            $thisRow.find(".calcDeduction").text(theCalcAwardObj.awardLevel.value);
        }

        //not a shared data-set. Add it's personal row info to global var
        $thisRow.attr("data-shared-calc-info", "false");
        this.savedCalcRows[$thisRow.attr("data-participant-cid")] = data;

        this.setAwardPointsForCalc($anchor, theCalcAwardObj);

        theQtip.qtip("hide");

        if ($rowSiblings.length > 0){
            this.doShowSameForAllCalc($anchor, theCalcAwardObj);
        }

    },

    setAwardPointsForCalc: function($el, calcData) {
        var pax = this.getParticipantByDomEl($el);
        var $paxPar = $el.parent();

        // set value on model
        if (this.calcObj.attributes.awardType !== "merchlevel"){
            pax.set('awardQuantity', parseInt($el.siblings("input").val(), 10));
        }else{
            // Must be a merch level
            pax.set('awardQuantity', calcData.awardLevel.value);
        }


        var calcAttrNameRaw = $el.siblings("[name*='claimRecipientFormBeans']").attr("name") || $paxPar.find("[name*='claimRecipientFormBeans']").attr("name");
        var calcAttrName = calcAttrNameRaw.substr(0, calcAttrNameRaw.indexOf('.')) + ".calculatorResultBeans";
        $paxPar.find("[name*='calculatorResultBeans']").remove(); //clear out any previous calc inputs

        for (var i = 0; i < calcData.criteria.length; i++) {
            var thisCriteria = calcData.criteria[i];

            $paxPar.append("<input type='hidden' name='" + calcAttrName + "[" + i + "].criteriaId' value='" + thisCriteria.criteriaId + " '>" + "<input type='hidden' name='" + calcAttrName + "[" + i + "].ratingId' value='" + thisCriteria.criteriaRatingId  + " '>" + "<input type='hidden' name='" + calcAttrName + "[" + i + "].criteriaRating' value='" + parseInt(thisCriteria.criteriaRating, 10) + "'>");
        }

        //clear out other data on the form
        $paxPar.siblings(".participant").find("input[name*='calculatorResultBeans']").remove();

    },

    doShowSameForAllCalc: function($anchor, theCalcAwardObj) {
        var that = this;
        $anchor.qtip({
            content: this.$wrapper.find('#sameForAllTipTpl').clone().removeAttr('id'),
            position: {
                my:'left center', at:'right center', adjust: {x: 5, y: 0}, container: this.$wrapper, effect:false, viewport: false
            },
            show:{ready:true,event:false},
            hide:"unfocus",
            //only show the qtip once
            events:{
                hide:function(evt,api){$anchor.qtip('destroy');},
                show:function(){
                    var $theDoSameLink = $(".sameForAllTip");
                    $theDoSameLink.click(function(event) {
                        event.preventDefault ? event.preventDefault() : event.returnValue = false;
                        that.doSameForAllCalc($anchor, $theDoSameLink, theCalcAwardObj);
                    });
                }
            },
            style:{classes:'ui-tooltip-shadow ui-tooltip-light'}
        });

        $anchor.qtip("show");
    },

    doSameForAllCalc: function($anchor, $theToolTip, theCalcAwardObj) {
        var that = this;
        this.didSameForAll = true;

        var $original = $anchor.closest("tr"),
            $theRows = $(".participant-item").not($original);

        if ($theRows.length > 0 ){

            $theRows.each(function() {
                var $this = $(this),
                    $theInput = $this.find("[name*='awardQuantity']"),
                    $thisAnchor = $this.find(".calcLink");

                var thisInputName = $thisAnchor.siblings("input").attr("name");
                var thisRatingIdName = thisInputName.substr(0, thisInputName.indexOf('.awardQuantity'));

                $original.attr("data-shared-calc-info", "true");

                $this.attr("data-shared-calc-info", "true");
                $theInput.val(that.savedCalcObj.awardedAmount);

                if (that.calcObj.attributes.awardType !== "merchlevel"){
                    $theInput.siblings(".calcLink").text(that.savedCalcObj.awardedAmount);
                }else{
                    $theInput.siblings(".calcLink").text(that.savedCalcObj.awardLevel.name + " (" + that.savedCalcObj.awardLevel.value + ")");
                }

                if (that.calcObj.attributes.awardType !== "merchlevel"){
                    $this.find(".calcDeduction").text(that.savedCalcObj.awardedAmount);
                    that.setAwardPointsForCalc($this.find(".calcLink"), theCalcAwardObj);
                }else{
                    that.setAwardPointsForCalc($this.find(".calcLink"), theCalcAwardObj);
                    $this.find(".calcDeduction").text(that.savedCalcObj.awardLevel.value);

                    if (thisRatingIdName === "" || thisRatingIdName === undefined){
                        thisRatingIdName = thisInputName.substr(0, thisInputName.indexOf('.awardLevel')); //in case we don't need to change the name
                    }
                    $thisAnchor.siblings("input").not("[name*='calculatorResultBeans']").attr("name", thisRatingIdName + ".awardLevel").val(theCalcAwardObj.awardedAmount);
                    $thisAnchor.text(theCalcAwardObj.awardLevel.name + " (" + theCalcAwardObj.awardLevel.value + ")");
                    $thisAnchor.append("<input type='hidden' name='" + thisRatingIdName + ".awardLevelName' value='" + theCalcAwardObj.awardLevel.name +"'>", "<input type='hidden' name='" + thisRatingIdName + ".awardLevelValue' value='" + theCalcAwardObj.awardLevel.value + "'>");
                }



                $theToolTip.parent(".ui-tooltip-content").parent().qtip("hide");
            });

        }else{
            $theToolTip.parent(".ui-tooltip-content").parent().qtip("hide");
        }
    },

    doRenderPreviousCalcInfo: function($theRow, theQtip) {
        if ($theRow.attr("data-shared-calc-info") === "true"){
            this.doUpdateRecogCalcValues(this.savedCalcObj, theQtip, true);
        }else if (this.savedCalcRows[$theRow.attr("data-participant-cid")]){
            this.doUpdateRecogCalcValues(this.savedCalcRows[$theRow.attr("data-participant-cid")], theQtip, true);
        }else if($("#dataForm").find("[name*='].id']").filter("[value='" + $theRow.attr("data-participant-id") + "']").val() !== undefined){
            this.doRenderRecogCalcValuesOld($("#dataForm").find("[name*='].id']"), theQtip);
        }
    },

    doRenderRecogCalcValuesOld: function(recipIdInput, theQtip) {

        var theRecipNameRaw = recipIdInput.attr("name");
        var theRecipCalcNameRaw = theRecipNameRaw.substr(0, theRecipNameRaw.indexOf(".id")) + ".calculatorResultBeans";
        var finalSelect;


        $("#dataForm").find("[name*='" + theRecipCalcNameRaw + "']").filter("[name*='criteriaId']").each(function() {
            var $this = $(this),
                thisCriteriaId = $this.val(),
                thisInputName = $this.attr("name"),
                thisRatingIdName = thisInputName.substr(0, thisInputName.indexOf('.criteriaId')),
                thisRatingId = $("[name='" + thisRatingIdName + ".ratingId']").val(),
                theRatingSelectPar = theQtip.find(".recCalcCriteriaWrapper").filter("[data-criteria-id='" + thisCriteriaId + "']"),
                theRatingSelect = theRatingSelectPar.find("select"),
                theRatingOption = $(theRatingSelect).find("[data-ratingid='" + thisRatingId + "']");
            theRatingSelect.val(theRatingOption.val());
            finalSelect = theRatingSelect;
        });

        if (finalSelect){
            finalSelect.change();
        }

    },

    showRecogCalcPayout: function(anchor) {
        var that = this,
            $theAnchor = $(anchor),
            tplName = 'recognitionCalculatorPayoutGridTemplate',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'recognition/tpl/',
            finishedTemplate = "",
            payTableLength = that.calcObj.payTable.rows.length,
            i = 0,
            thisPayoutRow,

            populateGrid = function($theQtip) {
                $theQtip.find("td").remove(); //empty it out.

                for (i = 0; i < payTableLength; i++) {
                    thisPayoutRow = that.calcObj.payTable.rows[i];

                    $theQtip.find("tbody").append("<tr><td>" + thisPayoutRow.score + "</td><td>" + thisPayoutRow.payout + "</td></tr>");
                }

            },

            bindCloseButton = function($this) {
                var $theButton = $this.find("#recogCalcPayoutCloseBtn");
                $theButton.click(function() {
                    $this.qtip("hide");
                });
            };

        $theAnchor.qtip({
            content:{
                text: 'Cannot find content'
            },
            position:{
                my: 'top left',
                at: 'bottom left',
                container: $('body')
            },
            show:{
                ready:false,
                event: false
            },
            hide:{
                event: false,
                fixed:true,
                delay:200
            },
            style:{
                padding: 0,
                classes:'ui-tooltip-shadow ui-tooltip-light recogCalcPayoutTableWrapper',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            events:{
                visible:function(event,api){
                    var $this = $(this);
                    populateGrid($this);
                    bindCloseButton($this);
                    that.parentView.on("promoNodeChange", function() {
                        $this.qtip("hide");
                    });
                }
            }
        });

        TemplateManager.get(tplName, function(tpl){
            finishedTemplate = tpl().toString();
            $theAnchor.qtip('option', 'content.text', finishedTemplate);
            $theAnchor.qtip("show");
        }, tplUrl);

    },
//rpsv.recipientView.setAwardPointsForCalc($('.participant-item .participant'),rpsv.getCalcSetup())
    checkForSavedCalc: function() {
        var that = this,
            hasCalcData = false,
        // get ready for this -- http://www.youtube.com/watch?v=0P9HCPAEc48
            calcData = function() {
                if (!that.calcData && !that.didCalc){ //if there isn't already calc data, create it
                    var arr = function() {
                        var theArr= {};
                        _.each(that.model.models, function(collection, collIndex) {
                            var innerArr = {};
                            _.each(collection.attributes, function(attribute, attrIndex) {
                                if (attrIndex.indexOf("calculatorResultBeans") > -1 && attribute !== ""){
                                    innerArr[attrIndex] = attribute;
                                    hasCalcData = true;
                                }else if(attrIndex.indexOf("awardLevel") > -1 && attribute !== ""){
                                    innerArr[attrIndex] = attribute;
                                }
                            });
                            innerArr.id = collection.attributes.id;
                            theArr[collIndex] = innerArr;
                        });
                        return theArr;
                    }(); //self calling
                    that.didCalc = true; //make sure we don't calculate or populate this again
                    return arr;
                }
            }(); //also self calling

        that.calcData = calcData;


        if (calcData && hasCalcData){
            _.each(calcData, function(recipObj, index) {
                _.each(recipObj, function(recip, recipName) {
                    if (recip !== recipObj.id && recip !== ""){
                        $("[name*='.userId']").filter("[value='" + recipObj.id + "']").parent().append("<input type='hidden' name='claimRecipientFormBeans[" + index + "]." + recipName + "' value='" + recip + "'>");
                    }

                    if (recipName.indexOf("awardLevelValue") > -1 && recip !== "" && recip !== undefined){
                        var $el = $("[name*='.userId']").filter("[value='" + recipObj.id + "']"),
                            pax = that.getParticipantByDomEl($el),
                            $parItem = $el.closest(".participant-item");

                        pax.set('awardQuantity', parseInt(recip, 10));
                        $parItem.find(".calcLink").text(recip);
                        $parItem.find("[name*='.awardQuantity']").remove();
                    }
                });
            });
        }
    },

    // Hackey function below:
    // CASE: edit - server sends calculatorResultsBeans[n] in #dataForm which need to be in the #sendForm
    renderCalcInputsForPaxHack: function(json,$pi) {
        var $tarEl = $pi.find('.award');

        // look @ each json field, if it is calc res bean then dump into apropo element as (hidden) INPUT
        // this imitates data dumped in same place when user selects ratings etc. from qtip+ajax json calls
        //
        // extra hacky: the original .append in the .each looked like this: $tarEl.append('<input type="hidden" name="'+k+'" value="'+v+'" >');
        // I added the json._paxName and [json.autoIndex] because that seemed to be necessary to fix the issue with these values not filling in when the user hits "Edit" from the preview page
        _.each(json, function(v,k){
            if(k.match(/calculatorResultBeans\[/)) {
                $tarEl.append('<input type="hidden" name="'+json._paxName+'['+json.autoIndex+'].'+k+'" value="'+v+'" >');
            }
        });
    },

    // ===================
    // UTILITY FUNCTIONS
    // ===================
    getParticipantByDomEl: function($el){
        var $pax = $el.closest('.participant-item[data-participant-cid]'),
            cid = $pax.data('participantCid');

        return this.model.getByCid(cid);
    },

    //show an error tip
    errorTip: function($el,msg,isDestroyOnly){

        //if old qtip still visible, obliterate!
        if($el.data('qtip_error')) { $el.data('qtip_error').destroy(); }

        if(isDestroyOnly){ // only destroying?
            if($el.is(':focus')) { this.showSameForAllTip({target:$el}); }
            return; // EXIT
        }


        // sfa tip around? hide it
        if($el.data('qtip_sfa')) { $el.data('qtip_sfa').hide(); }

        $el.qtip({
            content: '<i class="icon icon-warning-sign"></i> '+msg,
            position:{my:'left center',at:'right center',container: this.$wrapper, viewport: this.$wrapper, adjust:{method:'shift'}},
            show:{ready:true,delay:false},
            hide:false,
            //only show the qtip once
            events:{
                visible: function(evt,api){
                    var $tt = api.elements.tooltip,
                        $tar = api.elements.target,
                        tarX = $tar.position().left+$tar.width();
                    //console.log($tar.position().left+$tar.width(),$tt.position().left);
                    //console.log(api.elements.tooltip.get(0),api.elements.tip.get(0),api);
                    if(tarX>$tt.position().left){
                        api.set('position.adjust.y',-30);

                    }else{
                        api.set('position.adjust.y',0);

                    }
                },
                move: function(evt,api){},
                hide:function(evt,api){$el.qtip('destroy');}
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-red validate-tooltip',
                tip: {
                    width: 10,
                    height: 5
                }
            }
        });

        $el.data('qtip_error',$el.data('qtip')).removeData('qtip');
    },
    //ajust error tip location
    errorTipsReposition: function(){
        this.$el.find('.awardPointsInp,.awardLevelSel').each(function(){
            var $trig = $(this);
            if($trig.data('qtip_error')){$trig.data('qtip_error').reposition();}
        });
    },

    // yuck, look up the level value for this user
    getValueOfLevelFor: function(pax){
        var promo = this.parentView.getPromoSetup(),
            levs = promo.awardLevels?promo.awardLevels[pax.get('countryCode')]:false,
            lev;
        if(levs) {
            lev = _.find(levs,function(l){
                return ''+l.id === ''+pax.get('awardLevelId');
            });
            return lev ? lev.points || 0 : 0;
        }
        return 0;
    },


    // set max recips
    setMaxRecipients: function(num){
        this.maxRecipients = num;
    },

    // overriding the core method
    removeParticipantAction:function(e){//hits the data model
        var $el = $(e.currentTarget).closest('[data-participant-cid]').find('.awardPointsInp');
        this.errorTip($el,'',true); // destroy any error tips

        this.constructor.__super__.removeParticipantAction.apply(this, arguments);

        // IE8 needs this else it will barf an error (due to Jquery event stuff)
        return false;
    }

});
