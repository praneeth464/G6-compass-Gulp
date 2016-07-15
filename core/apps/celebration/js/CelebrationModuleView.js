/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
ModuleView,
CelebrationModuleView:true
*/
CelebrationModuleView = ModuleView.extend({

    initialize:function() {
        var that = this;

        //this is how we call the super-class initialize function
        ModuleView.prototype.initialize.apply(this, arguments);

        //merge events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        this.$el.addClass('celebrationMainTile');

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:2,h:1},
            {w:2,h:2},
            {w:4,h:2},
            {w:4,h:4}
             // 2x2 square
        ],{silent:true});

        console.log("[INFO] CelebrationModuleView initialized ", this);
        var self = this;

        this.on('templateLoaded', function(){
            that.renderCycle();
            _.delay(G5.util.textShrink, 100, this.$el.find('.congrats-name'), {minFontSize:20});
            G5.util.textShrink( this.$el.find('.congrats-name'), {minFontSize:20});
            that.nameResize();
        });
    },
    renderCycle: function () {
        this.startCycle({
            fit: true,
            containerResize: 1,
            slideResize: false
        }, "dots");

    },
    nameResize: function () {
        var $nameContainer = this.$el.find('.celebrationCongratsInfo'),
            $name = $nameContainer.find('.congrats-name');

            if($name.outerWidth() < $name[0].scrollWidth){
                $name.css('word-break', 'break-word');
            }   
    }
});
