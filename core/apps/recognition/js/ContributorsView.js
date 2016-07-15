/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
WizardTabsView,
ParticipantCollectionView,
ParticipantSearchView,
ContributorsView:true
*/

/** CONTRIBUTORS VIEW - for adding/modifying contributors for PURL **/
ContributorsView = Backbone.View.extend({
    initialize:function(opts){
        var that = this;

        this.tplName = opts.tplName||'contributorsView';
        this.tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'recognition/tpl/';

        // for creation of PURL, no invitations are ever sent already, so this column should be hidden
        this.showInvitedColumn = typeof opts.showInvitedColumn !== 'undefined' ? opts.showInvitedColumn : true;

        this.contribFormNamePrefix = opts.contribFormNamePrefix||false;
        this.presetSearchFilters = opts.contributorTeamsSearchFilters||null;
		//If Server does not send filters, do not render the Team tab.
        if (this.presetSearchFilters && this.presetSearchFilters.filters.length === 0) {
            this.presetSearchFilters = null;
        }

        this.parentView = opts.parentView;

        this.parentView.on('promoNodeChange',function(p,n){this.handlePromoNodeChange(p,n);},this);
        this.parentView.on('purlRecipientSet',function(r,nId){
            this.handleRecipientChange(r,nId);
        },this);
        this.parentView.on('recipientNodeIdChange',function(r,nId){
            this.handleRecipientChange(r,nId);
        },this);

        //inherit events from the superclass
        this.events = _.extend({},this.constructor.__super__.events,this.events);

        //this is how we call the super-class, this will render
        this.constructor.__super__.initialize.apply(this, arguments);

        this.render();
    },

    events: {
        "click .stepContentControls .backBtn":"goBackAStep",
        "click .stepContentControls .nextBtn":"goToNextStep",
        "click .addEmailsBtn":"doAddEmails"
    },
    goToNextStep: function(e) {
        var fromTab = this.wizTabs.getActiveTab(),
            toTab = this.wizTabs.getNextTab();

        e?e.preventDefault():false;
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'));
    },
    goBackAStep: function(e) {
        var fromTab = this.wizTabs.getActiveTab(),
            toTab = this.wizTabs.getPrevTab();

        e?e.preventDefault():false;
        this.goFromStepToStep(fromTab.get('name'), toTab.get('name'));
    },
    // WizardTabsView tab click
    handleTabClick: function(e,originTab,destTab,wtv) {
        e?e.preventDefault():false;
        if(destTab.get('state')!=='locked'){
           this.goFromStepToStep(originTab.get('name'), destTab.get('name'));
        }
    },
    // generic from step to step
    goFromStepToStep: function(fromName, toName) {
        var that = this;
        this.wizTabs.setTabState(fromName, 'complete'); // complete
        this.wizTabs.setTabState(toName, 'unlocked'); // unlock
        this.wizTabs.activateTab(toName); // go to tab
        this.trigger('stepChanged');

        // business wants us to scrollTo the top of the tabs when they change (especially from next/back buttons)
        $.scrollTo(this.$el.find('.wizardTabsView'), G5.props.ANIMATION_DURATION, {axis : 'y', offset:{top:-24,left:0}} );

        // if the tab we've moved to is the stepOthers tab
        if(toName=='stepOthers') {
            this.$el.find('.contribEmailsInput').focus();
        }
    },
    doAddEmails: function(e) {
        var $ems = this.$el.find('.contribEmailsInput'),
            $msg = this.$el.find('.contribEmailsFeedback'),
            txt = $ems.val(),
            parsed = G5.util.parseEmails(txt),
            that = this;

        e?e.preventDefault():false; // prev def

        // resets
        $msg.find('.msg').hide();
        $msg.find('.errorEmailsList').empty();

        if(parsed.errorCode) {
            $msg.show();
            $msg.find('.'+parsed.errorCode).show();
            if(parsed.errorEmails.length) {
                _.each(parsed.errorEmails,function(em,i){
                    $msg.find('.errorEmailsList').append(em.email+ (i < parsed.errorEmails.length-1 ? '<br>' : '') );
                });
            }
        }
        // success
        else {
            $msg.show().find('.emailsFound').show().find('.count').text(parsed.emails.length);
            _.each(parsed.emails, function(emObj){
                emObj.id = emObj.email; // this is the id, we don't need duplicate emails showing up
                emObj.contribType = "other";
                that.contributorsView.model.add(emObj);
            });
            $ems.val('');
        }

    },


    render: function(){
        var that = this,
            preselLocked = this.parentView.getFormSettings().preselectedLocked=='true';

        TemplateManager.get(this.tplName, function(tpl){

            that.$el.append(tpl);
            that.initPaxCollViews();
            // init WizardTabsView
            that.wizTabs = new WizardTabsView({
                el: that.$el.find('.wizardTabsView'),
                onTabClick: function(e,originTab,destTab,wtv){
                    // our handleTabClick function replaces the standard function in WTV
                    that.handleTabClick(e,originTab,destTab,wtv);
                },
                scrollOnTabActivate: true
            });

            that.trigger('stepChanged');

            that.updatePaxCollectionView();

            that.trigger('rendered');

            that.wizTabs.on('afterTabActivate', function(t){
                that.updatePaxCollectionView();
            }, that);

        }, this.tplUrl);

        return this;
    },

    initPaxCollViews: function(){
        var $presel = this.$el.find('#preselectedContributorsView'),
            $addtl = this.$el.find('#additionalContributorsView'),
            $others = this.$el.find('#otherContributorsView'),
            $all = this.$el.find('#allContributorsView'),
            $search = this.$el.find('#contributorSearchView'),
            contribs = this.parentView.getFormSettings().contributors,
            presel = _.filter(contribs,function(c){return c.contribType == "preselected";}),
            preselLocked = this.parentView.getFormSettings().preselectedLocked,
            addtl = _.filter(contribs,function(c){return c.contribType == "additional";}),
            others = _.filter(contribs,function(c){return c.contribType == "other";}),
            that = this;

        // get this flag
        preselLocked = preselLocked&&preselLocked==='true';

        if(preselLocked) {
            _.each(presel, function(c){
                c._noRemove = true;
            });
        }

        // convert strings to booleans for invitationsSent
        // _.each(contribs, function(c){
        //     c.invitationSent = c.invitationSent&&(c.invitationSent.toLowerCase()==='true');
        // });
        // NOTE: these aint booleans, they's strings (dates, raisins and prunes)

        // store the preselected
        this.preselectedContributors = presel;

        // all the contributors
        this.contributorsView = new ParticipantCollectionView({
            el: $all,
            tplName: 'contributorViewItem',
            tplUrl: this.tplUrl,
            model: new Backbone.Collection(contribs),
            feedToTpl:{ _paxName: this.contribFormNamePrefix, _showInvitedColumn: this.showInvitedColumn }
        });

        // we hide the invitation sent TH in certain cases
        this.contributorsView.$wrapper.find('th.invitationSent')[this.showInvitedColumn?'show':'hide']();


        // set the count param name
        this.contributorsView.$wrapper.find('.participantCount').attr('name',
            this.contribFormNamePrefix+'Count');


        // pax search
        this.contribSearchView = new ParticipantSearchView({
            el : $search,
            participantCollectionView : this.contributorsView,
            extraParams: {
                promotionId: this.parentView.getPromoSetup().id
            },
            allowSelectAll: true, // turn on select all control
            presetFilters: this.presetSearchFilters,
            // this uses backbone defaults to drill into the model for each pax returned to the search
            // and makes sure if the server doesn't return a 'contribType', that we set it to 'additional'
            // which is what we want for all searched for contributors (team or regular search)
            participantsCollection: new (Backbone.Collection.extend({
                model: Backbone.Model.extend({
                    defaults: {
                        contribType: 'additional'
                    }
                })
            }))()
        });

    },

    updatePaxCollectionView: function() {
        var activeTab = this.wizTabs.getActiveTab(),
            $paxColWrap = this.$el.find('.participantCollectionViewWrapper');

        // set a special class on the pax collection corresponding to the active step
        if(activeTab) {
            // reset classes
            $paxColWrap[0].className = $paxColWrap[0].className.replace(/\bstepClass_.*?\b/g,'');
            // add special class for current step
            $paxColWrap.addClass('stepClass_'+activeTab.get('name'));

            $paxColWrap[( activeTab.get('name') == 'stepPreview' )?'removeClass':'addClass']('container-splitter');

            if( activeTab.get('name') == 'stepPreview' ) {
                // if there are no selected contributors who have not yet been invited...
                if( this.contributorsView.model.filter(function(pax) { return !pax.get('invitationSentDate'); }).length <= 0 ) {
                    // create and show an error message instead of the pax search results
                    this.contributorsView.$wrapper.append('<div class="alert allInvitedMessage">' + this.contributorsView.$el.data('msgAllInvited') + '</div>');
                    this.contributorsView.$el.parents('table, .rT-wrapper').hide();
                    this.parentView.$el.find('#recognitionButtonSend').addClass('disabled').attr('disabled','disabled');
                }
            }
            // if we're not on the preview step, we need to undo the special display stuff we did in the nested if() above, even if we don't match that condition
            else {
                this.contributorsView.$el.parents('table, .rT-wrapper').show();
                this.contributorsView.$wrapper.find('.allInvitedMessage').remove();
                this.parentView.$el.find('#recognitionButtonSend').removeClass('disabled').removeAttr('disabled');
            }
        }
    },
    // promo(setup) and node(setup) come from the parent view
    handlePromoNodeChange: function(){
        this.updateContribSearchViewParams();
    },
    updateContribSearchViewParams: function() {
        var promo = this.parentView.getPromoSetup(),
            recipView = this.parentView.getRecipientView(),
            recipId = recipView&&recipView.model.length?recipView.model.at(0).get('id'):false,
            searchParam = this.contribSearchView?this.contribSearchView.model.ajaxParam():{};

        // clear these if necessary
        delete searchParam.promotionId;
        delete searchParam.recipientId;
        delete searchParam.contributorId;

        // sometimes contribSearchView is not yet defined here
        if(this.contribSearchView) {
            // set the promotionId for the contrib pax search
            this.contribSearchView.model.ajaxParam('promotionId',promo.id);
            if(recipId) {
                this.contribSearchView.model.ajaxParam('recipientId',recipId);
            }
            this.contribSearchView.model.ajaxParam('contributorId', _.pluck(this.preselectedContributors, 'id') );
        }

    },
    resetStepsAndData: function(){
        // steps
        this.wizTabs.setTabState('stepCoworkers', 'unlocked');
        this.wizTabs.setTabState('stepOthers', 'locked');
        this.wizTabs.setTabState('stepPreview', 'locked');
        this.wizTabs.activateTab('stepCoworkers');

        // data
        this.contributorsView.model.reset();
    },


    // when a recipient changes, we need to query the server as to what the preselected
    // contributors should be
    handleRecipientChange: function(recip,nodeId) {
        var that = this;


        // this happens only on recipient change (select) from search AND recip nodeId change, so it should
        // blow away existing preselected, from struts or whatever
        if(this.contributorsView /* &&this.contribsPreselected.model.length===0*/ ) {

            // spinner?

            $.ajax({
                dataType:'g5json',//must set this so SeverResponse can parse
                url: G5.props.URL_JSON_SEND_RECOGNITION_PRESELECTED_CONTRIBUTORS,
                data: {recipientId:recip.get('id'), nodeId:nodeId},
                type: "POST",
                success:function(serverResp){
                    var err = serverResp.getFirstError(),
                        newList;

                    if(!err){
                        //If Server does not send filters, do not render the Team tab.
                        // preset "teams" may change from this ajax JSON
                        if (serverResp.data.presetSearchFilters && serverResp.data.presetSearchFilters.length === 0 || serverResp.data.presetSearchFilters.filters.length == 0) {
                         serverResp.data.presetSearchFilters = null;
                        };
                        // preset "teams" may change from this ajax JSON
                        that.contribSearchView.model.setFilterPresets(serverResp.data.presetSearchFilters);
                        // remove current 'preselected' contribTypes
                        newList = _.reject(that.contributorsView.model.toJSON(), function(c){
                            return c.contribType==='preselected' || c.contribType==='additional';
                        });

                        // merge old list with new list of 'preselected' contribTypes
                        newList = _.union(serverResp.data.preselectedContributors,newList);

                        that.contributorsView.model.reset(newList);
                        that.updateContribSearchViewParams();
                    } else {
                        // do nothing for now, or maybe
                        console.error('[ERROR] ContributorsView - error getting preselected'
                            +' contributors for recipientId='+recip.get('id'));
                    }

                    // kill spinner?

                }
            });
        }
    },

    getWizardTabs: function() { return this.wizTabs; }

});
