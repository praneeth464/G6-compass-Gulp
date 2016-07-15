/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
TemplateManager,
ParticipantCollectionView,
ParticipantSearchView,
ProfilePageFollowListTabView:true
*/
ProfilePageFollowListTabView = Backbone.View.extend({
    initialize: function (opts) {

        this.tplName    = opts.tplName || "profilePageFollowListTab";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';

        this.on('tabRendered',function(){
            console.log('tab rendered.');
            //followees ParticipantCollectionView
            this.followeesView = new ParticipantCollectionView({
                el:this.$el.find('#followeesView'),
                tplName:'participantRowItem' //override the default template
            });

            //load the list of followees
            this.initializeFolloweesRequest();


            //page level reference to participant search view
            this.participantSearchView = new ParticipantSearchView({
                el:this.$el.find('#participantSearchView'),
                //hand search view its parti receptacle
                participantCollectionView: this.followeesView,
                //hand this page view as the parent view
                parentView: this
            });
        });
    },

    activate: function () {
        'use strict';

        this.render();
    },

    render: function () {
        'use strict';
        var that = this;

        this.$el
            .append('<span class="spin" />')
            .find('.spin').spin();

        TemplateManager.get(this.tplName,
            function (tpl) {
                that.$el.empty().append(tpl({}));
                that.trigger('tabRendered');
            },
            this.tplUrl);

        return this;
    },

    initializeFolloweesRequest: function(){
        console.log('inside initializeFolloweesRequest.');
        var that = this;

        this.$el
            .find('.emptyMsg').hide()
            .after('<span class="spin" />')
            .end().find('.spin').spin();

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            type: "POST",
            url: G5.props.URL_JSON_PUBLIC_RECOGNITION_FOLLOWEES_LIST,
            data: {}, 
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data;
                console.log('initializeFolloweesRequest.data ', data);

                that.$el.find('.spin').remove();

                that.followeesView.model.reset(data.participants);
            }
        });
    },

    events: {
        
    }
});
