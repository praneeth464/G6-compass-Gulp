/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
PageView,
DisplayTableAjaxView,
ManagerToolkitPageRosterView:true
*/
ManagerToolkitPageRosterView = PageView.extend({
    
    //override super-class initialize function
    initialize: function(opts) {

        console.log('[INFO] ManagerToolkitPageRosterView: Manager Toolkit Page Roster View initialized', this);

        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = "managerToolkit";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.$orgUnit = this.$el.find('#orgUnitSelect');
        this.$status = this.$el.find('#statusSelect');
        this.$add = this.$el.find('.addPaxBtn');

        this.initControls();
        this.initTable();

        this.doInputChange();
    },

    events: {
        'change #orgUnitSelect':'doInputChange',
        'change #statusSelect':'doInputChange',

        'click .addPaxBtn':'doAddPax'
    },

    initControls: function() {
        var $optsWithVals = this.$orgUnit.find('option[value]'),
            $single = this.$el.find('.singleOrgUnitDisplay');
        // hide only one orgUnit
        if($optsWithVals.length===1) {
            this.$orgUnit.val($optsWithVals.val());// set active val
            this.$orgUnit.hide();
            $single.find('span').text(this.$orgUnit.find('option:selected').text());
            $single.show();
        }
    },
    initTable: function() {
        if(this.dispTableView) { return; }

        this.dispTableView = new DisplayTableAjaxView({
            el:$('.displayTableAjaxView'),
            delayLoad: true // don't load data immediately
        });

        // attach pax popovers on load of table html
        this.dispTableView.on('htmlLoaded', function(){
            this.dispTableView.$el.find('.paxPopover').participantPopover();
        }, this);

    },

    updateControls: function() {
        var isOU = this.getOrgUnit();

        // enable/disable depending on has orgUnit value
        this.$status[isOU?'removeAttr':'attr']('disabled','disabled');
        this.$add[isOU?'removeClass':'addClass']('disabled');

        // set hidden input with label of selected orgUnit
        this.$el.find('#orgUnitLabel').val(this.$orgUnit.find('option:selected').text());

    },

    loadTable: function() {
        var ou = this.getOrgUnit(),
            st = this.getStatus(),
            ouName = this.$orgUnit.attr('name'),
            stName = this.$status.attr('name'),
            params = {};

        params[ouName] = ou;
        params[stName] = st;

        this.dispTableView.setExtraParams(params);
        this.dispTableView.loadHtml();
    },

    doInputChange: function(e) {
        this.updateControls();

        if(this.getOrgUnit() && this.getStatus()) {
            this.loadTable();
        }
    },

    doAddPax: function(e) {
        var $form = this.$el.find('.addPaxForm'),
            $tar = e?$(e.currentTarget):null;
        e?e.preventDefault():false;
        if(this.getOrgUnit()){
            $form.submit();
        }else if($tar){
            $tar.qtip({
                content: $tar.data('msgValidate'),
                position:{my:'bottom center',at:'top center'},
                show:{ready:true},
                hide:{event:'mouseleave',delay:500},
                //only show the qtip once
                events:{hide:function(evt,api){
                    $tar.qtip('destroy');
                }},
                style:{classes:'ui-tooltip-shadow ui-tooltip-red'}
            });
        }
    },


    // MODELISH STUFF
    getOrgUnit: function() {
        var $selOpt = this.$orgUnit.find('option:selected'),
            hasValue = $selOpt.index() !== 0; // val === text, then no 'value' attr

        return hasValue ? $selOpt.val() : null;
    },
    getStatus: function() {
        var $selOpt = this.$status.find('option:selected'),
            hasValue = $selOpt.index() !== 0; // try to determin a label option (instruction)

        return hasValue ? $selOpt.val() : null;
    }

});