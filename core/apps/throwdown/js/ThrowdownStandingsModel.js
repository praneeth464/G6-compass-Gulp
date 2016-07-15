//ForumDiscussionModel -- collection of recognitions
/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
ThrowdownStandingsModel,
Backbone,
console,
ThrowdownStandingsView,
G5,
ThrowdownStandingsModel:true
*/
ThrowdownStandingsModel = Backbone.Model.extend({
    initialize: function(opts) {
        var self = this;

        self.jsonUrl = opts.jsonUrl;

        if (opts && opts.json) {
            self.set(opts.standingsJson);
        } else if (opts && opts.jsonUrl) {
            self.loadStandingsData(self.jsonUrl);
        }
    },
    loadStandingsData : function(opts) {
        var self = this,
            data = {
                currentPage: this.get('currentPage'),
                sortedOn: this.get('sortedOn'),
                sortedBy: this.get('sortedBy')
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
                        standingsJson;

                    standingsJson = data;

                    self.set(standingsJson);

                    //notify listener
                    self.trigger('loadStandingsDataFinished', standingsJson);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] ThrowdownStandingsModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    update: function(opts){
         if(opts.type === 'getStandings'){
            this.set('currentPage', opts.data.pageNumber);
         }
         if(opts.type === 'tabular'){
            this.set('sortedOn', opts.data.sortedOn);
            this.set('sortedBy', opts.data.sortedBy);
            this.set('currentPage', opts.data.pageNumber);
         }
         this.loadStandingsData();
    }
});