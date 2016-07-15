/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
Backbone,
SSICircleChartModel:true
*/
SSICircleChartModel = Backbone.Model.extend({
    defaults: {
        id: 'String',
        value: 0,
        radiusMultiplier: 1
    },

    validate: function() {
        'use strict';

        var num = this.curry(this.is, 'Number'),
            str = this.curry(this.is, 'String');

        try {
            str(this.get('id'));
            num(this.get('value'));
            num(this.get('radiusMultiplier'));
        } catch (err) {
            return err;
        }
    },

    /**
     * Function currying. Allows some arguments to be passed now,
     * and the rest later.
     *
     * @param {function} fn - function to be called with passed arguments
     * @param {*...} - arguments to be passed
     * @returns {function}
     */
    curry: function (fn) {
        'use strict';
        var that = this,
            args = _.rest(arguments);

        return function() {
            var subArgs = [].concat(args, _.toArray(arguments));
            return fn.apply(that, subArgs);
        };
    },

    /**
     * Compares expected type with actual type.
     * Returns undefined if everything is sucessful and an
     * error if the type isn't correct.
     *
     * @param {string} type - type value is supposed to be
     * @param {*} val - value to check type of
     * @returns {undefined|object}
     */
    is: function (type, val) {
        'use strict';

        var types = ['String', 'Null', 'Undefined',
                    'Function', 'Boolean', 'Object',
                    'Array', 'NaN', 'Element',
                    'Number'],
            limit = types.length,
            res = 'Unknown Type',
            key;

        if (!_['is' + type](val)) {
            for (key = 0; key <= limit; key = key + 1) {
                if (_['is' + types[key]](val)) {
                    res = types[key];
                    break;
                }
            }

            throw new Error('Unacceptable value: expecting ' + type + ', got: ' + res);
        }
    }
});
