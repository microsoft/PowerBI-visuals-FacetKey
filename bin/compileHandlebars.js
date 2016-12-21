/**
 * Copyright (c) 2016 Uncharted Software Inc.
 * http://www.uncharted.software/
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const fileTools = require('./fileTools');
const handlebars = require('handlebars');

const templatesDir = 'lib/uncharted-facets/public/templates';
const outputDir = 'lib/uncharted-facets/public/javascripts/templates';

const files = fs.readdirSync(templatesDir);

const createAsModule = (content) => {
    const template = `var Handlebars = require('handlebars');module.exports = Handlebars.template(${ content })`;
    return template;
}

mkdirp.sync(outputDir);
files.forEach((filename) => {
    const filePath = path.join(templatesDir, filename);
    const contents = fs.readFileSync(filePath).toString();
    const templateSpec = handlebars.precompile(contents);
    fs.writeFileSync(path.join(outputDir, filename.replace('.hbs', '.js')), createAsModule(templateSpec))
})
