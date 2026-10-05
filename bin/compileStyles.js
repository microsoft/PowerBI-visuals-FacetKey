'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sass = require('sass');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');

// pbiviz handles CSS/LESS and PNG icons. Compile the project's Sass and SVG
// sources first; all bundling, registration and packaging belongs to pbiviz.
async function compileStyles({ root = ROOT } = {}) {
    const stylesheet = path.join(root, 'style', 'facets.css');
    const icon = path.join(root, 'assets', 'icon.png');
    const css = sass.compile(path.join(root, 'style', 'facets.scss'), { style: 'compressed' }).css;
    const png = await sharp(path.join(root, 'assets', 'icon.svg'))
        .resize(20, 20, { fit: 'contain' }).png().toBuffer();
    await fs.mkdir(path.dirname(stylesheet), { recursive: true });
    await fs.mkdir(path.dirname(icon), { recursive: true });
    await Promise.all([fs.writeFile(stylesheet, css), fs.writeFile(icon, png)]);
    return { stylesheet, icon };
}

module.exports = { compileStyles };
if (require.main === module) compileStyles().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
