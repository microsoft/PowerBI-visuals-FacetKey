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

import DataView = powerbi.DataView;
import IValueFormatter = powerbi.visuals.IValueFormatter;
import DataViewObjects = powerbi.DataViewObjects;
import IColorInfo = powerbi.IColorInfo;
import {
    findColumn,
    safeKey,
    hexToRgba,
    convertToHSL,
    getSegmentColor,
    otherLabelTemplate,
    createSegments,
    createTimeSeries,
    HIGHLIGHT_COLOR,
    COLOR_PALETTE
} from './utils';
import * as _ from 'lodash';

/**
 * Maximum number of facet groups to be rendered.
 */
const MAX_NUM_FACET_GROUPS = 100;

/**
 * Convert the given dataview into a data points map in which data points are grouped by facet key.
 *
 * @param  {DataView}          dataView A dataView object.
 * @return {DataPointsMapData}          Converted data.
 */
export function convertToDataPointsMap(dataView: DataView): DataPointsMapData {
    const viz = powerbi.visuals;
    const category = dataView.categorical.categories && dataView.categorical.categories[0];
    const values = dataView.categorical.values || <powerbi.DataViewValueColumn[]>[];
    const highlights = values[0] && values[0].highlights;
    const table = dataView.table;
    const rows = table.rows;
    const columns = dataView.metadata.columns;
    const identities = table.identity || [];

    const countColumn = findColumn(dataView, 'count');
    const instanceColumn = findColumn(dataView, 'facetInstance');
    const facetColumn = findColumn(dataView, 'facet');
    const rangeValueColumns = findColumn(dataView, 'rangeValue', true);
    const colorColumn = findColumn(dataView, 'facetInstanceColor');

    const countFormatter = (countColumn && countColumn.format) &&  viz.valueFormatter.create({format: countColumn.format});
    const facetFormatter = (facetColumn && facetColumn.format) && viz.valueFormatter.create({format: facetColumn.format});
    const instanceFormatter = (instanceColumn && instanceColumn.format) && viz.valueFormatter.create({format: instanceColumn.format});
    const rangeValueFormatter = (rangeValueColumns && rangeValueColumns[0].format)
        && viz.valueFormatter.create({format: rangeValueColumns[0].format});

    const dataPointsMap = {};

    // Convert rows to datapointsMap
    rows.forEach((row, index) => {
        const highlight = (highlights && <number>highlights[index]) || 0;
        const identity = identities[index];
        const objects = category && category.objects && category.objects[index];
        // map each value with corresponding column name
        const rowObj: RowObject = { index, identity };
        row.forEach((colValue, idx) => {
            const colRoles = Object.keys(columns[idx].roles);
            // In sandbox mode, date type colValue sometimes include string so we have to force it to be date.
            const columnValue = colValue && (columns[idx].type.dateTime ? new Date(<string>colValue) : colValue);
            colRoles.forEach(role => {
                if (role === 'rangeValue') {
                    const format = columns[idx].format;
                    const columnName = columns[idx].displayName;
                    const rangeValueFormatter = viz.valueFormatter.create({ format: format });
                    !rowObj.rangeValues && (rowObj.rangeValues = []);
                    const value: RangeValue = {
                        value: columnValue,
                        valueLabel: formatValue(rangeValueFormatter, columnValue, ''),
                        key: safeKey(columnName)
                    };
                    columnValue && rowObj.rangeValues.push(value);
                } else {
                    rowObj[role] = columnValue;
                }
            });
        });
        const { facet, facetInstance, count, facetInstanceColor, iconClass, rangeValues } = rowObj;
        const facetKey = safeKey(String(facet || ' '));
        const facetLabel = _.escape(formatValue(facetFormatter, (_.isString(facet) ? facet.charAt(0).toUpperCase() + facet.slice(1) : facet)));
        const instanceLabel = _.escape(formatValue(instanceFormatter, facetInstance));
        const instanceValue = instanceLabel !== '' ? instanceLabel + index : '';
        const instanceCount = Math.max(count, highlight) || 0;
        const instanceCountFormatter = countFormatter;
        const instanceColor = colorColumn ? (facetInstanceColor && String(facetInstanceColor)) || '#DDDDDD' : undefined;
        const instanceIconClass = (iconClass && String(iconClass)) || 'default fa fa-circle';
        const dataPoint: DataPoint = {
            rows: [rowObj],
            highlight,
            facetKey,
            facetLabel,
            instanceValue,
            instanceLabel,
            instanceCount,
            instanceCountFormatter,
            instanceColor,
            instanceIconClass,
            rangeValues,
        };

        !dataPointsMap[facetKey] && (dataPointsMap[facetKey] = []);
        dataPointsMap[facetKey].push(dataPoint);
    });
    return { dataPointsMap, hasHighlight: !!highlights };
}

