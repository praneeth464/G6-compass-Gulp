/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
G5
*/

// create util obj as necessary
if(!G5.util) { G5.util = {}; }

// background animation (colors)
G5.util.animBg = function($el, clazz){
    var origBg,flBg;
    //get the bg colors from css
    origBg = $el.css('background-color');
    flBg = $el.addClass(clazz).css('background-color');
    $el.removeClass(clazz);

    $el.css('background',flBg).animate(
        {backgroundColor:origBg},
        G5.props.ANIMATION_DURATION*6,
        function(){//remove the bg set by animate
            $el.css('background-color','');
        }
    );

}; // animBg

// Form field validation
G5.util.formValidate = function($fields, silent, opts) {

    var thisUtil = this,
        allValid = true;

    opts = opts||{};

    // function that does the work. Automatically called at the end of the parent formValidate() function
    this.execute = function() {
        var $form = $fields.closest('form');

        // iterate through each field container, digging out the field, figuring out what type it is, checking for validation flags, and passing along the value of the field to the validation methods
        $fields.each(function(key, field) {
            var $field = ( $(field).hasClass('validateme') && $(field).find('select, textarea, input').length ) ? $(field) // if the element has the validateme class AND it contains an input, select, or textarea use it as the container
                        : ( $(field).closest('.validateme').length ) ? $(field).closest('.validateme') // if the element has a parent with the validateme class, use it as the container
                        : $(field).parent(), // otherwise, use the element's parent as the container
                /*type   = ( $field.find('select').length ) ? 'select'
                       : ( $field.find('textarea').length ) ? 'textarea'
                       : 'input',*/
                $input = $field.find('select, textarea, input'),
                value  = ( $input.length == 1 ) ?
                            ( ( $input.attr('type') == 'checkbox' || $input.attr('type') == 'radio' ) && $input.attr('checked') != 'checked' ) ? false
                            : $input.val()
                        : $input.serializeArray(),
                flags  = ( $field.data('validateFlags') ) ? $field.data('validateFlags').split(',') : [],
                msgs   = ( $field.data('validateFailMsgs') ) ? $field.data('validateFailMsgs') : {},
                qtips  = [],
                valid  = true;

            //Strip out html for html inputs, but only if a value exists (was turning false into 'false')
            value = value ? $.trim($("<span>"+value+"</span>").text()) : value;

            $field.find('.validate-msg').remove();

            $.each(flags, function(i,v) {
                if( !thisUtil['_'+v](value, $field) ) {
                    valid = false;
                    allValid = false;

                    qtips.push(msgs[v] || '');

                    // $field.append('<span class="validate-msg help-inline" id="' + $input.attr('id') + '-msg-' + i + '">' + ( msgs[v] || '') + '</span>');
                }
            });

            if( !silent ) {
                if( valid ) {
                    G5.util.formValidateMarkField( 'valid', $field );
                }
                else {
                    G5.util.formValidateMarkField( 'invalid', $field, qtips.join('<br>'), opts.qtipOpts );
                }
            }

        });

        if(!opts.noFocus && !allValid){
            // stick the cursor in the first error field
            $form.find('.error input, .error select, .error textarea').first().focus();
        }

        return allValid;
    };

    // validation methods
    // _email can test either a single email address or a comma-separated series of email addresses (spaces will be removed)
    this._email = function(value, $field) {
        var values = value.replace(/ /g,'').split(','),
            passed = 0,
            emailPattern = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

        // if empty string, then let it pass, we are checking for valid email(s), not non-empty
        if( value.length === 0 ){ return true; }

        $.each(values, function(i,v) {
            passed += ( emailPattern.test(v) ) ? 1 : 0;
        });

        return ( passed === values.length );
    };

    // _match checks the value of the passed input against the value of the input called out in the data-validate-match attribute
    this._regex = function(value, $field) {
        var regex = $field.data("validateRegex");
        var patt=new RegExp(regex, "i");

        var tomatch = ( $field.data('validateMatch') ) ? $field.data('validateMatch').split(',') : [];
        // if empty string, then let it pass, we are checking for valid email(s), not non-empty
        if( value.length === 0 ){ return true; }

        if (value !== null && value !== ''){
            value= patt.test(value);
        }
        return value;
    };
    // _match checks the value of the passed input against the value of the input called out in the data-validate-match attribute
    this._match = function(value, $field) {
        var tomatch = ( $field.data('validateMatch') ) ? $field.data('validateMatch').split(',') : [];
        _.each(tomatch, function(v,k) {
            tomatch[k] = $('#'+v).val();
        });
        tomatch.push(value);

        return (_.uniq(tomatch).length === 1);
    };

    this._maxlength = function(value, $field) {
        var max = parseInt($field.data('validateMaxLength'), 10);

        // ugh, special case for jHtmlAreas (we look only at visible chars, no markup)
        if( $field.find('.jHtmlArea, iframe').length >= 2 ) {
            //value =$.trim($("<span>"+value+"</span>").text());
            //value = $($field.find('.richtext:eq(0)')[0].jhtmlareaObject.editor).text();
        }
        return value.length <= max;
    };

    this._minlength = function(value, $field) {
        var min = parseInt($field.data('validateMinLength'), 10);

        // ugh, special case for jHtmlAreas (we look only at visible chars, no markup)
        // if( $field.find('.jHtmlArea, iframe').length >= 2 ) {
        //     value = $($field.find('.richtext:eq(0)')[0].jhtmlareaObject.editor).text();
        // }

        return value.length >= min;
    };

    // _nonempty simply checks for a length
    this._nonempty = function(value, $field) {
        //for
        return ( value && value.length ) ? true : false;
    };

    // _numeric uses regex to test for an all numeric response
    this._numeric = function(value, $field) {
        var patt = /(^[1-9]\d*$)/;
        return value.match(patt) && value.match(patt).length ? true : false;
    };

    return this.execute();
};

