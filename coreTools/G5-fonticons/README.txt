G5 Fonticons README
====================

G5 Fonticons
the custom icon font designed just for G5
-------------------------------------------------------
Completely borrowed from FontAwesome:
  http://fortawesome.github.com/Font-Awesome/
Technique for building a custom icon font found here:
  http://www.webdesignerdepot.com/2012/01/how-to-make-your-own-icon-g5-webfont/

Court Cromwell-Carl (cromcarl@biworldwide.com) built the first version of this font with Type Tool
Joel Schou (schou@biworldwide.com) iterated additional versions and implemented it into G5

License
-------------------------------------------------------
Copyright BI WORLDWIDE. All Rights Reserved.




G5-Fonticons.ai
========================================
This is an Adobe Illustrator file that contains the artwork for all the glyphs in the font.
The orange box around each glyph is the same boundary used by Type Tool when setting the glyph in place.
The white/black checkerboard is the approximate outline of the .module .title-icon-view .icon-g5-* container.



G5-Fonticons.vfb
========================================
This is the raw font file for editing in Type Tool.

Adding a new icon
----------------------------------------
Click on the .notdef glyph in the top-left corner of the table.
Give the glyph the new appName in the 'name' field in the Glyph Properties panel.
Give the glyph its new unicode number (i.e. F026 in the 'unicode' field in the Glyph Properties panel.
    NOTE: app/module icons should start with "F0". Utility icons should start with "F1". Check the current _g5-fonticons.scss file to see which values come next.
Hit [Apply].
Double-click your new glyph to open it in the editor.
Notice the guides in the rulers of your editor.
    The top horizontal guide should already be set at 1536.
    The right vertical guide will need to be moved.
        For an app/module icon, move it to 1536. You can do this by right-clicking on the guide and setting the |<-->| value to 1536.
        For a utility icon, we will move it after you've scaled your artwork.


Moving glyphs from Illustrator to Type Tool
----------------------------------------
Use the Selection Tool to choose the glyph.
While it is selected, hold the shift key and use the Direct Selection Tool to choose the orange box behind the chosen glyph.
    NOTE: you may need to unlock the "Type Tool boundary" layer before the orange box will select.
    NOTE: for utility icons, the orange box will be considerably larger than the icon. That's OK.

all icons
--------------------
Copy these paths and paste into your glyph editor in Type Tool.
    NOTE: your artwork may end up rather far down the page. Somehow X/Y position data comes through with the copy/paste.
    NOTE: selected paths in Type Tool are red.

utility icons
--------------------
If the left edge of your icon paths do not line up with the left edge of the orange box path, select only the icon paths and move the icon until the left edges line up.
    NOTE: it's OK if your orange box path remains extremely wide.
    NOTE: is's also OK if your icon extends above or below the box path.
Deselect all your paths and then find the right edge of your very wide box path.
Use a drag to select only the right side path of the box.
Resize the box so it is exactly as wide as the icon paths. You can zoom in to get it right on.

all icons
--------------------
Drag your pasted paths so the bottom-left corner of the paths is directly at the cross-hair looking symbol in the glyph editor.
    NOTE: if you right-click on your selected paths and choose Properties..., you will see the (X, Y) position in the Selection Properties palette.
After your paths are at (0, 0), right click on your selected paths and choose Free Transform.
Hold the shift key to keep all your proportions correct. Drag the top-right corner until your box lines up with the top guide.
    NOTE: you can zoom in to make lining up the box easier.
    NOTE: if your icon paths extend above or below the box path, you need to make sure the box path lines up with the bottom-left corner and the top guide.
    NOTE: double-click on the white artboard to complete the transform.
    NOTE: right-click on the paths, choose Properties... and note the (X, Y) values for the top-right corner. Y should always be 1536. X will be 1536 for app/module icons. For utility icons, take note of the number.
After your paths are placed correctly, double-click on the artboard to deselect all paths.
Double-click your box path to select it.
Right-click the box and choose Delete to remove it from the artboard.
Select your remaining glyph paths (dragging a box selection around them will work).
Hold the shift key and hit the down arrow 13 times, release the shift key and press the up arrow twice.
    NOTE: doing this bumped the paths down 128 points(?) to match FontAwesome's vertical alignment as of version 3.0.2
    NOTE: I have no idea why this works how it does. I had to dissect FontAwesome to figure out what was going on

utility icons
--------------------
Drag the right side dotted guide line until it lines up with the right edge of your icon paths.
Zoom in to make sure it is lined up correctly.

Exporting the font from Type Tool
----------------------------------------
Go to File > Generate Font...
Choose the same folder where the current G5-fonticons.ttf file lives.
Make sure the Font Format drop down says "Win TrueType/OpenType TT" and do not change any Options.
Click Save and replace the existing .ttf file



G5-Fonticons.ttf
========================================
This is the functional font file generated by Type Tool. It is not yet web-ready but can be previewed on your local machine in Font Book on OS X.

Converting the font to a webfont
----------------------------------------
Go to http://www.fontsquirrel.com/tools/webfont-generator
You should land on the font-face generator. If you do not, click "webfont generator" in the nav bar.
Use the Add Fonts button to retrieve the new .ttf file from your computer
Click on the (•) Expert radio button. You will get a huge list of options
    - Font Formats: [√] TrueType, [√] SVG, [√] WOFF, [√] EOT Compressed
    - TrueType Hinting: (•) Font Squirrel
    - Rendering: [√] Fix Vertical Metrics, [√] Fix GASP Table
    - Fix Missing Glyphs: [√] Spaces, [√] Hyphens
    - X-height Matching: (•) None
    - Protection: [none]
    - Subsetting: (•) Custom Subsetting...
        - Uncheck anything that is checked by default.
        - Scroll down to Unicode Ranges:
        - Enter the unicode name for each glyph in your custom font in this box, separated by commas. i.e. [f011, f01c, f103-f106]
          (You can determine the necessary range by looking in core/base/scss/partials/_variables.scss and looking at the list of values in $g5fonticons_modules)
    - CSS: [none] (default stylesheet name is fine)
    - OpenType Options: [none]
    - Advanced Options: Font Name Suffix: [blank] (other defaults are fine)
    - Shortcuts: (optional)
    - Agreement: [√] Yes, the fonts I'm uploading are legally eligible for web embedding.
Click [Download Your Kit] to download the ZIP of the converted font.
Unzip the downloaded archive to a temporary location.
Rename each of the .eot, .svg, .ttf, and .woff files to "g5-fonticons-webfont.*"
Copy them into the G5-fonticons folder in the same directory as the .ttf file you just created from Type Tool, replacing the existing files of the same names.



G5-fonticons/g5-fonticons-webfont.*
========================================
These are the web-ready fonts that get saved to the web server for use in the G5 application.

Installing the font on G5
----------------------------------------
Copy each of the .eot, .svg, .ttf, and .woff files into core/base/rsrc/, replacing the existing files of the same names.
Open core/base/scss/partials/_g5-fonticons.scss and core/base/scss/g5-fonticons-ie7.scss in your text editor.
Add the code necessary for your newly-added icons at the proper sequential location.
Test your new icons in your static files before committing all the changes to CVS.

