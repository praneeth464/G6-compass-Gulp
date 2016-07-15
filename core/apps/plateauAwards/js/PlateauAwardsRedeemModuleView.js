/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
G5,
$,
ModuleView,
TemplateManager,
PlateauAwardsRedeemModel,
PlateauAwardsRedeemModuleView:true
*/
PlateauAwardsRedeemModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var thisView = this;

         //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //dev module specific init stuff here

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 }
            ],
            { silent: true }
        );

        this.redeemAwardModel = new PlateauAwardsRedeemModel();

        //when the module template is loaded
        this.on('templateLoaded',function(){
            thisView.redeemAwardModel.loadData();
            thisView.resizePromoName();

        },this);

        this.redeemAwardModel.on('dataLoaded', function(){
            thisView.renderPromotions();
        });

    },

    events: {
        "click .promotion-info.active": "showRedeemBtn"

    },

    renderPromotions: function () {
        var thisView = this,
            tplName = 'plateauAwardsRedeemPromotionsTpl',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'plateauAwards/tpl/',
            $container = this.$el.find(".module-content");

        TemplateManager.get(tplName, function(tpl){
            $container.append(tpl(thisView.redeemAwardModel.toJSON()));

            thisView.renderCountdown();
            thisView.resizePromoName();

            //add class for styling multiple vs. single promotion(s) and trigger a click on the first item.
            if($container.find('.redeem-multi-promotion').length){
                thisView.$el.find('.module-liner').addClass('multiple');
            }

        }, tplUrl);

    },

    renderCountdown: function(){
        var self = this,
            countdownInterval;

        _.each(this.$el.find('.promotion-info'), function(promotion) {
            var endDate = $(promotion).data('endDate'),
                $countdownEl = $(promotion).find('.redeemCountdown');

            self.initCountdown($countdownEl, endDate, countdownInterval);

        });

    },

    initCountdown: function($clock, targetdate, interval) {
        var t = new Date(targetdate),
            model = this.redeemAwardModel,
            promotions = model.get('promotions'),
            that = this;

        function calcDate() {
            var n = new Date();   // current date (now)
            var i = (t-n) / 1000; // difference between target and now
            var c = {};           // object representing the countdown
            var x;


            if ( n >= t && promotions.length == 1) {
                clearInterval(interval);
            }

            else {
                c.d = Math.floor( i / 86400 );
                c.h = Math.floor( i / 3600 % 24 );
                c.m = Math.floor( i / 60 % 60 );
                c.s = Math.floor( i % 60 );
            }

            //Set expiration date formatted to mm/dd/yyyy
            //$clock.siblings('.expiration-date').find('span').html(formattedDate);

            // If we have multiple promotions display either days, hours or minutes
            if(promotions.length > 1){
                if(c.d > 0){
                    $clock.find('.time-display').html(c.d);

                    $clock.find('.time-label.days').show();

                    if (c.d >= 7){
                        $clock.addClass('weeks');
                    }

                    return;
                }

                if(c.h > 0) {
                    $clock.find('.time-display').html(c.h);

                    $clock.find('.time-label.hours').show();

                    return;
                }

                if(c.m > 0) {
                    $clock.find('.time-display').html(c.m);

                    $clock.find('.time-label.minutes').show();

                    return;
                }

                //if countdown is over show expired text
                if(c.s <= 0){
                    $clock.addClass('expired').find('.time-label.expired').show();

                    that.$el.find('.promotion-info a').attr('href', "javascript:void(0)").attr('disabled', 'disabled');
                }

            }
            // if only one promotion show the full timer
            else {
                for ( x in c ) {
                    if (c.hasOwnProperty(x)) {
                        var temp = c[x].toString();
                        if( temp.length === 1 ) {
                            c[x] = '0'+temp;
                        }
                        else {
                            c[x] = temp;
                        }

                        $clock.find('.'+x+' span.cd-digit').html(c[x]);
                    }
                }
            }

            return false; // return false to prevent mobile safari from jumping to top of page
        }


        // run it the first time
        calcDate();

        // if only one promotion run every second
        if(promotions.length == 1 ){
            interval = setInterval( calcDate, 1000 );
        }
    },


    resizePromoName: function () {

        G5.util.textShrink( this.$el.find('.promo-name'), {minFontSize:14} );
        _.delay(G5.util.textShrink, 100, this.$el.find('.promo-name'), {minFontSize:14} );

    },

    showRedeemBtn: function (e) {
        var $tar = $(e.target).closest('li'),
            $redeemCont = $tar.find('.redeem-btn');

        $redeemCont.slideToggle();
    }

});
