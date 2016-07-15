/*jslint browser: true, nomen: true, unparam: true*/
/*global
console,
$,
_,
G5,
PageView,
ManagerToolkitPageRosterEditView:true
*/
ManagerToolkitPageRosterEditView = PageView.extend({

    //override super-class initialize function
    initialize: function(opts) {

        console.log('[INFO] ManagerToolkitPageRosterEditView: Manager Toolkit Page Roster Edit View initialized', this);

        //set the appname (getTpl() method uses this)
        this.appName = "managerToolkit";
        //Path to ID generated from server side
        this.generatedIdUrl = G5.props.URL_JSON_MANAGER_ROSTEREDIT_GENERATE_USERID;
        //Path to Check if ID is duplicate
        this.checkUserIdUrl = G5.props.URL_JSON_MANAGER_ROSTEREDITCHECK_USERID;
        //Path to country location info
        this.locationsUrl = G5.props.URL_JSON_MANAGER_LOCATIONS;

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({},PageView.prototype.events,this.events);


        // datepickers
        this.$el.find('.datepickerTrigger').datepicker();

        // init locations for current country
        this.updateLocations();
        this.isID();
    },

    events: {
        "click .cancelBtn":"doCancel",
        "click .addBtn,.editBtn":"doFormActionButton",
        "change select#country":"updateLocations",
        "click .generateId" : "generateId",
        "blur #userName" : "checkId",
        "change #firstName" : "isID",
        "change #lastName" : "isID"
    },
    generateId: function(e) {
        console.log('in generated');
        var $locs = this.$el.find('#userName'),
            locUrl = this.generatedIdUrl,
            username = $.trim(this.$el.find('#userName').val()),
            firstName = $.trim(this.$el.find('#firstName').val()),
            lastName = $.trim(this.$el.find('#lastName').val()),
            params;

            if (username !==''){
            params = {"userName" : username};
            } else if (firstName !== '' && lastName !== ''){
                params = {"firstName": firstName, "lastName": lastName};
                }
            if (params){
                $.ajax({
                    url : locUrl,
                    type : 'post',
                    data : params,
                    dataType : 'g5json'
                }).done(function(data, textStatus, jqXHR) {
                    //var mess = data.data.messages;
                    console.log("[INFO] LoginPageFirstTimeView: generateId ajax post sucess: ", data.data);
                    $locs.val(data.data.userName);
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] LoginPageFirstTimeView: ", textStatus + ' (' + errorThrown + ') URL:' + locUrl);
                    //guess we can just leave it disabled
                });
            }
    },
    isID : function() {
        if (this.$el.find('#firstName').val() === '' || this.$el.find('#lastName').val() === '') {
            this.$el.find('.generateId').attr("disabled", "disabled");
        }else {this.$el.find('.generateId').removeAttr("disabled"); }
    },

    checkId: function(e) {
        var $locs = this.$el.find('#userName'),
            locUrl = this.checkUserIdUrl,
            username = $.trim(this.$el.find('#userName').val()),
            params,
            $form = $(e.target).closest('form'),
            $trigger = $form.data('trigger') || $form.find("button:submit").filter(":visible");
            if (username !==''){
                console.log("heres the form: ",$form);
            params = {"userName" : username};
                $.ajax({
                    url : locUrl,
                    type : 'post',
                    data : params,
                    dataType : 'g5json'
                }).done(function(data, textStatus, jqXHR) {
                    //var mess = data.data.messages;
                    console.log("[INFO] LoginPageFirstTimeView: generateId ajax post sucess: ", data.data);
                    //$locs.val(data.data.userName);

                    if(data.data.messages.length <= 1) {
                        console.log("data has length");
                        G5.util.formValidateHandleJsonErrors($form, data.data.messages);

                        return false;
                    } else { console.log("data has no length"); }

                }).fail(function(jqXHR, textStatus, errorThrown) {
                    console.log("[ERROR] LoginPageFirstTimeView: ", textStatus + ' (' + errorThrown + ') URL:' + locUrl);
                    //guess we can just leave it disabled
                });
            }
    },

    doCancel: function(e) {
        var $tip = this.$el.find('.questionTip.cancelTip'),
            $tar = $(e.currentTarget);

        e.preventDefault();

        G5.util.questionTip($tar,$tip.clone(),{position:{container:$tar.closest('form')}});
    },

    doFormActionButton: function(e) {
        var $t = $(e.currentTarget),
            a = $t.data('action'),
            $form = this.$el.find('#managerToolkitFormEditParticipant');

        e.preventDefault();

        if(!a) {
            console.error('[ERROR] ManagerToolkitPageRosterEditView: clicked button ['
                +$t.text().trim()+'] did not have req. attr "data-action"');
            return;
        }

        var $validateTargets = this.$el.find(".validateme");

        if(G5.util.formValidate($validateTargets)) {
            $form.attr('action',a).submit();
        }
    },

    updateLocations: function() {
        var thisView = this,
            $locs = this.$el.find('select#state'),
            oldLocVal = $locs.val(),
            $c = this.$el.find('select#country'),
            cVal = $c.val(),
            cKey = $c.attr('name'),
            locUrl = this.locationsUrl,
            params = {},
            enableLocs = function(){$locs.removeAttr('disabled');},
            ajaxReq;

        // if country select is disabled, don't update locs
        if($c.attr('disabled')) {
            return; //exit
        }




        params[cKey] = cVal;

        $locs.empty().append('<option>...</option>').attr('disabled','disabled');

        ajaxReq = $.ajax({
            url : locUrl,
            type : 'get',
            data : params,
            dataType : 'g5json'
        }).done(function(data, textStatus, jqXHR) {
            var mess = data.data.messages,
                locs = data.data.locations;

            $locs.empty();
            enableLocs();

            _.each(locs,function(l){
                $locs.append('<option value="'+l.code+'">'+l.name+'</option>');
            });

            // if there was a selected loc (validation error edit)
            if(oldLocVal) { $locs.val(oldLocVal); }

        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('[ERROR] ManagerToolkitPageRosterEditView: '
                +textStatus+' ('+errorThrown+') URL:'+locUrl);
            //guess we can just leave it disabled
        });

    }



});