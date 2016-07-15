$(function(){

	//create canvas elements, listeners, etc.
	myDraw = function(targetElement){

		var elem = $(targetElement),
			canvas = new Canvas(),
			test = document.createElement('canvas');

		console.log('elem:');
		console.log(elem);	

		if(!test.getContext){
			//checks if browser supports canvas. This is where flash canvas replacement will be created.
			elem.html("Browser does not support HTML5 canvas, please upgrade to a more modern browser.");
			return false;	
		}

		//create canvasDisplay, canvasBuffer, etc.
		elem.append(canvas.generateDisplay(elem.width(), elem.height()));
		elem.append(canvas.generateBuffer(elem.width(), elem.height()));

	},

	function Canvas(){
		return this;
	},
		//set any default properties of canvases here.
	Canvas.prototype = {
		generateDisplay: function(width, height)
		{	
			this.canvasDisplay = document.createElement('canvas');
			this.ctx = this.canvasDisplay.getContext('2d');
			$(this.canvasDisplay).attr("id","canvasDisplay");			
			
			//create local reference
			var $this = this;
			
			//touch functionality greyed out for now
			$(this.canvasDisplay)
			.attr('width', width + 'px')
			.attr('height', height + 'px')
			.css({position: 'absolute', left: 0, top: 0})
			.mousedown(function(e)
			{
				e.preventDefault();
				e.stopPropagation();
				$this.draw = true;
				$this.callFunc(e, $this, 'Down');
			})
			//.touchdown(function(e){ ... })
			;
						
			$(document)
			.mousemove(function(e)
			{
				if($this.draw) $this.callFunc(e, $this, 'Move');
			})
			//.touchmove(function(e){ ... })
			.mouseup(function(e)
			{
				//make sure we are in draw mode otherwise this will fire on any mouse up.
				if($this.draw)
				{
					$this.draw = false;
					$this.callFunc(e, $this, 'Up');
				}
			})
			//.touchup(function(e){ ... })
			;
			
			return $(this.canvasDisplay);
		},

		generateBuffer: function(width, height)
		{
			this.canvasBuffer = document.createElement('canvas');
			$(this.canvasBuffer)
			.attr('width', width + 'px')
			.attr('height', height + 'px')
			.css({position: 'absolute',left: 0, top: 0})
			.hide();
			
			this.ctxTemp = this.canvasBuffer.getContext('2d');
			$(this.canvasBuffer).attr("id","temp");
			
			var $this = this;
			
			return $(this.canvasBuffer);
		},

		callFunc: function(e, $this, event)
		{
			$e = jQuery.extend(true, {}, e);
			
			var canvas_offset = $($this.canvas).offset();
			
			$e.pageX = Math.floor($e.pageX - canvas_offset.left);
			$e.pageY = Math.floor($e.pageY - canvas_offset.top);
			
			var mode = 'Pencil'
			var func = $this['draw' + mode + '' + event];	
			
			if(func) func($e, $this);
		},		

		drawPencilDown: function(e, $this)
		{
			$this.ctx.lineJoin = "round";
			$this.ctx.lineCap = "round";
			$this.ctx.strokeStyle = '#000000';
			$this.ctx.lineWidth = 5;
			
			//draw single dot in case of a click without a move
			$this.ctx.beginPath();
			$this.ctx.arc(e.pageX, e.pageY, $this.settings.lineWidth/2, 0, Math.PI*2, true);
			$this.ctx.closePath();
			$this.ctx.fill();
			
			//start the path for a drag
			$this.ctx.beginPath();
			$this.ctx.moveTo(e.pageX, e.pageY);
		},
		
		drawPencilMove: function(e, $this)
		{
			$this.ctx.lineTo(e.pageX, e.pageY);
			$this.ctx.stroke();
		},
		
		drawPencilUp: function(e, $this)
		{
			$this.ctx.closePath();
		},

		/*******************************************************************************
		 * save / load data
		 *******************************************************************************/
		getImage: function()
		{
			return this.canvas.toDataURL();
		},
		
		setImage: function(data)
		{
			var $this = this;
			
			var myImage = new Image();
			myImage.src = data;

			$this.ctx.clearRect(0, 0, $this.canvas.width, $this.canvas.height);			
			
			$(myImage).load(function(){
				$this.ctx.drawImage(myImage, 0, 0);
			});
		}

	}

});