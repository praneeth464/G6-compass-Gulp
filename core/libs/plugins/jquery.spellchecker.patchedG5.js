/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
confirm,
jQuery,
_,
G5
*/

/*
 * jquery.spellchecker.js - a simple jQuery Spell Checker
 * Copyright (c) 2009 Richard Willis
 * MIT license  : http://www.opensource.org/licenses/mit-license.php
 * Project      : http://jquery-spellchecker.googlecode.com
 * Contact      : willis.rh@gmail.com
 */

/*
===== G5 patch info =====
(find all instances of G5-related patches by searching the code for "G5 patch")

1. Added support for localization of JS-generated strings
2. Added support for the JazzySpellCheck library
=========================
*/

(function($){

    $.fn.extend({

        spellchecker : function(options, callback){
            return this.each(function(){
                var obj = $(this).data('spellchecker');
                if (obj && String === options.constructor && obj[options]) {
                    obj[options](callback);
                } else if (obj) {
                    obj.init();
                } else {
                    $(this).data('spellchecker', new SpellChecker(this, (Object === options.constructor ? options : null)));
                    (String === options.constructor) && $(this).data('spellchecker')[options](callback);
                }
            });
        }
    });

    var SpellChecker = function(domObj, options) {
        this.options = $.extend({
            url: 'checkspelling.php',   // default spellcheck url
            lang: 'en',         // default language
            // ===== G5 patch start ===== //
            localization : G5.props.spellCheckerLocalization.en,
            // ===== G5 patch end ===== //
            engine: 'pspell',       // pspell or google (G5 patch: or jazzy)
            addToDictionary: false,     // display option to add word to dictionary (pspell only)
            wordlist: {
                action: 'after',    // which jquery dom insert action
                element: domObj     // which object to apply above method
            },
            suggestBoxPosition: 'below',    // position of suggest box; above or below the highlighted word
            innerDocument: false        // if you want the badwords highlighted in the html then set to true
        }, options || {});
        this.$domObj = $(domObj);
        this.elements = {};
        this.init();
    };

    SpellChecker.prototype = {

        init : function(){
            var self = this;
            this.createElements();
            this.$domObj.addClass('spellcheck-container');
            // hide the suggest box on document click
            $(document).bind('click', function(e){
                (!$(e.target).hasClass('spellcheck-word-highlight') &&
                !$(e.target).parents().filter('.spellcheck-suggestbox').length) &&
                self.hideBox();
            });
        },

        // checks a chunk of text for bad words, then either shows the words below the original element (if texarea) or highlights the bad words
        // ===== G5 patch start ===== //
        // check : function(callback){
        check : function(opts){
            var callback = opts.callback;

            this.options.lang = opts.localization || this.options.lang;
            this.options.localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ this.options.lang ]);
        // ===== G5 patch end ===== //

            var self = this, node = this.$domObj.get(0).nodeName,
            tagExp = '<[^>]+>',
            puncExp = '^[^a-zA-Z\\u00A1-\\uFFFF]|[^a-zA-Z\\u00A1-\\uFFFF]+[^a-zA-Z\\u00A1-\\uFFFF]|[^a-zA-Z\\u00A1-\\uFFFF]$|\\n|\\t|\\s{2,}';

            if (node == 'TEXTAREA' || node == 'INPUT') {
                this.type = 'textarea';
                var text = $.trim(
                    this.$domObj.val()
                    .replace(new RegExp(tagExp, 'g'), '')   // strip html tags
                    .replace(new RegExp(puncExp, 'g'), ' ') // strip punctuation
                );
            } else {
                this.type = 'html';
                var text = $.trim(
                    // ===== G5 patch start ===== //
                    // this unfortunately has problems with not knowing to make a space between closing and opening tags. For instance, <p>foo</p><ul><li>bar</li></ul> sends "foobar" to the spellchecker instead of "foo","bar"
                    // this.$domObj.text()
                    // instead, we'll get the HTML and then do surgery on the block-level tags we can reasonably expect to find
                    this.$domObj.html().toString()
                    .replace(new RegExp('</*(p|div|ul|ol|li|blockquote|br)>', 'gi'), " ") // replace these tags with spaces
                    .replace(new RegExp(tagExp, 'g'), '')   // strip all other html tags
                );
                text = $('<div />') // create a dummy dom element...
                    .html(text) //...into which we insert the surgeryed text
                    .text() // then get the raw text
                    .replace(new RegExp(puncExp, 'g'), " "); // strip punctuation
                    // ===== G5 patch end ===== //
            }
            this.postJson(this.options.url, {
                // ===== G5 patch start ===== //
                method: ( this.options.engine == 'jazzy' ) ? 'checkWords' : null,
                // ===== G5 patch end ===== //
                text: encodeURIComponent(text).replace(/%20/g, '+')
            }, function(json){
                self.type == 'html' && self.options.innerDocument ?
                self.highlightWords(json, callback) :
                self.buildBadwordsBox(json, callback);
            });
        },

        highlightWords : function(json, callback) {
            if (!json.length) { callback.call(this.$domObj, true); return; }

            var self = this, html = this.$domObj.html();

            $.each(json, function(key, replaceWord){
                html = html.replace(
                    new RegExp('([^a-zA-Z\\u00A1-\\uFFFF])('+replaceWord+')([^a-zA-Z\\u00A1-\\uFFFF])', 'g'),
                    '$1<span class="spellcheck-word-highlight">$2</span>$3'
                );
            });
            this.$domObj.html(html).find('.spellcheck-word-highlight').each(function(){
                self.elements.highlightWords.push(
                    $(this).click(function(){
                        self.suggest(this);
                    })
                );
            });
            (callback) && callback();
        },

        buildBadwordsBox : function(json, callback){
            if (!json.length) { callback.call(this.$domObj, true); return; }

            var self = this, words = [];

            // insert badwords list into dom
            $(this.options.wordlist.element)[this.options.wordlist.action](this.elements.$badwords);

            // empty the badwords container
            this.elements.$badwords.empty();

            // append incorrectly spelt words
            $.each(json, function(key, badword) {
                if ($.inArray(badword, words) === -1) {
                    self.elements.highlightWords.push(
                        $('<span class="spellcheck-word-highlight">'+badword+'</span>')
                        .click(function(){ self.suggest(this); })
                        .appendTo(self.elements.$badwords)
                        .after('<span class="spellcheck-sep">,</span> ')
                    );
                    words.push(badword);
                }
            });
            $('.spellcheck-sep:last', self.elements.$badwords).addClass('spellcheck-sep-last');
            (callback) && callback();
        },

        // gets a list of suggested words, appends to the suggestbox and shows the suggestbox
        // ===== G5 patch start ===== //
        // suggest : function(word){
        suggest : function(opts){
            var callback = opts.callback;

            this.options.lang = opts && opts.localization || this.options.lang;
            this.options.localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ this.options.lang ]);

            var self = this, $word = $(opts), offset = $word.offset();
        // ===== G5 patch end ===== //
            this.$curWord = $word;

            if (this.options.innerDocument) {
                this.elements.$suggestBox = this.elements.$body.find('.spellcheck-suggestbox');
                this.elements.$suggestWords = this.elements.$body.find('.spellcheck-suggestbox-words');
                this.elements.$suggestFoot = this.elements.$body.find('.spellcheck-suggestbox-foot');
            }

            this.elements.$suggestFoot.hide();
            this.elements.$suggestBox
            .stop().hide()
            .css({
                opacity: 1,
                width: "auto",
                left: offset.left + "px",
                top:
                    (this.options.suggestBoxPosition == "above" ?
                    (offset.top - ($word.outerHeight() + 10)) + "px" :
                    (offset.top + $word.outerHeight()) + "px")
            }).fadeIn(200);

            // ===== G5 patch start ===== //
            this.elements.$suggestWords.html('<em>' + this.options.localization.loading + '</em>');
            // this.elements.$suggestWords.html('<em>Loading..</em>');
            // ===== G5 patch end ===== //

            this.postJson(this.options.url, {
                // ===== G5 patch start ===== //
                method: ( this.options.engine == 'jazzy' ) ? 'getSuggestions' : null,
                // ===== G5 patch end ===== //
                suggest: encodeURIComponent($.trim($word.text()))
            }, function(json){
                self.buildSuggestBox(json, offset);
            });
        },

        buildSuggestBox : function(json, offset){

            var self = this, $word = this.$curWord;

            this.elements.$suggestWords.empty();

            // build suggest word list
            for(var i=0; i < (json.length < 5 ? json.length : 5); i++) {
                this.elements.$suggestWords.append(
                    $('<a href="#">'+json[i]+'</a>')
                    .addClass((!i?'first':''))
                    .click(function(){ return false; })
                    .mousedown(function(e){
                        e.preventDefault();
                        self.replace(this.innerHTML);
                        self.hideBox();
                    })
                );
            }

            // no word suggestions
            // ===== G5 patch start ===== //
            (!i) && this.elements.$suggestWords.append('<em>' + this.options.localization.nosuggestions + '</em>');
            // (!i) && this.elements.$suggestWords.append('<em>(no suggestions)</em>');
            // ===== G5 patch end ===== //

            // get browser viewport height
            var viewportHeight = window.innerHeight ? window.innerHeight : $(window).height();

            this.elements.$suggestFoot.show();

            // position the suggest box
            self.elements.$suggestBox
            .css({
                top :   (this.options.suggestBoxPosition == 'above') ||
                    (offset.top + $word.outerHeight() + this.elements.$suggestBox.outerHeight() > viewportHeight + 10) ?
                    (offset.top - (this.elements.$suggestBox.height()+5)) + "px" :
                    (offset.top + $word.outerHeight() + "px"),
                width : 'auto',
                left :  (this.elements.$suggestBox.outerWidth() + offset.left > $('body').width() ?
                    (offset.left - this.elements.$suggestBox.width()) + $word.outerWidth() + 'px' :
                    offset.left + 'px')
            });

        },

        // hides the suggest box
        hideBox : function(callback) {
            this.elements.$suggestBox.fadeOut(250, function(){
                (callback) && callback();
            });
        },

        // replace incorrectly spelt word with suggestion
        replace : function(replace) {
            switch(this.type) {
                case 'textarea': this.replaceTextbox(replace); break;
                case 'html': this.replaceHtml(replace); break;
            }
        },

        // replaces a word string in a chunk of text
        replaceWord : function(text, replace){
            return text
                .replace(
                    new RegExp("([^a-zA-Z\\u00A1-\\uFFFF]?)("+this.$curWord.text()+")([^a-zA-Z\\u00A1-\\uFFFF]?)", "g"),
                    '$1'+replace+'$3'
                )
                .replace(
                    new RegExp("^("+this.$curWord.text()+")([^a-zA-Z\\u00A1-\\uFFFF])", "g"),
                    replace+'$2'
                )
                .replace(
                    new RegExp("([^a-zA-Z\\u00A1-\\uFFFF])("+this.$curWord.text()+")$", "g"),
                    '$1'+replace
                );
        },

        // replace word in a textarea
        replaceTextbox : function(replace){
            this.removeBadword(this.$curWord);
            this.$domObj.val(
                this.replaceWord(this.$domObj.val(), replace)
            );
        },

        // replace word in an HTML container
        replaceHtml : function(replace){
            var words = this.$domObj.find('.spellcheck-word-highlight:contains('+this.$curWord.text()+')');
            if (words.length) {
                words.after(replace).remove();
            } else {
                $(this.$domObj).html(
                    this.replaceWord($(this.$domObj).html(), replace)
                );
                this.removeBadword(this.$curWord);
            }
        },

        // remove spelling formatting from word to ignore in original element
        ignore : function() {
            if (this.type == 'textarea') {
                this.removeBadword(this.$curWord);
            } else {
                this.$curWord.after(this.$curWord.html()).remove();
            }
        },

        // remove spelling formatting from all words to ignore in original element
        ignoreAll : function() {
            var self = this;
            if (this.type == 'textarea') {
                this.removeBadword(this.$curWord);
            } else {
                $('.spellcheck-word-highlight', this.$domObj).each(function(){
                    (new RegExp(self.$curWord.text(), 'i').test(this.innerHTML)) &&
                    $(this).after(this.innerHTML).remove(); // remove anchor
                });
                // ===== G5 patch start ===== //
                // seems to need this as well
                this.$curWord.after(this.$curWord.html()).remove();
                // ===== G5 patch end ===== //
            }
        },

        removeBadword : function($domObj){
            ($domObj.next().hasClass('spellcheck-sep')) && $domObj.next().remove();
            $domObj.remove();
            if (!$('.spellcheck-sep', this.elements.$badwords).length){
                this.elements.$badwords.remove();
            } else {
                $('.spellcheck-sep:last', this.elements.$badwords).addClass('spellcheck-sep-last');
            }
        },

        // add word to personal dictionary (pspell only)
        addToDictionary : function() {
            var self= this;
            this.hideBox(function(){
                // ===== G5 patch start ===== //
                confirm(self.options.localization.addToDictionaryStart + self.$curWord.text() + self.options.localization.addToDictionaryEnd) &&
                // confirm('Are you sure you want to add the word "'+self.$curWord.text()+'" to the dictionary?') &&
                // ===== G5 patch end ===== //
                self.postJson(self.options.url, { addtodictionary: self.$curWord.text() }, function(){
                    self.ignoreAll();
                    self.check();
                });
            });
        },

        // remove spell check formatting
        remove : function(destroy) {
            destroy = destroy || true;
            $.each(this.elements.highlightWords, function(val){
                this.after(this.innerHTML).remove();
            });
            this.elements.$badwords.remove();
                        this.elements.$suggestBox.remove();
            $(this.domObj).removeClass('spellcheck-container');
            (destroy) && $(this.domObj).data('spellchecker', null);
        },

        // sends post request, return JSON object
        postJson : function(url, data, callback){
            // ===== G5 patch start ===== //
            var self = this;

            if( this.options.engine == 'jazzy' ) {
                data = {
                    id : "c0",
                    method : data.method,
                    params : [
                        this.options.lang,
                        _.uniq( decodeURIComponent(data.text || data.suggest || '').split('+') )
                    ]
                };
                data = JSON.stringify(data);
            }
            else {
                data = $.extend(data, {
                    engine: this.options.engine,
                    lang: this.options.lang
                });
            }
            // ===== G5 patch end ===== //

            var xhr = $.ajax({
                type : 'POST',
                contentType : 'application/json',
                url : url,
                // ===== G5 patch start ===== //
                data : data,
                // data : $.extend(data, {
                //  engine: this.options.engine,
                //  lang: this.options.lang
                // }),
                // ===== G5 patch end ===== //
                processData : false,
                dataType : 'json',
                cache : false,
                error : function(XHR, status, error) {
                    // ===== G5 patch start ===== //
                    alert(self.options.localization.postJsonError);
                    // alert('Sorry, there was an error processing the request.');
                    // ===== G5 patch end ===== //
                },
                success : function(json){
                    // ===== G5 patch start ===== //
                    if( self.options.engine == 'jazzy' ) {
                        // the following two lines show how responses come back from JazzySpellCheck
                        // for method : "checkWords"     -- {"id":null,"result":["Herer","somme","speldt","wordss"],"error":null}
                        // for method : "getSuggestions" -- {"id":null,"result":["Hearer","Herder","Here","Serer","Merer","Hirer","Hewer","Heres","Here r","Herr","serer","merer"],"error":null}
                        json = json.result;
                    }
                    // ===== G5 patch end ===== //
                    (callback) && callback(json);
                }
            });
            return xhr;
        },

        // create the spellchecker elements, prepend to body
        createElements : function(){
            var self = this;

            this.elements.$body = this.options.innerDocument ? this.$domObj.parents().filter('html:first').find("body") : $('body');
            this.elements.highlightWords = [];
            this.elements.$suggestWords = this.elements.$suggestWords ||
                $('<div></div>').addClass('spellcheck-suggestbox-words');
            this.elements.$ignoreWord = this.elements.$ignoreWord ||
                // ===== G5 patch start ===== //
                // $('<a href="#">Ignore Word</a>')
                $('<a href="#" class="ignoreWord">'+this.options.localization.ignoreWord+'</a>')
                // ===== G5 patch end ===== //
                .click(function(e){
                    e.preventDefault();
                    self.ignore();
                    self.hideBox();
                });
            this.elements.$ignoreAllWords = this.elements.$ignoreAllWords ||
                // ===== G5 patch start ===== //
                // $('<a href="#">Ignore all</a>')
                $('<a href="#" class="ignoreAll">'+this.options.localization.ignoreAll+'</a>')
                // ===== G5 patch end ===== //
                .click(function(e){
                    e.preventDefault();
                    self.ignoreAll();
                    self.hideBox();
                });
            this.elements.$ignoreWordsForever = this.elements.$ignoreWordsForever ||
                // ===== G5 patch start ===== //
                // $('<a href="#" title="ignore word forever (add to dictionary)">Ignore forever</a>')
                $('<a href="#" class="ignoreForever" title="'+this.options.localization.ignoreForeverTitle+'">'+this.options.localization.ignoreForever+'</a>')
                // ===== G5 patch end ===== //
                .click(function(e){
                    e.preventDefault();
                    self.addToDictionary();
                    self.hideBox();
                });
            this.elements.$suggestFoot = this.elements.$suggestFoot ||
                $('<div></div>').addClass('spellcheck-suggestbox-foot')
                .append(this.elements.$ignoreWord)
                .append(this.elements.$ignoreAllWords)
                .append(this.options.engine == "pspell" && self.options.addToDictionary ? this.elements.$ignoreWordsForever : false);
            this.elements.$badwords = this.elements.$badwords ||
                $('<div></div>').addClass('spellcheck-badwords');
            this.elements.$suggestBox = this.elements.$suggestBox ||
                $('<div></div>').addClass('spellcheck-suggestbox')
                .append(this.elements.$suggestWords)
                .append(this.elements.$suggestFoot)
                .prependTo(this.elements.$body);
        }
    };

})(jQuery);
