/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
TemplateManager,
PaginationView,
ApprovalsPageClaimsModel,
ApprovalsPageClaimsView:true
*/
ApprovalsPageClaimsView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {

        //set the appname (getTpl() method uses this)
        this.appName = 'approvals';

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass ModuleView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        // create the model
        this.claimsModel = new ApprovalsPageClaimsModel({}, {claimsJson : opts.claimsJson});

        // set up event listeners
        this.setupEvents();

        // store a couple elements in the view for later reference
        this.$form = this.$el.find('#approvalsClaimsForm');
        this.$toggle = this.$el.find('#approvalsClaimsFormToggle');
        this.$promotion = this.$el.find('#approvalsPageClaimsPromotion');

        // check to see if the form has all the criteria fields prefilled
        if( this.validateForm(this.$form, true) ) {
            this.prefilledFormData = this.$form.serialize();
        }

        // set up the datepickers
        this.$form.find('.datepickerTrigger').datepicker();

        // set up the collapsibles
        this.$form.collapse({toggle:false});
        this.$toggle.collapse({toggle:false});

        // spin while waiting...
        G5.util.showSpin(this.$promotion);
        // ...to load the data into the model
        this.claimsModel.loadClaimsData(this.prefilledFormData || null);
    },

    events: {
        // submit parameters form
        'click #approvalsClaimsSubmit' : 'submitParamsForm',

        // handle sorting
        'click .sortable' : 'handleTableSort',

        // handle status selector
        'change select.status' : 'handleStatusChange',
        'change select.statusReason' : 'handleStatusReasonChange',
        'focus td select' : 'showSameForAllTip',
        'blur td select' : 'hideSameForAllTip',
        'click .sameForAllTip a' : 'doSameForAllClick',

        // submit approvals
        'click  #claimsSubmitBtn' : 'submitApprovals',
        // cancel the whole page
        'click  #claimsCancelBtn' : 'cancelApprovals',
        'click #approvalsClaimsCancelDialogCancel' : function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    setupEvents: function() {
        this.on('renderDone', this.postRender, this);

        this.claimsModel.on('claimsDataProcessed', this.setupClaims, this);
        this.claimsModel.on('noFormDataPassed', this.renderEmpty, this);
        this.claimsModel.on('noClaimsDataToProcess', this.renderNoData, this);
    },

    setupClaims: function() {
        // process the survey data
        // ...nothing for now...

        // initialize the tab content views
        this.render();
    },

    render: function(opts) {
        var that = this,
            settings = {
                empty: false,
                noData: false
            };

        console.log('into the render');

        settings = _.extend(settings,opts);

        TemplateManager.get('approvalsPageClaimsTpl', function(tpl,vars,subTpls) {
            that.subTpls = subTpls;

            // hide the spinner
            G5.util.hideSpin(that.$el);

            // if we are rendering empty or no data, we make sure the params form is visible
            if( settings.empty === true || settings.noData === true ) {
                that.$form.collapse('show');
                that.$toggle.collapse('hide');

                // if we are rendering empty, we hide the lower spinner and stop the rendering process here
                if( settings.empty === true ) {
                    G5.util.hideSpin(that.$promotion);
                    return false;
                }
            }
            // otherwise, hide the parameters form
            else {
                that.$form.collapse('hide');
                that.$toggle.collapse('show');
            }

            // if the parameters include a 'closed' claimStatus, we flag the formActions for hiding
            if( that.claimsModel.get('parameters').claimStatus == 'closed' ) {
                that.claimsModel.set('_hideFormActions', true);
            }
            // otherwise, check to see if no products in each of the claims are pending OR held (.length of BOTH is 0); if so we again flag the formActions for hiding
                // _.pluck all the products from the claims.results array
                // _.flatten into a single array of product objects
                // _.where to find all the products with a 'pend' status (and do the same for 'hold' status)
            else if( _.where( _.flatten( _.pluck(that.claimsModel.get('promotion').claims.results, 'products') ), {status: 'pend'}).length <= 0 && _.where( _.flatten( _.pluck(that.claimsModel.get('promotion').claims.results, 'products') ), {status: 'hold'}).length <= 0 ) {
                that.claimsModel.set('_hideFormActions', true);
            }
            else {
                that.claimsModel.set('_hideFormActions', false);
            }

            // loop through all the products and mark whether or not to show the select boxes ('pend' and 'hold' statuses)
            _.each( _.flatten(_.pluck(that.claimsModel.get('promotion').claims.results, 'products')), function(prod) {
                if( prod.status == 'pend' || prod.status == 'hold' ) {
                    prod._showSelects = true;
                }
            });

            // render the page full o' data
            // console.log(_.extend({}, {cm:that.options.cm}, that.claimsModel.toJSON()));
            that.$promotion.html( tpl(_.extend({}, {cm:that.options.cm}, that.claimsModel.toJSON())) );

            that.$claimForm = that.$promotion.find('#claimSubmissionForm');
            that.$table = that.$promotion.find('.table');

            that.trigger('renderDone');
        });
    },

    renderNoData: function() {
        this.render({noData:true});
    },

    renderEmpty: function() {
        this.render({empty:true});
    },

    postRender: function() {
        // it proved to be too difficult (impossible?) to render the states of each select in the Handlebars template
        this.$table.find('select.status').each(function() {
            var $status = $(this);
            // check to see if a start value was stored in a data attribute and it matches the current status
            if( $status.data('startVal') != $status.val() ) {
                // if so, set the status value to that stored value
                $status.val( $status.data('startVal') ).change();
                // and destroy the data attribute so it only runs the once
                $status.data('startVal','');
            }
        });

        this.$table.responsiveTable({
            pinLeft : [0]
        });
        this.updateFormParams();
        this.renderPagination();
    },

    updateFormParams: function() {
        var params = this.claimsModel.get('parameters');

        this.$form.find('#approvalsClaimsDateStart').val(params.startDate).datepicker('update');
        this.$form.find('#approvalsClaimsDateEnd').val(params.endDate).datepicker('update');
        this.$form.find('#approvalsClaimsPromotion').val(params.promotionId);
        this.$form.find('#approvalsClaimsStatus').val(params.claimStatus);
    },

    renderPagination: function() {
        var thisView = this,
            meta = this.claimsModel.get('promotion').claims.meta;

        // if our data is paginated, add a special pagination view
        if( meta.maxRows > meta.rowsPerPage ) {
            // if no pagination view exists, create a new one
            if( !this.tabularPagination ) {
                this.tabularPagination = new PaginationView({
                    el : this.$promotion.find('.paginationControls'),
                    // pages: 20,
                    // current: 4,
                    pages : Math.ceil(meta.maxRows / meta.rowsPerPage),
                    current : meta.pageNumber,
                    ajax : true,
                    tpl : this.subTpls.paginationTpl || false
                });

                this.tabularPagination.on('goToPage', function(page) {
                    thisView.handleTablePagination(page);
                });

                this.on('renderDone', function() {
                    meta = this.claimsModel.get('promotion').claims.meta;

                    thisView.tabularPagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(meta.maxRows / meta.rowsPerPage),
                        current : meta.pageNumber
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.tabularPagination.setElement( this.$promotion.find('.paginationControls') );
            }
        }
    },

    loadClaimsData: function(formData, opts) {
        opts = opts || {};
        // TODO: start spinner
        $.scrollTo(this.$claimForm, G5.props.ANIMATION_DURATION, {axis : 'y'});
        G5.util.showSpin(this.$claimForm, {cover:true,classes:'pageView'});
        this.claimsModel.loadClaimsData(formData, opts);
    },

    handleTableSort: function(e) {
        e.preventDefault();

        var $tar = $(e.target).closest('.sortable'),
            sortOn = $tar.data('sortedOn'),
            sortBy = $tar.data('sortedBy') == "asc" ? "desc" : "asc",
            parameters = this.claimsModel.get('parameters');

        parameters.sortedOn = sortOn;
        parameters.sortedBy = sortBy;
        parameters.pageNumber = 1;

        this.loadClaimsData(parameters, {claimsOnly:true});
    },

    handleTablePagination: function(page) {
        var parameters = this.claimsModel.get('parameters');

        parameters.pageNumber = page;

        this.loadClaimsData(parameters, {claimsOnly:true});
    },

    handleStatusChange: function(e) {
        var $tar = $(e.target).closest('select'),
            val = $tar.val(),
            $reasons = $tar.closest('.selects').find('.statusReason'),
            $reason = $reasons.filter('.'+val),
            statusObj = _.where(this.claimsModel.get('promotion').claims.meta.statuses, {value: val})[0];

        if(statusObj.reasons) {
            _.each(statusObj.reasons,function(reason) {
                // check to see if a start value was stored in a data attribute and it matches the current reason
                if( reason.text == $reason.data('startVal') ) {
                    // if so, select that <option> element
                    $reason.find('option').filter(function(){
                        return $(this).text() == $reason.data('startVal');
                    }).attr('selected','selected');
                    // and destroy the data attribute so it only runs the once
                    $reason.data('startVal','');
                }
            });
            $reason.show().closest('span').addClass('validateme');
            $reasons.not($reason).val('').hide().closest('span').removeClass('validateme');
            $tar.blur();
        }
        else {
            $reasons.val('').hide().qtip('destroy').closest('span').removeClass('validateme');
        }

        if($tar.closest('.validateme').hasClass('error')) {
            G5.util.formValidate($tar.closest('.validateme'));
            this.$claimForm.find('.validateme select').qtip('reposition');
            $tar.focus();
        }

        this.$table.responsiveTable();
    },

    handleStatusReasonChange: function(e) {
        var $tar = $(e.target).closest('select');

        if($tar.closest('.validateme').hasClass('error')) {
            G5.util.formValidate($tar.closest('.validateme'));
            this.$claimForm.find('.validateme select').qtip('reposition');
            $tar.focus();
        }
    },

    // same for all tooltip
    showSameForAllTip: function(e){
        var $el = $(e.target),
            $qtipSrc = this.$claimForm.find('#sameForAllTipTpl'),
            pendingClaims = this.$claimForm.find('select').closest('tr'),
            claimObj = _.where(this.claimsModel.get('promotion').claims.results, {id: $el.closest('tr').data('claimId')})[0];


        // if there's only a single claim
        if( pendingClaims.length == 1 ) {
            $qtipSrc.find('.multiClaim').remove();

            // NO TIP: single pending product
            if( claimObj.products.length <= 1 ){ return; }
        }
        else {
            $qtipSrc.find('.singleClaim').remove();
        }

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
            content: $qtipSrc.clone().removeAttr('id'),
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

    doSameForAllClick: function(e){
        var $tar = $(e.target),
            // find the active input: the link is in a tooltip with a qtip
            // which has a reference to the triggering element (target)
            $actInp = $tar.closest('.ui-tooltip').data('qtip').elements.target,
            $scope = $tar.hasClass('all') && $tar.closest('span').hasClass('multiClaim') ? $actInp.closest('tbody') : $actInp.closest('tr'),
            inpType = $actInp.hasClass('statusReason') ? 'reason' : 'status',
            inpVal = $actInp.val(),
            filter = $actInp.hasClass('deny') ? '.deny' : '.hold';

        e.preventDefault();

        this[inpType == 'reason' ? 'setAllReasons' : 'setAllStatuses']($scope, inpVal, $actInp, filter);
    },

    setAllStatuses: function($scope, val) {
        $scope.find('select.status').val(val).change();
    },

    setAllReasons: function($scope, val, $tar, filter) {
        var statusVal = $tar.closest('.selects').find('.status').val();

        this.setAllStatuses($scope, statusVal);
        $scope.find('select.statusReason').filter(filter).val(val);
    },

    validateForm: function($form, silent, opts) {
        silent = silent || false;
        var $validate = $form.find('.validateme');

        return G5.util.formValidate($validate, silent, opts);
    },

    submitParamsForm: function(e) {
        e.preventDefault();

        if( !this.validateForm(this.$form) ) {
            return false;
        }

        var formData = this.$form.serializeArray();

        G5.util.showSpin(this.$el, {cover:true,classes:'pageView'});
        this.claimsModel.loadClaimsData(formData);
    },

    submitApprovals: function(e) {
        e.preventDefault();

        var qtipOpts = {
                position: {
                    container : this.$claimForm,
                    viewport : $(window),
                    adjust : {
                        method : 'flipinvert'
                    }
                }
            };

        if( !this.validateForm(this.$claimForm, null, { qtipOpts: qtipOpts }) ) {
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