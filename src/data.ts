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

function checkKeywordFilters(keywordFilters: any[], dataPoint: DataPoint) {
    if (!keywordFilters || keywordFilters.length === 0) { return true; }
    const instance = String(dataPoint.rows[0].facetInstance);
    return keywordFilters.reduce((prevResult: any, filterKeyword: string) => {
        const isMatch = instance.toLowerCase().indexOf(filterKeyword) >= 0;
        return isMatch || prevResult;
    }, false);
}

function createBucket(targetObj: any, dp: DataPoint) {
    if (!dp.rows[0].bucket) { return; }
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
 * Aggregate given dataPoints by facet intance.
 */
function aggregateDataPoints(dataPoints: DataPoint[], options: AggregateDataPointsOptions = {}) {
    const { rangeFilter, filters, forEachDataPoint, ignore } = options;
    const instanceMap = {};
    const result = {
        aggregatedDataPoints: [],
        ignoredDataPoints: []
    };
    dataPoints.forEach((dp: DataPoint) => {
        const instanceLabel = dp.instanceLabel;
        if (_.find(ignore, (ignoreDp: DataPoint) => ignoreDp.instanceLabel === dp.instanceLabel && ignoreDp.facetKey === dp.facetKey)) {
            return result.ignoredDataPoints.push(dp);
        }

        forEachDataPoint && forEachDataPoint(dp);
        if (!checkRangeFilter(rangeFilter, dp.rangeValues) || !checkKeywordFilters(filters, dp)) {
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
 * Aggregate datapoints by facetInstance applying rangefilter only. (used to create a list of datapoints for selected facet instances)
 */
function aggregateUsingRangeFilterOnly(dataPoints: DataPoint[], options: AggregateDataPointsOptions = {}): DataPoint[] {
    const { rangeFilter, forEachDataPoint } = options;
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
        if (!checkRangeFilter(rangeFilter, dp.rangeValues)) { return; }
        instanceMap[instanceLabel].highlight += dp.highlight;
        instanceMap[instanceLabel].instanceCount += dp.instanceCount;
        instanceMap[instanceLabel].rows.push(...dp.rows);
        // TODO: need test
        createBucket(instanceMap[instanceLabel], dp);
    });
    return result;
}

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
 * Process the dataView and convert it's table data to the data point map such that each data points (table rows) are grouped by facet key.
 */
export function convertDataview(dataView: DataView) {
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
    return dataPointsMap;
}

export function aggregateDataPointMap(dataPointsMap: any, options: AggregateDataPointMapOptions = {}) {
    const { filters, rangeFilter, selectedInstances } = options;
    const keywordFilter = filters ? [filters] : [];
    const aggregatedData = { dataPointsMap: {}, rangeDataMap: {} };
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
            const passFilter = dp.isSelected || (checkKeywordFilters(keywordFilter, dp) && checkRangeFilter(rangeFilter, dp.rangeValues));
            if (passFilter) {
                rangeDataMap[rangeValue.valueLabel].subSelection += dp.instanceCount;
            }
        });
    };
    const opt = {
        forEachDataPoint: constructRangeFacetData,
        rangeFilter: rangeFilter,
        filters: keywordFilter,
        ignore: selectedInstances,
    };
    Object.keys(dataPointsMap).forEach((key: string) => {
        const aggregateResult = aggregateDataPoints(dataPointsMap[key], opt);
        const dataPoints: DataPoint[] = aggregateResult.aggregatedDataPoints
            .concat(aggregateUsingRangeFilterOnly(aggregateResult.ignoredDataPoints, opt));
        dataPoints.length > 0 && (aggregatedData.dataPointsMap[key] = dataPoints);
    });
    return aggregatedData;
};

export function convertDataPointMap(aggregatedData: AggregatedData, options: ConvertDataPointMapOptions) {
    const { hasHighlight, colors, rangeFilter, settings } = options;
    const rangeFacetState = JSON.parse(settings.facetState.rangeFacet);
    const normalFacetState = JSON.parse(settings.facetState.normalFacet);
    const colorPalette = COLOR_PALETTE.slice().concat(colors.map((color: IColorInfo) => color.value));
    const data = {
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
                const opacity = instanceColor ? 100 : nextColorOpacity;
                selectionSpec.selected['segments'] = createSegments(bucket, HIGHLIGHT_COLOR, true);
                facet['segments'] = createSegments(bucket, facetColor, false, opacity || 0);
                opacity && (facet.icon.color = getSegmentColor(facetColor, opacity, 0, 1, false));
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
        rangeFilter && rangeFilter[key] && (facet.selection['range'] = {
            from: rangeFilter[key].from.index,
            to: rangeFilter[key].to.index,
        });

        group.facets.push(facet);
        data.facetsData.unshift(group);
    });
    data.facetsData.sort((a: any, b: any) => a.order - b.order);

    return data;
};
