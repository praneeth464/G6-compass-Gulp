/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
TemplateManager,
GamificationCollection,
GamificationDataView:true
*/

//debugger;
GamificationDataView = Backbone.View.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        //ARNxyzzy// console.log("[INFO] GamificationDataView.initialize  ...creating GamificationCollection          ARNlogging");
        //ARNxyzzy//// debugger;
        this.size = opts.size;

        //create our data collection
        this.model = new GamificationCollection();

        //retrieve the gamification data
        this.model.loadData();

        //listen to the gamification collection
        this.model.on('reset', this.modelOnReset, this);

        this.on('sizeChange', this.onSizeChange, this);
        //ARNxyzzy// console.log("[INFO] GamificationDataView.initialize DONE      ARNlogging");
    },

    onSizeChange: function (size) {
        'use strict';
        var $firstModel = this.model.first();
        if (this.size !== size && this.model && this.model.length > 0) {
            //ARNxyzzy// console.log("[INFO] GamificationDataView sizeChange          from:"+this.size+" to:"+size+" ARNlogging");
                $firstModel.set(
                    "moduleSize" + this.size,
                    false
                );
                $firstModel.set(
                    "moduleSize" + size,
                    true
                );
                this.size = size;
                this.render();
        }
    },

    modelOnReset: function () {
        'use strict';
        var propID      = "moduleSize" + this.size,
            isThisSize  = this.model.first().get(propID);
        if (!isThisSize) {
            //ARNxyzzy//// console.log("[INFO] ...size not yet added to model      ARNlogging");
            this.model.first().set({
                "moduleSize1x1": false,
                "moduleSize2x1": false,
                "moduleSize2x2": false,
                "moduleSize4x2": false,
                "moduleSize4x4": false
            }).set(propID, true);
        }
        //ARNxyzzy//// console.log("[INFO] ...size flag added ["+propID+"="+this.model.first().get(propID)+"]      ARNlogging");
        this.render();
    },

    render: function () {
        'use strict';
        //ARNxyzzy// console.log("[INFO] GamificationDataView.render TPL with MODEL              "+this.size+" ARNlogging");
        var that    = this,
            tplName = 'gamificationModule',
            tplUrl  = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'gamification/tpl/';

        TemplateManager.get(
            tplName,
            function (tpl) {
                //ARNxyzzy////debugger;
                var gamModel        = that.model.toJSON(),
                    $newElements    = null;

                //ARNxyzzy////debugger;
                //ARNxyzzy// console.log("[INFO] GamificationDataView.render TPL callback  ARNlogging");

                // HACK: Code is a shortcut. Why and what is better: 
                switch (that.size) {
                case "2x2":
                    $newElements = that.customize2x2(tpl(gamModel[0]));
                    break;
                case "4x2":
                    $newElements = that.customize4x2(tpl(gamModel[0]));
                    break;
                case "4x4":
                    $newElements = that.customize4x4(tpl(gamModel[0]));
                    break;
                default:
                    $newElements = $(tpl(gamModel[0]));
                }

                that.$el.
                    empty().
                    append($newElements);

                that.trigger('renderDone');

            },
            tplUrl
        );
        $(".progress").prev().addClass("hasProgressBar");                        
        $(".progress.hide").prev().removeClass("hasProgressBar");
        return this;
        //ARNxyzzy// console.log("[INFO] GamificationDataView.render DONE          ARNlogging");
    },

    customize2x2: function (htmlInput) {
        'use strict';
        var els         = $(htmlInput),
            badgeCount  = this.model.models[0].get('badges').length,
            that        = this;

        if (badgeCount > 0) {

            // Process each badge in the list
            $(".badges ul li", els).each(function (n) {

                // Hide progress bar when not progress type or already earned
                if ((that.model.models[0].get("badges")[n].type !== "progress") ||
                        (that.model.models[0].get("badges")[n].earned)) {
                    $(this).find(".progress").addClass("hide");
                    console.log('Should remove class');
                    $(this).find(".progress").prev().removeClass("hasProgressBar");
                    $(this).find(".bar").addClass("hide");

                // Show progress for those that are progress type
                } else if (that.model.models[0].get("badges")[n].type === "progress") {
                    $(this).find(".bar").
                        attr("style",
                            "width: " +
                            ((100 * that.model.models[0].get("badges")[n].progressNumerator) /
                                that.model.models[0].get("badges")[n].progressDenominator) +
                            "%");
                }

                // Hide date earned if not earned
                if (!that.model.models[0].get("badges")[n].earned) {
                    $(this).find(".badge-date-earned").addClass("hide");
                } else {
                    $.noop();
                    //feAssert// feAssert(typeof(that.model.models[0].get("badges")[n].dateEarned)==="string", "Expected dateEarned to be defined for badges["+n+"]");
                }
            });

            $(".badges ul li", els).slice(3).remove();  // remove all after 1st 3 in col
        }

        //ARNxyzzy// console.log("[INFO] GamificationDataView.customize2x2 "+$(".badges", els).html()+"        "+badgeCount+" ARNlogging");
        return els;
    },

    customize4x2: function (htmlInput) {
        'use strict';
        var els         = $(htmlInput),
            badgeCount  = this.model.models[0].get('badges').length,
            secondCol   = null,
            that        = this;

        if (badgeCount > 0) {

            // Process each badge in the list
            $(".badges ul li", els).each(function (n) {

                // Hide progress bar when not progress type or already earned
                if ((that.model.models[0].get("badges")[n].type !== "progress") ||
                        (that.model.models[0].get("badges")[n].earned)) {
                    $(this).find(".progress").addClass("hide");
                    $(this).find(".bar").addClass("hide");

                // Show progress for those that are progress type
                } else if (that.model.models[0].get("badges")[n].type === "progress") {
                    $(this).find(".bar").
                        attr("style",
                            "width: " +
                            ((100 * that.model.models[0].get("badges")[n].progressNumerator) /
                                that.model.models[0].get("badges")[n].progressDenominator) +
                            "%");
                }

                // Hide date earned if not earned
                if (!that.model.models[0].get("badges")[n].earned) {
                    $(this).find(".badge-date-earned").addClass("hide");
                } else {
                    $.noop();
                    //feAssert// feAssert(typeof(that.model.models[0].get("badges")[n].dateEarned)==="string", "Expected dateEarned to be defined for badges["+n+"]");
                }
            });

            //feAssert// feAssert(typeof(this.model.models[0].get("badges")[0].imgLarge)==="string", "Expected imgLarge to be defined for badges[0]");

            // First badge uses large image
            els.find(".badges ul:nth-child(1) li:first-child").addClass('featured')
                .find("img")
                .attr("src",
                    this.model.models[0].get("badges")[0].imgLarge);
        }

        // duplicate 1st col with data for 2nd col
        secondCol = $(".badges ul:nth-child(1)", els).clone();

        // Special handling with only 2 badges
        if (badgeCount === 2) {

            // One badge in each col
            $(".badges ul:nth-child(1) > li", els).slice(1).remove();       // remove all but 1st in 1st col
            $(".badges ul:nth-child(1)", els).after(secondCol);             // insert 2nd col
            $(".badges ul:nth-child(2) > li", els).slice(0, 1).remove();    // remove 1st item in 2nd col

            //feAssert// feAssert(typeof(this.model.models[0].get("badges")[1].imgLarge)==="string", "Expected imgLarge to be defined for badges[1]");

            // Second badge uses large image
            $(".badges ul:nth-child(2) li:first-child img", els).
                attr("src",
                    this.model.models[0].get("badges")[1].imgLarge);
        } else {

            // 1 and 3 in each col
            $(".badges ul:nth-child(1) > li", els).slice(1).remove();       // remove all but 1st in 1st col
            $(".badges ul:nth-child(1)", els).after(secondCol);             // insert 2nd col
            $(".badges ul:nth-child(2) > li", els).slice(0, 1).remove();    // remove 1st item in 2nd col
            $(".badges ul:nth-child(2) > li", els).slice(3).remove();       // remove all after 1st 3 remaining in 2nd col
        }

        ////ARNxyzzy// console.log("[INFO] GamificationDataView.customize4x2 "+els.find('.badges').html()+"        "+badgeCount+" ARNlogging");
        return els;
    },

    customize4x4: function (htmlInput) {
        'use strict';
        var els         = $(htmlInput),
            badgeCount  = this.model.models[0].get('badges').length,
            secondCol   = null,
            that        = this,
            i           = 0;

        // Badges use large images when 4 or less
        if (badgeCount < 5) {
            for (i = badgeCount; i > 1; i -= 1) {
                //feAssert// feAssert(typeof(this.model.models[0].get("badges")[i-1].imgLarge)==="string", "Expected imgLarge to be defined for badges["+(i-1)+"]");
                $(".badges ul:nth-child(1) li:nth-child(" + i + ") img", els).
                    attr("src",
                        this.model.models[0].get("badges")[i - 1].imgLarge);
            }
        }

        if (badgeCount > 0) {

            // Process each badge in the list
            $(".badges ul li", els).each(function (n) {

                // Hide progress bar when not progress type or already earned
                if ((that.model.models[0].get("badges")[n].type !== "progress") ||
                        (that.model.models[0].get("badges")[n].earned)) {
                    $(this).find(".progress").addClass("hide");
                    $(this).find(".bar").addClass("hide");

                // Show progress for those that are progress type
                } else if (that.model.models[0].get("badges")[n].type === "progress") {
                    $(this).find(".bar").
                        attr("style",
                            "width: " +
                            ((100 * that.model.models[0].get("badges")[n].progressNumerator) /
                                that.model.models[0].get("badges")[n].progressDenominator) +
                            "%");
                }

                // Hide date earned if not earned
                if (!that.model.models[0].get("badges")[n].earned) {
                    $(this).find(".badge-date-earned").addClass("hide");
                } else {
                    $.noop();
                    //feAssert// feAssert(typeof(that.model.models[0].get("badges")[n].dateEarned)==="string", "Expected dateEarned to be defined for badges["+n+"]");
                }
            });

            //feAssert// feAssert(typeof(this.model.models[0].get("badges")[0].imgLarge)==="string", "Expected imgLarge to be defined for badges[0]");

            // First badge uses large image
            els.find(".badges ul:nth-child(1) li:first-child").addClass('featured')
                .find("img")
                .attr("src",
                    this.model.models[0].get("badges")[0].imgLarge);
        }

        // Needs to be done after alterations above
        secondCol = $(".badges ul:nth-child(1)", els).clone();              // dupe 1st col w/ data for 2nd col

        // Special handling with 4 or less badges
        if ((badgeCount === 4) || (badgeCount === 3)) {
            $(".badges ul:nth-child(1) > li", els).slice(2).remove();       // remove all after 1st 2 in 1st col
            $(".badges ul:nth-child(1)", els).after(secondCol);             // insert 2nd col
            $(".badges ul:nth-child(2) > li", els).slice(0, 2).remove();    // remove 1st 2 in 2nd col
        } else if (badgeCount === 2) {
            $(".badges ul:nth-child(1) > li", els).slice(1).remove();       // remove all after 1st in 1st col
            $(".badges ul:nth-child(1)", els).after(secondCol);             // insert 2nd col
            $(".badges ul:nth-child(2) > li", els).slice(0, 1).remove();    // remove 1st in 2nd col
        } else if (badgeCount === 1) {
            $.noop();
            // Nothing to remove, no second col needed
        } else {
            $(".badges ul:nth-child(1) > li", els).slice(4).remove();       // remove all after 1st 4 in 1st col
            $(".badges ul:nth-child(1)", els).after(secondCol);             // insert 2nd col
            $(".badges ul:nth-child(2) > li", els).slice(0, 4).remove();    // remove 1st 4 in 2nd col
        }

        //ARNxyzzy// console.log("[INFO] GamificationDataView.customize4x4 "+$(".badges", els).html()+"        "+badgeCount+" ARNlogging");
        return els;
    }

});
