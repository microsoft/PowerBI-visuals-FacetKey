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
 * Standalone jQuery resolution used ONLY when bundling this package by
 * itself (dist/facets.js / dist/facets.min.js, built from `build/build.js`).
 *
 * The source modules do `require('jquery')` so that:
 *   - inside the host PowerBI visual, webpack resolves this to the host's
 *     real `node_modules/jquery` (same instance the rest of the visual
 *     uses, consistent with its existing `ProvidePlugin({ $: 'jquery' })`),
 *   - when this package is bundled standalone via esbuild, this shim is
 *     aliased in place of the real `jquery` module (see build/build.js),
 *     resolving to whatever jQuery instance is already loaded on the page
 *     (`window.jQuery` / `window.$`) instead of bundling a second copy.
 *
 * This mirrors the previous `browserify-shim: { "jquery": "global:$" }`
 * behaviour from the old Gulp/Browserify toolchain.
 */
var existing = (typeof window !== 'undefined' && (window.jQuery || window.$)) || null;

if (!existing) {
    throw new Error(
        'Facets: no global jQuery ($ or window.jQuery) was found. ' +
        'Load jQuery before this bundle, e.g. <script src=".../jquery.js"></script>.'
    );
}

module.exports = existing;
