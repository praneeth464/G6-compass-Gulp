/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
ModuleView,
CelebrationRecognitionPurlModel,
CelebrationRecognitionPurlModuleView:true
*/
CelebrationRecognitionPurlModuleView = ModuleView.extend({

    //override super-class initialize function
    initialize:function(opts){
        var self = this;

        //this is how we call the super-class initialize function (inherit its magic)
        ModuleView.prototype.initialize.apply(this, arguments);

        //inherit events from the superclass ModuleView
        this.events = _.extend({},ModuleView.prototype.events,this.events);

        this.model.set(
            'allowedDimensions',[
                { w:2, h:2 },
                { w:4, h:2 }
            ],
            { silent: true }
        );

        //doing the product model in the view (do not use the 'model' prop, this has a module model)
        this.recognitionModel = new CelebrationRecognitionPurlModel();


        //when the module template is loaded, store the subTpl for later
        this.on('templateLoaded',function(tpl, vars, subTpls){
            this.purlCommentsTpl = subTpls.purlCommentsTpl;
            //load initial destinations
            self.recognitionModel.loadData();
        },this);

        this.recognitionModel.on('dataLoaded', function(){
            self.renderComments();
        });
    },
    renderComments: function(){
        var self = this,
            comments = self.recognitionModel.get('purlComments'),
            len = comments.length,
            tpl = this.purlCommentsTpl,
            commentsWithImages = _.where(comments, {hasImg: true}),
            picCount = commentsWithImages.length,
            // commentStr = "",
            // c1Img = comments[0].hasImg,
            // c2Img = null,
            // c3Img = null,
            // c4Img = null,
            // firstPic = false,
            // secondPic = false,
            $purlRight = this.$el.find('.purl-col.right'),
            $purlLeft = this.$el.find('.purl-col.left');

        if(picCount > 1) {
            comments = commentsWithImages;
        }

        if(len == 1) {
            $purlLeft.addClass('full');
        }

        switch(picCount) {
            // if there is only one picture, we have to put it in the right half or the left half depending on where it is in the list
            case 1:
                var cimg = _.find(comments, function(c) {return c.hasImg;}),
                    cidx = _.indexOf(comments, cimg),
                    $imgCont = cidx < 2 ? $purlLeft : $purlRight,
                    $noImgCont = cidx < 2 ? $purlRight : $purlLeft;

                _.each(comments, function(c, i) {
                    if(i == cidx) {
                        $imgCont.append(tpl(cimg));
                    }
                    else {
                        $noImgCont.append(tpl(c));
                    }
                });
                break;

            // if there are no pictures or more than one picture, just shove the comments in the two columns, alternating between left and right
            default:
                _.each(comments, function(c, i) {
                    if(i % 2 === 0) {
                        $purlLeft.append(tpl(c));
                    }
                    else {
                        $purlRight.append(tpl(c));
                    }
                });
                break;
        }
        /*
        switch (len) {
            case 4:
                c4Img = comments[3].hasImg;
            case 3:
                c3Img = comments[2].hasImg;
            case 2:
                c2Img = comments[1].hasImg;
        }

        for (i = 0; i < len; i++) {
            if (comments[i].hasImg) {
                picCount++;
                if (!firstPic) {
                    firstPic = comments[i]; // grab the first comment object that has a picture
                }
                else if (!secondPic) {
                    secondPic = comments[i]; // grab the second comment object that has a picture
                }
            }
        }

        switch (picCount) {
            case 0:
                for (i = 0; i < len; i++) {
                    c = $.extend(true,{}, comments); // clone

                    if (i < 2) {
                        $purlLeft.append(tpl(c[i]));
                    }
                    else {
                        $purlRight.append(tpl(c[i]));
                    }
                }
                break;
            case 1:
                c = $.extend(true,{}, comments);
                switch (len) {
                    case 1:
                        $purlLeft.append( tpl(c[0]) );
                        break;
                    case 2:
                        $purlLeft.append( tpl(c[0]) );
                        $purlRight.append( tpl(c[1]) );
                        break;
                    default:
                        // insert three comments and place comment with pic in correct column
                        if (c1Img) {
                            commentStr = tpl(c[1]) + tpl(c[2]);
                            $purlLeft.append( tpl(c[0]) ); // place first comment with image in left column
                            $purlRight.append( commentStr ); // place comments in right column
                        }
                        else if (c2Img) {
                            commentStr = tpl(c[0]) + tpl(c[2]);
                            $purlLeft.append( commentStr ); // place comments in left column
                            $purlRight.append( tpl(c[1]) ); // place second comment in right column
                        }
                        else if (c3Img) {
                            commentStr = tpl(c[0]) + tpl(c[1]);
                            $purlLeft.append( commentStr ); // place comments in left column
                            $purlRight.append( tpl(c[2]) ); // place third comment in right column
                        }
                            else if (c4Img) {
                                commentStr = tpl(c[0]) + tpl(c[1]);
                                $purlLeft.append( commentStr ); // place comments in left column
                                $purlRight.append( tpl(c[3]) ); // place fourth comment in right column
                            }
                            else {
                                // throw new Error("Error in PURL Comments: 'picCount' is 1, but no images are found.");

                                console.log("Error in PURL Comments: picCount is 1, but no images are found.")
                            }
                            break;
                    }
                    break;
                default:
                // append the two most recent comments that have images
                $purlLeft.append( tpl(firstPic) );
                $purlRight.append( tpl(secondPic) );
                break;
        }
        */

        this.readMore();
    },
    readMore: function(){
        var $purlComment = this.$el.find('.comment-text');


        $purlComment.each(function(){
            var $content = $(this).find('p'),
                contentHeight = $content[0].scrollHeight,
                containerHeight = $content.outerHeight();

            if (contentHeight > containerHeight) {
                // add "read more" link
                $('#protoReadMore').clone().removeAttr('id').appendTo($content);
            }
        });
    }
});