/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SSIContestModel:true
*/
SSIContestModel = Backbone.Model.extend({

    ROLES: {
        CREATOR: "creator"
    },

    // Data Collection Types (for step 4 - data collection)
    DAT_COL_TYPE: {
        FORM: "claimSubmission",
        UPLOAD: "activityUpload"
    },

    /* POSSIBLE STATUSES */
    STATUSES: {
        DRAFT: "draft", //in draft mode
        WAITING: "waiting_for_approval", //contest is created and sent for approval
        DENIED: "denied", //contest has been denied
        PENDING: "pending", //contest is created and waiting for the start date to go LIVE
        LIVE: "live", //contest created and is LIVE
        CLOSED: "closed", //contest ended and creator has marked it as closed.
        FINALIZED: "finalize_results" // creator has finalized contest
    },

    ATN_STATUSES: {
        CREATE: "create",
        EDIT_INFO: "editInfo"
    },

    TYPES: { // these strings should match what comes from BE
        STEP_IT_UP: "stepItUp",
        STACK_RANK: "stackRank",
        DO_THIS_GET_THAT: "doThisGetThat",
        OBJECTIVES: "objectives",
        AWARD_THEM_NOW: "awardThemNow"
    },

    STEPS: [ // step names (names used in HTML and in VIEW, nums from BE)
        {order: 1, name: "stepInfo"},
        {order: 2, name: "stepParticipantsManagers"},
        {order: 3, name: "stepPayouts"},
        {order: 4, name: "stepDataCollection"},
        {order: 5, name: "stepPreview"}
    ],

    MAX_NUMBER_SIZE: 9999999999, // global max for Contest

    // fields to send to server on each step
    stepDataFields: {
        stepInfo: [
            "id",
            "ssiContestClientState",
            "status",
            "languages",
            "currentStep",
            "names",
            "startDate",
            "endDate",
            "tileStartDate",
            "descriptions",
            "documents",
            "includeMessage",
            "messages",
            "contestApprovers",
            // awardThemNow stepInfo has extra fields
            "billTo",
            "billToCode1",
            "billToCode2",
            "measureType",
            "currencyTypeId",
            "payoutType",
            "otherPayoutTypeId",
            "badgeId"
        ],

        stepParticipantsManagers: [
            "id",
            "ssiContestClientState",
            "status",
            "currentStep"
        ],

        stepPayouts_doThisGetThat: [
            "id",
            "ssiContestClientState",
            "status",
            "currentStep",
            "measureType",
            "currencyTypeId",
            "payoutType",
            "otherPayoutTypeId",
            "includeStackRanking",
            "includeBonus",
            "activities",
            "billTo",
            "billToCode1",
            "billToCode2"
        ],

        stepPayouts_stepItUp: [
            "id",
            "ssiContestClientState",
            "status",
            "currentStep",
            "activityDescription",
            "measureType",
            "currencyTypeId",
            "measureOverBaseline",
            "payoutType",
            "otherPayoutTypeId",
            "levels",
            "includeStackRanking",
            "includeBonus",
            "bonusForEvery",
            "bonusPayout",
            "bonusPayoutCap",
            "participants",
            "contestGoal",
            "billTo",
            "billToCode1",
            "billToCode2"
        ],

        stepPayouts_stackRank: [
            "id",
            "ssiContestClientState",
            "status",
            "currentStep",
            "activityDescription",
            "measureType",
            "currencyTypeId",
            "includeMinimumQualifier",
            "minimumQualifier",
            "payoutType",
            "otherPayoutTypeId",
            "stackRankingOrder",
            "ranks",
            "contestGoal",
            "billTo",
            "billToCode1",
            "billToCode2"
        ],

        stepDataCollection: [
            "id",
            "ssiContestClientState",
            "status",
            "currentStep",
            "collectDataMethod",
            "claimDeadlineDate",
            "isClaimApprovalRequired",
            "claimApprovers",
            "fields"
        ]
    },

    initialize: function(opts) {

        // managers search results
        this.managersSearchResults = new Backbone.Collection();
        // model for the manager search table sorting state
        this.managersSearchTableModel = new Backbone.Model({ by: 'lastName', asc: true });
        this.managersSearchTableSort('lastName', true);

        //singleton - anything can access from SSIContestModel.prototype.instance
        SSIContestModel.prototype.instance = this;
    },

    // sort the managers search table
    managersSearchTableSort: function(by, isAsc) {
        var stm = this.managersSearchTableModel;

        if(stm.get('by')===by) {
            stm.set('asc',!stm.get('asc'));
        } else {
            stm.set('by',by);
            stm.set('asc',true);
        }

        if(typeof isAsc !== 'undefined') { stm.set('asc', isAsc); }

        this.managersSearchResults.comparator = function(a,b) {
            var by = stm.get('by'),
                comp = a.get(by) > b.get(by) ? 1 : -1;

            return stm.get('asc') ? comp : -comp;
        };
        this.managersSearchResults.sort();
        this.trigger('sort:managersSearchResults');
    },

    // return the current step name
    getCurrentStepName: function() {
        return this.getStepNameByNumber(this.get('currentStep'));
    },

    getStepNameByNumber: function(num) {
        var s =  _.find(this.STEPS, function(x){return x.order === num;});
        return s?s.name:false;
    },

    setStepByName: function(name) {
        var s = _.find(this.STEPS, function(x){return x.name === name;});
        if(s){
            this.set('currentStep',s.order);
        }
    },


    // **************************************
    // DATA
    // **************************************
    addNewNameTranslation: function() {
        // have we maxed out on langs or have _isNew present already? return
        if(this.get('names').length === this.get('languages').length ||
            _.where(this.get('names'), { _isNew:true } ).length ) {
            return;
        }

        this.get('names').push({
            text: "",
            language: null,
            _isNew: true
        });
        this.trigger('add:nameTranslation');
    },

    setNameTranslationByLang: function(txt, lang) {
        var langMatch = _.where(this.get('names'), {language:lang}),
            newMatch = _.where(this.get('names'), {_isNew:true});

        if(langMatch.length) { // exists
            langMatch[0].text = txt;
            return; // exit
        }

        if(newMatch.length) { // is new
            delete newMatch[0]._isNew;
            newMatch[0].text = txt;
            newMatch[0].language = lang;
            return; // exit
        }

        // else its new, default
        this.get('names').push({text: txt, language: lang});
    },

    setNameUniqueStatusByLang: function(isUnique, lang) {
        var langMatch = _.where(this.get('names'), {language: lang});

        if(langMatch.length) {
            langMatch[0]._wasUnique = isUnique;
        }
    },

    setSelectedApprovers: function(levelId, approverIds) {
        var lev = _.where(this.get('contestApprovers'), {id: levelId}),
            apps = null;

        apps = lev?lev[0].approvers:null;

        _.each(apps, function(a){
            a.selected = _.contains(approverIds, a.id+"");
        });
    },

    addDocument: function(docObj) {
        var docs = this.get('documents');

        if(docObj._isNew) { // its new, maybe
            docs = _.reject(docs, function(x){return x._isNew;});
        } else {
            // remove any existing with this langId
            docs = _.reject(docs, function(x){return x.language === docObj.language;});
        }

        // docs with a URL or name are not new
        if(docObj.url && docObj._isNew || docObj.name && docObj._isNew) { delete docObj._isNew; }

        // add new to array
        docs.push(docObj);

        // set the new array
        this.set('documents', docs);
    },

    addNewDocTranslation: function() {
        this.get('documents').push({
            language: null,
            id: null,
            name: null,
            url: null,
            originalFilename: null,
            _isNew: true // mark as new, not saved to server
        });

        this.trigger('add:documentTranslation');
    },

    setDocumentTranslationNameByLang: function(name, lang) {
        var match = _.where(this.get('documents'), {language: lang});

        if(match.length) { // exists
            match[0].name = name;
        } else { // new
            this.addDocument({
                language: lang,
                id: null,
                name: name,
                url: null,
                originalFilename: null,
                _isNew: true
            });
        }
    },

    remDefaultDocumentTranslation: function() {
        this.remDocumentTranslationByLang(this.get('defaultLanguage'));
    },

    remDocumentTranslationByLang: function(lang) {
        var docs = this.get('documents');

        // remove the doc with this name from docs
        docs = _.reject(docs, function(d) {
            return d.language === lang;
        });

        this.set('documents', docs);
    },

    addNewDescTranslation: function() {
        this.addNewGenericTranslation('descriptions');
    },

    setDescriptionTranslationTextByLang: function(text, lang) {
        this.setGenericTranslationTextByLang(text, lang, 'descriptions');
    },

    addDescription: function(descObj) {
        this.addGenericTranslation(descObj, 'descriptions');
    },

    addNewMessageTranslation: function() {
        this.addNewGenericTranslation('messages');
    },

    setMessageTranslationTextByLang: function(text, lang) {
        this.setGenericTranslationTextByLang(text, lang, 'messages');
    },

    addMessage: function(descObj) {
        this.addGenericTranslation(descObj, 'messages');
    },

    addNewGenericTranslation: function(name) {
        // have we maxed out on langs or have _isNew present already? return
        if(this.get(name).length === this.get('languages').length ||
            _.where(this.get(name),{_isNew:true}).length ) {
            return;
        }

        this.get(name).push({
            language: null,
            text: null,
            _isNew: true // mark as new, not saved to server
        });
        this.trigger('add:translation:'+name);
    },

    setGenericTranslationTextByLang: function(text, lang, name) {
        var match = _.where(this.get(name), {language: lang});

        if(match.length) { // exists
            match[0].text = text;
        } else { // new
            this.addGenericTranslation({
                language: lang,
                text: text,
                _isNew: true
            }, name);
        }
    },

    addGenericTranslation: function(obj, name) {
        var arr = this.get(name);

        if(obj._isNew) { // its new, maybe
            arr = _.reject(arr, function(x){return x._isNew;});
        } else {
            // remove any existing with this langId
            arr = _.reject(arr, function(x){return x.language === obj.language;});
        }

        // docs with text
        if(obj.text && obj._isNew) { delete obj._isNew; }

        // add new to array
        arr.push(obj);

        // set the new array
        this.set(name, arr);
    },

    // add a manager from manager search results to managers
    getManagerFromSearchById: function(id) {
        var m = this.managersSearchResults.get(id);
        return m;
    },

    setBillTo: function(v) {
        // whenever bt changes and is not 'other', clear codes
        if(v != 'other') {
            this.set('billToCode1', null);
            this.set('billToCode2', null);
        }

        this.set('billTo',v);
    },

    getDefaultCurrency: function() {
        var defCurr = _.where(this.get('currencyTypes'), {id: 'usd'});

        defCurr = defCurr.length ? defCurr[0] : this.get('currencyTypes')[0];

        return defCurr;
    },

    setMeasureType: function(mt) {
        var defCurr = this.getDefaultCurrency();

        if(mt==='units') {
            this.set('currencyTypeId', null);
        } else {
            this.set('currencyTypeId', defCurr.id);
            // other should always be in sync
            this.setOtherPayoutTypeId( defCurr.id );
        }

        this.set('measureType',mt);
    },

    setCurrencyTypeId: function(ctId) {
        this.set('currencyTypeId', ctId);
        this.trigger('currencyTypeIdChanged');
        // other should always be in sync
        this.setOtherPayoutTypeId(ctId);
    },

    getActiveCurrencyType: function() {
        var match = null;

        if(this.get('measureType')=='currency' && this.get('currencyTypeId')) {
            match = _.where(this.get('currencyTypes'), {id:this.get('currencyTypeId')});
            return match.length ? match[0] : null;
        }
        return null;
    },

    setPayoutType: function(pt) {
        this.set('payoutType', pt);

        if(pt!=='other') {
            this.set('otherPayoutTypeId', null);
        } else {
            // set this the same as currencyTypeId if it is set
            this.set('otherPayoutTypeId', this.get('currencyTypeId') || this.getDefaultCurrency().id);
            // set includeBonus to false
            this.set('includeBonus', false);
            // if pt is other, blast away bill to stuff
            this.set('billTo', null);
            this.set('billToCode1', null);
            this.set('billToCode2', null);
        }
    },

    setOtherPayoutTypeId: function(ptId) {
        if(this.get('payoutType') === 'other') {
            this.set('otherPayoutTypeId', ptId);
        } else {
            this.set('otherPayoutTypeId', null);
        }
    },

    getActiveOtherCurrencyType: function() {
        var match = null;

        if(this.get('payoutType')=='other' && this.get('otherPayoutTypeId')) {
            match = _.where(this.get('currencyTypes'), {id:this.get('otherPayoutTypeId')});
            return match.length ? match[0] : null;
        }
        return null;
    },

    payoutsIsUsingBadges: function() {
        return this.get('optionShowBadges')&&this.get('badges')&&this.get('badges').length;
    },

    setSameActivityDescriptionForAll: function(val) {
        var isTrue = val === true || val.toLowerCase() == "true";

        if(!isTrue) {
            this.set('activityDescription', null);
            this.setIncludeStackRanking(false);
        }
        this.set('sameActivityDescriptionForAll', isTrue);
    },

    setIncludeStackRanking: function(isTrue) {
        if(!isTrue) {
            this.set('stackRankingOrder', null);
        } else {
            this.set('stackRankingOrder', 'desc');
        }

        this.set('includeStackRanking', isTrue);
    },

    setObjectivesEstimates: function(percent) {
        // do calcs
        this.set('estMaxPayout', (percent*this.get('maxPayout'))/100 );
        this.set('estBonusPayout', (percent*this.get('maxPayoutWithBonus'))/100 );
        this.set('estMaxPotential', (percent*this.get('maxPotential'))/100 );
    },

    // set the estimates and contestGoal based on the percent slider
    setObjectiveEstimatedAchievmentPercent: function(percent) {
        var estMaxPot;
        // set default percent if percent NaN
        if(_.isNaN(percent)) { percent = 100; } // default
        this.set('estimatedAchievementPercent', percent);

        // estimates
        this.setObjectivesEstimates(percent);
        estMaxPot = this.get('estMaxPotential');

        // now goal gets the value of estMaxPotential
        if(estMaxPot) {
            this.set('contestGoal', this.roundMeasureNumber(estMaxPot), {silent:true});
        }
    },

    // set the estimates based on the value entered into contestGoal
    setObjectivesContestGoalRelatedFields: function() {
        var percent = this.getContestGoalAsPercentOfMaxPotential();
        this.setObjectivesEstimates(percent);
    },

    getContestGoalAsPercentOfMaxPotential: function() {
        // find what percent of the maxPotential the current contestGoal value is
        return Math.round(100 * (Math.round(this.get('contestGoal')) / Math.round(this.get('maxPotential'))));
    },

    roundMeasureNumber: function(n) {
        // for rounding of contestGoal
        var z = this.get('measureType') == 'units' ? 10000 : 100;

        return Math.round( n * z) / z;
    },

    setMeasureOverBaseline: function(value) {
        // if value is percent, make sure bonus and its fields are clear
        if(value == 'percent') {
            // set includeBonus to false
            this.setIncludeBonus(false);
        }

        this.set('measureOverBaseline', value);
    },

    setIncludeBonus: function(isTrue) {
        if(!isTrue) {
            this.set('bonusForEvery', '');
            this.set('bonusPayout', '');
            this.set('bonusPayoutCap', '');
        }

        this.set('includeBonus', isTrue);
    },

    setIncludeMinimumQualifier: function(imq) {
        if(imq == 'no') {
            this.set('minimumQualifier', '');
        }

        this.set('includeMinimumQualifier', imq);
    },


    // **************************************
    // AJAX
    // **************************************
    // single place to set any umbrella variables needed for ajax requests
    addRequiredDataFields: function(data) {
        var req = {};

        if(typeof data === 'string') { return data; }

        if(this.get('id')) {
            req.contestId = this.get('id');
        }

        if(this.get('ssiContestClientState')) {
            req.ssiContestClientState = this.get('ssiContestClientState');
        }

        // for ATN, BE needs this passed
        if(this.TYPES.AWARD_THEM_NOW == this.get('contestType') && this.get('awardThemNowStatus')) {
            req.awardThemNowStatus = this.get('awardThemNowStatus');
        }

        return _.extend({}, req, data);
    },

    checkContestName: function(name, lang) {
        var that = this,
            url = G5.props.URL_JSON_CONTEST_CHECK_NAME,
            request,
            data = this.addRequiredDataFields({
                contestName: name,
                language: lang
            });

        this.trigger('start:checkName', lang);

        request = $.ajax({
            url : url,
            type : 'post',
            data : data,
            dataType : 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR) {
            var err = serverResp.getFirstError();
            if(err) {
                that.setNameUniqueStatusByLang(false, lang);
                that.trigger('error:checkName', err.text, lang);
                that.trigger('error:genericAjax', err);
            } else {
                that.setNameUniqueStatusByLang(true, lang);
                that.trigger('success:checkName', lang);
            }
        });

        request.fail(function(jqXHR, textStatus, errorThrown) {
            var errors;
            console.error('[ERROR] SSIContestModel: ajax call to check contest name ['+name+']', jqXHR, textStatus, errorThrown);
            // struts returns full HTML for FORM VALIDATION - BOOO!
            if(textStatus=='parsererror') {
                errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                if(errors) {
                    that.trigger('error:genericAjax', errors);
                }
            }
        });

        request.always(function(x, textStatus, y) {
            that.trigger('end:checkName', lang);
        });

    },

    fetchApprovers: function() {
        var that = this,
            url = G5.props.URL_JSON_CONTEST_APPROVERS,
            request;

        if(this._approversFetched || !this.get('contestApprovalRequired')) { return; }

        this.trigger('start:fetchApprovers');

        request = $.ajax({
            url: url,
            type: 'post',
            data: this.addRequiredDataFields({}),
            dataType: 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR){
            var err = serverResp.getFirstError();

            if(err) {
                that.trigger('error:fetchApprovers', err.text);
                that.trigger('error:genericAjax', err);
            } else {
                that.trigger('success:fetchApprovers');
                that.set('contestApprovers', serverResp.data.contestApprovers);
            }
        });

        request.fail(function(jqXHR, textStatus, err){
            var errors;
            console.error('[ERROR] SSIContestModel: ajax fetch approvers fail', jqXHR, textStatus, err);
            // struts returns full HTML for FORM VALIDATION - BOOO!
            if(textStatus=='parsererror') {
                errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                if(errors) {
                    that.trigger('error:genericAjax', errors);
                }
            }
        });

        request.always(function(x,y,z){
            that.trigger('end:fetchApprovers');
            that._approversFetched = true;
        });
    },

    fetchTranslationsNames: function() {
        this.fetchTranslations(G5.props.URL_JSON_CONTEST_TRANS_NAMES,'names');
    },

    fetchTranslationsDocuments: function() {
        this.fetchTranslations(G5.props.URL_JSON_CONTEST_TRANS_DOCUMENTS,'documents');
    },

    fetchTranslationsDescriptions: function() {
        this.fetchTranslations(G5.props.URL_JSON_CONTEST_TRANS_DESCRIPTIONS,'descriptions');
    },

    fetchTranslationsMessages: function() {
        this.fetchTranslations(G5.props.URL_JSON_CONTEST_TRANS_MESSAGES,'messages');
    },

    fetchTranslations: function(url, name) {
        var that = this,
            request;

        this.trigger('start:fetchTranslations:'+name);


        if(this.get(name+'TranslationCount') <= this.get(name).length) {
            that.trigger('end:fetchTranslations:'+name);
            return;
        }

        request = $.ajax({
            url: url,
            type: 'post',
            data: this.addRequiredDataFields({}),
            dataType: 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR){
            var err = serverResp.getFirstError(),
                clean = null,
                toAdd = [];

            if(err) {
                that.trigger('error:fetchTranslations:'+name, err.text);
                that.trigger('error:genericAjax', err);
            } else {
                that.trigger('success:fetchTranslations:'+name);
                // if we have any langs already in FE, remove them (we may have edited them)
                clean = _.reject(serverResp.data[name], function(o){
                    var hasLang = _.where(that.get(name),{language:o.language});
                    if(hasLang.length) {
                        toAdd.push(hasLang[0]);// store existing to add in
                    }
                    return hasLang.length?true:false;// return true to reject this
                });
                that.set(name, _.union(clean,toAdd));
            }
        });

        request.fail(function(jqXHR, textStatus, err){
            var errors;
            console.error('[ERROR] SSIContestModel: ajax fetch translations for '+name+' fail', jqXHR, textStatus, err);
            // struts returns full HTML for FORM VALIDATION - BOOO!
            if(textStatus=='parsererror') {
                errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                if(errors) {
                    that.trigger('error:genericAjax', errors);
                }
            }
        });

        request.always(function(x,y,z){
            that.trigger('end:fetchTranslations:'+name);
        });
    },

    // fetch list of managers for given set of pax
    fetchManagersSearch: function() {
        var that = this,
            url = G5.props.URL_JSON_CONTEST_MANAGERS_SEARCH,
            request;

        this.trigger('start:fetchManagersSearch');

        request = $.ajax({
            url: url,
            type: 'post',
            data: this.addRequiredDataFields({}),
            dataType: 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR){
            var err = serverResp.getFirstError();

            if(err) {
                that.trigger('error:fetchManagersSearch', err.text);
                that.trigger('error:genericAjax', err);
            } else {

                if(serverResp.data.participants) {
                    that.managersSearchResults.reset(serverResp.data.participants);
                }

                that.trigger('success:fetchManagersSearch', serverResp.data);
            }
        });

        request.fail(function(jqXHR, textStatus, err){
            var errors;
            console.error('[ERROR] SSIContestModel: ajax fetch managers search fail', jqXHR, textStatus, err);
            // struts returns full HTML for FORM VALIDATION - BOOO!
            if(textStatus=='parsererror') {
                errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                if(errors) {
                    that.trigger('error:genericAjax', errors);
                }
            }
        });

        request.always(function(x,y,z){
            that.trigger('end:fetchManagersSearch');
        });
    },

    // fetch team search filters
    fetchTeamSearchFilters: function() {
        var url = G5.props.URL_JSON_CONTEST_TEAM_SEARCH_FILTERS,
            params = {};

        this.fetchGeneric('fetchTeamSearchFilters', url, params, true);
    },

    // call the server to remove a participant
    ajaxRemoveParticipant: function(paxId) {
        var url = G5.props.URL_JSON_CONTEST_PARTICIPANT_REM,
            params = {paxIds: [paxId]};

        this.fetchGeneric('ajaxRemoveParticipant', url, params, false);
    },

    // call the server to add a participant
    ajaxAddParticipant: function(paxId) {
        var url = G5.props.URL_JSON_CONTEST_PARTICIPANT_ADD,
            params = {};

        params.paxIds = _.isArray(paxId) ? paxId : [paxId];

        this.fetchGeneric('ajaxAddParticipant', url, params, false);
    },

    // call the server to remove a manager
    ajaxRemoveManager: function(paxId) {
        var url = G5.props.URL_JSON_CONTEST_MANAGER_REM,
            params = {paxIds: [paxId]};

        this.fetchGeneric('ajaxRemoveManager', url, params, false);
    },

    // call the server to add a manager
    ajaxAddManager: function(paxId) {
        var url = G5.props.URL_JSON_CONTEST_MANAGER_ADD,
            params = {};

        params.paxIds = _.isArray(paxId) ? paxId : [paxId];

        this.fetchGeneric('ajaxAddManager', url, params, false);
    },

    fetchPayoutData_objectives: function() {
        var url = G5.props.URL_JSON_CONTEST_PAYOUT_DATA_OBJECTIVES,
            onSucc = null,
            that = this,
            params = {};

        params.recordsTotal = this.get('recordsTotal');

        onSucc = function(dat) {
            if(dat.contestJson&&dat.contestJson.currencyTypes) {
                that.set(dat.contestJson);
            }
        };

        this.fetchGeneric('fetchPayoutData_objectives', url, params, false, onSucc);
    },

    fetchCalcTotals_objectives: function(params) {
        var url = this.get('nextUrl'),
            onSucc = null,
            that = this;

        onSucc = function(dat) {
            if(dat.contestJson) { that.set(dat.contestJson); }
        };

        this.fetchGeneric('fetchCalcTotals_objectives', url, params, false, onSucc);
    },

    fetchPayoutData_atn: function() {
        // todo: is this needed?
        // var url = G5.props.URL_JSON_CONTEST_PAYOUT_DATA_OBJECTIVES,
        var url = G5.props.URL_JSON_CONTEST_PAYOUT_DATA_ATN,
            onSucc = null,
            that = this;

        onSucc = function(dat) {
            // if(dat.contestJson&&dat.contestJson.currencyTypes) {
            if(dat.contestJson) {
                that.set(dat.contestJson);
            }
        };

        this.fetchGeneric('fetchPayoutData_atn', url, {}, false, onSucc);
    },

    fetchCalcTotals_atn: function(params) {
        var url = this.get('nextUrl'),
            onSucc = null,
            that = this;

        onSucc = function(dat) {
            if(dat.contestJson) { that.set(dat.contestJson); }
        };

        this.fetchGeneric('fetchCalcTotals_atn', url, params, false, onSucc);
    },

    fetchPayoutData_dtgt: function() {
        var url = G5.props.URL_JSON_CONTEST_PAYOUT_DATA_DTGT,
            onSucc = null,
            that = this;

        onSucc = function(dat) {
            if(dat.contestJson&&dat.contestJson.currencyTypes) {
                that.set(dat.contestJson);
            }
        };

        this.fetchGeneric('fetchPayoutData_dtgt', url, {}, false, onSucc);
    },

    fetchPayoutData_siu: function() {
        var url = G5.props.URL_JSON_CONTEST_PAYOUT_DATA_SIU,
            onSucc = null,
            that = this;

        onSucc = function(dat) {
            if(dat.contestJson&&dat.contestJson.currencyTypes) {
                that.set(dat.contestJson);
                // make sure measureOverBaseline is set
                if(!that.get('measureOverBaseline')) {
                    that.set('measureOverBaseline', 'no');
                }
            }
        };

        this.fetchGeneric('fetchPayoutData_siu', url, {}, false, onSucc);
    },

    // handle most interactions on SiU payout step
    ajaxPayoutStepSiU: function(method, params) {
        var url = this.get('nextUrl'),
            onSucc = null;

        params = _.extend(
            {method: method},
            params||{},
            this.cleanupJsonForStep('stepPayouts_stepItUp', this.toJSON())
         );

        this.fetchGeneric('ajaxPayoutStepSiU', url, params, false, onSucc);
    },

    fetchPayoutData_sr: function() {
        var url = G5.props.URL_JSON_CONTEST_PAYOUT_DATA_SR,
            onSucc = null,
            that = this;

        onSucc = function(dat) {
            if(dat.contestJson) {
                that.set(dat.contestJson);
            }
        };

        this.fetchGeneric('fetchPayoutData_sr', url, {}, false, onSucc);
    },

    fetchDataCollectionStepData: function() {
        var url = G5.props.URL_JSON_SSI_CONTEST_TAB_DATA_COLLECTION,
            that = this;

        function onSucc(dat) {
            if(dat.contestJson) {
                that.set(dat.contestJson);
            }
        }

        this.fetchGeneric('fetchDataCollectionStepData', url, {}, false, onSucc);
    },

    fetchPreviewData: function(){
        var url = G5.props.URL_JSON_SSI_CONTEST_TAB_PREVIEW,
            onSucc = null,
            that = this;

        onSucc = function(dat) {
            if(dat) {
                that.set(dat);
            }
        };

        this.fetchGeneric('fetchPreviewData', url, {}, false, onSucc);
    },

    awardThemNowAjax: function(method) {
        var url = this.get('nextUrl'),
            dat = {method: method};

        // this happens on the info step (step 1)
        if(method == 'saveAtn') {
            dat = _.extend(dat, this.toJson_stepInfo());
        }

        this.fetchGeneric('awardThemNowAjax', url, dat, false);
    },

    // generic fetch function
    fetchGeneric: function(fetchKey, url, params, isCache, onSucc) {
        var that = this,
            dat,
            request;

        // if caching and we set the cache flag true, just return
        if(isCache && this['_'+fetchKey+'Fetched']) { return; }

        this.trigger('start:'+fetchKey, params);

        if (_.isString(params)) {
            dat = params;
        } else {
            // stringify & add required fields
            dat = $.param(this.addRequiredDataFields(params));
        }

        // cleanup arrays for struts
        dat = this.queryStringForStruts(dat);

        request = $.ajax({
            url: url,
            type: 'post',
            data: dat,
            dataType: 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR){
            var err = serverResp.getFirstError();

            if(err) {
                that.trigger('error:'+fetchKey, err.text);
                that.trigger('error:genericAjax', err);
            } else {
                if(onSucc) { onSucc(serverResp.data); }
                that.trigger('success:'+fetchKey, serverResp.data, params);
            }
        });

        request.fail(function(jqXHR, textStatus, err){
            var errors;

            console.error('[ERROR] SSIContestModel: fechGeneric-'+fetchKey+' fail', jqXHR, textStatus, err);
            // struts returns full HTML for FORM VALIDATION - BOOO!
            if(textStatus=='parsererror') {
                errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                if(errors) {
                    that.trigger('error:genericAjax', errors);
                }
            }

        });

        request.always(function(x,y,z){
            that.trigger('end:'+fetchKey, params);

            if(isCache) { that['_'+fetchKey+'Fetched'] = true; }
        });
    },


    // **************************************
    // UTIL
    // **************************************
    // inject languages into each translation obj in a cloned translation array
    prepareTranslationsArray: function(transName) {
        var trans = _.map(this.get(transName), _.clone),//clone
            defLang = this.get('defaultLanguage'),
            langs = this.get('languages');

        // remove default lang
        trans = _.reject(trans, function(n){ return defLang === n.language; });


        // set the translation option langs for each trans
        _.each(trans, function(t,idx){
            var opts = _.map(langs, _.clone),//clone
                actLang = null;

            // remove def lang
            opts = _.reject(opts, function(o){ return o.id === defLang; });

            // remove existing langs
            opts = _.reject(opts, function(o){
                // is o.id in translations already?
                var existing = _.find(trans, function(x){
                    return x.language === o.id;
                });

                return existing?true:false;
            });

            // add isSelected flag to selected lang obj
            if(t.language) {
                actLang = _.clone(_.find(langs, function(o){ return o.id === t.language; }));
                actLang.isSelected = true;
            }

            // populate a variable in the translation for the drop-down list of langs
            t.langs = opts; // for new translations
            t.langName = actLang?actLang.name:null; // for existing translations

            // add an index
            t.index = idx+1;
        });

        // order alpha by lang name
        trans = _.sortBy(trans,'langName');

        return trans;
    },

    getDefaultTranslationByName: function(transName) {
        var trans = this.get(transName),
            defLang = this.get('defaultLanguage'),
            defName = null;

        // get def name
        defName = _.where(trans, {language: defLang});
        defName = defName.length?defName[0]:'';

        return defName;
    },

    isDefLang: function(lang) {
        return this.get('defaultLanguage')===lang;
    },

    //VALIDATIONS
    validateDocDispNames: function() {
        var valid = true;

        _.each(this.get('documents'), function(d){
            if(d.url && !d.name) {
                valid = false;
            }

            valid = valid&&true;
        });
        return valid;
    },

    validateApprovers: function() {
        var valid = true;

        if(!this.get('contestApprovalRequired')){ return true; }

        _.each(this.get('contestApprovers'), function(lev){
            var levSelCnt = 0;

            _.each(lev.approvers, function(a){
                levSelCnt = a.selected ? levSelCnt+1 : levSelCnt;
            });

            valid = valid&&levSelCnt>0;
        });
        return valid;
    },

    validateNames: function() {
        var valid = true;

        _.each(this.get('names'), function(n){
            // _wasUnique = undefined means it was never checked and is still what came from server
            // _wasUnique = true means it was changed and the server accepted it
            valid = valid && (typeof n._wasUnique === 'undefined' || n._wasUnique);
        });

        return valid;
    },

    validateBillTo: function() {
        var payoutTypePoints = this.get('payoutType') == 'points';

        if(!this.get('billCodeRequired')){ return true; }

        if(payoutTypePoints) { return true; }

        return !payoutTypePoints;
    },

    validateBillToCode: function() {
        var isOther, hasCode1;

        if(!this.get('billCodeRequired')){ return true; }

        isOther = this.get('billTo') === 'other';
        hasCode1 = this.get('billToCode1') ? true : false;

        return (isOther && hasCode1) || !isOther;
    },

    validateDraft: function() {
        var defName = this.getDefaultTranslationByName('names');

        return typeof defName._wasUnique === 'undefined' || defName._wasUnique;
    },

    validateNumberMax: function(n) {
        return parseFloat(n) <= this.MAX_NUMBER_SIZE;
    },

    validateBonusCapSize: function() {
        var bonus = parseFloat(this.get('bonusPayout')),
            cap = parseFloat(this.get('bonusPayoutCap'));

        return bonus <= cap;
    },

    validateBonusCapMultiple: function() {
        var bonus = parseFloat(this.get('bonusPayout')),
            cap = parseFloat(this.get('bonusPayoutCap'));

        return cap % bonus === 0;
    },

    validateContestGoal: function() {
        var numDec = this.get('measureType') == 'units' ? 4 : 2;

        return G5.util.validation.isNum(this.get('contestGoal'), 'decimal', numDec, false);
    },

    // send the POST to create a contest
    // we will not use the save() function, which is already confusing enough
    // and needs refactoring since we had to shoehorn in METHODs for JAVA-STRUTS
    createContest: function() {
        var url = this.get('nextUrl');

        this.fetchGeneric('createContest', url, {method: 'create'}, false);
    },

    // override Backbone.Model.save()
    save: function(fromStep, toStep, isDraft) {
        var that = this,
            data = null,
            url = this.get('nextUrl'),
            request;

        if(isDraft&&!fromStep) {
            fromStep = this.getCurrentStepName();
        }

        data = this.serializeForStruts(fromStep, isDraft);

        this.trigger('saveStarted');

        // otherwise, continue with the ajax submit
        request = $.ajax({
            url : url,
            type : 'post',
            data : data,
            dataType : 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR) {
            var err = serverResp.getFirstError(),
                srContest = serverResp.data.contest;

            if(err) {
                console.error('[ERROR] SSIContestModel: server error', err);
                that.trigger('saveError', serverResp.getErrors());
            } else {
                if(srContest&&srContest.id) {
                    that.set('id', srContest.id);
                }
                if(srContest&&srContest.ssiContestClientState) {
                    that.set('ssiContestClientState', srContest.ssiContestClientState);
                }

                that.trigger('saveSuccess', serverResp.data, fromStep, toStep, isDraft);
            }
        });

        request.fail(function(jqXHR, textStatus, errorThrown) {
            var errors;

            console.error('[ERROR] SSIContestModel: ajax call to save failed', jqXHR, textStatus, errorThrown);
            // struts returns full HTML for FORM VALIDATION - BOOO!
            if(textStatus=='parsererror') {
                errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                if(errors) {
                    that.trigger('error:genericAjax', errors);
                }
            }
        });

        request.always(function(x, textStatus, y) {
            that.trigger('saveEnded');
        });
    },

    serializeForStruts: function(fromStep, isDraft) {
        var tjfn = 'toJson_'+fromStep,
            dat = this[tjfn] ? this[tjfn]() : this.toJSON();

        // for struts
        dat.method = isDraft ? 'saveAsDraft' : 'save';

        // this gives a query string
        dat = $.param(dat);

        // this fixes issues with how JQuery sringifies arrays and STRUTS expects them
        dat = this.queryStringForStruts(dat);

        return dat;
    },

    queryStringForStruts: function(qs) {
        var rem = null;
        // this replaces the arrayName[0][subArrayName][0][keyName] notation with:
        // arrayName[0].subArrayName[0].keyName
        while(rem = qs.match(/(\?|&).*?%5B([a-zA-Z_]+)%5D.*?=/)) {
            qs = qs.replace('%5B'+rem[2]+'%5D','.'+rem[2]);
        }

        // this removes [] from arrays (struts does not recognize this style)
        qs = qs.replace(/%5B%5D=/g,'=');

        return qs;
    },

    // toJSON (extending Backbone.Model function)
    toJSON: function() {
        var json = this.constructor.__super__.toJSON.apply(this, arguments);

        return json;
    },

    toJson_stepInfo: function() {
        var dat = this.toJSON(),
            datForStep;

        datForStep = this.cleanupJsonForStep('stepInfo', dat);

        // massage approvers for struts
        _.each(datForStep.contestApprovers, function(lev,i) {
            var lName = 'approversLevel'+(i+1);

            datForStep[lName] = _.pluck(_.where(lev.approvers,{'selected':true}),'id');
        });

        delete datForStep.contestApprovers;

        return datForStep;
    },

    toJson_stepParticipantsManagers: function() {
        var dat = this.toJSON(),
            datForStep;

        datForStep = this.cleanupJsonForStep('stepParticipantsManagers', dat);

        return datForStep;
    },

    toJson_stepPayouts: function() {
        var dat = this.toJSON(),
            datForStep;

        datForStep = this.cleanupJsonForStep('stepPayouts_'+this.get('contestType'), dat);

        return datForStep;
    },

    toJson_stepDataCollection: function() {
        var dat = this.toJSON(),
            datForStep;

        datForStep = this.cleanupJsonForStep('stepDataCollection', dat);

        datForStep.fields = _.map(datForStep.fields, _.clone);

        // clean further
        if(datForStep.collectDataMethod == this.DAT_COL_TYPE.UPLOAD) {
            delete datForStep.claimDeadlineDate;
            delete datForStep.isClaimApprovalRequired;
            delete datForStep.claimApprovers;
            delete datForStep.fields;
        }

        if(datForStep.isClaimApprovalRequired == 'no') {
            delete datForStep.claimApprovers;
        }


        return datForStep;
    },

    // remove unecessary fields
    cleanupJsonForStep: function(stepName, orig) {
        var clean = {};

        // clear out superfluous fields for this step
        _.each(this.stepDataFields[stepName], function(fn) {
            if(orig[fn] || orig[fn] === false || _.contains(['billTo','billToCode1','billToCode2'], fn)) { // keep boolean falses
                clean[fn] = orig[fn];
            }
        });
        return clean;
    },

    KEYS_TO_NUMBER_TYPES: {
        measure: 'measure',
        objectiveAmountTotal: 'measure',
        amount: 'measure',
        amount_currency: 'measure', // SIU/baseline=currency
        forEvery: 'measure',
        minQualifier: 'measure',
        maxPotential: 'measure',
        estMaxPotential: 'measure',
        goal: 'measure',

        payout: 'payout',
        willEarn: 'payout',
        individualPayoutCap: 'payout',
        maxPayout: 'payout',
        maxPayoutWithBonus: 'payout',
        estMaxPayout: 'payout',
        estBonusPayout: 'payout',
        objectivePayoutTotal: 'payout',

        participantCount: 'other'
    },

    FMT_TYPES: {
        currency: {precision: 2, keepZeros: true},
        "default": {precision: 4, keepZeros: false}
    },

    // FORMAT
    formatNumberForKey: function(num, key) {
        var measIsCurr = this.get('measureType') == 'currency',
            payoIsCurr = this.get('payoutType') == 'other',
            keyType = this.KEYS_TO_NUMBER_TYPES[key],
            fmtDetails;

        if(keyType == 'measure') {
            if(measIsCurr) {
                fmtDetails = this.FMT_TYPES.currency;
            } else {
                fmtDetails = this.FMT_TYPES['default'];
            }
        }

        if(keyType == 'payout') {
            if(payoIsCurr) {
                fmtDetails = this.FMT_TYPES.currency;
            } else {
                fmtDetails = this.FMT_TYPES['default'];
            }
        }

        if(!fmtDetails) { fmtDetails = this.FMT_TYPES['default']; }

        //console.log(key, num, fmtDetails);
        return G5.util.fmtNum(num, fmtDetails.precision, fmtDetails.keepZeros);
    }

});

