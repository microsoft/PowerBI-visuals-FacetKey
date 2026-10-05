/**
 * Copyright (c) 2018 Uncharted Software Inc.
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

import { expect } from 'chai';
import * as sinon from 'sinon';
import { loadSelectionFromSelectionIds, restoreRangeFilterFromJsonFilters } from './bookmarks';

describe('bookmarks', () => {

    function buildDataViewColumn(displayName: string, queryName: string, dateTime: boolean = false) {
        return { displayName, queryName, format: '', type: dateTime ? { dateTime: true } : { numeric: true }, roles: { rangeValue: true } };
    }

    function buildFacetsVisual(overrides: any = {}) {
        const dataPointsMap: any = {
            organization: [
                { facetKey: 'organization', instanceValue: 'Wand0', rows: [{ index: 0 }, { index: 1 }] },
            ],
            location: [
                { facetKey: 'location', instanceValue: 'California2', rows: [{ index: 2 }] },
            ],
        };
        const idRegistry: { [k: string]: any } = {};
        const makeId = (index: number) => {
            const key = `row:${index}`;
            if (!idRegistry[key]) {
                idRegistry[key] = { getKey: () => key };
            }
            return idRegistry[key];
        };

        const facetsVisual: any = {
            destroyed: false,
            host: {
                createSelectionIdBuilder: () => {
                    let rowIndex: number;
                    const builder = {
                        withTable: (table: any, index: number) => { rowIndex = index; return builder; },
                        createSelectionId: () => makeId(rowIndex),
                    };
                    return builder;
                },
            },
            dataView: { table: { rows: [[], [], []] } },
            data: {
                aggregatedData: { dataPointsMap },
                facetsData: [],
                hasHighlight: false,
                facetsSelectionData: [],
            },
            facets: { select: sinon.spy(), getGroup: sinon.stub().returns(undefined) },
            selectedInstances: [],
            filter: {},
            runWithNoAnimation: (fn: any, ctx: any, ...args: any[]) => fn.call(ctx, ...args),
            updateFacetsSelection: sinon.spy(),
            ...overrides,
        };
        return { facetsVisual, makeId };
    }

    describe('loadSelectionFromSelectionIds', () => {
        it('reconstructs selectedInstances from public selection ids, matching by row identity', () => {
            const { facetsVisual, makeId } = buildFacetsVisual();
            loadSelectionFromSelectionIds(facetsVisual, [makeId(0)]);
            expect(facetsVisual.selectedInstances).to.have.length(1);
            expect(facetsVisual.selectedInstances[0].facetKey).to.equal('organization');
        });

        it('dedupes rows: a dp with 2 underlying rows is selected once even if both row ids are passed', () => {
            const { facetsVisual, makeId } = buildFacetsVisual();
            loadSelectionFromSelectionIds(facetsVisual, [makeId(0), makeId(1), makeId(0)]);
            expect(facetsVisual.selectedInstances).to.have.length(1);
        });

        it('clears selectedInstances when given an empty id list', () => {
            const { facetsVisual } = buildFacetsVisual({ selectedInstances: ['stale'] });
            loadSelectionFromSelectionIds(facetsVisual, []);
            expect(facetsVisual.selectedInstances).to.deep.equal([]);
        });

        it('does not throw and no-ops when the visual has been destroyed', () => {
            const { facetsVisual } = buildFacetsVisual({ destroyed: true, selectedInstances: ['stale'] });
            expect(() => loadSelectionFromSelectionIds(facetsVisual, [])).to.not.throw();
            expect(facetsVisual.selectedInstances).to.deep.equal(['stale']);
        });

        it('does not throw and no-ops when facets widget is missing (post-destroy callback race)', () => {
            const { facetsVisual } = buildFacetsVisual({ facets: null });
            expect(() => loadSelectionFromSelectionIds(facetsVisual, [])).to.not.throw();
        });

        it('does not crash and still updates selection when data is unset (first callback before any update)', () => {
            const { facetsVisual } = buildFacetsVisual({ data: undefined });
            expect(() => loadSelectionFromSelectionIds(facetsVisual, [])).to.not.throw();
            expect(facetsVisual.selectedInstances).to.deep.equal([]);
        });
    });

    describe('restoreRangeFilterFromJsonFilters', () => {
        function buildRangeFacetsVisual(histogramValues: any[]) {
            const replace = sinon.spy();
            const facetData: any = {
                key: 'created',
                isRange: true,
                facets: [{ selection: {} }],
            };
            const group = {
                facets: [{ key: 'created', _histogram: { _bars: histogramValues.map((v) => ({ metadata: [{ metadata: { rangeValue: v } }] })) } }],
                replace,
            };
            const facetsVisual: any = {
                dataView: {
                    metadata: {
                        columns: [buildDataViewColumn('created', 'Table1.Created', true)],
                    },
                },
                filter: {},
                data: { facetsData: [facetData] },
                facets: { getGroup: () => group },
            };
            return { facetsVisual, facetData, replace };
        }

        it('normalizes ISO-string date condition values against real Date rangeValues and sets the UI selection range', () => {
            const d1 = new Date('2016-01-01');
            const d2 = new Date('2016-01-03');
            const { facetsVisual, facetData, replace } = buildRangeFacetsVisual([d1, new Date('2016-01-02'), d2]);

            restoreRangeFilterFromJsonFilters(facetsVisual, [{
                target: { table: 'Table1', column: 'Created' },
                logicalOperator: 'And',
                conditions: [
                    { operator: 'GreaterThanOrEqual', value: d1.toISOString() },
                    { operator: 'LessThanOrEqual', value: d2.toISOString() },
                ],
            }]);

            expect(facetsVisual.filter.range['created']).to.exist;
            expect(facetData.facets[0].selection['range']).to.deep.equal({ from: 0, to: 2 });
            expect(replace.calledOnce).to.be.true;
        });

        it('clears a previously-restored range and resets the UI selection when jsonFilters becomes empty', () => {
            const d1 = new Date('2016-01-01');
            const d2 = new Date('2016-01-03');
            const { facetsVisual, facetData, replace } = buildRangeFacetsVisual([d1, d2]);
            const jsonFilter = {
                target: { table: 'Table1', column: 'Created' },
                logicalOperator: 'And',
                conditions: [
                    { operator: 'GreaterThanOrEqual', value: d1.toISOString() },
                    { operator: 'LessThanOrEqual', value: d2.toISOString() },
                ],
            };

            restoreRangeFilterFromJsonFilters(facetsVisual, [jsonFilter]);
            expect(facetData.facets[0].selection['range']).to.deep.equal({ from: 0, to: 1 });

            replace.resetHistory();
            restoreRangeFilterFromJsonFilters(facetsVisual, []);
            expect(facetsVisual.filter.range).to.deep.equal({});
            expect(facetData.facets[0].selection['range']).to.be.undefined;
            expect(replace.calledOnce).to.be.true;
        });

        it('ignores a malformed filter (wrong logicalOperator) without throwing or applying a range', () => {
            const { facetsVisual, facetData } = buildRangeFacetsVisual([new Date('2016-01-01'), new Date('2016-01-03')]);
            expect(() => restoreRangeFilterFromJsonFilters(facetsVisual, [{
                target: { table: 'Table1', column: 'Created' },
                logicalOperator: 'Or',
                conditions: [
                    { operator: 'GreaterThanOrEqual', value: '2016-01-01T00:00:00.000Z' },
                    { operator: 'LessThanOrEqual', value: '2016-01-03T00:00:00.000Z' },
                ],
            }])).to.not.throw();
            expect(facetsVisual.filter.range).to.deep.equal({});
            expect(facetData.facets[0].selection['range']).to.be.undefined;
        });

        it('ignores a filter targeting a column with no matching public queryName, without using private column.expr', () => {
            const { facetsVisual } = buildRangeFacetsVisual([new Date('2016-01-01'), new Date('2016-01-03')]);
            expect(() => restoreRangeFilterFromJsonFilters(facetsVisual, [{
                target: { table: 'Table1', column: 'Unknown' },
                logicalOperator: 'And',
                conditions: [
                    { operator: 'GreaterThanOrEqual', value: '2016-01-01T00:00:00.000Z' },
                    { operator: 'LessThanOrEqual', value: '2016-01-03T00:00:00.000Z' },
                ],
            }])).to.not.throw();
            expect(facetsVisual.filter.range).to.deep.equal({});
        });
    });
});
