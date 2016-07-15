/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SmackTalkSetModel,
SmackTalkSetCollection:true
*/
//Collection of smack talk sets (used for the tab groupings)
SmackTalkSetCollection = Backbone.Collection.extend({

    model: SmackTalkSetModel,

    initialize:function() {
        this.smackTalkUrl = ""; // will hold URL to Smack Talk page for the module's .visitAppBtn
        this.visible = true;  // corresponds to the module's filters.throwdown.visible value for hiding or showing the module
    },

    //load and process JSON data from server
    // - if a nameId is given, then its sent with the request
    // - if fromIndex is given, it will be passed with request
    loadData:function(recSetNameId, fromIndex, isMore, participantId){
        var that = this,
            params = {},
            recogSet = this.getSmackTalkSet(recSetNameId),
            defSet;

        //is cached?
        //check to see if we have a set for this
        if(recSetNameId){
            //if length not 0 and not loading more
            if(recogSet && recogSet.smackTalks.length !== 0 && !fromIndex){
                //we have data already, no need to load
                this.trigger('dataLoaded',recSetNameId,fromIndex,isMore);
                return;
            }
            //if loading more, and all loaded
            if(fromIndex && recogSet.smackTalks.length >= recogSet.get('totalCount')){
                //we have all data already, no need to load
                this.trigger('dataLoaded',recSetNameId,fromIndex,isMore);
                return;
            }

            //ELSE continue!
        }

        //set parameters
        if(recSetNameId){params.smackTalkSetNameId = recSetNameId;}
        //if(fromIndex){params['fromIndex'] = fromIndex;} // server wants page number style
        if(isMore) { params.pageNumber = recogSet.getPageNum(); } // use page num
        if(participantId){ params.participantId = participantId; }

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: G5.props.URL_JSON_SMACK_TALK + G5.throwdown.promoId,
            data: params,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    recColls = [];

                console.log('[INFO] SmackTalkSetCollection - RETRIEVED ['+that.length+'] smackTalkSets');

                //add or merge the new data
                that.mergeData(data.smackTalkSets);

                // get the URL that will be assigned to the href attribute in the module's .visitAppBtn
                that.smackTalkUrl = data.smackTalkUrl;

                // should module be hidden or shown?
                that.visible = data.visible;

                // increment page number
                if(isMore) { recogSet.incrementPageNum(); }

                that.trigger('dataLoaded',recSetNameId,fromIndex,isMore);
            },
            error:function(jqXHR, textStatus, errorThrown ){
                console.log('[ERROR] SmackTalkSetCollection: loadData failed. Error: ', textStatus, errorThrown );
            }
        });
    },

    //merge new data
    mergeData: function(recSets){
        var that = this,
            updatedNameId;

        //no recognition sets, add all the smackTalkSets
        if(this.models.length===0){
            console.log('[INFO] SmackTalkSetCollection - ADD ['+recSets.length+'] INITIAL smackTalkSets');
            _.each(recSets,function(rs){
                //whichever one has recs is the first populated set (tab)
                if(rs.smackTalks.length > 0){updatedNameId = rs.nameId;}
                //add the json to the model
                that.add(rs);
                console.log('rs.nameId',that.where({nameId : rs.nameId})[0]);

            });
        }

        //has recognition sets, merge smackTalks
        else{
            _.each(recSets,function(rs){
                var modRs = that.getSmackTalkSet(rs.nameId);

                console.log("modRs.get('totalCount')", modRs.get('totalCount'));
                console.log("rs.totalCount", rs.totalCount);

                if(modRs) {
                    modRs.set( 'totalCount', rs.totalCount );

                    that.mergeSmackTalks(rs.smackTalks, modRs.smackTalks, modRs.get('nameId'));

                    if(rs.smackTalks.length > 0){updatedNameId = rs.nameId;}

                //we don't have this rec set yet, even though we had our initial load
                } else {
                    //new rec set (bonus case, not expecting this, but why not)
                    console.log('[INFO] SmackTalkSetCollection - ADD NEW recognitionSet ['+rs.nameId+']');
                    that.add(rs);
                }
            });
        }
        return updatedNameId;
    },

    //get a rec set
    getSmackTalkSet: function(nameId){
        return this.where({nameId:nameId})[0];
    },

    getDefaultSmackTalkSet: function() {
        var defSet = this.where({isDefault: true});
        return defSet.length?defSet[0]:null;
    },

    //helper, merge a json recognition array into a model array
    mergeSmackTalks: function(from, to, nameId){

        //log some info
        if(from.length>0){
            console.log('[INFO] SmackTalkSetCollection - MERGE ['+nameId+'] smackTalks: '+to.length+' existing + '+from.length+' ? new');
        }

        //just append new smackTalks to end of smackTalks
        _.each(from,function(recog){
            to.addSmackTalk(recog);
        });

    }

});
