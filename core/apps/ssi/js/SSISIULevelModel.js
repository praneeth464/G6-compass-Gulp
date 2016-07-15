/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
G5,
SSIContestModel,
SSISIULevelModel:true
*/
SSISIULevelModel = Backbone.Model.extend({

    defaults: {
        "sequenceNumber": null, // 0 indexed
        "amount": null,
        "payout": null,
        "payoutDescription": null, // type=other
        "badgeId": null
    },

    initialize: function(opts) {
        this.url = G5.props.URL_JSON_CONTEST_PAYOUT_SIU_LEVEL;
        this.contMod = SSIContestModel.prototype.instance; // sort of a singleton type thing

        this.contMod.on('change:payoutType', this.handlePayoutTypeChange, this);
    },

    setIsActiveNew: function(ian, levelNum) {
        if(ian) {
            this.set('_isActiveNew', true);
            this.set('_levelNum', levelNum);
        } else {
            this.unset('_isActiveNew');
            this.unset('_levelNum');
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

    setMeasureType: function(mt) {
        // clear amount field since it no longer makes sense
        this.set('amount', null);
    },

    handlePayoutTypeChange: function() {
        var pt = this.contMod.get('payoutType');
        if(pt == 'other') {
            this.unset('payoutDescription');
        }
    },

    isAmountValid: function() {
        var //len = this.collection.length,
            //first = this.collection.at(0),
            //second = this.collection.at(1),
            //third = this.collection.at(2),
            prev = this.getPrev(),
            next = this.getNext();
            //ordAsc;
        /*
            OLD LOGIC - inferred if user was doing asc OR desc ordering
            But it was decided desc was too complicated to describe in
            certain scenarios, so now it is only ascending in value.
            * keeping it here in case it comes back,
              also it was a challenge to come up with this logic
            ** this is probably just code-hoarding, feel free to delete
               after enough time has passed for the grieving process
                        - June 9th of the 2015th year of our Common Era
        // CASE: first two adds
        if(len < 3) {
            // if first two, and they are equal, booo
            if(first && second && first.getAmount() === second.getAmount()) {
                return false;
            }
            return true;
        }

        // CASE: has at least two, discover if ordering is asc or desc
        ordAsc = first.getAmount() < second.getAmount();

        // CASE: ordering has changed (must be editing first level)
        if( first.get('id') === this.get('id') &&
            third &&
            ( (second.getAmount() < third.getAmount()) !== ordAsc) ) {
            // order has changed because first payout amount has been changed
            // remove all level payouts after first two
            this.collection.each( function(lev) {
                if(lev.get('id') !== first.get('id') && lev.get('id') !== second.get('id') ) {
                    lev.set('amount','');
                    lev.trigger('amountRemovedByOrderChange'); // UI will listen and refill its goodies
                }
            }.bind(this));
            return true; // mic drop
        }

        // CASE: equal to prev or next level
        if(prev && this.getAmount() === prev.getAmount()) { return false; }
        if(next && this.getAmount() === next.getAmount()) { return false; }

        // CASE: out of order
        if(ordAsc && prev && this.getAmount() < prev.getAmount()) { return false; }
        if(ordAsc && next && this.getAmount() > next.getAmount()) { return false; }
        if(!ordAsc && prev && this.getAmount() > prev.getAmount()) { return false; }
        if(!ordAsc && next && this.getAmount() < next.getAmount()) { return false; }
        */

        // CASE: less than or equal to previous lev
        if(prev && prev.getAmount() && this.getAmount() <= prev.getAmount()) { return false; }

        // CASE: greater than or equal to next lev
        if(next && next.getAmount() && this.getAmount() >= next.getAmount()) { return false; }

        // CASE: you survived, live long and bear bountiful fruitz
        return true;
    },

    isPayoutValid: function() {
        var prev = this.getPrev(),
            next = this.getNext();

        // CASE: less than or equal to previous lev
        if(prev && prev.getPayout() && this.getPayout() <= prev.getPayout()) { return false; }

        // CASE: greater than or equal to next lev
        if(next && next.getPayout() && this.getPayout() >= next.getPayout()) { return false; }

        return true;
    },

    getPrev: function() {
        if(this.isActiveNew()) { // if new, return last el
            return this.collection.length ?
                this.collection.at(this.collection.length-1) : null;
        }
        return this.collection.where({sequenceNumber: this.getSequenceNumber()-1})[0];
    },

    getNext: function() {
        // its new, so nothing after it
        if(this.isActiveNew()) { return null; }
        // its the last level item in edit mode, nothing after
        if(this.get('id') === this.collection.at(this.collection.length-1)) { return null; }

        return this.collection.where({sequenceNumber: this.getSequenceNumber()+1})[0];
    },

    getSequenceNumber: function() {
        return parseInt(this.get('sequenceNumber'),10);
    },

    getAmount: function() {
        return parseFloat(this.get('amount'));
    },

    getPayout: function() {
        return parseFloat(this.get('payout'));
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
            dat = {method: type, level: json},
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
                if(srvRes.data&&srvRes.data.level&&srvRes.data.level.id) {
                    that.set('id', srvRes.data.level.id);
                }
                that.trigger('success:'+type, srvRes.data);
            }
        });

        req.always( function() {
            that.trigger('end:'+type);
        });

        req.fail(function(jqXHR, textStatus, err){
            var errors;
            console.error('[ERROR] SSISIULevelModel: ajax sync fail ['+type+']', jqXHR, textStatus, err);
            // struts returns full HTML for FORM VALIDATION - BOOO!
            if(textStatus=='parsererror') {
                errors = G5.util.parseErrorsFromStrutsFormErrorHtml(jqXHR.responseText);
                if(errors) {
                    that.contMod.trigger('error:genericAjax', errors);
                }
            }
        });
    }
});
