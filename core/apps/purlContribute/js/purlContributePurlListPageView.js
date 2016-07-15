/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
console,
PageView,
PurlContributeCollection,
PurlContributePurlListPageView:true
*/
PurlContributePurlListPageView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts) {
        console.log('[INFO] purlContributeMainPageView: PURL Contribute List Page view initialized', this);

        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = "purlContribute";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.model = new PurlContributeCollection();

        this.model.bindDatePickers(thisView);

        this.$table = this.$el.find('#PURLContributeListTable table');
        this.$table.responsiveTable({
            pinLeft : [0]
        });

    },

    events: {
        "click .participant-popover":"attachParticipantPopover",
        "click .sortControl":"sortRows"
         
    },

    attachParticipantPopover:function(e){
        var $tar = $(e.target);
        if ($tar.is("img")){
            $tar = $tar.closest("a");
        }
        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $(e.target).participantPopover().qtip('show');
        }      
        e.preventDefault();
    },

    sortRows: function(event) {
        //sort directions are 'up' and 'down'
        //srtBy params can be 'number' 'string'

        // undo responsive table
        if( this.$table.data('rT_api').getState() == 'responsive' ) {
            this.$table.data('rT_api').makeNormal();
        }

        var $table = $("#PURLContributeListTable"),
            $rows = $('tr[name*="row"]'),
            $newRows = $rows.clone(),
            $target = $(event.target),
            $tableHeader = $("#tableHeader"),
            srtDirection = $target.attr("data-sort-direction"),
            srtBy = $target.attr("data-sort-type"),
            sortParam = $target.attr("data-sort"),
            
            sortAlpha = function() {
                $newRows.sort(function(a,b) {
                    var aText = $(a).find("." + sortParam).text().toUpperCase(),
                        bText = $(b).find("." + sortParam).text().toUpperCase();                    

                    if ( srtDirection === "down"){
                        $target.attr("data-sort-direction", "up").addClass("icon-sort-up").closest("th").addClass("sorted");
                        return (aText < bText) ? -1 : (aText > bText) ? 1 : 0;
                    }else{
                        $target.attr("data-sort-direction", "down").addClass("icon-sort-down").closest("th").addClass("sorted");
                        return (aText > bText) ? -1 : (aText < bText) ? 1 : 0;
                    }
                });
            },

            sortNumeric = function() {
                $newRows.sort(function(a,b) {
                    var aText = parseInt($(a).find("." + sortParam + " input").val(), 10),
                        bText = parseInt($(b).find("." + sortParam + " input").val(), 10);

                    if ( srtDirection === "down"){
                        $target.attr("data-sort-direction", "up").addClass("icon-sort-up").closest("th").addClass("sorted");
                        return aText == bText ? 0 : aText < bText ? -1 : 1;
                    }else{
                        $target.attr("data-sort-direction", "down").addClass("icon-sort-down").closest("th").addClass("sorted");
                        return aText == bText ? 0 : aText > bText ? -1 : 1;
                    }
                    
                });
            },

            clearSortClasses = function() {
                $tableHeader.find(".sorted").removeClass("sorted");
                $tableHeader.find(".icon-sort-up, .icon-sort-down").removeClass("icon-sort-up icon-sort-down");
            };

        clearSortClasses(); //clear the arrow sorting style classes 

        if (srtBy === "string"){
            sortAlpha();
        }else{                
            sortNumeric(); //sort the jq object
        }

        $table.find("tr").not($tableHeader).remove(); //clear the table
        $table.find("tbody").append($newRows); //append the new, sorted elements
        this.model.bindDatePickers(this); //rebind the date pickers

        // redo responsive table
        this.$table.data('rT_api').checkWidth();

        // if the table becomes responsive, scroll sideways to the sorted header
        if( this.$table.data('rT_api').getState() == 'responsive' ) {
            $table.find('.rT-innerWrapper').scrollTo($target.closest('th,td'), {offset: {left: -1 * $table.find('.rT-pinLeft-wrap').outerWidth()}});
        }
    }

});