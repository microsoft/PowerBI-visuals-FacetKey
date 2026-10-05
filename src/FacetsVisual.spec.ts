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
import powerbi from 'powerbi-visuals-api';
import $ from 'jquery';
import FacetsVisual from './FacetsVisual';

// NOTE: these are mocked-host integration tests exercising the real Facets DOM widget
// (lib/@uncharted.software/stories-facets) against a hand-built public-API host double. They are
// NOT a substitute for validating this visual inside an actual Power BI host (bookmarks,
// cross-filter replay with a real selection manager, formatting-pane round trips, etc. can only
// be fully verified there).
describe('FacetsVisual (mocked host integration)', () => {
    let element: JQuery;
    let host: any;
    let selectionManagerSpies: any;
    let registeredSelectCallback: (ids: any[]) => void;
    let selectionIdRegistry: { [key: string]: any };

    function makeSelectionId(index: number) {
        const key = `row:${index}`;
        if (!selectionIdRegistry[key]) {
            selectionIdRegistry[key] = {
                getKey: () => key,
                equals: (other: any) => other && other.getKey && other.getKey() === key,
                getSelector: () => ({}),
                getSelectorsByColumn: () => ({}),
                hasIdentity: () => true,
            };
        }
        return selectionIdRegistry[key];
    }

    function buildHost() {
        selectionIdRegistry = {};
        let currentSelectionIds: any[] = [];
        selectionManagerSpies = {
            select: sinon.spy((ids: any[]) => { currentSelectionIds = Array.isArray(ids) ? ids : [ids]; return Promise.resolve(currentSelectionIds); }),
            clear: sinon.spy(() => { currentSelectionIds = []; return Promise.resolve([]); }),
            getSelectionIds: sinon.spy(() => currentSelectionIds),
        };
        return {
            colorPalette: { getColor: (key: string) => ({ value: '#' + key }) },
            createSelectionManager: () => ({
                select: selectionManagerSpies.select,
                clear: selectionManagerSpies.clear,
                hasSelection: () => currentSelectionIds.length > 0,
                getSelectionIds: selectionManagerSpies.getSelectionIds,
                registerOnSelectCallback: (cb: (ids: any[]) => void) => { registeredSelectCallback = cb; },
            }),
            createSelectionIdBuilder: () => {
                let rowIndex: number;
                const builder = {
                    withTable: (table: any, index: number) => { rowIndex = index; return builder; },
                    createSelectionId: () => makeSelectionId(rowIndex),
                };
                return builder;
            },
            persistProperties: sinon.spy(),
            applyJsonFilter: sinon.spy(),
            fetchMoreData: sinon.spy(() => false),
        };
    }

    function buildColumn(displayName: string, roles: any, extra: any = {}) {
        return { displayName, roles, format: '', type: extra.type || { text: true }, queryName: extra.queryName };
    }

    function buildDataView(rows: any[][], extraColumns: any[] = [], objects?: any) {
        const columns = [
            buildColumn('facet', { facet: true }),
            buildColumn('facet_instance', { facetInstance: true }),
            buildColumn('count', { count: true }, { type: { numeric: true, integer: true } }),
            ...extraColumns,
        ];
        return <any>{
            metadata: { columns, objects },
            categorical: { categories: [{}], values: [{}] },
            table: {
                rows,
                identity: rows.map((_, i) => `id${i}`),
            },
        };
    }

    function buildOptions(dataView: any, overrides: any = {}) {
        return <any>{
            dataViews: dataView ? [dataView] : [],
            type: powerbi.VisualUpdateType.Data,
            operationKind: powerbi.VisualDataChangeOperationKind.Create,
            viewport: { width: 400, height: 400 },
            ...overrides,
        };
    }

    let visual: FacetsVisual;

    beforeEach(() => {
        element = $('<div></div>').appendTo(document.body);
        host = buildHost();
        visual = new FacetsVisual(<any>{ element: element.get(0), host });
    });

    afterEach(() => {
        if (visual && !(<any>visual).destroyed) { visual.destroy(); }
        element.remove();
    });

    describe('construction', () => {
        it('mounts a facets container with a search box into the provided element', () => {
            expect(element.find('.facets-container').length).to.equal(1);
            expect(element.find('.search-box').length).to.equal(1);
        });

        it('registers exactly one onSelect callback with the public selection manager', () => {
            expect(registeredSelectCallback).to.be.a('function');
        });
    });

    describe('update: no data / missing required columns', () => {
        it('does nothing when dataViews is empty', () => {
            expect(() => visual.update(buildOptions(null))).to.not.throw();
            expect((<any>visual).data).to.be.undefined;
        });

        it('clears the rendered facets when required columns (count/facetInstance) are missing', () => {
            const dv = <any>{ metadata: { columns: [buildColumn('facet', { facet: true })] }, categorical: {}, table: { rows: [] } };
            expect(() => visual.update(buildOptions(dv))).to.not.throw();
            expect((<any>visual).facets._groups).to.have.length(0);
        });
    });

    describe('update: rendering + multi-row deduped selection', () => {
        it('renders facet groups from table rows', () => {
            const dv = buildDataView([
                ['organization', 'Wand', 2],
                ['location', 'California', 1],
            ]);
            visual.update(buildOptions(dv));
            const keys = (<any>visual).facets._groups.map((g: any) => g.key);
            expect(keys).to.include('organization');
            expect(keys).to.include('location');
            expect(element.find('.facets-container').children().length).to.be.greaterThan(0);
        });

        it('selects every underlying row for a facet instance (deduped), OR-ing multiple selections', () => {
            // Two rows aggregate into a single "Wand" data point for 'organization'.
            const dv = buildDataView([
                ['organization', 'Wand', 2],
                ['organization', 'Wand', 3],
                ['location', 'California', 1],
            ]);
            visual.update(buildOptions(dv));

            const orgKey = 'organization';
            const orgValue = (<any>visual).data.aggregatedData.dataPointsMap[orgKey][0].instanceValue;
            (<any>visual).toggleFacetSelection(orgKey, orgValue);

            expect(selectionManagerSpies.select.calledOnce).to.be.true;
            const idsArg = selectionManagerSpies.select.firstCall.args[0];
            expect(idsArg).to.have.length(2); // rows 0 and 1, deduped identity per row
            expect(selectionManagerSpies.select.firstCall.args[1]).to.equal(false);

            // Selecting a second facet instance ORs into the selection (adds its rows too).
            const locKey = 'location';
            const locValue = (<any>visual).data.aggregatedData.dataPointsMap[locKey][0].instanceValue;
            (<any>visual).toggleFacetSelection(locKey, locValue);
            expect(selectionManagerSpies.select.secondCall.args[0]).to.have.length(3);

            // Deselecting all facets clears selection via the public selectionManager.
            (<any>visual).toggleFacetSelection(orgKey, orgValue);
            (<any>visual).toggleFacetSelection(locKey, locValue);
            expect(selectionManagerSpies.clear.called).to.be.true;
        });
    });

    describe('range filter: merge / remove via applyJsonFilter', () => {
        it('merges an inclusive AdvancedFilter when a range is set, and removes it when cleared', () => {
            const rangeColumn = buildColumn('amount', { rangeValue: true }, { type: { numeric: true }, queryName: 'Table1.Amount' });
            const dv = buildDataView([
                ['organization', 'Wand', 2, 10],
                ['organization', 'Wand2', 3, 20],
            ], [rangeColumn]);
            visual.update(buildOptions(dv));

            (<any>visual).filter.range = { amount: { from: { metadata: [{ rangeValue: 10 }] }, to: { metadata: [{ rangeValue: 20 }] } } };
            (<any>visual).applySelection([]);

            expect(host.applyJsonFilter.called).to.be.true;
            const mergeCall = host.applyJsonFilter.lastCall;
            expect(mergeCall.args[1]).to.equal('general');
            expect(mergeCall.args[2]).to.equal('filter');
            expect(mergeCall.args[3]).to.equal(powerbi.FilterAction.merge);
            const filters = mergeCall.args[0];
            expect(filters).to.have.length(1);
            expect(filters[0].target).to.deep.equal({ table: 'Table1', column: 'Amount' });
            expect(filters[0].conditions).to.deep.equal([
                { operator: 'GreaterThanOrEqual', value: 10 },
                { operator: 'LessThanOrEqual', value: 20 },
            ]);

            (<any>visual).filter.range = {};
            (<any>visual).applySelection([]);
            const removeCall = host.applyJsonFilter.lastCall;
            expect(removeCall.args[0]).to.be.null;
            expect(removeCall.args[3]).to.equal(powerbi.FilterAction.remove);
        });
    });

    describe('bookmark replay', () => {
        it('restores selection from the public onSelect callback with no prior in-memory state', () => {
            const dv = buildDataView([
                ['organization', 'Wand', 2],
                ['location', 'California', 1],
            ]);
            visual.update(buildOptions(dv));

            const orgValue = (<any>visual).data.aggregatedData.dataPointsMap['organization'][0].instanceValue;
            (<any>visual).toggleFacetSelection('organization', orgValue);
            expect(selectionManagerSpies.select.calledOnce).to.be.true;

            // Simulate PowerBI replaying a bookmarked selection via the public
            // registerOnSelectCallback surface, with no prior in-memory selection state.
            (<any>visual).selectedInstances = [];
            registeredSelectCallback([makeSelectionId(0)]);

            expect((<any>visual).selectedInstances).to.have.length(1);
            expect((<any>visual).selectedInstances[0].facetKey).to.equal('organization');
        });
    });

    describe('persisted settings / formatting model', () => {
        it('clamps malformed persisted facetCount values instead of blanking the visual', () => {
            const dv = buildDataView([
                ['organization', 'Wand', 2],
                ['organization', 'Wand2', 3],
            ], [], { facetCount: { initial: 'nonsense', increment: 'nonsense' } });
            visual.update(buildOptions(dv));

            expect((<any>visual).settings.facetCount.initial).to.equal(4);
            expect((<any>visual).settings.facetCount.increment).to.equal(50);
            expect((<any>visual).data.facetsData.length).to.be.greaterThan(0);
        });

        it('builds a formatting model reflecting current settings', () => {
            const dv = buildDataView([['organization', 'Wand', 2]], [], { display: { selectionCount: true } });
            visual.update(buildOptions(dv));
            const model = visual.getFormattingModel();
            expect(model.cards).to.have.length(2);
        });
    });

    describe('fetchMoreData', () => {
        it('invokes host.fetchMoreData(true) when the host reports more data is available', () => {
            const dv = buildDataView([['organization', 'Wand', 2]]);
            dv.metadata.segment = {};
            visual.update(buildOptions(dv));
            expect(host.fetchMoreData.called).to.be.true;
            expect(host.fetchMoreData.firstCall.args[0]).to.equal(true);
        });
    });

    describe('resize vs data updates', () => {
        it('a resize-only update redraws without re-running the data conversion pipeline', () => {
            const dv = buildDataView([['organization', 'Wand', 2]]);
            visual.update(buildOptions(dv));
            const converterSpy = sinon.spy(visual, 'converter');
            visual.update(buildOptions(dv, { type: powerbi.VisualUpdateType.Resize, dataViews: [dv] }));
            expect(converterSpy.called).to.be.false;
            converterSpy.restore();
        });

        it('a combined Resize+Data update still re-runs the data conversion pipeline', () => {
            const dv = buildDataView([['organization', 'Wand', 2]]);
            visual.update(buildOptions(dv));
            const converterSpy = sinon.spy(visual, 'converter');
            visual.update(buildOptions(dv, { type: powerbi.VisualUpdateType.Resize | powerbi.VisualUpdateType.Data }));
            expect(converterSpy.called).to.be.true;
            converterSpy.restore();
        });
    });

    describe('destroy', () => {
        it('tears down the DOM and is idempotent', () => {
            const dv = buildDataView([['organization', 'Wand', 2]]);
            visual.update(buildOptions(dv));
            expect(() => visual.destroy()).to.not.throw();
            expect(element.find('.facets-container').children().length).to.equal(0);
            expect(() => visual.destroy()).to.not.throw();
        });

        it('ignores update() calls after destroy without throwing', () => {
            const dv = buildDataView([['organization', 'Wand', 2]]);
            visual.update(buildOptions(dv));
            visual.destroy();
            expect(() => visual.update(buildOptions(dv))).to.not.throw();
        });

        it('ignores a late selection-manager callback after destroy without throwing', () => {
            const dv = buildDataView([['organization', 'Wand', 2]]);
            visual.update(buildOptions(dv));
            visual.destroy();
            expect(() => registeredSelectCallback([makeSelectionId(0)])).to.not.throw();
        });
    });
});
