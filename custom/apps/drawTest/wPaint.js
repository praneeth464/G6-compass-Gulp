/******************************************
* Websanova.com
*
* Resources for web entrepreneurs
*
* @author          Websanova
* @copyright       Copyright (c) 2012 Websanova.
* @license         This wPaint jQuery plug-in is dual licensed under the MIT and GPL licenses.
* @link            http://www.websanova.com
* @docs            http://www.websanova.com/plugins/websanova/paint
* @version         Version x.x
*
******************************************/

$(document).ready(function(){

		//adds touchPad support
		function touchHandler(event){

		    var touches = event.changedTouches,
		        first = touches[0],
		        type = "";

			switch(event.type)
			{
			    case "touchstart": type = "mousedown"; break;
			    case "touchmove":  type="mousemove"; break;        
			    case "touchend":   type="mouseup"; break;
			    default: return;
			}

			if (event.target.id == 'drawingCanvas' ) {
			    event.preventDefault();
			}

		    var simulatedEvent = document.createEvent("MouseEvent");
		    simulatedEvent.initMouseEvent(type, true, true, window, 1,
		                              first.screenX, first.screenY,
		                              first.clientX, first.clientY, false,
		                              false, false, false, 0/*left*/, null);
			first.target.dispatchEvent(simulatedEvent);

		}


	//old IE doesn't need these listeners since it can't use canvas anyway
	if(window.HTMLCanvasElement) {

		//listeners are added when the document is loaded, but this will probably get placed in the view's init.. depending
		document.addEventListener("touchstart", touchHandler, true);
		document.addEventListener("touchmove", touchHandler, true);
		document.addEventListener("touchend", touchHandler, true);
		document.addEventListener("touchcancel", touchHandler, true);    
			

	} else {
		//hide the menu if old IE can't use it
		$('#drawToolMenu').hide();
	}

	//this sits out here so IE can still change e-cards as needed
	var drawingBackground = $('#backgroundSelect');
	$(drawingBackground).find('li').click(function(event){
		var backgroundImage = event.target.id;
		if (backgroundImage != 'background0'){
			$('#wPaint').css("background-image", "url(images/"+backgroundImage+".jpg)");
		} else {
			$('#wPaint').css("background-image", "none");

		}
	});	


});

