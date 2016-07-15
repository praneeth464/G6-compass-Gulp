/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
SSIContestModel,
SSIContestEditTabPreviewView:true
*/
SSIContestEditTabPreviewView = Backbone.View.extend({

    initialize: function(opts) {
        var that = this;

        // fe dev uses this
        this.tplPath = './../apps/ssi/tpl/';
        this.tplName = 'ssiContestEditTabPreviewView';

        // SSIContestPageEditView parent container for this tab
        this.containerView = opts.containerView;
        // shortcut to contest model
        this.contMod = this.containerView.contestModel;

        this.contMod.on('success:fetchPreviewData', function(params){
            var json = _.extend({}, params, that.contMod.toJSON());

            SSIContestModel.reformatDecimalStrings(json);

            that.render(json);
            that.containerView.updateBottomControls();
        });

        if (this.contMod.get('contestType') === 'awardThemNow') {
            this.$el.find('.showOnAwardThemNow').show();
        }
    },

    events: {
        'click .editStepBtn':'doEditStepClick'
    },

    render: function(data){
        var $wrap = this.$el.find('.ssiContestPreviewWrap'),
            that = this;

        TemplateManager.get(this.tplName, function(tpl){
            $wrap.empty().append(tpl(data));
            // make any preview tables responsive
            that.$el.find('table').responsiveTable();
        }, this.tplPath);
    },

    doEditStepClick: function(e) {
        var $tar = $(e.currentTarget);
        e.preventDefault();
        this.containerView.jumpToStep($tar.data('stepName'));
    },


    /* **************************************************
        TAB FUNCTIONS - SSIContestEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        this.contMod.fetchPreviewData();
    }
});
