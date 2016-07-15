/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
Backbone,
SmackTalkCollection,
SmackTalkSetModel:true
*/

//SmackTalkSetModel -- collection of smackTalks
SmackTalkSetModel = Backbone.Model.extend({

    initialize:function(){
        var that = this;

        //initial data: give them all a context/recognition set name id
        // SmackTalkCollection has an addSmackTalk function which
        // sets this for new smackTalks being appended
        if(this.get('smackTalks')){
            _.each(this.get('smackTalks'),function(rec){
                rec.smackTalkSetNameId = that.get('nameId');
            });
        }


        //this is the collection of smackTalks
        //populate it if data is present
        this.smackTalks = this.get('smackTalks')?
            new SmackTalkCollection(
                this.get('smackTalks'),
                {
                    nameId: this.get('nameId')
                }
            ):null;

        // view more page (increments on successful view more)
        this.set('currentPageNum',2);

    },

    getPageNum: function(){
        return this.get('currentPageNum');
    },

    incrementPageNum: function(){
        this.set('currentPageNum', this.get('currentPageNum')+1);
    }

});