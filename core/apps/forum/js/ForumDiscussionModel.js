//ForumDiscussionModel -- collection of recognitions
/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
Backbone,
console,
G5,
ForumDiscussionModel:true
*/
ForumDiscussionModel = Backbone.Model.extend({
    initialize: function(options) {
        var self = this;
        //console.log("[Info] Model created, awaiting collectionReady trigger.")
        self.on("collectionReady", function(opts){
            self.prepareModel(opts);
        });

        this.forumPageView = options.forumPageView;
    },

    checkTitle: function(self) {
        var $locs = self.$el.find('#selectedTitle'),
            locUrl = self.checkTitleUrl,
            selectedTitle = $.trim($('#selectedTitle').val()),
            params,
            isTitleUnique,
            $form = $('#forumPageDiscussionView');

        if (selectedTitle !== '') {
            // console.log('in Check Title');
            params = {"selectedTitle" : selectedTitle};

            $.ajax({
                url : locUrl,
                type : 'post',
                data : params,
                dataType : 'g5json'
            }).done(function(data, textStatus, jqXHR) {
                console.log("[INFO] FourmPageNewDiscussion: generateId ajax post sucess: ", data.data);
                if (data.data.messages && data.data.messages.length >= 1) {
                    G5.util.formValidateHandleJsonErrors($form, data.data.messages);
                    // console.log('return is false');
                    isTitleUnique = false;
                } else {
                    // console.log('return is true');
                    isTitleUnique = true;
                }
                self.trigger('titleChecked', isTitleUnique);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                console.log("[ERROR] SelfEnrollmentLoginPageFirstTimeView: ", textStatus + ' (' + errorThrown + ') URL:' + locUrl);
                //guess we can just leave it disabled
            });
        }
    },

    //Get Comment By ID
    getLikedComment : function(id, data) {
        var self = this,
            comments = self.get('comments'),
            commentToChange,
            commentInCollection,
            i;

        for (i = comments.length - 1; i >= 0; i -= 1) {
            if (comments[i].id == id) {
                commentInCollection = this.forumPageView.forumCommentCollection.get(id).attributes;
                comments[i].isLiked = true;
                comments[i].numberOfLikes = data.numberOfLikes;
                //Update Comment
                    // comments[i].noLike = false;
                    // comments[i].onlyYouLike = false;
                    // comments[i].oneLike = false;
                    // comments[i].moreLike = false;
                    // comments[i].youAndOtherLike = false;
                    // comments[i].youAndOthersLike = false;
                self.setLike(comments[i] ,'comment');
                //Update Coment Model in Collection
                commentInCollection.isLiked = true;
                commentInCollection.numberOfLikes = data.numberOfLikes;

                    // commentInCollection.noLike = false;
                    // commentInCollection.onlyYouLike = false;
                    // commentInCollection.oneLike = false;
                    // commentInCollection.moreLike = false;
                    // commentInCollection.youAndOtherLike = false;
                    // commentInCollection.youAndOthersLike = false;
                self.setLike(commentInCollection ,'comment');

                this.forumPageView.trigger('commentUpdated', comments[i]);
                console.log("[Info] Comment updated:", comments[i]);
            }
        }
    },

    loadMoreComments: function(page) {
        var //$btn = $(e.currentTarget),
            self = this,
            repliesPerPage,
            results,
            cleanResults = [],
            i = 0;

        this.forumPageView.forumCommentCollection.add(self.get('comments'), {merge : true});

        if (page === undefined) {
            page =self.get('page');
        } else {
            self.set('page', page);
        }

        repliesPerPage = self.get('repliesPerPage');
        //Get elements by backbone id.
        results = _.filter(this.forumPageView.forumCommentCollection.models, function(obj){ return obj.get("paginationId")  > ((repliesPerPage * page) - repliesPerPage) && obj.get("paginationId") <= (repliesPerPage * page); });

        for (i; i < results.length; i++) {
            results[i] = results[i].toJSON();
        }

        if (results.length <= 0){
            this.forumPageView.forumCommentCollection.getMoreComments(page);
        }
        else {
            // console.log('self: ', self);
            self.unset("comments");
            self.set( "comments", results);
            self.set('firstComment', results[0].paginationId);
            self.set('lastComment', _.last(results).paginationId);
            this.forumPageView.trigger("modelReady");
        }
    },

    //Set Discussion By ID
    likeDiscussion : function(data) {
        this.set("isLiked", true);
        this.set("numberOfLikes", data.numberOfLikes);
        this.set("noLike", false);
        this.set("onlyYouLike", false);
        this.set("oneLike", false);
        this.set("moreLike", false);
        this.set("youAndOtherLike", false);
        this.set("youAndOthersLike", false);
        this.setLike(this.toJSON(), 'discussion');
        this.trigger('discussionChanged', this);
        //Update Collection
        this.trigger('commentsLoaded', this);
        console.log("[Info] Discussion changed:", this.toJSON());
    },

    prepareModel: function (opts) {
        //console.log("[Info] collectionReady triggerd. ", opts)
        var self = this,
            discussionJson = opts.discussionJson,
            collection = opts.collection;

        self.setAllLikes(discussionJson);

        collection.reset();

        self.set(discussionJson);
        // console.log("set discussionJson", self);

        if (discussionJson.author.id == this.forumPageView.getParticipantProfile().id) {
            discussionJson.author.isCurrentUser = true;
        }

        if (discussionJson.repliesPerPage <= discussionJson.totalNumberOfReplies) {
            discussionJson.display = discussionJson.repliesPerPage;
        }
        else {
            discussionJson.display = discussionJson.totalNumberOfReplies;
        }

        if (self.get('comments').length) {
            self.set("firstComment", self.get('comments')[0].paginationId );
            self.set("lastComment", _.last(self.get('comments')).paginationId );
            self.set("repliesOnPage", discussionJson.display);
        }

        self.set("multipleComments", false);
        self.set("singleComment", false);

        if (discussionJson.display == 1) {
            self.set("singleComment", true);
        }
        else {
            self.set("multipleComments", true);
        }

        //Set Collection specific watch events after model is created.
        collection.on("commentsLoaded", function(serverResp){
            self.prepareComments(serverResp, collection);
        });

        this.forumPageView.trigger("modelReady");
        collection.add(self.get('comments'),  { merge : true });
    },

    prepareComments: function (serverResp, collection) {
        var self = this,
            data = serverResp.data,
            newComments = new Backbone.Collection(data.comments),
            $commentItem = $('.loadComments');

        console.log('commentsLoaded: ', serverResp, "  self ", self);

        if (data.repliesPerPage <= data.totalNumberOfReplies) { //We have fewer results than the maximum per request, display the number of results
            data.display = data.repliesPerPage;
        } else { //Display the maximum number
            data.display = data.totalNumberOfReplies;
        }

        self.set("firstComment", (data.repliesPerPage * (data.page - 1 )) + 1) ;
        self.set("lastComment", (data.repliesPerPage * data.page));

        //Set conditions for like buttons on each comment.
        self.setAllLikes(data);

        //was display
        self.set("display", data.display);

        //Set conditions for rending load replies buttons.
        if (data.display === 0) {
        }
        else if (data.display == 1) {
            self.set("multipleComments", false);
            self.set("singleComment", true);
        }
        else {
            self.set("multipleComments", true);
            self.set("singleComment", false);
        }

        self.set("comments", data.comments);
        collection.add(self.get('comments'));
        this.forumPageView.trigger("modelReady");
    },

    //save a like to server
    saveLike : function(id, type, parentId, parentType, path) {
        var url, self = this, data = {}, isLike = true;

        if (path) { isLike = false; }

        data[type] = id;

        if (type == "commentId") {
            //Case Admin
            data[parentType] = parentId;
            //Case Like
            if (path === undefined) {
                data[type] = id;
                path = G5.props.URL_JSON_FORUM_COMMENT_SAVE_LIKE;
            }
        }
        //Case Admin
        else if (type == "discussionId") {
            //Case Like
            if (path === undefined) {
                path = G5.props.URL_JSON_FORUM_DISCUSSION_SAVE_LIKE;
            }
        }

        console.log('data for delete', data);

        $.ajax({
            dataType: 'g5json',//must set this so SeverResponse can parse and return to success()
            data: data,
            type: "POST",
            url : path,
            success: function(serverResp) {
                console.log('serverResp', serverResp);

                //regular .ajax json object response
                var data = serverResp.data;
                if (serverResp.getFirstError()) {return; }//ERROR just return for now
                console.log("[Info] Model predata push: ", self);
                if (isLike) {
                    type == "commentId" ? self.getLikedComment(id, data) : self.likeDiscussion(data);
                }
                else {
                    if (type == "discussionId"){
                        document.location = data.message.redirectUrl;
                    } else {
                        document.location.reload(true);
                    }
                }
                if (typeof callback === 'function') {callback(); }
            }
        });
    },

    setAllLikes : function(discussionJson) {
        var self = this,
            i;

        self.setLike(discussionJson, 'discussion');

        // console.log('About to set all likes: ');

        for (i = 0; i < discussionJson.comments.length; i += 1) {
            self.setLike(discussionJson.comments[i], 'comment');
            if (discussionJson.comments[i].commenter.id == this.forumPageView.getParticipantProfile().id){
                discussionJson.comments[i].commenter.isCurrentUser = true;
            }
            console.log('discussionJson SHOW THIS: ', discussionJson.comments[i]);
        }
    },

    //cut
    setComments: function(newComments) {
        var self = this,
            comments = self.get("comments"),
            i,
            collectionComments,
            j;

        collectionComments = _.union(comments, newComments);

        for (i = 0, j = comments.length; i < j; i += 1) {
            //console.log('comment ', comments);
            self.setLike(comments[i], 'comment');
        }

        //Send updated list of comments to collection
        self.commentCollection.add(collectionComments);

        //Empty comments from current model
        self.unset("comments");

        //Populate model with current comments
        self.set("comments", newComments);

        this.forumPageView.trigger("modelReady");
        console.log("current Model after set comments:", self.toJSON());
    },

    setLike : function (data, type) {
        var self = this;
        //set structure for backbone
        if (type == 'comment') {
            data.buttonClass = 'likeCommentButton';
            if (data.numberOfLikes === 0) {
                data.status = "noLikes";
            }
            else {
                //data.noLike = false;
                if (data.numberOfLikes == 1) {
                    if (data.isLiked === true) {
                        data.status = "onlyYouLike";
                    }
                    else {
                        data.status = "oneLike";
                    }
                }
                else if (data.numberOfLikes == 2) {
                    if (data.isLiked === true) {
                        data.status = "youAndOtherLike";
                        data.numberOfOtherLikes = data.numberOfLikes - 1;
                    }
                    else {
                        data.status = "moreLike";
                    }
                }
                else if (data.isLiked === true) {
                    data.status = "youAndOthersLike";
                    data.numberOfOtherLikes = data.numberOfLikes - 1;
                }
                else {
                    data.status = "moreLike";
                }
            }
        }
        else {
            data.buttonClass = 'likeDiscussionButton';
            console.log('[Info] discussion starting: ', data);
            //Reset all values;
            //if numberOfLikes is not sent, use the previously recived value.
            if (data.numberOfLikes === undefined) {
                data.numberOfLikes = self.get('numberOfLikes');
            }
            if (data.numberOfLikes === 0) {
                self.set("status", "noLike");
            }
            else if (data.numberOfLikes == 1) {
                if (data.isLiked === true) {
                    self.set("numberOfLikes", data.numberOfLikes);
                    self.set("status", "onlyYouLike");
                }
                else {
                    self.set("status", "oneLike");
                    console.log("One Like fired, should not render a more Like.");
                }
            }
            else if (data.numberOfLikes == 2) {
                console.log('[INFO] 2 Likes');
                if (data.isLiked === true) {
                    self.set("numberOfOtherLikes", data.numberOfLikes - 1);
                    self.set("numberOfLikes", data.numberOfLikes);
                    self.set("status", "youAndOtherLike");
                }
                else {
                    self.set("status", "moreLike");
                }
            }
            else if (data.isLiked === true) {
                self.set("status", "youAndOthersLike");
                //data.numberOfLikes = data.numberOfLikes - 1;
                self.set("numberOfOtherLikes", data.numberOfLikes - 1);
                self.set("numberOfLikes", data.numberOfLikes);
            }
            else {
                self.set("status", "moreLike");
            }
        }
        console.log('data from Set Likes: ', data);
    },

    setPreviewData: function () {
        var self = this,
            postAuthor = self.set('author', {});

        console.log('postAuthor ', postAuthor);
        postAuthor.firstName = this.forumPageView.getParticipantProfile().toJSON().firstName;
        postAuthor.lastName = this.forumPageView.getParticipantProfile().toJSON().lastName;
        postAuthor.avatarUrl = this.forumPageView.getParticipantProfile().toJSON().avatarUrl;
        self.set('topicName', $('#selectedTopic option:selected').text()); //Topic Id
        self.set('topicId', $('#selectedTopic option:selected').val()); //Topic Select
        self.set('title', $('#selectedTitle').val()); //Discussion Title
        self.set('text', $('#selectedText').val());  //Discussion Copy

    }
});