/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
ProfilePageAlertsTabMessagesCollection,
ProfilePageAlertsTabMessagesView:true
*/
ProfilePageAlertsTabMessagesView = Backbone.View.extend({
//    el: '#profilePageAlertsTabMessages', // el attaches to existing element

    initialize: function (opts) {
        "use strict";
        var thisView = this;

        this.profilePageAlertsTabMessagesCollection = new ProfilePageAlertsTabMessagesCollection();
        this.profilePageAlertsTabMessagesCollection.loadMessages();
    },

    render: function (listOfMessages, messageCounter) {
        "use strict";
        var self    = this,
            tplName = 'profilePageAlertsTabMessages',
            tplUrl  = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/',
            $pageCounter = $("#messagePaginationCounter");

        this.$cont = $('#profilePageAlertsTabMessagesCollection');
        //empty the carousel items
        this.$cont.empty();

        _.each(listOfMessages,
            function (alertMessage, index) {
                TemplateManager.get(tplName,
                    function (tpl) {
                        //alertMessage.messageText = alertMessage.messageText.replace(/<(?:.|\n)*?>/gm, ''); //strip out html
                        self.$cont.append(tpl(alertMessage));

                        // Defect #2911
                        // maybe someday, and even then, not like this, anything but this
                        // if ((index+1) >= listOfMessages.length){
                        //     self.$cont.find("a").each(function() {
                        //         $(this).popover(); //build each one's popover
                        //     });
                        // }
                    },
                    tplUrl);
            });

        $pageCounter.html(messageCounter);
    }
});
