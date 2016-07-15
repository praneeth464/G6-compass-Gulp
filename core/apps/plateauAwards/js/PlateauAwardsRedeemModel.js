/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
PlateauAwardsRedeemModel:true
*/

//PlateauAwardsRedeemModel
PlateauAwardsRedeemModel = Backbone.Model.extend({

    initialize:function(opts){

    },

    //fetch a model
    loadData:function(){
        var that = this,
            data = {};

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: G5.props.URL_JSON_PLATEAU_AWARDS_REDEEM,
            data: data,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                that.set(data);

                that.trigger('dataLoaded');

                console.log('[INFO] CelebrationRecognitionPurlModel['+data.id+'] - LOADED');
            }
        });
    }
});
