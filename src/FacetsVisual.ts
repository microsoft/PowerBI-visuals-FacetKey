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

/// <reference path='../node_modules/powerbi-visuals/lib/powerbi-visuals.d.ts'/>

import IVisual = powerbi.extensibility.v110.IVisual;
import VisualConstructorOptions = powerbi.extensibility.v110.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.v110.VisualUpdateOptions;
import DataView = powerbi.DataView;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import IColorInfo = powerbi.IColorInfo;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import IVisualHost = powerbi.extensibility.v110.IVisualHost;
import IVisualHostServices = powerbi.IVisualHostServices;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import SQExprBuilder = powerbi.data.SQExprBuilder;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewScopeIdentity = powerbi.DataViewScopeIdentity;
import * as _ from 'lodash';
import * as $ from 'jquery';
import { convertToDataPointsMap, aggregateDataPointsMap, convertToFacetsVisualData } from './data';
import { safeKey, findColumn, hexToRgba, otherLabelTemplate, createSegments, HIGHLIGHT_COLOR, hasColumns, createTimeSeries } from './utils';

const Facets = require('../lib/@uncharted.software/stories-facets/src/main');

const MAX_DATA_LOADS = 5;
const REQUIRED_FIELDS = ['count', 'facetInstance'];

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

export default class FacetsVisual implements IVisual {

