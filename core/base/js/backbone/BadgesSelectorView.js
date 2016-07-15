/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
TemplateManager,
BadgesSelectorView:true
*/
BadgesSelectorView = Backbone.View.extend({

    noBadgesJson: {
        "id":"noBadge",
        "name":"[msgNoBadge]",
        "iconClass":"icon-ban-circle",
        "contClass":"noBadgeContent"
    },

    initialize: function(opts) {
        var msgNoBadge = this.$el.data('msgNoBadge'),
            initWithBadgeId;

        this.collection = opts.collection || new Backbone.Collection();
        this.model = new Backbone.Model();

        // if data-msg-no-badge is set on wrap element
        if(msgNoBadge) {
            // pull data attr off wrapping element for i18n
            this.noBadgesJson.name = msgNoBadge;
            // add to top of collection
            this.collection.add(this.noBadgesJson, {at:0});
        }

        // select initial badge
        if(this.collection.length) {
            if(opts.selectedBadgeId&&this.collection.get(opts.selectedBadgeId)) {
                // init with specific badge
                this.model.set('activeBadgeId', this.collection.get(opts.selectedBadgeId));
            } else {
                // init with first badge
                this.model.set('activeBadgeId', this.collection.at(0).get('id'));
            }
        } else {
            console.error('[BadgesSelectorView] collection has no elements!');
        }


        // we have set the initial state, after that start listening
        this.model.on('change:activeBadgeId', this.updateBadgeId, this);

        this.tplName = opts.tplName || 'badgesSelectorView',
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_BASE_ROOT+'tpl/';

        this.render();

    },


    events: {
        "click .badgeItem a": "doBadgeItemSelect",
        "click .badgeBtn.disabled": function(e){ e.preventDefault(); } // gobble it up!
    },


    // USER EVENTS
    doBadgeItemSelect: function(e) {
        var self = this,
            $tar = $(e.currentTarget),
            bid = $tar.data('badgeId');
        e.preventDefault();
        this.model.set('activeBadgeId', bid);
        this.trigger('badgeChanged', this.collection.get(bid));
    },


    // MODEL EVENTS
    setActiveBadgeById: function(id) {
        this.model.set('activeBadgeId', id);
    },

    getActiveBadge: function() {
        return this.collection.get(this.model.get('activeBadgeId'));
    },

    updateBadgeId: function() {
        var that = this,
            $btn = this.$el.find('.badgeBtn'),
            selectedBObj = this.collection.get(this.model.get('activeBadgeId')).toJSON();

        $btn.empty();
        $btn.append(this.subTpls.badgeBtn(selectedBObj));
    },

    render: function() {
        var that = this;
        this.$el.empty();
        TemplateManager.get(this.tplName, function(tpl, vars, subTpls) {
            that.subTpls = subTpls;
            that.$el.append(tpl());
            that.renderBadges();
            that.updateBadgeId();
            that.trigger('rendered');
        }, this.tplUrl);
    },

    renderBadges: function() {
        var that = this,
            badges = this.collection.toJSON(),
            hasBadges = badges && badges.length,
            $badgesCont = this.$el.find('.badgesSelector'),
            $badges = $badgesCont.find('.badgeItems');

        // no badges? hide and return.
        if(!hasBadges) {
            $badgesCont.hide();
            return;
        }

        $badges.empty();
        _.each(badges, function(b){
            $badges.append(that.subTpls.badgeItem(b));
        });
    },

    disable: function() {
        if(!this.$el.html()) {
            this.on('rendered', this.disable, this);
        } else {
            this.off('rendered', this.disable, this);
            this.$el.find('.badgeBtn').addClass('disabled'); // bootstrap disable
        }
    }
});