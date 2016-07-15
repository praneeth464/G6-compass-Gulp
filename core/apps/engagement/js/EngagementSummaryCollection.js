/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
EngagementModel,
EngagementSummaryModel,
EngagementSummaryCollection:true
*/
EngagementSummaryCollection = Backbone.Collection.extend({

    model: EngagementSummaryModel,

    initialize: function(models, opts) {
        console.log('[INFO] EngagementSummaryCollection: initialized', this);

        var defaults = {
            // setting this to false relies on the View calling .loadData()
            autoLoad: true,
            mode: 'user'
        };

        this.options = $.extend(true, {}, defaults, opts);

        // if an existing Engagement Model was passed to this, create a reference.
        // or, create a new one
        this.engagementModel = this.options.engagementModel || new EngagementModel(null, {autoLoad: false, mode: this.options.mode});

        // if data was passed to this, we populate it immediately
        // this seems unnecessary as passing 'models' to the init should handle this
        if( this.options.data ) {
            this.reset(this.options.data);
        }
        // otherwise, check to see if autoloading is OK and then go get the data
        else if( this.options.autoLoad === true ) {
            this.loadData();
        }
    },

    loadData: function(params) {
        var that = this,
            data = {
                mode: this.options.mode
            };

        console.log('[INFO] EngagementSummaryCollection: load data started');

        $.ajax({
            url: G5.props.URL_JSON_ENGAGEMENT_SUMMARY_COLLECTION,
            type: 'POST',
            data: $.extend(true, {}, data, params),
            dataType: 'g5json',
            beforeSend: function() {
                that.trigger('loadDataStarted');
            }
        })
        .done(function(servResp) {
            var engagement = servResp.data.engagement;

            if( engagement ) {
                that.engagementModel.set( that.engagementModel.processData(engagement) );

                if( engagement.summary ) {
                    that.reset(engagement.summary);
                }
            }
            that.trigger('loadDataDone');
        });
    }
});
