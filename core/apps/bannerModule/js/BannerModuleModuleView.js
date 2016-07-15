/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
ModuleView,
TemplateManager,
BannerModuleCollection,
BannerModuleModuleView:true
*/
BannerModuleModuleView = ModuleView.extend({

    initialize: function(opts) {
        var thisView = this;

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // half-size big
            {w:4,h:4}  // biggest
        ],{silent:true});

        //create the data model
        thisView.dataModel = new BannerModuleCollection();

        // every time the geometry of the module changes, we need to grab and store the new dimensions
        this.on("geometryChanged", function(dims) {
            thisView.dims = dims;
            thisView.changeImageSize();
        });

        // on the completion of the module template load and render
        this.on('templateLoaded', function() {
            thisView.dataModel.on('loadDataFinished', function() {
                console.log("[INFO] BannerModuleModuleView: loadDataFinished triggered");

                thisView.renderSlides({});
            });

            thisView.on("finishedRendering", function() {
                thisView.startCycle({
                    fit: true,
                    containerResize: 1,
                    slideResize: false
                }, "dots"); //start the carousel
            });

            //retrieve the data
            thisView.dataModel.loadData();

        });

    },

    renderSlides: function(opts) {

        console.log("[INFO] BannerModuleCollection: renderSlides called using these slides: ", this.dataModel.models);

        var thisView = this,
            tplName = 'bannerSlideTpl',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'bannerModule/tpl/',
            $container = this.$el.find(".cycle");

        TemplateManager.get(tplName, function(tpl){

            thisView.dataModel.each(function(banner) {
                var bannerHtml = tpl( banner.toJSON() );
                banner.$el = $(bannerHtml);
                $container.append( banner.$el );
            });

            thisView.changeImageSize();
            thisView.trigger("finishedRendering");
        }, tplUrl);

    },

    changeImageSize: function() {
        var dimsAsString = this.dims.w + 'x' + this.dims.h;

        if( dimsAsString == '0x0' || dimsAsString == '1x1' ) {
            return;
        }

        this.dataModel.each(function(banner) {
            banner.set('bannerImageUrl', banner.get('bannerImageUrl'+dimsAsString));
            banner.$el.css('background-image', 'url('+banner.get('bannerImageUrl')+')');
        });
    }

});