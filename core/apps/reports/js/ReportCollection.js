/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
console,
ReportModel,
ReportCollection:true
*/
ReportCollection = Backbone.Collection.extend({

    model: ReportModel,

    initialize:function(opts) {
        console.log("[INFO] ReportsCollection: initialized", this);
    },

    loadData:function() {
        'use strict';
        var thisCollection = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_REPORTS_ALL,
            data: {},
            error: function(jqXHR, textStatus, errorThrown) {
                thisCollection.trigger('dataLoadFailed', jqXHR, textStatus, errorThrown);
            },
            success: function(servResp){
                thisCollection.add(servResp.data.reports);
                thisCollection.trigger('dataLoaded');
            }
        });
    },

    getActiveReport: function() {
        return this._activeReport || null;
    },

    getActiveReportId: function() {
        return this._activeReport ? this._activeReport.get('id') : null;
    },

    setActiveReport: function(model) {
        this._activeReport = model;
        this.trigger('activeReportSet');
    },

    setActiveReportById: function(id) {
        this._activeReport = this.get(parseInt(id, 10));
        this.trigger('activeReportSet');
    }

});