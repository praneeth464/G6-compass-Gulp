/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
PageView,
ThrowdownNewsStoryCollection,
ThrowdownNewsPageDetailView:true
*/
ThrowdownNewsPageDetailView = PageView.extend({
    el: $('#newsPageDetailView'), // el attaches to existing element

    initialize: function(opts){
        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'throwdownNews';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        if( opts.singleStory ) {
            this.throwdownNewsStoryCollection = opts.singleStoryView.throwdownNewsStoryCollection;
            this.options.messageUniqueId = opts.singleStory;

            if( this.throwdownNewsStoryCollection.length ) {
                this.render(this.throwdownNewsStoryCollection.get(this.options.messageUniqueId));
            }
        }
        // otherwise, go get the data
        else {
            this.throwdownNewsStoryCollection = new ThrowdownNewsStoryCollection();
            this.throwdownNewsStoryCollection.loadStories({
                messageUniqueId : this.options.messageUniqueId
            });
        }

        this.$el.append('<span class="spin" />')
                .find('.spin')
                .spin();

        this.throwdownNewsStoryCollection.on('dataLoaded', function() {
            thisView.render(thisView.throwdownNewsStoryCollection.get(thisView.options.messageUniqueId));
        });
    },
    render: function(singleStory){
        var self = this,
            tplName = 'throwdownNewsPageDetailItem',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'throwdown/tpl/',
            $cont = this.options.$singleStoryCont || $('#newsPageDetailView');

        //empty the carousel items
        $cont.empty();

        singleStory.set('storyImageUrl', singleStory.get('storyImageUrl4x4'));

        TemplateManager.get(tplName,function(tpl){
            $cont.append( tpl(singleStory.toJSON()) );
        },tplUrl);
    }
  });