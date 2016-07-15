/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
PublicRecognitionModel,
PublicRecognitionCollection:true
*/

//PubliceRecognitionCollection -- collection of recognitions
PublicRecognitionCollection = Backbone.Collection.extend({

    model: PublicRecognitionModel,

    initialize:function(data,opts){
        
        this.recognitionSetNameId = opts.nameId;

        this.on('budgetRemaingChanged');
        //we expect to be handed our data as the first arg of our init function
        //backbone will init our collection with this data
    },

    //special function for adding recs
    addRecognition:function(rec){
        //assign the recog set name id -- template needs this
        rec.recognitionSetNameId = this.recognitionSetNameId;
        this.add(rec);
    }

});