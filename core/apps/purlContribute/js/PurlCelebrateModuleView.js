/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
CelebrationAnniversaryFactsModuleView:true
*/
PurlCelebrateModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        var that = this;

        ModuleView.prototype.initialize.apply(this, arguments); // this is how we call the super-class initialize function (inherit its magic)
        this.events = _.extend({}, ModuleView.prototype.events, this.events); // inherit events from the superclass ModuleView

        this.model.set(
            'allowedDimensions', [
                { w:2, h:1 },
                { w:2, h:2 },
                { w:4, h:2 },
                { w:4, h:4 }
            ],
            { silent: true }
        );

        this.celebrateModel = new PurlCelebrateModel({
            isModule: true
        });
        
        this.on('templateLoaded', function(tpl, vars, subTpls){
            this.purlCelebrateListTpl = subTpls.purlCelebrateListTpl;
            that.dataLoad(true);

            that.celebrateModel.loadData();

            that.celebrateModel.on('dataLoaded', function(){
                that.renderList();
            });
            
        }, this);
    },
    events: {
        'click .profile-popover': 'attachParticipantPopover'
    },
    renderList: function(){
        var $celebrateListCont = this.$el.find('.purlCelebrateList'),
            celebrationSets = this.celebrateModel.get('celebrationSets'),
            tplName = 'purlCelebrateModule',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'purlContribute/tpl/'
            that = this;

        _.each(celebrationSets, function(celSet){
            if(celSet.nameId === 'global'){
                $celebrateListCont.append(that.purlCelebrateListTpl(celSet));

                if(celSet.celebrations.length == 1){
                    that.$el.find('.oneCelebration').show();
                    that.$el.find('.multipleCelebrations').hide();
                }
            }
        });

        this.$el.find('.purlCelebrateModuleContent ul li:odd').addClass('odd');
        that.dataLoad(false);

    },
    attachParticipantPopover:function(e){
        var $tar = $(e.target);

        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $tar.participantPopover().qtip('show');
        }
        e.preventDefault();
    }
});