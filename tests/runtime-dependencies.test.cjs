'use strict';

const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');

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
