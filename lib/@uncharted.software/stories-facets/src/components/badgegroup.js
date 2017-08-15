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

var Template = require('../templates/badgegroup');
var Badge = require('./badge');

/**
 * Special group class used to represent the badges in the facets widget.
 *
 * @class BadgeGroup
 * @param {jquery} container - The container where this group will be added.
 * @param {Object=} options - Optional object with configuration options for the facets instance.
 * @constructor
 */
function BadgeGroup(container, options) {
  this._badges = [];
  this._element = $(Template(options));
  this._container = container;
  this._container.append(this._element);

  this._badgeContainer = this._container.find('.facets-badges');
}

/**
 * List of badges in this group
 *
 * @property badges
 * @type {Array}
 */
Object.defineProperty(BadgeGroup.prototype, 'badges', {
	get: function () {
		return this._badges;
	}
});

/**
 * Creates badge(s) for each simpleGroup and adds it to this group.
 *
 * @method _createBadge
 * @param {Object} simpleGroup Key, value and label (optional) of the badge to be created.
 * @private
 */
BadgeGroup.prototype._createBadge = function (simpleGroup) {
  var key = simpleGroup.key;
  var value = simpleGroup.value;
  var badgeFound = this._getBadge(key, value);

  //Avoid adding duplicates
  if (badgeFound === null) {
    var label = !simpleGroup.label ? value : simpleGroup.label;
    var badgeSpec = {key: key, value: value, label: label};
    var badge = new Badge(this._badgeContainer, badgeSpec);
    this._badges.push(badge);
  }
};

/**
 * Removes all badges in this group
 * @method _removeAllBadges
 * @private
 */
BadgeGroup.prototype._removeAllBadges = function () {
  this._badges.forEach(function (bg) {
		bg.destroy();
	});
  this._badges = [];
};

/**
 * Removes a badge from this group with the specified key and value.
 *
 * @method _removeBadge
 * @param {*} key - The key of the badge to remove.
 * @param {*} value - The value of the badge to remove.
 * @private
 */
BadgeGroup.prototype._removeBadge = function (key, value) {
	var badge = this._getBadge(key, value);
	if (badge) {
		var index = this._badges.indexOf(badge);
		if (index >= 0) {
      badge.destroy();
			this._badges.splice(index, 1);
		}
	}
};

/**
 * Gets the badge with the specified key and value.
 *
 * @method _getBadge
 * @param {*} key - The key to look for.
 * @param {*} value - The value to look for.
 * @private
 * @returns {Badge|null}
 */
BadgeGroup.prototype._getBadge = function (key, value) {
	var badgeObj = this._badges.filter(function (badge) {
		return badge.key === key && badge.value === value;
	});

	if (badgeObj && badgeObj.length > 0) {
		return badgeObj[0];
	} else {
		return null;
	}
};

/**
 * Sets this group to be garbage collected by removing all references to event handlers and DOM elements.
 * Calls `destroy` on its badges.
 *
 * @method destroy
 */
BadgeGroup.prototype.destroy = function () {
	this._badges.forEach(function (bg) {
		bg.destroy();
	});
	this._badges = [];
	this._element.remove();
};

/**
 * @export
 * @type {BadgeGroup}
 */
module.exports = BadgeGroup;
