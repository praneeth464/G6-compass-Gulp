/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
console,
Backbone,
TemplateManager,
SSISharedHelpersView,
SSICreatorContestModel,
SSIContestCreateModalView:true
*/
SSIContestCreateModalView = SSISharedHelpersView.extend({
    //override super-class initialize function
    resizeDelay: 100,
    // use a model to persist data between qtips
    initialize: function (opts) {
        'use strict';

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        // this.parentView = opts.parentView;
        // this.contests = opts.contests;
        this.tplPath = './../apps/ssi/tpl/';
        this.tplName = 'ssiContestCreateModalTpl';
        // this.model = new Backbone.Model();

        this.parentView = opts.parentView;
        this.target = opts.target;
        this.container = opts.container;

        // borrow the parentView's contestData model
        // if it is available, otherwise create a new model
        this.contestData = this.parentView.contestData || new SSICreatorContestModel();

        this.render();

        var resizeFn     = _.bind(this.resizeModal, this),
            repositionFn = _.bind(this.repositionModal, this),
            updateModal  = _.debounce(_.compose(resizeFn, repositionFn), this.resizeDelay);

        $(window).on('resize', updateModal);

        return this;
    },

    /**
     * function description
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    prepJSON: function (jsonData) {
        'use strict';

        _.each(jsonData.contestTypes, function (val, key) {
            val.offset = key * 2;
        });

        return jsonData;
    },

    /**
     * function description
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    render: function () {
        'use strict';

        var $spinner = this.parentView.$el.find('.contestCreateSpinner'),
            getTemplate,
            renderTemplate;

        getTemplate = _.bind(function () {
            var deferrer = new $.Deferred();

            TemplateManager.get(this.tplName, function (tpl) {
                deferrer.resolve(tpl);
            }, this.tplPath);

            return deferrer.promise();
        }, this);

        renderTemplate = _.bind(function (tpl) {

            var data = this.prepJSON(this.contestData.toJSON());

            this.target.qtip({
                content: {
                    text: tpl(data)
                },
                style: {
                    // width: 500, // No set width
                    classes: 'ssiSelectContestQtip ui-tooltip-shadow ui-tooltip-light',
                    tip: {
                        corner: true,
                        width: 20,
                        height: 10
                    }
                },
                hide: {
                    event: 'unfocus',
                    delay: 200
                },
                position: {
                    my: 'bottom center',
                    at: 'top center',
                    container: this.parentView.$el,
                    viewport: $(window)
                },
                show: {
                    solo: true,
                    event: 'click',
                    ready: true
                },
                events: {
                    render: _.bind(function (event, qtip) {
                        console.log('render');
                        var el = qtip.elements.tooltip[0];

                        this.qtip = qtip;
                        this.setElement(el);

                        $spinner.spin(false);
                    }, this),
                    show: _.bind(function(){
                        console.log('show');
                        this.selectFirstContest();
                        this.resizeModal();
                        this.zIndexHack(true);
                    }, this),
                    hide: _.bind(function(){
                        console.log('hide', this.cid);
                        this.zIndexHack(false);
                    }, this),
                    visible: _.bind(function() {
                        console.log('visible');
                        this.resizeModal();

                    }, this)
                }
            });
        }, this);

        $spinner.spin(true);

        this.contestData.makeFetchHappen()
            .then(getTemplate)
            .then(renderTemplate);

        return this;
    },

    /*
    * Select the first contest in the modal when shown
    */
    selectFirstContest: function(){
        var $firstGroup = this.$el.find('.tabGroup:first'),
            $firstTabContent = $firstGroup.find('.tabContent');

        $firstGroup.addClass('active');
        $firstTabContent.show();
    },

    /**
     * Handles responsive resizing of qtip module. Since
     * the module is dynamically positioned and sized,
     * it's not possible to do this in CSS alone.
     *
     * @param {object} event - jQuery event object
     * @returns {object}
     */
    resizeModal: function () {
        'use strict';

        //It is possible to do in CSS with a small amount of jQuery. getComputedStyle has issues in Safari and old IE browsers.
        this.$el.removeClass('qtipSmall qtipMedium qtipLarge qtipHuge');

        if($(window).width() >= 1000 && $(window).width() < 1200) {
            this.$el.addClass('qtipLarge').css('width', '600px');

        } else if($(window).width() < 1000 && $(window).width() >= 600){
            this.$el.addClass('qtipMedium').css('width', '400px');

        } else if($(window).width() < 600) {
            this.$el.addClass('qtipSmall').css('width', '300px');

        } else {
            this.$el.addClass('qtipHuge').css('width', '800px');
        }

        return this;
    },

    /**
     *
     * Checks to see if the left or right edge of the modal is off of
     * the screen and repositions it if need be.
     *
     * @param {object} event - jQuery event object
     * @returns {object}
     */
    repositionModal: function () {
        'use strict';

        // console.log('repositionModal');

        var windowWidth = $(window).width(),
            modalHalfWidth = this.$el.width() / 2,
            $button = this.qtip.elements.target,
            buttonCenterOffset = $button.offset().left + ($button.width() / 2),
            qtipXPos,
            qtipYPosAt,
            qtipYPosMy;

        if (buttonCenterOffset + modalHalfWidth >= windowWidth) {
            qtipXPos = 'right';
        } else if (buttonCenterOffset - modalHalfWidth <= 0) {
            qtipXPos = 'left';
        } else {
            qtipXPos = 'center';
        }

        if(this.$el.parents('.module').length){
            qtipYPosMy = 'bottom';
            qtipYPosAt = 'top';
        } else {
            qtipYPosMy = 'top';
            qtipYPosAt = 'bottom';
        }

        this.$el.qtip('option', 'position.my', qtipYPosMy + qtipXPos)
            .qtip('option', 'position.at',  qtipYPosAt + 'center');

        return this;
    },

    /**
     * toggles visible nav items
     *
     * @param {object} event - click event
     * @returns {object}
     */
    changeTab: function (event) {
        'use strict';

        var $target = $(event.target),
            $group = $target.parents('.tabGroup'),
            $allTabContent = this.$el.find('.tabContent'),
            $currentTabContent = $group.find('.tabContent');

        this.$el.find('.active').removeClass('active');
        $group.addClass('active');

        $allTabContent.hide();
        $currentTabContent.show();
        this.$el.find('.createButtonWrap').show();

        return this;
    },

    /**
     * Maybe overly aggressive removal of the qtip.
     * Destroys the qtip and the view, to prevent conflicting references.
     *
     * @returns {undefined}
     */
    destroyView: function() {
        'use strict';

        // remove qtip
        this.qtip.hide();
        this.qtip.destroy();

        // remove events
        this.undelegateEvents();
        this.$el.removeData().unbind();

        // Remove view from DOM
        this.remove();
        Backbone.View.prototype.remove.call(this);

        return;
    },

    /**
     * Ensures that the qtip is always above other modules.
     * Since the eventing with qtips is not synchronus,
     * some work arounds with `this.sharedSettings` need to
     * be in place to make sure the correct module is shown
     * on top of the others.
     *
     * @param {boolean} qtipIsActive - if the current qtip is the one to show
     * @returns {object}
     */
    sharedSettings: new Backbone.Model(),
    zIndexHack: function (qtipIsActive) {
        'use strict';

        /**
         * `moduleList` - a list of all active qtips. This should
         * be either 0, 1, or 2 - 0 if no qtips are active, 1 if
         * a single qtip is active, and 2 if it's currently
         * transitioning between active qtips.
         *
         * `moduleMap` - saved references to all active qtips. This
         * is useful when transitioning between two active qtips.
         * Since the second qtip will want to take control of class
         * changes, even when not desired, saving a reference allows
         * access to the correct qtp, and the qtip's parent.
         */

        var moduleList  = this.sharedSettings.get('qtipModuleList') || [],
            moduleMap   = this.sharedSettings.get('qtipModuleMap') || {},
            $moduleWrap = $('.moduleContainerViewElement'),
            wrapClass   = 'ssiQtipIsShown',
            moduleClass = 'ssiQtipIsShownModule';

        if (qtipIsActive) {
            moduleList.push(this.cid);
            moduleMap[this.cid] = this;
        } else {
            moduleList = _.filter(moduleList, function(val){
                return val !== this.cid;
            }, this);

            if (moduleMap[this.cid]) {
                delete moduleMap[this.cid];
            }

            this.parentView.$el.removeClass(moduleClass);
        }

        _.each(moduleMap, function (val) {
            val.parentView.$el.addClass(moduleClass);
        });

        this.sharedSettings.set('qtipModuleList', moduleList);
        this.sharedSettings.set('qtipModuleMap', moduleMap);

        $moduleWrap[!!moduleList.length ? 'addClass' : 'removeClass'](wrapClass);

        return this;
    },

    events: {
        'click .tabNav': 'changeTab',
        'click .close': 'destroyView'
    }

});
