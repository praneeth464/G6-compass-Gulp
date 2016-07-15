/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
Backbone,
LeaderboardModel,
LeaderboardCollection:true
*/
LeaderboardCollection = Backbone.Collection.extend({

    model: LeaderboardModel,

    initialize:function(opts) {
        console.log("[INFO] LeaderboardCollection: leaderboard collection initialized", this);

        this._chosenBoard = opts && opts._chosenBoard ? opts._chosenBoard : this.at(0);

        this.on("add", function(opts) {
            this._chosenBoard = opts && opts.chosen ? opts.chosen : this.at(0);
        });
    },

    getChosenBoard:function() {
        return this._chosenBoard;
    },

    loadData:function(id) {

    },

    setChosenBoard:function(boardModel) {
        this._chosenBoard = boardModel;
    },

    setChosenBoardById:function(boardId) {
        this._chosenBoard = this.get(boardId);
    }

});
