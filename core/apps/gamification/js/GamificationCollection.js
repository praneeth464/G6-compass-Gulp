/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
GamificationCollection:true
*/

/**
    @class
    @extends Backbone.Collection
*/
GamificationCollection = Backbone.Collection.extend({

    initialize: function () {
        'use strict';
        //ARNxyzzy//// console.log("[INFO] GamificationCollection.initialize          ARNlogging");
        //ARNxyzzy// console.log("[INFO] GamificationCollection.initialize DONE (nothing at this point)     ARNlogging");
    },

    loadData: function () {
        'use strict';
        var that = this;

        if (G5.props.urlParams.debugGam) {
            G5.props.URL_JSON_GAMIFICATION = "ajax/gamification" + G5.props.urlParams.debugGam + ".json";
        }
        //ARNxyzzy// console.log("[INFO] GamificationCollection.loadData  debugGam=["+G5.props.urlParams.debugGam+"]          ARNlogging");

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_GAMIFICATION,
            success: function (servResp) {
                //feAssert//if (G5.props.urlParams.debugGam && G5.props.urlParams.debugGam.length > 0) {
                //feAssert//    feAssertPassOrFail(true, "Reading <a href='ajax/gamification"+G5.props.urlParams.debugGam+".json' target='_blank'>ajax/gamification"+G5.props.urlParams.debugGam+".json</a>");
                //feAssert//}
                //ARNxyzzy// console.log("[INFO] GamificationCollection loadData success    ARNlogging");
                //ARNxyzzy////debugger;
                that.reset(servResp.data.badgeInfo);
            },
            error: function (err) {
                //feAssert//if (G5.props.urlParams.debugGam && G5.props.urlParams.debugGam.length > 0) {
                //feAssert//    feAssert(false, "Problem reading ajax/gamification"+G5.props.urlParams.debugGam+".json");
                //feAssert//}
                //ARNxyzzy// console.log("[INFO] GamificationCollection loadData ERROR ERROR ERROR ERROR ERROR      ARNlogging");
                //ARNxyzzy////debugger;
                that.reset(err.data.badgeInfo);
            }
        });
        //ARNxyzzy// console.log("[INFO] GamificationCollection.loadData DONE       ARNlogging");
    }

});
