/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SSIDTGTActivityModelView,
SSIDTGTActivityCollection,
SSIDTGTActivityCollectionView:true
*/
SSIDTGTActivityCollectionView = Backbone.View.extend({

    // these are referenced by containing view, so it can pass
    // the tpl to the contructor for this
    tplPath: './../apps/ssi/tpl/', // fe dev uses this
    tplName: 'ssiDtgtActivityCollectionView',

    tagName: 'div',
    className: 'ssiDtgtActivityCollectionView',

    MAX_ACTIVITIES: 10, // maximum

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
        this.activities = new SSIDTGTActivityCollection(opts.activitiesJson);

        // populate the participant count of each activity from the contest model
        this.activities.each(function(a){
            a.set('participantCount', that.contMod.get('participantCount'));
        });

        this.setupEvents();
    },

    events: {
        'click .addActivityBtn': 'doAddActivity',
        'click #activeActivityMask': 'doMaskClick'
    },

    setupEvents: function() {
        this.activities.on('addNew', this.handleAddNew, this);
        this.activities.on('saveNewStart', this.handleSaveNewStart, this);
        this.activities.on('saveNew', this.handleSaveNew, this);
        this.activities.on('removeNew', this.handleRemoveNew, this);
    },

    setupActivityEvents: function(a) {
        // throw up a mask when done displaying details
        a.on('end:displayDetails', this.handleDisplayDetails, this);

        // tear down the mask when done displaying details
        a.on('end:hideDetails', this.handleHideDetails, this);

        // add to collection request
        a.on('req:addToCollection', this.handleAddToCollectionRequest, this);

        // before ajax
        a.on('activityEditStarted', this.handleActivityEditStarted, this);
        // activity edited - after ajax
        a.on('activityEdited', this.handleActivityEdited, this);

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
        this.renderActivities();
        this.update();
        return this.$el;
    },

    renderActivities: function() {
        var $list = this.$el.find('.activityList'),
            that = this;

        this.activities.each(function(a){
            var m = new SSIDTGTActivityModelView({
                model: a,
                tpl: that.modelTpl,
                contMod: that.contMod
            });

            a.view = m; // give the Model a ref to its view

            $list.append( m.render() );

            // attach generic handlers
            that.setupActivityEvents(m);
        });

    },

    renderNewActivity: function() {
        var na = this.activities.getActiveNewModel(),
            $naw = this.$el.find('.newActivity'),
            nav = new SSIDTGTActivityModelView({
                model: na,
                tpl: this.modelTpl,
                contMod: this.contMod
            });

        na.view = nav; // give the Model a ref to its view

        $naw.append(nav.render());

        // attach generic handlers
        this.setupActivityEvents(nav);

        // destroy request (for active new)
        nav.on('req:destroy', this.handleDestroyActiveNew, this);

        nav.displayDetails();
    },

    update: function() {
        this.updateNoActivities();
        this.updateBottomControls();
        this.updateHeaders();
        this.updateFooters();
    },

    updateNoActivities: function() {
        var ac = this.activities.length||0;

        this.$el.find('.noActivities')[ac>0 ? 'hide' : 'show']();
    },

    updateHeaders: function() {
        var ac = this.activities.length||0;
        this.$el.find('.headerDescriptions')[ac>0 ? 'show' : 'hide']();
    },

    updateFooters: function() {
        var $fs = this.$el.find('.activityItem.footer'),
            $t = $fs.find('.totMaxActPay'),
            ac = this.activities.length||0,
            tot;


        //maxPayout sum
        tot = _.reduce(
            this.activities.pluck('maxPayout'),
            function(maxPaySum, maxPay){
                return maxPaySum + maxPay;
            },
            0
        );

        // show - hide footer totols
        $fs[ac > 0 ? 'show' : 'hide']();

        // set total
        $t.text($.format.number(tot, '#,##0.####'));
    },

    updateBottomControls: function() {
        var $bc = this.$el.find('.bottomControls'),
            $addBtn = $bc.find('.addActivityBtn'),
            anm = this.activities.getActiveNewModel(); // activeNewActivity?

        if(anm || this.activities.length >= this.MAX_ACTIVITIES) {
            $addBtn.attr('disabled', 'disabled');
        } else {
            $addBtn.removeAttr('disabled');
        }

    },

    maskOn: function(modelView) {
        var $m = this.$el.find('#activeActivityMask');

        modelView.mask();
        $m.show();

        $.scrollTo(modelView.$el, 200, {axis:'y',offset:{top:-20}} );
    },
    maskOff: function(modelView) {
        var $m = this.$el.find('#activeActivityMask');

        modelView.unmask();
        $m.hide();
    },

    updateCurrency: function() {
        var curObj = this._currency,
            $f = this.$el.find('.footer'),
            anm = this.activities.getActiveNewModel();

        if(!curObj) { return; }

        $f.find('.currSymb.pay').text(curObj.payout.symbol);
        $f.find('.currDisp.pay').text(curObj.payout.display);
        $f.find('.currSymb.act').text(curObj.activity.symbol);
        $f.find('.currDisp.act').text(curObj.activity.display);

        // update activity items
        this.activities.each(function(a) {
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
    doAddActivity: function(e) {
        this.activities.addNew(this.contMod.get('participantCount'));
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
        this.renderNewActivity();
        this.updateBottomControls();
        this.updateCurrency();
    },

    // remove from UI, cancel button was clicked on new activity
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
        this.updateNoActivities();
        this.updateBottomControls();
        this.updateFooters();

        this.saveActivitiesToContestModel();
    },

    handleSaveNewStart: function() {
        this.lockUI(true);
    },

    // saved new to collection
    handleSaveNew: function(n) {
        this.lockUI(false);
        // move element to list container
        this.$el.find('.activityList').append(n.view.$el);
        // give UI feedback
        G5.util.animBg(n.view.$el, 'background-flash');
        // update other stuff as necessary
        this.updateHeaders();
        this.updateNoActivities();
        this.updateBottomControls();
        this.updateCurrency();
        this.updateFooters();

        this.saveActivitiesToContestModel();
    },

    handleActivityEditStarted: function() {
        this.lockUI(true);
    },

    handleActivityEdited: function(a) {
        this.lockUI(false);
        this.updateFooters();
        this.saveActivitiesToContestModel();
    },

    handleAddToCollectionRequest: function(modelView) {
        // we can assume this came from the activeNew model
        this.activities.saveNew();
    },

    handleDestroyActiveNew: function() {
        var modView = this.activities.getActiveNewModel().view;
        this.activities.removeNew();
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


    /* **************************************************
        Utility
    ***************************************************** */
    setCurrency: function(obj) {
        this._currency = obj;
        this.updateCurrency();
    },

    saveActivitiesToContestModel: function() {
        this.contMod.set('activities', this.activities.toJSON());
    }

});
