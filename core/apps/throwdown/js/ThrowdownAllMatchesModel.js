//ForumDiscussionModel -- collection of recognitions
/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
Backbone,
console,
ThrowdownAllMatchesModel:true
*/
ThrowdownAllMatchesModel = Backbone.Model.extend({
    initialize: function(opts) {
        var self = this;
            self.jsonUrl = opts.jsonUrl;

        if (opts && opts.json) {
            self.set(opts.allMatchesJson);
        } else if (opts && opts.jsonUrl) {
            self.loadRoundData(self.jsonUrl);
        }else {
			self.jsonUrl =  G5.props.URL_THROWDOWN_ALL_MATCHES + G5.throwdown.promoId;
			self.loadRoundData(self.jsonUrl);
		}
    },
    loadRoundData : function(opts) {
       var self = this,
            data = {
                currentRound: this.get('currentRound'),
                currentPage: this.get('currentPage')
            };

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: self.jsonUrl,
                data: data,
                cache: false,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data,
                        allMatchesJson;

                    console.log("[INFO] AllMatchesModel: loadRoundData ajax call successfully returned this JSON object: ", data);
                    allMatchesJson = data;

                    self.set(allMatchesJson);

					self.set("jsonUrl", self.jsonUrl);

					//notify listener
                    self.trigger('loadAllMatchesDataFinished', allMatchesJson);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] ThrowdownAllMatchesModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    update: function(opts) {
        var curRound = this.get('currentRound'),
            totalRounds = this.get('totalRounds');

        if(opts.type === 'paginateMatches'){
            this.set('currentPage', opts.pageNumber);
        }
        else if(opts.type === 'prevRound' && curRound > 1){
            curRound = curRound -1;
            this.set('currentPage', 1);
        }else if(opts.type === 'nextRound' && curRound < totalRounds){
            curRound = curRound +1;
            this.set('currentPage', 1);
        }
        this.set('currentRound', curRound);

        this.loadRoundData();
    }
});
