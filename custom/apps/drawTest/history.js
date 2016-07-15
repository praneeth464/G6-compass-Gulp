// Load the application once the DOM is ready, using `jQuery.ready`:
  // This might be helpful: http://lostechies.com/derickbailey/2011/07/19/references-routing-and-the-event-aggregator-coordinating-views-in-backbone-js/
  //and this: http://arturadib.com/hello-backbonejs/docs/1.html
$(function(){
	
	var PaintStep = Backbone.Model.extend({
		defaults: {
			stepID: "Not set",
			tool: "Not set",	
			color: "Not set",
			size: "Not set",
			path: "Not set" //array [nth-time moved, x-coord, y-coord]
		},
		
		initialize: function(){
			console.log("PaintStep created.");
		}
		
	});
	
	var TotalSteps = Backbone.Collection.extend({
		model: PaintStep
	});
		
	var stepList = new TotalSteps();

	var AppView = Backbone.View.extend({
		el: $('body'),
		
		events: {
			'click #normal' : 'addItem' //change to mouseDown?
										//add event for mousemove over #normal
										//add event for mouseUp
										//add event for undo
		},
		
		initialize: function() {
			_.bindAll(this, 'addItem'); //this ensures that 'this' relates to the View, not to the local function. Handy!
			
			this.counter = 0;
			
		},
		
		addItem: function(){
			this.counter++;
			var paintStep = new PaintStep();
			paintStep.set({
				stepID: this.counter,
				//
			});
			stepList.add(paintStep);
			console.log (stepList.models);
		}
	});
	
	var paintView = new AppView;
});