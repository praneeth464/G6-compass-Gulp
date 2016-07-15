/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
KPMModel,
KPMTeamMembersModel,
KPMTeamMembersCollection:true
*/
KPMTeamMembersCollection = Backbone.Collection.extend({

    model: KPMTeamMembersModel,

    initialize: function(models, opts) {
        console.log('[INFO] KPMTeamMembersCollection: initialized', this);

        var settings = {
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

        this.settings = $.extend(true, {}, settings, opts);

        this.meta = this.settings.meta;

        // if an existing KPM Model was passed to this, create a reference.
        // or, create a new one
        this.kpmModel = this.settings.kpmModel || new KPMModel();
    },

    loadData: function(params) {
        var that = this,
            data = {};

        console.log('[INFO] KPMTeamMembersCollection: load data started');

        $.ajax({
            url: G5.props.URL_JSON_KPM_TEAM_MEMBERS_COLLECTION,
            type: 'POST',
            data: $.extend(true, {}, data, params),
            dataType: 'g5json',
            beforeSend: function() {
                that.trigger('loadDataStarted');
            }
        })
        .done(function(servResp) {
            var collection = servResp.data.collection;

            if( collection ) {
                that.meta = $.extend(that.meta, collection.meta);
                that.reset(collection.members);
            }
            that.trigger('loadDataDone');
        });
    }
});
