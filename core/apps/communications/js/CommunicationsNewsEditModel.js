/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
CommunicationsNewsEditModel:true
*/
CommunicationsNewsEditModel = Backbone.Model.extend({
    // Bug 58246 - related.
    // newsLength is use to keep track of the index so it is unique
    newsLength: 0,
    initialize: function(opts) {
        this.newsIdIncrementer = 0;
        this.imageIdIncrementer = 0;
    },
    loadData : function(opts) {
        var self = this,
            data = {};

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_COMMUNICATION_NEWS_DATA,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data;

                    // convert the newsImages.images array into a Backbone Collection to take advantage of duplicate removal and then back into an array to have the duplicate-free version
                    data.newsImages.images = new Backbone.Collection(data.newsImages.images).toJSON();

                    // start the index off with elements from the backend
                    self.newsLength = data.newsTable.news.length;

                    self.set(data);

                    //notify listener
                    self.trigger('loadDataFinished', data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] CommunicationsNewsEditModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    addNews: function(newData){
        var news = this.get('newsTable').news,
            isAdded = true;

            newData.id = 'addedNews' + this.newsIdIncrementer;

            newData.index = this.newsLength;

            news.push(newData);

            this.newsIdIncrementer += 1;
            this.newsLength += 1;

            this.trigger('newsAdded', newData, isAdded);
    },
    updateNews: function(updatedData){
        var news = this.get('newsTable').news,
            self = this;

        _.each(news, function(story, index){
            if(story.id === updatedData.id){

                story = $.extend({}, story, updatedData);
                news[index] = story;

                self.trigger('newsUpdated', story);
            }
        });
    },
    removeNews: function(id){
        var news = this.get('newsTable').news;

        for (var i = 0; i < news.length; i++)
            if (news[i].id && news[i].id === id) {
                news.splice(i, 1);
                break;
            }

        this.trigger('newsRemoved', news);

    },
    addImage: function(newData){
        var images = this.get('newsImages').images;

            newData.id = 'addedImage' + this.imageIdIncrementer;

            images.push(newData);

            this.imageIdIncrementer+=1;

            this.trigger('imageAdded', newData);
    }

});