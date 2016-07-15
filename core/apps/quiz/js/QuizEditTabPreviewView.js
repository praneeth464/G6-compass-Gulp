/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
TemplateManager,
QuizEditTabPreviewView:true
*/
QuizEditTabPreviewView = Backbone.View.extend({

    initialize: function(opts) {
        var that = this;

        // QuizPageEditView parent container for this tab
        this.containerView = opts.containerView;
    },


    events: {
        'click .editStepBtn':'doEditStepClick'
    },
    doEditStepClick: function(e) {
        var $tar = $(e.currentTarget);
        e.preventDefault();
        this.containerView.goFromStepToStep('stepPreview',$tar.data('stepName'),$tar);
    },

    /* **************************************************
        TAB FUNCTIONS - QuizEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        var qm = this.containerView.quizModel,
            $wrap = this.$el.find('.previewStepBoxesWrapper'),
            json = qm.toJSON();

        // add letter orders to question answers
        _.each(json.questions, function(q){
            _.each(q.answers, function(a,i){
                a._letterOrder = String.fromCharCode(i+65);
            });
        });

        // populate cert and badge
        if(json.certificateId) {
            json._cert = qm.getCertificateById(json.certificateId);
        }
        if(json.badgeId) {
            json._badge = qm.getBadgeById(json.badgeId);
        }

        TemplateManager.get('previewStepItems', function(tpl){
            $wrap.empty().append(tpl(json));
        });
        
    }


});