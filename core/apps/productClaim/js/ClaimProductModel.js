/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
Backbone,
ClaimProductModel:true
*/
ClaimProductModel = Backbone.Model.extend({
    defaults: {
        category: '',
        name: '',
        quantity: 0,
        subcategory: ''
    }, 

    initialize: function(){
        console.log("[INFO] ClaimProductModel: ClaimProduct model initialized", this, this.collection);
    }

});