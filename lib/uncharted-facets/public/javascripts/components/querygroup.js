/*
 * *
 *  Copyright © 2015 Uncharted Software Inc.
 *
 *  Property of Uncharted™, formerly Oculus Info Inc.
 *  http://uncharted.software/
 *
 *  Released under the MIT License.
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of
 *  this software and associated documentation files (the "Software"), to deal in
 *  the Software without restriction, including without limitation the rights to
 *  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 *  of the Software, and to permit persons to whom the Software is furnished to do
 *  so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 * /
 */

var _ = require('../util/util');
var IBindable = require('./IBindable');
var Template = require('../templates/querygroup');
var FacetVertical = require('../components/facet/facetVertical');
var FacetHorizontal = require('../components/facet/facetHorizontal');
var Group = require('./group');
var Color = require('../util/color');

var DEFAULT_COLOR = '#8AAD20';
var COLOR_STEP = 0.2;

/**
 * Special group class used to represent the queries in the facets widget.
 *
 * @class QueryGroup
 * @param {jquery} container - The container where this group will be added.
 * @param {Array} queries - An array with the queries to be added to this group.
 * @constructor
 */
function QueryGroup(container, queries) {
	/* skip initializing the `Group` */
	IBindable.call(this);

	this._element = $(Template());

	container.append(this._element);

	this._facetContainer = this._element.find('.group-facet-container');

	// Initialize queries and facets
	this._facets = [];
	this._queries = [];
	this._total = 0;
	if (queries && queries.length > 0) {
		queries.forEach(function (query) {
			this.addQuery(query);
		}, this);
	}

	this._updateFacetTotals();

	if (this._queries.length === 0) {
		this.visible = false;
	}
}

/**
 * @inheritance {Group}
 */
QueryGroup.prototype = Object.create(Group.prototype);
QueryGroup.prototype.constructor = QueryGroup;

/**
 * A QueryGroup's key is always `queries`
 *
 * @property key
 * @type {string}
 * @readonly
 */
Object.defineProperty(QueryGroup.prototype, 'key', {
	get: function () {
		return "queries";
	}
});

/**
 * Makes sure that all facets in this group can be selected.
 *
 * @method initializeSelection
 */
QueryGroup.prototype.initializeSelection = function () {
	this._facets.forEach(function (facet) {
		// temporary exception until callers are able to calculated selected counts on simple queries
		if (facet.key !== '*') {
			facet.select(0);
		}
	});
};

/**
 * Deselects all facets in this group.
 *
 * @method clearSelection
 */
QueryGroup.prototype.clearSelection = function () {
	this._facets.forEach(function (facet) {
		facet.deselect();
	});
};

/**
 * Unhighlights all the queries in this group.
 *
 * @method unhighlightAll
 */
QueryGroup.prototype.unhighlightAll = function () {
	this._facets.forEach(function(facet) {
		facet.highlighted = false;
	}, this);
};

/**
 * Adds a query to this group.
 *
 * @method addQuery
 * @param {Object} query - An object describing the query to be added.
 * @param {boolean=} updateFacetTotals - Should the facet totals be updated once the query has been added to the group.
 */
QueryGroup.prototype.addQuery = function (query, updateFacetTotals) {
	this._queries.push(query);
	this._total += query.count;

	if (!query.icon) {
		query.icon = this._generateIcon();
	}
	if (!query.icon.color) {
		query.icon.color = this._generateColor();
	}
	query.hidden = true;

	// specify that this is a query for display
	query.isQuery = true;

	var FacetClass = ('histogram' in query) ? FacetHorizontal : FacetVertical;
	var facet = new FacetClass(this._facetContainer, this, query);
	this._facets.push(facet);
	facet.visible = true;
	/* forward all the events from this facet */
	this.forward(facet);

	if (updateFacetTotals) {
		this._updateFacetTotals();
	}
};

/**
 * Removes a query from this group.
 *
 * @param {*} key - The key of the query to remove.
 * @param {*} value - The value of the query to remove.
 * @param {boolean=} updateFacetTotals - Should the facet totals be updated once the query has been added to the group.
 */
QueryGroup.prototype.removeQuery = function (key, value, updateFacetTotals) {
	var facet = this._getQuery(key, value);
	if (facet) {
		var query = facet._spec;
		var queryIndex = this._queries.indexOf(query);
		var facetIndex = this._facets(facet);
		if (queryIndex >= 0 && facetIndex >= 0) {
			this._queries.splice(queryIndex, 1);
			this._facets.splice(facetIndex, 1);
			/* destroying a facet automatically unforwards its events */
			facet.destroy(true);

			this._total -= query.count;
			if (updateFacetTotals) {
				this._updateFacetTotals();
			}
		}
	}
};

/**
 * Sets this group to be garbage collected by removing all references to event handlers and DOM elements.
 * Calls `destroy` on its facets.
 *
 * @method destroy
 */
QueryGroup.prototype.destroy = function () {
	this._facets.forEach(function (f) {
		/* destroying a facet automatically unforwards its events */
		f.destroy();
	});
	this._facets = [];
	this._queries = [];
	this._element.remove();
	IBindable.prototype.destroy.call(this);
};

/**
 * Updates the total in all the facets contained in this group.
 *
 * @method _updateFacetTotals
 * @private
 */
QueryGroup.prototype._updateFacetTotals = function () {
	this._facets.forEach(function (facet) {
		facet.total = this._total;
	}, this);
};

/**
 * Gets the facet representing the query with the specified key and value.
 * Note: QueryGroup uses Facet internally to represent each query.
 *
 * @method _getQuery
 * @param {*} key - The key to look for.
 * @param {*} value - The value to look for.
 * @returns {Facet|null}
 */
QueryGroup.prototype._getQuery = function (key, value) {
	var facetObj = this._facets.filter(function (f) {
		return f.key === key && f.value === value;
	});
	if (facetObj && facetObj.length > 0) {
		return facetObj[0];
	} else {
		return null;
	}
};

/**
 * Generates an icon and color based on this group's current state.
 *
 * @method _generateIcon
 * @returns {{class: string, color}}
 * @private
 */
QueryGroup.prototype._generateIcon = function () {
	return {
		class: 'fa fa-search',          // TODO: Remove font-awesome dependency
		color: this._generateColor()
	};
};

/**
 * Genrates a color and returns it as a hex string.
 *
 * @method _generateColor
 * @returns {string}
 * @private
 */
QueryGroup.prototype._generateColor = function () {
	var startColor = this._facets.length > 0 ? new Color().hex(this._facets[0].icon.color) : new Color().hex(DEFAULT_COLOR);
	var position = this._facets.length;
	var iconColor = startColor.shade(position * COLOR_STEP);
	return iconColor.hex();
};

/**
 * @export
 * @type {QueryGroup}
 */
module.exports = QueryGroup;
