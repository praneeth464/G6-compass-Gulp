/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
Backbone,
ParticipantCollectionView:true
*/

/** PLAIN PARTICIPANTS VIEW **/
ParticipantCollectionView = Backbone.View.extend({
    initialize:function(opts){
        this.autoIncrement = 0;

        if(!this.model){
            this.model = new Backbone.Collection();
        }

        // optional identifier to pass into templates
        this.feedToTpl = opts.feedToTpl||{};

        this.model.bind("reset",this.render,this);
        this.tplName = opts.tplName||'participantRowItem';
        this.tplUrl = opts.tplUrl||G5.props.URL_BASE_ROOT+'tpl/';
        this.model.bind("add",this.addParticipant,this);
        this.model.bind("remove",this.removeParticipant,this);
        this.hideOnEmpty = this.$el.data('hideOnEmpty')||false;
        this.$wrapper = this.$el.closest('.participantCollectionViewWrapper');
        this.render();//initial render

        // because of how recipients are added when bootstrapped in, we need to wait a moment before making it normal then re-making it responsive. Gross to the nth degree.
        this.$el.closest('table').responsiveTable({reset:true, duration:G5.props.ANIMATION_DURATION*6}); // G5.props.ANIMATION_DURATION*6 is the amount of time G5.util.animBg takes to fade out the color background
    },
    render:function(){
        this.$el.empty();

        this.processModel();
        this.initSort();

        this.addParticipant(this.model);

        this.renderEmpty();
        return this;
    },
    processModel: function() {
        // make sure all participant IDs are numeric
        this.model.each(function(p) {
            p.id = parseInt(p.id, 10);
        });
    },
    initSort: function() {
        var that = this;

        this.$wrapper.find('th.sortable').each(function(){
            var $t = $(this);
            $t.addClass('sortHeader'); 
            $t.find('i').remove();// in case we get called again
            $t.append(' <i class="sortControl icon-sort"></i>');
            // bind here, the $wrapper is technically outside this view's $el so we can't use events obj.
            $t.off('click').on('click', function(e){that.doSort(e);} );
        });
    },
    addParticipant:function(participant, index){
        // participant can be either a Backbone Collection or a Backbone Model
        var json = participant.toJSON(),
            that = this;

        // check to see if our participant object is a Collection or Model and if our json object is an array or not. Turn both into arrays
        participant = participant.models ? participant.models : [participant];
        json = _.isArray(json) ? json : [json];

        // iterate through the JSON, running a few manipulations on the raw data
        _.each(json, function(obj, index) {
            obj.cid = participant[index].cid;

            obj.autoIndex = that.autoIncrement;
            that.autoIncrement++;

            obj = _.extend(obj,that.feedToTpl);
        });

        // get the template
        TemplateManager.get(this.tplName,function(tpl){
            var pi = '',
                $pi;

            // for each object in the json, pass it to the template function and append it to a raw string variable
            _.each(json, function(obj, index) {
                pi += tpl(obj);
            });

            // create a jQuery object of our raw string data and prepend it to the table (prepending assures that the newest entry will always be visible)
            $pi = $(pi);
            that.$el.prepend($pi);
            
            // run a background color animation only if we're adding fewer than some number of entries
            if( json.length <= 20 ) {
                G5.util.animBg($pi.find('td'),'background-flash');
            }

            //attach parti. popover.
            $pi.find('.participant-popover').participantPopover();

            that.renderEmpty();
            that.updateCount();

        }, G5.props.URL_TPL_ROOT||this.tplUrl);

        return this;
    },
    removeParticipant:function(participant){
        this.$el.find('[data-participant-cid='+participant.cid+']').remove();
        this.renderEmpty();
        this.updateCount();
        return this;
    },
    renderEmpty:function(){//render empty
        var that = this,
            emptyMsg = this.$el.data('msg-empty'),
            emptyEl,
            cols;

        //CASE: not empty
        if(this.model.models.length>0){
            this.$el.find('.emptyMsg').closest('tr').remove();
            this.$wrapper.removeClass('emptyParticipantCollection');
            this.$el.closest('table').responsiveTable({reset:true, duration:G5.props.ANIMATION_DURATION*6}); // G5.props.ANIMATION_DURATION*6 is the amount of time G5.util.animBg takes to fade out the color background

            if(this.hideOnEmpty){
                //sliding up, finish fast and show
                if(this.$wrapper.queue().length>0){ 
                    this.$wrapper.stop(true,true).show();
                    this.trigger('shown');
                } else { //not animating, so animate
                    this.$wrapper.slideDown(G5.props.ANIMATION_DURATION, function(){
                        that.trigger('shown');
                    });
                }
                
            }
            return this; // EXIT
        }
        
        //CASE: empty

        // hide on empty
        if(this.hideOnEmpty){
            if(this.$wrapper.is(':visible')){
                this.$wrapper.slideUp(G5.props.ANIMATION_DURATION);
            } else {
                this.$wrapper.hide();
            }
        }
        this.$wrapper.addClass('emptyParticipantCollection');

        // empty message
        if(emptyMsg){ // has msg
            cols = this.$el.closest('table').find('thead th:visible').length;

            // if cols is zero length, set to at least 1 (ie7)
            cols = cols===0?1:cols;

            // if already appended, update colspan
            if( this.$el.find('.emptyMsg').length ) {
                this.$el.find('.emptyRow td').attr('colspan', cols);
            }
            // if not already appended, append
            else {
                emptyEl = this.make('div', {'class':'emptyMsg alert'}, emptyMsg);
                
                if(this.$el.prop('tagName')=='TBODY'){
                    emptyEl = $('<tr class="emptyRow"><td colspan="'+cols+'"></td></tr>').find('td')
                        .append(emptyEl).closest('tr');
                }

                this.$el.append(emptyEl);
            }
        }
        
        return this;
    },
    updateCount: function(){
        var $cnt = this.$wrapper.find('.participantCount');
        $cnt.val(this.model.models.length);
    },
    events:{
        'click .remParticipantControl':'removeParticipantAction'
    },
    removeParticipantAction:function(e){//hits the data model
        var cidToRem = $(e.currentTarget).closest('[data-participant-cid]')
            .data('participant-cid');
        var remModel = this.model.getByCid(cidToRem);
        this.model.remove(remModel);
        this.trigger('participantRemoved',remModel);

        // IE8 needs this else it will barf an error (due to Jquery event stuff)
        return false;
    },
    doSort: function(e){
        var $tar = $(e.currentTarget),
            selector = $tar.data('sortSelector')||null,
            colIdx = $tar.index(),
            sorted = this.$el.find('tr td:nth-child('+(colIdx+1)+')'),
            $sCont = $tar.find('.sortControl'),
            isAsc = $sCont.hasClass('asc'),
            isDesc = $sCont.hasClass('desc'),
            notSorted = !isAsc && !isDesc,
            that = this;

        // clear all sort state classes
        this.$wrapper.find('.sortControl').removeClass('asc icon-sort-up desc icon-sort-down sorted');

        // sort the elements using sortSelector or just use the text 
        sorted = _.sortBy(sorted, function(td) {
            var $e = $(td);

            if(selector){
                $e = $e.find(selector);
            }

            return $e.text()||$e.attr('class');
        });

        // if was asc, reverse the sort order to desc
        if(isAsc) {
            sorted.reverse();
        }

        // append elements in sorted order
        _.each(sorted, function(td){
            that.$el.append($(td).closest('tr'));
        });

        // apply sort state class(es)
        $sCont.addClass(notSorted||isDesc?'asc icon-sort-up sorted':'desc icon-sort-down sorted');

    }
});