/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
TemplateManager,
ProfilePageAlertsTabAlertsView,
ProfilePageAlertsTabMessagesView,
PaginationView,
ProfilePageAlertsAndMessagesTabView:true
*/
ProfilePageAlertsAndMessagesTabView = Backbone.View.extend({
    initialize: function (opts) {
        'use strict';

        this.tplName    = opts.tplName || "profilePageAlertsAndMessagesTab";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';

    },

    events: {
        'click #profilePageAlertsTabAlerts thead a'    : 'sortAlertsOrMessages',
        'click #profilePageAlertsTabMessages thead a'  : 'sortAlertsOrMessages',

        // 'click #profilePageAlertsTabSortAlertsBySubject'    : 'sortAlerts',
        // 'click #profilePageAlertsTabSortAlertsByDatePosted' : 'sortAlerts',
        // 'click #profilePageAlertsTabSortAlertsByDueDate'    : 'sortAlerts',

        // 'click #profilePageAlertsTabSortMessagesByDate'     : 'sortMessages',
        // 'click #profilePageAlertsTabSortMessagesByTitle'    : 'sortMessages',
        'click .viewDetails'                                : 'openDetails'
        // 'click #paginationControls a': 'paginationControlsClickIntercept'
    },

    activate: function () {
        'use strict';

        this.render();
    },

    render: function () {
        'use strict';
        var that = this;

        this.$cont = this.$el;
        this.hasMessagesSortingBeenInitialized = false;
        this.hasAlertsSortingBeenInitialized = false;

        this.$wrapper = this.$el.closest('#profilePageShellActiveTabSet');
        G5.util.showSpin(this.$el);

        TemplateManager.get(this.tplName,
            function (tpl, vars, subTpls) {
                that.subTpls = subTpls;

                that.$cont.empty().append(tpl(0));  //loads a template without any args i.e. a static view
                that.$alertsDetailTable =
                    that.$alertsTable = that.$el.find('#profilePageAlertsTabAlerts');
                that.$messagesTable = that.$el.find('#profilePageAlertsTabMessages');
                that.datasLoaded = 0;

                that.profilePageAlertsTabAlertsView = new ProfilePageAlertsTabAlertsView();
                that.profilePageAlertsTabMessagesView = new ProfilePageAlertsTabMessagesView();
                that.profilePageAlertsTabAlertsView.on('rendered', that.attachResponsiveTableToAlerts, that);

                that.$alertsTable.closest('.row')
                    .after('<span class="spin" />')
                    .nextAll('.spin').spin();

                that.$alertsTable.hide();
                that.$messagesTable.hide();

                that.profilePageAlertsTabAlertsView.profilePageAlertsTabAlertsCollection.on('alertDataLoaded', function () {
                    // increment the data loaded counter
                    that.datasLoaded++;
                    // check to see if the counter is at 2 (one for each view)
                    if (that.datasLoaded == 2) {
                        G5.util.hideSpin(that.$el);
                    }

                    // if sorting has not been initialized
                    if (that.hasAlertsSortingBeenInitialized !== true) {
                        that.initializeAlertsSorting();
                    }

                    // if there are any results, show the table and continue
                    if (that.profilePageAlertsTabAlertsView.profilePageAlertsTabAlertsCollection.length) {
                        that.$alertsTable.show();
                        //fire default sort
                        var test = {};
                        test.currentTarget={};
                        test.currentTarget.id = that.$alertsTable.find('thead th').eq(that.alertsQueryString.sortedOn).find('a').attr('id');
                        // that.sortAlerts(test);
                        that.sortAlertsOrMessages(test);
                        that.attachResponsiveTableToAlerts();
                    } else {
                    // otherwise, find the error message and show it
                        that.$alertsTable.nextAll('.alert-error').show();
                    }
                });
                that.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.on('messageDataLoaded', function () {
                    // increment the data loaded counter
                    that.datasLoaded++;
                    // check to see if the counter is at 2 (one for each view)
                    if (that.datasLoaded == 2) {
                        G5.util.hideSpin(that.$el);
                    }

                    // if sorting has not been initialized
                    if (that.hasMessagesSortingBeenInitialized !== true && !this.tabularPagination) {
                        that.initializeMessagesSorting();
                        // that.sortMessagesByDate();
                    }

                    // if there are any results, show the table and continue
                    if (that.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.length) {
                        that.$messagesTable.show();
                        //that.profilePageAlertsTabMessagesView.render(that.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.toJSON(), that.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.messageCounter);
                        // that.generatePaginationControls();
                                                //fire default sort
                        var test = {};
                        test.currentTarget={};
                        test.currentTarget.id = that.$messagesTable.find('thead th').eq(that.messagesQueryString.sortedOn).find('a').attr('id');
                        // that.sortMessages(test);
                        that.sortAlertsOrMessages(test);
                        // that.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.sortOrder(that.messagesQueryString.sortBy, that.messagesQueryString.sortedBy);
                        that.profilePageAlertsTabMessagesView.render(that.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.toJSON());
                        G5.util.hideSpin(that.$messagesTable.closest('.span12'));
                        that.renderPagination();
                        that.attachResponsiveTableToMessages();
                    } else {
                    // otherwise, find the error message and show it
                        that.$messagesTable.nextAll('.alert-error').show();
                    }
                }); // on('messageDataLoaded')
            },
            this.tplUrl); // TemplateManager.get

        return this;
    }, // render

    // this is called after trigger for table render, also after the table is attached to DOM
    // it checks to make sure both conditions are met before attaching the rT plugin
    attachResponsiveTableToAlerts: function() {
        if (!this.$alertsTable) {return; }
        if (this.$alertsTable.is(':hidden')) {return; }
        if (this.$alertsTable.find('tbody tr').length === this.profilePageAlertsTabAlertsView.profilePageAlertsTabAlertsCollection.length) {
            this.$alertsTable.responsiveTable({pinLeft: [0]});
        }
    },
    // this is called after trigger for table render, also after the table is attached to DOM
    // it checks to make sure both conditions are met before attaching the rT plugin
    attachResponsiveTableToMessages: function() {
        if (!this.$messagesTable) {return; }
        if (this.$messagesTable.is(':hidden')) {return; }
        if (this.$messagesTable.find('tbody tr').length === this.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.length) {
            this.$messagesTable.responsiveTable({pinLeft: [0]});
        }
    },
    // <------------- alerts -------------> //

    initializeAlertsSorting: function () {
        "use strict";

        this.alertsQueryString = {
            sortedOn: 1, // date posted
            sortedBy: 'desc'
        };

        this.hasAlertsSortingBeenInitialized = true;
    }, // initializeSorting

    sortAlertsOrMessages: function(event) {
        "use strict";
        if (event) {
            var $th = $('#'+event.currentTarget.id).closest('th'),
                selector = $th.index(),
                sortBy = $th.find('a').data("sortby"),
                which = $th.closest('table').attr('id') == 'profilePageAlertsTabAlerts' ? 'alerts' : 'messages',
                view        = which == 'alerts' ? this.profilePageAlertsTabAlertsView : this.profilePageAlertsTabMessagesView,
                collection  = which == 'alerts' ? this.profilePageAlertsTabAlertsView.profilePageAlertsTabAlertsCollection : this.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection,
                queryString = which == 'alerts' ? this.alertsQueryString : this.messagesQueryString,
                $table      = which == 'alerts' ? this.$alertsTable : this.$messagesTable;

            //Only prevent default on actual events, not function calls.
            if(event && event.delegateTarget){
                event.preventDefault();}

            // if already sorted by current column, then invert sort order
            if (queryString.sortedOn === selector) {
                // however, we can only run this when the user is clicking on the header. sortMessages runs with a fake event when the JSON is returned from the server (on initial load, pagination, etc.), but we shouldn't switch asc/desc when the JSON is loaded back
                // we check that by looking for event.target. The fake event only has event.currentTarget. WTF? Yeah. WTF?
                if( event.target ) {
                    if (queryString.sortedBy === 'asc') {
                        queryString.sortedBy = 'desc';
                    }
                    else {
                        queryString.sortedBy = 'asc';
                    } // if
                }
                $th.removeClass('ascending descending').addClass(queryString.sortedBy == 'asc'?'ascending':'descending');
            }
            // else, set sort for this column by getting it's current sort class
            else {
                queryString.sortedOn = selector;
                queryString.sortedBy = $th.hasClass('ascending')?'asc':'desc';
            }

            // we only want to run the loadMessages when sortAlertsOrMessages was triggered by a click. Same twisted logic as above
            // also, only messages get reloaded from the server. alerts are always loaded fully on initial page load
            if( which == 'messages' ) {
                if( event.target ) {
                    G5.util.showSpin($table.closest('.span12'),{cover:true});
                    collection.loadMessages(queryString);
                }
            }
            else {
                collection.sortOrder(sortBy, queryString.sortedBy);
                view.render(collection.toJSON());
                if ($table.data('rT') && $table.data('rT').state == 'responsive') {$table.data('rT_api').makeResponsive(); } // refresh responsive table stuff
            }

            //unselect all others
            $table.find('thead th').removeClass('sorted').addClass('unsorted');
            //reselect intended
            $th.removeClass('unsorted').addClass('sorted');
            return false;
        }
    },

    /*
    sortAlerts: function(event) {
        "use strict";
        if (event) {
            var $th = $('#'+event.currentTarget.id).closest('th'),
                selector = $th.index(),
                sortBy = $th.find('a').data("sortby"),
                collection = this.profilePageAlertsTabAlertsView.profilePageAlertsTabAlertsCollection;

            //Only prevent default on actual events, not function calls.
            if(event && event.delegateTarget){
                event.preventDefault();}

            // if already sorted by current column, then invert sort order
            if (this.alertsQueryString.sortedOn === selector) {
                // however, we can only run this when the user is clicking on the header. sortMessages runs with a fake event when the JSON is returned from the server (on initial load, pagination, etc.), but we shouldn't switch asc/desc when the JSON is loaded back
                // we check that by looking for event.target. The fake event only has event.currentTarget. WTF? Yeah. WTF?
                if( event.target ) {
                    if (this.alertsQueryString.sortedBy === 'asc') {
                        this.alertsQueryString.sortedBy = 'desc';
                    }
                    else {
                        this.alertsQueryString.sortedBy = 'asc';
                    } // if
                }
                $th.removeClass('ascending descending').addClass(this.alertsQueryString.sortedBy == 'asc'?'ascending':'descending');
            }
            // else, set sort for this column by getting it's current sort class
            else {
                this.alertsQueryString.sortedOn = selector;
                this.alertsQueryString.sortedBy = $th.hasClass('ascending')?'asc':'desc';
            }

            collection.sortOrder(sortBy, this.alertsQueryString.sortedBy);
            this.profilePageAlertsTabAlertsView.render(collection.toJSON());
            if (this.$alertsTable.data('rT') && this.$alertsTable.data('rT').state == 'responsive') {this.$alertsTable.data('rT_api').makeResponsive(); } // refresh responsive table stuff

            //unselect all others
            this.$alertsTable.find('thead th').removeClass('sorted').addClass('unsorted');
            //reselect intended
            $th.removeClass('unsorted').addClass('sorted');
            return false;
        }
    },
    */

    // <------------- messages -------------> //

    initializeMessagesSorting: function () {
        "use strict";
        var that = this;

        if (!this.messagesQueryString) {
            this.messagesQueryString = {
                sortedOn: 1, // date
                sortedBy: 'desc',
                pageNumber: 1,
                resultsPerPage: G5.props.PROFILE_ALERTS_MESSAGES_PER_PAGE
            };
        }

        this.maxRows = this.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.messagesMeta
                        ? this.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.messagesMeta.maxRows
                        : 0;

        this.hasMessagesSortingBeenInitialized = true;

    }, // initializeSorting

    /*
    sortMessages: function(event) {
        "use strict";
        if (event) {
            var $th = $('#'+event.currentTarget.id).closest('th'),
                selector = $th.index(),
                sortBy = $th.find('a').data("sortby"),
                collection = this.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection;

            //Only prevent default on actual events, not function calls.
            if(event && event.delegateTarget){
                event.preventDefault();}

            // if already sorted by current column, then invert sort order
            if (this.messagesQueryString.sortedOn === selector) {
                // however, we can only run this when the user is clicking on the header. sortMessages runs with a fake event when the JSON is returned from the server (on initial load, pagination, etc.), but we shouldn't switch asc/desc when the JSON is loaded back
                // we check that by looking for event.target. The fake event only has event.currentTarget. WTF? Yeah. WTF?
                if( event.target ) {
                    if (this.messagesQueryString.sortedBy === 'asc') {
                        this.messagesQueryString.sortedBy = 'desc';
                    }
                    else {
                        this.messagesQueryString.sortedBy = 'asc';
                    } // if
                }
                $th.removeClass('ascending descending').addClass(this.messagesQueryString.sortedBy == 'asc'?'ascending':'descending');
            }
            // else, set sort for this column by getting it's current sort class
            else {
                this.messagesQueryString.sortedOn = selector;
                this.messagesQueryString.sortedBy = $th.hasClass('ascending')?'asc':'desc';
            }

            collection.sortOrder(sortBy, this.messagesQueryString.sortedBy);
            this.profilePageAlertsTabMessagesView.render(collection.toJSON());
            if (this.$messagesTable.data('rT') && this.$messagesTable.data('rT').state == 'responsive') {this.$messagesTable.data('rT_api').makeResponsive(); } // refresh responsive table stuff

            //unselect all others
            this.$messagesTable.find('thead th').removeClass('sorted').addClass('unsorted');
            //reselect intended
            $th.removeClass('unsorted').addClass('sorted');
            return false;
        }
    },
    */

    // <------------- pagination -------------> //
    renderPagination: function() {
        var thisView = this;

        // if our data is paginated, add a special pagination view
        if (this.maxRows > this.messagesQueryString.resultsPerPage) {
            // if no pagination view exists, create a new one
            if (!this.tabularPagination) {
                this.tabularPagination = new PaginationView({
                    el : this.$el.find('#paginationControls'),
                    pages : Math.ceil(this.maxRows / this.messagesQueryString.resultsPerPage),
                    current : this.messagesQueryString.pageNumber,
                    ajax : true,
                    tpl : this.subTpls.paginationTpl || false
                });

                this.tabularPagination.on('goToPage', function(page) {
                    thisView.messagesQueryString.pageNumber = page;
                    G5.util.showSpin(thisView.$messagesTable.closest('.span12'),{cover:true});
                    thisView.datasLoaded--;
                    thisView.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.loadMessages(thisView.messagesQueryString);
                });

                this.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.on('messageDataLoaded', function () {
                    thisView.tabularPagination.setProperties({
                        rendered : false,
                        pages : Math.ceil(thisView.maxRows / thisView.messagesQueryString.resultsPerPage),
                        current : thisView.messagesQueryString.pageNumber
                    });
                });
            } else {
            // otherwise, just make sure the $el is attached correctly and force it to rerender
                this.tabularPagination.setElement(this.$el.find('#paginationControls'));
                this.tabularPagination.setProperties({
                    rendered : false,
                    pages : Math.ceil(thisView.maxRows / thisView.messagesQueryString.resultsPerPage),
                    current : thisView.messagesQueryString.pageNumber
                });
            }
        }
    },
    search: function (attribute, value) {
        return this.some(function(x) {
            return x.get(attribute) === value;
        });
    },
    removeAlert: function(e, alertId) {

        var self = this,
            removeUrl = e.target.href,
            params = { responseType: 'html'};

        $.ajax({
            url:        removeUrl,
            data: params,
            type:       "post",
            dataType: "g5html",
            success:    function (data, status) {
                //remove data from collection, remove row from view.
                self.profilePageAlertsTabAlertsView.profilePageAlertsTabAlertsCollection.remove(alertId);
                self.$el.find('#profilePageAlertsTabAlerts tr td a[data-alertid='+alertId+']').parent().parent().parent().remove();
                $('#detailModal .close').trigger('click');
            },
            error:      function (data, status) {
                // debugger;
                console.log("[INFO] Could not dismiss Alert.");
            }
        });

    },
    openDetails: function(e) {
        console.log("inside openDetails: ", e);
        var $tar = $(e.target),
            that = this,
            alertId = $tar.data("alertid"),
            messageId = $tar.data("messageid");
        if (alertId) {alertId = alertId.toString(); }
        if (messageId) {messageId = messageId.toString(); }
        // obj level ref to last clicked level idthat._lastLevId
        this._lastLevId = $tar.closest('td').find('select').val();

        e.preventDefault();

        // modal stuff
        if (!this.$detailModal) {
            this.$detailModal = this.$wrapper.find('#detailModal').detach();
            $('body').append(this.$detailModal); // move it to body

            // create modal
            this.$detailModal.modal({
                backdrop:true,
                keyboard:true,
                show:false
            });
        }
        if (!this.$detailModal) { return; } // exit if no dom element
        that.$detailModal.find('.modal-header .typeText').hide();

        TemplateManager.get('profilePageAlertsAndMessagesTab.detailViewBodyTpl' , function(tpl) {
            var collection, $iframe;

            //console.log(that.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection);
            if (alertId !== undefined) {
                //console.log('presearch - alertId:',alertId);
                collection = that.profilePageAlertsTabAlertsView.profilePageAlertsTabAlertsCollection.get(alertId).toJSON();
                that.$detailModal.find('.modal-header .typeAlert').show();
                that.$detailModal.find('.modal-header .titleText').text(collection.alertSubject);
                that.$detailModal.modal('show');
            }
            else if (messageId !== undefined) {
                collection = that.profilePageAlertsTabMessagesView.profilePageAlertsTabMessagesCollection.get(messageId).toJSON();
                that.$detailModal.find('.modal-header .typeMessage').show();
                that.$detailModal.find('.modal-header .titleText').text(collection.messageTitle);
            }
            that.$detailModal.find('.modal-body').empty().append(tpl(collection));

            that.$detailModal.find('.dismiss').click(function(e) {
                e.preventDefault();
                that.removeAlert(e, alertId);
            });

            // more work for messages only
            if (messageId !== undefined) {
                G5.util.showSpin(that.$el, {
                    cover : true
                });

                // manipulation of the email iframe
                $iframe = that.$detailModal.find('iframe');
                
                $iframe.on('load', function() {
                    that.$detailModal.modal('show');
                    G5.util.hideSpin(that.$el);
                });
                
                that.$detailModal.one('shown', function() {
                    $('body').css('overflow', 'hidden');
                     //using hard coded number so modal fits inside window. Would be nice to try and make this a bit smarter. 
                    $iframe.height($(window).height() - 150);

                    $iframe.contents().find('a').attr('target', '_top');
                });

                that.$detailModal.one('hidden', function(){
                    $('body').css('overflow', '');
                });

                $( window ).resize(function() {
                    $iframe.height($(window).height() - 150);
                });
            }
        });
    }
});
