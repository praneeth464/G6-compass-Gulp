/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
G5,
PageView,
SmackTalkSetCollectionView,
SmackTalkPageView:true
*/
SmackTalkPageView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'smackTalk';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //extract initial selections from data attrs, or url params (query string)
        var smackTalkSetNameId = this.$el.data('smack-talk-set-name-id')||
            G5.props.urlParams.recSetNameId||false;
        var smackTalkId = this.$el.data('smack-talk-id')||
            G5.props.urlParams.recId||false;
        var pubCommentId = this.$el.data('comment-id')||
            G5.props.urlParams.cmtId||false;


        //add the pub rec set collection view
        this.smackTalkSetCollectionView = new SmackTalkSetCollectionView({
            el:this.$el, //sharing the same element as Module
            "$tabsParent": this.$el.find('.smackTalkTabs'),
            "$smackTalksParent": this.$el.find('.smackTalkItemsCont')
        });

    }

});