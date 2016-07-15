/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
console,
Backbone,
PageView,
PaginationView,
SSIModuleView,
SSIStackRankCollectionView,
SSIParticipantContestView,
SSIEventBus:true
*/
/**
 * Creates a shared object for all passed child objects.
 * Doing so allows for a common place to route events to/through.
 *
 * Borrows `.on` and `.trigger` from an empty Backbone.View
 *
 * @param {array} descendants - list of Views, Collections, and/or Models
 * @returns {object}
 */
SSIEventBus = Backbone.View.extend({
    initialize: function(descendants) {
        'use strict';

        var bus = new Backbone.View();

        _.each(descendants, function (d) {
            if (d) {
                d.on('all', function () {
                    // console.log('[SSI] event bus', arguments);
                    bus.trigger.apply(bus, _.toArray(arguments));
                });
                d.trigger('busCreated', bus);
            }
        });

        return this;
    }

});