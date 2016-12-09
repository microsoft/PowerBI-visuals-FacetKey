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

var _ = require('../../util/util');
var Facet = require('./facet');

var facetVertical_icon = require('../../templates/facetVertical_icon');
var facetVertical_links = require('../../templates/facetVertical_links');
var facetVertical_search = require('../../templates/facetVertical_search');
var facetVertical_queryClose = require('../../templates/facetVertical_queryClose');
var facetVertical_bar = require('../../templates/facetVertical_bar');
var Handlebars = require('handlebars');
var Template = require('../../templates/facetVertical');

var HIGHLIGHT_CLASS = 'facet-icon-highlighted';
var ABBREVIATED_CLASS = 'facets-facet-vertical-abbreviated';
var HIDDEN_CLASS = 'facets-facet-vertical-hidden';
var SELECTED_CLASS = 'facet-bar-selected';

/**
 * Vertical facet class, standard facet class.
 *
 * @class FacetVertical
 * @param {jquery} container - The container element for this facet.
 * @param {Group} parentGroup - The group this facet belongs to.
 * @param {Object} spec - An object describing this facet.
 * @constructor
 */
function FacetVertical (container, parentGroup, spec) {
	Facet.call(this, container, parentGroup, spec);

	this._value = spec.value;
	this._key = spec.key;
	this._count = spec.count;
	this._type = this._spec.isQuery ? 'query' : 'facet';
	this._hasEmittedSelectedEvent = false;

	if (this._spec.isQuery && this._key != '*') {
		this._spec.displayValue = this._key + ':' + (this._spec.label ? this._spec.label : this._spec.value);
	}

	/* register the partials to build the template */
	Handlebars.registerPartial('facetVertical_icon', facetVertical_icon);
	Handlebars.registerPartial('facetVertical_links', facetVertical_links);
	Handlebars.registerPartial('facetVertical_search', facetVertical_search);
	Handlebars.registerPartial('facetVertical_queryClose', facetVertical_queryClose);
	Handlebars.registerPartial('facetVertical_bar', facetVertical_bar);

	this._initializeLayout(Template);
	if ('selected' in this._spec) {
		this.select(this._spec.selected);
		delete this._spec.selected;
	}
	this._setupHandlers();

	/* register the animation listener, animations can trigger add/remove handlers so their handler must be handled separately */
	this._element.on('transitionend', this._handleTransitionEnd.bind(this));
}

/**
 * @inheritance {Facet}
 */
FacetVertical.prototype = Object.create(Facet.prototype);
FacetVertical.prototype.constructor = FacetVertical;

/**
 * This facet's key.
 *
 * @property key
 * @type {string}
 * @readonly
 */
Object.defineProperty(FacetVertical.prototype, 'key', {
	get: function () {
		return this._key;
	}
});

/**
 * The value of this facet.
 *
 * @property value
 * @type {*}
 * @readonly
 */
Object.defineProperty(FacetVertical.prototype, 'value', {
	get: function () {
		return this._value;
	}
});

/**
 * The configured icon for this facet.
 *
 * @property icon
 * @type {Object}
 * @readonly
 */
Object.defineProperty(FacetVertical.prototype, 'icon', {
	get: function () {
		return this._spec.icon;
	}
});

/**
 * The total number of matches for this facet.
 *
 * @property total
 * @type {number}
 */
Object.defineProperty(FacetVertical.prototype, 'total', {
	get: function () {
		return this._spec.total;
	},

	set: function (value) {
		this._spec.total = value;
		this._update();
	}
});

/**
 * The count of matches for this facet.
 *
 * @property count
 * @type {number}
 * @readonly
 */
Object.defineProperty(FacetVertical.prototype, 'count', {
	get: function () {
		return this._spec.count;
	}
});

/**
 * Defines if this facet has been highlighted.
 *
 * @property highlighted
 * @type {boolean}
 */
