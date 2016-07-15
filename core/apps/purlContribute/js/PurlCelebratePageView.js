/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
PageView,
TemplateManager,
PaginationView,
PurlCelebrateModel,
PurlCelebratePageView:true
*/
PurlCelebratePageView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';

        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'purlCelebrate';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //templates
        this.tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'purlContribute/tpl/';
        this.tplName = "purlCelebrateSet";

        //global variables and params
        this.$tabs = this.$el.find('.purlCelebrateTabs');
        this.autocompDelay = null;
        this.autocompMinChars = null;
        this.autocompUrl = this.$el.find('#purlCelebrateNameInput').data('autocompUrl')||
            G5.props.URL_JSON_PURL_CELEBRATE_SEARCH_AUTOCOMPLETE;
        this.searchUrl = this.$el.find('#purlCelebrateNameInput').data('searchUrl')||
            G5.props.URL_JSON_PURL_CELEBRATE_SEARCH_RESULTS;

        //for autocomplete timing
        this.autocompLastKeyupTime = 0;

        //our model
        this.model = new PurlCelebrateModel({
            autocompUrl: this.autocompUrl,
            searchUrl: this.searchUrl
        });

        this.model.loadData();

        this.model.on('dataLoaded',function(setId){
            this.render(setId);
        },this);

        this.model.on('autocompleted', this.addCompletionsToDom, this);

        this.model.on('participantsChanged', function(msg, data, selectedName){
            this.renderParticipants(msg, data, selectedName);
        },this);

        //put the view into a loading state
        this.setStateLoading();

    },
    events:{
        "click .purl-celebrate-tab":"doTabClick",
        'click .sortable a' : 'tableClickHandler',
        'change #purlPastPresentSelect': "changeView",
        'click .profile-popover': 'attachParticipantPopover',
        //search input autocomp
        "focus #purlCelebrateNameInput":"doSearchInputFocus",
        "blur #purlCelebrateNameInput":"doSearchInputBlur",
        "keyup #purlCelebrateNameInput":"doSearchInputKeyup",
        "keypress #purlCelebrateNameInput":"doSearchInputKeypress",
        "keydown #purlCelebrateNameInput":"doSearchInputKeydown",
        "mouseenter .purlSearchDropdownMenu li":"doAutocompMenuMouseenter",
        "click .purlSearchDropdownMenu a":"doAutocompSelect",
        "click .searchBtn": "submitSearch"
    },
    render: function(setId){
        var that = this;

        if(!setId){
            this.renderTabs();

            setId = this.$el.find('.purlCelebrateTabs li').first().find('a').data('nameId');

            this.renderTabContent(setId);

        } else {
            this.renderTabContent(setId);
        }

        TemplateManager.get('purlCelebratePage', function(tpl, vars, subTpls){
            that.paginationTpl = subTpls.paginationTpl;
        }, this.tplUrl);

        // take the view out of the loading state
        this.setStateLoaded();

    },
    renderTabs: function(){
        var that = this;
        //TABS - each 'celebrateSet' gets a tab
        that.$tabs.empty();

        _.each(this.model.get('celebrationSets'),function(celSet){
            var numNew = 0;

            //build the li>a element
            var $a = $('<a />')
                        .attr({
                            'title':celSet.name,
                            'href':'#',
                            'class':'purl-celebrate-tab purl-celebrate-tab-'+celSet.nameId,
                            'data-name-id':celSet.nameId,
                            'data-total-count':celSet.totalCount
                        })
                        .html('<span>'+celSet.name+'</span><!--sup>'+numNew+'</sup-->'),
                $i = $('<i class="icon-g5-pubrec-'+celSet.nameId+'" />'),
                $li = $('<li />').html($a.prepend($i));

            //give the <a> a tooltip
            $a.tooltip({
                container: 'body',
                delay: 200
            });

            //append to tabs container
            that.$tabs.append( $li );
        });
    },
    renderTabContent:function(id){
        var that = this,
            celebrateModel = this.model.get('celebrationSets'),
            $celCont = this.$el.find('.purlCelebrateItemsCont'),
            //find the recognitions content DOM element
            $celSets = $(this.$el.find('.purlCelebrateItems')),
            //get the tab element
            $tab = this.$tabs.find('[data-name-id='+id+']'),
            $pagination = $celSets.find('.pagination'),
            $desc = this.$el.find('.purlCelebrateDesc');

        //deactivate, and activate new tab (style class)
        this.$tabs.find('li').removeClass('active');
        $tab.closest('li').addClass('active');

        //remove the empty set classname if it exists from the container
        $celSets.removeClass('emptySet');

        TemplateManager.get('purlCelebrateSet', function(tpl, vars, subTpls) {
            //empty container
            $celSets.empty();

            _.each(that.model.get('celebrationSets'), function(celSet){
                if(celSet.nameId === id){
                    $desc.text(celSet.description);
                    if(celSet.nameId === 'search') {
                        $celSets.append(tpl(celSet));
                        that.renderSearchPagination(celSet);
                        that.renderSearch();
                    }
                    else {
                        if(celSet.celebrations.length === 0){
                            $celSets
                                .addClass('emptySet')
                                .append(that.make('h2',{},$celCont.data('msgEmpty')))
                                .find('h2').prepend('<i class="icon-g5-norecognitions" />');

                            that.renderPagination(celSet);
                        } else {

                            that.processTabularData(celSet);
                            $celSets.append(tpl(celSet));
                            $celSets.find('table').responsiveTable();
                            that.renderPagination(celSet);
                        }
                    }
                }
            });
        }, this.tplUrl);
    },
    renderPagination: function(celSet){
        var that = this;

        // if our data is paginated, add a special pagination view
        if(celSet.total > celSet.itemsPerPage) {
            // if no pagination view exists, create a new one
            if( !that.purlCelebratePagination ) {
                that.purlCelebratePagination = new PaginationView({
                    el : that.$el.find('.pagination'),
                    pages : Math.ceil( celSet.total /celSet.itemsPerPage),
                    current : celSet.currentPage,
                    ajax : true,
                    tpl : that.paginationTpl || false
                });

                this.purlCelebratePagination.on('goToPage', function(page) {
                    var nameId = that.$tabs.find('li.active a').data('nameId');
                    that.paginationClickHandler(page, nameId);
                });

                this.model.on('dataLoaded', function(setId) {
                    if(!that.purlCelebratePagination){
                        return false;
                    }
                    //have to re-get the set data since dataLoaded happens before renderPagination
                    _.each(that.model.get('celebrationSets'), function(set){
                        if(setId === set.nameId){
                            that.purlCelebratePagination.setProperties({
                                rendered : false,
                                pages : Math.ceil(set.total /set.itemsPerPage),
                                current : set.currentPage
                            });
                        }
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.purlCelebratePagination.setElement( that.$el.find('.pagination') );
            }
        } else {
            this.$el.find('.pagination').empty();
        }
    },
    renderSearchPagination: function(celSet){
        var that = this;

        // if our data is paginated, add a special pagination view
        if(celSet.total > celSet.itemsPerPage) {
            // if no pagination view exists, create a new one
            if( !that.purlCelebrateSearchPagination ) {
                that.purlCelebrateSearchPagination = new PaginationView({
                    el : that.$el.find('.pagination'),
                    pages : Math.ceil( celSet.total /celSet.itemsPerPage),
                    current : celSet.currentPage,
                    ajax : true,
                    tpl : that.paginationTpl || false
                });

                this.purlCelebrateSearchPagination.on('goToPage', function(page) {
                    that.paginationClickHandler(page, celSet.nameId);
                });

                this.model.on('participantsChanged', function(msg, celSet) {
                    if(!that.purlCelebrateSearchPagination){
                        return false;
                    }
                    that.purlCelebrateSearchPagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(celSet.total /celSet.itemsPerPage),
                        current : celSet.currentPage
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.purlCelebrateSearchPagination.setElement( that.$el.find('.pagination') );
            }
        } else {
            this.$el.find('.pagination').empty();
        }
    },
    renderParticipants: function(msg, data, selectedName){
        var that = this,
            tplName = 'purlCelebrateSearchItem',
            $searchContainer = this.$el.find('.searchList'),
            $searchResults = $searchContainer.find('.table'),
            $celContainer = this.$el.find('.purlCelebrateItems');

        $searchContainer.slideDown(G5.props.ANIMATION_DURATION);

        TemplateManager.get(tplName, function(tpl){
            var isSearch = true;
            that.$el.find('.searchList').empty();

            if(data.celebrations.length === 0){
                $celContainer
                    .addClass('emptySet')
                    .find('h2').remove()
                    .end().append(that.make('h2',{},$searchContainer.data('msgNoResults')))
                    .find('h2').prepend('<i class="icon-g5-norecognitions" />');

                that.renderSearchPagination(data, isSearch);

                return false;
            }

            that.$el.find('.emptySet h2').remove();

            $searchContainer.append(tpl(data));

            that.renderSearchPagination(data, isSearch);
            that.processTabularData(data);

            $searchContainer.attr('data-selected-name', selectedName);
            G5.util.hideSpin(that.$el);

        }, this.tplUrl);
    },
    setStateLoading: function(mode) {
        var spinProps = {};

        if( this.$el.closest('.module').length ) {
            spinProps.spinopts = {
                color : '#fff'
            };
        }
        if( mode ) {
            spinProps.classes = mode;
        }

        G5.util.showSpin(this.$el, spinProps);
    },
    setStateLoaded: function() {
        G5.util.hideSpin(this.$el);
    },
    changeView: function(e){
        $(e.currentTarget).closest('.purlCelebrateSelectView').submit();

        this.render();
    },
    doTabClick:function(e){
        var $tar = $(e.currentTarget),
            id = $tar.data('nameId'),
            tabClicked = true,
            that = this;

        //put the view into a loading state
        this.setStateLoading('tabChange');

        if(this.purlCelebratePagination){
            that.purlCelebratePagination = null;
        }

        //request the model to load the set, event is triggered to render changes
        this.model.loadData(id, tabClicked);

        e.preventDefault();
    },
    processTabularData: function(set) {
        var self = this,
            celSets = this.model.get('celebrationSets');

            _.each(set.tableColumns, function(col, place, list) {

                if( set.sortedOn == set.tableColumns[place].id ) {
                    col.sortedOn = true;
                    col.sortedBy = set.sortedBy || 'desc';
                }

                if( col.sortable ) {
                    // mark if this column is the one on which the table is sorted
                    col.sortedOn = set.sortedOn == col.id ? true : false;
                    // default to ascending sort, but mark with the actual sort state
                    col.sortedBy = set.sortedOn == col.id ? set.sortedBy : 'desc';
                    // Handlebars helper because #if can't compare values
                     col.sortedByDesc = col.sortedBy == 'desc' ? true : false;
                }
            });
    },
    tableClickHandler: function(e) {
        e.preventDefault();

        var thisView = this,
            $tar = $(e.target).closest('a'),
            id = this.$el.find('.purlCelebrateTabs li.active a').data('nameId'),
            selectedName = this.$el.find('.searchList').attr('data-selected-name');

        // for table headers
        if( $tar.closest('.sortable').length ) {
            var $newTar = $tar.closest('.sortable'),
                sortData = $newTar.data(),
                addlData = $.query.load( $newTar.find('a').attr('href') ).keys;

            G5.util.showSpin( this.$el, {
                cover : true
            });

            //if selected name exists it came from search, otherwise set to false
            if(!selectedName){
                selectedName = false;
            }
 
            this.model.update({
                force: true,
                data: $.extend(
                    true,       // deep merge = true
                    {},         // start with an empty object
                    addlData,   // merge in addlData
                    {           // then overwrite with these values
                        pageNumber : 1,
                        sortedOn : sortData.sortById,
                        sortedBy : sortData.sortedOn === true && sortData.sortedBy == 'asc' ? 'desc' : 'asc'
                    }
                ),
                type : 'tabular',
                nameId: id,
                selectedName: selectedName
            });
        }
    },
    paginationClickHandler: function(page, setId) {
        var selectedName = this.$el.find('.searchList').attr('data-selected-name');

        G5.util.showSpin( this.$el, {
            cover : true
        });

        //if selected name exists it came from search, otherwise set to false
        if(!selectedName){
            selectedName = false;
        }

        this.model.update({
            force: true,
            data: {
                pageNumber : page
            },
            type : 'getPage',
            nameId: setId,
            selectedName: selectedName
        });
    },
    renderSearch: function(){
        var $ph = this.$el.find('#purlCelebrateNameInput');

        $ph.placeholder();
        this.autocompDelay = this.$el.find('#purlCelebrateNameInput').data('autocompDelay');
        this.autocompMinChars = this.$el.find('#purlCelebrateNameInput').data('autocompMinChars');
    },
    //Auto complete
    doSearchInputFocus: function(e){
        var $searchInputDd = this.$el.find('.searchWrap');

        //open the autocomplete (dropdown menu)
        $searchInputDd.addClass('open');
        this.doAutocomplete();//attempt an autocomplete
    },
    doSearchInputBlur: function(e){
        var that = this,
            $searchInputMenu = this.$el.find('.dropdown-menu'),
            $searchInputDd = this.$el.find('.searchWrap');

        //hide the autocomplete (dropdown menu)
        if($searchInputMenu.find('.active').length === 0){
            $searchInputDd.removeClass('open');
            this.clearAutocompMenu();//clear results
        }else{
            setTimeout(function(){
                $searchInputDd.removeClass('open');
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
        var $searchInputMenu = this.$el.find('.dropdown-menu'),
            $searchInputDd = this.$el.find('.searchWrap'),
            $searchInput = this.$el.find('#purlCelebrateNameInput');

        switch(e.keyCode) {
            case 40: //down arrow
            case 38: //up arrow
                break;

            case 9: //tab
            case 13: //enter
                // check to see if there are results in the search input drop-down
                // if so, the enter key selects the result
                if( $searchInputDd.find('.active').length ) {
                    $searchInputMenu.find('.active a').click();
                    $searchInput.blur();
                }
                // if not, the enter key doesn't do anything special (and won't stop a search from kicking off)
                break;

            case 27: //escape
                $searchInputDd.removeClass('open');
                this.clearAutocompMenu();//clear results
                $searchInput.blur();
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
        var $searchInputMenu = this.$el.find('.dropdown-menu'),
            active = $searchInputMenu.find('.active').removeClass('active'),
            prev = active.prev();

        if(!prev.length){
            prev = $searchInputMenu.find('li').last();
        }

        prev.addClass('active');
    },
    doSearchInputNext: function(){
        var $searchInputMenu = this.$el.find('.dropdown-menu'),
            active = $searchInputMenu.find('.active').removeClass('active'),
            next = active.next();

        if(!next.length){
            next = $($searchInputMenu.find('li')[0]);
        }

        next.addClass('active');
    },
    //gateway to autocomplete, check num chars is enough
    doAutocomplete: function(){
        var $searchInput = this.$el.find('#purlCelebrateNameInput'),
            query = $searchInput.val(),
            that = this;


        if(query.length >= that.autocompMinChars){
            //set the time
            that.autocompLastKeyupTime = (new Date()).getTime();
            //set a timeout on delay, and see if keyboard has been idle for long enough
            setTimeout(function(){that.tryAutocomplete();},that.autocompDelay);
            if( !G5.util.formValidate(this.$el.find('.validateme')) ) {
                return false;
            }
            this.recipientSearchSpinner();
        }else{
            //clear the menu results
            this.clearAutocompMenu();
        }
    },
    //check the time since last keypress, and forward query if apropo
    tryAutocomplete: function(){
        var that = this,
            $searchInput = this.$el.find('#purlCelebrateNameInput'),
            $searchInputMenu = this.$el.find('.dropdown-menu'),
            now = (new Date()).getTime(),
            delay = now-this.autocompLastKeyupTime,
            query = $searchInput.val();

        //check to make sure no keys have been pressed during the delay (give 10ms margin)
        if(delay >= this.autocompDelay - 10){
            // check to make sure the query string isn't too long
            if(query.length >= this.autocompMinChars) {
                $searchInputMenu.empty();
                this.model.queryAutocomplete(query);
            }
            // not enough chars, set default text
            else {
                this.clearAutocompMenu();
            }
        }
    },
    // when an autocomplete selection comes back from server
    addCompletionsToDom: function(comps, serverMsg){
        var that = this,
            $searchInputMenu = this.$el.find('.dropdown-menu'),
            $searchBtn = this.$el.find('.searchBtn');

        $searchInputMenu.empty();
        this.recipientSearchSpinner("stop");

        if(!serverMsg && comps.length>0){
            //populate menu with results
            _.each(comps,function(comp){
                $searchInputMenu.append(
                    that.make('li',{},
                        that.make('a',{
                            href:'#',
                            'data-ac-id':comp.id,
                            'data-ac-name':comp.name
                        },comp.name)
                    )
                );
            });
            $searchBtn.removeAttr('disabled');

            //highlight first item
            $($searchInputMenu.find('li')[0]).addClass('active');
        } else if(!serverMsg && comps.length===0){
            //add display no results message
            this.setAutocompMenuMsg($searchInputMenu.data('msgNoResults'));
            $searchBtn.attr('disabled', 'disabled');
        } else {//server message
            this.setAutocompMenuMsg(serverMsg);
        }
    },
    doAutocompSelect: function(e){
        var $tar = $(e.target),
            $searchInputDd = this.$el.find('.searchWrap'),
            $searchInput = this.$el.find('#purlCelebrateNameInput'),
            $searchContainer = this.$el.find('.searchList'),
            $searchResults = $searchContainer.find('tbody'),
            selectedName = $tar.data('acName');

        e.preventDefault();

        //hide menu
        $searchInputDd.removeClass('open');

        //clear entered text
        $searchInput.val('');

        this.clearAutocompMenu();

        //empty results and slide container up
        $searchResults.empty();
        $searchContainer.slideUp(G5.props.ANIMATION_DURATION);

        G5.util.showSpin($searchContainer);

        this.model.loadParticipants(selectedName);
    },
    doAutocompMenuMouseenter: function(e){
        var $searchInputMenu = this.$el.find('.dropdown-menu');

        $searchInputMenu.find('.active').removeClass('active');
        $(e.currentTarget).not('.dropdown-menu-info').addClass('active');
    },
    clearAutocompMenu: function(){
        var $searchInputMenu = this.$el.find('.dropdown-menu'),
            msg = $searchInputMenu.data('msgInstruction');

        this.setAutocompMenuMsg(msg);
    },
    setAutocompMenuMsg: function(msg){
        var $i = $(this.make('li',{'class':'dropdown-menu-info'},msg)),
            $searchInputMenu = this.$el.find('.dropdown-menu'),
            that = this;
        //empty menu, and add a msg
        setTimeout(function(){ // IE8 + JQ1.8.3 -- push target.empty() to end of stack
            $searchInputMenu.empty();
            $searchInputMenu.append($i);
        }, 0);
    },
    recipientSearchSpinner: function( opt ) {

        var self           = this,
            $spinnerWrap   = this.$el.find(".searchWrap"),
            $searchBtn     = $spinnerWrap.find(".searchBtn"),
            $searchSpinner = this.$searchSpinner || (function(){

                                var opts = {
                                                color : $searchBtn.find("i").css("color")
                                           };

                                self.$searchSpinner = $spinnerWrap.find(".spinnerWrap")
                                                        .show()
                                                        .spin(opts);

                                return self.$searchSpinner;
                             })();

        if ( opt === "stop" ) {
            $searchSpinner.hide();
            $searchBtn.show();
        } else {
            this.$el.find(".qtip").qtip("hide");
            $searchSpinner.show();
            $searchBtn.hide();
        }
    },
    submitSearch: function(e) {
        var $input = this.$el.find("#purlCelebrateNameInput"),
            $btn = this.$el.find('.searchBtn'),
            $validate = this.$el.find('.validateme'),
            $searchInputDd = this.$el.find('.searchWrap'),
            that = this;

        e.preventDefault();

        if( !G5.util.formValidate($validate) ) {
            return false;
        }

        this.doAutocompSelect(e);

    },
    attachParticipantPopover:function(e){
        var $tar = $(e.target);

        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $tar.participantPopover().qtip('show');
        }
        e.preventDefault();
    }
});
