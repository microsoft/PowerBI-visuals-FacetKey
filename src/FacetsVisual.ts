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

import '../style/facets.css';
import powerbi from 'powerbi-visuals-api';
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataView = powerbi.DataView;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import FilterAction = powerbi.FilterAction;
import { AdvancedFilter, IFilterColumnTarget } from 'powerbi-models';
import { FormattingSettingsService } from 'powerbi-visuals-utils-formattingmodel';
import { VisualFormattingSettings } from './settings';
import { ColorInfo } from './interfaces';
import { convertToDataPointsMap, aggregateDataPointsMap, convertToFacetsVisualData } from './data';
import { safeKey, findColumn, otherLabelTemplate, createSegments, hasColumns, createTimeSeries, COLOR_PALETTE } from './utils';
import { bookmarkHandler, loadSelectionFromBookmarks } from './bookmarks';
import debounce from 'lodash-es/debounce';
import extend from 'lodash-es/extend';
import remove from 'lodash-es/remove';
import find from 'lodash-es/find';
import $ from 'jquery';

const Facets = require('../lib/@uncharted.software/stories-facets/src/main');

const MAX_DATA_LOADS = 5;
const REQUIRED_FIELDS = ['count', 'facetInstance'];
const FILTER_OBJECT_NAME = 'general';
const FILTER_PROPERTY_NAME = 'filter';

/**
 * Clamps a persisted/settings numeric input to a finite, non-negative integer, falling back to
 * `fallback` for malformed input (e.g. `parseInt('nonsense', 10)` => NaN) so a corrupt/unexpected
 * persisted facetCount object property can't blank the whole visual (allFacets.slice(x, NaN) etc).
 */
function toFiniteNonNegativeInt(value: any, fallback: number): number {
    const parsed = parseInt(String(value), 10);
    return (Number.isFinite(parsed) && parsed >= 0) ? parsed : fallback;
}

/**
 * Default objects settings
 */
const DEFAULT_SETTINGS: FacetKeySettings = {
    facetCount: {
        initial: 4,
        increment: 50,
    },
    facetState: {
        rangeFacet: '{}',
        normalFacet: '{}',
    },
    display: {
        selectionCount: false,
    }
};

export class FacetsVisual implements IVisual {

    private facetsContainer: JQuery;
    private suppressNextUpdate: boolean;
    private loader: JQuery;
    private searchBox: JQuery;
    private facets: any;
    private settings: FacetKeySettings;
    private colors: ColorInfo[];
    private dataView: DataView;
    private data: FacetsVisualData;
    private filter: DataPointsFilter = {};
    private retainFilters: boolean = false;
    private previousData: any;
    private previousFreshData: any = {};
    private lastJsonFilters: any[] = [];
    private host: IVisualHost;
    private loadMoreData: (...args: any[]) => void;
    private selectionInHighlightedState: boolean;
    private selectedInstances: DataPoint[] = [];
    private loadMoreCount: number;
    private destroyed: boolean = false;
    private filterFacetsDebounced: ReturnType<typeof debounce>;
    private reDrawRangeFilter: ReturnType<typeof debounce> = debounce(() => {
        if (!this.data || !this.data.facetsData) { return; }
        const rangeFacets = this.data.facetsData.filter((group: any) => group.isRange);
        rangeFacets.forEach((facetData: any) => {
            const group = this.facets.getGroup(facetData.key);
            const range = group.getFilterRange(facetData.key);
            if (range) {
                facetData.facets[0].selection['range'] = {
                    from: range.from.label[0],
                    to: range.to.label[range.to.label.length - 1],
                };
                group.replace(facetData);
            }
        });
    }, 500);
    private updateSparklines: ReturnType<typeof debounce> = debounce(() => {
        if (this.data.aggregatedData.sparklineXDomain.length > 0) {
            // updating selection triggers redrawing of the sparklines
            this.data.hasHighlight
                ? this.facets.select(this.data.facetsSelectionData)
                : this.updateFacetsSelection(this.selectedInstances);
        }
    }, 500);
    private selectionManager: ISelectionManager;
    private formattingSettingsService: FormattingSettingsService;

