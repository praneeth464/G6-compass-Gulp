/* DrawToolView - draw tool to write on cards for recognitions */
/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Modernizr,
_,
Backbone,
DrawCanvasView:true
*/

/* DrawCanvasView - manage a canvas for drawing */
DrawCanvasView = Backbone.View.extend({

    TOUCH_EVENTS: "touchstart touchmove touchend",
    POINTER_EVENTS: "MSPointerDown MSPointerMove MSPointerUp",
    MOUSE_EVENTS: "mousedown mouseup mousemove",

    //override super-class initialize function
    initialize: function (opts) {
        this.$bg = this.$el.find('#bgContainer');
        this.$canvas = null;
        this.$buffer = null;
        this.ctx = null;
        this.buffCtx = null;
        this.tool = {name:'pencil',size:'8',color:'000000'};// default tool
        this.isToolDown = false;
        this.hasCanvas = Modernizr.canvas;

        this.paintedOn = false;

        //eew, this is not inside the drawtool canvas $el, confusing
        this.$status = this.$el.closest('#drawToolContainer').find('#drawToolStatusContainer');

        this.renderCanvas();

        this.eventsSetup();

        if(opts.drawingData) {
            this.setDrawingFromPng(opts.drawingData);
        }

    },

    events: {
        'mousedown .drawCanvas': 'doToolDown',
        'mousemove .drawCanvas': 'doToolMove',
        'mouseup .drawCanvas' : 'doToolUp',

        'touchstart .drawCanvas' : 'doToolDown',
        'touchmove .drawCanvas' : 'doToolMove',
        'touchend .drawCanvas' : 'doToolUp',

        'MSPointerDown .drawCanvas' : 'doToolDown',
        'MSPointerMove .drawCanvas' : 'doToolMove',
        'MSPointerUp .drawCanvas' : 'doToolUp',

        'click .drawCanvas' : function(e){e.preventDefault();} // no clicks
    },

    eventsSetup: function() {
        var self = this;

        // when there is a drag that ends outside the canvas, terminate draw
        $(document).on('mouseup',function(e) {
            if(self.isToolDown){
                self.doToolUp(e);
            }
        });


    },

    renderCanvas: function() {
        if(!this.hasCanvas) return;
        var w = this.$el.outerWidth(),
            h = this.$el.outerHeight();

        this.$canvas = $('<canvas class="drawCanvas" />');
        this.$canvas.attr({width:w+'px',height:h+'px'});
        this.$canvas.css({position:'absolute',left:0,top:0,'-ms-touch-action':'none'});
        this.$el.append(this.$canvas);

        this.ctx = this.$canvas[0].getContext("2d");
        this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";

        this.$buffer = $('<canvas class="bufferCanvas" />');
        this.$buffer.attr({width:w+'px',height:h+'px'});
        this.$buffer.css({position:'absolute',left:0,top:0,display:'none'});
        this.$el.append(this.$buffer);

        this.buffCtx = this.$buffer[0].getContext("2d");
    },
    showCanvas: function() {
        if(!this.hasCanvas) return;
        this.$canvas.show();
    },
    hideCanvas: function() {
        if(!this.hasCanvas) return;
        this.$canvas.hide();
    },

    setBgImage: function(url) {
        var self = this,
            $img;

        // same image? return
        if( url === this.$bg.find('img').attr('src') ) return;

        // trigger drawing change event after image loads
        $img = $('<img/>')
            .load(
                {responseType: "html"},
                function(responseText, textStatus, XMLHttpRequest){ 
                    self.trigger('drawingChanged');
                    G5.serverTimeout(responseText);
                } 
            )
            .attr('src',url);

        this.$bg.empty().append($img);

        // if the image has no src attribute, we hide it (certain browsers show the broken image icon when src is empty)
        $img[!$img.attr('src')?'hide':'show']();
    },

    setDrawingFromPng: function(data) {
        var self = this,
            img;
        if(data) {
            img = new Image();
            img.onload = function(){
                self.ctx.drawImage(img,0,0);

                // flag painted and trigger event
                self.paintedOn = true;
                self.trigger('drawingChanged');
            };
            img.src = data;
        }
    },
    getDrawingAsPng: function() {
        var dat = '';
        if(this.paintedOn){
            dat = this.$canvas[0].toDataURL();
        }
        return dat;
    },
    getCompositeAsPng: function() {
        var self = this,
            dat = '',
            w = this.$buffer.width(),
            h = this.$buffer.height();

        if(this.hasDrawing()){
            // NOTE: the images must come from same domain, otherwise we get an error
            try{
                // in certain cases the bg image may not yet be loaded, so we use an img element
                this.buffCtx.drawImage(this.$bg.find('img')[0], 0,0, w,h); // bg
                this.buffCtx.drawImage(this.$canvas[0], 0,0, w,h); // drawing
                dat = this.$buffer[0].toDataURL();
            }
            catch(error) {
                var orig = this.$bg.find('img').attr('src'),src = orig;
                orig = orig.match(/\/\/([^\/]+)/);
                orig = orig&&orig.length === 2 ? orig[1] : src;
                console.log('[ERROR] DrawCanvasView - cannot save card background image, it is from a different origin ['+orig+']');
                this.drawStringToCanvas('could not save\nbackground Image\nfrom different origin\n['+orig+']',20,20);
                dat = this.$canvas[0].toDataURL(); // give just the drawing without bg
            }
        }
        return dat;
    },

    isBgImgLoaded: function(){
        var i = this.$bg.find('img')[0];
        return i.complete || (typeof i.naturalWidth!='undefined' && i.naturalWidth>0);
    },

    hasDrawing: function(){ return this.paintedOn; },

    showMsg: function(msgClass) {

        this.$status.show()
            .find('.drawToolQTip').hide().end()
            .find('.'+msgClass).show();
    },
    hideMsg: function(msgClass) {
        if(msgClass) {
            this.$status.find('.'+msgClass).hide();
        } else {
            this.$status.find('.drawToolQTip').hide();
        }
        this.$status.hide();
    },

    setTool: function(name, sizePx, colorHex) {
        this.tool = {
            name: name,
            size: sizePx, // do not include "px"
            color: colorHex // do not include "#"
        };
    },

    clearDrawing: function() {
        var $c = this.$canvas;
        this.ctx.clearRect(0,0,$c.width(),$c.height());
        this.paintedOn = false;

        // trigger event
        this.trigger('drawingChanged');
    },


    // DRAWING
    doToolDown: function(e) {
        this.normalizeEvent(e);
        var oSet = this.$canvas.offset(),
            x = e.pageX - oSet.left,
            y = e.pageY - oSet.top;

        e.preventDefault();

        // assume the offset is static during one 'drag' of tool, cache offsets
        this.oX = oSet.left;
        this.oY = oSet.top;

        if(e._deadMouse) return;

        // forward to tool behavior
        this.tools[this.tool.name].down(x,y,this);

        // flag the tool as down (moving, dragging, etc)
        this.isToolDown = true;
    },
    doToolMove: function(e) {
        this.normalizeEvent(e);
        var x = e.pageX - this.oX,
            y = e.pageY - this.oY;

        if(e._deadMouse) return;

        if(this.isToolDown){
            e.preventDefault();
            // forward to tool behavior
            this.tools[this.tool.name].move(x,y,this);
        }
    },
    doToolUp: function(e) {
        this.normalizeEvent(e);
        var x = e.pageX - this.oX,
            y = e.pageY - this.oY;

        if(e._deadMouse) return;

        // forward to tool behavior
        this.tools[this.tool.name].up(x,y,this);

        // flag tool up
        this.isToolDown = false;

        this.paintedOn = true;

        // trigger event
        this.trigger('drawingChanged');
    },

    // massage event object for certain devices
    normalizeEvent: function(e) {
        var self = this,touches;

        // touch devices
        if(this.TOUCH_EVENTS.indexOf(e.type) >= 0) {
            touches = e.originalEvent.touches;

            // make sure we have a touch, else use last vals
            e.pageX = touches.length?touches[0].pageX:this._lastTouchX;
            e.pageY = touches.length?touches[0].pageY:this._lastTouchY;

            // for touchend we want to save these since it has no 'touches'
            this._lastTouchX = e.pageX;
            this._lastTouchY = e.pageY;

            // be lazy about killing mouse events
            // (galaxy shoots both mouse and touch at same time)
            this._mouseTrap = true;
        }
        // pointer devices (M$)
        else if(this.POINTER_EVENTS.indexOf(e.type) >= 0) {
            e.pageX = e.originalEvent.pageX;
            e.pageY = e.originalEvent.pageY;

            // lazy kill mouse events
            this._mouseTrap = true;
        }
        // mouse killer (for galaxy)
        else if(this._mouseTrap && this.MOUSE_EVENTS.indexOf(e.type) >= 0) {
            e._deadMouse = true;
        }


        // setTimeout(function(){
        //     var $e = self.$el.closest('.span12');
        //     $e.append(e.type+' '+e.originalEvent.pageY+' ');
        // },0)

    },

    drawStringToCanvas: function(s,x,y) {
        var lines = s.split('\n'),
            self = this;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.font = "bold 16px Arial";
        _.each(lines, function(line,idx){
            self.ctx.fillText(line,x,(idx)*20 + y + 14);
        });

    },



    /* ****************************************************
        Tools - create tool behaviors here
       *************************************************** */
    tools: {
        pencil: {
            down: function(x,y,dcv) { // start line
                dcv.ctx.globalCompositeOperation = 'source-over';

                dcv.ctx.lineWidth = dcv.tool.size;
                dcv.ctx.strokeStyle = '#'+dcv.tool.color;
                dcv.ctx.fillStyle = '#'+dcv.tool.color;

                dcv.ctx.beginPath();
                dcv.ctx.moveTo(x,y);
                this.oldX = x;
                this.oldY = y;
            },
            move: function(x,y,dcv) { // create line segment
                dcv.ctx.lineTo(x,y);
                dcv.ctx.stroke();
            },
            up: function(x,y,dcv) { // stop line
                if(this.oldX===x && this.oldY===y) { // detect a click
                    dcv.ctx.beginPath();
                    dcv.ctx.arc(x,y, dcv.tool.size/2, 0, Math.PI*2, true);
                    dcv.ctx.closePath();
                    dcv.ctx.fill();
                } else { // end of a line
                    dcv.ctx.closePath();
                }
            }
        }, // pencil tool

        eraser: {
            down: function(x,y,dcv) { // start line
                dcv.ctx.save();
                dcv.ctx.globalCompositeOperation = 'destination-out';

                dcv.ctx.lineWidth = dcv.tool.size;

                dcv.ctx.beginPath();
                dcv.ctx.moveTo(x,y);
                this.oldX = x;
                this.oldY = y;
            },
            move: function(x,y,dcv) { // create line segment
                dcv.ctx.lineTo(x,y);
                dcv.ctx.stroke();
            },
            up: function(x,y,dcv) { // stop line
                if(this.oldX===x && this.oldY===y) { // detect a click
                    dcv.ctx.beginPath();
                    dcv.ctx.arc(x,y, dcv.tool.size/2, 0, Math.PI*2, true);
                    dcv.ctx.closePath();
                    dcv.ctx.fill();
                } else { // end of a line
                    dcv.ctx.closePath();
                }
            }
        }, // eraser tool

        tree: { // tree tool
            maxDepth: 12,
            down: function(x,y,dcv) { // start line
                dcv.ctx.globalCompositeOperation = 'source-over';

                dcv.ctx.strokeStyle = '#'+dcv.tool.color;

                this.treeRecurse(x,y, Math.PI/2, 14,60, dcv,0);
            },
            move: function(x,y,dcv) {},
            up: function(x,y,dcv) {},
            treeRecurse: function(x,y,a,w,h,dcv,dep) {
                var nx = x + h*Math.cos(a),
                    ny = y - h*Math.sin(a);

                if(dep>=this.maxDepth) return;

                dcv.ctx.beginPath();
                dcv.ctx.moveTo(x,y);
                dcv.ctx.lineTo(nx,ny);

                dcv.ctx.closePath();
                dcv.ctx.lineWidth = w;
                dcv.ctx.stroke();

                this.treeRecurse(nx,ny, a+Math.PI/(3+Math.random()*5 ), w*0.7, h*0.7+Math.random()/4, dcv, dep+1);
                this.treeRecurse(nx,ny, a-Math.PI/(3+Math.random()*5 ), w*0.7, h*0.7+Math.random()/4, dcv, dep+1);
                // this.treeRecurse(nx,ny, a+Math.PI/2, w*0.7, h*0.7, dcv, dep+1);
                // this.treeRecurse(nx,ny, a-Math.PI/2, w*0.7, h*0.7, dcv, dep+1);
            }
        }, // tree tool

        star: { // star tool
            maxDepth: 12,
            down: function(x,y,dcv) { // start line
                dcv.ctx.globalCompositeOperation = 'source-over';
                dcv.ctx.fillStyle = '#'+dcv.tool.color;
                this.drawStar(x,y, 2 + Math.random()*30, dcv.ctx);
            },
            move: function(x,y,dcv) {
                var xm = Math.random()*60 - 30,
                    ym = Math.random()*60 - 30,
                    sm = Math.random()*15;
                this.drawStar(x+xm,y+ym, 2+sm, dcv.ctx);
            },
            up: function(x,y,dcv) {},
            drawStar: function(x,y,s,ctx) {
                var a = Math.PI*Math.random(), // rand angle
                    nx,ny,i;
                ctx.beginPath();
                for(i=0;i<10;i++){
                    a += Math.PI/5;
                    nx = x + s*(i%2===0?0.5:1) * Math.cos(a);
                    ny = y + s*(i%2===0?0.5:1) * Math.sin(a);
                    ctx[i?'lineTo':'moveTo'](nx,ny);
                }
                ctx.closePath();
                ctx.fill();
            }
        } // star tool
    }

});