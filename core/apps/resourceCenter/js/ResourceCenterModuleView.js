/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
ModuleView,
ResourceCenterModuleView:true
*/
ResourceCenterModuleView = ModuleView.extend({

    initialize:function() {

        //this is how we call the super-class initialize function
        ModuleView.prototype.initialize.apply(this, arguments);

        //merge events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon-only - smallest
            {w:2,h:1}, // icon+title
            {w:2,h:2} // 2x2 square
        ],{silent:true});

        console.log("[INFO] resourceCenterModuleView initialized ", this);
        var self=this;
        this.displayQTip=false;

        var buildToolTip = function ($resourceCenterModule){

            $resourceCenterModule.qtip({
                content:{
                    text: $resourceCenterModule.find("ul").clone().css({"list-style": "none", "margin": 0}) // taking the content from the module rather than writing another template
                },
                position:{
                    my: 'right middle',
                    at: 'center',
                    container: this.$container||$('body'),
                    viewport: $('.moduleContainerViewElement')
                },
                show: false,
                hide:{
                    event:'unfocus',
                    fixed:true,
                    delay:200
                },
                style:{
                    padding: 0,
                    classes:'ui-tooltip-shadow ui-tooltip-light resourceCenterTooltip',
                    tip: {
                        corner: true,
                        width: 20,
                        height: 10
                    }
                },
                events: {
                    hide: function(event, api) {
                        self.displayQTip = false;
                    },
                    show:function(event, api) {
                        self.displayQTip = true;
                    }
                }
            });
        };

        this.on('templateLoaded', function() {
            console.log("[INFO] resourceCenterModuleView: attaching tooltip to this module: ", this.$el);

            buildToolTip(this.$el.find('.module-liner'));

            //if the resourceCenter module is 2X2, disable the tooltip
            if (this.$el.hasClass("grid-dimension-2x2")){
                //this.$el.qtip("disable");
                this.$el.unbind('click');
            } else {
                this.bindToolTip();
            }

            // resize the text to fit
            // the delay is to wait for custom fonts to load
            G5.util.textShrink( this.$el.find('.wide-view h3') );
            _.delay(G5.util.textShrink, 100, this.$el.find('.wide-view h3'));
        }, this);

        //hide body relative elements on goemetry change
        this.on('beforeGeometryChange',function(){
            if( this.$el.hasClass("grid-dimension-2x2") ) {
                this.$el.qtip('disable');
                this.$el.unbind('click'); //make sure the newly revealed hyperlinks have the click event
            }
            else {
                self.bindToolTip(); //in case the click event was unbound by 2x2 module
                this.$el.qtip('enable');
                this.$el.qtip('hide');
            }
        }, this);

        // resize the text to fit
        this.moduleCollection.on('filterChanged', function() {
            G5.util.textShrink( this.$el.find('.wide-view h3') );
        }, this);
    },

    bindToolTip: function() {
        var $theModule = this.$el.find('.module-liner'),
            self = this;
        $theModule.off(); //remove any previous event bindings

        $theModule.on('click', function(e){
            // e.preventDefault ? e.preventDefault() : e.returnValue = false;
            e.preventDefault(); // I'm fairly certain that the proper jQ event handler takes care of the IE-specific mess on the above line
            if (self.displayQTip === true){
                $theModule.qtip('hide');
            } else {
                $theModule.qtip('show');
            }
        });
    }
});
