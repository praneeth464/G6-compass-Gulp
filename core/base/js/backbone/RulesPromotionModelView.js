/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
alert,
Backbone,
RulesPromotionModelView:true
*/
RulesPromotionModelView = Backbone.View.extend({
    tagName: 'li', // name of tag to be created
    events: {
        'click a': 'updateRules'
    },

    // `initialize()` now binds model change/removal to the corresponding handlers below.
    initialize: function () {
        "use strict";
        _.bindAll(this, 'render', 'updateRules'); // every function that uses 'this' as the current object should be in here
    },

    render: function () {
        "use strict";
        var categoryValue = this.model.get('categoryName');
        if (categoryValue === 'undefined category type') {
            $(this.el).html('<a href="#">' + this.model.get('name') + '</a>');
        } else {
            $(this.el).html('<a href="#">' + this.model.get('categoryName') + ' ' + this.model.get('name') + '</a>');
        }
        return this; // for chainable calls, like .render().el
    },

    // 'update rules()' should grab the content from the model that was selected, make it the 'active' rule, and update the content area of the page
    updateRules: function () {
        "use strict";
        alert('rule clicked');
        var newContent = this.model.get('content');
        $('#col-right').html(newContent);
        $('#rulesPromotionCollection').find('li').each(function () {
            $(this).removeClass("active");
        });
        this.$el.addClass('active');
    }
});
