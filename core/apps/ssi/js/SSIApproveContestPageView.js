/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
PageView,
TemplateManager,
PaginationView,
SSIContestModel,
SSIApproveContestMembersCollectionView,
SSIApproveContestDetailsModel,
SSIApproveContestPageView:true
*/
SSIApproveContestPageView = PageView.extend({
    //override super-class initialize function
    initialize: function (opts) {
        'use strict';

        var detailTableJSON;

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

        this.summaryTplName = "ssiApproveContestSummary";
        this.detailsTplName = "ssiApproveContestDetails";
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';

        SSIContestModel.reformatDecimalStrings(opts.contestData);

        this.model = opts.contestData;
        this.detailsTableModel = new SSIApproveContestDetailsModel(this.model);

        G5.util.showSpin(this.$el, {cover:true});

        this.renderSummary();
        this.renderSpellcheck();
        this.updateContribComment();
    },

    events: {
        "click .ssiViewDetails": "renderDetails",
        "click .ssiBackToSummary": "renderSummary",
        "click .sortable a" : "handleTableSort",
        "change #ssiRankPayouts": "changePayoutOrg",
        "click .ssiDenyContestBtn": "addDenyPopover",
        "click .ssiObjectiveInfo": "addInfoPopover",
        "click .ssiApproverPopover": "addApproverPopover",
        'click .profile-popover': 'attachParticipantPopover',
        "keyup .contribCommentInp": "updateContribComment",
        "blur .contribCommentInp": "updateContribComment",
        "paste .contribCommentInp": "updateContribComment",
        "click .ssiDenyContestPopover .dropdown-menu li a": "doContribCommentSpellCheck",
        "click .ssiDenyContestSubmit": "validateDenyForm",
        "click .close": function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    renderSummary: function(){
        var $summaryCont = this.$el.find('#ssiApproveContestSummary'),
            $detailCont = this.$el.find('#ssiApproveContestDetails'),
            status = this.model.status,
            role = this.model.role,
            S = SSIContestModel.prototype.STATUSES,
            R = SSIContestModel.prototype.ROLES,
            that = this;

        // add variable to instruct template to render approve deny controls
        if(( (!role || role != R.CREATOR) && (!status || status == S.WAITING) ) ||
           (role == R.CREATOR && !(status == S.WAITING || status == S.FINALIZED || status == S.PENDING)) ) {
            this.model.showApproveDeny = true;
        }
        else {
            this.model.showApproveDeny = false;
        }

        $detailCont.hide();
        $summaryCont.show();

        TemplateManager.get(this.summaryTplName, function(tpl) {
            //attach the template to the DOM
            $summaryCont.empty().append(tpl(that.model));

            G5.util.hideSpin(that.$el);
        }, this.tplUrl);
    },

    renderDetails: function(e){
        var $detailCont = this.$el.find('#ssiApproveContestDetails'),
            $summaryCont = this.$el.find('#ssiApproveContestSummary'),
            $tar = $(e.currentTarget).data('detailsSection'),
            that = this;

        e.preventDefault();

        $summaryCont.hide();
        $detailCont.show();

        TemplateManager.get(this.detailsTplName, function(tpl) {
            //attach the template to the DOM
            $detailCont.empty().append(tpl(that.model));

            that.hideShowSections($tar);
        }, this.tplUrl);
    },

    renderDetailsTable: function(tarSect){
        var detailTableTpl,
            $detailTableCont,
            detailTableJSON,
            that = this;

        switch (tarSect){
            case "Objectives":
                detailTableTpl = "ssiApproveContestObjectiveTableTpl";
                $detailTableCont = this.$el.find('.ssiObjectivesTableTpl');
                detailTableJSON = G5.props.URL_JSON_SSI_DETAILS_OBJECTIVE_TABLE;

                break;
            case "Levels":
                detailTableTpl = "ssiApproveContestLevelsTableTpl";
                $detailTableCont = this.$el.find('.ssiLevelsTableTpl');
                detailTableJSON = G5.props.URL_JSON_SSI_DETAILS_LEVELS_TABLE;

                break;
            case "Invitees":
                this.renderInviteesTables();
                return false;

            case "Ranks":
                detailTableTpl = "ssiApproveContestRanksTableTpl";
                $detailTableCont = this.$el.find('.ssiRanksTableTpl');
                detailTableJSON = G5.props.URL_JSON_SSI_DETAILS_RANKS_TABLE;

                break;
            default:
                return false;
        }

        this.detailsTableModel.loadTableData({url: detailTableJSON});

        this.detailsTableModel.on('loadDataFinished', function(){
            G5.util.hideSpin(that.$el);

            TemplateManager.get(detailTableTpl, function(tpl, vars, subTpls) {
                //attach the template to the DOM
                that.subTpls = subTpls;
                $detailTableCont.empty().append(tpl(that.detailsTableModel.attributes));

                that.$el.find('.table').responsiveTable();

                that.renderPagination();
            }, that.tplUrl);
        });
    },

    renderInviteesTables: function(){
        this.participantCollectionView = new SSIApproveContestMembersCollectionView({
            el : this.$el.find('#ssiParticipantTableTpl'),
            set: "participants",
            clientState: this.model.clientState
        });

        this.managersCollectionView = new SSIApproveContestMembersCollectionView({
            el : this.$el.find('#ssiManagersTableTpl'),
            set: "managers",
            clientState: this.model.clientState
        });
    },

    hideShowSections: function(target){
        var $section = this.$el.find('.ssiDetailsSection');

        $section.hide();
        this.$el.find('.ssiDetails'+target).show();

        this.renderDetailsTable(target);
    },

    renderPagination: function() {
        var that = this;

        // if our data is paginated, add a special pagination view
        if( this.detailsTableModel.attributes.total > this.detailsTableModel.attributes.paxPerPage ) {
            // if no pagination view exists, create a new one
            if( !this.paginationView ) {
                this.paginationView = new PaginationView({
                    el : this.$el.find('.paginationControls'),
                    pages : Math.ceil(this.detailsTableModel.attributes.total / this.detailsTableModel.attributes.paxPerPage),
                    current : this.detailsTableModel.attributes.currentPage,
                    per : this.detailsTableModel.attributes.paxPerPage,
                    total : this.detailsTableModel.attributes.total,
                    ajax : true,
                    showCounts : true,
                    tpl : this.subTpls.paginationTpl || false
                });

                this.paginationView.on('goToPage', function(page) {
                    that.paginationClickHandler(page);
                });

                this.detailsTableModel.on('loadDataFinished', function() {
                    that.paginationView.setProperties({
                        rendered : false,
                        pages : Math.ceil(that.detailsTableModel.attributes.total / that.detailsTableModel.attributes.paxPerPage),
                        current : that.detailsTableModel.attributes.currentPage
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

    paginationClickHandler: function(page) {
        G5.util.showSpin( this.$el, {
            cover : true
        });

        this.detailsTableModel.loadTableData({
            url: this.detailsTableModel.attributes.url,
            total : this.detailsTableModel.attributes.total,
            paxPerPage : this.detailsTableModel.attributes.paxPerPage,
            page : page,
            sortedOn : this.detailsTableModel.attributes.sortedOn,
            sortedBy : this.detailsTableModel.attributes.sortedBy
        });
    },

    handleTableSort: function(e) {
        var $tar = $(e.target).closest('.sortable'),
            sortOn = $tar.data('sortOn'),
            sortBy = $tar.data('sortBy');

        e.preventDefault();

        G5.util.showSpin( this.$el, {
            cover : true
        });

        this.detailsTableModel.loadTableData({
            url: this.detailsTableModel.attributes.url,
            total : this.detailsTableModel.attributes.total,
            paxPerPage : this.detailsTableModel.attributes.paxPerPage,
            sortedOn : sortOn,
            sortedBy : sortBy
        });
    },

    changePayoutOrg: function(e){
        var $val = $(e.currentTarget).val(),
            $name = this.$el.find('#ssiRankPayouts option:selected').attr('name');

        this.detailsTableModel.loadTableData({
            orgType: $name,
            orgValue: $val,
            url: this.detailsTableModel.attributes.url
        });
    },

    //Land of popovers
    addDenyPopover: function(e){
        var $tar = $(e.currentTarget),
            $cont = this.$el.find('.ssiDenyContestPopover');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, 'top right', 'bottom right');
        }
    },

    addInfoPopover: function(e){
        var $tar = $(e.currentTarget),
            $cont = this.$el.find('.ssiObjectiveInfoPopover');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, 'bottom center', 'top center');
        }
    },

    addApproverPopover: function(e){
        var $tar = $(e.currentTarget),
            $cont = $tar.closest('.ssiApproverLevel').find('.ssiApproverList');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, 'top center', 'bottom center');
        }
    },

    attachPopover: function($trig, cont, myPos, atPos){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: myPos,
                at: atPos,
                container: this.$el,
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
            }
        });
    },

    attachParticipantPopover:function(e){
        var $tar = $(e.target);

        //attach participant popovers
        if (!$tar.data('participantPopover')) {
            $tar.participantPopover().qtip('show');
        }

        e.preventDefault();
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

    validateDenyForm: function(){
        var $form = this.$el.find('#ssiADenyContest');

        if(!G5.util.formValidate($form.find('.validateme'))) {
            // invalid, was generic error, qtip visible (we use this below)
            return false;
        } else {
            $form.append("<input type='hidden' value=' "+ this.model.clientState +" ' name='clientState' />");
            return true;
        }
    }
});
