/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
Backbone,
G5,
TemplateManager,
ProfilePageStatementTabView:true
*/
ProfilePageStatementTabView = Backbone.View.extend({

    initialize: function (opts) {
        "use strict";

        this.on('templateloaded', function() {
            //setup the calendar so that the end date cannot be set to earlier than the start
            var $startDate = this.$el.find('#profilePageStatementTabStartDate'),
                $endDate = this.$el.find('#profilePageStatementTabEndDate');

            $endDate.closest('.datepickerTrigger').datepicker('setStartDate',$startDate.val()).datepicker('setEndDate', '+0d');
        });
    },

    activate: function () {
        "use strict";

        this.render();
    },

    render: function () {
        "use strict";

        var self    = this,
            tplName = 'profilePageStatementTab',
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
                    self.$el.find('.datepickerTrigger').datepicker({endDate: '+0d'});

                    // sumit form to get the first results set
                    self.submitFormData();

                },
                tplUrl);
        }
        // otherwise, just trigger the completion event
        else {
            this.trigger('templateloaded');
        }

    },

    events: {
        'change .date' : "validateDates",
        'click #statementTabUpdateTransactionDetailsButton': 'submitFormData',
        'click th a': 'headerSortClick'
    },

    validateDates: function(event){
        'use strict';
        var $startDate = this.$el.find('#profilePageStatementTabStartDate'),
            $endDate = this.$el.find('#profilePageStatementTabEndDate'),
            $target = $(event.currentTarget),
            startDate = $startDate.closest('.datepickerTrigger').data('datepicker').date,
            endDate = $endDate.closest('.datepickerTrigger').data('datepicker').date;

        // TODO: make this more useful?
        switch($target.attr('id')) {
            case $startDate.attr('id'):
            case undefined:

                // once start date has been set, other dates cannot occur before it
                $endDate.closest('.datepickerTrigger').datepicker('setStartDate',$startDate.val()).datepicker('setEndDate', '+0d');

                // if the new startDate is later than the current endDate AND a value already exists in endDate, clear the value & indicate change
                if (startDate.valueOf() > endDate.valueOf() && $endDate.val() !== '') {
                    G5.util.animBg($endDate,'background-flash');
                    $endDate.val('').closest('.datepickerTrigger').datepicker('update');
                }
                break;
            case $endDate.attr('id'):
                G5.util.formValidate($('#profilePageStatementTabForm').find('.validateme'));

                // if endDate is updated, displayEndDate updates automatically to endDate + 10 days
                break;
        } // switch

    }, // validateDates

    submitFormData: function(event){
        if(event) { event.preventDefault(); }

        var $form       = $('#profilePageStatementTabForm'),
            actionURL   = $form.attr('action'),
            dataToSend  = $form.serialize(),
            i           = 0,
            method      = $form.attr('method'),
            that        = this,
            $container  = this.$el.find('#profilePageStatementTabTransactionDetails');

        // if the entire form fails to validate prevent it from continuing
        if (!G5.util.formValidate($form.find('.validateme'))) {
            return false;
        }

        this.$el
            .append('<span class="spincover"><span class="spin" /></span>')
            .find('.spin').spin();

        $.ajax({
            url:        actionURL,
            data:       dataToSend,
            success:    function (data, status) {
                var $newContents = $(data);
                $container.html($newContents);
                that.modifyExportLinks($newContents);
                that.$el.find('.spin, .spincover').remove();
                that.refreshBalanceInfo();
            },
            error:      function (data, status) {
            }
        });

    },

    refreshBalanceInfo: function() {
        //this replaces the data in the 'summary' section of the statement tab
        $("#beginningBalance").text($("#beginningBalanceValue").val());
        $("#earnedBalance").text($("#earnedBalanceValue").val());
        $("#redeemedBalance").text($("#redeemedBalanceValue").val());
        $("#adjustmentBalance").text($("#adjustmentBalanceValue").val());
        $("#pendingBalance").text($("#pendingBalanceValue").val());
        $("#endingBalance").text($("#endingBalanceValue").val());
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

            sel = sel.charAt(0).toUpperCase()+sel.slice(1); // capitalize
            sel = '.export'+sel+'Button'+capitalizedSelectedMode; // destination

            $data.find(sel).attr('href',$exp.attr('href')).show();
        });

        $destLinks[$expLinks.length?'show':'hide']();
        $expLinks.closest('.export').hide();
    },

    headerSortClick: function (event) {
        'use strict';
        event.preventDefault();

        var that = this,
            tar = event.target,
            $tar = $(tar),
            $form       = $('#profilePageStatementTabForm'),
            sortOrder,
            actionURL = $form.attr('action'),
            dataToSend;

        // //add active class to that table header just clicked.
        // $($tar).closest('tr').find('.active').removeClass('active');
        // $($tar).addClass('active');

        // //find out if it's ascending or descending
        // if ($($tar).parent().hasClass('ascending')){
        //     sortOrder="ascending";
        // } else {
        //     sortOrder="descending";
        // }

        //prevent bubbling issues on click event
        if ($tar.is("i")){
            dataToSend = $tar.closest("a").attr('href');
        }else{
            dataToSend = $tar.attr('href');
        }

        //displayTable appends action url into href attribute. removing it from dataToSend to avoid malformed URL
        dataToSend = dataToSend.substr(dataToSend.indexOf("?"));

        //this is a weird BE issue where both JQ and BE are adding a question mark. It's easier for us to remve it in FE
        if (dataToSend.indexOf("?") === 0){
            dataToSend = dataToSend.substr(1, dataToSend.length);
        }



        $.ajax({
            url:        actionURL,
            data:       dataToSend,
            success:    function (data, status) {
                var $newContents = $(data);
                $("#profilePageStatementTabTransactionDetails", that.$el).empty().append($newContents);
                that.modifyExportLinks($newContents);
            },
            error:      function (data, status) {
            }
        });
    }

});
