/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
TemplateManager,
PageView,
ActiveQuizCollection,
ActiveQuizDetailView,
ActiveQuizCourseMaterialsView,
ActiveQuizTakeQuizView,
ActiveQuizResultsView,
ActiveQuizView:true
*/
ActiveQuizView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'quiz';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //this creates the collection and grabs the quiz information.
        this.activeQuizCollection = new ActiveQuizCollection();
        this.activeQuizCollection.loadContent();

        this.savedQuiz = undefined;
        this.tabsCompleted = [];
        this.didFirstLoad = false;

        this.activeQuizCollection.on('dataLoaded', function () {
            self.activateShell(self.activeQuizCollection.toJSON());
        });

        //runs when the shell is loaded the first time, creates the tab views and activates one of the tabs
        this.on('quizShellLoaded', function() {
            // this setTimeout is necessary because IE8 is having issues when the DOM element that triggered the event gets removed before the event is done running
            setTimeout(function() {
                self.createTabs(self.activeQuizCollection.toJSON());
            }, 0);
        });       

        this.on('tabChange', function(){
            // this setTimeout is necessary because IE8 is having issues when the DOM element that triggered the event gets removed before the event is done running
            setTimeout(function() {
                self.render(self.activeQuizCollection.toJSON());
            }, 0);
        }); 

        this.on('slideChange', function() {
            // this setTimeout is necessary because IE8 is having issues when the DOM element that triggered the event gets removed before the event is done running
            setTimeout(function() {
                self.currentView.render(self.currentView.model.currentSlide);
            }, 0);
        });

        this.on('updateTab', function(){
            // this setTimeout is necessary because IE8 is having issues when the DOM element that triggered the event gets removed before the event is done running
            setTimeout(function() {
                self.renderActiveTab();
            }, 0);
        }); 

    },

    events: {
        'click button': 'buttonEvents',
        'click #quizNavigationTabs a': 'tabLinkEvent',
        'click #printPage': 'printPage'
    },

    render: function(quizDetails){
        //seperating the 'render' function from the 'activate' function, so self the shell's tabs
        //can re-render when switching between them. 

        //to grab this right object from the JSON
        var currentQuiz = quizDetails[0];

        //find out how many tabs are being sent, and decide a width for the columns of each tab
        var numberOfTabs = currentQuiz.quickSteps.length;

        //a page is 12 columns wide, this finds the max possible integer width of tabs
        var colWidth = Math.floor(12/numberOfTabs);

        //self value is added to the JSON, for use in handlebars
        currentQuiz.colWidth = colWidth;

        var currentSlide = currentQuiz.quickSteps[0].currentSlide;

        //set the active and inactive tabs
        for (var i = 0; i < currentQuiz.quickSteps.length; i++) {
            if (currentQuiz.quickSteps[i].stepStatus === "active"){
                currentQuiz.quickSteps[i].isActive = true;
            }else{
                currentQuiz.quickSteps[i].isActive = false;
            }
             
         } 

        //load the template and append the tabs with necessary classes (active, locked, in progress, etc)
        // rendering the template will work something like this:

        var self = this,
            tplName = 'quizPageShellTemplate',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'quiz/tpl/';
        this.$cont = $('#quizPageShell');

        TemplateManager.get(
            tplName,
            function (tpl) {
                // console.log('currentQuiz:',currentQuiz);
                self.savedQuiz = currentQuiz;
                self.$cont.html(tpl(currentQuiz));
                //the tab views don't need to be created again, just re-rendered on the active tab.
                self.trigger('updateTab');                
            },
            tplUrl);

    },

    activateShell: function(quizDetails){ 
        //to grab this right object from the JSON
        var currentQuiz = quizDetails[0];

        this.processWizardTabs();

        //find out how many tabs are being sent, and decide a width for the columns of each tab
        var numberOfTabs = currentQuiz.quickSteps.length;

        //a page is 12 columns wide, this finds the max possible integer width of tabs
        var colWidth = Math.floor(12/numberOfTabs);

        //self value is added to the JSON, for use in handlebars
        currentQuiz.colWidth = colWidth;

        //make the first tab the active tab 
        // var currentSlide = currentQuiz.quickSteps[0].currentSlide;
        // currentQuiz.quickSteps[currentSlide].isActive = true;

        //find first tab with isComplete status false - that will be the active tab
        var currentSlide,
            i = 0,
            stepsLength = currentQuiz.quickSteps.length,
            thisSlide;

        for (i; i < stepsLength; i+=1) {
            thisSlide = currentQuiz.quickSteps[i];
            if ( thisSlide.isComplete === false){
                currentSlide = thisSlide.currentSlide;
                thisSlide.isActive = true;
                break;
            }
        }


        //set the last tab's class
        currentQuiz.quickSteps[currentQuiz.quickSteps.length -1 ].lastStep = true;

        //load the template and append the tabs with necessary classes (active, locked, in progress, etc)
        // rendering the template will work something like this:

        var self = this,
        tplName = 'quizPageShellTemplate',
        tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'quiz/tpl/';
        this.$cont = $('#quizPageShell');

        for (var i = 0; i < currentQuiz.quickSteps.length; i++) {
            currentQuiz.quickSteps[i].index = i + 1;
        }

        TemplateManager.get(
            tplName,
            function (tpl) {
                self.$cont.html(tpl(currentQuiz));
                self.trigger('quizShellLoaded');                
            },
            tplUrl);

    },

    processWizardTabs: function() {
        // this method is for converting the current quiz "quickSteps" into a wizardTab-friendly JSON object
        var thisView = this,
            quickSteps = this.activeQuizCollection.at(0).get('quickSteps'),
            tabJson = [];

        console.log( quickSteps );

        _.each(quickSteps, function(step, i) {
            tabJson[i] = {
                "id" : i+1,
                "name" : "step"+(i+1),
                "isActive" : step.stepStatus == "active" ? true : false,
                "state" : step.canNavigate === true ? "unlocked" : "locked",
                "contentSel" : "",
                "wtNumber" : "",
                "wtName" : step.stepName
            };
        });

        console.log(tabJson);
    },

    createTabs: function(quizDetails){

        var self = this;
        var currentQuiz = quizDetails[0];
        var scannedView = null;

        _.each(currentQuiz.quickSteps, function(currentTab){

            //inside each quiz tab..

            //if the tabType of the tab being iterated through matches a category value for self tab,
            //create self kind of view and assign the current tab's values to the new view.
            if (currentTab.tabType === "quizDetail"){
                self.activeQuizDetailView = new ActiveQuizDetailView({ 
                    model: currentTab,
                    quizParent : self.activeQuizCollection
                });
                scannedView = self.activeQuizDetailView;
            } 
            else if (currentTab.tabType === "courseMaterials"){
                self.activeQuizCourseMaterialsView = new ActiveQuizCourseMaterialsView({
                    model: currentTab,
                    quizParent : self.activeQuizCollection
                });
                scannedView = self.activeQuizCourseMaterialsView;
            }
            else if (currentTab.tabType === "takeQuiz"){
                self.activeQuizTakeQuizView = new ActiveQuizTakeQuizView({
                    model: currentTab,
                    quizParent : self.activeQuizCollection
                });
                scannedView = self.activeQuizTakeQuizView;                
            }
            else if (currentTab.tabType === "results"){
                self.activeQuizResultsView = new ActiveQuizResultsView({
                    model: currentTab,
                    quizParent : self.activeQuizCollection
                });
                scannedView = self.activeQuizResultsView;                
            }

            if (currentTab.stepStatus === "active"){
                self.currentView = scannedView;
                self.currentView.activate();
            }

        });

    },

    renderActiveTab: function(){
        var self = this;
        var scannedView = _.where(this.activeQuizCollection.at(0).get('quickSteps'), {stepStatus: "active"})[0];

        switch( scannedView.tabType ) {
            case "quizDetail":
                this.currentView = this.activeQuizDetailView;
                break;
            case "courseMaterials":
                this.currentView = this.activeQuizCourseMaterialsView;
                break;
            case "takeQuiz":
                this.currentView = this.activeQuizTakeQuizView;
                break;
            case "results":
                this.currentView = this.activeQuizResultsView;
                break;
        }

        this.currentView.activate({}, this.currentView.model.isComplete);

    },

    buttonEvents: function(event) {

        var self = this,
            buttonID = $(event.target).closest('button').attr('id'),
            quickSteps = this.activeQuizCollection.at(0).get('quickSteps'),
            activeTab = _.where(quickSteps, {stepStatus: "active"})[0],
            prevTab = quickSteps[ _.indexOf(quickSteps, activeTab)-1 ],
            nextTab = quickSteps[ _.indexOf(quickSteps, activeTab)+1 ];

        this.activeQuizCollection.models[0].set('canPrint', false);

        switch( buttonID ){
            case "previousSlide":
                this.currentView.model.currentSlide -= 1;
                this.trigger('slideChange');
                break;
            case "nextSlide":
                this.currentView.model.currentSlide += 1;
                this.trigger('slideChange');
                break;

            case "previousTab":
                activeTab.stepStatus = "";
                prevTab.stepStatus = "active";
                this.trigger('tabChange');
                break;
            case "nextTab":
            case "viewResults":
                // according to a comment in the original "viewResults" case, it was almost identical to the "nextTab" case, save for the ability to print. So, I've moved it here and added a specific check for the ability to print

                //isComplete sets the current tab as complete.
                activeTab.isComplete = true;
                activeTab.stepStatus = "complete";

                // if the "index" (not the actual array index, but an object property index set in activateShell) of the active tab has not been added to the tabsCompleted array, add it
                if( $.inArray(activeTab.index, this.tabsCompleted) == -1 ){
                    this.tabsCompleted.push(activeTab.index);
                }
                
                //set canNavigate to true to 'unlock' the tab
                nextTab.canNavigate = true;
                nextTab.stepStatus = "active";

                // handle the custom "viewResults" case where it deviates from "nextTab"
                if( buttonID == "viewResults" ) {
                    //printing is allowed on the viewResults page.
                    this.activeQuizCollection.models[0].set('canPrint', true);
                }

                self.trigger('tabChange');
                break;
            case "submitAnswer":
                //this is localized to quiz, so i'm keeping the logic stored there.
                this.currentView.submitAnswer();
                break;
            case "nextQuestion":
                // console.log('inside next slide:');            
                this.currentView.model.currentSlide += 1;
                this.currentView.activate(this.currentView.model.currentSlide);
                break;
            case "saveQuiz":
                this.currentView.saveQuiz(event);
                break;
        }
    },

    tabLinkEvent: function(event){
        /*
        this is for when a tab link is clicked. links are disabled until a user is
        currently on self tab, or has already completed self tab. when a tab link is clicked,
        self tab becomes the active tab (at slide 0) and the shell render function is called.

        quiz tab will render differently - once it is complete a flag will be set to indicate self 
        the quiz is finished (included in the JSON). this way, if someone clicks back on the quiz questions tab
        after completing a quiz, they will see a message indicating self the quiz is complete.
        */
        event.preventDefault();

        var self = this;
        //the link has an id on it to indicate what type of tab it is, this way we know which
        //tab to set as the active tab.
        var clickedTabId = $(event.target).closest('.step').find('a').first().attr('id'),
            quickSteps = this.activeQuizCollection.at(0).get('quickSteps'),
            activeTab = _.where(quickSteps, {stepStatus: "active"})[0],
            clickedTab = _.where(quickSteps, {tabType: clickedTabId})[0];
        
        //if it's the results tab, set printing to true
        if (clickedTab.tabType == "results" ){
            self.activeQuizCollection.models[0].set('canPrint', true);
        }
        else {
            this.activeQuizCollection.models[0].set('canPrint', false);
        }

        //first, remove the active class from the current tab and replace it with "complete" if it is, in fact, complete.
        activeTab.stepStatus = activeTab.isComplete ? "complete" : "";

        //then, make the clicked tab active (and trigger tabChange event) and set the current slide of that tab to 0, unless it's a quiz, in which case we do not reset the current slide
        clickedTab.stepStatus = "active";

        //if it's a quiz, do nothing. otherwise, change currentSlide to 0.
        if (clickedTab.tabType != "takeQuiz"){
            clickedTab.currentSlide = 0;
        }
        else if(clickedTab.tabType === "takeQuiz" && clickedTab === activeTab){
            clickedTab.preventDefault();
        }
        
        self.trigger('tabChange');
    },

    printPage: function(event){
        event.preventDefault();
        window.print();
    }

});