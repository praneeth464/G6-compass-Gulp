/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
BreadcrumbView,
EngagementSummaryCollectionView,
EngagementTeamMembersView,
EngagementModel,
EngagementModelView:true
*/
EngagementModelView = Backbone.View.extend({
    className : "engagementModelView",

    initialize: function() {
        console.log('[INFO] EngagementModelView: initialized', this);

        var that = this,
            defaults = {};

        this.options = $.extend(true, {}, defaults, this.options);

        this.tplName = this.options.tplName || 'engagementModel';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'engagement/tpl/';
        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            that.tpl = tpl;
            that.tplVars = vars;
            that.subTpls = subTpls;
        }, this.tplUrl, null, false); // noHandlebars = null, async = false


        // an array to hold our breadcrumb hierarchy
        this.crumbStack = [];

        // our data model
        this.model = this.options && this.options.model || new EngagementModel(null, { autoLoad:false, mode: this.options.mode || null });

        // model listeners
        this.model.on('loadDataStarted', function() {
            this.unrenderErrors();
            G5.util.showSpin(this.$el);
        }, this);
        this.model.on('loadDataDone', function() {
            G5.util.hideSpin(this.$el);
            this.render();
        }, this);
        this.model.on('loadDataReturnedErrors', function() {
            G5.util.hideSpin(this.$el);
            this.renderErrors();
        }, this);

        // ready for the model to go get the data
        this.model.loadData({
            timeframeType : this.options.timeframeType || 'month',
            timeframeMonthId : this.options.timeframeMonthId || new Date().getMonth(),
            timeframeYear : this.options.timeframeYear || new Date().getFullYear(),
            // userId is only used by user mode, nodeId by team mode
            userId : this.options.userId || null,
            nodeId : this.options.nodeId || null,
            // userName and nodeName are used when drilling down and are only being passed for convenience
            userName : this.options.userName || null,
            nodeName : this.options.nodeName || null
        });

        // view listeners
        this.on('renderDone', this.postRender, this);
    },

    events: {
        'click .timeframe a' : 'handleTimeframeClick',
        'change #nodeSelect' : 'handleNodeSelect'
    },

    render: function() {
        var json = this.model.toJSON();

        G5.util.showSpin(this.$el);

        this.preRender(json);

        this.$el.empty().append( this.tpl(json) );

        this._rendered = true;

        // trigger an event when rendering is done and pass along the rendered JSON just in case it's useful
        this.trigger('renderDone', json);
    },

    preRender: function(json) {
        json.mode = json.mode || this.options.mode;

        if( json.mode == 'team' ) {
            json.title = _.pluck(this.model.get('selectedNodes'), 'name').join(' | ');

            // check to see if we're rendering a drill-down
            if( this.model.params._drillDown ) {
                // doing nothing might actually work
                // which makes this a pretty stupid approach to the IF...ELSE IF, but let's try it for now
            }
            else if( this.model.get('nodes') && this.model.get('nodes').length > 1 ) {
                json.multiNode = true;
                json.allNodeNames = _.pluck(this.model.get('nodes'), 'name').join(' | ');
                json.allNodeIds = _.pluck(this.model.get('nodes'), 'id');
            }
        }
        else {
            json.title = json.userName;
        }

        // breadcrumbs
        this.processBreadcrumbData(json);

        return json;
    },

    postRender: function(json) {
        var that = this;

        // set up children views
        // -----------------
        // summary view is straightforward
        if( this.model.get('summary') ) {
            this.summaryView = new EngagementSummaryCollectionView({
                el : this.$el.find('.engagementSummaryCollectionView'),
                summary : this.model.get('summary'),
                startTab : this._currentTabNameId || this.options.summaryStartTab,
                engagementModel : this.model
            });
        }

        // detail views are trickier
        // loop through all the detail objects and create views and references
        if( this.model.get('detail') ) {
            this.detailViews = [];
            _.each(this.model.get('detail'), function(detail) {
                var viewType = detail.type.charAt(0).toUpperCase()+detail.type.slice(1), // capitalize
                    view;

                view = new window['EngagementDetail' + viewType + 'View']({
                    el : that.$el.find('.engagementDetailView'),
                    mode : that.model.get('mode'),
                    type : detail.type,
                    data : detail.data,
                    engagementModel : that.model,
                    engagementModelView : that
                });

                view.undelegateEvents();

                that.detailViews.push(view);
            });
        }

        // if the current dataset is in team mode, we need to do special things
        if( json.mode == 'team' && this.model.get('team') ) {
            this.teamMembersView = new EngagementTeamMembersView({
                el : this.$el.find('.engagementTeamMembersView'),
                team : this.model.get('team'),
                engagementModel : this.model
            });
        }

        // we only show a breadcrumb if the page was initialized as team view, regardless of the mode of the current dataset
        if( this.options.mode == 'team' ) {
            if( !this.breadcrumbView ) {
                this.breadcrumbView = new BreadcrumbView({
                    el : this.$el.find('#breadCrumbs'),
                    crumbs : _.pluck(this.crumbStack, "displayName"),
                    showRootWhenAlone : false,
                    ajax : true,
                    tpl : this.subTpls && this.subTpls.breadcrumbTpl || false
                });

                this.breadcrumbView.on('goToCrumb', function(crumb) {
                    that.handleBreadcrumbClick(crumb);
                });

                this.on('renderDone', function() {
                    that.breadcrumbView.setProperties({
                        crumbs : _.pluck(this.crumbStack, "displayName")
                    });
                });
            }
            else {
                this.breadcrumbView.setElement( this.$el.find('#breadCrumbs') );
            }
        }

        // set up children view listeners
        // -----------------
        // listen to the summaryView
        if( this.summaryView ) {
            this.summaryView.on('tabActivated', this.handleTabActivation, this);
        }

        // listen to the teamMembersView (when it exists)
        if( this.teamMembersView ) {
            this.teamMembersView.on('drillDown', this.handleDrillDown, this);
        }
    },

    renderErrors: function() {
        var errors = this.model.get('errors'),
            tpl = this.subTpls && this.subTpls.errors;

        // we need the timeframe bar to show up when there are errors
        // the easiest way to do this is to just call the full-on render method
        this.render();

        if( !tpl ) {
            TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
                tpl = subTpls.errors;
            }, this.tplUrl, null, false); // noHandlebars = null, async = false
        }

        this.$el.prepend(tpl(errors));
    },

    unrenderErrors: function() {
        this.$el.find('#errors').remove();
    },

    // json is the object used to render the page
    processBreadcrumbData: function(json) {
        var obj = {
                url : this.model.url,
                params : this.model.params,
                displayName : json.title
            };

        // never store the timeframe values in the breadcrumb stack
        obj.params = _.omit(obj.params, ['timeframeType','timeframeMonthId','timeframeYear','timeframeNavigate']);

        // if the current crumbStack is empty, store our parameters, url, and displayName
        if( this.crumbStack.length === 0 ) {
            this.crumbStack.push(obj);
        }
        else {
            // if we are drilling down, add the object to the crumbStack
            if( obj.params._drillDown === true ) {
                this.crumbStack.push(_.omit(obj, '_drillDown'));
            }
            // otherwise, update the existing crumbStack
            else {
                this.crumbStack[this.crumbStack.length-1] = obj;
            }
        }

        json.displayBreadcrumbs = this.crumbStack.length > 1;
    },

    handleTabActivation: function($tab, view) {
        var detailView = _.find(this.detailViews, function(v) { return v.options.type == view.model.get('type'); });

        // console.log($tab, view, detailView);
        if( this.activeDetailView ) {
            this.activeDetailView.$el.css('height', this.activeDetailView.$el.height());
            this.activeDetailView.destroy();
        }

        detailView.render();
        this.activeDetailView = detailView;
        this.activeDetailView.delegateEvents();

        if( this.options.mode == 'team' ) {
            this.teamMembersView.setType( this.activeDetailView.getType() );
        }

        // store current tab for drillDown or timeframe switching or other reasons
        this._currentTabNameId = view.nameId;

        this.trigger('tabActivated', $tab, view);
    },

    handleTimeframeClick: function(e) {
        var $tar = $(e.target).closest('a');

        e.preventDefault();

        this.loadData({
            timeframeType : $tar.data('timeframe'),
            timeframeMonthId : this.model.get('timeframeMonthId'),
            timeframeYear : this.model.get('timeframeYear'),
            timeframeNavigate : $tar.data('timeframeNav') ? $tar.data('timeframeNav') : false
        });
    },

    handleNodeSelect: function(e) {
        var $tar = $(e.target).closest('select');

        this.loadData({
            nodeId : $tar.val()
        });
    },

    handleDrillDown: function(data, url) {
        var params = {
                mode : data.userId ? 'user' : 'team',
                _drillDown : true
            };

        this.loadData($.extend({}, params, data), url);
    },

    handleBreadcrumbClick: function(crumb) {
        var obj = this.crumbStack[crumb];

        this.crumbStack = this.crumbStack.slice(0, crumb);

        this.loadData(obj.params, obj.url);
    },

    handleRoute: function(route) {
        if( this.summaryView ) {
            this.summaryView.showTabByName(route);
        }
        // assume the summaryView hasn't been created yet
        else {
            this.options.summaryStartTab = route;
        }
    },

    loadData: function(params, url) {
        var defaults = {
            timeframeNavigate : false
        };

        this.model.loadData($.extend({}, defaults, params), url);

        // hide the spinner that shows automatically with the .loadData and show a cover-up spinner instead
        G5.util.hideSpin(this.$el);
        G5.util.showSpin(this.$el, {cover:true});
    }
});
