/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
EngagementRecognizedModelView,
EngagementDetailView,
EngagementDetailPaxView:true
*/
EngagementDetailPaxView = EngagementDetailView.extend({
    initialize : function() {
        console.log('[INFO] EngagementDetailPaxView: initialized', this);

        //this is how we call the super-class initialize function (inherit its magic)
        EngagementDetailView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass EngagementDetailView
        this.events = _.extend({},EngagementDetailView.prototype.events,this.events);

        this.tplName = this.options.tplName || 'engagementDetailPax';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'engagement/tpl/';

        // build a non-Backbone model inside this view
        this.model = this.processData(this.options && this.options.data);

        this.on('renderDone', function() {
            this.model.$chartContainer = this.$el.find('.chartContainer');
            this.loadChartData(this.model);
            this.initUserExtended(this.options.type);
        }, this);
        this.on('chartDataLoaded', function() {
            this.renderChart(this.model);
        }, this);
    },

    events: {
        'click .detailUrl' : 'handleDetailPage'
    },

    processData: function(data) {
        data.type = this.options.type;
        data.userId = this.options.userId || this.options.engagementModel.get('userId');
        data.nodeId = this.options.nodeId || _.pluck(this.options.engagementModel.get('selectedNodes'), 'id').toString();

        return data;
    },

    renderPreAppend: function() {
        this.model.mode = this.options.mode;

        this.model.timeframeType = this.options.engagementModel.get('timeframeType');
        this.model.timeframeMonthId = this.options.engagementModel.get('timeframeMonthId');
        this.model.timeframeYear = this.options.engagementModel.get('timeframeYear');

        // look up which tplVars to use. i.e. this.tplVars.recognizedCount[paxRecBy] or this.tplVars.recognizedCount[paxRecToSingle]
        var recognizedCountCM = this.tplVars.recognizedCount[this.options.type + (this.model.count == 1 ? 'Single' : '')];

        // each pax recognition to/by item has special CM keys containing the full translated string for the various permutations of the "XXX have/has recognized [by] ## people" text
        // the keys' output will have a {0} placeholder where the number of people is inserted
        // this allows the translations to have plain text and the number in any order
        // we embed this CM output as a tplVariable in our engagementDetailPax Handlebars template
        // we also have a subTpl embedded in our engagementDetailPax Handlebars template
        // we pass the various values from the JSON to the subTpls, then replace the {0} with the rendered output
        // the final string is assigned to recognizedCountFormatted in the JSON to be passed to the main template
        if(recognizedCountCM) {
            this.model.recognizedCountFormatted = G5.util.cmReplace({
                cm: recognizedCountCM,
                subs: [
                    this.subTpls.recognizedCount({recognizedCount: this.model.count})
                ]
            });
        }
    },

    initUserExtended: function(which) {
        if( this.options.mode != 'user' ) {
            return false;
        }

        if( this['extended_' + which] ) {
            this.$el.find('.engagementRecognizedModelView').replaceWith( this.$paxRec );
            return;
        }

        if(this.model.count < 1){
            this.$el.find('.engagementRecognizedModelView').hide();
            return false;
        }
        this['extended_' + which] = new EngagementRecognizedModelView({
            el: this.$el.find('.engagementRecognizedModelView'),
            autoLoad: true,
            mode: 'user',
            userId: this.options.engagementModel.get('userId'),
            detail: _.where(this.options.engagementModel.get('detail'), {type: which})[0],
            engagementModel : this.options.engagementModel
        });
    },

    handleDetailPage: function(e) {
        var $tar = $(e.target).closest('a');

        e.preventDefault();

        G5.util.doSheetOverlay(false, $tar.attr('href'), $tar.data('title'));
    },

    /*
     * removed skin-related coloring at business owners' request (bugzilla #56990)
    buildChartPaletteColors: function() {
        this.chartStyle.paletteColors = G5.util.rgbToHex( this.options.engagementModelView.summaryView.$el.find('.tab.active').css('background-color') ).toString();
    },
    */

    destroy: function() {
        this.$paxRec = this.$el.find('.engagementRecognizedModelView').detach();

        //this is how we call the super-class destroy function (inherit its magic)
        EngagementDetailView.prototype.destroy.apply(this, arguments);
    }
});