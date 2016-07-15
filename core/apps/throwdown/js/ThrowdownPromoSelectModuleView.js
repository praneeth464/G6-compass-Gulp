/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
ModuleView,
TemplateManager,
ThrowdownPromoSelectCollection,
ThrowdownPromoSelectModuleView:true
*/
ThrowdownPromoSelectModuleView = ModuleView.extend({

    /**
     * G5.throwdown.dispatcher events triggered in this view:
     *        event: promoChanged
     *     location: changePromo()
     *      purpose: announce that a user has selected a different promotion
     *
     * Event listeners for G5.throwdown.dispatcher:
     *        event: promotionsLoaded, promoChanged
     *       action: calls renderPromoInfo()
     *      purpose: renders the promo select view when the inital set of
     *               promotions is loaded, or when the promotion is changed
     */

    events: {
        'click .td-promo-select-container': 'showHidePromoSelect',
        'click .td-promo-select-item': 'changePromo'
    },

    initialize: function(opts) {

        var thisView = this;

        $('body').on('click', this.checkPromoSelect);

        ModuleView.prototype.initialize.apply(this, arguments); // this is how we call the super-class initialize function (inherit its magic)
        this.events = _.extend({}, ModuleView.prototype.events, this.events); // inherit events from the superclass ModuleView

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 }
            ],
            { silent: true }
        );

        G5.throwdown.dispatcher.on('promotionsLoaded promoChanged', this.renderPromoInfo, this);

        this.collection = new ThrowdownPromoSelectCollection();
        this.collection.loadData();

        this.on('templateLoaded', function(){
            _.delay(G5.util.textShrink, 100, this.$el.find('.title-icon-view h3, .td-promo-countdown h4'));
            G5.util.textShrink( this.$el.find('.title-icon-view h3, .td-promo-countdown h4'));
        });

        // resize the text to fit
        this.moduleCollection.on('filterChanged', function() {
            G5.util.textShrink( this.$el.find('.title-icon-view h3, .td-promo-countdown h4') );
        }, this);
    },

    /**
     * Override the parent class's render method. The view's template should
     * wait to render until after the Promotion data has loaded.
     */
    render: function() {
        return this;
    },

    /**
     * Renders the view and starts the countdown clock
     */
    renderPromoInfo: function() {
        var thisView = this;

        this.getTemplateAnd(function(tpl){
            // empty the element in cases where the view needs to be rerendered with new data
            thisView.$el.empty();

            // when template manager has the template, render it to this element
            // pass thisView.collection.toJSON() as a 'promotion' attribute of an object to make Handlebars play nicer
            thisView.$el.append( tpl( _.extend({}, {promotion: thisView.collection.toJSON()}, {cid:thisView.cid}) ));

            // start the promotion countdown
            thisView.initCountdown(thisView.$el.find('.td-promo-countdown ul'), thisView.collection.first().toJSON().endDate);

            //in initial load, templates may miss out on filter event
            //so we do filter change work here just in case
            thisView.doFilterChangeWork();

            thisView.$el.find('.td-promo-select-item').first().css('display', 'none');
        });

        this.updateHref();
    },

    /**
     * Shows or hides the promotion select dropdown
     */
    showHidePromoSelect: function(e) {
        var $psl = this.$el.find('.td-promo-select-list'),
            $dac = this.$el.find('.down-arrow-container');

        if (this.$el.find('.td-promo-select-list:hidden').length > 0) {
            e.stopPropagation();
            $psl.slideDown(250);
            $dac.addClass('active');
        } else {
            $psl.slideUp(250);
            $dac.removeClass('active');
        }
    },

    /**
     * This will hide the promo select dropdown if a user clicks anywhere else on the page
     */
    checkPromoSelect: function(e) {
        if ($('.td-promo-select-list:visible').length > 0) {
            $('.td-promo-select-list:visible').slideUp(250);
            $('.down-arrow-container').removeClass('active');
        }
    },

    /**
     * Get the promotion ID from the selected item and moves that promotion to
     * the beginning of the collection. Next it sets the promoId in the
     * G5.throwdown object and announces that the promotion has changed.
     *
     * @param e  The event object that triggered this method call
     */
    changePromo: function(e) {
        var promoId = $(e.currentTarget).data('promoid');
        var selectedPromo = this.collection.get(promoId);
        this.showHidePromoSelect();

        if (G5.throwdown.promoId === promoId) { // do nothing if same promotion is selected
            return;
        } else {
            this.collection.remove(selectedPromo);
            this.collection.unshift(selectedPromo);
            G5.throwdown.promoId = promoId;
            G5.throwdown.dispatcher.trigger('promoChanged');
        }
    },

    /**
     * Stops the countdown clock and makes the call to rerender this view
     */
    collectionChanged: function() {
        clearInterval(G5.throwdown.roundCountdown);
        this.renderPromoInfo();
    },

    /**
     * Handles the promotion round countdown clock in this view
     *
     * @param clock       jQuery object of the parent element of the countdown timer
     * @param targetdate  A date string of any type that is accepted by the JS Date object
     *                    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
     */
    initCountdown: function($clock, targetdate) {
        var t = new Date(targetdate);

        function calcDate() {
            var n = new Date();   // current date (now)
            var i = (t-n) / 1000; // difference between target and now
            var c = {};           // object representing the countdown
            var x;

            if ( n >= t ) {
                clearInterval(G5.throwdown.roundCountdown);
            }
            else {
                c.d = Math.floor( i / 86400 );
                c.h = Math.floor( i / 3600 % 24 );
                c.m = Math.floor( i / 60 % 60 );
                c.s = Math.floor( i % 60 );
            }

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

            return false; // return false to prevent mobile safari from jumping to top of page
        }

        // run it the first time, then every second
        calcDate();
        G5.throwdown.roundCountdown = setInterval( calcDate, 1000 );
    },

    /**
     * Update the href attribute of the View Matches .visitAppBtn
     */
    updateHref: function() {
        var
        $anchor = this.$el.find('.visitAppBtn'),
        href = $anchor.attr('href');

        $anchor.attr( 'href', this.collection.first().get('matchesUrl') );
    }
});
