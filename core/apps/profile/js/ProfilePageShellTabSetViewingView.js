/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
TemplateManager,
ProfilePageShellTabSetViewingView:true
*/
ProfilePageShellTabSetViewingView = Backbone.View.extend({
    initialize: function (opts) {
        'use strict';

        this.viewLoaded = false; // This view is static and need be loaded only once
        this.tplName    = opts.tplName || "profilePageShellTabSetViewingView";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';

        //ARNxyzzy// console.log("[INFO]24 ARNlogging ProfilePageShellTabSetViewingView initialized");
    },

    deactivate: function () {
        'use strict';

        if (this.viewLoaded) {
            this.contentsFromDOM = this.$el.contents().detach();
            this.contentsFromDOM.filter('.tabbable').prepend( $('#profilePageShellTabs') );
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
        //ARNxyzzy// console.log("[INFO]25 ARNlogging ProfilePageShellTabSetViewingView activate !!!!!!!!!!!!!!!!!!!!!");
    },

    render: function () {
        'use strict';

        this.$el.find('#profilePageShellTabs').appendTo('#profilePageShellActiveTabSetTabs');

        //ARNxyzzy// console.log("[INFO]26 ARNlogging ProfilePageShellTabSetViewingView rendered !!!!!!!!!!!!!!!!!!!!!");
        this.trigger('renderDone');
        return this;
    }
});
