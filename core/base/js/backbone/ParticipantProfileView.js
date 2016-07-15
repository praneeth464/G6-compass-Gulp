/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
Modernizr,
$,
_,
G5,
TemplateManager,
Backbone,
ParticipantProfileSearchView,
ParticipantProfileView:true
*/

// Participant profile view
// - goes in the header of most pages
ParticipantProfileView = Backbone.View.extend({

    tag:'div',
    id:'participantProfileView',
    className:'profile',

    //init function
    initialize:function(opts){
        var that = this;

        console.log('[INFO] ParticipantProfileView:', this, opts);

        // contain the model in the view if it stays simple
        this.model = new Backbone.Model();

        // object that will hold the global participant search view
        this.gpsView = {};

        //listen for global data updates intended for parti. profile - and update data
        G5.ServerResponse.on('dataUpdate_participantProfile',function(data){
            this.model.set(data);
        },this);

        // listen for full data load (id change) and render
        this.model.on('change:id', this.render, this);

        // listen for data change and update
        this.model.on('change', this.updateView, this);

        // listen for alert change and update
        this.model.on('change:alert', this.alertBox, this);

        // listen for this render, then call updates to points and alerts
        this.on('rendered', this.loadPoints, this);
        this.on('rendered', this.loadAlerts, this);
        this.on('rendered', this.addGlobalParticipantSearch, this);

    },

    events : {
        "click #participantProfileViewAlert .close" : "alertBoxDismiss",
        "click #participantProfileMobileToggle" : "toggleProfileForMobile",
        "click .profile-act-as-delegate" : "showDelegators",
        "click .profile-gps-trigger" : "showGlobalParticipantSearch"
    },

    //render thyself!
    render:function(){
        var that = this;

        // if no data, trigger data load
        // (which will trigger model:id change, then render again)
        if(!this.model.get('id')) {
            this.loadProfile();
            return;
        }

        console.log('[INFO] ParticipantProfileView: render thyself!', this);

        TemplateManager.get('participantProfileView',function(tpl,vars,subTpls){
            var json = that.model.toJSON(), x;

            that.tpl = tpl; // cache tpl
            that.alertTpl = subTpls.alertTpl; // cache alert tpl
            that.gpSearchTpl = subTpls.gpSearchTpl; // cache global participant search tpl
            that.gpsResultsListTpl = subTpls.gpsResultsListTpl; // cash participant search tpl, to pass to search view.
            that.$el.empty();

            // cook up a boolean to show the points section
            json.showPoints = json.points != -1 && !json.isDelegate;

            // mark the delegator this user is acting as
            if(json.delegators){
                x = _.where(json.delegators,{id:json.id});
                x&&x.length ? x[0].active = true : false;
            }


            //make sure we have model data
            if(json.id){
                that.$el.append(tpl(json));
                that.trigger('rendered');
            }
        }, G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/');

        return this;
    },

    //update view with latest model data
    updateView:function(){
        var data = this.model.toJSON(),
            $pts = this.$el.find('.profile-points'),
            $numMsg = this.$el.find('.profile-num-messages');

        // POINTS UPDATE
        // check to see if the automatic data update comes back with a N/A bank account
        // changed check by vdudam to -1 for maintaining both conditions with same datatype
        if(data.points == -1) {
            $pts.hide();
            $pts.nextAll('.profile-points-label').hide();
        }
        // otherwise, assume it's a number of points coming back
        else if(typeof data.points === 'number' && data.points > 0){
            //animate the points as they change
            $pts.addClass('changing').animateNumber(data.points,1500,{
                addCommas:true
            },function(){$pts.removeClass('changing');});
        }
        else if(typeof data.points === 'number'){
            $pts.text(data.points);
        }

        // NUM MESSAGES/ALERTS UPDATE
        if(data.numMessages > 0){
            $numMsg.text(data.numMessages).show();
        }
    },

    // move this out into its own Model if things get complicated at all
    loadProfile:function(props){
        var that = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PARTICIPANT_PROFILE,
            success: function(servResp){
                that.model.set(servResp.data.participant);
            }
        });
    },

    // this URL resp. should trigger G5.ServerResponse event: dataUpdate_participantProfile
    // which we listen to ( see this.initialize() )
    loadAlerts:function(props){
        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PARTICIPANT_PROFILE_ALERTS
        });
    },

    // this URL resp. should trigger G5.ServerResponse event: dataUpdate_participantProfile
    // which we listen to ( see this.initialize() )
    loadPoints:function(props){
        var that = this;
        this.$el.find('.profile-points').spin({color:'#999'});
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PARTICIPANT_PROFILE_POINTS
        });
    },

    alertBox: function(){
        var self=this,
            data = self.model.get('alert');

        if(!(data&&data.displayAlert)) return; // only show if there is data and displayAlert

        this.$el.find('#participantProfileViewAlert').remove();
        this.$el.append(this.alertTpl(data));

        setTimeout( function() {
            self.alertBoxDismiss();
        }, 7000 );
    },

    alertBoxDismiss: function(e) {
        var self=this,
            $alert = this.$el.find('#participantProfileViewAlert'),
            animProps = this.$el.find('#participantProfileMobileToggle:visible').length ? { height : 0 } : { width : 0 };

        if(e) { e.preventDefault(); }

        $alert.animate(animProps, G5.props.ANIMATION_DURATION, function(){
            $alert.hide();
        });
    },

    toggleProfileForMobile : function(e) {
        var $meta = this.$el.find('.profile-meta'),
            $bodyfoot = $meta.find('.profile-body, .profile-foot'),
            state = $meta.data('state') ? $meta.data('state') : 'closed',
            shortHeight = $meta.data('shortHeight') ? $meta.data('shortHeight') : $meta.height(),
            tallHeight = $meta.data('tallHeight') ? $meta.data('tallHeight') : null;

        if( !tallHeight ) {
            $bodyfoot.show();
            tallHeight = $meta.height();
            $meta.css('height', shortHeight);

            $meta.data('state', 'closed');
            $meta.data('shortHeight', shortHeight);
            $meta.data('tallHeight', tallHeight);
        }

        $meta.animate(
            {height : (state == 'closed') ? tallHeight : shortHeight},
            G5.props.ANIMATION_DURATION,
            function() {
                $meta.data('state', (state == 'closed') ? 'open' : 'closed');
            }
        );
    },

    showDelegators: function(e) {
        var $t = $(e.currentTarget),
            $delegators = this.$el.find('.profile-delegators');

        e.preventDefault();

        if(!$t.data('qtip')){
            $t.qtip({
                content: $delegators,
                position:{my:'top center',at:'bottom center',container: this.$el},
                show:{ready:false, event:'click', effect:false},
                hide:{event:'unfocus', effect:false},
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-light',
                    tip: {
                        width: 20,
                        height: 10
                    }
                },
                events:{/*show:onShow*/}
            });
            // IE8 - two lines below are for initial position bug in IE8
            $t.qtip('show');
            $t.qtip('reposition');
            // EOF IE8
        }
    },

    showGlobalParticipantSearch: function(e) {
        var thisView = this,
            $t = $(e.currentTarget),
            $gpsSearch = this.$el.find('.profile-global-participant-search');

        if (!this.model.get('largeAudience')) {
            e.preventDefault();

            if(!$t.data('qtip')){
                $t.qtip({
                    content: $gpsSearch,
                    position:{
                        my:'top center',
                        at:'bottom center',
                        container: this.$el,
                        viewport: $('body'),
                        adjust: {method:'shift none'}
                    },
                    show:{ready:false, event:'click', effect:false},
                    hide:{
                        target: $('#gps-close'),
                        event:'unfocus click',
                        effect:false
                    },
                    style:{
                        classes:'ui-tooltip-shadow ui-tooltip-light',
                        tip: {
                            width: 20,
                            height: 10
                        }
                    },
                    events:{
                        visible: function(event, api) {
                            // if the browser supports the HTML5 placeholder input attribute
                            // autofocus the input when search is opened
                            if( Modernizr.input.placeholder ) {
                                api.elements.content.find('input').focus();
                            }
                        },
                        hide: function() {
                            // clear out the search results when qtip is closed
                            thisView.$el.find('.searchList').empty();
                            thisView.$el.find('.gps-name-input').val('');
                        }
                    }
                });
                // IE8 - two lines below are for initial position bug in IE8
                $t.qtip('show');
                $t.qtip('reposition');
                // EOF IE8

            }
        }
    },

    addGlobalParticipantSearch: function(){
        // create the GlobalParticipantSearch view
        if (!this.model.get('largeAudience')) {
            var opts = [];
            opts.advancedUrl = G5.props.URL_JSON_PARTICIPANT_ADVANCED_SEARCH;
            this.$el.find('.profile-gps-trigger').after( this.gpSearchTpl(opts) );
            this.gpsView = new ParticipantProfileSearchView({
                'searchResultsViewTpl' : this.gpsResultsListTpl
            });
        }
    }

});