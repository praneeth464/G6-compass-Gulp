/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
BinPacker:true,
BinArrangement:true,
GridMap:true
*/

/*
	BinPacker - finds happy arrangements of modules
	- implements a 2d bin packing algorithm
*/
BinPacker =  function(squares,bounds){
	//settings
	this.settings = {
		growHorizontal:true, //grow horizontal to find good fits
		useAltModDims:true //use alternative module dimension to find good fits
	};

	//ideal form to fill
	this.idealDims = {w:6,h:4};

	//minimum bounding rectangle width
	this.minBoundingWidth = 2;

	this.squares = squares; //geometries for squares
	this.bounds = bounds; //the dimensions of the container
	this.arrangements = []; //last arrangements found
};

_.extend(BinPacker.prototype, {

	//find arrangements using various approaches
	findArrangements:function(){
		var ba = null,
			bestArr = null,
			that = this,
			time = new Date().getTime(),
			packMode,i;

		/*==================================================================
		*	FIRST PASS
		*	- collect various configurations appropriate for viewport width
		=====================================================================*/

		// CASE: if our portal is less than MIN grid widths
		// 1) pack with bounding rect fixed at MIN units
		// 2) give all squares minimum dims
		if( this.bounds.w <= this.minBoundingWidth){

			packMode = 'MOBILE';

			//set each rects dims to its minimum dims
			_.each(this.squares, function (s) {
				s.dims = s.minDims;
			});

			ba = new BinArrangement(this.minBoundingWidth,this.squares);
			this.arrangements.push(ba);
		}

		// CASE: if we have a skinny portal (but not too skinny)
		// 1) pack with bounding rect of portal
		else if( this.idealDims.w > this.bounds.w ){

			packMode = 'SKINNY';

			//first pass uses recomended dims
			ba = new BinArrangement(this.bounds.w, this.squares);
			this.arrangements.push(ba);

			//if we are set to try alternative mod dims
			if(this.settings.useAltModDims){
				this._addAltModDimArrs();
			}

		}

		// CASE: we have a portal of adequate width, lets try some various widths
		// 1) try packing from ideal width increment width to viewport bounds width
		// 2) produces multiple results, must be rated for best configuration
		else{

			packMode = 'BIG SKY';

			for(i=this.idealDims.w; i<= this.bounds.w; i++){
				ba = new BinArrangement(i, this.squares);
				this.arrangements.push(ba);

				//if we are set to try alt mod dims (i is bounding width)
				if(this.settings.useAltModDims){
					this._addAltModDimArrs(i);
				}
			}

		}


		/*===============================================
		*	SECOND PASS
		*	- test configs for aesthetic deliciousness
		=================================================*/

		//some stats
		var totalPosAtts = 0,totalSucAtts = 0;
		time = new Date().getTime() - time;

		//sort from least to greatest
		this.arrangements = _.sortBy(this.arrangements, function(a){
			totalPosAtts+=a.numFittingAttempts;
			totalSucAtts+=a.numFittingSuccess;
			return a.getScore();
		} );

		//best score is last in array
		bestArr = this.arrangements[this.arrangements.length-1];

		//console.log(bestArr.gridMap.toString());

		//log some useful stats
		console.log('[INFO]\n*** BinPacker Stats **************************'
			+'\n\tbounds:        '+this.bounds.w+'x'+this.bounds.h
			+'\n\tmodules:       '+this.squares.length
			+'\n\tarngmtsFound:  '+this.arrangements.length
			+'\n\tpackMode:      ['+packMode+']'
			+'\n\twinning score: ' + bestArr.getScore()
			+'\n\ttime:          '+time+'ms'
			+'\n\ttotalPosAttempts:           ' + totalPosAtts
			+'\n\ttotalSuccessfulPositioning: ' + totalSucAtts
			+'\n\tsuccess rate:               ' + Math.floor((totalSucAtts/totalPosAtts)*100) + '%'
			+'\n\t--- all scores ---\n\t'
			+_.reduce(this.arrangements,function(mem,a){
				return (typeof mem==='object'?'':mem)+" "+a.getScore();
			},'')
			+'\n **********************************************'
		);


		//return the best arrangement
		return bestArr;

	},

	//add alternative dimension module dimension configs to arrangements
	//SLOW - thinking of ways to speed it up
	//NOTE - something similar can be done post-arrangement -- looking up holes
	//  and looking for perpendicular boxes which can expand
	_addAltModDimArrs:function(boundingWidth){

		var rectsClone = this._cloneMyRects(),//lets not wreck the original version of the rectangles
			that=this,
			i;


		//we need to find all combinations of alternatives (this could get slow)
		// 1) hack the combinations using n.toString(2)
		// 2) generate rects[] for each combo (clone an replace)

		var altRects = _.filter(rectsClone, function(r){
			return r.altDims!==null && (r.dims.w==1 || r.dims.w==2);}
		);
		var comboMap = [];

		//start at 1, 0 is the combination of no alts being used (default)
		//go up to numAltRects^2 -- a count of all possibilities
		for(i=1;i<Math.pow(altRects.length,2);i++){
			var i2s = i.toString(2);
			//fill in missing zeros
			while(i2s.length<altRects.length){i2s = '0'+i2s;}

			comboMap.push(i2s); //gives a str rep of this number (boolean combinations)
		}

		//for each combo string, shove that combo of alts into our fresh rects[]
		var altDimRectsArray = _.map(comboMap,function(comboStr){

			//find the cids of the rects to turn alt dims on
			var cidsToChng = {};
			for(var i=0;i<comboStr.length;i++){
				var iAltRect = altRects[i];
				if(comboStr[i]==='1'){
					cidsToChng[iAltRect.cid] = true;
				}
			}

			//go through all rects array and set alts up
			var newRects = _.map(that._cloneMyRects(),function(r){
				if(_.has(cidsToChng, r.cid)){
					r.dims = r.altDims;
				}
				return r;
			});

			return newRects;
		});

		//console.log(altDimRectsArray);

		_.each(altDimRectsArray,function(altDimRects){
			var ba;

			//boundingDims not set? default to our global bounds
			ba = new BinArrangement(boundingWidth||that.bounds.w, altDimRects);

			//add it
			that.arrangements.push(ba);
		});

		/*
		//OLD VERSION, only N out of N^2 combinations
		_.each(rectsClone,function(s){
			var ba;

			if(s.altDims!==null){

				//swap these dims
				s.dims = s.altDims;

				//boundingDims not set? default to our global bounds
				ba = new BinArrangement(boundingWidth||that.bounds.w, rectsClone);

				//add it
				//that.arrangements.push(ba);

			}
		});
		*/


	},

	//returns a clone of the rectangles
	_cloneMyRects:function(){
		return _.map(this.squares,function(origRect){
			var clone = _.clone(origRect);
			clone.dims = _.clone(origRect.dims);
			clone.altDims = _.clone(origRect.altDims);
			return clone;
		});
	}


});



