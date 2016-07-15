/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
RulesPromotionModel:true
*/
RulesPromotionModel = Backbone.Model.extend({
	defaults: {
		id: 'undefined ID',
		name: 'undefined promotion Name',
		categoryId: '',
		categoryName: '',
		content: 'undefined rules content'
	},
	
	initialize: function(){
	
	}
});