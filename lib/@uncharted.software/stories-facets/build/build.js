/*
 * Copyright 2017 Uncharted Software Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Standalone build for the vendored `@uncharted.software/stories-facets`
 * package. Replaces the old Gulp + Browserify + gulp-uglify + gulp-sass
 * pipeline (no longer vendored) with a small, dependency-light Node script.
 *
 * Steps (each documented in README.md "Build toolchain" section):
 *   1. Handlebars precompile: templates/*.hbs -> src/templates/*.js
 *      (build/compile-templates.js, replaces gulp-handlebars + gulp-define-module)
 *   2. JS bundle + minify: src/main.js -> dist/facets.js / dist/facets.min.js
 *      (esbuild, replaces browserify + gulp-uglify + gulp-concat + gulp-order)
 *   3. Stylesheet: sass/facets.scss -> dist/facets.css / dist/facets.min.css
 *      (the `sass` package + esbuild's CSS minifier, replaces gulp-sass + gulp-clean-css)
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const sass = require('sass');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PKG = require(path.join(ROOT, 'package.json'));

const BANNER = `/*! ${PKG.name} v${PKG.version} | ${PKG.license} | jQuery must be loaded globally before this script */\n`;

function compileTemplates() {
    const { compileTemplates } = require('./compile-templates');
    const compiled = compileTemplates();
    console.info(`[templates] compiled ${compiled.length} handlebars template(s).`);
}

async function bundleJs() {
    fs.mkdirSync(DIST, { recursive: true });

    const shared = {
        entryPoints: [path.join(ROOT, 'src', 'main.js')],
        bundle: true,
        format: 'iife',
        globalName: 'Facets',
        platform: 'browser',
        target: ['es2018'],
        banner: { js: BANNER },
        // `jquery` is never bundled: it is aliased to a shim that reads the
        // jQuery instance already present on the page (see jquery-global-shim.js
        // and the README's "jQuery dependency" section).
        alias: { jquery: path.join(__dirname, 'jquery-global-shim.js') },
        footer: {
            js:
                'if(typeof window!=="undefined"){window.Facets=Facets;}' +
                'if(typeof module!=="undefined"&&module.exports){module.exports=Facets;}',
        },
        logLevel: 'info',
    };

    await esbuild.build({
        ...shared,
        outfile: path.join(DIST, 'facets.js'),
        minify: false,
        sourcemap: false,
    });

    await esbuild.build({
        ...shared,
        outfile: path.join(DIST, 'facets.min.js'),
        minify: true,
        sourcemap: true,
    });

    console.info('[js] wrote dist/facets.js and dist/facets.min.js');
}

function bundleCss() {
    fs.mkdirSync(DIST, { recursive: true });

    const result = sass.compile(path.join(ROOT, 'sass', 'facets.scss'), {
        loadPaths: [path.join(ROOT, 'sass')],
        style: 'expanded',
        quietDeps: true,
        silenceDeprecations: ['import'],
    });
    fs.writeFileSync(path.join(DIST, 'facets.css'), result.css);

    const minified = esbuild.transformSync(result.css, { loader: 'css', minify: true });
    fs.writeFileSync(path.join(DIST, 'facets.min.css'), minified.code);

    console.info('[css] wrote dist/facets.css and dist/facets.min.css');
}

async function main() {
    compileTemplates();
    await bundleJs();
    bundleCss();
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
