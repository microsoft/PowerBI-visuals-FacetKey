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
    hexToRgba,
    convertToHSL,
    getSegmentColor,
    otherLabelTemplate,
    createSegments,
    HIGHLIGHT_COLOR,
    COLOR_PALETTE
} from './utils';
import * as _ from 'lodash';

/**
 * Maximum number of facet groups to be rendered.
 */
const MAX_NUM_FACET_GROUPS = 100;

/**
 * Returns true if the given range values are within the range of the given filter.
 * @param  {any}          rangeFilter A range filter.
 * @param  {RangeValue[]} rangeValues An array of range values.
 */
function checkRangeFilter(rangeFilter: any, rangeValues: RangeValue[]) {
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
 * Create or update a bucket on the target Object.
 * Add the instance and highlight counts from the given datapoint to the bucket’s corresponding sums
 *
 * @param  {any}       targetObj An Object in which a bucekt will be created.
 * @param  {DataPoint} dp        A dataPoint object.
 */
function createBucket(targetObj: any, dp: DataPoint) {
    if (!('bucket' in dp.rows[0])) { return; }
    const bucketName = String(dp.rows[0].bucket);
    !targetObj.bucket && (targetObj.bucket = {});
    if (!targetObj.bucket[bucketName]) {
        targetObj.bucket[bucketName] = { instanceCount: dp.instanceCount, highlight: dp.highlight };
    } else {
        targetObj.bucket[bucketName].instanceCount += dp.instanceCount;
        targetObj.bucket[bucketName].highlight += dp.highlight;
    }
}

/**
 * Aggregate the given datapoints by instance value, optionally applying a filter.
 *
 * @param  {DataPoint[]}                     dataPoints An array of data points.
 * @param  {AggregateDataPointsOptions = {}} options    An object that can optionally include a DataPointsFilter.
 * @return {Object}                                     An Object containing an array of aggregated data points and an array of ignored data points.
 */
function aggregateDataPoints(dataPoints: DataPoint[], options: AggregateDataPointsOptions = {}) {
    const { forEachDataPoint, filter = {} } = options;
    const instanceMap = {};
    const result = {
        aggregatedDataPoints: [],
        ignoredDataPoints: []
    };
    dataPoints.forEach((dp: DataPoint) => {
        const instanceLabel = dp.instanceLabel;
        const ignoreThisDp = _.find(filter.selectedDps, (selectedDp: DataPoint) => selectedDp.instanceLabel === dp.instanceLabel && selectedDp.facetKey === dp.facetKey);
        if (ignoreThisDp) {
            return result.ignoredDataPoints.push(dp);
        }

        forEachDataPoint && forEachDataPoint(dp);
        if (!checkRangeFilter(filter.range, dp.rangeValues) || !checkKeywordFilter(filter.contains, dp)) {
            return;
        }
        if (!instanceMap[instanceLabel]) {
            result.aggregatedDataPoints.push(instanceMap[instanceLabel] = {
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
            createBucket(instanceMap[instanceLabel], dp);
        } else {
            instanceMap[instanceLabel].highlight += dp.highlight;
            instanceMap[instanceLabel].instanceCount += dp.instanceCount;
            instanceMap[instanceLabel].rows.push(...dp.rows);
            createBucket(instanceMap[instanceLabel], dp);
        }
    });
    return result;
}

/**
 * Aggregate data points by face instance, applying only the (optional) range filter from the given options object.
 * It is used to create a list of the data points for the selected facet instances which bypasses the keyword filter
 * and can have zero for the instance or highlight count.
 *
 * @param  {DataPoint[]}                     dataPoints An array of data points.
 * @param  {AggregateDataPointsOptions = {}} options    An options object.
 * @return {DataPoint[]}                                An array of datapoints.
 */
function aggregateUsingRangeFilterOnly(dataPoints: DataPoint[], options: AggregateDataPointsOptions = {}): DataPoint[] {
    const { forEachDataPoint, filter = {} } = options;
    const instanceMap = {};
    const result: DataPoint[] = [];
    dataPoints.forEach((dp: DataPoint) => {
        const instanceLabel = dp.instanceLabel;
        dp.isSelected = true;
        forEachDataPoint && forEachDataPoint(dp);
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
            isSelected: true,
        });
        if (!checkRangeFilter(filter.range, dp.rangeValues)) { return; }
        instanceMap[instanceLabel].highlight += dp.highlight;
        instanceMap[instanceLabel].instanceCount += dp.instanceCount;
        instanceMap[instanceLabel].rows.push(...dp.rows);
        // TODO: need test
        createBucket(instanceMap[instanceLabel], dp);
    });
    return result;
}

/**
 * Formats the given value with the provided value formatter.
 *
 * @param  {IValueFormatter} defaultFormatter A formatter that will be used to format the value.
 * @param  {any}             value            A value to be formatted.
 * @param  {any = ''}          defaultValue     A default value to be returned if provided value is invalid.
 * @return {string}                           A formatted value.
 */
export function formatValue(defaultFormatter: IValueFormatter, value: any, defaultValue: any = '') {
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
 * Compares two range values (a and b) and returns 1 if a > b, -1 if a < b, or 0 if a = b.
 *
 * @param  {string|number|Object}    a A value representing a date.
 * @param  {string|number|Object}    b A value representing a date.
 * @return {number}
 */
export function compareRangeValue(a: any, b: any) {
    const isNumeric = (n: any) => !isNaN(parseFloat(n)) && isFinite(n);
    let aValue: any = Date.parse(a);
    let bValue: any = Date.parse(b);
    const isNmberOnly = isNumeric(a) && isNumeric(b);
    const isNotValidDate = isNmberOnly || isNaN(aValue) || isNaN(bValue);
    if (isNotValidDate) {
        aValue = isNmberOnly ? parseFloat(a) : a;
        bValue = isNmberOnly ? parseFloat(b) : b;
    }
    if (aValue > bValue) { return 1; }
    if (aValue < bValue) { return -1; }
    return 0;
}

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
            const columnValue = colValue && (columns[idx].type.dateTime ? new Date(colValue) : colValue);
            colRoles.forEach(role => {
                if (role === 'rangeValue') {
                    const format = columns[idx].format;
                    const columnName = columns[idx].displayName;
                    const rangeValueFormatter = viz.valueFormatter.create({ format: format });
                    !rowObj.rangeValues && (rowObj.rangeValues = []);
                    const value: RangeValue = {
                        value: columnValue,
                        valueLabel: formatValue(rangeValueFormatter, columnValue, ''),
                        key: columnName.replace(/[\(\)]/g, '\\$&')
                    };
                    columnValue && rowObj.rangeValues.push(value);
                } else {
                    rowObj[role] = columnValue;
                }
            });
        });
        const { facet, facetInstance, count, facetInstanceColor, iconClass, rangeValues } = rowObj;
        const facetKey = (String(facet || ' ')).replace(/[\(\)]/g, '\\$&'); // since jquery error when facetKey contains parentheses
        const facetLabel = formatValue(facetFormatter, (_.isString(facet) ? facet.charAt(0).toUpperCase() + facet.slice(1) : facet));
        const instanceLabel = formatValue(instanceFormatter, facetInstance);
        const instanceValue = instanceLabel !== '' ? instanceLabel + index : '';
        const instanceCount = count || 0;
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
 * @param  {DataPointsMapData}   data   A dataPointsMap data converted from dataview.
 * @param  {DataPointsFilter={}} filter A DataPointsFilter which is used to filter the data points.
 * @return {AggregatedData}             Data that contains aggregated datapoints map and the range data map.
 */