    /**
     * Initializes an instance of the IVisual.
     * @param  {VisualConstructorOptions} options Initialization options for the visual.
     */
    constructor(options: VisualConstructorOptions) {
        this.facetsContainer = $('<div class="facets-container"></div>').appendTo($(options.element));

        this.settings = DEFAULT_SETTINGS;

        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        // Public colorPalette.getColor(key) replaces the old private `colorPalette.colors` array;
        // we synthesize a similarly-sized fallback array so data.ts's palette-cycling logic is unchanged.
        this.colors = COLOR_PALETTE.map((_, index) => this.host.colorPalette.getColor(String(index)));

        this.facets = new Facets(this.facetsContainer, []);
        this.facetsContainer.prepend(`
            <div class="facets-global-loading"><div class="loader"><div class="facets-loader"></div></div></div>
            <div class="facets-header">
                <input class="search-box" placeholder="Search">
            </div>
        `);
        this.searchBox = this.facetsContainer.find('.search-box');
        this.loader = this.facetsContainer.find('.facets-global-loading');

        this.facetsContainer.on('mousedown pointerdown', (e) => e.stopPropagation());

        this.bindFacetsEventHandlers();

        this.loadMoreData = typeof this.host.fetchMoreData === 'function'
            ? () => this.host.fetchMoreData(true)
            : () => {};

        // The selection manager offers no way to unregister this callback, so guard it so it
        // safely no-ops after destroy() or before any data has been rendered.
        this.selectionManager.registerOnSelectCallback((ids: ISelectionId[]) => {
            if (this.destroyed || !this.facets) { return; }
            bookmarkHandler.call(this, ids);
        });
    }

    /**
     * Converts the dataview into our own model.
     *
     * @param  {DataView}         dataView A dataView object.
     * @param  {ColorInfo[]}      colors   Powerbi color info array.
     * @param  {FacetKeySettings} settings A facetkey settings object.
     * @return {FacetsVisualData}
     */
    public converter(dataView: DataView, colors: ColorInfo[], settings: FacetKeySettings): FacetsVisualData {
        const dataPointsMapData = convertToDataPointsMap(dataView);
        const aggregatedData = aggregateDataPointsMap(dataPointsMapData);
        const facetsData = convertToFacetsVisualData(aggregatedData, {
            settings: settings,
            colors: colors,
        });
        return extend({ dataPointsMapData: dataPointsMapData }, facetsData);
    }

    /**
     * Notifies the IVisual of an update (data, viewmode, size change).
     *
     * @param  {VisualUpdateOptions} options visual update options.
     */
    public update(options: VisualUpdateOptions) {
        if (this.destroyed) { return; }
        if (this.suppressNextUpdate) {
            return (this.suppressNextUpdate = false);
        }
        const isResizeOnly = Boolean(options.type & (powerbi.VisualUpdateType.Resize | powerbi.VisualUpdateType.ResizeEnd))
            && !(options.type & powerbi.VisualUpdateType.Data);
        if (isResizeOnly && this.data && this.data.facetsData) {
            this.reDrawRangeFilter();
            return this.updateSparklines();
        }
        if (!options.dataViews || !(options.dataViews.length > 0)) {
            return;
        }
        if (!hasColumns(options.dataViews[0], REQUIRED_FIELDS)) {
            return this.facets.replace([]);
        }

        this.previousData = this.data || {};
        this.dataView = options.dataViews[0];
        this.lastJsonFilters = options.jsonFilters || this.lastJsonFilters || [];
        this.settings = this.validateSettings($.extend(true, {}, DEFAULT_SETTINGS, this.dataView.metadata.objects));

        // operationKind is optional - treat a missing value (e.g. very first update some hosts send) as fresh data.
        const isFreshData = options.operationKind === undefined || options.operationKind === VisualDataChangeOperationKind.Create;
        const hasMoreData = Boolean(this.dataView.metadata.segment);
        const rangeValueColumn = findColumn(this.dataView, 'rangeValue');
        const bucketColumn = findColumn(this.dataView, 'bucket');
        const sparklineColumn = findColumn(this.dataView, 'sparklineData');
        const loadAllDataBeforeRender = Boolean(rangeValueColumn) || Boolean(bucketColumn) || Boolean(sparklineColumn);

        this.facetsContainer.toggleClass('render-segments', Boolean(bucketColumn));

        this.previousFreshData = isFreshData ? (this.data || {}) : (this.previousFreshData || {});
        this.retainFilters = Boolean(this.previousFreshData.hasHighlight) && this.retainFilters;
        isFreshData && !this.retainFilters && this.clearFilters();

        this.data = this.converter(this.dataView, this.colors, this.settings);
        this.hasFilter() && (this.data = this.filterData(this.data));

        // to ignore first update call series caused by selecting facets in highlighted state
        this.selectionInHighlightedState = isFreshData
            ? (Boolean(this.previousFreshData.hasHighlight) && this.selectedInstances.length > 0)
            : this.selectionInHighlightedState;

        this.loadMoreCount = isFreshData ? 0 : ++this.loadMoreCount;
        const shouldLoadMoreData = hasMoreData && this.loadMoreCount < MAX_DATA_LOADS;

        if (this.selectionInHighlightedState) {
            return shouldLoadMoreData && this.loadMoreData();
        }
        if (loadAllDataBeforeRender) {
            isFreshData && this.toggleLoadingSpinner(true);
            return shouldLoadMoreData
                ? this.loadMoreData()
                : this.updateFacets();
        }
        isFreshData ? this.updateFacets() : this.syncFacets();
        return shouldLoadMoreData && this.loadMoreData();
    }

