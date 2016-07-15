/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
PageView,
PaginationView,
CommunicationsManageTipsModel,
CommunicationsManageTipsView:true
*/
CommunicationsManageTipsView = PageView.extend({

    initialize: function(opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'communications';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create model
        this.communicationsManageTipsModel = new CommunicationsManageTipsModel({});

        this.router = new Backbone.Router({
            routes: {
                ":set" : "loadSet",
                "*other" : "loadSet"
            }
        });
        this.router.on('route:loadSet', function(name) {
            if(name) {
                this.$el.find('#tipsFilterSelect').val(name);
                this.doChangeFilter();
            }
            else {
                this.router.navigate('active', {replace: true, trigger: true});
            }
        }, this);
        Backbone.history.start();

        //If model did not have data, it feches data from server, page then renders on 'loadStandingsDataFinished'
        this.communicationsManageTipsModel.on('loadDataFinished', function() {
            self.processTabularData();
            self.render();
        });

    },
    events: {
      'click #communicationsTipsTable .sortable a' : 'tableClickHandler',
      'change #tipsFilterSelect': 'doChangeFilter'
    },
    render: function() {
        var $tipsCont = this.$el.find('.tipsTableWrapper'),
            that = this,
            tplName = 'CommunicationsManageTips',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/';

        G5.util.hideSpin( this.$el );

        $tipsCont.html('');

        //Push Discussion values to template
        TemplateManager.get('communicationsTipsTable', function(tpl) {
            if(that.communicationsManageTipsModel.get('tabularData').results.length === 0){
                $tipsCont
                    .addClass('emptySet')
                    .append(that.make('h2',{},$tipsCont.data('msgEmpty')));
                return false;
            }
            $tipsCont.append(tpl(that.communicationsManageTipsModel.toJSON()));

            $tipsCont.find('table').responsiveTable();
        });

        TemplateManager.get(tplName,function(tpl,vars,subTpls){
            that.paginationTpl = subTpls.paginationTpl;
            that.renderPagination();

        },tplUrl);
    },
    renderPagination: function() {
        var thisView = this;

        // if our data is paginated, add a special pagination view
        if(thisView.communicationsManageTipsModel.get('total') > thisView.communicationsManageTipsModel.get('tipsPerPage')) {
            // if no pagination view exists, create a new one
            if( !thisView.pagination ) {
                thisView.pagination = new PaginationView({
                    el : thisView.$el.find('.pagination'),
                    pages : Math.ceil( thisView.communicationsManageTipsModel.get('total') /thisView.communicationsManageTipsModel.get('tipsPerPage')),
                    current : thisView.communicationsManageTipsModel.get('currentPage'),
                    ajax : true,
                    tpl : thisView.paginationTpl || false
                });

                this.pagination.on('goToPage', function(page) {
                    thisView.paginationClickHandler(page);
                });

                this.communicationsManageTipsModel.on('loadDataFinished', function() {
                    thisView.pagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.communicationsManageTipsModel.get('total') /thisView.communicationsManageTipsModel.get('tipsPerPage')),
                        current : thisView.communicationsManageTipsModel.get('currentPage')
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.pagination.setElement( thisView.$el.find('.pagination') );
            }
        }
    },
    paginationClickHandler: function(page) {
        G5.util.showSpin( this.$el, {
            cover : true
        });

        this.communicationsManageTipsModel.update({
            force: true,
            data: {
                pageNumber : page
            },
            type : 'getTips'
        });
    },
    processTabularData: function() {
        var self = this,
            tabularData = self.communicationsManageTipsModel.get('tabularData');

            _.each(tabularData.meta.columns, function(col, place, list) {

                if( self.communicationsManageTipsModel.get('sortedOn') == tabularData.meta.columns[place].id ) {
                    col.sortedOn = true;
                    col.sortedBy = self.communicationsManageTipsModel.get('sortedBy') || 'desc';
                }

            });

        // iterate through each meta column
        _.each(tabularData.meta.columns, function(col, index, list) {
            // if the column is sortable
            if( col.sortable ) {
                // mark if this column is the one on which the table is sorted
                col.sortedOn = self.communicationsManageTipsModel.get('sortedOn') == col.id ? true : false;
                // default to ascending sort, but mark with the actual sort state
                col.sortedBy = self.communicationsManageTipsModel.get('sortedOn') == col.id ? self.communicationsManageTipsModel.get('sortedBy') : 'desc';
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
                addlData = $.query.load( $newTar.find('a').attr('href') ).keys;

            G5.util.showSpin( this.$el, {
                cover : true
            });

            this.communicationsManageTipsModel.update({
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
    doChangeFilter: function(e){
        var selectDropVal = e ? $(e.currentTarget).val() : this.$el.find('#tipsFilterSelect').val();

        this.communicationsManageTipsModel.update({
            force: true,
            data: {
                statusType : selectDropVal
            },
            type : 'status'
        });

        this.router.navigate(selectDropVal);
    },
});