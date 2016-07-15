/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
SurveyTakeView,
SurveyPageTakeView:true
*/
SurveyPageTakeView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {

        //set the appname (getTpl() method uses this)
        this.appName = 'survey';

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass ModuleView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        // create the model
        this.surveyTakeView = new SurveyTakeView({
            el : '#surveyTakeView',
            surveyJson : opts.surveyJson,
            modelOpts: opts.modelOpts || {},
            cm : opts.cm
        });
    }

});