/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
ActiveQuizResultsView:true
*/
ActiveQuizResultsView = Backbone.View.extend({

    initialize: function(options){

        var thisView = this;

        this.savedSlides = undefined;
        this.savedTemplate = undefined;

        this.quizParent = options && options.quizParent ? options.quizParent.models[0] : null;

        this.on('dataLoaded', function () {
            thisView.render(thisView.model.currentSlide);
        });


    },

    activate: function(props, completed){
        var that = this,
            claimId = that.quizParent._detectedClaimId||null;

        if (!completed){
            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_QUIZ_PAGE_VIEW_RESULTS,
                data: _.extend({},props,{claimId:claimId}),
                success: function (servResp) {
                    //adds the slides' content as an array to the model for the view
                    that.model.slides = servResp.data.quizViewResults;
                    that.savedSlides = that.model.slides;
                    that.trigger('dataLoaded');
                    that.model.isComplete = true;
                }
            });
        }else{
            that.trigger('dataLoaded');
        }

    },

    render: function(currentSlide){

        var self = this,
            tplName = 'quizPageResults',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'quiz/tpl/';
        this.$cont = $('#quizShellContent');

        this.model.slides[currentSlide].buttons = this.model.buttonList;

        //determine which buttons to display, depending on which slide is being viewed.
        //this will change depending on which buttons exist in a tab

        _.each(this.model.slides[currentSlide].buttons, function(currentButton){

            //resetting the button display setting to 'false' - this burns out old values
            currentButton.buttonDisplay = false;
            //if retakes are allowed AND if the person didn't pass the test AND if the value for number of attempts remaining is an integer greater than zero, allow a test retake button to display.
            if (currentButton.buttonType === "retakeTest" && self.model.slides[0].passedQuiz === false && self.model.slides[0].canRetakeQuiz === true ){
                currentButton.buttonDisplay = true;
            } else if (currentButton.buttonType === "exit"){
                currentButton.buttonDisplay = true;
            } 
        });

        this.$cont.empty();

        if (!self.savedTemplate){
            TemplateManager.get(
                tplName,
                function (tpl) {
                    self.$cont.append(tpl(self.model.slides[currentSlide]));
                    self.savedTemplate = tpl;
                },
                tplUrl);
        }else{
            self.$cont.append(self.savedTemplate(self.model.slides[currentSlide]));
        }

    }

});