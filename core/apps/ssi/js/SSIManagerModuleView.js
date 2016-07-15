/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
G5,
ModuleView,
SSISharedHelpersView,
console,
SSIManagerModuleView:true
*/
SSIManagerModuleView = ModuleView.extend({

    initialize: function() {
        'use strict';

        var that = this;

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({}, ModuleView.prototype.events, this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions', [
            {w: 1, h: 1}, // 1x1 square
            {w: 2, h: 1}, // 2x1 square
            {w: 2, h: 2}, // 2x2 square
            {w: 4, h: 2}, // 4x2 square
            {w: 4, h: 4}  // 4x4 square
        ]);

        var helpers = new SSISharedHelpersView({});
        // this.setStatus = _.bind(helpers.setStatus, this);
        this.requestWrap = _.bind(helpers.requestWrap, helpers);

        this.render();
    },

    render: function () {
        'use strict';

        this.on('templateLoaded', function(tpl, vars, subTpls) {

            var listTpl = subTpls.contestListItems,
                $wrap = this.$el.find('.module-liner'),
                data = {
                    $status: $wrap.find('.contestStatus'),
                    url: G5.props.URL_JSON_SSI_ACTIVE_CONTESTS,
                    data: {}
                };

            this.requestWrap(data)
                .then(
                    _.bind(function(servResp) {
                        if (!listTpl) {
                            console.warn('[SSI] listTpl not found in SSIManagerModuleView');
                            return;
                        }

                        if (servResp.data.activeContestsList) {

                            servResp.data.activeContestsList = _.sortBy(
                                servResp.data.activeContestsList,
                                function (contest) { // make sure sort is case insensitive
                                    return contest.name.toLowerCase();
                                }
                            );
                        }

                        var html = listTpl(servResp.data);

                        $wrap.html(html);
                    }, this),
                    function() {
                        console.error('[SSI] error requesting data from G5.props.URL_JSON_SSI_ACTIVE_CONTESTS');
                    }
                );
        });

        ModuleView.prototype.render.apply(this);

        return this;
    }

});
