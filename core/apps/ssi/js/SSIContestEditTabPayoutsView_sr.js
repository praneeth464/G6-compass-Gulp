/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
BadgesSelectorView,
SSIContestEditTabPayoutsView_sr:true
*/
SSIContestEditTabPayoutsView_sr = Backbone.View.extend({

    initialize: function(opts) {
        var that = this;

        // fe dev uses this
        this.tplPath = './../apps/ssi/tpl/';
        this.tplName = 'ssiContestEditTabPayoutsViewSR';

        // SSIContestPageEditView parent container for this tab
        this.containerView = opts.containerView;
        // shortcut to contest model
        this.contMod = this.containerView.contestModel;

        // this is the one event we need to wire up in initialize()
        this.contMod.on('success:fetchPayoutData_sr', this.handleFetchPayoutData, this);

        // ranks
        this.ranksCollection = new Backbone.Collection();
        this._newRankIds = 0;
    },

    events: {
        "click .rankRow .removeControl": "doRemRank",
        "click .addRankBtn": "doAddRank",
        "keyup .rankRowAutoBind": "doRankRowAutoBindKeyup",
        "keyup .contestGoalInput": "validateNumericInput",
        "keyup .payoutAmount": "doPayoutAmountKeyup",
        "blur .payoutAmount": "doPayoutAmountBlur"
    },

    setupEvents: function() {

        // flag it for tab reruns -- you think its gross? well, you're gross!
        if(this._eventsSetupAlready) { return; }

        this._eventsSetupAlready = true;

        this.ranksCollection.on('add', this.handleRankAdd, this);
        this.ranksCollection.on('remove', this.handleRankRem, this);

        this.ranksCollection.on('change', this.handleRanksChange, this);

        this.contMod.on('change:measureType', this.handleMeasureTypeChange, this);
        this.contMod.on('change:payoutType', this.handlePayoutTypeChange, this);
        this.contMod.on('change:payoutType', this.containerView.updateBillTo, this.containerView);
        this.contMod.on('change:currencyTypeId', this.updateCurrencyDisp, this);
        this.contMod.on('change:otherPayoutTypeId', this.updateCurrencyDisp, this);
        this.contMod.on('change:includeMinimumQualifier', this.updateMinQual, this);
    },


    /* **************************************************
        UI Update/Render
    ***************************************************** */
    render: function(forceRender) {
        var that = this;

        if( !forceRender && (this._isRendered || this._isRendering) ) { return; }

        this._isRendering = true;

        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            that.$el.empty();
            that.subTpls = subTpls;

            that.$el.append(tpl({}));
            that.renderCurrencyAndOtherSelects();

            that._isRendered = true;
            delete that._isRendering;

            that.update();
        }, this.tplPath);
    },

    update: function(forceRender) {
        if(!this._isRendered || forceRender) { this.render(forceRender); return; }

        var cm = this.contMod,
            mt = cm.get('measureType'),
            pt = cm.get('payoutType'),
            sro = cm.get('stackRankingOrder'),
            mq = cm.get('includeMinimumQualifier');

        // Set the name in UI
        this.$el.find('.defaultName').text(cm.getDefaultTranslationByName('names').text);

        // set the level measure
        this.$el.find('[name=measureType][value='+mt+']').prop('checked', true);

        // set the payout type
        this.$el.find('[name=payoutType][value='+pt+']').prop('checked', true);

        // set include minimum qualifier
        this.$el.find('[name=includeMinimumQualifier][value='+mq+']').prop('checked', true);

        // set the order
        this.$el.find('[name=stackRankingOrder][value='+sro+']').prop('checked', true);

        // auto-pop all input-text
        this.$el.find('input[type=text][data-model-key].autoBind').each(function(){
            var $t = $(this),
                k = $t.data('modelKey'),
                v = cm.get(k);
            $t.val(v||'');
        });

        this.updateCurrTypeSel();
        this.updateOtherPayoutTypeSel();
        this.updateTotalsAndMaxes();
        this.updateRanks();
        this.updateMinQual();

        this.containerView.updatePayoutTypeVisibility();
        this.containerView.updateBillTo();
    },

    renderCurrencyAndOtherSelects: function() {
        var cm = this.contMod,
            ren = this.subTpls.currencyTypeOptions({"currencyTypes": cm.get('currencyTypes')}),
            $cts = this.$el.find('#currencyTypeSelect'),
            $opt = this.$el.find('#otherPayoutTypeSelect');

        // both selects share the same data
        $cts.empty().append(ren);
        $opt.empty().append(ren);
    },

    updateMinQual: function() {
        var mq = this.contMod.get('minimumQualifier'),
            imq = this.contMod.get('includeMinimumQualifier'),
            $mqw = this.$el.find('.minimumQualifierWrap'),
            $mq = this.$el.find('.minimumQualifierInput');

        if(imq == 'yes') {
            $mqw.slideDown();
        } else {
            $mqw.slideUp();
        }

        if($mq.val() !== mq) {
            $mq.val(mq);
        }
    },

    updateCurrTypeSel: function() {
        var mt = this.contMod.get('measureType'),
            ct = this.contMod.get('currencyTypeId'),
            $ctw = this.$el.find('.currencyTypeWrapper'),
            $cts = this.$el.find('#currencyTypeSelect');

        // show/hide the currency type dropdown
        if(mt === 'currency') {
            $ctw.show();
        } else {
            $ctw.hide();
        }

        // sync val if needed
        if(ct+'' !== $cts.val()+'') {
            $cts.find('option[value='+ct+']').prop('selected', true);
        }

        this.updateCurrencyDisp();
    },

    updateOtherPayoutTypeSel: function() {
        var pt = this.contMod.get('payoutType'),
            mt = this.contMod.get('measureType'),
            opt = this.contMod.get('otherPayoutTypeId'),
            $optw = this.$el.find('.otherPayoutTypeWrapper'),
            $opts = this.$el.find('#otherPayoutTypeSelect');

        // show/hide the currency type dropdown
        if(mt == 'currency' || pt != 'other') {
            $optw.slideUp();
        } else {
            $optw.slideDown();
        }

        // sync val if needed
        if(pt+'' !== $opts.val()+'') {
            $opts.find('option[value='+opt+']').prop('selected', true);
        }

        this.updateCurrencyDisp();
    },

    updateCurrencyDisp: function() {
        var ptCur = this.contMod.getActiveOtherCurrencyType(),
            mtCur = this.contMod.getActiveCurrencyType(),
            unitsMsg = this.$el.find('#_msgUnits').text(),
            pointsMsg = this.$el.find('#_msgPoints').text(),
            curObj = null;

        curObj = {
            activity: {
                symbol: mtCur ? mtCur.symbol : '' ,
                symbolMax: mtCur ? mtCur.symbol : '' ,
                display: mtCur ? '' : unitsMsg,
                displayMax: mtCur ? '' : unitsMsg,
                symbolAfter: ''
            },
            payout: {
                symbol: ptCur ? ptCur.symbol : '' ,
                display: ptCur ? '' : pointsMsg
            }
        };

        this.$el.find('.currSymb.act').text(curObj.activity.symbol);
        this.$el.find('.currDisp.act').text(curObj.activity.display);

        this.$el.find('.currSymb.pay').text(curObj.payout.symbol);
        this.$el.find('.currDisp.pay').text(curObj.payout.display);
    },

    // update table total and maximum numbers
    updateTotalsAndMaxes: function() {
        var rc = this.ranksCollection,
            maxPay = 0;

        rc.each( function(r) {
            var pay = parseInt(r.get('payoutAmount'), 10); // wholenums
            maxPay += pay;
        });

        this.$el.find('.calcTotals[data-model-key=maxPayout]').text(maxPay === 0 ? '--' : this.fmt(maxPay, 'maxPayout'));
    },

    updateRanks: function(rankToRem, isAdd) {
        var $t = this.$el.find('.ranksTable'),
            $noRanks = $t.find('.msgNoRanks'),
            rs = this.ranksCollection.toJSON(),
            paxCnt = this.contMod.get('participantCount'),
            that = this;

        // no ranks state
        $noRanks[rs.length ? 'hide' : 'show']();
        $t.find('thead')[rs.length ? 'show' : 'hide']();

        // max ranks
        $t.find('.addRankBtn')[ paxCnt <= rs.length ? 'attr' : 'removeAttr']('disabled', 'disabled');

        // badge header?
        if(!this.hasBadges()) {
            this.$el.find('.badgeTableHeader').hide();
        }

        // render as necessary
        _.each(rs, function(r) {
            r.hasBadges = that.hasBadges();
            if(!$t.find('tr.rankRow'+r.id).length) {
                that.renderRank(r);
            }
        });

        // DOM removes
        if(rankToRem) {
            $t.find('tr.rankRow'+rankToRem.get('id')).remove();
        }

        this.updateRanksExtra();

        // update rank nums unilaterally
        $t.find('tbody tr.rankRow').each( function(i) {
            var mid = $(this).data('modelId');
            $(this).find('.rankNum').text(i+1);
            that.ranksCollection.get(mid).set('rank', i+1);
        });

        // if its an add, assume the last item was added, and focus on its first input
        if(isAdd) {
            this.$el.find('.ranksTable .rankRow:last input[type="text"]:visible:first').focus();
        }
    },

    updateRanksExtra: function() {
        var isOther = this.contMod.get('payoutType') == 'other';

        this.$el.find('.ranksTable .showOnOther')[isOther ? 'show' : 'hide']();
        this.$el.find('.ranksTable .hideOnOther')[isOther ? 'hide' : 'show']();

        if(!isOther) {
            this.$el.find('.ranksTable input.payoutDescription').val('');
            this.ranksCollection.each( function(r){ r.set('payoutDescription', ''); });
        }
    },

    renderRank: function(r) {
        var rowTpl = this.subTpls.rankRow,
            $t = this.$el.find('.ranksTable'),
            $ren = $(rowTpl(r));

        $t.find('tbody tr').last().after($ren);
        this.renderBadge($ren, r);
    },

    renderBadge: function($rank, rank) {
        if(!this.hasBadges()) { return; }

        var $bv = $rank.find('.badgeView'),
            badges = this.contMod.get('badges'),
            bsv = null,
            that = this;

        // badges required yo
        if(!badges || !badges.length) {
            console.error('[ERROR] ssiContestEditTabPayoutsViewSR.renderBadge' +
                ' - no badges found in ContestModel');
            return;
        }

        // badges widget
        bsv = new BadgesSelectorView({
            el: $bv,
            collection: new Backbone.Collection(badges),
            selectedBadgeId: rank.badgeId
        });
        // store a pointer to this gentleman
        $rank.data('badgesSelectorView', bsv);

        bsv.on('badgeChanged', function(badgeModel) {
            that.ranksCollection.get(rank.id).set('badgeId', badgeModel.get('id'));
        }, this);
    },


    /* **************************************************
        UI Actions - clicks etc.
    ***************************************************** */
    doAddRank: function() {
        this.ranksCollection.add({id: 'newRank' + this._newRankIds++});
    },

    doRemRank: function(e) {
        var $tar = $(e.target),
            id = $tar.data('modelId');

        this.ranksCollection.remove(id);
    },

    doPayoutAmountKeyup: function(e) {
        this.updateTotalsAndMaxes();
    },

    doPayoutAmountBlur: function(e) {
        var $tar = $(e.target),
            id = $tar.data('modelId'),
            k = $tar.data('modelKey'),
            v = $tar.val();

        // pull out integer, make it positive
        v = Math.abs(parseInt(v, 10));
        // make sure it was a number
        v = _.isNaN(v) ? '' : v;
        // if our clean number differs from current DOM INPUT val, change it to clean val
        if(v+'' != $tar.val()) {
            $tar.val(v);
        }
        // set the clean value in our model
        this.ranksCollection.get(id).set(k, v);
        // update maximum payout
        this.updateTotalsAndMaxes();
    },

    doRankRowAutoBindKeyup: function(e) {
        var $tar = $(e.target),
            id = $tar.data('modelId'),
            k = $tar.data('modelKey'),
            v = $tar.val();

        this.ranksCollection.get(id).set(k, v);
    },

    // here we wait until keyup, when the full val string is present, if it doesn't match,
    // we set the value back to the last match or an empty string
    validateNumericInput: function(e) {
        // ^-?(\d{1,9})?(\.\d{0,4})?$
        var $tar = $(e.target),
            v = $tar.val(),
            decPlaces = this.contMod.get('measureType') == 'currency' ? '2' : '4',
            reStr = "^-?(\\d{1,9})?(\\.\\d{0,"+(decPlaces)+"})?$",
            regEx = new RegExp(reStr);

        if(!regEx.test(v)) {
            // if not matching our regex, then set the value back to what it was
            // or empty string if no last val
            $tar.val($tar.data('lastVal') || '');
        } else {
            // store this passing value, we will use this to reset the field
            // if a new value doesn't match
            $tar.data('lastVal', v);
        }

    },


    /* **************************************************
        Handlers - what to do when contestModel changes
    ***************************************************** */
    handleFetchPayoutData: function(res) {
        if(res && res.contestJson && res.contestJson.ranks) {
            this.ranksCollection.reset(res.contestJson.ranks);
        }
        this.setupEvents();
        this.update(true/*forceFullRender*/); // update will call render() if needed
    },

    handleMeasureTypeChange: function() {
        this.updateCurrTypeSel();
        this.updateOtherPayoutTypeSel();
    },

    handlePayoutTypeChange: function() {
        this.updateOtherPayoutTypeSel();
        this.updateTotalsAndMaxes();
        this.updateRanksExtra();
    },

    handleRankAdd: function(r) {
        this.updateRanks(null, true /*isAdd*/);
        this.updateTotalsAndMaxes();
    },

    handleRankRem: function(r) {
        this.updateRanks(r/* rankToRem */);
        this.updateTotalsAndMaxes();
        this.contMod.set('ranks', this.ranksCollection.toJSON());
    },

    /**
     * take the SR collection and copy to SSIContestModel,
     * so when save or saveAsDraft happens it will send updated ranks
     */
    handleRanksChange: function() {
        this.contMod.set('ranks', this.ranksCollection.toJSON());
    },


    /* **************************************************
        TAB FUNCTIONS - ContestEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        // fetch payout data (step specific)
        this.contMod.fetchPayoutData_sr();
    },

    isThisTabActive: function() {
        return this.containerView.wizTabs.getActiveTab().get('name') == 'stepPayouts';
    },

    // validate the state of elements within this tab
    validate: function() {
        var ranks = this.ranksCollection.toJSON(),
            imq = this.contMod.get('includeMinimumQualifier'),
            mq = this.contMod.get('minimumQualifier'),
            decPlaces = this.contMod.get('measureType') == 'units' ? 4 : 2,
            pt = this.contMod.get('payoutType'),
            ok = true,
            that = this;

        if(!this.contMod.get('activityDescription')) {
            return { msgClass: 'msgSIUActivityDescReq', valid: false };
        }

        if(!this.contMod.get('measureType')) {
            return { msgClass: 'msgActivityTypeReq', valid: false };
        }

        if(!this.contMod.get('includeMinimumQualifier')) {
            return { msgClass: 'msgSRMinQualReq', valid: false };
        }
        if( imq == 'yes' && ( (!mq && mq !== 0) || !G5.util.validation.isNum(mq, 'decimal', decPlaces, true/* allowNegs */, true /* allowZero */)) ) {
            return { msgClass: 'msgSRMinQualNumReq', valid: false };
        }

        if(!this.contMod.get('payoutType')) {
            return { msgClass: 'msgPayoutTypeReq', valid: false };
        }

        if(!this.contMod.get('stackRankingOrder')) {
            return { msgClass: 'msgSROrderReq', valid: false };
        }

        if(ranks.length < 1) {
            return { msgClass: 'msgSRRankReq', valid: false };
        }

        // when payoutType  is other, descriptions get cleared from ranks
        _.each(ranks, function(r) {
            if(pt == 'other') {
                ok = ok && r.payoutDescription;
            }
            // must have payout amount and it should be > 1, whole and positive
            ok = ok && r.payoutAmount && G5.util.validation.isNum(r.payoutAmount, 'natural', 0, false);
            // TODO: if a badge selection is required, check for that here
        });

        if(!ok) {
            return { msgClass: 'msgSRRankDataReq', valid: false };
        }

        // make sure payoutAmount is legit
        _.each(ranks, function(r) {
            ok = ok && that.contMod.validateNumberMax(r.payoutAmount);
        });

        if(!ok) {
            return { msgClass: 'msgSRRankPayoutAmountIssue', valid: false };
        }

        if( !this.contMod.validateContestGoal() ) {
            return { msgClass: 'msgContestGoalReq', valid: false };
        }

        // billCode stuff
        if(!this.contMod.validateBillTo()) {
            return { msgClass: 'msgBillToDataReq', valid: false };
        }

        if(!this.contMod.validateBillToCode()) {
            return { msgClass: 'msgBillToCodeReq', valid: false };
        }


        return { valid: true };
    },


    /* **************************************************
        UTIL
    ***************************************************** */
    hasBadges: function() {
        var badges = this.contMod.get('badges');
        return badges && badges.length ? true : false; // if null or empty, then NOPE!
    },

    // number format
    fmt: function(num, key) {
        if(_.isNaN(num)) { return '--'; }
        return this.contMod.formatNumberForKey(num, key);
    }

});
