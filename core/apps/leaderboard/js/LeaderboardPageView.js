/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
Backbone,
PageView,
LeaderboardSetCollection,
LeaderboardModelView,
LeaderboardPageView:true
*/
LeaderboardPageView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var thisView = this;

        // this._chosenSet = null,
        this.showLeaderboard = opts.showLeaderboard ? opts.showLeaderboard : null;

        //set the appname (getTpl() method uses this)
        this.appName = 'leaderboard';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create handy references to our important DOM bits
        this.$setSelect = this.$el.find('#leaderboardSetSelect');
        this.$boardSelect = this.$el.find('#leaderboardSelect');
        this.$board = this.$el.find('.leaderboardModel');

        // create a router to handle individual leaderboard loads
        this.router = new Backbone.Router({
            routes : {
                "set/:set" : "selectSet",
                "set/:set/:board" : "selectBoard"
            }
        });
        this.router.on("route:selectSet", function(set) {
            thisView.routedSet = set;
        });
        this.router.on("route:selectBoard", function(set, board) {
            thisView.routedSet = set;
            thisView.routedBoard = board;

            // if the data model already exists
            if( thisView.model ) {
                // if the set is already active
                if( thisView.$setSelect.val() == set ) {
                    console.log('set already active');
                    thisView.$boardSelect.val(board).change();
                }
                // change to the other set
                else {
                    console.log('set not yet active');
                    thisView.$setSelect.val(set);
                    thisView.lbSetChange(null, true);
                    thisView.$boardSelect.val(board).change();
                }
            }
        });
        Backbone.history.start();


        // create the leaderboard data model
        this.model = new LeaderboardSetCollection();

        // retrieve the leaderboard data
        this.wait();
        this.model.loadData(this.routedSet ? this.routedSet : 'active', this.routedBoard ? this.routedBoard : null );

        // listen to the completion of the data load
        this.model.on('loadDataFinished',function(){

            console.log('[INFO] LeaderboardPageView: data load finished', thisView);

            if( thisView.showLeaderboard ) {
                thisView.model.setChosenSetById( this.model.getSetIdByBoardId(thisView.showLeaderboard) );
                thisView.showLeaderboard = null;
            }

            // render the view
            thisView.render();

        },this);

    },

    events:{
        'change #leaderboardSetSelect':'lbSetChange',
        'change #leaderboardSelect':'lbChange'
    },
    
    //wait for model update
    wait:function(){
        //start the spinner
        // this.$board.spin();
    },


    lbSetChange:function(e) {
        var val = this.$setSelect.val();

        this.model._chosenSet = this.model.getSetById(val);

        this.$board.empty();

        this.renderLeaderboardSelect();
    },

    lbChange:function(e, silent) {
        var val = this.$boardSelect.val();

        this.model._chosenSet.leaderboards._chosenBoard = this.model.getBoardById(val);

        if( !silent ) {
            this.router.navigate("set/" + this.model._chosenSet.get('id') + "/" + this.model._chosenSet.leaderboards._chosenBoard.get('id'));
        }
        this.renderLeaderboard();
    },

    render:function(){
        // stop the spinner
        // this.$board.spin(false);

        this.renderSetSelect();

        if( this.options.userRole == 'participant' ) {
            this.$el.addClass('participant');
        }
    },

    renderLeaderboard:function() {
        this.leaderboardView = new LeaderboardModelView({
            el : this.$board,
            model : this.model._chosenSet.leaderboards._chosenBoard
        });

        this.$board.empty();

        if( this.model._chosenSet.leaderboards._chosenBoard ) {
            this.leaderboardView.renderLeaderboard(
                this.model._chosenSet.leaderboards._chosenBoard.get('id'),
                {
                    $target : this.$board
                }
            );
        }
    },

    renderLeaderboardSelect:function() {
        var thisView = this,
            leaderboards = this.model._chosenSet.leaderboards;

        // check to see if any leaderboards exist and if the data load has not yet been attempted on this set
        if( leaderboards.length === 0 && !this.model._chosenSet.get('dataloaded') ) {
            console.log('[INFO] LeaderboardPageView: renderLeaderboardSelect: leaderboards empty and no data has been explicitly loaded for the set with id', this.model._chosenSet.get("id"));
            
            this.$el.find('#controlLeaderboardSelect').show();
            // retrieve the leaderboard data
            this.model.loadData(this.model._chosenSet.get('nameId'));

        } else if (leaderboards.length === 0) {
            this.$board.append( this.model._chosenSet.get('emptyMessage') || this.$el.find('#leaderboardSelect').data('noLeaderboards') );
            this.$el.find('#controlLeaderboardSelect').hide();
        }
        else {
            console.log('[INFO] LeaderboardPageView: renderLeaderboardSelect: leaderboards not empty or data has been explicitly loaded for the set with id', this.model._chosenSet.get("id"));
            this.$el.find('#controlLeaderboardSelect').show();
            thisView.renderSelectField(
                leaderboards.models,
                thisView.$boardSelect,
                function() {
                    if( leaderboards._chosenBoard ) {
                        thisView.$boardSelect.val( leaderboards._chosenBoard.get("id") );
                        // thisView.$boardSelect.find('[value='+leaderboards._chosenBoard.get("id")+']').attr('selected', 'selected');
                    }
                    thisView.$boardSelect.change();

                }
            );
        }
        
    },

    renderSelectField:function(models, $target, callback) {
        var thisView = this;

        $target.empty();

        // loop through the sets
        _.each(models, function(model) {
            model = model.toJSON();

            // append an option to the select for each set
            $target.append(
                thisView.make('option',
                {
                    value : model.id
                },
                model.name )
            );
        });

        if( callback ) {
            callback();
        }
    },

    renderSetSelect:function() {
        var thisView = this;

        this.renderSelectField(
            this.model.models,
            this.$setSelect,
            function() {
                thisView.$setSelect.val( thisView.model._chosenSet.get("id") );
                // thisView.$setSelect.find('[value='+thisView.model._chosenSet.get("id")+']').attr('selected', 'selected');
                thisView.$setSelect.change();
            }
        );
    }

});
