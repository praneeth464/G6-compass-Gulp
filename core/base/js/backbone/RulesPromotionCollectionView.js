/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
RulesPromotionCollection,
RulesPromotionModelView,
RulesPromotionCollectionView:true
*/
RulesPromotionCollectionView = Backbone.View.extend({
    // el: $('#rulesPage'), // el attaches to existing element

    initialize: function(opts){
        var thisView = this,
            singlePromotion = opts.promoId ? opts.promoId : null;

        //set the model to be a collection
        //since this is a basic data load, we'll just use a generic Collection
        // if we start updating specific budgets etc. we will want to
        // break this out into its own Collection/Model
        this.model = new Backbone.Collection();


        //when this model gets reset, then render this
        //this.model.on('reset',function(){this.render();},this);
        //load budgets (data-* attrs are added to request params)
        //this.loadRules(this.$el.data());

            this.collection = new RulesPromotionCollection();
            this.collection.loadRules(singlePromotion);
            this.collection.on('dataLoaded', function() {
                thisView.render();
                thisView.$el.find("#col-left").find("a").first().click(); //Select the first rule
            });

      _.bindAll(this, 'render', 'updateRules'); // every function that uses 'this' as the current object should be in here

      this.collection.bind('add', this.appendItem); // collection event binder

    },

    events: {
        'click #col-left a': 'updateRules'
    },

    render: function(){
        var self = this,
            headings = this.collection.pluck('categoryName'),
            listOfPromotions = this.collection.pluck('categoryId'),
            generateSideBar = false,
            output = "";

        if (this.collection.models.length > 1 ){
            generateSideBar = true;
        }
        if (this.collection.models.length){
            $('#rulesPage').empty();
        }else{
            $("#rulesEmpty").show();
        }

        listOfPromotions = _.uniq(listOfPromotions);

        $.each(listOfPromotions, function(index, value) {
            listOfPromotions[index] = {
                categoryId: value,
                categoryName: self.collection.where({categoryId: value})[0].get('categoryName'),
                promotions: []
            };
            _.each(self.collection.where({categoryId: value}), function (promo){
                listOfPromotions[index].promotions.push( promo.toJSON() );
            });

        });

        if (this.collection.models.length){
            output = {
                generateSideBar : generateSideBar,
                firstContent: listOfPromotions[0].promotions[0].content,
                firstTitle: listOfPromotions[0].promotions[0].name,
                listOfPromotions : listOfPromotions
            };
        }

        TemplateManager.get('rulesPageView',function(tpl){

            $('#rulesPage').append( tpl(output) );
            self.$el.find("#col-left").find("a").first().click(); //trigger updateRules()

        }, G5.props.URL_BASE_ROOT + 'tpl/');

        var sortedHeadings = _.uniq(headings);

        $.each(sortedHeadings, function(index, category){
            if (category === 'undefined category type'){
                _.each(self.collection.where({categoryName: category}), function(item){
                    self.appendItem(item, category);
                }, this);

            } else {

                _.each(self.collection.where({categoryName: category}), function(item){
                    self.appendItem(item, category);
                }, this);
            }
        });
    },

    appendItem: function(item, currentCategory){
        var rulesPromotionView = new RulesPromotionModelView({
            model: item
        });
        if($('#rulesPromotionCollection').find('.categoryNameList').length && (currentCategory !== 'undefined category type')){
            this.$el.find('.categoryNameList').last().append(rulesPromotionView.render().el);
        } else {
            this.$el.find('#rulesPromotionCollection').prepend(rulesPromotionView.render().el);
        }
    },

    updateRules: function(e){
        e.preventDefault ? e.preventDefault() : e.returnValue = false;
        var selectedLink = $(e.target).attr('id').replace(/rules/,'');
        var newContent = this.collection.get(selectedLink).get('content');
        var newTitle = this.collection.get(selectedLink).get('name');
        $('#rulesTitle').html(newTitle);
        $('#rulesContent').html(newContent);
        $('#col-left').find('li').removeClass("active");
        $('#rules' + selectedLink).parent().addClass('active');
    }

  });