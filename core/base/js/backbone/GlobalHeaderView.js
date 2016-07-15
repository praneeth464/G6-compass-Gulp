/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
G5,
TemplateManager,
Backbone,
ParticipantProfileView,
GlobalHeaderView:true
*/
GlobalHeaderView = Backbone.View.extend({

    el : '#header',

    //override super-class initialize function
    initialize:function(opts){
        'use strict';
        var that = this;
        console.log('[INFO] GlobalHeaderView:', this, opts, this.options);

        this.page = opts.page;
        this.options.globalHeader = that.options.globalHeader||G5.props.globalHeader||{};
        this.options.globalHeader.loggedIn = opts.loggedIn;
        this.render();

        if( opts.loggedIn === true ) {
            this.partProf = new ParticipantProfileView();
            this.$el.find('.container').append(this.partProf.el);
            this.partProf.render(); // wait until after append to call render
        }
    }, // initialize

    render: function(){
        'use strict';
        var that = this;

        TemplateManager.get('globalHeaderView',function(tpl){
            that.$el.find('#globalHeaderView').remove();
            that.$el.find('.container').append( tpl(that.options.globalHeader) );
        }, G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/');

        return this;
    } // render

});