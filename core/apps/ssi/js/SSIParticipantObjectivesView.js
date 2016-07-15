/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
TemplateManager,
console,
SSIParticipantContestView,
SSIParticipantObjectivesView:true
*/
SSIParticipantObjectivesView = SSIParticipantContestView.extend({
    tpl: 'ssiParticipantObjectiveTpl',

    adminTpl: 'ssiAdminObjectiveTpl',

    moduleTpl: 'ssiModuleObjectiveTpl',

    initialize: function(opts) {
        'use strict';

        console.log('[SSI] init SSIParticipantObjectivesView');

        SSIParticipantContestView.prototype.initialize.apply(this, arguments);
        this.events = _.extend({}, SSIParticipantContestView.prototype.events, this.events);

        // spy on ModuleView
        this.parentView = opts.parentView;

        this.on('compiled', this.postRender);
    },

    /**
     * Waits for parent class to do it's rendering before continuing
     * with unique contest functionality.
     *
     * @extends SSIParticipantContestView.render
     * @returns {object}
     */
    render: function() {
        'use strict';

        $.when(SSIParticipantContestView.prototype.render.call(this))
            .then(_.bind(this.cmRender, this));

        return this;
    },

    /**
     * Renders sub templates. Method is used to allow for easier multilingual support
     *
     * @returns {object}
     */
    cmRender: function () {
        'use strict';

        var $achieved    = this.$el.find('.achievedCountWrap'),
            tplName      = this.getTemplateName(),
            status       = this.model.get('status'),
            achieved     = this.model.get('achievedParticipantsCount'),
            participants = this.model.get('participantsCount'),
            data         = [ achieved, participants ];

        TemplateManager.get(tplName, function(tpl, vars) {
            var subTpl;

            if (vars.achievedCount) {
                subTpl = vars.achievedCount['description' + (status === 'finalize_results' ? 'Complete' : '')];
            }

            if (subTpl) {
                $achieved.html(G5.util.cmReplace({
                    cm: subTpl,
                    subs: data
                }));
            }

        }, this.tplPath);

        return this;
    },

    /**
     * Hook to process json before rendering contest view
     *
     * @param {object} json - this models json
     * @returns {object}
     */
    proccessModelJSON: function (json) {
        'use strict';

        var parts;

        if (json && json.stackRankParticipants) {
            parts = json.stackRankParticipants;

            parts = _.sortBy(parts, function (part) {
                return part.rank;
            });

            json.stackRankParticipants = parts;
        }

        return json;
    },

    /**
     * Called once the modules HTML is ready to be interacted with
     *
     * @returns {object}
     */
    postRender: function () {
        'use strict';

        console.log('[SSI] post render');

        var data = {
                id: this.model.get('id'),
                goal: this.model.get('goal'),
                progress: this.model.get('progress'),
                angle: {
                    start: -230,
                    end: 50
                }
            };

        // TODO - ungross this - maybe get the charts to "process themselves"
        // this processCharts should happen once only
        if(!this._weDoneProcessedTheCharts) {
            this.processCharts('circle', data, this.$el.find('.chartPercentHolder'));

            if (this.$el.find('.ssiPayoutGraph').length) {
                this.processCharts('payoutProgress', data, this.$el.find('.ssiPayoutGraph') );
            }
            this._weDoneProcessedTheCharts = true;
        }

        return this;


    }

});
