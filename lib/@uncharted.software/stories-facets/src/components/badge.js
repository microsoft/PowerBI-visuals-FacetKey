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

var IBindable = require('../components/IBindable');
var Template = require('../templates/badge');

/**
 * Class representing a badge element.
 *
 * @class Badge
 * @param {jquery} container - The container element for this badge.
 * @param {Object} spec - An object describing this badge.
 * @constructor
 */
function Badge(container, spec) {
  IBindable.call(this);

  this._container = container;
  this._spec = spec;
  this._key = spec.key;
  this._value = spec.value;
  this._label = spec.label;

  this._initialize();
}

/**
 * @inheritance {IBindable}
 */
Badge.prototype = Object.create(IBindable.prototype);
Badge.prototype.constructor = Badge;

/**
 * This key of this badge.
 *
 * @property key
 * @type {string}
 * @readonly
 */
Object.defineProperty(Badge.prototype, 'key', {
	get: function () {
		return this._key;
	}
});

/**
 * The value of this badge.
 *
 * @property value
 * @type {string}
 * @readonly
 */
Object.defineProperty(Badge.prototype, 'value', {
	get: function () {
		return this._value;
	}
});

/**
 * The display label of this badge.
 *
 * @property label
 * @type {string}
 * @readonly
 */
Object.defineProperty(Badge.prototype, 'label', {
	get: function () {
		return this._label;
	}
});

/**
 * Appends the badge element to the DON, adds event handlers.
 *
 * @method _initialize
 * @private
 */
Badge.prototype._initialize = function () {
  this._element = $(Template(this._spec));
  this._container.append(this._element);
  this._addHandlers();
};

/**
 * Adds the necessary event handlers for this object to function.
 *
 * @method _addHandlers
 * @private
 */
Badge.prototype._addHandlers = function () {
  this._element.find('.badge-close').on('click.badgeClose', this._onClose.bind(this));
};

/**
 * Removes all the event handlers added by the `_addHandlers` function.
 *
 * @method _removeHandlers
 * @private
 */
Badge.prototype._removeHandlers = function() {
	this._element.find('.badge-close').off('click.badgeClose');
};

/**
 * Destroys this selection badge
 *
 * @method destroy
 */
Badge.prototype.destroy = function() {
	this._removeHandlers();
	this._element.remove();
};

/**
 * Search event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
Badge.prototype._onClose = function(evt) {
	evt.stopPropagation();
	this.emit('badge:close', evt, this._key, this._value);
};

/**
 * @export
 * @type {Badge}
 */
module.exports = Badge;
