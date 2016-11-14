interface FacetKeySettings {
    facetCount: {
        initial: number,
        increment: number,
    },
    facetState: {
        rangeFacet: string,
        normalFacet: string,
    },
    display: {
        selectionCount: boolean,
    }
}

interface RangeValue {
    value: Date | string | number | boolean,
    valueLabel: string,
    key: string
}

interface RowObject {
    index: number,
    identity: powerbi.DataViewScopeIdentity,
    facet?: Date | string | number | boolean,
    facetInstance?: Date | string | number | boolean,
    count?: number,
    facetInstanceColor?: Date | string | number | boolean,
    iconClass?: Date | string | number | boolean,
    rangeValues?: RangeValue[],
    bucket?: Date | string | number | boolean,
}

interface DataPoint {
    rows: RowObject[],
    highlight: number,
    facetKey: string,
    facetLabel: string,
    instanceValue: string,
    instanceLabel: string,
    instanceCount: number,
    instanceCountFormatter: any,
    instanceColor: string,
    instanceIconClass: string,
    bucket?: any,
    rangeValues?: RangeValue[],
    isSelected?: boolean,
}

interface FacetGroup {
    label: string,
    key: string,
    facets: Facet[],
    total?: number,
    more?: any,

    order: number,
    collapsed: boolean,
    allFacets?: Facet[],
    isRange?: boolean,
};

interface Facet {
    icon: {
         class: string,
         color: string,
    },
    count: number,
    countLabel: string,
    value: string,
    label: string,
    segments?: { count: number, color: string}[],
};

interface AggregatedData {
    rangeDataMap: any,
    dataPointsMap: any,
}

interface AggregateDataPointsOptions {
    rangeFilter?: any,
    filters?: any,
    forEachDataPoint?: (dp: DataPoint) => void,
    ignore?: DataPoint[],
}

interface AggregateDataPointMapOptions {
    rangeFilter?: any,
    filters?: any,
    selectedInstances?: DataPoint[],
}

interface ConvertDataPointMapOptions {
    colors: powerbi.IColorInfo[],
    settings: FacetKeySettings,
    hasHighlight?: boolean,
    rangeFilter?: any,
}
