'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEnvironment, teardownEnvironment } = require('./dom-env');

test('rich-label sanitizer handles wrapper objects and obfuscated active content', async (t) => {
    const env = createEnvironment();
    try {
        require('../src/helpers');
        const Handlebars = require('handlebars/runtime');
        const sanitize = Handlebars.helpers.safeHtml;

        await t.test('an existing SafeString cannot bypass sanitization', () => {
            const input = new Handlebars.SafeString('<img src=x onerror="bad()"><b>safe</b>');
            const container = env.window.document.createElement('div');
            container.innerHTML = String(sanitize(input));
            assert.equal(container.querySelector('img').hasAttribute('onerror'), false);
            assert.equal(container.querySelector('b').textContent, 'safe');
            assert.equal(String(sanitize(null)), '');
            assert.equal(String(sanitize(42)), '42');
        });

        await t.test('active URI schemes cannot survive HTML decoding or control characters', () => {
            for (const uri of ['javascript:bad()', 'jAvAsCrIpT:bad()', 'java\tscript:bad()', 'vbscript:bad()', 'data:text/html,bad', '&#x6a;avascript:bad()']) {
                const container = env.window.document.createElement('div');
                container.innerHTML = String(sanitize(`<a href="${uri}">label</a>`));
                assert.equal(container.querySelector('a').getAttribute('href'), null, uri);
            }
        });

        await t.test('SVG and MathML content does not introduce scripts or event handlers', () => {
            const payload = '<svg><script>bad()</script><g onload="bad()"></g></svg>' +
                '<math><mtext><img src=x onerror="bad()"></mtext></math>';
            const container = env.window.document.createElement('div');
            container.innerHTML = String(sanitize(payload));
            assert.equal(container.querySelector('script'), null);
            for (const element of container.querySelectorAll('*')) {
                for (const attribute of element.attributes) assert.ok(!attribute.name.startsWith('on'));
            }
        });
    } finally {
        teardownEnvironment(env);
    }
});
