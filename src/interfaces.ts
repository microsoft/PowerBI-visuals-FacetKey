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

interface FacetKeySettings {
    facetCount: {
        initial: number,
        increment: number,
    };
    facetState: {
        rangeFacet: string,
        normalFacet: string,
    };
    display: {
        selectionCount: boolean,
    };
}

interface RangeValue {
    value: Date | string | number | boolean;
    valueLabel: string;
    key: string;
}

interface RowObject {
    index: number;
    identity: powerbi.DataViewScopeIdentity;
    facet?: Date | string | number | boolean;
    facetInstance?: Date | string | number | boolean;
    count?: number;
    facetInstanceColor?: Date | string | number | boolean;
    iconClass?: Date | string | number | boolean;
    rangeValues?: RangeValue[];
    bucket?: Date | string | number | boolean;
}

interface DataPoint {
    rows: RowObject[];
    highlight: number;
    facetKey: string;
    facetLabel: string;
    instanceValue: string;
    instanceLabel: string;
    instanceCount: number;
    instanceCountFormatter: any;
    instanceColor: string;
    instanceIconClass: string;
    bucket?: any;
    rangeValues?: RangeValue[];
    isSelected?: boolean;
}

interface DataPointsMap {
    [facetKey: string]: DataPoint[];
}

interface DataPointsMapData {
    dataPointsMap: DataPointsMap;
    hasHighlight: boolean;
}

interface AggregatedData {
    rangeDataMap: any;
    dataPointsMap: DataPointsMap;
    hasHighlight: boolean;
}

interface DataPointsFilter {
    contains?: string;
    range?: any;
    ignore?: DataPoint[];
}

interface AggregateDataPointsOptions {
    forEachDataPoint?: (dp: DataPoint) => void;
    filter?: DataPointsFilter;
}

interface ConvertToFacetsVisualDataOptions {
    colors: powerbi.IColorInfo[];
    settings: FacetKeySettings;
    hasHighlight?: boolean;
    selectedRange?: any;
}

interface FacetGroup {
    label: string;
    key: string;
    facets: Facet[];
    total?: number;
    more?: any;

    order: number;
    collapsed: boolean;
    allFacets?: Facet[];
    isRange?: boolean;
}

interface Facet {
    icon: {
         class: string,
         color: string,
    };
    count: number;
    countLabel: string;
    value: string;
    label: string;
    segments?: { count: number; color: string}[];
}

interface FacetsVisualData {
    dataPointsMap?: DataPointsMap;
    aggregatedData: AggregatedData;
    hasHighlight: boolean;
    facetsData: FacetGroup[];
    facetsSelectionData: any[];
    selectedDataPoints: DataPoint[];
}
