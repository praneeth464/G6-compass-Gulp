/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
ModuleView,
SurveyTakeView,
InstantPollCollection,
InstantPollModuleView:true
*/
InstantPollModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            // {w:1,h:1}, // icon
            // {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // 4x2 square
            {w:4,h:4}  // 4x4 square
        ],{silent:true});

        // create a collection of polls
        this.polls = new InstantPollCollection();

        // on template loaded and attached
        this.on('templateLoaded', function() {
            // store the container for later reference
            this.$container = this.$el.find('#pollsContainer');

            // start the module dataLoading spinner
            this.dataLoad(true);
            // tell the collection to load the poll data
            this.polls.loadData();
        });

        this.on('pollsRendered', function() {
            this.cycleSetup();
        });

        this.polls.on('pollDataLoaded', function() {
            this.renderPolls();
        }, this);
    },

    events:{
    },

    renderPolls: function() {
        var that = this;

        // stop the module dataLoading spinner
        this.dataLoad(false);

        this.$container.empty();
        this.pollViews = [];

        // loop through each of the polls in the collection and render them into the container
        this.polls.each(function(poll) {
            var rand = Math.round(Math.random()*10000),
                $el = $('<div class="item"><div id="poll'+rand+'" /></div>');

            $el.appendTo(that.$container);
            that.pollViews.push(new SurveyTakeView({
                el: '#poll'+rand,
                surveyModel: poll,
                tpl: that.subTpls.surveyTakeTpl,
                cm: that.tplVariables.cm
            }));

        });

        this.trigger('pollsRendered');
    },

    cycleSetup: function() {
        // if there are more than one poll in the collection, set up a cycle
        if( this.polls.length > 1 ) {
            this.$container.addClass('multiPoll');

            this.startCycle({
                pagerEvent: "slideChange",
                // use scss to size this shizz
                fit: 0,
                slideResize: 0,
                containerResize: 0
            }, "dots"); // start the carousel
        }
    }

});