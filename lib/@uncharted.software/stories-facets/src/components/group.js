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

var _ = require('../util/util');
var IBindable = require('../components/IBindable');
var Template = require('../templates/group');
var TemplateMore = require('../templates/group-more');
var FacetVertical = require('../components/facet/facetVertical');
var FacetHorizontal = require('../components/facet/facetHorizontal');
var FacetPlaceholder = require('../components/facet/facetPlaceholder');

var COLLAPSED_CLASS = 'facets-group-collapsed';
var ELLIPSIS_VISIBLE_CLASS = 'group-facet-ellipsis-visible';
var CHECKED_TOGGLE_CLASS = 'fa-check-square-o';
var UNCHECKED_TOGGLE_CLASS = 'fa-square-o';

/**
 * Facet group class designed to instantiate and hold facet instances.
 *
 * @class Group
 * @param {Facets} widget - The facets widget this group belongs to.
 * @param {jquery} container - A jQuery wrapped element where this group will reside.
 * @param {Object} groupSpec - The data used to load this group.
 * @param {Object} options - An Object with the options for this group.
 * @param {number=} index - The index this group should hold in the widget.
 * @constructor
 */
function Group(widget, container, groupSpec, options, index) {
	IBindable.call(this);
	this._options = options;
	this._widget = widget;
	this._key = groupSpec.key;
	this._container = container;
	this._ownsTotal = false;
	this._total = 0;

	this._canDrag = false;
	this._dragging = false;
	this._collapsible = groupSpec.collapsible !== undefined ? groupSpec.collapsible : true;
	this._draggingX = 0;
	this._draggingY = 0;
	this._draggingYOffset = 0;
	this._draggingGroupTop = 0;
	this._scrollElement = null;
	this._trackingTouchID = null;
	this._touchStartTime = 0;
	this._index = index || 0;

	this._facets = {
		vertical: [],
		horizontal: [],
		all: []
	};

	this._initializeLayout(Template, groupSpec.label, groupSpec.more || 0);
	this._initializeFacets(groupSpec);
	/* collapsed state */
	if (groupSpec.collapsed) {
		this.collapsed = true;
	}
	this._setupHandlers();
}

/**
 * @inheritance {IBindable}
 */
Group.prototype = Object.create(IBindable.prototype);
Group.prototype.constructor = Group;

/**
 * Returns this group's configured key.
 *
 * @property key
 * @type {string}
 * @readonly
 */
Object.defineProperty(Group.prototype, 'key', {
	get: function () {
		return this._key;
	}
});


/**
 * Returns this group's total hit count.
 *
 * @property total
 * @type {number}
 * @readonly
 */
Object.defineProperty(Group.prototype, 'total', {
	get: function () {
		return this._total;
	}
});

/**
 * Returns all of this group's facets.
 *
 * @property facets
 * @type {Array}
 * @readonly
 */
Object.defineProperty(Group.prototype, 'facets', {
	get: function () {
		return this._facets.all;
	}
});

/**
 * Returns this group's horizontal facets.
 *
 * @property facets
 * @type {Array}
 * @readonly
 */
Object.defineProperty(Group.prototype, 'horizontalFacets', {
	get: function () {
		return this._facets.horizontal;
	}
});

/**
 * Returns this group's vertical facets.
 *
 * @property facets
 * @type {Array}
 * @readonly
 */
Object.defineProperty(Group.prototype, 'verticalFacets', {
	get: function () {
		return this._facets.vertical;
	}
});

/**
 * Is this group visible.
 *
 * @property visible
 * @type {boolean}
 */
Object.defineProperty(Group.prototype, 'visible', {
	get: function () {
		return this._element.is(':visible');
	},

	set: function (value) {
		if (value) {
			this._element.show();
		} else {
			this._element.hide();
		}
	}
});

/**
 * Property meant to keep track of this group's index in the widget.
 *
 * @property index
 * @type {number}
 */
Object.defineProperty(Group.prototype, 'index', {
	get: function () {
		return this._index;
	},

	set: function (value) {
		if (value !== this._index) {
			this._index = value;
			this.emit('facet-group:reordered', null, this._key, this._index);
		}
	}
});

/**
 * Is this group collapsed.
 *
 * @property collapsed
 * @type {boolean}
 */
