/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
Backbone,
G5,
Raphael,
console,
SSICircleChartCollection,
SSICircleChartView:true
*/

/*
 * View for drawing circular charts,
 * currently used in Step It Up and Objectives contests.
 */
SSICircleChartView = Backbone.View.extend({

    initialize: function (opts) {
        'use strict';
        var that = this;


        console.log('[SSI] initialize SSICircleChartView');

        this.parentView = opts.parentView;
        this.grandparentView = opts.parentView.parentView; // wearther's original, son?

        this.arcs = new SSICircleChartCollection();

        this.chartData = opts.chartData;

        // load Raphael, if it needs to be
        if (window.Raphael) {
            this.setup(this.getSettings());
        } else {
            $.cachedScript(this.parentView.$el.find('.raphael').data('src'))
                .done(function() {
                    that.setup( that.getSettings() );
                })
                .fail(function () {
                    throw new Error('Error loading Raphael');
                });
        }


        // for pages size changes
        this.parentView.on('pageViewResize', function() {
            this.updateSettings();
        }, this);

        // for modules size changes
        this.grandparentView.on('beforeDimensionsChange', function(dims){
            $(this.raphEl.canvas).hide();
        }, this);

        // for modules size changes
        this.grandparentView.on('geometryChanged', function(){
            $(this.raphEl.canvas).show();
            this.updateSettings();
        }, this);


        return this;
    },

    getSettings: function() {
        return _.extend({}, this.chartData, {
            width      : this.$el.width(),
            height     : this.$el.height(),
            bgArcColor : this.$el.css('border-top-color'),
            fgArcColor : this.$el.css('outline-color'),
            ovArcColor : this.$el.css('color'),
            arcStrokeWidth: parseInt(this.$el.css('font-size'), 10) || 6
        });
    },

    updateSettings: function () {
        if(!this.$el.is(':visible')) { return; }
        var info = this.getSettings();

        // nah, do nuthin' cuz da width aint chang'd
        if( this.raphEl.width === info.width ||
            this.raphEl.height === info.height) {
            return;
        }

        if (info.width && info.height) {
            this.raphEl.setSize(info.width, info.height);
        }

        this.meterBgArc.remove();
        this.meterFgArc.remove();

        delete this.meterBgArc;
        delete this.meterFgArc;

        this.arcStrokeWidth = info.arcStrokeWidth || this.arcStrokeWidth;

        this.render();
    },

    /**
     * Attaches settings to the view
     *
     * Split into it's own function mostly for readiblity.
     *
     * @param {object} settings
     * @returns {object}
     */
    setup: function (settings) {
        'use strict';

        var progressCap,
            bonusAmount,
            bonusCap;

         // stage element
        this.holder = settings.holder || $('<div>').get(0);

        // goal reward count
        this.goal = this.ensureNumerical(settings.goal) || 100;

        // reward count earned so far
        this.progress = this.ensureNumerical(settings.progress) || 0;

        // chart beginning / ending points
        this.angle = {
            start: (settings.angle && settings.angle.start) ?
                    settings.angle.start :
                    -90,
            end: (settings.angle && settings.angle.end) ?
                    settings.angle.end :
                    270
        };

        // colors
        this.bgArcColor = settings.bgArcColor || '#000000';
        this.fgArcColor = settings.fgArcColor || '#ffffff';
        this.ovArcColor = settings.ovArcColor || '#b3b3b3';

        // width
        this.arcStrokeWidth = settings.arcStrokeWidth || 10;

        this.raphEl = new Raphael(this.el, settings.width, settings.height);
        this.raphEl.customAttributes.arc = this.arcSetup();

        // make sure our arc(s) is above the .chartData element
        $(this.raphEl.canvas).css('z-index',1);

        // progress info
        progressCap = Math.min(this.progress, this.goal);
        bonusAmount = Math.max(this.progress - this.goal, 0);
        bonusCap    = Math.min(bonusAmount, this.goal);

        /**
         * bg  - background arc
         * fgo - points earned arc startiFng point
         * fg  - points earned arc ending point
         * ovo - bonus points earned arc starting point
         * ov  - bonus points earned arc starting point
         */
        this.arcs.add([
            { id: 'bg',  value: this.goal,   radiusMultiplier: 2   },
            { id: 'fgo', value: 0.01,        radiusMultiplier: 2   },
            { id: 'fg',  value: progressCap, radiusMultiplier: 2   }
            // { id: 'ovo', value: 0.01,        radiusMultiplier: 1.5 },
            // { id: 'ov',  value: bonusCap,    radiusMultiplier: 1.5 }
        ]);

        this.render();

        return this;
    },

    /**
     * Wraps custom arc drawing functionality for Raphael, in order to
     * maintain refernces to the current view.
     *
     * @returns {function}
     */
    arcSetup: function () {
        'use strict';

        var that = this;

        /**
         * Processes chart information and returns needed settings
         * for Raphael to draw a circle chart.
         *
         * When Raphael animates, `arguments` are only available
         * if explicitly set
         *
         * @returns {object}
         */
        return function (v, r, cx, cy) {
            /**
             * @param {object} s - arc information
             * @param {object} s.center
             * @param {number} s.center.x - horizontal center of arc
             * @param {number} s.center.y - vertical center of arc
             * @param {number} s.radius - arc radius
             * @param {number} s.value - how many points have been earned
             */

            var s = {
                    center: {x: cx, y: cy},
                    radius: r,
                    value: v
                },
                maxLength  = (that.angle.start > that.angle.end) ?
                              that.angle.start - that.angle.end :
                              that.angle.end - that.angle.start,
                radian = {},
                angle = {},
                x = {},
                y = {},
                path = [],
                arcLength,
                largeArc;

            if (!_.isObject(s)) {
                throw new Error('settings expected an Object');
            }

            // prevent rendering errors when chart is filled
            if (s.value >= that.goal) {
                s.value = that.goal - 0.01;
            } else if (s.value < 0.01) {
                s.value = 0.01; // if we have to animate a negative value, it will have to be done another way.
            }

            arcLength = maxLength / that.goal * s.value;

            angle.start      = that.angle.start;
            angle.end        = that.angle.start + arcLength;
            angle.difference = (angle.start > angle.end) ?
                                angle.start - angle.end :
                                angle.end - angle.start;

            radian.start   = Raphael.rad(angle.start);
            radian.end     = Raphael.rad(angle.end);

            x.start = s.center.x + Math.cos(radian.start) * s.radius;
            x.end   = s.center.x + Math.cos(radian.end) * s.radius;

            y.start = s.center.y + Math.sin(radian.start) * s.radius;
            y.end   = s.center.y + Math.sin(radian.end) * s.radius;

            largeArc = (angle.difference > 180) ? 1 : 0;

            path.push(['M', x.start, y.start]);

            // rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y
            path.push(['A', s.radius, s.radius, 1, largeArc, 1, x.end, y.end]);

            return {
                path: path
            };
        };
    },

    /**
     * creates and adds paths to the stage
     *
     * @returns {object}
     */
    render: function () {
        'use strict';

        // background
        this.meterBgArc = this.raphEl.path().attr({
            'stroke': this.bgArcColor,
            'stroke-width': this.arcStrokeWidth,
            arc: this.getArcArr('bg')
        });


        // prevent multiple arcs being created, incase `render`
        // is accidentally called twice
        this.meterFgArc = this.meterFgArc || this.raphEl.path().attr({
            'stroke': this.fgArcColor,
            'stroke-width': this.arcStrokeWidth,
            arc: this.getArcArr('fgo')
        });

        this.animate();

        return this;
    },

    getArc: function (id) {
        'use strict';

        return this.arcs.get(id, this);
    },

    getArcArr: function(id) {
        var x = this.arcs.get(id, this);
        return [x.value, x.radius, x.center.x, x.center.y];
    },

    /**
     * resets and reanimates the chart
     *
     * @returns {object}
     */
    animate: function () {
        'use strict';

        try {
            if (!$(this.raphEl.canvas).is(':visible')) {
                return this;
            }

            var that = this,
                // progressPercent = this.goal / this.progress * 100,
                progressPercent = this.progress / this.goal * 100,
                easing = progressPercent <= 100 ? '<>' : '<',
                // all progress bars have same duration
                duration = progressPercent <= 100 ?
                            G5.props.ANIMATION_DURATION * 2 :
                            G5.props.ANIMATION_DURATION * 2 * 100 / progressPercent;

            this.meterFgArc.attr({
                arc: this.getArcArr('fgo')
            }).animate({
                arc: that.getArcArr('fg')
            }, duration, easing, function () {
                if (that.progress <= that.goal) {
                    return;
                }
            });
        } catch (e) {
            console.error('[SSI] SSICircleChartView.animate() ouchy', e);
        }

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
            return parseFloat(num.replace(/[^0-9\.\-]/g, ''), 10);
        }

        console.warn('ensureNumerical expected a String of Number but got ', num);

        return 0;
    }

});
