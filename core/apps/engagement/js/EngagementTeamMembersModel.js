/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
Backbone,
EngagementTeamMembersModel:true
*/
EngagementTeamMembersModel = Backbone.Model.extend({
    initialize: function() {
        console.log('[INFO] EngagementTeamMembersModel: initialized', this);

        this.processData();
    },

    processData: function() {
        var data = this.get('data');

        _.each(data, function(i) {
            i.diff = (i.actual !== null && i.target !== null) ? i.actual - i.target : '';
            i.ontrack = i.diff === 0 ? 'ontrack' : i.diff > 0 ? 'ahead' : 'behind';
            i.diff = i.diff > 0 ? '+'+i.diff : i.diff.toString();
        });

        this.set('data', data);
    }
});
