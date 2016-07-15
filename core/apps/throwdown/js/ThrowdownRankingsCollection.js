/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
Backbone,
RankingsModel,
ThrowdownRankingsCollection:true
*/
ThrowdownRankingsCollection = Backbone.Collection.extend({
    model: ThrowdownRankingsModel,

    initialize:function(opts) {
        this._chosenBoard = opts && opts._chosenBoard ? opts._chosenBoard : this.at(0);

        this.on("add", function(opts) {
            this._chosenBoard = opts && opts.chosen ? opts.chosen : this.at(0);
        });
    },
    getChosenBoard:function() {
        return this._chosenBoard;
    },
    setChosenBoard:function(boardModel) {
        this._chosenBoard = boardModel;
    },
    setChosenBoardById:function(boardId) {
        this._chosenBoard = this.get(boardId);
    }
});
