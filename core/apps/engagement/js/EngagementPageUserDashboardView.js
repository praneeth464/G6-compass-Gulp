/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
RecognitionEzView,
EngagementPageDashboardView,
EngagementPageUserDashboardView:true
*/
EngagementPageUserDashboardView = EngagementPageDashboardView.extend({
    initialize: function() {
        console.log('[INFO] EngagementPageUserDashboardView: initialized', this);

        // this is how we call the super-class initialize function (inherit its magic)
        EngagementPageDashboardView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass EngagementPageDashboardView
        this.events = _.extend({}, EngagementPageDashboardView.prototype.events, this.events);
    },

    events: {
        "click .regonizeFromPubProfile" : "doEzRecognize"
    },

    render: function() {
    },

    doEzRecognize: function(e) {
        e.preventDefault();
        var that = this,
            $theModal = this.$el.find("#ezRecognizeMiniProfileModal").clone().appendTo("body").addClass("ezModuleModalClone").on("hidden", function() {
                $(this).remove();
            }),
            paxId = $(e.target).closest('.btn').data('participantId'),
            nodeId = $(e.target).closest('.btn').data('nodeId'),
            close = function () {
                $theModal.modal("hide");
            },
            init = function() {
                that.eZrecognizeView = new RecognitionEzView({
                    recipient : { id : paxId, nodes : [ { id : nodeId } ] },
                    el        : $theModal,
                    close     : close
                });

                that.eZrecognizeView.on("templateReady", function(){
                    $theModal.addClass('grid-dimension-4x4'); // faking the big size. some styles will be overridden to fit in the modal properly
                    that.eZrecognizeView.$el.find(".ezRecLiner").show(); // the View hides itself. we need to reshow it
                    that.eZrecognizeView.$el.find("#ezRecModalCloseBtn").show();

                    if( that.eZrecognizeView.$el.position().top < $(window).scrollTop() ) {
                        $.scrollTo(that.eZrecognizeView.$el, G5.props.ANIMATION_DURATION, {axis: 'y', offset: -20});
                    }
                });
            };

        // console.log("$.support.transition", $.support.transition);

        if ($.support.transition) { // ie is slow
            $theModal.on('shown', function() {
                init();
            });
            $theModal.modal("show");
        } else {
            $theModal.modal("show");
            init();
        }
    }
});
