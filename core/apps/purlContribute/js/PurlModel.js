/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
alert,
$,
_,
Backbone,
G5,
PurlModel:true
*/
PurlModel = Backbone.Model.extend({

    defaults: {
        recipient: null,
        contributor: null,
        invitees: null,
        attachMode: 'select', // select, video, photo, display
        commentImage: null,
        commentVideo: null,
        comments: null
    },

    initialize: function(opts) {
        this.pendingInvitees = new Backbone.Collection(); // booya
        this.inviteeResults = {};
        this.checkInviteeIds();
    },

    removePendingInviteeByEmail: function(email) {
        var inv = this.pendingInvitees.where({email:email});
        this.pendingInvitees.remove(inv); // view listens to update itself
    },

    fetchComments: function() {
        var that = this,
            params = {
            purlRecipientId: this.get('recipient').id,
            // not sure why we are asking the server for this since we are only loading once
            // we can easily sort this on FE
            commentOrderDescending: 'true'
        };

        this.trigger('start:fetchComments');

        $.ajax({
            type: "POST",
            dataType: 'g5json',
            url: G5.props.URL_JSON_PURL_ACTIVITY_FEED,
            data: { data: JSON.stringify(params) },
            success: function(serverResp){
                var comments = serverResp.data.activityPods;
                console.log("[INFO] PurlModel.fetchComments - resp: ", serverResp);
                that.set('comments',comments);
                // trigger the success
                that.trigger('success:fetchComments');
            }
        }).fail(function(jqXHR, textStatus) {
            console.log( "[INFO] PurlModal.fetchComments - failed: " + textStatus);
        }).always(function(){
            that.trigger('end:fetchComments');
        });
    },

    saveContributor: function(contributor) {
        var that = this,
            // upholding the bizarre contract with the server
            varNameMap = {
                id: 'invitedContributorId',
                firstName: 'firstName',
                lastName: 'lastName',
                email: 'emailAddress',
                avatarUrl: 'picURL'
            },
            // actual object being sent to server, more bizzare
            data = {messages:[{}]};

        // convert normal pax json to contract version
        _.each(contributor, function(v,k){
            data.messages[0][varNameMap[k]] = v;
        });

        // add the recipient id to the object getting sent
        data.messages[0].recipientId = this.get('recipient').id;

        this.trigger('start:saveContributor');

        $.ajax({
            type: "POST",
            dataType: 'g5json',
            url: G5.props.URL_JSON_PURL_INVITE_CONTRIBUTORS_EMAILED,
            data: { data: JSON.stringify(data) }, // bizarre
            success: function(serverResp){
                console.log("[INFO] PurlModel.saveContributor - contributor: ", data, "resp: ", serverResp);

                // if the server doesn't throw errors, we can assume the values we sent were accepted
                // but we do want to collect the id
                contributor.id = serverResp.data.messages[0].contributorID;
                // and we do need the proper avatarURL from the response
                contributor.avatarUrl = serverResp.data.messages[0].avatarUrl;
                // update our model with new info
                that.set('contributor', contributor);
                // trigger the success (view will do things like hide the info collect modal)
                that.trigger('success:saveContributor', contributor);
            }
        }).fail(function(jqXHR, textStatus) {
            console.log( "[INFO] PurlModal.saveContributor - post failed: " + textStatus );
        }).always(function(){
            that.trigger('end:saveContributor');
        });
    },

    //request to translate a comment
    translateData:function(){
        var self = this,
            data = {
                purlRecipientId: self.get('recipient')
            };

            _.each(self.get('recipient'), function(recipients){
                   data = {
                       purlRecipientId : recipients
                   };

            });

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            data: data,
            type: "POST",
            url: G5.props.URL_JSON_PURL_TRANSLATE_COMMENT,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                self.set('translatedText',true);
                self.set(data);
                self.trigger('translated');
                console.log('[INFO] PURL Contribute - Recognition Translated');

                if(typeof callback === 'function') callback();
            }
        });
    },

    checkInviteeIds: function() {
        _.each(this.get('invitees'), function(inv) {
            inv.id = inv.id || inv.email;
        });
    },

    sendInvitees: function() {
        var that = this,
            invitees = this.pendingInvitees.toJSON(),
            data = {messages:[],invites:[]};

        // convert any fields to conform to server expectations
        _.each(invitees, function(invitee, i){ // array
            invitee.emailAddress = invitee.email;
            delete invitee.email;
            data.invites.push(invitee);
        });

        this.trigger('start:sendInvitees');

        $.ajax({
            type: "POST",
            dataType: 'g5json',
            url: G5.props.URL_JSON_PURL_INVITE_CONTRIBUTORS,
            data: { data: JSON.stringify(data) }, // bizarre
            success: function(serverResp){
                console.log("[INFO] PurlModel.sendInvitees - sent: ", data, "resp: ", serverResp);
                // set model data
                that.inviteeResults = {
                    hasNotBeenShown: true,
                    invitees: serverResp.data.invites
                };

                // clear the pending list
                that.pendingInvitees.reset([],{silent:true});

                // add apropo elements to already invited list
                that.addToInviteesFromInviteeResults(that.inviteeResults.invitees);

                // trigger the success (view will do things like hide the info collect modal)
                that.trigger('success:sendInvitees');
            }
        }).fail(function(jqXHR, textStatus) {
            console.log( "[INFO] PurlModal.sendInvitees - post failed: " + textStatus );
        }).always(function(){
            that.trigger('end:sendInvitees');
        });
    },

    sendThankyou: function(txt) {
        var that = this,
            data = {
                purlRecipientId: this.get('recipient').id,
                thanksMessage: txt
            };

        this.trigger('start:sendThankyou');

        $.ajax({
            type: "POST",
            dataType: 'g5json',
            url: G5.props.URL_JSON_PURL_SEND_THANK_YOU,
            data: { data: JSON.stringify(data) },
            success: function(serverResp){
                var msg = serverResp.data.messages[0];

                console.log("[INFO] PurlModel.sendThankyou - resp: ", serverResp);
                if(msg.isSuccess) {
                    // trigger the success (view will do things like hide the info collect modal)
                    that.trigger('success:sendThankyou');
                } else {
                    alert(msg.errorMessage||"undefined server error");
                }
            }
        }).fail(function(jqXHR, textStatus) {
            console.log( "[INFO] PurlModal.sendThankyou - failed: " + textStatus );
        }).always(function(){
            that.trigger('end:sendThankyou');
        });
    },

    // ISHY: a helper function to add the appropriate invitees from the 'sendInvitees' ajax server response
    // also, fix massage data a bit :(
    addToInviteesFromInviteeResults: function(serverInvitees) {
        var newList = [],
            servInvs = $.extend(true, {}, serverInvitees), // work on a copy
            merge;
        // massage datums-ta-tum-tum-tummmmms
        _.each(servInvs, function(si) {
            si.email = si.emailAddress; // remap email name
            si.id = si.email; // email is ID
            delete si.emailAddress; // strip old email reference
            if(si.status==='success') {
                delete si.status; // strip extra data
                newList.push(si);
            }
        });
        // using 'apply' to push each from newList
        merge = this.get('invitees').concat(newList);
        /*
         * bugzilla #55981 requests that this de-duplication be removed
         * I personally think this is a dangerous and foolish thing to turn off, but here we go...
         *
        // remove duplicates
        merge = _.uniq(merge, function(x){return x.id;});
         *
         */
        // set it
        this.set('invitees',merge, {silent:true});
    },

    saveComment: function(comment) {
        var that = this,
            c = this.get('contributor'),
            // actual object being sent to server, super bizzare
            data = [
                {
                    messages: [],
                    // not clear what this ID is from old FE code
                    // * this is a new item, so setting it to 0 for now (old was setting it to 1001+8 !!! wtf)
                    // ** this data is really wierd, would be nice to clean it up w/ cooperation of JAVA (it'll happen, right?)
                    activityId: 0,
                    userInfo: [
                        {
                            // I am commenting out data that seems to not be used in old version
                            userName: c.firstName+' '+c.lastName,
                            //signedIn: "true",
                            contributorID: c.id,
                            //profileLink: "layout.html?tpl=profilePage&tplPath=apps/profile/tpl/",
                            profilePhoto: c.avatarUrl
                        }
                    ],
                    commentText: comment,
                    // this is for video links
                    videoWebLink: this.get('commentVideo') || '',
                    // media is only for image files that have been uploaded
                    media: !this.get('commentImage') ? null : [
                        {
                            "video":null, // not doing video any more
                            "photo":[
                                {
                                    "src": this.get('commentImage').url,
                                    "thumbSrc": this.get('commentImage').thumbUrl
                                }
                            ]
                        }
                    ] // media (yeah, its an array)
                }
            ],
            item = $.extend(true, {}, data[0]);

        // clean up image URLs before submitting to the server
        if( data[0].media && data[0].media[0].photo[0] ) {
            data[0].media[0].photo[0] = {
                src : this.cleanImgUrl( this.get('commentImage').url ),
                thumbSrc : this.cleanImgUrl( this.get('commentImage').thumbUrl )
            };
        }

        this.trigger('start:saveComment');

        $.ajax({
            type: "POST",
            dataType: 'g5json',
            url: G5.props.URL_JSON_PURL_POST_COMMENT,
            data: { data: JSON.stringify(data) }, // bizarre
            success: function(serverResp){
                var msg = serverResp.data.messages[0];

                console.log("[INFO] PurlModel.saveComment - resp: ", serverResp);

                if(msg.isSuccess) {
                    // update our model with new item
                    that.get('comments').unshift(item);
                    // clear out comment media
                    that.set('commentImage',null);
                    that.set('commentVideo',null);
                    // this will trigger view update of visual state of contribute comment
                    that.set('attachMode','select');
                    // trigger the success -- will trigger a clear of the textarea, maybe more
                    that.trigger('success:saveComment');
                } else {
                    console.log( "[INFO] PurlModal.saveComment - serverError: " + msg.text);
                    alert(msg.text); // yep
                }

            }
        }).fail(function(jqXHR, textStatus) {
            console.log( "[INFO] PurlModal.saveComment - ajax fail: " + textStatus );
        }).always(function(){
            that.trigger('end:saveComment');
        });
    },

    // helper - remove prefix strings from IMG URLs for cleaner saving in the DB
    cleanImgUrl: function(url) {
        var stagerPfx = this.get('stagerPrefixURL'),
            finalPfx = this.get('finalPrefixURL');

        return url.replace(stagerPfx,'').replace(finalPfx,'');
    }

});