/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
ThrowdownRankingsModel:true
*/
ThrowdownRankingsModel = Backbone.Model.extend({
    initialize: function(){
        this.set('setId', this.collection.setModel.get('id'));
    },
    loadData: function(opts) {
        var thisModel = this,
            url,
            params = {
                id : this.get('id')
            };

            if (this.get('currentPage')){
                params.page = this.get('currentPage');
            }
            if (opts && opts.type == 'getLeaders'){
                url = G5.props.URL_JSON_THROWDOWN_LEADERBOARD_MODEL + G5.throwdown.promoId;
            } else {
                url = G5.props.URL_JSON_THROWDOWN_LEADERBOARD_MODEL + G5.throwdown.promoId;
            }

        console.log('[INFO] ThrowdownRankingsModel: LoadData started with params: ', params);

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: url,
            data: params,
            success: function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    currentPage;

                if (opts && opts.type) {
                    $.each(data.nodeTypeSets, function(){
                        if(this.rankings.leaders){
                            thisModel.set('leaders', this.rankings.leaders);
                        }

                        if(thisModel.get('currentPage')){
                            currentPage = thisModel.get('currentPage');
                        }
                    });

                    thisModel.set('currentPage', currentPage);

                    //notify listener
                    thisModel.trigger('loadDataFinished');
                } else {
                    console.log('[INFO] ThrowdownRankingsModel - RETRIEVED rankings model data using params: ', params, data);
                    thisModel.set(data.ranking);

                    // flag board as loaded with timestamp (ms)
                    thisModel.set({ 'loadedDetailTime': (new Date()).getTime() } , {silent:true});

                    //notify listener
                    thisModel.trigger('loadDataFinished');
                }
            },
            error: function(jqXHR, textStatus){
                console.log( "[INFO] ThrowdownRankingsModel: loadData Request failed: " + textStatus );
            }
        });
    },
    isDetailLoaded: function() {
        return this.get('loadedDetailTime') ? true:false;
    }
});

Handlebars.registerHelper('comma', function(commaFormat) {
      return commaFormat.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
});
