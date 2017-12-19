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

require('./helpers');
var _ = require('./util/util');

var IBindable = require('./components/IBindable');
var Group = require('./components/group');
var QueryGroup = require('./components/querygroup');
var BadgeGroup = require('./components/badgegroup');
var Template = require('./templates/main');

/**
 * Main facets class, this class defines the main interface between the app and Facets.
 *
 * @class Facets
 * @param {HTMLElement|jQuery} container - The element where the facets should be rendered.
 * @param {Object} groups - An object describing the groups of facets to be created.
 * @param {Object=} queries - Optional object describing the queries that should be created along with the facets.
 * @param {Object=} options - Optional object with configuration options for this facets instance.
 * @constructor
 */
function Facets(container, groups, queries, options) {
    IBindable.call(this);
    this._options = options || {};
    this._container = $(Template());
    this._container.appendTo(container);
    this._init(groups, queries);
}

/**
 * @inheritance {IBindable}
 */
Facets.prototype = Object.create(IBindable.prototype);
Facets.prototype.constructor = Facets;


/**
 * Re-arranges the facets by a sort function.
 *
 * @method sort
 * @param {Function} sort - The sort function.
 */
Facets.prototype.sort = function(sort) {
	this._groups.sort(sort);
	this._groups.forEach(function(group) {
		group._element.detach();
	});
	var container = this._container;
	this._groups.forEach(function(group) {
		group._element.appendTo(container);
	});
};

/**
 * Selects the given facets.
 *
 * @method select
 * @param {Object} subgroups - An object describing the facets, and in which group, to be selected.
 * @param {boolean=} isQuery - Optional parameter to define if the subgroup is a query, if not specified the method will try to auto-detect the group's type.
 */
Facets.prototype.select = function(subgroups, isQuery) {
	var groupsInitialized = false;
	var queriesInitialized = false;

	subgroups.forEach(function(groupSpec) {
		var group = this.getGroup(groupSpec.key);
		if (!isQuery && group) {
			if (!groupsInitialized) {
				// Initialize selection state
				this._groups.forEach(function(group) {
					group.initializeSelection();
				});
				groupsInitialized = true;
			}

			// select each containining facet
			groupSpec.facets.forEach(function(facetSpec) {
				var facet = group._getFacet(facetSpec.value);
				if (facet) {
					facet.select(facetSpec.selected || facetSpec);
				}
			}.bind(this));
		} else {
			groupSpec.facets.forEach(function(facetSpec) {
				var query = this._getQuery(groupSpec.key, facetSpec.value);
				if (query) {
					if (!queriesInitialized) {
						// Initialize selection state
						this._queryGroup.initializeSelection();
						queriesInitialized = true;
					}
					query.select(facetSpec.selected);
				}
			}.bind(this));
		}
	}.bind(this));
};

/**
 * Deselects all queries and the specified, previously selected facets.
 *
 * @method deselect
 * @param {Array=} simpleGroups - 	An array containing the group keys and facet values to be deselected.
 * 									If a group has a key but not a value, all facets in the group will be deselected.
 * 									If this parameter is omitted all groups and facets will be deselected.
 */
Facets.prototype.deselect = function(simpleGroups) {
	if (!simpleGroups) {
		this._groups.forEach(function (group) {
			group.clearSelection();
		});
	} else {
		simpleGroups.forEach(function(simpleGroup) {
			var group = this.getGroup(simpleGroup.key);
			if (group) {
				if ('value' in simpleGroup) {
					var facet = group._getFacet(simpleGroup.value);
					if (facet) {
						facet.deselect();
					}
				} else {
					group.clearSelection();
				}
			}
		}.bind(this));
	}
	this._queryGroup.clearSelection();
};

/**
 * Replaces all the facets with new groups and queries created using the provided information.
 *
 * @method replace
 * @param {Object} groups - An object describing the groups of facets to be created.
 * @param {Object=} queries - Optional object describing the queries that should be created along with the facets.
 * @param {boolean=} noTransition - If truthful will disable CSS transitions during init.
 */
Facets.prototype.replace = function(groups, queries, noTransition) {
	this._destroyContents();
	this._init(groups, queries, noTransition);
};

