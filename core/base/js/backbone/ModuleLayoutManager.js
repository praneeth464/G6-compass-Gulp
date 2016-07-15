/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Modernizr,
G5,
BinPacker,
ModuleLayoutManager:true
*/

/*
    ModuleLayoutManager - manages the arrangement of modules.
    - implements a 2d bin packing algorithm
*/

ModuleLayoutManager =  function(modContView){
    // use css3 transitions if possible
    // NOTE: this has been flipped to FALSE because Safari has trouble with inline scrolling when a module has been translated to a different position on the page. As of Safari 6 on both mobile and desktop.
    this.CSS3_ANIM = false;
    // module animation duration
    // make sure this matches transition duration (_allModules.scss:.transitionAnim) if it has one
    this.ANIM_DURATION = 400; 
    // delay after animation before doing 'stuff'
    this.AFTER_ANIM_DURATION = 200;

    this.moduleContainerView = modContView;
    this.busy = false;
    this.layoutOnFinish = false;
    this.cachedBins = {};
};

_.extend(ModuleLayoutManager.prototype, {

    //generate new grid positions for modules and then move them
    updateLayout: function(){
        var container = this.moduleContainerView, //alias
            modules = container.getModuleViews(), //alias
            estimatedAnimationTime = this.ANIM_DURATION + this.AFTER_ANIM_DURATION,
            that = this;

        //GATEWAY
        //if we are already laying stuff out, make a note to layout when done, return
        if(this.busy){
            console.log("[INFO] ModuleLayoutManager - updateLayout() called but already laying out");
            this.layoutOnFinish = true;
            return;
        }

        this.busy = true;

        //no modules, then run for hills
        if(modules.length===0){
            //exit with immediate retry if requested
            this.exitUpdateLayout(0);
            return;
        } 


        //the available width units
        var contW = container.model.getGridWidthUnits();


        // pull out the hidden moduleViews
        var hidden = _.filter(modules, function(m){return m.model.getOrder() === 'hidden';});
        var visible = _.filter(modules, function(m){return m.model.getOrder() !== 'hidden';});


        // sort the moduleViews according to their order (for current filter)
        var ordered = _.sortBy(visible, function(m){ return m.model.getOrder(); } );

        // moduleViews which have been placed
        var placed = [];

        // portal/window dimensions
        var portDims = {
            w: Math.floor(this.moduleContainerView.$el.closest('.page').width()/container.gridSpanPx),
            // w: Math.floor($(window).width()/container.gridSpanPx),
            h: Math.floor($(window).height()/container.gridSpanPx)
        };

        //create a hash to id this arrangement (for caching purposes)
        var baHash = portDims.w+'x'+portDims.h+'/';

        //module geometries, in a simple obj
        var modGeoms = _.map(ordered,function(mod){
            var modDims = mod.model.getGridDimensions(contW);
            var modOrder = mod.model.getOrder();
            //build the hash from modGeoms
            baHash+=mod.cid+'.'+modOrder+'.'+modDims.w+'x'+modDims.h+'/';
            return {
                cid: mod.cid,                               //backbone client id of this mod
                order: modOrder,                            //order of this mod 
                dims: modDims,                              //desired dims for this mod
                minDims: mod.model.getMinGridDimensions(),  //smallest dims for this mod
                altDims: modDims.alt //alternative dims (binpacker may use this to find better arrangemnts)
            };
        });

        var binPacker, binArngmt = null;

        //have we cached this? then use the cached copy
        if(this.cachedBins[baHash]&&G5.props.CACHE_MODULE_ARRANGEMENTS){
            console.log('[INFO] ModuleLayoutManager - using cached bin arrangement, no need to calculate');
            binArngmt = this.cachedBins[baHash];
        }else{
            //create a bin packer and pack it (unless cached)
            binPacker = new BinPacker(modGeoms,portDims);
            binPacker.settings.useAltModDims = G5.props.PACK_WITH_ALT_DIMS;
            binArngmt = binPacker.findArrangements();
        }

        //if no arrangement, then fail
        if( typeof binArngmt==='undefined' || !_.has(binArngmt,'arrangement')){
            console.log('[ERROR] ModuleLayoutManager - no module arrangment returned by bin packer');

            //exit with immediate retry if requested
            this.exitUpdateLayout(0);
            return;
        } 


        //add to our cache
        this.cachedBins[baHash] = binArngmt;

        //match up bin packing results using backbone CID
        _.each( binArngmt.arrangement , function(sq){

            //find the ModuleView for this arrangement
            var mvForSq = _.find(ordered,function(mv){
                return mv.cid === sq.cid;
            });

            //put the mod view in the placed array
            placed.push(mvForSq);

            //attach a simple obj to store new geom
            mvForSq.newGeomGrid = {
                x:sq.x,
                y:sq.y,
                w:sq.dims.w,
                h:sq.dims.h
            };

        });


        //update DOM
        this.updateDomElements(placed,hidden,binArngmt);

        //call exit function with anim time est
        this.exitUpdateLayout(estimatedAnimationTime);


        return;
    },

    //EXIT
    //call this when exiting update layout 
    // - checks if another layout call is to be made
    // - opens up updateLayout for new calls
    exitUpdateLayout:function (timeMs) {
        var that = this;
        //check for another layout request after we finish, estimate time anims take 
        setTimeout(function() {
            that.busy = false;
            if(that.layoutOnFinish){
                console.log('[INFO] ModuleLayoutManager - executing SCHEDULED updateLayout()');
                that.layoutOnFinish = false;
                that.updateLayout();
            }
        }, timeMs);
    },


    //helper function - update DOM elements
    updateDomElements:function(changedModViews,hiddenModViews,binArngmt){
        var that = this,
            container = this.moduleContainerView,
            animDuration = this.ANIM_DURATION,
            afterAnimDuration = this.AFTER_ANIM_DURATION,
            //update container size
            boundingDims = binArngmt.getBoundingDims();

        if(container.$el.width()<container.gridSpanPx){
            container.$el.css({
                'width':boundingDims.w*container.gridSpanPx,
                'height':boundingDims.h*container.gridSpanPx
            });
        }else{
            container.$el.animate({
                'width':boundingDims.w*container.gridSpanPx,
                'height':boundingDims.h*container.gridSpanPx
            },animDuration);
        }

        // call hooks on module collection view
        this.moduleContainerView.doBeforeGeometryChange();
        // make sure to set the delay on this according
        setTimeout(function(){that.moduleContainerView.doAfterGeometryChange();},animDuration);

        //make changes to visible (or soon visible) views
        _.each(changedModViews,function(modView){

            //if the dom el is currently hidden, move and fade in
            if(modView.$el.is(':hidden')){

                that.showModule(modView);

            //dom el is visible, animate geometry changes
            }else{

                that.moveModule(modView);

            }

        });//_.each()

        //hide apropo elements
        _.each(hiddenModViews,function(modView){
            that.hideModule(modView);
        });

    },

    hideModule: function(modView){
        var that = this,
            animDuration = this.ANIM_DURATION,
            afterAnimDuration = this.AFTER_ANIM_DURATION;

        if(!modView.$el.is(':visible')){ return; }

        modView.doBeforeGeometryChange(0,0);

        if(this.CSS3_ANIM&&Modernizr.csstransitions&&Modernizr.csstransforms3d){

            modView.$el.addClass('transitionAnim');
            modView.$el.css({
                'opacity':0
            });

            //trigger post change business on mod view
            setTimeout(function(){
                modView.doAfterGeometryChange(0,0);
                modView.$el.removeClass('transitionAnim').css('display','none');
            }, animDuration + afterAnimDuration);

        } else {
            
            modView.$el.fadeOut(animDuration, function(){
                modView.doAfterGeometryChange(0,0);
            }); 
        }
    },

    showModule: function(modView){
        var that = this,
            animDuration = this.ANIM_DURATION,
            afterAnimDuration = this.AFTER_ANIM_DURATION,
            unitW = modView.newGeomGrid.w,
            unitH = modView.newGeomGrid.h,
            unitX = modView.newGeomGrid.x,
            unitY = modView.newGeomGrid.y,
            w = unitW*this.moduleContainerView.gridSpanPx,
            h = unitH*this.moduleContainerView.gridSpanPx,
            x = unitX*this.moduleContainerView.gridSpanPx,
            y = unitY*this.moduleContainerView.gridSpanPx;


        //before change hook on module view
        modView.doBeforeGeometryChange(unitW,unitH);

        if(this.CSS3_ANIM&&Modernizr.csstransitions&&Modernizr.csstransforms3d){

            modView.$el.css({
                'width': w,
                'height': h,
                'display': 'block',
                'opacity': 0
            });

            // add transition class
            modView.$el.addClass('transitionAnim');

            // for some reason css3 fade in doesn't work unless we defer
            setTimeout(function(){

                /* instant geometry change */
                modView.$el.css({
                    "opacity":1,
                    "-webkit-transform":"translate3d("+x+"px,"+y+"px, 0)",
                    "-moz-transform":"translate3d("+x+"px,"+y+"px, 0)",
                    "-o-transform":"translate3d("+x+"px,"+y+"px, 0)",
                    "transform":"translate3d("+x+"px,"+y+"px, 0)"
                }); 

                //trigger post change business on mod view
                setTimeout(function(){
                    modView.doAfterGeometryChange(unitW,unitH);
                    modView.$el.removeClass('transitionAnim');
                }, animDuration + afterAnimDuration);

            },0);

        } else {

            /* instant geometry change (maybe, check css3 transitions)*/
            modView.$el.css({
                'left': x,
                'top': y,
                'width': w,
                'height': h
            });
            //and show it
            modView.$el.fadeIn(animDuration, function(){
                //trigger post change business on mod view
                setTimeout(function(){
                    modView.doAfterGeometryChange(unitW,unitH);
                }, afterAnimDuration);
            });
        }
        
    },

    moveModule: function(modView){
        var that = this,
            animDuration = this.ANIM_DURATION,
            afterAnimDuration = this.AFTER_ANIM_DURATION,
            unitW = modView.newGeomGrid.w,
            unitH = modView.newGeomGrid.h,
            unitX = modView.newGeomGrid.x,
            unitY = modView.newGeomGrid.y,
            w = unitW*this.moduleContainerView.gridSpanPx,
            h = unitH*this.moduleContainerView.gridSpanPx,
            x = unitX*this.moduleContainerView.gridSpanPx,
            y = unitY*this.moduleContainerView.gridSpanPx;

        //before change hook on module view
        modView.doBeforeGeometryChange(unitW,unitH);

        /* change width and height instantly since module-liner 
            has static css dimensions (animation would be wasted) 
            - css3 may be used to animate w and h for supporting browsers, but may be slow
                with small visual payoff (not a good value)
        */
        modView.$el.css({
            'width': w,
            'height': h
        });

        /* animate to new position */
        if(this.CSS3_ANIM&&Modernizr.csstransitions&&Modernizr.csstransforms3d){


            modView.$el.addClass('transitionAnim');

            modView.$el.css({
                "-webkit-transform":"translate3d("+x+"px,"+y+"px, 0)",
                "-moz-transform":"translate3d("+x+"px,"+y+"px, 0)",
                "-o-transform":"translate3d("+x+"px,"+y+"px, 0)",
                "transform":"translate3d("+x+"px,"+y+"px, 0)"
            });


            setTimeout(function(){
                modView.doAfterGeometryChange(unitW,unitH);
                modView.$el.removeClass('transitionAnim');
            }, animDuration + afterAnimDuration);
        
        } else {
            modView.$el.animate({
                    'left': x,
                    'top': y
                    // width and height (module-liner) are set in css now
                    // so we will not animate these (but may use css3 transitions)
                    // see _allModules.scss
                }, 
                animDuration,
                function(){
                    setTimeout(function(){
                        modView.doAfterGeometryChange(unitW,unitH);
                    }, afterAnimDuration);
                }
            );
        }
    },

    //helper function - update DOM elements - NO ANIMATION
    updateDomElementsNoAnim:function(changedModViews,hiddenModViews,container,binArngmt){
        var //update container size
            boundingDims = binArngmt.getBoundingDims();


        container.$el.css({
            'width':boundingDims.w*container.gridSpanPx,
            'height':boundingDims.h*container.gridSpanPx
        });


        // call hooks on module collection view
        this.moduleContainerView.doBeforeGeometryChange();
        this.moduleContainerView.doAfterGeometryChange();


        //make changes to visible (or soon visible) views
        _.each(changedModViews,function(modView){
            var w = modView.newGeomGrid.w,
                h = modView.newGeomGrid.h,
                x = modView.newGeomGrid.x,
                y = modView.newGeomGrid.y;

            //before change hook on module view
            modView.doBeforeGeometryChange(w,h);


            /* instant geometry change */
            modView.$el.css('left', x*container.gridSpanPx);
            modView.$el.css('top', y*container.gridSpanPx);
            modView.$el.css('width', w*container.gridSpanPx);
            modView.$el.css('height', h*container.gridSpanPx);

            modView.$el.show();
            modView.doAfterGeometryChange(w,h);

        });

        //hide apropo elements
        _.each(hiddenModViews,function(modView){
            modView.doBeforeGeometryChange(0,0);
            modView.$el.hide();
            modView.doAfterGeometryChange(0,0);
        });

    }

});
