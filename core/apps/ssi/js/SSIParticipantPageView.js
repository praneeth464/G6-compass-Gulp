/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
SSIPageView,
SSIParticipantPageView:true
*/
SSIParticipantPageView = SSIPageView.extend({
    events: {
        'click .exportCsvButton':  'exportCsv',
        'click .backToContestWrap a': function(e){
            e.preventDefault();
            javascript:history.go(-1);
        }
    },

    initialize: function () {
        'use strict';

        //this is how we call the super-class initialize function (inherit its magic)
        SSIPageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, SSIPageView.prototype.events, this.events);

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        this.render();
    },

    exportCsv: function(e) {
        if ( G5.props.REPORTS_LARGE_AUDIENCE === true ) {
            e.preventDefault();

            var $tar = $(e.target),
                thisView = this;

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: $tar.attr('href'),
                data: {},
                error: function(jqXHR, textStatus, errorThrown) {
                    thisView.$el.prepend('<p class="alert alert-error">' + textStatus + ': ' + jqXHR.status + ' ' + errorThrown + '</p>');
                },
                success: function(servResp){
                    // Shouldn't ever be a response to process
                    // This event should always result in a serverCommand in the JSON
                    return;
                }
            });
        }
    }

});