/**
 * Replaces the specified group with the new data.
 *
 * @method replaceGroup
 * @param {Object} group - An object describing the information of the new group.
 */
Facets.prototype.replaceGroup = function(group) {
	var existingGroup = this.getGroup(group.key);
	if (existingGroup) {
		existingGroup.replace(group);
		this._bindClientEvents();
	}
};

/**
 * Sets the specified facets to their highlighted state.
 *
 * @method highlight
 * @param {Array} simpleGroups - An array containing the group keys and facet values to be highlighted.
 * @param {boolean=} isQuery - Optional parameter to define if the subgroup is a query, if not specified the method will try to auto-detect the group's type.
 */
Facets.prototype.highlight = function(simpleGroups, isQuery) {
	simpleGroups.forEach(function(simpleGroup) {
		var group = this.getGroup(simpleGroup.key);
		if (!isQuery && group) {
			group.highlight(simpleGroup.value);
		} else {
			var query = this._getQuery(simpleGroup.key, simpleGroup.value);
			if (query) {
				query.highlighted = true;
			}
		}
	}, this);
};

/**
 * Creates badges for the provided facets.
 *
 * @method createBadges
 * @param {Array} simpleGroups - An array containing the group keys and facet values to create badges for.
 * @param {boolean=} isQuery - Optional parameter to define if the subgroup is a query, if not specified the method will try to auto-detect the group's type.
  */
Facets.prototype.createBadges = function(simpleGroups, isQuery) {

  simpleGroups.forEach(function(simpleGroup) {
		var group = this.getGroup(simpleGroup.key);
		if (!isQuery && group) {
			this._badgeGroup._createBadge(simpleGroup);
		} else {
			var query = this._getQuery(simpleGroup.key, simpleGroup.value);
			if (query) {
				this._badgeGroup._createBadge(simpleGroup);
			}
		}
	}, this);

  this._bindClientEvents();
};

/**
 * Removes badges for the provided facets.
 *
 * @method removeBadges
 * @param {Array} simpleGroups - An array containing the group keys and facet values to remove badges for.
 *                               If this value is omitted, all badges will be removed.
 * @param {boolean=} isQuery - Optional parameter to define if the subgroup is a query, if not specified the method will try to auto-detect the group's type.
  */
Facets.prototype.removeBadges = function(simpleGroups, isQuery) {
  if (!simpleGroups) {
    this._badgeGroup._removeAllBadges();
	} else {
    simpleGroups.forEach(function(simpleGroup) {
  		var group = this.getGroup(simpleGroup.key);
  		if (!isQuery && group) {
        this._badgeGroup._removeBadge(simpleGroup.key, simpleGroup.value);
  		} else {
				var query = this._getQuery(simpleGroup.key, simpleGroup.value);
				if (query) {
					this._badgeGroup._removeBadge(simpleGroup.key, simpleGroup.value);
				}
			}
  	}, this);
  }
};

/**
 * Sets the specified facets to their not-highlighted state.
 *
 * @method unhighlight
 * @param {Array} simpleGroups - An array containing the group keys and facet values to be un-highlighted.
 * @param {boolean=} isQuery - Optional parameter to define if the subgroup is a query, if not specified the method will try to auto-detect the group's type.
 */
Facets.prototype.unhighlight = function(simpleGroups, isQuery) {
	if (arguments.length > 0) {
		simpleGroups.forEach(function(simpleGroup) {
			var group = this.getGroup(simpleGroup.key);
			if (!isQuery && group) {
				group.unhighlight(simpleGroup.value);
			} else {
				var query = this._getQuery(simpleGroup.key, simpleGroup.value);
				if (query) {
					query.highlighted = false;
				}
			}
		}, this);
	} else {
		this._unhighlightAll();
	}
};

/**
 * Checks if a specific facets is in its highlighted state.
 *
 * @method isHighlighted
 * @param {Object} simpleGroup - An object describing the group and facet to check for a highlighted state.
 * @param {boolean=} isQuery - Optional parameter to define if the subgroup is a query, if not specified the method will try to auto-detect the group's type.
 * @returns {boolean}
 */
