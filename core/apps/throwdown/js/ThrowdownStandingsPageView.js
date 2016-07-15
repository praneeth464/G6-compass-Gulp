/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
 _,
 PageView,
 ThrowdownStandingsPageView:true
 */
ThrowdownStandingsPageView = PageView.extend({
    initialize: function(opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'throwdownStandings';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create standings model
        self.throwdownStandingsModel = new ThrowdownStandingsModel({'json' : opts.standingsJson, 'jsonUrl': opts.standingsJsonUrl});

        //If model did not have data, it feches data from server, page then renders on 'loadStandingsDataFinished'
        self.throwdownStandingsModel.on('loadStandingsDataFinished', function(standingsJson) {
            self.processTabularData();
            self.renderStandings();
        });

         //create matches model
        self.throwdownAllMatchesModel = new ThrowdownAllMatchesModel({'json' : opts.allMatchesJson, 'jsonUrl': opts.allMatchesJsonUrl});

        //If model did not have data, it feches data from server, page then renders on 'loadAllMatchesDataFinished'
        self.throwdownAllMatchesModel.on('loadAllMatchesDataFinished', function(allMatchesJson) {
            self.renderAllMatches();
        });

        this.shellRouter = new Backbone.Router({
            routes: {
                "*other": "loadTab"
            }
        });
        this.shellRouter.on("route:loadTab", function (name,params) {
            if (name === "Standings") {
                self.$el.find('li.tab'+name+' a').trigger("click");

            }
            else if (name === "Matches") {
                self.$el.find('li.tab'+name+' a').trigger("click");
            }
            console.log("[THROWDOWN!@!#]", name);
            self.currentTabName = name;
        });

        if ( !Backbone.History.started ) {
            Backbone.history.start();
        }

    },
    events: {
      'click .standingsTable .sortable a' : 'tableClickHandler',
      'click .roundPagination a': 'roundClickHandler',
	  'click .profile-popover': 'attachParticipantPopover',
      'change #promotionSelect': 'changePromo',
      'change #matchesSelect': 'changeDisplay',
      'click .nav-tabs a': 'tabClicked'
    },
    tabClicked:function(e){

        if(window.location.hash != $(e.target).attr('href')){
            window.location.hash = $(e.target).attr('href');
        }

    },
    changePromo: function(e) {
        var thisView = this,
            $standingsCont = this.$el.find('#standings-tab'),
            $matchesCont = this.$el.find('#matches-tab');

        //submit the page data
        $(e.target).closest('form').submit();

        //empty the models
        $standingsCont.empty();
        $matchesCont.empty();

        //re-render the models
        this.throwdownStandingsModel.loadStandingsData();
        thisView.renderStandings();
        this.throwdownAllMatchesModel.loadRoundData();
        thisView.renderAllMatches();

    },
    changeDisplay: function(e){
        var thisView = this,
            $standingsCont = this.$el.find('#standings-tab'),
            $matchesCont = this.$el.find('#matches-tab'),
            promotionId = this.$el.find('#promotionSelect').val(),
            promoInput = $('<input>').attr({
                             type: 'hidden',
                             id: 'promotionId',
                             name: 'promotionId',
                             value: promotionId
                         });

        //submit the page data
        $(e.target)
            .closest('form')
            .append(promoInput)
            .submit();

        //empty the models
        $standingsCont.empty();
        $matchesCont.empty();

        //re-render the models
        this.throwdownStandingsModel.loadStandingsData();
        thisView.renderStandings();
        this.throwdownAllMatchesModel.loadRoundData();
        thisView.renderAllMatches();
    },
    renderStandings: function() {
        var $standingsCont = this.$el.find('.standingsTable').html(''),
            $standingsParent = this.$el.find('.standingsTable'),
            self = this,
            tplName = 'throwdownStandingsPage',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'throwdown/tpl/';

        G5.util.hideSpin( this.$el.find('#Standings') );

        //Push Discussion values to template
        TemplateManager.get('throwdownStandingsTable', function(tpl) {
            $standingsCont.append(tpl(self.throwdownStandingsModel.toJSON()));
        });

        TemplateManager.get(tplName,function(tpl,vars,subTpls){
            self.matchesStandingsPaginationTpl = subTpls.matchesStandingsPaginationTpl;
            self.renderStandingsPagination();

        },tplUrl);

		this.$el.find('.standingsTable tbody tr:even').addClass('stripe');
    },
    renderAllMatches: function() {
        var $matchesCont = this.$el.find('.allMatchesTable').html(''),
            $roundCont = this.$el.find('.roundPagination').html(''),
            self = this,
            opts,
            tplName = 'throwdownStandingsPage',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'throwdown/tpl/';

        G5.util.hideSpin( this.$el.find('#Matches') );

        //Push Discussion values to template
        TemplateManager.get('throwdownAllMatchesTable', function(tpl) {
            $matchesCont.append(tpl(self.throwdownAllMatchesModel.toJSON()));
        });

        if(self.throwdownAllMatchesModel.get('totalRounds') >= self.throwdownAllMatchesModel.get('currentRound')) {
            TemplateManager.get(tplName,function(tpl,vars,subTpls){
                self.roundPaginationTpl = subTpls.roundPaginationTpl;
                opts = {
                	currentRound: self.throwdownAllMatchesModel.get('currentRound'),
                    totalRounds: self.throwdownAllMatchesModel.get('totalRounds'),
                    roundStartDate: self.throwdownAllMatchesModel.get('roundStartDate'),
                    roundEndDate: self.throwdownAllMatchesModel.get('roundEndDate'),
                    progressEndDate: self.throwdownAllMatchesModel.get('progressEndDate'),
                    promotionOverview: self.throwdownAllMatchesModel.get('promotionOverview'),
                    isProgressLoaded: self.throwdownAllMatchesModel.get('isProgressLoaded'),
                    roundCompleted: self.throwdownAllMatchesModel.get('roundCompleted')
                };
                $roundCont.append(self.roundPaginationTpl(opts));

            },tplUrl);
        }

        if(self.throwdownAllMatchesModel.get('roundScheduled') === true){
            if(self.throwdownAllMatchesModel.get('totalMatches') > self.throwdownAllMatchesModel.get('matchesPerPage')) {
                TemplateManager.get(tplName,function(tpl,vars,subTpls){
                    self.matchesStandingsPaginationTpl = subTpls.matchesStandingsPaginationTpl;
                    self.renderAllMatchesPagination();

                },tplUrl);
                $('.allMatchesPagination').show();
            }else {
                $('.allMatchesPagination').hide();
            }
            $('.allMatchesPagination').show();
        }else {
            $('.allMatchesPagination').hide();
        }
		this.$el.find('.allMatchesTable tbody tr:even').addClass('stripe');
    },
    renderStandingsPagination: function() {
        var thisView = this;

        // if our data is paginated, add a special pagination view
        if(thisView.throwdownStandingsModel.get('totalStandings') > thisView.throwdownStandingsModel.get('standingsPerPage')) {
            // if no pagination view exists, create a new one
            if( !thisView.standingsPagination ) {
                thisView.standingsPagination = new PaginationView({
                    el : thisView.$el.find('.standingsPagination'),
                    pages : Math.ceil( thisView.throwdownStandingsModel.get('totalStandings') /thisView.throwdownStandingsModel.get('standingsPerPage')),
                    current : thisView.throwdownStandingsModel.get('currentPage'),
                    ajax : true,
                    tpl : thisView.standingsPaginationTpl || false
                });

                this.standingsPagination.on('goToPage', function(page) {
                    thisView.standingsPaginationClickHandler(page);
                });

                this.throwdownStandingsModel.on('loadStandingsDataFinished', function() {
                    thisView.standingsPagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.throwdownStandingsModel.get('totalStandings') /thisView.throwdownStandingsModel.get('standingsPerPage')),
                        current : thisView.throwdownStandingsModel.get('currentPage')
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.standingsPagination.setElement( thisView.$el.find('.standingsPagination') );
            }
        }
    },
    renderAllMatchesPagination: function() {
        var thisView = this;

        // if our data is paginated, add a special pagination view
        if(thisView.throwdownAllMatchesModel.get('totalMatches') > thisView.throwdownAllMatchesModel.get('matchesPerPage')) {
            // if no pagination view exists, create a new one
            if( !thisView.allMatchesPagination ) {
                thisView.allMatchesPagination = new PaginationView({
                    el : thisView.$el.find('.allMatchesPagination'),
                    pages : Math.ceil( thisView.throwdownAllMatchesModel.get('totalMatches') /thisView.throwdownAllMatchesModel.get('matchesPerPage')),
                    current : thisView.throwdownAllMatchesModel.get('currentPage'),
                    ajax : true,
                    tpl : thisView.matchesStandingsPaginationTpl || false
                });

                this.allMatchesPagination.on('goToPage', function(page) {
                    thisView.allMatchesPaginationClickHandler(page);
                });

                this.throwdownAllMatchesModel.on('loadAllMatchesDataFinished', function() {
                    thisView.allMatchesPagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.throwdownAllMatchesModel.get('totalMatches') /thisView.throwdownAllMatchesModel.get('matchesPerPage')),
                        current : thisView.throwdownAllMatchesModel.get('currentPage')
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.allMatchesPagination.setElement( thisView.$el.find('.allMatchesPagination') );
            }
        }
    },
    standingsPaginationClickHandler: function(page) {
        G5.util.showSpin( this.$el.find('#Standings'), {
            cover : true
        });

        this.throwdownStandingsModel.update({
            force: true,
            data: {
                pageNumber : page
            },
            type : 'getStandings'
        });
    },
    allMatchesPaginationClickHandler: function(page) {
        G5.util.showSpin( this.$el.find('#Matches'), {
            cover : true
        });

        this.allMatchesPagination.model.set('current', page);

        this.throwdownAllMatchesModel.update({
            pageNumber : page,
            type : 'paginateMatches'
        });
    },
    roundClickHandler: function(e) {
        var type;

        if(this.$el.find(e.target).parents('li').hasClass('disabled')){
            return;
        }
        if(this.$el.find(e.target).parents('li').hasClass('prev')){
			G5.util.showSpin( this.$el.find('#Matches'), {
				cover : true
			});
            type = 'prevRound';
        }else{
			G5.util.showSpin( this.$el.find('#Matches'), {
				cover : true
			});
            type = 'nextRound';
        }
        this.throwdownAllMatchesModel.update({
            type : type
        });
    },
    processTabularData: function() {
        var self = this,
            tabularData = self.throwdownStandingsModel.get('tabularData');

            _.each(tabularData.meta.columns, function(col, place, list) {

                if( self.throwdownStandingsModel.get('sortedOn') == tabularData.meta.columns[place].id ) {
                    col.sortedOn = true;
                    col.sortedBy = self.throwdownStandingsModel.get('sortedBy') || 'desc';
                }

            });

        // iterate through each meta column
        _.each(tabularData.meta.columns, function(col, index, list) {
            // if the column is sortable
            if( col.sortable ) {
                // mark if this column is the one on which the table is sorted
                col.sortedOn = self.throwdownStandingsModel.get('sortedOn') == col.id ? true : false;
                // default to ascending sort, but mark with the actual sort state
                col.sortedBy = self.throwdownStandingsModel.get('sortedOn') == col.id ? self.throwdownStandingsModel.get('sortedBy') : 'desc';
                // Handlebars helper because #if can't compare values
                 col.sortedByDesc = col.sortedBy == 'desc' ? true : false;
            }
        });
    },

    tableClickHandler: function(e) {
        e.preventDefault();

        var thisView = this,
            $tar = $(e.target).closest('a');

        // for table headers
        if( $tar.closest('.sortable').length ) {
            var $newTar = $tar.closest('.sortable'),
                sortData = $newTar.data(),
                addlData = $.query.load( $newTar.find('a').attr('href'), {responseType: 'html'}, function(responseText, textStats, XMLHttpRequest){ G5.serverTimeout(responseText); } ).keys;

            G5.util.showSpin( this.$el.find('#Standings'), {
                cover : true
            } );

            this.throwdownStandingsModel.update({
                force: true,
                data: $.extend(
                    true,       // deep merge = true
                    {},         // start with an empty object
                    addlData,   // merge in addlData
                    {           // then overwrite with these values
                        pageNumber : 1,
                        sortedOn : sortData.sortById,
                        sortedBy : sortData.sortedOn === true && sortData.sortedBy == 'asc' ? 'desc' : 'asc'
                    }
                ),
                type : 'tabular'
            });
        }
    },
	attachParticipantPopover:function(e){
        var $tar = $(e.target),
            isSheet = ($tar.closest(".modal-stack").length > 0) ? {isSheet: true} : {isSheet: false};

        if ($tar.is("img")){
            $tar = $tar.closest("a");
        }

        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $tar.participantPopover(isSheet).qtip('show');
        }
        e.preventDefault();
    }
});