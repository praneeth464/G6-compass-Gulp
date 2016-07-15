/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
Backbone,
Module:true
*/
Module = Backbone.Model.extend({

    defaults:{

        //module name
        // - we find templates from this name, specify the 'templateName' prop to override
        // - we find view obj from this name, specify the 'viewName' prop to override
        name:'blankModule',

        //if module name is diff. from template name, set this property
        templateName: false,

        //if module name is diff. from view name, set this property
        viewName: false,

        //default filter to size mapping
        filters:{
            'default':{size:'1x1', order:0},
            'home':{size:'1x1', order:0},
            'activities':{size:'1x1', order:0},
            'social':{size:'1x1', order:0},
            'shop':{size:'1x1', order:0},
            'reports':{size:'1x1', order:0},
            'all':{size:'1x1', order:0}
        },

        //allowed dimensions, sorted from smallest - biggest
        allowedDimensions:[
            {w:1,h:1}, // icon-only - smallest
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // half-size big
            {w:4,h:4}  // biggest
        ]
    },

    //return DEFAULT grid width and height string
    _getGridDimensionsStrForCurrentFilter:function(){
        return (this.get('filters')[this.collection.getFilter()] || this.get('filters')['default']).size;
    },

    //return an object with width and height in grid units for current filter/context
    //if max width is set, we bump down our size
    getGridDimensions:function(){

        //parse out the width and height components
        var dStr = this._getGridDimensionsStrForCurrentFilter(),
            ds = _.map(dStr.split('x'),function(nStr){return parseInt(nStr,10);}),
            cntGrdWdUnits = this.collection.getGridWidthUnits();

        // obj representation of desired w and h
        ds = {w:ds[0],h:ds[1]};

        // check desired dims against allowed and change if necessary
        ds = this._closestAllowedDims(ds);

        // check width and try to find a narrower fit
        ds = this._closestAllowedDimsByWidth(ds,cntGrdWdUnits);

        // TOO WIDE - return smaller dims if too wide for container
        // while(cntGrdWdUnits < ds.w && ds.w > 1 ){
        //  ds = this._findSmallerDims(ds);
        // }


        // ALTERNATE DIMS
        // add an alternative, if appropriate
        ds.alt = null;
        // icon form, add icon+title form
        if(ds.w===1){
            ds.alt = {w:2,h:1};
        }
        //icon+title form, add icon only form
        if(ds.w===2 && ds.h===1){
            ds.alt = {w:1,h:1};
        }
        //add alternatives for 4 unit wide versions
        if(ds.w===4){
            if(ds.h===4){ds.alt = {w:4,h:2}; }
            if(ds.h===2){ds.alt = {w:4,h:4}; }
        }

        return ds;
    },

    //return the string form of the correct grid dimensions
    getGridDimensionsStr:function(){
        var ds = this.getGridDimensions();
        return ds.w+'x'+ds.h;
    },

    //return the smallest acceptable dimensions for this module
    getMinGridDimensions:function(){
        return this.get('allowedDimensions')[0]||{w:1,h:1};
    },

    //return the order for this module in this filter/context
    getOrder:function(){
        var order = (this.get('filters')[this.collection.getFilter()] || this.get('filters')['default']).order;

        if(order === 'hidden') {
            return 'hidden';
        } else {
            return parseInt(order);
        }
    },

    setOrder:function(order){

        //dig into the filters array and set order for current filter
        this.get('filters')[this.collection.getFilter()].order = order;

        //fake a backbone event for order change
        this._pending.order = true;
        this.change({changes:{order:true}});

    },

    //is hidden, this is when the order='hidden' for this module
    isHiddenForCurrentFilter:function(){
        return this.getOrder()==='hidden';
    },

    //set the grid size for the current filter with a '#x#' style string
    setGridDimensionsStr:function(dimStr){

        //make sure this matches our #x# format (no zeros, we won't have anything over 9), or throw error
        if (!dimStr.match(/[1-9]+x[1-9]+/)) {
            throw {
                name:'GridDimensionStrError',
                message:'Module: setGridDimensionsStr called with bad dimension string ['+dimStr+']'
            };
        }

        //set grid dim for curr filter
        this.get('filters')[this.collection.getFilter()].size = dimStr;

        //fake a backbone event for size change
        this._pending.size = true;
        this.change({changes:{size:true}});
    },

    // find the next smallest module dimension
    // _findSmallerDims:function(dims){

    //  if(dims.w>=4 && dims.h>=4) return {w:4,h:2};

    //  if(dims.w>=4 && dims.h>=2) return {w:2,h:2};

    //  if(dims.w>=2 && dims.h>=2) return {w:2,h:1};

    //  if(dims.w>=2 && dims.h>=1) return {w:1,h:1};

    //  if(dims.w>=1 && dims.h>=1) return {w:1,h:1};

    //  return {w:1,h:1};

    // },

    // make sure dims are in allowed dims and return closest if not
    _closestAllowedDims: function(dims) {
        var alDims = this.get('allowedDimensions'),
            dimsA = dims.w*dims.h,
            difs = [];

        if(!_.where(alDims, dims).length){
            // no match, let's find closest (using area)

            // record all area diffs
            _.each(alDims,function(d){
                difs.push({dif:Math.abs(dimsA - d.w*d.h), dim:d});
            });

            // get minimum diff dim and use it for return val
            dims = _.min(difs,function(d){ return d.dif; }).dim;
        }

        return dims;
    },

    // find an allowed dim within unit width bound
    _closestAllowedDimsByWidth: function(dims, maxUnitWidth) {
        var alDims = this.get('allowedDimensions'),
            bestDims;

        if(dims.w > maxUnitWidth) {

            alDims = _.filter(alDims, function(d){
                return d.w <= maxUnitWidth;
            });

            if(alDims.length) {
                dims = _.max(alDims, function(d){return d.w*d.h;});
            }

        }



        return dims;
    }

});
