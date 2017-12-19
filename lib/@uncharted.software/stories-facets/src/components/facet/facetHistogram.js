/*
 * Copyright 2017 Uncharted Software Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var FacetBar = require('./facetHistogramBar');

/**
 * This class creates a histogram in the given `svgContainer` using the data provided in the `spec`
 *
 * @class FacetHistogram
 * @param {element} svgContainer - SVG element where the histogram should be created (can be an SVG group)
 * @param {Object} spec - Object describing the histogram to be created.
 * @constructor
 */
function FacetHistogram (svgContainer, spec) {
	this._svg = svgContainer;
	this._spec = spec;
	this._totalWidth = 0;
	this._barWidth = 0;
	this._minBarWidth = ('minBarWidth' in spec) ? spec.minBarWidth : 3;
	this._maxBarWidth = ('maxBarWidth' in spec) ? spec.maxBarWidth : Number.MAX_VALUE;
	this._barPadding = ('barPadding' in spec) ? spec.barPadding : 1;
	this._scaleFn = $.isFunction(spec.scaleFn) ? spec.scaleFn : false;
	this._bars = [];
	this._maxBarHeight = 0;

	this.initializeSlices(svgContainer, spec.slices);
}

/**
 * The total width of the histogram.
 *
 * @property totalWidth
 * @type {Number}
 * @readonly
 */
Object.defineProperty(FacetHistogram.prototype, 'totalWidth', {
	get: function () {
		return this._totalWidth;
	}
});

/**
 * The width of each individual bar in the histogram.
 *
 * @property barWidth
 * @type {Number}
 * @readonly
 */
Object.defineProperty(FacetHistogram.prototype, 'barWidth', {
	get: function () {
		return this._barWidth;
	}
});

/**
 * The amount of padding used between bars in the histogram.
 *
 * @property barPadding
 * @type {Number}
 * @readonly
 */
Object.defineProperty(FacetHistogram.prototype, 'barPadding', {
	get: function () {
		return this._barPadding;
	}
});

/**
 * The internal array containing the bars in this histogram.
 *
 * @property bars
 * @type {Array}
 * @readonly
 */
Object.defineProperty(FacetHistogram.prototype, 'bars', {
	get: function () {
		return this._bars;
	}
});

/**
 * Initializes the slices (bars/buckets) of this histogram and saves them to the `_bars` array.
 *
 * @method initializeSlices
 * @param {element} svg - The SVG element where the slices should be created.
 * @param {Array} slices - An array containing the slices to be created.
 */
FacetHistogram.prototype.initializeSlices = function(svg, slices) {
	var svgWidth = svg.width();
	var svgHeight = svg.height();

	var minBarWidth = this._minBarWidth;
	var maxBarWidth = this._maxBarWidth;
	var barPadding = this._barPadding;
	var x = 0;
	var barsLength = slices.length;

	var maxBarsNumber = Math.floor(svgWidth / (minBarWidth + barPadding));
	var stackedBarsNumber = Math.ceil(barsLength / maxBarsNumber);
	var barsToCreate = Math.ceil(barsLength / stackedBarsNumber);

	var barWidth = Math.floor((svgWidth - ((barsToCreate - 1) * barPadding)) / barsToCreate);
	barWidth = Math.max(barWidth, minBarWidth);
	barWidth = Math.min(barWidth, maxBarWidth);
	this._barWidth = barWidth;

	var yMax = 0;
	for (var i = 0; i < barsLength; i += stackedBarsNumber) {
		var metadata = [];
		var count = 0;
		for (var ii = 0; ii < stackedBarsNumber && (i + ii) < barsLength; ++ii) {
			var slice = slices[i + ii];
			slice.toLabel = slice.toLabel || slice.label;
			count += slice.count;
			metadata.push(slice);
		}

		if(this._scaleFn) {
			count = this._scaleFn(count);
		}

		yMax = Math.max(yMax, count);
		var bar = new FacetBar(svg, x, barWidth, 0, svgHeight);
		bar.highlighted = false;
		bar.metadata = metadata;
		this._bars.push(bar);
		x += barWidth + barPadding;
	}

	//Set the bar heights using the computed max y value
	for (var j = 0; j < this._bars.length; j++) {
		var metaDataArr = this._bars[j].metadata;
		var total = 0;
		for (var jj = 0; jj < metaDataArr.length; jj++){
			total += metaDataArr[jj].count;
		}

		if(this._scaleFn) {
			total = this._scaleFn(total);
		}

		this._bars[j].height = Math.ceil(svgHeight * (total/yMax));
	}

	this._totalWidth = x - barPadding;
	this._maxBarHeight = yMax;
};

