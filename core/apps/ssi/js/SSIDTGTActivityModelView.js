/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SSIContestModel,
SSIDTGTActivityModelView:true
*/
SSIDTGTActivityModelView = Backbone.View.extend({

    // these are referenced by containing view, so it can pass
    // the tpl to the contructor for this
    tplPath: './../apps/ssi/tpl/', // fe dev uses this
    tplName: 'ssiDtgtActivityModelView',

    tagName: 'div',
    className: 'ssiDtgtActivityModelView',

    initialize: function(opts) {
        this.tpl = opts.tpl;
        this.contMod = opts.contMod;
        this.setupEvents();
    },

    events: {
        'click .saveActivityBtn': 'doSave',
        'click .cancelActivityBtn': 'doCancel',
        'click .removeControl': 'doRemove',
        'click .editControl': 'doEdit',

        'keyup input': 'doInputKeyup'
    },

    setupEvents: function() {
        this.contMod.on('change:measureType', this.handleMeasureTypeChange, this);
        this.contMod.on('change:payoutType', this.handlePayoutTypeChange, this);

        this.model.on('activeNewOff', this.handleActiveNewOff, this);

        this.on('end:displayDetails', this.initEstimator, this);

        this.on('activitySave', this.handleSave, this);
        this.model.on('success:update', this.handleModelSaveExisting, this);
        this.on('activityCancel', this.handleCancel, this);

        this.on('inputsChange', this.handleInputsChange, this);
        this.on('goalChangedViaInput', this.handleGoalChangedViaInput, this);
        this.on('totalsChange', this.handleTotalsChange, this);
        this.on('estimatesChange', this.handleEstimatesChange, this);

        this.model.on('success:remove', this.handleRemoveSuccess, this);
    },


    // ************************************************
    // RENDER, INIT
    // ************************************************
    render: function() {
        var d = this.model.toJSON();

        d.cid = this.model.cid; // add this client id

        this.$el.html( this.tpl(this.model.toJSON()) );
        this.updatePayoutType();
        this.updateModelToDom();

        this.setTotals();

        return this.$el;
    },

    updateModelToDom: function() {
        var json = this.model.toJSON(),
            that = this;

        // look for any elements with data-model-key matches, and fill them in
        _.each(json, function(v, k){
            that.$el.find('[data-model-key='+k+']').each(function(){
                var $t = $(this);

                switch(this.tagName) {
                    case 'INPUT': $t.val(v); break;
                    default: $t.text(that.fmt(v));
                }
            });
        });
    },

    initEstimator: function() {
        var that = this,
            $s = this.$el.find('.estimateSlider'),
            // $sh,
            pct = this.model.get('estPercent')||100;

        // init model value as necessary
        if( !this.model.get('estPercent') ) {
            this.model.set('estPercent', pct);
        }

        // attach slider
        $s.slider({
            min: 0,
            max: 100,
            step: 1,
            value: pct,
            tooltip: 'show',
            formater: function(val) {
                return val + '%';
            }
        });

        // setup the slide event updates
        $s.on('slide', function(evt) {
            var pct = evt.value;

            // set model val
            that.model.set('estPercent', pct);

            // set and calculate estimates
            that.setEstimates();

        });
        $s.on('slideStart', function(evt) {
            $s.data('slider').showTooltip();
        });
        $s.on('slideStop', function(evt) {
            $s.data('slider').hideTooltip();
        });

        this.setEstimates(true /* goalIsSacred */);
    },


    // ************************************************
    // UPDATE
    // ************************************************
    // Calculations @ Projects\G5\Core\UseCaseVault\SSI Contest Use Cases\Calculations
    // 5/28/15 NOTE: Most of the totals are not displayed any longer in the UI,
    //               they may however be used in estimates/goal calculations. Or
    //               maybe they shall one day return.
    setTotals: function(isGoalSacred) {
        var ipc = parseFloat(this.model.get('individualPayoutCap')),
            pc = parseFloat(this.model.get('participantCount')),
            mq = parseFloat(this.model.get('minQualifier')),
            willEarn = parseFloat(this.model.get('willEarn')),
            forEvery = parseFloat(this.model.get('forEvery')),
            estMaxPay = ipc * pc,
            estMaxPot = ( ( (ipc*forEvery) / willEarn) + mq) * pc,
            upd = false;

        //console.log('( ( (',ipc,'*',forEvery,') / ',willEarn,') + ',mq,') * ',pc, ' = ',estMaxPot);

        if( _.isNumber(estMaxPay) ) {
            this.model.set('maxPayout', estMaxPay);
            upd = true;
        }

        if( _.isNumber(estMaxPot) ) {
            this.model.set('maxPotential', estMaxPot);
            upd = true;
        }

        if(upd) {
            this.trigger('totalsChange', isGoalSacred);
        }

    },

    /* RULES (slider and goal behavior):
        1) slider effects goal AND estMaxPayout
        2) direct keying in of goal will effect estMaxPayout
        3) estMaxPayout depends on: slider OR goal (trixy business)

        Essentially this is managed by "isGoalSacred" and checking if values are truthy.
    */
    setEstimates: function(isGoalSacred) {
        var m = function(key) {return this.model.get(key);}.bind(this),
            pct = m('estPercent'),
            maxPotIsNum = !_.isNaN(m('estMaxPotential'));

        this.model.set('estMaxPayout', (pct*m('maxPayout'))/100 );
        this.model.set('estMaxPotential', (pct*m('maxPotential'))/100 );

        // if we are not explicitly leaving goal alone
        if( !isGoalSacred && maxPotIsNum) { // gets value of estMaxPotential
            this.model.set('goal', Math.round( m('estMaxPotential') ));
        }

        // if active new, set the goal from estMaxPot
        // but if goal input has focus, don't mess with contestGoal
        if(maxPotIsNum && this.model.isActiveNew() && !this.$el.find('[data-model-key=goal]').is(':focus') ) {
            this.model.set('goal', Math.round( m('estMaxPotential') ));
        }

        // estMaxPayout based on goal OR slider (if goal not set)
        pct = m('goal') ?
                Math.round(100 * ( Math.round(m('goal')) /
                    Math.round(m('maxPotential')) )) : pct;

        this.model.set('estMaxPayout', (pct * m('maxPayout')) / 100);

        this.trigger('estimatesChange');
    },

    updateTotals: function() {
        var pay = this.model.get('maxPayout'),
            pot = this.model.get('maxPotential');

        if(pay) { this.$el.find('.maxPay').text(this.fmt(pay, 'maxPayout')); }
        if(pot) { this.$el.find('.maxPot').text(this.fmt(pot, 'maxPotential')); }
    },

    updateEstimates: function() {
        var estPay = this.model.get('estMaxPayout'),
            estPot = this.model.get('estMaxPotential'),
            maxPot = this.model.get('maxPotential'),
            goal = this.model.get('goal'),
            goalAsPctOfMaxPot = Math.round(100 * ( Math.round(goal) / Math.round(maxPot) )),
            $g = this.$el.find('.activityDetailActGoal input');

        if(_.isNumber(estPay)) {
            this.$el.find('.estPay').text(this.fmt(estPay, 'estMaxPayout'));
        }

        if(_.isNumber(estPot)) {
            this.$el.find('.estPot').text(this.fmt(estPot, 'estMaxPotential'));
        }

        if(_.isNumber(goal)&&!_.isNaN(goal)) {
            if(goal > maxPot){
                $g.val(maxPot);
                this.$el.find('.activityDetailActGoal .goalPercent').text('(100%)');
                return;
            }
            if(parseInt($g.val(),10) !== goal) { // only if diff
                $g.val(goal);
            }

            // goal as percent of maxPotential
            this.$el.find('.activityDetailActGoal .goalPercent').text('('+goalAsPctOfMaxPot+'%)');

        }
    },

    updateCurrency: function(curObj) {
        if(!curObj) { return; }

        this.$el.find('.currSymb.pay').text(curObj.payout.symbol);
        this.$el.find('.currDisp.pay').text(curObj.payout.display);
        this.$el.find('.currSymb.act').text(curObj.activity.symbol);
        this.$el.find('.currDisp.act').text(curObj.activity.display);
    },

    updatePayoutType: function() {
        var pt = this.contMod.get('payoutType');
        this.$el.find('.activityDetailValueDesc')[pt=='other' ? 'show' : 'hide']();
        this.$el.find('.otherPayoutTypeMsg').css('display', pt=='other'?'inline-block':'none');
        this.$el.find('.pointsPayoutTypeMsg').css('display', pt=='other'?'none':'inline-block');
    },


    // ************************************************
    // UI ACTIONS
    // ************************************************
    doSave: function() {
        if(this.validate()) {
            this.hideDetails('activitySave');
        }
    },

    doCancel: function() {
        // revert if we have original json
        if(this._origJson) {
            this.model.set(this._origJson);
            this.updateModelToDom(); // refresh the UI with orig vals
        }

        this.hideDetails('activityCancel');
    },

    doEdit: function(e) {
        // save a copy of original state, if cancel we will use it
        this._origJson = this.model.toJSON();
        this.displayDetails();
    },

    doRemove: function(e) {
        var that = this,
            $tar = $(e.target),
            $tip = this.$el.closest('.activities').find('.activityRemoveDialog');

        e.preventDefault();

        G5.util.questionTip($tar, $tip.clone(), {
                position:{
                    my: 'right center',
                    at: 'left center'
                }
            },
            function() { // confirm callback
                that.doRemoveConfirm();
            }
        );
    },

    doRemoveConfirm: function(e) {
        // calls remove ajax req
        // which will trigger success:remove
        this.model.destroy();
    },

    doInputKeyup: function(e) {
        var $t = $(e.target),
            k = $t.data('modelKey'),
            v = $t.val();

        // detect a number and change the type to a number
        if(v.match(/^\d+(.\d*)?$/g)) {
            v = parseFloat(v);
        }

        this.model.set(k,v);

        if(k==='goal') {
            this.trigger('goalChangedViaInput');
        } else {
            this.trigger('inputsChange');
        }

    },

    displayDetails: function(triggerName) {
        var that = this;

        this.$el.find('.activityHeaders').slideUp(G5.props.ANIMATION_DURATION);

        this.$el.find('.activityDetails').slideDown(G5.props.ANIMATION_DURATION, function() {
            that.trigger('end:displayDetails', that);

            if( triggerName ) {
                that.trigger(triggerName, that);
            }
        });
    },

    hideDetails: function(triggerName) {
        var that = this;

        this.$el.find('.activityHeaders').slideDown(G5.props.ANIMATION_DURATION);

        this.$el.find('.activityDetails').slideUp(G5.props.ANIMATION_DURATION, function() {
            that.trigger('end:hideDetails', that);

            if( triggerName ) {
                that.trigger(triggerName, that);
            }
        });
    },

    mask: function() {
        this.$el.addClass('maskOn isEdit');
    },

    unmask: function() {
        this.$el.removeClass('maskOn isEdit');
    },


    // ************************************************
    // HANDLERS
    // ************************************************
    handleSave: function() {
        // if new
        if(this.model.isActiveNew()) {
            // this ModelView doesn't know about the Collection
            this.trigger('req:addToCollection', this);
        }
        // if edit save
        else {
            this.updateModelToDom();
            this.trigger('activityEditStarted');
            // will save to server, and trigger success:update
            this.model.save();
        }
    },

    handleModelSaveExisting: function() {
        this.trigger('activityEdited');
    },

    handleCancel: function() {
        // if new
        if(this.model.isActiveNew()) {
            // this ModelView doesn't know about the Collection
            this.trigger('req:destroy', this);
        }
        // if edit cancel
        else {
            // ???
        }
    },

    handleActiveNewOff: function() {
        this.render(); // re-render
    },

    handleInputsChange: function() {
        this.setTotals();
    },

    handleGoalChangedViaInput: function() {
        this.setTotals(true /* isGoalSacred */);
    },

    handleTotalsChange: function() {
        this.updateTotals();
        this.setEstimates(true /*isGoalSacred*/);
    },

    handleEstimatesChange: function() {
        this.updateEstimates();
    },

    handlePayoutTypeChange: function() {
        this.model.setPayoutType(this.contMod.get('payoutType'));
        this.updatePayoutType();
        this.updateModelToDom();
        this.updateTotals();
    },

    handleMeasureTypeChange: function() {
        this.updateModelToDom();
        this.updateTotals();
    },

    handleRemoveSuccess: function() {
        var that = this,
            col = that.model.collection;

        this.$el.slideUp(G5.props.ANIMATION_DURATION, function() {
            // remove from collection
            col.remove(that.model);
        });
    },


    // ************************************************
    // UTIL/MISC
    // ************************************************
    validate: function() {
        var errBoxShown = false,
            mt = this.contMod.get('measureType'),
            mtPrec = mt == 'currency' ? 2 : 4,
            that = this;

        this.$el.find('input[data-model-key]:visible').each( function() {
            var $t = $(this),
                k = $t.data('modelKey'),
                v = $t.val(),
                errF = function($el, msg) {
                    $t.addClass('hasError');
                    if(!errBoxShown) {
                        that.errorTip(msg, $t);
                        errBoxShown = true;
                    }
                };

            $t.removeClass('hasError');

            // text
            if(k == 'description' || k == 'valueDescription') {
                if( !v ) {
                    errF($t, 'req');
                }
            }
            // numbers
            else {

                // decimal, zero, negative, 2 or 4 decimal places (dep on measureType)
                if(k == 'forEvery' || k == 'minQualifier') {
                    if(!G5.util.validation.isNum(v, 'decimal', mtPrec, true /* allowNegs */, true /* allowZero */)) {
                        errF($t, 'reqDec_'+mtPrec);
                    }
                }
                // decimal, positive, non-zero
                else if(k == 'goal') {
                    if(!G5.util.validation.isNum(v, 'decimal', mtPrec, false) || v === 0) {
                        errF($t, 'reqDec_'+mtPrec+'_pos');
                    }
                }
                // whole positive
                else {
                    if(!G5.util.validation.isNum(v, 'natural', 0, false)) {
                        errF($t, 'reqNum');
                    }
                }

                // max number
                if(SSIContestModel.prototype.MAX_NUMBER_SIZE < parseFloat(v)) {
                    errF($t, 'numBeyondMax');
                }

            }

        }); // .each(...)

        //unique descriptions
        if( !this.model.collection.areDescriptionsUnique(this.model) && !errBoxShown ) {
            this.errorTip('uniqueDescReq', this.$el.find('input[data-model-key=description]'));
            errBoxShown = true;
        }

        return !errBoxShown;
    },

    // mask click only happens when the active material item needs confirmation to save
    showMustSaveTip: function(e) {
        var jostle,
            $btn = this.$el.find('.saveActivityBtn:visible');

        this.errorTip('mustEditSave', $btn);

        // jostle function
        jostle = function() {
            $btn.data('qtip').elements.tooltip
                .animate({top:'-=20'},300).animate({top:'+=20'},300)
                .animate({top:'-=10'},200).animate({top:'+=10'},200);
        };

        $.scrollTo($btn,{
            axis:'y',
            duration: 200,
            offset:{
                top: -$(window).height() + $btn.outerHeight() + 20
            },
            onAfter: jostle
        });

    },

    // display an error tip on target (uses class name to show proper error)
    errorTip: function(msgClass, $target, opts) {
        var msg = this.$el.find('.ssiDtgtActivityModelViewErrorMsgs .'+msgClass).text(),
            defOpts = {
                content:{text: msg},
                position:{
                    my: 'bottom center',
                    at: 'top center',
                    effect: false,
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
                    classes:'ui-tooltip-shadow ui-tooltip-red',
                    tip: {
                        corner: true,
                        width: 10,
                        height: 5
                    }
                }
            };

        // perform a deep merge, where opts overrides defOpts
        opts = $.extend(true, defOpts, opts||{});

        //attach qtip and show
        $target.qtip(opts);
    },

    // destroy this view
    destroy: function() {
        this.undelegateEvents();
        this.remove();
    },

    // number format
    fmt: function(num, key) {
        if(_.isNaN(num)) { return '--'; }
        return this.contMod.formatNumberForKey(num, key);
    }

});