Object.defineProperty(Group.prototype, 'collapsed', {
	get: function () {
		return this._element.hasClass(COLLAPSED_CLASS);
	},

	set: function (value) {
		if (value !== this.collapsed) {
			this._setCollapsedClasses(value, this.facets.length >= 3);
			this._setAbbreviateAndHideFacets(value, 3);
		}
	}
});

/**
 * Makes sure that all facets in this group can be selected.
 *
 * @method initializeSelection
 */
Group.prototype.initializeSelection = function () {
	this.verticalFacets.forEach(function (facet) {
		facet.select(0);
	});
};

/**
 * Deselects all facets in this group.
 *
 * @method clearSelection
 */
Group.prototype.clearSelection = function () {
	this.facets.forEach(function (facet) {
		facet.deselect();
	});
};

/**
 * Highlights the facet with the specified value.
 *
 * @method highlight
 * @param {*} value - The value of the facet to highlight.
 */
Group.prototype.highlight = function (value) {
	var existingFacet = this._getFacet(value);
	if (existingFacet) {
		existingFacet.highlighted = true;
	}
};

/**
 * Unhighlights the facet with the specified value.
 *
 * @method unhighlight
 * @param {*} value - The value of the facet to unhighlight
 */
Group.prototype.unhighlight = function (value) {
	if (value) {
		var existingFacet = this._getFacet(value);
		if (existingFacet) {
			existingFacet.highlighted = false;
		}
	} else {
		this.verticalFacets.forEach(function (facet) {
			facet.highlighted = false;
		});
	}
};

/**
 * Checks if the facet with the given value is highlighted.
 *
 * @method isHighlighted
 * @param {*} value - The value of the facet to look for.
 * @returns {boolean}
 */
Group.prototype.isHighlighted = function (value) {
	var response = false,
		existingFacet = this._getFacet(value);

	if (existingFacet) {
		response = existingFacet.highlighted;
	}

	return response;
};

/**
 * Returns the filter range of the facet with the given value or null if an error occurs.
 *
 * @method getFilterRange
 * @param {*} value - The value of the facet for which the filter will be retrieved.
 * @returns {Object|null}
 */
Group.prototype.getFilterRange = function (value) {
	var facet = this._getFacet(value);
	if (facet && 'filterRange' in facet) {
		return facet.filterRange;
	}
	return null;
};

/**
 * Appends the specified data to this group.
 *
 * @method append
 * @param {Object} groupSpec - The data specification to append.
 */
Group.prototype.append = function (groupSpec) {
	var existingFacet;

	/* remove event handlers */
	this._removeHandlers();

	groupSpec.more = groupSpec.more || 0;
	this._updateMore(groupSpec.more);

	// make sure the group is not collapsed (so the append effect is visible)
	this.collapsed = false;

	if (groupSpec.total) {
		this._ownsTotal = true;
		this._total = groupSpec.total;
	}

	// update all the facets (the group total most likely changed)
	groupSpec.facets.forEach(function (facetSpec) {
		if (!this._ownsTotal && !('histogram' in facetSpec) && !('placeholder' in facetSpec)) { // it's not a horizontal facet
			this._total += facetSpec.count;
		}
		existingFacet = this._getFacet(facetSpec.value);
		if (existingFacet) {
			facetSpec.count += existingFacet.count;
			existingFacet.updateSpec(facetSpec);
		} else {
			var facet = this._createNewFacet(facetSpec, groupSpec.key, true);
			if (facet instanceof FacetHorizontal) {
				this.horizontalFacets.push(facet);
			} else {
				this.verticalFacets.push(facet);
			}
			this.facets.push(facet);
			facet.visible = true;
			/* forward all the events from this facet */
			this.forward(facet);
		}
	}, this);

	// Update facet totals so they can rescale their bars
	this.facets.forEach(function (facet) {
		facet.total = this._total;
	}, this);

	/* collapsed state */
	if (groupSpec.collapsed) {
		this.collapsed = true;
	}

	// re-register handlers to ensure newly added elements respond to events
	this._addHandlers();
};

/**
 * Replace all the facet entries in this group with new ones in groupSpec.
 * Maintains group and facet client events.
 *
 * @method replace
 * @param {Object} groupSpec - The data specification containing facets to replace.
 */
