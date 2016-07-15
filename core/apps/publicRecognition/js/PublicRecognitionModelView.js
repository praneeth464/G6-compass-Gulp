/*jslint browser :  true, nomen :  true, devel :  false, unparam :  true*/
/*global
$,
_,
G5,
TemplateManager,
Backbone,
PublicRecognitionModelView:true
*/

//Public Recognition MODEL VIEW

// MODES
// 1) compact style (module and pub rec page)
// 2) details style (detail page - shows ecard etc.)
PublicRecognitionModelView = Backbone.View.extend({

    tag  :  "div",

    className : "publicRecognitionItem public-recognition-item",

    initialize : function(opts) {
        this.tplName = opts.tplName || "publicRecognitionItem";
        this.commentTplName = opts.commentTplName || "publicRecognitionComment";
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'publicRecognition/tpl/';

        //are we hiding all but the first comment?
        this.isHideComments = opts.isHideComments || false;

        this.isKeepElementOnHide = opts.isKeepElementOnHide || false;

        //is the text being translated?
        this.translatedText = opts.translatedText || false;

        //when model has a comment added
        this.model.on('commentAdded', function(comment) {
            this.addCommentToDom(comment);
        }, this);

        //when model is liked
        this.model.on('liked', function(numLikes) {this.changeDomToLiked(numLikes); }, this);

        //when model is hidden
        this.model.on('hidden',function(commentId){this.updateHidden(commentId);},this);

        this.model.on('translated', function(commentId){this.updateTranslatedText(commentId);},this);

        //when model has data loaded, render
        this.model.on('dataLoaded', function() { this.render(); }, this);

        this.model.on('activeBudgetRemainingChanged', this.updateBudgetRemaining, this);
    },

    render: function() {
        var that = this,
            comments = this.model.get('comments'),
            $comCont;

        //did we already render?
        if (this.rendered) {
            return this;
        }

        //RECOGNITION :  render
        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            var myModel = that.model.toJSON();

            //extra variables added for the template
            myModel = _.extend({}, myModel, {
                isMine :  myModel.isMine || myModel.recognitionSetNameId === 'mine',
                isHideComments :  that.isHideComments,
                recipientsShown :  _.first(myModel.recipients, 10),
                recipientIdsHidden :  _.pluck(_.rest(myModel.recipients, 10), 'id'),
                recognizerShown :  _.first(myModel.recognizer, 10),
                isPromoTypeNomination :  myModel.promotionType === 'nomination', // nomination
                isPromoTypePurl :  myModel.promotionType === 'purl', // purl
                isPromoTypeRecognition :  !myModel.promotionType || myModel.promotionType === 'recognition' // recognition/normal
            });
            /*
                PROMO TYPES (set above) :
                Nomination -- single recipient assumed
                Purl -- single recipient and purlUrl assumed, NO comments expected
                Recognition -- default mode, multiple recipients allowed
            */


            // each public recognition item has special CM keys containing the full translated string for the various permutations of the "X received an award" text
            // the keys' output will have {0} and {1} placeholders where the recipient name(s) and sender/promotion are inserted
            // this allows the translations to have plain text and the recipient/sender/promotion in any order
            // we embed this CM output as a tplVariables in our publicRecognitionItem Handlebars template
            // we also have an subTpls embedded in our publicRecognitionItem Handlebars template
            // we pass the various values from the JSON to the subTpls, then replace the {0} and {1} with the rendered output
            // the final string is assigned to recognizedFormatted in the JSON to be passed to the main template
            var cmReplace;

            if( myModel.isPromoTypeRecognition ) {
                cmReplace = {
                    cm: myModel.recipients.length > 1 ? vars.multipleRecipRecog : vars.singleRecipRecog,
                    subs: [
                        myModel.recipients.length > 1 ? subTpls.multipleRecip(myModel) : subTpls.singleRecip(myModel),
                        subTpls.recognizer(myModel)
                    ]
                };
            }
            else if( myModel.isPromoTypeNomination ) {
                cmReplace = {
                    cm: myModel.recipients.length > 1 ? vars.multipleRecipNom : vars.singleRecipNom,
                    subs: [
                        myModel.recipients.length > 1 ? subTpls.multipleRecip(myModel) : subTpls.singleRecip(myModel),
                        myModel.promotionName
                    ]
                };
            }
            else if( myModel.isPromoTypePurl ) {
                cmReplace = {
                    cm: vars.purlRecip,
                    subs: [
                        subTpls.singleRecip(myModel),
                        myModel.promotionName
                    ]
                };
            }
            myModel.recognizedFormatted = G5.util.cmReplace(cmReplace);


            // adjust the number of likers if this user likes this
            if (myModel.isLiked) { myModel.numLikers -= 1; }

            //append the recognition template
            that.$el.append(tpl(myModel));

            // hide hidden recipients
            that.initRecipientsList();

            that.initLikeInfo();

            that.$el.find('input,textarea').placeholder();

            //that.$el.find('.comment-input').elastic();

            //get the comment container element
            $comCont = that.$el.find('.pubRecComments');

            //BUDGETS :  render budgets
            that.renderBudgets();

            //VIDEO JS
            that.initVideoJs();

            //COMMENTS :  render this recognition's comments
            TemplateManager.get(that.commentTplName, function(tpl) {

                _.each(comments, function(com) {
                    //attach the comment template to the DOM
                    $comCont.append(tpl(com));
                });

                //if comments hidden, show first, else show all
                if (that.isHideComments) {
                    $comCont.find('.pubRecCommentsComment').last().css('display', '');
                } else {
                    $comCont.find('.pubRecCommentsComment').show();
                }

                that.rendered = true;

                // call after render (might not be attached to DOM yet)
                that.initReadMore();


            }, that.tplUrl);//COMMENTS :  end tpl get

        }, this.tplUrl);//RECOGNITION :  end tpl get

        //hide spinner on detail page after template is loaded.
        G5.util.hideSpin(this.$el.parents('.publicRecognition'));
        return this;//chaining
    },

    renderBudgets :  function() {
        var that = this,
            $bs = this.$el.find('select.budgetSelect'),
            budgs = that.model.get('budgets');

        _.each(budgs, function(b) {
            $bs.append(that.make('option', {value :  b.id}, b.name));
        });

        if (!budgs || budgs.length === 0) {
            // hide it -- no budget
            $bs.closest('.budgetSelectWrapper').hide();
            this.$el.find('.budgetInfo').hide();// no budget -- hide budg info
        } else if (budgs.length === 1) {
            // select first & hide
            $bs.val(budgs[0].id).change();
            $bs.closest('.budgetSelectWrapper').hide();
        } else {
            // let user select a budget
            this.$el.find('.budgetInfo').hide();// no selection -- hide budg info
        }
    },

    initRecipientsList : function() {
        var recipientsToShow = 10,
            $container = this.$el.find('.recipientsContainer'),
            $showHidden = this.$el.find('.showHiddenWrap'),
            $hiddenRecipients = this.$el.find('.hiddenRecipients');

        if( recipientsToShow < this.model.get('recipients').length ) {
            $hiddenRecipients.hide();
            $container.find('.recipientWrap:gt('+(recipientsToShow-1)+')').appendTo( $container.find('.hiddenRecipients') );
        }
        else {
            $showHidden.hide();
        }
    },

    initLikeInfo :  function() {
        var that = this,
            $sen = this.$el.find('.likeSentence'),
            lo = '<a class="profile-popover" href="#" data-recognition-id="'
                + this.model.get('id') + '" data-participant-info-type="likers" >',
            lc = '</a>',
            no = '<span class="likeCount">',
            nc = '</span>',
            numLikers = that.model.get('numLikers');

        numLikers = this.model.get('isLiked') ? numLikers - 1 : numLikers;

        //fill in sentence markup
        $sen.each(function() {
            var $t = $(this), num;
            // number of likers
            $t.html($t.html().replace('{0}', numLikers));
            num = $t.html().match(/\d+/); // find the number
            num = num && num.length ? num[0] : null; // pull from array
            if (num) { // if we have a number
                $t.html($t.html().replace(num, no + num + nc));
            }
            $t.html($t.html().replace('{link}', lo));
            $t.html($t.html().replace('{/link}', lc));
        });

        this.updateLikeInfo();

    },
    updateLikeInfo :  function() {
        var m = this.model.toJSON(),
            $likeInfo = this.$el.find('.likeInfoWrapper'),
            $sen = $likeInfo.find('.likeSentence'),
            toShowClass;

        // start with all hidden
        $sen.hide();

        // find which one to show
        if (m.isLiked) { //YOU LIKE
            if (m.numLikers === 1) {toShowClass = 'youOnly'; } // only you
            if (m.numLikers === 2) {toShowClass = 'youAndOne'; } // you and one
            if (m.numLikers > 2) {toShowClass = 'youAndMult'; } // you and mult
        } else { //YOU DON'T LIKE
            if (m.numLikers === 1) {toShowClass = 'oneOtherOnly'; } // one other
            if (m.numLikers > 1) {toShowClass = 'multOtherOnly'; } // mult others
        }

        if (toShowClass) {
            $sen.filter('.' + toShowClass).show();
        }
    },

    // this must be called after render AND attachment to account
    // for inconsistent data-load+render VS DOM attachment
    initReadMore :  function() {
        var $rm = this.$el.find('.readMore'),
            newHeight;

        // must be attached, and rendered
        if (!this.$el.closest('body') || !this.rendered) { return; }
        $rm.each(function() {
            var $t = $(this),
                numLines = $t.data('readMoreNumLines') || 2,
                rmTxt = $t.data('msgReadMore') || 'more';

            newHeight = numLines * parseInt($t.css('line-height'), 10);
            // only give read more option when necessary
            if ($t.height() > newHeight) {
                $t.css('height', newHeight).addClass('moreToRead');
                if (!$t.find('.readMoreTrigger').length) {
                    $t.append($('<a class="readMoreTrigger" />').html('&hellip;'+rmTxt));
                }
            }

        });
    },
    doReadMore :  function(e) {
        var $tar = $(e.target),
            $rm = $tar.closest('.readMore');
        e.preventDefault();
        $rm.css('height','').removeClass('moreToRead').data('_readMoreClicked',true);

        // ie8 JQ1.8 event.target.remove() fix (defer remove() call)
        setTimeout(function() {
            $tar.remove();
        },0);
    },
    initVideoJs: function() {
        var idOfVideoElement = 'recognitionVideo';
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
    //EVENTS
    events : {
        "click .viewAllCommentsBtn" : "doShowComments",
        "click .profile-popover" : "attachParticipantPopover",
        "click .showHidden" : "doShowAllRecipients",
        "click .flag" : "attachFlagPopover",
        "click .readMoreTrigger" : "doReadMore",
        //comment form
        "click .showCommentFormBtn" : "showCommentInput",
        "keydown .commentInputTxt" : "doCommentKeydown",
        //add points form
        "click .showAddPointsFormBtn" : "showAddPointsForm",
        "focus .pointsInputTxt" : "attachPointsInputPO",
        "keydown .pointsInputTxt" : "doPointsKeydown",//for enter intercept
        "keyup .pointsInputTxt" : "doPointsKeyup", //for filter and update budget
        "keydown .addPointsCommentInputTxt" : "doAddPointsCommentKeydown",//intercept for apropo
        "hover .budgetPopoverTrigger" : "showBudgetPopover",
        "click .budgetPopoverTrigger" : "showBudgetPopover", //Implements prevent default as expected on click of the budget popover.
        "click .addPointsBtn" : "submitAddPointsForm",
        "change .budgetSelect" : "doBudgetSelectChange",
        //translate text
        "click .translatePubRec" : "doTranslate",

        //area.maxlength shim for opera and ie
        "keyup textarea" : "enforceMaxLength",
        "blur textarea" : "enforceMaxLength",
        "mouseup textarea" : "enforceMaxLength",

        "click .likePubRecBtn" : "doLike",

        "click .sharePubRecBtn" :  function(e) {
            $(e.target).sharePopover({}, this.model.get('shareLinks'));
            e.preventDefault(); },

        //detail view stuff
        "click .hidePublicRecognitionLnk" :  "hidePublicRecognition",
        "click .publicRecognitionHideRecognitionConfirm" :  "doHide",
        "click .publicRecognitionHideRecognitionCancel" :  "hideHideConfirmTip",
        "click .deletePublicRecognitionLnk" :  "deletePublicRecognition",
        "click .publicRecognitionDeleteRecognitionConfirm" :  "doDelete",
        "click .publicRecognitionDeleteRecognitionCancel" :  "hideDeleteConfirmTip",
        "click .printBtn" :  function(e) {window.print();e.preventDefault(); }
    },

    enforceMaxLength :  function(e) {
        var $tar = $(e.target),
            ml = $tar.attr('maxlength');
        // only for IE and textareas with maxlength attrs
        if (!$.browser.msie || !ml) {return; }

        if ($tar.val().length > ml) {
            $tar.val( $tar.val().slice(0,ml));
        }
    },

    doShowComments : function(e) {
        var $tar = $(e.currentTarget),
            $comCont = this.$el.find('.pubRecComments'),
            i=0;

        $comCont.find('.pubRecCommentsComment').each(function() {
            var $cmt = $(this);
            //delayed fade in effect
            setTimeout(function() {$cmt.fadeIn(); },i*100);
            i++;
        });

        //hide the view all link now that everything is visible
        $tar.closest('.viewAllCommentsWrapper').hide();

        e.preventDefault();
    },

    doShowAllRecipients : function(e) {
        e.preventDefault();

        var $showHidden = $(e.target).closest('.showHiddenWrap'),
            $hiddenRecipients = this.$el.find('.hiddenRecipients');

        $hiddenRecipients.slideDown(G5.props.ANIMATION_DURATION);
        $showHidden.slideUp(G5.props.ANIMATION_DURATION);
    },

    doCommentKeydown : function(e) {
        var $inp,
            that=this,
            $cmtForm = this.$el.find('.publicRecognitionCommentForm'),
            jsonUrl = $cmtForm.attr('action'),
            params = {};

        //put the form elements in an object
        _.each($cmtForm.serializeArray(), function(input) {
            params[input.name] = input.value;
        });

        if (e.which === 13) {
            e.preventDefault();

            $inp = $(e.target);
            // clear whitespace
            $inp.val( $inp.val().replace(/^\s+$/,''));
            // enforce maxlength for ie
            this.enforceMaxLength(e);

            if ($inp.val().length > 0) {
                //start a spinner for waiting
                $inp.parent().spin();

                this.model.saveComment(params,$inp.val(),jsonUrl, function(cmt) {
                    //reset value, stop spinner
                    $inp.val('').parent().spin(false);

                    //comment is added to DOM when view hears the successful "commentAdd" event
                }); // saveComment
            } // if it's not empty

        } // if keydown is enter

    }, // doCommentKeydown

    addCommentToDom : function(comment) {
        var that = this,
            $cmtCount = this.$el.find('.commentCount');

        //update comment count
        $cmtCount.text(this.model.get('comments').length);

        TemplateManager.get(this.commentTplName, function(tpl) {
            var $cmt = $(tpl(comment)),
                $cc = $cmt.closest('.pubRecCommentsComment'),
                origBg,dkBg;

            //attach the comment template to the DOM
            that.$el.find('.pubRecComments').append($cmt);

            //get the bg colors from css
            origBg = $cc.css('background-color');
            dkBg = $cc.addClass('darken').css('background-color');
            $cc.removeClass('darken');

            //effects to show user where new comment is
            $cc.css('background',dkBg).show()
                .animate({backgroundColor : origBg},1000);

            //scroll to new message
            //targeting inner elements that's not a display : table
            //or if page then just call $.scrollTo()
            (that.isPageView() ? $  :  $cmt.closest('.pubRecItemsCont'))
                .scrollTo($cmt.find('.app-col').get(0),400);


        },that.tplUrl);
    },


    attachParticipantPopover : function(e) {
        var $tar = $(e.target),
            isSheet = ($tar.closest(".modal-stack").length > 0) ? {isSheet :  true}  :  {isSheet :  false};
        if ($tar.is("img")) {
            $tar = $tar.closest("a");
        }

        //attach participant popovers
        if (!$tar.data('participantPopover')) {
            $tar.participantPopover(isSheet).qtip('show');
        }
        e.preventDefault();
    },
    //attach flag popover
    attachFlagPopover :  function(e) {
        var $tar = $(e.currentTarget),
            that = this;

        // lazy attach -- much more efficient
        if (!$tar.data('qtip')) {
            // attach country tooltip
            $tar.qtip({
                content : { text :  $tar.attr('title') },
                position : {
                    my :  'bottom center',
                    at :  'top center',
                    container :  that.$el
                },
                show : { event : 'click', ready : true },
                hide : {
                    event : 'unfocus',
                    fixed : true,
                    delay : 200
                },
                style : { classes : 'ui-tooltip-shadow ui-tooltip-light' }
            });
        }
    },

    showCommentInput : function(e) {
        var that = this;
        e.preventDefault();

        this.$el.find('.addPointsWrapper').slideUp();

        //slide down the input
        this.$el.find('.commentInputWrapper').slideDown(
            function() {
                var $this = $(this); // .commentInputWrapper
                var $container = that.isPageView() ? $(window)  :  $this.closest('.pubRecItemsCont');

                //scroll to the input and focus
                // (that.isPageView() ? $  :  $this.closest('.pubRecItemsCont'))
                //     .scrollTo($this, function() {
                //         $this.find('.commentInputTxt').focus()});

                // elastic plugin lazy attach
                if (!that.comInpElasticAttached) { // plugin is too stupid to keep track
                    that.$el.find('.comment-input').elastic();
                    that.comInpElasticAttached = true;
                }

                // scroll to the input and focus
                $container.scrollTo(
                    $this,
                    {
                        offset :  -($container.outerHeight() - $this.outerHeight() - 8),
                        duration :  500,
                        onAfter :  function() {
                            $this.find('.commentInputTxt').focus();
                        }
                    }
                );

            }
        );
    },

    doLike : function(e) {
        var $tar = $(e.target).closest('a');

        // check to see if the link is spinning (a like has already been submitted)
        if( $tar.find('.spin').length ) {
            return false;
        }

        G5.util.showSpin($tar);

        $tar.toggleClass('liked');

        if($tar.hasClass('liked')){
            this.model.saveLike();
        } else{
            this.model.saveUnlike();
        }
        e.preventDefault();
    },

    changeDomToLiked : function(numLikes) {
        var $likeBtn = this.$el.find('.likePubRecBtn'),
            m = this.model.toJSON();

        if (m.isLiked){
            $likeBtn.html($likeBtn.data('unlike'));
        } else {
            $likeBtn.html($likeBtn.data('like'));
        }
        //$likeBtn.replaceWith($likeBtn.data('msgLiked') || 'Liked'); Removed for 5.4 - switching to unlike button
        //console.log(numLikes, this.$el.find('.likeCount'));
        //if (numLikes) this.$el.find('.likeCount').text(numLikes);
        this.updateLikeInfo();
    },


    //POINTS
    showAddPointsForm : function(e) {
        var that = this;
        e.preventDefault();

        this.updateBudgetInfo();

        this.$el.find('.commentInputWrapper').slideUp();

        // make sure the add points form is visible and the success message is hidden
        this.$el.find('.addPointsWrapper .publicRecognitionAddPointsForm').show();
        this.$el.find('.addPointsWrapper .msgAddPointsSuccess').hide();

        //slide down the input
        this.$el.find('.addPointsWrapper').slideDown(
            G5.props.ANIMATION_DURATION,
            function() {
                var $this = $(this);

                //scroll to the input and focus
                (that.isPageView() ? $  :  $this.closest('.pubRecItemsCont'))
                    .scrollTo($this,{
                        duration :  G5.props.ANIMATION_DURATION,
                        offset :  {top : -40,left : 0}, // give some room on top
                        onAfter :  function() {
                            var $s = $this.find('.budgetSelect:visible'),
                                $pit = $this.find('.pointsInputTxt'),
                                $cmt = $this.find('.addPointsCommentInputTxt');
                            if ($s.length) { $s.focus(); }
                            else {
                                if ( $pit.attr('readonly')) { $cmt.focus(); }
                                else { $pit.focus(); }
                            }
                        }
                    });
            }
        );
    },
    doPointsKeyup :  function(e) {
        var $tar = $(e.target);
        //$tar.val($tar.val().replace(/[^0-9]/g,''));
        this.updateBudgetInfo();
    },
    doBudgetSelectChange :  function(e) {
        var $tar = $(e.target),
            $budg = this.$el.find('.budgetRemaining');

        this.$el.find('.budgetInfo')[$tar.val()==-1?'hide' : 'show']();

        this.model.setActiveBudget($tar.val());
        this.updateBudgetInfo();
    },
    doPointsKeydown :  function(e) {
        var $cmtInp = this.$el.find('.addPointsCommentInputTxt');

        //filter non-numerics
        this.filterNonNumericKeydown(e);

        //if enter press, focus on comment field
        if (e.which === 13) {

            //kill enter event, otherwise a newline appears in comment
            //or it tries to do normal form submit
            e.preventDefault();

            //no comments? go to comments
            if ($cmtInp.val().length === 0) {
                this.$el.find('.addPointsCommentInputTxt').focus();
            }
            //i guess we can submit
            else {
                //this.submitAddPointsForm();
                this.$el.find('.addPointsBtn').focus().click();
            }
        }
    },
    doAddPointsCommentKeydown :  function(e) {
        if (e.which === 13) {
            e.preventDefault();

            // enforce maxlength for ie
            this.enforceMaxLength(e);

            //this.submitAddPointsForm();
            this.$el.find('.addPointsBtn').focus().click();
        }
    },
    showBudgetPopover :  function(e) {
        var that = this,
            $trig = that.$el.find('.budgetPopoverTrigger');

        if (!$trig.data('qtip')) {
            //point budget tooltip
            $trig.qtip({
                content :  that.$el.find('.budgetPopover'),
                position : {my :  'bottom center',at :  'top center'},
                show : {event : 'mouseenter'},
                hide : {event : 'mouseleave',delay : 300},
                style : {classes : 'ui-tooltip-shadow ui-tooltip-light'}
            }).qtip('show');
        }
        e.preventDefault();
    },
    updateBudgetInfo :  function() {
        var $budgPOTrig = this.$el.find('.budgetPopoverTrigger'),
            //find the popover element, it might not yet be attached to trigger
            $budgPO = $budgPOTrig.data('qtip')?
                $budgPOTrig.data('qtip').elements.tooltip  :  this.$el.find('.budgetPopover'),
            $POavail = $budgPO.find('.budgetAvailable'),
            $POded = $budgPO.find('.budgetDeduction'),
            $POrem = $budgPO.find('.budgetRemaining'),
            $pts = this.$el.find('.pointsInputTxt'),
            $budg = this.$el.find('.budgetRemaining'),
            p = parseInt($pts.val(),10), //points
            bObj = this.model.getActiveBudget(), //budget obj
            b = parseInt(bObj?bObj.remaining : 0,10), //budget
            r = parseFloat(this.model.get('countryRatio')), //ratio
            calcDed = Math.floor(p*r),
            rem = Math.floor(b-(p*r)); //new remaining budget
        //if NaN, then nothing in input field
        rem = _.isNaN(rem)?b : rem;
        calcDed = _.isNaN(calcDed)?0 : calcDed;

        $POavail.animateNumber(b,500,{addCommas : false});
        $POded.animateNumber(calcDed,500,{addCommas : false});
        $POrem.animateNumber(rem,500,{addCommas : false});
        $budg.animateNumber(rem,500,{addCommas : false});
    },
    submitAddPointsForm :  function(e) {
        if (e) { e.preventDefault(); }
        var $form = this.$el.find('.publicRecognitionAddPointsForm'),
            $btn = this.$el.find('.addPointsBtn'),
            $pts = this.$el.find('.pointsInputTxt'),
            $cmt = this.$el.find('.addPointsCommentInputTxt'),
            min = this.model.get('awardAmountMin'),
            max = this.model.get('awardAmountMax'),
            budg = this.model.getActiveBudget(),
            p = parseInt($pts.val(),10), //points
            b = parseInt(budg?budg.remaining : 0,10), //budget
            r = parseFloat(this.model.get('countryRatio')), //ratio
            calcDed = Math.floor(p*r),
            rem = Math.floor(b-(p*r)), //remaining budget
            hasBudg = this.model.get('budgets')&&
                this.model.get('budgets').length>0, //do we have a budget?

            that = this;
        //console.log(p,b,r,calcDed,rem,hasBudg,budg,$btn.data());
        //console.log('hasBudg',hasBudg);

        $cmt.val( $cmt.val().replace(/^\s+$/,''));

        //ERROR CASES
        // if has budgets, but none selected
        if (hasBudg && !budg) {this.showSubmitPointsError($btn.data('msgErrNoBudgSel')); }
        else if (_.isNaN(p) || p === 0) {this.showSubmitPointsError($btn.data('msgErrNoPoints')); }
        else if ($cmt.val().length<2) {this.showSubmitPointsError($btn.data('msgErrNoComment')); }
        else if (p<min || p>max) {this.showSubmitPointsError($btn.data('msgErrOutOfRange')); }
        // if has budget and hard cap
        else if (rem < 0 && hasBudg && !budg.isSoftCap) {this.showSubmitPointsError($btn.data('msgErrOverBudget')); }

        //success case
        else {//OK - submit!
            //Save Budget ID that was sent to server
            var selectedBudgetId = $form.find("select[name='budgetId']").val();
            //Disable Submit button
            $btn.attr('disabled','disabled').spin();
            $.ajax({
                dataType :  'g5json',
                type: "POST",
                url :  $form.attr('action') || G5.props.URL_JSON_PUBLIC_RECOGNITION_ADD_POINTS,
                data :  $form.serialize(),
                success :  function(servResp) {
                    var err = servResp.getFirstError(),
                        suc = servResp.getFirstSuccess(),
                        data = servResp.data,
                        $ptsWrap = that.$el.find('.addPointsWrapper');

                    $btn.removeAttr('disabled').spin(false);

                    if (err) {
                        that.showSubmitPointsError(err.text);
                    }
                    //ok, hide add points
                    else {
                        //if comment returned from server, then add to model
                        if (data.comment) that.model.addComment(data.comment);
                        // resetting points stuff
                        $ptsWrap.find('.publicRecognitionAddPointsForm').hide();
                        $pts.val( $pts.attr('readonly') ? $pts.val() : '' );
                        $cmt.val('');
                        $ptsWrap.find('.msgAddPointsSuccess').show();
                        //get All Page Views
                       that.model.setActiveBudgetRemaining(rem);
                    }
                }
            });
        }
    },
    showSubmitPointsError :  function(msg) {
        var $btn = this.$el.find('.addPointsBtn');

        //if old qtip still visible, obliterate!
        if ($btn.data('qtip')) $btn.qtip('destroy');

        $btn.qtip({
            content :  '<i class="icon icon-warning-sign"></i> '+msg,
            position : {my : 'bottom center',at : 'top center'},
            show : {ready : true},
            hide : {event : 'mouseleave',delay : 500},
            //only show the qtip once
            events : {hide : function(evt,api) {
                $btn.qtip('destroy');
            }},
            style : {classes : 'ui-tooltip-shadow ui-tooltip-red'}
        });
    },
    attachPointsInputPO :  function(e) {
        //point input tooltip
        $(e.target).qtip({
            content : function() {
                return $(this).data('tooltip');
            },
            position : {my : 'bottom center',at : 'top center',
                    container :  this.$el.closest('.pubRecItemsCont')},
            show : {event : 'focus',ready : true},
            hide : {event : 'blur',delay : 300}
        });
    },

    //the 'hide' link
    hidePublicRecognition :  function(e) {
        e.preventDefault();
        var $tar = $(e.target),
            $this = $(this),
            isModule = this.$el.closest('.module.publicRecognition').length === 1,
            self = this,
            commentId = $tar.parents('.comment-block').data('commentId');

            $tar.removeClass('clickedHide');

            if(!$tar.data('qtip')){
                this.addConfirmTip(
                    $tar,
                    this.$el.find('.hidePublicRecognitionQTip').eq(0).clone(true),
                    commentId
                );
            }

            $tar.addClass('clickedHide');
    },

    //the 'delete' link
    deletePublicRecognition :  function(e) {
        e.preventDefault();
        var $tar = $(e.target),
            $this = $(this),
            isModule = this.$el.closest('.module.publicRecognition').length === 1,
            self = this,
            commentId = $tar.parents('.comment-block').data('commentId');

            $tar.removeClass('clickedHide');

            if(!$tar.data('qtip')){
                this.addConfirmTip(
                    $tar,
                    this.$el.find('.deletePublicRecognitionQTip').eq(0).clone(true),
                    commentId
                );
            }

            $tar.addClass('clickedHide');
    },

    //add confirm tooltip
    addConfirmTip: function($trig, cont, commentId){
        var that = this;

        // if a comment was removed, add the commentId to the qTip element so we can use it later
        if (commentId) {
            cont.data('commentId', commentId);
        }

        //attach qtip and show
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'bottom left',
                at: 'top left',
                container: this.$el.closest('.module').length ? this.$el.closest('.module') : this.$el
            },
            show : {
                event : 'click',
                ready : true
            },
            hide : {
                event : 'unfocus',
                fixed : true,
                delay : 200
            },
            events:{
                show:function() {
                    if( that.$el.closest('.module').length ) {
                        that.$el.closest('.module').css('overflow','visible');
                        $(this).data('modelView', that);
                    }
                },
                hide:function() {
                    if( that.$el.closest('.module').length ) {
                        that.$el.closest('.module').css('overflow','');
                    }
                }
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    corner: true,
                    width: 10,
                    height: 10
                }
            }
        });
    },

    doHide : function(e) {
        // get the commentId if a comment was removed
        var commentId = $('.hidePublicRecognitionQTip:visible').data('commentId');

        // remove the commentId data so it does not interfere with future hide/remove requests
        $('.hidePublicRecognitionQTip:visible').removeData('commentId');

        e&&e.preventDefault();
        this.hideHideConfirmTip();
        this.model.saveHide(commentId);
    },

    doDelete : function(e) {
        // get the commentId if a comment was removed
        var commentId = $('.deletePublicRecognitionQTip:visible').data('commentId');

        // remove the commentId data so it does not interfere with future hide/remove requests
        $('.deletePublicRecognitionQTip:visible').removeData('commentId');

        e&&e.preventDefault();
        this.hideDeleteConfirmTip();
        this.model.saveHide(commentId);
    },

    hideHideConfirmTip :  function(e) {
        e&&e.preventDefault();
        var $lnk = this.$el.find('.hidePublicRecognitionLnk');
        $lnk.qtip('hide');
    },

    hideDeleteConfirmTip :  function(e) {
        e&&e.preventDefault();
        var $lnk = this.$el.find('.deletePublicRecognitionLnk');
        $lnk.qtip('hide');
    },

    updateHidden: function(commentId) {
        var $lnk = this.$el.find('.hidePublicRecognitionLnk'),
            $txt = this.$el.find('.publicRecognitionHiddenLinkText'),
            $this = $(this),
            thisView = this,
            isHide = this.model.get('isHidden'),
            isMine = this.model.get('comments').isMine = true,
            isHideEl = isHide&&!this.isKeepElementOnHide || isHide&&commentId,
            isShowEl = !isHide&&!this.isKeepElementOnHide,
            isHideMode = isHide,
            isShowMode = !isHide;

        if (isShowMode) {
            $lnk.show();
            $txt.hide();
        }

        if (isHideEl) {
            $lnk.data('qtip')&&$lnk.qtip('hide');
            if($('.recognition-props a').hasClass('clickedHide')){
                $lnk.hide();
                $txt.show();

                this.$el.slideUp();

                $('.recognition-props a').removeClass('clickedHide');
            }

            else if($('.hide-comment a').hasClass('clickedHide')){
                this.$el.find("[data-comment-id='" + commentId + "']").slideUp(function(){
                    thisView.$el.find("[data-comment-id='" + commentId + "']").remove();
                });

                $('.hide-comment a').removeClass('clickedHide');
            }
        }
        else {
            $lnk.hide();
            $txt.show();
        }

        if (isShowEl) {
            this.$el.slideDown();
        }

    },
    doTranslate: function(e){
        var $tar = $(e.target),
            commentId = $tar.parents('.comment-block').data('commentId');

        this.model.translateData(commentId);
        $tar.replaceWith('<span class="translateLinkDisabled">'+$tar.text()+'</span>');

        e.preventDefault();
    },
    updateTranslatedText: function(commentId){
        var isTranslated = this.model.get('translatedText'),
            tText = this.model.get('newTransText'),
            $recDetail = this.$el.closest('#publicRecognitionPageView').hasClass('public-recognition-page-detail'),
            $recComment = this.$el.find('.translateLinkDisabled').parents('.comment-block').data('commentId');

        if(isTranslated){
            if($recDetail){
                if(commentId === $recComment && commentId !== undefined){
                    this.$el.find("[data-comment-id='" + commentId + "']").find('.readMore').html(tText);
                }else {
                    this.$el.find('.detail-comment').html(tText);
                }
            }else if(commentId === $recComment && commentId !== undefined){
                this.$el.find("[data-comment-id='" + commentId + "']").find('.readMore').html(tText);
            }else {
                this.$el.find('.recognition-comment').html(tText);
            }
        }
    },
    //detect if we are in a page view
    isPageView : function() {
        return $('#publicRecognitionPageView').length>0;
    },

    //helper, filter non-numeric keydown
    filterNonNumericKeydown :  function(event) {

        //http : //stackoverflow.com/questions/995183/how-to-allow-only-numeric-0-9-in-html-inputbox-using-jquery
        // Allow :  backspace, delete, tab, escape, and enter
        if ( event.keyCode == 46 || event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 27 || event.keyCode == 13 ||
             // Allow :  Ctrl+A
            (event.keyCode == 65 && event.ctrlKey === true) ||
             // Allow :  home, end, left, right
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

    },

    updateBudgetRemaining :  function() {
        this.updateBudgetInfo();
    }

});
