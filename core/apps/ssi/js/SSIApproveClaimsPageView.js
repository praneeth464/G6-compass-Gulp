/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
Backbone,
$,
G5,
TemplateManager,
PageView,
SSIContestModel,
SSISharedPaginatedTableView,
SSIApproveClaimsSummaryCollection,
SSIApproveClaimsPageView:true
*/
SSIApproveClaimsPageView = PageView.extend({

    initialize: function(opts) {
        'use strict';

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        // the model
        this.model = new Backbone.Model(opts.contestJson);

        this.render();

        this.setupEvents();
    },

    events: {
        'keyup .contribCommentInp'      : 'updateContribComment',
        'click .commentTools .check'    : 'doContribCommentSpellCheck',
        'click .ssiDenyClaimBtn'        : 'addDenyPopover',
        'click .ssiDenyClaimSubmit'     : 'doDenyClaim',
        'click .ssiApproveClaimsUpdate' : 'doUpdateContest',
        'click .ssiApproveAllClaimsBtn' : 'doApproveAllClaimsConfirm',
        'change #claimsFilter'          : 'createHistoryTable',
        'click .close': function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    setupEvents: function() {
        this.on('start:ajax',   this.handleStartAjax, this);
        this.on('end:ajax',     this.handleEndAjax, this);
    },

    render: function () {
        'use strict';

        var topTpl = 'ssiApproveClaimsTop',
            detTpl = 'ssiApproveClaimsStats',
            that = this,
            data = this.model.toJSON();

        SSIContestModel.reformatDecimalStrings(data);

        // topper
        TemplateManager.get(topTpl, function(tpl) {
            that.$el.find('#ssiApproveClaimsSummary').append(tpl(data));
        });

        // details
        TemplateManager.get(detTpl, function(tpl) {
            that.$el.find('#ssiApproveClaimsStats').append(tpl(data));
        });

        // Update the pending claims count in the "Approve All" confirmation dialog
        this.$el
            .find('.approveAllConfirm .pendingClaimsCount')
            .text(this.model.get('claimsPendingCount'));

        // history table
        // default is to show claims that are waiting for approval
        // user can change filter with the select#claimsFilter dropdown
        this.createHistoryTable();

        // spellcheck
        this.renderSpellcheck();

        // init comment
        this.updateContribComment();


        return this;
    },

    renderSpellcheck: function() {
        var $langs = this.$el.find('.commentTools .spellchecker .dropdown-menu');

        // append each language listed in the spellCheckerLocalesToUse array
        _.each(G5.props.spellCheckerLocalesToUse, function(v) {
            var l = G5.props.spellCheckerLocalization[v];
            if(l) {
                $langs.append('<li><a href="'+v+'">'+l.menu+'</a></li>');
            }
        });
    },

    // Unlike other views with a createHistoryTable function, this one can be called each
    // time the user changes the Claims Filter. If the table already exists, it will get
    // removed and a new one is created.
    createHistoryTable: function () {
        'use strict';

        var pageView = this,
            claimsFilter = $('#claimsFilter').val(),
            that = this;


        // If the table has already been created, unbind any events and empty
        // the container element before recreating the paginated table view.
        if (this.historyTable) {
            this.historyTable.undelegateEvents();

            this.historyTable.off();
            this.historyTable.collection.off(null, null, this);
            this.historyTable.settings.off(null, null, this);

            this.historyTable.$el.empty();
        }

        var modelData = _.pick(this.model.toJSON(), ['contestId', 'sortedOn', 'sortedBy', 'canApprove']);

        this.historyTable = new (SSISharedPaginatedTableView.extend({
            // annoying work around for to rename a request property
            buildRequestData: function () {
                var res = SSISharedPaginatedTableView.prototype.buildRequestData.apply(this, arguments);
                res.contestId = res.id;
                res.filter = claimsFilter;
                delete res.id;
                return res;
            }
        }))({
            tpl: 'ssiApproveClaimsSummaryTableTpl',
            collection: new SSIApproveClaimsSummaryCollection(),
            el: this.$el.find('#ssiApproveClaimsHistory'),
            parentView: this,
            modelData: modelData
        });

        this.historyTable.on('tableRendered', function(){
            var filterVal = $('#claimsFilter').val(),
                collectionArray = this.collection.toJSON(),
                length = collectionArray.length,
                anyWaiting; // if filter is 'all' this will be true if any of the results are pending approval

            //hide any "no data" messages
            pageView.$el.find('.noDataMessages span').addClass('hidden');

            TemplateManager.get('ssiApproveClaimsStats', function(tpl) {
                $('#ssiApproveClaimsStats').find('.ssiSummaryDetails').remove();
                $('#ssiApproveClaimsStats').append(tpl(that.historyTable.settings.toJSON()));
            });

            if (this.collection.length) {
                var $table = this.$el.find('table');

                if (filterVal === 'approved' || filterVal === 'denied') {
                    $('#ssiApproveClaimsHistory')
                        .find('.approveDenyBtns')
                        .addClass('hidden');
                } else if (filterVal === 'all') {
                    while (length--) {
                        if (collectionArray[length].status === 'waiting_for_approval') {
                            anyWaiting = true;
                            break;
                        }
                    }
                }

                // set up responsive table plugin
                $table.responsiveTable({destroy: true});
                $table.responsiveTable();

                if (filterVal === 'waiting_for_approval' || anyWaiting) {
                    // show the approve all button if it is hidden
                    pageView.$el.find('.ssiApproveAllClaimsBtn, .approveDenyBtns').removeClass('hidden');
                } else {
                    pageView.$el.find('.ssiApproveAllClaimsBtn, .approveDenyBtns').addClass('hidden');
                }

            } else {
                // hide the approve all button if there are no results
                pageView.$el.find('.ssiApproveAllClaimsBtn, .approveDenyBtns').addClass('hidden');

                // if no results show a message
                switch (filterVal) {
                    case 'waiting_for_approval':
                        pageView.$el
                            .find('.noDataMessages .pending')
                            .removeClass('hidden');
                        break;
                    case 'approved':
                        pageView.$el
                            .find('.noDataMessages .approved')
                            .removeClass('hidden');
                        break;
                    case 'denied':
                        pageView.$el
                            .find('.noDataMessages .denied')
                            .removeClass('hidden');
                        break;
                    case 'all':
                        pageView.$el
                            .find('.noDataMessages .all')
                            .removeClass('hidden');
                        break;
                }
            }

        });

        return this;
    },

    addDenyPopover: function(e){
        var $tar = $(e.currentTarget),
            $cont = this.$el.find('.ssiDenyClaimPopover'),
            $c = $cont.find('.contribCommentInp'),
            that = this,
            onHide = function() {
                // trick the validation into hiding styles and qtips
                $c.val('x');
                that.validateDenyForm(); // should clear

                // clear the comment and trigger keyup to update count
                $c.val('').trigger('keyup');
            };

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, 'top right', 'bottom center', onHide);
        }
    },

    attachPopover: function($trig, cont, myPos, atPos, hideCallback){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: myPos,
                at: atPos,
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
                event: cont.hasClass('ssiDenyClaimPopover') ? 'click' : 'unfocus',
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
            },
            events: { hide: hideCallback||null}
        });
    },

    updateContribComment: function() {
        var $inp = this.$el.find('.contribCommentInp'),
            maxChars = parseInt($inp.attr('maxlength'),10),
            $remChars = this.$el.find('.commentTools .remChars');

        // enforce maxlength (ie only)
        if($.browser.msie && $inp.val().length > maxChars) {
            $inp.val( $inp.val().slice(0,maxChars));
        }

        // remaining chars
        $remChars.text($.format.number(maxChars-$inp.val().length));
    },

    doContribCommentSpellCheck: function(e) {
        var $tar = $(e.currentTarget),
            lang = $tar.attr('href'),
            localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ lang ]),
            $comment = this.$el.find('.contribCommentInp'),
            $badWords;

        e.preventDefault();

        if( !this.$el.find('.contribCommentWrapper .badwordsContainer').length ) {
            this.$el.find('.contribCommentWrapper').append('<div class="badwordsContainer"><div class="badwordsWrapper"><div class="badwordsContent" /></div></div>');
        }
        $badWords = this.$el.find('.contribCommentWrapper .badwordsContent');

        $comment.spellchecker({
            url: G5.props.spellcheckerUrl,
            lang: lang,
            localization : localization,
            engine: 'jazzy',
            suggestBoxPosition: 'above',
            innerDocument: false,
            wordlist: {
                action: 'html',
                element: $badWords
            }
        });

        $comment.spellchecker('check',{
            localization: lang,
            callback: function(result) {
                if(result===true) {
                    $badWords.find('.spellcheck-badwords').remove();
                    alert(localization.noMisspellings);
                }
                else {
                    $badWords.find('.spellcheck-badwords')
                        .prepend('<strong>'+localization.menu+':</strong>')
                        .append('<a class="close"><i class="icon-remove" /></a>');
                }
            }
        });

        // add a click handler for the badwords box close
        $badWords.on('click', '.close', function() {
            $badWords.find('.spellcheck-badwords').remove();
        });
    },

    doUpdateContest: function(e) {
        var contestId = $(e.target).data('contestId'),
            reqDat = {
                method: 'update',
                contestId: contestId
            };

        e.preventDefault();

        this.ajax(reqDat);
    },

    doDenyClaim: function(e) {
        var $tar = $(e.target),
            $tip = $tar.closest('.ui-tooltip.qtip'),
            // claimId = $tip.data('qtip').elements.target.data('claimId'),
            $form = $tip.data('qtip').elements.target.closest('form'),
            $denyForm = this.$el.find('#ssiDenyClaim'),
            serArr = $denyForm.serializeArray(),
            reqDat = {},
            isValid = this.validateDenyForm(),
            inputs;

        e.preventDefault();

        // serialize array returns an array of objects with name/value
        // let us convert to an object
        _.each(serArr, function(f) {
            reqDat[f.name] = f.value;
        });

        if(!isValid) { return; }

        inputs  = '<input type="hidden" name="method" value="deny">';
        inputs += '<input type="hidden" name="comment" value="'+ reqDat.comment +'">';
        $form.append(inputs);
        $form.submit();
    },

    doApproveAllClaimsConfirm: function(e){
        var $tar = $(e.target);
        e.preventDefault();

        G5.util.questionTip(
            $tar,
            this.$el.find('.approveAllConfirm').clone(),
            {position:{my:'bottom center',at:'top center'} },//qtip2 opts
            function() {

                // All approve/deny actions will now be form submissions causing a full page refresh.
                $('#approveAllClaims').submit();
            },
            null /* nothing needs to be done on cancel */
        );
    },

    validateDenyForm: function() {
        return G5.util.formValidate(this.$el.find('#ssiDenyClaim').find('.validateme'));
    },

    ajax: function(data) {
        var req,
            that = this;

        that.trigger('start:ajax', data);

        req = $.ajax({
            url: G5.props.URL_JSON_CLAIMS_UPDATE,
            type: 'post',
            data: data,
            dataType: 'g5json'
        });

        req.done( function(srvRes, txtStat, jqXHR) {
            var err = srvRes.getFirstError();
            if(err) {
                alert('error: '+err.text);
            } else {
                that.trigger('success:ajax', data, srvRes.data);
            }
        });

        req.always( function() {
            that.trigger('end:ajax');
        });
    },

    handleStartAjax: function(reqDat) {
        //TODO: figure out what/why this is here and update
    },

    handleSuccessAjax: function(reqDat, resDat) {
        var $bts = this.$el.find('.approveModeButtons[data-claim-id="'+reqDat.claimId+'"]'),
            $statCol = $bts.closest('tr').find('td.status');

        // kill the qtip
        this.$el.find('.ssiDenyClaimBtn').each( function() {
            var qt = $(this).data('qtip');
            if (qt) { qt.hide(); }
        });

        // set the status column
        if (reqDat.method == 'approve') {
            $('#ssiClaimApprovedModal').modal();
            $statCol.text($bts.find('.showOnApproved').text());
        } else if (reqDat.method == 'approveAll') {
            $('#ssiAllClaimsApprovedModal').modal();

            //remove approve all button
            this.$el.find('.ssiApproveAllClaimsBtn').remove();

            // remove any remove/deny buttons and show the approved
            // text in the status columns for approved claims
            $('#ssiApproveClaimsHistory tr').each(function(i, el) {
                var $this = $(this),
                    $statusCol = $this.find('.status'),
                    $btnCol = $this.find('.approveDenyBtns'),
                    apprText = $btnCol.find('.showOnApproved').text();

                if (apprText) {
                    $statusCol.text(apprText);
                    $btnCol.empty();
                }
            });
        } else {
            $('#ssiClaimDeniedModal').modal();
            $statCol.text($bts.find('.showOnDenied').text());
        }

        // hide buttons and what-not
        $bts.find('.hideOnSuccess').hide();
    },

    handleEndAjax: function() {
         //TODO: figure out what/why this is here and update
    }

});
