/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
PageView,
KPMModelView,
KPMPageTeamDashboardView:true
*/
KPMPageTeamDashboardView = PageView.extend({
    initialize: function(opts) {
        console.log('[INFO] KPMPageTeamDashboardView: initialized', this);

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        var settings = {
            mode : 'user'
        };

        this.settings = $.extend(true, {}, settings, opts);

        this.modelView = new KPMModelView({
            el: this.$el.find('.kpmModelView'),
            mode: this.settings.mode
        });

        // this.modelView.on('renderDone', function() {
        //     this.render();
        // }, this);
    },

    events: {},

    render: function() {
        alert('bar');

        // this.$el.find('.span12').html( this.modelView.$el );
    }
});