G5.util.formValidateHandleJsonErrors = function($form, messages) {
    var errors,
        $global = $('<div class="globalerrors alert alert-error"><ul class="text-error" /></div>'),
        $fields = $();

    // clean up all global errors
    $form.find('.globalerrors').remove();

    // clean up all field-level errors (they were stored in the .data of the form)
    if( $form.data('serverErrors') ) {
        $form.data('serverErrors').each(function(key,field) {
            G5.util.formValidateMarkField( 'valid', $(field) );
        });
        $form.removeData('serverErrors');
    }

    // if there are no messages in the response, return true and break out of our function
    if( !messages || !messages.length ) {
        return true;
    }
    // otherwise, process the messages object and look for specifically error messages
    else {
        errors = _.filter(messages, function(message) {
            return message.type == 'error';
        });
    }

    // if there are no error messages in the response, return true and break out of our function
    if( !errors || !errors.length ) {
        return true;
    }
    // otherwise, process the errors
    else {
        console.log('[INFO] settings: validation errors returned from server on form submission', errors);

        // iterate over each error object
        _.each(errors, function(value) {
            // if there is a name or text attribute at the root of the object, the error is global. Add it to the $global object
            if( value.name || value.text ) {
                $global.find('ul').append('<li><strong>'+value.name+':</strong> <span>'+value.text+'</span></li>');
            }

            // if there is a fields attribute at the root of the object, the error is field-level
            if( value.fields ) {
                // iterate through each field-level error
                _.each(value.fields, function(field) {
                    // look up the field in the form using the name attribute in the error object and the name attribute on the form field
                    var $field = $form.find('[name="'+field.name+'"]');
                    // traverse up the DOM to find a suitable container for the form field
                    $field = $field.closest('.control-group') || $field.closest('.controls') || $field.parent();

                    // store the field in the $fields object for later reference
                    $fields = $fields.add($field);

                    // mark the field as invalid
                    G5.util.formValidateMarkField( 'invalid', $field, field.text );
                });

                // stick the cursor in the first error field
                $form.find('.error input, .error select, .error textarea').first().focus();
            }
            // if there are no field-level errors
            else {
                // stick the cursor in the first field that can accept focus
                $form.find('input, select, textarea').filter(':visible').not(':disabled, [readonly]').first().focus();
            }
        });

        // store the $fields object in the form .data for later reference
        $form.data('serverErrors', $fields);

        // if there are global errors
        if( $global.find('li').length ) {
            // prepend the global errors to the top of the form
            $form.prepend($global);
            // and scroll to them
            $.scrollTo($global);
        }

        // return false so this function can be used in an IF statement
        return false;
    }
};

