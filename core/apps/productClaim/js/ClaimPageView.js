/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
console,
Backbone,
G5,
TemplateManager,
PageView,
ParticipantCollectionView,
ParticipantSearchView,
ClaimProductCollection,
ClaimPageView:true
*/
ClaimPageView = PageView.extend({

    //override super-class initialize function
    events: {

        'change #savetoAddressBook'          : 'savetoAddressBookToggle',
        'click  #confirmChangePromotion'     : 'confirmChangePromotion',
        'click  #viewClaimHistory'           : 'viewClaimHistoryPrompt',
        'click  #changePromotion'            : 'changePromotionPrompt',
        'click  .genericRemoveProduct'       : 'confirmRemoveProduct',
        'click  .removeProduct'              : 'removeProductPrompt',
        'click  #claimCancel'                : 'claimCancelPrompt',
        'change #promotionId'                : 'changePromotion',
        'mouseout #promotionId'              : 'removePromotionPrompt',
        'click  .editProduct'                : 'editProductForm',
        'click  .doViewRules'                : 'showRulesModal',
        'change #productId'                  : 'changeProduct',
        'click  .updateProduct'              : 'updateProduct',
        'keydown #productInformation input'  : 'handleKeydownProductInfo',
        'keydown #productInformation select' : 'handleKeydownProductInfo',
        'click  #addProduct'                 : 'addProduct',
        'click  .datepickerBtn'              : 'datePicker',
        'click  #claimPreview'               : 'submitForm',
        'click  .genericCloseQtip'           : 'closeQtip',
        'change #orgUnit'                    : 'updateSelectedUnit',
        'click .goToLink'                    : 'getPage',
        'click .dialog-option'               : 'getPage',
        'click .participantSearchInput'      : 'setCurrentPromotion' //,
        // 'blur #quantity'                    : 'validateFields'
    },

    initialize: function(opts) {
        console.log('[INFO] ClaimPageView: Claim Page View initialized', this);
        var self = this,
            formData = this.formToJSON($("#dataForm")), // parse form into JSON
            $promo;

        console.log('FormData: ', formData);
        this.appType = $('#claimPagePreviewView').length >= 1 ? 'claimPreview' : 'claim';

        //If Valid Org Units process them.
        if (opts && opts.formSetup && opts.formSetup.nodes) {
            self.orgUnits = opts.formSetup.nodes;
        }

        //set the appname (getTpl() method uses this)
        this.appName = "claim";

        //this is how we call the super-class initialize function (inherit its magic)
        PageView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass
        this.events = _.extend({}, PageView.prototype.events, this.events);


        if (this.appType == 'claim') {
            // set up org units select list
            // console.log("nodes", serverResp.data.formSetup.nodes);
            if (this.usableArray(self.orgUnits)) {
                if (self.orgUnits.length <= 1) {
                    this.$el.find("#orgUnit").closest('.control-group').hide();
                }
                this.makeSelectList(this.$el.find("#orgUnit"), self.orgUnits);
            }

            this.promotions = opts.formSetup.promotions;
            $promo = self.$el.find("#promotionId");

            _.each(opts.formSetup.promotions, function(promo) {
                var opt = self.make('option', {value: promo.id}, promo.name);
                $promo.append(opt);
            });

            /*
             * From Joel: I started to build a JSON method for building the edit page but never finished.
             * This code is commented out until I have had a chance to determine if it should stay and be completed or go away altogether.
             *
            // if an existing claim is loaded in via JSON, we must assume that the page is in edit mode
            if( opts.formSetup.claim ) {
                var theClaim = opts.formSetup.claim;

                // create a formData object if none exists
                formData = formData || {};
                // set the promotionId and nodeId from the claim data
                formData.promotionId = theClaim.promotionId;
                self.setActiveNodeId(parseInt(theClaim.theSelectedNode.id, 10));
                formData.product = theClaim.theSelectedProducts;
            }
             *
             */

            if (!!formData) { // if there is information from the backend

                if (!!formData.promotionId) { // if a promtion is set
                    self.setActivePromotion(parseInt(formData.promotionId, 10));
                }
                if (self.usableArray(formData.claimElement)) {
                    console.log('[Info] Processing claimElements', formData.claimElement);
                    self.initializeCustomFields(formData.claimElement);
                } else {
                    self.initializeCustomFields(formData.claimElement);
                }

                if (self.usableArray(formData.participant)) { // if recipents is set
                    self.initializeParticipantSearch(formData.participant);
                } else {
                    self.initializeParticipantSearch();
                }

                if (self.usableArray(formData.product)) { // if products are set
                    self.initializeProductForm(formData.product);
                } else {
                    self.initializeProductForm();
                }
                if (!!formData.nodeId) {
                    self.setActiveNodeId(parseInt(formData.nodeId, 10));
                }
            } else {
                self.$el.find("#promotionId").show().qtip({
                    content: {
                        text: self.$el.find("#promotionId").data("msg-instructions")
                    },
                    position: {
                        container: self.$el.find("#promoSelectInputWrap"),
                        my: 'left center',
                        at: 'right center',
                        viewport: $('body'),
                        adjust: {method: 'shift none'}
                    },
                    style: {
                        classes: 'ui-tooltip-shadow ui-tooltip-light ui-tooltip-instruction relative-qtip',
                        tip: {
                            width: 20,
                            height: 10
                        }
                    },
                    hide: {
                        event: 'none'
                    },
                    events: { // for narrow screens the tooltip will be disp. below (doesn't update on resize)
                        visible: function(event, api) {
                            var overlap = false,
                                $tar = api.elements.target,
                                $tip = api.elements.tooltip;

                            overlap = $tar.offset().left + $tar.width() - 10 > $tip.offset().left;
                            if (overlap) {
                                api.set({
                                    'position.at': 'bottom center',
                                    'position.my': 'top center'
                                });
                            }
                        }
                    }
                }).qtip("show");

                self.initializeParticipantSearch();
                self.initializeProductForm();
            }
            //set orgUnit
            self.updateSelectedUnit();
            // qtip finder
            $.expr[':'].qtip = $.expr[':'].qtip || function(el) {
                return !!($(el).qtip("api"));
            };
        } else if (this.appType == 'claimPreview') {
            this.$el.find('.table').responsiveTable();
        }
    },

    validateFields: function(event) {
        var validateTar = this.$el.find("#" + event.target.id);
        G5.util.formValidate(validateTar);
    },

    submitForm: function(event) {
        /*
         *
         * Converts JSON and JS objects to a submitable form.
         *
         * [1] Preforms the primary function of `submitForm`.
         *
         *     [1a] Create a holder div to keep the inputs in.
         *
         *     [1b] Helper function to generate the HTML inputs.
         *
         *     [1c] Recursive loop used to dig down into the object and find the end points.
         *
         *     [1d] If the current info can be looped through, call the loop again with the new information
         *
         *          [1d1] If the contents of each item in the array are either an object or an array, we include the brackets/key
         *
         *          [1d2] If the contents of each item in the array are neither an object nor an array, we leave off the brackets/key
         *                This will produce multiple inputs with the same name values and leaves it up to the server to compile those together into a single array
         *
         *     [1e] Add the inputs to the holder div.
         *
         *     [1f] Return just the inputs and not the div wrapper.
         *
         * [2] prevent default submission, enable spinner/disable other actions.
         *
         * [3] front end validate the form. (validateClaimForm), disable spinner if not valid. (removeSpinner)
         *
         * [4] Deep clone form elements.
         *
         * [5] Prepare data for server
         *
         *    [5a] Remove products dropdown from request.
         *
         *    [5b] Set promotionId.
         *
         *    [5c] Remove hidden Custom Sections from request.
         *
         *    [5d] Only look in the visible fieldset in case multiple promotions have the same claim form.
         *
         *    [5e] Set each select value. This copies the .val() from each textarea in the original $form to its match in the clonedForm.
         *
         *    [5f] There is a bug in jQ in which cloned textareas lose their value. This copies the .val() from each textarea in the original $form to its match in the clonedForm.
         *
         *    [5g] Remove any empty inputs that have passed validation.
         *
         *    [5h] Create Product and Participants data for request.
         *
         *    [5i] Add Product and Participants data to request.
         *
         * [6] Send form to handler for submission. (formHandler)
         *
         */

        var self    = this,
            $form   = self.$el.find("form#claimForm"),
            $trigger,
            products,
            participants,
            clonedForm,
            makeInputs   = function(name, info) { // [1]
                var $div = $("<div />"), // [1a]
                    makeInput = function(inputName, inputValue) { // [1b]
                        return $("<input />", {
                            "value" : inputValue,
                            "name"  : inputName,
                            "type"  : "hidden"
                        });
                    },
                    _loop = function(_name, _info) { // [1c]

                        if (_.isArray(_info)) { // [1d]
                            _.each(_info, function(item, key) {
                                if( _.isArray(item) || _.isObject(item) ) { // [1d1]
                                    _loop(_name + "[" + key + "]", item);
                                }
                                else { // [1d2]
                                    _loop(_name, item);
                                }
                            });

                            return;
                        }

                        if (_.isObject(_info)) { // [1d]
                            _.each(_info, function(value, key) {
                                _loop(_name + "." + key, value);
                            });

                            return;
                        }

                        $div.append(makeInput(_name, _info)); // [1e]
                    };

                _loop(name, info);

                return $div.children(); // [1f]
            };

        if (event) { //[2]
            event.preventDefault();
            $trigger = $(event.target);
            $trigger.addClass('disabled').prop('disabled', true).spin();
            $trigger.siblings('.btn').prop('disabled', true);
        }

        if (!this.validateClaimForm()) { //[3]
            self.removeSpinner($trigger);
            return;
        }

        clonedForm = $form.clone(true, true); //[4]

        clonedForm.find("[name= 'productId']:last").remove();//[5a]
        clonedForm.find("[name='promotionId']").val($form.find("[name='promotionId']").val()); //[5b]
        clonedForm.find('.customSection').filter(function() {return $(this).css("display") === "none"; }).remove(); //[5c]
        clonedForm.find("select, textarea").each(function() {
            $(this).val( $form.find('fieldset:visible #'+$(this).attr('id')).val() ); //[5d]
        });//[5e, 5f]
        clonedForm.find("input, select, textarea").filter(function() { return $(this).val() === ""; }).remove(); //[5g]
        products = makeInputs("product", self.products.toJSON()); //[5h]
        participants = makeInputs("participants", self.participantsView.model.toJSON());

        products.appendTo(clonedForm); //[5i]
        participants.appendTo(clonedForm);

        self.formHandler(clonedForm, $form, event); //[6]
    },

    updateProduct: function(event) {
        /*
         * Serializes update form and passes the updated info to the model
         */
        if (event) {
            event.preventDefault();
        }

        if (!this.validateUpdateProductForm()) {
            return;
        }

        var $btn    = $(event.currentTarget),
            cid     = $btn.data("rowId"),
            product = this.products.getByCid(cid).toJSON();

        product = this.updateProductData($btn.parents(".editProductForm"), product);

        console.log("--------------  updateProduct  --------------");
        console.log("this.updateProductData(...)", product);
        console.log("-------------- /updateProduct  --------------");

        this.products.updateProduct(cid, product);
    },

    handleKeydownProductInfo: function(e) {
        if( e && e.keyCode == 13 ) {
            e.preventDefault();
            this.addProduct();
        }
    },

    addProduct: function(event) {
        if (event) {
            event.preventDefault();
        }

        if (!this.validateProductForm()) {
            return;
        }

        var product = this.updateProductData(this.$el.find("#claimAddProducts .addProductsForm"), this.activeProduct);

        this.products.add(product);
    },

    updateProductData: function($form, product) {

        console.log("--------------  updateProductData  --------------");
        console.log("$form", $form);
        console.log("product", product);

        /*
         *
         * Merges a product object with form inputs and their values.
         *
         * [1] Create a copy of the current product and it's characteristics
         *     so data can be added without polluting the activeProduct object.
         *
         *     [1a] Creates clones of the select list settings.
         *
         * [2] Add values from inputs into their characteristic object
         *
         *     [2a] Convert checkbox value to boolean, pass other inputs as default value type.
         *
         * [3] Regex visualization: http://tinyurl.com/lks9l58
         *
         * [4] If the inputs are single / multiple select lists, we need to do some tweaks to the data.
         *
         *     [4a] Reset all the values to being not selected
         *
         *     [4b] Multiple select list values will be an array.
         *
         *     [4c] If there is an id associated with the selected value, set that one to true.
         *
         * [5] The `id` setting clashes with backbone's id and won't allow multiple products
         *     with the same id.
         *
         */


        var self          = this,
            $customInputs = $form.find(".customFields").find("input, select, textarea"),
            qty           = $form.find("#quantity").val(),
            product       = $.extend(true, {}, product), // [1]
            list          = null;

        product.characteristics = _.map(product.characteristics, function(obj) { // [1]

            obj = _.clone(obj);

            if (!_.isUndefined(obj.list)) { // [1a]
                obj.list = _.clone(obj.list);
                obj.list = _.map(obj.list, function(li) {
                    return _.clone(li);
                });
            }

            return obj;
        });

        _.each($customInputs, function(input) { // [2]
            var $input         = $(input),
                id             = $input.data("id"),
                value          = ($input.is(":checkbox")) // [2a]
                                    ? $input.is(":checked")
                                    : $input.val(),
                characteristic = self.getById(product.characteristics, id.toString());

            // console.log("--------------  each loop  --------------");
            // console.log("id", id);
            // console.log("value", value);
            // console.log("product.characteristics", product.characteristics);
            // console.log("characteristic", characteristic);
            // console.log("-------------- /each loop  --------------");

            if ((/^(single|multi)_select$/).test(characteristic.type)) { // [3][4]

                _.each(characteristic.list, function(list) { // [4a]
                    list.value = false;
                });

                if (self.usableArray(value)) { // [4b]
                    _.each(value, function(val) {
                        list = self.getById(characteristic.list, val);
                        if (list) { // [4c]
                            list.value = true;
                        }
                    });
                } else {
                    list = self.getById(characteristic.list, value);
                    if (list) { // [4c]
                        list.value = true;
                    }
                }
            }

            // if the value doesn't exist, we don't set it on the characteristic object
            if(value){
                characteristic[characteristic.type=='multi_select'?'values':'value'] = value;
            }

        });

        product.quantity = qty;

        // console.log("this.activeProduct", this.activeProduct);
        console.log("product", product);
        console.log("-------------- /updateProductData  --------------");

        if (product.id) {
            product.productid = product.id;
            delete product.id; // [5]
        }

        return product;
    },

    setCurrentPromotion: function(e) {
        var self = this;
        self.$el.find('#participantSearchView').data('search-params').promotionId = self.activePromotion.id;
    },

    getById: function(arr, id) {
        /*
         *
         * Improves upon underscore's .where function to accomidate string and integer
         * ids being passed.
         *
         * Sometimes the information being access is:
         *
         * { id: 1 }
         *
         * and sometimes:
         *
         * { id: "1" }
         *
         * This function allows us to be sure we'll get back something regardless.
         *
         */

        var stringId = _.where(arr, { id: id })[0],
            numId    = _.where(arr, { id: parseInt(id, 10) })[0];

        return (!_.isUndefined(stringId))
                ? stringId
                : numId;
    },

    editProductForm: function(event) {
        /*
         *
         * Creates and shows the edit product qtip.
         *
         * [1] We need an event to find the current button / product row.
         *
         */

        if (!event) { // [1]
            return;
        }

        event.preventDefault();

        var self    = this,
            $btn    = $(event.currentTarget),
            $td     = $btn.parents("td"),
            cid     = $btn.data("rowId"),
            model   = this.products.getByCid(cid),
            data    = $.extend(true, {}, model.toJSON()),
            tplName = "claimProductEditQtip",
            tplUrl  = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'productClaim/tpl/';

        data.cid = model.cid;

        /*
         *
         * Update the single/multi select fields for proper display in the qtip fields
         *
         * [1] If the inputs are single / multiple select lists, we need to do some tweaks to the data.
         *
         *     [1a] Reset all the values to being not selected
         *
         *     [1b] Multiple select list values will be an array.
         *
         *     [1c] If there is an id associated with the selected value, set that one to true.
         *
         */
        _.each(data.characteristics, function(characteristic) {
            if ((/^(single|multi)_select$/).test(characteristic.type)) { // [1]
                var iterate = characteristic.values || characteristic.value,
                    list = null;

                iterate = typeof iterate == 'string' ? iterate.replace(/(\[|]|')/g,'').split(',') : iterate;

                _.each(characteristic.list, function(list) { // [1a]
                    list.value = false;
                });

                if (self.usableArray(iterate)) { // [1b]
                    _.each(iterate, function(val) {
                        list = self.getById(characteristic.list, val);
                        if (list) { // [1c]
                            list.value = true;
                        }
                    });
                } else {
                    list = self.getById(characteristic.list, iterate);
                    if (list) { // [1c]
                        list.value = true;
                    }
                }
            }
        });


        // check for quanity lock-downs on the server
        if( this.activePromotion ) {
            // if the user cannot edit the product quantity
            data.readonlyQuantity = this.activePromotion.editProductQuantity === false ? true : false;
        }

        // console.log("--------------  editProductForm  --------------");

        // console.log("model", model);
        // console.log("data", data);

        // console.log("-------------- /editProductForm  --------------");

        if (!$btn.data("templateHasBeenAdded")) { // if the edit form isn't there yet, make it
            TemplateManager.get(tplName, function(tpl) {
                $td.append(tpl(data));

                // self.createCharacteristicsForm($td.find(".customFields"), data.characteristics);
                self.createCharacteristicsForm({
                    "$el":              $td.find(".customFields"),
                    "characteristics":  data.characteristics,
                    "classes": {
                        "label" :       "control-label",
                        "input" :       "controls",
                        "row"   :       "control-group"
                    }
                });

                $btn.qtip({
                    content: $td.find(".editProductForm"),
                    position : {
                        container:  $td.closest('.container-splitter'),
                        viewport:   $('body'),
                        my:         'top right',
                        at:         'center left',
                        adjust: {
                            method: 'shift none',
                            x:      10
                        }
                    },
                    show: {
                        event:  'click',
                        ready:  true
                    },
                    hide: {
                        event:  'none'
                    },
                    style: {
                        tip: {
                            corner: 'bottom right',
                            mimic:  'bottom center',
                            width:  20,
                            height: 10,
                            offset: 10
                        },
                        classes: 'ui-tooltip-shadow ui-tooltip-light edit-qtip'
                    }
                });

                $btn.data("templateHasBeenAdded", true);

            }, tplUrl);
        } else { // if the edit form already exists, just show it
            $btn.qtip("show");
        }
    },

    changeProduct: function(event) {
        /*
         *
         * Templates inputs for product forms
         *
         * [1] Template JSON data
         *
         * [2] Hide / show the product form.
         *
         * [3] If there was no product selected, exit out of this function.
         *
         * [4] Convert the JSON information to HTML.
         *
         */

        var selectedVal   = $(event.currentTarget).val(),
            activeProduct = null;

        this.toggleAddProductForm(); // [2]

        if (!selectedVal) { // [3]
            this.activeProduct = null;
            return;
        }

        activeProduct = this.getById(this.activePromotion.products, selectedVal);

        this.activeProduct = activeProduct;

        this.createCharacteristicsForm({
            "$el": this.$el.find("#claimAddProducts .customFields"),
            "characteristics": activeProduct.characteristics,
            "classes": {
                "input" : "controls promoWrapper",
                "label" : "control-label",
                "row"   : "control-group"
            }
        });
    },

    createCharacteristicsForm: function (settings) {
        /*
         *
         * Converts JSON characteristics array into html inputs
         *
         * [1] Create a copy of the array to avoid polluting the data with templating helpers
         *
         * [2] Set boolean flags for input type.
         *
         * [3] Set the classes object on each characteristics object for the template loop.
         *
         */
        console.log("createCharacteristicsForm: ", settings);

        //If characteristics is empty or undefined define it.
        if (!this.usableArray(settings.characteristics)) {
            settings.characteristics = {};
            console.log('[Info] Characteristics were undefined, we defined them.');
        }

        var self      = this,
            inputsArr = _.map(settings.characteristics, function(obj) {
                var obj = _.clone(obj); // [1]
                self.setTemplateType(obj); // [2]
                obj.classes = settings.classes; // [3]
                return obj;
            }),
            tplName   = "claimFormInputs",
            tplUrl    = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'productClaim/tpl/';

        TemplateManager.get(tplName, function(tpl) {
            // self.$el.find("#claimAddProducts .customFields").html(tpl(inputsArr));
            settings.$el.html(tpl(inputsArr));
        }, tplUrl);
    },

    setTemplateType: function(obj) {
        /*
         * Adds boolean settings to an object for templating.
         */

        var type = obj.type;

        obj.isBoolean          = (type === "boolean");
        obj.isDate             = (type === "date");
        obj.isDecimal          = (type === "decimal");
        obj.isInteger          = (type === "int");
        obj.isMultiSelectList  = (type === "multi_select");
        obj.isSingleSelectList = (type === "single_select");
        obj.isText             = (type === "txt");
    },

    setActiveNodeId: function (id) {
        id = id.toString();
        this.$el.find('#orgUnit').val(id);
        //console.log('setActiveNodeId ', id);
    },

    setActivePromotion: function(id) {
        /*
         *
         * Responsible for setting up and displaying the form according
         * to the information passed.
         *
         * [1] If there is no promotion associated with this ID, exit out of this setup.
         *
         * [2] Set the proper promotion select list to be focused and hide it
         *     so when it's displayed again, it's on the correct value.
         *
         * [3] Set the text to the current promotion title.
         *
         * [4] toggle the View Rules button visibility.
         *
         * [5] toggle the team member search visibility.
         *
         * [6] Hide all custom sections.
         *
         * [7] Show custom sections related to this promotion.
         *
         */

        var self      = this,
            promo     = this.activePromotion = this.getById(this.promotions, id),
            promoNode = this.activePromotion = this.getById(this.promotions, id),
            $selected = null,
            $rules    = self.$el.find(".doViewRules"),
            toShow    = "#claimNav, #promotionInfo, #claimFormSubmit, " +
                        "#claimAddProducts, #addTeamMemberSearch";


        if (_.isUndefined(promo)) { // [1]
            this.$el.find("#promotionId").show();
            console.log("[Info] No promos found.");
            return;
        } // else

        console.log("setActivePromotion called. id: %i, promo: %o", id, promo);

        this.$el.find("#promotionInfo .customFields").empty();
        this.createCharacteristicsForm({
            "$el": this.$el.find("#promotionInfo .customFields"),
            "characteristics": promo.characteristics,
            "classes": {
                "input" : "controls promoWrapper",
                "label" : "control-label",
                "row"   : "control-group"
            }
        });

        this.$el.find(toShow).show();

        $selected = this.$el
                        .find("#promotionId")
                        .hide()
                        .qtip("hide")
                        .find("[value='" + id + "']")
                        .attr("selected", true); // [2]

        this.$el.find("#hiddenRequiredText")
            .show();
        this.$el.find("#selectedPromoText")
            .show()
            .find("#promoTitle")
            .html($selected.text()) // [3]
                .end()
            .find(".doViewRules")
            [(!_.isUndefined(promo.rulesText)) ? "show" : "hide"](); //[4]


        this.$el.find("#addTeamMemberSearch")
            [(!!promo.teamActive) ? "show" : "hide"](); // [5]


        this.$el.find(".customSection").hide(); // [6]

        if (this.usableArray(promo.customSections)) {
            _.each(promo.customSections, function(section) {
                self.$el.find("#" + section).show(); // [7]
            });
        }
        this.makeSelectList(this.$el.find("#productId"), promo.products);
        if (!!self.participantSearchView) {
            self.participantSearchView.model.params.promotionId = promo.id;
            self.$el.find('#participantSearchView').data('search-params').promotionId = promo.id;
            self.participantSearchView.model.params.nodeId = $('#orgUnit option:selected').val();
        }

        if (self.activePromotion && self.activePromotion.rulesText) {
            $rules.show();
        } else {
            $rules.hide();
        }
    },

    resetParticipantSearch: function () {
        var self = this;
        self.participantsView.model.reset();
        self.$el.find('.filterDelBtn ').trigger('click');
        self.$el.find('.selectCell input:checkbox').prop('checked', false);
        self.participantSearchView.model.filters = {};
        self.participantSearchView.model.participants.reset();
    },

    updateSelectedUnit: function () {
        var self = this;
        self.participantSearchView.model.params.nodeId = $('#orgUnit option:selected').val();
    },

    makeSelectList: function($element, productsArr) {
        /*
         * Generates HTML structure in product select list
         */

        if (!this.usableArray(productsArr)) {
            return;
        }

        var defaultOptionClass = $element.data("default-option"),
            $defaultOption     = $element.find("." + defaultOptionClass).clone(),
            templateName       = "selectListTemplate";

        // empty element
        $element.html("")
            .append($defaultOption); // append default item (if any)

        TemplateManager.get(templateName, function(tpl) {
            $element.append(tpl(productsArr));
        }, G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + this.appName + '/tpl/', null, false); // noHandlebars = null, async = false
    },

    changePromotion: function(event) {
        /*
         * Fired when the promotion select list is changed
         */
        // console.log('changePromotion called');
        var self = this,
            $customSections = self.$el.find('.customSection');
        self.setActivePromotion(parseInt($(event.currentTarget).find(":selected").val(), 10));
        $('.globalerrors').remove();

        $customSections.find('input:text, input:password, input:file, select, textarea').val('');
        $customSections.find('input:radio, input:checkbox')
            .removeAttr('checked').removeAttr('selected');

        //Close Team Members section if open.
        this.$el.find('.visibilityControlsLiner a.doShow').trigger('click');


        //reset participants
        this.participantSearchView.participantCollection.reset();

        //reset products
        this.products.reset();

        this.toggleAddProductForm();

        // clear out any validation tooltips leftover
        this.closeQtip();

        //reset current participant model, old remove search model.
        self.resetParticipantSearch();
    },
    removePromotionPrompt: function(e){
        $(e.target).qtip('hide');
    },
    changePromotionPrompt: function(event) {
        /*
         * Creates an "Are you sure you want to change promotions" type qtip.
         */

        if (event) {
            event.preventDefault();
        }

        var self = this,
            btn  = $(event.currentTarget);

        btn.qtip({
            content: self.makeCancelDialog({
                confirmId: "confirmChangePromotion"
            }),
            position : {
                my: 'left center',
                at: 'right center',
                container: btn.parents("#selectedPromoText"),
                viewport: $('body'),
                adjust: {method: 'shift none'}
            },
            show: {
                event: 'click',
                ready: true
            },
            hide: {
                event: 'unfocus',
                fixed: true,
                delay: 200
            },
            style: {
                classes: 'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    width:  20,
                    height: 10
                }
            }
        });
    },

    confirmChangePromotion: function(event) {
        /*
         *
         * Shows the select list used to change promotions.
         *
         */

        if (event) {
            event.preventDefault();
        }

        var self = this,
            btn  = $(event.currentTarget);

        //*UPDATE: we do not need to hide anything here. This should happen on the change event*
        //hide all open section except promo
        //this.$el.find('fieldset').not('#claimSelectPromotion').hide();

        this.$el
            .find("#promotionId")
            .show();
        this.$el
            .find("#hiddenRequiredText")
            .hide();
        this.$el
            .find("#selectedPromoText")
            .hide();

        console.log("reset all the data we've set previously");

        this.$el
            .find("#productId [value='']")
            .attr("selected", true);


        // put away the tooltip
        this.$el.find('#changePromotion').qtip('destroy');
    },

    toggleAddProductForm: function(opts) {
        // console.log("[INFO] ClaimPageView: toggleAddProductForm triggered");
        var $quantity = this.$el.find('#quantity');

        if (opts === "reset") {
            this.$el.find("#productId").find(".defaultOption").attr("selected", true);
        }

        var $selected = this.$el.find("#productId").find(":selected"),
            $info     = this.$el.find("#productInformation");

        if (!!$selected.val()) {
            $info.show();
        } else {
            $info.hide();
            this.$el.find("#productInformation").find("input[type='text']").not('.hiddenValidationInput').val("");
        }

        // check for quanity lock-downs on the server
        if( this.activePromotion ) {
            // if there is a default quantity in the promotion setup, set it to the field's value
            $quantity.val( this.activePromotion.defaultProductQuantity || '' );

            // if the user cannot edit the product quantity (editProductQuantity === false), set the disabled attribute on the field to true. NOTE** Readonly was allowing cursor in grayed out input in IE so it has been changed to disabled.
            $quantity.attr( 'disabled', this.activePromotion.editProductQuantity === false ? true : false );
        }
    },

    toggleProductTable: function() {
        // console.log("[INFO] ClaimPageView: toggleProductTable triggered");

        // because of how products are added, we need to wait a moment before making it responsive. Gross to the nth degree.
        this.$el.find('#productsTable table').responsiveTable({reset: true, duration: G5.props.ANIMATION_DURATION * 6}); // G5.props.ANIMATION_DURATION*6 is the amount of time G5.util.animBg takes to fade out the color background

        this.$el.find("#productsTable")[this.products.length > 0 ? "show" : "hide"]();
    },

    initializeProductForm: function(productsArr) {
        console.log("----------------  initializeProductForm  ----------------");
        console.log('initializeProductForm called', productsArr);

        var self = this;

        // product table collection
        this.products = new ClaimProductCollection();
        this.products.view = this;

        // listeners to show the products table when there are products and hide it when there aren't
        this.products.on("add remove", function(model) {
            self.toggleProductTable();
            self.$el.find('#productCount').val(self.products.length > 0 ? self.products.length : '');
        });
        this.products.on("add", function(model) {
            G5.util.formValidate(self.$el.find('#productCount'));
        });
        // empty table DOM when form is reset
        this.products.on("reset", function(model) {
            // console.log("[INFO] ClaimPageView: this.on('reset') triggered");

            self.$el.find("#productsTable tbody").empty();
            self.toggleProductTable();
            self.products.trigger("remove");
        });

        if (this.usableArray(productsArr)) {
            _.each(productsArr, function(obj) {
                // Force productid to be numeric
                obj.productid = typeof obj.productid === 'string' ? parseInt(obj.productid,10) : obj.productid;

                // store a copy of the product framework from the current promotion
                var baseProd = _.where(self.activePromotion.products, {id:obj.productid})[0];

                // merge the loaded product data into the base product data
                obj = $.extend(true, {}, baseProd, obj);

                // remove the bare ID from the product object because it causes de-duplication (which we allow) in the product collection
                obj = _.omit(obj, "id");

                self.products.add(obj);
            });
        }

        // because of how products are added while the page is building, we need to wait a moment before making it responsive. Gross to the nth degree.
        this.$el.find('#productsTable table').responsiveTable({reset: true, duration: G5.props.ANIMATION_DURATION * 6}); // G5.props.ANIMATION_DURATION*6 is the amount of time G5.util.animBg takes to fade out the color background

        console.log("---------------- /initializeProductForm  ----------------");
    },

    validateClaimForm: function(event) {
        /*
         *
         * Validates the whole claim form to make sure it's ready to be sent.
         *
         * [1] Create single variable to simplify logic readability on below if statement
         *
         *     [1a] Check primary form.
         *
         *     [1b] Check that some products are set.
         *
         *     [1b] Check to see if team members are active on this promotion.
         *
         *     [1b] If team members are active, check to see that they are set.
         *
         *     [1b] Loop through custom forms.
         *
         */
        // console.log("--------------  validateClaimForm  --------------");

        if (event) {
            event.preventDefault();
        }

        var self      = this,
            $validate = this.$el.find("#claimSelectPromotion .validateme"),
            allValid  = true,
            validTest = function() { // [1]
                G5.util.formValidate(this.$el.find('#productCount'));
                G5.util.formValidate(this.$el.find('#teamMembersCount'));

                if (!G5.util.formValidate($validate)) { // [1a]
                    allValid = false;
                }

                if (!!this.products && this.products.length <= 0) { // [1b]
                    allValid = false;
                }
                self.validateProductForm();

                if (!!this.activePromotion && !!this.participantsView) {
                    if (!!this.activePromotion.teamActive // [1c]
                            && this.participantsView.model.length <= 0) { // [1d]
                        allValid = false;
                    }

                    if (this.usableArray(this.activePromotion.customSections)) { // [e]
                        var results = true;
                        _.each(this.activePromotion.customSections, function(section) {
                            var $validate = self.$el.find("#" + section + " .validateme");

                            if (!G5.util.formValidate($validate)) {
                                allValid = false;
                            }

                        });

                        if (!results) {
                            allValid = false;
                        }
                    }
                }

                return allValid;
            };

        if (!validTest.call(this)) {
            return false;
        }

        // console.log("-------------- /validateClaimForm  --------------");

        return true;
    },

    validateProductForm: function(event) {
        /*
         * Checks to see if a product is ready to be submitted. Disables the submit button if it's not.
         */

        if (event) {
            event.preventDefault();
        }

        var $validate = this.$el.find('#claimAddProducts .addProductsForm .validateme').not('.hiddenValidationInput').not(':hidden'),
            $productIdSelect = this.$el.find('#productId'),
            $hiddenValidationInput = this.$el.find('#claimAddProducts span.hiddenValidationInput'),
            $addButton = this.$el.find('#addProduct');

        // if the select has a value, we can assume that the product form is open and we want to move our hidden validation input down by the add button
        if( $productIdSelect.val() ) {
            $hiddenValidationInput.insertAfter($addButton);

            // we can also assume that if the product form is open we should validate it. If it is closed, no need to validate.
            if(!G5.util.formValidate($validate)) {
                return false;
            }
        }
        // if the select does not have a value, we can assume that the product form is closed and our hidden validation input can be moved back up next to the select
        else {
            $hiddenValidationInput.insertAfter($productIdSelect);
        }

        return true;
    },

    validateUpdateProductForm: function(event) {
        /*
         * Checks to see if a product is ready to be updated. Disables the submit button if it's not.
         */

        if (event) {
            event.preventDefault();
        }

        console.log("(validateUpdateProductForm)");

        var $validate = this.$el.find('#productsTable .editProductForm:visible .validateme');

        if (!G5.util.formValidate($validate)) {
            return false;
        }

        return true;
    },

    confirmRemoveProduct: function(event) {
        this.products.removeProduct(event);
    },

    removeProductPrompt: function(event) {
        if (event) {
            event.preventDefault();
        }

        var $btn = $(event.currentTarget);

        $btn.qtip({
            content: $btn.parent().find(".deleteProductQtip"),
            position : {
                container: $btn.parent(),
                my: 'right center',
                at: 'middle left'
            },
            show: {
                event: 'click',
                ready: true
            },
            hide: {
                event: 'unfocus',
                fixed: true,
                delay: 200
            },
            style: {
                classes: 'ui-tooltip-shadow ui-tooltip-light',
                tip: {
                    width: 20,
                    height: 10
                }
            }
        });
    },

    showRulesModal: function(event) {
        /*
         * Creates pop up for promotion rules
         */

        if (event) {
            event.preventDefault();
        }

        var $modal  = $('body').find('#rulesModal'),
            content = this.activePromotion.rulesText || 'ERROR, modal found no rulesText on promo';

        $modal.find('.modal-body').empty().append(content);
        $modal.modal();
    },

    viewClaimHistoryPrompt: function(event) {
        /*
         * Creates qtip for view claim history link
         */

        if (event) {
            event.preventDefault();
        }

        var btn      = $(event.currentTarget),
            settings = {
                position : {
                    container: btn.parents("#claimNav"),
                    my: 'top center',
                    at: 'middle center',
                    viewport: $('body'),
                    adjust: {method: 'shift none'}
                },
                style: {
                    classes: 'ui-tooltip-shadow ui-tooltip-light',
                    tip: {
                        corner: true,
                        width:  20,
                        height: 10
                    }
                }
            };

        this.redirectPrompt(btn, settings);
    },

    claimCancelPrompt: function(event) {
        /*
         * Creates qtip for view claim history link
         */

        if (event) {
            event.preventDefault();
        }

        var btn      = $(event.currentTarget),
            settings = {
                position : {
                    container:  btn.parents("#claimFormSubmit"),
                    my:         'left center',
                    at:         'middle right',
                    viewport:   $('body'),
                    adjust:     {method: 'shift none'}
                },
                style: {
                    classes: 'ui-tooltip-shadow ui-tooltip-light',
                    tip: {
                        corner: true,
                        width:  20,
                        height: 10
                    }
                }
            };

        this.redirectPrompt(btn, settings);
    },

    redirectPrompt: function($btn, settings) {
        /*
         * A more generic cancel qtip creator, since it's mostly the same each time.
         */

        var self     = this,
            presets  = {
                content: self.makeCancelDialog({
                    linkHref: $btn.data("href")
                }),
                position : {
                    container: self.$el,
                    my: 'left center',
                    at: 'middle right'
                },
                show: {
                    event: 'click',
                    ready: true
                },
                hide: {
                    event: 'unfocus',
                    fixed: true,
                    delay: 200
                },
                style: {
                    classes: 'ui-tooltip-shadow ui-tooltip-light'
                }
            },
            settings = _.extend({}, presets, settings);

        $btn.qtip(settings);
    },

    makeCancelDialog : function(settings) {
        /*
         * Helper to create dynamic qtips used through out the page.
         */
        // console.log("[INFO] ClaimPageView: makeCancelDialog triggered");

        var $element = null;

        TemplateManager.get('qtipLoseChangesWarningTemplate', function(tpl) {
            $element = tpl(settings);
        }, G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + this.appName + '/tpl/', null, false);
        // "null" is the "noHandlebars" option, "false" is the "async" option

        return $element;
    },

    initializeCustomFields: function (customFieldsArr) {
        var self = this,
            i;
        console.log('customFields ', customFieldsArr);
        if (customFieldsArr) {
            for (i = 0; i < customFieldsArr.length; i++) {
                console.log("itterating: ", i, 'value: ', customFieldsArr[i].value);

                // check to see if the value matches the format of an array
                if( customFieldsArr[i].value && customFieldsArr[i].value.match(/(^\[.+]$)/) ) {
                    // convert to an actual JS array instead of the string
                    customFieldsArr[i].value = customFieldsArr[i].value.replace(/(\[|]|')/g,'').split(',');
                }
                // check to see if the object contains an address
                if( customFieldsArr[i].mainAddressFormBean ) {
                    _.each(customFieldsArr[i].mainAddressFormBean, function(v,k) {
                        self.$el.find(".customSection-" + self.activePromotion.id  + " [name ^= 'claimElement[" + i + "].mainAddressFormBean." + k + "']").val(v);
                    });
                }
                self.$el.find(".customSection-" + self.activePromotion.id  + " [name ^= 'claimElement[" + i + "].value']").val(customFieldsArr[i].value);
            }
        }
    },

    initializeParticipantSearch: function(participantsArr) {
        /*
         * Add team members widget
         */

        'use strict';
        var self = this;

        // set up the participant search widget
        this.participantsView = new ParticipantCollectionView({
            el : this.$el.find('#participantsView'),
            tplName : 'teamMemberRow', //override the default template
            model : new Backbone.Collection(this.options.leaders)
        });

        // page level reference to participant search view
        this.participantSearchView = new ParticipantSearchView({
            el : this.$el.find('#participantSearchView'),
            participantCollectionView : this.participantsView
        });
        this.participantSearchView.on("rendered", function() {
            self.$el.find("#addTeamMembersWrap .showHideBtn").hide();
        });

        this.participantsView.model.on('remove add reset', function() {
            self.$el.find("#teamMembersCount").val(self.participantsView.model.length > 0 ? self.participantsView.model.length : '');
        }, this);

        this.participantsView.model.on('add', function() {
            G5.util.formValidate(self.$el.find('#teamMembersCount'));
        });

        if (this.usableArray(participantsArr)) {
            _.each(participantsArr, function(obj) {
                self.participantsView.model.add(obj); // add to the model
            });
        }
    },

    datePicker: function(event) {
        /*
         * Initializes and calls the date picker plugin
         */

        event.preventDefault();

        this.$el.find('.datepickerTrigger').datepicker();

        $(event.currentTarget).parents(".datepickerTrigger").datepicker("show");
    },

    usableArray: function(arr) {
        /*
         * Returns wether or not an array can be looped through
         */
        // return _.isArray(arr) && arr.length !== 0;
        return _.isArray(arr) && !_.isEmpty(arr);
    },

    savetoAddressBookToggle: function(e) {
        /*
         * Hides / shows add to address book input
         */
        // console.log("[INFO] ClaimPageView: savetoAddressBookToggle triggered");

        this.$el.find("#addressBookNameWrap")[($(e.currentTarget).is(":checked")) ? "show" : "hide"]();
    },

    closeQtip: function(event) {
        /*
         * Hides all qtips on page
         */
        if (event) {
            event.preventDefault();
        }
        $(":qtip").qtip("hide");
    },

    getPage: function(e) {
        e.preventDefault();
        console.log('getPage Fired: ', e);
        /* Gets URL from data-url attrubute, and sends the user to a valid uri. */
        var $button = $(e.target),
            buttonId = e.target.id,
            self = this,
            url = $button.data('url');
            console.log('buttonId', buttonId,' url ', url,' button ', $button);
        //aggregate all buttons here, to keep things tidy
        switch (buttonId){
            case "claimButtonCancel":
                this.cancelClaim(e);
                break;

            //inside the 'cancel Recognition' modal:
            case "claimCancelDialogCancel":
                this.claimCancelDialogClick(e, false);
                break;

            //inside the 'cancel Recognition' modal:
            case "claimCancelDialogConfirm":
                this.claimCancelDialogClick(e, true);
                break;

            case "ClaimButtonEdit":
                if(url){
                    e.preventDefault();
                    window.location = url;
                    console.log('change location: ', url);
                }
                break;

            case "claimButtonSend":
                // disable and show busy (should make this a style class)
                $button.addClass('disabled').spin();
                $button.siblings('.btn').attr('disabled','disabled');
                // defer disable to end of stack so event may bubble
                _.defer(function(){$button.attr('disabled','disabled');});
                if(url){
                    e.preventDefault();
                    window.location = url;
                    console.log('change location: ', url);
                }
                else {
                    $button.closest('form').submit();
                }
                break;

        }
    },

    /*
    These functions take care of the confirm tooltip
    */

    //add confirm tooltip
    addConfirmTip: function($trig, cont){
        //attach qtip and show
        $trig.qtip({
            content:{text: cont},
            position:{
                my: 'bottom center',
                at: 'top center',
                container: this.$el
            },
            show:{
                event:'click',
                ready:true
            },
            hide:{
                event:'unfocus',
                fixed:true,
                delay:200
            },
            style:{
                classes:'ui-tooltip-shadow ui-tooltip-light participantPopoverQtip',
                tip: {
                    corner: true,
                    width: 20,
                    height: 10
                }
            }
        });
    },

    claimCancelDialogClick: function(e, isConfirm){
        console.log("The things ",e,' ', isConfirm);
        var $tar = $(e.target),
            $cancel = this.$el.find('#claimButtonCancel');
        //just hide the qTip
        e.preventDefault();
        $tar.closest('.ui-tooltip').qtip('hide');
        // if cancel confirmed and if url is set, then let's go there
        if(isConfirm && $cancel.data('url')) {
            window.location = $cancel.data('url');
        }
    },

    /*
    These functions are for the send/edit/cancel buttons
    */
    cancelClaim: function(e){
        e.preventDefault();
        var $tar = $(e.target),
            self = this;

        // show a qtip
        if(!$tar.data('qtip')){
            this.addConfirmTip(
                $tar,
                $tar.closest('#claimPagePreviewView').find('.claimSendCancelDialog')
            );
        }
    },
    removeSpinner : function($trigger){
        // remove the spinner on the trigger button
        $trigger.removeClass('disabled').removeProp('disabled').spin(false);
        $trigger.siblings('.btn').removeAttr('disabled');
        $trigger.find("div.spinner").remove();
    },
    formHandler: function(formToServerValidate, $form, event) {
        /*
         *
         * Converts JSON and JS objects to a submitable form.
         *
         * [1] Submit request for Server validation.
         *
         *     [1a] If server returned errors, display them. (formValidateHandleJsonErrors), and disable spinner (removeSpinner)
         *
         * [2] Submit request to server.
         *
         * [3] Server should respond with a serverCommand redirect.
         *
         */
         var self    = this,
            $trigger = $(event.target),
            method   = $form.attr('method'),
            action   = G5.props.URL_CLAIM_VALIDATION,
            request;
        console.log('[Info] Server checking for validation errors.');
        //[1]
        request = $.ajax({
                url     : action,
                type    : method,
                data    : formToServerValidate.serializeArray(),
                async   : false,
                dataType: 'g5json'
        })
        .done(function(data, textStatus, jqXHR) {
            console.log(data, textStatus, jqXHR);

            //[1a]
            if( !G5.util.formValidateHandleJsonErrors($form, data.data.messages) ) {
                console.log('[Info] Server found validation errors.');
                self.removeSpinner($trigger);
                return false;
            } else {
            // otherwise, mark the form as ready to submit and resubmit
                //[2]
                $form.data('readyToSubmit', true);
                request = $.ajax({
                    url      : $('#claimForm').prop('action'),
                    type     : method,
                    data     : formToServerValidate.serializeArray(),
                    async    : false,
                    dataType : 'g5json'
                })
                .done(function(data, textStatus, jqXHR) {
                    console.log("[Info] Server Saved Preview Data");
                    //[3]
                    if( _.any(data.data.messages, function(message) { return message.type === 'serverCommand'; }) ) {
                        console.log('[Info] Server found no validation errors, expecting serverCommand redirect');
                        self.removeSpinner($trigger);
                        return false;
                    }
                });
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.log('[ERROR] ClaimPage form submission .ajax failed', jqXHR, textStatus, errorThrown);
            self.removeSpinner($trigger);
        });
    }, // formHandler

    formToJSON: function($form) {
        /*
         *
         * Converts a group of inputs and textareas into usable JSON.
         * inputs like:
         *     <input type="hidden" name="foo[0].bar[1].name" value="val" />
         * are converted into objects like:
         *     {
         *         foo: [
         *             {
         *                 bar: [
         *                     { ... },
         *                     {
         *                         name: "val"
         *                     }
         *                 ]
         *             },
         *             { ... }
         *         ]
         *     }
         *
         * [1] Set up variables to be used inside of the loop
         *
         * [2] matches one or more characters a-z, followed by litteral [,
         *     one or more digits, and litteral ]
         *
         * [3] Matches litteral [, one or more digits, and litteral ]
         *
         * [4] inspired by https://github.com/jashkenas/underscore/pull/595/files
         *     simplified to only account for objects, not arrays and dates.
         *
         * [5] Converts an array of strings into an object structure.
         *
         *     [5a] On the first loop, the parent object should be the
         *          data object we set up previously.
         *
         *     [5b] Create placeholder for the next name in the loop.
         *
         *     [5c] Split object dividers.
         *
         *     [5d] What the next name will be.
         *
         *     [5e] On the last in the array, the next name will be undefined
         *          so we know a value can now be set.
         *
         *     [5f] If the current item isn't an object yet, make it one.
         *
         *     [5g] Set a reference to current object.
         *
         * [6] Recursively goes through an object searching for what should
         *     be converted to arrays.
         *
         *     [6a] If it's not an object, there is no need to check it for arrays.
         *
         *     [6b] Loop through the passed object.
         *
         *     [6c] Check to see if the name is an array like value, e.g.: sampleName[1].
         *
         *     [6d] Get the pieces of the name. e.g. foo[0] -> ["foo[0]", "foo", "0"]
         *
         *     [6e] if that name isn't being used yet, make a blank array in
         *          it's place. Otherwise, set a reference to the set array.
         *
         *     [6f] Use safeSplice() to make sure the correct data is added to the
         *          correct object. This is useful in cases where sampleName[1]
         *          comes before sampleName[0] in the HTML
         *
         *     [6g] Remove the old object.
         *
         *     [6h] Search the new object for array like names.
         *
         *     [6i] Search this object's children for array like names.
         *
         * [7] Loop through the array until we get to the right number / key
         *
         *     [7a] If there is already a value set, move on, otherwise set it to undefined.
         *
         * [8] Initial loop through each element.
         *
         */

        if (!$form) {
            return;
        }

        // var $inputs     = $form.children(),
        var $inputs     = $form.find("select, input, textarea"),

            data        = {},   // [1]
            elValue     = null, // [1]
            elName      = null, // [1]
            $el         = null, // [1]

            validData = true,
            arrParse    = (/([a-z]+)\[(\d+)\]/i), // [2]
            arrTest     = (/\[\d+\]$/),           // [3]

            deepClone   = function(obj) { // [4]

                var func = function (memo, value, key) {
                    memo[key] = _.clone(value, true);
                    return memo;
                };

                return _.reduce(obj, func, {});
            },
            nameSpace   = function(path, value) { // [5]

                var prevStr = data,            // [5a]
                    nextStr = null,            // [5b]
                    path    = path.split("."); // [5c]

                _.each(path, function(str, key) {
                    nextStr = path[key + 1]; // [5d]

                    if (_.isUndefined(nextStr)) { // [5e]
                        prevStr[str] = value;
                    } else {
                        if (_.isUndefined(prevStr[str])) { // [5f]
                            prevStr[str] = {};
                        }
                    }

                    prevStr = prevStr[str]; // [5g]
                });
            },
            makeArrays  = function(obj) { // [6]

                if (!_.isObject(obj)) { // [6a]
                    return obj;
                }

                _.each(obj, function(value, name) { // [6b]

                    if (arrTest.test(name)) { // [6c]

                        var parsedValue = arrParse.exec(name), // [6d]
                            arr = null;

                        if (_.isUndefined(obj[parsedValue[1]])) { // [6e]
                            arr = [];
                        } else {
                            arr = obj[parsedValue[1]];
                        }

                        obj[parsedValue[1]] = safeSplice(arr, deepClone(value), parseInt(parsedValue[2], 10)); // [6f]
                        delete obj[parsedValue[0]]; // [6g]
                        makeArrays(obj[parsedValue[1]]); // [6h]
                    } else {
                        makeArrays(value); // [6i]
                    }
                });

                return obj;
            },
            safeSplice = function(arr, prop, key) { // [7]

                if (_.isUndefined(key)) {
                    key = 0;
                }

                for (var count = 0; count <= key; count++) { // [7a]
                    if (_.isUndefined(arr[count])) {
                        arr[count] = null;
                    }

                    if (count === key) {
                        arr[count] = prop;
                    }
                }

                return arr;
            };

            _.each($inputs, function(el){
                if (validData !== true){return;}
                $el = $(el);
                elName  = $el.prop('name');
                elValue = ($el.is("textarea")) ? JSON.parse($el.val()) : $el.val();
                        console.log('elValue ', elValue, ' Name ', elName);
                        if (elName == "promotionId" && elValue === ""){
                            console.log('Bad case, leaving');
                            validData = false;
                        return;
                        }
                    });
        if ($inputs.length === 0 || !validData) {
            return;
        }

        _.each($inputs, function(el) { // [8]
            $el     = $(el);
            elName  = $el.prop('name');
            elValue = ($el.is("textarea"))
                        ? JSON.parse($el.val())
                        : $el.val();
            if (elValue !== ""){
            console.log('elValue ', elValue, ' Name ', elName);
            nameSpace(elName, elValue);
            }
        });
        var somedata = (makeArrays(data));
        console.log("makeArrays data ", somedata);
        return somedata;
    }
});
