/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
$,
_,
G5,
_V_,
TemplateManager,
console,
PageView,
PurlModel,
PurlPageView:true
*/
PurlPageView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts){
        var that = this;

        //this is how we call the super-class initialize function (inherit its magic)
        this.constructor.__super__.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},this.constructor.__super__.events,this.events);

        //is the text being translated?
        this.translatedText = opts.translatedText || false;

        this.purlModel = new PurlModel(opts.json);
        this.setupEvents();

        this.initVideoJs();

        this.updateView();
        this.updateContribComment();

        this.renderSpellcheck();

        this.initCommentImageUploader();

        this.$el.find('[placeholder]').placeholder();

        this.showInitialModal();

        this.purlModel.fetchComments();
    },

    // wire ui events
    events:{
        // submit contributor information from initial modal (welcome modal)
        "click .submitContributorBtn": "doSubmitContributor",

        // invite contributors
        "click .inviteContributorsBtn": "doShowInviteTipBtnClick",
        "click .closeInviteContribsTip,.cancelInviteContribsBtn,.inviteeResultsCloseBtn": "doCancelInviteContribs",
        "click .addEmailsToInviteListBtn": "doAddEmailsToInviteList",
        "click .pendingContribItem .remBtn": "doRemoveEmailFromInviteList",
        "click .inviteContribsBtn": "doInviteContribs",

        // contribute comment section updates
        "keyup .contribCommentInp": "updateContribComment",
        "blur .contribCommentInp": "updateContribComment",
        "paste .contribCommentInp": "updateContribComment",

        // contribute comment spellcheck
        "click .contributeToPurlSection .dropdown-menu li a": "doContribCommentSpellCheck",
        "click .contribCommentBadWords .close": "doCloseContribCommentsBadWords",

        // attach video/image
        "click .attachPhotoBtn,.attachVideoBtn": "doAttachMode",
        "click .attachVideoUrlBtn": "doAttachVideoUrl",
        "click .closeAttModeBtn": "doCloseAttachMode",
        "click .attachedMediaDisplayWrapper .rmBtn": "doRemoveCommentMedia",

        // events in video url
        "keyup .attachVideoInput": "updateAttachMedia_video",
        "blur .attachVideoInput": "updateAttachMedia_video",
        "paste .attachVideoInput": "updateAttachMedia_video",

        //translate comment
        "click .translateTextBtn": "doTranslate",

        // submit comment
        "click .submitContribCommentBtn": "doSubmitContribComment",

        // thank everyone
        "click .thankEveryoneBtn": "doThankEveryone",
        "click .submitThankEveryoneBtn": "doSubmitThankEveryone",
        "hidden #purlThankEveryoneModal": "doThankEveryoneHidden"
    },
    // wire model events
    setupEvents: function(){
        // welcome modal - save contributor details
        this.purlModel.on('start:saveContributor', this.startSaveContributor, this);
        this.purlModel.on('end:saveContributor', this.endSaveContributor, this);
        this.purlModel.on('success:saveContributor', this.successSaveContributor, this);
        this.purlModel.on('success:saveContributor', this.updateView, this);

        // fetch comment list
        this.purlModel.on('start:fetchComments', this.startFetchComments, this);
        this.purlModel.on('end:fetchComments', this.endFetchComments, this);
        this.purlModel.on('success:fetchComments', this.successFetchComments, this);

        // invite tip
        this.purlModel.pendingInvitees.on('add', this.updateInviteTip, this);
        this.purlModel.pendingInvitees.on('remove', this.updateInviteTip, this);
        this.purlModel.pendingInvitees.on('reset', this.updateInviteTip, this);

        // sending invitees
        this.purlModel.on('start:sendInvitees', this.startSendInvitee, this);
        this.purlModel.on('end:sendInvitees', this.endSendInvitee, this);
        this.purlModel.on('end:sendInvitees', this.updateInviteTip, this);

        // attachments
        this.purlModel.on('change:attachMode', this.updateContribComment, this);
        this.purlModel.on('change:attachMode', this.updateAttachMedia, this);
        this.on('start:commentImageUpload', this.startCommmentImageUpload, this);
        this.on('end:commentImageUpload', this.endCommentImageUpload, this);

        // save comment
        this.purlModel.on('start:saveComment', this.startSaveComment, this);
        this.purlModel.on('end:saveComment', this.endSaveComment, this);
        this.purlModel.on('success:saveComment', this.successSaveComment, this);

        //translate text
        this.purlModel.on('translated', function(){this.updateTranslatedText();},this);

        // send thankyou
        this.purlModel.on('start:sendThankyou', this.startSendThankyou, this);
        this.purlModel.on('end:sendThankyou', this.endSendThankyou, this);
        this.purlModel.on('success:sendThankyou', this.successSendThankyou, this);

    },

    /* **************************************
        UI EVENTS
       ************************************** */
    // actions
    doSubmitContributor: function(e) {
        var $modal = this.$el.find('#purlInitialModal'),
            $inps = $modal.find('.contribInp'),
            $img = $modal.find('.imgWrap img'),
            contribToSave = {};

        // validate (use generic validator)
        if(!G5.util.formValidate($modal.find('.validateme'))){
            return;
        }

        // grab inputs
        $inps.each(function(){
            var $inp = $(this),
                v = parseInt($inp.val(),10) || $inp.val();
            contribToSave[$inp.data('key')] = v;
        });

        // grab avatar url
        contribToSave.avatarUrl = this.purlModel.cleanImgUrl( $img.attr('src') ); // $img src should always exist

        // NOTE: its not clear if we should set this to the provided contrib id as that
        //       as that may be assoc. with a diff. user if the original user has fwd.
        //       the email -- commented out for now
        // grab id (associated)
        // contribToSave.id = this.purlModel.get('contributor').id;

        this.purlModel.saveContributor(contribToSave);

    },
    doContribCommentSpellCheck: function(e) {
        var $tar = $(e.currentTarget),
            lang = $tar.attr('href'),
            localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ lang ]),
            $comment = this.$el.find('.contribCommentInp'),
            $badWordsWrap = this.$el.find('.contribCommentBadWords'),
            $badWords;

        e.preventDefault();

        if( $badWordsWrap.find('.badwordsContainer').length <= 0 ) {
            $badWordsWrap.append('<div class="badwordsContainer"><div class="badwordsWrapper"><div class="badwordsContent" /></div></div>');
        }
        $badWords = $badWordsWrap.find('.badwordsContainer');

        $comment.spellchecker({
            url: G5.props.spellcheckerUrl,
            lang: lang,
            localization : localization,
            engine: "jazzy",
            suggestBoxPosition: "above",
            innerDocument: false,
            wordlist: {
                action: "html",
                element: $badWords.find('.badwordsContent')
            }
        });

        $comment.spellchecker('check',{
            localization: lang,
            callback: function(result) {
                // console.log(lang, localization,result);
                if(result===true) {
                    $badWords.find('.spellcheck-badwords').remove();
                    alert(localization.noMisspellings);
                }
                else {
                    $badWords.find('.spellcheck-badwords')
                        .prepend('<strong>'+localization.menu+':</strong>')
                        .append('<a class="close"><i class="icon-remove" /></a>');
                }
            }
        });
    },
    doCloseContribCommentsBadWords: function(e) {
        e.preventDefault();
        this.$el.find('.spellcheck-badwords').remove();
    },
    doShowInviteTipBtnClick: function(e) {
        var that = this,
            $showInvBtn = this.$el.find('.inviteContributorsBtn'),
            $tipCont = this.$el.find('#inviteContribsTip'),
            $addedContribs = $tipCont.find('.addedContribs'),
            invitees = this.purlModel.get('invitees');
        e.preventDefault();

        if($showInvBtn.data('qtip')) { $showInvBtn.qtip('show'); return;}

        // else, let's create the qtip
        this.updateInviteTip();
        $addedContribs;
        $showInvBtn.qtip({
            content:{
                text: $tipCont
            },
            position:{
                my: 'top right',
                at: 'bottom center',
                adjust: {
                    x: 8,
                    method : 'shift none',
                    effect: false
                },
                // IMPORTANT -- this qtip needs to be in the view b/c that's where the events are
                //              being listened for
                container: that.$el,
                viewport: $(window)
            },
            show:{
                ready:true,
                event: false
            },
            hide:{
                event: false,//"unfocus",
                fixed:true,
                delay:200
            },
            style:{
                padding: 0,
                classes:'ui-tooltip-shadow ui-tooltip-light inviteContribsQTipOuter',
                tip: {
                    corner: true,
                    mimic: 'top center',
                    width: 20,
                    height: 10,
                    offset: 8
                }
            },
            events:{
                visible:function(event,api){
                    var $this = $(this);
                    // scroll the tooltip into place and focus on the textarea
                    if( $this.offset().top < $(window).scrollTop() ) {
                        $.scrollTo($this, {axis : 'y', offset: { top:-10 }, duration: G5.props.ANIMATION_DURATION*2 });
                    }
                    // Turning this off for now so IE users get a chance to read the placeholder text.
                    // As it is, the placeholder text disappears immediately upon this automatic .focus().
                    // See the discussion on bug #4731.
                    // Note to Joel (or other FE dev): editing the placeholder plugin to be smarter about when it disapparates the fake placeholder text would be a kickass solution.
                        // Idea how: on keyup, could check the value of the placeholder attribute against the value of the text input and if they don't match, shazam.
                    // $this.find('textarea').focus();
                }
            }
        });

    },
    doCancelInviteContribs: function(e) {
        e&&e.preventDefault();
        // clear out list to be added + textarea of emails
        this.$el.find('.inviteContribsEmailsInp').val('');
        this.purlModel.pendingInviteesErrorCode = null;
        this.purlModel.pendingInviteesErrorEmails = null;
        this.purlModel.pendingInvitees.reset([]);
        this.$el.find('.inviteContributorsBtn').qtip('hide');
    },
    doAddEmailsToInviteList: function(e) {
        var $emTxt = this.$el.find('.inviteContribsEmailsInp'),
            parsedEmails = G5.util.parseEmails($emTxt.val());
        e&&e.preventDefault();

        // update function will render these as apropo
        this.purlModel.pendingInviteesErrorCode = parsedEmails.errorCode||null;
        this.purlModel.pendingInviteesErrorEmails = parsedEmails.errorEmails||null;

        if(parsedEmails.emails&&parsedEmails.emails.length) {
            $emTxt.val('');
            // set ids to email
            _.each(parsedEmails.emails,function(pe){pe.id=pe.email;});
            // triggers invite qtip view update
            this.purlModel.pendingInvitees.add(parsedEmails.emails);
        } else {
            // manual update
            this.updateInviteTip();
        }
    },
    doRemoveEmailFromInviteList: function(e) {
        var email = $(e.currentTarget).data('email');
        e&&e.preventDefault();
        this.purlModel.removePendingInviteeByEmail(email);
    },
    doInviteContribs: function(e) {
        this.purlModel.sendInvitees();
    },
    doAttachMode: function(e) {
        var $tar = $(e.currentTarget),
            mode = $tar.data('attachMode');
        e.preventDefault();
        this.purlModel.set('attachMode',mode);
    },
    doCloseAttachMode: function(e) {
        var $videoInput = this.$el.find('.attachVideoInput');
        // clear this in case it has text
        $videoInput.val('');
        // triggers, and view listens
        this.purlModel.set('attachMode','select');
    },
    doRemoveCommentMedia: function(e) {
        var $cont = this.$el.find('.attachedMediaContent');
        // clear current elements in media content wrapping el
        $cont.empty();
        // clear any data assoc. with media
        this.purlModel.set('commentImage',null);
        this.purlModel.set('commentVideo',null);
        // set to select mode, view will listen for this and update
        this.purlModel.set('attachMode','select');
    },
    doAttachVideoUrl: function(e) {
        var $url = this.$el.find('.contributeToPurlSection .attachVideoInput');

        // set video in model
        this.purlModel.set('commentVideo',$url.val());

        // clear input
        $url.val('');

        // this will trigger, and the view will listen and update
        this.purlModel.set('attachMode','display');
    },
    doSubmitContribComment: function(e) {
        var cmt = this.$el.find(".contribCommentInp").val();
        this.purlModel.saveComment(cmt);
    },
    doThankEveryone: function(e) {
        e.preventDefault();
        // show modal
        this.$el.find('#purlThankEveryoneModal').modal();
    },
    doSubmitThankEveryone: function(e) {
        var $inp = this.$el.find('.thankyouTextInp');
        e.preventDefault();

        if($.trim($inp.val()).length) {
            // submit thankyou
            this.purlModel.sendThankyou($inp.val());
        }
    },
    doThankEveryoneHidden: function() {
        this.resetSendThankyouModal();
    },





    /* **************************************
        VIEW UI UPDATES
       ************************************** */
    // update page stuff
    updateView: function() {
        var that = this,
            m = this.purlModel;

        // show contrib section?
        if(m.get('allowContribution')) {
            this.$el.find('.contributeToPurlSection').show();
        }
        else {
            this.$el.find('.contributeToPurlSection').remove(); // remove contribute section
        }

        // show recipient section and controls?
        if(m.get('isRecipient') || m.get('awardProcessed')) {
            this.$el.find('.purlDetailsSection').show();

            if(m.get('isRecipient')){
                this.$el.find('.purlDetailsRecipientControls').show();
            }

            if(m.get('awardProcessed')){
                this.$el.find('.purlDetailsViewerControls').show();
            }
        }
        else {
            this.$el.find('.purlDetailsSection').hide(); // hide recipient section
            this.$el.find('.purlDetailsRecipientControls').hide();
            this.$el.find('.purlDetailsViewerControls').hide();
        }

        // update contrib values anywhere in page
        if(m.get('contributor')) {
            _.each(m.get('contributor'), function(v,k){
                var $e = that.$el.find('.contributor_'+k);

                if($e.length && $e[0].tagName.toLowerCase()==='img'){
                    $e.replaceWith($('<img src="'+v+'">').attr('class',$e.attr('class')));
                } else {
                    $e.text(v);
                }

            });
        }
    },
    // basically render comments
    updateContribCommentsList: function(isLatestOnly) {
        var that = this,
            $cont = this.$el.find('.commentsListWrapper'),
            comments = this.purlModel.get('comments'),
            toAddAt;

        // if(!comments || !comments.length) { return; } // need comments

        TemplateManager.get('commentItem', function(tpl) {
            var single;
            // no comments
            if(!comments || !comments.length) {
                single = {
                    _isEmpty : true
                };
                $cont.empty();
                $cont.append(tpl(single));
                return;
            }
            else {
                $cont.find('.isEmptyMessage').remove();
            }

            // single item
            if(isLatestOnly) {
                single = $.extend(true,{},comments[0]); // clone
                // get embed HTML
                if(single.videoWebLink) {single.videoHtml =  G5.util.oEmbed(single.videoWebLink);}
                $cont.prepend(tpl(single));
            }
            // full list
            else {
                // clear out containing element
                $cont.empty();
                _.each(comments, function(c) {
                    c = $.extend(true,{},c); // clone
                    // get embed HTML - will return null if no support for link
                    // template will output just the link if no html
                    if(c.videoWebLink) { c.videoHtml =  G5.util.oEmbed(c.videoWebLink);}
                    // append the template
                    $cont.append(tpl(c));
                    // if there is HTML5 video, init VideoJS
                    if($cont.find('#purlContribVideo'+c.activityId)) { that.initVideoJs('purlContribVideo'+c.activityId); }
                });
            }

            // embed videos -- this *could* be slow
            $cont.find('.videoLink').each(function(){
                var $vl = $(this),
                    vUrl = $vl.attr('href'),
                    vHtml = G5.util.oEmbed(vUrl);
                $vl.replaceWith(vHtml);
            });
        });
    },
    updateContribComment: function() {
        // if contribution is turned off, kick out of this method
        if( !this.purlModel.get('allowContribution') ) {
            return;
        }
        var $inp = this.$el.find('.contribCommentInp'),
            maxChars = parseInt($inp.attr('maxlength'),10),
            $remChars = this.$el.find('.commentTools .remChars'),
            $submit = this.$el.find('.submitContribCommentBtn'),
            hasInput = $.trim($inp.val()).length?true:false,
            hasMedia = this.purlModel.get('commentImage')||this.purlModel.get('commentVideo'),
            allowSubmit = hasInput;

        // enforce maxlength (ie only)
        if($.browser.msie && $inp.val().length > maxChars) {
            $inp.val( $inp.val().slice(0,maxChars));
        }

        // remaining chars
        $remChars.text($.format.number(maxChars-$inp.val().length));

        // enable/disable submit button
        $submit[allowSubmit?'removeAttr':'attr']('disabled','disabled');

    },
    // update the attach photo, video view
    updateAttachMedia: function() {
        var mode = this.purlModel.get('attachMode'),
            $attSec = this.$el.find('.attachmentSection'),
            $tools = $attSec.find('.attachTools'),
            $photo = $attSec.find('.attachPhotoWrapper'),
            $video = $attSec.find('.attachVideoWrapper'),
            $disp = $attSec.find('.attachedMediaDisplayWrapper');



        // show/hide states
        $tools[mode==='display'?'hide':'show'](); // show tools on all but display mode
        $photo[mode==='photo'?'slideDown':'slideUp'](G5.props.ANIMATION_DURATION); // attach photo mode
        $video[mode==='video'?'slideDown':'slideUp'](G5.props.ANIMATION_DURATION); // attach video mode
        $disp[mode==='display'?'slideDown':'slideUp'](G5.props.ANIMATION_DURATION); // display attachment mode

        // set tools state class for css styling
        $tools.removeClass(function(i,c) {
            c = c.match(/[a-z]+Mode/i);
            return c && c.length?c[0]:false;
        }).addClass(mode+'Mode');

        if(mode==='video'){ this.updateAttachMedia_video(); }
        if(mode==='display'){ this.updateAttachMedia_display(); }
    },
    updateAttachMedia_video: function() {
        var $inp = this.$el.find('.attachVideoInput'),
            $attBtn = this.$el.find('.attachVideoUrlBtn'),
            urlRe = /^(https?:\/\/)?[\da-z\.-]+\.[a-z\.]{2,6}.*$/;

        $attBtn[urlRe.test($inp.val())?'removeAttr':'attr']('disabled','disabled');
    },
    updateAttachMedia_display: function() {
        var $attSec = this.$el.find('.attachmentSection'),
            $disp = $attSec.find('.attachedMediaDisplayWrapper'),
            $cont = $disp.find('.attachedMediaContent'),
            imgObj = this.purlModel.get('commentImage'),
            videoUrl = this.purlModel.get('commentVideo'),
            videoHtml;

        $cont.empty();
        if(imgObj) {
            $cont.append('<div class="cmtImgWrap"><i class="icon-remove rmBtn"></i>'+
                '<img src="'+imgObj.thumbUrl+'"></div>');
        }
        if(videoUrl) {
            // get embed
            videoHtml = G5.util.oEmbed(videoUrl);
            // was there embedded generated?
            if(videoHtml) {
                // surround with responsive stuff
                videoHtml = '<div class="videoWrapper"><i class="icon-remove rmBtn"></i>'+
                    '<div class="responsiveVideoContainer">'+videoHtml+'</div></div>';
            }
            // no generated embedding -- let's poop out just a link then
            else {
                videoHtml = '<i class="icon-remove rmBtn"></i> <a target="_blank" href="'+videoUrl+'">'+videoUrl+'</a>';
            }

            $cont.append(videoHtml);
        }
    },
    updateInviteTip: function() {
        var that = this,
            $tipCont = this.$el.find('#inviteContribsTip'),
            $inviteMode = $tipCont.find('.inviteMode'),
            $invResMode = $tipCont.find('.inviteResultsMode'),
            $pendingControls = $tipCont.find('.pendingContribsControls'),
            $pendingContribsWrapper = $tipCont.find('.pendingContribsWrapper'),
            $pendingErr = $tipCont.find('.parseEmailsFeedback'),
            $pendingErrEms = $pendingErr.find('.errorEmailsList'),
            $addedContribsWrapper = $tipCont.find('.addedContribsWrapper'),
            pendingInvitees = this.purlModel.pendingInvitees.toJSON(),
            pendingErrorCode = this.purlModel.pendingInviteesErrorCode,
            pendingErrorEmails = this.purlModel.pendingInviteesErrorEmails,
            invitees = this.purlModel.get('invitees'),
            namedInvitees=null,
            namelessInvitees=null;

        // PENDING CONTRIBS
        // clear old stuff
        $pendingContribsWrapper.empty();
        // append rendered tpl
        TemplateManager.get('pendingContribs', function(tpl) {
            $pendingContribsWrapper.html(tpl({
                pendingInvitees: pendingInvitees
            }));
        });
        $pendingControls[pendingInvitees.length?'show':'hide']();
        // errors
        $pendingErr.find('.msg').hide(); // clear (hide)
        // show if there is an errorCode
        if(pendingErrorCode) {
            // show wrapper, and show specific error
            $pendingErr.show().find('.msg.'+pendingErrorCode).show();
            // if there are error emails, then list them
            if(pendingErrorEmails) {
                $pendingErrEms.empty();
                _.each(pendingErrorEmails, function(ee) {
                    $pendingErrEms.append('<div>'+ee.email+'</div>');
                });
            }
        } else {
            // no error? hide the wrapper and hide inside goodies
            $pendingErr.hide().find('.msg').hide();
        }


        // ADDED CONTRIBS
        namedInvitees = _.filter(invitees, function(i){return i.firstName?true:false;});
        // sort by last name
        namedInvitees = _.sortBy(namedInvitees, function(i){return i.lastName;});
        // nameless
        namelessInvitees = _.filter(invitees, function(i){return i.firstName?false:true;});
        // add initialized names
        _.each(namedInvitees, function(inv) {
            // NOTE: this will not work with Chinese etc. unless romanized names are used
            inv.fNameLInitial = inv.firstName+' '+inv.lastName.slice(0,1)+'.';
        });
        // clear wrapper
        $addedContribsWrapper.empty();
        // append rendered tpl
        TemplateManager.get('addedContribs', function(tpl) {
            $addedContribsWrapper.html(tpl({
                namedInvitees:namedInvitees,
                namelessInvitees:namelessInvitees
            }));
        });


        // INVITATION RESULTS MODE
        // if there is a new result from server, let's show it and hide the 'add/invite' stuff
        if(this.purlModel.inviteeResults.hasNotBeenShown) {
            // flip this flag
            this.purlModel.inviteeResults.hasNotBeenShown = false;
            // hide add/invite stuff
            $inviteMode.hide();
            // show results
            TemplateManager.get('inviteResults', function(tpl) {
                $invResMode.empty().append(tpl(that.purlModel.inviteeResults)).show();
            });

        } else {
            // else make sure invite mode is visible and results mode is hidden
            $inviteMode.show();
            $invResMode.hide();
        }

    },//.updateInviteTip()




    /* **************************************
        RESPONSES TO MODEL EVENTS
       ************************************** */

    // events - save contrib
    startSaveContributor: function() {
        var $im = this.$el.find('#purlInitialModal'),
            $subBtn = $im.find('.submitContributorBtn');
        $subBtn.attr('disabled','disabled').spin();
    },
    endSaveContributor: function() {
        var $im = this.$el.find('#purlInitialModal'),
            $subBtn = $im.find('.submitContributorBtn');
        $subBtn.removeAttr('disabled').spin(false);
    },
    successSaveContributor: function() {
        var $im = this.$el.find('#purlInitialModal');
        $im.modal('hide');
    },
    // events - fetch comments
    startFetchComments: function() {
        // maybe a spinner someday if for some reason the users
        // are often sitting waiting for the list of comments
        // but really, they will prolly be reading the recog. text
        // and watching the video, when, *poof*, the comments appear

        // since we're dialoging in comments (with someone who has left),
        // I did decided to add a spinner
        var $cont = this.$el.find('.commentsListWrapper');
        G5.util.showSpin($cont);
    },
    endFetchComments: function() {
        // maybe a spinner someday if for some reason the users
        // are often sitting waiting for the list of comments
        // but really, they will prolly be reading the recog. text
        // and watching the video, when, *poof*, the comments appear
    },
    successFetchComments: function() {
        this.updateContribCommentsList();
    },
    // events - send invitee
    startSendInvitee: function() {
        var $invBtn = this.$el.find('.inviteContribsBtn'),
            $cancel = this.$el.find('.cancelInviteContribsBtn'),
            $tipClsBtn = this.$el.find('.closeInviteContribsTip'),
            $invMode = this.$el.find('.inviteMode');

        G5.util.showSpin($invMode, {cover:true});
        $invBtn.attr('disabled','disabled');
        $cancel.attr('disabled','disabled');
        $tipClsBtn.hide();
    },
    endSendInvitee: function() {
        var $invBtn = this.$el.find('.inviteContribsBtn'),
            $cancel = this.$el.find('.cancelInviteContribsBtn'),
            $tipClsBtn = this.$el.find('.closeInviteContribsTip'),
            $invMode = this.$el.find('.inviteMode');

        G5.util.hideSpin($invMode);
        $invBtn.removeAttr('disabled');
        $cancel.removeAttr('disabled');
        $tipClsBtn.show();
    },
    // events - comment image upload
    startCommmentImageUpload: function() {
        var $upInp = this.$el.find('.attachImageFileInput'),
            $clsBtn = this.$el.find('.attachPhotoWrapper .closeAttModeBtn'),
            $spin = this.$el.find('.attachPhotoWrapper .upSpin');

        $upInp.css('visibility','hidden');
        $spin.show().spin();
        $clsBtn.hide();
    },
    endCommentImageUpload: function() {
        var $upInp = this.$el.find('.attachImageFileInput'),
            $clsBtn = this.$el.find('.attachPhotoWrapper .closeAttModeBtn'),
            $spin = this.$el.find('.attachPhotoWrapper .upSpin');
        $upInp.css('visibility','visible');
        $spin.spin(false).hide();
        $clsBtn.show();
    },
    // events - save comment
    startSaveComment: function() {
        var $cont = this.$el.find('.contribCommentWrapper'),
            $comInp = $cont.find('.contribCommentInp'),
            $subBtn = $cont.find('.submitContribCommentBtn'),
            $mask = $cont.find('.mask');

        $comInp.attr('disabled','disabled');
        $subBtn.attr('disabled','disabled');
        $mask.show();
        G5.util.showSpin($mask);
    },
    endSaveComment: function() {
        var $cont = this.$el.find('.contribCommentWrapper'),
            $comInp = $cont.find('.contribCommentInp'),
            $subBtn = $cont.find('.submitContribCommentBtn'),
            $mask = $cont.find('.mask');

        $comInp.removeAttr('disabled');
        $subBtn.removeAttr('disabled');
        $mask.hide();
        G5.util.hideSpin($mask);

        // make sure the state is good after our manipulation above
        this.updateContribComment();
    },
    successSaveComment: function() {
        var that = this,
            $cont = this.$el.find('.contribCommentWrapper'),
            $comInp = $cont.find('.contribCommentInp'),
            $subBtn = $cont.find('.submitContribCommentBtn'),
            $mask = $cont.find('.mask');

        $comInp.val('');
        this.updateContribCommentsList(true);

        // scroll to comment input container top
        $.scrollTo($cont, {
            axis: 'y',
            offset: {top: -10},
            duration: G5.props.ANIMATION_DURATION,
            onAfter: function() {
                // focus the text input
                $comInp.focus();
                // background fade the newest comment
                G5.util.animBg(that.$el.find('.commentItemWrapper:eq(0) .innerCommentWrapper'), 'flashBg');
            }
        });
    },
    //events- translate text
    doTranslate: function(e){
        var $tar = $(e.target);

        this.purlModel.translateData();
        e.preventDefault();
        $tar.attr('disabled','disabled');
    },
    updateTranslatedText: function(){
        var isTranslated = this.purlModel.get('translatedText'),
            self= this;

        if(isTranslated){
            _.each(this.purlModel.get('comments'), function(comments) {
                self.$el.find("[data-id='" + comments.id + "']").find('.text').html(comments.commentText);
            });
        }
    },
    // events - send thankyou
    startSendThankyou: function() {
        var $m = this.$el.find('#purlThankEveryoneModal'),
            $inp = $m.find('.thankyouTextInp'),
            $spin = $m.find('.spinner');

        $m.find('.btn').attr('disabled','disabled');
        $m.find('.thankyouData').hide();
        $spin.show().spin();
        $m.find('button.close').hide();
    },
    endSendThankyou: function() {
        var $m = this.$el.find('#purlThankEveryoneModal'),
            $inp = $m.find('.thankyouTextInp'),
            $spin = $m.find('.spinner');

        $m.find('.btn').removeAttr('disabled');
        $spin.spin(false).hide();
        $m.find('button.close').show();
    },
    successSendThankyou: function() {
        var $m = this.$el.find('#purlThankEveryoneModal'),
            $inp = $m.find('.thankyouTextInp'),
            $spin = $m.find('.spinner');

        $inp.val('');
        $m.find('.thankyouResults').show();
        $m.find('.submitThankEveryoneBtn').hide();
    },
    resetSendThankyouModal: function() {
        var $m = this.$el.find('#purlThankEveryoneModal');
        $m.find('.thankyouData').show();
        $m.find('.thankyouResults').hide();
        $m.find('.submitThankEveryoneBtn').show();
    },






    // misc
    showInitialModal: function() {
        var $im = this.$el.find('#purlInitialModal'),
            c = this.purlModel.get('contributor')||{};

        // only show if requested
        if(this.purlModel.get('collectContributorInformation')) {
            // attach uploader pluggy
            this.initAvatarUploader($im.find('.avatarUploadWrapper'));

            // NOTE: Currently the fields are always blank -- users always have to enter info
            // * leaving the below in case the "not me" checkbox comes back
            // // populate fields
            // $im.find('.contribInp').each(function(){
            //     var $inp = $(this),
            //         v = c[$inp.data('key')];
            //     if(v) { $inp.val(v); }
            // });
            // // populate avatar field
            // this.setImageIn(c.avatarUrl||"img/avatar-72.jpg", $im.find('.imgWrap'));

            // show modal (bootstrap modal pluggy)
            $im.modal({keyboard:false});
        }
    },
    // render spellcheck shizzzat
    renderSpellcheck: function() {
        var $langs = this.$el.find('.commentTools .spellchecker .dropdown-menu');

        // append each language listed in the spellCheckerLocalesToUse array
        _.each(G5.props.spellCheckerLocalesToUse, function(v) {
            var l = G5.props.spellCheckerLocalization[v];
            if(l) {
                $langs.append('<li><a href="'+v+'">'+l.menu+'</a></li>');
            }
        });
    },
    // setup image uploader on a wrapping el
    initAvatarUploader: function($el) {
        var that = this,
            startSpin = function() {
                $el.find('.upSpin').show().spin();
                $el.find('.uploaderFileInput').hide();
            },
            stopSpin = function() {
                $el.find('.upSpin').spin(false).hide();
                $el.find('.uploaderFileInput').show();
            };

        // upload pluggy
        $el.find('.uploaderFileInput').fileupload({
            paramName: 'fileAsset',
            url: G5.props.URL_JSON_PURL_UPLOAD_MODAL_PROFILE_PICTURE,
            dataType: 'g5json',
            beforeSend: startSpin,
            done: function(e, res) {console.log(res);
                var data = res.result.data, // abnormal JSON
                    msg = data.messages[0];

                if(msg.isSuccess){
                    // set img
                    that.setImageIn(msg.picURL, $el.find('.imgWrap'));
                } else {
                    // ho ho - lazy, but ok I guess, passed QA before
                    alert(msg.text);
                }

                stopSpin();
            },
            error: function(xhr, status, error) {
                stopSpin();
            }
        });
    },

    // responsive videojs
    // from: http://daverupert.com/2012/05/making-video-js-fluid-for-rwd
    initVideoJs: function(id) {
        var idOfVideoElement = id || 'purlDetailVideo';
        // if the video element doesn't exist, we kick out of this method
        if( !$('#'+idOfVideoElement).length ) {
            return;
        }
        // otherwise, initialize the videojs
        if(_V_) { // global reference to videojs lib
            _V_(idOfVideoElement).ready(function() {
                var player = this,
                    aspRat = 9/16, // aspect ratio
                    // resize callback
                    onResize = function() {
                        var w = document.getElementById(player.id).parentElement.offsetWidth;
                        player.width(w).height(w*aspRat);
                    };

                // initial call to resize function
                onResize();
                // bind to window resize event
                window.onresize = onResize;
            });
        }
    },

    initCommentImageUploader: function() {
        var that = this,
            $upInp = this.$el.find('.attachImageFileInput');

        // upload pluggy
        $upInp.fileupload({
            paramName: 'fileAsset',
            url: G5.props.URL_JSON_PURL_UPLOAD_PHOTO,
            dataType: 'g5json',
            beforeSend: function() {
                that.trigger('start:commentImageUpload');
            },
            done: function(e, res) {console.log(res);
                var data = res.result.data, // abnormal JSON
                    msg = data.messages[0];

                if(msg.isSuccess){
                    // set the image data on the model
                    that.purlModel.set('commentImage',{
                        url: msg.picURL,
                        thumbUrl: msg.thumbNailURL
                    });
                    // we know we are in display mode now b/c this was a success
                    // view listens to changes on attachMode to update itself
                    that.purlModel.set('attachMode','display');
                } else {
                    // ho ho - lazy, but ok I guess, passed QA before
                    alert(msg.text);
                }
            },
            error: function(xhr, status, error) {
                // didn't even catch this before
                alert(status+' - '+error);
            },
            complete: function(xhr, status) {
                that.trigger('end:commentImageUpload');
            }
        });
    },

    // helper - set the image in an element
    setImageIn: function(url, $el) {
        var $img = $('<img src="'+url+'">');

        $el.empty().append($img);
    }

});
