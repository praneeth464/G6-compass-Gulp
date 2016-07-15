/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
_V_,
Backbone,
G5,
TemplateManager,
ActiveQuizCourseMaterialsView:true
*/
ActiveQuizCourseMaterialsView = Backbone.View.extend({

    initialize: function(options){

        var thisView = this;

        this.on('dataLoaded', function () {
            thisView.render(thisView.model.currentSlide);
        });

    },

    activate: function(props){

        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_QUIZ_PAGE_COURSE_MATERIALS,
            data: props || {},
            success: function (servResp) {
                //adds the slides' content as an array to the model for the view
                that.model.slides = servResp.data.quizCourseMaterialsCollection;
                that.trigger('dataLoaded');
            }
        });

    },

    render: function(currentSlide){

        var self = this,
            tplName = 'quizPageCourseMaterials',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'quiz/tpl/';
        this.$cont = $('#quizShellContent');

        //if more than one slide exists for this tab, create a progress bar

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
            } else if (currentButton.buttonType === "previousTab" && (self.model.currentSlide) === 0 && self.model.canNavigate === true){
                currentButton.buttonDisplay = true;
            } else if (currentButton.buttonType === "nextSlide" && (self.model.currentSlide + 1) < self.model.numberOfSlides){
                currentButton.buttonDisplay = true;
            } else if (currentButton.buttonType === "nextTab" && (self.model.currentSlide + 1) >= self.model.numberOfSlides){
                currentButton.buttonDisplay = true;
            }
        });

        TemplateManager.get(
            tplName,
            function (tpl) {
                _V_.players = {};

                _.each(self.model.slides[currentSlide].slideContent, function(content) {
                    if( content.contentMedia ) {
                        content.contentMedia = $('<div>' + content.contentMedia + '</div>').html();
                    }
                });

                self.$cont.html(tpl(self.model.slides[currentSlide]));

                self.$cont.find('.video-js').each(function(i) {
                    _V_($(this).attr('id'));
                });
            },
            tplUrl);

    }

});