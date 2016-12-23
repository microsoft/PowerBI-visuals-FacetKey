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


/**
 * Helper class to manage the range filtering tools.
 *
 * @class FacetHistogramFilter
 * @param {jQuery} element - A jQuery wrapped element that contains all the range manipulation tools.
 * @param {FacetHistogram} histogram - The histogram to which the tools will be linked to.
 * @constructor
 */
function FacetHistogramFilter (element, histogram) {
	this._element = element;
	this._histogram = histogram;
	this._rangeFilter = element.find('.facet-range-filter');
	this._leftHandle = this._rangeFilter.find('.facet-range-filter-left');
	this._rightHandle = this._rangeFilter.find('.facet-range-filter-right');

	this._currentRangeLabel = element.find('.facet-range-current');
	this._pageLeft = element.find('.facet-page-left');
	this._pageRight = element.find('.facet-page-right');

	this._draggingLeft = false;
	this._draggingLeftX = 0;
	this._canDragLeft = false;

	this._draggingRight = false;
	this._draggingRightX = 0;
	this._canDragRight = false;

	this._pixelRange = {
		from: 0,
		to: 0
	};

	this._barRange = {
		from: 0,
		to: 0
	};

	this._maxBarRange = {
		from: 0,
		to: (histogram.bars.length - 1)
	};

	this._onFilterChanged = null;

	this._initializeDragging();
	this._initializePagination();

	this._rangeFilter.removeClass('facet-range-filter-init');
}

/**
 * A callback function invoked when the filter range is changed.
 *
 * @property onFilterChanged
 * @type {function}
 */
Object.defineProperty(FacetHistogramFilter.prototype, 'onFilterChanged', {
	get: function () {
		return this._onFilterChanged;
	},

	set: function (value) {
		if (typeof value === "function") {
			this._onFilterChanged = value;
		} else {
			this._onFilterChanged = null;
		}
	}
});

/**
 * Represents the bar range of this histogram filter.
 *
 * @property barRange
 * @type {Object}
 */
Object.defineProperty(FacetHistogramFilter.prototype, 'barRange', {
	get: function () {
		return this._barRange;
	},

	set: function (value) {
		this.setFilterBarRange(value, false);
	}
});

/**
 * Represents the pixel range of this histogram filter.
 *
 * @property pixelRange
 * @type {Object}
 */
Object.defineProperty(FacetHistogramFilter.prototype, 'pixelRange', {
	get: function () {
		return this._pixelRange;
	},

	set: function (value) {
		this.setFilterPixelRange(value, false);
	}
});

/**
 * Initializes the dragging functionality for the range selection controls.
 *
 * @method _initializeDragging
 * @private
 */
FacetHistogramFilter.prototype._initializeDragging = function () {
	var calculateFrom = function (range, offset, barWidth, totalWidth) {
		range.from = Math.max(0, range.from + offset);
		if (range.from > range.to - barWidth) {
			if (range.from + barWidth < totalWidth) {
				range.to = range.from + barWidth;
			} else {
				range.from = totalWidth - barWidth;
				range.to = totalWidth;
			}
		}
	};

	var calculateTo = function (range, offset, barWidth, totalWidth) {
		range.to = Math.min(totalWidth, range.to + offset);
		if (range.to < range.from + barWidth) {
			if (range.to - barWidth > 0) {
				range.from = range.to - barWidth;
			} else {
				range.from = 0;
				range.to = barWidth;
			}
		}
	};

	var barWidth = this._histogram.barWidth;
	var totalWidth = this._histogram.totalWidth;

	var endDragging = function (event) {
		if (this._draggingLeft || this._draggingRight) {
			event.preventDefault();
			var range = {
				from: this._pixelRange.from,
				to: this._pixelRange.to
			};

			if (this._draggingLeft) {
				this._canDragLeft = false;
				this._draggingLeft = false;
				calculateFrom(range, (event.clientX - this._draggingLeftX), barWidth, totalWidth);
			}

			if (this._draggingRight) {
				this._canDragRight = false;
				this._draggingRight = false;
				calculateTo(range, (event.clientX - this._draggingRightX), barWidth, totalWidth);
			}

			this.setFilterPixelRange(range, true);
			return false;
		}
		return true;
	}.bind(this);

	this._element.mouseleave(endDragging);
	this._element.mouseup(endDragging);

	this._element.mousemove(function(event) {
		if (this._canDragLeft || this._canDragRight) {
			var range = {
				from: this._pixelRange.from,
				to: this._pixelRange.to
			};

			if (this._canDragLeft) {
				if (!this._draggingLeft) {
					this._draggingLeft = true;
				}
				calculateFrom(range, (event.clientX - this._draggingLeftX), barWidth, totalWidth);
			}

			if (this._canDragRight) {
				if (!this._draggingRight) {
					this._draggingRight = true;
				}
				calculateTo(range, (event.clientX - this._draggingRightX), barWidth, totalWidth);
			}

			var barRange = this._histogram.pixelRangeToBarRange(range);
			this.updateUI(barRange, range);
		}
	}.bind(this));

	this._leftHandle.mousedown(function (event) {
		event.preventDefault();
		this._canDragLeft = true;
		this._draggingLeft = false;
		this._draggingLeftX = event.clientX;
		return false;
	}.bind(this));

	this._rightHandle.mousedown(function (event) {
		event.preventDefault();
		this._canDragRight = true;
		this._draggingRight = false;
		this._draggingRightX = event.clientX;
		return false;
	}.bind(this));
};

