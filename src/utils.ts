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

import DataView = powerbi.DataView;
import * as _ from 'lodash';

export const COLOR_PALETTE = ['#FF001F', '#FF8000', '#AC8000', '#95AF00', '#1BBB6A', '#B44AE7', '#DB00B0'];
export const HIGHLIGHT_COLOR = '#00c6e1';

function roundToNearestTen(num: number) {
    return num <= 10 ? num : (Math.floor(num * 0.1) * 10);
}

/**
 * Converts from RGB color space to HSL color space.
 *
 * @method toHSL
 * @param {Array} rgb - An array containing the RGB components.
 * @returns {Array}
 */
function toHSL(rgb) {
    const [r, g, b] = rgb.map(n => n / 255);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    let h;
    let s;
    let l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}


/**
 * Converts the hex color code to the equivalent rgba color code
 */
export function hexToRgba(hex: string, opacity: number = 100) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

/**
 * converts hex or rgba color to hsl color
 */
export function convertToHSL(colorString: string) {
    const rgba = colorString.indexOf('#') >= 0 ? hexToRgba(colorString) : colorString;
    const [r, g, b] = rgba.substring(rgba.indexOf('(') + 1, rgba.indexOf(')')).split(',').map(n => Number(n));
    return toHSL([r, g, b]);
}

/**
 * Finds and return the the column that matches the given data role name
 */
export function findColumn(dataView: DataView, dataRoleName: string, multi?: boolean): any {
    const columns = dataView.metadata.columns;
    const result = _[multi ? 'filter' : 'find'](columns || [], (col: any) => col && col.roles[dataRoleName]);
    return multi
        ? (result.length > 0 ? result : undefined)
        : result;
}

/**
 * Returns a hsl color string based on the given color, opacity, index, total number of segments, and boolean indicating it's highlight or not
 */
export function getSegmentColor(baseColor: string, opacity: number = 100, segmentIndex: number, totalNumSegments: number, isHighlight: boolean): string {
    const h = convertToHSL(baseColor)[0] * 360;
    const [s, minL, maxL] = isHighlight
        ? [100, 50, 90]
        : [25, 30, 90];
    const range = maxL - minL;
    const n = range / totalNumSegments;
    const l = minL + (n * segmentIndex);
    return `hsla(${h}, ${s}%, ${l}%, ${opacity / 100})`;
}

/**
 * Creates a facet bar segments data from the bucket data with given color
 */
export function createSegments(bucket: any, mainColor: string, isHighlight: boolean, opacity: number = 100, useHighlightColor?: boolean) {
    const countType = isHighlight ? 'highlight' : 'instanceCount';
    return _.sortBy(Object.keys(bucket), (key: string) => {
        const parsedDate = Date.parse(key);
        return !isNaN(<any>key) ? Number(key) : (isNaN(parsedDate) ? key : parsedDate);
    })
    .map((key, index, array) => ({
        count: bucket[key][countType],
        color: getSegmentColor(mainColor, opacity, index, array.length, useHighlightColor || isHighlight)
    }));
}

/**
 * Creates a label displaying remaining number of facets for a facet group.
 */
export function otherLabelTemplate(remaining: number) {
    return `Other (${roundToNearestTen(remaining)}${remaining < 10 || !(remaining % 10) ? '' : '+'})`;
}
