'use strict';

const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('certificate setup uses a command supported by the installed pbiviz CLI', () => {
    const root = path.resolve(__dirname, '..');
    const script = require('../package.json').scripts['install-certificate'];
    assert.equal(script, 'pbiviz install-cert');
    // --help validates command parsing without creating or trusting certificates.
    const result = spawnSync(process.execPath, [
        path.join(root, 'node_modules/powerbi-visuals-tools/bin/pbiviz.js'),
        ...script.split(' ').slice(1), '--help',
    ], { cwd: root, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage: .*install-cert/);
});

// pbiviz's SockJS dependency only consumes uuid.v4(). Verify the secure
// override preserves that API rather than relying solely on a clean audit.
test('pbiviz SockJS transport loads with the secure UUID override', () => {
    const sockjsRequire = createRequire(require.resolve('sockjs/lib/transport'));
    const uuid = sockjsRequire('uuid');
    assert.equal(sockjsRequire('uuid/package.json').version, '11.1.1');
    const id = uuid.v4();
    assert.equal(uuid.validate(id), true);
    assert.equal(uuid.version(id), 4);
    assert.doesNotThrow(() => require('sockjs/lib/transport'));
    assert.doesNotThrow(() => require('webpack-dev-server'));
});
