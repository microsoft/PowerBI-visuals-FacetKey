'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const JSZip = require('jszip');
const { PROJECT_ROOT, isLoopbackHostHeader } = require('./security');
const config = require('../pbiviz.json');

// The official pbiviz CLI (`pbiviz package`) always emits
// dist/${guid}.${version}.pbiviz - it ignores any custom `output` field.
// `packagePath` stays overridable so isolated unit fixtures can point at a
// throwaway archive without touching the real build output.
async function loadVisualPackage(packagePath = path.join(PROJECT_ROOT, 'dist', `${config.visual.guid}.${config.visual.version}.pbiviz`)) {
    let buffer;
    try { buffer = await fs.readFile(packagePath); }
    catch (error) {
        if (error.code === 'ENOENT') throw new Error('Visual package missing. Run npm run package first.');
        throw error;
    }
    const zip = await JSZip.loadAsync(buffer);
    const manifestFile = zip.file('package.json');
    if (!manifestFile) throw new Error('Invalid visual package: package.json is missing.');
    const manifest = JSON.parse(await manifestFile.async('string'));
    const resourceId = manifest.metadata?.pbivizjson?.resourceId;
    const resource = manifest.resources?.find((item) => item.resourceId === resourceId);
    const payloadFile = resource && zip.file(resource.file);
    if (!payloadFile) throw new Error('Invalid visual package: visual payload is missing.');
    const payload = JSON.parse(await payloadFile.async('string'));
    if (!payload.visual?.guid || typeof payload.content?.js !== 'string' || typeof payload.content?.css !== 'string') {
        throw new Error('Invalid visual package: metadata, JavaScript or CSS is missing.');
    }
    return payload;
}

async function createPreviewServer({ packagePath, previewDirectory = path.join(PROJECT_ROOT, 'preview') } = {}) {
    const payload = await loadVisualPackage(packagePath);
    const { content, ...metadata } = payload;
    const routes = new Map([
        ['/', { type: 'text/html; charset=utf-8', body: await fs.readFile(path.join(previewDirectory, 'index.html')) }],
        ['/preview.js', { type: 'text/javascript; charset=utf-8', body: await fs.readFile(path.join(previewDirectory, 'preview.js')) }],
        ['/preview.css', { type: 'text/css; charset=utf-8', body: await fs.readFile(path.join(previewDirectory, 'preview.css')) }],
        ['/visual.js', { type: 'text/javascript; charset=utf-8', body: content.js }],
        ['/visual.css', { type: 'text/css; charset=utf-8', body: content.css }],
        ['/metadata.json', { type: 'application/json; charset=utf-8', body: JSON.stringify(metadata) }],
    ]);

    return http.createServer((req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
        if (!isLoopbackHostHeader(req.headers.host)) {
            res.writeHead(421).end('Invalid Host header.');
            return;
        }
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
            res.writeHead(403).end('Foreign origins are not allowed.');
            return;
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed.');
            return;
        }
        let pathname;
        try { pathname = new URL(req.url, 'http://localhost').pathname; }
        catch { res.writeHead(400).end('Bad request.'); return; }
        if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
        const route = routes.get(pathname);
        if (!route) { res.writeHead(404).end('Not found.'); return; }
        res.writeHead(200, { 'Content-Type': route.type });
        res.end(req.method === 'HEAD' ? undefined : route.body);
    });
}

async function main() {
    const port = Number(process.env.FACETKEY_PREVIEW_PORT || 8090);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid FACETKEY_PREVIEW_PORT.');
    const server = await createPreviewServer();
    server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => {
        console.log(`Facet Key preview: http://127.0.0.1:${port}`);
        console.log('Serving the built .pbiviz with a mock Power BI host. Ctrl-C stops the server.');
    });
}

module.exports = { loadVisualPackage, createPreviewServer };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
