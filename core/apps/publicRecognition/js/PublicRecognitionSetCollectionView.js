/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
PublicRecognitionSetCollection,
PublicRecognitionModelView,
PublicRecognitionSetCollectionView:true
*/
//Public Recognition Set Collection VIEW
// - several templates required

PublicRecognitionSetCollectionView = Backbone.View.extend({

    //override super-class initialize function
    initialize:function(opts){

        //handy jquery handles
        this.$tabs = opts.$tabsParent;
        this.$recs = opts.$recognitionsParent;

        //templates
        this.tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'publicRecognition/tpl/';
        this.recogTplName = "publicRecognitionItem";
        this.commentTplName = "publicRecognitionComment";

        //our model
        this.model = new PublicRecognitionSetCollection();

        //when this model gets loaded, then render this
        this.model.on('dataLoaded',function(nameId,fromIndex,isMore){
            this.render(nameId,fromIndex);

            // When a tab is switched, the placeholder plugin for IE breaks.
            // This clears any inputs and reinitializes the placeholder() plugin.
            // Removing the value clear on switching tabs for bugzilla[64529] as the readonly fixed value points were being removed.
            this.$el
                .find('input, textarea')
                .removeClass('placeholder')
                .placeholder();
        },this);

        //mark the view as dataLoading for the first time we load data
        this.$el.addClass('dataLoading');

        //put the view into a loading state
        this.setStateLoading();

        //load budgets (data-* attrs are added to request params)
        this.model.loadData(opts.recogSetId, null, null, opts.participantId, opts.modelParams);

        this._recViewCache = {};

    },

    //smart render, based on the args, it will decide what needs to be done
    render:function(nameId,fromIndex){
        var defSet;
        // no nameId? then this is first render, render tabs
        if(!nameId){
            this.renderTabs(function(){});
            defSet = this.model.getDefaultRecognitionSet();

            if(defSet) {
                // simulate click on def tab
                this.$tabs.find('.pub-rec-tab[data-name-id='+defSet.get('nameId')+']').click();
            } else {
                // simulate click on first tab
                this.$tabs.find('.pub-rec-tab').first().click();
            }

            // remove the dataLoading class now that the first load is done
            this.$el.removeClass('dataLoading');
        }

        // else, this has been a specific set load
        else if(nameId) {
            // if from index, then this was a load more
            if(fromIndex) {
                //render more
                this.renderMoreRecognitions(nameId,fromIndex);
            }

            //else, just the first recognitions of a set
            else {
                //render recognitions for set
                this.renderTabContent(nameId);
            }
        }

        // take the view out of the loading state
        this.setStateLoaded();
    },

    renderTabs:function(callback){
        var that = this;
        //TABS - each 'recognitionSet' gets a tab
        that.$tabs.empty();
        _.each(this.model.models,function(recSet){

            //get the count of new items
            //not sure about this one, commented out for now (aaron)
            var numNew = 0;//(_.filter(recSet.get('recognitions'),function(rec){return rec.isNew})).length;

            //build the li>a element
            var $a = $('<a />')
                        .attr({
                            'title':recSet.get('name'),
                            'href':'#',
                            'class':'pub-rec-tab pub-rec-tab-'+recSet.get('nameId'),
                            'data-name-id':recSet.get('nameId'),
                            'data-total-count':recSet.get('totalCount')
                        })
                        .html('<span>'+recSet.get('name')+'</span><!--sup>'+numNew+'</sup-->'),
                $i = $('<i class="icon-g5-pubrec-'+recSet.get('nameId')+'" />'),
                $li = $('<li />').html($a.prepend($i));

            //give the <a> a tooltip
            $a.tooltip({
                container: 'body',
                delay: 200
            });

            //append to tabs container
            that.$tabs.append( $li );

        });

    },

    renderTabContent:function(id){
        var that = this,
            recogSet = this.model.getRecognitionSet(id),
            recogCount = recogSet.get('totalCount'),
            hasFollowees = recogSet.get('hasFollowees'),
            //find the recognitionModels for this recogSetId
            recogModels = recogSet.recognitions.models,
            //find the recognitions content DOM element
            $recsCont = $(this.$recs.find('.publicRecognitionItems')[0]),
            //get the tab element
            $tab = this.$tabs.find('[data-name-id='+id+']'),
            //follow list links
            $followControls = this.$el.find('.follow-list-links');

        //set active pub rec set nameId
        this._activeRecSet = recogSet;

        //deactivate, and activate new tab (style class)
        this.$tabs.find('li').removeClass('active');
        $tab.closest('li').addClass('active');

        //this might be visible, hide it now - show later if apropo
        this.$el.find('.createFollowListWrapper').hide();
        this.$el.find('.noRecognitionsFollowListWrapper').hide();

        //show if necessary
        this.$recs.show();

        //set a classname for styling (remove previous)
        this.$recs.removeClass(function(i,c){
            c = c.match(/[a-zA-Z]+Collection($| )/);
            return c&&c.length ? c[0] : "";
        }).addClass(recogSet.get('nameId')+'Collection');

        //remove the empty set classname if it exists from the container
        $recsCont.removeClass('emptySet');

        //empty recognition view container
        $recsCont.empty();

        //append recognition views
        this.appendRecognitionViews(recogModels);

        //if we are in the 'followed' tab, show the view/edit follow list link
        $followControls[id==='followed'?'show':'hide']();

        //no recognitions? render empty message
        if(recogModels.length===0) {
            //if we are in the 'followed' PubRecSet, then disp. special message
            if ( (id === 'followed') && (hasFollowees === false) ) {
                //hide the controls b/c we are showing the button to create follow list
                $followControls.hide();
                this.$recs.hide();
                this.$el.find('.createFollowListWrapper').show();
            }else if( (id === 'followed') && (hasFollowees === true) ){
                this.$recs.hide();
                this.$el.find('.noRecognitionsFollowListWrapper').show();
            }else{
                $recsCont
                    .addClass('emptySet')
                    .append(this.make('h2',{},this.$recs.data('msgEmpty')))
                    .find('h2').prepend('<i class="icon-g5-norecognitions" />');
            }
        }


        //show/hide the 'view all' link based on recognitionSet.totalCount
        //this.$recs.find('.viewAllRecognitions')[recogModels.length<recogCount && recogCount>0 ? 'show' : 'hide']();
        this.updateViewMore(recogModels.length, recogCount);

    },

    renderMoreRecognitions: function(nameId,startInd){
        var recSet = this.model.getRecognitionSet(nameId);
        //apend the tail (_.rest) of the recognitions
        this.appendRecognitionViews(_.rest(recSet.recognitions.models,startInd));

        this.updateViewMore(recSet.recognitions.models.length, recSet.get('totalCount'));
    },

    updateViewMore: function(existingCount,totalCount){
        //show/hide the 'view all' link based on recognitionSet.totalCount
        this.$recs.find('.viewAllRecognitions')[existingCount<totalCount && totalCount>0 ? 'show' : 'hide']();
    },

    events:{
        "click .pub-rec-tab":"doTabClick",
        "click .viewAllRecognitions":"doViewMore"
    },

    doTabClick:function(e){
        var $tar = $(e.currentTarget),
            id = $tar.data('nameId');

        //put the view into a loading state
        this.setStateLoading('tabChange');

        //request the model to load the set, event is triggered to render changes
        this.model.loadData(id, null, null, null, this.options.modelParams);

        e.preventDefault();
    },

    appendRecognitionViews: function(recModels){
        var that = this,
            //find the recognitions content DOM element
            $recsCont = $(this.$recs.find('.publicRecognitionItems')[0]),
            $scrollContainer = this.$el.hasClass('module') ? this.$recs : $(window);

        _.each(recModels,function(rec, i){
            var recView = that._recViewCache[rec.id] || new PublicRecognitionModelView({
                    model:rec, //give the view this recognition model
                    tplName:that.recogTplName,
                    commentTplName:that.commentTplName,
                    isHideComments:true //hide all but first comment
                }),
                $rendered = $(recView.render().el);

            //create and append a new view
            $recsCont.append($rendered);

            // scroll the new recognitions into place (only on the first one)(and if scrolling isn't suppressed)
            if( i === 0 && that.options.suppressScrolling !== true ) {
                $scrollContainer.scrollTo($rendered, G5.props.ANIMATION_DURATION*2, {
                    axis : 'y',
                    offset : {
                        top: parseInt( $rendered.css('marginBottom').replace(/px/, ''), 10) * -1,
                        left: 0
                    }
                });
            }

            //now this view is in the dom and is ready for initreadmore
            recView.initReadMore();

            //if was cached, then delegateEvents (they were undelegated)
            if(that._recViewCache[rec.id]){
                recView.delegateEvents();
            }

            //cache view
            that._recViewCache[rec.id] = recView;
        });
    },

    doViewMore: function(e){
        //no active rec set? return
        if(!this._activeRecSet)return;

        var rs = this._activeRecSet,
            nameId = rs.get('nameId'),
            //start on next element after last of old length
            startInd = rs.recognitions.length,
            isMore = true;

        this.$el.find('.viewAllRecognitions').hide();

        //put the view into a loading state
        this.setStateLoading('more');

        this.model.loadData(nameId, startInd, isMore, null, this.options.modelParams);

        e.preventDefault();
    },

    getViews: function() {
        return this._recViewCache||null;
    },

    setStateLoading: function(mode) {
        var spinProps = {};

        if( this.$el.closest('.module').length ) {
            spinProps.spinopts = {
                color : '#fff'
            };
        }
        if( mode ) {
            spinProps.classes = mode;
        }

        G5.util.showSpin(this.$el, spinProps);
    },

    setStateLoaded: function() {
        G5.util.hideSpin(this.$el);
    }

});
