window.paxSearch = {};

// ***************************
// Participant Search Factory
// ***************************
window.paxSearch.create = function(el, opts) {

    /*
        888b. 8888 8888 8    8    8 Yb  dP       db          w   w
        8  .8 8www 8www 8    8    8  YbdP       dPYb   .d8b w8ww w .d8b. 8d8b. d88b
        8wwK' 8    8    8    8b..d8  dPYb      dPwwYb  8     8   8 8' .8 8P Y8 `Yb.
        8  Yb 8888 8    8888 `Y88P' dP  Yb    dP    Yb `Y8P  Y8P 8 `Y8P' 8   8 Y88P
    */
    var SearchActions = Reflux.createActions([
        "changeSearchMode", // tabs (preselected vs free search)
        "changeSearchType", // free input dropdown (first, last, job...)
        "searchInputChange", // free input string change
        "autoCompleteSelect", // select of autocompletion
        "addPresetFilter", // add preset filter (similar to autocompletion select)
        "clearCompletions", // clear list of completions
        "addFilter", // add a filter
        "removeFilter", // remove a filter
        "selectAllParticipants", // select all pax
        "selectParticipant", // select single pax
        "sortParticipants" // sort pax search results table
    ]);
    SearchActions.PRESET_MODE = 'preset';
    SearchActions.ASC = 'asc';
    SearchActions.DESC = 'desc';


    /*
        888b. 8888 8888 8    8    8 Yb  dP    .d88b.  w
        8  .8 8www 8www 8    8    8  YbdP     YPwww. w8ww .d8b. 8d8b .d88b
        8wwK' 8    8    8    8b..d8  dPYb         d8  8   8' .8 8P   8.dP'
        8  Yb 8888 8    8888 `Y88P' dP  Yb    `Y88P'  Y8P `Y8P' 8    `Y88P
    */
    var searchStore = Reflux.createStore(function() {

        // default options for search store
        var defOpts = {
            searchTypes : [
                {"id":"lastName","name":"Last Name"},
                {"id":"firstName","name":"First Name"},
                {"id":"location","name":"Location"},
                {"id":"jobTitle","name":"Job Title"},
                {"id":"department","name":"Department"},
                {"id":"country","name":"Country"}
            ],
            searchTypeSelectedId: null,
            presetSearchFilters: null,
            filters: [],
            participants: [],
            autoComplete: {
                delay: 500,
                minChars: 2,
                url: null,
                completions: []
            },
            searchUrl: null,
            selectMode: "multiple",
            sortBy: "lastName",
            sortOrdinality: SearchActions.ASC,
            ajax: {
                params: {}
            },

            i18n: {

            }
        };

        // this is the actual Reflux Store object returning in this self-calling function
        return {
            listenables: [SearchActions],
            data: _.extend({}, defOpts, opts, opts.intlData),

            MULTIPLE: 'multiple',

            init: function() {
                this.data.autoComplete = _.extend({}, defOpts.autoComplete, opts.autoComplete||{});
                this.data.ajax = _.extend({}, defOpts.ajax, opts.ajax||{});
                // required data
                if(!this.data.searchUrl) {        console.error("no [searchUrl] set!!!"); }
                if(!this.data.autoComplete.url) { console.error("no [autoComplete.url] set!!!"); }
                if(!this.data.searchTypes) {      console.error("no [searchTypes] set!!!"); }

                // set default searchTypeSelectedId
                if(!this.data.searchTypeSelectedId) {
                    this.data.searchTypeSelectedId = this.data.searchTypes[0].id;
                }

                this.data.searchTypeSelected = this.getActiveSearchType();

                if(this.data.presetSearchFilters && this.data.presetSearchFilters.filters.length) {
                    this.data.searchMode = SearchActions.PRESET_MODE;
                } else {
                    this.data.searchMode = null;
                }
            },
            getInitialState: function() {
                return this.data;
            },

            // REFLUX EVENTS
            onChangeSearchMode: function(mode) {
                // TODO: clear current filters when mode changes?
                this.data.searchMode = mode;
                this.trigger(this.data);
            },
            onChangeSearchType: function(searchTypeId) {
                this.data.searchTypeSelectedId = searchTypeId;
                this.data.searchTypeSelected = this.getActiveSearchType();
                this.trigger(this.data);
            },
            onSearchInputChange: function(input) {
                if(input.length >= 2) {
                    this.ajaxAutocomplete(input);
                } else {
                    this.data.autoComplete.completions = [];
                    this.trigger(this.data);
                }
            },
            onAutoCompleteSelect: function(autoCompItem) {
                var searchType = this.getActiveSearchType();

                this.addFilter({
                    id: autoCompItem.id,
                    name: autoCompItem.name,
                    type: searchType.id,
                    typeName: searchType.name
                });

                this.data.autoComplete.completions = [];
                this.data.autoComplete.isBusy = false;

                this.ajaxFetchPax();

                this.trigger(this.data);
            },
            onAddPresetFilter: function(presetIndex) {
                this.addFilter(this.getPresetFilterByIndex(presetIndex));

                this.data.autoComplete.completions = [];
                this.data.autoComplete.isBusy = false;

                this.ajaxFetchPax();

                this.trigger(this.data);
            },
            onClearCompletions: function() {
                this.data.autoComplete.completions = [];
                this.data.autoComplete.isBusy = false;
                this.trigger(this.data);
            },
            onSelectAllParticipants: function() {
                _.each(this.data.participants, function(p) {
                    if(!p.isLocked) { p.isSelected = true; }
                });
                this.trigger(this.data);
            },
            onSelectParticipant: function(id) {
                _.each(this.data.participants, function(p, idx) {
                    if(p.id == id) {
                        p.isSelected = !(p.isSelected ? true : false);
                    } else
                    if(this.data.selectMode != this.MULTIPLE && p.isSelected){
                        p.isSelected = false;
                    }
                }.bind(this));
                this.trigger(this.data);
            },
            onRemoveFilter: function(filterId) {
                this.remFilter(filterId);
                this.trigger(this.data);
            },
            onSortParticipants: function(fieldId) {
                // if sort on current column, then toggle ASC/DESC
                if(this.data.sortBy == fieldId) {
                    if(this.data.sortOrdinality == SearchActions.ASC) {
                        this.data.sortOrdinality = SearchActions.DESC;
                    } else {
                        this.data.sortOrdinality = SearchActions.ASC;
                    }
                }
                // else sortby field has changed
                else {
                    this.data.sortBy = fieldId;
                    this.data.sortOrdinality = SearchActions.ASC; // default
                }
                this.sortPaxen();
                this.trigger(this.data);
            },



            ajaxParams: function() {
                var filterParams = {};
                //set up filter params
                _.each(this.data.filters, function(filter){
                    filterParams[filter.type] = filter.id;
                });
                return _.extend({}, this.data.ajax.params, filterParams);
            },
            ajaxAutocomplete: function(input) {
                var that = this,
                    extraParams = this.ajaxParams();

                this.data.autoComplete.isBusy = true;
                this.trigger(this.data);

                this.ajax(
                    // url
                    this.data.autoComplete.url,
                    // data
                    _.extend({
                        query: input,
                        type: this.data.searchTypeSelectedId
                    }, extraParams),
                    // callback
                    function(data) {
                        var completions = _.sortBy(data.completions, function(r){ return [r.name, r.id]; });
                        this.data.autoComplete.completions = completions;
                        this.data.autoComplete.isBusy = false;
                        this.trigger(this.data);
                    }.bind(this)
                );
            },
            ajaxFetchPax: function() {
                this.data.isBusy = true;
                this.ajax(
                    this.data.searchUrl,
                    this.ajaxParams(),
                    function(data){
                        this.data.participants = data.participants;
                        this.sortPaxen();
                        if(!data.participants || !data.participants.length) {
                            this.paxFetchMsg = this.data.language.noResults;
                        }
                        this.data.isBusy = false;
                        this.trigger(this.data);
                    }.bind(this)
                );
            },
            ajax: function(url, data, cb) {
                $.ajax({
                    dataType:'g5json',//must set this so SeverResponse can parse and return to success()
                    url: url,
                    type: "POST",
                    data: data,
                    success:function(serverResp){
                        var data = serverResp.data,
                            msg = serverResp.getFirstError();
                        if(msg){msg = msg.text;}
                        if(cb) { cb(data); }
                    }.bind(this)
                });
            },


            sortPaxen: function() {
                this.data.participants = _.sortBy(this.data.participants, this.data.sortBy);
                if(this.data.sortOrdinality == SearchActions.DESC) {
                    this.data.participants.reverse();
                }
            },
            addFilter: function(filter) {
                if(filter) {
                    // remove if existing
                    this.remFilter(filter);
                    this.data.filters.push(filter);
                }
            },
            remFilter: function(filter) {
                if(_.isObject(filter)) { // remove by type
                    this.data.filters = _.filter(this.data.filters, function(f) { return f.type !== filter.type; });
                } else { // remove by id
                    this.data.filters = _.filter(this.data.filters, function(f) { return f.id !== filter; });
                }
                if(this.data.filters.length === 0) {
                    this.data.participants = []; // empty participants if no filters
                }
            },
            getActiveSearchType: function() {
                var types = this.data.searchTypes,
                    selId = this.data.searchTypeSelectedId,
                    found = _.where(types, {id: selId});

                return found.length ? found[0] : null;
            },
            getPresetFilterByIndex: function(idx) {
                return this.data.presetSearchFilters.filters[idx];
            }
        };
    }()); // end self-calling Reflux Store creation function












    /*
        888b. 8888    db    .d88b 88888
        8  .8 8www   dPYb   8P      8
        8wwK' 8     dPwwYb  8b      8
        8  Yb 8888 dP    Yb `Y88P   8
    */

    var IntlMixin = ReactIntl.IntlMixin; // i18n messages and other formatting goodies
    var FmtMsg = ReactIntl.FormattedMessage;
    var ReactTransitionGroup = React.addons.TransitionGroup;

    var PaxSearch = React.createClass({
        mixins: [Reflux.connect(searchStore, "searchData"), IntlMixin],
        render: function() {
            var searchProps = this.state.searchData;
            return (
                <div className="paxSearchView participantSearchView">
                    <SearchCreation {...searchProps} />
                    {/* TransitionGroup gives children special lifecycle methods for animation */}
                    <ReactTransitionGroup component="div">
                        {searchProps.filters.length ?
                            <Filters {...searchProps} /> : null}
                    </ReactTransitionGroup>
                    <ReactTransitionGroup component="div">
                        {searchProps.participants.length ?
                            <Results {...searchProps} /> : null}
                    </ReactTransitionGroup>
                </div>
            );
        }
    });




    var SearchCreation = React.createClass({
        render: function() {
            var presetMode = this.props.searchMode === 'preset';
            return (
                <div className="row participantSearchSelectAndInput">
                    <SearchTabs {...this.props} />
                    {presetMode ?
                        <PresetSearch {...this.props} /> :
                        <FreeSearch {...this.props} />
                    }
                </div>
            );
        }
    });

    var SearchTabs = React.createClass({
        mixins: [IntlMixin],
        handleDefaultClick: function(e) {
            e.preventDefault();
            SearchActions.changeSearchMode(null);
        },
        handlePresetClick: function(e) {
            e.preventDefault();
            SearchActions.changeSearchMode(SearchActions.PRESET_MODE);
        },
        render: function() {
            var presets = this.props.presetSearchFilters,
                presetMode = this.props.searchMode === 'preset';

            if(!presets || !presets.filters.length) {
                return null;
            }

            return (
                <div className="span12 filterCreationModeSelectWrapper">
                    <ul className="nav nav-tabs">
                        <li className={(presetMode ? "active ": "") + "presetFilterBtn"}>
                            <a href="#" onClick={this.handlePresetClick}>
                                <i className="icon-g5-team"></i>{' '}
                                {presets.name}
                            </a>
                        </li>
                        <li className={(presetMode ? "": "active ") + "defaultFilterBtn"}>
                            <a href="#" onClick={this.handleDefaultClick}>
                                <i className="icon-search"></i>{' '}
                                <FmtMsg message={this.getIntlMessage('paxSearch.freeSearch')} />
                            </a>
                        </li>
                    </ul>
                </div>
            );
        }
    });

    var PresetSearch = React.createClass({
        handleChange: function(e) {
            var val = parseInt($(e.target).val(), 10);
            if(_.isNaN(val)) { return; }
            SearchActions.addPresetFilter(val);
        },
        render: function() {
            return (
                <div className="span12 presetFilterCreationWrapper">
                    <select className="presetFilterSelect" onChange={this.handleChange}>
                        <option value="instruction">{this.props.presetSearchFilters.instruction}</option>
                        {this.props.presetSearchFilters.filters.map(function(f, idx){
                            return <option value={idx}>{f.name}</option>;
                        })}
                    </select>
                    {this.props.isBusy ? <Busy /> : null}
                </div>
            );
        }
    });

    var FreeSearch = React.createClass({
        render: function() {
            return (
                <div className="span12 defaultFilterCreationWrapper">
                    <SearchTypes {...this.props} />
                    <SearchInput {...this.props} />
                    {this.props.isBusy ? <Busy /> : null}
                </div>
            );
        }
    });

    var SearchTypes = React.createClass({
        handleChange: function(e) {
            var searchTypeId = $(e.target).val();
            SearchActions.changeSearchType(searchTypeId);
        },
        render: function() {
            var selId = this.props.searchTypeSelectedId;
            return (
                <select className="participantSearchSelect" defaultValue={selId} onChange={this.handleChange}>
                    {this.props.searchTypes.map(function(t){
                        return <option key={t.id} value={t.id}>{t.name}</option>;
                    })}
                </select>
            );
        }
    });





    var SearchInput = React.createClass({
        mixins: [IntlMixin],
        handleFocus: function(e) {
            this.setState({hasFocus: true});
            SearchActions.searchInputChange($(e.target).val());
        },
        handleBlur: function(e) {
            // allow some time after blur for a click on the completions
            // click will fail if button held down on ac item over timeout ms
            setTimeout(function(){
                this.setState({hasFocus: false})
                SearchActions.clearCompletions();
            }.bind(this), 200);
        },
        handleChange: function() {
            var v = $(React.findDOMNode(this)).find('input').val();
            SearchActions.searchInputChange(v);
        },
        handleClick: function(e) {
            e.preventDefault();
            var $lis = $(React.findDOMNode(this)).find('ul li'),
                $li = $(e.target).closest('li'),
                idx = $lis.index($li);

            this.state.autoCompSelIndex = idx;
            this.doAutoCompSelect();
        },
        handleKeyDown: function(e) {
            var k = e.keyCode;
            // tab, enter, esc
            if(_.contains([9,13,27,38,40], k)) { e.preventDefault(); }

            if(k==38 || k==40) {
                // 38 is up (true)
                this.moveSelAC(k===38 ? true : false);
            }
        },
        handleKeyUp: function(e) {
            var k = e.keyCode,
                $inp = $(React.findDOMNode(this)).find('input');

            // up & down arrow
            if(_.contains([40,38], k)) { return; }

            // tab, enter - do stuff with the selected completion
            if(_.contains([9,13], k)) {
                this.doAutoCompSelect();
                $inp.blur();
                return;
            }

            // esc - blur and clear comps
            if(k == 27) {
                $inp.blur();
            }
        },
        doAutoCompSelect: function() {
            var index = this.state.autoCompSelIndex;
            // clear our input
            $(React.findDOMNode(this)).find('input').val('');

            SearchActions.autoCompleteSelect(this.props.autoComplete.completions[index]);
        },
        componentWillMount: function() {
            this.handleChange = _.debounce(this.handleChange, 200);
        },
        getInitialState: function() {
            return {autoCompSelIndex: 0, hasFocus: false};
        },
        render: function() {
            var msg = this.getIntlMessage('paxSearch.autoComp'),
                isBusy = this.props.autoComplete.isBusy,
                completions = this.props.autoComplete.completions,
                selAC = this.state.autoCompSelIndex,
                hasFocus = this.state.hasFocus,
                showAC = hasFocus || isBusy || completions.length,
                cls = "dropdown participantSearchDropdownWrapper " + (showAC ? 'open' : ''),
                searchTypeName = this.props.searchTypeSelected.name,
                placeholder = this.formatMessage(msg.placeholder, {type: searchTypeName}),
                that = this;

            function status(){
                var cont;
                if(isBusy) {
                    cont = <Busy />;
                }
                else if(hasFocus && !completions.length) {
                    cont = <FmtMsg message={msg.startTyping} />;
                }
                return cont ? <li className="dropdown-menu-info">{cont}</li> : null;
            };

            var comps = completions.map(function(comp, idx) {
                return (
                    <li key={comp.id} className={idx === selAC ? 'active' : ''}>
                        <a  href="#"
                            data-id={comp.id}
                            onClick={that.handleClick}>{comp.name}</a>
                    </li>
                );
            });

            return (
                <div className={cls} >
                    <input type="text"
                        placeholder={placeholder}
                        className="participantSearchInput dropdown-toggle"
                        onChange={this.handleChange}
                        onFocus={this.handleFocus}
                        onBlur={this.handleBlur}
                        onKeyDown={this.handleKeyDown}
                        onKeyUp={this.handleKeyUp} />
                    <ul className="dropdown-menu participantSearchDropdownMenu" role="menu">
                        {status()}
                        {comps}
                    </ul>
                </div>
            );
        },
        moveSelAC: function(isUp) {
            var curInd = this.state.autoCompSelIndex,
                comps = this.props.autoComplete.completions,
                compsLen = comps.length,
                newInd;

            if(comps.length===0) { return; } // no autocomps
            if(comps.length===1) { newInd = 0 }
            else {
                if(isUp) {
                    newInd = curInd === 0 ? 0 : curInd - 1;
                } else { // is down
                    newInd = curInd === compsLen - 1 ? curInd : curInd + 1;
                }
            }
            this.setState({autoCompSelIndex: newInd});
        }
    });






    var Filters = React.createClass({
        mixins: [IntlMixin],
        // called if this is a child of a <ReactTransitionGroup>
        componentWillEnter: function(callback) {
            $(this.getDOMNode()).slideDown(100, callback);
        },
        // called if this is a child of a <ReactTransitionGroup>
        componentWillLeave: function(callback) {
            $(this.getDOMNode()).slideUp(100, callback);
        },
        render: function() {
            var filters = this.props.filters.map(function(filter, idx) {
                        return <Filter key={idx} {...filter} />;
                    });

            return (
                <div className="row participantSearchCountAndFilters" style={ {display: 'none'} }>
                    <ResultCount {...this.props} />
                    <div className="span11 participantSearchFilters">
                        <span className="filteredBy">
                            <FmtMsg message={this.getIntlMessage('paxSearch.filteredBy')} />
                        </span>
                        {filters}
                    </div>
                </div>
            );
        }
    });

    var ResultCount = React.createClass({
        mixins: [IntlMixin],
        render: function() {
            var numPax = this.props.participants.length;

            if(numPax === 0) { return null; }

            return (
                <div className="span1 participantSearchResultCountWrap">
                    <span className="participantSearchResultCount badge badge-inverse">{numPax}</span>
                    {' '}
                    <FmtMsg message={this.getIntlMessage('paxSearch.results')} num={numPax} />
                </div>
            );
        }
    });

    var Filter = React.createClass({
        handleRemClick: function(e) {
            e.preventDefault();
            SearchActions.removeFilter(this.props.id);
        },
        render: function() {
            return (
                <span className="filter xlabel xlabel-info">
                    <a className="filterDelBtn btn btn-mini" href="#" onClick={this.handleRemClick}>
                        <i className="icon-remove"></i>
                    </a>
                    <span className="muted"> {this.props.typeName}:</span> <strong> {this.props.name}</strong>
                </span>
            );
        }
    });





    var Results = React.createClass({
        // called if this is a child of a <ReactTransitionGroup>
        componentWillEnter: function(callback) {
            $(this.getDOMNode()).slideDown(200, callback);
        },
        // called if this is a child of a <ReactTransitionGroup>
        componentWillLeave: function(callback) {
            $(this.getDOMNode()).slideUp(200, callback);
        },
        render: function() {
            var pax = this.props.participants,
                msg = this.props.paxFetchError ?
                    <div className="span12 participantSearchMsg">
                        <div className="alert">
                            <span className="msg">
                                {this.props.paxFetchMsg}
                            </span>
                        </div>
                    </div> :
                    '';

            return (
                <div className="row participantSearchMessagesAndResults" style={ {display:'none'} }>
                    {msg}
                    <PaxTable {...this.props} />
                </div>
            );
        }
    });





    var PaxTable = React.createClass({
        mixins: [IntlMixin],
        handleAddAll: function() {
            SearchActions.selectAllParticipants();
        },
        handleRowFlagClick: function($el, country) {
            if(!$el.data('qtip')) {
                $el.qtip({
                    content:{ text: country },
                    position:{
                        my: 'left center',
                        at: 'right center',
                        container: $(React.findDOMNode(this))
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
        render: function() {
            var p = this.props,
                msg = this.getIntlMessage('paxSearch.table'),
                paxen = this.props.participants.map( function(p){
                    return (
                        <PaxTableRow key={p.id} flagClickCallback={this.handleRowFlagClick} {...p} />
                    );
                }.bind(this));
            return (
                <div style={{position: 'relative'}}>
                    <div className="span12 participantSearchTableWrapper" style={{position:'static'}}>
                        <table className="table table-striped table-bordered table-condensed">
                            <thead>
                                <tr>
                                    <PaxTableTH>
                                        {this.props.selectMode == 'multiple' ?
                                            <button className="btn btn-mini selectAllBtn" onClick={this.handleAddAll}>
                                                {msg.addAll}
                                            </button> :
                                            <span className="msgSelect">Select</span>}
                                    </PaxTableTH>
                                    {   // generate remaining THs
                                        [[msg.name,      'name',       'lastName'],
                                        [msg.org,        'org',        'orgName'],
                                        [msg.country,    'country',    'countryCode'],
                                        [msg.department, 'department', 'departmentName'],
                                        [msg.job,        'job',        'jobName']].map( function(x) {
                                            return (
                                                <PaxTableTH key={x[1]}
                                                    display={x[0]}
                                                    systemId={x[1]}
                                                    sortBy={x[2]}
                                                    sortOrdinality={p.sortBy == x[2] ? p.sortOrdinality : null} />
                                            );
                                        }.bind(this))
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                {paxen}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
    });

    var PaxTableTH = React.createClass({
        stickyStyle: {position: 'absolute', top: 0},
        handleClick: function(e) {
            e.preventDefault();
            SearchActions.sortParticipants(this.props.sortBy);
        },
        // throttled wrapper to updateStickies() on window resize
        handleResize: function() {
            var w;
            if(this.$el) {
                w = this.$el.width();
                if(this._lastWidth && this._lastWidth != w && !this._updateStickiesScheduled) {
                    // throttle this update so its not too too cray cray
                    this._updateStickiesScheduled = true;
                    setTimeout( function() {
                        this.updateStickies();
                        this._updateStickiesScheduled = false;
                    }.bind(this), 50);
                }
                this._lastWidth = w;
            }
        },
        componentDidMount: function() {
            // TODO - research why there aren't dimensions unless we push to end of stack with setTimeout
            //        ~ likely something to do with React internals, componentDidMount != componentVisible?
            setTimeout( function() {
                this.updateStickies();
            }.bind(this), 0);
            $(window).on('resize', this.handleResize);
        },
        componentDidUpdate: function() {
            this.updateStickies();
        },
        componentWillUnmount: function() {
            $(window).off('resize', this.handleResize);
        },
        render: function() {
            if(this.props.sortBy) { return this.renderSortable(); }

            return (
                <th className="selectHeader">
                    {this.props.children}
                    <div style={this.stickyStyle}>{this.props.children}</div>
                </th>
            );
        },
        renderSortable: function() {
            var p = this.props,
                so = p.sortOrdinality,
                sortCls = so ? (so === SearchActions.ASC ? ' asc icon-sort-up' : ' desc icon-sort-down') : '',
                cont = <span>
                    {p.display+' '}
                    <i data-sort={p.sortBy+"Name"} className={"sortControl icon-sort"+sortCls}></i>
                </span>;
            return (
                <th key={p.systemId}
                    className={"sortHeader "+p.systemId+"Header"+(so ? ' sorted' : '')}
                    onClick={this.handleClick}>
                    {cont}
                    <div style={this.stickyStyle}>
                        {cont}
                    </div>
                </th>
            );
        },

        updateStickies: function() {
            var $th = $(React.findDOMNode(this)),
                $div = $th.find('> div'), // nested "sticky" DIV
                props = [ // css props to copy straight from TH to inner DIV
                    'width', 'height', 'text-align', 'background-color',
                    'padding-left', 'padding-top', 'padding-right', 'padding-bottom'
                ];

            // this will be used in handleResize()
            this.$el = $th;

            // copy css props from TH to nested DIV
            _.each(props, function(p) {$div.css(p, $th.css(p));});

            // special props which differ from TH
            // - move DIV left by the width of the TH left padding
            // - make sure the DIV is on top
            $div.css({
                'margin-left': (parseInt($th.css('padding-left')) * -1) + 'px',
                'z-index': 1
            });
        }
    });

    var PaxTableRow = React.createClass({
        mixins: [IntlMixin],
        // this will increase the performance
        // - check to see if isSelected is different
        // * if anything else might need re-rendering, add it to the check here
        //   otherwise the component will not update when necessary
        shouldComponentUpdate: function(nextProps, nextState) {
            return this.props.isSelected != nextProps.isSelected;
        },
        handleClick: function(e) {
            if(this.props.isLocked) { return; }
            SearchActions.selectParticipant(this.props.id);
        },
        handleFlagClick: function(e) {
            var $tar = $(e.target);
            e.stopPropagation();
            this.props.flagClickCallback($tar, this.props.countryName);
        },
        render: function() {
            var p = this.props,
                classes = "participantSearchResultRow"+(p.isSelected?" selected":"")+(p.isLocked?" locked":""),
                flag = <img className="countryFlag"
                            src={"img/flags/"+p.countryCode+".png"}
                            alt={p.countryCode}
                            title={p.countryName}
                            onClick={this.handleFlagClick} />;

            return (
                <tr className={classes} onClick={this.handleClick}>
                    <PaxSelectCell {...p} />
                    <td className="participantSearchNameCol">
                        {p.firstName+' '+p.lastName}
                    </td>
                    <td className="participantSearchOrgCol">
                        {p.nodes ? p.nodes[0].name : (p.orgName || '')}
                    </td>
                    <td className="participantSearchCountryCol">{flag}</td>
                    <td className="participantSearchDepartmentCol">{p.departmentName}</td>
                    <td className="participantSearchJobCol">{p.jobName}</td>
                </tr>
            );
        }
    });

    var PaxSelectCell = React.createClass({
        mixins: [IntlMixin],
        render: function() {
            var p = this.props,
                selTxt = this.getIntlMessage('paxSearch.table.selectText'),

                locked = <i className='icon-lock'></i>,

                checkbox = <input type="checkbox"
                            className="participantSelectControl"
                            checked={p.isSelected ? true : false} />,

                link = <a href="#"
                        onClick={function(e){e.preventDefault();}}
                        className="participantSelectControl select-txt">{selTxt}</a>,

                desel = <span className="selected-txt">
                            <i className="icon icon-ok"></i>
                        </span>,

                select = selTxt ? (p.isSelected ? desel : link) : checkbox ;

            return (
                <td className={"selectCell"+(p.isSelected ? " selected" : "")}>
                    {p.isLocked ? locked : select}
                </td>
            );
        }
    });




    // NOTE: move this into participants generic component!!!
    var PaxItemXXX = React.createClass({
        render: function() {
            var p = this.props,
                orgStuff = _.filter([p.orgName, p.departmentName, p.jobName, p.orgType], _.isString),
                flag;

            flag = <img className="countryFlag"
                                src={"img/flags/"+p.countryCode+".png"}
                                alt={p.countryCode}
                                title={p.countryName} />;

            orgStuff = _.reduce(orgStuff, function(mem, str){return mem+" • "+str;});

            return (
                <tr className="participant-item">
                    <td className="participant">
                        <a href="#">{p.lastName+', '+p.firstName} {flag}</a>
                        <div className="org">{orgStuff}</div>
                    </td>

                </tr>
            );
        }
    });




    var Busy = React.createClass({
        componentDidMount: function() {
            $(React.findDOMNode(this)).spin();
        },
        render: function() {
            var style = {width: "30px", height: "24px", display: 'inline-block'};
            return (
                <div className="Busy" style={style}></div>
            );
        }
    });






    // ***********************************
    // RENDER ROOT and RETURN GOODIES
    // ***********************************
    var reactSearchElement = React.render(<PaxSearch />, el);

    return {
        store: searchStore,
        react: reactSearchElement,
        actions: SearchActions
    }
};