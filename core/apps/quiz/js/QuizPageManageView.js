/*jslint browser: true, nomen: true, unparam: true*/
/*global
$,
_,
PageView,
DisplayTableAjaxView,
QuizPageManageView:true
*/
QuizPageManageView = PageView.extend({
    
    //override super-class initialize function
    initialize: function(opts) {

        var thisView = this;

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        this.$filter = this.$el.find('#quizFilterSelect');

        this.initTable();

        this.doInputChange();
    },

    events: {
        'change #quizFilterSelect':'doInputChange'
    },

    initTable: function() {
        if(this.dispTableView) { return; }

        this.dispTableView = new DisplayTableAjaxView({
            el:$('.displayTableAjaxView'),
            delayLoad: true // don't load data immediately
        });

        // listen for data change of table
        this.dispTableView.on('htmlLoaded', function(){
            // anything that needs to be done to HTML loaded via AJAX
        }, this);

    },

    // add params to ajax table request
    loadTable: function() {
        var qf = this.getQuizFilter(),
            qfName = this.$filter.attr('name'),
            params = {};

        params[qfName] = qf;

        this.dispTableView.setExtraParams(params);
        this.dispTableView.loadHtml();
    },

    doInputChange: function(e) {
        this.loadTable();
    },


    // MODELISH STUFF
    getQuizFilter: function() {
        var $selOpt = this.$filter.find('option:selected');

        return $selOpt.val()||null;
    }

});