/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
ThrowdownNewsStoryModel:true
*/
ThrowdownNewsStoryModel = Backbone.Model.extend({
    defaults: {
			sortDate: "sortDate not set.",
			storyName: "Story Name not set.",
			storySlug: "Story Slug not set.",
			storyDate: "Story Date not set.", 
			storyContent: "Story Content not set.",
			storyContentShort: "Story Content Short (summary) not set.",
			storyImageUrl: "Story IMG url not set.",
			storyFormat: "Story format classes not set."		
    },
	
	initialize: function(){
	}
  });