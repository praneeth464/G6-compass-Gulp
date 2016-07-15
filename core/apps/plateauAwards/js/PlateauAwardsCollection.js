/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
PlateauAwardsCollection:true
*/

//PlateauAwardsCollection -- allows adding and caching of promo-levels-prducts
PlateauAwardsCollection = Backbone.Collection.extend({

    initialize:function(){
        this._activePromoId = false;
        this._activeLevelId = false;
    },

    setPromoLevel:function(promoId,levelId){
        this.loadProdsForPromoLevel(promoId,levelId);
    },

    getActivePromo:function(){
        var actPrm = this.get(this._activePromoId);
        return actPrm||null;
    },

    getActiveLevel:function(){
        var that = this,
            actLev;
        actLev =  _.find(this.getActivePromo().get('levels'), function(lev){return lev.id==that._activeLevelId;});

        // no find active level? default to first level
        actLev = actLev||this.getFirstLevel();

        return actLev;
    },

    getFirstLevel:function(){
        var ap = this.getActivePromo();
        return ap && ap.get('levels') ? this.getActivePromo().get('levels')[0] : false;
    },

    getProductFromActiveLevel:function(id){
        var lev = this.getActiveLevel();
        return _.find(lev.products,function(p){return p.id==id;});
    },
    
    loadProdsForPromoLevel:function(promoId,levId){
        var that = this,
            hasCache = this.get(promoId) && this.get(promoId).get('levels');

        //trigger the start event
        this.trigger('prodsForPromoLevelStart');

        //no cache? load it!
        if(!hasCache){ 
            this.loadData(promoId, levId);
        }

        //cached, make sure levelId is set, and trigger event
        else{
            this._activePromoId = promoId;
            this._activeLevelId = levId|| (this.getFirstLevel() ? this.getFirstLevel().id : false);
            console.log('[INFO] PlateauAwardsCollection - CACHED products for promo ['+promoId+']');
            this.trigger('prodsForPromoLevelReady');
        }
    },

    //load and process JSON data from server
    loadData:function(promoId,levId){
        var that = this,
            params = {};

        if(promoId) params.promotionId = promoId;
        //commented out, lets grab all levels at once for a promo
        //if(levId) params.levelId = levId; 

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: G5.props.URL_JSON_PLATEAU_AWARDS,
            data: params, 
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                _.each(data.promotions,function(p){
                    that.mergePromo(p);
                });

                //now we can guarantee these vals have changed
                that._activePromoId = promoId;
                that._activeLevelId = levId||that.getFirstLevel().id;

                console.log('[INFO] PlateauAwardsCollection - RETRIEVED products for promo ['+promoId+']');

                //notify listener
                that.trigger('prodsForPromoLevelReady');
            }
        });
    },

    //merge in new levels for a promo
    mergePromo:function(promo){

        //exists?       
        if(!this.get(promo.id)){
            this.add(promo);
        }else if( !this.get(promo.id).get('levels') ){//exists, but does it have its levels?
            this.get(promo.id).set('levels',promo.levels);
        }
    }

});