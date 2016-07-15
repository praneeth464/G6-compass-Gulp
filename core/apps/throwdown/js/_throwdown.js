G5.throwdown = {};
G5.throwdown.promoId = null;
G5.throwdown.promotionsLoaded = false;
G5.throwdown.dispatcher = _.extend({}, Backbone.Events);
G5.throwdown.moduleOrder = {
    match: 1,               // Some default order values for the Throwdown modules.
    promoSelect: 2,         // These will be overwritten with whatever values the
    smackTalk: 3,           // modules have on page load. These are used if a module
    rankings: 4,            // has been hidden and needs to be redisplayed in the
    news: 5,                // correct order when the promotion has changed.
    traingCamp: 6,
    standings: 7
}