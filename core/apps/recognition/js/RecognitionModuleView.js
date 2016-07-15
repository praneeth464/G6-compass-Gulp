/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
console,
Modernizr,
G5,
ModuleView,
RecognitionEzView,
RecognitionModuleView:true
*/
RecognitionModuleView = ModuleView.extend({

    //override super-class initialize function
    events: {
        'keydown .recognitionNameInput'         : 'recipientSearchKeyController',
        'click   .moduleRecipWrapper'           : 'clickRecipient',
        'submit  #nameFilter'                   : 'submitSearch',
        'click   .searchBtn'                    : 'submitSearch'
    },
    initialize: function(opts) {
        console.log('[INFO] RecognitionModuleView: RecognitionModule View initialized', this);

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

        // set the appname (getTpl() method uses this)
        this.appName = "recognition";

        this.isFromModal = ( !!opts ) ? opts.fromModule : false;

        // allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions', [
            { w : 1, h : 1 }, // icon-only - smallest
            { w : 2, h : 1 }, // icon+title
            { w : 2, h : 2 }, // 2x2 square
            { w : 4, h : 2 }, // half-size big
            { w : 4, h : 4 }  // biggest
        ] , { silent : true });

        // this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        // inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        // if the window has had to be scrolled in order to show the menu options dealy
        this.hasScrolled = false;

        //
        this.templateLoaded = false;
        this.on('templateLoaded', function() {
            // Check to see if there is already a timer made (make one if there isn't)
            if(!self.ajaxCallDelay) {
                var $input = self.$el.find(".recognitionNameInput");
                self.ajaxCallDelay = new Timer(function(){
                    this.fetchRecipientList($input.val());
                }, self);
            }

            // resize the text to fit
            // the delay is to wait for custom fonts to load
            G5.util.textShrink( this.$el.find('.wide-view .recognition-module-wrapper label') );
            _.delay(G5.util.textShrink, 100, this.$el.find('.wide-view .recognition-module-wrapper label'));

            this.bindAdvancedToolTip();

            this.templateLoaded = true;
        });

        // resize the text to fit
        this.moduleCollection.on('filterChanged', function() {
            G5.util.textShrink( this.$el.find('.wide-view .recognition-module-wrapper label') );
        }, this);


        if (!Modernizr.input.placeholder) {
            this.on('templateLoaded', function() {
                this.$el.find('input, textarea').placeholder();
            });
        }
    },
    bindAdvancedToolTip: function() {
        var that = this;

        this.$el.find(".ez-popover").qtip({
            content:{
                text: true
            },
            position:{
                my: 'right center',
                at: 'left center',
                viewport: that.$el,
                adjust: {
                    method: 'shift none'
                }
            },
            show:{
                // ready: true,
                event: 'click'
            },
            hide:{
                event: 'click mouseleave'
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
         *          going to pass that information on from here.
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

        if (!this.templateLoaded) { // [1]
            return;
        }


        var self       = this,
            pressedKey = event.keyCode,
            checkKey   = function(key) {
                            return key === pressedKey;
                         },
            keyIs      = { // [2]
                            backspace : checkKey(  8 ),
                            shiftKey  : checkKey( 16 ),
                            enterKey  : checkKey( 13 ),
                            downKey   : checkKey( 40 ),
                            tabKey    : checkKey(  9 ),
                            upKey     : checkKey( 38 )
                         };

        if (keyIs.enterKey) { // [3]

            event.preventDefault();

            if(this.recipientListActiveId !== undefined) { // [3a]
                this.submitRecipient(this.recipientListActiveId);
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
                this.$el.find(".qtip").qtip("hide");
            } else {
                this.recipientSearchAutocomplete();
            }
        }
    },
    submitSearch: function(event) {
        if ( event ) {

            event.preventDefault();

            if ( event.type === "click" ) {
                this.$el.find(".recognitionNameInput").focus();
            }
        }

        var $validate = this.$el.find('.validateme');

        if( !G5.util.formValidate($validate) ) {
            this.allowOverflow(true);
            return false;
        } else {
            this.allowOverflow(false);
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
        } else {
            this.$el.find(".qtip").qtip("hide");
            $searchSpinner.show();
            $searchBtn.hide();
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
            $input     = this.$el.find(".recognitionNameInput"),
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
            url: G5.props.URL_JSON_EZ_RECOGNITION_RECIPIENT_LIST,
            data: params,
            success: function(serverResp){
                console.log("[INFO] EZRecognitionCollection: requestRecipientList ajax call successfully returned this JSON object: ", serverResp.data);

                console.log("serverResp.data.participants", serverResp.data.participants);
                self.recipientList = _.sortBy(serverResp.data.participants, function(r){ return [r.lastName, r.firstName]; });
                self.recipientList = _.map(self.recipientList, function( object, key ) {
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
                        obj.nodeId = obj.nodes[0].id;
                        return obj;
                      }),
            $input  = this.$el.find(".recognitionNameInput");

        this.recipientListActiveId = undefined; // [3]

        $input.qtip({
            content:{
                text: this.subTpls.recipientListTemplate(data)
            },
            position:{
                my: 'top center',
                at: 'bottom center',
                container: this.$el
            },
            show:{
                ready: false,
                event: false
            },
            hide:{
                event: 'unfocus',
                fixed: true,
                delay: 200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light ezRecRecipListPopUp',
                tip: {
                    corner: true,
                    width : 20,
                    height: 10
                }
            },
            events:{
                hide:function(){
                    self.allowOverflow(false); // [4]
                    // self.$el.removeClass("hasOverflow");
                },
                visible:function(){
                    self.allowOverflow(true); // [4]
                    // self.$el.addClass("hasOverflow"); // [4]
                }
            }
        }).qtip("show");
    },
    allowOverflow: function( allow ) {
        /*
         *
         * [1] Toggles class to show over flow on element so menus don't get cut off
         *
         */

        if ( !allow ) {
            this.$el.removeClass("hasOverflow"); // [1]
        } else {
            this.$el.addClass("hasOverflow"); // [1]
        }
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

        var $selected    = this.$el.find(".moduleRecipWrapper") // [7]
                            .removeClass("selected")
                            .parent().find('[data-tabindex="' + id + '"]')
                            .addClass("selected"),
            elBottom     = $selected.offset().top + $selected.height(),
            windowTop    = $(window).scrollTop(),
            windowBottom = windowTop + window.innerHeight;

        if ( elBottom > windowBottom ) {
            this.hasScrolled = true;

            $(window).scrollTo(windowTop + Math.abs(elBottom - windowBottom) + 20, 100);
        }
    },
    clickRecipient: function(event) {
        /*
         *
         * Clicking on an item in the autocompleted list.
         *
         */

        var index = $(event.currentTarget).data("tabindex");
        this.submitRecipient(index);
    },
    submitRecipient: function( recepientId ) {
        /*
         *
         * Takes the selected recepient and passes it's information to
         * the server, waits for a response, and passes that data on
         * to be templated.
         *
         * [1] Create alias for the currently active object.
         *
         * [2] Close the recepient search list qtip.
         *
         * [3] Initialize the asynchronous listener for the template and
         *     module animation events.
         *
         * [4] If the EZ view already exists, update with the new recipient information
         *
         * [5] If the EZ view doesn't exist, create a new one
         *
         * [6] Set off module animation to flip off screen.
         *
         * [7] Put the module back in the screen if the page has been scrolled.
         *
         */

        var self = this;

        this.$el.find(".recognitionNameInput").qtip("hide"); // [2]

        this.bindModuleFlipListener(); // [3]

        // [4]
        if( this.eZrecognizeView ) {
            this.eZrecognizeView.updateRecipient( _.where( this.recipientList, { index : recepientId } )[0] );
        }
        // [5]
        else {
            this.eZrecognizeView = new RecognitionEzView({
                recipient : _.where( this.recipientList, { index : recepientId } )[0],
                el        : this.$el,
                close     : function () {
                    self.resetModule();
                }
            });

            this.eZrecognizeView.on("loadComplete", function( jqXHR, textStatus ){
                self.slideOutModule(); // [6]

                if ( textStatus !== "success" ) {
                    console.log("Error fetching recognition module. ", jqXHR, textStatus);
                    self.resetModule();
                }
            });

            this.eZrecognizeView.on("templateReady", function(){
                self.trigger("setSlideStatus", function() {
                    this.fn = function() {
                        self.displayRecipientRecognitionForm();
                    };
                    this.set("templateReady", true);
                });
            });
        }

        if ( this.hasScrolled ) { // [7]
            $(window).scrollTo(this.$el.offset().top, 300);
        }
    },
    displayRecipientRecognitionForm: function() {
        var recognitionForm = this.$el.find(".ezRecLiner");

        recognitionForm
            .css({
                "position": "absolute",
                "left": ( this.$el.find(".ezRecLiner").outerWidth(true) * -1 )
            })
            .show()
            .animate({"left": 0}, G5.props.ANIMATION_DURATION, function() {
                // console.log("done");
            });
    },
    slideOutModule: function() {
        /*
         *
         * Hides the recognition search form.
         *
         */

        var self    = this,
            $module = this.$el.find(".module-liner").not('.ezRecLiner');

        $module
            .css("position", "absolute")
            .animate({"left": $module.outerWidth(true) * -1}, G5.props.ANIMATION_DURATION, function() {
                $module.css("position", "relative").hide();

                self.trigger("setSlideStatus", function() {
                    this.set("animationComplete", true);
                });
            });
    },
    resetModule: function(event) {
        /*
         *
         * Resets the module to it's default state.
         *
         */

        if ( event ) {
            event.preventDefault();
        }

        var $el = this.$el;

        $el.find(".ezRecLiner, #ezRecSendSuccessModal").remove();
        $el.find(".module-liner").css("left", 0).fadeIn(G5.props.ANIMATION_DURATION);
        $el.find("#recognitionNameInput").val("");
    },
    bindModuleFlipListener: function() {
        console.log("bindModuleFlipListener");

        /*
         *
         * This function sets up and then listens for a list of asynchronous
         * events. This is useful because it keeps the `this` object from
         * being polluted with state-based settings, while still allowing to
         * check and run functions based on multiple variable state.
         *
         * [1] Each time `this.bindModuleFlipListener(array)` is called,
         *     a new object is set up. This causes the old setup to be forgotten.
         *
         * [2] Placeholder for a function to be called once the setup parameters
         *     are satisfied. This needs to be set to during any of the calls to
         *     `this.trigger("setSlideStatus", function (){} )` but before the
         *     last `this.set("param", "value")` is called.
         *
         * [3] Adds the values passed in the setup to the cached `parameters` property.
         *
         * [4] Modifies the `parameters` object and runs the `completeCheck` function.
         *
         * [5] Checks if the function is ready to be run.
         *
         */

        var parent      = this,
            listeners   = {
                            "animationComplete" : false,
                            "templateReady"     : false
                          },
            Cache       = (function(){
                function Cache ( settingsArray ) {

                    var self = this;

                    this.fn         = null; // [2]
                    this.parameters = settingsArray; // [3]

                    parent.on("setSlideStatus", function( props ){ // [6b]
                        props.apply( self );
                    });

                    return this;
                }

                Cache.prototype.set = function ( parameter, value ) { // [4]

                    if ( this.parameters[ parameter ] === undefined ) {
                        return;
                    }

                    this.parameters[ parameter ] = value;

                    this.completeCheck();

                    return this;
                };

                Cache.prototype.completeCheck = function () { // [5]

                    var passes = true;

                    _.each(this.parameters, function( value, name ) {
                        if ( value === false ) {
                            passes = false;
                        }
                    });

                    if ( passes === true && this.fn !== null ) {
                        this.fn();
                        parent.off("setSlideStatus");
                    }
                };

                return Cache;
            }()),
            statusCache = new Cache( listeners ); // [1]
    }

});