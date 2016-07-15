/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
ParticipantCollectionView,
ParticipantSearchView,
ReportsChangeFiltersPopoverView:true
*/
ReportsChangeFiltersPopoverView = Backbone.View.extend({

    //override super-class initialize function
    initialize: function(opts){
        "use strict";
        var that = this;

        this.$trigger = $(opts.trigger);
        this.parentView = (opts.parentView);

        this.changeFiltersUrl = this.parentView.model.get('url');

        // set the z-index qtips below the bootstrap modal z-index (1050)
        // (default qtip behavior is dynamic z-index stacking -- not static value)
        // http://craigsworks.com/projects/forums/thread-solved-override-z-index
        $.fn.qtip.zindex = 1000;

        this.$trigger.qtip({
            content:{text:'loading...'},
            position: opts.position,
            show:{
                event: 'click',
                ready: false
            },
            hide:{
                event: 'click',
                fixed: true,
                delay: 200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light profile-popover-left reportsChangeFiltersPopover',
                tip: {
                    corner: false
                }
            },
            events:{
                show: function(event,api){that.doShown();}
            }
            //prevent default (for anchor tags)
        }).click(function(e){e.preventDefault();return false;});

        this.isRendered = false;
    },

    doShown: function(){
        "use strict";
        var that = this;

        // this.changeFiltersUrl = 'ajax/temp_reportsParams.html'; //this.parentView.reportsSelectUrl.split('?')[0];
        this.setElement(this.$trigger.data('qtip').elements.tooltip);

        $('.reportsChangeFiltersPopover')
            .empty()
            .prepend('<span class="spin" />')
            .find('.spin').spin()
            .end()
            .load(
                that.changeFiltersUrl,
                { method: 'loadReportParameters', responseType: 'html'},
                function(responseText, textStatus, XMLHttpRequest){
                    that.render();
                    G5.serverTimeout(responseText);
                }
            );

    }, // doShown

    events: {
        'click .close':'hide',
        'change .date':'validateDates',
        'change #autoUpdate':'handleAutoUpdate',
        'click #cancelButton':'hide',
        'click #submitButton':'submitFormData'
    }, // events

    hide: function(){
        "use strict";
        this.$trigger.qtip('hide');
        $('div.datepicker.dropdown-menu').hide();
    }, // hide

    render: function(){
        "use strict";
        var that = this;

        //refresh position and dimensions for new content
        // this.$trigger.qtip('reposition');
        this.$el.find('.alert .alert-error .errorHidden').hide();

        this.initPlugins();
        // if participantSearchView exists in DOM
        if ($('#participantSearchView').length > 0) {
            this.initializeParticipantSearch();
        }

        $.scrollTo(this.$el, G5.props.ANIMATION_DURATION, {
            axis : 'y'
        });

        // $('.reportsChangeFiltersPopover').spin(false);

    }, // render

    initPlugins: function(){
        "use strict";
        var $changeFilters = this.$el.find('.changeFiltersPopover'),
            newIndex,
            reportDashboardItemId,
            thatView = this;

        this.$el.find('.datepickerTrigger').datepicker({endDate: '+0d'});

        // console.log('multiple selects: ',this.$el.find('select[multiple="multiple"]'));

        // clicking outside this qtip will hide it
        $('body').click(function(){
            thatView.hide();
        });
        // however, clicking inside the qtip should keep it open
        this.$el.click(function(e) {
            e.stopPropagation();
        });

    }, // initPlugins

    initializeParticipantSearch: function() {
        var participants;

        // look for prefilled participants
        if( $('.reportsChangeFiltersPopover').find('#prefilledParticipant').length ) {
            participants = $.parseJSON( $.trim( $('.reportsChangeFiltersPopover').find('#prefilledParticipant').val() ) );
        }

        // set up the participant search widget
        this.participantsView = new ParticipantCollectionView({
            el : this.$el.find('#participantsView'),
            tplName :'participantRowItemSingle', //override the default template
            model : new Backbone.Collection(participants)
        });

        // page level reference to participant search view
        this.participantSearchView = new ParticipantSearchView({
            el : this.$el.find('#participantSearchView'),
            participantCollectionView : this.participantsView
        });

        // page level reference to participant search model
        this.participantSearchModel = this.participantSearchView.model;

        // attempting to reset the autoIncrement back to zero every time so the selected value is always pax[0].userId
        this.participantsView.model.on('add', function() {
            this.participantsView.autoIncrement = 0;
        }, this);

        this.participantsView.autoIncrement = 0;

    }, // initializeParticipantSearch

    validateDates: function(event){
        'use strict';
        var $startDate = this.$el.find('#fromDate').parent(),
            $endDate = this.$el.find('#toDate').parent();

        switch($(event.currentTarget).find('input').attr('id')) {
            case 'fromDate':

                // end date cannot occur before startDate
                $endDate.datepicker('setStartDate',$startDate.find('input').val());

                break;
            case 'toDate':

                // startDate cannot occur after endDate
                $startDate.datepicker('setEndDate',$endDate.find('input').val());

                break;
        } // switch


    }, // validateDates

    handleAutoUpdate: function(event) {
        var $box = $(event.target),
            checked = $box.prop('checked'),
            $endDate = this.$el.find('#toDate').parent();

        if( checked === true ) {
            $endDate.datepicker('update', new Date());
        }
    },

    submitFormData: function(){
        // "use strict"; // commented out because something about line 176 is preventing Safari 6 from running the function
        var thisView = this,
            requestData = this.$el.find('form').serialize();

        requestData.method = 'displaySummaryReport';
        // $('input[value="loadReportParameters"]').attr('value','displaySummaryReport');

        G5.util.showSpin( this.$el, {
            cover : true
        } );

        // NOTE: it would be nice to use this.parentView.model.loadFullData but I'm not sure how to implement that with the parameters form. Until then, we'll use a separate ajax request

        // go ahead and start the load
        // first set the loading flag
        this.parentView.model._fullLoadInProgress = true;

        $.ajax({
            url: thisView.changeFiltersUrl,
            type: 'post',
            data: requestData,
            dataType: 'g5json',
            error: function(jqXHR, textStatus, errorThrown) {
                // thisModel.trigger('fullDataLoadFailed', jqXHR, textStatus, errorThrown);
            },
            success: function(servResp){
                var data = servResp.data,
                    $form = thisView.$el.find('div.alert.alert-error.errorHidden'),
                    validationPassFail = G5.util.formValidateHandleJsonErrors($form, servResp.data.messages);

                // first, clear the loading flag
                thisView.parentView.model._fullLoadInProgress = false;

                // if results exist in results set
                if ( (data.report.tabularData[0].results.length > 0) && validationPassFail ) {
                    thisView.$el.find('div.alert.alert-error.errorHidden').hide();

                    // then, set the data loaded flag
                    thisView.parentView.model._fullDataLoaded = true;
                    thisView.parentView.model.updateUrlParams(requestData);

                    // fill up the model with the new data
                    thisView.parentView.model.set(servResp.data.report);

                    // flag the model as OK to suppress this popover when it renders
                    thisView.parentView._suppressParametersPopover = true;

                    // check to make sure that our parentView is the currently active report before triggering our event and hiding the popover
                    if( thisView.parentView.model.get('id') == thisView.parentView.model.collection.getActiveReportId() ) {
                        thisView.parentView.model.trigger('fullDataLoaded', { type : 'changefilters' });
                        thisView.hide();
                        $.scrollTo(thisView.parentView.$el, G5.props.ANIMATION_DURATION, {
                            axis : 'y'
                        });
                    }
                    // if there is a data mismatch, we've already stored it in the model. we just don't want to fire the trigger that causes the UI to update
                    else {
                        return false;
                    }
                }
                // otherwise, show the error messaging
                else {
                    thisView.$el.find('div.alert.alert-error.errorHidden').show();

                    G5.util.hideSpin( thisView.$el );

                    // flag the model as OK to suppress this popover when it renders
                    thisView.parentView._suppressParametersPopover = false;
                }

            } // ajax post success
        }); // ajax post

    } // submitFormData

});
