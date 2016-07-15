/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
BadgesSelectorView,
ParticipantPaginatedView,
SSIContestModel,
SSIContestEditTabPayoutsView_objectives:true
*/
SSIContestEditTabPayoutsView_objectives = Backbone.View.extend({

    POST_METHODS: {
        SAVE: 'save', // server: no data response + validate all pax data filled (next/back/tab)
        SAVE_AS_DRAFT: 'saveAsDraft', // server save data + no full pax data validation
        LOAD: 'load', // server: no save, respond with default pax data list
        PAX_NAV: 'paxNav', // server: save all, respond with apropo page of pax data
        CALC_TOTAL: 'calcTotal', // server: respond with totals only, validate for full pax data
        UPDATE_PAYOUT: 'updatePayout', // server will potentially clear certain fields, and return the first page of pax in def sort
        SAME_FOR_ALL: 'sameForAll' // notify server that same for all was clicked with key/value pair
    },

    initialize: function(opts) {
        var that = this;

        // fe dev uses this
        this.tplPath = './../apps/ssi/tpl/';
        this.tplName = 'ssiContestEditTabPayoutsView_objectives';

        // SSIContestPageEditView parent container for this tab
        this.containerView = opts.containerView;
        // shortcut to contest model
        this.contMod = this.containerView.contestModel;

        this.setupEvents();

    },

    events: {
        // NOTE: many of the radios and inputs use the autoBind functionality in SSIContestPageEditView
        //       to save to the Model. ParticipantPaginationView also has its own autoBind-to-model function.

        'click .removeUpload': 'handleRemoveUpload',
        'focus .textInputCell .paxDatTextInput': 'doShowSameForAllTip',
        'blur .textInputCell .paxDatTextInput': 'doHideSameForAllTip',
        'click .sameForAllTip a': 'doSameForAllClick',
        'click .calculateTotalsBtn': 'doCalcTotalsClick',

        'keyup .contestGoalInput': 'doGoalInputChange',
        'blur .contestGoalInput': 'doGoalInputChange'

    },

    setupEvents: function() {
        this.contMod.on('success:fetchPayoutData_objectives', this.handleFetchPayoutData, this);

        this.contMod.on('success:fetchCalcTotals_objectives', this.handleFetchCalcSuccess, this);
        this.contMod.on('start:fetchCalcTotals_objectives', this.handleFetchCalcStart, this);
        this.contMod.on('end:fetchCalcTotals_objectives', this.handleFetchCalcEnd, this);

        this.contMod.on('change:measureType', this.handleMeasureTypeChange, this);

        this.contMod.on('change:currencyTypeId', this.updateCurrencyLabels, this);
        this.contMod.on('currencyTypeIdChanged', this.updatePaxObjectiveTable, this);
        this.contMod.on('change:otherPayoutTypeId', this.updateCurrencyLabels, this);

        this.contMod.on('change:payoutType', this.handlePayoutTypeChange, this);

        this.contMod.on('change:includeStackRanking', this.updateStackRankOrderRadios, this);

        this.contMod.on('change:objectivesDocument', this.updateObjectivesUploader, this);

        this.contMod.on('change:includeBonus', this.updatePaxObjectiveTable, this);
        this.contMod.on('change:includeBonus', this.updateCurrencyLabels, this);
        this.contMod.on('change:includeBonus', this.updateBonusDeps, this);

        this.contMod.on('change:sameActivityDescriptionForAll', this.updateActivityDescriptionWrapper, this);
        this.contMod.on('change:sameActivityDescriptionForAll', this.updatePaxObjectiveTable, this);
    },

    handleMeasureTypeChange: function(x, y, z) {
        if(!this.isThisTabActive()) { return; }

        this.updateCurrTypeSel();
        this.updateOtherPayoutTypeSel();
        this.updatePaxObjectiveTable(x, y, z);
        this.updateTotalsAndMaxes();
        this.updateLockPageBottom();
    },

    handlePayoutTypeChange: function(x, y, z) {
        if(!this.isThisTabActive()) { return; }

        this.updateOtherPayoutTypeSel();
        this.updateIncludeBonus();
        this.updatePaxObjectiveTable(x, y, z);
        this.updateLockPageBottom();

        this.containerView.updateBillTo();
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

            that.renderCurrencyAndOtherSelects();
            that.initDescription();
            that.initBadges();
            that.initEstimateSlider();
            that.initPaxObjectiveTable();

            that._isRendered = true;
            delete that._isRendering;

            that.update();
        }, this.tplPath);
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

    initDescription: function() {
        var ad = this.contMod.get('activityDescription');
        this.$el.find('.activityDescriptionInput').val(ad || '');
    },

    initBadges: function() {
        var $bw = this.$el.find('.badgesOuterWrapper');
        // just hide the badge section if not using badges
        if(!this.contMod.payoutsIsUsingBadges()) {
            $bw.hide();
            return;
        }

        $bw.show();

        // badges widget
        this.badgesSelectorView = new BadgesSelectorView({
            el: this.$el.find('.badgesSelectorView'),
            collection: new Backbone.Collection(this.contMod.get('badges')),
            selectedBadgeId: this.contMod.get('badgeId')||null
        });

        this.badgesSelectorView.on('badgeChanged', this.doBadgeChange, this);
    },

    initEstimateSlider: function() {
        var that = this,
            $s = this.$el.find('#estimateSlider'),
            pct = this.contMod.get('estimatedAchievementPercent')||100;

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

        $s.on('slide', function(evt) {

            that.contMod.setObjectiveEstimatedAchievmentPercent(evt.value);
            that.updateTotalsAndMaxes();
        });

        $s.on('slideStart', function(evt) {
            $s.data('slider').showTooltip();
        });

        $s.on('slideStop', function(evt) {
            $s.data('slider').hideTooltip();
        });
    },

    // get all parameters that the pax paginated view needs to send to server
    getPaxPaginatedViewParams: function() {
        var cm = this.contMod,
            ppvParams = {// icky
                contestId: this.contMod.get('id'),
                ssiContestClientState : this.contMod.get('ssiContestClientState'),
                measureType: cm.get('measureType'),
                currencyTypeId: cm.get('currencyTypeId'),
                payoutType: cm.get('payoutType'),
                otherPayoutTypeId: cm.get('otherPayoutTypeId'),
                badgeId: cm.get('badgeId'),
                sameActivityDescriptionForAll: cm.get('sameActivityDescriptionForAll'),
                includeStackRanking: cm.get('includeStackRanking'),
                stackRankingOrder: cm.get('stackRankingOrder'),
                includeBonus: cm.get('includeBonus'),
                activityDescription: cm.get('activityDescription'),
                contestGoal: cm.get('contestGoal'),
                billTo: cm.get('billTo'),
                billToCode1: cm.get('billToCode1'),
                billToCode2: cm.get('billToCode2')
            };

        return ppvParams;
    },

    initPaxObjectiveTable: function() {
        var ppvParams = this.getPaxPaginatedViewParams(),
            cm = this.contMod,
            that = this;

        this.paxPaginatedView = new ParticipantPaginatedView({
            el: this.$el.find('#ssiParticipants_objectives'),
            participantsUrl: cm.get('nextUrl'),
            tplName: "ssiContestEditTabPayoutsView_objectives_paxTable",
            tplUrl: G5.props.URL_APPS_ROOT + 'ssi/tpl/',
            fetchParams: ppvParams,
            fetchParamsFunc: function() {
                return that.getPaxPaginatedViewParams();
            },
            sortChangeParams: {method:this.POST_METHODS.PAX_NAV},
            pageChangeParams: {method:this.POST_METHODS.PAX_NAV},
            delayFetch: true,// manually call the initial AJAX load of paxes
            // this function mixes information from this view with the
            // pagination view to validate all fields before they are
            // sent to the server
            validateBeforeFetch: function(paxes) {
                var res = {isValid: true, errors: []},
                    reqs = [];

                if(paxes.length===0) { return res; }

                // build list of required fields
                if(!cm.get('sameActivityDescriptionForAll')) {
                    reqs.push('activityDescription');
                }
                reqs.push('objectiveAmount');
                if(cm.get('payoutType')=='other') {
                    reqs.push('objectivePayoutDescription');
                }
                reqs.push('objectivePayout');
                if(cm.get('includeBonus')) {
                    reqs.push('bonusForEvery');
                    reqs.push('bonusPayout');
                    reqs.push('bonusPayoutCap');
                }

                // record missing fields in error objects
                paxes.each(function(p) {
                    var bp = parseFloat(p.get('bonusPayout')),
                        bpc = parseFloat(p.get('bonusPayoutCap'));

                    // required fields
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

                    // payout cap specifics
                    if(cm.get('includeBonus')) {
                        // cap should be larger than bonus and a multiple of it
                        if(bp > bpc || bpc % bp !== 0) {
                            res.isValid = false;
                            res.errors.push({
                                pax: p,
                                field: 'bonusPayoutCap',
                                errorType: 'msgBonusPayoutCapError'
                            });
                        }
                    }
                });
                return res;
            },

            // sindle field validation type mapping
            validationTypeByKey: function(k) {
                var mt = SSIContestModel.prototype.instance.get('measureType');
                //console.log('PAYOUT:OBJ.validationTypeByKey('+k+') CB');

                if(k == 'objectivePayoutDescription' || k == 'activityDescription') {
                    return null; // anything
                }

                // measures (negative, 2 or 4 decimals)
                if(k == 'objectiveAmount' || k == 'bonusForEvery') {
                    return {type: 'decimal', precision: mt == 'currency' ? 2 : 4, allowNegs: true};
                }
                // payouts
                else {
                    return {type: 'natural', precision: 0, allowNegs: false};
                }
            },

            // extra data from outside the pax paginated view
            getJsonForTemplate: function() {
                var ct = cm.get('currencyTypeId'),
                    pt = cm.get('otherPayoutTypeId');

                return {
                    showBonus: cm.get('includeBonus')?true:false,
                    showActivityDescription: cm.get('sameActivityDescriptionForAll') ? false : true,
                    showPayoutDescription: cm.get('payoutType') == 'other',
                    isPayoutTypeOther: cm.get('payoutType') == 'other',
                    measureCurrencyLabel: ct||false,
                    payoutCurrencyLabel: pt||false
                };
            }
        });// this.paxPaginatedView = ...

        // let's handle some shizzzzzz
        this.paxPaginatedView.on('start:fetchParticipants', this.handleFetchParticipantsStart, this);
        this.paxPaginatedView.on('success:fetchParticipants', this.handleFetchParticipantsSuccess, this);
        this.paxPaginatedView.on('end:fetchParticipants', this.handleFetchParticipantsEnd, this);
        this.paxPaginatedView.on('change:paxData', this.handlePaxDataChange, this);
        this.paxPaginatedView.on('error:fetchParticipants', this.handleFetchParticipantsError, this);
        this.paxPaginatedView.on('renderedAndUpdated', this.handlePaxTableRender, this);

        // now we have listeners, lets fetch our initial set of paxes
        this.paxPaginatedView.fetchParticipants({method: this.POST_METHODS.LOAD});
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

        // set the contest goal
        this.$el.find('.contestGoalInput').val(cm.get('contestGoal')||'');

        this.updateCurrTypeSel();
        this.updateOtherPayoutTypeSel();
        this.updateStackRankOrderRadios();
        this.updateObjectivesUploader();
        this.updateIncludeBonus();
        this.updateSameActivityDescriptionForAll();
        this.updateActivityDescriptionWrapper();
        this.updateCurrencyLabels();
        this.updateTotalsAndMaxes();
        this.updateLockPageBottom();
        this.updateBonusDeps();

        this.updateFieldDisablement();

        this.containerView.updatePayoutTypeVisibility();
        this.containerView.updateBillTo();
    },

    updateLockPageBottom: function() {
        if(!this.isThisTabActive()) {return;}

        var $lpb = this.$el.find('#_msgLockPageBottom'),
            msg,
            $lockAfter = this.$el.find('.payoutTypeRadio:visible').closest('.control-group').next();

        if(!$lpb.length || !$lockAfter.length) {return;}

        msg = $lpb.html();

        if(!this.contMod.get('measureType') || !this.contMod.get('payoutType')) {
            this.containerView.lockPageAfter($lockAfter, msg);
        } else {
            this.containerView.unlockPageAfter();
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
    },

    updateStackRankOrderRadios: function() {
        var isr = this.contMod.get('includeStackRanking'),
            sro = this.contMod.get('stackRankingOrder'),
            $sro = this.$el.find('[name=stackRankingOrder][value='+sro+']'),
            $srow = this.$el.find('.stackRankingOrderWrapper');
        // show or hide
        $srow[isr?'show':'hide']();

        $sro.prop('checked', true);
    },

    updateIncludeBonus: function() {
        var pt = this.contMod.get('payoutType'),
            ib = this.contMod.get('includeBonus'),
            $ib = this.$el.find('[name=includeBonus]'),
            domVar = $ib.prop('checked');
        // show hide the control based on payoutType==other
        this.$el.find('.includeBonusWrapper')[ pt == 'other' ? 'hide' : 'show' ]();

        // set the include bonus checkbox
        if(domVar !== ib) { $ib.prop('checked',ib); }
    },

    updateSameActivityDescriptionForAll: function() {
        var sfa = this.contMod.get('sameActivityDescriptionForAll');
        this.$el.find('[name=sameActivityDescriptionForAll][value='+sfa+']').prop('checked', true);
    },

    updateActivityDescriptionWrapper: function() {
        var $adw = this.$el.find('.activityDescriptionWrapper'),
            $srw = this.$el.find('.includeStackRankingWrapper'),
            sfa = this.contMod.get('sameActivityDescriptionForAll'),
            ad = this.contMod.get('activityDescription'),
            isr = this.contMod.get('includeStackRanking'),
            $ad = this.$el.find('.activityDescriptionInput'),
            $isr = this.$el.find('.includeStackRankingInput');
        $adw[ sfa ? 'slideDown' : 'slideUp']();
        $srw[ sfa ? 'slideDown' : 'slideUp']();
        $ad.val(ad || '');
        $isr.prop('checked', isr);


    },

    // this is called when changes to the payout occur
    // as such we send a UPDATE_PAYOUT method to server
    updatePaxObjectiveTable: function(x, y, z, method) {
        var ppvParams = this.getPaxPaginatedViewParams(),
            m = method || this.POST_METHODS.UPDATE_PAYOUT;

        if(!this.paxPaginatedView || !this.isThisTabActive()) { return; }

        this.paxPaginatedView.setFetchParams(ppvParams);// with updated vars
        this.paxPaginatedView.fetchParticipants({method: m}, true);// force re-render
    },

    // this is actually our save function on this particular tab
    // it is being called by this.save(), which is used in place of SSIContestModel.save()
    // - this is b/c paxPaginatedView.fetchParticipants() is sending all data, so we are just
    // using this function instead of rebuilding one on the contestModel
    savePaxObjectiveTable: function(fromStep, toStep, isDraft) {
        var ppvParams = this.getPaxPaginatedViewParams(),
            wasValid = true;

        if(!this.paxPaginatedView) { return; }

        this.paxPaginatedView.setFetchParams(ppvParams);// with updated vars

        // temporarily disable (may God have mercy on my soul)
        if(isDraft) {
            this.paxPaginatedView._validateBeforeFetch = this.paxPaginatedView.validateBeforeFetch;
            this.paxPaginatedView.validateBeforeFetch = false;
        }

        wasValid = this.paxPaginatedView.fetchParticipants({
            method: isDraft ? this.POST_METHODS.SAVE_AS_DRAFT : this.POST_METHODS.SAVE,
            fromStep: fromStep,
            toStep: toStep
        }, false);// no re-render

        // re-enable validation (may God have mercy on my soul)
        if(isDraft) {
            this.paxPaginatedView.validateBeforeFetch = this.paxPaginatedView._validateBeforeFetch;
            delete this.paxPaginatedView._validateBeforeFetch;
        }


        // ...listen for results and take apropo action
        // OR wasValid == false
        if(wasValid===false) {
            // errors will be in pax paginated view -- maybe slide to pax table
        }
    },

    // update the currency label for various measure/payout numbers (USD, points etc...)
    updateCurrencyLabels: function() {
        var cm = this.contMod,
            mCt = cm.getActiveCurrencyType(),
            oCt = cm.getActiveOtherCurrencyType(),
            msgPoints = this.$el.find('#_msgPoints').text(),
            msgUnits = this.$el.find('#_msgUnits').text();

        mCt = mCt ? { suffix: '', prefix: mCt.symbol } : { suffix: msgUnits, prefix: '' };
        oCt = oCt ? { suffix: '', prefix: oCt.symbol } : { suffix: msgPoints, prefix: '' };

        this.$el.find('.currSymb.act').text(mCt.prefix);
        this.$el.find('.currDisp.act').text(mCt.suffix);

        this.$el.find('.currSymb.pay').text(oCt.prefix);
        this.$el.find('.currDisp.pay').text(oCt.suffix);

        // show/hide the bonus section
        this.$el.find('.maxPayoutWithBonusWrapper')[cm.get('includeBonus') ? 'show' : 'hide']();
    },

    // update table total and maximum numbers
    updateTotalsAndMaxes: function(goalIsSacred) {
        var that = this;
        // special case for goal
        if(!goalIsSacred) {
            this.$el.find('.contestGoalInput').val(this.contMod.get('contestGoal'));
        } else {
            // we assume the contestGoal is set in the model already, now call to calculate
            // estimates before updating the UI below
            this.contMod.setObjectivesContestGoalRelatedFields();
        }
        // goal percent
        this.$el.find('.goalPercent').text('('+(this.contMod.getContestGoalAsPercentOfMaxPotential()||'--')+'%)');

        // using .calcTotalsAutoBind to 'magically' update all necessary fields
        // and element with .calcTotalsAutoBind will have its text set to Model.data-model-key
        this.$el.find('.calcTotalsAutoBind:visible').each(function(){
            var $b = $(this),
                k = $b.data('modelKey'),
                v = that.contMod.get(k);

            if(k&&v) { $b.text(that.fmt(v, k)); }
        });
    },

    // Objectives Doc Upload
    updateObjectivesUploader: function() {
        var that = this,
            $m = this.$el.find('.objectiveUploadWrapper'),
            doc = this.containerView.contestModel.get('objectivesDocument'),
            startSpin = function() {
                $m.find('.fileInputWrapper').hide();
                $m.find('.uploadingIndicator').show().find('.uploadingSpinner').spin();
            },
            stopSpin = function() {
                $m.find('.uploadingIndicator').hide().find('.uploadingSpinner').spin(false);
                $m.find('.fileInputWrapper').show();
                $m.find('.uploadingIndicator .bar').css('width','0%').text('0%');
            },
            showError = function(errorContent) {
                $m.find('.uploadError').show().find('span').html(errorContent);
            },
            hideError = function() {
                $m.find('.uploadError').hide().find('span').html('');
            };

        $m.find('.noDocMsg')[doc?'hide':'show']();
        $m.find('.hasDocMsg')[doc?'show':'hide']();

        if(doc) {
            $m.find('.docOrigName').text(doc.originalFilename).show();
            $m.find('.removeUpload').show();
        }
        else {
            $m.find('.docOrigName').text('').hide();
            $m.find('.removeUpload').hide();
        }


        // upload pluggy (its smart enough to know only to
        // get attached once even though it gets called every update)
        $m.find('.uploaderFileInput').fileupload({
            url: G5.props.URL_JSON_CONTEST_OBJECTIVE_UPLOAD,
            dataType: 'g5json',
            formData: {},
            add: function(e, fuData) {
                var f = fuData.files[0],
                    regEx = /\.(pdf|doc|docx)$/i,
                    $tar = $m.find('.uploaderFileInput:visible');

                if(regEx.test(f.name)) {
                    // continue normal behavior
                    fuData.submit();
                } else {
                    // throw error tip up, also add 'click' to hide events in addition to 'unfocus' so a click
                    // on the upload button will also hide the qtip
                    that.containerView.genericErrorTip('msgUnsupportedFileType', $tar, {hide:{event:"unfocus click"}});
                }

            },
            beforeSend: startSpin,
            done: function(e, data) {
                var props = data.result.data.properties,
                    docObj = null,
                    name = "Objectives Document";

                if(props.isSuccess){
                    docObj = {
                        id: props.fileUrl,
                        name: name,
                        url: props.fileUrl,
                        originalFilename: props.originalFilename
                    };

                    that.containerView.contestModel.set('objectivesDocument', docObj);
                } else {
                    showError(props.errorText||"File upload failed - server did not provide [errorText]");
                }

                stopSpin();
            },
            error: function(xhr, status, error) {
                stopSpin();
                showError(status+': '+error);
            }
        });

        // hide any upload errors hanging out
        hideError();
    },

    handleRemoveUpload: function(e) {
        e.preventDefault();
        this.containerView.contestModel.set('objectivesDocument', null);
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
        }
    },

    updateBonusDeps: function() {
        var ib = this.contMod.get('includeBonus');
        this.$el.find('.paxTableTitle.ifBonusShow')[ib ? 'show' : 'hide']();
        this.$el.find('.paxTableTitle.ifBonusHide')[ib ? 'hide' : 'show']();
    },


    /* **************************************************
        UI Actions - clicks etc.
    ***************************************************** */
    doBadgeChange: function(badgeModel) {
        this.contMod.set('badgeId', badgeModel.get('id'));
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
            paxes = this.paxPaginatedView.model.paxes,
            data;

        e.preventDefault();

        // if there is a qtip visible, then we know there was an error on blur, and we
        // do not want to actually Do Stuff for this SFA click
        if($actInp.data('qtip') && $actInp.data('qtip').elements.tooltip.is(':visible')) {
            return;
        }

        // we will go through all paxes in the model setting the proper
        // field variable and also looking up the DOM element and setting that
        // we will not listen to the pax model changes as that would be more
        // complicated than I'd like to get for this
        paxes.each(function(p) {
            p.set(k, v); // Model
            that.paxPaginatedView.getTextInputForPaxAndField(p.get('id'), k).val(v); // DOM
        });

        // manually trigger this update -- for single changes we get change:paxData
        this.updateTotalsAndMaxes();

        // AJAX - let server know we did same for all
        data = this.paxPaginatedView.prepareAjaxData(this.getPaxPaginatedViewParams());
        data.method = this.POST_METHODS.SAME_FOR_ALL;
        data.key = k;
        data.value = v;
        // we can use the fetch calc call cuz we might get new calcs back,
        // and we don't need to do much else special when server responds
        this.contMod.fetchCalcTotals_objectives(data);
    },

    doCalcTotalsClick: function(e) {
        e.preventDefault();

        this.calcTotalsAjax();
    },

    calcTotalsAjax: function() {
        var data = _.extend(
            // this is so gross, its been forced by BE design reqs, so sorry :(
            {
                participants: this.paxPaginatedView.model.paxes.toJSON(),
                currentPage: this.paxPaginatedView.model.get('currentPage'),
                sortedBy: this.paxPaginatedView.model.get('sortedBy'),
                sortedOn: this.paxPaginatedView.model.get('sortedOn')
            },
            this.getPaxPaginatedViewParams(),
            { method: this.POST_METHODS.CALC_TOTAL }
        );

        if(!this.paxPaginatedView.validate()) { return; } // there was an error

        data = this.paxPaginatedView.serializeForStruts(data);

        this.contMod.fetchCalcTotals_objectives(data);
    },

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
            this.updateTotalsAndMaxes(true);
        }
    },


    /* **************************************************
        Handlers - what to do when contestModel changes
    ***************************************************** */
    handleFetchPayoutData: function() {
        // this will refresh pax table on re-visit of page
        // on initial load of page this will not do anything since the
        // pax table view doesn't exist yet
        this.updatePaxObjectiveTable(null, null, null, this.POST_METHODS.LOAD);

        this.update(); // update will call render() if needed
    },

    handleFetchCalcStart: function() {
        var $bts = this.$el.find('button.calculateTotalsBtn'),
            $lnk = this.$el.find('a.calculateTotalsBtn');

        $bts.data( 'origText', $bts.text() )
            .text( $bts.data('msgLoading') )
            .attr( 'disabled', 'disabled' );

        $lnk.hide().after('<span class="_loading_">'+$lnk.data('msgLoading')+'</span>');
    },

    handleFetchCalcEnd: function() {
        var $bts = this.$el.find('button.calculateTotalsBtn'),
            $lnk = this.$el.find('a.calculateTotalsBtn');

        $bts.text($bts.data('origText'))
            .removeAttr('disabled');

        $lnk.show().next('._loading_').remove();

    },

    handleFetchCalcSuccess: function() {
        // calc success only sets contestGoal if it is not already set
        if(!this.contMod.get('contestGoal')) {
            // set estimates based on slider (overwrite contestGoal)
            this.contMod.setObjectiveEstimatedAchievmentPercent(parseInt(this.$el.find('#estimateSlider').val(),10));
        } else {
            // set estimates based on contestGoal (leave contestGoal alone)
            this.contMod.setObjectivesContestGoalRelatedFields();
        }

        // update totals, maxes and estimates
        this.updateTotalsAndMaxes();
    },

    handleFetchParticipantsStart: function(params) {

        this.containerView.lockNav('ssiContestEditTabPayoutsView_objectives_paxTable');
        this.containerView.lockPage();
    },

    handleFetchParticipantsSuccess: function(respData, params) {
        var isDraft = params.method === this.POST_METHODS.SAVE_AS_DRAFT;

        // update calc totals if necessary (basically on first visit to tab)
        if(params.method === this.POST_METHODS.LOAD) {
            this.calcTotalsAjax();
        }

        // handleSaveSuccess: function(serverData, fromStep, toStep, isDraft)
        this.trigger('saveSuccess', respData, params.fromStep, params.toStep, isDraft);
    },

    handleFetchParticipantsError: function(errs) {
        this.containerView.handleSaveError(errs);
    },

    handleFetchParticipantsEnd: function() {
        this.containerView.unlockNav('ssiContestEditTabPayoutsView_objectives_paxTable');
        this.containerView.unlockPage();
    },

    handlePaxDataChange: function(a,b,c) {
        this.updateTotalsAndMaxes();
    },

    handlePaxTableRender: function() {
        this.updateCurrencyLabels();
        // make sure totals and maxes in table get refreshed
        this.updateTotalsAndMaxes();
    },


    /* **************************************************
        TAB FUNCTIONS - ContestEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        // fetch payout data (step specific)
        this.contMod.fetchPayoutData_objectives();
    },

    leaveTab: function() {
        this.containerView.unlockPageAfter();
    },

    isThisTabActive: function() {
        return this.containerView.wizTabs.getActiveTab().get('name') == 'stepPayouts';
    },

    // SSIContestPageEditView will use this on goFromStepToStep() instead of SSIContestModel.save()
    // here we will use the paginator fetch method to save evrerything on the page
    // (as it already does so on sorting and page num change)
    save: function(fromStep, toStep) {
        var wtv = this.containerView.wizTabs,
            isNotNext = toStep !== wtv.getTabAfterNamedTab(fromStep).get('name');

        // isNotNext will determin if this is treated as a saveAsDraft
        this.savePaxObjectiveTable(fromStep, toStep, isNotNext);
    },

    saveAsDraft: function() {
        this.savePaxObjectiveTable(null, null, true); // last var==true means isDraft
    },

    // validate the state of elements within this tab
    validate: function() {
        var $validate = this.$el.find('.validateme:visible'),
            isValid = G5.util.formValidate($validate); // simple check uses global formValidate

        // failed generic validation tests (requireds mostly)
        if(!isValid) {
            return { msgClass: 'msgGenericError', valid: false };
        }

        if( !this.contMod.validateContestGoal() ) {
            return { msgClass: 'msgContestGoalReq', valid: false };
        }

        if(!this.contMod.validateBillTo()) {
            return { msgClass: 'msgBillToDataReq', valid: false };
        }

        if(!this.contMod.validateBillToCode()) {
            return { msgClass: 'msgBillToCodeReq', valid: false };
        }

        return {valid:true};
    },

    // number format
    fmt: function(num, key) {
        if(_.isNaN(num)) { return '--'; }
        return this.contMod.formatNumberForKey(num, key);
    }

});
