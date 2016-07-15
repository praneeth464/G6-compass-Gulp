/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
 _,
 PageView,
 ThrowdownMatchPageView:true
 */
ThrowdownMatchPageView = PageView.extend({
    //override super-class initialize function
    initialize: function(opts) {
        'use strict';
        var thisView = this,
            $cont = this.$el.find('.smackTalkItems:eq(0)'),
            smackTalkId;

        //set the appname (getTpl() method uses this)
        this.appName = 'matchDetail';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);

        console.log("Throwdown MATCH DETAIL: Page View Initialized");

        this.matchDetailsJson = opts.matchDetailsJson || null;
        this.smackTalkJson = opts.smackTalkJson;

        this.model = new ThrowdownMatchModel(thisView.matchDetailsJson);

        this.render();

        // create smacktalk collection from this.smackTalkJson
        this.smackTalkModelCollection = new SmackTalkCollection(this.smackTalkJson);

        // each smack talk gets a smacktalkmodelview applied
        _.each(this.smackTalkModelCollection.models, function(smackTalkModel, i) {
            var smackTalkModelView = new SmackTalkModelView({
                model: smackTalkModel,
                isHideComments:true
                // isKeepElementOnHide: true // don't hide the item when hidden
            });
            $cont.append(smackTalkModelView.el); // append each view's element to the dom
            smackTalkModelView.model.trigger('dataLoaded');
        }, this);

        this.$el.find('input,textarea').placeholder();
    },

     events: {
        'change #promoSelect'       : 'changePromo',
        'keypress .commentInputTxt' : 'newSmackTalk',
        'blur .commentInputTxt'     : 'enforceMaxLength',
        'mouseup .commentInputTxt'  : 'enforceMaxLength'
    },

    render: function() {
        var thisView = this;
        console.log("Throwdown MATCH DETAIL: Rendered");

        TemplateManager.get("throwdownMatchDetails", function(tpl) {

            // clean out the view root and append our rendered template
            thisView.$el
                    .find('.matchModel')
                    .empty()
                    .html(
                        tpl(thisView.matchDetailsJson)
                    );

        }, this.tplUrl);

        thisView.renderCountdown();
        //this.smackTalkModelView.initReadMore();
    },

    enforceMaxLength: function(e) {
        var $tar = $(e.target),
            ml = $tar.attr('maxlength');
        // only for IE and textareas with maxlength attrs
        if(!$.browser.msie||!ml) {return;}

        if($tar.val().length > ml) {
            $tar.val( $tar.val().slice(0,ml) );
        }
    },

    newSmackTalk: function(e) {
        var smackTalkComment,
            matchId,
            thisView = this;

        this.enforceMaxLength(e);

        if (e.which === 13) {
            e.preventDefault();
            smackTalkComment = $(e.currentTarget).val();
            matchId = this.model.get('matchId');

            if ( smackTalkComment.trim() === '' ) {
                return false; // exit out if nothing was entered.
            }

            $(e.currentTarget).val(''); // clear out the text field

            $.ajax({
                dataType:'g5json',//must set this so SeverResponse can parse and return to success()
                url: G5.props.URL_JSON_SMACK_TALK_NEW,
                type: "POST",
                data: {
                    smackTalkComment: smackTalkComment,
                    matchId: matchId
                },
                success:function(serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data,
                        newSmackTalkModel,
                        newSmackTalkModelView;

                    // create new model
                    newSmackTalkModel = new SmackTalkModel(data);

                    // add to the beginning of collection, most recent smack talks are listed first
                    thisView.smackTalkModelCollection.add(newSmackTalkModel, {at: 0});

                    // create view from the new model
                    newSmackTalkModelView = new SmackTalkModelView({
                        model: newSmackTalkModel,
                        isHideComments:true,
                        isKeepElementOnHide: false
                    });

                    // prepend new view to the list of smack talk posts (newest post should be at the top)
                    thisView.$el.find('.smackTalkItems:eq(0)').prepend(newSmackTalkModelView.el);

                    newSmackTalkModelView.$el.animate({opacity: 0, marginLeft: '15%'}, 0);
                    newSmackTalkModelView.$el.animate({opacity: 1, marginLeft: 0}, 400);

                    newSmackTalkModelView.model.trigger('dataLoaded');
                }
            });
        }
    },

    changePromo: function(e) {
   //      var thisView = this,
   //          $cont = this.$el.find('.smackTalkItems:eq(0)'),
			// str = "";

   //      str = this.$el.find(":selected").text();

   //      //submit the page data
        $(e.target).closest('form').submit();
  //       //thisView.$el.submit();

  //       //empty the models
  //       thisView.$el.find('.matchModel').empty();
  //       thisView.$el.find('.td-promo-countdown .cd-digit').empty();
  //       $cont.empty();

  //       //re-render the models
  //       thisView.render();
  //       $cont.append(this.smackTalkModelView.el);

		// this.$el.find(".selectOutput").text(str);

    },

    renderCountdown: function() {
        var thisView = this;
        console.log("Throwdown MATCH DETAIL: Render Countdown");

        thisView.initCountdown(thisView.$el.find('.td-promo-countdown ul'), thisView.model.toJSON().endDate);
    },

    initCountdown: function(clock, targetdate) {
        // clock is a jQ object
        // targetdate is a date string of any sort (milliseconds, fully expanded, etc.)

        var t = new Date(targetdate);

        function calcDate() {
            var n = new Date();
            var i = (t - n) / 1000;
            var c = {};
            var x;

            if (n >= t) {
                clearInterval(G5.throwdown.roundCountdown);
            }
            else {
                c.d = Math.floor(i / 86400);
                c.h = Math.floor(i / 3600 % 24);
                c.m = Math.floor(i / 60 % 60);
                c.s = Math.floor(i % 60);
            }

            for (x in c) {
                if (c.hasOwnProperty(x)) {
                    var temp = c[x].toString();
                    if (temp.length === 1) {
                        c[x] = '0' + temp;
                    }
                    else {
                        c[x] = temp;
                    }

                    clock.find('.' + x + ' span.cd-digit').html(c[x]);
                }
            }

            return false; // return false to prevent mobile safari from jumping to top of page
        }

        // run it the first time, then every second
        calcDate();
        G5.throwdown.roundCountdown = setInterval(calcDate, 1000);
    }

});
