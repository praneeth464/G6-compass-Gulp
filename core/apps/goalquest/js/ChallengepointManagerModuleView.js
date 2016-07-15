/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
GoalquestManagerModuleView,
ChallengepointManagerModuleView:true
*/
// NOTE: the ChallengepointManagerModuleView is being treated as a clone of the GoalquestManagerModuleView.
ChallengepointManagerModuleView = GoalquestManagerModuleView.extend({

    initialize: function(opts) {

        //this is how we call the super-class initialize function (inherit its magic)
        GoalquestManagerModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass GoalquestManagerModuleView
        this.events = _.extend({},GoalquestManagerModuleView.prototype.events,this.events);

        this.$el.addClass('challengepoint');

    }

});