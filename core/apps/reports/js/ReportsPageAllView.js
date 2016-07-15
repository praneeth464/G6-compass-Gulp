/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
Backbone,
TemplateManager,
ReportsPageView,
ReportsPageAllView:true
*/
ReportsPageAllView = Backbone.View.extend({

    el : '#reportsPageAllView',

    //override super-class initialize function
    initialize:function(opts){
        "use strict";
        var thisView = this;

        this.parentView = opts && opts.parentView || new ReportsPageView(),
        this.model = this.parentView.model;

        this.$el.show();
        G5.util.showSpin(this.$el);

        this.on('processDataDone', function() {
            thisView.render();
        });
        this.processData();
    },

    events : {
        'click .reportReport a' : 'goToReport'
    },

    render: function(){
        var thisView = this,
            tplName = 'reportsPageAll',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'reports/tpl/';

        TemplateManager.get(tplName,function(tpl,vars,subTpls){
            // clean out the view root and append our rendered template
            thisView.$el
                .empty()
                .html(
                    tpl({
                        categories : thisView.tplJson
                    })
                )
                .show();

            // trigger a renderDone event
            thisView.trigger('renderDone');
        },tplUrl);
    },

    processData: function() {
        var thisView = this,
            categoryList = _.unique(this.model.pluck('category').sort(), true);

        this.tplJson = _.map(categoryList, function(cat) {
            return {
                category : cat,
                categoryNameId : thisView.model.where({ category : cat })[0].get('categoryNameId'),
                reports  :  _.map(
                                _.sortBy(thisView.model.where({ category : cat }), function(report) {
                                    return report.get('displayName');
                                }),
                                function(report) {
                                    return report.toJSON();
                                }
                            )
            };
        });

        this.trigger('processDataDone');
    },

    goToReport: function(e) {
        e.preventDefault();

        var thisView = this,
            reportId = $(e.target).closest('.reportReport').data('reportId');

        this.model.setActiveReportById(reportId);
    }
}); // ReportsPageAllView