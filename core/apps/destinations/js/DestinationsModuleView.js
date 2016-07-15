/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
ModuleView,
DestinationsModuleView:true
*/
DestinationsModuleView = ModuleView.extend({
    
    //override super-class initialize function
    initialize: function(opts) {

        var that = this;

        console.log('[INFO] DestinationsModuleView: Destinations Module View initialized', this);

        //set the appname (getTpl() method uses this)
        this.appName = "destinations";

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //when the module template is loaded, store the subTpl for later
        this.on('templateLoaded',function(tpl, vars, subTpls){
            this.destinationTpl = subTpls.destinationTpl;
            //load initial destinations
            this.loadDestinations();
        },this);

        this.on('destinationsLoaded', function(){
            that.renderDestinations();
        });

        this.on('destinationsRendered', function(){
            that.startSlideShow();
        });
    },

    loadDestinations: function(props){
        var that = this;

        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: G5.props.URL_JSON_DESTINATION_MODULE,
            data: props||{},
            success: function(servResp){
                that.collection = servResp.data.featuredDestinations[0];
                that.trigger('destinationsLoaded');
            }
        });
    },

    renderDestinations: function(){
        this.$cont = this.$el.find('.cycle');

        this.$cont.html( this.destinationTpl(this.collection) );

        this.trigger('destinationsRendered');
    },

    startSlideShow: function(){
        this.startCycle({
            fit: true, 
            containerResize: false
        }, "dots"); //start the carousel
    }

});