/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
console,
$,
_,
Backbone,
G5,
_V_,
Handlebars,
TemplateManager,
PurlContributeModel,
PurlContributeCollection:true
*/
PurlContributeCollection = Backbone.Collection.extend({

    model: PurlContributeModel,

    initialize: function() {
        console.log("[INFO] PurlContributeCollection: PURL Contribute Collection initialized", this);

        this.returnedInviteData;

        //hide attached media div
        $("#PURLCommentAttacheMediaWrapper").hide();
    },

    loadActivityFeed: function() {
        var thisCollection = this,
            thePurlRecipientId  = parseInt($("#purlRecipientId").val(), 10),
            theCommentOrderDescending = $("#commentOrderDescending").val(),
            params = {
                purlRecipientId: thePurlRecipientId,
                commentOrderDescending: theCommentOrderDescending
            };

        console.log("[INFO] PurlContributeCollection: loadActivityFeed started. Sennding this: ", params);

        var loadSpiner = function() {
            var opts = {
                lines: 11, // The number of lines to draw
                length: 22, // The length of each line
                width: 12, // The line thickness
                radius: 19, // The radius of the inner circle
                corners: 1, // Corner roundness (0..1)
                rotate: 50, // The rotation offset
                color: '#000', // #rgb or #rrggbb
                speed: 1.3, // Rounds per second
                trail: 42, // Afterglow percentage
                shadow: false, // Whether to render a shadow
                hwaccel: false, // Whether to use hardware acceleration
                className: 'spinner', // The CSS class to assign to the spinner
                zIndex: 2e9, // The z-index (defaults to 2000000000)
                top: 85, // Top position relative to parent in px
                left: 'auto' // Left position relative to parent in px
                };
            $("#PURLActivityPanelFeed").spin(opts);
        };

        var dataReturned = $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PURL_ACTIVITY_FEED,
            data: {data: JSON.stringify(params)},
            beforeSend: function(){
                loadSpiner();
            },
            success: function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;
                console.log("[INFO] PurlContributeCollection: loadActivityFeed ajax call successfully returned this JSON object: ", data);

                thisCollection.add(data.activityPods);

                //stop spinner
                $("#PURLActivityPanelFeed").spin(false);

                //notify listener
                thisCollection.trigger('loadActivityFeedFinished', data.activityPods);
            }
        });

        dataReturned.fail(function(jqXHR, textStatus) {
            console.log( "[INFO] loadActivityFeed: loadActivityFeed Request failed: " + textStatus );
        });
    },

    renderActivityFeed: function(opts, activityPods, context, newComment) {
        console.log("[INFO] PurlContributeCollection: renderActivityFeed called using these activityPod objects: ", activityPods);

        var thisView = context,
            that = this,
            podTpl = 'purlContributorActivityPod',
            noActTpl = 'purlNoActivity',

            defaults = {
                $target: $("#PURLActivityPanelFeed"),  // JQ object
                classe: null,       // array
                callback: null      // function
            };

        var settings = opts ? _.defaults(opts, defaults) : defaults;
        window.myPlayer = [];

        //let's start constructing the variables for the data object that will get passed to handlebars
        if (activityPods.length) {
            var profileLink,
                profilePhotoSrc,
                imagePrefixUrl = $("#finalPrefixURL").val(),
                stagerPrefixURL = $("#stagerPrefixURL").val();

            _.each(activityPods, function(POD) {
                profileLink = POD.userInfo[0].userName;
                profilePhotoSrc = POD.userInfo[0].profilePhoto || G5.props.URL_ROOT + "assets/img/avatar-72.jpg";
                var data = {},
                    $rendered;

                //do some conditions to figure out data for handlebars
                if (POD.media && POD.media.length > 0){

                    // photo
                    if (POD.media[0].photo && POD.media[0].photo.length > 0){
                        data.media = {
                            image : {
                                prefixUrl : newComment === true ? stagerPrefixURL : imagePrefixUrl,
                                src : POD.media[0].photo[0].src
                            }
                        };
                    }
                    // not a photo, must be a video
                    else {
                        data.media = {
                            video : {
                                activityId : POD.activityId,
                                sources : []
                            }
                        };

                        _.each(POD.media[0].video, function(video) {
                            data.media.video.sources.push({
                                source : video.src,
                                type : video.fileType
                            });
                        });
                    }
                }

                if(POD.videoWebLink !== "" && POD.videoWebLink !== undefined && POD.videoWebLink !== null){
                    data.media = {
                        videoLink : {
                            link : POD.videoWebLink
                        }
                    };
                }

                //now we can contruct the data object
                data = _.extend(data, {
                        id: POD.activityId,
                        theProfileLink: profileLink,
                        profilePhoto: profilePhotoSrc,
                        commentText: POD.commentText
                    });

                TemplateManager.get(podTpl,function(tpl){
                    $rendered = tpl(data);
                });

                //now render the activity
                // if this comment is new, prepend to the list and show with flair
                if(newComment){
                    settings.$target.prepend($rendered).children().first().hide().slideDown();
                }
                // otherwise, append as is
                else{
                    settings.$target.append($rendered);
                }

                // if we've shoved in a video, videoJS it (this seems like a gross way of doing so)
                if(settings.$target.find('#PURLActivityPodVideoWrapper'+POD.activityId).length) {
                    window.myPlayer[POD.activityId] = _V_("feed_video_"+POD.activityId);
                }

            }); // end _.each

        }
        else{
            //no activity yet
            TemplateManager.get(noActTpl,function(tpl){
                settings.$target.append(tpl());
            });
        }

    },

    buildCommentJsonObj: function() {
        var $theCommentBox = $("#PURLCommentBox");

        //general vars
        var theProfilePhoto = $("#PURLInviteAvatarUrl").val(),
            theCommentText = $theCommentBox.find("textarea").val(),
            theUserName = $("#PURLContributorUserName").val(),
            theActivityID = this.models.length + 1001,
            theContributorID = parseInt($("#PURLContributorID").val(), 10),
            videoLink = "",
            theVideoWebLink = "",
            photoSrc = "",

            getMediaType = function() {
                var mediaType = $theCommentBox.find("#attachedMedia").attr('fileType') || "";
                return mediaType;
            };

        var theFileType = getMediaType();

        //video vars
        var re = /(?:\.([^.]+))?$/; //regExp for getting the file type of the video

        switch(theFileType){
            case "video" :
                videoLink = $theCommentBox.find("#attachedMedia").text();
                break;
            case "videoLink" :
                theVideoWebLink = $theCommentBox.find("#attachedMedia").text();
                break;
            case "photo" :
                photoSrc = $theCommentBox.find("#attachedMedia").attr("photosource");
                break;
        }

        //grab the last part of any filename even crazy ones like 1.2.3.4.5.mp4 and file.mp4.avi.mp3.mp4
        //example: file.name.with.dots.txt will retrun '.txt'
        var videoFileType = re.exec(videoLink)[1];

        var theVidObj = videoLink ? {
                fileType: videoFileType,
                src: videoLink
            } : null;

        var thePhotoObj = photoSrc ? {
                src: photoSrc,
                thumbSrc: $theCommentBox.find("#attachedMedia").children().attr("data-thumnailURL")
            } : null;

        var mediaObj = theVidObj || thePhotoObj ? [
                {
                    video: theVidObj ? [theVidObj] : null,
                    photo: thePhotoObj ? [thePhotoObj] : null
                }
            ] : null;

        var jsonObj = [
            {
                messages: [],
                activityId: theActivityID,
                userInfo: [
                    {
                        userName: theUserName,
                        signedIn: "true",
                        contributorID: theContributorID,
                        profileLink: "layout.html?tpl=profilePage&tplPath=apps/profile/tpl/",
                        profilePhoto: theProfilePhoto
                    }
                ],
                commentText: theCommentText,
                videoWebLink: theVideoWebLink,
                media: mediaObj
            }
        ];

        return jsonObj;

    },

    validateVideoType: function() {
        var videoLink = $("#PURLCommentVideoInput").val();

        if (videoLink !== "" && videoLink !== undefined){
            var re = /(?:\.([^.]+))?$/, //regExp for getting the file type of the video
                videoFileType = re.exec(videoLink)[1],
                supportedFormats = ["mp4", "ogg", "m4v", "webm"],
                typeIsSupported = $.inArray(videoFileType, supportedFormats),
                isValid;

            if (typeIsSupported != -1){
                isValid = true;
            }else{
                isValid = false;
            }

            return isValid;
        }
    },

    isValidSite: function(s) {
        var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

        return regexp.test(s);
    },

    validateComment: function() {
        var isValid = true,
            $theCommentBox = $("#PURLCommentBox"),
            $commentTextElm = $theCommentBox.find("textarea"),
            commentText = $commentTextElm.val();

        if (commentText === ""){
            $commentTextElm.addClass("PURLCommentEmptyError");
            isValid = false;
        }else{
            $commentTextElm.removeClass("PURLCommentEmptyError");
        }
            return isValid;
    },

    postComment: function() {
        var thisCollection = this;

        console.log("[INFO] PurlContributeCollection: postComment called");

        var loadCommentSpinner = function() {
            $("#PURLCommentBox textarea").prop('disabled', 'disabled');
            $("#PURLCommentBox .control-group").spin();
        };
        var unloadCommentSpinner = function() {
            $("#PURLCommentBox textarea").removeProp('disabled');
            $("#PURLCommentBox .control-group").spin(false);
        };


        var theJsonObj = this.buildCommentJsonObj();

        var dataSent = $.ajax({
            type: "POST",
            dataType: 'g5json',
            url: G5.props.URL_JSON_PURL_POST_COMMENT,
            data: { data: JSON.stringify(theJsonObj) },
            beforeSend: function(){
                if (thisCollection.validateComment()){
                    loadCommentSpinner();
                }else{
                    return false; //something isn't right, abort the call
                }

            },
            success: function(serverResp){
                var $commentBox = $("#PURLCommentBox");

                if (serverResp.data.messages[0].isSuccess === true){
                     console.log("[INFO] PurlContributeCollection: postComment ajax post successfully posted this JSON object: ", theJsonObj),

                    //stop spinner
                    unloadCommentSpinner();

                    //add the response to the collection
                    thisCollection.add(theJsonObj);

                    //thisCollection.renderNewComment(theJsonObj);
                    thisCollection.renderActivityFeed(null, theJsonObj, null, true);

                    //clean out the text in the comment box
                    $commentBox.find("textarea").val("");
                    $commentBox.find(".spellcheck-badwords").remove();

                    $("#PURLRemoveAttachedMediaBtn").click();

                    //notify listener
                    thisCollection.trigger('postCommentFinished');
                }else{
                    //stop spinner
                    unloadCommentSpinner();

                    alert('server failure: ' + serverResp.data.messages[0].text);

                    console.log("[INFO] PurlContributeCollection: postComment ajax post failure");
                }

            }
        });

        dataSent.fail(function(jqXHR, textStatus) {
            //stop spinner
            $("#PURLCommentBox").spin(false);
            alert("Posting Comment failed: " + textStatus);

            console.log( "[INFO] loadActivityFeed: postComment ajax post failed: " + textStatus );
        });
    },

    bindInviteButton: function(context) {
        console.log("[INFO] PurlContributeCollection: bindInviteButton called");

        var $theButton = $("#PURLInviteBtn"),
            source = $("#PURLInviteToolTip").html(),
            template = Handlebars.compile(source);

        $theButton.qtip({
            content:{
                text: template
            },
            position:{
                my: 'bottom center',
                at: 'top center',
                adjust: {
                    method : 'shift none',
                    effect: false
                    // x: 15,
                    // y: 0
                },
                container: $('body'),
                viewport: $(window)
            },
            show:{
                ready:false,
                event: false
            },
            hide:{
                event: false,
                fixed:true,
                delay:200
            },
            style:{
                padding: 0,
                classes:'ui-tooltip-shadow ui-tooltip-light PURLInviteToolTipContent',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            events:{
                visible:function(event,api){
                    var $this = $(this),
                        $closeBtn = $this.find("#PURLInviteToolTipCloseBtn"),
                        $addBtn = $this.find("#PURLInviteToolTipAddBtn");

                    // scroll the tooltip into place and focus on the textarea
                    if( $this.offset().top < $(window).scrollTop() ) {
                        $.scrollTo($this, G5.props.ANIMATION_DURATION*2, {axis : 'y', offset: { top:-10 }});
                    }
                    $this.find('textarea').focus();

                    context.model.setPlaceholderText(); //for IE

                    //bind the close button
                    $closeBtn.click(function() {
                        $theButton.qtip("hide");
                    });

                    //bind the add button
                    $addBtn.click(function() {
                        event.preventDefault();
                        context.model.addContributor($this, context);
                    });

                    $addBtn.bind("touchstart", function() {
                        event.preventDefault();
                        context.model.addContributor($this, context);
                    });

                    //bind the subInviteButton
                    context.model.bindSecondaryInviteButton(context);
                }
            }
        });

        $theButton.click(function() {
            $theButton.qtip("show");
        });
    },

    addContributor: function($elm, context) {

        //define the handlebars variables
        var source = $("#purlContributorTemplate").html(),
            template = Handlebars.compile(source),
            $contributorList = $("#PURLInviteToolTip_AddedContributors"),
            $emTxt = $('.PURLInviteToolTipContent .inviteTooltipEmailText'),
            parsedEmails = G5.util.parseEmails($emTxt.val()),
            $emailFeedback = $('.invitePurlEmailsFeedback'),
            $added = null;

        console.log("[INFO] PurlContributeCollection: addContributor called to add: ", parsedEmails);

        // clear error state
        //$emTxt.removeClass('PURLinputError');
        $emailFeedback.find('.msg').hide();
        $emailFeedback.find('.errorEmailsList').empty();

        // success
        if (!parsedEmails.errorCode){

            _.each(parsedEmails.emails, function(contributor){
                var $added = $(template(contributor));

                $contributorList.prepend($added); //add contributor element to the list

                $added.find(".PURLRemoveContributorBtn").click(function() {
                    $added.remove();
                    // no contributors in list? hide the action buttons
                    if (!$(".purlContributorWrapper").length) {
                        $(".PURLInviteToolTip_ActionBtns").addClass("PURLHiddenBtn");
                    }

                    // resposition the tooltip if necessary
                    $("#PURLInviteBtn").qtip('reposition');
                });// .click()
            });

            // reveal the invite button
            // $(".PURLHiddenBtn").removeClass("PURLHiddenBtn");
            $emailFeedback.show();
            $emailFeedback.find('.emailsFound').show().find('.count').text(parsedEmails.emails.length);

            // clear the emails textarea
            $emTxt.val('');

            // resposition the tooltip if necessary
            $("#PURLInviteBtn").qtip('reposition');
            setTimeout(function() {
                if( $('.PURLInviteToolTipContent').offset().top < $(window).scrollTop() ) {
                    $.scrollTo($('.PURLInviteToolTipContent'), G5.props.ANIMATION_DURATION*2, {axis : 'y', offset: { top:-10 }});
                }
            }, 201); // QTIP by default uses 200 for the move effect duration and it doesn't appear to be overridable. Just need this to fire after that is done

        }
        // parse error
        else {
            // add an error style to the input
            //$emTxt.addClass('PURLinputError');
            $emailFeedback.show().find('.'+parsedEmails.errorCode).show();

            // render error emails if existing
            if(parsedEmails.errorEmails) {
                _.each(parsedEmails.errorEmails,function(ee){
                    $emailFeedback.find('.errorEmailsList').append('<div>'+ee.email+'</div>');
                });
            }
        }
    },

    bindSecondaryInviteButton: function(context) {
        var $theInviteBtn = $("#PURLInviteToolTip_SecondaryInviteBtn"),
            $theCancelBtn = $("#PURLInviteToolTip_SecondaryInviteBtnCancel");
        this.bindSuccessModal();

        $theInviteBtn.click(function(e) {
            e.preventDefault();
            context.model.postContributorListInvites(context);
            $theInviteBtn.off();
        });

        $theInviteBtn.bind("touchstart", function(e) {
            e.preventDefault();
            context.model.postContributorListInvites(context);
            $theInviteBtn.off();
        });

        $theCancelBtn.click(function(e) {
            e.preventDefault();
            $("#PURLInviteBtn").qtip("hide");
            $theInviteBtn.off();
        });

        $theCancelBtn.bind("touchstart", function(e) {
            e.preventDefault();
            $("#PURLInviteBtn").qtip("hide");
            $theInviteBtn.off();
        });

    },

    bindVideoPhotoCommentLinks: function(context) {
        var that = this,
            $videoLink = $("#PURLCommentAddVideo"),
            $photoLink = $("#PURLCommentAddPhoto"),

        //handlebars setup
            source = $("#purlCommentAttachTipTemplate").html(),
            template = Handlebars.compile(source),

            photoSource = $("#purlCommentUploadPhoto").html(),
            photoTemplate = Handlebars.compile(photoSource);

        //set up tool tip for attach video link
        $videoLink.qtip({
            content:{
                text: template
            },
            position:{
                my: 'top center',
                at: 'bottom center',
                adjust: {
                    method : 'shift none',
                    effect: false
                    // x: 115,
                    // y: 0
                },
                container: $('body'),
                viewport: $(window)
            },
            show:{
                ready:false,
                event: false
            },
            hide:{
                event: 'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                padding: 0,
                classes:'ui-tooltip-shadow ui-tooltip-light PURLCommentAttachLinkTip PURLCommentAttachLinkTipVideo',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            events:{
                visible:function(event,api){
                    var $this = $(this),

                    //find the direct link attach button
                    $attachBtn = $this.find("#PURLCommentVideobBtn");

                    //and bind it
                    $attachBtn.click(function() {
                        var $linkList = $("#PURLCommentAttacheMediaWrapper").find("#attachedMedia"),
                            $thelinkInput = $attachBtn.parent().find("#PURLCommentVideoInput"),
                            theLink = $thelinkInput.val(),
                            $attachLinks = $("#PURLAttachLinksWrapper");

                        if  (theLink === "" || theLink === undefined || theLink === null){
                            $thelinkInput.addClass("PURLCommentAttachLinkError"); //add the error class
                        }else if (!that.validateVideoType()){
                            $thelinkInput.addClass("PURLCommentAttachLinkError");
                            $("#PURLCommentVideoInstructions").addClass("PURLCommentVideoInstructionsError");
                        }else{

                            $thelinkInput.removeClass("PURLCommentAttachLinkError"); //remove the error class, if it has one
                            $("#PURLCommentVideoInstructions").removeClass("PURLCommentVideoInstructionsError");

                            $videoLink.qtip("hide"); //hide the tooltip

                            $linkList.attr("fileType", "video");

                            $linkList.append(theLink).parent().slideDown(); //attach the link to the link list

                            $attachLinks.slideUp(); //hide the media attach links

                            //find the remove media button
                            var $removeBtn = $("#PURLRemoveAttachedMediaBtn");

                            //and bind it
                            $removeBtn.click(function() {
                                $removeBtn.parent().slideUp(); //hide the attached media section
                                $linkList.html("").removeAttr("filetype").removeAttr("photosource"); //remove the content from the link list
                                $attachLinks.slideDown(); //bring back the attach links
                            });
                        }

                    });

                    //find the web  link attach button
                    var $webAttachBtn = $this.find("#PURLCommentVideoWebBtn");

                    //and bind it, as well
                    $webAttachBtn.click(function() {
                        var $linkList = $("#PURLCommentAttacheMediaWrapper").find("#attachedMedia"),
                            $thelinkInput = $webAttachBtn.parent().find("#PURLCommentVideoInputWeb"),
                            theLink = $thelinkInput.val(),
                            $attachLinks = $("#PURLAttachLinksWrapper");

                        if  (theLink === "" || theLink === undefined || theLink === null){
                            $thelinkInput.addClass("PURLCommentAttachLinkError"); //add the error class
                        }else if (!that.isValidSite(theLink)){
                            $thelinkInput.addClass("PURLCommentAttachLinkError");
                            $("#PURLCommentVideoInstructionsWeb").addClass("PURLCommentVideoInstructionsError");
                        }else{

                            $thelinkInput.removeClass("PURLCommentAttachLinkError"); //remove the error class, if it has one
                            $("#PURLCommentVideoInstructions").removeClass("PURLCommentVideoInstructionsError");

                            $videoLink.qtip("hide"); //hide the tooltip

                            $linkList.attr("fileType", "videoLink");

                            $linkList.append(theLink).parent().slideDown(); //attach the link to the link list

                            $attachLinks.slideUp(); //hide the media attach links

                            //find the remove media button
                            var $removeBtn = $("#PURLRemoveAttachedMediaBtn");

                            //and bind it
                            $removeBtn.click(function() {
                                $removeBtn.parent().slideUp(); //hide the attached media section
                                $linkList.html(""); //remove the content from the link list
                                $attachLinks.slideDown(); //bring back the attach links
                            });
                        }
                    });

                    $this.find(".icon-info-sign").popover(); //bind the info link
                }
            }
        });

        //set up tooltip for attach photo link
        $photoLink.qtip({
            content:{
                text: photoTemplate
            },
            position:{
                my: 'top center',
                at: 'bottom center',
                adjust: {
                    method : 'shift none',
                    effect: false
                    // x: 15,
                    // y: 0
                },
                container: $('body'),
                viewport: $(window)
            },
            show:{
                ready:false,
                event: false
            },
            hide:{
                event: 'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                padding: 0,
                classes:'ui-tooltip-shadow ui-tooltip-light PURLCommentAttachLinkTip PURLCommentAttachLinkTipPhoto',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });


        $videoLink.click(function(e) {
            e.preventDefault();
            $videoLink.qtip("show");
        });

        $photoLink.click(function(e) {
            e.preventDefault();
            $photoLink.qtip("show");

            // initialize the fileupload widget
            context.model.uploadPicture(context, $("#purlCommentUploadPhoto").find('input'));
        });
    },

    preparePhotoForSubmit: function($elm, link, thumbNailURL){
        var $linkList = $("#PURLCommentAttacheMediaWrapper").find("#attachedMedia"),
            theFullLink = link,
            theLink = theFullLink.substr(theFullLink.lastIndexOf('/') + 1), //takes only the filname and drops the path
            $attachLinks = $("#PURLAttachLinksWrapper"),
            stagerPrefixURL = $("#stagerPrefixURL").val();

        $("#PURLCommentAddPhoto").qtip("hide"); //hide the tooltip

        $linkList.attr("fileType", "photo");
        $linkList.attr("photoSource", theFullLink);

        $linkList.append("<img src='" + stagerPrefixURL + thumbNailURL +"' data-thumnailURL='" + thumbNailURL + "'/>").parent().slideDown(); //attach the link to the link list

        $attachLinks.slideUp(); //hide the media attach links

        //find the remove media button
        var $removeBtn = $("#PURLRemoveAttachedMediaBtn");

        //and bind it
        $removeBtn.click(function() {
            $removeBtn.parent().slideUp(); //hide the attached media section
            $linkList.html("").removeAttr("filetype").removeAttr("photosource"); //remove the content from the link list
            $attachLinks.slideDown(); //bring back the attach links
        });
    },

    bindCommentSubmitBtn: function(context) {
        var $theCommentButton = $("#PURLCommentSubmit"),
            $theCommentBox = $('#PURLCommentBox textarea'),
            $theCounterWrapper = $('#charCountWrapper'),
            $theCounter = $('#charCount'),
            theMaxCount = parseInt( $theCounter.text().replace(/,/g, ''), 10);

        $theCommentBox.keyup(function(e) {
            var charLength = $(this).val().length;
            $theCounter.text( $.format.number(theMaxCount - charLength) );
            $theCounterWrapper[(theMaxCount - charLength <= 50)?'addClass':'removeClass']('warning');
            G5.util.formValidate($theCommentBox);
        });

        $theCommentButton.click(function(e) {
            e.preventDefault();
            if( G5.util.formValidate($theCommentBox) ) {
                context.model.postComment();
                $theCounter.text( $.format.number(theMaxCount) );
                $theCounterWrapper.removeClass('warning');
            }
        });
    },

    getContributorInviteJsonObj: function() {
        var $contributorListElm = $("#PURLInviteToolTip_AddedContributors"),
            $ContributorElements = $contributorListElm.find(".purlContributorWrapper"),

            theInviteJsonObj = {
                messages: [],

                invites:[
                ]
            };

        //create a js obj for each listed contributor, then pop it into the larger js obj
        $ContributorElements.each(function() {
            var $this = $(this),
                theFirstName = $this.find(".first").length?$this.find(".first").text():null,
                theLastname = $this.find(".last").length?$this.find(".last").text():null,
                theEmailAddress = $this.find(".email").length?$this.find(".email").text():null,

            //build this contributor's object
                theData = {
                    firstName: theFirstName,
                    lastName: theLastname,
                    emailAddress: theEmailAddress
                };

            //add it to the big invite list
            theInviteJsonObj.invites.push(theData);
        });

        return theInviteJsonObj;

    },

    bindSuccessModal: function() {
        var $successModal = $("#PURLInviteSucessMessage"),
            that = this;

        $successModal.on("shown", function() {
            that.populateModal(that.returnedInviteData, $successModal);
        });
    },

    postContributorListInvites: function(context) {

        var that = this;

        var loadSpiner = function() {
            var opts = {
                lines: 11, // The number of lines to draw
                length: 22, // The length of each line
                width: 12, // The line thickness
                radius: 19, // The radius of the inner circle
                corners: 1, // Corner roundness (0..1)
                rotate: 50, // The rotation offset
                color: '#000', // #rgb or #rrggbb
                speed: 1.3, // Rounds per second
                trail: 42, // Afterglow percentage
                shadow: false, // Whether to render a shadow
                hwaccel: false, // Whether to use hardware acceleration
                className: 'spinner', // The CSS class to assign to the spinner
                zIndex: 2e9, // The z-index (defaults to 2000000000)
                top: 85, // Top position relative to parent in px
                left: 'auto' // Left position relative to parent in px
                };

            $("#PURLInviteToolTip_AddedContributors").spin(opts);
        };

        var theJsonObj = context.model.getContributorInviteJsonObj();

        console.log("[INFO] PurlContributeCollection: postContributorListInvites ajax called to post this JSON object: ", theJsonObj);

        var dataSent = $.ajax({
            type: "POST",
            dataType: 'g5json',
            url: G5.props.URL_JSON_PURL_INVITE_CONTRIBUTORS,
             data: { data: JSON.stringify(theJsonObj) },
            beforeSend: function(){
                loadSpiner();
                that.returnedInviteData = undefined;
            },
            success: function(serverResp){

                console.log("[INFO] PurlContributeCollection: postContributorListInvites ajax post successfully returned this JSON object: ", serverResp);

                //let outer function see the data
                that.returnedInviteData = serverResp.data.invites;

                //stop spinner
                $("#PURLInviteToolTip_AddedContributors").spin(false);

                //hide the tooltip
                $("#PURLInviteBtn").qtip("hide");

                //show success message
                $("#PURLInviteSucessMessage").modal("show");

            }
        });

        dataSent.fail(function(jqXHR, textStatus) {
            console.log( "[INFO] loadActivityFeed: postContributorListInvites ajax post failed: " + textStatus, jqXHR );
        });

    },

    populateModal: function(invites, $modal) {
        var template = "";
        var icon = "";

        //classes are determined by json response
        for (var i = 0; i < invites.length; i++) {
            var thisInvitee = invites[i];
            icon = "ok";

            if (thisInvitee.status === "fail"){
                icon = "remove";
            }

            var thisInviteTemplate = "<li><span class='PURLContributorListName'>" + thisInvitee.firstName + " " + thisInvitee.lastName + "</span><span class='PURLInviteList" +  thisInvitee.status + "'>" + thisInvitee.emailAddress + "</span><i class='icon-" + icon + "'></i></li>";

            template += thisInviteTemplate;
        }

        $modal.find("#PURLInviteSucessModalList").html("").append(template);
    },

    setPlaceholderText: function() {
        $(':input[placeholder]').placeholder();
    },

    uploadPicture: function(context, $elm) {
        'use strict';

        var thisCollection = this;

        $("#PURLVideoUploadTip").find("input").fileupload({
            paramName: 'fileAsset',
            url: G5.props.URL_JSON_PURL_UPLOAD_PHOTO,
            dataType: 'json',
            done: function(e, data) {
                console.log('[INFO] uploadPicture finished' + G5.props.URL_JSON_PURL_UPLOAD_PHOTO);
                if (data.result.messages[0].isSuccess === true){
                     var picLink = data.result.messages[0].picURL,
                        thumbNail = data.result.messages[0].thumbNailURL;

                     //get the photo ready and bind the buttons
                     context.model.preparePhotoForSubmit($elm, picLink, thumbNail);

                }else{
                    alert('server failure: ' + data.result.messages[0].text);
                }
            }
        });
    },

    bindDatePickers: function(context) {
        var today = new Date();
        $(".PURLAwardDateEdit").datepicker('setStartDate', today)
                .on('changeDate', function(ev){
                        var $this = $(this),
                            $thisRow = $this.parent().parent(),
                            rowName = $thisRow.attr("name"),
                            thePurlRecipientId = $thisRow.find("#purlRecipientId").val();

                        $this.datepicker("update");
                        $('#alert').hide();
                        var awardDate = new Date(ev.date),
                            awardDateFormatted = $this.data('date');

                        console.log("[INFO] New Date picked: ", awardDate);
                        console.log("[INFO] Sending new award date to server in this format: ",awardDateFormatted);

                        $this.datepicker('hide');

                        context.model.postNewAwardDate(awardDateFormatted, rowName, thePurlRecipientId, context);

                });
    },

    postNewAwardDate: function(date, rowName, thePurlRecipientId, context) {
        var thisCollection = this,
            jsonObj = {
                messages:[
                    {
                    newAwardDate: date,
                    rowName: rowName,
                    purlRecipientId: thePurlRecipientId
                    }
                ]
            },

            dataReturned = $.ajax({
                type: "POST",
                dataType: 'g5json',
                url: G5.props.URL_JSON_PURL_POST_NEW_AWARD_DATE,
                data: {data: JSON.stringify(jsonObj)},

                success: function(serverResp){
                    //regular .ajax json object response
                    var data = serverResp.data;
                    var newAwardDate = data.messages[0].newAwardDate;
                    var newEndDate = data.messages[0].newEndDate;
                    var rowName = data.messages[0].rowName;
                    console.log("[INFO] PurlContributeCollection: postNewAwardDate ajax call successfully posted this JSON object: ", jsonObj);
                    console.log("[INFO] PurlContributeCollection: postNewAwardDate ajax call successfully returned this JSON object: ", data);

                    context.model.changeAwardDates(newAwardDate, newEndDate, rowName);
                }
            });

        dataReturned.fail(function(jqXHR, textStatus) {
            console.log( "[INFO] loadActivityFeed: postNewAwardDate Request failed: " + textStatus );
        });
    },

    changeAwardDates: function(theNewAWardDate, theNewEndDate, theRowName) {
        var $theRow = $('[name="' + theRowName + '"]');

        $theRow.find(".PURLAwardDateEdit").html(theNewAWardDate);
        $theRow.find("#endDate").html(theNewEndDate);

        console.log("[INFO] PurlContributeCollection: changeAwardDates changed the dates on", theRowName + " to", theNewAWardDate, theNewEndDate);
    },

    checkForEmailDirected: function(context) {
        //If someone gets a link to the PURL in an email, show this modal pop over
        var gotEmailInvite = $("#gotEmailInvite").val(),
            $theFirstNameInput,
            $theLastNameInput,
            $theEmailInput,

            getEmailedMemberInfoJsonObj = function() {
                var theFirstName = $theFirstNameInput.val(),
                    theLastName = $theLastNameInput.val(),
                    theEmailAddress = $theEmailInput.val(),
                    thePicURL = $("#PURLWelcomeModalProfilePhoto").parent().parent().find("img").attr("data-thumnailURL"),
                    invitedContributorID = parseInt($("#PURLContributorID").val(), 10),

                    theObj = {
                        messages: [
                            {
                            invitedContributorId: invitedContributorID,
                            firstName: theFirstName,
                            lastName: theLastName,
                            emailAddress: theEmailAddress,
                            picURL : thePicURL
                            }
                        ]
                    };

                return theObj;
            };

        if (gotEmailInvite === "true"){
            var $theModal = $("#PURLWelcomeModal");
            $theModal.on('shown', function () {
                // initialize the fileupload widget
                context.model.postEmailedMemberProfilePic($photoBtn);
            });
            $theModal.modal({
                keyboard: false
            });


            $theModal.modal("show");

            var $contributeBtn = $("#modalContributeBtn");

            //vars for validating and sending info
            $theFirstNameInput = $("#PURLWelcomeModalFirstName");
            $theLastNameInput = $("#PURLWelcomeModalLastName");
            $theEmailInput = $("#PURLWelcomeModalEmailAddress");
            var $validationFields = $theFirstNameInput.add($theLastNameInput).add($theEmailInput);
            var $theNotMineRadio = $("#PURLWelcomeModalNotMine");
            var $photoBtn = $("#PURLWelcomeModalProfilePhoto");
            var prefilledPicURL = $("#PURLInviteAvatarUrl").val();

            //fill in prefilled info
            $theFirstNameInput.val( $('#PURLInviteFirstName').val() );
            $theLastNameInput.val( $('#PURLInviteLastName').val() );
            $theEmailInput.val( $('#PURLInviteEmailAddress').val() );

            //check for preexisting photo
            if (prefilledPicURL !== "" && prefilledPicURL !== undefined){
                var imagePrefixUrl = $("#finalPrefixURL").val();
                var InviteAvatarUrl = $("#PURLInviteAvatarUrl").val();
                $photoBtn.siblings("img").show().attr("src", InviteAvatarUrl).attr("data-thumnailURL", InviteAvatarUrl);
            }

            $theNotMineRadio.click(function() {
                if ($theNotMineRadio.prop("checked")){
                    //clear out that info
                    $theFirstNameInput.val("");
                    $theLastNameInput.val("");
                    $theEmailInput.val("").removeProp("disabled");
                    $photoBtn.val("");
                    $photoBtn.siblings("img").hide().removeAttr("src").removeAttr("data-thumnailURL");
                }
            });

            $contributeBtn.click(function(e){
                e.preventDefault();
                if( G5.util.formValidate($validationFields) ) {
                    context.model.postEmailedMemberInfo(getEmailedMemberInfoJsonObj(), $theModal);
                }
            });

        }
    },

    postEmailedMemberInfo: function(theJsonObj, $theModal) {

        var loadModalSpinner = function() {
            var opts = {
                lines: 11, // The number of lines to draw
                length: 13, // The length of each line
                width: 6, // The line thickness
                radius: 8, // The radius of the inner circle
                corners: 1, // Corner roundness (0..1)
                rotate: 50, // The rotation offset
                color: '#000', // #rgb or #rrggbb
                speed: 1.3, // Rounds per second
                trail: 42, // Afterglow percentage
                shadow: false, // Whether to render a shadow
                hwaccel: false, // Whether to use hardware acceleration
                className: 'spinner', // The CSS class to assign to the spinner
                zIndex: 2e9, // The z-index (defaults to 2000000000
                top: 41, // Top position relative to parent in px
                left: 'auto' // Left position relative to parent in px
                };
            $theModal.spin(opts);
        };

        var dataSent = $.ajax({
            type: "POST",
            dataType: 'g5json',
            url: G5.props.URL_JSON_PURL_INVITE_CONTRIBUTORS_EMAILED,
            data: { data: JSON.stringify(theJsonObj) },
            beforeSend: function(){
                loadModalSpinner();
            },
            success: function(serverResp){

                console.log("[INFO] PurlContributeCollection: postEmailedMemberInfo ajax post successfully posted this JSON object: ", theJsonObj);

                console.log("[INFO] PurlContributeCollection: postEmailedMemberInfo ajax post returned this data: ", serverResp),

                //stop spinner
                $theModal.spin(false);

                //hide the modal
                $theModal.modal("hide");

                //assign new contributorID and user name
                $("#PURLContributorID").val(serverResp.data.messages[0].contributorID);
                $("#PURLContributorUserName").val(serverResp.data.messages[0].firstName + " " + serverResp.data.messages[0].lastName);
                $("#PURLInviteAvatarUrl").val(serverResp.data.messages[0].avatarUrl);
            }
        });

        dataSent.fail(function(jqXHR, textStatus) {
            console.log( "[INFO] loadActivityFeed: postEmailedMemberInfo ajax post failed: " + textStatus );
        });
    },

    postEmailedMemberProfilePic: function() {
        'use strict';

        $("#PURLWelcomeModalProfilePhoto").fileupload({
            paramName: 'fileAsset',
            url: G5.props.URL_JSON_PURL_UPLOAD_MODAL_PROFILE_PICTURE,
            dataType: 'json',
            done: function(e, data) {
                console.log('[INFO] postEmailedMemberProfilePic finished, done callback fired');
                if (data.result.messages[0].isSuccess === true){

                    var picURL = data.result.messages[0].picURL;
                     console.log('[INFO] Server response: (success)', data);
                     console.log('[INFO] pic now hosted here: ', picURL);

                    //can't cache this JQ obj
                    //attach the resulting pic url to the img elem
                    var stagerPrefixURL = $("#stagerPrefixURL").val();
                    $("#PURLWelcomeModalProfilePhoto").parent().parent().find("img").attr("src", stagerPrefixURL + picURL).attr("data-thumnailURL", picURL).slideDown();

                }else{
                    alert('server failure: ', data.result.messages[0].text);
                }
            },
            fail: function(e, data) {
                console.log("[ERROR] postEmailedMemberProfilePic upload failed: ", data.errorThrown, data.textStatus );
            },
            always: function(e, data) {
                console.log('[INFO] postEmailedMemberProfilePic finished', data);
            }
        });
    },

    bindThankButton: function() {
        var $theModal = $("#PURLThanksModal"),
            $theButton = $("#PURLThankEveryoneBtn"),
            that = this;

        $theButton.click(function() {
            if ($("#userAuthenticated").val() === "true") {
                $theModal.modal("show").find("#PURLThanksModalText").val("");
            }else{
                window.location.assign( $theButton.attr("data-loginRedirect") );
            }

        });

        $theModal.find("#PURLThanksModalSubmitBtn").click(function() {
            that.postThankYou($theModal);
        });
    },

    postThankYou: function($theModal) {
        var theStaticText = $theModal.find("#PURLThanksModalStaticText").text(),
            theThanksMessage = $theModal.find("#PURLThanksModalText").val(),
            theSubjectText = $("#PURLThanksModalSubjectText").val(),
            thePurlRecipientId = parseInt($("#purlRecipientId").val(), 10),

            thanksObject = {
                purlRecipientId: thePurlRecipientId,
                subjectText: theSubjectText,
                staticText: theStaticText,
                thanksMessage: theThanksMessage
            },
            dataSent = $.ajax({
                type: "POST",
                dataType: 'g5json',
                url: G5.props.URL_JSON_PURL_SEND_THANK_YOU,
                data: { data: JSON.stringify(thanksObject) },
                beforeSend: function() {
                    console.log( "[INFO] postThankYou ajax post attempting to send: ", thanksObject );
                },
                success: function(serverResp){
                    console.log( "[INFO] postThankYou ajax post sucess: ", serverResp );

                    $theModal.modal("hide");

                    if (serverResp.data.messages[0].isSuccess === true){
                        $("#PURLThanksModalSuccess").modal("show");
                    }else{
                        alert("Server Error: " + serverResp.data.messages[0].errorMessage);
                    }
                }
            });

        dataSent.fail(function(jqXHR, textStatus) {
            alert("Posting thanks failed: " + textStatus);

            console.log( "[INFO] postThankYou ajax post failed: ", textStatus );
        });
    },

    bindPrintLink: function() {
        $(".printButton").click(function() {

            var $feedClone = $("<div class='purlPrintModalCongratsWrapper'>" + $("#PURLCongratsColumn").html() + "</div>" + "<legend>Comments</legend>" + $("#PURLActivityPanelFeed").html()).addClass("PURLPrintModal"); //need to stringify this for ie8 :/

            G5.util.doSheetOverlay(false, null, "", $feedClone);

            console.log(!$("#sheetOverlayModal").find(".printBtn").length > 0);
            console.log($("#sheetOverlayModal").find(".printBtn").length > 0);
            console.log($("#sheetOverlayModal").find(".printBtn").length <= 0);
            if (!$("#sheetOverlayModal").find(".printBtn").length > 0) {
                var $modal = $feedClone.closest(".modal-stack");

                $modal.find(".modal-footer").append("<a class='btn btn-primary printBtn' onclick='window.print(); return false;'>Print</a>");

                $modal.find(".modal-header").css("border", 0);
            }

        });
    },

    checkForAuthenticated : function() {
        //checks to see if user just attmpted to post a thank you note while not logged into the purl

        if ($("#returnAuthenticated").val() === "true" && $("#userAuthenticated").val() === "true") {
            $("#PURLThankEveryoneBtn").trigger("click");
        }
    }

});