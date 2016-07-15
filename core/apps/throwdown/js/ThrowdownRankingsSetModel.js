/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
Backbone,
ThrowdownRankingsCollection,
ThrowdownRankingsSetModel:true
*/
ThrowdownRankingsSetModel = Backbone.Model.extend({
    initialize: function(opts){
        console.log("[INFO] RankingsSetModel: Rankings set initialized", this, opts);
        var thisModel = this,
            rankings = this.get('rankings');

        this.id = this.get('nameId');
        this.rankings = new ThrowdownRankingsCollection();
        this.rankings.setModel = this;

        _.each(rankings, function(board) {
            board.setId = thisModel.id;
        });

        // using the add method so I can trigger the add event inside the ThrowdownRankingsCollection
        this.rankings.add(rankings);
    }
});