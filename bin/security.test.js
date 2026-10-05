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

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const fs = require('node:fs');

const security = require('./security.js');

test('isTrustedDevOrigin only matches the exact allow-listed origins', () => {
    assert.equal(security.isTrustedDevOrigin('https://app.powerbi.com'), true);
    assert.equal(security.isTrustedDevOrigin('https://app.powerbi.com.evil.com'), false);
    assert.equal(security.isTrustedDevOrigin('https://evil.com'), false);
    assert.equal(security.isTrustedDevOrigin('http://app.powerbi.com'), false, 'scheme must match too (no http)');
    assert.equal(security.isTrustedDevOrigin('*'), false);
    assert.equal(security.isTrustedDevOrigin(null), false);
    assert.equal(security.isTrustedDevOrigin(undefined), false);
});

test('isLoopbackHostHeader accepts only loopback host headers', () => {
    assert.equal(security.isLoopbackHostHeader('localhost:8080'), true);
    assert.equal(security.isLoopbackHostHeader('127.0.0.1:8080'), true);
    assert.equal(security.isLoopbackHostHeader('[::1]:8080'), true);
    assert.equal(security.isLoopbackHostHeader('localhost'), true);
    assert.equal(security.isLoopbackHostHeader('evil.example.com'), false);
    assert.equal(security.isLoopbackHostHeader('127.0.0.1.evil.com'), false);
    assert.equal(security.isLoopbackHostHeader(''), false);
    assert.equal(security.isLoopbackHostHeader(undefined), false);
});

test('isLoopbackHostHeader rejects malformed host headers instead of truncating them into a false match', () => {
    assert.equal(security.isLoopbackHostHeader('localhost:evil'), false, 'non-numeric port must be rejected, not stripped');
    assert.equal(security.isLoopbackHostHeader('[::1]evil'), false, 'bracketed host with trailing garbage (no ":port") must be rejected');
    assert.equal(security.isLoopbackHostHeader('[::1]:evil'), false, 'bracketed host with non-numeric port must be rejected');
    assert.equal(security.isLoopbackHostHeader('localhost:8080:extra'), false, 'multiple colons must be rejected');
    assert.equal(security.isLoopbackHostHeader('localhost evil'), false);
    assert.equal(security.isLoopbackHostHeader('[localhost]'), false, 'bracket form only valid for the bracketed loopback literal');
});

test('resolveWithinRoot blocks path traversal and absolute-path overrides', () => {
    const root = path.join(__dirname, '..', '.tmp', 'drop');
    assert.equal(resolvesTo(root, 'visual.js'), path.resolve(root, 'visual.js'));
    assert.equal(security.resolveWithinRoot(root, '../../../etc/passwd'), null);
    assert.equal(security.resolveWithinRoot(root, '..%2f..%2fetc/passwd'.replace(/%2f/g, '/')), null);
    assert.equal(security.resolveWithinRoot(root, '/etc/passwd'), path.resolve(root, 'etc/passwd'));
    assert.notEqual(security.resolveWithinRoot(root, '/etc/passwd'), '/etc/passwd');

    function resolvesTo(r, rel) {
        return security.resolveWithinRoot(r, rel);
    }
});

test('PROJECT_ROOT points at the real project root', () => {
    assert.equal(fs.existsSync(path.join(security.PROJECT_ROOT, 'package.json')), true);
    assert.equal(fs.existsSync(path.join(security.PROJECT_ROOT, 'pbiviz.json')), true);
});
