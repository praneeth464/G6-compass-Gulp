/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
PageView,
PaginationView,
CommunicationsManageResourceCenterModel,
CommunicationsManageResourceCenterView:true
*/
CommunicationsManageResourceCenterView = PageView.extend({

    initialize: function(opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'communications';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create model
        this.communicationsManageResourceModel = new CommunicationsManageResourceCenterModel({});

        this.router = new Backbone.Router({
            routes: {
                ":set" : "loadSet",
                "*other" : "loadSet"
            }
        });
        this.router.on('route:loadSet', function(name) {
            if(name) {
                this.$el.find('#resourceFilterSelect').val(name);
                this.doInputChange();
            }
            else {
                this.router.navigate('active', {replace: true, trigger: true});
            }
        }, this);
        Backbone.history.start();

        //If model did not have data, it feches data from server, page then renders on 'loadStandingsDataFinished'
        this.communicationsManageResourceModel.on('loadDataFinished', function() {
            self.render();
        });

    },
    events: {
      'change #resourceFilterSelect':'doInputChange'
    },
    render: function() {
        var $resourceCont = this.$el.find('.resourceCenterTableWrapper'),
            that = this,
            tplName = 'CommunicationsManageResourceCenter',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/';

        G5.util.hideSpin( this.$el );

        $resourceCont.html('');

        //Push Discussion values to template
        TemplateManager.get('communicationResourceTable', function(tpl) {
            if(that.communicationsManageResourceModel.get('tabularData').results.length === 0){
                $resourceCont
                    .addClass('emptySet')
                    .append(that.make('h2',{},$resourceCont.data('msgEmpty')));
                return false;
            }
            $resourceCont.append(tpl(that.communicationsManageResourceModel.toJSON()));

            $resourceCont.find('table').responsiveTable();
        });

        TemplateManager.get(tplName,function(tpl,vars,subTpls){
            that.paginationTpl = subTpls.paginationTpl;
            that.renderPagination();

        },tplUrl);
    },
    renderPagination: function() {
        var thisView = this;

        // if our data is paginated, add a special pagination view
        if(thisView.communicationsManageResourceModel.get('total') > thisView.communicationsManageResourceModel.get('resourcesPerPage')) {
            // if no pagination view exists, create a new one
            if( !thisView.pagination ) {
                thisView.pagination = new PaginationView({
                    el : thisView.$el.find('.pagination'),
                    pages : Math.ceil( thisView.communicationsManageResourceModel.get('total') /thisView.communicationsManageResourceModel.get('resourcesPerPage')),
                    current : thisView.communicationsManageResourceModel.get('currentPage'),
                    ajax : true,
                    tpl : thisView.paginationTpl || false
                });

                this.pagination.on('goToPage', function(page) {
                    thisView.paginationClickHandler(page);
                });

                this.communicationsManageResourceModel.on('loadDataFinished', function() {
                    thisView.pagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.communicationsManageResourceModel.get('total') /thisView.communicationsManageResourceModel.get('resourcesPerPage')),
                        current : thisView.communicationsManageResourceModel.get('currentPage')
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

        this.communicationsManageResourceModel.update({
            force: true,
            data: {
                pageNumber : page
            },
            type : 'getResources'
        });
    },
    doInputChange: function(e) {
        var selectDropVal = e ? $(e.currentTarget).val() : this.$el.find('#resourceFilterSelect').val();

        this.communicationsManageResourceModel.update({
            force: true,
            data: {
                statusType : selectDropVal
            },
            type : 'status'
        });

        this.router.navigate(selectDropVal);
    },
});