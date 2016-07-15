/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
ProfilePageSecurityTabView:true
*/
ProfilePageSecurityTabView = Backbone.View.extend({
    initialize: function (opts) {
        'use strict';
        var self=this;

        this.tplName    = opts.tplName || "profilePageSecurityTab";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';
        this.on('templateloadedfirsttime', function() { self.saveInitialData(); } );
        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageSECURITYTabView initialized");
    },

    activate: function () {
        'use strict';
        this.render();
        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageSECURITYTabView activated");
    },

    events: {
        "click #profilePageSecurityTabButtonSave":   "formHandler",   // intercept any clicks on form buttons
        'click #profilePageSecurityTabButtonCancel': 'resetFields'
    },

    saveInitialData: function(){
        //save form data the first time around
        var $form       = $('#profilePageSecurityTabForm'),
            dataToSend = $form.serializeArray();
        $form.data('savedState', dataToSend);
    },    

    formHandler: function (evnt) {
        'use strict';
        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageSECURITYTabView formHandler...");

        evnt.preventDefault();

        var $form       = $('#profilePageSecurityTabForm'),
            actionURL   = $form.attr('action') || G5.props.URL_JSON_PROFILE_PAGE_SECURITY_TAB,
            method      = $form.attr('method'),
            dataToSendA = $form.serializeArray(),            
            dataToSend  = $form.serialize();

        // if the entire form fails to validate prevent it from continuing
        if (!G5.util.formValidate($form.find('.validateme'))) {
            return false;
        }

        $.ajax({
            dataType:   'g5json',
            url:        actionURL,
            type:       method,
            data:       dataToSend,
            success:    function (data, status) {
                console.log("[INFO] ProfilePageSECURITYTabView save success");

                //check for errors
                if( !G5.util.formValidateHandleJsonErrors($form, data.data.messages) ) {
                    return false;
                }

                $form.data('savedState', dataToSendA);
                //load in updated values to form (for 'reset' purposes)
                var $inputs = $('#profilePageSecurityTabForm :input.saveField'),
                    i = 0;
                $('#profilePageSecurityTabButtonCancel').trigger('click'); 
            },
            error: function (data, status) {
                console.log("[INFO] ProfilePageSECURITYTabView save error");
            }
        });

        // return false;
        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageSECURITYTabView ...formHandler");
    },

    render: function () {
        'use strict';
        var that = this;

        // if there is no html in the tab content element, go get the remote contents
        if( this.$el.html().length === 0 ) {
            this.$el
                .append('<span class="spin" />')
                .find('.spin').spin();
            
            TemplateManager.get(this.tplName,
                function (tpl) {
                    that.$el.empty().append(tpl({}));
                    that.trigger('templateloaded');
                    that.trigger('templateloadedfirsttime');                    
                },
                this.tplUrl);
        }
        // otherwise, just trigger the completion event
        else {
            this.trigger('templateloaded');
        }

        this.on('templateloaded', function() {
            $("#profilePageSecurityTabNewPassword", that.$el).focus();
        });

        //clear out old form values
        $('#profilePageSecurityTabForm').each (function(){
                this.reset();
        });            

        $('#profilePageSecurityTabButtonCancel').trigger('click');
        return this;
    },

    resetFields: function(event){
        event.preventDefault();

        var $form = $(event.target).closest('form'),
            savedState = $form.data('savedState');
        $form.find(':checked').removeAttr('checked');

        _.each(savedState, function(v, k) {
            var $elems = $form.find('[name="'+v.name+'"]');

            if( $elems.length == 1) {
                $elems.val(v.value);
            }
            else if( $elems.length > 1 ) {
                $elems.filter('[value="'+v.value+'"]').attr('checked', 'checked');
            }
        });
        _.each($form.find(':input'), function(current){
            var $current = $(current);
            if (!$current.hasClass('saveField')){
                $current.val('');
            }
        });

        //clear out errors
        $(".validate-tooltip").qtip("hide");
        $(".validateme").removeClass("error");

    }
});
