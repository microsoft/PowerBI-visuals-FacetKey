/**
 * Copyright (c) 2018 Uncharted Software Inc.
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

// Support for Bookmarks / selection replay, built exclusively on the public
// ISelectionManager + ISelectionId API (no SQExpr, no private hostServices,
// no selectorsByColumn / ._kind internals).
import powerbi from 'powerbi-visuals-api';
import { safeKey, findColumn } from './utils';
import find from 'lodash-es/find';

// NOTE on typing: powerbi-visuals-api declares two distinct `ISelectionId` shapes -
// the full one (with getKey/equals/etc) lives under `powerbi.visuals.ISelectionId`, while the
// callback-facing surfaces (`ISelectionManager.registerOnSelectCallback`/`getSelectionIds`) are
// typed against an empty placeholder under `powerbi.extensibility.ISelectionId`. At runtime both
// refer to the same object; we use the full type where we construct ids ourselves, and treat ids
// received from those callback surfaces as `SelectionIdLike` so `.getKey()` is usable.
import SelectionId = powerbi.visuals.ISelectionId;
export type SelectionIdLike = powerbi.extensibility.ISelectionId;

/**
 * Builds the public selection id for a single underlying table row.
 * Returns undefined (rather than throwing) when the row/table/host is not available,
 * so callers can safely filter these out.
 */
function buildRowSelectionId(facetsVisual: any, row: RowObject): SelectionId {
    if (!facetsVisual.host || !facetsVisual.dataView || !facetsVisual.dataView.table || row == null || row.index == null) {
        return undefined;
    }
    try {
        return facetsVisual.host.createSelectionIdBuilder()
            .withTable(facetsVisual.dataView.table, row.index)
            .createSelectionId();
    } catch (e) {
        return undefined;
    }
}

/**
 * Flattens the currently aggregated data points map into a single array.
 */
function getAllDataPoints(facetsVisual: any): DataPoint[] {
    const dataPointsMap = facetsVisual.data && facetsVisual.data.aggregatedData && facetsVisual.data.aggregatedData.dataPointsMap;
    if (!dataPointsMap) { return []; }
    return Object.keys(dataPointsMap).reduce((all: DataPoint[], key: string) => all.concat(dataPointsMap[key]), []);
}

/**
 * Registered via `selectionManager.registerOnSelectCallback`. PowerBI invokes this with the
 * public ISelectionId[] representing the *current* selection - whether that change came from a
 * bookmark being applied, the user clicking elsewhere to clear selection, or another visual's
 * cross-filter/selection interaction.
 */
export function bookmarkHandler(this: any, ids: SelectionIdLike[]) {
    loadSelectionFromSelectionIds(this, ids || []);
}

/**
 * Reconstructs `facetsVisual.selectedInstances` (our DataPoint-shaped selection model) from a
 * list of public ISelectionIds, by re-deriving the selection id for every row of every currently
 * rendered data point and comparing identity via the public `.getKey()` method.
 */
export function loadSelectionFromSelectionIds(facetsVisual: any, ids: SelectionIdLike[] = []): void {
    if (!facetsVisual || facetsVisual.destroyed || !facetsVisual.facets) { return; }

    const keySet: { [key: string]: boolean } = {};
    (ids || []).forEach((id: any) => {
        if (id && typeof id.getKey === 'function') {
            keySet[id.getKey()] = true;
        }
    });

    const hasAnySelection = Object.keys(keySet).length > 0;
    const dataPoints = getAllDataPoints(facetsVisual);
    facetsVisual.selectedInstances = !hasAnySelection ? [] : dataPoints.filter((dp: DataPoint) =>
        (dp.rows || []).some((row: RowObject) => {
            const rowId = buildRowSelectionId(facetsVisual, row);
            return rowId && keySet[rowId.getKey()];
        })
    );

    if (!facetsVisual.data || !facetsVisual.data.facetsData) { return; }
    // Clear stale local selection styling first: updateFacetsSelection([]) also deselects
    // normal facets (or resets the widget), so incoming highlights must be applied afterwards.
    facetsVisual.runWithNoAnimation(facetsVisual.updateFacetsSelection, facetsVisual, facetsVisual.selectedInstances);
    if (facetsVisual.data.hasHighlight && facetsVisual.selectedInstances.length === 0) {
        facetsVisual.facets.select(facetsVisual.data.facetsSelectionData);
    }
}

/**
 * Returns the value to compare the persisted/jsonFilter rangeValue against, normalizing to a
 * timestamp for date columns (the dataView's actual rendered rangeValue is a `Date` object for
 * dateTime columns, while a JSON-serialized filter condition value is an ISO string - strict
 * `===`/object identity never matches those, so compare on `.getTime()` once both sides are Dates).
 */
function normalizeRangeValue(value: any, isDateTime: boolean): any {
    if (!isDateTime) { return value; }
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? value : date;
}

function valuesEqual(a: any, b: any): boolean {
    const aTime = a instanceof Date ? a.getTime() : a;
    const bTime = b instanceof Date ? b.getTime() : b;
    return aTime === bTime;
}

const VALID_RANGE_OPERATORS = ['GreaterThanOrEqual', 'LessThanOrEqual'];

