/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
ModuleCollection,
ModuleContainerView,
HomeApp:true
*/

//Home Application Object
HomeApp = Backbone.Router.extend({

    routes:{
        "":"filter",
        "filter":"filter",
        "filter/:filter":"filter",
        "app/:app/:page":"appPage"
    },

    initialize:function(opts){
        this.isPageMode = 'none';


        //SETUP APPLICATION
        var mcvSelector = opts.mcvSelector||'.moduleContainerViewElement';

        var $mcvEl = $(mcvSelector);

        //make sure element exists
        $mcvEl.length>0 ? $mcvEl = $($mcvEl[0]) : console.log('[ERROR] HomeApp init: could not find element ['+mcvSelector+']');

        this.moduleCollection = new ModuleCollection();
        this.moduleContainerView = new ModuleContainerView({
            el:$mcvEl,
            model:this.moduleCollection,
            app:this,
            gridSpanPx:160 //grid width in pixels
        });

        //start history
        Backbone.history.start();

    },

    filter:function(filter){

        //if no filter passed, and have a page mode -- do nothing
        if(typeof filter==='undefined' &&  this.isPageMode!='none') return;

        // if filter undef, then add the apropo filter
        if(typeof filter === 'undefined') {
            Backbone.history.navigate('filter/'+G5.props.DEFAULT_FILTER);
            return;
        }

        //if the filter is undefined, then default to home
        //filter = filter||'home';

        // ping the server on filter change and let it know the current requested filter
        this.notifyServerOfFilterChange(filter);

        //transition to mods (if necessary)
        //this.transitionToMods();

        //set the filter on the collection
        //the collection will trigger an event for views to respond to
        this.moduleCollection.setFilter(filter);

        console.log('[INFO] HomeApp filter route: ['+filter+']');
    },

    notifyServerOfFilterChange: function(filter) {
        // inform the server of a filter change
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_HOME_APP_FILTER_CHANGE,
            data: {filter:filter},
            success: function(servResp){ /* nothing for now, just letting the server know */ }
        }); // ajax
    }

    //Load an app page
    // appPage:function(appName,pageName){
    //  console.log('[INFO] HomeApp load app/page: '+appName+'/'+pageName);

    //  this.transitionToPage( (G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+appName+'/tpl/') +pageName+G5.props.TMPL_SFFX);

    //  $('.appPageContainerViewElement .goBackBtn').attr('href','#filter/'+this.moduleCollection.getFilter());


    // },


    //effects for page loading
    // transitionToPage:function(url){

    //  var that = this,
    //      $pgCnt = $('.appPageContainerViewElement'),
    //      $mdCnt = $('.moduleContainerViewElement');

    //  //initial state, straight hide and show
    //  if(this.isPageMode==='none'){
    //      $pgCnt.show().find('.appPageContainerDynamicContent').load(url);
    //      $('#homeAppTopNav').hide();
    //      $mdCnt.hide();
    //      this.isPageMode = true;
    //      return;
    //  }

    //  //already in page mode, no action
    //  if(this.isPageMode===true) return;

    //  //overflow on body hidden during transition
    //  $('body').css('overflow-x','hidden');

    //  //slide mod cont left and hide
    //  $mdCnt.each(function(){
    //      var $el = $(this);

    //      $el.animate(
    //          {left: -(($(window).width()/2)+$el.width()) },
    //          function(){
    //              $el.hide().css('left',0);
    //              that.moduleContainerView.sleep();
    //          }
    //      );

    //  });

    //  //slide page cont in (tricky stuff)
    //  $pgCnt.css({
    //      'left':$(window).width(),
    //      'position':'absolute',
    //      'top':$('header').height()
    //  }).show().animate({
    //      'left':($(window).width()-$pgCnt.width())/2
    //  },function(){
    //      $(this).css({'position':'relative','left':0,'top':0});
    //      //turn off overflow hidden, allow hscroll
    //      $('body').css('overflow-x','auto');
    //      $('#homeAppTopNav').hide();

    //  }).find('.appPageContainerDynamicContent').load(url);

    //  this.isPageMode = true;

    // },


    //effects for modules view (HomeApp) load
    // transitionToMods:function(callback){

    //  var that = this,
    //      $pgCnt = $('.appPageContainerViewElement'),
    //      $mdCnt = $('.moduleContainerViewElement');

    //  //initial state, straight hide and show
    //  if(this.isPageMode==='none'){
    //      $pgCnt.hide();
    //      $mdCnt.show();
    //      this.isPageMode = false;
    //      return;
    //  }

    //  //already in mods mode, no action
    //  if(this.isPageMode===false) return;


    //  //overflow on body hidden during transition
    //  $('body').css('overflow-x','hidden');

    //  $('#homeAppTopNav').show();

    //  //slide page cont right and hide (tricky stuff)
    //  $pgCnt.each(function(){
    //      var $el = $(this);

    //      $el.css({
    //          'position':'absolute',
    //          'top':$('header').height(),
    //          'left':($(window).width()-$pgCnt.width())/2
    //      }).animate(
    //          {
    //              left: $(window).width()
    //          },
    //          function(){
    //              $el.css({
    //                  'position':'relative',
    //                  'left':0,
    //                  'top':0,
    //                  'display':'none'
    //              });
    //          }
    //      );

    //  });

    //  that.moduleContainerView.wake();

    //  //slide module content in
    //  $mdCnt.css({
    //      'left':-$mdCnt.width() - ( ($(window).width() - $mdCnt.width())/2 )
    //  }).show().animate({
    //      'left':0
    //  },function(){

    //      //turn off overflow hidden, allow hscroll
    //      $('body').css('overflow-x','auto');
    //      $mdCnt.css('left',0);
    //      $('#homeAppTopNav').show();
    //  });




    //  this.isPageMode = false;
    // }

});


