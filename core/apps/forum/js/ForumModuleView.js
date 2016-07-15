/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
ModuleView,
TemplateManager,
ForumModuleView:true
*/
ForumModuleView = ModuleView.extend({


    events:{
        "click .profile-popover":"attachParticipantPopover"
    },
    //override super-class initialize function
    initialize:function(opts){

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // 4x2 square
            {w:4,h:4}  // 4x4 square
        ],{silent:true});
        
        // on template loaded and attached

        this.on('templateLoaded', function() {
            this.fetchSlides();
        });

        this.on('slidesRendered', function() {
            this.slideSetup();
        });

        this.on('geometryChanged', function() {
            this.renderSlide();
        });

        // qtip finder
        $.expr[':'].qtip = $.expr[':'].qtip || function(el){
            return !!($(el).qtip("api"));
        };
    },
    fetchSlides: function(){
        console.log("[INFO] ForumModuleView: fetchSlides called");

        var self = this;

        // start the loading state and spinner
        this.dataLoad(true);

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_RECENT_DISCUSSIONS, 
            // data: params,
            success: function(serverResp){
                //regular .ajax json object response
                console.log("[INFO] ForumModuleView: LoadData ajax call successfully returned this JSON object: ", serverResp);

                self.discussions = serverResp.data.discussions;

                // stop the loading state and spinner
                self.dataLoad(false);

                self.renderSlide();

                window.foo = window.foo || {};

                var thisSize = (/^.*grid-dimension-(\dx\d).*$/i).exec( self.$el.prop("class") )[1];
                window.foo[ "_" + thisSize ] = self;
            }
        });
    },
    /*
    resetSlides: function() {

        this.$el.find(".cycle").cycle("destroy");

        this.$el.find(".cycle .item").css({
            "position" : "relative",
            "display"  : "block",
            "height"   : "auto",
            "width"    : "auto",
            "left"     : "auto",
            "top"      : "auto"
        });

        this.$el.find(".cycleLegend").remove();

        this.slideSetup();

    },
    */
    slideSetup: function() {

        var self = this;

        // _.each(this.$el.find(".cycle .item"), function( value, key ) {
        //     self.sizeSlide( $( value ) );
        // });

        // if the element is already set up, bail
        if( this.$el.find(".cycle").data('cycle.opts') ) {
            return;
        }

        this.startCycle({
            pagerEvent: "slideChange",
            // use scss to size this shizz
            fit: 0,
            slideResize: 0,
            containerResize: 0
        }, "dots"); // start the carousel

        this.$el.find(".cycle").on("slideChange", function() {
            self.$el.find(":qtip").qtip("hide");
        });

        this.slidesSet = true;
    },
    renderSlide: function( $slide ) {
        var self    = this,
            tplName = 'forumModuleItem',
            tplUrl  = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'forum/tpl/',
            $holder = this.$el.find(".carousel-inner"),
            text;

        $slide = $slide || $holder.find('.item');

        _.each(this.discussions, function( discussion ){
            text = discussion.text;
            if ( !_.isNull( text ) ) {
                discussion.text = text.replace(/(<([^>]+)>)/ig,"");
            }
        });

        TemplateManager.get(tplName, function(tpl){
            if( $slide.length ) {
                $slide.each(function(i) {
                    $(this).html( $(tpl([self.discussions[i]])).html() );
                    
                    if( $(this).css('display') == 'none' ) {
                        $(this).show().addClass('tempshow');
                    }
                    $(this).find(".discussionHeadline .headline, .indent .text").ellipsis();
                    if( $(this).hasClass('tempshow') ) {
                        $(this).hide().removeClass('tempshow');
                    }
                });
            }
            else {
                $holder.html(tpl(self.discussions));
            }

            $holder.find(".discussionHeadline .headline").ellipsis();
            $holder.find(".indent .text").ellipsis();

            self.trigger('slidesRendered');
        }, tplUrl);
    },
    /*
    sizeSlide: function( $slide ) {
        var $holder = this.$el.find(".carousel-inner"),
            height  = $holder.height(),
            width   = $holder.width();

        $slide.css({
            "height" : height,
            "width"  : width
        });

        $slide.find(".discussionHeadline .headline").ellipsis();
        // this.ellipsis({
        //         $el: $slide.find(".discussionHeadline .headline"),
        //         lineCountLimit: 3
        //     });

        $slide.find(".indent .text").ellipsis();
        // this.ellipsis({
        //         $el: $slide.find(".indent .text"),
        //         lineCountLimit: 2
        //     });
    },
    */
    /*
    ellipsis: function( options ) {
        /*
         *
         * Creates an ellipsis for multiple line text to prevent layout breaking.
         *
         * [1] An array of slide elements.
         *
         * [2] Statistics shared between all of the elements in the current loop
         *
         *     [2a] use two lines to take line spacing into account
         *
         * [3] Caches the original text, so resizing can be done later on.
         *
         */

        // console.log("[INFO] ForumModuleView: ellipsis called", options);

        /*
        var self        = this,
            $toEllipsis = options.$el, // [1]
            moduleStats = (function() { // [2]

                            var chars   = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
                                breaker = "<br />break", // [2a]
                                $chars  = $("<span>")
                                                .html(chars + breaker)
                                                .css({
                                                        "white-space": "no-wrap"
                                                    })
                                                .prependTo(this),
                                height  = Math.round($chars.height() / 2), // [2a]
                                width   = Math.round($chars.width() / chars.length);

                            $chars.remove();

                            return {
                                    "charHeight" : height,
                                    "charWidth"  : width
                                   };

                          }).call($toEllipsis.first()),
            itemStats   = function() {
                            var info = {};

                            info.height = this.height();
                            info.width  = this.width();
                            info.text   = (function( $el ){ // [3]
                                            if ( _.isUndefined( $el.data("rawtext") ) ) {
                                                $el.data("rawtext", $.trim($el.text()));
                                            }
                                            return $el.data("rawtext");
                                          }( this ));
                            info.charCount = info.text.length;

                            return info;
                          };

        $toEllipsis.each(function( key, value ){
            var $this = $(value),
                info  = itemStats.call($this),
                lineCount;

            if (!!info.height && !!info.width) {
                lineCount = Math.round(info.height / moduleStats.charHeight);

                if (lineCount > options.lineCountLimit) {
                    $this.text(info.text.substring(0,(Math.floor(info.width / moduleStats.charWidth) * options.lineCountLimit)-3) + "...");
                }
            }
        });
    },
    */
    attachParticipantPopover:function(e){
        /*
         * Creates pop over card when clicking on persons name.
         */

        var $tar = $(e.target),
            isSheet = ($tar.closest(".modal-stack").length > 0) ? {isSheet: true} : {isSheet: false};
        if ($tar.is("img")){
            $tar = $tar.closest("a");
        }

        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $tar.participantPopover(isSheet).qtip('show');
        }      
        e.preventDefault();
    }

});