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

/**
 * Shared security/validation helpers used by the project's local build scripts
 * (bin/*.js). Centralizing this logic keeps the "trust boundary" rules
 * (safe paths, loopback hosts and trusted dev-server origins) consistent
 * and independently testable.
 */

const path = require('path');
const fs = require('fs');

/** Absolute path to the project root (parent of bin/). */
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Exact allow-list of origins that are trusted to make cross-origin requests
 * against the local HTTPS dev server while debugging a custom visual that is
 * loaded inside the Power BI service. This is intentionally an exact-match
 * list (no wildcards, no suffix/prefix matching, no reflection of the
 * incoming `Origin` header) so that an arbitrary website cannot simply send
 * a matching `Origin` header to be treated as trusted.
 *
 * @type {ReadonlyArray<string>}
 */
const TRUSTED_DEV_ORIGINS = Object.freeze([
    'https://app.powerbi.com',
    'https://web.powerbi.com',
    'https://msit.powerbi.com',
    'https://dxt.powerbi.com',
    'https://preview.powerbi.com',
    'https://embedded.powerbi.com',
    'https://app.powerbi.cn',
    'https://app.powerbigov.us',
]);

/**
 * Host names that are considered "local" for the purpose of the Host header
 * check performed by the dev server. The dev server only binds to loopback
 * interfaces, but defending against DNS-rebinding style attacks also requires
 * validating the `Host` header on every request.
 *
 * @type {ReadonlyArray<string>}
 */
const LOOPBACK_HOSTNAMES = Object.freeze(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Checks if the given value is an exact match for one of the trusted,
 * allow-listed dev-server origins.
 *
 * @param {string|undefined|null} origin - The value of an incoming `Origin` header.
 * @returns {boolean}
 */
function isTrustedDevOrigin(origin) {
    return typeof origin === 'string' && TRUSTED_DEV_ORIGINS.indexOf(origin) !== -1;
}

/**
 * Validates that a `Host` header (e.g. `localhost:8080`) refers to a loopback
 * address, defending against DNS-rebinding attacks where a remote page
 * resolves a hostname to 127.0.0.1 after the fact.
 *
 * @param {string|undefined|null} hostHeader - The raw `Host` header value.
 * @returns {boolean}
 */
function isLoopbackHostHeader(hostHeader) {
    if (typeof hostHeader !== 'string' || hostHeader.length === 0) {
        return false;
    }

    // Strictly parse `Host: <host>[:<port>]`. Unlike a naive "split on the
    // first colon" approach, this requires the optional port to be a run of
    // digits and requires the *entire* header to be consumed by the match -
    // so malformed values like `localhost:evil` or `[::1]evil` (a bracketed
    // IPv6 literal with trailing garbage and no `:port` separator) are
    // rejected outright instead of being truncated down to an
    // accidentally-valid-looking hostname.
    const bracketedMatch = /^\[([^[\]]*)\](?::(\d+))?$/.exec(hostHeader);
    if (bracketedMatch) {
        const hostname = `[${bracketedMatch[1]}]`;
        return LOOPBACK_HOSTNAMES.indexOf(hostname.toLowerCase()) !== -1;
    }

    const plainMatch = /^([^:[\]]+)(?::(\d+))?$/.exec(hostHeader);
    if (!plainMatch) {
        return false;
    }
    return LOOPBACK_HOSTNAMES.indexOf(plainMatch[1].toLowerCase()) !== -1;
}

/**
 * Resolves `relativePath` against `rootDir` and verifies that the resulting
 * absolute path stays within `rootDir` (i.e. it does not escape via `..`
 * segments, absolute-path overrides, or symlink-free traversal tricks).
 * Returns `null` when the requested path would escape the root instead of
 * throwing, so callers can decide how to respond (e.g. 403/404).
 *
 * @param {string} rootDir - The directory that must contain the result.
 * @param {string} relativePath - An untrusted, request-supplied relative path.
 * @returns {string|null}
 */
function resolveWithinRoot(rootDir, relativePath) {
    const root = path.resolve(rootDir);
    // Treat the incoming path as relative no matter what the caller passed
    // in (strip any leading slashes / drive letters so `path.join` cannot be
    // tricked into an absolute path).
    const safeRelative = String(relativePath || '').replace(/^([/\\]|[A-Za-z]:)+/, '');
    const resolved = path.resolve(root, safeRelative);
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    if (resolved !== root && !resolved.startsWith(rootWithSep)) {
        return null;
    }
    return resolved;
}

/**
 * Verifies that `targetPath` is *actually* contained within `rootDir` once
 * symlinks are resolved - not just lexically (as {@link resolveWithinRoot}
 * checks). This catches the case `resolveWithinRoot` cannot: an *ancestor*
 * path segment (not the final component) that is a symlink pointing outside
 * of `rootDir`, e.g. `rootDir/link -> /somewhere/else` with
 * `targetPath = rootDir/link/child`. Lexically that path starts with
 * `rootDir`, but on disk it resolves to `/somewhere/else/child`.
 *
 * Only *existing* path segments can be symlinks, so this resolves the
 * longest existing ancestor of `targetPath` with `fs.realpathSync` and
 * re-appends any remaining (not-yet-created) segments lexically.
 *
 * @param {string} rootDir - The directory that must really contain the result.
 * @param {string} targetPath - An absolute or root-relative path to verify.
 * @returns {string|null} The resolved real path, or `null` if it escapes `rootDir`.
 */
function resolveRealPathWithinRoot(rootDir, targetPath) {
    const root = path.resolve(rootDir);
    let realRoot;
    try {
        realRoot = fs.realpathSync(root);
    } catch (err) {
        realRoot = root; // root does not exist (yet) on disk; fall back to the lexical root.
    }

    const target = path.isAbsolute(targetPath) ? path.resolve(targetPath) : path.resolve(root, targetPath);

    let existingAncestor = target;
    while (!fs.existsSync(existingAncestor)) {
        const parent = path.dirname(existingAncestor);
        if (parent === existingAncestor) {
            break;
        }
        existingAncestor = parent;
    }

    let realAncestor;
    try {
        realAncestor = fs.realpathSync(existingAncestor);
    } catch (err) {
        realAncestor = existingAncestor;
    }

    const remainder = path.relative(existingAncestor, target);
    const realTarget = remainder ? path.join(realAncestor, remainder) : realAncestor;

    const realRootWithSep = realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep;
    if (realTarget !== realRoot && !realTarget.startsWith(realRootWithSep)) {
        return null;
    }
    return realTarget;
}

module.exports = {
    PROJECT_ROOT,
    TRUSTED_DEV_ORIGINS,
    LOOPBACK_HOSTNAMES,
    isTrustedDevOrigin,
    isLoopbackHostHeader,
    resolveWithinRoot,
    resolveRealPathWithinRoot,
};
