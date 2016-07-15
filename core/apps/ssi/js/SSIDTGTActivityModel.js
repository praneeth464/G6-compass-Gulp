/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SSIContestModel,
SSIDTGTActivityModel:true
*/
SSIDTGTActivityModel = Backbone.Model.extend({

    defaults: {
        "description": null,
        "forEvery": null,
        "willEarn": null,
        "minQualifier": null,
        "individualPayoutCap": null,
        "maxPayout": null,
        "maxPotential": null,
        "goal": null,

        // count to be set by containing view
        "participantCount": null,
        "estPercent": null,
        "estMaxPayout": null,
        "estMaxPotential": null
    },

    initialize: function(opts) {
        this.url = G5.props.URL_JSON_CONTEST_PAYOUT_DTGT_ACTIVITY;
        this.contMod = SSIContestModel.prototype.instance; // sort of a singleton type thing
    },

    setIsActiveNew: function(ian) {
        if(ian) {
            this.set('_isActiveNew', true);
        } else {
            this.unset('_isActiveNew');
            this.trigger('activeNewOff');
        }
    },

    isActiveNew: function() {
        return this.get('_isActiveNew') ? true : false;
    },

    setPayoutType: function(pt) {
        if(pt==='points') {
            this.set('valueDescription','');
        }
    },

    // override Backbone
    save: function() {
        var type = this.get('id') ? 'update' : 'create';
        this.sync(type);
    },

    // override Backbone
    destroy: function() {
        var type = 'remove';
        this.sync(type);
    },

    // override Backbone
    sync: function(type) {
        var json = this.toJSON(),
            dat = {method: type, activity: json},
            req, // ajax req
            rem, // regex shizzzzo
            that = this;

        // tweet our fans
        this.trigger('start:'+type);

        // add extra fields that BE needs
        dat = this.contMod.addRequiredDataFields(dat);
        dat.measureType = this.contMod.get('measureType');
        dat.payoutType = this.contMod.get('payoutType');

        // this gives a query string
        dat = $.param(dat);

        // this replaces the arrayName[0][subArrayName][0][keyName] notation with:
        // arrayName[0].subArrayName[0].keyName
        while(rem = dat.match(/(\?|&).*?%5B([a-zA-Z_]+)%5D.*?=/)) {
            dat = dat.replace('%5B'+rem[2]+'%5D','.'+rem[2]);
        }

        req = $.ajax({
            url: this.url,
            type: 'post',
            data: dat,
            dataType: 'g5json'
        });

        req.done( function(srvRes, txtStat, jqXHR) {
            var err = srvRes.getFirstError();
            if(err) {
                that.trigger('error:'+type, err.text);
            } else {
                if(srvRes.data&&srvRes.data.activity) {
                    that.set('id', srvRes.data.activity.id);
                }
                that.trigger('success:'+type, srvRes.data);
            }
        });

        req.always( function() {
            that.trigger('end:'+type);
        });
    }
});
