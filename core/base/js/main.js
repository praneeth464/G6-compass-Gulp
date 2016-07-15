/*
This is a new way of organizing the site's JS functions. See the following URLs for background reading.
http://paulirish.com/2008/automate-firing-of-onload-events/
http://www.viget.com/inspire/extending-paul-irishs-comprehensive-dom-ready-execution/
*/
G5 = {
    common: {
        init: function() {
            // application-wide code
            
            // a nice place to store global variables
            G5.props = {};
            
            // Many additional JS libraries can be loaded on demand.
            // Any script loaded from within this document should prepend a relative path reference
            // "path" below defines that relative reference.
            var path = $('script[src*="main.js"]').attr('src').split('?')[0]; // remove any ?query=string
            G5.props.jspath = path.split('/').slice(0, -1).join('/')+'/';  // remove last filename part of path
            
            // this retrieves URL parameters and stores them for use elsewhere
            var params = window.location.search.slice(1).replace(/&/g,'=').split('=');
            G5.props.urlparams = {};
            for(i=0; i<params.length; i++) {
                G5.props.urlparams[ params[i] ] = params[i+1];
                i++;
            }
            
        }
    },
    
    homeApp: {
        init: function() {
            
        }
    },
    
    budgetTracker: {
        init: function() {
            console.log('budgetTracker app');
            // code that runs on every budgetTracker page
        },
        
        pageDetail: function() {
            console.log('budgetTracker detail page');
            // code that runs on the budgetTracker detail page only
        }
    }
};

UTIL = {
    exec: function( app, page ) {
        var ns = G5;
        page = ( page === undefined ) ? "init" : page;
        
        if ( app !== "" && ns[app] ) {
            if( typeof ns[app][page] == "function" ) {
                ns[app][page]();
            }
            else if( page && page.split(':').length >= 2 ) {
                page = page.split(':');
                if( typeof ns[app][page[0]] == "function" ) {
                    ns[app][page[0]](page[1]);
                }
            }
        }
    },

    init: function() {
        var body = document.body,
        app = body.getAttribute( "data-app" ),
        page = body.getAttribute( "data-page" );

        UTIL.exec( "common" );
        UTIL.exec( app );
        UTIL.exec( app, page );
    }
};