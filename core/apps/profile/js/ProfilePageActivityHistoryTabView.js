/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
Backbone,
G5,
TemplateManager,
ProfilePageActivityHistoryTabView:true
*/
ProfilePageActivityHistoryTabView = Backbone.View.extend({
    initialize: function (opts) {
        'use strict';

        this.tplName    = opts.tplName || "profilePageActivityHistoryTab";
        this.tplUrl     = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'profile/tpl/';

        this.on('templateloaded', function() {
            this.animateTabs();
        }, this);
    },

    activate: function () {
        'use strict';

        if(this._params) {
            this._params = $.query.load('?'+this._params).keys;
        }
        this.render();
    },

    events: {
        "submit form":                  "formHandler",
        "click .actionsSection button": "formActions",  // intercept any clicks on form buttons
        'change .date' :                "validateDates",
        "click #profilePageActivityHistoryTabSelectedTabs a": "switchTabs",
        "click .paginationControls a":  "updatePagination",
        "click .exportPdfDetailView" :  "exportPdfDetailView"

        // "click .profile-popover":       "attachParticipantPopover",
        // "submit form":                  "formHandler",
        // "click .form-actions button":   "formActions",  // intercept any clicks on form buttons
        // "click .select-all a#all":      "selectAll",
        // "click .select-all a#none":     "selectNone"

        // TEMPORARY for debugging/testing - validation only done with Save button formActions
        // "blur .validateme input, .validateme select, .validateme textarea" : function (e) {
        //     'use strict';
        //     G5.util.formValidate($(e.target));
        // }
    },

    switchTabs: function(e){
        // most of the tabs logic is in the plugin attached after render
        this.animateTabs();
    },

    animateTabs: function(){
        //figure out progress bars.
        $('.profilePageActivityHistoryResultsGraph').each(function(){
            var max = 0,
                calculatedMax = 0;

            $(this).find('.bar').each(function(){
                if ($(this).data('complete') > max) {
                    max = $(this).data('complete');
                }
            });

            //we've found the highest data value, now we set the rest of the values
            calculatedMax = max / $('#profilePageActivityHistoryResponseData').data('percentComplete');
            $(this).find('.bar').each(function(){

                var barWidth = Math.floor($(this).data('complete') /(calculatedMax)*100);
                // $(this).css('width', barWidth+'%');
                $(this).css('width', 0).animate({"width":barWidth+'%'}, 500);
            });
        });
    },

    validateDates: function(event){
        'use strict';

        // if there are no promotions, there will be no datepickers and we can bail
        if( this.$el.find('.datepickerTrigger').length <= 0 ) {
            return false;
        }

        var $startDate = this.$el.find('#profilePageActivityHistoryTabStartDate'),
            $endDate = this.$el.find('#profilePageActivityHistoryTabEndDate'),
            $target = $(event.currentTarget),
            startDate = $startDate.closest('.datepickerTrigger').data('datepicker').date,
            endDate = $endDate.closest('.datepickerTrigger').data('datepicker').date;

        // TODO: verify that this is the 'validation' behavior desired (or else let's just dump this method)
        switch($target.attr('id')) {
            case $startDate.attr('id'):
            case undefined:

                // once start date has been set, other dates cannot occur before it
                $endDate.closest('.datepickerTrigger').datepicker('setStartDate',$startDate.val()).datepicker('setEndDate', '+0d');;

                // if the new startDate is later than the current endDate AND a value already exists in endDate, clear the value & indicate change
                if (startDate.valueOf() > endDate.valueOf() && $endDate.val() !== '') {
                    G5.util.animBg($endDate,'background-flash');
                    $endDate.val('').closest('.datepickerTrigger').datepicker('update');
                }
                break;
            case $endDate.attr('id'):
                G5.util.formValidate($endDate.closest('form').find('.validateme'));

                break;
        } // switch

    }, // validateDates

    formActions: function (evnt) {
        'use strict';

        var $buttonClicked = $(evnt.target);

        $buttonClicked.
            closest('form').
            data('triggeredByName', $buttonClicked.attr('name')).
            data('triggeredByValue', $buttonClicked.attr('value'));

        if ($buttonClicked.attr('id') !== "profilePageActivityHistoryTabButtonShowActivity") {
            console.log("[INFO] ProfilePageACTIVITY_HISTORY_TabView ...formActions UNKNOWN");
            this.render();
            return false; // no action to process
        } else {
            console.log("[INFO] ProfilePageACTIVITY_HISTORY_TabView ...formActions Show Activity");
            return true;  // continue
        }
    },

    formHandler: function (evnt) {
        'use strict';

        evnt.preventDefault();

        var $form       = $(evnt.target),
            actionURL   = $form.attr('action'),
            dataToSend  = $form.serialize() + "&" +
                            $form.data('triggeredByName') + "=" +
                            $form.data('triggeredByValue') + "&" + "responseType = html",
            dataToSendA = $form.serializeArray(),
            i           = 0,
            method      = $form.attr('method'),
            that        = this,
            $container  = this.$el.find("#profilePageActivityHistoryPageData");

        // if the entire form fails to validate prevent it from continuing
        if (!G5.util.formValidate($form.find('.validateme'))) {
            return false;
        }

        this.$el
            .append('<span class="spincover"><span class="spin" /></span>')
            .find('.spin').spin();


        $.ajax({
            url:        actionURL,
            type:       method,
            data:       dataToSend,
            dataType: "g5html",
            success:    function (data, status) {
                var $newContents = $(data);
                $("thead a", $newContents).click(function (evnt) {
                    evnt.preventDefault();
                    that.headerSortClick(evnt.target.href, evnt.target);
                    //that.headerSortClick(actionURL);
                    // debugger;
                });
                $("a.content-link", $newContents).closest("tr").click(function (evnt) {
                    // debugger;
                    that.lineItemClick($(evnt.target).closest("tr").find("a").attr("href"));
                });

                $container.html($newContents);
                that.$el.find('.spin, .spincover').remove();



                //figure out progress bars.
                $('.profilePageActivityHistoryResultsGraph').each(function(){
                    var max = 0,
                        calculatedMax = 0;

                    $(this).find('.bar').each(function(){
                        if ($(this).data('complete') > max) {
                            max = $(this).data('complete');
                        }
                    });

                    //we've found the highest data value, now we set the rest of the values
                    calculatedMax = max / $('#profilePageActivityHistoryResponseData').data('percentComplete');
                    $(this).find('.bar').each(function(){

                        var barWidth = Math.floor($(this).data('complete') /(calculatedMax)*100);

                        $(this).css('width', barWidth+'%');
                    });
                });

                console.log("[INFO] ProfilePageACTIVITY_HISTORY_TabView save success");
                console.log("[INFO] ProfilePageACTIVITY_HISTORY_TabView " + dataToSend);
                for (i = 0; i < dataToSendA.length; i++) {
                    console.log("[INFO] [" + dataToSendA[i].name + "] = [" + dataToSendA[i].value + "]");
                }

                that.modifyExportLinks($newContents);

                // attach responsive table plugin
                $container.find('table.table').responsiveTable({
                    pinLeft : [0]
                });

                // update responsive table on tab shown event (bootstrap tab plugin)
                $('a[data-toggle="tab"]').on('shown', function(e){
                    $container.find('table.table').responsiveTable();
                });
            },
            error:      function (data, status) {
                // debugger;
                console.log("[INFO] ProfilePageACTIVITY_HISTORY_TabView save error");


            }
        });

        //ARNxyzzy// console.log("[INFO] ARNlogging ProfilePageACTIVITY_HISTORY_TabView ...formHandler");
    },

    // this fills in for pagination taglib (JAVA BE tech) defficiency (has no flexibility on DOM placement)
    modifyExportLinks: function($data) {
        var $expLinks = $data.find('span.export a'),
            $destLinks = $data.find('.export-tools');

        $expLinks.each(function(){
            var $exp = $(this),
                sel = $exp.text().toLowerCase();

            var selectedMode = $exp.parent().find('.selectedMode').attr('value');
            var capitalizedSelectedMode = selectedMode.charAt(0).toUpperCase()+selectedMode.slice(1);
            var exportLink = $exp.attr('href') + "&mode=" + selectedMode;

            sel = sel.charAt(0).toUpperCase()+sel.slice(1); // capitalize
            sel = '.export'+sel+'Button'+capitalizedSelectedMode; // destination

            $data.find(sel).attr('href',exportLink).show();
        });

        $destLinks[$expLinks.length?'show':'hide']();
        $expLinks.closest('.export').hide();
    },

    exportPdfDetailView: function(e) {
        e.preventDefault();

        var $tar = $(e.target).closest('a'),
            pageNumber = this.$el.find('.pagination .active').first().text() || 1;

        window.location.assign( $tar.attr('href')+'&pageNo='+pageNumber );
    },

    updatePagination: function(event){
        event.preventDefault();

        var $form       = $('#profilePageActivityHistoryForm'),
            actionUrl   = event.target.href,

			$target     = $(event.target),
            $container  = $target.closest(".tab-pane"),
			dataToSend  =  'tabClicked=' +
                            //find the active tab and send that as well
                            $("#profilePageActivityHistoryTabSelectedTabs > li").index($("#profilePageActivityHistoryTabSelectedTabs > li.active")),
            //dataToSendA = $form.serializeArray(),
            i           = 0,
            method      = $form.attr('method'),
            that        = this;

        // if the entire form fails to validate prevent it from continuing
        if (!G5.util.formValidate($form.find('.validateme'))) {
            return false;
        }

        $.ajax({
            url:        actionUrl,
            type:       method,
            data:       dataToSend,
            success:    function (data, status) {
                var $newContents = $(data);
                $("thead a", $newContents).click(function (evnt) {
                    evnt.preventDefault();
                    // that.headerSortClick(evnt.target.href);
                    that.headerSortClick(evnt.target.href, evnt.target);
                    // debugger;
                });
                $("a.content-link", $newContents).closest("tr").click(function (evnt) {
                    // debugger;
                    that.lineItemClick($(evnt.target).closest("tr").find("a").attr("href"));
                });

                $container.empty().append($newContents);

                that.animateTabs();

                that.modifyExportLinks($newContents);

                // attach responsive table plugin
                $container.find('table.table').responsiveTable({ pinLeft : [0]});

                //for (i = 0; i < dataToSendA.length; i++) {
                    //console.log("[INFO] [" + dataToSendA[i].name + "] = [" + dataToSendA[i].value + "]");
                //}
            },
            error:      function (data, status) {
                // debugger;
                console.log(data);
                console.log(status);
            }
        });

    },

    lineItemClick: function (hrefValue) {
        'use strict';
        var that = this;

        window.location = hrefValue;
    },

    headerSortClick: function (hrefValue, target) {
        'use strict';
        var that = this,
            dataToSend  =  'tabClicked=' +
                            //find the active tab and send that as well
                            $("#profilePageActivityHistoryTabSelectedTabs > li").index($("#profilePageActivityHistoryTabSelectedTabs > li.active"));
        $.ajax({
            url:        hrefValue,
            data:       dataToSend,
            success:    function (data, status) {
                var $newContents = $(data),
                    $container  = $(target).closest(".tab-pane");
                $("thead a", $newContents).click(function (evnt) {
                    evnt.preventDefault();
                    that.headerSortClick(evnt.target.href, evnt.target);
                    // debugger;
                });
                $("a.content-link", $newContents).closest("tr").click(function (evnt) {
                    that.lineItemClick($(evnt.target).closest("tr").find("a").attr("href"));
                });
                $container.empty();
                $container.append($newContents);
                that.modifyExportLinks($newContents);
                console.log("[INFO] ProfilePageACTIVITY_HISTORY_TabView column sort success");
                that.animateTabs();
            },
            error:      function (data, status) {
                // debugger;
                console.log("[INFO] ProfilePageACTIVITY_HISTORY_TabView column sort error for href[" + hrefValue + "]");
            }
        });
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
                function (tpl) {
                    that.$el.empty().append(tpl());
                    that.trigger('templateloaded');
                    that.$el.find('.datepickerTrigger').datepicker('setEndDate', '+0d');

                    // set any parameters that were passed to the view
                    if(that._params) {
                        that.$el.find('#profilePageActivityHistoryTabStartDate')
                            .val(that._params.startDate || that.$el.find('#profilePageActivityHistoryTabStartDate').val())
                            .closest('.datepickerTrigger').datepicker('update');
                        that.$el.find('#profilePageActivityHistoryTabEndDate')
                            .val(that._params.endDate || that.$el.find('#profilePageActivityHistoryTabEndDate').val())
                            .closest('.datepickerTrigger').datepicker('update');
                        that.$el.find('#profilePageActivityHistoryTabPromotion')
                            .val(that._params.promotionId);
                    }

                    that.validateDates({currentTarget: ''});

                    // submit form to get the first results set
                    $('#profilePageActivityHistoryForm').submit();
                },
                this.tplUrl);
        }
        // otherwise, just trigger the completion event
        else {
            var x = $('#profilePageActivityHistoryTabSelectedTabs').find('.active').find('a').attr('href');
                // changed .show() to addClass as of 5.4 since show is setting an inline style of display block which keeps it from hiding when clicking another tab.
                $(x).addClass('active');

            // set any parameters that were passed to the view
            if(this._params) {
                this.$el.find('#profilePageActivityHistoryTabStartDate')
                    .val(this._params.startDate || this.$el.find('#profilePageActivityHistoryTabStartDate').val())
                    .closest('.datepickerTrigger').datepicker('update');
                this.$el.find('#profilePageActivityHistoryTabEndDate')
                    .val(this._params.endDate || this.$el.find('#profilePageActivityHistoryTabEndDate').val())
                    .closest('.datepickerTrigger').datepicker('update');
                this.$el.find('#profilePageActivityHistoryTabPromotion')
                    .val(this._params.promotionId);

                // submit form to get the first results set
                $('#profilePageActivityHistoryForm').submit();
            }

            this.validateDates({currentTarget: ''});

            this.trigger('templateloaded');
        }

        return this;
    }
});