Object.defineProperty(FacetVertical.prototype, 'highlighted', {
	get: function () {
		return this._iconContainer.hasClass(HIGHLIGHT_CLASS);
	},

	set: function (value) {
		if (value) {
			this._iconContainer.addClass(HIGHLIGHT_CLASS);
		} else {
			this._iconContainer.removeClass(HIGHLIGHT_CLASS);
		}
	}
});

/**
 * Defines if this facet has been visually compressed to its smallest possible state.
 * Note: Abbreviated facets cannot be interacted with.
 *
 * @property abbreviated
 * @type {boolean}
 */
Object.defineProperty(FacetVertical.prototype, 'abbreviated', {
	get: function () {
		return this._element.hasClass(ABBREVIATED_CLASS);
	},

	set: function(value) {
		if (value !== this.abbreviated) {
			if (value) {
				this._element.addClass(ABBREVIATED_CLASS);
				this._removeHandlers();
			} else {
				this._element.removeClass(ABBREVIATED_CLASS);
				this._addHandlers();
			}
		}
	}
});

/**
 * Defines if this facet is visible.
 *
 * @property visible
 * @type {boolean}
 */
Object.defineProperty(FacetVertical.prototype, 'visible', {
	get: function () {
		return !this._element.hasClass(HIDDEN_CLASS);
	},

	set: function(value) {
		if (value !== this.visible) {
			if (value) {
				this._element.removeClass(HIDDEN_CLASS);
				this._addHandlers();
			} else {
				this._element.addClass(HIDDEN_CLASS);
				this._removeHandlers();
			}
		}
	}
});

 /**
 * Marks this facet as selected and updates the visual state.
 *
 * @method select
 * @param {(number|Object)} selected - Either the selection object or the count of selected elements, for this facet.
 */
FacetVertical.prototype.select = function(selected) {
	this._spec.selected = {
		count: selected.count || selected,
		countLabel: selected.countLabel,
		segments: selected.segments
	};
	this._update();
};

/**
 * Marks this facet as not selected and updates the visual state.
 *
 * @method deselect
 */
FacetVertical.prototype.deselect = function() {
	delete this._spec.selected;
	this._update();
};

/**
 * Updates this facet's spec with the passed data and then updates the facet's visual state.
 *
 * @method updateSpec
 * @param {Object} spec - The new spec for the facet
 */
FacetVertical.prototype.updateSpec = function (spec) {
	this._spec = _.extend(this._spec, spec);
	if ('selected' in this._spec) {
		this.select(this._spec.selected);
		delete this._spec.selected;
	} else {
		this._update();
	}
};

/**
 * Updates the hit count of this facet and updates the visual state.
 *
 * @method updateCount
 * @param {number} count - The new hit count for this facet.
 */
FacetVertical.prototype.updateCount = function(count) {
	this._spec.count += count;
	this._update();
};

/**
 * Updates the group total and updates the visual state (equivalent to the `total` property)
 *
 * @method rescale
 * @param groupTotal
 */
FacetVertical.prototype.rescale = function(groupTotal) {
	this.total = groupTotal;
};

/**
 * Unbinds this instance from any reference that it might have with event handlers and DOM elements.
 *
 * @method destroy
 * @param {boolean=} animated - Should the facet be removed in an animated way before it being destroyed.
 */
FacetVertical.prototype.destroy = function(animated) {
	if (animated) {
		var _destroy = function() {
			this.off(this._type + ':animation:visible-off', _destroy);
			this._destroy();
		}.bind(this);
		this.visible = false;
	} else {
		this._destroy();
	}
	Facet.prototype.destroy.call(this);
};

/**
 * Internal method to destroy this facet.
 *
 * @method _destroy
 * @private
 */
FacetVertical.prototype._destroy = function() {
	this._removeHandlers();
	this._element.off('transitionend');
	this._element.remove();
};

