/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
RulesPromotionCollectionView,
RulesPageView:true
*/
RulesPageView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'rules';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //retrieve the leaderboard data
        //add the leaderboard model view
        this.rulesPromotionCollectionView = new RulesPromotionCollectionView({
            el:this.$el,
            promoId: opts.promoId ? opts.promoId : null
        });
    }

});
