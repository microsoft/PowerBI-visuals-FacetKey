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
