/*
    Found here: http://stackoverflow.com/a/1022672

    Usage: 
    .ellipsis {
        white-space: nowrap;
        overflow: hidden;
    }

    .ellipsis.multiline {
        white-space: normal;
    }

    <div class="ellipsis" style="width: 100px; border: 1px solid black;">Lorem ipsum dolor sit amet, consectetur adipisicing elit</div>
    <div class="ellipsis multiline" style="width: 100px; height: 40px; border: 1px solid black; margin-bottom: 100px">Lorem ipsum dolor sit amet, consectetur adipisicing elit</div>

    <script type="text/javascript" src="/js/jquery.ellipsis.js"></script>
    <script type="text/javascript">
    $(".ellipsis").ellipsis();
    </script>
*/

(function($) {
    $.fn.ellipsis = function()
    {
        return this.each(function()
        {
            var el = $(this);

            if(el.css("overflow") == "hidden")
            {
                var text = $.trim(el.html());
                var multiline = el.hasClass('multiline');
                var height, width;
                var t = $(this.cloneNode(true))
                    .hide()
                    .css({
                        position: 'absolute',
                        overflow: 'visible',
                        width: multiline ? el.width() : 'auto',
                        maxWidth: multiline ? el.width() : 'none',
                        height: multiline ? 'auto' : el.height(),
                        maxHeight: multiline ? 'none' : el.height()
                    });

                el.after(t);

                height = function() { return t.height() > el.height(); };
                width = function() { return t.width() > el.width(); };

                var func = multiline ? height : width;

                while (text.length > 0 && func())
                {
                    text = text.substr(0, text.length * 0.975);
                    t.html(text + "...");
                }

                el.html(t.html());
                t.remove();
            }
        });
    };
})(jQuery);