/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
SSICircleChartModel,
SSICircleChartCollection:true
*/
SSICircleChartCollection = Backbone.Collection.extend({
    model: SSICircleChartModel,
    /**
     * Overwrite _.where to return the first result, rather than an array
     *
     * @param {object} val - matcher to look for in the models
     * @returns {object}
     */
    initialize: function () {
        'use strict';
        console.log('[SSI] chart - init collection');

        // this.on('add', function () {
        //     console.log('[SSI] chart - collection add', arguments);
        // });

        // debugger
    },

    /**
     * calculates the arc radius
     *
     * @access {private}
     * @param {number} width - container width
     * @param {number} height - container height
     * @param {number} multiplier -
     * @returns {number}
     */
    getRadius: function (multiplier, strokeWidth, width, height) {
        'use strict';
        return Math.min(width, height) / 2 - strokeWidth * multiplier;
    },

    /**
     * Specialized version of `Backbone.Collection.get`. Processes values
     * runs a safety check to make sure all values are of the correct type.
     *
     * @param {string} val - identifier to search the collection for
     * @returns {object}
     */
    get: function (val, view) {
        'use strict';
        var model = Backbone.Collection.prototype.get.call(this, val),
            curry = $.noop,
            isObj = $.noop,
            isNum = $.noop,
            getRadius = $.noop,
            $el,
            width,
            height,
            radius,
            res;

        if (!model) {
            return;
        }

        $el = view.$el;

        if (!$el.parents('body').length) {
            console.error('You\'re attempting to work with an element that doesn\'t exist in the DOM');
        }

        curry = model.curry;
        isObj = curry(model.is, 'Object');
        isNum = curry(model.is, 'Number');
        getRadius = curry(this.getRadius, model.get('radiusMultiplier'), view.arcStrokeWidth);

        width = $el.width();
        height = $el.height();
        radius = getRadius(width, height);

        res = {
            center: {
                x: width / 2,
                y: height / 2
            },
            radius: radius,
            value: model.get('value')
        };

        // check that all values are correct
        try {
            isObj(res.center);
            isNum(res.center.x);
            isNum(res.center.y);
            isNum(res.radius);
            isNum(res.value);
        } catch (err) {
            console.error(err);
        }

        return res;
    }
});
