/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
Backbone,
TemplateManager,
console,
SSIParticipantContestView,
SSICreatorListModuleView:true
*/
SSICreatorListModuleView = SSIParticipantContestView.extend({
    moduleTpl: 'ssiCreatorListModule',
    initialize: function(opts) {
        'use strict';

        console.log('[SSI] init SSICreatorListModuleView');

        SSIParticipantContestView.prototype.initialize.apply(this, arguments);
        this.events = _.extend({}, SSIParticipantContestView.prototype.events, this.events);

        this.parentView.model.set('allowedDimensions', [
            // {w:1,h:1}, // 1x1 square
            // {w: 2, h: 1}, // 2x1 square
            {w: 2, h: 2}, // 2x2 square
            {w: 4, h: 2}, // 4x2 square
            {w: 4, h: 4}  // 4x4 square
        ]);

        this.parentView = opts.parentView;

        this.collection = new Backbone.Collection(opts.data);
        this.contestType = _.first(opts.data).contestType;
    },

    /**
     * // Waits for parent class to do it's rendering before continuing
     * // with unique contest functionality.
     *
     * // @extends SSIParticipantContestView.render
     * @returns {object}
     */
    render: function() {
        'use strict';

        var that = this;

        TemplateManager.get(this.getTemplateName(), function(tpl) {
            var json = that.collection.toJSON(),
                common = _.pick(_.first(json), 'contestType', 'creatorDetailPageUrl'),
                data = _.extend({
                    contests: that.proccessJSON(json)
                }, common),
                html = tpl(data);

            that.$el.append(html);

        }, this.tplPath);

        return this;
    },

    /**
     * Hook to process json before rendering contest view
     *
     * @param {object} json - this models json
     * @returns {object}
     */
    proccessJSON: function (json) {
        'use strict';

        /**
         * (todo)
         *
         * @param {string} foo - foo description
         * @returns {string}
         */
        function singleify (_json, opts) {
            return _.map(_json, function (contest) {
                var sorted = _.sortBy(contest[opts.sortVal], function (unsorted) {
                    return unsorted[opts.sortBy];
                });

                delete contest[opts.sortVal];

                contest[opts.resName] = sorted.length ? _.first(sorted) : {};
                return contest;
            });
        }

        switch (this.contestType) {
            case "stackRank":
                json = singleify(json, {
                    sortVal : "leaders",
                    sortBy : "rank",
                    resName : "leader"
                });
                break;
            case "doThisGetThat":
                json = singleify(json, {
                    sortVal : "activities",
                    sortBy : "activityDescription",
                    resName : "activity"
                });
                break;
        }

        return json;
    }
});
