/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
ModuleView,
PublicRecognitionSetCollectionView,
PublicRecognitionModuleView:true
*/
PublicRecognitionModuleView = ModuleView.extend({

    initialize:function(){

        //this is how we call the super-class initialize function
        ModuleView.prototype.initialize.apply(this, arguments);

        //merge events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon-only - smallest
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // half-size big
            {w:4,h:4}  // biggest
        ],{silent:true});

        //when the module template is loaded, then add the PublicRecognitionModelView
        this.on('templateLoaded',function(){
            //add the budget collection view
            this.pubRecSetCollectionView = new PublicRecognitionSetCollectionView({
                el:this.$el, //sharing the same element as Module
                //when using a local template it couldn't find these
                //"$tabsParent":$('.pubRecTabs'),
                //"$recognitionsParent":$('.pubRecItemsCont')
                "$tabsParent":this.$el.find('.pubRecTabs'),
                "$recognitionsParent":this.$el.find('.pubRecItemsCont')
            });
        },this);


        //hide body relative elements on goemetry change
        this.on('beforeGeometryChange',function(){
            this.$el.find('.profile-popover').qtip('hide');
        },this);

        //do upkeep for elements that need to be modified
        this.on('geometryChanged',function(d){
            if(this.pubRecSetCollectionView && d.w*d.h>0) {
                _.each(this.pubRecSetCollectionView.getViews(), function(v,k){
                    if(v.$el.is(':visible')) {
                        // reset the height on visible readMore elements
                        v.initReadMore();
                    }
                });
            }
        },this);

    },

    events: {
        // proxying some clicks from here down to the specific items for the confirmation tip
        "click .publicRecognitionHideRecognitionConfirm": "doHide",
        "click .publicRecognitionHideRecognitionCancel": "hideHideConfirmTip",
        "click .publicRecognitionDeleteRecognitionConfirm": "doDelete",
        "click .publicRecognitionDeleteRecognitionCancel": "hideDeleteConfirmTip",
    },

    doHide: function(e) {
        var modelView = $(e.target).closest('.ui-tooltip').data('modelView');
        modelView.doHide();
    },

    hideHideConfirmTip: function(e) {
        var modelView = $(e.target).closest('.ui-tooltip').data('modelView');
        modelView.hideHideConfirmTip();
    },
    doDelete: function(e) {
        var modelView = $(e.target).closest('.ui-tooltip').data('modelView');
        modelView.doDelete();
    },

    hideDeleteConfirmTip: function(e) {
        var modelView = $(e.target).closest('.ui-tooltip').data('modelView');
        modelView.hideDeleteConfirmTip();
    }


});