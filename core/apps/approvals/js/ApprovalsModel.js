/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
Backbone,
ApprovalsModel:true
*/
ApprovalsModel = Backbone.Model.extend({
	defaults: {

	},

	initialize: function() {
		console.log("[INFO] ApprovalsModel: Approval Model initialized", this, this.collection);
	}

});