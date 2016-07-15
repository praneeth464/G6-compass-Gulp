/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
Backbone,
ParticipantPaginatedView:true
*/

/** Paginated Participants View **/
ParticipantPaginatedView = Backbone.View.extend({
    initialize:function(opts){

        this.model = opts.model||new Backbone.Model();
        this.model.paxes = opts.participants||new Backbone.Collection();

        this.tplName = opts.tplName||'participantPaginatedView',
        this.tplUrl = opts.tplUrl || G5.props.URL_TPL_ROOT || G5.props.URL_BASE_ROOT+'tpl/';

        // do not fetch participants when sort or page change events happen
        this.suppressAjax = opts.suppressAjax||false;

        this.participantsUrl = opts.participantsUrl;
        if(!this.participantsUrl && !this.suppressAjax) {
            console.error('[ERROR] ParticipantPaginatedView.participantsUrl is required');
        }

        this.setupEvents();

        this.fetchParams = opts.fetchParams||{};
        this.fetchParamsFunc = opts.fetchParamsFunc||false;

        // this is a function to validate data before a fetch
        this.validateBeforeFetch = opts.validateBeforeFetch || false;

        // this is a function to get JSON data for the template
        this.getJsonForTemplate = opts.getJsonForTemplate || false;

        // trigger ajax load of currpage
        if(!opts.delayFetch) {
            this.fetchParticipants();
        }

        // params to send on page change and sort change
        this.sortChangeParams = opts.sortChangeParams||{};
        this.pageChangeParams = opts.pageChangeParams||{};

        // a function to get validation type name dynamically
        this.validationTypeByKey = opts.validationTypeByKey||null;

        // this.model.on('all',function(en){
        //     console.log('en', en);
        // });

        // because of how recipients are added when bootstrapped in, we need to wait a moment before making it normal then re-making it responsive. Gross to the nth degree.
        //this.$el.closest('table').responsiveTable({reset:true, duration:G5.props.ANIMATION_DURATION*6}); // G5.props.ANIMATION_DURATION*6 is the amount of time G5.util.animBg takes to fade out the color background
    },
    events: {
        "click .participant-popover": "attachParticipantPopover",
        "click .sortHeader": "doSort",

        // magic data bind
        "blur input[type=text][data-model-key][data-model-id]": "doDataBindTextInput"
    },
    setupEvents: function() {
        this.on('start:fetchParticipants', this.handleFetchParticipantsStart, this);
        this.on('end:fetchParticipants', this.handleFetchParticipantsEnd, this);
        this.on('success:fetchParticipants', this.renderOrUpdate, this);
        this.on('currentPageChange', this.handleCurrentPageChange, this);
        this.on('sortStateChange', this.handleSortStateChange, this);
        this.model.paxes.on('remove', this.handlePaxRem, this);
        this.model.paxes.on('add', this.handlePaxAdd, this);
    },

    handleCurrentPageChange: function() {
        this.fetchParticipants(this.pageChangeParams, false);
    },
    handleSortStateChange: function() {
        this.fetchParticipants(this.sortChangeParams);
    },

    // render or update?
    renderOrUpdate: function(isForceRender) {
        if(this._isRendered && !isForceRender) {
            this.renderPaxes();
            this.update();
        } else {
            this.render();
        }
    },


    // render this mutha
    render: function() {
        var that = this,
            json = this.model.toJSON();

        json.paxes = this.model.paxes.toJSON();

        if(this.getJsonForTemplate) {
            json.extraJson = this.getJsonForTemplate();
        }

        TemplateManager.get(this.tplName,function(tpl, vars, subTpls){
            that.subTpls = subTpls;
            that.$el.empty();
            that.$el.append(tpl(json));
            that.initPaginationControls();
            that._isRendered = true;
            that.renderPaxes();
            that.update();
            that.trigger('renderedAndUpdated');
        }, this.tplUrl);
    },
    renderPaxes: function() {
        var $tb = this.$el.find('tbody'),
            that = this;

        $tb.empty();
        this.model.paxes.each(function(p){
            var json = p.toJSON();
            if(that.getJsonForTemplate) {
                json.extraJson = that.getJsonForTemplate();
            }
            $tb.append(that.subTpls.paxRow(json));
        });
        that.trigger('rendered');
    },
    renderSinglePaxRow: function(paxObj) {
        var $tb = this.$el.find('tbody'),
            that = this;
        if(this.getJsonForTemplate) {
            paxObj.extraJson = this.getJsonForTemplate();
        }
        $tb.prepend(that.subTpls.paxRow(paxObj));
    },
    initPaginationControls: function() {
        // add PaginationView (pagination controls)
        this.paginationView = new PaginationView({
            el: this.$el.find('.paginationConts'),
            ajax: true,
            pages: Math.ceil(this.model.get('recordsTotal')/this.model.get('recordsPerPage')),
            current: this.model.get('currentPage'),
            per: this.model.get('recordsPerPage'),
            total: this.model.get('recordsTotal'),
            showCounts: true
        });
        this.paginationView.on('goToPage', function(pNum) {
            this.model.set('currentPage', pNum);
            this.trigger('currentPageChange', pNum);
        }, this);
    },

    update: function() {
        var m = this.model,
            cnt = this.model.get('recordsTotal'),
            rpp = this.model.get('recordsPerPage');

        this.$el.find('.hasPax')[cnt?'show':'hide']();
        this.$el.find('.paginationConts')[cnt>rpp?'show':'hide']();

        this.$el.find('.emptyMsg')[cnt?'hide':'show']();

        this.paginationView.setProperties({
            rendered : false,
            pages : Math.ceil(cnt/rpp),
            current : this.model.get('currentPage')
        });

        this.updateSortControls();
    },
    updateSortControls: function() {
        var $sc = this.$el.find('.sortControl'),
            that = this;

        $sc.each(function(){
            var $t = $(this),
                s = $t.data('sort');

            // clear styles
            $t.closest('.sortHeader').removeClass('sorted');
            $t.removeClass('asc desc icon-sort-up icon-sort-down');
            // add styles to apropo
            if(s===that.model.get('sortedOn')) {
                $t.closest('.sortHeader').addClass('sorted');
                $t.addClass(that.model.get('sortedBy')==='asc'?'asc icon-sort-up':'desc icon-sort-down');
            }
        });
    },

    handleFetchParticipantsStart: function() {
        this.spinLock(true);
    },
    handleFetchParticipantsEnd: function() {
        this.spinLock(false);
    },
    // handle a pax remove from the model.paxes
    handlePaxRem: function(pax) {
        var id = pax.get('id'),
            $tr = this.$el.find("tbody tr.participant-item[data-participant-id='"+id+"']"),
            that = this;
        $tr.slideUp(200, function() { $(this).remove(); that.update(); });
    },
    handlePaxAdd: function(pax) {
        this.update();
        this.renderSinglePaxRow(pax.toJSON());
    },

    spinLock: function(isActivate) {
        if(typeof isActivate === 'undefined' || isActivate) {
            this.$el.find('.spincover').show().find('.spin').spin(true);
        } else {
            this.$el.find('.spincover .spin').spin(false).closest('.spincover').hide();
        }
    },


    doSort: function(e) {

        // don't sort if this came from an info tooltip click
        if($(e.target).hasClass('pageView_help')) { return; }

        var $tar = $(e.target),
            $s = $tar.hasClass('sortControl') ? $tar : $tar.find('.sortControl'),
            on = $s.data('sort'),
            by = $s.hasClass('asc')?'desc':'asc';
        e.preventDefault();

        this.model.set({
            'sortedBy': by,
            'sortedOn': on,
            'currentPage': 1
        },{silent:true});

        this.trigger('sortStateChange');
    },

    // bind data saving from pax html elements (text input)
    doDataBindTextInput: function(e) {
        var $tar = $(e.target),
            v = $tar.val(),
            k = $tar.data('modelKey'),
            id = $tar.data('modelId'),
            vld = $tar.data('validation'),
            pax = this.model.paxes.get(id);

        if(!this.validateSingleField($tar)) {
            if(pax.get(k)) { // set value back to model's if exists
                $tar.val(pax.get(k));
            }
            return; // was error
        }


        if(!pax) {
            console.error('[ERROR] ParticipantPaginatedView.doDataBindTextInput: could not find model for id: '+id+', key: '+k+', value: '+v);
        } else {
            // set the value
            pax.set(k, v);

            // trigger so others may know we have saved something
            this.trigger('change:paxData', pax, k, v);
        }
    },

    validateSingleField: function($f) {
        var v = $f.val(),
            k = $f.data('modelKey'),
            vld = this.getValidationTypeForKey(k)||$f.data('validation')||null,
            isValid = true;

        if(v.length && vld) {
                // uses validation type for key mapping to decide what type of number is acceptable
                isValid = G5.util.validation.isNum(v, vld.type, vld.precision, vld.allowNegs, vld.allowZero);
                if(!isValid) {
                    $f.val('');
                    this.genericErrorTip('msg_' + vld.type + (vld.precision?'_'+vld.precision:''), $f);
                    return false; // not valid
                }

                // unified max number size - hopefully this doesn't change to specific maxes
                isValid = SSIContestModel.prototype.MAX_NUMBER_SIZE >= parseFloat(v);
                if(!isValid) {
                    $f.val('');
                    this.genericErrorTip('msgNumberTooLarge', $f);
                    return false;
                }
        }
        // just a string
        else {

            // bz60257 - allow empty for single field (on blur) validation
            // isValid = v.length && !vld;
            // if(!isValid) {
            //     this.genericErrorTip('msgRequired', $f);
            // }
        }

        return isValid;
    },
    getValidationTypeForKey: function(k) {
        return this.validationTypeByKey ? this.validationTypeByKey(k) : null;
    },

    attachParticipantPopover: function(e) {
        e.preventDefault();
        var $tar = $(e.target);

        //attach participant popovers
        if (!$tar.data('participantPopover')) {
            $tar.participantPopover().qtip('show');
        }
    },

    setFetchParams: function(params) {
        this.fetchParams = _.extend({}, this.fetchParams, params);
    },


    prepareAjaxData: function(params) {
        var fields = ['currentPage','sortedOn','sortedBy'],
            data = {},
            dynamicData = this.fetchParamsFunc ? this.fetchParamsFunc() : {},
            that = this;

        // fill in fields not falsy
        _.each(fields, function(f) {
            if(that.model.get(f)) {
                data[f] = that.model.get(f);
            }
        });


        data = _.extend({}, data, this.fetchParams, dynamicData, params||{});

        data.participants = this.model.paxes.toJSON();

        return data;
    },

    // fetch a page of pax
    fetchParticipants: function(params, forceRender) {
        var that = this,
            url = this.participantsUrl,
            request,
            isGoingForward,
            validRes = null,
            data;

        // this means we are prolly controlling data from outside,
        // Oh, how I wish this could have been kept more encapsulated!
        // Time marches on. Leaving a browning trail of blood. Sob.
        if(this.suppressAjax) { return; }

        if(forceRender) {
            this._isRendered = false;
        }

        if(params && params.goingDirection == 'forward'){
            isGoingForward = true;
        }

        if(!isGoingForward){
            // do validation if validation function is set
            if(!forceRender && this.validateBeforeFetch && !this.validate()) {
                // if this fetch was triggered by page change, then it is incorrect in the model
                // and should be set the "current" value of this.paginationView.model
                this.model.set('currentPage', this.paginationView.model.get('current'));
                return false; // exit
            }
        }

        data = this.prepareAjaxData(params);

        this.trigger('start:fetchParticipants', data);

        request = $.ajax({
            url: url,
            type: 'post',
            data: this.serializeForStruts(data),
            dataType: 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR){
            var err = serverResp.getFirstError(),
                d = serverResp.data;

            if(err) {
                that.trigger('error:fetchParticipants', err.text);
            } else {
                that.processAjaxResponse(d);
                that.trigger('success:fetchParticipants', serverResp.data, data);
            }
        });

        request.fail(function(jqXHR, textStatus, err){
            var errors;
            console.error('[ERROR] ParticipantPaginatedView: ajax fetch participants fail', jqXHR, textStatus, err);
            // struts returns full HTML for FORM VALIDATION - BOOO!
            if(textStatus=='parsererror') {
                errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                if(errors) {
                    that.trigger('error:fetchParticipants', errors);
                }
            }
        });

        request.always(function(x,y,z){
            that.trigger('end:fetchParticipants');
        });

        return true;
    },

    processAjaxResponse: function(data) {
        if(data.participants) {
            // page sort stuff
            this.model.set({
                'paxes': data.participants,
                'currentPage': data.currentPage,
                'sortedBy': data.sortedBy,
                'sortedOn': data.sortedOn,
                'recordsPerPage': data.recordsPerPage,
                'recordsTotal': data.recordsTotal
            });
            // paxes collection
            this.model.paxes.reset(data.participants);
        }
    },

    validate: function(noErrorUi) {
        var validRes,
            that = this;

        this.$el.find('.hasError').removeClass('hasError'); // reset

        if(!this.validateBeforeFetch) { return; }

        validRes = this.validateBeforeFetch(this.model.paxes);

        if(!validRes.isValid) {
            if(!noErrorUi) {
                _.each(validRes.errors, function(e, i) {
                    var $p = that.getTextInputForPaxAndField(e.pax.get('id'), e.field);
                    $p.addClass('hasError');
                    // set a tooltip error on first problem
                    if(i===0) {
                        that.genericErrorTip(e.errorType == 'required' ? 'msgRequired' : e.errorType, $p);
                    }
                });
            }
            return false; // was invalid
        }

        return true;
    },

    serializeForStruts: function(json) {
        var rem = null,
            dat = null,
            kToRem = [];

        // find undefined keys
        _.each(json, function(v, k) {
            if(typeof v === 'undefined') { kToRem.push(k); }
        });
        // remove undefined keys
        json = _.omit(json, kToRem);

        // this gives a query string
        dat = $.param(json);

        // this replaces the arrayName[0][subArrayName][0][keyName] notation with:
        // arrayName[0].subArrayName[0].keyName
        while(rem = dat.match(/(\?|&).*?%5B([a-zA-Z_]+)%5D.*?=/)) {
            dat = dat.replace('%5B'+rem[2]+'%5D','.'+rem[2]);
        }

        // this removes [] from arrays (struts does not recognize this style)
        dat = dat.replace(/%5B%5D=/g,'=');

        return dat;
    },

    removeParticipantById: function(id) {
        this.model.paxes.remove(id);
        this.model.set('recordsTotal',this.model.get('recordsTotal')-1);
    },
    addParticipant: function(paxObj) {
        this.model.set('recordsTotal',this.model.get('recordsTotal')+1);
        this.model.paxes.add(paxObj);
    },

    getCount: function() {
        return this.model.get('recordsTotal');
    },


    // display an error tip on target (uses class name to show proper error)
    genericErrorTip: function(msgClass, $target, opts) {
        var $cont = this.$el.find('.participantPaginatedViewErrorTipWrapper .errorTip').clone(),
            defOpts = {
                content:{text: $cont},
                position:{
                    my: 'bottom center',
                    at: 'top center',
                    effect: this.isIe7OrIe8 ? false : true,
                    viewport: true,
                    adjust: {
                        method: 'shift none'
                    }
                },
                show:{
                    event:false,
                    ready:true
                },
                hide:{
                    event:'unfocus click',
                    fixed:true,
                    delay:200
                },
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-red',
                    tip: {
                        corner: true,
                        width: 10,
                        height: 5
                    }
                }
            };

        // perform a deep merge, where opts overrides defOpts
        opts = $.extend(true, defOpts, opts||{});

        $cont.find('.'+msgClass).show(); // show our message

        //attach qtip and show
        $target.qtip(opts);
        $target.qtip('show');
    },

    getTextInputForPaxAndField: function(id, field) {
        return this.$el.find('[data-model-id='+id+'][data-model-key='+field+']');
    }
});
