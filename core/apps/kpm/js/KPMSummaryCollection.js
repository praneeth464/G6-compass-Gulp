/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
KPMModel,
KPMSummaryModel,
KPMSummaryCollection:true
*/
KPMSummaryCollection = Backbone.Collection.extend({

    model: KPMSummaryModel,

    initialize: function(models, opts) {
        console.log('[INFO] KPMSummaryCollection: initialized', this);

        var settings = {
            // setting this to false relies on the View calling .loadData()
            autoLoad: true
        };

        this.settings = $.extend(true, {}, settings, opts);

        // if an existing KPM Model was passed to this, create a reference.
        // or, create a new one
        this.kpmModel = this.settings.kpmModel || new KPMModel();

        // if data was passed to this, we populate it immediately
        // this seems unnecessary as passing 'models' to the init should handle this
        if( this.settings.data ) {
            this.reset(this.settings.data);
        }
        // otherwise, check to see if autoloading is OK and then go get the data
        else if( this.settings.autoLoad === true) {
            this.loadData();
        }
    },

    loadData: function(params) {
        var that = this,
            data = {};

        console.log('[INFO] KPMSummaryCollection: load data started');

        $.ajax({
            url: G5.props.URL_JSON_KPM_SUMMARY_COLLECTION,
            type: 'POST',
            data: $.extend(true, {}, data, params),
            dataType: 'g5json',
            beforeSend: function() {
                that.trigger('loadDataStarted');
            }
        })
        .done(function(servResp) {
            var kpm = servResp.data.kpm;

            if( kpm ) {
                that.kpmModel.set(kpm);

                if( kpm.summary ) {
                    that.reset(kpm.summary);
                }
            }
            that.trigger('loadDataDone');
        });
    }
});