export function aggregateDataPointsMap(data: DataPointsMapData, filter: DataPointsFilter = {}): AggregatedData {
    const dataPointsMap = data.dataPointsMap;
    const aggregatedData = { dataPointsMap: {}, rangeDataMap: {}, hasHighlight: !!data.hasHighlight };
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
            const passFilter = dp.isSelected || (checkKeywordFilter(filter.contains, dp) && checkRangeFilter(filter.range, dp.rangeValues));
            if (passFilter) {
                rangeDataMap[rangeValue.valueLabel].subSelection += dp.instanceCount;
            }
        });
    };
    const opt = {
        forEachDataPoint: constructRangeFacetData,
        filter: filter,
    };
    Object.keys(dataPointsMap).forEach((key: string) => {
        const aggregateResult = aggregateDataPoints(dataPointsMap[key], opt);
        const dataPoints: DataPoint[] = aggregateResult.aggregatedDataPoints
            .concat(aggregateUsingRangeFilterOnly(aggregateResult.ignoredDataPoints, opt));
        dataPoints.length > 0 && (aggregatedData.dataPointsMap[key] = dataPoints);
    });
    return aggregatedData;
};

/**
 * Converts the given aggregated data into facets visual data.
 *
 * @param  {AggregatedData}                   aggregatedData An aggregated data.
 * @param  {ConvertToFacetsVisualDataOptions} options        A options object.
 * @return {FacetsVisualData}                                Data to be used in this visual.
 */
