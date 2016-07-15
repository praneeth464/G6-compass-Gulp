/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
TemplateManager,
RecognitionPageBadgesView:true
*/
RecognitionPageBadgesView = Backbone.View.extend({

    initialize: function(opts) {
        console.log('opts: ', opts);
        var promotionModel = opts.containerView.activePromotionSetup;
        // Badges parent container
        this.containerView = opts.containerView;
        //promotionModel.on('badgeIdChanged', this.updateBadgeId, this);
        //promotionModel.on('certificateIdChanged', this.updateCertificateId, this);

        this.renderBadges();
        if (opts.defaultBehavior){
            console.log('selcted val:', opts.defaultBehavior);
            this.updateBadgeId(opts.defaultBehavior.toString());
        }
        else {
            this.updateBadgeId("noBadge");
        }
    },


    events: {
        "click .badgeItem a":"doBadgeItemSelect",
        "click .showNotifyText":"updateNotifyText"
    },


    // USER EVENTS
    doBadgeItemSelect: function(e) {
        var self = this,
        $tar = $(e.currentTarget),
            bid = $tar.data('badgeId');

        e.preventDefault();
        self.updateBadgeId(bid);
        //this.containerView.quizModel.setBadgeId(bid);
    },


    // MODEL EVENTS
    updateBadgeId: function(id) {
        // Only proceed if id is sent.
        if (!id) { return; }

        var that = this,
            $btn = this.$el.find('.badgeBtn'),
            bObj = this.containerView.activePromotionSetup.behaviors,
            selectedBObj = _.find(bObj, function(o) { return o.id == id; });

        // button (selected) badge content
        TemplateManager.get('badgeBtn', function(tpl) {
            $btn.empty();

            $btn.append(tpl(selectedBObj||that.noBadgeJson));
            that.$el.find('#selectedBehavior').val(id);

            that.trigger('badgeIdUpdated', id);
            // console.log('JSON ', selectedBObj, ' no JSON ', that.noBadgeJson);
        });
    },

    updateNotifyText: function() {
        var $visCheck = this.$el.find('.showNotifyText'),
            $guts = this.$el.find('.notifyTextGuts'),
            $txt = this.$el.find('.notifyText');

        // this just syncs the visibility of the selector with the checkbox
        if($visCheck.is(':checked')) {
            $guts.slideDown();
        } else {
            // clear text, keyup triggers update of richtext iframe
            $txt.val('').trigger('keyup');
            // trigger other updates on richtext pluggy
            $($txt.get(0).jhtmlareaObject.editor.body).trigger('keyup');
            $guts.slideUp();
        }
    },

    renderBadges: function() {
        var that = this,
            promotionModel = this.containerView.activePromotionSetup,
            badges = promotionModel.behaviors,
            hasBadges = badges && badges.length,
            $badgesCont = this.$el.find('.badgesSelector'),
            $badges = $badgesCont.find('.badgeItems');

        // no badges? hide and return.
        if(!hasBadges) {
            $badgesCont.hide();
            return;
        }

       // we will use this elsewhere
        if (this.containerView.badgesView && this.containerView.badgesView.noBadgeJson) {
            this.noBadgeJson = this.containerView.badgesView.noBadgeJson;
        } else {
            this.noBadgeJson = $badgesCont.data('noBadgeJson');
        }

        TemplateManager.get('badgeItem', function(tpl) {
            $badges.empty();
            _.each(badges, function(b){
                $badges.append(tpl(b));
            });
            //As per new use case we do NOT allow the noBadge case.
            //$badges.prepend(tpl(that.noBadgeJson));
            //
            if(!promotionModel.behaviorRequired) {
                $badgesCont.removeClass('validateme');
            } else {
                $badgesCont.addClass('validateme');
            }
        });
    }
});