G5.util.formValidateMarkField = function(state, $target, message, qtipOpts) {
    var $qtarget = $target.find('.input-append, .input-prepend').length ? $target.find('.input-append, .input-prepend')
                 : $target.hasClass('type-range') ? $target.find('div.slider')
                 // : $target.find('label.radio, label.checkbox').length ? $target.find('label.radio .optlabel, label.checkbox .optlabel').first()
                 : $target.find('input, select, textarea').first(),
        position = ( $target.find('label.radio, label.checkbox').length ) ? {
                    my : 'bottom left',
                    at : 'top center',
                    adjust : {
                        y : 6
                    }
                } : {
                    my : 'left center',
                    at : 'right center',
                    adjust : {
                        x : 6
                    }
                },
        hasQTip = $qtarget.qtip('api') ? true : false,
        hasErrorQTip = hasQTip && $qtarget.qtip('api').elements.tooltip.hasClass('validate-tooltip');

    // RICHTEXT element -- target the iframe div wrapper
    $qtarget = $qtarget.hasClass('richtext') ?
        $qtarget.closest('.jHtmlArea').find('iframe').closest('div')
        : $qtarget;

    position.container = $target;
    position.viewport = $('body');
    position.adjust.method = 'shift none';

    // adjust for form field inside modals
    if( $qtarget.parents('.modal-body').length ) {
        position.viewport = position.container;
    }
    // adjust for form field inside qtip
    if( $qtarget.parents('.ui-tooltip-content').length ) {
        position.my = 'bottom center';
        position.at = 'top center';
    }

    // merge in any passed qtipOpts
    // NOTE: for now, only handling "position" because it'll require some rewriting of this method to merge all options
    // TODO: do the above mentioned rewriting to enable a full qtipOpts object to be passed
    if( qtipOpts && qtipOpts.position ) {
        position = $.extend(true, position, qtipOpts.position);
    }

    if( state == 'invalid' ) {
        $target.addClass('error');

        if( !hasQTip || !hasErrorQTip ) {
            // IE8 needs this set before the show event in certain cases
            $target.css('position','relative');
            $qtarget.qtip({
                content: {
                   text: message
                },
                position : position,
                show : {
                    ready : true,
                    delay: false // important for Send a Rec.
                },
                hide : {
                    event : false,
                    fixed : true
                },
                //only show the qtip once
                events:{
                    show : function(evt,api) {
                        $target.css('position','relative');
                    },
                    visible: function(evt,api) {
                        var $tt = api.elements.tooltip, // reference to the rendered tooltip DOM element
                            $tar = api.elements.target, // reference to the tooltip's target element
                            tarX = $tar.position().left+$tar.width(), // left edge of the target + the width of the target = right edge of the target
                            ttY = $tt.position().top+$tt.height(), // top edge of the tooltip + the height of the tooltip = bottom edge of the tooltip
                            yDif = ttY - $tar.position().top; // difference between the bottom edge of the tooltip and the top edge of the target
                        //console.log($tar.position().left+$tar.width(),$tt.position().left);
                        //console.log(api.elements.tooltip.get(0),api.elements.tip.get(0),api);
                        // if the right edge of the target is greater than the left edge of the tooltip AND the left edge of the tooltip is greater than zero
                        if(tarX>$tt.position().left&&$tt.position().left>0){
                            // adjust the y position -1 * the difference between the bottom edge of the tooltip and the top edge of the target
                            api.set('position.adjust.y',-yDif);
                        }else{
                            api.set('position.adjust.y',0);
                        }
                    },
                    //move: function(evt,api){console.log(evt);},
                    hide : function(evt,api) {
                        $qtarget.qtip('destroy');
                        $target.css('position','');
                    },
                    render : function(evt,api) {
                    }
                },
                style:{
                    classes:'ui-tooltip-shadow ui-tooltip-red validate-tooltip',
                    tip: {
                        width: 10,
                        height: 5
                    }
                }
            });
        }
        else {
            $qtarget.qtip('show').qtip('option', 'content.text', message);
        }
    }
    else if( state == 'valid' ) {
        $target.removeClass('error');
        $qtarget.qtip('hide');
    }
};

