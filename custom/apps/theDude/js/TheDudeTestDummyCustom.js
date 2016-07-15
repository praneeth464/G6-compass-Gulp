window.TheDudeModuleView = ModuleView.extend({

	//override super-class initialize function
	initialize:function(opts){

		//this is how we call the super-class initialize function (inherit its magic)
		this.constructor.__super__.initialize.apply(this, arguments);

		//dev module specific init stuff here

		//inherit events from the superclass ModuleView
		this.events = _.extend({},this.events,this.constructor.__super__.events);

		this.dudeList = new TheDudeListCollection();

		this.on('templateLoaded',function(){this.dudeList.loadData();},this);
		
		//listen to dudeList
		this.dudeList.on('reset',function(){this.renderList();},this);
		this.dudeList.on('add',function(){this.renderList();},this);
	},

	renderList:function(){
		var $ul = this.$el.find('ul').first()
			that = this;
		$ul.empty();
		_.each(this.dudeList.models,function(model){
			$ul.append(that.make('li',{},model.get('firstName')+' '+(model.get('lastName')||'n/a')));
		});

		this.$el.find('.count').text(this.dudeList.length);
	},

	events:{
		'click .addBtn':'addItem'
	},

	addItem:function(e){
		var v = this.$el.find('input:eq(0)').val();

		this.dudeList.add({"firstName":v});

	}

});