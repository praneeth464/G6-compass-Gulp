/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager
*/

//SERVER RESPONSE OBJECT (wraps a JSON response from server, helps parse etc.)
// - parse out messages
// - process server commands (session timeout forwards, maybe modal pops and alerts???)
G5.ServerResponse = function(data){
    this.data = data;//JSON data
    this.interceptServerCommands();//see if the server wants to do something
    this.interceptDataUpdates();//see if there was a data update
};

//notice the Backbone.Events mixin below, this allows us to listen to the ServerResponse
_.extend(G5.ServerResponse, Backbone.Events);

//instances
_.extend(G5.ServerResponse.prototype ,{
    getErrors:function(){
        if(this.data.messages){
            return _.filter(this.data.messages,function(m){return m.type==='error';});
        }
        return [];
    },
    getFirstError:function(){
        var errs = this.getErrors();
        return errs.length>0?errs[0]:false;
    },
    getSuccess:function(){
        if(this.data.messages){
            return _.filter(this.data.messages,function(m){return m.type==='success';});
        }
        return [];
    },
    getFirstSuccess:function(){
        var sucs = this.getSuccess();
        return sucs.length>0?sucs[0]:false;
    },

    //do the bidding of the server
    interceptServerCommands:function(){
        var that = this;

        if(this.data.messages){

            var cmds = _.filter(this.data.messages,function(m){return m.type==='serverCommand';});
            _.each(cmds,function(cmd){
                var funcName = cmd.command+'ServerCommand';

                if(typeof that[funcName] === 'function'){
                    that[funcName](cmd);
                }else{
                    console.log('[ERROR] G5.ServerResponse - server command received, but no method defined ['+funcName+']');
                }
                
            });
        }
    },

    //trigger data update events - any backbone view/model can listen for these
    interceptDataUpdates:function(){
        var that = this;

        if(this.data.messages){

            var updates = _.filter(this.data.messages,function(m){return m.type==='dataUpdate';});
            _.each(updates,function(update){
                G5.ServerResponse.trigger('dataUpdate_'+update.name,update.data);               
            });
        }
    },

    //server command - pull up a modal
    modalServerCommand:function(cmd){
        var tplName = 'modal',
            tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/',
            $svModal = $('.serverModal');

        //if no active serverModal, get the template and show it
        if($svModal.length===0){

            TemplateManager.get(tplName,function(tpl){

                var $modal = $(tpl(cmd));
                $('body').append($modal);

                $modal.modal('show');

            },tplUrl);

        }
        //modal visible, populate
        else{
            if ($.type(cmd.name) === "string"){
                console.log('this is a string');
                $svModal.find('.modal-header h3').text(cmd.name);
            } else {
                console.log('null value, not a string');
            }
            $svModal.find('.modal-body p').html(cmd.text);
            $svModal.modal('show');
        }
    },

    //redirect the browser, handy for session timeouts
    redirectServerCommand:function(cmd){
        if(cmd.url){
            G5.util.showSpin( $('body'), {
                cover : true,
                classes : 'redirectServerCommand'
            } );
            window.location = cmd.url;
        }
    },

    //execute javascript
    javascriptServerCommand:function(cmd){
        if(cmd.javascript){
            try{
                eval(cmd.javascript);
            }catch(err){
                console.log('[ERROR] G5.ServerResponse - javascript server command generated an error: \n\n'+err+
                    '\n ------------- \n'+cmd.javascript+'\n');
            }
            
        }
    }
});

G5.serverTimeout = function(data){

    if(data.indexOf('timeout') > -1){
        window.location.reload();
    }
    return data;
}

//JQUERY ajax converter for g5json -- wrap JSON response in ServerResponse OBJECT
$.ajaxSetup({
    converters:{
        'json g5json': function(jsonData){
            return new G5.ServerResponse(jsonData);
        },
        'html g5html': function(data){
            return G5.serverTimeout(data);
        }
    },
    headers: { 'post-type': 'ajax' } // server side uses this
});