    /**
     * Builds the formatting pane model from the current settings.
     * `facetState` is intentionally excluded here (hidden/pane-less, persisted directly).
     *
     * @return {powerbi.visuals.FormattingModel}
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const settingsModel = new VisualFormattingSettings();
        const facetCount = (this.settings && this.settings.facetCount) || DEFAULT_SETTINGS.facetCount;
        const display = (this.settings && this.settings.display) || DEFAULT_SETTINGS.display;
        settingsModel.facetCount.initial.value = facetCount.initial;
        settingsModel.facetCount.increment.value = facetCount.increment;
        settingsModel.display.selectionCount.value = display.selectionCount;
        return this.formattingSettingsService.buildFormattingModel(settingsModel);
    }

    private getSelectedInstances() {
        if (!this.selectedInstances) {
            this.selectedInstances = [];
        }
        return this.selectedInstances;
    }

    /**
     * Validates the user input for the setting object from the powerbi formatting pane.
     * At the moment, it only validates the facetCount object.
     *
     * @param  {FacetKeySettings}    settings FacetKeySettings object.
     * @return {FacetKeySettings}
     */
    private validateSettings (settings: FacetKeySettings) {
        const facetCount = settings.facetCount;
        if (facetCount) {
            facetCount.initial = toFiniteNonNegativeInt(facetCount.initial, DEFAULT_SETTINGS.facetCount.initial);
            facetCount.increment = toFiniteNonNegativeInt(facetCount.increment, DEFAULT_SETTINGS.facetCount.increment);
        }
        return settings;
    }

    /**
     * Saves the facets’ state to a pbi object and persists it.
     */
    private saveFacetState() {
        const instances: VisualObjectInstance[] = [];
        const facetState = { rangeFacet: {}, normalFacet: {} };
        this.data.facetsData.forEach((facetData: any) => {
            const { key, order, collapsed, isRange } = facetData;
            facetState[isRange ? 'rangeFacet' : 'normalFacet'][key] = { order, collapsed };
        });
        this.settings.facetState = {
            rangeFacet: JSON.stringify(facetState.rangeFacet),
            normalFacet: JSON.stringify(facetState.normalFacet),
        };
        const instance = {
            objectName: 'facetState',
            selector: null,
            properties: this.settings.facetState,
        };
        instances.push(instance);
        const objects: powerbi.VisualObjectInstancesToPersist = { merge: instances };
        this.suppressNextUpdate = true;
        this.host.persistProperties(objects);
    }

