'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const JSZip = require('jszip');
const { createPreviewServer, loadVisualPackage } = require('./preview');

function request(server, requestPath, headers = {}, method = 'GET') {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: requestPath, headers, method }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

test('preview serves only packaged content and allowlisted assets on loopback', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'facetkey-preview-test-'));
    let server;
    try {
        const zip = new JSZip();
        zip.file('package.json', JSON.stringify({ metadata: { pbivizjson: { resourceId: 'rId0' } }, resources: [{ resourceId: 'rId0', file: 'resources/visual.pbiviz.json' }] }));
        zip.file('resources/visual.pbiviz.json', JSON.stringify({ visual: { guid: 'Fixture' }, apiVersion: '5.11.1', content: { js: 'window.fixture = true;', css: '.fixture { color: red; }' } }));
        const packagePath = path.join(root, 'test.pbiviz');
        await fs.writeFile(packagePath, await zip.generateAsync({ type: 'nodebuffer' }));
        for (const file of ['index.html', 'preview.css', 'preview.js']) await fs.writeFile(path.join(root, file), `fixture ${file}`);
        server = await createPreviewServer({ packagePath, previewDirectory: root });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        assert.equal(server.address().address, '127.0.0.1');
        assert.equal((await request(server, '/')).body, 'fixture index.html');
        const js = await request(server, '/visual.js');
        assert.equal(js.body, 'window.fixture = true;');
        assert.equal(js.headers['cross-origin-resource-policy'], 'same-origin');
        assert.ok(js.headers['content-security-policy'].includes("script-src 'self'"));
        assert.equal(js.headers['access-control-allow-origin'], undefined);
        const metadata = JSON.parse((await request(server, '/metadata.json')).body);
        assert.equal(metadata.visual.guid, 'Fixture');
        assert.equal(metadata.content, undefined);
        assert.equal((await request(server, '/visual.css', {}, 'HEAD')).body, '');
        for (const url of ['/package.json', '/bin/preview.js', '/..%2fpackage.json', '/%2e%2e/package.json', '/metadata.json/extra']) {
            assert.equal((await request(server, url)).status, 404, url);
        }
        assert.equal((await request(server, '/', { Host: 'attacker.example' })).status, 421);
        assert.equal((await request(server, '/', { Origin: 'https://attacker.example' })).status, 403);
        assert.equal((await request(server, '/', {}, 'POST')).status, 405);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('preview fails clearly when no build exists', async () => {
    await assert.rejects(loadVisualPackage(path.join(os.tmpdir(), 'facetkey-package-does-not-exist', 'missing.pbiviz')), /Run npm run package first/);
});
