/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
CelebrationAnniversaryFactsModuleView:true
*/
CelebrationCongratsModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        ModuleView.prototype.initialize.apply(this, arguments); // this is how we call the super-class initialize function (inherit its magic)
        this.events = _.extend({}, ModuleView.prototype.events, this.events); // inherit events from the superclass ModuleView

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 }
                
            ],
            { silent: true }
        );

        this.on('templateLoaded', function(){
            _.delay(G5.util.textShrink, 100, this.$el.find('.congrats-name'), {minFontSize:20});
            G5.util.textShrink( this.$el.find('.congrats-name'), {minFontSize:20});
            that.nameResize();
        });
    },
    nameResize: function () {
        var $nameContainer = this.$el.find('.celebrationCongratsInfo'),
            $name = $nameContainer.find('.congrats-name');

            if($name.outerWidth() < $name[0].scrollWidth){
                $name.css('word-break', 'break-all');
            }           
    }
});
