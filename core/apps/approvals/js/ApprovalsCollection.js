/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
G5,
Backbone,
ApprovalsModel,
ApprovalsCollection:true
*/
ApprovalsCollection = Backbone.Collection.extend({

    model: ApprovalsModel,

    initialize: function (opts) {
        console.log("[INFO] ApprovalsCollection: Approval Collection initialized", this);
        this.initStatusRadios();

        this.options = opts;
    },

    loadData: function () {
        console.log("[INFO] ApprovalsCollection: loadData started");
        var thisCollection = this,
            params,
            dataReturned = $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_APPROVALS_LOAD_DATA,
                data: params,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data,
                        approvals;
                    console.log("[INFO] ApprovalsCollection: LoadData ajax call successfully returned this JSON object: ", data);

                    approvals = data;

                    thisCollection.add(approvals);

                    //notify listener
                    thisCollection.trigger('loadDataFinished', approvals);
                }
            });

        dataReturned.fail(function (jqXHR, textStatus) {
            console.log("[INFO] ApprovalsCollection: LoadData Request failed: " + textStatus);
        });
    },

    loadNominations: function (dateStart, dateEnd, nominationType, status, promotionName) {
        //var thisCollection = this,
            //params = {};
        console.log("[INFO] ApprovalsCollection: loadNominations started");
    },

    loadClaimDetailData: function () {
        var thisCollection = this,
            params = {};

        console.log("[INFO] ApprovalsCollection: loadClaimDetailData started");
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_APPROVALS_LOAD_CLAIM_DETAIL_DATA,
            data: params,
            success: function (serverResp) {
                //regular .ajax json object response
                var data = serverResp.data,
                    claims;
                console.log("[INFO] ApprovalsCollection: loadClaimDetailData ajax call successfully returned this JSON object: ", data);

                claims = data.claimIndex;

                //notify listener
                if (claims.length > 0) {
                    thisCollection.trigger('loadClaimDetailDataFinished', claims);
                } else {
                    console.log("[INFO] ApprovalsCollection: loadClaimDetailData ajax call returned no data, no claims to load: ", data);
                }
            }
        }).fail(function (jqXHR, textStatus) {
            console.log("[INFO] ApprovalsCollection: loadClaimDetailData Request failed: " + textStatus);
        });
    },

    translateData: function($attr){
        var that = this,
            data = {

            };


        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            data: data,
            url: G5.props.URL_JSON_APPROVALS_TRANSLATE_COMMENT + "?" + $attr,
            type: "POST",
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    comment = data.comment;

                if(serverResp.getFirstError()) return;//ERROR just return for now

                that.trigger('translated', comment);
                console.log('[INFO] PublicRecognitionModel - Recognition Translated');

                if(typeof callback === 'function') callback();
            }
        });
    },

    bindApprovalStatusSelects: function () {
        var $theSelects = $("select[name*='approvalStatusType']");
        if ($theSelects.size() > 1) {
            $theSelects.qtip({
                content : {
                    text: "<a class='approvalsToolTip'>Same for all</a>"
                },
                position : {
                    my : 'bottom bottomMiddle',
                    at : 'top topMiddle',
                    adjust : {
                        x : 0,
                        y : 0
                    },
                    container: $('body')
                },
                show : {
                    ready : false,
                    event : ''
                },
                hide : {
                    event : 'unfocus',
                    fixed : true,
                    delay : 200
                },
                style : {
                    padding : 0,
                    classes : 'ui-tooltip-shadow ui-tooltip-light approvals approvalsNotificationDateToolTip',
                    tip : {
                        corner : true,
                        width : 20,
                        height : 10
                    }
                },
                events : {
                    render: function (event, api) {
                        var theQtiLink = $('.approvalsToolTip');

                        theQtiLink.off().click(function (event) {
                            var $trigger = $(event.target),
                                $this = $trigger.closest(".qtip").qtip('api').get('position.target'),
                                theStatusForAll = $this.val();

                            $this.qtip("hide");

                            $theSelects.each(function (index) {
                                var $self = $(this),
                                    newStatusOption = $self.find("option[value='" + theStatusForAll + "']").val();

                                if (newStatusOption !== null && newStatusOption != 'undefined') {
                                    $self.val(theStatusForAll).trigger("change", false).qtip("hide");
                                } else {
                                    $self.val('pend').trigger("change").qtip("hide");
                                }
                            });
                        });
                    }
                }
            });
        }

        console.log("[INFO] ApprovalsCollection: bindApprovalStatusSelects called. Binding these elements: ", $theSelects);

        $theSelects.change(function (e, showtip) {
            var $this = $(this),
                $denailReasonSelect = $this.siblings("select[name*='denyPromotionApprovalOptionReasonType']"),
                $onHoldReasonSelect = $this.siblings("#onHoldReasonSelect");

            if ($this.val() == "deny") {
                $denailReasonSelect.removeAttr("disabled").show();
                $onHoldReasonSelect.attr("disabled", "disabled").hide();
            } else if ($this.val() == "hold") {
                $onHoldReasonSelect.removeAttr("disabled").show();
                $denailReasonSelect.attr("disabled", "disabled").hide();
            } else {
                $denailReasonSelect.attr("disabled", "disabled").show();
                $onHoldReasonSelect.attr("disabled", "disabled").hide();
            }

            if (showtip !== false) {
                $this.qtip("show");
            }

        });

        $theSelects.trigger("change", false);
    },

    bindStatusRadios: function() {
        //find them
        var that = this,
            $theRadios = $("input[name*='approvalStatusType']");

        //and bind them
        $theRadios.click(function() {
            var $tr = $(this).closest('tr');

            that.validateApprovals($tr);
        });

        // if "winner" is checked when the page loads, 'click' the radio to make sure the event handler above is run
        $theRadios.each(function() {
            if( $(this).val() == "winner" && $(this).prop('checked') === true ) {
                $(this).click();
            }
        });
    },
    bindSelectAllLinks: function(){
        var that = this,
            $selectAll = $(".approvalSearchWrapper .table-striped.table-bordered th a");

        $selectAll.click(function() {
            // this setTimeout waits for the selectAll* method in ApprovalsSearchModelView to finish its thing
            setTimeout(function() {
                that.validateApprovals();
            }, 1);
        });
    },
    initStatusRadios: function() {
        this.validateApprovals();
    },

    validateApprovals: function($tr) {
        var that = this;

        if( !$tr ) {
            $('#nominationApprovalTable tbody tr').each(function() {
                that.validateApprovals($(this));
            });
            return false;
        }

        var $radio = $tr.find("input[name*='approvalStatusType']:checked"),
            $awardInput = $tr.find("[name*='awardQuantity']"),
            $dateBtn = $tr.find(".awardDateIcon"),
            $clearDateBtn = $tr.find(".clearDate");

        if ($radio.val() == "pend" || $radio.val() == "non_winner") {
            $awardInput.attr("disabled", "disabled");
            $dateBtn.attr("disabled", "disabled"); //disable the datepicker
            $clearDateBtn.attr("disabled", "disabled"); //disable the datepicker clear button
            $dateBtn.parent().siblings("input").val("");
            $dateBtn.siblings("input").attr("disabled", "disabled"); //clear out the value
        } else {
            $awardInput.removeAttr("disabled");
            $dateBtn.removeAttr("disabled");
            $dateBtn.siblings("input").removeAttr("disabled");
            if($dateBtn.siblings('input').val()) {
                $clearDateBtn.removeAttr('disabled');
            }
        }
    },

    bindNotifcationDateToolTip: function () {
        var $theInputs = $("[name*='notificationDate']");
            if($theInputs.length > 1){
                $theInputs.qtip({
                    content: {
                        text: "<a class='approvalsToolTip'>Same for all</a>"
                    },
                    position : {
                        my : 'right leftMiddle',
                        at : 'left rightMiddle',
                        adjust : {
                            x : 0,
                            y : 0
                        },
                        container: $('body')
                    },
                    show : {
                        event : 'change',
                        ready : false
                    },
                    hide : {
                        event : 'unfocus',
                        fixed : true,
                        delay : 200
                    },
                    style : {
                        padding : 0,
                        classes : 'ui-tooltip-shadow ui-tooltip-light approvalsNotificationDateToolTip',
                        tip : {
                            corner : true,
                            width : 20,
                            height : 10
                        }
                    },
                    events : {
                        render : function (event, api) {
                            var $trigger = event.originalEvent,
                                theQtiLink = $('.approvalsToolTip');
                            theQtiLink.click(function () {
                                var theDateForAll = $($trigger.target).closest('.datepickerTrigger').data('datepicker').getDate(),
                                    $theDateInputs = $("[name*='notificationDate']");
                                $theDateInputs.not("[disabled]").each(function() {
                                    $(this).closest('.datepickerTrigger').data('datepicker').setDate(theDateForAll);
                                    $(this).closest('.datepickerTrigger').trigger('changeDate', theDateForAll);
                                });
                                $theDateInputs.qtip("hide");
                            });
                        }
                    }
                });
            }
    },

    bindApprovalNomAwardInputs: function () {
        var $theInputs = $("[name*='awardQuantity']");
        if($theInputs.length > 1){
        $theInputs.qtip({
                content: {
                    text: "<a class='approvalsToolTip'>Same for all</a>"
                },
                position : {
                    my : 'left rightMiddle',
                    at : 'right rightMiddle',
                    adjust : {
                        x : 0,
                        y : 0
                    },
                    container: $('body')
                },
                show : {
                    event : 'keyup',
                    ready : false
                },
                hide : {
                    event : 'unfocus',
                    fixed : true,
                    delay : 200
                },
                style : {
                    padding : 0,
                    classes : 'ui-tooltip-shadow ui-tooltip-light approvalsNotificationDateToolTip',
                    tip : {
                        corner : true,
                        width : 22,
                        height : 10
                    }
                },
                events : {
                    render : function (event, api) {
                        var $this = $(this),
                            $tipLink = $this.find(".approvalsToolTip"),
                            $target = $this.data('qtip').options.position.target,
                            thisVal = 0;

                        $tipLink.off().click(function () {
                            thisVal = parseInt($target.val(), 10);
                            if (!isNaN(thisVal)) {
                                $theInputs.not("[readonly],[disabled]", $target).val(thisVal);
                            }
                            $this.qtip("hide");
                        });
                    }
                }
            });
        }
    }
});