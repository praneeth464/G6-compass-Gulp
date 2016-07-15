/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
$,
_,
Handlebars,
G5,
TemplateManager:true
*/

//Template manager -- this can be modified to accomodate inline templates too.
TemplateManager = {

    //cache of templates, vars and sub templates
    templates: {},
    variables: {},
    subTemplates: {},

    //ajax request of template promises
    promises: {},

    get: function(id, callback, url, noHandlebars, async){
        var that = this,
            template = this.templates[id],
            variables = this.variables[id],
            subTemplates = this.subTemplates[id],
            $el;

        if (template) {//is cached? Immediately callback on template.

            // it seems there are some pages that use TemplateManager and assume synchronous responses: templates are always embedded, etc.
            // therefore, we need a way to force TemplateManager to behave synchronously
            if( async === false ) {
                callback(template,variables,subTemplates);
            }
            // otherwise, if async is not explicitly false, we assume that it's going to be true
            else {
                // this setTimeout pulls the cached/DOM templates out of the main thread, resulting in similar asynchronous behavior as the remote template load
                // for some reason, certain templates were having issues when loaded locally instead of remotely
                // this is not a good solution, FYI
                setTimeout(function() {
                    callback(template,variables,subTemplates);
                }, 1);
            }

            console.log('[INFO] TemplateManager: loaded ['+id+'] from cache');

        } else {//not cached

            $el = $('#'+id+'Tpl');

            if($el.length>0){//template found in DOM

                // it seems there are some pages that use TemplateManager and assume synchronous responses: templates are always embedded, etc.
                // therefore, we need a way to force TemplateManager to behave synchronously
                if( async === false ) {
                    that.prepareTemplateAndCallback($el.html(), id, callback, noHandlebars);
                }
                // otherwise, if async is not explicitly false, we assume that it's going to be true
                else {
                    // this setTimeout pulls the cached/DOM templates out of the main thread, resulting in similar asynchronous behavior as the remote template load
                    // for some reason, certain templates were having issues when loaded locally instead of remotely
                    // this is not a good solution, FYI
                    setTimeout(function() {
                        that.prepareTemplateAndCallback($el.html(), id, callback, noHandlebars);
                    }, 1);
                }

                console.log('[INFO] TemplateManager: loaded ['+id+'] from local code');

            }else{//try to load template remotely

                this.loadRemoteTemplate(id,callback,url,noHandlebars,async);
            }
        }

    },

    // load a template remotely and perform callback upon retreival success
    // (does not create mult. req. for single tmpl)
    loadRemoteTemplate: function(id,callback,url,noHandlebars,async){
        var that = this;

        //get the promise of this template being downloaded
        var promise = this.loadRemoteTemplateAsync(id,url,async);

        //create a template out of it when it returns UNLESS noHandlebars flag is true
        promise.done(function(template){

            that.prepareTemplateAndCallback(template, id, callback, noHandlebars);

        });
    },

    prepareTemplateAndCallback: function(template, id, callback, noHandlebars) {
        var that = this,
            tmpl, vars = {}, subTpls = {},
            parseVarObj = this.parseVariables(template),
            parseSTObj = this.parseSubTemplates(parseVarObj.tplClean);

        template = parseSTObj.tplClean || template; // update to cleaned version of tpl
        subTpls = this.subTemplates[id] || parseSTObj.subTpls;
        vars = this.variables[id] || parseVarObj.variables;
        tmpl = this.templates[id] || (noHandlebars ? template : Handlebars.compile(template) );


        this.subTemplates[id] = subTpls; // cache
        this.variables[id] = vars; // cache
        this.templates[id] = tmpl; // cache

        // make sub templates available from TemplateManager.get(id) function
        // use BaseTplId.SubTplId as the id to pass the .get() function
        _.each(subTpls,function(stVal,stKey){
            that.templates[id+'.'+stKey] = stVal;
        });

        callback(tmpl, vars, subTpls);
    },

    // this uses promises to cache remote requests for templates
    // keeping it from attempting to load the same template
    // multiple times before the first request returns.
    loadRemoteTemplateAsync: function(id,url,async){
        var promise,
            tplUrl = url + id + G5.props.TMPL_SFFX
            params = { responseType: 'html' };

        if(!url){console.log('[ERROR] No URL for remote templateId: '+id);}

        promise = this.promises[id] ||
        $.ajax({
            url: tplUrl,
            data: params,
            async: async || true,
            success: function(template){
                console.log('[INFO] TemplateManager: remotely loaded ['+id+'] "'+tplUrl+'"');
            },
            dataType: 'g5html'
        });

        this.promises[id] = promise;
        return promise;
    },

    // parses variables (JSON objects) out of template
    parseVariables: function(tplString) {
        var re = "<!--tplVariable\\.([a-zA-Z_-]+)=([\\S\\s]+?)tplVariable-->",
            reA = new RegExp(re,"g"),
            reB = new RegExp(re),
            allMatches = tplString.match(reA),
            vars = {}; // create variables on this obj

        if(!allMatches) return {tplClean:tplString,variables:{}}; // EXIT

        _.each(allMatches, function(str) {
            var m = str.match(reB),
                k = m[1], // variable name/key
                v = $.trim(m[2]); // value
            try{ vars[k] = JSON.parse(v); } // assign var
            catch(err) {
                console.error('[ERROR] TemplateManager: unable to parse variable['+k+']: ',err.type);
            }

        });

        return { tplClean: tplString.replace(reA,''), variables: vars };
    },

    // parses subTemplates out of template
    parseSubTemplates: function(tplString) {
        var re = "<!--subTpl\\.([a-zA-Z_-]+)=([\\S\\s]+?)subTpl-->",
            reA = new RegExp(re,"g"),
            reB = new RegExp(re),
            allMatches = tplString.match(reA),
            subTpls = {}; // create subTpls on this obj

        if(!allMatches) return {tplClean:tplString,subTpls:{}}; // EXIT

        _.each(allMatches, function(str) {
            var m = str.match(reB),
                k = m[1], // variable name/key
                v = $.trim(m[2]); // value
            try{ subTpls[k] = Handlebars.compile(v); } // assign template
            catch(err) {
                console.error('[ERROR] TemplateManager: unable to parse subTpl['+k+']: ',err.type);
            }

        });

        return { tplClean: tplString.replace(reA,''), subTpls: subTpls };
    }


};

