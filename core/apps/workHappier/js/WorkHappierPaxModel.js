/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
WorkHappierPaxModel:true
*/

WorkHappierPaxModel = Backbone.Model.extend({

    initialize:function(opts){

    },

    //fetch a model
    loadData:function(opts){
        var that = this,
            data = {
                value: opts._value
            };

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: G5.props.URL_JSON_WORK_HAPPIER_PAST_RESULTS,
            data: data,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                that.set(data);

                that.trigger('dataLoaded');

                console.log('[INFO] WorkHappierPaxModel['+data.id+'] - LOADED');
            }
        });
    }
});
