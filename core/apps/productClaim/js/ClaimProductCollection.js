/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Backbone,
TemplateManager,
G5,
ClaimProductModel,
ClaimProductCollection:true
*/
ClaimProductCollection = Backbone.Collection.extend({

    model: ClaimProductModel,

    initialize: function() {
        console.log("[INFO] ClaimProductCollection: ClaimProduct Collection initialized", this);

        var self = this;

        this.on("add", function(model){

            // console.log("--------------  ClaimProductCollection add  --------------");

            // console.log("[INFO] ClaimProductCollection: add event triggered", model);

            // console.log("this.view", this.view, model);

            // process some product data to make sure it gets added properly
            var chars = model.get('characteristics');
            _.each(chars, function(characteristic) {
                if( characteristic.type == "single_select" || characteristic.type == "multi_select" ) {
                    // check to see if the values characteristic matches the format of an array
                    if( characteristic.values && typeof characteristic.values === 'string' && characteristic.values.match(/(^\[.+]$)/) ) {
                        // convert to an actual JS array instead of the string
                        characteristic.values = characteristic.values.replace(/(\[|]|')/g,'').split(',');
                    }
                }
                else if( characteristic.type == "boolean" && characteristic.value && typeof characteristic.value === 'string' && characteristic.value.match(/(^\[.+]$)/) ) {
                    // convert to an actual JS array instead of the string
                    characteristic.value = characteristic.value.replace(/(\[|]|')/g,'').split(',');
                }
            });

            this.renderProductRow(model, function($results) {
                // set attributes directly so they don't appear when using model.toJSON()
                $results.prependTo(self.view.$el.find("#productsTable tbody"));
                G5.util.animBg($results.find('td'),'background-flash');
                self.view.toggleAddProductForm("reset");
            });

            // console.log("-------------- /ClaimProductCollection add  --------------");

        });
    },
    renderProductRow: function( product, callback ) {
        // console.log("[INFO] ClaimProductCollection: renderProductRow Collection initialized. product:", product, callback);

        var self     = this,
            tplName  = 'claimProductRow',
            tplUrl   = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'productClaim/tpl/',
            $el      = null,
            data     = $.extend(true, {}, product.toJSON()); // deep extend to make sure nested objects are copied wholly and not by reference

        data.cid = product.cid;

        /* single_select and multi_select elements present a problem:
         * - for multi_select the characteristics object doesn't contain a "value" field but does contain a "values" field
         * - however, the "values" field is an array of raw <object> value fields, which are useless
         * - similarly, in a single_select, the "value" field is the raw <object> value field, which is useless
         * - therefore, we need to merge in the actual "name" value for each field found in the characteristics.list object
         */
        _.each(data.characteristics, function(characteristic) {
            if( characteristic.type == "single_select" || characteristic.type == "multi_select" ) {
                // we need to iterate over an array, but single_select uses characteristic.value instead of characteristic.values like multi_select
                var iterate = characteristic.value ? [characteristic.value] : characteristic.values;
                // single_select needs to have a characteristic.values array for display purposes
                characteristic.display = [];
                _.each(iterate, function(value, i) {
                    // this assumes that anything in characteristic.list has numerical IDs passed as integers and non-numerical IDs passed as strings
                    // numerical IDs passed as strings in characteristic.list will throw a console error
                    value = typeof value === 'string' ? parseInt(value,10) || value : value;
                    characteristic.display[i] = _.where(characteristic.list, {id: value})[0];
                });
            }
        });

        // console.log("----------------renderProductRow----------------");
        // console.log("data", data);
        // console.log("----------------renderProductRow----------------");

        TemplateManager.get(tplName, function(tpl){
            $el = $(tpl(data));
            product.$el = $el;
            callback($el);
        }, tplUrl);
    },
    /*addProduct: function(){
        // console.log("[INFO] ClaimProductCollection: addProduct triggered");

        var self = this,
            data = this.serializeForm(this.view.$el.find("#claimAddProducts .addProductsForm"));

        this.add(data);
    },*/
    updateProduct: function(cid, obj) {
        // console.log("[INFO] ClaimProductCollection: removeProduct triggered. cid: %s, obj: %o", cid, obj);

        var model  = this.getByCid(cid),
            oldRow = model.$el;

        // console.log("model", model);
        // console.log("oldRow", oldRow);

        model.set(obj);

        this.renderProductRow(model, function($results){
            oldRow.after($results);
            oldRow.remove();
        });
    },
    removeProduct: function(e){
        // console.log("[INFO] ClaimProductCollection: removeProduct triggered. e, ", e);
        var $btn  = $(e.currentTarget),
            id    = $btn.data("row-id"),
            model = this.getByCid(id);

        // remove from the DOM
        model.$el.remove();
        // remove from the model
        this.remove(model);
    }/*,
    serializeForm: function($form) {

        // create empty object
        // loop through standard fields (Quantity, category, and subcategory)
        //   set product name and index
        //   create empty array for custom fields
        //   loop through custom inputs
        //     use index from data to set in the proper order
        //     if checkbox, set to true or false,
        // return original object

        var self             = this,
            serializedData   = {},
            consistentInputs = $form.find(".consistentInputs").find("select, input"),
            customInputs     = $form.find(".customFields").find("select, input");

        _.each(consistentInputs, function(input){

            var $input = $(input);

            if($input.is("select")) {
                $input = $input.find(":selected");
                // serializedData.index = $input.val();
                serializedData.name = $input.text(); // currently grabs the index for some reason

                return;
            }

            serializedData[$input.prop("id")] = $input.val();

        });

        serializedData.formInputs = [];

        _.each(customInputs, function(input){

            var $input    = $(input),
                index     = $input.data("index"),
                inputData = {};

            console.log("---------------- each customInputs ----------------");
            console.log("input", input);
            console.log("index", index);
            console.log("-------------- / each customInputs ----------------");

            serializedData.formInputs[index] = self.view.activeProduct.formInputs[index];

            if ($input.is(":checkbox")) {
                serializedData.formInputs[index].value = $input.is(":checked");
                return;
            }

            serializedData.formInputs[index].value = $input.val();
        });

        return serializedData;
    }*/
});
