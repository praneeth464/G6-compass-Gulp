/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
ProfilePageAlertsTabAlertModel,
ProfilePageAlertsTabAlertsCollection:true
*/
ProfilePageAlertsTabAlertsCollection = Backbone.Collection.extend({
        model: ProfilePageAlertsTabAlertModel,
        sort_key: 'sortDate', // default sort key
        sort_inverse: false,

    initialize: function () {
        "use strict";
    },

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

    sortOrder: function (sortType, sortOrder){
        "use strict";        
            this.sort_key = sortType;
            //If sort order is not ascending, inverse the results.
            this.sort_inverse = (sortOrder !== 'asc');
            this.sort();
    },

    loadAlerts: function (props) {
        "use strict";
        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PROFILE_PAGE_ALERTS_TAB_ALERTS,
            data: props || {},
            success: function (servResp) {
                that.reset(servResp.data.ProfilePageAlertsTabAlerts);
                that.trigger('alertDataLoaded');
            }
        });
    }
});
