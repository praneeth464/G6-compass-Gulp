/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
G5,
PageView,
TemplateManager,
WizardTabsView,
QuizModelTake,
QuizTakeTabIntroView,
QuizTakeTabMaterialsView,
QuizTakeTabQuestionsView,
QuizTakeTabResultsView,
QuizPageTakeView:true
*/
QuizPageTakeView = PageView.extend({

    initialize: function(opts) {

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        // WizardTabsView (init'd inside initTabs())
        this.wizTabs = null;

        // create the model
        this.quizTakeModel = new QuizModelTake({}, {quizJson : opts.quizJson});

        // set up event listeners
        this.setupEvents();

        // spin while waiting...
        G5.util.showSpin(this.$el);
        // ...to load the data into the model
        this.quizTakeModel.loadQuizData();
    },

    events: {
        // next button events
        'click  .nextBtn' : 'goToNextStep',

        // back button events
        'click .backBtn' : 'goBackAStep',

        // results button events
        'click  .resultsBtn' : 'goToResults'
    },

    setupEvents: function() {
        this.quizTakeModel.on('quizDataProcessed', this.setupQuiz, this);
        this.on('tabsInitialized', this.startQuiz, this);
    },

    setupQuiz: function() {
        // process the quiz data
        // ...nothing for now...

        // initialize the tab content views
        this.render();
    },

    startQuiz: function() {
        // check for a claimId in the data model
        // if it exists, the quiz has already been started and we need to jump to the questions tab
        if( this.quizTakeModel.get('claimId') ) {
            // mark the intro complete
            this.wizTabs.setTabState('stepIntro','complete');

            // if materials tab exists, mark it complete
            if( this.wizTabs.getTabByAnything('stepMaterials') ) {
                this.wizTabs.setTabState('stepMaterials','complete');
            }

            // if questions tab exists, activate it
            if( this.wizTabs.getTabByAnything('stepQuestions') ) {
                this.wizTabs.setTabState('stepQuestions','unlocked');
                this.wizTabs.activateTab('stepQuestions');
            }
            // otherwise, the quiz must be done so we activate the results tab
            else {
                this.wizTabs.setTabState('stepResults','unlocked');
                this.wizTabs.activateTab('stepResults');
            }
        }
        // otherwise, activate the first tab
        else {
            this.wizTabs.activateTab(1);
        }
    },

    render: function() {
        var that = this;

        TemplateManager.get('quizPageTakeTpl', function(tpl,vars,subTpls) {
            that.subTpls = subTpls;

            // console.log(_.extend({}, {cm:that.options.cm}, that.quizTakeModel.toJSON()));
            G5.util.hideSpin(that.$el);
            that.$el.find('.span12').html( tpl(_.extend({}, {cm:that.options.cm}, that.quizTakeModel.toJSON())) );

            that.initSubViews();
            that.initTabs();
        });
    },

    initSubViews: function() {
        // let the name of the tab objects match the corresponding data-tab-name + 'TabView'
        // this will allow tab nav logic to flow naturally from the names
        this.stepIntroTabView = new QuizTakeTabIntroView({
            el: '#quizTakeTabIntroView',
            containerView: this,
            cm: this.options.cm,
            tpl: 'quizPageTakeIntroTpl'
        });

        this.stepMaterialsTabView = new QuizTakeTabMaterialsView({
            el: '#quizTakeTabMaterialsView',
            containerView: this,
            cm: this.options.cm,
            tpl: 'quizPageTakeMaterialsTpl'
        });

        this.stepQuestionsTabView = new QuizTakeTabQuestionsView({
            el: '#quizTakeTabQuestionsView',
            containerView: this,
            cm: this.options.cm,
            tpl: 'quizPageTakeQuestionsTpl'
        });

        this.stepResultsTabView = new QuizTakeTabResultsView({
            el: '#quizTakeTabResultsView',
            containerView: this,
            cm: this.options.cm,
            tpl: 'quizPageTakeResultsTpl'
        });
    },

    // initialize the tab views
    initTabs: function() {
        var that = this,
            tabsJson = this.options.tabsJson;

        // check to see if there are materials. If not, chuck that tab
        if( !this.quizTakeModel.get('materials') || this.quizTakeModel.get('materials').length <= 0 ) {
            tabsJson = _.reject(tabsJson, function(tab) {
                return tab.name == 'stepMaterials';
            });
        }
        // check to see if all questions have been answered. If so, chuck the questions tab
        if( this.quizTakeModel.get('_allQuestionsAnswered') === true ) {
            tabsJson = _.reject(tabsJson, function(tab) {
                return tab.name == 'stepQuestions';
            });
        }

        // init WizardTabsView
        this.wizTabs = new WizardTabsView({
            el: this.$el.find('.wizardTabsView'),
            tabsJson: tabsJson,
            scrollOnTabActivate: true
        });

        // listen for the WizardTabsView to be initialized before we can manipulate anything
        this.wizTabs.on('tabsInitialized', function() {
            that.wizTabs.tabs.each(function(tab) {
                switch( that.$el.find(tab.get('contentSel')).attr('id') ) {
                case 'quizTakeTabIntroView' :
                    tab.contentView = that.stepIntroTabView;
                    break;
                case 'quizTakeTabMaterialsView' :
                    tab.contentView = that.stepMaterialsTabView;
                    break;
                case 'quizTakeTabQuestionsView' :
                    tab.contentView = that.stepQuestionsTabView;
                    break;
                case 'quizTakeTabResultsView' :
                    tab.contentView = that.stepResultsTabView;
                    break;
                }
            });

            that.trigger('tabsInitialized');
        });

        this.wizTabs.on('afterTabActivate', this.afterTabActivate, this);
    },

    goToNextStep: function(e) {
        var fromTab = this.wizTabs.getActiveTab(),
            toTab = this.wizTabs.getNextTab();

        e.preventDefault();
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'));
    },

    goBackAStep: function(e) {
        var fromTab = this.wizTabs.getActiveTab(),
            toTab = this.wizTabs.getPrevTab();

        e.preventDefault();
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'));
    },

    goToResults: function(e) {
        var fromTab = this.wizTabs.getActiveTab(),
            toTab = this.wizTabs.getTabByName('stepResults');

        e.preventDefault();
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'));
    },

    goFromStepToStep: function(fromName, toName) {
        var goingDirection = this.wizTabs.getTabByName(fromName).get('id') > this.wizTabs.getTabByName(toName).get('id') ? 'backward' : 'forward';

        // mark fromTab complete ONLY if we're going forward
        if (goingDirection == 'forward' && fromName) {
            this.wizTabs.setTabState(fromName, 'complete'); // complete
        }

        // unlock destination tab and activate
        this.wizTabs.setTabState(toName, 'unlocked'); // unlock
        this.wizTabs.activateTab(toName); // go to tab
    },

    afterTabActivate: function(tab) {
        // check to see if the Results tab has been unlocked and if so, mark it as complete
        // this is a little hacky, but it's the best way to change the state of that particular tab if the person clicks to a different one
        if( tab.get('name') != 'stepResults' && this.wizTabs.getTabByName('stepResults').get('state') == 'unlocked' ) {
            this.wizTabs.setTabState('stepResults', 'complete');
        }

        // activate the content view for the selected tab
        tab.contentView.activate();
    }

});