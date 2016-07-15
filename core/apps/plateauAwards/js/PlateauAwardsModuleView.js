/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
Backbone,
ModuleView,
TemplateManager,
PlateauAwardsModuleView:true
*/
PlateauAwardsModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon
            {w:2,h:1}, // icon+title
            {w:2,h:2} // 2x2 square
        ],{silent:true});

        //doing the product model in the view (do not use the 'model' prop, this has a module model)
        this.products = new Backbone.Collection();

        //when products model gets reset, then render this
        this.products.on('reset',function(){this.renderProducts();},this);

        // resize the text to fit
        this.moduleCollection.on('filterChanged', function() {
            G5.util.textShrink( this.$el.find('.wide-view h3') );
        }, this);
    },

    events: {
        "click .visitAppBtn":"linkToCurrentProduct",
        // hack to catch IE capturing the click that should happen on the above absolute element
        "click .title-icon-view":"linkToCurrentProduct",
        "ontouchstart .visitAppBtn":"linkToCurrentProduct"
    },

    //override - add the call to loadProducts()
    render:function(){
        var that = this;

        this.getTemplateAnd(function(tpl){
            //when template manager has the template, render it to this element
            that.$el.append( tpl( _.extend({},that.model.toJSON(),{cid:that.cid}) ));

            //the carousel element (now it exists -- the template has been loaded)
            that.$carousel = that.$el.find('.plateauSlides');

            //it is now safe to load products (trigger render)
            that.loadProducts();

            // start the loading state and spinner
            that.dataLoad(true);

            //in initial load, templates may miss out on filter event
            //so we do filter change work here just in case
            that.doFilterChangeWork();
        });

        return this;//chaining
    },

    renderProducts:function(){
        var that = this,
            tplName = 'plateauAwardsModuleItem',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'plateauAwards/tpl/',
            $cont = this.$carousel;

        // stop the loading state and spinner
        this.dataLoad(false);

        //empty the carousel items
        $cont.empty();

        TemplateManager.get(tplName,function(tpl){
            //for each budget item
            _.each(that.products.models,function(product){
                $cont.append( tpl(product.toJSON()) );
            });

            // that.startCycle({
            //     fit: true,
            //     containerResize: false
            // }, "arrows"); //start the carousel

            // resize the text to fit
            // the delay is to wait for custom fonts to load
            _.delay(G5.util.textShrink, 100, that.$el.find('.wide-view h3'));
            G5.util.textShrink( that.$el.find('.wide-view h3') );

            that.startCycle({
                // use scss to size this shizz
                fit: 0,
                slideResize: 0,
                containerResize: 0
            }, "dots");

        },tplUrl);

        return this;
    },

    //shamefull, model method inside a view, lazy, lazy
    loadProducts:function(props){
        var that = this;
        props = _.extend({},this.$el.data(),props);
        // clean out data params that are objects (plugins for example)
        _.each(props, function(v,k){
            if(typeof v === 'object') {
                delete props[k];
            }
        });
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PLATEAU_AWARDS_MODULE,
            data: props||{},
            success: function(servResp){
                that.products.reset(servResp.data.products);
            }
        });
    },

    // follow link to currently visible product
    linkToCurrentProduct: function(e){
        var //$frstUrl = this.$el.find('.plateauSlides .item').first().attr("data-url"),
            $url = this.$el.find('.plateauSlides .item:visible').attr("data-url");

        // if there is a visible slide item, follow its link
        if($url) {
           location.href = $url;
            e.preventDefault();
        }
        // else, follow the link generated on the HTML (JSP) (no not prevent default)

    }

});