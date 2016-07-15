/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
console,
TemplateManager,
SSISharedHelpersView,
SSISortableTableCollection,
SSIPageNavView:true
*/
SSIPageNavView = SSISharedHelpersView.extend({
    tpl: 'ssiParticipantNavigationTpl',

    initialize: function (opts) {
        'use strict';

        // console.log('init contest nav');

        // collection setup
        var activeContests = _.filter(opts.activeContests, function (contest) {
            return contest.status === 'live' || contest.status === 'finalize_results';
        });
        this.collection = new SSISortableTableCollection(activeContests);

        this.tplPath = './../apps/ssi/tpl/';
        this.parent = opts.parent;

        this.on('loadStart', this.loadStart);
        this.on('loadStop', this.loadStop);

        this.hasRendered = new $.Deferred();

        // this.parent.router.on('route:contest', function (id) {
        //     debugger
        // }, this);

        this.parent.on('loadChildView', _.bind(this.changeChildView, this));
    },

    /**
     * Overly complicated rendering. If the current user is a creator, fetch
     * what contest types they have access to before rendering. Otherwise, just
     * render the view immediately.
     *
     * @returns {object}
     */
    render: function () {
        'use strict';

        var processTpl = function(data, tpl) {
                this.$el.html(tpl(data));
                this.trigger('postRender');
                this.hasRendered.resolve();
            },
            _delayedRender = _.bind(function (fetchData) {
                var data = _.extend({}, {
                        contests: this.collection.toSortedJSON('name'),
                        awardThemNowURL: G5.props.URL_SSI_ATN_CONTEST_SUMMARY
                    }, this.parent.model.toJSON(), fetchData);

                TemplateManager.get(this.tpl, _.bind(processTpl, this, data), this.tplPath);
            }, this);

        if (this.parent.model.get('isCreator')) {
            this.requestWrap({
                url: G5.props.URL_JSON_SSI_AVAILABLE_CONTEST_TYPES
            })
            .then(function (servResp) {
                _delayedRender(servResp.data);
            }, function () {
                console.warn('fetch available contest types error');
            });
        } else {
            _delayedRender();
        }

        return this;
    },

    loading: function (isLoading) {
        'use strict';

        this.$el.find('select').attr('disabled', isLoading);
        this.$el.find('.spinner')
            // [isLoading ? 'show' : 'hide']()
            .spin(isLoading);

        return this;
    },

    loadStart: function () {
        'use strict';

        this.loading(true);
        return this;
    },

    loadStop: function () {
        'use strict';

        this.loading(false);
        return this;
    },

    /**
     * tells parent view that the selected contest has been changed
     * and things need to be fetched / rendered / etc
     *
     * @param {object} event - jQuery event
     * @returns {object}
     */
    broadcastChange: function (event) {
        'use strict';

        this.trigger('change', event);

        return this;
    },

    /**
     * Selects active contest in drop down list.
     *
     * This is all kinds of weird (sorry). It was origianlly written when `id`
     * was just an id and everything was simple. Since now the `id` is hashed,
     * it's value will be different between active contests and current contest.
     *
     * However, *both* should have `contestId` that can be used to match.
     *
     * To make things more difficult, on page load bootstrapped data has a
     * unique hashed `id` so sometimes we need to search `contestData` [1]
     * and the rest of the time we need to search `activeContests`. [2]
     *
     * Ugh.
     *
     * @param {string|number} id - option element value
     * @returns {string}
     */
    setActive: function (id) {
        'use strict';

        var contestRegexp = (/^contest\/(.+)/);

        // if the nav hasn't rendered yet, wait for the promise to resolve
        $.when(this.hasRendered).then(_.bind(function () {
            var selector = 'value',
                split,
                splitId,
                contestId;

            if (contestRegexp.test(id)) {
                split = contestRegexp.exec(id);
                if (split[1]) {
                    splitId = split[1];
                }
            }

            if (splitId) {
                // if (this.parent.options.contestData.id === splitId) { // [1]
                if (this.safeGet(this.parent, 'options.contestData.id') === splitId) { // [1]
                    contestId = this.parent.options.contestData.contestId;
                } else { // [2]
                    var contest = this.collection.where({id: splitId});

                    if (contest[0]) {
                        contestId = contest[0].get('contestId');
                    }
                }
                selector = 'data-contestid';
            }

            // fall back to 'id'
            this.$el.find('option[' + selector + '="' + (contestId || id) + '"]').prop('selected', true);
        }, this));

        return this;
    },

    /**
     * Handles hiding / showing of links
     *
     * @param {string} id - childView id
     * @param {object} childView - child view data
     * @returns {object}
     */
    changeChildView: function (id, childView) {
        'use strict';

        var childModel = childView.model;

        // Update pageTitle
        // http://bugzilla.biworldwide.com/bugzilla/show_bug.cgi?id=60775
        // http://bugzilla.biworldwide.com/bugzilla/show_bug.cgi?id=60659
        if(!childModel) {
            // set to original page title (set in HTML/JSP)
            $('#pageTitle').html( this.parent.options.pageTitle );
        } else {
            // set to contest model value
            $('#pageTitle').html( childModel.get('name') );
        }

        $.when(this.hasRendered).then(_.bind(function () {
            if (id === 'all' && this.parent.model.get('isCreator')) {
                this.$el.find('.formWrap').show();
                this.$el.find('.editWrap').hide();
            } else if (childModel && this.parent.model.get('isCreator') && childModel.get('status') == 'live') {
                this.$el.find('.formWrap').hide();
                this.$el.find('.editWrap').show();
                this.setEditURL(id);
            } else if(childModel && childModel.get('isParticipantDrillDown')){
                this.$el.find('.editWrap, .formWrap').hide();
                this.$el.find('.contestSelectWrap').hide();
            } else {
                this.$el.find('.editWrap, .formWrap').hide();
            }
        }, this));

        return this;
    },

    /**
     * Since this view isn't rerendered each time there is navigation,
     * we need to manually update the edit contest link
     *
     * @param {string} id - contest id
     * @returns {object}
     */
    setEditURL: function (id) {
        'use strict';

        if (!id) {
            return this;
        }

        var $btn = this.$el.find('.editLink'),
            tpl  = $btn.data('href');

        if (tpl) {
            $btn.attr('href', G5.util.cmReplace({
                cm: tpl,
                subs: [id]
            }));
        }

        return this;
    },

    /**
     * Gets a value from a deep nested object without risking errors
     *
     * @param {object} obj - object to search in
     * @param {string} path - what we want to retrieve
     * @returns {...}
     */
    safeGet: function (obj, path) {
        'use strict';

        if (!path || !_.isString(path)) {
            return false;
        }

        return _.reduce(path.split('.'), function(prev, curr){
            if (prev && prev[curr]) {
                return prev[curr];
            }

            return false;
        }, obj);
    },

    events: {
        'change .contestSelect': 'broadcastChange'
    }
});

