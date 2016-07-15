/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
Backbone,
PurlContributeModel:true
*/
PurlContributeModel = Backbone.Model.extend({
	defaults: {

	},

	initialize: function() {
		console.log("[INFO] PurlContributeModel: PURL Contribute Model initialized", this, this.collection);
	}

});