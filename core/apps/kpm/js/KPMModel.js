/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
KPMModel:true
*/
KPMModel = Backbone.Model.extend({
    initialize: function(attributes, opts) {
        console.log('[INFO] KPMModel: initialized', this);

        var settings = {
            // setting this to false relies on the View calling .loadData()
            autoLoad: true
        };

        settings = $.extend(true, {}, settings, opts);

        // if data was passed to this, we populate it immediately
        // this seems unnecessary as passing 'attributes' to the init should handle this
        if( settings.data ) {
            this.set(settings.data);
        }
        // otherwise, check to see if autoloading is OK and then go get the data
        else if( settings.autoLoad === true) {
            this.loadData();
        }
    },

    loadData: function(params) {
        var that = this,
            data = {};

        console.log('[INFO] KPMModel: load data started');

        $.ajax({
            url: G5.props.URL_JSON_KPM_MODEL,
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
                that.set(kpm);
            }
            that.trigger('loadDataDone');
        });
    }
});
