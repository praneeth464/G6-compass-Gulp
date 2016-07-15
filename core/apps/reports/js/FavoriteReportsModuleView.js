/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
ModuleView,
ReportsFavoritesPopoverView,
FavoriteReportsModuleView:true
*/
FavoriteReportsModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(){
        "use strict";

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon-only - smallest
            {w:2,h:1}, // icon+title
            {w:2,h:2}  // 2x2 square
        ],{silent:true});

    },

    events:{
    }, // events

    // populate module & draw charts
    render:function(){
        "use strict";
        var that = this;

        this.getTemplateAnd(function(tpl){
            //when template manager has the template, render it to this element
            that.$el.append( tpl( _.extend({},that.model.toJSON(),{cid:that.cid}) ));       

            that.clickThru();

            //in initial load, templates may miss out on filter event
            //so we do filter change work here just in case
            that.doFilterChangeWork();
        });

        return this;//chaining
    },

    clickThru: function(){
        "use strict";

        this.$el.find('.favoriteReports').each(function(){
            new ReportsFavoritesPopoverView({
                position:{
                    my: 'right center',
                    at: 'left center',
                    container: $('body'),
                    viewport: $('body'),
                    adjust: {
                        x: 24,
                        method:'shift none'
                    }
                },
                trigger: this,
                tip: {
                    // corner: true,
                    width: 20,
                    height: 10
                },
                showViewMyReportsLink: false,
                triggeredFromModuleView: true
            }); // ReportsFavoritesPopoverView
        }); // click
    }

});
