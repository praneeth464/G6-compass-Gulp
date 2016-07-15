# Require any additional compass plugins here.
# require 'bootstrap-sass'


# Set this to the root of your project when deployed:
http_path = "/"
css_dir = "css"
sass_dir = "scss"
images_dir = "img" #relative to this file's directory
fonts_dir = "rsrc"
javascripts_dir = "js"

# additional import paths
additional_import_paths = [
  '../../core/apps',
  # '../../core/libs/bootstrap/stylesheets',
  # '../../core/libs/font-awesome/sass',
  '../../core/apps/approvals/scss',
  '../../core/apps/budgetTracker/scss',
  '../../core/apps/bannerModule/scss',
  '../../core/apps/productClaim/scss',
  '../../core/apps/celebration/scss',
  '../../core/apps/clickThru/scss',
  '../../core/apps/communications/scss',
  '../../core/apps/contactForm/scss',
  '../../core/apps/destinations/scss',
  '../../core/apps/drawTool/scss',
  '../../core/apps/engagement/scss',
  '../../core/apps/forum/scss',
  '../../core/apps/gamification/scss',
  '../../core/apps/goalquest/scss',
  '../../core/apps/instantPoll/scss',
  '../../core/apps/leaderboard/scss',
  '../../core/apps/managerToolkit/scss',
  '../../core/apps/news/scss',
  '../../core/apps/onTheSpotCard/scss',
  '../../core/apps/plateauAwards/scss',
  '../../core/apps/profile/scss',
  '../../core/apps/publicRecognition/scss',
  '../../core/apps/publicProfile/scss',
  '../../core/apps/purlContribute/scss',
  '../../core/apps/quiz/scss',
  '../../core/apps/recognition/scss',
  '../../core/apps/reports/scss',
  '../../core/apps/resourceCenter/scss',
  '../../core/apps/ssi/scss',
  '../../core/apps/survey/scss',
  '../../core/apps/throwdown/scss',
  '../../core/apps/tip/scss',
  '../../core/apps/workHappier/scss',
#
#
  '../../core/apps/test/scss',
  '../../core/apps/theDude/scss'
]

# You can select your preferred output style here (can be overridden via the command line):
# output_style = :expanded or :nested or :compact or :compressed

# To enable relative paths to assets via compass helper functions. Uncomment:
relative_assets = true

# To disable debugging comments that display the original location of your selectors. Uncomment:
# line_comments = false


# If you prefer the indented syntax, you might want to regenerate this
# project again passing --syntax sass, or you can uncomment this:
# preferred_syntax = :sass
# and then run:
# sass-convert -R --from scss --to sass assets/core/css_scss scss && rm -rf sass && mv scss sass

# ######################################################################
# Congratulations! Your compass project has been created.
#
# You may now add sass stylesheets to the assets/core/css_scss subdirectory of you
# r project.
#
# Sass files beginning with an underscore are called partials and won't be
# compiled to CSS, but they can be imported into other sass stylesheets.
#
# You can configure your project by editing the config.rb configuration file.
#
# You must compile your sass stylesheets into CSS when they change.
# This can be done in one of the following ways:
  # 1. To compile on demand:
     # compass compile [path/to/project]
  # 2. To monitor your project for changes and automatically recompile:
     # compass watch [path/to/project]
#
# More Resources:
  # * Website: http://compass-style.org/
  # * Sass: http://sass-lang.com
  # * Community: http://groups.google.com/group/compass-users/
###############################################################################


# sourcemap feature
sourcemap = false
