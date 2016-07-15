/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
PageView,
ProfilePagePersonalInfoTabView,
ProfilePageBadgesTabView,
ProfilePageAlertsAndMessagesTabView,
ProfilePageStatementTabView,
ProfilePageFollowListTabView,
ProfilePageActivityHistoryTabView,
ProfilePageDashboardTabView,
ProfilePageThrowdownStatsTabView,
ProfilePageSecurityTabView,
ProfilePagePreferencesTabView,
ProfilePageProxiesTabView,
ProfilePageView:true
*/
ProfilePageView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageView initializing...");

        //set the appname (getTpl() method uses this)
        this.appName = 'profile';
        this.currentTabName = "";

        this.$tabSwitcher = this.$el.find('#tabSwitcher');

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        // All nine tab view in either ViewingTabSet or EditTabSet
        this.PersonalInfoTabView            = new ProfilePagePersonalInfoTabView({el:           $("#profilePagePersonalInfoTab")});
        this.BadgesTabView                  = new ProfilePageBadgesTabView({
            el: $("#profilePageBadgesTab"),
            tplName: "profilePageBadgesTab"
        });
        this.AlertsAndMessagesTabView       = new ProfilePageAlertsAndMessagesTabView({el:      $("#profilePageAlertsAndMessagesTab")});
        this.StatementTabView               = new ProfilePageStatementTabView({el:              $("#profilePageStatementTab")});
        this.FollowListTabView              = new ProfilePageFollowListTabView({el:             $("#profilePageFollowListTab")});
        this.ActivityHistoryTabView         = new ProfilePageActivityHistoryTabView({el:        $("#profilePageActivityHistoryTab")});
        this.DashboardTabView               = new ProfilePageDashboardTabView({
            el: $("#profilePageDashboardTab"),
            userId: opts.userId || null,
            profilePageView: this
        });
        this.ThrowdownStatsTabView          = new ProfilePageThrowdownStatsTabView({el:         $("#profilePageThrowdownStatsTab")});
        this.SecurityTabView                = new ProfilePageSecurityTabView({el:               $("#profilePageSecurityTab")});
        this.PreferencesTabView             = new ProfilePagePreferencesTabView({
            el:                 $("#profilePagePreferencesTab"),
            profilePageView:    this
        });
        this.ProxiesTabView             = new ProfilePageProxiesTabView({el:           $("#profilePageProxiesTab")});

        this.shellRouter = new Backbone.Router({
            routes: {
                "tab/:name": "loadTab",
                "tab/:name/:params" : "loadTab",
                "*other": "loadTab"
            }
        });
        this.shellRouter.on("route:loadTab", function (name,params) {
            if( that[name+'TabView'] ) {
                that.currentTabView = that[name+'TabView'];
                that.currentTabName = name;
            }
            else {
                that.currentTabView = that.PersonalInfoTabView;
                that.currentTabName = 'PersonalInfo';
            }

            that.currentTabView._params = params;

            that.activateTab();

            //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageView route:loadTab [" + name + "]");
        });

        this.PersonalInfoTabView.on('updateAvatar', function(avatarUrl){
            // set the avatar in the page header
            $("#participantProfileView").find('.profile-pic').attr("src", avatarUrl);
        });


        Backbone.history.start();

        this.updatePartProf();

        this.globalHeader.partProf.model.on('change', this.updatePartProf, this);

        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageView ...initialized");
    },

    activateTab: function () {
        'use strict';
        var currentTabPane = $('#profilePage' + this.currentTabName + 'Tab');
        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageView.activateTab...");

        this.currentTabView.setElement(currentTabPane);
        $('#profilePageShellActiveTabSet .tab-pane').removeClass('active');
        currentTabPane.addClass('active');

        // Must be after the above
        this.currentTabView.activate();

        this.$tabSwitcher.find('.tabSelected').html( this.$tabSwitcher.find('#tab-'+this.currentTabName).html() );

        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageView.activateTab");
    },

    updatePartProf: function () {
        'use strict';
        $("#partProfFirstName").empty().append(this.getParticipantProfile("firstName"));
        $("#partProfLastName").empty().append(this.getParticipantProfile("lastName"));

        // must pay attention to programs that don't use points
        if( this.getParticipantProfile("points") == -1 ) {
            $("#partProfPoints").parent().hide();
        }
        else {
            $("#partProfPoints").empty().append(
                $.format.number(this.getParticipantProfile("points"))
            );
        }

        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageView.updatePartProf");
    }

});