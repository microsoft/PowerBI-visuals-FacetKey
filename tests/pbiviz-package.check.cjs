'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const JSZip = require('jszip');
const sharp = require('sharp');
const config = require('../pbiviz.json');
const capabilities = require('../capabilities.json');
const { loadVisualPackage } = require('../bin/preview');

const packagePath = path.join(__dirname, '..', 'dist', `${config.visual.guid}.${config.visual.version}.pbiviz`);

test('official pbiviz artifact contains matching metadata, resources and a PNG icon', async () => {
    const archive = await JSZip.loadAsync(await fs.readFile(packagePath), { checkCRC32: true });
    const manifest = JSON.parse(await archive.file('package.json').async('string'));
    assert.equal(manifest.version, config.visual.version);
    assert.equal(manifest.visual.guid, config.visual.guid);
    assert.equal(manifest.visual.version, config.visual.version);
    for (const resource of manifest.resources) assert.ok(archive.file(resource.file), resource.file);
    const payload = await loadVisualPackage();
    assert.equal(payload.visual.guid, config.visual.guid);
    assert.equal(payload.visual.version, config.visual.version);
    assert.deepEqual(payload.capabilities, capabilities);
    assert.equal(payload.apiVersion.split('.').slice(0, 2).join('.'), config.apiVersion.split('.').slice(0, 2).join('.'));
    assert.doesNotThrow(() => new vm.Script(payload.content.js));
    assert.ok(!/\beval\s*\(/.test(payload.content.js), 'Production package must not contain eval-based source maps.');
    assert.ok(payload.content.css.includes('.facets-container'));
    assert.ok(payload.content.css.includes('@font-face'));
    assert.ok(payload.content.iconBase64.startsWith('data:image/png;base64,'));
    const icon = await sharp(Buffer.from(payload.content.iconBase64.split(',')[1], 'base64')).metadata();
    assert.equal(icon.width, 20);
    assert.equal(icon.height, 20);
    assert.equal(icon.format, 'png');
});

test('missing packages fail clearly instead of falling back to an old artifact', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'facetkey-no-package-'));
    try { await assert.rejects(loadVisualPackage(path.join(root, 'missing.pbiviz')), /Run npm run package first/); }
    finally { await fs.rm(root, { recursive: true, force: true }); }
});
