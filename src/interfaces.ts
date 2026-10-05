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

// Explicit modern powerbi-visuals-api import. This file is a module (has imports/exports),
// so the `declare global` block below augments the ambient global scope for the whole
// program without requiring every consumer to import these shared shape types individually.
import powerbi from 'powerbi-visuals-api';

/**
 * Color value returned by the public host's colorPalette.getColor() API.
 */
export interface ColorInfo {
    value: string;
}

declare global {
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
        identity: powerbi.visuals.CustomVisualOpaqueIdentity;
        facet?: Date | string | number | boolean;
        facetInstance?: Date | string | number | boolean;
        count?: number;
        facetInstanceColor?: Date | string | number | boolean;
        iconClass?: Date | string | number | boolean;
        rangeValues?: RangeValue[];
        bucket?: Date | string | number | boolean;
        sparklineData?: Date | string | number | boolean;
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
        sparklineData?: any;
        rangeValues?: RangeValue[];
        selectionColor?: { color: string, opacity: number };
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
        selectedDataPoints: DataPoint[];
        hasHighlight: boolean;
        sparklineXDomain: Date[] | string[] | number[] | boolean[];
    }

    interface RangeMetadata {
        rangeValue: Date | string | number | boolean;
        isFirst: boolean;
        isLast: boolean;
    }

    interface FacetRangeObject {
        from: {
            index?: number,
            metadata: RangeMetadata[],
        };
        to: {
            index?: number,
            metadata: RangeMetadata[],
        };
    }

    interface RangeFilter {
        [rangeKey: string]: FacetRangeObject;
    }

    interface DataPointsFilter {
        contains?: string;
        range?: RangeFilter;
        selectedDataPoints?: DataPoint[];
    }

    interface ConvertToFacetsVisualDataOptions {
        colors: import('./interfaces').ColorInfo[];
        settings: FacetKeySettings;
        hasHighlight?: boolean;
        selectedRange?: RangeFilter;
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
        timeseries?: any[];
        segments?: { count: number; color: string }[];
    }

    interface FacetsVisualData {
        dataPointsMapData?: DataPointsMapData;
        aggregatedData: AggregatedData;
        hasHighlight: boolean;
        facetsData: FacetGroup[];
        facetsSelectionData: any[];
        selectedDataPoints: DataPoint[];
    }
}
