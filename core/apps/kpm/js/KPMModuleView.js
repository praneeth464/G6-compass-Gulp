/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
G5,
ModuleView,
KPMSummaryCollectionView,
KPMModuleView:true
*/
KPMModuleView = ModuleView.extend({
    initialize: function() {

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // 4x2 square
            {w:4,h:4}  // 4x4 square
        ],{silent:true});


        // on template loaded and attached
        this.on('templateLoaded', function() {
            this.summaryView = new KPMSummaryCollectionView({
                el : this.$el.find('.kpmSummaryCollectionView')
            });

            // we sneakily hide the spinner inside the collection so we can use .dataLoad on the ModuleView instead
            // G5.util.hideSpin(this.$el.find('.kpmSummaryCollectionView'));
            G5.util.hideSpin(this.summaryView.$el);

            // start the module dataLoading spinner
            this.dataLoad(true);

            // listen for the collectionView's collection to finish loading so we can cancel the ModuleView .dataLoad
            this.summaryView.collection.on('loadDataDone', function() {
                this.dataLoad(false);
            }, this);
        }, this);
    }
});
