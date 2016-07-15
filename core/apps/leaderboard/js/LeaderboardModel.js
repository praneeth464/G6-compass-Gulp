/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
LeaderboardModel:true
*/
LeaderboardModel = Backbone.Model.extend({
    defaults: {

    },

    initialize: function(){
        console.log("[INFO] LeaderboardModel: leaderboard model initialized", this, this.collection);

        this.set('setId', this.collection.setModel.get('id'));
    },

    loadData: function() {
        var thisModel = this,
            params = {
                id : this.get('id')
            };

        console.log('[INFO] LeaderboardModel: LoadData started with params: ', params);
        
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_LEADERBOARD_MODEL,
            data: params,
            success: function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                console.log('[INFO] LeaderboardModel - RETRIEVED leaderboard model data using params: ', params, data);
                thisModel.set(data.leaderboard);
                // flag board as loaded with timestamp (ms)
                thisModel.set({ 'loadedDetailTime': (new Date()).getTime() } , {silent:true});

                //notify listener
                thisModel.trigger('loadDataFinished');
            },
            error: function(jqXHR, textStatus){
                console.log( "[INFO] LeaderboardModel: loadData Request failed: " + textStatus );
            }
        });
    },

    isDetailLoaded: function() {
        return this.get('loadedDetailTime')?true:false;
    }

});
