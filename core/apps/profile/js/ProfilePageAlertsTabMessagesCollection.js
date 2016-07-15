/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
ProfilePageAlertsTabMessagesModel,
ProfilePageAlertsTabMessagesCollection:true
*/
ProfilePageAlertsTabMessagesCollection = Backbone.Collection.extend({
    model: ProfilePageAlertsTabMessagesModel,
    sort_key: 'sortDate', // default sort key

    initialize: function () {
        "use strict";
    },

    /*
    // turned off because it appears IE sorts things backwards (or this function is written poorly)
    comparator: function (a, b) {
        "use strict";
        //Compare A to B
        var result = a.get(this.sort_key) > b.get(this.sort_key) ? 1 : -1;
        //Invert results
        if (this.sort_inverse){
            result=-result;
        }
        //If results are equil, return a 0 case.
        return a===b ? 0: result;
    },

    // turned off because we are trusting the sort order of the results in the server response
    sortOrder: function (sortType, sortOrder){
        "use strict";
            this.sort_key = sortType;
            this.sort_inverse = (sortOrder !== 'asc');
            console.log(this.toJSON());
            this.sort();
            console.log(this.toJSON());
            console.log("sortType: _"+sortType+ "_ sortOrder: _"+ sortOrder+"_");

    },
    */

    loadMessages: function (props) {
        'use strict';
        var that = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PROFILE_PAGE_ALERTS_TAB_MESSAGES,
            data: props || {},
            success: function (servResp) {
                that.reset(servResp.data.ProfilePageAlertsTabMessages);
                that.messagesMeta = servResp.data.meta;
                that.messageCounter = servResp.data.messageCounter;
                that.trigger('messageDataLoaded');
            },
            error: function (a, b, c) {
                console.log('the error in the ajax call:');
                console.log(c);
            }
        });
    }
});
