/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
PageView,
ParticipantCollectionView,
ParticipantSearchView,
LeaderboardPageCreateEditCopyView:true
*/
ThrowdownLeaderboardPageCreateEditCopyView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        'use strict';
        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'leaderboard';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create handy references to our important DOM bits


        // check to see if the DOM element for the pax search is present before initializing the widget
        // (alternatively, we could check the opts.mode flag for 'create' or 'editactivity' but that doesn't guarantee the View will initialize properly)
        if( this.$el.find('#participantsView').length ) {
            this.initializeParticipantSearch();
        }

        this.render();
        this.checkNotifyBox();

    }, // initialize

    events:{

        // prevent the form from submitting itself the default way
        // "submit form" : function(e) { e.preventDefault(); },
        "submit form" : "formHandler",
        "change .date" : "validateDates",
        // intercept any clicks on form buttons
        "click .form-actions button" : "formActions",
        "click .leaderboardCancelDialog button" : "areYouSureListener",

        // scrub/autopopulate/validate date & numeric input
        "keydown #participantsView .newScore .number" : "suppressNonNumericInput",
        "blur #participantsView .newScore .number" : "scrubOnBlur",
        "click #participantsView .newScore .number" : "selectAll",

        // TEMPORARY for testing/proof-of-concept
        // "blur .validateme input, .validateme select, .validateme textarea" : function(e) {
        //     G5.util.formValidate( $(e.target) );
        // },

        "click #notifyParticipants" : "toggleNotifyParticipants",
        "click .control-label i" : "showHelpPopover"

    }, // events
    
    //wait for model update
    wait:function(){
        'use strict';
        //start the spinner
        // this.$el.find('.leaderboardModel').spin();
    },

    render:function(){
        'use strict';
        var thisView = this,
            $startDate = this.$el.find('#startDate'),
            $endDate = this.$el.find('#endDate'),
            $displayEndDate = this.$el.find('#displayEndDate'),
            $activityDate = this.$el.find('#activityDate'),
            today;

        // this.$el.find('.leaderboardModel').spin(false);

        // NOTE: removed this, doesn't seem to be used anywhere -- also, hide/show is
        //       now controlled via the searchView itself, so if this behavior is desired
        //       please use the widget's methods to hide/show.
        // check to see if the participant search widget should be open by default
        // if( this.options.addMoreParticipantsSearchOpen ) {
        //     // trigger the toggle function
        //     this.toggleAddMoreParticipants({
        //         target : this.$el.find('#leaderboardButtonAddMoreParticipants')
        //     });
        // }

        // initialize any date pickers
        this.$el.find('.datepickerTrigger').datepicker();

        // initialize any rich text editors
        this.$el.find('.richtext').htmlarea( G5.props.richTextEditor );

        // check to see if the notify participants checkbox/textarea should be checked/visible by default
        if( this.options.notifyParticipantsOpen ) {
            // check the box
            this.$el.find('#notifyParticipants').attr('checked','checked');
            // trigger the toggle function
            this.toggleNotifyParticipants({
                target : this.$el.find('#notifyParticipants')
            });

            // if no notify message provided, try to fill in the textarea with option else ''
            if(!this.$el.find('#notifyMessage').val()){
                this.$el.find('#notifyMessage').text(this.options.notifyParticipantsMessage||'');
            }
            
        }else{
            // make absolutely sure it's hidden correclty
            var $notifyMessage = this.$el.find('#notifyParticipants');

            $notifyMessage.removeAttr('checked');

            if ($notifyMessage.parent(".controls").is(":visible")){
                $notifyMessage.parent('.controls').slideToggle(G5.props.ANIMATION_DURATION);
            }
        }

        // initialize any participant-popover links
        this.$el.find('.participant-popover').participantPopover();

        // if ( (this.options.mode !== 'editActivity') && (this.options.mode !== 'preview') ) {

        //     this.enableOrDisableActivityDate();
        // }
        // TODO: cleanup the logic for hide/show of notify participants section
        if (    (this.options.mode !== 'editPromoInfo' && !$('#notifyMessage').val()) || 
                ( (this.options.mode === 'editPromoInfo') && (this.$el.find('.participantCount').val() === '0') ) ||
                ( (this.options.mode === 'create') && (this.$el.find('.participantCount').val() === '0') ) 
            ) {
            this.selectivelyDisableNotifyParticipants({hide:true});
        }

    }, // render

    areYouSurePopover: function(e) {
        'use strict';
        var $tar = $(e.target);

        e.preventDefault();
        // show a qtip
        if(!$tar.data('qtip')){
            this.addConfirmTip(
                $tar,
                $tar.closest('.form-actions').find('.leaderboardCancelDialog')
            );
        } // if
    }, // areYouSurePopover

    areYouSureListener: function(e) {
        'use strict';
        var $form = $(e.target).closest('form'),
            $tar = $(e.target),
            button = e.target.id;

        if (button === 'leaderboardCancelDialogConfirm') {
            this.areYouSure = true;
            this.$el.find('#leaderboardButtonCancel').click();
        }

        if (button === 'leaderboardCancelDialogCancel') {
            $($tar).closest('.areYouSurePopover').qtip('hide');
        }

    }, // areYouSureListener

    addConfirmTip: function($trig, cont){
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
    }, // addConfirmTip

    formActions: function(e) {
        'use strict';
        // console.log('formActions', e);
        // console.log(e.target);

        var $form = $(e.target).closest('form'),
            button = e.target.id;

        if ( (button === 'leaderboardButtonPreviewLeaderboard') || (button === 'leaderboardButtonSaveDraft') 
                || (button === 'leaderboardButtonSubmit') || (button === 'leaderboardButtonEdit') 
                || ((button === 'leaderboardButtonCancel') && (this.areYouSure)) ) {
            $form.data( 'trigger', $(e.target) );
        } else {
            this.areYouSure = false;
            this.areYouSurePopover(e);
        }

    }, // formActions

    formHandler: function(e) {
        'use strict';
        // console.log('formHandler', e);
        // console.log(e.target);

        var $form = $(e.target),
            $trigger = $form.data('trigger'),
            method = $form.attr('method'),
            action = $trigger.attr('formaction') || $form.attr('action') || $form.data('default-action'),
            $validate = $form.find('.validateme'),
            data = $form.serializeArray(),
            request;

        data.push({ name : 'trigger', value : $trigger.val() });

        // check to see if the form is ready to submit
        // if so, let it do its thing
        if( $form.data('readyToSubmit') ) {
            return;
        }
        // if not, prevent default submisison and run the rest of this function
        else {
            e.preventDefault();
        }

        // only run the validation if the $trigger is NOT the cancel button
        if( $trigger.attr('id') != 'leaderboardButtonCancel' ) {

            // if the entire form fails to validate prevent it from continuing
            if( !G5.util.formValidate($validate) ) {
                return false;
            }

        }

        // otherwise, continue with the ajax submit
        request = $.ajax({
            url : action,
            type : method,
            data : data,
            dataType : 'g5json'
        });

        // create a spinner on the trigger button
        $trigger.attr('disabled','disabled').spin();
        $trigger.siblings('.btn').attr('disabled','disabled');

        request.done(function(data, textStatus, jqXHR) {
            // if the form fails validation on the server, prevent it from doing anything else
            if( !G5.util.formValidateHandleJsonErrors($form, data.data.messages) ) {
                // remove the spinner on the trigger button
                $trigger.removeAttr('disabled').spin(false);
                $trigger.siblings('.btn').removeAttr('disabled');
                return false;
            }
            // if the response contains a serverCommand, let it run and prevent the form from doing anything else
            else if( _.any(data.data.messages, function(message) { return message.type === 'serverCommand'; }) ) {
                return false;
            }
            // otherwise, mark the form as ready to submit and resubmit
            else {
                $form.data('readyToSubmit', true);
                $form.submit();
            }
        });

        request.fail(function(jqXHR, textStatus, errorThrown) {
            console.log('[ERROR] LeaderboardPageCreateEditCopyView: form submission .ajax failed', jqXHR, textStatus, errorThrown);
            // remove the spinner on the trigger button
            $trigger.removeAttr('disabled').spin(false);
            $trigger.siblings('.btn').removeAttr('disabled');
        });
    }, // formHandler

    formValidator: function($fields) {
        'use strict';
        _.each($fields, function($field) {
            console.log($field);
        });
    }, // formValidator

    initializeParticipantSearch: function() {
        'use strict';
        var thisView = this;

        // set up the participant search widget
        this.participantsView = new ParticipantCollectionView({
            el : this.$el.find('#participantsView'),
            tplName :'particpantLeaderboardRow', //override the default template
            model : new Backbone.Collection(this.options.leaders)
        });

        // page level reference to participant search view
        this.participantSearchView = new ParticipantSearchView({
            el : this.$el.find('#participantSearchView'),
            participantCollectionView : this.participantsView
        });

        // page level reference to participant search model
        this.participantSearchModel = this.participantSearchView.model;

        // listen for an empty participant collection
        this.participantsView.model.on('remove', function() {
            this.selectivelyDisableNotifyParticipants({hide:false});
        }, this);

        // listen for a participant add to the collection
        this.participantsView.model.on('add', function(m, o) {
            // if there is one or more model in the collection (should be a given, as this is an add)
            if( o.length ) {
                // enable the notifyParticipants box
                this.$el.find('#notifyParticipants').removeAttr('disabled').closest('.control-group').show();
            }
        }, this);
    }, // initializeParticipantSearch

    selectivelyDisableNotifyParticipants: function(hide){
        'use strict';

        // if there are no models in the collection
        if((!this.participantsView) || (this.participantsView.model.length === 0)) {
            // check to see if the notifyParticipants box is checked. If so, click it to uncheck it...
            if( this.$el.find('#notifyParticipants').attr('checked') ) {
                this.$el.find('#notifyParticipants').click();
            }
            // ...then disable it
            this.$el.find('#notifyParticipants').attr('disabled', 'disabled');
            if (hide.hide === true) {
                this.$el.find('#notifyMessage').closest('.control-group').hide();
            }
    
        } // if no participants

    }, // selectivelyDisableNotifyParticipants

    toggleNotifyParticipants: function(e) {
        'use strict';
        var $notifyMessage = this.$el.find('#notifyMessage');
        // if the tigger checkbox has been checked
        if( $(e.target).attr('checked') ) {
            // enable the textarea
            $notifyMessage.removeAttr('disabled');
        }
        // if the trigger checkbox has been unchecked
        else {
            // disable the textarea
            $notifyMessage.attr('disabled', 'disabled');
        }

        $notifyMessage.parents('.controls').slideToggle(G5.props.ANIMATION_DURATION);
    }, // toggleNotifyParticipants

    enableOrDisableActivityDate: function(){
        'use strict';
        var $startDate = this.$el.find('#startDate').closest('.datepickerTrigger'),
            $activityDate = this.$el.find('#activityDate').closest('.datepickerTrigger');

        if(!$startDate.length) { return; } // not all pages have this

        // if startDate is future, then disable
        if( $startDate.data('datepicker').date.valueOf() > $startDate.data('datepicker').todayDate.valueOf()) {
            
            // disable the activityDate
            $activityDate.find('button').attr('disabled', 'disabled');
        }
        else {
            // enable the activityDate
            $activityDate.find('button').removeAttr('disabled');
        }

    },

    validateDates: function(event){
        'use strict';
        var $startDate = this.$el.find('#startDate').closest('.datepickerTrigger'),
            $endDate = this.$el.find('#endDate').closest('.datepickerTrigger'),
            $displayEndDate = this.$el.find('#displayEndDate').closest('.datepickerTrigger'),
            $activityDate = this.$el.find('#activityDate').closest('.datepickerTrigger'),
            $target = $(event.currentTarget),
            startDateFormatted,
            endDatePlusTen,
            endDatePlusTenFormatted,
            endDateFormatted,
            displayEndDateFormatted;

        switch($target.attr('id')) {
            case 'startDate':

                // once start date has been set, other dates cannot occur before it
                $endDate.datepicker('setStartDate',$startDate.find('input').val());
                $displayEndDate.datepicker('setStartDate',$startDate.find('input').val());
                $activityDate.datepicker('setStartDate',$startDate.find('input').val());

                // if a value already exists in other fields, clear the value & indicate change
                if ($endDate.find('input').val() !== '') {
                    G5.util.animBg($endDate.find('input'),'background-flash');
                    $endDate.find('input').val('');
                    $endDate.datepicker('update');
                }
                if ($displayEndDate.find('input').val() !== '') {
                    G5.util.animBg($displayEndDate.find('input'),'background-flash');
                    $displayEndDate.find('input').val('');
                    $displayEndDate.datepicker('update');
                }
                if ($activityDate.find('input').val() !== '') {
                    G5.util.animBg($activityDate.find('input'),'background-flash');
                    $activityDate.find('input').val('');
                    $activityDate.datepicker('update');
                }

                // this.enableOrDisableActivityDate();

                break;
            case 'endDate':

                // if endDate is updated, displayEndDate updates automatically to endDate + 10 days
                endDatePlusTen = $endDate.data('datepicker').date.valueOf() + 864000000;
                endDatePlusTenFormatted = $.fn.datepicker.DPGlobal.formatDate(new Date(endDatePlusTen),$endDate.data('datepicker').format,$endDate.data('datepicker').language);

                G5.util.animBg($displayEndDate.find('input'),'background-flash');
                $displayEndDate.find('input').val(endDatePlusTenFormatted);
                
                $displayEndDate.datepicker('update');
                $activityDate.datepicker('setEndDate',$endDate.find('input').val());

                break;
        } // switch


    }, // validateDates

    suppressNonNumericInput: function(event){
        'use strict';
        var $tar = $(event.currentTarget),
            valueAsArray = $tar.val().toString().split(""),
            format = $tar.data('numberType');

        // TAB to next input
        if(event.keyCode === 9) {
            event.preventDefault();
            $tar.closest('.participant-item')
                .next('.participant-item')
                .find('.newScore .number').focus().select();
            return;
        }


        // Allow: backspace, delete, tab, escape, and enter
        if ( event.keyCode === 46 || event.keyCode === 8 || event.keyCode === 9 || event.keyCode === 27 || event.keyCode === 13 || 
             // Allow: Ctrl+A
            (event.keyCode === 65 && event.ctrlKey === true) || 
             // Allow: home, end, left, right
            (event.keyCode >= 35 && event.keyCode <= 39) ||
             // Allow: decimal if format is decimal and there is not already one present
            ((event.keyCode === 110 || event.keyCode === 190) && (!_.contains(valueAsArray,'.')) && (format === 'decimal') ) ) {
                 // let it happen, don't do anything
                 return;
        } else {
            // Ensure that it is a number and stop the keypress
            if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
                event.preventDefault(); 
            }  
        } // else

    }, // suppressNonNumericInput

    scrubOnBlur: function(event){
        'use strict';
        var valueAsArray = $(event.currentTarget).val().toString().split(""),
            value = $(event.currentTarget).val(),
            valueAsString,
            numericValue;

        if ( (value === '') || (value === '.') || (parseInt(value,10) === 0) ) {
            $(event.currentTarget).val(0);
        } else {
            // if last character is a '.' then remove it
            if (_.indexOf(valueAsArray, '.') === valueAsArray.length-1) {
                valueAsArray.pop();
                valueAsString = valueAsArray.join('');
                numericValue = parseInt(valueAsString,10);
                $(event.currentTarget).val(numericValue);
            } // if
        } // else

    }, // fillWithZero

    selectAll: function(event){
        'use strict';

        $(event.currentTarget).select();

    }, // selectAll

    checkNotifyBox: function() {
        //if you click preview, then edit, we want that text box to show

        if ($("#notifyPaxChecked").val() === "true"){

            $('#notifyParticipants').attr("checked", "checked");

            this.toggleNotifyParticipants({
                target : this.$el.find('#notifyParticipants')
            });
            
        }
    },

    showHelpPopover: function(event) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        var $target = $(event.target),
            popContent = $target.attr("data-popover-content");

        $target.qtip({
                content: {
                   text: popContent
                },
                position : {
                    my: 'left center',
                    at: 'right center'
                },
                show : {
                    ready : true,
                    delay: false // important for Send a Rec.
                },
                hide : {
                    event: 'unfocus',
                    fixed : true
                },
                //only show the qtip once
                events:{
                    show : function(evt,api) {
                        $target.css('position','relative');
                    },
                    hide : function(evt,api) {
                        $target.qtip('destroy');
                        $target.css('position','');
                    },
                    render : function(evt,api) {
                    }
                },
                style:{classes:'ui-tooltip-shadow ui-tooltip-light'}
            });

        $target.qtip("show");
    }

});
