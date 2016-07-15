/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
Backbone,
SSICreatorContestModel:true
*/
SSICreatorContestModel = Backbone.Model.extend({
    /**
     * Conditionally request JSON from the server.
     * If the collection already has child models,
     * assume those are what we want and cancel request.
     *
     * @param {object} [data] - optional additional settings for $.ajax request
     * @returns {object}
     */
    makeFetchHappen: function (data) {
        'use strict';

        this.url = G5.props.URL_JSON_SSI_AVAILABLE_CONTEST_TYPES;

        if (!!this.get('contestTypes')) {
            // stop trying to make fetch happen,
            // it's not going to happen!
            return new $.Deferred().resolve();
        }

        var settings = {
                dataType: 'g5json',
                type: 'POST'
            };

        if (data && _.isObject) {
            settings = _.extend({}, settings, data);
        }

        return Backbone.Model.prototype.fetch.call(this, settings);
    },
    /**
     * g5json returns a nested object that needs to
     * be dived into to get the correct information.
     *
     * @param {object} response - raw server response
     * @returns {object}
     */
    parse: function (response) {
        'use strict';

        return response.data;
    }
});