/*
*	BinArrangement - a bin arrangement
*/
BinArrangement = function(maxGridWidth,squares){
	//maximum grid width
	this.maxGridWidth = maxGridWidth>0?maxGridWidth:1;

	//arranged squares
	this.arrangement = [];

	//this gridMap
	//this.gridMap = new GridMap(maxGridWidth);

	//stats
	this.numFittingAttempts = 0;
	this.numFittingSuccess = 0;

	//add the squares
	if(squares && squares!==null){
		_.each(squares, function(s){ this.add(s); }, this );
	}

};

_.extend(BinArrangement.prototype, {

	//add a square to this arrangement
	add:function(square){

		//clone the square, we don't want all arrangements to have the same object
		square.dims = _.clone(square.dims);//deep clone important stuff
		square = _.clone(square);//shallow clone


		//find an opening
		var opening = this._findOpening(square);
		//this.gridMap.addRect(square.dims.w,square.dims.h);

		//we found an opening, lets set the pos and add to array
		if(opening){
			square.x = opening.x;
			square.y = opening.y;
			this.arrangement.push(square);
		}
	},

	//find and set bounding dimensions
	getBoundingDims:function(){

		var maxWidth = 0,
			maxHeight = 0;

		//find the maximum extent (x or y + width or height) of squares
		_.each(this.arrangement, function(a){
			var w = a.x+a.dims.w,
				h = a.y+a.dims.h;
			maxWidth = maxWidth>w?maxWidth:w;
			maxHeight = maxHeight>h?maxHeight:h;
		});

		return {w:maxWidth,h:maxHeight};
	},

	//generate a score based on a battery of tests
	getScore:function(){
		if(this._score) return this._score;

		var filled,ratio,score,
			bds = this.getBoundingDims();

		//filled/total spaces ratio
		filled = _.reduce(this.arrangement, function (mem,arr) {
			return mem + (arr.dims.w * arr.dims.h);
		}, 0);

		ratio = (filled/(bds.w*bds.h));

		score = Math.floor(ratio*100);

		//now we have (filled/total)*100 ratio

		//subtract the height - creates a penalty and breaks ratio ties
		score = score - bds.h;

		//add the y value, higher val means lower opening which is aesthetically good
		score = score + this._findOpening({dims:{w:1,h:1}}).y;

		this._score=score;//set it, now it stays

		return score;
	},

	//find open position
	_findOpening:function(square){
		var y,x;

		/* go through each grid position and see if our module conflicts with another */
		//y axis grows until everything is placed (limit to 1000, just in case)
		for(y=0; y<1000; y++){

			//x axis is limited to the max width
			for(x=0; x<this.maxGridWidth; x++){

				//if no collisions with other squares & not outside bounds
				if(!this._findPosConflict(x,y,square) &&
					!this._hasEscaped(x,y,square)){

					//open position found, return coords
					return {x:x,y:y};
				}

			}
		}

	},

	//check to see if this square intersects/collides with one already placed
	_findPosConflict:function(x,y,square){

		var wasConflict = false,
			w = square.dims.w,
			h = square.dims.h,
			placed = this.arrangement,
			bad = {},
			i,placedSquare,px,py,pw,ph;

		//for each placed item, check to see if it conflicts
		for (i = 0; i < placed.length; i++) {

			placedSquare = placed[i];
			px = placedSquare.x;
			py = placedSquare.y;
			pw = placedSquare.dims.w;
			ph = placedSquare.dims.h;

			//is rect a over b, or b over a?
			wasConflict = this._doSquaresIntersect(x,y,w,h,px,py,pw,ph)||
				this._doSquaresIntersect(px,py,pw,ph,x,y,w,h);

			if(wasConflict) break;

		}

		//console.log('isPosConf: ('+x+', '+y+', '+w+','+h+') = '+wasConflict);
		this.numFittingSuccess = this.numFittingSuccess+(wasConflict?0:1);
		this.numFittingAttempts++;

		return wasConflict;
	},


	//check to see if a squares corners intersect anothers
	_doSquaresIntersect:function(x,y,w,h, px,py,pw,ph){

		var wasConflict = false,bad = {};

		//check for intersection of rectangles (this is where the magic happens)
		bad.x1 = px<=x && x<px+pw;
		bad.x2 = px<x+w && x+w<=px+pw;
		bad.y1 = py<=y && y<py+ph;
		bad.y2 = py<y+h && y+h<=py+ph;

		// 1) top-left
		if(bad.x1 && bad.y1){wasConflict = true;}
		// 2) top-right
		if(bad.x2 && bad.y1){wasConflict = true;}
		// 3) bottom-left
		if(bad.x1 && bad.y2){wasConflict = true;}
		// 4) bottom-right
		if(bad.x2 && bad.y2){wasConflict = true;}

		// 5) edge cases
		if(x+w===px+pw && (bad.y1 || bad.y2)){wasConflict = true;}
		if(y+h===py+ph && (bad.x1 || bad.x2)){wasConflict = true;}
		if(x===px && (bad.y1 || bad.y2)){wasConflict = true;}
		if(y===py && (bad.x1 || bad.x2)){wasConflict = true;}

		//TO-DO: check for cross formation -- especially if we get 1x3 dimensions happening


		//console.log('isPosConf: ('+x+', '+y+', '+w+','+h+') = '+wasConflict);
		return wasConflict;
	},


	//check to see if this square is outside the bounds
	_hasEscaped:function(x,y,square){
		//right now we just check if its outside the x-axis width
		if(x + square.dims.w > this.maxGridWidth) return true;

		return false;
	}

});



