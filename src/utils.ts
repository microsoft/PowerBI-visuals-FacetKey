import DataView = powerbi.DataView;
import * as _ from 'lodash';

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
 * Convert the hex color code to the equivalent rgba color code
 */
export function convertHex(hex: string, opacity: number = 100) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

/**
 * convert hex or rgba color to hsl color
 */
export function convertToHSL(colorString: string) {
    const rgba = colorString.indexOf('#') >= 0 ? convertHex(colorString) : colorString;
    const [r, g, b] = rgba.substring(rgba.indexOf('(') + 1, rgba.indexOf(')')).split(',').map(n => Number(n));
    return toHSL([r, g, b]);
}

/**
 * Find and return the the column that matches the given data role name
 */
export function findColumn(dataView: DataView, dataRoleName: string, multi?: boolean): any {
    const columns = dataView.metadata.columns;
    const result = _[multi ? 'filter' : 'find'](columns || [], (col: any) => col && col.roles[dataRoleName]);
    return multi
        ? (result.length > 0 ? result : undefined)
        : result;
}

/**
 * Return a hsl color string based on the given color, opacity, index, total number of segments, and boolean indicating it's highlight or not
 */
export function getSegmentColor(baseColor: string, opacity: number, segmentIndex: number, totalNumSegments:number, isHighlight: boolean): string {
    const h = convertToHSL(baseColor)[0] * 360;
    const [s, minL, maxL] = isHighlight
        ? [100, 50, 90]
        : [25, 30, 90];
    const range = maxL - minL;
    const n = range / totalNumSegments;
    const l = minL + (n * segmentIndex);
    return `hsla(${h}, ${s}%, ${l}%, ${opacity / 100})`;
};


export function otherLabelTemplate(remaining: number) {
    return `Other (${roundToNearestTen(remaining)}${remaining < 10 || !(remaining % 10) ? '' : '+'})`;
}
