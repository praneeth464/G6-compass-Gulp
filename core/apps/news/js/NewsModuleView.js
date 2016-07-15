/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
ModuleView,
NewsStoryCollection,
NewsModuleView:true
*/
NewsModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var that = this;
        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //doing the product model in the view (do not use the 'model' prop, this has a module model)
        this.newsStoryCollection = new NewsStoryCollection();

        // every time the geometry of the module changes, we need to grab and store the new dimensions
        this.on('beforeGeometryChange', function(dims) {
            that.dims = dims;
            that.handleGeometryChange();
        },this);

        //when products model gets reset, then render this
        this.newsStoryCollection.on('reset',function(){
            // stop the loading state and spinner
            that.dataLoad(false);

            //just in case we don't have dims yet
            if(!that.dims){
                that.dims = that.model.getGridDimensions();
            }

            that.renderStories();
        },this);

        this.on('storiesRendered', function() {
            that.renderCycle();
        });

    },

    //override - add the call to loadProducts()
    render:function(){
        var that = this;

        this.getTemplateAnd(function(tpl){
            //when template manager has the template, render it to this element
            that.$el.append( tpl( _.extend({},that.model.toJSON(),{cid:that.cid}) ));

            //the carousel element (now it exists -- the template has been loaded)
            that.$carousel = that.$el.find('#newsCarousel').first();

            //it is now safe to load stories (trigger render)
            that.loadStories();

            // start the loading state and spinner
            that.dataLoad(true);

            //in initial load, templates may miss out on filter event
            //so we do filter change work here just in case
            that.doFilterChangeWork();
        });

        return this;//chaining
    },

    renderStories:function(){
        var that = this,
            tplName = 'newsModuleItem',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'news/tpl/',
            $cont = this.$el.find('.carousel .cycle'),
            dimsAsString = this.model.getGridDimensionsStr();

        //empty the carousel items
        $cont.empty();

        //for each story item
        TemplateManager.get(tplName,function(tpl){

            that.newsStoryCollection.each(function(story) {
                story.set('storyImageUrl', story.get('storyImageUrl'+dimsAsString));

                story.$el = $(tpl(story.toJSON()));
                $cont.append( story.$el );

                //if it has one child, then give it the active class
                $cont.children().addClass($cont.children().length===1?'active':null);
            });

            that.trigger('storiesRendered');

        },tplUrl);

        return this;
    },

    handleGeometryChange: function() {
        var dimsAsString = this.model.getGridDimensionsStr();

        if( dimsAsString == '0x0' || dimsAsString == '1x1' || dimsAsString == '2x1' ) {
            return;
        }

        this.newsStoryCollection.each(function(story) {
            story.set('storyImageUrl', story.get('storyImageUrl'+dimsAsString));
            story.$el.css('background-image', 'url('+story.get('storyImageUrl')+')');
        });
    },

    renderCycle: function() {
        this.startCycle({
            fit: true,
            containerResize: 1,
            slideResize: false
        }, "dots"); //start the carousel
    },

    //shamefull, model method inside a view, lazy, lazy
    loadStories:function(props){
        var that = this;
        props = _.extend({},this.$el.data(),props);

        // plugins passed to ajax cause issues
        // might be better to have selective pulls from $el.data('selectiveAttrName')
        if(props.spinner){ delete props.spinner;}
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_NEWS,
            data: props||{},
            success: function(servResp){
                that.newsStoryCollection.reset(servResp.data.news);
            }
        });
    }
});
