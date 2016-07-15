/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
ThrowDownPromoSelectModel:true
*/
ThrowdownPromoSelectModel = Backbone.Model.extend({
    defaults: {

    },

    initialize: function(){
        this.set('id', this.get('promoId'));
    }

});