// sheet overlays
G5.util.doSheetOverlay = function(isFullPage, url, title, $staticContent){
    // var that = this;
    var $sheetModal;

    // NOT fancy, just a normal link
    if(isFullPage) {
        // tell the server to return page with layout wrapping
        if (url.indexOf("?") !== -1){
            window.location = url+'&isFullPage=true'; //if url already has params, use '&'
        }else{
            window.location = url+'?isFullPage=true'; //if it does not have params, use '?'
        }
        return;
    }

    // SHEETS!
    // modal stuff
    if(!$sheetModal) {
        // find a sheetModal...somewhere (likely in the globalfooter view)
        // it does seem like TemplateManager would be a good thing to use here
        $sheetModal = $('#sheetOverlayModal').detach();

        // move it to body
        $('body').append($sheetModal);

        $sheetModal.on('hidden',function(){
            $sheetModal.find('.modal-body').empty();
            $sheetModal.find('.sheetOverlayModalTitle').empty();
        });

        // create modal
        $sheetModal.modal({
            backdrop:true,
            keyboard:true,
            show:false
        });

    }

    // wait to insert the HTML into the sheet until it's been shown
    // this is because certain elements on the page don't render properly when they are hidden
    $sheetModal.on('shown', function() {
        if (!$staticContent) {
            // straight ajax load
            $sheetModal.find('.modal-body').load(url, {isFullPage:false, responseType: 'html'},function(responseText, textStats, XMLHttpRequest){
                        G5.serverTimeout(responseText);
                    });
        }else{
            //content is already available, append the passed content
            $sheetModal.find('.modal-body').html($staticContent);
        }
        // kill this listener so it doesn't fire multiple times on later sheets
        $sheetModal.off('shown');
    });

    //If a modal is already open, remove the old content and replace with new content.
    if($sheetModal.data('modal').isShown) {
        $sheetModal.find('.modal-body').html('');

        if (!$staticContent) {
            // straight ajax load
            $sheetModal.find('.modal-body').load(url, {isFullPage:false, responseType: 'html'},function(responseText, textStats, XMLHttpRequest){
                        G5.serverTimeout(responseText);
                    });
        }else{
            //content is already available, append the passed content
            $sheetModal.find('.modal-body').html($staticContent);
        }
        // kill this listener so it doesn't fire multiple times on later sheets
        $sheetModal.off('shown');
    }

    //set the title for the modal
    $sheetModal.find('.sheetOverlayModalTitle').text(title);

    //$.scrollTo(0,0);
    $sheetModal.modal('show');
};

G5.util.showSpin = function($el, opts) {
    // console.log('showSpin', $el, opts);
    // $el is the element into which the spinner will be inserted
    // options:
    //      cover: whether or not to wrap the .spin in .spincover to give a way to mask out the background while the spinner twirls
    //      classes: (space-separated list) additional classes to add to the outermost element (.spin by default, .spincover if cover:true)

    var settings = {
            cover : false,
            classes : '',
            spinopts: {}
        },
        $spin;
    settings = $.extend(settings, opts);

    if( !$el.children('.spin').length ) {
        $el.append('<span class="spin" />');
    }
    $spin = $el.children('.spin');

    if( settings.cover ) {
        $spin.wrap('<div class="spincover" />');
        $el.children('.spincover').addClass(settings.classes);
        if( !_.contains(['relative', 'absolute', 'fixed'], $el.css('position')) ) {
            $el.css('position', 'relative');
        }
    }
    else {
        $spin.addClass(settings.classes);
    }

    $spin.spin(settings.spinopts);
};

G5.util.hideSpin = function($el) {
    // console.log('hideSpin', $el);
    // $el is the element from within which the spinner (and optional cover) will be removed
    $el.children('.spin, .spincover').remove();
    $el.css('position', '');
};


