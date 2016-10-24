import DataView = powerbi.DataView;
import * as _ from 'lodash';

function roundToNearestTen(num: number) {
    return num <= 10 ? num : (Math.floor(num * 0.1) * 10);
}

/**
 * Convert the hex color code to the equivalent rgba color code
 */
export function convertHex(hex: string, opacity: number) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
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

export function otherLabelTemplate(remaining: number) {
    return `Other (${roundToNearestTen(remaining)}${remaining < 10 || !(remaining % 10) ? '' : '+'})`;
}
