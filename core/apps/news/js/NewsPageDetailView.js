/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
PageView,
NewsStoryCollection,
NewsPageDetailView:true
*/
NewsPageDetailView = PageView.extend({
    el: $('#newsPageDetailView'), // el attaches to existing element

    initialize: function(opts){        
        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'news';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        if( opts.singleStory ) {
            this.newsStoryCollection = opts.singleStoryView.newsStoryCollection;
            this.options.messageUniqueId = opts.singleStory;

            if( this.newsStoryCollection.length ) {
                this.render(this.newsStoryCollection.get(this.options.messageUniqueId));
            }
        }
        // otherwise, go get the data
        else {
            this.newsStoryCollection = new NewsStoryCollection();
            this.newsStoryCollection.loadStories({
                messageUniqueId : this.options.messageUniqueId
            });
        }

        this.$el
            .append('<span class="spin" />')
            .find('.spin').spin();

        this.newsStoryCollection.on('dataLoaded', function() {
            thisView.render(thisView.newsStoryCollection.get(thisView.options.messageUniqueId));
        });

          
    },
    
    render: function(singleStory){
        var self = this,
            tplName = 'newsPageDetailItem', 
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'news/tpl/',
            $cont = this.options.$singleStoryCont || $('#newsPageDetailView');

        //empty the carousel items
        $cont.empty();

        singleStory.set('storyImageUrl', singleStory.get('storyImageUrl4x4'));

        TemplateManager.get(tplName,function(tpl){
            $cont.append( tpl(singleStory.toJSON()) ); 
        },tplUrl);
          
    }
    
  });