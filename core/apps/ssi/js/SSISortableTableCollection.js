/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
console,
Backbone,
SSISortableTableCollection:true
*/

SSISortableTableCollection = Backbone.Collection.extend({
    CONTEST_TYPES: ['live', 'pending', 'waiting_for_approval', 'draft', 'denied', 'closed', 'finalize_results'],

    ROLE_TYPES: ['creator', 'manager', 'participant'],

    defaultSortKey: 'endDate',

    model: Backbone.Model.extend({
        defaults: {
            'id'          : false,
            'name'        : false,
            'status'      : 'live',
            'statusLabel' : 'Active',
            'startDate'   : false,
            'endDate'     : false,
            'role'        : 'participant'
        },
        /**
         * Ensure that passed information matches expectations
         *
         * @param {object} data - single contest item
         */
        validate: function (data) {
            'use strict';

            if (!_.contains(this.collection.CONTEST_TYPES, data.status)) {
                console.warn('[SSI] ERROR: unexpected contest status: ', data.status);
                return new Error();
            }
        }
    }),

    initialize: function () {
        'use strict';

        Backbone.Collection.prototype.initialize.apply(this, arguments);

        this._sortableColumns = {
            'name': function (json) {
                return _.sortBy(json, function (rowData) {
                    return rowData.name.toLowerCase(); // make sure case is ignored when sorting strings
                }).reverse();
            },
            'status': _.bind(function (json) {

                return _.sortBy(json, function (rowData) {
                    return rowData.statusLabel.toLowerCase(); // make sure case is ignored when sorting strings
                }).reverse();
            }, this),
            'startDate': function (json) {
                return _.sortBy(json, function (rowData) {
                    return new Date(rowData.startDate).getTime();
                });
            },
            'endDate': function (json) {
                return _.sortBy(json, function (rowData) {
                    return new Date(rowData.endDate).getTime();
                });
            },
            'role': _.bind(function (json) {

                return _.sortBy(json, function (rowData) {
                    return rowData.role.toLowerCase(); // make sure case is ignored when sorting strings
                }).reverse();
            }, this)
        };

        return this;
    },

    /**
     * Sorting based on two data types.
     *
     * The first step is splitting the `data` into arrays and stored as
     * object properties like `data[primaryKey]`. Each one of these arrays
     * are then sorted using `this._sortableColumns[secondaryFn]()`.
     * The now sorted arrays are sorted using the `map`. All the arrays
     * are flattened into one single array and reversed.
     *
     * @param {array} data - results of this.toJSON(), probably
     * @param {array} map - ordered keys
     * @param {string} primaryKey - key to sort group objects by
     * @param {function} data - results of this.toJSON(), probably
     * @returns {array}
     */
    _subsort: function (data, map, primaryKey, secondaryFn) {
        'use strict';

        var primarySort = {},
            res   = [],
            temp;

        _.each(data, function(rowData){
            temp = rowData[primaryKey];
            primarySort[temp] = primarySort[temp] || [];
            primarySort[temp].push(rowData);
        });

        _.each(primarySort, function (typeArr, key) {
            primarySort[key] = this._sortableColumns[secondaryFn](typeArr);
        }, this);

        _.each(map, function (type) {
            if (primarySort[type] && primarySort[type].length) {
                res.push(primarySort[type].reverse());
            }
        });

        return _.flatten(res).reverse();
    },

    /**
     * Get ordered JSON versions of the models
     *
     * @param {string} name - property name to sort by
     * @param {boolean} asc - return results in ascending or descending order
     * @returns {object}
     */
    toSortedJSON: function (sortKey, ascKey) {
        'use strict';

        var sortBy = sortKey || this.prevSortKey || this.defaultSortKey,
            asc    = !!(_.isBoolean(ascKey) ? ascKey : this.prevAsc),
            fn     = this._sortableColumns[sortBy] || $.noop,
            data   = fn(this.toJSON()) || this.toJSON();

        if (!asc && data.reverse) {
            data.reverse();
        }

        this.prevAsc = asc;
        this.prevSortKey = sortBy;

        return data;
    }
});
