/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
TemplateManager,
ReportsFavoritesPopoverView:true
*/
ReportsFavoritesPopoverView = Backbone.View.extend({

    //override super-class initialize function
    initialize: function(opts){
        "use strict";
        var that = this;

        this.$trigger = $(opts.trigger);

        this.$trigger.qtip({
            content:{text:'loading...'},
            position: opts.position,
            show:{
                event:'click',
                ready:false
            },
            hide:{
                event:'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light left reportsFavoritesPopover',
                tip: opts.tip
            },
            events:{
                show:function(event,api){that.doShown();}
            }
            //prevent default (for anchor tags)
        }).click(function(e){e.preventDefault();return false;});

        this.isRendered = false;
    },

    doShown: function(){
        "use strict";
        var that = this;

        if(!this.isRendered){    

            this.setElement(this.$trigger.data('qtip').elements.tooltip);

            this.displayRequestData = {
                method : "display"
            };

            $.ajax({
                dataType:'g5json',//must set this so SeverResponse can parse
                type: "POST",
                url: G5.props.URL_JSON_REPORTS_FAVORITES,
                data: this.displayRequestData,
                success:function(serverResp){

                    that.favoritesJson = serverResp.data;

                    that.reportDashboardId = that.favoritesJson.reportDashboardId;

                    that.favoritesFullVersusStartedFull();
                    that.updateFromNumberOfFavorites();

                    that.render();
                } // ajax success
            }); // get reports favorites ajax            
        } else {  // if not rendered
            that.favoritesFullVersusStartedFull();
            that.updateFromNumberOfFavorites();
        } // if rendered

    }, // doShown

    events: {
        'click .closePopoverBtn':'hide'
    }, // events

    hide: function(){
        "use strict";
        this.$trigger.qtip('hide');
    }, // hide

    initPlugins: function(){
        "use strict";
        var $favList = this.$el.find('.myFavoriteReports'),
            newIndex,
            reportDashboardItemId,
            thatView = this;
        
        thatView.updateFromNumberOfFavorites();

        $favList.sortable({
            stop: function(event, ui) {
                newIndex = ui.item.index();
                reportDashboardItemId = ui.item.attr('id');

                thatView.updateFromNumberOfFavorites();

                thatView.reorderRequestData = {
                    method : "reOrder",
                    reportDashboardId : thatView.reportDashboardId,
                    reportDashboardItemId : reportDashboardItemId,
                    newIndex : newIndex
                };

                $.ajax({
                  dataType:'g5json',//must set this so SeverResponse can parse
                  type: 'POST',
                  url: G5.props.URL_JSON_REPORTS_FAVORITES,
                  data: thatView.reorderRequestData,
                  success: function(serverResp){

                    thatView.favoritesJson = serverResp.data;
                  } // success
                }); // ajax

            }, // update
            axis: 'y'
        }); // sortable
        $favList.disableSelection();
        $favList.find('.ui-state-default')
        .find('.icon-remove').click(function(){
            var deleteReport,
                queryString,
                thisItem = this;
            // $(this).fadeTo(1, 0.5);

            // delete the clicked chart from favorites object in memory
            for (var c = 0; c < thatView.favoritesJson.favorites.length; c++) {
                if (thatView.favoritesJson.favorites[c].id === $(this).closest('.dragItem').attr('id')) {
                    thatView.favoritesJson.favorites.splice([c], 1);
                } // if this is the clicked chart
            } // for each chart in favorites

            thatView.deleteRequestData = {
                method : "remove",
                reportDashboardId: thatView.reportDashboardId,
                reportDashboardItemId: $(this).closest('.dragItem').attr('id')
            };

            $.ajax({
              dataType:'g5json',//must set this so SeverResponse can parse
              type: 'POST',
              url: G5.props.URL_JSON_REPORTS_FAVORITES,  
              data: thatView.deleteRequestData,
              success: function() {

                if (thatView.waitingToAddAfterDelete === true) {
                    if (!thatView.options.triggeredFromModuleView) {
                        thatView.addChartInFocus();
                    }
                    thatView.waitingToAddAfterDelete = false;
                    $('#pleaseRemoveAlert').hide();
                } // if
                if (thatView.favoritesJson.favorites.length >= 5){
                    thatView.favoritesAreFull = true;
                } // if

                thatView.updateFromNumberOfFavorites();
                $(thisItem).closest('.dragItem').remove();
              } // success
            }); // ajax

        }); // click

        // adding touch events (?)
        if( 'ontouchend' in document ) {
            //adds touchPad support
            var $dragItems = $favList.find('.dragItem'),
                touchHandler;

            touchHandler = function(event){
                var touches = event.changedTouches,
                    first = touches[0],
                    type = "";

                switch(event.type)
                {
                    case "touchstart": type = "mousedown"; break;
                    case "touchmove":  type = "mousemove"; break;        
                    case "touchend":   type = "mouseup"; break;
                    default: return;
                }

                if ( !$(event.target).hasClass('icon-remove') ) {
                    event.preventDefault();
                }

                var simulatedEvent = document.createEvent("MouseEvent");
                simulatedEvent.initMouseEvent(type, true, true, window, 1,
                                          first.screenX, first.screenY,
                                          first.clientX, first.clientY, false,
                                          false, false, false, 0/*left*/, null);
                first.target.dispatchEvent(simulatedEvent);
            };

            $dragItems.each(function(i) {
                //listeners are added when the document is loaded, but this will probably get placed in the view's init.. depending
                this.addEventListener("touchstart", touchHandler, true);
                this.addEventListener("touchmove", touchHandler, true);
                this.addEventListener("touchend", touchHandler, true);
                this.addEventListener("touchcancel", touchHandler, true);
            });
        }

    }, // initPlugins

    favoritesFullVersusStartedFull: function() {
        "use strict";
        var that = this;

        if (that.favoritesJson.favorites.length >= 5){
            that.favoritesAreFull = true;
            that.waitingToAddAfterDelete = true;
        } else { // if
            if (!that.options.triggeredFromModuleView) {
                that.addChartInFocus();
            }
            that.waitingToAddAfterDelete = false;
            if (that.favoritesJson.favorites.length >= 5){
                that.favoritesAreFull = true;
            } else { // if
                that.favoritesAreFull = false;
            } // else
        } // else

    }, // favoritesFullVersusStartedFull

    render: function(){
        "use strict";
        var that = this;
        TemplateManager.get('reportsFavoritesPopoverView',function(tpl){

            // add hide flag to JSON before passing into popover template
            if( that.options.showViewMyReportsLink ) {
                that.favoritesJson.showViewMyReportsLink = true;
            } else {
                that.favoritesJson.showViewMyReportsLink = false;                
            }

            //set the contents of qtip
            that.$trigger.qtip('option','content.text',tpl(that.favoritesJson));

            //refresh position and dimensions for new content
            // that.$trigger.qtip('reposition');

            that.initPlugins();

            //set rendered flag
            that.isRendered = true;
        }, G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+'reports/tpl/');

    }, // render

    updateFromNumberOfFavorites: function(){
        "use strict";

        // if this was triggered by the module view
        // OR it was triggered by the page view (assumed) AND there are less than five favorites
        if(this.options.triggeredFromModuleView || this.favoritesJson.favorites.length < 5) {
            $('#pleaseRemoveAlert').hide();
            // only 1 favorite
            if (this.favoritesJson.favorites.length === 1){
                $('#minimumAlert').addClass('alert-error');
                $('.deleteHover').add('#dragToChange').hide();
                this.$el.find('.myFavoriteReports')
                    .sortable({ disabled: true })
                    .addClass('onlyOneFavorite');
                $('.dragItem').css('cursor','default');
            }
            // more than 1 favorte
            else {
                $('#minimumAlert').removeClass('alert-error');
                $('.deleteHover').add('#dragToChange').show();
                this.$el.find('.myFavoriteReports')
                    .sortable({ disabled: false })
                    .removeClass('onlyOneFavorite');
                $('.dragItem').css('cursor','');
            }
        }
        // otherwise, we can assume it was triggered by the page view and there are 5 favorites
        else {
            if (this.waitingToAddAfterDelete === true) {
                $('#pleaseRemoveAlert').show();
            }
            else {
                $('#pleaseRemoveAlert').hide();
            }
        }
        
    }, // updateFromNumberOfFavorites

    addChartInFocus: function(){
        "use strict";
        var that = this;

        this.addRequestData = {
            method : "save",
            chartId : $('.chartThumbs').find('.activeSlide a').data('chartId')
        };

        // if thatView.favoritesJson.favorites.length < 5 add chartInFocus
        if (this.favoritesJson.favorites.length < 5) {

            // add chart to favorites
            $.ajax({
              type: 'POST',
              dataType:'g5json',//must set this so SeverResponse can parse
              url: G5.props.URL_JSON_REPORTS_FAVORITES,
              data: this.addRequestData,
              success: function(serverResp){

                that.favoritesJson = serverResp.data;

                // need to get favorites JSON again & redraw favorites popover
                that.render();

              } // success
            }); // ajax
        }
    } // addChartInFocus

});