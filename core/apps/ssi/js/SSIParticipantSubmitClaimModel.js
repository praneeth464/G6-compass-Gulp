/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
Backbone,
console,
G5,
SSIParticipantSubmitClaimModel:true
*/
SSIParticipantSubmitClaimModel = Backbone.Model.extend({
    loadData: function(opts){
        var self = this,
            data = [];

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_SSI_SUBMIT_CLAIM_FORM,
            data: data,
            cache: true,
            success: function (serverResp, textStatus, jqXHR) {
                //regular .ajax json object response
                var data = serverResp.data;
                    self.set( self.twiddleDeeDiddle(data) );
                    self.trigger('loadDataFinished', data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                var errors;
                console.error('[ERROR] SSIContestModel: ajax call to check contest name ['+name+']', jqXHR, textStatus, errorThrown);
                // struts returns full HTML for FORM VALIDATION - BOOO!
                if(textStatus=='parsererror') {
                    errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                    if(errors) {
                        self.trigger('error:genericAjax', errors);
                    }
                }
            }
        });
    },

    //massage data coming in from JAVA

    // ORDERING: we only assume the index of all address fields is sorted, others sortBy sequenceNumber

    // ALL Fields
    // 1) sort by "sequenceNumber"
    // 2) generate "index" field from sorted list order

    // Address Fields
    // 1) for all fields with fieldGroup="address"
    // 2) they will all have same ID, since they are not going into a Collection (a set) this should be fine
    // 3) index of address fields will be used for ordering, so preserve their order when others are sorted
    twiddleDeeDiddle: function(data) {
        var fields = data.fields||[],
            country = _.where(fields, {subType: "country", fieldGroup: "address"}),
            // no address fields except country field
            fieldsPlusCountry = _.filter(fields, function(f) {
                if(!f.fieldGroup || f.fieldGroup != "address") { return true; } // keep it
                if(f.fieldGroup == "address" && f.subType == "country") { return true; } // keep only this addy field
                return false; // dump the rest
            }),
            // all address fields sans country
            addysNoCountry = _.filter(fields, function(f){
                return f.fieldGroup == "address" &&  f.subType != "country";
            });

        // sort by sequence num
        fieldsPlusCountry = _.sortBy(fieldsPlusCountry, function(f){return f.sequenceNumber;});

        if(country.length) {
            country = country[0]; // first element in _.where return array
            // recompose the field list in proper order
            fields = _.flatten([
                // fields before addys
                _.filter(fieldsPlusCountry, function(f) { return f.sequenceNumber <= country.sequenceNumber; }),
                // addys (country is at end of above array)
                addysNoCountry,
                // fields after addys
                _.filter(fieldsPlusCountry, function(f) { return f.sequenceNumber > country.sequenceNumber; })
            ]);//_.flatten
        }

        // add "index"
        _.each(fields, function(f,i) { f['index'] = i; });

        data.fields = fields;

        _.each(data.activities, function(f,i) { f['index'] = i; });

        return data;
    },

    ajaxGeneric: function(url, data, successCallback) {
        var that = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: url,
            data: data,
            cache: true,
            success: function (serverResp, textStatus, jqXHR) {
            var err = serverResp.getFirstError(),
                data = serverResp.data;

                if(err) {
                    that.trigger('error:genericAjax', err);
                }

                if(successCallback) { successCallback(data); }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                var errors;
                console.error('[ERROR] SSIParticipantSubmitClaimModel.ajaxGeneric()', jqXHR, textStatus, errorThrown);
                // struts returns full HTML for FORM VALIDATION - BOOO!
                if(textStatus=='parsererror') {
                    errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                    if(errors) {
                        that.trigger('error:genericAjax', errors);
                    }
                }
            }
        });
    }

});
