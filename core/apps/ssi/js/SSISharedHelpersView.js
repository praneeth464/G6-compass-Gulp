/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
console,
Backbone,
SSISharedHelpersView:true
*/

// SSIActivityPageView = Backbone.View.extend({
SSISharedHelpersView = Backbone.View.extend({
    /**
     * Changes class to the appropriate setting and
     * sets a data attribute marking status. This is used
     * to indicate status on views that need to interact with
     * the server.
     *
        <div class="contestStatus">
            <span class="pending"></span>
            <i class="valid icon-ok-sign"></i>
            <i class="invalid icon-remove-sign"></i>
            <p class="msg"></p>
        </div>
     *
     * @param {element} $el - jQuery element
     * @param {string} [status] - status identifier
     * @param {string} [msg] - optional messaging to be displayed
     * @returns {object}
     */
    setStatus: function ($el, status, msg) {
        'use strict';

        var $msg = $el.find('.msg');

        $el.removeClass('pending valid invalid');
        $el.addClass(status);
        $el.data('validationStatus', status || '');

        $msg.text(msg || '');

        return this;
    },

    /**
     * Wraps common server interaction with a more useful[1]
     * way. Doing this allows for a single error handling method
     * for both server errors and validation errors.
     *
     * [1] opinion
     *
     * @param {object} opts - settings for this interaction
     * @param {object} opts.$status - jQuery reference to status element
     * @param {string} opts.url - url to post to
     * @param {object} opts.data - data to send to url
     * @returns {object}
     */
    requestWrap: function (opts) {
        'use strict';

        var setStatus  = opts.$status ? this.curry(this.setStatus, opts.$status) : null,
            handleResp = _.bind(function (servResp) {
                var deferrer = new $.Deferred(),
                    err = servResp.getFirstError(),
                    success = servResp.getFirstSuccess(),
                    action,
                    data;

                if (setStatus) {
                    setStatus('valid');
                }

                if (err) {
                    action = 'reject';
                    data = err;
                } else if (success) {

                    action = 'resolve';
                    data = success;
                } else {

                    action = 'resolve';
                    data = servResp;
                }

                return deferrer[action](data, servResp);
            }, this);

        if (setStatus) {
            opts.$status.find('.pending').spin(true);

            setStatus('pending');
        }

        return $.ajax({
                url : opts.url,
                type : 'post',
                data : opts.data,
                dataType : 'g5json'
            })
            .then(handleResp, function (jqxhr, status, err) {
                if (setStatus) {
                    setStatus('invalid');
                }
                return {
                    text: err
                };
            });
    },

    /**
     * Shows modal with error messaging
     *
     * NOTE: this is currently tied to activity list page,
     *       refactor to use else where.
     *
     * @param {object} err - First error message returned from the server
     * @returns {object}
     */
    showErrorModal: function (err) {
        'use strict';

        console.log('[SSI] showErrorModal arguments', arguments);

        var $modal = this.$el.find('#activityModal');

        $modal.find('.modal-body p').html(err.text);
        $modal.modal();

        return this;
    },

    /**
     * function currying
     *
     * @param {function} fn - future function to be called
     * @returns {function}
     */
    curry: function (fn) {
        'use strict';

        if (!fn) {
            console.warn('[SSI] curry called without a passed function');
            return $.noop;
        }

        var that = this,
            args = _.rest(arguments);

        return function() {
            var subArgs = [].concat(args, _.toArray(arguments));
            return fn.apply(that, subArgs);
        };
    },

    /**
     * $.each with the arguments flipped, so we can curry it
     *
     * @param {function} foo - foo description
     * @returns {string}
     */
    hcae: function(fn, ctx) {
        if (ctx) {
            fn = _.bind(fn, ctx);
        }
        return function (arrOrObj) {
            return $.each(arrOrObj, fn);
        };
    },

    /**
     * Creates a copy of a mutable object.
     * Useful when nested obects need to be cloned, since _.clone only
     * produces a shallow copy.
     *
     * @param {object|array} obj - thing to be copied
     * @returns {object|aray}
     */
    deepClone: function (obj) {
        'use strict';
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (err) {
            console.error(err);
            return {};
        }
    },

    /**
     * Splits an array into two separate arrays based on
     * a passed/failed function. Based off of `_.partition` in
     * newer versions of underscore.
     *
     * @param {array} data - list of elements to be looped over
     * @param {function} fn - pass/fail function called with `val, key` pairs
     * @returns {array}
     */
    partition: function (data, fn) {
        'use strict';

        var res = {
            passed: [],
            failed: []
        };

        _.each(data, function (val, key) {
            res[fn(val, key) ? 'passed' : 'failed'].push(val);
        });

        return [res.passed, res.failed];
    }
});
