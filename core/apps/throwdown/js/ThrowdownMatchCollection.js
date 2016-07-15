/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
ThrowdownMatchModel,
ThrowdownMatchCollection:true
*/
ThrowdownMatchCollection = Backbone.Collection.extend({

    /**
     * Event listeners for G5.throwdown.dispatcher:
     *        event: promotionsLoaded, promoChanged
     *       action: calls loadData()
     *      purpose: when promotions get loaded or changed this fetches a JSON
     *               feed containing a list of match details
     */

    model: ThrowdownMatchModel,

    initialize: function() {
        // console.log("(�?■_■) THROWDOWN >> Throwdown Collection initialized", this);
        G5.throwdown.dispatcher.on('promotionsLoaded promoChanged', this.loadData, this);
    },

    loadData: function() { 
        var thisCollection = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_THROWDOWN_MATCHES + G5.throwdown.promoId,
            cache: false,
            success: function(serverResp) {
                var data = serverResp.data; // an array of throwdown matches
                // console.log("(�?■_■) THROWDOWN >> ThrowdownMatchCollection LoadData success - thisCollection: ", thisCollection);

                thisCollection.reset(data); // need to ensure each call resets the collection and doesn't just add new items to it
                thisCollection.trigger('matchDataLoaded');
            },
            error : function( jqXHR, textStatus, errorThrown ) {
                console.log("[ERROR] ThrowdownMatchCollection: ", jqXHR, textStatus, errorThrown);
            }
        });
    }
});