// Attach a question qtip (used for 'are you sure' cancel dialogs)
// manage events by making sure the qtip is inside a Backbone.View with events
// OR attach directly to $content
G5.util.questionTip = function($target,$content,qtOpts,confirmCallback,cancelCallback) {
    var defQtOpts = {
        content:{text: $content},
        position:{
            my: 'bottom center',
            at: 'top center'
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
        },
        events:{
            hide:function(evt,api){
                $target.qtip('destroy');
            }
        }
    };

    qtOpts = qtOpts||{};

    // add options if necessary
    _.extend(defQtOpts.content, qtOpts.content||{});
    _.extend(defQtOpts.position, qtOpts.position||{});
    _.extend(defQtOpts.show, qtOpts.show||{});
    _.extend(defQtOpts.hide, qtOpts.hide||{});
    _.extend(defQtOpts.style, qtOpts.style||{});
    _.extend(defQtOpts.events, qtOpts.events||{});

    // attach qtip
    $target.qtip(defQtOpts);
    // optional callbacks
    if(confirmCallback) {
        $content.find('.confirmBtn').click(confirmCallback);
    }
    if(cancelCallback) {
        $content.find('.cancelBtn').click(cancelCallback);
    }
    $content.find('.closeTip').click(function(e){
        e.preventDefault();
        $target.qtip('hide');
    });


};// G5.util.questionTip()


/*  Parse out email addresses separated by semicolon, comma or spaces
    Supported email formats:
    1) Stricker, Aaron <Aaron.Stricker@biworldwide.com>
    2) Aaron.Stricker@biworldwide.com
    validate - return various potential errors
    data - array of pax objects with firstName, lastName, email */
