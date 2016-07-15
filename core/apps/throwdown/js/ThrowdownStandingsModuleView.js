/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
ModuleView,
TemplateManager,
ThrowdownStandingsModuleView:true
*/
ThrowdownStandingsModuleView = ModuleView.extend({
    initialize: function(opts){
        var thisView = this;

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({}, ModuleView.prototype.events, this.events);

        this.model.set(
            'allowedDimensions', [
                { w:1, h:1 },
                { w:2, h:1 }
            ],
            { silent: true }
        );

        this.on('templateLoaded', function(){
            _.delay(G5.util.textShrink, 100, this.$el.find('.title-icon-view h3'));
            G5.util.textShrink( this.$el.find('.title-icon-view h3'));
            this.updateHref();
        });

        G5.throwdown.dispatcher.on('promotionsLoaded promoChanged', this.updateHref, this);

        // resize the text to fit
        this.moduleCollection.on('filterChanged', function() {
            G5.util.textShrink( this.$el.find('.title-icon-view h3') );
        }, this);
        
    },
    updateHref: function() {
        var $anchor = this.$el.find('.visitAppBtn'),
            href = $anchor.attr('href');

        $anchor.attr('href', href + G5.throwdown.promoId);

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_THROWDOWN_STANDINGS_LINK,
            data: { promotionId: G5.throwdown.promoId },
            success: function(serverResp){
                $anchor.attr('href', serverResp.data.standingsUrl);
            },
            error: function(jqXHR, textStatus){
                console.log( "[INFO] ThrowdownStandingsModuleView request failed: " + textStatus );
            }
        });
    }
});
