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

// Support for Bookmarks, including parsing the SQExpr we create
import ISelectionId = powerbi.extensibility.ISelectionId;
import SQExprBuilder = powerbi.data.SQExprBuilder;
import { safeKey } from './utils';

const SQ_ENTITY = SQExprBuilder.entity(undefined, undefined);
const SQ_KIND_AND = SQExprBuilder.and(SQ_ENTITY, SQ_ENTITY).kind;
const SQ_KIND_BETWEEN = SQExprBuilder.between(SQ_ENTITY, SQ_ENTITY, SQ_ENTITY).kind;
const SQ_KIND_OR = SQExprBuilder.or(SQ_ENTITY, SQ_ENTITY).kind;
const SQ_KIND_EQUAL = SQExprBuilder.equal(undefined, undefined).kind;

function parseBinarySQExprNode(facetsVisual, sqExprMap, node) {
    sqExprMap[node.left._kind](facetsVisual, sqExprMap, node.left);
    sqExprMap[node.right._kind](facetsVisual, sqExprMap, node.right);
}

function parseSQExprAndNode(facetsVisual, sqExprMap, node) {
    // There are three cases where FacetKey.applySelection generates AND nodes:
    // a) High level: Range filter AND Facet selection
    // b) Low level: Facet AND Instance
    // c) Low level: composing ranges
    switch (node.left._kind) {
        case SQ_KIND_EQUAL:
            // b) Low level: Facet AND Instance
            const facet = node.right.right.value;
            const instance = node.left.right.value;
            const key = safeKey(String(facet || ' '));
            const dataPoint = _.find(facetsVisual.data.aggregatedData.dataPointsMap[key],
                (dp: DataPoint) => dp.facetKey === key && dp.rows[0].facetInstance === instance);
            if (dataPoint) {
                facetsVisual.selectedInstances.push(dataPoint);
            }
            break;
        default:
            parseBinarySQExprNode(facetsVisual, sqExprMap, node);
    }
}

function parseSQExprBetweenNode(facetsVisual, sqExprMap, node) {
    facetsVisual.filter.range = facetsVisual.filter.range || {};

    const ref = node.arg.ref || node.arg.arg.ref;
    facetsVisual.filter.range[ref] = <FacetRangeObject>{
        // tslint:disable-next-line
        from: {
            index: undefined,
            label: [
                String(node.lower.value),
                String(node.lower.value),
            ],
            metadata: [{
                rangeValue: node.lower.value,
                isFirst: false,
                isLast: false,
            }, {
                rangeValue: node.lower.value,
                isFirst: false,
                isLast: false,
            }],
        },
        to: {
            index: undefined,
            label: [
                String(node.upper.value),
                String(node.upper.value),
            ],
            metadata: [{
                rangeValue: node.upper.value,
                isFirst: false,
                isLast: false,
            }, {
                rangeValue: node.upper.value,
                isFirst: false,
                isLast: false,
            }],
        },
    };
}

function passThroughSQExprNode(facetsVisual, sqExprMap, node) {
    sqExprMap[node._expr._kind](facetsVisual, sqExprMap, node._expr);
}


function getSQExprKindMap(facetsVisual) {
    if (!facetsVisual.sqExprTypeMap) {
        facetsVisual.sqExprTypeMap = {};
        facetsVisual.sqExprTypeMap[SQ_ENTITY.kind] = passThroughSQExprNode;
        facetsVisual.sqExprTypeMap[SQExprBuilder.columnRef(SQ_ENTITY, '').kind] = passThroughSQExprNode;
        facetsVisual.sqExprTypeMap[SQExprBuilder['subqueryRef']().kind] = passThroughSQExprNode;
        facetsVisual.sqExprTypeMap[SQ_KIND_AND] = parseSQExprAndNode;
        facetsVisual.sqExprTypeMap[SQ_KIND_OR] = parseBinarySQExprNode;
        facetsVisual.sqExprTypeMap[SQ_KIND_BETWEEN] = parseSQExprBetweenNode;
    }

    return facetsVisual.sqExprTypeMap;
}

/*
 * Parses an SQExpression to reverse engineer a bookmark, assuming it is a selection we sent to PowerBI at some point.
 */
function parseSQExpr(sqExpr, facetsVisual) {
    const sqExprKindMap = getSQExprKindMap(facetsVisual);
    sqExprKindMap[sqExpr.kind](facetsVisual, sqExprKindMap, sqExpr);
}

function compareValues(valueA, valueB) {
    const a = valueA.getTime ? valueA.getTime() : valueA;
    const b = valueB.getTime ? valueB.getTime() : valueB;
    return a === b;
}

export function bookmarkHandler(ids: ISelectionId[]) {
    this.bookmarkSelection = null;

    if (ids.length) {
        this.bookmarkSelection = ids[0]['selectorsByColumn'].dataMap[''][0];
    }

    loadSelectionFromBookmarks(this);
}

export function loadSelectionFromBookmarks(facetsVisual) {
    facetsVisual.clearFilters();
    facetsVisual.selectedInstances = [];

    if (facetsVisual.bookmarkSelection) {
        parseSQExpr(facetsVisual.bookmarkSelection, facetsVisual);
        const selection = {
            range: facetsVisual.filter && facetsVisual.filter.range,
            selectedInstances: facetsVisual.selectedInstances || [],
        };
        if (selection.range) {
            facetsVisual.filter = facetsVisual.filter || {};
            facetsVisual.filter.range = selection.range;
            const rangeFacets = facetsVisual.data.facetsData.filter((group: any) => group.isRange);
            rangeFacets.forEach((facetData: any) => {
                const range = selection.range[facetData.key];
                if (range) {
                    const group = facetsVisual.facets._getGroup(facetData.key);
                    const facet = group.facets.find(f => f.key === facetData.key);
                    if (facet) {
                        const bars = facet._histogram._bars;
                        range.from.index = bars.findIndex(bar => bar.metadata.find(datum =>
                            compareValues(datum.metadata.rangeValue, range.from.metadata[0].rangeValue)));
                        range.to.index = bars.findIndex(bar => bar.metadata.find(datum =>
                            compareValues(datum.metadata.rangeValue, range.to.metadata[0].rangeValue)));
                        facetData.facets[0].selection['range'] = {
                            from: range.from.index,
                            to: range.to.index,
                        };
                        group.replace(facetData);
                    }
                }
            });
        }

        if (facetsVisual.data.hasHighlight) {
            facetsVisual.facets.select(facetsVisual.data.facetsSelectionData);
        }
        facetsVisual.runWithNoAnimation(facetsVisual.updateFacetsSelection, facetsVisual, facetsVisual.selectedInstances);
    }
}