/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
ManagerToolkitPageBudgetView:true
*/
ManagerToolkitPageBudgetView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts) {

        console.log('[INFO] ManagerToolkitPageBudgetView: Manager Toolkit Page Budget View initialized', this);

        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = "managerToolkit";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.checkForServerErrors();

        this.$selectionForm = this.$el.find('#promotionSelect');
        this.$cancelButton = this.$el.find(".previewCancelBtn");

        this.createCancelTip(this.$cancelButton);

    },

    events:{
        "change #budgetMasterId" : "submitSelectionForm",
        "change #budgetSegmentId" : "submitSelectionForm",
        "change #ownerBudgetNodeId" : "submitSelectionForm",
        // scrub/autopopulate/validate date & numeric input
        "blur .reallocationAmount input" : "scrubOnBlur",
        "click .reallocationAmount input" : "selectAll",
        "click .form-actions button" : "formActions",
        "click #recognitionButtonChangePromoConfirm" : "returnHome",
        "click #recognitionButtonChangePromoCancel" : "hideQtip"
    }, // events

    submitSelectionForm: function(e) {
        e.preventDefault();

        G5.util.showSpin(this.$el, {cover:true});

        // find every <select> after the one that triggered this event and erase the value
        $(e.target).closest('.control-group').nextAll('.control-group').find('select').val('');

        this.$selectionForm.submit();
    },

    formActions : function(e) {
        var that = this;
        var $form = $(e.target).closest('form');
        var $clickedBtn = $(e.target).closest('button');
        var formaction = $clickedBtn.attr("formaction");

        if ( formaction !== null )
        {
            $form.attr( "action", formaction );
        }

        $form.data( 'trigger', $(e.target) );

        setTimeout(function() {that.disableFormOptions();}, 1);
    },

    returnHome: function(e) {
        window.location.assign($(e.target).data('url'));
    },

    hideQtip: function(event) {
        $(event.target).closest(".qtip").qtip("hide");
    },

    createCancelTip: function($trigger) {
        var $cancelTip = $("#cancelConfirmDialog");

        $trigger.qtip({
            content: $cancelTip,
            position:{
                my: 'left center',
                at: 'right center',
                container: this.$el
            },
            show:{
                event:'click',
                ready:false
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
    },

    scrubOnBlur: function(event){
        'use strict';
        var valueAsArray = $(event.currentTarget).val().toString().split(""),
            value = $(event.currentTarget).val(),
            format = $(event.currentTarget).data('numberType'),
            valueAsString,
            numericValue;

        if ( (value === '') || (value === '.') || ((parseInt(value,10) === 0) && (format === 'whole')) || ((parseFloat(value) === 0) && (format === 'decimal')) ) {
            $(event.currentTarget).val(0);
        } else {
            // if last character is a '.' then remove it
            if (_.indexOf(valueAsArray, '.') === valueAsArray.length-1) {
                valueAsArray.pop();
                valueAsString = valueAsArray.join('');
                if (format === 'whole') {
                    numericValue = parseInt(valueAsString,10);
                } else {
                    numericValue = parseFloat(valueAsString);
                }
                $(event.currentTarget).val(numericValue);
            } // if
        } // else


    }, // fillWithZero

    selectAll: function(event){
        'use strict';

        $(event.currentTarget).select();

    }, // selectAll

    checkForServerErrors: function() {
        if ($("#serverReturnedErrored").val() === "true"){
            $("#managerBudgetErrorBlock").slideDown('fast'); //show error block
        }
    }, //checkForServerErrors
    disableFormOptions : function(e){
        //disable all buttons
        $('.form-actions .btn').attr('disabled', 'disabled');
    }

});