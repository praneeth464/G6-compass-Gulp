/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
SelectAudienceParticipantsModel,
SelectAudienceParticipantsView:true
*/
SelectAudienceParticipantsView = Backbone.View.extend({

    //init function
    initialize:function(opts){
        var self = this;

        //template names
        this.selectAudienceTplName = 'selectAudienceParticipantsView';
        this.tplPath = G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/';

        this.model = new SelectAudienceParticipantsModel({});

        this.model.loadData({
            dataParams: opts&&opts.dataParams
        });

        this.model.on('loadDataFinished', function(){
            self.render();
        });

        this.on('rendered', function(){
            self.preSelectedAudience();
        });
    },
    events: {
        'click .selectedColumn': 'selectAudience',
        'click .viewAudienceList': 'viewAudienceList',
    },
    render: function(){
        var that = this;

        //Push values to template
        TemplateManager.get(this.selectAudienceTplName, function(tpl, vars, subTpls) {
            that.$el.append(tpl(that.model.toJSON()));

            that.$el.find('table').responsiveTable();

            that.trigger('rendered');
        }, this.tplPath);

    },
    preSelectedAudience: function(){
        var selDesel,
            $selectedRow = this.$el.find('.selectedColumn').parents('tr'),
            self = this,
            $selectedId;

        _.each($selectedRow, function(row){

            if($(row).hasClass('selected')){
                $selectedId = $(row).data('groupId');

                selDesel = 'select';

                self.countTotalParticipants($selectedId, selDesel);
            }
        });
    },
    selectAudience: function(e){
        var $curTar = $(e.currentTarget),
            $tarParent = $curTar.parents('tr'),
            $addAudience = $curTar.closest('.addToAudience'),
            $audCheck = $curTar.children('.audienceSelectCheckbox'),
            $dataId = $tarParent.data('groupId'),
            selDesel;

        e.preventDefault();

        if($tarParent.hasClass('selected')){
            $tarParent.removeClass('selected');
            $audCheck.prop('checked', false);
            selDesel = 'deselect';
        } else {
            $tarParent.addClass('selected');
            $audCheck.prop('checked', true);
            selDesel = 'select';
        }

        this.countTotalParticipants($dataId, selDesel);
    },
    countTotalParticipants: function(id, selDesel){
        var $totalCont = this.$el.find('.totalParticipants'),
            $curTotal = parseInt($totalCont.html(), 10),
            results = this.model.get('audienceTable').results,
            amount;

            _.each(results, function(item){
                var $id = parseInt(item.id, 10);

                if(id === $id){
                    amount = item.participantAmount;
                }
            });

            if(selDesel === 'select'){
                $totalCont.html($curTotal+=parseInt(amount, 10));
            } else {
                $totalCont.html($curTotal-=parseInt(amount, 10));
            }
    },
    viewAudienceList: function(e){
        var $tar = $(e.currentTarget),
            cont = $tar.closest('.viewColumn').find('.audienceParticipants');

        if($tar.data('export')){
            $tar.attr('target', "_blank");
            return;
        }

        e.preventDefault();

        if(!$tar.data('qtip')) {
            $tar.qtip({
            content:{text: cont},
            position:{
                my: 'left center',
                at: 'right center',
                container: this.$el
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
                classes:'ui-tooltip-shadow ui-tooltip-light participantPopoverQtip',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
        }
    }

});