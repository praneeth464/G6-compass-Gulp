/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
TemplateManager,
QuizTakeTabIntroView:true
*/
QuizTakeTabIntroView = Backbone.View.extend({

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
        this.render();
    },

    render: function() {
        var that = this;

        TemplateManager.get(this.tpl, function(tpl) {
            that.$el.html( tpl(that.quizTakeModel.toJSON()) );
        });
    }

});
