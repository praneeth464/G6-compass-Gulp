/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
ModuleView,
TheDudeListCollection,
TheDudeModuleView:true
*/
TheDudeModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //dev module specific init stuff here

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        this.dudeList = new TheDudeListCollection();

        this.on('templateLoaded',function(){
            this.dudeList.loadData();
        },this);
        
        //listen to dudeList
        this.dudeList.on('reset',function(){this.renderList();},this);
        this.dudeList.on('add',function(){this.renderList();},this);
        this.dudeList.on('remove',function(){this.renderList();},this);
    },

    renderList:function(){
        var $ul = this.$el.find('ul').first(),
            that = this;
        $ul.empty();

        // tpl( this.dudeList.toJSON() );
        _.each(this.dudeList.models,function(model){
            // console.log(model);
            $ul.append(
                that.make('li',{
                    id : 'dude' + model.get('cid')
                },model.get('firstName')+' '+(model.get('lastName')||'n/a'))
            );
            $ul.find('#dude'+model.get('cid')).prepend(
                '<input type="checkbox" value="'+model.get("cid")+'" name="dudes" id="dude'+model.get("cid")+'" />'
            );
        });

        this.$el.find('.count').text(this.dudeList.length);
    },

    events:{
        'click .addBtn':'addItem',
        'click .remBtn':'removeItem'
    },

    addItem:function(e){
        var v = this.$el.find('input:eq(0)').val().split(' ');

        this.dudeList.add({"firstName":v[0],"lastName":v[1]});

    },

    removeItem:function(e){
        var that = this,
            $dudesToRemove = this.$el.find(':checked');

        _.each($dudesToRemove,function(dude){
            // idsOfDudesToRemove.push($(dude).val());

            that.dudeList.remove( that.dudeList.where({ id : $(dude).val() }) );
        });

        // modelsToRemove = this.dudeList.where({  })

        // console.log($dudesToRemove);
        // console.log(idsOfDudesToRemove);

        // this.dudeList.remove(idsOfDudesToRemove);
    }

});