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
 * Standalone (root-independent) template precompile step for this vendored
 * package and the host visual. templates/*.hbs become src/templates/*.js,
 * wrapped as CommonJS modules using only the Handlebars runtime in the browser.
 * The host delegates here instead of maintaining a second template compiler.
 *
 * Replaces the capability previously provided by `gulp-handlebars` +
 * `gulp-define-module` in the old Gulp pipeline.
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PACKAGE_ROOT, 'templates');
const OUTPUT_DIR = path.join(PACKAGE_ROOT, 'src', 'templates');

/**
 * Wraps a precompiled Handlebars template spec as a CommonJS module.
 *
 * @param {string} content - The output of `Handlebars.precompile(...)`.
 * @returns {string}
 */
function createAsModule(content) {
    return `var Handlebars = require('handlebars/runtime');module.exports = Handlebars.template(${content})`;
}

/**
 * Resolves `name` inside `dir`, refusing to return a path that escapes `dir`
 * (defends against path traversal via crafted file names).
 *
 * @param {string} dir
 * @param {string} name
 * @returns {string|null}
 */
function resolveWithinDir(dir, name) {
    const resolved = path.resolve(dir, name);
    const prefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
    if (resolved !== dir && !resolved.startsWith(prefix)) {
        return null;
    }
    return resolved;
}

/**
 * Lists the `.hbs` template files directly inside `templatesDir`, in a
 * deterministic (sorted) order, skipping anything that is not a regular file.
 *
 * @param {string} templatesDir
 * @returns {Array<{ name: string, filePath: string }>}
 */
function listTemplateFiles(templatesDir) {
    const entries = fs.readdirSync(templatesDir).filter((name) => name.endsWith('.hbs')).sort();

    return entries.map((name) => {
        const filePath = resolveWithinDir(templatesDir, name);
        if (filePath === null) {
            throw new Error(`compile-templates: template entry "${name}" escapes the templates directory.`);
        }
        const stats = fs.lstatSync(filePath);
        if (stats.isSymbolicLink()) {
            throw new Error(`compile-templates: refusing to read symlinked template entry "${name}".`);
        }
        if (!stats.isFile()) {
            throw new Error(`compile-templates: template entry "${name}" is not a regular file.`);
        }
        return { name, filePath };
    });
}

/**
 * Precompiles every `.hbs` template under `templatesDir` into a CommonJS
 * module under `outputDir`.
 *
 * @param {string} [templatesDir]
 * @param {string} [outputDir]
 * @returns {Array<string>} The list of template file names that were compiled.
 */
function compileTemplates(templatesDir, outputDir) {
    const sourceDir = templatesDir || TEMPLATES_DIR;
    const destinationDir = outputDir || OUTPUT_DIR;

    const files = listTemplateFiles(sourceDir);

    fs.mkdirSync(destinationDir, { recursive: true });

    files.forEach(({ name, filePath }) => {
        const contents = fs.readFileSync(filePath, 'utf8');
        const templateSpec = Handlebars.precompile(contents);
        const outputPath = resolveWithinDir(destinationDir, name.replace('.hbs', '.js'));
        if (outputPath === null) {
            throw new Error(`compile-templates: output path for template "${name}" escapes the output directory.`);
        }
        const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW || 0);
        fs.writeFileSync(outputPath, createAsModule(templateSpec), { flag: flags });
    });

    return files.map((file) => file.name);
}

module.exports = { compileTemplates, listTemplateFiles, createAsModule, TEMPLATES_DIR, OUTPUT_DIR };

if (require.main === module) {
    try {
        const compiled = compileTemplates();
        console.info(`Compiled ${compiled.length} handlebars template(s).`);
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    }
}
