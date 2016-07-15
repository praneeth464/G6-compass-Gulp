/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
SSIApproveContestMembersCollection:true
*/
SSIApproveContestMembersCollection = Backbone.Collection.extend({
    initialize: function(models, opts) {
        var defaults = {
            // setting this to false relies on the View calling .loadData()
            autoLoad : true,
            meta : {
                count : 0,
                perPage : 10,
                page : 1
            }
        };

        this.options = $.extend(true, {}, defaults, opts);

        if(this.options.autoLoad === true){
            this.loadData();
        }
    },

    loadData: function(params) {
        var that = this,
            data = {
                clientState : this.options.clientState,
                set: this.options.set
            };

        console.log('[INFO] SSIApproveContestMembersCollection: load data started');

        // merge default data, stored params (with certain params omitted), and passed params
        data = $.extend(true, {}, data, params);

        $.ajax({
            url: G5.props.URL_JSON_SSI_DETAILS_INVITEES_TABLE,
            type: 'POST',
            data: data,
            dataType: 'g5json',
            beforeSend: function() {
                that.trigger('loadDataStarted');
            }
        })
        .done(function(servResp) {
            if( that.options.set === "participants" ) {
                data = servResp.data.participants;
            } else if( that.options.set === "managers"){
                data = servResp.data.managers;
            }

            that.reset(data);

            that.trigger('loadDataDone', data);
        });
    }
});
