import { expect } from 'chai';
import { aggregateDataPointsMap, convertToDataPointsMap } from './data';

function plainFacetData() {
    return convertToDataPointsMap({
        metadata: {
            columns: [
                { displayName: 'Facet', roles: { facet: true }, type: { text: true } },
                { displayName: 'Instance', roles: { facetInstance: true }, type: { text: true } },
                { displayName: 'Count', roles: { count: true }, type: { numeric: true } },
            ],
        },
        categorical: { categories: [{}], values: [{}] },
        table: { rows: [['project', 'Atlas', 12], ['project', 'Beacon', 8]], identity: [] },
    } as any);
}

describe('browser preview regressions', () => {
    it('searches a dataset without range columns after an empty filter is restored', () => {
        const data = plainFacetData();
        const none = aggregateDataPointsMap(data, { range: {}, contains: 'no match', selectedDataPoints: [] });
        expect(Object.keys(none.dataPointsMap)).to.have.length(0);
        const matching = aggregateDataPointsMap(data, { range: {}, contains: 'Atlas', selectedDataPoints: [] });
        expect(matching.dataPointsMap.project).to.have.length(1);
        const cleared = aggregateDataPointsMap(data, { range: {}, contains: '', selectedDataPoints: [] });
        expect(cleared.dataPointsMap.project).to.have.length(2);
    });

    it('ignores cleared range entries but excludes missing values for an active range', () => {
        const data = plainFacetData();
        const cleared = aggregateDataPointsMap(data, { range: { amount: undefined } });
        expect(cleared.dataPointsMap.project).to.have.length(2);
        const filtered = aggregateDataPointsMap(data, { range: {
            amount: {
                from: { metadata: [{ rangeValue: 1, isFirst: false, isLast: false }] },
                to: { metadata: [{ rangeValue: 10, isFirst: false, isLast: false }] },
            },
        } });
        expect(Object.keys(filtered.dataPointsMap)).to.have.length(0);
    });
});
