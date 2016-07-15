/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
G5,
TemplateManager,
ModuleView:true,
console
*/
ModuleView = Backbone.View.extend({

    tagName:"div",

    className:"module",

    alertTpl:'<div class="alert "><button type="button" class="close">×</button><strong></strong><span></span></div>',

    initialize:function(opts){

        this.app = opts.app||false;
        this.moduleCollection = this.model.collection;

        //listen for filter change event on our model's collection and update apropo
        this.moduleCollection.on('filterChanged',this.doFilterChangeWork,this);

        //add a style class that identifies this by app and module name
        this.$el.addClass(
            this.model.get('appName')
            +' '+this.model.get('name')
            +' '+(this.getBaseName()||'') // this is useful in certain cases
        );

        //start out hidden to avoid any trouble
        this.$el.css('display','none');

        this.tempDims = {w:false,h:false};
    },

    // return everything before the word 'Module' in the name
    getBaseName: function(){
        var baseName = this.model.get('name').match(/(.+)Module/);

        if(baseName&&baseName.length===2){
            return baseName[1];
        } else {
            return null;
        }
    },

    destroy: function() {
        this.moduleCollection.off('filterChanged',this.doFilterChangeWork,this);
        this.undelegateEvents();
        this.remove();
    },

    render:function(){
        var that = this;

        this.getTemplateAnd(function(tpl){
            //when template manager has the template, render it to this element
            that.$el.append( tpl( _.extend({},that.model.toJSON(),{cid:that.cid}) ));

            //in initial load, templates may miss out on filter event
            //so we do filter change work here just in case
            that.doFilterChangeWork();
        });

        return this;//chaining
    },

    //get a template using the template manager, and execute a callback
    getTemplateAnd:function(callback){

        var that = this;

        //use the module name, or template property if set, to find a template
        var tmplBaseName = this.model.get('templateName')||this.model.get('name');

        //if set, this will be used by template manager to find the template
        var url = G5.props.URL_TPL_ROOT||this.getAppUrl()+'tpl/';

        TemplateManager.get(tmplBaseName, function(tpl,vars,subTpls){
            that.subTpls = subTpls;
            that.tplVariables = vars;
            callback(tpl);
            //this trigger is usefull for any module which needs to do sth after template load
            that.trigger('templateLoaded', tpl, vars, subTpls);
        },url);

        return this;//chaining

    },

    //get base url for this Module(g5 app)
    getAppUrl:function(){
        var appName = this.getAppName();
        return appName ? G5.props.URL_APPS_ROOT+appName+'/':G5.props.URL_BASE_ROOT;
    },

    //get app name for this module
    getAppName:function(){
        return this.model.get('appName');
    },

    //filter change administration
    doFilterChangeWork:function(){

        //grab the default dimensions for this filter/context
        var dStr = this.model.getGridDimensionsStr();

        //check to see if we already got a doBeforeGeometryChange
        //this will be the last WxH we got, and should be used
        if(this.tempDims.w) dStr = this.tempDims.w+'x'+this.tempDims.h;

        this.changeDimensionCssClass(dStr);
    },

    //take care of pre-change-geometry work
    doBeforeGeometryChange:function(gridWidth,gridHeight){
        var startMs = (new Date()).getTime(),
            str;

        //sometimes these are not the default dims
        //the LayoutManager or packer may change these from default
        //so we keep track here of the last values
        this.lastTempDims = this.tempDims;
        this.tempDims = {
            w: gridWidth,
            h: gridHeight
        };


        //switch the css class to reflect the new dimensions
        this.changeDimensionCssClass(gridWidth+'x'+gridHeight);

        //notify the troops
        this.trigger('beforeGeometryChange',{w:gridWidth,h:gridHeight});

        //notify for dimension change
        if( this.lastTempDims.w != this.tempDims.w ||
            this.lastTempDims.h != this.tempDims.h) {

            this.trigger('beforeDimensionsChange', {last:this.lastTempDims, next: this.tempDims});
        }

        // some stats for performance testing
        str = this.model.get('name')+'.doBeforeGeometryChange['+gridWidth+'x'+gridHeight+']: '+((new Date()).getTime()-startMs)+'ms';
        console.log('[INFO] **STATS** '+str);
    },

    //take care of post-change-geometry work
    doAfterGeometryChange:function(gridWidth,gridHeight){
        var startMs = (new Date()).getTime(),
            str;

        //notify any listeners about this important going-on
        this.trigger('geometryChanged',{w:gridWidth,h:gridHeight});

        // some stats for performance testing
        str = this.model.get('name')+'.doAfterGeometryChange['+gridWidth+'x'+gridHeight+']: '+((new Date()).getTime()-startMs)+'ms';
        console.log('[INFO] **STATS** '+str);

    },

    //switch out the grid dimension class
    changeDimensionCssClass:function(dStr){

        // don't do this if this module is hidden
        if(this.model.getOrder()==='hidden') { return; }

        //remove old grid-dimension class
        this.$el.removeClass(function (index, clazz){
            var matches = clazz.match(/grid-dimension-\d+x\d+/g) || [];
            return matches.join (' ');
        });

        //add the style class that identifies the grid dimensions
        this.$el.addClass('grid-dimension-'+dStr);

        // notify any listeners of the immediate dimension adjustment
        this.trigger('geometryCssClassChanged',dStr);

        // make the text fit in the title-icon-view (if it is visible?)
        // when the module renders the first time any custom @font-face fonts might not be loaded, resulting in this calculation running on the wrong text dimensions
            // to fix this, we run textShrink a second time in a delay with an arbitrary number of milliseconds that will hopefully work every time
        G5.util.textShrink( this.$el.find('.title-icon-view h3'), {minFontSize: 12} );
        _.delay(G5.util.textShrink, 100, this.$el.find('.title-icon-view h3'), {minFontSize: 12});
    },

    //shut this guy down, hide and stop resource draining stuff
    sleep:function(){

        this.$el.hide();

    },

    //wake up and start draining resources!
    wake:function(){

        if(!this.model.isHiddenForCurrentFilter()){
            this.$el.show();
        }

    },

    //all module views get these events
    events: {

    },

    isOnScreen: function(){
        var winTop = window.pageYOffset||$('html').scrollTop(),
            winBot = winTop + $(window).innerHeight(),
            myTop = this.$el.offset().top,
            myBot = myTop + this.$el.height(),
            inVwPt = (myTop>winTop && myTop<winBot) || // top in window
                    (myBot>winTop && myBot<winBot) || // bottom in window
                    (myTop<winTop && myBot>winBot); // middle in window (top and bot not in window)

        return inVwPt && this.$el.is(':visible');
    },

    dataLoad: function(start, opts) { // use to put module into/outof dataLoading state -- pass true to start, false to stop (for display purposes only)
        var $mod = this.$el;

        opts = _.extend({
            className : 'dataLoading',
            spinner : true
        }, opts);

        // add/remove a loading class
        $mod[start?'addClass':'removeClass'](opts.className);
        // spin/unspin the module if option was passed
        this.spinModule(opts.spinner&&start?true:false);
    },

    spinModule:function(start) { //use this to start or stop a spinner on the module -- pass true to start, false to stop
        var $mod = this.$el;

        if(start) {
            G5.util.showSpin($mod,{spinopts:{color:'#fff'}});
        }
        else {
            G5.util.hideSpin($mod);
        }
    },

    ///start the carousel for this module, if there is one
    startCycle: function(options, legendStyle) {
        var defaults = {
            fit: 0, //to change the width and height of the slide manually, set fit to true in your options first
            width: null,
            height: 'auto',
            nowrap: 0,
            slideResize: 1, // force slide width/height to fixed size before every transition
            containerResize: 1, // resize container to fit largest slide
            fx: 'scrollHorz', //list of effects: http://jquery.malsup.com/cycle/browser.html
            delay: -2000, // additional delay (in ms) for first transition (hint: can be negative)
            random: false,
            speed: 1000,
            speedIn: 500,
            speedOut: 500,
            autostop: false,
            startingSlide: 0, // zero-based index of the first slide to be displayed
            backwards: false,
            pause: true, //pause on hover
            timeout: G5.props.CYCLE_SLIDE_TRANSITION_PAUSE  // milliseconds between slide transitions (0 to disable auto advance)
        };

        var settings = $.extend({}, defaults, options||{}), //merge custom options with defaults
            $theElements = this.$el.find(".cycle"), //find all modules with a carousel
            $theElementsChildrenLength = $theElements.children().length,
            $legendContainer = $theElements.closest(".wide-view"),
            hasTouch = $("html").hasClass("touch");

        legendStyle = legendStyle||$theElements.data('cycleLegendStyle')||false;

        if (legendStyle === "dots" && $theElementsChildrenLength > 1){
            //add and remove the "selected" class from the appropriate dots
            settings.before = function(currSlideElement, nextSlideElement, options, forwardFlag){
                $legendContainer.find("#cycleLegend").find("[value='" + options.nextSlide +"']").addClass("selected").siblings().removeClass("selected");
            };

            var legendTemplate = "<div id='cycleLegend' class='cycleLegend'>";

            //center the dots whenever needed
            var centerDots = function() {
                //find the necessary values
                var $legend = $legendContainer.find("#cycleLegend"),
                    containerWidth = $legendContainer.closest(".module").width(),
                    legendWidth = $legend.width(),
                    legendLeftValue = (containerWidth / 2) - (legendWidth / 2);

                //adjust the legend's css so it's centered inside it's module container
                $legend.css("left", legendLeftValue);
            };

            //create the dots template
            for (var i = 0; i < $theElementsChildrenLength; i++) {
                legendTemplate += "<span class='cycleDot' id='cycleDot" + i + "' value='" + i + "'></span>";
            }

            legendTemplate += "</div>"; //close the template

            $legendContainer.append(legendTemplate); //append the template to the DOM
            var $legend = $legendContainer.find("#cycleLegend");
            $legend.width($legend.children().length * $legend.children(':first').outerWidth(true) + 2); //adjust width (extra +2 pixels handles an issue with browser zoom breaking the dots onto multiple lines)
            centerDots();

            //bind each dot's click event to cycle the carousel to its associated slide
            $legendContainer.find("#cycleLegend").children().click(function() {
                var $this = $(this);
                $theElements.cycle(parseInt($this.attr("value"),10));
            });
        }
        else if (legendStyle === "arrows" && $theElementsChildrenLength > 1) {
            var $leftArrow = this.$el.find(".carousel-control.left");
            var $rightArrow =  this.$el.find(".carousel-control.right");

            var onAfter = function(curr, next, opts) {
                var index = opts.currSlide;
            };

            var arrowSets = {
                fx:     'scrollHorz',
                prev:   $leftArrow,
                next:   $rightArrow,
                after:   onAfter
            };

            var settings = $.extend({}, settings, arrowSets);
        }
        else if (legendStyle === "arrows" && $theElementsChildrenLength <= 1) {
            //one or no slides need no arrows.
            this.$el.find(".carousel-control.left").hide();
            this.$el.find(".carousel-control.right").hide();
        }

        // create the cycle
        if ($theElements.length > 0 && $theElementsChildrenLength > 1) {
            // start slide cycle with merged custom and default options
            $theElements.cycle(settings);

            // if we're rendering inside a hidden container, don't start it yet
            if( $theElements.is(':hidden') ) {
                $theElements.cycle('pause');
            }

            // if this is a touch-enabled browser, start touch detection
            if (hasTouch){
                this.startCycleSwipeDetection($theElements);
            }

            //on first load, make sure the correct dot is selected
            if (legendStyle === "dots"){$legendContainer.find("#cycleDot" + settings.startingSlide.toString()).addClass("selected").end().find("#cycleDot" + (settings.startingSlide + 1).toString()).removeClass("selected");}

            this.on("beforeGeometryChange", function() {
                $theElements.cycle("pause"); //pause cycling during geo change
            });

            this.on("geometryChanged", function() {
                if (legendStyle === "dots"){centerDots();} //recenter dots of geo change
                // hack the 'cycleWidth' attr of each slide element (doesn't appear to be adjusted anywhere in the plugin)
                // this allows the slide animation to use the proper width for the slide animation
                _.each($theElements.data('cycle.opts').elements, function(s) {
                    var $s = $(s);
                    s.cycleW = $s.width();
                    s.cycleH = $s.height();
                });
                // and resume cycling only if the cycle is visible
                if( $theElements.is(':visible') ) {
                    $theElements.cycle("resume");
                }
            });
        }
        else {
            console.log("[ERROR] ModuleView: startCycle needs an element with class name 'cycle' with children nodes present: ", $theElements);
        }
    },

    destroyCycle: function() {
        var $cycleEl = this.$el.find(".cycle"); //find all modules with a carousel
        if($cycleEl.data('cycle')) {
            $cycleEl.cycle('destroy');
        }
    },

    startCycleSwipeDetection: function($elm) {
        var triggerElementID = $elm, // the triggering element
            fingerCount = 0,
            startX = 0,
            startY = 0,
            curX = 0,
            curY = 0,
            deltaX = 0,
            deltaY = 0,
            horzDiff = 0,
            vertDiff = 0,
            minLength = 30, // the shortest distance the user may swipe
            swipeLength = 0,
            swipeAngle = null,
            swipeDirection = null,
            touchStart, touchMove, touchEnd, touchCancel, caluculateAngle, determineSwipeDirection, processingRoutine;

        // The Touch Event Handlers
        touchStart = function(event,passedName) {
            // disable the standard ability to select the touched object
            //event.preventDefault(); //don't think I need this, actually
            // get the total number of fingers touching the screen
            fingerCount = (event.touches !== undefined) ? event.touches.length : 1;
            // since we're looking for a swipe (single finger) and not a gesture (multiple fingers),
            // check that only one finger was used
            if ( fingerCount == 1 && event.touches !== undefined) {
                // get the coordinates of the touch
                startX = event.touches[0].pageX;
                startY = event.touches[0].pageY;
                // store the triggering element ID
                triggerElementID = passedName;
            } else {
                // more than one finger touched so cancel
                touchCancel(event);
            }
        };

        touchMove = function(event) {
            // event.preventDefault(); // commented out because it was killing vertical touches--a.k.a. scrolls
            if ( event.touches.length == 1 ) {
                curX = event.touches[0].pageX;
                curY = event.touches[0].pageY;
            } else {
                touchCancel(event);
            }
        };

        touchEnd = function(event) {
            // check to see if more than one finger was used and that there is an ending coordinate
            if ( fingerCount == 1 && curX !== 0 ) {
                // use the Distance Formula to determine the length of the swipe
                swipeLength = Math.round(Math.sqrt(Math.pow(curX - startX,2) + Math.pow(curY - startY,2)));
                // if the user swiped more than the minimum length, perform the appropriate action
                if ( swipeLength >= minLength ) {
                    event.preventDefault();
                    caluculateAngle();
                    determineSwipeDirection();
                    processingRoutine();
                    touchCancel(event); // reset the variables
                } else {
                    touchCancel(event);
                }
            } else {
                touchCancel(event);
            }
        };

        touchCancel = function(event) {
            // reset the variables back to default values
            fingerCount = 0;
            startX = 0;
            startY = 0;
            curX = 0;
            curY = 0;
            deltaX = 0;
            deltaY = 0;
            horzDiff = 0;
            vertDiff = 0;
            swipeLength = 0;
            swipeAngle = null;
            swipeDirection = null;
            triggerElementID = null;
        };

        caluculateAngle = function() {
            var X = startX-curX,
                Y = curY-startY,
                Z = Math.round(Math.sqrt(Math.pow(X,2)+Math.pow(Y,2))), //the distance - rounded - in pixels
                r = Math.atan2(Y,X); //angle in radians (Cartesian system)
            swipeAngle = Math.round(r*180/Math.PI); //angle in degrees
            if ( swipeAngle < 0 ) { swipeAngle =  360 - Math.abs(swipeAngle); }
        };

        determineSwipeDirection = function() {
            if ( (swipeAngle <= 45) && (swipeAngle >= 0) ) {
                swipeDirection = 'left';
            } else if ( (swipeAngle <= 360) && (swipeAngle >= 315) ) {
                swipeDirection = 'left';
            } else if ( (swipeAngle >= 135) && (swipeAngle <= 225) ) {
                swipeDirection = 'right';
            } else if ( (swipeAngle > 45) && (swipeAngle < 135) ) {
                swipeDirection = 'down';
            } else {
                swipeDirection = 'up';
            }
        };

        processingRoutine = function() {
            var swipedElement = document.getElementById(triggerElementID);
            if ( swipeDirection == 'left' ) {
                triggerElementID.cycle("next");
            } else if ( swipeDirection == 'right' ) {
                triggerElementID.cycle("prev");
            } else if ( swipeDirection == 'up' ) {
                //these don't do anything for now
            } else if ( swipeDirection == 'down' ) {
                //these don't do anything for now
            }
        };

        //bind the touch events to the element
        triggerElementID.on({
            "touchstart": function(event) {
                event = event.originalEvent;
                touchStart(event, $(this));
            },
            "touchend": function(event) {
                event = event.originalEvent;
                touchEnd(event);
            },
            "touchmove": function(event) {
                event = event.originalEvent;
                touchMove(event);
            },
            "touchcancel": function(event) {
                event = event.originalEvent;
                touchCancel(event);
            }
        });
    }

});
