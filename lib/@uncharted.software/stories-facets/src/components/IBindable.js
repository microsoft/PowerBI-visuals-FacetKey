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

/**
 * Base interface class for objects that wish to emit events.
 *
 * @class IBindable
 * @constructor
 */
function IBindable() {
    this._handlers = {};
	this._omniHandlers = [];
	this._boundForwardEvent = this._forwardEvent.bind(this);
}

/**
 * Binds a list of events to the specified callback.
 *
 * @method on
 * @param {string|null} events - A space-separated list of events to listen for. If null is passed, the callback will be invoked for all events.
 * @param {Function} callback - The callback to invoke when the event is triggered.
 */
IBindable.prototype.on = function(events, callback) {
	if (events === null) {
		if (this._omniHandlers.indexOf(callback) < 0) {
			this._omniHandlers.push(callback);
		}
	} else {
		events.split(' ').forEach(function (event) {
			var handlers = this._handlers[event];
			if (!handlers) {
				handlers = [];
				this._handlers[event] = handlers;
			}
			if (handlers.indexOf(callback) < 0) {
				handlers.push(callback);
			}
		}.bind(this));
	}
};

/**
 * Unbinds the specified callback from the specified event. If no callback is specified, all callbacks for the specified event are removed.
 *
 * @method off
 * @param {string|null} events - A space-separated list of events to listen for. If null is passed the callback will be removed from the all-event handler list.
 * @param {Function=} callback - The callback to remove from the event or nothing to completely clear the event callbacks.
 */
IBindable.prototype.off = function(events, callback) {
	if (events === null) {
		if (!callback) {
			this._omniHandlers.length = 0;
		} else {
			var index = this._omniHandlers.indexOf(callback);
			if (index >= 0) {
				this._omniHandlers.splice(index, 1);
			}
		}
	} else {
		events.split(' ').forEach(function (event) {
			var handlers = this._handlers[event];
			if (handlers) {
				if (!callback) {
					delete this._handlers[event];
				} else {
					var toRemove = handlers.indexOf(callback);
					if (toRemove >= 0) {
						handlers.splice(toRemove, 1);
					}
				}
			}
		}.bind(this));
	}
};

/**
 * Returns all the registered handlers for the specified event.
 *
 * @method handlers
 * @param {string} event - The name of the event for which to fetch its handlers.
 * @param {boolean=} omitOmniHandlers - Should the all-event handlers be omitted from the resulting array.
 * @returns {Array}
 */
IBindable.prototype.handlers = function(event, omitOmniHandlers) {
	var handlers = (this._handlers[event] || []).slice(0);
	if (!omitOmniHandlers) {
		handlers.push.apply(handlers, this._omniHandlers);
	}
	return handlers;
};

/**
 * Emits the specified event and forwards all passed parameters.
 *
 * @method emit
 * @param {string} event - The name of the event to emit.
 * @param {...*} var_args - Arguments to forward to the event listener callbacks.
 */
IBindable.prototype.emit = function(event, var_args) {
	var handlers = this._handlers[event];
	if (handlers || this._omniHandlers.length > 0) {
		var args = arguments;
		var context = this;
		if (handlers) {
			var params = Array.prototype.slice.call(args, 1);
			handlers.forEach(function(fn) {
				fn.apply(context, params);
			});
		}

		this._omniHandlers.forEach(function(fn) {
			fn.apply(context, args);
		});
	}
};

/**
 * Forwards all events triggered by the specified `bindable` as if this object was emitting them.
 *
 * @method forward
 * @param {IBindable} bindable - The `IBindable` instance for which all events will be forwarded through this instance.
 */
IBindable.prototype.forward = function(bindable) {
	bindable.on(null, this._boundForwardEvent);
};

/**
 * Stops forwarding the events of the specified `bindable`
 *
 * @method unforward
 * @param {IBindable} bindable - The `IBindable` instance to stop forwarding.
 */
IBindable.prototype.unforward = function(bindable) {
	bindable.off(null, this._boundForwardEvent);
};

/**
 * Unbinds all events bound to this IBindable instance.
 *
 * @method destroy
 */
IBindable.prototype.destroy = function() {
	delete this._handlers;
	delete this._omniHandlers;
	delete this._boundForwardEvent;
};

/**
 * Internal method used to forward the events from other `IBindable` instances.
 *
 * @method _forwardEvent
 * @param {string} event - The name of the event to emit.
 * @param {...*} var_args - Arguments to forward to the event listener callbacks.
 * @private
 */
IBindable.prototype._forwardEvent = function(event, var_args) {
	this.emit.apply(this, arguments);
};

/**
 * @export
 * @type {IBindable}
 */
module.exports = IBindable;
