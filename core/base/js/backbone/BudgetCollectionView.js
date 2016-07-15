/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
Backbone,
BudgetCollectionView:true
*/

//BUDGET COLLECTION VIEW
//re-usable view for a collection of budgets (budget items - in g5 these are 1:1 with promotions)
BudgetCollectionView = Backbone.View.extend({

    //override super-class initialize function
    initialize: function(opts) {

        //set the model to be a collection
        //since this is a basic data load, we'll just use a generic Collection
        // if we start updating specific budgets etc. we will want to
        // break this out into its own Collection/Model
        this.model = new Backbone.Collection();

        //when this model gets reset, then render this
        this.model.on('reset',function(){
                this.render();
        },this);

        //load budgets (data-* attrs are added to request params)
        this.loadBudgets(this.$el.data());

        this.isLoading = false; //don't keep reloading if user clicks refresh over and over

    }, // initialize

    render: function() {
        var that = this,
          tplName = 'budgetItem',
          tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/';

        //empty the table body
        this.$el.empty();

        //for each budget item
        _.each(this.model.models,function(bi, index){
            TemplateManager.get(tplName,function(tpl){
                var $item,
                    tplData = bi.toJSON(),
                    $bar, 
                    calcBudgRem;
                    
                //add some stuff to tplData
                tplData = _.extend({},tplData,{
                    percentLeft: Math.floor(( (tplData.total-tplData.used) /tplData.total)*100)
                });

                // render
                tplData.isOdd = index%2 === 0; // for syling off/on 'stripes'
                $item = $(tpl(tplData));
                that.$el.append( $item );

                // prepare for tip
                calcBudgRem = tplData.total - tplData.used;
                $bar = $item.find('.progress .bar');

                //animate the progress and attach qtip after
                $bar.animate({'width':tplData.percentLeft+'%'}, function(){
                    // attach qtip only after bar has animated so we get proper position
                    that.attachQtipToProgressBar($bar, $item, $.format.number(calcBudgRem));

                    if ((index+1) >= that.model.models.length){
                        that.isLoading = false; //done with all the animations etc
                    }
                });// /.animate()

            },tplUrl); // TemplateManager

        }); // each

    }, // render

    attachQtipToProgressBar: function($bar, $item, cont) {
        var that = this;

        if($bar.data('qtip')) {return;}

        $bar.qtip({
            content: cont,
            position: {
                my:'bottom center',
                at:'right top',
                container: that.$el,
                viewport: that.$el
            },
            show:{event:false,effect:false,ready:true},
            hide:{event:false,effect:false},
            style:{
                tip:{height: 4 },
                classes:'ui-tooltip-shadow ui-tooltip-dark remBudgTip'
            }
        });
    },

    // simple function to adjust qtips (useful when the container changes size)
    adjustBudgetQtips: function() {
        var $bars = this.$el.find('.progress .bar');

        $bars.each(function(){
            var $b = $(this);
            if($b.data('qtip')) {
                $b.qtip('reposition').qtip('show'); 
            }
        });

        //this.$el.find('.progress .bar').qtip('reposition').qtip('show');  
    },

    //shameful, model method inside a view, lazy, lazy
    loadBudgets:function(props){
        var that = this;
        props = _.extend({},this.$el.data(),props);

        if (!that.isLoading){
            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_BUDGETS,
                data: props||{},
                beforeSend: function() {
                    that.isLoading = true;
                },
                success: function(servResp){
                    that.model.reset(servResp.data.budgets);
                    that.budgetAsOfTimestamp = servResp.data.budgetAsOfTimestamp;
                    that.trigger('budgetAsOfTimestampLoaded');
                } // success
            }); // ajax
        }
    } // loadBudgets

});
