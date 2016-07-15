/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
TemplateManager,
Backbone,
KPMTeamMembersCollectionView,
KPMTeamMembersView:true
*/
KPMTeamMembersView = Backbone.View.extend({
    initialize: function(opts) {
        console.log('[INFO] KPMTeamMembersView: initialized', this);

        var settings = {};

        this.settings = $.extend(true, {}, settings, opts);

        this.tplName = this.settings.tplName || 'kpmTeamMembers';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'kpm/tpl/';

        this._viewType = this.settings.viewType || null;

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
        this.individualsCollectionView = this.settings.individualsCollectionView || new KPMTeamMembersCollectionView({
            el : this.$el.find('#kpmTeamMembersViewIndividuals'),
            meta : this.settings.team.individuals.meta,
            members : this.settings.team.individuals.members,
            membersType : 'user',
            model : this.settings.team.model,
            kpmModel : this.settings.kpmModel
        });
        this.teamsCollectionView = this.settings.teamsCollectionView || new KPMTeamMembersCollectionView({
            el : this.$el.find('#kpmTeamMembersViewTeams'),
            meta : this.settings.team.teams.meta,
            members : this.settings.team.teams.members,
            membersType : 'team',
            kpmModel : this.settings.kpmModel
        });
    },

    setType: function(type) {
        this.$el
            .removeClass('type-' + this._viewType)
            .addClass('type-' + type);

        this._viewType = type;
    }
});
