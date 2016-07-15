/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
Backbone,
PublicRecognitionCollection,
PublicRecognitionSetModel:true
*/

//PublicRecognitionSetModel -- collection of recognitions
PublicRecognitionSetModel = Backbone.Model.extend({

    initialize:function(){
        var that = this;

        //initial data: give them all a context/recognition set name id
        // PublicRecognitionCollection has an addRecognition function which 
        // sets this for new recognitions being appended
        if(this.get('recognitions')){
            _.each(this.get('recognitions'),function(rec){
                rec.recognitionSetNameId = that.get('nameId');
            });
        }


        //this is the collection of recognitions
        //populate it if data is present
        this.recognitions = this.get('recognitions')?
            new PublicRecognitionCollection(
                this.get('recognitions'), 
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