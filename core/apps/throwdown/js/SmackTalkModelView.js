/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
Backbone,
SmackTalkModelView:true
*/

//Smack Talk MODEL VIEW

// MODES
// 1) compact style (module and pub rec page)
// 2) details style (detail page - shows ecard etc.)
SmackTalkModelView = Backbone.View.extend({

    tag:"div",

    className:"smackTalkItem smack-talk-item",

    //EVENTS
    events:{
        "click .viewAllCommentsBtn" : "doShowComments",
        "click .profile-popover" : "attachParticipantPopover",
        "click .flag" : "attachFlagPopover",
        "click .readMoreTrigger" : "doReadMore",
        //comment form
        "click .showCommentFormBtn" : "showCommentInput",
        "keydown .commentInputTxt" : "doCommentKeydown",

        //area.maxlength shim for opera and ie
        "keyup textarea" : "enforceMaxLength",
        "blur textarea" : "enforceMaxLength",
        "mouseup textarea" : "enforceMaxLength",

        "click .likeSmackTalkBtn" : "doLike",

        //detail view stuff
        "click .hideSmackTalkLnk" : "hideSmackTalk",
        "click .smackTalkHideRecognitionConfirm" : "doHide",
        "click .smackTalkHideRecognitionCancel" : "hideHideConfirmTip",
        "click .printBtn" : function(e){window.print();e.preventDefault();}
    },

    initialize:function(opts){
        this.tplName = opts.tplName||"smackTalkItem";
        this.commentTplName = opts.commentTplName||"smackTalkComment";
        this.tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'throwdown/tpl/';

        //are we hiding all but the first comment?
        this.isHideComments = opts.isHideComments||false;

        this.isKeepElementOnHide = opts.isKeepElementOnHide||false;

        //when model has a comment added
        this.model.on('commentAdded',function(comment){
            this.addCommentToDom(comment);
        },this);

        //when model is liked
        this.model.on('liked', function(numLikes, e, commentId) {
            this.changeDomToLiked(numLikes, e, commentId);
        },this);

        //when model is hidden
        this.model.on('hidden',function(commentId){this.updateHidden(commentId);},this);

        //when model has data loaded, render
        this.model.on('dataLoaded',function(){ this.render(); },this);
    },

    render: function(){
        var that = this,
        comments = this.model.get('comments'),
        $comCont;

        //did we already render?
        if (this.rendered) {
            return this;
        }

        //SMACK TALK: render
        TemplateManager.get(this.tplName, function(tpl, vars, subTpls){
            var myModel = that.model.toJSON();

            //extra variables added for the template
            myModel = _.extend({}, myModel, {
                isMine: myModel.isMine || myModel.smackTalkSetNameId==='mine',
                isHideComments: that.isHideComments
            });
            // adjust the number of likers if this user likes this
            if(myModel.isLiked) { myModel.numLikers -= 1; }

            //append the smack talk template
            that.$el.append(tpl(myModel));

            that.initLikeInfo();

            that.$el.find('input,textarea').placeholder();

            //that.$el.find('.comment-input').elastic();

            //get the comment container element
            $comCont = that.$el.find('.smackTalkComments').html('');

            //COMMENTS: render this smack talk's comments
            TemplateManager.get(that.commentTplName, function(tpl){

                _.each(comments,function(com){
                    //attach the comment template to the DOM
                    $comCont.append(tpl(com));
                });

                //if comments hidden, show first, else show all
                if(that.isHideComments){
                    $comCont.find('.smackTalkCommentsComment').last().css('display','');
                }else{
                    $comCont.find('.smackTalkCommentsComment').show();
                }

                that.rendered = true;

                // call after render (might not be attached to DOM yet)
                that.initReadMore();

            }, that.tplUrl);//COMMENTS: end tpl get

        }, this.tplUrl);//SMACK TALK: end tpl get

        return this;//chaining
    },

    initLikeInfo: function() {
        var that = this,
            $sen = this.$el.find('.likeSentence'),
            lo = '<a class="profile-popover" href="#" data-smack-talk-id="'+this.model.get('id')+'" data-participant-info-type="likers" >',
            lc = '</a>',
            no = '<span class="likeCount">',
            nc = '</span>',
            numLikers = that.model.get('numLikers');

        numLikers = this.model.get('isLiked')?numLikers-1:numLikers;

        //fill in sentence markup
        $sen.each(function(){
            var $t = $(this),num;
            // number of likers
            $t.html( $t.html().replace('{0}', numLikers ));
            num = $t.html().match(/\d+/); // find the number
            num = num&&num.length?num[0]:null; // pull from array
            if(num) { // if we have a number
                $t.html($t.html().replace(num, no+num+nc));
            }
            $t.html( $t.html().replace('{link}', lo));
            $t.html( $t.html().replace('{/link}', lc));
        });

        this.updateLikeInfo();

    },

    // commentId is used to check if the like was made on a smack talk post, or on a comment
    updateLikeInfo: function(commentId) {
        if(!commentId) {
            var m = this.model.toJSON(),
                $likeInfo = this.$el.find('.likeInfoWrapper'),
                $sen = $likeInfo.find('.likeSentence'),
                toShowClass;

            // start with all hidden
            $sen.hide();

            // find which one to show
            if(m.isLiked) { //YOU LIKE
                if(m.numLikers===1){toShowClass = 'youOnly';} // only you
                if(m.numLikers===2){toShowClass = 'youAndOne';} // you and one
                if(m.numLikers>2){toShowClass = 'youAndMult';} // you and mult
            }
            else { //YOU DON'T LIKE
                if(m.numLikers===1){toShowClass = 'oneOtherOnly';} // one other
                if(m.numLikers>1){toShowClass = 'multOtherOnly';} // mult others
            }

            if(toShowClass){
                $sen.filter( '.' + toShowClass ).show();
            }
        }
    },

    // this must be called after render AND attachment to account
    // for inconsistent data-load+render VS DOM attachment
    initReadMore: function() {
        var $rm = this.$el.find('.readMore'),
            newHeight;

        // must be attached, and rendered
        if(!this.$el.closest('body') || !this.rendered) { return; }
        $rm.each(function(){
            var $t = $(this),
                numLines = $t.data('readMoreNumLines')||2,
                rmTxt = $t.data('msgReadMore')||'more';

            newHeight = numLines * parseInt($t.css('line-height'),10);

            // only give read more option when necessary
            if ($t.height() > newHeight) {
                $t.css('height', newHeight );
                if(!$t.find('.readMoreTrigger').length) {
                    $t.append($('<a class="readMoreTrigger" />').html('&hellip;'+rmTxt));
                }
            }
        });
    },

    doReadMore: function(e) {
        var $tar = $(e.target),
            $rm = $tar.closest('.readMore');
        e.preventDefault();
        $rm.css('height','').data('_readMoreClicked',true);

        // ie8 JQ1.8 event.target.remove() fix (defer remove() call)
        setTimeout(function(){
            $tar.remove();
        },0);
    },

    enforceMaxLength: function(e) {
        var $tar = $(e.target),
            ml = $tar.attr('maxlength');
        // only for IE and textareas with maxlength attrs
        if(!$.browser.msie||!ml) {return;}

        if($tar.val().length > ml) {
            $tar.val( $tar.val().slice(0,ml) );
        }
    },

    doShowComments:function(e){
        var $tar = $(e.currentTarget),
            $comCont = this.$el.find('.smackTalkComments'),
            i=0;
        // this.isHideComments = false;
        $comCont.find('.smackTalkCommentsComment').each(function(){
            var $cmt = $(this);
            //delayed fade in effect
            setTimeout(function(){$cmt.fadeIn();},i*100);
            i++;
        });
        //hide the view all link now that everything is visible
        $tar.closest('.viewAllCommentsWrapper').hide();

        e.preventDefault();
    },

    doCommentKeydown:function(e){
        var $inp,
            that=this,
            $cmtForm = this.$el.find('.smackTalkCommentForm'),
            jsonUrl = $cmtForm.attr('action'),
            params = {};

        //put the form elements in an object
        _.each($cmtForm.serializeArray(),function(input){
            params[input.name] = input.value;
        });

        if(e.which===13){
            e.preventDefault();

            $inp = $(e.target);
            // clear whitespace
            $inp.val( $inp.val().replace(/^\s+$/,'') );
            // enforce maxlength for ie
            this.enforceMaxLength(e);

            if ($inp.val().length > 0) {
                //start a spinner for waiting
                $inp.parent().spin();

                this.model.saveComment(params,$inp.val(),jsonUrl,function(cmt){
                    //reset value, stop spinner
                    $inp.val('').parent().spin(false);

                    //comment is added to DOM when view hears the successful "commentAdd" event
                }); // saveComment
            } // if it's not empty

        } // if keydown is enter

    }, // doCommentKeydown

    addCommentToDom:function(comment){
        var that = this,
            $cmtCount = this.$el.find('.commentCount');

        //update comment count
        $cmtCount.text(this.model.get('comments').length);

        TemplateManager.get(this.commentTplName, function(tpl){
            var $cmt = $(tpl(comment)),
                $cc = $cmt.closest('.smackTalkCommentsComment'),
                origBg,dkBg;

            //attach the comment template to the DOM
            that.$el.find('.smackTalkComments').append($cmt);

            //get the bg colors from css
            origBg = $cc.css('background-color');
            dkBg = $cc.addClass('darken').css('background-color');
            $cc.removeClass('darken');

            //effects to show user where new comment is
            $cc.css('background',dkBg).show()
                .animate({backgroundColor:origBg},1000);

            //scroll to new message
            //targeting inner elements that's not a display:table
            //or if page then just call $.scrollTo()
            (that.isPageView() ? $ : $cmt.closest('.smackTalkItemsCont') )
                .scrollTo($cmt.find('.app-col').get(0),400);


        },that.tplUrl);
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
    },

    //attach flag popover
    attachFlagPopover: function(e) {
        var $tar = $(e.currentTarget),
            that = this;

        // lazy attach -- much more efficient
        if(!$tar.data('qtip')) {
            // attach country tooltip
            $tar.qtip({
                content:{ text: $tar.attr('title') },
                position:{
                    my: 'bottom center',
                    at: 'top center',
                    container: that.$el
                },
                show:{ event:'click', ready:true },
                hide:{
                    event:'unfocus',
                    fixed:true,
                    delay:200
                },
                style:{ classes:'ui-tooltip-shadow ui-tooltip-light' }
            });
        }
    },

    showCommentInput:function(e){
        var that = this;
        e.preventDefault();

        //slide down the input
        this.$el.find('.commentInputWrapper').slideDown(
            function(){
                var $this = $(this); // .commentInputWrapper
                var $container = that.isPageView() ? $(window) : $this.closest('.smackTalkItemsCont');

                // elastic plugin lazy attach
                if(!that.comInpElasticAttached){ // plugin is too stupid to keep track. //stupid plugin.
                    that.$el.find('.comment-input').elastic();
                    that.comInpElasticAttached = true;
                }

                // scroll to the input and focus
                $container.scrollTo(
                    $this,
                    {
                        offset: -($container.outerHeight() - $this.outerHeight() - 8),
                        duration: 500,
                        onAfter: function(){
                            $this.find('.commentInputTxt').focus();
                        }
                    }
                );
            }
        );
    },

    doLike: function(e) {
        var commentId = $(e.target).parent().parent().data('commentId');

        this.model.saveLike(e, commentId);
        e.preventDefault();
    },

    // commentId is passed through to be able to check later if the like was on a smack talk post or a comment
    changeDomToLiked:function(numLikes, e, commentId){
        var $likeBtn = $(e.target);
        $likeBtn.replaceWith($likeBtn.data('msgLiked') || 'Liked');

        this.updateLikeInfo(commentId);
    },

    //the 'hide' link
    hideSmackTalk: function(e){
        e.preventDefault();
        var $tar = $(e.target),
            $this = $(this),
            isModule = this.$el.closest('.module.smackTalk').length === 1,
            self = this,
            commentId = $tar.parent().parent().parent().data('commentId');

        $tar.removeClass('clickedHide');

        if(!$tar.data('qtip')){
            this.addConfirmTip(
                $tar,
                this.$el.find('.hideSmackTalkQTip').eq(0).clone(true),
                commentId
            );
        }

        $tar.addClass('clickedHide');
    },


    //add confirm tooltip
    addConfirmTip: function($trig, cont, commentId) {
        var that = this;

        // if a comment was removed, add the commentId to the qTip element so we can use it later
        if (commentId) {
            cont.data('commentId', commentId);
        }

        //attach qtip and show
        $trig.qtip({
            content:{
                text: cont
            },
            position:{
                my: 'bottom left',
                at: 'top left',
                container: this.$el.closest('.module').length ? this.$el.closest('.module') : this.$el,
                viewport: $('body'),
                adjust: {method:'shift none'}
            },
            show:{
                event:'click',
                ready:true
            },
            hide:{
                event:'unfocus',
                fixed:true,
                delay:200
            },
            events:{
                show:function() {
                    if( that.$el.closest('.module').length ) {
                        that.$el.closest('.module').css('overflow','visible');
                        $(this).data('modelView', that);
                    }
                },
                hide:function(e) {
                    if( that.$el.closest('.module').length ) {
                        that.$el.closest('.module').css('overflow','');
                    }
                }
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    },

    doHide:function(e){
        // get the commentId if a comment was removed
        var commentId = $('.hideSmackTalkQTip:visible').data('commentId');

        // remove the commentId data so it does not interfere with future hide/remove requests
        $('.hideSmackTalkQTip:visible').removeData('commentId');

        e&&e.preventDefault();
        this.hideHideConfirmTip(); //pass commentId through if comment was hidden
        this.model.saveHide(commentId);
    },

    hideHideConfirmTip: function(e){
        e&&e.preventDefault();
        var $lnk = this.$el.find('.hideSmackTalkLnk');
        $lnk.qtip('hide');
    },

    updateHidden: function(commentId){
        var thisView = this,
            $lnk = this.$el.find('.hideSmackTalkLnk'),
            $txt = this.$el.find('.smackTalkHiddenLinkText'),
            $this = $(this),
            isHide = this.model.get('isHidden'),
            isMyMatch = this.model.get('isMyMatch'),
            isMine = this.model.get('comments').isMine = true,
            isHideEl = isHide&&!this.isKeepElementOnHide,
            isShowEl = !isHide&&!this.isKeepElementOnHide,
            isHideMode = isHide,
            isShowMode = !isHide;

        if(isShowMode) {
            $lnk.show();
            $txt.hide();
        }

        if(isHideEl) {
            $lnk.data('qtip')&&$lnk.qtip('hide');

            if($('.smack-talk-props a').hasClass('clickedHide')){
                this.$el.find('.smack-talk-props .hideSmackTalkLnk').hide();
                this.$el.find('.smack-talk-props .smackTalkHiddenLinkText').show();

                this.$el.slideUp();

                $('.smack-talk-props a').removeClass('clickedHide');
            }

            else if($('.hide-comment a').hasClass('clickedHide')){
                // this.$el.find('.comment .hideSmackTalkLnk').hide();
                // this.$el.find('.comment .smackTalkHiddenLinkText').show();

                // removed based on comment ID instead of using .clickedHide because multiple
                // elements can end up with clickedHide added
                this.$el.find("[data-comment-id='" + commentId + "']").slideUp(function(){
                    thisView.$el.find("[data-comment-id='" + commentId + "']").remove();
                });

                $('.hide-comment a').removeClass('clickedHide');
            }
        }

        if(isShowEl) {
            this.$el.slideDown();
        }
    },

    //detect if we are in a page view
    isPageView:function(){
        return $('#smackTalkPageView').length>0;
    },

    //helper, filter non-numeric keydown
    filterNonNumericKeydown: function(event){

        //http://stackoverflow.com/questions/995183/how-to-allow-only-numeric-0-9-in-html-inputbox-using-jquery
        // Allow: backspace, delete, tab, escape, and enter
        if ( event.keyCode == 46 || event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 27 || event.keyCode == 13 ||
             // Allow: Ctrl+A
            (event.keyCode == 65 && event.ctrlKey === true) ||
             // Allow: home, end, left, right
            (event.keyCode >= 35 && event.keyCode <= 39)) {
                 // let it happen, don't do anything
                 return ;
        }
        else {
            // Ensure that it is a number and stop the keypress
            if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
                event.preventDefault();
            }
        }

    }
});
