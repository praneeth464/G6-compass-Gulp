/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
SSIRouter:true
*/

SSIRouter = Backbone.Router.extend({

    routes: {
        'contest/:id': 'contest',
        'archived': 'archived',
        'denied': 'denied',
        '*catchall': 'index'
    },

    /**
     * As far as I can tell, Backbone doesn't provide a generic
     * route event emitter. These functions broadcast that
     * generic event and the rest of the functionality should be
     * handled with listeners else where.
     */
    contest: function(id) {
        'use strict';
        this.trigger('route:*', 'contest/' + id, id);
    },

    archived: function() {
        'use strict';
        this.trigger('route:*', 'archived');
    },

    denied: function() {
        'use strict';
        this.trigger('route:*', 'denied');
    },

    index: function() {
        'use strict';
        this.trigger('route:*', 'all');
    }
});
