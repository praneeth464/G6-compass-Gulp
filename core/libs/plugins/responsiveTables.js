/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
_,
jQuery
*/
// requires _.js
// relies on @media queries actually working in the browser, as it tests the width of a dynamically inserted parent element that will end up flexing with *its* parent

(function( $ ){

    $.fn.responsiveTable = function(opts) {
        return this.each(function() {
            var that = this,
                settings = {
                    // breakpoints : [ 640 ],
                    pinHeader : false,
                    pinLeft : [ 0 ]
                };

            settings = $.extend(true, settings, opts);

            this.$table = $(this);

            // already attached? checkWidth() and exit
            if(this.$table.data('rT')) {
                if(opts && opts.destroy) {
                    make('normal');
                    $(window).off('resize.responsiveTable');
                    this.$table.removeData('rT');
                    return;
                }
                else if(opts && opts.reset) {
                    reset(opts.duration);
                    return;
                }
                else if(opts && opts.make) {
                    make(opts.make);
                    return;
                }
                else {
                    this.$table.data('rT_api').resizeResponsive();
                    this.$table.data('rT_api').checkWidth();
                }
                return;
            }

            this.$table.wrap('<div class="rT-wrapper" />');
            this.$wrapper = this.$table.closest('.rT-wrapper');
            this.$wrapper.closest('fieldset').css({minWidth:0});

            function checkWidth() {
                if( that.$wrapper.is(':hidden') ) {
                    return false;
                }
                if( that.$wrapper.innerWidth() < that.$table.outerWidth(true) ) {
                    make('responsive');
                }
                else {
                    make('normal');
                }
            }

            $(window).on('resize.responsiveTable', _.throttle(checkWidth, 500));

            this.$table.data('rT', {
                state : null,
                wrapperWidth : this.$wrapper.width()
            });

            this.$table.data('rT_api', {
                makeResponsive: _makeResponsive, // expose it
                makeNormal: _makeNormal, // expose it
                checkWidth: checkWidth, // expose checkWidth()
                resizeResponsive: resizeResponsive, // expose resizeResponsive()
                getState: _getState
            });

            checkWidth();

            // functions

            function reset(duration) {
                duration = duration || 10;
                _makeNormal();
                setTimeout(function() {
                    checkWidth();
                }, duration);
            }

            function resizeResponsive() {
                if( that.$table.data('rT').state == 'responsive' ) {
                    if( that.$table.height() != that.$cloneLeft.height() ) {
                        that.$cloneLeft.find('tbody tr').each(function(i) {
                            $(this).find('td').height( that.$table.find('tbody tr').eq(i).find('td').eq(0).height() );
                        });
                        that.$cloneLeft.closest('.rT-pinLeft-wrap').css({height : that.$table.outerHeight()});
                    }
                }
            }

            function make(state) {
                //console.log($table.data('rT').wrapperWidth, $wrapper.width());

                if( that.$table.data('rT') && that.$table.data('rT').state != state /*|| $table.data('rT').wrapperWidth != $wrapper.width()*/ ) {
                    if( state == 'responsive' ) {
                        // console.log('make responsive');
                        _makeResponsive();
                    }
                    else {
                        // console.log('make normal');
                        _makeNormal();
                    }
                }
            }

            function _makeResponsive() {
                that.$cloneLeft = that.$table.clone(true).removeAttr('id');
                that.$cloneHeader = that.$table.clone(true).removeAttr('id');

                // cleanup in case this is called again (for client sort for example)
                that.$wrapper.find('.rT-pinLeft-wrap').remove();
                that.$wrapper.find('.rT-pinLeft').remove();// clean up old el if there
                that.$wrapper.find('.rT-pinHeader').remove();// clean up old el if there

                // cleanup name attr, commenting out this line will cause radio buttons not to function correctly in responsive tables.
                that.$cloneLeft.find('input').removeAttr('name');
                // cleanup certain styles, just in case a background flash was happening when the clone() happened (looking at you, ParticipantCollectionView)
                that.$cloneLeft.find('td,th').css({
                    background: '',
                    backgroundColor: ''
                });
                // cleanup any validatme fields so form validation doesn't run on the cloned table
                that.$cloneLeft.find('.validateme').removeClass('validateme');

                if(!that.$wrapper.find('.rT-innerWrapper').length) { // create lazily
                    that.$wrapper.wrapInner('<div class="rT-innerWrapper" />');
                }

                that.$innerWrapper = that.$wrapper.find('.rT-innerWrapper');

                that.$wrapper.css({
                    position : 'relative',
                    width : 'auto',
                    overflow : 'visible'
                });

                that.$cloneLeft.data('rT', {
                    width : 0,
                    height : 0
                });
                that.$cloneHeader.data('rT', {
                    width : 0,
                    height : 0
                });
                // console.log($cloneLeft, $cloneHeader, settings);

                that.$cloneLeft
                    .addClass('rT-pinLeft')
                    .appendTo( that.$wrapper );

                if( settings.pinHeader ) {
                    that.$cloneHeader
                        .addClass('rT-pinHeader')
                        .appendTo( that.$wrapper );
                }

                _.each(settings.pinLeft.sort(), function(index) {
                    that.$cloneLeft.data('rT').width += that.$table.find('th:nth-child('+(index+1)+')').outerWidth();

                    that.$cloneLeft.find('th:nth-child('+(index+1)+'), td:nth-child('+(index+1)+')').addClass('visible');
                });

                that.$cloneLeft
                    .wrap('<div class="rT-pinLeft-wrap" />')
                    .closest('.rT-pinLeft-wrap')
                        .css({
                            width : that.$cloneLeft.data('rT').width,
                            height : that.$table.outerHeight(),
                            borderRight : that.$cloneLeft.css('border-right')
                        });

                that.$wrapper.find('tr').on('mouseenter mouseleave', function(e) {
                    that.$wrapper.find('tbody').find('tr:eq('+$(e.target).closest('tr').index()+')')[e.type=='mouseenter'?'addClass':'removeClass']('hover');
                });

                that.$table.data('rT').state = 'responsive';
            }

            function _makeNormal() {
                that.$wrapper.find('.rT-pinHeader, .rT-pinLeft-wrap').remove();
                that.$wrapper.find('.rT-innerWrapper').children().unwrap();
                that.$wrapper.css({
                    position : '',
                    width : '',
                    overflow : ''
                });

                that.$wrapper.find('tr').off('mouseenter mouseleave');

                that.$table.data('rT').state = 'normal';
            }

            function _getState() {
                return that.$table.data('rT').state;
            }


        });
    };
})( jQuery );