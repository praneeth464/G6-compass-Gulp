/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
HomeApp,
HomeAppPageView:true
*/
HomeAppPageView = PageView.extend({

    //override super-class initialize function
    initialize : function(opts) {
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = '';

        this.$topNav = this.$el.find('#homeAppTopNav');

        //this is how we call the super-class initialize function (inherit its magic)
        this.constructor.__super__.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},this.constructor.__super__.events,this.events);

        $('body').addClass('homeApp');

        this.render();
    },

    events: {
        'click .toggler' : 'handleToggleClick'
    },

    render : function() {
        var thisView = this;

        this.homeApp = new HomeApp({
            mcvSelector : '.moduleContainerViewElement' //the DOM root element of the module container
        });

        this.$topNav.addClass('rendered');

        this.updateActiveFilter();

        this.homeApp.moduleCollection.on('filterChanged', function(f){
            thisView.updateActiveFilter();
        },this);

        this.homeApp.moduleContainerView.on('geometryChanged', function(){
            thisView.disableFilterClicks(false); // no clicking during transitions
        }, this);
        this.homeApp.moduleContainerView.on('beforeGeometryChange', function(){
            thisView.updateToggler();
            thisView.updateTopNav();
            thisView.disableFilterClicks(true); // no clicking during transitions
        }, this);
    },

    updateTopNav: function(isForce) {
        var $lis = this.$topNav.find('li'),
            w = this.$topNav.find('ul').width(),
            n = $lis.length,
            contW = 0;

        // JUSTIFY - check to see if we should update
        if(!this._tnOldWidth || w!=this._tnOldWidth || isForce) {

            $lis.each(function(){
                var $t = $(this);
                $t.css('left',contW); // first round, push out just enough
                contW += $t.width();
            });

            contW = (w-contW)/(n-1); // spacing

            $lis.each(function(i){
                var $t = $(this);
                $t.css('left',contW*i + $t.position().left); // second round, add spacing
            });

            // update and persist the old value
            this._tnOldWidth = w;
        }

    },

    updateActiveFilter: function() {
        var f = this.homeApp.moduleCollection.getFilter();

        // UPDATE ACTIVE class for filters
        this.$topNav.find('.active').removeClass('active');
        this.$topNav.find('.'+f+'Filter').addClass('active');

        // refresh the positions (force)
        this.updateTopNav(true);
        this.updateToggler();
    },

    disableFilterClicks: function(isDisable) {

        if(isDisable) {
            this.$topNav.find('a').on('click.disableLink',function (e) {e.preventDefault();} );
        } else {
            this.$topNav.find('a').off('.disableLink');
        }
    },

    handleToggleClick: function(e) {
        e.preventDefault();

        var $toggler = $(e.target).closest('.toggler'),
            $subnav = $toggler.closest('.subnav'),
            action = $subnav.hasClass('opened') ? 'close' : 'open';

        this.toggleTopNav(action);
    },

    toggleTopNav: function(action, instant) {
        var $pageNav = $('#pageNav'),
            $pageView = this.$el,
            $subnav = $pageView.find('.subnav'),
            $toggler = $subnav.find('.toggler'),
            topGap = Math.abs($pageNav.height() + parseInt($pageView.css('marginTop'),10)),
            $active = $subnav.find('.active'),
            $notactive = $subnav.find('li').not('.active'),
            heightOpen = ($notactive.length * $notactive.first().outerHeight()) + $active.outerHeight(),
            heightClosed = $active.outerHeight();

        // if we're already in our close/open state and we try to do it again, bail
        if( $subnav.hasClass('closed') && action == 'close' || $subnav.hasClass('opened') && action == 'open' ) {
            return;
        }

        // toggle the class on the subnav element and set it's height with CSS to prep for animation
        $subnav
            .removeClass('opened closed')
            .addClass(action == 'open' ? 'opened' : 'closed')
            .css({
                height: $subnav.outerHeight()
            });

        // absolutely position the active filter item so we can animate it where it needs to go
        // we set the margin-top on the filter item after this one to leave a gap where the active one would fit
        $active
            .css({
                position : 'absolute',
                top : $active.index() * $notactive.first().outerHeight(),
                bottom : 'auto',
                left : 0,
                width : '100%'
            })
            .next().css({
                marginTop : $active.outerHeight()
            });

        // we animate the text-indent of the $toggler from 0 to 1/100 of a pixel and use the step function to animate all the other elements
        // this cuts down on the number of animations jQ has to keep in sync
        $toggler
            .css('text-indent',0)
            .animate({
                textIndent : 0.01
            },{
                duration : instant ? 0 : G5.props.ANIMATION_DURATION,
                step: function(now) {
                    // change now from a 0–0.01 scale to a 0–1 scale
                    now = now * 100;

                    $subnav     .css('height',  action == 'open' ? heightClosed + (heightOpen - heightClosed) * now : heightOpen - (heightOpen - heightClosed) * now);
                    $notactive  .css('opacity', action == 'open' ? now : 1 - now);
                    $active     .css('top',     action == 'open' ? $active.index() * $notactive.first().outerHeight() * now : $active.index() * $notactive.first().outerHeight() * (1 - now));
                    $toggler    .css('top', $active.position().top + $active.outerHeight() / 2);
                    $pageNav    .css('height', $subnav.height());
                    $pageView   .css('marginTop', ($subnav.height() + topGap) * -1);
                },
                complete: function() {
                    // reset all the CSS properties we set above so these don't get left behind as inline properties
                    $active.css({
                        position : '',
                        top : '',
                        bottom : '',
                        left : '',
                        width : '',
                        marginTop : ''
                    });

                    $notactive.css({
                        marginTop : '',
                        opacity : ''
                    });

                    if( action == 'close' ) {
                        $pageNav.css('height','');
                        $pageView.css('marginTop','');
                    }
                }
            });
    },

    updateToggler: function() {
        var $toggler = this.$topNav.find('.toggler'),
            $active = this.$topNav.find('.active'),
            $notactive =  this.$topNav.find('li').not('.active');

        $toggler.css({
            top : this.$topNav.find('.subnav').hasClass('opened') ? ($active.index() * $notactive.first().outerHeight()) + ($active.outerHeight() / 2) : ($active.outerHeight() / 2)
        });

        // if our toggler is not visible, we need to bail
        if( $toggler.is(':hidden') ) {
            this.toggleTopNav('close', true);
        }
    },



    //*****************************************************************************
    // DEVELOPMENT MODE - allow a subset of modules to be loaded
    //*****************************************************************************
    doDevMode: function(allMods) {
        var getCookSubset = function(c){
                var c = document.cookie.match(/moduleSubset=([a-z0-9,]+)/i);
                return c&&c.length==2?c[1]:false;
            },
            getCookSingle = function(c){
                var c = document.cookie.match(/moduleSingle=([a-z0-9]+)/i);
                return c&&c.length==2?c[1]:false;
            },
            subsetNames = getCookSubset(),
            singleName = getCookSingle();

        this._allModules = allMods; // keep a reference around

        if(subsetNames) { this.doModuleSubset(subsetNames.split(',')); }
        else if(singleName) { this.doModuleSingle(singleName); }
        else { this.showModulesList(allMods); }
    },

    doModuleSubset: function(namesArray) {
        var subset = [],
            that = this;

        console.log('DEV MODE: MULTIPLE MODULES: ', namesArray.toString());

        _.each(namesArray, function(name){
            // find the module obj
            var x = _.where(that._allModules, {name:name});
            // add it to subset module array
            if(x.length){subset.push(x[0]);}
        });

        this.homeApp.moduleCollection.reset(subset);
        document.cookie = 'moduleSubset='+namesArray.toString();
        document.cookie = 'moduleSingle='; // clear

        this.showSubsetActive();

    },
    doModuleSingle: function(name) {
        var sizes = ['4x4','4x2','2x2','2x1','1x1'],
            mod = _.where(this._allModules, {name: name}),
            i,m,modsList=[];

        mod = mod.length?mod[0]:null;

        if(!mod) { return; } // exit

        console.log('DEV MODE: SINGLE MODULE: ', mod);

        // create a clone for all sizes
        for(i=0;i<sizes.length;i++) {
            m = _.clone(mod);
            m.viewName = m.viewName||m.name; // move this to view name as all will share this
            m.templateName = m.templateName||m.name; // move this to tpl name as all will share this
            m.name = m.name + i; // rename since name is a unique id
            m.filters = { // custom filter settings
                'default':{size:sizes[i], order:i},
                'home':{size:sizes[i], order:i},
                'activities':{size:sizes[i], order:i},
                'social':{size:sizes[i], order:i},
                'shop':{size:sizes[i], order:i},
                'reports':{size:sizes[i], order:i},
                'throwdown':{size:sizes[i], order:i},
                'all':{size:sizes[i], order:i}
            };
            modsList.push(m);
        }

        this.homeApp.moduleCollection.reset(modsList);
        document.cookie = 'moduleSingle='+name;
        document.cookie = 'moduleSubset='; // clear

        this.showSubsetActive();
    },
    showModulesList: function() {
        var that = this,
            $e = $('#devModuleSubsetSelect'),
            mods = this._allModules,
            $c = $('<div />').css({'float':'left',padding:'0 40px 0 0','vertical-align':'middle'}),
            lastAppName;

        mods = _.sortBy(mods,function(m){return m.name;});
        mods = _.sortBy(mods,function(m){return m.appName;});

        // build control
        if(!$e.length) {
            $e = $('<div id="devModuleSubsetSelect"/>');
            $e.css({
                position: 'fixed', top: 0, 'overflow': 'auto',
                left: 0,right:0,bottom:0, 'z-index': 999999, color: 'white',
                padding: '20px', display: 'none',
                background: 'rgb(0,0,0)', opacity: 0.8
            });
            $e.append('<div>Please select modules (from <b>core/tpl/modulesPage.html</b>) to include, they will be saved in your cookie.<br><br>'
                +'</div>');
            _.each(mods,function(m,i){
                if(lastAppName!==m.appName) $c.append('<h5 style="margin-bottom:0">'+m.appName+'</h5>');
                lastAppName = m.appName;
                $c.append('<label><input type="checkbox" data-name="'+m.name+'" style="opacity:1" /> '+m.name+'</label>');
                if(i>0&&i%10===0){
                    $e.append($c);
                    $c = $c.clone().empty();
                }
            });
            $e.append($c);
            $e.append('<div style="clear:both;padding-top:16px">'+
                '<a class="btn btn-small btn-primary save">Save Subset (normal settings)</a>'+
                '<a class="btn btn-small btn-primary saveSingle">Single Mode (all sizes for single module)</a></div>');
            $('body').append($e);
            $e.slideDown();

            $e.find('.save').click(function(){
                that.saveModulesList();
                $e.slideUp();
            });
            $e.find('.saveSingle').click(function(){
                that.saveSingle();
                $e.slideUp();
            });
        }
        // already created, show it
        else {
            $e.find('input[type=checkbox]').removeAttr('checked');
            $e.slideDown();
        }
    },
    showSubsetActive: function() {
        var $e = $('#devModuleSubsetActive'),
            that = this;

        if(!$e.length) {
            $e = $('<div id="devModuleSubsetActive"><i class="icon-cog"/> Module Subset Active</div>').css({
                position: 'fixed', bottom: 0, left: 0,
                'font-size':'14px', background: 'rgb(250,0,0)', opacity: 0.8,
                color: 'white',padding: '4px 8px 4px 8px', 'font-family':'arial',
                cursor: 'pointer', 'z-index':999999
            });
            $('body').append($e);
            $e.click(function(){
                that.showModulesList();
            });
        }
    },
    saveModulesList: function() {
        var $modList = $('#devModuleSubsetSelect input:checked'),
            list = [];

        $modList.each(function(){
            list.push($(this).data('name'));
        });

        this.doModuleSubset(list);
    },
    saveSingle: function() {
        var $mod = $('#devModuleSubsetSelect input:checked:eq(0)'), // first module selected
            sizes = ['4x4','4x2','2x2','2x1','1x1'],
            mod,i,m,modsList=[];

        this.doModuleSingle($mod.data('name'));
    }
    //***************************
    // eof DEVELOPMENT
    //***************************

});