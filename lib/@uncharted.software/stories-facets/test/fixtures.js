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

function simpleGroups() {
    return [
        {
            label: 'Phone',
            key: 'phone',
            more: 2,
            facets: [
                { value: '555-1111', count: 5 },
                { value: '555-2222', count: 10 },
                { value: '555-3333', count: 15 },
            ],
        },
    ];
}

function groupsWithManyFacets(count) {
    var facets = [];
    for (var i = 0; i < count; i += 1) {
        facets.push({ value: 'value-' + i, count: i + 1 });
    }
    return [
        {
            label: 'Many',
            key: 'many',
            facets: facets,
        },
    ];
}

function histogramSlices(n) {
    var slices = [];
    for (var i = 0; i < n; i += 1) {
        slices.push({
            label: 'slice-' + i,
            count: i + 1,
            metadata: { rangeValue: i, isFirst: i === 0, isLast: i === n - 1 },
        });
    }
    return slices;
}

function rangeGroups() {
    return [
        {
            label: 'Date',
            key: 'date',
            facets: [
                {
                    value: 'date',
                    selection: {},
                    histogram: { slices: histogramSlices(5) },
                },
            ],
        },
    ];
}

module.exports = { simpleGroups, groupsWithManyFacets, rangeGroups, histogramSlices };
