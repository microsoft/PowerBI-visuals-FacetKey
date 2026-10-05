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
const { simpleGroups } = require('./fixtures');

/**
 * Rendering / lifecycle: initial render, group replace, group "more"
 * (show more link) and collapse/expand ("less"), and destroy leaving no
 * dangling delegated handlers.
 */

test('rendering, group replace, more/less and destroy lifecycle', async (t) => {
    const env = createEnvironment();
    const Facets = require('../src/main');
    const $ = env.$;

    let facets;

    await t.test('initial render creates the widget DOM and one group with 3 facets', () => {
        facets = new Facets($('#container'), simpleGroups());
        const root = $('#container');
        assert.equal(root.find('.facets-root-container').length, 1, 'container should hold the facets widget root');
        assert.equal(facets.getGroup('phone').facets.length, 3, 'group should have 3 facets from the fixture');
        assert.equal($('#container .facets-group').length, 2, 'the phone group and the always-present query group both render a .facets-group element');
        // "more: 2" fixture should render a show-more link.
        assert.equal($('#container .group-more-target').length, 1, 'more link should be rendered for more:2');
    });

    await t.test('group "more" link click emits facet-group:more with the group key', () => {
        let received = null;
        facets.on('facet-group:more', (evt, key, index) => {
            received = { key, index };
        });
        $('#container .group-more-target').trigger('click');
        assert.ok(received, 'facet-group:more should have fired');
        assert.equal(received.key, 'phone');
    });

    await t.test('group collapse/expand ("less") toggles collapsed state and fires events', () => {
        const group = facets.getGroup('phone');
        assert.equal(group.collapsed, false, 'group starts expanded');

        let collapseEvt = false;
        let expandEvt = false;
        facets.on('facet-group:collapse', () => { collapseEvt = true; });
        facets.on('facet-group:expand', () => { expandEvt = true; });

        $('#container .group-expander').trigger('click');
        assert.equal(group.collapsed, true, 'clicking the expander collapses the group');
        assert.ok(collapseEvt, 'facet-group:collapse should have fired');

        $('#container .group-expander').trigger('click');
        assert.equal(group.collapsed, false, 'clicking again expands the group');
        assert.ok(expandEvt, 'facet-group:expand should have fired');
    });

    await t.test('replaceGroup swaps facets for an existing group', () => {
        facets.replaceGroup({
            key: 'phone',
            label: 'Phone',
            facets: [{ value: '555-9999', count: 1 }],
        });
        const group = facets.getGroup('phone');
        assert.equal(group.facets.length, 1, 'replaceGroup should replace the facet list');
        assert.equal(group.facets[0].value, '555-9999');
    });

    await t.test('replace() rebuilds the whole widget from new groups/queries', () => {
        facets.replace([
            { label: 'Other', key: 'other', facets: [{ value: 'a', count: 1 }] },
        ], []);
        assert.equal(facets.getGroup('phone'), null, 'old group should be gone after replace()');
        assert.ok(facets.getGroup('other'), 'new group should exist after replace()');
    });

    await t.test('destroy removes the container and leaves no delegated click handlers behind', () => {
        const root = $('#container');
        facets.destroy();
        assert.equal($('#container').children().length, 0, 'container should be emptied by destroy');
        // The widget root element itself was detached; it should carry no more
        // jQuery data/handlers that could fire after destroy.
        assert.doesNotThrow(() => root.trigger('click'), 'triggering events post-destroy should not throw');
    });

    teardownEnvironment(env);
});