    /**
     * Update and render facets with current state of the data.
     */
    private syncFacets() {
        // update new group and Other count with more|Less buttons
        this.data.facetsData.forEach((groupData: any) => {
            const key = groupData.key;
            const group = this.facets.getGroup(key);
            if (group) {
                const numVisibleFacets = group.facets.length;
                const allFacets = this.getFacetGroup(key).allFacets;
                const moreInitialFacets = numVisibleFacets < this.settings.facetCount.initial
                    ? allFacets.slice(numVisibleFacets, this.settings.facetCount.initial)
                    : [];
                const newNumVisibleFacets = numVisibleFacets + moreInitialFacets.length;
                const remaining = Math.max(allFacets.length - newNumVisibleFacets, 0);
                const hasMoreThanInitial = newNumVisibleFacets > this.settings.facetCount.initial;
                let more = remaining && [
                        { label: otherLabelTemplate(remaining), class: 'other', clickable: false },
                        { label: 'More', class: 'more', clickable: true },
                    ];
                hasMoreThanInitial && more
                    ? more.splice(1, 0,
                    { label: 'Less', class: 'less', clickable: true },
                    { label: '|', class: 'seperator', clickable: false }
                )
                    : [{ label: 'Less', class: 'less', clickable: true }];
                this.facets.append([{
                    key: key,
                    facets: moreInitialFacets,
                    more: more,
                }]);
                this.data.hasHighlight && moreInitialFacets.length > 0 && this.facets.select(this.data.facetsSelectionData);
            } else {
                this.facets.append([groupData]);
                this.data.hasHighlight && this.facets.select(this.data.facetsSelectionData);
            }
        });
    }

    /**
     * Show or hide a loading spinner depending on the provided boolean value.
     * @param {boolean} show A boolean flag indicating whether to show the loading spinner.
     */
    private toggleLoadingSpinner(show) {
        show ? this.loader.addClass('show') : this.loader.removeClass('show');
    }

    /**
     * Updates the facets.
     */
    private updateFacets() {
        this.toggleLoadingSpinner(false);
        this.resetFacets();
        this.data.hasHighlight && this.facets.select(this.data.facetsSelectionData);
        loadSelectionFromBookmarks(this);
    }

    /**
     * Reset the facets
     *
     */
    private resetFacets() {
        this.facetsContainer.removeClass('facets-selected');
        this.clearFilters();
        this.selectedInstances = [];
        this.selectionInHighlightedState = false;
        this.runWithNoAnimation(this.facets.replace, this.facets, this.data.facetsData);
    }

    /**
     * Clears filters.
     */
    private clearFilters() {
        this.filter = {};
        this.searchBox.val('');
        this.retainFilters = false;
    }

    /**
     * Re-render facets with filtered facets data.
     *
     * @param  {boolean=false} force.
     */
    private filterFacets(force: boolean = false) {
        const newKeyword = String(this.searchBox.val()).trim();
        const isKeywordChanged = this.filter.contains !== newKeyword;
        if (isKeywordChanged || force) {
            this.filter.contains = newKeyword;
            this.data = this.filterData(this.data);
            if (this.data && this.data.facetsData) {
                this.runWithNoAnimation(this.facets.replace, this.facets, this.data.facetsData);
                this.selectionInHighlightedState = false;
                this.updateFacetsSelection(this.selectedInstances);
            }
        }
    }

    /**
     * Apply the filter to the data and return the result.
     *
     * @param  {FacetsVisualData} FacetsVisualData data being filtered.
     * @return {FacetsVisualData}                  filtered data.
     */
    private filterData(data: FacetsVisualData) {
        this.filter.selectedDataPoints = this.selectedInstances;
        if (data) {
            const aggregatedData = aggregateDataPointsMap(data.dataPointsMapData, this.filter);
            const result: any =  extend({}, data, convertToFacetsVisualData(aggregatedData, {
                settings: this.settings,
                colors: this.colors,
                selectedRange: this.filter.range,
            }));
            this.selectedInstances = result.selectedDataPoints;
            return result;
        }

        return data;
    }

    /**
     * Get the facet group data with the given key from the data.
     *
     * @param  {string} key A facet key.
     * @return {FacetGroup} A facet group data.
     */
    private getFacetGroup(key: string): FacetGroup {
        return find(this.data.facetsData, (group: any) => key === group.key);
    }

