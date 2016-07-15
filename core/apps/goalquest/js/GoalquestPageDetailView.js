/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
PlateauAwardsPageView,
GoalquestPageDetailView:true
*/
GoalquestPageDetailView = PageView.extend({

    initialize: function(opts) {
        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass ModuleView
        this.events = _.extend({},PageView.prototype.events,this.events);
    },

    events: {
        // award browse button
        'click .awardBtn .btn':'doViewAwardLevels'
    },


    // plateau awards modal
    doViewAwardLevels: function(e){
        var that = this,
            levelId = this.$el.find('.levelIdInput'),
            isSelectable = this.$el.find('.isSelectablePlateauAwardInput'),
            promoId = this.$el.find('.promotionIdInput');

        e ? e.preventDefault() : false;

        if(levelId.length&&isSelectable.length&&promoId.length) {
            levelId = levelId.val();
            promoId = promoId.val();
            isSelectable = isSelectable.val();
            isSelectable = isSelectable === true || isSelectable === 'true';
        } else {
            return; // missing id? this should never happen
        }

        // modal stuff
        if(!this.$merchModal) {
            this.$merchModal = this.$el.find('#levelMerchModal').detach();
            $('body').append(this.$merchModal); // move it to body

            // possible events: show|shown|hide|hidden
            this.$merchModal.on('shown',function(){ 
                that.updateMerchModal(levelId, isSelectable, promoId);
            }); 
            // clear awards contents on hidden
            this.$merchModal.on('hidden',function(){ 
                that.$merchModal.find('.modal-body').empty(); 
            }); 

            // create modal
            this.$merchModal.modal({
                backdrop:true,
                keyboard:true,
                show:false
            });   
        }

        this.$merchModal.modal('show'); 
    },

    // init and manage PlateauAwardsPageView
    updateMerchModal: function(levelId, isSelectable, promoId){
        var that = this;

        if(!this.$merchModal) { return; } // exit if no dom element


        // using an overridable global var to find where the Plat. Aw. Pg. is
        $.ajax({
            url: G5.props.URL_PAGE_PLATEAU_AWARDS
        }).done(function(html){       
            // clean out script from html -- regular page has some
            // we will insantiate manually
            html = html.replace(/<script>[\s\S]*<\/script>/ig,'');
            that.$merchModal.find('.modal-body').empty().append(html);
            // insantiate page view - hand it the promoId/levelId
            that.plateauAwardsPageView = new PlateauAwardsPageView({
                el:that.$merchModal.find('#plateauAwardsPageView'),
                showPromotionSelect: false,
                isSelectMode: isSelectable,
                isSheetMode: true,
                promotionId: promoId,
                levelId: levelId
            });

            // listen for award select
            that.plateauAwardsPageView.on('awardSelected', that.doPlateauAwardSelect, that);
        });
    },

    // update selected plateau award and show new award if necessary
    doPlateauAwardSelect: function(award) {
        var that = this;

        this.$el.find('.awardBtn .btn:visible').spin().attr('disabled','disabled');
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_GOALQUEST_CHANGE_PLATEAU_AWARD,
            data: {
                promotionId: award.promotionId,
                levelId: award.levelId,
                awardId: award.awardId
            },
            success: function(data) {
                var error =  data.getFirstError();
                that.$el.find('.awardBtn .btn:visible').spin(false).removeAttr('disabled');
                if(!error) {
                    that.$el.find('.paImg').replaceWith('<img class="paImg" src="'+award.awardImgUrl+'">');
                    that.$el.find('.paTitle').text(award.awardName);
                } else { // server has responded with some sort of error
                    console.log('[ERROR] GoalquestPageDetailView - tried to set awardId but server resonded: '+error.text);
                }
            }
        });
    }
});