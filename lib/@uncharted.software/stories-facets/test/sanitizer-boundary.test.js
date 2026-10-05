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

        await t.test('selection and imperative updates preserve the rich-label sanitizer boundary', () => {
            const Facets = require('../src/main');
            const payload = (text) => new Handlebars.SafeString(
                `<img src=x onerror="bad()"><a href="javascript:bad()">bad</a>` +
                `<b>${text}</b><a href="https://example.com">safe link</a>`
            );
            const facets = new Facets(env.$('#container'), [{
                key: 'labels', label: 'Labels',
                facets: [{ value: 'item', count: 10, label: payload('label'), countLabel: payload('count') }],
            }]);
            const facet = facets.getGroup('labels')._getFacet('item');
            const assertSafe = (label, count) => {
                for (const [element, text] of [[facet._label[0], label], [facet._labelCount[0], count]]) {
                    assert.equal(element.querySelector('b').textContent, text);
                    assert.equal(element.querySelector('a[href="https://example.com"]').textContent, 'safe link');
                    assert.equal(element.querySelector('script, [onerror], [onload], [href^="javascript:"]'), null);
                }
            };
            try {
                assertSafe('label', 'count');
                facets.select([{ key: 'labels', facets: [{ value: 'item', selected: { count: 3, countLabel: payload('selected') } }] }]);
                assertSafe('label', 'selected');
                facets.deselect();
                assertSafe('label', 'count');
                facet.updateSpec({ displayValue: payload('updated label'), countLabel: payload('updated count') });
                assertSafe('updated label', 'updated count');
                facet.updateCount(1);
                assertSafe('updated label', 'updated count');
                facet.rescale(20);
                assertSafe('updated label', 'updated count');
            } finally {
                facets.destroy();
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
