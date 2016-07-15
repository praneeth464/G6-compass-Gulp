/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
ParticipantSearchModel:true
*/

//ParticipantSearchModel
ParticipantSearchModel = Backbone.Model.extend({

    initialize:function(opts){
        var that = this;

        this.filters = {};//filters
        this.participants = opts.participantsCollection||new Backbone.Collection();
        this.params = opts.extraParams||{};
        this.sortColDefault = 'lastName';
        this.sortCol = this.sortColDefault;
        this.sortAsc = false;
        this.filterPresets = opts.filterPresets||null;
        this.allowSelectAll = opts.allowSelectAll||false;

        //expect JSON urls in the options
        this.autocompUrl = opts.autocompUrl;
        this.searchUrl = opts.searchUrl;

        //optional JSON urls for select/deselect and receptacle remove
        this.selectUrl = opts.selectUrl; //select search parti/add to receptacle
        this.deselectUrl = opts.deselectUrl;//deselect search parti/remove from receptacle

        //sync select collection -- external data to sync up isSelected by id
        this.participantsToSync = opts.participantsToSync||null;

        //receptacle for selected participants (a collection of participants)
        this.participantReceptacle = opts.participantCollection||null;
        //listen for receptacle participant remove
        if(this.participantReceptacle){
            this.participantReceptacle.on('remove',this.receptacleParticipantRemoved,this);
        }

        //collection sort stuff
        this.participants.comparator = function(a,b){//for sorting
            var comp,
                aComp = a.get(that.sortCol),
                bComp = b.get(that.sortCol);

            // if lastName, append firstName to break matching names
            if(that.sortCol==='lastName'){
                aComp = aComp+a.get('firstName');
                bComp = bComp+b.get('firstName');
            }
            // if firstName, append lastName to break matching names
            if(that.sortCol==='firstName'){
                aComp = aComp+a.get('lastName');
                bComp = bComp+b.get('lastName');
            }

            // compare
            comp = aComp > bComp ? 1:-1;

            // ascending/descending
            comp = that.sortAsc?comp:-comp;

            return comp;
        };
    },

    // get and set all in one (mutator)
    ajaxParam: function(name, value){
        if(name&&value) { //set
            this.params[name] = value;
            return value;
        } else if(name) { //get single
            return this.params[name];
        }
        //get all
        return this.params;
    },

    setSort: function(param, isAsc){
        this.sortCol = param;
        this.sortAsc = isAsc?true:false;
        this.participants.sort();
        this.trigger('participantsChanged');
    },

    addFilter: function(filter){
        this.filters[filter.type] = filter;
        this.loadParticipants();
        this.trigger('filterChanged');
    },

    setFilterPresets: function(presets) {
        this.filterPresets = presets;
        this.trigger('filterPresetsChanged',this.filterPresets);
    },

    removeFilter: function(filterType){
        delete this.filters[filterType];
        this.loadParticipants();
        this.trigger('filterChanged');
    },

    removeAllFilters: function(){
        this.filters = {}; // obliterate!
        this.loadParticipants();
        this.trigger('filterChanged');
    },

    getFilters: function(){
        return this.filters;
    },

    hasFilters: function(){
        return _.size(this.filters) !== 0;
    },

    getParticipants: function(){
        return this.participants;
    },

    getFilterPresets: function(){
        return this.filterPresets;
    },

    selectAllParticipants: function() {
        this.participants.forEach(function(p){p.set('isSelected',true);});
        if(this.participantReceptacle) {
            this.participantReceptacle.add(this.participants.toJSON());
        }
        this.trigger('allParticipantsSelected');
    },

    setAllowSelectAll: function(allow) {
        this.allowSelectAll = allow&&allow!='false';
        this.trigger('allowSelectAllChanged',this.allowSelectAll);
    },
    getAllowSelectAll: function() { return this.allowSelectAll; },

    //this calls the inner logic of the function, after
    // optional JSON request
    selectParticipant: function(pid, deselectOthers){
        var that = this;
        //send request and wait for no errors before updating
        if(this.selectUrl) {
            $.ajax({
                dataType:'g5json',//must set this so SeverResponse can parse and return to success()
                type: "POST",
                url: this.selectUrl,
                data: {participantId:pid},
                success:function(serverResp){
                    //regular .ajax json object response
                    var data = serverResp.data,
                        msg = serverResp.getFirstError(),
                        pax = that.participants.get(pid); // get the full participant data model from the collection

                    if(msg){
                        //failed - revert changes if necessary
                        that.trigger('selectParticipantError', pid, msg);
                    }else{
                        //success

                        // if the ID of the returned data matches the PID that we requested
                        if( data.participant && parseInt(data.participant.id, 10) == pid ) {
                            // set the new attributes on the pax model (quietly)
                            // this allows us to send additional data about a pax upon selection
                            // useful when clients have extended data attributes that are costly to pull from the DB as part of the search results
                            pax.set(data.participant, {silent:true});
                        }

                        that.selectParticipantInner(pid, deselectOthers);
                    }
                }
            });
        } else {
            //go ahead and do the select work
            this.selectParticipantInner(pid, deselectOthers);
        }
    },

    //inner logic
    selectParticipantInner: function(pid, deselectOthers, opts){
        var parti = this.participants.get(pid),
            toDeselect,
            that = this;
        opts = opts||{};

        if(deselectOthers){
            toDeselect = this.participants.where({isSelected:true});
            _.each(toDeselect,function(pModel){
                that.deselectParticipant(pModel.get('id'));
            });
        }

        parti.set('isSelected', true);

        //update the participant receptacle collection
        if(this.participantReceptacle){
            if(deselectOthers) { //oh, this must be single mode
                this.participantReceptacle.reset();
            }
            this.participantReceptacle.add(parti.toJSON());
        }

        if(opts.silent!==true){
            this.trigger('participantSelected', parti.toJSON());
        }
    },

    //this calls the inner logic of the function, after
    // optional JSON request
    deselectParticipant: function(pid, opts){
        var that = this;

        /*
        This is temporarily(?) commented out because it triggers two ajax requests when removing from the search tool.
        There's a separate ajax request down in receptacleParticipantRemoved() that gets triggered when removing from the selected participants collection view.
        Because the two views are decoupled and meant to be able to stand alone, they don't necessarily know what the other one is doing.
        Thus, the search view triggers this request, then the receptacle is listening for the remove and triggers its own.
        To permanently fix this, the views will need to be modified to communicate better to explain that an ajax request has already been sent by one or the other.

        //request this action to server and wait for response
        if(this.deselectUrl){

            $.ajax({
                url: this.deselectUrl,
                dataType: "g5json",
                data: {participantId:pid},
                success: function(serverResp){
                    //regular .ajax json object response
                    var data = serverResp.data,
                        msg = serverResp.getFirstError();

                    if(msg){
                        //failed - revert changes if necessary
                        that.trigger('deselectParticipantError', pid, msg);
                    }else{
                        //success
                        that.deselectParticipantInner(pid, opts);
                    }
                }
            });

        } else {
            //just deselect on the client
            this.deselectParticipantInner(pid, opts);
        }

        This is the end of the really long comment paragraph that starts up before the if().
        Once the noted changes have been made, the following deselectParticipantInner() can be removed.
        */
        this.deselectParticipantInner(pid, opts);

    },

    //inner logic
    deselectParticipantInner: function(pid, opts){
        var parti = this.participants.get(pid);
        opts = opts||{};

        if(parti){
            parti.set('isSelected', false);
        }

        //update the participant receptacle collection
        if(this.participantReceptacle){
            this.participantReceptacle.remove(parti.toJSON());
        }

        if(opts.silent!==true){
            this.trigger('participantDeselected', parti.toJSON());
        }
    },

    //this function sets the isSelect state of participant search result
    // WITHOUT triggering anything except the model change event
    // which updates the view only
    receptacleParticipantRemoved: function(participantModel){
        var toDeselPid = participantModel.get('id'),
            searchPartiToDesel = this.participants.get(toDeselPid);

        //tell server to deselect
        if(this.deselectUrl) {
            $.ajax({
                dataType: 'g5json',
                type: "POST",
                url: this.deselectUrl,
                data: {participantId:toDeselPid},
                success: function(serverResp){
                    //regular .ajax json object response
                    var data = serverResp.data,
                        msg = serverResp.getFirstError();

                    if(msg){
                        //failed - revert changes if necessary
                    }else{
                        if(searchPartiToDesel){
                            searchPartiToDesel.set('isSelected',false);
                        }
                    }
                }
            });

        //no server request necessary
        } else {
            //do stuff straight up w/o server
            if(searchPartiToDesel){
                //change the attribute, triggers an event on the model
                // which the view listens to and updates the visual state accordingly
                searchPartiToDesel.set('isSelected',false);
            }
        }
    },

    //query the server for autocomplete
    queryAutocomplete:function(query, type, typeName, params){
        var that = this,
            filterParams = {};

        //set up filter params
        _.each(this.filters, function(filter){
            filterParams[filter.type] = filter.id;
        });

        this.trigger('startBusy:queryAutocomplete');

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            url: this.autocompUrl,
            type: "POST",
            data: _.extend({query:query,type:type}, filterParams, params, this.params),
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    completions,
                    msg = serverResp.getFirstError();

                //extract the text of the error if there is one
                if(msg){msg = msg.text;}

                //sorting by name, then id. Not sure if this is the best order, but it works well.
                completions = _.sortBy(data.completions, function(r){ return [r.name, r.id]; });

                //add the search type
                _.each(completions, function(comp){
                    comp.type = type;
                    comp.typeName = typeName;
                });

                console.log('[INFO] ParticipantSearchModel - '+completions.length+' autocomplete results received');

                that.trigger('autocompleted', completions, msg);
                that.trigger('endBusy:queryAutocomplete');
            }
        });
    },

    //load participants
    loadParticipants: function(){
        var that = this,
            filterParams = {};

        //set up filter params
        _.each(this.filters, function(filter){
            filterParams[filter.type] = filter.id;
        });

        //reset sort params
        this.sortCol = this.sortColDefault;
        this.sortAsc = true;

        //just empty the model and trigger change if no filters
        // don't bother the server with an unfiltered request
        if(_.size(this.filters)===0){
            this.participants.reset();//empty model
            this.trigger('participantsChanged');
            return;
        }

        this.trigger('startBusy:loadParticipants');

        $.ajax({
            dataType:'g5json',//must set this so SeverResponse can parse and return to success()
            url: this.searchUrl,
            type: "POST",
            data: _.extend({}, filterParams, this.params),
            success:function(serverResp){
                //regular .ajax json object response
                var data = serverResp.data,
                    participants,
                    msg = serverResp.getFirstError();

                //extract the text of the error if there is one
                if(msg){msg = msg.text;}

                // make sure all participant IDs are numeric
                _.each(data.participants, function(p) {
                    p.id = parseInt(p.id, 10);
                });

                that.syncSelectedParticipants(data.participants);

                that.participants.reset(data.participants);

                console.log('[INFO] ParticipantSearchModel - '+that.participants.length+' participants received');

                that.trigger('participantsChanged', msg);
                that.trigger('endBusy:loadParticipants');
            }
        });
    },

    //if a participant from the sync list is in the search results
    //set isSelected=true
    syncSelectedParticipants: function(participants){
        var ids;
        if(this.participantsToSync){
            ids = this.participantsToSync.pluck('id');

            // make sure all IDs are numeric (pluck seems to turn them into strings)
            _.each(ids, function(id, i) {
                ids[i] = parseInt(id, 10);
            });

            _.each(participants, function(p){
                if(_.indexOf(ids,p.id)>-1){
                    p.isSelected = true;
                }
            });

        }
    },

    //get a participant by pid
    getSelectedParticipant: function(pid){
        var parti = this.participants.get(pid),
            isSelected = parti.get('isSelected');

        return isSelected ? parti : false;
    }

});