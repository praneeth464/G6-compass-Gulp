/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
console,
Backbone,
TemplateManager,
PaginationView,
SSISharedHelpersView,
SSIContestModel,
SSISharedPaginatedTableView:true
*/

/**
 * Shared functionality for tables with paginated data.
 * Handles pagination and sortHeader clicks as well as data interaction events.
 *
 * Provide this view with a unique collection and template, and it should handle the rest.
 *
 * @extends SSISharedHelpersView
 *
 * @param {object} opts - View Settings
 * @param {object} opts.collection - new Backbone.Collection
 * @param {string} opts.tpl - Handlebars template name
 * @param {object} opts.modelData - General table information that will be passed
 * @param {string} opts.modelData.sortedOn - Initial sort state settings
 * @param {string} opts.modelData.sortedBy - Initial sort state settings
 * @param {*}      opts.modelData[*] - Additional information that will be passed to template
 * @param {object} opts.el - jQuery element
 * @param {object} opts.parentView - View this was created from
 * @returns {object}
 */
SSISharedPaginatedTableView = SSISharedHelpersView.extend({
    tpl: 'ssiContestSummaryTableTpl',

    // store information as strings for ease of updating
    CLASSES: {
        ASC: 'asc icon-sort-up',
        DESC: 'desc icon-sort-down'
    },
    SORT: {
        ON: 'sortedOn',
        BY: 'sortedBy'
    },

    events: {
        'click .sortHeader': 'handleSort'
    },

    initialize: function (opts) {
        'use strict';

        this.tplPath = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';

        this.collection = opts.collection;
        this.tpl        = opts.tpl;

        this.collection.on('fetch:success', this.hcae(function (key, val) {
            this.settings.set(key, val);
        }, this));

        this.collection.on('fetch:success', this.handleFetchSuccess, this);

        var modelData = _.defaults(opts.modelData, {
            sortedOn: 'lastName',
            sortedBy: 'asc'
        });
        this.settings = new Backbone.Model(modelData);

        this.settings.on('change:' + this.SORT.ON, this.setSortArrows, this);
        this.settings.on('change:' + this.SORT.BY, this.setSortArrows, this);

        this.parentView = opts.parentView;

        this.render();

    },

    /**
     * Primary template rendering. Kicks off the rest of the view initialization events.
     *
     * @returns {object}
     */
    render: function () {
        'use strict';
        var data = this.settings.toJSON();

        SSIContestModel.reformatDecimalStrings(data);

        TemplateManager.get(this.tpl, _.bind(function(tpl, vars, subTpls) {
            this.subTpls = subTpls;
            this.$el.append(tpl(data));
            this.createPaginationView();
            this.goToPage(1, data.method);
            this.setSortArrows();
        }, this), this.tplPath);

        return this;
    },

    /**
     * Sub template rendering
     *
     * @returns {object}
     */
    renderRows: function () {
        'use strict';

        var $bod = this.$el.find('tbody'),
            json = this.settings.toJSON(),
            tpl  = this.subTpls.recordRow;

        $bod.empty();

        _.each(this.collection.toProcessedJSON(), function (record) {
            var data = _.extend(record, {
                extraJSON: json
            });
            $bod.append(tpl(data));
        });

        // This was added to be able to listen for an event to trigger
        // a responsiveTable call if needed without interfering with
        // however else this view is being used.
        this.trigger('tableRendered');

        return this;
    },

    /**
     * Updates pagination information and renders new data
     *
     * @param {object} servResp - raw response data from the server
     * @returns {object}
     */
    handleFetchSuccess: function (servResp) {
        'use strict';

        var pages = Math.ceil(servResp.recordsTotal / servResp.recordsPerPage);

        this.paginationView.setProperties({
            rendered : false,
            pages : pages,
            current: servResp.currentPage,
            total: servResp.recordsTotal,
            per: servResp.recordsPerPage
        });

        PaginationView.prototype.render.call(this.paginationView);

        this.renderRows();

        return this;
    },

    /**
     * Creates pagination view and binds events
     *
     * @returns {object}
     */
    createPaginationView: function() {
        'use strict';

        if (this.paginationView) {
            return this.paginationView;
        }

        this.paginationView = new PaginationView({
            el : this.$el.find('.paginationControls'),
            ajax : true,
            showCounts : true,
            render: function () {
                return this;
            }
        });

        this.paginationView.on('goToPage', this.goToPage, this);

        return this.paginationView;
    },

    /**
     * Tells the collection it's time to fetch more data.
     * Applies lock and unlock functionality to the table.
     *
     * @param {number} page - Pagination page to go to
     * @param {string} method - Optional method to send
     * @returns {object}
     */
    goToPage: function (page, method) {
        'use strict';

        var unlockView = _.bind(this.unlockView, this);

        this.lockView();

        this.collection.fetch({
            data: this.buildRequestData(page, method),
            success: unlockView,
            error: unlockView
        });

        return this;
    },

    /**
     * Grabs relevant data from the model
     *
     * @param {number} page - requested page
     * @returns {object}
     */
    buildRequestData: function (page, method) {
        'use strict';

        var settings = this.settings.toJSON(),
            data = {
                currentPage: page,
                id: this.parentView.model.get('id')
            },
            trySet = this.curry(function (src, dest, prop, subProp) {
                if (src[prop] && !subProp) {
                    dest[prop] = src[prop];
                }

                if (subProp && src[prop] && src[prop][subProp]) {
                    dest[subProp] = src[prop][subProp];
                }
            }, settings, data);

        trySet(this.SORT.ON);
        trySet(this.SORT.BY);

        if (method) {
            data.method = method;
        }

        return data;
    },

    /**
     * When a sort header is clicked,
     *
     * @param {object} event - jQuery event
     * @returns {object}
     */
    handleSort: function (event) {
        'use strict';

        event.preventDefault();

        var $i = $(event.target).find('i').addBack().last(),
            sortOn = $i.data('sort'),
            sortBy = $i.hasClass('asc') ? 'desc' : 'asc';

        this.settings.set(this.SORT.ON, sortOn);
        this.settings.set(this.SORT.BY, sortBy);

        this.goToPage(1);

        return this;
    },

    /**
     * Changes sortable arrows to the proper position
     * `_.debounce` is used to prevend this from firing multiple times
     * when the model's data is changed.
     *
     * @returns {object}
     */
    // setSortArrows: _.debounce(function () {
    setSortArrows: function () {
        'use strict';

        var sortOn  = this.settings.get(this.SORT.ON),
            sortBy  = this.settings.get(this.SORT.BY),
            $all    = this.$el.find('[data-sort]'),
            $target = this.$el.find('[data-sort="' + sortOn + '"]');

        $all.removeClass(_.values(this.CLASSES).join(' '));

        if (sortBy) {
            $target.addClass(this.CLASSES[sortBy.toUpperCase()]);
        }

        return this;
    },

    /**
     * Removes view's overlay
     *
     * @returns {object}
     */
    unlockView: function () {
        'use strict';

        G5.util.hideSpin(this.$el);

        return this;
    },

    /**
     * Covers the view with an overlay
     *
     * @returns {object}
     */
    lockView: function () {
        'use strict';

        G5.util.showSpin( this.$el, {
            cover : true
        });

        return this;
    }

});
