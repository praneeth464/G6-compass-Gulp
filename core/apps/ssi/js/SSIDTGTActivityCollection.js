/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SSIDTGTActivityModel,
SSIDTGTActivityCollection:true
*/
SSIDTGTActivityCollection = Backbone.Collection.extend({

    model: SSIDTGTActivityModel,

    initialize: function(opts) {

        this.activeNewModel = null;
        this.activeEditModel = null;

    },


    // ************************************************
    // NEW MODELS
    // ************************************************
    addNew: function(numPax) {
        var m = new SSIDTGTActivityModel();

        m.collection = this;
        m.setIsActiveNew(true);
        m.set('participantCount', numPax);

        this.activeNewModel = m;

        m.on('success:create', this.finishSaveNew, this);
        this.trigger('addNew',m);
    },

    saveNew: function() {
        this.trigger('saveNewStart');
        this.activeNewModel.save();
    },

    finishSaveNew: function() {
        var temp = this.activeNewModel;

        this.activeNewModel.setIsActiveNew(false);
        this.add(this.activeNewModel);

        this.activeNewModel = null;
        this.trigger('saveNew',temp);
    },

    removeNew: function() {
        var removed = this.activeNewModel;

        this.activeNewModel = null;
        this.trigger('removeNew', removed);
    },

    getActiveNewModel: function() {
        return this.activeNewModel;
    },

    areDescriptionsUnique: function(model) {
        var ok = true;

        this.each( function(modInColl) {
            if( model.get('id') !== modInColl.get('id') &&
                model.get('description') === modInColl.get('description') ) {
                ok = false;
            }
        });
        return ok;
    }

});
