/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
CommunicationsBannersEditModel:true
*/
CommunicationsBannersEditModel = Backbone.Model.extend({
    // Bug 58246 - New language Content in Banners not getting saved.
    // bannerLength is use to keep track of the index so it is unique
    bannerLength: 0,
    initialize: function(opts) {
        this.bannerIdIncrementer = 0;
        this.imageIdIncrementer = 0;
    },
    loadData : function(opts) {
        var self = this,
            data = {};

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_COMMUNICATION_BANNER_DATA,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data;

                    // convert the bannerImages.images array into a Backbone Collection to take advantage of duplicate removal and then back into an array to have the duplicate-free version
                    data.bannerImages.images = new Backbone.Collection(data.bannerImages.images).toJSON();

                    // start the index off with elements from the backend
                    self.bannerLength = data.bannerTable.banners.length;

                    self.set(data);

                    //notify listener
                    self.trigger('loadDataFinished', data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] CommunicationsBannerEditModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    addBanner: function(newData){
        var banners = this.get('bannerTable').banners,
            isAdded = true;

            newData.id = 'addedBanner' + this.bannerIdIncrementer;

            newData.index = this.bannerLength;

            banners.push(newData);

            this.bannerIdIncrementer += 1;
            this.bannerLength += 1;

            this.trigger('bannerAdded', newData, isAdded);
    },
    updateBanner: function(updatedData){
        var banners = this.get('bannerTable').banners,
            self = this;

        _.each(banners, function(banner, index){
            if(banner.id === updatedData.id){

                banner = $.extend({}, banner, updatedData);
                banners[index] = banner;

                self.trigger('bannerUpdated', banner);
            }
        });
    },
    removeBanner: function(id){
        var banners = this.get('bannerTable').banners,
            bannerRemoved = true;

        for (var i = 0; i < banners.length; i++) {
            if (banners[i].id && banners[i].id === id) {
                banners.splice(i, 1);
                break;
            }
        }
        this.trigger('bannerRemoved', banners);
    },
    addImage: function(newData){
        var images = this.get('bannerImages').images;

            newData.id = 'addedImage' + this.imageIdIncrementer;

            images.push(newData);

            this.imageIdIncrementer+=1;

            this.trigger('imageAdded', newData);
    }
});