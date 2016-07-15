/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
console,
PageView,
Backbone,
SSIRouter,
SSIPageCollection,
SSIParticipantStepItUpView,
SSIParticipantDoThisGetThatView,
SSIParticipantObjectivesView,
SSIParticipantStackRankView,
SSIPageNavView,
SSISortableTableView,
SSIContestListView,
SSIPageView:true
*/

SSIPageView = PageView.extend({
    //override super-class initialize function
    router: new SSIRouter(),

    initialize: function (opts) {
        'use strict';

        var activeContests = opts.activeContests,
            topNavActiveContests = activeContests;

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

        /**
         * `contestCache` was once a beautiful request saver, loading
         * contests only when the data hadn't already been loaded.
         * However since the contests can change, it's being mostly
         * removed. Mostly, because it's still in use for the 'All Contests'
         * list table and in case a cache is later requested.
         */
        this.contestCache = new SSIPageCollection();
        this.model = new Backbone.Model();

        if (opts.modelData) {
            _.each(opts.modelData, function(val, key){
                this.model.set(key, val);
            }, this);
        }


        // NOTE: this is last minute hack for release (6/18/2015)
        // massage data for creator
        if(this.model.get('isCreator')) {
            topNavActiveContests = _.where(topNavActiveContests, {role: 'creator'});
        }

        // create nav
        this.nav = new SSIPageNavView({
            el: this.$el.find('#ssiContestNav'),
            parent: this,
            activeContests: topNavActiveContests
        });


        /*************************
         *    EVENT LISTENERS    *
         *************************/

        /**
         * Listener for active contest changes
         */
        this.nav.on('change', function(event) {
            var $el = $(event.target);

            if ($el.find(':selected').data('redirect')) {
                window.location = $el.val();
            } else {
                this.navigate($el.val());
            }
        }, this);

        /*************************
         *       ROUTEING        *
         *************************/

        // listen for routing changes
        if(!Backbone.History.started){
            Backbone.history.start({ silent: true });
        }

        // functionality to be applied every time a route changes
        this.router.on('route:*', function (path, param) {
            this.nav.setActive(path);
            this.unloadContest(this._prevContestPath);
            this._prevContestPath = param || path;
        }, this);

        this.router.on('route:index', function () {
            this.loadAllContests();
        }, this);

        this.router.on('route:archived', function () {
            this.loadArchivedContests();
        }, this);

        this.router.on('route:denied', function () {
            this.loadDeniedContests();
        }, this);

        this.router.on('route:contest', function (id) {
            this.loadContest(id);
        }, this);

        activeContests = this.shimData('all', opts.activeContests);
        this.createAndSaveContest(activeContests);

        /**
         * Immediately load a contest if an active contest is set
         */
        if (opts.contestData) {
            this.createAndSaveContest(opts.contestData);
            this.navigate('contest/' + opts.contestData.id);
        } else {
            var hash = window.location.hash.replace(/^#/, '');
            // backbone apparently needs to reset the path to trigger routing
            this.navigate('', { trigger: false })
                .navigate(hash || 'index');
        }

        return this;
    },

    render: function () {
        'use strict';

        this.nav.render();
    },

    /**
     * Shorthand for `this.router.navigate`. Switches `Backbone.Router`'s
     * default settings to what will be used for SSI most often.
     *
     * @param {string} path - url path to swap to
     * @param {object} opts - optional router params
     * @returns {object}
     */
    navigate: function (path, opts) {
        'use strict';

        this.router.navigate(path, _.defaults(opts || {}, {
            trigger: true,
            replace: true
        }));

        return this;
    },

    /**
     * Adds properties to the passed object so it can be
     * used similarily to the contests objests
     *
     * @param {string} id - id used for view look up
     * @param {array} data - data for current contests
     * @returns {object}
     */
    shimData: function (id, data) {
        'use strict';

        return {
            'id': id,
            'contestType': id,
            'contests': data
        };
    },

    /**
     * Checks if the requested contest id is already loaded in
     * the collection. Makes an ajax call to the server if the
     * contest data needs to be loaded still.
     *
     * @param {string} contestId
     * @param {string} JSONURL - end point for an ajax request
     * @returns {object}
     */
    getContestData: function (contestId, JSONURL) {
        'use strict';
        console.log('[SSI] getContestData called');

        var that = this,
            deferrer = new $.Deferred(),
            contestView = this.contestCache.getView(contestId);

        if (contestView) { // contest data already exists
            deferrer.resolve(contestView, contestId);
        } else { // get the data from the server and store it

            this.nav.trigger('loadStart');

            if (!JSONURL) {
                this.nav.trigger('loadStop');
                return deferrer.reject('[SSI] `getContestData` requires a URL');
            }

            $.ajax({
                dataType: 'g5json',
                type: 'POST',
                url: JSONURL,
                data: {
                    id: contestId
                },
                success: function(serverResp) {
                    deferrer.resolve(serverResp.data, contestId);
                },
                error: function(jqXHR, textStatus) {
                    console.warn('[SSI] SSIPageView.getContestData - error loading json', jqXHR, textStatus, JSONURL);
                    console.log(JSON.stringify(jqXHR));
                    deferrer.reject(textStatus);
                },
                complete: function () {
                    that.nav.trigger('loadStop');
                }
            });
        }

        return deferrer.promise();
    },

    /**
     * "Smart" contest loading. Injects the loaded contest into an
     * empty element in the container. When this contest is loaded
     * again, the loaded HTML is shown without requests to the
     * server.
     *
     * @param {string} contestId
     * @param {string} [JSONURL] - end point to load JSON from
     * @returns {object}
     */
    loadChildView: function (id, JSONURL) {
        'use strict';


        var loadedContests = this.$el.find('.ssiSingleContestViewWrap'),
            currentContest = loadedContests.filter(function(key, el) {
                return $(el).data('viewId') === id;
            }),
            childView;

        loadedContests.hide();

        if (!!currentContest.length) {
            currentContest.show();
            childView = this.contestCache.get(id).get('view');
            childView.trigger('compiled');
            this.trigger('loadChildView', id, childView);
        } else {
            this.getContestData(id, JSONURL)
                .then(_.bind(this.processLoadedData, this), function (err) {
                    console.error('[SSI] error loading child data', err);
                })
                .then(_.bind(function (childView) {
                    this.$el.find('#ssiContestView').append(childView.$el);
                    // debugger
                    this.trigger('loadChildView', id, childView);
                }, this));
        }

        return this;
    },

    /**
     * Wraps and renders loaded view
     *
     * @param {object} data - child view information
     * @param {string} id - child view id
     * @returns {object}
     */
    processLoadedData: function (data, id) {
        'use strict';

        var $wrap,
            childView;

        if (!(data instanceof Backbone.View)) {
            if (!data.id && !data.contestType) {
                data = this.shimData(id, data);
            }
            childView = this.createContestView(data);
        } else {
            childView = data;
        }

        if (_.isEmpty(childView)) {
            return new $.Deferred().reject('[SSI] `processLoadedData` requires valid Backbone.View');
        }

        $wrap = $('<div class="ssiSingleContestViewWrap">');

        $wrap.data('viewId', childView.id);
        childView.setElement($wrap);

        return childView.render();
    },


    /**
     * Loads archived contests overview table
     *
     * @returns {object}
     */
    loadArchivedContests: function () {
        'use strict';

        this.loadChildView('archived', G5.props.URL_JSON_SSI_ARCHIVED_CONTEST);

        return this;
    },

    /**
     * Loads archived contests overview table
     *
     * @returns {object}
     */
    loadDeniedContests: function () {
        'use strict';

        this.loadChildView('denied', G5.props.URL_JSON_SSI_DENIED_CONTEST);

        return this;
    },

    /**
     * Loads all contests overview table
     *
     * @returns {object}
     */
    loadAllContests: function () {
        'use strict';

        this.loadChildView('all');

        return this;
    },

    /**
     * Loads a single contest view
     *
     * @param {string} id - contests id
     * @returns {object}
     */
    loadContest: function(id) {
        'use strict';

        this.loadChildView(id, G5.props.URL_JSON_SSI_CONTEST);

        return this;
    },

    /**
     * Deletes in page markup now that it's no londer needed
     *
     * @param {string} path - contest id or full url (if it's not a contest)
     * @returns {object}
     */
    unloadContest: function (path) {
        'use strict';

        if (!path || (path && path === "all")) {
            return this;
        }

        this.$el.find('.ssiSingleContestViewWrap')
            .filter(function(key, el) {
                return $(el).data('viewId') === path;
            })
            .remove();

        return this;
    },

    /**
     * Creates child view
     *
     * @param {object} data - child view's information
     * @returns {object}
     */
    createContestView: function (data) {
        'use strict';

        var contestMap = {
                'all': SSIContestListView,
                'archived': SSISortableTableView.extend({
                    tpl: 'ssiContestArchiveTpl'
                }),
                'denied': SSISortableTableView.extend({
                    tpl: 'ssiContestDeniedTpl'
                }),
                'stepItUp': SSIParticipantStepItUpView,
                'doThisGetThat': SSIParticipantDoThisGetThatView,
                'objectives': SSIParticipantObjectivesView,
                'stackRank': SSIParticipantStackRankView
            },
            contestType = data.contestType,
            isAdmin = this.model.get('isManager') || this.model.get('isCreator'),
            _data;

        if (!contestMap[contestType]) {
            return;
        }

        _data = {
            parentView: this,
            id: data.id,
            data: data
        };

        if (contestType !== 'all' && contestType !== 'archived') {
            _data.wrapperTpl = isAdmin ? 'ssiAdminContestTpl' : 'ssiParticipantContestTpl';
        }

        if (contestType === 'all') {
            _data.defaultSort = isAdmin ? 'status' : 'endDate';
        }

        return new contestMap[contestType](_data);
    },

    /**
     * Creates a child view and immediately saves it to
     * the collection.
     *
     * @param {object} data - child view's information
     * @returns {object}
     */
    createAndSaveContest: function (data) {
        'use strict';
        var contestView = this.createContestView(data);
        this.contestCache.cacheView(contestView);
        return contestView;
    },

    /**
     * Converts `this.model` to values usable by the templates
     *
     * @returns {object}
     */
    getTemplateDataJSON: function () {
        'use strict';

        var model = this.model.toJSON(),
            keys  = ['isManager', 'isCreator'],
            data  = _.pick(model, keys);

        if (data.isManager || data.isCreator) {
            data.isManagerOrCreator = true;
        } else {
            data.isParticipant = true;
        }

        return data;
    }

});