/**
 * Convert the given DataPointsMapData to aggregated data, optionally applying the given filter
 *
 * @param  {DataPointsMapData}   data   A dataPointsMap data converted from data view.
 * @param  {DataPointsFilter={}} filter A DataPointsFilter which is used to filter the data points.
 * @return {AggregatedData}             Data that contains aggregated data points map and the range data map.
 */
export function aggregateDataPointsMap(data: DataPointsMapData, filter: DataPointsFilter = {}): AggregatedData {
    const dataPointsMap = data.dataPointsMap;
    const aggregatedData = {
        dataPointsMap: {},
        rangeDataMap: {},
        selectedDataPoints: filter.selectedDataPoints,
        sparklineXDomain: [],
        hasHighlight: !!data.hasHighlight
    };
    const constructRangeFacetData = (dp: DataPoint) => {
        if (!dp.rangeValues) { return; }
        dp.rangeValues.forEach((rangeValue: RangeValue) => {
            const key = rangeValue.key;
            const rangeDataMap = aggregatedData.rangeDataMap[key] || (aggregatedData.rangeDataMap[key] = {});
            !rangeDataMap[rangeValue.valueLabel] && (rangeDataMap[rangeValue.valueLabel] = {
                facetKey: key,
                rows: [],
                label: rangeValue.valueLabel,
                count: 0,
                highlight: 0,
                subSelection: 0,
                metadata: {
                    rangeValue: rangeValue.value,
                },
            });
            rangeDataMap[rangeValue.valueLabel].rows.push(...dp.rows);
            rangeDataMap[rangeValue.valueLabel].count += dp.instanceCount;
            rangeDataMap[rangeValue.valueLabel].highlight += dp.highlight;
            const passFilter = (isInSelectedDataPoints(dp, filter.selectedDataPoints) || checkKeywordFilter(filter.contains, dp)) && checkRangeFilter(filter.range, dp.rangeValues);
            if (passFilter) {
                rangeDataMap[rangeValue.valueLabel].subSelection += dp.instanceCount;
            }
        });
    };
    const sparklineXValues = [];
    Object.keys(dataPointsMap).forEach((key: string) => {
        dataPointsMap[key].forEach(constructRangeFacetData);
        const dataPoints: DataPoint[] = aggregateDataPoints(dataPointsMap[key], filter);
        dataPoints.length > 0 && (aggregatedData.dataPointsMap[key] = dataPoints);

        dataPoints.forEach(dp => sparklineXValues.push(...Object.keys(dp['sparklineData'] || {})));
    });
    aggregatedData.sparklineXDomain = _.uniq(sparklineXValues).sort(compareRangeValue);
    return aggregatedData;
}

/**
 * Converts the given aggregated data into facets visual data.
 *
 * @param  {AggregatedData}                   aggregatedData An aggregated data.
 * @param  {ConvertToFacetsVisualDataOptions} options        A options object.
 * @return {FacetsVisualData}                                Data to be used in this visual.
 */
