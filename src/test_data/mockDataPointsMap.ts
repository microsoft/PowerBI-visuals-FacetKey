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
 
export default {
    'organization': [
        {
            rows: [{
                identity: 'fakeId1',
                bucket: 'level1',
            }],
            highlight: 2,
            facetKey: 'organization',
            facetLabel: 'Organization',
            instanceValue: 'Wand1',
            instanceLabel: 'Wand',
            instanceCount: 4,
            instanceCountFormatter: 'fakeCountFormatter',
            instanceColor: 'rgba(0, 0, 0, 1)',
            instanceIconClass: 'fa fa-sitemap',
            rangeValues: [
              {
                value: 'fa fa-sitemap',
                valueLabel: 'fa fa-sitemap',
                key: 'class'
              },
              {
                value: '2016-01-01',
                valueLabel: '2016-01-01',
                key: 'date'
              }
            ]
        },
        {
            rows: [{
                identity: 'fakeId2',
                bucket: 'level2',
            }],
            highlight: 2,
            facetKey: 'organization',
            facetLabel: 'Organization',
            instanceValue: 'Wand2',
            instanceLabel: 'Wand',
            instanceCount: 3,
            instanceCountFormatter: 'fakeCountFormatter',
            instanceColor: 'rgba(0, 0, 0, 1)',
            instanceIconClass: 'fa fa-sitemap',
            rangeValues: [
              {
                value: 'fa fa-sitemap',
                valueLabel: 'fa fa-sitemap',
                key: 'class'
              },
              {
                value: '2016-01-02',
                valueLabel: '2016-01-02',
                key: 'date'
              }
            ]
        },
    ],
    'location': [
        {
            rows: [{
                identity: 'fakeId3',
                bucket: 'level1',
            }],
            identity: 'fakeId3',
            highlight: 2,
            facetKey: 'location',
            facetLabel: 'Location',
            instanceValue: 'California3',
            instanceLabel: 'California',
            instanceCount: 3,
            instanceCountFormatter: 'fakeCountFormatter',
            instanceColor: 'rgba(0, 0, 0, 1)',
            instanceIconClass: 'fa fa-globe',
            rangeValues: [
              {
                value: 'fa fa-globe',
                valueLabel: 'fa fa-globe',
                key: 'class'
              },
              {
                value: '2016-01-01',
                valueLabel: '2016-01-01',
                key: 'date'
              }
            ]
        },
        {
            rows: [{
                identity: 'fakeId4',
                bucket: 'level1',
            }],
            highlight: 6,
            facetKey: 'location',
            facetLabel: 'Location',
            instanceValue: 'New York4',
            instanceLabel: 'New York',
            instanceCount: 8,
            instanceCountFormatter: 'fakeCountFormatter',
            instanceColor: 'rgba(0, 0, 0, 1)',
            instanceIconClass: 'fa fa-globe',
            rangeValues: [
              {
                value: 'fa fa-globe',
                valueLabel: 'fa fa-globe',
                key: 'class'
              },
              {
                value: '2016-01-02',
                valueLabel: '2016-01-02',
                key: 'date'
              }
            ]
        },
        {
            rows: [{
                identity: 'fakeId5',
                bucket: 'level1',
            }],
            highlight: 0,
            facetKey: 'location',
            facetLabel: 'Location',
            instanceValue: 'New York5',
            instanceLabel: 'New York',
            instanceCount: 2,
            instanceCountFormatter: 'fakeCountFormatter',
            instanceColor: 'rgba(0, 0, 0, 1)',
            instanceIconClass: 'fa fa-globe',
            rangeValues: [
              {
                value: 'fa fa-globe',
                valueLabel: 'fa fa-globe',
                key: 'class'
              },
              {
                value: '2016-01-02',
                valueLabel: '2016-01-04',
                key: 'date'
              }
            ]
        },
    ]
};
