/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
QuizModel:true
*/
QuizModel = Backbone.Model.extend({

    defaults: {
        status: 'incomplete', // active, incomplete, pending

        name: null,
        startDate: null,
        endDate: null,
        introText: null,

        passingScore: 0,
        allowedAttempts: 0,
        isAttemptsLimit: true,
        isRandomQuestionOrder: false,

        badges: [], // each req at least id, name, imgUrl
        badgeId: null,

        certificates: [], // each req at least id, name, imgUrl
        certificateId: null,

        isNotifyParticipants: true,
        notifyText: null
    },

    initialize: function(opts) {
        this.newMaterialIDIncrementer = 0;
        this.newQuestionIDIncrementer = 0;
        this.newAnswerIDIncrementer = 0;

        // interactive Backbone.Collections on the model
        // non-interactive arrays can be left alone (availableCerts, availableBadges)
        this.participants = new Backbone.Collection(this.get('participants')||[]);
        this.materials = new Backbone.Collection(this.get('materials')||[]);
        this.questions = new Backbone.Collection(this.get('questions')||[]);

        // get sorting going
        this.participants.comparator = function(participant) {
            return [participant.get('lastName'), participant.get('firstName')];
        };
        this.materials.comparator = function(material) {
            return material.get('pageNumber');
        };
        this.questions.comparator = function(question) {
            return question.get('number');
        };
        this.participants.sort();
        this.materials.sort();
        this.questions.sort();

        // clear out these simple arrays so we make sure everyone uses the above Collections
        // all access and listening should be done through quizModel.<collection name>
        this.unset('participants', {silent:true});
        this.unset('materials', {silent:true});
        this.unset('questions', {silent:true});

        // create a new item and make it active (initial state)
        this.initMaterial();

        // create a new question and make it active (initial state)
        this.initQuestion();

        // make sure ids are strings
        this.initCertsBadges();

        // if this object starts out with an id and quiz name, assume this is a valid quizName (no check required)
        this.doesQuizNameCheckOut = this.get('id')||false;
    },


    // toJSON (extending Backbone.Model function)
    toJSON: function() {
        var json = this.constructor.__super__.toJSON.apply(this, arguments);
        json.participants = this.participants.toJSON();
        json.materials = _.where(this.materials.toJSON(),{isNew:false});
        json.questions = _.where(this.questions.toJSON(),{isNew:false});
        return json;
    },
    serializeForStruts: function(opts) {
        var dat = this.toJSON(), rem = null;

        // for struts
        //dat.method = dat.id ? 'save' : 'saveDraft';
        dat.method = opts.isDraft ? 'saveDraft' : 'save';

        // this gives a query string 
        dat = $.param(dat);

        // this replaces the arrayName[0][subArrayName][0][keyName] notation with:
        // arrayName[0].subArrayName[0].keyName
        while(rem = dat.match(/(\?|&).*?%5B([a-zA-Z_]+)%5D.*?=/)) {
            dat = dat.replace('%5B'+rem[2]+'%5D','.'+rem[2]);
        }

        return dat;
    },

    // override Backbone.Model.save()
    save: function(isDraft) {
        var that = this,
            data = this.serializeForStruts({isDraft:isDraft}),
            url = G5.props.URL_JSON_QUIZ_EDIT_SAVE,
            request;


        this.trigger('saveStarted');

        // otherwise, continue with the ajax submit
        request = $.ajax({
            url : url,
            type : 'post',
            data : data,
            dataType : 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR) {
            var err = serverResp.getFirstError(),
                srQuiz = serverResp.data.quiz;
            if(err) {
                console.error('[ERROR] QuizModel: server error', err);
                that.trigger('saveError',serverResp.getErrors());
            } else {
                if(srQuiz&&srQuiz.id) {
                    that.set('id', srQuiz.id);
                }
                that.trigger('saveSuccess',serverResp.data);
            }
        });

        request.fail(function(jqXHR, textStatus, errorThrown) {
            console.error('[ERROR] QuizModel: ajax call to save failed', jqXHR, textStatus, errorThrown);
        });

        request.always(function(x, textStatus, y) {
            that.trigger('saveEnded');
        });
    },

    checkQuizName: function(name) {
        var that = this,
            url = G5.props.URL_JSON_QUIZ_CHECK_NAME,
            request;

        this.trigger('start:checkName');

        // otherwise, continue with the ajax submit
        request = $.ajax({
            url : url,
            type : 'post',
            data : {quizName: name, quizId: this.get('id')},
            dataType : 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR) {
            var err = serverResp.getFirstError();
            if(err) {
                that.doesQuizNameCheckOut = false;
                that.trigger('error:checkName', err.text);
            } else {
                that.doesQuizNameCheckOut = true;
                that.trigger('success:checkName');
            }
        });

        request.fail(function(jqXHR, textStatus, errorThrown) {
            console.error('[ERROR] QuizModel: ajax call to check quiz name ['+name+']', jqXHR, textStatus, errorThrown);
        });

        request.always(function(x, textStatus, y) {
            that.trigger('end:checkName');
        });

    },

    initCertsBadges: function() {
        if(this.get('badgeId')) {
            this.set('badgeId',this.get('badgeId')+""); // STRING
        }
        if(this.get('badges')) {
            _.each(this.get('badges'), function(x) {
                x.id = x.id+"";
            });
        }

        if(this.get('certificateId')) {
            this.set('certificateId',this.get('certificateId')+""); // STRING
        }
        if(this.get('certificates')) {
            _.each(this.get('certificates'), function(x) {
                x.id = x.id+"";
            });
        }
    },


    // AJAX update of 'participants' via AJAX (to be called when owner changes)
    loadTeamMembersForOwner: function() {
        var that = this,
            owner = this.get('createAsParticipant'),
            url = G5.props.URL_JSON_QUIZ_TEAM_MEMBERS,
            request;

        if(!owner) { 
            this.participants.reset(); // reset anyways?
            return; 
        }

        this.trigger('start:loadTeamMembers');

        // otherwise, continue with the ajax submit
        request = $.ajax({
            url : url,
            type : 'post',
            data : {participantId: owner.id},
            dataType : 'g5json'
        });

        request.done(function(serverResp, textStatus, jqXHR) {
            var err = serverResp.getFirstError(),
                partis = serverResp.data.participants;
            if(err) {
                console.error('[ERROR] QuizModel: server error', err);
            } else {
                if(partis) {
                    that.participants.reset(partis);
                }
                that.trigger('success:loadTeamMembers');
            }
        });

        request.fail(function(jqXHR, textStatus, errorThrown) {
            console.error('[ERROR] QuizModel: ajax call to get participants (team members)', jqXHR, textStatus, errorThrown);
        });

        request.always(function(x, textStatus, y) {
            that.trigger('end:loadTeamMembers');
        });

    },

    // BADGES
    setBadgeId: function(id) {
        id = ""+id; // string type ids
        this.set('badgeId',id);
        this.trigger('badgeIdChanged',id);
    },
    getBadgeById: function(id) {
        id = ""+id; // string type ids
        var badges = this.get('badges'),
            theBadge = _.where(badges,{id:id});

        theBadge = theBadge.length ? theBadge[0] : null;

        return theBadge;
    },


    // CERTIFICATES
    setCertificateId: function(id) {
        id = ""+id; // string type ids
        this.set('certificateId',id);
        this.trigger('certificateIdChanged',id);
    },
    getCertificateById: function(id) {
        id = ""+id; // string type ids
        var certificates = this.get('certificates'),
            theCertificate = _.where(certificates,{id:id});

        theCertificate = theCertificate.length ? theCertificate[0] : null;

        return theCertificate;
    },



    /*  ***********************************
            MATERIALS
        *********************************** */
    initMaterial: function() {
        this.createNewMaterial();
        // every time the isEditing attribute changes, do some upkeep
        this.materials.on('change:isEditing', function(o){
            if(o.get('isEditing') && !o.get('isNew')){ // not in list
                // update original state, because there might be new changes that get canceled
                o._uneditedJSON = $.extend(true, {}, o.toJSON());
            }
        },this);
    },
    // if material has unedited version of itself, revert data
    revertMaterialById: function(id) {
        var mat = this.materials.get(id);
        if(mat._uneditedJSON) { // has pre-edit data?
            mat.set(mat._uneditedJSON, {silent:true}); // set to old values
            // no trigger for this since it always happens with an update
        }
    },
    createNewMaterial: function() {
        if( this.materials.where( {isNew:true} ).length > 0 ) { return; }// alread have a new material item
        var isActiveVal = false;
        if( this.get('quizStatus') == "active") { isActiveVal = true; }
        var newMat = new Backbone.Model({
            id: 'addedMaterial'+this.newMaterialIDIncrementer,
            // item is in the 'new' dom element, not in the 'list' of materials
            isNew: true, 
            // its not saved to the server
            isSaved: false, 
            // is this item is not currently being edited
            isEditing: false,

            isActive: isActiveVal,
            // next avail page number
            pageNumber: this.materials.length+1,
            // empty array of files {id,name,url,originalFilename}
            files: [] 
        });
        this.newMaterialIDIncrementer++;
        this.materials.add(newMat, {silent:true});
        return newMat;
    },
    saveMaterialById: function(id, changedVals) {
        var mat = this.materials.get(id);
        changedVals.isNew = false;
        mat.set(changedVals);
        this.createNewMaterial(); // presumably we need a new material item
        this.trigger('materialSaved',mat);
    },
    updateMaterialById: function(id, changedVals) {
        var mat = this.materials.get(id);
        mat.set(changedVals);
        this.trigger('materialUpdated',mat);
    },
    removeMaterialById: function(id) {
        var mat = this.materials.get(id);
        this.materials.remove(mat);
        this.updateMaterialsPageNumbers();
        this.trigger('materialRemoved',mat);
    },
    updateMaterialsPageNumbers: function() {
        this.materials.forEach(function(m,i){
            m.set('pageNumber',i+1,{silent:true});
        });
    },
    addFileToMaterial: function(fileObj, mat) {

        if(mat.get('type')==='image'){ // always a single file
            mat.set('files',[fileObj]);
        } else { // multiple files (pdf)
            mat.get('files').push(fileObj);
        }

        this.trigger('materialFileAdded', mat, fileObj);
    },
    removeFileFromMaterial: function(fileId, mat) {
        var files = mat.get('files'),
            toRemIndex = -1,
            removedFileObj = null;
        // find the index of the file obj to remove
        _.each(files, function(f,i){
            if(f.id===fileId) { toRemIndex = i; }
        });
        // delete that item from the array
        if(toRemIndex>-1){
           files = files.splice(toRemIndex,1); 
        }
        this.trigger('materialFileRemoved', mat, removedFileObj);
    },
    setMaterialPageNumberById: function(id, pageNum) {
        var mat = this.materials.get(id);
        mat.set('pageNumber',pageNum,{silent:true});
        this.materials.sort();// update order
    },
    setFileNameOnMaterial: function(fileId, val, mat) {
        var files = mat.get('files'),
            theFile = _.where(files,{id:fileId});

        theFile = theFile.length ? theFile[0] : null;

        if(theFile) {
            theFile.name = val;
        }
        this.trigger('materialFileNameChange', mat, theFile);
    },









    /*  ***********************************
            QUESTIONS
        *********************************** */
    getNumberOfQuestions: function() {
        return this.questions.where({isNew:false}).length;
    },
    initQuestion: function() {
        this.createNewQuestion();
        // every time the isEditing attribute changes, do some upkeep
        this.questions.on('change:isEditing', function(o){
            // now looking at both new and listed items for this (locking down new items as well)
            if(o.get('isEditing') /*&& !o.get('isNew')*/){
                // update original state, because there might be new changes that get canceled
                o._uneditedJSON = $.extend(true, {}, o.toJSON());
            }
        },this);
    },
    // if question has unedited version of itself, revert data
    revertQuestionById: function(id) {
        var q = this.questions.get(id);
        if(q._uneditedJSON) { // has pre-edit data?
            q.set(q._uneditedJSON, {silent:true}); // set to old values
            // no trigger for this since it always happens with an update
        }
    },
    setQuizType: function() {
        var self = this;
        if( this.get('quizStatus') == "active") {
            // if Questions are saved to server, check to see the quiz type
            self.questions.invoke( 'set', {"isActive": true});
            self.materials.invoke( 'set', {"isActive": true});
        } else {
            self.questions.invoke( 'set', {"isActive": false});
            self.materials.invoke( 'set', {"isActive": false});
        }
    },
    createNewQuestion: function() {
        if( this.questions.where( {isNew:true} ).length > 0 ) { return; }// already have a new question item
        var isActiveVal = "false";
        if( this.get('quizStatus') == "active") { isActiveVal = "true"; }
        var newQ = new Backbone.Model({
                id: 'addedQuestion'+this.newQuestionIDIncrementer,
                // item is in the 'new' dom element, not in the 'list' of questions
                isNew: true, 
                // its not saved to the server
                isSaved: false, 
                // is this item currently being edited
                isEditing: false,
                isActive: isActiveVal,
                // next avail page number
                number: this.questions.length+1,
                // answers (start with two)
                answers: [] 
            });
        
        // default to 4 answers
        this.addNewAnswerToQuestion(newQ);
        this.addNewAnswerToQuestion(newQ);
        this.addNewAnswerToQuestion(newQ);
        this.addNewAnswerToQuestion(newQ);

        this.newQuestionIDIncrementer += 1;
        this.questions.add(newQ, {silent:true});
        
        return newQ;
    },
    addNewAnswerToQuestion: function(q) {
        var answers = q.get('answers'),
            a = {
                number: answers.length+1,
                id: 'addedAnswer'+this.newAnswerIDIncrementer,
                text: '',
                isCorrect: false
            };

        this.newAnswerIDIncrementer+=1;

        answers.push(a);

        return a;
    },
    saveQuestionById: function(id, changedVals) {
        var q = this.questions.get(id);
        changedVals.isNew = false; // this indicates this item is 'saved'
        q.set(changedVals);
        this.createNewQuestion(); // presumably we need a new question item
        this.trigger('questionSaved',q);
        this.trigger('createdNewQ', this.getNumberOfQuestions());
    },
    updateQuestionById: function(id, changedVals) {
        var q = this.questions.get(id);
        q.set(changedVals);
        this.trigger('questionUpdated',q);
    },
    removeQuestionById: function(id) {
        var q = this.questions.get(id);
        this.questions.remove(q);
        this.updateQuestionNumbers();
        this.trigger('questionRemoved',q);
    },
    updateQuestionNumbers: function() {
        this.questions.forEach(function(m,i){
            m.set('number',i+1,{silent:true});
        });
    },
    addAnswerToQuestion: function(q) {
        this.addNewAnswerToQuestion(q);
        this.trigger('questionAnswerAdded', q);
    },
    removeAnswerFromQuestion: function(ansId, q) {
        console.log('removeAnswerFromQuestion: ', "|| AnswerId: ", ansId, " ||| Question: ", q);
        var answers = q.get('answers'),
            toRemIndex = -1,
            removedAnsObj = null;

        // find the index of the file obj to remove
        _.each(answers, function(a,i){
            if(a.id===ansId) { toRemIndex = i; }
        });
        // delete that item from the array
        if(toRemIndex>-1){
           answers = answers.splice(toRemIndex,1); 
        }
        // update the numbers of other answers
        this.updateAnswerNumbersForQuestion(q);
        this.trigger('questionAnswerRemoved', q, removedAnsObj);
    },
    updateAnswerNumbersForQuestion: function(q) {
        var answers = q.get('answers');
        _.each(answers, function(a,i){
            a.number = i+1;
        });
    },
    setQuestionNumberById: function(id, pageNum) {
        var q = this.questions.get(id);
        q.set('number',pageNum,{silent:true});
        this.questions.sort();// update order
    },
    setAnswerOnQuestion: function(ansId, val, q) {
        var answers = q.get('answers'),
            theAnswer = _.where(answers,{id:ansId});

        theAnswer = theAnswer.length ? theAnswer[0] : null;

        if(theAnswer) {
            theAnswer.text = val;
        }
        this.trigger('questionAnswerChanged', q, theAnswer);
    },
    setCorrectAnswerOnQuestion: function(ansId, q) {
        var answers = q.get('answers'),
            theAnswer = _.where(answers,{id:ansId});

        theAnswer = theAnswer.length ? theAnswer[0] : null;

        if(theAnswer) {

            // clear all correct
            _.each(answers, function(a){ a.isCorrect = false; });

            // set new correct
            theAnswer.isCorrect = true;
        }

        this.trigger('questionAnswerChanged', q, theAnswer);
    },
    emptyAnswerCheck: function(){
        var self = this,
            allQuestions = self.questions.models,
            i,
            answers;

        _.each(allQuestions, function(model){ //Get all questions
            answers = model.get("answers"); //Get answers to questions
            for(i = 0; i < answers.length; i++){
                if(_.isEmpty(answers[i].text) && answers.length > 2){ //Get answers with no answer but make sure we leave 2 behind
                    self.removeAnswerFromQuestion(answers[i].id, model); //Send them to the burninator.
                    i = i-1; //deincrement i by the number of removed questions so we do not miss any answers.
                }
            }
        });
        return "[Info] Empty Answers removed";
    }
});