/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
_,
PageView,
PublicRecognitionModel,
PublicRecognitionModelView,
PublicRecognitionPageDetailView:true
*/
PublicRecognitionPageDetailView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var that = this,
            //containing element for pub rec model view
            $cont = this.$el.find('.publicRecognitionItems:eq(0)'),
            recognitionId,
            requestData;

        //set the appname (getTpl() method uses this)
        this.appName = 'publicRecognition';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        G5.util.showSpin(this.$el);
        //create the model
        this.pubRecModel = new PublicRecognitionModel({});

        //create the model view, hand it the model
        this.pubRecModelView = new PublicRecognitionModelView({
            model: this.pubRecModel,
            isKeepElementOnHide: true
        });

        //attach view to dom
        $cont.append(this.pubRecModelView.el);

        //get the recognition id
        recognitionId = this.$el.data('recognitionId');

        // get the additional request data
        requestData = this.$el.data('requestData');

        //if we have a recognitionId, the load its data, else ERROR
        if(recognitionId){
            //everything is wired and ready, now load the model data
            //(view will render because its listening)
            this.pubRecModel.loadData(recognitionId, requestData);

        }else{
            console.error('[ERROR] PublicRecognitionPageDetailView - data-recognition-id attribute not set');
        }

    }

});