// these variables can be overwritten by JAVA if necessary (or updated here)
G5.util.parseEmails_emailRegEx = /^[A-Z0-9'._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
G5.util.parseEmails_separator = ";";
G5.util.parseEmails = function(emailStr) {
    var lCommaFnameRe = /(.+),(.+)<(.*@.*)>/, // real light regex
        fSpaceLnameRe = /([^ ]+) (.*)<(.*@.*)>/, // guerilla regex
        emOnlyRe = /([^<]+@[^>]+)/, // chicken regex
        emRe = G5.util.parseEmails_emailRegEx,
        errant = [],
        parsed = [],
        toks = emailStr.split(G5.util.parseEmails_separator),
        errorCode = null;

    if(toks.length&&toks[0]) { // if we have at least one tok and its not emptystring
         _.each(toks, function(tok){
            tok = $.trim(tok);
            var parsedLcF = tok.match(lCommaFnameRe),
                parsedFsL = tok.match(fSpaceLnameRe),
                parsedName = parsedLcF||parsedFsL,
                parsedEm = tok.match(emOnlyRe),
                ob = {};
            if(parsedName){ // name style email address
                ob.lastName = $.trim(parsedName[parsedLcF?1:2]);
                ob.firstName = $.trim(parsedName[parsedLcF?2:1]);
                ob.email = parsedName[3];
                if(!emRe.test(ob.email)){
                    errant.push(ob);
                } else {
                    parsed.push(ob);
                }
            }
            else if(parsedEm){ // normal style email address
                ob.lastName = "";
                ob.firstName = "";
                ob.email = $.trim(parsedEm[1]);
                if(!emRe.test(ob.email)){
                    errant.push(ob);
                } else {
                    parsed.push(ob);
                }
            } else { // else, no match of any email format
                ob.email = tok; // assign the non-matching string to the email for View to do with what it wishes
                errant.push(ob);
            }
        });
    }



    // error code
    if(errant.length>0) {
        errorCode = 'errorEmailsFound';
    }
    else if(parsed.length===0&&errant.length===0) {
        errorCode = 'noEmailsFound';
    }

    return {
        emails: parsed,
        errorEmails: errant,
        errorCode: errorCode
    };
};// G5.util.parseEmails

// console.log('G5.util.parseEmails() TEST',
//     G5.util.parseEmails("aaron.m.stricker@gmail.com;<some@email.com>; Putta,"+
//         " Pramod <pramod.putta@biworldwide.com>; Joel Schou <joel.schou@biworldwide.com>;"+
//         " Stricker, Aaron <Aaron.Stricker@biworldwide.com>; bademail.mail.com;"+
//         " Man, Bad <crappy.email@asdfddd>")
// );


/* produce embed code for various URLs - returns HTML snippet
   - the embed regex and urls will no doubt need to be maintained
   - if this gets too crazy, just use this: https://github.com/starfishmod/jquery-oembed-all
*/
G5.util.oEmbedProviders = [
    {
        name: "youtube",
        detectRe: ["youtube\\.com/watch.+v=[\\w-]+&?", "youtu\\.be/[\\w-]+","youtube.com/embed"],
        idRe: /.*(?:v\=|be\/|embed\/)([\w\-]+)&?.*/,
        embedUrl: '//www.youtube.com/embed/{{id}}?wmode=transparent',
        embedHtml: '<iframe src="{{url}}" width="425" height="349" frameborder="0" allowfullscreen></iframe>'
    },
    {
        name: "vimeo",
        detectRe: ["www\.vimeo\.com\/groups\/.*\/videos\/.*",
            "www\.vimeo\.com\/.*",
            "vimeo\.com\/groups\/.*\/videos\/.*",
            "vimeo\.com\/.*"],
        idRe: /\/([0-9]+)(\?|.*)/,
        embedUrl: "//player.vimeo.com/video/{{id}}?title=0&byline=0&portrait=0",
        embedHtml: '<iframe src="{{url}}" width="800" height="450" frameborder="0"></iframe>'
    }
];
G5.util.oEmbed = function(url) {
    var provider,id,embedUrl,html;

    // try to find a provider
    provider = _.find(G5.util.oEmbedProviders, function(p) {
        var i;
        for(i = 0; i < p.detectRe.length; i++) {
            if((new RegExp(p.detectRe[i],'i')).test(url)) { return true; }
        }
        return false;
    });

    // try to extract an ID
    if(provider) {
        id = url.match(provider.idRe);
        console.log(id);
        id = id&&id.length>1?id[1]:null;
    }
    // no provider -- return null
    else {
        return null;
    }

    // construct oembed URL
    embedUrl = provider.embedUrl.replace("{{id}}",id);

    // generate html
    html = provider.embedHtml.replace('{{url}}',embedUrl);

    console.log('[INFO] G5.util.oEmbed - provider: ',provider,' id:',id,' html:',html);

    return html;
};// G5.util.oEmbed

// get system.debug value for the session:
// > G5.util.debug();
// set system.debug for the current session:
// > G5.util.debug(true|false);
G5.util.debug = function(to) {
    var type = to !== undefined ? 'POST' : 'GET',
        data = type == 'POST' ? { method : to===true?'update':'reset' } : {};

    $.ajax({
        url : G5.props.URL_SET_SYSTEM_DEBUG,
        type : type,
        data : data,
        dataType : 'g5json',
        success: function(resp) {
            console.log(resp.data.messages[0].text || resp.data.messages[0]);
        }
    });

    return type == 'POST' ? 'setting system.debug to '+to+'...' : 'getting system.debug...';
};

/* CM replacement
 * takes a special CM string with {0}, {1}, etc. placeholder variables and an array of substitutions that can be anything (HTML, straight text, both)
 * returns a new string that can be assigned to a variable, inserted directly, etc.
*/
G5.util.cmReplace = function(opts) {
    _.each(opts.subs, function(s,i) {
        opts.cm = opts.cm.replace('{'+i+'}', s);
    });

    return opts.cm;
};

/* smarten text strings -- straight quotes to curlies, etc.
*/
/*
G5.util.textSmarten = function(a) {
  a = a.replace(/(^|[-\u2014/(\[{"\s])'/g, "$1\u2018");      // opening singles
  a = a.replace(/'/g, "\u2019");                             // closing singles & apostrophes
  a = a.replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1\u201c"); // opening doubles
  a = a.replace(/"/g, "\u201d");                             // closing doubles
  a = a.replace(/--/g, "\u2014");                            // em-dashes
  return a;
};
*/

/* make text strings fit in their container
 * - useful for internationalization issues (in particular, modules)
 * - requires display: block or display: inline-block on the container
 * - do not use on huge blocks of text!
*/
G5.util.textShrink = function($els, opts) {
    var settings,
        defaults = {
            horizontal : true,  // set to false to turn off horizontal fitting
            vertical : true,    // set to false to turn off vertical fitting
            minFontSize : null  // set to an integer to prevent the text from scaling below a certain size
        };

    settings = $.extend({}, defaults, opts);

    $els.each(function() {
        var $el = $(this),
            fs = parseInt($el.css('font-size'), 10),
            lh = parseInt($el.css('line-height'), 10),
            maxlines = $el.outerHeight() / lh,
            // 1.2 is the "ideal" line-height. We test against this to compensate for ascenders and descenders when line-heights are not ideal
            vAdjustment = (lh < fs * 1.2) ? fs / (fs * 1.2) : 1;

        // clear out any existing inline font-size so we start fresh with the CSS values
        // lock the width and height for proper measuring while resizing
        $el
            .css('font-size', '')
            .removeData('fontSize')
            .height( $el.height() )
            .width( $el.width() );

        // check to see if we have a single line of text
        // if so, we're only worried about width
        if( Math.round($el[0].scrollHeight / lh) <= 1 ) {
            while ( $el[0].scrollWidth > $el.outerWidth() && settings.horizontal === true ) {
                if( settings.minFontSize && settings.minFontSize >= $el.data('fontSize') ) {
                    // unlock the width and height
                    $el.height('').width('');
                    return;
                }
                else {
                    doShrink($el);
                }
            }
        }
        // if we have multiple lines of text, we can fit both horizontally and vertically (depending on settings)
        else {
            while ( ($el[0].scrollWidth > $el.outerWidth() && settings.horizontal === true) || (($el[0].scrollHeight * vAdjustment > $el.outerHeight() || $el[0].scrollHeight / lh > maxlines) && settings.vertical === true) ) {
                if( settings.minFontSize && settings.minFontSize >= $el.data('fontSize') ) {
                    // unlock the width and height
                    $el.height('').width('');
                    return;
                }
                else {
                    doShrink($el);
                    lh = parseInt($el.css('line-height'), 10);
                    maxlines = $el.outerHeight() / lh;
                }
            }
        }

        function doShrink($el) {
            var elFontSize = parseInt($el.css('font-size'), 10),
                elFontSizeNew = elFontSize - 1; // reduce font size by 1 pixel

            $el
                .css('font-size', elFontSizeNew + 'px')
                .data('fontSize', elFontSizeNew);
        }

        // unlock the width and height
        $el.height('').width('');
    });

};

/* convert rgb color values into hex
 * - useful for jQuery's .css() utility
 * - can handle rgba, but the resulting eight digit hex string might not be too useful
 */
G5.util.rgbToHex = function(color) {
    if( color.match(/^#/) ) {
        return color;
    }

    function componentToHex(c) {
        if( !c ) {
            return '';
        }

        var hex = parseInt(c,10).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b, a) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b) + componentToHex(a);
    }

    color = color.replace(/[rgba()\s]/g, '').split(',');

    return rgbToHex(color[0],color[1],color[2],color[3]);
};


