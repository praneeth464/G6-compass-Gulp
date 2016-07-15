/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
ModuleView,
EngagementSummaryCollectionView,
EngagementModuleView:true
*/
EngagementModuleView = ModuleView.extend({
    initialize: function() {

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        // the default mode of a module is 'user'
        this.mode = this.mode || 'user';

        // pass the mode to the module model so it can be used in rendering
        this.model.set('mode', this.mode);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // 4x2 square
            {w:4,h:4}  // 4x4 square
        ],{silent:true});


        // on template loaded and attached
        this.on('templateLoaded', this.buildSummaryView, this);
    },

    events : {
        'click .visitAppBtn' : 'handleVisitAppBtn'
    },

    buildSummaryView: function() {
        this.summaryView = new EngagementSummaryCollectionView({
            el : this.$el.find('.engagementSummaryCollectionView'),
            mode : this.mode,
            moduleView : this
        });

        // we sneakily hide the spinner inside the collection so we can use .dataLoad on the ModuleView instead
        // G5.util.hideSpin(this.$el.find('.engagementSummaryCollectionView'));
        G5.util.hideSpin(this.summaryView.$el);

        // start the module dataLoading spinner
        this.dataLoad(true);

        // listen for the collectionView's collection to finish loading so we can cancel the ModuleView .dataLoad
        this.summaryView.collection.on('loadDataDone', function() {
            this.$el.addClass('dataLoaded');
            this.dataLoad(false);
        }, this);

        this.summaryView.on('tabActivated', this.handleTabActivation, this);
    },

    handleVisitAppBtn: function(e) {
        var $tar = $(e.target).closest('.visitAppBtn'),
            href = $tar.attr('href'),
            tabNameId = this.summaryView.getTabName();

        // we can safely assume that if there is already a hash in the url, it's pointing to the user profile dashboard (profileUrl#tab/Dashboard)
        // we can therefore assume that if there is no hash in the url, it's pointing to the team dashboard page
        $tar.attr('href', href + (href.indexOf('#') >= 0 ? '/' : '#') + tabNameId);
    }
});
