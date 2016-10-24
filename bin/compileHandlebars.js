const fs = require('fs');
const path = require('path');
const fileTools = require('./fileTools');
const handlebars = require('handlebars');

const templatesDir = 'lib/uncharted-facets/public/templates';
const outputDir = 'lib/uncharted-facets/public/javascripts/templates';

const files = fs.readdirSync(templatesDir);

const createAsModule = (content) => {
    const template = `var Handlebars = require('handlebars');module.exports = Handlebars.template(${ content })`;
    return template;
}

files.forEach((filename) => {
    const filePath = path.join(templatesDir, filename);
    const contents = fs.readFileSync(filePath).toString();
    const templateSpec = handlebars.precompile(contents);
    fs.writeFileSync(path.join(outputDir, filename.replace('.hbs', '.js')), createAsModule(templateSpec))
})
