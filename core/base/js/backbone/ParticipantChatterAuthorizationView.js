/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
console,
Modernizr,
Backbone,
G5,
TemplateManager,
ParticipantChatterAuthorizationView:true
*/
ParticipantChatterAuthorizationView = PageView.extend({

    initialize : function(opts) {
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = '';

        //this is how we call the super-class initialize function (inherit its magic)
        this.constructor.__super__.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},this.constructor.__super__.events,this.events);

        this.parseUrl();
    },

    events: {
        "click #chatterFormSubmit": "formSubmitHandler",
        "click .chatterFormCancel": "closeChatterWindow"
    },

    render: function() {

    },

    parseUrl: function() {
        var urlParams;

        (window.onpopstate = function () {
            var match,
                pl     = /\+/g,
                search = /([^&=]+)=?([^&]*)/g,
                decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
                query  = window.location.search.substring(1);

            urlParams = {};

            while (match = search.exec(query))
            urlParams[decode(match[1])] = decode(match[2]);
        })();

        console.log("[NEW!!!] Participant Chatter Authorization params" , urlParams);

         _.each(urlParams, function(key, value){
            var paramField;

             paramField = $('<input>')
                                .attr({
                                    type: 'hidden',
                                    name: value,
                                    value: key
                                 });
            paramField.appendTo('form');

            if(value === "state"){
                var linkKeys = key.split("||"), //split key at pipes to get array values for recognition text and link
                    paramField1 = $('.currentRecognitionText span').html(linkKeys[0]),
                    paramField2 = $('.chatterRecognitionLink').attr('href', linkKeys[1]).html(linkKeys[2]);

                paramField1.appendTo('form .currentRecognitionText');

                if(linkKeys[1] || linkKeys[2]){
                    $('.chatterRecognitionLink').show();
                    paramField2.appendTo('form .currentRecognitionText');
                }else {
                    $('.chatterRecognitionLink').hide();
                }
            }
        });
    },
    formSubmitHandler: function(e) {
        var $form = $(e.target).closest('form'),
            $trigger = $form.data('trigger') || $("button:submit").filter(":visible"),
            url = window.location,
            method = $form.attr('method'),
            action = $trigger.attr('formaction') || $form.attr('action') || $form.data('default-action'),
            action2,
            data = $form.serialize();

        // assume all forms submit via ajax
        e.preventDefault();

        // otherwise, continue with the ajax submit
        action2 = action + "&" + data;
        url = action2;

        window.location = url;
    },
    closeChatterWindow: function() {
        window.open(window.location,'_self');

        window.close();

        return false;
    }
});