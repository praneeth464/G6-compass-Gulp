/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
PageView,
PublicRecognitionSetCollectionView,
ProfilePageBadgesTabCollection,
ProfilePageBadgesTabView,
RecognitionEzView,
PublicProfilePageView:true
*/
PublicProfilePageView = PageView.extend({

    initialize : function(opts) {
        console.log("[INFO] PublicProfilePageView initialized", this);

        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'publicProfile';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        // we need to wrap all the Router/History stuff in this conditional
        // when the public profile opens in a sheet, this will conflict with any existing Router/History that's already been initialized
        if ( !Backbone.History.started ) {
            this.tabRouter = new Backbone.Router({
                routes: {
                    "tab/:name": "loadTab",
                    "tab/:name/:params" : "loadTab",
                    "*other": "loadTab"
                }
            });

            this.tabRouter.on("route:loadTab", function (name,params) {
                //Render views if required
                if (name === "Badges") {
                    that.activateBadges();
                }
                else if (name === "Recognition") {
                    that.activateRecognition();
                }
                //load tab by emulated click
                that.$el.find('li.tab'+name+' a').trigger("click");
            });

            Backbone.history.start();
        }

        this.tdPlayerStatsTable();
     },

    events : {
        'click .tabBadges' : 'activateBadges',
        'click .tabRecognition' : 'activateRecognition',
        'click .miniProfFollowLink': 'followParticipant',
        'click .regonizeFromPubProfile' : 'doEzRecognize',
        'click .profile-popover': 'attachParticipantPopover',
        'change #promotionSelect': 'changeTdStatsPromo'
    },

    activateBadges: function() {
        var thisView = this;

        if( !this.badgesLoaded ) {
            // utterly ridiculous, but I have to slow down the tab initialization until after the switch has happened
            setTimeout(function() {
                thisView.loadBadges();
            }, 0);
        }
    },

    activateRecognition: function() {
        var thisView = this;

        if( !this.pubRecSetCollectionView ) {
            // utterly ridiculous, but I have to slow down the tab initialization until after the switch has happened
            setTimeout(function() {
                thisView.loadRecognitions();
            }, 0);
        }
    },

    loadRecognitions: function() {
        this.pubRecSetCollectionView = new PublicRecognitionSetCollectionView({
            el:$("#Recognition"),
            "$tabsParent":$(),
            "$recognitionsParent": this.$el.find('.pubRecItemsCont'),
            recogSetId:"global",
            participantId: parseInt($("#participantId").val(), 10)
        });
    },

    loadBadges: function() {
        var that = this;

        var params = {
            participantId: parseInt($("#participantId").val(), 10)
        };

        this.BadgeTabCollection = new ProfilePageBadgesTabCollection({
            dataUrl : G5.props.URL_JSON_PUBLIC_PROFILE_LOAD_BADGES,
            dataParams : params
        });

        this.BadgeTabView = new ProfilePageBadgesTabView({
            el: this.$el.find("#Badges .span12"),
            tplName: "profilePageBadgesTab",
            model : this.BadgeTabCollection
        });

        this.BadgeTabView.activate();

        this.BadgeTabView.on('renderDone', function() {
            that.badgesLoaded = true;
        });
    },
    changeTdStatsPromo: function() {
        var thisView = this;

        //submit the throwdown tab page data
        thisView.$el.find('#profilePagePlayerStatsTab').submit();

        //empty the page
        thisView.$el.find('#tabPlayerStatsCont').empty();

        //re-render the page
        thisView.$el.find('#tabPlayerStatsCont')
            .load(
                G5.props.URL_HTML_THROWDOWN_PUBLIC_PROFILE,
                {responseType: 'html'},
                function(responseText, textStats, XMLHttpRequest){
                    G5.serverTimeout(responseText);
                }
            );

    },
    tdPlayerStatsTable: function(){
        this.$el.find('.td-matches-schedule tbody tr:even').addClass('stripe');
    },
    followParticipant: function(event) {
        var $target = $(event.target).closest('.btn');

        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        var parameters = {
            isFollowed: $target.hasClass("unfollow"),
            participantIds: $target.data('participantId')
        };

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse
            type: "POST",
            url: G5.props.URL_JSON_PARTICIPANT_FOLLOW,
            data: parameters,
            success:function(serverResp){
                if(serverResp.data.messages[0].isSuccess){
                    // hide one, show the other
                    $target.closest('div').find('.miniProfFollowLink').toggle();
                }else{
                    console.error("[ERROR] ParticipantPopoverView.followParticipant() - Server Error : " + serverResp.data.messages[0].text);
                }
            }
        });
    },

    doEzRecognize: function(event) {
        event.preventDefault();
        var that = this,
            $theModal = this.$el.find("#ezRecognizeMiniProfileModal").clone().appendTo("body").addClass("ezModuleModalClone").on("hidden", function() {
                $(this).remove();
            }),
            paxId = $(event.target).closest('.btn').data('participantId'),
            nodeId = $(event.target).closest('.btn').data('nodeId'),
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

    },
    attachParticipantPopover:function(e){
        var $tar = $(e.target),
            isSheet = ($tar.closest(".modal-stack").length > 0) ? {isSheet: true} : {isSheet: false};
        if ($tar.is("img")){
            $tar = $tar.closest("a");
        }

        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $tar.participantPopover(isSheet).qtip('show');
        }
        e.preventDefault();
    }
});
