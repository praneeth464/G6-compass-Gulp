/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
ParticipantSearchView,
ParticipantPaginatedView,
SSIContestEditTabParticipantsManagersView:true
*/
SSIContestEditTabParticipantsManagersView = Backbone.View.extend({

    initialize: function(opts) {
        var cm = null;

        // SSIContestPageEditView parent container for this tab
        this.containerView = opts.containerView;
        this.contMod = this.containerView.contestModel;
        cm = this.containerView.contestModel;

        this.paginatedViews = [];

        // participant collection view (paginated)
        this.initPaxPaginatedView();

        if (cm.get('contestType') !== 'awardThemNow') {
            this.initManPaginatedView();
        } else {
            this.$el.find('.hideOnAwardThemNow').hide();
            this.$el.find('.showOnAwardThemNow').show();
            this.$el.find('.doSelectManagers').hide();
        }

        this.setupEvents();

        // everything starts up in the update() function
        // initialize is too soon to start the AJAX calls for data
        // we only want to start bothering the server when
        // users visit this step

    },

    events: {
        'click .doSelectManagers': 'doSelectManagers',
        'click .doSelectParticipants': 'activateParticipantsSec',

        'click .managerSearchTableWrapper .sortHeader': 'doManSearchTableSort',
        'click .managerSearchTableWrapper .participantSelectControl': 'doManSearchSelect',
        'click .managerSearchTableWrapper .selectAllBtn': 'doManSearchSelect',

        // ParticipantPaginatedView - snipe some events from this containing view
        'click #ssiParticipants .remParticipantControl': 'doRemParticipant',
        'click #ssiManagers .remParticipantControl': 'doRemManager'
    },

    setupEvents: function() {
        var cm = this.containerView.contestModel;

        cm.on('start:fetchTeamSearchFilters', this.handleTeamSearchFiltersStart, this);
        cm.on('end:fetchTeamSearchFilters', this.handleTeamSearchFiltersEnd, this);
        cm.on('success:fetchTeamSearchFilters', this.handleTeamSearchFiltersSuccess, this);

        cm.on('start:ajaxRemoveParticipant', this.handleAjaxParticipantStart, this);
        cm.on('end:ajaxRemoveParticipant', this.handleAjaxParticipantEnd, this);
        cm.on('success:ajaxRemoveParticipant', this.handleAjaxRemoveParticipant, this);
        cm.on('start:ajaxAddParticipant', this.handleAjaxParticipantStart, this);
        cm.on('end:ajaxAddParticipant', this.handleAjaxParticipantEnd, this);
        cm.on('success:ajaxAddParticipant', this.handleAjaxAddParticipant, this);

        cm.on('start:ajaxRemoveManager', this.handleAjaxManagerStart, this);
        cm.on('end:ajaxRemoveManager', this.handleAjaxManagerEnd, this);
        cm.on('success:ajaxRemoveManager', this.handleAjaxRemoveManager, this);
        cm.on('start:ajaxAddManager', this.handleAjaxManagerStart, this);
        cm.on('end:ajaxAddManager', this.handleAjaxManagerEnd, this);
        cm.on('success:ajaxAddManager', this.handleAjaxAddManager, this);

        cm.on('start:fetchManagersSearch', this.handleFetchManagersSearchStart, this);
        cm.on('end:fetchManagersSearch', this.handleFetchManagersSearchEnd, this);
        cm.on('success:fetchManagersSearch', this.renderManagersSearchTable, this);

        cm.on('sort:managersSearchResults', this.renderManagersSearchTable, this);

        this.eachPaginated(function (pView) {
            pView.model.on('change:recordsTotal', this.updateSectionConts, this);
        });
    },

    eachPaginated: function (fn) {
        try {
            _.each(this.paginatedViews, _.bind(fn, this));
        } catch (e) {}
    },

    // init pax search stuff
    initPaxSearch: function() {
        var cm = this.containerView.contestModel,
            extraParams = {};

        // for award them now
        if(this.contMod.get('awardThemNowStatus')) {
            extraParams.awardThemNowStatus = this.contMod.get('awardThemNowStatus');
        }

        // page level reference to participant search view
        this.paxSearchView = new ParticipantSearchView({
            el: this.$el.find('.paxSearchView'),
            selectMode: 'multiple',
            allowSelectAll: true, // turn on select all control
            presetFilters: this.paxPresetSearchFilters,
            extraParams: extraParams
        });

        this.paxSearchView.on('doParticipantSelectNoError', this.handlePaxSearchSelPax, this);
        this.paxSearchView.model.on('allParticipantsSelected', this.handlePaxSearchSelPax, this);

        // set the contestId in the search view model ajax params
        this.paxSearchView.model.ajaxParam('contestId', cm.get('id'));
        this.paxSearchView.model.ajaxParam('ssiContestClientState', cm.get('ssiContestClientState'));
    },

    initPaxPaginatedView: function() {
        var that = this;

        this.paxPaginatedView = new ParticipantPaginatedView({
            el: this.$el.find('#ssiParticipants'),
            participantsUrl: G5.props.URL_JSON_CONTEST_PARTICIPANTS,
            tplName: 'ssiParticipantsPaginatedView',
            fetchParamsFunc: function() {
                if(that.contMod.get('awardThemNowStatus')) {
                    return {awardThemNowStatus: that.contMod.get('awardThemNowStatus')};
                }
                return {};
            },
            delayFetch: true // manual call to start the fetch operation
        });

        this.paxPaginatedView.on('end:fetchParticipants', function(a,b,c) {
            if(!this._paxSearchViewVisibilityInit) {
                this.updatePaxSearchViewVisibility();
                this._paxSearchViewVisibilityInit = true;
            }
        }, this);

        this.paginatedViews.push(this.paxPaginatedView);
    },

    updatePaxSearchViewVisibility: function() {
        var psv = this.paxSearchView,
            ppv = this.paxPaginatedView,
            numPax;

        if(!psv || !ppv) { return; }

        numPax = ppv.getCount();
        psv[numPax <= 0 ? 'showView' : 'hideView']();
    },

    initManPaginatedView: function() {
        var that = this;

        this.manPaginatedView = new ParticipantPaginatedView({
            el: this.$el.find('#ssiManagers'),
            participantsUrl: G5.props.URL_JSON_CONTEST_MANAGERS,
            tplName: 'ssiParticipantsPaginatedView',
            fetchParamsFunc: function() {
                if(that.contMod.get('awardThemNowStatus')) {
                    return {awardThemNowStatus: that.contMod.get('awardThemNowStatus')};
                }
                return {};
            },
            delayFetch: true // manual call to start the fetch operation
        });

        this.paginatedViews.push(this.manPaginatedView);
    },

    handleTeamSearchFiltersStart: function() {
        this.$el.find('.paxManLoadSpinnerWrapper').show()
            .find('.paxManLoadSpinner').spin();
    },

    handleTeamSearchFiltersEnd: function() {
        this.$el.find('.paxManLoadSpinner').spin(false)
            .closest('.paxManLoadSpinnerWrapper').hide();
    },

    handleTeamSearchFiltersSuccess: function(data) {
        this.paxPresetSearchFilters = data.presetSearchFilters;
        this.initPaxSearch();
        this.initSections();
        this.containerView.updateBottomControls();
    },

    // init UI for different states of model (pax and managers populated or not)
    initSections: function() {
        var paxCount = this.paxPaginatedView.getCount(),
            manCount = this.manPaginatedView && this.manPaginatedView.getCount();

        // CASE: if we have paxes and managers available but none selected
        if(paxCount && !manCount && this.manPaginatedView) {
            this.doSelectManagers();
        }

        // CASE: if we have no paxes and no managers
        if(!paxCount && !manCount) {
            this.activateParticipantsSec();
        }

        this.updateSectionConts();
    },

    doSelectManagers: function(e) {
        var ppvParams = {
                contestId: this.containerView.contestModel.get('id'),
                ssiContestClientState : this.containerView.contestModel.get('ssiContestClientState')
            };

        if(e){e.preventDefault();}

        this.containerView.contestModel.fetchManagersSearch(); // all managers for selected paxes
        this.manPaginatedView.setFetchParams(ppvParams);
        this.manPaginatedView.fetchParticipants(); // paginated list of selected managers
    },

    activateParticipantsSec: function(e) {
        var $paxSec = this.$el.find('.participantsWrapper'),
            $manSec = this.$el.find('.managersWrapper');

        if(e){e.preventDefault();}

        $paxSec.slideDown(G5.ANIMATION_DURATION);
        $manSec.slideUp(G5.ANIMATION_DURATION);
    },

    activateManagersSec: function(e) {
        var $paxSec = this.$el.find('.participantsWrapper'),
            $manSec = this.$el.find('.managersWrapper');

        if(e){e.preventDefault();}

        $paxSec.slideUp(G5.ANIMATION_DURATION);
        $manSec.slideDown(G5.ANIMATION_DURATION);
    },

    handlePaxSearchSelPax: function(pax, $tar) {
        var paxIds;

        if(pax) { // if single
            if(pax.isSelected) {
               this.containerView.contestModel.ajaxAddParticipant(pax.id);
           } else {
               this.containerView.contestModel.ajaxRemoveParticipant(pax.id);
           }
        } else { // select all
            paxIds = this.paxSearchView.model.participants.pluck('id');
            this.containerView.contestModel.ajaxAddParticipant(paxIds);
        }

    },

    // remove participant control clicked
    doRemParticipant: function(e) {
        var $tar = $(e.target),
            paxId;

        $tar = $tar.hasClass('.remParticipantControl') ? $tar : $tar.closest('.remParticipantControl');
        paxId = $tar.data('participantId');

        this.containerView.contestModel.ajaxRemoveParticipant(paxId);
    },

    handleAjaxParticipantStart: function() {
        this.paxPaginatedView.spinLock();
    },

    handleAjaxParticipantEnd: function() {
        this.paxPaginatedView.spinLock(false);
    },

    handleAjaxRemoveParticipant: function(data, origParams) {
        var ppvPax = this.paxPaginatedView.model.paxes.get(origParams.paxIds[0]);
        //this.paxPaginatedView.removeParticipantById(origParams.paxIds[0]);
        this.paxPaginatedView.fetchParticipants();
        this.setCheckStateOnParticipantsSearchResult(ppvPax.get('userId'), false);
    },

    handleAjaxAddParticipant: function(data, origParams) {
        this.paxPaginatedView.fetchParticipants();
    },

    setCheckStateOnParticipantsSearchResult: function(id, checked) {
        this.paxSearchView.model.deselectParticipantInner(id, {silent: true});
    },

    // update UI state for buttons and things
    updateSectionConts: function() {
        var cm = this.containerView.contestModel,
            $paxSec = this.$el.find('.participantsWrapper'),
            $manSec = this.$el.find('.managersWrapper'),
            $selMan = $paxSec.find('.doSelectManagers'),
            paxCount = this.paxPaginatedView.getCount(),
            manCount = this.manPaginatedView ? this.manPaginatedView.getCount() : 0,
            isAwdThemNow = cm.get('contestType') !== 'awardThemNow';

        if (isAwdThemNow) {
            // select manager button state
            $selMan.prop('disabled', paxCount?false:true);
            $selMan[paxCount?'removeClass':'addClass']('disabled');
        }

        // select participants button state
        // * always available

        // lock down tab navigation if we don't have pax
        if(!paxCount) {
            this.containerView.lockNav('PaxManUpdateSectionConts',['next']);
        } else {
            this.containerView.unlockNav('PaxManUpdateSectionConts');
        }

        // pax count stuff on managersWrapper>paxSelectWrap
        $manSec.find('.showIfHasPax')[ paxCount ? 'show' : 'hide' ]();
        $manSec.find('.hideIfHasPax')[ paxCount ? 'hide' : 'show' ]();
        $manSec.find('.paxCountBind').text(paxCount);

        if(isAwdThemNow) {
            // manager count stuff on
            $paxSec.find('.showIfHasMan')[ manCount ? 'show' : 'hide' ]();
            $paxSec.find('.hideIfHasMan')[ manCount ? 'hide' : 'show' ]();
            $paxSec.find('.manCountBind').text(manCount);
        }
    },

    renderManagersSearchTable: function() {
        var cm = this.containerView.contestModel,
            manSearch = cm.managersSearchResults,
            managersForTpl = [],
            $manSearch = this.$el.find('.managerSearchTableWrapper'),
            $scrTable = $manSearch.find('.scrollTable'),
            $mstBody = $manSearch.find('tbody');

        $scrTable.height($scrTable.height()).css('visibility','hidden');

        // massage data, we might have _isChecked on the naked manager object
        manSearch.each( function(man) {
            var x = man.toJSON();
            x._isChecked = man._isChecked ? true : false;
            managersForTpl.push(x);
        });

        $mstBody.empty();

        if(manSearch.length===0) {
            $manSearch.append( $manSearch.find('table').data('msgNoResults') );
        } else {
            TemplateManager.get('manSearchRows', function(tpl) {
                $mstBody.append( tpl( {managers: managersForTpl} ) );
                $scrTable.height('100%').css('visibility', 'visible');
            });
        }

        this.updateManagersSearchTable();

    },

    handleFetchManagersSearchStart: function() {
        this.$el.find('.paxManSearchSpinnerWrapper').show()
            .find('.paxManSearchSpinner').spin();
    },

    handleFetchManagersSearchEnd: function() {
        this.$el.find('.paxManSearchSpinner').spin(false)
            .closest('.paxManSearchSpinnerWrapper').hide();
        this.activateManagersSec();
    },

    updateManagersSearchTable: function() {
        var mstModel = this.containerView.contestModel.managersSearchTableModel,
            $sc = this.$el.find('.managerSearchTableWrapper thead .sortControl');

        $sc.each(function(){
            var $t = $(this),
                s = $t.data('sort');
            // clear styles
            $t.closest('.sortHeader').removeClass('sorted');
            $t.removeClass('asc desc icon-sort-up icon-sort-down');
            // add styles to apropo
            if(s===mstModel.get('by')) {
                $t.closest('.sortHeader').addClass('sorted');
                $t.addClass(mstModel.get('asc')?'asc icon-sort-up':'desc icon-sort-down');
            }
        });

    },

    doManSearchTableSort: function(e) {
        var $tar = $(e.target),
            $s = $tar.hasClass('sortControl') ? $tar : $tar.find('.sortControl'),
            by = $s.data('sort'),
            stm = this.containerView.contestModel;

        e.preventDefault();
        stm.managersSearchTableSort(by);
    },

    spinManSearchAddCont: function(manId, isStop) {
        var $td = this.getManSearchSelContById(manId);

        $td.spin(typeof isStop==='undefined'||isStop);
    },

    spinManSearchAddAllCont: function(isStop) {
        var $aa = this.$el.find('.managerSearchTableWrapper .selectAllBtn');

        $aa.spin(typeof isStop==='undefined'||isStop);
    },

    doManSearchSelect: function(e) {
        var $tar = $(e.target),
            paxId = $tar.data('participantId'),
            cm = this.containerView.contestModel,
            paxIds;

        e.preventDefault();

        if(paxId) { // if single selected
            this.containerView.contestModel.ajaxAddManager(paxId);
        } else { // select all
            paxIds = cm.managersSearchResults.pluck('id');
            this.containerView.contestModel.ajaxAddManager(paxIds);
        }
    },

    // remove participant control clicked
    doRemManager: function(e) {
        var $tar = $(e.target),
            paxId;

        $tar = $tar.hasClass('.remParticipantControl') ? $tar :
            $tar.closest('.remParticipantControl');

        paxId = $tar.data('participantId');

        this.containerView.contestModel.ajaxRemoveManager(paxId);
    },

    handleAjaxManagerStart: function(params) {
        this.manPaginatedView.spinLock();

        if(params.id) {
            this.spinManSearchAddCont(params.id);
       } else if(params.ids) {
            this.spinManSearchAddAllCont();
       }
    },

    handleAjaxManagerEnd: function(params) {
        this.manPaginatedView.spinLock(false);

        if(params.id) {
            this.spinManSearchAddCont(params.id, false);
       } else if(params.ids) {
            this.spinManSearchAddAllCont(false);
       }
    },

    handleAjaxRemoveManager: function(data, origParams) {
        this.manPaginatedView.fetchParticipants();
        this.setCheckStateOnManagerSearchResult(origParams.paxIds[0], false);
    },

    handleAjaxAddManager: function(data, origParams) {

        // this was a single add
        if(origParams.paxIds.length == 1) {
            this.setCheckStateOnManagerSearchResult(origParams.paxIds[0], true);
        }
        // this was an "add all"
        else {
            this.setCheckStateOnManagerSearchResult(null, true);
        }

        // NOTE: what happens on add is not clear since the selected managers are paginated
        //       prepare for repeated discussions during QA about what to do in this
        //       situation

        // UPDATE the paginated table
        this.manPaginatedView.fetchParticipants();
    },

    //Set a/all manager search result as checked or unchecked
    setCheckStateOnManagerSearchResult: function(id, checked) {
        var msr = this.contMod.managersSearchResults,
            $td = id || id === 0 ?
            this.getManSearchSelContById(id) : // single
            this.$el.find('.managerSearchTableWrapper .manSearchSelCell'); // all

        $td.find('.participantSelectControl')[checked ? 'hide' : 'show']();
        $td.find('.deselTxt')[checked ? 'show' : 'hide']();

        // some model stuff, pretty dirty
        // so if the table is resorted (re rendered), it knows about the last check state
        // not putting it in BB Model attributes
        if(id || id === 0) {
            msr.get(id)._isChecked = checked;
        } else {
            msr.each( function(man) {
                man._isChecked = checked;
            });
        }
    },

    getManSearchSelContById: function(manId) {
        return $('.managerSearchTableWrapper #manSearchSelCell'+manId);
    },


    /* **************************************************
        TAB FUNCTIONS - ContestEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        var cm = this.containerView.contestModel,
            ppvParams = {
                contestId: this.containerView.contestModel.get('id'),
                ssiContestClientState : this.containerView.contestModel.get('ssiContestClientState')
            };

        // call to load participants and managers (if any)
        cm.fetchTeamSearchFilters();

        // manual call initial load of paxes
        this.eachPaginated(function (pView) {
            pView.setFetchParams(ppvParams);
        });
        // this.paxPaginatedView.setFetchParams(ppvParams);
        // this.manPaginatedView.setFetchParams(ppvParams);
        this.paxPaginatedView.fetchParticipants();

        // Set the name in UI
        this.$el.find('.defaultName').text(cm.getDefaultTranslationByName('names').text);

        this.updateSectionConts(); // may need to call this when returning to this tab after its been loaded once
        this.containerView.updateBottomControls();

    },

    // SSIContestPageEditView will use this on goFromStepToStep() instead of SSIContestModel.save()
    // we don't save anything and just trigger the save, so the parent view can take over
    // we do this because the data for this step is progressively saved, and we don't require validation at this juncture
    save: function(fromStep, toStep) {
        // no save, everything is updated for this page
        // trigger handleSave on parentview
        // handleSaveSuccess: function(serverData, fromStep, toStep, isDraft)
        this.trigger('saveSuccess', null, fromStep, toStep, false);
    },

    saveAsDraft: function() {
        this.trigger('saveSuccess', null, null, null, true);
    },

    // validate the state of elements within this tab
    validate: function() {
        return { valid: true };
    }

});
