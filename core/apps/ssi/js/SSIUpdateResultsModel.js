/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
Backbone,
console,
G5,
SSIUpdateResultsModel:true
*/
SSIUpdateResultsModel = Backbone.Model.extend({
    loadData: function(opts){
        var self = this,
            data = {
                measureType: this.attributes.measureType,
                contestType: this.attributes.contestType
            };

        if(opts.uploadForm){
            data = opts.formData;
        } else{
            data = $.extend({}, data, opts);
        }

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: opts.url,
            data: data,
            cache: true,
            processData: opts.processData ? false : true,
            contentType: opts.contentType ? false: 'application/x-www-form-urlencoded; charset=UTF-8',
            success: function (serverResp, textStatus, jqXHR) {
                //regular .ajax json object response
                var data = serverResp.data.response,
                    errors = serverResp.getFirstError();

                if(errors) {
                    self.trigger('error:genericAjax', errors);
                } else {
                    self.set(data);

                    self.trigger('loadDataFinished', data);
                }
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

    submitCancelFormData: function(data, action){

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: action,
            data: data,
            success: function (serverResp, textStatus, jqXHR) {
                //expecting server redirect
            }
        });
    }
});
