/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
PageView,
PaginationView,
SSIUpdateResultsModel,
SSIUpdateResultsPageView:true
*/
SSIUpdateResultsPageView = PageView.extend({

    //init function
    initialize:function(opts){

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

        //template names
        this.ssiUpdateActivityTpl = 'ssiUpdateResultsActivityTable';
        this.tplPath = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';
        this.url = G5.props.URL_JSON_SSI_UPDATE_RESULTS_TABLE;
        this.urlUpload = G5.props.URL_JSON_SSI_UPDATE_RESULTS_UPLOAD;

        this.model = new SSIUpdateResultsModel({});

        this.opts = {
            url : this.url,
            urlUpload : this.urlUpload,
            contestData: opts.data
        };

        this.model.loadData(this.opts);

        this.setupEvents();

        this.$el.find('.datepickerTrigger').datepicker({ endDate: '+0d' });

        this.fileUpload();
    },

    events: {
        "click .ssiToggleView": "showSection",
        "click .totalActivity i": "tableInfoPopover",
        "keyup .ssiTotalActivityText": "validateNumericInput",
        "click #ssiEnterActivityForm .ssiUpdateNext": "renderActivityTable",

        //intercept the pagination click to show popover
        "click .pagination a": "paginationClickHandler",
        "click .ssiSavePaginationProgress": "popoverCickHandler",

        //table sort
        "click .sortable a": "tableSortClickHandler",
        "click .ssiSaveSortProgress": "handleTableSort",

        //Form Save
        "click .ssiUpdateSave": "sendProgressPopover",
        "click .sendProgressConfirmSubmit": "saveForm",

        //Form cancels
        "click .ssiUpdateCancel": "hideSection",
        'click .sendProgressConfirmCancel': "submitCancelForm",
        "click .ssiUpdateCancelPage": "confirmCancel",
        "click .ssiUpdateDialogCancel, .ssiCancelProgress": function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        },

        // participant popover
        'click .profile-popover': 'attachParticipantPopover',
        'click .exportCsvButton': 'exportCsv'
    },

    setupEvents: function(){
        var that = this;

        this.model.on('loadDataFinished', this.render, this);

        this.on('error:genericAjax', this.handleAjaxError, this);
        this.model.on('error:genericAjax', this.handleAjaxError, this);

        this.$el.find('#ssiEnterActivityForm .datepickerInp').on('change', function(){
            that.$el.find('.ssiUpdateNext').removeAttr('disabled');
        });

    },

    render: function(){
        var $form = this.$el.find('#ssiEnterActivityForm'),
            uploadInProgress = this.model.get('uploadInProgress'),
            $nextBtn = this.$el.find('.ssiUpdateNext'),
            $uploadProgressCont = this.$el.find('.uploadInProgress'),
            $headerToggle = this.$el.find('.ssiToggleView');

            G5.util.hideSpin(this.$el);

            $nextBtn.attr('disabled', 'disabled');

            //If upload is in progress show the message and add disabled class for styling
            uploadInProgress ? ($uploadProgressCont.show() , $headerToggle.addClass('disabled') ): $uploadProgressCont.hide();

            $form.hasClass('open') ? this.renderActivityTable() : false;

            return;
    },

    renderActivityTable: function(e){
        var that = this,
            $cont = this.$el.find('.ssiEnterActivityTableWrap'),
            $form = this.$el.find('#ssiEnterActivityForm'),
            $submitBtn = $form.find('.ssiUpdateSave'),
            $nextBtn = $form.find('.ssiUpdateNext'),
            $cancelBtn = $form.find('.ssiUpdateCancel');


        if(e) e.preventDefault();

        TemplateManager.get(this.ssiUpdateActivityTpl, function(tpl, vars, subTpls) {
            that.subTpls = subTpls;

            $cont.empty().append(tpl(that.model.toJSON()));

            that.$el.find('.table').responsiveTable();

            $submitBtn.show();
            $nextBtn.hide();
            $cancelBtn.addClass('ssiUpdateCancelPage').removeClass('ssiUpdateCancel');

            that.renderPagination();

            that.trigger('renderDone');
        }, this.tplPath);
    },

    renderPagination: function() {
        var that = this;

        // if our data is paginated, add a special pagination view
        if( this.model.get('total') > this.model.get('perPage') ) {
            // if no pagination view exists, create a new one
            if( !this.paginationView ) {
                this.paginationView = new PaginationView({
                    el : this.$el.find('.paginationControls'),
                    pages : Math.ceil(this.model.get('total') / this.model.get('perPage')),
                    current : this.model.get('current'),
                    per : this.model.get('perPage'),
                    total : this.model.get('total'),
                    ajax : true,
                    showCounts : true,
                    tpl : this.subTpls.paginationTpl || false
                });

                // removing this to trigger popover on pagination click
                // this.paginationView.on('goToPage', function(page) {
                //     that.paginationClickHandler(page);
                // });

                this.model.on('loadDataFinished', function() {
                    that.paginationView.setProperties({
                        rendered : false,
                        pages : Math.ceil(that.model.get('total') / that.model.get('perPage')),
                        current : that.model.get('current')
                    });
                });
            }
            // otherwise, just make sure the $el is attached correctly
            else {
                this.paginationView.setElement( this.$el.find('.paginationControls') );

                // we know that pagination should exist because of the if with count, so we need to explicitly render if it has no children
                if( !this.paginationView.$el.children().length ) {
                    this.paginationView.render();
                }
            }
        }
    },

    showSection: function(e){
        var $tar = $(e.currentTarget),
            section = $tar.data('toggle'),
            $forms = this.$el.find('.ssiShowHideForm'),
            uploadInProgress = this.model.get('uploadInProgress'),
            $headerToggle = this.$el.find('.ssiToggleView');

            if($forms.hasClass('open') || uploadInProgress){
                return false;
            }

            this.$el.find('#'+section)
            .addClass('open')
            .slideDown(G5.props.ANIMATION_DURATION);

            $tar.addClass('open');
            $headerToggle.addClass('form-open');

    },

    hideSection: function(e){
        var $forms = this.$el.find('.ssiShowHideForm'),
            $headerToggle = this.$el.find('.ssiToggleView');

            e.preventDefault();

            $forms.removeClass('open')
            .slideUp(G5.props.ANIMATION_DURATION);

            $headerToggle.removeClass('open form-open');
    },

    validateFileExtension: function(target){
        var regEx = /\.(csv|xls|xlsx)$/i,
            $inp = target.find('#ssiHiddenUpload'),
            msg = this.$el.find('.ssiUploadSSButton').data('extraValidate');

        if(regEx.test($inp.val())){
            $inp.qtip('hide');

            return true;
        } else {

            $inp.qtip({
                content:{text: msg},
                position:{
                    my: "bottom center",
                    at: "top center",
                    container: this.$el,
                    adjust: {
                        method: 'shift none'
                    }
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
                    classes:'ui-tooltip-shadow ui-tooltip-red validate-tooltip',
                    tip: {
                        corner: true,
                        width: 20,
                        height: 10
                    }
                }
            });

            // clear the input so the form fails validation and the file cannot be submitted
            $inp.val('');

            return false;
        }

    },

    popoverCickHandler: function(e) {
        var $tar = $(e.target),
            $popover = $tar.closest('.ssiSavePagePaginationPopover'),
            page = $popover.data('page') || $tar.closest('li').data('page'),
            method = $popover.data('method') || 'navigate',
            data = {};

        if( $tar.hasClass('disabled') || $tar.hasClass('active') ) {
            return false;
        }

        if( this.paginationView.options.ajax === true ) {
            e.preventDefault();

            G5.util.showSpin( this.$el, {
                cover : true
            });

            data = {
                method: method,
                url: this.url,
                total : this.model.get('total'),
                perPage : this.model.get('perPage'),
                page : page,
                sortedOn : this.model.get('sortedOn'),
                sortedBy : this.model.get('sortedBy')
            };

            this.$el.find('.qtip').qtip('hide');

            if(this.validateForm($tar)){
                this.loadData(data);
            }
        }
    },

    /**
     * Intercepts the pagination click to add a save popover if data has been entered in the table
     * @param  {event} e
     *
     */
    paginationClickHandler: function(e){
        var $tar = $(e.target).closest('li'),
            page = $tar.data('page'),
            $cont = this.$el.find('.ssiSavePagePaginationPopover');

        !this.validateEmptyInputs() ? this.attachPopover($tar, $cont, this.$el.find('#ssiEnterActivityForm'), page) : this.popoverCickHandler(e);

    },

    /**
     * Sort table click will add a save popover if data has been entered in the table
     * @param  {event} e
     *
     */
    tableSortClickHandler: function(e){
        var $tar = $(e.target).closest('.sortable'),
            sortOn = $tar.data('sortOn'),
            sortBy = $tar.data('sortBy'),
            $cont = this.$el.find('.ssiSavePageSortPopover');

        !this.validateEmptyInputs() ? this.attachPopover($tar, $cont, this.$el.find('#ssiEnterActivityForm'), null, sortOn, sortBy) : this.handleTableSort(e);
    },

    /**
     * Adds data to the popover to send in the request
     * @param  {event} e
     * @return {obj}   data
     */
    handleTableSort: function(e){
        var $tar = $(e.target),
            $popover = $tar.closest('.ssiSavePageSortPopover'),
            sortOn = $popover.data('sorton') || $tar.closest('.sortable').data('sortOn'),
            sortBy = $popover.data('sortby') || $tar.closest('.sortable').data('sortBy'),
            method = $popover.data('method') || 'sort',
            data = {};

        e.preventDefault();

        G5.util.showSpin( this.$el, {
            cover : true
        });

        data = {
            method: method,
            url: this.url,
            total : this.model.get('total'),
            perPage : this.model.get('perPage'),
            sortedOn : sortOn,
            sortedBy : sortBy
        };
        this.$el.find('.qtip').qtip('hide');

        if(this.validateForm($tar)){
            this.loadData(data);
        }
    },

    attachPopover: function($trig, cont, container, page, sortOn, sortBy){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: "bottom center",
                at: "top center",
                container: container,
                viewport: $(window),
                adjust: {
                    method: 'shift none'
                }
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
                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });

        if($trig.data('page')){
            cont.attr('data-page', page).attr('data-method', 'saveAndNavigate');
        } else {
            cont.attr('data-sortOn', sortOn).attr('data-sortBy', sortBy).attr('data-method', 'saveAndSort');
        }
    },

    tableInfoPopover: function(e){
        var $tar = $(e.target),
            $cont = this.$el.find('.ssiTotalActivityInfoPopover');

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, this.$el.find('#ssiEnterActivityForm'));
        }
    },

    sendProgressPopover: function(e){
        var $tar = $(e.target),
            $form = $(e.target).closest('form'),
            $cont = this.$el.find('.ssiSaveSendProgress');

        e.preventDefault();

        if( !this.validateForm($form) ) {
            return false;
        }

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, $form);
        }
    },

    confirmCancel: function(e){
        var $tar = $(e.target),
            $cont = this.$el.find('.ssiUpdateCancelConfirm');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, this.$el.find('#ssiEnterActivityForm'));
        }
    },

    loadData: function(data){
        var arr = this.$el.find('#ssiEnterActivityForm').serializeArray(),
            params = {};

        _.each(arr, function(el){
            var value = _.values(el);

            params[value[0]] = value[1];
        });

        this.model.loadData($.extend({}, data, params));

        return;
    },

    handleAjaxError: function(error) {
        var $m = this.$el.find('.contestErrorsModal'),
            $l = $m.find('.errorsList');

        if(!_.isArray(error) && error.text) {
            error = [error]; // make it an array
        }

        $l.empty();

        _.each(error, function(e) {
            $l.append('<li>' + e.text + '</li>');
        });

        $m.modal();
    },

    saveForm: function(e) {
        var $form = $(e.target).closest('form'),
            submitMethod = $form.is('#ssiUploadSSForm') ? 'upload' : 'enter',
            $progressUpdate = $(e.target).val(),
            data;

        e.preventDefault();

        // if we are submitting the data online, serialize and use this.loadData
        if( submitMethod == 'enter' ) {
            data = {
                url: this.url,
                method: 'save',
                saveAndSendProgressUpdate: $progressUpdate
            };
            this.loadData(data);
        }

        // if we are submitting via upload, use the special fileupload data stored as part of the add in this.fileUpload
        else if( submitMethod == 'upload' ) {
            if( $form.data() && $form.data().fileData ) {
                $form.data().fileData.submit();
            }
        }
    },

    submitCancelForm: function(e){
        var $form = this.$el.find('#ssiSendProgress'),
            btnVal = $(e.target).val();

        e.preventDefault();

        this.model.submitCancelFormData({cancelAndSendProgress:btnVal}, $form.attr('action'));
    },

    fileUpload: function() {
        var that = this,
            $form = this.$el.find('#ssiUploadSSForm'),
            $progressUpdate = this.$el.find('.sendProgressConfirmSubmit').val(),
            $input = $form.find('#ssiHiddenUpload');

        $input.fileupload({
            url: this.urlUpload,
            method: "POST",
            dataType: 'g5json',
            formData: {
                method: 'save',
                saveAndSendProgressUpdate: $progressUpdate
            },
            replaceFileInput: false,
            add: function(e, data) {
                if( !that.validateFileExtension($form) ) {
                    return false;
                }
                else {
                    $form.data('fileData', data);
                }
            },
            done: function(e, data) {
                var errors = data.result.getFirstError();
                if( errors ) {
                    that.trigger('error:genericAjax', errors);

                    return false;
                }
            }
        });
    },

    validateEmptyInputs: function(){
        var $cont = this.$el.find('#ssiUpdateResultsActivityTable'),
            $inputs = $cont.find('input[type="text"]'),
            x = 0;

        _.each($inputs, function(inp){
            if(inp.value !== "") x++;
        });

        if(x === 0) {
            return true;
        } else {
            return false;
        }

    },

    // here we wait until keyup, when the full val string is present, if it doesn't match,
    // we set the value back to the last match or an empty string
    validateNumericInput: function(e) {
        // ^-?(\d{1,9})?(\.\d{0,4})?$
        var $tar = $(e.target),
            v = $tar.val(),
            decPlaces = this.model.get('measureType') == 'currency' ? '2' : '4',
            reStr = "^-?(\\d{1,9})?(\\.\\d{0,"+(decPlaces)+"})?$",
            regEx = new RegExp(reStr);

        if(!regEx.test(v)) {
            // if not matching our regex, then set the value back to what it was
            // or empty string if no last val
            $tar.val($tar.data('lastVal') || '');
        } else {
            // store this passing value, we will use this to reset the field
            // if a new value doesn't match
            $tar.data('lastVal', v);
        }

    },

    validateForm: function(form){
        var $form = form;

        if(!G5.util.formValidate($form.find('.validateme'))) {
            var $valTips = $form.find('.validate-tooltip:visible');
            // if val tips, then we have errors
            if($valTips.length) {
                return false;
            } else {
                return true;
            }
        }else {
            return true;
        }
    },

    attachParticipantPopover:function(e){
        var $tar = $(e.target),
            isSheet = ($tar.closest(".modal-stack").length > 0) ? {isSheet: true} : {isSheet: false};

        if ($tar.is("img")){
            $tar = $tar.closest("a");
        }

        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $tar.participantPopover(isSheet).qtip('show');
        }
        e.preventDefault();
    },

    exportCsv: function(e) {
        if ( G5.props.REPORTS_LARGE_AUDIENCE === true ) {
            e.preventDefault();

            var $tar = $(e.target),
                that = this;

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: $tar.attr('href'),
                data: {},
                error: function(jqXHR, textStatus, errorThrown) {
                    that.$el.prepend('<p class="alert alert-error">' + textStatus + ': ' + jqXHR.status + ' ' + errorThrown + '</p>');
                },
                success: function(servResp){
                    // Shouldn't ever be a response to process
                    // This event should always result in a serverCommand in the JSON
                    return;
                }
            });
        }
    }
});
