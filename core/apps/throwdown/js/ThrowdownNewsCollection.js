/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
G5,
Backbone,
ThrowdownNewsStoryModel,
ThrowdownNewsStoryCollection:true
*/
ThrowdownNewsStoryCollection = Backbone.Collection.extend({
    model: ThrowdownNewsStoryModel,
    sort_key: 'sortDate', // default sort key

    initialize: function(){
        this._dataLoaded = false;
    },
    comparator: function(a,b) {
        var comp = a.get(this.sort_key) > b.get(this.sort_key) ? 1:-1;
        return (this.sort_key === 'sortDate') ? -comp : comp;
    },
    sortByName: function(){
        this.sort_key = 'storyName';
        this.sort();
        return(this);
    },
    sortBySortDate: function(){
        this.sort_key = 'sortDate';
        this.sort();
        return(this);
    },
    sortedBy: function() {
        return this.sort_key;
    },
    loadStories:function(props){
        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_TD_NEWS,
            data: props||{},
            success: function(servResp){
                that._dataLoaded = true;
                that.reset(servResp.data.communications);
                that.trigger('dataLoaded');
            }
        });
    }
});
