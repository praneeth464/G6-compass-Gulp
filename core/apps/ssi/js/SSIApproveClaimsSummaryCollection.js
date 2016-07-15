/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
SSISharedHelpersView,
SSIContestModel,
SSIApproveClaimsSummaryCollection:true
*/
SSIApproveClaimsSummaryCollection = Backbone.Collection.extend({
    /**
     * Overwrite _.where to return the first result, rather than an array
     *
     * @param {object} val - matcher to look for in the models
     * @returns {object}
     */
    initialize: function () {
        'use strict';
        this.url = G5.props.URL_JSON_CLAIMS_APPROVAL_HISTORY;
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

                SSIContestModel.reformatDecimalStrings(resp.data);

                this.reset(resp.data.claims);
                this.trigger('fetch:success', _.omit(resp.data, 'claims'));
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

        return this.toJSON();
    }
});
