/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
WizardTabsView:true
*/

/*
    A view to manage wizard style tabs.

*/
WizardTabsView = Backbone.View.extend({

    // static setting in pixels
    MAX_TAB_WIDTH: 960,
    MIN_TAB_WIDTH: 60,
    MAX_TAB_HEIGHT: 84,
    MIN_TAB_HEIGHT: 40, // if shorter than this, this will be .wtTabLiner height
    IDEAL_TAB_TEXT_WIDTH: 140,
    MIN_TAB_TEXT_WIDTH: 60, // threshold to switch to compact mode
    MIN_TAB_TEXT_HEIGHT: 80,

    initialize: function(opts) {
        var that = this;

        // store bootstrapped JSON tabs
        this.tabsJson = opts && opts.tabsJson ? opts.tabsJson : null;

        this.$tabs = this.$el.find('.wtTab');

        // if there are no tabs found in the given view container, we need to trigger the remote tab retrieval and building.
        if( !this.$tabs.length ) {
            // set some defaults just in case these values aren't explicitly set
            this.tplName = opts.tplName||'wizardTab';
            this.tplUrl = opts.tplUrl||G5.props.URL_BASE_ROOT+'tpl/';
            this.tabsJsonUrl = opts.tabsJsonUrl;

            // build 'em
            this.fetchTabIngredients();

            // We also need to terminate the initialization before it gets a chance to break. Don't worry, the async requests call initialize() again
            return false;
        }

        // now that we have tabs in the DOM, we can continue.

        // create a Backbone Collection for the tabs. If we've done remote retrieval (or bootstrapped tabs JSON), it should exist by this point
        this.tabs = new Backbone.Collection(this.tabsJson || null);

        // if the Collection remains empty, we need to extract tabs JSON from the DOM
        if( !this.tabs.length ) {
            this.extractModelData();
        }
        // do a little manipulation on the tabs and their data
        this.massageModelData();

        // this.updateTabs();
        // this.updateGeom();
        this.pollForVisibleInit();

        // collection and model events
        this.tabs.on('change', this.updateTabs, this);
        this.tabs.on('change', this.updateGeom, this);
        // notify listeners
        this.tabs.on('change:state', function(o){
            this.trigger('tabStateChange',o);
        }, this);

        // listen for tab activation
        this.on('afterTabActivate', this.doAfterTabActivate, this);

        // on resize check for width change
        $(window).on('resize', _.throttle(function(){that.checkWidth();}, 100));

        // tell dynamically generated views that the initialization is done
        // we have to pause for a fraction of a second to allow listeners to be added to this view from outside
        setTimeout(function() {
            that.trigger('tabsInitialized');
        }, 1);
    },

    // sometimes the $el is not yet visible when this thing is initialized and we need to make sure we update stuff when it
    // becomes visible
    pollForVisibleInit: function() {
        var vis = this.$el.is(':visible'),
            that = this;
        if(vis) { // update
            this.updateTabs();
            this.updateGeom();
        } else { // keep calling this func until we are visible
            setTimeout(function(){
                that.pollForVisibleInit();
            },100);
        }
    },

    events: {
        "click .wtTab":"doTabClick"
    },


    // DOM EVENTS *********************************************
    doTabClick: function(e) {
        var $tar = $(e.currentTarget),
            origTab = this.getActiveTab(),
            destTab = this.getTabByEl($tar);

        // custom tab click handler?
        if(this.options.onTabClick) {
            this.options.onTabClick(e, origTab, destTab, this);
            return;
        }
        // default tab click handling
        else {
            e.preventDefault();
            this.activateTab($tar);
        }
    },



    // update geom when width changes
    checkWidth: function() {
        var curWidth = this.$el.width();

        if(this.lastWidth !== curWidth) {
            this.updateGeom();
        }

        this.lastWidth = curWidth;
    },



    // BUILD TABS *********************************************
    fetchTabIngredients: function() {
        var thisView = this;

        // get the template
        TemplateManager.get(this.tplName,function(tpl){
            thisView.tabsTpl = tpl;
            thisView.buildTabs();
        }, G5.props.URL_TPL_ROOT||this.tplUrl);

        if( !this.tabsJson ) {
            // get the JSON to power the tabs
            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: this.tabsJsonUrl,
                success: function (servResp) {
                    thisView.tabsJson = servResp.data.tabs;
                    thisView.buildTabs();
                }
            });
        }
    },

    buildTabs: function() {
        if(this.tabsTpl && this.tabsJson) {
            // console.log(this.tabsTpl, this.tabsJson);
            this.$el.prepend( this.tabsTpl(this.tabsJson) );
            this.initialize();
        }
        else {
            return false;
        }
    },



    // UPDATE TABS *********************************************
    // sync visual with model state
    updateTabs: function() {
        _.each(this.tabs.models, function(t){
            var stCls = t.get("state"),
                isAct = t.get('isActive');

            t.$tab.attr('class',t.$tab.attr('class').replace(/state[A-Z][a-z]+/,''));// cear state classes
            t.$tab.addClass('state' + stCls.charAt(0).toUpperCase() + stCls.slice(1));// add state classes

            // activate
            t.$tab[isAct?'addClass':'removeClass']('active'); // active class
            t.$content[isAct?'show':'hide'](); // update content visibility
        });
    },
    doAfterTabActivate: function() {
        if( this.options.scrollOnTabActivate ) {
            $.scrollTo( this.$el, {axis : 'y', duration: G5.props.ANIMATION_DURATION / 2 });
        }
    },






    // UPDATE GEOM ****************************************************
    // JS + css layout management
    updateGeom: function() {
        this.$el.css('visibility','hidden');

        // set widths
        this.updateWidths();

        // set heights
        this.updateHeights();

        // set vertical alignment
        this.updateVerticalAlignments();

        // add last class
        this.$tabs.filter(':last').addClass('last');

        this.$el.css('visibility','visible');
    },
    // cascade through different styles to find best geometric fit
    updateWidths: function() {
        var $names = this.$tabs.find('.wtName');

        // reset these (might be set later)
        this.$el.removeClass('compactMode superCompactMode wideMode');
        this.$el.css('padding-left','');

        // norml
        this.updateWidthsNormalMode();

        // wide mode
        if(this.$tabs.width() >= this.MAX_TAB_WIDTH) {
            this.wideMode = true;
            this.$el.addClass('wideMode');
            this.updateWidthsWideMode();
        } else {
            this.wideMode = false;
        }

        // compact/superCompact mode
        // check to see if width is too narrow and switch to name hide mode
        if($names.width() < this.MIN_TAB_TEXT_WIDTH){
            this.isCompactMode = true;
            this.updateWidthsCompactMode();
        } else {
            this.isCompactMode = false;
        }

    },
    updateWidthsNormalMode: function() {
        var w = Math.round(this.$el.width() / this.$tabs.length),
            wDiff = this.$el.width() - w*this.$tabs.length;
        this.$tabs.width(w);
        // use last tab to absorb rounding diffs
        this.$tabs.filter(':last-child').width(w+wDiff);
    },
    updateWidthsWideMode: function() {
        var max = this.MAX_TAB_WIDTH,
            widthDiff = 0;

        this.$tabs.width(max);
        widthDiff = this.$el.outerWidth() - this.$tabs.length*max;
        this.$el.css('padding-left',Math.floor(widthDiff/2)+'px');// center align with padding
    },
    updateWidthsCompactMode: function() {
        var actW = this.IDEAL_TAB_TEXT_WIDTH,
            restW,
            wDiff,
            $names = this.$tabs.find('.wtName');

        this.$el.addClass('compactMode');

        restW = Math.round((this.$el.width()-actW)/this.$tabs.length);
        wDiff = this.$el.width() - restW*(this.$tabs.length-1) - actW;

        if(restW < this.MIN_TAB_WIDTH) { // not enough room for text even on active
            this.$el.addClass('superCompactMode');// hide the active text
            this.updateWidthsNormalMode();
        } else { // enough room for text on active
            this.$tabs.filter('.active').width(actW+wDiff);
            this.$tabs.filter(':not(.active)').width(restW);
        }


    },
    updateVerticalAlignments: function() {
        this.$tabs.find('.wtTabLiner').each(function(){
            var $liner = $(this),
                $name = $liner.find('.wtName'),
                $num = $liner.find('.wtNumber'),
                $icon = $liner.find('.wtIconWrap'),
                nameTop = Math.floor(($liner.height()-$name.outerHeight())/2),
                numTop = Math.floor(($liner.outerHeight()-$num.height())/2),
                iconTop =  Math.floor(($liner.outerHeight()-$icon.height())/2);

            nameTop = nameTop < 0 ? 0 : nameTop; //ie7 neg margin hides text sometimes

            $name.css('margin-top', nameTop+'px');
            $num.css('top', numTop+'px');
            $icon.css('top',iconTop+'px');
        });
    },
    updateHeights: function() {
        var maxH = 0,
            $liners = this.$tabs.find('.wtTabLiner'),
            $names = $liners.find('.wtName'),
            that = this;

        // clear any previous height
        this.clearHeights();

        // give a special class that will reduce height for tall tabs
        $liners
            .filter(  function(){return $(this).height() >= that.MAX_TAB_HEIGHT;}  ) // tall ones
            .closest('.wtTab').addClass('verticalCompact'); // add class to parent .wtTab el

        // unify heights
        maxH = $(_.max($liners, function(x){return $(x).height();})).height();
        maxH = maxH < this.MIN_TAB_HEIGHT ? this.MIN_TAB_HEIGHT : maxH; // check if its tall enough
        $liners.height(maxH);

        this.$el.css('height','').height(this.$el.height()); // freeze height
    },
    clearHeights: function() {
        this.$el.find('.wtTabLiner,.wtName').css({height:'','margin-top':''});
        this.$tabs.removeClass('verticalCompact');
    },




    // MODEL STUFF -- keep it in view for now
    // build a Model from the DOM elements
    extractModelData: function() {
        var that = this;

        this.$tabs.each(function(){
            var $t = $(this),
                json = {
                    "id": $t.data('tabUid'),
                    "name": $t.data('tabName'),
                    "isActive": $t.hasClass('active'),
                    "state": $t.data('tabState'),
                    "contentSel": $t.data('tabContent')
                };

            that.tabs.add(json);
        });
    },
    massageModelData: function() {
        var that = this, wereAnyActive = false;

        // NOTE: we're assuming that there is a 1:1 relationship between DOM tabs and JSON tabs
        // This should be safe, as in one case we build the DOM from the JSON and in the other case we build the JSON from the DOM
        this.tabs.each(function(tab, i) {
            var $t = that.$tabs.eq(i),
                $num = $t.find('.wtNumber');

            // let's make sure the tab has a special style class
            $t.addClass(tab.get('name'));

            // let's add numbers if none
            if(!$num.find('span').text()) {
                $num.find('span').text(i+1);
            }

            wereAnyActive = wereAnyActive || tab.get('isActive');

            // add refs to view dom elements
            // NOTE: typically it is an encapsulation no-no to have a reference to a view element inside the model
            // as the model should not know about view elements, or be expected to have refs to such. But this is
            // a DOM only powered model -- the data doesn't come from ajax/backend. So it is permissible. Amen.
            // NOTE^2: I'm letting Aaron get away with his "Amen." because I'm feeling generous.
            // Well, that and I'm not going to do the rewriting necessary to unwind these references.
            tab.$tab = $t;
            tab.$content = $(tab.get('contentSel')); // content can be anywhere in DOC
        });

        // set first tab active if none are active
        if(!wereAnyActive) {
            this.tabs.at(0).set("isActive",true,{silent:true});
        }
    },
    getTabs: function() {
        return this.tabs.models; // return the array of models in the 'tabs' collection
    },
    activateTab: function(id) {
        var tab = this.getTabByAnything(id);

        this.trigger('beforeTabActivate',tab);

        // if the state is locked, then don't allow activation
        if(tab.get('state')==='locked') {
            return false; // indicate fail
        }

        // turn all actives off SILENTLY
        _.each(this.tabs.where({isActive:true}),function(t){
            t.set('isActive',false,{silent:true});
        });

        // set our tab active LOUDLY
        tab.set('isActive',true);

        this.trigger('afterTabActivate',tab);

        return true; // indicate success
    },
    setTabState: function(id, newState, setRest) { // locked, unlocked, complete, incomplete...
        var that = this,
            tab = this.getTabByAnything(id),
            idx = this.tabs.indexOf(tab);

        // only 'unlock' 'locked' state, others are already 'unlocked'
        if( newState === 'unlocked') {
            if(tab.get('state') === 'locked') {
                tab.set('state', newState);
            }
        }
        // default case
        else {
            tab.set('state', newState);
        }

        // also set the tabs after to the same state
        if(setRest) {
            _.each(this.tabs.rest(idx+1), function(t) {
                that.setTabState(t.id, newState);
            });
        }
    },
    getActiveTab: function() {
        var at = this.tabs.where({isActive:true});
        return at.length ? at[0] : null;
    },
    getNextTab: function() {
        var at = this.getActiveTab(),
            idx = this.tabs.indexOf(at);

        return this.tabs.at(idx+1)||null;
    },
    getPrevTab: function() {
        var at = this.getActiveTab(),
            idx = this.tabs.indexOf(at);

        return this.tabs.at(idx-1)||null;
    },
    getAllPrevTabs: function() {
        var idx = this.tabs.indexOf(this.getActiveTab());
        return this.tabs.first(idx);
    },
    getTabById: function(id) {
        return this.tabs.get(id)||null;
    },
    getTabByName: function(name) {
        var t = this.tabs.where({'name':name});
        return t.length === 1 ? t[0] : null;
    },
    getTabByIndex: function(i) {
        return this.tabs.at(i)||null;
    },
    getTabByEl: function(el) {
        var $el = $(el),
            uid = $el.data('tabUid');
        return uid ? this.getTabById(uid) : null;
    },
    getTabByAnything: function(x) {
        return this.getTabById(x)||this.getTabByName(x)||this.getTabByIndex(x)||this.getTabByEl(x);
    },
    getTabsByState: function(state) {
        return this.tabs.where({state:state});
    },
    // get the tab after a named tab
    getTabAfterNamedTab: function(fromTabName) {
        var idx;
        fromTabName = fromTabName || this.getActiveTab().get('name');
        idx = this.tabs.indexOf(this.getTabByName(fromTabName));
        return this.tabs.at(idx+1) || null;
    }

});