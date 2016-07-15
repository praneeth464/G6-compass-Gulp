/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
PublicRecognitionModel:true
*/

//PubliceRecognitionModel
PublicRecognitionModel = Backbone.Model.extend({

    initialize:function(opts){

        //if passed an id, then attempt to load from server
        if(opts.pubRecId){
            this.loadData(opts.pubRecId);
        }

        this._activeBudgetId = false;

    },

    getActiveBudget: function() {
        var that = this,
            bs = this.get('budgets'),
            b = _.find(bs, function(x){
                return x.id==that._activeBudgetId;
            }); // find the active budget obj
        return b || {};
    },

    setActiveBudget: function(id) {
        this._activeBudgetId = id;
    },

    //save a comment to the server
    saveComment:function(params,comment,jsonUrl,callback){
        var that = this,
            params = {};

            params = {
                recognitionId: that.get('id'),
                comment: comment
            };

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: jsonUrl||G5.props.URL_JSON_PUBLIC_RECOGNITION_SAVE_COMMENT,
            data: params,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    newComment;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                newComment = data.comment;

                that.addComment(newComment);

                console.log('[INFO] PublicRecognitionModel['+that.get('id')+'] - SAVED a new comment');

                if(typeof callback === 'function') callback(newComment);
            }
        });
    },

    //add a comment to the model
    addComment:function(comment){
        this.get('comments').push(comment);
        this.trigger('commentAdded',comment);
    },

    //save a like to server
    saveLike:function(){
        var that = this;
        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            data: {recognitionId:this.get('id')},
            url: G5.props.URL_JSON_PUBLIC_RECOGNITION_SAVE_LIKE,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now


                that.set('isLiked',true);
                that.set('numLikers',data.numLikes);
                that.trigger('liked',data.numLikes);
                console.log('[INFO] PublicRecognitionModel['+that.get('id')+'] - SAVED a like');

                if(typeof callback === 'function') callback();
            }
        });
    },

    //save a like to server
    saveUnlike:function(){
        var that = this;
        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            data: {recognitionId:this.get('id')},
            url: G5.props.URL_JSON_PUBLIC_RECOGNITION_SAVE_UNLIKE,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                that.set('isLiked',false);
                that.set('numLikers',data.numLikes);
                that.trigger('liked',data.numLikes);
                console.log('[INFO] PublicRecognitionModel['+that.get('id')+'] - SAVED an unlike');

                if(typeof callback === 'function') callback();
            }
        });
    },

    //request to translate a recognition/comment
    translateData:function(commentId){
        var that = this,
            data;

        if (commentId) {
            data = {
                recognitionId:this.get('id'),
                commentId: commentId
            };
        } else {
            data = { recognitionId:this.get('id') };
        }

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            data: data,
            type: "POST",
            url: G5.props.URL_JSON_PUBLIC_RECOGNITION_TRANSLATE,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                that.set('translatedText',true);
                that.set('newTransText', data.comment);
                that.trigger('translated', commentId);
                console.log('[INFO] PublicRecognitionModel['+that.get('id')+'] - Recognition Translated');

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
                recognitionId:this.get('id'),
                commentId: commentId
            };
        } else {
            data = { recognitionId:this.get('id') };
        }

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            data: data,
            type: "POST",
            url: G5.props.URL_JSON_PUBLIC_RECOGNITION_SAVE_HIDE,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;

                if(serverResp.getFirstError()) return;//ERROR just return for now
                that.set('isHidden',true);
                that.trigger('hidden', commentId);
                console.log('[INFO] PublicRecognitionModel['+that.get('id')+'] - SAVED a "hide"');

                if(typeof callback === 'function') callback();
            }
        });
    },

    //fetch a model
    loadData:function(recogId,data){
        var that = this,
            params = $.extend({}, {recognitionId:recogId}, data || {});

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: G5.props.URL_JSON_PUBLIC_RECOGNITION_DETAIL,
            data: params,
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    recog = data.recognition||{};

                if(serverResp.getFirstError()) return;//ERROR just return for now

                that.set(recog);
                that.trigger('dataLoaded');

                console.log('[INFO] PublicRecognitionModel['+that.get('id')+'] - LOADED');
            }
        });
    },
    setActiveBudgetRemaining:function(rem){
        //Set current Budget Value in Model
        var b =  this.getActiveBudget();
        b.remaining = rem;
        console.log('Firing trigger.');
        this.trigger('budgetRemaingChanged', b);

    },

    setBudgetRemainingById: function(id, remaining){
            var bs = this.get('budgets'),
            b = _.find(bs, function(x){
                return x.id===id;
            }); // find the active budget obj
            if (b){
            b.remaining = remaining;
            if (this.getActiveBudget() && this.getActiveBudget().id===b.id){
                this.trigger('activeBudgetRemainingChanged', b);
            }
        }
    }
});