/* parse error object from HTML
 * this is used when STRUTS returns automatic HTML from its magic FORM validation
 * to an AJAX-JSON request.
 */
 G5.util.parseErrorsFromStrutsFormErrorHtml = function(html) {
    var $html = $(html),
        e = [];

    $html.find('.alert.alert-block.alert-error ul li').each(function(){
        e.push({text: $(this).text()});
    });

    return e;
};



G5.util.fmtNum = function(number, precision, keepZeros) {
    var fStr = '#,##0',
        decFmtChar = keepZeros ? '0' : '#';

    if(precision !== 0) {
        fStr += '.';
        precision = precision ? precision : 4;
    }

    for(;precision>0; precision--) {
        fStr += decFmtChar;
    }

    return _.isNumber(number) ? $.format.number(number, fStr) : number;
};



/* some validation and formatting
*/
G5.util.validation = G5.util.validation || {};
G5.util.validation.numTypeRegexStrings = {
    natural: "(^[1-9]\\d*$)",
    whole: "(^\\d+$)",
    decimal: "(^\\d*\\.?\\d{}$)"
};

G5.util.validation.isNum = function(num, type , precision, allowNegs, allowZero) {
    var reStr = G5.util.validation.numTypeRegexStrings[type],
        re,m,ok;

    if(!allowZero && parseFloat(num) === 0) {
        return false; // we done
    }

    num = num+''; // make sure this is a string

    if(!num) { return false; }

    if(!reStr) {
        console.error('[ERROR] G5.util.validation.isNum - unsupported number type: '+type);
        return false;
    }

    if(allowNegs) {
        reStr = reStr.replace("^", "^-?");
    }

    if(type == 'decimal' && precision) {
        reStr = reStr.replace("{}", "{0,"+precision+"}");
    } else if(type == 'decimal') {
        reStr = reStr.replace("{}", "*");
    }

    re = new RegExp(reStr, "gi");
    m = num.match(re);
    ok = m && m.length ? true : false;

    return ok;
};



