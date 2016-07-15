/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
TemplateManager,
KPMSummaryModelView,
KPMSummaryCollection,
KPMSummaryCollectionView:true
*/
KPMSummaryCollectionView = Backbone.View.extend({
    className: "kpmSummaryCollectionView",

    initialize: function(opts) {
        console.log('[INFO] KPMSummaryCollectionView: initialized', this);

        var settings = {};

        this.settings = $.extend(true, {}, settings, opts);

        this.tplName = this.settings.tplName || 'kpmSummaryCollection';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'kpm/tpl/';


        this.collection = this.settings.collection || new KPMSummaryCollection(this.settings.summary || null, { autoLoad: false, kpmModel: this.settings.kpmModel || null });

        // collection listeners
        this.collection.on('loadDataStarted', function() {
            G5.util.showSpin(this.$el);
        }, this);
        this.collection.on('loadDataDone', function() {
            G5.util.hideSpin(this.$el);
        }, this);
        this.collection.on('reset', this.render, this);

        // ready for the collection to do stuff with data
        // if the collection already has models, render
        if( this.collection.length ) {
            this.render();
        }
        // otherwise, go get the data
        else {
            this.collection.loadData();
        }

        // view listeners
        this.on('renderDone', function() {
            this.attachModelViews();
            this.showTab(0);
        }, this);
    },

    events: {
        'shown a[data-toggle="tab"]' : 'activateTab'
    },

    render: function() {
        var that = this;

        TemplateManager.get(this.tplName, function(tpl) {
            that.$el.empty().append( tpl(that.collection.toJSON()) );

            that.$tabs = that.$el.find('.tab');
            that.$panes = that.$el.find('.tab-pane');

            that.trigger('renderDone');
        },this.tplUrl);
    },

    attachModelViews: function() {
        var that = this;

        this.modelViews = [];

        this.collection.each(function(model, i) {
            that.modelViews.push( new KPMSummaryModelView({
                model: model,
                el: that.$panes.filter('.'+model.get('type'))
            }) );

            that.$tabs.eq(i).data('view', that.modelViews[i]);
        });
    },

    showTab: function(i) {
        this.$tabs.eq(i).find('a').tab('show');
    },

    activateTab: function(e) {
        var $tab = $(e.target),
            view = $tab.closest('.tab').data('view');

        view.activate();

        this.trigger('tabActivated', $tab, view);
    }
});
