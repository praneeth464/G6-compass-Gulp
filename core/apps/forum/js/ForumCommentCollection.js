/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
ForumCommentCollection:true
*/
ForumCommentCollection = Backbone.Collection.extend({

    initialize: function(opts) {
        var self = this;
        self.view = opts.view;

        console.log('[Info] Model: opts ', opts);

        //If we have data from view, continue setting its values.
        if (opts && opts.json) {
            //create model
            var optionsToSend = {
                "discussionJson" : opts.discussionJson,
                "collection" : self
            };
            self.view.forumDiscussionModel.trigger("collectionReady", optionsToSend);
        //Load Data from server if data was not provided by view.
        } else if (opts && opts.jsonUrl) {
            self.loadData(opts.jsonUrl, self.view);
        }

        // empty table DOM when form is reset
        self.on("reset", function(model){
            console.log("[INFO] ClaimPageView: this.on('reset') triggered");
        });

        self.on("commentsPrepared", function(model){});

        self.on("modelUpdated", function(comment) {
            console.log('View/Model Updated So collection updates!', comment);
            self.add(comment);
        });

        self.on("add", function(newComments){
            console.log('Collection: incoming change', newComments, " self.models ", self.models);
        });

        self.on("add", function(pageCommentModel){
            console.log("an add is happening ", pageCommentModel);
            self.add(pageCommentModel);
        });
    },

    loadData : function(discussionJsonUrl, view) {
        console.log("[INFO] Loading Model Data from URL:", discussionJsonUrl, " View: ", view);
        var self = this,
            params = {};

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: discussionJsonUrl,
            data: params,
            success: function (serverResp) {
                //regular .ajax json object response
                //create model
                //view.forumDiscussionModel = new ForumDiscussionModel({'discussionJson' : serverResp.data.discussionJson, 'collection': self});
                //Add index to comments
                var discussionJson = serverResp.data.discussionJson;
                _.each(discussionJson.comments, function(comment, position) {
                    comment.paginationId = (discussionJson.page - 1) * discussionJson.repliesPerPage + 1 + position;
                });
                var optionsToSend = {
                    "discussionJson" : serverResp.data.discussionJson,
                    "collection" : self
                };

                console.log("[INFO] DiscussionJson: LoadData ajax call successfully returned this JSON object: ", serverResp);
                console.log("trigger data ", optionsToSend);
                view.forumDiscussionModel.trigger("collectionReady", optionsToSend);

                //self.add(view.forumDiscussionModel);
            }
        });
    },

    prepareComments : function(serverResp) {
        var self = this,
            data = serverResp.data,
            newComments = new Backbone.Collection(data.comments),
            $commentItem = $('.loadComments');

        // We have fewer results than the maximum per request, display the number of results
        if (data.repliesPerPage <= data.totalNumberOfReplies) {
            data.display = data.repliesPerPage;
        }
        // Display the maximum number
        else {
            data.display = data.totalNumberOfReplies;
        }
        self.set("firstComment", (data.repliesPerPage * data.page) );
        self.set("lastComment", (data.repliesPerPage * (data.page+1)-1) );

        //Set conditions for like buttons on each comment.
        self.setAllLikes(data);
        //was display
        self.set("display", data.display);

        //Set conditions for rending load replies buttons.
        if (data.display === 0) {
        } else if (data.display == 1) {
            self.set("multipleComments", false);
            self.set("singleComment", true);
        } else {
            self.set("multipleComments", true);
            self.set("singleComment", false);
        }
    },

    getMoreComments : function(page) {
        var self = this,
            theData = {"page" : page}; //$.extend({}, theData, getCriteriaInfo());

        $.ajax({
            type: "POST",
            dataType: 'g5json',
            data: theData,
            url: G5.props.URL_JSON_COMMENTS_MORE,
            // data: theData,
            beforeSend: function() {
                console.log("[INFO] ForumPageView: loadMoreComments ajax post starting. Sending this: ", theData);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("[ERROR] ForumPageView: loadMoreComments:", textStatus);
            },
            success: function(serverResp) {
                var commentsJson = serverResp.data;
                _.each(commentsJson.comments, function(comment, position) {
                    comment.paginationId = (commentsJson.page - 1) * commentsJson.repliesPerPage + 1 + position;
                });

                console.log("[INFO] ForumPageView: loadMoreComments ajax post sucess: ", serverResp);
                self.trigger("commentsLoaded", serverResp);
                //self.trigger("reset", serverResp);
            }
        });
    }
});