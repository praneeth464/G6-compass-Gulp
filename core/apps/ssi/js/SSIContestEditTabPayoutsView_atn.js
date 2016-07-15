/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
ParticipantPaginatedView,
SSIContestModel,
SSIContestEditTabPayoutsView_atn:true
*/
SSIContestEditTabPayoutsView_atn = Backbone.View.extend({

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
        this.tplName = 'ssiContestEditTabPayoutsViewATN';

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
        'click .calculateTotalsBtn': 'doCalcTotalsClick'

    },

    setupEvents: function() {
        this.contMod.on('success:fetchPayoutData_atn', this.update, this);

        this.contMod.on('success:fetchCalcTotals_atn', this.handleFetchCalcSuccess, this);
        this.contMod.on('start:fetchCalcTotals_atn', this.handleFetchCalcStart, this);
        this.contMod.on('end:fetchCalcTotals_atn', this.handleFetchCalcEnd, this);

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
            that.initPaxTable();
            that.initTextEditor();

            that._isRendered = true;
            delete that._isRendering;

            that.update();
        }, this.tplPath);
    },

    // get all parameters that the pax paginated view needs to send to server
    getPaxPaginatedViewParams: function() {
        var cm = this.contMod,
            ppvParams = {
                contestId: this.contMod.get('id'),
                ssiContestClientState: this.contMod.get('ssiContestClientState'),
                awardThemNowStatus: this.contMod.get('awardThemNowStatus'),
                currencyTypeId: cm.get('currencyTypeId'),
                payoutType: cm.get('payoutType'),
                otherPayoutTypeId: cm.get('otherPayoutTypeId'),
                message: cm.get('message')
            };
        return ppvParams;
    },

    initPaxTable: function() {
        var ppvParams = this.getPaxPaginatedViewParams(),
            cm = this.contMod,
            that = this;

        this.paxPaginatedView = new ParticipantPaginatedView({
            el: this.$el.find('#ssiParticipants_atn'),
            participantsUrl: cm.get('nextUrl'),
            tplName: "ssiContestEditTabPayoutsViewATNpaxTable",
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
                reqs.push('objectiveAmount');

                if(cm.get('payoutType')=='other') {
                    reqs.push('objectivePayoutDescription');
                }

                reqs.push('objectivePayout');
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
                var mt = SSIContestModel.prototype.instance.get('measureType');
                //console.log('PAYOUT:OBJ.validationTypeByKey('+k+') CB');

                // measures (negative, 2 or 4 decimals)
                if(k == 'objectiveAmount') {
                    return {type: 'decimal', precision: mt == 'currency' ? 2 : 4, allowNegs: true, allowZero: true};
                }
                // payouts
                else if(k == 'objectivePayout'){
                    return {type: 'natural', precision: 0, allowNegs: false};
                }
                // string fields (activity decription and payout description)
                else {
                    return null;
                }
            },

            // extra data from outside the pax paginated view
            getJsonForTemplate: function() {
                var ct = cm.get('currencyTypeId'),
                    pt = cm.get('otherPayoutTypeId');
                return {
                    showBonus: cm.get('includeBonus')?true:false,
                    showActivityDescription: cm.get('includeStackRanking') ? false : true,
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
        this.paxPaginatedView.on('change:paxData', this.handlePaxDataChange, this);
        this.paxPaginatedView.on('error:fetchParticipants', this.handleFetchParticipantsError, this);
        this.paxPaginatedView.on('renderedAndUpdated', this.handlePaxTableRender, this);

        // now we have listeners, lets fetch our initial set of paxes
        this.paxPaginatedView.fetchParticipants({method: this.POST_METHODS.LOAD});
    },

    initTextEditor: function() {
        'use strict';

        var props = _.clone(G5.props.richTextEditor),
            that = this;

        props.toolbar = _.filter(props.toolbar, function (tool) {
            // not sure if there's a better pattern to follow for this
            return tool && tool.css && tool.css === "checkSpelling";
        });

        this.$el.find('.richtext').htmlarea( props );

        // keep the model up to date on keyup
        this.$el.find('.richtext')[0].jhtmlareaObject.editor.body.onkeyup = function(){
            var stripHtml = $('<p>' + that.$el.find('.richtext').val() + '</p>').text();
            that.contMod.set('message', stripHtml);
        };

        return this;
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
        this.updateActivityDescriptionInput();
        this.updateCurrencyLabels();
        this.updateTotalsAndMaxes();
        this.containerView.updateBottomControls();
    },

    updateCurrTypeSel: function() {
        var mt = this.contMod.get('measureType'),
            ct = this.contMod.get('currencyTypeId'),
            $cts = this.$el.find('#currencyTypeSelect');

        // show/hide the currency type dropdown
        $cts[mt==='currency'?'show':'hide']();
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
        // show hide the control based on payoutType==other
        this.$el.find('.includeBonusWrapper')[ this.contMod.get('payoutType') == 'other' ? 'hide' : 'show' ]();
    },

    updateActivityDescriptionInput: function() {
        var $adw = this.$el.find('.activityDescriptionWrapper'),
            actDesc = this.contMod.get('activityDescription')||'';

        $adw.find('.activityDescriptionInput').val(actDesc);
        $adw[this.contMod.get('includeStackRanking') ? 'slideDown' : 'slideUp']();
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
    updateTotalsAndMaxes: function() {
        var that = this,
            isStale = this._totalsAndMaxesAreStale;

        // using .calcTotalsAutoBind to 'magically' update all necessary fields
        // and element with .calcTotalsAutoBind will have its text set to Model.data-model-key
        this.$el.find('.calcTotalsAutoBind:visible').each(function(){
            var $b = $(this),
                k = $b.data('modelKey'),
                v = that.contMod.get(k);
            if(k&&v) { $b.text(that.fmt(v, k)); }

            // stale visual state
            $b[isStale ? 'addClass' : 'removeClass']('stale');
            $b.next('.currLabel')[isStale ? 'addClass' : 'removeClass']('stale');
            $b.closest('.totalDisp')[isStale ? 'addClass' : 'removeClass']('stale');
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

    /* **************************************************
        UI Actions - clicks etc.
    ***************************************************** */

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
        // we will not listen to the pax model changes as that woul be more
        // complicated than I'd like to get for this
        paxes.each(function(p) {
            p.set(k, v); // Model
            that.paxPaginatedView.getTextInputForPaxAndField(p.get('id'), k).val(v); // DOM
        });

        this._totalsAndMaxesAreStale = true;
        // manually trigger this update -- for single changes we get change:paxData
        this.updateTotalsAndMaxes();

        // AJAX - let server know we did same for all
        data = this.paxPaginatedView.prepareAjaxData(this.getPaxPaginatedViewParams());
        data.method = this.POST_METHODS.SAME_FOR_ALL;
        data.key = k;
        data.value = v;
        // we can use the fetch calc call cuz we might get new calcs back,
        // and we don't need to do much else special when server responds
        this.contMod.fetchCalcTotals_atn(data);
    },

    doCalcTotalsClick: function(e) {
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
        e.preventDefault();

        if(!this.paxPaginatedView.validate()) { return; } // there was an error

        data = this.paxPaginatedView.serializeForStruts(data);

        this.contMod.fetchCalcTotals_atn(data);
    },

    /* **************************************************
        Handlers - what to do when contestModel changes
    ***************************************************** */
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
        // set estimates
        this.contMod.setObjectiveEstimatedAchievmentPercent(parseInt(this.$el.find('#estimateSlider').val(),10));
        // reset this flag
        this._totalsAndMaxesAreStale = false;
        // update totals, maxes and estimates
        this.updateTotalsAndMaxes();
    },

    handleFetchParticipantsStart: function(params) {
        this.containerView.lockNav('ssiContestEditTabPayoutsViewATNpaxTable');
        this.containerView.lockPage();
    },

    handleFetchParticipantsSuccess: function(respData, params) {
        var isDraft = params.method === this.POST_METHODS.SAVE_AS_DRAFT;

        this.containerView.unlockNav('ssiContestEditTabPayoutsViewATNpaxTable');
        this.containerView.unlockPage();

        // handleSaveSuccess: function(serverData, fromStep, toStep, isDraft)
        this.trigger('saveSuccess', respData, params.fromStep, params.toStep, isDraft);
    },

    handleFetchParticipantsError: function(errs) {
        this.containerView.handleSaveError(errs);
    },

    handlePaxDataChange: function(a,b,c) {
        this._totalsAndMaxesAreStale = true;
        this.updateTotalsAndMaxes();
    },

    handlePaxTableRender: function() {
        this.updateCurrencyLabels();
    },


    /* **************************************************
        TAB FUNCTIONS - ContestEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function(goingDirection) {
        // fetch payout data (step specific)
        this.contMod.fetchPayoutData_atn();

        // refresh the paxes when we return to this tab, on first run the
        // view object will not exist yet
        if(this.paxPaginatedView) {
           this.paxPaginatedView.fetchParticipants({method: this.POST_METHODS.LOAD, goingDirection: goingDirection});
        }
    },

    // SSIContestPageEditView will use this on goFromStepToStep() instead of SSIContestModel.save()
    // here we will use the paginator fetch method to save evrerything on the page
    // (as it already does so on sorting and page num change)
    save: function(fromStep, toStep) {
        var wtv = this.containerView.wizTabs,
            isNotNext = toStep !== wtv.getTabAfterNamedTab(fromStep).get('name'); // are we going back?

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
        return {valid:true};
    },

    // number format
    fmt: function(num, key) {
        if(_.isNaN(num)) { return '--'; }

        return this.contMod.formatNumberForKey(num, key);
    }

});
