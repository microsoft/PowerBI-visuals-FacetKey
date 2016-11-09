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
        expect(dataPoint.rows[0].bucket).to.equal('level1');
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
            expectDataPointsPropertyMatch(dp, dataPointsMap['location'][0]);

            dp = result.dataPointsMap['organization'][0];
            expectDataPointsPropertyMatch(dp, dataPointsMap['organization'][0]);
        });
        it('should aggregate the datapoints on facetInstanceLabel', () => {
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
            dataPointsMap = _.cloneDeep(mockDataPointsMap);
            delete dataPointsMap.organization[0].rows[0].bucket;
            delete dataPointsMap.organization[1].rows[0].bucket;
            result = dataConversion.aggregateDataPointMap(dataPointsMap);

            const dp = result.dataPointsMap['organization'][0];
            expect(dp.bucket).to.be.undefined;
        });
        it('should apply range filter');
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
        it('should apply range filter');
        it('should apply keyword filter');
        it('should handle correctly with selected instances');
    });
});

describe('.convertDataPointMap', () => {
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
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            settings: DEFAULT_SETTINGS
        });
        expect(result.aggregatedData).to.equal(aggregatedData);
    });
    it('should return the the result with boolean indicating that data has highlights', () => {
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: true,
            settings: DEFAULT_SETTINGS
        });
        expect(result.hasHighlight).to.equal(true);
    });
    /* Sorting */
    it('should return facets data where facets are sorted by instance count in descending order', () => {
        aggregatedData.dataPointsMap.organization.forEach((dp) => { delete dp.bucket; });
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
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
    it('should sort facets with same count by alphabetical order', () => {
        aggregatedData.dataPointsMap.location[0].instanceCount = 0;
        aggregatedData.dataPointsMap.location[1].instanceCount = 0;

        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');

        expect(locGroup.facets[0].label).to.equal('California');
        expect(locGroup.facets[1].label).to.equal('New York');
    });
    /* Colors */
    it('should assign facests default colors of 3 diffrent opacity and grey default color', () => {
        sinon.stub(utils, 'getSegmentColor', (baseColor) => baseColor);
        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.push(...(_.cloneDeep(locationDps)));
        locationDps.map((dp: DataPoint) => (dp.instanceColor = undefined) && dp);

        replaceVariable(utils, 'COLOR_PALETTE', ['#000000', '#000000']);

        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
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
    it('should choose colors from provided colors when no more colors are in default palette', () => {
        sinon.stub(utils, 'getSegmentColor', (baseColor) => baseColor);
        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.map((dp: DataPoint) => (dp.instanceColor = undefined) && dp);
        replaceVariable(utils, 'COLOR_PALETTE', []);

        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [{ value: '#FFFFFF' }, {value: '#FFFFFF' }],
            hasHighlight: false,
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(locGroup.facets[0].icon.color).to.equal('rgba(255, 255, 255, 1)');
        utils.getSegmentColor['restore']();
    });
    it('should assign maximum instanceCount to each facetGroup data', () => {
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const orgGroup = <FacetGroup>getFacetGroup(facetsData, 'organization');
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(orgGroup.total).to.equal(10);
        expect(locGroup.total).to.equal(10);
    });
    it('should limit number of facets data by initial facetCountSetting', () => {
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: _.assign({}, DEFAULT_SETTINGS, { facetCount: {initial: 1, increment: 50}})
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(locGroup.facets).to.have.length(1);
        expect(locGroup.allFacets).to.have.length(2);
    });
    it('should assign proper facetGroup.more data when there is more facets other than initial facets', () => {
        sinon.stub(utils, 'otherLabelTemplate').withArgs(1).returns('Label1');
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
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
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(locGroup.more).to.deep.equal(0);
    });
    it('should order facet group based on provided facetState', () => {
        const facetState = {
            rangeFacet: '{}',
            normalFacet: '{"organization":{"order":1},"location":{"order":0}}',
        };
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: _.assign({}, DEFAULT_SETTINGS, { facetState: facetState })
        });
        const facetsData = result.facetsData;
        expect(facetsData[0].key).to.equal('location');
        expect(facetsData[1].key).to.equal('organization');
    });
    it('should set collased flag on facet group based on provided facetState', () => {
        const facetState = {
            rangeFacet: '{}',
            normalFacet: '{"location":{"order":1,"collapsed":true}}',
        };
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: _.assign({}, DEFAULT_SETTINGS, { facetState: facetState })
        });
        const facetsData = result.facetsData;
        expect(facetsData[0].key).to.equal('organization');
        expect(facetsData[0].collapsed).to.be.false;
        expect(facetsData[1].key).to.equal('location');
        expect(facetsData[1].collapsed).to.be.true;
    });
    it('should populate facets selection data if there are highlights', () => {
        aggregatedData.dataPointsMap.organization.forEach((dp) => { delete dp.bucket; });
        aggregatedData.dataPointsMap.location.forEach((dp) => { delete dp.bucket; });
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
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
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: _.assign({}, DEFAULT_SETTINGS, { display: { selectionCount: true}})
        });
        const selectionData = result.facetsSelectionData;
        const orgGroup = <any>getFacetGroup(selectionData, 'organization');

        expect(orgGroup.facets[0].selected.countLabel).to.deep.equal('$4 / $7');
    });
    it('should filter out unhighlighted data when there are highlights', () => {
        aggregatedData.dataPointsMap.organization[0].highlight = null;
        aggregatedData.dataPointsMap.location[0].highlight = null;
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: true,
            settings: DEFAULT_SETTINGS
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        expect(facetsData).to.have.length(1);
        expect(locGroup.facets).to.have.length(1);
    });
    it('should return selected data points', () => {
        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.push(...(_.cloneDeep(locationDps)));
        locationDps[2].isSelected = true;
        locationDps[2].instanceValue = 'selected1';
        locationDps[3].isSelected = true;
        locationDps[3].instanceValue = 'selected2';
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: DEFAULT_SETTINGS
        });
        expect(result.selectedDataPoints).to.have.length(2);
        expect(result.selectedDataPoints[0].instanceValue).to.equal('selected2');
        expect(result.selectedDataPoints[1].instanceValue).to.equal('selected1');
    });
    it('should convert selected datapoints and prepend them to facets list in descending order', () => {
        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.push(...(_.cloneDeep(locationDps)));
        locationDps[2].isSelected = true;
        locationDps[2].instanceValue = 'prepend1';
        locationDps[2].instanceCount = 10;
        locationDps[3].isSelected = true;
        locationDps[3].instanceValue = 'prepend2';
        locationDps[3].instanceCount = 11;
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: _.assign({}, DEFAULT_SETTINGS, { facetCount: {initial: 1, increment: 50}})
        });
        const facetsData = result.facetsData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        // prepended facets should not be limitied by inital count
        expect(locGroup.facets).to.be.length(2);
        expect(locGroup.allFacets).to.be.length(4);
        expect(locGroup.facets[0].value).to.equal('prepend2');
        expect(locGroup.facets[1].value).to.equal('prepend1');
    });
    it('should create segments data for each facet when there is a bucket', () => {
        const stub = sinon.stub(utils, 'createSegments', (bucket, color, isHighlight, opacity) => {
            const seg = isHighlight ? 'fakeHighlightSeg' : 'fakeSeg';
            return `${seg}:${JSON.stringify(bucket)}:${color}:${opacity}`;
        });
        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: DEFAULT_SETTINGS,
        });
        const facetsData = result.facetsData;
        const selectionData = result.facetsSelectionData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');
        const selectionLocGroup = <any>getFacetGroup(selectionData, 'location');

        expect(locGroup.facets[0].segments).to.deep.equal('fakeSeg:{"level1":{"instanceCount":10,"highlight":6}}:rgba(0, 0, 0, 1):100');
        expect(selectionLocGroup.facets[0].selected.segments).to.deep.equal('fakeHighlightSeg:{"level1":{"instanceCount":10,"highlight":6}}:#00c6e1:undefined');
        stub.restore();
    });
    it('should assign colors with diffrent opacity to segments and icon', () => {
        sinon.stub(utils, 'createSegments', (bucket, color, isHighlight, opacity) => 'opacity:' + opacity);
        sinon.stub(utils, 'getSegmentColor',(arg1, arg2, arg3, arg4, arg5) => '' + arg1 + arg2 + arg3 + arg4 + arg5)

        const locationDps = aggregatedData.dataPointsMap.location;
        locationDps.push(...(_.cloneDeep(locationDps)));
        locationDps.forEach(dp => delete dp.instanceColor);
        delete aggregatedData.dataPointsMap.organization;

        result = dataConversion.convertDataPointMap(aggregatedData, {
            colors: [],
            hasHighlight: false,
            settings: DEFAULT_SETTINGS,
        });
        const facetsData = result.facetsData;
        const selectionData = result.facetsSelectionData;
        const locGroup = <FacetGroup>getFacetGroup(facetsData, 'location');

        expect(locGroup.facets[0].segments).to.equal('opacity:100');
        expect(locGroup.facets[1].segments).to.equal('opacity:60');
        expect(locGroup.facets[2].segments).to.equal('opacity:35');
        expect(locGroup.facets[3].segments).to.equal('opacity:0');

        expect(utils.getSegmentColor).to.be.calledThrice;
        expect(locGroup.facets[0].icon.color).to.equal('rgba(255, 0, 31, 1)10001false');
        expect(locGroup.facets[1].icon.color).to.equal('rgba(255, 0, 31, 0.6)6001false');
        expect(locGroup.facets[2].icon.color).to.equal('rgba(255, 0, 31, 0.35)3501false');
        expect(locGroup.facets[3].icon.color).to.equal('#DDDDDD');

        utils.getSegmentColor['restore']();
        utils.createSegments['restore']();
    });
});
