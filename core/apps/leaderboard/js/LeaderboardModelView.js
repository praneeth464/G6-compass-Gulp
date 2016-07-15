/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
LeaderboardModelView:true
*/
LeaderboardModelView = Backbone.View.extend({

    //override super-class initialize function
    initialize:function(opts){

        console.log('[INFO] LeaderboardModelView: leaderboard model view initialized', this);
        var that = this;

        this.on("renderLeaderboardDone", function() {
            that.bindRuleLink();
        });

    },

    events:{
        'click .leaderName' : 'attachParticipantPopover'
    },

    bindRuleLink: function() {
        //I can't trust backbone's event handler for this one
        var that = this;

        var $rulesLink = $(".viewrules a").off().click(function(e) {
            that.displayRules(e);
        });
    },

    displayRules:function(e) {
        e.preventDefault();

        var that = this,
            $trigger = $(e.target),
            sheetTitle = $trigger.data('sheetTitle'),
            $content = this.$el.find('.rulestoview').clone(),
            escapedContent = $("<div />").html($content).text(), //crazy html decoding
            $sheetModal;

            console.log($trigger);

        if ($trigger.is("i")){
            $trigger = $(e.target).closest("a");
        } //click events bubble, causing two qtips for both the i and the a tags. This stops that

        if( $content && !that.modalShowing){

            if(!$sheetModal) {
                // find a sheetModal...somewhere (likely in the globalfooter view)
                // it does seem like TemplateManager would be a good thing to use here
                $sheetModal = $('#sheetOverlayModal').detach();

                // move it to body
                $('body').append($sheetModal);

                $sheetModal.on('hidden',function(){
                    $sheetModal.find('.modal-body').empty();
                    $sheetModal.find('.sheetOverlayModalTitle').empty();
                });

                // create modal
                $sheetModal.modal({
                    backdrop:true,
                    keyboard:true,
                    show:false
                });

            }

            //set the title for the modal
            $sheetModal.find('.sheetOverlayModalTitle').text(sheetTitle||"No sheetTitle found on rules link");

            $sheetModal.find(".modal-body").html(escapedContent);

            $sheetModal.modal('show');
        }

    },

    renderLeaderboard:function(boardId, opts) {
        var thisView = this,
            defaults = {
                $target  : this.$el, // jQ object
                classes  : null,     // array
                callback : null      // function
            },
            settings = opts ? _.defaults(opts, defaults) : defaults,
            board = this.model.length > 0 ? this.model.get(boardId) : this.model,
            tplName = 'leaderboardModel',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'leaderboard/tpl/';

        // add a spinner
        G5.util.showSpin(settings.$target);

        // check to see if we have any leaders in the model. If not, go get 'em
        if( !board.isDetailLoaded() ) {

            board.on('loadDataFinished', function() {
                thisView.renderLeaderboard(boardId, opts);
            });

            board.loadData();

            return;
        }

        TemplateManager.get(tplName,function(tpl,vars,subTpls){
            var boardJson;

            // obj ref for sharing the tpl
            thisView.subTpls = subTpls;
            thisView.tplVariables = vars;

            // create a flag for the state of the leaderboard using the setId
            board.set( board.get('setId')+'Flag', true);

            // add classes for styling
            thisView.preProcessLeaders(board);

            // add the classes passed to the renderLeaderboard function to the JSON
            board.set('classes', settings.classes);

            // creat a JSON clone, now we won't touch the Model
            boardJson = board.toJSON();


            // each leaderboard has a special CM key containing the full translated string for the "As of" text
            // the key ouput will have a {0} placeholder where the activityDate value is inserted
            // this allows the translations to have plain text and the activityDate in any order
            // we embed this CM output as a tplVariable in our leaderboardModel Handlebars template
            // we also have an activityDate subTpl embedded in our leaderboardModel Handlebars template
            // we pass the leaderboard.activityDate value from the JSON to the subTpl, then replace the {0} with the rendered output
            // the final string is assigned to leaderboard.activityDateFormatted in the JSON to be passed to the main template
            if(thisView.tplVariables.activityDate) {
                boardJson.activityDateFormatted = G5.util.cmReplace({
                    cm: thisView.tplVariables.activityDate,
                    subs: [
                        thisView.subTpls.activityDate({activityDate: boardJson.activityDate})
                    ]
                });
            }


            thisView.findAndAddCols(boardJson);

            G5.util.hideSpin(settings.$target);
            settings.$target.find('#leaderboard'+boardJson.id).remove(); // clear out old one
            settings.$target[settings.$target.closest('.module').length?'append':'html']( tpl(boardJson) );

            // render columns
            thisView.renderColumns(thisView.subTpls.leaderTpl, boardJson);

            console.log('[INFO] LeaderboardModelView: Leaderboard rendered inside', settings.$target, 'with classes', settings.classes, 'added');

            thisView.trigger('renderLeaderboardDone');

        },tplUrl);

    },

    // re-render all board leaders
    // * assumes render has occured
    reRenderLeaders: function(){
        var that = this;
        _.each(this.model.models, function(m) {
            var mJson = m.toJSON();
            that.findAndAddCols(mJson);
            that.renderColumns(that.subTpls.leaderTpl,mJson);
        });
    },

    renderColumns: function(tpl, boardJson) {
        var $thisBoard = this.$el.find('#leaderboard'+boardJson.id),
            $colA = $thisBoard.find('.leadersColA'),
            $colB = $thisBoard.find('.leadersColB');

        $colA.empty().append(tpl({leaders: boardJson.leadersColA}));
        if (boardJson.leadersColB){
            $colA.removeClass("leaders-col-b-empty");
            $colB.empty().append(tpl({leaders: boardJson.leadersColB}));
        }else{
            $colB.empty();
            $colA.addClass("leaders-col-b-empty"); //column a is allowed to go 100% width now
        }
    },

    preProcessLeaders: function(board) {
        var that = this,
            hlUserIdx = false;

        // if the board has leaders, do some pre-processing
        if( !board.get('_preProcessed') && board.get('leaders').length ) {

            // iterate through all the leaders and look for ties
            _.each(board.get('leaders'), function(leader, key, list) {
                leader.classes = [];

                if(!leader.rank) {
                    if(key > 0 && leader.score == list[key-1].score) {
                        leader.rank = list[key-1].rank;
                        leader.tied = true;
                        leader.classes.push('tied');
                    }
                    else {
                        leader.rank = key+1;
                    }
                }

                if(leader.rank > board.get('leaders').length) {
                    leader.outOfTop = true;
                    leader.classes.push('outOfTop');
                }

                if(leader.currentUser) {
                    leader.classes.push('you');
                    leader.highlightedUser = true;
                    hlUserIdx = key; // keep track of the index of the highlighted user
                }


                // each leaderboard has a special CM key containing the full translated string for the "Your rank" text
                // the key ouput will have a {0} placeholder where the rank value is inserted
                // this allows the translations to have plain text and the rank in any order
                // we embed this CM output as a tplVariable in our leaderboardModel Handlebars template
                // we also have an largeRankText subTpl embedded in our leaderboardModel Handlebars template
                // we pass the leader.rank value from the JSON to the subTpl, then replace the {0} with the rendered output
                // the final string is assigned to leader.rankFormatted in the JSON to be passed to the main template
                if(that.tplVariables.largeRankText) {
                    leader.rankFormatted = G5.util.cmReplace({
                        cm: that.tplVariables.largeRankText,
                        subs: [
                            that.subTpls.largeRankText({rank: leader.rank})
                        ]
                    });
                }


                leader.classes.push((key+1)%2===0?'even':'odd'); // even or odd
            });

            // if there is no currentUser flagged in the data, push the 1st place person to the highlighted position
            if( !hlUserIdx ) {
                board.get('leaders')[0].highlightedUser = true;
                hlUserIdx = 0;
            }

        } // END IF board has leaders pre-processing

        // flag this so we don't do it again
        board.set('_preProcessed',true);
    },

    // generate two columns appropriate for current view
    findAndAddCols: function(boardJson) {
        var l, // leaders subset // used and abused for calculations
            p, // split point // used and abused for calculations
            shortNum = 4, // rows per column for module with height of 2 grid units (module)
            tallNum = 12, // rows per column for module with height of 4 grid units (module)
            breakNum = 8, // num rows after which to break results into 2 columns (page mode)
            isShort = this.$el.closest('.module.grid-dimension-4x2,.module.grid-dimension-2x2').length>0,
            isNarrow = this.$el.closest('.module.grid-dimension-2x2').length>0,
            isTall = this.$el.closest('.module.grid-dimension-4x4').length>0;

        // if we have enough records, split into columns
        // first column should have an even length for 'even'/'odd' styles to line up
        // module mode 4x2, 2x2
        if(isShort && boardJson.leaders.length>shortNum) {
            // module mode 2x2
            if(isNarrow) {
                l = _.first(boardJson.leaders, shortNum);
                p = l.length; // first col needs to be even
            }
            // module mode 4x2
            else {
                l = _.first(boardJson.leaders, shortNum * 2);
                p = Math.floor(l.length / 2); // first col needs to be even
            }
        }
        // module mode 4x4
        else if(isTall && boardJson.leaders.length>tallNum) {
            l = _.first(boardJson.leaders, tallNum * 2);
            p = Math.floor(l.length / 2); // first col needs to be even
        }
        // page mode long list
        else if(!isShort && !isTall && boardJson.leaders.length>=breakNum) {
            l = boardJson.leaders;
            p = Math.floor(l.length / 2); // first col needs to be even
        }
        // page mode short list
        else {
            l = boardJson.leaders;
            p = l.length;
        }
        boardJson.leadersColB = _.rest(l,p).length ? _.rest(l,p) : null;
        boardJson.leadersColA = _.first(l,p);

        // we have to make sure columnB starts with an odd item for striping purposes
        // why? because any time a leaderboard has an even number of leaders where leaders.length/2 == [odd number], the second column would start with an even item and break the stripes
        console.log(boardJson.leadersColB);
        if( boardJson.leadersColB && _.indexOf( _.first(boardJson.leadersColB).classes, 'even' ) >= 0 ) {
            _.each(boardJson.leadersColB, function(leader, i) {
                leader.classes.push(i%2===0?'oddB':'evenB');
            });
        }
    },

    attachParticipantPopover:function(e){
        var $tar = $(e.target);
        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $(e.target).participantPopover().qtip('show');
        }
        e.preventDefault();
    }

});
