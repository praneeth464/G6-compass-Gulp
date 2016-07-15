/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
ActiveQuizTakeQuizView:true
*/
ActiveQuizTakeQuizView = Backbone.View.extend({

    initialize: function(options){

        var thisView = this;
            
        this.savedSlides = undefined;
        this.savedTemplate = undefined;


        this.quizParent = options && options.quizParent ? options.quizParent.models[0] : null;

        this.on('dataLoaded', function () {
            thisView.render();
        });

        this.on('questionAnswerLoaded', function () {
            thisView.renderAnswer(thisView.model.answerSlide[0]); //sending in the object this.model.answerSlide
        });

        //the quiz tab differs in that it changes the array position and creates an event for 'activate'
        //every time the slide changes. this way, only the current quiz question's data is presented
        //to the viewer.

    },

    activate: function(props, completed){

        // console.log('inside render.');
        // console.log('this.model.currentSlide: ', this.model.currentSlide);   
        // console.log('json thing: ', 'ajax/quizQuestion'+(this.model.currentSlide + 1)+'.json');

        //this one is more complicated - the URL is going to change based on the current slide.
        var that = this;
        var questionUrl = G5.props["URL_JSON_QUIZ_PAGE_QUESTION_" + (this.model.currentSlide + 1).toString()];

        if (!completed){
            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: questionUrl,
                data: props || {},
                success: function (servResp) {
                    // let's check for errors first
                    if( servResp.data.messages.length && servResp.data.messages[0].type == 'error' ) {
                        that.renderError(servResp.data.messages[0]);
                        return false;
                    }

                    // console.log('success - servResp: ', servResp);
                    //adds the slides' content as an array to the model for the view
                    that.model.slides = servResp.data.quizQuestion;
                    that.savedSlides = that.model.slides;
                    that.trigger('dataLoaded');

                    // claim id needs to be passed around
                    if(servResp.data.quizQuestion&&servResp.data.quizQuestion.length){
                        that.quizParent._detectedClaimId = servResp.data.quizQuestion[0].claimId||null;
                    }
                },
                error: function (a, b, c){
                    console.log(a);
                    console.log(b);
                    console.log(c);
                }
            });
        }else{
            that.trigger('dataLoaded');
        }
        

    },

    renderError: function(message) {
        var $cont = $('#quizShellContent'),
            text = '<div class="alert">'+message.text || message.code+'</div>',
            action = message.action && message.actionLabel ? '<p><a href="'+message.action+'" class="btn btn-primary">'+message.actionLabel+'</a></p>' : '';

        $cont.empty();

        $cont
            .append(text)
            .append(action);
    },

    render: function(){

        var self = this,
            tplName = 'quizPageQuestion',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'quiz/tpl/';
        this.$cont = $('#quizShellContent');

        /*
        NOTE from Joel 9 Oct 2013:
        I'm not convinced that these dots are actually doing anything. Our latest issue with bug #4892 is because line 147 is throwing a JS error when someone comes back to a saved quiz.
        Consequently, I'm turning off this entire chunk of .dots code because it appears to be doing nothing.
        -------------------->>>
        //if more than one slide exists for this tab, create a progress bar
        this.model.slides[0].dots = [];

        //set the spacing of the dots
        var dotSpacing = 100 / this.model.numberOfSlides;
        for (var i = 0; i < this.model.numberOfSlides; i++) {
            this.model.slides[0].dots[i] = {
                active: false,
                lastDot: false,
                spacing: dotSpacing,
                locked: true,
                visited: false,
                slideLink: i + 1
            };    
        }

        //set the styles for visited links
        for (var i = 0; i < this.model.currentSlide; i++) {
            this.model.slides[0].dots[i].visited = true;
        }
        <<<--------------------
        */

        if (this.model.numberOfSlides > 1){
            this.model.slides[0].activeSlide = this.model.currentSlide + 1;
            this.model.slides[0].numberOfSlides = this.model.numberOfSlides;
            this.model.slides[0].percentComplete = Math.floor((this.model.slides[0].activeSlide) /(this.model.slides[0].numberOfSlides)*100);
        }

        /*
        NOTE from Joel 9 Oct 2013:
        More .dots turning off. See note above.
        -------------------->>>
        //set the current slide's progress dot to active
        if(this.model.slides[0].activeSlide){
            this.model.slides[0].dots[this.model.slides[0].activeSlide - 1].active = true; // <<<---------- this line right here is throwing the JS error mentioned above
        }else{
            //there's only one slide
            this.model.slides[0].dots[0].active = true;
        }
        

        //set the last dot's class
        this.model.slides[0].dots[this.model.slides[0].dots.length - 1].lastDot = true;
        <<<--------------------
        */

        this.model.slides[0].isComplete = this.model.isComplete;
        this.model.slides[0].buttons = this.model.buttonList;

        //determine which buttons to display, depending on which slide is being viewed.
        //this will change depending on which buttons exist in a tab

        _.each(this.model.slides[0].buttons, function(currentButton){


            //resetting the button display setting to 'false' - this burns out old values
            currentButton.buttonDisplay = false;

            if (self.model.slides[0].isComplete === false){
                if (currentButton.buttonType === "submitAnswer"){
                    currentButton.buttonDisplay = true;
                } else if (currentButton.buttonType === "saveQuiz"){
                    currentButton.buttonDisplay = true;
                }                
            } else {
                //if the quiz is complete, display the view results button.
                if (currentButton.buttonType === "viewResults"){
                    currentButton.buttonDisplay = true;
                }
            }

        });

        this.$cont.empty();

        if (!self.savedTemplate){
            TemplateManager.get(
                tplName,
                function (tpl) {
                    var json = self.model.slides[0];
                    json.quizParent = self.quizParent.toJSON();

                    self.$cont.append(tpl(json));
                    self.savedTemplate = tpl;
                },
                tplUrl);
        }else{
            var json = self.model.slides[0];
            json.quizParent = self.quizParent.toJSON();

            self.$cont.append(self.savedTemplate(json));
        }

    },

    renderAnswer: function(currentAnswerSlide){

        // console.log('rendering answer:');

        var self = this,
            tplName = 'quizPageAnswer',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'quiz/tpl/';
        this.$cont = $('#quizAnswerContent');

        currentAnswerSlide.buttons = this.model.buttonList;

        _.each(currentAnswerSlide.buttons, function(currentButton){

            //resetting the button display setting to 'false' - this burns out old values
            //inside this we're only checking for nextQuestion and next tab

            currentButton.buttonDisplay = false;
            if (currentButton.buttonType === "nextQuestion" && (self.model.currentSlide + 1) < self.model.numberOfSlides){
                currentButton.buttonDisplay = true;
            } else if (currentButton.buttonType === "viewResults" && (self.model.currentSlide + 1) >= self.model.numberOfSlides){
                currentButton.buttonDisplay = true;
            } else if (currentButton.buttonType === "saveQuiz" && (self.model.currentSlide + 1) < self.model.numberOfSlides){
                currentButton.buttonDisplay = true;
            }

        });

        this.$cont.empty();


        TemplateManager.get(
            tplName,
            function (tpl) {
                self.$cont.append(tpl(currentAnswerSlide));
            },
            tplUrl);

    },

    submitAnswer: function(){

        var self = this;

        //validates the form before posting
        var $form = $('#quizAnswersForm'),
            action = $form.attr('action'),
            $tovalidate = $form.find('.validateme');

        if( G5.util.formValidate($tovalidate) ) {
            //ajax post to server, sending which answer was selected
            $.ajax({
                type : "POST",
                dataType : "g5json",
                url : action,
                data : $('#quizAnswersForm').serialize(),
                beforeSend: function() {
                    $("#submitAnswer").attr("disabled", "disabled"); //disable submit button while waiting
                },
                success : function(servResp) {
                    self.loadAnswer(servResp);
                },
                error : function(a,b,c) {
                    console.log(a, b, c);
                    $("#submitAnswer").removeAttr("disabled", "disabled");
                }
            });
        }else{

            $("#submitAnswer").off().mouseleave(function() {
                $tovalidate.find(".qtip").qtip("hide");
            });

            setTimeout( function() {
                $tovalidate.find(".qtip").qtip("hide");
            }, 2000);

            //once they select an answer, hide the tooltip
            $tovalidate.find("input").off().click(function() {
                G5.util.formValidate($tovalidate);
            });
        }

    },

    loadAnswer: function(servResp){

        // console.log('loading answer: ');

        this.model.answerSlide = servResp.data.quizAnswer;
        //disable quiz form
        $("#quizAnswersForm input:radio").attr('disabled',true);

        // console.log("loadAnswer server response :", servResp);

        // if we are on our last question, we need to mark this finished
        if( this.model.currentSlide + 1 >= this.model.numberOfSlides ) {
            this.model.isComplete = true;
        }

        //trigger render
        this.trigger('questionAnswerLoaded');

    },

    saveQuiz: function(event) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        var loadSpinner = function() {
            var opts = {
                lines: 9, // The number of lines to draw
                 length: 4, // The length of each line
                 width: 5, // The line thickness
                radius: 7, // The radius of the inner circle
                corners: 1, // Corner roundness (0..1)
                rotate: 0, // The rotation offset
                color: '#000', // #rgb or #rrggbb
                 speed: 1.7, // Rounds per second
                 trail: 60, // Afterglow percentage
                shadow: false, // Whether to render a shadow
                hwaccel: false, // Whether to use hardware acceleration
                className: 'spinner', // The CSS class to assign to the spinner
                zIndex: 2e9, // The z-index (defaults to 2000000000)
                top: 'auto', // Top position relative to parent in px
                left: $("#saveQuiz").width() + 15 // Left position relative to parent in px
                };

            $("#saveQuiz").spin(opts);
            $(".recognitionResponseModal").modal("show");

            setInterval(function() {
                $("#saveQuiz").spin(false);
            }, 500);

        };
        
        loadSpinner();
    }

});