/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
TemplateManager,
Backbone,
PaginationView,
KPMTeamMembersModel,
KPMTeamMembersCollection,
KPMTeamMembersCollectionView:true
*/
KPMTeamMembersCollectionView = Backbone.View.extend({
    initialize: function(opts) {
        console.log('[INFO] KPMTeamMembersCollectionView: initialized', this);

        var settings = {};

        this.settings = $.extend(true, {}, settings, opts);

        this.tplName = this.settings.tplName || 'kpmTeamMembersCollection';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'kpm/tpl/';

        this.model = this.settings.model ? new KPMTeamMembersModel(
            _.extend(this.settings.model || null,
                {
                    nodeId: this.settings.kpmModel.get('nodes')[0].id || null,
                    nodeName: this.settings.kpmModel.get('nodes')[0].name || null
                }
            ),
            { kpmModel : this.settings.kpmModel }
        ) : null;

        this.collection = this.settings.collection || new KPMTeamMembersCollection(this.settings.members || null, {
            meta : this.settings.meta,
            kpmModel : this.settings.kpmModel
        });

        // collection listeners
        this.collection.on('reset', this.render, this);
        this.collection.on('add', this.render, this);

        // view listeners
        this.on('renderDone', this.postRender, this);

        // if the collection already has models, render
        if( this.collection.length ) {
            this.render();
        }
    },

    events: {
        "click .sortable a" : "handleTableSort"
    },

    render: function() {
        var that = this,
            json = {
                members : this.collection.toJSON(),
                meta : this.collection.meta,
                model : this.model ? this.model.toJSON() : null,
                membersType : this.settings.membersType || 'user'
            };

        G5.util.showSpin(this.$el);

        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            that.tplVars = vars;
            that.subTpls = subTpls;

            that.$el.empty().append( tpl(json) );

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
    },

    postRender: function() {
        this.renderPagination();
        this.markSortedColumn();
    },

    renderPagination: function() {
        var that = this;

        // if our data is paginated, add a special pagination view
        if( this.collection.meta.count > this.collection.meta.perPage ) {
            // if no pagination view exists, create a new one
            if( !this.paginationView ) {
                this.paginationView = new PaginationView({
                    el : this.$el.find('.paginationControls'),
                    pages : Math.ceil(this.collection.meta.count / this.collection.meta.perPage),
                    current : this.collection.meta.page,
                    ajax : true,
                    tpl : this.subTpls.paginationTpl || false
                });

                this.paginationView.on('goToPage', function(page) {
                    that.paginationClickHandler(page);
                });

                this.collection.on('loadDataDone', function() {
                    that.paginationView.setProperties({
                        rendered : false,
                        pages : Math.ceil(that.collection.meta.count / that.collection.meta.perPage),
                        current : that.collection.meta.page
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.paginationView.setElement( this.$el.find('.paginationControls') );

                // we know that pagination should exist because of the if with count, so we need to explicitly render if it has no children
                if( !this.paginationView.$el.children().length ) {
                    this.paginationView.render();
                }
            }
        }
    },

    paginationClickHandler: function(page) {
        G5.util.showSpin( this.$el, {
            cover : true
        } );

        this.collection.loadData({
            nodeId : this.settings.kpmModel.get('nodes')[0].id,
            membersType : this.settings.membersType,
            count : this.collection.meta.count,
            perPage : this.collection.meta.perPage,
            page : page,
            sortedOn : this.collection.meta.sortedOn,
            sortedBy : this.collection.meta.sortedBy
        });
    },

    handleTableSort: function(e) {
        var $tar = $(e.target).closest('.sortable'),
            sortOn = $tar.data('sortOn'),
            // sortOnType = sortOn.split('-')[0],
            // sortOnVal = sortOn.split('-')[1],
            sortBy = $tar.data('sortBy');

        e.preventDefault();

        // if we're paginated, we have to go to the server to sort
        // if( this.collection.meta.count > this.collection.meta.perPage ) {
            this.collection.loadData({
                nodeId : this.settings.kpmModel.get('nodes')[0].id,
                membersType : this.settings.membersType,
                count : this.collection.meta.count,
                perPage : this.collection.meta.perPage,
                sortedOn : sortOn,
                sortedBy : sortBy
            });
        // }
        // otherwise, we can sort the collection locally (NOPE: this is too hard)
        // else {
        //     if( sortOn == 'member' ) {
        //         this.collection.sortBy(function(model) { return model.get('data').userName || model.get('data').nodeName; });
        //     }
        //     else {
        //         this.collection.sortBy(function(model) { return _.where(model.get('data'), {type: sortOnType})[0][sortOnVal]; });
        //     }
        //     this.render();
        // }
    },

    markSortedColumn: function() {
        var sortedOn = this.$el.find('thead .sorted').data('sortOn'),
            sortClass = sortedOn.split('-').join('.');

        this.$el.find('tbody .sorted').removeClass('sorted');
        this.$el.find('tbody .' + sortClass).addClass('sorted');
        // alert('to do');
    },

    setType: function(type) {
        this.$el
            .removeClass('type-' + this._viewType)
            .addClass('type-' + type);

        this._viewType = type;
    }
});
