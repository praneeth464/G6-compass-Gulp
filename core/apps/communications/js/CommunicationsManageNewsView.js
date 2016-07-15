/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
PageView,
PaginationView,
CommunicationsManageNewsModel,
CommunicationsManageNewsView:true
*/
CommunicationsManageNewsView = PageView.extend({

    initialize: function(opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'communications';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create model
        this.communicationsManageNewsModel = new CommunicationsManageNewsModel({});

        this.router = new Backbone.Router({
            routes: {
                ":set" : "loadSet",
                "*other" : "loadSet"
            }
        });
        this.router.on('route:loadSet', function(name) {
            if(name) {
                this.$el.find('#newsFilterSelect').val(name);
                this.doInputChange();
            }
            else {
                this.router.navigate('active', {replace: true, trigger: true});
            }
        }, this);
        Backbone.history.start();

        this.communicationsManageNewsModel.on('loadDataFinished', function() {
            self.render();
        });

    },
    events: {
      'change #newsFilterSelect':'doInputChange'
    },
    render: function() {
        var $newsCont = this.$el.find('.newsTableWrapper'),
            that = this,
            tplName = 'CommunicationsManageNews',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'communications/tpl/';

        G5.util.hideSpin( this.$el );

        $newsCont.html('');

        //Push Discussion values to template
        TemplateManager.get('communicationNewsTable', function(tpl) {
            if(that.communicationsManageNewsModel.get('tabularData').results.length === 0){
                $newsCont
                    .addClass('emptySet')
                    .append(that.make('h2',{},$newsCont.data('msgEmpty')));
                return false;
            }
            $newsCont.append(tpl(that.communicationsManageNewsModel.toJSON()));

            $newsCont.find('table').responsiveTable();
        });

        TemplateManager.get(tplName,function(tpl,vars,subTpls){
            that.paginationTpl = subTpls.paginationTpl;
            that.renderPagination();

        },tplUrl);
    },
    renderPagination: function() {
        var thisView = this;

        // if our data is paginated, add a special pagination view
        if(thisView.communicationsManageNewsModel.get('total') > thisView.communicationsManageNewsModel.get('storiesPerPage')) {
            // if no pagination view exists, create a new one
            if( !thisView.pagination ) {
                thisView.pagination = new PaginationView({
                    el : thisView.$el.find('.pagination'),
                    pages : Math.ceil( thisView.communicationsManageNewsModel.get('total') /thisView.communicationsManageNewsModel.get('storiesPerPage')),
                    current : thisView.communicationsManageNewsModel.get('currentPage'),
                    ajax : true,
                    tpl : thisView.paginationTpl || false
                });

                this.pagination.on('goToPage', function(page) {
                    thisView.paginationClickHandler(page);
                });

                this.communicationsManageNewsModel.on('loadDataFinished', function() {
                    thisView.pagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.communicationsManageNewsModel.get('total') /thisView.communicationsManageNewsModel.get('storiesPerPage')),
                        current : thisView.communicationsManageNewsModel.get('currentPage')
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

        this.communicationsManageNewsModel.update({
            force: true,
            data: {
                pageNumber : page
            },
            type : 'getNews'
        });
    },
    doInputChange: function(e) {
        var selectDropVal = e ? $(e.currentTarget).val() : this.$el.find('#newsFilterSelect').val();

        this.communicationsManageNewsModel.update({
            force: true,
            data: {
                statusType : selectDropVal
            },
            type : 'status'
        });

        this.router.navigate(selectDropVal);
    },
});