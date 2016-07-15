/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
Backbone,
console,
SSISharedHelpersView,
SSIPayoutChartView:true
*/

/**
 * Helper view for drawing creator payout charts,
 * currently used in Step It Up and Objectives contests.
 *
 * @returns {object}
 */
SSIPayoutChartView = SSISharedHelpersView.extend({
    /**
     * @param {object} opts
     * @param {object} opts.settings - chart settings
     * @param {object} opts.parentView - super class
     * @returns {object}
     */
    initialize: function (opts) {
        'use strict';
        // alias current view
        console.log('[SSI] initialize SSIPayoutChartView');

        // alias for parent view
        this.parentView = opts.parentView;

        this.model = new Backbone.Model();

        this.setup();
        this.render();

        return this;
    },

    getSettings: function() {
        return {
            includeBonus:           this.parentView.model.get('includeBonus'),
            payoutProgress:         this.parentView.model.get('payoutProgress'),
            payoutPercentProgress:  this.parentView.model.get('payoutPercentProgress'),
            payoutCap:              this.parentView.model.get('payoutCap'),
            payoutBonusCap:         this.parentView.model.get('payoutBonusCap')
        };
    },

    /**
     * Attaches settings to the view
     *
     * Split into it's own function mostly for readiblity.
     *
     * @param {object} settings
     * @param {boolean} settings.includeBonus - if the bonus is included in this contest
     * @param {string} settings.payoutProgress - payout issued thus far
     * @param {number} settings.payoutPercentProgress - percent of potential payout
     * @param {string} settings.payoutCap - max payout
     * @param {string} settings.payoutBonusCap - max payout plus bonus
     * @returns {object}
     */
    setup: function () {
        'use strict';
        var settings = this.getSettings();

        this.model.set('includeBonus', settings.includeBonus);

        this.model.set('payoutProgress',        this.ensureNumerical(settings.payoutProgress,        'payoutProgress'));
        this.model.set('payoutPercentProgress', this.ensureNumerical(settings.payoutPercentProgress, 'payoutPercentProgress'));
        this.model.set('payoutCap',             this.ensureNumerical(settings.payoutCap,             'payoutCap'));
        this.model.set('payoutBonusCap',        this.ensureNumerical(settings.payoutBonusCap,        'payoutBonusCap'));

        // debugging IE
        // console.log('[SSI] SSIPayoutChartView.setup - settings: ', JSON.stringify(settings, null, '\t'));

        this.$bar      = this.$el.find('.barFill');
        this.$progress = this.$el.find('.ssiPayoutGraphProgressMarker');
        this.$payout   = this.$el.find('.ssiPayoutGraphGoalMarker.payout');
        this.$bonus    = this.$el.find('.ssiPayoutGraphGoalMarker.bonus');

        this.$sectionTitle = this.parentView.$el.find('.graphFlow');

        return this;
    },

    /**
     * creates and adds paths to the stage
     *
     * @returns {object}
     */
    render: function () {
        'use strict';


        // this chart is much simplier than the bar or circle charts
        // all that really needs to be done is positioning graph markers

        var width = this.$el.width(),
            progressWidth = width * (this.model.get('payoutPercentProgress') / 100);

        if (this.model.get('includeBonus')) {
            this.$bonus.css('left', width);
            this.$payout.css('left', (this.model.get('payoutCap') / this.model.get('payoutBonusCap')) * width - this.$payout.width());
        } else {
            this.$payout.css('left', (width - this.$payout.width()));
            this.$bonus.hide();
        }

        this.$bar.width(progressWidth);

        if (this.$progress.length) {
            this.$progress.css('left', progressWidth);

            this.$progress.addClass('top');

            if (this.overlaps(this.$sectionTitle, this.$progress)) {
                this.$progress
                    .removeClass('top')
                    .addClass('bottom');

                if (this.overlaps(this.$payout, this.$progress)) {
                    this.$el.parents('.payoutData')
                        .addClass('tall');
                    this.$progress
                        .removeClass('bottom')
                        .addClass('top');
                }
            }
        }

        return this;
    },

    /**
     * Check if two elements occupy the same screen space
     *
     * @param {object} $dis - jQuery element
     * @param {object} $dat - jQuery element
     * @returns {boolean}
     */
    overlaps: function ($dis, $dat) {
        'use strict';

        function _getBox ($el) {
            var offset = $el.offset();

            return _.extend(offset, {
                bottom: offset.top + $el.outerHeight(),
                right: offset.left + $el.outerWidth()
            });
        }

        /**
         * Checks if passed numbers are sequentially in an
         * ascending or descending order.
         *
         * @param {number...} - numbers to compare
         * @returns {boolean}
         */
        function _seq (/*numbers*/) {
            var _set = (function(){
                    var _val = null;

                    function _set (val) {
                        if (_.isNull(_val)) {
                            _val = val;
                        }
                        return (val === _val);
                    }

                    return _set;
                }()),
                nums  = _.toArray(arguments),
                isSeq = true,
                setListen,
                curr,
                next;

            for (var i = 0; i < nums.length; i++) {
                curr = nums[i];
                next = nums[i+1];

                // we've reached the end
                if (_.isUndefined(next)) {
                    break;
                }

                // matching values is allowed, and we don't want to change anything in that case
                if (curr === next) {
                    continue;
                }

                if (curr > next) {
                    setListen = _set('desc');
                }

                if (curr < next) {
                    setListen = _set('asc');
                }

                if (!setListen) {
                    isSeq = false;
                    break;
                }

            }

            return isSeq;
        }

        var disBox = _getBox($dis),
            datBox = _getBox($dat),
            overlapH = _seq(disBox.left, datBox.left, disBox.right) || _seq(datBox.left, disBox.left, datBox.right),
            overlapV = _seq(disBox.top, datBox.top, disBox.bottom)  || _seq(datBox.top, disBox.top, datBox.bottom);

        if (overlapH && overlapV) {
            return true;
        }

        return false;
    },

    /**
     * Checks type of value to ensure it's a number and
     * converts it to a number if it can.
     *
     * @param {string|number} num - value to check
     * @param {string} [valName] - helper for debugging
     * @returns {number}
     */
    ensureNumerical: function (num, valName) {
        'use strict';

        if (_.isNumber(num)) {
            return num;
        }

        if (_.isString(num)) {
            return parseFloat(num.replace(/[^0-9\.\-]/g, ''), 10);
        }

        console.warn('[SSI] ensureNumerical ' + (valName ? ('- ' + valName + ' - ') : '') + 'expected a String or Number but got ', num);

        return 0;
    }
});
