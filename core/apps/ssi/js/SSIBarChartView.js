/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
Backbone,
Raphael,
console,
SSISharedHelpersView,
SSIBarChartView:true
*/

/*
 * Helper view for drawing circular charts,
 * currently used in Step It Up and Objectives contests.
 */
SSIBarChartView = SSISharedHelpersView.extend({

    initialize: function (opts) {
        'use strict';

        console.log('[SSI] initialize SSICircleChartView');

        // alias for parent view
        this.parentView = opts.parentView;
        this.grandparentView = opts.parentView.parentView; // wearther's original, son?

        this.chartData = opts.chartData;

        // load Raphael, if it needs to be
        if (window.Raphael) {
            this.setup();
        } else {
            $.cachedScript(this.parentView.$el.find('.raphael').data('src'))
                .done(this.setup.bind(this))
                .fail(function () {
                    throw new Error('Error loading Raphael');
                });
        }

        // for pages size changes
        this.parentView.on('pageViewResize', this.update, this);

        // ssiCreatorPage - may have a hidden chart - so update when the tabs change
        this.parentView.on('tabChange', this.update, this);

        // for modules size changes
        this.grandparentView.on('beforeDimensionsChange', function(){
            $(this.raphEl.canvas).hide();
        }, this);

        // for modules size changes
        this.grandparentView.on('geometryChanged', function(){
            $(this.raphEl.canvas).show();
            this.update();
        }, this);

        return this;
    },

    // update this chart after its been rendered (like when its goemetry might have changed)
    update: function() {
        // updated if width has changed
        if(this._lastWidth === this.$el.width()) { return; }

        this.setup();

        this._lastWidth = this.$el.width();
    },

    getSettings: function() {
        return {
            width      : this.$el.width(),
            height     : this.$el.height(),
            xAxisLabel : this.$el.data('x-axis-label'),
            yAxisLabel : this.$el.data('y-axis-label'),
            levels     : this.chartData
        };
    },

    /**
     * Attaches settings to the view
     *
     * Split into it's own function mostly for readiblity.
     *
     * @returns {object}
     */
    setup: function () {
        'use strict';
        var settings = this.getSettings();

        this.raphEl = this.raphEl || new Raphael(this.el, settings.width, settings.height);

        var styles = this.getCSSData(this.el),
            levels = _.chain(settings.levels)
                        .sortBy(function (level) {
                            return level.index;
                        })
                        .map(function (level, key, sortedLevels) {
                            return {
                                id: level.index || sortedLevels[key - 1].index + 1,
                                name: level.name,
                                value: this.ensureNumerical(level.participantsCount)
                            };
                        }, this)
                        .value();

        this.bars = new Backbone.Collection(levels);

        this.axes = [
            {
                label: settings.xAxisLabel,
                unit: 'name',
                origin: {
                    x: parseInt(styles.nameOriginX),
                    y: parseInt(styles.nameOriginY)
                }
            },
            {
                label: settings.yAxisLabel,
                labelAttr: { transform: 'r270' },
                unit: 'value',
                origin: {
                    x: parseInt(styles.valueOriginX),
                    y: parseInt(styles.valueOriginY)
                }
            }
        ];

        // graph origin point
        this.origin = {
            x: parseInt(styles.graphOriginX),
            y: parseInt(styles.graphOriginY)
        };


        this.render();

        return this;
    },

    /**
     * creates and adds paths to the stage
     *
     * @returns {object}
     */
    render: function () {
        // setup will need to have run
        if(!this.raphEl) { return; }
        // element should be visible
        if(!this.$el.is(':visible')) {
            //console.warn('SSIBarChartView.render()... $el not visible', this.$el);
            return;
        }

        'use strict';
        var styles    = this.getCSSData(this.el),
            prevX     = this.origin.x,
            bars      = this.bars.toJSON(),
            maxVal    = _.max(bars, function(bar){ return bar.value; }).value,
            maxHeight = this.origin.y - 30;

        // clear all svg
        this.raphEl.clear();

        // set width and height in case they have changed
        this.raphEl.setSize(this.$el.width(), this.$el.height());

        // axes labels
        _.each(this.axes, function (axis) {

            this.raphEl.text(axis.origin.x, axis.origin.y, axis.label)
                .attr({'fill': styles.textColor})
                .attr(axis.labelAttr);

        }, this);

        _.each(bars, function (bar, key) {
            var w = this.ensureNumerical(parseInt(styles.barWidth, 10)),
                m = this.ensureNumerical(parseInt(styles.barMargin, 10)),
                h = maxVal === 0 ? 0 : this.ensureNumerical(bar.value / maxVal * maxHeight),
                y = this.ensureNumerical(this.origin.y);

            prevX = this.ensureNumerical(prevX + (key === 0 ? m : w + m * 2));

            this.raphEl.rect(prevX, y - h, w, h).attr({
                'stroke-width': 0,
                'fill': styles.barColor
            });

            this.raphEl.text(prevX + (w/2), this.origin.y + 15, bar.name).attr({
                'fill': styles.textColor
            });

            this.raphEl.text(prevX + (w/2), this.origin.y - h - 15, bar.value).attr({
                'fill': styles.valueColor
            });

        }, this);


        return this;
    },

    getArc: function (id) {
        'use strict';

        return this.arcs.get(id, this);
    },

    /**
     * resets and reanimates the chart
     *
     * @returns {object}
     */
    animate: function () {
        'use strict';

        return this;
    },

    /**
     * Checks type of value to ensure it's a number and
     * converts it to a number if it can.
     *
     * @param {string|number} num - value to check
     * @returns {number}
     */
    ensureNumerical: function (num) {
        'use strict';

        if (_.isNumber(num)) {
            return num;
        }

        if (_.isString(num)) {
            return parseInt(num.replace(/[^0-9]/g, ''), 10);
        }

        console.warn('ensureNumerical expected a String of Number but got ', num);

        return 0;
    },

    getCSSData: function (el) {
        'use strict';

        var $window = $(window),
            ww = $window.width(),
            $el = $(el),
            isModule = !!$el.closest('.module').length,
            barColor = $el.css('border-top-color'),
            textColor = $el.css('border-left-color'),
            valueColor = $el.css('border-right-color'),
            data = {};

        // The data object holds a bunch of hard coded values based on screen
        // size or if it's in a module. These could be dynamic, but appear to
        // have been done this way due to time constraints.

        // If the bar chart is in a module
        if (isModule) {
            // in progress
            data = {
                barWidth: '40px',
                barColor: barColor,
                barMargin: '20px',
                textColor: textColor,
                valueColor: valueColor,
                nameOriginX: '40',
                nameOriginY:'175',
                valueOriginX: '20',
                valueOriginY: '80',
                graphOriginX: '110',
                graphOriginY: '160'
            };
        } else {
            data = {
                barWidth: '50px',
                barColor: barColor,
                barMargin: '25px',
                textColor: textColor,
                valueColor: valueColor,
                nameOriginX: '50',
                nameOriginY:'355',
                valueOriginX: '20',
                valueOriginY: '160',
                graphOriginX: '130',
                graphOriginY: '340'
            };

            if (ww < 670) {
                data.barWidth = '15px';
                data.barMargin = '17px';
                data.nameOriginX = '40';
                data.nameOriginY = '285';
                data.valueOriginY = '150';
                data.graphOriginX = '60';
                data.graphOriginY = '270';
            } else if (ww >= 670 && ww < 980) {
                data.barWidth = '40px';
                data.barMargin = '20px';
                data.graphOriginX = '110';
            }
        }

        return data;
    }

});
