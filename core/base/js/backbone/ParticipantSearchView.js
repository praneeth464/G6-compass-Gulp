/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
ParticipantSearchModel,
ParticipantSearchView:true
*/
/*
    ParticipantSearchView - global widget for searching for and adding participants
    to a ParticipantCollection.

    Data Attribute Options:
    - data-search-types: defines the dropdowns and autocompletes (example below)
    - data-search-params: defines extra static parameters to send with autocomp and participant requests
    - data-autocomp-delay: how long to wait after key entry to query server
    - data-autocomp-min-chars: min num chars before querying server
    - data-autocomp-url: override autocomplete json provider (maybe needed)
    - data-autocomp-msg-instruction: inital text of autocomplete dropdown
    - data-search-url: override search json provider (usually needed)
    - data-select-url: send selected participant id to server (optional)
    - data-deselect-url: send deselected participant id to server (optional)
    - data-select-mode: 'single' OR 'multiple' select behavior
    - data-msg-select-txt: link to select (optional)
    - data-msg-selected-txt: text to show something is selected (optional)
    - data-visibility-controls: none|showAndHide|showOnly|hideOnly (default: hideOnly)
    - data-msg-show: text for button to show search view
    - data-msg-show-single: text for button to show search view in single mode
    - data-msg-hide: text for button to hide search view

    EXAMPLE data-search-types:
    [
        {"id":"lastName","name":"Last Name"},
        {"id":"firstName","name":"First Name"},
        {"id":"location","name":"Location"},
        {"id":"jobTitle","name":"Job Title"},
        {"id":"department","name":"Department"}
    ]


 */
