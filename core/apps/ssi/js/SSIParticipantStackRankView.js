/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
console,
Backbone,
PaginationView,
SSIEventBus,
SSIModuleView,
SSIStackRankCollectionView,
SSIParticipantContestView,
SSIParticipantStackRankView:true
*/
SSIParticipantStackRankView = SSIParticipantContestView.extend({
    /**
     * Optional template identifiers, in order of look up:
     *
     * creatorTpl       - page view, is creator
     * creatorModuleTpl - module view, is creator
     * managerTpl       - page view, is manager
     * managerModuleTpl - module view, is manager
     * adminTpl         - page view, is creator or manager
     * adminModuleTpl   - module view, is creator or manager
     * moduleTpl        - tpl view, participant or admin
     * tpl              - module or page view, participant or admin,
     *                    fall back to this if non other is provided
     *
     */
    creatorTpl: 'ssiCreatorStackRankTpl',

    managerTpl: 'ssiManagerStackRankTpl',

    tpl: 'ssiParticipantStackRankTpl',

    moduleTpl: 'ssiModuleStackRankTpl',

    events: {
        'click .payoutsToggle': 'togglePayoutsClass',
        'click .stackRankParticipantsToggle': 'toggleAllParticipantsClass'
    },

    initialize: function() {
        'use strict';

        console.log('init StackRankView');

        SSIParticipantContestView.prototype.initialize.apply(this, arguments);

        this.events = _.extend({}, SSIParticipantContestView.prototype.events, this.events);

        this.isModule = (this.parentView instanceof SSIModuleView);

        this.on('busCreated', function (bus) {
            bus.on('tabsView:filterChange', function (val) {
                this.updateFinalPayoutTable(val);
            }, this);
        }, this);

    },

    /**
     * Manager view specific functionality.
     * When filters are changed in a completed contest, the table of final payouts needs to be updated
     *
     * @param {string} val - filter value
     * @returns {object}
     */
    updateFinalPayoutTable: function (val) {
        'use strict';

        if (val === 'team') {
            this.$el.find('.payoutBoard li').hide();
            this.$el.find('.payoutBoard li.teamMember').show();
        } else {
            this.$el.find('.payoutBoard li').show();
        }

        return this;
    },

    /**
     * @extends SSIParticipantContestView.render
     * @returns {object}
     */
    render: function() {
        'use strict';

        var $thisEl = this.$el,
            that = this,
            superRender = SSIParticipantContestView.prototype.render,
            selfRender  = _.bind(function (key, el) {
                var $el = $(el),
                    data = [],
                    stackRankBoard;

                data.push({
                    parentView: this,
                    el: $el,
                    deferred: $el.data('stackrank-deferred')
                });

                data.push(this.getCollectionViewSettings($el));

                // modules get their data with the original request
                if (this.isModule) {
                    data.push({
                        leaders: this.model.get('leaders')
                    });

                } else {

                    if (this.model.get('status') === 'finalize_results' && this.model.has('payouts')) {
                        var model = this.model.toJSON(),
                            keys  = ['payouts', 'payoutType', 'payoutOtherCurrency'],
                            modelData = _.pick(model, keys);

                        data.push(modelData);
                    }
                }

                if (this.parentView.model.get('isManager')) {
                    data.push({
                        filter: this.$el.find('.active .tabFilter').data('filter')
                    });
                }

                data = _.extend.apply(_, data);

                stackRankBoard = new SSIStackRankCollectionView(data);

                if (this.isModule) {
                    stackRankBoard.render();

                } else {
                    var descendants = [this, stackRankBoard, stackRankBoard.collection],
                        paginationView,
                        tabsView,
                        bus;

                    // if (paginate) {
                    if ($el.data('stackrank-paginate')) {
                        paginationView = this.createPaginationView();
                        descendants.push(paginationView);
                    }

                    if (this.parentView.model.get('isManager')) {
                        tabsView = this.createTabsView();
                        descendants.push(tabsView);
                    }

                    bus = new SSIEventBus(descendants);

                }
                this.setPayouts();
            }, this);

        $.when(superRender.call(this))
            .then(function() {
                $.each($thisEl.find('.jsStackRankBoard'), selfRender);
                that.setPayouts();
            });

        return this;
    },

    createPaginationView: function() {
        'use strict';

        if (this.paginationView) {
            return this.paginationView;
        }

        var that = this,
            AltPaginationView = PaginationView.extend({
                render: function () {
                    // hi-jack `render` to wait for data from the server
                    return this;
                }
            });

        this.paginationView = new AltPaginationView({
            el : this.$el.find('.paginationControls'),
            ajax : true,
            showCounts : true
        });

        this.on('busCreated', function (bus) {
            bus.on('fetch:success', function (servResp) {
                console.log('bus success', servResp);
                var pages = Math.ceil(servResp.total / servResp.perPage);

                that.paginationView.setProperties({
                    rendered : false,
                    pages : pages,
                    current: servResp.current,
                    total: servResp.total,
                    per: servResp.perPage
                });

                PaginationView.prototype.render.call(that.paginationView);

                if (pages < 2) {
                    $('.stackRank').find('.paginationControls').hide();
                } else {
                    $('.stackRank').find('.paginationControls').show();
                }
            });

        }, this);

        return this.paginationView;
    },

    createTabsView: function () {
        'use strict';

        console.log('[TABS] createTabsView');

        var TabsView = Backbone.View.extend({
                events: {
                    'click .tabFilter': 'broadcastChange'
                },
                broadcastChange: function (e) {
                    this.trigger('tabsView:filterChange', $(e.currentTarget).data('filter'));
                },
                initialize: function () {
                    console.log('[TABS] init');
                }
            }),
            tabsView = new TabsView({
                el: this.$el.find('.paginationTabs')
            });

        return tabsView;
    },

    setPayouts: function(){
        var $payoutRow = this.$el.find('.payoutsRow');

        //have to set these in JS for IE8, quickest way to do this without having to re-do markup.
        $payoutRow.find('.payout:nth-child(n+4)').hide();

        $payoutRow.find('.payout:nth-child(3n+1)')
            .css({
                'marginLeft': '30px',
                'borderLeft': 'none'
            });

    },

    /**
     * Sorts json by payout
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    proccessModelJSON: function (json) {
        'use strict';

        var that = this;

        json.extraJSON = json.extraJSON || {};

        if (json.payouts) {
            json.payouts = _.sortBy(json.payouts, function (payout) {
                return payout.rank;
            });

            if (json.stackRankParticipants) {
                json.stackRankParticipants = _.map(json.stackRankParticipants, function (p) {
                    if (json.contestType !== 'stackRank') {
                        p.payout = _.where(json.payouts, {rank: p.rank})[0];
                    }
                    p.payoutType = that.model.get('payoutType');
                    p.payoutOtherCurrency = that.model.get('payoutOtherCurrency');
                    return p;
                });

                json.stackRankParticipants = _.sortBy(json.stackRankParticipants, function (p) {
                    return p.rank;
                });
            }

            if (json.stackRank) {
                var payoutObj = _.where(json.payouts, {rank: json.stackRank.rank});
                if (payoutObj && payoutObj[0]) {
                    json.extraJSON.badge = payoutObj[0].badge;
                    json.extraJSON.payout = payoutObj[0].payout;
                }
            }

            if (json.payouts.length <= 3) {
                json.extraJSON.hideShowAllPayouts = true;
            }
        }

        if (json.stackRankParticipants) {
            json.stackRankParticipants = _.map(json.stackRankParticipants, function (p) {

                if (p.isTeamMember) {
                    p.classes = p.classes || [];
                    p.classes.push('teamMember');
                }

                return p;
            });
        }

        return json;
    },

    /**
     * Grabs data from the element
     *
     * @returns {object}
     */
    getCollectionViewSettings: function ($el) {
        'use strict';
        var map = {
                '2x2': {
                    limit: 4,
                    rowCount: 4
                },
                '4x2': {
                    limit: 6,
                    rowCount: 3
                },
                '4x4': {
                    limit: 24,
                    rowCount: 12
                }
            },
            res = {},
            dimension;

        if (this.isModule) {
            dimension = $el.data('dimension');
            if (dimension) {
                _.extend(res, map[dimension] || {});
            }
            res.offset = null;
        } else {
            res.offset = $el.data('stackrank-offset') || null;
            res.limit = $el.data('stackrank-limit') || null;
            res.rowCount = $el.data('stackrank-rowcount') || null;
        }

        return res;
    },

    /**
     * Toggles class to hide / show additional payouts
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    togglePayoutsClass: function (event) {
        'use strict';

        event.preventDefault();

        var $wrap   = this.$el.find('.payoutsWrap'),
            classes = $wrap.data('classtoggle');

        $wrap.toggleClass(classes);

        $wrap.find('.payout:nth-child(n+4)').toggle();

        return this;
    },

    /**
     * Toggles class to hide / show additional payouts
     *
     * @param {object} event - jQuery event object
     * @returns {object}
     */
    toggleAllParticipantsClass: function (event) {
        'use strict';

        if (event && event.preventDefault) {
            event.preventDefault();
        }

        var $wrap   = this.$el.find('.stackRankAllWrap'),
            classes = $wrap.data('classtoggle');

        this.trigger('deferredLoad');

        $wrap.toggleClass(classes);

        return this;
    }

});