export function convertToFacetsVisualData(aggregatedData: AggregatedData, options: ConvertToFacetsVisualDataOptions): FacetsVisualData {
    const { colors, selectedRange, settings } = options;
    const hasHighlight = aggregatedData.hasHighlight;
    const rangeFacetState = JSON.parse(settings.facetState.rangeFacet);
    const normalFacetState = JSON.parse(settings.facetState.normalFacet);
    const colorPalette = COLOR_PALETTE.slice().concat(colors.map((color: IColorInfo) => color.value));
    const data: FacetsVisualData = {
        aggregatedData: aggregatedData,
        hasHighlight: hasHighlight,
        facetsData: <FacetGroup[]>[],
        facetsSelectionData: <any>[],
        selectedDataPoints: <DataPoint[]>[],
    };
    let maxFacetInstanceCount = 0;

    // 1. Construct the data for normal facets
    Object.keys(aggregatedData.dataPointsMap).forEach((key: string) => {
        const dataPoints = aggregatedData.dataPointsMap[key];

        const facets: Facet[] = [];
        const prependedSelectedFacets: Facet[] = [];

        // highlighted facets
        const selectionGroup = {
            key: key,
            facets: <any>[],
        };
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

        dataPoints.sort((a: DataPoint, b: DataPoint) => {
            const countComparison = b.instanceCount - a.instanceCount;
            return countComparison === 0 ? a.instanceLabel.localeCompare(b.instanceLabel) : countComparison;
        });
        dataPoints.forEach((dp: DataPoint) => {
            const {
                highlight,
                instanceValue,
                instanceLabel,
                instanceCount,
                instanceCountFormatter,
                instanceColor,
                instanceIconClass,
                bucket,
            } = dp;
            const selectionCountLabel = settings.display.selectionCount
                ? `${formatValue(instanceCountFormatter, highlight, '')} / ${formatValue(instanceCountFormatter, instanceCount, '')}`
                : formatValue(instanceCountFormatter, instanceCount, '');
            const nextColorOpacity = opacities.shift();
            const defaultColor = facetGroupColor && nextColorOpacity && hexToRgba(facetGroupColor, nextColorOpacity);
            const facetColor = instanceColor || defaultColor || '#DDDDDD';
            const useDataPoint = hasHighlight ? !!highlight : true;

            const selectionSpec = {
                selected: { count: highlight, countLabel: selectionCountLabel },
                value: instanceValue,
            };
            const facet: Facet = {
                icon: {
                     class: instanceIconClass,
                     color: facetColor,
                },
                count: instanceCount,
                countLabel: formatValue(instanceCountFormatter, instanceCount, ''),
                value: instanceValue,
                label: instanceLabel,
            };

            // add segments if there is bucket
            if (bucket) {
                const segmentsBaseColor = instanceColor || hexToRgba(facetGroupColor, 100);

                selectionSpec.selected['segments'] = createSegments(bucket, segmentsBaseColor, true);
                dp.selectionColor = { color: segmentsBaseColor, opacity: 100 };

                facet['segments'] = createSegments(bucket, segmentsBaseColor, false);
                facet.icon.color = getSegmentColor(segmentsBaseColor, 100, 0, 1, false);
            }

            !!highlight && selectionGroup.facets.push(selectionSpec);
            dp.isSelected
                ? data.selectedDataPoints.push(dp) && prependedSelectedFacets.push(facet)
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

        facets.length > 0 && data.facetsData.push(facetGroup);
        data.facetsSelectionData.push(selectionGroup);
    });
    data.facetsData.forEach((group: FacetGroup) => group.total = maxFacetInstanceCount);

    // 2. Construct the data for range facets
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
                    selectionSlices[rangeKey] = hasHighlight ? rangeValueMap[rangeKey].highlight : rangeValueMap[rangeKey].subSelection;
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
        data.facetsData.unshift(group);
    });
    data.facetsData = data.facetsData.sort((a: any, b: any) => a.order - b.order).slice(0, MAX_NUM_FACET_GROUPS);

    return data;
};
