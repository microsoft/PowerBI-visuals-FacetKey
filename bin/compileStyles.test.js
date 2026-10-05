'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const sharp = require('sharp');
const { compileStyles } = require('./compileStyles');

test('prepares CSS and a 20px PNG without changing source assets', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'facetkey-assets-'));
    try {
        await fs.mkdir(path.join(root, 'style'));
        await fs.mkdir(path.join(root, 'assets'));
        const scss = '$color: #123456; .test { color: $color; }';
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="blue"/></svg>';
        await fs.writeFile(path.join(root, 'style/facets.scss'), scss);
        await fs.writeFile(path.join(root, 'assets/icon.svg'), svg);
        const output = await compileStyles({ root });
        assert.match(await fs.readFile(output.stylesheet, 'utf8'), /\.test\{color:#123456\}/);
        const icon = await sharp(output.icon).metadata();
        assert.equal(icon.format, 'png');
        assert.equal(icon.width, 20);
        assert.equal(icon.height, 20);
        assert.equal(await fs.readFile(path.join(root, 'assets/icon.svg'), 'utf8'), svg);
        assert.equal(await fs.readFile(path.join(root, 'style/facets.scss'), 'utf8'), scss);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('asset preparation fails when sources are missing', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'facetkey-missing-assets-'));
    try { await assert.rejects(compileStyles({ root })); }
    finally { await fs.rm(root, { recursive: true, force: true }); }
});
