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
