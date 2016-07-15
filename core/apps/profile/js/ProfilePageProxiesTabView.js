/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
TemplateManager,
ParticipantCollectionView,
ParticipantSearchView,
ProfilePageProxiesTabView:true
*/
ProfilePageProxiesTabView = Backbone.View.extend({
    initialize: function (opts) {
        'use strict';

        this.tplName    = opts.tplName || "profilePageProxiesTab";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';

        this.loadUrl = G5.props.URL_JSON_PROFILE_PAGE_PROXIES;

        this.on('templateLoaded', this.fetchExistingProxies, this);
        this.on('proxiesLoaded', this.initializeWidgets, this);
    },

    activate: function () {
        'use strict';

        this.render();
    },

    events : {
        "click .editProxyControl" : "editProxy",
        "click .remParticipantControl" : "removeProxy",

        // edit form handlers
        "click #profilePageProxiesTabEdit .participant-popover" : "attachParticipantPopover",
        "click #profilePageProxyTabButtonSaveProxy" : "formHandler",
        "click #profilePageProxiesTabEdit .form-actions button" : "formActions",
        "click #profilePageProxiesTabEdit #profilePageProxyTabButtonCancel" : "editFormHide",
        "change #profilePageProxiesTabEdit input[type=radio]" : "radioCheckboxUpdate",
        "click #profilePageProxiesTabEdit input[type=checkbox]" : "radioCheckboxUpdate"
    },

    render: function () {
        'use strict';
        var that = this;

        // if there is no html in the tab content element, go get the remote contents
        if( this.$el.html().length === 0 ) {

            this.$el
                .append('<span class="spin" />')
                .find('.spin').spin();

            TemplateManager.get(this.tplName,
                function (tpl, vars, subTpls) {
                    that.$el.empty().append(tpl);
                    that.proxyItemTpl = subTpls.profilePageProxiesTabListRow;
                    that.trigger('templateLoaded');
                },
            this.tplUrl, true); // "true" tells TemplateManager not to compile the resulting template, but to treat it as raw HTML instead (similar to an Ajax request/response)
        }

        return this;
    },

    fetchExistingProxies: function() {
        var that = this;
        $.ajax({
            dataType: 'g5json',
            type: "POST",
            url: this.loadUrl,
            success: function (response, status) {
                that.trigger('proxiesLoaded',response.data.proxies);
            }
        });
    },

    initializeWidgets: function(proxiesJson) {
        var thisView = this,
            // this is the name of  the sub-template loaded in this.render()
            tplName = 'profilePageProxiesTab.profilePageProxiesTabListRow',
            tplUrl = '';

        // preload the proxies row template
        TemplateManager.get(tplName, function(tpl) { return; }, tplUrl);

        // set up the participant search widget
        this.participantsView = new ParticipantCollectionView({
            el : this.$el.find('#participantsView'),
            tplName : tplName, //override the default template
            tplUrl : tplUrl, // override the default template location (for dev)
            model : new Backbone.Collection(proxiesJson)
        });

        // page level reference to participant search view
        this.participantSearchView = new ParticipantSearchView({
            el : this.$el.find('#participantSearchView'),
            participantCollectionView : this.participantsView
        });

        // page level reference to participant search model
        this.participantSearchModel = this.participantSearchView.model;

        // listen for a participant add to the collection
        this.participantsView.model.on('add', function(m, o) {
            thisView.$el.find('[data-participant-cid='+m.cid+']')
                .data('model', m)
                .find('.editProxyControl').click();
        }, this);

        // listen for a remove event
        this.participantsView.model.on('remove', function(m,o) {
            this.editFormHide();
        }, this);

    },

    editFormHide : function(e) {
        if(e) { e.preventDefault(); }

        var thisView = this;

        $('#profilePageProxiesTabEdit').slideUp(G5.props.ANIMATION_DURATION, function() {
            $('#profilePageProxiesTabEdit').empty();
            thisView.$el.find('.participant-item').removeClass('info');
        });
    },

    editFormShow : function(content) {
        var thisView = this;
        $('#profilePageProxiesTabEdit')
            .html(content)
            .slideDown(G5.props.ANIMATION_DURATION, function() {
                $.scrollTo( $('#profilePageProxiesTabEdit'), G5.props.ANIMATION_DURATION );
                thisView.radioCheckboxUpdate();
            });
    },

    editProxy : function(e) {
        e.preventDefault();

        var thisView = this,
            model = $(e.currentTarget).parents('.participant-item').data('model') || this.participantsView.model.getByCid( $(e.currentTarget).parents('.participant-item').attr('data-participant-cid') ),
            url = $(e.currentTarget).attr('href'),
            data = model.toJSON(),
            params = { responseType: 'html' };

        $(e.currentTarget).parents('.participant-item').addClass('info');

        params = $.extend({}, params, data);
        $.ajax({
            url : (G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT+'profile/tpl/') + url,
            type : "GET",
            data : params,
            dataType : "g5html",
            success : function(data) {
                console.log('EDIT PROXY ajax success.');
                //console.log(data);
                //console.log(model);
                thisView.editFormShow(data);
            }
        });
    },

    formActions: function(e) {
        var $form = $(e.target).closest('form');

        $form.data( 'trigger', $(e.target) );
    },

    formHandler : function(e) {
        e.preventDefault();

        var thisView = this,
            $form = $(e.target).closest('form');
       // console.log('$form: ', $form);
       //      var $trigger = $form.data('trigger');
       // console.log('$trigger: ', $trigger);
            var method = $form.attr('method');
       // console.log('method: ', method);
            var action = $form.attr('action') || $form.data('default-action');
       // console.log('action: ', action);
            var data = $form.serializeArray();
       // console.log('data: ', data);
            var request;

        // data.push({ name : 'trigger', value : $trigger.val() });

        $.ajax({
            dataType: 'g5json',
            type: method,
            url: action,
            data: data,
            success: function (response, status) {

            // $form.data('savedState', $data);
                //check for errors
                if( !G5.util.formValidateHandleJsonErrors($form, response.data.messages) ) {
                    return false;
                }
                // otherwise, mark the form as ready to submit and resubmit
                else {
                    _.each(response.data.proxies, function(proxy) {
                        if( thisView.participantsView.model.get(proxy.id) ) {
                            thisView.participantsView.model.get(proxy.id).set(proxy);
                        }
                    });
                    thisView.participantsView.model.reset(thisView.participantsView.model.models);

                    thisView.editFormHide();
                }
            },
            error: function (a, b, c) {
                console.log(a, b, c);
            }
        });

        // request = $.ajax({
        //     url : action,
        //     type : method,
        //     data : data,
        //     dataType : 'g5json'
        // });

        // request.done(function(data, textStatus, jqXHR) {
        //     // if the form fails validation on the server, prevent it from doing anything else
        //     if( !G5.util.formValidateHandleJsonErrors($form, data.data.messages) ) {
        //         return false;
        //     }
        //     // otherwise, mark the form as ready to submit and resubmit
        //     else {
        //         _.each(data.data.proxies, function(proxy) {
        //             thisView.participantsView.model.get(proxy.id).set(proxy);
        //         });
        //         thisView.participantsView.model.reset(thisView.participantsView.model.models);

        //         thisView.editFormHide();
        //     }
        // });

        // request.fail(function(jqXHR, textStatus, errorThrown) {
        //     console.log('[ERROR] ProfilePageProxiesTabView: form submission .ajax failed', jqXHR, textStatus, errorThrown);
        // });
    },

    radioCheckboxUpdate : function() {
        var thisView = this;

        this.$el.find('#profilePageProxiesTabEdit input[data-conditional="onchecked"]').each(function(i) {
            if( $(this).attr('checked') ) {
                thisView.$el.find($(this).data('conditionalTarget')).slideDown(G5.props.ANIMATION_DURATION);
            }
            else {
                thisView.$el.find($(this).data('conditionalTarget')).slideUp(G5.props.ANIMATION_DURATION);
            }
        });

        this.$el.find('#profilePageProxiesTabEdit input[data-conditional="onunchecked"]').each(function(i) {
            if( $(this).attr('checked') ) {
                thisView.$el.find($(this).data('conditionalTarget')).slideUp(G5.props.ANIMATION_DURATION);
            }
            else {
                thisView.$el.find($(this).data('conditionalTarget')).slideDown(G5.props.ANIMATION_DURATION);
            }
        });
    },

    removeProxy : function(e) {
        // e.preventDefault();
        if( $(e.target).closest('.participant-item').hasClass('info') ) {
            this.editFormHide();
        }

    },

    attachParticipantPopover: function(e) {
        e.preventDefault();
        var $tar = $(e.target);

        //attach participant popovers
        if (!$tar.data('participantPopover')) {
            $tar.participantPopover().qtip('show');
        }
    }
});
