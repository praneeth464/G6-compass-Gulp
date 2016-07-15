/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
G5,
Backbone,
PageView,
TemplateManager,
SSIContestModel,
SSISharedPaginatedTableView,
SSIContestSummaryCollection,
SSIContestSummary_ATN:true
*/
SSIContestSummary_ATN = PageView.extend({
    tpl: 'ssiATNGeneralInfo',

    initialize: function(opts) {
        'use strict';

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        this.tplPath = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';

        // the model
        this.model = new Backbone.Model(opts.contestJson);

        this.render();
    },

    render: function () {
        'use strict';

        TemplateManager.get(this.tpl, _.bind(function(tpl) {
            var json = this.model.toJSON();

            json = _.extend(json, {
                extraJSON: {
                    editUrl: G5.props.URL_SSI_ATN_CONTEST_EDIT,
                    issueAwardsUrl: G5.props.URL_SSI_ATN_ISSUE_AWARDS
                }
            });

            SSIContestModel.reformatDecimalStrings(json);

            this.$el.find('#ssiATNGeneralInfo').append(tpl(json));
            this.createHistoryTable();
        }, this), this.tplPath);

        return this;
    },

    createHistoryTable: function () {
        'use strict';

        if (this.historyTable) {
            return this;
        }

        var keys = ['payoutType', 'totalParticipantsCount', 'totalActivity',
                    'totalPayoutAmount', 'sortedOn', 'sortedBy'],
            modelData = _.pick(this.model.toJSON(), keys);

        this.historyTable = new (SSISharedPaginatedTableView.extend({
            // annoying work around for to rename a request property
            buildRequestData: function () {
                var res = SSISharedPaginatedTableView.prototype.buildRequestData.apply(this, arguments);
                res.contestId = res.id;
                delete res.id;
                return res;
            }
        }))({
            tpl: 'ssiContestSummaryTableTpl',
            collection: new SSIContestSummaryCollection(),
            el: this.$el.find('#ssiATNHistory'),
            parentView: this,
            modelData: modelData
        });

        return this;
    }
});
