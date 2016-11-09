export default {
    dataPointsMap: {
        organization: [
            {
                rows: [
                    {
                        identity: 'fakeId1',
                        bucket: 'level1'
                    },
                    {
                        identity: 'fakeId2',
                        bucket: 'level2'
                    }
                ],
                facetKey: 'organization',
                highlight: 4,
                facetLabel: 'Organization',
                instanceValue: 'Wand1',
                instanceLabel: 'Wand',
                instanceCount: 7,
                instanceCountFormatter: { format: (value) => '$' + value },
                instanceColor: 'rgba(0, 0, 0, 1)',
                instanceIconClass: 'fa fa-sitemap',
                bucket: {
                    level1: {
                        instanceCount: 4,
                        highlight: 2
                    },
                    level2: {
                        instanceCount: 3,
                        highlight: 2
                    }
                }
            }
        ],
        location: [
            {
                rows: [
                    {
                        identity: 'fakeId3',
                        bucket: 'level1'
                    }
                ],
                facetKey: 'location',
                highlight: 2,
                facetLabel: 'Location',
                instanceValue: 'New York3',
                instanceLabel: 'New York',
                instanceCount: 3,
                instanceCountFormatter: { format: (value) => '$' + value },
                instanceColor: 'rgba(0, 0, 0, 1)',
                instanceIconClass: 'fa fa-globe',
                bucket: {
                    level1: {
                        instanceCount: 3,
                        highlight: 2
                    }
                }
            },
            {
                rows: [
                    {
                        identity: 'fakeId4',
                        bucket: 'level1'
                    },
                    {
                        identity: 'fakeId5',
                        bucket: 'level1'
                    }
                ],
                facetKey: 'location',
                highlight: 6,
                facetLabel: 'Location',
                instanceValue: 'California4',
                instanceLabel: 'California',
                instanceCount: 10,
                instanceCountFormatter: { format: (value) => '$' + value },
                instanceColor: 'rgba(0, 0, 0, 1)',
                instanceIconClass: 'fa fa-globe',
                bucket: {
                    level1: {
                        instanceCount: 10,
                        highlight: 6
                    }
                }
            }
        ]
    },
    rangeDataMap: {
        class: {
            'fa fa-sitemap': {
                facetKey: 'class',
                rows: [
                    {
                        identity: 'fakeId1',
                        bucket: 'level1'
                    },
                    {
                        identity: 'fakeId2',
                        bucket: 'level2'
                    }
                ],
                label: 'fa fa-sitemap',
                count: 7,
                highlight: 4,
                subSelection: 7,
                metadata: {
                    rangeValue: 'fa fa-sitemap'
                }
            },
            'fa fa-globe': {
                facetKey: 'class',
                rows: [
                    {
                        identity: 'fakeId3',
                        bucket: 'level1'
                    },
                    {
                        identity: 'fakeId4',
                        bucket: 'level1'
                    },
                    {
                        identity: 'fakeId5',
                        bucket: 'level1'
                    }
                ],
                label: 'fa fa-globe',
                count: 13,
                highlight: 8,
                subSelection: 13,
                metadata: {
                    rangeValue: 'fa fa-globe'
                }
            }
        },
        date: {
            '2016-01-01': {
                facetKey: 'date',
                rows: [
                    {
                        identity: 'fakeId1',
                        bucket: 'level1'
                    },
                    {
                        identity: 'fakeId3',
                        bucket: 'level1'
                    }
                ],
                label: '2016-01-01',
                count: 7,
                highlight: 4,
                subSelection: 7,
                metadata: {
                    rangeValue: '2016-01-01'
                }
            },
            '2016-01-02': {
                facetKey: 'date',
                rows: [
                    {
                        identity: 'fakeId2',
                        bucket: 'level2'
                    },
                    {
                        identity: 'fakeId4',
                        bucket: 'level1'
                    }
                ],
                label: '2016-01-02',
                count: 11,
                highlight: 8,
                subSelection: 11,
                metadata: {
                    rangeValue: '2016-01-02'
                }
            },
            '2016-01-04': {
                facetKey: 'date',
                rows: [
                    {
                        identity: 'fakeId5',
                        bucket: 'level1'
                    }
                ],
                label: '2016-01-04',
                count: 2,
                highlight: 0,
                subSelection: 2,
                metadata: {
                    rangeValue: '2016-01-02'
                }
            }
        }
    }
};