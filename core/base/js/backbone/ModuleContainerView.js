/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
ModuleLayoutManager,
ModuleContainerView:true
*/
ModuleContainerView = Backbone.View.extend({

    tagName:"div",

    moduleViews: [],//current module views in our DOM container

    initialize:function(opts){
        var that = this;

        //a reference to the main app
        this.app = opts.app||false;

        this.sleeping = false;

        //properties
        this.gridSpanPx = opts.gridSpanPx;


        //listen for add event on moduleCollection
        this.model.on('add',function(moduleModel){
            console.log('[INFO] ModuleContainerView: model ADD event');
            this.addModuleView(moduleModel);
            this.layoutModules();
        },this);

        //listen for reset event on moduleCollection
        this.model.on('reset',function(){
            console.log('[INFO] ModuleContainerView: model RESET event - rendering and laying out modules');
            this.render();
            this.layoutModules();
        },this);

        //listen for changes to the module models
        this.model.on('change',function(opts){
            console.log('[INFO] ModuleContainerView: model CHANGE event - laying out modules');
            this.layoutModules();
        },this);

        //listen to the window resize and update grid width
        $(window).resize(function(e){
            that.model.setGridWidthUnits(
                Math.floor( that.$el.closest('.page').width() / that.gridSpanPx )
                // Math.floor( $(window).width() / that.gridSpanPx )
            );
        });

        //listen for filter changes on the collection
        this.model.on('filterChanged',function(){
            //refresh the layout on filter change
            this.layoutModules();
        },this);

        //listen for gridwidth changes on the module collection
        this.model.on('gridWidthUnitsChanged',function(newWidthUnits){

            //update layout for new gridwidth
            this.layoutModules();

        },this);


        //set the layout manager
        this.layoutManager = new ModuleLayoutManager(this);

        //initialize grid width
        this.model.setGridWidthUnits(
            Math.floor( this.$el.closest('.page').width() / this.gridSpanPx ),
            // Math.floor( $(window).width() / this.gridSpanPx ),
            true /*silent, don't trigger event*/
        );

    },

    //add a single modView to the container
    addModuleView:function(module){
        var geomChangeLoadCheck;

        //FIND THE VIEW
        var modName = module.get('name');

        //defaults to modName if viewName is false
        var modViewName = module.get('viewName')||modName;

        //this will be populated with the backbone view instance
        var modView = false;

        //default module view name
        var viewName = 'ModuleView';

        //if no view name possibilities, then log it and return
        if(!modViewName){
            console.log('[ERROR] ModuleContainerView: module must have "viewName" or "name" in order to find a backbone View');
            return;
        }

        //look for custom backbone view object to display this module model
        var ucName = modViewName.charAt(0).toUpperCase() + modViewName.slice(1);

        //custom view names = upper-case name of the module +'View'
        var potViewName = ucName+'View';

        //if the view name exists as a function, we assume it is our view obj constructor
        if( typeof window[potViewName] === 'function' ){
            //found custom view for this name
            viewName = potViewName;
            console.log('[INFO] ModuleContainerView: found CUSTOM module view ['+modName+' -> '+viewName+']');
        }else{
            //no custom view for this name
            console.log('[INFO] ModuleContainerView: DEFAULT module view ['+modName+' -> '+viewName+']');
        }

        //instantiate the proper view (NOTE: expects the viewName to live on window -- might change)
        modView = new window[viewName]({model:module,app:this.app});

        //add the view to our array of views
        this.moduleViews.push(modView);
        //console.log(modView.cid);
        //that.moduleViews[modView.cid] = modView;

        // LOADING CONTENT...

        // LOADING STRATEGY A -- straight up render straight away
        //append this module to our DOM element
        //this.$el.append( modView.render().el );


        // LOADING STRATEGY B -- delay render

        // append the module to our DOM with a temporary div, do not yet render()!
        this.$el.append( modView.el );

        // append an empty module-liner for the empty state
        modView.$el.append('<div class="module-liner module-empty"></div>');

        // as named function so it can be removed
        geomChangeLoadCheck = function(dim){
            // TRIGGER RENDER
            // if module has module-empty.module-liner
            if( modView.$el.find('.module-empty').length ) {

                // if module is visible on this filter and doesn't yet have a spinner, add it
                if( modView.$el.is(':visible') && !modView.$el.find('.spin').length ) {
                    // add loading visuals
                    modView.$el
                        .find('.module-empty').append('<span class="spin" />')
                        .find('.spin').spin({color:'#fff'});
                }
                    
                // if module is visible to the user inside the window (it's been scrolled into view)
                if( modView.isOnScreen() ) {
                    // render it
                    modView.render();
                    // remove the geometryChange check
                    modView.off('geometryChanged',geomChangeLoadCheck);
                }
            }
        };

        // on geom change, if visible and in viewport but not previously rendered, render
        modView.on('geometryChanged', geomChangeLoadCheck, this);

        // on templateLoaded, remove spinner
        modView.on('templateLoaded', function(){
            // after the template is loaded, there may still be activity with
            // loading of a module, but we can't have a generic visual indicator
            // for these specific cases. Slow module detail loading will have to 
            // be identified and handled on a case-by-case basis.
            modView.$el.find('.module-empty').remove();
        }, this);

        // on scroll, if visible and in viewport but not previously rendered, render
        // using a namespaced event so we can remove it later :)
        $(window).on('scroll.'+modName ,function() {

            // module visible
            if( modView.isOnScreen() ) {
                // kill event
                $(window).off('scroll.'+modName); 
                //  and has module-empty.module-liner
                if( modView.$el.find('.module-empty').length ) {
                    // modView.$el.find('.module-empty').remove();
                    modView.render();
                }
            }
        });

        // EOF LOADING STRATEGY

    },

    //render this element and its modules into DOM
    render:function(){

        _.each(this.moduleViews,function(v){
            v.destroy();
        });
        this.moduleViews = [];//empty it

        var that = this;

        _.each(this.model.models,function(module){
            that.addModuleView(module);
        });

    },

    //layout the moduleViews
    layoutModules:function(){
        if(this.layoutManager && !this.sleeping) {
            this.layoutManager.updateLayout();
        }
    },

    //moduleViews getter
    getModuleViews:function(){
        return this.moduleViews;
    },

    //hide the collection (and modviews) and perform necessary hygiene (turn off setTimeout stuff happeing, animations etc.)
    sleep:function(){
        var that = this;

        if(this.sleeping){return;}//already sleeping

        this.sleeping = true;

        //this.transitionEffect('left','slide',true);
        //this.$el.fadeOut(function(){
            _.each(that.moduleViews,function(mv){
                mv.sleep();
            });
        //});


    },

    //activate this view (and modules)
    wake:function(){
        if(!this.sleeping){return;}//already sleeping

        this.sleeping = false;
        //this.$el.fadeIn();

        _.each(this.moduleViews,function(mv){
            mv.wake();
        });
    },

    //take care of pre-change-geometry work
    doBeforeGeometryChange:function(gridWidth,gridHeight){
        //notify the troops
        this.trigger('beforeGeometryChange',{w:gridWidth,h:gridHeight});
    },

    //take care of post-change-geometry work
    doAfterGeometryChange:function(gridWidth,gridHeight){
        //notify any listeners about this important going-on
        this.trigger('geometryChanged',{w:gridWidth,h:gridHeight});
    }


});
