Reference Of Significant Changes
src/fe/ChangesReadMe.txt

-----------------------------------
mm/dd/12 WHO Next change
-----------------------------------

-----------------------------------
7/9/13 JDS Basedir made more sophisticated
-----------------------------------
Previously, the build assumed that it was running inside a directory named "fe" with a parent named "src".
This hard-coded file path prevented the build from successfully running in a self-contained folder of FE code.
    (For example, releases in CVSROOT/products/G5 Creative Development/releases could not run the build.)

With this change, the main backend build.xml file can set fe.basedir property ahead of time. If it does so,
    this buildfile uses that value. If it does not do so, this buildfile assumes it is running out of the
    current directory and can be run from any structure.

-----------------------------------
8/24/12 ARN Image files moved
-----------------------------------
Image files have moved to the SKINS/DEFAULT/IMG directory and subdirectories.
The SKINS directory and its subdirectories will be delivered in the build.

1.  These 3 directories
        skins/default/img
        img/flags
        img/socialIcons
    now contain what was in 
        core/base/img
        core/base/img/flags
        core/base/img/socialIcons

2.  The apps subdirectories
        img/apps
        img/apps/budgetTracker
        img/apps/ ...
    now contain what was in
        core/apps/budgetTracker/img
        core/apps/ ... /img

3.  Image references have changed inside scss partials, to be relative to skins/default/img,
    where all images are now found.

    As in _budgetTracker.scss
    From:
        background: image-url('../../apps/budgetTracker/img/refresh-icon.png') no-repeat scroll 45% 50%;
    To:
        background: image-url('apps/budgetTracker/refresh-icon.png') no-repeat scroll 45% 50%;

    All of these image references should now use image-url('someImageWithRelativePathFrom/skins/default/img')
    The ticks need to be used around a literal path, but not around a $variable-icon-url as in _claim.scss

    For example, 
    From:
        background: url(../../apps/plateauAwards/img/popdown-bg.png) repeat-x;
    To:
        background: image-url('apps/plateauAwards/popdown-bg.png') repeat-x;

    Or as in _claim.scss
    From:
        @include background(stylesheet-url($claim-icon-url) no-repeat scroll 50% 55%,
    To:
        @include background(image-url($claim-icon-url) no-repeat scroll 50% 55%,

4.  Image references have changed inside html and templates, like destinationsModule.html
    From:
        <img alt="" src="../apps/destinations/img/slideshow-placeholder1.png">
    To:
        <img alt="" src="img/destinations_slideshow-placeholder1.png">

    Note:  The fe.build.xml replaces '../../skins/' with simply 'skins/'

5.  Image references have changed inside json files for FE development, like
    From:
        "img": "img/badge_placeholder1.jpg",
    To:
        "img": "img/gamification_badge_placeholder1.jpg",

    Note:  The fe.build.xml replaces '../../skins/' with simply 'skins/'

