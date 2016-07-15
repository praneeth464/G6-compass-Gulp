/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
G5,
TemplateManager
*/

// share popover plugin

!function ($) {

    /* PLUGIN DEFINITION - this is just a wrapper around a tooltip plugin */

    $.fn.sharePopover = function ( option, shareLinks ) {

        return this.each(function () {

            var $this = $(this),
                data = $this.data('participantPopover'),
                options = typeof option == 'object' && option;

            //gross
            $this.data('participantPopover_shareLinks',shareLinks);

            //if no plugin, then attach
            if (!data){

                $this.qtip({
                    content:{
                        text:'loading...'
                    },
                    position:{
                        my: 'bottom center',
                        at: 'top center',
                        container: this.$container||$('body') 
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
                        classes:'ui-tooltip-shadow ui-tooltip-light sharePopoverQtip',
                        tip: {
                            corner: true,
                            width: 20,
                            height: 10
                        }
                    },
                    events:{
                        //on show load template
                        show: function(event,api){
                            TemplateManager.get('sharePopover', function(tpl){
                                //set the content of qtip
                                api.set('content.text',tpl({shareLinks:$this.data('participantPopover_shareLinks')}));
                                //reset the dimensions and position
                                api.reposition();
                            },G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/');
                        }
                    }
                });

                //have participantPopover point to qtip plugin
                $this.data('participantPopover',$this.data('qtip'));

                if (typeof option == 'string') data[option]();
            }//!data

        });//each
    };//fn.sharePopover

}(window.jQuery);