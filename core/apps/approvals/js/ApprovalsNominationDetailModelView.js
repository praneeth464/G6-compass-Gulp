/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
G5,
TemplateManager,
PageView,
ApprovalsCollection,
ApprovalsNominationDetailModelView:true
*/
ApprovalsNominationDetailModelView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts) {
        console.log('[INFO] ApprovalsNominationDetail: ApprovalsNominationDetail model view initialized', this);

        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = "approvals";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.model = new ApprovalsCollection();

        //is the text being translated?
        this.translatedText = opts.translatedText || false;

        thisView.bindStatusDropDown();

        this.bindAwardRangeInput();

        this.bindDatePickers();

        this.checkForServerErrors();

        this.checkAwardStatus();

        this.checkAppoverStatus();

        //stuff for the calculator
        thisView.bindCalcLinks();
        this.calcObj = this.options.preLoadedCalculator;
        this.savedCalcObj = null;
        this.savedCalcRows = [];

        if (this.calcObj !== undefined){

            if (this.calcObj.attributes.showPayTable){
                var that = this;
                $(".recogCalcTablePageLink").show();
                that.showRecogCalcPayout(this);
            }
        }

        this.updateBudgetData();

        this.checkForServerErrors();

        this.model.on('translated', function(comment){this.updateTranslatedText(comment);},this);
    },

    events:{
        "keyup #awardPointsInput": "updateBudgetData",
        "click #submitButton": "validateForm",
        "click .translateTextLink": "doTranslate",
        "click #recogCalcPayoutTableLink" : "showRecogCalcPayout"
        //"change .approvalNominationStatus": "updateReasonSelect"
    },

    bindStatusDropDown: function() {
        console.log('[INFO] ApprovalsSearchModelView: bindStatusDropDown called. Bound change event of: ', this);

        var dropDown = $(".approvalNominationStatus"),
        $claimReasonSelect = $("#approverActions").find(".claimReasonNomDetails"),
        $holdReasonSelect = $("#approverActions").find(".holdReasonNomDetails"),
        $approvedActionElms = $(".form-horizontal").find(".approverAction"),
        $submitButton = $("#submitButton"),
        $awardInput = $(".calcLink").siblings("input");

        //nomination detials and recognition details do different things. Based on class of the select element
        if (dropDown.hasClass("nominationDetial")){
            dropDown.change(function() {
                var $this = $(this); // caching JQ Obj

                if ($this.val() == "winner"){
                    $approvedActionElms.find("#awardPointsInput").removeAttr("disabled").removeClass("approverActionNotActive");
                }else if ($this.val() == "non_winner"){
                    $approvedActionElms.find("#awardPointsInput").attr("disabled", "disabled").parent().removeClass("approverActionNotActive");
                }else{
                    $approvedActionElms.find("#awardPointsInput").attr("disabled", "disabled").parent().addClass("approverActionNotActive");
                }
            });

        }else{
            var selectedVal = dropDown.children(":selected").attr("value");
            if (selectedVal == "deny"){
                $claimReasonSelect.removeAttr("disabled");
                $submitButton.removeAttr("disabled");
            }

            dropDown.change(function() {
                var $this = $(this); // caching JQ Obj

                if ($this.val() == "deny"){
                    $claimReasonSelect.removeAttr("disabled").show().closest(".control-group").show();
                    $holdReasonSelect.attr("disabled", "disabled").closest(".control-group").hide();
                    $submitButton.removeAttr("disabled");
                }else if($this.val() == "hold"){
                    $claimReasonSelect.closest(".control-group").hide();
                    $holdReasonSelect.removeAttr("disabled").closest(".control-group").show();
                }else{
                    $claimReasonSelect.attr("disabled", "disabled").show().closest(".control-group").show();
                    $holdReasonSelect.attr("disabled", "disabled").closest(".control-group").hide();
                    if ($awardInput.val() !== "0"){
                        $submitButton.removeAttr("disabled");
                    }else{
                        $submitButton.attr("disabled", "disabled");
                    }
                }
            });
        }

        dropDown.trigger("change");
    },

    bindAwardRangeInput: function() {
        var $theInput = $("#awardPointsInput");
        var $saveButton = $("#submitButton");
        var $inputWrapper = $theInput.closest("div");
        var maxAward = parseInt($theInput.attr("data-range-max"),10);
        var minAward = parseInt($theInput.attr("data-range-min"),10);

        var is_int = function(value){
            if((parseFloat(value) == parseInt(value,10)) && !isNaN(value)){
                return true;
            } else {
                return false;
            }
        };

        $theInput.keyup(function() {
            if ($theInput.val() > maxAward || $theInput.val() < minAward || !is_int($theInput.val())){
                $theInput.addClass("error");
                $saveButton.attr('disabled', 'disabled');
                $inputWrapper.addClass("error");
            }else if ($theInput.hasClass("error")){
                $theInput.removeClass("error");
                $inputWrapper.removeClass("error");
                $saveButton.removeAttr('disabled');
            }else if ($saveButton.attr("disabled") === "disabled"){
                $saveButton.removeAttr('disabled');
            }
        });
    },

    bindDatePickers: function() {
        this.$el.find('.datepickerTrigger').each(function() {
            var $this = $(this);
            if (!$this.hasClass("showTodayBtn")){
                $this.datepicker({
                    todayBtn: false //don't want no today button
                });
            }else{
                $this.datepicker({
                    todayBtn: true //want today button
                });
            }
        });
    },

    bindCalcLinks: function() {
        var $calcLinks = $(".calcLink");
        var that = this;

        $calcLinks.click(function(event) {
            that.doViewRecognitionCalculator(event);
        });
    },

    doViewRecognitionCalculator: function(event) {
        var that = this,
            tplName = 'calculatorTemplate',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'recognition/tpl/',
            theWeightLabel,
            theScoreLabel,
            thisQtip,
            $anchor = $(event.target),
            // functions
            getCriteriaElements,
            bindTheSelects,
            selectsAllReady,
            bindCloseButton;

        getCriteriaElements = function() {
            var theCriteriaElement = "";

            for (var i = 0; i < that.calcObj.criteria.length; i++) {
                var thisCriteriaRow = that.calcObj.criteria[i],
                thisRowLabel = thisCriteriaRow.label,
                thisRowId = thisCriteriaRow.id,
                theCriteriaWrapper = "<div class='recCalcCriteriaWrapper' data-criteria-id='" + thisRowId + "'>",
                thisRatingSelectInner = [],
                // filling the text of first option later from a TPL element (should do the whole select element in handlebars, but this is calc and its not worth the effort ATM)
                thisRatingSelectOutter = "<select class='recogCalcRatingSelect'><option value='undefined' class='msgSelRatingTarget'>[dynamic js]</option>";

                for (var j = 0; j < thisCriteriaRow.ratings.length; j++) {
                    var thisRatingOption = thisCriteriaRow.ratings[j];

                    thisRatingSelectInner.push("<option value='" + thisRatingOption.value + "' data-ratingId='" + thisRatingOption.id + "'>" + thisRatingOption.label + "</option>");
                }

                //close up the select element
                thisRatingSelectOutter += thisRatingSelectInner + "</select>";

                theCriteriaElement += theCriteriaWrapper + "<label>" + thisRowLabel + "</label>" + thisRatingSelectOutter + "<span id='criteriaWeightElm' class='criteriaWeightElm'></span><span id='criteriaScoreElm' class='criteriaScoreElm'></span></div>";
            }

            return theCriteriaElement;
        };

        bindTheSelects = function(theQtip) {
            var $theSelects = theQtip.find(".recogCalcRatingSelect");

            $theSelects.change(function() {
                if (selectsAllReady($theSelects)){
                    that.doSendCalculatorRatings($theSelects, theQtip);
                }
            });
        };

        selectsAllReady = function($elms) {
            var isReady = true;

            $elms.each(function(){
                var $this = $(this);

                if ($this.val() === "undefined" || $this.val() === undefined){
                    isReady = false;
                }
            });

            return isReady;
        };

        bindCloseButton = function(theQtip) {
            var $theCloseBtn = theQtip.find("#recogCalcCloseBtn");

            $theCloseBtn.click(function() {
               theQtip.qtip("hide");

            });
        };

        if (this.calcObj.attributes.hasWeight){
            theWeightLabel = this.calcObj.attributes.weightLabel;
        }else{
            theWeightLabel = "";
        }

        if (this.calcObj.attributes.hasScore){
            theScoreLabel =  this.calcObj.attributes.scoreLabel;
        }else{
            theScoreLabel = "";
        }

        var renderedTemplate = "";

        $anchor.qtip({
            content:{
                text: 'Cannot find content'
            },
            position:{
                my: 'top center',
                at: 'bottom center',
                adjust: {
                    x: 100,
                    y: 0
                },
                container: $('body')
            },
            show:{
                ready:false,
                event: false
            },
            hide:{
                event: false,
                fixed:true,
                delay:200
            },
            style:{
                padding: 0,
                classes:'ui-tooltip-shadow ui-tooltip-light recogCalcTipWrapper approvalCalcTipWrapper',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10,
                    offset: -100
                }
            },
            events:{
                show:function(event,api){
                    var $this = $(this);
                    bindTheSelects($this);
                    bindCloseButton($this);
                    thisQtip = $this;
                },
                visible: function() {
                    that.doRenderPreviousCalcInfo($anchor, thisQtip);
                },
                hide:function(){
                    $("#recogCalcPayoutTableLink").qtip("hide");
                }
            }
        });

        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        TemplateManager.get(tplName, function(tpl){
            var data = {
                weightLabel: theWeightLabel,
                scoreLabel: theScoreLabel,
                criteriaDiv: getCriteriaElements(),
                hasWeight: that.calcObj.attributes.hasWeight,
                hasScore: that.calcObj.attributes.hasScore
            };
            renderedTemplate = $(tpl(data).toString());
            renderedTemplate.find('.msgSelRatingTarget').html(renderedTemplate.find('.msgSelectRatingInstruction').html());


            $anchor.qtip('option', 'content.text', renderedTemplate);
            $anchor.qtip("show");
            //Show the user the Calculator.
            $("#recogCalcPayoutTableLink").show();
            that.showRecogCalcPayout($("#recogCalcPayoutTableLink"));
        }, tplUrl);
    },

    doSendCalculatorRatings: function($theSelects, theQtip) {
        var thisScope = this;

        var getCriteriaInfo = function() {
            var theObj = {};

            $theSelects.each(function(i) {
                var $this = $(this);
                var thisRatingValue = parseInt($this.val(), 10);
                var thisCriteriaId = parseInt($this.parent().attr("data-criteria-id"), 10);

                var thisCriteriaObj = {
                    criteriaRating: thisRatingValue,
                    criteriaId: thisCriteriaId
                };

                theObj['criteria['+i+'].criteriaRating'] = thisRatingValue;
                theObj['criteria['+i+'].criteriaId'] = thisCriteriaId;

            });

            return theObj;
        };

        var theData = {
            promotionId: parseInt($("#promotionId").val(),10),
            participantId: parseInt($("#participantId").val(),10)
        };

        theData = $.extend({}, theData, getCriteriaInfo());

        var dataSent = $.ajax({
                type: "POST",
                dataType: 'g5json',
                url: G5.props.URL_JSON_SEND_RECOGNITION_CALCULATOR_INFO,
                 data: theData,
                 beforeSend: function(){
                    console.log( "[INFO] AwardeeCollectionView: doSendCalculatorRatings ajax post starting. Sending this: ", theData);
                 },
                success: function(serverResp){
                    console.log( "[INFO] AwardeeCollectionView: doSendCalculatorRatings ajax post sucess: ", serverResp);
                    thisScope.doUpdateRecogCalcValues(serverResp.data, theQtip, false);
                }
            });

            dataSent.fail(function(jqXHR, textStatus) {
                console.log( "[INFO] AwardeeCollectionView: doSendCalculatorRatings ajax post failed: " + textStatus, jqXHR );
            });
    },

    doUpdateRecogCalcValues: function(data, theQtip, hasPreviousData) {
        var that = this,
        $theCalcElm = theQtip.find("#recogCalcInnerWrapper"),
        scorElmTplName = 'recognitionCalculatorScoreWrapperTemplate',
        scorElmTplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'recognition/tpl/',
        $theCalc = theQtip.find("#recogCalcScoreWrapper"),
        rangedElm = "",
        theFixedAmount = "",
        theTotalScore,
        theAwardLevel,
        savedData = data,
        // functions
        hasRangedAward,
        hasFixedAward,
        hasAwardLevel,
        is_int,
        bindAwardInput,
        bindSaveButton,
        renderPreviousRatingSeletions,
        allCriteriaSelected,
        theData;

        hasRangedAward = function() {
            var hasRanged = false;

            if (that.calcObj.attributes.awardType === "range"){
                hasRanged = true;
                rangedElm = "<span>(" + data.awardRange.min + " - " + data.awardRange.max + ")</span><input type='text' data-range-max='" + data.awardRange.max + "' data-range-min='" + data.awardRange.min + "'>";
            }

            return hasRanged;
        };

        hasFixedAward = function() {
            var hasFixed = false;

            if (that.calcObj.attributes.awardType === "fixed"){
                theFixedAmount = data.fixedAward;
                hasFixed = true;
            }

            return hasFixed;
        };

        hasAwardLevel = function() {
            var hasAwardLevel = false;

            if (that.calcObj.attributes.awardType === "merchlevel"){
                theAwardLevel = data.awardLevel.name + " (" + data.awardLevel.value + ")" + "<input type='hidden' id='calcAwardLevelId' value='" + data.awardLevel.value + "'>";
                hasAwardLevel = true;
            }

            return hasAwardLevel;
        };

        is_int = function(value){
            if((parseFloat(value) == parseInt(value, 10)) && !isNaN(value)){
                return true;
            } else {
                return false;
            }
        };

        bindAwardInput = function() {
            var $theInput = theQtip.find("input"),
            $saveButton = theQtip.find("button"),
            $rangeText = $theInput.closest("p"),
            maxAward = parseInt($theInput.attr("data-range-max"), 10),
            minAward = parseInt($theInput.attr("data-range-min"), 10);

            $theInput.off(); //remove any previous bindings

            if (hasRangedAward()){
                $theInput.keyup(function() {
                    if ($theInput.val() > maxAward || $theInput.val() < minAward || !is_int($theInput.val())){
                        $theInput.addClass("input-error");
                        $saveButton.attr('disabled', 'disabled');
                        $rangeText.addClass("range-error");
                    }else if ($theInput.hasClass("input-error")){
                        $theInput.removeClass("input-error");
                        $saveButton.removeAttr('disabled');
                        $rangeText.removeClass("range-error");
                    }else if ($saveButton.attr("disabled") === "disabled"){
                        $saveButton.removeAttr('disabled');
                    }
                });
            }else{
                $saveButton.removeAttr('disabled');
            }
        };

        bindSaveButton = function() {
            var $theButton = theQtip.find("button");
            $theButton.off(); //unbind any previous events

            $theButton.click(function() {
                if (allCriteriaSelected()){
                    that.doSaveCalculatedAward(savedData, theQtip);
                }
            });
        };

        renderPreviousRatingSeletions = function(){
            for (var i = 0; i < data.criteria.length; i++) {
                var thisCriteria = data.criteria[i];

                $(".recCalcCriteriaWrapper[data-criteria-id='" + thisCriteria.criteriaId + "']").find("select").val(thisCriteria.criteriaRating);
            }
        };

        allCriteriaSelected = function() {
            var allSelected = true;
            var $criteriaSelects = theQtip.find("select");

            $criteriaSelects.each(function() {
                var $theSelect = $(this);

                if ($theSelect.val() === "undefined"){
                    allSelected = false;
                    $theSelect.addClass("input-error");
                }else{
                    $theSelect.removeClass("input-error");
                }
            });

            return allSelected;
        };

        theData = {
            isRange: hasRangedAward(),
            awardRange: rangedElm,
            totalScore: data.totalScore,
            hasFixed: hasFixedAward(),
            hasAwardLevel: hasAwardLevel(),
            awardLevel: theAwardLevel,
            fixedAmount: theFixedAmount
        };


        for (var i = data.criteria.length - 1; i >= 0; i--) {
            var theCriteria = data.criteria[i];
            var $theRow = $theCalcElm.find("div[data-criteria-id='" + theCriteria.criteriaId + "']");

            if (that.calcObj.attributes.hasWeight){
                $theRow.find("#criteriaWeightElm").html(theCriteria.criteriaWeight);
            }

            if (that.calcObj.attributes.hasScore){
                $theRow.find("#criteriaScoreElm").html(theCriteria.criteriaScore);
            }
        }

        //check to see if score template is there. If not, make it and populate it. If it is, just populate.
        if (!$theCalc.hasClass("recogCalcScoreWrapper")) {
            TemplateManager.get(scorElmTplName, function(tpl){
                theQtip.find("#recogCalcWrapper").append(tpl(theData));
                bindAwardInput();
                bindSaveButton();

                if (hasPreviousData){
                    renderPreviousRatingSeletions();
                }
            }, scorElmTplUrl);
        }else{
            var startTxt, selectAmtText;

            if (theData.isRange){
                startTxt = $theCalc.find("p").text();
                selectAmtText = startTxt.substring(0, startTxt.indexOf("("));
                $theCalc.find("p").html(selectAmtText + " " + theData.awardRange); //update the range award
                bindAwardInput();
                bindSaveButton();
            }else if(theData.hasFixed){
                startTxt = $theCalc.find("p").text();
                selectAmtText = startTxt.substring(0, startTxt.indexOf(":"));
                bindSaveButton();

                $theCalc.find("p").html(selectAmtText + ": " + theData.fixedAmount); //update the fixed award
            }

            $theCalc.find("#recogCalcTotal").html(data.totalScore); //update total score

        }

    },

    doSaveCalculatedAward: function(data, theQtip) {
        var theCalcAwardObj = data,
            $anchor = $(theQtip.qtip('api').options.position.target),
            $thisRow = $anchor.closest("tr"),
            $awardElm = $("#awardElm"),
            $awardFormElm = $("#awardFormElm"),
            conversionRate = parseFloat($thisRow.find("#conversionRate").val());

        if (this.calcObj.attributes.awardType === "range"){
            theCalcAwardObj.awardedAmount = theQtip.find("input").val();
        }else if (this.calcObj.attributes.awardType === "fixed"){
            theCalcAwardObj.awardedAmount = data.fixedAward;
        }else{
            theCalcAwardObj.awardedAmount = theQtip.find("#calcAwardLevelId").val();
        }

        this.savedCalcObj = theCalcAwardObj;

        console.log( "[INFO] AwardeeCollectionView: doSaveCalculatedAward: saved this calcInfo: ", this.savedCalcObj);


        //if the calc obj is not a merchlevel award, do the normal save
        if (this.calcObj.attributes.awardType !== "merchlevel"){
            $anchor.siblings("[name='approvalsRecognitionForm.awardAmount']").val(theCalcAwardObj.awardedAmount);
            $anchor.text(theCalcAwardObj.awardedAmount + " Points");
        }else{
            $anchor.siblings("[name='approvalsRecognitionForm.awardLevelId']").val(theCalcAwardObj.awardLevel.id);
            $anchor.text(theCalcAwardObj.awardLevel.name + " (" + theCalcAwardObj.awardLevel.value + ")");
        }
        $awardElm.text(theCalcAwardObj.totalScore);
        $awardFormElm.val(theCalcAwardObj.totalScore);

        $thisRow.find(".calcDeduction").text(Math.round(parseInt(theCalcAwardObj.awardedAmount * conversionRate, 10)) + " Points");

        //not a shared data-set. Add it's personal row info to global var
        $thisRow.attr("data-shared-calc-info", "false");
        this.savedCalcRows[$thisRow.attr("data-participant-cid")] = data;

        this.setAwardPointsForCalc($anchor, theCalcAwardObj);

        theQtip.qtip("hide");

        this.updateBudgetData(null, true);

        this.updateAwardStatus("true");

        this.checkAwardStatus();
    },

    setAwardPointsForCalc: function($el, calcData) {
        var pax = $el,
            $paxPar = $el.parent(),
            critLength = calcData.criteria.length,
            i = 0;

        pax.siblings("[name*='calculatorResultBeans']").remove(); //clear our previous hidden inputs
        pax.siblings("[name*='approvalsRecognitionForm.awardAmount']").remove();


        $paxPar.append("<input type='hidden' name='approvalsRecognitionForm.awardAmount' value='" + calcData.awardedAmount + " '>");
        for (i = 0; i < critLength; i++) {
            var thisCriteria = calcData.criteria[i];

            $paxPar.append("<input type='hidden' name='calculatorResultBeans[" + [i] + "].criteriaId' value='" + thisCriteria.criteriaId + " '>" + "<input type='hidden' name='calculatorResultBeans[" + [i] + "].ratingId' value='" + thisCriteria.criteriaRatingId  + " '>" + "<input type='hidden' name='calculatorResultBeans[" + [i] + "].criteriaRating' value='" + parseInt(thisCriteria.criteriaRating,10) + "'>");
        }

    },

    doSameForAllCalc: function($original, $theToolTip) {
        var that = this;

        var $theRows = $(".participant-item").not($original);

        $theRows.each(function() {
            var $this = $(this),
            $theInput = $this.find("[name*='approvalsRecognitionForm.awardAmount']"),
            conversionRate = parseFloat($this.find("#conversionRate").val());

            $original.attr("data-shared-calc-info", "true");

            if (that.calcObj.attributes.awardType !== "merchlevel"){
                $theInput.siblings(".calcLink").text(that.savedCalcObj.awardedAmount);
            }else{
                $theInput.siblings(".calcLink").text(that.savedCalcObj.awardLevel.name + " (" + that.savedCalcObj.awardLevel.value + ")");
            }

            $this.attr("data-shared-calc-info", "true");
            $theInput.val(that.savedCalcObj.awardedAmount);


            $this.find(".calcDeduction").text(Math.round(parseInt(that.savedCalcObj.awardedAmount * conversionRate, 10)) + " Points");

            $theToolTip.parent(".ui-tooltip-content").parent().qtip("hide");

        });

        this.updateBudgetData();
    },

    doRenderPreviousCalcInfo: function($theRow, theQtip) {

        $(".calcLink").siblings().filter("[name*='].criteriaId']").length;


        if ($theRow.attr("data-shared-calc-info") === "true" ){
            console.log("has shared calc info: ", this.savedCalcObj);
            this.doUpdateRecogCalcValues(this.savedCalcObj, theQtip, true);
        }else if (this.savedCalcRows[$theRow.attr("data-participant-cid")]){
            console.log("has saved calc info: ", this.savedCalcRows[$theRow.attr("data-participant-cid")]);
            this.doUpdateRecogCalcValues(this.savedCalcRows[$theRow.attr("data-participant-cid")], theQtip, true);
        }else if($theRow.siblings().filter("[name*='].criteriaId']").length > 0){
            this.doRenderRecogCalcValuesOld($theRow, theQtip);
        }
    },

    doRenderRecogCalcValuesOld: function($theRow, theQtip) {
        var theRecipCalcNameRaw = "claimRecipientFormBeans[0].calculatorResultBeans",
            finalSelect;

        $theRow.siblings().filter("[name*='" + theRecipCalcNameRaw + "']").filter("[name*='criteriaId']").each(function() {
            var $this = $(this),
                thisCriteriaId = parseInt($this.val(),10),
                thisInputName = $this.attr("name"),
                thisRatingIdName = thisInputName.substr(0, thisInputName.indexOf('.criteriaId')),
                thisRatingId = parseInt($("[name='" + thisRatingIdName + ".ratingId']").val(),10),
                test = theQtip.find(".recCalcCriteriaWrapper"),
                theRatingSelectPar = theQtip.find(".recCalcCriteriaWrapper").filter("[data-criteria-id='" + thisCriteriaId + "']"),
                theRatingSelect = theRatingSelectPar.find("select"),
                theRatingOption = $(theRatingSelect).find("[data-ratingid='" + thisRatingId + "']");
            theRatingSelect.val(theRatingOption.val());
            finalSelect = theRatingSelect;
        });

        if (finalSelect){
            finalSelect.change();
        }

    },

    showRecogCalcPayout: function(anchor) {
        var that = this,
        $theAnchor = $(anchor.target || anchor),
        tplName = 'recognitionCalculatorPayoutGridTemplate',
        tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'recognition/tpl/',
        finishedTemplate = "";

        if( anchor.preventDefault ) {
            anchor.preventDefault();
        }

        var populateGrid = function($theQtip) {
            console.log(that.calcObj.payTable.rows);

            $theQtip.find("tbody").empty();
            for (var i = 0; i < that.calcObj.payTable.rows.length; i++) {
                var thisPayoutRow = that.calcObj.payTable.rows[i];

                $theQtip.find("tbody").append("<tr><td>" + thisPayoutRow.score + "</td><td>" + thisPayoutRow.payout + "</td></tr>");
            }

        };

        var bindCloseButton = function($this) {
            var $theButton = $this.find("#recogCalcPayoutCloseBtn");
            $theButton.click(function() {
                $this.qtip("hide");
            });
        };

        if( $theAnchor.data('qtip') ) {
            $theAnchor.qtip('show');
            return;
        }

        $theAnchor.qtip({
            content:{
                text: 'Cannot find content'
            },
            position:{
                my: 'bottom center',
                at: 'top center',
                adjust: {
                    x: 0,
                    y: 0
                },
                container: $('body'),
                //Used to fix qtip position in in ie7&8.
                effect:false,
                viewport: false
            },
            show:{
                ready:false,
                event: false
            },
            hide:{
                event: false,
                fixed:true,
                delay:200
            },
            style:{
                padding: 0,
                classes:'ui-tooltip-shadow ui-tooltip-light recogCalcPayoutTableWrapper',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            events:{
                render:function(event,api){
                    var $this = $(this);
                    populateGrid($this);
                    bindCloseButton($this);
                }
            }
        });

        TemplateManager.get(tplName, function(tpl){
            finishedTemplate = tpl().toString();
            $theAnchor.qtip('option', 'content.text', finishedTemplate);
            $theAnchor.qtip("show");
        }, tplUrl);

    },

    updateBudgetData: function(event, fromCalc) {

        console.log('[INFO] ApprovalsNominationDetailModelView: updateBudgetData called');

        //general vars need for later budget calculations
        var availableBudget = parseInt($("#availableBudget").text(), 10); //if no table exists, returns NaN

        //check if there's a budget available
        if (isNaN(availableBudget) || availableBudget === null){
            console.log('[INFO] ApprovalsNominationDetailModelView: updateBudgetData: No budget to calculate');

        }else{

            //vars needed for either version of the calculation
            var budgetDeduction = 0,
            $budgetDeductionElm = $("#budgetDeductionElm"),
            $remainingBudgetElm = $("#remainingBudgetElm"),
            theVal;

            if (!fromCalc){

                //make sure the value is a number, otherwise just add 0
                $("#awardPointsInput").each( function(){
                   var $this = $(this),
                   theVal = parseInt($this.val(), 10),
                   participantNumber = $this.closest('.control-group').find("#participantNumber").val(),
                   theCalulatedVal = Math.round(theVal * parseFloat(participantNumber));

                   if (!participantNumber){
                        participantNumber = 1;
                        theCalulatedVal = Math.round(theVal * parseFloat(participantNumber));
                   }

                   if ( !isNaN(theVal)  ){
                        budgetDeduction += theCalulatedVal;
                   }else{
                        budgetDeduction += 0;
                   }

                });
            }else{
                theVal = parseInt(this.savedCalcObj.awardedAmount,10);
                var participantNumber = $("#participantNumber").val(),
                    theCalulatedVal = Math.round(theVal * parseFloat(participantNumber));

                if (!participantNumber){
                    participantNumber = 1;
                    theCalulatedVal = Math.round(theVal * parseFloat(participantNumber));
                }

                if ( !isNaN(theVal)  ){
                    budgetDeduction += theCalulatedVal;
                }else{
                    budgetDeduction += 0;
                }
            }

            //calualte remainingBudget
            var remainingBudget = availableBudget - budgetDeduction;

            //append the new values to the elements
            $budgetDeductionElm.html(budgetDeduction);
            $remainingBudgetElm.html(remainingBudget);
        }
    },

    /*updateReasonSelect: function() {
        var $theDropdown = $(".approvalNominationStatus"),
        $deniedReasons = $("#Denied_Reason"),
        $approvedReasons = $("#Approved_Reason"),
        $pendingReasons = $("#Pending_Reason");

        if ($theDropdown.val() === "Approved"){
            $deniedReasons.addClass("hidden");
            $approvedReasons.removeClass("hidden");
            $pendingReasons.addClass("hidden");
        }else if($theDropdown.val() === "Denied"){
            $deniedReasons.removeClass("hidden");
            $approvedReasons.addClass("hidden");
            $pendingReasons.addClass("hidden");
        }else{
            $deniedReasons.addClass("hidden");
            $approvedReasons.addClass("hidden");
            $pendingReasons.removeClass("hidden");
        }
    },*/

    updateAwardStatus: function(status) {
        $("#hasAward").val(status);
    },

    checkAwardStatus: function() {
        //if the recip has already been awarded, enable save button.
        if ($("#hasAward").val() === "true"){
            $("#submitButton").removeAttr("disabled");
            // commenting this because we need the keyup validation for recognition range awards.  doesn't seem to affect the calculator
            //$("#awardPointsInput").off(); //remove onkeyup event binding because it disables the save button
        }
    },

    checkAppoverStatus: function() {
        //if page is viewed by approver, enable the save button.
        if ($("#scoredByApprover").val() === "false"){
            $("#submitButton").removeAttr("disabled");
            // commenting this because we need the keyup validation for recognition range awards.  doesn't seem to affect the calculator
          // $("#awardPointsInput").off(); //remove onkeyup event binding because it disables the save button
        }
    },

    //events- translate text
    doTranslate: function(e){
        var $tar = $(e.target),
            $attr = $tar.attr('href');

        this.model.translateData($attr);
        e.preventDefault();
        $tar.replaceWith('<span class="translateLinkDisabled">'+$tar.text()+'</span>');
    },
    updateTranslatedText: function(comment){
        var tText = comment;

        this.$el.find('.comment-text').html(tText);

    },

    validateForm: function(event) {
        G5.util.showSpin(this.$el, {cover:true});
        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        if ($("#nominationDetails").hasClass("recognitionDetails") && $(".approvalNominationStatus").val() === "non_winner"){
            if (!G5.util.formValidate($(".validateme"))){
                G5.util.showSpin(this.$el, {cover:true});
                return false;
            }else{
                $("#approvalsNominationDetailWrapper").find("form").submit();
            }
        }else{
            $("#approvalsNominationDetailWrapper").find("form").submit();
        }
    },

    checkForServerErrors: function() {
        if ($("#serverReturnedErrored").val() === "true"){
            $("#approvalErrorBlock").slideDown('fast'); //show error block
        }
    } //checkForServerErrors
});