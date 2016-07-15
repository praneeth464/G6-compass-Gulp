/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
ModuleView,
G5,
AllReportsModuleView:true
*/
AllReportsModuleView = ModuleView.extend({

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
        "click .allReportsModule" : "clickThru"
    },

    // populate module & draw charts
    render:function(){
        "use strict";
        var that = this;

        this.getTemplateAnd(function(tpl){
            //when template manager has the template, render it to this element
            that.$el.append( tpl( _.extend({},that.model.toJSON(),{cid:that.cid}) ));       

            // that.clickThru();

            //in initial load, templates may miss out on filter event
            //so we do filter change work here just in case
            that.doFilterChangeWork();
        });

        return this;//chaining
    },

    clickThru: function(){
        // this.$el.find('.allReportsModule').click(function(){        
            window.location.href = G5.props.URL_REPORTS_ALL;
        // });
    }

});
