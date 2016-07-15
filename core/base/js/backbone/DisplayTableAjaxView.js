/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
Handlebars,
Backbone,
DisplayTableAjaxView:true
*/

/*
    A view to manage ajax loading and rendering of <display:table> output.

    - manage click events on pages and columns to load results via AJAX
    - adjust HTML output as needed for visual design

    <display:table> is a backend (JSP) tag which handles pagination and
    sorting of table data - the downside is a certain amount of inflexibility 
    in the HTML output.

    web/WEB-INF/classes/displaytag.properties contains the current default 
    settings for DT, they may be overriden at the JSP level.

    http://www.displaytag.org/1.2/configuration.html
*/
DisplayTableAjaxView = Backbone.View.extend({

    // no external templates for this view -- too much trouble for BE
    EXPORT_TPL: '<ul class="export-tools fr">'
                +   '{{#exports}}<li class="export">'
                +       '<a href="{{url}}" class="export{{nameCap}}ButtonSent bgBtn bgBtn{{nameCap}}">&nbsp;</a>'
                +   '</li>{{/exports}}'
                +'</ul>',

    // the th classes do not match the client-side classes
    TH_CLASS_MAP: {
        'row-sortable':'sortable',
        'row-sorted':'sorted',
        'row-sorted-asc':'ascending',
        'row-sorted-des':'descending'
    },


    initialize: function(opts) {

        // compile the export tpl and make available instance-wide
        this.expTpl = Handlebars.compile(this.EXPORT_TPL);

        // make sure we get this style
        this.$el.addClass('displayTableAjaxView');

        // display table generating URL
        this.url = opts.url||this.$el.data('url')||null;

        this.extraParams = {}; // parameters to send along with html requests

        this.setExtraParams({responseType: 'html'});

        if(!opts.delayLoad) {
            this.loadHtml(); // initial call for html
        }
        
    },

    setExtraParams: function(params) {
        this.extraParams = _.extend(this.extraParams, params);
    },

    loadHtml: function(url) {
        var that = this,
            killSpin = function(){that.$el.find('.spin, .spincover').remove();};

        this.$el
            .append('<span class="spincover"><span class="spin" /></span>')
            .find('.spin').spin();

        $.ajax({
            url: url||this.url, // if no url passed, use the opts or data-url
            data: this.extraParams||{},
            type: 'get',
            dataType: 'g5html',
            success: function (data, status) {
                var $newContents = $(data);

                killSpin();

                // massage as necessary before appending
                that.$el.hide();
                that.$el.empty().append($newContents);
                that.massageDisplayTable();
                that.$el.show();

                // we can make this optional if so desired, also pass through settings for it
                that.$el.find('table.table').responsiveTable(/*{pinLeft:[0]}*/);

                that.trigger('htmlLoaded'); // for parent views to do stuff like attach plugins
            },
            error: function (data, status) {

                killSpin();

                that.$el.empty().append(
                    '<div class="alert alert-error">'+
                        '<i>DisplayTableAjaxView</i><br>'+
                        '<b>AJAX error:</b> '+
                        data.statusText+' ('+data.status+')<br>'+
                        '<b>URL:</b> '+url+
                    '</div>'
                );
            }
        });
    },

    events: {
        'click th a':'handleClick',
        'click .paginationControls a':'handleClick'
    },

    handleClick: function(e) {
        var $tar = $(e.currentTarget);
        e.preventDefault();
        this.loadHtml($tar.attr('href'));
    },

    /*
        Massage Functions - adjust DT elements
     */
    massageDisplayTable: function() {
        this.massageTableHeader();
        this.massageExport();
        this.massagePagination();
    },

    massageTableHeader: function() {
        var $t = this.$el.find('table'),
            $th = $t.find('th');

        // replace DT classes with g5 FE classes
        _.each(this.TH_CLASS_MAP,function(toCls, fromCls){
            $th.each(function(){
                var $theTh = $(this);
                if($theTh.hasClass(fromCls)){
                    $theTh.removeClass(fromCls).addClass(toCls);
                }
            });
        });

        // add sort icons
        $th.filter('.sortable').find('a').append(' <i class="icon-sort-up"></i><i class="icon-sort-down"></i>');

        // unsorted class add
        $th.each(function(){
            var $t = $(this);
            if($t.hasClass('sortable') && !$t.hasClass('sorted')) {
                $t.addClass('unsorted');
            }
        });
    },

    massageExport: function() {
        var $t = this.$el.find('table'),
            $exp = this.$el.find('.export'), // wraps the links
            $l = $exp.find('a'), // the links
            json = {exports:[]},
            loc = window.location;

        // hide table if its in one
        $exp.closest('table').hide();
        // hide the wrapper
        $exp.hide();

        // build json to feed to tpl
        $l.each(function(){
            var $t = $(this),
                name = $.trim($t.text().toLowerCase()),
                url = $t.attr('href');
            json.exports.push({
                name:name,
                nameCap:name.charAt(0).toUpperCase()+name.slice(1),
                url:url
            }); 
        });

        // insert tpl+json before first .paginationControls element
        this.$el.find('.paginationControls:eq(0)').before(this.expTpl(json));
    },

    massagePagination: function() {
        var $t = this.$el.find('table'),
            $pgn = this.$el.find('.paginationControls.onepage,.paginationControls.last,.paginationControls.first,.paginationControls.full'),
            $desc = this.$el.find('.paginationDesc');

        // remove descriptions and then append one to main pagination control element
        // *ie7 wants PREpend for layout
        $($desc.remove()[0]).prependTo($pgn);

    }

});