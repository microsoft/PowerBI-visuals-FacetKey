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
import IVisualHostServices = powerbi.IVisualHostServices;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import SQExprBuilder = powerbi.data.SQExprBuilder;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewScopeIdentity = powerbi.DataViewScopeIdentity;
import * as _ from 'lodash';
import * as $ from 'jquery';
import { formatValue, convertToDataPointsMap, aggregateDataPointsMap, compareRangeValue, convertToFacetsVisualData } from './data';
import { findColumn, hexToRgba, otherLabelTemplate, createSegments, HIGHLIGHT_COLOR } from './utils';

const Facets = require('../lib/@uncharted/facets/public/javascripts/main');

const MAX_DATA_LOADS = 5;

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
    private hostServices: IVisualHostServices;
    private firstSelectionInHighlightedState: boolean;
    private selectedInstances: DataPoint[] = [];
    private loadMoreCount: number;
    private reDrawRangeFilter: any = _.debounce(() => {
        if (this.data && this.data.facetsData) {
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
        }
    }, 500);

    /**
     * Initializes an instance of the IVisual.
     * @param  {VisualConstructorOptions} options Initialization options for the visual.
     */
    constructor(options: VisualConstructorOptions) {
        this.facetsContainer = $('<div class="facets-container"></div>').appendTo($(options.element));

        this.settings = DEFAULT_SETTINGS;

        this.hostServices = options.host.createSelectionManager()['hostServices'];
        this.colors = options.host.colors;

        this.facets = new Facets(this.facetsContainer, []);
        this.facetsContainer.prepend(`
            <div class="facets-global-loading"><div class="loader"><div class="facets-loader"></div></div></div>
            <div class="facets-header">
                <input class="search-box" placeholder="Search">
            </div>
        `);
        this.searchBox = this.facetsContainer.find('.search-box');
        this.loader = this.facetsContainer.find('.facets-global-loading');

        this.bindFacetsEventHandlers();

        this.facetsContainer.on('mousedown pointerdown', (e: Event) => e.stopPropagation());
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
            this.suppressNextUpdate = false;
            return;
        }
        if (options['resizeMode']) {
            return this.reDrawRangeFilter();
        }
        if (!options.dataViews || !(options.dataViews.length > 0)) { return; }

        this.previousData = this.data || {};
        this.dataView = options.dataViews[0];
        this.settings = this.validateSettings($.extend(true, {}, DEFAULT_SETTINGS, this.dataView.metadata.objects));

        const isFreshData = (options['operationKind'] === VisualDataChangeOperationKind.Create);
        const isMoreData = !isFreshData;
        const hasMoreData = !!this.dataView.metadata.segment && this.hasRequiredFields(this.dataView);
        const rangeValueColumn = findColumn(this.dataView, 'rangeValue');
        const bucketColumn = findColumn(this.dataView, 'bucket');
        const loadAllDataBeforeRender = Boolean(rangeValueColumn) || Boolean(bucketColumn);

        this.facetsContainer.toggleClass('render-segments', Boolean(bucketColumn));

        this.previousFreshData = isFreshData ? (this.data || {}) : this.previousFreshData;
        this.retainFilters = this.previousFreshData.hasHighlight && this.retainFilters;
        isFreshData && !this.retainFilters && this.clearFilters();

        // Update data and the Facets
        this.data = this.hasRequiredFields(this.dataView)
            ? FacetsVisual.converter(this.dataView, this.colors, this.settings)
            : <any>{ facetsData: [], dataPointsMap: {} };

        this.hasFilter() && (this.data = this.filterData(this.data));

        // to ignore first update call seriese caused by selecting facets in highlihgted state
        this.firstSelectionInHighlightedState = isFreshData
            ? (this.previousFreshData.hasHighlight && this.selectedInstances.length > 0)
            : this.firstSelectionInHighlightedState;

        !loadAllDataBeforeRender && !this.firstSelectionInHighlightedState && this.updateFacets(isMoreData);

        // Load more data while there is more data under the threshold
        const loadMoreData = () => {
            loadAllDataBeforeRender && !this.firstSelectionInHighlightedState && this.loader.addClass('show');
            this.hostServices.loadMoreData();
        };
        this.loadMoreCount = isFreshData ? 0 : ++this.loadMoreCount;
        hasMoreData && this.loadMoreCount < MAX_DATA_LOADS
            ? loadMoreData()
            : loadAllDataBeforeRender && !this.firstSelectionInHighlightedState && this.updateFacets();
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
     * It will return true if the given DataView has the count column and either the facet or facetInstance column populated.
     *
     * @param  {DataView} dataView powerbi dataView object.
     * @return {boolean}
     */
    private hasRequiredFields(dataView: DataView): boolean {
        const columns = dataView.metadata.columns;
        const countColumnExists = _.some(columns || [], (col: any) => col && col.roles.count);
        const instanceColumnExists = _.some(columns || [], (col: any) => col && col.roles.facetInstance);
        return instanceColumnExists && countColumnExists;
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
     * Updates the facets.
     * @param  {boolean = false} syncFacets A flag indicating syncying with the more data is needed.
     */
    private updateFacets(syncFacets: boolean = false) {
        if (syncFacets) {
            return this.syncFacets();
        }
        // else, it's fresh data
        this.loader.removeClass('show');
        this.resetFacets(false, true);
        this.data.hasHighlight && this.facets.select(this.data.facetsSelectionData);
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
            this.redrawFacets();
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
        const aggregatedData = aggregateDataPointsMap(data.dataPointsMapData, this.filter);
        const result: any =  _.extend({}, data, convertToFacetsVisualData(aggregatedData, {
            settings: this.settings,
            colors: this.colors,
            selectedRange: this.filter.range,
        }));
        this.selectedInstances = result.selectedDataPoints;
        return result;
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
        this.facetsContainer.on('mouseleave', (evt: Event) => this.facetsContainer.trigger('mouseup'));

        this.searchBox.on('input', _.debounce((e: any) => this.filterFacets(), 500));

        this.facets.on('facet:click', (e: any, key: string, value: string) => this.toggleFacetSelection(key, value));

        this.facets.on('facet-group:more', (e: any, key: string, index: number) =>
        e.currentTarget.classList.contains('more') ? this.showMoreFacetInstances(key) : this.shrinkFacetGroup(key));

        this.facets.on('facet-group:collapse', (e: any, key: string) => {
            const facetGroup = this.getFacetGroup(key);
            facetGroup.collapsed = true;
            this.saveFacetState();
            if (facetGroup.isRange) {
                this.filter.range && this.filter.range[key] && (this.filter.range[key] = undefined);
                this.filterFacets(true);
                this.selectedInstances.length > 0
                    ? this.selectFacetInstances(this.selectedInstances)
                    : this.selectRanges();
                return;
            }
            const deselected = _.remove(this.selectedInstances, (selected) => selected.facetKey === key);
            this.selectedInstances.length > 0 && this.selectFacetInstances(this.selectedInstances);
            this.updateFacetsSelection(this.selectedInstances);
        });

        this.facets.on('facet-group:expand', (e: any, key: string) => {
            this.getFacetGroup(key).collapsed = false;
            this.saveFacetState();
            this.resetGroup(key);
        });

        this.facets.on('facet-group:dragging:end', () => {
            // Save the order of the facets
            this.data.facetsData.forEach((facetGroupData) => {
                const group = this.facets._getGroup(facetGroupData.key);
                facetGroupData.order = group.index;
            });
            this.saveFacetState();
        });

        this.facets.on('facet-histogram:rangechangeduser', (e: any, key: string, range: any) => {
            const isFullRange = range.from.metadata[0].isFirst && range.to.metadata[range.to.metadata.length - 1].isLast;
            !this.filter.range && (this.filter.range = {});
            this.filter.range[key] = isFullRange ? undefined : { from: range.from, to: range.to };
            if (this.data.hasHighlight) {
                this.retainFilters = true;
                this.selectRanges();
            } else {
                this.filterFacets(true);
                this.selectedInstances.length > 0
                    ? this.selectFacetInstances(this.selectedInstances)
                    : this.selectRanges();
            }
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
            this.selectFacetInstances(this.selectedInstances);
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
     * Clears filters.
     */
    private clearFilters() {
        this.filter = {};
        this.searchBox.val('');
        this.retainFilters = false;
    }

    /**
     * Reset facets by unselecting all facets instances.
     *
     * @param {boolean = true}  notifyHost A flag indicating whether to notify the host to trigger update call.
     * @param {boolean = false} replace    A flag indicating whether to replace facets with current data.
     */
    private resetFacets(notifyHost: boolean = true, replace: boolean = false): void {
        notifyHost && this.sendSelectionToHost([]);
        this.deselectNormalFacetInstances();
        this.facets.unhighlight();
        this.selectedInstances = [];
        if (replace) {
            !this.retainFilters && this.clearFilters();
            this.firstSelectionInHighlightedState = false;
            this.runWithNoAnimation(this.facets.replace, this.facets, this.data.facetsData);
        };
    }

    /**
     * Redraw facets with current data and update the selection state.
     */
    private redrawFacets() {
        this.runWithNoAnimation(this.facets.replace, this.facets, this.data.facetsData);
        this.facets._queryGroup._element.find('.facet-bar-container').append('<i class="fa fa-times query-remove" aria-hidden="true"></i>');
        this.data.hasHighlight
            ? this.facets.select(this.data.facetsSelectionData)
            : this.updateFacetsSelection(this.selectedInstances, false);
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
            const column = _.find(rangeValueColumns, (column: any) => column.displayName === key);
            const filter = rangeFilter[key];
            if (filter) {
                const from = filter.from.metadata[0].rangeValue;
                const to = filter.to.metadata[filter.to.metadata.length - 1].rangeValue;
                const rangeExpr = SQExprBuilder.between(column.expr,  SQExprBuilder.typedConstant(from, column.type), SQExprBuilder.typedConstant(to, column.type));
                sqExpr = sqExpr ? SQExprBuilder.and(rangeExpr, sqExpr) : rangeExpr;
            }
        });
        return sqExpr;
    }

    /**
     * Send the range selection to the host.
     */
    private selectRanges() {
        const sqExpr: any = this.hasRangeFilter()
            ? this.createSQExprFromRangeFilter(this.filter.range)
            : undefined;
        this.sendSelectionToHost(sqExpr ? [powerbi.data.createDataViewScopeIdentity(sqExpr)] : []);
    }

    /**
     * Send the given selection of facet instances to the host.
     *
     * @param  {DataPoint[]} selectedInstances The data points of the selected facet instances.
     */
    private selectFacetInstances(selectedInstances: DataPoint[]) {
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

        if (sqExpr && this.hasRangeFilter()) {
            const rangeExpr = this.createSQExprFromRangeFilter(this.filter.range);
            sqExpr = SQExprBuilder.and(sqExpr, rangeExpr);
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
        this.selectFacetInstances(this.selectedInstances);
        this.updateFacetsSelection(this.selectedInstances);
    }

    /**
     * Update the facets component so that it reflects the given selected facet instances
     *
     * @param {DataPoint[] = []}   selectedInstances An array of datapoints for the selected facet instances.
     * @param {boolean     = true} reset             Flag indicating whether to reset the facets components when there's no selected facets.
     */
    private updateFacetsSelection(selectedInstances: DataPoint[] = [], reset: boolean = true): void {
        this.facets.unhighlight();
        this.facets.highlight(selectedInstances.map((dp) => ({ key: dp.facetKey, value: dp.instanceValue, count: dp.instanceCount })));
        this.deselectNormalFacetInstances();
        selectedInstances.length > 0 && this.facets.select(selectedInstances.map(selected => ({
            key: selected.facetKey,
            facets: [{
                value: selected.instanceValue,
                selected: selected.bucket ? {
                    count: selected.instanceCount,
                    segments: createSegments(selected.bucket, selected.selectionColor.color, false, selected.selectionColor.opacity, true)
                } : selected.instanceCount,
            }],
        })));
        if (reset && this.selectedInstances.length === 0) {
            this.hasRangeFilter()
                ? this.selectRanges()
                : this.resetFacets(true, this.firstSelectionInHighlightedState);
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
