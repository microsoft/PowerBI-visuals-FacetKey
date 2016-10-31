// fake powerbi functions
window['powerbi'] = {
    DataViewObjects: {
        getValue: () => undefined,
    },
    visuals: {
        valueFormatter: {
            create: (obj) => ({ format: (value) => obj.format + value })
        }
    }
};

import * as sinon from 'sinon';
import { expect } from 'chai';
import * as $ from 'jquery';

import * as dataConversion from './data';
import mockDataView from './test_data/mockdataview';
import mockDataPointsMap from './test_data/mockDataPointsMap';
import DataViewObjects = powerbi.DataViewObjects;

describe('.convertDataview', () => {
    let dataView;
    let data;

    beforeEach(() => {
        dataView = _.cloneDeep(mockDataView);
        data = dataConversion.convertDataview(<any>dataView);
    });

    it('should group rows by its facet value', () => {
        expect(data['organization']).to.be.an('array').length(2);
        expect(data['location']).to.be.an('array').length(1);
    });
    it('should return the resut with identity of each rows', () => {
        expect(data['organization'][0].rows[0].identity).to.equal('fakeId1');
        expect(data['organization'][1].rows[0].identity).to.equal('fakeId2');
        expect(data['location'][0].rows[0].identity).to.equal('fakeId3');
    });
    it('should return the result with original row values mapped with corresponding column names in object form', () => {
        const dataPoint = data['organization'][0];
        expect(dataPoint.rows[0].index).to.equal(0);
        expect(dataPoint.rows[0].facet).to.equal('organization');
        expect(dataPoint.rows[0].facetInstance).to.equal('Wand');
        expect(dataPoint.rows[0].count).to.equal(2);
        expect(dataPoint.rows[0].facetInstanceColor).to.equal('rgba(0, 0, 0, 1)');
        expect(dataPoint.rows[0].iconClass).to.equal('fa fa-sitemap');
    });
    it('should return the result with rangeValues', () => {
        const dataPoint = data['organization'][1];
        expect(dataPoint.rows[0].rangeValues).to.equal(dataPoint.rangeValues);

        expect(dataPoint.rangeValues[0].value).to.equal('fa fa-sitemap');
        expect(dataPoint.rangeValues[0].valueLabel).to.equal('fa fa-sitemap');
        expect(dataPoint.rangeValues[0].key).to.equal('class');
        expect(dataPoint.rangeValues[1].value.getTime()).to.equal(new Date('2016/01/02').getTime());
        expect(dataPoint.rangeValues[1].valueLabel).to.equal('Sat Jan 02 2016 00:00:00 GMT-0500 (EST)');
        expect(dataPoint.rangeValues[1].key).to.equal('date');
    });
    it('should return the result with correct data values', () => {
        const dataPoint = data['location'][0];

        expect(dataPoint.facetKey).to.equal('location');
        // Capitalize first letter of the facet
        expect(dataPoint.facetLabel).to.equal('Location');

        // instacne value = facetInstacne + index
        expect(dataPoint.instanceValue).to.equal('California2');

        expect(dataPoint.instanceLabel).to.equal('California');
        expect(dataPoint.instanceCount).to.equal(1);
        expect(dataPoint.instanceColor).to.equal('rgba(255, 255, 255 1)');
        expect(dataPoint.instanceIconClass).to.equal('fa fa-globe');
    });
    it('should return the result with corretly formatted values with available formats', () => {
        dataView.metadata.columns[0].format = '*'; // facet
        dataView.metadata.columns[1].format = '@'; // facetInstance
        dataView.metadata.columns[2].format = '$'; // count
        dataView.metadata.columns[5].format = '#'; // date
        data = dataConversion.convertDataview(<any>dataView);
        const dataPoint = data['location'][0];

        expect(dataPoint.facetLabel).to.equal('*Location');
        expect(dataPoint.instanceValue).to.equal('@California2');
        expect(dataPoint.instanceLabel).to.equal('@California');
        expect(dataPoint.rangeValues[1].valueLabel[0]).to.equal('#');
        expect(dataPoint.instanceCountFormatter.format).to.be.an('function');
    });
    it('should return the result with default highlight value of 0', () => {
        expect(data['location'][0].highlight).to.equal(0);
        expect(data['organization'][0].highlight).to.equal(0);
    });
    it('should return the result with correct highlight values', () => {
        dataView.categorical.values[0].highlights = [1, 2, null];
        data = dataConversion.convertDataview(<any>dataView);

        expect(data['organization'][0].highlight).to.equal(1);
        expect(data['organization'][1].highlight).to.equal(2);
        expect(data['location'][0].highlight).to.equal(0);
    });
    it('should return the result with correct default values', () => {
        dataView.table = {
            rows: [
                [ null, null, null, null, null, null ],
            ],
            identity: [ 'id1' ],
        };
        data = dataConversion.convertDataview(<any>dataView);
        const dataPoint = data[' '][0];

        expect(dataPoint.rows[0].identity).to.equal('id1');
        expect(dataPoint.facetKey).to.equal(' ');
        expect(dataPoint.facetLabel).to.equal('');
        expect(dataPoint.instanceValue).to.equal('');
        expect(dataPoint.instanceLabel).to.equal('');
        expect(dataPoint.instanceCount).to.equal(0);
        expect(dataPoint.instanceColor).to.equal('#DDDDDD');
        expect(dataPoint.instanceIconClass).to.equal('default fa fa-circle');
    });
    it('should return the result with facket key where parentheses are escaped', () => {
        dataView.table = {
            rows: [
                [ '(facet)', null, null, null, null, null ],
            ],
            identity: ['id1'],
        };
        data = dataConversion.convertDataview(<any>dataView);
        const key = Object.keys(data)[0];
        expect(data[key][0].facetKey).to.equal('\\(facet\\)');
    });
    it('should return the result with undefined color with no color column provided');
});

