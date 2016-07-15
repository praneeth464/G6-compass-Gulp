/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
TemplateManager,
Backbone,
GlobalFooterView:true
*/
GlobalFooterView = Backbone.View.extend({

    el : '#footer',

    //override super-class initialize function
    initialize:function(opts){
        'use strict';
        var that=this;

        console.log('[INFO] GlobalFooterView: init',this);

        this.pageView = opts.page;
        this.isSheets = opts.isSheets===false?false:true; // display stack modals (sheets)?

        // yes, we are using the profile model for its isDelegate value, which might not yet be set
        this.profileModel = opts.profileModel;
        // listen for isDelegate change
        if(this.profileModel) {
            this.profileModel.on('change:isDelegate', this.updateIsDelegate, this);
        }

        this.render();

    }, // initialize

    events: {
        'click a:not(.language-select,.language-item)' : 'interceptSheetLink',
        'click .language-select' : 'showLanguages',
        'click .language-item' : 'sendLanguage'
    },

    interceptSheetLink: function(event){
        var self = this,
            $tar = $(event.target);

        event.preventDefault();
        if (!$tar.hasClass("disabledFootLink")){ //if link is disabled, don't bring up modal
            G5.util.doSheetOverlay(!this.isSheets, $tar.attr('href'), $tar.text());
        }
    },

    render: function(){
        'use strict';
        var that = this;

        TemplateManager.get('globalFooterView',function(tpl){

            that.$el.find('#globalFooterView').remove();
            that.$el.find('.container').append( tpl({
                loggedIn : that.options.loggedIn,
                languages : G5.props.availableLanguages
            }) );
            
            that.updateIsDelegate();
            that.updateLinks();

        }, G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/');

        return this;
    }, // render

    updateLinks: function() { 
        var actPageId = this.pageView.$el.attr('id');

        // disable links to active page
        this.$el.find('.nav a[data-page-id='+actPageId+']').addClass('disabledFootLink');
    },

    // hide footer links if in delegate mode (proxy)
    updateIsDelegate: function(){
        var $links = this.$el.find('.nav');

        if(this.profileModel && this.profileModel.get('isDelegate')){
            $links.hide();
        } else {
            $links.show();
        }
    },

    showLanguages: function(e){
        var $t = $(e.currentTarget),
            $languages = this.$el.find('.language-list');

        e.preventDefault();

        if(!$t.data('qtip')){        
            $t.qtip({
                content: $languages,
                position:{my:'bottom center',at:'top center',container: this.$el},
                show:{ready:false, event:'click', effect:false},
                hide:{event:'unfocus', effect:false},
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-light',
                    tip: {
                        width: 10,
                        height: 6
                    }
                },
                events:{/*show:onShow*/}
            });
            // IE8 - two lines below are for initial position bug in IE8
            $t.qtip('show');
            $t.qtip('reposition');
            // EOF IE8
        }
    },

    sendLanguage: function(e) {

    }

});