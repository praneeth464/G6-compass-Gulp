/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
TemplateManager,
ProfilePageShellTabSetEditView:true
*/
ProfilePageShellTabSetEditView = Backbone.View.extend({
    initialize: function (opts) {
        'use strict';

        this.viewLoaded = false; // This view is static and need be loaded only once
        this.tplName    = opts.tplName || "profilePageShellTabSetEditView";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';

        //ARNxyzzy// console.log("[INFO]19 ARNlogging ProfilePageShellTabSetEditView initialized");
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
    },

    render: function () {
        'use strict';

        this.trigger('renderDone');

        this.$el.find('#profilePageShellTabs').appendTo('#profilePageShellActiveTabSetTabs');

        //ARNxyzzy// console.log("[INFO]20 ARNlogging ProfilePageShellTabSetEditView rendered");

        return this;
    }
});
