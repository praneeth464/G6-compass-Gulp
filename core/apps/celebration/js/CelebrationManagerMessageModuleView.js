/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
CelebrationAnniversaryFactsModuleView:true
*/
CelebrationManagerMessageModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        ModuleView.prototype.initialize.apply(this, arguments); // this is how we call the super-class initialize function (inherit its magic)
        this.events = _.extend({}, ModuleView.prototype.events, this.events); // inherit events from the superclass ModuleView

        this.model.set(
            'allowedDimensions', [
                {w: 2, h:2 },
                { w:4, h:2 }
            ],
            { silent: true }
        );

        this.on('templateLoaded', function(){
            that.renderCycle();

            _.delay(G5.util.textShrink, 100, this.$el.find('.comment'), {minFontSize:20});
            G5.util.textShrink( this.$el.find('.comment'), {minFontSize:20});
        });

    },
    events: {
        'click .cycleDot': 'resizeText'
    },
    resizeText: function(){

        //Have to add separate textShrink for the items in the carousel to resize on click since they are hidden on page load
        _.delay(G5.util.textShrink, 100, this.$el.find('.comment'), {minFontSize:20});
        G5.util.textShrink( this.$el.find('.comment'), {minFontSize:20});
    },

    renderCycle: function () {
        this.startCycle({
            fit: 0,
            containerResize: 0,
            slideResize: 1,
            timeout: 0
        }, "dots"); //start the carousel


        var $theElements = this.$el.find(".cycle"), //find all modules with a carousel
            $legendContainer = $theElements.closest(".wide-view"),
            $legend = $legendContainer.find("#cycleLegend");

            $legend.width($legend.children().length * 32); //adjust width (each dot is 32px wide)

            //add numbers to dots
            $legend.children().each(function(i){
                $(this).html(i+1); //start count at 1 not 0
            });

            $legend.css("left", "18px");

    }
});