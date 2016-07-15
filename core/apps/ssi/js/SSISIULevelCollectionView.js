/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
SSISIULevelModelView,
SSISIULevelCollection,
SSISIULevelCollectionView:true
*/
SSISIULevelCollectionView = Backbone.View.extend({

    // these are referenced by containing view, so it can pass
    // the tpl to the contructor for this
    tplPath: './../apps/ssi/tpl/', // fe dev uses this

    tplName: 'ssiSiuLevelCollectionView',

    tagName: 'div',

    className: 'ssiSiuLevelCollectionView',

    MAX_LEVELS: 5, // maximum

    initialize: function(opts) {
        var that = this;

        // containing view should load the tpl already
        this.tpl = opts.tpl;
        this.subTpls = opts.subTpls;

        this.modelTpl = opts.modelTpl;
        this.modelSubTpls = opts.modelSubTpls;

        // SSIContestModel
        this.contMod = opts.contestModel;

        // the Collection
        this.levels = new SSISIULevelCollection(opts.levelsJson);

        this.setupEvents();
    },

    events: {
        'click .addLevelBtn': 'doAddLevel',
        'click #activeLevelMask': 'doMaskClick'
    },

    setupEvents: function() {
        this.contMod.on('change:measureType', this.handleMeasureTypeChange, this);
        this.contMod.on('change:payoutType', this.handlePayoutTypeChange, this);

        this.levels.on('addNew', this.handleAddNew, this);
        this.levels.on('saveNewStart', this.handleSaveNewStart, this);
        this.levels.on('saveNew', this.handleSaveNew, this);
        this.levels.on('removeNew', this.handleRemoveNew, this);
    },

    setupLevelEvents: function(a) {
        // throw up a mask when done displaying details
        a.on('end:displayDetails', this.handleDisplayDetails, this);

        // tear down the mask when done displaying details
        a.on('end:hideDetails', this.handleHideDetails, this);

        // add to collection request
        a.on('req:addToCollection', this.handleAddToCollectionRequest, this);

        // before ajax
        a.on('levelEditStarted', this.handleLevelEditStarted, this);
        // level edited - after ajax
        a.on('levelEdited', this.handleLevelEdited, this);

        // if one of these is removed, we might have to update UI
        a.model.on('remove', this.handleRemove, this);

        a.model.on('start:remove', this.handleRemoveStart, this);
        a.model.on('end:remove', this.handleRemoveEnd, this);
    },


    /* **************************************************
        UI Update/Render
    ***************************************************** */
    render: function() {
        this.$el.html( this.tpl({}) );
        this.renderLevels();
        this.update();

        return this.$el;
    },

    renderLevels: function() {
        var $list = this.$el.find('.levelList'),
            that = this;

        this.levels.each(function(a){
            var m = new SSISIULevelModelView({
                model: a,
                tpl: that.modelTpl,
                contMod: that.contMod
            });

            a.view = m; // give the Model a ref to its view

            $list.append( m.render() );

            // attach generic handlers
            that.setupLevelEvents(m);
        });

    },

    renderNewLevel: function() {
        var na = this.levels.getActiveNewModel(),
            $naw = this.$el.find('.newLevel'),
            nav = new SSISIULevelModelView({
                model: na,
                tpl: this.modelTpl,
                contMod: this.contMod
            });

        na.view = nav; // give the Model a ref to its view

        $naw.append(nav.render());

        // attach generic handlers
        this.setupLevelEvents(nav);

        // destroy request (for active new)
        nav.on('req:destroy', this.handleDestroyActiveNew, this);

        nav.displayDetails();
    },

    update: function() {
        this.updateNoLevels();
        this.updateBottomControls();
        this.updateHeaders();
        this.updateFooters();
    },

    updateNoLevels: function() {
        var ac = this.levels.length||0;
        this.$el.find('.noLevels')[ac>0 ? 'hide' : 'show']();
    },

    updateHeaders: function() {
        var ac = this.levels.length||0,
            pt = this.contMod.get('payoutType'),
            badges = this.contMod.get('badges');

        this.$el.find('.headerDescriptions')[ac>0 ? 'show' : 'hide']();

        this.$el.find('.headerDescriptions .levelPayoutDesc')[pt=='other'?'show':'hide']();

        if(!badges || !badges.length) { // no stinking badges
            this.$el.find('.headerDescriptions .levelBadge').hide();
        }
    },

    updateFooters: function() {
        // maybe someday
        // TODO: Check this and remove refs or complete function
    },

    updateBottomControls: function() {
        var $bc = this.$el.find('.bottomControls'),
            $addBtn = $bc.find('.addLevelBtn'),
            anm = this.levels.getActiveNewModel(); // activeNewLevel?

        if(anm || this.levels.length >= this.MAX_LEVELS) {
            $addBtn.attr('disabled', 'disabled');
        } else {
            $addBtn.removeAttr('disabled');
        }

    },

    maskOn: function(modelView) {
        var $m = this.$el.find('#activeLevelMask');

        modelView.mask();
        $m.show();

        $.scrollTo(modelView.$el, 200, {axis:'y',offset:{top:-20}} );
    },

    maskOff: function(modelView) {
        var $m = this.$el.find('#activeLevelMask');

        modelView.unmask();
        $m.hide();
    },

    updateCurrency: function() {
        var curObj = this._currency,
            $f = this.$el.find('.footer'),
            anm = this.levels.getActiveNewModel(),
            mob = this.contMod.get('measureOverBaseline'),
            mt = this.contMod.get('measureType'),
            classToDisp;

        // labels for measure input field
        this.$el.find('.levelAmount .msg').addClass('hide');

        if(mob == 'no') {
            if(mt == 'currency') {
                classToDisp = 'currency';
            } else { // mt == 'units'
                classToDisp = 'amount';
            }
        } else { // measureOverBaseline is on
            if(mob == 'currency') {
                if(mt == 'currency') {
                    classToDisp = 'currencyOverBaseline';
                } else { // mt == 'units'
                    classToDisp = 'amountOverBaseline';
                }
            } else { // mob == 'percent'
                classToDisp = 'percentOverBaseline';
            }
        }
        // display that duder
        this.$el.find('.levelAmount .'+classToDisp).removeClass('hide');


        if(!curObj) { return; }

        $f.find('.currSymb.pay').text(curObj.payout.symbol);
        $f.find('.currDisp.pay').text(curObj.payout.display);
        $f.find('.currSymb.act').text(curObj.activity.symbol);
        $f.find('.currDisp.act').text(curObj.activity.display);

        // update level items
        this.levels.each(function(a) {
            a.view.updateCurrency(curObj);
        });

        // active new model
        if(anm) {
            anm.view.updateCurrency(curObj);
        }

    },


    /* **************************************************
        UI Actions - clicks etc.
    ***************************************************** */
    doAddLevel: function(e) {
        this.levels.addNew();
    },

    // mask click only happens when the active material item needs confirmation to save
    doMaskClick: function(e) {
        this._displayedModel.showMustSaveTip();
    },

    // lock/unlock UI
    lockUI: function(isLock) {
        if(isLock) {
           this.$el.find('.lockUI').fadeIn(100);
        } else {
            this.$el.find('.lockUI').stop(true, true).fadeOut(100);
        }
    },


    /* **************************************************
        Handlers - what to do when contestModel changes
    ***************************************************** */
    // not added to collection, exists in UI, but not saved
    handleAddNew: function(n) {
        this.renderNewLevel();
        this.updateBottomControls();
        this.updateCurrency();
    },

    // remove from UI, cancel button was clicked on new level
    handleRemoveNew: function(n) {
        this.updateBottomControls();
    },

    handleRemoveStart: function() {
        this.lockUI(true);
    },

    handleRemoveEnd: function() {
        this.lockUI(false);
    },

    // removed from collection
    handleRemove: function(m) {
        this.updateHeaders();
        this.updateNoLevels();
        this.updateBottomControls();
        this.updateFooters();

        this.saveLevelsToContestModel();
    },

    handleSaveNewStart: function() {
        this.lockUI(true);
    },

    // saved new to collection
    handleSaveNew: function(n) {
        this.lockUI(false);
        // move element to list container
        this.$el.find('.levelList').append(n.view.$el);
        // give UI feedback
        G5.util.animBg(n.view.$el, 'background-flash');
        // update other stuff as necessary
        this.updateHeaders();
        this.updateNoLevels();
        this.updateBottomControls();
        this.updateCurrency();
        this.updateFooters();

        this.saveLevelsToContestModel();
    },

    handleLevelEditStarted: function() {
        this.lockUI(true);
    },

    handleLevelEdited: function(a) {
        this.lockUI(false);
        this.updateFooters();
        this.saveLevelsToContestModel();
    },

    handleAddToCollectionRequest: function(modelView) {
        // we can assume this came from the activeNew model
        this.levels.saveNew();
    },

    handleDestroyActiveNew: function() {
        var modView = this.levels.getActiveNewModel().view;

        this.levels.removeNew();
        modView.destroy();
    },

    handleDisplayDetails: function(modelView) {
        this._displayedModel = modelView;
        this.maskOn(modelView);
    },

    handleHideDetails: function(modelView) {
        this._displayedModel = null;
        this.maskOff(modelView);
    },

    handlePayoutTypeChange: function() {
        this.updateHeaders();
        this.saveLevelsToContestModel();
    },

    handleMeasureTypeChange: function() {
        var that = this;
        // tricky tricky, let this event handled stuff happen after other events
        // watch this out in case of bugzors
        setTimeout(function(){
            that.saveLevelsToContestModel();
        }, 0);
    },


    /* **************************************************
        Utility
    ***************************************************** */
    setCurrency: function(obj) {
        this._currency = obj;
        this.updateCurrency();
    },

    saveLevelsToContestModel: function() {
        this.contMod.set('levels', this.levels.toJSON());
    }

});