    /**
     * Binds event handlers for the facets component.
     */
    private bindFacetsEventHandlers() {
        // If the mouse leaves the container while dragging, cancel it by triggering a mouseup event.
        this.facetsContainer.on('mouseleave', (evt) => this.facetsContainer.trigger('mouseup'));

        this.filterFacetsDebounced = debounce((e: any) => this.filterFacets(), 500);
        this.searchBox.on('input', this.filterFacetsDebounced);

        this.facets.on('facet:click', (e: any, key: string, value: string) => this.toggleFacetSelection(key, value));

        this.facets.on('facet-group:more', (e: any, key: string, index: number) =>
            e.currentTarget.classList.contains('more') ? this.showMoreFacetInstances(key) : this.shrinkFacetGroup(key));

        this.facets.on('facet-group:collapse', (e: any, key: string) => {
            const facetGroup = this.getFacetGroup(key);
            const selectedInstances = this.getSelectedInstances();
            if (facetGroup.isRange) {
                this.filter.range && this.filter.range[key] && (this.filter.range[key] = undefined);
                this.filterFacets(true);
                this.applySelection(selectedInstances);
                this.facets.getGroup(key).collapsed = true;
            } else {
                const deselected = remove(selectedInstances, (selected) => selected.facetKey === key);
                this.applySelection(selectedInstances);
                this.updateFacetsSelection(selectedInstances);
            }
            facetGroup.collapsed = true;
            this.saveFacetState();
        });

        this.facets.on('facet-group:expand', (e: any, key: string) => {
            this.runWithNoAnimation(this.resetGroup, this, key);
            this.facets.getGroup(key).collapsed = false;
            this.getFacetGroup(key).collapsed = false;
            this.saveFacetState();
        });

        this.facets.on('facet-group:dragging:end', () => {
            // Save the order of the facets
            this.data.facetsData.forEach((facetGroupData) => {
                const group = this.facets.getGroup(facetGroupData.key);
                facetGroupData.order = group.index;
            });
            this.saveFacetState();
        });

        this.facets.on('facet-histogram:rangechangeduser', (e: any, key: string, range: FacetRangeObject) => {
            const isFullRange = range.from.metadata[0].isFirst && range.to.metadata[range.to.metadata.length - 1].isLast;
            !this.filter.range && (this.filter.range = {});
            this.filter.range[key] = isFullRange ? undefined : range;
            this.data.hasHighlight ? (this.retainFilters = true) : this.filterFacets(true);
            this.applySelection(this.getSelectedInstances());
        });
    }

    /**
     * Resets the facet group with the given key to its original state.
     *
     * @param {string} key key of the target facet group.
     */
    private resetGroup(key: string): void {
        const facetGroup = this.getFacetGroup(key);
        this.facets.replaceGroup(facetGroup);
        this.data.hasHighlight && this.facets.select(this.data.facetsSelectionData);
    }

    private shrinkFacetGroup(key: string) {
        const facets = this.getFacetGroup(key).facets;
        this.resetGroup(key);
        if (!this.data.hasHighlight) {
            remove(this.selectedInstances, (selected) => selected.facetKey === key && !find(facets, {'value': selected.instanceValue}));
            this.applySelection(this.getSelectedInstances());
            this.runWithNoAnimation(this.updateFacetsSelection, this, this.selectedInstances);
        }
    }

    /**
     * Expend the facet group with the given key and display more facet instances.
     *
     * @param {string} key A facet key.
     */
    private showMoreFacetInstances(key: string): void {
        const LIMIT = this.settings.facetCount.increment;
        const group = this.facets.getGroup(key);
        const allFacets = this.getFacetGroup(key).allFacets;
        const visibleFacets = group.facets;
        const moreFacets = allFacets.slice(visibleFacets.length, visibleFacets.length + LIMIT);
        const remaining = Math.max(allFacets.length - (visibleFacets.length + LIMIT), 0);
        const more = remaining && [
                { label: otherLabelTemplate(remaining), class: 'other', clickable: false },
                { label: 'Less', class: 'less', clickable: true },
                { label: '|', class: 'seperator', clickable: false },
                { label: 'More', class: 'more', clickable: true },
            ] || [{ label: 'Less', class: 'less', clickable: true }];

        this.facets.append([{
            key: key,
            more: more,
            facets: moreFacets,
        }]);

        this.data.hasHighlight
            ? this.facets.select(this.data.facetsSelectionData)
            : this.runWithNoAnimation(this.updateFacetsSelection, this, this.getSelectedInstances());
    }