(function($)
{
	
	/***************************************
	*   Default code
	****************************************/

	$.fn.wPaint = function(option, settings)
	{
		if(typeof option === 'object')
		{
			settings = option;
		}
		else if(typeof option == 'string')
		{
			var data = this.data('_wPaint_canvas');
			var hit = true;

			if(data)
			{
				if(option == 'image' && settings === undefined) return data.getImage();
				else if($.fn.wPaint.defaultSettings[option] !== undefined)
				{
					if(settings !== undefined) data.settings[option] = settings;
					else return data.settings[option];
				}
				else hit = false;
			}
			else hit = false;
			
			return hit;
		}

		console.log('this inside plugin: ', this);
		//clean up some variables
		settings = $.extend({}, $.fn.wPaint.defaultSettings, settings || {});
		settings.lineWidth = parseInt(settings.lineWidth);

		return this.each(function()
		{			
			var elem = $(this);
			var $settings = jQuery.extend(true, {}, settings);
			
			//test for HTML5 canvas
			var test = document.createElement('canvas');
			if(!test.getContext)
			{
				//set up something to throw a flag for handling e-card displaying later
				return false;	
			}
			
			var canvas = new Canvas($settings);
			var mainMenu = new MainMenu();
			var textMenu = null;

			console.log('this: ', this);
			console.log('canvas: ', canvas);
			
			elem.append(canvas.generate(elem.width(), elem.height()));
			elem.append(canvas.generateTemp(elem.width(), elem.height()));
			
			$('body')
			.append(mainMenu.generate(canvas, textMenu))

			//init mode
			mainMenu.set_mode(mainMenu, canvas, $settings.mode);


			var pencilButton = $('#pencilButton'); 
			pencilButton.click(function(event){
				mainMenu.set_mode(mainMenu, canvas, 'Pencil');
				$('#drawToolMenu').find('.active').removeClass('active');
				$(this).addClass('active');
			});			
			
			var eraserButton = $('#eraserButton'); 
			eraserButton.click(function(event){
				mainMenu.set_mode(mainMenu, canvas, 'Eraser');
				$('#drawToolMenu').find('.active').removeClass('active');				
				$(this).addClass('active');
			});			

			var colorSelect = $('#colorSelect');
			$(colorSelect).find('li').click(function(event){
				var thisColor = event.target.id;
				console.log('this color: ', thisColor);
				switch (thisColor){
					case 'colorSelectRed':
						canvas.settings.strokeStyle = '#ff0000';
						break;
					case 'colorSelectBlue':
						canvas.settings.strokeStyle = '#0000ff';
						break;
					case 'colorSelectGreen':
						canvas.settings.strokeStyle = '#00ff00';
						break;
				}
			});

			var lineWidthSelect = $('#lineWidthSelect');
			$(lineWidthSelect).find('li').click(function(event){
				var thislineWidth = event.target.id;
				switch (thislineWidth){
					case 'lineWidth2':
						canvas.settings.lineWidth = 2;
						break;
					case 'lineWidth4':
						canvas.settings.lineWidth = 4;
						break;
					case 'lineWidth6':
						canvas.settings.lineWidth = 6;
						break;
					case 'lineWidth8':
						canvas.settings.lineWidth = 8;
						break;
				}
			});

			var drawingBackground = $('#backgroundSelect');
			$(drawingBackground).find('li').click(function(event){
				var backgroundImage = event.target.id;
				if (backgroundImage != 'background0'){
					canvas.settings.backgroundImage = backgroundImage;
				} else {
					canvas.settings.backgroundImage = null;

				}
			});	

			var saveImage = $('#saveImage');
			$(saveImage).click(function(event){
				(event).preventDefault();
				var canvas1 = document.getElementById('drawingCanvas');
				var canvas2 = document.getElementById('bufferingCanvas');
				
				$('#bufferingCanvas').show();
				
				if (canvas1.getContext){
				var ctx1 = canvas1.getContext('2d');
				}
				
				if (canvas2.getContext){
				var ctx2 = canvas2.getContext('2d');
				}
				
				ctx2.drawImage(canvas1, 0, 0);
				var img = new Image();
			
				if (canvas.settings.backgroundImage){
					img.src = "images/"+canvas.settings.backgroundImage+".jpg";
					img.onload = function() {
						ctx1.drawImage(img, 0, 0);
						ctx1.drawImage(canvas2, 0, 0);	
						writeImage();
					}
				} else {
					ctx1.drawImage(canvas2, 0, 0);
					writeImage();		
				}			
				
				$('#bufferingCanvas').hide();
			});

			var clearImage = $('#clearImage');
			$(clearImage).click(function(event){
				(event).preventDefault();
				var canvas1 = document.getElementById('drawingCanvas');
				var ctx1 = canvas1.getContext('2d');
				ctx1.clearRect(0,0,canvas1.width,canvas1.height);
			});
			
			// //pull from css so that it is dynamic
			// var buttonSize = $("._wPaint_icon").outerHeight() - (parseInt($("._wPaint_icon").css('paddingTop').split('px')[0]) + parseInt($("._wPaint_icon").css('paddingBottom').split('px')[0]));
			
			if($settings.image){
				canvas.setImage($settings.image);
			}
			
			elem.data('_wPaint_canvas', canvas);
		});
	}

	$.fn.wPaint.defaultSettings = {
		mode				: 'Pencil',			// drawing mode - Rectangle, Ellipse, Line, Pencil, Eraser
		lineWidth			: '2', 				// starting line width
		strokeStyle			: '#FFFF00',		// start stroke style
		image				: null,				// preload image - base64 encoded data
		drawDown			: null,				// function to call when start a draw
		drawMove			: null,				// function to call during a draw
		drawUp				: null				// function to call at end of draw
	};

	function writeImage()
	{
		var imageData = $("#wPaint").wPaint("image");

		$.ajax({
			type: 'POST',
			url: 'processImage.php',
			data: { img: imageData }     
		})
		.done(function(data){window.open('displayImage.html');});			
		
		$("#canvasImage").attr('src', imageData);
		//$("#canvasImageData").val(imageData);
	}

	function sayHello(){
		alert('hi there.');
	}

	/**
	 * Canvas class definition
	 */
	function Canvas(settings)
	{
		this.settings = settings;
		
		this.draw = false;

		this.canvas = null;
		this.ctx = null;

		this.canvasTemp = null;
		this.ctxTemp = null;
		
		this.canvasTempLeftOriginal = null;
		this.canvasTempTopOriginal = null;
		
		this.canvasTempLeftNew = null;
		this.canvasTempTopNew = null;
		
		this.textInput = null;
		
		return this;
	}
	
	Canvas.prototype = 
	{
		generate: function(width, height)
		{	
			this.canvas = document.createElement('canvas');
			this.ctx = this.canvas.getContext('2d');
			$(this.canvas).attr("id","drawingCanvas");			
			
			//create local reference
			var $this = this;
			
			$(this.canvas)
				.attr('width', width + 'px')
				.attr('height', height + 'px')
				.css({position: 'absolute', left: 0, top: 0})
			.mousedown(function(e)
			{
				e.preventDefault();
				e.stopPropagation();
				$this.draw = true;
				$this.callFunc(e, $this, 'Down');
			});
						
			$(document)
			.mousemove(function(e)
			{
				if($this.draw) $this.callFunc(e, $this, 'Move');
			})
			.mouseup(function(e)
			{
				//make sure we are in draw mode otherwise this will fire on any mouse up.
				if($this.draw)
				{
					$this.draw = false;
					$this.callFunc(e, $this, 'Up');


					//	flag/trigger here to find the image data, and add it to the object & hidden form field
				}
			});
			
			return $(this.canvas);
		},

		sayHello: function(){
			alert("hi there.");
		},
		
		generateTemp: function(width, height)
		{
			this.canvasTemp = document.createElement('canvas');
			$(this.canvasTemp)
			.attr('width', width + 'px')
			.attr('height', height + 'px')
			.css({position: 'absolute',left: 0, top: 0}).hide();
			
			this.ctxTemp = this.canvasTemp.getContext('2d');
			$(this.canvasTemp).attr("id","bufferingCanvas");
			
			var $this = this;
			
			return $(this.canvasTemp);
		},
		
		callFunc: function(e, $this, event)
		{
			$e = jQuery.extend(true, {}, e);
			
			var canvas_offset = $($this.canvas).offset();
			
			$e.pageX = Math.floor($e.pageX - canvas_offset.left);
			$e.pageY = Math.floor($e.pageY - canvas_offset.top);
			
			// var mode = $.inArray($this.settings.mode, shapes) > -1 ? 'Shape' : $this.settings.mode;
			var mode = $this.settings.mode;
			var func = $this['draw' + mode + '' + event];	
			
			if(func) func($e, $this);
		},
			
		/*******************************************************************************
		 * draw pencil
		 *******************************************************************************/
		drawPencilDown: function(e, $this)
		{
			$this.ctx.lineJoin = "round";
			$this.ctx.lineCap = "round";
			$this.ctx.strokeStyle = $this.settings.strokeStyle;
			$this.ctx.fillStyle = $this.settings.strokeStyle;
			$this.ctx.lineWidth = $this.settings.lineWidth;
			
			//draw single dot in case of a click without a move
			$this.ctx.beginPath();
			$this.ctx.arc(e.pageX, e.pageY, $this.settings.lineWidth/2, 0, Math.PI*2, true);
			$this.ctx.closePath();
			$this.ctx.fill();
			
			//start the path for a drag
			$this.ctx.beginPath();
			$this.ctx.moveTo(e.pageX, e.pageY);
			e.preventDefault();
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
		 * eraser
		 *******************************************************************************/
		drawEraserDown: function(e, $this)
		{
			$this.ctx.save();
			$this.ctx.globalCompositeOperation = 'destination-out';
			$this.drawPencilDown(e, $this);
		},
		
		drawEraserMove: function(e, $this)
		{
		    $this.drawPencilMove(e, $this);
		},
		
		drawEraserUp: function(e, $this)
		{
			$this.drawPencilUp(e, $this);
			$this.ctx.restore();
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
	
	/**
	 * Main Menu
	 */
	function MainMenu()
	{
		this.menu = null;		
		return this;
	}
	
	MainMenu.prototype = 
	{
		generate: function(canvas, textMenu)
		{
			var $canvas = canvas;
			//null, but it's being difficult to kill so I'm leaving it for now
			this.textMenu = textMenu;
			var $this = this;
			
			return this.menu = $('#drawToolMenu');
		},

		set_mode: function($this, $canvas, mode)
		{
			$canvas.settings.mode = mode;
		}
	}

})(jQuery);