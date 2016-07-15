/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
ModuleView,
ThrowdownRankingsSetCollection,
ThrowdownRankingsModelView,
ThrowdownRankingsModuleView:true
*/
ThrowdownRankingsModuleView = ModuleView.extend({
    initialize:function(opts) {
        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set(
            'allowedDimensions',[
                { w:1, h:1 },
                { w:2, h:1 }, // icon+title
                { w:2, h:2 }, // 2x2 square
                { w:4, h:2 } // 4x2 square
            ],
            { silent: true }
        );

        // save the initial order value for this module (for hiding/showing module)
        G5.throwdown.moduleOrder.rankings = this.model.get('filters').throwdown.order;

        this._hasRendered = false;

        // on the completion of the module template load and render
        this.on('templateLoaded', this.prepareRankings, this);

        this.on('renderRankingsDone', function() {
            this._hasRendered = true;
            this.spinModule(false);
        });

        this.on('geometryChanged', function() {
            if (this._hasRendered) {
                this.rankingsView.reRenderLeaders();
            }
        }, this);

        G5.throwdown.dispatcher.on('promoChanged', this.resetRankingsView, this);
    },
    prepareRankings: function() {
        var thisView = this;

        this.spinModule(true);

        this.$el.find('.rankingsSlides').empty();

        // create the rankings data model
        this.dataModel = new ThrowdownRankingsSetCollection();

        // retrieve the rankings data
        this.dataModel.loadData();

        // listen to the completion of the data load
        this.dataModel.on('loadDataFinished', function() {
            var isVisible = this.processData();

            // Short circuit the rest of the modules functionality if it is not going to be shown on the screen.
            if (isVisible) {
                // create the view for the specific rankings data
                thisView.rankingsView = new ThrowdownRankingsModelView({
                    el : thisView.$el.find('.rankingsSlides'),
                    // narrow down the loaded data model to all rankings and pass the resulting collection as the model for the new view
                    model : thisView.dataModel.first().rankings
                });

                this.spinModule(false);

                // render all the rankings
                thisView.renderRankings();
            } else {
                console.log("----ThrowdownRankings Not Visible----");
            }
        }, this);
    },
    renderRankings:function() {
        var thisView = this,
            finish = _.after(thisView.rankingsView.model.models.length, function() {
                thisView.trigger('renderRankingsDone');
            });

        this.spinModule(true);

        this.rankingsView.on('renderRankingsDone', function() {
            finish();
        });

        _.each(this.rankingsView.model.models, function(board) {
            thisView.rankingsView.renderRankings(
                board.get('id'),
                {
                    classes : ['item']
                }
            );
        });
    },
    resetRankingsView: function() {
        this.prepareRankings();
    },
    spinModule:function(start) {
        if (start) {
            this.$el.append('<span class="spin" />')
                .find('.spin')
                .spin();
        } else {
            this.$el.find('.spin').remove();
        }
    },
    updateHref: function() {
        this.$el
            .find('.visitAppBtn')
            .attr( 'href', this.dataModel.rankingsUrl );
    },
    processData: function() {
        var
        filters = this.model.get('filters'),
        visible = this.dataModel.visible;

        if (visible) {
            // set the order in case the module is currently hidden
            filters.throwdown.order = G5.throwdown.moduleOrder.rankings;
            this.updateHref();
        } else {
            filters.throwdown.order = 'hidden';
        }

        this.model.trigger('change');

        return visible;
    }
});
