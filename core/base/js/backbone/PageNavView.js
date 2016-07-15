/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
G5,
TemplateManager,
Backbone,
PageNavView:true
*/
PageNavView = Backbone.View.extend({

    el : '#contents',

    //override super-class initialize function
    initialize:function(opts){
        'use strict';
        console.log('[INFO] PageNavView:', this, opts, this.options);

        this.page = opts.page;

        this.options.pageNav = opts.pageNav || G5.props.pageNavDefaults;
        this.options.pageNav.pageTitle = this.page.options.pageTitle || '';
        this.options.pageNav.pageElId = this.page.elid || '';

        this.render();
    }, // initialize

    render: function(){
        'use strict';
        var that = this;

        TemplateManager.get('pageNavView',function(tpl){
            that.$el.find('#pageNav').remove();
            that.$el.prepend( tpl(that.options.pageNav||{}) );
        }, G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/');

        return this;
    }, // render

    events : {
        // "click #pageTitle a" : "scrollToView",
        "click #pageBackLink" : "pageBackLinkClick",
        "click #pageHomeLink" : "pageHomeLinkClick"
    },

    // Bug 2298 - Remove anchor tag from pageTitle
    // scrollToView : function(e) {
    //     e.preventDefault();
    //     $(window).scrollTo( this.page.$el, G5.props.ANIMATION_DURATION );
    // },

    pageBackLinkClick : function(e) {
        this.trigger('pageBackLinkClicked', this, e);
    },

    pageHomeLinkClick : function(e) {
        this.trigger('pageHomeLinkClicked', this, e);
    },

    // page title can change dynamically on Send a Recognition page
    setPageTitle: function(title) {
        this.$el.find('#pageTitle').text(title);
    },

    getPageTitle: function() {
        return this.options.pageNav.pageTitle;
    }

});