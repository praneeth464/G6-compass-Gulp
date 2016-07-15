/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
console,
Modernizr,
Backbone,
G5,
TemplateManager,
ParticipantProfileSearchView:true
*/
ParticipantProfileSearchView = Backbone.View.extend({
    el: '#profile-global-participant-search',

    events: {
        'keydown .gps-name-input' : 'recipientSearchKeyController',
        'click .gpsResultWrapper' : 'clickParticipant',
        'click   .searchBtn'      : 'submitSearch'
    },

    //override super-class initialize function
    initialize: function(opts) {
        var self    = this,
            Timer   = (function(){
                        /*
                         *
                         * [1] Optional scope binding so `this` can refer to
                         *     a different object in the passed fn.
                         *
                         * [2] The function to be run once countdown is complete.
                         *
                         * [3] Default delay time.
                         *
                         * [4] Boolean flag for if the timer is currently timing.
                         *
                         * [5] Holder for the timer. Used by the browser to identify
                         *     the correct setTimeout()
                         *
                         * [6] This has to be wrapped in a function to preserve context
                         *
                         */

                        function Timer(fn, context){
                            this.context  = (context !== undefined)
                                                ? context
                                                : this; // [1]
                            this.fn       = fn;         // [2]
                            this.interval = 1000;       // [3]
                            this.isActive = false;      // [4]
                            this.timerId  = 0;          // [5]
                        }

                        Timer.prototype.restart = function(){
                            this.stop();
                            this.start();
                        };

                        Timer.prototype.start = function() {
                            var self = this;
                            this.isActive = true;
                            this.timerId = setTimeout(function(){ // [6]
                                self.complete();
                            }, this.interval);
                        };

                        Timer.prototype.stop = function(){
                            this.isActive = false;
                            clearTimeout(this.timerId);
                        };

                        Timer.prototype.complete = function(){
                            this.stop();
                            this.fn.call(this.context);
                        };
                        return Timer;
                      }());

        self.type = opts.type;
        self.appName = "globalParticipantSearch_profile";
        self.searchResultsViewTpl = opts.searchResultsViewTpl;
        // this.templateLoaded = false;

        this.$el.find('.gps-name-input').placeholder();

        // Check to see if there is already a timer made (make one if there isn't)
        if(!self.ajaxCallDelay) {
            var $input = self.$el.find(".gps-name-input");
            self.ajaxCallDelay = new Timer(function(){
                this.fetchRecipientList($input.val());
            }, self);
        }
    },

    recipientSearchKeyController: function(event) {
        /*
         *
         * General purpose function used to route advanced functions
         * when interacting with the search form via the keyboard.
         *
         * [1] Wait for the template to be loaded before we do anything.
         *
         * [2] Object of booleans to simplify checking on the key being used.
         *
         * [3] Holds the operations to be run when the enter key is pressed.
         *
         *     [3a] If there is currently a recipient selected, we're
         *          going to pass that information on from here assuming that
         *          the selected recipient is not locked.
         *
         *     [3b] Otherwise, we're going to stop the timer waiting for
         *          a search value and call the complete function.
         *
         * [4] Holds the operations for every key besides the enter key.
         *
         * [5] Operations for special keys
         *
         *     [5a] Stop trying to complete this section if there isn't
         *          a list of recipients to interact with yet.
         *
         *     [5b] Direction to move on the list of recipients
         *
         * [6] Default behavior for all other keys
         *
         */

        var self       = this,
            pressedKey = event.keyCode,
            checkKey   = function(key) {
                            return key === pressedKey;
                         },
            keyIs      = { // [2]
                            escape    : checkKey( 27 ),
                            backspace : checkKey(  8 ),
                            shiftKey  : checkKey( 16 ),
                            enterKey  : checkKey( 13 ),
                            downKey   : checkKey( 40 ),
                            tabKey    : checkKey(  9 ),
                            upKey     : checkKey( 38 )
                         };

        if (keyIs.enterKey) { // [3]

            event.preventDefault();

            if(!this.recipientListActiveIdLocked && this.recipientListActiveId !== undefined) { // [3a]
                this.submitParticipant(this.recipientListActiveId);
            } else { // [3b]
                this.submitSearch();
            }
        } else { // [4]
            if (keyIs.downKey || keyIs.upKey ||
                keyIs.tabKey  || keyIs.shiftKey) { // [5]

                event.preventDefault();

                if(!this.recipientList) { // [5a]
                    return;
                }

                var direction = 0; // [5b]

                if (keyIs.downKey) {
                    direction = 1;
                }

                if (keyIs.upKey) {
                    direction = -1;
                }

                if (keyIs.tabKey) {
                    direction = (event.shiftKey)
                                    ? -1
                                    :  1;
                }

                if (!keyIs.shiftKey) {
                    this.shiftHighlightedRecipient(direction);
                }
            } else if ( keyIs.backspace ) {
                // this.$el.find(".qtip").qtip("hide");
            } else if ( keyIs.escape ) {
                this.$el.closest(".qtip").qtip("hide");
            } else {
                this.recipientSearchAutocomplete();
            }
        }
    },
    submitSearch: function(event) {
        if ( event ) {

            event.preventDefault();

            if ( event.type === "click" ) {
                this.$el.find(".gps-name-input").focus();
            }
        }

        var $validate = this.$el.find('.validateme');

        if( !G5.util.formValidate($validate) ) {
            return false;
        }

        if (this.ajaxCallDelay) {
            this.ajaxCallDelay.complete();
        }
    },
    recipientSearchSpinner: function( opt ) {

        var self           = this,
            $spinnerWrap   = this.$el.find(".searchWrap"),
            $searchBtn     = $spinnerWrap.find(".searchBtn"),
            $searchSpinner = this.$searchSpinner || (function(){

                                var opts = {
                                                color : $searchBtn.find("i").css("color")
                                           };

                                self.$searchSpinner = $spinnerWrap.find(".spinnerWrap")
                                                        .show()
                                                        .spin(opts);

                                return self.$searchSpinner;
                             })();

        if ( opt === "stop" ) {
            $searchSpinner.hide();
            $searchBtn.show();
            //$searchBtn.removeAttr('disabled').removeClass('disabled');
        } else {
            this.$el.find(".qtip").qtip("hide");
            $searchSpinner.show()
            //.css('margin-right', $searchBtn.outerWidth());
            $searchBtn.hide();
            //$searchBtn.attr('disabled','disabled').addClass('disabled');
        }
    },
    recipientSearchAutocomplete: function() {
        /*
         *
         * Controls search timer delay functionality.
         *
         * [1] Grab data attributes set in the HTML
         *
         * [2] Exit this function if there aren't enough
         *     characters provided to make a meaningful ajax call.
         *
         * [3] Set the timer delay from the data attributes
         *
         */

        var self       = this,
            $input     = this.$el.find(".gps-name-input"),
            delay      = $input.data("autocomp-delay"),     // [1]
            minChars   = $input.data("autocomp-min-chars"); // [1]

        if ($input.val().length < minChars) { // [2]
            return;
        }

        this.recipientSearchSpinner();

        if (this.ajaxCallDelay) {
            this.ajaxCallDelay.interval = delay || 1000; // [3]
        }

        if(this.ajaxCallDelay.isActive) {
            this.ajaxCallDelay.restart();
        } else {
            this.ajaxCallDelay.start();
        }
    },
    fetchRecipientList: function(value) {

        if(!value) {
            return;
        }

        var self          = this,
            params        = { lastName : value },
            requestedData = null;

        requestedData = $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_PARTICIPANT_GLOBAL_SEARCH_AUTOCOMPLETE,
            data: params,
            success: function(serverResp){
                console.log("[INFO] EZRecognitionCollection: requestRecipientList ajax call successfully returned this JSON object: ", serverResp.data);

                console.log("serverResp.data.participants", serverResp.data.participants);
                self.recipientList = _.map(serverResp.data.participants, function( object, key ) {
                    return _.extend(object, { index: key });
                });

                self.renderRecipientList();
            },
            complete: function() {
                self.recipientSearchSpinner("stop");
            }
        });

        requestedData.fail(function(jqXHR, textStatus) {
            console.log( "[INFO] loadActivityFeed: loadActivityFeed Request failed: " + textStatus );
        });
    },
    renderRecipientList: function() {

        /*
         *
         * [1] Create a copy of each object so propeties for
         *     templating don't pollute actual object.
         *
         * [2] Tweak recipientList data to include the nodeId
         *     as a direct property for templating.
         *
         * [3] Reset active recepient list item to be unselected.
         *
         * [4] Work-around to fix z-index/stacking issues.
         *
         */

        var self    = this,
            obj     = null,
            data    = _.map(this.recipientList, function( object, key ) {
                        obj = _.clone(object);
                        return obj;
                      }),
            $list  = this.$el.find("#gps-form .searchList").html(''),
            templateText = self.searchResultsViewTpl(data);

        $list.html(templateText);
        this.recipientListActiveId = undefined; // [3]

    },

    shiftHighlightedRecipient: function(shiftDirection) {
        /*
         *
         * Helper function used to toggle through the list of recipients
         * one by one either forward or backwards. Used to generalize the
         * use of up and down as well as tab and tab+shift keys.
         *
         * [1] Set to -1 so increasing it by 1 selects the first item
         *     in a zero based array.
         *
         * [2] Make the array length zero based.
         *
         * [3] Ensures function success even if paramters aren't passed.
         *
         * [4] Check to see if we're modifying or setting the value.
         *
         * [5] Allows for continuous looping when an end is reached.
         *
         * [6] Set state-like settings.
         *
         * [7] Update html/css to show active product in list.
         *
         */

        var id     = -1, // [1]
            length = this.recipientList.length - 1; // [2]

        if (shiftDirection === undefined) { // [3]
            shiftDirection = 1;
        }

        if (this.recipientListActiveId === undefined) { // [4]
            id = id + shiftDirection;
        } else {
            id = this.recipientListActiveId + shiftDirection;
        }

        if (id < 0) { // [5]
            id = length;
        }

        if (id > length) { // [5]
            id = 0;
        }

        this.recipientListActiveId = id; // [6]

        var $selected    = this.$el.find(".gpsResultWrapper") // [7]
                            .removeClass("selected")
                            .parent().find('[data-tabindex="' + id + '"]')
                            .addClass("selected"),
            elBottom     = $selected.offset().top + $selected.height(),
            windowTop    = $(window).scrollTop(),
            windowBottom = windowTop + window.innerHeight;

        this.recipientListActiveIdLocked = $selected.hasClass('locked');

        if ( elBottom > windowBottom ) {
            $(window).scrollTo(windowTop + Math.abs(elBottom - windowBottom) + 20, 100);
        }
    },

    clickParticipant: function(event) {
        /*
         *
         * Clicking on an item in the autocompleted list.
         *
         */

        var $tar = $(event.currentTarget),
            index;

        if ( !$tar.hasClass('locked') ) {
            index = $tar.data("tabindex");
            this.submitParticipant(index);
        }
    },

    submitParticipant: function( index ) {
        var participantUrl = _.where(this.recipientList, {'index': index })[0].participantUrl;

        window.location.assign(participantUrl);
    }

});