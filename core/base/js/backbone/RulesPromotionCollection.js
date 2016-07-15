/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
G5,
Backbone,
RulesPromotionModel,
RulesPromotionCollection:true
*/
RulesPromotionCollection = Backbone.Collection.extend({
    model: RulesPromotionModel,

    // comparator: function( collection ){
    //  return( collection.get( 'name' ) );
    // },

    //shamefull, model method inside a view, lazy, lazy (copied from BudgetCollectionView - lazier still!)
    loadRules:function(props){
        var that = this,
            loadSpinner = function(start) {
                var opts = {
                          lines: 13, // The number of lines to draw
                          length: 7, // The length of each line
                          width: 4, // The line thickness
                          radius: 10, // The radius of the inner circle
                          corners: 1, // Corner roundness (0..1)
                          rotate: 0, // The rotation offset
                          color: '#000', // #rgb or #rrggbb
                          speed: 1, // Rounds per second
                          trail: 60, // Afterglow percentage
                          shadow: false, // Whether to render a shadow
                          hwaccel: false, // Whether to use hardware acceleration
                          className: 'spinner', // The CSS class to assign to the spinner
                          zIndex: 2e9, // The z-index (defaults to 2000000000)
                          top: 'auto', // Top position relative to parent in px
                          left: 'auto' // Left position relative to parent in px
                };

                if (start){
                    $("#rulesPageView").spin(opts);
                }else{
                    $("#rulesPageView").spin(false);
                }
                
            };
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_RULES,
            data: props||{},
            beforeSend: function() {
                loadSpinner(true);
            },
            success: function(servResp){
                that.reset(servResp.data.promotions);
                loadSpinner(false);
                that.trigger('dataLoaded');
            }
        });
    }       

});