export function convertToFacetsVisualData(aggregatedData: AggregatedData, options: ConvertToFacetsVisualDataOptions): FacetsVisualData {
    const data: FacetsVisualData = {
        aggregatedData: aggregatedData,
        hasHighlight: aggregatedData.hasHighlight,
        facetsData: <FacetGroup[]>[],
        facetsSelectionData: <any>[],
        selectedDataPoints: aggregatedData.selectedDataPoints,
    };

    data.facetsSelectionData.push(...createFacetsSelectionData(aggregatedData, options));
    data.facetsData = [...createRangeFacetsData(aggregatedData, options), ...createFacetsData(aggregatedData, options)]
        .sort((a: any, b: any) => a.order - b.order)
        .slice(0, MAX_NUM_FACET_GROUPS);
    return data;
}

/**
 * Compares two range values (a and b) and returns 1 if a > b, -1 if a < b, or 0 if a = b.
 *
 * @param  {string|number|Object}    a A value representing a date.
 * @param  {string|number|Object}    b A value representing a date.
 * @return {number}
 */
function compareRangeValue(a: any, b: any) {
    const isNumeric = (n: any) => !isNaN(parseFloat(n)) && isFinite(n);
    let aValue: any = Date.parse(a);
    let bValue: any = Date.parse(b);
    const isNumberOnly = isNumeric(a) && isNumeric(b);
    const isNotValidDate = isNumberOnly || isNaN(aValue) || isNaN(bValue);
    if (isNotValidDate) {
        aValue = isNumberOnly ? parseFloat(a) : a;
        bValue = isNumberOnly ? parseFloat(b) : b;
    }
    if (aValue > bValue) { return 1; }
    if (aValue < bValue) { return -1; }
    return 0;
}

/**
 * Returns true if the given range values are within the range of the given filter.
 * @param  {any}          rangeFilter A range filter.
 * @param  {RangeValue[]} rangeValues An array of range values.
 * @return {boolean}
 */
function checkRangeFilter(rangeFilter: RangeFilter, rangeValues: RangeValue[]) {
    if (!rangeFilter) { return true; }
    const compare = compareRangeValue;
    return rangeValues.reduce((prev: boolean, rangeValue: RangeValue) => {
        const filter = rangeFilter[rangeValue.key];
        if (!filter) { return prev && true; }
        const from = filter.from.metadata[0].rangeValue;
        const to = filter.to.metadata[filter.to.metadata.length - 1].rangeValue;
        return prev && (compare(rangeValue.value, from) >= 0) && (compare(rangeValue.value, to) <= 0);
    }, true);
}

/**
 * Returns true if the facet instance of the given data point contains the given keyword.
 *
 * @param  {string}    keyword   A string keyword.
 * @param  {DataPoint} dataPoint A dataPoint Object.
 * @return {boolean}
 */
function checkKeywordFilter(keyword: string, dataPoint: DataPoint) {
    if (!keyword) { return true; }
    const facetInstanceValue = String(dataPoint.rows[0].facetInstance);
    const isMatch = facetInstanceValue.toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
    return isMatch;
}

/**
 * Returns true if given dataPoint is in the selected data points array.
 *
 * @param  {DataPoint}   dataPoint          A dataPoint Object.
 * @param  {DataPoint[]} selectedDataPoints An Array of selected data points.
 * @return {boolean}
 */
function isInSelectedDataPoints(dataPoint: DataPoint, selectedDataPoints: DataPoint[]) {
    return Boolean(_.find(selectedDataPoints, (selectedDp: DataPoint) => selectedDp.instanceLabel === dataPoint.instanceLabel && selectedDp.facetKey === dataPoint.facetKey));
}

/**
 * Create or update a bucket on the target Object.
 * Add the instance and highlight counts from the given data point to the bucket’s corresponding sums
 *
 * @param  {any}       targetObj   An Object in which a bucket will be created.
 * @param  {DataPoint} dp          A dataPoint object.
 * @param  {string}    bucketName  Name of the bucket field, 'bucket' or 'sparklineData'.
 */