    /**
     * Run the provided function while facets animation is disabled.
     *
     * @param  {any}    fun     A function to be executed.
     * @param  {any}    thisArg The value of `this` prvided for the call to the given function.
     * @param  {any[]}  ...args The arguments provided for the call to the given function.
     */
    private runWithNoAnimation(fun: any, thisArg: any, ...args: any[]) {
        this.facetsContainer.toggleClass('no-animation', true);
        fun.call(thisArg, ...args);
        /* Trigger a reflow, flushing the CSS changes. Following line is needed for this to work. */
        this.facetsContainer[0].offsetHeight;
        this.facetsContainer.toggleClass('no-animation', false);
    }

    /**
     * Returns true if there is a range or keyword filter.
     *
     * @return {boolean}
     */
    private hasFilter(): boolean {
        return this.hasRangeFilter() || this.filter.contains !== undefined;
    }

    /**
     * Returns true if there is a range filter.
     *
     * @return {boolean} [description]
     */
    private hasRangeFilter(): boolean {
        if (!this.filter.range) { return false; }
        return Object.keys(this.filter.range).reduce((prev: boolean, key: any) => !!this.filter.range[key] || prev, false);
    }

    /**
     * Builds public powerbi-models AdvancedFilter objects (inclusive >= / <=) from the current
     * range filter state, one per range column, so multiple ranges combine as AND when applied
     * together via host.applyJsonFilter. Columns without a public `queryName` are safely skipped
     * (no private `column.expr` access).
     *
     * @param  {RangeFilter} rangeFilter A range filter.
     * @return {AdvancedFilter[]}        Public JSON filters ready for host.applyJsonFilter.
     */
    private buildAdvancedFiltersFromRangeFilter(rangeFilter: RangeFilter): AdvancedFilter[] {
        if (!rangeFilter) { return []; }
        const rangeValueColumns = findColumn(this.dataView, 'rangeValue', true) || [];
        const filters: AdvancedFilter[] = [];

        Object.keys(rangeFilter).forEach((key: string) => {
            const rangeForKey = rangeFilter[key];
            if (!rangeForKey) { return; }
            const column = find(rangeValueColumns, (col: any) => col && safeKey(col.displayName) === key);
            if (!column || !column.queryName || column.queryName.indexOf('.') < 0) { return; }

            const lastDot = column.queryName.lastIndexOf('.');
            const target: IFilterColumnTarget = {
                table: column.queryName.substring(0, lastDot),
                column: column.queryName.substring(lastDot + 1),
            };
            const rangeFrom = rangeForKey.from.metadata[0].rangeValue;
            const to = rangeForKey.to.metadata[rangeForKey.to.metadata.length - 1].rangeValue;
            filters.push(new AdvancedFilter(
                target,
                'And',
                { operator: 'GreaterThanOrEqual', value: rangeFrom },
                { operator: 'LessThanOrEqual', value: to },
            ));
        });

        return filters;
    }

    /**
     * Applies (or clears) the public JSON range filter declared via capabilities' `general.filter`.
     */
    private applyRangeFilter(): void {
        if (!this.dataView) { return; }
        const filters = this.buildAdvancedFiltersFromRangeFilter(this.filter.range);
        if (filters.length) {
            this.host.applyJsonFilter(filters, FILTER_OBJECT_NAME, FILTER_PROPERTY_NAME, FilterAction.merge);
        } else {
            this.host.applyJsonFilter(null, FILTER_OBJECT_NAME, FILTER_PROPERTY_NAME, FilterAction.remove);
        }
    }

    /**
     * Builds the deduplicated set of public selection ids representing every underlying row for
     * the given selected facet instances (a facet can represent multiple rows).
     *
     * @param  {DataPoint[]} dataPoints The data points of the selected facet instances.
     * @return {ISelectionId[]}         Deduplicated selection ids.
     */
    private buildSelectionIdsForDataPoints(dataPoints: DataPoint[]): ISelectionId[] {
        if (!this.dataView || !this.dataView.table) { return []; }
        const table = this.dataView.table;
        const idMap: { [key: string]: ISelectionId } = {};
        (dataPoints || []).forEach((dp: DataPoint) => {
            (dp.rows || []).forEach((row: RowObject) => {
                if (row.index === undefined || row.index === null) { return; }
                const id = this.host.createSelectionIdBuilder().withTable(table, row.index).createSelectionId();
                idMap[id.getKey()] = id;
            });
        });
        return Object.keys(idMap).map((key) => idMap[key]);
    }

