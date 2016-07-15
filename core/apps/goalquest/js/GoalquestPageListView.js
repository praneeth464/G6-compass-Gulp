/*jslint browser: true, nomen: true, unparam: true*/
/*global
_,
G5,
PageView,
GoalquestCollectionView,
GoalquestPageListView:true
*/
GoalquestPageListView = PageView.extend({

    initialize: function(opts) {

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.gqCollView = new GoalquestCollectionView({
            el: this.$el.find('.goalquestItemsWrapper'),
            jsonUrl: G5.props.URL_JSON_GOALQUEST_COLLECTION
        });

        this.gqCollView.loadPromotions();
    }

});