Group.prototype.replace = function(groupSpec) {
	// make sure the group is not collapsed (so the append effect is visible)
	this.collapsed = false;

	/* remove event handlers */
	this._removeHandlers();

	// get the current index of the group, so we can insert it back
	var index = this._element.index();

	// Destroy existing facets
	this._destroyFacets();
	this._element.remove();
	this._setupHandlers();

	// update collapsible state
	this._collapsible = groupSpec.collapsible !== undefined ? groupSpec.collapsible : true;

	//reinit
	this._initializeLayout(Template, groupSpec.label, groupSpec.more || 0, index);

	// initialize the new facets
	this._initializeFacets(groupSpec);

	// Update more link
	groupSpec.more = groupSpec.more || 0;
	this._updateMore(groupSpec.more);

	/* collapsed state */
	if (groupSpec.collapsed) {
		this.collapsed = true;
	}

	// re-register handlers to ensure newly added elements respond to events
	this._addHandlers();
};

/**
 * Removes the facet with the specified value from this group.
 *
 * @method removeFacet
 * @param {*} value - the value of the facet to remove.
 */
Group.prototype.removeFacet = function(value) {
	var facet = this._getFacet(value);
	var facetIndex = this.facets.indexOf(facet);
	if (facetIndex >= 0) {
		this.facets.splice(facetIndex, 1);

		var facetTypeArray = null;
		if (facet instanceof FacetHorizontal) {
			facetTypeArray = this.horizontalFacets;
		} else {
			facetTypeArray = this.verticalFacets;
		}
		facetIndex = facetTypeArray.indexOf(facet);
		if (facetIndex >= 0) {
			facetTypeArray.splice(facetIndex, 1);
		}

		if (!this._ownsTotal) {
			this._total += facet._spec.count;
			// Update facet totals so they can rescale their bars
			this.facets.forEach(function (facet) {
				facet.total = this._total;
			}, this);
		}

		/* destroying a facet automatically unforwards its events */
		facet.destroy(true);
	}
};

/**
 * Sets this group to be garbage collected by removing all references to event handlers and DOM elements.
 * Calls `destroy` on its facets.
 *
 * @method destroy
 */
Group.prototype.destroy = function () {
	this._removeHandlers();
	this._destroyFacets();
	this._element.remove();
	IBindable.prototype.destroy.call(this);
};

/**
 * Iterates through the facets in this group and calls `destroy` on each one of them.
 *
 * @method _destroyFacets
 * @private
 */
Group.prototype._destroyFacets = function () {
	// destroy all the facets
	this.facets.forEach(function (facet) {
		/* destroying a facet automatically unforwards its events */
		facet.destroy();
	});

	// reset the facets structure
	this._facets = {
		horizontal: [],
		vertical: [],
		all: []
	};
};

/**
 * Initializes all the layout elements based on the `template` provided.
 *
 * @method _initializeLayout
 * @param {function} template - The templating function used to create the layout.
 * @param {string} label - The label to be used for this group.
 * @param {*} more - A value defining the 'more' behaviour of this group.
 * @param {number} index - The index of the element to insert at.
 * @private
 */
Group.prototype._initializeLayout = function (template, label, more, index) {
	this._element = $(template({
		label: label,
		more: more,
		collapsible: this._collapsible
	}));
	if (index === undefined) {
		// if no index is specified, append to container
		this._container.append(this._element);
	} else {
		// otherwise insert at a specific index
		this._element.insertAfter(this._container.children().get(index-1));
	}

	this._facetContainer = this._element.find('.group-facet-container');
	this._groupContent = this._element.find('.facets-group');

	this._updateMore(more);
};

/**
 * Initializes the
 * @param spec
 * @private
 */
Group.prototype._initializeFacets = function (spec) {
	// Calculate the group total
	if (spec.total) {
		this._ownsTotal = true;
		this._total = spec.total;
	} else {
		this._ownsTotal = false;
		spec.facets.forEach(function (facetSpec) {
			if (!('histogram' in facetSpec) && !('placeholder' in facetSpec)) { // it's not a horizontal or placeholder facet
				this._total += facetSpec.count;
			}
		}, this);
	}

	// Create each facet
	var facets = spec.facets;
	for (var i = 0, n = facets.length; i < n; ++i) {
		var facetSpec = facets[i];
		var facet = this._createNewFacet(facetSpec, spec.key);
		if (facet instanceof FacetHorizontal) {
			this.horizontalFacets.push(facet);
		} else {
			this.verticalFacets.push(facet);
		}
		this.facets.push(facet);
		/* forward all the events from this facet */
		this.forward(facet);
	}
};

