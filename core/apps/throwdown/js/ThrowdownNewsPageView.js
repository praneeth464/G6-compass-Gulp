/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
Backbone,
PageView,
ThrowdownNewsCollectionView,
ThrowdownNewsPageDetailView,
ThrowdownNewsPageView:true
*/
ThrowdownNewsPageView = PageView.extend({
    initialize:function(opts){
        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'commissionerNews';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //retrieve the news data
        //add the news collection view
        this.throwdownNewsCollectionView = new ThrowdownNewsCollectionView({
            el : this.$el,
            loadOnly : true
        });

        this.$el.append('<span class="spin" />')
                .find('.spin')
                .spin();

        // create a router to handle individual story loads
        this.router = new Backbone.Router({
            routes : {
                "" : "storyIndex",
                "index" : "storyIndex",
                "story/:story" : "selectStory"
            }
        });
        this.router.on("route:storyIndex", function() {
            thisView.routedStory = null;
            thisView.renderStoryList();
            Backbone.history.navigate('index', {silent:true});
        });
        this.router.on("route:selectStory", function(story) {
            thisView.routedStory = story;
            thisView.renderSingleStory();
        });
        Backbone.history.start();

        // listen to clicks on our back link in the pageView
        this.pageNav.on('pageBackLinkClicked', function(view, event) {
            event.preventDefault();
            history.go(-1);
        });
    },
    renderSingleStory: function() {
        if( !this.throwdownNewsPageDetailView ) {
            this.throwdownNewsPageDetailView = new ThrowdownNewsPageDetailView({
                singleStory : this.routedStory,
                singleStoryView : this.throwdownNewsCollectionView,
                $singleStoryCont : this.$el
            });
        }
        else {
            this.throwdownNewsPageDetailView.render(this.throwdownNewsCollectionView.throwdownNewsStoryCollection.get(this.routedStory));
        }
    },
    renderStoryList: function() {
        this.throwdownNewsCollectionView.render();
    }
});
