/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
ModuleView,
LeaderboardSetCollection,
LeaderboardModelView,
LeaderboardModuleView:true
*/
LeaderboardModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon-only - smallest
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // half-size big
            {w:4,h:4}  // biggest
        ],{silent:true});

        this._hasRendered = false;

        // on the completion of the module template load and render
        this.on('templateLoaded',function(){
            var thisView = this;

            // start the loading state and spinner
            this.dataLoad(true);

            // create the leaderboard data model
            this.dataModel = new LeaderboardSetCollection();

            // retrieve the leaderboard data
            this.dataModel.loadData();

            // listen to the completion of the data load
            this.dataModel.on('loadDataFinished',function(){

                // create the view for the specific leaderboard data
                thisView.leaderboardView = new LeaderboardModelView({

                    el : thisView.$el.find('.leaderboardSlides'),
                    
                    // narrow down the loaded data model to just the active leaderboards and pass the resulting collection as the model for the new view
                    model : thisView.dataModel.where({nameId : 'active'})[0].leaderboards

                });


                // stop the loading state and spinner
                this.dataLoad(false);

                // render all the leaderboards into the carousel
                thisView.renderLeaderboards();

            },this);

        },this);

        this.on('renderLeaderboardsDone', function() {
            console.log('[INFO] LeaderboardModuleView: All leaderboards rendered');

            // stop the loading state and spinner
            this.dataLoad(false);

            this.startCycle({
                // use scss to size this shizz
                fit: 0,
                slideResize: 0,
                containerResize: 0
            });

            this._hasRendered = true;
        });

        this.on('geometryChanged', function(){
            if(this._hasRendered) {
                this.leaderboardView.reRenderLeaders();
            }
        },this);

    },

    events: {
        'click .visitAppBtn' : 'handleVisitAppBtn'
    },

    renderLeaderboards:function() {
        var thisView = this,
            finish = _.after(thisView.leaderboardView.model.models.length, function() {
                thisView.trigger('renderLeaderboardsDone');
            });

        // start the loading state and spinner
        this.dataLoad(true);

        this.leaderboardView.on('renderLeaderboardDone', function() {
            finish();
        });


        _.each(this.leaderboardView.model.models, function(board){
            thisView.leaderboardView.renderLeaderboard(
                board.get('id'),
                {
                    //$target : thisView.$el.find('.carousel-inner'),
                    classes : ['item']
                }
            );
        });
    },

    handleVisitAppBtn: function(e) {
        e.preventDefault();
        var $target = this.$el.find('.visitAppBtn'),
            url = $target.attr('href'),
            id = this.$el.find('.cycle .item:visible').data('id');

        window.location.assign(url+(id ? '#set/active/'+id : ''));
        // $target.attr('href', );
    }

});
