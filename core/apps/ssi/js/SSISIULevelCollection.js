/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SSISIULevelModel,
SSISIULevelCollection:true
*/
SSISIULevelCollection = Backbone.Collection.extend({

    model: SSISIULevelModel,

    initialize: function(opts) {

        this.activeNewModel = null;
        this.activeEditModel = null;

        this.on('remove', this.reSequence, this);

    },

    comparator: function(level) {
        return level.get('sequenceNumber');
    },

    // ************************************************
    // NEW MODELS
    // ************************************************
    addNew: function() {
        var m = new SSISIULevelModel();

        m.collection = this;
        m.setIsActiveNew(true, this.length+1);

        this.activeNewModel = m;
        m.on('success:create', this.finishSaveNew, this);

        this.trigger('addNew',m);
    },

    saveNew: function() {
        this.trigger('saveNewStart');

        this.activeNewModel.set('sequenceNumber', this.getNextLevelNum());
        this.activeNewModel.save();
    },

    finishSaveNew: function() {
        var temp = this.activeNewModel;

        this.add(this.activeNewModel);
        this.activeNewModel.setIsActiveNew(false);
        this.activeNewModel = null;

        this.trigger('saveNew',temp);
    },

    getNextLevelNum: function() {
        return this.length + 1;
    },

    // use current index of model to set seq num
    reSequence: function() {
        this.each( function(l, i) {
            l.set('sequenceNumber', i+1);
        });

        this.trigger('reSequenced');
    },

    // set seq nums from a list of id-seqNums explicit
    reOrder: function(seq) {
        var that = this;

        _.each(seq, function(s) {
            that.get(s.id).set('sequenceNumber', s.sequenceNumber);
        });

        this.sort();
        this.trigger('reOrdered');
    },

    removeNew: function() {
        var removed = this.activeNewModel;

        this.activeNewModel = null;
        this.trigger('removeNew', removed);
    },

    getActiveNewModel: function() {
        return this.activeNewModel;
    },

    getHighestLevel: function() {
        return this.at(this.length-1);
    }

});
