/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
Backbone,
G5,
TemplateManager,
ProfilePageAlertsTabAlertsCollection,
ProfilePageAlertsTabAlertsView:true
*/
ProfilePageAlertsTabAlertsView = Backbone.View.extend({

    initialize: function (opts) {
        'use strict';
        var thisView = this;

        this.profilePageAlertsTabAlertsCollection = new ProfilePageAlertsTabAlertsCollection();
        this.profilePageAlertsTabAlertsCollection.loadAlerts();

    }, // initialize

    render: function (listOfAlerts) {
        'use strict';

        var self = this,
            tplName = 'profilePageAlertsTabAlerts',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';
        this.$el = $('#profilePageAlertsTabAlertsCollection');

        this.$el.empty();
        TemplateManager.get(tplName, function (tpl) {
            _.each(listOfAlerts, function (alertMessage) {

                //alertMessage.alertText = alertMessage.alertText.replace(/<(?:.|\n)*?>/gm, ''); //strip out html
                self.$el.append(tpl(alertMessage));

            });
            self.trigger('rendered');
        }, tplUrl);

        } // render
});