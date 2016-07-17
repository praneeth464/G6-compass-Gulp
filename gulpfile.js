/**
 * Created by om on 7/15/2016.
 */

var gulp = require('gulp');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');

//var input = './core/**/*.scss';
var input = './core/apps/approvals/scss/**/*.scss';
var inputs = [
    './core/apps/**/*.scss',
    './core/apps/approvals/scss/**/*.scss',
    './core/apps/budgetTracker/scss/**/*.scss',
    './core/apps/bannerModule/scss/**/*.scss',
    './core/apps/productClaim/scss/**/*.scss',
    './core/apps/celebration/scss/**/*.scss',
    './core/apps/clickThru/scss/**/*.scss',
    './core/apps/communications/scss/**/*.scss',
    './core/apps/contactForm/scss/**/*.scss',
    './core/apps/destinations/scss/**/*.scss',
    './core/apps/drawTool/scss/**/*.scss',
    './core/apps/engagement/scss/**/*.scss',
    './core/apps/forum/scss/**/*.scss',
    './core/apps/gamification/scss/**/*.scss',
    './core/apps/goalquest/scss/**/*.scss',
    './core/apps/instantPoll/scss/**/*.scss',
    './core/apps/leaderboard/scss/**/*.scss',
    './core/apps/managerToolkit/scss/**/*.scss',
    './core/apps/news/scss/**/*.scss',
    './core/apps/onTheSpotCard/scss/**/*.scss',
    './core/apps/plateauAwards/scss/**/*.scss',
    './core/apps/profile/scss/**/*.scss',
    './core/apps/publicRecognition/scss/**/*.scss',
    './core/apps/publicProfile/scss/**/*.scss',
    './core/apps/purlContribute/scss/**/*.scss',
    './core/apps/quiz/scss/**/*.scss',
    './core/apps/recognition/scss/**/*.scss',
    './core/apps/reports/scss/**/*.scss',
    './core/apps/resourceCenter/scss/**/*.scss',
    './core/apps/ssi/scss/**/*.scss',
    './core/apps/survey/scss/**/*.scss',
    './core/apps/throwdown/scss/**/*.scss',
    './core/apps/tip/scss/**/*.scss',
    './core/apps/workHappier/scss/**/*.scss',
    './core/apps/test/scss/**/*.scss',
    './core/apps/theDude/scss/**/*.scss'
];
var output = './dest/';
var sassOptions = {
    errLogToConsole: true,
    outputStyle: 'expanded'
};
var autoprefixerOptions = {
    browsers: ['last 2 versions', '> 5%', 'Firefox ESR']
};


gulp.task('sass', function () {
    gulp.src(inputs)
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./dist'));
});

gulp.task('scss', function () {
    return gulp
        // Find all `.scss` files from the `stylesheets/` folder
        .src([input], {base: '.'})
        .pipe(sourcemaps.init())
        // Run Sass on those files
        .pipe(sass(sassOptions).on('error', sass.logError))
        .pipe(sourcemaps.write())
        .pipe(autoprefixer(autoprefixerOptions))
        // Write the resulting CSS in the output folder
        .pipe(gulp.dest(output));
});

gulp.task('watch', function() {
    return gulp
        // Watch the input folder for change,
        // and run `sass` task when something happens
        .watch(input, ['sass'])
        // When there is a change,
        // log a message in the console
        .on('change', function(event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });
});

//Watch task
//gulp.task('default',function() {
//    gulp.watch('/core/**/*.scss',['styles']);
//});

gulp.task('default', ['sass', 'watch' /*, possible other tasks... */]);