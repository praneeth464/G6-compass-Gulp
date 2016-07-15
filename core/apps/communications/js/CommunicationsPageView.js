/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
PageView,
CommunicationsPageView:true
*/
CommunicationsPageView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'communications';
        // this.tabSetEditCurrent = false;
        // this.tabSetViewingCurrent = false;
        // this.currentTabName = "";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

    },
    events: {
        'click .exampleLink': 'doShowContent'
    },
    doShowContent: function(e){
        var $tar = $(e.currentTarget),
            $modal = this.$el.find('#exampleContentModal');

        $modal.find('.exampleImage').hide();

        if($tar.hasClass('exampleBanner')){
            $modal.find('.exampleBannerModal').show();
        } else if ($tar.hasClass('exampleNews')){
            $modal.find('.exampleNewsModal').show();
        }else if ($tar.hasClass('exampleResource')){
            $modal.find('.exampleResourceModal').show();
        }else if ($tar.hasClass('exampleTip')){
            $modal.find('.exampleTipModal').show();
        }else if ($tar.hasClass('exampleAlert')){
            $modal.find('.exampleAlertModal').show();
        }


    }

});