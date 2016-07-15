/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
TemplateManager,
Backbone,
EngagementTeamMembersCollectionView,
EngagementTeamMembersView:true
*/
EngagementTeamMembersView = Backbone.View.extend({
    initialize: function() {
        console.log('[INFO] EngagementTeamMembersView: initialized', this);

        var defaults = {};

        this.options = $.extend(true, {}, defaults, this.options);

        this.tplName = this.options.tplName || 'engagementTeamMembers';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'engagement/tpl/';

        this._viewType = this.options.viewType || null;

        // collection listeners
        // this.individuals.on('reset', this.render, this);
        // this.individuals.on('add', this.render, this);
        // this.teams.on('reset', this.render, this);
        // this.teams.on('add', this.render, this);

        // if the collection already has models, render
        // if( this.individuals.length || this.teams.length ) {
            this.render();
        // }

        this.on('renderDone', this.postRender, this);
    },

    events: {},

    render: function() {
        var that = this;

        G5.util.showSpin(this.$el);

        TemplateManager.get(this.tplName, function(tpl) {
            that.$el.empty().append( tpl({}) );

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
    },

    postRender: function() {
        this.individualsCollectionView = this.options.individualsCollectionView || new EngagementTeamMembersCollectionView({
            el : this.$el.find('#engagementTeamMembersViewIndividuals'),
            meta : this.options.team.individuals.meta,
            members : this.options.team.individuals.members,
            membersType : 'user',
            model : _.extend({}, this.options.team.model, {
                nodeId : _.pluck(this.options.engagementModel.get('selectedNodes'), 'id'),
                nodeName : _.pluck(this.options.engagementModel.get('selectedNodes'), 'name').join(' | ')
            }),
            engagementModel : this.options.engagementModel
        });

        this.teamsCollectionView = this.options.teamsCollectionView || new EngagementTeamMembersCollectionView({
            el : this.$el.find('#engagementTeamMembersViewTeams'),
            meta : this.options.team.teams.meta,
            members : this.options.team.teams.members,
            membersType : 'team',
            engagementModel : this.options.engagementModel
        });

        this.individualsCollectionView.on('drillDown', this.handleDrillDown, this);
        this.teamsCollectionView.on('drillDown', this.handleDrillDown, this);
    },

    handleDrillDown: function(data, url) {
        this.trigger('drillDown', data, url);
    },

    setType: function(type) {
        this.$el
            .removeClass('type-' + this._viewType)
            .addClass('type-' + type);

        this._viewType = type;

        if( this.individualsCollectionView && this.teamsCollectionView ) {
            this.individualsCollectionView.setType(type);
            this.teamsCollectionView.setType(type);
        }
    }
});
