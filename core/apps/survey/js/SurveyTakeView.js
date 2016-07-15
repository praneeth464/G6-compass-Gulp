/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
$,
_,
Backbone,
G5,
TemplateManager,
SurveyModel,
SurveyTakeView:true
*/
SurveyTakeView = Backbone.View.extend({

    //override super-class initialize function
    initialize: function (opts) {

        // create the model
        this.surveyModel = opts && opts.surveyModel ? opts.surveyModel : new SurveyModel({}, $.extend({surveyJson : opts.surveyJson}, opts.modelOpts || {}) );

        // set up event listeners
        this.setupEvents();

        // spin while waiting...
        G5.util.showSpin(this.$el);
        // ...to load the data into the model
        this.surveyModel.loadSurveyData();
    },

    events: {
        // submit survey
        'click  .submitBtn' : 'submitSurvey',

        // save survey for later
        'click  .saveForLaterBtn' : 'saveSurvey'
    },

    setupEvents: function() {
        this.surveyModel.on('surveyDataProcessed', this.setupSurvey, this);
        // this.surveyModel.on('surveyDataSubmitted', this.completeSurvey, this);
        this.surveyModel.on('surveyDataSubmitFailed', this.failSurvey, this);

        this.on('surveyRendered', this.postRender, this);
    },

    setupSurvey: function() {
        // process the survey data
        if( this.surveyModel.get('nodes') && this.surveyModel.get('nodes').length > 1 ) {
            this.surveyModel.set('multiNode', true);
        }

        // initialize the tab content views
        this.render();
    },

    render: function() {
        var that = this,
            doRender = function(tpl) {
                G5.util.hideSpin(that.$el);
                that.$el.html( tpl(_.extend({}, {cm:that.options.cm}, that.surveyModel.toJSON())) );
                that.trigger('surveyRendered', that);
            };

        // if a template has been passed to the view, use it
        if( this.options.tpl ) {
            doRender(that.options.tpl);
        }
        // otherwise, go looking for the proper template in the HTML
        else {
            TemplateManager.get('surveyTakeTpl', function(tpl) {
                doRender(tpl);
            }, G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'survey/tpl/');
        }
    },

    postRender: function() {
        // find slider questions
        this.$el.find('.slider').each(function() {
            $(this).slider();
            $(this).parents('.slider').siblings('.labels').insertAfter($(this));
        });
    },

    saveSurvey: function(e) {
        e.preventDefault();

        this.sendSurvey('save');
    },

    submitSurvey: function(e) {
        e.preventDefault();

        this.sendSurvey('submit');
    },

    sendSurvey: function(method) {
        var $form = this.$el.find('form'),
            $validate = method == 'submit' ? $form.find('.validateme') : $(),
            data = $form.serialize();

        if( G5.util.formValidate($validate) || method == 'save' ) {
            $form.find('input, .btn').attr('disabled','disabled').addClass('disabled');
            G5.util.showSpin($form,{cover:true,classes:'pageView'});
            this.surveyModel.sendSurvey(method,data);
        }
        else {
            //if not valid scroll to the first tooltip and animate. Had to add this for sliders since they are unable to get a focus and are being missed on long pages.
            var $valTips = $form.find('.validate-tooltip:visible');

            if($valTips.length) {
                
                $.scrollTo($valTips.get(0),{
                    duration:G5.props.ANIMATION_DURATION*2,
                    onAfter: function(){
                        $($valTips.get(0)).data('qtip').elements.tooltip
                            .animate({left:'+=20'},300).animate({left:'-=20'},300)
                            .animate({left:'+=10'},200).animate({left:'-=10'},200);
                    },
                    offset:{top:-20}
                });
                return false;
            }
        }
    },

    // completeSurvey: function() {
    //     var $form = this.$el.find('form');

    //     // kill the spinner
    //     G5.util.hideSpin($form);

    //     this.render();
    // },

    failSurvey: function() {
        G5.util.hideSpin(this.$el.find('form'));
        alert('Survey failed to submit.');
    }

});