/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
PageView,
CelebrationManagerMessagePageView:true
*/
CelebrationManagerMessagePageView = PageView.extend({

    //override super-class initialize function
    initialize: function (opts) {
        var self = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'celebration';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);


        this.updateManagerMessage();
        this.renderSpellcheck();
        
    },
    events:{
        "keyup .managerMessageInp": "updateManagerMessage",
        "blur .managerMessageInp": "updateManagerMessage",
        "paste .managerMessageInp": "updateManagerMessage",
        "click .celebrationMessageContainer .dropdown-menu li a": "doManagerMessageSpellCheck",
        "click .managerMessageBadWords .close": "doCloseManagerMessagesBadWords",
        "click .celebrationMessageSubmit": "confirmSubmit",
        "click .confirmBtn": "submitForm",
        "click .celebrationMessageCancel": "doCancelForm",
        "click .cancelBtn": function(e){
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
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
    updateManagerMessage: function() {
        var $inp = this.$el.find('.managerMessageInp'),
            maxChars = parseInt($inp.attr('maxlength'),10),
            $remChars = this.$el.find('.commentTools .remChars');

        // enforce maxlength (ie only)
        if($.browser.msie && $inp.val().length > maxChars) {
            $inp.val( $inp.val().slice(0,maxChars));
        }

        // remaining chars
        $remChars.text($.format.number(maxChars-$inp.val().length));
    },
    doManagerMessageSpellCheck: function(e) {
        var $tar = $(e.currentTarget),
            lang = $tar.attr('href'),
            localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ lang ]),
            $comment = this.$el.find('.managerMessageInp'),
            $badWordsWrap = this.$el.find('.managerMessageBadWords'),
            $badWords = this.$el.find('.managerMessageBadWords span');
        e.preventDefault();

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
            callback: function(res) {
                $badWords.find('.spellcheck-badwords')
                    .prepend('<strong>'+localization.menu+': </strong>');
                $badWordsWrap.slideDown();
            }
        });
    },
    doCloseManagerMessagesBadWords: function(e) {
        e.preventDefault();
        this.$el.find('.managerMessageBadWords').slideUp();
    },
    attachPopover: function($trig, cont, $container){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'left center',
                at: 'right center',
                container: $container
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
    confirmSubmit: function(e){
        var $tar = $(e.currentTarget),
            $cancelDialog = this.$el.find('.confirmFormSubmit');
        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cancelDialog, this.$el);
        }
    },
    submitForm: function(e){
        var data = this.$el.find('form').serializeArray();

        e.preventDefault();

        if(this.validateForm()){
            this.$el.find('.sendForm').submit();
        }
    },
    validateForm: function(){
        var $form = this.$el.find('form');

        if(!G5.util.formValidate($form.find('.validateme'))) {
            // invalid, was generic error, qtip visible (we use this below)
            return false;
        } else {
            return true;
        }
    },
    doCancelForm: function(){
        var $btn = this.$el.find(".celebrationMessageCancel");

        if($btn.data('url')) {
            e.preventDefault();
            window.location = $btn.data('url');
        }
    }
});