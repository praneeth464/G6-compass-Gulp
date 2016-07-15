/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
TemplateManager,
GoalquestCollectionView:true
*/
GoalquestCollectionView = Backbone.View.extend({
    
    initialize:function(opts) {
        console.log("[INFO] goalquestModuleCollection: goalquest Module Collection initialized", this);
        var that = this;

        this.gqListJsonUrl = opts.jsonUrl||null;

        this.json = opts.json||null;

        this.collection = new Backbone.Collection();

        // turn this on to interactively choose a single goal to view
        // activate for localhost AND URL_TPL_ROOT = false (unbuilt FE environment)

        //set this to true to enable front end debugging.
        this.dev_selectSingle = window.location.hostname.toLowerCase()==='localhost' && G5.props.URL_TPL_ROOT===false;
        this.dev_selectSingle = false;

        // wire it up
        this.on('promotionsLoaded', function() {
            this.preparePromotionData(); 
        });

        this.on('preparePromotionDataFinished', function() {
            this.renderPromotions(); 
        });

        if( opts.moduleView ) {
            this.moduleView = opts.moduleView;
            this.moduleView.on('beforeGeometryChange', function() {
                that.handleBeforeGeometryChange();
            });
        }

        // start everything
        // this.loadPromotions();
        // commented out because we need to call this from the module/page instead of automatically. When JSON is bootstrapped in, it fires the "promotionsLoaded" event before the module/page could add listeners
    },

    loadPromotions: function() {
        console.log("[INFO] goalquestModuleCollection: loadPromototions initialized");

        //checks to see if promotions have been preloaded into G5.props. If they have not, load via AJAX

        if (this.json) {
            console.log('[INFO] goalquestModuleCollection: embedded json found, no ajax call required');

            this.collection.reset(this.json);

            this.trigger('promotionsLoaded'); //let the masses know what's up
        }
        else if (G5.props.preLoadedGoalquestPromotions) {
            console.log('[INFO] goalquestModuleCollection: preLoadedGoalquestPromotions found, no ajax call required');

            this.collection.reset(); //clear the collection

            this.collection.add(G5.props.preLoadedGoalquestPromotions); //add the promtions to the model

            this.trigger('promotionsLoaded'); //let the masses know what's up

        }else{
            console.log('[INFO] goalquestModuleCollection: preLoadedGoalquestPromotions not found, ajax call required');

            var params = {},
                self = this;

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: this.gqListJsonUrl,
                data: params,
                beforeSend: function() {
                    self.dataLoad(true); // start the loading state and spinner
                },
                success: function(serverResp) {
                    console.log("[INFO] goalquestModuleCollection: loadPromototions call successfully returned this JSON object: ", serverResp.data);

                    self.collection.reset(); //clear the collection

                    self.collection.add(serverResp.data.promotions); //add the promtions to the collection

                    self.dataLoad(false); // stop the loading state and spinner

                    self.trigger('promotionsLoaded'); //let the masses know what's up
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] goalquestModuleCollection: loadPromototions call failed: ", jqXHR, textStatus, errorThrown);

                    self.dataLoad(false); // stop the loading state and spinner

                    self.$el.append('AJAX ERROR: '+textStatus+' ('+errorThrown.type+')<br>URL:'+this.gqListJsonUrl);
                }
            });
        }
    },

    renderPromotions: function() {
        console.log("[INFO] goalquestModuleCollection: renderPromotions initialized");
        var self = this,
            tplName = "goalquestItem",
            tplUrl =  G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'goalquest/tpl/',
            $innerEl = self.$el;

        $innerEl.empty();

        TemplateManager.get(tplName, function(tpl, tplUrl) {

            _.each(self.collection.models, function(thePromotion, index, models) {
                var $gqItem = $(tpl(thePromotion.toJSON()));

                $innerEl.append($gqItem);

                $gqItem.find('.goalItem').each(function(){
                    var $gItem = $(this),
                    $b = $gItem.find('.gqBtn'),
                    $b2x2 = $gItem.find('.gqBtn2x2');
                    if($b.length) {
                       $b2x2.attr('href',$b.attr('href')).html($b.text()+'<i class="icon-chevron-right" />'); 
                    }
                });

                $innerEl.find('.promotionTitle').ellipsis();

                if( $innerEl.closest('.module').hasClass('grid-dimension-4x4') ) {
                    $innerEl.find('.levelLabelName').ellipsis();
                }


                // FOR CSS DEVELOPMENT
                if(self.dev_selectSingle) { // add a button to select a particular promo+goal to render
                    $gqItem.find('.goalItem').each(function(){
                        var $g = $(this),
                            $a = $('<a class="_selectSingleControl_" href="#"><i class="icon-cog"></i></a>').css({
                                position: 'absolute',
                                color: '#fff',
                                'text-decoration':'none',
                                top: 0, left: 0,
                                padding: '0 3px',
                                cursor: 'pointer',
                                background: 'green',
                                border: '1px solid #fff',
                                zIndex: 10000
                            }).attr('title','-- FE CSS dev tool --'
                                +'\n[click] for single OR go back to multiple'
                                +'\n[dblclick] in any goal to hide these controls until refresh'
                                +'\n*only shown if hostname==="localhost"');

                        $a.click(function(e){
                            var numGoals = self.$el.find('.goalItem').length,
                                p = self.collection.get($a.closest('.promotionItem').data('promotionId')),
                                g = _.where(p.get('goals'),{id:$a.closest('.goalItem').data('goalId')});

                            e.preventDefault();

                            if(numGoals>1){                            
                                p.set('goals',g);
                                self.collection.reset([p]);
                                self.trigger('promotionsLoaded');// fake data load (it has changed)
                            } else {
                                self.loadPromotions(); // reset
                            }
                        });
                        $g.dblclick(function(e){
                            e.preventDefault();
                            self.$el.find('._selectSingleControl_').remove();
                        });

                        $g.append($a);
                    });
                }// EOF - FOR CSS DEVELOPMENT

            });

            self.trigger('renderPromotionsFinished'); //let the view know where we're at

        }, tplUrl);
    },

    handleBeforeGeometryChange: function() {
        var $innerEl = this.$el;

        if( $innerEl.closest('.module').hasClass('grid-dimension-4x4') ) {
            $innerEl.find('.levelLabelName').ellipsis();
        }
    },

    preparePromotionData: function() {
        var self = this,
            singlePromo = self.collection.models.length ? self.collection.models[0] : null,
            lastGoal = null,
            numGoals = 0;

        _.each(self.collection.models, function(p){ // PROMOTIONS
            var goals = p.get('goals'),
                status = p.get('status');

            if(!goals) return;

            _.each(goals, function(g){ // GOALS

                lastGoal = g;
                numGoals++;

                g.noGoal = g.goalLevel?false:true;

                if(status==='open') { // OPEN
                    g.goalOpen = true;
                    // goal collection period not yet open - no goal + can NOT change
                    if(!g.goalLevel&&!g.canChange) { 
                        g.showBtn_Rules = true;
                    } 
                    // goal collection period open - no goal level selected + can change
                    if(!g.goalLevel&&g.canChange) { 
                        g.showBtn_Select = true;
                    } 
                    // goal collection period open - level selected + can change
                    if(g.goalLevel&&g.canChange) {
                            g.showBtn_Change = true;
                    }
                    // goal collection period open - level selected + can NOT change
                    if(g.goalLevel&&!g.canChange) {
                            g.showBtn_Rules = true;
                    }
                }

                if(status==='started') { // STARTED
                    g.goalStarted = true;
                    if(g.goalLevel && g.showProgress) {
                        g.showBtn_Progress = true;
                    } else {
                        g.showBtn_Rules = true;
                    }
                    
                }

                if(status==='ended') { // ENDED
                    g.goalEnded = true;
                    g.showBtn_View = g.goalLevel?true:false;
                    if ( g.goalLevel )
                    {
                      if(g.isAchieved) {
                        g.goalWin = true;
                      } else {
                        g.goalFail = true;                        
                        }
                     }
                }

                // no goal message
                if((g.goalStarted||g.goalEnded)&&g.noGoal) {
                    g.showNoGoal = true;
                }

            });// goals

        });// promotions

        // now we know total number of goals, lets give a class to each promoItem
        _.each(self.collection.models, function(p){
            p.set('promotionItemClass',numGoals<=1?'single':'multiple');
        });
        // more classes -- many permutations make this css trixxy
        self.$el
            .removeClass('single multiple')
            .addClass(numGoals<=1?'single':'multiple');

        //TODO - move to module view FOOL!
        self.$el.closest('.module-liner')
            .removeClass('gqSingle gqMultiple')
            .addClass(numGoals<=1?'gqSingle':'gqMultiple');


        // MODULE classes for SINGLE promo/goal
        if(numGoals===1) {
            //TODO - move to module view FOOL!
            self.$el.closest('.module-liner')
                .removeClass('gqStatus_open gqStatus_started gqStatus_ended')
                .addClass('gqStatus_'+singlePromo.get('status'));
            //TODO - move to module view FOOL!
            self.$el.closest('.module-liner')
                .removeClass('gqHasLevel gqNoLevel')
                .addClass(lastGoal.goalLevel?'gqHasLevel':'gqNoLevel');
        }

        self.trigger('preparePromotionDataFinished'); //tell the view to start the next step

    },

    dataLoad: function(start) {
        G5.util[start?'showSpin':'hideSpin'](this.$el);
    }

});