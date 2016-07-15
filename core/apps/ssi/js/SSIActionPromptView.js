/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
console,
SSISharedHelpersView,
SSIActionPromptView:true
*/

SSIActionPromptView = SSISharedHelpersView.extend({

    events: {
        'keydown .contestName'     : 'doContestNameChanged',
        'click   .deleteContest'   : 'doDeleteContest',
        'click   .promptClose'     : 'doPromptClose',
        'submit  form.copyContest' : 'doSubmit'
    },

    // **************************************
    //     INIT/RENDER
    // **************************************
    render: function (opts) {
        var $toFocusOn = this.$el.find('input');

        opts.target.qtip({
            content: {
                text: opts.content
            },
            hide: {
                event: 'unfocus',
                delay: 200
            },
            position: {
                my: 'right center',
                at: 'left center',
                container: opts.container
            },
            show: {
                solo: true,
                event: 'click',
                ready: true
            },
            style: {
                classes:'ui-tooltip-shadow ui-tooltip-light promptQtip',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            },
            events: {
                render: _.bind(function(event, api) {
                    this.qtip = api;
                    this.setElement(event.target);
                }, this),
                show: function(evt, qtip){
                    if ($toFocusOn.length) {
                        $toFocusOn.first().focus(0);
                    }
                }
            }
        });

        return this;
    },

    destroyPrompt: function () {
        this.qtip.hide();
        this.remove();
    },


    // **************************************
    //     UI EVENTS
    // **************************************
    doPromptClose: function (event) {
        event.preventDefault();
        this.destroyPrompt();
    },

    doSubmit: function (e) {
        var $n = this.$el.find('.contestName'),
            msgs = $n.data('validateFailMsgs');

        if(e){ e.preventDefault(); }

        // FE validate nonempty
        if($n.val().length === 0) {
            this.setStatusWrap('invalid', msgs.nonempty);
        }

        // BE (ajax) validate name check
        if(this._nameChecked) {
            if(this._nameOk) {
                // name was checked and is ok, go ahead and submit form
                this.ajaxSubmitForm();
            }
        } else { // name needs checking
            this.ajaxValidateName();
        }

        return false;
    },

    doContestNameChanged: function (event) {
        this.setStatusWrap($(event.target).siblings('.contestNameStatus'));
        this._nameChecked = false;
    },

    // trigger deleteContest event for outsiders
    doDeleteContest: function (event) {
        event.preventDefault();
        var id = $(event.target).data('id');
        this.trigger('deleteContest', this, id);
    },


    // **************************************
    //     UI UPDATES
    // **************************************
    // setStatus is in SSISharedHelpersView
    setStatusWrap: function(statStr, msg) {
        var $status   = this.$el.find('.contestNameStatus');
        this.setStatus($status, statStr, msg);
    },

    togglePromptLock: function (setAs) {
        this.$el.find('input, button, a').attr('disabled', setAs);
    },


    // **************************************
    //     AJAX
    // **************************************
    ajaxValidateName: function () {
        var $name     = this.$el.find('.contestName'),
            $status   = this.$el.find('.contestNameStatus'),
            nameVal   = $name.val();

        if(!nameVal) { return; }

        // start spinner
        $status.find('.pending').spin(true);

        this.setStatusWrap('pending');
        this.togglePromptLock(true);

        $.ajax({
            url : G5.props.URL_JSON_CONTEST_CHECK_NAME,
            type : 'post',
            data : {
                contestName: nameVal,
                locale: 'en_US' // note: static for phase 1
            },
            dataType : 'g5json'
        })
        // done
        .done( function (resp) {
            var data = resp.data.messages,
                err  = resp.getFirstError();

            if (err) {
                this._nameOk = false;
                this.setStatusWrap('invalid', data[0].text);
            } else {
                this._nameOk = true;
                this.setStatusWrap('valid');
                // assume that we always want to submit when the name checks out
                this.doSubmit();
            }
        }.bind(this))
        // always
        .always( function(datXhr, txtStatus, xhrErr) {
            this._nameChecked = true;
            this.togglePromptLock(false);
        }.bind(this));

    },

    ajaxSubmitForm: function (event) {
        var $form = this.$el.find('form.copyContest'),
            $name = $form.find('.contestName'),
            $id   = $form.find('.contestId'),
            data  = {
                $status: $form.find('.contestCopyStatus'),
                url: G5.props.URL_JSON_SSI_COPY_CONTEST,
                data: {
                    contest_id: $id.val(),
                    contestName: $name.val()
                }
            };

        this.togglePromptLock(true);

        this.requestWrap(data).then(
            function(data) {
                window.location = data.url;
            },
            _.bind(this.showErrorModal, this)
        );

    }

});
