/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
console,
_,
$,
G5,
ModuleView,
TemplateManager,
ClaimModuleView:true
*/
ClaimModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        //allowed dimensions, sorted from smallest - biggest
        this.model.set('allowedDimensions',[
            {w:1,h:1}, // icon
            {w:2,h:1}, // icon+title
            {w:2,h:2}, // 2x2 square
            {w:4,h:2}, // 4x2 square
            {w:4,h:4}  // 4x4 square
        ],{silent:true});
        
        //on template loaded and attached
        this.on('templateLoaded', function() {
            //console.log('The template is done, ajax firing');
            this.fetchClaims();

            // start the loading state and spinner
            this.dataLoad(true);
        });
    },
    fetchClaims: function() {
        console.log("[INFO] ClaimModuleView: fetchClaims called");

        var self    = this,
            tplName = 'claimModuleItem',
            tplUrl  = G5.props.URL_TPL_ROOT || G5.props.URL_APPS_ROOT + 'productClaim/tpl/',
            render;
            if (typeof G5.props.URL_JSON_CLAIM_ACTIVITY == 'string' || G5.props.URL_JSON_CLAIM_ACTIVITY instanceof String) {
            //console.log("IT was a string.");
                render  = function(tpl){

                    $.ajax({
                        dataType: 'g5json',
                        type: "POST",
                        url: G5.props.URL_JSON_CLAIM_ACTIVITY, 
                        // data: params,
                        success: function(serverResp){
                            //regular .ajax json object response
                            console.log("[INFO] ClaimModuleView: LoadData ajax call successfully returned this JSON object: ", serverResp);

                            /*
                            var discussions = serverResp.data.discussions,
                                noResults   = serverResp.data.default;

                            if(!!discussions.length) {
                                self.renderSlides(tpl, discussions, function(){
                                    self.ellipsis({
                                        $el: ".multiline-ellipsis",
                                        lineCountLimit: 3
                                    });

                                    self.startCycle({
                                        containerResize: false,
                                        height: null,
                                        width: null,
                                        fit: true
                                    }, "dots"); //start the carousel

                                });
                            } else {
                                self.renderSlides(tpl, noResults);
                            }
                            */

                            var claims = serverResp.data.claimApprovals;

                            // if(!!discussions.length) {
                            self.renderClaims(tpl, claims);
                            // } else {
                                // self.renderSlides(tpl, noResults);
                            // }
                            }
                        });
                };
                TemplateManager.get(tplName, function(tpl){ return render(tpl); }, tplUrl);
            } else {
                console.log("[INFO] ClaimModuleView: Data loaded from bootstrap: ", G5.props.URL_JSON_CLAIM_ACTIVITY);
                var claims = G5.props.URL_JSON_CLAIM_ACTIVITY.claimApprovals;
                self.renderClaims(tpl, claims);
                TemplateManager.get(tplName, function(tpl){ return render(tpl); }, tplUrl);
            }
    },
    renderClaims: function(template, results, callback){
        console.log("[INFO] ClaimModuleView: renderClaims called");

        var self = this,
            $claimsWrapper = this.$el.find('.claimsWrap ul');

        // stop the loading state and spinner
        this.dataLoad(false);

        if( results.length <= 0 ) {
            results.push({_noResults:true});
        }
        _.forEach(results,function(result, i){
            result.eo = (i % 2 === 0) ? 'odd' : 'even';
            $claimsWrapper.append(template(result));
        });
    }

});