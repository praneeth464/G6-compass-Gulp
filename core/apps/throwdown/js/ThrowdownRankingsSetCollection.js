/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
ThrowdownRankingsSetModel,
ThrowdownRankingsSetCollection:true
*/
ThrowdownRankingsSetCollection = Backbone.Collection.extend({
    model: ThrowdownRankingsSetModel,

    initialize:function(opts) {
        this.rankingsUrl = ""; // will hold URL to the Rankings page for the module's .visitAppBtn (based on promotion selected)
        this.visible = true;  // corresponds to the module's filters.throwdown.visible value for hiding or showing the module
        this._chosenSet = opts && opts._chosenSet ? opts._chosenSet : null;

        console.log("[INFO] ThrowdownRankingsSetCollection: Rankings set collection initialized", this, opts);
    },
    getBoardById:function(boardId) {
        var thisCollection = this,
            boardToReturn;

        boardId = parseInt(boardId, 10);

        _.each( thisCollection.models, function(set) {
            if( set.rankings.where({ id : boardId }).length > 0 ) {
                boardToReturn = set.rankings.where({ id : boardId })[0];
            }
        });

        return boardToReturn;
    },
    getChosenSet:function() {
        return this._chosenSet;
    },
    getSetById:function(id) {
        return this.where({ nameId : id })[0];
    },
    getSetByBoardId:function(boardId) {
        var thisCollection = this,
            setToReturn;

        boardId = parseInt(boardId, 10);

        _.each( thisCollection.models, function(set) {
            if( set.rankings.where({ id : boardId }).length > 0 ) {
                setToReturn = set;
            }
        });

        return setToReturn;
    },
    getSetIdByBoardId:function(boardId) {
        return this.getSetByBoardId(boardId).get('id');
    },
    loadData:function(nameId, boardId) {
        var thisCollection = this,
            params = {};

        if(nameId) params.nameId = nameId;
        if(boardId) params.boardId = boardId;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_THROWDOWN_LEADERBOARD_MODEL + G5.throwdown.promoId,
            data: params,
            success: function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                // get the URL that will be assigned to the href attribute in the module's .visitAppBtn
                thisCollection.rankingsUrl = data.rankingsUrl;

                // should module be hidden or shown?
                thisCollection.visible = data.visible;

                // only process data if we know that it is meant to be displayed at some point
                if (thisCollection.visible) {
                    // loop through the retrieved data and merge with existing data, if any
                    _.each(data.nodeTypeSets,function(s){
                        s.id = !s.id ? s.nameId : s.id;
                        thisCollection.mergeBoardSets(s, params.nameId);
                    });

                    // now we can guarantee this is present
                    thisCollection._chosenSet = thisCollection.get(nameId) || thisCollection.at(0);
                    thisCollection._chosenSet.rankings.setChosenBoardById( params.boardId || thisCollection._chosenSet.rankings.at(0) );

                    console.log('[INFO] ThrowdownRankingsSetCollection - RETRIEVED rankings set data using params { nameId : '+nameId+', boardId : '+boardId+' }');
                }

                //notify listener
                thisCollection.trigger('loadDataFinished');
            },
            error: function(jqXHR, textStatus){
                console.log( "[INFO] ThrowdownRankingsSetCollection: loadData Request failed: " + textStatus );
            }
        });
    },
    // merge in rankings when loaded incrementally
    // the "explicitload" attribute is useful when the data coming back isn't supposed to contain rankings
    mergeBoardSets:function(set, explicitload) {
        var modelWithNameId = this.where({nameId : set.nameId})[0];

        console.log('[INFO] ThrowdownRankingsSetCollection: mergeBoardSets with explicitly loaded set', explicitload);

        // check to see if the nameId of the selected set doesn't exist in the model
        // if it doesn't exist, add it to the model
        if( this.where({nameId : set.nameId}).length <= 0 ){
            console.log('[INFO] ThrowdownRankingsSetCollection: mergeBoardSets: no model exists');
            this.add(set);
            modelWithNameId = this.where({nameId : set.nameId})[0];
        }

        // does the set being passed have rankings while the model with this ID does not?
        // if so, add the rankings to the model
        if( set.rankings.length && !modelWithNameId.rankings.length ) {
            console.log('[INFO] ThrowdownRankingsSetCollection: mergeBoardSets: model exists & is empty, set has rankings', modelWithNameId, set);
            modelWithNameId.rankings.add(set.rankings);
            modelWithNameId.set('dataloaded', true);
        }
        // do neither the set being passed nor the model with this ID have rankings?
        // also, does the ID of the model match the explicitly loaded set? We don't want to mark any sets empty if we've never explicitly checked them for results
        else if( !set.rankings.length && !modelWithNameId.rankings.length && modelWithNameId.get('id') == explicitload ) {
            console.log('[INFO] ThrowdownRankingsSetCollection: mergeBoardSets: model exists & is empty, set is empty', modelWithNameId, set);
            modelWithNameId.set('dataloaded', true);
        }
    },
    setChosenSet:function(setModel) {
        this._chosenSet = setModel;
    },
    setChosenSetById:function(setId) {
        this._chosenSet = this.get(setId);
    }
});