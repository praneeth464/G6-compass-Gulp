/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
_,
PageView,
SmackTalkModel,
SmackTalkModelView,
SmackTalkPageDetailView:true
*/
SmackTalkPageDetailView = PageView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var that = this,
            //containing element for pub rec model view
            $cont = this.$el.find('.smackTalkItems:eq(0)'),
            smackTalkId;

        //set the appname (getTpl() method uses this)
        this.appName = 'smackTalk';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);


        //create the model
        this.smackTalkModel = new SmackTalkModel({});

        //create the model view, hand it the model
        this.smackTalkModelView = new SmackTalkModelView({
            model: this.smackTalkModel,
            isKeepElementOnHide: true // don't hide the item when hidden
        });

        //attach view to dom
        $cont.append(this.smackTalkModelView.el);

        //get the recognition id
        smackTalkId = this.$el.data('smackTalkId');

        //if we have a smackTalkId, the load its data, else ERROR
        if(smackTalkId){
            //everything is wired and ready, now load the model data 
            //(view will render because its listening)
            this.smackTalkModel.loadData(smackTalkId);
        }else{
            console.error('[ERROR] SmackTalkPageDetailView - data-recognition-id attribute not set');
        }

    }

});