/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
PageView,
PaginationView,
CommunicationsManageBannersModel,
CommunicationsManageBannersView:true
*/
CommunicationsManageBannersView = PageView.extend({

    initialize: function(opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'communications';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create model
        this.communicationsManageBannersModel = new CommunicationsManageBannersModel({});

        this.router = new Backbone.Router({
            routes: {
                ":set" : "loadSet",
                "*other" : "loadSet"
            }
        });
        this.router.on('route:loadSet', function(name) {
            if(name) {
                this.$el.find('#bannersFilterSelect').val(name);
                this.doInputChange();
            }
            else {
                this.router.navigate('active', {replace: true, trigger: true});
            }
        }, this);
        Backbone.history.start();

        this.communicationsManageBannersModel.on('loadDataFinished', function() {
            self.render();
        });

    },
    events: {
      'change #bannersFilterSelect':'doInputChange'
    },
    render: function() {
        var $resourceCont = this.$el.find('.bannersTableWrapper'),
            that = this,
            tplName = 'CommunicationsManageBanners',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/';

        G5.util.hideSpin( this.$el );
        $resourceCont.html('');

        //Push Discussion values to template
        TemplateManager.get('communicationBannersTable', function(tpl) {
            if(that.communicationsManageBannersModel.get('tabularData').results.length === 0){
                $resourceCont
                    .addClass('emptySet')
                    .append(that.make('h2',{},$resourceCont.data('msgEmpty')));
                return false;
            }
            $resourceCont.append(tpl(that.communicationsManageBannersModel.toJSON()));

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
        if(thisView.communicationsManageBannersModel.get('total') > thisView.communicationsManageBannersModel.get('bannersPerPage')) {
            // if no pagination view exists, create a new one
            if( !thisView.pagination ) {
                thisView.pagination = new PaginationView({
                    el : thisView.$el.find('.pagination'),
                    pages : Math.ceil( thisView.communicationsManageBannersModel.get('total') /thisView.communicationsManageBannersModel.get('bannersPerPage')),
                    current : thisView.communicationsManageBannersModel.get('currentPage'),
                    ajax : true,
                    tpl : thisView.paginationTpl || false
                });

                this.pagination.on('goToPage', function(page) {
                    thisView.paginationClickHandler(page);
                });

                this.communicationsManageBannersModel.on('loadDataFinished', function() {
                    thisView.pagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.communicationsManageBannersModel.get('total') /thisView.communicationsManageBannersModel.get('bannersPerPage')),
                        current : thisView.communicationsManageBannersModel.get('currentPage')
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

        this.communicationsManageBannersModel.update({
            force: true,
            data: {
                pageNumber : page
            },
            type : 'getBanners'
        });
    },
    doInputChange: function(e) {
        var selectDropVal = e ? $(e.currentTarget).val() : this.$el.find('#bannersFilterSelect').val();

        this.communicationsManageBannersModel.update({
            force: true,
            data: {
                statusType : selectDropVal
            },
            type : 'status'
        });

        this.router.navigate(selectDropVal);
    },
});