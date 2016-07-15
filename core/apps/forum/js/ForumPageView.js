/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
TemplateManager,
PageView,
ForumDiscussionModel,
DisplayTableAjaxView,
ForumCommentCollection,
PaginationView,
ForumPageView:true
*/
ForumPageView = PageView.extend({
    //override super-class initialize function
    events: {
        'click .previewButton'          : "updatePreview",
        'click .editButton'             : "updateForm",
        'change #selectedTopic'         : "updateSelectedTopic",
        'keyup #selectedTitle'          : "updateSelectedTitle",
        'click .submit'                 : "submitForm",
        'click .cancelButton'           : "cancelFormSubmit",
        'click .likeDiscussionButton'   : "likeItem",
        'click .removeDiscussionButton' : "likeItem",
        'click .likeCommentButton'      : "likeItem",
        'click .removeCommentButton'    : "likeItem",
        'click .checkReply'             : "checkReply",
        'click .profile-popover'        : "enableParticipant",
        'click .participant-popover'    : "enableParticipant",
        'keydown #selectedTitle'        : "validateTitle"
    },

    initialize: function(opts) {
        var self = this;
        console.log('[INFO] ForumPageView: Forum Page View initialized', this);
        //All Pages: set the appname (getTpl() method uses self)
        self.appName = "forum";

        //self is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

        //inherit ajax url for  Title Check
        self.checkTitleUrl = G5.props.URL_JSON_FORUM_CHECK_TITLE;

        //Discussion: create collection
        self.forumCommentCollection = new ForumCommentCollection({'json' : opts.discussionJson, 'jsonUrl': opts.discussionJsonUrl, 'view': self});

        //create model
        self.forumDiscussionModel = new ForumDiscussionModel({
            forumPageView : this
        });

        //When model is updated, run the update functon
        self.on("modelReady", function() {
            self.updateDiscussion();
        });
        self.forumDiscussionModel.on("discussionChanged", function() {
            self.updateDiscussion();
        });

        //render pagination once
        self.on('discussionUpdated',  function() {
            self.renderPagination();
            self.off("discussionUpdated");
        });

        self.on("commentUpdated", function() {
            self.renderComments(self.forumDiscussionModel.get("comments"));
        });

        self.on("commentsRendered", function() {
            //If server sent a comment to select, select comment by anchor.
            if (self.forumDiscussionModel.get('showLatest') === true) {
                $.scrollTo(self.$el.find(".discussionComment:last"), G5.props.ANIMATION_DURATION, {axis : 'y', offset:{top:-24,left:0}});
                self.forumDiscussionModel.set('showLatest', false);
            }
        });

        //All Pages: Check for server side errors
        self.checkForServerErrors();
        self.checkUrl();

        // initialize any rich text editors
        self.$el.find('.richtext').htmlarea(G5.props.richTextEditor);

        //Create Discussion: Update View on server response
        self.on('titleChecked', function(opts) {
            self.initializePreview(opts);
        });

        //Topics, Discussions, Create Discussion: If model does not have discussionJson, model in on a topics or discussions view, and should render a displayTable.
        if (!opts.discussionJson && !opts.discussionJsonUrl && !G5.props.URL_JSON_FORUM_CHECK_TITLE) {
            console.log('no opts', opts);
            self.renderDisplayTable();
            self.render();
        }
    },

    //Create Discussion: render preview of Discussion, Owners explicitly asked to have the view based preview destroyed. They prefered just the text.
    initializePreview: function(isTitleUnique) {
        var self = this;

        if (isTitleUnique === true) {
            //console.log('[Info] Valid Message');
            self.$el.find('.preview .topicPreview').text($('#selectedTopic option:selected').text());
            self.$el.find('.preview .titlePreview').text($('#selectedTitle').val());
            self.$el.find('.preview .textPreview').html($('#selectedText').val());
            self.toggleInterface('updatePreview');

            //hide/show form
            self.$el.find('.form').hide();

            //Push values to template
            TemplateManager.get('createDiscussion', function(tpl, vars, subTpls) {
                self.forumDiscussionModel.setPreviewData();
                self.$el.find('.createDiscussion').empty().append(tpl(self.forumDiscussionModel.toJSON()));
                self.paginationTpl = subTpls.paginationTpl;
            });

            //show/hide preview element
            self.$el.find('.preview').show();
            self.$el.find('#newDiscussionForm').hide();
        }
        else {
            //console.log('[Info] Enter Unique Title');
            this.checkForServerErrors();
        }
    },

    //Discussion:
    renderPagination: function() {
        var self = this,
            totalNumberOfReplies = self.forumDiscussionModel.get('totalNumberOfReplies'),
            repliesPerPage = self.forumDiscussionModel.get('repliesPerPage'),
            page = self.forumDiscussionModel.get('page'),
            $paginationControls = this.$el.find('.paginationControls'),
            $commentWrapper = this.$el.find('.discussionCommentsWrapper');

        // if our data is paginated, add a special pagination view
        if (totalNumberOfReplies > repliesPerPage) {
            // if no pagination view exists, create a new one
            if (!self.tabularPagination) {
                self.tabularPagination = new PaginationView({
                    el : $paginationControls,
                    // pages: 20,
                    // current: 4,
                    pages : Math.ceil(totalNumberOfReplies / repliesPerPage),
                    current : page,
                    ajax : true,
                    tpl : self.paginationTpl || false
                });

                self.tabularPagination.on('goToPage', function(page) {
                    G5.util.showSpin($commentWrapper.closest('.row'), {cover:true});
                    $.scrollTo($paginationControls.first(), G5.props.ANIMATION_DURATION, {axis : 'y'});
                    self.forumDiscussionModel.loadMoreComments(page);
                });

                self.on('modelReady', function() {
                    console.log('renderPagination discussionUpdated fired| Pages: ', Math.ceil(self.forumDiscussionModel.get('totalNumberOfReplies') / self.forumDiscussionModel.get('repliesPerPage')),  " current Page: ",  self.forumDiscussionModel.get('page'));
                    self.tabularPagination.setProperties({
                        rendered : true,
                        pages : Math.ceil(self.forumDiscussionModel.get('totalNumberOfReplies') / self.forumDiscussionModel.get('repliesPerPage')),
                        current : self.forumDiscussionModel.get('page')
                    });
                    $.scrollTo($paginationControls.first(), G5.props.ANIMATION_DURATION, {axis : 'y'});
                    G5.util.hideSpin($commentWrapper.closest('.row'));
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                self.tabularPagination.setElement(self.$el.find('.paginationControls'));
            }
        }
    },

    //All Pages:
    enableParticipant: function(e) {
        var self = this;
        console.log("INSIDE ENABLE");
        //stop default, bind popOver, click element once it is bound.
        e.preventDefault();
        //Enable participantPopover for selected User
        $(e.target).participantPopover();
        console.log('[Info] participantPopover enabled for: ', e.target);
        //Continue selection of element after participantPopover is enabled.
        self.callParticipant(e.target);
    },

    //All Pages:
    callParticipant: function(el) {
        //trigger click on element target
        $(el).trigger('click');
    },

    checkUrl: function() {
        var self = this,
            //get params passed on page load.
            params = self.getUrlVars(),
            //If we have a selected topic, select topic.
            topic = params.topicId,
            name = params.topicName;

        if (topic !== undefined) {
            self.$el.find('#selectedTopic').val(topic);
        }
    },

    getUrlVars: function() {
        var vars = {}, tempVars;

        tempVars = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
            vars[key] = value;
        });
        //console.log("vars ", tempVars);
        return vars;
    },

    updateDiscussion: function() {
        var self = this,
            //Find and clear discussion
            $forumDiscussionItem = self.$el.find('.forumDiscussionItem').html(''),
            //Find Comment Navigation
            $forumCommentNavigation = self.$el.find('.forumCommentNavigation').html('');

        $forumDiscussionItem.find(".likes").html("");
        //Push Discussion values to template
        TemplateManager.get('forumDiscussionItem', function(tpl, vars, subTpls) {
            self.subTpls = subTpls;
            $forumDiscussionItem.append(tpl(self.forumDiscussionModel.toJSON()));
            console.log('[Info] comments loaded: ', self.forumDiscussionModel.get("comments"));
        });

        //Find and clear commentStats
        //$forumCommentNavigation.find('.commentStats').html('');
        //Push CommentNavigation values to template
        TemplateManager.get('forumCommentNavigation', function(tpl, vars, subTpls) {
            self.subTpls = subTpls;
            $forumCommentNavigation.append(tpl(self.forumDiscussionModel.toJSON()));
            console.log('[Info] comments loaded: ', self.forumDiscussionModel.get("comments"));
        });

        self.renderPagination();
        self.renderComments(self.forumDiscussionModel.get("comments"));

        if (self.forumDiscussionModel.get("totalNumberOfReplies") <= 1) {
            self.$el.find(".commentStats").hide();
        }
        else {
            self.$el.find(".commentStats").show();
        }

        self.trigger("discussionUpdated");
    },

    updateComment: function(comment) {
        //update individual comment
        var self = this,
            tplName = 'forumCommentItem',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'forum/tpl/';

        TemplateManager.get(tplName, function(tpl) {
            self.$el.find('li.mediaComment[data-id=' + comment.id + ']').replaceWith(tpl(comment));
        }, tplUrl);
    },

    renderDisplayTable: function() {
        console.log('rendering Display table');
        var self = this,
            $discussions = self.$el.find('.displayTableDiscussions'),
            $topics = self.$el.find('.displayTableTopics'),
            targetElement = (($discussions && $discussions.length > 0) ? $discussions : $topics),
            targetUrl = (($discussions && $discussions.length > 0) ? G5.props.URL_HTML_DISCUSSIONS : G5.props.URL_HTML_TOPICS);

        //Discussions Page Display Table
        window.dispTableView = new DisplayTableAjaxView({
            el: targetElement,
            url: targetUrl
        });
    },

    renderComments: function(comments) {
        var self = this,
            tplName = 'forumCommentItem',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'forum/tpl/',
            //Set wrapper, and clear previous values.
            $commentWrapper = this.$el.find('.forumCommentItem ul').html('');

        G5.util.showSpin(this.$el, {cover:true});
        TemplateManager.get(tplName, function(tpl) {
            _.each(comments, function(c) {
                $commentWrapper.append(tpl(c));
            });
            self.trigger('commentsRendered');
            G5.util.hideSpin(self.$el);
        }, tplUrl);
    },

    validateTitle: function (e) {
        // BUG - 58211:
        // Forum-Able to create Discussion without heading in Forum-Issue exist in IE-9 browser
        // BUG - 58495:
        // Forum-Able to create duplicate discussion title for a topic
            // took out the IE-specific and empty value code for the previous fix and made this more generic

        var key = e.keyCode || e.which;

        if(key === 13) {
            e.preventDefault();
            this.updatePreview(e);
            return false;
        }
    },

    submitForm: function(e) {
        var self = this;
        self.$el.find('form#newDiscussionForm').submit();
    },

    updatePreview: function(event) {
        //$('.alert').remove();
        var self = this,
            $validateTargets = self.$el.find(".validateme"),
            //title values
            titleValue = self.$el.find('#selectedTitle').val(),
            //body value
            htmlAreaValue = $.trim($("<span>" + self.$el.find('#selectedText').val() + "</span>").text()),
            isHtmlAreaValue = (htmlAreaValue !== '' && htmlAreaValue !== undefined && htmlAreaValue.length <= 2000),
            isTitleValue = (titleValue !== '' && titleValue.length <= 150);

        self.$el.find('#serverReturnedErrored').remove();
        console.log('[Info] notifyMessage: ', htmlAreaValue);

        if( !G5.util.formValidate($validateTargets) ) {
            return;
        }

        if (isHtmlAreaValue &&  isTitleValue) {
            self.forumDiscussionModel.checkTitle(self);
        }
        else {
            console.log('[Info] Enter Valid Reply');
            this.checkForServerErrors();
        }
        event.preventDefault();
    },

    updateSelectedTopic: function(e) {
        var $target = $(e.target).closest('select'),
            text = $(e.target).find("option:selected").text(),
            $crumb = $target.closest('form').find('.breadcrumbs .topic');

        $crumb.find('a').remove();
        if( text ) {
            $crumb.find('em').hide();
            $crumb.append('<a href="#">'+text+'</a>');
        }
        else {
            $crumb.find('em').show();
        }
    },

    updateSelectedTitle: function(e) {
        var $target = $(e.target).closest('input'),
            val = $target.val(),
            $title = $target.closest('form').find('h2.discussion');

        console.log(e);

        $title.find('span').remove();
        if( val ) {
            $title.find('em').hide();
            $title.append('<span>'+val+'</span>');
        }
        else {
            $title.find('em').show();
        }
    },

    toggleInterface: function (something) {
        var self = this;

        console.log('toggleInterface:', self.$el.find('.buttonSet'), " from: ", something);
        // self.$el.find('.buttonSet').toggle(); //show/hide preview element
    },

    checkReply: function (event) {
        var self = this,
            notifyMessage = self.$el.find('#notifyMessage').val(),
            $validateTargets = self.$el.find(".validateme"),
            nMContent = $.trim($("<span>" + notifyMessage + "</span>").text());

        G5.util.showSpin(this.$el.find('.discussionCommentsWrapper'), {cover:true});

        console.log('[Info] notifyMessage: ', nMContent);
        if (nMContent !== '' && nMContent !== undefined && nMContent.length <= 2000) {
            console.log('[Info] Valid Message');
            G5.util.hideSpin(this.$el);
        }
        else {
            G5.util.formValidate($validateTargets);
            event.preventDefault();
            console.log('[Info] Enter Valid Reply');
            this.checkForServerErrors();
            G5.util.hideSpin(this.$el.find('.discussionCommentsWrapper'));
        }
    },

    updateForm: function(event) {
        var self = this;

        event.preventDefault();
        self.$el.find('#newDiscussionForm').show(); //hide/show form
        self.toggleInterface('');
        self.$el.find('.preview').hide(); //show/hide preview element
    },
    cancelFormSubmit: function(e) {
        var $tar = $(e.currentTarget),
            $tip = this.$el.find('.cancelFormSubmit');

        e.preventDefault();

        G5.util.questionTip($tar, $tip.clone(), null,
            function() { // confirm callback
                history.go(-1);
            });
    },

    checkForServerErrors: function() {
        var self = this, $errors = self.$el.find('.errors div'), $selected, selector, i;

        console.log("Errors: ", $errors);
        for (i = $errors.length - 1; i >= 0; i -= 1) {
            $selected = $errors[i].getAttribute('data-error-field');
            console.log('Data test: ', $selected);
            selector = $('[name="' + $selected + '"]');
            console.log(selector);
            if (selector && selector.length) {
                G5.util.formValidate($('[name="' + $selected + '"]'));
            }
            else {
                $('#serverReturnedErrored').after($errors[i]);
            }
        }
    },

    likeItem: function(e) {
        var self = this, $tar = $(e.currentTarget), type, parentType, path, parentsId, $tip;

        //e.target
        console.log('inside LIke');
        //e.target === 'a.likeCommentButton' !== undefined ? y : 1;

        if ($tar.context.className === 'likeCommentButton') {
            type = "commentId";
            parentType = "discussionId";
            this.forumDiscussionModel.saveLike($tar.data("id"), type, $('.mediaComment').data('id').toString().replace("[", "").replace("]", ""), parentType);
        }
        else if ($tar.context.className === 'likeDiscussionButton') {
            type = "discussionId";
            this.forumDiscussionModel.saveLike($tar.data("id"), type);
        }
        else if ($tar.context.className === "removeCommentButton liked") {
            $tip = self.$el.find('.deleteCommentSubmit');
            G5.util.questionTip($tar, $tip.clone(), null,
                function() { // confirm callback
                    type = "commentId";
                    path = $tar.data("path");
                    self.forumDiscussionModel.saveLike($tar.closest('.commonDiscussionWrapper').data("id"), type, $(".forumDiscussionItem .mediaComment").data("id").toString().replace("[", "").replace("]", ""), "forumDiscussionItem", path);
                });
        }
        else if ($tar.context.className === "removeDiscussionButton liked") {
            $tip = self.$el.find('.deleteDiscussionSubmit');
            G5.util.questionTip($tar, $tip.clone(), null,
                function() { // confirm callback
                    type = "discussionId";
                    path = $tar.data("path");
                    parentsId = $tar.closest('.commonDiscussionWrapper').data("id");
                    parentsId = parentsId[0];
                    self.forumDiscussionModel.saveLike(parentsId, type, '', '', path);
                });
        }
        else {
            console.log("[ERROR] No selector on target.");
        }
        e.preventDefault();
    }
});
