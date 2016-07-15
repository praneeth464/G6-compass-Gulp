/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
PlateauAwardsPageReminderView:true
*/
PlateauAwardsPageReminderView = PageView.extend({
    
    //override super-class initialize function
    initialize: function(opts) {
        'use strict';   

        console.log('[INFO] PlateauAwardsPageReminderView: Plateau Awards Page Reminder View initialized', this);

        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = "plateauAwards";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.render();

    },

    events:{

        "click .close" : "closeModal",
        "click #plateauAwardsSendReminderButtonSubmit" : "submitAction",
        "click #plateauAwardsSendReminderButtonCancel" : "cancelAction",
        "click #plateauAwardsSendReminderCancelDialogCancel" : "areYouSureCancel"

    }, // events

    closeModal: function(e){
        'use strict';

        e.preventDefault();

        console.log('closeModal');
        this.$el.find('#plateauAwardsReminderSent').hide();
    }, // closeModal

    render:function(){
        'use strict';   
        var that = this;

        this.$el.find('#plateauAwardsReminderSent').hide();

        // initialize any rich text editors
        this.$el.find('.richtext').htmlarea( G5.props.richTextEditor );

        // initialize responsive table
        this.$el.find('table').responsiveTable({
            pinLeft : [0,1]
        });

        // initialize any date pickers
        this.$el.find('#selectAllCheckbox')
            .on('click', function(e) {
                if (e.target.checked){
                    that.$el.find('#outstandingAwardToRedeem tbody input[type=checkbox]').prop('checked', true);
                } else {
                    that.$el.find('#outstandingAwardToRedeem tbody input[type=checkbox]').prop('checked', false);                    
                }
            });

    }, // render

    areYouSurePopover: function(e) {
        'use strict';
        var $tar = $(e.target);

        e.preventDefault();
        // show a qtip
        if(!$tar.data('qtip')){
            this.addConfirmTip(
                $tar,
                $tar.closest('.form-actions').find('.plateauAwardsSendReminderCancelDialog')
            );
        } // if
    }, // areYouSurePopover

       areYouSureCancel: function(e) {
        'use strict';
        var $tar = $(e.target);
            $tar.closest('.areYouSurePopover').qtip('hide');
    }, // areYouSureListener

    addConfirmTip: function($trig, cont){
        'use strict';
        //attach qtip and show
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'bottom center',
                at: 'top center',
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
                classes:'ui-tooltip-shadow ui-tooltip-light participantPopoverQtip areYouSurePopover',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    }, 

    submitAction: function(e) {
        'use strict';
        var $form = this.$el.find("#plateauAwardsSendReminder"),
            $button = $(e.target);
        e.preventDefault();

        if ($('tbody [type=checkbox]:checked').length){
            $form.submit();
        }
        else{
            this.onSubmitErrorTip($button);
        }

    }, // cancelAction
    cancelAction: function(e) {
        'use strict';

        var $form = $(e.target).closest('form'),
            button = e.target.id;
            $form.data( 'trigger', $(e.target) );
            this.areYouSure = false;
            this.areYouSurePopover(e);
    }, // formActions


    // display a qtip on next button
    onSubmitErrorTip: function($target){
        var $cont = this.$el.find('.validationTipWrapper').clone().show();
        //attach qtip and show
        $target.qtip({
            content:{text: $cont},
            position:{
                my: 'bottom center',
                at: 'top center'
            },
            show:{
                event:false,
                ready:true
            },
            hide:{
                event:'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-red',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    }

});