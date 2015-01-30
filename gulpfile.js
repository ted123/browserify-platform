'use strict';
var gulp = require('gulp');
var fs   = require('fs');
// include plug-ins
var jshint      = require( 'gulp-jshint' );
var map         = require( 'map-stream' );
var jscs        = require( 'gulp-jscs' );
var eslint      = require( 'gulp-eslint' );
var Combine     = require( 'stream-combiner' );
var	browserify  = require( 'browserify' );
var vinylsource = require( 'vinyl-source-stream' );
var hbsfy       = require( 'hbsfy' );
var uglify      = require( 'gulp-uglify' );
var sourcemaps  = require( 'gulp-sourcemaps' );
var vinylbuffer = require( 'vinyl-buffer' );
var minifyCSS   = require( 'gulp-minify-css' );
var imagemin    = require( 'gulp-imagemin' );
var replace     = require('gulp-replace');

// plugins for auto server reload
var watchify   = require('watchify');
var livereload = require('gulp-livereload');
var gulpif     = require('gulp-if');
var watch;


var jshinterror = 0;

var src = [ './dev/js/models/memory/*' ] ;

var errorReporter = function ( ) {
	return map(function (file, cb) {
		if ( !file.jshint.success ) {
			jshinterror = 1;
		}
		cb( null, file );
	} );
};

// shortcut tasks
gulp.task( 'setup', function ( ) {
	fs.readFile( './precommit.sh', function ( err, data ) {
		if (err) {
			throw err;
		}
		setTimeout( function () {
			fs.chmodSync( '.git/hooks/pre-commit', '755' );
		}, ( function () {
			fs.writeFileSync( '.git/hooks/pre-commit', data);
			return 100;
		} )()
		);

	} );
} );

gulp.task( 'default', [ 'jshint', 'jscs', 'eslint' ], function () {} );

gulp.task( 'compile', [ 'browserify', 'minifyCSS', 'optimizeImg' ] );

// JShint task
gulp.task( 'jshint', function ( ) {
	gulp.src( src )
		.pipe( jshint( ) )
		.pipe( jshint.reporter( 'jshint-stylish' ) )
		.pipe( errorReporter( ) )
		.on('end', function ( ) {
			if ( jshinterror === 1 ) {
				console.log( '\n >>> REFUSING COMMIT DUE TO SYNTAX ERRORS <<<' );
				jshinterror = 0;
				process.exit( 1 );
			}
		} );
} );

// JSCS task
gulp.task( 'jscs', function ( ) {
	var combined = new Combine( gulp.src( src ).pipe( jscs( ) ) );
	combined.on('error', function ( err ) {
		console.warn( err.message + '\n >>> REFUSING COMMIT DUE TO UNCONVENTIONAL CODING PATTERNS <<<' );
		process.exit( 1 );
	} );
	return combined;
} );

// ESLint task
gulp.task( 'eslint', function ( ) {
	return gulp.src( src )
			.pipe(eslint())
			.pipe(eslint.format())
			.pipe(eslint.failOnError());
} );

// JSCS task for gulp
gulp.task( 'check-gulp', function ( ) {
	var combined = new Combine (
		gulp.src( './gulpfile.js' ).pipe( jscs( ) )
	);
	combined.on( 'error', function ( err ) {
		console.warn( err.message + '>>> FOLLOW CODING STANDARDS! <<<' );
		process.exit( 1 );
	} );
	return combined;
} );

// Compile js for gulp
gulp.task( 'browserify', function () {
    return browserify( './dev/js/app.js' )
	    	.transform( hbsfy )
			.bundle()
			.pipe( vinylsource( 'bundle.js' ) )
			.pipe( gulp.dest( './dev/js' ) )
			.pipe( vinylbuffer() )
			//.pipe( sourcemaps.init( { loadMaps : true } ) ) // uncomment to enable source mapping
			.pipe( uglify() )
			//.pipe( sourcemaps.write( './' ) ) // uncomment to enable source mapping
			.pipe( replace( /'dev'/g ,'production' ) ) // remove dev reference
    		.pipe( gulp.dest('./production/js' ) );
} );

// Compile css for gulp
gulp.task( 'minifyCSS', function () {
	return gulp.src( './dev/css/*.css' )
				.pipe( minifyCSS() )
				.pipe( gulp.dest('./production/css') );
} );

// Optimize images
gulp.task( 'optimizeImg', function () {
	gulp.src( './dev/img/*.*' )
		.pipe( imagemin() )
		.pipe( gulp.dest( './production/img' ) );
});

// watch bundle --- http://truongtx.me/2014/08/06/using-watchify-with-gulp-for-fast-browserify-build/
// fast compiling for dev purposes
function bundleShare ( b ) {
	b.bundle()
		.pipe( vinylsource( 'bundle.js' ) )
		.pipe( gulp.dest( './dev/js' ) );
}
function browserifyShare () {
	// you need to pass these three config option to browserify
	var b = browserify();
	b.transform( hbsfy );
	b = watchify( b );

	b.on( 'update', function () {
		bundleShare( b );
	} );
	b.add( './dev/js/app.js' );
	bundleShare( b );
}

// Compile js for dev purposes
gulp.task( 'bundle', function () {
	browserifyShare();
} );

// generate bundle file every new file changes
gulp.task( 'watch', function () {
	gulp.watch( './dev/js/**/*', [ 'bundle' ] );
} );