describe('.aggregateDataPointMap', () => {
    let dataPointsMap;
    let result;

    beforeEach(() => {
        dataPointsMap = _.cloneDeep(mockDataPointsMap);
        result = dataConversion.aggregateDataPointMap(dataPointsMap);
    });

    describe('for dataPointsMap result', () => {
        it('should return datapoints map with correct values', () => {
            const orgDataPoints = result.dataPointsMap['location'];
            let dp = result.dataPointsMap['location'][0];

            const expectDataPointsPropertyMatch = (dp, inputDp) => {
                expect(dp.facetKey).to.equal(inputDp.facetKey);
                expect(dp.facetLabel).to.equal(inputDp.facetLabel);
                expect(dp.instanceValue).to.equal(inputDp.instanceValue);
                expect(dp.instanceLabel).to.equal(inputDp.instanceLabel);
                expect(dp.instanceCountFormatter).to.equal(inputDp.instanceCountFormatter);
                expect(dp.instanceColor).to.equal(inputDp.instanceColor);
                expect(dp.instanceIconClass).to.equal(inputDp.instanceIconClass);
            };
            expect(dp.rows).to.deep.equal(['fakeRow3']);
            expect(dp.highlight).to.equal(2);
            expect(dp.instanceCount).to.equal(3);
            expectDataPointsPropertyMatch(dp, dataPointsMap['location'][0]);

            dp = result.dataPointsMap['organization'][0];
            expectDataPointsPropertyMatch(dp, dataPointsMap['organization'][0]);
        });
        it('should aggregate the datapoints on facetInstanceLabel', () => {
            const orgDataPoints = result.dataPointsMap['organization'];
            let dp = result.dataPointsMap['organization'][0];

            expect(result.dataPointsMap['organization']).to.be.an('array').length(1);
            // note fakeRow1 and fakeRow2 both have same facetInstance label
            expect(dp.rows).to.deep.equal(['fakeRow1', 'fakeRow2']);
            expect(dp.highlight).to.equal(4); // 2 + 2
            expect(dp.instanceCount).to.equal(7); // 4 + 3

            dp = result.dataPointsMap['location'][1];
            expect(result.dataPointsMap['location']).to.be.an('array').length(2);
            expect(dp.rows).to.deep.equal(['fakeRow4', 'fakeRow5']);
            expect(dp.highlight).to.equal(6); // 6 + 0
            expect(dp.instanceCount).to.equal(10);
        });
        it('should apply rnage filter');
        it('should apply keyword filter');
        it('should handle correctly with selected instances');
    });
    describe('for rangeDataMap result', () => {
        it('should unwind and aggregate dp by its range values and group them by range value key ', () => {
            const classRangeDps = result.rangeDataMap['class'];
            const dateRangeDps = result.rangeDataMap['date'];
            expect(Object.keys(classRangeDps)).to.deep.equal(['fa fa-sitemap', 'fa fa-globe']);
            expect(Object.keys(dateRangeDps)).to.deep.equal(['2016-01-01', '2016-01-02', '2016-01-04']);
        });
        it('should return the correct aggregated values', () => {
            let rangePoint = result.rangeDataMap['class']['fa fa-globe'];
            expect(rangePoint).to.deep.equal({
                facetKey: 'class',
                rows: [
                  'fakeRow3',
                  'fakeRow4',
                  'fakeRow5'
                ],
                label: 'fa fa-globe',
                count: 13,
                highlight: 8,
                subSelection: 13,
                metadata: {
                  rangeValue: 'fa fa-globe'
                }
            });
            rangePoint = result.rangeDataMap['date']['2016-01-02'];
            expect(rangePoint).to.deep.equal({
                facetKey: 'date',
                rows: [
                  'fakeRow2',
                  'fakeRow4',
                ],
                label: '2016-01-02',
                count: 11,
                highlight: 8,
                subSelection: 11,
                metadata: {
                  rangeValue: '2016-01-02'
                }
            });
        });
        it('should apply rnage filter');
        it('should apply keyword filter');
        it('should handle correctly with selected instances');
    });
});

describe('.convertDataPointMap', () => {
    // let aggregatedData = {
    //
    // };
    // let result;
    //
    // beforeEach(() => {
    //     aggregatedData = _.cloneDeep(mockDataPointsMap);
    //     result = dataConversion.aggregateDataPointMap(dataPointsMap);
    // })
});
