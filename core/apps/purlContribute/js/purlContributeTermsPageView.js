/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
PageView,
PurlContributeTermsPageView:true
*/
PurlContributeTermsPageView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts) {
        //set the appname (getTpl() method uses this)
        this.appName = "purlContribute";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.checkForServerErrors();
    },

    events: {
        "change #changeLanguage" : "changeLanguage",
        "click .btn-primary" : "submitForm"
    },

    changeLanguage: function(e) {
        var $tar = $(e.target).closest('select'),
            $form = $tar.closest('form');

        e.preventDefault();

        $form.submit();
    },

    submitForm: function() {
        var thisView = this;
        var $validate = this.$el.find(".validateme");

        if (!G5.util.formValidate($validate)){
            return false;
        }
    },

    checkForServerErrors: function() {
        if ($("#serverReturnedErrored").val() === "true"){
            $("#purlTermsErrorBlock").slideDown('fast'); //show error block
        }
    } //checkForServerErrors
});