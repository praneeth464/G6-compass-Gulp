/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
GoalquestModuleView,
ChallengepointModuleView:true
*/
// NOTE: the ChallengepointModuleView is being treated as a clone of the GoalquestModuleView.
ChallengepointModuleView = GoalquestModuleView.extend({

    initialize: function(opts) {

        this.jsonKey = opts.jsonKey || 'URL_JSON_CHALLENGEPOINT_COLLECTION';

        //this is how we call the super-class initialize function (inherit its magic)
        GoalquestModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass GoalquestModuleView
        this.events = _.extend({},GoalquestModuleView.prototype.events,this.events);

        this.$el.addClass('challengepoint');

    }

});