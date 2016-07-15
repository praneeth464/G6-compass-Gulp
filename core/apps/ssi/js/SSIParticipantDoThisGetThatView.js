/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
console,
SSIParticipantContestView,
SSIParticipantDoThisGetThatView:true
*/
SSIParticipantDoThisGetThatView = SSIParticipantContestView.extend({
    tpl: 'ssiParticipantDoThisGetThatTpl',
    moduleTpl: 'ssiModuleDoThisGetThatTpl',
    adminTpl: 'ssiAdminDoThisGetThatTpl',
    events: {
        'click .stackRankToggle': 'stackRankToggle',
        'click .minQualifier i': "infoPopover"
    },
    initialize: function() {
        'use strict';

        console.log('init DoThisGetThatView');

        SSIParticipantContestView.prototype.initialize.apply(this, arguments);
        this.events = _.extend({}, SSIParticipantContestView.prototype.events, this.events);

        this.on('compiled', this.resizeText);
    },

    proccessModelJSON: function (json) {
        'use strict';

        json.activities = _.map(json.activities, function (activity) {
            var participants = activity.stackRankParticipants;

            if (participants) {
                participants = _.sortBy(participants, function (participant) {
                    return participant.rank;
                });

                activity.stackRankParticipants = participants;
            }

            activity.extraJSON = json;

            return activity;
        });

        return json;
    },

    resizeText: function(){
        G5.util.textShrink( this.$el.find('.dataSection h5'), {vertical:false, minFontSize:14} );
        _.delay(G5.util.textShrink, 100, this.$el.find('.dataSection h5'), {vertical:false,minFontSize:14} );
    },

    /**
     * Toggles classes
     *
     * @param {object} event - jQuery event
     * @returns {object}
     */
    stackRankToggle: function (event) {
        'use strict';

        event.preventDefault();

        var $wrap   = this.$el.find('.activitiesWrap'),
            classes = $wrap.data('classtoggle');

        $wrap.toggleClass(classes);

        return this;
    },

    infoPopover: function (e){
        var $tar = $(e.target),
            $cont = this.$el.find('.ssiMinQualifierPopover').html();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont);
        }
    },

    attachPopover: function($trig, cont){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: "bottom center",
                at: "top center",
                container: this.$el,
                viewport: $(window),
                adjust: {
                    method: 'shift none'
                }
            },
            show:{
                event:'click',
                ready:true
            },
            hide:{
                event:'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    }
});
