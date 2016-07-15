/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
PublicRecognitionSetModel,
PublicRecognitionSetCollection:true
*/
//Collection of public recognition sets (used for the tab grouping of recognitions)
PublicRecognitionSetCollection = Backbone.Collection.extend({

    model: PublicRecognitionSetModel,

    initialize:function(){

    },


    //load and process JSON data from server
    // - if a nameId is given, then its sent with the request
    // - if fromIndex is given, it will be passed with request
    loadData:function(recSetNameId, fromIndex, isMore, participantId, addlParams){
        var that = this,
            params = {},
            recogSet = this.getRecognitionSet(recSetNameId),
            defSet;

        //is cached?
        //check to see if we have a set for this
        if(recSetNameId){
            //if length not 0 and not loading more
            if(recogSet && recogSet.recognitions.length !== 0 && !fromIndex){
                //we have data already, no need to load
                this.trigger('dataLoaded',recSetNameId,fromIndex,isMore);
                return;
            }
            //if loading more, and all loaded
            if(fromIndex && recogSet.recognitions.length >= recogSet.get('totalCount')){
                //we have all data already, no need to load
                this.trigger('dataLoaded',recSetNameId,fromIndex,isMore);
                return;
            }

            //ELSE continue!
        }

        //set parameters
        if(recSetNameId){params.recognitionSetNameId = recSetNameId;}
        //if(fromIndex){params['fromIndex'] = fromIndex;} // server wants page number style
        if(isMore) { params.pageNumber = recogSet.getPageNum(); } // use page num
        if(participantId){ params.participantId = participantId; }

        // merge in additional parameters
        params = $.extend({}, params, addlParams);

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: G5.props.URL_JSON_PUBLIC_RECOGNITION,
            data: params,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    recColls = [];

                console.log('[INFO] PublicRecognitionSetCollection - RETRIEVED ['+that.length+'] recognitionSets');

                //add or merge the new data
                that.mergeData(data.recognitionSets);

                // increment page number
                if(isMore) { recogSet.incrementPageNum(); }

                that.trigger('dataLoaded',recSetNameId,fromIndex,isMore);
            },
            error:function(jqXHR, textStatus, errorThrown ){
                console.log('[ERROR] PublicRecognitionSetCollection: loadData failed. Error: ', textStatus, errorThrown );
            }
        });
    },

    //merge new data
    mergeData: function(recSets){
        var that = this,
            updatedNameId;

        //no recognition sets, add all the recognitionSets
        if(this.length===0){
            console.log('[INFO] PublicRecognitionSetCollection - ADD ['+recSets.length+'] INITIAL recognitionSets');
            _.each(recSets,function(rs){
                //whichever one has recs is the first populated set (tab)
                if(rs.recognitions.length > 0){updatedNameId = rs.nameId;}
                //add the json to the model
                that.add(rs);
                console.log('rs.nameId',that.where({nameId : rs.nameId})[0]);
                that.where({nameId : rs.nameId})[0].recognitions.on('budgetRemaingChanged', that.setAllBudgetsRemaining, that);

            });
        }

        //has recognition sets, merge recognitions
        else{
            _.each(recSets,function(rs){
                var modRs = that.getRecognitionSet(rs.nameId),
                    totalCountEstablishedAndJsonTryingToResetToZero = modRs.get('totalCount') > 0 && rs.totalCount === 0;

                if(modRs) {
                    //merge recs into apropo set
                    if( !totalCountEstablishedAndJsonTryingToResetToZero ) {
                        modRs.set( 'totalCount', rs.totalCount );
                    }
                    that.mergeRecognitions(rs.recognitions, modRs.recognitions, modRs.get('nameId'));

                    if(rs.recognitions.length > 0){updatedNameId = rs.nameId;}

                //we don't have this rec set yet, even though we had our initial load
                } else {
                    //new rec set (bonus case, not expecting this, but why not)
                    console.log('[INFO] PublicRecognitionSetCollection - ADD NEW recognitionSet ['+rs.nameId+']');
                    that.add(rs);
                }
            });
        }

        return updatedNameId;
    },


    //get a rec set
    getRecognitionSet: function(nameId){
        return this.where({nameId:nameId})[0];
    },

    getDefaultRecognitionSet: function() {
        var defSet = this.where({isDefault: true});
        return defSet.length?defSet[0]:null;
    },


    //helper, merge a json recognition array into a model array
    mergeRecognitions: function(from, to, nameId){

        //log some info
        if(from.length>0){
            console.log('[INFO] PublicRecognitionSetCollection - MERGE ['
                +nameId+'] recognitions: '+to.length+' existing + '
                +from.length+' ? new');
        }

        //just append new recognitions to end of recognitions
        _.each(from,function(recog){
            to.addRecognition(recog);
        });

    },

    setAllBudgetsRemaining: function (budget){
    this.forEach(function(setModel){
        setModel.recognitions.forEach(function(recognitionModel){
            recognitionModel.setBudgetRemainingById(budget.id, budget.remaining);
        });

    });
    }

});