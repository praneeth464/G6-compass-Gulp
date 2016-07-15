/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
ProfilePageBadgesTabCollection,
TemplateManager,
ProfilePageBadgesTabView:true
*/
ProfilePageBadgesTabView = Backbone.View.extend({
    initialize: function (opts) {
        'use strict';

        this.tplName    = opts.tplName || "profilePageBadgesTab";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';

        //create our data collection if one hasn't been passed
        this.model = this.model ? this.model : new ProfilePageBadgesTabCollection();

        //listen to the gamification collection
        this.model.on('reset', this.modelOnReset, this);
        this.model.on('loadError', this.modelOnLoadError, this);
        //this.on('renderDone', this.postRender, this);

        //ARNxyzzy// console.log("[INFO]05 ARNlogging ProfilePageBadgesTabView initialized");
    },

    activate: function () {
        'use strict';
        
        if( !this.$el.find('.spin').length ) {
            this.$el
                .append('<span class="spin" />')
                .find('.spin').spin();
        }

        //retrieve the gamification data
        this.model.loadData();
    },

    modelOnLoadError: function(jqXHR, textStatus, errorThrown) {
        this.$el.html(
            this.make('p', {"class" : "alert alert-error"}, textStatus + ': ' + jqXHR.status + ' ' + errorThrown )
        );
    },

    modelOnReset: function () {
        'use strict';

        //retrieve the gamification data
        this.render();
    },

    render: function () {
        'use strict';
        var that = this;
        //ARNxyzzy// console.log("[INFO]06 ARNlogging ProfilePageBadgesTabView render called");

        TemplateManager.get(
            this.tplName,
            function (tpl) {
                var badgeGroupsModel    = that.model.toJSON(),
                    $newElements        = null;

                $newElements = that.customizeGroups(tpl(badgeGroupsModel[0]));
                // $newElements = $(tpl(badgeGroupsModel[0]));

                $newElements = that.reformatRenderedHtml($newElements);

                that.$el.
                    empty().
                    append($newElements);

                that.trigger('renderDone');
            },
            this.tplUrl
        );

        //ARNxyzzy// console.log("[INFO]06 ARNlogging ProfilePageBadgesTabView rendered");

        return this;
    },

    // postRender: function() {
    //     var that = this;
        
    //     if(this._params) {
    //         $.scrollTo('#'+this._params, G5.props.ANIMATION_DURATION, {
    //             axis : 'y',
    //             onAfter: function() {
    //                 that.$el.find('#'+that._params).addClass('background-flash');
    //                 setTimeout(function() {
    //                     that.$el.find('#'+that._params).removeClass('background-flash');
    //                     G5.util.animBg(that.$el.find('#'+that._params),'background-flash');
    //                 }, 1000);
    //             }
    //         });
    //     }
    // },

    customizeGroups: function (htmlInput) {
        'use strict';
        var badgeCount      = 0,
            badgeEl         = null,
            badgeEls        = null,
            badgeElsIndex   = 0,
            badgeIndex      = 0,
            columnsDesired  = 3,
            columnsLength   = [],
            els             = $(htmlInput),
            groups          = null,
            groupIndex      = 0,
            i               = 0,
            secondColumn    = null,
            thirdColumn     = null,
            that            = this;

        //debugger;
        try {
            groups = this.model.models[0].get('badgeGroups');
            badgeEls = $(".badge-item", els);
            badgeElsIndex = 0;

            // Process each group
            for (groupIndex = 0; groupIndex < groups.length; groupIndex++) {

                // Process each badge in the group
                for (badgeIndex = 0; badgeIndex < groups[groupIndex].badges.length > 0; badgeIndex++) {
                    badgeEl = badgeEls.eq(badgeElsIndex);

                    // Hide progress bar when not progress type or already earned
                    if ((groups[groupIndex].badges[badgeIndex].type !== "progress") ||
                            (groups[groupIndex].badges[badgeIndex].earned)) {
                        badgeEl.find(".progress").addClass("hide");
                        badgeEl.find(".bar").addClass("hide");

                    // Show progress for those that are progress type
                    } else if (groups[groupIndex].badges[badgeIndex].type === "progress") {
                        badgeEl.find(".bar").
                            attr("style",
                                "width: " +
                                ((100 * groups[groupIndex].badges[badgeIndex].progressNumerator) /
                                    groups[groupIndex].badges[badgeIndex].progressDenominator) +
                                "%");
                    }

                    // Hide date earned if not earned
                    if (!groups[groupIndex].badges[badgeIndex].earned) {
                        badgeEl.find(".badge-date-earned").addClass("hide");
                    } else {
                        $.noop();
                        //feAssert//// feAssert(typeof(groups[groupIndex].badges[badgeIndex].dateEarned)==="string", "Expected dateEarned to be defined for badges["+n+"]");
                    }

                    badgeElsIndex += 1;
                }
            }

        } catch (e) {
            // $.noop();
            //ARNxyzzy// debugger;
        } finally {
            //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageBadgesTabView.customizeGroups         "+groups.length+" ARNlogging");
        }

        return els;
    },

    // NOTE: this method is highly dependent on the Handlebars template. Change the template and this method may need changing
    reformatRenderedHtml : function($rendered) {
        var $reformatted = $rendered.clone(true),
            $groups = $reformatted.find('.badge-group');

        $groups.each(function(i) {
            var $group = $(this),
                $badgeList = $group.find('ul'),
                $badgeList2 = $badgeList.clone(true),
                $badges = $group.find('.badge-item'),
                slicePoint = Math.ceil( $badges.length / 2 ); // always round up so the first column is longer than the second

            // Find all the list items in the first list after the slice point and remove them
            // NOTE: jQuery's .gt() method does the same thing, but more slowly (according to the jQ documentation)
            $badgeList.find('.badge-item').slice(slicePoint).remove();
            // Find all the list items in the second list before the slice point and remove them
            // NOTE: jQuery's .lt() method does the same thing, but more slowly (according to the jQ documentation)
            $badgeList2.find('.badge-item').slice(0, slicePoint).remove();

            $badgeList2.insertAfter($badgeList);
        });

        $groups.addClass('reformatted');

        return $reformatted;
    }
});