/*
*	GridMap - abstraction seive for finding fits
*/
GridMap = function(maxWidth){
	this.maxWidth = maxWidth||6;
	this.grid = [];
	this.grid[0] = [false];
	this._p = {x:0,y:0};
};

_.extend(GridMap.prototype, {
	addRect:function(w,h){},
	xaddRect:function(w,h){
		var x,y,nxOp;
		//find openings until one fits
		// a. it fits
		// b. it pushes too far east
		// c. it needs to expand down
		// d. b&c

		this.nextOpen(true);//clears the pointer
		while(nxOp = this.nextOpen()){

			if(this.isFit(nxOp[0],nxOp[1],w,h))
				break;

		}

		this.fillInRect(nxOp[0],nxOp[1],w,h);

	},

	isFit:function(x,y,w,h){
		var i,j;
		console.log(x,y,w,h);
		for(i=y; i<y+h; i++){
			for(j=x; j<x+w; j++){
				if(this.grid[i][j]){
					return false;
				}
			}

			if(i == this.grid.length)//must expand
				this.adjustDims(this.maxWidth,this.grid.length+1);
		}
		return true;
	},

	nextOpen:function(clearPointer){
		var res;

		if(clearPointer){
			this._p.x=0;
			this._p.y=0;
			return;
		}

		while(this.grid[this._p.y][this._p.x]){
			console.log(this._p.x+', '+this._p.y);

			if(this._p.y+1 >= this.grid.length){
				this.adjustDims(this.maxWidth,this.grid.length+1);
			}

			this.inc();
		}

		res = _.clone(this._p);

		this.inc();

		return _.toArray(res);
	},

	inc:function(){
		this._p.x++;
		if(this._p.x >= this.grid[0].length){
			this._p.x = 0;
			this._p.y++;
		}
	},

	fillInRect:function(x,y,w,h){
		var rWExt = x+w,
			rHExt = y+h,i,j;
		//add width or height if necessary
		this.adjustDims(rWExt,rHExt);

		//fill in the spaces
		for(i = y; i < y+h; i++){
			for(j = x; j < x+w; j++){
				this.grid[i][j] = true;
			}
		}

	},

	adjustDims:function(w,h){
		var i,j,diff,x;

		if(this.grid[0].length<w){
			diff = w - this.grid[0].length;
			for(i=0;i<this.grid.length;i++){
				for(j=0;j<diff;j++){this.grid[i].push(false);}
			}
		}

		if(this.grid.length<h){
			diff = h - this.grid.length;

			for(j=0;j<diff;j++){
				x = _.clone(this.grid[0]);
				_.each(x,function(el,ind,lst){lst[ind]=false;});
				this.grid.push(x);
			}
		}
	},

	toString:function(){
		var i;

		for(i=0;i<this.grid.length;i++){
			console.log(_.reduce(this.grid[i],function(mem,isFilled){return mem+(isFilled?' * ':' . ');},''));
		}
	}
});