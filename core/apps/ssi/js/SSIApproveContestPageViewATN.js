/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
G5,
Backbone,
$,
_,
PageView,
TemplateManager,
SSIContestModel,
SSISharedPaginatedTableView,
SSIContestSummaryCollection,
SSIApproveContestPageViewATN:true
*/
SSIApproveContestPageViewATN = PageView.extend({

    initialize: function(opts) {
        'use strict';

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        // the model
        this.model = new Backbone.Model(opts.contestJson);

        this.render();

        this.setupEvents();
    },

    events: {
        "keyup .contribCommentInp": "updateContribComment",
        "click .commentTools .dropdown-menu li a": "doContribCommentSpellCheck",
        "click .ssiDenyContestBtn": "addDenyPopover",
        "click .ssiDenyContestSubmit": "doDenyContest",
        "click .ssiApproveContestBtn": "doApproveContest",
        "click .close": function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    setupEvents: function() {
        this.on('start:ajax', this.handleStartAjax, this);
        this.on('success:ajax', this.handleSuccessAjax, this);
        this.on('end:ajax', this.handleEndAjax, this);
    },

    render: function () {
        'use strict';

        var topTpl = 'ssiApproveContestAtnTop',
            detTpl = 'ssiApproveContestAtnDetails',
            that = this,
            data = this.model.toJSON();

        SSIContestModel.reformatDecimalStrings(data);

        // topper
        TemplateManager.get(topTpl, function(tpl) {
            that.$el.find('#ssiApproveContestSummary').append(tpl(data));
        });

        // details
        TemplateManager.get(detTpl, function(tpl) {
            that.$el.find('#ssiApproveContestDetails').append(tpl(data));
        });

        // history table
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

    // yanked from SSIContestSummary_ATN
    createHistoryTable: function () {
        'use strict';

        if (this.historyTable) {
            return this;
        }

        var keys = ['payoutType', 'totalParticipantsCount', 'totalActivity',
                    'totalPayoutAmount', 'sortedOn', 'sortedBy'],
            modelData = _.pick(this.model.toJSON(), keys);

        // this is for the template so it renders extra stuff for approval
        modelData.isApproveMode = true;

        this.historyTable = new (SSISharedPaginatedTableView.extend({
            // annoying work around for to rename a request property
            buildRequestData: function () {
                var res = SSISharedPaginatedTableView.prototype.buildRequestData.apply(this, arguments);
                res.contestId = res.id;
                delete res.id;
                return res;
            }
        }))({
            tpl: 'ssiContestSummaryTableTpl',
            collection: new SSIContestSummaryCollection(),
            el: this.$el.find('#ssiATNHistory'),
            parentView: this,
            modelData: modelData
        });

        return this;
    },

    addDenyPopover: function(e){
        var $tar = $(e.currentTarget),
            $cont = this.$el.find('.ssiDenyContestPopover'),
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
                event: cont.hasClass('ssiDenyContestPopover') ? 'click' : 'unfocus',
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
            this.$el.find(".contribCommentWrapper").append('<div class="badwordsContainer"><div class="badwordsWrapper"><div class="badwordsContent" /></div></div>');
        }

        $badWords = this.$el.find('.contribCommentWrapper .badwordsContent');

        $comment.spellchecker({
            url: G5.props.spellcheckerUrl,
            lang: lang,
            localization : localization,
            engine: "jazzy",
            suggestBoxPosition: "above",
            innerDocument: false,
            wordlist: {
                action: "html",
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

    doApproveContest: function(e) {
        var contId = $(e.target).data('contestId'),
            reqDat = {
                method: 'approve',
                contestId: contId
            };

        e.preventDefault();

        this.ajax(reqDat);
    },

    doDenyContest: function(e) {
        var $tar = $(e.target),
            $tip = $tar.closest('.ui-tooltip.qtip'),
            contId = $tip.data('qtip').elements.target.data('contestId'),
            $form = this.$el.find('#ssiADenyContest'),
            serArr = $form.serializeArray(),
            reqDat = {},
            isValid = this.validateDenyForm();

        e.preventDefault();

        // serialize array returns an array of objects with name/value
        // let us convert to an object
        _.each(serArr, function(f) {
            reqDat[f.name] = f.value;
        });

        if(!isValid) { return; }

        reqDat.method = 'deny';
        reqDat.contestId = contId;

        this.ajax(reqDat);

    },

    validateDenyForm: function() {
        return G5.util.formValidate(this.$el.find('#ssiADenyContest').find('.validateme'));
    },

    ajax: function(data) {
        var req,
            that = this;

        that.trigger('start:ajax', data);

        req = $.ajax({
            url: G5.props.URL_JSON_CONTEST_ATN_APPROVE,
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
        //TODO - disable buttons and show spinnage
    },

    handleSuccessAjax: function(reqDat, resDat) {
        var $bts = this.$el.find('.approveModeButtons[data-contest-id="'+reqDat.contestId+'"]'),
            $statCol = $bts.closest('tr').find('td.status'),
            comment = reqDat.comment;

        // kill the qtip
        this.$el.find('.ssiDenyContestBtn').each( function() {
            var qt = $(this).data('qtip');
            if(qt){ qt.hide(); }
        });

        // set the status column
        if(reqDat.method == 'approve') {
            $statCol.text($bts.find('.showOnApproved').text());
        } else {
            $statCol.text($bts.find('.showOnDenied').text() + ' - ' +comment);
        }

        // hide buttons and what-not
        $bts.find('.hideOnSuccess').hide();
    },

    handleEndAjax: function() {
        //TODO - enable buttons and hide spinnage
    }
});
