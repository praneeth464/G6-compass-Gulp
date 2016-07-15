/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
TemplateManager,
Backbone,
RecognitionEzView,
ParticipantPopoverView:true
*/

// Participant popover view
// - display a popover of a single or multiple participants
// - if single, then optionally display public information (based on supplied JSON)
// - includes plugin method for easy creation
ParticipantPopoverView = Backbone.View.extend({

    tagName:'div',
    className:'participantPopoverView',

    //init function
    initialize:function(opts){
        var that = this, extraClasses = '';

        this.LONG_LIST_LENGTH = 6;
        this.currentPageNum = 1; // for more button

        this.tplName = 'participantPopoverView';
        this.tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/';

        this.$trigger = $(opts.triggerEl);
        this.$container = opts.containerEl?$(opts.containerEl):false;

        // increase the z-index when we are popping over a sheet
        this.isElevate = opts.isSheet?true:false;

        //from the triggers 'data-participant-ids' attr, JQuery .data() method parses JSON
        this.participantIds = this.$trigger.data('participantIds');
        this.recognitionId = this.$trigger.data('recognitionId');
        this.participantInfoType = this.$trigger.data('participantInfoType');
        this.smackTalkId = this.$trigger.data('smackTalkId');

        //optional classes for qtip
        extraClasses += this.isElevate?' elevate':'';

        //setup the tooltip plugin
        this.$trigger.qtip({
            content:{text:'<div class="spinnerBox"></div>'},
            position:{
                my: 'left center',
                at: 'right center',
                container: this.$container||$('body'),
                effect: false,
                viewport: true,
                adjust: {
                    method: 'shift shift'
                }
            },
            show:{
                event:'click',
                ready:false
            },
            hide:{
                event:'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light participantPopoverQtip' + extraClasses,
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            events:{
                // show == before anim show done
                // visible == after anim show complete
                visible:function(event,api){that.doShown();}
            }
            //prevent default (for anchor tags)
        }).click(function(e){e.preventDefault();return false;});



    },

    // assure template is loaded and grab data from server
    render:function(isMore){
        var that = this,
            params = {};

        // if rendered and not requesting more (isMore), then leave it be
        if(this._isRendered && isMore !== true){ return this; }

        // params
        if(this.participantIds) params.participantIds = this.participantIds;
        if(this.recognitionId) params.recognitionId = this.recognitionId;
        if(this.participantInfoType) params.participantInfoType = this.participantInfoType;
        if(this.smackTalkId) params.smackTalkId = this.smackTalkId;
        if(isMore) params.pageNumber = this.currentPageNum; // use page num

        // increment page num
        this.currentPageNum++;

        // last first pax id
        this.firstParticipantId = false;

        // get tpl
        TemplateManager.get(this.tplName,function(tpl, vars, subTpls){
            that.tpl = tpl;
            that.listTpl = subTpls.paxList;
            $.ajax({
                dataType:'g5json',//must set this so SeverResponse can parse
                type: "POST",
                url: G5.props.URL_JSON_PARTICIPANT_INFO,
                data:  params,
                success:function(serverResp){
                    var dat = serverResp.data,
                        curNumItems = that.$el.find('.multiProfile').length;

                    dat._isLongList = dat.totalCount && dat.totalCount > that.LONG_LIST_LENGTH;
                    dat._isShowMoreBtn = dat.totalCount && curNumItems < dat.totalCount;
                    dat._isShowRecognizeLink = params.recognitionId ? false : true;
                    dat._isShowFollowLink = params.recognitionId&&dat.allowPublicRecFollowList ? false : true;
                    dat._isShowBadge = dat.allowBadge ? true : false;

                    if(isMore) { // render more pax
                        that.moreRenderInner(dat);
                    } else { // initial render
                        that.firstParticipantId = dat.participants&&dat.participants.length?
                            dat.participants[0].id:false;
                        that.participantsRendered = dat.participants||false;
                        that.initialRenderInner(dat);
                    }

                }
            });
        },this.tplUrl);

        return this;
    },


    initialRenderInner: function(data) {
        this.$el.find('.spinnerBox').spin(false);

        //set the contents of qtip
        this.$trigger.qtip('option','content.text',this.tpl(data));
        this.moreRenderInner(data, true);

        //refresh position and dimensions for new content
        this.$trigger.qtip('reposition');

        this._isRendered = true;
    },
    moreRenderInner: function(data, noRepos) {
        var isShowMore;

        this.$el.find('.profileList').append(this.listTpl(data));

        isShowMore = data.totalCount && this.$el.find('.multiProfile').length < data.totalCount;

        // stop spin and show/hide more btn
        this.$el.find('.moreParticipantsBtn')
            .removeAttr('disabled')
            .spin(false)[isShowMore?'show':'hide']();

        if(!noRepos) {this.$trigger.qtip('reposition');}
    },


    doShown:function() {
        var that = this,
            params = {};
        //set our view element
        this.setElement(this.$trigger.data('qtip').elements.tooltip);
        this.$el.find('.spinnerBox').spin();
        this.render();
    },

    followParticipant: function(event) {
        var $target = $(event.target);

        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        var parameters = {
            isFollowed: $target.hasClass("unfollow"),
            participantIds: this.firstParticipantId
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

    events:{
        'click .closePopoverBtn':'hide',
        'click .regonizeFromPopover': 'doEzRecognize',
        'click .miniProfFollowLink': 'followParticipant',
        'click .moreParticipantsBtn': 'doMoreClick',
        'click .publicProfileLink' : 'openPublicProfile', // single profile link
        'click .naked-name-link' : 'openPublicProfile' // for long list links
    },

    hide:function(){
        this.$trigger.qtip('hide');
    },

    doEzRecognize: function(event) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;
        var that = this,
            paxID = this.firstParticipantId,
            $theModal = $("#ezRecognizeMiniProfileModal").clone().appendTo("body").addClass("ezModuleModalClone").on("hidden", function() {
                // scroll back to where we started when the modal was opened
                $.scrollTo($theModal.data('scrolledFrom'), G5.props.ANIMATION_DURATION, {axis : 'y'});
                $(this).remove();
            }),
            close = function () {
                $theModal.modal("hide");
            },
            init = function() {
                that.eZrecognizeView = new RecognitionEzView({
                    recipient : that.participantsRendered[0],
                    el        : $theModal,
                    close     : close
                });

                that.eZrecognizeView.on("templateReady", function(){
                    $theModal.addClass('grid-dimension-4x4'); // faking the big size. some styles will be overridden to fit in the modal properly
                    that.eZrecognizeView.$el.find(".ezRecLiner").show(); // the View hides itself. we need to reshow it
                    that.eZrecognizeView.$el.find("#ezRecModalCloseBtn").show();
                });
            };

        $(this.el).qtip("hide");

        // store the starting scroll position of the window
        $theModal.data('scrolledFrom', $(window).scrollTop());

        $theModal.on('shown', function() {
            // scroll to the top of the page so the modal is visible
            $.scrollTo($('body'), G5.props.ANIMATION_DURATION, {axis : 'y'});
        });

        if ($.support.transition) { // ie is slow
            $theModal.on('shown', function() {

                init();

            });

            $theModal.modal("show");
        } else {

            $theModal.modal("show");
            init();

            // model: new EZRecognitionModel(),
            /*
            $theModal.modal("show");
            this.eZrecognizeView = new EZRecognitionModuleView({
                el : $theModal,
                model: new EZRecognitionModel(),
                fromModule: true
            });

            // this.eZrecognizeView.dataModel.requestPromotionList(paxID, $theModal);
            this.eZrecognizeView.recipientListActive = { id : paxID, nodes : [ { id : undefined } ] };
            this.eZrecognizeView.submitRecipient();*/

            // this.eZrecognizeView.on("templateReady", function( tpl ){
            //  $theModal.append(tpl);
            // });

            // this.eZrecognizeView.dataModel.requestPromotionList(paxID, $theModal);
            // this.eZrecognizeView.recipientListActive =

            // make this happen when it's created?
            // this.eZrecognizeView.submitRecipient();

        }

    },

    doMoreClick: function(e) {
        $(e.target).attr('disabled','disabled').spin();
        this.render(true);
    },

    openPublicProfile: function(event) {
        //check to see if the link is being opened from a module or not. If not from a module, open as a modal.
        event.preventDefault ? event.preventDefault() : event.returnValue = false;
        var that = this,
            $target = $(event.currentTarget),
            targetUrl = $target.attr('href'),
            targetPageTitle = $target.data('titlePageView'),
            $tipTarget = $target.closest(".qtip").data('qtip').options.position.target,
            isModule = $tipTarget.closest(".module").length>0,
            isSheet = $tipTarget.closest("#sheetOverlayModal").length>0,
            isPubProf = $tipTarget.closest("#publicProfileWrapper").length>0,
            // open as a full page?
            isOpenFull = isModule || (isPubProf&&!isSheet);

            // TODO: delete? Extra conditions for isOpenFull -- not sure what they are supposed to accomplish -- commented for now
            // || $target.data('isself') || $target.hasClass('naked-name-link');


        if(isOpenFull) { // open as full page
            G5.util.doSheetOverlay(true, targetUrl, targetPageTitle);
        }
        else { // open as a sheet

            //TODO: delete? wait for JAVA error? not sure what this is supposed to do -- the doSheetOverlay + URL is supposed to accomplish this
            // this.publicProfilePageView = new PublicProfilePageView({
            //  el: $('#publicProfileWrapper'),
            //      pageNav : {},
            //      pageTitle : '',
            //      isSheet: true
            //  });

            $target.closest(".qtip").qtip("hide");

            G5.util.doSheetOverlay(false, targetUrl, targetPageTitle);
        }
    }

});


//plugin
!function ($) {

 /* PLUGIN DEFINITION */

  $.fn.participantPopover = function ( option ) {
    return this.each(function () {

        var $this = $(this),
            data = $this.data('participantPopover'),
            options = typeof option == 'object' && option,
            ppv;

        if (!data){
            ppv = new ParticipantPopoverView(_.extend(options||{},{triggerEl:this}));
            $this.data('participantPopover', (data = ppv));
        }

        if (typeof option == 'string') data[option]();
    });
  };

}(window.jQuery);