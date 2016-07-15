/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
ModuleView,
TemplateManager,
ThrowdownAllMatchesModuleView:true
*/
ThrowdownAllMatchesModuleView = ModuleView.extend({
    tplLoaded  : false, // both the template and the data need to be ready before trying to render
    dataLoaded : false,

    initialize: function(opts){
        var thisView = this;

		//this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

		//inherit events from the superclass ModuleView
        this.events = _.extend({}, ModuleView.prototype.events, this.events);

        this.model.set(
            'allowedDimensions', [
                { w:2, h:2 },
                { w:4, h:2 }
            ],
            { silent: true }
        );

		// save the initial order value for this module (for hiding/showing module)
        G5.throwdown.moduleOrder.allMatches = this.model.get('filters').throwdown.order;

        this.trigger('geometryChanged');

		G5.throwdown.dispatcher.on('promotionsLoaded', function(){
			thisView.throwdownAllMatchesModel = new ThrowdownAllMatchesModel({'json' : opts.allMatchesJson, 'jsonUrl': opts.allMatchesJsonUrl});
			thisView.throwdownAllMatchesTeamModel = new ThrowdownAllMatchesTeamModel({'json' : opts.allMatchesTeamJson, 'jsonUrl': opts.allMatchesTeamJsonUrl});

			this.on('templateLoaded', function(tpl, vars, subTpls) {
				this.throwdownAllMatchesTpl = subTpls.throwdownAllMatchesTpl;
				this.throwdownAllMatchesTeamTpl = subTpls.throwdownAllMatchesTeamTpl;
				this.roundPaginationTpl = subTpls.roundPaginationTpl;

				this.spinModule(true);
				this.tplLoaded = true;
				this.initAllMatches();
				this.initAllTeamMatches();
                this.renderTabPopover();
                
				thisView.throwdownAllMatchesModel.on('loadAllMatchesDataFinished', function() {
					this.dataLoaded = true;
					this.initAllMatches();
				}, this);

				thisView.throwdownAllMatchesTeamModel.on('loadAllMatchesTeamDataFinished', function() {
					this.dataLoaded = true;
					this.initAllTeamMatches();
				}, this);

				G5.throwdown.dispatcher.on('promoChanged', function(){
					thisView.resetView(opts, thisView)
				}, this);

			}, this);

		}, this);
    },
	events: {
		'click .roundPagination a': 'roundClickHandler',
		'click .profile-popover': 'attachParticipantPopover'
	},
    initAllMatches: function(e) {
		var thisView = this,
			$globalTab = this.$el.find('.allMatchesTabs li.tabGlobal'),
			$allMatchesCont = this.$el.find('.allMatchesTable').html(''),
			$roundCont = this.$el.find('.roundPagination').html('');

        // empty the element in cases where the view needs to be rerendered with new data
        $allMatchesCont.empty();
		$roundCont.empty();

		$allMatchesCont.removeClass('emptySet');

		//when template manager has the template, render it to this element
		$allMatchesCont.append( thisView.subTpls.throwdownAllMatchesTpl( _.extend({}, thisView.throwdownAllMatchesModel.toJSON()) ));

		if(thisView.throwdownAllMatchesModel.get('totalRounds') >= thisView.throwdownAllMatchesModel.get('currentRound')) {
			opts = {
				currentRound: thisView.throwdownAllMatchesModel.get('currentRound'),
				totalRounds: thisView.throwdownAllMatchesModel.get('totalRounds')
			};

			$roundCont.append( thisView.subTpls.roundPaginationTpl( _.extend({}, thisView.throwdownAllMatchesModel.toJSON()), opts ));
		}

        if(thisView.throwdownAllMatchesModel.length===0) {
            thisView.$el.find('.allMatchesTable')
                .addClass('emptySet')
                .append(this.make('h2',{},this.$recs.data('msgEmpty')))
                .find('h2').prepend('<i class="icon-g5-norecognitions" />');
        }
        this.processData();

        thisView.spinModule(false);

        // remove the spinner after changing rounds(pagination)
        G5.util.hideSpin(this.$el.find('.wide-view'));

        return this;
    },
	initAllTeamMatches: function(){
		var thisView = this,
			$teamTab = this.$el.find('.allMatchesTabs li.tabTeam'),
			$allMatchesTeamCont = this.$el.find('.allMatchesTeamTable').html(''),
			$roundCont = this.$el.find('.roundPagination').html('');

		// empty the element in cases where the view needs to be rerendered with new data
        $allMatchesTeamCont.empty();
		$roundCont.empty();

		$allMatchesTeamCont.removeClass('emptySet');

		//when template manager has the template, render it to this element
		$allMatchesTeamCont.append( thisView.subTpls.throwdownAllMatchesTeamTpl( _.extend({}, thisView.throwdownAllMatchesTeamModel.toJSON()) ));

		if(thisView.throwdownAllMatchesTeamModel.get('totalRounds') >= thisView.throwdownAllMatchesTeamModel.get('currentRound')) {
			opts = {
				currentRound: thisView.throwdownAllMatchesTeamModel.get('currentRound'),
				totalRounds: thisView.throwdownAllMatchesTeamModel.get('totalRounds')
			};
			$roundCont.append( thisView.subTpls.roundPaginationTpl( _.extend({}, thisView.throwdownAllMatchesTeamModel.toJSON()), opts ));
		}

        if(thisView.throwdownAllMatchesTeamModel.length===0) {
           thisView.$el.find('.allMatchesTeamTable')
                .addClass('emptySet')
                .append(this.make('h2',{},this.$recs.data('msgEmpty')))
                .find('h2').prepend('<i class="icon-g5-norecognitions" />');
        }

        this.processData();
	},
    renderTabPopover: function(){
        var $tooltipParent = $('.allMatchesTabs li a');

         _.each($tooltipParent,function(){
            //give the <a> a tooltip
            $tooltipParent.tooltip({
                template: '<div class="tooltip smack-talk-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
                container: 'body',
                delay: 200
            });

        });
   },
	updateHref: function() {
        this.$el
            .find('.visitAppBtn')
            .attr( 'href', this.throwdownAllMatchesModel.get('allMatchesUrl') );
    },
	processData: function() {
        var filters = this.model.get('filters'),
            visible = this.throwdownAllMatchesModel.get('visible');

        this.throwdownAllMatchesModel.get('visible');

        if (visible) {
            // set the order in case the module is currently hidden
            filters.throwdown.order = G5.throwdown.moduleOrder.allMatches;
            this.updateHref();
        } else {
            filters.throwdown.order = 'hidden';
        }

        this.model.trigger('change');
    },
	resetView: function(opts, thisView) {
        thisView.$el.find('.allMatchesTable').children().fadeOut(300);
        thisView.spinModule(true);

		thisView.throwdownAllMatchesModel = new ThrowdownAllMatchesModel({'json' : opts.allMatchesJson, 'jsonUrl': opts.allMatchesJsonUrl});
		thisView.throwdownAllMatchesTeamModel = new ThrowdownAllMatchesTeamModel({'json' : opts.allMatchesTeamJson, 'jsonUrl': opts.allMatchesTeamJsonUrl});

		thisView.throwdownAllMatchesModel.on('loadAllMatchesDataFinished', function() {
            thisView.dataLoaded = true;
			thisView.initAllMatches();

		}, thisView);

		thisView.throwdownAllMatchesTeamModel.on('loadAllMatchesTeamDataFinished', function() {
			thisView.dataLoaded = true;
			thisView.initAllTeamMatches();

		}, thisView);
    },
	spinModule: function(start) {
        if (start) {
            this.$el.closest('.module')
                .append('<span class="spin" />')
                .find('.spin').spin();
        } else {
            this.$el.closest('.module')
                .find('.spin').remove();
        }
    },
    roundClickHandler: function(e) {
        var type;

        if(this.$el.find(e.target).parents('li').hasClass('disabled')){
            return;
        }
        if(this.$el.find(e.target).parents('li').hasClass('prev')){
			G5.util.showSpin( this.$el.find('.wide-view'), {
				cover : true
			});
            type = 'prevRound';
        }else{
			G5.util.showSpin( this.$el.find('.wide-view'), {
				cover : true
			});
            type = 'nextRound';
        }
        this.throwdownAllMatchesModel.update({
            type : type
        });
		this.throwdownAllMatchesTeamModel.update({
            type : type
        });
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
