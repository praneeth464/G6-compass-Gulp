/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
TheDudeListCollection:true
*/
TheDudeListCollection = Backbone.Collection.extend({

	loadData:function(){
		var that = this;
		$.ajax({
			dataType: 'g5json',
			type: "POST",
			url: 'ajax/theDudeList.json',
			success: function(servResp){
				that.reset(servResp.data.dudes);
			}
		});
	}

});