/**
 * Initializes all the layout elements based on the `template` provided.
 *
 * @method _initializeLayout
 * @param {function} template - The templating function used to create the layout.
 * @private
 */
FacetVertical.prototype._initializeLayout = function(template) {
	this._element = $(template(this._spec));
	this._container.append(this._element);

	this._barContainer = this._element.find('.facet-bar-container');
	var bars = this._barContainer.children('.facet-bar-base');
	this._barBackground = $(bars[0]);
	this._barForeground = $(bars[1]);

	this._iconContainer = this._element.find('.facet-icon');
	this._icon = this._iconContainer.children('i');
	this._iconColor = this._spec.icon && this._spec.icon.color ? this._spec.icon.color : null;

	this._label = this._element.find('.facet-label');
	this._labelCount = this._element.find('.facet-label-count');

	this._linksContainer = this._element.find('.facet-links');
	this._queryCloseContainer = this._element.find('.facet-query-close');
	this._searchContainer = this._element.find('.facet-search-container');
	if (!this._searchContainer.children().length) {
		this._searchContainer.empty();
	}

	/* make sure all styles have been applied */
	var i, n, off;
	for (i = 0, n = this._element.length; i < n; ++i) {
		off = this._element[i].offsetHeight; // trigger style recalculation.
	}

	var children = this._element.find('*');
	for (i = 0, n = children.length; i < n; ++i) {
		off = children[i].offsetHeight; // trigger style recalculation.
	}
};

/**
 * Adds the necessary event handlers for this object to function.
 *
 * @method _addHandlers
 * @private
 */
FacetVertical.prototype._addHandlers = function() {
	if (this.visible) {
		this._iconContainer.hover(
			this._onMouseEnter.bind(this),
			this._onMouseLeave.bind(this)
		);
		this._element.click(this._onClick.bind(this));
		this._element.find('.facet-search-container').on('click.facetSearch', this._onSearch.bind(this));
		this._element.find('.facet-query-close').on('click.queryClose', this._onClose.bind(this));
	}
};

/**
 * Removes all the event handlers added by the `_addHandlers` function.
 *
 * @method _removeHandlers
 * @private
 */
FacetVertical.prototype._removeHandlers = function() {
	this._iconContainer.off('hover');
	this._element.off('click');
	this._element.find('.facet-search-container').off('click.facetSearch');
};

/**
 * Updates the visual state of this facet.
 *
 * @method _update
 * @private
 */
FacetVertical.prototype._update = function() {
	var spec = this._spec;
	var selectedCount = spec.selected && spec.selected.count;
	var selectionSegments = spec.selected && spec.selected.segments || [];
	var isSelectionWithNoSegments = selectedCount >= 0 && selectionSegments.length === 0;
	var facetCount = isSelectionWithNoSegments ? selectedCount : spec.count;
	var barForegroundWidth = ((facetCount / spec.total) * 100) + '%';
	var newLabelHTML = spec.displayValue || spec.label || spec.value;
	var countLabel = (spec.selected && spec.selected.countLabel) || spec.countLabel || spec.count.toString();

	/* icon */ // TODO: Only update if the current icon is not the same as the icon in the spec.
	this._iconContainer.empty();
	this._iconContainer.append($(facetVertical_icon(this._spec)));
	this._icon = this._iconContainer.children('i');
	this._iconColor = this._spec.icon && this._spec.icon.color ? this._spec.icon.color : null;

	/* bar background */
	this._barBackground.css('width', ((spec.count / spec.total) * 100) + '%');

	/* bar foreground */
	if (selectedCount >= 0) {
		if (!this._barForeground.hasClass(SELECTED_CLASS)) {
			this._barForeground.removeAttr('style');
			if (selectionSegments.length === 0 && selectedCount > 0) {
				this._barForeground.addClass(SELECTED_CLASS);
			}
		}
		this._barForeground.css('width', barForegroundWidth);
	} else {
		if (this._iconColor && !spec.segments) {
			this._barForeground.css('box-shadow', 'inset 0 0 0 1000px ' + this._iconColor);
		}
		this._barForeground.removeClass(SELECTED_CLASS);
		this._barForeground.css('width', barForegroundWidth);
	}

	/* bar segments */
	this._barForeground.children().each(function (index, child) {
		var segment = selectionSegments[index] || spec.segments[index];
		var segmentCount = isSelectionWithNoSegments ? 0 : segment.count;
		$(child).toggleClass('zero-width', segmentCount === 0);
		$(child).css({
			'width': ((segmentCount / spec.count) * 100) + '%',
			'box-shadow': 'inset 0 0 0 1000px ' + segment.color
		});
	});

	/* label */
	if (this._label.html() !== newLabelHTML) {
		this._label.html(newLabelHTML);
	}

	/* count label */
	if (this._labelCount.html() !== countLabel) {
		this._labelCount.html(countLabel);
	}

	/* links */ // TODO: Only update if the current icon is not the same as the icon in the spec.
	this._linksContainer.empty();
	this._linksContainer.append(facetVertical_links(this._spec));

	/* search */ // TODO: Only update if the current icon is not the same as the icon in the spec.
	this._searchContainer.empty();
	this._searchContainer.append(facetVertical_search(this._spec));
	if (!this._searchContainer.children().length) {
		this._searchContainer.empty();
	}
};

