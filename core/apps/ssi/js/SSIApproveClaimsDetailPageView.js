/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
PageView,
Handlebars,
SSIContestModel,
SSIApproveClaimsDetailPageView:true
*/
SSIApproveClaimsDetailPageView = PageView.extend({

    // NOTE: This view was based off of SSIAproveContestPageView.js

    //override super-class initialize function
    initialize: function (opts) {
        'use strict';

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

        this.summaryTplName = "ssiApproveClaimsSummary";
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';

        SSIContestModel.reformatDecimalStrings(opts.claimData);

        this.model = opts.claimData;

        G5.util.showSpin(this.$el, {cover:true});

        this.renderSummary();
        this.renderSpellcheck();
        this.updateContribComment();
    },

    events: {
        "click .ssiBackToSummary": "renderSummary",
        "click .ssiDenyClaimBtn": "addDenyPopover",
        "click .ssiApproverPopover": "addApproverPopover",
        "keyup .contribCommentInp": "updateContribComment",
        "blur .contribCommentInp": "updateContribComment",
        "paste .contribCommentInp": "updateContribComment",
        "click .ssiDenyClaimPopover .dropdown-menu li a": "doContribCommentSpellCheck",
        "click .ssiDenyClaimSubmit": "validateDenyForm",
        "click .close": function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    renderSummary: function(){
        var $summaryCont = this.$el.find('#ssiApproveClaimsSummary'),
            tpl = Handlebars.compile($('#ssiApproveClaimSummaryTpl').html());

        $summaryCont.empty().append(tpl(this.model));
    },

    addDenyPopover: function(e){
        var $tar = $(e.currentTarget),
            $cont = this.$el.find('.ssiDenyClaimPopover');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, 'top right', 'bottom right');
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
            }
        });
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
        var $form = this.$el.find('#ssiDenyClaim');

        if(!G5.util.formValidate($form.find('.validateme'))) {
            // invalid, was generic error, qtip visible (we use this below)
            return false;
        } else {
            $form.append("<input type='hidden' value=' "+ this.model.clientState +" ' name='clientState' />");
            return true;
        }
    }
});