/**
 * Utility function to make sure the event handlers have been added and are updated.
 *
 * @method _setupHandlers
 * @private
 */
Group.prototype._setupHandlers = function () {
	this._removeHandlers();
	this._addHandlers();
};

/**
 * Adds the necessary event handlers for this object to function.
 *
 * @method _addHandlers
 * @private
 */
Group.prototype._addHandlers = function () {
	this._element.find('.group-expander').on('click.facetsCollapseExpand', this._toggleCollapseExpand.bind(this));
	this._element.find('.group-more-target').on('click.facetsGroupMore', this._onMore.bind(this));
	this._element.find('.group-other-target').on('click.facetsGroupOther', this._onOther.bind(this));
	this._element.find('.group-header').on('mousedown', this._handleHeaderMouseDown.bind(this));
	$(document).on('mouseup.group.' + this._key, this._handleHeaderMouseUp.bind(this));
	$(document).on('mousemove.group.' + this._key, this._handleHeaderMouseMove.bind(this));

	this._element.find('.group-header').on('touchstart', this._handleHeaderTouchStart.bind(this));
	$(document).on('touchmove.group.' + this._key, this._handleHeaderTouchMove.bind(this));
	$(document).on('touchend.group.' + this._key, this._handleHeaderTouchEnd.bind(this));
	$(document).on('touchcancel.group.' + this._key, this._handleHeaderTouchEnd.bind(this));

	this._element.on('transitionend', this._handleTransitionEnd.bind(this));

	/* assume that we should wait for all the groups to be instantiated before adding the scroll handler */
	setTimeout(this._addScrollHandler.bind(this));
};

/**
 * Removes all the event handlers added by the `_addHandlers` function.
 *
 * @method _removeHandlers
 * @private
 */
Group.prototype._removeHandlers = function () {
	this._element.find('.group-expander').off('click.facetsCollapseExpand');
	this._element.find('.group-more-target').off('click.facetsGroupMore');
	this._element.find('.group-other-target').off('click.facetsGroupOther');
	this._element.find('.group-header').off('mousedown');
	$(document).off('mouseup.group.' + this._key);
	$(document).off('mousemove.group.' + this._key);
	$(document).off('touchmove.group.' + this._key);
	$(document).off('touchend.group.' + this._key);
	$(document).off('touchcancel.group.' + this._key);
	this._element.off('transitionend');
	this._removeScrollHandler();
};

/**
 * Adds the scroll handler needed for groups to work properly when dragging.
 *
 * @method _addScrollHandler
 * @private
 */
Group.prototype._addScrollHandler = function() {
	this._removeScrollHandler();

	/* find the first element that can be scrolled and attach to it */
	var currentElement = this._element;
	while (true) {
		if (!currentElement.length) {
			break;
		}

		var rawElement = currentElement.get(0);
		if (rawElement.scrollHeight > rawElement.clientHeight) {
			this._scrollElement = currentElement;
			break;
		}

		currentElement = currentElement.parent();
	}

	if (this._scrollElement) {
		this._scrollElement.on('scroll.group.' + this._key, this._handleHeaderMouseMove.bind(this));
	}
};

/**
 * Removes the scroll handler for this group.
 *
 * @method _removeScrollHandler
 * @private
 */
Group.prototype._removeScrollHandler = function() {
	if (this._scrollElement) {
		this._scrollElement.off('scroll.group.' + this._key);
		this._scrollElement = null;
	}
};

/**
 * Returns the facets with the given value, if it exists in this group.
 *
 * @method _getFacet
 * @param {*} value - Tha value to look for.
 * @returns {Facet}
 * @private
 */
Group.prototype._getFacet = function (value) {
	var facetObj = this.facets.filter(function (f) {
		return f.value === value;
	});
	if (facetObj && facetObj.length > 0) {
		return facetObj[0];
	} else {
		return null;
	}
};

/**
 * Updates the 'more' state of this group.
 * TODO: Use the already created element if possible instead of creating anew one every time.
 *
 * @method _updateMore
 * @param {number||boolean} more - The number of extra facets available or a boolean specifying of there are more elements.
 * @private
 */
Group.prototype._updateMore = function (more) {
	this._moreElement = $(TemplateMore({
		more: more
	}));
	this._moreContainer = this._element.find('.group-more-container');
    this._moreContainer.replaceWith(this._moreElement);
};

