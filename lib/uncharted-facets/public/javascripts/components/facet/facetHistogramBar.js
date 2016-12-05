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

var BAR_CLASSES = 'facet-histogram-bar facet-histogram-bar-transform';
var HIGHLIGHTED_CLASS = 'facet-histogram-bar-highlighted';
/**
 * Helper class to create bars for the histogram.
 *
 * @class FacetHistogramBar
 * @param {jQuery} container - The svg element to add the bar to, can be a paper or a group.
 * @param {Number} x - The x coordinate where the bar should be created.
 * @param {Number} width - The width of the bar.
 * @param {Number} height - The height of the bar.
 * @param {Number} maxHeight - The maximum height of the bar.
 * @constructor
 */
function FacetHistogramBar (container, x, width, height, maxHeight) {
	this._metadata = null;
	this._highlighted = false;

	this._groupElement = $(document.createElementNS('http://www.w3.org/2000/svg','g'));
	this._groupElement.attr('transform', "translate(0, " + maxHeight + "), scale(1, -1)");
	this._groupElement.css('transform', "translate(0, " + maxHeight + "px) scale(1, -1)");

	container.append(this._groupElement);

	this._backElement = $(document.createElementNS('http://www.w3.org/2000/svg','rect'));
	this._backElement.attr('class', BAR_CLASSES);
	this._groupElement.append(this._backElement);

	this._element = $(document.createElementNS('http://www.w3.org/2000/svg','rect'));
	this._element.attr('class', BAR_CLASSES);
	this._groupElement.append(this._element);

	this._selectedHeight = null;

	this.x = x;
	this.y = 0;
	this.width = width;
	this.height = 0;
	this.height = height;

	this._onMouseEnterHandler = null;
	this._onMouseLeaveHandler = null;
	this._onClickHandler = null;
}

/**
 * The x position of this bar.
 *
 * @property x
 * @type {Number|string}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'x', {
	get: function () {
		return this._x;
	},

	set: function(value) {
		this._element.attr('x', value);
		this._backElement.attr('x', value);
		this._x = value;
	}
});

/**
 * The y position of this bar. (does not account for CSS styling)
 *
 * @property y
 * @type {Number|string}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'y', {
	get: function () {
		return this._y;
	},

	set: function(value) {
		this._element.attr('y', value);
		this._backElement.attr('y', value);
		this._y = value;
	}
});

/**
 * The width of this bar.
 *
 * @property width
 * @type {Number}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'width', {
	get: function () {
		return this._width;
	},

	set: function(value) {
		this._element.attr('width', value);
		this._backElement.attr('width', value);
		this._width = value;
	}
});

/**
 * The height of this bar.
 *
 * @property height
 * @type {Number}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'height', {
	get: function () {
		return this._height;
	},

	set: function(value) {
		if (this._selectedHeight === null) {
			this._element.attr('height', value);
			this._element.css('height', value);
			this._element.css('height');
		}

		this._backElement.attr('height', value);
		this._backElement.css('height', value);
		this._backElement.css('height');

		this._height = value;
	}
});

/**
 * The height of the selection for this bar.
 *
 * @property selectedHeight
 * @type {Number|null}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'selectedHeight', {
	get: function () {
		return this._selectedHeight;
	},

	set: function(value) {
		if (value !== null) {
			this._element.attr('height', value);
			this._element.css('height', value);
			this._element.css('height');
		} else {
			this._element.attr('height', this._height);
			this._element.css('height', this._height);
			this._element.css('height');
		}

		this._selectedHeight = value;
	}
});

/**
 * Holds any object as the metadata for this bar.
 *
 * @property metadata
 * @type {*}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'metadata', {
	get: function () {
		return this._metadata;
	},

	set: function(value) {
		this._metadata = value;
	}
});

/**
 * Returns an objects with the synthesized info of this bar.
 *
 * @property info
 * @type {Object}
 * @readonly
 */
