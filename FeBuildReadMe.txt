
-----------------------------------
Back End perspective
-----------------------------------

Two XML build targets to be used
    DO NOT USE the default fe.DoIt target is intended for Front end development

    fe.backend.build.dev
    fe.backend.build.prod

Currently, any integration with Install Wizard has not been addressed, except that this uses an ant build script.


-----------------------------------
Summary of File Structure
-----------------------------------

This file structure represents the files stored in CVS and what the
build script producues as output.

-----------------------------------
    src
        fe
            build           (Not stored in CVS, deleted and built fresh from source code)
                ci
                dev
                prod
                temp
            buildTools
            core
            custom
                apps
                    ...
                    leadboard (app name)
                        js
                        scss
                        tpl
                    ...
            skins
                default
                    img
                        apps
                            ...
                            gamification (app name)
                                badge_placeholder1.jpg
                            ...
                        flags
                        socialIcons
                    scss
                        default.scss
                skin1
                skin2
                skin3
-----------------------------------

-----------------------------------
Front End and overall perspective
-----------------------------------
The fe.build.xml is a large number of lines, but makes more use of white space than most ant scripts
for readability.  Ant's usage of XML is far from an easily readable scripting language.
    Programs are meant to be read by humans and only incidentally for computers to execute -- Donald Knuth. 

The back end build targets set properties to do special handling.
    fe.is.backend   true
    fe.backend      is set to "dev" or "prod"

The build runs in seconds, under a minute, unless some java code is going through
virus scan on access.  (This is also without minification, which is more time consuming)

The build depends on the "dev" build being done first.  
At this point, there is a "ci" build that does nothing but copy the results from the "dev" build.
(note:  The "ci" build was meant for a continuous integration build server that was never realized.)
The "prod" build depends on the "ci" build.

For backend build targets, the default target fe.DoIt is called at the end of the backend build targets 
after setting up some properties for executing the build.

    ant -f fe.build.xml

For frontend development, the default target fe.DoIt is called and will copy the fe.user.DEFAULT.properties
file into a fe.user.{user.name}.properties file.  The default setup is to do only the "dev" build.  
This is where front end developers can easily edit and change property values to be overridden.  
This includes setting fe.build.prod.request or fe.build.ci.request or fe.build.dev.request as needed.

The backend could override properties by setting the properties before calling this build or 
within the fe.backend.build.dev or fe.backend.build.prod targets at the beginning of the build
file before calling the fe.DoIt target.

The fe.user.{user.name}.properties file is read first to override any settings in the fe.build.properties file.
The flow of tasks is:

-fe.ant.contrib:        (this loads the ant-contrib-1.0b3.jar for the front end and is skipped for the back end)
-fe.load.properties:    Reads fe.user.{user.name}.properties file (fe only) and reads fe.build.properties
-fe.list.props:         Echos out property values or skips if fe.show.properties=false
-fe.assert.setup:       Looks for any requirements
-fe.help:               Summarizes command line sytax
-fe.clean:              Deletes the fe\build directory
-fe.init.temp.core:     Copies files to the fe\build\temp directory from fe\core and overriding from the fe\custom directory
                            with fe.custom.override property set true
                            without files in fe.exclude.core.dirs property
-fe.init.temp.skins:    Copies fe\skins (all inclusive in dir)
-fe.init.dev:           Flattens all tpl and ajax files into temp
-fe.js.lint:            NOTHING DONE
-fe.validate:           NOTHING DONE
-fe.replace:            Does any modification of source
-fe.concat.minify:      Flatten *.js files into one directory, concatenates, and minifyies as specified
-fe.js.libs:            Moves *.js files unless concat ocurred
-fe.scss:               Builds css/style.css with compass
-fe.tpl:                Moves template files
-fe.root:               Moves root directory files
-fe.skins:              Builds all skins SKINNAME.css files
-fe.deliver.dev:        Will deliver dev build to another specified place with fe.deliver.dev.to property