/**
 * Click event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetVertical.prototype._onClick = function(evt) {
	this.emit(this._type + ':click', evt, this._key, this._value, this._count);
};

/**
 * Search event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetVertical.prototype._onSearch = function(evt) {
	evt.stopPropagation();
	this.emit(this._type + ':search', evt, this._key, this._value, this._count);
};

/**
 * Close event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetVertical.prototype._onClose = function(evt) {
	evt.stopPropagation();
	this.emit(this._type + ':close', evt, this._key, this._value, this._count);
};

/**
 * Mouse enter event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetVertical.prototype._onMouseEnter = function(evt) {
	this.emit(this._type + ':mouseenter', evt, this._key, this._value, this._count);
};

/**
 * Mouse leave event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetVertical.prototype._onMouseLeave = function(evt) {
	this.emit(this._type + ':mouseleave', evt, this._key, this._value, this._count);
};

/**
 * Transition end event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetVertical.prototype._handleTransitionEnd = function(evt) {
	var property = evt.originalEvent.propertyName;
	if (evt.target === this._element.get(0) && property === 'opacity') {
		if (this.visible) {
			this.emit(this._type + ':animation:visible-on', evt, this._key, this._value, this._count);
		} else {
			this.emit(this._type + ':animation:visible-off', evt, this._key, this._value, this._count);
		}
	} else if (evt.target === this._iconContainer.get(0) && property === 'opacity') {
		if (this.abbreviated) {
			this.emit(this._type + ':animation:abbreviated-on', evt, this._key, this._value, this._count);
		} else {
			this.emit(this._type + ':animation:abbreviated-off', evt, this._key, this._value, this._count);
		}
	} else if (evt.target === this._barBackground.get(0) && property === 'width') {
		this.emit(this._type + ':animation:bar-width-change', evt, this._key, this._value, this._count);
	} else if (evt.target === this._barForeground.get(0) && property === 'width') {
		if (!this._hasEmittedSelectedEvent && this._barForeground.hasClass(SELECTED_CLASS)) {
			this.emit(this._type + ':animation:selected-on', evt, this._key, this._value, this._count);
			this._hasEmittedSelectedEvent = true;
		} else if (this._hasEmittedSelectedEvent && !this._barForeground.hasClass(SELECTED_CLASS)) {
			this.emit(this._type + ':animation:selected-off', evt, this._key, this._value, this._count);
			this._hasEmittedSelectedEvent = false;
		}
	}
};

/**
 * @export
 * @type {FacetVertical}
 */
module.exports = FacetVertical;
