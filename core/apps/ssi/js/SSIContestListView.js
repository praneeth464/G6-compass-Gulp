/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
SSISharedHelpersView,
SSISortableTableView,
SSIContestListView:true
*/
SSIContestListView = SSISharedHelpersView.extend({

    initialize: function (opts) {
        'use strict';

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        var tablesData = this.partition(opts.data.contests, function (val) {
                return val.contestType !== 'awardThemNow';
            }),
            clone = this.deepClone;

        tablesData = _.map(tablesData, function (tableData) {
            var _opts = _.clone(opts),
                copy;
            // prevent circular references
            delete _opts.parentView;
            copy = clone(_opts);
            copy.data.contests = tableData;
            copy.parentView = opts.parentView;
            return copy;
        });

        this.tables = {};
        this.createTable_ATN(tablesData[1]);
        this.createTable_All(tablesData[0]);
    },

    /**
     * (todo)
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    render: function () {
        'use strict';

        var that = this;

        _.each(this.tables, function (table) {
            table.render();
            that.$el.append(table.$el);
        });

        return this;
    },

    /**
     * Conditionally create award them now table view
     *
     * @param {object} data - partitioned contest information
     * @returns {object}
     */
    createTable_ATN: function (data) {
        'use strict';

        if (!data.data.contests.length) {
            return this;
        }

        var View = SSISortableTableView.extend({
                tpl: 'ssiContestActivityATNTpl'

            }),
            _data = _.extend({}, data, {
                defaultSort: 'endDate'
            });

        _.each(_data.data.contests, function (contest) {
            contest.extraJSON = {
                issueAwardsUrl: G5.props.URL_SSI_ATN_ISSUE_AWARDS,
                contestSummaryUrl: G5.props.URL_SSI_ATN_CONTEST_SUMMARY
            };
        });

        this.tables.ATN = new View(_data);

        return this;
    },

    /**
     * Create all contest table
     *
     * @param {object} data - partitioned contest information
     * @returns {object}
     */
    createTable_All: function (data) {
        'use strict';

        this.tables.All = new SSISortableTableView(data);

        return this;
    }
});