ParticipantSearchView = Backbone.View.extend({

    // options for show/hide buttons
    VIS_CONT_OPTS: {
        NONE: 'none',
        BOTH: 'showAndHide',
        HIDE: 'hideOnly', // default
        SHOW: 'showOnly'
    },

    //init function
    initialize:function(opts){

        // the parent view
        this.parentView = opts.parentView||{};

        // have we been handed a reference to a ParticipantCollectionView?
        // if this gets set, we will try to maintain sync with it
        this.participantCollectionView = opts.participantCollectionView||null;

        //set the participant collection to the sync model
        if(this.participantCollectionView){
            opts.participantsToSync = this.participantCollectionView.model;
            this.participantCollection = this.participantCollectionView.model;
        }

        //template names
        this.searchViewTplName = 'participantSearchView';
        this.searchTableRowTplName = 'participantSearchTableRow';
        this.tplPath = G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/';

        //make sure we have our top-level class
        this.$el.addClass('participantSearchView');

        //select mode can be 'single' OR 'multiple'
        this.participantSelectMode = opts.selectMode||this.$el.data('selectMode')||'single';

        //extract search types from the element this view has been attached to
        //this is an attribute with a json string array of search types
        this.searchTypes = this.$el.data('searchTypes');

        // label for selecting default search filter options (only used if presetFilters is set)
        this.defaultFilterCreationBtnLabel =
            this.$el.data('defaultFilterCreationBtnLabel')||'[defaultFilterCreationBtnLabel]';
        // clear filters when switching from preset filters and default filter create 'tabs'
        this.clearOnFilterCreationModeChange = true;

        //extract other params configurable via data-attrs
        this.autocompDelay = this.$el.data('autocompDelay');
        this.autocompMinChars = this.$el.data('autocompMinChars');
        this.searchParams = this.$el.data('searchParams')||{};
        this.selectTxt = this.$el.data('msgSelectTxt');
        this.selectedTxt = this.$el.data('msgSelectedTxt');
        this.visibilityControls = this.$el.data('visibilityControls')||this.VIS_CONT_OPTS.HIDE;
        this.msgShowSingle = this.$el.data('msgShowSingle')||opts.msgShowSingle||null;
        this.msgShow = this.$el.data('msgShow')||opts.msgShow||null;
        this.msgHide = this.$el.data('msgHide')||opts.msgHide||null;
        this.allowSelectAll = this.$el.data('allowSelectAll')||opts.allowSelectAll||false;
        this.allowSelectAll = this.allowSelectAll && this.allowSelectAll != 'false';

        //for autocomplete timing
        this.autocompLastKeyupTime = 0;

        //json urls set on the dom element?
        this.autocompUrl = this.$el.data('autocompUrl')||
            G5.props.URL_JSON_PARTICIPANT_SEARCH_AUTOCOMPLETE;
        this.searchUrl = this.$el.data('searchUrl')||
            G5.props.URL_JSON_PARTICIPANT_SEARCH_RESULTS;
        this.selectUrl = this.$el.data('selectUrl')||null;
        this.deselectUrl = this.$el.data('deselectUrl')||null;

        //set our model
        this.model = new ParticipantSearchModel({
            extraParams: _.extend(this.searchParams, opts.extraParams),
            autocompUrl: this.autocompUrl,
            searchUrl: this.searchUrl,
            selectUrl: this.selectUrl,
            deselectUrl: this.deselectUrl,
            participantCollection: this.participantCollection||null,
            //hand off the participant collection to sync search results with
            participantsToSync: opts.participantsToSync||null,
            // an array of filters to optionally provide a
            // selection of 'preset' filters (no typing necessary)
            filterPresets: opts.presetFilters||null,
            // allow the select all button in the search results table
            allowSelectAll: this.allowSelectAll,
            participantsCollection: opts.participantsCollection||null
        });

        //listen for data changes
        this.model.on('autocompleted',this.addCompletionsToDom,this);
        this.model.on('filterChanged',this.renderFilters,this);
        this.model.on('filterChanged',this.updateVisibilityControls,this);
        this.model.on('participantsChanged',this.renderParticipants,this);
        this.model.participants.on('change',this.changeSelectStateVisually,this);
        this.model.on('filterPresetsChanged',this.renderPresetFilters,this);
        this.model.on('filterPresetsChanged',this.updateFilterCreateModes,this);
        // selectParticipant successful
        this.model.on('participantSelected participantDeselected', function(parti) {
            this.doParticipantSelectNoError(parti);
        }, this);
        // selectParticipant unsuccessful
        this.model.on('selectParticipantError deselectParticipantError', function(pid, msg) {
            this.doParticipantSelectError(pid, msg);
        }, this);
        //spinner (busy visualization) during server calls
        this.model.on('startBusy:queryAutocomplete', function(){this.autocompWait(true,false);},this);
        this.model.on('endBusy:queryAutocomplete', function(){this.autocompWait(false,false);},this);
        this.model.on('startBusy:loadParticipants', function(){this.autocompWait(true,true);},this);
        this.model.on('endBusy:loadParticipants', function(){this.autocompWait(false,false);},this);
        this.model.on('allowSelectAllChanged',this.updateSelectAllVisibility,this);

        //populated when template loaded
        this.$searchType = null;
        this.$searchInput = null;
        this.$searchInputDd = null;
        this.$searchInputMenu = null;
        this.$filters = null;

        //inline template (very simple template)
        this.filterTpl = null;

        //render right away, el is assigned already (it is in the DOM)
        this.render();

    },

    // setter for mode
    setParticipantSelectModeSingle: function(isYes){
        this.participantSelectMode = isYes?'single':'multiple';
    },

    // initial render of view
    render:function(){
        var that = this,
            tplData = {
                // drop down search type data
                searchTypes: this.searchTypes,
                // drop down of preset filters
                defaultFilterCreationBtnLabel: this.defaultFilterCreationBtnLabel
            };

        TemplateManager.get(this.searchViewTplName,function(tpl,vars,subTpls){
            that.$el.append( tpl(tplData) );

            //set up search type stuff
            that.$searchType = that.$el.find('.participantSearchSelect');
            that.$searchInputDd = that.$el.find('.participantSearchDropdownWrapper');
            that.$searchInputMenu = that.$searchInputDd.find('.dropdown-menu');
            that.$searchInput = that.$el.find('.participantSearchInput');
            that.clearAutocompMenu();//set the instruction text

            //filters
            that.$filters = that.$el.find('.participantSearchFilters');
            //inner micro-template
            that.filterTpl = subTpls.participantSearchFilter;
            that.presetFiltersTpl = subTpls.presetFilters;

            //participant table stuff
            that.$participantTableWrapper = that.$el.find('.participantSearchTableWrapper');
            that.$participantTable = that.$el.find('.participantSearchTableWrapper table');
            that.$participantTbody = that.$participantTable.find('tbody');

            that.updateSelectAllVisibility();

            that.$searchInput.placeholder();
            that.doSearchTypeChange();

            that.renderPresetFilters();
            that.updateFilterCreateModes();

            that.updateVisibilityControls();

            that.trigger('rendered');

        }, this.tplPath);



        return this;
    },

    //render the filters
    renderFilters: function(){
        var that = this;

        setTimeout(function(){ // IE8 + JQ1.8.3 -- push target.remove() to end of stack
            that.$filters.children().not('.filteredBy').remove();

            _.each(that.model.getFilters(),function(filter){
                that.$filters.append(that.filterTpl(filter));
            });
        });
    },

    // render preset filters
    renderPresetFilters: function(filterPresets) {
        var $modeSel = this.$el.find('.filterCreationModeSelectWrapper'),
            $presetFW = this.$el.find('.presetFilterCreationWrapper'),
            $defaultFW = this.$el.find('.defaultFilterCreationWrapper'),
            $sel = this.$el.find('.presetFilterSelect'),
            fpData = this.model.getFilterPresets();

        if(fpData) {
            this.$el.find('.presetFilters_name').text(fpData.name);
            $sel.empty().append(this.presetFiltersTpl(fpData));
            $modeSel.show();
            $presetFW.show();
        } else {
            $modeSel.hide();
            $presetFW.hide();
            $defaultFW.show();
        }
    },

    //update participants table
    renderParticipants:function(msg, singleId){
        var that = this,
            hasResults = this.model.getParticipants().length>0,
            hasFilters = _.size(this.model.getFilters())>0;

        // factored out single pax renders to their own more efficient function
        // adding a warning here because of fears that this might somehow cause an
        // issue somewhere
        if(singleId) {
            console.error('ParticipantSearchView.renderParticipants(msg)'+
                ' has singleId set, use renderParticipantForSelectOrLock() instead!!!');
        }

        //empty tbody
        that.$participantTbody.empty();

        //sorting stuffs
        this.$participantTable.find('[data-sort]')
            .removeClass('asc icon-sort-up desc icon-sort-down').addClass('icon-sort')
            .closest('th').removeClass('sorted');
        this.$participantTable.find('[data-sort='+this.model.sortCol+']')
            .addClass(this.model.sortAsc?'asc icon-sort-up':'desc icon-sort-down')
            .closest('th').addClass('sorted');

        //show hide message
        if(!hasResults && !msg && this.model.hasFilters()){ // default no results msg
            this.setSearchResultsMessage(this.$participantTable.data('msgNoResults'));
        }
        else if(msg){
            this.setSearchResultsMessage(msg);
        }
        else { // hide msg if none of the criteria above match
            this.setSearchResultsMessage(false);//hide msg
        }

        //show or hide the filters and count
        this.$el.find('.participantSearchCountAndFilters')[hasFilters ? 'show':'hide']();

        //show or hide the count specifically for certain case
        this.$el.find('.participantSearchResultCountWrap')[!hasResults&&hasFilters? 'hide':'show']();

        //render each row
        TemplateManager.get(this.searchTableRowTplName,function(tpl){
            // this cached template will be set when initial render of table occurs
            // it will be used in the renderParticipantForSelectOrLock function
            that._searchTableRowTpl = tpl; // hackity hack hack *barf*
            that.renderPaxRows(tpl);
        }, this.tplPath);

        //update count
        this.$el.find('.participantSearchResultCount').text(this.model.getParticipants().length);
    },

    // Here we assume that changing the state of a single row will not alter the
    //   dimensions which would require re-rendering the sticky table header
    //   which is ultra expensive for "select all" when the collection
    //   of users is > 50 or so (dep on browser)
    // 1) this is the render for any single pax model change event
    // * this is a stop-gap, pax serch needs a re-write
    renderParticipantForSelectOrLock: function(paxMod) {
        var $selRow = this.$participantTable
                .find('.selectCell[data-participant-id='+paxMod.get('id')+']')
                .closest('tr'),
            tplDat = paxMod.toJSON();

        //add params for select control
        tplDat._selectTxt = this.selectTxt;
        tplDat._selectedTxt = this.selectedTxt;
        tplDat._singleSelectMode = this.participantSelectMode == 'single';

        $selRow.replaceWith( this._searchTableRowTpl( tplDat ) );

    },

    renderPaxRows: function(tpl) {
        var $t = this.$participantTable,
            $tw = this.$participantTableWrapper,
            toRender = this.model.getParticipants().models,
            hasResults = this.model.getParticipants().length>0;

        // IE8 is double-rendering under certain rare circumstances. this makes
        // sure the table tbody is always empty before filling it up.
        this.$participantTbody.empty();

        _.each(toRender,function(p){
            var tplDat = p.toJSON();

            //add params for select control
            tplDat._selectTxt = this.selectTxt;
            tplDat._selectedTxt = this.selectedTxt;
            tplDat._singleSelectMode = this.participantSelectMode == 'single';

            // rendering entire table
            this.$participantTbody.append(tpl(tplDat));
        }.bind(this));

        if( hasResults ) {
            // not visible (slide down)
            $tw.not(':visible').slideDown( G5.props.ANIMATION_DURATION);

            // visible (adjust height)
            $tw.has(':visible').animate(
                {height: $t.outerHeight()},
                G5.props.ANIMATION_DURATION,
                'swing',
                function(){
                    $tw.scrollTop(0);
                    if( $t.height() > $tw.height() ) {
                        this.renderStickyPaxTableHeader();
                    }else {
                        this.unRenderStickyPaxTableHeader();
                    }
                }.bind(this)
            );

        } else {
            $tw.slideUp(G5.props.ANIMATION_DURATION);
        }
    },

    renderStickyPaxTableHeader: function() {
        var $t = this.$participantTable,
            $tw = this.$participantTableWrapper,
            $th = $t.clone(true),
            stickyHeaderSize;

        if( !$tw.find($th).length ) {
            $tw.append($th).addClass('stickyScroll');
        }
        if( !$t.closest('.stickyHeader').length ) {
            $th.wrap('<div class="stickyHeader" />');
        }
        if( !$t.closest('.scrollTable').length ) {
            $t.wrap('<div class="scrollTable" />');
        }

        stickyHeaderSize = function() {
            $tw.find('.stickyHeader').css({
                height: $t.find('th').outerHeight(true) + parseInt($t.css('borderTopWidth'), 10),
                width: $t.width()
            });
        };
        stickyHeaderSize();

        $(window).on('resize', _.throttle(stickyHeaderSize, 250));
    },

    unRenderStickyPaxTableHeader: function() {
        // remove the sticky header
        this.$participantTableWrapper.find('.stickyHeader').remove();
        // unwrap the scrolling table
        this.$participantTableWrapper.find('.scrollTable').children().unwrap();
        // remove the wrapper's special class
        this.$participantTableWrapper.removeClass('stickyScroll');
    },

    updateSelectAllVisibility: function() {
        // decide whether to show the 'select all' btn
        if( this.model.getAllowSelectAll() ) {
            this.$participantTableWrapper.find('.msgSelect').hide();
            this.$participantTableWrapper.find('.selectAllBtn').show();
        } else {
            this.$participantTableWrapper.find('.msgSelect').show();
            this.$participantTableWrapper.find('.selectAllBtn').hide();
        }
    },

    events:{
        "click .filterCreationModeSelectWrapper li":"doFilterModeBtnClick",

        "change .presetFilterSelect":"doPresetFilterChange",

        "change .participantSearchSelect":"doSearchTypeChange",

        //search input autocomp
        "focus .participantSearchInput":"doSearchInputFocus",
        "blur .participantSearchInput":"doSearchInputBlur",
        "keyup .participantSearchInput":"doSearchInputKeyup",
        "keypress .participantSearchInput":"doSearchInputKeypress",
        "keydown .participantSearchInput":"doSearchInputKeydown",
        "click .participantSearchDropdownMenu a":"doAutocompSelect",
        "mouseenter .participantSearchDropdownMenu li":"doAutocompMenuMouseenter",

        //filter
        "click .filterDelBtn":"doFilterDelClick",

        //sort
        "click .sortHeader":"doSortClick",

        //select participant
        // "click .participantSelectControl":"doParticipantSelect",
        "click .participantSearchResultRow":"doParticipantSelect",
        "click .participant-popover":"attachParticipantPopover",
        "click .participantSearchTableWrapper .countryFlag":"attachFlagPopover",

        "click .selectAllBtn":"doSelectAll"
    },

    // if mode changed between default filter create and preset filters
    updateFilterCreateModes: function() {
        var $select = this.$el.find('.filterCreationModeSelectWrapper'),
            $bts = $select.find('.btn'),
            $preBtn = $select.find('.presetFilterBtn'),
            $defBtn = $select.find('.defaultFilterBtn'),
            $preset = this.$el.find('.presetFilterCreationWrapper'),
            $std = this.$el.find('.defaultFilterCreationWrapper');

        // only if we have presetFilters, otherwise the tpl will just have default control and hide
        // filter create mode buttons
        if(!this.model.getFilterPresets()){ return; }

        // clear filters on mode change?
        if(this.clearOnFilterCreationModeChange) {
            this.model.removeAllFilters();
        }

        // clear inputs
        this.$searchInput.val('');
        this.$el.find('.presetFilterSelect').val('');

        // make sure one of the tabs is active/selected (initialize)
        if($select.find('.active').length===0) {
            $preBtn.addClass('active');
        }

        // use .active to decide whether to show or hide apropo content
        $preset[$preBtn.hasClass('active')?'show':'hide']();
        $std[$defBtn.hasClass('active')?'show':'hide']();

        // // for 'preset filters/team' we will turn on the 'Select All' control in the results table
        // // this will trigger an event that will update the visual state
        // this.model.setAllowSelectAll($preBtn.hasClass('active'));
        // business decided to have select all option for both filter create modes


    },

    updateVisibilityControls: function() {
        var $btn,showMsg,hideMsg,
            isVis = this.$el.css('display')==='block',
            vc = this.visibilityControls,
            isActive = vc !== this.VIS_CONT_OPTS.NONE,
            isHideBtn = vc === this.VIS_CONT_OPTS.HIDE || vc === this.VIS_CONT_OPTS.BOTH,
            isShowBtn = vc === this.VIS_CONT_OPTS.SHOW || vc === this.VIS_CONT_OPTS.BOTH,
            isSingle = this.participantSelectMode === 'single',
            showBtn = true,
            that = this,
            // dirty little function to transfer a given class
            transClass = function($a,$b,c) {if($a.hasClass(c)){$b.addClass(c);}};

        if(!isActive) return false;

        // lazy initialize DOM placement of controls
        if(!this.$visControls) {
            this.$visControls = this.$el.find('.visibilityControls');

            // make this a little smarter about grid style (a bit gross, but fixes some indenting)
            transClass(this.$el,this.$visControls,'span12');
            //transClass(this.$el,this.$visControls,'row'); //this one is trouble b/c the innards are currently designed with .rows

            // move out of search view element and show()
            this.$el.after(this.$visControls.show());

            // this doesn't live within this.$el, so we can't use 'events' object
            this.$visControls.on('click','.showHideBtn.doShow',
                function(){that.showView();});
            this.$visControls.on('click','.showHideBtn.doHide',
                function(){that.hideView();});
        }

        $btn = this.$visControls.find('.showHideBtn');

        showMsg = isSingle ?
            (this.msgShowSingle||$btn.data('msgShowSingle')) :
            (this.msgShow||$btn.data('msgShow'));
        hideMsg = this.msgHide||$btn.data('msgHide');

        $btn.text(isVis?hideMsg:showMsg);
        $btn.addClass(isVis?'doHide':'btn-primary doShow');
        $btn.removeClass(isVis?'btn-primary doShow':'doHide');

        // the button may be hidden if we only have show or hide
        if(!isHideBtn&&isVis) { showBtn = false; }
        if(!isShowBtn&&!isVis) { showBtn = false; }
        // hide button only (we are not looking for full visibility now, just filters)
        if(!isShowBtn&&isHideBtn) {
            showBtn = this.model.hasFilters();
        }

        // use the showBtn flag to decide to hide or show the button
        $btn[showBtn?'show':'hide']();

        // if there is no show button, then make sure the search view is visible
        // DISABLED: some pages/views want to control the visibility (Ex: Send a Rec.)
        // if(!isShowBtn&&!isVis){
        //     this.$el.show();
        // }
    },
    showView: function() {
        var that = this;
        this.$el.slideDown(G5.props.ANIMATION_DURATION,
            function(){that.updateVisibilityControls();});
    },
    hideView: function() {
        var that = this;
        // if hide button only, then just remove filters
        if(this.visibilityControls === this.VIS_CONT_OPTS.HIDE) {
            // remove all filters triggers filter change (slides up table)
            this.model.removeAllFilters();
        }
        // hide the entire widget
        else {
            this.$el.slideUp(G5.props.ANIMATION_DURATION,
                function(){that.updateVisibilityControls();});
        }
    },
    setVisibilityControlsEnabled: function(isEnable) {
        var $b;

        if(!this.$visControls) return;

        $b = this.$visControls.find('.showHideBtn');
        $b[isEnable?'removeClass':'addClass']('disabled');
    },

    doFilterModeBtnClick: function(e){
        e.preventDefault();
        // remove all active btn
        this.$el.find('.filterCreationModeSelectWrapper li').removeClass('active');
        // make clicked btn active
        $(e.currentTarget).closest('li').addClass('active');
        // call update fnc
        this.updateFilterCreateModes();
    },

    doPresetFilterChange: function(e){
        var $sel = this.$el.find('.presetFilterSelect option:selected');

        if($sel.val()) {
            // value of select is JSON -- matches the object for filters exactly
            this.model.addFilter(JSON.parse($sel.val()));
        }
    },

    doSearchTypeChange: function(e){
        var ph;

        //change search input placeholder and clear text
        ph = G5.util.cmReplace({
            cm : this.$searchInput.data('placeholder'),
            subs : [
                this.$searchType.find('option:selected').text()
            ]
        });
        //below sequence of calls important to make ie ok with placeholder plugin
        this.$searchInput.attr('placeholder',ph).val('');

        //focus on input if this is from a normal event
        //if(e){this.$searchInput.focus();}

    },


    //AUTOCOMPLETE STUFF

    doSearchInputFocus: function(e){
        // scroll the screen down to the top of the search filter box
        var $scrollToElem = this.$el.prevAll('h2,h3,h4,h5,h6').length ? this.$el.prevAll('h2,h3,h4,h5,h6') : this.$el;
        $.scrollTo($scrollToElem, G5.props.ANIMATION_DURATION*2, {axis : 'y'});

        //open the autocomplete (dropdown menu)
        this.$searchInputDd.addClass('open');
        this.doAutocomplete();//attempt an autocomplete
    },

    doSearchInputBlur: function(e){
        var that = this;
        //hide the autocomplete (dropdown menu)
        if(this.$searchInputMenu.find('.active').length === 0){
            this.$searchInputDd.removeClass('open');
            this.clearAutocompMenu();//clear results
        }else{
            setTimeout(function(){
                that.$searchInputDd.removeClass('open');
                that.clearAutocompMenu();//clear results
            },300);
        }
    },

    doSearchInputKeypress: function(e){
        this.doSearchInputMove(e);
    },

    doSearchInputKeydown: function(e){
        if($.browser.webkit || $.browser.msie){
            this.supressKeyPressRepeat = !~$.inArray(e.keyCode,[40,38,9,13,27]);
            this.doSearchInputMove(e);
        }
    },

    doSearchInputKeyup: function(e){
        switch(e.keyCode) {
            case 40: //down arrow
            case 38: //up arrow
                break;

            case 9: //tab
            case 13: //enter
                // check to see if there are results in the search input drop-down
                // if so, the enter key selects the result
                if( this.$searchInputDd.find('.active').length ) {
                    this.$searchInputMenu.find('.active a').click();
                    this.$searchInput.blur();
                }
                // if not, the enter key doesn't do anything special (and won't stop a search from kicking off)
                break;

            case 27: //escape
                this.$searchInputDd.removeClass('open');
                this.clearAutocompMenu();//clear results
                this.$searchInput.blur();
                break;

            default:
                this.doAutocomplete();
        }

        e.stopPropagation();
        e.preventDefault();
    },

    doSearchInputMove: function(e){
        switch(e.keyCode) {
            case 9: // tab
            case 13: // enter
            case 27: // escape
                e.preventDefault();
                break;

            case 38: // up arrow
                e.preventDefault();
                this.doSearchInputPrev();
                break;

            case 40: // down arrow
                e.preventDefault();
                this.doSearchInputNext();
                break;
        }

        e.stopPropagation();
    },
    doSearchInputPrev: function(){
        var active = this.$searchInputMenu.find('.active').removeClass('active'),
            prev = active.prev();

        if(!prev.length){
            prev = this.$searchInputMenu.find('li').last();
        }

        prev.addClass('active');
    },
    doSearchInputNext: function(){
        var active = this.$searchInputMenu.find('.active').removeClass('active'),
            next = active.next();

        if(!next.length){
            next = $(this.$searchInputMenu.find('li')[0]);
        }

        next.addClass('active');
    },

    //gateway to autocomplete, check num chars is enough
    doAutocomplete: function(){
        var query = this.$searchInput.val(),
            that = this;

        if(query.length >= this.autocompMinChars){
            //set the time
            this.autocompLastKeyupTime = (new Date()).getTime();
            //set a timeout on delay, and see if keyboard has been idle for long enough
            setTimeout(function(){that.tryAutocomplete();},this.autocompDelay);
        }else{
            //clear the menu results
            this.clearAutocompMenu();
        }
    },

    //check the time since last keypress, and forward query if apropo
    tryAutocomplete: function(){
        var that = this,
            now = (new Date()).getTime(),
            delay = now-this.autocompLastKeyupTime,
            query = this.$searchInput.val(),
            searchType = this.$searchType.val(),
            searchTypeName = this.$searchType.find('option:selected').text();

        //check to make sure no keys have been pressed during the delay (give 10ms margin)
        if(delay >= this.autocompDelay - 10){
            // check to make sure the query string isn't too long
            if(query.length >= this.autocompMinChars) {
                this.$searchInputMenu.empty();
                this.model.queryAutocomplete(query, searchType, searchTypeName, this.searchParams);
            }
            // not enough chars, set default text
            else {
                this.clearAutocompMenu();
            }

        }
    },

    // when an autocomplete selection comes back from server
    addCompletionsToDom: function(comps, serverMsg){
        var that = this;

        this.$searchInputMenu.empty();

        if(!serverMsg && comps.length>0){
            //populate menu with results
            _.each(comps,function(comp){
                that.$searchInputMenu.append(
                    that.make('li',{},
                        that.make('a',{
                            href:'#',
                            'data-ac-id':comp.id,
                            'data-ac-name':comp.name,
                            'data-ac-type':comp.type,
                            'data-ac-type-name':comp.typeName
                        },comp.name)
                    )
                );
            });

            //highlight first item
            $(this.$searchInputMenu.find('li')[0]).addClass('active');
        } else if(!serverMsg && comps.length===0){
            //add display no results message
            this.setAutocompMenuMsg(this.$searchInputMenu.data('msgNoResults'));
        } else {//server message
            this.setAutocompMenuMsg(serverMsg);
        }

    },

    doAutocompSelect: function(e){
        var $tar = $(e.target);

        e.preventDefault();

        //hide menu
        this.$searchInputDd.removeClass('open');

        //clear entered text
        this.$searchInput.val('');

        this.clearAutocompMenu();

        this.model.addFilter(
            {
                type: $tar.data('acType'),
                typeName: $tar.data('acTypeName'),
                name: $tar.data('acName'),
                id: $tar.data('acId')
            }
        );
    },

    autocompWait: function(isWait, isDisable) {
        var $s = this.$searchInput.next('.autocompSpinner');
        // create as necessary
        $s = $s.length === 0 ? $(this.make('div',{"class":"autocompSpinner"})) : $s;
        if(isWait) {
            if(isDisable) {
                this.$searchInput.attr('disabled','disabled');
                this.$searchType.attr('disabled','disabled');
            }
            // always disable vis control
            this.setVisibilityControlsEnabled(false);
            this.$searchInput.after($s);
            $s.spin();
        } else {
            $s.spin(false).remove();
            this.$searchInput.removeAttr('disabled');
            this.$searchType.removeAttr('disabled');
            this.setVisibilityControlsEnabled(true);
        }

    },

    doAutocompMenuMouseenter: function(e){
        this.$searchInputMenu.find('.active').removeClass('active');
        $(e.currentTarget).not('.dropdown-menu-info').addClass('active');
    },

    clearAutocompMenu: function(){
        var msg = this.$el.data('autocompMsgInstruction')||
            this.$searchInputMenu.data('msgInstruction');
        this.setAutocompMenuMsg(msg);
    },

    setAutocompMenuMsg: function(msg){
        var $i = $(this.make('li',{'class':'dropdown-menu-info'},msg)),
            that = this;
        //empty menu, and add a msg
        setTimeout(function(){ // IE8 + JQ1.8.3 -- push target.empty() to end of stack
            that.$searchInputMenu.empty();
            that.$searchInputMenu.append($i);
        }, 0);

    },


    doFilterDelClick: function(e){
        var $tar = $(e.currentTarget),
            searchType = $tar.data('acType');

        this.model.removeFilter(searchType);

        e.preventDefault();
    },


    doSortClick: function(e){
        var $tar = $(e.target).hasClass('sortControl') ? $(e.target) : $(e.target).find('.sortControl'),
            newOrder = $tar.hasClass('desc')||!$tar.hasClass('asc');

        this.model.setSort($tar.data('sort'),newOrder);
    },


    doParticipantSelectByRow: function(e){
        var $tar = $(e.target).closest('tr');
        // proxy over to the actual working function
        $tar.find('.participantSelectControl').click();
    },

    doSelectAll: function(e) {
        e.preventDefault();
        this.model.selectAllParticipants();
    },

    doParticipantSelect: function(e){
        var $tar = $(e.target).closest('tr').find('.participantSelectControl'),
            $cellTar = $(e.target).closest('tr').find('.selectCell'),
            tag = $tar.length ? $tar.get(0).tagName : false,
            pid = $tar.data('participantId'),
            paxUrl = $cellTar.data('participantUrl');

        // if no target was found, bail
        if( !$tar.length) {
            return;
        }

        // if there is a spinner going, it means we have an ajax request in progress. bail
        if( $cellTar.find('.spin').length ) {
            return;
        }

        //if in a collection select the row to add participant to list, otherwise make the link go to the participant url
        if(this.participantCollectionView){
            //trigger event for external watchers.
            this.trigger('rowSelected', e);
            if(tag==='A'){ e.preventDefault();}

        }else {
             if(tag==='A'&&paxUrl){
                $tar.attr('href',paxUrl);
             }
             if(tag==='A'&&!paxUrl){
                e.preventDefault();
             }
        }
        //if anchor, prevent default

        //if pax is already selected, we're deselecting
        if( this.model.getSelectedParticipant(pid) ){
            // if there is a deselectUrl for a remote call, we show a spinner over the deselect trigger so it can't be clicked again
            /*
             * TODO: This needs some work. Read the comments in ParticipantSearchModel.deselectParticipant to better understand how to add the spinner
            if( this.deselectUrl ) {
                G5.util.showSpin($tar.closest('.selectCell'), {cover: true});
            }
            */
            this.model.deselectParticipant(pid);
        }
        //else we are selecting
        else {
            // console.log('//else we are selecting');
            // if there is a selectUrl for a remote call, we show a spinner over the add trigger so it can't be clicked again
            if( this.selectUrl ) {
                G5.util.showSpin($tar.closest('.selectCell'), {cover: true});
            }
            $.scrollTo(this.$el, G5.props.ANIMATION_DURATION*2, {axis : 'y'});
            this.model.selectParticipant(pid, this.participantSelectMode=='single');
        }
    },

    doParticipantSelectNoError : function(parti) {
        var $tar = this.$participantTable.find('.selectCell[data-participant-id='+parti.id+'] .participantSelectControl');

        $tar = ($tar.get(0).tagName === 'INPUT') ? $tar.parent() : $tar;

        if( $tar.qtip('api') ) {
            $tar.qtip('destroy');
        }

        // trigger for external listeners
        this.trigger('doParticipantSelectNoError', parti, $tar);
    },

    doParticipantSelectError : function(pid, msg) {
        var $tar = this.$participantTable.find('.selectCell[data-participant-id='+pid+'] .participantSelectControl');

        $tar = ($tar.get(0).tagName === 'INPUT') ? $tar.parent() : $tar;

        // kill a spinner if it exists
        G5.util.hideSpin($tar.closest('.selectCell'));

        // qtip to show the error
        $tar.qtip({
            content: {
               text: msg.text
            },
            position : {
                my : 'left center',
                at : 'right center',
                container : $tar
            },
            show : {
                ready : true
            },
            hide : {
                event : false,
                fixed : true
            },
            //only show the qtip once
            events:{
                hide : function(evt,api) {
                    $tar.qtip('destroy');
                },
                render : function(evt,api) {
                    $tar.css('position', 'relative');
                }
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-red',
                tip: {
                    corner: true,
                    width: 10,
                    height: 5
                }
            }
        });

        // trigger for external listeners
        this.trigger('doParticipantSelectError', msg, $tar);
    },

    changeSelectStateVisually: function(participantModel, event){
        // pax state has changed
        if(event.changes.isSelected || event.changes.isLocked){
            this.renderParticipantForSelectOrLock(participantModel);
        }
    },

    setSearchResultsMessage: function(msg){
        var $msg = this.$el.find('.participantSearchMsg'),
            $msgTxt = $msg.find('.msg');

        if(msg === false){
            $msg.hide();
            return;
        }

        $msgTxt.text(msg);
        $msg.show();
    },

    //attach and show a participant popover
    attachParticipantPopover: function(e) {
        /* NOTE from Joel 01 Aug 2013: this click handler will enable mini profile popovers on names in the search results list. It has been disabled against my wishes because I got outvoted. Ah well. Usability -> toilet sometimes.

        var $tar = $(e.target);

        // prevent the click from moving up the DOM and triggering the select/deselect
        e.stopPropagation();

        //attach participant popovers and show
        if(!$tar.data('participantPopover')){
            $(e.target).participantPopover().qtip('show');
        }

        end NOTE */

        // Adding functionality ONLY if the search view does NOT have a collection into which to insert selected participants.
        if(this.participantCollectionView === null){
            var $tar = $(e.target);

            // prevent the click from moving up the DOM and triggering the select/deselect
            e.stopPropagation();

            //attach participant popovers and show
            if(!$tar.data('participantPopover')){
                $(e.target).participantPopover().qtip('show');
            }
        }
        // Otherwise, do nothing when clicking on the name
        else {
            e.preventDefault();
        }

    },

    //attach flag popover
    attachFlagPopover: function(e) {
        var $tar = $(e.currentTarget),
            that = this;

        // prevent the click from moving up the DOM and triggering the select/deselect
        e.stopPropagation();

        // lazy attach -- much more efficient
        if(!$tar.data('qtip')) {
            // attach country tooltip
            $tar.qtip({
                content:{ text: $tar.attr('title') },
                position:{
                    my: 'left center',
                    at: 'right center',
                    container: that.$participantTableWrapper
                },
                show:{ event:'click', ready:true },
                hide:{
                    event:'unfocus',
                    fixed:true,
                    delay:200
                },
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-light',
                    tip: {
                        corner: true,
                        width: 10,
                        height: 5
                    }
                }
            });
        }
    },

    // show a message over the table
    showTableMsg: function(msg) {
        var $tw = this.$participantTableWrapper, // alias
            $msg = this.$el.find('.tableMsg'),
            $cont = this.$el.find('.tableMsg .msgContent');

        $msg.css('top',$tw.position().top);

        // is this a stoopid way to do this?
        $msg.find('.close').off('.hide').on('click.hide',
            function(e){
                e.preventDefault();
                $msg.slideUp();
            }
        );

        if($msg.is(':visible')){ return; }// already showing

        $cont.empty().append(msg);
        $msg.slideDown();
        setTimeout(function(){$msg.slideUp();}, 3000);
    }


});
