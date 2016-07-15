/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
ApprovalsCollection,
ApprovalsSearchModelView:true
*/
ApprovalsSearchModelView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        console.log('[INFO] ApprovalsSearchModelView: ApprovalsSearch View model view initialized', this);

        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = "approvals";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.model = new ApprovalsCollection();

        this.setValuesFromServer();

        this.model.bindApprovalStatusSelects();

        this.model.bindStatusRadios(thisView);

        this.model.bindSelectAllLinks(thisView);

        this.model.bindNotifcationDateToolTip();

        this.model.bindApprovalNomAwardInputs();

        this.bindDatePickers();

        this.checkForServerErrors();

        this.checkPagination();

        this.responsiveTable();

    },

    events: {
        "click #paginationControls li" : "pageinate",
        "click .approvalsSelectAllPendingLink" : "selectAllPending",
        "click .approvalsSelectAllWinnerLink" : "selectAllWinner",
        "click .approvalsSelectAllNonWinnerLink" : "selectAllNonWinner",
        "blur  .status"                          : "validateApproval",
        "submit":"submitForm"
    },

    setValuesFromServer: function () {
        var inputs,
            name;

        if (this.$el.find('#dataForm')) {
            //capture inputs
            inputs = $('#dataForm input');
            //destroy duplicate names
            $('#dataForm').remove();
            for (var i = 0; inputs.length > i; i++) {
                console.log('inside test inputs', inputs[i]);
                name = inputs[i].name;
                this.$el.find("[name = '"+ name +"']").val(inputs[i].value);
            }
            return "[Info] Inputs from server set.";
        }
    },

    validateApproval: function (event) {
        var self = this;
        if (self.$el.find(".status").val == "deny") {
            self.$el.find("#deny--reason").prop('disabled', false);
        }
        else {
            self.$el.find("#deny--reason").prop('disabled', true);
        }
    },

    bindDatePickers: function () {
        this.$el.find('.datepickerTrigger').each(function () {
            var $this = $(this);
            if (!$this.hasClass("showTodayBtn")) {
                $this.datepicker({
                    todayBtn: false //don't want no today button
                });
            }
            else {
                $this.datepicker({
                    todayBtn: true //want today button
                });
            }

            $this.on('changeDate', function(date) {
                if(date.date) {
                    $this.siblings('.clearDate').removeAttr('disabled');
                }
                else {
                    $this.siblings('.clearDate').attr('disabled','disabled');
                }
            });

            $this.siblings('.clearDate').click(function(e) {
                // IE appears to be allowing this click to propagate up the DOM to the form submission, which makes no g.d. sense
                e.stopPropagation();
                e.preventDefault();

                $this.find('input').val('');
                $this.data('datepicker').update();
                $this.trigger('changeDate','');
            });
        });
    },

    selectAllPending: function () {
        $('#nominationApprovalTable .pendingRadio').prop('checked', true);
    },

    selectAllWinner: function () {
        $('#nominationApprovalTable .pendingWinner').prop('checked', true);
    },

    selectAllNonWinner: function () {
        $('#nominationApprovalTable .pendingNonWinner').prop('checked', true);
    },

    pageinate: function (event) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        var $target = $(event.target),
            requestedPage = "";

        if ($target.is("a")) {
            requestedPage = parseInt($target.parent().attr("data-page"), 10);
        }
        else if ($target.is("i")) {
            requestedPage = parseInt($target.parent().parent().attr("data-page"), 10);
        }
        else {
            requestedPage = parseInt($target.attr("data-page"), 10);
        }

        $("#requestedPage").val(requestedPage);

        $("#approvalsSearchForm").submit();
    },

    checkPagination: function () {
        var newPage = $("#currentPage").val(),
            $paginator = $("#paginationControls"),
            $this;

        $paginator.find("li").each(function () {
            $this = $(this);
            if ($this.hasClass("active")) {
                $this.removeClass("active");
            }

            if ($this.attr("data-page") === newPage) {
                $this.addClass("active");
            }
        });

    },

    checkForServerErrors: function () {
        if ($("#serverReturnedErrored").val() === "true") {
            $("#approvalsErrorBlock").slideDown('fast'); //show error block
        }
    }, //checkForServerErrors

    responsiveTable: function () {
        // attach responsive table plugin
        $('#pendingNominationsWrapper').find('table.table').responsiveTable();
    },
    submitForm: function(e) {

        // disable the submit button so multiple submits don't happen
        G5.util.showSpin( this.$el, {'cover':true} );

    }
});