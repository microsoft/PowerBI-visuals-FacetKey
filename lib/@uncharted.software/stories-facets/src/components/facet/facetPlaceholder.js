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

var _ = require('../../util/util');
var Facet = require('./facet');
var Handlebars = require('handlebars');
var Template = require('../../templates/facetPlaceholder');

var ABBREVIATED_CLASS = 'facets-facet-placeholder-abbreviated';
var HIDDEN_CLASS = 'facets-facet-placeholder-hidden';

/**
 * Placeholder facet class.
 *
 * @class FacetPlaceholder
 * @param {jquery} container - The container element for this facet.
 * @param {Group} parentGroup - The group this facet belongs to.
 * @param {Object} spec - An object describing this facet.
 * @constructor
 */
function FacetPlaceholder (container, parentGroup, spec) {
	Facet.call(this, container, parentGroup, spec);
	this._key = spec.key;
	this._type = 'placeholder';
	this._initializeLayout(Template);
	this._setupHandlers();
}

/**
 * @inheritance {Facet}
 */
FacetPlaceholder.prototype = Object.create(Facet.prototype);
FacetPlaceholder.prototype.constructor = FacetPlaceholder;

/**
 * This facet's key.
 *
 * @property key
 * @type {string}
 * @readonly
 */
Object.defineProperty(FacetPlaceholder.prototype, 'key', {
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
Object.defineProperty(FacetPlaceholder.prototype, 'value', {
	get: function () {
		return undefined;
	}
});

/**
 * Defines if this facet has been visually compressed to its smallest possible state.
 * Note: Abbreviated facets cannot be interacted with.
 *
 * @property abbreviated
 * @type {boolean}
 */
Object.defineProperty(FacetPlaceholder.prototype, 'abbreviated', {
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
Object.defineProperty(FacetPlaceholder.prototype, 'visible', {
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
FacetPlaceholder.prototype.select = function(selected) {
};

/**
 * Marks this facet as not selected and updates the visual state.
 *
 * @method deselect
 */
FacetPlaceholder.prototype.deselect = function() {
};

/**
 * Updates this facet's spec with the passed data and then updates the facet's visual state.
 *
 * @method updateSpec
 * @param {Object} spec - The new spec for the facet
 */
FacetPlaceholder.prototype.updateSpec = function (spec) {
};

/**
 * Unbinds this instance from any reference that it might have with event handlers and DOM elements.
 *
 * @method destroy
 * @param {boolean=} animated - Should the facet be removed in an animated way before it being destroyed.
 */
FacetPlaceholder.prototype.destroy = function(animated) {
	this._removeHandlers();
	this._element.off('transitionend');
	this._element.remove();
	Facet.prototype.destroy.call(this);
};

/**
 * Initializes all the layout elements based on the `template` provided.
 *
 * @method _initializeLayout
 * @param {function} template - The templating function used to create the layout.
 * @private
 */
FacetPlaceholder.prototype._initializeLayout = function(template) {
	this._element = $(template(this._spec));
	this._container.append(this._element);
};

/**
 * Adds the required event handlers needed to trigger this facet's own events.
 *
 * @method _addHandlers
 * @private
 */
FacetPlaceholder.prototype._addHandlers = function() {
	if (this.visible) {
		this._element.hover(
			this._onMouseEnter.bind(this),
			this._onMouseLeave.bind(this)
		);
		this._element.click(this._onClick.bind(this));
	}
};

/**
 * Removes any added event handlers, virtually "muting" this facet
 *
 * @method _removeHandlers
 * @private
 */
FacetPlaceholder.prototype._removeHandlers = function() {
	this._element.off('click');
	this._element.off('hover');
};

/**
 * Click event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetPlaceholder.prototype._onClick = function(evt) {
	this.emit(this._type + ':click', evt, this._key);
};

/**
 * Mouse enter event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetPlaceholder.prototype._onMouseEnter = function(evt) {
	this.emit(this._type + ':mouseenter', evt, this._key);
};

/**
 * Mouse leave event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetPlaceholder.prototype._onMouseLeave = function(evt) {
	this.emit(this._type + ':mouseleave', evt, this._key);
};

/**
 * @export
 * @type {FacetPlaceholder}
 */
module.exports = FacetPlaceholder;
