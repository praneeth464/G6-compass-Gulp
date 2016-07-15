/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
ContactFormView:true
*/
ContactFormView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'contactForm';
        this.tabSetEditCurrent = false;
        this.tabSetViewingCurrent = false;
        this.currentTabName = "";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

    },

    events : {
        "submit form" : "formHandler",
        // intercept any clicks on form buttons
        "click .form-actions button" : "formActions"
    },

    formActions : function(e) {
        var $form = $(e.target).closest('form');

        $form.data( 'trigger', $(e.target) );
    },

    formHandler : function(e) {
        var self = this,
            $form = $(e.target),
            $trigger = $form.data('trigger'),
            method = $form.attr('method'),
            action = $trigger.attr('formaction') || $form.attr('action') || $form.data('default-action'),
            $validate = $form.find('.validateme'),
            data = $form.serializeArray(),
            extraParams = { responseType: 'html' },
            request;

        data.push({ name : 'trigger', value : $trigger.val() });

        // if the entire form fails to validate prevent it from continuing
        if( !G5.util.formValidate($validate) ) {
            return false;
        }

        // assume all forms submit via ajax
        e.preventDefault();

        // otherwise, continue with the ajax submit
        request = $.ajax({
            url : action,
            type : method,
            data : data,
            dataType : 'g5json'
        });
        
        data = _.object(_.pluck(data,'name'),_.pluck(data,'value'));
        extraParams = $.extend({}, extraParams, data);

        request.done(function(data, textStatus, jqXHR) {
            // if the form fails validation on the server, prevent it from doing anything else
            if( !G5.util.formValidateHandleJsonErrors($form, data.data.messages) ) {
                return false;
            }
            // if the response contains a serverCommand, let it run and prevent the form from doing anything else
            else if( _.any(data.data.messages, function(message) { return message.type == 'serverCommand'; }) ) {
                //Expecting a server redirect
                self.$el.parent().parent().find('.modal-footer a').trigger('click');
                return false;
            }
            // if the response comes back empty, all is good. Load the next form.
            else if( data.data.messages.length <= 0 ) {
                $.ajax({
                    url : $form.attr('action'),
                    type : 'POST',
                    data : extraParams,
                    dataType : 'g5html',
                    success : function(data) {
                        //$form.closest('.whichhelp').empty().html(data);
                    }
                });
            }
        });

        request.fail(function(jqXHR, textStatus, errorThrown) {
            console.log('[ERROR] LoginPageView: form submission .ajax failed', jqXHR, textStatus, errorThrown);

        });

    }
});