Object.defineProperty(FacetHistogramBar.prototype, 'info', {
	get: function() {
		return {
			label: this._metadata.map(function(info) {
				return info.label;
			}),

			count: this._metadata.map(function(info) {
				return info.count;
			}),

			metadata: this._metadata.map(function(info) {
				return info.metadata;
			})
		};
	}
});

/**
 * Whether or not this bar is currently highlighted.
 *
 * @property highlighted
 * @type {Boolean}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'highlighted', {
	get: function () {
		return this._highlighted;
	},

	set: function(value) {
		if (value !== this._highlighted) {
			this._element.attr('class', BAR_CLASSES + (value ? ' ' + HIGHLIGHTED_CLASS : ''));
		}
		this._highlighted = value;
	}
});

/**
 * A callback function invoked when the mouse enters this bar.
 *
 * @property onMouseEnter
 * @type {function}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'onMouseEnter', {
	get: function () {
		return this._onMouseEnterHandler;
	},

	set: function (value) {
		if (typeof value === "function") {
			this._onMouseEnterHandler = value;
		} else {
			this._onMouseEnterHandler = null;
		}
	}
});

/**
 * A callback function invoked when the mouse leaves this bar.
 *
 * @property onMouseLeave
 * @type {function}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'onMouseLeave', {
	get: function () {
		return this._onMouseLeaveHandler;
	},

	set: function (value) {
		if (typeof value === "function") {
			this._onMouseLeaveHandler = value;
		} else {
			this._onMouseLeaveHandler = null;
		}
	}
});

/**
 * A callback function invoked when the bar is clicked.
 *
 * @property onClick
 * @type {function}
 */
Object.defineProperty(FacetHistogramBar.prototype, 'onClick', {
	get: function () {
		return this._onClickHandler;
	},

	set: function (value) {
		if (typeof value === "function") {
			this._onClickHandler = value;
		} else {
			this._onClickHandler = null;
		}
	}
});

/**
 * Adds the required event handlers needed to trigger this bar's own events.
 *
 * @method _addHandlers
 * @private
 */
FacetHistogramBar.prototype._addHandlers = function() {
	this._element.hover(
		this._onMouseEnter.bind(this),
		this._onMouseLeave.bind(this)
	);
	this._element.click(this._onClick.bind(this));

	this._backElement.hover(
		this._onMouseEnter.bind(this),
		this._onMouseLeave.bind(this)
	);
	this._backElement.click(this._onClick.bind(this));
};

/**
 * Removes any added event handlers, virtually "muting" this bar
 *
 * @method _removeHandlers
 * @private
 */
FacetHistogramBar.prototype._removeHandlers = function() {
	this._element.unbind('click');
	this._element.unbind('hover');

	this._backElement.unbind('click');
	this._backElement.unbind('hover');
};

/**
 * Handles the `mouseenter` event.
 *
 * @method _onMouseEnter
 * @param {Event} event - The event triggered.
 * @private
 */
FacetHistogramBar.prototype._onMouseEnter = function (event) {
	event.preventDefault();
	event.stopPropagation();
	if (this._onMouseEnterHandler) {
		this._onMouseEnterHandler(this, event);
	}
};

/**
 * Handles the `mouseleave` event.
 *
 * @method _onMouseLeave
 * @param {Event} event - The event triggered.
 * @private
 */
FacetHistogramBar.prototype._onMouseLeave = function (event) {
	event.preventDefault();
	event.stopPropagation();
	if (this._onMouseLeaveHandler) {
		this._onMouseLeaveHandler(this, event);
	}
};

/**
 * Handles the `click` event.
 *
 * @method _onClick
 * @param {Event} event - The event triggered.
 * @private
 */
FacetHistogramBar.prototype._onClick = function (event) {
	event.preventDefault();
	event.stopPropagation();
	if (this._onClickHandler) {
		this._onClickHandler(this, event);
	}
};

/**
 * @export
 * @type {FacetHistogramBar}
 */
module.exports = FacetHistogramBar;
