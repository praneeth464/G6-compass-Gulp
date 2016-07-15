/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
ModuleView,
TemplateManager,
ThrowdownMatchCollection,
ThrowdownMatchModuleView:true
*/
ThrowdownMatchModuleView = ModuleView.extend({

    /**
     * Event listeners for G5.throwdown.dispatcher:
     *        event: promoChanged
     *       action: calls resetView()
     *      purpose: hide the view content and load a spinner while waiting
     *               for the collection to update and trigger 'matchDataLoaded'
     */

    tplLoaded  : false, // both the template and the data need to be ready before trying to render
    dataLoaded : false,

    initialize: function(opts){

        var thisView = this;

        ModuleView.prototype.initialize.apply(this, arguments); //this is how we call the super-class initialize function (inherit its magic)
        this.events = _.extend({}, ModuleView.prototype.events, this.events); //inherit events from the superclass ModuleView

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 },
                { w:4, h:2 }
            ],
            { silent: true }
        );

        // save the initial order value for this module (for hiding/showing module)
        G5.throwdown.moduleOrder.allMatches = this.model.get('filters').throwdown.order;

        this.collection = new ThrowdownMatchCollection();

        this.on('templateLoaded', function() {
            this.spinModule(true);
            this.tplLoaded = true;
            this.renderMatch();

        }, this);

        this.collection.on('matchDataLoaded', function() {
            this.dataLoaded = true;
            this.renderMatch();

        }, this);

        G5.throwdown.dispatcher.on('promoChanged', this.resetView, this);
    },

    /**
     * Renders this view and removes the spinner if present
     */
    renderMatch: function() {
        if (!this.tplLoaded || !this.dataLoaded) {
            return; // if the template has not loaded yet don't try to render
        }

        if(!this.processData()){
            return false;
        }

        var thisView = this;

        // empty the element in cases where the view needs to be rerendered with new data
        thisView.$el.find('.wide-view').empty();

        //when template manager has the template, render it to this element
        thisView.$el.find('.wide-view').append( thisView.subTpls.throwdownMatchDetailsTpl( _.extend({}, thisView.collection.first().toJSON(), {cid:thisView.cid}) ));

        // in initial load, templates may miss out on filter event
        // so we do filter change work here just in case
        thisView.doFilterChangeWork();

        this.shrinkText();

        thisView.spinModule(false);

        return this;
    },
    shrinkText: function(){
        _.delay(G5.util.textShrink, 100, this.$el.find('.td-match-rank, .td-match-participant-name, .td-match-vs, .td-match-round-info'));
        G5.util.textShrink( this.$el.find('.td-match-rank, .td-match-participant-name, .td-match-vs, .td-match-round-info'));

        _.delay(G5.util.textShrink, 100, this.$el.find('.td-match-vs, .td-match-btn'), {vertical: false});
        G5.util.textShrink( this.$el.find('.td-match-vs, .td-match-btn'), {vertical: false});

    },
    /**
     * Hide the contents of the view and display a spinner
     */
    resetView: function() {
        this.$el.find('.wide-view').children().fadeOut(300);
        this.spinModule(true);
    },

    /**
     * Adds/removes a spinner on the module
     *
     * @param start  Boolean value: true to add/start the spinner, false will
     *                              false to stop/remove spinner from module
     */
    spinModule: function(start) {
        if (start) {
            this.$el.closest('.module')
                .append('<span class="spin" />')
                .find('.spin').spin();
        } else {
            this.$el.closest('.module')
                .find('.spin').remove(); //.spin(false);
        }
    },
    processData: function() {
        var
        filters = this.model.get('filters'),
        visible = this.collection.first().get('visible');

        if (visible) {
            // set the order in case the module is currently hidden
            filters.throwdown.order = G5.throwdown.moduleOrder.allMatches;

        } else {
            filters.throwdown.order = 'hidden';
        }

        this.model.trigger('change');

        return visible;
    }
});