/**
 * Cretes a new facet based on the specified spec and appends it to this group.
 *
 * @method _createNewFacet
 * @param {Object} facetSpec - Data specification for the facet to create.
 * @param {string} groupKey - The group key to create the facet with.
 * @param {boolean=} hidden - Specifies if the newly created facet should be created hidden.
 * @private
 */
Group.prototype._createNewFacet = function (facetSpec, groupKey, hidden) {
	if ('histogram' in facetSpec) {
		// create a horizontal facet
		return new FacetHorizontal(this._facetContainer, this, _.extend(facetSpec, {
			key: groupKey,
			hidden: hidden
		}));
	} else if ('placeholder' in facetSpec) {
		// create a placeholder facet
		return new FacetPlaceholder(this._facetContainer, this, _.extend(facetSpec, {
			key: groupKey,
			hidden: hidden
		}));
	} else {
		// create a vertical facet
		return new FacetVertical(this._facetContainer, this, _.extend(facetSpec, {
			key: groupKey,
			total: this._total,
			search: this._options.search,
			hidden: hidden
		}));
	}
};

/**
 * Visually expands or collapses this group. Can be used to handle an input event.
 *
 * @method _toggleCollapseExpand
 * @param {Event=} evt - The event being handle, if any.
 * @returns {boolean}
 * @private
 */
Group.prototype._toggleCollapseExpand = function (evt) {
	if (evt) {
		evt.preventDefault();
		evt.stopPropagation();
	}

	this.collapsed = !this.collapsed;
	if (this.collapsed) {
		this.emit('facet-group:collapse', evt, this._key);
	} else {
		this.emit('facet-group:expand', evt, this._key);
	}

	return false;
};

/**
 * Adds or removes the collapsed classes to the relevant elements in this group.
 * WARNING: Do not call this function, this is here for readability purposes.
 * For more info - https://stash.uncharted.software/projects/STORIES/repos/facets/pull-requests/42/overview
 *
 * @method _setCollapsedClasses
 * @param {boolean} isCollapsed - Is the group collapsed.
 * @param {boolean} showEllipsis - When collapsed, should the ellipsis be shown.
 * @private
 */
Group.prototype._setCollapsedClasses = function (isCollapsed, showEllipsis) {
	var groupCollapseIcon = this._element.find('.toggle'),
		groupEllipsis = this._element.find('.group-facet-ellipsis');

	if (isCollapsed) {
		/* add the collapsed class to the group */
		this._element.addClass(COLLAPSED_CLASS);

		/* make sure the icon is checked */
		groupCollapseIcon.removeClass(CHECKED_TOGGLE_CLASS);
		groupCollapseIcon.addClass(UNCHECKED_TOGGLE_CLASS);

		/* if there are more than three facets show the ellipsis */
		if (showEllipsis) {
			groupEllipsis.addClass(ELLIPSIS_VISIBLE_CLASS);
		}
	} else {
		/* remove the collapsed class */
		this._element.removeClass(COLLAPSED_CLASS);

		/* make sure the icon is unchecked */
		groupCollapseIcon.removeClass(UNCHECKED_TOGGLE_CLASS);
		groupCollapseIcon.addClass(CHECKED_TOGGLE_CLASS);

		/* remove the ellipsis */
		groupEllipsis.removeClass(ELLIPSIS_VISIBLE_CLASS);
	}
};

/**
 * Sets the abbrebiated and/or hiden state of the facets in this group depending on the parameters passed.
 * WARNING: Do not call this function, this is here for readability purposes.
 * For more info - https://stash.uncharted.software/projects/STORIES/repos/facets/pull-requests/42/overview
 *
 * @method _setAbbreviateAndHideFacets
 * @param {boolean} abbreviated - Should the facets be abbreviated.
 * @param {number} maxFacetsToAbbreviate - Maximum number of facets to abbreviate, any facet after this number will be hidden.
 * @private
 */
Group.prototype._setAbbreviateAndHideFacets = function (abbreviated, maxFacetsToAbbreviate) {
	this.facets.forEach(function (facet, i) {
		if (i < maxFacetsToAbbreviate) {
			facet.abbreviated = abbreviated;
		} else {
			facet.visible = !abbreviated;
		}
	});
};