    /**
     * Send the given selection of facet instances to the host: selects (OR, by deduplicated row
     * identity) every row represented by the chosen facets, and merges/removes the range filter
     * (AND across multiple ranges) via the public selectionManager + applyJsonFilter APIs.
     *
     * @param  {DataPoint[]} selectedInstances The data points of the selected facet instances.
     */
    private applySelection(selectedInstances: DataPoint[]) {
        const ids = this.buildSelectionIdsForDataPoints(selectedInstances);
        if (ids.length) {
            this.selectionManager.select(ids, false);
        } else {
            this.selectionManager.clear();
        }
        this.applyRangeFilter();
    }

    /**
     * Toggle selection for the facet instance with the given key and value
     *
     * @param {string} key   A facet key.
     * @param {string} value A facet instance value.
     */
    private toggleFacetSelection(key: string, value: string) {
        const dataPoint = find(this.data.aggregatedData.dataPointsMap[key], (dp: DataPoint) => dp.facetKey === key && dp.instanceValue === value);
        const selectedInstances = this.getSelectedInstances();
        const deselected = remove(selectedInstances, (selected) => selected.facetKey === key && selected.instanceValue === value);
        deselected.length === 0 && selectedInstances.push(dataPoint);
        this.applySelection(selectedInstances);
        this.updateFacetsSelection(selectedInstances);
    }

    /**
     * Update the facets component so that it reflects the given selected facet instances
     *
     * @param {DataPoint[] = []}   selectedInstances An array of datapoints for the selected facet instances.
     */
    private updateFacetsSelection(selectedInstances: DataPoint[] = []): void {
        const createSelectionData = (selectedDp: DataPoint) => {
            if (selectedDp.sparklineData) {
                return {
                    count: selectedDp.instanceCount,
                    timeseries: createTimeSeries(this.data.aggregatedData.sparklineXDomain, selectedDp.sparklineData),
                };
            }
            if (selectedDp.bucket) {
                return {
                    count: selectedDp.instanceCount,
                    segments: createSegments(selectedDp.bucket, selectedDp.selectionColor.color, false, selectedDp.selectionColor.opacity, true)
                };
            }
            return selectedDp.instanceCount;
        };

        if (this.selectionInHighlightedState && this.selectedInstances.length === 0) {
            this.resetFacets();
        } else {
            this.facets.unhighlight();
            this.facets.highlight(selectedInstances.map((dp) => ({ key: dp.facetKey, value: dp.instanceValue, count: dp.instanceCount })));
            this.deselectNormalFacetInstances();
            this.facetsContainer.toggleClass('facets-selected', selectedInstances.length > 0);
            this.facets.select(selectedInstances.map(selected => ({
                key: selected.facetKey,
                facets: [{
                    value: selected.instanceValue,
                    selected: createSelectionData(selected),
                }],
            })));
        }
    }

    /*
     * Deselects all the selected non-range facets.
     */
    private deselectNormalFacetInstances() {
        this.facets._groups.forEach((group: any) => {
            group.verticalFacets.forEach((facet: any) => facet.deselect());
        });
    }

    /**
     * PowerBI's visual destroy lifecycle method. Cancels pending debounced work and detaches
     * event handlers so neither fire after teardown.
     */
    public destroy(): void {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.reDrawRangeFilter && this.reDrawRangeFilter.cancel();
        this.updateSparklines && this.updateSparklines.cancel();
        this.filterFacetsDebounced && this.filterFacetsDebounced.cancel();
        // Facets is an IBindable, not a jQuery object: off() requires an events string/null and
        // throws on undefined. destroy() is its real public lifecycle method (idempotent-guarded above).
        if (this.facets && typeof this.facets.destroy === 'function') {
            this.facets.destroy();
        }
        if (this.facetsContainer) {
            this.facetsContainer.off();
            this.facetsContainer.empty();
        }
        this.facets = null;
        this.data = null;
        this.dataView = null;
        this.previousData = null;
        this.previousFreshData = null;
        this.selectedInstances = [];
    }
}

export default FacetsVisual;