-fe.init.ci:            Files moved
-fe.test:               NOTHING DONE for automated testing
-fe.document:           NOTHING DONE for automated document generation

-fe.init.prod:          Files moved
-fe.bake:               NOTHING DONE for post process

BUILD SUCCESSFUL
Total time: 30 seconds

-----------------------------------
Minification
-----------------------------------

fe.minify.after.concatenate = true
-----------------------------------
This will cause minification to occur for any environment, dev, ci, or prod (see below)


fe.build.prod.concatenate.js = true
fe.build.ci.concatenate.js = false
fe.build.dev.concatenate.js = false
-----------------------------------
Each environment can be set up differently to test the concatenation and then possibly minification (see above)


fe.concatenate.skip = modernizr.js,jquery.js
-----------------------------------
These files will be skipped for minification.  This is where extra added library files could be added for inclusion, but not minification.

fe.concatenate.order = safeconsole.js,underscore.js,backbone.js,handlebars.js,json2.js,jquery-ui.js,bootstrap-transition.js
-----------------------------------
This is a big list of files in a specific order that will be concatenated together into a script.js file and if not minified (comments get removed during minification), there will be a comment before and after the file source to help find what file a line number error in this big file originally came from.


fe.custom.override = false;
-----------------------------------
This will allow the overriding of files from the "fe/custom" directories.
This will need to be changed for custom code when real custom code exists.


fe.exclude.core.dirs
-----------------------------------
This can be set to exclude files in directories when building.  These directories will not be moved into
the "build/temp" directory where everything is built.
fe.exclude.core.dirs = **/.sass-cache/**,**/libs/pluginsBU/**


fe.no.line.comments.css = true
-----------------------------------
This can be used to eliminate the line comments generated with the compass compile.  Handy when comparing
files and don't want to see all those comments.

fe.deliver.dev.to = c:/a/path/you/would/like
-----------------------------------
If this is set to some path, it will copy the build/dev directory contents to some location after the build is run.
Sam used this to deliver to a networked path on another machine for his development.

-----------------------------------
Skinning
-----------------------------------

The buildSkinsOnly.xml and corresponding properties file are meant for front end development with
checking out only skins.

To be run from the same directory src/fe

ant -f skins/buildSkinsOnly.xml            (note:  This build file mistakenly says skins/fe.buildSkinsOnly.xml)
ant -f fe.build.xml

fe.skin.ALL.with.common.config.rb = false
-----------------------------------
For skinning, the config.rb for compass drives css generation.  There is currently one such file
    core/base/config.rb

With this flag set it will be used.  
Otherwise with this flag set to "false", for a skin named "default" the following existing file will be used
    skins/default/config.rb (if it exists)
    skins/config.rb (if it exists)   (note:  not sure if this works, looks to be a bug with visual debugging)
    core/base/config.rb

fe.build.css.in.source = true
-----------------------------------
# build the style.css in the source for assets/core/base/css as well as the build dir


-----------------------------------
Debugging
-----------------------------------

fe.show.properties = false
-----------------------------------
This can be used to show the property values after they are all loaded at the beginning of the build

fe.save.build.temp = false
-----------------------------------
This can be used to save the build/temp directory for inspection after the completes instead of the normal
deletion that would occur.  This directory is where all files are moved to execute the build from the CVS
source directory that the fe.build.xml file is executed.

fe.debug.js = false
-----------------------------------
I used this to globally replace in .js code a specific comment that could be placed at the beginning of a line
and conditionally removed to expose some code.  This then was safe to check into CVS without affecting others.

fe.dev.custom = false
-----------------------------------
I used this to do SPECIAL overriding of any and all files in the "custom" directory over the top of "core" for my specific test code.
This is in addition to "core/apps" that was originally designed into the build script.


-----------------------------------
Log Statements
-----------------------------------

fe.removelogs.js = false
-----------------------------------
Use this to remove log statements with '[INFO]' in them.