/**
 * Handler function called when the user click on the 'more' link.
 *
 * @method _onMore
 * @param {Event} evt - The event being handled.
 * @private
 */
Group.prototype._onMore = function (evt) {
	evt.preventDefault();
	evt.stopPropagation();
	var index = evt.currentTarget.getAttribute('index');
	index = (index !== null) ? parseInt(index) : null;
	this.emit('facet-group:more', evt, this._key, index);
};

/**
 * Handler function called when the user click on the 'other' facet.
 *
 * @method _onOther
 * @param {Event} evt - The event being handled.
 * @private
 */
Group.prototype._onOther = function (evt) {
	evt.preventDefault();
	evt.stopPropagation();
	this.emit('facet-group:other', evt, this._key);
};

/**
 * Function to handle a mouse down event to prepare dragging.
 *
 * @method _handleHeaderMouseDown
 * @param {Event} evt - The event that triggered this handler.
 * @returns {boolean}
 * @private
 */
Group.prototype._handleHeaderMouseDown = function (evt) {
	if (evt.button === 0) {
		evt.preventDefault();
		this._canDrag = true;
		this._dragging = false;
		this._draggingX = evt.clientX;
		this._draggingY = evt.clientY;
		this._draggingYOffset = 0;
		this._draggingGroupTop = this._element.offset().top;
		return false;
	}
	return true;
};

/**
 * Function to handle a mouse up event and end dragging.
 *
 * @method _handleHeaderMouseUp
 * @param {Event} evt - The event that triggered this handler.
 * @returns {boolean}
 * @private
 */
Group.prototype._handleHeaderMouseUp = function (evt) {
	this._canDrag = false;
	if (this._dragging) {
		evt.preventDefault();
		this._dragging = false;
		/* reset position */
		this._groupContent.removeAttr('style');
		/* trigger dragging end event */
		this.emit('facet-group:dragging:end', evt, this._key);

		return false;
	}
	return true;
};

/**
 * Function to handle a mouse move event and perform dragging.
 *
 * @method _handleHeaderMouseMove
 * @param {Event} evt - The event that triggered this handler.
 * @returns {boolean}
 * @private
 */
Group.prototype._handleHeaderMouseMove = function (evt) {
	if (this._canDrag) {
		evt.preventDefault();
		if (!this._dragging) {
			this._startDragging(evt);
		}

		this._performDragging(evt);

		return false;
	}

	return true;
};

/**
 * Function to handle a touch start event.
 *
 * @method _handleHeaderTouchStart
 * @param {Event} event - The event that triggered this handler.
 * @private
 */
Group.prototype._handleHeaderTouchStart = function (event) {
	var touchEvent = event.originalEvent;
	if (touchEvent.touches.length < 2 && this._trackingTouchID === null) {
		var touch = event.originalEvent.changedTouches[0];
		this._canDrag = true;
		this._trackingTouchID = touch.identifier;
		this._touchStartTime = event.timeStamp;
		this._draggingX = touch.clientX;
		this._draggingY = touch.clientY;
	} else {
		this._canDrag = false;
		this._trackingTouchID = null;
		this._touchStartTime = 0;
	}
	this._dragging = false;
};

/**
 * Function to handle a touch move event.
 *
 * @method _handleHeaderTouchMove
 * @param {Event} event - The event that triggered this handler.
 * @private
 */
Group.prototype._handleHeaderTouchMove = function (event) {
	if (this._canDrag && this._trackingTouchID !== null) {
		var touches = event.originalEvent.changedTouches;
		for (var i = 0, n = touches.length; i < n; ++i) {
			var touch = touches[i];
			if (touch.identifier === this._trackingTouchID) {
				if (this._dragging) {
					event.preventDefault();
					this._performDragging(touch);
				} else {
					var timeElapsed = event.timeStamp - this._touchStartTime;
					var distanceMoved = Math.sqrt(Math.pow(touch.clientX - this._draggingX, 2) + Math.pow(touch.clientY - this._draggingY, 2));
					if (timeElapsed > 200) {
						event.preventDefault();
						this._draggingYOffset = 0;
						this._draggingGroupTop = this._element.offset().top;
						this._startDragging(event);
						this._performDragging(touch);
					} else if (distanceMoved > 7) {
						this._canDrag = false;
						this._trackingTouchID = null;
						this._touchStartTime = 0;
					}
					break;
				}
				break;
			}
		}
	}
};