/**
 * Converts a pixel range into a bar range.
 *
 * @method pixelRangeToBarRange
 * @param {{from: number, to: number}} pixelRange - The range in pixels to convert.
 * @returns {{from: number, to: number}}
 */
FacetHistogram.prototype.pixelRangeToBarRange = function (pixelRange) {
	return {
		from: Math.min(this._bars.length - 1, Math.max(0, Math.round(pixelRange.from / (this._barWidth + this._barPadding)))),
		to: Math.min(this._bars.length - 1, Math.max(0, Math.round((pixelRange.to - this._barWidth) / (this._barWidth + this._barPadding))))
	};
};

/**
 * Converts a bar range into a pixel range.
 *
 * @method barRangeToPixelRange
 * @param {{from: number, to: number}} barRange - The bar range to convert.
 * @returns {{from: number, to: number}}
 */
FacetHistogram.prototype.barRangeToPixelRange = function (barRange) {
	return {
		from: barRange.from * (this._barWidth + this._barPadding),
		to: (barRange.to * (this._barWidth + this._barPadding)) + this._barWidth
	};
};

/**
 * Highlights the given bar range.
 *
 * @method highlightRange
 * @param {{from: number, to: number}} range - The bar range to highlight.
 */
FacetHistogram.prototype.highlightRange = function (range) {
	var bars = this._bars;
	for (var i = 0, n = bars.length; i < n; ++i) {
		bars[i].highlighted = (i >= range.from && i <= range.to);
	}
};

/**
 * Highlights the given value range.
 *
 * @method highlightValueRange
 * @param {{from: number, to: number}} range - The value range to highlight.
 */
FacetHistogram.prototype.highlightValueRange = function (range) {
	var bars = this._bars;
	for (var i = 0, n = bars.length; i < n; ++i) {
		var meta = bars[i].metadata[0];
		var from = +meta.label;
		var to = +meta.toLabel;
		bars[i].highlighted = (range.from >= from && range.to <= to);
	}
};

/**
 * Selects the specified counts for each bar as specified in the `slices` parameter.
 *
 * @method select
 * @param {Object} slices - Data used to select sub-bar counts in this histogram.
 */
FacetHistogram.prototype.select = function (slices) {
	var bars = this._bars;
	var yMax = this._maxBarHeight;
	var svgHeight = this._svg.height();

	for (var i = 0, n = bars.length; i < n; ++i) {
		var bar = bars[i];
		var barMetadata = bar.metadata;
		for (var ii = 0, nn = barMetadata.length; ii < nn; ++ii) {
			var slice = barMetadata[ii];
			var count = 0;
			if (slice.label in slices) {
				count = slices[slice.label];
			}

			if(this._scaleFn) {
				count = this._scaleFn(count);
			}

			var newHeight = Math.ceil(svgHeight * (count / yMax));
			if (bar.selectedHeight === null) {
				bar.selectedHeight = newHeight;
			} else {
				bar.selectedHeight = Math.max(bar.selectedHeight, newHeight);
			}
		}
	}
};

/**
 * Clears the selection state of all bars in this histogram.
 *
 * @method deselect
 */
FacetHistogram.prototype.deselect = function () {
	var bars = this._bars;
	for (var i = 0, n = bars.length; i < n; ++i) {
		bars[i].selectedHeight = null;
	}
};

/**
 * @export
 * @type {Histogram}
 */
module.exports = FacetHistogram;
