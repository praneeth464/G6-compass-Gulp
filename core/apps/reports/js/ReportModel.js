/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
console,
ReportModel:true
*/
ReportModel = Backbone.Model.extend({
    defaults: {

    },

    initialize: function(){
        var thisModel = this,
            url = this.get('url');

        // console.log("[INFO] ReportModel: initialized", this, this.collection);


        // dismantle the URL if it comes with an embedded query string and resave it with the parameters as an object
        this.set({
            url : url.split('?')[0],
            urlParams : new Backbone.Collection( $.query.load(url, {responseType: 'html'}, function(responseText, textStats, XMLHttpRequest){
                    G5.serverTimeout(responseText);
                }).keys )
            // EXPERIMENTAL: caching tabular data while moving around (NOPE, not yet)
        });
        // merge in some default sort and pagination values
        this.get('urlParams').at(0).set({
            sortedOn : 1,
            sortedBy : 'asc', // or desc
            pageNumber : 1,
            displayName : this.get('displayName')
        });
        // override results per page
        this.get('urlParams').at(0).set({
            resultsPerPage : G5.props.REPORTS_DETAIL_CUSTOM_RESULTS_PER_PAGE || this.get('urlParams').at(0).get('resultsPerPage')
        });
        // ditch the clearForm value
        this.get('urlParams').at(0).unset('clearForm');


        // event bindings
        this.on('fullDataLoaded', function() {
            thisModel._activeChart = thisModel.get('selectedChartId')
                ? _.find( thisModel.get('chartSet'), function(chart) { return chart.id == thisModel.get('selectedChartId'); } )
                : _.find( thisModel.get('chartSet'), function(chart) { return _.isEqual(chart, _.omit(thisModel._activeChart, 'data')); } )
                    ? thisModel._activeChart
                    : thisModel.get('chartSet')[0];
        });

        this.get('urlParams').on('activeUrlParamsSet', function() {
            // EXPERIMENTAL: if there is cached model data, retrieve it and shove it into the model
            // if( thisModel.getUrlParams().cachedModel ) {
            //     thisModel.set( thisModel.getUrlParams().cachedModel );
            //     thisModel.trigger('fullDataLoaded', { type : 'urlparams' });
            // }
            // else {
                thisModel.loadFullData({
                    force : true,
                    type : 'urlparams'
                });
            // }
        });
    },

    loadFullData: function(opts) {
        var thisModel = this,
            settings = {
                data : this.getUrlParams().toJSON(),
                force : false,
                type : null,
                addParams : false,
                displayName : this.getUrlParams().get('displayName')
            };

        settings = $.extend(true, settings, opts);

        // NOTE: originally, a user could switch between views without re-initializing, but the back end code resets itself entirely. notifyOnly was a way to ignore the resulting JSON response and render with the current view data. This has been turned off until the back end code is changed to accommodate.
        // NOTE: instead, we're going to tell the model to reset itself
        if( settings.data.resetModel ) {
            // unset the data loaded flag
            this._fullDataLoaded = false;
            // reset the URL params
            this.resetUrlParams();
            // reset the data object
            settings.data = $.extend({}, this.getUrlParams().toJSON(), {clearForm : settings.data.clearForm});
            // reset the displayName
            settings.displayName = settings.data.displayName;
            // reset the charts
            this._activeChart = null;
        }

        // if full data has already been loaded for this model and we aren't explicitly forcing another load or notifying the server of a switch, trigger the custom event and bail
        if( this._fullDataLoaded && !settings.force && !settings.data.notifyOnly ) {
            thisModel.trigger('fullDataLoaded');
            return true;
        }

        // if a full load has already been started and we're still waiting, bail and wait
        if( this._fullLoadInProgress ) {
            console.log('load in progress');
            return false;
        }

        // go ahead and start the load
        // first set the loading flag
        this._fullLoadInProgress = true;

        // clean the displayName and _activeChartId parameters out of the request data
        settings.data = _.omit(settings.data, ['displayName', '_activeChartId']);

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: this.get('url'),
            data: settings.data,
            error: function(jqXHR, textStatus, errorThrown) {
                thisModel.trigger('fullDataLoadFailed', jqXHR, textStatus, errorThrown);
            },
            success: function(servResp){
                // first, clear the loading flag
                thisModel._fullLoadInProgress = false;

                // then, set the data loaded flag
                thisModel._fullDataLoaded = true;

                // if we're only notifying the server, bail
                if( settings.data.notifyOnly ) {
                    thisModel.trigger('fullDataLoaded');
                    return true;
                }

                // unless directed by { addParams = true } to add a new params object, update the current urlParams
                if( settings.addParams === true ) {
                    thisModel.addToUrlParams( _.omit(settings.data, ['clearForm', 'dashboardItemId']) );
                }
                else {
                    thisModel.updateUrlParams( _.omit(settings.data, ['clearForm', 'dashboardItemId']) );
                }
                thisModel.updateUrlParams({ displayName : settings.displayName });

                // this gets set to true when moving up a breadcrumb trail, but it needs to be absent by default so we unset it to remove it from the params model
                thisModel.getUrlParams().unset('nodeAndBelow');
                // this gets set to true when clicking on the first item in a breadcrumb trail, but it needs to be absent by default so we unset it to remove it from the params model
                thisModel.getUrlParams().unset('rootLevel');

                // console.log(thisModel.get('urlParams'));

                // EXPERIMENTAL: store the current dataset with the urlParameters to act as a cache
                // var temp = thisModel.clone().unset('urlParams').toJSON();
                // thisModel.updateUrlParams({
                //     cachedModel : temp
                // });

                // fill up the model with the new data
                thisModel.set(servResp.data.report);

                // console.log(settings);
                // console.log(thisModel.toJSON());
                // console.log($.query.load(thisModel.get('url')));

                // if the type of data load is a 'urlparams' update, make sure we set the active chart id from whatever was cached prior
                if( settings.type == 'urlparams' ) {
                    thisModel.setActiveChartById( thisModel.getUrlParams().get('_activeChartId') );
                }

                // check to see if the result that comes back matches the active report as determined in the collection
                // this is useful for situations in which the user switches reports before the initial response comes back
                // if the ids match, we're golden and can fire our custom trigger that the View listens to before updating the UI
                if( thisModel.get('id') == thisModel.collection.getActiveReportId() ) {
                    thisModel.trigger('fullDataLoaded', { type : settings.type });
                }
                // if there is a data mismatch, we've already stored it in the model. we just don't want to fire the trigger that causes the UI to update
                else {
                    return false;
                }
            }
        });
    },

    setActiveChart: function(chart) {
        this._activeChart = chart;
        this.updateUrlParams({ _activeChartId : this.getActiveChartId() });
        this.trigger('activeChartSet');
    },

    setActiveChartById: function(id) {
        this.setActiveChart( _.find(this.get('chartSet'), function(set) { return set.id == id; }) );
        // this.updateUrlParams({ _activeChartId : this.getActiveChartId() });
    },

    setActiveChartByIndex: function(index) {
        this.setActiveChart( this.get('chartSet')[index] );
        // this.updateUrlParams({ _activeChartId : this.getActiveChartId() });
    },

    getActiveChart: function() {
        return this._activeChart;
    },

    getActiveChartId: function() {
        return this._activeChart ? this._activeChart.id : -1;
    },

    getActiveChartIndex: function() {
        // return _.indexOf(this.get('chartSet'), this._activeChart);
        return _.indexOf(_.pluck(this.get('chartSet'), 'id'), this.getActiveChartId());
    },

    resetActiveChart: function(index) {
        // index is optional. will otherwise reset to the first chart
        this.setActiveChartByIndex(index || 0);
    },

    getUrlParams: function(index) {
        // index is optional. will otherwise return the last one in the stack
        return (typeof index == 'number') ? this.get('urlParams').at( index ) : this.get('urlParams').last();
    },

    addToUrlParams: function(obj) {
        this.get('urlParams').add(obj);
    },

    resetUrlParams: function(index) {
        // index is optional. will otherwise take the root params and clear out everything after
        var params = this.getUrlParams(index || 0);
        // it's assumed that resetting the parameters means going back to defaults defined on lines 30-32
        params.set({
            sortedOn : 1,
            sortedBy : 'asc',
            pageNumber : 1
        });
        this.get('urlParams').reset(params);
    },

    updateUrlParams: function(obj, index) {
        // index is optional. will otherwise be added to the last one in the stack
        this.getUrlParams(index).set(obj);
    },

    setActiveUrlParams: function(index) {
        this.get('urlParams').remove( this.get('urlParams').rest( index + 1 ) );
        this.get('urlParams').trigger('activeUrlParamsSet');
    }

});
