/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
SSIPageView,
SSIManagerPageView:true
*/
SSIManagerPageView = SSIPageView.extend({

    events: {
        'click .exportCsvButton':  'exportCsv'
    },

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';

        //this is how we call the super-class initialize function (inherit its magic)
        // SSIPageView.prototype.initialize.apply(this, arguments);
        SSIPageView.prototype.initialize.call(this, _.extend({}, opts, {
            // set access level boolean(s)
            modelData: {
                isManager: true
            }
        }));

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
