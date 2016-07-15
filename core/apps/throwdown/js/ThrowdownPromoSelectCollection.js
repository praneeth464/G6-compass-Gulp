/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
ThrowdownPromoSelectModel,
ThrowdownPromoSelectCollection:true
*/
ThrowdownPromoSelectCollection = Backbone.Collection.extend({

    /**
     * G5.throwdown.dispatcher events triggered in this collection:
     *        event: promotionsLoaded
     *     location: loadData()
     *      purpose: announce that the AJAX call was successful and that the
     *               list(collection) of promotions has been loaded
     *
     * No event listeners for G5.throwdown.dispatcher in this collection
     */

    model: ThrowdownPromoSelectModel,

    initialize: function() {
        // console.log("(⌐■_■) THROWDOWN >> ThrowDownPromoSelectCollection initialized: ");
    },

    loadData: function() { 
        var thisCollection = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_THROWDOWN_PROMOTIONS,
            cache: false,
            success: function(serverResp) {
                var data = serverResp.data; // an array of throwdown promotions
                thisCollection.add(data);
                G5.throwdown.promoId = data[0].promoId;
                G5.throwdown.dispatcher.trigger('promotionsLoaded');
                G5.throwdown.promotionsLoaded = true; // use this for modules that may load after the event is triggered
            },
            error : function( jqXHR, textStatus, errorThrown ) {
                console.log("(ノಠ益ಠ)ノ︵ ┻━┻ [ERROR] ThrowdownPromoSelectCollection: ", jqXHR, textStatus, errorThrown);
            }
        });
    }
});