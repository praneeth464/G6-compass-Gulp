/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5,
TemplateManager,
Backbone,
BreadcrumbView:true
*/
BreadcrumbView = Backbone.View.extend({

    initialize: function(opts){
        var thisView = this,
            defaults = {
                crumbs : [],
                showRootWhenAlone : true,
                ajax : false,
                tpl : false // allow a different template to be passed along for rendering
            };
            
        this.options = $.extend(true, defaults, opts);

        this.model = new Backbone.Model();
        this.model.set(this.options);

        this.tplName = 'breadcrumbView',
        this.tplUrl = G5.props.URL_TPL_ROOT||G5.props.URL_BASE_ROOT+'tpl/';

        // console.log('BreadcrumbView', this);

        this.render();

        this.model.on('change', function() {
            if( thisView.model.changedAttributes().crumbs ) {
                thisView.render();
            }
        });
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

            // trigger a renderDone event
            thisView.trigger('renderDone');
        };

        // do work
        this.buildJson();

        if( this.options.tpl ) {
            renderTpl(this.options.tpl);
        }
        else {
            TemplateManager.get(this.tplName,function(tpl,vars,subTpls){
                renderTpl(tpl);
            },this.tplUrl);
        }
    },

    events: {
        'click a' : 'clickHandler'
    },

    clickHandler: function(e) {
        var $tar = $(e.target).closest('li'),
            crumb = $tar.data('crumb');

        if( $tar.hasClass('disabled') ) {
            return false;
        }

        if( this.options.ajax === true ) {
            e.preventDefault();

            this.trigger('goToCrumb', crumb);
        }

    },

    buildJson: function() {
        var thisView = this,
            base = this.model.get('crumbs');

        _.each(base, function(crumb, index) {
            base[index] = {
                visible : !(index === 0 && base.length == 1 && !thisView.model.get('showRootWhenAlone')),
                crumb : index,
                state : index == base.length - 1 ? 'active' : '',
                text : crumb
            };
        });

        this.model.set({ breadcrumbs : base });
    },

    setProperties: function(props) {
        this.model.set(props);
    }

});