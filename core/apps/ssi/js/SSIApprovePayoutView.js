/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
_,
$,
G5,
console,
PageView,
TemplateManager,
ParticipantPaginatedView,
SSISharedHelpersView,
SSIContestModel,
SSIApprovePayoutCollection,
SSISharedPaginatedTableView,
SSIApprovePayoutView:true
*/

/**
 * Master page for all approve payout pages.
 *
 * This creates `SSISharedPaginatedTableView`s and handles the subtle
 * differences between the contest type payouts.
 *
 * @param {object} el - jQuery reference to element on page
 * @param {object} pageNav - information passed to `PageView`
 * @param {string} pageTitle - information passed to `PageView`
 * @param {object} contestData - information describing the current contest being viewed
 * @param {string} contestData.id - contest id
 * @param {string} contestData.contestType - contest type
 * @returns {object}
 */
SSIApprovePayoutView = PageView.extend({
    POST_METHODS: {
        // SAVE: 'save', // server: no data response + validate all pax data filled (next/back/tab)
        // SAVE_AS_DRAFT: 'saveAsDraft', // server save data + no full pax data validation
        LOAD: 'load', // server: no save, respond with default pax data list
        PAX_NAV: 'paxNav', // server: save all, respond with apropo page of pax data
        // CALC_TOTAL: 'calcTotal', // server: respond with totals only, validate for full pax data
        UPDATE_PAYOUT: 'updatePayout', // server will potentially clear certain fields, and return the first page of pax in def sort
        // SAME_FOR_ALL: 'sameForAll' // notify server that same for all was clicked with key/value pair
    },

    tplMap: {
        stepItUp: 'ssiApprovePayoutsTableSIUtpl',
        objectives: 'ssiApprovePayoutsTableObjectivestpl',
        doThisGetThat: 'ssiApprovePayoutsTableDTGTtpl',
        stackRank: 'ssiApprovePayoutsTableStackRanktpl'
    },

    urlMap: { /* needs to be set on init */ },

    events: {
        'click .promptBtn': 'makeApprovePrompt',
        'click .promptBtnCloseContest': 'makeCloseContestPrompt',
        'click .closePrompt': 'closePrompt',
        'click .closeContest':'postCloseContest',
        'click .authorizePayout': 'postPayoutApproval',
        'click .extractResults': 'downloadResults',
        'click .profile-popover': 'attachParticipantPopover',
        // stack rank
        'click .ssiViewContestDetails': 'showHidePayouts',
        'keyup .paxDatTextInput': 'updateOtherPageTotal'

    },

    initialize: function(opts) {
        'use strict';

        // urlMap is only ever used for front end testing. In reality,
        // G5.props.URL_JSON_SSI_APPROVE_PAYOUT_PARTICIPANTS is the only url ever used.
        this.urlMap = {
            objectives: G5.props.URL_JSON_SSI_APPROVE_PAYOUT_PARTICIPANTS_OBJECTIVES,
            stepItUp: G5.props.URL_JSON_SSI_APPROVE_PAYOUT_PARTICIPANTS_SIU,
            doThisGetThat: G5.props.URL_JSON_SSI_APPROVE_PAYOUT_PARTICIPANTS_DTGT,
            stackRank: G5.props.URL_JSON_SSI_APPROVE_PAYOUT_PARTICIPANTS_STACKRANK
        };

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

        SSIContestModel.reformatDecimalStrings(opts.contestData);

        this.model = new Backbone.Model(opts.contestData);

        this.tplPath = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';
        this.model.set('tpl', this.tplMap[opts.contestData.contestType]);

        var helpers = new SSISharedHelpersView(),
            otherPageTotal;

        this.request = _.bind(helpers.requestWrap, helpers);

        this.render();

        return this;
    },

    /**
     * A monster of a thing. This creates child views depending on the contest
     * and any special things that need to be done. I'm so sorry.
     *
     * [1] Do This Get That has a table for each activity, so it needs multiple tables.
     *
     * [2] Stack rank can have a weird one-off edittable mode when users have a tie,
     *     which adds a chunk of validation and server interaction.
     *
     * @returns {object}
     */
    render: function() {
        'use strict';

        console.log('[SSI] SSIApprovePayoutView render');

        // [1]
        if (this.model.get('contestType') === 'doThisGetThat') {
            return this.renderMultiple();
        }

        // [2]
        if (this.model.get('contestType') === 'stackRank' && this.model.get('hasTie')) {
            return this.renderEditable();
        }

        var modelData = this.model.toJSON(),

            collection = new SSIApprovePayoutCollection({
                dataURL: this.getUrlForData()
            });

        SSIContestModel.reformatDecimalStrings(modelData);

        this.historyTable = new SSISharedPaginatedTableView({
            tpl: this.model.get('tpl'),
            collection: collection,
            el: this.$el.find('#ssiApprovePayoutDynamicContent'),
            parentView: this,
            modelData: modelData
        });

        return this;
    },

    /**
     * Backend has a single end point for data, but front end needs unique
     * urls for each contest type.
     *
     * @returns {string}
     */
    getUrlForData: function () {
        'use strict';
        return this.urlMap[this.model.get('contestType')] || G5.props.URL_JSON_SSI_APPROVE_PAYOUT_PARTICIPANTS;
    },

    /**
     * Special scenerio for `doThisGetThat` contest type with multiple activity tables
     *
     * @returns {object}
     */
    renderMultiple: function () {
        'use strict';

        var that = this,
            modelData = this.model.toJSON(),
            externalSubTpls = null,
            /**
             * Changes SSISharedPaginatedTableView to render using captured sub templates
             * and add the activity id with pagination requests
             *
             * @extends SSISharedPaginatedTableView
             * @returns {object}
             */
            DTGTPaginatedTableView = SSISharedPaginatedTableView.extend({
                render: function () {
                    var html = externalSubTpls.tableSection(this.settings.toJSON());

                    this.subTpls = externalSubTpls;
                    this.$el.append(html);
                    // todo: fix to work with multiple tables
                    this.createPaginationView();
                    this.goToPage(1);
                    this.setSortArrows();

                    return this;
                },
                buildRequestData: function () {
                    var data = SSISharedPaginatedTableView.prototype.buildRequestData.apply(this, arguments);
                    data.activityId = this.settings.get('activityId');
                    return data;
                }
            });

        this.historyTable = [];

        SSIContestModel.reformatDecimalStrings(modelData);

            // render template, capture table sub template
            // create table for each activity
            TemplateManager.get(this.model.get('tpl'), _.bind(function(tpl, vars, subTpls) {
                var activities = this.model.get('activities'),
                    $content   = that.$el.find('#ssiApprovePayoutDynamicContent');

                $content.append(tpl(this.model.toJSON()));

                externalSubTpls = subTpls;

                if (this.model.get('hasQualifiedPayouts') === true){
                    _.each(activities, function (activity) {

                        var $div = $('<div>'),

                            collection = new SSIApprovePayoutCollection({

                                dataURL:  that.getUrlForData()
                            }),
                            table = new DTGTPaginatedTableView({
                                collection: collection,
                                el: $div,
                                parentView: that,
                                modelData: _.extend({}, activity, _.omit(modelData, 'activities'))
                            });

                        that.$el.find('#ssiApprovePayoutDynamicContent').append($div);
                        that.historyTable.push(table);

                    });
                }
                //gross, but quickest way to accomplish this for dtgt
                this.$el.find('.dtgtFormBtns').appendTo('#ssiApprovePayoutDynamicContent');
            }, this), this.tplPath);


        return this;
    },

    /**
     * Creates qtip when clicking on "Issue Payouts"
     *
     * @param {object} e - click event
     * @returns {object}
     */
    makeApprovePrompt: function(e) {
        'use strict';

        e.preventDefault();


        this.prompt = $(e.target).qtip({
            content: {
                text: this.$el.find('.promptContent').eq(0).clone()
            },
            hide: {
                event: false,
                delay: 200
            },
            position: {
                my: 'top left',
                at: 'bottom center',
                container: this.$el
            },
            show: {
                solo: true,
                event: 'click',
                ready: true

            },
            style: {
                classes: 'ui-tooltip-shadow ui-tooltip-light promptQtip',
                tip: {
                    corner: true,
                    width: 10,
                    height: 10
                }
            }
        });

        return this;
    },

    /**
     * Creates qtip when clicking on "Close Contest", available if there are no payouts.
     *
     * @param {object} e - click event
     * @returns {object}
     */
    makeCloseContestPrompt: function(e){
        var $tar = $(e.target);

        if(!$tar.data('qtip')) {

            $tar.qtip({
                content:{
                    text: this.$el.find('.promptContentClostContest')
                },
                position:{
                    my: 'top left',
                    at: 'bottom center',
                    container: this.$el,
                    viewport: $(window),
                    adjust: {
                        method: 'shift none'
                    }
                },
                show:{
                    event:'click',
                    ready:true
                },
                hide:{
                    event:false,
                    fixed:true,
                    delay:200
                },
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-light',
                    tip: {
                        corner: true,
                        width: 20,
                        height: 10
                    }
                }
            });
        }
    },

    /**
     * closes approve prompt
     *
     * @param {object} e - click event
     * @returns {object}
     */
    closePrompt: function(e) {
        'use strict';

        e.preventDefault();

        this.prompt.qtip().hide();

        return this;
    },

    downloadResults: function(e){
        var that = this;

        setTimeout(function(){
            window.location = that.addParam(G5.props.URL_SSI_APPROVE_PAYOUT_SUCCESS_REDIRECT, 'id=' + that.model.get('id'));
        }, 1000);
    },

    /**
     * Sends a message to the backend that payouts have been approved
     *
     * @param {object} e - event object
     * @returns {object}
     */
    postPayoutApproval: function(e) {
        'use strict';

        var that = this,
            $element = this.prompt.qtip().elements.tooltip;

        e.preventDefault();
        this.lockPrompt($element);

        G5.util.showSpin(this.$el);

        this.sendUpdatedData()
            .then(_.bind(function () {
                // if there is no tie, sendUpdatedData() resolves immediately and we have to make a specific ajax request here
                if (!this.model.get('hasTie')) {
                    $.ajax({
                        url: G5.props.URL_JSON_SSI_APPROVE_PAYOUT,
                        dataType: 'g5Json',
                        type: 'POST',
                        data: {
                            id: that.model.get('id')
                        }
                    })
                    .done( function( data ) {

                        G5.util.hideSpin(that.$el);
                        that.unlockPrompt($element);
                        that.closePrompt(e);

                        if( data.getSuccess().length ) {
                            that.$el.find('#ssiExtractResultsModal').modal('show');
                        }
                    })
                    .fail( function( jqXHR, textStatus, errorThrown ) {
                        alert(textStatus + ': ' + errorThrown);
                    });
                }
                // if there is a tie, the request was made in sendUpdatedData() and then eventually resolves and kicks us back
                // we show the modal in sendUpdatedData() but we unlock the UI here
                else {
                    G5.util.hideSpin(that.$el);
                    that.unlockPrompt($element);
                    that.closePrompt(e);
                }

            }, this));

        return this;
    },

    postCloseContest: function(e){
        var $form = this.$el.find('#ssiCloseContestForm'),
            btnVal = $(e.target).val(),
            action = $form.attr('action'),
            data = {closeContest:btnVal};

        e.preventDefault();

        $.ajax({
            dataType: 'g5json',
            type: 'POST',
            url: action,
            data: data,
            success: function (serverResp, textStatus, jqXHR) {
                //expecting server redirect
            }
        });

    },

    /**
     * Adds a GET parameter to the URL with ? or &
     *
     * @param {string} url - url, as it stands now
     * @param {string} param - parameter to be appended
     * @returns {string}
     */
    addParam: function (url, param) {
        'use strict';

        var hashed = url.split('#'),
            hash   = hashed[1] || '',
            parts  = (hashed[0] || '').split('?'),
            params = parts[1] || '',
            res    = [parts[0] || ''];

        if (params) {
            res.push('?', params, '&', param);
        } else {
            res.push('?', param);
        }

        if (hash) {
            res.push('#', hash);
        }

        return res.join('');
    },

    // lockPage: function () {
    lockPrompt: function ($prompt) {
        'use strict';

        $prompt.find('input, button').attr('disabled', 'disabled');

        return this;
    },

    // unlockPage: function () {
    unlockPrompt: function ($prompt) {
        'use strict';

        $prompt.find('input, button').attr('disabled', false);

        return this;
    },

    showHidePayouts: function(e){
        var $tar = $(e.target),
            $payoutsCont = this.$el.find('.payoutsWrap');

        e.preventDefault();

        $tar.hasClass('showDetails') ? $payoutsCont.slideDown() : $payoutsCont.slideUp();

        this.$el.find('.ssiViewContestDetails').toggle();
    },


    /*
                        .o8   o8o      .              .o8       oooo
                       "888   `"'    .o8             "888       `888
         .ooooo.   .oooo888  oooo  .o888oo  .oooo.    888oooo.   888   .ooooo.
        d88' `88b d88' `888  `888    888   `P  )88b   d88' `88b  888  d88' `88b
        888ooo888 888   888   888    888    .oP"888   888   888  888  888ooo888
        888    .o 888   888   888    888 . d8(  888   888   888  888  888    .o
        `Y8bod8P' `Y8bod88P" o888o   "888" `Y888""8o  `Y8bod8P' o888o `Y8bod8P'
    */

    /**
     * Returns a promise that will resolve immediately if there is _not_ a tie,
     * otherwise will POST the updated results and then resolve.
     *
     * @returns {object}
     */
    sendUpdatedData: function (updateType) {
        'use strict';

        var deferrer = new $.Deferred(),
            that = this;

        if (!this.model.get('hasTie')) {
            deferrer.resolve();
        } else {
            var data = {};

            if (this.paxPaginatedView) {
                _.extend(data, this.paxPaginatedView.prepareAjaxData());
                data = this.paxPaginatedView.serializeForStruts(data);
            }

            this.request({
                data: data,
                url: G5.props.URL_JSON_SSI_APPROVE_PAYOUT_UPDATE
            })
            .always(function () {
                deferrer.resolve();
            })
            .then(_.bind(function (resp) {

                this.updateTotalsRow(resp.data);

                if( resp.type == 'success' ) {
                    that.$el.find('#ssiExtractResultsModal').modal('show');
                }

            }, this),
            function (errObj) {
                console.warn('error', errObj.text);
            });
        }

        return deferrer.promise();
    },

    getPaxPaginatedViewParams: function () {
        'use strict';
        return {
            id: this.model.get('id')
        };
    },

    renderEditable: function () {
        'use strict';

        var ppvParams = this.getPaxPaginatedViewParams(),
            cm = this.model,
            ExtendedParticipantPaginatedView = ParticipantPaginatedView.extend({
                /**
                 * This view has some one-off validation. The payout description needs
                 * to be set only if the payout value is set. Since this isn't used anywhere
                 * else, it makes sense (to me, atleast) to have it in this place only.
                 *
                 * @param {object} $f - jQuery object for single element
                 * @returns {boolean}
                 */
                validateSingleField: function ($f) {
                    var pax = this.model.paxes.get($f.data('modelId'));

                    if ($f.data('model-key') === 'payoutDescription') {
                        // var sib = $f.parents('tr').find('input[data-model-key="payoutValue"]').val();
                        var sib = this.getTextInputForPaxAndField($f.data('modelId'), 'payoutValue');

                        if (sib.val() !== '0' && $f.val().length === 0) {
                            this.genericErrorTip('msgRequired', $f);
                            return false;
                        } else if (sib.val() === '0') {
                            $f.val('');
                        }

                        return true;
                    } else if ($f.data('model-key') === 'payoutValue') {
                        // not really validation, but what's one more weird choice?
                        var $desc = this.getTextInputForPaxAndField($f.data('modelId'), 'payoutDescription');

                        if ($f.val() === '0') {
                            $desc.val('');
                            pax.set('payoutDescription', '');
                            return true;
                        } else {
                            if ($desc.val().length === 0) {
                                this.genericErrorTip('msgRequired', $desc);
                                pax.set('payoutValue', $f.val());
                                return false;
                            } else {
                                return true;
                            }
                        }
                    } else {
                        return ParticipantPaginatedView.prototype.validateSingleField.apply(this, arguments);
                    }
                },
                /**
                 * There is a way to do this in ParticipantPaginatedView, BUT
                 * it involves preventing all the default behavior and doing it here.
                 * Look at SSIContestEditTabPayoutsView_siu for an example of that functionality.
                 *
                 * For our needs here, we just need to update additional values on the model
                 * before everything renders. This is the simplest way.
                 *
                 * @param {object} data - server response data
                 * @returns {object}
                 */
                processAjaxResponse: function (data) {

                    if (data.totalPayoutValue) {
                        this.model.set('totalPayoutValue', data.totalPayoutValue);
                    }

                    if (data.totalPayout) {
                        this.model.set('totalPayout', data.totalPayout);
                    }

                    SSIContestModel.reformatDecimalStrings(data);

                    // console.log('[SSI] renderEditable hijack fn -', data);
                    return ParticipantPaginatedView.prototype.processAjaxResponse.apply(this, arguments);
                }
            });

        this.paxPaginatedView = new ExtendedParticipantPaginatedView({

            el: this.$el.find('#ssiApprovePayoutDynamicContent'),
            // suppressAjax: true,
            model: this.model,
            // participantsUrl: this.urlMap.stackRank,
            participantsUrl: this.getUrlForData(),
            tplName: this.tplMap.stackRank,
            tplUrl: G5.props.URL_APPS_ROOT + 'ssi/tpl/',
            fetchParams: ppvParams,
            fetchParamsFunc: _.bind(this.getPaxPaginatedViewParams, this),
            sortChangeParams: {
                method: this.POST_METHODS.PAX_NAV
            },
            pageChangeParams: {
                method: this.POST_METHODS.PAX_NAV
            },
            delayFetch: true,// manually call the initial AJAX load of paxes
            // this function mixes information from this view with the
            // pagination view to validate all fields before they are
            // sent to the server
            validateBeforeFetch: function(paxes) {
                var res = {isValid: true, errors: []},
                    reqs = [];

                if(paxes.length===0) { return res; }

                // build list of required fields
                if(cm.get('payoutType')=='other') {
                //     reqs.push('payoutDescription');
                    reqs.push('payoutValue');
                } else {
                    reqs.push('payout');
                }

                //debugger

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

                    // payout description only has to be set when a value is being paid
                    if (cm.get('payoutType') === 'other' &&
                        p.get('payoutValue') !== '0' &&
                        !p.get('payoutDescription')) {
                            res.isValid = false;
                            res.errors.push({
                                pax: p,
                                field: 'payoutDescription',
                                errorType: 'required'
                            });
                    }
                });

                return res;
            },
            // sindle field validation type mapping
            validationTypeByKey: function(k) {
                if (k == 'payout' || k == 'payoutValue') {
                    return {type: 'whole'};
                } else {
                    return null;
                }
            },
            // extra data from outside the pax paginated view
            getJsonForTemplate: function() {
                var json = cm.toJSON();
                return json;
            }
        });// this.paxPaginatedView = ...

        this.paxPaginatedView.on('success:fetchParticipants', function(){
            //console.log('[SSI] paxPaginatedView - success:fetchParticipants')
            if (this.prompt) {
                this.prompt.qtip().show();
            }

            return this;
        },this);

        this.paxPaginatedView.on('renderedAndUpdated', this.updateOtherPageTotal, this);

        // now we have listeners, lets fetch our initial set of paxes
        this.paxPaginatedView.fetchParticipants({method: this.POST_METHODS.LOAD});

        return this;
    },

    /**
    * Grab the payout total from the JSON and subtract what is currently on the page.
    * This value will then be updated on keyup and sent to the table footer total.
    */
    updateOtherPageTotal: function(e){
        var $payoutTotal = this.$el.find('.totalDisp span').html(),
            $payoutInp = this.$el.find('.paxDatActivityVal'),
            sum = 0,
            newTotal;

        _.each($payoutInp, function(inp){
            if($(inp).val()){
                sum = parseInt($(inp).val(), 10) + sum;
            }
        });

        $payoutTotal = parseInt($payoutTotal.replace(/,/g, ''), 10) || 0;

        if(e){
            newTotal = (otherPageTotal + sum).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            this.$el.find('.totalDisp span').html(newTotal);

        } else {
            otherPageTotal = parseInt($payoutTotal, 10) - sum;

            newTotal = (otherPageTotal + sum).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            this.$el.find('.totalDisp span').html(newTotal);

            return otherPageTotal;
        }

    },

    /**
     * Updates the "totals" row in the footer of the table. Dirty replace with jQuery
     * rather than rerendering the whole table.
     *
     * @param {?} foo - foo description
     * @returns {object}
     */
    updateTotalsRow: function (data) {
        'use strict';

        var $tfoot = this.$el.find('tfoot');

        if (data && data.totalPayout) {
            $tfoot.find('[data-tplval="totalPayout"]').html(data.totalPayout);
            this.paxPaginatedView.model.set('totalPayout', data.totalPayout);
        }

        if (data && data.totalPayoutValue) {
            $tfoot.find('[data-tplval="totalPayoutValue"]').html(data.totalPayoutValue);
            this.paxPaginatedView.model.set('totalPayoutValue', data.totalPayoutValue);
        }

        return this;
    },

    attachParticipantPopover:function(e){
        'use strict';

        var $tar = $(e.target),
            isSheet = ($tar.closest('.modal-stack').length > 0) ? {isSheet: true} : {isSheet: false};

        if ($tar.is('img')){
            $tar = $tar.closest('a');
        }

        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $tar.participantPopover(isSheet).qtip('show');
        }
        e.preventDefault();
    }

});
