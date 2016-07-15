/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
Backbone,
LeaderboardCollection,
LeaderboardSetModel:true
*/
LeaderboardSetModel = Backbone.Model.extend({
    defaults: {

    },

    initialize: function(opts){
        console.log("[INFO] LeaderboardSetModel: Leaderboard set initialized", this, opts);
        var thisModel = this,
            leaderboards = this.get('leaderboards');

        this.id = this.get('nameId');
        this.leaderboards = new LeaderboardCollection();

        this.leaderboards.setModel = this;

        _.each(leaderboards, function(board) {
            board.setId = thisModel.id;
        });

        // using the add method so I can trigger the add event inside the LeaderboardCollection
        this.leaderboards.add(leaderboards);
    }
    
});