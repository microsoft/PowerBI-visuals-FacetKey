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

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEnvironment, teardownEnvironment } = require('./dom-env');
const { simpleGroups, rangeGroups } = require('./fixtures');

test('selection, histogram range changes and rich-label sanitization', async (t) => {
    const env = createEnvironment();
    const Facets = require('../src/main');
    const $ = env.$;

    await t.test('select() marks the targeted facet selected and click events are forwarded', () => {
        const facets = new Facets($('#container'), simpleGroups());

        let clicked = null;
        facets.on('facet:click', (evt, key, value, count) => {
            clicked = { key, value, count };
        });
        $('#container .facets-facet-vertical').first().trigger('click');
        assert.ok(clicked, 'facet:click should bubble up to the Facets widget');
        assert.equal(clicked.key, 'phone');

        facets.select([{ key: 'phone', facets: [{ value: '555-1111', selected: { count: 5 } }] }]);
        const facet = facets.getGroup('phone')._getFacet('555-1111');
        assert.equal(facet._spec.selected.count, 5, 'select() should store the selection on the target facet');

        facets.deselect();
        assert.equal(facet._spec.selected, undefined, 'deselect() should clear the selection state');

        facets.destroy();
    });

    await t.test('histogram facet reports and updates its filter range, forwarding rangechanged events', () => {
        const facets = new Facets($('#container'), rangeGroups());
        const facet = facets.getGroup('date')._getFacet('date');

        const initial = facets.getFilterRange('date', 'date');
        assert.equal(initial.from.index, 0, 'default bar range starts at index 0');

        let rangeEvent = null;
        facets.on('facet-histogram:rangechangeduser', (evt, key, range) => {
            rangeEvent = { key, range };
        });

        facet._histogramFilter.setFilterBarRange({ from: 1, to: 3 }, true);

        assert.ok(rangeEvent, 'a user-driven range change should emit facet-histogram:rangechangeduser');
        assert.equal(rangeEvent.key, 'date');
        const updated = facets.getFilterRange('date', 'date');
        assert.equal(updated.from.index, 1, 'filterRange.from should reflect the new bar range');
        assert.equal(updated.to.index, 3, 'filterRange.to should reflect the new bar range');
        assert.equal(updated.from.count[0], 2, 'filterRange.from.count should match slice 1 (count = index+1)');

        facets.destroy();
    });

    await t.test('rich labels: malicious markup is neutralized, safe formatting/links are kept', () => {
        const malicious =
            '<img src=x onerror=alert(1)>' +
            '<a href="javascript:alert(1)">bad</a>' +
            '<a href="jAvAsCrIpT:alert(1)">bad2</a>' +
            '<svg onload=alert(1)></svg>' +
            '<script>alert(1)</script>' +
            '<b>Bold label</b>';

        const groups = [
            {
                label: 'g',
                key: 'g',
                facets: [{ value: 'v', count: 1, label: malicious }],
            },
        ];
        const facets = new Facets($('#container'), groups);
        const labelHtml = $('#container .facet-label').html();

        assert.ok(!/script/i.test(labelHtml), 'no <script> tag should survive sanitization');
        assert.ok(!/onerror/i.test(labelHtml), 'no inline event handler should survive sanitization');
        assert.ok(!/onload/i.test(labelHtml), 'no inline SVG event handler should survive sanitization');
        assert.ok(!/javascript:/i.test(labelHtml), 'no javascript: URI should survive sanitization');
        assert.ok(/Bold label/.test(labelHtml), 'safe text content should be preserved');
        assert.ok(/<b>/i.test(labelHtml), 'safe formatting tags should be preserved');

        facets.destroy();

        const safe = new Facets($('#container'), [
            {
                label: 'g2',
                key: 'g2',
                facets: [{ value: 'v2', count: 1, label: '<a href="https://example.com">visit</a>' }],
            },
        ]);
        const safeHtml = $('#container .facet-label').html();
        assert.ok(/href="https:\/\/example\.com"/.test(safeHtml), 'a safe https link should be preserved verbatim');
        assert.ok(/visit/.test(safeHtml));

        safe.destroy();
    });

    teardownEnvironment(env);
});
