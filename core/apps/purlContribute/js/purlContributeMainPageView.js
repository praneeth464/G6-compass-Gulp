/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
$,
_,
console,
G5,
PageView,
PurlContributeCollection,
PurlContributeMainPageView:true
*/
PurlContributeMainPageView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts) {
        console.log('[INFO] PurlContributeMainPageView: PURL Contribute Main Page view initialized', this);

        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = "purlContribute";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.model = new PurlContributeCollection();

        this.model.bindInviteButton(thisView);

        this.model.bindVideoPhotoCommentLinks(thisView);

        this.model.bindCommentSubmitBtn(thisView);

        this.model.bindThankButton();

        this.model.bindPrintLink();

        //load the activities for the activity feed
        this.model.loadActivityFeed();

        //check to see if we need the welcome modal
        this.model.checkForEmailDirected(thisView);

        this.model.on('loadActivityFeedFinished', function(activityPods) {
            console.log('[INFO] PurlContributeMainPageView: load Activity Feed finished', thisView);

            //now that we have the acvtivites, render them
            this.model.renderActivityFeed(null, activityPods, thisView, false);
        }, this);

        this.renderSpellChecker();

        this.model.checkForAuthenticated();
    },

    renderSpellChecker: function() {

        var thisView = this,
            $theCommentBox = this.$el.find("#PURLCommentBox textarea"),
            $theButton = this.$el.find("#PURLCommentCheckSpell"),
            langs = '';

        // add the spellchecker menu
        // start building our HTML string
        langs = '<li class="check">'+$theButton.find('.btn').attr('title')+'</li>';

        // add a class to the LI parent of the check spelling button
        //$(this.toolbar).find('.checkSpelling').parent().addClass('spellchecker');

        // append each language listed in the spellCheckerLocalesToUse array
        $.each(G5.props.spellCheckerLocalesToUse, function(i,v) {
            if( G5.props.spellCheckerLocalization[v] ) {
                langs += '<li class="lang '+v+'" data-lang="'+v+'"><a>'+G5.props.spellCheckerLocalization[v].menu+'</a></li>';
            }
        });
        // append each language (skipping plain English)
        // $.each(G5.props.spellCheckerLocalization, function(i,v) {
        //     if( i != 'en' ) {
        //         langs += '<li class="lang '+i+'" data-lang="'+i+'"><a>'+v.menu+'</a></li>';
        //     }
        // });

        // append the menu to the "Check Spelling" toolbar button
       $theButton.find('.langs').append(langs);

        // hide it
        //$(this.toolbar).find('.langs').addClass('hide');

        // bind click events to the list items we just added
        $theButton.find('.langs .lang').on('click', function(e) {
            var lang = $(this).data('lang') || $theCommentBox.data('localization') || 'en',
                localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ lang ]);

            // add the target for the badwords box
            if( !thisView.$el.find('#PURLCommentBox .badwordsContainer').length ) {
                $theCommentBox.after('<div class="badwordsContainer"><div class="badwordsWrapper"><div class="badwordsContent" /></div></div>');
            }

            // initiate the spellchecker
            $theCommentBox
                .spellchecker({
                    url: G5.props.spellcheckerUrl,
                    lang: lang,
                    localization : localization,
                    engine: "jazzy",
                    suggestBoxPosition: "above",
                    innerDocument: false,
                    wordlist: {
                        action: "html",
                        element: thisView.$el.find('#PURLCommentBox .badwordsContent')
                    }
                })
            // and call the spellchecker
            .spellchecker("check", {
                callback : function(result){
                    if(result===true) {
                        thisView.$el.find('#PURLCommentBox .spellcheck-badwords').remove();
                        alert(localization.noMisspellings);
                    }
                    else {
                        thisView.$el.find('#PURLCommentBox .spellcheck-badwords')
                            .prepend('<strong>'+localization.menu+':</strong>')
                            .append('<a class="close"><i class="icon-remove" /></a>');
                    }
                },
                localization : lang
            });

            // hide the languages menu after we send off the request
            //$(this).parents('.langs').addClass('hide');
        });

        // add a click handler for the badwords box close
        this.$el.find('#PURLCommentBox').on('click', '.spellcheck-badwords .close', function() {
            thisView.$el.find('#PURLCommentBox .spellcheck-badwords').remove();
        });

    }
});