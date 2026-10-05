/*
 * Copyright 2017 Uncharted Software Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEnvironment, teardownEnvironment } = require('./dom-env');
const { simpleGroups } = require('./fixtures');

const DIST_JS = path.join(__dirname, '..', 'dist', 'facets.js');

test('dist/facets.js IIFE bundle smoke test and jQuery 4 compatibility', async (t) => {
    await t.test('dist bundle exists (built by `npm run build` before tests)', () => {
        assert.ok(fs.existsSync(DIST_JS), 'dist/facets.js must be built (pretest runs `npm run build`)');
    });

    await t.test('loading the bundle with only a global jQuery exposes window.Facets and renders', () => {
        const env = createEnvironment();
        delete require.cache[DIST_JS];
        require(DIST_JS);

        assert.equal(typeof env.window.Facets, 'function', 'dist bundle should expose window.Facets');

        const facets = new env.window.Facets(env.$('#container'), simpleGroups());
        assert.equal(env.$('#container .facets-root-container').length, 1, 'dist bundle should render facets via the global jQuery');

        facets.destroy();
        delete require.cache[DIST_JS];
        teardownEnvironment(env);
    });

    await t.test('bundle construction fails fast with a clear error when no global jQuery is present', () => {
        // No createEnvironment() here: deliberately no window/$ installed.
        delete require.cache[DIST_JS];
        assert.throws(() => require(DIST_JS), /no global jQuery/);
        delete require.cache[DIST_JS];
    });
});

test('jQuery 4 compatibility: removed APIs are not used by the source', async () => {
    const env = createEnvironment();
    const removedApiUsage = [];
    const srcDir = path.join(__dirname, '..', 'src');

    function scan(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                scan(full);
            } else if (entry.name.endsWith('.js') && !full.includes(`${path.sep}templates${path.sep}`)) {
                const content = fs.readFileSync(full, 'utf8');
                if (/\$\.(isFunction|isNumeric|isArray|parseJSON|trim)\(/.test(content) || /\.size\(\)/.test(content)) {
                    removedApiUsage.push(full);
                }
            }
        }
    }
    scan(srcDir);

    assert.deepEqual(removedApiUsage, [], 'no jQuery-4-removed API should be used in src/**');

    // jQuery 4 itself must actually be the version loaded (sanity check that
    // the peerDependency/devDependency really resolves to a v4.x release).
    assert.equal(env.$.fn.jquery.split('.')[0], '4', 'test harness should be exercising jQuery 4.x');

    teardownEnvironment(env);
});