function createBucket(targetObj: any, dp: DataPoint, bucketName: string) {
    if (!(bucketName in dp.rows[0])) { return; }
    const bucketValue = String(dp.rows[0][bucketName]);
    !targetObj[bucketName] && (targetObj[bucketName] = {});
    if (!targetObj[bucketName][bucketValue]) {
        targetObj[bucketName][bucketValue] = { instanceCount: dp.instanceCount, highlight: dp.highlight };
    } else {
        targetObj[bucketName][bucketValue].instanceCount += dp.instanceCount;
        targetObj[bucketName][bucketValue].highlight += dp.highlight;
    }
}

/**
 * Formats the given value with the provided value formatter.
 *
 * @param  {IValueFormatter} defaultFormatter A formatter that will be used to format the value.
 * @param  {any}             value            A value to be formatted.
 * @param  {any = ''}          defaultValue     A default value to be returned if provided value is invalid.
 * @return {string}                           A formatted value.
 */
function formatValue(defaultFormatter: IValueFormatter, value: any, defaultValue: any = '') {
    const smallFormatter = powerbi.visuals.valueFormatter.create({format: 'O', value: 0});
    const bigFormatter = powerbi.visuals.valueFormatter.create({format: 'O', value: 1e6});
    if (value) {
        if (defaultFormatter) {
            return defaultFormatter.format(value);
        } else if (value instanceof Date) {
            return value.toDateString();
        } else if (typeof(value) === 'number') {
            if (value < 1e6 && value > -1e6) {
                return smallFormatter.format(value);
            } else {
                return bigFormatter.format(value);
            }
        } else {
            return value;
        }
    } else {
        return defaultValue;
    }
}

/**
 * Aggregate the given data points by instance value, optionally applying a filter.
 *
 * @param  {DataPoint[]}           dataPoints An array of data points.
 * @param  {DataPointsFilter = {}} filter     A DataPointsFilter.
 * @return {Object}                           An Object containing an array of aggregated data points and an array of ignored data points.
 */
function aggregateDataPoints(dataPoints: DataPoint[], filter: DataPointsFilter = {}) {
    const instanceMap = {};
    const result = [];
    dataPoints.forEach((dp: DataPoint) => {
        const instanceLabel = dp.instanceLabel;
        const handleDp = () => {
            if (!checkRangeFilter(filter.range, dp.rangeValues) || !checkKeywordFilter(filter.contains, dp)) {
                return;
            }
            if (!instanceMap[instanceLabel]) {
                result.push(instanceMap[instanceLabel] = {
                    rows: dp.rows,
                    facetKey: dp.facetKey,
                    highlight: dp.highlight,
                    facetLabel: dp.facetLabel,
                    instanceValue: dp.instanceValue,
                    instanceLabel: dp.instanceLabel,
                    instanceCount: dp.instanceCount,
                    instanceCountFormatter: dp.instanceCountFormatter,
                    instanceColor: dp.instanceColor,
                    instanceIconClass: dp.instanceIconClass,
                });
                createBucket(instanceMap[instanceLabel], dp, 'bucket');
                createBucket(instanceMap[instanceLabel], dp, 'sparklineData');
            } else {
                instanceMap[instanceLabel].highlight += dp.highlight;
                instanceMap[instanceLabel].instanceCount += dp.instanceCount;
                instanceMap[instanceLabel].rows.push(...dp.rows);
                createBucket(instanceMap[instanceLabel], dp, 'bucket');
                createBucket(instanceMap[instanceLabel], dp, 'sparklineData');
            }
        };
        const handleSelectedDp = () => {
            // keyword filter is not applied to the selected data points
            !instanceMap[instanceLabel] && result.push(instanceMap[instanceLabel] = {
                rows: [],
                facetKey: dp.facetKey,
                highlight: 0,
                facetLabel: dp.facetLabel,
                instanceValue: dp.instanceValue,
                instanceLabel: dp.instanceLabel,
                instanceCount: 0,
                instanceCountFormatter: dp.instanceCountFormatter,
                instanceColor: dp.instanceColor,
                instanceIconClass: dp.instanceIconClass,
            });
            if (checkRangeFilter(filter.range, dp.rangeValues)) {
                instanceMap[instanceLabel].highlight += dp.highlight;
                instanceMap[instanceLabel].instanceCount += dp.instanceCount;
                instanceMap[instanceLabel].rows.push(...dp.rows);
                createBucket(instanceMap[instanceLabel], dp, 'bucket');
                createBucket(instanceMap[instanceLabel], dp, 'sparklineData');
            }
        };
        isInSelectedDataPoints(dp, filter.selectedDataPoints) ? handleSelectedDp() : handleDp();
    });
    return result;
}