/**
 * Initializes the pagination functionality of the range manipulation controls.
 *
 * @method _initializePagination
 * @private
 */
FacetHistogramFilter.prototype._initializePagination = function () {
	this._pageLeft.click(function() {
		var from = this._barRange.from;
		var to = this._barRange.to;
		var maxFrom = this._maxBarRange.from;

		if (from > maxFrom) {
			var offset = to - from + 1;
			if (from - offset < maxFrom) {
				offset = from - maxFrom;
			}

			this.setFilterBarRange({
				from: from - offset,
				to: to - offset
			}, true);
		}
	}.bind(this));

	this._pageRight.click(function() {
		var from = this._barRange.from;
		var to = this._barRange.to;
		var maxTo = this._maxBarRange.to;

		if (to < maxTo) {
			var offset = to - from + 1;
			if (to + offset > maxTo) {
				offset = maxTo - to;
			}

			this.setFilterBarRange({
				from: from + offset,
				to: to + offset
			}, true);
		}
	}.bind(this));
};

/**
 * Sets the given pixel range as the currently active range.
 * NOTE: This function rounds the pixel range to the closes possible bar range.
 *
 * @method setFilterPixelRange
 * @param {Object} pixelRange - A range object containing the pixel coordinates to be selected.
 * @param {boolean=} fromUserInput - Defines if the filter range change was triggered by a user input interaction.
 */
FacetHistogramFilter.prototype.setFilterPixelRange = function (pixelRange, fromUserInput) {
	this.setFilterBarRange(this._histogram.pixelRangeToBarRange(pixelRange), fromUserInput);
};

/**
 * Sets the given bar range as the currently active range.
 *
 * @method setFilterBarRange
 * @param {Object} barRange - The bar range to select.
 * @param {boolean=} fromUserInput - Defines if the filter range change was triggered by a user input interaction.
 */
FacetHistogramFilter.prototype.setFilterBarRange = function (barRange, fromUserInput) {
	var pixelRange = this._histogram.barRangeToPixelRange(barRange);

	this._pixelRange = pixelRange;
	this._barRange = barRange;

	this.updateUI(barRange, pixelRange);

	if (this._onFilterChanged) {
		this._onFilterChanged(barRange, fromUserInput);
	}
};

/**
 * Updates the UI components of the range manipulation tools.
 * NOTE: The `barRange` and the `pixelRange` may be different, this function does NOT perform tests to make sure they are equivalent.
 *
 * @method updateUI
 * @param {Object} barRange - The bar range used to update the UI
 * @param {Object} pixelRange - The pixel range to update the UI
 */
FacetHistogramFilter.prototype.updateUI = function (barRange, pixelRange) {
	var bars = this._histogram.bars;
	var leftBarMetadata = bars[barRange.from].metadata;
	var rightBarMetadata = bars[barRange.to].metadata;
	this._currentRangeLabel.text(leftBarMetadata[0].label + ' - ' + rightBarMetadata[rightBarMetadata.length - 1].toLabel);

	this._histogram.highlightRange(barRange);

	this._rangeFilter.css('left', pixelRange.from);
	this._rangeFilter.css('width', pixelRange.to - pixelRange.from);

	if (barRange.from === this._maxBarRange.from && barRange.to === this._maxBarRange.to) {
		this._currentRangeLabel.addClass('facet-range-current-hidden');
	} else {
		this._currentRangeLabel.removeClass('facet-range-current-hidden');
	}

	if (barRange.from === this._maxBarRange.from) {
		this._pageLeft.addClass('facet-page-ctrl-disabled');
	} else {
		this._pageLeft.removeClass('facet-page-ctrl-disabled');
	}

	if (barRange.to === this._maxBarRange.to) {
		this._pageRight.addClass('facet-page-ctrl-disabled');
	} else {
		this._pageRight.removeClass('facet-page-ctrl-disabled');
	}
};

/**
 * @export
 * @type {FacetHistogramFilter}
 */
module.exports = FacetHistogramFilter;


