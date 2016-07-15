/* DrawToolView - draw tool to write on cards for recognitions */
/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Modernizr,
_,
Backbone,
G5,
TemplateManager,
DrawCanvasView,
DrawToolView:true
*/
DrawToolView = Backbone.View.extend({

    el: '#drawToolShell',

    // static card type strings
    CARD_TYPES: {
        NONE: 'none', // no card
        CARD: 'card', // cards are presets from the DB/BE system
        CERT: 'cert', // certs are like cards but slightly different
        UPLOAD: 'upload', // card is upload
        DRAWING: 'drawing' // card is drawing
    },

    //override super-class initialize function
    initialize: function (opts) {
        var self = this;
        this.tplName = 'drawToolTemplate';
        this.cardsTplName = 'drawToolCardList';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'drawTool/tpl/';

        this.isCanvasSupport = Modernizr.canvas;
        this.isTouch = Modernizr.touch || (window.navigator && window.navigator.msPointerEnabled);
        this.isMobile = $(window).width() <= 360; // mobile width
        this.isMobileTouch = this.isMobile && this.isTouch;

        // model
        this.model = new Backbone.Model(_.extend({isVisible: true}, opts.drawingToolSettings));

        // canvas
        this.drawCanvasView = false; // initialized in render

        // controller
        this.eventsSetup();

        // render
        this.render();
    },

    events: {
        'click .drawTools button': 'doToolClick',

        'click #lineWidthSelect li': 'doSizeClick',
        'click #colorSelectMenu li': 'doColorClick',

        'click #clearImage': 'doClearClick',
        'click #clearImageConfirm': 'doClearClick',
        'click #clearImageCancel': 'doClearClick',

        'click #eCardThumbnailSelect li:not(.drawToolUploadContainer)': 'doThumbClick',

        'change #addAnECard': 'doVisibleChange',

        'click .drawToolUploadContainer': 'doUploadClick',

        'click #drawToolStatusContainer .editMode': 'doEditClick',
        'click #drawToolStatusContainer .doneEditing': 'doContinueClick',
        'click #drawingComplete': 'doEditDoneClick',

        //card cycle
        'click #eCardThumbnailPager a' : 'cardCyclePager'

    },

    // non-dom events (wire it up)
    eventsSetup: function() {
        var self = this;

        // triggered after initial render(s)
        this.on('renderedCards', self.cardCycleInit);
        this.on('renderedAll', self.updateCanvas);
        this.on('renderedAll', self.updateInputs);
        this.on('renderedAll', self.updateTools);

        // 'cardChanged' triggered whenever the active card changes
        this.on('cardChanged', self.updateCardThumb);
        this.on('cardChanged', self.updateTools);
        this.on('cardChanged', self.updateCanvas);
        this.on('cardChanged', self.updateInputs);

        // 'drawingChanged' triggered when drawing changes
        this.on('drawingChanged', self.updateInputs);

        // model changes
        this.model.on('change:isEditing', self.updateTools, this);
        this.model.on('change:isEditing', self.updateCanvas, this);

        this.model.on('change:activeTool', self.updateTools, this);
        this.model.on('change:activeColor', self.updateTools, this);
        this.model.on('change:activeSize', self.updateTools, this);

        this.model.on('change:isVisible', self.updateVisible, this);
        this.model.on('change:isVisible', self.updateInputs, this);

        $(window).keyup(function(e) { // easter
            var s = 'TREETREETREE';
            if (!self._easterBuffer) {self._easterBuffer = ''; }
            self._easterBuffer += String.fromCharCode(e.keyCode);
            if (self._easterBuffer.length > s.length) {self._easterBuffer = self._easterBuffer.substring(1); }

            if (self._easterBuffer === s) {
                self.$el.find('#treeButton,#starButton').show();
            }
        });
    },


    /* RENDER FUNCTIONS - populate the DOM with goodies */

    render: function() {
        var self = this;

        this.$el.empty();

        if (this.isMobileTouch) {this.$el.addClass('touchenabled'); }

        TemplateManager.get(this.tplName,
            function (tpl,vars,subTpls) {
                self.subTpls = subTpls;
                self.$el.append(tpl(self.model.toJSON()));
                self.renderCards();
                self.renderTools();
                self.renderCanvas();
                self.trigger('renderedAll'); // except cards may not yet be rendered
            }, this.tplUrl);
    },
    renderCards: function() {
        var self = this,
            $cl = this.$el.find('#eCardThumbnailSelect').empty(),
            activeCard = this.getActiveCard();

        // make sure the active card in the list isSelected
        // -- the template + card cycler (pager) will use this
        if (activeCard) activeCard.isSelected = true;


        TemplateManager.get(this.cardsTplName,
            function (tpl) {
				//Grab model and append data needed for template render
                var renderedCards = self.model.toJSON();
                renderedCards.isRenderDrawIcons = self.isCanvasSupport && renderedCards.canDraw;
                $cl.append(tpl(renderedCards));
                self.trigger('renderedCards');
            },
        this.tplUrl);
    },
    renderTools: function() {
        // style brushes
        this.$el.find('#lineWidthSelect li').each(function() {
            var $t = $(this), w = $t.data('brush-width');

            $t.css({'font-size': w}).find('span').css({
                width : w,
                height : w,
                lineHeight : w + 'px',
                marginLeft : -0.5 * w,
                marginTop : -0.5 *w
            });
        });

        // if touch, no tooltips. Otherwise, tooltips:
        if (!this.isTouch) {
            this.$el.find('#drawToolMenu button').tooltip();// bootstrap tt (title attr)
            this.$el.find('#eCardThumbnailPager a.btn').tooltip();// bootstrap tt (title attr)
        }

        // no canvas, no tools
        if (!this.isCanvasSupport) { // hide but keep dimensions?
            this.$el.find('#drawToolMenu').css('visibility','hidden');
        }

        this.trigger('renderedTools');
    },
    renderCanvas: function() {
        var self = this,
            $drawingContainer = this.$el.find('#wPaint');

        this.drawCanvasView = new DrawCanvasView({
            el:$drawingContainer,
            drawingData: this.model.get('drawingData') || ''
        });

        // this forwards a childview event to this view
        // - we just forward the trigger, instead of listening directly to the child view
        this.drawCanvasView.on('drawingChanged',function() {self.trigger('drawingChanged');});

        this.trigger('renderedCanvas');
    },


    /* UPDATE FUNCTIONS - synchronize the DOM with the DATA */

    updateCardThumb: function(c) {
        if (!c) return;
        var $cl = this.$el.find('#eCardThumbnailSelect');

        // thumbnail selected state
        $cl.find('li').removeClass('selected');
        $cl.find('li img#card-'+c.id).closest('li').addClass('selected');
    },

    updateTools: function() {
        var tool,color,size,canDraw,
            $menu = this.$el.find('#drawToolMenu'),
            $sizes = $menu.find('#lineWidthSelect li'),
            $colors = $menu.find('#colorSelectMenu li'),
            card = this.getActiveCard();

        // defaults (make sure these are silent, or else)
        if (!this.model.get('activeTool')) { this.model.set({'activeTool':'pencil'},{silent:true}); }
        if (!this.model.get('activeColor')) { this.model.set({'activeColor':'000000'},{silent:true}); }
        if (!this.model.get('activeSize')) { this.model.set({'activeSize':8},{silent:true}); }

        tool = this.model.get('activeTool');
        color = this.model.get('activeColor');
        size = this.model.get('activeSize');
        canDraw = this.model.get('canDraw');

        // set canvas tools
        this.drawCanvasView.setTool(tool,size,color);

        // canDraw menu show/hide
        $menu[canDraw?'show':'hide']();
        $menu[canDraw?'removeClass':'addClass']('cannotDraw');

        // set tool mode
        this.$el.find('#drawToolMenu').removeClass(function(i,c) {
            c = c.match(/mode-[a-z]+/i);
            return c && c.length?c[0]:false;
        }).addClass(tool==='eraser'?'mode-erase':'mode-draw');

        // tool
        this.$el.find('.drawTools button').removeClass('active');
        this.$el.find( '#'+this.model.get('activeTool')+'Button' ).addClass('active');

        // set tool color
        this.$el.find('#lineWidthSelect,#drawToolPickColor .btn').css('color','#'+color);

        // set size text
        this.$el.find('#drawToolPickSize .size').text(size);

        // set selected color/size
        $sizes.removeClass('selected').filter('[data-brush-width='+size+']').addClass('selected');
        $colors.removeClass('selected').find('div[data-hex-color-code='+color+']').closest('li').addClass('selected');

        // enabled buttons
        if (
            !card // no card
          || (card && !card.canEdit && canDraw) //can draw but card is uneditable
          || (card && card.canEdit && this.isMobileTouch && !this.model.get('isEditing')) //can edit, touch mode
        ) {
            $menu.find('button:not(".alwaysEnable")').addClass('disabled').attr("disabled", true);
        } else {
            $menu.find('.btn').removeClass('disabled').removeAttr("disabled");
        }
    },

    updateVisible: function() {
        var $vis = this.$el.find('#addAnECard'),
            isVis = this.model.get('isVisible'),
            $tool = this.$el.find('#drawingTool');

        // BE careful with scrolling and sliding, be sure to test on all devices/os

        if (this.isMobile) { // mobile
                $tool[isVis?'show':'slideUp'](G5.props.ANIMATION_DURATION);
                if ( isVis && this.isMobile ) {
                    $.scrollTo(this.$el, G5.props.ANIMATION_DURATION, {axis : 'y', offset:{top:-24,left:0}});
                }
        }
        else { // not mobile
            $vis.attr('disabled',true);
            $tool[isVis?'slideDown':'slideUp'](G5.props.ANIMATION_DURATION, function() {
                $vis.removeAttr('disabled');
            });
        }

    },

    updateCanvas: function() {
        var cv = this.drawCanvasView,
            card = this.getActiveCard(),
            wasMsg = false,
            wasHid = false,
            $dtc = this.$el.find('#drawToolContainer');

        if (!cv) { return; }

        // CARD
        if (card) {

            // on mobile devices, the container is hidden at first
            if (!$dtc.is(':visible')) {
                $dtc.show();
                if (this.isMobile) {
                    setTimeout(function() { // win 8 phone wants this deferred
                        $.scrollTo($dtc, G5.props.ANIMATION_DURATION, {axis : 'y', offset:{top:-24,left:0}});
                    },0);
                }
            }

            cv.setBgImage(card.largeImage);

            if (!card.canEdit && this.isCanvasSupport) {
                cv.showMsg('editingDisabledToolTip');
                wasMsg = true;

                cv.hideCanvas();
                wasHid = true;
            }

            if (card.canEdit && this.isMobileTouch && !this.model.get('isEditing')) {
                // show "begin" msg once, after that "pause"
                cv.showMsg((this.showedBeginEditMsg?'pause':'begin')+'ToolTipTouch');
                this.showedBeginEditMsg = true; // next time we will show paused msg
                wasMsg = true;
            }
        }

        // NO CARD
        if (!card) {
            // UPLOAD
            if (this.model.get('drawToolCardType')===this.CARD_TYPES.UPLOAD) {

                if (this.isCanvasSupport) {
                    cv.showMsg('editingDisabledToolTip');
                    wasMsg = true;
                }

                cv.setBgImage(this.model.get('drawToolCardUrl'));

                cv.hideCanvas();
                wasHid = true;
            }
            // NOTHING YET
            else {
                cv.showMsg('beginToolTip');
                wasMsg = true;

                cv.setBgImage('');

                cv.hideCanvas();
                wasHid = true;
            }
        }

        if (!wasMsg) cv.hideMsg(); // hide all msgs if none set
        if (!wasHid) cv.showCanvas(); // show canvas
    },

    // update form inputs
    updateInputs: function() {
        var $url = this.$el.find('#drawToolCardUrl'),
            $type = this.$el.find('#drawToolCardType'),
            $drawing = this.$el.find('#drawToolDrawingData'),
            $data = this.$el.find('#drawToolCardData'),
            $id = this.$el.find('#drawToolCardId'),
            card = this.getActiveCard(),
            isVis = this.model.get('isVisible'),
            isDrawing = this.drawCanvasView.hasDrawing()
                && this.model.get('canDraw')
                && card && card.canEdit;

        // NOT ACTIVE
        if (!isVis) {
            $url.val('');
            $type.val(this.CARD_TYPES.NONE);
            $drawing.val('');
            $data.val('');
            $id.val('');
        }
        // CARD or CERT
        else if (card && !isDrawing) {
            $url.val(card.largeImage);
            $type.val(card.cardType);
            $drawing.val('');
            $data.val('');
            $id.val(card.id);

            //TODO remove this if it tests out ok on server
            // back end needs?? this disabled (not sent)
            // $data.attr('disabled','disabled');
        }
        // DRAWING
        else if (isDrawing) {
            $url.val(card.largeImage);
            $type.val(this.CARD_TYPES.DRAWING);
            $drawing.val(this.drawCanvasView.getDrawingAsPng());
            $data.val(this.drawCanvasView.getCompositeAsPng());
            $id.val(card.id);

            //TODO remove this if it tests out ok on server
            // back end needs?? this disabled (not sent)
            //$data.removeAttr('disabled');
        }
        // UPLOAD
        else if (this.model.get('drawToolCardType')===this.CARD_TYPES.UPLOAD) {
            $url.val(this.model.get('drawToolCardUrl'));
            $type.val(this.model.get('drawToolCardType'));
            $drawing.val('');
            $data.val('');
            $id.val('');

            //TODO remove this if it tests out ok on server
            // back end needs?? this disabled (not sent)
            // $data.attr('disabled','disabled');
        }
        // NOTHING
        else {
            $url.val('');
            $type.val(this.CARD_TYPES.NONE);
            $drawing.val('');
            $data.val('');
            $id.val('');
        }
    },


    /* ACTIONS - interpret user actions, usually change some data */

    doVisibleChange: function(e) {
        var $t = $(e.currentTarget),
            isVis = $t.is(':not(:checked)');
        this.model.set('isVisible', isVis);
    },
    doToolClick: function(e) {
        var $t = $(e.currentTarget),
            toolName = $t.data('toolName');
        e.preventDefault();
        this.model.set('activeTool', toolName);
    },
    doSizeClick: function(e) {
        var $t = $(e.currentTarget),
            size = $t.data('brushWidth');
        e.preventDefault();
        this.model.set('activeSize', size);
    },
    doColorClick: function(e) {
        var $t = $(e.currentTarget),
            color = $t.find('.colorSelect').data('hexColorCode');
        e.preventDefault();
        this.model.set('activeColor', color);
    },
    doClearClick: function(e) {
        var $t = $(e.currentTarget),
            id = $t.attr('id'),
            cv = this.drawCanvasView;
        e.preventDefault();

        if (this.drawCanvasView) {
            if (id==='clearImageConfirm') {cv.clearDrawing(); cv.hideMsg();}
            if (id==='clearImageCancel') cv.hideMsg();
            if (id==='clearImage') cv.showMsg('clearToolTip');
        }
    },
    doThumbClick: function(e) {
        var $tar = $(e.currentTarget),
            id = $tar.find('img').attr('id').replace(/card-/,'');
        this.setActiveCardId(id);
    },
    doUploadClick: function(e) {
        var $t = $(e.currentTarget),
            $upForm = this.$el.find('#drawToolFormUploadImage'),
            self = this;
        if (!$t.data('qtip')) {
            this.addConfirmTip($t, this.$el.find('#drawToolUploadForm'));
            $upForm.fileupload({
                url: G5.props.URL_JSON_DRAW_TOOL_IMAGE_UPLOAD,
                dataType: 'g5json',
                beforeSend: function() {
                    $t.qtip('hide');
                    $t.spin();
                },
                done: function (e, data) {
                    var props = data.result.data.properties;

                    if (props.isSuccess) {
                        self.setActiveCardUpload(props.imageUrl);
                    }

                    $t.spin(false);
                }
            });
        } else {
            $t.qtip('show');
        }
    },
    doEditClick: function(e) {
        e.preventDefault();
        this.model.set('isEditing',true);
    },
    doEditDoneClick: function(e) {
        e.preventDefault();
        this.model.set('isEditing',false);
    },
    doContinueClick: function(e) {
        e.preventDefault();
        $.scrollTo(this.$el, G5.props.ANIMATION_DURATION, {
            axis : 'y',
            offset:{
                top:this.$el.outerHeight()-24,
                left:0
            }
        });
    },




    /* ****************************************************
        Card Cycle (Card Pager)
       **************************************************** */

    cardCycleInit: function() {
        var self = this,
            cc, calculate, bindToWindow;

        // create an object on the base view
        this.cardCycle = {
            // start with a bunch of handy-dandy references
            $parent : this.$el.find('#eCardThumbnailContainerParent'),
            $container : this.$el.find('#eCardThumbnailContainer'),
            $pager : this.$el.find('#eCardThumbnailPager'),
            $list : this.$el.find('#eCardThumbnailSelect'),
            $cards : this.$el.find('#eCardThumbnailSelect li')
        };

        // create a reference to the object that's easier to type and read
        cc = this.cardCycle;

        // this calculation is broken out so we can redo it every time the window resizes
        calculate = function() {
            // how many fit horizontally in the window?
            cc.numX = Math.floor(cc.$container.width() / cc.$cards.first().outerWidth(true));
            // how many fit vertically in the window?
            cc.numY = Math.floor(cc.$container.height() / cc.$cards.first().outerHeight());
            // alright then, how many fit in the window altogether?
            cc.numFit = cc.numX * cc.numY;
            // divide the total number of cards by the number that fit per window
            cc.numSteps = Math.ceil(cc.$cards.length / cc.numFit);
            // use the full height of a step and the number that fit vertically to figure out how far we slide each time
            cc.stepSize = cc.numY * cc.$cards.first().outerHeight(true);
            // find the selected card to make sure we show it in the view, or default to the first one
            cc.showThumb = cc.showThumb || Math.max(cc.$cards.filter('.selected').index(), 0);
            // figure out which step holds the currently selected one
            cc.showStep = Math.floor(cc.showThumb / cc.numFit);

            // if there is one or fewer (ha) steps to show, hide the pager controls
            if ( cc.numSteps <= 1 ) {
                cc.$pager.find('a').hide();
            }
            else {
                cc.$pager.find('a').show();
            }

            // set an explicit height on the full list, just in case
            cc.$list.css({
                height : cc.stepSize * cc.numSteps
            });

            //Update Scroll Information
            self.calculateCardCyclePagerMeta();

            // scroll into position instantly
            self.cardCycleScroll(0);
        };
        // run that calculation
        calculate();

        // we use _'s handy once() method to make sure we only bind to the window resize one time
        bindToWindow = _.once(function() {
            // on the resize, we bind an throttled version of calculate that will only fire every half second at most
            $(window).on('resize', _.throttle(calculate, 500));
        });
        // and bind it
        bindToWindow();
    },
    calculateCardCyclePagerMeta: function() {
        var tpl = this.subTpls.eCardThumbnailPagerMeta,
            cc = this.cardCycle,
            json = {};

        cc.$pager.find('#eCardThumbnailPagerMeta').remove();

        if( cc.$container.length ) {
            json.total = cc.$cards.length;
            json.actualStep = cc.showStep + 1;
            json.startNumber = ((json.actualStep * cc.numFit) - cc.numFit) + 1;
            json.endNumber = Math.min(json.actualStep * cc.numFit, json.total);

            cc.$pager.append( tpl(json) );
        }
        else {
            json = {};
            return;
        }
    },

    cardCyclePager: function(e) {
        e.preventDefault();

        // first check to see if the target is the previous link
        var goToStep = $(e.target).data('pager') == 'prev' || $(e.target).closest('a').data('pager') == 'prev'
                    // if so, check to see if we're going below zero
                    ? this.cardCycle.showStep - 1 < 0
                        // if so, restart at the end by using the total number of steps and subtracting 1 to get to our zero-based index
                        ? this.cardCycle.numSteps - 1
                        // if not, go backwards one
                        : this.cardCycle.showStep - 1
                    // if we're not previous, we're next
                    : this.cardCycle.showStep + 1;

        // divide the step by the number of steps and take the remainder
        this.cardCycle.showStep = goToStep % this.cardCycle.numSteps;

        // log the top-left visible card in the card cycle as the one to keep visible if/when resizing
        this.cardCycle.showThumb = this.cardCycle.numFit * this.cardCycle.showStep + 1;

        // scroll it
        this.cardCycleScroll();

        //Update Scroll Information
        this.calculateCardCyclePagerMeta();
    },

    cardCycleScroll: function(duration) {
        var coords = {
                // calculate the top by measuring the size of the step and multiplying by the number of step we're on
                top : this.cardCycle.stepSize * this.cardCycle.showStep,
                // we never scroll left/right
                left : 0
            };

        // scroll it
        this.cardCycle.$container.scrollTo(coords, {
            // use the default duration or the one passed to the function
            duration: duration === undefined ? G5.props.ANIMATION_DURATION : duration
        });
    },



    /* *************************************************************
        Model - keeping this in the view unless shizz gets nasty
       ************************************************************* */

    getActiveCard: function() {
        var cardId = this.model.get('drawToolCardId'),
            card;

        if (!cardId) { return null; }

        // enforce number type
        cardId = typeof cardId === 'string' ? parseInt(cardId,10) : cardId;

        card = _.where(this.model.get('eCards'), {id: cardId});
        card = card.length ? card[0] : null;

        return card;
    },
    setActiveCardId: function(id,uploadUrl) {
        var card;
        // enforce number type
        id = typeof cardId === 'string' ? parseInt(id,10) : id;

        this.model.set('drawToolCardId',id);
        card = this.getActiveCard(); // once the id is set, we can use this function

        this.model.set('drawToolCardUrl',card.largeImage);
        this.model.set('drawToolCardType',card.cardType);

        this.trigger('cardChanged',card);// trigger change with goodies
    },
    setActiveCardUpload: function(url) {
        this.model.set('drawToolCardId',null);
        this.model.set('drawToolCardUrl',url);
        this.model.set('drawToolCardType', this.CARD_TYPES.UPLOAD);

        this.trigger('cardChanged',null);
    },



    /* ****************************************************
        Misc. and Helpers
       **************************************************** */
    addConfirmTip: function($trig, cont) {
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'top center',
                at: 'bottom center',
                container: this.$el,
                viewport: $('#drawToolView'),
                adjust: {method : 'shift none'},
                effect : false
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
                classes:'ui-tooltip-shadow ui-tooltip-light PURLCommentAttachLinkTip PURLCommentAttachLinkTipPhoto',
                padding: 0,
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    }

});