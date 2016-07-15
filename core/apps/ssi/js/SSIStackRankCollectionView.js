/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
SSISharedHelpersView,
SSIStackRankCollection,
SSIContestModel,
SSIStackRankCollectionView:true
*/
SSIStackRankCollectionView = SSISharedHelpersView.extend({
    tpl: 'ssiStackRankCollectionTpl',

    tplPath : G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/',


    //override super-class initialize function
    initialize:function(opts){
        'use strict';

        console.log('[INFO] SSIStackRankCollectionView: stack rank collection view initialized', this);

        var that = this,
            // assume everything else is meant for the model
            modelData = _.omit(opts, ['el', 'leaders', 'parentView']),
            deferredLoad = true;

        this.collection = new SSIStackRankCollection();
        this.settings = new Backbone.Model(modelData);

        this.parentView = opts.parentView;
        this.fetchPromise = new $.Deferred();

        if (opts.leaders) {
            this.fetchPromise.resolve();
            this.collection.add(opts.leaders);
        } else {

            this.on('busCreated', function (bus) {
                bus.on('goToPage', function (page) {
                    that.getData(page);
                });

                bus.on('tabsView:filterChange', function (val) {
                    console.log('[SSI] SSIStackRankCollectionView - tabsView:filterChange');
                    that.settings.set('filter', val);
                        that.getData(1);
                });

                bus.on('deferredLoad', function () {
                    if (deferredLoad) {
                        that.getData(1);
                        deferredLoad = false;
                    }
                });

                if (!that.settings.get('deferred')) {
                    that.getData(1);
                }

            });
        }
    },

    /**
     * Tells the collection to get new data from the server
     *
     * @param {number} page - page to load
     * @returns {object}
     */
    getData: function (page) {
        'use strict';

        console.log('[SSI] SSIStackRankCollectionView - get data', page);

        this.fetchPromise = new $.Deferred();

        this.collection.fetch({
            data: this.buildRequestData(page),
            success: this.fetchPromise.resolve,
            error: this.fetchPromise.reject
        });

        this.collection.on('fetch:success', this.hcae(function (key, val) {
            this.settings.set(key, val);
        }, this));

        this.render();

        return this;
    },

    /**
     * (todo)
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    buildRequestData: function (page) {
        'use strict';

        var settings = this.settings.toJSON(),
            data = {
                page: page,
                id: this.parentView.id
            },
            trySet = this.curry(function (src, dest, prop, subProp) {
                if (src[prop] && !subProp) {
                    dest[prop] = src[prop];
                }

                if (subProp && src[prop] && src[prop][subProp]) {
                    dest[subProp] = src[prop][subProp];
                }
            }, settings, data);

        trySet('activityId');
        trySet('filter');
        trySet('limit');
        trySet('offset');

        return data;
    },

    /**
     * Checks to see if the collection is currently fetching data
     * and waits before rendering.
     *
     * @returns {object}
     */
    render: function () {
        'use strict';

        G5.util.showSpin(this.$el);

        $.when(this.fetchPromise).then(_.bind(this.renderLeaderboard, this));

        return this;
    },

    /**
     * Renders the empty leader board and triggers column rendering
     *
     * @returns {object}
     */
    renderLeaderboard: function () {
        'use strict';

        var compile = _.bind(function (tpl, vars, subTpls) {
                var tplName = this.$el.data('stackrank-tplname'),
                    stpl    = subTpls.leaderTpl;

                if (tplName && subTpls[tplName]) {
                    stpl = subTpls[tplName];
                }

                this.$el.empty().append(tpl({/* the subtemplates only need the data */}));
                this.renderColumns(stpl);
            }, this);

        TemplateManager.get(this.tpl, compile, this.tplPath);

        return this;
    },

    /**
     * Renders one or both columns
     *
     * @param {function} subTpl - single column template
     * @returns {object}
     */
    renderColumns: function (subTpl) {
        'use strict';

        var settings = _.extend(this.settings.toJSON(), {
                currentId: null
            }),
            data    = this.collection.toProcessedJSON(settings),
            columns = this.splitData(data),
            compileCol = function ($el, colData) {
                // var foo = settings;
                // debugger
                $el.html(subTpl(colData));
            },
            $colA = this.$el.find('.splitColA'),
            $colB = this.$el.find('.splitColB');

        SSIContestModel.reformatDecimalStrings({stackRankParticipants: data});

        compileCol($colA, columns.colA);

        if (columns.colB) {
            compileCol($colB, columns.colB);
        } else {
            // column a is allowed to go 100% width now
            $colA.addClass('splitColBEmpty');
        }

        // debugger

        G5.util.hideSpin(this.$el);

        return;
    },

    /**
     * Splits the json array into two arrays for the two columns
     *
     * @param {array} json - raw data
     * @returns {object}
     */
    splitData: function (json) {
        'use strict';

        var rowCount = this.settings.get('rowCount') || Math.ceil(json.length / 2),
            res = {
                colA: _.first(json, rowCount)
            };

        if (json.length > rowCount) {
            res.colB = _.rest(json, rowCount);
        }

        return res;
    }

});