function createFacetsSelectionData(aggregatedData: AggregatedData, options: ConvertToFacetsVisualDataOptions) {
    const { colors, settings } = options;
    const colorPalette = COLOR_PALETTE.slice().concat(colors.map((color: IColorInfo) => color.value));
    const toSelectionGroup = ((key: string) => {
        const dataPoints = aggregatedData.dataPointsMap[key];
        const facetGroupColor = colorPalette.shift();
        const toSelectionSpec = (dp: DataPoint) => {
            const {
                highlight,
                instanceValue,
                instanceCount,
                instanceCountFormatter,
                instanceColor,
                bucket,
                sparklineData,
            } = dp;
            const selectionCountLabel = settings.display.selectionCount
                ? `${formatValue(instanceCountFormatter, highlight, '')} / ${formatValue(instanceCountFormatter, instanceCount, '')}`
                : formatValue(instanceCountFormatter, instanceCount, '');

            const selectionSpec = {
                selected: { count: highlight, countLabel: selectionCountLabel },
                value: instanceValue,
            };
            if (sparklineData) {
                selectionSpec.selected['timeseries'] = createTimeSeries(aggregatedData.sparklineXDomain, sparklineData, true);
            }
            if (bucket) {
                const segmentsBaseColor = instanceColor || hexToRgba(facetGroupColor, 100);
                selectionSpec.selected['segments'] = createSegments(bucket, segmentsBaseColor, true);
            }
            return selectionSpec;
        };
        return {
            key: key,
            facets: dataPoints.filter((dp: DataPoint) => !!dp.highlight).map(toSelectionSpec)
        };
    });
    return Object.keys(aggregatedData.dataPointsMap).map(toSelectionGroup);
}

