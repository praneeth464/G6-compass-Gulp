/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
SmackTalkModel:true
*/

//SmackTalkModel
SmackTalkModel = Backbone.Model.extend({

    initialize:function(opts){

        //if passed an id, then attempt to load from server
        if(opts.smackTalkId){
            this.loadData(opts.smackTalkId);
        }
    },

    //save a comment to the server
    saveComment:function(params,comment,jsonUrl,callback){
        var that = this;

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: jsonUrl||G5.props.URL_JSON_SMACK_TALK_SAVE_COMMENT,
            data: _.extend({},params,{comment:comment}),
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    newComment;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                newComment = data.comment;

                that.addComment(newComment);

                console.log('[INFO] SmackTalkModel['+that.get('id')+'] - SAVED a new comment');

                if(typeof callback === 'function') callback(newComment);
            }
        });
    },

    //add a comment to the model
    addComment:function(comment){
        this.get('comments').push(comment);
        this.trigger('commentAdded', comment);
    },

    //save a like to server
    saveLike:function(e, commentId){
        var that = this, data;
        if (commentId) {
            data = {
                smackTalkId: this.get('id'),
                commentId: commentId
            };
        } else {
            data = {smackTalkId:this.get('id')};
        }
        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            data: data,
            type: "POST",
            url: G5.props.URL_JSON_SMACK_TALK_SAVE_LIKE,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now
                that.set('isLiked', true);
                that.set('numLikers', data.numLikes);
                that.trigger('liked', data.numLikes, e, commentId);
                console.log('[INFO] SmackTalkModel[' + that.get('id') + '] - SAVED a like');

                if(typeof callback === 'function') callback();
            }
        });
    },

    //save a 'hide' to server
    saveHide:function(commentId){
        var that = this,
            data;

        if (commentId) {
            data = {
                smackTalkId:this.get('id'),
                commentId: commentId
            };
        } else {
            data = { smackTalkId:this.get('id') };
        }

        console.log('[INFO] SmackTalkModel saveHide() data ', data);

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            data: data,
            type: "POST",
            url: G5.props.URL_JSON_SMACK_TALK_SAVE_HIDE,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now
                that.set('isHidden',true);
                that.trigger('hidden', commentId);
                console.log('[INFO] SmackTalkModel['+that.get('id')+'] - SAVED a "hide"');

                if(typeof callback === 'function') callback();
            }
        });
    },

    //fetch a model
    loadData:function(recogId){
        var that = this;

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            url: G5.props.URL_JSON_SMACK_TALK_DETAIL,
            type: "POST",
            data: {smackTalkId:recogId},
            success:function(serverResp) {
                //regular .ajax json object response
                var data = serverResp.data,
                    recog = data.smackTalk||{};

                if(serverResp.getFirstError()) return;//ERROR just return for now

                that.set(recog);
                that.trigger('dataLoaded');

                console.log('[INFO] SmackTalkModel['+that.get('id')+'] - LOADED');
            }
        });
    }
});