    private facetsContainer: JQuery;
    private suppressNextUpdate: boolean;
    private loader: JQuery;
    private searchBox: JQuery;
    private facets: any;
    private settings: FacetKeySettings;
    private colors: IColorInfo[];
    private dataView: DataView;
    private data: FacetsVisualData;
    private filter: DataPointsFilter = {};
    private retainFilters: boolean = false;
    private previousData: any;
    private previousFreshData: any;
    private host: IVisualHost;
    private hostServices: IVisualHostServices;
    private loadMoreData: Function;
    private selectionInHighlightedState: boolean;
    private selectedInstances: DataPoint[] = [];
    private loadMoreCount: number;
    private reDrawRangeFilter: any = _.debounce(() => {
        const rangeFacets = this.data.facetsData.filter((group: any) => group.isRange);
        rangeFacets.forEach((facetData: any) => {
            const group = this.facets._getGroup(facetData.key);
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
    private updateSparklines: any = _.debounce(() => {
        if (this.data.aggregatedData.sparklineXDomain.length > 0) {
            // updating selection triggers redrawing of the sparklines
            this.data.hasHighlight
                ? this.facets.select(this.data.facetsSelectionData)
                : this.updateFacetsSelection(this.selectedInstances);
        }
    }, 500);

    /**
     * Initializes an instance of the IVisual.
     * @param  {VisualConstructorOptions} options Initialization options for the visual.
     */
    constructor(options: VisualConstructorOptions) {
        this.facetsContainer = $('<div class="facets-container"></div>').appendTo($(options.element));

        this.settings = DEFAULT_SETTINGS;

        this.host = options.host;
        this.hostServices = options.host.createSelectionManager()['hostServices'];
        this.colors = this.host.colors;

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

        const findApi = (methodName) => {
            return this.host[methodName] ? (arg) => {
                this.host[methodName](arg);
            } : this.hostServices && this.hostServices[methodName] ? (arg) => {
                this.hostServices[methodName](arg);
            } : null;
        };
        this.loadMoreData = findApi('loadMoreData') || function () {};
    }

    /**
     * Converts the dataview into our own model.
     *
     * @param  {DataView}         dataView A dataView object.
     * @param  {IColorInfo[]}     colors   Powerbi color info array.
     * @param  {FacetKeySettings} settings A facetkey settings object.
     * @return {FacetsVisualData}
     */
    public static converter(dataView: DataView, colors: IColorInfo[], settings: FacetKeySettings): FacetsVisualData {
        const dataPointsMapData = convertToDataPointsMap(dataView);
        const aggregatedData = aggregateDataPointsMap(dataPointsMapData);
        const facetsData = convertToFacetsVisualData(aggregatedData, {
            settings: settings,
            colors: colors,
        });
        return _.extend({ dataPointsMapData: dataPointsMapData }, facetsData);
    }


    /**
     * Notifies the IVisual of an update (data, viewmode, size change).
     *
     * @param  {VisualUpdateOptions} options visual update options.
     */
    public update(options: VisualUpdateOptions) {
        if (this.suppressNextUpdate) {
            return (this.suppressNextUpdate = false);
        }
        if (options['resizeMode'] && this.data && this.data.facetsData) {
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
        this.settings = this.validateSettings($.extend(true, {}, DEFAULT_SETTINGS, this.dataView.metadata.objects));

        const isFreshData = (options['operationKind'] === VisualDataChangeOperationKind.Create);
        const hasMoreData = Boolean(this.dataView.metadata.segment);
        const rangeValueColumn = findColumn(this.dataView, 'rangeValue');
        const bucketColumn = findColumn(this.dataView, 'bucket');
        const sparklineColumn = findColumn(this.dataView, 'sparklineData');
        const loadAllDataBeforeRender = Boolean(rangeValueColumn) || Boolean(bucketColumn) || Boolean(sparklineColumn);

        this.facetsContainer.toggleClass('render-segments', Boolean(bucketColumn));

        this.previousFreshData = isFreshData ? (this.data || {}) : this.previousFreshData;
        this.retainFilters = this.previousFreshData.hasHighlight && this.retainFilters;
        isFreshData && !this.retainFilters && this.clearFilters();

        this.data = FacetsVisual.converter(this.dataView, this.colors, this.settings);
        this.hasFilter() && (this.data = this.filterData(this.data));

        // to ignore first update call series caused by selecting facets in highlighted state
        this.selectionInHighlightedState = isFreshData
            ? (this.previousFreshData.hasHighlight && this.selectedInstances.length > 0)
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
     * Enumerates the instances for the objects that appear in the power bi formatting pane.
     *
     * @param  {EnumerateVisualObjectInstancesOptions} options An EnumerateVisualObjectInstancesOptions object.
     * @return {VisualObjectInstance[]}
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
        let instances: VisualObjectInstance[];
        switch (options.objectName) {
            case 'facetState':
                break;
            default:
                instances = [{
                    selector: undefined,
                    objectName: options.objectName,
                    properties: {}
                }];
                $.extend(true, instances[0].properties, this.settings[options.objectName]);
                break;
        }
        return instances;
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
            facetCount.initial = facetCount.initial < 0 ? 0 : parseInt(String(facetCount.initial), 10);
            facetCount.increment = facetCount.increment < 0 ? 0 : parseInt(String(facetCount.increment), 10);
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
        this.hostServices.persistProperties(objects);
    }

    /**
     * Update and render facets with current state of the data.
     */
    private syncFacets() {
        // update new group and Other count with more|Less buttons
        this.data.facetsData.forEach((groupData: any) => {
            const key = groupData.key;
            const group = this.facets._getGroup(key);
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
            const result: any =  _.extend({}, data, convertToFacetsVisualData(aggregatedData, {
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
        return _.find(this.data.facetsData, (group: any) => key === group.key);
    }

    /**
     * Binds event handlers for the facets component.
     */
    private bindFacetsEventHandlers() {
        // If the mouse leaves the container while dragging, cancel it by triggering a mouseup event.
        this.facetsContainer.on('mouseleave', (evt) => this.facetsContainer.trigger('mouseup'));

        this.searchBox.on('input', _.debounce((e: any) => this.filterFacets(), 500));

        this.facets.on('facet:click', (e: any, key: string, value: string) => this.toggleFacetSelection(key, value));

        this.facets.on('facet-group:more', (e: any, key: string, index: number) =>
            e.currentTarget.classList.contains('more') ? this.showMoreFacetInstances(key) : this.shrinkFacetGroup(key));

        this.facets.on('facet-group:collapse', (e: any, key: string) => {
            const facetGroup = this.getFacetGroup(key);
            if (facetGroup.isRange) {
                this.filter.range && this.filter.range[key] && (this.filter.range[key] = undefined);
                this.filterFacets(true);
                this.applySelection(this.selectedInstances);
                this.facets._getGroup(key).collapsed = true;
            } else {
                const deselected = _.remove(this.selectedInstances, (selected) => selected.facetKey === key);
                this.applySelection(this.selectedInstances);
                this.updateFacetsSelection(this.selectedInstances);
            }
            facetGroup.collapsed = true;
            this.saveFacetState();
        });

        this.facets.on('facet-group:expand', (e: any, key: string) => {
            this.runWithNoAnimation(this.resetGroup, this, key);
            this.facets._getGroup(key).collapsed = false;
            this.getFacetGroup(key).collapsed = false;
            this.saveFacetState();
        });

        this.facets.on('facet-group:dragging:end', () => {
            // Save the order of the facets
            this.data.facetsData.forEach((facetGroupData) => {
                const group = this.facets._getGroup(facetGroupData.key);
                facetGroupData.order = group.index;
            });
            this.saveFacetState();
        });

        this.facets.on('facet-histogram:rangechangeduser', (e: any, key: string, range: FacetRangeObject) => {
            const isFullRange = range.from.metadata[0].isFirst && range.to.metadata[range.to.metadata.length - 1].isLast;
            !this.filter.range && (this.filter.range = {});
            this.filter.range[key] = isFullRange ? undefined : range;
            this.data.hasHighlight ? (this.retainFilters = true) : this.filterFacets(true);
            this.applySelection(this.selectedInstances);
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
            _.remove(this.selectedInstances, (selected) => selected.facetKey === key && !_.find(facets, {'value': selected.instanceValue}));
            this.applySelection(this.selectedInstances);
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
        const group = this.facets._getGroup(key);
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
            : this.runWithNoAnimation(this.updateFacetsSelection, this, this.selectedInstances);
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
     * Creates a semantic query expression from the given range filter.
     *
     * @param  {any}    rangeFilter A range filter
     * @return {any}    A range sqExpr expression.
     */

    private createSQExprFromRangeFilter(rangeFilter: any) {
        const rangeValueColumns = findColumn(this.dataView, 'rangeValue', true);
        let sqExpr: any;
        Object.keys(rangeFilter).forEach((key: string) => {
            const column = _.find(rangeValueColumns, (column: any) => safeKey(column.displayName) === key);
            const filter = rangeFilter[key];
            if (filter) {
                const rangeFrom = filter.from.metadata[0].rangeValue;
                const to = filter.to.metadata[filter.to.metadata.length - 1].rangeValue;
                const rangeExpr = SQExprBuilder.between(column.expr,  SQExprBuilder.typedConstant(rangeFrom, column.type), SQExprBuilder.typedConstant(to, column.type));
                sqExpr = sqExpr ? SQExprBuilder.and(rangeExpr, sqExpr) : rangeExpr;
            }
        });
        return sqExpr;
    }

    /**
     * Send the given selection of facet instances to the host.
     *
     * @param  {DataPoint[]} selectedInstances The data points of the selected facet instances.
     */
    private applySelection(selectedInstances: DataPoint[]) {
        const facetColumn = findColumn(this.dataView, 'facet');
        const instanceColumn = findColumn(this.dataView, 'facetInstance');

        let sqExpr = selectedInstances.reduce((prevExpr: any, selected: any) => {
            if (!selected.rows[0]) { return prevExpr; }
            const { facet, facetInstance } = selected.rows[0];
            let expr: any = instanceColumn
                ? SQExprBuilder.equal(instanceColumn.expr, SQExprBuilder.typedConstant(facetInstance, instanceColumn.type))
                : undefined;
            expr = facetColumn
                ? SQExprBuilder.and(expr, SQExprBuilder.equal(facetColumn.expr, SQExprBuilder.typedConstant(facet, facetColumn.type)))
                : expr;
            return prevExpr ? SQExprBuilder.or(prevExpr, expr) : expr;
        }, undefined);

        if (this.hasRangeFilter()) {
            const rangeExpr = this.createSQExprFromRangeFilter(this.filter.range);
            sqExpr = sqExpr ? SQExprBuilder.and(sqExpr, rangeExpr) : rangeExpr;
        }

        this.sendSelectionToHost(sqExpr ? [powerbi.data.createDataViewScopeIdentity(sqExpr)] : []);
    }

    /**
     * Send a selection for the given data view scope identities to the host.
     *
     * @param {DataViewScopeIdentity[]} identities An array of powerbi DataViewScopeIdentities.
     */
    private sendSelectionToHost(identities: DataViewScopeIdentity[]) {
        const selectArgs = {
            data: identities.map((identity: DataViewScopeIdentity) => ({ data: [identity] })),
            visualObjects: [],
        };
        this.hostServices.onSelect(selectArgs);
    }

    /**
     * Toggle selection for the facet instance with the given key and value
     *
     * @param {string} key   A facet key.
     * @param {string} value A facet instance value.
     */
    private toggleFacetSelection(key: string, value: string) {
        const dataPoint = _.find(this.data.aggregatedData.dataPointsMap[key], (dp: DataPoint) => dp.facetKey === key && dp.instanceValue === value);
        const deselected = _.remove(this.selectedInstances, (selected) => selected.facetKey === key && selected.instanceValue === value);
        deselected.length === 0 && this.selectedInstances.push(dataPoint);
        this.applySelection(this.selectedInstances);
        this.updateFacetsSelection(this.selectedInstances);
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
}
