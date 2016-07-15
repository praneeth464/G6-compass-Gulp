/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
console,
TemplateManager,
SSISharedHelpersView,
SSIActionPromptView,
SSISortableTableCollection,
SSIContestModel,
SSISortableTableView:true
*/

SSISortableTableView = SSISharedHelpersView.extend({
    tpl: 'SSIContestActivityTpl',

    events: {
        'click .sortHeader'   : 'sortClickHandler',
        'click .promptAction' : 'makePrompt'
    },

    initialize: function (opts) {
        'use strict';

        console.log('[SSI] sortable table');

        this.tplPath = './../apps/ssi/tpl/';
        this.parentView = opts.parentView;

        this.collection = new SSISortableTableCollection();
        this.collection.add(opts.data.contests);

        this.defaultSort = opts.defaultSort;

        this.collection.on('remove', _.bind(function () {
            var data = this.collection.toSortedJSON(),
                appendResults = _.bind(function (partial) {
                    this.$el.find('tbody').replaceWith(partial);
                }, this);

            this.renderPartial(data, 'tbody')
                .then(appendResults);
        }, this));
    },

    render: function () {
        'use strict';

        var that = this,
            data = this.collection.toSortedJSON(this.defaultSort);

        this.renderPartial(data)
            .then(function (partial) {
                that.$el.append(partial);
                that.setActiveSortHeader(that.defaultSort);
            });

        return this;
    },

    /**
     * Maybe sneaky template partial loading. Basically, compiles
     * whole template, dumps it in a jQuery collection, and
     * filters out the parts that aren't wanted.
     *
     * @param {object} rawData - presorted information from the models
     * @param {selector} [selector] - conditionally return only a portion of the template
     * @returns {object}
     */
    renderPartial: function (rawData, selector) {
        'use strict';

        var that = this,
            deferrer = new $.Deferred();

        TemplateManager.get(this.tpl, function(tpl) {
            var modelData = that.parentView.model.toJSON(),
                data = that.prepForHandlebars(modelData, rawData),
                // added this regex to remove whitespace between table cells to avoid IE 9's never fixed table layout bug.
                content = tpl(data).replace(new RegExp('>[ \t\r\n\v\f]*<', 'g'), '><'),
                $result = $(content),
                $parentDiv = that.$el.parent('.ssiSingleContestViewWrap');

            if (selector) {
                $result = $result.find(selector);
            }

            deferrer.resolve($result);
            that.$el.find('.table').responsiveTable();

            //not ideal but the ATN table does not talk to the other table on the page, so if there is an ATN contest we need to hide the message that there are no active contests.
            if($parentDiv.find('.atnTable').length){
                $parentDiv.find('.ssiEmptyTableMsg').hide();
            }
        }, this.tplPath);

        return deferrer.promise();
    },

    /**
     * glue between click handler and sort functionality.
     *
     * @param {object} event - jQuery event
     * @returns {object}
     */
    sortClickHandler: function (event) {
        'use strict';

        event.preventDefault();

        var appendResults = _.bind(function (partial) {
                this.$el.find('tbody').replaceWith(partial);
            }, this),
            $target = $(event.target),
            $icon   = $target.is('i') ? $target : $target.find('i'),
            sortBy  = $icon.data('sort'),
            asc     = $icon.hasClass('asc'),
            data    = this.collection.toSortedJSON(sortBy, asc);

        this.setActiveSortHeader(sortBy);

        this.renderPartial(data, 'tbody')
            .then(appendResults);

        return this;
    },

    /**
     * Swaps classes to show sorting icon
     *
     * @param {string} id - id to look for
     * @returns {object}
     */
    setActiveSortHeader: function (id) {
        'use strict';

        var classes = 'asc icon-sort-up desc icon-sort-down',
            $icon   = this.$el.find('[data-sort="' + id + '"]'),
            asc     = $icon.hasClass('asc');

        this.$el.find('.sortControl').removeClass(classes);
        $icon.addClass(asc ? 'desc icon-sort-down' : 'asc icon-sort-up');

        return this;
    },

    /**
     * Creates a qtip using html embedded in the templates
     *
     * @param {object} event - jQuery evenr
     * @returns {object}
     */
    makePrompt: function (event) {
        'use strict';

        event.preventDefault();

        var $btn    = $(event.currentTarget),
            $prompt = $btn.siblings('.prompt'),
            prompt  = new SSIActionPromptView({});

        prompt.render({
            content: $prompt.clone(),
            container: this.$el,
            target: $btn
        });

        prompt.on('deleteContest', _.bind(this.deleteContest, this));

        return this;
    },

    /**
     * Handles telling the server to delete a contest
     *
     * // @param {object} event - jQuery event
     * // @param {object} event - jQuery event
     * @returns {object}
     */
    deleteContest: function (prompt, id) {
        'use strict';

        var $prompt = prompt.$el,
            data = {
                $status: $prompt.find('.contestDeleteStatus'),
                url: G5.props.URL_JSON_SSI_DELETE_CONTEST,
                data: {
                    id: id
                }
            },
            handleSuccess = _.bind(function () {
                prompt.destroyPrompt();
                this.collection.remove({id: id.toString()});
            }, this);

        prompt.togglePromptLock(true);

        this.requestWrap(data)
            .always(_.bind(function (resp) {
                prompt.togglePromptLock(false);
                return resp;
            }, this))
            .then(
                handleSuccess,
                _.bind(this.showErrorModal, this)
            );

        return this;
    },

    /**
     * Provides a place for Handlebars logic to be added
     * to the data
     *
     * @param {object} modelData - information about this user's access level
     * @param {array} contestsData - list of contests
     * @returns {object}
     */
    prepForHandlebars: function (modelData, contestsData) {
        'use strict';

        var res = {};

        /**
         * Helper to check status
         *
         * @param {...string} - variable amount of strings to check
         * @returns {boolean}
         */
        function _statusIs (data, arr) {
            return _.contains(arr, data.status);
        }

        if (modelData.isCreator) {
            res.showStatus = true;
        }

        if (modelData.isCreator || _.where(contestsData, {role: SSIContestModel.prototype.ROLES.CREATOR}).length) {
            res.showAdminLinks = true;
            res.showRole = true;
        }

        res.contests = _.map(contestsData, function (contest) {
            var isCreator = (contest.role === SSIContestModel.prototype.ROLES.CREATOR),
                S = SSIContestModel.prototype.STATUSES;

            contest.showContestLink = !isCreator || !_statusIs(contest, [S.PENDING, S.DRAFT, S.WAITING, S.DENIED]);
            contest.showEditLink    = isCreator  &&  _statusIs(contest, [S.LIVE, S.PENDING, S.DRAFT]);
            contest.showCopyLink    = isCreator;
            contest.showDeleteLink  = isCreator  &&  _statusIs(contest, [S.PENDING, S.DRAFT, S.DENIED]);
            contest.showViewLink    = isCreator  &&  _statusIs(contest, [S.WAITING, S.FINALIZED]);

            if(contest.contestType && contest.contestType === 'awardThemNow'){
                contest.extraJSON = {
                    issueAwardsUrl: G5.props.URL_SSI_ATN_ISSUE_AWARDS,
                    contestSummaryUrl: G5.props.URL_SSI_ATN_CONTEST_SUMMARY
                };
            }
            return contest;
        });

        res.isCreator = modelData.isCreator;

        return res;
    }
});
