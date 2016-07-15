/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
ChangePasswordPageView:true
*/
ChangePasswordPageView = PageView.extend({

    initialize : function(opts) {
        console.log("[INFO] ChangePasswordPageView initialized");
        var that = this;

        //set the appname (getTpl() method uses this)
        this.appName = 'changePasswordPageView';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.checkForServerErrors();
    },

    events:{
        "click #submitBtn": "validateChanges"
    },

    validateChanges: function(event) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;
        var $validateTargets = $(".validateme");

        if(G5.util.formValidate($validateTargets)){
            $("#changePassForm").submit();
        }
    },

    checkForServerErrors: function() {
        if ($("#serverReturnedErrored").val() === "true"){
            $("#firstTimeLoginErrorBlock").slideDown('fast'); //show error block
            $('.firstTimeLoginFieldSet').show(); //show all fields
            $(".nextSectionBtn").hide(); //hide all continue buttons
            $("#submitBtn").show(); //show submit button
        }
    }
    
});