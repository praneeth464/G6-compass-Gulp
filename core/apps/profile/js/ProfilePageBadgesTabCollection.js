/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
ProfilePageBadgesTabCollection:true
*/
/**
    @class
    @extends Backbone.Collection
*/
ProfilePageBadgesTabCollection = Backbone.Collection.extend({

    initialize: function (opts) {
        'use strict';

        this.dataUrl = opts && opts.dataUrl ? opts.dataUrl : G5.props.URL_JSON_GAMIFICATION_DETAIL;
        this.dataParams = opts && opts.dataParams ? opts.dataParams : {};
        //console.log('[INFO] ProfilePageBadgesTabCollection: dataUrl dataParams', this.dataUrl, this.dataParams);
        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageBadgesTabCollection.initialize DONE");
    },

    loadData: function () {
        'use strict';
        var that = this;

        if (G5.props.urlParams.debugGam) {
            G5.props.URL_JSON_GAMIFICATION_DETAIL = "ajax/gamificationDetail" + G5.props.urlParams.debugGam + ".json";
        }
        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageBadgesTabCollection.loadData  debugGam=["+G5.props.urlParams.debugGam+"]          ARNlogging");

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: this.dataUrl,
            data: this.dataParams,
            success: function (servResp) {
                //feAssert//if (G5.props.urlParams.debugGam && G5.props.urlParams.debugGam.length > 0) {
                //feAssert//    feAssertPassOrFail(true, "Reading <a href='ajax/gamificationDetail"+G5.props.urlParams.debugGam+".json' target='_blank'>ajax/gamificationDetail"+G5.props.urlParams.debugGam+".json</a>");
                //feAssert//}
                //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageBadgesTabCollection loadData success    ARNlogging");
                //ARNxyzzy////debugger;
                that.reset(servResp.data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                //feAssert//if (G5.props.urlParams.debugGam && G5.props.urlParams.debugGam.length > 0) {
                //feAssert//    feAssert(false, "Problem reading ajax/gamificationDetail"+G5.props.urlParams.debugGam+".json");
                //feAssert//}
                //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageBadgesTabCollection loadData ERROR ERROR ERROR ERROR ERROR      ARNlogging");
                //ARNxyzzy////debugger;
                // that.reset(err.data);
                that.trigger('loadError', jqXHR, textStatus, errorThrown);
            }
        });
        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageBadgesTabCollection.loadData DONE       ARNlogging");
    }

});
