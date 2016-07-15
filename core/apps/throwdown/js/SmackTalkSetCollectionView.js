/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
SmackTalkSetCollection,
SmackTalkModelView,
SmackTalkSetCollectionView:true
*/
//Smack Talk Set Collection VIEW
// - several templates required

SmackTalkSetCollectionView = Backbone.View.extend({

    //override super-class initialize function
    initialize:function(opts){

        var thisView = this;

        //handy jquery handles
        this.$tabs = opts.$tabsParent;
        this.$recs = opts.$smackTalksParent;

        //templates
        this.tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'throwdown/tpl/';
        this.recogTplName = "smackTalkItem";
        this.commentTplName = "smackTalkComment";

        //our model
        this.model = new SmackTalkSetCollection();

        //when this model gets loaded, then render this
        this.model.on('dataLoaded',function(nameId,fromIndex,isMore){
            this.render(nameId,fromIndex);

            // When a tab is switched, the placeholder plugin for IE breaks.
            // This clears any inputs and reinitializes the placeholder() plugin.
            this.$el
                .find('input, textarea')
                .removeClass('placeholder')
                .val('')
                .placeholder();
        },this);

        //mark the view as uninitialized for the first time we load data
        this.$el.addClass('uninitialized');

        //put the view into a loading state
        this.setStateLoading();

        // need to know if this is a module in order to delay the loadData call
        // until after promotion select has loaded
        if ( this.$el.hasClass('module') ) {
            // see if promotionsLoaded event has already fired
            if (G5.throwdown.promotionsLoaded) {
                this.model.loadData(opts.recogSetId, null, null, opts.participantId);
            }

            // listen for promotionsLoaded event
            G5.throwdown.dispatcher.on('promotionsLoaded', function(){
                thisView.model.loadData(opts.recogSetId, null, null, opts.participantId);
            }, this);
        } else {
            //load budgets (data-* attrs are added to request params)
            this.model.loadData(opts.recogSetId, null, null, opts.participantId);
        }

        this._recViewCache = {};
    },

    //smart render, based on the args, it will decide what needs to be done
    render:function(nameId, fromIndex){
        var defSet;
        // no nameId? then this is first render, render tabs
        if(!nameId){
            this.renderTabs(function(){});
            defSet = this.model.getDefaultSmackTalkSet();

            if(defSet) {
                // simulate click on def tab
                this.$tabs.find('.pub-rec-tab[data-name-id='+defSet.get('nameId')+']').click();
            } else {
                // simulate click on first tab
                this.$tabs.find('.pub-rec-tab').first().click();
            }

            // remove the uninitialized class now that the first load is done
            this.$el.removeClass('uninitialized');
        }

        // else, this has been a specific set load
        else if(nameId) {
            // if from index, then this was a load more
            if(fromIndex) {
                //render more
                this.renderMoreSmackTalks(nameId,fromIndex);
            }

            //else, just the first smackTalks of a set
            else {
                //render smackTalks for set
                this.renderTabContent(nameId);
            }
        }

        // take the view out of the loading state
        this.setStateLoaded();

        // need to call initReadMore here for it to work when a promotion is changed and new data is loaded
        $.each(this.getViews(), function() {
            this.initReadMore();
        });
    },

    renderTabs:function(callback){
        var that = this;
        //TABS - each 'recognitionSet' gets a tab
        that.$tabs.empty();
        _.each(this.model.models,function(recSet){

            //get the count of new items
            //not sure about this one, commented out for now (aaron)
            var numNew = 0;

            //build the li>a element
            var $a = $('<a />')
                        .attr({
                            'title':recSet.get('desc'),
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
                template: '<div class="tooltip smack-talk-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
                container: 'body',
                delay: 200
            });

            //append to tabs container
            that.$tabs.append( $li );

        });

    },

     renderTabContent:function(id){
        var that = this,
            recogSet = this.model.getSmackTalkSet(id),
            recogCount = recogSet.get('totalCount'),

            //find the recognitionModels for this recogSetId
            recogModels = recogSet.smackTalks.models,
            //find the smackTalks content DOM element
            $recsCont = $(this.$recs.find('.smackTalkItems')[0]),
            //get the tab element
            $tab = this.$tabs.find('[data-name-id='+id+']');

        //set active pub rec set nameId
        this._activeRecSet = recogSet;

        //deactivate, and activate new tab (style class)
        this.$tabs.find('li').removeClass('active');
        $tab.closest('li').addClass('active');

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
        this.appendSmackTalkViews(recogModels);


        //no smackTalks? render empty message
        if(recogModels.length===0) {
            $recsCont
                .addClass('emptySet')
                .append(this.make('a',{"href":this.$recs.data('emptyUrl')},this.$recs.data('msgEmpty')))
                .find('a').prepend('<i class="icon-g5-norecognitions" />');
        }

        //show/hide the 'view all' link based on recognitionSet.totalCount
        //this.$recs.find('.viewAllSmackTalks')[recogModels.length<recogCount && recogCount>0 ? 'show' : 'hide']();
        this.updateViewMore(recogModels.length, recogCount);

    },

    renderMoreSmackTalks: function(nameId,startInd){
        var recSet = this.model.getSmackTalkSet(nameId);
        //apend the tail (_.rest) of the smackTalks
        this.appendSmackTalkViews(_.rest(recSet.smackTalks.models,startInd));

        this.updateViewMore(recSet.smackTalks.models.length, recSet.get('totalCount'));
    },

    updateViewMore: function(existingCount,totalCount){
        console.log("existingCount", existingCount);
        console.log("totalCount", totalCount);
        console.log('');

        //show/hide the 'view all' link based on recognitionSet.totalCount
        this.$recs.find('.viewAllSmackTalks')[existingCount<totalCount && totalCount>0 ? 'show' : 'hide']();
    },

    events:{
        "click .pub-rec-tab":"doTabClick",
        "click .viewAllSmackTalks":"doViewMore"
    },

    doTabClick:function(e){
        var $tar = $(e.currentTarget),
            id = $tar.data('nameId');

        //put the view into a loading state
        this.setStateLoading('tabChange');

        //request the model to load the set, event is triggered to render changes
        this.model.loadData(id);

        e.preventDefault();
    },

    appendSmackTalkViews: function(recModels){
        var that = this,
            //find the smackTalks content DOM element
            $recsCont = $(this.$recs.find('.smackTalkItems')[0]),
            $scrollContainer = this.$el.hasClass('module') ? this.$recs : $(window);

        _.each(recModels,function(rec, i){
            var recView = that._recViewCache[rec.id] || new SmackTalkModelView({
                    model:rec, //give the view this recognition model
                    tplName:that.recogTplName,
                    commentTplName:that.commentTplName,
                    isHideComments:true //hide all but first comment
                }),
                $rendered = $(recView.render().el);

            //create and append a new view
            $recsCont.append($rendered);

            // scroll the new smackTalks into place (only on the first one)
            // if( i === 0 ) {
            //     $scrollContainer.scrollTo($rendered, G5.props.ANIMATION_DURATION*2, {
            //         axis : 'y',
            //         offset : {
            //             top: parseInt( $rendered.css('marginBottom').replace(/px/, ''), 10) * -1,
            //             left: 0
            //         }
            //     });
            // }

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
            startInd = rs.smackTalks.length,
            isMore = true;

        this.$el.find('.viewAllSmackTalks').hide();

        //put the view into a loading state
        this.setStateLoading('more');

        this.model.loadData(nameId, startInd, isMore);

        e.preventDefault();
    },

    getViews: function() {
        return this._recViewCache||null;
    },

    setStateLoading: function(mode) {
        // var spinProps = {};

        // if( this.$el.hasClass('module') ) {
        //     spinProps.color = '#fff';
        // }

        // // if we don't find any spinners, add one
        // if( !this.$el.find('.spin').length ) {
        //     this.$el
        //         .append('<span class="spin" />')
        //         .find('.spin').spin(spinProps);
        // }
        // // if we do find a spinner, move it
        // else {
        //     this.$el
        //         .append( this.$el.find('.spin') );
        // }

        // // if in a special mode
        // if( mode ) {
        //     this.$el.find('.spin').addClass(mode);
        // }

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
        // this.$el.find('.spin').remove();
        G5.util.hideSpin(this.$el);
    }

});
