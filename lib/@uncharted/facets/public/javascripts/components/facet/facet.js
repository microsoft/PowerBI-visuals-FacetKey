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
var IBindable = require('../IBindable');
var Util = require('../../util/util');

/**
 * An interface class for facets, defines the public API shared by all facets.
 *
 * @class Facet
 * @param {jquery} container - The container element for this facet.
 * @param {Group} parentGroup - The group this facet belongs to.
 * @param {Object} spec - An object describing this facet.
 * @constructor
 */
function Facet (container, parentGroup, spec) {
	IBindable.call(this);

	this.parentGroup = parentGroup;
	this._spec = spec;

	// generate a unique id for this facet entry that can be found by jquery for updating counts
	this._spec.id = Util.randomId();

	this._container = container;
	this._element = null;
}

/**
 * @inheritance {IBindable}
 */
Facet.prototype = Object.create(IBindable.prototype);
Facet.prototype.constructor = Facet;

/**
 * Returns this facet's key.
 *
 * @property key
 * @type {string}
 * @readonly
 */
Object.defineProperty(Facet.prototype, 'key', {
	get: function () {
		throw new Error('not implemented');
	}
});

/**
 * The value of this facet.
 *
 * @property value
 * @type {*}
 * @readonly
 */
Object.defineProperty(Facet.prototype, 'value', {
	get: function () {
		throw new Error('not implemented');
	}
});

/**
 * This facet's container element.
 *
 * @property container
 * @type {jquery}
 */
Object.defineProperty(Facet.prototype, 'container', {
	get: function () {
		return this._container;
	},

	set: function(value) {
		if (value !== this._container && this._element) {
				this._element.remove();
		}

		if (value && this._element) {
			value.append(this._element);
		}

		this._container = value;
	}
});

/**
 * Defines if this facet has been visually compressed to its smallest possible state.
 * Note: Abbreviated facets cannot be interacted with.
 *
 * @property abbreviated
 * @type {boolean}
 */
Object.defineProperty(Facet.prototype, 'abbreviated', {
	get: function () {
		throw new Error('not implemented');
	},

	set: function(value) {
		throw new Error('not implemented');
	}
});

/**
 * Defines if this facet is visible.
 *
 * @property visible
 * @type {boolean}
 */
Object.defineProperty(Facet.prototype, 'visible', {
	get: function () {
		throw new Error('not implemented');
	},

	set: function(value) {
		throw new Error('not implemented');
	}
});

/**
 * Updates this facet's spec with the passed data and then updates the facet's visual state.
 *
 * @method updateSpec
 * @param {Object} spec - The new spec for the facet
 */
Facet.prototype.updateSpec = function (spec) {
	throw new Error('not implemented');
};

/**
 * Marks this facet as selected and updates the visual state.
 *
 * @method select
 * @param {*} data - The data used to select this facet.
 */
Facet.prototype.select = function(data) {
	throw new Error('not implemented');
};

/**
 * Marks this facet as not selected and updates the visual state.
 *
 * @method deselect
 */
Facet.prototype.deselect = function() {
	throw new Error('not implemented');
};

/**
 * Unbinds this instance from any reference that it might have with event handlers and DOM elements.
 *
 * @method destroy
 * @param {boolean=} animated - Should the facet be removed in an animated way before it being destroyed.
 */
Facet.prototype.destroy = function(animated) {
	IBindable.prototype.destroy.call(this);
};

/**
 * Adds the necessary event handlers for this object to function.
 *
 * @method _addHandlers
 * @private
 */
Facet.prototype._addHandlers = function() {
	throw new Error('not implemented');
};

/**
 * Removes all the event handlers added by the `_addHandlers` function.
 *
 * @method _removeHandlers
 * @private
 */
Facet.prototype._removeHandlers = function() {
	throw new Error('not implemented');
};

/**
 * Utility function to make sure the event handlers have been added and are updated.
 *
 * @method _setupHandlers
 * @private
 */
Facet.prototype._setupHandlers = function() {
	this._removeHandlers();
	this._addHandlers();
};

/**
 * @export
 * @type {Facet}
 */
module.exports = Facet;
