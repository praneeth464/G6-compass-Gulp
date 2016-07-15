/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
BadgesSelectorView,
SSIContestModel,
SSISIULevelModelView:true
*/
SSISIULevelModelView = Backbone.View.extend({

    // these are referenced by containing view, so it can pass
    // the tpl to the contructor for this
    tplPath: './../apps/ssi/tpl/', // fe dev uses this

    tplName: 'ssiSiuLevelModelView',

    tagName: 'div',

    className: 'ssiSiuLevelModelView',

    initialize: function(opts) {
        this.tpl = opts.tpl;
        this.contMod = opts.contMod;
        this.setupEvents();
    },

    events: {
        'click .saveLevelBtn': 'doSave',
        'click .cancelLevelBtn': 'doCancel',
        'click .removeControl': 'doRemove',
        'click .editControl': 'doEdit',

        'keyup input': 'doInputKeyup'
    },

    setupEvents: function() {
        this.contMod.on('change:measureType', this.handleMeasureTypeChange, this);
        this.contMod.on('change:payoutType', this.handlePayoutTypeChange, this);
        this.contMod.on('change:measureOverBaseline', this.handleMeasureOverBaselineChange, this);

        this.model.on('activeNewOff', this.handleActiveNewOff, this);
        this.model.collection.on('saveNew', this.handleCollectionLengthChange, this);
        this.model.collection.on('remove', this.handleCollectionLengthChange, this);

        this.on('levelSave', this.handleSave, this);
        this.model.on('success:update', this.handleModelSaveExisting, this);
        this.on('levelCancel', this.handleCancel, this);

        this.on('inputsChange', this.handleInputsChange, this);
        this.on('totalsChange', this.handleTotalsChange, this);
        this.on('estimatesChange', this.handleEstimatesChange, this);

        this.model.on('success:remove', this.handleRemoveSuccess, this);

        this.model.on('amountRemovedByOrderChange', this.handleAmountRemoveByOrderChange, this);
    },


    // ************************************************
    // RENDER, INIT
    // ************************************************
    render: function() {
        var d = this.model.toJSON();

        d.cid = this.model.cid; // add this client id

        this.$el.html( this.tpl(this.model.toJSON()) );
        this.updatePayoutType();
        this.initBadges();
        this.updateModelToDom();
        this.updateRemoveControl();

        return this.$el;
    },

    updateModelToDom: function() {
        var json = this.model.toJSON(),
            that = this,
            actBad,
            badHtml,
            seqNum = json.sequenceNumber;

        // look for any elements with data-model-key matches, and fill them in
        _.each(json, function(v, k){
            that.$el.find('[data-model-key='+k+']').each(function(){
                var $t = $(this);
                switch(this.tagName) {
                    case 'INPUT': $t.val(v||''); break;
                    default: $t.text(that.fmt(v, k));
                }
            });
        });

        // badge
        if(this.badgesSelectorView) {
            actBad = this.badgesSelectorView.getActiveBadge();

            if(actBad.get('id') == 'noBadge') {
                badHtml = $('<i class="icon-ban-circle"></i>')
                    .attr('title', actBad.get('name'));
            } else {
                badHtml = $('<img>')
                    .attr('src', actBad.get('img'))
                    .attr('title', actBad.get('name'));
            }

            this.$el.find('.levelBadge').empty().append(badHtml);
        }

        // level
        this.$el.find('.lowestLevel, .highestLevel').hide();
        if(seqNum === 1) {
            this.$el.find('.lowestLevel').show();
        } else if(this.model.collection && seqNum === this.model.collection.length) {
            this.$el.find('.highestLevel').show();
        }

        // mark missing
        _.each(json, function(v, k){
            that.$el.find('[data-model-key='+k+']').each(function(){
                var $t = $(this),
                    $lh = $t.closest('.levelHeader');
                if($lh.length && !v) {
                    $t.html($t.data('msgEdit')).addClass('editControl btn btn-warning btn-small');
                } else {
                    $t.removeClass('editControl btn btn-warning btn-small');
                }
            });
        });

    },

    initBadges: function() {
        var $bw = this.$el.find('.badgesOuterWrapper'),
            badges = this.contMod.get('badges');

        // just hide the badge section if not using badges
        if(!badges || !badges.length) {
            $bw.hide();
            return;
        }

        // ok, we have badges
        $bw.show();

        // badges widget
        this.badgesSelectorView = new BadgesSelectorView({
            el: this.$el.find('.badgesSelectorView'),
            collection: new Backbone.Collection(badges),
            selectedBadgeId: this.model.get('badgeId')||null
        });

        this.badgesSelectorView.on('badgeChanged', this.doBadgeChange, this);
    },


    // ************************************************
    // UPDATE
    // ************************************************
    updateCurrency: function(curObj) {
        var mob = this.contMod.get('measureOverBaseline'),
            mt = this.contMod.get('measureType'),
            classToDisp;

        // labels for measure input field
        this.$el.find('.levelDetailAmount .msg').addClass('hide');
        if(!mob || mob == 'no') {
            if(mt == 'currency') {
                classToDisp = 'currency';
            } else { // mt == 'units'
                classToDisp = 'amount';
            }
        } else { // measureOverBaseline is on
            if(mob == 'currency') {
                if(mt == 'currency') {
                    classToDisp = 'currencyOverBaseline';
                } else { // mt == 'units'
                    classToDisp = 'amountOverBaseline';
                }
            } else if(mob == 'percent') { // mob == 'percent'
                classToDisp = 'percentOverBaseline';
            }
        }
        // display that duder
        this.$el.find('.levelDetailAmount .'+classToDisp).removeClass('hide');


        // currency symbols
        if(!curObj) { return; }

        this.$el.find('.currSymb.pay').text(curObj.payout.symbol);
        this.$el.find('.currDisp.pay').text(curObj.payout.display);
        this.$el.find('.currSymb.act').text(curObj.activity.symbol);
        this.$el.find('.currSymbAfter.act').text(curObj.activity.symbolAfter);
        this.$el.find('.currDisp.act').text(curObj.activity.display);
    },

    updatePayoutType: function() {
        var pt = this.contMod.get('payoutType'),
            $h = this.$el.find('.levelHeaders .levelPayoutDesc'),
            $f = this.$el.find('.levelDetailPayoutDesc'),
            isOther = pt == 'other';

        $h[isOther ? 'show' : 'hide']();
        $f[isOther ? 'show' : 'hide']();

        if(isOther) {
            $h.find('[data-model-key="payoutDescription"]').text('');
            $f.find('input').val('');
            this.$el.find('.showForPOTOther').show();
            this.$el.find('.hideForPOTOther').hide();
        } else {
            this.$el.find('.showForPOTOther').hide();
            this.$el.find('.hideForPOTOther').show();
        }
    },

    updateRemoveControl: function() {
        var l = this.model.collection ? this.model.collection.length : 0,
            $r = this.$el.find('.levelRemove');

        $r[l > 2 ? 'show' : 'hide']();
    },


    // ************************************************
    // UI ACTIONS
    // ************************************************
    doSave: function() {
        if(this.validate()) {
            this.hideDetails('levelSave');
        }
    },

    doCancel: function() {
        // revert if we have original json
        if(this._origJson) {
            this.model.set(this._origJson);
            this.updateModelToDom(); // refresh the UI with orig vals
        }

        this.hideDetails('levelCancel');
    },

    doEdit: function(e) {
        // save a copy of original state, if cancel we will use it
        this._origJson = this.model.toJSON();
        this.displayDetails();
    },

    doRemove: function(e) {
        var that = this,
            $tar = $(e.target),
            $tip = this.$el.closest('.levels').find('.levelRemoveDialog');

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

    doBadgeChange: function(badgeModel) {
        this.model.set('badgeId', badgeModel.get('id'));
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
        this.trigger('inputsChange');
    },

    // for inputs that should only have whole numbers
    doCleanWholeNumbers: function(e) {
        var $tar = $(e.currentTarget),
            n = parseInt($tar.val(),10); // parseInt will round the number

        if(n) { // could be NaN
            $tar.val(n);
        } else { // clear it
            $tar.val('');
        }
    },

    displayDetails: function(triggerName) {
        var that = this;

        this.$el.find('.levelHeaders').slideUp(G5.props.ANIMATION_DURATION);

        this.$el.find('.levelDetails').slideDown(G5.props.ANIMATION_DURATION, function() {
            that.trigger('end:displayDetails', that);

            if( triggerName ) {
                that.trigger(triggerName, that);
            }
        });
    },

    hideDetails: function(triggerName) {
        var that = this;

        this.$el.find('.levelHeaders').slideDown(G5.props.ANIMATION_DURATION);

        this.$el.find('.levelDetails').slideUp(G5.props.ANIMATION_DURATION, function() {
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
            this.trigger('levelEditStarted');
            // will save to server, and trigger success:update
            this.model.save();
        }
    },

    handleModelSaveExisting: function() {
        this.trigger('levelEdited');
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
        //this.setTotals();

        //TODO: Check what this is and if it can be removed.
    },

    handleEstimatesChange: function() {
        this.updateEstimates();
    },

    handlePayoutTypeChange: function() {
        this.model.setPayoutType(this.contMod.get('payoutType'));
        this.updatePayoutType();
        this.updateModelToDom();
        this.updateCurrency();
    },

    handleMeasureTypeChange: function() {
        this.model.setMeasureType(this.contMod.get('measureType'));
        this.updateModelToDom();
    },

    handleMeasureOverBaselineChange: function() {
        this.updateModelToDom();
    },

    handleRemoveSuccess: function() {
        var that = this,
            col = that.model.collection;

        this.$el.slideUp(G5.props.ANIMATION_DURATION, function() {
            // remove from collection
            col.remove(that.model);
            that.destroy();
        });
    },

    handleCollectionLengthChange: function() {
        this.updateModelToDom();
        this.updateRemoveControl();
    },

    handleAmountRemoveByOrderChange: function() {
        this.updateModelToDom();
    },


    // ************************************************
    // UTIL/MISC
    // ************************************************
    validate: function() {
        var errBoxShown = false,
            mt = this.contMod.get('measureType'),
            mtPrec = mt == 'currency' ? 2 : 4,
            that = this,
            mob = this.contMod.get('measureOverBaseline'),
            $amt, $pay;

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
            if(k == 'payoutDescription') {
                if( !v ) {
                    errF($t, 'req');
                }
            }
            // numbers
            else {
                // decimal, negative, 2 or 4 decimal places (dep on measureType)
                if(k == 'amount') {
                    if(mob == 'percent') {
                        if(!G5.util.validation.isNum(v, 'natural', 0, false)) {
                            errF($t, 'reqNum');
                        }
                    } else {
                        if(mt == 'currency') {
                            if(!G5.util.validation.isNum(v, 'decimal', mtPrec, false /* allowNegs */)) {
                                errF($t, 'reqDec_pos_'+mtPrec);
                            }
                        } else {
                            if(!G5.util.validation.isNum(v, 'decimal', mtPrec, true /* allowNegs */)) {
                                errF($t, 'reqDec_'+mtPrec);
                            }
                        }
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

        // validate activity values (must be asc or desc in value - infer after two levels)
        if(!this.model.isAmountValid()) {
            $amt = this.$el.find('input[data-model-key=amount]:visible');
            $amt.addClass('hasError');

            if(!errBoxShown) {
                that.errorTip('amountOutOfOrder', $amt);
                errBoxShown = true;
            }
        }

        // validate payout (must be ascending in size)
        if(!this.model.isPayoutValid()) {
            $pay = this.$el.find('input[data-model-key=payout]:visible');
            $pay.addClass('hasError');

            if(!errBoxShown) {
                that.errorTip('payoutOutOfOrder', $pay);
                errBoxShown = true;
            }
        }

        return !errBoxShown;
    },

    // mask click only happens when the active material item needs confirmation to save
    showMustSaveTip: function(e) {
        var jostle,
            $btn = this.$el.find('.saveLevelBtn:visible');

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
        var msg = this.$el.find('.ssiSiuLevelModelViewErrorMsgs .'+msgClass).text(),
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
        var mob = this.contMod.get('measureOverBaseline');

        if(key == 'amount' && mob != 'no') {
            key = key+'_'+mob;
        }

        return this.contMod.formatNumberForKey(num, key);
    }

});
