/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
EngagementRecognizedModel:true
*/
EngagementRecognizedModel = Backbone.Model.extend({
    initialize: function(data, opts) {
        console.log('[INFO] EngagementRecognizedModel: initialized', this);

        var defaults = {
            // setting this to false relies on the View calling .loadData()
            autoLoad: true,
            mode: 'user'
        };

        this.options = $.extend(true, {}, defaults, opts);

        // if an existing Engagement Model was passed to this, create a reference.
        // this will fail without one
        this.engagementModel = this.options.engagementModel || null;

        // store a page number for loading more
        this.set('page', 1);

        if( this.options.autoLoad === true ) {
            this.loadData();
        }
    },

    loadData: function(params) {
        var that = this,
            url = this.options.url || this.options.data.detailUrl || G5.props.URL_JSON_ENGAGEMENT_RECOGNIZED_COLLECTION,
            data = {
                mode: this.options.mode,
                type: this.options.type,
                userId: this.options.userId || this.engagementModel && this.engagementModel.get('userId') || null,
                nodeId: this.options.nodeId || this.engagementModel && this.engagementModel.get('nodeId') || null,
                page: this.get('page')
            };

        console.log('[INFO] EngagementRecognizedModel: load data started');

        // merge default data, options params, and passed params
        data = $.extend(true, {}, data, this.engagementModel && this.engagementModel.params ? this.engagementModel.params : {}, this.options.params || {}, params);
        data = _.omit(data, ['timeframeNavigate', 'timeframeName']);

        $.ajax({
            url: url,
            type: 'POST',
            data: data,
            dataType: 'g5json',
            beforeSend: function() {
                that.trigger('loadDataStarted', data);
            }
        })
        .done(function(servResp) {
            // if the response coming back is for page 2 or greater, we merge the participants carefully instead of overwriting entirely
            if( data.page && data.page > 1 ) {
                servResp.data.tree.participants = servResp.data.tree.participants.concat( that.get('participants') );

                that.set('page', data.page);
            }
            that.set(servResp.data.tree);

            if(servResp.data.tree !== null){
                that.processData();
            }

            that.trigger('loadDataDone');
        });
    },

    processData: function() {
        var paxes = this.get('participants'),
            nodeIds = _.uniq(_.pluck(paxes, 'nodeId')),
            nodes = [];

        _.each(nodeIds, function(nodeId) {
            var members = _.where(paxes, {"nodeId": nodeId});

            members[0].isFirst = true;
            members[members.length-1].isLast = true;

            nodes.push({
                "id" : nodeId,
                "name" : members[0].nodeName,
                "members" : members
            });
        });

        // nodes[0].isFirst = true;
        // nodes[nodes.length-1].isLast = true;

        this.set('nodes', nodes);
    }
});