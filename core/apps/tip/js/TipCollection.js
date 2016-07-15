/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
TipModel,
TipCollection:true
*/
TipCollection = Backbone.Collection.extend({

    model: TipModel,

    initialize:function() {
        console.log("[INFO] : Tip Module Collection initialized", this);

    },

    loadData:function() { 

        var thisCollection = this,
            params = {};

        console.log('[INFO] TipCollection: LoadData started');

        if (G5.props.preLoadedTipsArray){
            console.log('[INFO] TipCollection: preLoadedTips found, no ajax call required');

            this.add(G5.props.preLoadedTipsArray);

            thisCollection.trigger('preLoadDataFinished');

        }else{
            
            console.log('[INFO] TipCollection: preLoadedTips not found, ajax call required');

            var dataReturned = $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_TIPS, 
            data: params,
            success: function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;
                console.log("[INFO] TipCollection: LoadData ajax call successfully returned this JSON object: ", data);

                var tips = data.tipCollections;

                thisCollection.add(tips);

                //notify listener
                thisCollection.trigger('loadDataFinished');
            }
        });

            dataReturned.fail(function(jqXHR, textStatus) {
                console.log( "[INFO] TipCollection: LoadData Request failed: " + textStatus );
            });
        }        

    },

    getRandomTips: function(tipAmount) {
        var max = this.length,
            tipArr = [],
            i;

        if (tipAmount > max){
            tipAmount = max; //don't show the same tip over and over
        }

        for (i=0; i<tipAmount; i++){
            var chosenTipIndex = Math.floor((Math.random()*max-1)+1); //choose a radom tip model index
            tipArr.push(this.at(chosenTipIndex)); //add that tip model to the array 
            this.models.splice(chosenTipIndex, 1); //remove that tip from the list of models to pull from 
            max -=1; //decrease max, so we don't randomally select a no longer existing index
        }

        console.log("[INFO] TipCollection: getRandomTips chose these tips: ", tipArr);

        return tipArr;
    },

    getSpecificTip: function(tipID) {
        var theTip = this.where({id:tipID}); //tip IDS in the JSON start at 1001

        console.log("[INFO] TipCollection: getSpecificTip returned this tip: ", theTip);

        return theTip;
    }

});
