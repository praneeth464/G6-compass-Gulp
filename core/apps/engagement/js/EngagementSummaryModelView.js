/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
console,
$,
_,
Raphael,
G5,
Backbone,
TemplateManager,
EngagementSummaryModel,
EngagementSummaryModelView:true
*/
EngagementSummaryModelView = Backbone.View.extend({
    initialize: function() {
        console.log('[INFO] EngagementSummaryModelView: initialized', this);

        var that = this,
            defaults = {};

        this.options = $.extend(true, {}, defaults, this.options);

        this.model = this.options.model || new EngagementSummaryModel();
        this.tplName = this.options.tplName || 'engagementSummaryModel';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'engagement/tpl/';

        this.nameId = this.options.nameId || null;
        this.parentView = this.options.parentView || this;


        // listen to the model
        this.model.on('change', this.render, this);

        // listen to the view
        this.on('templateLoaded', this.render, this);


        // listen to the parentView's moduleView (if it exists)
        // note to self: this is kinda hacky. Should be the moduleView doing the listening and telling this view to redraw
        if( this.parentView.moduleView ) {
            this.parentView.moduleView.on('geometryCssClassChanged', this.handleGeometryChange, this);
        }


        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            that.tpl = tpl;
            that.tplVariables = vars;
            that.subTpls = subTpls;

            that.trigger('templateLoaded');
        },this.tplUrl, null, false); // noHandlebars = null, async = false
    },

    events: {
        'click .showDescription' : 'initDescriptionTip',
        'click .largeAudience' : 'handleLargeAudienceLink',
        'click .title a, .actual a': 'disablePageLinks'
    },

    // render simply inserts the HTML
    render: function() {
        var json = this.model.toJSON();

        G5.util.showSpin(this.$el);

        this.preRender(json);

        this.$el.empty().append( this.tpl(json) );

        this._rendered = true;

        this.trigger('renderDone');
    },

    preRender: function(json) {
        // each rate string has special CM keys containing the full translated string for the "X of Y team members have achieved the target" text
        // the key output will have a {0} and {1} placeholders where the numbers of people are inserted
        // this allows the translations to have plain text and the numbers in any order
        // we embed this CM output as a tplVariables in our engagementSummaryModel Handlebars template
        // we also have subTpls embedded in our engagementSummaryModel Handlebars template
        // we pass the various values from the JSON to the subTpls, then replace the {0} and {1} with the rendered output
        // the final string is assigned to rateFormatted in the JSON to be passed to the main template
        if(this.tplVariables.rate) {
            json.rateFormatted = G5.util.cmReplace({
                cm: json.type == 'score' ? this.tplVariables.rateScore : this.tplVariables.rate,
                subs: [
                    this.subTpls.teamMemMetTarget({teamMemMetTarget: json.teamMemMetTarget}),
                    this.subTpls.teamMemCount({teamMemCount: json.teamMemCount})
                ]
            });
        }

        return json;
    },

    // activate animates the meter
    activate: function() {
        var that = this,
            activate = function() {
                that.titleResize();
                that.drawScoreMeter();
            };

        if( this._rendered === true ) {
            activate();
        }
        else {
            this.on('renderDone', function() {
                activate();
            }, this);
        }
    },

    initDescriptionTip: function(e) {
        var $tar = $(e.target).closest('.showDescription');

        e.preventDefault();

        $tar.qtip({
            content : {
                text: this.$el.find('.description').text()
            },
            position : {
                my : 'middle right',
                at : 'left middle',
                viewport : $(window),
                adjust : {
                    x : 0,
                    y : 0,
                    method: 'shift none'
                },
                container: $('body')
            },
            show : {
                ready : true,
                event : 'click'
            },
            style : {
                padding : 0,
                classes : 'ui-tooltip-shadow ui-tooltip-dark engagementSummaryDescription',
                tip : {
                    width : 10,
                    height : 5
                }
            }
        });
    },

    disablePageLinks: function(){
        if(!this.$el.parents('.engagementSummaryCollectionView').hasClass('moduleSummary')){
            return false;
        }
    },

    drawScoreMeter: function() {
        var that = this,
            $box = this.$el.find('.actual .meter').not('.meterAch'),
            $boxAch = this.$el.find('.meterAch'),
            boxW = $box.width(),
            boxH = $box.height(),
            boxId = 'meter_' + Math.round(Math.random()*10000),
            score = Math.min(this.model.get('actual') / this.model.get('target') * 100, 200),
            bgArcColor = $box.css('border-top-color'),
            fgArcColor = $box.css('outline-color'),
            ovArcColor = $box.css('color'),
            arcStrokeWidth = parseInt($box.css('font-size'), 10) || 6;

        if( !$box.is(':visible') ) {
            return false;
        }

        // the meter never draws when scores are inactive
        if( this.model.get('isScoreActive') === false ) {
            return false;
        }

        if( !window.Raphael ) {
            $.cachedScript( this.parentView.$el.find('.raphael').data('src') ).done(function() {
                that.drawScoreMeter();
            });

            return false;
        }

        $box.attr('id', boxId);
        $box.closest('.achieved').removeClass('achieved');
        $boxAch.attr('id', 'ach_'+boxId);

        if( !this.meter ) {
            this.meter = Raphael(boxId, boxW, boxH);
            this.meter.customAttributes.arc = function (xloc, yloc, value, total, R) {
                var alpha = 360 / total * value,
                    a = (90 - alpha) * Math.PI / 180,
                    x = xloc + R * Math.cos(a),
                    y = yloc - R * Math.sin(a),
                    path;
                if (total == value) {
                    path = [
                        ["M", xloc, yloc - R],
                        ["A", R, R, 0, 1, 1, xloc - 0.01, yloc - R]
                    ];
                } else {
                    path = [
                        ["M", xloc, yloc - R],
                        ["A", R, R, 0, +(alpha > 180), 1, x, y]
                    ];
                }
                return {
                    path: path
                };
            };

            this.meterArcs = {
                bg : [boxW/2, boxH/2, 100, 100, Math.min(boxW, boxH)/2 - arcStrokeWidth*2],
                fg : [boxW/2, boxH/2, Math.min(score,100), 100, Math.min(boxW, boxH)/2 - arcStrokeWidth*2],
                ov : [boxW/2, boxH/2, Math.max(score-100,0), 100, Math.min(boxW, boxH)/2 - arcStrokeWidth*1.5]
            };

            this.meterAch = Raphael('ach_'+boxId, boxW, boxH);
        }
        else if( this.meter ) {
            this.meterBgArc.remove();
            this.meterFgArc.remove();
            this.meterAchArc.remove();
            if( this.meterAchArcGlow ) { this.meterAchArcGlow.remove(); }
        }

        this.meterBgArc = this.meter
            .path()
            .attr({
                "stroke": bgArcColor,
                "stroke-width": arcStrokeWidth,
                arc: this.meterArcs.bg
            });

        this.meterFgArc = this.meter
            .path()
            .attr({
                "stroke": fgArcColor,
                "stroke-width": arcStrokeWidth,
                arc: [this.meterArcs.fg[0], this.meterArcs.fg[1], 0.01, this.meterArcs.fg[3], this.meterArcs.fg[4]]
            });

        this.meterAchArc = this.meterAch
            .circle(this.meterArcs.ov[0], this.meterArcs.ov[1], this.meterArcs.ov[4])
            .attr({
                "stroke-width" : 0,
                fill : fgArcColor
            });

        this.meterAchArcGlow = this.meterAchArc
            .glow({
                width: arcStrokeWidth * 3,
                opacity: 0.625,
                color: ovArcColor
            });

        this.meterFgArc
            .animate({
                   arc: that.meterArcs.fg
                },
                G5.props.ANIMATION_DURATION * 10,
                '<>',
                function() {
                    if( score >= 100 ) {
                        $box.closest('.actual').addClass('achieved');

                        that.meterFgArc.attr({
                            stroke: ovArcColor
                        });
                    }
                }
            );
    },

    titleResize: function(){
        var $title = this.$el.find('.titleLink');

         _.delay(G5.util.textShrink, 100, $title, {vertical:false,minFontSize:20});
        G5.util.textShrink( $title, {vertical:false,minFontSize:20});
    },

    // note to self: this should really be in the moduleView, not here
    handleGeometryChange: function() {
        if( this.meter ) {
            this.$el.find('.actual .meter').empty();
            this.meter = null;
        }
        this.titleResize();
        this.drawScoreMeter();
    },

    handleLargeAudienceLink: function(e) {
        e.preventDefault();

        var $tar = $(e.target).closest('a'),
            href = $tar.attr('href');

        $tar.spin();

        $.ajax({
            url: href,
            dataType: 'g5json',
            success: function() {
                // nothing to do. Response should be a ServerCommand that opens a modal
                $tar.spin(false);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                $tar.spin(false);
                alert(textStatus + ': ' +errorThrown);
                console.log(jqXHR, textStatus, errorThrown);
            }
        });
    }
});
