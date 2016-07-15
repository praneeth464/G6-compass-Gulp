/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
ParticipantCollectionView,
ParticipantSearchView,
QuizEditTabIntroView:true
*/
QuizEditTabIntroView = Backbone.View.extend({

    initialize: function(opts) {
        var that = this;

        // QuizPageEditView parent container for this tab
        this.containerView = opts.containerView;

        // participant collection
        this.paxCollection = this.containerView.quizModel.participants;

        this.initPaxSearch();
        this.updateCreateAsPaxSearch();
        this.updateTeamMembersSection();
        this.initInputs();

        this.containerView.quizModel.on('change:id',this.handleQuizModelIdChange,this);

        // team member load events
        this.containerView.quizModel.on('start:loadTeamMembers',this.handleLoadTeamMembersStart,this);
        this.containerView.quizModel.on('end:loadTeamMembers',this.handleLoadTeamMembersEnd,this);
        this.containerView.quizModel.on('success:loadTeamMembers',this.handleLoadTeamMembersSuccess,this);

        // check quiz name events
        this.containerView.quizModel.on('start:checkName',this.handleCheckNameStart,this);
        this.containerView.quizModel.on('end:checkName',this.handleCheckNameEnd,this);
        this.containerView.quizModel.on('success:checkName',this.handleCheckNameSuccess,this);
        this.containerView.quizModel.on('error:checkName',this.handleCheckNameError,this);

    },

    events: {
        // hide any error qtips that may have opened on validateme check
        "focus .quizNameInput":function(e){
            var $t = $(e.currentTarget); 
            $t.data('qtip')&&$t.qtip('hide');
        },
        "blur .quizNameInput":"doQuizNameCheck",
        "change .date":"validateDateSelected"
    },


    doQuizNameCheck: function() {
        var $qni = this.$el.find('.quizNameInput');
        if($qni.val().length) {
            this.containerView.quizModel.checkQuizName($qni.val());
        }
    },

    // init form elements
    initInputs: function() {
        var that = this,
            qm = this.containerView.quizModel,
            $start = this.$el.find('.startDateInput');

        this.$el.find('.datepickerTrigger').datepicker();
        this.$el.find('.richtext').htmlarea( G5.props.richTextEditor );

        // if quiz is active
        if(qm.get('quizStatus')==='active') {
            // disable name, Use Case Change, uncomment if name becomes read only again.
            //this.$el.find('.quizNameInput').attr('readonly','readonly');
            this.$el.find('.remParticipantControl').hide();
            
            // disable start date edit
            $start.next('.btn').attr('disabled','disabled');

            // remove the generic validation class
            $start.closest('.validateme').removeClass('validateme');
        }
    },

    // init pax search stuff
    initPaxSearch: function() {
        var that = this;

        // for "active" state quizzes, the paxes in the collection cannot be removed
        if( this.containerView.quizModel.get('quizStatus') === 'active' ) {
            this.paxCollection.each(function(pax) {
                pax.set('locked', true);
            });
        }

        // initial state
        this.paxView = new ParticipantCollectionView({
            el : this.$el.find('.paxView'),
            tplName :'paxRow', //override the default template with this inline tpl
            model : this.paxCollection
        });

        // page level reference to participant search view
        this.paxSearchView = new ParticipantSearchView({
            el: this.$el.find('.paxSearchView'),
            participantCollectionView: this.paxView, // sync it
            selectMode: 'multiple'
        });

        // lock selected participants when the state is "active"
        this.paxSearchView.model.on('participantsChanged',function() {
            that.paxSearchView.model.participants.each(function(p) {
                var paxInCollection = that.paxCollection.get(p.get('id')),
                    paxInCollectionQuizPaxId = paxInCollection ? paxInCollection.get('quizParticipantId') : false;

                // check to see if the pax from the search results is in the view.paxCollection and that it has a quizParticipantId set by the server AND that it is selected in the search results AND that the quizStatus is active
                // if all these pass, the pax should be locked
                if( paxInCollectionQuizPaxId && p.get('isSelected') && that.containerView.quizModel.get('quizStatus') === 'active' ) {
                    p.set('isLocked', true);
                }
            });
        },this);
    },

    // init "create as" search/select
    updateCreateAsPaxSearch: function() {
        var that = this,
            qm = this.containerView.quizModel,
            pax = null,
            allowed = qm.get('createAsAllowed'),
            $wrapEl = this.$el.find('.createAsWrapper'),
            $dispOnlyEl = this.$el.find('.createAsDisplayOnly'),
            $searchWrapEl = this.$el.find('.createAsSearchWrapper'),
            $paxInfo = this.$el.find('.createAsSearchWrapper .createAsParticipant'),
            $searchEl = this.$el.find('.paxCreateAsView');

        // set this after we possibly remove the selected pax
        pax = qm.get('createAsParticipant');

        // SEARCH VIEW - init search view if needed
        if(allowed&&!qm.get('id')&&!this.paxCreateAsView) {
            this.paxCreateAsView = new ParticipantSearchView({
                el: $searchEl,
                selectMode: 'single'
            });
            this.paxCreateAsView.model.on('participantSelected', function(pax){
                qm.set('createAsParticipant',pax);
                qm.loadTeamMembersForOwner();
                that.updateCreateAsPaxSearch();
            });
        }

        // OVERALL SEARCH ELEMENT - show/hide overall control
        if(allowed&&!qm.get('id')) { // show it?
            $wrapEl.show();
        } else {
            $wrapEl.slideUp(G5.props.ANIMATION_DURATION);
        }


        // POPULATE ALL PAX INFO (display only + inside search)
        if(pax) {
            _.each(pax, function(v,k){
                that.$el.find('._pax._'+k).text(v);
            });
        } else {
            that.$el.find('._pax').text('');// clear
        }

        // PAX INFO (in search element) - update selected participant display
        if(allowed&&!qm.get('id')) {
            $paxInfo.find('._paxShow')[pax?'show':'hide']();
        }

        // PAX INFO (outside of search element) - for after created (has id)
        if(qm.get('id')&&pax) {
            $dispOnlyEl.show();
        } else {
            $dispOnlyEl.hide();
        }

    },

    updateTeamMembersSection: function() {
        var $tmWrap = this.$el.find('.teamMembersWrapper'),
            $tmTxt = this.$el.find('.teamMembersText'),
            qm = this.containerView.quizModel,
            pax = qm.get('createAsParticipant');

        // TEAM MEMBERS EXIST
        if(qm.participants&&qm.participants.length) {
            $tmWrap.show();
        } else {
            $tmWrap.hide();
        }

        // OWNER PAX
        if(pax) {
            _.each(pax, function(v,k){
                $tmTxt.find('._'+k).text(v);
            });
            $tmTxt.show();
        } else {
            $tmTxt.hide();
        }
    },

    handleQuizModelIdChange: function() {
        this.updateCreateAsPaxSearch();
    },

    handleLoadTeamMembersStart: function() {
        var $tmWrap = this.$el.find('.teamMembersWrapper'),
            $tml = this.$el.find('.teamMembersLoadingWrapper'),
            $spin = $tml.find('.tmlSpin'),
            qm = this.containerView.quizModel;
        $tmWrap.hide();
        $tml.show();
        $spin.spin();
    },
    handleLoadTeamMembersEnd: function() {
        var $tmWrap = this.$el.find('.teamMembersWrapper'),
            $tml = this.$el.find('.teamMembersLoadingWrapper'),
            $spin = $tml.find('.tmlSpin');
        $tmWrap.show();
        $spin.spin(false);
        $tml.hide();
    },
    handleLoadTeamMembersSuccess: function() {
        this.updateTeamMembersSection();
    },

    handleCheckNameStart: function() {
        var $spin = this.$el.find('.quizNameCheckingSpinnner'),
            $btns = this.$el.find('.stepContentControls .btn');
        $btns.attr('disabled','disabled');
        $spin.show().spin(true);
    },
    handleCheckNameEnd: function() {
        var $spin = this.$el.find('.quizNameCheckingSpinnner'),
            $btns = this.$el.find('.stepContentControls .btn');
        $btns.removeAttr('disabled');
        $spin.spin(false).hide();
    },
    handleCheckNameSuccess: function() {
        this.updateQuizNameValidDisp(true);
    },
    handleCheckNameError: function(msg) {
        this.updateQuizNameValidDisp(false,msg);
    },
    updateQuizNameValidDisp: function(isValid, erMsg) {
        var $okIcon = this.$el.find('.quizNameValid'),
            $erIcon = this.$el.find('.quizNameInvalid'),
            $erMsg = this.$el.find('.quizNameInvalidMsg');

        $okIcon[isValid?'show':'hide']();
        $erIcon[isValid?'hide':'show']();
        $erMsg[isValid?'hide':'show']();
        erMsg ? $erMsg.text(erMsg) : $erMsg.text('');
    },



    /* **************************************************
        TAB FUNCTIONS - QuizEditTab*View interface
    ***************************************************** */
    // sync the visual elements with the model
    updateTab: function() {
        var qm = this.containerView.quizModel;
        
    },

    // validate the state of elements within this tab
    validate: function() {
        var $validate = this.$el.find('.validateme'),
            isValid = G5.util.formValidate($validate), // simple check uses global formValidate
            qm = this.containerView.quizModel,
            qStatus = qm.get('status'),
            checkStartDate = qStatus==='undrconstr',
            $startTrig = this.$el.find('.startDateTrigger'),
            $endTrig = this.$el.find('.endDateTrigger'),
            todayDate = $startTrig.data('datepicker').todayDate,
            startDate = $startTrig.data('datepicker').date,
            endDate = $endTrig.data('datepicker').date,
            createAs = qm.get('createAsAllowed'),
            ownerPax = qm.get('createAsParticipant');

        // failed generic validation tests (requireds mostly)
        if(!isValid) { 
            return { msgClass: 'msgGenericError', valid: false }; 
        }

        // if createAsAllowed, then a createAs/owner PAX is REQUIRED (this is an admin user-type)
        if(createAs&&!ownerPax) {
            return { msgClass: 'msgMustHaveOwnerPax', valid: false };
        }

        // did the quiz name check out with the server (is it unique)
        if(!qm.doesQuizNameCheckOut) {
            return { msgClass: 'msgQuizNameNotUnique', valid: false };
        }

        if(checkStartDate && startDate < todayDate) {
            return { msgClass: 'msgStartDateTooEarly', valid: false };
        }

        if(endDate < startDate) {
            return { msgClass: 'msgEndDateTooEarly', valid: false }; 
        }

        if(this.paxCollection.length===0) {
            return { msgClass: 'msgMustHavePax', valid: false }; 
        }

        return {valid:true};
    },

    // validate only a specific date field after changing
    validateDateSelected: function(e) {
        var $tar = $(e.target).closest('.validateme');
        G5.util.formValidate($tar);
    },


    // special validate function to check if its ok to 'save draft'
    validateDraft: function() {
        var qName = this.$el.find('.quizNameInput').val(),
            qm = this.containerView.quizModel,
            createAs = qm.get('createAsAllowed'),
            ownerPax = qm.get('createAsParticipant');


        // if createAsAllowed, then a createAs/owner PAX is REQUIRED (this is an admin user-type)
        if(createAs&&!ownerPax) {
            return { msgClass: 'msgMustHaveOwnerPax', valid: false };
        }

        // make sure the name is not empty (using generic form validation logic)
        if(!G5.util.formValidate(this.$el.find('.quizNameInput').closest('.validateme'))) {
            return { msgClass: 'msgGenericError', valid: false }; 
        }

        // did the quiz name check out with the server (is it unique)
        if(!qm.doesQuizNameCheckOut) {
            return { msgClass: 'msgQuizNameNotUnique', valid: false };
        }

        if(qName==="") {
            return { msgClass: 'msgSaveDraftNoName', valid: false }; 
        }

        return {valid:true};
    }


});