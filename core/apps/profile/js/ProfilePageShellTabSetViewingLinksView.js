/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
Backbone,
G5,
TemplateManager,
ProfilePageShellTabSetViewingLinksView:true
*/
ProfilePageShellTabSetViewingLinksView = Backbone.View.extend({
    initialize: function (opts) {
        'use strict';

        this.viewLoaded = false; // This view is static and need be loaded only once
        this.tplName    = opts.tplName || "profilePageShellTabSetViewingLinksView";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';

        //ARNxyzzy// console.log("[INFO]27 ARNlogging ProfilePageShellTabSetViewingLinksView initialized");
    },

    deactivate: function () {
        'use strict';
        if (this.viewLoaded) {
            this.contentsFromDOM = this.$el.contents().detach();
        }
    },

    activate: function () {
        'use strict';
        var that = this;

        if (this.viewLoaded) {
            this.$el.append(this.contentsFromDOM);
            this.render();
        } else {
            TemplateManager.get(this.tplName,
                function (tpl) {
                    that.$el.empty().append(tpl({}));
                    that.viewLoaded = true;
                    that.render();
                },
                this.tplUrl);
        }
        //ARNxyzzy// console.log("[INFO]28 ARNlogging ProfilePageShellTabSetViewingLinksView rendered");
    },

    render: function () {
        'use strict';

        this.trigger('renderDone');

        //ARNxyzzy// console.log("[INFO]29 ARNlogging ProfilePageShellTabSetViewingLinksView rendered");

        return this;
    }
});
