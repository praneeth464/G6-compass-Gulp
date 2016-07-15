/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
$,
G5,
console,
SSIParticipantContestView,
SSIParticipantStepItUpView:true
*/
SSIParticipantStepItUpView = SSIParticipantContestView.extend({

    tpl: 'ssiParticipantStepItUpTpl',

    moduleTpl: 'ssiModuleStepItUpTpl',

    adminTpl: 'ssiAdminStepItUpTpl',

    creatorModuleTpl: 'ssiModuleStepItUpCreatorTpl',

    initialize: function(opts) {
        'use strict';
        console.log('[SSI] init SSIParticipantStepItUpView');

        // initialize super class
        SSIParticipantContestView.prototype.initialize.apply(this, arguments);

        this.events = _.extend({}, SSIParticipantContestView.prototype.events, this.events);

        this.$goal = this.$el.find('.levelGoal span');
        this.$progress = this.$el.find('.levelProgress span');
        this.$payout = this.$el.find('.levelPayoutDetails span');

        // spy on ModuleView
        this.parentView = opts.parentView;

        // for pages size changes
        this.on('pageViewResize', this.resizeText, this);

        // when our parent is a module and its dims may have changed
        this.parentView.on('geometryChanged', this.resizeText, this);

        this.on('compiled', this.postRender);

    },

    /**
     * Called once the modules HTML is ready to be interacted with
     *
     * @returns {object}
     */
    postRender: function (chart) {
        'use strict';

        console.log('[SSI] post render');

        // if charts are already processed, do nothing
        if(this._weDoneProcessedTheCharts){
            return;
        }

        var isCreator = this.parentView.model.get('isCreator'),
            isManager = this.parentView.model.get('isManager'),
            $chartHolders = this.$el.find('.chartHolder'),
            chartType = $chartHolders.data('chart-type'),
            levels = this.model.get('contestLevels'),
            data = {
                bar: _.bind(function(){
                    if (this.model.get('includeBonus') && this.model.has('contestLevels') &&
                        _.where(levels, {name: 'Bonus'}).length === 0) {
                        levels.push({
                            name: $chartHolders.data('bonus-label'),
                            participantsCount: this.model.get('bonusParticipantsCount')
                        });
                    }

                    return levels;
                }, this)(),
                circle: _.where(levels, { isCurrentLevel: true })[0]
            };

        if (!chartType) {
            chartType = (isManager || isCreator) ? 'bar' : 'circle';
            console.warn('[SSI] data-chart-type not set on element, defaulting to `' + chartType + '`');
        }


        // processCharts should happen once only
        if (isCreator) {
            this.processCharts.apply(this, [chartType, data[chartType], $chartHolders]);
            this.processCharts('payoutProgress', data, this.$el.find('.ssiPayoutGraph'));
        } else {
            this.processCharts.apply(this, [chartType, data[chartType], $chartHolders]);
        }
        this._weDoneProcessedTheCharts = true;

        this.resizeText();

        return this;
    },

    /*
    * Text that needs to be resized once the page has rendered.
    */
    resizeText: function(){
        var $goal = this.$el.find('.levelGoal span'),
            $progress = this.$el.find('.levelProgress span'),
            $payout = this.$el.find('.levelPayoutDetails span');


        G5.util.textShrink( $goal, {vertical:false, minFontSize:11} );
        _.delay(G5.util.textShrink, 100, $goal, {vertical:false,minFontSize:11} );

        G5.util.textShrink( $progress, {vertical:false,minFontSize:11} );
        _.delay(G5.util.textShrink, 100, $progress, {vertical:false,minFontSize:11} );

        G5.util.textShrink( $payout, {minFontSize:11} );
        _.delay(G5.util.textShrink, 100, $payout, {minFontSize:11} );
    },

    /**
     * (todo)
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    proccessModelJSON: function (json) {
        'use strict';

        var isCreator = this.parentView.model.get('isCreator'),
            isManager = this.parentView.model.get('isManager'),
            roleFn    = (isCreator || isManager) ? 'proccessAdminModelJSON' : 'proccessParticipantModelJSON',
            participants,
            levels;

        if (!this[roleFn]) {
            console.warn('[SSI] undefined function `this.' + roleFn + '`');
            return json;
        }

        if (json.contestLevels) {
            levels = _.sortBy(json.contestLevels, function (level) {
                return level.index;
            });

            json.contestLevels = levels;
        }

        if (json.includeStackRanking && json.stackRankParticipants) {
            participants = _.sortBy(json.stackRankParticipants, function (p) {
                return p.rank;
            });

            json.stackRankParticipants = participants;
        }

        return this[roleFn](json);
    },

    /**
     * (todo)
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    proccessAdminModelJSON: function (json) {
        'use strict';

        var levels = json.contestLevels;

        if (levels) {
            _.each(levels, function (level, key) {

                var nextLevel = levels[key + 1];

                if (!nextLevel) {
                    json.lastLevel = level;
                }

                return level;
            });
        }

        return json;
    },

    /**
     * (todo)
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    proccessParticipantModelJSON: function (json) {
        'use strict';

        var levels = json.contestLevels,
            i = levels.length;

        // If contest has ended, check the current level to see if that level
        // was actually achieved. If not, set the previous level to be current
        // so it displays the final progress amount.
        if (json.status === 'finalize_results') {
            while (i--) {
                var current = levels[i],
                    prev = levels[i-1];

                if (prev !== undefined) { // do nothing if pax is still on first level
                    if (current.isCurrentLevel && current.remaining > 0) {
                        current.isCurrentLevel = false;
                        prev.isCurrentLevel = true;
                        prev.isCompleted = false;
                    }
                }
            }
        }

        if (levels) {
            levels = _.filter(levels, function (level, key) {
                var prevLevel = levels[key - 1],
                    nextLevel = levels[key + 1],
                    classes   = [];


                if (!prevLevel) {
                    level.isFirstLevel = true;
                    classes.push('firstCol');
                }

                if (!nextLevel) {
                    level.isLastLevel = true;
                    json.lastLevel = level;
                    classes.push('lastCol');

                }

                if (level.isCurrentLevel) {
                    classes.push('currentLevelCol');
                }

                level.classes = classes.join(' ');

                return level;
            });

            json.contestLevels = levels;
        }

        return json;
    },

    /**
     * Tells the now visible chart it's time to animate.
     *
     * note: this assumes only one chart per module is being changed,
     *       but that could be fixed by looping through all shown charts
     *
     * @returns {object}
     */
    animateChart: function () {
        'use strict';

        var charts = this.model.get('charts');

        if (charts) {
            this.trigger('updateCharts');

            _.each(charts, function(chart){
                chart.animate();
            });
        }

        return this;
    },

    /**
     * Hides the chart. Meant to be used before the module
     * changes size to prevent the visual jump of graph changing
     * size slowly
     *
     * @returns {object}
     */
    hideChart: function () {
        'use strict';

        var charts = this.model.get('charts');

        if (charts) {
            _.each(charts, function(chart){
                $(chart.$el.get(0).canvas).hide();
            });
        }

        return this;
    },

    /**
     * opposite of hideChart
     *
     * @returns {object}
     */
    showChart: function () {
        'use strict';

        this.resizeText();

        var charts = this.model.get('charts');

        if (charts) {
            this.trigger('updateCharts');

            _.each(charts, function(chart){
                $(chart.$el.get(0).canvas).show();
            });
        }

        return this;
    },
});
