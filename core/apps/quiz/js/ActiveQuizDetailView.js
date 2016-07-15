/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
ActiveQuizDetailView:true
*/
ActiveQuizDetailView = Backbone.View.extend({

    initialize: function(options){

        var thisView = this;

        //when a child tab view is created, it doesn't have to do anything. 

        //when a child view is activated, 'render' is called (and the current slide is displayed).
        //next and previous buttons change the current slide in the array of slides,
        //there is a listener created in 'initialize' for this that will call 'render' again.
        this.on('dataLoaded', function () {
            thisView.render(thisView.model.currentSlide);
        });


        //the quiz tab differs in that it changes the array position and creates an event for 'activate'
        //every time the slide changes. this way, only the current quiz question's data is presented
        //to the viewer.

    },

    activate: function(props){
        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_QUIZ_PAGE_DETAILS,
            data: props || {},
            success: function (servResp) {
                //adds the slides' content as an array to the model for the view
                that.model.slides = servResp.data.quizDetailsCollection;
                that.trigger('dataLoaded');
            }
        });

    },

    render: function(currentSlide){
        var self = this,
            tplName = 'quizPageDetails',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'quiz/tpl/';
        this.$cont = $('#quizShellContent');

        if (this.model.numberOfSlides > 1){
            this.model.slides[currentSlide].activeSlide = this.model.currentSlide + 1;
            this.model.slides[currentSlide].numberOfSlides = this.model.numberOfSlides;
            this.model.slides[currentSlide].percentComplete = Math.floor((this.model.slides[currentSlide].activeSlide) /(this.model.slides[currentSlide].numberOfSlides)*100);
        }        

        this.model.slides[currentSlide].buttons = this.model.buttonList;

        //determine which buttons to display, depending on which slide is being viewed.
        //this will change depending on which buttons exist in a tab

        _.each(this.model.slides[currentSlide].buttons, function(currentButton){

            //resetting the button display setting to 'false' - this burns out old values
            currentButton.buttonDisplay = false;

            if (currentButton.buttonType === "previousSlide" && (self.model.currentSlide - 1) >= 0){
                currentButton.buttonDisplay = true;
            } else if (currentButton.buttonType === "nextSlide" && (self.model.currentSlide + 1) < self.model.numberOfSlides){
                currentButton.buttonDisplay = true;
            } else if (currentButton.buttonType === "nextTab" && (self.model.currentSlide + 1) >= self.model.numberOfSlides){
                currentButton.buttonDisplay = true;
            }
        });

        this.$cont.empty();

        TemplateManager.get(
            tplName,
            function (tpl) {
                self.$cont.append(tpl(self.model.slides[currentSlide]));
            },
            tplUrl);

    }

});