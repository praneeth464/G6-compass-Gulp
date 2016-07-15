/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
CelebrationEcardModuleView:true
*/
CelebrationEcardModuleView = ModuleView.extend({

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

        this.on('geometryChanged', function(){
            if(that.$el.position().left == 0){
                //that.$el.addClass('stacked');
                that.$el.find('.celebrationCongratsEcard').animate({
                    height: '320px',
                    width: '320px',
                    left: 0,
                    top: 0
                });
            } else {
                that.$el.find('.celebrationCongratsEcard').animate({
                    height: '214px',
                    width: '214px',
                    left: '52px',
                    top: '30px'
            });
            }
            
        });

    }
});
