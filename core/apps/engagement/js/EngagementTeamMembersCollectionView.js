/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Raphael,
G5,
TemplateManager,
Backbone,
PaginationView,
RecognitionEzView,
EngagementTeamMembersModel,
EngagementTeamMembersCollection,
EngagementTeamMembersCollectionView:true
*/
EngagementTeamMembersCollectionView = Backbone.View.extend({
    initialize: function() {
        console.log('[INFO] EngagementTeamMembersCollectionView: initialized', this);

        var defaults = {};

        this.options = $.extend(true, {}, defaults, this.options);

        this.tplName = this.options.tplName || 'engagementTeamMembersCollection';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'engagement/tpl/';

        this.model = this.options.model ? new EngagementTeamMembersModel(
            this.options.model,
            { engagementModel : this.options.engagementModel }
        ) : null;

        this.collection = this.options.collection || new EngagementTeamMembersCollection(this.options.members || null, {
            meta : this.options.meta,
            engagementModel : this.options.engagementModel
        });

        // collection listeners
        this.collection.on('reset', this.render, this);
        this.collection.on('add', this.render, this);

        // view listeners
        this.on('renderDone', this.postRender, this);

        // if the collection already has models, render
        if( this.collection.length ) {
            this.render();
        }
    },

    events: {
        "click .sortable a" : "handleTableSort",
        "click .drill" : "handleDrillDown",
        "click .unrecognized" : "handleUnrecognizedTip",
        "click .recognize" : "doEzRecognize"
    },

    render: function() {
        var that = this,
            json = {
                members : this.collection.toJSON(),
                meta : this.collection.meta,
                model : this.model ? this.model.toJSON() : null,
                membersType : this.options.membersType || 'user'
            };

        json.meta.isScoreActive = this.options.engagementModel && this.options.engagementModel.get('isScoreActive');
        json.meta.areTargetsShown = this.options.engagementModel && this.options.engagementModel.get('areTargetsShown');

        G5.util.showSpin(this.$el);

        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            that.tplVars = vars;
            that.subTpls = subTpls;

            that.$el.empty().append( tpl(json) );

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
    },

    postRender: function() {
        this.renderPagination();
        this.markSortedColumn();
        this.$el.find('.table').responsiveTable();

        if( this.options.engagementModel && this.options.engagementModel.get('isScoreActive') ) {
            this.drawScoreMeters();
        }
    },

    renderPagination: function() {
        var that = this;

        // if our data is paginated, add a special pagination view
        if( this.collection.meta.count > this.collection.meta.perPage ) {
            // if no pagination view exists, create a new one
            if( !this.paginationView ) {
                this.paginationView = new PaginationView({
                    el : this.$el.find('.paginationControls'),
                    pages : Math.ceil(this.collection.meta.count / this.collection.meta.perPage),
                    current : this.collection.meta.page,
                    per : this.collection.meta.perPage,
                    total : this.collection.meta.count,
                    ajax : true,
                    showCounts : true,
                    tpl : this.subTpls.paginationTpl || false
                });

                this.paginationView.on('goToPage', function(page) {
                    that.paginationClickHandler(page);
                });

                this.collection.on('loadDataDone', function() {
                    that.paginationView.setProperties({
                        rendered : false,
                        pages : Math.ceil(that.collection.meta.count / that.collection.meta.perPage),
                        current : that.collection.meta.page
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.paginationView.setElement( this.$el.find('.paginationControls') );

                // we know that pagination should exist because of the if with count, so we need to explicitly render if it has no children
                if( !this.paginationView.$el.children().length ) {
                    this.paginationView.render();
                }
            }
        }
    },

    drawScoreMeters: function() {
        var that = this;

        if( !window.Raphael ) {
            $.cachedScript( this.$el.find('.raphael').data('src') ).done(function() {
                that.drawScoreMeters();
            });

            return false;
        }

        this.$el.find('td.score.actual').each(function() {
            var that = this,
                $this = $(this),
                $box = $this.find('.meter').not('.meterAch'),
                $boxAch = $this.find('.meterAch'),
                boxW = $box.width(),
                boxH = $box.height(),
                boxId = 'meter_' + Math.round(Math.random()*10000),
                score = Math.min($box.data('actual') / $box.data('target') * 100, 200),
                bgArcColor = $box.css('border-top-color'),
                fgArcColor = $box.css('outline-color'),
                ovArcColor = $box.css('color'),
                arcStrokeWidth = 4;

            // if there is no meter to draw, bail
            if( !$box.length ) {
                return;
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
                    ov : [boxW/2, boxH/2, Math.max(score-100,0), 100, Math.min(boxW, boxH)/2 - arcStrokeWidth*1.67] //1.75 lines it up exactly with the inner ring, but that doesn't look good when it renders
                };

                this.meterAch = Raphael('ach_'+boxId, boxW, boxH);

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
                        arc: [this.meterArcs.fg[0], this.meterArcs.fg[1], 0, this.meterArcs.fg[3], this.meterArcs.fg[4]]
                    });

                this.meterAchArc = this.meterAch
                    .circle(this.meterArcs.ov[0], this.meterArcs.ov[1], this.meterArcs.ov[4])
                    .attr({
                        "stroke-width" : 0,
                        fill : fgArcColor
                    });

                this.meterAchArcGlow = this.meterAchArc
                    .glow({
                        width: arcStrokeWidth * 2,
                        opacity: 0.625,
                        color: ovArcColor
                    });
            }

            this.meterFgArc.animate({
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
        });
    },

    paginationClickHandler: function(page) {
        G5.util.showSpin( this.$el, {
            cover : true
        } );

        this.collection.loadData({
            membersType : this.options.membersType,
            count : this.collection.meta.count,
            perPage : this.collection.meta.perPage,
            page : page,
            sortedOn : this.collection.meta.sortedOn,
            sortedBy : this.collection.meta.sortedBy
        });
    },

    handleTableSort: function(e) {
        var $tar = $(e.target).closest('.sortable'),
            sortOn = $tar.data('sortOn'),
            // sortOnType = sortOn.split('-')[0],
            // sortOnVal = sortOn.split('-')[1],
            sortBy = $tar.data('sortBy');

        e.preventDefault();

        G5.util.showSpin( this.$el, {
            cover : true
        } );

        // if we're paginated, we have to go to the server to sort
        // if( this.collection.meta.count > this.collection.meta.perPage ) {
            this.collection.loadData({
                membersType : this.options.membersType,
                count : this.collection.meta.count,
                perPage : this.collection.meta.perPage,
                sortedOn : sortOn,
                sortedBy : sortBy
            });
        // }
        // otherwise, we can sort the collection locally (NOPE: this is too hard)
        // else {
        //     if( sortOn == 'member' ) {
        //         this.collection.sortBy(function(model) { return model.get('data').userName || model.get('data').nodeName; });
        //     }
        //     else {
        //         this.collection.sortBy(function(model) { return _.where(model.get('data'), {type: sortOnType})[0][sortOnVal]; });
        //     }
        //     this.render();
        // }
    },

    handleDrillDown: function(e) {
        var $tar = $(e.target).closest('.drill'),
            url = $tar.attr('href'),
            data = {
                userId : $tar.data('userId') || null,
                nodeId : $tar.data('nodeId') || null,
                userName : $tar.data('userName') || null,
                nodeName : $tar.data('nodeName') || null
            };

        e.preventDefault();

        // Un-necessary now as of bugzilla #63626, we are adding a nodeId data-attribute on all participant drill links.
        //
        // if drilling to a user, Java has requested that we also pass the nodeId
        // if( data.userId ) {
        //     data.nodeId = (data.nodeId || null).toString();
        // }

        this.trigger('drillDown', data, url);
    },

    handleUnrecognizedTip: function(e) {
        var $tar = $(e.target).closest('.unrecognized'),
            $content = $tar.siblings('.unrecognized-tip');

        e.preventDefault();

        if( !$tar.data('qtip') ) {
            $tar.qtip({
                content : {
                    text: $content
                },
                position : {
                    my : 'bottom middle',
                    at : 'top middle',
                    adjust : {
                        method : 'shift none'
                    },
                    container: this.$el
                },
                show : {
                    ready : true,
                    event : 'click'
                },
                hide : {
                    event : 'click'
                },
                style : {
                    padding : 0,
                    classes : 'ui-tooltip-shadow ui-tooltip-light unrecognizedDescription',
                    tip : {
                        corner : true,
                        width : 20,
                        height : 10
                    }
                }
            });
        }
    },

    doEzRecognize: function(e) {
        e.preventDefault();

        var $tar = $(e.target).closest('.recognize'),
            $tipTar = $tar.closest('.ui-tooltip'),
            that = this,
            $theModal = this.$el.find("#ezRecognizeMiniProfileModal").clone().appendTo("body").addClass("ezModuleModalClone").on("hidden", function() {
                $(this).remove();
            }),
            paxId = $tar.data('participantId'),
            nodeId = $tar.data('nodeId'),
            close = function () {
                $theModal.modal("hide");
            },
            init = function() {
                that.eZrecognizeView = new RecognitionEzView({
                    recipient : { id : paxId, nodes : [ { id : nodeId } ] },
                    el        : $theModal,
                    close     : close
                });

                that.eZrecognizeView.on("templateReady", function(){
                    $theModal.addClass('grid-dimension-4x4'); // faking the big size. some styles will be overridden to fit in the modal properly
                    that.eZrecognizeView.$el.find(".ezRecLiner").show(); // the View hides itself. we need to reshow it
                    that.eZrecognizeView.$el.find("#ezRecModalCloseBtn").show();
                });
            };

        $tipTar.hide();

        // console.log("$.support.transition", $.support.transition);

        if ($.support.transition) { // ie is slow
            $theModal.on('shown', function() {
                init();
            });
            $theModal.modal("show");
        } else {
            $theModal.modal("show");
            init();
        }
    },

    markSortedColumn: function() {
        var sortedOn = this.$el.find('thead .sorted').data('sortOn'),
            sortClass = sortedOn.split('_').join('.');

        this.$el.find('tbody .sorted').removeClass('sorted');
        this.$el.find('tbody .' + sortClass).addClass('sorted');
        // alert('to do');
    },

    setType: function(type) {
        this.$el
            .removeClass('type-' + this._viewType)
            .addClass('type-' + type);

        this._viewType = type;

        // I don't like having this here, but I'm feeling lazy.
        // Considering that the type change is what requires the table to recheck itself for responsiveness, this seems like an OK place.
        this.$el.find('.table').responsiveTable({reset:true});
    }
});
