/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
ParticipantPaginatedView,
SSIContestModel,
SSISIULevelModelView,
SSISIULevelCollectionView,
SSIContestEditTabPayoutsView_siu:true
*/
SSIContestEditTabPayoutsView_siu = Backbone.View.extend({

    POST_METHODS: {
        SAVE: 'save', // server: no data response + validate all pax data filled (next/back/tab)
        SAVE_AS_DRAFT: 'saveAsDraft', // server save data + no full pax data validation
        LOAD: 'load', // server: no save, respond with default pax data list
        PAX_NAV: 'paxNav', // server: save all, respond with apropo page of pax data
        CALC_TOTAL: 'calcTotal', // server: respond with totals only, validate for full pax data
        UPDATE_PAYOUT: 'updatePayout', // server will potentially clear certain fields, and return the first page of pax in def sort
        UPDATE_BASELINE: 'updateBaseline', // if baseline, then server will send first page of data, no, then pax data will be removed
        SAME_FOR_ALL: 'sameForAll' // notify server that same for all was clicked with key/value pair
    },

    initialize: function(opts) {
        var that = this;

        // fe dev uses this
        this.tplPath = './../apps/ssi/tpl/';
        this.tplName = 'ssiContestEditTabPayoutsViewSIU';

        // SSIContestPageEditView parent container for this tab
        this.containerView = opts.containerView;
        // shortcut to contest model
        this.contMod = this.containerView.contestModel;

        // this is the one event we need to wire up in initialize()
        this.contMod.on('success:fetchPayoutData_siu', this.handleFetchPayoutData, this);
    },

    events: {
        "keyup input.paxDatBaseline": "doPaxTableBaselineKeyup",

        'focus .textInputCell .paxDatTextInput': 'doShowSameForAllTip',
        'blur .textInputCell .paxDatTextInput': 'doHideSameForAllTip',
        'click .sameForAllTip a': 'doSameForAllClick',

        'click .calculateTotalsBtn': 'doCalcTotalsClick',

        'keyup .contestGoalInput': 'doGoalInputChange',
        'blur .contestGoalInput': 'doGoalInputChange'
    },

    setupEvents: function() {

        // flag it for tab reruns -- you think its gross? well, you're gross!
        if(this._eventsSetupAlready) { return; }
        this._eventsSetupAlready = true;

        this.contMod.on('success:ajaxPayoutStepSiU', this.handleAjaxPayoutStepSiUSuccess, this);
        this.contMod.on('start:ajaxPayoutStepSiU', this.handleAjaxPayoutStepSiUStart, this);
        this.contMod.on('end:ajaxPayoutStepSiU', this.handleAjaxPayoutStepSiUEnd, this);
        this.contMod.on('error:ajaxPayoutStepSiU', this.handleAjaxPayoutStepSiUError, this);

        this.contMod.on('change:measureType', this.handleMeasureTypeChange, this);
        this.contMod.on('change:measureOverBaseline', this.handleMeasureOverBaselineChange, this);
        this.contMod.on('change:payoutType', this.handlePayoutTypeChange, this);
        this.contMod.on('change:payoutType', this.containerView.updateBillTo, this.containerView);
        this.contMod.on('change:currencyTypeId', this.updateCurrencyDisp, this);
        this.contMod.on('change:otherPayoutTypeId', this.updateCurrencyDisp, this);
        this.contMod.on('change:includeBonus', this.handleBonusChange, this);
        this.contMod.on('change:levels', this.handleLevelsChange, this);

        this.contMod.on('change:bonusPayoutCap', this.handleBonusPayoutCapChange, this);
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
            that.initLevelsCollectionView();
            that.initPaxTable();
            that.renderCurrencyAndOtherSelects();
            that._isRendered = true;
            delete that._isRendering;
            that.update();
        }, this.tplPath);
    },

    // this init function is a bit gross, but the Levels views are less gross. :)
    initLevelsCollectionView: function() {
        var $w = null,
            lcvTplName = SSISIULevelCollectionView.prototype.tplName,
            lcvTplPath = SSISIULevelCollectionView.prototype.tplPath,
            lmvTplName = SSISIULevelModelView.prototype.tplName,
            lmvTplPath = SSISIULevelModelView.prototype.tplPath,
            that = this;

        // get collection tpl
        if(!this._lcvTpl) {
            // here we are actual loading the template for the Collection View
            // in the containing element to simplify the render() function of the Coll. View
            TemplateManager.get(lcvTplName, function(tpl, vars, subTpls) {
                that._lcvTpl = { tpl: tpl, subTpls: subTpls };
                that.initLevelsCollectionView(); // try again
            }, lcvTplPath);
        }

        // get model tpl
        if(!this._lmvTpl) {
            // here we are actual loading the template for the Model View
            // in the containing element to simplify the render() function of the Coll. View
            TemplateManager.get(lmvTplName, function(tpl, vars, subTpls) {
                that._lmvTpl = { tpl: tpl, subTpls: subTpls };
                that.initLevelsCollectionView(); // try again
            }, lcvTplPath);//TODO: check variable name, might be incorrect
        }


        // render and attach
        if(this._lmvTpl&&this._lcvTpl&&!this._isInitLcv) {

            this._isInitLcv = true; // flag this

            $w = this.$el.find('#ssiSIULevelCollectionViewWrapper');

            // create the view
            this.levelCollectionView = new SSISIULevelCollectionView({
                tpl: this._lcvTpl.tpl,
                subTpls: this._lcvTpl.subTpls,
                modelTpl: this._lmvTpl.tpl,
                modelSubTpls: this._lmvTpl.subTpls,
                levelsJson: this.contMod.get('levels'),
                contestModel: this.contMod
            });

            // render and attach
            $w.append(that.levelCollectionView.render());

            // update currency display
            this.updateCurrencyDisp();

            // update totals (these function depend on this view)
            this.updateTotalsAndMaxes();
            this.updateEstimatedTotals();
            this.updateHighestLevelText();
        }

    },

    // pax table is for BASELINEs only
    initPaxTable: function() {
        var cm = this.contMod;

        this.paxPaginatedView = new ParticipantPaginatedView({
            el: this.$el.find('#ssiParticipantsSiU'),
            suppressAjax: true,
            tplName: "ssiContestEditTabPayoutsViewSIUPaxTable",
            tplUrl: G5.props.URL_APPS_ROOT + 'ssi/tpl/',
            delayFetch: true,// manually call the initial AJAX load of paxes
            // this function mixes information from this view with the
            // pagination view to validate all fields before they are
            // sent to the server
            validateBeforeFetch: function(paxes) {
                var res = {isValid: true, errors: []},
                    reqs = ['baselineAmount'];

                if( paxes.length === 0 ) { return res; }

                // record missing fields in error objects
                paxes.each(function(p) {
                    _.each(reqs, function(req) {
                        if(!p.get(req)) {
                            res.isValid = false;
                            res.errors.push({
                                pax: p,
                                field: req,
                                errorType: 'required'
                            });
                        }
                    });
                });

                return res;
            },

            // sindle field validation type mapping
            validationTypeByKey: function(k) {
                var mt = SSIContestModel.prototype.instance.get('measureType'),
                    mob = SSIContestModel.prototype.instance.get('measureOverBaseline');
                if(k == 'baselineAmount') {
                    if(mob == 'percent') {
                           return {type: 'natural', precision: 0, allowNegs: false};
                    }
                    return {type: 'decimal', precision: mt == 'currency' ? 2 : 4, allowNegs: true};
                }
            },

            // extra data from outside the pax paginated view
            getJsonForTemplate: function() {
                var ct = cm.get('currencyTypeId'),
                    pt = cm.get('otherPayoutTypeId'),
                    lcv = this.levelCollectionView,
                    levs = lcv ? lcv.levels.toJSON() : cm.get('levels') || {};

                levs = _.sortBy(levs, function(l) { return l.sequenceNumber; });

                return {
                    levels: levs,
                    measureCurrencyLabel: ct||false,
                    payoutCurrencyLabel: pt||false
                };
            }
        });// this.paxPaginatedView = ...

        // let's handle some shizzzzzz
        this.paxPaginatedView.on('currentPageChange', this.handlePaxNav, this);
        this.paxPaginatedView.on('sortStateChange', this.handlePaxNav, this);
        this.paxPaginatedView.on('rendered', this.handlePaxTableRender, this);

    },

    update: function() {
        if(!this._isRendered) { this.render(); return; }
        var cm = this.contMod,
            mt = cm.get('measureType'),
            mob = cm.get('measureOverBaseline'),
            pt = cm.get('payoutType'),
            isr = cm.get('includeStackRanking'),
            ib = cm.get('includeBonus');

        // Set the name in UI
        this.$el.find('.defaultName').text(cm.getDefaultTranslationByName('names').text);

        // set the level measure
        this.$el.find('[name=measureType][value='+mt+']').prop('checked', true);

        // set the measure over baseline
        this.$el.find('select[name=measureOverBaseline]').val(mob);

        // set the payout type
        this.$el.find('[name=payoutType][value='+pt+']').prop('checked', true);

        // set the include stack ranking checkbox
        this.$el.find('[name=includeStackRanking]').prop('checked', isr);

        // set the include bonus checkbox
        this.$el.find('[name=includeBonus]').prop('checked', ib);

        // set the contest goal
        this.$el.find('.contestGoalInput').val(cm.get('contestGoal')||'');

        // auto-pop all input-text
        this.$el.find('input[type=text][data-model-key].autoBind').each(function(){
            var $t = $(this),
                k = $t.data('modelKey'),
                v = cm.get(k);
            $t.val(v||'');
        });

        this.updateCurrTypeSel();
        this.updateOtherPayoutTypeSel();
        this.updateBonus();
        this.updatePaxTable();
        this.updateTotalsAndMaxes();
        this.updateEstimators();
        // don't mess with contestGoal if set
        this.updateEstimatedTotals(true /* isGoalSacred */);
        this.updateLockPageBottom();
        this.updateHighestLevelText();

        this.updateFieldDisablement();

        this.containerView.updatePayoutTypeVisibility();
        this.containerView.updateBillTo();
    },

    updateLockPageBottom: function() {
        if(!this.isThisTabActive()) {return;}
        var $lpb = this.$el.find('#_msgLockPageBottom'),
            msg,
            $lockAfter = this.$el.find('#ssiSIULevelCollectionViewWrapper');

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

    updatePaxTable: function() {
        var cm = this.contMod,
            ppv = this.paxPaginatedView,
            mob = cm.get('measureOverBaseline'),
            $noBL = this.$el.find('.hideIfNoBaseline');

        if(!ppv) { return; }

        // only if baseline is set
        if(mob && mob !== 'no' /* && mt && pt*/) {
            if(ppv.model.paxes.length === 0) {
                // send a request for first page of pax table data
                this.ajax(this.POST_METHODS.LOAD);
            }
            ppv.$el.slideDown();
            $noBL.slideDown();
        } else {
            ppv.$el.slideUp();
            $noBL.slideUp();
        }
    },

    clearPaxTable: function() {
        if(this.paxPaginatedView) {
            this.paxPaginatedView.model.paxes.reset();
        }
    },

    updatePaxTableRowCalcs: function() {
        var paxes = this.paxPaginatedView.model.paxes,
            that = this;

        paxes.each(function(p){
            that.updatePaxTableRowCalc(p.get('id'));
        });
    },

    updatePaxTableRowCalc: function(paxId) {
        var cm = this.contMod,
            $pr = this.getPaxTableRowByPaxId(paxId),
            val = parseFloat($pr.find('.paxDatBaseline').val()),
            lcv = this.levelCollectionView,
            levs = lcv ? lcv.levels.toJSON() : cm.get('levels') || {},
            mob = this.contMod.get('measureOverBaseline'),
            mt = this.contMod.get('measureType'),
            mtIsCurr = mt === 'currency',
            that = this;

        // go through levels and find apropo col to set vals
        _.each(levs, function(l) {
            var $l = $pr.find('.levelCalc.level'+l.id),
                z = mtIsCurr ? 100 : 10000,
                x;

            if(!val) {
                $l.text('--');
            } else if(mob == 'percent') {
                x = (l.amount/100)*val;
                $l.text( that.fmt( Math.round(x*z)/z + val, 'measure') );
            } else if(mob == 'currency') {
                $l.text( that.fmt(l.amount + val, 'measure') ); // the key is Val
            }
        });

    },

    getPaxTableRowByPaxId: function(paxId) {
        return this.$el.find('.paxPayoutTable tr[data-participant-id="'+paxId+'"]');
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
        this.updateBaseline();
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
            mob = this.contMod.get('measureOverBaseline'),
            ptCur = this.contMod.getActiveOtherCurrencyType(),
            mtCur = this.contMod.getActiveCurrencyType(),
            unitsMsg = this.$el.find('#_msgUnits').text(),
            pointsMsg = this.$el.find('#_msgPoints').text(),
            currencyMsg = this.$el.find('#_msgCurrency').text(),
            curObj = null;

        if(!this.levelCollectionView||!pt||!mt) {
            return;
        }

        curObj = {
            activity: {
                symbol: mtCur ? mtCur.symbol : '' ,
                symbolFoot: mtCur ? mtCur.symbol : '', // for pax table footer (totals)
                symbolMax: mtCur ? mtCur.symbol : '' ,
                display: mtCur ? '' : '',
                displayMax: mtCur ? '' : '',
                displayBonus: mtCur ? currencyMsg : unitsMsg,
                symbolAfter: ''
            },
            payout: {
                symbol: ptCur ? ptCur.symbol : '' ,
                display: ptCur ? '' : pointsMsg
            }
        };

        // make mods for baseline
        if(mob == 'percent') {
            curObj.activity.symbol = '';
            curObj.activity.symbolAfter = '%';
            curObj.activity.display = '';
        }

        //set currency display
        this.levelCollectionView.setCurrency(curObj);

        // pax table currency
        this.$el.find('.paxPayoutTable .currSymb.act').text(curObj.activity.symbol);
        this.$el.find('.paxPayoutTable .currSymbAfter.act').text(curObj.activity.symbolAfter);
        this.$el.find('.paxPayoutTable .currDisp.act').text(curObj.activity.display);
        this.$el.find('.paxPayoutTable tfoot .currSymb.act').text(curObj.activity.symbolFoot); // footer gets measure currency symb

        this.$el.find('.paxPayoutTable .currSymb.pay').text(curObj.payout.symbol);
        this.$el.find('.paxPayoutTable .currDisp.pay').text(curObj.payout.display);

        // bonus section
        this.$el.find('.includeBonusDetailsWrapper .currSymb.act').text(curObj.activity.symbol);
        this.$el.find('.includeBonusDetailsWrapper .currDisp.act').text(curObj.activity.displayBonus);
        this.$el.find('.includeBonusDetailsWrapper .currSymb.pay').text(curObj.payout.symbol);
        this.$el.find('.includeBonusDetailsWrapper .currDisp.pay').text(curObj.payout.display);

        // totals and maxes
        this.$el.find('.maxesSection .currSymb.act').text(curObj.activity.symbolMax);
        this.$el.find('.maxesSection .currDisp.act').text(curObj.activity.displayMax);

        this.$el.find('.maxesSection .currSymb.pay').text(curObj.payout.symbol);
        this.$el.find('.maxesSection .currDisp.pay').text(curObj.payout.display);

        this.$el.find('.contestEstimator .currSymb.act').text(curObj.activity.symbolMax);
        this.$el.find('.contestEstimator .currDisp.act').text(curObj.activity.displayMax);

        this.$el.find('.contestEstimator .currSymb.pay').text(curObj.payout.symbol);
        this.$el.find('.contestEstimator .currDisp.pay').text(curObj.payout.display);

    },

    updateBaseline: function() {
        var $bc = this.$el.find('.baselineControls'),
            mt = this.contMod.get('measureType');

        // init UI
        if($bc.css('visibility') == 'hidden') {

            // parse json out of the TEXT of OPTION
            // json has dif language for dif measure types
            $bc.find('option.dynLang').each(function() {
                var $this = $(this);
                $this.data('langMsgs', JSON.parse($this.text()));
                $this.text(''); // clear
            });

            if(!mt) { $bc.hide(); }
            $bc.css('visibility', 'visible');
        }

        // change lang
        if(mt) {
            $bc.show();
            $bc.find('option.dynLang').each(function() {
                var $this = $(this);
                // set apropo verbiage
                $this.text($this.data('langMsgs')[mt]);
            });
        }
    },

    updateBonus: function() {
        var ib = this.contMod.get('includeBonus'),
            isOther = this.contMod.get('payoutType') == 'other',
            isPercent = this.contMod.get('measureOverBaseline') == 'percent',
            $ibw = this.$el.find('.includeBonusWrapper'),
            $ibdw = $ibw.find('.includeBonusDetailsWrapper'),
            $ib = this.$el.find('[name=includeBonus]');

        if($ib.prop('checked') !== ib) {
            // set the include bonus checkbox
            $ib.prop('checked', ib);
        }

        // if payoutType=other OR measureOverBaseline=percent, hide, else show bonus wrapping element
        $ibw[isOther||isPercent ? 'slideUp' : 'slideDown']();

        // if payoutType!=other and measureOverBaseline!=percent and includeBonus is true, show deets else hide 'em
        if(!isOther && !isPercent) {
            $ibdw[ib ? 'slideDown' : 'slideUp']();
        }

        this.updateBonusDetails();
    },

    updateBonusDetails: function() {
        var that = this;
        // populate them
        this.$el.find('.includeBonusDetailsWrapper input[type=text][data-model-key]').each( function(){
            var $t = $(this),
                k = $t.data('modelKey'),
                v = that.contMod.get(k);
            $t.val(v||'');
        });
    },

    // update table total and maximum numbers
    updateTotalsAndMaxes: function() {
        var that = this,
            ib = this.contMod.get('includeBonus'),
            mob = this.contMod.get('measureOverBaseline'),
            paxCnt = this.contMod.get('participantCount'),
            lcv = this.levelCollectionView,
            highestLev,
            blTote = this.contMod.get('baselineTotal'),
            mt = this.contMod.get('measureType'),
            bpc = this.contMod.get('bonusPayoutCap'),
            mtIsCurr = mt === 'currency',
            z = mtIsCurr ? 100 : 10000,
            maxPay, maxBon, maxPot;

        // show hide bonus
        if(!ib) {
            this.$el.find('.maxPayoutWithBonusWrapper').hide();
        } else {
            this.$el.find('.maxPayoutWithBonusWrapper').show();
        }

        // make sure we have the levels view
        if(!lcv || lcv.levels.length === 0) { return; }

        // pax table
        if(mob != 'no' && _.isNumber(blTote) ) {
            // set baseline total
            that.$el.find('.paxPayoutTable .baselineTotal').text(this.fmt(blTote, 'amount'));
            // set level totals
            lcv.levels.each( function(l) {
                var colTote = '--';
                if(mob == 'currency') { // amount represents amount
                    colTote = blTote + (l.get('amount') * paxCnt);
                }
                if(mob == 'percent') { // amount represents percent
                    colTote = blTote + Math.round( (l.get('amount')/100) * blTote * z) / z ;
                }
                that.$el.find('.paxPayoutTable .levelTotal'+l.get('id')).text( that.fmt(colTote, 'amount') );
            });
        }

        // do calcs and display
        highestLev = lcv.levels.getHighestLevel();

        // max pay and bonus
        maxPay = paxCnt * highestLev.get('payout');
        maxBon = ib && bpc ? paxCnt * parseFloat(bpc) + maxPay : '--';

        // max potential depends on measureOverBaseline
        if(mob == 'no') { // nums come from highest level
            maxPot = paxCnt * highestLev.get('amount');
        } else { // measureOverBaseline is on
            if(mob == 'percent') {
                maxPot = Math.round(z * blTote * (highestLev.get('amount')/100)) / z + blTote ;
            }
            if(mob == 'currency') {
                maxPot = (paxCnt*highestLev.get('amount')) + blTote;
            }
        }

        this._maxPot = maxPot; // hackey way to support contestGoal based estimates (see updateEstimatedTotals)

        this.$el.find('.calcTotals[data-model-key=maxPayout]').text( this.fmt(maxPay, 'maxPayout') );
        this.$el.find('.calcTotals[data-model-key=maxPayoutWithBonus]').text( this.fmt(maxBon, 'maxPayoutWithBonus') );
        this.$el.find('.calcTotals[data-model-key=maxPotential]').text( this.fmt(maxPot, 'maxPotential') );


    },

    updateEstimatedTotals: function(goalIsSacred) {
        var that = this,
            ib = this.contMod.get('includeBonus'),
            mob = this.contMod.get('measureOverBaseline'),
            paxCnt = this.contMod.get('participantCount'),
            lcv = this.levelCollectionView,
            highestLev,
            highestEstLevRat = null,
            blTote = this.contMod.get('baselineTotal'),
            mt = this.contMod.get('measureType'),
            mtIsCurr = mt === 'currency',
            z = mtIsCurr ? 100 : 10000,
            estPay = 0, estBon = 0, estPot = 0,
            goalAsPctOfMax;

        // show hide bonus
        if(!ib) {
            this.$el.find('.estPayoutWithBonusWrapper').hide();
        } else {
            this.$el.find('.estPayoutWithBonusWrapper').show();
        }

        if(!lcv || lcv.levels.length === 0) { return; }

        // do calcs and display
        highestLev = lcv.levels.getHighestLevel();
        highestEstLevRat = that.$el.find('.slider'+highestLev.get('id')).data('slider').getValue() / 100;

        // for each level calculate and add the proper ratio based on estimate sliders
        lcv.levels.each( function(l, idx) {
            var levPay = l.get('payout'),
                levAmt = l.get('amount'), // currency style
                levRat = levAmt/100, // percent style
                estRat = that.$el.find('.slider'+l.get('id')).data('slider').getValue() / 100; // estimate ratio

            // payout not effected by measureOverBaseline
            estPay += paxCnt * levPay * estRat;

            // potential amount is effected
            if(mob == 'no') {
                estPot += paxCnt * levAmt * estRat;
            }
            if(mob == 'currency') {
                estPot += (blTote + (levAmt * paxCnt)) * estRat;
            }
            if(mob == 'percent') {
                estPot += (blTote + (blTote * levRat)) * estRat;
            }
        });

        // est pot rounding
        estPot = Math.round(estPot * z)/z;

        // bonus = numPax * individualPayoutCap * highestLevelEstimateRatio + estPay
        estBon = ib ? paxCnt * this.contMod.get('bonusPayoutCap') * highestEstLevRat + estPay : '--';

        // special case for goalIsSacred -- estimates based on the entered contestGoal instead of slider
        if(goalIsSacred && this._maxPot) {
            goalAsPctOfMax = Math.round(100 * (Math.round(this.contMod.get('contestGoal')) / Math.round(this._maxPot)));
            // TODO - not clear how to alter payout from the above number, b/c est payout could be from any level's contribution
        }


        this.$el.find('.calcTotals[data-model-key=estMaxPayout]').text( this.fmt(estPay, 'estMaxPayout') );
        this.$el.find('.calcTotals[data-model-key=estBonusPayout]').text( this.fmt(estBon, 'estBonusPayout') );
        this.$el.find('.calcTotals[data-model-key=estMaxPotential]').text( this.fmt(estPot, 'estMaxPotential') );

        // special case for goal
        // - if goal not set or not sacred
        // - if estPot is set to a legit value
        // - then set model and UI to estPot value
        if((!goalIsSacred || !this.contMod.get('contestGoal')) && !_.isNaN(estPot) && _.isNumber(estPot)) {
            this.contMod.set('contestGoal', estPot);
            this.$el.find('.contestGoalInput').val(estPot);
        }
    },

    updateEstimators: function() {
        var $estSec = this.$el.find('.contestEstimatorWrapper'),
            $estLst = $estSec.find('.estimatorsList'),
            estTpl = this.subTpls ? this.subTpls.estimator : null,
            levs = this.contMod.get('levels'),
            that = this;

        if(!levs) { return; }

        levs = _.clone(levs);

        levs.unshift({label: $estLst.data('msgNoLevel'), id: 'noLevId', isDisabled: true});

        if(estTpl) {
            // render
            $estLst.empty().append(estTpl( {levels: levs} ));


            // attach plugin
            $estLst.find('.estimateSlider').each( function(i) {
                var $t = $(this);
                $t.slider({
                    min: 0,
                    max: 100,
                    step: 1,
                    value: i === 0 ? 100 : 0,
                    tooltip: 'show',
                    formater: function(val) {
                        return val + '%';
                    }
                });
                $t.on('slide', _.throttle(that.doEstimateSlide, 100));
                $t.on('slide', _.throttle(function(){that.updateEstimatedTotals();}, 200));

                $t.on('slideStart', function(evt) {
                    $estLst.find('.estimateSlider').each( function(i) {
                        $(this).data('slider').showTooltip();
                    });
                });
                $t.on('slideStop', function(evt) {
                    $estLst.find('.estimateSlider').each( function(i) {
                        $(this).data('slider').hideTooltip();
                    });
                });

                // init nums in slider (fake a slide event)
                that.doEstimateSlide({target:$t[0], value: i===levs.length-1?100:0, isInit: true});

            });

        }

    },

    doEstimateSlide: function(evt) {
        var $s = $(evt.target),
            $sliders = $s.closest('.estimatorsList').find('.estimateSlider'),
            drainOrder,
            $noLevS = $sliders.filter('.slidernoLevId'),
            v = evt.value,
            tot = 0,
            dif,
            updSliderHandle = function($slid, val) {
                var $_sl = $slid.closest('.slider');
                $slid.data('slider').setValue(val);
                $_sl.find('.slider-handle:visible');
                $_sl.closest('.estimatorWrapper').find('.goalPercent').text('('+val+'%)');
            };

        // UPDATE UI
        updSliderHandle($s, v);

        if(evt.isInit) {
            return;
        }


        // ADJUST PERCENTS

        // get the total percent
        _.each($sliders, function(slider, i){
            var $s = $(slider);
            if($s.hasClass('slidernoLevId')) { return; }
            tot += $s.data('slider') ? $s.data('slider').getValue() : 0;
        });


        // CASE 1) TOTAL > 100: take away from sliders starting at bottom
        if(tot > 100) {
            dif = tot - 100;

            drainOrder = $sliders.get().reverse();
            drainOrder.unshift(drainOrder.pop()); // move last item to first (no level slider)

            $(drainOrder).each( function() {
                var $t = $(this),
                    v = $t.data('slider').getValue(),
                    isAct = $t.data('levelId') === $s.data('levelId');

                // this is not the active slider and our diff is > 0
                if(!isAct && dif > 0) {
                    // the current estimator can absorb the dif
                    if(v >= dif) {
                        updSliderHandle($t, v - dif);
                        dif = 0; // dif is cleared
                    }
                    // the current estimator cannot absorb the dif, drain it
                    else { // v < dif
                        updSliderHandle($t, 0);
                        dif = dif - v; // dif is cleared
                    }
                }
            });
        }
        // CASE 2) TOTAL <= 100: fill up last no level slider with excess
        else {
            updSliderHandle($noLevS, 100 - tot);
        }
    },

    // disable some fields depending on contest status
    updateFieldDisablement: function() {
        var cm = this.contMod,
            s = cm.get('status'),
            d = _.bind( function(s) {
                    return this.$el.find(s).prop('disabled','disabled');
                }, this);

        if(s == cm.STATUSES.LIVE) {
            // measure type
            d('.measureTypeRadio').closest('.validateme').removeClass('validateme');
            // currency
            d('#currencyTypeSelect');
            // measure type
            d('.payoutTypeRadio').closest('.validateme').removeClass('validateme');
            // currency
            d('#otherPayoutTypeSelect');
            // baseline
            d('#measureOverBaseline');
        }
    },

    updateHighestLevelText: function() {
        var $hlt = this.$el.find('.highestLevelNum'),
            lcv = this.levelCollectionView,
            hl;

        if(!lcv) { return; }

        hl = lcv.levels.getHighestLevel();

        $hlt.text( hl ? hl.get('sequenceNumber') : '' );
    },


    /* **************************************************
        UI Actions - clicks etc.
    ***************************************************** */
    doPaxTableBaselineKeyup: function(e) {
        var $t = $(e.target),
            paxId = $t.data('modelId');

        this.updatePaxTableRowCalc(paxId);
    },

    doCalcTotalsClick: function(e) {
        e.preventDefault();

        this.ajax(this.POST_METHODS.CALC_TOTAL);
    },

    // same for all tooltip
    doShowSameForAllTip: function(e){
        var $tar = $(e.target),
            ppvm = this.paxPaginatedView.model,
            cp = ppvm.get('currentPage'),
            topPaxId = ppvm.paxes.at(0).get('id');

        // if not first row of first page, do nothing
        if(cp != 1 || topPaxId+'' != $tar.data('modelId')+'') { return; }

        // if only one row, do nothing
        if(ppvm.paxes.length === 1) { return; }

        //error tip active? then do nothing (just let the error have the stage)
        if($tar.data('qtip_error')&&
            $tar.data('qtip_error').elements.tooltip.is(':visible')){
            return;
        }

        //have it already?
        if($tar.data('qtip_sfa')) {
            $tar.data('qtip_sfa').show();
            return;
        }

        $tar.qtip({
            content: this.$el.find('#sameForAllTipTpl').clone().removeAttr('id'),
            position:{my:'bottom center',at:'top center',container: this.$el},
            show:{ready:true,event:false},
            hide:false,
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    width: 10,
                    height: 5
                }
            }
        });

        $tar.data('qtip_sfa',$tar.data('qtip')).removeData('qtip');

    },

    doHideSameForAllTip: function(e){
        var $tar = $(e.target);
        // allow some time for a click to occur on the link
        setTimeout(function(){
            if($tar.data('qtip_sfa')) { $tar.data('qtip_sfa').hide();}
        },100);
    },

    doSameForAllClick: function(e){
        var that = this,
            $tar = $(e.target),
            // find the active input: the link is in a tooltip with a qtip
            // which has a reference to the triggering element (target)
            $actInp = $tar.closest('.ui-tooltip').data('qtip').elements.target,
            k = $actInp.data('modelKey'),
            v = $actInp.val(),
            paxes = this.paxPaginatedView.model.paxes;

        e.preventDefault();

        // we will go through all paxes in the model setting the proper
        // field variable and also looking up the DOM element and setting that
        // we will not listen to the pax model changes as that would be more
        // complicated than I'd like to get for this
        paxes.each(function(p) {
            p.set(k, v); // Model
            that.paxPaginatedView.getTextInputForPaxAndField(p.get('id'), k).val(v); // DOM INPUT
            that.updatePaxTableRowCalc(p.get('id')); // DOM LEVEL CALCS
        });

        // AJAX - let server know we did same for all
        this.ajax(this.POST_METHODS.SAME_FOR_ALL, {key: k, value: v});
    },

    // make sure we get a good clean number for calculations
    doGoalInputChange: function(e) {
        var $cg = this.$el.find('.contestGoalInput'),
            cgClean = $cg.val().replace(/,/g, ''),
            cgParsed = parseFloat(cgClean);

        if($cg.val() === '') {
            this.contMod.set('contestGoal', '');
            return;
        }

        if(cgParsed > this.contMod.get('maxPotential')) {
            $cg.val(this.contMod.get('contestGoal'));
            return;
        }

        if(_.isNaN(cgParsed)) {
            $cg.val(this.contMod.get('contestGoal')||0);
        } else {
            this.contMod.set('contestGoal', cgParsed);
            if(cgClean.length != $cg.val().length) { $cg.val(cgClean); }
            this.updateEstimatedTotals(true);
        }
    },


    /* **************************************************
        Handlers - what to do when contestModel changes
    ***************************************************** */
    handleFetchPayoutData: function() {
        this.setupEvents();
        this.update(); // update will call render() if needed

        // NOPE: not any more - CCC-171
        // calc totals after initial data grab
        // if(this.contMod.get('measureOverBaseline') != 'no') {
        //     this.ajax(this.POST_METHODS.CALC_TOTAL);
        // }

    },

    handleAjaxPayoutStepSiUSuccess: function(resData, postParams) {

        // save and update shtuff
        if(postParams.method == this.POST_METHODS.CALC_TOTAL ||
            postParams.method == this.POST_METHODS.SAME_FOR_ALL) {
            if(resData.contestJson) {
                this.contMod.set(resData.contestJson);
            }
        }

        // show hide pax table
        if(postParams.method == this.POST_METHODS.UPDATE_BASELINE) {
            this.updatePaxTable();
        }

        if(postParams.method == this.POST_METHODS.SAVE) {
            // SSIContestPageEditView listens for this
            // handleSaveSuccess: function(serverData, fromStep, toStep, isDraft)
            this.trigger('saveSuccess', resData, postParams.fromStep, postParams.toStep, false);
        }

        if(postParams.method == this.POST_METHODS.SAVE_AS_DRAFT) {
            // SSIContestPageEditView listens for this
            // handleSaveSuccess: function(serverData, fromStep, toStep, isDraft)
            this.trigger('saveSuccess', resData, postParams.fromStep, postParams.toStep, true);
        }

        // did we get paginated pax stuff back?
        if(resData.participants) {
            this.paxPaginatedView.processAjaxResponse(resData);
            this.paxPaginatedView.renderOrUpdate(); // bit of an encapsulation problem, oh well
        }

        this.updateTotalsAndMaxes();
        this.updateHighestLevelText();

        // NOTE: always keep existing goal when updating after ajax success
        this.updateEstimatedTotals(true /* goalIsSacred */);

        // NOTE: Use the below code if there is some reason to not maintain the current goal
        //       when ajax calls return.
        // if(postParams.method == this.POST_METHODS.CALC_TOTAL && this.contMod.get('contestGoal')) {
        //     this.updateEstimatedTotals(true /* goalIsSacred */);
        // } else {
        //     this.updateEstimatedTotals();
        // }


        // NOPE: not any more - CCC-171
        // after a load, do a calc totals (if the baseline fields are filled in on pax table)
        // if(postParams.method == this.POST_METHODS.LOAD && this.paxPaginatedView.validate(true/*noErrorUi*/)) {
        //     this.ajax(this.POST_METHODS.CALC_TOTAL);
        // }
    },

    handleAjaxPayoutStepSiUStart: function() {
        this.containerView.lockPage();
    },

    handleAjaxPayoutStepSiUEnd: function() {
        this.containerView.unlockPage();
    },

    handleAjaxPayoutStepSiUError: function(errTxt) {
        this.containerView.showErrorModal(errTxt);
    },

    handlePaxNav: function() {
        var valid = this.paxPaginatedView.validate();

        if(!valid) { return; }

        this.ajax(this.POST_METHODS.PAX_NAV);
    },

    handleMeasureOverBaselineChange: function() {
        this.updateBonus();

        if(!this.paxPaginatedView) { return; }// just in case this is the initial data load

        this.ajax(this.POST_METHODS.UPDATE_BASELINE);
        this.updateCurrencyDisp();
    },

    handlePaxTableRender: function() {
        this.updatePaxTableRowCalcs();
        this.updateCurrencyDisp();
    },

    handleLevelsChange: function() {
        var ppv = this.paxPaginatedView,
            mob = this.contMod.get('measureOverBaseline');

        if(ppv && mob && mob != 'no') {
            ppv.renderOrUpdate(true/*isForceRender*/);
        }

        this.updateTotalsAndMaxes();
        this.updateEstimators();
        this.updateEstimatedTotals();
        this.updateHighestLevelText();
    },

    handleMeasureTypeChange: function() {
        this.updateCurrTypeSel();
        this.updateOtherPayoutTypeSel();
        this.updateLockPageBottom();

        this.ajax(this.POST_METHODS.UPDATE_PAYOUT);
    },

    handlePayoutTypeChange: function() {
        this.updateOtherPayoutTypeSel();
        this.updateBonus();
        this.updateTotalsAndMaxes();
        this.updateEstimatedTotals();
        this.updateLockPageBottom();

        this.ajax(this.POST_METHODS.UPDATE_PAYOUT);
    },

    handleBonusChange: function() {
        this.updateBonus();
        this.updateTotalsAndMaxes();
        this.updateEstimatedTotals();
    },

    handleBonusPayoutCapChange: function() {
        this.updateTotalsAndMaxes();
        this.updateEstimatedTotals();
    },


    /* **************************************************
        TAB FUNCTIONS - ContestEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        // make sure the pax table is cleared, it will then update with latest data
        this.clearPaxTable();
        // fetch payout data (step specific)
        this.contMod.fetchPayoutData_siu();
    },

    leaveTab: function() {
        this.containerView.unlockPageAfter();
    },

    isThisTabActive: function() {
        return this.containerView.wizTabs.getActiveTab().get('name') == 'stepPayouts';
    },

    // validate the state of elements within this tab
    validate: function() {
        var levs = this.contMod.get('levels'),
            cm = this.contMod,
            mt = cm.get('measureType'),
            mtIsCurr = mt == 'currency',
            ok = true;

        if(!cm.get('activityDescription')) {
            return { msgClass: 'msgSIUActivityDescReq', valid: false };
        }

        if(!cm.get('measureType')) {
            return { msgClass: 'msgActivityTypeReq', valid: false };
        }

        if(!cm.get('payoutType')) {
            return { msgClass: 'msgPayoutTypeReq', valid: false };
        }

        if( !this.contMod.validateContestGoal() ) {
            return { msgClass: 'msgContestGoalReq', valid: false };
        }

        if(!levs || levs.length < 2) {
            return { msgClass: 'msgSIULevelReq', valid: false };
        }

        if(cm.get('includeBonus') && (
            !G5.util.validation.isNum(cm.get('bonusForEvery'), 'decimal', mtIsCurr ? 2 : 4, false)
            )) {
            return { msgClass: 'msgSIUBonusFieldsReq_dec_'+(mtIsCurr?2:4), valid: false };
        }
        if(cm.get('includeBonus') && (
            !G5.util.validation.isNum(cm.get('bonusPayout'), 'natural', 0, false) ||
            !G5.util.validation.isNum(cm.get('bonusPayoutCap'), 'natural', 0, false)
            )) {
            return { msgClass: 'msgSIUBonusFieldsReq_nat', valid: false };
        }
        if(cm.get('includeBonus') && (
            !cm.validateNumberMax( cm.get('bonusForEvery') ) ||
            !cm.validateNumberMax( cm.get('bonusPayout') ) ||
            !cm.validateNumberMax( cm.get('bonusPayoutCap') )
            )) {
            return { msgClass: 'msgSIUBonusFieldsTooLarge', valid: false };
        }
        if(cm.get('includeBonus')) {
            if(!cm.validateBonusCapSize()) {
                return {msgClass: 'msgBonusCapTooSmall', valid: false };
            }
            if(!cm.validateBonusCapMultiple()) {
                return {msgClass: 'msgBonusCapMultiple', valid: false };
            }
        }

        // when payoutType  is other, descriptions get cleared from created levels
        if(cm.get('payoutType') == 'other') {
            _.each(levs, function(l) {
                ok = ok && l.payoutDescription;
            });
            if(!ok) {
                return { msgClass: 'msgSIULevelMissingDesc', valid: false };
            }
        }

        // when measureType changes amounts get cleared from created levels
        _.each(levs, function(l) {
            ok = ok && l.amount;
        });

        if(!ok) {
            return { msgClass: 'msgSIULevelMissingAmount', valid: false };
        }

        // billTo stuff
        if(!this.contMod.validateBillTo()) {
            return { msgClass: 'msgBillToDataReq', valid: false };
        }

        if(!this.contMod.validateBillToCode()) {
            return { msgClass: 'msgBillToCodeReq', valid: false };
        }


        // yay
        return { valid: true };
    },

    // SSIContestPageEditView will use this on goFromStepToStep() instead of SSIContestModel.save()
    save: function(fromStep, toStep, isDraft) {
        var m = isDraft ? this.POST_METHODS.SAVE_AS_DRAFT : this.POST_METHODS.SAVE,
            mob = this.contMod.get('measureOverBaseline');

        // error found on pax table (only for 'save' and no measureOverBaseline)
        if( !isDraft && mob != 'no' && !this.paxPaginatedView.validate() ){
            // scroll to pax table
            $.scrollTo(this.$el.find('#ssiParticipantsSiU'), {
                axis:'y',
                duration: 200
            });
            // exit this function, don't call ajax
            return;
        }

        this.ajax(m, {fromStep: fromStep, toStep: toStep});
    },

    saveAsDraft: function() {
        this.ajax(this.POST_METHODS.SAVE_AS_DRAFT);
    },


    /* **************************************************
        UTIL
    ***************************************************** */
    // number format
    fmt: function(num, key) {
        var mob = this.contMod.get('measureOverBaseline');

        if(_.isNaN(num)) { return '--'; }

        if(key == 'amount' && mob != 'no') {
            key = key+'_'+mob;
        }

        return this.contMod.formatNumberForKey(num, key);
    },

    // one method for AJAX BS
    ajax: function(method, extraParams) {
        var params = this.paxPaginatedView ? this.paxPaginatedView.prepareAjaxData({}) : {};

        if(extraParams) {
            params = _.extend({}, params, extraParams);
        }

        this.contMod.ajaxPayoutStepSiU(method, params);
    }

});
