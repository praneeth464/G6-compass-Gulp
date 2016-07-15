/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
Backbone,
PageView,
ThrowdownRankingsSetCollection,
ThrowdownRankingsModelView,
ThrowdownRankingsPageView:true
*/
ThrowdownRankingsPageView = PageView.extend({
    initialize:function(opts){
        var thisView = this;

        // this._chosenSet = null,
        this.showRankings = opts.showRankings ? opts.showRankings : null;

        //set the appname (getTpl() method uses this)
        this.appName = 'rankings';

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);

        //create handy references to our important DOM bits
        this.$setSelect = this.$el.find('#rankingsSetSelect');
        this.$boardSelect = this.$el.find('#promotionSelect');
        this.$board = this.$el.find('.selectedRankingsView');

        // create the rankings data model
        this.model = new ThrowdownRankingsSetCollection();

        // retrieve the rankings data
        this.model.loadData(this.routedSet ? this.routedSet : 'active', this.routedBoard ? this.routedBoard : null );

        // listen to the completion of the data load
        this.model.on('loadDataFinished',function(){
            if( thisView.showRankings ) {
                thisView.model.setChosenSetById( this.model.getSetIdByBoardId(thisView.showRankings) );
                thisView.showRankings = null;
            }

            // render the view
            thisView.render();
            thisView.renderRankings();
        },this);
    },
    events:{
        'change .formRankingsSetSelect select':'lbSetChange',
        'change #promotionSelect':'lbChange'
        // 'change .selectOutput': 'changePromo'
    },
    lbSetChange:function(e) {
        var val = this.$setSelect.val(),
            promotionId = this.$el.find('#promotionSelect').val();
            promoInput = $('<input>').attr({
                             type: 'hidden',
                             id: 'promotionId',
                             name: 'promotionId',
                             value: promotionId
                         });

        $(e.target)
            .closest('form')
            .append(promoInput)
            .submit();

        this.model._chosenSet = this.model.getSetById(val);

        this.renderRankings();
    },
    lbChange:function(e, silent) {
        var val = this.$boardSelect.val();

        $(e.target).closest('form').submit();
        this.model._chosenSet.rankings._chosenBoard = this.model.getBoardById(val);

        if( !silent ) {
            this.router.navigate("set/" + this.model._chosenSet.get('id') + "/" + this.model._chosenSet.rankings._chosenBoard.get('id'));
        }
        // this.changePromo();
        this.renderRankings();
    },
    render:function(){
        var thisView = this;

        this.renderSetSelect();

        if( this.options.userRole == 'participant' ) {
            this.$el.addClass('participant');
        }


    },
    renderRankings:function() {
        this.rankingsView = new ThrowdownRankingsModelView({
            el : this.$board,
            model : this.model._chosenSet.rankings._chosenBoard
        });

        this.$board.empty();

        if( this.model._chosenSet.rankings._chosenBoard ) {
            this.rankingsView.renderRankings(
                this.model._chosenSet.rankings._chosenBoard.get('id'),
                {
                    $target : this.$board
                }
            );
        }
    },
    renderRankingsSelect:function() {
        var thisView = this,
            rankings = this.model._chosenSet.rankings;

        // check to see if any rankings exist and if the data load has not yet been attempted on this set
        if( rankings.length === 0 && !this.model._chosenSet.get('dataloaded') ) {
            console.log('[INFO] ThrowdownRankingsPageView: renderRankingsSelect: rankings empty and no data has been explicitly loaded for the set with id', this.model._chosenSet.get("id"));

            this.$el.find('#controlRankingsSelect').show();

            // retrieve the rankings data
            this.model.loadData(this.model._chosenSet.get('nameId'));

        } else if (rankings.length === 0) {
            this.$board.append( this.model._chosenSet.get('emptyMessage') || this.$el.find('#promotionSelect').data('noRankings') );
            this.$el.find('#controlRankingsSelect').hide();
        }
        else {
            console.log('[INFO] ThrowdownRankingsPageView: renderRankingsSelect: rankings not empty or data has been explicitly loaded for the set with id', this.model._chosenSet.get("id"));

            this.$el.find('#controlRankingsSelect').show();

            thisView.renderSelectField(
                rankings.models,
                thisView.$boardSelect,
                function() {
                    if( rankings._chosenBoard ) {
                        thisView.$boardSelect.val( rankings._chosenBoard.get("id") );
                    }
                    thisView.$boardSelect.change();
                }
            );
        }
    },
    // changePromo: function() {
    //     var thisView = this,
    //        str = "";

    //     str = this.$el.find("#promotionSelect:selected").text();
    //     this.$el.find(".selectOutput").text(str);
    // },
    renderSelectField:function(models, $target, callback) {
        var thisView = this;

        $target.empty();

        // loop through the sets
        _.each(models, function(model) {
            model = model.toJSON();

            // append an option to the select for each set
            $target.append(
                thisView.make('option',
                {
                    value : model.id
                },
                model.name )
            );
        });

        if( callback ) {
            callback();
        }
    },
    renderSetSelect:function() {
        var thisView = this;

        this.renderSelectField(
            this.model.models,
            this.$setSelect,
            function() {
                thisView.$setSelect.val( thisView.model._chosenSet.get("id") );
            }
        );
    }
});
