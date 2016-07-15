/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
console,
SSIPageView,
SSIContestCreateModalView,
SSICreatorPageView:true
*/
SSICreatorPageView = SSIPageView.extend({

    events: {
        'click .createNewContest': 'createNewContestOverlay',
        'click .qtipSubmit':       'setValueFromQtip',
        'click .exportCsvButton':  'exportCsv'
    },

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';

        //this is how we call the super-class initialize function (inherit its magic)
        SSIPageView.prototype.initialize.call(this, _.extend({}, opts, {
            // set access level boolean(s)
            modelData: {
                isCreator: true/*,
                // it's 50/50 that this will break things
                isManager: true*/
            }
        }));

        //inherit events from the superclass
        this.events = _.extend({}, SSIPageView.prototype.events, this.events);

        this.render();
    },

    createNewContestOverlay: function (event) {
        'use strict';
        event.preventDefault();

        console.log('[SSI] createNewContestOverlay called');

        this.overlay = new SSIContestCreateModalView({
            parentView: this,
            target: $(event.target),
            container: this.$el.find('.contestCreate')
        });
    },

    setValueFromQtip: function (event) {
        'use strict';
        event.preventDefault();

        var contestId = this.overlay.$el.find('.active').data('id');

        this.overlay.destroyView();

        this.$el.find('.contestType [value="' + contestId + '"]').attr('selected', 'selected');

        this.$el.find('.contestCreate').trigger('submit');

        return this;
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
