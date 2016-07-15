/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
ApprovalsPageClaimsModel:true
*/
ApprovalsPageClaimsModel = Backbone.Model.extend({
    initialize: function(attr,opts) {
        this.options = opts;

        // set the preloaded data flag to false because nothing has been loaded yet
        this._dataPreloaded = false;

        this.on('claimsDataLoaded', this.processClaimsData, this);
    },

    loadClaimsData: function(formData, opts) {
        var that = this;

        // if a JSON object has been passed as an option AND no data has been preloaded into the model
        if( this.options && this.options.claimsJson && this._dataPreloaded === false ) {
            // load that JSON into the data model
            this.set(this.options.claimsJson);

            // set the preloaded data flag to true so this never runs again
            this._dataPreloaded = true;

            this.trigger('claimsDataLoaded');
        }
        // otherwise, make a call to get JSON
        else {
            // if no formData has been passed, we can't make this call
            if( !formData ) {
                this.trigger('noFormDataPassed');
                return false;
            }
            $.ajax({
                url: G5.props.URL_JSON_APPROVALS_LOAD_CLAIMS,
                data: formData,
                dataType: 'g5json',
                type: "POST",
                success: function(servResp) {
                    // if we're only loading the claims (pagination/sorting)
                    if( opts && opts.claimsOnly === true ) {
                        that.get('promotion').claims = servResp.data.claimsJson.promotion.claims;
                        that.set('promotion', that.get('promotion'));
                    }
                    // otherwise, reset the whole data model
                    else {
                        that.set(servResp.data.claimsJson ? servResp.data.claimsJson : {});
                    }

                    that.trigger('claimsDataLoaded');
                }
            });
        }
    },

    processClaimsData: function() {
        // if there are no results, throw a unique trigger
        if( this.get('promotion').claims.results.length <= 0 ) {
            this.trigger('noClaimsDataToProcess');
            return false;
        }

        // mark the sorted upon column
        _.where(this.get('promotion').claims.meta.columns, {name: this.get('promotion').claims.meta.sortedOn})[0].sortedOn = true;
        _.where(this.get('promotion').claims.meta.columns, {sortedOn: true})[0].sortedBy = this.get('promotion').claims.meta.sortedBy;

        this.trigger('claimsDataProcessed');
    },

    sendSurvey: function(method,data) {
        var that = this,
            url = method == 'submit' ? G5.props.URL_JSON_SURVEY_PAGE_SUBMIT_SURVEY : G5.props.URL_JSON_SURVEY_PAGE_SAVE_SURVEY;

        $.ajax({
            url: url,
            type: 'POST',
            dataType: 'g5json',
            data: data,
            success: function(servResp) {
                // we are going to rely on the server sending back a redirect serverCommand to judge whether or not this was a successful submit
                var successful = servResp.data.messages.length && servResp.data.messages[0].type == 'serverCommand' && servResp.data.messages[0].command == 'redirect';

                if( !successful ) {
                    console.log('Response was a failure', servResp);
                    that.trigger('surveyDataSubmitFailed');
                    return false;
                }

                that.trigger('surveyDataSubmitted');
            }
        });
    }
});