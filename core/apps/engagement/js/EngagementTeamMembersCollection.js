/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
EngagementModel,
EngagementTeamMembersModel,
EngagementTeamMembersCollection:true
*/
EngagementTeamMembersCollection = Backbone.Collection.extend({

    model: EngagementTeamMembersModel,

    initialize: function(models, opts) {
        console.log('[INFO] EngagementTeamMembersCollection: initialized', this);

        var defaults = {
            // setting this to false relies on the View calling .loadData()
            autoLoad : true,
            meta : {
                count : 0,
                perPage : 10,
                page : 1,
                sortedOn : "member",
                sortedBy : "asc"
            }
        };

        this.options = $.extend(true, {}, defaults, opts);

        this.meta = this.options.meta;

        // if an existing Engagement Model was passed to this, create a reference.
        // or, create a new one
        this.engagementModel = this.options.engagementModel || new EngagementModel();
    },

    loadData: function(params) {
        var that = this,
            data = {};

        console.log('[INFO] EngagementTeamMembersCollection: load data started');

        // merge default data, stored params (with certain params omitted), and passed params
        data = $.extend(true, {}, data, _.omit(this.engagementModel.params, ['_drillDown']), params);

        $.ajax({
            url: G5.props.URL_JSON_ENGAGEMENT_TEAM_MEMBERS_COLLECTION,
            type: 'POST',
            data: data,
            dataType: 'g5json',
            beforeSend: function() {
                that.trigger('loadDataStarted');
            }
        })
        .done(function(servResp) {
            var collection = servResp.data.individuals || servResp.data.teams;

            if( collection ) {
                that.meta = $.extend(that.meta, collection.meta);
                that.reset(collection.members);
            }
            that.trigger('loadDataDone');
        });
    }
});
