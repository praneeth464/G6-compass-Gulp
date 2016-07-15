/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
ManagerToolKitSendAlertPageView:true
*/
ManagerToolKitSendAlertPageView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts) {

        console.log('[INFO] ManagerToolKitSendAlertPageView: Manager Toolkit Page Budget View initialized', this);

        var thisView = this;

        //set the appname (getTpl() method uses this)
        this.appName = "managerToolkit";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.bindOrgUnitSelect();

        this.$el.find('.richtext').htmlarea(G5.props.richTextEditor);

    },

    events: {
        "click .submitBtn": "validateSubmit",
        "click .cancelBtn": "confirmCancel",
        "click #cancelDialogConfirm": "doCancel",
        "click #cancelDialogCancel": function(e) {
            e.preventDefault();
            $(e.currentTarget).closest('.qtip').qtip('hide');
        }
    },

    validateSubmit: function(e) {
        var $t = $(e.currentTarget),
            $fields = this.$el.find('.validateme');
        if(!G5.util.formValidate($fields)) {
        //Stop Submit Action
        e.preventDefault();
        }
        else{
        //Stop Submit Action
        e.preventDefault();
            //Disable  Submit button
            $t.attr("disabled", "disabled");
            //Submit form data
            this.$el.find('form#managerToolkitFormSendAlert').submit();
        }
    },

    bindOrgUnitSelect: function() {
        var $theSelect = $("#orgUnitSelect"),
            orgUnitRecips = $("#orgUnitRecips").val(),
            orgUnitBelowRecips = $("#orgUnitBelowRecips").val(),
            recipPostFix = $("#orgUnitRecips").data('msgPostFix'),
            adjustY = $("html").hasClass("lt-ie8") ? -3 : 0;

        $theSelect.qtip({
            content:{text: '???'},
            position:{
                my: 'left center',
                at: 'right center',
                adjust: {
                    x: 0,
                    y: adjustY
                },
                container: $('body')
            },
            show:{
                ready:false,
                event: ''
            },
            hide:{
                event: '',
                fixed:true,
                delay:200
            },
            style:{

                classes:'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    width: 22,
                    height: 10,
                    offset: -5
                }
            }
        });

        $theSelect.change(function() {
            var $this = $(this);

            if ($this.val() === "no"){
                $theSelect.qtip('option', 'content.text', "<strong>" + orgUnitRecips + " "+recipPostFix+"</strong>");
            }else{
                $theSelect.qtip('option', 'content.text', "<strong>" + orgUnitBelowRecips + " "+recipPostFix+"</strong>");
            }

            $theSelect.qtip("show");
        });

        setInterval(function(){
             $theSelect.change();
        },700);
    },

    confirmCancel: function(e) {
        var $tar = $(e.currentTarget),
            $cancelDialog = this.$el.find('.cancelConfirm');

        e.preventDefault();

        if(!$tar.data('qtip')) {
            this.attachPopover($tar, $cancelDialog, this.$el.find('form'));
        }
    },

    doCancel: function(e) {
        var $btn = this.$el.find(".cancelBtn");

        if($btn.data('url')) {
            e.preventDefault();
            window.location = $btn.data('url');
        }
    },

    attachPopover: function($trig, cont, $container, $viewport){
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'left center',
                at: 'right center',
                container: $container,
                viewport: $viewport || $(window),
                adjust: {
                    method: 'shift none'
                }
            },
            show:{
                event:'click',
                ready:true
            },
            hide:{
                event:'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light participantPopoverQtip',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    }

});