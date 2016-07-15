/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
G5,
ModuleView,
TipCollection,
TipModuleView:true
*/
TipModuleView = ModuleView.extend({

    initialize: function(opts) {

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:2,h:2} // 2x2 square
        ],{silent:true});

        // on the completion of the module template load and render
        this.on('templateLoaded', function() {
            var thisView = this;

            //create the tip data model 
            this.dataModel = new TipCollection();

            this.dataModel.on('loadDataFinished', function() {

                var randomTips = thisView.dataModel.getRandomTips(10); // closure keeps the tips array
                var specicficTip = thisView.dataModel.getSpecificTip(1001);

                thisView.renderTips(null, null, randomTips);

                thisView.startCycle({
                    fit: true,
                    containerResize: false
                }, "dots"); //start the carousel
            
            });

            this.dataModel.on('preLoadDataFinished', function(){
                console.log("[INFO] TipModuleView: preLoadDataFinished triggered");

                var randomizedTips = thisView.dataModel.getRandomTips(10);

                thisView.renderTips(null, null, randomizedTips);

                thisView.startCycle({
                    fit: true,
                    containerResize: false
                }, "dots"); //start the carousel
            });

            //retrieve the tip data
            this.dataModel.loadData();
            
        });

    },

    events: {
        'mouseenter' : "proxyMouseenter",
        'mouseleave'  : "proxyMouseleave"
    },

    renderTips: function(tipID, opts, tipArray) {

        console.log("[INFO] TipModuleView: renderTips called using these tips: ", tipArray);

        var thisView = this,
            defaults = {
                $target: this.$el.find("#tipText"),  // JQ object
                classe: null,       // array
                callback: null      // function
            },
            settings = opts ? _.defaults(opts, defaults) : defaults,
            tip = this.model.length > 0 ? this.model.get(tipID) : this.model,
            tplName = 'tipModel',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'tip/tpl/',
            i,
            tipArrayLength = tipArray.length - 1;

        for (i = 0; i <= tipArrayLength; i++) {
            var theTip = tipArray[i].get("text");
            
            settings.$target.append("<div class='aTip'><p>" + theTip + "</p></div>");
        }

        if (tipArrayLength === 0){ //if only one tip, cycle won't fire. Show manually 
            settings.$target.find(".aTip").css("display", "block");
        }   
    },

    // pausing the carousel on hover. The carousel itself can do this, but the greater module needs specific handling
    proxyMouseenter: function(e) {
        this.$el.find(".cycle").cycle('pause');
    },
    proxyMouseleave: function(e) {
        this.$el.find(".cycle").cycle('resume');
    }

});