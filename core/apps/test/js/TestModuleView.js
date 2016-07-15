/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
ModuleView,
TestModuleView:true
*/
TestModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //dev module specific init stuff here

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);


    },

    doFilterChangeWork:function(){

        //call the superclass function (inheritance, js style)
        this.constructor.__super__.doFilterChangeWork.apply(this, arguments);

        //set the DOM elements
        this.$el.find('.filterName').text(this.model.collection.getFilter());
        this.$el.find('.moduleOrder').val(this.model.getOrder());
        this.$el.find('.moduleSize').val(this.model.getGridDimensionsStr());
    },

    doBeforeGeometryChange:function(gridWidth,gridHeight){
        var $msInp,dStr;

        //call the superclass function (inheritance, js style)
        this.constructor.__super__.doBeforeGeometryChange.apply(this, arguments);

        //when the parent calls this method, it may update the dimension
        //lets show if they have changed by durning the input for size red
        dStr = gridWidth+'x'+gridHeight;
        $msInp = this.$el.find('.moduleSize');
        $msInp.css('color',this.model.getGridDimensionsStr()===dStr?'':'red');
        $msInp.val(dStr);
    },

    events:{
        'keyup .moduleOrder': 'doOrderKeyup',
        'keyup .moduleSize': 'doModuleSizeKeyup'
    },

    doOrderKeyup:function(e){
        var v = this.$el.find('.moduleOrder').val();
        if(this.isNumOrLet(e))
            this.model.setOrder(v);
    },

    doModuleSizeKeyup:function(e){
        var v = this.$el.find('.moduleSize').val();

        if(this.isNumOrLet(e)){
            try{
                this.model.setGridDimensionsStr(v);
                this.$el.find('.moduleSize').removeClass('error');
            }catch (err){
                if (err.name === 'GridDimensionStrError'){
                    this.$el.find('.moduleSize').addClass('error');
                } else {
                    throw err;
                }
            }
        }   
        
    },

    isNumOrLet:function (evt){//use to filter acceptable keystrokes on input
        if (typeof evt.which == "undefined") {
            return true;
        } else if (typeof evt.which == "number" && evt.which > 0) {
            return !evt.ctrlKey && !evt.metaKey && !evt.altKey && 
                evt.which != 8 && evt.which > 47 && evt.which < 128;
        }
        return false;
    }
});