/*
    STORY TIME
    So BE could not provide dynamic number formatting for num decimals
    when contestType is units. So we've created the delightful block of
    code below to take any JSON we might get, and twiddle all key values
    for which we determin there is a need of twiddlage.

    This is gross and a hack, but the local gods of olympus have asked this
    of us lowly FE programmers.

    And they lived confusingly ever after.

    THE END
*/
SSIContestModel.MEASURE_KEYS = {
    TOP: [
        'amount',
        'amount_currency',
        'approved',
        'baseline',
        'behindLeader',
        'bonusActivity',
        'bonusForEvery',
        'currentActivity',
        'estMaxPotential',
        'forEvery',
        'goal',
        'goalFormatted',
        'individualBonusCap',
        'maxPotential',
        'maximumPotential',
        'measure',
        'minQualifier',
        'minimumQualifier',
        'objective',
        'objectiveAmount',
        'objectiveAmountTotal',
        'pending',
        'percentProgress',
        'progress',
        'remaining',
        'submitted',
        'totalActivity',
        'totalGoal',
        'totalProgress',
        'qualifiedActivity'
    ]

};

/*
    Hello, my name is reformatDecimalStrings. I know way too much about the messy
    json data visiting SSI FE Land. I'm sorry I'm so big, but I hope I am not too
    painful to understand.
*/
SSIContestModel.reformatDecimalStrings = function(obj) {
    var MKS = SSIContestModel.MEASURE_KEYS;

    // GET PRECISION
    function getPrecision(n) {
        var splRes = (n+'').split('.');

        if(splRes.length == 1) { return 0; }
        return splRes[1].length;
    }

    // DO WE WANT TO REFORMAT?
    function canParse(string) {
        // if not a string, return
        if(!_.isString(string)) { return false; }


        // let's use the fact that currently the display string for units
        // always has four decimal places
        if(getPrecision(string) != 4) {
            return false;
        }

        return true;
    }

    // PARSE DISPLAY STRING NUMBER
    function parseNum(string) {
        var n = string.replace(/,/g,'');

        n = parseFloat(n);
        return n;
    }

    // FORMAT STRING
    function fmt(string) {
        if(!canParse(string)) { return string; }

        var n = parseNum(string);

        n = G5.util.fmtNum(n, 4, false /* keepZeros */);
        return n;
    }

    // FORMAT FIELD OF OBJ ARRAY (all nums will have same precision)
    function fmtObjArrField(array, field) {
        var maxDecPl = 0;

        _.each(array, function(o) {
            var numDec;

            if(canParse(o[field])) {
                o[field] = parseNum(o[field]); // re-assign as parsed number
                numDec = getPrecision(o[field]); // get precision (num places after dec. pt.)
                maxDecPl = numDec > maxDecPl ? numDec : maxDecPl; // check for max length of decimals
            }
        });
        // now we know the longest number of decimals, format all using max
        _.each(array, function(o) {
            o[field] = G5.util.fmtNum(o[field], maxDecPl, true /* keep zeros */);
        });
    }

    // FORMAT FIELD OF 2D OBJ ARRAY (table sub columns) (all nums will have same precision)
    function fmtObj2dArrField(array, fieldX, fieldY) {
        if(!_.isArray(array) || !array.length) { return; }
        if(!_.isArray(array[0][fieldX])) { return; }

        var maxDecPl = _.times(array[0][fieldX].length, function(){return 0;}); // fill array

        // row array
        _.each(array, function(row, rowIdx) {
            // col array
            _.each(row[fieldX], function(col, colIdx) {
                var numDec;

                if(canParse(col[fieldY])) {
                    col[fieldY] = parseNum(col[fieldY]);
                    numDec = getPrecision(col[fieldY]);

                    if( numDec > maxDecPl[colIdx] ) {
                        maxDecPl[colIdx] = numDec;
                    }
                }
            });
        });

        _.each(array, function(row) {
            _.each(row[fieldX], function(col, colIdx) {
                col[fieldY] = G5.util.fmtNum(col[fieldY], maxDecPl[colIdx], true /* keep zeros */);
            });
        });

    }

    // FORMAT KEY OF OBJECT
    function fmtKey(obj, key) {
        if(obj[key]) {
            obj[key] = fmt(obj[key]);
        }
    }


    // *******************
    // top level fields
    // *******************
    function fmtTopForObj(o) {
        _.each(o, function(v, k) {
            if(_.contains(MKS.TOP, k)) {
                o[k] = fmt(v);
            }
        });
    }

    fmtTopForObj(obj); // call on root of main obj


    // ****************
    // contestLevels
    // ****************
    if(_.isArray(obj.contestLevels)) {
        _.each(obj.contestLevels, function(cl) {
            fmtKey(cl, 'amount');
            fmtKey(cl, 'goalAmount');
            fmtKey(cl, 'goalPercent');
            fmtKey(cl, 'progress');
            fmtKey(cl, 'progressFormatted');
            fmtKey(cl, 'remaining');
        });
    }


    // ****************
    // contests
    // ****************
    if(_.isArray(obj.contests)) {
        fmtObjArrField(obj.contests, 'amount');
        fmtObjArrField(obj.contests, 'activityAmount');
    }


    // ****************
    // participants
    // ****************
    if(_.isArray(obj.participants)) {
        fmtObjArrField(obj.participants, 'activityAmount');
        fmtObjArrField(obj.participants, 'goal');
        fmtObjArrField(obj.participants, 'progress');
        fmtObjArrField(obj.participants, 'qualifiedActivity');
    }


    // *************************
    // stackRankParticipants
    // *************************
    function fmtStackRankPaxes(srp) {
        fmtObjArrField(srp, 'score');
    }

    if(_.isArray(obj.stackRankParticipants)) {
        fmtStackRankPaxes(obj.stackRankParticipants);
    }


    // ****************
    // activities
    // ****************
    if(_.isArray(obj.activities)) {
        // treat each activity like a TOP level contest
        _.each(obj.activities, function(act) {
            fmtTopForObj(act);

            // hit up the stack rank paxes
            if(_.isArray(act.stackRankParticipants)) {
                fmtStackRankPaxes(act.stackRankParticipants);
            }
        });
    }


    // **************************
    // tabularData / columns / paxResults
    // **************************
    function getColumns() {
        if(obj.tabularData && obj.tabularData.columns) {
            return obj.tabularData.columns;
        }
        return null;
    }

    if(_.isArray(getColumns())) {
        _.each(getColumns(), function(col) {
            if(_.contains(MKS.TOP, col.name)) {
                fmtKey(col, 'footerDisplayText');
            }
        });
    }

    function fmtPaxResults(pr) {
        fmtObjArrField( pr, 'baseline');
        fmtObjArrField( pr, 'currentActivity');
        fmtObjArrField( pr, 'objective');
        fmtObj2dArrField( pr, 'activityDescription', 'activity');
    }

    function getPaxResults() {
        // if .participants is at top
        if(obj.participants &&
            obj.participants.tabularData &&
            _.isArray(obj.participants.tabularData.paxResults)) {
            return obj.participants.tabularData.paxResults;
        }

        // if .tabularData is at top
        if(obj.tabularData &&
            _.isArray(obj.tabularData.paxResults)) {
            return obj.tabularData.paxResults;
        }
        return [];
    }

    fmtPaxResults(getPaxResults()); // call

};
