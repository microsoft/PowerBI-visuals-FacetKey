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
import * as _ from 'lodash';
import * as $ from 'jquery';
import { formatValue, convertDataview, aggregateDataPointMap, compareRangeValue, convertDataPointMap } from './data';
import { findColumn, hexToRgba, otherLabelTemplate, createSegments, HIGHLIGHT_COLOR } from './utils';

const Facets = require('../lib/uncharted-facets/public/javascripts/main');

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

    private element: JQuery;
    private suppressNextUpdate: boolean;
    private loader: JQuery;
    private searchBox: JQuery;
    private facets: any;
    private settings: FacetKeySettings;
    private colors: IColorInfo[];
    private dataView: DataView;
    private data: any;
    private retainFilters: boolean = false;
    private rangeFilter: any;
    private keywordFilter: any;
    private keywordQueries: any = [];
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
     *
     * @param options Initialization options for the visual.
     */
    constructor(options: VisualConstructorOptions) {
        const facetsContainer = $('<div class="facets-container"></div>');

        this.settings = DEFAULT_SETTINGS;
        this.element = $(options.element).append(facetsContainer);

        this.hostServices = options.host.createSelectionManager()['hostServices'];
        this.colors = options.host.colors;

        this.facets = new Facets(facetsContainer, []);
        this.element.find('.facets-container').prepend(`
            <div class="facets-global-loading"><div class="loader"><div class="facets-loader"></div></div></div>
            <div class="facets-header">
                <div class="facet-menu-anchor">
                    <i class="fa fa-ellipsis-h"></i>
                </div>
                <input class="search-box" placeholder="Search">
            </div>
        `);
        this.searchBox = this.element.find('.search-box');
        this.loader = this.element.find('.facets-global-loading');

        this.bindFacetsEventHandlers();

        // Stop propagating theses events to visual parent elements
        this.element.find('.search-box').on('mousedown mouseup click focus blur input pointerdown pointerup touchstart touchdown', (e) => e.stopPropagation());
    }

    /**
     * Converts the dataview into our own model
     */
    public static converter(dataView: DataView, colors: IColorInfo[], settings: any) {
        const values = dataView.categorical.values || <powerbi.DataViewValueColumn[]>[];
        const highlights = values[0] && values[0].highlights;

        const dataPointsMap = convertDataview(dataView);
        const aggregatedData = aggregateDataPointMap(dataPointsMap);
        const facetsData = convertDataPointMap(aggregatedData, {
            settings: settings,
            colors: colors,
            hasHighlight: !!highlights,
        });
        return _.extend({ dataPointsMap: dataPointsMap }, facetsData);
    }

    /**
     * Notifies the IVisual of an update (data, viewmode, size change).
     */
    public update(options: VisualUpdateOptions): void {
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
        this.settings = this.validateSettings($.extend(true, {}, this.settings, this.dataView.metadata.objects));

        const isFreshData = (options['operationKind'] === VisualDataChangeOperationKind.Create);
        const isMoreData = !isFreshData;
        const hasMoreData = !!this.dataView.metadata.segment;
        const rangeValueColumn = findColumn(this.dataView, 'rangeValue');
        const bucketColumn = findColumn(this.dataView, 'bucket');
        const loadAllDataBeforeRender = Boolean(rangeValueColumn) || Boolean(bucketColumn);

        this.element.toggleClass('render-segments', Boolean(bucketColumn));

        this.previousFreshData = isFreshData ? (this.data || {}) : this.previousFreshData;
        this.retainFilters = this.previousFreshData.hasHighlight && this.retainFilters;
        isFreshData && !this.retainFilters && this.clearFilters();

        // Update data and the Facets
        this.data = this.hasRequiredFields(this.dataView)
            ? FacetsVisual.converter(this.dataView, this.colors, this.settings)
            : { facetsData: [], dataPointsMap: {} };
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
     * Enumerates the instances for the objects that appear in the power bi panel
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

    private hasRequiredFields(dataView: DataView): boolean {
        const columns = dataView.metadata.columns;
        const countColumnExists = _.some(columns || [], (col: any) => col && col.roles.count);
        const instanceColumnExists = _.some(columns || [], (col: any) => col && col.roles.facetInstance);
        const facetColumnExists = _.some(columns || [], (col: any) => col && col.roles.facet);
        // return true if either instance column or faceet column AND count column is populated.
        return (instanceColumnExists || facetColumnExists) && countColumnExists;
    }

    private validateSettings (settings: any) {
        const facetCount = settings.facetCount;
        if (facetCount) {
            facetCount.initial = facetCount.initial < 0 ? 0 : parseInt(facetCount.initial, 10);
            facetCount.increment = facetCount.increment < 0 ? 0 : parseInt(facetCount.increment, 10);
        }
        return settings;
    }

    /**
     * Saves the facet ordering to PBI
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

    private updateFacets(isMoreData: boolean = false) {
        if (isMoreData) {
            return this.syncFacets();
        }
        // else, it's fresh data
        this.loader.removeClass('show');
        this.resetFacets(false, true);
        this.data.hasHighlight && this.facets.select(this.data.facetsSelectionData);
    }

    private syncFacets(): void {
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

    private filterFacets(addQuery: boolean = false, force: boolean = false) {
        const newKeyword = String(this.searchBox.val()).trim().toLowerCase();
        const isKeywordChanged = this.keywordFilter !== newKeyword;
        const isQueryAdded = addQuery && newKeyword && this.keywordQueries.indexOf(newKeyword) === -1;
        this.keywordFilter = newKeyword;
        isQueryAdded && this.keywordQueries.push(newKeyword);
        addQuery && this.searchBox.val('');
        if (isKeywordChanged || isQueryAdded || force) {
            this.data = this.filterData(this.data);
            this.redrawFacets();
        }
    }

    private filterData(data: any) {
        const aggregatedData = aggregateDataPointMap(data.dataPointsMap, {
            filters: this.keywordFilter,
            rangeFilter: this.rangeFilter,
            selectedInstances: this.selectedInstances
        });
        const result: any =  _.extend({}, data, convertDataPointMap(aggregatedData, {
                hasHighlight: this.data.hasHighlight,
                rangeFilter: this.rangeFilter,
                settings: this.settings,
                colors: this.colors,
        }));
        this.selectedInstances = result.selectedDataPoints;
        return result;
    }

    private getFacetGroup(key: string) {
        return _.find(this.data.facetsData, (group: any) => key === group.key);
    }

    private bindFacetsEventHandlers(): void {
        this.searchBox.on('input', _.debounce((e: any) => this.filterFacets(), 500));

        this.facets.on('facet:click', (e: any, key: string, value: string) => this.toggleFacetSelection(key, value));

        this.facets.on('facet-group:more', (e: any, key: string, index: number) =>
            e.currentTarget.classList.contains('more') ? this.showMoreFacetInstances(key) : this.resetGroup(key));

        this.facets.on('facet-group:collapse', (e: any, key: string) => {
            const facetGroup = this.getFacetGroup(key);
            facetGroup.collapsed = true;
            this.saveFacetState();
            if (facetGroup.isRange) {
                this.rangeFilter && this.rangeFilter[key] && (this.rangeFilter[key] = undefined);
                this.filterFacets(false, true);
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
            !this.rangeFilter && (this.rangeFilter = {});
            this.rangeFilter[key] = isFullRange ? undefined : { from: range.from, to: range.to };
            if (this.data.hasHighlight) {
                this.retainFilters = true;
                this.selectRanges();
            } else {
                this.filterFacets(false, true);
                this.selectedInstances.length > 0
                    ? this.selectFacetInstances(this.selectedInstances)
                    : this.selectRanges();
            }
        });
    }

    /**
     * Reset the facet group to its original state
     */
    private resetGroup(key: string): void {
        const facetGroup = this.getFacetGroup(key);
        this.facets.replaceGroup(facetGroup);
        this.facets.highlight(this.selectedInstances.map(dp => ({ key: dp.facetKey, value: dp.instanceValue, count: dp.instanceCount })));
        this.data.hasHighlight && this.facets.select(this.data.facetsSelectionData);
    }

    /**
     * Show more facet instances
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
        this.data.hasHighlight && this.facets.select(this.data.facetsSelectionData);
    }

    /**
     * Reset Facets by unselecting facets instances or redrawing.
     */
    private resetFacets(notifyHost: boolean = true, replace: boolean = false): void {
        notifyHost && this.sendSelectionToHost([]);
        this.deselectNormalFacetInstances();
        this.facets.unhighlight();
        this.selectedInstances = [];
        if (replace) {
            !this.retainFilters && this.clearFilters();
            this.firstSelectionInHighlightedState = false;
            this.facets.replace(this.data.facetsData);
        };
    }

    private clearFilters(): void {
        this.rangeFilter = undefined;
        this.keywordFilter = undefined;
        this.keywordQueries = [];
        this.searchBox.val('');
        this.retainFilters = false;
    }

    /**
     * Redraw facets with current data with current highlight or selection state
     */
    private redrawFacets(): void {
        this.facets.replace(this.data.facetsData);
        this.facets._queryGroup._element.find('.facet-bar-container').append('<i class="fa fa-times query-remove" aria-hidden="true"></i>');
        this.data.hasHighlight
            ? this.facets.select(this.data.facetsSelectionData)
            : this.updateFacetsSelection(this.selectedInstances, false);
    }

    private hasFilter(): boolean {
        return this.hasRangeFilter() || this.keywordFilter !== undefined || this.keywordQueries.length > 0;
    }

    private hasRangeFilter(): boolean {
        if (!this.rangeFilter) { return false; }
        return Object.keys(this.rangeFilter).reduce((prev: boolean, key: any) => !!this.rangeFilter[key] || prev, false);
    }

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
    };

    private selectRanges() {
        const sqExpr: any = this.hasRangeFilter()
            ? this.createSQExprFromRangeFilter(this.rangeFilter)
            : undefined;
        this.sendSelectionToHost(sqExpr ? [powerbi.data.createDataViewScopeIdentity(sqExpr)] : []);
    }

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
            const rangeExpr = this.createSQExprFromRangeFilter(this.rangeFilter);
            sqExpr = SQExprBuilder.and(sqExpr, rangeExpr);
        }
        this.sendSelectionToHost(sqExpr ? [powerbi.data.createDataViewScopeIdentity(sqExpr)] : []);
    }

    private sendSelectionToHost(identities: any[]): void {
        const selectArgs = {
            data: identities.map((identity: any) => ({ data: [identity] })),
            visualObjects: [],
        };
        this.hostServices.onSelect(selectArgs);
    }

    private toggleFacetSelection(key: string, value: string): void {
        const dataPoint = _.find(this.data.aggregatedData.dataPointsMap[key], (dp: DataPoint) => dp.facetKey === key && dp.instanceValue === value);
        const deselected = _.remove(this.selectedInstances, (selected) => selected.facetKey === key && selected.instanceValue === value);
        deselected.length === 0 && this.selectedInstances.push(dataPoint);
        this.selectFacetInstances(this.selectedInstances);
        this.updateFacetsSelection(this.selectedInstances);
    }

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
                    segments: createSegments(selected.bucket, HIGHLIGHT_COLOR, false, 100, true)
                } : selected.instanceCount,
            }],
        })));
        if (reset && this.selectedInstances.length === 0) {
            this.hasRangeFilter()
                ? this.selectRanges()
                : this.resetFacets(true, this.firstSelectionInHighlightedState);
        }
    }

    private deselectNormalFacetInstances(): void {
        this.facets._groups.forEach((group: any) => {
            group.verticalFacets.forEach((facet: any) => facet.deselect());
        });
    }
}