Facets.prototype.isHighlighted = function(simpleGroup, isQuery) {
	var group = this.getGroup(simpleGroup.key);
	if (!isQuery && group) {
		return group.isHighlighted(simpleGroup.value);
	} else {
		var query = this._getQuery(simpleGroup.key, simpleGroup.value);
		if (query) {
			return query.highlighted;
		}
	}
	return false;
};

/**
 * Checks if the group with the specified key is in its collapsed state.
 *
 * @method isCollapsed
 * @param {*} key - The key of the group to check.
 * @returns {boolean}
 */
Facets.prototype.isCollapsed = function(key) {
	var group = this.getGroup(key);
	if (group) {
		return group.collapsed;
	}
	return false;
};

/**
 * Returns the filter range of the facet with the given value in the group with the give key, or null if an error occurs.
 *
 * @method getFilterRange
 * @param {*} key - The key of the group containing the facet for which the filter range should be retrieved.
 * @param {*} value - The value of the facet for which the filter range should be retrieved.
 * @returns {Object|null}
 */
Facets.prototype.getFilterRange = function(key, value) {
	var group = this.getGroup(key);
	if (group) {
		return group.getFilterRange(value);
	}
	return null;
};

/**
 * Update the spec for a given facet.
 * @param groupKey the key of the group the facet is in (ie/ phone)
 * @param facetKey the value of the facet you want to update (ie/ 123-555-1212)
 * @param spec the spec values to replace
 */
Facets.prototype.updateSpec = function(groupKey,facetKey,spec) {
	var group = this.getGroup(groupKey);
	if (group) {
		var facet = group._getFacet(facetKey);
		if (facet) {
			facet.updateSpec(spec);
		}
	}
};

/**
 * Appends the specified groups and queries to the widget.
 * NOTE: If a facet or query already exists, the value specified in the data will be appended to the already existing value.
 *
 * @method append
 * @param {Object} groups - An object describing the groups and facets to append.
 * @param {Object} queries - An object describing the queries to append.
 */
Facets.prototype.append = function(groups, queries) {
	var existingGroup;

	// Append groups
	if (groups) {
		groups.forEach(function(groupSpec) {
			existingGroup = this.getGroup(groupSpec.key);
			if (existingGroup) {
				existingGroup.append(groupSpec);
			} else {
				var group = new Group(this, this._container, groupSpec, this._options, this._groups.length);
				this._groups.push(group);
			}
		}, this);
	}

	// Append queries
	if (queries) {
		queries.forEach(function(querySpec) {
			this.addQuery(querySpec);
		}, this);
	}

	this._bindClientEvents();
};

/**
 * Removes the facet with the specified value from the group with the specified key.
 *
 * @method removeFacet
 * @param {*} key - The key of the group containing the facet to remove.
 * @param {*} value - The value of the facet to remove.
 */
Facets.prototype.removeFacet = function(key, value) {
	var group = this.getGroup(key);
	if (group) {
		group.removeFacet(value);
	}
};

/**
 * Removes the group with the specified key.
 *
 * @method removeGroup
 * @param {*} key - The key of the group containing the facet to remove.
 */
Facets.prototype.removeGroup = function(key) {
	var group = this.getGroup(key);
	if (group) {
		group.destroy();
		this._groups.splice(this._groups.indexOf(group), 1);
	}
};

/**
 * Adds a query to the query group in this widget.
 *
 * @method addQuery
 * @param {Object} query - An object describing the query to add
 */
Facets.prototype.addQuery = function(query) {
	this._queryGroup.addQuery(query, true);
	this._bindClientEvents();
};

/**
 * Removes the query with the specified key and value from the query group.
 *
 * @method removeQuery
 * @param {*} key - The key of the query to remove.
 * @param {*} value - The value of the query to remove.
 */
Facets.prototype.removeQuery = function(key, value) {
	this._queryGroup.removeQuery(key, value, true);
};

/**
 * Updates the group indices in this widget.
 * NOTE: The event `facet-group:reordered` will be triggered for each group fo which its index has changed.
 *
 * @method updateGroupIndices
 */
