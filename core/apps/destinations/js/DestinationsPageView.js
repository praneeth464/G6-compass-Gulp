/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
Backbone,
TemplateManager,
PageView,
DestinationsPageView:true
*/
DestinationsPageView = PageView.extend({
    
    //override super-class initialize function
    initialize: function(opts) {

        console.log('[INFO] DestinationsPageView: Destinations Page View initialized', this);

        var self = this;

        this.sortBy = { 
                    "country": null,
                    "locale": null,
                    "destination": null
                };

        this.collection = new Backbone.Collection();
        console.log('this.collection', this.collection);

        //set the appname (getTpl() method uses this)
        this.appName = "destinations";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //load initial destinations
        this.loadDestinations();

        this.on('destinationsLoaded', function(){
            self.render();
        });

    },


    loadDestinations: function(props){
        var self = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_DESTINATION_PAGE,  
            data: props||{},
            success: function(servResp){
                self.collection = servResp.data.featuredDestinations[0];
                self.trigger('destinationsLoaded');
            }
        });
    },

    render: function(){

        var self = this,
            tplName = 'destinationsPageList',
            tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'destinations/tpl/';
        this.$cont = this.$el.find('#destinationList');

        /*
        populate the select drop downs - only country is available by default.
        */
        var listOfCountries = _.pluck(this.collection.destination, 'destinationCountry').sort();

        listOfCountries = _.uniq(listOfCountries);

        $.each(listOfCountries, function(index, selectValue) {
            self.$el.find("[data-filter-type='country']").append($("<option/>", {
                value: selectValue,
                text: selectValue
            }));
        });

        /*
        the actual render part
        */
        this.$cont.empty();

        TemplateManager.get(
            tplName,
            function (tpl) {
                self.$cont.append(tpl(self.collection));
                self.trigger('templateRendered');
            },
            tplUrl);



    //http://stackoverflow.com/questions/11641292/preloading-dynamically-loaded-images-with-jquery
    /*
    Do something along these lines to pre-cache all the location images.. then just render them as the filters are applied.
    */



    },

    events: {
        'change select': 'updateFilters'
    },

    updateFilters: function(event){
        event.preventDefault();

        var self = this,
            selectedField = $(event.target),
            selectedFieldValue = selectedField.data('filter-type');

        selectedField.next().removeAttr('disabled');

        $.each(selectedField.nextAll(), function(){
            //blow out all the options in the following selects' fields except the first
            var initialValue = $(this).find('option').first();
            $(this).empty().append(initialValue);
        });

        var thisFieldCriteria = selectedField.data('filter-type'),
            nextFieldCriteria = selectedField.next().data('filter-type'),
            listToSort,
            collectionValueToSort;

        // set these values on the view
        switch (thisFieldCriteria){
            case 'country':
                this.sortBy.country = selectedField.val();
                break;
            case 'locale':
                this.sortBy.locale = selectedField.val();
                break;
            case 'destination':
                this.sortBy.destination = selectedField.val();
                break;
        }

        /*
            populate the select options
        */
        if (selectedField.val() === "default"){
            listToSort = self.collection.destination;
            selectedField.nextAll().attr('disabled', true);
        } else {
            switch (thisFieldCriteria){
                case 'country':
                    listToSort = _.where(self.collection.destination, {"destinationCountry": selectedField.val()});
                    break;
                case 'locale':
                    listToSort = _.where(self.collection.destination, {"destinationLocale": selectedField.val()});
                    break;
                case 'destination':
                    listToSort = _.where(self.collection.destination, {"destinationName": selectedField.val()});
                    break;
            }

        }
            switch (nextFieldCriteria){
                case 'country':
                    collectionValueToSort = "destinationCountry";
                    break;
                case 'locale':
                    collectionValueToSort = "destinationLocale";
                    break;
                case 'destination':
                    collectionValueToSort = "destinationName";
                    break;
            }

        listToSort = _.pluck(listToSort, collectionValueToSort);

        listToSort = _.uniq(listToSort).sort();

        $.each(listToSort, function(index, selectValue){
            selectedField.next().append($("<option/>", {
                value: selectValue,
                text: selectValue
            }));
        });

        /*
            get rid of all that don't match current criteria
        */
        $.each($('#destinationList').children(), function(){

            var keepThis = false,
                currentDestination = $(this).data('destination')[0];

            if (thisFieldCriteria == 'country'){
                    if (currentDestination.country === selectedField.val() || self.sortBy.country === "default") {
                        keepThis = true;
                    }
            } else if (thisFieldCriteria == 'locale'){
                    if (self.sortBy.country === currentDestination.country && (currentDestination.locale === selectedField.val() || self.sortBy.locale === "default")){
                        keepThis = true;
                    } 
            } else if (thisFieldCriteria == 'destination'){
                    if (self.sortBy.country === currentDestination.country && self.sortBy.locale === currentDestination.locale && (currentDestination.name === selectedField.val() || self.sortBy.destination === "default")){
                        keepThis = true;
                    }                    
            }

            if (keepThis === false){
                $(this).hide();
            } else {
                $(this).show();
            }

        });

        //check if button enabled
        if ($('#destinationList').children(":visible").length == 1){
            console.log('only one visible.');
            $('#planATrip').removeAttr('disabled').addClass('btn-primary');
        } else {
            $('#planATrip').attr('disabled', true).removeClass('btn-primary');
        }

    }

});