/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
ApprovalsClaimDetailModelView:true
*/
ApprovalsClaimDetailModelView = PageView.extend({
    //override super-class initialize function
    initialize: function(opts) {
        console.log('[INFO] ApprovalsClaimDetailModelView: ApprovalsClaimDetail model view initialized', this);

        //set the appname (getTpl() method uses this)
        this.appName = "approvals";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.bindApprovalStatusSelects();

        this.$claimForm = this.$el.find('#claimSubmissionForm');
        this.$claimTable = this.$claimForm.find('#claimProductInfoTable');

        // loop through each of the products .status <select> and force a change() event
        // this will make "hold" and "deny" statuses show their associated statusReason <select>
        this.$claimTable.find('.approvalStatusType').each(function() {
            $(this).change();
        });

        /*
         * Apparently there is no model tied to this page as of the 1.14 changes
         * Said changes were throwing an error when the .on listener was being added to a non-existent object
         * Commented this whole block out for a cleaner fix

        this.model = new ApprovalsCollection();

        this.model.loadClaimDetailData();
        this.model.on('loadClaimDetailDataFinished', function(claims) {
            var thisView = this;

            console.log('[INFO] ApprovalsClaimDetailModelView: data load finished', thisView);

            // render the view
            thisView.renderClaimDetail(null, claims);
            thisView.$el.find(".claimAction").trigger("change");
        }, this);
        */
    },

    events: {
        'focus .hasSelects select' : 'showSameForAllTip',
        'blur .hasSelects select' : 'hideSameForAllTip',
        'click .sameForAllTip a' : 'doSameForAllClick',

        // submit approvals
        'click  #submitButton' : 'submitApprovals',
        // cancel the whole page
        'click  #cancelButton' : 'cancelApprovals',
        'click #approvalsClaimsCancelDialogCancel' : function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    /*
     * It appears the dataForm is not being used

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
    */

    // same for all tooltip
    showSameForAllTip: function(e){
        var $el = $(e.target);

        // NO TIP: single pending product
        if( this.$claimTable.find('tbody tr').length <= 1 ){ return; }

        //error tip active? then do nothing (just let the error have the stage)
        if($el.closest('.validateme').hasClass('error') && $el.qtip().elements.tooltip.is(':visible')){
            return;
        }

        //have it already?
        if($el.data('qtip_sfa')) {
            $el.data('qtip_sfa').show();
            setTimeout(function() {
                $el.data('qtip_sfa').reposition();
            },1000);
            return;
        }

        $el.qtip({
            content: this.$el.find('#sameForAllTipTpl').clone().removeAttr('id'),
            position:{
                my:'left center',
                at:'right center',
                container: this.$claimForm,
                viewport: $(window)
            },
            show:{ready:true,event:false},
            hide:false,
            //only show the qtip once
            events:{hide:function(evt,api){$el.qtip('destroy');}},
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    width: 10,
                    height: 5
                }
            }
        });

        $el.data('qtip_sfa',$el.data('qtip')).removeData('qtip');

    },
    hideSameForAllTip: function(e){
        var $el = $(e.target);
        // allow some time for a click to occur on the link
        setTimeout(function(){
            if($el.data('qtip_sfa')) { $el.data('qtip_sfa').hide();}
        },100);
    },

    doSameForAllClick: function(e) {
        var $tar = $(e.target),
            // find the active input: the link is in a tooltip with a qtip
            // which has a reference to the triggering element (target)
            $actInp = $tar.closest('.ui-tooltip').data('qtip').elements.target,
            inpType = $actInp.parent().hasClass('statusReason') ? 'reason' : 'status',
            inpVal = $actInp.val();

        e.preventDefault();

        if( inpType == 'status' ) {
            this.$claimForm.find('.status select').val(inpVal).change();
        }
        else if( inpType == 'reason' ) {
            this.$claimForm.find('.status select').val( $actInp.closest('.hasSelects').find('.status select').val() ).change();
            this.$claimForm.find('.statusReason select').val(inpVal).blur();
        }
    },

    bindApprovalStatusSelects: function () {
        var self=this,
        $theSelects = $("select.approvalStatusType");

        /*
         * Binding properly up above in showSameForAllTip

        if ($theSelects.size() > 1) {
            $theSelects.qtip({
                content : {
                    text: self.$el.find("#sameForAllTipTpl").html()
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
        */

        console.log("[INFO] ApprovalsCollection: bindApprovalStatusSelects called. Binding these elements: ", $theSelects);

        $theSelects.change(function (e, showtip) {
            var $this = $(this),
                $td = $this.parents('td'),
                $reasonSelect = $td.find("."+$this.val()+"Reason select");

            if( $reasonSelect.length ) {
                $reasonSelect
                    .closest('.statusReason').show()
                    .siblings('.statusReason').hide();
                $reasonSelect.focus().blur();
            }
            else {
                $td.find('.statusReason').hide();
            }

            if (showtip !== false) {
                $this.qtip("show");
            }

            if($this.closest('.validateme').hasClass('error')) {
                G5.util.formValidate($this.closest('.validateme'));
                self.$claimForm.find('.validateme select').qtip('reposition');
                $this.focus();
            }

        });

        // $theSelects.trigger("change", false);
    },

    /*
     * This isn't being used (the call is commented out in the initialize method)

    renderClaimDetail: function(opts, claimArr) {
        console.log("[INFO] ApprovalsIndexModelView: renderClaimDetail called to render: ", claimArr);

        var //thisView = this,
            source = $("#productTable-Template").html(),
            template = Handlebars.compile(source),
            defaults = {
                $target:  this.$el.find("#claimProductInfoTable"),  // JQ object
                classe: null,       // array
                callback: null      // function
            },
            increment,
            loopValue,
            data,
            thisClaim,
            settings = opts ? _.defaults(opts, defaults) : defaults;

        //append the data from the JSON obj to the table
        if (settings.$target !== null) {
            for (increment = 0, loopValue = claimArr.length; increment < loopValue; increment += 1) {
                thisClaim = claimArr[increment];
                data = thisClaim;
                // data = {
                //     category: thisClaim.category,
                //     subcategory: thisClaim.subcategory,
                //     productName: thisClaim.productName,
                //     characteristics: thisClaim.characteristics,
                //     quantity: thisClaim.quantity,
                //     selectStatus: selectStatusTemplate
                // };

                settings.$target.append(template(data));
            }

            //bind events to <select> elmements with ".claimAction" class
            //when the action <select> value is 'denied', the claimReason <select> appears. Othewise, the claimReason <select> is removed.
            settings.$target.find(".claimAction").change(function() {
                var $this = $(this),
                    $claimReasonSelect = $this.parent().find(".claimReason");

                if ($this.val() == "deny") {
                    $claimReasonSelect.addClass("claimReasonActive").prop('disabled', false);
                }
                else {
                    $claimReasonSelect.removeClass("claimReasonActive").prop('disabled', true);
                }
            });

            this.setValuesFromServer();
        }
        else {
            console.log("[INFO] ApprovalsIndexModelView: renderClaimDetail called but $el is not defined. Target: ", settings.$target);
        }
    },
    */

    submitApprovals: function(e) {
        e.preventDefault();

        var $validate = this.$claimForm.find('.validateme:visible'),
            qtipOpts = {
                position: {
                    container : this.$claimForm,
                    viewport : $(window),
                    adjust : {
                        method : 'flipinvert'
                    }
                }
            };

        if( !G5.util.formValidate($validate, null, { qtipOpts: qtipOpts }) ) {
            // move any error qtips to a different container
            // this.$claimForm.find('.error select').qtip('option', 'position.container', this.$claimForm);
            return false;
        }

        this.$claimForm.submit();
    },

    cancelApprovals: function(e) {
        var $tar = $(e.currentTarget);
        e.preventDefault();
        if(!$tar.data('qtip')) {
            this.addConfirmTip($tar,
                this.$el.find('.approvalsClaimsCancelDialog')
            );
        }
    },

    //add confirm tooltip
    addConfirmTip: function($trig, cont){
        //attach qtip and show
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'left center',
                at: 'right center',
                container: this.$el,
                viewport: $('body'),
                adjust: {method:'shift none'}
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
});
