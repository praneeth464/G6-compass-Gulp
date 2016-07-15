/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
SmackTalkModel,
SmackTalkCollection:true
*/

//SmackTalkCollection -- collection of smackTalks
SmackTalkCollection = Backbone.Collection.extend({

    model: SmackTalkModel,

    initialize:function(data,opts){

        if (opts) {
            this.smackTalkSetNameId = opts.nameId;
        }

        //we expect to be handed our data as the first arg of our init function
        //backbone will init our collection with this data
    },

    //special function for adding recs
    addSmackTalk:function(rec){
        //assign the recog set name id -- template needs this
        rec.smackTalkSetNameId = this.smackTalkSetNameId;
        this.add(rec);
    }

});