Facets.prototype.updateGroupIndices = function() {
	/* sort group by their top offset */
	this._groups.sort(function(a, b) {
		return a._element.offset().top - b._element.offset().top;
	});

	/* notify all groups of their new positions */
	this._groups.forEach(function (group, index) {
		group.index = index;
	});
};

/**
 * Returns an array with the keys of all the groups in this widget, ordered by their index.
 *
 * @method getGroupIndices
 * @returns {Array}
 */
Facets.prototype.getGroupIndices = function() {
	return this._groups.map(function(group) {
		return group.key;
	});
};

/**
 * Removes all handlers and properly destroys this widget instance.
 *
 * @method destroy
 */
Facets.prototype.destroy = function() {
	this._destroyContents();
	this._container.remove();
	/* call super class */
	IBindable.prototype.destroy.call(this);
};

/**
 * Internal method to initialize the widget.
 *
 * @method _init
 * @param {Object} groups - An object describing the groups to instantiate with this widget.
 * @param {Object=} queries - An optional object describing the queries to instantiate with this widget.
 * @param {boolean=} noTransition - If truthful will disable CSS transitions during init.
 * @private
 */
Facets.prototype._init = function(groups, queries, noTransition) {

	if ( noTransition ) {
		this._container.addClass('facets-no-transition');
	}

  this._badgeGroup = new BadgeGroup(this._container, this._options);

	this._queryGroup = new QueryGroup(this._container, queries || []);

	// Create groups
	this._groups = groups.map(function(groupSpec, index) {
		return new Group(this, this._container, groupSpec, this._options, index);
	}.bind(this));

	this._bindClientEvents();

    if ( noTransition ) {
        this._container.removeClass('facets-no-transition');
    }
};

/**
 * Sets all facets and queries in this widget to their not-highlighted state.
 *
 * @method _unhighlightAll
 * @private
 */
Facets.prototype._unhighlightAll = function() {
	this._groups.forEach(function(group) {
		group.unhighlight();
	});
	this._queryGroup.unhighlightAll();
};

/**
 * Returns the query with the specified key and value.
 *
 * @method _getQuery
 * @param {string} key - The key of the query to find.
 * @param {string} value - The value of the query to find.
 * @returns {Facet|null}
 * @private
 */
Facets.prototype._getQuery = function(key, value) {
	return this._queryGroup._getQuery(key, value);
};

/**
 * Gets the group with the specified key.
 *
 * @method getGroup
 * @param {string} key - The key of the group to find.
 * @returns {Group|null}
 * @private
 */
Facets.prototype.getGroup = function(key) {
	var groupObj = this._groups.filter(function(g) {
		return g.key === key;
	});
	if (groupObj && groupObj.length>0) {
		return groupObj[0];
	} else {
		return null;
	}
};
// alias for backwards compatibility
Facets.prototype._getGroup = Facets.prototype.getGroup;

/**
 * Internal method to destroy the groups, facets and queries contained in this widget.
 *
 * @method _destroyContents
 * @private
 */
Facets.prototype._destroyContents = function() {
	this._bindClientEvents(true);

	// remove existing queries
	this._queryGroup.destroy();

	// remove existing facets
	if (this._groups) {
		this._groups.forEach(function(g) {
			g.destroy();
		});
	}

  // remove selection badges
  this._badgeGroup.destroy();
};

/**
 * Binds the forwarding mechanism for all client events.
 *
 * @method _bindClientEvents
 * @param {boolean=} remove - Optional parameter. when set to true the events will be removed.
 * @private
 */
Facets.prototype._bindClientEvents = function(remove) {
	if (remove) {
		this.unforward(this._queryGroup);
		this._groups.forEach(function(_group) {
			this.unforward(_group);
		}.bind(this));
    this._badgeGroup.badges.forEach(function (_badge) {
      this.unforward(_badge);
    }.bind(this));
	} else {
		this.forward(this._queryGroup);
		this._groups.forEach(function(_group) {
			this.forward(_group);
		}.bind(this));
    this._badgeGroup.badges.forEach(function (_badge) {
      this.forward(_badge);
    }.bind(this));
	}
};

/**
 * @export
 * @type {Facets}
 */
module.exports = Facets;