function createFacetsData(aggregatedData: AggregatedData, options: ConvertToFacetsVisualDataOptions) {
    const { colors, settings } = options;
    const normalFacetState = JSON.parse(settings.facetState.normalFacet);
    const colorPalette = COLOR_PALETTE.slice().concat(colors.map((color: IColorInfo) => color.value));
    const hasHighlight = aggregatedData.hasHighlight;
    const result = <FacetGroup[]>[];

    let maxFacetInstanceCount = 0;

    Object.keys(aggregatedData.dataPointsMap).forEach((key: string) => {
        const dataPoints = aggregatedData.dataPointsMap[key];

        const facets: Facet[] = [];
        const prependedSelectedFacets: Facet[] = [];
        const facetGroup: FacetGroup = {
            label: dataPoints[0].facetLabel,
            key: key,
            facets: [], // initial facet
            more: 0,
            total: 0,

            allFacets: [],
            order: (normalFacetState[key] && normalFacetState[key].order) || 0,
            collapsed: !!normalFacetState[key] && !!normalFacetState[key].collapsed,
        };
        const facetGroupColor = colorPalette.shift();
        const opacities = [100, 60, 35];

        dataPoints
            .sort((a: DataPoint, b: DataPoint) => b.instanceCount - a.instanceCount || a.instanceLabel.localeCompare(b.instanceLabel))
            .forEach((dp: DataPoint) => {
                const {
                    highlight,
                    instanceValue,
                    instanceLabel,
                    instanceCount,
                    instanceCountFormatter,
                    instanceColor,
                    instanceIconClass,
                    bucket,
                    sparklineData,
                } = dp;
                const nextColorOpacity = opacities.shift();
                const defaultColor = facetGroupColor && nextColorOpacity && hexToRgba(facetGroupColor, nextColorOpacity);
                const facetColor = instanceColor || defaultColor || '#DDDDDD';
                const useDataPoint = hasHighlight ? !!highlight : true;
                const facet: Facet = {
                    icon: {
                        class: instanceIconClass,
                        color: facetColor,
                    },
                    count: instanceCount,
                    countLabel: formatValue(instanceCountFormatter, instanceCount, ''),
                    value: instanceValue,
                    timeseries: sparklineData ? createTimeSeries(aggregatedData.sparklineXDomain, sparklineData) : undefined,
                    label: instanceLabel,
                };

                // add segments if there is bucket
                if (bucket) {
                    const segmentsBaseColor = instanceColor || hexToRgba(facetGroupColor, 100);
                    dp.selectionColor = { color: segmentsBaseColor, opacity: 100 };
                    facet['segments'] = createSegments(bucket, segmentsBaseColor, false);
                    facet.icon.color = getSegmentColor(segmentsBaseColor, 100, 0, 1, false);
                }

                isInSelectedDataPoints(dp, aggregatedData.selectedDataPoints)
                    ? prependedSelectedFacets.push(facet)
                    : useDataPoint && facets.push(facet);

                maxFacetInstanceCount = Math.max(maxFacetInstanceCount, instanceCount);
            });
        // prepend selected facets to the facets array
        facets.unshift(...prependedSelectedFacets);

        // Limit the number of facets to display
        const initialNumFacets = Math.max(settings.facetCount.initial, prependedSelectedFacets.length);
        const remainingFacetsCount = Math.max(facets.length - initialNumFacets, 0);
        facetGroup.facets = facets.slice(0, initialNumFacets);
        facetGroup.more = remainingFacetsCount && [
            { label: otherLabelTemplate(remainingFacetsCount), class: 'other', clickable: false },
            { label: 'More', class: 'more', clickable: true },
        ];
        facetGroup.allFacets = facets;

        facets.length > 0 && result.push(facetGroup);
    });
    result.forEach((group: FacetGroup) => group.total = maxFacetInstanceCount);
    return result;
}

function createRangeFacetsData(aggregatedData: AggregatedData, options: ConvertToFacetsVisualDataOptions) {
    const result = [];
    const { selectedRange, settings } = options;
    const rangeFacetState = JSON.parse(settings.facetState.rangeFacet);
    Object.keys(aggregatedData.rangeDataMap).forEach((key: string) => {
        const rangeValueMap = aggregatedData.rangeDataMap[key];
        const rangeKeys = Object.keys(rangeValueMap);
        const group = {
            label: key.replace(/_/, ' ').split(/\W/).map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            key: key,
            facets: [], // initial facet
            order: (rangeFacetState[key] && rangeFacetState[key].order) || 0,
            isRange: true,
            collapsed: !!rangeFacetState[key] && !!rangeFacetState[key].collapsed,
        };
        const selectionSlices = {};
        const facet = {
            value: key,
            selection: {},
            histogram: {
                slices: rangeKeys.map((rangeKey: any) => {
                    selectionSlices[rangeKey] = aggregatedData.hasHighlight
                        ? rangeValueMap[rangeKey].highlight
                        : rangeValueMap[rangeKey].subSelection;
                    return rangeValueMap[rangeKey];
                }).sort((a: any, b: any) => compareRangeValue(a.metadata.rangeValue, b.metadata.rangeValue))
            }
        };

        // set flag to the first and last item of the slices
        facet.histogram.slices[0].metadata.isFirst = true;
        facet.histogram.slices[facet.histogram.slices.length - 1].metadata.isLast = true;

        // set initial selection state
        facet.selection['slices'] = selectionSlices;
        selectedRange && selectedRange[key] && (facet.selection['range'] = {
            from: selectedRange[key].from.index,
            to: selectedRange[key].to.index,
        });

        group.facets.push(facet);
        result.unshift(group);
    });
    return result;
}
