/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
PageView,
TemplateManager,
SSIContestModel,
SSISharedPaginatedTableView,
SSIContestPayoutDetailsCollection,
SSIContestPayoutDetails_ATN: true
*/
SSIContestPayoutDetails_ATN = PageView.extend({
    tpl: 'ssiATNPayoutDetails',

    initialize: function(opts) {
        'use strict';

        // this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass PageView
        this.events = _.extend({}, PageView.prototype.events, this.events);

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        this.tplPath = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'ssi/tpl/';

        // the model
        this.model = new Backbone.Model(opts.contestJson);

        this.render();
    },

    events: {
        "click .ssiDenyContestBtn": "addDenyPopover",
        "keyup .contribCommentInp": "updateContribComment",
        "blur .contribCommentInp": "updateContribComment",
        "paste .contribCommentInp": "updateContribComment",
        "click .ssiApproverPopover": "addApproverPopover",
        "click .spellchecker .dropdown-menu li a": "doContribCommentSpellCheck",
        "click .ssiDenyContestSubmit": "validateDenyForm"
    },

    render: function () {
        'use strict';

        TemplateManager.get(this.tpl, _.bind(function(tpl) {
            var json = this.model.toJSON();

            SSIContestModel.reformatDecimalStrings(json);

            json.isApproveMode = json.status == SSIContestModel.prototype.STATUSES.WAITING && json.canApprove;

            this.$el.find('#ssiATNPayoutDetails').append(tpl(json));
            this.createHistoryTable();

            this.renderSpellcheck();
            this.updateContribComment();

        }, this), this.tplPath);

        return this;
    },

    createHistoryTable: function () {
        'use strict';

        if (this.historyTable) {
            return this;
        }

        var keys = ['totalActivity', 'totalPayoutAmount', 'sortedOn', 'sortedBy', 'payoutType'],
            modelData = _.pick(this.model.toJSON(), keys);

        this.historyTable = new SSISharedPaginatedTableView({
            tpl: 'ssiContestPayoutDetailsTableTpl',
            // collection: new SSIContestSummaryCollection(),
            collection: new SSIContestPayoutDetailsCollection({
                parentView: this
            }),
            el: this.$el.find('#ssiATNHistory'),
            parentView: this,
            modelData: modelData
        });

        return this;
    },

    // ******************************************************************
    // approve mode stuff below ripped off from SSIApproveContestPageView
    // ******************************************************************
    addDenyPopover: function(e){
        var $tar = $(e.currentTarget),
            $cont = this.$el.find('.ssiDenyContestPopover');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, 'top center', 'bottom center');
        }
    },

    addApproverPopover: function(e){
        var $tar = $(e.currentTarget),
            $cont = $tar.closest('.ssiApproverLevel').find('.ssiApproverList');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cont, 'left center', 'right center');
        }
    },

    attachPopover: function($trig, cont, myPos, atPos){
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
    },

    renderSpellcheck: function() {
        var $langs = this.$el.find('.commentTools .spellchecker .dropdown-menu');

        if(!$langs.length) { return; } // only if its exists somewhere

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

        if(!$inp.length) { return; } // only for existing

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
