/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
LeaderboardSetModel,
LeaderboardSetCollection:true
*/
LeaderboardSetCollection = Backbone.Collection.extend({
    
    model: LeaderboardSetModel,

    initialize:function(opts) {
        console.log("[INFO] LeaderboardSetCollection: Leaderboard set collection initialized", this, opts);

        this._chosenSet = opts && opts._chosenSet ? opts._chosenSet : null;
    },

    getBoardById:function(boardId) {
        var thisCollection = this,
            boardToReturn;
        
        boardId = parseInt(boardId, 10);

        _.each( thisCollection.models, function(set) {
            if( set.leaderboards.where({ id : boardId }).length > 0 ) {
                boardToReturn = set.leaderboards.where({ id : boardId })[0];
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
            if( set.leaderboards.where({ id : boardId }).length > 0 ) {
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

        console.log('[INFO] LeaderboardSetCollection: LoadData started with nameId', nameId);

        if(nameId) params.nameId = nameId;
        if(boardId) params.boardId = boardId;

        // ***** temporary code for local loading of different result sets
        /* switch(nameId) {
            case "active":
                G5.props.URL_JSON_LEADERBOARD_SETS = G5.props.URL_ROOT+'ajax/leaderboardSetCollection_active.json'; // active leaderboards
                break;
            case "pending":
                G5.props.URL_JSON_LEADERBOARD_SETS = G5.props.URL_ROOT+'ajax/leaderboardSetCollection_pending.json'; // pending leaderboards
                break;
            case "archived":
                G5.props.URL_JSON_LEADERBOARD_SETS = G5.props.URL_ROOT+'ajax/leaderboardSetCollection_archived.json'; // archived leaderboards
                break;
            default:
                G5.props.URL_JSON_LEADERBOARD_SETS = G5.props.URL_ROOT+'ajax/leaderboardSetCollection.json'; // all leaderboards
                break;
        } */
        // ***** end temporary code
        
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_LEADERBOARD_SETS,
            data: params,
            success: function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                // loop through the retrieved data and merge with existing data, if any
                _.each(data.leaderboardSets,function(s){
                    s.id = !s.id ? s.nameId : s.id;
                    thisCollection.mergeBoardSets(s, params.nameId);
                });

                // now we can guarantee this is present
                thisCollection._chosenSet = thisCollection.get(nameId) || thisCollection.at(0);
                thisCollection._chosenSet.leaderboards.setChosenBoardById( params.boardId || thisCollection._chosenSet.leaderboards.at(0) );

                console.log('[INFO] LeaderboardSetCollection - RETRIEVED leaderboard set data using params { nameId : '+nameId+', boardId : '+boardId+' }');
                // console.log('[INFO] LeaderboardSetCollection - SET _chosenSet set to ['+thisCollection._chosenSet.get('id')+']');
                // console.log('[INFO] LeaderboardSetCollection - SET _chosenBoard leaderboard to ['+thisCollection._chosenSet.leaderboards._chosenBoard.get('id')+']');

                //notify listener
                thisCollection.trigger('loadDataFinished');
            },
            error: function(jqXHR, textStatus){
                console.log( "[INFO] LeaderboardSetCollection: loadData Request failed: " + textStatus );
            }
        });
    },

    // merge in leaderboards when loaded incrementally
    // the "explicitload" attribute is useful when the data coming back isn't supposed to contain leaderboards
    mergeBoardSets:function(set, explicitload) {
        var modelWithNameId = this.where({nameId : set.nameId})[0];

        console.log('[INFO] LeaderboardSetCollection: mergeBoardSets with explicitly loaded set', explicitload);
        // console.log(modelWithNameId);
        // console.log(modelWithNameId ? modelWithNameId.leaderboards.length : null);

        // check to see if the nameId of the selected set doesn't exist in the model
        // if it doesn't exist, add it to the model
        if( this.where({nameId : set.nameId}).length <= 0 ){
            console.log('[INFO] LeaderboardSetCollection: mergeBoardSets: no model exists');
            this.add(set);
            modelWithNameId = this.where({nameId : set.nameId})[0];
        }

        // does the set being passed have leaderboards while the model with this ID does not?
        // if so, add the leaderboards to the model
        if( set.leaderboards.length && !modelWithNameId.leaderboards.length ) {
            console.log('[INFO] LeaderboardSetCollection: mergeBoardSets: model exists & is empty, set has leaderboards', modelWithNameId, set);
            modelWithNameId.leaderboards.add(set.leaderboards);
            modelWithNameId.set('dataloaded', true);
        }
        // do neither the set being passed nor the model with this ID have leaderboards?
        // also, does the ID of the model match the explicitly loaded set? We don't want to mark any sets empty if we've never explicitly checked them for results
        else if( !set.leaderboards.length && !modelWithNameId.leaderboards.length && modelWithNameId.get('id') == explicitload ) {
            console.log('[INFO] LeaderboardSetCollection: mergeBoardSets: model exists & is empty, set is empty', modelWithNameId, set);
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