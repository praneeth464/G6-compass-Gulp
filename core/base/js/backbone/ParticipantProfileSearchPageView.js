/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
console,
PageView,
ParticipantSearchView,
ParticipantProfileSearchPageView:true
*/
ParticipantProfileSearchPageView = PageView.extend({

    //override super-class initialize function
    events: {
    },

    initialize: function(opts) {
        console.log('[INFO] ClaimPageView: Claim Page View initialized', this);
        var self = this,
            formData = "", // parse form into JSON
            $promo;

        this.appType ='claimPreview';

        //If Valid Org Units process them.
        if (opts && opts.formSetup && opts.formSetup.nodes) {
            self.orgUnits = opts.formSetup.nodes;
        }

        //set the appname (getTpl() method uses this)
        this.appName = "ProfileParticipantSearch";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);
        self.initializeParticipantSearch();

    },
/*
    resetParticipantSearch: function () {
        var self = this;
        self.participantsView.model.reset();
        self.$el.find('.filterDelBtn ').trigger('click');
        self.$el.find('.selectCell input:checkbox').prop('checked', false);
        self.participantSearchView.model.filters = {};
        self.participantSearchView.model.participants.reset();
    },
*/

    initializeParticipantSearch: function(participantsArr) {
        /*
         * Add team members widget
         */

        'use strict';
        var self = this;

        // page level reference to participant search view
        this.participantSearchView = new ParticipantSearchView({
            el : this.$el.find('#participantSearchView')
           //participantCollectionView : this.participantsView
        });
        this.participantSearchView.on("rendered", function() {
            self.$el.find("#addTeamMembersWrap .showHideBtn").hide();
        });
        this.participantSearchView.on("rowSelected", function(e) {
            //get participantUrl from template and go there.
            window.location = $(e.target.parentElement).find('td.selectCell').data('participantUrl');
        });


    },

    usableArray: function(arr) {
        /*
         * Returns wether or not an array can be looped through
         */
        // return _.isArray(arr) && arr.length !== 0;
        return _.isArray(arr) && !_.isEmpty(arr);
    }
});
