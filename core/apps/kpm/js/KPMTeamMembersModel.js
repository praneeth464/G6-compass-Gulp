/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
Backbone,
KPMTeamMembersModel:true
*/
KPMTeamMembersModel = Backbone.Model.extend({
    initialize: function() {
        console.log('[INFO] KPMTeamMembersModel: initialized', this);

        this.processData();
    },

    processData: function() {
        var data = this.get('data');

        _.each(data, function(i) {
            i.diff = i.actual - i.target;
            i.ontrack = i.diff === 0 ? 'ontrack' : i.diff > 0 ? 'ahead' : 'behind';
            i.diff = i.diff > 0 ? '+'+i.diff : i.diff.toString();
        });

        this.set('data', data);
    }
});
