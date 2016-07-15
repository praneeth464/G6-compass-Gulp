/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
_V_,
Backbone,
G5,
TemplateManager,
QuizTakeTabMaterialsView:true
*/
QuizTakeTabMaterialsView = Backbone.View.extend({

    initialize: function(opts) {
        // QuizPageEditView parent container for this tab
        this.containerView = opts.containerView;

        // quiz model
        this.quizTakeModel = this.containerView.quizTakeModel;
        // materials collection, sorted by pageNumber
        this.materials = _.sortBy(this.containerView.quizTakeModel.get('materials'), function(m){ return [m.pageNumber]; });
        // template
        this.tpl = opts.tpl;

        // if there are no materials, we bail from this view entirely
        if( this.materials.length <= 0 ) {
            return false;
        }

        this.setupEvents();
    },

    events: {
        // next button events
        'click  .nextMaterialBtn' : 'goToNextMaterial',

        // back button events
        'click .backMaterialBtn' : 'goBackAMaterial'
    },

    setupEvents: function() {
    },

    activate: function() {
        this.render();
    },

    render: function(page) {
        page = page || 1;
        var that = this,
            pageData = _.where(this.materials, {pageNumber:page})[0];

        // metadata
        pageData._isFirst = page == 1 ? true : false;
        pageData._isLast = page == this.materials.length ? true : false;
        pageData._totalPages = this.materials.length;
        pageData._totalFiles = pageData.files ? pageData.files.length : null;
        // if there is only one file in a video type, we try to oEmbed it. Otherwise, we use html5/videojs
        pageData._videoType = pageData.type == 'video' && pageData._totalFiles == 1 ? 'oembed' : 'html5';
        // if all questions have already been answered, we need to set an attribute directly on the material getting rendered because we aren't passing the entire Quiz JSON to the template
        pageData._isCompleted = this.quizTakeModel.get('_allQuestionsAnswered');

        // if there is an existing VideoJS video, kill it
        if( this.videojs ) {
            this.videojs = null;
            $(window).off('resize.videojs');
        }

        TemplateManager.get(this.tpl, function(tpl) {
            that.$el.html( tpl(pageData) );

            that._pageRendered = page;
            that.postRender(page);
        });
    },

    postRender: function(page) {
        var pageData = _.where(this.materials, {pageNumber:page})[0],
            videoUrl,
            videoHtml;

        switch (pageData.type) {
        case 'video':
            if( pageData._videoType == 'oembed' ) {
                videoUrl = pageData.files[0].url;
                videoHtml = G5.util.oEmbed(videoUrl);
                // was there embedded generated?
                if(videoHtml) {
                    // surround with responsive stuff
                    videoHtml = '<div class="videoWrapper"><div class="responsiveVideoContainer">'+videoHtml+'</div></div>';

                    this.$el.find('a.courseMaterial').replaceWith(videoHtml);
                }
            }
            // otherwise, assume it's an html5/videojs video
            else {
                if( this.$el.find('#courseMaterialVideo').length ) {
                    if(_V_) { // global reference to videojs lib
                        this.videojs = _V_('courseMaterialVideo').ready(function() {
                            var player = this,
                                aspRat = 3/4, // aspect ratio
                                // resize callback
                                onResize = function() {
                                    var w = document.getElementById(player.id).parentElement.offsetWidth;
                                    player.width(w).height(w*aspRat);
                                };

                            // initial call to resize function
                            onResize();
                            // bind to window resize event
                            $(window).on('resize.videojs', onResize);
                        });
                    }
                }
            }
            break;
        default:
        }
    },

    goToNextMaterial: function(e) {
        e.preventDefault();

        this.render(this._pageRendered + 1);
    },

    goBackAMaterial: function(e) {
        e.preventDefault();

        this.render(this._pageRendered - 1);
    }

});
