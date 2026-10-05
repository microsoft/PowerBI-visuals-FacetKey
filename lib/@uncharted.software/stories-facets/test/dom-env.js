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

/**
 * Minimal browser-DOM test environment shared by the node:test suite.
 * Replaces Karma + PhantomJS/Chrome-launcher with a jsdom-backed `window`
 * so the component's rendering/event lifecycle can be exercised headlessly
 * under plain `node --test`.
 *
 * jQuery (dist/jquery.js, UMD build) resolves `window` from the *global*
 * scope at the moment it is first `require()`-d - it does not accept a
 * window instance passed in afterwards. So `global.window`/`global.document`
 * must be installed before the first `require('jquery')` call, and the
 * `jquery` + source modules must be evicted from `require.cache` whenever
 * the jsdom instance is torn down, so the next test file gets a fresh
 * jQuery bound to its own window.
 */

const path = require('path');
const { JSDOM } = require('jsdom');

function setGlobal(name, value) {
    Object.defineProperty(global, name, {
        value: value,
        configurable: true,
        writable: true,
        enumerable: true,
    });
}

function createEnvironment() {
    const dom = new JSDOM('<!doctype html><html><body><div id="container"></div></body></html>', {
        url: 'http://localhost/',
        pretendToBeVisual: true,
    });

    const { window } = dom;

    setGlobal('window', window);
    setGlobal('document', window.document);
    setGlobal('navigator', window.navigator);

    // jsdom does not implement layout, so anything relying on getBBox/offset
    // needs a safe stub to avoid throwing in headless tests.
    if (window.SVGElement && !window.SVGElement.prototype.getBBox) {
        window.SVGElement.prototype.getBBox = function () {
            return { x: 0, y: 0, width: 0, height: 0 };
        };
    }

    var $ = require('jquery');
    $.fn.offset = $.fn.offset || function () {
        return { top: 0, left: 0 };
    };
    // jsdom performs no real box-model layout, so `.width()`/`.height()`
    // (used by the histogram to decide how many slices to stack per bar)
    // would otherwise always read back as 0, collapsing every slice into a
    // single bar. Stub a generous fixed viewport so a 1-bar-per-slice
    // layout (the common case exercised by these tests) is reproducible.
    var originalWidth = $.fn.width;
    var originalHeight = $.fn.height;
    $.fn.width = function (value) {
        if (value === undefined) {
            return 400;
        }
        return originalWidth.call(this, value);
    };
    $.fn.height = function (value) {
        if (value === undefined) {
            return 60;
        }
        return originalHeight.call(this, value);
    };

    setGlobal('$', $);
    setGlobal('jQuery', $);
    window.$ = $;
    window.jQuery = $;

    return { dom, window, document: window.document, $ };
}

function teardownEnvironment(env) {
    if (env && env.dom) {
        env.dom.window.close();
    }
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.$;
    delete global.jQuery;

    // Drop cached module instances bound to the torn-down window: jquery
    // and dompurify (both bind to `global.window` the first time they are
    // required), and every source module (they capture `$`/helpers at
    // require time via `require('jquery')` and `require('./helpers')`).
    var srcDir = path.join(__dirname, '..', 'src') + path.sep;
    Object.keys(require.cache).forEach((key) => {
        if (
            key.startsWith(srcDir) ||
            key.includes(`${path.sep}jquery${path.sep}`) ||
            key.includes(`${path.sep}dompurify${path.sep}`)
        ) {
            delete require.cache[key];
        }
    });
}

module.exports = { createEnvironment, teardownEnvironment };
