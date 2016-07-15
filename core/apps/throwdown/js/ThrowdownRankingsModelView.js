/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
ThrowdownRankingsModelView:true
*/
ThrowdownRankingsModelView = Backbone.View.extend({
    initialize:function(opts){
        var that = this;

        this.on("renderRankingsDone", function() {
            that.bindRuleLink();
        });

        this.model.on("loadDataFinished", function(){
            that.pageRerenderLeaders();
        });
    },
    events:{
        'click .leaderName' : 'attachParticipantPopover'
    },
    bindRuleLink: function() {
        var that = this,
            $rulesLink = $(".viewrules").off().click(function(e) {
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
    renderRankings:function(boardId, opts) {
        var thisView = this,
            defaults = {
                $target  : this.$el, // jQ object
                classes  : null,     // array
                callback : null      // function
            },
            settings = opts ? _.defaults(opts, defaults) : defaults,
            board = this.model.length > 0 ? this.model.get(boardId) : this.model,
            tplName = 'throwdownRankingsModel',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'throwdown/tpl/';

        // add a spinner
        G5.util.showSpin(settings.$target);

        TemplateManager.get(tplName,function(tpl,vars,subTpls){
            var boardJson;

            // obj ref for sharing the tpl
            thisView.leaderTpl = subTpls.leaderTpl;
            thisView.topRankedTpl = subTpls.topRankedTpl;
            thisView.paginationTpl = subTpls.paginationTpl;

            // create a flag for the state of the rankings using the setId
            board.set( board.get('setId')+'Flag', true);

            // add classes for styling
            thisView.preProcessLeaders(board);

            // add the classes passed to the renderRankings function to the JSON
            board.set('classes', settings.classes);

            // creat a JSON clone, now we won't touch the Model
            boardJson = board.toJSON();

            thisView.findAndAddCols(boardJson);

            thisView.addTopRanked(boardJson);

            G5.util.hideSpin(settings.$target);

            settings.$target.find('#rankings'+boardJson.id).remove(); // clear out old one
            settings.$target.append( tpl(boardJson) );

            thisView.renderPagination();

            // render columns
            thisView.renderColumns(subTpls.leaderTpl, boardJson);

            // render top ranked
            thisView.renderTopRanked(subTpls.topRankedTpl, boardJson);

            console.log('[INFO] ThrowdownRankingsModelView: Rankings rendered inside', settings.$target, 'with classes', settings.classes, 'added');

            thisView.trigger('renderRankingsDone');

        },tplUrl);
    },
    pageRerenderLeaders: function(boardId, opts) {
        var thisView = this,
            defaults = {
                $target  : this.$el, // jQ object
                classes  : null,     // array
                callback : null      // function
            },
            settings = opts ? _.defaults(opts, defaults) : defaults,
            board = this.model.length > 0 ? this.model.get(boardId) : this.model,
            tplName = 'throwdownRankingsModel',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'throwdown/tpl/';

        TemplateManager.get(tplName,function(tpl,vars,subTpls){
            var boardJson;

            // obj ref for sharing the tpl
            thisView.leaderTpl = subTpls.leaderTpl;
            thisView.paginationTpl = subTpls.paginationTpl;

            // create a flag for the state of the rankings using the setId
            board.set( board.get('setId')+'Flag', true);

            // add classes for styling
            board.unset('_preProcessed')

            thisView.preProcessLeaders(board);

            // add the classes passed to the renderRankings function to the JSON
            board.set('classes', settings.classes);

            // creat a JSON clone, now we won't touch the Model
            boardJson = board.toJSON();

            thisView.findAndAddCols(boardJson);

            //clear columns
            thisView.$el.find('.leadersContainer ol').html('');

            // render columns
            thisView.renderColumns(subTpls.leaderTpl, boardJson);

            console.log('[INFO] ThrowdownRankingsModelView: Rankings rendered inside', settings.$target, 'with classes', settings.classes, 'added');

            thisView.trigger('renderRankingsDone');

        },tplUrl);

        G5.util.hideSpin(this.$el.find('.leadersContainer'));
    },
    // re-render all board leaders for module
    // * assumes render has occured
    reRenderLeaders: function(){
        var that = this;

        _.each(this.model.models, function(m) {
            var mJson = m.toJSON();
            that.findAndAddCols(mJson);
            that.renderColumns(that.leaderTpl,mJson);
        });
    },
    renderColumns: function(tpl, boardJson) {
        var $thisBoard = this.$el.find('#rankings'+boardJson.id),
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
    renderTopRanked: function(tpl, boardJson) {
        var $thisBoard = this.$el.find('#rankings'+boardJson.id),
            $firstPlace = $thisBoard.find('.first-place'),
            $secondPlace = $thisBoard.find('.second-place'),
            $thirdPlace = $thisBoard.find('.third-place');

            if (boardJson.firstPlace && !$.isEmptyObject(boardJson.firstPlace)) {
                $firstPlace.empty().append(tpl({badgeHolders: boardJson.firstPlace})).css('visibility', 'visible');
            }
            if (boardJson.secondPlace && !$.isEmptyObject(boardJson.secondPlace)) {
                $secondPlace.empty().append(tpl({badgeHolders: boardJson.secondPlace})).css('visibility', 'visible');
            }
            if (boardJson.thirdPlace && !$.isEmptyObject(boardJson.thirdPlace)) {
                $thirdPlace.empty().append(tpl({badgeHolders: boardJson.thirdPlace})).css('visibility', 'visible');
            }
    },
    preProcessLeaders: function(board) {
        var hlUserIdx = false,
        page = board.get('currentPage');

        // if the board has leaders, do some pre-processing
        if( !board.get('_preProcessed') && board.get('leaders').length ) {
            // iterate through all the leaders and look for ties
            _.each(board.get('leaders'), function(leader, key, list) {
                leader.classes = [];

                if(!leader.rank) {
                    if(key > 0 && leader.score == list[key-1].score) {
                        leader.rank = page*(key-1);
                        leader.tied = true;
                        leader.classes.push('tied');
                    }
                    else {
                        leader.rank = (page-1)*board.get('leadersPerPage')+(key+1);
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
        var l, // used and abused for calculations
            shortNum = 5, // rows per column for module with height of 2 grid units (module)
            tallNum = 12, // rows per column for module with height of 4 grid units (module)
            breakNum = 8, // num rows after which to break results into 2 columns (page mode)
            isShort = this.$el.closest('.module.grid-dimension-4x2,.module.grid-dimension-2x2').length>0,
            isTall = this.$el.closest('.module.grid-dimension-4x4').length>0;

        // if we have enough records, split into columns
        // first column should have an even length for 'even'/'odd' styles to line up
        // module mode 4x2, 2x2
        if(isShort && boardJson.leaders.length>=shortNum) {
            l = boardJson.leaders.length;
            boardJson.leadersColB = boardJson.leaders.slice(shortNum, l>shortNum*2?shortNum*2:l); // first col needs to be even
            boardJson.leadersColA = _.first(boardJson.leaders,shortNum);
        }
        // module mode 4x4
        else if(isTall && boardJson.leaders.length>=tallNum) {
            l = boardJson.leaders.length;
            boardJson.leadersColB = boardJson.leaders.slice(tallNum, l>tallNum*2?tallNum*2:l); // first col needs to be even
            boardJson.leadersColA = _.first(boardJson.leaders,tallNum);
        }
        // page mode long list
        else if(boardJson.leaders.length>=breakNum) {
            l = Math.floor(boardJson.leaders.length/2);
            l = l%2===0?l:l+1; // make sure length is even
            boardJson.leadersColA = _.first(boardJson.leaders,l);
            boardJson.leadersColB = _.rest(boardJson.leaders,l);
        }
        // page mode short list
        else {
            boardJson.leadersColA = boardJson.leaders;
        }
    },
    paginationClickHandler: function(page) {
        G5.util.showSpin( this.$el.find('.leadersContainer'), {
            cover : true
        } );
        this.model.set('currentPage', page);
        this.rankingsPagination.model.set('current', page);

        this.model.loadData({force: true, pageNumber : page,
            type : 'getLeaders'
        });
    },
    addTopRanked: function(boardJson) {
        var isModule = this.$el.closest('.module.grid-dimension-4x2,.module.grid-dimension-4x2,.module.grid-dimension-2x2').length>0;

        if(!isModule){
            boardJson.firstPlace = boardJson.badgeHolders[0];
            boardJson.secondPlace = boardJson.badgeHolders[1];
            boardJson.thirdPlace = boardJson.badgeHolders[2];
        }
    },
    attachParticipantPopover:function(e){
        var $tar = $(e.target);

        if(!$tar.data('participantPopover')){
            $(e.target).participantPopover().qtip('show');
        }
        e.preventDefault();
    },
    renderPagination: function() {
        var thisView = this,
            isModule = this.$el.closest('.module.grid-dimension-4x2,.module.grid-dimension-4x2,.module.grid-dimension-2x2').length>0;

        // if our data is paginated, add a special pagination view
        if(!isModule &&  thisView.model.get('toalNumberLeaders') > thisView.model.get('leadersPerPage')) {
            // if no pagination view exists, create a new one
            if( !thisView.rankingsPagination) {
                thisView.rankingsPagination = new PaginationView({
                    el : thisView.$el.find('.paginationControls'),
                    pages : Math.ceil( thisView.model.get('toalNumberLeaders') /thisView.model.get('leadersPerPage')),
                    current : thisView.model.get('currentPage'),
                    ajax : true,
                    tpl : thisView.paginationTpl || false
                });

                this.rankingsPagination.on('goToPage', function(page) {
                    thisView.paginationClickHandler(page);
                });

                this.model.on('fullDataLoaded', function() {
                    thisView.rankingsPagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.model.get('toalNumberLeaders') /thisView.model.get('leadersPerPage')),
                        current : thisView.model.get('currentPage')
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.rankingsPagination.setElement( thisView.$el.find('.paginationControls') );
            }
        }
    }
});
