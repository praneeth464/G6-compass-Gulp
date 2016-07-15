/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
GamificationDataView,
ModuleView,
GamificationModuleView:true
*/

/**
    Module for Gamification application.
    <li>ModuleContainerView: found CUSTOM module view </li>
    @class
    @extends ModuleView
*/
GamificationModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        //ARNxyzzy//// console.log("[INFO] GamificationModuleView.initialize          ARNlogging");
        //ARNxyzzy////debugger;

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon-only - smallest
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // half-size big
            {w:4,h:4}  // biggest
        ],{silent:true});

        this.on(
            'templateLoaded',
            function () {
                var that = this;
                //ARNxyzzy// console.log("[INFO] GamificationModuleView templateLoaded                 ...creating GamificationDataView ARNlogging");

                //add the gamification model view
                that.gamificationDataView = new GamificationDataView({
                    el:     that.$el,       //sharing the same element
                    size:   that.size
                });

                // start the loading state and spinner
                that.dataLoad(true);

                // do something after the model view is done rendering
                that.gamificationDataView.on(
                    'renderDone',
                    function () {
                        // stop the loading state and spinner
                        that.dataLoad(false);
                                //ARNxyzzy// console.log("[INFO] GamificationModuleView renderDone      (doing nothing at this point) ARNlogging");
                                //ARNxyzzy////debugger;
                    },
                    this
                );
            },
            this
        );

        this.size = this.model.get("filters")[this.model.collection.getFilter()].size;

        //ARNxyzzy// console.log("[INFO] GamificationModuleView.initialize DONE FOR TILE            currently "+this.size+" ARNlogging");
    },

    changeDimensionCssClass: function (dStr) {
        'use strict';
        this.constructor.__super__.changeDimensionCssClass.apply(this, arguments);

        if (dStr !== this.size) {
            this.size = dStr;
            if (this.gamificationDataView) {
                //ARNxyzzy//// console.log("[INFO] GamificationModuleView.changeDimensionCssClass new size "+dStr+"            !!!!!!!!!!!!!!!!!!!!!!!!!ARNlogging");
                this.gamificationDataView.trigger('sizeChange', dStr);
            }
        }
        //ARNxyzzy//// console.log("[INFO] GamificationModuleView.changeDimensionCssClass  "+dStr+"    happens more often than needed!!!!!!!!!!!!!!!!!!!        ARNlogging");
    },

    doFilterChangeWork: function () {
        'use strict';
        //call the superclass function (inheritance, js style)
        this.constructor.__super__.doFilterChangeWork.apply(this, arguments);

        //ARNxyzzy// console.log("[INFO] GamificationModuleView.doFilterChangeWork (no override at this point)  "+this.size+" ARNlogging");
    }
});
