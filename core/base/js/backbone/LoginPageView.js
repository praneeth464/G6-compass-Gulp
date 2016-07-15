/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
TemplateManager,
LoginPageView:true
*/
LoginPageView = PageView.extend({

    //override super-class initialize function
    initialize : function(opts) {
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = '';

        //this is how we call the super-class initialize function (inherit its magic)
        this.constructor.__super__.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},this.constructor.__super__.events,this.events);

        this.render();
    },

    events : {
        "submit form" : "formHandler",
        "keypress input[type=password]": "focusOnEnter",
        // intercept any clicks on form buttons
        "click .form-actions button" : "formActions",

        "change #whichHelp" : "whichHelp",
        "click .gethelp" : "getHelp"
    },

    render : function() {
        var helpwith = $.query.get('helpwith'),
            $reg = this.$el.find('#loginPageFormRegistration'),
            $log = this.$el.find('#loginPageFormLogin');

        if( helpwith ) {
            $('#whichHelp').val(helpwith);
            this.whichHelp();
        }

        // check for registration section and set some styles
        if($reg.length===0) {
            $log.addClass('addPizazz'); // css to add an arrow to left
        }

        // focus on the first text field
        this.$el.find('input:first').focus();
    },
    focusOnEnter: function(e) {
        if( $.browser.msie && e.keyCode === 13 ){
            $('#loginFormSubmit').focus();
        }
    },
    formActions : function(e) {
        var $form = $(e.target).closest('form');

        $form.data( 'trigger', $(e.target) );

    },

    formHandler : function(e) {
        var $form = $(e.target).closest('form'),
            $trigger = $form.data('trigger') || $("button:submit").filter(":visible"),
            method = $form.attr('method'),
            action = $trigger.attr('formaction') || $form.attr('action') || $form.data('default-action'),
            $validate = $form.find('.validateme'),
            data = $form.serializeArray(),
            extraParams = { responseType: 'html' },
            request;

        data.push({ name : 'trigger', value : $trigger.val() });

        $trigger.attr("disabled", "disabled");

        // create a spinner next to the buttons to indicate that the server is doing something
        $trigger.parent()
            .append('<span class="spin" />')
            .find('.spin').spin({
                //left: 12
            });

        // if the entire form fails to validate prevent it from continuing
        if( !G5.util.formValidate($validate) ) {
            // kill the spinner
            $trigger.parent().find('.spin').remove();
            $trigger.removeAttr("disabled");

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
            $trigger.removeAttr("disabled");

            // if the form fails validation on the server, prevent it from doing anything else
            if( !G5.util.formValidateHandleJsonErrors($form, data.data.messages) ) {
                // kill the spinner
                $trigger.parent().find('.spin').remove();
                return false;
            }
            // if the response contains a serverCommand, let it run and prevent the form from doing anything else
            else if( _.any(data.data.messages, function(message) { return message.type == 'serverCommand'; }) ) {
                // kill the spinner
                $trigger.parent().find('.spin').remove();
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
                        $form.closest('.whichhelp').empty().html(data);
                    }
                });
            }
        });

        request.fail(function(jqXHR, textStatus, errorThrown) {
            console.log('[ERROR] LoginPageView: form submission .ajax failed', jqXHR, textStatus, errorThrown);
        });

    },

    getHelp : function(e) {
        var helpwith = $(e.target).data('whichhelp');

        $('#whichHelp').val(helpwith);
        this.whichHelp();
    },

    whichHelp : function(e) {
        var helpwith = $('#whichHelp').val(),
            $target = $('#loginPageHelp .helpwith_'+helpwith),
            template = $target.data('template');

        if( template ) {
            TemplateManager.get(template,function(tpl){
                $target.empty().html(tpl(tpl));

                if( helpwith == 'forgotid' ) {
                    $('#loginPageHelp .helpwith_forgotid #subject')
                        .val( $('#loginPageHelp .helpwith_forgotid #subject').parents('.control-group').data('inputvalueForgotid') )
                        .attr('readonly', 'readonly');
                }
                else {
                    $('#loginPageHelp .helpwith_forgotid #subject')
                        .val('')
                        .removeAttr('readonly');
                }
            },G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/');
        }

        $('#loginPageHelp .whichhelp').addClass('hide');
        $('#loginPageHelp .helpwith_'+helpwith).removeClass('hide');
    }

});