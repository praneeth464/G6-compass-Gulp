/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
Backbone,
TemplateManager,
QuizTakeTabResultsView:true
*/
QuizTakeTabResultsView = Backbone.View.extend({

    initialize: function(opts) {
        // QuizPageEditView parent container for this tab
        this.containerView = opts.containerView;

        // quiz model
        this.quizTakeModel = this.containerView.quizTakeModel;
        // template
        this.tpl = opts.tpl;

        this.setupEvents();
    },

    events: {
    },

    setupEvents: function() {
    },

    activate: function() {
        this.quizTakeModel.buildResults();

        // when the results tab is activated, we lock down the questions tab if it exists
        if( this.containerView.wizTabs.getTabByAnything('stepQuestions') ) {
            this.containerView.wizTabs.setTabState('stepQuestions', 'locked');
        }

        this.render();
    },

    render: function() {
        var that = this;

        TemplateManager.get(this.tpl, function(tpl) {
            that.$el.html( tpl(_.extend({}, {cm:that.options.cm}, that.quizTakeModel.toJSON())) );
        });
    }

});
