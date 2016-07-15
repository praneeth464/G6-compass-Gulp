/*jslint browser: true, nomen: true, devel: false, unparam: true */
/*global
_,
$,
console,
Backbone,
PageView,
TemplateManager,
PaginationView,
SSIModuleView,
SSIContestModel,
SSIEventBus,
SSIPayoutChartView,
SSIStackRankCollectionView,
SSIAdminContestDetailsView,
SSICircleChartView,
SSIBarChartView,
SSIActivityHistoryView,
SSIParticipantContestModel,
SSIParticipantContestView:true
*/

/**
 * Parent class for each contest. This holds the generic functions
 * and shared information.
 */
SSIParticipantContestView = PageView.extend({
    /**
     * Optional template identifiers, in order of look up:
     *
     * creatorTpl       - page view, is creator
     * creatorModuleTpl - module view, is creator
     * managerTpl       - page view, is manager
     * managerModuleTpl - module view, is manager
     * adminTpl         - page view, is creator or manager
     * adminModuleTpl   - module view, is creator or manager
     * moduleTpl        - tpl view, participant or admin
     * tpl              - module or page view, participant or admin,
     *                    fall back to this if non other is provided
     *
     */
    initialize: function (opts) {
        'use strict';

        console.log('[SSI] init SSIParticipantContestView');

        // console.log('[SSI] ------------------  SSIParticipantContestView  --------------------');
        // console.log('[SSI] opts', opts);
        // console.log('[SSI] ------------------ /SSIParticipantContestView  --------------------');

        this.events = _.extend({}, PageView.prototype.events, this.events);

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        this.wrapperTpl = opts.wrapperTpl;
        this.parentView = opts.parentView;

        SSIContestModel.reformatDecimalStrings(opts.data);

        this.model = new SSIParticipantContestModel(opts.data);

        this.tplPath = './../apps/ssi/tpl/';

        this.on('compiled', this.initReadMore, this);

        $(window).on('resize', _.bind(this.resizeListener, this));
        this.resizeListener(); // trigger once on load
    },

    events: {
        'click .activityDescriptionToggle': 'toggleReadMore',
        'click .viewAllStackRank': 'loadStackRank',
        'click .viewActivityHistory': 'loadActivityHistory',
        'click .backToContest': 'backToContest',
        'click .profile-popover': 'attachParticipantPopover',

        'shown.bs.tab .nav a': function() {this.trigger('tabChange');}
    },

    /**
     * Hides page content and replaces it with the contest's full stack rank
     *
     * @param {object} e - event object
     * @returns {object}
     */
    loadStackRank: function (e) {
        'use strict';

        if (e && e.preventDefault) {
            e.preventDefault();
        }

        if (this.stackRankBoard) {
            return this;
        }

        var $scope     = this.$el.find('.contestUniqueContentWrapper'),
            $content   = $scope.find('.contestUniqueContent'),
            $stackRank = $scope.find('.contestFullStackRankWrap'),
            $backBtn   = this.$el.find('.backToContestWrap'),
            AltPaginationView = PaginationView.extend({
                render: function () {
                    // hi-jack `render` to wait for data from the server
                    return this;
                }
            }),
            data = {
                el: $stackRank.find('.contestFullStackRank'),
                parentView: this
            },
            viewList = [this],
            paginationView,
            tabsView;

        if (this.parentView.model.get('isManager')) {
            data.filter = 'team';
        }

        // since DTGT can have multiple stack rank boards
        if (this.model.get('contestType') === 'doThisGetThat') {
            data.activityId = $(e.currentTarget).data('stackrank-activityid');
        }

        this.stackRankBoard = new SSIStackRankCollectionView(data);
        viewList.push(this.stackRankBoard);
        viewList.push(this.stackRankBoard.collection);

        paginationView = new AltPaginationView({
            el : $stackRank.find('.paginationControls'),
            ajax : true,
            showCounts : true
        });
        viewList.push(paginationView);

        if (this.parentView.model.get('isManager')) {
            tabsView = this.createTabsView();
            viewList.push(tabsView);
        }

        this.on('busCreated', function (bus) {
            bus.on('fetch:success', function (servResp) {

                var pages = Math.ceil(servResp.total / servResp.perPage);

                paginationView.setProperties({
                    rendered : false,
                    pages : pages,
                    current: servResp.current,
                    total: servResp.total,
                    per: servResp.perPage
                });

                PaginationView.prototype.render.call(paginationView);
            });

            bus.on('destroyTabs', function () {
                if (tabsView) {
                    tabsView.removeEvents();
                }
            });
        });


        new SSIEventBus(viewList);

        $content.hide();
        $backBtn.show();
        $stackRank.show();

        return this;
    },

    /**
     * Hides page content and replaces it with the contest's full stack rank
     *
     * @param {object} e - event object
     * @returns {object}
     */
    loadActivityHistory: function (e) {
        'use strict';
        var $actHistWrap = this.$el.find('.activityHistoryWrap'),
            $contestWrap = this.$el.find('.contestUniqueContent'),
            $backBtn   = this.$el.find('.backToContestWrap');

        if (e && e.preventDefault) {
            e.preventDefault();
        }

        if(!this.activityHistory){
            this.activityHistory = new SSIActivityHistoryView({
                el: $actHistWrap,
                data: {
                    id: this.model.get('id')
                }
            });
        }

        $backBtn.show();
        $actHistWrap.show();
        $contestWrap.hide();
    },

    /**
     * Hides loaded stack rank or activity history information and shows contest details
     *
     * @param {object} e - event object
     * @returns {object}
     */
    backToContest: function (e) {
        'use strict';

        if (e && e.preventDefault) {
            e.preventDefault();
        }

        var $scope     = this.$el.find('.contestUniqueContentWrapper'),
            $content   = $scope.find('.contestUniqueContent'),
            $stackRank = $scope.find('.contestFullStackRankWrap'),
            $actHistWrap = this.$el.find('.activityHistoryWrap'),
            $backBtn   = this.$el.find('.backToContestWrap.creatorDetailsBtns');

        $backBtn.hide();
        $stackRank.hide();
        $content.show();
        $actHistWrap.hide();

        this.trigger('destroyTabs');

        delete this.stackRankBoard;

        return this;
    },

    /**
     * Finds the correct template based on if `this` is
     * being used as a module or page and a manager, creator
     * or participant. Also sanity checks to make sure that
     * template option has been provided.
     *
     * @returns {string}
     */
    getTemplateName: function () {
        'use strict';

        var isModule  = (this.parentView instanceof SSIModuleView),
            isManager = this.parentView.model.get('isManager'),
            isCreator = this.parentView.model.get('isCreator'),
            isAdmin   = isManager || isCreator,
            subset    = ['tpl'],
            res;


        if (isModule) {
            subset.unshift('moduleTpl');
        }

        if (isAdmin) {
            subset.unshift( isModule ? 'adminModuleTpl' : 'adminTpl');
        }

        if (isManager) {
            subset.unshift( isModule ? 'managerModuleTpl' : 'managerTpl');
        }

        if (isCreator) {
            subset.unshift( isModule ? 'creatorModuleTpl' : 'creatorTpl');
        }

        for (var i = 0; i < subset.length; i++) {
            if (!!this[subset[i]]) {
                res = this[subset[i]];
                break;
            }
        }

        if (!res) {
            throw new Error('[SSI] couldn\'t find template');
        }

        return res;
    },

    /**
     * `render` compiles the unique contest view and an optional a parent view.
     * If `this.wrapperTpl` is set, the unique contest will be rendered first
     * and it's resulting HTML will be passed to the wrapper view as a string.
     * Insert the compiled HTML into the wrapper using `{{{contestHtml}}}`.
     * If `this.wrapperTpl` is not set, the unique contest template will be
     * rendered normally.
     *
     * @returns {object}
     */
    render: function () {
        'use strict';

        var renderDeferrer = new $.Deferred(),
            that     = this,
            tpl      = this.getTemplateName(),
            tplList  = [tpl],
            isModule = (this.parentView instanceof SSIModuleView),
            model    = this.proccessModelJSON(this.model.toJSON()),
            data     = _.extend({}, this.parentView.getTemplateDataJSON(), model);

        if (this.wrapperTpl) {
            tplList.push(this.wrapperTpl);
        }

        /**
         * wraps `TemplateManager` to fetch several templates
         * and execute a callback when they're all ready.
         *
         * @param {array} names - template names
         * @returns {object} - jQuery promise
         */
        function getTpls(names) {
            var tplsDeferrer = new $.Deferred(),
                res    = {},
                length = names.length,
                count  = 0,
                name;

            /**
             * recursively loads templates
             *
             * @access private
             * @param {number} pos - name position in `names` array to load
             */
            function seqLoad(pos) {
                name = names[pos];
                TemplateManager.get(name, function(tpl) {
                    res[name] = tpl;
                    count = count + 1;

                    if (count === length) {
                        // all templates have been loaded
                        // callback(res);
                        tplsDeferrer.resolve(res);
                    } else {
                        // load next in series
                        seqLoad(count);
                    }
                }, that.tplPath);

                return;
            }

            seqLoad(count);

            return tplsDeferrer.promise();
        }

        /**
         * Compile the fetched templates.
         *
         * @param {object} tpls - all dependent templates
         */
        function compile(tpls) {
            var uniqueTpl  = tpls[tpl],
                wrapperTpl = tpls[that.wrapperTpl],
                extendedData,
                isAdmin   = data.isManager || data.isCreator;

            if (!uniqueTpl) {
                throw new Error('[SSI] contest template has not loaded correctly');
            }

            if (wrapperTpl) {
                // debugger;

                extendedData = _.extend({}, data, {
                    contestHtml: uniqueTpl(data)
                });

                //container was not being emptied first resulting in duplicate contest markup
                that.$el.empty().append(wrapperTpl(extendedData));
            } else {
                that.$el.append(uniqueTpl(data));
            }

            renderDeferrer.resolve(that);

            that.trigger('compiled');

            if (!isModule && data.contestType !== 'stackRank') {
                if(data.isParticipant){
                    that.renderActivityTable();
                } else if(isAdmin === true){
                    that.renderContestDetailTable();
                }
            }

            return;
        }

        getTpls(tplList).then(compile);


        return renderDeferrer.promise();
    },

    /**
     * Helper function inteded to be over written with contest
     * type specific functionality.
     *
     * @param {object} json - this model's json
     * @returns {object}
     */
    proccessModelJSON: function (json) {
        'use strict';
        return json;
    },

    /**
     * Functionality that needs to wait for the HTML to render
     * before it's able to execute.
     *
     * @param {string} type - chart type identifier
     * @param {object} chartData - settings for the chart
     * @param {object} $chartHolder - jQuery dom node chart will be appended to
     */
    processCharts: function (type, chartData, $chartHolders) {
        'use strict';
        var self = this,
            // map of chart types to ChartView Objects
            chartViewMap = {
                circle: SSICircleChartView,
                bar: SSIBarChartView,
                payoutProgress: SSIPayoutChartView
            };

        console.log('[SSI] processCharts called');

        // visit each holder and make the apropo chart view out of it
        $chartHolders.each( function() {
            new chartViewMap[type]({
                el: this,
                chartData: chartData,
                parentView: self
            });
        });
    },

    initReadMore: function() {
        'use strict';

        var isModule  = (this.parentView instanceof SSIModuleView),
            description = this.model.get('description'),
            $activityFullDesc = this.$el.find('.fullDescription'),
            $activityPartialDesc = this.$el.find('.partialDescription'),
            $readMore = this.$el.find('.activityDescriptionToggle.readMore');

        if(isModule) { return false; }

        if(description.length > 200){
            $activityPartialDesc.html($activityPartialDesc.html().replace(/^\s\s*/, '').replace(/\s\s*$/, '').substring(0,200))
                .addClass('shown')
                .show();

            $readMore.removeClass('hide');
        } else {
            $activityFullDesc.addClass('shown').show();
        }
    },

    toggleReadMore: function(e){
        'use strict';

        var $activityDesc = this.$el.find('.toggleDescriptionWrap'),
            $tar = $(e.target);

        e.preventDefault();

        if($activityDesc.hasClass('shown')){
            $activityDesc.closest('.shown').removeClass('shown').siblings($activityDesc).addClass('shown');
        }

        $tar.toggleClass('hide');
        $tar.siblings('.activityDescriptionToggle').toggleClass('hide');
    },

    renderActivityTable: function() {
        'use strict';

        if(!this.ssiActivityHistory){
            this.ssiActivityHistory = new SSIActivityHistoryView({
                el: this.$el.find('.activityHistory'),
                data: {
                    id: this.model.get('id')
                }
            });
        }
    },

    renderContestDetailTable: function(){
        'use strict';

        if(!this.ssiAdminContestDetail){
            this.ssiAdminContestDetail = new SSIAdminContestDetailsView({
                el: this.$el.find('.adminContestDetails'),
                data: {
                    id: this.model.get('id'),
                    contestType: this.model.get('contestType')
                },
                detailPageUrl: this.model.get('detailPageUrl')
            });
        }
    },

    createTabsView: function () {
        'use strict';

        console.log('[TABS] createTabsView');

        var TabsView = Backbone.View.extend({
                events: {
                    'click .tabFilter': 'broadcastChange'
                },
                broadcastChange: function (e) {
                    console.log('[SSI] TabsView - broadcastChange');
                    this.trigger('tabsView:filterChange', $(e.currentTarget).data('filter'));
                },
                initialize: function () {
                    console.log('[TABS] init');
                    this.$el.find('a[href="#myTeam"]').trigger('click');
                },
                removeEvents: function () {
                    // COMPLETELY UNBIND THE VIEW
                    this.undelegateEvents();
                    this.$el.off();
                }
            }),
            tabsView = new TabsView({
                el: this.$el.find('.paginationTabs')
            });

        return tabsView;
    },

    /**
     * debounced resize listener.
     * Broadcasts events when #ssiPageView is resized rather than the window
     *
     * @param {object} e - jQuery event
     * @returns {object}
     */
    resizeListener: function () {
        'use strict';

        var width = $('#ssiPageView').width(),
            prev  = this.model.get('prevWidth');

        if (!prev) {
            this.model.set('prevWidth', width);
        } else if (width !== prev) {
            this.model.set('prevWidth', width);
            this.trigger('pageViewResize');
        }

        return this;
    },

    attachParticipantPopover:function(e){
        'use strict';

        var $tar = $(e.target),
            isSheet = ($tar.closest('.modal-stack').length > 0) ? {isSheet: true} : {isSheet: false};

        if ($tar.is('img')){
            $tar = $tar.closest('a');
        }

        //attach participant popovers
        if(!$tar.data('participantPopover')){
            $tar.participantPopover(isSheet).qtip('show');
        }
        e.preventDefault();
    }
});















