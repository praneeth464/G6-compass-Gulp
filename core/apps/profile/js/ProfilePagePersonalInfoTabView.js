/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Backbone,
console,
G5,
TemplateManager,
ProfilePagePersonalInfoTabView:true
*/
ProfilePagePersonalInfoTabView = Backbone.View.extend({

    initialize: function (opts) {
        'use strict';
    },

    activate: function () {
        'use strict';

        this.render();
    },

    render: function () {
        "use strict";

        var self    = this,
            tplName = 'profilePagePersonalInfoTab',
            tplUrl  = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';
        this.$cont = this.$el;

        // if there is no html in the tab content element, go get the remote contents
        if( this.$cont.html().length === 0 ) {
            this.$el
                .append('<span class="spin" />')
                .find('.spin').spin();
            
            TemplateManager.get(tplName,
                function (tpl) {
                    self.$cont.empty().append(tpl(0));  //loads a template without any args i.e. a static view
                    self.trigger('templateloaded');
                },
                tplUrl);
        }
        // otherwise, just trigger the completion event
        else {
            this.trigger('templateloaded');
        }

        //trigger the 'reset button'
        $('#personalInfoTabResetButton').trigger('click');
    },

    events: {
        'click #personalInformationButtonSaveAnswers': 'saveAnswers',

        'click #personalInformationUploadImageLink': 'uploadPopUp',   
        'click #personalInformationFormUpdateAnswers .resetButton': 'resetValues'
    },

    uploadPopUp: function(event){
        event.preventDefault();

        var $tar = $(event.target),
            self = this;

        // show a qtip
        if(!$tar.data('qtip')){
            this.addFileUploadTip(
                $tar,
                $tar.closest('.profilePictureUploadContainer').find('#personalInformationUploadImageForm')
            );
        }

        // initialize the fileupload widget
        this.uploadPicture();
    },

    //add confirm tooltip
    addFileUploadTip: function($trig, cont){
        //attach qtip and show
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'bottom center',
                at: 'top center',
                container: this.$el,
                viewport: $(window),
                adjust: {
                    method: 'shift none',
                    effect: false
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
                classes:'ui-tooltip-shadow ui-tooltip-light PURLCommentAttachLinkTip PURLCommentAttachLinkTipPhoto',
                padding: 0,
                
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    },    

    uploadPicture: function (e) {
        'use strict';

        var that = this,
            $form = $('#personalInformationFormUploadImage'),
            loadSpinner = function() {
                var opts = {
                    lines: 13, // The number of lines to draw
                    length: 20, // The length of each line
                    width: 7, // The line thickness
                    radius: 15, // The radius of the inner circle
                    corners: 1, // Corner roundness (0..1)
                    rotate: 0, // The rotation offset
                    color: '#000', // #rgb or #rrggbb
                    speed: 1, // Rounds per second
                    trail: 60, // Afterglow percentage
                    shadow: false, // Whether to render a shadow
                    hwaccel: false, // Whether to use hardware acceleration
                    className: 'spinner', // The CSS class to assign to the spinner
                    zIndex: 2e9, // The z-index (defaults to 2000000000)
                    top: 25, // Top position relative to parent in px
                    left: 35 // Left position relative to parent in px
                };

                $(".profilePictureUploadContainer").spin(opts);
            };
        /*
            makes use of this plugin: https://github.com/blueimp/jQuery-File-Upload/wiki/Basic-plugin
        */
        $('#personalInformationFormUploadImage').fileupload({
            url: G5.props.URL_JSON_PROFILE_PAGE_PERSONAL_INFORMATION_IMAGE_UPLOAD,
            dataType: 'g5json',
            beforeSend: function(){
                loadSpinner(); //start the spinner
            },
            done: function (e, data) {
                //error validation
                if( !G5.util.formValidateHandleJsonErrors($form, data.result.data.messages[0]) ) {
                    return false;
                }

                $(".profilePictureUploadContainer").spin(false); //stop the spinner
                $("#personalInformationAvatar").attr("src", data.result.data.properties.avatarUrl);

                //set the new attribute for the shell's pic
                that.trigger('updateAvatar', data.result.data.properties.avatarUrl);
                $('#personalInformationUploadImageLink').trigger('upload');
                $('.ui-tooltip').hide();
            }
        });
        $('#personalInformationUploadImageForm').closest('.ui-tooltip').hide();                    
    },

    saveAnswers: function (e) {
        'use strict';

        var that=this,
            $form = $('#personalInformationFormUpdateAnswers'),
            $data = $('#personalInformationFormUpdateAnswers').serializeArray();  

        // if the entire form fails to validate prevent it from continuing
        if (!G5.util.formValidate($form.find('.validateme'))) {
            return false;
        }

        e.preventDefault();
            $.ajax({
                dataType: 'g5json',
                type: 'POST',
                url: G5.props.URL_JSON_PROFILE_PAGE_PERSONAL_INFORMATION_ABOUT_ME,
                action: G5.props.URL_JSON_PROFILE_PAGE_PERSONAL_INFORMATION_ABOUT_ME,
                data: $data,
                success: function (response, status) {
                $form.data('savedState', $data);
                    //check for errors
                    if( !G5.util.formValidateHandleJsonErrors($form, response.data.messages) ) {
                        return false;
                    }

                    // //load in updated values to form (for 'reset' purposes)
                    // var $inputs = $('#personalInformationFieldsetAnswers :input.answerField'),
                    //     i = 0;
                    // //for each input, give it a data attribute of what it should be resetting to if 
                    // //the 'reset button is pressed.'
                    // $inputs.each(function() {
                    //     $(this).data("ResetValue", $(this).val());
                    // });
                },
                error: function (a, b, c) {
                                            console.log(a, b, c);
                }
            });

    },

    resetValues: function(e) {
        e.preventDefault();
        // // Reset form
        // if($('#personalInformationFieldsetAnswers input:first').data('ResetValue')!=undefined) {
        //     // Have saved values, reset to last saved values
        //     $('#personalInformationFieldsetAnswers :input.answerField').each(function() {
        //         $(this).val($(this).data("ResetValue"));
        //     });
        // }
        // else {
        //     // No saved values, reset form
        //     $('#personalInformationFormUpdateAnswers').each (function(){
        //       this.reset();
        //     });            
        // }

        // Reset form

        var $form = $(e.target).closest('form'),
            savedState = $form.data('savedState');

        $form.find(':checked').removeAttr('checked');


            $form.each(function(){
                this.reset();
            });

        // if (savedState === undefined){
        //     console.log('no values exist.');
        //     $form.each(function(){
        //         this.reset();
        //     });
        // } else {
        //     console.log('values exist.');
        //     console.log(savedState);
        // }

        _.each(savedState, function(v, k) {
            var $elems = $form.find('[name="'+v.name+'"]');

            if( $elems.length == 1) {
                $elems.val(v.value);
            }
            else if( $elems.length > 1 ) {
                $elems.filter('[value="'+v.value+'"]').attr('checked', 'checked');
            }
        });

    }

});


