/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
KPMSummaryCollectionView,
KPMTeamMembersView,
KPMModel,
KPMModelView:true
*/
KPMModelView = Backbone.View.extend({
    className : "kpmModelView",

    initialize: function(opts) {
        console.log('[INFO] KPMModelView: initialized', this);

        var settings = {};

        this.settings = $.extend(true, {}, settings, opts);

        this.tplName = this.settings.tplName || 'kpmModel';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'kpm/tpl/';


        this.model = opts && opts.model || new KPMModel(null, { autoLoad:false });

        // model listeners
        this.model.on('loadDataStarted', function() {
            G5.util.showSpin(this.$el);
        }, this);
        this.model.on('loadDataDone', function() {
            G5.util.hideSpin(this.$el);
        }, this);
        this.model.on('change', this.render, this);

        // ready for the model to go get the data
        this.model.loadData({
            timeframeType : this.settings.timeframeType || 'month',
            timeframeMonthId : this.settings.timeframeMonthId || new Date().getMonth(),
            timeframeYear : this.settings.timeframeYear || new Date().getFullYear()
        });

        // view listeners
        this.on('renderDone', function() {
            this.postRender();
        }, this);
    },

    events: {
        'click .timeframe a' : 'handleTimeframeClick'
    },

    render: function() {
        var that = this,
            json = that.model.toJSON();

        G5.util.showSpin(this.$el);

        this.preRender(json);

        TemplateManager.get(this.tplName, function(tpl) {
            that.$el.empty().append( tpl(json) );

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
    },

    preRender: function(json) {
        json.mode = this.settings.mode;

        json.title = this.settings.mode == 'team' ? _.pluck(this.model.get('nodes'), 'name').join(' | ') : null;
    },

    postRender: function() {
        var that = this;

        // set up children views
        // -----------------
        // summary view is straightforward
        this.summaryView = new KPMSummaryCollectionView({
            el : this.$el.find('.kpmSummaryCollectionView'),
            summary : this.model.get('summary'),
            kpmModel : this.model
        });

        // detail views are trickier
        // loop through all the detail objects and create views and references
        this.detailViews = [];
        _.each(this.model.get('detail'), function(detail) {
            var viewType = detail.type.charAt(0).toUpperCase()+detail.type.slice(1), // capitalize
                view;

            view = new window['KPMDetail' + viewType + 'View']({
                el : that.$el.find('.kpmDetailView'),
                type : detail.type,
                data : detail.data,
                kpmModel : that.model
            });

            that.detailViews.push(view);
        });

        // if team mode, we need to do special things
        if( this.settings.mode == 'team' ) {
            this.teamMembersView = new KPMTeamMembersView({
                el : this.$el.find('.kpmTeamMembersView'),
                team : this.model.get('team'),
                kpmModel : this.model
            });
        }

        // set up children view listeners
        // -----------------
        // listen to the summaryView
        this.summaryView.on('tabActivated', this.handleTabActivation, this);
    },

    handleTabActivation: function($tab, view) {
        var that = this,
            detailView = _.find(this.detailViews, function(v) { return v.settings.type == view.model.get('type'); });

        console.log($tab, view, detailView);
        if( this.activeDetailView ) { this.activeDetailView.destroy(); }

        detailView.render();
        this.activeDetailView = detailView;

        if( this.settings.mode == 'team' ) {
            this.teamMembersView.setType( this.activeDetailView.getType() );
        }
    },

    handleTimeframeClick: function(e) {
        var $tar = $(e.target).closest('a');

        e.preventDefault();

        G5.util.showSpin(this.$el, {cover:true});

        this.model.loadData({
            timeframeType : $tar.data('timeframe'),
            timeframeMonthId : this.model.get('timeframeMonthId'),
            timeframeYear : this.model.get('timeframeYear'),
            timeframeNavigate : $tar.data('timeframeNav') ? $tar.data('timeframeNav') : false
        });
    }
});
