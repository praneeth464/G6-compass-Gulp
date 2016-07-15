/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
SSIPageCollection:true
*/

SSIPageCollection = Backbone.Collection.extend({
    getView: function (cacheId) {
        'use strict';

        var model = this.get(cacheId);

        return model ? model.get('view') : undefined;
    },

    cacheView: function (view) {
        'use strict';

        if (view) {
            this.add({id: view.id, view: view});
        }
        return this;
    }
});
