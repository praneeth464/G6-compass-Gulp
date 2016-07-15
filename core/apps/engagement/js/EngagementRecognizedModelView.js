/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
TemplateManager,
EngagementRecognizedModel,
EngagementRecognizedModelView:true
*/
EngagementRecognizedModelView = Backbone.View.extend({
    initialize: function() {
        console.log('[INFO] EngagementRecognizedModelView: initialized', this);

        var defaults = {};

        this.options = $.extend(true, {}, defaults, this.options);

        this.tplName = this.options.tplName || 'engagementRecognized';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'engagement/tpl/';


        this.$el.addClass('type_' + (this.options.detail.type || this.options.type || null) );

        this.model = new EngagementRecognizedModel(null, {
            autoLoad: false, // always set this to false in the model init so we can attach listeners below
            mode: this.options.mode || 'user',
            userId: this.options.userId || null,
            nodeId: this.options.nodeId || null,
            type: this.options.detail.type || this.options.type || null,
            data: this.options.detail.data || this.options.data || {},
            url: this.options.modelUrl || null,
            params: this.options.modelParams || null,
            engagementModel: this.options.engagementModel
        });

        // model listeners
        this.model.on('loadDataStarted', function(data) {
            // if we're loading a page greater than 1, set classes: 'showMore' in the spinner util
            G5.util.showSpin(this.$el, {classes: data.page && data.page > 1 ? 'showMore' : ''});
        }, this);
        this.model.on('loadDataDone', this.render, this);

        // view listeners
        this.on('renderStarted', this.preRender, this);
        this.on('renderDone', this.postRender, this);

        // run the loadData() if autoLoad is true
        if( this.options.autoLoad === true ) {
            this.model.loadData();
        }
    },

    events: {
        'click .participant-popover' : 'attachParticipantPopover',
        'click .showMore' : 'handleShowMore'
    },

    render: function() {
        var that = this,
            json = that.model.toJSON();

        G5.util.showSpin(this.$el);

        this.trigger('renderStarted', json);

        TemplateManager.get(this.tplName, function(tpl) {
            that.$el.empty().append( tpl(json) );

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
    },

    preRender: function(json) {
        json.mode = this.options.mode || 'user';
        json.type = this.options.detail.type || this.options.type || null;

        this.sortNodes();
    },

    postRender: function() {
    },
    sortNodes: function() {
        var nodes = this.model.get('nodes'),
            total = 0,
            nodeTotal= [];

        _.each(nodes, function(node, index){
            var members = node.members;

            for( var i = 0; i<= node.members.length -1; i++ ){
                memberCount = node.members[i].count;
                total = memberCount+total;
            }

            nodeTotal = {
                "countTotal": total
            };

            nodes[index] = $.extend({}, node, nodeTotal);

            total = 0;
        });

        nodes.sort(function(a,b){
            if(a.countTotal < b.countTotal){
                return 1;
            }
            if(a.countTotal > b.countTotal){
                return - 1;
            }
            return 0;
        });

        nodes[0].isFirst = true;
        nodes[nodes.length-1].isLast = true;

    },
    attachParticipantPopover: function(e) {
        var $tar = $(e.target).parent('.participant-popover');

        e.preventDefault();

        //attach participant popovers and show
        if(!$tar.data('participantPopover')){
            $tar.participantPopover().qtip('show');
        }
    },

    handleShowMore: function(e) {
        var page = this.model.get('page');

        e.preventDefault();

        this.model.loadData({
            page: page + 1
        });
    }
});