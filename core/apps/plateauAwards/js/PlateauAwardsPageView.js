/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
PageView,
PlateauAwardsCollection,
PlateauAwardsPageView:true
*/
PlateauAwardsPageView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'plateauAwards';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create handy references to our important DOM bits
        this.$promos = this.$el.find('#promotionSelect');
        this.$levels = this.$el.find('#levelsTabs');
        this.$prods = this.$el.find('#productBrowser');
        this.$activeProd = null;

        //store spinner settings
        this.spinOpts = {
            lines: 13, // The number of lines to draw
            length: 11, // The length of each line
            width: 5, // The line thickness
            radius: 11, // The radius of the inner circle
            corners: 1, // Corner roundness (0..1)
            rotate: 0, // The rotation offset
            color: '#000', // #rgb or #rrggbb
            speed: 1, // Rounds per second
            trail: 60, // Afterglow percentage
            shadow: false, // Whether to render a shadow
            hwaccel: false, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: 'auto', // Top position relative to parent in px
            left: 'auto' // Left position relative to parent in px
        };

        //extract initial selections
        var datPromoId = opts.promotionId||this.$el.data('promotion-id')||false;
        var datLevelId = opts.levelId||this.$el.data('level-id')||false;
        var datProductId = opts.productId||this.$el.data('product-id')||false;

        //showing promotion selector?
        this.showPromotionSelect = opts.showPromotionSelect === false?false:true;
        this.$el.find('.promotionSelectWrapper')[this.showPromotionSelect?'show':'hide']();

        //show buttons for selecting items?
        this.isSelectMode = opts.isSelectMode||false;
        this.isSheetMode = opts.isSheetMode||false;

        //create our model
        this.model = new PlateauAwardsCollection();

        //listen to our model for promo level changes
        this.model.on('prodsForPromoLevelStart',this.wait,this);
        this.model.on('prodsForPromoLevelReady',this.update,this);      

        //initialize our data model
        this.model.setPromoLevel(datPromoId, datLevelId); 


        $('body').on('click',function(e){that.closeDrawer(e);});

    },
    
    //wait for model update
    wait:function(){
        //start the spinner
        var that = this;
        this.$el.find('.currentProducts').spin(that.spinOpts);
    },

    //sync the view with the model state
    update:function(){
        var that = this,
            activePromo = this.model.getActivePromo();

        //turn off the spinner on every update
        this.$el.find('.currentProducts').spin(false);

        //add promos to select drop-down if necessary
        _.each(this.model.models,function(p){that.renderPromotion(p.toJSON());});

        // if there is a promoId
        if(activePromo&&activePromo.get('id')) {  
            //set the promo id
            this.$promos.val(activePromo.get('id'));

            //set levels
            // TO DO
            this.renderLevels(activePromo.get('levels'));

            //set level products
            this.renderLevelContent(this.model.getActiveLevel());
        }

        // hide or show an element when there is/isn't a promoid selected
        this.$el.find('.noPromotionSelected')[activePromo ? 'hide' : 'show']();

    },


    //render a promotion
    renderPromotion:function(promo){

        //console.log(promo);
        var $opts = this.$promos.find('option'),
            //existing promoIds in select>option
            valsExist =  _.reduce($opts , function(mem,opt){ mem.push($(opt).val());return mem; } , []);

        //this promo has not yet been added
        if( _.indexOf(valsExist, promo.id) === -1 ){
            this.$promos.append( this.make('option', {'value':promo.id} ,promo.name) );
        }
        
    },

    //Render some levels
    renderLevels:function(levels){
        var that = this;

        this.$levels.empty();

        if(levels){

            _.each(levels,function(lev){
                var isAct = lev.id==that.model.getActiveLevel().id;
                //attach the tab for each level
                that.$levels.append('<li'+(isAct?' class="active"':'')+'><a data-level-id="'+lev.id+'" href="#">'+lev.name+'</a></li>');

            });
        }
    },


    //Render level specific bits (desc, products)
    renderLevelContent:function(lev){
        var $curProds = this.$prods.find('.currentProducts'),
            $levDesc = this.$prods.find('.levelDescription'),
            counter = 0;

        if(!lev){
            $curProds.empty();
            $levDesc.html(this.make('h1',{},this.$levels.data('msg-empty')));
            return;
        }

        var that = this,
            prods = lev.products;

        //empty the products element
        $curProds.empty();

        //set the text that appears over the products
        $levDesc.html(lev.desc);



        //populate product items
        _.each(prods,function(p){
            var animDelay = counter*100;
            //start d/l thumbs now
            $('<img/>')[0].src = p.thumbnail;

            //grab template and append rendered product item
            that.getTpl('plateauAwardsItem',function(tpl){
                var $awdItm = $(tpl(p));
                $curProds.append($awdItm);
                setTimeout(function(){$awdItm.fadeIn();},animDelay);
            });
            counter++;

        });

        //no products? display a message
        if(prods.length<1){
            $curProds.html(this.make('h1',{},$curProds.data('msg-empty')));
        }

    },

    events:{
        'click #levelsTabs a':'tabClick',
        'change #promotionSelect':'promoChange',
        'click .awardItem[data-product-id]':'prodClick',
        'click .selectBtn':'selectClick'
    },

    // select an item
    selectClick: function(e) {
        e.preventDefault();
        this.trigger('awardSelected',{
            promotionId: this.model.getActivePromo().get('id'),
            levelId: this.model.getActiveLevel().id,
            awardId: $(e.currentTarget).data('awardId'),
            awardImgUrl: $(e.currentTarget).data('awardImgUrl'),
            awardName: $(e.currentTarget).data('awardName')
        });
        if(this.isSheetMode) { 
        // this is pretty hacky, it would be nice to fix up the ad-hockness of "Sheets" because they've become cumbersome
            this.$el.closest('.modal-stack').find('.close[data-dismiss="modal"]').click();
        }
    },


    //perform tab click
    tabClick:function(e){
        var $ct = $(e.currentTarget);

        this.model.setPromoLevel(this.model.getActivePromo().get('id'), $ct.data('level-id'));

        e.preventDefault();
    },

    //perform promotion change
    promoChange:function(e){

        if(this.$promos.val()!=-1){
            this.model.setPromoLevel(this.$promos.val(),false);
        }
        
        e.preventDefault();
    },

    //perform product click
    prodClick:function(e){
        var $ct = $(e.currentTarget),
            $curProds = this.$prods.find('.currentProducts');

        e.preventDefault();
        this.openDrawer($ct.data('product-id'));
    },

    //activate drawer for product 
    openDrawer:function(prodId){
        var prod = this.model.getProductFromActiveLevel(prodId), //data model
            $prod = this.$prods.find('[data-product-id='+prodId+']'), //DOM element
            $drawer = this.$prods.find('.drawer'), //drawer DOM element
            nubbinPos,
            $lastInRow,
            that = this,
            stdFunc = function(){that.scrollToDrawer();};

        prod.isSelectMode = this.isSelectMode;

        //create drawer element if jquery returned empty array - HTML
        $drawer = $drawer.length===0 ? $('<li class="well container-splitter drawer"><span class="nubbin" /></li>') : $drawer;

        //place the drawer
        $lastInRow = this.findLastInRowFor($prod);

        //ALL of the UNGODLY POSSIBILITIES
        //if we are on a new row, then reposition in DOM
        if(!$lastInRow.is($drawer.prev())){
            //if visible, slide up and then down
            if($drawer.is(':visible')){
                //slide up, and callback for reposition and slide down
                $drawer.slideUp(G5.props.ANIMATION_DURATION,function(){
                    //reposition in DOM, slide down
                    $drawer.slideDown(stdFunc);
                    $lastInRow.after($drawer);
                });
            }
            //not visible? just slide down
            else{
                $lastInRow.after($drawer);
                $drawer.slideDown(stdFunc);
            }
            
        }else{//on same row but invis?
            $drawer.slideDown(stdFunc);
        }

        //align the nubbin (this may need adjustem from time to time)
        nubbinPos = $prod.find('.thumbnail').position().left + ($prod.find('.thumbnail').width()/2);
        nubbinPos = (nubbinPos / this.$el.width() * 100) + '%';

        //REQUIRES - bgAnimation patch/plugin for jquery
        $drawer.find('.nubbin').animate({
            left : nubbinPos
        }, G5.props.ANIMATION_DURATION);

        //add templated inards to drawer
        this.getTpl('plateauAwardsDrawer', function(tpl){
            var $liner = $drawer.find('.drawer-liner');
            if($liner.length){
                $drawer.find('.drawer-liner').fadeOut(function(){
                    $drawer.find('.drawer-liner').remove();
                    $drawer.append( tpl(prod) ).find('.drawer-liner').fadeIn();
                });
            }else{
                $drawer.append( tpl(prod)).find('.drawer-liner').fadeIn();
            }      
        });

    },

    scrollToDrawer: function(){
        var $drawer = this.$prods.find('.drawer'),
            dTop = $drawer.offset().top,
            $vp = $(window), // viewport
            $cnt = $('body'), // scrollable
            scrollTop =  window.pageYOffset||$('html').scrollTop(),
            vpH = $vp.height();

        if(!$drawer.length&&!$drawer.is(':visible')) { return; }

        if(scrollTop+vpH<dTop) {
            $cnt.scrollTo(dTop-40, G5.props.ANIMATION_DURATION*Math.round((dTop-scrollTop)/200) );
        }
    },

    //find the last thumbnail in this row
    findLastInRowFor:function($prod){
        //loop through DOM prod items on same y pos
        //find the one with max x -- this is the last in row
        var pPos = $prod.position(),
            $last = $prod;

        this.$prods.find('.awardItem').each(function(){
            var $cur = $(this),
                cPos = $cur.position(),
                lPos = $last.position();
            //if this ones x pos is equal to selected,
            // and if it is the farthest east
            if(cPos.top==pPos.top && cPos.left>lPos.left){
                $last = $cur;
            }
        });

        return $last;
    },

    //close the drawer
    closeDrawer:function(e){
        var $drawer = this.$prods.find('.drawer'),
            $evtTar = $(e.target);

        //if this click did not originate within an awardItem
        if($evtTar.closest('.awardItem').length===0){
            $drawer.slideUp(function(){$drawer.find('.drawer-liner').remove();});
        }
            
    }

});