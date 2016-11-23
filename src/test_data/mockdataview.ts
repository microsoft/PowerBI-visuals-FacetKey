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
    metadata: {
        columns: [
            {
                format: '',
                displayName: 'facet',
                roles: {
                    facet: true,
                },
                type: {
                    text: true,
                }
            },
            {
                format: '',
                displayName: 'facet_instance',
                roles: {
                    facetInstance: true,
                },
                type: {
                    text: true,
                }
            },
            {
                format: '',
                displayName: 'Count of article_id',
                roles: {
                    count: true,
                },
                type: {
                    integer: true,
                    numeric: true,
                }
            },
            {
                format: '',
                displayName: 'color',
                roles: {
                    facetInstanceColor: true,
                },
                type: {
                    text: true,
                }
            },
            {
                format: '',
                displayName: 'class',
                roles: {
                    rangeValue: true,
                    iconClass: true,
                },
                type: {
                    text: true,
                }
            },
            {
                format: '',
                displayName: 'date',
                roles: {
                    rangeValue: true,
                },
                type: {
                    dateTime: true,
                }
            },
            {
                format: '',
                displayName: 'uncertainty',
                roles: {
                    bucket: true,
                },
                type: {
                    text: true,
                }
            },
        ]
    },
    categorical : {
        categories : [
            {}
        ],
        values: [
            {}
        ]
    },
    table: {
        rows: [
            [
                'organization',
                'Wand',
                2,
                'rgba(0, 0, 0, 1)',
                'fa fa-sitemap',
                '2016/01/01',
                'level1',
            ],
            [
                'organization',
                'Wand',
                3,
                'rgba(0, 0, 0, 1)',
                'fa fa-sitemap',
                '2016/01/02',
                'level2',
            ],
            [
                'location',
                'California',
                1,
                'rgba(255, 255, 255 1)',
                'fa fa-globe',
                '2016/01/03',
                'level1',
            ],
        ],
        identity: [
            'fakeId1',
            'fakeId2',
            'fakeId3',
        ],
    }
};
