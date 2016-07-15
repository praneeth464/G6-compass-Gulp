/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
ModuleView,
happinessSlider,
BIWHappinessSlider,
happinessSliderOpts,
WorkHappierPaxModel,
WorkHappierPaxModuleView:true
*/
WorkHappierPaxModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

         //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //dev module specific init stuff here

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 },
                { w:4, h:2 },
                { w:4, h:4 }
            ],
            { silent: true }
        );

        //workaround for recursive call in Bootstrap when stacking multiple modals.
        $.fn.modal.Constructor.prototype.enforceFocus = function () {};

        this.whPastResultsModel = new WorkHappierPaxModel();

        //Have to do click events this way becasue of detaching the modal and appending it to the body. It's out of it's element.
        $('body').on('click touchstart', '#happiness--analyze_smile_cta' , function(){
            $('#whModal .happiness--past_results').show();
            $('#whModal #happiness--confidential_feedback').show();
            $('#whModal .happiness--container').addClass('rating-submitted');

            that.whPastResultsModel.loadData(happinessSlider);
        });

        $('body').on('click', '#whPrivacyModalTrigger' , function(e){
            e.preventDefault();

            that.showPrivacyModal(e);
        });

        $('body').on('click', '#whFeedbackModalTrigger', function(e){
            e.preventDefault();

            that.showFeedbackModal();
        });

        $('body').on('click', '#whFeedbackSubmit', function(e){
            that.submitFeedbackForm(e);
        });

        $('body').on('click', '#whModal .whModalClose' , function(e){
            e.preventDefault();
            that.hideHappinessModal();
        });

        $('body').on('click', '.whFeedbackClose', function(){
            that.clearFeedbackValidation();
        });

        //when template is loaded initialize the subTpl and change the header text to the original
        this.on('templateLoaded',function(tpl, vars, subTpls){
            this.whPastResultsTpl = subTpls.whPastResultsTpl;

            this.whModuleHeaderOriginal = $('#happiness--module_header').text();
        },this);


        this.whPastResultsModel.on('dataLoaded', function(){
            that.renderPastMoods();
        });

    },

    events: {
        "click .module-liner": "showHappinessModal"
    },

    showHappinessModal: function(e) {
        var $workHappierModal = $('#whModal');

        happinessSlider = new BIWHappinessSlider(happinessSliderOpts);

        if(this.$el.find('#whModal').length === 0) {
            $workHappierModal.modal('show');

        } else {
            $('body').append(
                $workHappierModal.modal('show')
            );
        }

        window.scrollTo(0,0);
    },

    hideHappinessModal: function(){
        $('#whModal').modal('hide');

        //Have to do this manually since it's part of the slider code from space150 and there is no reset method
        $('#whModal .happiness-slider-container--inner').remove();
        $('#happiness--bubble_left').remove();
        $('#happiness--bubble_right').remove();
        $('.happiness--past_results').empty();
        $('#happiness--result_header, #happiness--result_subheader, #happiness--analyze_smile_cta, #happiness--work_happier_cta, #happiness--privacy_statement, .happiness--past_results, #happiness--confidential_feedback').hide();

        $('#happiness--slider_container').removeClass('happiness--rating_submitted');
        $('#whModal .happiness--container').removeClass('rating-submitted');


        $('#happiness--module_header').text(this.whModuleHeaderOriginal);
    },

    showPrivacyModal: function(event) {
        var $tar = $(event.target);

        event.preventDefault();

        G5.util.doSheetOverlay(false, $tar.attr('href'), $tar.text());
    },

    showFeedbackModal: function() {
        var $feedbackModal = $('#whFeedbackModal');

        $('body').append($feedbackModal.modal('show'));
    },

    renderPastMoods: function() {
        var that = this,
            tpl = this.whPastResultsTpl,
            pastResults = that.whPastResultsModel.get('pastResults'),
            $container = $('#whModal .happiness--past_results');

        $container.append(tpl(pastResults));

        $container.find('li:even').addClass('evenRow');
    },

    submitFeedbackForm: function() {
        var $form = $('#whFeedbackModal').find('form');

        if(!G5.util.formValidate($form.find('.validateme'))) {
            return false;
        } else {

            $.ajax({
                type: $form.attr('method'),
                url: $form.attr('action'),
                data: $form.serialize(),
                success: function () {
                    $('#whFeedbackModal').modal('hide');
                    $form.find('textarea').val('');
                }
            });

            event.preventDefault();
        }
    },

    clearFeedbackValidation: function() {
        var $feedbackForm = $('#whFeedbackModal form');

        $feedbackForm.find('.validateme').removeClass('error');

        $feedbackForm.find('textarea').val('');

        $feedbackForm.find('.qtip').qtip('hide');
    }

});
