/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
CelebrationRecognitionPurlModel:true
*/

//CelebrationImageFillerModel
CelebrationImageFillerModel = Backbone.Model.extend({

    initialize:function(opts){

    },

    //fetch a model
    loadData:function(){
        var that = this,
            data = {};

        $.ajax({
            dataType:'g5json',
            type: "POST",
            url: G5.props.URL_JSON_CELEBRATION_IMAGE_FILLER_URL,
            data: data,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    placeholders = data.placeholderImgs;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                that.set(data);

                that.trigger('dataLoaded');

                console.log('[INFO] CelebrationImageFillerModel['+data.id+'] - LOADED');
            },
            error: function(jqXHR, textStatus){
                console.log( "[INFO] ThrowdownRankingsModel: loadData Request failed: " + textStatus );
            }
        });
    }
});