/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
TemplateManager,
Backbone,
PaginationView,
SSIApproveContestMembersCollection,
SSIApproveContestMembersCollectionView:true
*/
SSIApproveContestMembersCollectionView = Backbone.View.extend({
    initialize: function() {
        console.log('[INFO] SSIApproveContestMembersCollectionView: initialized', this);

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        var defaults = {};

        this.options = $.extend(true, {}, defaults, this.options);

        this.tplName = this.options.tplName || 'ssiApproveContestInviteesTpl';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';

        this.collection = new SSIApproveContestMembersCollection(null, this.options);

        // view listeners
        this.on('renderDone', this.postRender, this);

        // if the collection already has models, render
        this.collection.on('loadDataDone', this.render, this);
    },

    render: function() {
        var that = this,
            json = this.collection.toJSON();

        G5.util.showSpin(this.$el);

        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            that.tplVars = vars;
            that.subTpls = subTpls;

            that.$el.empty().append(tpl(json[0]));

            that._rendered = true;

            that.trigger('renderDone');
        },this.tplUrl);
    },

    postRender: function() {
        this.renderPagination();
    },

    renderPagination: function() {
        var that = this,
        json = this.collection.toJSON();

        // if our data is paginated, add a special pagination view
        if( json[0].meta.total > json[0].meta.paxPerPage ) {
            // if no pagination view exists, create a new one
            if( !this.paginationView ) {
                this.paginationView = new PaginationView({
                    el : this.$el.find('.paginationControls'),
                    pages : Math.ceil(json[0].meta.total / json[0].meta.paxPerPage),
                    current : json[0].meta.currentPage,
                    per : json[0].meta.paxPerPage,
                    total : json[0].meta.total,
                    ajax : true,
                    showCounts : true,
                    tpl : this.subTpls.paginationTpl || false
                });

                this.paginationView.on('goToPage', function(page) {
                    that.paginationClickHandler(page);
                });

                this.collection.on('loadDataDone', function(data) {
                    that.paginationView.setProperties({
                        rendered : false,
                        pages : Math.ceil(data.meta.total / data.meta.paxPerPage),
                        current : data.meta.currentPage
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
        var json = this.collection.toJSON();

        G5.util.showSpin( this.$el, {
            cover : true
        });

        this.collection.loadData({
            set: this.options.set,
            total : json[0].meta.total,
            paxPerPage : json[0].meta.paxPerPage,
            page : page
        });
    }
});
