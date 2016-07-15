/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
G5,
ModuleView,
BudgetCollectionView,
BudgetTrackerModuleView:true
*/
BudgetTrackerModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){
        'use strict';

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}
        ],{silent:true});

    },

    events:{
        'click .reloadBtn':'doReload'
    },

    //override super-class render()
    // adding the budget collection after the module template loads
    // b/c the budgetCollectionView attaches to module template DOM el
    render:function(){
        'use strict';
        var that = this;

        this.getTemplateAnd(function(tpl){

            //when template manager has the template, render it to this element
            that.$el.append( tpl( _.extend({},that.model.toJSON(),{cid:that.cid}) ));

            //add the budget collection view
            that.budgColl = new BudgetCollectionView({el:that.$el.find('.budgetCollectionView')});

            // start the loading state and spinner
            that.dataLoad(true);

            that.budgColl.on('budgetAsOfTimestampLoaded',function(){
                // stop the loading state and spinner
                that.dataLoad(false);
                G5.util.hideSpin(this.$el.find('.module-liner'));


                // each budget list has a special CM key containing the full translated string for the "Remaining as of" text
                // the key ouput will have a {0} placeholder where the budgetAsOfTimestamp value is inserted
                // this allows the translations to have plain text and the budgetAsOfTimestamp in any order
                // we embed this CM output as a tplVariable in our budgetTrackerModule Handlebars template
                // we also have an budgetAsOfTimestamp subTpl embedded in our budgetTrackerModule Handlebars template
                // we pass the budgets.budgetAsOfTimestamp value from the JSON to the subTpl, then replace the {0} with the rendered output
                // the final string is assigned to budgets.budgetAsOfTimestampFormatted in the JSON to be inserted into the module via jQ
                if(that.tplVariables.budgetAsOfTimestamp) {
                    that.budgColl.budgetAsOfTimestampFormatted = G5.util.cmReplace({
                        cm: that.tplVariables.budgetAsOfTimestamp,
                        subs: [
                            that.subTpls.budgetAsOfTimestamp({budgetAsOfTimestamp: that.budgColl.budgetAsOfTimestamp})
                        ]
                    });
                }


                // insert the timestamp string
                that.$el.find('.budgetAsOfTimestamp').html(that.budgColl.budgetAsOfTimestampFormatted);
            },that);

            //in initial load, templates may miss out on filter event
            //so we do filter change work here just in case
            that.doFilterChangeWork();

            //hide body relative elements on goemetry change
            that.on('beforeGeometryChange',function(){
                // always hide
                that.$el.find('.progress .bar').qtip('hide');
            },this);

            that.on('geometryChanged',function(d){
                // only show if we have non-zero grid unit dims
                if(d.w*d.h > 0){
                    that.budgColl.adjustBudgetQtips();
                }
            },that);

        });

        return this;//chaining
    },

    doReload:function(){
        'use strict';
        if (!this.budgColl.isLoading){
            G5.util.showSpin(this.$el.find('.module-liner'), {cover:true});
            this.budgColl.loadBudgets();
        }
    }

});
