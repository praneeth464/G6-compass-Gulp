/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
TemplateManager,
ProfilePageStatementTabSummaryModel,
ProfilePageStatementTabSummaryView:true
*/
ProfilePageStatementTabSummaryView = Backbone.View.extend({

    el: '#profilePageStatementTabSummary', // el attaches to existing element

    initialize: function (opts) {
        "use strict";

        var thisView = this;

        this.profilePageStatementTabSummaryModel = new ProfilePageStatementTabSummaryModel();
        this.profilePageStatementTabSummaryModel.loadModel();
        this.profilePageStatementTabSummaryModel.on('dataLoaded', function () {
            thisView.render(thisView.profilePageStatementTabSummaryModel.toJSON());
        });
    },

    render: function (summary) {
        "use strict";

        var self = this,
            tplName = 'profilePageStatementTabSummary',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';
        this.$cont = $('#profilePageStatementTabSummaryContent');

        TemplateManager.get(tplName,
            function (tpl) {
                $('#profilePageStatementTabSummaryContent').append(tpl(summary[0])); //for some reason, self.$cont isn't assigning
            },
            tplUrl);
    }
});