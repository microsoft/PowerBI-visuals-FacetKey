// pbiviz supports an ES-module project configuration alongside pbiviz.json.
// Keep the official build/server pipeline; harden only its development defaults.
// This narrow override targets powerbi-visuals-tools 7.2.1 and is integration-tested.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import metadata from './pbiviz.json' with { type: 'json' };
import webpackConfig from 'powerbi-visuals-tools/lib/webpack.config.js';
import security from './bin/security.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.join(root, '.tmp', 'drop');

// In 7.2.1, --drop replaces setupMiddlewares and would discard the guard.
// Standard pbiviz start already writes its generated assets to disk.
if (process.argv.includes('--drop')) {
    throw new Error('Use pbiviz start without --drop so development request protections stay enabled.');
}

export function guardDevRequest(req, res, next) {
    if (!security.isLoopbackHostHeader(req.headers.host)) {
        res.statusCode = 421;
        res.end('Invalid Host header.');
        return;
    }
    const origin = req.headers.origin;
    if (origin && origin !== `https://${req.headers.host}` && !security.isTrustedDevOrigin(origin)) {
        res.statusCode = 403;
        res.end('Origin not allowed.');
        return;
    }
    if (origin && security.isTrustedDevOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    if (req.url.startsWith('/assets/')) {
        let requestPath;
        try { requestPath = decodeURIComponent(req.url.split('?')[0].slice('/assets/'.length)); }
        catch { res.statusCode = 400; res.end('Bad request.'); return; }
        const target = security.resolveWithinRoot(assetsRoot, requestPath);
        if (!target || !security.resolveRealPathWithinRoot(assetsRoot, target)) {
            res.statusCode = 403;
            res.end('Forbidden.');
            return;
        }
    }
    next();
}

// pbiviz currently has no CLI options for host, allowedHosts or middleware.
// It imports this same webpack configuration object after loading this module.
// No loaders, plugin generation, compiler, TLS handling or packaging are replaced.
Object.assign(webpackConfig.devServer, {
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1', '[::1]'],
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    setupMiddlewares(middlewares) {
        return [{ name: 'facetkey-development-boundaries', middleware: guardDevRequest }, ...middlewares];
    },
});

export default metadata;
