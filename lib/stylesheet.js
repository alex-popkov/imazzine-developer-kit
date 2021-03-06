// Copyright 2016 The Imazzine Developer Kit. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Declare stylesheet commands.
 * @author buntarb@gmail.com (Artem Lytvynov)
 */

var notifier = require( 'node-notifier' );
var modules = [ ];
var yaml = require( 'yamljs' );
var gulp = require( 'gulp' );
var sass = require( 'gulp-sass' );
var base64 = require( 'gulp-css-base64' );
var ft = require( './filetools.js' );

require( 'google-closure-library' );

goog.require( 'goog.Promise' );

/**
 * Compile stylesheets from .scss files to .gss files using gulp-sass utility.
 * @returns {goog.Promise}
 */
function scss2gss( ){


	notifier.notify( {

		'title': 'Stylesheets',
		'message': 'Compiling styles'
	} );
	return ( new goog.Promise( function( resolve, reject ){

		var d = ft.CONST.PATH_DELIMITER;
		var cfg = yaml.load( ft.getRootPath( ) + d + 'config.yaml' );
		gulp

			.src(  ft.getRootPath( ) + d +

				cfg.PATH.LIB + d +
				cfg.PATH.STYLESHEETS + d +
				cfg.PATH.SCSS + d +
				cfg.NAMESPACE + '.scss' )

			.pipe(

				sass( ) )

			.pipe(

				sass

					.sync( )
					.on( 'error', sass.logError ) )

			.pipe(

				gulp

					.dest(

						ft.getRootPath( ) + d +
						cfg.PATH.LIB + d +
						cfg.PATH.STYLESHEETS + d +
						cfg.PATH.CSS ) )

			.on( 'end', function( ){

				resolve( );
			} )
			.on( 'error', function( e ){

				reject( e );
			} );
	} ) );
}

/**
 * Compile stylesheets from Closure Stylesheet format to .css files using Closure Tools utility.
 * @returns {goog.Promise}
 */
function gss2css( ){

	return ( new goog.Promise( function( resolve, reject ){

		var d = ft.CONST.PATH_DELIMITER;
		var cfg = yaml.load( ft.getRootPath( ) + d + 'config.yaml' );
		var css;
		if( ft.isFileExist(

			ft.getRootPath( ) + d +
				cfg.PATH.LIB + d +
				cfg.PATH.STYLESHEETS + d +
				cfg.PATH.CSS + d +
				cfg.NAMESPACE + '.css' ) ){

			css = ft.openFile( ft.getRootPath( ) + d +

				cfg.PATH.LIB + d +
				cfg.PATH.STYLESHEETS + d +
				cfg.PATH.CSS + d +
				cfg.NAMESPACE + '.css' );

			if( css.indexOf( '@charset "UTF-8";' ) >= 0 ){

				css = css.replace( '@charset "UTF-8";', '' );
				ft.saveFile(

					ft.getRootPath( ) + d +
						cfg.PATH.LIB + d +
						cfg.PATH.STYLESHEETS + d +
						cfg.PATH.CSS + d +
						cfg.NAMESPACE + '.css',
					css );
			}
		}
		var cmd =

			'java -jar ' +

				ft.getIdkPath( ) + d +
				'bin' + d +
				'stylesheets' + d +
				'closure-stylesheets.jar ' +

				'--allow-unrecognized-functions ' +
				'--allow-unrecognized-properties ' +
				'--output-file ' +

					ft.getRootPath( ) + d +
					cfg.PATH.BIN + d +
					cfg.NAMESPACE +'.css ' +

				'--output-renaming-map-format CLOSURE_COMPILED ' +
				'--rename CLOSURE ' +
				'--output-renaming-map ' +

					ft.getRootPath( ) + d +
					cfg.PATH.LIB + d +
					cfg.PATH.SOURCES + d +
					'cssmap.js ' +

				ft.getRootPath( ) + d +
				cfg.PATH.LIB + d +
				cfg.PATH.STYLESHEETS + d +
				cfg.PATH.CSS + d +
				cfg.NAMESPACE + '.css';

		ft.execute( cmd );
		resolve( );
	} ) );
}

/**
 * Compile resources for un-compiled styles.
 */
function compileDevResources( ){

	compileResources( false );
}

/**
 * Compile resources for compiled styles.
 */
function compileAppResources( ){

	compileResources( true );
}

/**
 * Compile resources to base64 format and add it to css file.
 * @param {boolean} bin
 * @returns {goog.Promise}
 */
function compileResources( bin ){

	return ( new goog.Promise( function( resolve, reject ){

		var g;
		var d = ft.CONST.PATH_DELIMITER;
		var cfg = yaml.load( ft.getRootPath( ) + d + 'config.yaml' );
		if( bin ){

			g = gulp.src( ft.getRootPath( ) + d + cfg.PATH.BIN + d + cfg.NAMESPACE +'.css' );

		}else{

			g = gulp.src(

				ft.getRootPath( ) + d +
				cfg.PATH.LIB + d +
				cfg.PATH.STYLESHEETS + d +
				cfg.PATH.CSS + d +
				cfg.NAMESPACE +'.css' );
		}
		g.on( 'end', resolve );
		g.on( 'error', reject );
		g = g.pipe( base64( {

			baseDir: ft.getRootPath( ),
			maxWeightResource: 131072
		} ) );
		g = compileResourcesRecursively_( g, ft.getRootPath( ) );

		if( bin ){

			g = g.pipe( gulp.dest( ft.getRootPath( ) + d + cfg.PATH.BIN ) );

		}else{

			g = g.pipe( gulp.dest(

				ft.getRootPath( ) + d +
				cfg.PATH.LIB + d +
				cfg.PATH.STYLESHEETS + d +
				cfg.PATH.CSS + d +
				cfg.PATH.BIN ) );
		}
		modules = [ ];
	} ) );
}

/**
 * Recursively compile resources. Based on package.json dependencies.
 * @param {*} g
 * @param {string} mod_root
 * @returns {*}
 * @private
 */
function compileResourcesRecursively_( g, mod_root ){

	var d = ft.CONST.PATH_DELIMITER;
	var json = ft.openJson( mod_root + d + 'package.json' );
	for( var key in json.dependencies ){

		if( !~modules.indexOf( key ) && key !== 'imazzine-developer-kit' ){

			modules.push( key );
			g = g.pipe( base64( {

				baseDir: mod_root + d + 'node_modules' + d + key,
				maxWeightResource: 131072
			} ) );
			g = compileResourcesRecursively_( g, mod_root + d + 'node_modules' + d + key );
		}
	}
	return g;
}

/**
 * Stylesheets compilation workflow.
 */
function css( ){

	scss2gss( )

		.then( gss2css )
		.then( compileDevResources )
		.then( compileAppResources );
}

/**********************************************************************************************************************
 * Exports                                                                                                            *
 **********************************************************************************************************************/

module.exports = {

	scss2gss: scss2gss,
	gss2css: gss2css,
	css: css
};