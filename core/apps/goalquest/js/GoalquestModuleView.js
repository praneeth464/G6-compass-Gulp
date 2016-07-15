/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
G5,
ModuleView,
GoalquestCollectionView,
GoalquestModuleView:true
*/
GoalquestModuleView = ModuleView.extend({

    initialize: function(opts) {

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // 1x1 square
            {w:2,h:1}, // 2x1 square
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // 4x2 square
            {w:4,h:4}  // 4x4 square
        ]);

        this.jsonKey = this.jsonKey || opts.jsonKey || 'URL_JSON_GOALQUEST_COLLECTION';

        this.json = opts.model.get('json') || null;

        this.on('templateLoaded', function() {
            this.loadData();
        });

    },

    loadData: function() {
        var thisView = this;

        // start the loading state and spinner
        this.dataLoad(true);

        this.collection = new GoalquestCollectionView({
            el: this.$el.find('.goalquestItemsWrapper'),
            json: this.json,
            jsonUrl: G5.props[this.jsonKey],
            moduleView: this
        });

        this.collection.on('renderPromotionsFinished', function() {
            // stop the loading state and spinner
            thisView.dataLoad(false);
        });

        this.collection.loadPromotions();
    }

});