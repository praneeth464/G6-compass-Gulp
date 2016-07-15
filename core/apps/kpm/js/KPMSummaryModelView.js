/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
TemplateManager,
KPMSummaryModel,
KPMSummaryModelView:true
*/
KPMSummaryModelView = Backbone.View.extend({
    initialize: function(opts) {
        console.log('[INFO] KPMSummaryModelView: initialized', this);

        var settings = {};

        this.settings = $.extend(true, {}, settings, opts);

        this.model = opts.model || new KPMSummaryModel();
        this.tplName = this.settings.tplName || 'kpmSummaryModel';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'kpm/tpl/';


        // listen to the model
        this.model.on('change', this.render, this);

        // listen to the view


        // rendering immediately upon init
        this.render();
    },

    events: {},

    // render simply inserts the HTML
    render: function() {
        var that = this;

        G5.util.showSpin(this.$el);

        TemplateManager.get(this.tplName, function(tpl) {
            that.$el.empty().append( tpl(that.model.toJSON()) );

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
    },

    // activate animates the meter
    activate: function() {
        var activate = function() {
            console.log('the view is activated');
        };

        if( this._rendered === true ) {
            activate();
        }
        else {
            this.on('renderDone', function() {
                activate();
            }, this);
        }
    }
});
