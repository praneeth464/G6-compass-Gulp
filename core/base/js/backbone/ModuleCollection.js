/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
G5,
Backbone,
Module,
ModuleCollection:true
*/

/*
	This is the container (backbone ModuleCollection) model for Module models.
*/
ModuleCollection = Backbone.Collection.extend({
	model: Module,

	_gridWidthUnits: 6,//default to six

	initialize: function() {
		this._filter = G5.props.DEFAULT_FILTER;//private variable to hold current filter
	},

	setGridWidthUnits:function(width, silent){

		if(this._gridWidthUnits === width) return;

		this._gridWidthUnits = width;

		if(!silent) this.trigger('gridWidthUnitsChanged', width);
	},

	getGridWidthUnits:function(){

		return this._gridWidthUnits;

	},

	setFilter:function(filter){

		//do nothing if this filter is set already
		if(this._filter === filter) return;

		this._filter = filter;

		//generate an event
		this.trigger('filterChanged',filter);
	},

	getFilter:function(){
		return this._filter;
	}
});
