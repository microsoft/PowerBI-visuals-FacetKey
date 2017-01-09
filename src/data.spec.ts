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
const logObj = (obj) => console.log(JSON.stringify(obj, null, 2));

import * as sinon from 'sinon';
import { expect } from 'chai';
import * as $ from 'jquery';
import * as _ from 'lodash';

import * as utils from './utils';
import * as dataConversion from './data';
import mockDataView from './test_data/mockdataview';
import mockDataPointsMap from './test_data/mockDataPointsMap';
import mockAggregatedData from './test_data/mockAggregatedData';
import DataViewObjects = powerbi.DataViewObjects;

const buildRangeObj = (fromRangeValue, toRangeValue) => {
    return {
        from: { metadata: [{ rangeValue: fromRangeValue }] },
        to: { metadata: [{ rangeValue: toRangeValue }] },
    };
};

describe('Data Conversion Functions', () => {

describe('.convertToDataPointsMap', () => {
    let dataView;

    beforeEach(() => {
        dataView = _.cloneDeep(mockDataView);
    });

    it('should group rows by its facet value', () => {
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
        expect(data['organization']).to.be.an('array').length(2);
        expect(data['location']).to.be.an('array').length(1);
    });
    it('should return boolean indicating data has highlights or not', () => {
        let hasHighlight = dataConversion.convertToDataPointsMap(<any>dataView).hasHighlight;
        expect(hasHighlight).to.be.false;
        dataView.categorical.values[0].highlights = 1;
        hasHighlight = dataConversion.convertToDataPointsMap(<any>dataView).hasHighlight;
        expect(hasHighlight).to.be.true;
    });
    it('should return the resut with identity of each rows', () => {
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
        expect(data['organization'][0].rows[0].identity).to.equal('fakeId1');
        expect(data['organization'][1].rows[0].identity).to.equal('fakeId2');
        expect(data['location'][0].rows[0].identity).to.equal('fakeId3');
    });
    it('should return the result with original row values mapped with corresponding column names in object form', () => {
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
        const dataPoint = data['organization'][0];
        expect(dataPoint.rows[0].index).to.equal(0);
        expect(dataPoint.rows[0].facet).to.equal('organization');
        expect(dataPoint.rows[0].facetInstance).to.equal('Wand');
        expect(dataPoint.rows[0].count).to.equal(2);
        expect(dataPoint.rows[0].facetInstanceColor).to.equal('rgba(0, 0, 0, 1)');
        expect(dataPoint.rows[0].iconClass).to.equal('fa fa-sitemap');
        expect(dataPoint.rows[0].bucket).to.equal('level1');
    });
    it('should return the result with rangeValues', () => {
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
        const dataPoint = data['organization'][1];
        expect(dataPoint.rows[0].rangeValues).to.equal(dataPoint.rangeValues);

        expect(dataPoint.rangeValues[0].value).to.equal('fa fa-sitemap');
        expect(dataPoint.rangeValues[0].valueLabel).to.equal('fa fa-sitemap');
        expect(dataPoint.rangeValues[0].key).to.equal('class');
        expect(dataPoint.rangeValues[1].value['getTime']()).to.equal(new Date('2016/01/02').getTime());
        expect(dataPoint.rangeValues[1].valueLabel.slice(0, 15)).to.equal('Sat Jan 02 2016');
        expect(dataPoint.rangeValues[1].key).to.equal('date');
    });
    it('should return the result with correct data values', () => {
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
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
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
        const dataPoint = data['location'][0];

        expect(dataPoint.facetLabel).to.equal('*Location');
        expect(dataPoint.instanceValue).to.equal('@California2');
        expect(dataPoint.instanceLabel).to.equal('@California');
        expect(dataPoint.rangeValues[1].valueLabel[0]).to.equal('#');
        expect(dataPoint.instanceCountFormatter.format).to.be.an('function');
    });
    it('should return the result with default highlight value of 0', () => {
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
        expect(data['location'][0].highlight).to.equal(0);
        expect(data['organization'][0].highlight).to.equal(0);
    });
    it('should return the result with correct highlight values', () => {
        dataView.categorical.values[0].highlights = [1, 2, null];
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;

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
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
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
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;
        const key = Object.keys(data)[0];
        expect(data[key][0].facetKey).to.equal('\\(facet\\)');
    });
    it('should return the result with undefined color with no color column provided', () => {
        sinon.stub(utils, 'findColumn').returns(undefined);
        const data = dataConversion.convertToDataPointsMap(<any>dataView).dataPointsMap;

        expect(data['organization'][0].instanceColor).to.be.undefined;
        expect(data['organization'][1].instanceColor).to.be.undefined;

        utils.findColumn['restore']();
    });
});

describe('.aggregateDataPointsMap', () => {
    let data;
    let result;

    beforeEach(() => {
        data = { dataPointsMap: _.cloneDeep(mockDataPointsMap) }
    });

    it('should return hasHighlight flag', () => {
        result = dataConversion.aggregateDataPointsMap(data);
        expect(result.hasHighlight).to.be.false;
        data.hasHighlight = true;
        result = dataConversion.aggregateDataPointsMap(data);
        expect(result.hasHighlight).to.be.true;
    });
    it('should return selected dps', () => {
        result = dataConversion.aggregateDataPointsMap(data);
        expect(result.selectedDataPoints).to.be.undefined;
        result = dataConversion.aggregateDataPointsMap(data, { selectedDataPoints: [<any>'dummyDp'] });
        expect(result.selectedDataPoints).to.be.deep.equal(['dummyDp']);
    });

    describe('for dataPointsMap result', () => {
        it('should return datapoints map with correct values', () => {
            result = dataConversion.aggregateDataPointsMap(data);
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
            expect(dp.rows[0].identity).to.equal('fakeId3');
            expect(dp.highlight).to.equal(2);
            expect(dp.instanceCount).to.equal(3);
            expectDataPointsPropertyMatch(dp, data.dataPointsMap['location'][0]);

            dp = result.dataPointsMap['organization'][0];
            expectDataPointsPropertyMatch(dp, data.dataPointsMap['organization'][0]);
        });
        it('should aggregate the datapoints on facetInstanceLabel', () => {
            result = dataConversion.aggregateDataPointsMap(data);
            let dp = result.dataPointsMap['organization'][0];

            expect(result.dataPointsMap['organization']).to.be.an('array').length(1);
            // note fakeRow1 and fakeRow2 both have same facetInstance label
            expect(dp.rows[0].identity).to.equal('fakeId1');
            expect(dp.rows[1].identity).to.equal('fakeId2');
            expect(dp.highlight).to.equal(4); // 2 + 2
            expect(dp.instanceCount).to.equal(7); // 4 + 3

            dp = result.dataPointsMap['location'][1];
            expect(result.dataPointsMap['location']).to.be.an('array').length(2);
            expect(dp.rows[0].identity).to.equal('fakeId4');
            expect(dp.rows[1].identity).to.equal('fakeId5');
            expect(dp.highlight).to.equal(6); // 6 + 0
            expect(dp.instanceCount).to.equal(10);
        });
        it('should bucket aggregated count and highlights on bucket value', () => {
            result = dataConversion.aggregateDataPointsMap(data);
            let dp = result.dataPointsMap['organization'][0];

            expect(dp.bucket['level1'].instanceCount).to.equal(4);
            expect(dp.bucket['level2'].instanceCount).to.equal(3);
            expect(dp.bucket['level1'].highlight).to.equal(2);
            expect(dp.bucket['level2'].highlight).to.equal(2);

            dp = result.dataPointsMap['location'][1];

            expect(dp.bucket['level1'].instanceCount).to.equal(10);
            expect(dp.bucket['level1'].highlight).to.equal(6);
        });
        it('should not return bucket if rows have no bucket value', () => {
            delete data.dataPointsMap.organization[0].rows[0].bucket;
            delete data.dataPointsMap.organization[1].rows[0].bucket;
            result = dataConversion.aggregateDataPointsMap(data);

            const dp = result.dataPointsMap['organization'][0];
            expect(dp.bucket).to.be.undefined;
        });
        it('should apply case insensitive keyword filter', () => {
            result = dataConversion.aggregateDataPointsMap(data, {contains: 'new'});
            const dp = result.dataPointsMap['location'][0];

            expect(Object.keys(result.dataPointsMap)).to.deep.equal(['location']);
            expect(result.dataPointsMap.location).to.have.length(1);
            expect(dp.instanceLabel).to.equal('New York');
            expect(dp.instanceCount).to.equal(10);
        });
        it('should apply a range filter', () => {
            result = dataConversion.aggregateDataPointsMap(data, {
                range: {
                    date: buildRangeObj('2016-01-01', '2016-01-01'),
                    class: buildRangeObj('fa fa-sitemap', 'fa fa-sitemap'),
               }
            });
            const dp = result.dataPointsMap['organization'][0];

            expect(Object.keys(result.dataPointsMap)).to.deep.equal(['organization']);
            expect(result.dataPointsMap.organization).to.have.length(1);
            expect(dp.instanceLabel).to.equal('Wand');
            expect(dp.instanceCount).to.equal(4);
        });
        it('should apply both range and keyword filters', () => {
            result = dataConversion.aggregateDataPointsMap(data, {
                contains: 'new york',
                range: {
                    date: buildRangeObj('2016-01-02', '2016-01-03'),
               }
            });
            const dp = result.dataPointsMap['location'][0];

            expect(Object.keys(result.dataPointsMap)).to.deep.equal(['location']);
            expect(result.dataPointsMap.location).to.have.length(1);
            expect(dp.instanceLabel).to.equal('New York');
            expect(dp.instanceCount).to.equal(8);
        });
        it('should bypass keyword filter with selected data points', () => {
            result = dataConversion.aggregateDataPointsMap(data, {
                contains: 'new york',
                range: {
                    date: buildRangeObj('2016-01-02', '2016-01-03'),
               },
               selectedDataPoints: [<DataPoint>{ instanceLabel: 'Wand', facetKey: 'organization' }],
            });
            const dp = result.dataPointsMap['organization'][0];

            expect(Object.keys(result.dataPointsMap)).to.deep.equal(['organization', 'location']);
            expect(dp.instanceLabel).to.equal('Wand');
            expect(dp.instanceCount).to.equal(3);
        });
        it('should keep selected data point even it has 0 instance count after range filter', () => {
            result = dataConversion.aggregateDataPointsMap(data, {
                contains: 'new york',
                range: {
                    date: buildRangeObj('2016-01-04', '2016-01-08'),
               },
               selectedDataPoints: [<DataPoint>{ instanceLabel: 'Wand', facetKey: 'organization' }],
            });
            const dp = result.dataPointsMap['organization'][0];
            expect(dp.instanceLabel).to.equal('Wand');
            expect(dp.instanceCount).to.equal(0);
        });
    });
    describe('for rangeDataMap result', () => {
        it('should unwind and aggregate dp by its range values and group them by range value key ', () => {
            result = dataConversion.aggregateDataPointsMap(data);
            const classRangeDps = result.rangeDataMap['class'];
            const dateRangeDps = result.rangeDataMap['date'];
            expect(Object.keys(classRangeDps)).to.deep.equal(['fa fa-sitemap', 'fa fa-globe']);
            expect(Object.keys(dateRangeDps)).to.deep.equal(['2016-01-01', '2016-01-02', '2016-01-04']);
        });
        it('should return the correct aggregated values', () => {
            result = dataConversion.aggregateDataPointsMap(data);
            let rangePoint = result.rangeDataMap['class']['fa fa-globe'];
            expect(rangePoint.rows[0].identity).to.equal('fakeId3');
            expect(rangePoint.rows[1].identity).to.equal('fakeId4');
            expect(rangePoint.rows[2].identity).to.equal('fakeId5');
            delete rangePoint.rows;
            expect(rangePoint).to.deep.equal({
                facetKey: 'class',
                label: 'fa fa-globe',
                count: 13,
                highlight: 8,
                subSelection: 13,
                metadata: {
                  rangeValue: 'fa fa-globe'
                }
            });
            rangePoint = result.rangeDataMap['date']['2016-01-02'];
            expect(rangePoint.rows[0].identity).to.equal('fakeId2');
            expect(rangePoint.rows[1].identity).to.equal('fakeId4');
            delete rangePoint.rows;
            expect(rangePoint).to.deep.equal({
                facetKey: 'date',
                label: '2016-01-02',
                count: 11,
                highlight: 8,
                subSelection: 11,
                metadata: {
                  rangeValue: '2016-01-02'
                }
            });
        });
        it('should apply case insensitive keyword filter', () => {
            result = dataConversion.aggregateDataPointsMap(data, {contains: 'new'});
            const classData = result.rangeDataMap['class']; //['fa fa-globe'];
            const datesData = result.rangeDataMap['date'];
            expect(classData['fa fa-globe'].count).to.equal(13);
            expect(classData['fa fa-globe'].subSelection).to.equal(10);

            expect(classData['fa fa-sitemap'].count).to.equal(7);
            expect(classData['fa fa-sitemap'].subSelection).to.equal(0);


            expect(datesData['2016-01-01'].count).to.equal(7);
            expect(datesData['2016-01-01'].subSelection).to.equal(0);

            expect(datesData['2016-01-02'].count).to.equal(11);
            expect(datesData['2016-01-02'].subSelection).to.equal(8);

            expect(datesData['2016-01-04'].count).to.equal(2);
            expect(datesData['2016-01-04'].subSelection).to.equal(2);
        });
        it('should apply a range filter', () => {
            result = dataConversion.aggregateDataPointsMap(data, {
                range: {
                    date: buildRangeObj('2016-01-01', '2016-01-02'),
                    class: buildRangeObj('fa fa-globe', 'fa fa-globe'),
               }
            });
            const classData = result.rangeDataMap['class'];
            const datesData = result.rangeDataMap['date'];

            expect(classData['fa fa-globe'].subSelection).to.equal(11);
            expect(classData['fa fa-sitemap'].subSelection).to.equal(0);

            expect(datesData['2016-01-01'].subSelection).to.equal(3);
            expect(datesData['2016-01-02'].subSelection).to.equal(8);
            expect(datesData['2016-01-04'].subSelection).to.equal(0);
        });
        it('should apply both range and keyword filter', () => {
            result = dataConversion.aggregateDataPointsMap(data, {
                contains: 'new york',
                range: {
                    date: buildRangeObj('2016-01-01', '2016-01-02'),
                    class: buildRangeObj('fa fa-globe', 'fa fa-globe'),
               }
            });
            const classData = result.rangeDataMap['class'];
            const datesData = result.rangeDataMap['date'];

            expect(classData['fa fa-globe'].subSelection).to.equal(8);
            expect(classData['fa fa-sitemap'].subSelection).to.equal(0);

            expect(datesData['2016-01-01'].subSelection).to.equal(0);
            expect(datesData['2016-01-02'].subSelection).to.equal(8);
            expect(datesData['2016-01-04'].subSelection).to.equal(0);

        });
        it('should bypass keyword filter with selected data points', () => {
            result = dataConversion.aggregateDataPointsMap(data, {
                contains: 'new york',
                range: {
                    date: buildRangeObj('2016-01-02', '2016-01-03'),
               },
               selectedDataPoints: [<DataPoint>{ instanceLabel: 'Wand', facetKey: 'organization' }],
            });
            const classData = result.rangeDataMap['class'];
            const datesData = result.rangeDataMap['date'];

            expect(classData['fa fa-globe'].subSelection).to.equal(8);
            expect(classData['fa fa-sitemap'].subSelection).to.equal(3);

            expect(datesData['2016-01-01'].subSelection).to.equal(0);
            expect(datesData['2016-01-02'].subSelection).to.equal(11);
            expect(datesData['2016-01-04'].subSelection).to.equal(0);
        });
    });
});

describe('.convertToFacetsVisualData', () => {
    const DEFAULT_SETTINGS = {
        facetCount: {
            initial: 4,
            increment: 50,
        },
        facetState: {
            rangeFacet: '{}',
            normalFacet: '{}',
        },
        display: {
            selectionCount: false
        }
    };
    let aggregatedData;
    let result;

    const replaceVariable = (obj, variableName, value) => (obj[variableName] = value);
    const getFacetGroup = (facetsData, key) => _.find(facetsData, obj => obj['key'] === key);

    beforeEach(() => {
        replaceVariable(utils, '__restore_COLOR_PALETTE', utils.COLOR_PALETTE);
        aggregatedData = _.cloneDeep(mockAggregatedData);
    });
    afterEach(() => {
        replaceVariable(utils, 'COLOR_PALETTE', utils['__restore_COLOR_PALETTE']);
        delete utils['_rstore_COLOR_PALETTE'];
    });

    it('should return the result with aggregatedData', () => {
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        expect(result.aggregatedData).to.equal(aggregatedData);
    });
    it('should return the the result with boolean indicating that data has highlights', () => {
        aggregatedData.hasHighlight = true;
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        expect(result.hasHighlight).to.equal(true);
    });
    /* Sorting */
    it('should return facets data where facets are sorted by instance count in descending order', () => {
        aggregatedData.dataPointsMap.organization.forEach((dp) => { delete dp.bucket; });
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const orgGroup = <FacetGroup>getFacetGroup(facetsData, 'organization');
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');

        // test values
        expect(orgGroup.label).to.equal('Organization');
        expect(orgGroup.facets[0].icon).to.deep.equal({
                class: 'fa fa-sitemap',
                color: 'rgba(0, 0, 0, 1)'
        });
        expect(orgGroup.facets[0].count).to.equal(7);
        expect(orgGroup.facets[0].countLabel).to.equal('$7');
        expect(orgGroup.facets[0].value).to.equal('Wand1');
        expect(orgGroup.facets[0].label).to.equal('Wand');

        // test sorting
        expect(locGroup.facets).to.be.length(2);
        expect(locGroup.facets[0].count > locGroup.facets[1].count).to.be.true;
    });
    it('should sort facets by alphabetical order if they have same count', () => {
        aggregatedData.dataPointsMap.location[0].instanceCount = 0;
        aggregatedData.dataPointsMap.location[1].instanceCount = 0;

        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');

        expect(locGroup.facets[0].label).to.equal('California');
        expect(locGroup.facets[1].label).to.equal('New York');
    });
    /* Colors */
    it('should assign facests default colors of 3 diffrent opacities and grey default color', () => {
        sinon.stub(utils, 'getSegmentColor', (baseColor) => baseColor);
        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.forEach((dp) => { delete dp.bucket; });
        locationDps.push(...(_.cloneDeep(locationDps)));
        locationDps.map((dp: DataPoint) => (dp.instanceColor = undefined) && dp);

        replaceVariable(utils, 'COLOR_PALETTE', ['#000000', '#000000']);

        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');

        expect(locGroup.facets[0].icon.color).to.equal('rgba(0, 0, 0, 1)');
        expect(locGroup.facets[1].icon.color).to.equal('rgba(0, 0, 0, 0.6)');
        expect(locGroup.facets[2].icon.color).to.equal('rgba(0, 0, 0, 0.35)');
        expect(locGroup.facets[3].icon.color).to.equal('#DDDDDD');

        utils.getSegmentColor['restore']();
    });
    it('should choose colors from provided colors when the default color palette has no more color', () => {
        sinon.stub(utils, 'getSegmentColor', (baseColor) => baseColor);
        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.forEach((dp) => { delete dp.bucket; });
        locationDps.map((dp: DataPoint) => (dp.instanceColor = undefined) && dp);
        replaceVariable(utils, 'COLOR_PALETTE', []);

        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [{ value: '#FFFFFF' }, {value: '#FFFFFF' }],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(locGroup.facets[0].icon.color).to.equal('rgba(255, 255, 255, 1)');
        utils.getSegmentColor['restore']();
    });
    it('should assign maximum instanceCount to each facetGroup', () => {
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const orgGroup = <FacetGroup>getFacetGroup(facetsData, 'organization');
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(orgGroup.total).to.equal(10);
        expect(locGroup.total).to.equal(10);
    });
    it('should limit the number of facets by initial facetCountSetting', () => {
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: _.assign({}, DEFAULT_SETTINGS, { facetCount: {initial: 1, increment: 50}})
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(locGroup.facets).to.have.length(1);
        expect(locGroup.allFacets).to.have.length(2);
    });
    it('should assign proper facetGroup.more data when there is more facets other than initial facets', () => {
        sinon.stub(utils, 'otherLabelTemplate').withArgs(1).returns('Label1');
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: _.assign({}, DEFAULT_SETTINGS, { facetCount: {initial: 1, increment: 50}})
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(locGroup.more).to.deep.equal([
            { label: 'Label1', class: 'other', clickable: false },
            { label: 'More', class: 'more', clickable: true }
        ]);
        utils.otherLabelTemplate['restore']();
    });
    it('should not return facetGroup.more when initial num facets > actual num of facets data', () => {
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(locGroup.more).to.deep.equal(0);
    });
    it('should order facet groups based on provided facetState', () => {
        const facetState = {
            rangeFacet: '{"date":{"order":2}}',
            normalFacet: '{"organization":{"order":3},"location":{"order":1}}',
        };
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: _.assign({}, DEFAULT_SETTINGS, { facetState: facetState })
        });
        const facetsData = result.facetsData;
        expect(facetsData[0].key).to.equal('icon_class');
        expect(facetsData[1].key).to.equal('location');
        expect(facetsData[2].key).to.equal('date');
        expect(facetsData[3].key).to.equal('organization');
    });
    it('should set collased flag on each facet group based on the provided facetState', () => {
        const facetState = {
            rangeFacet: '{"date":{"order":2}}',
            normalFacet: '{"organization":{"order":3},"location":{"order":1,"collapsed":true}}',
        };
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: _.assign({}, DEFAULT_SETTINGS, { facetState: facetState })
        });
        const facetsData = result.facetsData;
        expect(facetsData[1].key).to.equal('location');
        expect(facetsData[1].collapsed).to.be.true;
        expect(facetsData[3].key).to.equal('organization');
        expect(facetsData[3].collapsed).to.be.false;
    });
    it('should populate facets selection data if there are highlights', () => {
        aggregatedData.dataPointsMap.organization.forEach((dp) => { delete dp.bucket; });
        aggregatedData.dataPointsMap.location.forEach((dp) => { delete dp.bucket; });
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const selectionData = result.facetsSelectionData;
        const orgGroup = <any>getFacetGroup(selectionData, 'organization');
        const locGroup = <any>getFacetGroup(selectionData, 'location');

        expect(orgGroup.facets[0].selected).to.deep.equal({
            count: 4,
            countLabel: '$7',
        });
        expect(orgGroup.facets[0].value).to.equal('Wand1');
        expect(locGroup.facets[1].selected).to.deep.equal({
                count: 2,
                countLabel: '$3',
        });
        expect(locGroup.facets[1].value).to.equal('New York3');
    });
    it('should populate facets selection data with selction count label', () => {
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: _.assign({}, DEFAULT_SETTINGS, { display: { selectionCount: true}})
        });
        const selectionData = result.facetsSelectionData;
        const orgGroup = <any>getFacetGroup(selectionData, 'organization');

        expect(orgGroup.facets[0].selected.countLabel).to.deep.equal('$4 / $7');
    });
    it('should filter out unhighlighted data when there are highlights', () => {
        aggregatedData.hasHighlight = true;
        aggregatedData.dataPointsMap.organization[0].highlight = null;
        aggregatedData.dataPointsMap.location[0].highlight = null;
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(facetsData).to.have.length(3); // 2 range facet group + location facet group
        expect(locGroup.facets).to.have.length(1);
    });
    it('should return selected data points', () => {
        aggregatedData.selectedDataPoints = [<any>'dummyDp1', <any>'dummyDp2'];
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        expect(result.selectedDataPoints).to.have.length(2);
        expect(result.selectedDataPoints[0]).to.equal('dummyDp1');
    });
    it('should convert selected datapoints to facets data and prepend them to facets list in descending order', () => {
        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.push(...(_.cloneDeep(locationDps)));
        locationDps[2].instanceValue = 'prepend1';
        locationDps[2].instanceLabel = 'prepend1';
        locationDps[2].instanceCount = 10;
        locationDps[3].instanceValue = 'prepend2';
        locationDps[3].instanceLabel = 'prepend2';
        locationDps[3].instanceCount = 11;
        aggregatedData.selectedDataPoints = [locationDps[2], locationDps[3]];

        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: _.assign({}, DEFAULT_SETTINGS, { facetCount: {initial: 1, increment: 50}})
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        // prepended facets should not be limited by initial count
        expect(locGroup.facets).to.be.length(2);
        expect(locGroup.allFacets).to.be.length(4);
        expect(locGroup.facets[0].value).to.equal('prepend2');
        expect(locGroup.facets[1].value).to.equal('prepend1');
    });
    it('should create segments data for each facet when there is bucket data', () => {
        const stub = sinon.stub(utils, 'createSegments', (bucket, color, isHighlight) => {
            const seg = isHighlight ? 'fakeHighlightSeg' : 'fakeSeg';
            return `${seg}:${JSON.stringify(bucket)}:${color}`;
        });
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS,
        });
        const facetsData = result.facetsData;
        const selectionData = result.facetsSelectionData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        const selectionLocGroup = <any>getFacetGroup(selectionData, 'location');

        expect(locGroup.facets[0].segments).to.deep.equal('fakeSeg:{"level1":{"instanceCount":10,"highlight":6}}:rgba(0, 0, 0, 1)');
        expect(selectionLocGroup.facets[0].selected.segments).to.deep.equal('fakeHighlightSeg:{"level1":{"instanceCount":10,"highlight":6}}:rgba(0, 0, 0, 1)');
        // expect(selectionLocGroup.facets[0].selected.segments).to.deep.equal('fakeHighlightSeg:{"level1":{"instanceCount":10,"highlight":6}}:#00c6e1:undefined');
        expect(result.aggregatedData.dataPointsMap['location'][0].selectionColor.color).to.equal('rgba(0, 0, 0, 1)');
        expect(result.aggregatedData.dataPointsMap['location'][0].selectionColor.opacity).to.equal(100);
        stub.restore();
    });
    it('should assign default colors to segments and icon', () => {
        sinon.stub(utils, 'createSegments', (bucket, color, isHighlight, opacity) => 'color:' + color);
        sinon.stub(utils, 'getSegmentColor', (arg1, arg2, arg3, arg4, arg5) => '' + arg1 + arg2 + arg3 + arg4 + arg5);

        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.push(...(_.cloneDeep(locationDps)));
        locationDps.forEach(dp => delete dp.instanceColor);
        delete aggregatedData.dataPointsMap.organization;

        replaceVariable(utils, 'COLOR_PALETTE', ['#000000', '#000000']);
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS,
        });
        const facetsData = result.facetsData;
        const selectionData = result.facetsSelectionData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');

        expect(locGroup.facets[0].segments).to.equal('color:rgba(0, 0, 0, 1)');
        expect(locGroup.facets[3].segments).to.equal('color:rgba(0, 0, 0, 1)');

        expect(locGroup.facets[0].icon.color).to.equal('rgba(0, 0, 0, 1)10001false');
        expect(locGroup.facets[3].icon.color).to.equal('rgba(0, 0, 0, 1)10001false');

        utils.getSegmentColor['restore']();
        utils.createSegments['restore']();
    });

    /* Range Facets */
    it('should return range facet group', () => {
        const facetState = {
            normalFacet: '{}',
            rangeFacet: '{"date":{"order":1,"collapsed":true}}',
        };
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: _.assign({}, DEFAULT_SETTINGS, { facetState: facetState })
        });
        const facetsData = result.facetsData;
        const dateGroup = <FacetGroup>getFacetGroup(facetsData, 'date');
        const classGroup = <FacetGroup>getFacetGroup(facetsData, 'icon_class');

        expect(dateGroup.label).to.equal('Date');
        expect(dateGroup.order).to.equal(1);
        expect(dateGroup.isRange).to.equal(true);
        expect(dateGroup.collapsed).to.equal(true);

        expect(classGroup.label).to.equal('Icon Class');
        expect(classGroup.order).to.equal(0);
        expect(classGroup.isRange).to.equal(true);
        expect(classGroup.collapsed).to.equal(false);
    });
    it('should return range facet slices sorted by range value', () => {
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const dateGroup = <FacetGroup>getFacetGroup(facetsData, 'date');
        const classGroup = <FacetGroup>getFacetGroup(facetsData, 'icon_class');

        expect(dateGroup.facets[0].value).to.equal('date');
        expect(dateGroup.facets[0]['histogram'].slices[0].label).to.equal('2016-01-01');
        expect(dateGroup.facets[0]['histogram'].slices[1].label).to.equal('2016-01-02');
        expect(dateGroup.facets[0]['histogram'].slices[2].label).to.equal('2016-01-04');
        expect(dateGroup.facets[0]['histogram'].slices[0].metadata.isFirst).to.be.true;
        expect(dateGroup.facets[0]['histogram'].slices[2].metadata.isLast).to.be.true;

        expect(classGroup.facets[0].value).to.equal('icon_class');
        expect(classGroup.facets[0]['histogram'].slices[0].label).to.equal('fa fa-globe');
        expect(classGroup.facets[0]['histogram'].slices[1].label).to.equal('fa fa-sitemap');
        expect(classGroup.facets[0]['histogram'].slices[0].metadata.isFirst).to.be.true;
        expect(classGroup.facets[0]['histogram'].slices[1].metadata.isLast).to.be.true;
    });
    it('should return subselection range facet slices', () => {
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const dateGroup = <FacetGroup>getFacetGroup(facetsData, 'date');

        expect(Object.keys(dateGroup.facets[0]['selection'].slices)).to.have.length(3);
        expect(dateGroup.facets[0]['selection'].slices['2016-01-01']).to.equal(11);
        expect(dateGroup.facets[0]['selection'].slices['2016-01-02']).to.equal(2);
        expect(dateGroup.facets[0]['selection'].slices['2016-01-04']).to.equal(7);
    });
    it('should return highlight range facet slices', () => {
        aggregatedData.hasHighlight = true;
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const dateGroup = <FacetGroup>getFacetGroup(facetsData, 'date');

        expect(Object.keys(dateGroup.facets[0]['selection'].slices)).to.have.length(3);
        expect(dateGroup.facets[0]['selection'].slices['2016-01-01']).to.equal(8);
        expect(dateGroup.facets[0]['selection'].slices['2016-01-02']).to.equal(0);
        expect(dateGroup.facets[0]['selection'].slices['2016-01-04']).to.equal(4);
    });
    it('should set selection range based on the provided range filter', () => {
        result = dataConversion.convertToFacetsVisualData(aggregatedData, {
            selectedRange: { date: { from: { index: 1 }, to: { index: 3 } } },
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const dateGroup = <FacetGroup>getFacetGroup(facetsData, 'date');
        const classGroup = <FacetGroup>getFacetGroup(facetsData, 'icon_class');

        expect(dateGroup.facets[0]['selection'].range.from).to.equal(1);
        expect(dateGroup.facets[0]['selection'].range.to).to.equal(3);

        expect(classGroup.facets[0]['selection'].range).to.be.undefined;

    });
    /* Range Facets End */
});

});