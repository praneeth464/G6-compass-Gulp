/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
Backbone,
PaginationView:true
*/
PaginationView = Backbone.View.extend({

    initialize: function(opts){
        var thisView = this,
            defaults = {
                pages : 1,
                current : 1,
                per : 1, // required for counts to work
                total : 1, // required for counts to work
                buffer : 2,
                ajax : false,
                showCounts : false,
                tpl : false // allow a different template to be passed along for rendering
            };

        this.options = $.extend(true, defaults, opts);

        this.model = new Backbone.Model();
        this.model.set(this.options, { silent : true });

        this.tplName = 'paginationView';
        this.tplUrl = G5.props.URL_TPL_ROOT || G5.props.URL_BASE_ROOT + 'tpl/';

        this.render();

        if( !this._listenersadded ) {
            this.model.on('change', function() {
                if( _.intersection(_.keys(thisView.model.changedAttributes() || {}), ['pages', 'current', 'rendered']).length && thisView.model.get('pages') > 0 ) {
                    thisView.render();
                }
            });
            this._listenersadded = true;
        }
    },

    render: function() {
        var thisView = this,
            renderTpl;

        // utility function
        renderTpl = function(tpl) {
            // clean out the view root and append our rendered template
            thisView.$el
                .empty()
                .html(
                    tpl( thisView.model.toJSON() )
                );

            thisView.model.set({ rendered : true }, { silent : true });
            // trigger a renderDone event
            thisView.trigger('renderDone');
        };

        // if there aren't any pages to render, bail
        if( this.model.get('pages') <= 1 ) {
            return false;
        }

        // do work
        this.buildJson();

        if( this.options.tpl ) {
            renderTpl(this.options.tpl);
        }
        else {
            TemplateManager.get(this.tplName,function(tpl){
                renderTpl(tpl);
            },this.tplUrl);
        }
    },

    events: {
        'click a' : 'clickHandler'
    },

    clickHandler: function(e) {
        var $tar = $(e.target).closest('li'),
            page = $tar.data('page');

        if( $tar.hasClass('disabled') || $tar.hasClass('active') ) {
            return false;
        }

        if( this.options.ajax === true ) {
            e.preventDefault();

            this.trigger('goToPage', page);
        }

    },

    buildJson: function() {
        var base = {
                first : false,
                prev : false,
                pages : [],
                next : false,
                last : false
            },
            counts = {},
            // double the buffer so it can be split to either side of the current
            buffer = this.model.get('buffer') * 2,
            // first, test to see which is bigger: 1 or the current page minus the buffer (so we can't go smaller than page 1)
            // then, test to see which is smaller: calculated from above or the total page count minus the buffer minus 1 (current) minus 1 (the optional gap)
            min = Math.min(Math.max(1, this.model.get('current') - this.model.get('buffer')), this.model.get('pages') - buffer - 1 - 1),
            max = min + buffer;

        // loop through all the possible pages
        for( var i=1; i<=this.model.get('pages'); i++ ) {
            // first, check to see if a page needs to be included explicitly
            // IF tests
            // i is greater than the min AND less than the max
            // i is the max + 1 AND the second-to-last page
            // i is the last page
            if( (i >= min && i <= max) ||
                (i == max + 1 && i == this.model.get('pages') - 1) ||
                (i == this.model.get('pages')) ) {

                base.pages.push({
                    state : i == this.model.get('current') ? 'active' : '',
                    page : i
                });
            }
            // ELSE, the page falls in the gap
            // we add the gap only if the page is the very next one in line
            else if( i == max + 1 && this.model.get('pages') > max + 1 + 1 ) {
                base.pages.push({
                    state : 'disabled gap',
                    page : '',
                    isgap: true
                });
            }
        }

        base.first = {
            state : base.pages[0].page > 1 ? '' : 'disabled',
            page : 1
        };
        base.prev = {
            state : this.model.get('current') > 1 ? '' : 'disabled',
            page : this.model.get('current') - 1
        };
        base.next = {
            state : this.model.get('current') < this.model.get('pages') ? '' : 'disabled',
            page : this.model.get('current') + 1
        };
        base.last = {
            state : base.pages[base.pages.length-2].page ? 'disabled' : '',
            page : this.model.get('pages')
        };

        this.model.set({ pagination : base }, { silent : true });

        if( this.options.showCounts ) {
            counts.start = (this.model.get('current') - 1) * this.model.get('per') + 1;
            counts.end = Math.min(this.model.get('total'), this.model.get('current') * this.model.get('per'));
            counts.total = this.model.get('total');

            this.model.set({ counts : counts }, { silent : true });
        }
    },

    setProperties: function(props) {
        this.model.set(props);
    }

});
