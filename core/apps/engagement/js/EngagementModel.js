/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
EngagementModel:true
*/
EngagementModel = Backbone.Model.extend({
    initialize: function(attributes, opts) {
        console.log('[INFO] EngagementModel: initialized', this);

        var defaults = {
            // setting this to false relies on the View calling .loadData()
            autoLoad: true,
            mode: 'user'
        };

        this.options = $.extend(true, {}, defaults, opts);

        // if data was passed to this, we populate it immediately
        // this seems unnecessary as passing 'attributes' to the init should handle this
        if( this.options.data ) {
            this.set(this.processData(this.options.data));
        }
        // otherwise, check to see if autoloading is OK and then go get the data
        else if( this.options.autoLoad === true) {
            this.loadData();
        }

        this.params = this.params || {};
    },

    loadData: function(params, url) {
        var that = this,
            data = {
                mode: this.options.mode
            };

        url = url || G5.props.URL_JSON_ENGAGEMENT_MODEL;

        console.log('[INFO] EngagementModel: load data started');

        // clear out any existing errors
        this.set({errors: null});

        // merge default data, stored params (with certain params omitted), and passed params
        data = $.extend(true, {}, data, _.omit(this.params, ['_drillDown']), params);

        $.ajax({
            url: url,
            type: 'POST',
            data: data,
            dataType: 'g5json',
            beforeSend: function() {
                that.trigger('loadDataStarted');
            }
        })
        .done(function(servResp) {
            var engagement = servResp.data.engagement;

            if( servResp.getErrors().length ) {
                that.set({errors: servResp.getErrors()});
                // if there is any data in the engagement object, we need to store it for rendering
                // this will most likely just be the timeframe attributes
                if( engagement ) {
                    that.set(engagement);
                }
                that.trigger('loadDataReturnedErrors');
                return false;
            }

            if( engagement ) {
                // store the url and parameters
                that.url = url;
                that.params = data;

                // do a little data manipulation
                engagement = that.processData(engagement);

                that.set(engagement);
            }
            that.trigger('loadDataDone');
        });
    },

    processData: function(data) {
        data.nodes = data.nodes || [];
        data.selectedNodes = _.where(data.nodes, {selected : true});
        data._allNodesSelected = data.selectedNodes.length == data.nodes.length;

        // targets are only hidden when a user is viewing his/her own stats OR when isScoreActive is false
        // therefore, if the mode passed in the options object is "team" we know that it's a manager viewing the page and we need to check isScoreActive
        // otherwise, it is a user page and the targets are false by default or turned on via the the JSON (data)
        data.areTargetsShown = this.options.mode == 'team' && data.isScoreActive === true ? true : data.areTargetsShown || false;

        this.params.nodeId = _.pluck(data.selectedNodes, 'id').toString();
        this.params.userId = data.userId;

        // the timeframe parameters need to defer to what the JSON says, as we don't dynamically update these on the FE
        this.params.timeframeType = data.timeframeType;
        this.params.timeframeMonthId = data.timeframeMonthId;
        this.params.timeframeYear = data.timeframeYear;
        this.params.timeframeName = data.timeframeName;

        return data;
    }
});
