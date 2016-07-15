/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
SSISharedHelpersView,
SSIStackRankCollection:true
*/
SSIStackRankCollection = Backbone.Collection.extend({

    /**
     * Overwrite _.where to return the first result, rather than an array
     *
     * @param {object} val - matcher to look for in the models
     * @returns {object}
     */
    initialize: function () {
        'use strict';

        console.log('[SSI] chart - init collection');
        this.url = G5.props.URL_JSON_SSI_STACK_RANK_TABLE;
    },

    /**
     * Over writes `Collection.fetch` to allow processing of the
     * server response before it's set on the collection.
     *
     * @param {object} opts
     * @param {object} opts.data - optional info to be sent to the server
     * @param {function} opts.success - handling for ajax response
     * @param {function} opts.error - handling for ajax response
     * @returns {object}
     */
    fetch: function (opts) {
        'use strict';
        var helpers = new SSISharedHelpersView(),
            request = _.bind(helpers.requestWrap, helpers);

        return request({
                data: opts.data,
                url: this.url
            })
            .then(_.bind(function (resp) {
                this.reset(resp.data.stackRankParticipants);
                this.trigger('fetch:success', _.omit(resp.data, 'stackRankParticipants'));
            }, this))
            .then(opts.success || $.noop, opts.error || $.noop);
    },

    /**
     * Converts this collection to JSON and adds data used for templating
     *
     * @returns {object}
     */
    toProcessedJSON: function (opts) {
        'use strict';

        var length,
            json = _.chain(this.toJSON())
                    .sortBy(function(p){
                        return p.lastName;
                    })
                    .sortBy(function(p){
                        return p.rank;
                    })
                    .rest(opts.skip || 0)
                    .tap(function (json) {
                        length = opts.limit || json.length;
                    })
                    .first(length)
                    .value();

        _.each(json, function (participant) {
            var classes = [];
            // even or odd
            // classes.push(key % 2 ? 'odd' : 'even');
            // current user
            if (participant.currentUser) {
                classes.push('you');
            }

            if (participant.isTeamMember) {
                classes.push('teamMember');
            }

            participant.classes = classes;

            if (opts.payouts) {
                // debugger
                var payout = _.where(opts.payouts, { rank: participant.rank })[0] || {};
                payout.payoutType = opts.payoutType;
                payout.payoutOtherCurrency = opts.payoutOtherCurrency;
                participant.payout = payout;
            }
        });

        // console.table(json);

        return json;
    }
});
