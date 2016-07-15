/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
SSIDTGTActivityCollectionView,
SSIDTGTActivityModelView,
SSIContestEditTabPayoutsView_dtgt:true
*/
SSIContestEditTabPayoutsView_dtgt = Backbone.View.extend({

    initialize: function(opts) {
        var that = this;

        // fe dev uses this
        this.tplPath = './../apps/ssi/tpl/';
        this.tplName = 'ssiContestEditTabPayoutsViewDTGT';

        // SSIContestPageEditView parent container for this tab
        this.containerView = opts.containerView;
        // shortcut to contest model
        this.contMod = this.containerView.contestModel;

        this.setupEvents();

    },

    setupEvents: function() {
        this.contMod.on('success:fetchPayoutData_dtgt', this.handleFetchPayoutData, this);
        this.contMod.on('change:measureType', this.updateCurrTypeSel, this);
        this.contMod.on('change:measureType', this.updateOtherPayoutTypeSel, this);
        this.contMod.on('change:measureType', this.updateLockPageBottom, this);
        this.contMod.on('change:payoutType', this.updateOtherPayoutTypeSel, this);
        this.contMod.on('change:payoutType', this.updateLockPageBottom, this);
        this.contMod.on('change:payoutType', this.containerView.updateBillTo, this.containerView);
        this.contMod.on('change:currencyTypeId', this.updateCurrencyDisp, this);
        this.contMod.on('change:otherPayoutTypeId', this.updateCurrencyDisp, this);
    },


    /* **************************************************
        UI Update/Render
    ***************************************************** */
    render: function() {
        var that = this;

        if(this._isRendered||this._isRendering) { return; }
        this._isRendering = true;

        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            that.subTpls = subTpls;
            that.$el.append(tpl({}));
            that.initActivitiesCollectionView();
            that.renderCurrencyAndOtherSelects();
            that._isRendered = true;
            delete that._isRendering;
            that.update();
        }, this.tplPath);
    },

    // this init function is a bit gross, but the Activities views are less gross. :)
    initActivitiesCollectionView: function() {
        var $w = null,
            acvTplName = SSIDTGTActivityCollectionView.prototype.tplName,
            acvTplPath = SSIDTGTActivityCollectionView.prototype.tplPath,
            amvTplName = SSIDTGTActivityModelView.prototype.tplName,
            amvTplPath = SSIDTGTActivityModelView.prototype.tplPath,
            that = this;

        // get collection tpl
        if(!this._acvTpl) {
            // here we are actual loading the template for the Collection View
            // in the containing element to simplify the render() function of the Coll. View
            TemplateManager.get(acvTplName, function(tpl, vars, subTpls) {
                that._acvTpl = { tpl: tpl, subTpls: subTpls };
                that.initActivitiesCollectionView(); // try again
            }, acvTplPath);
        }

        // get model tpl
        if(!this._amvTpl) {
            // here we are actual loading the template for the Model View
            // in the containing element to simplify the render() function of the Coll. View
            TemplateManager.get(amvTplName, function(tpl, vars, subTpls) {
                that._amvTpl = { tpl: tpl, subTpls: subTpls };
                that.initActivitiesCollectionView(); // try again
            }, acvTplPath); //TODO check this variable, might be incorrect

        }


        // render and attach
        if(this._amvTpl&&this._acvTpl&&!this._isInitAcv) {

            this._isInitAcv = true; // flag this

            $w = this.$el.find('#ssiDTGTActivityCollectionViewWrapper');

            // create the view
            this.activityCollectionView = new SSIDTGTActivityCollectionView({
                tpl: this._acvTpl.tpl,
                subTpls: this._acvTpl.subTpls,
                modelTpl: this._amvTpl.tpl,
                modelSubTpls: this._amvTpl.subTpls,
                activitiesJson: this.contMod.get('activities'),
                contestModel: this.contMod
            });

            // render and attach
            $w.append(that.activityCollectionView.render());

            // update currency display
            this.updateCurrencyDisp();
        }

    },

    update: function() {
        if(!this._isRendered) { this.render(); return; }

        var cm = this.contMod,
            mt = cm.get('measureType'),
            pt = cm.get('payoutType'),
            isr = cm.get('includeStackRanking'),
            sro = cm.get('stackRankingOrder'),
            ib = cm.get('includeBonus');

        // Set the name in UI
        this.$el.find('.defaultName').text(cm.getDefaultTranslationByName('names').text);

        // set the activity measure
        this.$el.find('[name=measureType][value='+mt+']').prop('checked', true);

        // set the payout type
        this.$el.find('[name=payoutType][value='+pt+']').prop('checked', true);

        // set the include stack ranking checkbox
        this.$el.find('[name=includeStackRanking]').prop('checked', isr);

        // set the stack ranking order radio
        this.$el.find('[name=stackRankingOrder][value='+sro+']').prop('checked', true);

        // set the include bonus checkbox
        this.$el.find('[name=includeBonus]').prop('checked', ib);

        this.updateCurrTypeSel();
        this.updateOtherPayoutTypeSel();
        this.updateLockPageBottom();

        this.updateFieldDisablement();

        this.containerView.updatePayoutTypeVisibility();
        this.containerView.updateBillTo();
    },

    updateLockPageBottom: function() {
        if(!this.isThisTabActive()) {return;}

        var $lpb = this.$el.find('#_msgLockPageBottom'),
            msg,
            $lockAfter = this.$el.find('.includeStackRankingWrapper');

        if(!$lpb.length || !$lockAfter.length) {return;}

        msg = $lpb.html();

        if(!this.contMod.get('measureType') || !this.contMod.get('payoutType')) {
            this.containerView.lockPageAfter($lockAfter, msg);
        } else {
            this.containerView.unlockPageAfter();
        }
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
        var pt = this.contMod.get('payoutType'), // other - units
            mt = this.contMod.get('measureType'), // act - points
            ptCur = this.contMod.getActiveOtherCurrencyType(),
            mtCur = this.contMod.getActiveCurrencyType(),
            unitsMsg = this.$el.find('#_msgUnits').text(),
            pointsMsg = this.$el.find('#_msgPoints').text();

        if(!this.activityCollectionView||!pt||!mt) {
            return;
        }

        //set currency display
        this.activityCollectionView.setCurrency({
            activity: {
                symbol: mtCur ? mtCur.symbol : '' ,
                display: mtCur ? '' : unitsMsg
            },
            payout: {
                symbol: ptCur ? ptCur.symbol : '' ,
                display: ptCur ? '' : pointsMsg
            }
        });
    },

    // disable some fields depending on contest status
    updateFieldDisablement: function() {
        var cm = this.contMod,
            s = cm.get('status'),
            d = _.bind( function(s) {
                    return this.$el.find(s).prop('disabled','disabled');
                }, this);

        if(s == cm.STATUSES.LIVE) {
            // payout type
            d('.payoutTypeRadio').closest('.validateme').removeClass('validateme');
            // currency
            d('#otherPayoutTypeSelect');
        }
    },


    /* **************************************************
        Handlers - what to do when contestModel changes
    ***************************************************** */
    handleFetchPayoutData: function() {
        this.update(); // update will call render() if needed
    },


    /* **************************************************
        TAB FUNCTIONS - ContestEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        // fetch payout data (step specific)
        this.contMod.fetchPayoutData_dtgt();
    },

    leaveTab: function() {
        this.containerView.unlockPageAfter();
    },

    isThisTabActive: function() {
        return this.containerView.wizTabs.getActiveTab().get('name') == 'stepPayouts';
    },

    // validate the state of elements within this tab
    validate: function() {
        var ok = true;

        if(!this.contMod.get('measureType')) {
            return { msgClass: 'msgActivityTypeReq', valid: false };
        }

        if(!this.contMod.get('payoutType')) {
            return { msgClass: 'msgPayoutTypeReq', valid: false };
        }

        if(!this.contMod.get('activities').length) {
            return { msgClass: 'msgDTGTActivityReq', valid: false };
        }

        if(this.contMod.get('payoutType') == 'other') {
            this.activityCollectionView.activities.each(function(a){
                ok = ok && a.get('valueDescription');
            });
            if(!ok) {
                return { msgClass: 'msgDTGTActivityMissingValDesc', valid: false };
            }
        }

        if(!this.contMod.validateBillTo()) {
            return { msgClass: 'msgBillToDataReq', valid: false };
        }

        if(!this.contMod.validateBillToCode()) {
            return { msgClass: 'msgBillToCodeReq', valid: false };
        }


        return { valid: true };
    }

});
