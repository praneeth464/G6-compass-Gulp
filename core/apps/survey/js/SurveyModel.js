/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SurveyModel:true
*/
SurveyModel = Backbone.Model.extend({
    initialize: function(attr, opts) {
        var settings = {
            url: {
                load: G5.props.URL_JSON_SURVEY_PAGE_TAKE_SURVEY,
                submit: G5.props.URL_JSON_SURVEY_PAGE_SUBMIT_SURVEY,
                save: G5.props.URL_JSON_SURVEY_PAGE_SAVE_SURVEY
            }
        };

        this.options = $.extend(true, settings, opts);

        this.on('surveyDataLoaded', this.processSurveyData, this);
        this.on('surveyDataSubmitted', this.processSurveyData, this);
    },

    loadSurveyData: function() {
        var that = this;

        if( this.options && this.options.surveyJson ) {
            this.set(this.options.surveyJson);

            that.trigger('surveyDataLoaded');
        }
        else {
            $.ajax({
                url: this.options.url.load,
                dataType: 'g5json',
                type: "POST",
                success: function(servResp) {
                    that.set(servResp.data.surveyJson ? servResp.data.surveyJson : {});

                    that.trigger('surveyDataLoaded');
                }
            });
        }
    },

    processSurveyData: function(newData) {
        // if newData is passed, it will be merged into existing data
        if( newData ) {
            this.set( $.extend(true, {}, this.toJSON(), newData) );
        }

        // create an index value on each question because "number" doesn't always start with 1
        _.each(this.get('questions'), function(q,i) {
            q.index = i+1;
        });

        // process 'range' type questions
        _.each(_.where(this.get('questions'), {type:"range"}), function(q) {
            if(!q.slider.value) {
                // if there's no start value, find the middle
                q.slider.value = (q.slider.max - q.slider.min) / 2 + q.slider.min;
                // round the start value to the nearest valid value using the step to calculate
                q.slider.value = Math.round(q.slider.value / q.slider.step) * q.slider.step;
            }
            q.slider.minLabel = ( _.where(q.answers, {number:q.slider.min})[0] || {text:null} ).text;
            q.slider.maxLabel = ( _.where(q.answers, {number:q.slider.max})[0] || {text:null} ).text;
            q.slider.orientation = q.slider.orientation || 'horizontal';
        });

        this.trigger('surveyDataProcessed');
    },

    sendSurvey: function(method,data) {
        var that = this,
            url = method == 'submit' ? this.options.url.submit : this.options.url.save;

        $.ajax({
            url: url,
            type: 'POST',
            dataType: 'g5json',
            data: data,
            success: function(servResp) {
                // we are going to rely on the server sending back a redirect serverCommand to judge whether or not this was a successful submit
                var successfulRedirect = servResp.data.messages.length && servResp.data.messages[0].type == 'serverCommand' && servResp.data.messages[0].command == 'redirect',
                    successfulUpdate = servResp.data.surveyJson && servResp.data.surveyJson.id,
                    successful = successfulRedirect || successfulUpdate;

                if( !successful ) {
                    console.log('Response was a failure', servResp);
                    that.trigger('surveyDataSubmitFailed');
                    return false;
                }

                that.trigger('surveyDataSubmitted', servResp.data.surveyJson);
            }
        });
    }
});