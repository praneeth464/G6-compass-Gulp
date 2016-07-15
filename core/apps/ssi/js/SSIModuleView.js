/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
$,
G5,
ModuleView,
SSIParticipantStepItUpView,
SSIParticipantDoThisGetThatView,
SSIParticipantObjectivesView,
SSIParticipantStackRankView,
SSICreatorListModuleView,
SSIModuleView:true
*/
SSIModuleView = ModuleView.extend({

    initialize: function() {
        'use strict';

        var that = this;

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({}, ModuleView.prototype.events, this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions', [
            // {w:1,h:1}, // 1x1 square
            {w: 2, h: 1}, // 2x1 square
            {w: 2, h: 2}, // 2x2 square
            {w: 4, h: 2}, // 4x2 square
            {w: 4, h: 4}  // 4x4 square
        ]);


        this.on('templateLoaded', function() {
            if (!that.model.get('ssiJson')) { // this is the master module
                this.loadMasterData();
            } else { // this must be a slave module
                this.processData();
            }
            G5.util.textShrink( this.$el.find('.moduleHeader h4'), {minFontSize:14} );
             _.delay(G5.util.textShrink, 200, this.$el.find('.moduleHeader h4'), {minFontSize:14} );

            G5.util.textShrink( this.$el.find('.activityDescription'), {minFontSize:11} );
             _.delay(G5.util.textShrink, 200, this.$el.find('.activityDescription'), {minFontSize:11} );

            G5.util.textShrink( this.$el.find('.dataSection h5'), {vertical:false, minFontSize:14} );
            _.delay(G5.util.textShrink, 200, this.$el.find('.dataSection h5'), {vertical:false,minFontSize:14} );

            G5.util.textShrink( this.$el.find('.contestDataWrapper span'), {vertical:false, minFontSize:14} );
            _.delay(G5.util.textShrink, 200, this.$el.find('.contestDataWrapper span'), {vertical:false,minFontSize:14} );
        });

        this.moduleCollection.on('filterChanged', function() {
            G5.util.textShrink( this.$el.find('.moduleHeader h4'), {minFontSize:14} );
            G5.util.textShrink( this.$el.find('.activityDescription'), {minFontSize:11} );
            G5.util.textShrink( this.$el.find('.dataSection h5'), {vertical:false, minFontSize:14} );
            G5.util.textShrink( this.$el.find('.contestDataWrapper span'), {vertical:false, minFontSize:14} );
        }, this);

        this.on('geometryChanged', function(dims) {
            G5.util.textShrink( this.$el.find('.moduleHeader h4'), {minFontSize:14} );
            G5.util.textShrink( this.$el.find('.activityDescription'), {minFontSize:11} );
            G5.util.textShrink( this.$el.find('.dataSection h5'), {vertical:false, minFontSize:14} );
            G5.util.textShrink( this.$el.find('.contestDataWrapper span'), {vertical:false, minFontSize:14} );
        });

    },

    // once we have contest data, call this
    processData: function() {
        'use strict';

        var ssiJson     = this.model.get('ssiJson'),
            contestType = _.isArray(ssiJson) ? 'list' : ssiJson.contestType,
            contestMap  = {
                'stepItUp': SSIParticipantStepItUpView,
                'doThisGetThat': SSIParticipantDoThisGetThatView,
                'objectives': SSIParticipantObjectivesView,
                'stackRank': SSIParticipantStackRankView,
                'list': SSICreatorListModuleView
            };

        if (!ssiJson) {
            console.error('[SSI] `ssiJson` data not found in `this.model`:', this.model);
            return this;
        }

        // probably pass ssiJson to a contest view as a contest model or some such tomfoolery, and rendering and etc.

        if (!contestMap[contestType]) {
            throw new Error('can\'t find view contestType ' + contestType);
        }

        /**
         * Errors in a single contestView prevent the slave
         * views from spawning. Using try/catch allows one
         * view to fail while the remaining are still created.
         */
        try {
            this.contestView = new contestMap[contestType]({
                el: this.$el.find('.ssiParticipantContestView'),
                wrapperTpl: 'ssiModuleView',
                parentView: this,
                data: ssiJson
            });
            this.contestView.render();

            this.contestView.on('compiled', function(){
               G5.util.textShrink( this.$el.find('.moduleHeader h4'), {minFontSize:14} );
                _.delay(G5.util.textShrink, 100, this.$el.find('.moduleHeader h4'), {minFontSize:14} );
                G5.util.textShrink( this.$el.find('.activityDescription'), {minFontSize:10} );
                _.delay(G5.util.textShrink, 100, this.$el.find('.activityDescription'), {minFontSize:10} );
                G5.util.textShrink( this.$el.find('.dataSection h5'), {vertical:false, minFontSize:14} );
            _.delay(G5.util.textShrink, 100, this.$el.find('.dataSection h5'), {vertical:false,minFontSize:14} );
            G5.util.textShrink( this.$el.find('.contestDataWrapper span'), {vertical:false, minFontSize:14} );
            _.delay(G5.util.textShrink, 100, this.$el.find('.contestDataWrapper span'), {vertical:false,minFontSize:14} );
            });
        } catch (err) {
            console.error(err);
        }

        this.$el.addClass(ssiJson.contestType || _.first(ssiJson).contestType);
    },

    /**
     * Converts `this.model` to values usable by the templates
     *
     * @returns {object}
     */
    getTemplateDataJSON: function () {
        'use strict';

        var model = this.model.toJSON(),
            keys  = ['isManager', 'isCreator'],
            data  = _.pick(model, keys);

        if (data.isManager || data.isCreator) {
            data.isManagerOrCreator = true;
        } else {
            data.isParticipant = true;
        }

        return data;
    },

    // get the list of all SSI Module data (first loaded SSIModuleView calls this)
    loadMasterData: function() {
        'use strict';

        var that = this,
            params = {};

        console.log('[INFO] SSIModuleView.loadMasterData() started');

        // start the loading state and spinner
        this.dataLoad(true);

        $.ajax({
            dataType: 'g5json',
            type: 'POST',
            url: this.getDataUrl(),
            data: params,
            success: function(serverResp) {
                //regular .ajax json object response
                var data = serverResp.data;

                // stop spinner
                that.dataLoad(false);

                if (data.masterModuleList.length) {
                    // console.log('[INFO] SSIModuleView.loadMasterData() got ssi master list - ' + that.masterModuleList.length + ' modules');
                    that.createListAfter = data.createListAfter || null;
                    that.masterModuleList = that.mapData(data.masterModuleList);
                    // that.masterModuleList = data.masterModuleList;
                    that.spawnModules();
                } else {
                    console.error('[SSI] no modules returned from server');
                }

            },
            error: function(jqXHR, textStatus) {
                console.log('[INFO] SSIModuleView: loadMasterData() Request failed: ' + textStatus);
            }
        });
    },

    /**
     * (todo)
     *
     * @param {string} foo - foo description
     * @returns {string}
     */
    mapData: function(json) {
        'use strict';

        if (!this.model.get('isCreator')) {
            return json;
        }

        var types = {};

        _.each(json, function(contest) {
            var type = types[contest.contestType] = types[contest.contestType] || [];

            type.push(contest);
        });

        return _.chain(json)
            .map(function(contest) {
                var typeMap = types[contest.contestType];

                if (!typeMap) {
                    return null;
                } else if (typeMap.length >= this.createListAfter) {
                    delete types[contest.contestType];
                    return typeMap;
                } else {
                    return contest;
                }
            }, this)
            .compact()
            .value();
    },

    spawnModules: function() {
        'use strict';

        var masterModuleJSON = this.model.toJSON(),
            slaves = [];

        if (!this.masterModuleList) { return; }

        // set the master's ssiJson
        this.model.set('ssiJson', _.first(this.masterModuleList));
        // now master's ssiJson is set, we can call processData
        this.processData();

        _.each(_.rest(this.masterModuleList), function(a, i) {
            var m = _.clone(masterModuleJSON);

            m.templateName = m.name;
            m.viewName = m.name;

            // make slave names unique
            m.name = m.name + i;

            // bootstrap data so these know to act as slave
            m.ssiJson = a;

            slaves.push(m);
        });

        // add all slave modules to ModuleCollection -- they have their ssiJson bootstrapped in so they will act as slaves in initialization
        this.moduleCollection.add(slaves);
    }

});