/**
 * Function to handle a touch end event.
 *
 * @method _handleHeaderTouchEnd
 * @param {Event} event - The event that triggered this handler.
 * @private
 */
Group.prototype._handleHeaderTouchEnd = function (event) {
	this._canDrag = false;
	this._trackingTouchID = null;
	this._touchStartTime = 0;
	if (this._dragging) {
		event.preventDefault();
		this._dragging = false;
		/* reset position */
		this._groupContent.removeAttr('style');
		/* trigger dragging end event */
		this.emit('facet-group:dragging:end', event, this._key);
	}
};

/**
 * Transition end event handler.
 *
 * @param {Event} event - Event to handle.
 * @private
 */
Group.prototype._handleTransitionEnd = function (event) {
	var property = event.originalEvent.propertyName;
	if (event.target === this._moreElement.get(0) && property === 'opacity') {
		if (this.collapsed) {
			this.emit('facet-group:animation:collapse-on', event, this._key);
		} else {
			this.emit('facet-group:animation:collapse-off', event, this._key);
		}
	}
};

/**
 * Sets up the group to be dragged.
 *
 * @method _startDragging
 * @param {Event|Touch} event - The event that triggered the drag.
 * @private
 */
Group.prototype._startDragging = function (event) {
	if (!this._dragging) {
		this._dragging = true;
		// dragging setup //
		this._groupContent.css({
			position: 'relative',
			top: 0,
			left: 0,
			'z-index': 999
		});
		this.emit('facet-group:dragging:start', event, this._key);
	}
};

/**
 * Performs a dragging action on this group based on the specified event.
 *
 * @method _performDragging
 * @param {Event|Touch} event - the event or touch that should be used to calculate the dragging distance.
 * @private
 */
Group.prototype._performDragging = function (event) {
	/* calculate the group dimensions */
	var groupOffset = this._element.offset();
	var groupTop = groupOffset.top;
	var groupHeight = this._element.height();

	/* calculate the new position */
	var newTop, newLeft;
	if (event.type === 'scroll') {
		var contentOffset = this._groupContent.offset();
		newTop = contentOffset.top - groupTop - this._draggingYOffset;
		newLeft = contentOffset.left - groupOffset.left;
	} else {
		newTop = event.clientY - this._draggingY;
		newLeft = event.clientX - this._draggingX;
	}

	/* calculate the scroll offset, if any */
	this._draggingYOffset += this._draggingGroupTop - groupTop;
	this._draggingGroupTop = groupTop;
	newTop += this._draggingYOffset;

	/* calculate the content dimensions */
	var contentTop = groupTop + newTop;
	var contentMiddle = contentTop + (groupHeight * 0.5);

	/* retrieve all the groups */
	var groups = this._widget._groups;

	/* iterate through the groups */
	for (var i = 0, n = groups.length; i < n; ++i) {
		var group = groups[i];
		/* get the target group measurements */
		var targetHeight = group._element.height();
		var targetTop = group._element.offset().top;
		var targetBottom = targetTop + targetHeight;
		var targetAreaThreshold = Math.min(targetHeight, groupHeight) * 0.5;

		if ((groupTop > targetTop && contentMiddle >= targetTop - targetAreaThreshold && contentMiddle <= targetTop + targetAreaThreshold) ||
			(groupTop < targetTop && contentMiddle >= targetBottom - targetAreaThreshold && contentMiddle <= targetBottom + targetAreaThreshold)){
			if (group !== this) {
				var targetOffset = 0;
				if (targetTop < groupTop) {
					group._element.before(this._element);
					targetOffset = (targetTop - groupTop);
					this._draggingY += targetOffset;
					newTop -= targetOffset;
				} else {
					group._element.after(this._element);
					targetOffset = (targetTop - groupTop) - (groupHeight - targetHeight);
					this._draggingY += targetOffset;
					newTop -= targetOffset;
				}
				this._draggingGroupTop = this._element.offset().top;

				/* update the group indices */
				this._widget.updateGroupIndices();
			}
			break;
		}
	}

	/* apply the new position */
	this._groupContent.css({
		top: newTop,
		left: newLeft
	});

	/* trigger the drag move event */
	this.emit('facet-group:dragging:move', event, this._key);
};

/**
 * @export
 * @type {Group}
 */
module.exports = Group;
