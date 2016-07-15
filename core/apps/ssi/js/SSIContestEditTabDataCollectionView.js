/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
SSIContestEditTabDataCollectionView:true
*/
SSIContestEditTabDataCollectionView = Backbone.View.extend({

    initialize: function(opts) {
        var that = this,
            cm = null;

        // fe dev uses this path
        this.tplPath = './../apps/ssi/tpl/';
        this.tplName = 'ssiContestEditTabDataCollectionView';
        this.previewTplName = 'ssiSubmitClaimFormTpl';

        // SSIContestPageEditView parent container for this tab
        this.containerView = opts.containerView;
        this.contMod = this.containerView.contestModel;

        this.setupEvents();
    },

    events: {
        'click .previewBtn': 'doPreviewClick',
        'change #previewSubmitClaimFormLangSel': 'doLanguageChange',
        'click .additionalFields.editable .addBtn': 'doSelect',
        'click .additionalFields.editable .cellName': 'doSelect',
        'click .additionalFields.editable .selectBtn': 'doDeselect',
        'change .additionalFields.editable .cellRequired input': 'doRequireChange',
        'click .showAddBtn': 'doShowAddFieldEditor',
        'click .cancelAddFieldBtn': 'doHideAddFieldEditor',
        'click .addFieldBtn': 'doAddField',
        'change .date': 'doDateChange'
    },
    setupEvents: function() {
        var cm = this.containerView.contestModel;
        cm.on('success:fetchDataCollectionStepData', this.handleFetchDataSuccess, this);
        cm.on('change:collectDataMethod', this.handleCollectDataMethodChange, this);
    },


    /*
        888b.                8               dP 888       w  w
        8  .8 .d88b 8d8b. .d88 .d88b 8d8b   dP   8  8d8b. w w8ww
        8wwK' 8.dP' 8P Y8 8  8 8.dP' 8P    dP    8  8P Y8 8  8
        8  Yb `Y88P 8   8 `Y88 `Y88P 8    dP    888 8   8 8  Y8P
    */
    render: function(){
        var json = this.contMod.toJSON();

        json._defContName = this.contMod.getDefaultTranslationByName('names');
        json._hasAdditionalFields = !!this.getAddFields().length;

        TemplateManager.get( this.tplName, function(tpl, vars, subTpls){
            this.tpl = tpl;
            this.subTpls = subTpls;

            this.$el.find('.ssiContestDataCollectionWrap').empty().append( tpl(json) );

            this.initDate();
            this.renderFields();

        }.bind(this), this.tplPath);
    },

    renderFields: function() {
        var $reqList = this.$el.find('.fieldItemList.systemFields'),
            $addList = this.$el.find('.fieldItemList.additionalFields');

        this.renderFieldsInto(this.getReqFields(), $reqList);
        this.renderFieldsInto(this.getAddFields(), $addList);
        this.updateSortable();
        this.updateFieldDisablement();

    },

    renderFieldsInto: function(fields, $list) {
        var fiTpl = this.subTpls.fieldItem;

        _.each( fields, function(f, i) {
            // editable if not live && not required
            f._editable = this.isLive() || f.metaType == 'required' ? false : true;

            var $f = $($list.find('.fieldItem').get(i)),
                $nf = $( fiTpl(f) );

            if($f.length) {
                $f.replaceWith($nf);
            } else {
                $list.append($nf);
            }

            if(f._isNew) {
                delete f._isNew;
                G5.util.animBg($nf,'background-flash');
            }

            // cleanup
            delete f._editable;
        }.bind(this));
    },

    renderAndShowPreview: function(langId) {
        var $prevModal = this.$el.find('#previewClaimFormModal');

        TemplateManager.get( this.previewTplName, function(tpl) {
            $prevModal.modal()
                .find('.modal-body').empty()
                .append( tpl( this.getPreviewData(langId) ) );

            $prevModal.find('.modal-body').find('a,button').prop('disabled','disabled');
        }.bind(this), this.tplPath);
    },

    initDate: function() {
        var $d = this.$el.find('.datepickerTrigger');
        // init plugin, set start date limit
        $d.datepicker().datepicker('setStartDate', $d.data('dateTodaydate'));
    },


    /*
        8    8         8       w
        8    8 88b. .d88 .d88 w8ww .d88b
        8b..d8 8  8 8  8 8  8  8   8.dP'
        `Y88P' 88P' `Y88 `Y88  Y8P `Y88P
               8
    */
    updateClaimFormSection: function() {
        var isShow = this.contMod.get('collectDataMethod') == this.contMod.DAT_COL_TYPE.FORM,
            $cf = this.$el.find('#buildAClaimForm');

        $cf[ isShow ? 'slideDown' : 'slideUp' ](G5.props.ANIMATION_DURATION);
    },

    updateSortable: function() {
        if(this.isLive()) { return; }

        var $addList = this.$el.find('.fieldItemList.additionalFields'),
            fields = this.getAddFields();

        // lazy-attach plugin
        if (!$addList.data('sortable')) {
            // jquery ui sortable (drag and drop to change number/order)
            $addList.sortable({
                axis: 'y',
                delay: 100, // before draging delay (allow clicks)
                placeholder: 'fieldPlaceholder',
                //revert: 200, // aniqe to resting pos (ms)
                update: function(e, ui) {
                    this.pushDomListToModel();
                }.bind(this)
            });
        }

        // disable/enable
        $addList.sortable("option", "disabled", fields.length < 2);
    },

    updateFieldDisablement: function() {
        var cm = this.contMod,
            s = cm.get('status'),
            d = _.bind( function(s) {
                    return this.$el.find(s).prop('disabled','disabled');
                }, this);

        if( this.isLive() ) {
            d('input, select').closest('.validateme').removeClass('validateme');

            //bugzilla[63988] allow last dates to submit claim field to be editable
            //
            // // datepickers
            // if(!this._datesDisabled) {
            //     // start date (move input el out of datepicker el)
            //     this.$el.find('.claimDeadlineDateTrigger')
            //         .before( d('#claimDeadlineDate').clone() )
            //         .hide()
            //         .closest('.validateme').removeClass('validateme');
            //     this._datesDisabled = true;
            // }
        }
    },


    /*
        8    8 888    8888                     w
        8    8  8     8www Yb  dP .d88b 8d8b. w8ww d88b
        8b..d8  8     8     YbdP  8.dP' 8P Y8  8   `Yb.
        `Y88P' 888    8888   YP   `Y88P 8   8  Y8P Y88P
    */
    doDateChange: function(e) {
        var $tar = $(e.target),
            k = $tar.data('modelKey');

        this.contMod.set(k,$tar.val());
    },

    doPreviewClick: function(e) {
        e.preventDefault();

        this.renderAndShowPreview();
    },

    doLanguageChange: function(e) {
        e.preventDefault();

        var $t = $(e.target),
            v = $t.val();

        this.renderAndShowPreview(v);
    },

    doRequireChange: function(e) {
        var $t = $(e.target),
            fn = this.getFieldNameForEl($t),
            f = this.getFieldByName(fn);

        e.preventDefault();

        f.isRequired = $t.is(':checked');
    },

    doSelect: function(e) {
        var $t = $(e.target),
            fn = this.getFieldNameForEl($t),
            f = this.getFieldByName(fn);

        e.preventDefault();

        if(f.isSelected) { // on row click this may be deselect
            f.isSelected = false;
        } else {
           f.isSelected = true;
        }

        this.renderFields();
    },

    doDeselect: function(e) {
        var $t = $(e.target),
            fn = this.getFieldNameForEl($t),
            f = this.getFieldByName(fn);

        e.preventDefault();

        f.isSelected = false;
        this.renderFields();
    },

    doAddField: function(e) {
        e.preventDefault();

        if(this.validateEditor()) {
           this.contMod.get('fields').push(this.getNewFieldFromEditor());
           this.doHideAddFieldEditor();
           this.renderFields();
        }
    },

    doShowAddFieldEditor: function(e) {
        if(e) { e.preventDefault(); }

        this.$el.find('.showFieldEditControls').slideUp(G5.props.ANIMATION_DURATION);
        this.$el.find('.fieldEditor').slideDown(G5.props.ANIMATION_DURATION);
    },
    doHideAddFieldEditor: function(e) {
        if(e) { e.preventDefault(); }

        // clear fields
        this.$el.find('.fieldEditor input[type="text"]').val('');
        this.$el.find('.fieldEditor input[type="checkbox"]').prop('checked', false);

        // clear errors
        this.$el.find('.hasError').removeClass('hasError');
        this.$el.find('.errMsg').hide();

        this.$el.find('.showFieldEditControls').slideDown(G5.props.ANIMATION_DURATION);
        this.$el.find('.fieldEditor').slideUp(G5.props.ANIMATION_DURATION);
    },

    pushDomListToModel: function() {
        var $addList = this.$el.find('.fieldItemList.additionalFields .fieldItem'),
            seqStart = this.getReqFields().length;

        $addList.each( function(i, el) {
            var $el = $(el),
                field = this.getFieldByName($el.data('fieldName')),
                seqNum = seqStart + i;

            field.sequenceNumber = seqNum;
        }.bind(this));
    },

    validateEditor: function() {
        var ok = true;

        this.$el.find('.fieldEditor input[type="text"]').each( function(i, el) {
            var $el = $(el);

            if( !$el.val() ) {
                $el.addClass('hasError');
                $el.next('.errMsg').show();
                ok = false;
            } else {
                $el.removeClass('hasError');
                $el.next('.errMsg').hide();
            }
        });

        return ok;
    },


    /*
        8   8               8 8
        8www8 .d88 8d8b. .d88 8 .d88b 8d8b d88b
        8   8 8  8 8P Y8 8  8 8 8.dP' 8P   `Yb.
        8   8 `Y88 8   8 `Y88 8 `Y88P 8    Y88P
    */
    handleFetchDataSuccess: function() {
        this.render();
    },

    handleCollectDataMethodChange: function() {
        this.updateClaimFormSection();
    },


    /*
        88888      8       888        w               d8b
          8   .d88 88b.     8  8d8b. w8ww .d88b 8d8b  8'  .d88 .d8b .d88b
          8   8  8 8  8     8  8P Y8  8   8.dP' 8P   w8ww 8  8 8    8.dP'
          8   `Y88 88P'    888 8   8  Y8P `Y88P 8     8   `Y88 `Y8P `Y88P
    */
    // sync the visual elements with the model
    updateTab: function() {
        this.contMod.fetchDataCollectionStepData();
    },

    // validate the state of elements within this tab
    validate: function() {
        var $validate = this.$el.find('.validateme:visible'),
            isValid = G5.util.formValidate($validate);

        // failed generic validation tests (requireds mostly)
        if(!this.isLive() && !isValid) {
            return { msgClass: 'msgGenericError', valid: false };
        }

        return { valid: true };
    },


    /*
        888b.       w
        8   8 .d88 w8ww .d88
        8   8 8  8  8   8  8
        888P' `Y88  Y8P `Y88
    */
    getFieldNameForEl: function($el) {
        return $el.closest('.fieldItem').data('fieldName');
    },

    getFieldByName: function(n) {
        var f = _.where(this.contMod.get('fields'), {name: n});
        return f.length ? f[0] : null;
    },

    getAllFields: function() {
        return _.sortBy(this.contMod.get('fields'), 'sequenceNumber');
    },

    getReqFields: function() {
        return _.where(this.getAllFields(), {metaType: 'required'});
    },

    getAddFields: function() {
        return _.difference(this.getAllFields(), this.getReqFields());
    },

    // massage data for consumption by submit claim handlebars tpl
    getPreviewData: function(langId) {
        var cm = this.contMod,
            ct = cm.get('contestType'),
            prevDat;

        // basic info
        prevDat = {
            previewMode: true,
            contestType: ct,
            fields: _.where(this.getAllFields(), {isSelected: true})
        };

        // activity or activities
        if(ct === this.contMod.TYPES.DO_THIS_GET_THAT) {
            // remove top level quantity field which is not for DTGT
            prevDat.fields = _.filter(prevDat.fields, function(f){
                return !_.contains(['amount', 'quantity'], f.name.toLowerCase());
            });

            // DTGT has activities, each of which will hav a quantity associated with it
            prevDat.activities = _.map(cm.get('activities'), _.clone);
        } else {
            prevDat.activity = cm.get('activityDescription');
        }

        prevDat.measureActivityIn = cm.get('measureType');

        return prevDat;
    },

    getNewFieldFromEditor: function() {
        var $fe = this.$el.find('.fieldEditor'),
            newField = {
                "label": $fe.find('.newFieldLabel').val(),
                "name": this.getNextCustomName(),
                "type": $fe.find('.fieldTypeInp option:selected').val(),
                "typeDisplay": $fe.find('.fieldTypeInp option:selected').text(),
                "isRequired": $fe.find('.isReqInp').is(':checked'),
                "isSelected": true,
                "sequenceNumber": this.getAllFields().length,
                "metaType": "custom",
                "_isNew": true
            };

        return newField;
    },

    getNextCustomName: function() {
        var num = -1,
            name = 'custom',
            fields = this.getAddFields();

        while( _.where( fields, { name: name+(++num) } ).length ) {
            if( num > 999 ) { // no 1000 custom fields for you! ...ok, u can have. But w/ a weird name.
                return 'brokenCustomName'+(new Date()).getTime();
            }
        }
        return name+num;
    },

    isLive: function() {
        return this.contMod.get('status') == this.contMod.STATUSES.LIVE ? true : false;
    }

});
