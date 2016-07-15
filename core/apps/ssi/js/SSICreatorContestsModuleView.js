/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
$,
G5,
console,
TemplateManager,
SSIModuleView,
SSIContestCreateModalView,
SSICreatorContestModel,
SSICreatorContestsModuleView:true
*/

SSICreatorContestsModuleView = SSIModuleView.extend({
    tplPath: './../apps/ssi/tpl/',
    tplName: 'ssiCreatorModuleFormTpl',
    events: {
        'blur    .contestName': 'blurContestName',
        'click   .showContestQtip': 'createNewContestOverlay',
        'click   .toggleModuleSlide': 'makeModuleSlide',
        'click .cancelCreateContest': 'cancelModuleSlide',
        'click   .qtipSubmit': 'setValueFromQtip',
        'submit  .contestCreate': 'submitHook',
        'keydown .contestName': 'changeContestName'
    },

    contestData: new SSICreatorContestModel(),

    initialize: function() {
        'use strict';

        //this is how we call the super-class initialize function (inherit its magic)
        SSIModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass SSIModuleView
        this.events = _.extend({}, SSIModuleView.prototype.events, this.events);

        //set the appname (getTpl() method uses this)
        this.appName = 'ssi';

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions', [
            {w: 1, h: 1}, // 1x1 square
            {w: 2, h: 1}, // 2x1 square
            {w: 2, h: 2}, // 2x2 square
            {w: 4, h: 2}, // 4x2 square
            {w: 4, h: 4}  // 4x4 square
        ]);

        // prevent spawning of children
        this.off('templateLoaded');
    },

    /**
     * Handles the hiding/showing of modules content
     *
     * @param {object} event - jQuery event object
     * @returns {object}
     */
    makeModuleSlide: function(event) {
        'use strict';

        event.preventDefault();

        //this.$el.spin(true);
        G5.util.showSpin(this.$el);

        var fetchFailure = function (jqXHR, textStatus) {
            console.warn(textStatus);
        };

        this.contestData.makeFetchHappen()
            .then(_.bind(this.renderModuleSlide, this), fetchFailure)
            .then(_.bind(this.displayModuleSlide, this));

        return this;
    },

    /**
     * compiled templates with collection data
     *
     * @returns {object}
     */
    renderModuleSlide: function () {
        'use strict';

        var that = this,
            deferrer = new $.Deferred(),
            data = this.contestData.toJSON();

        TemplateManager.get(this.tplName, function(tpl) {
            that.$el.find('.createContestSlide').html(tpl(data));
            deferrer.resolve();
        }, this.tplPath);

        return deferrer.promise();
    },

    /**
     * hides loading spinner and shows form
     *
     * @returns {object}
     */
    displayModuleSlide: function () {
        'use strict';

        //gross but IE needs show and hide if it doesn't support animations.
        if($('html').hasClass('no-cssanimations')){
            this.$el.find('.createContestSlide').show();
        }

        G5.util.hideSpin(this.$el);
        this.$el.addClass('flipped');

        this.$el.find('input').placeholder();

        return this;
    },

    /**
    * hides form and shows default view of tile
    *
    * returns {object}
    */
    cancelModuleSlide: function() {
        this.$el.removeClass('flipped');

        //gross but IE needs show and hide if it doesn't support animations.
        if($('html').hasClass('no-cssanimations')){
            this.$el.find('.createContestSlide').hide();
        }

        return this;
    },

    /**
     * Creates and appends a qtip with contest type information
     *
     * @param {object} event - jQuery event object
     * @returns {object}
     */
    createNewContestOverlay: function (event, $form) {
        'use strict';

        if (event && event.preventDefault) {
            event.preventDefault();
        }

        var $target = $form || $(event.target);

        if ($target.is('form')) {
            $target = $target.find('.submitForm');
        }

        this.overlay = new SSIContestCreateModalView({
            parentView: this,
            target: $target,
            container: this.$el.find('.contestCreate')
        });

        return this;
    },

    /**
     * `submitHook` takes over the submit event for the
     * form in order to validate.
     *
     * @param {object} event - jQuery event object
     * @returns {object}
     */
    submitHook: function (event) {
        'use strict';

        event.preventDefault();

        var $form = $(event.target),
            handleSuccess = _.bind(function() {
                // remove event listener to prevent recursive callbacks
                this.$el.off('submit', '.contestCreate');
                // each browers and scenerio seems to require a different
                // submit method, spamming them seems to fix the issue though...
                _.defer(function () {
                    event.target.submit();
                    $form.submit();
                    $form.find('button[type="submit"]').trigger('click');
                });
            }, this);

        if (!$form.is('form')) {
            console.warn('[SSI] submitHook is expecting a form');
        }

        this.validate($form).then(handleSuccess);

        return this;
    },

    /**
     * Validates all of the form
     *
     * @param {object} $form - jQuery element collection
     * @returns {object}
     */
    validate: function ($form) {
        'use strict';

        var deferrer = new $.Deferred(),
            vName    = this.validateName($form),
            vType    = this.validateType($form);

        this.whenAll(vName, vType)
            .then(function () {
                deferrer.resolve();
            }, function (vNameErrors, vTypeErrors) {
                deferrer.reject(vNameErrors, vTypeErrors);
            });

        return deferrer.promise();
    },

    /**
     * Validates that if the contest name is set,
     * that it is unique.
     *
     * @param {object} $form - jQuery element collection
     * @returns {object}
     */
    validateName: function ($form) {
        'use strict';

        var that      = this,
            deferrer  = new $.Deferred(),
            $name     = $form.find('.contestName'),
            $status   = $form.find('.contestNameStatus'),
            $btn      = $form.find('button[type="submit"]'),
            nameVal   = $name.val(),
            setStatus = this.curry(this.setStatus, $status),
            getStatus = this.curry(this.getStatus, $status);

        // start spinner
        $status.find('.pending').spin(true);
        $btn.attr('disabled', true);

        // only validate if a name is set and not already valid
        if (!!nameVal && getStatus() !== 'valid') {

            setStatus('pending');

            $.ajax({
                url : G5.props.URL_JSON_CONTEST_CHECK_NAME,
                type : 'post',
                data : {
                    contestName: nameVal,
                    locale: "en_US" // note: static for phase 1
                },
                dataType : 'g5json'
            }).done(function (resp) {
                var data = resp.data.messages,
                    err  = resp.getFirstError();

                if (err) {
                    setStatus('invalid', data[0].text);
                    deferrer.reject(data[0]);
                } else {
                    setStatus('valid');
                    deferrer.resolve();
                }

                if (that.overlay) {
                    that.overlay.repositionModal();
                }

                $btn.attr('disabled', false);
                $status.find('.pending').spin(false);
            });
        } else {
            deferrer.resolve();
            $status.find('.pending').spin(false);
            $btn.attr('disabled', false);
        }

        return deferrer.promise();
    },

    /**
     * Validates that the contest type input is set
     *
     * @param {object} $form - jQuery element collection
     * @returns {object}
     */
    validateType: function ($form) {
        'use strict';

        var deferrer = new $.Deferred(),
            $type = $form.find('.contestType');

        if (!$type.val()) {
            deferrer.reject({
                'type': 'error',
                'code': 'validationError'
            });

            this.createNewContestOverlay(null, $form);
        } else {
            deferrer.resolve();
        }

        return deferrer.promise();
    },

    /**
     * Tweaks jQuery's `Deferred.when` function to wait
     * for multiple promises to execute before resolving
     * or rejecting a promise. By default `when` resolves
     * immediately if a promise is rejected.
     *
     * @param {...object} - variable amount $.Deferred objects
     * @returns {object}
     */
    whenAll: function () {
        'use strict';

        var deferrer = new $.Deferred(),
            defs = _.toArray(arguments),
            currentCount = 0,
            totalCount = defs.length,
            capturedResults = [];

        function captureResponse (index, resp) {
            capturedResults[index] = resp;

            currentCount = currentCount + 1;

            if (currentCount === totalCount) {
                andThen();
            }
        }

        function andThen () {
            var resMap = _.map(defs, function (obj) {
                    return obj.state();
                }),
                andThenn = resMap.indexOf('rejected') > -1 ? 'reject' : 'resolve';

            if (resMap.indexOf('pending') > -1) {
                // since `andThen` should never be called before
                // all promises have completed
                console.warn('[SSI] Creator Tile - Something has gone terribly wrong');
            }

            deferrer[andThenn].apply(deferrer, capturedResults);
        }

        _.each(defs, function (promise, index) {
            promise.always(_.bind(captureResponse, promise, index));
        });

        return deferrer.promise();
    },

    /**
     * Validates form name on input blur
     *
     * @param {object} event - jQuery event
     * @returns {object}
     */
    blurContestName: function (event) {
        'use strict';

        var blurTarget = event.relatedTarget;

        // if the blur target is the form submit button,
        // let 'submitHook' handle the validation
        if (!blurTarget || blurTarget.type !== 'submit') {
            this.validateName($(event.target).parents('.contestCreate'));
        }

        return this;
    },

    /**
     * Clears all validation settings when the contest name is changed
     *
     * @param {object} event - jQuery event
     * @returns {object}
     */
    changeContestName: function (event) {
        'use strict';

        this.setStatus($(event.target).siblings('.contestNameStatus'));

        return this;
    },

    /**
     * Changes class to the appropriate setting and
     * sets a data attribute marking status
     *
     * @param {element} $el - jQuery element
     * @param {string} [status] - status identifier
     * @param {string} [msg] - optional messaging to be displayed
     * @returns {object}
     */
    setStatus: function ($el, status, msg) {
        'use strict';

        var $msg = $el.find('.msg');

        $el.removeClass('pending valid invalid');
        $el.addClass(status);
        $el.data('validationStatus', status || '');

        $msg.text(msg || '');

        return this;
    },

    /**
     * Returns set validation data attribute
     *
     * @param {object} $el - jQuery element
     * @returns {string}
     */
    getStatus: function ($el) {
        'use strict';

        return $el.data('validationStatus');
    },

    /**
     * function currying
     *
     * @param {function} fn - future function to be called
     * @returns {function}
     */
    curry: function (fn) {
        'use strict';

        var that = this,
            args = _.rest(arguments);

        return function() {
            var subArgs = [].concat(args, _.toArray(arguments));
            return fn.apply(that, subArgs);
        };
    },

    /**
     * Grabs the active value from the qtip overlay
     * and sets it as the select list value
     *
     * @param {object} event - jQuery event
     * @returns {object}
     */
    setValueFromQtip: function (event) {
        'use strict';

        event.preventDefault();

        var contestId = this.overlay.$el.find('.active').data('id');

        this.overlay.destroyView();

        this.$el.find('.contestType [value="' + contestId + '"]').attr('selected', 'selected');

        this.$el.find('.contestCreate').trigger('submit');

        return this;
    }
});
