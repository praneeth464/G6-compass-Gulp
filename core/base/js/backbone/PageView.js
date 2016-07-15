/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
GlobalHeaderView,
PageNavView,
GlobalFooterView,
PageView:true
*/

//PAGE VIEW SUPER CLASS
// anything needed for all PageViews, goes here

PageView = Backbone.View.extend({

    className:"page",

    //init function
    initialize:function(opts){
        'use strict';
        var that = this;
        //logic for all pages

        this.appName = opts.appName || this.appName;

        //add a style class that identifies this by app and module name
        this.$el.addClass(this.className+' '+this.appName);

        // add the ID of the el for later reference
        this.elid = this.$el.attr('id') || 'contents';

        this.prepareGlobalAttributes();

        this.showAutoModal();

        // Initialize Modal resize on window resize
        $(window).on('resize', _.throttle(that.resizeModal, 250));

        // Listen for modals to be opened and resize
        $('body').on('modal-shown modal-hidden', function() {
            // pausing for a fraction of a second to make sure the modal is fully open and positioned before trying to resize
            setTimeout(function() {
                that.resizeModal();
            },1);
        });

        // show layout boxes for styling help
        if( G5.props.SHOWLAYOUTBOXES ) {
            $('body').addClass('showLayoutBoxes');
        }

        G5.views.page = this; // create a reference to this page

        // remove the pageloadingspinner
        // (check to make sure we're not inside a modal)
        if( !this.$el.closest('.modal-body').length ) {
            $('#pageLoadingSpinner').show().fadeOut(G5.props.ANIMATION_DURATION);
        }
    },

    events: {
        // generic print button/link listener
        "click .pageView_print": "doPrint",
        // generic help tooltip
        "click .pageView_help": "doHelpTip"
    },

    doPrint: function(e) {
        e.preventDefault();
        window.print();
    },
    doHelpTip: function(e) {
        var $target = $(e.target),
            popContent = $target.data("helpContent");

        e.preventDefault();

        // TODO - add ability to set qtip options from target data attrs

        $target.qtip({
                content: {
                   text: popContent
                },
                position : {
                    my: 'left center',
                    at: 'right center',
                    viewport: $(window),
                    adjust: {
                        method: 'shift none'
                    }
                },
                show : {
                    ready : true,
                    delay: false
                },
                hide : {
                    event: 'unfocus',
                    fixed : true
                },
                //only show the qtip once
                events:{
                    show : function(evt,api) {
                        $target.css('position','relative');
                    },
                    hide : function(evt,api) {
                        $target.qtip('destroy');
                        $target.css('position','');
                    },
                    render : function(evt,api) {
                    }
                },
                style:{classes:'ui-tooltip-shadow ui-tooltip-light'}
            });

        $target.qtip("show");
    },


    resizeModal: function() {
        if( $('body').hasClass('modal-open') ) {
            var windowHeight = $(window).height(),
                $modal = $('.modal'),
                newTop,
                newBodyHeight;

            //If normal modal, then run the following code.
            if($modal.length){
                var $modalBody = $modal.find('.modal-body'),
                    modalHeight = $modal.outerHeight(true),
                    modalPosition = $modal.position(),
                    windowScrolltop = $(window).scrollTop(),
                    modalWindowPosition = modalPosition.top - windowScrolltop,
                    modalBodyHeight = $modalBody.height();

                // IF the window height is less than the modal height + 2x the gap between the top of the window and the top of the modal
                // OR if the modal body is currently height adjusted
                if( windowHeight <= modalHeight + 2 * modalWindowPosition || $modalBody.data('resized') === true ) {
                    // IF the window height is less than the modal height
                    // OR the modal body height is less than the modal body wrapper height
                    if( windowHeight < modalHeight || $modalBody.height() < $modalBody.find('.modal-body-wrapper').height() ) {
                        // we adjust the height of the modal body
                        if( !$modalBody.find('.modal-body-wrapper').length ) {
                            $modalBody.wrapInner('<div class="modal-body-wrapper" />');
                        }
                        $modalBody
                            .css('height', windowHeight - (modalHeight - modalBodyHeight))
                            .data('resized', true);
                        $modal.css('top', 0);
                    }
                    // otherwise, we assume the modal height is fine as is and adjust the position of the modal in the window
                    else {
                        // calculate the new top measurement
                        newTop = (windowHeight - modalHeight) / 2;
                        // reset the modal body height adjustments and unwrap the contents
                        $modalBody
                            .css('height', '')
                            .data('resized', false)
                            .find('.modal-body-wrapper').children().unwrap();
                        $modal.css('top', newTop);
                    }
                }
                // otherwise, reset the top of the modal to default
                else {
                    $modal.css('top', '');
                }
            }
        }
    },

    prepareGlobalAttributes: function() {
        // GLOBAL HEADER
        // only do this once -- if there are two page view active
        if(!G5.views.globalHeader) {
            this.globalHeader = new GlobalHeaderView({
                page : this,
                globalHeader : this.options.globalHeader||null,
                loggedIn : this.options.loggedIn===false?false:true
            });
            G5.views.globalHeader = this.globalHeader;
        } else {
            this.globalHeader = G5.views.globalHeader;
        }

        // PAGE NAVIGATION - same treatment as global header
        if(!G5.views.pageNav) {
            this.pageNav = new PageNavView({
                page : this,
                pageNav : this.options.pageNav||null
            });
            G5.views.pageNav = this.pageNav;
        } else {
            this.pageNav = G5.views.pageNav;
        }

        // GLOBAL FOOTER - same treatment as global header
        if(!G5.views.globalFooter) {
            this.globalFooter = new GlobalFooterView({
                page : this,
                loggedIn : this.options.loggedIn===false?false:true,
                // display links as stacked modals?
                isSheets: this.options.isFooterSheets===false?false:true,
                // if loaded already, get from header prof, else listen for data load
                profileModel: this.getParticipantProfile()
            });
            G5.views.globalFooter = this.globalFooter;
        } else {
            this.globalFooter = G5.views.globalFooter;
        }
    },

    getPageTitle: function() {
        return this.pageNav.getPageTitle();
    },
    setPageTitle: function(title) {
        this.pageNav.setPageTitle(title);
    },

    // use appName to get a template from this apps template dir
    getTpl:function(tplName, callback){
        'use strict';
        var tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_APPS_ROOT+this.appName+'/tpl/';

        // grab template and do the bidding of callback
        TemplateManager.get(tplName,function(tpl){
            callback(tpl);
        },tplUrl);
    },

    getParticipantProfile: function(name) {
        var m;
        // 'use strict';
        if( this.globalHeader&&
            this.globalHeader.partProf&&
            this.globalHeader.partProf.model){

            m = this.globalHeader.partProf.model;
            return name?m.get(name):m;

        } else {
            return null; // not there yet
        }
    },

    // if there is an .autoModal in html (bootstrap style modal), then show it
    showAutoModal: function() {
        var $am = $('body').find('.autoModal');

        if (this.$el.closest(".modal-stack").length > 0) {
            return false;
        }

        // log an error if more than one autoModal EL exists
        // * if the case for two or more arises, we'll have to build in the functionality to show
        //     consecutive modals gracefully
        if($am.length>1) {
            console.error('[ERROR] PageView: more than two autoModals found on this page, will show first found');
            // only do first one
            $am = $($am.get(0));
        }

        // attach and show the modal
        // * closing of the modal is handled via 'data-dismiss="modal"' bootstrap data-api method
        // * more sophisticated cases will have to be evaluated on a case-by-case basis to see what
        //     additional features will be necessary
        // * as this is a generic piece, all logic should be generic -- any super-specific logic
        //     should be contained in a view
        $am.modal({
            backdrop: true,
            keyboard: true,
            show: true
        });

    }

});
