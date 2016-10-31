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
    rangeValues?: RangeValue[],
    isSelected?: boolean,
}

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

interface ConvertDataPointMapParams {
    hasHighlight: boolean,
    colors: powerbi.IColorInfo[],
    settings: FacetKeySettings,
    rangeFilter?: any,
}