/**
 * Restores range-filter UI/state (the histogram selection handles) from the raw JSON filters the
 * host echoes back via `options.jsonFilters` - this is how previously-applied AdvancedFilters
 * (our own range filter) survive a bookmark replay or a visual reload.
 * Safely no-ops for any range column that no longer has a public `queryName` (can't be matched),
 * and for any filter whose shape/operators/logicalOperator don't match what this visual produces
 * (defends against malformed or foreign filters sharing the same objectName/propertyName).
 * An empty/missing `jsonFilters` array clears any previously-restored range state (and its UI).
 */
export function restoreRangeFilterFromJsonFilters(facetsVisual: any, jsonFilters: any[]): void {
    facetsVisual.filter = facetsVisual.filter || {};
    const range: RangeFilter = {};
    const rangeValueColumns = (facetsVisual.dataView && findColumn(facetsVisual.dataView, 'rangeValue', true)) || [];

    (jsonFilters || []).forEach((jsonFilter: any) => {
        if (!jsonFilter || !jsonFilter.target || jsonFilter.logicalOperator !== 'And' || !Array.isArray(jsonFilter.conditions) || jsonFilter.conditions.length !== 2) {
            return;
        }
        const operators = jsonFilter.conditions.map((c: any) => c && c.operator).sort();
        if (JSON.stringify(operators) !== JSON.stringify(VALID_RANGE_OPERATORS.slice().sort())) {
            return;
        }

        const target = jsonFilter.target;
        const expectedQueryName = target.table && target.column ? `${target.table}.${target.column}` : undefined;
        const column: any = find(rangeValueColumns, (col: any) => col && col.queryName && expectedQueryName && col.queryName === expectedQueryName);
        if (!column) { return; }

        const fromCondition: any = find(jsonFilter.conditions, (c: any) => c && c.operator === 'GreaterThanOrEqual');
        const toCondition: any = find(jsonFilter.conditions, (c: any) => c && c.operator === 'LessThanOrEqual');
        if (!fromCondition || !toCondition || fromCondition.value === undefined || toCondition.value === undefined) { return; }

        const isDateTime = Boolean(column.type && column.type.dateTime);
        const key = safeKey(column.displayName);
        range[key] = {
            from: { metadata: [{ rangeValue: normalizeRangeValue(fromCondition.value, isDateTime), isFirst: false, isLast: false }] },
            to: { metadata: [{ rangeValue: normalizeRangeValue(toCondition.value, isDateTime), isFirst: false, isLast: false }] },
        } as FacetRangeObject;
    });

    facetsVisual.filter.range = range;
    applyRangeFilterToUI(facetsVisual, rangeValueColumns);
}

/**
 * Reflects `facetsVisual.filter.range` onto the rendered range-facet histogram selection handles.
 * For any range-facet group with no active range filter, explicitly resets its UI selection back
 * to full-range so a previously-restored bookmark range doesn't linger visually after it's cleared.
 */
function applyRangeFilterToUI(facetsVisual: any, rangeValueColumns?: any[]): void {
    if (!facetsVisual.data || !facetsVisual.data.facetsData || !facetsVisual.facets || typeof facetsVisual.facets.getGroup !== 'function') {
        return;
    }
    const rangeFilter = (facetsVisual.filter && facetsVisual.filter.range) || {};
    const rangeFacets = facetsVisual.data.facetsData.filter((group: any) => group.isRange);
    rangeFacets.forEach((facetData: any) => {
        const range = rangeFilter[facetData.key];
        const group = facetsVisual.facets.getGroup(facetData.key);
        if (!group) { return; }
        const facet: any = find(group.facets, (f: any) => f.key === facetData.key);
        const bars = facet && facet._histogram && facet._histogram._bars;

        if (!range) {
            // No (or cleared) range filter for this group - reset any previously-applied UI selection.
            if (facetData.facets[0].selection['range'] !== undefined) {
                facetData.facets[0].selection['range'] = undefined;
                group.replace(facetData);
            }
            return;
        }
        if (!bars) { return; }

        const fromValue = range.from.metadata[0].rangeValue;
        const toValue = range.to.metadata[range.to.metadata.length - 1].rangeValue;
        const fromIndex = bars.findIndex((bar: any) => bar.metadata.find((datum: any) => valuesEqual(datum.metadata.rangeValue, fromValue)));
        const toIndex = bars.findIndex((bar: any) => bar.metadata.find((datum: any) => valuesEqual(datum.metadata.rangeValue, toValue)));
        if (fromIndex >= 0 && toIndex >= 0) {
            // Search rebuilds range facets from these persisted indices, not the UI selection.
            range.from.index = fromIndex;
            range.to.index = toIndex;
            facetData.facets[0].selection['range'] = { from: fromIndex, to: toIndex };
            group.replace(facetData);
        }
    });
}

/**
 * Entry point called whenever the visual needs to re-sync its UI with PowerBI's current
 * selection + persisted/echoed filter state (fresh render, bookmark apply, etc.).
 * Pulls selection via the public `selectionManager.getSelectionIds()` and range filters via
 * the most recently observed `options.jsonFilters`.
 */
export function loadSelectionFromBookmarks(facetsVisual: any): void {
    if (!facetsVisual || facetsVisual.destroyed || !facetsVisual.facets) { return; }
    const ids: SelectionIdLike[] = (facetsVisual.selectionManager && typeof facetsVisual.selectionManager.getSelectionIds === 'function')
        ? facetsVisual.selectionManager.getSelectionIds()
        : [];
    restoreRangeFilterFromJsonFilters(facetsVisual, facetsVisual.lastJsonFilters || []);
    loadSelectionFromSelectionIds(facetsVisual, ids);
}
