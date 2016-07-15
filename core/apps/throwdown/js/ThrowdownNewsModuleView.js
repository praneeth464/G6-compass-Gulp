/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
ModuleView,
ThrowdownNewsStoryCollection,
ThrowdownNewsModuleView:true
*/
ThrowdownNewsModuleView = ModuleView.extend({
    initialize:function(opts){
        var that = this;

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        this.model.set(
            'allowedDimensions',[
                { w:1, h:1 },
                { w:2, h:1 },
                { w:2, h:2 },
                { w:4, h:2 }
            ],
            { silent: true }
        );

        //doing the product model in the view (do not use the 'model' prop, this has a module model)
        this.throwdownNewsStoryCollection = new ThrowdownNewsStoryCollection();

        // every time the geometry of the module changes, we need to grab and store the new dimensions
        this.on('geometryChanged', function(dims) {
            that.dims = dims;
            that.handleGeometryChange();
        },this);

        //when products model gets reset, then render this
        this.throwdownNewsStoryCollection.on('reset',function(){
            that.renderStories();
        },this);

        this.on('templateLoaded', function(){
            _.delay(G5.util.textShrink, 100, this.$el.find('.title-icon-view h3'));
            G5.util.textShrink( this.$el.find('.title-icon-view h3'));
        });

        this.on('storiesRendered', function() {
            that.renderCycle();
        });

        // resize the text to fit
        this.moduleCollection.on('filterChanged', function() {
            G5.util.textShrink( this.$el.find('.title-icon-view h3'));
        }, this);
    },
    //override - add the call to loadProducts()
    render:function(){
        var that = this;

        this.getTemplateAnd(function(tpl){
            //when template manager has the template, render it to this element
            that.$el.append( tpl( _.extend({},that.model.toJSON(),{cid:that.cid}) ));

            //the carousel element (now it exists -- the template has been loaded)
            that.$carousel = that.$el.find('#communicationsCarousel').first();

            //it is now safe to load stories (trigger render)
            that.throwdownNewsStoryCollection.loadStories();

            //in initial load, templates may miss out on filter event so we do filter change work here just in case
            that.doFilterChangeWork();
        });

        return this;//chaining
    },
    renderStories:function(){
        var that = this,
            tplName = 'throwdownNewsModuleItem',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'throwdown/tpl/',
            $cont = this.$el.find('.carousel .cycle'),
            dimsAsString = this.dims.w + 'x' + this.dims.h;

        //empty the carousel items
        $cont.empty();

        //for each story item
        TemplateManager.get(tplName,function(tpl){
            that.throwdownNewsStoryCollection.each(function(story) {
                var storyHTML;

                story.set('storyImageUrl', story.get('storyImageUrl'+dimsAsString));

                storyHTML = tpl( story.toJSON() );
                story.$el = $(storyHTML);
                $cont.append( story.$el ); //it's rendering each <li> here instead of using {{each}} in handlebars, from the looks of it.

                //if it has one child, then give it the active class
                $cont.children().addClass($cont.children().length===1?'active':null);
            });

            that.trigger('storiesRendered');

        },tplUrl);

        return this;
    },
    handleGeometryChange: function() {
        var dimsAsString = this.dims.w + 'x' + this.dims.h;

        if( dimsAsString === '1x1' || dimsAsString === '2x1' ) {
            return;
        }

        this.throwdownNewsStoryCollection.each(function(story) {
            story.set('storyImageUrl', story.get('storyImageUrl'+dimsAsString));
            story.$el.css('background-image', 'url('+story.get('storyImageUrl')+')');
        });
    },
    renderCycle: function() {
        this.startCycle({
            fit: true,
            containerResize: 1,
            slideResize: false
        }, "dots");
    }
});
