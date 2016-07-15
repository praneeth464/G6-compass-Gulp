/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
CommunicationsResourceCenterEditModel:true
*/
CommunicationsResourceCenterEditModel = Backbone.Model.extend({
    // Bug 58246 - related.
    // resourceLength is use to keep track of the index so it is unique
    resourceLength: 0,
    initialize: function(opts) {
        this.resourceIdIncrementer = 0;

    },
    loadData : function(opts) {
        var self = this,
            data = {};

            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: G5.props.URL_JSON_COMMUNICATION_RESOURCE_CENTER_DATA,
                data: data,
                cache: true,
                success: function (serverResp) {
                    //regular .ajax json object response
                    var data = serverResp.data;

                    // start the index off with elements from the backend
                    self.resourceLength = data.resourceTable.resources.length;

                    self.set(data);

                    //notify listener
                    self.trigger('loadDataFinished', data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] CommunicationsResourceCenterEditModel: ", jqXHR, textStatus, errorThrown);
                }
            });
    },
    addResource: function(newData){
        var resources = this.get('resourceTable').resources,
            isAdded = true;

        newData.id = 'addedResource' + this.resourceIdIncrementer;

        newData.index = this.resourceLength;

        resources.push(newData);

        this.resourceIdIncrementer += 1;
        this.resourceLength += 1;

        this.trigger('resourceAdded', newData, isAdded);

    },
    updateResource: function(updatedData){
        var resources = this.get('resourceTable').resources,
            self = this;

        _.each(resources, function(resource, index){
            if(resource.id === updatedData.id){

                resource = $.extend({}, resource, updatedData);
                resources[index] = resource;

                self.trigger('resourceUpdated', resource);
            }
        });
    },
    removeResource: function(id){
        var resources = this.get('resourceTable').resources;

        for (var i = 0; i < resources.length; i++)
            if (resources[i].id && resources[i].id === id) {
                resources.splice(i, 1);
                break;
            }

        this.trigger('resourceRemoved', resources);

    }
});