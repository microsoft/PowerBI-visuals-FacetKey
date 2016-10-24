(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Facets = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))

},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _runtime = require('./handlebars.runtime');

var _runtime2 = _interopRequireWildcard(_runtime);

// Compiler imports

var _AST = require('./handlebars/compiler/ast');

var _AST2 = _interopRequireWildcard(_AST);

var _Parser$parse = require('./handlebars/compiler/base');

var _Compiler$compile$precompile = require('./handlebars/compiler/compiler');

var _JavaScriptCompiler = require('./handlebars/compiler/javascript-compiler');

var _JavaScriptCompiler2 = _interopRequireWildcard(_JavaScriptCompiler);

var _Visitor = require('./handlebars/compiler/visitor');

var _Visitor2 = _interopRequireWildcard(_Visitor);

var _noConflict = require('./handlebars/no-conflict');

var _noConflict2 = _interopRequireWildcard(_noConflict);

var _create = _runtime2['default'].create;
function create() {
  var hb = _create();

  hb.compile = function (input, options) {
    return _Compiler$compile$precompile.compile(input, options, hb);
  };
  hb.precompile = function (input, options) {
    return _Compiler$compile$precompile.precompile(input, options, hb);
  };

  hb.AST = _AST2['default'];
  hb.Compiler = _Compiler$compile$precompile.Compiler;
  hb.JavaScriptCompiler = _JavaScriptCompiler2['default'];
  hb.Parser = _Parser$parse.parser;
  hb.parse = _Parser$parse.parse;

  return hb;
}

var inst = create();
inst.create = create;

_noConflict2['default'](inst);

inst.Visitor = _Visitor2['default'];

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];
},{"./handlebars.runtime":5,"./handlebars/compiler/ast":7,"./handlebars/compiler/base":8,"./handlebars/compiler/compiler":10,"./handlebars/compiler/javascript-compiler":12,"./handlebars/compiler/visitor":15,"./handlebars/no-conflict":18}],5:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _import = require('./handlebars/base');

var base = _interopRequireWildcard(_import);

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)

var _SafeString = require('./handlebars/safe-string');

var _SafeString2 = _interopRequireWildcard(_SafeString);

var _Exception = require('./handlebars/exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _import2 = require('./handlebars/utils');

var Utils = _interopRequireWildcard(_import2);

var _import3 = require('./handlebars/runtime');

var runtime = _interopRequireWildcard(_import3);

var _noConflict = require('./handlebars/no-conflict');

var _noConflict2 = _interopRequireWildcard(_noConflict);

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
function create() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = _SafeString2['default'];
  hb.Exception = _Exception2['default'];
  hb.Utils = Utils;
  hb.escapeExpression = Utils.escapeExpression;

  hb.VM = runtime;
  hb.template = function (spec) {
    return runtime.template(spec, hb);
  };

  return hb;
}

var inst = create();
inst.create = create;

_noConflict2['default'](inst);

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];
},{"./handlebars/base":6,"./handlebars/exception":17,"./handlebars/no-conflict":18,"./handlebars/runtime":19,"./handlebars/safe-string":20,"./handlebars/utils":21}],6:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.HandlebarsEnvironment = HandlebarsEnvironment;
exports.createFrame = createFrame;

var _import = require('./utils');

var Utils = _interopRequireWildcard(_import);

var _Exception = require('./exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var VERSION = '3.0.1';
exports.VERSION = VERSION;
var COMPILER_REVISION = 6;

exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '== 2.0.0-alpha.x',
  6: '>= 2.0.0-beta.1'
};

exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function registerHelper(name, fn) {
    if (toString.call(name) === objectType) {
      if (fn) {
        throw new _Exception2['default']('Arg not supported with multiple helpers');
      }
      Utils.extend(this.helpers, name);
    } else {
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function unregisterHelper(name) {
    delete this.helpers[name];
  },

  registerPartial: function registerPartial(name, partial) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials, name);
    } else {
      if (typeof partial === 'undefined') {
        throw new _Exception2['default']('Attempting to register a partial as undefined');
      }
      this.partials[name] = partial;
    }
  },
  unregisterPartial: function unregisterPartial(name) {
    delete this.partials[name];
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function () {
    if (arguments.length === 1) {
      // A missing field in a {{foo}} constuct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new _Exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
    }
  });

  instance.registerHelper('blockHelperMissing', function (context, options) {
    var inverse = options.inverse,
        fn = options.fn;

    if (context === true) {
      return fn(this);
    } else if (context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if (context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
        options = { data: data };
      }

      return fn(context, options);
    }
  });

  instance.registerHelper('each', function (context, options) {
    if (!options) {
      throw new _Exception2['default']('Must pass iterator to #each');
    }

    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        ret = '',
        data = undefined,
        contextPath = undefined;

    if (options.data && options.ids) {
      contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (isFunction(context)) {
      context = context.call(this);
    }

    if (options.data) {
      data = createFrame(options.data);
    }

    function execIteration(field, index, last) {
      if (data) {
        data.key = field;
        data.index = index;
        data.first = index === 0;
        data.last = !!last;

        if (contextPath) {
          data.contextPath = contextPath + field;
        }
      }

      ret = ret + fn(context[field], {
        data: data,
        blockParams: Utils.blockParams([context[field], field], [contextPath + field, null])
      });
    }

    if (context && typeof context === 'object') {
      if (isArray(context)) {
        for (var j = context.length; i < j; i++) {
          execIteration(i, i, i === context.length - 1);
        }
      } else {
        var priorKey = undefined;

        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            // We're running the iterations one step out of sync so we can detect
            // the last iteration without have to scan the object twice and create
            // an itermediate keys array.
            if (priorKey) {
              execIteration(priorKey, i - 1);
            }
            priorKey = key;
            i++;
          }
        }
        if (priorKey) {
          execIteration(priorKey, i - 1, true);
        }
      }
    }

    if (i === 0) {
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function (conditional, options) {
    if (isFunction(conditional)) {
      conditional = conditional.call(this);
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if (!options.hash.includeZero && !conditional || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function (conditional, options) {
    return instance.helpers['if'].call(this, conditional, { fn: options.inverse, inverse: options.fn, hash: options.hash });
  });

  instance.registerHelper('with', function (context, options) {
    if (isFunction(context)) {
      context = context.call(this);
    }

    var fn = options.fn;

    if (!Utils.isEmpty(context)) {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
        options = { data: data };
      }

      return fn(context, options);
    } else {
      return options.inverse(this);
    }
  });

  instance.registerHelper('log', function (message, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, message);
  });

  instance.registerHelper('lookup', function (obj, field) {
    return obj && obj[field];
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 1,

  // Can be overridden in the host environment
  log: function log(level, message) {
    if (typeof console !== 'undefined' && logger.level <= level) {
      var method = logger.methodMap[level];
      (console[method] || console.log).call(console, message); // eslint-disable-line no-console
    }
  }
};

exports.logger = logger;
var log = logger.log;

exports.log = log;

function createFrame(object) {
  var frame = Utils.extend({}, object);
  frame._parent = object;
  return frame;
}

/* [args, ]options */
},{"./exception":17,"./utils":21}],7:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var AST = {
  Program: function Program(statements, blockParams, strip, locInfo) {
    this.loc = locInfo;
    this.type = 'Program';
    this.body = statements;

    this.blockParams = blockParams;
    this.strip = strip;
  },

  MustacheStatement: function MustacheStatement(path, params, hash, escaped, strip, locInfo) {
    this.loc = locInfo;
    this.type = 'MustacheStatement';

    this.path = path;
    this.params = params || [];
    this.hash = hash;
    this.escaped = escaped;

    this.strip = strip;
  },

  BlockStatement: function BlockStatement(path, params, hash, program, inverse, openStrip, inverseStrip, closeStrip, locInfo) {
    this.loc = locInfo;
    this.type = 'BlockStatement';

    this.path = path;
    this.params = params || [];
    this.hash = hash;
    this.program = program;
    this.inverse = inverse;

    this.openStrip = openStrip;
    this.inverseStrip = inverseStrip;
    this.closeStrip = closeStrip;
  },

  PartialStatement: function PartialStatement(name, params, hash, strip, locInfo) {
    this.loc = locInfo;
    this.type = 'PartialStatement';

    this.name = name;
    this.params = params || [];
    this.hash = hash;

    this.indent = '';
    this.strip = strip;
  },

  ContentStatement: function ContentStatement(string, locInfo) {
    this.loc = locInfo;
    this.type = 'ContentStatement';
    this.original = this.value = string;
  },

  CommentStatement: function CommentStatement(comment, strip, locInfo) {
    this.loc = locInfo;
    this.type = 'CommentStatement';
    this.value = comment;

    this.strip = strip;
  },

  SubExpression: function SubExpression(path, params, hash, locInfo) {
    this.loc = locInfo;

    this.type = 'SubExpression';
    this.path = path;
    this.params = params || [];
    this.hash = hash;
  },

  PathExpression: function PathExpression(data, depth, parts, original, locInfo) {
    this.loc = locInfo;
    this.type = 'PathExpression';

    this.data = data;
    this.original = original;
    this.parts = parts;
    this.depth = depth;
  },

  StringLiteral: function StringLiteral(string, locInfo) {
    this.loc = locInfo;
    this.type = 'StringLiteral';
    this.original = this.value = string;
  },

  NumberLiteral: function NumberLiteral(number, locInfo) {
    this.loc = locInfo;
    this.type = 'NumberLiteral';
    this.original = this.value = Number(number);
  },

  BooleanLiteral: function BooleanLiteral(bool, locInfo) {
    this.loc = locInfo;
    this.type = 'BooleanLiteral';
    this.original = this.value = bool === 'true';
  },

  UndefinedLiteral: function UndefinedLiteral(locInfo) {
    this.loc = locInfo;
    this.type = 'UndefinedLiteral';
    this.original = this.value = undefined;
  },

  NullLiteral: function NullLiteral(locInfo) {
    this.loc = locInfo;
    this.type = 'NullLiteral';
    this.original = this.value = null;
  },

  Hash: function Hash(pairs, locInfo) {
    this.loc = locInfo;
    this.type = 'Hash';
    this.pairs = pairs;
  },
  HashPair: function HashPair(key, value, locInfo) {
    this.loc = locInfo;
    this.type = 'HashPair';
    this.key = key;
    this.value = value;
  },

  // Public API used to evaluate derived attributes regarding AST nodes
  helpers: {
    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    helperExpression: function helperExpression(node) {
      return !!(node.type === 'SubExpression' || node.params.length || node.hash);
    },

    scopedId: function scopedId(path) {
      return /^\.|this\b/.test(path.original);
    },

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    simpleId: function simpleId(path) {
      return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
    }
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// must modify the object to operate properly.
exports['default'] = AST;
module.exports = exports['default'];
},{}],8:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.parse = parse;

var _parser = require('./parser');

var _parser2 = _interopRequireWildcard(_parser);

var _AST = require('./ast');

var _AST2 = _interopRequireWildcard(_AST);

var _WhitespaceControl = require('./whitespace-control');

var _WhitespaceControl2 = _interopRequireWildcard(_WhitespaceControl);

var _import = require('./helpers');

var Helpers = _interopRequireWildcard(_import);

var _extend = require('../utils');

exports.parser = _parser2['default'];

var yy = {};
_extend.extend(yy, Helpers, _AST2['default']);

function parse(input, options) {
  // Just return if an already-compiled AST was passed in.
  if (input.type === 'Program') {
    return input;
  }

  _parser2['default'].yy = yy;

  // Altering the shared object here, but this is ok as parser is a sync operation
  yy.locInfo = function (locInfo) {
    return new yy.SourceLocation(options && options.srcName, locInfo);
  };

  var strip = new _WhitespaceControl2['default']();
  return strip.accept(_parser2['default'].parse(input));
}
},{"../utils":21,"./ast":7,"./helpers":11,"./parser":13,"./whitespace-control":16}],9:[function(require,module,exports){
'use strict';

exports.__esModule = true;
/*global define */

var _isArray = require('../utils');

var SourceNode = undefined;

try {
  /* istanbul ignore next */
  if (typeof define !== 'function' || !define.amd) {
    // We don't support this in AMD environments. For these environments, we asusme that
    // they are running on the browser and thus have no need for the source-map library.
    var SourceMap = require('source-map');
    SourceNode = SourceMap.SourceNode;
  }
} catch (err) {}

/* istanbul ignore if: tested but not covered in istanbul due to dist build  */
if (!SourceNode) {
  SourceNode = function (line, column, srcFile, chunks) {
    this.src = '';
    if (chunks) {
      this.add(chunks);
    }
  };
  /* istanbul ignore next */
  SourceNode.prototype = {
    add: function add(chunks) {
      if (_isArray.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src += chunks;
    },
    prepend: function prepend(chunks) {
      if (_isArray.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src = chunks + this.src;
    },
    toStringWithSourceMap: function toStringWithSourceMap() {
      return { code: this.toString() };
    },
    toString: function toString() {
      return this.src;
    }
  };
}

function castChunk(chunk, codeGen, loc) {
  if (_isArray.isArray(chunk)) {
    var ret = [];

    for (var i = 0, len = chunk.length; i < len; i++) {
      ret.push(codeGen.wrap(chunk[i], loc));
    }
    return ret;
  } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
    // Handle primitives that the SourceNode will throw up on
    return chunk + '';
  }
  return chunk;
}

function CodeGen(srcFile) {
  this.srcFile = srcFile;
  this.source = [];
}

CodeGen.prototype = {
  prepend: function prepend(source, loc) {
    this.source.unshift(this.wrap(source, loc));
  },
  push: function push(source, loc) {
    this.source.push(this.wrap(source, loc));
  },

  merge: function merge() {
    var source = this.empty();
    this.each(function (line) {
      source.add(['  ', line, '\n']);
    });
    return source;
  },

  each: function each(iter) {
    for (var i = 0, len = this.source.length; i < len; i++) {
      iter(this.source[i]);
    }
  },

  empty: function empty() {
    var loc = arguments[0] === undefined ? this.currentLocation || { start: {} } : arguments[0];

    return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
  },
  wrap: function wrap(chunk) {
    var loc = arguments[1] === undefined ? this.currentLocation || { start: {} } : arguments[1];

    if (chunk instanceof SourceNode) {
      return chunk;
    }

    chunk = castChunk(chunk, this, loc);

    return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
  },

  functionCall: function functionCall(fn, type, params) {
    params = this.generateList(params);
    return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
  },

  quotedString: function quotedString(str) {
    return '"' + (str + '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028') // Per Ecma-262 7.3 + 7.8.4
    .replace(/\u2029/g, '\\u2029') + '"';
  },

  objectLiteral: function objectLiteral(obj) {
    var pairs = [];

    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var value = castChunk(obj[key], this);
        if (value !== 'undefined') {
          pairs.push([this.quotedString(key), ':', value]);
        }
      }
    }

    var ret = this.generateList(pairs);
    ret.prepend('{');
    ret.add('}');
    return ret;
  },

  generateList: function generateList(entries, loc) {
    var ret = this.empty(loc);

    for (var i = 0, len = entries.length; i < len; i++) {
      if (i) {
        ret.add(',');
      }

      ret.add(castChunk(entries[i], this, loc));
    }

    return ret;
  },

  generateArray: function generateArray(entries, loc) {
    var ret = this.generateList(entries, loc);
    ret.prepend('[');
    ret.add(']');

    return ret;
  }
};

exports['default'] = CodeGen;
module.exports = exports['default'];

/* NOP */
},{"../utils":21,"source-map":23}],10:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.Compiler = Compiler;
exports.precompile = precompile;
exports.compile = compile;

var _Exception = require('../exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _isArray$indexOf = require('../utils');

var _AST = require('./ast');

var _AST2 = _interopRequireWildcard(_AST);

var slice = [].slice;

function Compiler() {}

// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  equals: function equals(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
        return false;
      }
    }

    // We know that length is the same between the two arrays because they are directly tied
    // to the opcode behavior above.
    len = this.children.length;
    for (var i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function compile(program, options) {
    this.sourceNode = [];
    this.opcodes = [];
    this.children = [];
    this.options = options;
    this.stringParams = options.stringParams;
    this.trackIds = options.trackIds;

    options.blockParams = options.blockParams || [];

    // These changes will propagate to the other compiler components
    var knownHelpers = options.knownHelpers;
    options.knownHelpers = {
      helperMissing: true,
      blockHelperMissing: true,
      each: true,
      'if': true,
      unless: true,
      'with': true,
      log: true,
      lookup: true
    };
    if (knownHelpers) {
      for (var _name in knownHelpers) {
        if (_name in knownHelpers) {
          options.knownHelpers[_name] = knownHelpers[_name];
        }
      }
    }

    return this.accept(program);
  },

  compileProgram: function compileProgram(program) {
    var childCompiler = new this.compiler(),
        // eslint-disable-line new-cap
    result = childCompiler.compile(program, this.options),
        guid = this.guid++;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;
    this.useDepths = this.useDepths || result.useDepths;

    return guid;
  },

  accept: function accept(node) {
    this.sourceNode.unshift(node);
    var ret = this[node.type](node);
    this.sourceNode.shift();
    return ret;
  },

  Program: function Program(program) {
    this.options.blockParams.unshift(program.blockParams);

    var body = program.body,
        bodyLength = body.length;
    for (var i = 0; i < bodyLength; i++) {
      this.accept(body[i]);
    }

    this.options.blockParams.shift();

    this.isSimple = bodyLength === 1;
    this.blockParams = program.blockParams ? program.blockParams.length : 0;

    return this;
  },

  BlockStatement: function BlockStatement(block) {
    transformLiteralToPath(block);

    var program = block.program,
        inverse = block.inverse;

    program = program && this.compileProgram(program);
    inverse = inverse && this.compileProgram(inverse);

    var type = this.classifySexpr(block);

    if (type === 'helper') {
      this.helperSexpr(block, program, inverse);
    } else if (type === 'simple') {
      this.simpleSexpr(block);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue', block.path.original);
    } else {
      this.ambiguousSexpr(block, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  PartialStatement: function PartialStatement(partial) {
    this.usePartial = true;

    var params = partial.params;
    if (params.length > 1) {
      throw new _Exception2['default']('Unsupported number of partial arguments: ' + params.length, partial);
    } else if (!params.length) {
      params.push({ type: 'PathExpression', parts: [], depth: 0 });
    }

    var partialName = partial.name.original,
        isDynamic = partial.name.type === 'SubExpression';
    if (isDynamic) {
      this.accept(partial.name);
    }

    this.setupFullMustacheParams(partial, undefined, undefined, true);

    var indent = partial.indent || '';
    if (this.options.preventIndent && indent) {
      this.opcode('appendContent', indent);
      indent = '';
    }

    this.opcode('invokePartial', isDynamic, partialName, indent);
    this.opcode('append');
  },

  MustacheStatement: function MustacheStatement(mustache) {
    this.SubExpression(mustache); // eslint-disable-line new-cap

    if (mustache.escaped && !this.options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },

  ContentStatement: function ContentStatement(content) {
    if (content.value) {
      this.opcode('appendContent', content.value);
    }
  },

  CommentStatement: function CommentStatement() {},

  SubExpression: function SubExpression(sexpr) {
    transformLiteralToPath(sexpr);
    var type = this.classifySexpr(sexpr);

    if (type === 'simple') {
      this.simpleSexpr(sexpr);
    } else if (type === 'helper') {
      this.helperSexpr(sexpr);
    } else {
      this.ambiguousSexpr(sexpr);
    }
  },
  ambiguousSexpr: function ambiguousSexpr(sexpr, program, inverse) {
    var path = sexpr.path,
        name = path.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', path.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    this.accept(path);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleSexpr: function simpleSexpr(sexpr) {
    this.accept(sexpr.path);
    this.opcode('resolvePossibleLambda');
  },

  helperSexpr: function helperSexpr(sexpr, program, inverse) {
    var params = this.setupFullMustacheParams(sexpr, program, inverse),
        path = sexpr.path,
        name = path.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new _Exception2['default']('You specified knownHelpersOnly, but used the unknown helper ' + name, sexpr);
    } else {
      path.falsy = true;

      this.accept(path);
      this.opcode('invokeHelper', params.length, path.original, _AST2['default'].helpers.simpleId(path));
    }
  },

  PathExpression: function PathExpression(path) {
    this.addDepth(path.depth);
    this.opcode('getContext', path.depth);

    var name = path.parts[0],
        scoped = _AST2['default'].helpers.scopedId(path),
        blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

    if (blockParamId) {
      this.opcode('lookupBlockParam', blockParamId, path.parts);
    } else if (!name) {
      // Context reference, i.e. `{{foo .}}` or `{{foo ..}}`
      this.opcode('pushContext');
    } else if (path.data) {
      this.options.data = true;
      this.opcode('lookupData', path.depth, path.parts);
    } else {
      this.opcode('lookupOnContext', path.parts, path.falsy, scoped);
    }
  },

  StringLiteral: function StringLiteral(string) {
    this.opcode('pushString', string.value);
  },

  NumberLiteral: function NumberLiteral(number) {
    this.opcode('pushLiteral', number.value);
  },

  BooleanLiteral: function BooleanLiteral(bool) {
    this.opcode('pushLiteral', bool.value);
  },

  UndefinedLiteral: function UndefinedLiteral() {
    this.opcode('pushLiteral', 'undefined');
  },

  NullLiteral: function NullLiteral() {
    this.opcode('pushLiteral', 'null');
  },

  Hash: function Hash(hash) {
    var pairs = hash.pairs,
        i = 0,
        l = pairs.length;

    this.opcode('pushHash');

    for (; i < l; i++) {
      this.pushParam(pairs[i].value);
    }
    while (i--) {
      this.opcode('assignToHash', pairs[i].key);
    }
    this.opcode('popHash');
  },

  // HELPERS
  opcode: function opcode(name) {
    this.opcodes.push({ opcode: name, args: slice.call(arguments, 1), loc: this.sourceNode[0].loc });
  },

  addDepth: function addDepth(depth) {
    if (!depth) {
      return;
    }

    this.useDepths = true;
  },

  classifySexpr: function classifySexpr(sexpr) {
    var isSimple = _AST2['default'].helpers.simpleId(sexpr.path);

    var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    var isHelper = !isBlockParam && _AST2['default'].helpers.helperExpression(sexpr);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
    var isEligible = !isBlockParam && (isHelper || isSimple);

    // if ambiguous, we can possibly resolve the ambiguity now
    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
    if (isEligible && !isHelper) {
      var _name2 = sexpr.path.parts[0],
          options = this.options;

      if (options.knownHelpers[_name2]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) {
      return 'helper';
    } else if (isEligible) {
      return 'ambiguous';
    } else {
      return 'simple';
    }
  },

  pushParams: function pushParams(params) {
    for (var i = 0, l = params.length; i < l; i++) {
      this.pushParam(params[i]);
    }
  },

  pushParam: function pushParam(val) {
    var value = val.value != null ? val.value : val.original || '';

    if (this.stringParams) {
      if (value.replace) {
        value = value.replace(/^(\.?\.\/)*/g, '').replace(/\//g, '.');
      }

      if (val.depth) {
        this.addDepth(val.depth);
      }
      this.opcode('getContext', val.depth || 0);
      this.opcode('pushStringParam', value, val.type);

      if (val.type === 'SubExpression') {
        // SubExpressions get evaluated and passed in
        // in string params mode.
        this.accept(val);
      }
    } else {
      if (this.trackIds) {
        var blockParamIndex = undefined;
        if (val.parts && !_AST2['default'].helpers.scopedId(val) && !val.depth) {
          blockParamIndex = this.blockParamIndex(val.parts[0]);
        }
        if (blockParamIndex) {
          var blockParamChild = val.parts.slice(1).join('.');
          this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
        } else {
          value = val.original || value;
          if (value.replace) {
            value = value.replace(/^\.\//g, '').replace(/^\.$/g, '');
          }

          this.opcode('pushId', val.type, value);
        }
      }
      this.accept(val);
    }
  },

  setupFullMustacheParams: function setupFullMustacheParams(sexpr, program, inverse, omitEmpty) {
    var params = sexpr.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if (sexpr.hash) {
      this.accept(sexpr.hash);
    } else {
      this.opcode('emptyHash', omitEmpty);
    }

    return params;
  },

  blockParamIndex: function blockParamIndex(name) {
    for (var depth = 0, len = this.options.blockParams.length; depth < len; depth++) {
      var blockParams = this.options.blockParams[depth],
          param = blockParams && _isArray$indexOf.indexOf(blockParams, name);
      if (blockParams && param >= 0) {
        return [depth, param];
      }
    }
  }
};

function precompile(input, options, env) {
  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _Exception2['default']('You must pass a string or Handlebars AST to Handlebars.precompile. You passed ' + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var ast = env.parse(input, options),
      environment = new env.Compiler().compile(ast, options);
  return new env.JavaScriptCompiler().compile(environment, options);
}

function compile(input, _x, env) {
  var options = arguments[1] === undefined ? {} : arguments[1];

  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _Exception2['default']('You must pass a string or Handlebars AST to Handlebars.compile. You passed ' + input);
  }

  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var compiled = undefined;

  function compileInput() {
    var ast = env.parse(input, options),
        environment = new env.Compiler().compile(ast, options),
        templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
    return env.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  function ret(context, execOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.call(this, context, execOptions);
  }
  ret._setup = function (setupOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._setup(setupOptions);
  };
  ret._child = function (i, data, blockParams, depths) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._child(i, data, blockParams, depths);
  };
  return ret;
}

function argEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (_isArray$indexOf.isArray(a) && _isArray$indexOf.isArray(b) && a.length === b.length) {
    for (var i = 0; i < a.length; i++) {
      if (!argEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
}

function transformLiteralToPath(sexpr) {
  if (!sexpr.path.parts) {
    var literal = sexpr.path;
    // Casting to string here to make false and 0 literal values play nicely with the rest
    // of the system.
    sexpr.path = new _AST2['default'].PathExpression(false, 0, [literal.original + ''], literal.original + '', literal.loc);
  }
}
},{"../exception":17,"../utils":21,"./ast":7}],11:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.SourceLocation = SourceLocation;
exports.id = id;
exports.stripFlags = stripFlags;
exports.stripComment = stripComment;
exports.preparePath = preparePath;
exports.prepareMustache = prepareMustache;
exports.prepareRawBlock = prepareRawBlock;
exports.prepareBlock = prepareBlock;

var _Exception = require('../exception');

var _Exception2 = _interopRequireWildcard(_Exception);

function SourceLocation(source, locInfo) {
  this.source = source;
  this.start = {
    line: locInfo.first_line,
    column: locInfo.first_column
  };
  this.end = {
    line: locInfo.last_line,
    column: locInfo.last_column
  };
}

function id(token) {
  if (/^\[.*\]$/.test(token)) {
    return token.substr(1, token.length - 2);
  } else {
    return token;
  }
}

function stripFlags(open, close) {
  return {
    open: open.charAt(2) === '~',
    close: close.charAt(close.length - 3) === '~'
  };
}

function stripComment(comment) {
  return comment.replace(/^\{\{~?\!-?-?/, '').replace(/-?-?~?\}\}$/, '');
}

function preparePath(data, parts, locInfo) {
  locInfo = this.locInfo(locInfo);

  var original = data ? '@' : '',
      dig = [],
      depth = 0,
      depthString = '';

  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i].part,

    // If we have [] syntax then we do not treat path references as operators,
    // i.e. foo.[this] resolves to approximately context.foo['this']
    isLiteral = parts[i].original !== part;
    original += (parts[i].separator || '') + part;

    if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
      if (dig.length > 0) {
        throw new _Exception2['default']('Invalid path: ' + original, { loc: locInfo });
      } else if (part === '..') {
        depth++;
        depthString += '../';
      }
    } else {
      dig.push(part);
    }
  }

  return new this.PathExpression(data, depth, dig, original, locInfo);
}

function prepareMustache(path, params, hash, open, strip, locInfo) {
  // Must use charAt to support IE pre-10
  var escapeFlag = open.charAt(3) || open.charAt(2),
      escaped = escapeFlag !== '{' && escapeFlag !== '&';

  return new this.MustacheStatement(path, params, hash, escaped, strip, this.locInfo(locInfo));
}

function prepareRawBlock(openRawBlock, content, close, locInfo) {
  if (openRawBlock.path.original !== close) {
    var errorNode = { loc: openRawBlock.path.loc };

    throw new _Exception2['default'](openRawBlock.path.original + ' doesn\'t match ' + close, errorNode);
  }

  locInfo = this.locInfo(locInfo);
  var program = new this.Program([content], null, {}, locInfo);

  return new this.BlockStatement(openRawBlock.path, openRawBlock.params, openRawBlock.hash, program, undefined, {}, {}, {}, locInfo);
}

function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
  // When we are chaining inverse calls, we will not have a close path
  if (close && close.path && openBlock.path.original !== close.path.original) {
    var errorNode = { loc: openBlock.path.loc };

    throw new _Exception2['default'](openBlock.path.original + ' doesn\'t match ' + close.path.original, errorNode);
  }

  program.blockParams = openBlock.blockParams;

  var inverse = undefined,
      inverseStrip = undefined;

  if (inverseAndProgram) {
    if (inverseAndProgram.chain) {
      inverseAndProgram.program.body[0].closeStrip = close.strip;
    }

    inverseStrip = inverseAndProgram.strip;
    inverse = inverseAndProgram.program;
  }

  if (inverted) {
    inverted = inverse;
    inverse = program;
    program = inverted;
  }

  return new this.BlockStatement(openBlock.path, openBlock.params, openBlock.hash, program, inverse, openBlock.strip, inverseStrip, close && close.strip, this.locInfo(locInfo));
}
},{"../exception":17}],12:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _COMPILER_REVISION$REVISION_CHANGES = require('../base');

var _Exception = require('../exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _isArray = require('../utils');

var _CodeGen = require('./code-gen');

var _CodeGen2 = _interopRequireWildcard(_CodeGen);

function Literal(value) {
  this.value = value;
}

function JavaScriptCompiler() {}

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function nameLookup(parent, name /* , type*/) {
    if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      return [parent, '.', name];
    } else {
      return [parent, '[\'', name, '\']'];
    }
  },
  depthedLookup: function depthedLookup(name) {
    return [this.aliasable('this.lookup'), '(depths, "', name, '")'];
  },

  compilerInfo: function compilerInfo() {
    var revision = _COMPILER_REVISION$REVISION_CHANGES.COMPILER_REVISION,
        versions = _COMPILER_REVISION$REVISION_CHANGES.REVISION_CHANGES[revision];
    return [revision, versions];
  },

  appendToBuffer: function appendToBuffer(source, location, explicit) {
    // Force a source as this simplifies the merge logic.
    if (!_isArray.isArray(source)) {
      source = [source];
    }
    source = this.source.wrap(source, location);

    if (this.environment.isSimple) {
      return ['return ', source, ';'];
    } else if (explicit) {
      // This is a case where the buffer operation occurs as a child of another
      // construct, generally braces. We have to explicitly output these buffer
      // operations to ensure that the emitted code goes in the correct location.
      return ['buffer += ', source, ';'];
    } else {
      source.appendToBuffer = true;
      return source;
    }
  },

  initializeBuffer: function initializeBuffer() {
    return this.quotedString('');
  },
  // END PUBLIC API

  compile: function compile(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options;
    this.stringParams = this.options.stringParams;
    this.trackIds = this.options.trackIds;
    this.precompile = !asObject;

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      programs: [],
      environments: []
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.aliases = {};
    this.registers = { list: [] };
    this.hashes = [];
    this.compileStack = [];
    this.inlineStack = [];
    this.blockParams = [];

    this.compileChildren(environment, options);

    this.useDepths = this.useDepths || environment.useDepths || this.options.compat;
    this.useBlockParams = this.useBlockParams || environment.useBlockParams;

    var opcodes = environment.opcodes,
        opcode = undefined,
        firstLoc = undefined,
        i = undefined,
        l = undefined;

    for (i = 0, l = opcodes.length; i < l; i++) {
      opcode = opcodes[i];

      this.source.currentLocation = opcode.loc;
      firstLoc = firstLoc || opcode.loc;
      this[opcode.opcode].apply(this, opcode.args);
    }

    // Flush any trailing content that might be pending.
    this.source.currentLocation = firstLoc;
    this.pushSource('');

    /* istanbul ignore next */
    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
      throw new _Exception2['default']('Compile completed with content left on stack');
    }

    var fn = this.createFunctionContext(asObject);
    if (!this.isChild) {
      var ret = {
        compiler: this.compilerInfo(),
        main: fn
      };
      var programs = this.context.programs;
      for (i = 0, l = programs.length; i < l; i++) {
        if (programs[i]) {
          ret[i] = programs[i];
        }
      }

      if (this.environment.usePartial) {
        ret.usePartial = true;
      }
      if (this.options.data) {
        ret.useData = true;
      }
      if (this.useDepths) {
        ret.useDepths = true;
      }
      if (this.useBlockParams) {
        ret.useBlockParams = true;
      }
      if (this.options.compat) {
        ret.compat = true;
      }

      if (!asObject) {
        ret.compiler = JSON.stringify(ret.compiler);

        this.source.currentLocation = { start: { line: 1, column: 0 } };
        ret = this.objectLiteral(ret);

        if (options.srcName) {
          ret = ret.toStringWithSourceMap({ file: options.destName });
          ret.map = ret.map && ret.map.toString();
        } else {
          ret = ret.toString();
        }
      } else {
        ret.compilerOptions = this.options;
      }

      return ret;
    } else {
      return fn;
    }
  },

  preamble: function preamble() {
    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = new _CodeGen2['default'](this.options.srcName);
  },

  createFunctionContext: function createFunctionContext(asObject) {
    var varDeclarations = '';

    var locals = this.stackVars.concat(this.registers.list);
    if (locals.length > 0) {
      varDeclarations += ', ' + locals.join(', ');
    }

    // Generate minimizer alias mappings
    //
    // When using true SourceNodes, this will update all references to the given alias
    // as the source nodes are reused in situ. For the non-source node compilation mode,
    // aliases will not be used, but this case is already being run on the client and
    // we aren't concern about minimizing the template size.
    var aliasCount = 0;
    for (var alias in this.aliases) {
      // eslint-disable-line guard-for-in
      var node = this.aliases[alias];

      if (this.aliases.hasOwnProperty(alias) && node.children && node.referenceCount > 1) {
        varDeclarations += ', alias' + ++aliasCount + '=' + alias;
        node.children[0] = 'alias' + aliasCount;
      }
    }

    var params = ['depth0', 'helpers', 'partials', 'data'];

    if (this.useBlockParams || this.useDepths) {
      params.push('blockParams');
    }
    if (this.useDepths) {
      params.push('depths');
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource(varDeclarations);

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
    }
  },
  mergeSource: function mergeSource(varDeclarations) {
    var isSimple = this.environment.isSimple,
        appendOnly = !this.forceBuffer,
        appendFirst = undefined,
        sourceSeen = undefined,
        bufferStart = undefined,
        bufferEnd = undefined;
    this.source.each(function (line) {
      if (line.appendToBuffer) {
        if (bufferStart) {
          line.prepend('  + ');
        } else {
          bufferStart = line;
        }
        bufferEnd = line;
      } else {
        if (bufferStart) {
          if (!sourceSeen) {
            appendFirst = true;
          } else {
            bufferStart.prepend('buffer += ');
          }
          bufferEnd.add(';');
          bufferStart = bufferEnd = undefined;
        }

        sourceSeen = true;
        if (!isSimple) {
          appendOnly = false;
        }
      }
    });

    if (appendOnly) {
      if (bufferStart) {
        bufferStart.prepend('return ');
        bufferEnd.add(';');
      } else if (!sourceSeen) {
        this.source.push('return "";');
      }
    } else {
      varDeclarations += ', buffer = ' + (appendFirst ? '' : this.initializeBuffer());

      if (bufferStart) {
        bufferStart.prepend('return buffer + ');
        bufferEnd.add(';');
      } else {
        this.source.push('return buffer;');
      }
    }

    if (varDeclarations) {
      this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
    }

    return this.source.merge();
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function blockValue(name) {
    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs(name, 0, params);

    var blockName = this.popStack();
    params.splice(1, 0, blockName);

    this.push(this.source.functionCall(blockHelperMissing, 'call', params));
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function ambiguousBlockValue() {
    // We're being a bit cheeky and reusing the options value from the prior exec
    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs('', 0, params, true);

    this.flushInline();

    var current = this.topStack();
    params.splice(1, 0, current);

    this.pushSource(['if (!', this.lastHelper, ') { ', current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params), '}']);
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function appendContent(content) {
    if (this.pendingContent) {
      content = this.pendingContent + content;
    } else {
      this.pendingLocation = this.source.currentLocation;
    }

    this.pendingContent = content;
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function append() {
    if (this.isInline()) {
      this.replaceStack(function (current) {
        return [' != null ? ', current, ' : ""'];
      });

      this.pushSource(this.appendToBuffer(this.popStack()));
    } else {
      var local = this.popStack();
      this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
      if (this.environment.isSimple) {
        this.pushSource(['else { ', this.appendToBuffer('\'\'', undefined, true), ' }']);
      }
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function appendEscaped() {
    this.pushSource(this.appendToBuffer([this.aliasable('this.escapeExpression'), '(', this.popStack(), ')']));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function getContext(depth) {
    this.lastContext = depth;
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function pushContext() {
    this.pushStackLiteral(this.contextName(this.lastContext));
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function lookupOnContext(parts, falsy, scoped) {
    var i = 0;

    if (!scoped && this.options.compat && !this.lastContext) {
      // The depthed query is expected to handle the undefined logic for the root level that
      // is implemented below, so we evaluate that directly in compat mode
      this.push(this.depthedLookup(parts[i++]));
    } else {
      this.pushContext();
    }

    this.resolvePath('context', parts, i, falsy);
  },

  // [lookupBlockParam]
  //
  // On stack, before: ...
  // On stack, after: blockParam[name], ...
  //
  // Looks up the value of `parts` on the given block param and pushes
  // it onto the stack.
  lookupBlockParam: function lookupBlockParam(blockParamId, parts) {
    this.useBlockParams = true;

    this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
    this.resolvePath('context', parts, 1);
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data, ...
  //
  // Push the data lookup operator
  lookupData: function lookupData(depth, parts) {
    if (!depth) {
      this.pushStackLiteral('data');
    } else {
      this.pushStackLiteral('this.data(data, ' + depth + ')');
    }

    this.resolvePath('data', parts, 0, true);
  },

  resolvePath: function resolvePath(type, parts, i, falsy) {
    var _this = this;

    if (this.options.strict || this.options.assumeObjects) {
      this.push(strictLookup(this.options.strict, this, parts, type));
      return;
    }

    var len = parts.length;
    for (; i < len; i++) {
      /*eslint-disable no-loop-func */
      this.replaceStack(function (current) {
        var lookup = _this.nameLookup(current, parts[i], type);
        // We want to ensure that zero and false are handled properly if the context (falsy flag)
        // needs to have the special handling for these values.
        if (!falsy) {
          return [' != null ? ', lookup, ' : ', current];
        } else {
          // Otherwise we can use generic falsy handling
          return [' && ', lookup];
        }
      });
      /*eslint-enable no-loop-func */
    }
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function resolvePossibleLambda() {
    this.push([this.aliasable('this.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function pushStringParam(string, type) {
    this.pushContext();
    this.pushString(type);

    // If it's a subexpression, the string result
    // will be pushed after this opcode.
    if (type !== 'SubExpression') {
      if (typeof string === 'string') {
        this.pushString(string);
      } else {
        this.pushStackLiteral(string);
      }
    }
  },

  emptyHash: function emptyHash(omitEmpty) {
    if (this.trackIds) {
      this.push('{}'); // hashIds
    }
    if (this.stringParams) {
      this.push('{}'); // hashContexts
      this.push('{}'); // hashTypes
    }
    this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
  },
  pushHash: function pushHash() {
    if (this.hash) {
      this.hashes.push(this.hash);
    }
    this.hash = { values: [], types: [], contexts: [], ids: [] };
  },
  popHash: function popHash() {
    var hash = this.hash;
    this.hash = this.hashes.pop();

    if (this.trackIds) {
      this.push(this.objectLiteral(hash.ids));
    }
    if (this.stringParams) {
      this.push(this.objectLiteral(hash.contexts));
      this.push(this.objectLiteral(hash.types));
    }

    this.push(this.objectLiteral(hash.values));
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function pushString(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function pushLiteral(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function pushProgram(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function invokeHelper(paramSize, name, isSimple) {
    var nonHelper = this.popStack(),
        helper = this.setupHelper(paramSize, name),
        simple = isSimple ? [helper.name, ' || '] : '';

    var lookup = ['('].concat(simple, nonHelper);
    if (!this.options.strict) {
      lookup.push(' || ', this.aliasable('helpers.helperMissing'));
    }
    lookup.push(')');

    this.push(this.source.functionCall(lookup, 'call', helper.callParams));
  },

  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function invokeKnownHelper(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function invokeAmbiguous(name, helperCall) {
    this.useRegister('helper');

    var nonHelper = this.popStack();

    this.emptyHash();
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
    if (!this.options.strict) {
      lookup[0] = '(helper = ';
      lookup.push(' != null ? helper : ', this.aliasable('helpers.helperMissing'));
    }

    this.push(['(', lookup, helper.paramsInit ? ['),(', helper.paramsInit] : [], '),', '(typeof helper === ', this.aliasable('"function"'), ' ? ', this.source.functionCall('helper', 'call', helper.callParams), ' : helper))']);
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function invokePartial(isDynamic, name, indent) {
    var params = [],
        options = this.setupParams(name, 1, params, false);

    if (isDynamic) {
      name = this.popStack();
      delete options.name;
    }

    if (indent) {
      options.indent = JSON.stringify(indent);
    }
    options.helpers = 'helpers';
    options.partials = 'partials';

    if (!isDynamic) {
      params.unshift(this.nameLookup('partials', name, 'partial'));
    } else {
      params.unshift(name);
    }

    if (this.options.compat) {
      options.depths = 'depths';
    }
    options = this.objectLiteral(options);
    params.push(options);

    this.push(this.source.functionCall('this.invokePartial', '', params));
  },

  // [assignToHash]
  //
  // On stack, before: value, ..., hash, ...
  // On stack, after: ..., hash, ...
  //
  // Pops a value off the stack and assigns it to the current hash
  assignToHash: function assignToHash(key) {
    var value = this.popStack(),
        context = undefined,
        type = undefined,
        id = undefined;

    if (this.trackIds) {
      id = this.popStack();
    }
    if (this.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts[key] = context;
    }
    if (type) {
      hash.types[key] = type;
    }
    if (id) {
      hash.ids[key] = id;
    }
    hash.values[key] = value;
  },

  pushId: function pushId(type, name, child) {
    if (type === 'BlockParam') {
      this.pushStackLiteral('blockParams[' + name[0] + '].path[' + name[1] + ']' + (child ? ' + ' + JSON.stringify('.' + child) : ''));
    } else if (type === 'PathExpression') {
      this.pushString(name);
    } else if (type === 'SubExpression') {
      this.pushStackLiteral('true');
    } else {
      this.pushStackLiteral('null');
    }
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function compileChildren(environment, options) {
    var children = environment.children,
        child = undefined,
        compiler = undefined;

    for (var i = 0, l = children.length; i < l; i++) {
      child = children[i];
      compiler = new this.compiler(); // eslint-disable-line new-cap

      var index = this.matchExistingProgram(child);

      if (index == null) {
        this.context.programs.push(''); // Placeholder to prevent name conflicts for nested children
        index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
        this.context.environments[index] = child;

        this.useDepths = this.useDepths || compiler.useDepths;
        this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
      } else {
        child.index = index;
        child.name = 'program' + index;

        this.useDepths = this.useDepths || child.useDepths;
        this.useBlockParams = this.useBlockParams || child.useBlockParams;
      }
    }
  },
  matchExistingProgram: function matchExistingProgram(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return i;
      }
    }
  },

  programExpression: function programExpression(guid) {
    var child = this.environment.children[guid],
        programParams = [child.index, 'data', child.blockParams];

    if (this.useBlockParams || this.useDepths) {
      programParams.push('blockParams');
    }
    if (this.useDepths) {
      programParams.push('depths');
    }

    return 'this.program(' + programParams.join(', ') + ')';
  },

  useRegister: function useRegister(name) {
    if (!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  push: function push(expr) {
    if (!(expr instanceof Literal)) {
      expr = this.source.wrap(expr);
    }

    this.inlineStack.push(expr);
    return expr;
  },

  pushStackLiteral: function pushStackLiteral(item) {
    this.push(new Literal(item));
  },

  pushSource: function pushSource(source) {
    if (this.pendingContent) {
      this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
      this.pendingContent = undefined;
    }

    if (source) {
      this.source.push(source);
    }
  },

  replaceStack: function replaceStack(callback) {
    var prefix = ['('],
        stack = undefined,
        createdStack = undefined,
        usedLiteral = undefined;

    /* istanbul ignore next */
    if (!this.isInline()) {
      throw new _Exception2['default']('replaceStack on non-inline');
    }

    // We want to merge the inline statement into the replacement statement via ','
    var top = this.popStack(true);

    if (top instanceof Literal) {
      // Literals do not need to be inlined
      stack = [top.value];
      prefix = ['(', stack];
      usedLiteral = true;
    } else {
      // Get or create the current stack name for use by the inline
      createdStack = true;
      var _name = this.incrStack();

      prefix = ['((', this.push(_name), ' = ', top, ')'];
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (!usedLiteral) {
      this.popStack();
    }
    if (createdStack) {
      this.stackSlot--;
    }
    this.push(prefix.concat(item, ')'));
  },

  incrStack: function incrStack() {
    this.stackSlot++;
    if (this.stackSlot > this.stackVars.length) {
      this.stackVars.push('stack' + this.stackSlot);
    }
    return this.topStackName();
  },
  topStackName: function topStackName() {
    return 'stack' + this.stackSlot;
  },
  flushInline: function flushInline() {
    var inlineStack = this.inlineStack;
    this.inlineStack = [];
    for (var i = 0, len = inlineStack.length; i < len; i++) {
      var entry = inlineStack[i];
      /* istanbul ignore if */
      if (entry instanceof Literal) {
        this.compileStack.push(entry);
      } else {
        var stack = this.incrStack();
        this.pushSource([stack, ' = ', entry, ';']);
        this.compileStack.push(stack);
      }
    }
  },
  isInline: function isInline() {
    return this.inlineStack.length;
  },

  popStack: function popStack(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && item instanceof Literal) {
      return item.value;
    } else {
      if (!inline) {
        /* istanbul ignore next */
        if (!this.stackSlot) {
          throw new _Exception2['default']('Invalid stack pop');
        }
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function topStack() {
    var stack = this.isInline() ? this.inlineStack : this.compileStack,
        item = stack[stack.length - 1];

    /* istanbul ignore if */
    if (item instanceof Literal) {
      return item.value;
    } else {
      return item;
    }
  },

  contextName: function contextName(context) {
    if (this.useDepths && context) {
      return 'depths[' + context + ']';
    } else {
      return 'depth' + context;
    }
  },

  quotedString: function quotedString(str) {
    return this.source.quotedString(str);
  },

  objectLiteral: function objectLiteral(obj) {
    return this.source.objectLiteral(obj);
  },

  aliasable: function aliasable(name) {
    var ret = this.aliases[name];
    if (ret) {
      ret.referenceCount++;
      return ret;
    }

    ret = this.aliases[name] = this.source.wrap(name);
    ret.aliasable = true;
    ret.referenceCount = 1;

    return ret;
  },

  setupHelper: function setupHelper(paramSize, name, blockHelper) {
    var params = [],
        paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
    var foundHelper = this.nameLookup('helpers', name, 'helper');

    return {
      params: params,
      paramsInit: paramsInit,
      name: foundHelper,
      callParams: [this.contextName(0)].concat(params)
    };
  },

  setupParams: function setupParams(helper, paramSize, params) {
    var options = {},
        contexts = [],
        types = [],
        ids = [],
        param = undefined;

    options.name = this.quotedString(helper);
    options.hash = this.popStack();

    if (this.trackIds) {
      options.hashIds = this.popStack();
    }
    if (this.stringParams) {
      options.hashTypes = this.popStack();
      options.hashContexts = this.popStack();
    }

    var inverse = this.popStack(),
        program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      options.fn = program || 'this.noop';
      options.inverse = inverse || 'this.noop';
    }

    // The parameters go on to the stack in order (making sure that they are evaluated in order)
    // so we need to pop them off the stack in reverse order
    var i = paramSize;
    while (i--) {
      param = this.popStack();
      params[i] = param;

      if (this.trackIds) {
        ids[i] = this.popStack();
      }
      if (this.stringParams) {
        types[i] = this.popStack();
        contexts[i] = this.popStack();
      }
    }

    if (this.trackIds) {
      options.ids = this.source.generateArray(ids);
    }
    if (this.stringParams) {
      options.types = this.source.generateArray(types);
      options.contexts = this.source.generateArray(contexts);
    }

    if (this.options.data) {
      options.data = 'data';
    }
    if (this.useBlockParams) {
      options.blockParams = 'blockParams';
    }
    return options;
  },

  setupHelperArgs: function setupHelperArgs(helper, paramSize, params, useRegister) {
    var options = this.setupParams(helper, paramSize, params, true);
    options = this.objectLiteral(options);
    if (useRegister) {
      this.useRegister('options');
      params.push('options');
      return ['options=', options];
    } else {
      params.push(options);
      return '';
    }
  }
};

(function () {
  var reservedWords = ('break else new var' + ' case finally return void' + ' catch for switch while' + ' continue function this with' + ' default if throw' + ' delete in try' + ' do instanceof typeof' + ' abstract enum int short' + ' boolean export interface static' + ' byte extends long super' + ' char final native synchronized' + ' class float package throws' + ' const goto private transient' + ' debugger implements protected volatile' + ' double import public let yield await' + ' null true false').split(' ');

  var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

  for (var i = 0, l = reservedWords.length; i < l; i++) {
    compilerWords[reservedWords[i]] = true;
  }
})();

JavaScriptCompiler.isValidJavaScriptVariableName = function (name) {
  return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
};

function strictLookup(requireTerminal, compiler, parts, type) {
  var stack = compiler.popStack(),
      i = 0,
      len = parts.length;
  if (requireTerminal) {
    len--;
  }

  for (; i < len; i++) {
    stack = compiler.nameLookup(stack, parts[i], type);
  }

  if (requireTerminal) {
    return [compiler.aliasable('this.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ')'];
  } else {
    return stack;
  }
}

exports['default'] = JavaScriptCompiler;
module.exports = exports['default'];
},{"../base":6,"../exception":17,"../utils":21,"./code-gen":9}],13:[function(require,module,exports){
"use strict";

exports.__esModule = true;
/* istanbul ignore next */
/* Jison generated parser */
var handlebars = (function () {
    var parser = { trace: function trace() {},
        yy: {},
        symbols_: { error: 2, root: 3, program: 4, EOF: 5, program_repetition0: 6, statement: 7, mustache: 8, block: 9, rawBlock: 10, partial: 11, content: 12, COMMENT: 13, CONTENT: 14, openRawBlock: 15, END_RAW_BLOCK: 16, OPEN_RAW_BLOCK: 17, helperName: 18, openRawBlock_repetition0: 19, openRawBlock_option0: 20, CLOSE_RAW_BLOCK: 21, openBlock: 22, block_option0: 23, closeBlock: 24, openInverse: 25, block_option1: 26, OPEN_BLOCK: 27, openBlock_repetition0: 28, openBlock_option0: 29, openBlock_option1: 30, CLOSE: 31, OPEN_INVERSE: 32, openInverse_repetition0: 33, openInverse_option0: 34, openInverse_option1: 35, openInverseChain: 36, OPEN_INVERSE_CHAIN: 37, openInverseChain_repetition0: 38, openInverseChain_option0: 39, openInverseChain_option1: 40, inverseAndProgram: 41, INVERSE: 42, inverseChain: 43, inverseChain_option0: 44, OPEN_ENDBLOCK: 45, OPEN: 46, mustache_repetition0: 47, mustache_option0: 48, OPEN_UNESCAPED: 49, mustache_repetition1: 50, mustache_option1: 51, CLOSE_UNESCAPED: 52, OPEN_PARTIAL: 53, partialName: 54, partial_repetition0: 55, partial_option0: 56, param: 57, sexpr: 58, OPEN_SEXPR: 59, sexpr_repetition0: 60, sexpr_option0: 61, CLOSE_SEXPR: 62, hash: 63, hash_repetition_plus0: 64, hashSegment: 65, ID: 66, EQUALS: 67, blockParams: 68, OPEN_BLOCK_PARAMS: 69, blockParams_repetition_plus0: 70, CLOSE_BLOCK_PARAMS: 71, path: 72, dataName: 73, STRING: 74, NUMBER: 75, BOOLEAN: 76, UNDEFINED: 77, NULL: 78, DATA: 79, pathSegments: 80, SEP: 81, $accept: 0, $end: 1 },
        terminals_: { 2: "error", 5: "EOF", 13: "COMMENT", 14: "CONTENT", 16: "END_RAW_BLOCK", 17: "OPEN_RAW_BLOCK", 21: "CLOSE_RAW_BLOCK", 27: "OPEN_BLOCK", 31: "CLOSE", 32: "OPEN_INVERSE", 37: "OPEN_INVERSE_CHAIN", 42: "INVERSE", 45: "OPEN_ENDBLOCK", 46: "OPEN", 49: "OPEN_UNESCAPED", 52: "CLOSE_UNESCAPED", 53: "OPEN_PARTIAL", 59: "OPEN_SEXPR", 62: "CLOSE_SEXPR", 66: "ID", 67: "EQUALS", 69: "OPEN_BLOCK_PARAMS", 71: "CLOSE_BLOCK_PARAMS", 74: "STRING", 75: "NUMBER", 76: "BOOLEAN", 77: "UNDEFINED", 78: "NULL", 79: "DATA", 81: "SEP" },
        productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [12, 1], [10, 3], [15, 5], [9, 4], [9, 4], [22, 6], [25, 6], [36, 6], [41, 2], [43, 3], [43, 1], [24, 3], [8, 5], [8, 5], [11, 5], [57, 1], [57, 1], [58, 5], [63, 1], [65, 3], [68, 3], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [54, 1], [54, 1], [73, 2], [72, 1], [80, 3], [80, 1], [6, 0], [6, 2], [19, 0], [19, 2], [20, 0], [20, 1], [23, 0], [23, 1], [26, 0], [26, 1], [28, 0], [28, 2], [29, 0], [29, 1], [30, 0], [30, 1], [33, 0], [33, 2], [34, 0], [34, 1], [35, 0], [35, 1], [38, 0], [38, 2], [39, 0], [39, 1], [40, 0], [40, 1], [44, 0], [44, 1], [47, 0], [47, 2], [48, 0], [48, 1], [50, 0], [50, 2], [51, 0], [51, 1], [55, 0], [55, 2], [56, 0], [56, 1], [60, 0], [60, 2], [61, 0], [61, 1], [64, 1], [64, 2], [70, 1], [70, 2]],
        performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {

            var $0 = $$.length - 1;
            switch (yystate) {
                case 1:
                    return $$[$0 - 1];
                    break;
                case 2:
                    this.$ = new yy.Program($$[$0], null, {}, yy.locInfo(this._$));
                    break;
                case 3:
                    this.$ = $$[$0];
                    break;
                case 4:
                    this.$ = $$[$0];
                    break;
                case 5:
                    this.$ = $$[$0];
                    break;
                case 6:
                    this.$ = $$[$0];
                    break;
                case 7:
                    this.$ = $$[$0];
                    break;
                case 8:
                    this.$ = new yy.CommentStatement(yy.stripComment($$[$0]), yy.stripFlags($$[$0], $$[$0]), yy.locInfo(this._$));
                    break;
                case 9:
                    this.$ = new yy.ContentStatement($$[$0], yy.locInfo(this._$));
                    break;
                case 10:
                    this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                    break;
                case 11:
                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
                    break;
                case 12:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
                    break;
                case 13:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
                    break;
                case 14:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 15:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 16:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 17:
                    this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
                    break;
                case 18:
                    var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$),
                        program = new yy.Program([inverse], null, {}, yy.locInfo(this._$));
                    program.chained = true;

                    this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

                    break;
                case 19:
                    this.$ = $$[$0];
                    break;
                case 20:
                    this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
                    break;
                case 21:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 22:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 23:
                    this.$ = new yy.PartialStatement($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], yy.stripFlags($$[$0 - 4], $$[$0]), yy.locInfo(this._$));
                    break;
                case 24:
                    this.$ = $$[$0];
                    break;
                case 25:
                    this.$ = $$[$0];
                    break;
                case 26:
                    this.$ = new yy.SubExpression($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], yy.locInfo(this._$));
                    break;
                case 27:
                    this.$ = new yy.Hash($$[$0], yy.locInfo(this._$));
                    break;
                case 28:
                    this.$ = new yy.HashPair(yy.id($$[$0 - 2]), $$[$0], yy.locInfo(this._$));
                    break;
                case 29:
                    this.$ = yy.id($$[$0 - 1]);
                    break;
                case 30:
                    this.$ = $$[$0];
                    break;
                case 31:
                    this.$ = $$[$0];
                    break;
                case 32:
                    this.$ = new yy.StringLiteral($$[$0], yy.locInfo(this._$));
                    break;
                case 33:
                    this.$ = new yy.NumberLiteral($$[$0], yy.locInfo(this._$));
                    break;
                case 34:
                    this.$ = new yy.BooleanLiteral($$[$0], yy.locInfo(this._$));
                    break;
                case 35:
                    this.$ = new yy.UndefinedLiteral(yy.locInfo(this._$));
                    break;
                case 36:
                    this.$ = new yy.NullLiteral(yy.locInfo(this._$));
                    break;
                case 37:
                    this.$ = $$[$0];
                    break;
                case 38:
                    this.$ = $$[$0];
                    break;
                case 39:
                    this.$ = yy.preparePath(true, $$[$0], this._$);
                    break;
                case 40:
                    this.$ = yy.preparePath(false, $$[$0], this._$);
                    break;
                case 41:
                    $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
                    break;
                case 42:
                    this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
                    break;
                case 43:
                    this.$ = [];
                    break;
                case 44:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 45:
                    this.$ = [];
                    break;
                case 46:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 53:
                    this.$ = [];
                    break;
                case 54:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 59:
                    this.$ = [];
                    break;
                case 60:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 65:
                    this.$ = [];
                    break;
                case 66:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 73:
                    this.$ = [];
                    break;
                case 74:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 77:
                    this.$ = [];
                    break;
                case 78:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 81:
                    this.$ = [];
                    break;
                case 82:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 85:
                    this.$ = [];
                    break;
                case 86:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 89:
                    this.$ = [$$[$0]];
                    break;
                case 90:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 91:
                    this.$ = [$$[$0]];
                    break;
                case 92:
                    $$[$0 - 1].push($$[$0]);
                    break;
            }
        },
        table: [{ 3: 1, 4: 2, 5: [2, 43], 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: [1, 11], 14: [1, 18], 15: 16, 17: [1, 21], 22: 14, 25: 15, 27: [1, 19], 32: [1, 20], 37: [2, 2], 42: [2, 2], 45: [2, 2], 46: [1, 12], 49: [1, 13], 53: [1, 17] }, { 1: [2, 1] }, { 5: [2, 44], 13: [2, 44], 14: [2, 44], 17: [2, 44], 27: [2, 44], 32: [2, 44], 37: [2, 44], 42: [2, 44], 45: [2, 44], 46: [2, 44], 49: [2, 44], 53: [2, 44] }, { 5: [2, 3], 13: [2, 3], 14: [2, 3], 17: [2, 3], 27: [2, 3], 32: [2, 3], 37: [2, 3], 42: [2, 3], 45: [2, 3], 46: [2, 3], 49: [2, 3], 53: [2, 3] }, { 5: [2, 4], 13: [2, 4], 14: [2, 4], 17: [2, 4], 27: [2, 4], 32: [2, 4], 37: [2, 4], 42: [2, 4], 45: [2, 4], 46: [2, 4], 49: [2, 4], 53: [2, 4] }, { 5: [2, 5], 13: [2, 5], 14: [2, 5], 17: [2, 5], 27: [2, 5], 32: [2, 5], 37: [2, 5], 42: [2, 5], 45: [2, 5], 46: [2, 5], 49: [2, 5], 53: [2, 5] }, { 5: [2, 6], 13: [2, 6], 14: [2, 6], 17: [2, 6], 27: [2, 6], 32: [2, 6], 37: [2, 6], 42: [2, 6], 45: [2, 6], 46: [2, 6], 49: [2, 6], 53: [2, 6] }, { 5: [2, 7], 13: [2, 7], 14: [2, 7], 17: [2, 7], 27: [2, 7], 32: [2, 7], 37: [2, 7], 42: [2, 7], 45: [2, 7], 46: [2, 7], 49: [2, 7], 53: [2, 7] }, { 5: [2, 8], 13: [2, 8], 14: [2, 8], 17: [2, 8], 27: [2, 8], 32: [2, 8], 37: [2, 8], 42: [2, 8], 45: [2, 8], 46: [2, 8], 49: [2, 8], 53: [2, 8] }, { 18: 22, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 33, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 4: 34, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 37: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 4: 35, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 12: 36, 14: [1, 18] }, { 18: 38, 54: 37, 58: 39, 59: [1, 40], 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 9], 13: [2, 9], 14: [2, 9], 16: [2, 9], 17: [2, 9], 27: [2, 9], 32: [2, 9], 37: [2, 9], 42: [2, 9], 45: [2, 9], 46: [2, 9], 49: [2, 9], 53: [2, 9] }, { 18: 41, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 42, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 43, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 31: [2, 73], 47: 44, 59: [2, 73], 66: [2, 73], 74: [2, 73], 75: [2, 73], 76: [2, 73], 77: [2, 73], 78: [2, 73], 79: [2, 73] }, { 21: [2, 30], 31: [2, 30], 52: [2, 30], 59: [2, 30], 62: [2, 30], 66: [2, 30], 69: [2, 30], 74: [2, 30], 75: [2, 30], 76: [2, 30], 77: [2, 30], 78: [2, 30], 79: [2, 30] }, { 21: [2, 31], 31: [2, 31], 52: [2, 31], 59: [2, 31], 62: [2, 31], 66: [2, 31], 69: [2, 31], 74: [2, 31], 75: [2, 31], 76: [2, 31], 77: [2, 31], 78: [2, 31], 79: [2, 31] }, { 21: [2, 32], 31: [2, 32], 52: [2, 32], 59: [2, 32], 62: [2, 32], 66: [2, 32], 69: [2, 32], 74: [2, 32], 75: [2, 32], 76: [2, 32], 77: [2, 32], 78: [2, 32], 79: [2, 32] }, { 21: [2, 33], 31: [2, 33], 52: [2, 33], 59: [2, 33], 62: [2, 33], 66: [2, 33], 69: [2, 33], 74: [2, 33], 75: [2, 33], 76: [2, 33], 77: [2, 33], 78: [2, 33], 79: [2, 33] }, { 21: [2, 34], 31: [2, 34], 52: [2, 34], 59: [2, 34], 62: [2, 34], 66: [2, 34], 69: [2, 34], 74: [2, 34], 75: [2, 34], 76: [2, 34], 77: [2, 34], 78: [2, 34], 79: [2, 34] }, { 21: [2, 35], 31: [2, 35], 52: [2, 35], 59: [2, 35], 62: [2, 35], 66: [2, 35], 69: [2, 35], 74: [2, 35], 75: [2, 35], 76: [2, 35], 77: [2, 35], 78: [2, 35], 79: [2, 35] }, { 21: [2, 36], 31: [2, 36], 52: [2, 36], 59: [2, 36], 62: [2, 36], 66: [2, 36], 69: [2, 36], 74: [2, 36], 75: [2, 36], 76: [2, 36], 77: [2, 36], 78: [2, 36], 79: [2, 36] }, { 21: [2, 40], 31: [2, 40], 52: [2, 40], 59: [2, 40], 62: [2, 40], 66: [2, 40], 69: [2, 40], 74: [2, 40], 75: [2, 40], 76: [2, 40], 77: [2, 40], 78: [2, 40], 79: [2, 40], 81: [1, 45] }, { 66: [1, 32], 80: 46 }, { 21: [2, 42], 31: [2, 42], 52: [2, 42], 59: [2, 42], 62: [2, 42], 66: [2, 42], 69: [2, 42], 74: [2, 42], 75: [2, 42], 76: [2, 42], 77: [2, 42], 78: [2, 42], 79: [2, 42], 81: [2, 42] }, { 50: 47, 52: [2, 77], 59: [2, 77], 66: [2, 77], 74: [2, 77], 75: [2, 77], 76: [2, 77], 77: [2, 77], 78: [2, 77], 79: [2, 77] }, { 23: 48, 36: 50, 37: [1, 52], 41: 51, 42: [1, 53], 43: 49, 45: [2, 49] }, { 26: 54, 41: 55, 42: [1, 53], 45: [2, 51] }, { 16: [1, 56] }, { 31: [2, 81], 55: 57, 59: [2, 81], 66: [2, 81], 74: [2, 81], 75: [2, 81], 76: [2, 81], 77: [2, 81], 78: [2, 81], 79: [2, 81] }, { 31: [2, 37], 59: [2, 37], 66: [2, 37], 74: [2, 37], 75: [2, 37], 76: [2, 37], 77: [2, 37], 78: [2, 37], 79: [2, 37] }, { 31: [2, 38], 59: [2, 38], 66: [2, 38], 74: [2, 38], 75: [2, 38], 76: [2, 38], 77: [2, 38], 78: [2, 38], 79: [2, 38] }, { 18: 58, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 28: 59, 31: [2, 53], 59: [2, 53], 66: [2, 53], 69: [2, 53], 74: [2, 53], 75: [2, 53], 76: [2, 53], 77: [2, 53], 78: [2, 53], 79: [2, 53] }, { 31: [2, 59], 33: 60, 59: [2, 59], 66: [2, 59], 69: [2, 59], 74: [2, 59], 75: [2, 59], 76: [2, 59], 77: [2, 59], 78: [2, 59], 79: [2, 59] }, { 19: 61, 21: [2, 45], 59: [2, 45], 66: [2, 45], 74: [2, 45], 75: [2, 45], 76: [2, 45], 77: [2, 45], 78: [2, 45], 79: [2, 45] }, { 18: 65, 31: [2, 75], 48: 62, 57: 63, 58: 66, 59: [1, 40], 63: 64, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 66: [1, 70] }, { 21: [2, 39], 31: [2, 39], 52: [2, 39], 59: [2, 39], 62: [2, 39], 66: [2, 39], 69: [2, 39], 74: [2, 39], 75: [2, 39], 76: [2, 39], 77: [2, 39], 78: [2, 39], 79: [2, 39], 81: [1, 45] }, { 18: 65, 51: 71, 52: [2, 79], 57: 72, 58: 66, 59: [1, 40], 63: 73, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 24: 74, 45: [1, 75] }, { 45: [2, 50] }, { 4: 76, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 37: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 45: [2, 19] }, { 18: 77, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 4: 78, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 24: 79, 45: [1, 75] }, { 45: [2, 52] }, { 5: [2, 10], 13: [2, 10], 14: [2, 10], 17: [2, 10], 27: [2, 10], 32: [2, 10], 37: [2, 10], 42: [2, 10], 45: [2, 10], 46: [2, 10], 49: [2, 10], 53: [2, 10] }, { 18: 65, 31: [2, 83], 56: 80, 57: 81, 58: 66, 59: [1, 40], 63: 82, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 59: [2, 85], 60: 83, 62: [2, 85], 66: [2, 85], 74: [2, 85], 75: [2, 85], 76: [2, 85], 77: [2, 85], 78: [2, 85], 79: [2, 85] }, { 18: 65, 29: 84, 31: [2, 55], 57: 85, 58: 66, 59: [1, 40], 63: 86, 64: 67, 65: 68, 66: [1, 69], 69: [2, 55], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 65, 31: [2, 61], 34: 87, 57: 88, 58: 66, 59: [1, 40], 63: 89, 64: 67, 65: 68, 66: [1, 69], 69: [2, 61], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 65, 20: 90, 21: [2, 47], 57: 91, 58: 66, 59: [1, 40], 63: 92, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 31: [1, 93] }, { 31: [2, 74], 59: [2, 74], 66: [2, 74], 74: [2, 74], 75: [2, 74], 76: [2, 74], 77: [2, 74], 78: [2, 74], 79: [2, 74] }, { 31: [2, 76] }, { 21: [2, 24], 31: [2, 24], 52: [2, 24], 59: [2, 24], 62: [2, 24], 66: [2, 24], 69: [2, 24], 74: [2, 24], 75: [2, 24], 76: [2, 24], 77: [2, 24], 78: [2, 24], 79: [2, 24] }, { 21: [2, 25], 31: [2, 25], 52: [2, 25], 59: [2, 25], 62: [2, 25], 66: [2, 25], 69: [2, 25], 74: [2, 25], 75: [2, 25], 76: [2, 25], 77: [2, 25], 78: [2, 25], 79: [2, 25] }, { 21: [2, 27], 31: [2, 27], 52: [2, 27], 62: [2, 27], 65: 94, 66: [1, 95], 69: [2, 27] }, { 21: [2, 89], 31: [2, 89], 52: [2, 89], 62: [2, 89], 66: [2, 89], 69: [2, 89] }, { 21: [2, 42], 31: [2, 42], 52: [2, 42], 59: [2, 42], 62: [2, 42], 66: [2, 42], 67: [1, 96], 69: [2, 42], 74: [2, 42], 75: [2, 42], 76: [2, 42], 77: [2, 42], 78: [2, 42], 79: [2, 42], 81: [2, 42] }, { 21: [2, 41], 31: [2, 41], 52: [2, 41], 59: [2, 41], 62: [2, 41], 66: [2, 41], 69: [2, 41], 74: [2, 41], 75: [2, 41], 76: [2, 41], 77: [2, 41], 78: [2, 41], 79: [2, 41], 81: [2, 41] }, { 52: [1, 97] }, { 52: [2, 78], 59: [2, 78], 66: [2, 78], 74: [2, 78], 75: [2, 78], 76: [2, 78], 77: [2, 78], 78: [2, 78], 79: [2, 78] }, { 52: [2, 80] }, { 5: [2, 12], 13: [2, 12], 14: [2, 12], 17: [2, 12], 27: [2, 12], 32: [2, 12], 37: [2, 12], 42: [2, 12], 45: [2, 12], 46: [2, 12], 49: [2, 12], 53: [2, 12] }, { 18: 98, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 36: 50, 37: [1, 52], 41: 51, 42: [1, 53], 43: 100, 44: 99, 45: [2, 71] }, { 31: [2, 65], 38: 101, 59: [2, 65], 66: [2, 65], 69: [2, 65], 74: [2, 65], 75: [2, 65], 76: [2, 65], 77: [2, 65], 78: [2, 65], 79: [2, 65] }, { 45: [2, 17] }, { 5: [2, 13], 13: [2, 13], 14: [2, 13], 17: [2, 13], 27: [2, 13], 32: [2, 13], 37: [2, 13], 42: [2, 13], 45: [2, 13], 46: [2, 13], 49: [2, 13], 53: [2, 13] }, { 31: [1, 102] }, { 31: [2, 82], 59: [2, 82], 66: [2, 82], 74: [2, 82], 75: [2, 82], 76: [2, 82], 77: [2, 82], 78: [2, 82], 79: [2, 82] }, { 31: [2, 84] }, { 18: 65, 57: 104, 58: 66, 59: [1, 40], 61: 103, 62: [2, 87], 63: 105, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 30: 106, 31: [2, 57], 68: 107, 69: [1, 108] }, { 31: [2, 54], 59: [2, 54], 66: [2, 54], 69: [2, 54], 74: [2, 54], 75: [2, 54], 76: [2, 54], 77: [2, 54], 78: [2, 54], 79: [2, 54] }, { 31: [2, 56], 69: [2, 56] }, { 31: [2, 63], 35: 109, 68: 110, 69: [1, 108] }, { 31: [2, 60], 59: [2, 60], 66: [2, 60], 69: [2, 60], 74: [2, 60], 75: [2, 60], 76: [2, 60], 77: [2, 60], 78: [2, 60], 79: [2, 60] }, { 31: [2, 62], 69: [2, 62] }, { 21: [1, 111] }, { 21: [2, 46], 59: [2, 46], 66: [2, 46], 74: [2, 46], 75: [2, 46], 76: [2, 46], 77: [2, 46], 78: [2, 46], 79: [2, 46] }, { 21: [2, 48] }, { 5: [2, 21], 13: [2, 21], 14: [2, 21], 17: [2, 21], 27: [2, 21], 32: [2, 21], 37: [2, 21], 42: [2, 21], 45: [2, 21], 46: [2, 21], 49: [2, 21], 53: [2, 21] }, { 21: [2, 90], 31: [2, 90], 52: [2, 90], 62: [2, 90], 66: [2, 90], 69: [2, 90] }, { 67: [1, 96] }, { 18: 65, 57: 112, 58: 66, 59: [1, 40], 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 22], 13: [2, 22], 14: [2, 22], 17: [2, 22], 27: [2, 22], 32: [2, 22], 37: [2, 22], 42: [2, 22], 45: [2, 22], 46: [2, 22], 49: [2, 22], 53: [2, 22] }, { 31: [1, 113] }, { 45: [2, 18] }, { 45: [2, 72] }, { 18: 65, 31: [2, 67], 39: 114, 57: 115, 58: 66, 59: [1, 40], 63: 116, 64: 67, 65: 68, 66: [1, 69], 69: [2, 67], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 23], 13: [2, 23], 14: [2, 23], 17: [2, 23], 27: [2, 23], 32: [2, 23], 37: [2, 23], 42: [2, 23], 45: [2, 23], 46: [2, 23], 49: [2, 23], 53: [2, 23] }, { 62: [1, 117] }, { 59: [2, 86], 62: [2, 86], 66: [2, 86], 74: [2, 86], 75: [2, 86], 76: [2, 86], 77: [2, 86], 78: [2, 86], 79: [2, 86] }, { 62: [2, 88] }, { 31: [1, 118] }, { 31: [2, 58] }, { 66: [1, 120], 70: 119 }, { 31: [1, 121] }, { 31: [2, 64] }, { 14: [2, 11] }, { 21: [2, 28], 31: [2, 28], 52: [2, 28], 62: [2, 28], 66: [2, 28], 69: [2, 28] }, { 5: [2, 20], 13: [2, 20], 14: [2, 20], 17: [2, 20], 27: [2, 20], 32: [2, 20], 37: [2, 20], 42: [2, 20], 45: [2, 20], 46: [2, 20], 49: [2, 20], 53: [2, 20] }, { 31: [2, 69], 40: 122, 68: 123, 69: [1, 108] }, { 31: [2, 66], 59: [2, 66], 66: [2, 66], 69: [2, 66], 74: [2, 66], 75: [2, 66], 76: [2, 66], 77: [2, 66], 78: [2, 66], 79: [2, 66] }, { 31: [2, 68], 69: [2, 68] }, { 21: [2, 26], 31: [2, 26], 52: [2, 26], 59: [2, 26], 62: [2, 26], 66: [2, 26], 69: [2, 26], 74: [2, 26], 75: [2, 26], 76: [2, 26], 77: [2, 26], 78: [2, 26], 79: [2, 26] }, { 13: [2, 14], 14: [2, 14], 17: [2, 14], 27: [2, 14], 32: [2, 14], 37: [2, 14], 42: [2, 14], 45: [2, 14], 46: [2, 14], 49: [2, 14], 53: [2, 14] }, { 66: [1, 125], 71: [1, 124] }, { 66: [2, 91], 71: [2, 91] }, { 13: [2, 15], 14: [2, 15], 17: [2, 15], 27: [2, 15], 32: [2, 15], 42: [2, 15], 45: [2, 15], 46: [2, 15], 49: [2, 15], 53: [2, 15] }, { 31: [1, 126] }, { 31: [2, 70] }, { 31: [2, 29] }, { 66: [2, 92], 71: [2, 92] }, { 13: [2, 16], 14: [2, 16], 17: [2, 16], 27: [2, 16], 32: [2, 16], 37: [2, 16], 42: [2, 16], 45: [2, 16], 46: [2, 16], 49: [2, 16], 53: [2, 16] }],
        defaultActions: { 4: [2, 1], 49: [2, 50], 51: [2, 19], 55: [2, 52], 64: [2, 76], 73: [2, 80], 78: [2, 17], 82: [2, 84], 92: [2, 48], 99: [2, 18], 100: [2, 72], 105: [2, 88], 107: [2, 58], 110: [2, 64], 111: [2, 11], 123: [2, 70], 124: [2, 29] },
        parseError: function parseError(str, hash) {
            throw new Error(str);
        },
        parse: function parse(input) {
            var self = this,
                stack = [0],
                vstack = [null],
                lstack = [],
                table = this.table,
                yytext = "",
                yylineno = 0,
                yyleng = 0,
                recovering = 0,
                TERROR = 2,
                EOF = 1;
            this.lexer.setInput(input);
            this.lexer.yy = this.yy;
            this.yy.lexer = this.lexer;
            this.yy.parser = this;
            if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
            var yyloc = this.lexer.yylloc;
            lstack.push(yyloc);
            var ranges = this.lexer.options && this.lexer.options.ranges;
            if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
            function popStack(n) {
                stack.length = stack.length - 2 * n;
                vstack.length = vstack.length - n;
                lstack.length = lstack.length - n;
            }
            function lex() {
                var token;
                token = self.lexer.lex() || 1;
                if (typeof token !== "number") {
                    token = self.symbols_[token] || token;
                }
                return token;
            }
            var symbol,
                preErrorSymbol,
                state,
                action,
                a,
                r,
                yyval = {},
                p,
                len,
                newState,
                expected;
            while (true) {
                state = stack[stack.length - 1];
                if (this.defaultActions[state]) {
                    action = this.defaultActions[state];
                } else {
                    if (symbol === null || typeof symbol == "undefined") {
                        symbol = lex();
                    }
                    action = table[state] && table[state][symbol];
                }
                if (typeof action === "undefined" || !action.length || !action[0]) {
                    var errStr = "";
                    if (!recovering) {
                        expected = [];
                        for (p in table[state]) if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                        if (this.lexer.showPosition) {
                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                        } else {
                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                        }
                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                    }
                }
                if (action[0] instanceof Array && action.length > 1) {
                    throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                }
                switch (action[0]) {
                    case 1:
                        stack.push(symbol);
                        vstack.push(this.lexer.yytext);
                        lstack.push(this.lexer.yylloc);
                        stack.push(action[1]);
                        symbol = null;
                        if (!preErrorSymbol) {
                            yyleng = this.lexer.yyleng;
                            yytext = this.lexer.yytext;
                            yylineno = this.lexer.yylineno;
                            yyloc = this.lexer.yylloc;
                            if (recovering > 0) recovering--;
                        } else {
                            symbol = preErrorSymbol;
                            preErrorSymbol = null;
                        }
                        break;
                    case 2:
                        len = this.productions_[action[1]][1];
                        yyval.$ = vstack[vstack.length - len];
                        yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
                        if (ranges) {
                            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                        }
                        r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                        if (typeof r !== "undefined") {
                            return r;
                        }
                        if (len) {
                            stack = stack.slice(0, -1 * len * 2);
                            vstack = vstack.slice(0, -1 * len);
                            lstack = lstack.slice(0, -1 * len);
                        }
                        stack.push(this.productions_[action[1]][0]);
                        vstack.push(yyval.$);
                        lstack.push(yyval._$);
                        newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                        stack.push(newState);
                        break;
                    case 3:
                        return true;
                }
            }
            return true;
        }
    };
    /* Jison generated lexer */
    var lexer = (function () {
        var lexer = { EOF: 1,
            parseError: function parseError(str, hash) {
                if (this.yy.parser) {
                    this.yy.parser.parseError(str, hash);
                } else {
                    throw new Error(str);
                }
            },
            setInput: function setInput(input) {
                this._input = input;
                this._more = this._less = this.done = false;
                this.yylineno = this.yyleng = 0;
                this.yytext = this.matched = this.match = "";
                this.conditionStack = ["INITIAL"];
                this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                if (this.options.ranges) this.yylloc.range = [0, 0];
                this.offset = 0;
                return this;
            },
            input: function input() {
                var ch = this._input[0];
                this.yytext += ch;
                this.yyleng++;
                this.offset++;
                this.match += ch;
                this.matched += ch;
                var lines = ch.match(/(?:\r\n?|\n).*/g);
                if (lines) {
                    this.yylineno++;
                    this.yylloc.last_line++;
                } else {
                    this.yylloc.last_column++;
                }
                if (this.options.ranges) this.yylloc.range[1]++;

                this._input = this._input.slice(1);
                return ch;
            },
            unput: function unput(ch) {
                var len = ch.length;
                var lines = ch.split(/(?:\r\n?|\n)/g);

                this._input = ch + this._input;
                this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                //this.yyleng -= len;
                this.offset -= len;
                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                this.match = this.match.substr(0, this.match.length - 1);
                this.matched = this.matched.substr(0, this.matched.length - 1);

                if (lines.length - 1) this.yylineno -= lines.length - 1;
                var r = this.yylloc.range;

                this.yylloc = { first_line: this.yylloc.first_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.first_column,
                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
                };

                if (this.options.ranges) {
                    this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                }
                return this;
            },
            more: function more() {
                this._more = true;
                return this;
            },
            less: function less(n) {
                this.unput(this.match.slice(n));
            },
            pastInput: function pastInput() {
                var past = this.matched.substr(0, this.matched.length - this.match.length);
                return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
            },
            upcomingInput: function upcomingInput() {
                var next = this.match;
                if (next.length < 20) {
                    next += this._input.substr(0, 20 - next.length);
                }
                return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
            },
            showPosition: function showPosition() {
                var pre = this.pastInput();
                var c = new Array(pre.length + 1).join("-");
                return pre + this.upcomingInput() + "\n" + c + "^";
            },
            next: function next() {
                if (this.done) {
                    return this.EOF;
                }
                if (!this._input) this.done = true;

                var token, match, tempMatch, index, col, lines;
                if (!this._more) {
                    this.yytext = "";
                    this.match = "";
                }
                var rules = this._currentRules();
                for (var i = 0; i < rules.length; i++) {
                    tempMatch = this._input.match(this.rules[rules[i]]);
                    if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                        match = tempMatch;
                        index = i;
                        if (!this.options.flex) break;
                    }
                }
                if (match) {
                    lines = match[0].match(/(?:\r\n?|\n).*/g);
                    if (lines) this.yylineno += lines.length;
                    this.yylloc = { first_line: this.yylloc.last_line,
                        last_line: this.yylineno + 1,
                        first_column: this.yylloc.last_column,
                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
                    this.yytext += match[0];
                    this.match += match[0];
                    this.matches = match;
                    this.yyleng = this.yytext.length;
                    if (this.options.ranges) {
                        this.yylloc.range = [this.offset, this.offset += this.yyleng];
                    }
                    this._more = false;
                    this._input = this._input.slice(match[0].length);
                    this.matched += match[0];
                    token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
                    if (this.done && this._input) this.done = false;
                    if (token) {
                        return token;
                    } else {
                        return;
                    }
                }
                if (this._input === "") {
                    return this.EOF;
                } else {
                    return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), { text: "", token: null, line: this.yylineno });
                }
            },
            lex: function lex() {
                var r = this.next();
                if (typeof r !== "undefined") {
                    return r;
                } else {
                    return this.lex();
                }
            },
            begin: function begin(condition) {
                this.conditionStack.push(condition);
            },
            popState: function popState() {
                return this.conditionStack.pop();
            },
            _currentRules: function _currentRules() {
                return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
            },
            topState: function topState() {
                return this.conditionStack[this.conditionStack.length - 2];
            },
            pushState: function begin(condition) {
                this.begin(condition);
            } };
        lexer.options = {};
        lexer.performAction = function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {

            function strip(start, end) {
                return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
            }

            var YYSTATE = YY_START;
            switch ($avoiding_name_collisions) {
                case 0:
                    if (yy_.yytext.slice(-2) === "\\\\") {
                        strip(0, 1);
                        this.begin("mu");
                    } else if (yy_.yytext.slice(-1) === "\\") {
                        strip(0, 1);
                        this.begin("emu");
                    } else {
                        this.begin("mu");
                    }
                    if (yy_.yytext) {
                        return 14;
                    }break;
                case 1:
                    return 14;
                    break;
                case 2:
                    this.popState();
                    return 14;

                    break;
                case 3:
                    yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
                    this.popState();
                    return 16;

                    break;
                case 4:
                    return 14;
                    break;
                case 5:
                    this.popState();
                    return 13;

                    break;
                case 6:
                    return 59;
                    break;
                case 7:
                    return 62;
                    break;
                case 8:
                    return 17;
                    break;
                case 9:
                    this.popState();
                    this.begin("raw");
                    return 21;

                    break;
                case 10:
                    return 53;
                    break;
                case 11:
                    return 27;
                    break;
                case 12:
                    return 45;
                    break;
                case 13:
                    this.popState();return 42;
                    break;
                case 14:
                    this.popState();return 42;
                    break;
                case 15:
                    return 32;
                    break;
                case 16:
                    return 37;
                    break;
                case 17:
                    return 49;
                    break;
                case 18:
                    return 46;
                    break;
                case 19:
                    this.unput(yy_.yytext);
                    this.popState();
                    this.begin("com");

                    break;
                case 20:
                    this.popState();
                    return 13;

                    break;
                case 21:
                    return 46;
                    break;
                case 22:
                    return 67;
                    break;
                case 23:
                    return 66;
                    break;
                case 24:
                    return 66;
                    break;
                case 25:
                    return 81;
                    break;
                case 26:
                    // ignore whitespace
                    break;
                case 27:
                    this.popState();return 52;
                    break;
                case 28:
                    this.popState();return 31;
                    break;
                case 29:
                    yy_.yytext = strip(1, 2).replace(/\\"/g, "\"");return 74;
                    break;
                case 30:
                    yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 74;
                    break;
                case 31:
                    return 79;
                    break;
                case 32:
                    return 76;
                    break;
                case 33:
                    return 76;
                    break;
                case 34:
                    return 77;
                    break;
                case 35:
                    return 78;
                    break;
                case 36:
                    return 75;
                    break;
                case 37:
                    return 69;
                    break;
                case 38:
                    return 71;
                    break;
                case 39:
                    return 66;
                    break;
                case 40:
                    return 66;
                    break;
                case 41:
                    return "INVALID";
                    break;
                case 42:
                    return 5;
                    break;
            }
        };
        lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{\/)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[[^\]]*\])/, /^(?:.)/, /^(?:$)/];
        lexer.conditions = { mu: { rules: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42], inclusive: false }, emu: { rules: [2], inclusive: false }, com: { rules: [5], inclusive: false }, raw: { rules: [3, 4], inclusive: false }, INITIAL: { rules: [0, 1, 42], inclusive: true } };
        return lexer;
    })();
    parser.lexer = lexer;
    function Parser() {
        this.yy = {};
    }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser();
})();exports["default"] = handlebars;
module.exports = exports["default"];
},{}],14:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.print = print;
exports.PrintVisitor = PrintVisitor;
/*eslint-disable new-cap */

var _Visitor = require('./visitor');

var _Visitor2 = _interopRequireWildcard(_Visitor);

function print(ast) {
  return new PrintVisitor().accept(ast);
}

function PrintVisitor() {
  this.padding = 0;
}

PrintVisitor.prototype = new _Visitor2['default']();

PrintVisitor.prototype.pad = function (string) {
  var out = '';

  for (var i = 0, l = this.padding; i < l; i++) {
    out = out + '  ';
  }

  out = out + string + '\n';
  return out;
};

PrintVisitor.prototype.Program = function (program) {
  var out = '',
      body = program.body,
      i = undefined,
      l = undefined;

  if (program.blockParams) {
    var blockParams = 'BLOCK PARAMS: [';
    for (i = 0, l = program.blockParams.length; i < l; i++) {
      blockParams += ' ' + program.blockParams[i];
    }
    blockParams += ' ]';
    out += this.pad(blockParams);
  }

  for (i = 0, l = body.length; i < l; i++) {
    out = out + this.accept(body[i]);
  }

  this.padding--;

  return out;
};

PrintVisitor.prototype.MustacheStatement = function (mustache) {
  return this.pad('{{ ' + this.SubExpression(mustache) + ' }}');
};

PrintVisitor.prototype.BlockStatement = function (block) {
  var out = '';

  out = out + this.pad('BLOCK:');
  this.padding++;
  out = out + this.pad(this.SubExpression(block));
  if (block.program) {
    out = out + this.pad('PROGRAM:');
    this.padding++;
    out = out + this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) {
      this.padding++;
    }
    out = out + this.pad('{{^}}');
    this.padding++;
    out = out + this.accept(block.inverse);
    this.padding--;
    if (block.program) {
      this.padding--;
    }
  }
  this.padding--;

  return out;
};

PrintVisitor.prototype.PartialStatement = function (partial) {
  var content = 'PARTIAL:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }
  return this.pad('{{> ' + content + ' }}');
};

PrintVisitor.prototype.ContentStatement = function (content) {
  return this.pad('CONTENT[ \'' + content.value + '\' ]');
};

PrintVisitor.prototype.CommentStatement = function (comment) {
  return this.pad('{{! \'' + comment.value + '\' }}');
};

PrintVisitor.prototype.SubExpression = function (sexpr) {
  var params = sexpr.params,
      paramStrings = [],
      hash = undefined;

  for (var i = 0, l = params.length; i < l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params = '[' + paramStrings.join(', ') + ']';

  hash = sexpr.hash ? ' ' + this.accept(sexpr.hash) : '';

  return this.accept(sexpr.path) + ' ' + params + hash;
};

PrintVisitor.prototype.PathExpression = function (id) {
  var path = id.parts.join('/');
  return (id.data ? '@' : '') + 'PATH:' + path;
};

PrintVisitor.prototype.StringLiteral = function (string) {
  return '"' + string.value + '"';
};

PrintVisitor.prototype.NumberLiteral = function (number) {
  return 'NUMBER{' + number.value + '}';
};

PrintVisitor.prototype.BooleanLiteral = function (bool) {
  return 'BOOLEAN{' + bool.value + '}';
};

PrintVisitor.prototype.UndefinedLiteral = function () {
  return 'UNDEFINED';
};

PrintVisitor.prototype.NullLiteral = function () {
  return 'NULL';
};

PrintVisitor.prototype.Hash = function (hash) {
  var pairs = hash.pairs,
      joinedPairs = [];

  for (var i = 0, l = pairs.length; i < l; i++) {
    joinedPairs.push(this.accept(pairs[i]));
  }

  return 'HASH{' + joinedPairs.join(', ') + '}';
};
PrintVisitor.prototype.HashPair = function (pair) {
  return pair.key + '=' + this.accept(pair.value);
};
/*eslint-enable new-cap */
},{"./visitor":15}],15:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _Exception = require('../exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _AST = require('./ast');

var _AST2 = _interopRequireWildcard(_AST);

function Visitor() {
  this.parents = [];
}

Visitor.prototype = {
  constructor: Visitor,
  mutating: false,

  // Visits a given value. If mutating, will replace the value if necessary.
  acceptKey: function acceptKey(node, name) {
    var value = this.accept(node[name]);
    if (this.mutating) {
      // Hacky sanity check:
      if (value && (!value.type || !_AST2['default'][value.type])) {
        throw new _Exception2['default']('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
      }
      node[name] = value;
    }
  },

  // Performs an accept operation with added sanity check to ensure
  // required keys are not removed.
  acceptRequired: function acceptRequired(node, name) {
    this.acceptKey(node, name);

    if (!node[name]) {
      throw new _Exception2['default'](node.type + ' requires ' + name);
    }
  },

  // Traverses a given array. If mutating, empty respnses will be removed
  // for child elements.
  acceptArray: function acceptArray(array) {
    for (var i = 0, l = array.length; i < l; i++) {
      this.acceptKey(array, i);

      if (!array[i]) {
        array.splice(i, 1);
        i--;
        l--;
      }
    }
  },

  accept: function accept(object) {
    if (!object) {
      return;
    }

    if (this.current) {
      this.parents.unshift(this.current);
    }
    this.current = object;

    var ret = this[object.type](object);

    this.current = this.parents.shift();

    if (!this.mutating || ret) {
      return ret;
    } else if (ret !== false) {
      return object;
    }
  },

  Program: function Program(program) {
    this.acceptArray(program.body);
  },

  MustacheStatement: function MustacheStatement(mustache) {
    this.acceptRequired(mustache, 'path');
    this.acceptArray(mustache.params);
    this.acceptKey(mustache, 'hash');
  },

  BlockStatement: function BlockStatement(block) {
    this.acceptRequired(block, 'path');
    this.acceptArray(block.params);
    this.acceptKey(block, 'hash');

    this.acceptKey(block, 'program');
    this.acceptKey(block, 'inverse');
  },

  PartialStatement: function PartialStatement(partial) {
    this.acceptRequired(partial, 'name');
    this.acceptArray(partial.params);
    this.acceptKey(partial, 'hash');
  },

  ContentStatement: function ContentStatement() {},
  CommentStatement: function CommentStatement() {},

  SubExpression: function SubExpression(sexpr) {
    this.acceptRequired(sexpr, 'path');
    this.acceptArray(sexpr.params);
    this.acceptKey(sexpr, 'hash');
  },

  PathExpression: function PathExpression() {},

  StringLiteral: function StringLiteral() {},
  NumberLiteral: function NumberLiteral() {},
  BooleanLiteral: function BooleanLiteral() {},
  UndefinedLiteral: function UndefinedLiteral() {},
  NullLiteral: function NullLiteral() {},

  Hash: function Hash(hash) {
    this.acceptArray(hash.pairs);
  },
  HashPair: function HashPair(pair) {
    this.acceptRequired(pair, 'value');
  }
};

exports['default'] = Visitor;
module.exports = exports['default'];
/* content */ /* comment */ /* path */ /* string */ /* number */ /* bool */ /* literal */ /* literal */
},{"../exception":17,"./ast":7}],16:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _Visitor = require('./visitor');

var _Visitor2 = _interopRequireWildcard(_Visitor);

function WhitespaceControl() {}
WhitespaceControl.prototype = new _Visitor2['default']();

WhitespaceControl.prototype.Program = function (program) {
  var isRoot = !this.isRootSeen;
  this.isRootSeen = true;

  var body = program.body;
  for (var i = 0, l = body.length; i < l; i++) {
    var current = body[i],
        strip = this.accept(current);

    if (!strip) {
      continue;
    }

    var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
        _isNextWhitespace = isNextWhitespace(body, i, isRoot),
        openStandalone = strip.openStandalone && _isPrevWhitespace,
        closeStandalone = strip.closeStandalone && _isNextWhitespace,
        inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

    if (strip.close) {
      omitRight(body, i, true);
    }
    if (strip.open) {
      omitLeft(body, i, true);
    }

    if (inlineStandalone) {
      omitRight(body, i);

      if (omitLeft(body, i)) {
        // If we are on a standalone node, save the indent info for partials
        if (current.type === 'PartialStatement') {
          // Pull out the whitespace from the final line
          current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
        }
      }
    }
    if (openStandalone) {
      omitRight((current.program || current.inverse).body);

      // Strip out the previous content node if it's whitespace only
      omitLeft(body, i);
    }
    if (closeStandalone) {
      // Always strip the next node
      omitRight(body, i);

      omitLeft((current.inverse || current.program).body);
    }
  }

  return program;
};
WhitespaceControl.prototype.BlockStatement = function (block) {
  this.accept(block.program);
  this.accept(block.inverse);

  // Find the inverse program that is involed with whitespace stripping.
  var program = block.program || block.inverse,
      inverse = block.program && block.inverse,
      firstInverse = inverse,
      lastInverse = inverse;

  if (inverse && inverse.chained) {
    firstInverse = inverse.body[0].program;

    // Walk the inverse chain to find the last inverse that is actually in the chain.
    while (lastInverse.chained) {
      lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
    }
  }

  var strip = {
    open: block.openStrip.open,
    close: block.closeStrip.close,

    // Determine the standalone candiacy. Basically flag our content as being possibly standalone
    // so our parent can determine if we actually are standalone
    openStandalone: isNextWhitespace(program.body),
    closeStandalone: isPrevWhitespace((firstInverse || program).body)
  };

  if (block.openStrip.close) {
    omitRight(program.body, null, true);
  }

  if (inverse) {
    var inverseStrip = block.inverseStrip;

    if (inverseStrip.open) {
      omitLeft(program.body, null, true);
    }

    if (inverseStrip.close) {
      omitRight(firstInverse.body, null, true);
    }
    if (block.closeStrip.open) {
      omitLeft(lastInverse.body, null, true);
    }

    // Find standalone else statments
    if (isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
      omitLeft(program.body);
      omitRight(firstInverse.body);
    }
  } else if (block.closeStrip.open) {
    omitLeft(program.body, null, true);
  }

  return strip;
};

WhitespaceControl.prototype.MustacheStatement = function (mustache) {
  return mustache.strip;
};

WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
  /* istanbul ignore next */
  var strip = node.strip || {};
  return {
    inlineStandalone: true,
    open: strip.open,
    close: strip.close
  };
};

function isPrevWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = body.length;
  }

  // Nodes that end with newlines are considered whitespace (but are special
  // cased for strip operations)
  var prev = body[i - 1],
      sibling = body[i - 2];
  if (!prev) {
    return isRoot;
  }

  if (prev.type === 'ContentStatement') {
    return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
  }
}
function isNextWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = -1;
  }

  var next = body[i + 1],
      sibling = body[i + 2];
  if (!next) {
    return isRoot;
  }

  if (next.type === 'ContentStatement') {
    return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
  }
}

// Marks the node to the right of the position as omitted.
// I.e. {{foo}}' ' will mark the ' ' node as omitted.
//
// If i is undefined, then the first child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitRight(body, i, multiple) {
  var current = body[i == null ? 0 : i + 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
    return;
  }

  var original = current.value;
  current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
  current.rightStripped = current.value !== original;
}

// Marks the node to the left of the position as omitted.
// I.e. ' '{{foo}} will mark the ' ' node as omitted.
//
// If i is undefined then the last child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitLeft(body, i, multiple) {
  var current = body[i == null ? body.length - 1 : i - 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
    return;
  }

  // We omit the last node if it's whitespace only and not preceeded by a non-content node.
  var original = current.value;
  current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
  current.leftStripped = current.value !== original;
  return current.leftStripped;
}

exports['default'] = WhitespaceControl;
module.exports = exports['default'];
},{"./visitor":15}],17:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var loc = node && node.loc,
      line = undefined,
      column = undefined;
  if (loc) {
    line = loc.start.line;
    column = loc.start.column;

    message += ' - ' + line + ':' + column;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Exception);
  }

  if (loc) {
    this.lineNumber = line;
    this.column = column;
  }
}

Exception.prototype = new Error();

exports['default'] = Exception;
module.exports = exports['default'];
},{}],18:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;
/*global window */

exports['default'] = function (Handlebars) {
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function () {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
  };
};

module.exports = exports['default'];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],19:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.checkRevision = checkRevision;

// TODO: Remove this line and break up compilePartial

exports.template = template;
exports.wrapProgram = wrapProgram;
exports.resolvePartial = resolvePartial;
exports.invokePartial = invokePartial;
exports.noop = noop;

var _import = require('./utils');

var Utils = _interopRequireWildcard(_import);

var _Exception = require('./exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _COMPILER_REVISION$REVISION_CHANGES$createFrame = require('./base');

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = _COMPILER_REVISION$REVISION_CHANGES$createFrame.COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[currentRevision],
          compilerVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[compilerRevision];
      throw new _Exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new _Exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
    }
  }
}

function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new _Exception2['default']('No environment passed to template');
  }
  if (!templateSpec || !templateSpec.main) {
    throw new _Exception2['default']('Unknown template object: ' + typeof templateSpec);
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  function invokePartialWrapper(partial, context, options) {
    if (options.hash) {
      context = Utils.extend({}, context, options.hash);
    }

    partial = env.VM.resolvePartial.call(this, partial, context, options);
    var result = env.VM.invokePartial.call(this, partial, context, options);

    if (result == null && env.compile) {
      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
      result = options.partials[options.name](context, options);
    }
    if (result != null) {
      if (options.indent) {
        var lines = result.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = options.indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new _Exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
    }
  }

  // Just add water
  var container = {
    strict: function strict(obj, name) {
      if (!(name in obj)) {
        throw new _Exception2['default']('"' + name + '" not defined in ' + obj);
      }
      return obj[name];
    },
    lookup: function lookup(depths, name) {
      var len = depths.length;
      for (var i = 0; i < len; i++) {
        if (depths[i] && depths[i][name] != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function lambda(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function fn(i) {
      return templateSpec[i];
    },

    programs: [],
    program: function program(i, data, declaredBlockParams, blockParams, depths) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if (data || depths || blockParams || declaredBlockParams) {
        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
      }
      return programWrapper;
    },

    data: function data(value, depth) {
      while (value && depth--) {
        value = value._parent;
      }
      return value;
    },
    merge: function merge(param, common) {
      var obj = param || common;

      if (param && common && param !== common) {
        obj = Utils.extend({}, common, param);
      }

      return obj;
    },

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  function ret(context) {
    var options = arguments[1] === undefined ? {} : arguments[1];

    var data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    var depths = undefined,
        blockParams = templateSpec.useBlockParams ? [] : undefined;
    if (templateSpec.useDepths) {
      depths = options.depths ? [context].concat(options.depths) : [context];
    }

    return templateSpec.main.call(container, context, container.helpers, container.partials, data, blockParams, depths);
  }
  ret.isTop = true;

  ret._setup = function (options) {
    if (!options.partial) {
      container.helpers = container.merge(options.helpers, env.helpers);

      if (templateSpec.usePartial) {
        container.partials = container.merge(options.partials, env.partials);
      }
    } else {
      container.helpers = options.helpers;
      container.partials = options.partials;
    }
  };

  ret._child = function (i, data, blockParams, depths) {
    if (templateSpec.useBlockParams && !blockParams) {
      throw new _Exception2['default']('must pass block params');
    }
    if (templateSpec.useDepths && !depths) {
      throw new _Exception2['default']('must pass parent depths');
    }

    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
  };
  return ret;
}

function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
  function prog(context) {
    var options = arguments[1] === undefined ? {} : arguments[1];

    return fn.call(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), depths && [context].concat(depths));
  }
  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  prog.blockParams = declaredBlockParams || 0;
  return prog;
}

function resolvePartial(partial, context, options) {
  if (!partial) {
    partial = options.partials[options.name];
  } else if (!partial.call && !options.name) {
    // This is a dynamic partial that returned a string
    options.name = partial;
    partial = options.partials[partial];
  }
  return partial;
}

function invokePartial(partial, context, options) {
  options.partial = true;

  if (partial === undefined) {
    throw new _Exception2['default']('The partial ' + options.name + ' could not be found');
  } else if (partial instanceof Function) {
    return partial(context, options);
  }
}

function noop() {
  return '';
}

function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? _COMPILER_REVISION$REVISION_CHANGES$createFrame.createFrame(data) : {};
    data.root = context;
  }
  return data;
}
},{"./base":6,"./exception":17,"./utils":21}],20:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
  return '' + this.string;
};

exports['default'] = SafeString;
module.exports = exports['default'];
},{}],21:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.extend = extend;

// Older IE versions do not directly support indexOf so we must implement our own, sadly.
exports.indexOf = indexOf;
exports.escapeExpression = escapeExpression;
exports.isEmpty = isEmpty;
exports.blockParams = blockParams;
exports.appendContextPath = appendContextPath;
var escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#x27;',
  '`': '&#x60;'
};

var badChars = /[&<>"'`]/g,
    possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr];
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

var toString = Object.prototype.toString;

exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
/*eslint-disable func-style, no-var */
var isFunction = function isFunction(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
/* istanbul ignore next */
if (isFunction(/x/)) {
  exports.isFunction = isFunction = function (value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
/*eslint-enable func-style, no-var */

/* istanbul ignore next */
var isArray = Array.isArray || function (value) {
  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
};exports.isArray = isArray;

function indexOf(array, value) {
  for (var i = 0, len = array.length; i < len; i++) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}

function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return '';
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

function blockParams(params, ids) {
  params.path = ids;
  return params;
}

function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}
},{}],22:[function(require,module,exports){
// USAGE:
// var handlebars = require('handlebars');
/* eslint-disable no-var */

// var local = handlebars.create();

var handlebars = require('../dist/cjs/handlebars')['default'];

var printer = require('../dist/cjs/handlebars/compiler/printer');
handlebars.PrintVisitor = printer.PrintVisitor;
handlebars.print = printer.print;

module.exports = handlebars;

// Publish a Node.js require() handler for .handlebars and .hbs files
function extension(module, filename) {
  var fs = require('fs');
  var templateString = fs.readFileSync(filename, 'utf8');
  module.exports = handlebars.compile(templateString);
}
/* istanbul ignore else */
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.handlebars'] = extension;
  require.extensions['.hbs'] = extension;
}

},{"../dist/cjs/handlebars":4,"../dist/cjs/handlebars/compiler/printer":14,"fs":1}],23:[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./source-map/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./source-map/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./source-map/source-node').SourceNode;

},{"./source-map/source-map-consumer":29,"./source-map/source-map-generator":30,"./source-map/source-node":31}],24:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * A data structure which is a combination of an array and a set. Adding a new
   * member is O(1), testing for membership is O(1), and finding the index of an
   * element is O(1). Removing elements from the set is not supported. Only
   * strings are supported for membership.
   */
  function ArraySet() {
    this._array = [];
    this._set = {};
  }

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    var set = new ArraySet();
    for (var i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };

  /**
   * Add the given string to this set.
   *
   * @param String aStr
   */
  ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    var isDuplicate = this.has(aStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      this._set[util.toSetString(aStr)] = idx;
    }
  };

  /**
   * Is the given string a member of this set?
   *
   * @param String aStr
   */
  ArraySet.prototype.has = function ArraySet_has(aStr) {
    return Object.prototype.hasOwnProperty.call(this._set,
                                                util.toSetString(aStr));
  };

  /**
   * What is the index of the given string in the array?
   *
   * @param String aStr
   */
  ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
    if (this.has(aStr)) {
      return this._set[util.toSetString(aStr)];
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };

  /**
   * What is the element at the given index?
   *
   * @param Number aIdx
   */
  ArraySet.prototype.at = function ArraySet_at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error('No element indexed by ' + aIdx);
  };

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  ArraySet.prototype.toArray = function ArraySet_toArray() {
    return this._array.slice();
  };

  exports.ArraySet = ArraySet;

});

},{"./util":32,"amdefine":33}],25:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64 = require('./base64');

  // A single base 64 digit can contain 6 bits of data. For the base 64 variable
  // length quantities we use in the source map spec, the first bit is the sign,
  // the next four bits are the actual value, and the 6th bit is the
  // continuation bit. The continuation bit tells us whether there are more
  // digits in this value following this digit.
  //
  //   Continuation
  //   |    Sign
  //   |    |
  //   V    V
  //   101011

  var VLQ_BASE_SHIFT = 5;

  // binary: 100000
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

  // binary: 011111
  var VLQ_BASE_MASK = VLQ_BASE - 1;

  // binary: 100000
  var VLQ_CONTINUATION_BIT = VLQ_BASE;

  /**
   * Converts from a two-complement value to a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
   *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
   */
  function toVLQSigned(aValue) {
    return aValue < 0
      ? ((-aValue) << 1) + 1
      : (aValue << 1) + 0;
  }

  /**
   * Converts to a two-complement value from a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
   *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
   */
  function fromVLQSigned(aValue) {
    var isNegative = (aValue & 1) === 1;
    var shifted = aValue >> 1;
    return isNegative
      ? -shifted
      : shifted;
  }

  /**
   * Returns the base 64 VLQ encoded value.
   */
  exports.encode = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;

    var vlq = toVLQSigned(aValue);

    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        // There are still more digits in this value, so we must make sure the
        // continuation bit is marked.
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64.encode(digit);
    } while (vlq > 0);

    return encoded;
  };

  /**
   * Decodes the next base 64 VLQ value from the given string and returns the
   * value and the rest of the string via the out parameter.
   */
  exports.decode = function base64VLQ_decode(aStr, aOutParam) {
    var i = 0;
    var strLen = aStr.length;
    var result = 0;
    var shift = 0;
    var continuation, digit;

    do {
      if (i >= strLen) {
        throw new Error("Expected more digits in base 64 VLQ value.");
      }
      digit = base64.decode(aStr.charAt(i++));
      continuation = !!(digit & VLQ_CONTINUATION_BIT);
      digit &= VLQ_BASE_MASK;
      result = result + (digit << shift);
      shift += VLQ_BASE_SHIFT;
    } while (continuation);

    aOutParam.value = fromVLQSigned(result);
    aOutParam.rest = aStr.slice(i);
  };

});

},{"./base64":26,"amdefine":33}],26:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var charToIntMap = {};
  var intToCharMap = {};

  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    .split('')
    .forEach(function (ch, index) {
      charToIntMap[ch] = index;
      intToCharMap[index] = ch;
    });

  /**
   * Encode an integer in the range of 0 to 63 to a single base 64 digit.
   */
  exports.encode = function base64_encode(aNumber) {
    if (aNumber in intToCharMap) {
      return intToCharMap[aNumber];
    }
    throw new TypeError("Must be between 0 and 63: " + aNumber);
  };

  /**
   * Decode a single base 64 digit to an integer.
   */
  exports.decode = function base64_decode(aChar) {
    if (aChar in charToIntMap) {
      return charToIntMap[aChar];
    }
    throw new TypeError("Not a valid base 64 digit: " + aChar);
  };

});

},{"amdefine":33}],27:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * Recursive implementation of binary search.
   *
   * @param aLow Indices here and lower do not contain the needle.
   * @param aHigh Indices here and higher do not contain the needle.
   * @param aNeedle The element being searched for.
   * @param aHaystack The non-empty array being searched.
   * @param aCompare Function which takes two elements and returns -1, 0, or 1.
   */
  function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
    // This function terminates when one of the following is true:
    //
    //   1. We find the exact element we are looking for.
    //
    //   2. We did not find the exact element, but we can return the index of
    //      the next closest element that is less than that element.
    //
    //   3. We did not find the exact element, and there is no next-closest
    //      element which is less than the one we are searching for, so we
    //      return -1.
    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    var cmp = aCompare(aNeedle, aHaystack[mid], true);
    if (cmp === 0) {
      // Found the element we are looking for.
      return mid;
    }
    else if (cmp > 0) {
      // aHaystack[mid] is greater than our needle.
      if (aHigh - mid > 1) {
        // The element is in the upper half.
        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
      }
      // We did not find an exact match, return the next closest one
      // (termination case 2).
      return mid;
    }
    else {
      // aHaystack[mid] is less than our needle.
      if (mid - aLow > 1) {
        // The element is in the lower half.
        return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
      }
      // The exact needle element was not found in this haystack. Determine if
      // we are in termination case (2) or (3) and return the appropriate thing.
      return aLow < 0 ? -1 : aLow;
    }
  }

  /**
   * This is an implementation of binary search which will always try and return
   * the index of next lowest value checked if there is no exact hit. This is
   * because mappings between original and generated line/col pairs are single
   * points, and there is an implicit region between each of them, so a miss
   * just means that you aren't on the very start of a region.
   *
   * @param aNeedle The element you are looking for.
   * @param aHaystack The array that is being searched.
   * @param aCompare A function which takes the needle and an element in the
   *     array and returns -1, 0, or 1 depending on whether the needle is less
   *     than, equal to, or greater than the element, respectively.
   */
  exports.search = function search(aNeedle, aHaystack, aCompare) {
    if (aHaystack.length === 0) {
      return -1;
    }
    return recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare)
  };

});

},{"amdefine":33}],28:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * Determine whether mappingB is after mappingA with respect to generated
   * position.
   */
  function generatedPositionAfter(mappingA, mappingB) {
    // Optimized for most common case
    var lineA = mappingA.generatedLine;
    var lineB = mappingB.generatedLine;
    var columnA = mappingA.generatedColumn;
    var columnB = mappingB.generatedColumn;
    return lineB > lineA || lineB == lineA && columnB >= columnA ||
           util.compareByGeneratedPositions(mappingA, mappingB) <= 0;
  }

  /**
   * A data structure to provide a sorted view of accumulated mappings in a
   * performance conscious manner. It trades a neglibable overhead in general
   * case for a large speedup in case of mappings being added in order.
   */
  function MappingList() {
    this._array = [];
    this._sorted = true;
    // Serves as infimum
    this._last = {generatedLine: -1, generatedColumn: 0};
  }

  /**
   * Iterate through internal items. This method takes the same arguments that
   * `Array.prototype.forEach` takes.
   *
   * NOTE: The order of the mappings is NOT guaranteed.
   */
  MappingList.prototype.unsortedForEach =
    function MappingList_forEach(aCallback, aThisArg) {
      this._array.forEach(aCallback, aThisArg);
    };

  /**
   * Add the given source mapping.
   *
   * @param Object aMapping
   */
  MappingList.prototype.add = function MappingList_add(aMapping) {
    var mapping;
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  };

  /**
   * Returns the flat, sorted array of mappings. The mappings are sorted by
   * generated position.
   *
   * WARNING: This method returns internal data without copying, for
   * performance. The return value must NOT be mutated, and should be treated as
   * an immutable borrow. If you want to take ownership, you must make your own
   * copy.
   */
  MappingList.prototype.toArray = function MappingList_toArray() {
    if (!this._sorted) {
      this._array.sort(util.compareByGeneratedPositions);
      this._sorted = true;
    }
    return this._array;
  };

  exports.MappingList = MappingList;

});

},{"./util":32,"amdefine":33}],29:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');
  var binarySearch = require('./binary-search');
  var ArraySet = require('./array-set').ArraySet;
  var base64VLQ = require('./base64-vlq');

  /**
   * A SourceMapConsumer instance represents a parsed source map which we can
   * query for information about the original file positions by giving it a file
   * position in the generated source.
   *
   * The only parameter is the raw source map (either as a JSON string, or
   * already parsed to an object). According to the spec, source maps have the
   * following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - sources: An array of URLs to the original source files.
   *   - names: An array of identifiers which can be referrenced by individual mappings.
   *   - sourceRoot: Optional. The URL root from which all sources are relative.
   *   - sourcesContent: Optional. An array of contents of the original source files.
   *   - mappings: A string of base64 VLQs which contain the actual mappings.
   *   - file: Optional. The generated file this source map is associated with.
   *
   * Here is an example source map, taken from the source map spec[0]:
   *
   *     {
   *       version : 3,
   *       file: "out.js",
   *       sourceRoot : "",
   *       sources: ["foo.js", "bar.js"],
   *       names: ["src", "maps", "are", "fun"],
   *       mappings: "AA,AB;;ABCDE;"
   *     }
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
   */
  function SourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    var version = util.getArg(sourceMap, 'version');
    var sources = util.getArg(sourceMap, 'sources');
    // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
    // requires the array) to play nice here.
    var names = util.getArg(sourceMap, 'names', []);
    var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
    var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
    var mappings = util.getArg(sourceMap, 'mappings');
    var file = util.getArg(sourceMap, 'file', null);

    // Once again, Sass deviates from the spec and supplies the version as a
    // string rather than a number, so we use loose equality checking here.
    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    sources = sources.map(util.normalize);

    // Pass `true` below to allow duplicate names and sources. While source maps
    // are intended to be compressed and deduplicated, the TypeScript compiler
    // sometimes generates source maps with duplicates in them. See Github issue
    // #72 and bugzil.la/889492.
    this._names = ArraySet.fromArray(names, true);
    this._sources = ArraySet.fromArray(sources, true);

    this.sourceRoot = sourceRoot;
    this.sourcesContent = sourcesContent;
    this._mappings = mappings;
    this.file = file;
  }

  /**
   * Create a SourceMapConsumer from a SourceMapGenerator.
   *
   * @param SourceMapGenerator aSourceMap
   *        The source map that will be consumed.
   * @returns SourceMapConsumer
   */
  SourceMapConsumer.fromSourceMap =
    function SourceMapConsumer_fromSourceMap(aSourceMap) {
      var smc = Object.create(SourceMapConsumer.prototype);

      smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                              smc.sourceRoot);
      smc.file = aSourceMap._file;

      smc.__generatedMappings = aSourceMap._mappings.toArray().slice();
      smc.__originalMappings = aSourceMap._mappings.toArray().slice()
        .sort(util.compareByOriginalPositions);

      return smc;
    };

  /**
   * The version of the source mapping spec that we are consuming.
   */
  SourceMapConsumer.prototype._version = 3;

  /**
   * The list of original sources.
   */
  Object.defineProperty(SourceMapConsumer.prototype, 'sources', {
    get: function () {
      return this._sources.toArray().map(function (s) {
        return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
      }, this);
    }
  });

  // `__generatedMappings` and `__originalMappings` are arrays that hold the
  // parsed mapping coordinates from the source map's "mappings" attribute. They
  // are lazily instantiated, accessed via the `_generatedMappings` and
  // `_originalMappings` getters respectively, and we only parse the mappings
  // and create these arrays once queried for a source location. We jump through
  // these hoops because there can be many thousands of mappings, and parsing
  // them is expensive, so we only want to do it if we must.
  //
  // Each object in the arrays is of the form:
  //
  //     {
  //       generatedLine: The line number in the generated code,
  //       generatedColumn: The column number in the generated code,
  //       source: The path to the original source file that generated this
  //               chunk of code,
  //       originalLine: The line number in the original source that
  //                     corresponds to this chunk of generated code,
  //       originalColumn: The column number in the original source that
  //                       corresponds to this chunk of generated code,
  //       name: The name of the original symbol which generated this chunk of
  //             code.
  //     }
  //
  // All properties except for `generatedLine` and `generatedColumn` can be
  // `null`.
  //
  // `_generatedMappings` is ordered by the generated positions.
  //
  // `_originalMappings` is ordered by the original positions.

  SourceMapConsumer.prototype.__generatedMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
    get: function () {
      if (!this.__generatedMappings) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__generatedMappings;
    }
  });

  SourceMapConsumer.prototype.__originalMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
    get: function () {
      if (!this.__originalMappings) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__originalMappings;
    }
  });

  SourceMapConsumer.prototype._nextCharIsMappingSeparator =
    function SourceMapConsumer_nextCharIsMappingSeparator(aStr) {
      var c = aStr.charAt(0);
      return c === ";" || c === ",";
    };

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  SourceMapConsumer.prototype._parseMappings =
    function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var str = aStr;
      var temp = {};
      var mapping;

      while (str.length > 0) {
        if (str.charAt(0) === ';') {
          generatedLine++;
          str = str.slice(1);
          previousGeneratedColumn = 0;
        }
        else if (str.charAt(0) === ',') {
          str = str.slice(1);
        }
        else {
          mapping = {};
          mapping.generatedLine = generatedLine;

          // Generated column.
          base64VLQ.decode(str, temp);
          mapping.generatedColumn = previousGeneratedColumn + temp.value;
          previousGeneratedColumn = mapping.generatedColumn;
          str = temp.rest;

          if (str.length > 0 && !this._nextCharIsMappingSeparator(str)) {
            // Original source.
            base64VLQ.decode(str, temp);
            mapping.source = this._sources.at(previousSource + temp.value);
            previousSource += temp.value;
            str = temp.rest;
            if (str.length === 0 || this._nextCharIsMappingSeparator(str)) {
              throw new Error('Found a source, but no line and column');
            }

            // Original line.
            base64VLQ.decode(str, temp);
            mapping.originalLine = previousOriginalLine + temp.value;
            previousOriginalLine = mapping.originalLine;
            // Lines are stored 0-based
            mapping.originalLine += 1;
            str = temp.rest;
            if (str.length === 0 || this._nextCharIsMappingSeparator(str)) {
              throw new Error('Found a source and line, but no column');
            }

            // Original column.
            base64VLQ.decode(str, temp);
            mapping.originalColumn = previousOriginalColumn + temp.value;
            previousOriginalColumn = mapping.originalColumn;
            str = temp.rest;

            if (str.length > 0 && !this._nextCharIsMappingSeparator(str)) {
              // Original name.
              base64VLQ.decode(str, temp);
              mapping.name = this._names.at(previousName + temp.value);
              previousName += temp.value;
              str = temp.rest;
            }
          }

          this.__generatedMappings.push(mapping);
          if (typeof mapping.originalLine === 'number') {
            this.__originalMappings.push(mapping);
          }
        }
      }

      this.__generatedMappings.sort(util.compareByGeneratedPositions);
      this.__originalMappings.sort(util.compareByOriginalPositions);
    };

  /**
   * Find the mapping that best matches the hypothetical "needle" mapping that
   * we are searching for in the given "haystack" of mappings.
   */
  SourceMapConsumer.prototype._findMapping =
    function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                           aColumnName, aComparator) {
      // To return the position we are searching for, we must first find the
      // mapping for the given position and then return the opposite position it
      // points to. Because the mappings are sorted, we can use binary search to
      // find the best mapping.

      if (aNeedle[aLineName] <= 0) {
        throw new TypeError('Line must be greater than or equal to 1, got '
                            + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError('Column must be greater than or equal to 0, got '
                            + aNeedle[aColumnName]);
      }

      return binarySearch.search(aNeedle, aMappings, aComparator);
    };

  /**
   * Compute the last column for each generated mapping. The last column is
   * inclusive.
   */
  SourceMapConsumer.prototype.computeColumnSpans =
    function SourceMapConsumer_computeColumnSpans() {
      for (var index = 0; index < this._generatedMappings.length; ++index) {
        var mapping = this._generatedMappings[index];

        // Mappings do not contain a field for the last generated columnt. We
        // can come up with an optimistic estimate, however, by assuming that
        // mappings are contiguous (i.e. given two consecutive mappings, the
        // first mapping ends where the second one starts).
        if (index + 1 < this._generatedMappings.length) {
          var nextMapping = this._generatedMappings[index + 1];

          if (mapping.generatedLine === nextMapping.generatedLine) {
            mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
            continue;
          }
        }

        // The last mapping for each line spans the entire line.
        mapping.lastGeneratedColumn = Infinity;
      }
    };

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.
   *   - column: The column number in the generated source.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.
   *   - column: The column number in the original source, or null.
   *   - name: The original identifier, or null.
   */
  SourceMapConsumer.prototype.originalPositionFor =
    function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };

      var index = this._findMapping(needle,
                                    this._generatedMappings,
                                    "generatedLine",
                                    "generatedColumn",
                                    util.compareByGeneratedPositions);

      if (index >= 0) {
        var mapping = this._generatedMappings[index];

        if (mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, 'source', null);
          if (source != null && this.sourceRoot != null) {
            source = util.join(this.sourceRoot, source);
          }
          return {
            source: source,
            line: util.getArg(mapping, 'originalLine', null),
            column: util.getArg(mapping, 'originalColumn', null),
            name: util.getArg(mapping, 'name', null)
          };
        }
      }

      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * availible.
   */
  SourceMapConsumer.prototype.sourceContentFor =
    function SourceMapConsumer_sourceContentFor(aSource) {
      if (!this.sourcesContent) {
        return null;
      }

      if (this.sourceRoot != null) {
        aSource = util.relative(this.sourceRoot, aSource);
      }

      if (this._sources.has(aSource)) {
        return this.sourcesContent[this._sources.indexOf(aSource)];
      }

      var url;
      if (this.sourceRoot != null
          && (url = util.urlParse(this.sourceRoot))) {
        // XXX: file:// URIs and absolute paths lead to unexpected behavior for
        // many users. We can help them out when they expect file:// URIs to
        // behave like it would if they were running a local HTTP server. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
        var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
        if (url.scheme == "file"
            && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
        }

        if ((!url.path || url.path == "/")
            && this._sources.has("/" + aSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + aSource)];
        }
      }

      throw new Error('"' + aSource + '" is not in the SourceMap.');
    };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: The column number in the original source.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  SourceMapConsumer.prototype.generatedPositionFor =
    function SourceMapConsumer_generatedPositionFor(aArgs) {
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: util.getArg(aArgs, 'column')
      };

      if (this.sourceRoot != null) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }

      var index = this._findMapping(needle,
                                    this._originalMappings,
                                    "originalLine",
                                    "originalColumn",
                                    util.compareByOriginalPositions);

      if (index >= 0) {
        var mapping = this._originalMappings[index];

        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null),
          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }

      return {
        line: null,
        column: null,
        lastColumn: null
      };
    };

  /**
   * Returns all generated line and column information for the original source
   * and line provided. The only argument is an object with the following
   * properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *
   * and an array of objects is returned, each with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  SourceMapConsumer.prototype.allGeneratedPositionsFor =
    function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
      // When there is no exact match, SourceMapConsumer.prototype._findMapping
      // returns the index of the closest mapping less than the needle. By
      // setting needle.originalColumn to Infinity, we thus find the last
      // mapping for the given line, provided such a mapping exists.
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: Infinity
      };

      if (this.sourceRoot != null) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }

      var mappings = [];

      var index = this._findMapping(needle,
                                    this._originalMappings,
                                    "originalLine",
                                    "originalColumn",
                                    util.compareByOriginalPositions);
      if (index >= 0) {
        var mapping = this._originalMappings[index];

        while (mapping && mapping.originalLine === needle.originalLine) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[--index];
        }
      }

      return mappings.reverse();
    };

  SourceMapConsumer.GENERATED_ORDER = 1;
  SourceMapConsumer.ORIGINAL_ORDER = 2;

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param Function aCallback
   *        The function that is called with each mapping.
   * @param Object aContext
   *        Optional. If specified, this object will be the value of `this` every
   *        time that `aCallback` is called.
   * @param aOrder
   *        Either `SourceMapConsumer.GENERATED_ORDER` or
   *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *        iterate over the mappings sorted by the generated file's line/column
   *        order or the original's source/line/column order, respectively. Defaults to
   *        `SourceMapConsumer.GENERATED_ORDER`.
   */
  SourceMapConsumer.prototype.eachMapping =
    function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

      var mappings;
      switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
      }

      var sourceRoot = this.sourceRoot;
      mappings.map(function (mapping) {
        var source = mapping.source;
        if (source != null && sourceRoot != null) {
          source = util.join(sourceRoot, source);
        }
        return {
          source: source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name
        };
      }).forEach(aCallback, context);
    };

  exports.SourceMapConsumer = SourceMapConsumer;

});

},{"./array-set":24,"./base64-vlq":25,"./binary-search":27,"./util":32,"amdefine":33}],30:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64VLQ = require('./base64-vlq');
  var util = require('./util');
  var ArraySet = require('./array-set').ArraySet;
  var MappingList = require('./mapping-list').MappingList;

  /**
   * An instance of the SourceMapGenerator represents a source map which is
   * being built incrementally. You may pass an object with the following
   * properties:
   *
   *   - file: The filename of the generated source.
   *   - sourceRoot: A root for all relative URLs in this source map.
   */
  function SourceMapGenerator(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util.getArg(aArgs, 'file', null);
    this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
    this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = new MappingList();
    this._sourcesContents = null;
  }

  SourceMapGenerator.prototype._version = 3;

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param aSourceMapConsumer The SourceMap.
   */
  SourceMapGenerator.fromSourceMap =
    function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator({
        file: aSourceMapConsumer.file,
        sourceRoot: sourceRoot
      });
      aSourceMapConsumer.eachMapping(function (mapping) {
        var newMapping = {
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }
        };

        if (mapping.source != null) {
          newMapping.source = mapping.source;
          if (sourceRoot != null) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }

          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };

          if (mapping.name != null) {
            newMapping.name = mapping.name;
          }
        }

        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  SourceMapGenerator.prototype.addMapping =
    function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, 'generated');
      var original = util.getArg(aArgs, 'original', null);
      var source = util.getArg(aArgs, 'source', null);
      var name = util.getArg(aArgs, 'name', null);

      if (!this._skipValidation) {
        this._validateMapping(generated, original, source, name);
      }

      if (source != null && !this._sources.has(source)) {
        this._sources.add(source);
      }

      if (name != null && !this._names.has(name)) {
        this._names.add(name);
      }

      this._mappings.add({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source: source,
        name: name
      });
    };

  /**
   * Set the source content for a source file.
   */
  SourceMapGenerator.prototype.setSourceContent =
    function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot != null) {
        source = util.relative(this._sourceRoot, source);
      }

      if (aSourceContent != null) {
        // Add the source content to the _sourcesContents map.
        // Create a new _sourcesContents map if the property is null.
        if (!this._sourcesContents) {
          this._sourcesContents = {};
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else if (this._sourcesContents) {
        // Remove the source file from the _sourcesContents map.
        // If the _sourcesContents map is empty, set the property to null.
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param aSourceMapConsumer The source map to be applied.
   * @param aSourceFile Optional. The filename of the source file.
   *        If omitted, SourceMapConsumer's file property will be used.
   * @param aSourceMapPath Optional. The dirname of the path to the source map
   *        to be applied. If relative, it is relative to the SourceMapConsumer.
   *        This parameter is needed when the two source maps aren't in the same
   *        directory, and the source map to be applied contains relative source
   *        paths. If so, those relative source paths need to be rewritten
   *        relative to the SourceMapGenerator.
   */
  SourceMapGenerator.prototype.applySourceMap =
    function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      var sourceFile = aSourceFile;
      // If aSourceFile is omitted, we will use the file property of the SourceMap
      if (aSourceFile == null) {
        if (aSourceMapConsumer.file == null) {
          throw new Error(
            'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
            'or the source map\'s "file" property. Both were omitted.'
          );
        }
        sourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      // Make "sourceFile" relative if an absolute Url is passed.
      if (sourceRoot != null) {
        sourceFile = util.relative(sourceRoot, sourceFile);
      }
      // Applying the SourceMap can add and remove items from the sources and
      // the names array.
      var newSources = new ArraySet();
      var newNames = new ArraySet();

      // Find mappings for the "sourceFile"
      this._mappings.unsortedForEach(function (mapping) {
        if (mapping.source === sourceFile && mapping.originalLine != null) {
          // Check if it can be mapped by the source map, then update the mapping.
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source != null) {
            // Copy mapping
            mapping.source = original.source;
            if (aSourceMapPath != null) {
              mapping.source = util.join(aSourceMapPath, mapping.source)
            }
            if (sourceRoot != null) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name != null) {
              mapping.name = original.name;
            }
          }
        }

        var source = mapping.source;
        if (source != null && !newSources.has(source)) {
          newSources.add(source);
        }

        var name = mapping.name;
        if (name != null && !newNames.has(name)) {
          newNames.add(name);
        }

      }, this);
      this._sources = newSources;
      this._names = newNames;

      // Copy sourcesContents of applied map.
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aSourceMapPath != null) {
            sourceFile = util.join(aSourceMapPath, sourceFile);
          }
          if (sourceRoot != null) {
            sourceFile = util.relative(sourceRoot, sourceFile);
          }
          this.setSourceContent(sourceFile, content);
        }
      }, this);
    };

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  SourceMapGenerator.prototype._validateMapping =
    function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                                aName) {
      if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
          && aGenerated.line > 0 && aGenerated.column >= 0
          && !aOriginal && !aSource && !aName) {
        // Case 1.
        return;
      }
      else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
               && aOriginal && 'line' in aOriginal && 'column' in aOriginal
               && aGenerated.line > 0 && aGenerated.column >= 0
               && aOriginal.line > 0 && aOriginal.column >= 0
               && aSource) {
        // Cases 2 and 3.
        return;
      }
      else {
        throw new Error('Invalid mapping: ' + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        }));
      }
    };

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  SourceMapGenerator.prototype._serializeMappings =
    function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = '';
      var mapping;

      var mappings = this._mappings.toArray();

      for (var i = 0, len = mappings.length; i < len; i++) {
        mapping = mappings[i];

        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          while (mapping.generatedLine !== previousGeneratedLine) {
            result += ';';
            previousGeneratedLine++;
          }
        }
        else {
          if (i > 0) {
            if (!util.compareByGeneratedPositions(mapping, mappings[i - 1])) {
              continue;
            }
            result += ',';
          }
        }

        result += base64VLQ.encode(mapping.generatedColumn
                                   - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;

        if (mapping.source != null) {
          result += base64VLQ.encode(this._sources.indexOf(mapping.source)
                                     - previousSource);
          previousSource = this._sources.indexOf(mapping.source);

          // lines are stored 0-based in SourceMap spec version 3
          result += base64VLQ.encode(mapping.originalLine - 1
                                     - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;

          result += base64VLQ.encode(mapping.originalColumn
                                     - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;

          if (mapping.name != null) {
            result += base64VLQ.encode(this._names.indexOf(mapping.name)
                                       - previousName);
            previousName = this._names.indexOf(mapping.name);
          }
        }
      }

      return result;
    };

  SourceMapGenerator.prototype._generateSourcesContent =
    function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function (source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot != null) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents,
                                                    key)
          ? this._sourcesContents[key]
          : null;
      }, this);
    };

  /**
   * Externalize the source map.
   */
  SourceMapGenerator.prototype.toJSON =
    function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._file != null) {
        map.file = this._file;
      }
      if (this._sourceRoot != null) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }

      return map;
    };

  /**
   * Render the source map being generated to a string.
   */
  SourceMapGenerator.prototype.toString =
    function SourceMapGenerator_toString() {
      return JSON.stringify(this);
    };

  exports.SourceMapGenerator = SourceMapGenerator;

});

},{"./array-set":24,"./base64-vlq":25,"./mapping-list":28,"./util":32,"amdefine":33}],31:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
  var util = require('./util');

  // Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
  // operating systems these days (capturing the result).
  var REGEX_NEWLINE = /(\r?\n)/;

  // Newline character code for charCodeAt() comparisons
  var NEWLINE_CODE = 10;

  // Private symbol for identifying `SourceNode`s when multiple versions of
  // the source-map library are loaded. This MUST NOT CHANGE across
  // versions!
  var isSourceNode = "$$$isSourceNode$$$";

  /**
   * SourceNodes provide a way to abstract over interpolating/concatenating
   * snippets of generated JavaScript source code while maintaining the line and
   * column information associated with the original source code.
   *
   * @param aLine The original line number.
   * @param aColumn The original column number.
   * @param aSource The original source's filename.
   * @param aChunks Optional. An array of strings which are snippets of
   *        generated JS, or other SourceNodes.
   * @param aName The original identifier.
   */
  function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine == null ? null : aLine;
    this.column = aColumn == null ? null : aColumn;
    this.source = aSource == null ? null : aSource;
    this.name = aName == null ? null : aName;
    this[isSourceNode] = true;
    if (aChunks != null) this.add(aChunks);
  }

  /**
   * Creates a SourceNode from generated code and a SourceMapConsumer.
   *
   * @param aGeneratedCode The generated code
   * @param aSourceMapConsumer The SourceMap for the generated code
   * @param aRelativePath Optional. The path that relative sources in the
   *        SourceMapConsumer should be relative to.
   */
  SourceNode.fromStringWithSourceMap =
    function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
      // The SourceNode we want to fill with the generated code
      // and the SourceMap
      var node = new SourceNode();

      // All even indices of this array are one line of the generated code,
      // while all odd indices are the newlines between two adjacent lines
      // (since `REGEX_NEWLINE` captures its match).
      // Processed fragments are removed from this array, by calling `shiftNextLine`.
      var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
      var shiftNextLine = function() {
        var lineContents = remainingLines.shift();
        // The last line of a file might not have a newline.
        var newLine = remainingLines.shift() || "";
        return lineContents + newLine;
      };

      // We need to remember the position of "remainingLines"
      var lastGeneratedLine = 1, lastGeneratedColumn = 0;

      // The generate SourceNodes we need a code range.
      // To extract it current and last mapping is used.
      // Here we store the last mapping.
      var lastMapping = null;

      aSourceMapConsumer.eachMapping(function (mapping) {
        if (lastMapping !== null) {
          // We add the code from "lastMapping" to "mapping":
          // First check if there is a new line in between.
          if (lastGeneratedLine < mapping.generatedLine) {
            var code = "";
            // Associate first line with "lastMapping"
            addMappingWithCode(lastMapping, shiftNextLine());
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
            // The remaining code is added without mapping
          } else {
            // There is no new line in between.
            // Associate the code between "lastGeneratedColumn" and
            // "mapping.generatedColumn" with "lastMapping"
            var nextLine = remainingLines[0];
            var code = nextLine.substr(0, mapping.generatedColumn -
                                          lastGeneratedColumn);
            remainingLines[0] = nextLine.substr(mapping.generatedColumn -
                                                lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            // No more remaining code, continue
            lastMapping = mapping;
            return;
          }
        }
        // We add the generated code until the first mapping
        // to the SourceNode without any mapping.
        // Each line is added as separate string.
        while (lastGeneratedLine < mapping.generatedLine) {
          node.add(shiftNextLine());
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[0];
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[0] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      // We have processed all mappings.
      if (remainingLines.length > 0) {
        if (lastMapping) {
          // Associate the remaining code in the current line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
        }
        // and add the remaining lines without any mapping
        node.add(remainingLines.join(""));
      }

      // Copy sourcesContent into SourceNode
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aRelativePath != null) {
            sourceFile = util.join(aRelativePath, sourceFile);
          }
          node.setSourceContent(sourceFile, content);
        }
      });

      return node;

      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === undefined) {
          node.add(code);
        } else {
          var source = aRelativePath
            ? util.join(aRelativePath, mapping.source)
            : mapping.source;
          node.add(new SourceNode(mapping.originalLine,
                                  mapping.originalColumn,
                                  source,
                                  code,
                                  mapping.name));
        }
      }
    };

  /**
   * Add a chunk of generated JS to this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.add = function SourceNode_add(aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function (chunk) {
        this.add(chunk);
      }, this);
    }
    else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Add a chunk of generated JS to the beginning of this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
    if (Array.isArray(aChunk)) {
      for (var i = aChunk.length-1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    }
    else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Walk over the tree of JS snippets in this node and its children. The
   * walking function is called once for each snippet of JS and is passed that
   * snippet and the its original associated source's line/column location.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walk = function SourceNode_walk(aFn) {
    var chunk;
    for (var i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk[isSourceNode]) {
        chunk.walk(aFn);
      }
      else {
        if (chunk !== '') {
          aFn(chunk, { source: this.source,
                       line: this.line,
                       column: this.column,
                       name: this.name });
        }
      }
    }
  };

  /**
   * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
   * each of `this.children`.
   *
   * @param aSep The separator.
   */
  SourceNode.prototype.join = function SourceNode_join(aSep) {
    var newChildren;
    var i;
    var len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len-1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  };

  /**
   * Call String.prototype.replace on the very right-most source snippet. Useful
   * for trimming whitespace from the end of a source node, etc.
   *
   * @param aPattern The pattern to replace.
   * @param aReplacement The thing to replace the pattern with.
   */
  SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
    var lastChild = this.children[this.children.length - 1];
    if (lastChild[isSourceNode]) {
      lastChild.replaceRight(aPattern, aReplacement);
    }
    else if (typeof lastChild === 'string') {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    }
    else {
      this.children.push(''.replace(aPattern, aReplacement));
    }
    return this;
  };

  /**
   * Set the source content for a source file. This will be added to the SourceMapGenerator
   * in the sourcesContent field.
   *
   * @param aSourceFile The filename of the source file
   * @param aSourceContent The content of the source file
   */
  SourceNode.prototype.setSourceContent =
    function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };

  /**
   * Walk over the tree of SourceNodes. The walking function is called for each
   * source file content and is passed the filename and source content.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walkSourceContents =
    function SourceNode_walkSourceContents(aFn) {
      for (var i = 0, len = this.children.length; i < len; i++) {
        if (this.children[i][isSourceNode]) {
          this.children[i].walkSourceContents(aFn);
        }
      }

      var sources = Object.keys(this.sourceContents);
      for (var i = 0, len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };

  /**
   * Return the string representation of this source node. Walks over the tree
   * and concatenates all the various snippets together to one string.
   */
  SourceNode.prototype.toString = function SourceNode_toString() {
    var str = "";
    this.walk(function (chunk) {
      str += chunk;
    });
    return str;
  };

  /**
   * Returns the string representation of this source node along with a source
   * map.
   */
  SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
    var generated = {
      code: "",
      line: 1,
      column: 0
    };
    var map = new SourceMapGenerator(aArgs);
    var sourceMappingActive = false;
    var lastOriginalSource = null;
    var lastOriginalLine = null;
    var lastOriginalColumn = null;
    var lastOriginalName = null;
    this.walk(function (chunk, original) {
      generated.code += chunk;
      if (original.source !== null
          && original.line !== null
          && original.column !== null) {
        if(lastOriginalSource !== original.source
           || lastOriginalLine !== original.line
           || lastOriginalColumn !== original.column
           || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      for (var idx = 0, length = chunk.length; idx < length; idx++) {
        if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
          generated.line++;
          generated.column = 0;
          // Mappings end at eol
          if (idx + 1 === length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      }
    });
    this.walkSourceContents(function (sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });

    return { code: generated.code, map: map };
  };

  exports.SourceNode = SourceNode;

});

},{"./source-map-generator":30,"./util":32,"amdefine":33}],32:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * This is a helper function for getting values from parameter/options
   * objects.
   *
   * @param args The object we are extracting values from
   * @param name The name of the property we are getting.
   * @param defaultValue An optional value to return if the property is missing
   * from the object. If this is not specified and the property is missing, an
   * error will be thrown.
   */
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    } else {
      throw new Error('"' + aName + '" is a required argument.');
    }
  }
  exports.getArg = getArg;

  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;

  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);
    if (!match) {
      return null;
    }
    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }
  exports.urlParse = urlParse;

  function urlGenerate(aParsedUrl) {
    var url = '';
    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ':';
    }
    url += '//';
    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + '@';
    }
    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }
    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port
    }
    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }
    return url;
  }
  exports.urlGenerate = urlGenerate;

  /**
   * Normalizes a path, or the path portion of a URL:
   *
   * - Replaces consequtive slashes with one slash.
   * - Removes unnecessary '.' parts.
   * - Removes unnecessary '<dir>/..' parts.
   *
   * Based on code in the Node.js 'path' core module.
   *
   * @param aPath The path or url to normalize.
   */
  function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = (path.charAt(0) === '/');

    var parts = path.split(/\/+/);
    for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
      part = parts[i];
      if (part === '.') {
        parts.splice(i, 1);
      } else if (part === '..') {
        up++;
      } else if (up > 0) {
        if (part === '') {
          // The first part is blank if the path is absolute. Trying to go
          // above the root is a no-op. Therefore we can remove all '..' parts
          // directly after the root.
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }
    path = parts.join('/');

    if (path === '') {
      path = isAbsolute ? '/' : '.';
    }

    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
  }
  exports.normalize = normalize;

  /**
   * Joins two paths/URLs.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be joined with the root.
   *
   * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
   *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
   *   first.
   * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
   *   is updated with the result and aRoot is returned. Otherwise the result
   *   is returned.
   *   - If aPath is absolute, the result is aPath.
   *   - Otherwise the two paths are joined with a slash.
   * - Joining for example 'http://' and 'www.example.com' is also supported.
   */
  function join(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }
    if (aPath === "") {
      aPath = ".";
    }
    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);
    if (aRootUrl) {
      aRoot = aRootUrl.path || '/';
    }

    // `join(foo, '//www.example.org')`
    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }
      return urlGenerate(aPathUrl);
    }

    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    }

    // `join('http://', 'www.example.com')`
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }

    var joined = aPath.charAt(0) === '/'
      ? aPath
      : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }
    return joined;
  }
  exports.join = join;

  /**
   * Make a path relative to a URL or another path.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be made relative to aRoot.
   */
  function relative(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }

    aRoot = aRoot.replace(/\/$/, '');

    // XXX: It is possible to remove this block, and the tests still pass!
    var url = urlParse(aRoot);
    if (aPath.charAt(0) == "/" && url && url.path == "/") {
      return aPath.slice(1);
    }

    return aPath.indexOf(aRoot + '/') === 0
      ? aPath.substr(aRoot.length + 1)
      : aPath;
  }
  exports.relative = relative;

  /**
   * Because behavior goes wacky when you set `__proto__` on objects, we
   * have to prefix all the strings in our set with an arbitrary character.
   *
   * See https://github.com/mozilla/source-map/pull/31 and
   * https://github.com/mozilla/source-map/issues/30
   *
   * @param String aStr
   */
  function toSetString(aStr) {
    return '$' + aStr;
  }
  exports.toSetString = toSetString;

  function fromSetString(aStr) {
    return aStr.substr(1);
  }
  exports.fromSetString = fromSetString;

  function strcmp(aStr1, aStr2) {
    var s1 = aStr1 || "";
    var s2 = aStr2 || "";
    return (s1 > s2) - (s1 < s2);
  }

  /**
   * Comparator between two mappings where the original positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same original source/line/column, but different generated
   * line and column the same. Useful when searching for a mapping with a
   * stubbed out mapping.
   */
  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp;

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp || onlyCompareOriginal) {
      return cmp;
    }

    cmp = strcmp(mappingA.name, mappingB.name);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp) {
      return cmp;
    }

    return mappingA.generatedColumn - mappingB.generatedColumn;
  };
  exports.compareByOriginalPositions = compareByOriginalPositions;

  /**
   * Comparator between two mappings where the generated positions are
   * compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same generated line and column, but different
   * source/name/original line and column the same. Useful when searching for a
   * mapping with a stubbed out mapping.
   */
  function compareByGeneratedPositions(mappingA, mappingB, onlyCompareGenerated) {
    var cmp;

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp || onlyCompareGenerated) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  };
  exports.compareByGeneratedPositions = compareByGeneratedPositions;

});

},{"amdefine":33}],33:[function(require,module,exports){
(function (process,__filename){
/** vim: et:ts=4:sw=4:sts=4
 * @license amdefine 1.0.0 Copyright (c) 2011-2015, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/amdefine for details
 */

/*jslint node: true */
/*global module, process */
'use strict';

/**
 * Creates a define for node.
 * @param {Object} module the "module" object that is defined by Node for the
 * current module.
 * @param {Function} [requireFn]. Node's require function for the current module.
 * It only needs to be passed in Node versions before 0.5, when module.require
 * did not exist.
 * @returns {Function} a define function that is usable for the current node
 * module.
 */
function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = require('path'),
        makeRequire, stringRequire;

    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i+= 1) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                    //End of the line. Keep at least one non-dot
                    //path segment at the front so it can be mapped
                    //correctly to disk. Otherwise, there is likely
                    //no path mapping for a path starting with '..'.
                    //This can still fail, but catches the most reasonable
                    //uses of ..
                    break;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }

    function normalize(name, baseName) {
        var baseParts;

        //Adjust any relative paths.
        if (name && name.charAt(0) === '.') {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                baseParts = baseName.split('/');
                baseParts = baseParts.slice(0, baseParts.length - 1);
                baseParts = baseParts.concat(name.split('/'));
                trimDots(baseParts);
                name = baseParts.join('/');
            }
        }

        return name;
    }

    /**
     * Create the normalize() function passed to a loader plugin's
     * normalize method.
     */
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(id) {
        function load(value) {
            loaderCache[id] = value;
        }

        load.fromText = function (id, text) {
            //This one is difficult because the text can/probably uses
            //define, and any relative paths and requires should be relative
            //to that id was it would be found on disk. But this would require
            //bootstrapping a module/require fairly deeply from node core.
            //Not sure how best to go about that yet.
            throw new Error('amdefine does not implement load.fromText');
        };

        return load;
    }

    makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
            if (typeof deps === 'string') {
                //Synchronous, single module require('')
                return stringRequire(systemRequire, exports, module, deps, relId);
            } else {
                //Array of dependencies with a callback.

                //Convert the dependencies to modules.
                deps = deps.map(function (depName) {
                    return stringRequire(systemRequire, exports, module, depName, relId);
                });

                //Wait for next tick to call back the require call.
                if (callback) {
                    process.nextTick(function () {
                        callback.apply(null, deps);
                    });
                }
            }
        }

        amdRequire.toUrl = function (filePath) {
            if (filePath.indexOf('.') === 0) {
                return normalize(filePath, path.dirname(module.filename));
            } else {
                return filePath;
            }
        };

        return amdRequire;
    };

    //Favor explicit value, passed in if the module wants to support Node 0.4.
    requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
    };

    function runFactory(id, deps, factory) {
        var r, e, m, result;

        if (id) {
            e = loaderCache[id] = {};
            m = {
                id: id,
                uri: __filename,
                exports: e
            };
            r = makeRequire(requireFn, e, m, id);
        } else {
            //Only support one define call per file
            if (alreadyCalled) {
                throw new Error('amdefine with no module ID cannot be called more than once per file.');
            }
            alreadyCalled = true;

            //Use the real variables from node
            //Use module.exports for exports, since
            //the exports in here is amdefine exports.
            e = module.exports;
            m = module;
            r = makeRequire(requireFn, e, m, module.id);
        }

        //If there are dependencies, they are strings, so need
        //to convert them to dependency values.
        if (deps) {
            deps = deps.map(function (depName) {
                return r(depName);
            });
        }

        //Call the factory with the right dependencies.
        if (typeof factory === 'function') {
            result = factory.apply(m.exports, deps);
        } else {
            result = factory;
        }

        if (result !== undefined) {
            m.exports = result;
            if (id) {
                loaderCache[id] = m.exports;
            }
        }
    }

    stringRequire = function (systemRequire, exports, module, id, relId) {
        //Split the ID by a ! so that
        var index = id.indexOf('!'),
            originalId = id,
            prefix, plugin;

        if (index === -1) {
            id = normalize(id, relId);

            //Straight module lookup. If it is one of the special dependencies,
            //deal with it, otherwise, delegate to node.
            if (id === 'require') {
                return makeRequire(systemRequire, exports, module, relId);
            } else if (id === 'exports') {
                return exports;
            } else if (id === 'module') {
                return module;
            } else if (loaderCache.hasOwnProperty(id)) {
                return loaderCache[id];
            } else if (defineCache[id]) {
                runFactory.apply(null, defineCache[id]);
                return loaderCache[id];
            } else {
                if(systemRequire) {
                    return systemRequire(originalId);
                } else {
                    throw new Error('No module with ID: ' + id);
                }
            }
        } else {
            //There is a plugin in play.
            prefix = id.substring(0, index);
            id = id.substring(index + 1, id.length);

            plugin = stringRequire(systemRequire, exports, module, prefix, relId);

            if (plugin.normalize) {
                id = plugin.normalize(id, makeNormalize(relId));
            } else {
                //Normalize the ID normally.
                id = normalize(id, relId);
            }

            if (loaderCache[id]) {
                return loaderCache[id];
            } else {
                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});

                return loaderCache[id];
            }
        }
    };

    //Create a define function specific to the module asking for amdefine.
    function define(id, deps, factory) {
        if (Array.isArray(id)) {
            factory = deps;
            deps = id;
            id = undefined;
        } else if (typeof id !== 'string') {
            factory = id;
            id = deps = undefined;
        }

        if (deps && !Array.isArray(deps)) {
            factory = deps;
            deps = undefined;
        }

        if (!deps) {
            deps = ['require', 'exports', 'module'];
        }

        //Set up properties for this module. If an ID, then use
        //internal cache. If no ID, then use the external variables
        //for this node module.
        if (id) {
            //Put the module in deep freeze until there is a
            //require call for it.
            defineCache[id] = [id, deps, factory];
        } else {
            runFactory(id, deps, factory);
        }
    }

    //define.require, which has access to all the values in the
    //cache. Useful for AMD modules that all have IDs in the file,
    //but need to finally export a value to node based on one of those
    //IDs.
    define.require = function (id) {
        if (loaderCache[id]) {
            return loaderCache[id];
        }

        if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
        }
    };

    define.amd = {};

    return define;
}

module.exports = amdefine;

}).call(this,require('_process'),"/node_modules/handlebars/node_modules/source-map/node_modules/amdefine/amdefine.js")

},{"_process":3,"path":2}],34:[function(require,module,exports){
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

},{"../util/util":55}],35:[function(require,module,exports){
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

},{"../../util/util":55,"../IBindable":34}],36:[function(require,module,exports){
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

var FacetBar = require('./facetHistogramBar');

/**
 * This class creates a histogram in the given `svgContainer` using the data provided in the `spec`
 *
 * @class FacetHistogram
 * @param {element} svgContainer - SVG element where the histogram should be created (can be an SVG group)
 * @param {Object} spec - Object describing the histogram to be created.
 * @constructor
 */
function FacetHistogram (svgContainer, spec) {
	this._svg = svgContainer;
	this._spec = spec;
	this._totalWidth = 0;
	this._barWidth = 0;
	this._minBarWidth = ('minBarWidth' in spec) ? spec.minBarWidth : 3;
	this._maxBarWidth = ('maxBarWidth' in spec) ? spec.maxBarWidth : Number.MAX_VALUE;
	this._barPadding = ('barPadding' in spec) ? spec.barPadding : 1;
	this._bars = [];

	this.initializeSlices(svgContainer, spec.slices, spec.yMax);
}

/**
 * The total width of the histogram.
 *
 * @property totalWidth
 * @type {Number}
 * @readonly
 */
Object.defineProperty(FacetHistogram.prototype, 'totalWidth', {
	get: function () {
		return this._totalWidth;
	}
});

/**
 * The width of each individual bar in the histogram.
 *
 * @property barWidth
 * @type {Number}
 * @readonly
 */
Object.defineProperty(FacetHistogram.prototype, 'barWidth', {
	get: function () {
		return this._barWidth;
	}
});

/**
 * The amount of padding used between bars in the histogram.
 *
 * @property barPadding
 * @type {Number}
 * @readonly
 */
Object.defineProperty(FacetHistogram.prototype, 'barPadding', {
	get: function () {
		return this._barPadding;
	}
});

/**
 * The internal array containing the bars in this histogram.
 *
 * @property bars
 * @type {Array}
 * @readonly
 */
Object.defineProperty(FacetHistogram.prototype, 'bars', {
	get: function () {
		return this._bars;
	}
});

/**
 * Initializes the slices (bars/buckets) of this histogram and saves them to the `_bars` array.
 *
 * @method initializeSlices
 * @param {element} svg - The SVG element where the slices should be created.
 * @param {Array} slices - An array containing the slices to be created.
 * @param {Number} yMax - The maximum value, in the Y axis, that any given slice will have.
 */
FacetHistogram.prototype.initializeSlices = function(svg, slices, yMax) {
	var svgWidth = svg.width();
	var svgHeight = svg.height();

	var minBarWidth = this._minBarWidth;
	var maxBarWidth = this._maxBarWidth;
	var barPadding = this._barPadding;
	var x = 0;
	var barsLength = slices.length;

	var maxBarsNumber = Math.floor(svgWidth / (minBarWidth + barPadding));
	var stackedBarsNumber = Math.ceil(barsLength / maxBarsNumber);
	var barsToCreate = Math.ceil(barsLength / stackedBarsNumber);

	var barWidth = Math.floor((svgWidth - ((barsToCreate - 1) * barPadding)) / barsToCreate);
	barWidth = Math.max(barWidth, minBarWidth);
	barWidth = Math.min(barWidth, maxBarWidth);
	this._barWidth = barWidth;

	for (var i = 0; i < barsLength; i += stackedBarsNumber) {
		var metadata = [];
		var count = 0;
		for (var ii = 0; ii < stackedBarsNumber && (i + ii) < barsLength; ++ii) {
			var slice = slices[i + ii];
			count = Math.max(count, slice.count);
			metadata.push(slice);
		}
		var barHeight = Math.ceil(svgHeight * (count / yMax));
		var bar = new FacetBar(svg, x, barWidth, barHeight, svgHeight);
		bar.highlighted = false;
		bar.metadata = metadata;
		this._bars.push(bar);
		x += barWidth + barPadding;
	}

	this._totalWidth = x - barPadding;
};

/**
 * Converts a pixel range into a bar range.
 *
 * @method pixelRangeToBarRange
 * @param {{from: number, to: number}} pixelRange - The range in pixels to convert.
 * @returns {{from: number, to: number}}
 */
FacetHistogram.prototype.pixelRangeToBarRange = function (pixelRange) {
	return {
		from: Math.min(this._bars.length - 1, Math.max(0, Math.round(pixelRange.from / (this._barWidth + this._barPadding)))),
		to: Math.min(this._bars.length - 1, Math.max(0, Math.round((pixelRange.to - this._barWidth) / (this._barWidth + this._barPadding))))
	};
};

/**
 * Converts a bar range into a pixel range.
 *
 * @method barRangeToPixelRange
 * @param {{from: number, to: number}} barRange - The bar range to convert.
 * @returns {{from: number, to: number}}
 */
FacetHistogram.prototype.barRangeToPixelRange = function (barRange) {
	return {
		from: barRange.from * (this._barWidth + this._barPadding),
		to: (barRange.to * (this._barWidth + this._barPadding)) + this._barWidth
	};
};

/**
 * Highlights the given bar range.
 *
 * @method highlightRange
 * @param {{from: number, to: number}} range - The bar range to highlight.
 */
FacetHistogram.prototype.highlightRange = function (range) {
	var bars = this._bars;
	for (var i = 0, n = bars.length; i < n; ++i) {
		bars[i].highlighted = (i >= range.from && i <= range.to);
	}
};

/**
 * Selects the specified counts for each bar as specified in the `slices` parameter.
 *
 * @method select
 * @param {Object} slices - Data used to select sub-bar counts in this histogram.
 */
FacetHistogram.prototype.select = function (slices) {
	var bars = this._bars;
	var yMax = this._spec.yMax;
	var svgHeight = this._svg.height();

	for (var i = 0, n = bars.length; i < n; ++i) {
		var bar = bars[i];
		var barMetadata = bar.metadata;
		for (var ii = 0, nn = barMetadata.length; ii < nn; ++ii) {
			var slice = barMetadata[ii];
			var count = 0;
			if (slice.label in slices) {
				count = slices[slice.label];
			}

			var newHeight = Math.ceil(svgHeight * (count / yMax));
			if (bar.selectedHeight === null) {
				bar.selectedHeight = newHeight;
			} else {
				bar.selectedHeight = Math.max(bar.selectedHeight, newHeight);
			}
		}
	}
};

/**
 * Clears the selection state of all bars in this histogram.
 *
 * @method deselect
 */
FacetHistogram.prototype.deselect = function () {
	var bars = this._bars;
	for (var i = 0, n = bars.length; i < n; ++i) {
		bars[i].selectedHeight = null;
	}
};

/**
 * @export
 * @type {Histogram}
 */
module.exports = FacetHistogram;

},{"./facetHistogramBar":37}],37:[function(require,module,exports){
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
	this._backElement.addClass('facet-histogram-bar');
	this._backElement.addClass('facet-histogram-bar-transform');
	this._groupElement.append(this._backElement);

	this._element = $(document.createElementNS('http://www.w3.org/2000/svg','rect'));
	this._element.addClass('facet-histogram-bar');
	this._element.addClass('facet-histogram-bar-transform');
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
			this._element.toggleClass("facet-histogram-bar facet-histogram-bar-highlighted");
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

},{}],38:[function(require,module,exports){
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
	this._currentRangeLabel.text(leftBarMetadata[0].label + ' - ' + rightBarMetadata[rightBarMetadata.length - 1].label);

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



},{}],39:[function(require,module,exports){
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
var Histogram = require('./facetHistogram');
var HistogramFilter = require('./facetHistogramFilter');
var Template = require('../../templates/facetHorizontal');

var ABBREVIATED_CLASS = 'facets-facet-horizontal-abbreviated';
var HIDDEN_CLASS = 'facets-facet-horizontal-hidden';

/**
 * Horizontal facet class, contains a histogram and controls to perform filters on it.
 *
 * @class FacetHorizontal
 * @param {jquery} container - The container element for this facet.
 * @param {Group} parentGroup - The group this facet belongs to.
 * @param {Object} spec - An object describing this facet.
 * @constructor
 */
function FacetHorizontal (container, parentGroup, spec) {
	Facet.call(this, container, parentGroup, spec);

	this._key = spec.key;
	this._spec = this.processSpec(spec);

	this._initializeLayout(Template);
	this.select(spec);
	this._setupHandlers();

	/* register the animation listener, animations can trigger add/remove handlers so their handler must be handled separately */
	this._element.on('transitionend', this._handleTransitionEnd.bind(this));
}

/**
 * @inheritance {Facet}
 */
FacetHorizontal.prototype = Object.create(Facet.prototype);
FacetHorizontal.prototype.constructor = FacetHorizontal;

/**
 * Returns this facet's key.
 *
 * @property key
 * @type {string}
 * @readonly
 */
Object.defineProperty(FacetHorizontal.prototype, 'key', {
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
Object.defineProperty(FacetHorizontal.prototype, 'value', {
	get: function () {
		return this._key; // as of right now there can only be one facet per group, so the key and the value are the same
	}
});

/**
 * Defines if this facet has been visually compressed to its smallest possible state.
 * Note: Abbreviated facets cannot be interacted with.
 *
 * @property abbreviated
 * @type {boolean}
 */
Object.defineProperty(FacetHorizontal.prototype, 'abbreviated', {
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
Object.defineProperty(FacetHorizontal.prototype, 'visible', {
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
 * Returns the range covered by this facet's filter.
 *
 * @property filterRange
 * @type {Object}
 * @readonly
 */
Object.defineProperty(FacetHorizontal.prototype, 'filterRange', {
	get: function () {
		var barRange = this._histogramFilter.barRange;
		var pixelRange = this._histogramFilter.pixelRange;
		var fromInfo = this._histogram.bars[barRange.from].info;
		var toInfo = this._histogram.bars[barRange.to].info;

		return {
			from: {
				index: barRange.from,
				pixel: pixelRange.from,
				label: fromInfo.label,
				count: fromInfo.count,
				metadata: fromInfo.metadata
			},
			to: {
				index: barRange.to,
				pixel: pixelRange.to,
				label: toInfo.label,
				count: toInfo.count,
				metadata: toInfo.metadata
			}
		};
	}
});

/**
 * Marks this facet as selected and updates the visual state.
 *
 * @method select
 * @param {Object} data - Data used to select a range and sub-bar counts in this facet.
 */
FacetHorizontal.prototype.select = function(data) {
	if (data && 'selection' in data) {
		var selectionData = data.selection;

		if ('range' in selectionData) {
			var from = selectionData.range.from;
			var to = selectionData.range.to;

			var fromIsString = (typeof from === 'string' || (typeof from === 'object' && from.constructor === String));
			var toIsString = (typeof to === 'string' || (typeof to === 'object' && to.constructor === String));

			var bars = this._histogram.bars;
			for (var i = 0, n = bars.length; i < n && (fromIsString || toIsString); ++i) {
				var barMetadata = bars[i].metadata;

				for (var ii = 0, nn = barMetadata.length; ii < nn; ++ii) {
					var slice = barMetadata[ii];

					if (fromIsString && slice.label === from) {
						from = i;
						fromIsString = false;
					}

					if (toIsString && slice.label === to) {
						to = i;
						toIsString = false;
					}
				}
			}

			if (!fromIsString && !toIsString) {
				this._histogramFilter.setFilterBarRange({from: from, to: to});
			}
		} else {
			this._histogramFilter.setFilterPixelRange({ from: 0, to: this._histogram.totalWidth });
		}

		this._histogram.deselect();
		if ('slices' in selectionData) {
			this._histogram.select(selectionData.slices);
		}
	}
};

/**
 * Marks this facet as not selected and updates the visual state.
 *
 * @method deselect
 */
FacetHorizontal.prototype.deselect = function() {
	this._histogramFilter.setFilterPixelRange({ from: 0, to: this._histogram.totalWidth });
	this._histogram.deselect();
};

/**
 * Processes the data in the provided spec and builds a new spec with detailed information.
 *
 * @method processSpec
 * @param {Object} inData - The original spec to process.
 * @returns {Object}
 */
FacetHorizontal.prototype.processSpec = function(inData) {
	var outData = {};

	outData.histogram = this.processHistogram(inData.histogram);
	outData.leftRangeLabel = outData.histogram.slices[0].label;
	outData.rightRangeLabel = outData.histogram.slices[outData.histogram.slices.length - 1].label;

	return outData;
};

/**
 * Processes the histogram data and adds extra information to it.
 * Makes sure that all slices for the histogram are present and adds 0-count slices for any missing ones.
 *
 * @method processHistogram
 * @param {Object} inData - The data to process.
 * @returns {Object}
 */
FacetHorizontal.prototype.processHistogram = function(inData) {
	var outData = {
		slices: []
	};

	var inSlices = inData.slices;
	var outSlices = outData.slices;
	var yMax = 0;

	var index = 0;
	for (var i = 0, n = inSlices.length; i < n; ++i, ++index) {
		var slice = inSlices[i];
		while (slice.index > index) {
			outSlices.push({
				label: 'Unknown',
				count: 0
			});
			++index;
		}

		outSlices.push(slice);
		yMax = Math.max(yMax, slice.count);
	}

	outData.yMax = yMax;

	return outData;
};

/**
 * Updates this facet's spec with the passed data and then updates the facet's visual state.
 *
 * @method updateSpec
 * @param {Object} spec - The new spec for the facet
 */
FacetHorizontal.prototype.updateSpec = function (spec) {
	this._removeHandlers();
	this._element.remove();
	this._spec.histogram.push.apply(this._spec.histogram, spec.histogram);
	this._spec = this.processSpec(this._spec);
	this._initializeLayout(Template);
	this.select(spec);
	this._addHandlers();
};

/**
 * Unbinds this instance from any reference that it might have with event handlers and DOM elements.
 *
 * @method destroy
 * @param {boolean=} animated - Should the facet be removed in an animated way before it being destroyed.
 */
FacetHorizontal.prototype.destroy = function(animated) {
	if (animated) {
		var _destroy = function() {
			this.off('facet-histogram:animation:visible-off', _destroy);
			this._destroy();
		}.bind(this);
		this.visible = false;
	} else {
		this._destroy();
	}
};

/**
 * Internal method to destroy this facet.
 *
 * @method _destroy
 * @private
 */
FacetHorizontal.prototype._destroy = function() {
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
FacetHorizontal.prototype._initializeLayout = function(template) {
	this._element = $(template(this._spec));
	this._container.append(this._element);
	this._svg = this._element.find('svg');

	this._histogram = new Histogram(this._svg, this._spec.histogram);
	this._histogramFilter = new HistogramFilter(this._element, this._histogram);
	this._histogramFilter.setFilterPixelRange({ from: 0, to: this._histogram.totalWidth });

	this._rangeControls = this._element.find('.facet-range-controls');

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
 * Adds the required event handlers needed to trigger this facet's own events.
 *
 * @method _addHandlers
 * @private
 */
FacetHorizontal.prototype._addHandlers = function() {
	if (this.visible) {
		var bars = this._histogram.bars;
		for (var i = 0, n = bars.length; i < n; ++i) {
			bars[i]._addHandlers();
			bars[i].onMouseEnter = this._onMouseEventBar.bind(this, 'facet-histogram:mouseenter');
			bars[i].onMouseLeave = this._onMouseEventBar.bind(this, 'facet-histogram:mouseleave');
			bars[i].onClick = this._onMouseEventBar.bind(this, 'facet-histogram:click');
		}

		this._histogramFilter.onFilterChanged = this._onFilterChanged.bind(this);
	}
};

/**
 * Removes any added event handlers, virtually "muting" this facet
 *
 * @method _removeHandlers
 * @private
 */
FacetHorizontal.prototype._removeHandlers = function() {
	var bars = this._histogram.bars;
	for (var i = 0, n = bars.length; i < n; ++i) {
		bars[i]._removeHandlers();
		bars[i].onMouseEnter = null;
		bars[i].onMouseLeave = null;
		bars[i].onClick = null;
	}

	this._histogramFilter.onFilterChanged = null;
};

/**
 * Forwards a bar mouse event using the given type.
 *
 * @method _onMouseEventBar
 * @param {string} type - The type of the event to forward.
 * @param {FacetHistogramBar} bar - The bar which triggered the event.
 * @param {Event} event - The original event triggered.
 * @private
 */
FacetHorizontal.prototype._onMouseEventBar = function (type, bar, event) {
	this.emit(type, event, this._key, bar.info);
};

/**
 * Handles the event when the filter range changes.
 *
 * @param {Object} newBarRange - A range object containing the new bar (slice/bucket) range.
 * @param {boolean=} fromUserInput - Defines if the filter range change was triggered by a user input interaction.
 * @private
 */
FacetHorizontal.prototype._onFilterChanged = function (newBarRange, fromUserInput) {
	var event = 'facet-histogram:rangechanged' + (fromUserInput ? 'user' : '');
	this.emit(event, null, this._key, this.filterRange);
};

/**
 * Transition end event handler.
 *
 * @param {Event} evt - Event to handle.
 * @private
 */
FacetHorizontal.prototype._handleTransitionEnd = function(evt) {
	var property = evt.originalEvent.propertyName;
	if (evt.target === this._element.get(0) && property === 'opacity') {
		if (this.visible) {
			this.emit('facet-histogram:animation:visible-on', evt, this._key);
		} else {
			this.emit('facet-histogram:animation:visible-off', evt, this._key);
		}
	} else if (evt.target === this._rangeControls.get(0) && property === 'opacity') {
		if (this.abbreviated) {
			this.emit('facet-histogram:animation:abbreviated-on', evt, this._key);
		} else {
			this.emit('facet-histogram:animation:abbreviated-off', evt, this._key);
		}
	}
};

/**
 * @export
 * @type {FacetHorizontal}
 */
module.exports = FacetHorizontal;

},{"../../templates/facetHorizontal":45,"../../util/util":55,"./facet":35,"./facetHistogram":36,"./facetHistogramFilter":38}],40:[function(require,module,exports){
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
var Handlebars = require('handlebars');
var Template = require('../../templates/facetVertical');

var HIGHLIGHT_CLASS = 'facet-icon-highlighted';
var ABBREVIATED_CLASS = 'facets-facet-vertical-abbreviated';
var HIDDEN_CLASS = 'facets-facet-vertical-hidden';

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

	if (this._spec.isQuery && this._key !== '*') {
		this._spec.displayValue = this._key + ':' + (this._spec.label ? this._spec.label : this._spec.value);
	}

	/* register the partials to build the template */
	Handlebars.registerPartial('facetVertical_icon', facetVertical_icon);
	Handlebars.registerPartial('facetVertical_links', facetVertical_links);
	Handlebars.registerPartial('facetVertical_search', facetVertical_search);

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
 * @param {number} selectedCount - The count of selected elements for this facet.
 */
FacetVertical.prototype.select = function(selectedCount) {
	this._spec.selected = selectedCount;
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

	/* icon */ // TODO: Only update if the current icon is not the same as the icon in the spec.
	this._iconContainer.empty();
	this._iconContainer.append($(facetVertical_icon(this._spec)));
	this._icon = this._iconContainer.children('i');
	this._iconColor = this._spec.icon && this._spec.icon.color ? this._spec.icon.color : null;

	/* bar background */
	this._barBackground.css('width', ((spec.count / spec.total) * 100) + '%');

	/* bar foreground */
	if (spec.selected >= 0) {
		if (!this._barForeground.hasClass('facet-bar-selected')) {
			this._barForeground.removeAttr('style');
			this._barForeground.addClass('facet-bar-selected');
		}
		this._barForeground.css('width', ((spec.selected / spec.total) * 100) + '%');
	} else {
		if (this._barForeground.hasClass('facet-bar-selected')) {
			if (this._iconColor) {
				this._barForeground.css('background-color', this._iconColor);
			}
			this._barForeground.removeClass('facet-bar-selected');
		}
		this._barForeground.css('width', ((spec.count / spec.total) * 100) + '%');
	}

	/* label */
	if (spec.displayValue) {
		newLabelHTML = spec.displayValue;
	} else if (spec.label) {
		newLabelHTML = spec.label;
	} else {
	  newLabelHTML = spec.value;
	}
	if (newLabelHTML !== this._label.html()) {
		this._label.html(newLabelHTML);
	}

	/* count label */
	if (this._labelCount.text() !== spec.count.toString()) {
		this._labelCount.text(spec.count.toString());
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
		if (!this._hasEmittedSelectedEvent && this._barForeground.hasClass('facet-bar-selected')) {
			this.emit(this._type + ':animation:selected-on', evt, this._key, this._value, this._count);
			this._hasEmittedSelectedEvent = true;
		} else if (this._hasEmittedSelectedEvent && !this._barForeground.hasClass('facet-bar-selected')) {
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

},{"../../templates/facetVertical":46,"../../templates/facetVertical_icon":47,"../../templates/facetVertical_links":48,"../../templates/facetVertical_search":49,"../../util/util":55,"./facet":35,"handlebars":22}],41:[function(require,module,exports){
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

var _ = require('../util/util');
var IBindable = require('../components/IBindable');
var Template = require('../templates/group');
var TemplateMore = require('../templates/group-more');
var FacetVertical = require('../components/facet/facetVertical');
var FacetHorizontal = require('../components/facet/facetHorizontal');

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
		if (!this._ownsTotal && !('histogram' in facetSpec)) { // it's not a horizontal facet
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

	// Destroy existing facets
	this._destroyFacets();

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
 * @private
 */
Group.prototype._initializeLayout = function (template, label, more) {
	this._element = $(template({
		label: label,
		more: more
	}));
	this._container.append(this._element);
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
			if (!('histogram' in facetSpec)) { // it's not a horizontal facet
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
	/* make sure the DOM is updated at this time */
	this._moreElement.css('height');
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

},{"../components/IBindable":34,"../components/facet/facetHorizontal":39,"../components/facet/facetVertical":40,"../templates/group":51,"../templates/group-more":50,"../util/util":55}],42:[function(require,module,exports){
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

var _ = require('../util/util');
var IBindable = require('./IBindable');
var Template = require('../templates/querygroup');
var FacetVertical = require('../components/facet/facetVertical');
var FacetHorizontal = require('../components/facet/facetHorizontal');
var Group = require('./group');
var Color = require('../util/color');

var DEFAULT_COLOR = '#8AAD20';
var COLOR_STEP = 0.2;

/**
 * Special group class used to represent the queries in the facets widget.
 *
 * @class QueryGroup
 * @param {jquery} container - The container where this group will be added.
 * @param {Array} queries - An array with the queries to be added to this group.
 * @constructor
 */
function QueryGroup(container, queries) {
	/* skip initializing the `Group` */
	IBindable.call(this);

	this._element = $(Template());

	container.append(this._element);

	this._facetContainer = this._element.find('.group-facet-container');

	// Initialize queries and facets
	this._facets = [];
	this._queries = [];
	this._total = 0;
	if (queries && queries.length > 0) {
		queries.forEach(function (query) {
			this.addQuery(query);
		}, this);
	}

	this._updateFacetTotals();

	if (this._queries.length === 0) {
		this.visible = false;
	}
}

/**
 * @inheritance {Group}
 */
QueryGroup.prototype = Object.create(Group.prototype);
QueryGroup.prototype.constructor = QueryGroup;

/**
 * A QueryGroup's key is always `queries`
 *
 * @property key
 * @type {string}
 * @readonly
 */
Object.defineProperty(QueryGroup.prototype, 'key', {
	get: function () {
		return "queries";
	}
});

/**
 * Makes sure that all facets in this group can be selected.
 *
 * @method initializeSelection
 */
QueryGroup.prototype.initializeSelection = function () {
	this._facets.forEach(function (facet) {
		// temporary exception until callers are able to calculated selected counts on simple queries
		if (facet.key !== '*') {
			facet.select(0);
		}
	});
};

/**
 * Deselects all facets in this group.
 *
 * @method clearSelection
 */
QueryGroup.prototype.clearSelection = function () {
	this._facets.forEach(function (facet) {
		facet.deselect();
	});
};

/**
 * Unhighlights all the queries in this group.
 *
 * @method unhighlightAll
 */
QueryGroup.prototype.unhighlightAll = function () {
	this._facets.forEach(function(facet) {
		facet.highlighted = false;
	}, this);
};

/**
 * Adds a query to this group.
 *
 * @method addQuery
 * @param {Object} query - An object describing the query to be added.
 * @param {boolean=} updateFacetTotals - Should the facet totals be updated once the query has been added to the group.
 */
QueryGroup.prototype.addQuery = function (query, updateFacetTotals) {
	this._queries.push(query);
	this._total += query.count;

	if (!query.icon) {
		query.icon = this._generateIcon();
	}
	if (!query.icon.color) {
		query.icon.color = this._generateColor();
	}
	query.hidden = true;

	// specify that this is a query for display
	query.isQuery = true;

	var FacetClass = ('histogram' in query) ? FacetHorizontal : FacetVertical;
	var facet = new FacetClass(this._facetContainer, this, query);
	this._facets.push(facet);
	facet.visible = true;
	/* forward all the events from this facet */
	this.forward(facet);

	if (updateFacetTotals) {
		this._updateFacetTotals();
	}
};

/**
 * Removes a query from this group.
 *
 * @param {*} key - The key of the query to remove.
 * @param {*} value - The value of the query to remove.
 * @param {boolean=} updateFacetTotals - Should the facet totals be updated once the query has been added to the group.
 */
QueryGroup.prototype.removeQuery = function (key, value, updateFacetTotals) {
	var facet = this._getQuery(key, value);
	if (facet) {
		var query = facet._spec;
		var queryIndex = this._queries.indexOf(query);
		var facetIndex = this._facets(facet);
		if (queryIndex >= 0 && facetIndex >= 0) {
			this._queries.splice(queryIndex, 1);
			this._facets.splice(facetIndex, 1);
			/* destroying a facet automatically unforwards its events */
			facet.destroy(true);

			this._total -= query.count;
			if (updateFacetTotals) {
				this._updateFacetTotals();
			}
		}
	}
};

/**
 * Sets this group to be garbage collected by removing all references to event handlers and DOM elements.
 * Calls `destroy` on its facets.
 *
 * @method destroy
 */
QueryGroup.prototype.destroy = function () {
	this._facets.forEach(function (f) {
		/* destroying a facet automatically unforwards its events */
		f.destroy();
	});
	this._facets = [];
	this._queries = [];
	this._element.remove();
	IBindable.prototype.destroy.call(this);
};

/**
 * Updates the total in all the facets contained in this group.
 *
 * @method _updateFacetTotals
 * @private
 */
QueryGroup.prototype._updateFacetTotals = function () {
	this._facets.forEach(function (facet) {
		facet.total = this._total;
	}, this);
};

/**
 * Gets the facet representing the query with the specified key and value.
 * Note: QueryGroup uses Facet internally to represent each query.
 *
 * @method _getQuery
 * @param {*} key - The key to look for.
 * @param {*} value - The value to look for.
 * @returns {Facet|null}
 */
QueryGroup.prototype._getQuery = function (key, value) {
	var facetObj = this._facets.filter(function (f) {
		return f.key === key && f.value === value;
	});
	if (facetObj && facetObj.length > 0) {
		return facetObj[0];
	} else {
		return null;
	}
};

/**
 * Generates an icon and color based on this group's current state.
 *
 * @method _generateIcon
 * @returns {{class: string, color}}
 * @private
 */
QueryGroup.prototype._generateIcon = function () {
	return {
		class: 'fa fa-search',          // TODO: Remove font-awesome dependency
		color: this._generateColor()
	};
};

/**
 * Genrates a color and returns it as a hex string.
 *
 * @method _generateColor
 * @returns {string}
 * @private
 */
QueryGroup.prototype._generateColor = function () {
	var startColor = this._facets.length > 0 ? new Color().hex(this._facets[0].icon.color) : new Color().hex(DEFAULT_COLOR);
	var position = this._facets.length;
	var iconColor = startColor.shade(position * COLOR_STEP);
	return iconColor.hex();
};

/**
 * @export
 * @type {QueryGroup}
 */
module.exports = QueryGroup;

},{"../components/facet/facetHorizontal":39,"../components/facet/facetVertical":40,"../templates/querygroup":53,"../util/color":54,"../util/util":55,"./IBindable":34,"./group":41}],43:[function(require,module,exports){
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

var Handlebars = require('handlebars');

Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {

    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
		case 'instanceof':
			if (typeof v2 === 'string') {
				if (typeof(v1) === v2 || (window[v2] && v1 instanceof window[v2])) {
					return options.fn(this);
				}
			} else if (v2 === Object(v2) && v1 instanceof v2) {
				return options.fn(this);
			}
			return options.inverse(this);
        default:
            return options.inverse(this);
    }
});

Handlebars.registerHelper('math',function(v1,operator,v2) {
    if (v1 === null || v1 === undefined || v2 === null || v2 === undefined) {
        return 0;
    }

    switch (operator) {
        case '+':
            return (v1 + v2);
        case '-':
            return (v1 - v2);
        case '*':
            return (v1 * v2);
        case '/':
            if (v2 === 0) {
                return 0;
            }
            return (v1 / v2);
    }
});

Handlebars.registerHelper('percentage',function(v1,v2) {
    if (v1 === null || v1 === undefined || v2 === null || v2 === undefined || v2 === 0) {
        return 0;
    }
    return v1 / v2 * 100.0;
});

$.fn.enterKey = function (fnc, mod) {
    return this.each(function () {
        $(this).keyup(function (ev) {
            var keycode = (ev.keyCode ? ev.keyCode : ev.which);
            if ((keycode == '13' || keycode == '10') && (!mod || ev[mod + 'Key'])) {
                fnc.call(this, ev);
            }
        });
    });
};

},{"handlebars":22}],44:[function(require,module,exports){
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

require('./helpers');
var _ = require('./util/util');

var IBindable = require('./components/IBindable');
var Group = require('./components/group');
var QueryGroup = require('./components/querygroup');
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
		var group = this._getGroup(groupSpec.key);
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
			var group = this._getGroup(simpleGroup.key);
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
 */
Facets.prototype.replace = function(groups, queries) {
	this._destroyContents();
	this._init(groups, queries);
};

/**
 * Replaces the specified group with the new data.
 *
 * @method replaceGroup
 * @param {Object} group - An object describing the information of the new group.
 */
Facets.prototype.replaceGroup = function(group) {
	var existingGroup = this._getGroup(group.key);
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
		var group = this._getGroup(simpleGroup.key);
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
 * Sets the specified facets to their not-highlighted state.
 *
 * @method unhighlight
 * @param {Array} simpleGroups - An array containing the group keys and facet values to be un-highlighted.
 * @param {boolean=} isQuery - Optional parameter to define if the subgroup is a query, if not specified the method will try to auto-detect the group's type.
 */
Facets.prototype.unhighlight = function(simpleGroups, isQuery) {
	if (arguments.length > 0) {
		simpleGroups.forEach(function(simpleGroup) {
			var group = this._getGroup(simpleGroup.key);
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
	var group = this._getGroup(simpleGroup.key);
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
	var group = this._getGroup(key);
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
	var group = this._getGroup(key);
	if (group) {
		return group.getFilterRange(value);
	}
	return null;
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
			existingGroup = this._getGroup(groupSpec.key);
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
	var group = this._getGroup(key);
	if (group) {
		group.removeFacet(value);
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
 * @private
 */
Facets.prototype._init = function(groups, queries) {
	this._queryGroup = new QueryGroup(this._container, queries || []);

	// Create groups
	this._groups = groups.map(function(groupSpec, index) {
		return new Group(this, this._container, groupSpec, this._options, index);
	}.bind(this));

	this._bindClientEvents();
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
 * @method _getGroup
 * @param {string} key - The key of the group to find.
 * @returns {Group|null}
 * @private
 */
Facets.prototype._getGroup = function(key) {
	var groupObj = this._groups.filter(function(g) {
		return g.key === key;
	});
	if (groupObj && groupObj.length>0) {
		return groupObj[0];
	} else {
		return null;
	}
};

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
	} else {
		this.forward(this._queryGroup);
		this._groups.forEach(function(_group) {
			this.forward(_group);
		}.bind(this));
	}
};

/**
 * @export
 * @type {Facets}
 */
module.exports = Facets;

},{"./components/IBindable":34,"./components/group":41,"./components/querygroup":42,"./helpers":43,"./templates/main":52,"./util/util":55}],45:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    return "	facets-facet-horizontal-hidden\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "<div id=\""
    + alias3(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" class=\"facets-facet-base facets-facet-horizontal\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.hidden : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\">\n	<div class=\"facet-range\">\n        <svg class=\"facet-histogram\"></svg>\n        <div class=\"facet-range-filter facet-range-filter-init\">\n            <div class=\"facet-range-filter-slider facet-range-filter-left\">\n            </div>\n            <div class=\"facet-range-filter-slider facet-range-filter-right\">\n            </div>\n        </div>\n	</div>\n    <div class=\"facet-range-labels\">\n        <div class=\"facet-range-label\">"
    + alias3(((helper = (helper = helpers.leftRangeLabel || (depth0 != null ? depth0.leftRangeLabel : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"leftRangeLabel","hash":{},"data":data}) : helper)))
    + "</div>\n        <div class=\"facet-range-label\">"
    + alias3(((helper = (helper = helpers.rightRangeLabel || (depth0 != null ? depth0.rightRangeLabel : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"rightRangeLabel","hash":{},"data":data}) : helper)))
    + "</div>\n    </div>\n    <div class=\"facet-range-controls\">\n        <div class=\"facet-page-left facet-page-ctrl\">\n            <i class=\"fa fa-chevron-left\"></i>\n        </div>\n        <div class=\"facet-range-current\">\n			"
    + alias3(((helper = (helper = helpers.leftRangeLabel || (depth0 != null ? depth0.leftRangeLabel : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"leftRangeLabel","hash":{},"data":data}) : helper)))
    + " - "
    + alias3(((helper = (helper = helpers.rightRangeLabel || (depth0 != null ? depth0.rightRangeLabel : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"rightRangeLabel","hash":{},"data":data}) : helper)))
    + "\n        </div>\n        <div class=\"facet-page-right facet-page-ctrl\">\n            <i class=\"fa fa-chevron-right\"></i>\n        </div>\n    </div>\n</div>\n";
},"useData":true});
},{"handlebars":22}],46:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    return "	facets-facet-vertical-hidden\n";
},"3":function(depth0,helpers,partials,data) {
    return "                <div class=\"facet-bar-base facet-bar-selected\" style=\"width:"
    + this.escapeExpression((helpers.percentage || (depth0 && depth0.percentage) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.selected : depth0),(depth0 != null ? depth0.total : depth0),{"name":"percentage","hash":{},"data":data}))
    + "%;\"></div>\n";
},"5":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers['if'].call(depth0,((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1),{"name":"if","hash":{},"fn":this.program(6, data, 0),"inverse":this.program(8, data, 0),"data":data})) != null ? stack1 : "")
    + "\n";
},"6":function(depth0,helpers,partials,data) {
    var stack1, alias1=this.escapeExpression;

  return "                    <div class=\"facet-bar-base\" style=\"width:"
    + alias1((helpers.percentage || (depth0 && depth0.percentage) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.count : depth0),(depth0 != null ? depth0.total : depth0),{"name":"percentage","hash":{},"data":data}))
    + "%; background-color:"
    + alias1(this.lambda(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1), depth0))
    + "\"></div>\n";
},"8":function(depth0,helpers,partials,data) {
    return "                    <div class=\"facet-bar-base facet-bar-default\" style=\"width:"
    + this.escapeExpression((helpers.percentage || (depth0 && depth0.percentage) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.count : depth0),(depth0 != null ? depth0.total : depth0),{"name":"percentage","hash":{},"data":data}))
    + "%;\"></div>\n";
},"10":function(depth0,helpers,partials,data) {
    var helper;

  return "					"
    + this.escapeExpression(((helper = (helper = helpers.countLabel || (depth0 != null ? depth0.countLabel : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"countLabel","hash":{},"data":data}) : helper)))
    + "\n";
},"12":function(depth0,helpers,partials,data) {
    var helper;

  return "					"
    + this.escapeExpression(((helper = (helper = helpers.count || (depth0 != null ? depth0.count : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"count","hash":{},"data":data}) : helper)))
    + "\n";
},"14":function(depth0,helpers,partials,data) {
    var stack1, helper;

  return "					"
    + ((stack1 = ((helper = (helper = helpers.displayValue || (depth0 != null ? depth0.displayValue : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"displayValue","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\n";
},"16":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.label : depth0),{"name":"if","hash":{},"fn":this.program(17, data, 0),"inverse":this.program(19, data, 0),"data":data})) != null ? stack1 : "");
},"17":function(depth0,helpers,partials,data) {
    var stack1, helper;

  return "					"
    + ((stack1 = ((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"label","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\n";
},"19":function(depth0,helpers,partials,data) {
    var stack1, helper;

  return "					"
    + ((stack1 = ((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"value","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\n				";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2=this.escapeExpression;

  return "<div id=\""
    + alias2(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1),(typeof helper === "function" ? helper.call(depth0,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" class=\"facets-facet-base facets-facet-vertical\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.hidden : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\">\n    <div class=\"facet-icon\">\n"
    + ((stack1 = this.invokePartial(partials.facetVertical_icon,depth0,{"name":"facetVertical_icon","data":data,"indent":"\t\t","helpers":helpers,"partials":partials})) != null ? stack1 : "")
    + "    </div>\n    <div class=\"facet-block\">\n        <div class=\"facet-bar-container\">\n            <div class=\"facet-bar-base facet-bar-background\" style=\"width:"
    + alias2((helpers.percentage || (depth0 && depth0.percentage) || alias1).call(depth0,(depth0 != null ? depth0.count : depth0),(depth0 != null ? depth0.total : depth0),{"name":"percentage","hash":{},"data":data}))
    + "%;\"></div>\n"
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias1).call(depth0,(depth0 != null ? depth0.selected : depth0),">=",0,{"name":"ifCond","hash":{},"fn":this.program(3, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias1).call(depth0,(depth0 != null ? depth0.selected : depth0),"===",undefined,{"name":"ifCond","hash":{},"fn":this.program(5, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "        </div>\n        <div class=\"facet-label-container\">\n            <span class=\"facet-label-count\">\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.countLabel : depth0),{"name":"if","hash":{},"fn":this.program(10, data, 0),"inverse":this.program(12, data, 0),"data":data})) != null ? stack1 : "")
    + "			</span>\n			<span class=\"facet-label\">\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.displayValue : depth0),{"name":"if","hash":{},"fn":this.program(14, data, 0),"inverse":this.program(16, data, 0),"data":data})) != null ? stack1 : "")
    + "			</span>\n        </div>\n    </div>\n	<div class=\"facet-links\">\n"
    + ((stack1 = this.invokePartial(partials.facetVertical_links,depth0,{"name":"facetVertical_links","data":data,"indent":"\t\t","helpers":helpers,"partials":partials})) != null ? stack1 : "")
    + "    </div>\n	<div class=\"facet-search-container\">\n"
    + ((stack1 = this.invokePartial(partials.facetVertical_search,depth0,{"name":"facetVertical_search","data":data,"indent":"\t\t","helpers":helpers,"partials":partials})) != null ? stack1 : "")
    + "	</div>\n</div>\n";
},"usePartial":true,"useData":true});
},{"handlebars":22}],47:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    var stack1;

  return "    <i class=\""
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1['class'] : stack1), depth0))
    + "\" "
    + ((stack1 = helpers['if'].call(depth0,((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1),{"name":"if","hash":{},"fn":this.program(2, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "    ></i>\n";
},"2":function(depth0,helpers,partials,data) {
    var stack1;

  return "\n       style=\"color:"
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1), depth0))
    + "\"\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.icon : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "<div class=\"facet-icon-marker\">\n    <i class=\"fa fa-check\"></i>\n</div>\n";
},"useData":true});
},{"handlebars":22}],48:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    var helper;

  return "    <i class=\"fa fa-link\"></i>"
    + this.escapeExpression(((helper = (helper = helpers.links || (depth0 != null ? depth0.links : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"links","hash":{},"data":data}) : helper)))
    + "\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.links : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"useData":true});
},{"handlebars":22}],49:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    return "    <div class=\"facet-search\"><i class=\"fa fa-search\"></i></div>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.search : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"useData":true});
},{"handlebars":22}],50:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    return " group-other-target\" style=\"cursor: pointer;";
},"3":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),"instanceof","number",{"name":"ifCond","hash":{},"fn":this.program(4, data, 0),"inverse":this.program(7, data, 0),"data":data})) != null ? stack1 : "");
},"4":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),">",0,{"name":"ifCond","hash":{},"fn":this.program(5, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"5":function(depth0,helpers,partials,data) {
    var helper;

  return "                <div class=\"group-more-marker\">\n                    <i>●</i>\n                </div>\n                <div class=\"group-other-block\">\n                    <div class=\"group-other-bar\"></div>\n                    <div class=\"group-other-label-container\">\n                        <span class=\"group-other-label-count\">"
    + this.escapeExpression(((helper = (helper = helpers.more || (depth0 != null ? depth0.more : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"more","hash":{},"data":data}) : helper)))
    + "+</span>\n                        <span class=\"group-other-label-other\">other</span>\n                        <span class=\"group-other-label-show-more group-more-target\">show more</span>\n                    </div>\n                </div>\n";
},"7":function(depth0,helpers,partials,data) {
    var stack1;

  return "            <div class=\"group-other-block\">\n				<div class=\"group-other-label-container\">\n"
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),"instanceof","Array",{"name":"ifCond","hash":{},"fn":this.program(8, data, 0),"inverse":this.program(17, data, 0),"data":data})) != null ? stack1 : "")
    + "				</div>\n			</div>\n";
},"8":function(depth0,helpers,partials,data) {
    var stack1;

  return "						<span class=\"group-other-label-show-more group-more-not-target\">\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.more : depth0),{"name":"each","hash":{},"fn":this.program(9, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "						</span>\n";
},"9":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,depth0,"instanceof","object",{"name":"ifCond","hash":{},"fn":this.program(10, data, 0),"inverse":this.program(15, data, 0),"data":data})) != null ? stack1 : "");
},"10":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "								<span class=\""
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias1).call(depth0,(depth0 != null ? depth0.clickable : depth0),"===",true,{"name":"ifCond","hash":{},"fn":this.program(11, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0['class'] : depth0),{"name":"if","hash":{},"fn":this.program(13, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\" index="
    + alias3(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"index","hash":{},"data":data}) : helper)))
    + ">"
    + alias3(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"label","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"11":function(depth0,helpers,partials,data) {
    return "group-more-target ";
},"13":function(depth0,helpers,partials,data) {
    var helper;

  return this.escapeExpression(((helper = (helper = helpers['class'] || (depth0 != null ? depth0['class'] : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"class","hash":{},"data":data}) : helper)));
},"15":function(depth0,helpers,partials,data) {
    return "                                <span>"
    + this.escapeExpression(this.lambda(depth0, depth0))
    + "</span>\n";
},"17":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),"===",true,{"name":"ifCond","hash":{},"fn":this.program(18, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"18":function(depth0,helpers,partials,data) {
    return "						<span class=\"group-other-label-show-more group-more-target\">show more</span>\n					";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"group-more-container"
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),"instanceof","number",{"name":"ifCond","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\">\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.more : depth0),{"name":"if","hash":{},"fn":this.program(3, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"useData":true});
},{"handlebars":22}],51:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"facets-group-container\">\n	<div class=\"facets-group\">\n		<div class=\"group-header\">\n			<div class=\"group-expander\">\n				<i class=\"fa fa-check-square-o toggle\"></i>\n			</div>\n			"
    + this.escapeExpression(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"label","hash":{},"data":data}) : helper)))
    + "\n		</div>\n		<div class=\"group-facet-container-outer\">\n			<div class=\"group-facet-container\"></div>\n			<div class=\"group-more-container\"></div>\n		</div>\n		<div class=\"group-facet-ellipsis\">...</div>\n	</div>\n</div>\n";
},"useData":true});
},{"handlebars":22}],52:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class=\"facets-root-container\">\n\n</div>";
},"useData":true});
},{"handlebars":22}],53:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class=\"facets-group\">\n    <div class=\"group-header\">Queries</div>\n	<div class=\"group-facet-container\"></div>\n</div>\n";
},"useData":true});
},{"handlebars":22}],54:[function(require,module,exports){
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
var _ = require ('./util');

var Color = function(r,g,b) {
    this.r = r || 0;
    this.g = g || 0;
    this.b = b || 0;
};

Color.prototype = _.extend(Color.prototype, {
    hex : function(hexStr) {
        if (arguments.length === 0) {
            return "#" + ((1 << 24) + (this.r << 16) + (this.g << 8) + this.b).toString(16).slice(1);
        } else {
            try {
                var res = hexMatcher.exec(hexStr);
                this.r = parseInt(res[1],16);
                this.g = parseInt(res[2],16);
                this.b = parseInt(res[3],16);
                return this;
            } catch (e) {
                throw "Could not parse color " + hexStr;
            }
        }
    },

    // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
    shade : function(percent) {
        var t=percent<0?0:255,p=percent<0?percent*-1:percent;
        var newR = Math.round((t-this.r)*p)+this.r;
        var newG = Math.round((t-this.g)*p)+this.g;
        var newB = Math.round((t-this.b)*p)+this.b;
        return new Color(newR,newG,newB);
    }
});

var hexMatcher = new RegExp(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);

module.exports = Color;
},{"./util":55}],55:[function(require,module,exports){
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

var s4 = function() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
};

var Util = {

    extend: function(dest, sources) {
        var key, i, source;
        for (i=1; i<arguments.length; i++) {
            source = arguments[i];
            for (key in source) {
                if (source.hasOwnProperty(key)) {
                    dest[key] = source[key];
                }
            }
        }
        return dest;
    },

    randomId: function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }
};

module.exports = Util;

},{}]},{},[44])(44)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9hc3QuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2NvZGUtZ2VuLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlci5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvaGVscGVycy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlci5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvcGFyc2VyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9wcmludGVyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci92aXNpdG9yLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci93aGl0ZXNwYWNlLWNvbnRyb2wuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvbm8tY29uZmxpY3QuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL25vZGVfbW9kdWxlcy9zb3VyY2UtbWFwL2xpYi9zb3VyY2UtbWFwLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbm9kZV9tb2R1bGVzL3NvdXJjZS1tYXAvbGliL3NvdXJjZS1tYXAvYXJyYXktc2V0LmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbm9kZV9tb2R1bGVzL3NvdXJjZS1tYXAvbGliL3NvdXJjZS1tYXAvYmFzZTY0LXZscS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL25vZGVfbW9kdWxlcy9zb3VyY2UtbWFwL2xpYi9zb3VyY2UtbWFwL2Jhc2U2NC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL25vZGVfbW9kdWxlcy9zb3VyY2UtbWFwL2xpYi9zb3VyY2UtbWFwL2JpbmFyeS1zZWFyY2guanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvc291cmNlLW1hcC9saWIvc291cmNlLW1hcC9tYXBwaW5nLWxpc3QuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvc291cmNlLW1hcC9saWIvc291cmNlLW1hcC9zb3VyY2UtbWFwLWNvbnN1bWVyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbm9kZV9tb2R1bGVzL3NvdXJjZS1tYXAvbGliL3NvdXJjZS1tYXAvc291cmNlLW1hcC1nZW5lcmF0b3IuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvc291cmNlLW1hcC9saWIvc291cmNlLW1hcC9zb3VyY2Utbm9kZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL25vZGVfbW9kdWxlcy9zb3VyY2UtbWFwL2xpYi9zb3VyY2UtbWFwL3V0aWwuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvc291cmNlLW1hcC9ub2RlX21vZHVsZXMvYW1kZWZpbmUvYW1kZWZpbmUuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvY29tcG9uZW50cy9JQmluZGFibGUuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvY29tcG9uZW50cy9mYWNldC9mYWNldC5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0SGlzdG9ncmFtLmpzIiwicHVibGljL2phdmFzY3JpcHRzL2NvbXBvbmVudHMvZmFjZXQvZmFjZXRIaXN0b2dyYW1CYXIuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvY29tcG9uZW50cy9mYWNldC9mYWNldEhpc3RvZ3JhbUZpbHRlci5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0SG9yaXpvbnRhbC5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0VmVydGljYWwuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvY29tcG9uZW50cy9ncm91cC5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9jb21wb25lbnRzL3F1ZXJ5Z3JvdXAuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvaGVscGVycy5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9tYWluLmpzIiwicHVibGljL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9mYWNldEhvcml6b250YWwuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdGVtcGxhdGVzL2ZhY2V0VmVydGljYWwuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdGVtcGxhdGVzL2ZhY2V0VmVydGljYWxfaWNvbi5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvZmFjZXRWZXJ0aWNhbF9saW5rcy5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvZmFjZXRWZXJ0aWNhbF9zZWFyY2guanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdGVtcGxhdGVzL2dyb3VwLW1vcmUuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdGVtcGxhdGVzL2dyb3VwLmpzIiwicHVibGljL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9tYWluLmpzIiwicHVibGljL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9xdWVyeWdyb3VwLmpzIiwicHVibGljL2phdmFzY3JpcHRzL3V0aWwvY29sb3IuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdXRpbC91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyaUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNycUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25OQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9qQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9YQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfcnVudGltZSA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy5ydW50aW1lJyk7XG5cbnZhciBfcnVudGltZTIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfcnVudGltZSk7XG5cbi8vIENvbXBpbGVyIGltcG9ydHNcblxudmFyIF9BU1QgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvY29tcGlsZXIvYXN0Jyk7XG5cbnZhciBfQVNUMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9BU1QpO1xuXG52YXIgX1BhcnNlciRwYXJzZSA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9jb21waWxlci9iYXNlJyk7XG5cbnZhciBfQ29tcGlsZXIkY29tcGlsZSRwcmVjb21waWxlID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2NvbXBpbGVyL2NvbXBpbGVyJyk7XG5cbnZhciBfSmF2YVNjcmlwdENvbXBpbGVyID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2NvbXBpbGVyL2phdmFzY3JpcHQtY29tcGlsZXInKTtcblxudmFyIF9KYXZhU2NyaXB0Q29tcGlsZXIyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0phdmFTY3JpcHRDb21waWxlcik7XG5cbnZhciBfVmlzaXRvciA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9jb21waWxlci92aXNpdG9yJyk7XG5cbnZhciBfVmlzaXRvcjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfVmlzaXRvcik7XG5cbnZhciBfbm9Db25mbGljdCA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9uby1jb25mbGljdCcpO1xuXG52YXIgX25vQ29uZmxpY3QyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX25vQ29uZmxpY3QpO1xuXG52YXIgX2NyZWF0ZSA9IF9ydW50aW1lMlsnZGVmYXVsdCddLmNyZWF0ZTtcbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIGhiID0gX2NyZWF0ZSgpO1xuXG4gIGhiLmNvbXBpbGUgPSBmdW5jdGlvbiAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gX0NvbXBpbGVyJGNvbXBpbGUkcHJlY29tcGlsZS5jb21waWxlKGlucHV0LCBvcHRpb25zLCBoYik7XG4gIH07XG4gIGhiLnByZWNvbXBpbGUgPSBmdW5jdGlvbiAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gX0NvbXBpbGVyJGNvbXBpbGUkcHJlY29tcGlsZS5wcmVjb21waWxlKGlucHV0LCBvcHRpb25zLCBoYik7XG4gIH07XG5cbiAgaGIuQVNUID0gX0FTVDJbJ2RlZmF1bHQnXTtcbiAgaGIuQ29tcGlsZXIgPSBfQ29tcGlsZXIkY29tcGlsZSRwcmVjb21waWxlLkNvbXBpbGVyO1xuICBoYi5KYXZhU2NyaXB0Q29tcGlsZXIgPSBfSmF2YVNjcmlwdENvbXBpbGVyMlsnZGVmYXVsdCddO1xuICBoYi5QYXJzZXIgPSBfUGFyc2VyJHBhcnNlLnBhcnNlcjtcbiAgaGIucGFyc2UgPSBfUGFyc2VyJHBhcnNlLnBhcnNlO1xuXG4gIHJldHVybiBoYjtcbn1cblxudmFyIGluc3QgPSBjcmVhdGUoKTtcbmluc3QuY3JlYXRlID0gY3JlYXRlO1xuXG5fbm9Db25mbGljdDJbJ2RlZmF1bHQnXShpbnN0KTtcblxuaW5zdC5WaXNpdG9yID0gX1Zpc2l0b3IyWydkZWZhdWx0J107XG5cbmluc3RbJ2RlZmF1bHQnXSA9IGluc3Q7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGluc3Q7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvYmFzZScpO1xuXG52YXIgYmFzZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxuXG52YXIgX1NhZmVTdHJpbmcgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcnKTtcblxudmFyIF9TYWZlU3RyaW5nMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9TYWZlU3RyaW5nKTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgX2ltcG9ydDIgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydDIpO1xuXG52YXIgX2ltcG9ydDMgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvcnVudGltZScpO1xuXG52YXIgcnVudGltZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQzKTtcblxudmFyIF9ub0NvbmZsaWN0ID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL25vLWNvbmZsaWN0Jyk7XG5cbnZhciBfbm9Db25mbGljdDIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfbm9Db25mbGljdCk7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gX1NhZmVTdHJpbmcyWydkZWZhdWx0J107XG4gIGhiLkV4Y2VwdGlvbiA9IF9FeGNlcHRpb24yWydkZWZhdWx0J107XG4gIGhiLlV0aWxzID0gVXRpbHM7XG4gIGhiLmVzY2FwZUV4cHJlc3Npb24gPSBVdGlscy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIGhiLlZNID0gcnVudGltZTtcbiAgaGIudGVtcGxhdGUgPSBmdW5jdGlvbiAoc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59XG5cbnZhciBpbnN0ID0gY3JlYXRlKCk7XG5pbnN0LmNyZWF0ZSA9IGNyZWF0ZTtcblxuX25vQ29uZmxpY3QyWydkZWZhdWx0J10oaW5zdCk7XG5cbmluc3RbJ2RlZmF1bHQnXSA9IGluc3Q7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IGluc3Q7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBWRVJTSU9OID0gJzMuMC4xJztcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSA2O1xuXG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc9PSAxLngueCcsXG4gIDU6ICc9PSAyLjAuMC1hbHBoYS54JyxcbiAgNjogJz49IDIuMC4wLWJldGEuMSdcbn07XG5cbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uIHJlZ2lzdGVySGVscGVyKG5hbWUsIGZuKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChmbikge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7XG4gICAgICB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbiB1bnJlZ2lzdGVySGVscGVyKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5oZWxwZXJzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24gcmVnaXN0ZXJQYXJ0aWFsKG5hbWUsIHBhcnRpYWwpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHBhcnRpYWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdBdHRlbXB0aW5nIHRvIHJlZ2lzdGVyIGEgcGFydGlhbCBhcyB1bmRlZmluZWQnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBwYXJ0aWFsO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uIHVucmVnaXN0ZXJQYXJ0aWFsKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5wYXJ0aWFsc1tuYW1lXTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0SGVscGVycyhpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHVjdC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ01pc3NpbmcgaGVscGVyOiBcIicgKyBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdLm5hbWUgKyAnXCInKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmIChjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgb3B0aW9ucy5pZHMgPSBbb3B0aW9ucy5uYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgICAgIG9wdGlvbnMgPSB7IGRhdGE6IGRhdGEgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ011c3QgcGFzcyBpdGVyYXRvciB0byAjZWFjaCcpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sXG4gICAgICAgIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICByZXQgPSAnJyxcbiAgICAgICAgZGF0YSA9IHVuZGVmaW5lZCxcbiAgICAgICAgY29udGV4dFBhdGggPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICBjb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pICsgJy4nO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4ZWNJdGVyYXRpb24oZmllbGQsIGluZGV4LCBsYXN0KSB7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICBkYXRhLmtleSA9IGZpZWxkO1xuICAgICAgICBkYXRhLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGRhdGEuZmlyc3QgPSBpbmRleCA9PT0gMDtcbiAgICAgICAgZGF0YS5sYXN0ID0gISFsYXN0O1xuXG4gICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBjb250ZXh0UGF0aCArIGZpZWxkO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbZmllbGRdLCB7XG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIGJsb2NrUGFyYW1zOiBVdGlscy5ibG9ja1BhcmFtcyhbY29udGV4dFtmaWVsZF0sIGZpZWxkXSwgW2NvbnRleHRQYXRoICsgZmllbGQsIG51bGxdKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IgKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICAgICAgICBleGVjSXRlcmF0aW9uKGksIGksIGkgPT09IGNvbnRleHQubGVuZ3RoIC0gMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwcmlvcktleSA9IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIC8vIFdlJ3JlIHJ1bm5pbmcgdGhlIGl0ZXJhdGlvbnMgb25lIHN0ZXAgb3V0IG9mIHN5bmMgc28gd2UgY2FuIGRldGVjdFxuICAgICAgICAgICAgLy8gdGhlIGxhc3QgaXRlcmF0aW9uIHdpdGhvdXQgaGF2ZSB0byBzY2FuIHRoZSBvYmplY3QgdHdpY2UgYW5kIGNyZWF0ZVxuICAgICAgICAgICAgLy8gYW4gaXRlcm1lZGlhdGUga2V5cyBhcnJheS5cbiAgICAgICAgICAgIGlmIChwcmlvcktleSkge1xuICAgICAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpIC0gMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmlvcktleSA9IGtleTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByaW9yS2V5KSB7XG4gICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24gKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7XG4gICAgICBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uIChjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHsgZm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNoIH0pO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKTtcbiAgICAgICAgb3B0aW9ucyA9IHsgZGF0YTogZGF0YSB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24gKG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBtZXNzYWdlKTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvb2t1cCcsIGZ1bmN0aW9uIChvYmosIGZpZWxkKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xuICB9KTtcbn1cblxudmFyIGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXG5cbiAgLy8gU3RhdGUgZW51bVxuICBERUJVRzogMCxcbiAgSU5GTzogMSxcbiAgV0FSTjogMixcbiAgRVJST1I6IDMsXG4gIGxldmVsOiAxLFxuXG4gIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24gbG9nKGxldmVsLCBtZXNzYWdlKSB7XG4gICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIChjb25zb2xlW21ldGhvZF0gfHwgY29uc29sZS5sb2cpLmNhbGwoY29uc29sZSwgbWVzc2FnZSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0cy5sb2dnZXIgPSBsb2dnZXI7XG52YXIgbG9nID0gbG9nZ2VyLmxvZztcblxuZXhwb3J0cy5sb2cgPSBsb2c7XG5cbmZ1bmN0aW9uIGNyZWF0ZUZyYW1lKG9iamVjdCkge1xuICB2YXIgZnJhbWUgPSBVdGlscy5leHRlbmQoe30sIG9iamVjdCk7XG4gIGZyYW1lLl9wYXJlbnQgPSBvYmplY3Q7XG4gIHJldHVybiBmcmFtZTtcbn1cblxuLyogW2FyZ3MsIF1vcHRpb25zICovIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xudmFyIEFTVCA9IHtcbiAgUHJvZ3JhbTogZnVuY3Rpb24gUHJvZ3JhbShzdGF0ZW1lbnRzLCBibG9ja1BhcmFtcywgc3RyaXAsIGxvY0luZm8pIHtcbiAgICB0aGlzLmxvYyA9IGxvY0luZm87XG4gICAgdGhpcy50eXBlID0gJ1Byb2dyYW0nO1xuICAgIHRoaXMuYm9keSA9IHN0YXRlbWVudHM7XG5cbiAgICB0aGlzLmJsb2NrUGFyYW1zID0gYmxvY2tQYXJhbXM7XG4gICAgdGhpcy5zdHJpcCA9IHN0cmlwO1xuICB9LFxuXG4gIE11c3RhY2hlU3RhdGVtZW50OiBmdW5jdGlvbiBNdXN0YWNoZVN0YXRlbWVudChwYXRoLCBwYXJhbXMsIGhhc2gsIGVzY2FwZWQsIHN0cmlwLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdNdXN0YWNoZVN0YXRlbWVudCc7XG5cbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgIHRoaXMucGFyYW1zID0gcGFyYW1zIHx8IFtdO1xuICAgIHRoaXMuaGFzaCA9IGhhc2g7XG4gICAgdGhpcy5lc2NhcGVkID0gZXNjYXBlZDtcblxuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcbiAgfSxcblxuICBCbG9ja1N0YXRlbWVudDogZnVuY3Rpb24gQmxvY2tTdGF0ZW1lbnQocGF0aCwgcGFyYW1zLCBoYXNoLCBwcm9ncmFtLCBpbnZlcnNlLCBvcGVuU3RyaXAsIGludmVyc2VTdHJpcCwgY2xvc2VTdHJpcCwgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnQmxvY2tTdGF0ZW1lbnQnO1xuXG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcyB8fCBbXTtcbiAgICB0aGlzLmhhc2ggPSBoYXNoO1xuICAgIHRoaXMucHJvZ3JhbSA9IHByb2dyYW07XG4gICAgdGhpcy5pbnZlcnNlID0gaW52ZXJzZTtcblxuICAgIHRoaXMub3BlblN0cmlwID0gb3BlblN0cmlwO1xuICAgIHRoaXMuaW52ZXJzZVN0cmlwID0gaW52ZXJzZVN0cmlwO1xuICAgIHRoaXMuY2xvc2VTdHJpcCA9IGNsb3NlU3RyaXA7XG4gIH0sXG5cbiAgUGFydGlhbFN0YXRlbWVudDogZnVuY3Rpb24gUGFydGlhbFN0YXRlbWVudChuYW1lLCBwYXJhbXMsIGhhc2gsIHN0cmlwLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdQYXJ0aWFsU3RhdGVtZW50JztcblxuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5wYXJhbXMgPSBwYXJhbXMgfHwgW107XG4gICAgdGhpcy5oYXNoID0gaGFzaDtcblxuICAgIHRoaXMuaW5kZW50ID0gJyc7XG4gICAgdGhpcy5zdHJpcCA9IHN0cmlwO1xuICB9LFxuXG4gIENvbnRlbnRTdGF0ZW1lbnQ6IGZ1bmN0aW9uIENvbnRlbnRTdGF0ZW1lbnQoc3RyaW5nLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdDb250ZW50U3RhdGVtZW50JztcbiAgICB0aGlzLm9yaWdpbmFsID0gdGhpcy52YWx1ZSA9IHN0cmluZztcbiAgfSxcblxuICBDb21tZW50U3RhdGVtZW50OiBmdW5jdGlvbiBDb21tZW50U3RhdGVtZW50KGNvbW1lbnQsIHN0cmlwLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdDb21tZW50U3RhdGVtZW50JztcbiAgICB0aGlzLnZhbHVlID0gY29tbWVudDtcblxuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcbiAgfSxcblxuICBTdWJFeHByZXNzaW9uOiBmdW5jdGlvbiBTdWJFeHByZXNzaW9uKHBhdGgsIHBhcmFtcywgaGFzaCwgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcblxuICAgIHRoaXMudHlwZSA9ICdTdWJFeHByZXNzaW9uJztcbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgIHRoaXMucGFyYW1zID0gcGFyYW1zIHx8IFtdO1xuICAgIHRoaXMuaGFzaCA9IGhhc2g7XG4gIH0sXG5cbiAgUGF0aEV4cHJlc3Npb246IGZ1bmN0aW9uIFBhdGhFeHByZXNzaW9uKGRhdGEsIGRlcHRoLCBwYXJ0cywgb3JpZ2luYWwsIGxvY0luZm8pIHtcbiAgICB0aGlzLmxvYyA9IGxvY0luZm87XG4gICAgdGhpcy50eXBlID0gJ1BhdGhFeHByZXNzaW9uJztcblxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgdGhpcy5vcmlnaW5hbCA9IG9yaWdpbmFsO1xuICAgIHRoaXMucGFydHMgPSBwYXJ0cztcbiAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gIH0sXG5cbiAgU3RyaW5nTGl0ZXJhbDogZnVuY3Rpb24gU3RyaW5nTGl0ZXJhbChzdHJpbmcsIGxvY0luZm8pIHtcbiAgICB0aGlzLmxvYyA9IGxvY0luZm87XG4gICAgdGhpcy50eXBlID0gJ1N0cmluZ0xpdGVyYWwnO1xuICAgIHRoaXMub3JpZ2luYWwgPSB0aGlzLnZhbHVlID0gc3RyaW5nO1xuICB9LFxuXG4gIE51bWJlckxpdGVyYWw6IGZ1bmN0aW9uIE51bWJlckxpdGVyYWwobnVtYmVyLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdOdW1iZXJMaXRlcmFsJztcbiAgICB0aGlzLm9yaWdpbmFsID0gdGhpcy52YWx1ZSA9IE51bWJlcihudW1iZXIpO1xuICB9LFxuXG4gIEJvb2xlYW5MaXRlcmFsOiBmdW5jdGlvbiBCb29sZWFuTGl0ZXJhbChib29sLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdCb29sZWFuTGl0ZXJhbCc7XG4gICAgdGhpcy5vcmlnaW5hbCA9IHRoaXMudmFsdWUgPSBib29sID09PSAndHJ1ZSc7XG4gIH0sXG5cbiAgVW5kZWZpbmVkTGl0ZXJhbDogZnVuY3Rpb24gVW5kZWZpbmVkTGl0ZXJhbChsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdVbmRlZmluZWRMaXRlcmFsJztcbiAgICB0aGlzLm9yaWdpbmFsID0gdGhpcy52YWx1ZSA9IHVuZGVmaW5lZDtcbiAgfSxcblxuICBOdWxsTGl0ZXJhbDogZnVuY3Rpb24gTnVsbExpdGVyYWwobG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnTnVsbExpdGVyYWwnO1xuICAgIHRoaXMub3JpZ2luYWwgPSB0aGlzLnZhbHVlID0gbnVsbDtcbiAgfSxcblxuICBIYXNoOiBmdW5jdGlvbiBIYXNoKHBhaXJzLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdIYXNoJztcbiAgICB0aGlzLnBhaXJzID0gcGFpcnM7XG4gIH0sXG4gIEhhc2hQYWlyOiBmdW5jdGlvbiBIYXNoUGFpcihrZXksIHZhbHVlLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdIYXNoUGFpcic7XG4gICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB9LFxuXG4gIC8vIFB1YmxpYyBBUEkgdXNlZCB0byBldmFsdWF0ZSBkZXJpdmVkIGF0dHJpYnV0ZXMgcmVnYXJkaW5nIEFTVCBub2Rlc1xuICBoZWxwZXJzOiB7XG4gICAgLy8gYSBtdXN0YWNoZSBpcyBkZWZpbml0ZWx5IGEgaGVscGVyIGlmOlxuICAgIC8vICogaXQgaXMgYW4gZWxpZ2libGUgaGVscGVyLCBhbmRcbiAgICAvLyAqIGl0IGhhcyBhdCBsZWFzdCBvbmUgcGFyYW1ldGVyIG9yIGhhc2ggc2VnbWVudFxuICAgIGhlbHBlckV4cHJlc3Npb246IGZ1bmN0aW9uIGhlbHBlckV4cHJlc3Npb24obm9kZSkge1xuICAgICAgcmV0dXJuICEhKG5vZGUudHlwZSA9PT0gJ1N1YkV4cHJlc3Npb24nIHx8IG5vZGUucGFyYW1zLmxlbmd0aCB8fCBub2RlLmhhc2gpO1xuICAgIH0sXG5cbiAgICBzY29wZWRJZDogZnVuY3Rpb24gc2NvcGVkSWQocGF0aCkge1xuICAgICAgcmV0dXJuIC9eXFwufHRoaXNcXGIvLnRlc3QocGF0aC5vcmlnaW5hbCk7XG4gICAgfSxcblxuICAgIC8vIGFuIElEIGlzIHNpbXBsZSBpZiBpdCBvbmx5IGhhcyBvbmUgcGFydCwgYW5kIHRoYXQgcGFydCBpcyBub3RcbiAgICAvLyBgLi5gIG9yIGB0aGlzYC5cbiAgICBzaW1wbGVJZDogZnVuY3Rpb24gc2ltcGxlSWQocGF0aCkge1xuICAgICAgcmV0dXJuIHBhdGgucGFydHMubGVuZ3RoID09PSAxICYmICFBU1QuaGVscGVycy5zY29wZWRJZChwYXRoKSAmJiAhcGF0aC5kZXB0aDtcbiAgICB9XG4gIH1cbn07XG5cbi8vIE11c3QgYmUgZXhwb3J0ZWQgYXMgYW4gb2JqZWN0IHJhdGhlciB0aGFuIHRoZSByb290IG9mIHRoZSBtb2R1bGUgYXMgdGhlIGppc29uIGxleGVyXG4vLyBtdXN0IG1vZGlmeSB0aGUgb2JqZWN0IHRvIG9wZXJhdGUgcHJvcGVybHkuXG5leHBvcnRzWydkZWZhdWx0J10gPSBBU1Q7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcblxudmFyIF9wYXJzZXIgPSByZXF1aXJlKCcuL3BhcnNlcicpO1xuXG52YXIgX3BhcnNlcjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfcGFyc2VyKTtcblxudmFyIF9BU1QgPSByZXF1aXJlKCcuL2FzdCcpO1xuXG52YXIgX0FTVDIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfQVNUKTtcblxudmFyIF9XaGl0ZXNwYWNlQ29udHJvbCA9IHJlcXVpcmUoJy4vd2hpdGVzcGFjZS1jb250cm9sJyk7XG5cbnZhciBfV2hpdGVzcGFjZUNvbnRyb2wyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX1doaXRlc3BhY2VDb250cm9sKTtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcblxudmFyIEhlbHBlcnMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxudmFyIF9leHRlbmQgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG5leHBvcnRzLnBhcnNlciA9IF9wYXJzZXIyWydkZWZhdWx0J107XG5cbnZhciB5eSA9IHt9O1xuX2V4dGVuZC5leHRlbmQoeXksIEhlbHBlcnMsIF9BU1QyWydkZWZhdWx0J10pO1xuXG5mdW5jdGlvbiBwYXJzZShpbnB1dCwgb3B0aW9ucykge1xuICAvLyBKdXN0IHJldHVybiBpZiBhbiBhbHJlYWR5LWNvbXBpbGVkIEFTVCB3YXMgcGFzc2VkIGluLlxuICBpZiAoaW5wdXQudHlwZSA9PT0gJ1Byb2dyYW0nKSB7XG4gICAgcmV0dXJuIGlucHV0O1xuICB9XG5cbiAgX3BhcnNlcjJbJ2RlZmF1bHQnXS55eSA9IHl5O1xuXG4gIC8vIEFsdGVyaW5nIHRoZSBzaGFyZWQgb2JqZWN0IGhlcmUsIGJ1dCB0aGlzIGlzIG9rIGFzIHBhcnNlciBpcyBhIHN5bmMgb3BlcmF0aW9uXG4gIHl5LmxvY0luZm8gPSBmdW5jdGlvbiAobG9jSW5mbykge1xuICAgIHJldHVybiBuZXcgeXkuU291cmNlTG9jYXRpb24ob3B0aW9ucyAmJiBvcHRpb25zLnNyY05hbWUsIGxvY0luZm8pO1xuICB9O1xuXG4gIHZhciBzdHJpcCA9IG5ldyBfV2hpdGVzcGFjZUNvbnRyb2wyWydkZWZhdWx0J10oKTtcbiAgcmV0dXJuIHN0cmlwLmFjY2VwdChfcGFyc2VyMlsnZGVmYXVsdCddLnBhcnNlKGlucHV0KSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuLypnbG9iYWwgZGVmaW5lICovXG5cbnZhciBfaXNBcnJheSA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciBTb3VyY2VOb2RlID0gdW5kZWZpbmVkO1xuXG50cnkge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJyB8fCAhZGVmaW5lLmFtZCkge1xuICAgIC8vIFdlIGRvbid0IHN1cHBvcnQgdGhpcyBpbiBBTUQgZW52aXJvbm1lbnRzLiBGb3IgdGhlc2UgZW52aXJvbm1lbnRzLCB3ZSBhc3VzbWUgdGhhdFxuICAgIC8vIHRoZXkgYXJlIHJ1bm5pbmcgb24gdGhlIGJyb3dzZXIgYW5kIHRodXMgaGF2ZSBubyBuZWVkIGZvciB0aGUgc291cmNlLW1hcCBsaWJyYXJ5LlxuICAgIHZhciBTb3VyY2VNYXAgPSByZXF1aXJlKCdzb3VyY2UtbWFwJyk7XG4gICAgU291cmNlTm9kZSA9IFNvdXJjZU1hcC5Tb3VyY2VOb2RlO1xuICB9XG59IGNhdGNoIChlcnIpIHt9XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBpZjogdGVzdGVkIGJ1dCBub3QgY292ZXJlZCBpbiBpc3RhbmJ1bCBkdWUgdG8gZGlzdCBidWlsZCAgKi9cbmlmICghU291cmNlTm9kZSkge1xuICBTb3VyY2VOb2RlID0gZnVuY3Rpb24gKGxpbmUsIGNvbHVtbiwgc3JjRmlsZSwgY2h1bmtzKSB7XG4gICAgdGhpcy5zcmMgPSAnJztcbiAgICBpZiAoY2h1bmtzKSB7XG4gICAgICB0aGlzLmFkZChjaHVua3MpO1xuICAgIH1cbiAgfTtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgU291cmNlTm9kZS5wcm90b3R5cGUgPSB7XG4gICAgYWRkOiBmdW5jdGlvbiBhZGQoY2h1bmtzKSB7XG4gICAgICBpZiAoX2lzQXJyYXkuaXNBcnJheShjaHVua3MpKSB7XG4gICAgICAgIGNodW5rcyA9IGNodW5rcy5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc3JjICs9IGNodW5rcztcbiAgICB9LFxuICAgIHByZXBlbmQ6IGZ1bmN0aW9uIHByZXBlbmQoY2h1bmtzKSB7XG4gICAgICBpZiAoX2lzQXJyYXkuaXNBcnJheShjaHVua3MpKSB7XG4gICAgICAgIGNodW5rcyA9IGNodW5rcy5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc3JjID0gY2h1bmtzICsgdGhpcy5zcmM7XG4gICAgfSxcbiAgICB0b1N0cmluZ1dpdGhTb3VyY2VNYXA6IGZ1bmN0aW9uIHRvU3RyaW5nV2l0aFNvdXJjZU1hcCgpIHtcbiAgICAgIHJldHVybiB7IGNvZGU6IHRoaXMudG9TdHJpbmcoKSB9O1xuICAgIH0sXG4gICAgdG9TdHJpbmc6IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgICAgcmV0dXJuIHRoaXMuc3JjO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gY2FzdENodW5rKGNodW5rLCBjb2RlR2VuLCBsb2MpIHtcbiAgaWYgKF9pc0FycmF5LmlzQXJyYXkoY2h1bmspKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNodW5rLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICByZXQucHVzaChjb2RlR2VuLndyYXAoY2h1bmtbaV0sIGxvYykpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9IGVsc2UgaWYgKHR5cGVvZiBjaHVuayA9PT0gJ2Jvb2xlYW4nIHx8IHR5cGVvZiBjaHVuayA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBIYW5kbGUgcHJpbWl0aXZlcyB0aGF0IHRoZSBTb3VyY2VOb2RlIHdpbGwgdGhyb3cgdXAgb25cbiAgICByZXR1cm4gY2h1bmsgKyAnJztcbiAgfVxuICByZXR1cm4gY2h1bms7XG59XG5cbmZ1bmN0aW9uIENvZGVHZW4oc3JjRmlsZSkge1xuICB0aGlzLnNyY0ZpbGUgPSBzcmNGaWxlO1xuICB0aGlzLnNvdXJjZSA9IFtdO1xufVxuXG5Db2RlR2VuLnByb3RvdHlwZSA9IHtcbiAgcHJlcGVuZDogZnVuY3Rpb24gcHJlcGVuZChzb3VyY2UsIGxvYykge1xuICAgIHRoaXMuc291cmNlLnVuc2hpZnQodGhpcy53cmFwKHNvdXJjZSwgbG9jKSk7XG4gIH0sXG4gIHB1c2g6IGZ1bmN0aW9uIHB1c2goc291cmNlLCBsb2MpIHtcbiAgICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMud3JhcChzb3VyY2UsIGxvYykpO1xuICB9LFxuXG4gIG1lcmdlOiBmdW5jdGlvbiBtZXJnZSgpIHtcbiAgICB2YXIgc291cmNlID0gdGhpcy5lbXB0eSgpO1xuICAgIHRoaXMuZWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgICAgc291cmNlLmFkZChbJyAgJywgbGluZSwgJ1xcbiddKTtcbiAgICB9KTtcbiAgICByZXR1cm4gc291cmNlO1xuICB9LFxuXG4gIGVhY2g6IGZ1bmN0aW9uIGVhY2goaXRlcikge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLnNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaXRlcih0aGlzLnNvdXJjZVtpXSk7XG4gICAgfVxuICB9LFxuXG4gIGVtcHR5OiBmdW5jdGlvbiBlbXB0eSgpIHtcbiAgICB2YXIgbG9jID0gYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLmN1cnJlbnRMb2NhdGlvbiB8fCB7IHN0YXJ0OiB7fSB9IDogYXJndW1lbnRzWzBdO1xuXG4gICAgcmV0dXJuIG5ldyBTb3VyY2VOb2RlKGxvYy5zdGFydC5saW5lLCBsb2Muc3RhcnQuY29sdW1uLCB0aGlzLnNyY0ZpbGUpO1xuICB9LFxuICB3cmFwOiBmdW5jdGlvbiB3cmFwKGNodW5rKSB7XG4gICAgdmFyIGxvYyA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gdGhpcy5jdXJyZW50TG9jYXRpb24gfHwgeyBzdGFydDoge30gfSA6IGFyZ3VtZW50c1sxXTtcblxuICAgIGlmIChjaHVuayBpbnN0YW5jZW9mIFNvdXJjZU5vZGUpIHtcbiAgICAgIHJldHVybiBjaHVuaztcbiAgICB9XG5cbiAgICBjaHVuayA9IGNhc3RDaHVuayhjaHVuaywgdGhpcywgbG9jKTtcblxuICAgIHJldHVybiBuZXcgU291cmNlTm9kZShsb2Muc3RhcnQubGluZSwgbG9jLnN0YXJ0LmNvbHVtbiwgdGhpcy5zcmNGaWxlLCBjaHVuayk7XG4gIH0sXG5cbiAgZnVuY3Rpb25DYWxsOiBmdW5jdGlvbiBmdW5jdGlvbkNhbGwoZm4sIHR5cGUsIHBhcmFtcykge1xuICAgIHBhcmFtcyA9IHRoaXMuZ2VuZXJhdGVMaXN0KHBhcmFtcyk7XG4gICAgcmV0dXJuIHRoaXMud3JhcChbZm4sIHR5cGUgPyAnLicgKyB0eXBlICsgJygnIDogJygnLCBwYXJhbXMsICcpJ10pO1xuICB9LFxuXG4gIHF1b3RlZFN0cmluZzogZnVuY3Rpb24gcXVvdGVkU3RyaW5nKHN0cikge1xuICAgIHJldHVybiAnXCInICsgKHN0ciArICcnKS5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJykucmVwbGFjZSgvXFxyL2csICdcXFxccicpLnJlcGxhY2UoL1xcdTIwMjgvZywgJ1xcXFx1MjAyOCcpIC8vIFBlciBFY21hLTI2MiA3LjMgKyA3LjguNFxuICAgIC5yZXBsYWNlKC9cXHUyMDI5L2csICdcXFxcdTIwMjknKSArICdcIic7XG4gIH0sXG5cbiAgb2JqZWN0TGl0ZXJhbDogZnVuY3Rpb24gb2JqZWN0TGl0ZXJhbChvYmopIHtcbiAgICB2YXIgcGFpcnMgPSBbXTtcblxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBjYXN0Q2h1bmsob2JqW2tleV0sIHRoaXMpO1xuICAgICAgICBpZiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgcGFpcnMucHVzaChbdGhpcy5xdW90ZWRTdHJpbmcoa2V5KSwgJzonLCB2YWx1ZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJldCA9IHRoaXMuZ2VuZXJhdGVMaXN0KHBhaXJzKTtcbiAgICByZXQucHJlcGVuZCgneycpO1xuICAgIHJldC5hZGQoJ30nKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIGdlbmVyYXRlTGlzdDogZnVuY3Rpb24gZ2VuZXJhdGVMaXN0KGVudHJpZXMsIGxvYykge1xuICAgIHZhciByZXQgPSB0aGlzLmVtcHR5KGxvYyk7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZW50cmllcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKGkpIHtcbiAgICAgICAgcmV0LmFkZCgnLCcpO1xuICAgICAgfVxuXG4gICAgICByZXQuYWRkKGNhc3RDaHVuayhlbnRyaWVzW2ldLCB0aGlzLCBsb2MpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIGdlbmVyYXRlQXJyYXk6IGZ1bmN0aW9uIGdlbmVyYXRlQXJyYXkoZW50cmllcywgbG9jKSB7XG4gICAgdmFyIHJldCA9IHRoaXMuZ2VuZXJhdGVMaXN0KGVudHJpZXMsIGxvYyk7XG4gICAgcmV0LnByZXBlbmQoJ1snKTtcbiAgICByZXQuYWRkKCddJyk7XG5cbiAgICByZXR1cm4gcmV0O1xuICB9XG59O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBDb2RlR2VuO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107XG5cbi8qIE5PUCAqLyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5Db21waWxlciA9IENvbXBpbGVyO1xuZXhwb3J0cy5wcmVjb21waWxlID0gcHJlY29tcGlsZTtcbmV4cG9ydHMuY29tcGlsZSA9IGNvbXBpbGU7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi4vZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgX2lzQXJyYXkkaW5kZXhPZiA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciBfQVNUID0gcmVxdWlyZSgnLi9hc3QnKTtcblxudmFyIF9BU1QyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0FTVCk7XG5cbnZhciBzbGljZSA9IFtdLnNsaWNlO1xuXG5mdW5jdGlvbiBDb21waWxlcigpIHt9XG5cbi8vIHRoZSBmb3VuZEhlbHBlciByZWdpc3RlciB3aWxsIGRpc2FtYmlndWF0ZSBoZWxwZXIgbG9va3VwIGZyb20gZmluZGluZyBhXG4vLyBmdW5jdGlvbiBpbiBhIGNvbnRleHQuIFRoaXMgaXMgbmVjZXNzYXJ5IGZvciBtdXN0YWNoZSBjb21wYXRpYmlsaXR5LCB3aGljaFxuLy8gcmVxdWlyZXMgdGhhdCBjb250ZXh0IGZ1bmN0aW9ucyBpbiBibG9ja3MgYXJlIGV2YWx1YXRlZCBieSBibG9ja0hlbHBlck1pc3NpbmcsXG4vLyBhbmQgdGhlbiBwcm9jZWVkIGFzIGlmIHRoZSByZXN1bHRpbmcgdmFsdWUgd2FzIHByb3ZpZGVkIHRvIGJsb2NrSGVscGVyTWlzc2luZy5cblxuQ29tcGlsZXIucHJvdG90eXBlID0ge1xuICBjb21waWxlcjogQ29tcGlsZXIsXG5cbiAgZXF1YWxzOiBmdW5jdGlvbiBlcXVhbHMob3RoZXIpIHtcbiAgICB2YXIgbGVuID0gdGhpcy5vcGNvZGVzLmxlbmd0aDtcbiAgICBpZiAob3RoZXIub3Bjb2Rlcy5sZW5ndGggIT09IGxlbikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBvcGNvZGUgPSB0aGlzLm9wY29kZXNbaV0sXG4gICAgICAgICAgb3RoZXJPcGNvZGUgPSBvdGhlci5vcGNvZGVzW2ldO1xuICAgICAgaWYgKG9wY29kZS5vcGNvZGUgIT09IG90aGVyT3Bjb2RlLm9wY29kZSB8fCAhYXJnRXF1YWxzKG9wY29kZS5hcmdzLCBvdGhlck9wY29kZS5hcmdzKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV2Uga25vdyB0aGF0IGxlbmd0aCBpcyB0aGUgc2FtZSBiZXR3ZWVuIHRoZSB0d28gYXJyYXlzIGJlY2F1c2UgdGhleSBhcmUgZGlyZWN0bHkgdGllZFxuICAgIC8vIHRvIHRoZSBvcGNvZGUgYmVoYXZpb3IgYWJvdmUuXG4gICAgbGVuID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKCF0aGlzLmNoaWxkcmVuW2ldLmVxdWFscyhvdGhlci5jaGlsZHJlbltpXSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGd1aWQ6IDAsXG5cbiAgY29tcGlsZTogZnVuY3Rpb24gY29tcGlsZShwcm9ncmFtLCBvcHRpb25zKSB7XG4gICAgdGhpcy5zb3VyY2VOb2RlID0gW107XG4gICAgdGhpcy5vcGNvZGVzID0gW107XG4gICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5zdHJpbmdQYXJhbXMgPSBvcHRpb25zLnN0cmluZ1BhcmFtcztcbiAgICB0aGlzLnRyYWNrSWRzID0gb3B0aW9ucy50cmFja0lkcztcblxuICAgIG9wdGlvbnMuYmxvY2tQYXJhbXMgPSBvcHRpb25zLmJsb2NrUGFyYW1zIHx8IFtdO1xuXG4gICAgLy8gVGhlc2UgY2hhbmdlcyB3aWxsIHByb3BhZ2F0ZSB0byB0aGUgb3RoZXIgY29tcGlsZXIgY29tcG9uZW50c1xuICAgIHZhciBrbm93bkhlbHBlcnMgPSBvcHRpb25zLmtub3duSGVscGVycztcbiAgICBvcHRpb25zLmtub3duSGVscGVycyA9IHtcbiAgICAgIGhlbHBlck1pc3Npbmc6IHRydWUsXG4gICAgICBibG9ja0hlbHBlck1pc3Npbmc6IHRydWUsXG4gICAgICBlYWNoOiB0cnVlLFxuICAgICAgJ2lmJzogdHJ1ZSxcbiAgICAgIHVubGVzczogdHJ1ZSxcbiAgICAgICd3aXRoJzogdHJ1ZSxcbiAgICAgIGxvZzogdHJ1ZSxcbiAgICAgIGxvb2t1cDogdHJ1ZVxuICAgIH07XG4gICAgaWYgKGtub3duSGVscGVycykge1xuICAgICAgZm9yICh2YXIgX25hbWUgaW4ga25vd25IZWxwZXJzKSB7XG4gICAgICAgIGlmIChfbmFtZSBpbiBrbm93bkhlbHBlcnMpIHtcbiAgICAgICAgICBvcHRpb25zLmtub3duSGVscGVyc1tfbmFtZV0gPSBrbm93bkhlbHBlcnNbX25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYWNjZXB0KHByb2dyYW0pO1xuICB9LFxuXG4gIGNvbXBpbGVQcm9ncmFtOiBmdW5jdGlvbiBjb21waWxlUHJvZ3JhbShwcm9ncmFtKSB7XG4gICAgdmFyIGNoaWxkQ29tcGlsZXIgPSBuZXcgdGhpcy5jb21waWxlcigpLFxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5ldy1jYXBcbiAgICByZXN1bHQgPSBjaGlsZENvbXBpbGVyLmNvbXBpbGUocHJvZ3JhbSwgdGhpcy5vcHRpb25zKSxcbiAgICAgICAgZ3VpZCA9IHRoaXMuZ3VpZCsrO1xuXG4gICAgdGhpcy51c2VQYXJ0aWFsID0gdGhpcy51c2VQYXJ0aWFsIHx8IHJlc3VsdC51c2VQYXJ0aWFsO1xuXG4gICAgdGhpcy5jaGlsZHJlbltndWlkXSA9IHJlc3VsdDtcbiAgICB0aGlzLnVzZURlcHRocyA9IHRoaXMudXNlRGVwdGhzIHx8IHJlc3VsdC51c2VEZXB0aHM7XG5cbiAgICByZXR1cm4gZ3VpZDtcbiAgfSxcblxuICBhY2NlcHQ6IGZ1bmN0aW9uIGFjY2VwdChub2RlKSB7XG4gICAgdGhpcy5zb3VyY2VOb2RlLnVuc2hpZnQobm9kZSk7XG4gICAgdmFyIHJldCA9IHRoaXNbbm9kZS50eXBlXShub2RlKTtcbiAgICB0aGlzLnNvdXJjZU5vZGUuc2hpZnQoKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIFByb2dyYW06IGZ1bmN0aW9uIFByb2dyYW0ocHJvZ3JhbSkge1xuICAgIHRoaXMub3B0aW9ucy5ibG9ja1BhcmFtcy51bnNoaWZ0KHByb2dyYW0uYmxvY2tQYXJhbXMpO1xuXG4gICAgdmFyIGJvZHkgPSBwcm9ncmFtLmJvZHksXG4gICAgICAgIGJvZHlMZW5ndGggPSBib2R5Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZHlMZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5hY2NlcHQoYm9keVtpXSk7XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLmJsb2NrUGFyYW1zLnNoaWZ0KCk7XG5cbiAgICB0aGlzLmlzU2ltcGxlID0gYm9keUxlbmd0aCA9PT0gMTtcbiAgICB0aGlzLmJsb2NrUGFyYW1zID0gcHJvZ3JhbS5ibG9ja1BhcmFtcyA/IHByb2dyYW0uYmxvY2tQYXJhbXMubGVuZ3RoIDogMDtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIEJsb2NrU3RhdGVtZW50OiBmdW5jdGlvbiBCbG9ja1N0YXRlbWVudChibG9jaykge1xuICAgIHRyYW5zZm9ybUxpdGVyYWxUb1BhdGgoYmxvY2spO1xuXG4gICAgdmFyIHByb2dyYW0gPSBibG9jay5wcm9ncmFtLFxuICAgICAgICBpbnZlcnNlID0gYmxvY2suaW52ZXJzZTtcblxuICAgIHByb2dyYW0gPSBwcm9ncmFtICYmIHRoaXMuY29tcGlsZVByb2dyYW0ocHJvZ3JhbSk7XG4gICAgaW52ZXJzZSA9IGludmVyc2UgJiYgdGhpcy5jb21waWxlUHJvZ3JhbShpbnZlcnNlKTtcblxuICAgIHZhciB0eXBlID0gdGhpcy5jbGFzc2lmeVNleHByKGJsb2NrKTtcblxuICAgIGlmICh0eXBlID09PSAnaGVscGVyJykge1xuICAgICAgdGhpcy5oZWxwZXJTZXhwcihibG9jaywgcHJvZ3JhbSwgaW52ZXJzZSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnc2ltcGxlJykge1xuICAgICAgdGhpcy5zaW1wbGVTZXhwcihibG9jayk7XG5cbiAgICAgIC8vIG5vdyB0aGF0IHRoZSBzaW1wbGUgbXVzdGFjaGUgaXMgcmVzb2x2ZWQsIHdlIG5lZWQgdG9cbiAgICAgIC8vIGV2YWx1YXRlIGl0IGJ5IGV4ZWN1dGluZyBgYmxvY2tIZWxwZXJNaXNzaW5nYFxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdibG9ja1ZhbHVlJywgYmxvY2sucGF0aC5vcmlnaW5hbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYW1iaWd1b3VzU2V4cHIoYmxvY2ssIHByb2dyYW0sIGludmVyc2UpO1xuXG4gICAgICAvLyBub3cgdGhhdCB0aGUgc2ltcGxlIG11c3RhY2hlIGlzIHJlc29sdmVkLCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBpdCBieSBleGVjdXRpbmcgYGJsb2NrSGVscGVyTWlzc2luZ2BcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgICB0aGlzLm9wY29kZSgnYW1iaWd1b3VzQmxvY2tWYWx1ZScpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdhcHBlbmQnKTtcbiAgfSxcblxuICBQYXJ0aWFsU3RhdGVtZW50OiBmdW5jdGlvbiBQYXJ0aWFsU3RhdGVtZW50KHBhcnRpYWwpIHtcbiAgICB0aGlzLnVzZVBhcnRpYWwgPSB0cnVlO1xuXG4gICAgdmFyIHBhcmFtcyA9IHBhcnRpYWwucGFyYW1zO1xuICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1Vuc3VwcG9ydGVkIG51bWJlciBvZiBwYXJ0aWFsIGFyZ3VtZW50czogJyArIHBhcmFtcy5sZW5ndGgsIHBhcnRpYWwpO1xuICAgIH0gZWxzZSBpZiAoIXBhcmFtcy5sZW5ndGgpIHtcbiAgICAgIHBhcmFtcy5wdXNoKHsgdHlwZTogJ1BhdGhFeHByZXNzaW9uJywgcGFydHM6IFtdLCBkZXB0aDogMCB9KTtcbiAgICB9XG5cbiAgICB2YXIgcGFydGlhbE5hbWUgPSBwYXJ0aWFsLm5hbWUub3JpZ2luYWwsXG4gICAgICAgIGlzRHluYW1pYyA9IHBhcnRpYWwubmFtZS50eXBlID09PSAnU3ViRXhwcmVzc2lvbic7XG4gICAgaWYgKGlzRHluYW1pYykge1xuICAgICAgdGhpcy5hY2NlcHQocGFydGlhbC5uYW1lKTtcbiAgICB9XG5cbiAgICB0aGlzLnNldHVwRnVsbE11c3RhY2hlUGFyYW1zKHBhcnRpYWwsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgIHZhciBpbmRlbnQgPSBwYXJ0aWFsLmluZGVudCB8fCAnJztcbiAgICBpZiAodGhpcy5vcHRpb25zLnByZXZlbnRJbmRlbnQgJiYgaW5kZW50KSB7XG4gICAgICB0aGlzLm9wY29kZSgnYXBwZW5kQ29udGVudCcsIGluZGVudCk7XG4gICAgICBpbmRlbnQgPSAnJztcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnaW52b2tlUGFydGlhbCcsIGlzRHluYW1pYywgcGFydGlhbE5hbWUsIGluZGVudCk7XG4gICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICB9LFxuXG4gIE11c3RhY2hlU3RhdGVtZW50OiBmdW5jdGlvbiBNdXN0YWNoZVN0YXRlbWVudChtdXN0YWNoZSkge1xuICAgIHRoaXMuU3ViRXhwcmVzc2lvbihtdXN0YWNoZSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbmV3LWNhcFxuXG4gICAgaWYgKG11c3RhY2hlLmVzY2FwZWQgJiYgIXRoaXMub3B0aW9ucy5ub0VzY2FwZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZEVzY2FwZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICAgIH1cbiAgfSxcblxuICBDb250ZW50U3RhdGVtZW50OiBmdW5jdGlvbiBDb250ZW50U3RhdGVtZW50KGNvbnRlbnQpIHtcbiAgICBpZiAoY29udGVudC52YWx1ZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZENvbnRlbnQnLCBjb250ZW50LnZhbHVlKTtcbiAgICB9XG4gIH0sXG5cbiAgQ29tbWVudFN0YXRlbWVudDogZnVuY3Rpb24gQ29tbWVudFN0YXRlbWVudCgpIHt9LFxuXG4gIFN1YkV4cHJlc3Npb246IGZ1bmN0aW9uIFN1YkV4cHJlc3Npb24oc2V4cHIpIHtcbiAgICB0cmFuc2Zvcm1MaXRlcmFsVG9QYXRoKHNleHByKTtcbiAgICB2YXIgdHlwZSA9IHRoaXMuY2xhc3NpZnlTZXhwcihzZXhwcik7XG5cbiAgICBpZiAodHlwZSA9PT0gJ3NpbXBsZScpIHtcbiAgICAgIHRoaXMuc2ltcGxlU2V4cHIoc2V4cHIpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2hlbHBlcicpIHtcbiAgICAgIHRoaXMuaGVscGVyU2V4cHIoc2V4cHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFtYmlndW91c1NleHByKHNleHByKTtcbiAgICB9XG4gIH0sXG4gIGFtYmlndW91c1NleHByOiBmdW5jdGlvbiBhbWJpZ3VvdXNTZXhwcihzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXRoID0gc2V4cHIucGF0aCxcbiAgICAgICAgbmFtZSA9IHBhdGgucGFydHNbMF0sXG4gICAgICAgIGlzQmxvY2sgPSBwcm9ncmFtICE9IG51bGwgfHwgaW52ZXJzZSAhPSBudWxsO1xuXG4gICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCBwYXRoLmRlcHRoKTtcblxuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuXG4gICAgdGhpcy5hY2NlcHQocGF0aCk7XG5cbiAgICB0aGlzLm9wY29kZSgnaW52b2tlQW1iaWd1b3VzJywgbmFtZSwgaXNCbG9jayk7XG4gIH0sXG5cbiAgc2ltcGxlU2V4cHI6IGZ1bmN0aW9uIHNpbXBsZVNleHByKHNleHByKSB7XG4gICAgdGhpcy5hY2NlcHQoc2V4cHIucGF0aCk7XG4gICAgdGhpcy5vcGNvZGUoJ3Jlc29sdmVQb3NzaWJsZUxhbWJkYScpO1xuICB9LFxuXG4gIGhlbHBlclNleHByOiBmdW5jdGlvbiBoZWxwZXJTZXhwcihzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXJhbXMgPSB0aGlzLnNldHVwRnVsbE11c3RhY2hlUGFyYW1zKHNleHByLCBwcm9ncmFtLCBpbnZlcnNlKSxcbiAgICAgICAgcGF0aCA9IHNleHByLnBhdGgsXG4gICAgICAgIG5hbWUgPSBwYXRoLnBhcnRzWzBdO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VLbm93bkhlbHBlcicsIHBhcmFtcy5sZW5ndGgsIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdZb3Ugc3BlY2lmaWVkIGtub3duSGVscGVyc09ubHksIGJ1dCB1c2VkIHRoZSB1bmtub3duIGhlbHBlciAnICsgbmFtZSwgc2V4cHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXRoLmZhbHN5ID0gdHJ1ZTtcblxuICAgICAgdGhpcy5hY2NlcHQocGF0aCk7XG4gICAgICB0aGlzLm9wY29kZSgnaW52b2tlSGVscGVyJywgcGFyYW1zLmxlbmd0aCwgcGF0aC5vcmlnaW5hbCwgX0FTVDJbJ2RlZmF1bHQnXS5oZWxwZXJzLnNpbXBsZUlkKHBhdGgpKTtcbiAgICB9XG4gIH0sXG5cbiAgUGF0aEV4cHJlc3Npb246IGZ1bmN0aW9uIFBhdGhFeHByZXNzaW9uKHBhdGgpIHtcbiAgICB0aGlzLmFkZERlcHRoKHBhdGguZGVwdGgpO1xuICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgcGF0aC5kZXB0aCk7XG5cbiAgICB2YXIgbmFtZSA9IHBhdGgucGFydHNbMF0sXG4gICAgICAgIHNjb3BlZCA9IF9BU1QyWydkZWZhdWx0J10uaGVscGVycy5zY29wZWRJZChwYXRoKSxcbiAgICAgICAgYmxvY2tQYXJhbUlkID0gIXBhdGguZGVwdGggJiYgIXNjb3BlZCAmJiB0aGlzLmJsb2NrUGFyYW1JbmRleChuYW1lKTtcblxuICAgIGlmIChibG9ja1BhcmFtSWQpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXBCbG9ja1BhcmFtJywgYmxvY2tQYXJhbUlkLCBwYXRoLnBhcnRzKTtcbiAgICB9IGVsc2UgaWYgKCFuYW1lKSB7XG4gICAgICAvLyBDb250ZXh0IHJlZmVyZW5jZSwgaS5lLiBge3tmb28gLn19YCBvciBge3tmb28gLi59fWBcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoQ29udGV4dCcpO1xuICAgIH0gZWxzZSBpZiAocGF0aC5kYXRhKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZGF0YSA9IHRydWU7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwRGF0YScsIHBhdGguZGVwdGgsIHBhdGgucGFydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwT25Db250ZXh0JywgcGF0aC5wYXJ0cywgcGF0aC5mYWxzeSwgc2NvcGVkKTtcbiAgICB9XG4gIH0sXG5cbiAgU3RyaW5nTGl0ZXJhbDogZnVuY3Rpb24gU3RyaW5nTGl0ZXJhbChzdHJpbmcpIHtcbiAgICB0aGlzLm9wY29kZSgncHVzaFN0cmluZycsIHN0cmluZy52YWx1ZSk7XG4gIH0sXG5cbiAgTnVtYmVyTGl0ZXJhbDogZnVuY3Rpb24gTnVtYmVyTGl0ZXJhbChudW1iZXIpIHtcbiAgICB0aGlzLm9wY29kZSgncHVzaExpdGVyYWwnLCBudW1iZXIudmFsdWUpO1xuICB9LFxuXG4gIEJvb2xlYW5MaXRlcmFsOiBmdW5jdGlvbiBCb29sZWFuTGl0ZXJhbChib29sKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgYm9vbC52YWx1ZSk7XG4gIH0sXG5cbiAgVW5kZWZpbmVkTGl0ZXJhbDogZnVuY3Rpb24gVW5kZWZpbmVkTGl0ZXJhbCgpIHtcbiAgICB0aGlzLm9wY29kZSgncHVzaExpdGVyYWwnLCAndW5kZWZpbmVkJyk7XG4gIH0sXG5cbiAgTnVsbExpdGVyYWw6IGZ1bmN0aW9uIE51bGxMaXRlcmFsKCkge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoTGl0ZXJhbCcsICdudWxsJyk7XG4gIH0sXG5cbiAgSGFzaDogZnVuY3Rpb24gSGFzaChoYXNoKSB7XG4gICAgdmFyIHBhaXJzID0gaGFzaC5wYWlycyxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGwgPSBwYWlycy5sZW5ndGg7XG5cbiAgICB0aGlzLm9wY29kZSgncHVzaEhhc2gnKTtcblxuICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0aGlzLnB1c2hQYXJhbShwYWlyc1tpXS52YWx1ZSk7XG4gICAgfVxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhc3NpZ25Ub0hhc2gnLCBwYWlyc1tpXS5rZXkpO1xuICAgIH1cbiAgICB0aGlzLm9wY29kZSgncG9wSGFzaCcpO1xuICB9LFxuXG4gIC8vIEhFTFBFUlNcbiAgb3Bjb2RlOiBmdW5jdGlvbiBvcGNvZGUobmFtZSkge1xuICAgIHRoaXMub3Bjb2Rlcy5wdXNoKHsgb3Bjb2RlOiBuYW1lLCBhcmdzOiBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGxvYzogdGhpcy5zb3VyY2VOb2RlWzBdLmxvYyB9KTtcbiAgfSxcblxuICBhZGREZXB0aDogZnVuY3Rpb24gYWRkRGVwdGgoZGVwdGgpIHtcbiAgICBpZiAoIWRlcHRoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy51c2VEZXB0aHMgPSB0cnVlO1xuICB9LFxuXG4gIGNsYXNzaWZ5U2V4cHI6IGZ1bmN0aW9uIGNsYXNzaWZ5U2V4cHIoc2V4cHIpIHtcbiAgICB2YXIgaXNTaW1wbGUgPSBfQVNUMlsnZGVmYXVsdCddLmhlbHBlcnMuc2ltcGxlSWQoc2V4cHIucGF0aCk7XG5cbiAgICB2YXIgaXNCbG9ja1BhcmFtID0gaXNTaW1wbGUgJiYgISF0aGlzLmJsb2NrUGFyYW1JbmRleChzZXhwci5wYXRoLnBhcnRzWzBdKTtcblxuICAgIC8vIGEgbXVzdGFjaGUgaXMgYW4gZWxpZ2libGUgaGVscGVyIGlmOlxuICAgIC8vICogaXRzIGlkIGlzIHNpbXBsZSAoYSBzaW5nbGUgcGFydCwgbm90IGB0aGlzYCBvciBgLi5gKVxuICAgIHZhciBpc0hlbHBlciA9ICFpc0Jsb2NrUGFyYW0gJiYgX0FTVDJbJ2RlZmF1bHQnXS5oZWxwZXJzLmhlbHBlckV4cHJlc3Npb24oc2V4cHIpO1xuXG4gICAgLy8gaWYgYSBtdXN0YWNoZSBpcyBhbiBlbGlnaWJsZSBoZWxwZXIgYnV0IG5vdCBhIGRlZmluaXRlXG4gICAgLy8gaGVscGVyLCBpdCBpcyBhbWJpZ3VvdXMsIGFuZCB3aWxsIGJlIHJlc29sdmVkIGluIGEgbGF0ZXJcbiAgICAvLyBwYXNzIG9yIGF0IHJ1bnRpbWUuXG4gICAgdmFyIGlzRWxpZ2libGUgPSAhaXNCbG9ja1BhcmFtICYmIChpc0hlbHBlciB8fCBpc1NpbXBsZSk7XG5cbiAgICAvLyBpZiBhbWJpZ3VvdXMsIHdlIGNhbiBwb3NzaWJseSByZXNvbHZlIHRoZSBhbWJpZ3VpdHkgbm93XG4gICAgLy8gQW4gZWxpZ2libGUgaGVscGVyIGlzIG9uZSB0aGF0IGRvZXMgbm90IGhhdmUgYSBjb21wbGV4IHBhdGgsIGkuZS4gYHRoaXMuZm9vYCwgYC4uL2Zvb2AgZXRjLlxuICAgIGlmIChpc0VsaWdpYmxlICYmICFpc0hlbHBlcikge1xuICAgICAgdmFyIF9uYW1lMiA9IHNleHByLnBhdGgucGFydHNbMF0sXG4gICAgICAgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuICAgICAgaWYgKG9wdGlvbnMua25vd25IZWxwZXJzW19uYW1lMl0pIHtcbiAgICAgICAgaXNIZWxwZXIgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgICAgaXNFbGlnaWJsZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc0hlbHBlcikge1xuICAgICAgcmV0dXJuICdoZWxwZXInO1xuICAgIH0gZWxzZSBpZiAoaXNFbGlnaWJsZSkge1xuICAgICAgcmV0dXJuICdhbWJpZ3VvdXMnO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ3NpbXBsZSc7XG4gICAgfVxuICB9LFxuXG4gIHB1c2hQYXJhbXM6IGZ1bmN0aW9uIHB1c2hQYXJhbXMocGFyYW1zKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYXJhbXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0aGlzLnB1c2hQYXJhbShwYXJhbXNbaV0pO1xuICAgIH1cbiAgfSxcblxuICBwdXNoUGFyYW06IGZ1bmN0aW9uIHB1c2hQYXJhbSh2YWwpIHtcbiAgICB2YXIgdmFsdWUgPSB2YWwudmFsdWUgIT0gbnVsbCA/IHZhbC52YWx1ZSA6IHZhbC5vcmlnaW5hbCB8fCAnJztcblxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgaWYgKHZhbHVlLnJlcGxhY2UpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9eKFxcLj9cXC5cXC8pKi9nLCAnJykucmVwbGFjZSgvXFwvL2csICcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh2YWwuZGVwdGgpIHtcbiAgICAgICAgdGhpcy5hZGREZXB0aCh2YWwuZGVwdGgpO1xuICAgICAgfVxuICAgICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCB2YWwuZGVwdGggfHwgMCk7XG4gICAgICB0aGlzLm9wY29kZSgncHVzaFN0cmluZ1BhcmFtJywgdmFsdWUsIHZhbC50eXBlKTtcblxuICAgICAgaWYgKHZhbC50eXBlID09PSAnU3ViRXhwcmVzc2lvbicpIHtcbiAgICAgICAgLy8gU3ViRXhwcmVzc2lvbnMgZ2V0IGV2YWx1YXRlZCBhbmQgcGFzc2VkIGluXG4gICAgICAgIC8vIGluIHN0cmluZyBwYXJhbXMgbW9kZS5cbiAgICAgICAgdGhpcy5hY2NlcHQodmFsKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMudHJhY2tJZHMpIHtcbiAgICAgICAgdmFyIGJsb2NrUGFyYW1JbmRleCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHZhbC5wYXJ0cyAmJiAhX0FTVDJbJ2RlZmF1bHQnXS5oZWxwZXJzLnNjb3BlZElkKHZhbCkgJiYgIXZhbC5kZXB0aCkge1xuICAgICAgICAgIGJsb2NrUGFyYW1JbmRleCA9IHRoaXMuYmxvY2tQYXJhbUluZGV4KHZhbC5wYXJ0c1swXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJsb2NrUGFyYW1JbmRleCkge1xuICAgICAgICAgIHZhciBibG9ja1BhcmFtQ2hpbGQgPSB2YWwucGFydHMuc2xpY2UoMSkuam9pbignLicpO1xuICAgICAgICAgIHRoaXMub3Bjb2RlKCdwdXNoSWQnLCAnQmxvY2tQYXJhbScsIGJsb2NrUGFyYW1JbmRleCwgYmxvY2tQYXJhbUNoaWxkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IHZhbC5vcmlnaW5hbCB8fCB2YWx1ZTtcbiAgICAgICAgICBpZiAodmFsdWUucmVwbGFjZSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9eXFwuXFwvL2csICcnKS5yZXBsYWNlKC9eXFwuJC9nLCAnJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hJZCcsIHZhbC50eXBlLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuYWNjZXB0KHZhbCk7XG4gICAgfVxuICB9LFxuXG4gIHNldHVwRnVsbE11c3RhY2hlUGFyYW1zOiBmdW5jdGlvbiBzZXR1cEZ1bGxNdXN0YWNoZVBhcmFtcyhzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSwgb21pdEVtcHR5KSB7XG4gICAgdmFyIHBhcmFtcyA9IHNleHByLnBhcmFtcztcbiAgICB0aGlzLnB1c2hQYXJhbXMocGFyYW1zKTtcblxuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuXG4gICAgaWYgKHNleHByLmhhc2gpIHtcbiAgICAgIHRoaXMuYWNjZXB0KHNleHByLmhhc2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJywgb21pdEVtcHR5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9LFxuXG4gIGJsb2NrUGFyYW1JbmRleDogZnVuY3Rpb24gYmxvY2tQYXJhbUluZGV4KG5hbWUpIHtcbiAgICBmb3IgKHZhciBkZXB0aCA9IDAsIGxlbiA9IHRoaXMub3B0aW9ucy5ibG9ja1BhcmFtcy5sZW5ndGg7IGRlcHRoIDwgbGVuOyBkZXB0aCsrKSB7XG4gICAgICB2YXIgYmxvY2tQYXJhbXMgPSB0aGlzLm9wdGlvbnMuYmxvY2tQYXJhbXNbZGVwdGhdLFxuICAgICAgICAgIHBhcmFtID0gYmxvY2tQYXJhbXMgJiYgX2lzQXJyYXkkaW5kZXhPZi5pbmRleE9mKGJsb2NrUGFyYW1zLCBuYW1lKTtcbiAgICAgIGlmIChibG9ja1BhcmFtcyAmJiBwYXJhbSA+PSAwKSB7XG4gICAgICAgIHJldHVybiBbZGVwdGgsIHBhcmFtXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHByZWNvbXBpbGUoaW5wdXQsIG9wdGlvbnMsIGVudikge1xuICBpZiAoaW5wdXQgPT0gbnVsbCB8fCB0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICYmIGlucHV0LnR5cGUgIT09ICdQcm9ncmFtJykge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMucHJlY29tcGlsZS4gWW91IHBhc3NlZCAnICsgaW5wdXQpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGlmICghKCdkYXRhJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZGF0YSA9IHRydWU7XG4gIH1cbiAgaWYgKG9wdGlvbnMuY29tcGF0KSB7XG4gICAgb3B0aW9ucy51c2VEZXB0aHMgPSB0cnVlO1xuICB9XG5cbiAgdmFyIGFzdCA9IGVudi5wYXJzZShpbnB1dCwgb3B0aW9ucyksXG4gICAgICBlbnZpcm9ubWVudCA9IG5ldyBlbnYuQ29tcGlsZXIoKS5jb21waWxlKGFzdCwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgZW52LkphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBjb21waWxlKGlucHV0LCBfeCwgZW52KSB7XG4gIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICBpZiAoaW5wdXQgPT0gbnVsbCB8fCB0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICYmIGlucHV0LnR5cGUgIT09ICdQcm9ncmFtJykge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMuY29tcGlsZS4gWW91IHBhc3NlZCAnICsgaW5wdXQpO1xuICB9XG5cbiAgaWYgKCEoJ2RhdGEnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5kYXRhID0gdHJ1ZTtcbiAgfVxuICBpZiAob3B0aW9ucy5jb21wYXQpIHtcbiAgICBvcHRpb25zLnVzZURlcHRocyA9IHRydWU7XG4gIH1cblxuICB2YXIgY29tcGlsZWQgPSB1bmRlZmluZWQ7XG5cbiAgZnVuY3Rpb24gY29tcGlsZUlucHV0KCkge1xuICAgIHZhciBhc3QgPSBlbnYucGFyc2UoaW5wdXQsIG9wdGlvbnMpLFxuICAgICAgICBlbnZpcm9ubWVudCA9IG5ldyBlbnYuQ29tcGlsZXIoKS5jb21waWxlKGFzdCwgb3B0aW9ucyksXG4gICAgICAgIHRlbXBsYXRlU3BlYyA9IG5ldyBlbnYuSmF2YVNjcmlwdENvbXBpbGVyKCkuY29tcGlsZShlbnZpcm9ubWVudCwgb3B0aW9ucywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICByZXR1cm4gZW52LnRlbXBsYXRlKHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBUZW1wbGF0ZSBpcyBvbmx5IGNvbXBpbGVkIG9uIGZpcnN0IHVzZSBhbmQgY2FjaGVkIGFmdGVyIHRoYXQgcG9pbnQuXG4gIGZ1bmN0aW9uIHJldChjb250ZXh0LCBleGVjT3B0aW9ucykge1xuICAgIGlmICghY29tcGlsZWQpIHtcbiAgICAgIGNvbXBpbGVkID0gY29tcGlsZUlucHV0KCk7XG4gICAgfVxuICAgIHJldHVybiBjb21waWxlZC5jYWxsKHRoaXMsIGNvbnRleHQsIGV4ZWNPcHRpb25zKTtcbiAgfVxuICByZXQuX3NldHVwID0gZnVuY3Rpb24gKHNldHVwT3B0aW9ucykge1xuICAgIGlmICghY29tcGlsZWQpIHtcbiAgICAgIGNvbXBpbGVkID0gY29tcGlsZUlucHV0KCk7XG4gICAgfVxuICAgIHJldHVybiBjb21waWxlZC5fc2V0dXAoc2V0dXBPcHRpb25zKTtcbiAgfTtcbiAgcmV0Ll9jaGlsZCA9IGZ1bmN0aW9uIChpLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgaWYgKCFjb21waWxlZCkge1xuICAgICAgY29tcGlsZWQgPSBjb21waWxlSW5wdXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGVkLl9jaGlsZChpLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgfTtcbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gYXJnRXF1YWxzKGEsIGIpIHtcbiAgaWYgKGEgPT09IGIpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChfaXNBcnJheSRpbmRleE9mLmlzQXJyYXkoYSkgJiYgX2lzQXJyYXkkaW5kZXhPZi5pc0FycmF5KGIpICYmIGEubGVuZ3RoID09PSBiLmxlbmd0aCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFhcmdFcXVhbHMoYVtpXSwgYltpXSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1MaXRlcmFsVG9QYXRoKHNleHByKSB7XG4gIGlmICghc2V4cHIucGF0aC5wYXJ0cykge1xuICAgIHZhciBsaXRlcmFsID0gc2V4cHIucGF0aDtcbiAgICAvLyBDYXN0aW5nIHRvIHN0cmluZyBoZXJlIHRvIG1ha2UgZmFsc2UgYW5kIDAgbGl0ZXJhbCB2YWx1ZXMgcGxheSBuaWNlbHkgd2l0aCB0aGUgcmVzdFxuICAgIC8vIG9mIHRoZSBzeXN0ZW0uXG4gICAgc2V4cHIucGF0aCA9IG5ldyBfQVNUMlsnZGVmYXVsdCddLlBhdGhFeHByZXNzaW9uKGZhbHNlLCAwLCBbbGl0ZXJhbC5vcmlnaW5hbCArICcnXSwgbGl0ZXJhbC5vcmlnaW5hbCArICcnLCBsaXRlcmFsLmxvYyk7XG4gIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuU291cmNlTG9jYXRpb24gPSBTb3VyY2VMb2NhdGlvbjtcbmV4cG9ydHMuaWQgPSBpZDtcbmV4cG9ydHMuc3RyaXBGbGFncyA9IHN0cmlwRmxhZ3M7XG5leHBvcnRzLnN0cmlwQ29tbWVudCA9IHN0cmlwQ29tbWVudDtcbmV4cG9ydHMucHJlcGFyZVBhdGggPSBwcmVwYXJlUGF0aDtcbmV4cG9ydHMucHJlcGFyZU11c3RhY2hlID0gcHJlcGFyZU11c3RhY2hlO1xuZXhwb3J0cy5wcmVwYXJlUmF3QmxvY2sgPSBwcmVwYXJlUmF3QmxvY2s7XG5leHBvcnRzLnByZXBhcmVCbG9jayA9IHByZXBhcmVCbG9jaztcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbmZ1bmN0aW9uIFNvdXJjZUxvY2F0aW9uKHNvdXJjZSwgbG9jSW5mbykge1xuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgdGhpcy5zdGFydCA9IHtcbiAgICBsaW5lOiBsb2NJbmZvLmZpcnN0X2xpbmUsXG4gICAgY29sdW1uOiBsb2NJbmZvLmZpcnN0X2NvbHVtblxuICB9O1xuICB0aGlzLmVuZCA9IHtcbiAgICBsaW5lOiBsb2NJbmZvLmxhc3RfbGluZSxcbiAgICBjb2x1bW46IGxvY0luZm8ubGFzdF9jb2x1bW5cbiAgfTtcbn1cblxuZnVuY3Rpb24gaWQodG9rZW4pIHtcbiAgaWYgKC9eXFxbLipcXF0kLy50ZXN0KHRva2VuKSkge1xuICAgIHJldHVybiB0b2tlbi5zdWJzdHIoMSwgdG9rZW4ubGVuZ3RoIC0gMik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRva2VuO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0cmlwRmxhZ3Mob3BlbiwgY2xvc2UpIHtcbiAgcmV0dXJuIHtcbiAgICBvcGVuOiBvcGVuLmNoYXJBdCgyKSA9PT0gJ34nLFxuICAgIGNsb3NlOiBjbG9zZS5jaGFyQXQoY2xvc2UubGVuZ3RoIC0gMykgPT09ICd+J1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHJpcENvbW1lbnQoY29tbWVudCkge1xuICByZXR1cm4gY29tbWVudC5yZXBsYWNlKC9eXFx7XFx7fj9cXCEtPy0/LywgJycpLnJlcGxhY2UoLy0/LT9+P1xcfVxcfSQvLCAnJyk7XG59XG5cbmZ1bmN0aW9uIHByZXBhcmVQYXRoKGRhdGEsIHBhcnRzLCBsb2NJbmZvKSB7XG4gIGxvY0luZm8gPSB0aGlzLmxvY0luZm8obG9jSW5mbyk7XG5cbiAgdmFyIG9yaWdpbmFsID0gZGF0YSA/ICdAJyA6ICcnLFxuICAgICAgZGlnID0gW10sXG4gICAgICBkZXB0aCA9IDAsXG4gICAgICBkZXB0aFN0cmluZyA9ICcnO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcGFydHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIHBhcnQgPSBwYXJ0c1tpXS5wYXJ0LFxuXG4gICAgLy8gSWYgd2UgaGF2ZSBbXSBzeW50YXggdGhlbiB3ZSBkbyBub3QgdHJlYXQgcGF0aCByZWZlcmVuY2VzIGFzIG9wZXJhdG9ycyxcbiAgICAvLyBpLmUuIGZvby5bdGhpc10gcmVzb2x2ZXMgdG8gYXBwcm94aW1hdGVseSBjb250ZXh0LmZvb1sndGhpcyddXG4gICAgaXNMaXRlcmFsID0gcGFydHNbaV0ub3JpZ2luYWwgIT09IHBhcnQ7XG4gICAgb3JpZ2luYWwgKz0gKHBhcnRzW2ldLnNlcGFyYXRvciB8fCAnJykgKyBwYXJ0O1xuXG4gICAgaWYgKCFpc0xpdGVyYWwgJiYgKHBhcnQgPT09ICcuLicgfHwgcGFydCA9PT0gJy4nIHx8IHBhcnQgPT09ICd0aGlzJykpIHtcbiAgICAgIGlmIChkaWcubGVuZ3RoID4gMCkge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnSW52YWxpZCBwYXRoOiAnICsgb3JpZ2luYWwsIHsgbG9jOiBsb2NJbmZvIH0pO1xuICAgICAgfSBlbHNlIGlmIChwYXJ0ID09PSAnLi4nKSB7XG4gICAgICAgIGRlcHRoKys7XG4gICAgICAgIGRlcHRoU3RyaW5nICs9ICcuLi8nO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBkaWcucHVzaChwYXJ0KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IHRoaXMuUGF0aEV4cHJlc3Npb24oZGF0YSwgZGVwdGgsIGRpZywgb3JpZ2luYWwsIGxvY0luZm8pO1xufVxuXG5mdW5jdGlvbiBwcmVwYXJlTXVzdGFjaGUocGF0aCwgcGFyYW1zLCBoYXNoLCBvcGVuLCBzdHJpcCwgbG9jSW5mbykge1xuICAvLyBNdXN0IHVzZSBjaGFyQXQgdG8gc3VwcG9ydCBJRSBwcmUtMTBcbiAgdmFyIGVzY2FwZUZsYWcgPSBvcGVuLmNoYXJBdCgzKSB8fCBvcGVuLmNoYXJBdCgyKSxcbiAgICAgIGVzY2FwZWQgPSBlc2NhcGVGbGFnICE9PSAneycgJiYgZXNjYXBlRmxhZyAhPT0gJyYnO1xuXG4gIHJldHVybiBuZXcgdGhpcy5NdXN0YWNoZVN0YXRlbWVudChwYXRoLCBwYXJhbXMsIGhhc2gsIGVzY2FwZWQsIHN0cmlwLCB0aGlzLmxvY0luZm8obG9jSW5mbykpO1xufVxuXG5mdW5jdGlvbiBwcmVwYXJlUmF3QmxvY2sob3BlblJhd0Jsb2NrLCBjb250ZW50LCBjbG9zZSwgbG9jSW5mbykge1xuICBpZiAob3BlblJhd0Jsb2NrLnBhdGgub3JpZ2luYWwgIT09IGNsb3NlKSB7XG4gICAgdmFyIGVycm9yTm9kZSA9IHsgbG9jOiBvcGVuUmF3QmxvY2sucGF0aC5sb2MgfTtcblxuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKG9wZW5SYXdCbG9jay5wYXRoLm9yaWdpbmFsICsgJyBkb2VzblxcJ3QgbWF0Y2ggJyArIGNsb3NlLCBlcnJvck5vZGUpO1xuICB9XG5cbiAgbG9jSW5mbyA9IHRoaXMubG9jSW5mbyhsb2NJbmZvKTtcbiAgdmFyIHByb2dyYW0gPSBuZXcgdGhpcy5Qcm9ncmFtKFtjb250ZW50XSwgbnVsbCwge30sIGxvY0luZm8pO1xuXG4gIHJldHVybiBuZXcgdGhpcy5CbG9ja1N0YXRlbWVudChvcGVuUmF3QmxvY2sucGF0aCwgb3BlblJhd0Jsb2NrLnBhcmFtcywgb3BlblJhd0Jsb2NrLmhhc2gsIHByb2dyYW0sIHVuZGVmaW5lZCwge30sIHt9LCB7fSwgbG9jSW5mbyk7XG59XG5cbmZ1bmN0aW9uIHByZXBhcmVCbG9jayhvcGVuQmxvY2ssIHByb2dyYW0sIGludmVyc2VBbmRQcm9ncmFtLCBjbG9zZSwgaW52ZXJ0ZWQsIGxvY0luZm8pIHtcbiAgLy8gV2hlbiB3ZSBhcmUgY2hhaW5pbmcgaW52ZXJzZSBjYWxscywgd2Ugd2lsbCBub3QgaGF2ZSBhIGNsb3NlIHBhdGhcbiAgaWYgKGNsb3NlICYmIGNsb3NlLnBhdGggJiYgb3BlbkJsb2NrLnBhdGgub3JpZ2luYWwgIT09IGNsb3NlLnBhdGgub3JpZ2luYWwpIHtcbiAgICB2YXIgZXJyb3JOb2RlID0geyBsb2M6IG9wZW5CbG9jay5wYXRoLmxvYyB9O1xuXG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10ob3BlbkJsb2NrLnBhdGgub3JpZ2luYWwgKyAnIGRvZXNuXFwndCBtYXRjaCAnICsgY2xvc2UucGF0aC5vcmlnaW5hbCwgZXJyb3JOb2RlKTtcbiAgfVxuXG4gIHByb2dyYW0uYmxvY2tQYXJhbXMgPSBvcGVuQmxvY2suYmxvY2tQYXJhbXM7XG5cbiAgdmFyIGludmVyc2UgPSB1bmRlZmluZWQsXG4gICAgICBpbnZlcnNlU3RyaXAgPSB1bmRlZmluZWQ7XG5cbiAgaWYgKGludmVyc2VBbmRQcm9ncmFtKSB7XG4gICAgaWYgKGludmVyc2VBbmRQcm9ncmFtLmNoYWluKSB7XG4gICAgICBpbnZlcnNlQW5kUHJvZ3JhbS5wcm9ncmFtLmJvZHlbMF0uY2xvc2VTdHJpcCA9IGNsb3NlLnN0cmlwO1xuICAgIH1cblxuICAgIGludmVyc2VTdHJpcCA9IGludmVyc2VBbmRQcm9ncmFtLnN0cmlwO1xuICAgIGludmVyc2UgPSBpbnZlcnNlQW5kUHJvZ3JhbS5wcm9ncmFtO1xuICB9XG5cbiAgaWYgKGludmVydGVkKSB7XG4gICAgaW52ZXJ0ZWQgPSBpbnZlcnNlO1xuICAgIGludmVyc2UgPSBwcm9ncmFtO1xuICAgIHByb2dyYW0gPSBpbnZlcnRlZDtcbiAgfVxuXG4gIHJldHVybiBuZXcgdGhpcy5CbG9ja1N0YXRlbWVudChvcGVuQmxvY2sucGF0aCwgb3BlbkJsb2NrLnBhcmFtcywgb3BlbkJsb2NrLmhhc2gsIHByb2dyYW0sIGludmVyc2UsIG9wZW5CbG9jay5zdHJpcCwgaW52ZXJzZVN0cmlwLCBjbG9zZSAmJiBjbG9zZS5zdHJpcCwgdGhpcy5sb2NJbmZvKGxvY0luZm8pKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTID0gcmVxdWlyZSgnLi4vYmFzZScpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4uL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9pc0FycmF5ID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxudmFyIF9Db2RlR2VuID0gcmVxdWlyZSgnLi9jb2RlLWdlbicpO1xuXG52YXIgX0NvZGVHZW4yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0NvZGVHZW4pO1xuXG5mdW5jdGlvbiBMaXRlcmFsKHZhbHVlKSB7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gSmF2YVNjcmlwdENvbXBpbGVyKCkge31cblxuSmF2YVNjcmlwdENvbXBpbGVyLnByb3RvdHlwZSA9IHtcbiAgLy8gUFVCTElDIEFQSTogWW91IGNhbiBvdmVycmlkZSB0aGVzZSBtZXRob2RzIGluIGEgc3ViY2xhc3MgdG8gcHJvdmlkZVxuICAvLyBhbHRlcm5hdGl2ZSBjb21waWxlZCBmb3JtcyBmb3IgbmFtZSBsb29rdXAgYW5kIGJ1ZmZlcmluZyBzZW1hbnRpY3NcbiAgbmFtZUxvb2t1cDogZnVuY3Rpb24gbmFtZUxvb2t1cChwYXJlbnQsIG5hbWUgLyogLCB0eXBlKi8pIHtcbiAgICBpZiAoSmF2YVNjcmlwdENvbXBpbGVyLmlzVmFsaWRKYXZhU2NyaXB0VmFyaWFibGVOYW1lKG5hbWUpKSB7XG4gICAgICByZXR1cm4gW3BhcmVudCwgJy4nLCBuYW1lXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtwYXJlbnQsICdbXFwnJywgbmFtZSwgJ1xcJ10nXTtcbiAgICB9XG4gIH0sXG4gIGRlcHRoZWRMb29rdXA6IGZ1bmN0aW9uIGRlcHRoZWRMb29rdXAobmFtZSkge1xuICAgIHJldHVybiBbdGhpcy5hbGlhc2FibGUoJ3RoaXMubG9va3VwJyksICcoZGVwdGhzLCBcIicsIG5hbWUsICdcIiknXTtcbiAgfSxcblxuICBjb21waWxlckluZm86IGZ1bmN0aW9uIGNvbXBpbGVySW5mbygpIHtcbiAgICB2YXIgcmV2aXNpb24gPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUy5DT01QSUxFUl9SRVZJU0lPTixcbiAgICAgICAgdmVyc2lvbnMgPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUy5SRVZJU0lPTl9DSEFOR0VTW3JldmlzaW9uXTtcbiAgICByZXR1cm4gW3JldmlzaW9uLCB2ZXJzaW9uc107XG4gIH0sXG5cbiAgYXBwZW5kVG9CdWZmZXI6IGZ1bmN0aW9uIGFwcGVuZFRvQnVmZmVyKHNvdXJjZSwgbG9jYXRpb24sIGV4cGxpY2l0KSB7XG4gICAgLy8gRm9yY2UgYSBzb3VyY2UgYXMgdGhpcyBzaW1wbGlmaWVzIHRoZSBtZXJnZSBsb2dpYy5cbiAgICBpZiAoIV9pc0FycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgc291cmNlID0gW3NvdXJjZV07XG4gICAgfVxuICAgIHNvdXJjZSA9IHRoaXMuc291cmNlLndyYXAoc291cmNlLCBsb2NhdGlvbik7XG5cbiAgICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgcmV0dXJuIFsncmV0dXJuICcsIHNvdXJjZSwgJzsnXTtcbiAgICB9IGVsc2UgaWYgKGV4cGxpY2l0KSB7XG4gICAgICAvLyBUaGlzIGlzIGEgY2FzZSB3aGVyZSB0aGUgYnVmZmVyIG9wZXJhdGlvbiBvY2N1cnMgYXMgYSBjaGlsZCBvZiBhbm90aGVyXG4gICAgICAvLyBjb25zdHJ1Y3QsIGdlbmVyYWxseSBicmFjZXMuIFdlIGhhdmUgdG8gZXhwbGljaXRseSBvdXRwdXQgdGhlc2UgYnVmZmVyXG4gICAgICAvLyBvcGVyYXRpb25zIHRvIGVuc3VyZSB0aGF0IHRoZSBlbWl0dGVkIGNvZGUgZ29lcyBpbiB0aGUgY29ycmVjdCBsb2NhdGlvbi5cbiAgICAgIHJldHVybiBbJ2J1ZmZlciArPSAnLCBzb3VyY2UsICc7J107XG4gICAgfSBlbHNlIHtcbiAgICAgIHNvdXJjZS5hcHBlbmRUb0J1ZmZlciA9IHRydWU7XG4gICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgfSxcblxuICBpbml0aWFsaXplQnVmZmVyOiBmdW5jdGlvbiBpbml0aWFsaXplQnVmZmVyKCkge1xuICAgIHJldHVybiB0aGlzLnF1b3RlZFN0cmluZygnJyk7XG4gIH0sXG4gIC8vIEVORCBQVUJMSUMgQVBJXG5cbiAgY29tcGlsZTogZnVuY3Rpb24gY29tcGlsZShlbnZpcm9ubWVudCwgb3B0aW9ucywgY29udGV4dCwgYXNPYmplY3QpIHtcbiAgICB0aGlzLmVudmlyb25tZW50ID0gZW52aXJvbm1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnN0cmluZ1BhcmFtcyA9IHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXM7XG4gICAgdGhpcy50cmFja0lkcyA9IHRoaXMub3B0aW9ucy50cmFja0lkcztcbiAgICB0aGlzLnByZWNvbXBpbGUgPSAhYXNPYmplY3Q7XG5cbiAgICB0aGlzLm5hbWUgPSB0aGlzLmVudmlyb25tZW50Lm5hbWU7XG4gICAgdGhpcy5pc0NoaWxkID0gISFjb250ZXh0O1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQgfHwge1xuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgZW52aXJvbm1lbnRzOiBbXVxuICAgIH07XG5cbiAgICB0aGlzLnByZWFtYmxlKCk7XG5cbiAgICB0aGlzLnN0YWNrU2xvdCA9IDA7XG4gICAgdGhpcy5zdGFja1ZhcnMgPSBbXTtcbiAgICB0aGlzLmFsaWFzZXMgPSB7fTtcbiAgICB0aGlzLnJlZ2lzdGVycyA9IHsgbGlzdDogW10gfTtcbiAgICB0aGlzLmhhc2hlcyA9IFtdO1xuICAgIHRoaXMuY29tcGlsZVN0YWNrID0gW107XG4gICAgdGhpcy5pbmxpbmVTdGFjayA9IFtdO1xuICAgIHRoaXMuYmxvY2tQYXJhbXMgPSBbXTtcblxuICAgIHRoaXMuY29tcGlsZUNoaWxkcmVuKGVudmlyb25tZW50LCBvcHRpb25zKTtcblxuICAgIHRoaXMudXNlRGVwdGhzID0gdGhpcy51c2VEZXB0aHMgfHwgZW52aXJvbm1lbnQudXNlRGVwdGhzIHx8IHRoaXMub3B0aW9ucy5jb21wYXQ7XG4gICAgdGhpcy51c2VCbG9ja1BhcmFtcyA9IHRoaXMudXNlQmxvY2tQYXJhbXMgfHwgZW52aXJvbm1lbnQudXNlQmxvY2tQYXJhbXM7XG5cbiAgICB2YXIgb3Bjb2RlcyA9IGVudmlyb25tZW50Lm9wY29kZXMsXG4gICAgICAgIG9wY29kZSA9IHVuZGVmaW5lZCxcbiAgICAgICAgZmlyc3RMb2MgPSB1bmRlZmluZWQsXG4gICAgICAgIGkgPSB1bmRlZmluZWQsXG4gICAgICAgIGwgPSB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGkgPSAwLCBsID0gb3Bjb2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIG9wY29kZSA9IG9wY29kZXNbaV07XG5cbiAgICAgIHRoaXMuc291cmNlLmN1cnJlbnRMb2NhdGlvbiA9IG9wY29kZS5sb2M7XG4gICAgICBmaXJzdExvYyA9IGZpcnN0TG9jIHx8IG9wY29kZS5sb2M7XG4gICAgICB0aGlzW29wY29kZS5vcGNvZGVdLmFwcGx5KHRoaXMsIG9wY29kZS5hcmdzKTtcbiAgICB9XG5cbiAgICAvLyBGbHVzaCBhbnkgdHJhaWxpbmcgY29udGVudCB0aGF0IG1pZ2h0IGJlIHBlbmRpbmcuXG4gICAgdGhpcy5zb3VyY2UuY3VycmVudExvY2F0aW9uID0gZmlyc3RMb2M7XG4gICAgdGhpcy5wdXNoU291cmNlKCcnKTtcblxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgaWYgKHRoaXMuc3RhY2tTbG90IHx8IHRoaXMuaW5saW5lU3RhY2subGVuZ3RoIHx8IHRoaXMuY29tcGlsZVN0YWNrLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ0NvbXBpbGUgY29tcGxldGVkIHdpdGggY29udGVudCBsZWZ0IG9uIHN0YWNrJyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gdGhpcy5jcmVhdGVGdW5jdGlvbkNvbnRleHQoYXNPYmplY3QpO1xuICAgIGlmICghdGhpcy5pc0NoaWxkKSB7XG4gICAgICB2YXIgcmV0ID0ge1xuICAgICAgICBjb21waWxlcjogdGhpcy5jb21waWxlckluZm8oKSxcbiAgICAgICAgbWFpbjogZm5cbiAgICAgIH07XG4gICAgICB2YXIgcHJvZ3JhbXMgPSB0aGlzLmNvbnRleHQucHJvZ3JhbXM7XG4gICAgICBmb3IgKGkgPSAwLCBsID0gcHJvZ3JhbXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmIChwcm9ncmFtc1tpXSkge1xuICAgICAgICAgIHJldFtpXSA9IHByb2dyYW1zW2ldO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmVudmlyb25tZW50LnVzZVBhcnRpYWwpIHtcbiAgICAgICAgcmV0LnVzZVBhcnRpYWwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5kYXRhKSB7XG4gICAgICAgIHJldC51c2VEYXRhID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnVzZURlcHRocykge1xuICAgICAgICByZXQudXNlRGVwdGhzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnVzZUJsb2NrUGFyYW1zKSB7XG4gICAgICAgIHJldC51c2VCbG9ja1BhcmFtcyA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdCkge1xuICAgICAgICByZXQuY29tcGF0ID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFhc09iamVjdCkge1xuICAgICAgICByZXQuY29tcGlsZXIgPSBKU09OLnN0cmluZ2lmeShyZXQuY29tcGlsZXIpO1xuXG4gICAgICAgIHRoaXMuc291cmNlLmN1cnJlbnRMb2NhdGlvbiA9IHsgc3RhcnQ6IHsgbGluZTogMSwgY29sdW1uOiAwIH0gfTtcbiAgICAgICAgcmV0ID0gdGhpcy5vYmplY3RMaXRlcmFsKHJldCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuc3JjTmFtZSkge1xuICAgICAgICAgIHJldCA9IHJldC50b1N0cmluZ1dpdGhTb3VyY2VNYXAoeyBmaWxlOiBvcHRpb25zLmRlc3ROYW1lIH0pO1xuICAgICAgICAgIHJldC5tYXAgPSByZXQubWFwICYmIHJldC5tYXAudG9TdHJpbmcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXQgPSByZXQudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0LmNvbXBpbGVyT3B0aW9ucyA9IHRoaXMub3B0aW9ucztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZuO1xuICAgIH1cbiAgfSxcblxuICBwcmVhbWJsZTogZnVuY3Rpb24gcHJlYW1ibGUoKSB7XG4gICAgLy8gdHJhY2sgdGhlIGxhc3QgY29udGV4dCBwdXNoZWQgaW50byBwbGFjZSB0byBhbGxvdyBza2lwcGluZyB0aGVcbiAgICAvLyBnZXRDb250ZXh0IG9wY29kZSB3aGVuIGl0IHdvdWxkIGJlIGEgbm9vcFxuICAgIHRoaXMubGFzdENvbnRleHQgPSAwO1xuICAgIHRoaXMuc291cmNlID0gbmV3IF9Db2RlR2VuMlsnZGVmYXVsdCddKHRoaXMub3B0aW9ucy5zcmNOYW1lKTtcbiAgfSxcblxuICBjcmVhdGVGdW5jdGlvbkNvbnRleHQ6IGZ1bmN0aW9uIGNyZWF0ZUZ1bmN0aW9uQ29udGV4dChhc09iamVjdCkge1xuICAgIHZhciB2YXJEZWNsYXJhdGlvbnMgPSAnJztcblxuICAgIHZhciBsb2NhbHMgPSB0aGlzLnN0YWNrVmFycy5jb25jYXQodGhpcy5yZWdpc3RlcnMubGlzdCk7XG4gICAgaWYgKGxvY2Fscy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXJEZWNsYXJhdGlvbnMgKz0gJywgJyArIGxvY2Fscy5qb2luKCcsICcpO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIG1pbmltaXplciBhbGlhcyBtYXBwaW5nc1xuICAgIC8vXG4gICAgLy8gV2hlbiB1c2luZyB0cnVlIFNvdXJjZU5vZGVzLCB0aGlzIHdpbGwgdXBkYXRlIGFsbCByZWZlcmVuY2VzIHRvIHRoZSBnaXZlbiBhbGlhc1xuICAgIC8vIGFzIHRoZSBzb3VyY2Ugbm9kZXMgYXJlIHJldXNlZCBpbiBzaXR1LiBGb3IgdGhlIG5vbi1zb3VyY2Ugbm9kZSBjb21waWxhdGlvbiBtb2RlLFxuICAgIC8vIGFsaWFzZXMgd2lsbCBub3QgYmUgdXNlZCwgYnV0IHRoaXMgY2FzZSBpcyBhbHJlYWR5IGJlaW5nIHJ1biBvbiB0aGUgY2xpZW50IGFuZFxuICAgIC8vIHdlIGFyZW4ndCBjb25jZXJuIGFib3V0IG1pbmltaXppbmcgdGhlIHRlbXBsYXRlIHNpemUuXG4gICAgdmFyIGFsaWFzQ291bnQgPSAwO1xuICAgIGZvciAodmFyIGFsaWFzIGluIHRoaXMuYWxpYXNlcykge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgIHZhciBub2RlID0gdGhpcy5hbGlhc2VzW2FsaWFzXTtcblxuICAgICAgaWYgKHRoaXMuYWxpYXNlcy5oYXNPd25Qcm9wZXJ0eShhbGlhcykgJiYgbm9kZS5jaGlsZHJlbiAmJiBub2RlLnJlZmVyZW5jZUNvdW50ID4gMSkge1xuICAgICAgICB2YXJEZWNsYXJhdGlvbnMgKz0gJywgYWxpYXMnICsgKythbGlhc0NvdW50ICsgJz0nICsgYWxpYXM7XG4gICAgICAgIG5vZGUuY2hpbGRyZW5bMF0gPSAnYWxpYXMnICsgYWxpYXNDb3VudDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0gWydkZXB0aDAnLCAnaGVscGVycycsICdwYXJ0aWFscycsICdkYXRhJ107XG5cbiAgICBpZiAodGhpcy51c2VCbG9ja1BhcmFtcyB8fCB0aGlzLnVzZURlcHRocykge1xuICAgICAgcGFyYW1zLnB1c2goJ2Jsb2NrUGFyYW1zJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnVzZURlcHRocykge1xuICAgICAgcGFyYW1zLnB1c2goJ2RlcHRocycpO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm0gYSBzZWNvbmQgcGFzcyBvdmVyIHRoZSBvdXRwdXQgdG8gbWVyZ2UgY29udGVudCB3aGVuIHBvc3NpYmxlXG4gICAgdmFyIHNvdXJjZSA9IHRoaXMubWVyZ2VTb3VyY2UodmFyRGVjbGFyYXRpb25zKTtcblxuICAgIGlmIChhc09iamVjdCkge1xuICAgICAgcGFyYW1zLnB1c2goc291cmNlKTtcblxuICAgICAgcmV0dXJuIEZ1bmN0aW9uLmFwcGx5KHRoaXMsIHBhcmFtcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZS53cmFwKFsnZnVuY3Rpb24oJywgcGFyYW1zLmpvaW4oJywnKSwgJykge1xcbiAgJywgc291cmNlLCAnfSddKTtcbiAgICB9XG4gIH0sXG4gIG1lcmdlU291cmNlOiBmdW5jdGlvbiBtZXJnZVNvdXJjZSh2YXJEZWNsYXJhdGlvbnMpIHtcbiAgICB2YXIgaXNTaW1wbGUgPSB0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlLFxuICAgICAgICBhcHBlbmRPbmx5ID0gIXRoaXMuZm9yY2VCdWZmZXIsXG4gICAgICAgIGFwcGVuZEZpcnN0ID0gdW5kZWZpbmVkLFxuICAgICAgICBzb3VyY2VTZWVuID0gdW5kZWZpbmVkLFxuICAgICAgICBidWZmZXJTdGFydCA9IHVuZGVmaW5lZCxcbiAgICAgICAgYnVmZmVyRW5kID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuc291cmNlLmVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgIGlmIChsaW5lLmFwcGVuZFRvQnVmZmVyKSB7XG4gICAgICAgIGlmIChidWZmZXJTdGFydCkge1xuICAgICAgICAgIGxpbmUucHJlcGVuZCgnICArICcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJ1ZmZlclN0YXJ0ID0gbGluZTtcbiAgICAgICAgfVxuICAgICAgICBidWZmZXJFbmQgPSBsaW5lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGJ1ZmZlclN0YXJ0KSB7XG4gICAgICAgICAgaWYgKCFzb3VyY2VTZWVuKSB7XG4gICAgICAgICAgICBhcHBlbmRGaXJzdCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1ZmZlclN0YXJ0LnByZXBlbmQoJ2J1ZmZlciArPSAnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnVmZmVyRW5kLmFkZCgnOycpO1xuICAgICAgICAgIGJ1ZmZlclN0YXJ0ID0gYnVmZmVyRW5kID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgc291cmNlU2VlbiA9IHRydWU7XG4gICAgICAgIGlmICghaXNTaW1wbGUpIHtcbiAgICAgICAgICBhcHBlbmRPbmx5ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChhcHBlbmRPbmx5KSB7XG4gICAgICBpZiAoYnVmZmVyU3RhcnQpIHtcbiAgICAgICAgYnVmZmVyU3RhcnQucHJlcGVuZCgncmV0dXJuICcpO1xuICAgICAgICBidWZmZXJFbmQuYWRkKCc7Jyk7XG4gICAgICB9IGVsc2UgaWYgKCFzb3VyY2VTZWVuKSB7XG4gICAgICAgIHRoaXMuc291cmNlLnB1c2goJ3JldHVybiBcIlwiOycpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXJEZWNsYXJhdGlvbnMgKz0gJywgYnVmZmVyID0gJyArIChhcHBlbmRGaXJzdCA/ICcnIDogdGhpcy5pbml0aWFsaXplQnVmZmVyKCkpO1xuXG4gICAgICBpZiAoYnVmZmVyU3RhcnQpIHtcbiAgICAgICAgYnVmZmVyU3RhcnQucHJlcGVuZCgncmV0dXJuIGJ1ZmZlciArICcpO1xuICAgICAgICBidWZmZXJFbmQuYWRkKCc7Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNvdXJjZS5wdXNoKCdyZXR1cm4gYnVmZmVyOycpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2YXJEZWNsYXJhdGlvbnMpIHtcbiAgICAgIHRoaXMuc291cmNlLnByZXBlbmQoJ3ZhciAnICsgdmFyRGVjbGFyYXRpb25zLnN1YnN0cmluZygyKSArIChhcHBlbmRGaXJzdCA/ICcnIDogJztcXG4nKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc291cmNlLm1lcmdlKCk7XG4gIH0sXG5cbiAgLy8gW2Jsb2NrVmFsdWVdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHZhbHVlXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmV0dXJuIHZhbHVlIG9mIGJsb2NrSGVscGVyTWlzc2luZ1xuICAvL1xuICAvLyBUaGUgcHVycG9zZSBvZiB0aGlzIG9wY29kZSBpcyB0byB0YWtlIGEgYmxvY2sgb2YgdGhlIGZvcm1cbiAgLy8gYHt7I3RoaXMuZm9vfX0uLi57ey90aGlzLmZvb319YCwgcmVzb2x2ZSB0aGUgdmFsdWUgb2YgYGZvb2AsIGFuZFxuICAvLyByZXBsYWNlIGl0IG9uIHRoZSBzdGFjayB3aXRoIHRoZSByZXN1bHQgb2YgcHJvcGVybHlcbiAgLy8gaW52b2tpbmcgYmxvY2tIZWxwZXJNaXNzaW5nLlxuICBibG9ja1ZhbHVlOiBmdW5jdGlvbiBibG9ja1ZhbHVlKG5hbWUpIHtcbiAgICB2YXIgYmxvY2tIZWxwZXJNaXNzaW5nID0gdGhpcy5hbGlhc2FibGUoJ2hlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nJyksXG4gICAgICAgIHBhcmFtcyA9IFt0aGlzLmNvbnRleHROYW1lKDApXTtcbiAgICB0aGlzLnNldHVwSGVscGVyQXJncyhuYW1lLCAwLCBwYXJhbXMpO1xuXG4gICAgdmFyIGJsb2NrTmFtZSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICBwYXJhbXMuc3BsaWNlKDEsIDAsIGJsb2NrTmFtZSk7XG5cbiAgICB0aGlzLnB1c2godGhpcy5zb3VyY2UuZnVuY3Rpb25DYWxsKGJsb2NrSGVscGVyTWlzc2luZywgJ2NhbGwnLCBwYXJhbXMpKTtcbiAgfSxcblxuICAvLyBbYW1iaWd1b3VzQmxvY2tWYWx1ZV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgdmFsdWVcbiAgLy8gQ29tcGlsZXIgdmFsdWUsIGJlZm9yZTogbGFzdEhlbHBlcj12YWx1ZSBvZiBsYXN0IGZvdW5kIGhlbHBlciwgaWYgYW55XG4gIC8vIE9uIHN0YWNrLCBhZnRlciwgaWYgbm8gbGFzdEhlbHBlcjogc2FtZSBhcyBbYmxvY2tWYWx1ZV1cbiAgLy8gT24gc3RhY2ssIGFmdGVyLCBpZiBsYXN0SGVscGVyOiB2YWx1ZVxuICBhbWJpZ3VvdXNCbG9ja1ZhbHVlOiBmdW5jdGlvbiBhbWJpZ3VvdXNCbG9ja1ZhbHVlKCkge1xuICAgIC8vIFdlJ3JlIGJlaW5nIGEgYml0IGNoZWVreSBhbmQgcmV1c2luZyB0aGUgb3B0aW9ucyB2YWx1ZSBmcm9tIHRoZSBwcmlvciBleGVjXG4gICAgdmFyIGJsb2NrSGVscGVyTWlzc2luZyA9IHRoaXMuYWxpYXNhYmxlKCdoZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZycpLFxuICAgICAgICBwYXJhbXMgPSBbdGhpcy5jb250ZXh0TmFtZSgwKV07XG4gICAgdGhpcy5zZXR1cEhlbHBlckFyZ3MoJycsIDAsIHBhcmFtcywgdHJ1ZSk7XG5cbiAgICB0aGlzLmZsdXNoSW5saW5lKCk7XG5cbiAgICB2YXIgY3VycmVudCA9IHRoaXMudG9wU3RhY2soKTtcbiAgICBwYXJhbXMuc3BsaWNlKDEsIDAsIGN1cnJlbnQpO1xuXG4gICAgdGhpcy5wdXNoU291cmNlKFsnaWYgKCEnLCB0aGlzLmxhc3RIZWxwZXIsICcpIHsgJywgY3VycmVudCwgJyA9ICcsIHRoaXMuc291cmNlLmZ1bmN0aW9uQ2FsbChibG9ja0hlbHBlck1pc3NpbmcsICdjYWxsJywgcGFyYW1zKSwgJ30nXSk7XG4gIH0sXG5cbiAgLy8gW2FwcGVuZENvbnRlbnRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBBcHBlbmRzIHRoZSBzdHJpbmcgdmFsdWUgb2YgYGNvbnRlbnRgIHRvIHRoZSBjdXJyZW50IGJ1ZmZlclxuICBhcHBlbmRDb250ZW50OiBmdW5jdGlvbiBhcHBlbmRDb250ZW50KGNvbnRlbnQpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xuICAgICAgY29udGVudCA9IHRoaXMucGVuZGluZ0NvbnRlbnQgKyBjb250ZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBlbmRpbmdMb2NhdGlvbiA9IHRoaXMuc291cmNlLmN1cnJlbnRMb2NhdGlvbjtcbiAgICB9XG5cbiAgICB0aGlzLnBlbmRpbmdDb250ZW50ID0gY29udGVudDtcbiAgfSxcblxuICAvLyBbYXBwZW5kXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIENvZXJjZXMgYHZhbHVlYCB0byBhIFN0cmluZyBhbmQgYXBwZW5kcyBpdCB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gIC8vXG4gIC8vIElmIGB2YWx1ZWAgaXMgdHJ1dGh5LCBvciAwLCBpdCBpcyBjb2VyY2VkIGludG8gYSBzdHJpbmcgYW5kIGFwcGVuZGVkXG4gIC8vIE90aGVyd2lzZSwgdGhlIGVtcHR5IHN0cmluZyBpcyBhcHBlbmRlZFxuICBhcHBlbmQ6IGZ1bmN0aW9uIGFwcGVuZCgpIHtcbiAgICBpZiAodGhpcy5pc0lubGluZSgpKSB7XG4gICAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbiAoY3VycmVudCkge1xuICAgICAgICByZXR1cm4gWycgIT0gbnVsbCA/ICcsIGN1cnJlbnQsICcgOiBcIlwiJ107XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5wdXNoU291cmNlKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5wb3BTdGFjaygpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBsb2NhbCA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIHRoaXMucHVzaFNvdXJjZShbJ2lmICgnLCBsb2NhbCwgJyAhPSBudWxsKSB7ICcsIHRoaXMuYXBwZW5kVG9CdWZmZXIobG9jYWwsIHVuZGVmaW5lZCwgdHJ1ZSksICcgfSddKTtcbiAgICAgIGlmICh0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlKSB7XG4gICAgICAgIHRoaXMucHVzaFNvdXJjZShbJ2Vsc2UgeyAnLCB0aGlzLmFwcGVuZFRvQnVmZmVyKCdcXCdcXCcnLCB1bmRlZmluZWQsIHRydWUpLCAnIH0nXSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8vIFthcHBlbmRFc2NhcGVkXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIEVzY2FwZSBgdmFsdWVgIGFuZCBhcHBlbmQgaXQgdG8gdGhlIGJ1ZmZlclxuICBhcHBlbmRFc2NhcGVkOiBmdW5jdGlvbiBhcHBlbmRFc2NhcGVkKCkge1xuICAgIHRoaXMucHVzaFNvdXJjZSh0aGlzLmFwcGVuZFRvQnVmZmVyKFt0aGlzLmFsaWFzYWJsZSgndGhpcy5lc2NhcGVFeHByZXNzaW9uJyksICcoJywgdGhpcy5wb3BTdGFjaygpLCAnKSddKSk7XG4gIH0sXG5cbiAgLy8gW2dldENvbnRleHRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvLyBDb21waWxlciB2YWx1ZSwgYWZ0ZXI6IGxhc3RDb250ZXh0PWRlcHRoXG4gIC8vXG4gIC8vIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBsYXN0Q29udGV4dGAgY29tcGlsZXIgdmFsdWUgdG8gdGhlIGRlcHRoXG4gIGdldENvbnRleHQ6IGZ1bmN0aW9uIGdldENvbnRleHQoZGVwdGgpIHtcbiAgICB0aGlzLmxhc3RDb250ZXh0ID0gZGVwdGg7XG4gIH0sXG5cbiAgLy8gW3B1c2hDb250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBjdXJyZW50Q29udGV4dCwgLi4uXG4gIC8vXG4gIC8vIFB1c2hlcyB0aGUgdmFsdWUgb2YgdGhlIGN1cnJlbnQgY29udGV4dCBvbnRvIHRoZSBzdGFjay5cbiAgcHVzaENvbnRleHQ6IGZ1bmN0aW9uIHB1c2hDb250ZXh0KCkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh0aGlzLmNvbnRleHROYW1lKHRoaXMubGFzdENvbnRleHQpKTtcbiAgfSxcblxuICAvLyBbbG9va3VwT25Db250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBjdXJyZW50Q29udGV4dFtuYW1lXSwgLi4uXG4gIC8vXG4gIC8vIExvb2tzIHVwIHRoZSB2YWx1ZSBvZiBgbmFtZWAgb24gdGhlIGN1cnJlbnQgY29udGV4dCBhbmQgcHVzaGVzXG4gIC8vIGl0IG9udG8gdGhlIHN0YWNrLlxuICBsb29rdXBPbkNvbnRleHQ6IGZ1bmN0aW9uIGxvb2t1cE9uQ29udGV4dChwYXJ0cywgZmFsc3ksIHNjb3BlZCkge1xuICAgIHZhciBpID0gMDtcblxuICAgIGlmICghc2NvcGVkICYmIHRoaXMub3B0aW9ucy5jb21wYXQgJiYgIXRoaXMubGFzdENvbnRleHQpIHtcbiAgICAgIC8vIFRoZSBkZXB0aGVkIHF1ZXJ5IGlzIGV4cGVjdGVkIHRvIGhhbmRsZSB0aGUgdW5kZWZpbmVkIGxvZ2ljIGZvciB0aGUgcm9vdCBsZXZlbCB0aGF0XG4gICAgICAvLyBpcyBpbXBsZW1lbnRlZCBiZWxvdywgc28gd2UgZXZhbHVhdGUgdGhhdCBkaXJlY3RseSBpbiBjb21wYXQgbW9kZVxuICAgICAgdGhpcy5wdXNoKHRoaXMuZGVwdGhlZExvb2t1cChwYXJ0c1tpKytdKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHVzaENvbnRleHQoKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlc29sdmVQYXRoKCdjb250ZXh0JywgcGFydHMsIGksIGZhbHN5KTtcbiAgfSxcblxuICAvLyBbbG9va3VwQmxvY2tQYXJhbV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogYmxvY2tQYXJhbVtuYW1lXSwgLi4uXG4gIC8vXG4gIC8vIExvb2tzIHVwIHRoZSB2YWx1ZSBvZiBgcGFydHNgIG9uIHRoZSBnaXZlbiBibG9jayBwYXJhbSBhbmQgcHVzaGVzXG4gIC8vIGl0IG9udG8gdGhlIHN0YWNrLlxuICBsb29rdXBCbG9ja1BhcmFtOiBmdW5jdGlvbiBsb29rdXBCbG9ja1BhcmFtKGJsb2NrUGFyYW1JZCwgcGFydHMpIHtcbiAgICB0aGlzLnVzZUJsb2NrUGFyYW1zID0gdHJ1ZTtcblxuICAgIHRoaXMucHVzaChbJ2Jsb2NrUGFyYW1zWycsIGJsb2NrUGFyYW1JZFswXSwgJ11bJywgYmxvY2tQYXJhbUlkWzFdLCAnXSddKTtcbiAgICB0aGlzLnJlc29sdmVQYXRoKCdjb250ZXh0JywgcGFydHMsIDEpO1xuICB9LFxuXG4gIC8vIFtsb29rdXBEYXRhXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBkYXRhLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCB0aGUgZGF0YSBsb29rdXAgb3BlcmF0b3JcbiAgbG9va3VwRGF0YTogZnVuY3Rpb24gbG9va3VwRGF0YShkZXB0aCwgcGFydHMpIHtcbiAgICBpZiAoIWRlcHRoKSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ2RhdGEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCd0aGlzLmRhdGEoZGF0YSwgJyArIGRlcHRoICsgJyknKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlc29sdmVQYXRoKCdkYXRhJywgcGFydHMsIDAsIHRydWUpO1xuICB9LFxuXG4gIHJlc29sdmVQYXRoOiBmdW5jdGlvbiByZXNvbHZlUGF0aCh0eXBlLCBwYXJ0cywgaSwgZmFsc3kpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3QgfHwgdGhpcy5vcHRpb25zLmFzc3VtZU9iamVjdHMpIHtcbiAgICAgIHRoaXMucHVzaChzdHJpY3RMb29rdXAodGhpcy5vcHRpb25zLnN0cmljdCwgdGhpcywgcGFydHMsIHR5cGUpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGVuID0gcGFydHMubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIC8qZXNsaW50LWRpc2FibGUgbm8tbG9vcC1mdW5jICovXG4gICAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbiAoY3VycmVudCkge1xuICAgICAgICB2YXIgbG9va3VwID0gX3RoaXMubmFtZUxvb2t1cChjdXJyZW50LCBwYXJ0c1tpXSwgdHlwZSk7XG4gICAgICAgIC8vIFdlIHdhbnQgdG8gZW5zdXJlIHRoYXQgemVybyBhbmQgZmFsc2UgYXJlIGhhbmRsZWQgcHJvcGVybHkgaWYgdGhlIGNvbnRleHQgKGZhbHN5IGZsYWcpXG4gICAgICAgIC8vIG5lZWRzIHRvIGhhdmUgdGhlIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHRoZXNlIHZhbHVlcy5cbiAgICAgICAgaWYgKCFmYWxzeSkge1xuICAgICAgICAgIHJldHVybiBbJyAhPSBudWxsID8gJywgbG9va3VwLCAnIDogJywgY3VycmVudF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGNhbiB1c2UgZ2VuZXJpYyBmYWxzeSBoYW5kbGluZ1xuICAgICAgICAgIHJldHVybiBbJyAmJiAnLCBsb29rdXBdO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8qZXNsaW50LWVuYWJsZSBuby1sb29wLWZ1bmMgKi9cbiAgICB9XG4gIH0sXG5cbiAgLy8gW3Jlc29sdmVQb3NzaWJsZUxhbWJkYV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc29sdmVkIHZhbHVlLCAuLi5cbiAgLy9cbiAgLy8gSWYgdGhlIGB2YWx1ZWAgaXMgYSBsYW1iZGEsIHJlcGxhY2UgaXQgb24gdGhlIHN0YWNrIGJ5XG4gIC8vIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGxhbWJkYVxuICByZXNvbHZlUG9zc2libGVMYW1iZGE6IGZ1bmN0aW9uIHJlc29sdmVQb3NzaWJsZUxhbWJkYSgpIHtcbiAgICB0aGlzLnB1c2goW3RoaXMuYWxpYXNhYmxlKCd0aGlzLmxhbWJkYScpLCAnKCcsIHRoaXMucG9wU3RhY2soKSwgJywgJywgdGhpcy5jb250ZXh0TmFtZSgwKSwgJyknXSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hTdHJpbmdQYXJhbV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogc3RyaW5nLCBjdXJyZW50Q29udGV4dCwgLi4uXG4gIC8vXG4gIC8vIFRoaXMgb3Bjb2RlIGlzIGRlc2lnbmVkIGZvciB1c2UgaW4gc3RyaW5nIG1vZGUsIHdoaWNoXG4gIC8vIHByb3ZpZGVzIHRoZSBzdHJpbmcgdmFsdWUgb2YgYSBwYXJhbWV0ZXIgYWxvbmcgd2l0aCBpdHNcbiAgLy8gZGVwdGggcmF0aGVyIHRoYW4gcmVzb2x2aW5nIGl0IGltbWVkaWF0ZWx5LlxuICBwdXNoU3RyaW5nUGFyYW06IGZ1bmN0aW9uIHB1c2hTdHJpbmdQYXJhbShzdHJpbmcsIHR5cGUpIHtcbiAgICB0aGlzLnB1c2hDb250ZXh0KCk7XG4gICAgdGhpcy5wdXNoU3RyaW5nKHR5cGUpO1xuXG4gICAgLy8gSWYgaXQncyBhIHN1YmV4cHJlc3Npb24sIHRoZSBzdHJpbmcgcmVzdWx0XG4gICAgLy8gd2lsbCBiZSBwdXNoZWQgYWZ0ZXIgdGhpcyBvcGNvZGUuXG4gICAgaWYgKHR5cGUgIT09ICdTdWJFeHByZXNzaW9uJykge1xuICAgICAgaWYgKHR5cGVvZiBzdHJpbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMucHVzaFN0cmluZyhzdHJpbmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHN0cmluZyk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGVtcHR5SGFzaDogZnVuY3Rpb24gZW1wdHlIYXNoKG9taXRFbXB0eSkge1xuICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICB0aGlzLnB1c2goJ3t9Jyk7IC8vIGhhc2hJZHNcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICB0aGlzLnB1c2goJ3t9Jyk7IC8vIGhhc2hDb250ZXh0c1xuICAgICAgdGhpcy5wdXNoKCd7fScpOyAvLyBoYXNoVHlwZXNcbiAgICB9XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKG9taXRFbXB0eSA/ICd1bmRlZmluZWQnIDogJ3t9Jyk7XG4gIH0sXG4gIHB1c2hIYXNoOiBmdW5jdGlvbiBwdXNoSGFzaCgpIHtcbiAgICBpZiAodGhpcy5oYXNoKSB7XG4gICAgICB0aGlzLmhhc2hlcy5wdXNoKHRoaXMuaGFzaCk7XG4gICAgfVxuICAgIHRoaXMuaGFzaCA9IHsgdmFsdWVzOiBbXSwgdHlwZXM6IFtdLCBjb250ZXh0czogW10sIGlkczogW10gfTtcbiAgfSxcbiAgcG9wSGFzaDogZnVuY3Rpb24gcG9wSGFzaCgpIHtcbiAgICB2YXIgaGFzaCA9IHRoaXMuaGFzaDtcbiAgICB0aGlzLmhhc2ggPSB0aGlzLmhhc2hlcy5wb3AoKTtcblxuICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICB0aGlzLnB1c2godGhpcy5vYmplY3RMaXRlcmFsKGhhc2guaWRzKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgdGhpcy5wdXNoKHRoaXMub2JqZWN0TGl0ZXJhbChoYXNoLmNvbnRleHRzKSk7XG4gICAgICB0aGlzLnB1c2godGhpcy5vYmplY3RMaXRlcmFsKGhhc2gudHlwZXMpKTtcbiAgICB9XG5cbiAgICB0aGlzLnB1c2godGhpcy5vYmplY3RMaXRlcmFsKGhhc2gudmFsdWVzKSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hTdHJpbmddXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHF1b3RlZFN0cmluZyhzdHJpbmcpLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCBhIHF1b3RlZCB2ZXJzaW9uIG9mIGBzdHJpbmdgIG9udG8gdGhlIHN0YWNrXG4gIHB1c2hTdHJpbmc6IGZ1bmN0aW9uIHB1c2hTdHJpbmcoc3RyaW5nKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHRoaXMucXVvdGVkU3RyaW5nKHN0cmluZykpO1xuICB9LFxuXG4gIC8vIFtwdXNoTGl0ZXJhbF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogdmFsdWUsIC4uLlxuICAvL1xuICAvLyBQdXNoZXMgYSB2YWx1ZSBvbnRvIHRoZSBzdGFjay4gVGhpcyBvcGVyYXRpb24gcHJldmVudHNcbiAgLy8gdGhlIGNvbXBpbGVyIGZyb20gY3JlYXRpbmcgYSB0ZW1wb3JhcnkgdmFyaWFibGUgdG8gaG9sZFxuICAvLyBpdC5cbiAgcHVzaExpdGVyYWw6IGZ1bmN0aW9uIHB1c2hMaXRlcmFsKHZhbHVlKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHZhbHVlKTtcbiAgfSxcblxuICAvLyBbcHVzaFByb2dyYW1dXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHByb2dyYW0oZ3VpZCksIC4uLlxuICAvL1xuICAvLyBQdXNoIGEgcHJvZ3JhbSBleHByZXNzaW9uIG9udG8gdGhlIHN0YWNrLiBUaGlzIHRha2VzXG4gIC8vIGEgY29tcGlsZS10aW1lIGd1aWQgYW5kIGNvbnZlcnRzIGl0IGludG8gYSBydW50aW1lLWFjY2Vzc2libGVcbiAgLy8gZXhwcmVzc2lvbi5cbiAgcHVzaFByb2dyYW06IGZ1bmN0aW9uIHB1c2hQcm9ncmFtKGd1aWQpIHtcbiAgICBpZiAoZ3VpZCAhPSBudWxsKSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodGhpcy5wcm9ncmFtRXhwcmVzc2lvbihndWlkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbChudWxsKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gW2ludm9rZUhlbHBlcl1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgaGVscGVyIGludm9jYXRpb25cbiAgLy9cbiAgLy8gUG9wcyBvZmYgdGhlIGhlbHBlcidzIHBhcmFtZXRlcnMsIGludm9rZXMgdGhlIGhlbHBlcixcbiAgLy8gYW5kIHB1c2hlcyB0aGUgaGVscGVyJ3MgcmV0dXJuIHZhbHVlIG9udG8gdGhlIHN0YWNrLlxuICAvL1xuICAvLyBJZiB0aGUgaGVscGVyIGlzIG5vdCBmb3VuZCwgYGhlbHBlck1pc3NpbmdgIGlzIGNhbGxlZC5cbiAgaW52b2tlSGVscGVyOiBmdW5jdGlvbiBpbnZva2VIZWxwZXIocGFyYW1TaXplLCBuYW1lLCBpc1NpbXBsZSkge1xuICAgIHZhciBub25IZWxwZXIgPSB0aGlzLnBvcFN0YWNrKCksXG4gICAgICAgIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIocGFyYW1TaXplLCBuYW1lKSxcbiAgICAgICAgc2ltcGxlID0gaXNTaW1wbGUgPyBbaGVscGVyLm5hbWUsICcgfHwgJ10gOiAnJztcblxuICAgIHZhciBsb29rdXAgPSBbJygnXS5jb25jYXQoc2ltcGxlLCBub25IZWxwZXIpO1xuICAgIGlmICghdGhpcy5vcHRpb25zLnN0cmljdCkge1xuICAgICAgbG9va3VwLnB1c2goJyB8fCAnLCB0aGlzLmFsaWFzYWJsZSgnaGVscGVycy5oZWxwZXJNaXNzaW5nJykpO1xuICAgIH1cbiAgICBsb29rdXAucHVzaCgnKScpO1xuXG4gICAgdGhpcy5wdXNoKHRoaXMuc291cmNlLmZ1bmN0aW9uQ2FsbChsb29rdXAsICdjYWxsJywgaGVscGVyLmNhbGxQYXJhbXMpKTtcbiAgfSxcblxuICAvLyBbaW52b2tlS25vd25IZWxwZXJdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGhlbHBlciBpbnZvY2F0aW9uXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgd2hlbiB0aGUgaGVscGVyIGlzIGtub3duIHRvIGV4aXN0LFxuICAvLyBzbyBhIGBoZWxwZXJNaXNzaW5nYCBmYWxsYmFjayBpcyBub3QgcmVxdWlyZWQuXG4gIGludm9rZUtub3duSGVscGVyOiBmdW5jdGlvbiBpbnZva2VLbm93bkhlbHBlcihwYXJhbVNpemUsIG5hbWUpIHtcbiAgICB2YXIgaGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcihwYXJhbVNpemUsIG5hbWUpO1xuICAgIHRoaXMucHVzaCh0aGlzLnNvdXJjZS5mdW5jdGlvbkNhbGwoaGVscGVyLm5hbWUsICdjYWxsJywgaGVscGVyLmNhbGxQYXJhbXMpKTtcbiAgfSxcblxuICAvLyBbaW52b2tlQW1iaWd1b3VzXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCBwYXJhbXMuLi4sIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc3VsdCBvZiBkaXNhbWJpZ3VhdGlvblxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBpcyB1c2VkIHdoZW4gYW4gZXhwcmVzc2lvbiBsaWtlIGB7e2Zvb319YFxuICAvLyBpcyBwcm92aWRlZCwgYnV0IHdlIGRvbid0IGtub3cgYXQgY29tcGlsZS10aW1lIHdoZXRoZXIgaXRcbiAgLy8gaXMgYSBoZWxwZXIgb3IgYSBwYXRoLlxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBlbWl0cyBtb3JlIGNvZGUgdGhhbiB0aGUgb3RoZXIgb3B0aW9ucyxcbiAgLy8gYW5kIGNhbiBiZSBhdm9pZGVkIGJ5IHBhc3NpbmcgdGhlIGBrbm93bkhlbHBlcnNgIGFuZFxuICAvLyBga25vd25IZWxwZXJzT25seWAgZmxhZ3MgYXQgY29tcGlsZS10aW1lLlxuICBpbnZva2VBbWJpZ3VvdXM6IGZ1bmN0aW9uIGludm9rZUFtYmlndW91cyhuYW1lLCBoZWxwZXJDYWxsKSB7XG4gICAgdGhpcy51c2VSZWdpc3RlcignaGVscGVyJyk7XG5cbiAgICB2YXIgbm9uSGVscGVyID0gdGhpcy5wb3BTdGFjaygpO1xuXG4gICAgdGhpcy5lbXB0eUhhc2goKTtcbiAgICB2YXIgaGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcigwLCBuYW1lLCBoZWxwZXJDYWxsKTtcblxuICAgIHZhciBoZWxwZXJOYW1lID0gdGhpcy5sYXN0SGVscGVyID0gdGhpcy5uYW1lTG9va3VwKCdoZWxwZXJzJywgbmFtZSwgJ2hlbHBlcicpO1xuXG4gICAgdmFyIGxvb2t1cCA9IFsnKCcsICcoaGVscGVyID0gJywgaGVscGVyTmFtZSwgJyB8fCAnLCBub25IZWxwZXIsICcpJ107XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICBsb29rdXBbMF0gPSAnKGhlbHBlciA9ICc7XG4gICAgICBsb29rdXAucHVzaCgnICE9IG51bGwgPyBoZWxwZXIgOiAnLCB0aGlzLmFsaWFzYWJsZSgnaGVscGVycy5oZWxwZXJNaXNzaW5nJykpO1xuICAgIH1cblxuICAgIHRoaXMucHVzaChbJygnLCBsb29rdXAsIGhlbHBlci5wYXJhbXNJbml0ID8gWycpLCgnLCBoZWxwZXIucGFyYW1zSW5pdF0gOiBbXSwgJyksJywgJyh0eXBlb2YgaGVscGVyID09PSAnLCB0aGlzLmFsaWFzYWJsZSgnXCJmdW5jdGlvblwiJyksICcgPyAnLCB0aGlzLnNvdXJjZS5mdW5jdGlvbkNhbGwoJ2hlbHBlcicsICdjYWxsJywgaGVscGVyLmNhbGxQYXJhbXMpLCAnIDogaGVscGVyKSknXSk7XG4gIH0sXG5cbiAgLy8gW2ludm9rZVBhcnRpYWxdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGNvbnRleHQsIC4uLlxuICAvLyBPbiBzdGFjayBhZnRlcjogcmVzdWx0IG9mIHBhcnRpYWwgaW52b2NhdGlvblxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBwb3BzIG9mZiBhIGNvbnRleHQsIGludm9rZXMgYSBwYXJ0aWFsIHdpdGggdGhhdCBjb250ZXh0LFxuICAvLyBhbmQgcHVzaGVzIHRoZSByZXN1bHQgb2YgdGhlIGludm9jYXRpb24gYmFjay5cbiAgaW52b2tlUGFydGlhbDogZnVuY3Rpb24gaW52b2tlUGFydGlhbChpc0R5bmFtaWMsIG5hbWUsIGluZGVudCkge1xuICAgIHZhciBwYXJhbXMgPSBbXSxcbiAgICAgICAgb3B0aW9ucyA9IHRoaXMuc2V0dXBQYXJhbXMobmFtZSwgMSwgcGFyYW1zLCBmYWxzZSk7XG5cbiAgICBpZiAoaXNEeW5hbWljKSB7XG4gICAgICBuYW1lID0gdGhpcy5wb3BTdGFjaygpO1xuICAgICAgZGVsZXRlIG9wdGlvbnMubmFtZTtcbiAgICB9XG5cbiAgICBpZiAoaW5kZW50KSB7XG4gICAgICBvcHRpb25zLmluZGVudCA9IEpTT04uc3RyaW5naWZ5KGluZGVudCk7XG4gICAgfVxuICAgIG9wdGlvbnMuaGVscGVycyA9ICdoZWxwZXJzJztcbiAgICBvcHRpb25zLnBhcnRpYWxzID0gJ3BhcnRpYWxzJztcblxuICAgIGlmICghaXNEeW5hbWljKSB7XG4gICAgICBwYXJhbXMudW5zaGlmdCh0aGlzLm5hbWVMb29rdXAoJ3BhcnRpYWxzJywgbmFtZSwgJ3BhcnRpYWwnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmFtcy51bnNoaWZ0KG5hbWUpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29tcGF0KSB7XG4gICAgICBvcHRpb25zLmRlcHRocyA9ICdkZXB0aHMnO1xuICAgIH1cbiAgICBvcHRpb25zID0gdGhpcy5vYmplY3RMaXRlcmFsKG9wdGlvbnMpO1xuICAgIHBhcmFtcy5wdXNoKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5wdXNoKHRoaXMuc291cmNlLmZ1bmN0aW9uQ2FsbCgndGhpcy5pbnZva2VQYXJ0aWFsJywgJycsIHBhcmFtcykpO1xuICB9LFxuXG4gIC8vIFthc3NpZ25Ub0hhc2hdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi4sIGhhc2gsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLiwgaGFzaCwgLi4uXG4gIC8vXG4gIC8vIFBvcHMgYSB2YWx1ZSBvZmYgdGhlIHN0YWNrIGFuZCBhc3NpZ25zIGl0IHRvIHRoZSBjdXJyZW50IGhhc2hcbiAgYXNzaWduVG9IYXNoOiBmdW5jdGlvbiBhc3NpZ25Ub0hhc2goa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5wb3BTdGFjaygpLFxuICAgICAgICBjb250ZXh0ID0gdW5kZWZpbmVkLFxuICAgICAgICB0eXBlID0gdW5kZWZpbmVkLFxuICAgICAgICBpZCA9IHVuZGVmaW5lZDtcblxuICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICBpZCA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICB0eXBlID0gdGhpcy5wb3BTdGFjaygpO1xuICAgICAgY29udGV4dCA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB9XG5cbiAgICB2YXIgaGFzaCA9IHRoaXMuaGFzaDtcbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgaGFzaC5jb250ZXh0c1trZXldID0gY29udGV4dDtcbiAgICB9XG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIGhhc2gudHlwZXNba2V5XSA9IHR5cGU7XG4gICAgfVxuICAgIGlmIChpZCkge1xuICAgICAgaGFzaC5pZHNba2V5XSA9IGlkO1xuICAgIH1cbiAgICBoYXNoLnZhbHVlc1trZXldID0gdmFsdWU7XG4gIH0sXG5cbiAgcHVzaElkOiBmdW5jdGlvbiBwdXNoSWQodHlwZSwgbmFtZSwgY2hpbGQpIHtcbiAgICBpZiAodHlwZSA9PT0gJ0Jsb2NrUGFyYW0nKSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ2Jsb2NrUGFyYW1zWycgKyBuYW1lWzBdICsgJ10ucGF0aFsnICsgbmFtZVsxXSArICddJyArIChjaGlsZCA/ICcgKyAnICsgSlNPTi5zdHJpbmdpZnkoJy4nICsgY2hpbGQpIDogJycpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdQYXRoRXhwcmVzc2lvbicpIHtcbiAgICAgIHRoaXMucHVzaFN0cmluZyhuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdTdWJFeHByZXNzaW9uJykge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCd0cnVlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgnbnVsbCcpO1xuICAgIH1cbiAgfSxcblxuICAvLyBIRUxQRVJTXG5cbiAgY29tcGlsZXI6IEphdmFTY3JpcHRDb21waWxlcixcblxuICBjb21waWxlQ2hpbGRyZW46IGZ1bmN0aW9uIGNvbXBpbGVDaGlsZHJlbihlbnZpcm9ubWVudCwgb3B0aW9ucykge1xuICAgIHZhciBjaGlsZHJlbiA9IGVudmlyb25tZW50LmNoaWxkcmVuLFxuICAgICAgICBjaGlsZCA9IHVuZGVmaW5lZCxcbiAgICAgICAgY29tcGlsZXIgPSB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgIGNvbXBpbGVyID0gbmV3IHRoaXMuY29tcGlsZXIoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuZXctY2FwXG5cbiAgICAgIHZhciBpbmRleCA9IHRoaXMubWF0Y2hFeGlzdGluZ1Byb2dyYW0oY2hpbGQpO1xuXG4gICAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQucHJvZ3JhbXMucHVzaCgnJyk7IC8vIFBsYWNlaG9sZGVyIHRvIHByZXZlbnQgbmFtZSBjb25mbGljdHMgZm9yIG5lc3RlZCBjaGlsZHJlblxuICAgICAgICBpbmRleCA9IHRoaXMuY29udGV4dC5wcm9ncmFtcy5sZW5ndGg7XG4gICAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGNoaWxkLm5hbWUgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSA9IGNvbXBpbGVyLmNvbXBpbGUoY2hpbGQsIG9wdGlvbnMsIHRoaXMuY29udGV4dCwgIXRoaXMucHJlY29tcGlsZSk7XG4gICAgICAgIHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHNbaW5kZXhdID0gY2hpbGQ7XG5cbiAgICAgICAgdGhpcy51c2VEZXB0aHMgPSB0aGlzLnVzZURlcHRocyB8fCBjb21waWxlci51c2VEZXB0aHM7XG4gICAgICAgIHRoaXMudXNlQmxvY2tQYXJhbXMgPSB0aGlzLnVzZUJsb2NrUGFyYW1zIHx8IGNvbXBpbGVyLnVzZUJsb2NrUGFyYW1zO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQuaW5kZXggPSBpbmRleDtcbiAgICAgICAgY2hpbGQubmFtZSA9ICdwcm9ncmFtJyArIGluZGV4O1xuXG4gICAgICAgIHRoaXMudXNlRGVwdGhzID0gdGhpcy51c2VEZXB0aHMgfHwgY2hpbGQudXNlRGVwdGhzO1xuICAgICAgICB0aGlzLnVzZUJsb2NrUGFyYW1zID0gdGhpcy51c2VCbG9ja1BhcmFtcyB8fCBjaGlsZC51c2VCbG9ja1BhcmFtcztcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIG1hdGNoRXhpc3RpbmdQcm9ncmFtOiBmdW5jdGlvbiBtYXRjaEV4aXN0aW5nUHJvZ3JhbShjaGlsZCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgZW52aXJvbm1lbnQgPSB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzW2ldO1xuICAgICAgaWYgKGVudmlyb25tZW50ICYmIGVudmlyb25tZW50LmVxdWFscyhjaGlsZCkpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHByb2dyYW1FeHByZXNzaW9uOiBmdW5jdGlvbiBwcm9ncmFtRXhwcmVzc2lvbihndWlkKSB7XG4gICAgdmFyIGNoaWxkID0gdGhpcy5lbnZpcm9ubWVudC5jaGlsZHJlbltndWlkXSxcbiAgICAgICAgcHJvZ3JhbVBhcmFtcyA9IFtjaGlsZC5pbmRleCwgJ2RhdGEnLCBjaGlsZC5ibG9ja1BhcmFtc107XG5cbiAgICBpZiAodGhpcy51c2VCbG9ja1BhcmFtcyB8fCB0aGlzLnVzZURlcHRocykge1xuICAgICAgcHJvZ3JhbVBhcmFtcy5wdXNoKCdibG9ja1BhcmFtcycpO1xuICAgIH1cbiAgICBpZiAodGhpcy51c2VEZXB0aHMpIHtcbiAgICAgIHByb2dyYW1QYXJhbXMucHVzaCgnZGVwdGhzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuICd0aGlzLnByb2dyYW0oJyArIHByb2dyYW1QYXJhbXMuam9pbignLCAnKSArICcpJztcbiAgfSxcblxuICB1c2VSZWdpc3RlcjogZnVuY3Rpb24gdXNlUmVnaXN0ZXIobmFtZSkge1xuICAgIGlmICghdGhpcy5yZWdpc3RlcnNbbmFtZV0pIHtcbiAgICAgIHRoaXMucmVnaXN0ZXJzW25hbWVdID0gdHJ1ZTtcbiAgICAgIHRoaXMucmVnaXN0ZXJzLmxpc3QucHVzaChuYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgcHVzaDogZnVuY3Rpb24gcHVzaChleHByKSB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIExpdGVyYWwpKSB7XG4gICAgICBleHByID0gdGhpcy5zb3VyY2Uud3JhcChleHByKTtcbiAgICB9XG5cbiAgICB0aGlzLmlubGluZVN0YWNrLnB1c2goZXhwcik7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH0sXG5cbiAgcHVzaFN0YWNrTGl0ZXJhbDogZnVuY3Rpb24gcHVzaFN0YWNrTGl0ZXJhbChpdGVtKSB7XG4gICAgdGhpcy5wdXNoKG5ldyBMaXRlcmFsKGl0ZW0pKTtcbiAgfSxcblxuICBwdXNoU291cmNlOiBmdW5jdGlvbiBwdXNoU291cmNlKHNvdXJjZSkge1xuICAgIGlmICh0aGlzLnBlbmRpbmdDb250ZW50KSB7XG4gICAgICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5zb3VyY2UucXVvdGVkU3RyaW5nKHRoaXMucGVuZGluZ0NvbnRlbnQpLCB0aGlzLnBlbmRpbmdMb2NhdGlvbikpO1xuICAgICAgdGhpcy5wZW5kaW5nQ29udGVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAoc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZS5wdXNoKHNvdXJjZSk7XG4gICAgfVxuICB9LFxuXG4gIHJlcGxhY2VTdGFjazogZnVuY3Rpb24gcmVwbGFjZVN0YWNrKGNhbGxiYWNrKSB7XG4gICAgdmFyIHByZWZpeCA9IFsnKCddLFxuICAgICAgICBzdGFjayA9IHVuZGVmaW5lZCxcbiAgICAgICAgY3JlYXRlZFN0YWNrID0gdW5kZWZpbmVkLFxuICAgICAgICB1c2VkTGl0ZXJhbCA9IHVuZGVmaW5lZDtcblxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgaWYgKCF0aGlzLmlzSW5saW5lKCkpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdyZXBsYWNlU3RhY2sgb24gbm9uLWlubGluZScpO1xuICAgIH1cblxuICAgIC8vIFdlIHdhbnQgdG8gbWVyZ2UgdGhlIGlubGluZSBzdGF0ZW1lbnQgaW50byB0aGUgcmVwbGFjZW1lbnQgc3RhdGVtZW50IHZpYSAnLCdcbiAgICB2YXIgdG9wID0gdGhpcy5wb3BTdGFjayh0cnVlKTtcblxuICAgIGlmICh0b3AgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAvLyBMaXRlcmFscyBkbyBub3QgbmVlZCB0byBiZSBpbmxpbmVkXG4gICAgICBzdGFjayA9IFt0b3AudmFsdWVdO1xuICAgICAgcHJlZml4ID0gWycoJywgc3RhY2tdO1xuICAgICAgdXNlZExpdGVyYWwgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBHZXQgb3IgY3JlYXRlIHRoZSBjdXJyZW50IHN0YWNrIG5hbWUgZm9yIHVzZSBieSB0aGUgaW5saW5lXG4gICAgICBjcmVhdGVkU3RhY2sgPSB0cnVlO1xuICAgICAgdmFyIF9uYW1lID0gdGhpcy5pbmNyU3RhY2soKTtcblxuICAgICAgcHJlZml4ID0gWycoKCcsIHRoaXMucHVzaChfbmFtZSksICcgPSAnLCB0b3AsICcpJ107XG4gICAgICBzdGFjayA9IHRoaXMudG9wU3RhY2soKTtcbiAgICB9XG5cbiAgICB2YXIgaXRlbSA9IGNhbGxiYWNrLmNhbGwodGhpcywgc3RhY2spO1xuXG4gICAgaWYgKCF1c2VkTGl0ZXJhbCkge1xuICAgICAgdGhpcy5wb3BTdGFjaygpO1xuICAgIH1cbiAgICBpZiAoY3JlYXRlZFN0YWNrKSB7XG4gICAgICB0aGlzLnN0YWNrU2xvdC0tO1xuICAgIH1cbiAgICB0aGlzLnB1c2gocHJlZml4LmNvbmNhdChpdGVtLCAnKScpKTtcbiAgfSxcblxuICBpbmNyU3RhY2s6IGZ1bmN0aW9uIGluY3JTdGFjaygpIHtcbiAgICB0aGlzLnN0YWNrU2xvdCsrO1xuICAgIGlmICh0aGlzLnN0YWNrU2xvdCA+IHRoaXMuc3RhY2tWYXJzLmxlbmd0aCkge1xuICAgICAgdGhpcy5zdGFja1ZhcnMucHVzaCgnc3RhY2snICsgdGhpcy5zdGFja1Nsb3QpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50b3BTdGFja05hbWUoKTtcbiAgfSxcbiAgdG9wU3RhY2tOYW1lOiBmdW5jdGlvbiB0b3BTdGFja05hbWUoKSB7XG4gICAgcmV0dXJuICdzdGFjaycgKyB0aGlzLnN0YWNrU2xvdDtcbiAgfSxcbiAgZmx1c2hJbmxpbmU6IGZ1bmN0aW9uIGZsdXNoSW5saW5lKCkge1xuICAgIHZhciBpbmxpbmVTdGFjayA9IHRoaXMuaW5saW5lU3RhY2s7XG4gICAgdGhpcy5pbmxpbmVTdGFjayA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBpbmxpbmVTdGFjay5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGVudHJ5ID0gaW5saW5lU3RhY2tbaV07XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgdGhpcy5jb21waWxlU3RhY2sucHVzaChlbnRyeSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc3RhY2sgPSB0aGlzLmluY3JTdGFjaygpO1xuICAgICAgICB0aGlzLnB1c2hTb3VyY2UoW3N0YWNrLCAnID0gJywgZW50cnksICc7J10pO1xuICAgICAgICB0aGlzLmNvbXBpbGVTdGFjay5wdXNoKHN0YWNrKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGlzSW5saW5lOiBmdW5jdGlvbiBpc0lubGluZSgpIHtcbiAgICByZXR1cm4gdGhpcy5pbmxpbmVTdGFjay5sZW5ndGg7XG4gIH0sXG5cbiAgcG9wU3RhY2s6IGZ1bmN0aW9uIHBvcFN0YWNrKHdyYXBwZWQpIHtcbiAgICB2YXIgaW5saW5lID0gdGhpcy5pc0lubGluZSgpLFxuICAgICAgICBpdGVtID0gKGlubGluZSA/IHRoaXMuaW5saW5lU3RhY2sgOiB0aGlzLmNvbXBpbGVTdGFjaykucG9wKCk7XG5cbiAgICBpZiAoIXdyYXBwZWQgJiYgaXRlbSBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWlubGluZSkge1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgICBpZiAoIXRoaXMuc3RhY2tTbG90KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ0ludmFsaWQgc3RhY2sgcG9wJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGFja1Nsb3QtLTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH1cbiAgfSxcblxuICB0b3BTdGFjazogZnVuY3Rpb24gdG9wU3RhY2soKSB7XG4gICAgdmFyIHN0YWNrID0gdGhpcy5pc0lubGluZSgpID8gdGhpcy5pbmxpbmVTdGFjayA6IHRoaXMuY29tcGlsZVN0YWNrLFxuICAgICAgICBpdGVtID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG5cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0sXG5cbiAgY29udGV4dE5hbWU6IGZ1bmN0aW9uIGNvbnRleHROYW1lKGNvbnRleHQpIHtcbiAgICBpZiAodGhpcy51c2VEZXB0aHMgJiYgY29udGV4dCkge1xuICAgICAgcmV0dXJuICdkZXB0aHNbJyArIGNvbnRleHQgKyAnXSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnZGVwdGgnICsgY29udGV4dDtcbiAgICB9XG4gIH0sXG5cbiAgcXVvdGVkU3RyaW5nOiBmdW5jdGlvbiBxdW90ZWRTdHJpbmcoc3RyKSB7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlLnF1b3RlZFN0cmluZyhzdHIpO1xuICB9LFxuXG4gIG9iamVjdExpdGVyYWw6IGZ1bmN0aW9uIG9iamVjdExpdGVyYWwob2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlLm9iamVjdExpdGVyYWwob2JqKTtcbiAgfSxcblxuICBhbGlhc2FibGU6IGZ1bmN0aW9uIGFsaWFzYWJsZShuYW1lKSB7XG4gICAgdmFyIHJldCA9IHRoaXMuYWxpYXNlc1tuYW1lXTtcbiAgICBpZiAocmV0KSB7XG4gICAgICByZXQucmVmZXJlbmNlQ291bnQrKztcbiAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgcmV0ID0gdGhpcy5hbGlhc2VzW25hbWVdID0gdGhpcy5zb3VyY2Uud3JhcChuYW1lKTtcbiAgICByZXQuYWxpYXNhYmxlID0gdHJ1ZTtcbiAgICByZXQucmVmZXJlbmNlQ291bnQgPSAxO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBzZXR1cEhlbHBlcjogZnVuY3Rpb24gc2V0dXBIZWxwZXIocGFyYW1TaXplLCBuYW1lLCBibG9ja0hlbHBlcikge1xuICAgIHZhciBwYXJhbXMgPSBbXSxcbiAgICAgICAgcGFyYW1zSW5pdCA9IHRoaXMuc2V0dXBIZWxwZXJBcmdzKG5hbWUsIHBhcmFtU2l6ZSwgcGFyYW1zLCBibG9ja0hlbHBlcik7XG4gICAgdmFyIGZvdW5kSGVscGVyID0gdGhpcy5uYW1lTG9va3VwKCdoZWxwZXJzJywgbmFtZSwgJ2hlbHBlcicpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgcGFyYW1zSW5pdDogcGFyYW1zSW5pdCxcbiAgICAgIG5hbWU6IGZvdW5kSGVscGVyLFxuICAgICAgY2FsbFBhcmFtczogW3RoaXMuY29udGV4dE5hbWUoMCldLmNvbmNhdChwYXJhbXMpXG4gICAgfTtcbiAgfSxcblxuICBzZXR1cFBhcmFtczogZnVuY3Rpb24gc2V0dXBQYXJhbXMoaGVscGVyLCBwYXJhbVNpemUsIHBhcmFtcykge1xuICAgIHZhciBvcHRpb25zID0ge30sXG4gICAgICAgIGNvbnRleHRzID0gW10sXG4gICAgICAgIHR5cGVzID0gW10sXG4gICAgICAgIGlkcyA9IFtdLFxuICAgICAgICBwYXJhbSA9IHVuZGVmaW5lZDtcblxuICAgIG9wdGlvbnMubmFtZSA9IHRoaXMucXVvdGVkU3RyaW5nKGhlbHBlcik7XG4gICAgb3B0aW9ucy5oYXNoID0gdGhpcy5wb3BTdGFjaygpO1xuXG4gICAgaWYgKHRoaXMudHJhY2tJZHMpIHtcbiAgICAgIG9wdGlvbnMuaGFzaElkcyA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICBvcHRpb25zLmhhc2hUeXBlcyA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIG9wdGlvbnMuaGFzaENvbnRleHRzID0gdGhpcy5wb3BTdGFjaygpO1xuICAgIH1cblxuICAgIHZhciBpbnZlcnNlID0gdGhpcy5wb3BTdGFjaygpLFxuICAgICAgICBwcm9ncmFtID0gdGhpcy5wb3BTdGFjaygpO1xuXG4gICAgLy8gQXZvaWQgc2V0dGluZyBmbiBhbmQgaW52ZXJzZSBpZiBuZWl0aGVyIGFyZSBzZXQuIFRoaXMgYWxsb3dzXG4gICAgLy8gaGVscGVycyB0byBkbyBhIGNoZWNrIGZvciBgaWYgKG9wdGlvbnMuZm4pYFxuICAgIGlmIChwcm9ncmFtIHx8IGludmVyc2UpIHtcbiAgICAgIG9wdGlvbnMuZm4gPSBwcm9ncmFtIHx8ICd0aGlzLm5vb3AnO1xuICAgICAgb3B0aW9ucy5pbnZlcnNlID0gaW52ZXJzZSB8fCAndGhpcy5ub29wJztcbiAgICB9XG5cbiAgICAvLyBUaGUgcGFyYW1ldGVycyBnbyBvbiB0byB0aGUgc3RhY2sgaW4gb3JkZXIgKG1ha2luZyBzdXJlIHRoYXQgdGhleSBhcmUgZXZhbHVhdGVkIGluIG9yZGVyKVxuICAgIC8vIHNvIHdlIG5lZWQgdG8gcG9wIHRoZW0gb2ZmIHRoZSBzdGFjayBpbiByZXZlcnNlIG9yZGVyXG4gICAgdmFyIGkgPSBwYXJhbVNpemU7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgcGFyYW0gPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICBwYXJhbXNbaV0gPSBwYXJhbTtcblxuICAgICAgaWYgKHRoaXMudHJhY2tJZHMpIHtcbiAgICAgICAgaWRzW2ldID0gdGhpcy5wb3BTdGFjaygpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICAgIHR5cGVzW2ldID0gdGhpcy5wb3BTdGFjaygpO1xuICAgICAgICBjb250ZXh0c1tpXSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy50cmFja0lkcykge1xuICAgICAgb3B0aW9ucy5pZHMgPSB0aGlzLnNvdXJjZS5nZW5lcmF0ZUFycmF5KGlkcyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgb3B0aW9ucy50eXBlcyA9IHRoaXMuc291cmNlLmdlbmVyYXRlQXJyYXkodHlwZXMpO1xuICAgICAgb3B0aW9ucy5jb250ZXh0cyA9IHRoaXMuc291cmNlLmdlbmVyYXRlQXJyYXkoY29udGV4dHMpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgICAgb3B0aW9ucy5kYXRhID0gJ2RhdGEnO1xuICAgIH1cbiAgICBpZiAodGhpcy51c2VCbG9ja1BhcmFtcykge1xuICAgICAgb3B0aW9ucy5ibG9ja1BhcmFtcyA9ICdibG9ja1BhcmFtcyc7XG4gICAgfVxuICAgIHJldHVybiBvcHRpb25zO1xuICB9LFxuXG4gIHNldHVwSGVscGVyQXJnczogZnVuY3Rpb24gc2V0dXBIZWxwZXJBcmdzKGhlbHBlciwgcGFyYW1TaXplLCBwYXJhbXMsIHVzZVJlZ2lzdGVyKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLnNldHVwUGFyYW1zKGhlbHBlciwgcGFyYW1TaXplLCBwYXJhbXMsIHRydWUpO1xuICAgIG9wdGlvbnMgPSB0aGlzLm9iamVjdExpdGVyYWwob3B0aW9ucyk7XG4gICAgaWYgKHVzZVJlZ2lzdGVyKSB7XG4gICAgICB0aGlzLnVzZVJlZ2lzdGVyKCdvcHRpb25zJyk7XG4gICAgICBwYXJhbXMucHVzaCgnb3B0aW9ucycpO1xuICAgICAgcmV0dXJuIFsnb3B0aW9ucz0nLCBvcHRpb25zXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyYW1zLnB1c2gob3B0aW9ucyk7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICB9XG59O1xuXG4oZnVuY3Rpb24gKCkge1xuICB2YXIgcmVzZXJ2ZWRXb3JkcyA9ICgnYnJlYWsgZWxzZSBuZXcgdmFyJyArICcgY2FzZSBmaW5hbGx5IHJldHVybiB2b2lkJyArICcgY2F0Y2ggZm9yIHN3aXRjaCB3aGlsZScgKyAnIGNvbnRpbnVlIGZ1bmN0aW9uIHRoaXMgd2l0aCcgKyAnIGRlZmF1bHQgaWYgdGhyb3cnICsgJyBkZWxldGUgaW4gdHJ5JyArICcgZG8gaW5zdGFuY2VvZiB0eXBlb2YnICsgJyBhYnN0cmFjdCBlbnVtIGludCBzaG9ydCcgKyAnIGJvb2xlYW4gZXhwb3J0IGludGVyZmFjZSBzdGF0aWMnICsgJyBieXRlIGV4dGVuZHMgbG9uZyBzdXBlcicgKyAnIGNoYXIgZmluYWwgbmF0aXZlIHN5bmNocm9uaXplZCcgKyAnIGNsYXNzIGZsb2F0IHBhY2thZ2UgdGhyb3dzJyArICcgY29uc3QgZ290byBwcml2YXRlIHRyYW5zaWVudCcgKyAnIGRlYnVnZ2VyIGltcGxlbWVudHMgcHJvdGVjdGVkIHZvbGF0aWxlJyArICcgZG91YmxlIGltcG9ydCBwdWJsaWMgbGV0IHlpZWxkIGF3YWl0JyArICcgbnVsbCB0cnVlIGZhbHNlJykuc3BsaXQoJyAnKTtcblxuICB2YXIgY29tcGlsZXJXb3JkcyA9IEphdmFTY3JpcHRDb21waWxlci5SRVNFUlZFRF9XT1JEUyA9IHt9O1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcmVzZXJ2ZWRXb3Jkcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBjb21waWxlcldvcmRzW3Jlc2VydmVkV29yZHNbaV1dID0gdHJ1ZTtcbiAgfVxufSkoKTtcblxuSmF2YVNjcmlwdENvbXBpbGVyLmlzVmFsaWRKYXZhU2NyaXB0VmFyaWFibGVOYW1lID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgcmV0dXJuICFKYXZhU2NyaXB0Q29tcGlsZXIuUkVTRVJWRURfV09SRFNbbmFtZV0gJiYgL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSokLy50ZXN0KG5hbWUpO1xufTtcblxuZnVuY3Rpb24gc3RyaWN0TG9va3VwKHJlcXVpcmVUZXJtaW5hbCwgY29tcGlsZXIsIHBhcnRzLCB0eXBlKSB7XG4gIHZhciBzdGFjayA9IGNvbXBpbGVyLnBvcFN0YWNrKCksXG4gICAgICBpID0gMCxcbiAgICAgIGxlbiA9IHBhcnRzLmxlbmd0aDtcbiAgaWYgKHJlcXVpcmVUZXJtaW5hbCkge1xuICAgIGxlbi0tO1xuICB9XG5cbiAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgIHN0YWNrID0gY29tcGlsZXIubmFtZUxvb2t1cChzdGFjaywgcGFydHNbaV0sIHR5cGUpO1xuICB9XG5cbiAgaWYgKHJlcXVpcmVUZXJtaW5hbCkge1xuICAgIHJldHVybiBbY29tcGlsZXIuYWxpYXNhYmxlKCd0aGlzLnN0cmljdCcpLCAnKCcsIHN0YWNrLCAnLCAnLCBjb21waWxlci5xdW90ZWRTdHJpbmcocGFydHNbaV0pLCAnKSddO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdGFjaztcbiAgfVxufVxuXG5leHBvcnRzWydkZWZhdWx0J10gPSBKYXZhU2NyaXB0Q29tcGlsZXI7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4vKiBKaXNvbiBnZW5lcmF0ZWQgcGFyc2VyICovXG52YXIgaGFuZGxlYmFycyA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcnNlciA9IHsgdHJhY2U6IGZ1bmN0aW9uIHRyYWNlKCkge30sXG4gICAgICAgIHl5OiB7fSxcbiAgICAgICAgc3ltYm9sc186IHsgZXJyb3I6IDIsIHJvb3Q6IDMsIHByb2dyYW06IDQsIEVPRjogNSwgcHJvZ3JhbV9yZXBldGl0aW9uMDogNiwgc3RhdGVtZW50OiA3LCBtdXN0YWNoZTogOCwgYmxvY2s6IDksIHJhd0Jsb2NrOiAxMCwgcGFydGlhbDogMTEsIGNvbnRlbnQ6IDEyLCBDT01NRU5UOiAxMywgQ09OVEVOVDogMTQsIG9wZW5SYXdCbG9jazogMTUsIEVORF9SQVdfQkxPQ0s6IDE2LCBPUEVOX1JBV19CTE9DSzogMTcsIGhlbHBlck5hbWU6IDE4LCBvcGVuUmF3QmxvY2tfcmVwZXRpdGlvbjA6IDE5LCBvcGVuUmF3QmxvY2tfb3B0aW9uMDogMjAsIENMT1NFX1JBV19CTE9DSzogMjEsIG9wZW5CbG9jazogMjIsIGJsb2NrX29wdGlvbjA6IDIzLCBjbG9zZUJsb2NrOiAyNCwgb3BlbkludmVyc2U6IDI1LCBibG9ja19vcHRpb24xOiAyNiwgT1BFTl9CTE9DSzogMjcsIG9wZW5CbG9ja19yZXBldGl0aW9uMDogMjgsIG9wZW5CbG9ja19vcHRpb24wOiAyOSwgb3BlbkJsb2NrX29wdGlvbjE6IDMwLCBDTE9TRTogMzEsIE9QRU5fSU5WRVJTRTogMzIsIG9wZW5JbnZlcnNlX3JlcGV0aXRpb24wOiAzMywgb3BlbkludmVyc2Vfb3B0aW9uMDogMzQsIG9wZW5JbnZlcnNlX29wdGlvbjE6IDM1LCBvcGVuSW52ZXJzZUNoYWluOiAzNiwgT1BFTl9JTlZFUlNFX0NIQUlOOiAzNywgb3BlbkludmVyc2VDaGFpbl9yZXBldGl0aW9uMDogMzgsIG9wZW5JbnZlcnNlQ2hhaW5fb3B0aW9uMDogMzksIG9wZW5JbnZlcnNlQ2hhaW5fb3B0aW9uMTogNDAsIGludmVyc2VBbmRQcm9ncmFtOiA0MSwgSU5WRVJTRTogNDIsIGludmVyc2VDaGFpbjogNDMsIGludmVyc2VDaGFpbl9vcHRpb24wOiA0NCwgT1BFTl9FTkRCTE9DSzogNDUsIE9QRU46IDQ2LCBtdXN0YWNoZV9yZXBldGl0aW9uMDogNDcsIG11c3RhY2hlX29wdGlvbjA6IDQ4LCBPUEVOX1VORVNDQVBFRDogNDksIG11c3RhY2hlX3JlcGV0aXRpb24xOiA1MCwgbXVzdGFjaGVfb3B0aW9uMTogNTEsIENMT1NFX1VORVNDQVBFRDogNTIsIE9QRU5fUEFSVElBTDogNTMsIHBhcnRpYWxOYW1lOiA1NCwgcGFydGlhbF9yZXBldGl0aW9uMDogNTUsIHBhcnRpYWxfb3B0aW9uMDogNTYsIHBhcmFtOiA1Nywgc2V4cHI6IDU4LCBPUEVOX1NFWFBSOiA1OSwgc2V4cHJfcmVwZXRpdGlvbjA6IDYwLCBzZXhwcl9vcHRpb24wOiA2MSwgQ0xPU0VfU0VYUFI6IDYyLCBoYXNoOiA2MywgaGFzaF9yZXBldGl0aW9uX3BsdXMwOiA2NCwgaGFzaFNlZ21lbnQ6IDY1LCBJRDogNjYsIEVRVUFMUzogNjcsIGJsb2NrUGFyYW1zOiA2OCwgT1BFTl9CTE9DS19QQVJBTVM6IDY5LCBibG9ja1BhcmFtc19yZXBldGl0aW9uX3BsdXMwOiA3MCwgQ0xPU0VfQkxPQ0tfUEFSQU1TOiA3MSwgcGF0aDogNzIsIGRhdGFOYW1lOiA3MywgU1RSSU5HOiA3NCwgTlVNQkVSOiA3NSwgQk9PTEVBTjogNzYsIFVOREVGSU5FRDogNzcsIE5VTEw6IDc4LCBEQVRBOiA3OSwgcGF0aFNlZ21lbnRzOiA4MCwgU0VQOiA4MSwgJGFjY2VwdDogMCwgJGVuZDogMSB9LFxuICAgICAgICB0ZXJtaW5hbHNfOiB7IDI6IFwiZXJyb3JcIiwgNTogXCJFT0ZcIiwgMTM6IFwiQ09NTUVOVFwiLCAxNDogXCJDT05URU5UXCIsIDE2OiBcIkVORF9SQVdfQkxPQ0tcIiwgMTc6IFwiT1BFTl9SQVdfQkxPQ0tcIiwgMjE6IFwiQ0xPU0VfUkFXX0JMT0NLXCIsIDI3OiBcIk9QRU5fQkxPQ0tcIiwgMzE6IFwiQ0xPU0VcIiwgMzI6IFwiT1BFTl9JTlZFUlNFXCIsIDM3OiBcIk9QRU5fSU5WRVJTRV9DSEFJTlwiLCA0MjogXCJJTlZFUlNFXCIsIDQ1OiBcIk9QRU5fRU5EQkxPQ0tcIiwgNDY6IFwiT1BFTlwiLCA0OTogXCJPUEVOX1VORVNDQVBFRFwiLCA1MjogXCJDTE9TRV9VTkVTQ0FQRURcIiwgNTM6IFwiT1BFTl9QQVJUSUFMXCIsIDU5OiBcIk9QRU5fU0VYUFJcIiwgNjI6IFwiQ0xPU0VfU0VYUFJcIiwgNjY6IFwiSURcIiwgNjc6IFwiRVFVQUxTXCIsIDY5OiBcIk9QRU5fQkxPQ0tfUEFSQU1TXCIsIDcxOiBcIkNMT1NFX0JMT0NLX1BBUkFNU1wiLCA3NDogXCJTVFJJTkdcIiwgNzU6IFwiTlVNQkVSXCIsIDc2OiBcIkJPT0xFQU5cIiwgNzc6IFwiVU5ERUZJTkVEXCIsIDc4OiBcIk5VTExcIiwgNzk6IFwiREFUQVwiLCA4MTogXCJTRVBcIiB9LFxuICAgICAgICBwcm9kdWN0aW9uc186IFswLCBbMywgMl0sIFs0LCAxXSwgWzcsIDFdLCBbNywgMV0sIFs3LCAxXSwgWzcsIDFdLCBbNywgMV0sIFs3LCAxXSwgWzEyLCAxXSwgWzEwLCAzXSwgWzE1LCA1XSwgWzksIDRdLCBbOSwgNF0sIFsyMiwgNl0sIFsyNSwgNl0sIFszNiwgNl0sIFs0MSwgMl0sIFs0MywgM10sIFs0MywgMV0sIFsyNCwgM10sIFs4LCA1XSwgWzgsIDVdLCBbMTEsIDVdLCBbNTcsIDFdLCBbNTcsIDFdLCBbNTgsIDVdLCBbNjMsIDFdLCBbNjUsIDNdLCBbNjgsIDNdLCBbMTgsIDFdLCBbMTgsIDFdLCBbMTgsIDFdLCBbMTgsIDFdLCBbMTgsIDFdLCBbMTgsIDFdLCBbMTgsIDFdLCBbNTQsIDFdLCBbNTQsIDFdLCBbNzMsIDJdLCBbNzIsIDFdLCBbODAsIDNdLCBbODAsIDFdLCBbNiwgMF0sIFs2LCAyXSwgWzE5LCAwXSwgWzE5LCAyXSwgWzIwLCAwXSwgWzIwLCAxXSwgWzIzLCAwXSwgWzIzLCAxXSwgWzI2LCAwXSwgWzI2LCAxXSwgWzI4LCAwXSwgWzI4LCAyXSwgWzI5LCAwXSwgWzI5LCAxXSwgWzMwLCAwXSwgWzMwLCAxXSwgWzMzLCAwXSwgWzMzLCAyXSwgWzM0LCAwXSwgWzM0LCAxXSwgWzM1LCAwXSwgWzM1LCAxXSwgWzM4LCAwXSwgWzM4LCAyXSwgWzM5LCAwXSwgWzM5LCAxXSwgWzQwLCAwXSwgWzQwLCAxXSwgWzQ0LCAwXSwgWzQ0LCAxXSwgWzQ3LCAwXSwgWzQ3LCAyXSwgWzQ4LCAwXSwgWzQ4LCAxXSwgWzUwLCAwXSwgWzUwLCAyXSwgWzUxLCAwXSwgWzUxLCAxXSwgWzU1LCAwXSwgWzU1LCAyXSwgWzU2LCAwXSwgWzU2LCAxXSwgWzYwLCAwXSwgWzYwLCAyXSwgWzYxLCAwXSwgWzYxLCAxXSwgWzY0LCAxXSwgWzY0LCAyXSwgWzcwLCAxXSwgWzcwLCAyXV0sXG4gICAgICAgIHBlcmZvcm1BY3Rpb246IGZ1bmN0aW9uIGFub255bW91cyh5eXRleHQsIHl5bGVuZywgeXlsaW5lbm8sIHl5LCB5eXN0YXRlLCAkJCwgXyQpIHtcblxuICAgICAgICAgICAgdmFyICQwID0gJCQubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIHN3aXRjaCAoeXlzdGF0ZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICQkWyQwIC0gMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5LlByb2dyYW0oJCRbJDBdLCBudWxsLCB7fSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gJCRbJDBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSAkJFskMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gJCRbJDBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBuZXcgeXkuQ29tbWVudFN0YXRlbWVudCh5eS5zdHJpcENvbW1lbnQoJCRbJDBdKSwgeXkuc3RyaXBGbGFncygkJFskMF0sICQkWyQwXSksIHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IG5ldyB5eS5Db250ZW50U3RhdGVtZW50KCQkWyQwXSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IHl5LnByZXBhcmVSYXdCbG9jaygkJFskMCAtIDJdLCAkJFskMCAtIDFdLCAkJFskMF0sIHRoaXMuXyQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDExOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB7IHBhdGg6ICQkWyQwIC0gM10sIHBhcmFtczogJCRbJDAgLSAyXSwgaGFzaDogJCRbJDAgLSAxXSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB5eS5wcmVwYXJlQmxvY2soJCRbJDAgLSAzXSwgJCRbJDAgLSAyXSwgJCRbJDAgLSAxXSwgJCRbJDBdLCBmYWxzZSwgdGhpcy5fJCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IHl5LnByZXBhcmVCbG9jaygkJFskMCAtIDNdLCAkJFskMCAtIDJdLCAkJFskMCAtIDFdLCAkJFskMF0sIHRydWUsIHRoaXMuXyQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE0OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB7IHBhdGg6ICQkWyQwIC0gNF0sIHBhcmFtczogJCRbJDAgLSAzXSwgaGFzaDogJCRbJDAgLSAyXSwgYmxvY2tQYXJhbXM6ICQkWyQwIC0gMV0sIHN0cmlwOiB5eS5zdHJpcEZsYWdzKCQkWyQwIC0gNV0sICQkWyQwXSkgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxNTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geyBwYXRoOiAkJFskMCAtIDRdLCBwYXJhbXM6ICQkWyQwIC0gM10sIGhhc2g6ICQkWyQwIC0gMl0sIGJsb2NrUGFyYW1zOiAkJFskMCAtIDFdLCBzdHJpcDogeXkuc3RyaXBGbGFncygkJFskMCAtIDVdLCAkJFskMF0pIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTY6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IHsgcGF0aDogJCRbJDAgLSA0XSwgcGFyYW1zOiAkJFskMCAtIDNdLCBoYXNoOiAkJFskMCAtIDJdLCBibG9ja1BhcmFtczogJCRbJDAgLSAxXSwgc3RyaXA6IHl5LnN0cmlwRmxhZ3MoJCRbJDAgLSA1XSwgJCRbJDBdKSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE3OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB7IHN0cmlwOiB5eS5zdHJpcEZsYWdzKCQkWyQwIC0gMV0sICQkWyQwIC0gMV0pLCBwcm9ncmFtOiAkJFskMF0gfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxODpcbiAgICAgICAgICAgICAgICAgICAgdmFyIGludmVyc2UgPSB5eS5wcmVwYXJlQmxvY2soJCRbJDAgLSAyXSwgJCRbJDAgLSAxXSwgJCRbJDBdLCAkJFskMF0sIGZhbHNlLCB0aGlzLl8kKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW0gPSBuZXcgeXkuUHJvZ3JhbShbaW52ZXJzZV0sIG51bGwsIHt9LCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbS5jaGFpbmVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB7IHN0cmlwOiAkJFskMCAtIDJdLnN0cmlwLCBwcm9ncmFtOiBwcm9ncmFtLCBjaGFpbjogdHJ1ZSB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTk6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyMDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geyBwYXRoOiAkJFskMCAtIDFdLCBzdHJpcDogeXkuc3RyaXBGbGFncygkJFskMCAtIDJdLCAkJFskMF0pIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IHl5LnByZXBhcmVNdXN0YWNoZSgkJFskMCAtIDNdLCAkJFskMCAtIDJdLCAkJFskMCAtIDFdLCAkJFskMCAtIDRdLCB5eS5zdHJpcEZsYWdzKCQkWyQwIC0gNF0sICQkWyQwXSksIHRoaXMuXyQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDIyOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB5eS5wcmVwYXJlTXVzdGFjaGUoJCRbJDAgLSAzXSwgJCRbJDAgLSAyXSwgJCRbJDAgLSAxXSwgJCRbJDAgLSA0XSwgeXkuc3RyaXBGbGFncygkJFskMCAtIDRdLCAkJFskMF0pLCB0aGlzLl8kKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyMzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5LlBhcnRpYWxTdGF0ZW1lbnQoJCRbJDAgLSAzXSwgJCRbJDAgLSAyXSwgJCRbJDAgLSAxXSwgeXkuc3RyaXBGbGFncygkJFskMCAtIDRdLCAkJFskMF0pLCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyNDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gJCRbJDBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI1OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSAkJFskMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjY6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IG5ldyB5eS5TdWJFeHByZXNzaW9uKCQkWyQwIC0gM10sICQkWyQwIC0gMl0sICQkWyQwIC0gMV0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI3OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBuZXcgeXkuSGFzaCgkJFskMF0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI4OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBuZXcgeXkuSGFzaFBhaXIoeXkuaWQoJCRbJDAgLSAyXSksICQkWyQwXSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjk6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IHl5LmlkKCQkWyQwIC0gMV0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDMwOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSAkJFskMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzE6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzMjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5LlN0cmluZ0xpdGVyYWwoJCRbJDBdLCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzMzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5Lk51bWJlckxpdGVyYWwoJCRbJDBdLCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzNDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5LkJvb2xlYW5MaXRlcmFsKCQkWyQwXSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzU6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IG5ldyB5eS5VbmRlZmluZWRMaXRlcmFsKHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM2OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBuZXcgeXkuTnVsbExpdGVyYWwoeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzc6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gJCRbJDBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM5OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB5eS5wcmVwYXJlUGF0aCh0cnVlLCAkJFskMF0sIHRoaXMuXyQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQwOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB5eS5wcmVwYXJlUGF0aChmYWxzZSwgJCRbJDBdLCB0aGlzLl8kKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0MTpcbiAgICAgICAgICAgICAgICAgICAgJCRbJDAgLSAyXS5wdXNoKHsgcGFydDogeXkuaWQoJCRbJDBdKSwgb3JpZ2luYWw6ICQkWyQwXSwgc2VwYXJhdG9yOiAkJFskMCAtIDFdIH0pO3RoaXMuJCA9ICQkWyQwIC0gMl07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDI6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFt7IHBhcnQ6IHl5LmlkKCQkWyQwXSksIG9yaWdpbmFsOiAkJFskMF0gfV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ0OlxuICAgICAgICAgICAgICAgICAgICAkJFskMCAtIDFdLnB1c2goJCRbJDBdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0NTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gW107XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDY6XG4gICAgICAgICAgICAgICAgICAgICQkWyQwIC0gMV0ucHVzaCgkJFskMF0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDUzOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA1NDpcbiAgICAgICAgICAgICAgICAgICAgJCRbJDAgLSAxXS5wdXNoKCQkWyQwXSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNTk6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDYwOlxuICAgICAgICAgICAgICAgICAgICAkJFskMCAtIDFdLnB1c2goJCRbJDBdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA2NTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gW107XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNjY6XG4gICAgICAgICAgICAgICAgICAgICQkWyQwIC0gMV0ucHVzaCgkJFskMF0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDczOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA3NDpcbiAgICAgICAgICAgICAgICAgICAgJCRbJDAgLSAxXS5wdXNoKCQkWyQwXSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNzc6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDc4OlxuICAgICAgICAgICAgICAgICAgICAkJFskMCAtIDFdLnB1c2goJCRbJDBdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA4MTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gW107XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODI6XG4gICAgICAgICAgICAgICAgICAgICQkWyQwIC0gMV0ucHVzaCgkJFskMF0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDg1OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA4NjpcbiAgICAgICAgICAgICAgICAgICAgJCRbJDAgLSAxXS5wdXNoKCQkWyQwXSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODk6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFskJFskMF1dO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDkwOlxuICAgICAgICAgICAgICAgICAgICAkJFskMCAtIDFdLnB1c2goJCRbJDBdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA5MTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gWyQkWyQwXV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgOTI6XG4gICAgICAgICAgICAgICAgICAgICQkWyQwIC0gMV0ucHVzaCgkJFskMF0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFibGU6IFt7IDM6IDEsIDQ6IDIsIDU6IFsyLCA0M10sIDY6IDMsIDEzOiBbMiwgNDNdLCAxNDogWzIsIDQzXSwgMTc6IFsyLCA0M10sIDI3OiBbMiwgNDNdLCAzMjogWzIsIDQzXSwgNDY6IFsyLCA0M10sIDQ5OiBbMiwgNDNdLCA1MzogWzIsIDQzXSB9LCB7IDE6IFszXSB9LCB7IDU6IFsxLCA0XSB9LCB7IDU6IFsyLCAyXSwgNzogNSwgODogNiwgOTogNywgMTA6IDgsIDExOiA5LCAxMjogMTAsIDEzOiBbMSwgMTFdLCAxNDogWzEsIDE4XSwgMTU6IDE2LCAxNzogWzEsIDIxXSwgMjI6IDE0LCAyNTogMTUsIDI3OiBbMSwgMTldLCAzMjogWzEsIDIwXSwgMzc6IFsyLCAyXSwgNDI6IFsyLCAyXSwgNDU6IFsyLCAyXSwgNDY6IFsxLCAxMl0sIDQ5OiBbMSwgMTNdLCA1MzogWzEsIDE3XSB9LCB7IDE6IFsyLCAxXSB9LCB7IDU6IFsyLCA0NF0sIDEzOiBbMiwgNDRdLCAxNDogWzIsIDQ0XSwgMTc6IFsyLCA0NF0sIDI3OiBbMiwgNDRdLCAzMjogWzIsIDQ0XSwgMzc6IFsyLCA0NF0sIDQyOiBbMiwgNDRdLCA0NTogWzIsIDQ0XSwgNDY6IFsyLCA0NF0sIDQ5OiBbMiwgNDRdLCA1MzogWzIsIDQ0XSB9LCB7IDU6IFsyLCAzXSwgMTM6IFsyLCAzXSwgMTQ6IFsyLCAzXSwgMTc6IFsyLCAzXSwgMjc6IFsyLCAzXSwgMzI6IFsyLCAzXSwgMzc6IFsyLCAzXSwgNDI6IFsyLCAzXSwgNDU6IFsyLCAzXSwgNDY6IFsyLCAzXSwgNDk6IFsyLCAzXSwgNTM6IFsyLCAzXSB9LCB7IDU6IFsyLCA0XSwgMTM6IFsyLCA0XSwgMTQ6IFsyLCA0XSwgMTc6IFsyLCA0XSwgMjc6IFsyLCA0XSwgMzI6IFsyLCA0XSwgMzc6IFsyLCA0XSwgNDI6IFsyLCA0XSwgNDU6IFsyLCA0XSwgNDY6IFsyLCA0XSwgNDk6IFsyLCA0XSwgNTM6IFsyLCA0XSB9LCB7IDU6IFsyLCA1XSwgMTM6IFsyLCA1XSwgMTQ6IFsyLCA1XSwgMTc6IFsyLCA1XSwgMjc6IFsyLCA1XSwgMzI6IFsyLCA1XSwgMzc6IFsyLCA1XSwgNDI6IFsyLCA1XSwgNDU6IFsyLCA1XSwgNDY6IFsyLCA1XSwgNDk6IFsyLCA1XSwgNTM6IFsyLCA1XSB9LCB7IDU6IFsyLCA2XSwgMTM6IFsyLCA2XSwgMTQ6IFsyLCA2XSwgMTc6IFsyLCA2XSwgMjc6IFsyLCA2XSwgMzI6IFsyLCA2XSwgMzc6IFsyLCA2XSwgNDI6IFsyLCA2XSwgNDU6IFsyLCA2XSwgNDY6IFsyLCA2XSwgNDk6IFsyLCA2XSwgNTM6IFsyLCA2XSB9LCB7IDU6IFsyLCA3XSwgMTM6IFsyLCA3XSwgMTQ6IFsyLCA3XSwgMTc6IFsyLCA3XSwgMjc6IFsyLCA3XSwgMzI6IFsyLCA3XSwgMzc6IFsyLCA3XSwgNDI6IFsyLCA3XSwgNDU6IFsyLCA3XSwgNDY6IFsyLCA3XSwgNDk6IFsyLCA3XSwgNTM6IFsyLCA3XSB9LCB7IDU6IFsyLCA4XSwgMTM6IFsyLCA4XSwgMTQ6IFsyLCA4XSwgMTc6IFsyLCA4XSwgMjc6IFsyLCA4XSwgMzI6IFsyLCA4XSwgMzc6IFsyLCA4XSwgNDI6IFsyLCA4XSwgNDU6IFsyLCA4XSwgNDY6IFsyLCA4XSwgNDk6IFsyLCA4XSwgNTM6IFsyLCA4XSB9LCB7IDE4OiAyMiwgNjY6IFsxLCAzMl0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyAxODogMzMsIDY2OiBbMSwgMzJdLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgNDogMzQsIDY6IDMsIDEzOiBbMiwgNDNdLCAxNDogWzIsIDQzXSwgMTc6IFsyLCA0M10sIDI3OiBbMiwgNDNdLCAzMjogWzIsIDQzXSwgMzc6IFsyLCA0M10sIDQyOiBbMiwgNDNdLCA0NTogWzIsIDQzXSwgNDY6IFsyLCA0M10sIDQ5OiBbMiwgNDNdLCA1MzogWzIsIDQzXSB9LCB7IDQ6IDM1LCA2OiAzLCAxMzogWzIsIDQzXSwgMTQ6IFsyLCA0M10sIDE3OiBbMiwgNDNdLCAyNzogWzIsIDQzXSwgMzI6IFsyLCA0M10sIDQyOiBbMiwgNDNdLCA0NTogWzIsIDQzXSwgNDY6IFsyLCA0M10sIDQ5OiBbMiwgNDNdLCA1MzogWzIsIDQzXSB9LCB7IDEyOiAzNiwgMTQ6IFsxLCAxOF0gfSwgeyAxODogMzgsIDU0OiAzNywgNTg6IDM5LCA1OTogWzEsIDQwXSwgNjY6IFsxLCAzMl0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyA1OiBbMiwgOV0sIDEzOiBbMiwgOV0sIDE0OiBbMiwgOV0sIDE2OiBbMiwgOV0sIDE3OiBbMiwgOV0sIDI3OiBbMiwgOV0sIDMyOiBbMiwgOV0sIDM3OiBbMiwgOV0sIDQyOiBbMiwgOV0sIDQ1OiBbMiwgOV0sIDQ2OiBbMiwgOV0sIDQ5OiBbMiwgOV0sIDUzOiBbMiwgOV0gfSwgeyAxODogNDEsIDY2OiBbMSwgMzJdLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgMTg6IDQyLCA2NjogWzEsIDMyXSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDE4OiA0MywgNjY6IFsxLCAzMl0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyAzMTogWzIsIDczXSwgNDc6IDQ0LCA1OTogWzIsIDczXSwgNjY6IFsyLCA3M10sIDc0OiBbMiwgNzNdLCA3NTogWzIsIDczXSwgNzY6IFsyLCA3M10sIDc3OiBbMiwgNzNdLCA3ODogWzIsIDczXSwgNzk6IFsyLCA3M10gfSwgeyAyMTogWzIsIDMwXSwgMzE6IFsyLCAzMF0sIDUyOiBbMiwgMzBdLCA1OTogWzIsIDMwXSwgNjI6IFsyLCAzMF0sIDY2OiBbMiwgMzBdLCA2OTogWzIsIDMwXSwgNzQ6IFsyLCAzMF0sIDc1OiBbMiwgMzBdLCA3NjogWzIsIDMwXSwgNzc6IFsyLCAzMF0sIDc4OiBbMiwgMzBdLCA3OTogWzIsIDMwXSB9LCB7IDIxOiBbMiwgMzFdLCAzMTogWzIsIDMxXSwgNTI6IFsyLCAzMV0sIDU5OiBbMiwgMzFdLCA2MjogWzIsIDMxXSwgNjY6IFsyLCAzMV0sIDY5OiBbMiwgMzFdLCA3NDogWzIsIDMxXSwgNzU6IFsyLCAzMV0sIDc2OiBbMiwgMzFdLCA3NzogWzIsIDMxXSwgNzg6IFsyLCAzMV0sIDc5OiBbMiwgMzFdIH0sIHsgMjE6IFsyLCAzMl0sIDMxOiBbMiwgMzJdLCA1MjogWzIsIDMyXSwgNTk6IFsyLCAzMl0sIDYyOiBbMiwgMzJdLCA2NjogWzIsIDMyXSwgNjk6IFsyLCAzMl0sIDc0OiBbMiwgMzJdLCA3NTogWzIsIDMyXSwgNzY6IFsyLCAzMl0sIDc3OiBbMiwgMzJdLCA3ODogWzIsIDMyXSwgNzk6IFsyLCAzMl0gfSwgeyAyMTogWzIsIDMzXSwgMzE6IFsyLCAzM10sIDUyOiBbMiwgMzNdLCA1OTogWzIsIDMzXSwgNjI6IFsyLCAzM10sIDY2OiBbMiwgMzNdLCA2OTogWzIsIDMzXSwgNzQ6IFsyLCAzM10sIDc1OiBbMiwgMzNdLCA3NjogWzIsIDMzXSwgNzc6IFsyLCAzM10sIDc4OiBbMiwgMzNdLCA3OTogWzIsIDMzXSB9LCB7IDIxOiBbMiwgMzRdLCAzMTogWzIsIDM0XSwgNTI6IFsyLCAzNF0sIDU5OiBbMiwgMzRdLCA2MjogWzIsIDM0XSwgNjY6IFsyLCAzNF0sIDY5OiBbMiwgMzRdLCA3NDogWzIsIDM0XSwgNzU6IFsyLCAzNF0sIDc2OiBbMiwgMzRdLCA3NzogWzIsIDM0XSwgNzg6IFsyLCAzNF0sIDc5OiBbMiwgMzRdIH0sIHsgMjE6IFsyLCAzNV0sIDMxOiBbMiwgMzVdLCA1MjogWzIsIDM1XSwgNTk6IFsyLCAzNV0sIDYyOiBbMiwgMzVdLCA2NjogWzIsIDM1XSwgNjk6IFsyLCAzNV0sIDc0OiBbMiwgMzVdLCA3NTogWzIsIDM1XSwgNzY6IFsyLCAzNV0sIDc3OiBbMiwgMzVdLCA3ODogWzIsIDM1XSwgNzk6IFsyLCAzNV0gfSwgeyAyMTogWzIsIDM2XSwgMzE6IFsyLCAzNl0sIDUyOiBbMiwgMzZdLCA1OTogWzIsIDM2XSwgNjI6IFsyLCAzNl0sIDY2OiBbMiwgMzZdLCA2OTogWzIsIDM2XSwgNzQ6IFsyLCAzNl0sIDc1OiBbMiwgMzZdLCA3NjogWzIsIDM2XSwgNzc6IFsyLCAzNl0sIDc4OiBbMiwgMzZdLCA3OTogWzIsIDM2XSB9LCB7IDIxOiBbMiwgNDBdLCAzMTogWzIsIDQwXSwgNTI6IFsyLCA0MF0sIDU5OiBbMiwgNDBdLCA2MjogWzIsIDQwXSwgNjY6IFsyLCA0MF0sIDY5OiBbMiwgNDBdLCA3NDogWzIsIDQwXSwgNzU6IFsyLCA0MF0sIDc2OiBbMiwgNDBdLCA3NzogWzIsIDQwXSwgNzg6IFsyLCA0MF0sIDc5OiBbMiwgNDBdLCA4MTogWzEsIDQ1XSB9LCB7IDY2OiBbMSwgMzJdLCA4MDogNDYgfSwgeyAyMTogWzIsIDQyXSwgMzE6IFsyLCA0Ml0sIDUyOiBbMiwgNDJdLCA1OTogWzIsIDQyXSwgNjI6IFsyLCA0Ml0sIDY2OiBbMiwgNDJdLCA2OTogWzIsIDQyXSwgNzQ6IFsyLCA0Ml0sIDc1OiBbMiwgNDJdLCA3NjogWzIsIDQyXSwgNzc6IFsyLCA0Ml0sIDc4OiBbMiwgNDJdLCA3OTogWzIsIDQyXSwgODE6IFsyLCA0Ml0gfSwgeyA1MDogNDcsIDUyOiBbMiwgNzddLCA1OTogWzIsIDc3XSwgNjY6IFsyLCA3N10sIDc0OiBbMiwgNzddLCA3NTogWzIsIDc3XSwgNzY6IFsyLCA3N10sIDc3OiBbMiwgNzddLCA3ODogWzIsIDc3XSwgNzk6IFsyLCA3N10gfSwgeyAyMzogNDgsIDM2OiA1MCwgMzc6IFsxLCA1Ml0sIDQxOiA1MSwgNDI6IFsxLCA1M10sIDQzOiA0OSwgNDU6IFsyLCA0OV0gfSwgeyAyNjogNTQsIDQxOiA1NSwgNDI6IFsxLCA1M10sIDQ1OiBbMiwgNTFdIH0sIHsgMTY6IFsxLCA1Nl0gfSwgeyAzMTogWzIsIDgxXSwgNTU6IDU3LCA1OTogWzIsIDgxXSwgNjY6IFsyLCA4MV0sIDc0OiBbMiwgODFdLCA3NTogWzIsIDgxXSwgNzY6IFsyLCA4MV0sIDc3OiBbMiwgODFdLCA3ODogWzIsIDgxXSwgNzk6IFsyLCA4MV0gfSwgeyAzMTogWzIsIDM3XSwgNTk6IFsyLCAzN10sIDY2OiBbMiwgMzddLCA3NDogWzIsIDM3XSwgNzU6IFsyLCAzN10sIDc2OiBbMiwgMzddLCA3NzogWzIsIDM3XSwgNzg6IFsyLCAzN10sIDc5OiBbMiwgMzddIH0sIHsgMzE6IFsyLCAzOF0sIDU5OiBbMiwgMzhdLCA2NjogWzIsIDM4XSwgNzQ6IFsyLCAzOF0sIDc1OiBbMiwgMzhdLCA3NjogWzIsIDM4XSwgNzc6IFsyLCAzOF0sIDc4OiBbMiwgMzhdLCA3OTogWzIsIDM4XSB9LCB7IDE4OiA1OCwgNjY6IFsxLCAzMl0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyAyODogNTksIDMxOiBbMiwgNTNdLCA1OTogWzIsIDUzXSwgNjY6IFsyLCA1M10sIDY5OiBbMiwgNTNdLCA3NDogWzIsIDUzXSwgNzU6IFsyLCA1M10sIDc2OiBbMiwgNTNdLCA3NzogWzIsIDUzXSwgNzg6IFsyLCA1M10sIDc5OiBbMiwgNTNdIH0sIHsgMzE6IFsyLCA1OV0sIDMzOiA2MCwgNTk6IFsyLCA1OV0sIDY2OiBbMiwgNTldLCA2OTogWzIsIDU5XSwgNzQ6IFsyLCA1OV0sIDc1OiBbMiwgNTldLCA3NjogWzIsIDU5XSwgNzc6IFsyLCA1OV0sIDc4OiBbMiwgNTldLCA3OTogWzIsIDU5XSB9LCB7IDE5OiA2MSwgMjE6IFsyLCA0NV0sIDU5OiBbMiwgNDVdLCA2NjogWzIsIDQ1XSwgNzQ6IFsyLCA0NV0sIDc1OiBbMiwgNDVdLCA3NjogWzIsIDQ1XSwgNzc6IFsyLCA0NV0sIDc4OiBbMiwgNDVdLCA3OTogWzIsIDQ1XSB9LCB7IDE4OiA2NSwgMzE6IFsyLCA3NV0sIDQ4OiA2MiwgNTc6IDYzLCA1ODogNjYsIDU5OiBbMSwgNDBdLCA2MzogNjQsIDY0OiA2NywgNjU6IDY4LCA2NjogWzEsIDY5XSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDY2OiBbMSwgNzBdIH0sIHsgMjE6IFsyLCAzOV0sIDMxOiBbMiwgMzldLCA1MjogWzIsIDM5XSwgNTk6IFsyLCAzOV0sIDYyOiBbMiwgMzldLCA2NjogWzIsIDM5XSwgNjk6IFsyLCAzOV0sIDc0OiBbMiwgMzldLCA3NTogWzIsIDM5XSwgNzY6IFsyLCAzOV0sIDc3OiBbMiwgMzldLCA3ODogWzIsIDM5XSwgNzk6IFsyLCAzOV0sIDgxOiBbMSwgNDVdIH0sIHsgMTg6IDY1LCA1MTogNzEsIDUyOiBbMiwgNzldLCA1NzogNzIsIDU4OiA2NiwgNTk6IFsxLCA0MF0sIDYzOiA3MywgNjQ6IDY3LCA2NTogNjgsIDY2OiBbMSwgNjldLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgMjQ6IDc0LCA0NTogWzEsIDc1XSB9LCB7IDQ1OiBbMiwgNTBdIH0sIHsgNDogNzYsIDY6IDMsIDEzOiBbMiwgNDNdLCAxNDogWzIsIDQzXSwgMTc6IFsyLCA0M10sIDI3OiBbMiwgNDNdLCAzMjogWzIsIDQzXSwgMzc6IFsyLCA0M10sIDQyOiBbMiwgNDNdLCA0NTogWzIsIDQzXSwgNDY6IFsyLCA0M10sIDQ5OiBbMiwgNDNdLCA1MzogWzIsIDQzXSB9LCB7IDQ1OiBbMiwgMTldIH0sIHsgMTg6IDc3LCA2NjogWzEsIDMyXSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDQ6IDc4LCA2OiAzLCAxMzogWzIsIDQzXSwgMTQ6IFsyLCA0M10sIDE3OiBbMiwgNDNdLCAyNzogWzIsIDQzXSwgMzI6IFsyLCA0M10sIDQ1OiBbMiwgNDNdLCA0NjogWzIsIDQzXSwgNDk6IFsyLCA0M10sIDUzOiBbMiwgNDNdIH0sIHsgMjQ6IDc5LCA0NTogWzEsIDc1XSB9LCB7IDQ1OiBbMiwgNTJdIH0sIHsgNTogWzIsIDEwXSwgMTM6IFsyLCAxMF0sIDE0OiBbMiwgMTBdLCAxNzogWzIsIDEwXSwgMjc6IFsyLCAxMF0sIDMyOiBbMiwgMTBdLCAzNzogWzIsIDEwXSwgNDI6IFsyLCAxMF0sIDQ1OiBbMiwgMTBdLCA0NjogWzIsIDEwXSwgNDk6IFsyLCAxMF0sIDUzOiBbMiwgMTBdIH0sIHsgMTg6IDY1LCAzMTogWzIsIDgzXSwgNTY6IDgwLCA1NzogODEsIDU4OiA2NiwgNTk6IFsxLCA0MF0sIDYzOiA4MiwgNjQ6IDY3LCA2NTogNjgsIDY2OiBbMSwgNjldLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgNTk6IFsyLCA4NV0sIDYwOiA4MywgNjI6IFsyLCA4NV0sIDY2OiBbMiwgODVdLCA3NDogWzIsIDg1XSwgNzU6IFsyLCA4NV0sIDc2OiBbMiwgODVdLCA3NzogWzIsIDg1XSwgNzg6IFsyLCA4NV0sIDc5OiBbMiwgODVdIH0sIHsgMTg6IDY1LCAyOTogODQsIDMxOiBbMiwgNTVdLCA1NzogODUsIDU4OiA2NiwgNTk6IFsxLCA0MF0sIDYzOiA4NiwgNjQ6IDY3LCA2NTogNjgsIDY2OiBbMSwgNjldLCA2OTogWzIsIDU1XSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDE4OiA2NSwgMzE6IFsyLCA2MV0sIDM0OiA4NywgNTc6IDg4LCA1ODogNjYsIDU5OiBbMSwgNDBdLCA2MzogODksIDY0OiA2NywgNjU6IDY4LCA2NjogWzEsIDY5XSwgNjk6IFsyLCA2MV0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyAxODogNjUsIDIwOiA5MCwgMjE6IFsyLCA0N10sIDU3OiA5MSwgNTg6IDY2LCA1OTogWzEsIDQwXSwgNjM6IDkyLCA2NDogNjcsIDY1OiA2OCwgNjY6IFsxLCA2OV0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyAzMTogWzEsIDkzXSB9LCB7IDMxOiBbMiwgNzRdLCA1OTogWzIsIDc0XSwgNjY6IFsyLCA3NF0sIDc0OiBbMiwgNzRdLCA3NTogWzIsIDc0XSwgNzY6IFsyLCA3NF0sIDc3OiBbMiwgNzRdLCA3ODogWzIsIDc0XSwgNzk6IFsyLCA3NF0gfSwgeyAzMTogWzIsIDc2XSB9LCB7IDIxOiBbMiwgMjRdLCAzMTogWzIsIDI0XSwgNTI6IFsyLCAyNF0sIDU5OiBbMiwgMjRdLCA2MjogWzIsIDI0XSwgNjY6IFsyLCAyNF0sIDY5OiBbMiwgMjRdLCA3NDogWzIsIDI0XSwgNzU6IFsyLCAyNF0sIDc2OiBbMiwgMjRdLCA3NzogWzIsIDI0XSwgNzg6IFsyLCAyNF0sIDc5OiBbMiwgMjRdIH0sIHsgMjE6IFsyLCAyNV0sIDMxOiBbMiwgMjVdLCA1MjogWzIsIDI1XSwgNTk6IFsyLCAyNV0sIDYyOiBbMiwgMjVdLCA2NjogWzIsIDI1XSwgNjk6IFsyLCAyNV0sIDc0OiBbMiwgMjVdLCA3NTogWzIsIDI1XSwgNzY6IFsyLCAyNV0sIDc3OiBbMiwgMjVdLCA3ODogWzIsIDI1XSwgNzk6IFsyLCAyNV0gfSwgeyAyMTogWzIsIDI3XSwgMzE6IFsyLCAyN10sIDUyOiBbMiwgMjddLCA2MjogWzIsIDI3XSwgNjU6IDk0LCA2NjogWzEsIDk1XSwgNjk6IFsyLCAyN10gfSwgeyAyMTogWzIsIDg5XSwgMzE6IFsyLCA4OV0sIDUyOiBbMiwgODldLCA2MjogWzIsIDg5XSwgNjY6IFsyLCA4OV0sIDY5OiBbMiwgODldIH0sIHsgMjE6IFsyLCA0Ml0sIDMxOiBbMiwgNDJdLCA1MjogWzIsIDQyXSwgNTk6IFsyLCA0Ml0sIDYyOiBbMiwgNDJdLCA2NjogWzIsIDQyXSwgNjc6IFsxLCA5Nl0sIDY5OiBbMiwgNDJdLCA3NDogWzIsIDQyXSwgNzU6IFsyLCA0Ml0sIDc2OiBbMiwgNDJdLCA3NzogWzIsIDQyXSwgNzg6IFsyLCA0Ml0sIDc5OiBbMiwgNDJdLCA4MTogWzIsIDQyXSB9LCB7IDIxOiBbMiwgNDFdLCAzMTogWzIsIDQxXSwgNTI6IFsyLCA0MV0sIDU5OiBbMiwgNDFdLCA2MjogWzIsIDQxXSwgNjY6IFsyLCA0MV0sIDY5OiBbMiwgNDFdLCA3NDogWzIsIDQxXSwgNzU6IFsyLCA0MV0sIDc2OiBbMiwgNDFdLCA3NzogWzIsIDQxXSwgNzg6IFsyLCA0MV0sIDc5OiBbMiwgNDFdLCA4MTogWzIsIDQxXSB9LCB7IDUyOiBbMSwgOTddIH0sIHsgNTI6IFsyLCA3OF0sIDU5OiBbMiwgNzhdLCA2NjogWzIsIDc4XSwgNzQ6IFsyLCA3OF0sIDc1OiBbMiwgNzhdLCA3NjogWzIsIDc4XSwgNzc6IFsyLCA3OF0sIDc4OiBbMiwgNzhdLCA3OTogWzIsIDc4XSB9LCB7IDUyOiBbMiwgODBdIH0sIHsgNTogWzIsIDEyXSwgMTM6IFsyLCAxMl0sIDE0OiBbMiwgMTJdLCAxNzogWzIsIDEyXSwgMjc6IFsyLCAxMl0sIDMyOiBbMiwgMTJdLCAzNzogWzIsIDEyXSwgNDI6IFsyLCAxMl0sIDQ1OiBbMiwgMTJdLCA0NjogWzIsIDEyXSwgNDk6IFsyLCAxMl0sIDUzOiBbMiwgMTJdIH0sIHsgMTg6IDk4LCA2NjogWzEsIDMyXSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDM2OiA1MCwgMzc6IFsxLCA1Ml0sIDQxOiA1MSwgNDI6IFsxLCA1M10sIDQzOiAxMDAsIDQ0OiA5OSwgNDU6IFsyLCA3MV0gfSwgeyAzMTogWzIsIDY1XSwgMzg6IDEwMSwgNTk6IFsyLCA2NV0sIDY2OiBbMiwgNjVdLCA2OTogWzIsIDY1XSwgNzQ6IFsyLCA2NV0sIDc1OiBbMiwgNjVdLCA3NjogWzIsIDY1XSwgNzc6IFsyLCA2NV0sIDc4OiBbMiwgNjVdLCA3OTogWzIsIDY1XSB9LCB7IDQ1OiBbMiwgMTddIH0sIHsgNTogWzIsIDEzXSwgMTM6IFsyLCAxM10sIDE0OiBbMiwgMTNdLCAxNzogWzIsIDEzXSwgMjc6IFsyLCAxM10sIDMyOiBbMiwgMTNdLCAzNzogWzIsIDEzXSwgNDI6IFsyLCAxM10sIDQ1OiBbMiwgMTNdLCA0NjogWzIsIDEzXSwgNDk6IFsyLCAxM10sIDUzOiBbMiwgMTNdIH0sIHsgMzE6IFsxLCAxMDJdIH0sIHsgMzE6IFsyLCA4Ml0sIDU5OiBbMiwgODJdLCA2NjogWzIsIDgyXSwgNzQ6IFsyLCA4Ml0sIDc1OiBbMiwgODJdLCA3NjogWzIsIDgyXSwgNzc6IFsyLCA4Ml0sIDc4OiBbMiwgODJdLCA3OTogWzIsIDgyXSB9LCB7IDMxOiBbMiwgODRdIH0sIHsgMTg6IDY1LCA1NzogMTA0LCA1ODogNjYsIDU5OiBbMSwgNDBdLCA2MTogMTAzLCA2MjogWzIsIDg3XSwgNjM6IDEwNSwgNjQ6IDY3LCA2NTogNjgsIDY2OiBbMSwgNjldLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgMzA6IDEwNiwgMzE6IFsyLCA1N10sIDY4OiAxMDcsIDY5OiBbMSwgMTA4XSB9LCB7IDMxOiBbMiwgNTRdLCA1OTogWzIsIDU0XSwgNjY6IFsyLCA1NF0sIDY5OiBbMiwgNTRdLCA3NDogWzIsIDU0XSwgNzU6IFsyLCA1NF0sIDc2OiBbMiwgNTRdLCA3NzogWzIsIDU0XSwgNzg6IFsyLCA1NF0sIDc5OiBbMiwgNTRdIH0sIHsgMzE6IFsyLCA1Nl0sIDY5OiBbMiwgNTZdIH0sIHsgMzE6IFsyLCA2M10sIDM1OiAxMDksIDY4OiAxMTAsIDY5OiBbMSwgMTA4XSB9LCB7IDMxOiBbMiwgNjBdLCA1OTogWzIsIDYwXSwgNjY6IFsyLCA2MF0sIDY5OiBbMiwgNjBdLCA3NDogWzIsIDYwXSwgNzU6IFsyLCA2MF0sIDc2OiBbMiwgNjBdLCA3NzogWzIsIDYwXSwgNzg6IFsyLCA2MF0sIDc5OiBbMiwgNjBdIH0sIHsgMzE6IFsyLCA2Ml0sIDY5OiBbMiwgNjJdIH0sIHsgMjE6IFsxLCAxMTFdIH0sIHsgMjE6IFsyLCA0Nl0sIDU5OiBbMiwgNDZdLCA2NjogWzIsIDQ2XSwgNzQ6IFsyLCA0Nl0sIDc1OiBbMiwgNDZdLCA3NjogWzIsIDQ2XSwgNzc6IFsyLCA0Nl0sIDc4OiBbMiwgNDZdLCA3OTogWzIsIDQ2XSB9LCB7IDIxOiBbMiwgNDhdIH0sIHsgNTogWzIsIDIxXSwgMTM6IFsyLCAyMV0sIDE0OiBbMiwgMjFdLCAxNzogWzIsIDIxXSwgMjc6IFsyLCAyMV0sIDMyOiBbMiwgMjFdLCAzNzogWzIsIDIxXSwgNDI6IFsyLCAyMV0sIDQ1OiBbMiwgMjFdLCA0NjogWzIsIDIxXSwgNDk6IFsyLCAyMV0sIDUzOiBbMiwgMjFdIH0sIHsgMjE6IFsyLCA5MF0sIDMxOiBbMiwgOTBdLCA1MjogWzIsIDkwXSwgNjI6IFsyLCA5MF0sIDY2OiBbMiwgOTBdLCA2OTogWzIsIDkwXSB9LCB7IDY3OiBbMSwgOTZdIH0sIHsgMTg6IDY1LCA1NzogMTEyLCA1ODogNjYsIDU5OiBbMSwgNDBdLCA2NjogWzEsIDMyXSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDU6IFsyLCAyMl0sIDEzOiBbMiwgMjJdLCAxNDogWzIsIDIyXSwgMTc6IFsyLCAyMl0sIDI3OiBbMiwgMjJdLCAzMjogWzIsIDIyXSwgMzc6IFsyLCAyMl0sIDQyOiBbMiwgMjJdLCA0NTogWzIsIDIyXSwgNDY6IFsyLCAyMl0sIDQ5OiBbMiwgMjJdLCA1MzogWzIsIDIyXSB9LCB7IDMxOiBbMSwgMTEzXSB9LCB7IDQ1OiBbMiwgMThdIH0sIHsgNDU6IFsyLCA3Ml0gfSwgeyAxODogNjUsIDMxOiBbMiwgNjddLCAzOTogMTE0LCA1NzogMTE1LCA1ODogNjYsIDU5OiBbMSwgNDBdLCA2MzogMTE2LCA2NDogNjcsIDY1OiA2OCwgNjY6IFsxLCA2OV0sIDY5OiBbMiwgNjddLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgNTogWzIsIDIzXSwgMTM6IFsyLCAyM10sIDE0OiBbMiwgMjNdLCAxNzogWzIsIDIzXSwgMjc6IFsyLCAyM10sIDMyOiBbMiwgMjNdLCAzNzogWzIsIDIzXSwgNDI6IFsyLCAyM10sIDQ1OiBbMiwgMjNdLCA0NjogWzIsIDIzXSwgNDk6IFsyLCAyM10sIDUzOiBbMiwgMjNdIH0sIHsgNjI6IFsxLCAxMTddIH0sIHsgNTk6IFsyLCA4Nl0sIDYyOiBbMiwgODZdLCA2NjogWzIsIDg2XSwgNzQ6IFsyLCA4Nl0sIDc1OiBbMiwgODZdLCA3NjogWzIsIDg2XSwgNzc6IFsyLCA4Nl0sIDc4OiBbMiwgODZdLCA3OTogWzIsIDg2XSB9LCB7IDYyOiBbMiwgODhdIH0sIHsgMzE6IFsxLCAxMThdIH0sIHsgMzE6IFsyLCA1OF0gfSwgeyA2NjogWzEsIDEyMF0sIDcwOiAxMTkgfSwgeyAzMTogWzEsIDEyMV0gfSwgeyAzMTogWzIsIDY0XSB9LCB7IDE0OiBbMiwgMTFdIH0sIHsgMjE6IFsyLCAyOF0sIDMxOiBbMiwgMjhdLCA1MjogWzIsIDI4XSwgNjI6IFsyLCAyOF0sIDY2OiBbMiwgMjhdLCA2OTogWzIsIDI4XSB9LCB7IDU6IFsyLCAyMF0sIDEzOiBbMiwgMjBdLCAxNDogWzIsIDIwXSwgMTc6IFsyLCAyMF0sIDI3OiBbMiwgMjBdLCAzMjogWzIsIDIwXSwgMzc6IFsyLCAyMF0sIDQyOiBbMiwgMjBdLCA0NTogWzIsIDIwXSwgNDY6IFsyLCAyMF0sIDQ5OiBbMiwgMjBdLCA1MzogWzIsIDIwXSB9LCB7IDMxOiBbMiwgNjldLCA0MDogMTIyLCA2ODogMTIzLCA2OTogWzEsIDEwOF0gfSwgeyAzMTogWzIsIDY2XSwgNTk6IFsyLCA2Nl0sIDY2OiBbMiwgNjZdLCA2OTogWzIsIDY2XSwgNzQ6IFsyLCA2Nl0sIDc1OiBbMiwgNjZdLCA3NjogWzIsIDY2XSwgNzc6IFsyLCA2Nl0sIDc4OiBbMiwgNjZdLCA3OTogWzIsIDY2XSB9LCB7IDMxOiBbMiwgNjhdLCA2OTogWzIsIDY4XSB9LCB7IDIxOiBbMiwgMjZdLCAzMTogWzIsIDI2XSwgNTI6IFsyLCAyNl0sIDU5OiBbMiwgMjZdLCA2MjogWzIsIDI2XSwgNjY6IFsyLCAyNl0sIDY5OiBbMiwgMjZdLCA3NDogWzIsIDI2XSwgNzU6IFsyLCAyNl0sIDc2OiBbMiwgMjZdLCA3NzogWzIsIDI2XSwgNzg6IFsyLCAyNl0sIDc5OiBbMiwgMjZdIH0sIHsgMTM6IFsyLCAxNF0sIDE0OiBbMiwgMTRdLCAxNzogWzIsIDE0XSwgMjc6IFsyLCAxNF0sIDMyOiBbMiwgMTRdLCAzNzogWzIsIDE0XSwgNDI6IFsyLCAxNF0sIDQ1OiBbMiwgMTRdLCA0NjogWzIsIDE0XSwgNDk6IFsyLCAxNF0sIDUzOiBbMiwgMTRdIH0sIHsgNjY6IFsxLCAxMjVdLCA3MTogWzEsIDEyNF0gfSwgeyA2NjogWzIsIDkxXSwgNzE6IFsyLCA5MV0gfSwgeyAxMzogWzIsIDE1XSwgMTQ6IFsyLCAxNV0sIDE3OiBbMiwgMTVdLCAyNzogWzIsIDE1XSwgMzI6IFsyLCAxNV0sIDQyOiBbMiwgMTVdLCA0NTogWzIsIDE1XSwgNDY6IFsyLCAxNV0sIDQ5OiBbMiwgMTVdLCA1MzogWzIsIDE1XSB9LCB7IDMxOiBbMSwgMTI2XSB9LCB7IDMxOiBbMiwgNzBdIH0sIHsgMzE6IFsyLCAyOV0gfSwgeyA2NjogWzIsIDkyXSwgNzE6IFsyLCA5Ml0gfSwgeyAxMzogWzIsIDE2XSwgMTQ6IFsyLCAxNl0sIDE3OiBbMiwgMTZdLCAyNzogWzIsIDE2XSwgMzI6IFsyLCAxNl0sIDM3OiBbMiwgMTZdLCA0MjogWzIsIDE2XSwgNDU6IFsyLCAxNl0sIDQ2OiBbMiwgMTZdLCA0OTogWzIsIDE2XSwgNTM6IFsyLCAxNl0gfV0sXG4gICAgICAgIGRlZmF1bHRBY3Rpb25zOiB7IDQ6IFsyLCAxXSwgNDk6IFsyLCA1MF0sIDUxOiBbMiwgMTldLCA1NTogWzIsIDUyXSwgNjQ6IFsyLCA3Nl0sIDczOiBbMiwgODBdLCA3ODogWzIsIDE3XSwgODI6IFsyLCA4NF0sIDkyOiBbMiwgNDhdLCA5OTogWzIsIDE4XSwgMTAwOiBbMiwgNzJdLCAxMDU6IFsyLCA4OF0sIDEwNzogWzIsIDU4XSwgMTEwOiBbMiwgNjRdLCAxMTE6IFsyLCAxMV0sIDEyMzogWzIsIDcwXSwgMTI0OiBbMiwgMjldIH0sXG4gICAgICAgIHBhcnNlRXJyb3I6IGZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3RyKTtcbiAgICAgICAgfSxcbiAgICAgICAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICAgICAgc3RhY2sgPSBbMF0sXG4gICAgICAgICAgICAgICAgdnN0YWNrID0gW251bGxdLFxuICAgICAgICAgICAgICAgIGxzdGFjayA9IFtdLFxuICAgICAgICAgICAgICAgIHRhYmxlID0gdGhpcy50YWJsZSxcbiAgICAgICAgICAgICAgICB5eXRleHQgPSBcIlwiLFxuICAgICAgICAgICAgICAgIHl5bGluZW5vID0gMCxcbiAgICAgICAgICAgICAgICB5eWxlbmcgPSAwLFxuICAgICAgICAgICAgICAgIHJlY292ZXJpbmcgPSAwLFxuICAgICAgICAgICAgICAgIFRFUlJPUiA9IDIsXG4gICAgICAgICAgICAgICAgRU9GID0gMTtcbiAgICAgICAgICAgIHRoaXMubGV4ZXIuc2V0SW5wdXQoaW5wdXQpO1xuICAgICAgICAgICAgdGhpcy5sZXhlci55eSA9IHRoaXMueXk7XG4gICAgICAgICAgICB0aGlzLnl5LmxleGVyID0gdGhpcy5sZXhlcjtcbiAgICAgICAgICAgIHRoaXMueXkucGFyc2VyID0gdGhpcztcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5sZXhlci55eWxsb2MgPT0gXCJ1bmRlZmluZWRcIikgdGhpcy5sZXhlci55eWxsb2MgPSB7fTtcbiAgICAgICAgICAgIHZhciB5eWxvYyA9IHRoaXMubGV4ZXIueXlsbG9jO1xuICAgICAgICAgICAgbHN0YWNrLnB1c2goeXlsb2MpO1xuICAgICAgICAgICAgdmFyIHJhbmdlcyA9IHRoaXMubGV4ZXIub3B0aW9ucyAmJiB0aGlzLmxleGVyLm9wdGlvbnMucmFuZ2VzO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnl5LnBhcnNlRXJyb3IgPT09IFwiZnVuY3Rpb25cIikgdGhpcy5wYXJzZUVycm9yID0gdGhpcy55eS5wYXJzZUVycm9yO1xuICAgICAgICAgICAgZnVuY3Rpb24gcG9wU3RhY2sobikge1xuICAgICAgICAgICAgICAgIHN0YWNrLmxlbmd0aCA9IHN0YWNrLmxlbmd0aCAtIDIgKiBuO1xuICAgICAgICAgICAgICAgIHZzdGFjay5sZW5ndGggPSB2c3RhY2subGVuZ3RoIC0gbjtcbiAgICAgICAgICAgICAgICBsc3RhY2subGVuZ3RoID0gbHN0YWNrLmxlbmd0aCAtIG47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRva2VuO1xuICAgICAgICAgICAgICAgIHRva2VuID0gc2VsZi5sZXhlci5sZXgoKSB8fCAxO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSBzZWxmLnN5bWJvbHNfW3Rva2VuXSB8fCB0b2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHN5bWJvbCxcbiAgICAgICAgICAgICAgICBwcmVFcnJvclN5bWJvbCxcbiAgICAgICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgICAgICBhY3Rpb24sXG4gICAgICAgICAgICAgICAgYSxcbiAgICAgICAgICAgICAgICByLFxuICAgICAgICAgICAgICAgIHl5dmFsID0ge30sXG4gICAgICAgICAgICAgICAgcCxcbiAgICAgICAgICAgICAgICBsZW4sXG4gICAgICAgICAgICAgICAgbmV3U3RhdGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgdHlwZW9mIHN5bWJvbCA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzeW1ib2wgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSB0YWJsZVtzdGF0ZV0gJiYgdGFibGVbc3RhdGVdW3N5bWJvbF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYWN0aW9uID09PSBcInVuZGVmaW5lZFwiIHx8ICFhY3Rpb24ubGVuZ3RoIHx8ICFhY3Rpb25bMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVyclN0ciA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVjb3ZlcmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAocCBpbiB0YWJsZVtzdGF0ZV0pIGlmICh0aGlzLnRlcm1pbmFsc19bcF0gJiYgcCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZC5wdXNoKFwiJ1wiICsgdGhpcy50ZXJtaW5hbHNfW3BdICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubGV4ZXIuc2hvd1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyU3RyID0gXCJQYXJzZSBlcnJvciBvbiBsaW5lIFwiICsgKHl5bGluZW5vICsgMSkgKyBcIjpcXG5cIiArIHRoaXMubGV4ZXIuc2hvd1Bvc2l0aW9uKCkgKyBcIlxcbkV4cGVjdGluZyBcIiArIGV4cGVjdGVkLmpvaW4oXCIsIFwiKSArIFwiLCBnb3QgJ1wiICsgKHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCkgKyBcIidcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyU3RyID0gXCJQYXJzZSBlcnJvciBvbiBsaW5lIFwiICsgKHl5bGluZW5vICsgMSkgKyBcIjogVW5leHBlY3RlZCBcIiArIChzeW1ib2wgPT0gMSA/IFwiZW5kIG9mIGlucHV0XCIgOiBcIidcIiArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJzZUVycm9yKGVyclN0ciwgeyB0ZXh0OiB0aGlzLmxleGVyLm1hdGNoLCB0b2tlbjogdGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sLCBsaW5lOiB0aGlzLmxleGVyLnl5bGluZW5vLCBsb2M6IHl5bG9jLCBleHBlY3RlZDogZXhwZWN0ZWQgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvblswXSBpbnN0YW5jZW9mIEFycmF5ICYmIGFjdGlvbi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBhcnNlIEVycm9yOiBtdWx0aXBsZSBhY3Rpb25zIHBvc3NpYmxlIGF0IHN0YXRlOiBcIiArIHN0YXRlICsgXCIsIHRva2VuOiBcIiArIHN5bWJvbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goc3ltYm9sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZzdGFjay5wdXNoKHRoaXMubGV4ZXIueXl0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxzdGFjay5wdXNoKHRoaXMubGV4ZXIueXlsbG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goYWN0aW9uWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXByZUVycm9yU3ltYm9sKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeXlsZW5nID0gdGhpcy5sZXhlci55eWxlbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeXl0ZXh0ID0gdGhpcy5sZXhlci55eXRleHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeXlsaW5lbm8gPSB0aGlzLmxleGVyLnl5bGluZW5vO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHl5bG9jID0gdGhpcy5sZXhlci55eWxsb2M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlY292ZXJpbmcgPiAwKSByZWNvdmVyaW5nLS07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN5bWJvbCA9IHByZUVycm9yU3ltYm9sO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZUVycm9yU3ltYm9sID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBsZW4gPSB0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgeXl2YWwuJCA9IHZzdGFja1t2c3RhY2subGVuZ3RoIC0gbGVuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHl5dmFsLl8kID0geyBmaXJzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLmZpcnN0X2xpbmUsIGxhc3RfbGluZTogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5sYXN0X2xpbmUsIGZpcnN0X2NvbHVtbjogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5maXJzdF9jb2x1bW4sIGxhc3RfY29sdW1uOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfY29sdW1uIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeXl2YWwuXyQucmFuZ2UgPSBbbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5yYW5nZVswXSwgbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5yYW5nZVsxXV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByID0gdGhpcy5wZXJmb3JtQWN0aW9uLmNhbGwoeXl2YWwsIHl5dGV4dCwgeXlsZW5nLCB5eWxpbmVubywgdGhpcy55eSwgYWN0aW9uWzFdLCB2c3RhY2ssIGxzdGFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjayA9IHN0YWNrLnNsaWNlKDAsIC0xICogbGVuICogMik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdnN0YWNrID0gdnN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsc3RhY2sgPSBsc3RhY2suc2xpY2UoMCwgLTEgKiBsZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZzdGFjay5wdXNoKHl5dmFsLiQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbHN0YWNrLnB1c2goeXl2YWwuXyQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3U3RhdGUgPSB0YWJsZVtzdGFja1tzdGFjay5sZW5ndGggLSAyXV1bc3RhY2tbc3RhY2subGVuZ3RoIC0gMV1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaChuZXdTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qIEppc29uIGdlbmVyYXRlZCBsZXhlciAqL1xuICAgIHZhciBsZXhlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBsZXhlciA9IHsgRU9GOiAxLFxuICAgICAgICAgICAgcGFyc2VFcnJvcjogZnVuY3Rpb24gcGFyc2VFcnJvcihzdHIsIGhhc2gpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy55eS5wYXJzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy55eS5wYXJzZXIucGFyc2VFcnJvcihzdHIsIGhhc2gpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihzdHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRJbnB1dDogZnVuY3Rpb24gc2V0SW5wdXQoaW5wdXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbnB1dCA9IGlucHV0O1xuICAgICAgICAgICAgICAgIHRoaXMuX21vcmUgPSB0aGlzLl9sZXNzID0gdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy55eWxpbmVubyA9IHRoaXMueXlsZW5nID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMubWF0Y2hlZCA9IHRoaXMubWF0Y2ggPSBcIlwiO1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZGl0aW9uU3RhY2sgPSBbXCJJTklUSUFMXCJdO1xuICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jID0geyBmaXJzdF9saW5lOiAxLCBmaXJzdF9jb2x1bW46IDAsIGxhc3RfbGluZTogMSwgbGFzdF9jb2x1bW46IDAgfTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykgdGhpcy55eWxsb2MucmFuZ2UgPSBbMCwgMF07XG4gICAgICAgICAgICAgICAgdGhpcy5vZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlucHV0OiBmdW5jdGlvbiBpbnB1dCgpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2ggPSB0aGlzLl9pbnB1dFswXTtcbiAgICAgICAgICAgICAgICB0aGlzLnl5dGV4dCArPSBjaDtcbiAgICAgICAgICAgICAgICB0aGlzLnl5bGVuZysrO1xuICAgICAgICAgICAgICAgIHRoaXMub2Zmc2V0Kys7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXRjaCArPSBjaDtcbiAgICAgICAgICAgICAgICB0aGlzLm1hdGNoZWQgKz0gY2g7XG4gICAgICAgICAgICAgICAgdmFyIGxpbmVzID0gY2gubWF0Y2goLyg/Olxcclxcbj98XFxuKS4qL2cpO1xuICAgICAgICAgICAgICAgIGlmIChsaW5lcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnl5bGluZW5vKys7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfbGluZSsrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfY29sdW1uKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB0aGlzLnl5bGxvYy5yYW5nZVsxXSsrO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5faW5wdXQgPSB0aGlzLl9pbnB1dC5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2g7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdW5wdXQ6IGZ1bmN0aW9uIHVucHV0KGNoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxlbiA9IGNoLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB2YXIgbGluZXMgPSBjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5faW5wdXQgPSBjaCArIHRoaXMuX2lucHV0O1xuICAgICAgICAgICAgICAgIHRoaXMueXl0ZXh0ID0gdGhpcy55eXRleHQuc3Vic3RyKDAsIHRoaXMueXl0ZXh0Lmxlbmd0aCAtIGxlbiAtIDEpO1xuICAgICAgICAgICAgICAgIC8vdGhpcy55eWxlbmcgLT0gbGVuO1xuICAgICAgICAgICAgICAgIHRoaXMub2Zmc2V0IC09IGxlbjtcbiAgICAgICAgICAgICAgICB2YXIgb2xkTGluZXMgPSB0aGlzLm1hdGNoLnNwbGl0KC8oPzpcXHJcXG4/fFxcbikvZyk7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXRjaCA9IHRoaXMubWF0Y2guc3Vic3RyKDAsIHRoaXMubWF0Y2gubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoIC0gMSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoIC0gMSkgdGhpcy55eWxpbmVubyAtPSBsaW5lcy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIHZhciByID0gdGhpcy55eWxsb2MucmFuZ2U7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnl5bGxvYyA9IHsgZmlyc3RfbGluZTogdGhpcy55eWxsb2MuZmlyc3RfbGluZSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vICsgMSxcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RfY29sdW1uOiB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgIGxhc3RfY29sdW1uOiBsaW5lcyA/IChsaW5lcy5sZW5ndGggPT09IG9sZExpbmVzLmxlbmd0aCA/IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbiA6IDApICsgb2xkTGluZXNbb2xkTGluZXMubGVuZ3RoIC0gbGluZXMubGVuZ3RoXS5sZW5ndGggLSBsaW5lc1swXS5sZW5ndGggOiB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4gLSBsZW5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbclswXSwgclswXSArIHRoaXMueXlsZW5nIC0gbGVuXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbW9yZTogZnVuY3Rpb24gbW9yZSgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tb3JlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZXNzOiBmdW5jdGlvbiBsZXNzKG4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVucHV0KHRoaXMubWF0Y2guc2xpY2UobikpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhc3RJbnB1dDogZnVuY3Rpb24gcGFzdElucHV0KCkge1xuICAgICAgICAgICAgICAgIHZhciBwYXN0ID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoIC0gdGhpcy5tYXRjaC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAocGFzdC5sZW5ndGggPiAyMCA/IFwiLi4uXCIgOiBcIlwiKSArIHBhc3Quc3Vic3RyKC0yMCkucmVwbGFjZSgvXFxuL2csIFwiXCIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVwY29taW5nSW5wdXQ6IGZ1bmN0aW9uIHVwY29taW5nSW5wdXQoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHQgPSB0aGlzLm1hdGNoO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0Lmxlbmd0aCA8IDIwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHQgKz0gdGhpcy5faW5wdXQuc3Vic3RyKDAsIDIwIC0gbmV4dC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gKG5leHQuc3Vic3RyKDAsIDIwKSArIChuZXh0Lmxlbmd0aCA+IDIwID8gXCIuLi5cIiA6IFwiXCIpKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2hvd1Bvc2l0aW9uOiBmdW5jdGlvbiBzaG93UG9zaXRpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByZSA9IHRoaXMucGFzdElucHV0KCk7XG4gICAgICAgICAgICAgICAgdmFyIGMgPSBuZXcgQXJyYXkocHJlLmxlbmd0aCArIDEpLmpvaW4oXCItXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwcmUgKyB0aGlzLnVwY29taW5nSW5wdXQoKSArIFwiXFxuXCIgKyBjICsgXCJeXCI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9pbnB1dCkgdGhpcy5kb25lID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciB0b2tlbiwgbWF0Y2gsIHRlbXBNYXRjaCwgaW5kZXgsIGNvbCwgbGluZXM7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9tb3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMueXl0ZXh0ID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXRjaCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBydWxlcyA9IHRoaXMuX2N1cnJlbnRSdWxlcygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGVtcE1hdGNoID0gdGhpcy5faW5wdXQubWF0Y2godGhpcy5ydWxlc1tydWxlc1tpXV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGVtcE1hdGNoICYmICghbWF0Y2ggfHwgdGVtcE1hdGNoWzBdLmxlbmd0aCA+IG1hdGNoWzBdLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoID0gdGVtcE1hdGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuZmxleCkgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVzID0gbWF0Y2hbMF0ubWF0Y2goLyg/Olxcclxcbj98XFxuKS4qL2cpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGluZXMpIHRoaXMueXlsaW5lbm8gKz0gbGluZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnl5bGxvYyA9IHsgZmlyc3RfbGluZTogdGhpcy55eWxsb2MubGFzdF9saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vICsgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MubGFzdF9jb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2NvbHVtbjogbGluZXMgPyBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS5sZW5ndGggLSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS5tYXRjaCgvXFxyP1xcbj8vKVswXS5sZW5ndGggOiB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbiArIG1hdGNoWzBdLmxlbmd0aCB9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnl5dGV4dCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXRjaCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXRjaGVzID0gbWF0Y2g7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMueXlsZW5nID0gdGhpcy55eXRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbdGhpcy5vZmZzZXQsIHRoaXMub2Zmc2V0ICs9IHRoaXMueXlsZW5nXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tb3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2lucHV0ID0gdGhpcy5faW5wdXQuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXRjaGVkICs9IG1hdGNoWzBdO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHRoaXMsIHRoaXMueXksIHRoaXMsIHJ1bGVzW2luZGV4XSwgdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZG9uZSAmJiB0aGlzLl9pbnB1dCkgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9pbnB1dCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5FT0Y7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VFcnJvcihcIkxleGljYWwgZXJyb3Igb24gbGluZSBcIiArICh0aGlzLnl5bGluZW5vICsgMSkgKyBcIi4gVW5yZWNvZ25pemVkIHRleHQuXFxuXCIgKyB0aGlzLnNob3dQb3NpdGlvbigpLCB7IHRleHQ6IFwiXCIsIHRva2VuOiBudWxsLCBsaW5lOiB0aGlzLnl5bGluZW5vIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZXg6IGZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgICAgICAgICB2YXIgciA9IHRoaXMubmV4dCgpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sZXgoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYmVnaW46IGZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZGl0aW9uU3RhY2sucHVzaChjb25kaXRpb24pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcFN0YXRlOiBmdW5jdGlvbiBwb3BTdGF0ZSgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25TdGFjay5wb3AoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBfY3VycmVudFJ1bGVzOiBmdW5jdGlvbiBfY3VycmVudFJ1bGVzKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvbnNbdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aCAtIDFdXS5ydWxlcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0b3BTdGF0ZTogZnVuY3Rpb24gdG9wU3RhdGUoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggLSAyXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwdXNoU3RhdGU6IGZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oY29uZGl0aW9uKTtcbiAgICAgICAgICAgIH0gfTtcbiAgICAgICAgbGV4ZXIub3B0aW9ucyA9IHt9O1xuICAgICAgICBsZXhlci5wZXJmb3JtQWN0aW9uID0gZnVuY3Rpb24gYW5vbnltb3VzKHl5LCB5eV8sICRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMsIFlZX1NUQVJUKSB7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHN0cmlwKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geXlfLnl5dGV4dCA9IHl5Xy55eXRleHQuc3Vic3RyKHN0YXJ0LCB5eV8ueXlsZW5nIC0gZW5kKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIFlZU1RBVEUgPSBZWV9TVEFSVDtcbiAgICAgICAgICAgIHN3aXRjaCAoJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucykge1xuICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHl5Xy55eXRleHQuc2xpY2UoLTIpID09PSBcIlxcXFxcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmlwKDAsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcIm11XCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHl5Xy55eXRleHQuc2xpY2UoLTEpID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaXAoMCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwiZW11XCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcIm11XCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh5eV8ueXl0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTQ7XG4gICAgICAgICAgICAgICAgICAgIH1icmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxNDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxNDtcblxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgIHl5Xy55eXRleHQgPSB5eV8ueXl0ZXh0LnN1YnN0cig1LCB5eV8ueXlsZW5nIC0gOSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE2O1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE0O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDEzO1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDU5O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA2MjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwicmF3XCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMjE7XG5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxMDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDUzO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDExOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMjc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA0NTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO3JldHVybiA0MjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxNDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO3JldHVybiA0MjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxNTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDMyO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE2OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMzc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA0OTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxODpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDQ2O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVucHV0KHl5Xy55eXRleHQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJjb21cIik7XG5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyMDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTM7XG5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyMTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDQ2O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDIyOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNjc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjM6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA2NjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyNDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDY2O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI1OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gODE7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjY6XG4gICAgICAgICAgICAgICAgICAgIC8vIGlnbm9yZSB3aGl0ZXNwYWNlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjc6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtyZXR1cm4gNTI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjg6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtyZXR1cm4gMzE7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjk6XG4gICAgICAgICAgICAgICAgICAgIHl5Xy55eXRleHQgPSBzdHJpcCgxLCAyKS5yZXBsYWNlKC9cXFxcXCIvZywgXCJcXFwiXCIpO3JldHVybiA3NDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzMDpcbiAgICAgICAgICAgICAgICAgICAgeXlfLnl5dGV4dCA9IHN0cmlwKDEsIDIpLnJlcGxhY2UoL1xcXFwnL2csIFwiJ1wiKTtyZXR1cm4gNzQ7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzE6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA3OTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzMjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDc2O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDMzOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNzY7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA3NztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzNTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDc4O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM2OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNzU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA2OTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDcxO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM5OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNjY7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA2NjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0MTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiSU5WQUxJRFwiO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQyOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGxleGVyLnJ1bGVzID0gWy9eKD86W15cXHgwMF0qPyg/PShcXHtcXHspKSkvLCAvXig/OlteXFx4MDBdKykvLCAvXig/OlteXFx4MDBdezIsfT8oPz0oXFx7XFx7fFxcXFxcXHtcXHt8XFxcXFxcXFxcXHtcXHt8JCkpKS8sIC9eKD86XFx7XFx7XFx7XFx7XFwvW15cXHMhXCIjJS0sXFwuXFwvOy0+QFxcWy1cXF5gXFx7LX5dKyg/PVs9fVxcc1xcLy5dKVxcfVxcfVxcfVxcfSkvLCAvXig/OlteXFx4MDBdKj8oPz0oXFx7XFx7XFx7XFx7XFwvKSkpLywgL14oPzpbXFxzXFxTXSo/LS0ofik/XFx9XFx9KS8sIC9eKD86XFwoKS8sIC9eKD86XFwpKS8sIC9eKD86XFx7XFx7XFx7XFx7KS8sIC9eKD86XFx9XFx9XFx9XFx9KS8sIC9eKD86XFx7XFx7KH4pPz4pLywgL14oPzpcXHtcXHsofik/IykvLCAvXig/Olxce1xceyh+KT9cXC8pLywgL14oPzpcXHtcXHsofik/XFxeXFxzKih+KT9cXH1cXH0pLywgL14oPzpcXHtcXHsofik/XFxzKmVsc2VcXHMqKH4pP1xcfVxcfSkvLCAvXig/Olxce1xceyh+KT9cXF4pLywgL14oPzpcXHtcXHsofik/XFxzKmVsc2VcXGIpLywgL14oPzpcXHtcXHsofik/XFx7KS8sIC9eKD86XFx7XFx7KH4pPyYpLywgL14oPzpcXHtcXHsofik/IS0tKS8sIC9eKD86XFx7XFx7KH4pPyFbXFxzXFxTXSo/XFx9XFx9KS8sIC9eKD86XFx7XFx7KH4pPykvLCAvXig/Oj0pLywgL14oPzpcXC5cXC4pLywgL14oPzpcXC4oPz0oWz1+fVxcc1xcLy4pfF0pKSkvLCAvXig/OltcXC8uXSkvLCAvXig/OlxccyspLywgL14oPzpcXH0ofik/XFx9XFx9KS8sIC9eKD86KH4pP1xcfVxcfSkvLCAvXig/OlwiKFxcXFxbXCJdfFteXCJdKSpcIikvLCAvXig/OicoXFxcXFsnXXxbXiddKSonKS8sIC9eKD86QCkvLCAvXig/OnRydWUoPz0oW359XFxzKV0pKSkvLCAvXig/OmZhbHNlKD89KFt+fVxccyldKSkpLywgL14oPzp1bmRlZmluZWQoPz0oW359XFxzKV0pKSkvLCAvXig/Om51bGwoPz0oW359XFxzKV0pKSkvLCAvXig/Oi0/WzAtOV0rKD86XFwuWzAtOV0rKT8oPz0oW359XFxzKV0pKSkvLCAvXig/OmFzXFxzK1xcfCkvLCAvXig/OlxcfCkvLCAvXig/OihbXlxccyFcIiMlLSxcXC5cXC87LT5AXFxbLVxcXmBcXHstfl0rKD89KFs9fn1cXHNcXC8uKXxdKSkpKS8sIC9eKD86XFxbW15cXF1dKlxcXSkvLCAvXig/Oi4pLywgL14oPzokKS9dO1xuICAgICAgICBsZXhlci5jb25kaXRpb25zID0geyBtdTogeyBydWxlczogWzYsIDcsIDgsIDksIDEwLCAxMSwgMTIsIDEzLCAxNCwgMTUsIDE2LCAxNywgMTgsIDE5LCAyMCwgMjEsIDIyLCAyMywgMjQsIDI1LCAyNiwgMjcsIDI4LCAyOSwgMzAsIDMxLCAzMiwgMzMsIDM0LCAzNSwgMzYsIDM3LCAzOCwgMzksIDQwLCA0MSwgNDJdLCBpbmNsdXNpdmU6IGZhbHNlIH0sIGVtdTogeyBydWxlczogWzJdLCBpbmNsdXNpdmU6IGZhbHNlIH0sIGNvbTogeyBydWxlczogWzVdLCBpbmNsdXNpdmU6IGZhbHNlIH0sIHJhdzogeyBydWxlczogWzMsIDRdLCBpbmNsdXNpdmU6IGZhbHNlIH0sIElOSVRJQUw6IHsgcnVsZXM6IFswLCAxLCA0Ml0sIGluY2x1c2l2ZTogdHJ1ZSB9IH07XG4gICAgICAgIHJldHVybiBsZXhlcjtcbiAgICB9KSgpO1xuICAgIHBhcnNlci5sZXhlciA9IGxleGVyO1xuICAgIGZ1bmN0aW9uIFBhcnNlcigpIHtcbiAgICAgICAgdGhpcy55eSA9IHt9O1xuICAgIH1QYXJzZXIucHJvdG90eXBlID0gcGFyc2VyO3BhcnNlci5QYXJzZXIgPSBQYXJzZXI7XG4gICAgcmV0dXJuIG5ldyBQYXJzZXIoKTtcbn0pKCk7ZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBoYW5kbGViYXJzO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzW1wiZGVmYXVsdFwiXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMucHJpbnQgPSBwcmludDtcbmV4cG9ydHMuUHJpbnRWaXNpdG9yID0gUHJpbnRWaXNpdG9yO1xuLyplc2xpbnQtZGlzYWJsZSBuZXctY2FwICovXG5cbnZhciBfVmlzaXRvciA9IHJlcXVpcmUoJy4vdmlzaXRvcicpO1xuXG52YXIgX1Zpc2l0b3IyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX1Zpc2l0b3IpO1xuXG5mdW5jdGlvbiBwcmludChhc3QpIHtcbiAgcmV0dXJuIG5ldyBQcmludFZpc2l0b3IoKS5hY2NlcHQoYXN0KTtcbn1cblxuZnVuY3Rpb24gUHJpbnRWaXNpdG9yKCkge1xuICB0aGlzLnBhZGRpbmcgPSAwO1xufVxuXG5QcmludFZpc2l0b3IucHJvdG90eXBlID0gbmV3IF9WaXNpdG9yMlsnZGVmYXVsdCddKCk7XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUucGFkID0gZnVuY3Rpb24gKHN0cmluZykge1xuICB2YXIgb3V0ID0gJyc7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnBhZGRpbmc7IGkgPCBsOyBpKyspIHtcbiAgICBvdXQgPSBvdXQgKyAnICAnO1xuICB9XG5cbiAgb3V0ID0gb3V0ICsgc3RyaW5nICsgJ1xcbic7XG4gIHJldHVybiBvdXQ7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLlByb2dyYW0gPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgb3V0ID0gJycsXG4gICAgICBib2R5ID0gcHJvZ3JhbS5ib2R5LFxuICAgICAgaSA9IHVuZGVmaW5lZCxcbiAgICAgIGwgPSB1bmRlZmluZWQ7XG5cbiAgaWYgKHByb2dyYW0uYmxvY2tQYXJhbXMpIHtcbiAgICB2YXIgYmxvY2tQYXJhbXMgPSAnQkxPQ0sgUEFSQU1TOiBbJztcbiAgICBmb3IgKGkgPSAwLCBsID0gcHJvZ3JhbS5ibG9ja1BhcmFtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGJsb2NrUGFyYW1zICs9ICcgJyArIHByb2dyYW0uYmxvY2tQYXJhbXNbaV07XG4gICAgfVxuICAgIGJsb2NrUGFyYW1zICs9ICcgXSc7XG4gICAgb3V0ICs9IHRoaXMucGFkKGJsb2NrUGFyYW1zKTtcbiAgfVxuXG4gIGZvciAoaSA9IDAsIGwgPSBib2R5Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KGJvZHlbaV0pO1xuICB9XG5cbiAgdGhpcy5wYWRkaW5nLS07XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuTXVzdGFjaGVTdGF0ZW1lbnQgPSBmdW5jdGlvbiAobXVzdGFjaGUpIHtcbiAgcmV0dXJuIHRoaXMucGFkKCd7eyAnICsgdGhpcy5TdWJFeHByZXNzaW9uKG11c3RhY2hlKSArICcgfX0nKTtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuQmxvY2tTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgdmFyIG91dCA9ICcnO1xuXG4gIG91dCA9IG91dCArIHRoaXMucGFkKCdCTE9DSzonKTtcbiAgdGhpcy5wYWRkaW5nKys7XG4gIG91dCA9IG91dCArIHRoaXMucGFkKHRoaXMuU3ViRXhwcmVzc2lvbihibG9jaykpO1xuICBpZiAoYmxvY2sucHJvZ3JhbSkge1xuICAgIG91dCA9IG91dCArIHRoaXMucGFkKCdQUk9HUkFNOicpO1xuICAgIHRoaXMucGFkZGluZysrO1xuICAgIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KGJsb2NrLnByb2dyYW0pO1xuICAgIHRoaXMucGFkZGluZy0tO1xuICB9XG4gIGlmIChibG9jay5pbnZlcnNlKSB7XG4gICAgaWYgKGJsb2NrLnByb2dyYW0pIHtcbiAgICAgIHRoaXMucGFkZGluZysrO1xuICAgIH1cbiAgICBvdXQgPSBvdXQgKyB0aGlzLnBhZCgne3tefX0nKTtcbiAgICB0aGlzLnBhZGRpbmcrKztcbiAgICBvdXQgPSBvdXQgKyB0aGlzLmFjY2VwdChibG9jay5pbnZlcnNlKTtcbiAgICB0aGlzLnBhZGRpbmctLTtcbiAgICBpZiAoYmxvY2sucHJvZ3JhbSkge1xuICAgICAgdGhpcy5wYWRkaW5nLS07XG4gICAgfVxuICB9XG4gIHRoaXMucGFkZGluZy0tO1xuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLlBhcnRpYWxTdGF0ZW1lbnQgPSBmdW5jdGlvbiAocGFydGlhbCkge1xuICB2YXIgY29udGVudCA9ICdQQVJUSUFMOicgKyBwYXJ0aWFsLm5hbWUub3JpZ2luYWw7XG4gIGlmIChwYXJ0aWFsLnBhcmFtc1swXSkge1xuICAgIGNvbnRlbnQgKz0gJyAnICsgdGhpcy5hY2NlcHQocGFydGlhbC5wYXJhbXNbMF0pO1xuICB9XG4gIGlmIChwYXJ0aWFsLmhhc2gpIHtcbiAgICBjb250ZW50ICs9ICcgJyArIHRoaXMuYWNjZXB0KHBhcnRpYWwuaGFzaCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMucGFkKCd7ez4gJyArIGNvbnRlbnQgKyAnIH19Jyk7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLkNvbnRlbnRTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoY29udGVudCkge1xuICByZXR1cm4gdGhpcy5wYWQoJ0NPTlRFTlRbIFxcJycgKyBjb250ZW50LnZhbHVlICsgJ1xcJyBdJyk7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLkNvbW1lbnRTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoY29tbWVudCkge1xuICByZXR1cm4gdGhpcy5wYWQoJ3t7ISBcXCcnICsgY29tbWVudC52YWx1ZSArICdcXCcgfX0nKTtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuU3ViRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChzZXhwcikge1xuICB2YXIgcGFyYW1zID0gc2V4cHIucGFyYW1zLFxuICAgICAgcGFyYW1TdHJpbmdzID0gW10sXG4gICAgICBoYXNoID0gdW5kZWZpbmVkO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcGFyYW1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHBhcmFtU3RyaW5ncy5wdXNoKHRoaXMuYWNjZXB0KHBhcmFtc1tpXSkpO1xuICB9XG5cbiAgcGFyYW1zID0gJ1snICsgcGFyYW1TdHJpbmdzLmpvaW4oJywgJykgKyAnXSc7XG5cbiAgaGFzaCA9IHNleHByLmhhc2ggPyAnICcgKyB0aGlzLmFjY2VwdChzZXhwci5oYXNoKSA6ICcnO1xuXG4gIHJldHVybiB0aGlzLmFjY2VwdChzZXhwci5wYXRoKSArICcgJyArIHBhcmFtcyArIGhhc2g7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLlBhdGhFeHByZXNzaW9uID0gZnVuY3Rpb24gKGlkKSB7XG4gIHZhciBwYXRoID0gaWQucGFydHMuam9pbignLycpO1xuICByZXR1cm4gKGlkLmRhdGEgPyAnQCcgOiAnJykgKyAnUEFUSDonICsgcGF0aDtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuU3RyaW5nTGl0ZXJhbCA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgcmV0dXJuICdcIicgKyBzdHJpbmcudmFsdWUgKyAnXCInO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5OdW1iZXJMaXRlcmFsID0gZnVuY3Rpb24gKG51bWJlcikge1xuICByZXR1cm4gJ05VTUJFUnsnICsgbnVtYmVyLnZhbHVlICsgJ30nO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5Cb29sZWFuTGl0ZXJhbCA9IGZ1bmN0aW9uIChib29sKSB7XG4gIHJldHVybiAnQk9PTEVBTnsnICsgYm9vbC52YWx1ZSArICd9Jztcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuVW5kZWZpbmVkTGl0ZXJhbCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdVTkRFRklORUQnO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5OdWxsTGl0ZXJhbCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdOVUxMJztcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuSGFzaCA9IGZ1bmN0aW9uIChoYXNoKSB7XG4gIHZhciBwYWlycyA9IGhhc2gucGFpcnMsXG4gICAgICBqb2luZWRQYWlycyA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcGFpcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgam9pbmVkUGFpcnMucHVzaCh0aGlzLmFjY2VwdChwYWlyc1tpXSkpO1xuICB9XG5cbiAgcmV0dXJuICdIQVNIeycgKyBqb2luZWRQYWlycy5qb2luKCcsICcpICsgJ30nO1xufTtcblByaW50VmlzaXRvci5wcm90b3R5cGUuSGFzaFBhaXIgPSBmdW5jdGlvbiAocGFpcikge1xuICByZXR1cm4gcGFpci5rZXkgKyAnPScgKyB0aGlzLmFjY2VwdChwYWlyLnZhbHVlKTtcbn07XG4vKmVzbGludC1lbmFibGUgbmV3LWNhcCAqLyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4uL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9BU1QgPSByZXF1aXJlKCcuL2FzdCcpO1xuXG52YXIgX0FTVDIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfQVNUKTtcblxuZnVuY3Rpb24gVmlzaXRvcigpIHtcbiAgdGhpcy5wYXJlbnRzID0gW107XG59XG5cblZpc2l0b3IucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogVmlzaXRvcixcbiAgbXV0YXRpbmc6IGZhbHNlLFxuXG4gIC8vIFZpc2l0cyBhIGdpdmVuIHZhbHVlLiBJZiBtdXRhdGluZywgd2lsbCByZXBsYWNlIHRoZSB2YWx1ZSBpZiBuZWNlc3NhcnkuXG4gIGFjY2VwdEtleTogZnVuY3Rpb24gYWNjZXB0S2V5KG5vZGUsIG5hbWUpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmFjY2VwdChub2RlW25hbWVdKTtcbiAgICBpZiAodGhpcy5tdXRhdGluZykge1xuICAgICAgLy8gSGFja3kgc2FuaXR5IGNoZWNrOlxuICAgICAgaWYgKHZhbHVlICYmICghdmFsdWUudHlwZSB8fCAhX0FTVDJbJ2RlZmF1bHQnXVt2YWx1ZS50eXBlXSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1VuZXhwZWN0ZWQgbm9kZSB0eXBlIFwiJyArIHZhbHVlLnR5cGUgKyAnXCIgZm91bmQgd2hlbiBhY2NlcHRpbmcgJyArIG5hbWUgKyAnIG9uICcgKyBub2RlLnR5cGUpO1xuICAgICAgfVxuICAgICAgbm9kZVtuYW1lXSA9IHZhbHVlO1xuICAgIH1cbiAgfSxcblxuICAvLyBQZXJmb3JtcyBhbiBhY2NlcHQgb3BlcmF0aW9uIHdpdGggYWRkZWQgc2FuaXR5IGNoZWNrIHRvIGVuc3VyZVxuICAvLyByZXF1aXJlZCBrZXlzIGFyZSBub3QgcmVtb3ZlZC5cbiAgYWNjZXB0UmVxdWlyZWQ6IGZ1bmN0aW9uIGFjY2VwdFJlcXVpcmVkKG5vZGUsIG5hbWUpIHtcbiAgICB0aGlzLmFjY2VwdEtleShub2RlLCBuYW1lKTtcblxuICAgIGlmICghbm9kZVtuYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10obm9kZS50eXBlICsgJyByZXF1aXJlcyAnICsgbmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFRyYXZlcnNlcyBhIGdpdmVuIGFycmF5LiBJZiBtdXRhdGluZywgZW1wdHkgcmVzcG5zZXMgd2lsbCBiZSByZW1vdmVkXG4gIC8vIGZvciBjaGlsZCBlbGVtZW50cy5cbiAgYWNjZXB0QXJyYXk6IGZ1bmN0aW9uIGFjY2VwdEFycmF5KGFycmF5KSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMuYWNjZXB0S2V5KGFycmF5LCBpKTtcblxuICAgICAgaWYgKCFhcnJheVtpXSkge1xuICAgICAgICBhcnJheS5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgbC0tO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBhY2NlcHQ6IGZ1bmN0aW9uIGFjY2VwdChvYmplY3QpIHtcbiAgICBpZiAoIW9iamVjdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmN1cnJlbnQpIHtcbiAgICAgIHRoaXMucGFyZW50cy51bnNoaWZ0KHRoaXMuY3VycmVudCk7XG4gICAgfVxuICAgIHRoaXMuY3VycmVudCA9IG9iamVjdDtcblxuICAgIHZhciByZXQgPSB0aGlzW29iamVjdC50eXBlXShvYmplY3QpO1xuXG4gICAgdGhpcy5jdXJyZW50ID0gdGhpcy5wYXJlbnRzLnNoaWZ0KCk7XG5cbiAgICBpZiAoIXRoaXMubXV0YXRpbmcgfHwgcmV0KSB7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0gZWxzZSBpZiAocmV0ICE9PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG4gIH0sXG5cbiAgUHJvZ3JhbTogZnVuY3Rpb24gUHJvZ3JhbShwcm9ncmFtKSB7XG4gICAgdGhpcy5hY2NlcHRBcnJheShwcm9ncmFtLmJvZHkpO1xuICB9LFxuXG4gIE11c3RhY2hlU3RhdGVtZW50OiBmdW5jdGlvbiBNdXN0YWNoZVN0YXRlbWVudChtdXN0YWNoZSkge1xuICAgIHRoaXMuYWNjZXB0UmVxdWlyZWQobXVzdGFjaGUsICdwYXRoJyk7XG4gICAgdGhpcy5hY2NlcHRBcnJheShtdXN0YWNoZS5wYXJhbXMpO1xuICAgIHRoaXMuYWNjZXB0S2V5KG11c3RhY2hlLCAnaGFzaCcpO1xuICB9LFxuXG4gIEJsb2NrU3RhdGVtZW50OiBmdW5jdGlvbiBCbG9ja1N0YXRlbWVudChibG9jaykge1xuICAgIHRoaXMuYWNjZXB0UmVxdWlyZWQoYmxvY2ssICdwYXRoJyk7XG4gICAgdGhpcy5hY2NlcHRBcnJheShibG9jay5wYXJhbXMpO1xuICAgIHRoaXMuYWNjZXB0S2V5KGJsb2NrLCAnaGFzaCcpO1xuXG4gICAgdGhpcy5hY2NlcHRLZXkoYmxvY2ssICdwcm9ncmFtJyk7XG4gICAgdGhpcy5hY2NlcHRLZXkoYmxvY2ssICdpbnZlcnNlJyk7XG4gIH0sXG5cbiAgUGFydGlhbFN0YXRlbWVudDogZnVuY3Rpb24gUGFydGlhbFN0YXRlbWVudChwYXJ0aWFsKSB7XG4gICAgdGhpcy5hY2NlcHRSZXF1aXJlZChwYXJ0aWFsLCAnbmFtZScpO1xuICAgIHRoaXMuYWNjZXB0QXJyYXkocGFydGlhbC5wYXJhbXMpO1xuICAgIHRoaXMuYWNjZXB0S2V5KHBhcnRpYWwsICdoYXNoJyk7XG4gIH0sXG5cbiAgQ29udGVudFN0YXRlbWVudDogZnVuY3Rpb24gQ29udGVudFN0YXRlbWVudCgpIHt9LFxuICBDb21tZW50U3RhdGVtZW50OiBmdW5jdGlvbiBDb21tZW50U3RhdGVtZW50KCkge30sXG5cbiAgU3ViRXhwcmVzc2lvbjogZnVuY3Rpb24gU3ViRXhwcmVzc2lvbihzZXhwcikge1xuICAgIHRoaXMuYWNjZXB0UmVxdWlyZWQoc2V4cHIsICdwYXRoJyk7XG4gICAgdGhpcy5hY2NlcHRBcnJheShzZXhwci5wYXJhbXMpO1xuICAgIHRoaXMuYWNjZXB0S2V5KHNleHByLCAnaGFzaCcpO1xuICB9LFxuXG4gIFBhdGhFeHByZXNzaW9uOiBmdW5jdGlvbiBQYXRoRXhwcmVzc2lvbigpIHt9LFxuXG4gIFN0cmluZ0xpdGVyYWw6IGZ1bmN0aW9uIFN0cmluZ0xpdGVyYWwoKSB7fSxcbiAgTnVtYmVyTGl0ZXJhbDogZnVuY3Rpb24gTnVtYmVyTGl0ZXJhbCgpIHt9LFxuICBCb29sZWFuTGl0ZXJhbDogZnVuY3Rpb24gQm9vbGVhbkxpdGVyYWwoKSB7fSxcbiAgVW5kZWZpbmVkTGl0ZXJhbDogZnVuY3Rpb24gVW5kZWZpbmVkTGl0ZXJhbCgpIHt9LFxuICBOdWxsTGl0ZXJhbDogZnVuY3Rpb24gTnVsbExpdGVyYWwoKSB7fSxcblxuICBIYXNoOiBmdW5jdGlvbiBIYXNoKGhhc2gpIHtcbiAgICB0aGlzLmFjY2VwdEFycmF5KGhhc2gucGFpcnMpO1xuICB9LFxuICBIYXNoUGFpcjogZnVuY3Rpb24gSGFzaFBhaXIocGFpcikge1xuICAgIHRoaXMuYWNjZXB0UmVxdWlyZWQocGFpciwgJ3ZhbHVlJyk7XG4gIH1cbn07XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IFZpc2l0b3I7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTtcbi8qIGNvbnRlbnQgKi8gLyogY29tbWVudCAqLyAvKiBwYXRoICovIC8qIHN0cmluZyAqLyAvKiBudW1iZXIgKi8gLyogYm9vbCAqLyAvKiBsaXRlcmFsICovIC8qIGxpdGVyYWwgKi8iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9WaXNpdG9yID0gcmVxdWlyZSgnLi92aXNpdG9yJyk7XG5cbnZhciBfVmlzaXRvcjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfVmlzaXRvcik7XG5cbmZ1bmN0aW9uIFdoaXRlc3BhY2VDb250cm9sKCkge31cbldoaXRlc3BhY2VDb250cm9sLnByb3RvdHlwZSA9IG5ldyBfVmlzaXRvcjJbJ2RlZmF1bHQnXSgpO1xuXG5XaGl0ZXNwYWNlQ29udHJvbC5wcm90b3R5cGUuUHJvZ3JhbSA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gIHZhciBpc1Jvb3QgPSAhdGhpcy5pc1Jvb3RTZWVuO1xuICB0aGlzLmlzUm9vdFNlZW4gPSB0cnVlO1xuXG4gIHZhciBib2R5ID0gcHJvZ3JhbS5ib2R5O1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGJvZHkubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGN1cnJlbnQgPSBib2R5W2ldLFxuICAgICAgICBzdHJpcCA9IHRoaXMuYWNjZXB0KGN1cnJlbnQpO1xuXG4gICAgaWYgKCFzdHJpcCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIF9pc1ByZXZXaGl0ZXNwYWNlID0gaXNQcmV2V2hpdGVzcGFjZShib2R5LCBpLCBpc1Jvb3QpLFxuICAgICAgICBfaXNOZXh0V2hpdGVzcGFjZSA9IGlzTmV4dFdoaXRlc3BhY2UoYm9keSwgaSwgaXNSb290KSxcbiAgICAgICAgb3BlblN0YW5kYWxvbmUgPSBzdHJpcC5vcGVuU3RhbmRhbG9uZSAmJiBfaXNQcmV2V2hpdGVzcGFjZSxcbiAgICAgICAgY2xvc2VTdGFuZGFsb25lID0gc3RyaXAuY2xvc2VTdGFuZGFsb25lICYmIF9pc05leHRXaGl0ZXNwYWNlLFxuICAgICAgICBpbmxpbmVTdGFuZGFsb25lID0gc3RyaXAuaW5saW5lU3RhbmRhbG9uZSAmJiBfaXNQcmV2V2hpdGVzcGFjZSAmJiBfaXNOZXh0V2hpdGVzcGFjZTtcblxuICAgIGlmIChzdHJpcC5jbG9zZSkge1xuICAgICAgb21pdFJpZ2h0KGJvZHksIGksIHRydWUpO1xuICAgIH1cbiAgICBpZiAoc3RyaXAub3Blbikge1xuICAgICAgb21pdExlZnQoYm9keSwgaSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGlubGluZVN0YW5kYWxvbmUpIHtcbiAgICAgIG9taXRSaWdodChib2R5LCBpKTtcblxuICAgICAgaWYgKG9taXRMZWZ0KGJvZHksIGkpKSB7XG4gICAgICAgIC8vIElmIHdlIGFyZSBvbiBhIHN0YW5kYWxvbmUgbm9kZSwgc2F2ZSB0aGUgaW5kZW50IGluZm8gZm9yIHBhcnRpYWxzXG4gICAgICAgIGlmIChjdXJyZW50LnR5cGUgPT09ICdQYXJ0aWFsU3RhdGVtZW50Jykge1xuICAgICAgICAgIC8vIFB1bGwgb3V0IHRoZSB3aGl0ZXNwYWNlIGZyb20gdGhlIGZpbmFsIGxpbmVcbiAgICAgICAgICBjdXJyZW50LmluZGVudCA9IC8oWyBcXHRdKyQpLy5leGVjKGJvZHlbaSAtIDFdLm9yaWdpbmFsKVsxXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3BlblN0YW5kYWxvbmUpIHtcbiAgICAgIG9taXRSaWdodCgoY3VycmVudC5wcm9ncmFtIHx8IGN1cnJlbnQuaW52ZXJzZSkuYm9keSk7XG5cbiAgICAgIC8vIFN0cmlwIG91dCB0aGUgcHJldmlvdXMgY29udGVudCBub2RlIGlmIGl0J3Mgd2hpdGVzcGFjZSBvbmx5XG4gICAgICBvbWl0TGVmdChib2R5LCBpKTtcbiAgICB9XG4gICAgaWYgKGNsb3NlU3RhbmRhbG9uZSkge1xuICAgICAgLy8gQWx3YXlzIHN0cmlwIHRoZSBuZXh0IG5vZGVcbiAgICAgIG9taXRSaWdodChib2R5LCBpKTtcblxuICAgICAgb21pdExlZnQoKGN1cnJlbnQuaW52ZXJzZSB8fCBjdXJyZW50LnByb2dyYW0pLmJvZHkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwcm9ncmFtO1xufTtcbldoaXRlc3BhY2VDb250cm9sLnByb3RvdHlwZS5CbG9ja1N0YXRlbWVudCA9IGZ1bmN0aW9uIChibG9jaykge1xuICB0aGlzLmFjY2VwdChibG9jay5wcm9ncmFtKTtcbiAgdGhpcy5hY2NlcHQoYmxvY2suaW52ZXJzZSk7XG5cbiAgLy8gRmluZCB0aGUgaW52ZXJzZSBwcm9ncmFtIHRoYXQgaXMgaW52b2xlZCB3aXRoIHdoaXRlc3BhY2Ugc3RyaXBwaW5nLlxuICB2YXIgcHJvZ3JhbSA9IGJsb2NrLnByb2dyYW0gfHwgYmxvY2suaW52ZXJzZSxcbiAgICAgIGludmVyc2UgPSBibG9jay5wcm9ncmFtICYmIGJsb2NrLmludmVyc2UsXG4gICAgICBmaXJzdEludmVyc2UgPSBpbnZlcnNlLFxuICAgICAgbGFzdEludmVyc2UgPSBpbnZlcnNlO1xuXG4gIGlmIChpbnZlcnNlICYmIGludmVyc2UuY2hhaW5lZCkge1xuICAgIGZpcnN0SW52ZXJzZSA9IGludmVyc2UuYm9keVswXS5wcm9ncmFtO1xuXG4gICAgLy8gV2FsayB0aGUgaW52ZXJzZSBjaGFpbiB0byBmaW5kIHRoZSBsYXN0IGludmVyc2UgdGhhdCBpcyBhY3R1YWxseSBpbiB0aGUgY2hhaW4uXG4gICAgd2hpbGUgKGxhc3RJbnZlcnNlLmNoYWluZWQpIHtcbiAgICAgIGxhc3RJbnZlcnNlID0gbGFzdEludmVyc2UuYm9keVtsYXN0SW52ZXJzZS5ib2R5Lmxlbmd0aCAtIDFdLnByb2dyYW07XG4gICAgfVxuICB9XG5cbiAgdmFyIHN0cmlwID0ge1xuICAgIG9wZW46IGJsb2NrLm9wZW5TdHJpcC5vcGVuLFxuICAgIGNsb3NlOiBibG9jay5jbG9zZVN0cmlwLmNsb3NlLFxuXG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBzdGFuZGFsb25lIGNhbmRpYWN5LiBCYXNpY2FsbHkgZmxhZyBvdXIgY29udGVudCBhcyBiZWluZyBwb3NzaWJseSBzdGFuZGFsb25lXG4gICAgLy8gc28gb3VyIHBhcmVudCBjYW4gZGV0ZXJtaW5lIGlmIHdlIGFjdHVhbGx5IGFyZSBzdGFuZGFsb25lXG4gICAgb3BlblN0YW5kYWxvbmU6IGlzTmV4dFdoaXRlc3BhY2UocHJvZ3JhbS5ib2R5KSxcbiAgICBjbG9zZVN0YW5kYWxvbmU6IGlzUHJldldoaXRlc3BhY2UoKGZpcnN0SW52ZXJzZSB8fCBwcm9ncmFtKS5ib2R5KVxuICB9O1xuXG4gIGlmIChibG9jay5vcGVuU3RyaXAuY2xvc2UpIHtcbiAgICBvbWl0UmlnaHQocHJvZ3JhbS5ib2R5LCBudWxsLCB0cnVlKTtcbiAgfVxuXG4gIGlmIChpbnZlcnNlKSB7XG4gICAgdmFyIGludmVyc2VTdHJpcCA9IGJsb2NrLmludmVyc2VTdHJpcDtcblxuICAgIGlmIChpbnZlcnNlU3RyaXAub3Blbikge1xuICAgICAgb21pdExlZnQocHJvZ3JhbS5ib2R5LCBudWxsLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAoaW52ZXJzZVN0cmlwLmNsb3NlKSB7XG4gICAgICBvbWl0UmlnaHQoZmlyc3RJbnZlcnNlLmJvZHksIG51bGwsIHRydWUpO1xuICAgIH1cbiAgICBpZiAoYmxvY2suY2xvc2VTdHJpcC5vcGVuKSB7XG4gICAgICBvbWl0TGVmdChsYXN0SW52ZXJzZS5ib2R5LCBudWxsLCB0cnVlKTtcbiAgICB9XG5cbiAgICAvLyBGaW5kIHN0YW5kYWxvbmUgZWxzZSBzdGF0bWVudHNcbiAgICBpZiAoaXNQcmV2V2hpdGVzcGFjZShwcm9ncmFtLmJvZHkpICYmIGlzTmV4dFdoaXRlc3BhY2UoZmlyc3RJbnZlcnNlLmJvZHkpKSB7XG4gICAgICBvbWl0TGVmdChwcm9ncmFtLmJvZHkpO1xuICAgICAgb21pdFJpZ2h0KGZpcnN0SW52ZXJzZS5ib2R5KTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoYmxvY2suY2xvc2VTdHJpcC5vcGVuKSB7XG4gICAgb21pdExlZnQocHJvZ3JhbS5ib2R5LCBudWxsLCB0cnVlKTtcbiAgfVxuXG4gIHJldHVybiBzdHJpcDtcbn07XG5cbldoaXRlc3BhY2VDb250cm9sLnByb3RvdHlwZS5NdXN0YWNoZVN0YXRlbWVudCA9IGZ1bmN0aW9uIChtdXN0YWNoZSkge1xuICByZXR1cm4gbXVzdGFjaGUuc3RyaXA7XG59O1xuXG5XaGl0ZXNwYWNlQ29udHJvbC5wcm90b3R5cGUuUGFydGlhbFN0YXRlbWVudCA9IFdoaXRlc3BhY2VDb250cm9sLnByb3RvdHlwZS5Db21tZW50U3RhdGVtZW50ID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgdmFyIHN0cmlwID0gbm9kZS5zdHJpcCB8fCB7fTtcbiAgcmV0dXJuIHtcbiAgICBpbmxpbmVTdGFuZGFsb25lOiB0cnVlLFxuICAgIG9wZW46IHN0cmlwLm9wZW4sXG4gICAgY2xvc2U6IHN0cmlwLmNsb3NlXG4gIH07XG59O1xuXG5mdW5jdGlvbiBpc1ByZXZXaGl0ZXNwYWNlKGJvZHksIGksIGlzUm9vdCkge1xuICBpZiAoaSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaSA9IGJvZHkubGVuZ3RoO1xuICB9XG5cbiAgLy8gTm9kZXMgdGhhdCBlbmQgd2l0aCBuZXdsaW5lcyBhcmUgY29uc2lkZXJlZCB3aGl0ZXNwYWNlIChidXQgYXJlIHNwZWNpYWxcbiAgLy8gY2FzZWQgZm9yIHN0cmlwIG9wZXJhdGlvbnMpXG4gIHZhciBwcmV2ID0gYm9keVtpIC0gMV0sXG4gICAgICBzaWJsaW5nID0gYm9keVtpIC0gMl07XG4gIGlmICghcHJldikge1xuICAgIHJldHVybiBpc1Jvb3Q7XG4gIH1cblxuICBpZiAocHJldi50eXBlID09PSAnQ29udGVudFN0YXRlbWVudCcpIHtcbiAgICByZXR1cm4gKHNpYmxpbmcgfHwgIWlzUm9vdCA/IC9cXHI/XFxuXFxzKj8kLyA6IC8oXnxcXHI/XFxuKVxccyo/JC8pLnRlc3QocHJldi5vcmlnaW5hbCk7XG4gIH1cbn1cbmZ1bmN0aW9uIGlzTmV4dFdoaXRlc3BhY2UoYm9keSwgaSwgaXNSb290KSB7XG4gIGlmIChpID09PSB1bmRlZmluZWQpIHtcbiAgICBpID0gLTE7XG4gIH1cblxuICB2YXIgbmV4dCA9IGJvZHlbaSArIDFdLFxuICAgICAgc2libGluZyA9IGJvZHlbaSArIDJdO1xuICBpZiAoIW5leHQpIHtcbiAgICByZXR1cm4gaXNSb290O1xuICB9XG5cbiAgaWYgKG5leHQudHlwZSA9PT0gJ0NvbnRlbnRTdGF0ZW1lbnQnKSB7XG4gICAgcmV0dXJuIChzaWJsaW5nIHx8ICFpc1Jvb3QgPyAvXlxccyo/XFxyP1xcbi8gOiAvXlxccyo/KFxccj9cXG58JCkvKS50ZXN0KG5leHQub3JpZ2luYWwpO1xuICB9XG59XG5cbi8vIE1hcmtzIHRoZSBub2RlIHRvIHRoZSByaWdodCBvZiB0aGUgcG9zaXRpb24gYXMgb21pdHRlZC5cbi8vIEkuZS4ge3tmb299fScgJyB3aWxsIG1hcmsgdGhlICcgJyBub2RlIGFzIG9taXR0ZWQuXG4vL1xuLy8gSWYgaSBpcyB1bmRlZmluZWQsIHRoZW4gdGhlIGZpcnN0IGNoaWxkIHdpbGwgYmUgbWFya2VkIGFzIHN1Y2guXG4vL1xuLy8gSWYgbXVsaXRwbGUgaXMgdHJ1dGh5IHRoZW4gYWxsIHdoaXRlc3BhY2Ugd2lsbCBiZSBzdHJpcHBlZCBvdXQgdW50aWwgbm9uLXdoaXRlc3BhY2Vcbi8vIGNvbnRlbnQgaXMgbWV0LlxuZnVuY3Rpb24gb21pdFJpZ2h0KGJvZHksIGksIG11bHRpcGxlKSB7XG4gIHZhciBjdXJyZW50ID0gYm9keVtpID09IG51bGwgPyAwIDogaSArIDFdO1xuICBpZiAoIWN1cnJlbnQgfHwgY3VycmVudC50eXBlICE9PSAnQ29udGVudFN0YXRlbWVudCcgfHwgIW11bHRpcGxlICYmIGN1cnJlbnQucmlnaHRTdHJpcHBlZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBvcmlnaW5hbCA9IGN1cnJlbnQudmFsdWU7XG4gIGN1cnJlbnQudmFsdWUgPSBjdXJyZW50LnZhbHVlLnJlcGxhY2UobXVsdGlwbGUgPyAvXlxccysvIDogL15bIFxcdF0qXFxyP1xcbj8vLCAnJyk7XG4gIGN1cnJlbnQucmlnaHRTdHJpcHBlZCA9IGN1cnJlbnQudmFsdWUgIT09IG9yaWdpbmFsO1xufVxuXG4vLyBNYXJrcyB0aGUgbm9kZSB0byB0aGUgbGVmdCBvZiB0aGUgcG9zaXRpb24gYXMgb21pdHRlZC5cbi8vIEkuZS4gJyAne3tmb299fSB3aWxsIG1hcmsgdGhlICcgJyBub2RlIGFzIG9taXR0ZWQuXG4vL1xuLy8gSWYgaSBpcyB1bmRlZmluZWQgdGhlbiB0aGUgbGFzdCBjaGlsZCB3aWxsIGJlIG1hcmtlZCBhcyBzdWNoLlxuLy9cbi8vIElmIG11bGl0cGxlIGlzIHRydXRoeSB0aGVuIGFsbCB3aGl0ZXNwYWNlIHdpbGwgYmUgc3RyaXBwZWQgb3V0IHVudGlsIG5vbi13aGl0ZXNwYWNlXG4vLyBjb250ZW50IGlzIG1ldC5cbmZ1bmN0aW9uIG9taXRMZWZ0KGJvZHksIGksIG11bHRpcGxlKSB7XG4gIHZhciBjdXJyZW50ID0gYm9keVtpID09IG51bGwgPyBib2R5Lmxlbmd0aCAtIDEgOiBpIC0gMV07XG4gIGlmICghY3VycmVudCB8fCBjdXJyZW50LnR5cGUgIT09ICdDb250ZW50U3RhdGVtZW50JyB8fCAhbXVsdGlwbGUgJiYgY3VycmVudC5sZWZ0U3RyaXBwZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBXZSBvbWl0IHRoZSBsYXN0IG5vZGUgaWYgaXQncyB3aGl0ZXNwYWNlIG9ubHkgYW5kIG5vdCBwcmVjZWVkZWQgYnkgYSBub24tY29udGVudCBub2RlLlxuICB2YXIgb3JpZ2luYWwgPSBjdXJyZW50LnZhbHVlO1xuICBjdXJyZW50LnZhbHVlID0gY3VycmVudC52YWx1ZS5yZXBsYWNlKG11bHRpcGxlID8gL1xccyskLyA6IC9bIFxcdF0rJC8sICcnKTtcbiAgY3VycmVudC5sZWZ0U3RyaXBwZWQgPSBjdXJyZW50LnZhbHVlICE9PSBvcmlnaW5hbDtcbiAgcmV0dXJuIGN1cnJlbnQubGVmdFN0cmlwcGVkO1xufVxuXG5leHBvcnRzWydkZWZhdWx0J10gPSBXaGl0ZXNwYWNlQ29udHJvbDtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICB2YXIgbG9jID0gbm9kZSAmJiBub2RlLmxvYyxcbiAgICAgIGxpbmUgPSB1bmRlZmluZWQsXG4gICAgICBjb2x1bW4gPSB1bmRlZmluZWQ7XG4gIGlmIChsb2MpIHtcbiAgICBsaW5lID0gbG9jLnN0YXJ0LmxpbmU7XG4gICAgY29sdW1uID0gbG9jLnN0YXJ0LmNvbHVtbjtcblxuICAgIG1lc3NhZ2UgKz0gJyAtICcgKyBsaW5lICsgJzonICsgY29sdW1uO1xuICB9XG5cbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxuXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEV4Y2VwdGlvbik7XG4gIH1cblxuICBpZiAobG9jKSB7XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IGNvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IEV4Y2VwdGlvbjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbi8qZ2xvYmFsIHdpbmRvdyAqL1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBmdW5jdGlvbiAoSGFuZGxlYmFycykge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICB2YXIgcm9vdCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93LFxuICAgICAgJEhhbmRsZWJhcnMgPSByb290LkhhbmRsZWJhcnM7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIEhhbmRsZWJhcnMubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAocm9vdC5IYW5kbGViYXJzID09PSBIYW5kbGViYXJzKSB7XG4gICAgICByb290LkhhbmRsZWJhcnMgPSAkSGFuZGxlYmFycztcbiAgICB9XG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247XG5cbi8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbmV4cG9ydHMud3JhcFByb2dyYW0gPSB3cmFwUHJvZ3JhbTtcbmV4cG9ydHMucmVzb2x2ZVBhcnRpYWwgPSByZXNvbHZlUGFydGlhbDtcbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7XG5leHBvcnRzLm5vb3AgPSBub29wO1xuXG52YXIgX2ltcG9ydCA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIFV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xuXG5mdW5jdGlvbiBjaGVja1JldmlzaW9uKGNvbXBpbGVySW5mbykge1xuICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICsgJ1BsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKCcgKyBydW50aW1lVmVyc2lvbnMgKyAnKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKCcgKyBjb21waWxlclZlcnNpb25zICsgJykuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArICdQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKCcgKyBjb21waWxlckluZm9bMV0gKyAnKS4nKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlJyk7XG4gIH1cbiAgaWYgKCF0ZW1wbGF0ZVNwZWMgfHwgIXRlbXBsYXRlU3BlYy5tYWluKSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1Vua25vd24gdGVtcGxhdGUgb2JqZWN0OiAnICsgdHlwZW9mIHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxuICBlbnYuVk0uY2hlY2tSZXZpc2lvbih0ZW1wbGF0ZVNwZWMuY29tcGlsZXIpO1xuXG4gIGZ1bmN0aW9uIGludm9rZVBhcnRpYWxXcmFwcGVyKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5oYXNoKSB7XG4gICAgICBjb250ZXh0ID0gVXRpbHMuZXh0ZW5kKHt9LCBjb250ZXh0LCBvcHRpb25zLmhhc2gpO1xuICAgIH1cblxuICAgIHBhcnRpYWwgPSBlbnYuVk0ucmVzb2x2ZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcblxuICAgIGlmIChyZXN1bHQgPT0gbnVsbCAmJiBlbnYuY29tcGlsZSkge1xuICAgICAgb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgdGVtcGxhdGVTcGVjLmNvbXBpbGVyT3B0aW9ucywgZW52KTtcbiAgICAgIHJlc3VsdCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XG4gICAgICBpZiAob3B0aW9ucy5pbmRlbnQpIHtcbiAgICAgICAgdmFyIGxpbmVzID0gcmVzdWx0LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaW5lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICBpZiAoIWxpbmVzW2ldICYmIGkgKyAxID09PSBsKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaW5lc1tpXSA9IG9wdGlvbnMuaW5kZW50ICsgbGluZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gbGluZXMuam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGhlIHBhcnRpYWwgJyArIG9wdGlvbnMubmFtZSArICcgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZScpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEp1c3QgYWRkIHdhdGVyXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgc3RyaWN0OiBmdW5jdGlvbiBzdHJpY3Qob2JqLCBuYW1lKSB7XG4gICAgICBpZiAoIShuYW1lIGluIG9iaikpIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1wiJyArIG5hbWUgKyAnXCIgbm90IGRlZmluZWQgaW4gJyArIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqW25hbWVdO1xuICAgIH0sXG4gICAgbG9va3VwOiBmdW5jdGlvbiBsb29rdXAoZGVwdGhzLCBuYW1lKSB7XG4gICAgICB2YXIgbGVuID0gZGVwdGhzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKGRlcHRoc1tpXSAmJiBkZXB0aHNbaV1bbmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBkZXB0aHNbaV1bbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGxhbWJkYTogZnVuY3Rpb24gbGFtYmRhKGN1cnJlbnQsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgY3VycmVudCA9PT0gJ2Z1bmN0aW9uJyA/IGN1cnJlbnQuY2FsbChjb250ZXh0KSA6IGN1cnJlbnQ7XG4gICAgfSxcblxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG5cbiAgICBmbjogZnVuY3Rpb24gZm4oaSkge1xuICAgICAgcmV0dXJuIHRlbXBsYXRlU3BlY1tpXTtcbiAgICB9LFxuXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uIHByb2dyYW0oaSwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSxcbiAgICAgICAgICBmbiA9IHRoaXMuZm4oaSk7XG4gICAgICBpZiAoZGF0YSB8fCBkZXB0aHMgfHwgYmxvY2tQYXJhbXMgfHwgZGVjbGFyZWRCbG9ja1BhcmFtcykge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHdyYXBQcm9ncmFtKHRoaXMsIGksIGZuLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHdyYXBQcm9ncmFtKHRoaXMsIGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuXG4gICAgZGF0YTogZnVuY3Rpb24gZGF0YSh2YWx1ZSwgZGVwdGgpIHtcbiAgICAgIHdoaWxlICh2YWx1ZSAmJiBkZXB0aC0tKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuX3BhcmVudDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbiBtZXJnZShwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgb2JqID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIHBhcmFtICE9PSBjb21tb24pIHtcbiAgICAgICAgb2JqID0gVXRpbHMuZXh0ZW5kKHt9LCBjb21tb24sIHBhcmFtKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9LFxuXG4gICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgY29tcGlsZXJJbmZvOiB0ZW1wbGF0ZVNwZWMuY29tcGlsZXJcbiAgfTtcblxuICBmdW5jdGlvbiByZXQoY29udGV4dCkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICAgIHZhciBkYXRhID0gb3B0aW9ucy5kYXRhO1xuXG4gICAgcmV0Ll9zZXR1cChvcHRpb25zKTtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCAmJiB0ZW1wbGF0ZVNwZWMudXNlRGF0YSkge1xuICAgICAgZGF0YSA9IGluaXREYXRhKGNvbnRleHQsIGRhdGEpO1xuICAgIH1cbiAgICB2YXIgZGVwdGhzID0gdW5kZWZpbmVkLFxuICAgICAgICBibG9ja1BhcmFtcyA9IHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyA/IFtdIDogdW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzKSB7XG4gICAgICBkZXB0aHMgPSBvcHRpb25zLmRlcHRocyA/IFtjb250ZXh0XS5jb25jYXQob3B0aW9ucy5kZXB0aHMpIDogW2NvbnRleHRdO1xuICAgIH1cblxuICAgIHJldHVybiB0ZW1wbGF0ZVNwZWMubWFpbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gIH1cbiAgcmV0LmlzVG9wID0gdHJ1ZTtcblxuICByZXQuX3NldHVwID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5oZWxwZXJzLCBlbnYuaGVscGVycyk7XG5cbiAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCkge1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5wYXJ0aWFscywgZW52LnBhcnRpYWxzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBjb250YWluZXIucGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgfTtcblxuICByZXQuX2NoaWxkID0gZnVuY3Rpb24gKGksIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zICYmICFibG9ja1BhcmFtcykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ211c3QgcGFzcyBibG9jayBwYXJhbXMnKTtcbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMgJiYgIWRlcHRocykge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ211c3QgcGFzcyBwYXJlbnQgZGVwdGhzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdyYXBQcm9ncmFtKGNvbnRhaW5lciwgaSwgdGVtcGxhdGVTcGVjW2ldLCBkYXRhLCAwLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgfTtcbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICBmdW5jdGlvbiBwcm9nKGNvbnRleHQpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMV07XG5cbiAgICByZXR1cm4gZm4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIG9wdGlvbnMuZGF0YSB8fCBkYXRhLCBibG9ja1BhcmFtcyAmJiBbb3B0aW9ucy5ibG9ja1BhcmFtc10uY29uY2F0KGJsb2NrUGFyYW1zKSwgZGVwdGhzICYmIFtjb250ZXh0XS5jb25jYXQoZGVwdGhzKSk7XG4gIH1cbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGRlcHRocyA/IGRlcHRocy5sZW5ndGggOiAwO1xuICBwcm9nLmJsb2NrUGFyYW1zID0gZGVjbGFyZWRCbG9ja1BhcmFtcyB8fCAwO1xuICByZXR1cm4gcHJvZztcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICBpZiAoIXBhcnRpYWwpIHtcbiAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdO1xuICB9IGVsc2UgaWYgKCFwYXJ0aWFsLmNhbGwgJiYgIW9wdGlvbnMubmFtZSkge1xuICAgIC8vIFRoaXMgaXMgYSBkeW5hbWljIHBhcnRpYWwgdGhhdCByZXR1cm5lZCBhIHN0cmluZ1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnRpYWw7XG4gICAgcGFydGlhbCA9IG9wdGlvbnMucGFydGlhbHNbcGFydGlhbF07XG4gIH1cbiAgcmV0dXJuIHBhcnRpYWw7XG59XG5cbmZ1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICBvcHRpb25zLnBhcnRpYWwgPSB0cnVlO1xuXG4gIGlmIChwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGhlIHBhcnRpYWwgJyArIG9wdGlvbnMubmFtZSArICcgY291bGQgbm90IGJlIGZvdW5kJyk7XG4gIH0gZWxzZSBpZiAocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9vcCgpIHtcbiAgcmV0dXJuICcnO1xufVxuXG5mdW5jdGlvbiBpbml0RGF0YShjb250ZXh0LCBkYXRhKSB7XG4gIGlmICghZGF0YSB8fCAhKCdyb290JyBpbiBkYXRhKSkge1xuICAgIGRhdGEgPSBkYXRhID8gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUuY3JlYXRlRnJhbWUoZGF0YSkgOiB7fTtcbiAgICBkYXRhLnJvb3QgPSBjb250ZXh0O1xuICB9XG4gIHJldHVybiBkYXRhO1xufSIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBTYWZlU3RyaW5nLnByb3RvdHlwZS50b0hUTUwgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnJyArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gU2FmZVN0cmluZztcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO1xuXG4vLyBPbGRlciBJRSB2ZXJzaW9ucyBkbyBub3QgZGlyZWN0bHkgc3VwcG9ydCBpbmRleE9mIHNvIHdlIG11c3QgaW1wbGVtZW50IG91ciBvd24sIHNhZGx5LlxuZXhwb3J0cy5pbmRleE9mID0gaW5kZXhPZjtcbmV4cG9ydHMuZXNjYXBlRXhwcmVzc2lvbiA9IGVzY2FwZUV4cHJlc3Npb247XG5leHBvcnRzLmlzRW1wdHkgPSBpc0VtcHR5O1xuZXhwb3J0cy5ibG9ja1BhcmFtcyA9IGJsb2NrUGFyYW1zO1xuZXhwb3J0cy5hcHBlbmRDb250ZXh0UGF0aCA9IGFwcGVuZENvbnRleHRQYXRoO1xudmFyIGVzY2FwZSA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICAnXFwnJzogJyYjeDI3OycsXG4gICdgJzogJyYjeDYwOydcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZyxcbiAgICBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl07XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmogLyogLCAuLi5zb3VyY2UgKi8pIHtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmV4cG9ydHMudG9TdHJpbmcgPSB0b1N0cmluZztcbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbi8qZXNsaW50LWRpc2FibGUgZnVuYy1zdHlsZSwgbm8tdmFyICovXG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb24gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xufVxudmFyIGlzRnVuY3Rpb247XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuLyplc2xpbnQtZW5hYmxlIGZ1bmMtc3R5bGUsIG5vLXZhciAqL1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O2V4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIHZhbHVlKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnJheS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChhcnJheVtpXSA9PT0gdmFsdWUpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nICYmIHN0cmluZy50b0hUTUwpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9IVE1MKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0gZWxzZSBpZiAoIXN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZyArICcnO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nO1xuICB9XG5cbiAgaWYgKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nO1xuICB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBibG9ja1BhcmFtcyhwYXJhbXMsIGlkcykge1xuICBwYXJhbXMucGF0aCA9IGlkcztcbiAgcmV0dXJuIHBhcmFtcztcbn1cblxuZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XG4gIHJldHVybiAoY29udGV4dFBhdGggPyBjb250ZXh0UGF0aCArICcuJyA6ICcnKSArIGlkO1xufSIsIi8vIFVTQUdFOlxuLy8gdmFyIGhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYW5kbGViYXJzJyk7XG4vKiBlc2xpbnQtZGlzYWJsZSBuby12YXIgKi9cblxuLy8gdmFyIGxvY2FsID0gaGFuZGxlYmFycy5jcmVhdGUoKTtcblxudmFyIGhhbmRsZWJhcnMgPSByZXF1aXJlKCcuLi9kaXN0L2Nqcy9oYW5kbGViYXJzJylbJ2RlZmF1bHQnXTtcblxudmFyIHByaW50ZXIgPSByZXF1aXJlKCcuLi9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL3ByaW50ZXInKTtcbmhhbmRsZWJhcnMuUHJpbnRWaXNpdG9yID0gcHJpbnRlci5QcmludFZpc2l0b3I7XG5oYW5kbGViYXJzLnByaW50ID0gcHJpbnRlci5wcmludDtcblxubW9kdWxlLmV4cG9ydHMgPSBoYW5kbGViYXJzO1xuXG4vLyBQdWJsaXNoIGEgTm9kZS5qcyByZXF1aXJlKCkgaGFuZGxlciBmb3IgLmhhbmRsZWJhcnMgYW5kIC5oYnMgZmlsZXNcbmZ1bmN0aW9uIGV4dGVuc2lvbihtb2R1bGUsIGZpbGVuYW1lKSB7XG4gIHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gIHZhciB0ZW1wbGF0ZVN0cmluZyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlbmFtZSwgJ3V0ZjgnKTtcbiAgbW9kdWxlLmV4cG9ydHMgPSBoYW5kbGViYXJzLmNvbXBpbGUodGVtcGxhdGVTdHJpbmcpO1xufVxuLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbmlmICh0eXBlb2YgcmVxdWlyZSAhPT0gJ3VuZGVmaW5lZCcgJiYgcmVxdWlyZS5leHRlbnNpb25zKSB7XG4gIHJlcXVpcmUuZXh0ZW5zaW9uc1snLmhhbmRsZWJhcnMnXSA9IGV4dGVuc2lvbjtcbiAgcmVxdWlyZS5leHRlbnNpb25zWycuaGJzJ10gPSBleHRlbnNpb247XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMDktMjAxMSBNb3ppbGxhIEZvdW5kYXRpb24gYW5kIGNvbnRyaWJ1dG9yc1xuICogTGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgbGljZW5zZS4gU2VlIExJQ0VOU0UudHh0IG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICovXG5leHBvcnRzLlNvdXJjZU1hcEdlbmVyYXRvciA9IHJlcXVpcmUoJy4vc291cmNlLW1hcC9zb3VyY2UtbWFwLWdlbmVyYXRvcicpLlNvdXJjZU1hcEdlbmVyYXRvcjtcbmV4cG9ydHMuU291cmNlTWFwQ29uc3VtZXIgPSByZXF1aXJlKCcuL3NvdXJjZS1tYXAvc291cmNlLW1hcC1jb25zdW1lcicpLlNvdXJjZU1hcENvbnN1bWVyO1xuZXhwb3J0cy5Tb3VyY2VOb2RlID0gcmVxdWlyZSgnLi9zb3VyY2UtbWFwL3NvdXJjZS1ub2RlJykuU291cmNlTm9kZTtcbiIsIi8qIC0qLSBNb2RlOiBqczsganMtaW5kZW50LWxldmVsOiAyOyAtKi0gKi9cbi8qXG4gKiBDb3B5cmlnaHQgMjAxMSBNb3ppbGxhIEZvdW5kYXRpb24gYW5kIGNvbnRyaWJ1dG9yc1xuICogTGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgbGljZW5zZS4gU2VlIExJQ0VOU0Ugb3I6XG4gKiBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvQlNELTMtQ2xhdXNlXG4gKi9cbmlmICh0eXBlb2YgZGVmaW5lICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGRlZmluZSA9IHJlcXVpcmUoJ2FtZGVmaW5lJykobW9kdWxlLCByZXF1aXJlKTtcbn1cbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG5cbiAgdmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuICAvKipcbiAgICogQSBkYXRhIHN0cnVjdHVyZSB3aGljaCBpcyBhIGNvbWJpbmF0aW9uIG9mIGFuIGFycmF5IGFuZCBhIHNldC4gQWRkaW5nIGEgbmV3XG4gICAqIG1lbWJlciBpcyBPKDEpLCB0ZXN0aW5nIGZvciBtZW1iZXJzaGlwIGlzIE8oMSksIGFuZCBmaW5kaW5nIHRoZSBpbmRleCBvZiBhblxuICAgKiBlbGVtZW50IGlzIE8oMSkuIFJlbW92aW5nIGVsZW1lbnRzIGZyb20gdGhlIHNldCBpcyBub3Qgc3VwcG9ydGVkLiBPbmx5XG4gICAqIHN0cmluZ3MgYXJlIHN1cHBvcnRlZCBmb3IgbWVtYmVyc2hpcC5cbiAgICovXG4gIGZ1bmN0aW9uIEFycmF5U2V0KCkge1xuICAgIHRoaXMuX2FycmF5ID0gW107XG4gICAgdGhpcy5fc2V0ID0ge307XG4gIH1cblxuICAvKipcbiAgICogU3RhdGljIG1ldGhvZCBmb3IgY3JlYXRpbmcgQXJyYXlTZXQgaW5zdGFuY2VzIGZyb20gYW4gZXhpc3RpbmcgYXJyYXkuXG4gICAqL1xuICBBcnJheVNldC5mcm9tQXJyYXkgPSBmdW5jdGlvbiBBcnJheVNldF9mcm9tQXJyYXkoYUFycmF5LCBhQWxsb3dEdXBsaWNhdGVzKSB7XG4gICAgdmFyIHNldCA9IG5ldyBBcnJheVNldCgpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhQXJyYXkubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHNldC5hZGQoYUFycmF5W2ldLCBhQWxsb3dEdXBsaWNhdGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHNldDtcbiAgfTtcblxuICAvKipcbiAgICogQWRkIHRoZSBnaXZlbiBzdHJpbmcgdG8gdGhpcyBzZXQuXG4gICAqXG4gICAqIEBwYXJhbSBTdHJpbmcgYVN0clxuICAgKi9cbiAgQXJyYXlTZXQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIEFycmF5U2V0X2FkZChhU3RyLCBhQWxsb3dEdXBsaWNhdGVzKSB7XG4gICAgdmFyIGlzRHVwbGljYXRlID0gdGhpcy5oYXMoYVN0cik7XG4gICAgdmFyIGlkeCA9IHRoaXMuX2FycmF5Lmxlbmd0aDtcbiAgICBpZiAoIWlzRHVwbGljYXRlIHx8IGFBbGxvd0R1cGxpY2F0ZXMpIHtcbiAgICAgIHRoaXMuX2FycmF5LnB1c2goYVN0cik7XG4gICAgfVxuICAgIGlmICghaXNEdXBsaWNhdGUpIHtcbiAgICAgIHRoaXMuX3NldFt1dGlsLnRvU2V0U3RyaW5nKGFTdHIpXSA9IGlkeDtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIElzIHRoZSBnaXZlbiBzdHJpbmcgYSBtZW1iZXIgb2YgdGhpcyBzZXQ/XG4gICAqXG4gICAqIEBwYXJhbSBTdHJpbmcgYVN0clxuICAgKi9cbiAgQXJyYXlTZXQucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIEFycmF5U2V0X2hhcyhhU3RyKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLl9zZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlsLnRvU2V0U3RyaW5nKGFTdHIpKTtcbiAgfTtcblxuICAvKipcbiAgICogV2hhdCBpcyB0aGUgaW5kZXggb2YgdGhlIGdpdmVuIHN0cmluZyBpbiB0aGUgYXJyYXk/XG4gICAqXG4gICAqIEBwYXJhbSBTdHJpbmcgYVN0clxuICAgKi9cbiAgQXJyYXlTZXQucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBBcnJheVNldF9pbmRleE9mKGFTdHIpIHtcbiAgICBpZiAodGhpcy5oYXMoYVN0cikpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zZXRbdXRpbC50b1NldFN0cmluZyhhU3RyKV07XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignXCInICsgYVN0ciArICdcIiBpcyBub3QgaW4gdGhlIHNldC4nKTtcbiAgfTtcblxuICAvKipcbiAgICogV2hhdCBpcyB0aGUgZWxlbWVudCBhdCB0aGUgZ2l2ZW4gaW5kZXg/XG4gICAqXG4gICAqIEBwYXJhbSBOdW1iZXIgYUlkeFxuICAgKi9cbiAgQXJyYXlTZXQucHJvdG90eXBlLmF0ID0gZnVuY3Rpb24gQXJyYXlTZXRfYXQoYUlkeCkge1xuICAgIGlmIChhSWR4ID49IDAgJiYgYUlkeCA8IHRoaXMuX2FycmF5Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FycmF5W2FJZHhdO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGVsZW1lbnQgaW5kZXhlZCBieSAnICsgYUlkeCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGFycmF5IHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgc2V0ICh3aGljaCBoYXMgdGhlIHByb3BlciBpbmRpY2VzXG4gICAqIGluZGljYXRlZCBieSBpbmRleE9mKS4gTm90ZSB0aGF0IHRoaXMgaXMgYSBjb3B5IG9mIHRoZSBpbnRlcm5hbCBhcnJheSB1c2VkXG4gICAqIGZvciBzdG9yaW5nIHRoZSBtZW1iZXJzIHNvIHRoYXQgbm8gb25lIGNhbiBtZXNzIHdpdGggaW50ZXJuYWwgc3RhdGUuXG4gICAqL1xuICBBcnJheVNldC5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uIEFycmF5U2V0X3RvQXJyYXkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FycmF5LnNsaWNlKCk7XG4gIH07XG5cbiAgZXhwb3J0cy5BcnJheVNldCA9IEFycmF5U2V0O1xuXG59KTtcbiIsIi8qIC0qLSBNb2RlOiBqczsganMtaW5kZW50LWxldmVsOiAyOyAtKi0gKi9cbi8qXG4gKiBDb3B5cmlnaHQgMjAxMSBNb3ppbGxhIEZvdW5kYXRpb24gYW5kIGNvbnRyaWJ1dG9yc1xuICogTGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgbGljZW5zZS4gU2VlIExJQ0VOU0Ugb3I6XG4gKiBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvQlNELTMtQ2xhdXNlXG4gKlxuICogQmFzZWQgb24gdGhlIEJhc2UgNjQgVkxRIGltcGxlbWVudGF0aW9uIGluIENsb3N1cmUgQ29tcGlsZXI6XG4gKiBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nsb3N1cmUtY29tcGlsZXIvc291cmNlL2Jyb3dzZS90cnVuay9zcmMvY29tL2dvb2dsZS9kZWJ1Z2dpbmcvc291cmNlbWFwL0Jhc2U2NFZMUS5qYXZhXG4gKlxuICogQ29weXJpZ2h0IDIwMTEgVGhlIENsb3N1cmUgQ29tcGlsZXIgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICogbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZVxuICogbWV0OlxuICpcbiAqICAqIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0XG4gKiAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4gKiAgKiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlXG4gKiAgICBjb3B5cmlnaHQgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZ1xuICogICAgZGlzY2xhaW1lciBpbiB0aGUgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkXG4gKiAgICB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG4gKiAgKiBOZWl0aGVyIHRoZSBuYW1lIG9mIEdvb2dsZSBJbmMuIG5vciB0aGUgbmFtZXMgb2YgaXRzXG4gKiAgICBjb250cmlidXRvcnMgbWF5IGJlIHVzZWQgdG8gZW5kb3JzZSBvciBwcm9tb3RlIHByb2R1Y3RzIGRlcml2ZWRcbiAqICAgIGZyb20gdGhpcyBzb2Z0d2FyZSB3aXRob3V0IHNwZWNpZmljIHByaW9yIHdyaXR0ZW4gcGVybWlzc2lvbi5cbiAqXG4gKiBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIFRIRSBDT1BZUklHSFQgSE9MREVSUyBBTkQgQ09OVFJJQlVUT1JTXG4gKiBcIkFTIElTXCIgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UXG4gKiBMSU1JVEVEIFRPLCBUSEUgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1JcbiAqIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRSBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQ09QWVJJR0hUXG4gKiBPV05FUiBPUiBDT05UUklCVVRPUlMgQkUgTElBQkxFIEZPUiBBTlkgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCxcbiAqIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIChJTkNMVURJTkcsIEJVVCBOT1RcbiAqIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7IExPU1MgT0YgVVNFLFxuICogREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkQgT04gQU5ZXG4gKiBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gKiAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0VcbiAqIE9GIFRISVMgU09GVFdBUkUsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4gKi9cbmlmICh0eXBlb2YgZGVmaW5lICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGRlZmluZSA9IHJlcXVpcmUoJ2FtZGVmaW5lJykobW9kdWxlLCByZXF1aXJlKTtcbn1cbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG5cbiAgdmFyIGJhc2U2NCA9IHJlcXVpcmUoJy4vYmFzZTY0Jyk7XG5cbiAgLy8gQSBzaW5nbGUgYmFzZSA2NCBkaWdpdCBjYW4gY29udGFpbiA2IGJpdHMgb2YgZGF0YS4gRm9yIHRoZSBiYXNlIDY0IHZhcmlhYmxlXG4gIC8vIGxlbmd0aCBxdWFudGl0aWVzIHdlIHVzZSBpbiB0aGUgc291cmNlIG1hcCBzcGVjLCB0aGUgZmlyc3QgYml0IGlzIHRoZSBzaWduLFxuICAvLyB0aGUgbmV4dCBmb3VyIGJpdHMgYXJlIHRoZSBhY3R1YWwgdmFsdWUsIGFuZCB0aGUgNnRoIGJpdCBpcyB0aGVcbiAgLy8gY29udGludWF0aW9uIGJpdC4gVGhlIGNvbnRpbnVhdGlvbiBiaXQgdGVsbHMgdXMgd2hldGhlciB0aGVyZSBhcmUgbW9yZVxuICAvLyBkaWdpdHMgaW4gdGhpcyB2YWx1ZSBmb2xsb3dpbmcgdGhpcyBkaWdpdC5cbiAgLy9cbiAgLy8gICBDb250aW51YXRpb25cbiAgLy8gICB8ICAgIFNpZ25cbiAgLy8gICB8ICAgIHxcbiAgLy8gICBWICAgIFZcbiAgLy8gICAxMDEwMTFcblxuICB2YXIgVkxRX0JBU0VfU0hJRlQgPSA1O1xuXG4gIC8vIGJpbmFyeTogMTAwMDAwXG4gIHZhciBWTFFfQkFTRSA9IDEgPDwgVkxRX0JBU0VfU0hJRlQ7XG5cbiAgLy8gYmluYXJ5OiAwMTExMTFcbiAgdmFyIFZMUV9CQVNFX01BU0sgPSBWTFFfQkFTRSAtIDE7XG5cbiAgLy8gYmluYXJ5OiAxMDAwMDBcbiAgdmFyIFZMUV9DT05USU5VQVRJT05fQklUID0gVkxRX0JBU0U7XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGZyb20gYSB0d28tY29tcGxlbWVudCB2YWx1ZSB0byBhIHZhbHVlIHdoZXJlIHRoZSBzaWduIGJpdCBpc1xuICAgKiBwbGFjZWQgaW4gdGhlIGxlYXN0IHNpZ25pZmljYW50IGJpdC4gIEZvciBleGFtcGxlLCBhcyBkZWNpbWFsczpcbiAgICogICAxIGJlY29tZXMgMiAoMTAgYmluYXJ5KSwgLTEgYmVjb21lcyAzICgxMSBiaW5hcnkpXG4gICAqICAgMiBiZWNvbWVzIDQgKDEwMCBiaW5hcnkpLCAtMiBiZWNvbWVzIDUgKDEwMSBiaW5hcnkpXG4gICAqL1xuICBmdW5jdGlvbiB0b1ZMUVNpZ25lZChhVmFsdWUpIHtcbiAgICByZXR1cm4gYVZhbHVlIDwgMFxuICAgICAgPyAoKC1hVmFsdWUpIDw8IDEpICsgMVxuICAgICAgOiAoYVZhbHVlIDw8IDEpICsgMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyB0byBhIHR3by1jb21wbGVtZW50IHZhbHVlIGZyb20gYSB2YWx1ZSB3aGVyZSB0aGUgc2lnbiBiaXQgaXNcbiAgICogcGxhY2VkIGluIHRoZSBsZWFzdCBzaWduaWZpY2FudCBiaXQuICBGb3IgZXhhbXBsZSwgYXMgZGVjaW1hbHM6XG4gICAqICAgMiAoMTAgYmluYXJ5KSBiZWNvbWVzIDEsIDMgKDExIGJpbmFyeSkgYmVjb21lcyAtMVxuICAgKiAgIDQgKDEwMCBiaW5hcnkpIGJlY29tZXMgMiwgNSAoMTAxIGJpbmFyeSkgYmVjb21lcyAtMlxuICAgKi9cbiAgZnVuY3Rpb24gZnJvbVZMUVNpZ25lZChhVmFsdWUpIHtcbiAgICB2YXIgaXNOZWdhdGl2ZSA9IChhVmFsdWUgJiAxKSA9PT0gMTtcbiAgICB2YXIgc2hpZnRlZCA9IGFWYWx1ZSA+PiAxO1xuICAgIHJldHVybiBpc05lZ2F0aXZlXG4gICAgICA/IC1zaGlmdGVkXG4gICAgICA6IHNoaWZ0ZWQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYmFzZSA2NCBWTFEgZW5jb2RlZCB2YWx1ZS5cbiAgICovXG4gIGV4cG9ydHMuZW5jb2RlID0gZnVuY3Rpb24gYmFzZTY0VkxRX2VuY29kZShhVmFsdWUpIHtcbiAgICB2YXIgZW5jb2RlZCA9IFwiXCI7XG4gICAgdmFyIGRpZ2l0O1xuXG4gICAgdmFyIHZscSA9IHRvVkxRU2lnbmVkKGFWYWx1ZSk7XG5cbiAgICBkbyB7XG4gICAgICBkaWdpdCA9IHZscSAmIFZMUV9CQVNFX01BU0s7XG4gICAgICB2bHEgPj4+PSBWTFFfQkFTRV9TSElGVDtcbiAgICAgIGlmICh2bHEgPiAwKSB7XG4gICAgICAgIC8vIFRoZXJlIGFyZSBzdGlsbCBtb3JlIGRpZ2l0cyBpbiB0aGlzIHZhbHVlLCBzbyB3ZSBtdXN0IG1ha2Ugc3VyZSB0aGVcbiAgICAgICAgLy8gY29udGludWF0aW9uIGJpdCBpcyBtYXJrZWQuXG4gICAgICAgIGRpZ2l0IHw9IFZMUV9DT05USU5VQVRJT05fQklUO1xuICAgICAgfVxuICAgICAgZW5jb2RlZCArPSBiYXNlNjQuZW5jb2RlKGRpZ2l0KTtcbiAgICB9IHdoaWxlICh2bHEgPiAwKTtcblxuICAgIHJldHVybiBlbmNvZGVkO1xuICB9O1xuXG4gIC8qKlxuICAgKiBEZWNvZGVzIHRoZSBuZXh0IGJhc2UgNjQgVkxRIHZhbHVlIGZyb20gdGhlIGdpdmVuIHN0cmluZyBhbmQgcmV0dXJucyB0aGVcbiAgICogdmFsdWUgYW5kIHRoZSByZXN0IG9mIHRoZSBzdHJpbmcgdmlhIHRoZSBvdXQgcGFyYW1ldGVyLlxuICAgKi9cbiAgZXhwb3J0cy5kZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjRWTFFfZGVjb2RlKGFTdHIsIGFPdXRQYXJhbSkge1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgc3RyTGVuID0gYVN0ci5sZW5ndGg7XG4gICAgdmFyIHJlc3VsdCA9IDA7XG4gICAgdmFyIHNoaWZ0ID0gMDtcbiAgICB2YXIgY29udGludWF0aW9uLCBkaWdpdDtcblxuICAgIGRvIHtcbiAgICAgIGlmIChpID49IHN0ckxlbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBtb3JlIGRpZ2l0cyBpbiBiYXNlIDY0IFZMUSB2YWx1ZS5cIik7XG4gICAgICB9XG4gICAgICBkaWdpdCA9IGJhc2U2NC5kZWNvZGUoYVN0ci5jaGFyQXQoaSsrKSk7XG4gICAgICBjb250aW51YXRpb24gPSAhIShkaWdpdCAmIFZMUV9DT05USU5VQVRJT05fQklUKTtcbiAgICAgIGRpZ2l0ICY9IFZMUV9CQVNFX01BU0s7XG4gICAgICByZXN1bHQgPSByZXN1bHQgKyAoZGlnaXQgPDwgc2hpZnQpO1xuICAgICAgc2hpZnQgKz0gVkxRX0JBU0VfU0hJRlQ7XG4gICAgfSB3aGlsZSAoY29udGludWF0aW9uKTtcblxuICAgIGFPdXRQYXJhbS52YWx1ZSA9IGZyb21WTFFTaWduZWQocmVzdWx0KTtcbiAgICBhT3V0UGFyYW0ucmVzdCA9IGFTdHIuc2xpY2UoaSk7XG4gIH07XG5cbn0pO1xuIiwiLyogLSotIE1vZGU6IGpzOyBqcy1pbmRlbnQtbGV2ZWw6IDI7IC0qLSAqL1xuLypcbiAqIENvcHlyaWdodCAyMDExIE1vemlsbGEgRm91bmRhdGlvbiBhbmQgY29udHJpYnV0b3JzXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBsaWNlbnNlLiBTZWUgTElDRU5TRSBvcjpcbiAqIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9CU0QtMy1DbGF1c2VcbiAqL1xuaWYgKHR5cGVvZiBkZWZpbmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgZGVmaW5lID0gcmVxdWlyZSgnYW1kZWZpbmUnKShtb2R1bGUsIHJlcXVpcmUpO1xufVxuZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcblxuICB2YXIgY2hhclRvSW50TWFwID0ge307XG4gIHZhciBpbnRUb0NoYXJNYXAgPSB7fTtcblxuICAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbiAgICAuc3BsaXQoJycpXG4gICAgLmZvckVhY2goZnVuY3Rpb24gKGNoLCBpbmRleCkge1xuICAgICAgY2hhclRvSW50TWFwW2NoXSA9IGluZGV4O1xuICAgICAgaW50VG9DaGFyTWFwW2luZGV4XSA9IGNoO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBFbmNvZGUgYW4gaW50ZWdlciBpbiB0aGUgcmFuZ2Ugb2YgMCB0byA2MyB0byBhIHNpbmdsZSBiYXNlIDY0IGRpZ2l0LlxuICAgKi9cbiAgZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbiBiYXNlNjRfZW5jb2RlKGFOdW1iZXIpIHtcbiAgICBpZiAoYU51bWJlciBpbiBpbnRUb0NoYXJNYXApIHtcbiAgICAgIHJldHVybiBpbnRUb0NoYXJNYXBbYU51bWJlcl07XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJNdXN0IGJlIGJldHdlZW4gMCBhbmQgNjM6IFwiICsgYU51bWJlcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIERlY29kZSBhIHNpbmdsZSBiYXNlIDY0IGRpZ2l0IHRvIGFuIGludGVnZXIuXG4gICAqL1xuICBleHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uIGJhc2U2NF9kZWNvZGUoYUNoYXIpIHtcbiAgICBpZiAoYUNoYXIgaW4gY2hhclRvSW50TWFwKSB7XG4gICAgICByZXR1cm4gY2hhclRvSW50TWFwW2FDaGFyXTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vdCBhIHZhbGlkIGJhc2UgNjQgZGlnaXQ6IFwiICsgYUNoYXIpO1xuICB9O1xuXG59KTtcbiIsIi8qIC0qLSBNb2RlOiBqczsganMtaW5kZW50LWxldmVsOiAyOyAtKi0gKi9cbi8qXG4gKiBDb3B5cmlnaHQgMjAxMSBNb3ppbGxhIEZvdW5kYXRpb24gYW5kIGNvbnRyaWJ1dG9yc1xuICogTGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgbGljZW5zZS4gU2VlIExJQ0VOU0Ugb3I6XG4gKiBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvQlNELTMtQ2xhdXNlXG4gKi9cbmlmICh0eXBlb2YgZGVmaW5lICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGRlZmluZSA9IHJlcXVpcmUoJ2FtZGVmaW5lJykobW9kdWxlLCByZXF1aXJlKTtcbn1cbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG5cbiAgLyoqXG4gICAqIFJlY3Vyc2l2ZSBpbXBsZW1lbnRhdGlvbiBvZiBiaW5hcnkgc2VhcmNoLlxuICAgKlxuICAgKiBAcGFyYW0gYUxvdyBJbmRpY2VzIGhlcmUgYW5kIGxvd2VyIGRvIG5vdCBjb250YWluIHRoZSBuZWVkbGUuXG4gICAqIEBwYXJhbSBhSGlnaCBJbmRpY2VzIGhlcmUgYW5kIGhpZ2hlciBkbyBub3QgY29udGFpbiB0aGUgbmVlZGxlLlxuICAgKiBAcGFyYW0gYU5lZWRsZSBUaGUgZWxlbWVudCBiZWluZyBzZWFyY2hlZCBmb3IuXG4gICAqIEBwYXJhbSBhSGF5c3RhY2sgVGhlIG5vbi1lbXB0eSBhcnJheSBiZWluZyBzZWFyY2hlZC5cbiAgICogQHBhcmFtIGFDb21wYXJlIEZ1bmN0aW9uIHdoaWNoIHRha2VzIHR3byBlbGVtZW50cyBhbmQgcmV0dXJucyAtMSwgMCwgb3IgMS5cbiAgICovXG4gIGZ1bmN0aW9uIHJlY3Vyc2l2ZVNlYXJjaChhTG93LCBhSGlnaCwgYU5lZWRsZSwgYUhheXN0YWNrLCBhQ29tcGFyZSkge1xuICAgIC8vIFRoaXMgZnVuY3Rpb24gdGVybWluYXRlcyB3aGVuIG9uZSBvZiB0aGUgZm9sbG93aW5nIGlzIHRydWU6XG4gICAgLy9cbiAgICAvLyAgIDEuIFdlIGZpbmQgdGhlIGV4YWN0IGVsZW1lbnQgd2UgYXJlIGxvb2tpbmcgZm9yLlxuICAgIC8vXG4gICAgLy8gICAyLiBXZSBkaWQgbm90IGZpbmQgdGhlIGV4YWN0IGVsZW1lbnQsIGJ1dCB3ZSBjYW4gcmV0dXJuIHRoZSBpbmRleCBvZlxuICAgIC8vICAgICAgdGhlIG5leHQgY2xvc2VzdCBlbGVtZW50IHRoYXQgaXMgbGVzcyB0aGFuIHRoYXQgZWxlbWVudC5cbiAgICAvL1xuICAgIC8vICAgMy4gV2UgZGlkIG5vdCBmaW5kIHRoZSBleGFjdCBlbGVtZW50LCBhbmQgdGhlcmUgaXMgbm8gbmV4dC1jbG9zZXN0XG4gICAgLy8gICAgICBlbGVtZW50IHdoaWNoIGlzIGxlc3MgdGhhbiB0aGUgb25lIHdlIGFyZSBzZWFyY2hpbmcgZm9yLCBzbyB3ZVxuICAgIC8vICAgICAgcmV0dXJuIC0xLlxuICAgIHZhciBtaWQgPSBNYXRoLmZsb29yKChhSGlnaCAtIGFMb3cpIC8gMikgKyBhTG93O1xuICAgIHZhciBjbXAgPSBhQ29tcGFyZShhTmVlZGxlLCBhSGF5c3RhY2tbbWlkXSwgdHJ1ZSk7XG4gICAgaWYgKGNtcCA9PT0gMCkge1xuICAgICAgLy8gRm91bmQgdGhlIGVsZW1lbnQgd2UgYXJlIGxvb2tpbmcgZm9yLlxuICAgICAgcmV0dXJuIG1pZDtcbiAgICB9XG4gICAgZWxzZSBpZiAoY21wID4gMCkge1xuICAgICAgLy8gYUhheXN0YWNrW21pZF0gaXMgZ3JlYXRlciB0aGFuIG91ciBuZWVkbGUuXG4gICAgICBpZiAoYUhpZ2ggLSBtaWQgPiAxKSB7XG4gICAgICAgIC8vIFRoZSBlbGVtZW50IGlzIGluIHRoZSB1cHBlciBoYWxmLlxuICAgICAgICByZXR1cm4gcmVjdXJzaXZlU2VhcmNoKG1pZCwgYUhpZ2gsIGFOZWVkbGUsIGFIYXlzdGFjaywgYUNvbXBhcmUpO1xuICAgICAgfVxuICAgICAgLy8gV2UgZGlkIG5vdCBmaW5kIGFuIGV4YWN0IG1hdGNoLCByZXR1cm4gdGhlIG5leHQgY2xvc2VzdCBvbmVcbiAgICAgIC8vICh0ZXJtaW5hdGlvbiBjYXNlIDIpLlxuICAgICAgcmV0dXJuIG1pZDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBhSGF5c3RhY2tbbWlkXSBpcyBsZXNzIHRoYW4gb3VyIG5lZWRsZS5cbiAgICAgIGlmIChtaWQgLSBhTG93ID4gMSkge1xuICAgICAgICAvLyBUaGUgZWxlbWVudCBpcyBpbiB0aGUgbG93ZXIgaGFsZi5cbiAgICAgICAgcmV0dXJuIHJlY3Vyc2l2ZVNlYXJjaChhTG93LCBtaWQsIGFOZWVkbGUsIGFIYXlzdGFjaywgYUNvbXBhcmUpO1xuICAgICAgfVxuICAgICAgLy8gVGhlIGV4YWN0IG5lZWRsZSBlbGVtZW50IHdhcyBub3QgZm91bmQgaW4gdGhpcyBoYXlzdGFjay4gRGV0ZXJtaW5lIGlmXG4gICAgICAvLyB3ZSBhcmUgaW4gdGVybWluYXRpb24gY2FzZSAoMikgb3IgKDMpIGFuZCByZXR1cm4gdGhlIGFwcHJvcHJpYXRlIHRoaW5nLlxuICAgICAgcmV0dXJuIGFMb3cgPCAwID8gLTEgOiBhTG93O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIGJpbmFyeSBzZWFyY2ggd2hpY2ggd2lsbCBhbHdheXMgdHJ5IGFuZCByZXR1cm5cbiAgICogdGhlIGluZGV4IG9mIG5leHQgbG93ZXN0IHZhbHVlIGNoZWNrZWQgaWYgdGhlcmUgaXMgbm8gZXhhY3QgaGl0LiBUaGlzIGlzXG4gICAqIGJlY2F1c2UgbWFwcGluZ3MgYmV0d2VlbiBvcmlnaW5hbCBhbmQgZ2VuZXJhdGVkIGxpbmUvY29sIHBhaXJzIGFyZSBzaW5nbGVcbiAgICogcG9pbnRzLCBhbmQgdGhlcmUgaXMgYW4gaW1wbGljaXQgcmVnaW9uIGJldHdlZW4gZWFjaCBvZiB0aGVtLCBzbyBhIG1pc3NcbiAgICoganVzdCBtZWFucyB0aGF0IHlvdSBhcmVuJ3Qgb24gdGhlIHZlcnkgc3RhcnQgb2YgYSByZWdpb24uXG4gICAqXG4gICAqIEBwYXJhbSBhTmVlZGxlIFRoZSBlbGVtZW50IHlvdSBhcmUgbG9va2luZyBmb3IuXG4gICAqIEBwYXJhbSBhSGF5c3RhY2sgVGhlIGFycmF5IHRoYXQgaXMgYmVpbmcgc2VhcmNoZWQuXG4gICAqIEBwYXJhbSBhQ29tcGFyZSBBIGZ1bmN0aW9uIHdoaWNoIHRha2VzIHRoZSBuZWVkbGUgYW5kIGFuIGVsZW1lbnQgaW4gdGhlXG4gICAqICAgICBhcnJheSBhbmQgcmV0dXJucyAtMSwgMCwgb3IgMSBkZXBlbmRpbmcgb24gd2hldGhlciB0aGUgbmVlZGxlIGlzIGxlc3NcbiAgICogICAgIHRoYW4sIGVxdWFsIHRvLCBvciBncmVhdGVyIHRoYW4gdGhlIGVsZW1lbnQsIHJlc3BlY3RpdmVseS5cbiAgICovXG4gIGV4cG9ydHMuc2VhcmNoID0gZnVuY3Rpb24gc2VhcmNoKGFOZWVkbGUsIGFIYXlzdGFjaywgYUNvbXBhcmUpIHtcbiAgICBpZiAoYUhheXN0YWNrLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICByZXR1cm4gcmVjdXJzaXZlU2VhcmNoKC0xLCBhSGF5c3RhY2subGVuZ3RoLCBhTmVlZGxlLCBhSGF5c3RhY2ssIGFDb21wYXJlKVxuICB9O1xuXG59KTtcbiIsIi8qIC0qLSBNb2RlOiBqczsganMtaW5kZW50LWxldmVsOiAyOyAtKi0gKi9cbi8qXG4gKiBDb3B5cmlnaHQgMjAxNCBNb3ppbGxhIEZvdW5kYXRpb24gYW5kIGNvbnRyaWJ1dG9yc1xuICogTGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgbGljZW5zZS4gU2VlIExJQ0VOU0Ugb3I6XG4gKiBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvQlNELTMtQ2xhdXNlXG4gKi9cbmlmICh0eXBlb2YgZGVmaW5lICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGRlZmluZSA9IHJlcXVpcmUoJ2FtZGVmaW5lJykobW9kdWxlLCByZXF1aXJlKTtcbn1cbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG5cbiAgdmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lIHdoZXRoZXIgbWFwcGluZ0IgaXMgYWZ0ZXIgbWFwcGluZ0Egd2l0aCByZXNwZWN0IHRvIGdlbmVyYXRlZFxuICAgKiBwb3NpdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGdlbmVyYXRlZFBvc2l0aW9uQWZ0ZXIobWFwcGluZ0EsIG1hcHBpbmdCKSB7XG4gICAgLy8gT3B0aW1pemVkIGZvciBtb3N0IGNvbW1vbiBjYXNlXG4gICAgdmFyIGxpbmVBID0gbWFwcGluZ0EuZ2VuZXJhdGVkTGluZTtcbiAgICB2YXIgbGluZUIgPSBtYXBwaW5nQi5nZW5lcmF0ZWRMaW5lO1xuICAgIHZhciBjb2x1bW5BID0gbWFwcGluZ0EuZ2VuZXJhdGVkQ29sdW1uO1xuICAgIHZhciBjb2x1bW5CID0gbWFwcGluZ0IuZ2VuZXJhdGVkQ29sdW1uO1xuICAgIHJldHVybiBsaW5lQiA+IGxpbmVBIHx8IGxpbmVCID09IGxpbmVBICYmIGNvbHVtbkIgPj0gY29sdW1uQSB8fFxuICAgICAgICAgICB1dGlsLmNvbXBhcmVCeUdlbmVyYXRlZFBvc2l0aW9ucyhtYXBwaW5nQSwgbWFwcGluZ0IpIDw9IDA7XG4gIH1cblxuICAvKipcbiAgICogQSBkYXRhIHN0cnVjdHVyZSB0byBwcm92aWRlIGEgc29ydGVkIHZpZXcgb2YgYWNjdW11bGF0ZWQgbWFwcGluZ3MgaW4gYVxuICAgKiBwZXJmb3JtYW5jZSBjb25zY2lvdXMgbWFubmVyLiBJdCB0cmFkZXMgYSBuZWdsaWJhYmxlIG92ZXJoZWFkIGluIGdlbmVyYWxcbiAgICogY2FzZSBmb3IgYSBsYXJnZSBzcGVlZHVwIGluIGNhc2Ugb2YgbWFwcGluZ3MgYmVpbmcgYWRkZWQgaW4gb3JkZXIuXG4gICAqL1xuICBmdW5jdGlvbiBNYXBwaW5nTGlzdCgpIHtcbiAgICB0aGlzLl9hcnJheSA9IFtdO1xuICAgIHRoaXMuX3NvcnRlZCA9IHRydWU7XG4gICAgLy8gU2VydmVzIGFzIGluZmltdW1cbiAgICB0aGlzLl9sYXN0ID0ge2dlbmVyYXRlZExpbmU6IC0xLCBnZW5lcmF0ZWRDb2x1bW46IDB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgdGhyb3VnaCBpbnRlcm5hbCBpdGVtcy4gVGhpcyBtZXRob2QgdGFrZXMgdGhlIHNhbWUgYXJndW1lbnRzIHRoYXRcbiAgICogYEFycmF5LnByb3RvdHlwZS5mb3JFYWNoYCB0YWtlcy5cbiAgICpcbiAgICogTk9URTogVGhlIG9yZGVyIG9mIHRoZSBtYXBwaW5ncyBpcyBOT1QgZ3VhcmFudGVlZC5cbiAgICovXG4gIE1hcHBpbmdMaXN0LnByb3RvdHlwZS51bnNvcnRlZEZvckVhY2ggPVxuICAgIGZ1bmN0aW9uIE1hcHBpbmdMaXN0X2ZvckVhY2goYUNhbGxiYWNrLCBhVGhpc0FyZykge1xuICAgICAgdGhpcy5fYXJyYXkuZm9yRWFjaChhQ2FsbGJhY2ssIGFUaGlzQXJnKTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGdpdmVuIHNvdXJjZSBtYXBwaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gT2JqZWN0IGFNYXBwaW5nXG4gICAqL1xuICBNYXBwaW5nTGlzdC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gTWFwcGluZ0xpc3RfYWRkKGFNYXBwaW5nKSB7XG4gICAgdmFyIG1hcHBpbmc7XG4gICAgaWYgKGdlbmVyYXRlZFBvc2l0aW9uQWZ0ZXIodGhpcy5fbGFzdCwgYU1hcHBpbmcpKSB7XG4gICAgICB0aGlzLl9sYXN0ID0gYU1hcHBpbmc7XG4gICAgICB0aGlzLl9hcnJheS5wdXNoKGFNYXBwaW5nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc29ydGVkID0gZmFsc2U7XG4gICAgICB0aGlzLl9hcnJheS5wdXNoKGFNYXBwaW5nKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGZsYXQsIHNvcnRlZCBhcnJheSBvZiBtYXBwaW5ncy4gVGhlIG1hcHBpbmdzIGFyZSBzb3J0ZWQgYnlcbiAgICogZ2VuZXJhdGVkIHBvc2l0aW9uLlxuICAgKlxuICAgKiBXQVJOSU5HOiBUaGlzIG1ldGhvZCByZXR1cm5zIGludGVybmFsIGRhdGEgd2l0aG91dCBjb3B5aW5nLCBmb3JcbiAgICogcGVyZm9ybWFuY2UuIFRoZSByZXR1cm4gdmFsdWUgbXVzdCBOT1QgYmUgbXV0YXRlZCwgYW5kIHNob3VsZCBiZSB0cmVhdGVkIGFzXG4gICAqIGFuIGltbXV0YWJsZSBib3Jyb3cuIElmIHlvdSB3YW50IHRvIHRha2Ugb3duZXJzaGlwLCB5b3UgbXVzdCBtYWtlIHlvdXIgb3duXG4gICAqIGNvcHkuXG4gICAqL1xuICBNYXBwaW5nTGlzdC5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uIE1hcHBpbmdMaXN0X3RvQXJyYXkoKSB7XG4gICAgaWYgKCF0aGlzLl9zb3J0ZWQpIHtcbiAgICAgIHRoaXMuX2FycmF5LnNvcnQodXRpbC5jb21wYXJlQnlHZW5lcmF0ZWRQb3NpdGlvbnMpO1xuICAgICAgdGhpcy5fc29ydGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FycmF5O1xuICB9O1xuXG4gIGV4cG9ydHMuTWFwcGluZ0xpc3QgPSBNYXBwaW5nTGlzdDtcblxufSk7XG4iLCIvKiAtKi0gTW9kZToganM7IGpzLWluZGVudC1sZXZlbDogMjsgLSotICovXG4vKlxuICogQ29weXJpZ2h0IDIwMTEgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFIG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBkZWZpbmUgPSByZXF1aXJlKCdhbWRlZmluZScpKG1vZHVsZSwgcmVxdWlyZSk7XG59XG5kZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gIHZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG4gIHZhciBiaW5hcnlTZWFyY2ggPSByZXF1aXJlKCcuL2JpbmFyeS1zZWFyY2gnKTtcbiAgdmFyIEFycmF5U2V0ID0gcmVxdWlyZSgnLi9hcnJheS1zZXQnKS5BcnJheVNldDtcbiAgdmFyIGJhc2U2NFZMUSA9IHJlcXVpcmUoJy4vYmFzZTY0LXZscScpO1xuXG4gIC8qKlxuICAgKiBBIFNvdXJjZU1hcENvbnN1bWVyIGluc3RhbmNlIHJlcHJlc2VudHMgYSBwYXJzZWQgc291cmNlIG1hcCB3aGljaCB3ZSBjYW5cbiAgICogcXVlcnkgZm9yIGluZm9ybWF0aW9uIGFib3V0IHRoZSBvcmlnaW5hbCBmaWxlIHBvc2l0aW9ucyBieSBnaXZpbmcgaXQgYSBmaWxlXG4gICAqIHBvc2l0aW9uIGluIHRoZSBnZW5lcmF0ZWQgc291cmNlLlxuICAgKlxuICAgKiBUaGUgb25seSBwYXJhbWV0ZXIgaXMgdGhlIHJhdyBzb3VyY2UgbWFwIChlaXRoZXIgYXMgYSBKU09OIHN0cmluZywgb3JcbiAgICogYWxyZWFkeSBwYXJzZWQgdG8gYW4gb2JqZWN0KS4gQWNjb3JkaW5nIHRvIHRoZSBzcGVjLCBzb3VyY2UgbWFwcyBoYXZlIHRoZVxuICAgKiBmb2xsb3dpbmcgYXR0cmlidXRlczpcbiAgICpcbiAgICogICAtIHZlcnNpb246IFdoaWNoIHZlcnNpb24gb2YgdGhlIHNvdXJjZSBtYXAgc3BlYyB0aGlzIG1hcCBpcyBmb2xsb3dpbmcuXG4gICAqICAgLSBzb3VyY2VzOiBBbiBhcnJheSBvZiBVUkxzIHRvIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZXMuXG4gICAqICAgLSBuYW1lczogQW4gYXJyYXkgb2YgaWRlbnRpZmllcnMgd2hpY2ggY2FuIGJlIHJlZmVycmVuY2VkIGJ5IGluZGl2aWR1YWwgbWFwcGluZ3MuXG4gICAqICAgLSBzb3VyY2VSb290OiBPcHRpb25hbC4gVGhlIFVSTCByb290IGZyb20gd2hpY2ggYWxsIHNvdXJjZXMgYXJlIHJlbGF0aXZlLlxuICAgKiAgIC0gc291cmNlc0NvbnRlbnQ6IE9wdGlvbmFsLiBBbiBhcnJheSBvZiBjb250ZW50cyBvZiB0aGUgb3JpZ2luYWwgc291cmNlIGZpbGVzLlxuICAgKiAgIC0gbWFwcGluZ3M6IEEgc3RyaW5nIG9mIGJhc2U2NCBWTFFzIHdoaWNoIGNvbnRhaW4gdGhlIGFjdHVhbCBtYXBwaW5ncy5cbiAgICogICAtIGZpbGU6IE9wdGlvbmFsLiBUaGUgZ2VuZXJhdGVkIGZpbGUgdGhpcyBzb3VyY2UgbWFwIGlzIGFzc29jaWF0ZWQgd2l0aC5cbiAgICpcbiAgICogSGVyZSBpcyBhbiBleGFtcGxlIHNvdXJjZSBtYXAsIHRha2VuIGZyb20gdGhlIHNvdXJjZSBtYXAgc3BlY1swXTpcbiAgICpcbiAgICogICAgIHtcbiAgICogICAgICAgdmVyc2lvbiA6IDMsXG4gICAqICAgICAgIGZpbGU6IFwib3V0LmpzXCIsXG4gICAqICAgICAgIHNvdXJjZVJvb3QgOiBcIlwiLFxuICAgKiAgICAgICBzb3VyY2VzOiBbXCJmb28uanNcIiwgXCJiYXIuanNcIl0sXG4gICAqICAgICAgIG5hbWVzOiBbXCJzcmNcIiwgXCJtYXBzXCIsIFwiYXJlXCIsIFwiZnVuXCJdLFxuICAgKiAgICAgICBtYXBwaW5nczogXCJBQSxBQjs7QUJDREU7XCJcbiAgICogICAgIH1cbiAgICpcbiAgICogWzBdOiBodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9kb2N1bWVudC9kLzFVMVJHQWVoUXdSeXBVVG92RjFLUmxwaU9GemUwYi1fMmdjNmZBSDBLWTBrL2VkaXQ/cGxpPTEjXG4gICAqL1xuICBmdW5jdGlvbiBTb3VyY2VNYXBDb25zdW1lcihhU291cmNlTWFwKSB7XG4gICAgdmFyIHNvdXJjZU1hcCA9IGFTb3VyY2VNYXA7XG4gICAgaWYgKHR5cGVvZiBhU291cmNlTWFwID09PSAnc3RyaW5nJykge1xuICAgICAgc291cmNlTWFwID0gSlNPTi5wYXJzZShhU291cmNlTWFwLnJlcGxhY2UoL15cXClcXF1cXH0nLywgJycpKTtcbiAgICB9XG5cbiAgICB2YXIgdmVyc2lvbiA9IHV0aWwuZ2V0QXJnKHNvdXJjZU1hcCwgJ3ZlcnNpb24nKTtcbiAgICB2YXIgc291cmNlcyA9IHV0aWwuZ2V0QXJnKHNvdXJjZU1hcCwgJ3NvdXJjZXMnKTtcbiAgICAvLyBTYXNzIDMuMyBsZWF2ZXMgb3V0IHRoZSAnbmFtZXMnIGFycmF5LCBzbyB3ZSBkZXZpYXRlIGZyb20gdGhlIHNwZWMgKHdoaWNoXG4gICAgLy8gcmVxdWlyZXMgdGhlIGFycmF5KSB0byBwbGF5IG5pY2UgaGVyZS5cbiAgICB2YXIgbmFtZXMgPSB1dGlsLmdldEFyZyhzb3VyY2VNYXAsICduYW1lcycsIFtdKTtcbiAgICB2YXIgc291cmNlUm9vdCA9IHV0aWwuZ2V0QXJnKHNvdXJjZU1hcCwgJ3NvdXJjZVJvb3QnLCBudWxsKTtcbiAgICB2YXIgc291cmNlc0NvbnRlbnQgPSB1dGlsLmdldEFyZyhzb3VyY2VNYXAsICdzb3VyY2VzQ29udGVudCcsIG51bGwpO1xuICAgIHZhciBtYXBwaW5ncyA9IHV0aWwuZ2V0QXJnKHNvdXJjZU1hcCwgJ21hcHBpbmdzJyk7XG4gICAgdmFyIGZpbGUgPSB1dGlsLmdldEFyZyhzb3VyY2VNYXAsICdmaWxlJywgbnVsbCk7XG5cbiAgICAvLyBPbmNlIGFnYWluLCBTYXNzIGRldmlhdGVzIGZyb20gdGhlIHNwZWMgYW5kIHN1cHBsaWVzIHRoZSB2ZXJzaW9uIGFzIGFcbiAgICAvLyBzdHJpbmcgcmF0aGVyIHRoYW4gYSBudW1iZXIsIHNvIHdlIHVzZSBsb29zZSBlcXVhbGl0eSBjaGVja2luZyBoZXJlLlxuICAgIGlmICh2ZXJzaW9uICE9IHRoaXMuX3ZlcnNpb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgdmVyc2lvbjogJyArIHZlcnNpb24pO1xuICAgIH1cblxuICAgIC8vIFNvbWUgc291cmNlIG1hcHMgcHJvZHVjZSByZWxhdGl2ZSBzb3VyY2UgcGF0aHMgbGlrZSBcIi4vZm9vLmpzXCIgaW5zdGVhZCBvZlxuICAgIC8vIFwiZm9vLmpzXCIuICBOb3JtYWxpemUgdGhlc2UgZmlyc3Qgc28gdGhhdCBmdXR1cmUgY29tcGFyaXNvbnMgd2lsbCBzdWNjZWVkLlxuICAgIC8vIFNlZSBidWd6aWwubGEvMTA5MDc2OC5cbiAgICBzb3VyY2VzID0gc291cmNlcy5tYXAodXRpbC5ub3JtYWxpemUpO1xuXG4gICAgLy8gUGFzcyBgdHJ1ZWAgYmVsb3cgdG8gYWxsb3cgZHVwbGljYXRlIG5hbWVzIGFuZCBzb3VyY2VzLiBXaGlsZSBzb3VyY2UgbWFwc1xuICAgIC8vIGFyZSBpbnRlbmRlZCB0byBiZSBjb21wcmVzc2VkIGFuZCBkZWR1cGxpY2F0ZWQsIHRoZSBUeXBlU2NyaXB0IGNvbXBpbGVyXG4gICAgLy8gc29tZXRpbWVzIGdlbmVyYXRlcyBzb3VyY2UgbWFwcyB3aXRoIGR1cGxpY2F0ZXMgaW4gdGhlbS4gU2VlIEdpdGh1YiBpc3N1ZVxuICAgIC8vICM3MiBhbmQgYnVnemlsLmxhLzg4OTQ5Mi5cbiAgICB0aGlzLl9uYW1lcyA9IEFycmF5U2V0LmZyb21BcnJheShuYW1lcywgdHJ1ZSk7XG4gICAgdGhpcy5fc291cmNlcyA9IEFycmF5U2V0LmZyb21BcnJheShzb3VyY2VzLCB0cnVlKTtcblxuICAgIHRoaXMuc291cmNlUm9vdCA9IHNvdXJjZVJvb3Q7XG4gICAgdGhpcy5zb3VyY2VzQ29udGVudCA9IHNvdXJjZXNDb250ZW50O1xuICAgIHRoaXMuX21hcHBpbmdzID0gbWFwcGluZ3M7XG4gICAgdGhpcy5maWxlID0gZmlsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBTb3VyY2VNYXBDb25zdW1lciBmcm9tIGEgU291cmNlTWFwR2VuZXJhdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gU291cmNlTWFwR2VuZXJhdG9yIGFTb3VyY2VNYXBcbiAgICogICAgICAgIFRoZSBzb3VyY2UgbWFwIHRoYXQgd2lsbCBiZSBjb25zdW1lZC5cbiAgICogQHJldHVybnMgU291cmNlTWFwQ29uc3VtZXJcbiAgICovXG4gIFNvdXJjZU1hcENvbnN1bWVyLmZyb21Tb3VyY2VNYXAgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX2Zyb21Tb3VyY2VNYXAoYVNvdXJjZU1hcCkge1xuICAgICAgdmFyIHNtYyA9IE9iamVjdC5jcmVhdGUoU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlKTtcblxuICAgICAgc21jLl9uYW1lcyA9IEFycmF5U2V0LmZyb21BcnJheShhU291cmNlTWFwLl9uYW1lcy50b0FycmF5KCksIHRydWUpO1xuICAgICAgc21jLl9zb3VyY2VzID0gQXJyYXlTZXQuZnJvbUFycmF5KGFTb3VyY2VNYXAuX3NvdXJjZXMudG9BcnJheSgpLCB0cnVlKTtcbiAgICAgIHNtYy5zb3VyY2VSb290ID0gYVNvdXJjZU1hcC5fc291cmNlUm9vdDtcbiAgICAgIHNtYy5zb3VyY2VzQ29udGVudCA9IGFTb3VyY2VNYXAuX2dlbmVyYXRlU291cmNlc0NvbnRlbnQoc21jLl9zb3VyY2VzLnRvQXJyYXkoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc21jLnNvdXJjZVJvb3QpO1xuICAgICAgc21jLmZpbGUgPSBhU291cmNlTWFwLl9maWxlO1xuXG4gICAgICBzbWMuX19nZW5lcmF0ZWRNYXBwaW5ncyA9IGFTb3VyY2VNYXAuX21hcHBpbmdzLnRvQXJyYXkoKS5zbGljZSgpO1xuICAgICAgc21jLl9fb3JpZ2luYWxNYXBwaW5ncyA9IGFTb3VyY2VNYXAuX21hcHBpbmdzLnRvQXJyYXkoKS5zbGljZSgpXG4gICAgICAgIC5zb3J0KHV0aWwuY29tcGFyZUJ5T3JpZ2luYWxQb3NpdGlvbnMpO1xuXG4gICAgICByZXR1cm4gc21jO1xuICAgIH07XG5cbiAgLyoqXG4gICAqIFRoZSB2ZXJzaW9uIG9mIHRoZSBzb3VyY2UgbWFwcGluZyBzcGVjIHRoYXQgd2UgYXJlIGNvbnN1bWluZy5cbiAgICovXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5fdmVyc2lvbiA9IDM7XG5cbiAgLyoqXG4gICAqIFRoZSBsaXN0IG9mIG9yaWdpbmFsIHNvdXJjZXMuXG4gICAqL1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlLCAnc291cmNlcycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VzLnRvQXJyYXkoKS5tYXAoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlUm9vdCAhPSBudWxsID8gdXRpbC5qb2luKHRoaXMuc291cmNlUm9vdCwgcykgOiBzO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICB9KTtcblxuICAvLyBgX19nZW5lcmF0ZWRNYXBwaW5nc2AgYW5kIGBfX29yaWdpbmFsTWFwcGluZ3NgIGFyZSBhcnJheXMgdGhhdCBob2xkIHRoZVxuICAvLyBwYXJzZWQgbWFwcGluZyBjb29yZGluYXRlcyBmcm9tIHRoZSBzb3VyY2UgbWFwJ3MgXCJtYXBwaW5nc1wiIGF0dHJpYnV0ZS4gVGhleVxuICAvLyBhcmUgbGF6aWx5IGluc3RhbnRpYXRlZCwgYWNjZXNzZWQgdmlhIHRoZSBgX2dlbmVyYXRlZE1hcHBpbmdzYCBhbmRcbiAgLy8gYF9vcmlnaW5hbE1hcHBpbmdzYCBnZXR0ZXJzIHJlc3BlY3RpdmVseSwgYW5kIHdlIG9ubHkgcGFyc2UgdGhlIG1hcHBpbmdzXG4gIC8vIGFuZCBjcmVhdGUgdGhlc2UgYXJyYXlzIG9uY2UgcXVlcmllZCBmb3IgYSBzb3VyY2UgbG9jYXRpb24uIFdlIGp1bXAgdGhyb3VnaFxuICAvLyB0aGVzZSBob29wcyBiZWNhdXNlIHRoZXJlIGNhbiBiZSBtYW55IHRob3VzYW5kcyBvZiBtYXBwaW5ncywgYW5kIHBhcnNpbmdcbiAgLy8gdGhlbSBpcyBleHBlbnNpdmUsIHNvIHdlIG9ubHkgd2FudCB0byBkbyBpdCBpZiB3ZSBtdXN0LlxuICAvL1xuICAvLyBFYWNoIG9iamVjdCBpbiB0aGUgYXJyYXlzIGlzIG9mIHRoZSBmb3JtOlxuICAvL1xuICAvLyAgICAge1xuICAvLyAgICAgICBnZW5lcmF0ZWRMaW5lOiBUaGUgbGluZSBudW1iZXIgaW4gdGhlIGdlbmVyYXRlZCBjb2RlLFxuICAvLyAgICAgICBnZW5lcmF0ZWRDb2x1bW46IFRoZSBjb2x1bW4gbnVtYmVyIGluIHRoZSBnZW5lcmF0ZWQgY29kZSxcbiAgLy8gICAgICAgc291cmNlOiBUaGUgcGF0aCB0byB0aGUgb3JpZ2luYWwgc291cmNlIGZpbGUgdGhhdCBnZW5lcmF0ZWQgdGhpc1xuICAvLyAgICAgICAgICAgICAgIGNodW5rIG9mIGNvZGUsXG4gIC8vICAgICAgIG9yaWdpbmFsTGluZTogVGhlIGxpbmUgbnVtYmVyIGluIHRoZSBvcmlnaW5hbCBzb3VyY2UgdGhhdFxuICAvLyAgICAgICAgICAgICAgICAgICAgIGNvcnJlc3BvbmRzIHRvIHRoaXMgY2h1bmsgb2YgZ2VuZXJhdGVkIGNvZGUsXG4gIC8vICAgICAgIG9yaWdpbmFsQ29sdW1uOiBUaGUgY29sdW1uIG51bWJlciBpbiB0aGUgb3JpZ2luYWwgc291cmNlIHRoYXRcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGNvcnJlc3BvbmRzIHRvIHRoaXMgY2h1bmsgb2YgZ2VuZXJhdGVkIGNvZGUsXG4gIC8vICAgICAgIG5hbWU6IFRoZSBuYW1lIG9mIHRoZSBvcmlnaW5hbCBzeW1ib2wgd2hpY2ggZ2VuZXJhdGVkIHRoaXMgY2h1bmsgb2ZcbiAgLy8gICAgICAgICAgICAgY29kZS5cbiAgLy8gICAgIH1cbiAgLy9cbiAgLy8gQWxsIHByb3BlcnRpZXMgZXhjZXB0IGZvciBgZ2VuZXJhdGVkTGluZWAgYW5kIGBnZW5lcmF0ZWRDb2x1bW5gIGNhbiBiZVxuICAvLyBgbnVsbGAuXG4gIC8vXG4gIC8vIGBfZ2VuZXJhdGVkTWFwcGluZ3NgIGlzIG9yZGVyZWQgYnkgdGhlIGdlbmVyYXRlZCBwb3NpdGlvbnMuXG4gIC8vXG4gIC8vIGBfb3JpZ2luYWxNYXBwaW5nc2AgaXMgb3JkZXJlZCBieSB0aGUgb3JpZ2luYWwgcG9zaXRpb25zLlxuXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5fX2dlbmVyYXRlZE1hcHBpbmdzID0gbnVsbDtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZSwgJ19nZW5lcmF0ZWRNYXBwaW5ncycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghdGhpcy5fX2dlbmVyYXRlZE1hcHBpbmdzKSB7XG4gICAgICAgIHRoaXMuX19nZW5lcmF0ZWRNYXBwaW5ncyA9IFtdO1xuICAgICAgICB0aGlzLl9fb3JpZ2luYWxNYXBwaW5ncyA9IFtdO1xuICAgICAgICB0aGlzLl9wYXJzZU1hcHBpbmdzKHRoaXMuX21hcHBpbmdzLCB0aGlzLnNvdXJjZVJvb3QpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fX2dlbmVyYXRlZE1hcHBpbmdzO1xuICAgIH1cbiAgfSk7XG5cbiAgU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlLl9fb3JpZ2luYWxNYXBwaW5ncyA9IG51bGw7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUsICdfb3JpZ2luYWxNYXBwaW5ncycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghdGhpcy5fX29yaWdpbmFsTWFwcGluZ3MpIHtcbiAgICAgICAgdGhpcy5fX2dlbmVyYXRlZE1hcHBpbmdzID0gW107XG4gICAgICAgIHRoaXMuX19vcmlnaW5hbE1hcHBpbmdzID0gW107XG4gICAgICAgIHRoaXMuX3BhcnNlTWFwcGluZ3ModGhpcy5fbWFwcGluZ3MsIHRoaXMuc291cmNlUm9vdCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl9fb3JpZ2luYWxNYXBwaW5ncztcbiAgICB9XG4gIH0pO1xuXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5fbmV4dENoYXJJc01hcHBpbmdTZXBhcmF0b3IgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX25leHRDaGFySXNNYXBwaW5nU2VwYXJhdG9yKGFTdHIpIHtcbiAgICAgIHZhciBjID0gYVN0ci5jaGFyQXQoMCk7XG4gICAgICByZXR1cm4gYyA9PT0gXCI7XCIgfHwgYyA9PT0gXCIsXCI7XG4gICAgfTtcblxuICAvKipcbiAgICogUGFyc2UgdGhlIG1hcHBpbmdzIGluIGEgc3RyaW5nIGluIHRvIGEgZGF0YSBzdHJ1Y3R1cmUgd2hpY2ggd2UgY2FuIGVhc2lseVxuICAgKiBxdWVyeSAodGhlIG9yZGVyZWQgYXJyYXlzIGluIHRoZSBgdGhpcy5fX2dlbmVyYXRlZE1hcHBpbmdzYCBhbmRcbiAgICogYHRoaXMuX19vcmlnaW5hbE1hcHBpbmdzYCBwcm9wZXJ0aWVzKS5cbiAgICovXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5fcGFyc2VNYXBwaW5ncyA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwQ29uc3VtZXJfcGFyc2VNYXBwaW5ncyhhU3RyLCBhU291cmNlUm9vdCkge1xuICAgICAgdmFyIGdlbmVyYXRlZExpbmUgPSAxO1xuICAgICAgdmFyIHByZXZpb3VzR2VuZXJhdGVkQ29sdW1uID0gMDtcbiAgICAgIHZhciBwcmV2aW91c09yaWdpbmFsTGluZSA9IDA7XG4gICAgICB2YXIgcHJldmlvdXNPcmlnaW5hbENvbHVtbiA9IDA7XG4gICAgICB2YXIgcHJldmlvdXNTb3VyY2UgPSAwO1xuICAgICAgdmFyIHByZXZpb3VzTmFtZSA9IDA7XG4gICAgICB2YXIgc3RyID0gYVN0cjtcbiAgICAgIHZhciB0ZW1wID0ge307XG4gICAgICB2YXIgbWFwcGluZztcblxuICAgICAgd2hpbGUgKHN0ci5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChzdHIuY2hhckF0KDApID09PSAnOycpIHtcbiAgICAgICAgICBnZW5lcmF0ZWRMaW5lKys7XG4gICAgICAgICAgc3RyID0gc3RyLnNsaWNlKDEpO1xuICAgICAgICAgIHByZXZpb3VzR2VuZXJhdGVkQ29sdW1uID0gMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdHIuY2hhckF0KDApID09PSAnLCcpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc2xpY2UoMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbWFwcGluZyA9IHt9O1xuICAgICAgICAgIG1hcHBpbmcuZ2VuZXJhdGVkTGluZSA9IGdlbmVyYXRlZExpbmU7XG5cbiAgICAgICAgICAvLyBHZW5lcmF0ZWQgY29sdW1uLlxuICAgICAgICAgIGJhc2U2NFZMUS5kZWNvZGUoc3RyLCB0ZW1wKTtcbiAgICAgICAgICBtYXBwaW5nLmdlbmVyYXRlZENvbHVtbiA9IHByZXZpb3VzR2VuZXJhdGVkQ29sdW1uICsgdGVtcC52YWx1ZTtcbiAgICAgICAgICBwcmV2aW91c0dlbmVyYXRlZENvbHVtbiA9IG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uO1xuICAgICAgICAgIHN0ciA9IHRlbXAucmVzdDtcblxuICAgICAgICAgIGlmIChzdHIubGVuZ3RoID4gMCAmJiAhdGhpcy5fbmV4dENoYXJJc01hcHBpbmdTZXBhcmF0b3Ioc3RyKSkge1xuICAgICAgICAgICAgLy8gT3JpZ2luYWwgc291cmNlLlxuICAgICAgICAgICAgYmFzZTY0VkxRLmRlY29kZShzdHIsIHRlbXApO1xuICAgICAgICAgICAgbWFwcGluZy5zb3VyY2UgPSB0aGlzLl9zb3VyY2VzLmF0KHByZXZpb3VzU291cmNlICsgdGVtcC52YWx1ZSk7XG4gICAgICAgICAgICBwcmV2aW91c1NvdXJjZSArPSB0ZW1wLnZhbHVlO1xuICAgICAgICAgICAgc3RyID0gdGVtcC5yZXN0O1xuICAgICAgICAgICAgaWYgKHN0ci5sZW5ndGggPT09IDAgfHwgdGhpcy5fbmV4dENoYXJJc01hcHBpbmdTZXBhcmF0b3Ioc3RyKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIGEgc291cmNlLCBidXQgbm8gbGluZSBhbmQgY29sdW1uJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE9yaWdpbmFsIGxpbmUuXG4gICAgICAgICAgICBiYXNlNjRWTFEuZGVjb2RlKHN0ciwgdGVtcCk7XG4gICAgICAgICAgICBtYXBwaW5nLm9yaWdpbmFsTGluZSA9IHByZXZpb3VzT3JpZ2luYWxMaW5lICsgdGVtcC52YWx1ZTtcbiAgICAgICAgICAgIHByZXZpb3VzT3JpZ2luYWxMaW5lID0gbWFwcGluZy5vcmlnaW5hbExpbmU7XG4gICAgICAgICAgICAvLyBMaW5lcyBhcmUgc3RvcmVkIDAtYmFzZWRcbiAgICAgICAgICAgIG1hcHBpbmcub3JpZ2luYWxMaW5lICs9IDE7XG4gICAgICAgICAgICBzdHIgPSB0ZW1wLnJlc3Q7XG4gICAgICAgICAgICBpZiAoc3RyLmxlbmd0aCA9PT0gMCB8fCB0aGlzLl9uZXh0Q2hhcklzTWFwcGluZ1NlcGFyYXRvcihzdHIpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgYSBzb3VyY2UgYW5kIGxpbmUsIGJ1dCBubyBjb2x1bW4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gT3JpZ2luYWwgY29sdW1uLlxuICAgICAgICAgICAgYmFzZTY0VkxRLmRlY29kZShzdHIsIHRlbXApO1xuICAgICAgICAgICAgbWFwcGluZy5vcmlnaW5hbENvbHVtbiA9IHByZXZpb3VzT3JpZ2luYWxDb2x1bW4gKyB0ZW1wLnZhbHVlO1xuICAgICAgICAgICAgcHJldmlvdXNPcmlnaW5hbENvbHVtbiA9IG1hcHBpbmcub3JpZ2luYWxDb2x1bW47XG4gICAgICAgICAgICBzdHIgPSB0ZW1wLnJlc3Q7XG5cbiAgICAgICAgICAgIGlmIChzdHIubGVuZ3RoID4gMCAmJiAhdGhpcy5fbmV4dENoYXJJc01hcHBpbmdTZXBhcmF0b3Ioc3RyKSkge1xuICAgICAgICAgICAgICAvLyBPcmlnaW5hbCBuYW1lLlxuICAgICAgICAgICAgICBiYXNlNjRWTFEuZGVjb2RlKHN0ciwgdGVtcCk7XG4gICAgICAgICAgICAgIG1hcHBpbmcubmFtZSA9IHRoaXMuX25hbWVzLmF0KHByZXZpb3VzTmFtZSArIHRlbXAudmFsdWUpO1xuICAgICAgICAgICAgICBwcmV2aW91c05hbWUgKz0gdGVtcC52YWx1ZTtcbiAgICAgICAgICAgICAgc3RyID0gdGVtcC5yZXN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuX19nZW5lcmF0ZWRNYXBwaW5ncy5wdXNoKG1hcHBpbmcpO1xuICAgICAgICAgIGlmICh0eXBlb2YgbWFwcGluZy5vcmlnaW5hbExpbmUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB0aGlzLl9fb3JpZ2luYWxNYXBwaW5ncy5wdXNoKG1hcHBpbmcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9fZ2VuZXJhdGVkTWFwcGluZ3Muc29ydCh1dGlsLmNvbXBhcmVCeUdlbmVyYXRlZFBvc2l0aW9ucyk7XG4gICAgICB0aGlzLl9fb3JpZ2luYWxNYXBwaW5ncy5zb3J0KHV0aWwuY29tcGFyZUJ5T3JpZ2luYWxQb3NpdGlvbnMpO1xuICAgIH07XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIG1hcHBpbmcgdGhhdCBiZXN0IG1hdGNoZXMgdGhlIGh5cG90aGV0aWNhbCBcIm5lZWRsZVwiIG1hcHBpbmcgdGhhdFxuICAgKiB3ZSBhcmUgc2VhcmNoaW5nIGZvciBpbiB0aGUgZ2l2ZW4gXCJoYXlzdGFja1wiIG9mIG1hcHBpbmdzLlxuICAgKi9cbiAgU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlLl9maW5kTWFwcGluZyA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwQ29uc3VtZXJfZmluZE1hcHBpbmcoYU5lZWRsZSwgYU1hcHBpbmdzLCBhTGluZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYUNvbHVtbk5hbWUsIGFDb21wYXJhdG9yKSB7XG4gICAgICAvLyBUbyByZXR1cm4gdGhlIHBvc2l0aW9uIHdlIGFyZSBzZWFyY2hpbmcgZm9yLCB3ZSBtdXN0IGZpcnN0IGZpbmQgdGhlXG4gICAgICAvLyBtYXBwaW5nIGZvciB0aGUgZ2l2ZW4gcG9zaXRpb24gYW5kIHRoZW4gcmV0dXJuIHRoZSBvcHBvc2l0ZSBwb3NpdGlvbiBpdFxuICAgICAgLy8gcG9pbnRzIHRvLiBCZWNhdXNlIHRoZSBtYXBwaW5ncyBhcmUgc29ydGVkLCB3ZSBjYW4gdXNlIGJpbmFyeSBzZWFyY2ggdG9cbiAgICAgIC8vIGZpbmQgdGhlIGJlc3QgbWFwcGluZy5cblxuICAgICAgaWYgKGFOZWVkbGVbYUxpbmVOYW1lXSA8PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0xpbmUgbXVzdCBiZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gMSwgZ290ICdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArIGFOZWVkbGVbYUxpbmVOYW1lXSk7XG4gICAgICB9XG4gICAgICBpZiAoYU5lZWRsZVthQ29sdW1uTmFtZV0gPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbHVtbiBtdXN0IGJlIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byAwLCBnb3QgJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgYU5lZWRsZVthQ29sdW1uTmFtZV0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYmluYXJ5U2VhcmNoLnNlYXJjaChhTmVlZGxlLCBhTWFwcGluZ3MsIGFDb21wYXJhdG9yKTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSBsYXN0IGNvbHVtbiBmb3IgZWFjaCBnZW5lcmF0ZWQgbWFwcGluZy4gVGhlIGxhc3QgY29sdW1uIGlzXG4gICAqIGluY2x1c2l2ZS5cbiAgICovXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5jb21wdXRlQ29sdW1uU3BhbnMgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX2NvbXB1dGVDb2x1bW5TcGFucygpIHtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCB0aGlzLl9nZW5lcmF0ZWRNYXBwaW5ncy5sZW5ndGg7ICsraW5kZXgpIHtcbiAgICAgICAgdmFyIG1hcHBpbmcgPSB0aGlzLl9nZW5lcmF0ZWRNYXBwaW5nc1tpbmRleF07XG5cbiAgICAgICAgLy8gTWFwcGluZ3MgZG8gbm90IGNvbnRhaW4gYSBmaWVsZCBmb3IgdGhlIGxhc3QgZ2VuZXJhdGVkIGNvbHVtbnQuIFdlXG4gICAgICAgIC8vIGNhbiBjb21lIHVwIHdpdGggYW4gb3B0aW1pc3RpYyBlc3RpbWF0ZSwgaG93ZXZlciwgYnkgYXNzdW1pbmcgdGhhdFxuICAgICAgICAvLyBtYXBwaW5ncyBhcmUgY29udGlndW91cyAoaS5lLiBnaXZlbiB0d28gY29uc2VjdXRpdmUgbWFwcGluZ3MsIHRoZVxuICAgICAgICAvLyBmaXJzdCBtYXBwaW5nIGVuZHMgd2hlcmUgdGhlIHNlY29uZCBvbmUgc3RhcnRzKS5cbiAgICAgICAgaWYgKGluZGV4ICsgMSA8IHRoaXMuX2dlbmVyYXRlZE1hcHBpbmdzLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBuZXh0TWFwcGluZyA9IHRoaXMuX2dlbmVyYXRlZE1hcHBpbmdzW2luZGV4ICsgMV07XG5cbiAgICAgICAgICBpZiAobWFwcGluZy5nZW5lcmF0ZWRMaW5lID09PSBuZXh0TWFwcGluZy5nZW5lcmF0ZWRMaW5lKSB7XG4gICAgICAgICAgICBtYXBwaW5nLmxhc3RHZW5lcmF0ZWRDb2x1bW4gPSBuZXh0TWFwcGluZy5nZW5lcmF0ZWRDb2x1bW4gLSAxO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIGxhc3QgbWFwcGluZyBmb3IgZWFjaCBsaW5lIHNwYW5zIHRoZSBlbnRpcmUgbGluZS5cbiAgICAgICAgbWFwcGluZy5sYXN0R2VuZXJhdGVkQ29sdW1uID0gSW5maW5pdHk7XG4gICAgICB9XG4gICAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgb3JpZ2luYWwgc291cmNlLCBsaW5lLCBhbmQgY29sdW1uIGluZm9ybWF0aW9uIGZvciB0aGUgZ2VuZXJhdGVkXG4gICAqIHNvdXJjZSdzIGxpbmUgYW5kIGNvbHVtbiBwb3NpdGlvbnMgcHJvdmlkZWQuIFRoZSBvbmx5IGFyZ3VtZW50IGlzIGFuIG9iamVjdFxuICAgKiB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICpcbiAgICogICAtIGxpbmU6IFRoZSBsaW5lIG51bWJlciBpbiB0aGUgZ2VuZXJhdGVkIHNvdXJjZS5cbiAgICogICAtIGNvbHVtbjogVGhlIGNvbHVtbiBudW1iZXIgaW4gdGhlIGdlbmVyYXRlZCBzb3VyY2UuXG4gICAqXG4gICAqIGFuZCBhbiBvYmplY3QgaXMgcmV0dXJuZWQgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqXG4gICAqICAgLSBzb3VyY2U6IFRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZSwgb3IgbnVsbC5cbiAgICogICAtIGxpbmU6IFRoZSBsaW5lIG51bWJlciBpbiB0aGUgb3JpZ2luYWwgc291cmNlLCBvciBudWxsLlxuICAgKiAgIC0gY29sdW1uOiBUaGUgY29sdW1uIG51bWJlciBpbiB0aGUgb3JpZ2luYWwgc291cmNlLCBvciBudWxsLlxuICAgKiAgIC0gbmFtZTogVGhlIG9yaWdpbmFsIGlkZW50aWZpZXIsIG9yIG51bGwuXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUub3JpZ2luYWxQb3NpdGlvbkZvciA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwQ29uc3VtZXJfb3JpZ2luYWxQb3NpdGlvbkZvcihhQXJncykge1xuICAgICAgdmFyIG5lZWRsZSA9IHtcbiAgICAgICAgZ2VuZXJhdGVkTGluZTogdXRpbC5nZXRBcmcoYUFyZ3MsICdsaW5lJyksXG4gICAgICAgIGdlbmVyYXRlZENvbHVtbjogdXRpbC5nZXRBcmcoYUFyZ3MsICdjb2x1bW4nKVxuICAgICAgfTtcblxuICAgICAgdmFyIGluZGV4ID0gdGhpcy5fZmluZE1hcHBpbmcobmVlZGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZ2VuZXJhdGVkTWFwcGluZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdlbmVyYXRlZExpbmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2VuZXJhdGVkQ29sdW1uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlsLmNvbXBhcmVCeUdlbmVyYXRlZFBvc2l0aW9ucyk7XG5cbiAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIHZhciBtYXBwaW5nID0gdGhpcy5fZ2VuZXJhdGVkTWFwcGluZ3NbaW5kZXhdO1xuXG4gICAgICAgIGlmIChtYXBwaW5nLmdlbmVyYXRlZExpbmUgPT09IG5lZWRsZS5nZW5lcmF0ZWRMaW5lKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IHV0aWwuZ2V0QXJnKG1hcHBpbmcsICdzb3VyY2UnLCBudWxsKTtcbiAgICAgICAgICBpZiAoc291cmNlICE9IG51bGwgJiYgdGhpcy5zb3VyY2VSb290ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IHV0aWwuam9pbih0aGlzLnNvdXJjZVJvb3QsIHNvdXJjZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgICAgICAgIGxpbmU6IHV0aWwuZ2V0QXJnKG1hcHBpbmcsICdvcmlnaW5hbExpbmUnLCBudWxsKSxcbiAgICAgICAgICAgIGNvbHVtbjogdXRpbC5nZXRBcmcobWFwcGluZywgJ29yaWdpbmFsQ29sdW1uJywgbnVsbCksXG4gICAgICAgICAgICBuYW1lOiB1dGlsLmdldEFyZyhtYXBwaW5nLCAnbmFtZScsIG51bGwpXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IG51bGwsXG4gICAgICAgIGxpbmU6IG51bGwsXG4gICAgICAgIGNvbHVtbjogbnVsbCxcbiAgICAgICAgbmFtZTogbnVsbFxuICAgICAgfTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBvcmlnaW5hbCBzb3VyY2UgY29udGVudC4gVGhlIG9ubHkgYXJndW1lbnQgaXMgdGhlIHVybCBvZiB0aGVcbiAgICogb3JpZ2luYWwgc291cmNlIGZpbGUuIFJldHVybnMgbnVsbCBpZiBubyBvcmlnaW5hbCBzb3VyY2UgY29udGVudCBpc1xuICAgKiBhdmFpbGlibGUuXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuc291cmNlQ29udGVudEZvciA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwQ29uc3VtZXJfc291cmNlQ29udGVudEZvcihhU291cmNlKSB7XG4gICAgICBpZiAoIXRoaXMuc291cmNlc0NvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnNvdXJjZVJvb3QgIT0gbnVsbCkge1xuICAgICAgICBhU291cmNlID0gdXRpbC5yZWxhdGl2ZSh0aGlzLnNvdXJjZVJvb3QsIGFTb3VyY2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fc291cmNlcy5oYXMoYVNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlc0NvbnRlbnRbdGhpcy5fc291cmNlcy5pbmRleE9mKGFTb3VyY2UpXTtcbiAgICAgIH1cblxuICAgICAgdmFyIHVybDtcbiAgICAgIGlmICh0aGlzLnNvdXJjZVJvb3QgIT0gbnVsbFxuICAgICAgICAgICYmICh1cmwgPSB1dGlsLnVybFBhcnNlKHRoaXMuc291cmNlUm9vdCkpKSB7XG4gICAgICAgIC8vIFhYWDogZmlsZTovLyBVUklzIGFuZCBhYnNvbHV0ZSBwYXRocyBsZWFkIHRvIHVuZXhwZWN0ZWQgYmVoYXZpb3IgZm9yXG4gICAgICAgIC8vIG1hbnkgdXNlcnMuIFdlIGNhbiBoZWxwIHRoZW0gb3V0IHdoZW4gdGhleSBleHBlY3QgZmlsZTovLyBVUklzIHRvXG4gICAgICAgIC8vIGJlaGF2ZSBsaWtlIGl0IHdvdWxkIGlmIHRoZXkgd2VyZSBydW5uaW5nIGEgbG9jYWwgSFRUUCBzZXJ2ZXIuIFNlZVxuICAgICAgICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD04ODU1OTcuXG4gICAgICAgIHZhciBmaWxlVXJpQWJzUGF0aCA9IGFTb3VyY2UucmVwbGFjZSgvXmZpbGU6XFwvXFwvLywgXCJcIik7XG4gICAgICAgIGlmICh1cmwuc2NoZW1lID09IFwiZmlsZVwiXG4gICAgICAgICAgICAmJiB0aGlzLl9zb3VyY2VzLmhhcyhmaWxlVXJpQWJzUGF0aCkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb3VyY2VzQ29udGVudFt0aGlzLl9zb3VyY2VzLmluZGV4T2YoZmlsZVVyaUFic1BhdGgpXVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCghdXJsLnBhdGggfHwgdXJsLnBhdGggPT0gXCIvXCIpXG4gICAgICAgICAgICAmJiB0aGlzLl9zb3VyY2VzLmhhcyhcIi9cIiArIGFTb3VyY2UpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlc0NvbnRlbnRbdGhpcy5fc291cmNlcy5pbmRleE9mKFwiL1wiICsgYVNvdXJjZSldO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcignXCInICsgYVNvdXJjZSArICdcIiBpcyBub3QgaW4gdGhlIFNvdXJjZU1hcC4nKTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBnZW5lcmF0ZWQgbGluZSBhbmQgY29sdW1uIGluZm9ybWF0aW9uIGZvciB0aGUgb3JpZ2luYWwgc291cmNlLFxuICAgKiBsaW5lLCBhbmQgY29sdW1uIHBvc2l0aW9ucyBwcm92aWRlZC4gVGhlIG9ubHkgYXJndW1lbnQgaXMgYW4gb2JqZWN0IHdpdGhcbiAgICogdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAgIC0gc291cmNlOiBUaGUgZmlsZW5hbWUgb2YgdGhlIG9yaWdpbmFsIHNvdXJjZS5cbiAgICogICAtIGxpbmU6IFRoZSBsaW5lIG51bWJlciBpbiB0aGUgb3JpZ2luYWwgc291cmNlLlxuICAgKiAgIC0gY29sdW1uOiBUaGUgY29sdW1uIG51bWJlciBpbiB0aGUgb3JpZ2luYWwgc291cmNlLlxuICAgKlxuICAgKiBhbmQgYW4gb2JqZWN0IGlzIHJldHVybmVkIHdpdGggdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAgIC0gbGluZTogVGhlIGxpbmUgbnVtYmVyIGluIHRoZSBnZW5lcmF0ZWQgc291cmNlLCBvciBudWxsLlxuICAgKiAgIC0gY29sdW1uOiBUaGUgY29sdW1uIG51bWJlciBpbiB0aGUgZ2VuZXJhdGVkIHNvdXJjZSwgb3IgbnVsbC5cbiAgICovXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5nZW5lcmF0ZWRQb3NpdGlvbkZvciA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwQ29uc3VtZXJfZ2VuZXJhdGVkUG9zaXRpb25Gb3IoYUFyZ3MpIHtcbiAgICAgIHZhciBuZWVkbGUgPSB7XG4gICAgICAgIHNvdXJjZTogdXRpbC5nZXRBcmcoYUFyZ3MsICdzb3VyY2UnKSxcbiAgICAgICAgb3JpZ2luYWxMaW5lOiB1dGlsLmdldEFyZyhhQXJncywgJ2xpbmUnKSxcbiAgICAgICAgb3JpZ2luYWxDb2x1bW46IHV0aWwuZ2V0QXJnKGFBcmdzLCAnY29sdW1uJylcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzLnNvdXJjZVJvb3QgIT0gbnVsbCkge1xuICAgICAgICBuZWVkbGUuc291cmNlID0gdXRpbC5yZWxhdGl2ZSh0aGlzLnNvdXJjZVJvb3QsIG5lZWRsZS5zb3VyY2UpO1xuICAgICAgfVxuXG4gICAgICB2YXIgaW5kZXggPSB0aGlzLl9maW5kTWFwcGluZyhuZWVkbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vcmlnaW5hbE1hcHBpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJvcmlnaW5hbExpbmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3JpZ2luYWxDb2x1bW5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWwuY29tcGFyZUJ5T3JpZ2luYWxQb3NpdGlvbnMpO1xuXG4gICAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICB2YXIgbWFwcGluZyA9IHRoaXMuX29yaWdpbmFsTWFwcGluZ3NbaW5kZXhdO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbGluZTogdXRpbC5nZXRBcmcobWFwcGluZywgJ2dlbmVyYXRlZExpbmUnLCBudWxsKSxcbiAgICAgICAgICBjb2x1bW46IHV0aWwuZ2V0QXJnKG1hcHBpbmcsICdnZW5lcmF0ZWRDb2x1bW4nLCBudWxsKSxcbiAgICAgICAgICBsYXN0Q29sdW1uOiB1dGlsLmdldEFyZyhtYXBwaW5nLCAnbGFzdEdlbmVyYXRlZENvbHVtbicsIG51bGwpXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxpbmU6IG51bGwsXG4gICAgICAgIGNvbHVtbjogbnVsbCxcbiAgICAgICAgbGFzdENvbHVtbjogbnVsbFxuICAgICAgfTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCBnZW5lcmF0ZWQgbGluZSBhbmQgY29sdW1uIGluZm9ybWF0aW9uIGZvciB0aGUgb3JpZ2luYWwgc291cmNlXG4gICAqIGFuZCBsaW5lIHByb3ZpZGVkLiBUaGUgb25seSBhcmd1bWVudCBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nXG4gICAqIHByb3BlcnRpZXM6XG4gICAqXG4gICAqICAgLSBzb3VyY2U6IFRoZSBmaWxlbmFtZSBvZiB0aGUgb3JpZ2luYWwgc291cmNlLlxuICAgKiAgIC0gbGluZTogVGhlIGxpbmUgbnVtYmVyIGluIHRoZSBvcmlnaW5hbCBzb3VyY2UuXG4gICAqXG4gICAqIGFuZCBhbiBhcnJheSBvZiBvYmplY3RzIGlzIHJldHVybmVkLCBlYWNoIHdpdGggdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAgIC0gbGluZTogVGhlIGxpbmUgbnVtYmVyIGluIHRoZSBnZW5lcmF0ZWQgc291cmNlLCBvciBudWxsLlxuICAgKiAgIC0gY29sdW1uOiBUaGUgY29sdW1uIG51bWJlciBpbiB0aGUgZ2VuZXJhdGVkIHNvdXJjZSwgb3IgbnVsbC5cbiAgICovXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5hbGxHZW5lcmF0ZWRQb3NpdGlvbnNGb3IgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX2FsbEdlbmVyYXRlZFBvc2l0aW9uc0ZvcihhQXJncykge1xuICAgICAgLy8gV2hlbiB0aGVyZSBpcyBubyBleGFjdCBtYXRjaCwgU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlLl9maW5kTWFwcGluZ1xuICAgICAgLy8gcmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGNsb3Nlc3QgbWFwcGluZyBsZXNzIHRoYW4gdGhlIG5lZWRsZS4gQnlcbiAgICAgIC8vIHNldHRpbmcgbmVlZGxlLm9yaWdpbmFsQ29sdW1uIHRvIEluZmluaXR5LCB3ZSB0aHVzIGZpbmQgdGhlIGxhc3RcbiAgICAgIC8vIG1hcHBpbmcgZm9yIHRoZSBnaXZlbiBsaW5lLCBwcm92aWRlZCBzdWNoIGEgbWFwcGluZyBleGlzdHMuXG4gICAgICB2YXIgbmVlZGxlID0ge1xuICAgICAgICBzb3VyY2U6IHV0aWwuZ2V0QXJnKGFBcmdzLCAnc291cmNlJyksXG4gICAgICAgIG9yaWdpbmFsTGluZTogdXRpbC5nZXRBcmcoYUFyZ3MsICdsaW5lJyksXG4gICAgICAgIG9yaWdpbmFsQ29sdW1uOiBJbmZpbml0eVxuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXMuc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgIG5lZWRsZS5zb3VyY2UgPSB1dGlsLnJlbGF0aXZlKHRoaXMuc291cmNlUm9vdCwgbmVlZGxlLnNvdXJjZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBtYXBwaW5ncyA9IFtdO1xuXG4gICAgICB2YXIgaW5kZXggPSB0aGlzLl9maW5kTWFwcGluZyhuZWVkbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vcmlnaW5hbE1hcHBpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJvcmlnaW5hbExpbmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3JpZ2luYWxDb2x1bW5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWwuY29tcGFyZUJ5T3JpZ2luYWxQb3NpdGlvbnMpO1xuICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgdmFyIG1hcHBpbmcgPSB0aGlzLl9vcmlnaW5hbE1hcHBpbmdzW2luZGV4XTtcblxuICAgICAgICB3aGlsZSAobWFwcGluZyAmJiBtYXBwaW5nLm9yaWdpbmFsTGluZSA9PT0gbmVlZGxlLm9yaWdpbmFsTGluZSkge1xuICAgICAgICAgIG1hcHBpbmdzLnB1c2goe1xuICAgICAgICAgICAgbGluZTogdXRpbC5nZXRBcmcobWFwcGluZywgJ2dlbmVyYXRlZExpbmUnLCBudWxsKSxcbiAgICAgICAgICAgIGNvbHVtbjogdXRpbC5nZXRBcmcobWFwcGluZywgJ2dlbmVyYXRlZENvbHVtbicsIG51bGwpLFxuICAgICAgICAgICAgbGFzdENvbHVtbjogdXRpbC5nZXRBcmcobWFwcGluZywgJ2xhc3RHZW5lcmF0ZWRDb2x1bW4nLCBudWxsKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgbWFwcGluZyA9IHRoaXMuX29yaWdpbmFsTWFwcGluZ3NbLS1pbmRleF07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1hcHBpbmdzLnJldmVyc2UoKTtcbiAgICB9O1xuXG4gIFNvdXJjZU1hcENvbnN1bWVyLkdFTkVSQVRFRF9PUkRFUiA9IDE7XG4gIFNvdXJjZU1hcENvbnN1bWVyLk9SSUdJTkFMX09SREVSID0gMjtcblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGVhY2ggbWFwcGluZyBiZXR3ZWVuIGFuIG9yaWdpbmFsIHNvdXJjZS9saW5lL2NvbHVtbiBhbmQgYVxuICAgKiBnZW5lcmF0ZWQgbGluZS9jb2x1bW4gaW4gdGhpcyBzb3VyY2UgbWFwLlxuICAgKlxuICAgKiBAcGFyYW0gRnVuY3Rpb24gYUNhbGxiYWNrXG4gICAqICAgICAgICBUaGUgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgd2l0aCBlYWNoIG1hcHBpbmcuXG4gICAqIEBwYXJhbSBPYmplY3QgYUNvbnRleHRcbiAgICogICAgICAgIE9wdGlvbmFsLiBJZiBzcGVjaWZpZWQsIHRoaXMgb2JqZWN0IHdpbGwgYmUgdGhlIHZhbHVlIG9mIGB0aGlzYCBldmVyeVxuICAgKiAgICAgICAgdGltZSB0aGF0IGBhQ2FsbGJhY2tgIGlzIGNhbGxlZC5cbiAgICogQHBhcmFtIGFPcmRlclxuICAgKiAgICAgICAgRWl0aGVyIGBTb3VyY2VNYXBDb25zdW1lci5HRU5FUkFURURfT1JERVJgIG9yXG4gICAqICAgICAgICBgU291cmNlTWFwQ29uc3VtZXIuT1JJR0lOQUxfT1JERVJgLiBTcGVjaWZpZXMgd2hldGhlciB5b3Ugd2FudCB0b1xuICAgKiAgICAgICAgaXRlcmF0ZSBvdmVyIHRoZSBtYXBwaW5ncyBzb3J0ZWQgYnkgdGhlIGdlbmVyYXRlZCBmaWxlJ3MgbGluZS9jb2x1bW5cbiAgICogICAgICAgIG9yZGVyIG9yIHRoZSBvcmlnaW5hbCdzIHNvdXJjZS9saW5lL2NvbHVtbiBvcmRlciwgcmVzcGVjdGl2ZWx5LiBEZWZhdWx0cyB0b1xuICAgKiAgICAgICAgYFNvdXJjZU1hcENvbnN1bWVyLkdFTkVSQVRFRF9PUkRFUmAuXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuZWFjaE1hcHBpbmcgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX2VhY2hNYXBwaW5nKGFDYWxsYmFjaywgYUNvbnRleHQsIGFPcmRlcikge1xuICAgICAgdmFyIGNvbnRleHQgPSBhQ29udGV4dCB8fCBudWxsO1xuICAgICAgdmFyIG9yZGVyID0gYU9yZGVyIHx8IFNvdXJjZU1hcENvbnN1bWVyLkdFTkVSQVRFRF9PUkRFUjtcblxuICAgICAgdmFyIG1hcHBpbmdzO1xuICAgICAgc3dpdGNoIChvcmRlcikge1xuICAgICAgY2FzZSBTb3VyY2VNYXBDb25zdW1lci5HRU5FUkFURURfT1JERVI6XG4gICAgICAgIG1hcHBpbmdzID0gdGhpcy5fZ2VuZXJhdGVkTWFwcGluZ3M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBTb3VyY2VNYXBDb25zdW1lci5PUklHSU5BTF9PUkRFUjpcbiAgICAgICAgbWFwcGluZ3MgPSB0aGlzLl9vcmlnaW5hbE1hcHBpbmdzO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gb3JkZXIgb2YgaXRlcmF0aW9uLlwiKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNvdXJjZVJvb3QgPSB0aGlzLnNvdXJjZVJvb3Q7XG4gICAgICBtYXBwaW5ncy5tYXAoZnVuY3Rpb24gKG1hcHBpbmcpIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IG1hcHBpbmcuc291cmNlO1xuICAgICAgICBpZiAoc291cmNlICE9IG51bGwgJiYgc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgICAgc291cmNlID0gdXRpbC5qb2luKHNvdXJjZVJvb3QsIHNvdXJjZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgICAgICBnZW5lcmF0ZWRMaW5lOiBtYXBwaW5nLmdlbmVyYXRlZExpbmUsXG4gICAgICAgICAgZ2VuZXJhdGVkQ29sdW1uOiBtYXBwaW5nLmdlbmVyYXRlZENvbHVtbixcbiAgICAgICAgICBvcmlnaW5hbExpbmU6IG1hcHBpbmcub3JpZ2luYWxMaW5lLFxuICAgICAgICAgIG9yaWdpbmFsQ29sdW1uOiBtYXBwaW5nLm9yaWdpbmFsQ29sdW1uLFxuICAgICAgICAgIG5hbWU6IG1hcHBpbmcubmFtZVxuICAgICAgICB9O1xuICAgICAgfSkuZm9yRWFjaChhQ2FsbGJhY2ssIGNvbnRleHQpO1xuICAgIH07XG5cbiAgZXhwb3J0cy5Tb3VyY2VNYXBDb25zdW1lciA9IFNvdXJjZU1hcENvbnN1bWVyO1xuXG59KTtcbiIsIi8qIC0qLSBNb2RlOiBqczsganMtaW5kZW50LWxldmVsOiAyOyAtKi0gKi9cbi8qXG4gKiBDb3B5cmlnaHQgMjAxMSBNb3ppbGxhIEZvdW5kYXRpb24gYW5kIGNvbnRyaWJ1dG9yc1xuICogTGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgbGljZW5zZS4gU2VlIExJQ0VOU0Ugb3I6XG4gKiBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvQlNELTMtQ2xhdXNlXG4gKi9cbmlmICh0eXBlb2YgZGVmaW5lICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGRlZmluZSA9IHJlcXVpcmUoJ2FtZGVmaW5lJykobW9kdWxlLCByZXF1aXJlKTtcbn1cbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG5cbiAgdmFyIGJhc2U2NFZMUSA9IHJlcXVpcmUoJy4vYmFzZTY0LXZscScpO1xuICB2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuICB2YXIgQXJyYXlTZXQgPSByZXF1aXJlKCcuL2FycmF5LXNldCcpLkFycmF5U2V0O1xuICB2YXIgTWFwcGluZ0xpc3QgPSByZXF1aXJlKCcuL21hcHBpbmctbGlzdCcpLk1hcHBpbmdMaXN0O1xuXG4gIC8qKlxuICAgKiBBbiBpbnN0YW5jZSBvZiB0aGUgU291cmNlTWFwR2VuZXJhdG9yIHJlcHJlc2VudHMgYSBzb3VyY2UgbWFwIHdoaWNoIGlzXG4gICAqIGJlaW5nIGJ1aWx0IGluY3JlbWVudGFsbHkuIFlvdSBtYXkgcGFzcyBhbiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nXG4gICAqIHByb3BlcnRpZXM6XG4gICAqXG4gICAqICAgLSBmaWxlOiBUaGUgZmlsZW5hbWUgb2YgdGhlIGdlbmVyYXRlZCBzb3VyY2UuXG4gICAqICAgLSBzb3VyY2VSb290OiBBIHJvb3QgZm9yIGFsbCByZWxhdGl2ZSBVUkxzIGluIHRoaXMgc291cmNlIG1hcC5cbiAgICovXG4gIGZ1bmN0aW9uIFNvdXJjZU1hcEdlbmVyYXRvcihhQXJncykge1xuICAgIGlmICghYUFyZ3MpIHtcbiAgICAgIGFBcmdzID0ge307XG4gICAgfVxuICAgIHRoaXMuX2ZpbGUgPSB1dGlsLmdldEFyZyhhQXJncywgJ2ZpbGUnLCBudWxsKTtcbiAgICB0aGlzLl9zb3VyY2VSb290ID0gdXRpbC5nZXRBcmcoYUFyZ3MsICdzb3VyY2VSb290JywgbnVsbCk7XG4gICAgdGhpcy5fc2tpcFZhbGlkYXRpb24gPSB1dGlsLmdldEFyZyhhQXJncywgJ3NraXBWYWxpZGF0aW9uJywgZmFsc2UpO1xuICAgIHRoaXMuX3NvdXJjZXMgPSBuZXcgQXJyYXlTZXQoKTtcbiAgICB0aGlzLl9uYW1lcyA9IG5ldyBBcnJheVNldCgpO1xuICAgIHRoaXMuX21hcHBpbmdzID0gbmV3IE1hcHBpbmdMaXN0KCk7XG4gICAgdGhpcy5fc291cmNlc0NvbnRlbnRzID0gbnVsbDtcbiAgfVxuXG4gIFNvdXJjZU1hcEdlbmVyYXRvci5wcm90b3R5cGUuX3ZlcnNpb24gPSAzO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IFNvdXJjZU1hcEdlbmVyYXRvciBiYXNlZCBvbiBhIFNvdXJjZU1hcENvbnN1bWVyXG4gICAqXG4gICAqIEBwYXJhbSBhU291cmNlTWFwQ29uc3VtZXIgVGhlIFNvdXJjZU1hcC5cbiAgICovXG4gIFNvdXJjZU1hcEdlbmVyYXRvci5mcm9tU291cmNlTWFwID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBHZW5lcmF0b3JfZnJvbVNvdXJjZU1hcChhU291cmNlTWFwQ29uc3VtZXIpIHtcbiAgICAgIHZhciBzb3VyY2VSb290ID0gYVNvdXJjZU1hcENvbnN1bWVyLnNvdXJjZVJvb3Q7XG4gICAgICB2YXIgZ2VuZXJhdG9yID0gbmV3IFNvdXJjZU1hcEdlbmVyYXRvcih7XG4gICAgICAgIGZpbGU6IGFTb3VyY2VNYXBDb25zdW1lci5maWxlLFxuICAgICAgICBzb3VyY2VSb290OiBzb3VyY2VSb290XG4gICAgICB9KTtcbiAgICAgIGFTb3VyY2VNYXBDb25zdW1lci5lYWNoTWFwcGluZyhmdW5jdGlvbiAobWFwcGluZykge1xuICAgICAgICB2YXIgbmV3TWFwcGluZyA9IHtcbiAgICAgICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgICAgIGxpbmU6IG1hcHBpbmcuZ2VuZXJhdGVkTGluZSxcbiAgICAgICAgICAgIGNvbHVtbjogbWFwcGluZy5nZW5lcmF0ZWRDb2x1bW5cbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKG1hcHBpbmcuc291cmNlICE9IG51bGwpIHtcbiAgICAgICAgICBuZXdNYXBwaW5nLnNvdXJjZSA9IG1hcHBpbmcuc291cmNlO1xuICAgICAgICAgIGlmIChzb3VyY2VSb290ICE9IG51bGwpIHtcbiAgICAgICAgICAgIG5ld01hcHBpbmcuc291cmNlID0gdXRpbC5yZWxhdGl2ZShzb3VyY2VSb290LCBuZXdNYXBwaW5nLnNvdXJjZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbmV3TWFwcGluZy5vcmlnaW5hbCA9IHtcbiAgICAgICAgICAgIGxpbmU6IG1hcHBpbmcub3JpZ2luYWxMaW5lLFxuICAgICAgICAgICAgY29sdW1uOiBtYXBwaW5nLm9yaWdpbmFsQ29sdW1uXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmIChtYXBwaW5nLm5hbWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgbmV3TWFwcGluZy5uYW1lID0gbWFwcGluZy5uYW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGdlbmVyYXRvci5hZGRNYXBwaW5nKG5ld01hcHBpbmcpO1xuICAgICAgfSk7XG4gICAgICBhU291cmNlTWFwQ29uc3VtZXIuc291cmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChzb3VyY2VGaWxlKSB7XG4gICAgICAgIHZhciBjb250ZW50ID0gYVNvdXJjZU1hcENvbnN1bWVyLnNvdXJjZUNvbnRlbnRGb3Ioc291cmNlRmlsZSk7XG4gICAgICAgIGlmIChjb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgICBnZW5lcmF0b3Iuc2V0U291cmNlQ29udGVudChzb3VyY2VGaWxlLCBjb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gZ2VuZXJhdG9yO1xuICAgIH07XG5cbiAgLyoqXG4gICAqIEFkZCBhIHNpbmdsZSBtYXBwaW5nIGZyb20gb3JpZ2luYWwgc291cmNlIGxpbmUgYW5kIGNvbHVtbiB0byB0aGUgZ2VuZXJhdGVkXG4gICAqIHNvdXJjZSdzIGxpbmUgYW5kIGNvbHVtbiBmb3IgdGhpcyBzb3VyY2UgbWFwIGJlaW5nIGNyZWF0ZWQuIFRoZSBtYXBwaW5nXG4gICAqIG9iamVjdCBzaG91bGQgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqXG4gICAqICAgLSBnZW5lcmF0ZWQ6IEFuIG9iamVjdCB3aXRoIHRoZSBnZW5lcmF0ZWQgbGluZSBhbmQgY29sdW1uIHBvc2l0aW9ucy5cbiAgICogICAtIG9yaWdpbmFsOiBBbiBvYmplY3Qgd2l0aCB0aGUgb3JpZ2luYWwgbGluZSBhbmQgY29sdW1uIHBvc2l0aW9ucy5cbiAgICogICAtIHNvdXJjZTogVGhlIG9yaWdpbmFsIHNvdXJjZSBmaWxlIChyZWxhdGl2ZSB0byB0aGUgc291cmNlUm9vdCkuXG4gICAqICAgLSBuYW1lOiBBbiBvcHRpb25hbCBvcmlnaW5hbCB0b2tlbiBuYW1lIGZvciB0aGlzIG1hcHBpbmcuXG4gICAqL1xuICBTb3VyY2VNYXBHZW5lcmF0b3IucHJvdG90eXBlLmFkZE1hcHBpbmcgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcEdlbmVyYXRvcl9hZGRNYXBwaW5nKGFBcmdzKSB7XG4gICAgICB2YXIgZ2VuZXJhdGVkID0gdXRpbC5nZXRBcmcoYUFyZ3MsICdnZW5lcmF0ZWQnKTtcbiAgICAgIHZhciBvcmlnaW5hbCA9IHV0aWwuZ2V0QXJnKGFBcmdzLCAnb3JpZ2luYWwnLCBudWxsKTtcbiAgICAgIHZhciBzb3VyY2UgPSB1dGlsLmdldEFyZyhhQXJncywgJ3NvdXJjZScsIG51bGwpO1xuICAgICAgdmFyIG5hbWUgPSB1dGlsLmdldEFyZyhhQXJncywgJ25hbWUnLCBudWxsKTtcblxuICAgICAgaWYgKCF0aGlzLl9za2lwVmFsaWRhdGlvbikge1xuICAgICAgICB0aGlzLl92YWxpZGF0ZU1hcHBpbmcoZ2VuZXJhdGVkLCBvcmlnaW5hbCwgc291cmNlLCBuYW1lKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNvdXJjZSAhPSBudWxsICYmICF0aGlzLl9zb3VyY2VzLmhhcyhzb3VyY2UpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZXMuYWRkKHNvdXJjZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChuYW1lICE9IG51bGwgJiYgIXRoaXMuX25hbWVzLmhhcyhuYW1lKSkge1xuICAgICAgICB0aGlzLl9uYW1lcy5hZGQobmFtZSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX21hcHBpbmdzLmFkZCh7XG4gICAgICAgIGdlbmVyYXRlZExpbmU6IGdlbmVyYXRlZC5saW5lLFxuICAgICAgICBnZW5lcmF0ZWRDb2x1bW46IGdlbmVyYXRlZC5jb2x1bW4sXG4gICAgICAgIG9yaWdpbmFsTGluZTogb3JpZ2luYWwgIT0gbnVsbCAmJiBvcmlnaW5hbC5saW5lLFxuICAgICAgICBvcmlnaW5hbENvbHVtbjogb3JpZ2luYWwgIT0gbnVsbCAmJiBvcmlnaW5hbC5jb2x1bW4sXG4gICAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgICBuYW1lOiBuYW1lXG4gICAgICB9KTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgdGhlIHNvdXJjZSBjb250ZW50IGZvciBhIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgU291cmNlTWFwR2VuZXJhdG9yLnByb3RvdHlwZS5zZXRTb3VyY2VDb250ZW50ID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBHZW5lcmF0b3Jfc2V0U291cmNlQ29udGVudChhU291cmNlRmlsZSwgYVNvdXJjZUNvbnRlbnQpIHtcbiAgICAgIHZhciBzb3VyY2UgPSBhU291cmNlRmlsZTtcbiAgICAgIGlmICh0aGlzLl9zb3VyY2VSb290ICE9IG51bGwpIHtcbiAgICAgICAgc291cmNlID0gdXRpbC5yZWxhdGl2ZSh0aGlzLl9zb3VyY2VSb290LCBzb3VyY2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYVNvdXJjZUNvbnRlbnQgIT0gbnVsbCkge1xuICAgICAgICAvLyBBZGQgdGhlIHNvdXJjZSBjb250ZW50IHRvIHRoZSBfc291cmNlc0NvbnRlbnRzIG1hcC5cbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IF9zb3VyY2VzQ29udGVudHMgbWFwIGlmIHRoZSBwcm9wZXJ0eSBpcyBudWxsLlxuICAgICAgICBpZiAoIXRoaXMuX3NvdXJjZXNDb250ZW50cykge1xuICAgICAgICAgIHRoaXMuX3NvdXJjZXNDb250ZW50cyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3NvdXJjZXNDb250ZW50c1t1dGlsLnRvU2V0U3RyaW5nKHNvdXJjZSldID0gYVNvdXJjZUNvbnRlbnQ7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX3NvdXJjZXNDb250ZW50cykge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIHNvdXJjZSBmaWxlIGZyb20gdGhlIF9zb3VyY2VzQ29udGVudHMgbWFwLlxuICAgICAgICAvLyBJZiB0aGUgX3NvdXJjZXNDb250ZW50cyBtYXAgaXMgZW1wdHksIHNldCB0aGUgcHJvcGVydHkgdG8gbnVsbC5cbiAgICAgICAgZGVsZXRlIHRoaXMuX3NvdXJjZXNDb250ZW50c1t1dGlsLnRvU2V0U3RyaW5nKHNvdXJjZSldO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXModGhpcy5fc291cmNlc0NvbnRlbnRzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLl9zb3VyY2VzQ29udGVudHMgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAvKipcbiAgICogQXBwbGllcyB0aGUgbWFwcGluZ3Mgb2YgYSBzdWItc291cmNlLW1hcCBmb3IgYSBzcGVjaWZpYyBzb3VyY2UgZmlsZSB0byB0aGVcbiAgICogc291cmNlIG1hcCBiZWluZyBnZW5lcmF0ZWQuIEVhY2ggbWFwcGluZyB0byB0aGUgc3VwcGxpZWQgc291cmNlIGZpbGUgaXNcbiAgICogcmV3cml0dGVuIHVzaW5nIHRoZSBzdXBwbGllZCBzb3VyY2UgbWFwLiBOb3RlOiBUaGUgcmVzb2x1dGlvbiBmb3IgdGhlXG4gICAqIHJlc3VsdGluZyBtYXBwaW5ncyBpcyB0aGUgbWluaW1pdW0gb2YgdGhpcyBtYXAgYW5kIHRoZSBzdXBwbGllZCBtYXAuXG4gICAqXG4gICAqIEBwYXJhbSBhU291cmNlTWFwQ29uc3VtZXIgVGhlIHNvdXJjZSBtYXAgdG8gYmUgYXBwbGllZC5cbiAgICogQHBhcmFtIGFTb3VyY2VGaWxlIE9wdGlvbmFsLiBUaGUgZmlsZW5hbWUgb2YgdGhlIHNvdXJjZSBmaWxlLlxuICAgKiAgICAgICAgSWYgb21pdHRlZCwgU291cmNlTWFwQ29uc3VtZXIncyBmaWxlIHByb3BlcnR5IHdpbGwgYmUgdXNlZC5cbiAgICogQHBhcmFtIGFTb3VyY2VNYXBQYXRoIE9wdGlvbmFsLiBUaGUgZGlybmFtZSBvZiB0aGUgcGF0aCB0byB0aGUgc291cmNlIG1hcFxuICAgKiAgICAgICAgdG8gYmUgYXBwbGllZC4gSWYgcmVsYXRpdmUsIGl0IGlzIHJlbGF0aXZlIHRvIHRoZSBTb3VyY2VNYXBDb25zdW1lci5cbiAgICogICAgICAgIFRoaXMgcGFyYW1ldGVyIGlzIG5lZWRlZCB3aGVuIHRoZSB0d28gc291cmNlIG1hcHMgYXJlbid0IGluIHRoZSBzYW1lXG4gICAqICAgICAgICBkaXJlY3RvcnksIGFuZCB0aGUgc291cmNlIG1hcCB0byBiZSBhcHBsaWVkIGNvbnRhaW5zIHJlbGF0aXZlIHNvdXJjZVxuICAgKiAgICAgICAgcGF0aHMuIElmIHNvLCB0aG9zZSByZWxhdGl2ZSBzb3VyY2UgcGF0aHMgbmVlZCB0byBiZSByZXdyaXR0ZW5cbiAgICogICAgICAgIHJlbGF0aXZlIHRvIHRoZSBTb3VyY2VNYXBHZW5lcmF0b3IuXG4gICAqL1xuICBTb3VyY2VNYXBHZW5lcmF0b3IucHJvdG90eXBlLmFwcGx5U291cmNlTWFwID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBHZW5lcmF0b3JfYXBwbHlTb3VyY2VNYXAoYVNvdXJjZU1hcENvbnN1bWVyLCBhU291cmNlRmlsZSwgYVNvdXJjZU1hcFBhdGgpIHtcbiAgICAgIHZhciBzb3VyY2VGaWxlID0gYVNvdXJjZUZpbGU7XG4gICAgICAvLyBJZiBhU291cmNlRmlsZSBpcyBvbWl0dGVkLCB3ZSB3aWxsIHVzZSB0aGUgZmlsZSBwcm9wZXJ0eSBvZiB0aGUgU291cmNlTWFwXG4gICAgICBpZiAoYVNvdXJjZUZpbGUgPT0gbnVsbCkge1xuICAgICAgICBpZiAoYVNvdXJjZU1hcENvbnN1bWVyLmZpbGUgPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdTb3VyY2VNYXBHZW5lcmF0b3IucHJvdG90eXBlLmFwcGx5U291cmNlTWFwIHJlcXVpcmVzIGVpdGhlciBhbiBleHBsaWNpdCBzb3VyY2UgZmlsZSwgJyArXG4gICAgICAgICAgICAnb3IgdGhlIHNvdXJjZSBtYXBcXCdzIFwiZmlsZVwiIHByb3BlcnR5LiBCb3RoIHdlcmUgb21pdHRlZC4nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBzb3VyY2VGaWxlID0gYVNvdXJjZU1hcENvbnN1bWVyLmZpbGU7XG4gICAgICB9XG4gICAgICB2YXIgc291cmNlUm9vdCA9IHRoaXMuX3NvdXJjZVJvb3Q7XG4gICAgICAvLyBNYWtlIFwic291cmNlRmlsZVwiIHJlbGF0aXZlIGlmIGFuIGFic29sdXRlIFVybCBpcyBwYXNzZWQuXG4gICAgICBpZiAoc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgIHNvdXJjZUZpbGUgPSB1dGlsLnJlbGF0aXZlKHNvdXJjZVJvb3QsIHNvdXJjZUZpbGUpO1xuICAgICAgfVxuICAgICAgLy8gQXBwbHlpbmcgdGhlIFNvdXJjZU1hcCBjYW4gYWRkIGFuZCByZW1vdmUgaXRlbXMgZnJvbSB0aGUgc291cmNlcyBhbmRcbiAgICAgIC8vIHRoZSBuYW1lcyBhcnJheS5cbiAgICAgIHZhciBuZXdTb3VyY2VzID0gbmV3IEFycmF5U2V0KCk7XG4gICAgICB2YXIgbmV3TmFtZXMgPSBuZXcgQXJyYXlTZXQoKTtcblxuICAgICAgLy8gRmluZCBtYXBwaW5ncyBmb3IgdGhlIFwic291cmNlRmlsZVwiXG4gICAgICB0aGlzLl9tYXBwaW5ncy51bnNvcnRlZEZvckVhY2goZnVuY3Rpb24gKG1hcHBpbmcpIHtcbiAgICAgICAgaWYgKG1hcHBpbmcuc291cmNlID09PSBzb3VyY2VGaWxlICYmIG1hcHBpbmcub3JpZ2luYWxMaW5lICE9IG51bGwpIHtcbiAgICAgICAgICAvLyBDaGVjayBpZiBpdCBjYW4gYmUgbWFwcGVkIGJ5IHRoZSBzb3VyY2UgbWFwLCB0aGVuIHVwZGF0ZSB0aGUgbWFwcGluZy5cbiAgICAgICAgICB2YXIgb3JpZ2luYWwgPSBhU291cmNlTWFwQ29uc3VtZXIub3JpZ2luYWxQb3NpdGlvbkZvcih7XG4gICAgICAgICAgICBsaW5lOiBtYXBwaW5nLm9yaWdpbmFsTGluZSxcbiAgICAgICAgICAgIGNvbHVtbjogbWFwcGluZy5vcmlnaW5hbENvbHVtblxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChvcmlnaW5hbC5zb3VyY2UgIT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gQ29weSBtYXBwaW5nXG4gICAgICAgICAgICBtYXBwaW5nLnNvdXJjZSA9IG9yaWdpbmFsLnNvdXJjZTtcbiAgICAgICAgICAgIGlmIChhU291cmNlTWFwUGF0aCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIG1hcHBpbmcuc291cmNlID0gdXRpbC5qb2luKGFTb3VyY2VNYXBQYXRoLCBtYXBwaW5nLnNvdXJjZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzb3VyY2VSb290ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgbWFwcGluZy5zb3VyY2UgPSB1dGlsLnJlbGF0aXZlKHNvdXJjZVJvb3QsIG1hcHBpbmcuc291cmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hcHBpbmcub3JpZ2luYWxMaW5lID0gb3JpZ2luYWwubGluZTtcbiAgICAgICAgICAgIG1hcHBpbmcub3JpZ2luYWxDb2x1bW4gPSBvcmlnaW5hbC5jb2x1bW47XG4gICAgICAgICAgICBpZiAob3JpZ2luYWwubmFtZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIG1hcHBpbmcubmFtZSA9IG9yaWdpbmFsLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNvdXJjZSA9IG1hcHBpbmcuc291cmNlO1xuICAgICAgICBpZiAoc291cmNlICE9IG51bGwgJiYgIW5ld1NvdXJjZXMuaGFzKHNvdXJjZSkpIHtcbiAgICAgICAgICBuZXdTb3VyY2VzLmFkZChzb3VyY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5hbWUgPSBtYXBwaW5nLm5hbWU7XG4gICAgICAgIGlmIChuYW1lICE9IG51bGwgJiYgIW5ld05hbWVzLmhhcyhuYW1lKSkge1xuICAgICAgICAgIG5ld05hbWVzLmFkZChuYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICB9LCB0aGlzKTtcbiAgICAgIHRoaXMuX3NvdXJjZXMgPSBuZXdTb3VyY2VzO1xuICAgICAgdGhpcy5fbmFtZXMgPSBuZXdOYW1lcztcblxuICAgICAgLy8gQ29weSBzb3VyY2VzQ29udGVudHMgb2YgYXBwbGllZCBtYXAuXG4gICAgICBhU291cmNlTWFwQ29uc3VtZXIuc291cmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChzb3VyY2VGaWxlKSB7XG4gICAgICAgIHZhciBjb250ZW50ID0gYVNvdXJjZU1hcENvbnN1bWVyLnNvdXJjZUNvbnRlbnRGb3Ioc291cmNlRmlsZSk7XG4gICAgICAgIGlmIChjb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgICBpZiAoYVNvdXJjZU1hcFBhdGggIT0gbnVsbCkge1xuICAgICAgICAgICAgc291cmNlRmlsZSA9IHV0aWwuam9pbihhU291cmNlTWFwUGF0aCwgc291cmNlRmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzb3VyY2VSb290ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHNvdXJjZUZpbGUgPSB1dGlsLnJlbGF0aXZlKHNvdXJjZVJvb3QsIHNvdXJjZUZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLnNldFNvdXJjZUNvbnRlbnQoc291cmNlRmlsZSwgY29udGVudCk7XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgIH07XG5cbiAgLyoqXG4gICAqIEEgbWFwcGluZyBjYW4gaGF2ZSBvbmUgb2YgdGhlIHRocmVlIGxldmVscyBvZiBkYXRhOlxuICAgKlxuICAgKiAgIDEuIEp1c3QgdGhlIGdlbmVyYXRlZCBwb3NpdGlvbi5cbiAgICogICAyLiBUaGUgR2VuZXJhdGVkIHBvc2l0aW9uLCBvcmlnaW5hbCBwb3NpdGlvbiwgYW5kIG9yaWdpbmFsIHNvdXJjZS5cbiAgICogICAzLiBHZW5lcmF0ZWQgYW5kIG9yaWdpbmFsIHBvc2l0aW9uLCBvcmlnaW5hbCBzb3VyY2UsIGFzIHdlbGwgYXMgYSBuYW1lXG4gICAqICAgICAgdG9rZW4uXG4gICAqXG4gICAqIFRvIG1haW50YWluIGNvbnNpc3RlbmN5LCB3ZSB2YWxpZGF0ZSB0aGF0IGFueSBuZXcgbWFwcGluZyBiZWluZyBhZGRlZCBmYWxsc1xuICAgKiBpbiB0byBvbmUgb2YgdGhlc2UgY2F0ZWdvcmllcy5cbiAgICovXG4gIFNvdXJjZU1hcEdlbmVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRlTWFwcGluZyA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwR2VuZXJhdG9yX3ZhbGlkYXRlTWFwcGluZyhhR2VuZXJhdGVkLCBhT3JpZ2luYWwsIGFTb3VyY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhTmFtZSkge1xuICAgICAgaWYgKGFHZW5lcmF0ZWQgJiYgJ2xpbmUnIGluIGFHZW5lcmF0ZWQgJiYgJ2NvbHVtbicgaW4gYUdlbmVyYXRlZFxuICAgICAgICAgICYmIGFHZW5lcmF0ZWQubGluZSA+IDAgJiYgYUdlbmVyYXRlZC5jb2x1bW4gPj0gMFxuICAgICAgICAgICYmICFhT3JpZ2luYWwgJiYgIWFTb3VyY2UgJiYgIWFOYW1lKSB7XG4gICAgICAgIC8vIENhc2UgMS5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoYUdlbmVyYXRlZCAmJiAnbGluZScgaW4gYUdlbmVyYXRlZCAmJiAnY29sdW1uJyBpbiBhR2VuZXJhdGVkXG4gICAgICAgICAgICAgICAmJiBhT3JpZ2luYWwgJiYgJ2xpbmUnIGluIGFPcmlnaW5hbCAmJiAnY29sdW1uJyBpbiBhT3JpZ2luYWxcbiAgICAgICAgICAgICAgICYmIGFHZW5lcmF0ZWQubGluZSA+IDAgJiYgYUdlbmVyYXRlZC5jb2x1bW4gPj0gMFxuICAgICAgICAgICAgICAgJiYgYU9yaWdpbmFsLmxpbmUgPiAwICYmIGFPcmlnaW5hbC5jb2x1bW4gPj0gMFxuICAgICAgICAgICAgICAgJiYgYVNvdXJjZSkge1xuICAgICAgICAvLyBDYXNlcyAyIGFuZCAzLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG1hcHBpbmc6ICcgKyBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgZ2VuZXJhdGVkOiBhR2VuZXJhdGVkLFxuICAgICAgICAgIHNvdXJjZTogYVNvdXJjZSxcbiAgICAgICAgICBvcmlnaW5hbDogYU9yaWdpbmFsLFxuICAgICAgICAgIG5hbWU6IGFOYW1lXG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gIC8qKlxuICAgKiBTZXJpYWxpemUgdGhlIGFjY3VtdWxhdGVkIG1hcHBpbmdzIGluIHRvIHRoZSBzdHJlYW0gb2YgYmFzZSA2NCBWTFFzXG4gICAqIHNwZWNpZmllZCBieSB0aGUgc291cmNlIG1hcCBmb3JtYXQuXG4gICAqL1xuICBTb3VyY2VNYXBHZW5lcmF0b3IucHJvdG90eXBlLl9zZXJpYWxpemVNYXBwaW5ncyA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwR2VuZXJhdG9yX3NlcmlhbGl6ZU1hcHBpbmdzKCkge1xuICAgICAgdmFyIHByZXZpb3VzR2VuZXJhdGVkQ29sdW1uID0gMDtcbiAgICAgIHZhciBwcmV2aW91c0dlbmVyYXRlZExpbmUgPSAxO1xuICAgICAgdmFyIHByZXZpb3VzT3JpZ2luYWxDb2x1bW4gPSAwO1xuICAgICAgdmFyIHByZXZpb3VzT3JpZ2luYWxMaW5lID0gMDtcbiAgICAgIHZhciBwcmV2aW91c05hbWUgPSAwO1xuICAgICAgdmFyIHByZXZpb3VzU291cmNlID0gMDtcbiAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgIHZhciBtYXBwaW5nO1xuXG4gICAgICB2YXIgbWFwcGluZ3MgPSB0aGlzLl9tYXBwaW5ncy50b0FycmF5KCk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBtYXBwaW5ncy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBtYXBwaW5nID0gbWFwcGluZ3NbaV07XG5cbiAgICAgICAgaWYgKG1hcHBpbmcuZ2VuZXJhdGVkTGluZSAhPT0gcHJldmlvdXNHZW5lcmF0ZWRMaW5lKSB7XG4gICAgICAgICAgcHJldmlvdXNHZW5lcmF0ZWRDb2x1bW4gPSAwO1xuICAgICAgICAgIHdoaWxlIChtYXBwaW5nLmdlbmVyYXRlZExpbmUgIT09IHByZXZpb3VzR2VuZXJhdGVkTGluZSkge1xuICAgICAgICAgICAgcmVzdWx0ICs9ICc7JztcbiAgICAgICAgICAgIHByZXZpb3VzR2VuZXJhdGVkTGluZSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgIGlmICghdXRpbC5jb21wYXJlQnlHZW5lcmF0ZWRQb3NpdGlvbnMobWFwcGluZywgbWFwcGluZ3NbaSAtIDFdKSkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdCArPSAnLCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0ICs9IGJhc2U2NFZMUS5lbmNvZGUobWFwcGluZy5nZW5lcmF0ZWRDb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSBwcmV2aW91c0dlbmVyYXRlZENvbHVtbik7XG4gICAgICAgIHByZXZpb3VzR2VuZXJhdGVkQ29sdW1uID0gbWFwcGluZy5nZW5lcmF0ZWRDb2x1bW47XG5cbiAgICAgICAgaWYgKG1hcHBpbmcuc291cmNlICE9IG51bGwpIHtcbiAgICAgICAgICByZXN1bHQgKz0gYmFzZTY0VkxRLmVuY29kZSh0aGlzLl9zb3VyY2VzLmluZGV4T2YobWFwcGluZy5zb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSBwcmV2aW91c1NvdXJjZSk7XG4gICAgICAgICAgcHJldmlvdXNTb3VyY2UgPSB0aGlzLl9zb3VyY2VzLmluZGV4T2YobWFwcGluZy5zb3VyY2UpO1xuXG4gICAgICAgICAgLy8gbGluZXMgYXJlIHN0b3JlZCAwLWJhc2VkIGluIFNvdXJjZU1hcCBzcGVjIHZlcnNpb24gM1xuICAgICAgICAgIHJlc3VsdCArPSBiYXNlNjRWTFEuZW5jb2RlKG1hcHBpbmcub3JpZ2luYWxMaW5lIC0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gcHJldmlvdXNPcmlnaW5hbExpbmUpO1xuICAgICAgICAgIHByZXZpb3VzT3JpZ2luYWxMaW5lID0gbWFwcGluZy5vcmlnaW5hbExpbmUgLSAxO1xuXG4gICAgICAgICAgcmVzdWx0ICs9IGJhc2U2NFZMUS5lbmNvZGUobWFwcGluZy5vcmlnaW5hbENvbHVtblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gcHJldmlvdXNPcmlnaW5hbENvbHVtbik7XG4gICAgICAgICAgcHJldmlvdXNPcmlnaW5hbENvbHVtbiA9IG1hcHBpbmcub3JpZ2luYWxDb2x1bW47XG5cbiAgICAgICAgICBpZiAobWFwcGluZy5uYW1lICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBiYXNlNjRWTFEuZW5jb2RlKHRoaXMuX25hbWVzLmluZGV4T2YobWFwcGluZy5uYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSBwcmV2aW91c05hbWUpO1xuICAgICAgICAgICAgcHJldmlvdXNOYW1lID0gdGhpcy5fbmFtZXMuaW5kZXhPZihtYXBwaW5nLm5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgU291cmNlTWFwR2VuZXJhdG9yLnByb3RvdHlwZS5fZ2VuZXJhdGVTb3VyY2VzQ29udGVudCA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwR2VuZXJhdG9yX2dlbmVyYXRlU291cmNlc0NvbnRlbnQoYVNvdXJjZXMsIGFTb3VyY2VSb290KSB7XG4gICAgICByZXR1cm4gYVNvdXJjZXMubWFwKGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9zb3VyY2VzQ29udGVudHMpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYVNvdXJjZVJvb3QgIT0gbnVsbCkge1xuICAgICAgICAgIHNvdXJjZSA9IHV0aWwucmVsYXRpdmUoYVNvdXJjZVJvb3QsIHNvdXJjZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleSA9IHV0aWwudG9TZXRTdHJpbmcoc291cmNlKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLl9zb3VyY2VzQ29udGVudHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5KVxuICAgICAgICAgID8gdGhpcy5fc291cmNlc0NvbnRlbnRzW2tleV1cbiAgICAgICAgICA6IG51bGw7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBFeHRlcm5hbGl6ZSB0aGUgc291cmNlIG1hcC5cbiAgICovXG4gIFNvdXJjZU1hcEdlbmVyYXRvci5wcm90b3R5cGUudG9KU09OID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBHZW5lcmF0b3JfdG9KU09OKCkge1xuICAgICAgdmFyIG1hcCA9IHtcbiAgICAgICAgdmVyc2lvbjogdGhpcy5fdmVyc2lvbixcbiAgICAgICAgc291cmNlczogdGhpcy5fc291cmNlcy50b0FycmF5KCksXG4gICAgICAgIG5hbWVzOiB0aGlzLl9uYW1lcy50b0FycmF5KCksXG4gICAgICAgIG1hcHBpbmdzOiB0aGlzLl9zZXJpYWxpemVNYXBwaW5ncygpXG4gICAgICB9O1xuICAgICAgaWYgKHRoaXMuX2ZpbGUgIT0gbnVsbCkge1xuICAgICAgICBtYXAuZmlsZSA9IHRoaXMuX2ZpbGU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5fc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgIG1hcC5zb3VyY2VSb290ID0gdGhpcy5fc291cmNlUm9vdDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9zb3VyY2VzQ29udGVudHMpIHtcbiAgICAgICAgbWFwLnNvdXJjZXNDb250ZW50ID0gdGhpcy5fZ2VuZXJhdGVTb3VyY2VzQ29udGVudChtYXAuc291cmNlcywgbWFwLnNvdXJjZVJvb3QpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWFwO1xuICAgIH07XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgc291cmNlIG1hcCBiZWluZyBnZW5lcmF0ZWQgdG8gYSBzdHJpbmcuXG4gICAqL1xuICBTb3VyY2VNYXBHZW5lcmF0b3IucHJvdG90eXBlLnRvU3RyaW5nID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBHZW5lcmF0b3JfdG9TdHJpbmcoKSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcyk7XG4gICAgfTtcblxuICBleHBvcnRzLlNvdXJjZU1hcEdlbmVyYXRvciA9IFNvdXJjZU1hcEdlbmVyYXRvcjtcblxufSk7XG4iLCIvKiAtKi0gTW9kZToganM7IGpzLWluZGVudC1sZXZlbDogMjsgLSotICovXG4vKlxuICogQ29weXJpZ2h0IDIwMTEgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFIG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBkZWZpbmUgPSByZXF1aXJlKCdhbWRlZmluZScpKG1vZHVsZSwgcmVxdWlyZSk7XG59XG5kZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gIHZhciBTb3VyY2VNYXBHZW5lcmF0b3IgPSByZXF1aXJlKCcuL3NvdXJjZS1tYXAtZ2VuZXJhdG9yJykuU291cmNlTWFwR2VuZXJhdG9yO1xuICB2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4gIC8vIE1hdGNoZXMgYSBXaW5kb3dzLXN0eWxlIGBcXHJcXG5gIG5ld2xpbmUgb3IgYSBgXFxuYCBuZXdsaW5lIHVzZWQgYnkgYWxsIG90aGVyXG4gIC8vIG9wZXJhdGluZyBzeXN0ZW1zIHRoZXNlIGRheXMgKGNhcHR1cmluZyB0aGUgcmVzdWx0KS5cbiAgdmFyIFJFR0VYX05FV0xJTkUgPSAvKFxccj9cXG4pLztcblxuICAvLyBOZXdsaW5lIGNoYXJhY3RlciBjb2RlIGZvciBjaGFyQ29kZUF0KCkgY29tcGFyaXNvbnNcbiAgdmFyIE5FV0xJTkVfQ09ERSA9IDEwO1xuXG4gIC8vIFByaXZhdGUgc3ltYm9sIGZvciBpZGVudGlmeWluZyBgU291cmNlTm9kZWBzIHdoZW4gbXVsdGlwbGUgdmVyc2lvbnMgb2ZcbiAgLy8gdGhlIHNvdXJjZS1tYXAgbGlicmFyeSBhcmUgbG9hZGVkLiBUaGlzIE1VU1QgTk9UIENIQU5HRSBhY3Jvc3NcbiAgLy8gdmVyc2lvbnMhXG4gIHZhciBpc1NvdXJjZU5vZGUgPSBcIiQkJGlzU291cmNlTm9kZSQkJFwiO1xuXG4gIC8qKlxuICAgKiBTb3VyY2VOb2RlcyBwcm92aWRlIGEgd2F5IHRvIGFic3RyYWN0IG92ZXIgaW50ZXJwb2xhdGluZy9jb25jYXRlbmF0aW5nXG4gICAqIHNuaXBwZXRzIG9mIGdlbmVyYXRlZCBKYXZhU2NyaXB0IHNvdXJjZSBjb2RlIHdoaWxlIG1haW50YWluaW5nIHRoZSBsaW5lIGFuZFxuICAgKiBjb2x1bW4gaW5mb3JtYXRpb24gYXNzb2NpYXRlZCB3aXRoIHRoZSBvcmlnaW5hbCBzb3VyY2UgY29kZS5cbiAgICpcbiAgICogQHBhcmFtIGFMaW5lIFRoZSBvcmlnaW5hbCBsaW5lIG51bWJlci5cbiAgICogQHBhcmFtIGFDb2x1bW4gVGhlIG9yaWdpbmFsIGNvbHVtbiBudW1iZXIuXG4gICAqIEBwYXJhbSBhU291cmNlIFRoZSBvcmlnaW5hbCBzb3VyY2UncyBmaWxlbmFtZS5cbiAgICogQHBhcmFtIGFDaHVua3MgT3B0aW9uYWwuIEFuIGFycmF5IG9mIHN0cmluZ3Mgd2hpY2ggYXJlIHNuaXBwZXRzIG9mXG4gICAqICAgICAgICBnZW5lcmF0ZWQgSlMsIG9yIG90aGVyIFNvdXJjZU5vZGVzLlxuICAgKiBAcGFyYW0gYU5hbWUgVGhlIG9yaWdpbmFsIGlkZW50aWZpZXIuXG4gICAqL1xuICBmdW5jdGlvbiBTb3VyY2VOb2RlKGFMaW5lLCBhQ29sdW1uLCBhU291cmNlLCBhQ2h1bmtzLCBhTmFtZSkge1xuICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgICB0aGlzLnNvdXJjZUNvbnRlbnRzID0ge307XG4gICAgdGhpcy5saW5lID0gYUxpbmUgPT0gbnVsbCA/IG51bGwgOiBhTGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IGFDb2x1bW4gPT0gbnVsbCA/IG51bGwgOiBhQ29sdW1uO1xuICAgIHRoaXMuc291cmNlID0gYVNvdXJjZSA9PSBudWxsID8gbnVsbCA6IGFTb3VyY2U7XG4gICAgdGhpcy5uYW1lID0gYU5hbWUgPT0gbnVsbCA/IG51bGwgOiBhTmFtZTtcbiAgICB0aGlzW2lzU291cmNlTm9kZV0gPSB0cnVlO1xuICAgIGlmIChhQ2h1bmtzICE9IG51bGwpIHRoaXMuYWRkKGFDaHVua3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBTb3VyY2VOb2RlIGZyb20gZ2VuZXJhdGVkIGNvZGUgYW5kIGEgU291cmNlTWFwQ29uc3VtZXIuXG4gICAqXG4gICAqIEBwYXJhbSBhR2VuZXJhdGVkQ29kZSBUaGUgZ2VuZXJhdGVkIGNvZGVcbiAgICogQHBhcmFtIGFTb3VyY2VNYXBDb25zdW1lciBUaGUgU291cmNlTWFwIGZvciB0aGUgZ2VuZXJhdGVkIGNvZGVcbiAgICogQHBhcmFtIGFSZWxhdGl2ZVBhdGggT3B0aW9uYWwuIFRoZSBwYXRoIHRoYXQgcmVsYXRpdmUgc291cmNlcyBpbiB0aGVcbiAgICogICAgICAgIFNvdXJjZU1hcENvbnN1bWVyIHNob3VsZCBiZSByZWxhdGl2ZSB0by5cbiAgICovXG4gIFNvdXJjZU5vZGUuZnJvbVN0cmluZ1dpdGhTb3VyY2VNYXAgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU5vZGVfZnJvbVN0cmluZ1dpdGhTb3VyY2VNYXAoYUdlbmVyYXRlZENvZGUsIGFTb3VyY2VNYXBDb25zdW1lciwgYVJlbGF0aXZlUGF0aCkge1xuICAgICAgLy8gVGhlIFNvdXJjZU5vZGUgd2Ugd2FudCB0byBmaWxsIHdpdGggdGhlIGdlbmVyYXRlZCBjb2RlXG4gICAgICAvLyBhbmQgdGhlIFNvdXJjZU1hcFxuICAgICAgdmFyIG5vZGUgPSBuZXcgU291cmNlTm9kZSgpO1xuXG4gICAgICAvLyBBbGwgZXZlbiBpbmRpY2VzIG9mIHRoaXMgYXJyYXkgYXJlIG9uZSBsaW5lIG9mIHRoZSBnZW5lcmF0ZWQgY29kZSxcbiAgICAgIC8vIHdoaWxlIGFsbCBvZGQgaW5kaWNlcyBhcmUgdGhlIG5ld2xpbmVzIGJldHdlZW4gdHdvIGFkamFjZW50IGxpbmVzXG4gICAgICAvLyAoc2luY2UgYFJFR0VYX05FV0xJTkVgIGNhcHR1cmVzIGl0cyBtYXRjaCkuXG4gICAgICAvLyBQcm9jZXNzZWQgZnJhZ21lbnRzIGFyZSByZW1vdmVkIGZyb20gdGhpcyBhcnJheSwgYnkgY2FsbGluZyBgc2hpZnROZXh0TGluZWAuXG4gICAgICB2YXIgcmVtYWluaW5nTGluZXMgPSBhR2VuZXJhdGVkQ29kZS5zcGxpdChSRUdFWF9ORVdMSU5FKTtcbiAgICAgIHZhciBzaGlmdE5leHRMaW5lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBsaW5lQ29udGVudHMgPSByZW1haW5pbmdMaW5lcy5zaGlmdCgpO1xuICAgICAgICAvLyBUaGUgbGFzdCBsaW5lIG9mIGEgZmlsZSBtaWdodCBub3QgaGF2ZSBhIG5ld2xpbmUuXG4gICAgICAgIHZhciBuZXdMaW5lID0gcmVtYWluaW5nTGluZXMuc2hpZnQoKSB8fCBcIlwiO1xuICAgICAgICByZXR1cm4gbGluZUNvbnRlbnRzICsgbmV3TGluZTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFdlIG5lZWQgdG8gcmVtZW1iZXIgdGhlIHBvc2l0aW9uIG9mIFwicmVtYWluaW5nTGluZXNcIlxuICAgICAgdmFyIGxhc3RHZW5lcmF0ZWRMaW5lID0gMSwgbGFzdEdlbmVyYXRlZENvbHVtbiA9IDA7XG5cbiAgICAgIC8vIFRoZSBnZW5lcmF0ZSBTb3VyY2VOb2RlcyB3ZSBuZWVkIGEgY29kZSByYW5nZS5cbiAgICAgIC8vIFRvIGV4dHJhY3QgaXQgY3VycmVudCBhbmQgbGFzdCBtYXBwaW5nIGlzIHVzZWQuXG4gICAgICAvLyBIZXJlIHdlIHN0b3JlIHRoZSBsYXN0IG1hcHBpbmcuXG4gICAgICB2YXIgbGFzdE1hcHBpbmcgPSBudWxsO1xuXG4gICAgICBhU291cmNlTWFwQ29uc3VtZXIuZWFjaE1hcHBpbmcoZnVuY3Rpb24gKG1hcHBpbmcpIHtcbiAgICAgICAgaWYgKGxhc3RNYXBwaW5nICE9PSBudWxsKSB7XG4gICAgICAgICAgLy8gV2UgYWRkIHRoZSBjb2RlIGZyb20gXCJsYXN0TWFwcGluZ1wiIHRvIFwibWFwcGluZ1wiOlxuICAgICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIHRoZXJlIGlzIGEgbmV3IGxpbmUgaW4gYmV0d2Vlbi5cbiAgICAgICAgICBpZiAobGFzdEdlbmVyYXRlZExpbmUgPCBtYXBwaW5nLmdlbmVyYXRlZExpbmUpIHtcbiAgICAgICAgICAgIHZhciBjb2RlID0gXCJcIjtcbiAgICAgICAgICAgIC8vIEFzc29jaWF0ZSBmaXJzdCBsaW5lIHdpdGggXCJsYXN0TWFwcGluZ1wiXG4gICAgICAgICAgICBhZGRNYXBwaW5nV2l0aENvZGUobGFzdE1hcHBpbmcsIHNoaWZ0TmV4dExpbmUoKSk7XG4gICAgICAgICAgICBsYXN0R2VuZXJhdGVkTGluZSsrO1xuICAgICAgICAgICAgbGFzdEdlbmVyYXRlZENvbHVtbiA9IDA7XG4gICAgICAgICAgICAvLyBUaGUgcmVtYWluaW5nIGNvZGUgaXMgYWRkZWQgd2l0aG91dCBtYXBwaW5nXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRoZXJlIGlzIG5vIG5ldyBsaW5lIGluIGJldHdlZW4uXG4gICAgICAgICAgICAvLyBBc3NvY2lhdGUgdGhlIGNvZGUgYmV0d2VlbiBcImxhc3RHZW5lcmF0ZWRDb2x1bW5cIiBhbmRcbiAgICAgICAgICAgIC8vIFwibWFwcGluZy5nZW5lcmF0ZWRDb2x1bW5cIiB3aXRoIFwibGFzdE1hcHBpbmdcIlxuICAgICAgICAgICAgdmFyIG5leHRMaW5lID0gcmVtYWluaW5nTGluZXNbMF07XG4gICAgICAgICAgICB2YXIgY29kZSA9IG5leHRMaW5lLnN1YnN0cigwLCBtYXBwaW5nLmdlbmVyYXRlZENvbHVtbiAtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0R2VuZXJhdGVkQ29sdW1uKTtcbiAgICAgICAgICAgIHJlbWFpbmluZ0xpbmVzWzBdID0gbmV4dExpbmUuc3Vic3RyKG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uIC1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RHZW5lcmF0ZWRDb2x1bW4pO1xuICAgICAgICAgICAgbGFzdEdlbmVyYXRlZENvbHVtbiA9IG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uO1xuICAgICAgICAgICAgYWRkTWFwcGluZ1dpdGhDb2RlKGxhc3RNYXBwaW5nLCBjb2RlKTtcbiAgICAgICAgICAgIC8vIE5vIG1vcmUgcmVtYWluaW5nIGNvZGUsIGNvbnRpbnVlXG4gICAgICAgICAgICBsYXN0TWFwcGluZyA9IG1hcHBpbmc7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGFkZCB0aGUgZ2VuZXJhdGVkIGNvZGUgdW50aWwgdGhlIGZpcnN0IG1hcHBpbmdcbiAgICAgICAgLy8gdG8gdGhlIFNvdXJjZU5vZGUgd2l0aG91dCBhbnkgbWFwcGluZy5cbiAgICAgICAgLy8gRWFjaCBsaW5lIGlzIGFkZGVkIGFzIHNlcGFyYXRlIHN0cmluZy5cbiAgICAgICAgd2hpbGUgKGxhc3RHZW5lcmF0ZWRMaW5lIDwgbWFwcGluZy5nZW5lcmF0ZWRMaW5lKSB7XG4gICAgICAgICAgbm9kZS5hZGQoc2hpZnROZXh0TGluZSgpKTtcbiAgICAgICAgICBsYXN0R2VuZXJhdGVkTGluZSsrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsYXN0R2VuZXJhdGVkQ29sdW1uIDwgbWFwcGluZy5nZW5lcmF0ZWRDb2x1bW4pIHtcbiAgICAgICAgICB2YXIgbmV4dExpbmUgPSByZW1haW5pbmdMaW5lc1swXTtcbiAgICAgICAgICBub2RlLmFkZChuZXh0TGluZS5zdWJzdHIoMCwgbWFwcGluZy5nZW5lcmF0ZWRDb2x1bW4pKTtcbiAgICAgICAgICByZW1haW5pbmdMaW5lc1swXSA9IG5leHRMaW5lLnN1YnN0cihtYXBwaW5nLmdlbmVyYXRlZENvbHVtbik7XG4gICAgICAgICAgbGFzdEdlbmVyYXRlZENvbHVtbiA9IG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RNYXBwaW5nID0gbWFwcGluZztcbiAgICAgIH0sIHRoaXMpO1xuICAgICAgLy8gV2UgaGF2ZSBwcm9jZXNzZWQgYWxsIG1hcHBpbmdzLlxuICAgICAgaWYgKHJlbWFpbmluZ0xpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKGxhc3RNYXBwaW5nKSB7XG4gICAgICAgICAgLy8gQXNzb2NpYXRlIHRoZSByZW1haW5pbmcgY29kZSBpbiB0aGUgY3VycmVudCBsaW5lIHdpdGggXCJsYXN0TWFwcGluZ1wiXG4gICAgICAgICAgYWRkTWFwcGluZ1dpdGhDb2RlKGxhc3RNYXBwaW5nLCBzaGlmdE5leHRMaW5lKCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGFuZCBhZGQgdGhlIHJlbWFpbmluZyBsaW5lcyB3aXRob3V0IGFueSBtYXBwaW5nXG4gICAgICAgIG5vZGUuYWRkKHJlbWFpbmluZ0xpbmVzLmpvaW4oXCJcIikpO1xuICAgICAgfVxuXG4gICAgICAvLyBDb3B5IHNvdXJjZXNDb250ZW50IGludG8gU291cmNlTm9kZVxuICAgICAgYVNvdXJjZU1hcENvbnN1bWVyLnNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlRmlsZSkge1xuICAgICAgICB2YXIgY29udGVudCA9IGFTb3VyY2VNYXBDb25zdW1lci5zb3VyY2VDb250ZW50Rm9yKHNvdXJjZUZpbGUpO1xuICAgICAgICBpZiAoY29udGVudCAhPSBudWxsKSB7XG4gICAgICAgICAgaWYgKGFSZWxhdGl2ZVBhdGggIT0gbnVsbCkge1xuICAgICAgICAgICAgc291cmNlRmlsZSA9IHV0aWwuam9pbihhUmVsYXRpdmVQYXRoLCBzb3VyY2VGaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbm9kZS5zZXRTb3VyY2VDb250ZW50KHNvdXJjZUZpbGUsIGNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIG5vZGU7XG5cbiAgICAgIGZ1bmN0aW9uIGFkZE1hcHBpbmdXaXRoQ29kZShtYXBwaW5nLCBjb2RlKSB7XG4gICAgICAgIGlmIChtYXBwaW5nID09PSBudWxsIHx8IG1hcHBpbmcuc291cmNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBub2RlLmFkZChjb2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgc291cmNlID0gYVJlbGF0aXZlUGF0aFxuICAgICAgICAgICAgPyB1dGlsLmpvaW4oYVJlbGF0aXZlUGF0aCwgbWFwcGluZy5zb3VyY2UpXG4gICAgICAgICAgICA6IG1hcHBpbmcuc291cmNlO1xuICAgICAgICAgIG5vZGUuYWRkKG5ldyBTb3VyY2VOb2RlKG1hcHBpbmcub3JpZ2luYWxMaW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcHBpbmcub3JpZ2luYWxDb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwcGluZy5uYW1lKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gIC8qKlxuICAgKiBBZGQgYSBjaHVuayBvZiBnZW5lcmF0ZWQgSlMgdG8gdGhpcyBzb3VyY2Ugbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIGFDaHVuayBBIHN0cmluZyBzbmlwcGV0IG9mIGdlbmVyYXRlZCBKUyBjb2RlLCBhbm90aGVyIGluc3RhbmNlIG9mXG4gICAqICAgICAgICBTb3VyY2VOb2RlLCBvciBhbiBhcnJheSB3aGVyZSBlYWNoIG1lbWJlciBpcyBvbmUgb2YgdGhvc2UgdGhpbmdzLlxuICAgKi9cbiAgU291cmNlTm9kZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gU291cmNlTm9kZV9hZGQoYUNodW5rKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYUNodW5rKSkge1xuICAgICAgYUNodW5rLmZvckVhY2goZnVuY3Rpb24gKGNodW5rKSB7XG4gICAgICAgIHRoaXMuYWRkKGNodW5rKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgICBlbHNlIGlmIChhQ2h1bmtbaXNTb3VyY2VOb2RlXSB8fCB0eXBlb2YgYUNodW5rID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBpZiAoYUNodW5rKSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChhQ2h1bmspO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgIFwiRXhwZWN0ZWQgYSBTb3VyY2VOb2RlLCBzdHJpbmcsIG9yIGFuIGFycmF5IG9mIFNvdXJjZU5vZGVzIGFuZCBzdHJpbmdzLiBHb3QgXCIgKyBhQ2h1bmtcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBZGQgYSBjaHVuayBvZiBnZW5lcmF0ZWQgSlMgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGlzIHNvdXJjZSBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0gYUNodW5rIEEgc3RyaW5nIHNuaXBwZXQgb2YgZ2VuZXJhdGVkIEpTIGNvZGUsIGFub3RoZXIgaW5zdGFuY2Ugb2ZcbiAgICogICAgICAgIFNvdXJjZU5vZGUsIG9yIGFuIGFycmF5IHdoZXJlIGVhY2ggbWVtYmVyIGlzIG9uZSBvZiB0aG9zZSB0aGluZ3MuXG4gICAqL1xuICBTb3VyY2VOb2RlLnByb3RvdHlwZS5wcmVwZW5kID0gZnVuY3Rpb24gU291cmNlTm9kZV9wcmVwZW5kKGFDaHVuaykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFDaHVuaykpIHtcbiAgICAgIGZvciAodmFyIGkgPSBhQ2h1bmsubGVuZ3RoLTE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIHRoaXMucHJlcGVuZChhQ2h1bmtbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChhQ2h1bmtbaXNTb3VyY2VOb2RlXSB8fCB0eXBlb2YgYUNodW5rID09PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aGlzLmNoaWxkcmVuLnVuc2hpZnQoYUNodW5rKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICBcIkV4cGVjdGVkIGEgU291cmNlTm9kZSwgc3RyaW5nLCBvciBhbiBhcnJheSBvZiBTb3VyY2VOb2RlcyBhbmQgc3RyaW5ncy4gR290IFwiICsgYUNodW5rXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogV2FsayBvdmVyIHRoZSB0cmVlIG9mIEpTIHNuaXBwZXRzIGluIHRoaXMgbm9kZSBhbmQgaXRzIGNoaWxkcmVuLiBUaGVcbiAgICogd2Fsa2luZyBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBmb3IgZWFjaCBzbmlwcGV0IG9mIEpTIGFuZCBpcyBwYXNzZWQgdGhhdFxuICAgKiBzbmlwcGV0IGFuZCB0aGUgaXRzIG9yaWdpbmFsIGFzc29jaWF0ZWQgc291cmNlJ3MgbGluZS9jb2x1bW4gbG9jYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBhRm4gVGhlIHRyYXZlcnNhbCBmdW5jdGlvbi5cbiAgICovXG4gIFNvdXJjZU5vZGUucHJvdG90eXBlLndhbGsgPSBmdW5jdGlvbiBTb3VyY2VOb2RlX3dhbGsoYUZuKSB7XG4gICAgdmFyIGNodW5rO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBjaHVuayA9IHRoaXMuY2hpbGRyZW5baV07XG4gICAgICBpZiAoY2h1bmtbaXNTb3VyY2VOb2RlXSkge1xuICAgICAgICBjaHVuay53YWxrKGFGbik7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYgKGNodW5rICE9PSAnJykge1xuICAgICAgICAgIGFGbihjaHVuaywgeyBzb3VyY2U6IHRoaXMuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5jb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMubmFtZSB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogTGlrZSBgU3RyaW5nLnByb3RvdHlwZS5qb2luYCBleGNlcHQgZm9yIFNvdXJjZU5vZGVzLiBJbnNlcnRzIGBhU3RyYCBiZXR3ZWVuXG4gICAqIGVhY2ggb2YgYHRoaXMuY2hpbGRyZW5gLlxuICAgKlxuICAgKiBAcGFyYW0gYVNlcCBUaGUgc2VwYXJhdG9yLlxuICAgKi9cbiAgU291cmNlTm9kZS5wcm90b3R5cGUuam9pbiA9IGZ1bmN0aW9uIFNvdXJjZU5vZGVfam9pbihhU2VwKSB7XG4gICAgdmFyIG5ld0NoaWxkcmVuO1xuICAgIHZhciBpO1xuICAgIHZhciBsZW4gPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgICBpZiAobGVuID4gMCkge1xuICAgICAgbmV3Q2hpbGRyZW4gPSBbXTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW4tMTsgaSsrKSB7XG4gICAgICAgIG5ld0NoaWxkcmVuLnB1c2godGhpcy5jaGlsZHJlbltpXSk7XG4gICAgICAgIG5ld0NoaWxkcmVuLnB1c2goYVNlcCk7XG4gICAgICB9XG4gICAgICBuZXdDaGlsZHJlbi5wdXNoKHRoaXMuY2hpbGRyZW5baV0pO1xuICAgICAgdGhpcy5jaGlsZHJlbiA9IG5ld0NoaWxkcmVuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbCBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2Ugb24gdGhlIHZlcnkgcmlnaHQtbW9zdCBzb3VyY2Ugc25pcHBldC4gVXNlZnVsXG4gICAqIGZvciB0cmltbWluZyB3aGl0ZXNwYWNlIGZyb20gdGhlIGVuZCBvZiBhIHNvdXJjZSBub2RlLCBldGMuXG4gICAqXG4gICAqIEBwYXJhbSBhUGF0dGVybiBUaGUgcGF0dGVybiB0byByZXBsYWNlLlxuICAgKiBAcGFyYW0gYVJlcGxhY2VtZW50IFRoZSB0aGluZyB0byByZXBsYWNlIHRoZSBwYXR0ZXJuIHdpdGguXG4gICAqL1xuICBTb3VyY2VOb2RlLnByb3RvdHlwZS5yZXBsYWNlUmlnaHQgPSBmdW5jdGlvbiBTb3VyY2VOb2RlX3JlcGxhY2VSaWdodChhUGF0dGVybiwgYVJlcGxhY2VtZW50KSB7XG4gICAgdmFyIGxhc3RDaGlsZCA9IHRoaXMuY2hpbGRyZW5bdGhpcy5jaGlsZHJlbi5sZW5ndGggLSAxXTtcbiAgICBpZiAobGFzdENoaWxkW2lzU291cmNlTm9kZV0pIHtcbiAgICAgIGxhc3RDaGlsZC5yZXBsYWNlUmlnaHQoYVBhdHRlcm4sIGFSZXBsYWNlbWVudCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBsYXN0Q2hpbGQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmNoaWxkcmVuW3RoaXMuY2hpbGRyZW4ubGVuZ3RoIC0gMV0gPSBsYXN0Q2hpbGQucmVwbGFjZShhUGF0dGVybiwgYVJlcGxhY2VtZW50KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLmNoaWxkcmVuLnB1c2goJycucmVwbGFjZShhUGF0dGVybiwgYVJlcGxhY2VtZW50KSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgdGhlIHNvdXJjZSBjb250ZW50IGZvciBhIHNvdXJjZSBmaWxlLiBUaGlzIHdpbGwgYmUgYWRkZWQgdG8gdGhlIFNvdXJjZU1hcEdlbmVyYXRvclxuICAgKiBpbiB0aGUgc291cmNlc0NvbnRlbnQgZmllbGQuXG4gICAqXG4gICAqIEBwYXJhbSBhU291cmNlRmlsZSBUaGUgZmlsZW5hbWUgb2YgdGhlIHNvdXJjZSBmaWxlXG4gICAqIEBwYXJhbSBhU291cmNlQ29udGVudCBUaGUgY29udGVudCBvZiB0aGUgc291cmNlIGZpbGVcbiAgICovXG4gIFNvdXJjZU5vZGUucHJvdG90eXBlLnNldFNvdXJjZUNvbnRlbnQgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU5vZGVfc2V0U291cmNlQ29udGVudChhU291cmNlRmlsZSwgYVNvdXJjZUNvbnRlbnQpIHtcbiAgICAgIHRoaXMuc291cmNlQ29udGVudHNbdXRpbC50b1NldFN0cmluZyhhU291cmNlRmlsZSldID0gYVNvdXJjZUNvbnRlbnQ7XG4gICAgfTtcblxuICAvKipcbiAgICogV2FsayBvdmVyIHRoZSB0cmVlIG9mIFNvdXJjZU5vZGVzLiBUaGUgd2Fsa2luZyBmdW5jdGlvbiBpcyBjYWxsZWQgZm9yIGVhY2hcbiAgICogc291cmNlIGZpbGUgY29udGVudCBhbmQgaXMgcGFzc2VkIHRoZSBmaWxlbmFtZSBhbmQgc291cmNlIGNvbnRlbnQuXG4gICAqXG4gICAqIEBwYXJhbSBhRm4gVGhlIHRyYXZlcnNhbCBmdW5jdGlvbi5cbiAgICovXG4gIFNvdXJjZU5vZGUucHJvdG90eXBlLndhbGtTb3VyY2VDb250ZW50cyA9XG4gICAgZnVuY3Rpb24gU291cmNlTm9kZV93YWxrU291cmNlQ29udGVudHMoYUZuKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAodGhpcy5jaGlsZHJlbltpXVtpc1NvdXJjZU5vZGVdKSB7XG4gICAgICAgICAgdGhpcy5jaGlsZHJlbltpXS53YWxrU291cmNlQ29udGVudHMoYUZuKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgc291cmNlcyA9IE9iamVjdC5rZXlzKHRoaXMuc291cmNlQ29udGVudHMpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHNvdXJjZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgYUZuKHV0aWwuZnJvbVNldFN0cmluZyhzb3VyY2VzW2ldKSwgdGhpcy5zb3VyY2VDb250ZW50c1tzb3VyY2VzW2ldXSk7XG4gICAgICB9XG4gICAgfTtcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBzb3VyY2Ugbm9kZS4gV2Fsa3Mgb3ZlciB0aGUgdHJlZVxuICAgKiBhbmQgY29uY2F0ZW5hdGVzIGFsbCB0aGUgdmFyaW91cyBzbmlwcGV0cyB0b2dldGhlciB0byBvbmUgc3RyaW5nLlxuICAgKi9cbiAgU291cmNlTm9kZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiBTb3VyY2VOb2RlX3RvU3RyaW5nKCkge1xuICAgIHZhciBzdHIgPSBcIlwiO1xuICAgIHRoaXMud2FsayhmdW5jdGlvbiAoY2h1bmspIHtcbiAgICAgIHN0ciArPSBjaHVuaztcbiAgICB9KTtcbiAgICByZXR1cm4gc3RyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBzb3VyY2Ugbm9kZSBhbG9uZyB3aXRoIGEgc291cmNlXG4gICAqIG1hcC5cbiAgICovXG4gIFNvdXJjZU5vZGUucHJvdG90eXBlLnRvU3RyaW5nV2l0aFNvdXJjZU1hcCA9IGZ1bmN0aW9uIFNvdXJjZU5vZGVfdG9TdHJpbmdXaXRoU291cmNlTWFwKGFBcmdzKSB7XG4gICAgdmFyIGdlbmVyYXRlZCA9IHtcbiAgICAgIGNvZGU6IFwiXCIsXG4gICAgICBsaW5lOiAxLFxuICAgICAgY29sdW1uOiAwXG4gICAgfTtcbiAgICB2YXIgbWFwID0gbmV3IFNvdXJjZU1hcEdlbmVyYXRvcihhQXJncyk7XG4gICAgdmFyIHNvdXJjZU1hcHBpbmdBY3RpdmUgPSBmYWxzZTtcbiAgICB2YXIgbGFzdE9yaWdpbmFsU291cmNlID0gbnVsbDtcbiAgICB2YXIgbGFzdE9yaWdpbmFsTGluZSA9IG51bGw7XG4gICAgdmFyIGxhc3RPcmlnaW5hbENvbHVtbiA9IG51bGw7XG4gICAgdmFyIGxhc3RPcmlnaW5hbE5hbWUgPSBudWxsO1xuICAgIHRoaXMud2FsayhmdW5jdGlvbiAoY2h1bmssIG9yaWdpbmFsKSB7XG4gICAgICBnZW5lcmF0ZWQuY29kZSArPSBjaHVuaztcbiAgICAgIGlmIChvcmlnaW5hbC5zb3VyY2UgIT09IG51bGxcbiAgICAgICAgICAmJiBvcmlnaW5hbC5saW5lICE9PSBudWxsXG4gICAgICAgICAgJiYgb3JpZ2luYWwuY29sdW1uICE9PSBudWxsKSB7XG4gICAgICAgIGlmKGxhc3RPcmlnaW5hbFNvdXJjZSAhPT0gb3JpZ2luYWwuc291cmNlXG4gICAgICAgICAgIHx8IGxhc3RPcmlnaW5hbExpbmUgIT09IG9yaWdpbmFsLmxpbmVcbiAgICAgICAgICAgfHwgbGFzdE9yaWdpbmFsQ29sdW1uICE9PSBvcmlnaW5hbC5jb2x1bW5cbiAgICAgICAgICAgfHwgbGFzdE9yaWdpbmFsTmFtZSAhPT0gb3JpZ2luYWwubmFtZSkge1xuICAgICAgICAgIG1hcC5hZGRNYXBwaW5nKHtcbiAgICAgICAgICAgIHNvdXJjZTogb3JpZ2luYWwuc291cmNlLFxuICAgICAgICAgICAgb3JpZ2luYWw6IHtcbiAgICAgICAgICAgICAgbGluZTogb3JpZ2luYWwubGluZSxcbiAgICAgICAgICAgICAgY29sdW1uOiBvcmlnaW5hbC5jb2x1bW5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgICAgICAgbGluZTogZ2VuZXJhdGVkLmxpbmUsXG4gICAgICAgICAgICAgIGNvbHVtbjogZ2VuZXJhdGVkLmNvbHVtblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5hbWU6IG9yaWdpbmFsLm5hbWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0T3JpZ2luYWxTb3VyY2UgPSBvcmlnaW5hbC5zb3VyY2U7XG4gICAgICAgIGxhc3RPcmlnaW5hbExpbmUgPSBvcmlnaW5hbC5saW5lO1xuICAgICAgICBsYXN0T3JpZ2luYWxDb2x1bW4gPSBvcmlnaW5hbC5jb2x1bW47XG4gICAgICAgIGxhc3RPcmlnaW5hbE5hbWUgPSBvcmlnaW5hbC5uYW1lO1xuICAgICAgICBzb3VyY2VNYXBwaW5nQWN0aXZlID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlTWFwcGluZ0FjdGl2ZSkge1xuICAgICAgICBtYXAuYWRkTWFwcGluZyh7XG4gICAgICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgICAgICBsaW5lOiBnZW5lcmF0ZWQubGluZSxcbiAgICAgICAgICAgIGNvbHVtbjogZ2VuZXJhdGVkLmNvbHVtblxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGxhc3RPcmlnaW5hbFNvdXJjZSA9IG51bGw7XG4gICAgICAgIHNvdXJjZU1hcHBpbmdBY3RpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGlkeCA9IDAsIGxlbmd0aCA9IGNodW5rLmxlbmd0aDsgaWR4IDwgbGVuZ3RoOyBpZHgrKykge1xuICAgICAgICBpZiAoY2h1bmsuY2hhckNvZGVBdChpZHgpID09PSBORVdMSU5FX0NPREUpIHtcbiAgICAgICAgICBnZW5lcmF0ZWQubGluZSsrO1xuICAgICAgICAgIGdlbmVyYXRlZC5jb2x1bW4gPSAwO1xuICAgICAgICAgIC8vIE1hcHBpbmdzIGVuZCBhdCBlb2xcbiAgICAgICAgICBpZiAoaWR4ICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgICBsYXN0T3JpZ2luYWxTb3VyY2UgPSBudWxsO1xuICAgICAgICAgICAgc291cmNlTWFwcGluZ0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlTWFwcGluZ0FjdGl2ZSkge1xuICAgICAgICAgICAgbWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgICBzb3VyY2U6IG9yaWdpbmFsLnNvdXJjZSxcbiAgICAgICAgICAgICAgb3JpZ2luYWw6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBvcmlnaW5hbC5saW5lLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogb3JpZ2luYWwuY29sdW1uXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGdlbmVyYXRlZDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGdlbmVyYXRlZC5saW5lLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogZ2VuZXJhdGVkLmNvbHVtblxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBuYW1lOiBvcmlnaW5hbC5uYW1lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZ2VuZXJhdGVkLmNvbHVtbisrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy53YWxrU291cmNlQ29udGVudHMoZnVuY3Rpb24gKHNvdXJjZUZpbGUsIHNvdXJjZUNvbnRlbnQpIHtcbiAgICAgIG1hcC5zZXRTb3VyY2VDb250ZW50KHNvdXJjZUZpbGUsIHNvdXJjZUNvbnRlbnQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgY29kZTogZ2VuZXJhdGVkLmNvZGUsIG1hcDogbWFwIH07XG4gIH07XG5cbiAgZXhwb3J0cy5Tb3VyY2VOb2RlID0gU291cmNlTm9kZTtcblxufSk7XG4iLCIvKiAtKi0gTW9kZToganM7IGpzLWluZGVudC1sZXZlbDogMjsgLSotICovXG4vKlxuICogQ29weXJpZ2h0IDIwMTEgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFIG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBkZWZpbmUgPSByZXF1aXJlKCdhbWRlZmluZScpKG1vZHVsZSwgcmVxdWlyZSk7XG59XG5kZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gIC8qKlxuICAgKiBUaGlzIGlzIGEgaGVscGVyIGZ1bmN0aW9uIGZvciBnZXR0aW5nIHZhbHVlcyBmcm9tIHBhcmFtZXRlci9vcHRpb25zXG4gICAqIG9iamVjdHMuXG4gICAqXG4gICAqIEBwYXJhbSBhcmdzIFRoZSBvYmplY3Qgd2UgYXJlIGV4dHJhY3RpbmcgdmFsdWVzIGZyb21cbiAgICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIHByb3BlcnR5IHdlIGFyZSBnZXR0aW5nLlxuICAgKiBAcGFyYW0gZGVmYXVsdFZhbHVlIEFuIG9wdGlvbmFsIHZhbHVlIHRvIHJldHVybiBpZiB0aGUgcHJvcGVydHkgaXMgbWlzc2luZ1xuICAgKiBmcm9tIHRoZSBvYmplY3QuIElmIHRoaXMgaXMgbm90IHNwZWNpZmllZCBhbmQgdGhlIHByb3BlcnR5IGlzIG1pc3NpbmcsIGFuXG4gICAqIGVycm9yIHdpbGwgYmUgdGhyb3duLlxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0QXJnKGFBcmdzLCBhTmFtZSwgYURlZmF1bHRWYWx1ZSkge1xuICAgIGlmIChhTmFtZSBpbiBhQXJncykge1xuICAgICAgcmV0dXJuIGFBcmdzW2FOYW1lXTtcbiAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgIHJldHVybiBhRGVmYXVsdFZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIGFOYW1lICsgJ1wiIGlzIGEgcmVxdWlyZWQgYXJndW1lbnQuJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydHMuZ2V0QXJnID0gZ2V0QXJnO1xuXG4gIHZhciB1cmxSZWdleHAgPSAvXig/OihbXFx3K1xcLS5dKyk6KT9cXC9cXC8oPzooXFx3KzpcXHcrKUApPyhbXFx3Ll0qKSg/OjooXFxkKykpPyhcXFMqKSQvO1xuICB2YXIgZGF0YVVybFJlZ2V4cCA9IC9eZGF0YTouK1xcLC4rJC87XG5cbiAgZnVuY3Rpb24gdXJsUGFyc2UoYVVybCkge1xuICAgIHZhciBtYXRjaCA9IGFVcmwubWF0Y2godXJsUmVnZXhwKTtcbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHNjaGVtZTogbWF0Y2hbMV0sXG4gICAgICBhdXRoOiBtYXRjaFsyXSxcbiAgICAgIGhvc3Q6IG1hdGNoWzNdLFxuICAgICAgcG9ydDogbWF0Y2hbNF0sXG4gICAgICBwYXRoOiBtYXRjaFs1XVxuICAgIH07XG4gIH1cbiAgZXhwb3J0cy51cmxQYXJzZSA9IHVybFBhcnNlO1xuXG4gIGZ1bmN0aW9uIHVybEdlbmVyYXRlKGFQYXJzZWRVcmwpIHtcbiAgICB2YXIgdXJsID0gJyc7XG4gICAgaWYgKGFQYXJzZWRVcmwuc2NoZW1lKSB7XG4gICAgICB1cmwgKz0gYVBhcnNlZFVybC5zY2hlbWUgKyAnOic7XG4gICAgfVxuICAgIHVybCArPSAnLy8nO1xuICAgIGlmIChhUGFyc2VkVXJsLmF1dGgpIHtcbiAgICAgIHVybCArPSBhUGFyc2VkVXJsLmF1dGggKyAnQCc7XG4gICAgfVxuICAgIGlmIChhUGFyc2VkVXJsLmhvc3QpIHtcbiAgICAgIHVybCArPSBhUGFyc2VkVXJsLmhvc3Q7XG4gICAgfVxuICAgIGlmIChhUGFyc2VkVXJsLnBvcnQpIHtcbiAgICAgIHVybCArPSBcIjpcIiArIGFQYXJzZWRVcmwucG9ydFxuICAgIH1cbiAgICBpZiAoYVBhcnNlZFVybC5wYXRoKSB7XG4gICAgICB1cmwgKz0gYVBhcnNlZFVybC5wYXRoO1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9XG4gIGV4cG9ydHMudXJsR2VuZXJhdGUgPSB1cmxHZW5lcmF0ZTtcblxuICAvKipcbiAgICogTm9ybWFsaXplcyBhIHBhdGgsIG9yIHRoZSBwYXRoIHBvcnRpb24gb2YgYSBVUkw6XG4gICAqXG4gICAqIC0gUmVwbGFjZXMgY29uc2VxdXRpdmUgc2xhc2hlcyB3aXRoIG9uZSBzbGFzaC5cbiAgICogLSBSZW1vdmVzIHVubmVjZXNzYXJ5ICcuJyBwYXJ0cy5cbiAgICogLSBSZW1vdmVzIHVubmVjZXNzYXJ5ICc8ZGlyPi8uLicgcGFydHMuXG4gICAqXG4gICAqIEJhc2VkIG9uIGNvZGUgaW4gdGhlIE5vZGUuanMgJ3BhdGgnIGNvcmUgbW9kdWxlLlxuICAgKlxuICAgKiBAcGFyYW0gYVBhdGggVGhlIHBhdGggb3IgdXJsIHRvIG5vcm1hbGl6ZS5cbiAgICovXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZShhUGF0aCkge1xuICAgIHZhciBwYXRoID0gYVBhdGg7XG4gICAgdmFyIHVybCA9IHVybFBhcnNlKGFQYXRoKTtcbiAgICBpZiAodXJsKSB7XG4gICAgICBpZiAoIXVybC5wYXRoKSB7XG4gICAgICAgIHJldHVybiBhUGF0aDtcbiAgICAgIH1cbiAgICAgIHBhdGggPSB1cmwucGF0aDtcbiAgICB9XG4gICAgdmFyIGlzQWJzb2x1dGUgPSAocGF0aC5jaGFyQXQoMCkgPT09ICcvJyk7XG5cbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KC9cXC8rLyk7XG4gICAgZm9yICh2YXIgcGFydCwgdXAgPSAwLCBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHBhcnQgPSBwYXJ0c1tpXTtcbiAgICAgIGlmIChwYXJ0ID09PSAnLicpIHtcbiAgICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgfSBlbHNlIGlmIChwYXJ0ID09PSAnLi4nKSB7XG4gICAgICAgIHVwKys7XG4gICAgICB9IGVsc2UgaWYgKHVwID4gMCkge1xuICAgICAgICBpZiAocGFydCA9PT0gJycpIHtcbiAgICAgICAgICAvLyBUaGUgZmlyc3QgcGFydCBpcyBibGFuayBpZiB0aGUgcGF0aCBpcyBhYnNvbHV0ZS4gVHJ5aW5nIHRvIGdvXG4gICAgICAgICAgLy8gYWJvdmUgdGhlIHJvb3QgaXMgYSBuby1vcC4gVGhlcmVmb3JlIHdlIGNhbiByZW1vdmUgYWxsICcuLicgcGFydHNcbiAgICAgICAgICAvLyBkaXJlY3RseSBhZnRlciB0aGUgcm9vdC5cbiAgICAgICAgICBwYXJ0cy5zcGxpY2UoaSArIDEsIHVwKTtcbiAgICAgICAgICB1cCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFydHMuc3BsaWNlKGksIDIpO1xuICAgICAgICAgIHVwLS07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcGF0aCA9IHBhcnRzLmpvaW4oJy8nKTtcblxuICAgIGlmIChwYXRoID09PSAnJykge1xuICAgICAgcGF0aCA9IGlzQWJzb2x1dGUgPyAnLycgOiAnLic7XG4gICAgfVxuXG4gICAgaWYgKHVybCkge1xuICAgICAgdXJsLnBhdGggPSBwYXRoO1xuICAgICAgcmV0dXJuIHVybEdlbmVyYXRlKHVybCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9XG4gIGV4cG9ydHMubm9ybWFsaXplID0gbm9ybWFsaXplO1xuXG4gIC8qKlxuICAgKiBKb2lucyB0d28gcGF0aHMvVVJMcy5cbiAgICpcbiAgICogQHBhcmFtIGFSb290IFRoZSByb290IHBhdGggb3IgVVJMLlxuICAgKiBAcGFyYW0gYVBhdGggVGhlIHBhdGggb3IgVVJMIHRvIGJlIGpvaW5lZCB3aXRoIHRoZSByb290LlxuICAgKlxuICAgKiAtIElmIGFQYXRoIGlzIGEgVVJMIG9yIGEgZGF0YSBVUkksIGFQYXRoIGlzIHJldHVybmVkLCB1bmxlc3MgYVBhdGggaXMgYVxuICAgKiAgIHNjaGVtZS1yZWxhdGl2ZSBVUkw6IFRoZW4gdGhlIHNjaGVtZSBvZiBhUm9vdCwgaWYgYW55LCBpcyBwcmVwZW5kZWRcbiAgICogICBmaXJzdC5cbiAgICogLSBPdGhlcndpc2UgYVBhdGggaXMgYSBwYXRoLiBJZiBhUm9vdCBpcyBhIFVSTCwgdGhlbiBpdHMgcGF0aCBwb3J0aW9uXG4gICAqICAgaXMgdXBkYXRlZCB3aXRoIHRoZSByZXN1bHQgYW5kIGFSb290IGlzIHJldHVybmVkLiBPdGhlcndpc2UgdGhlIHJlc3VsdFxuICAgKiAgIGlzIHJldHVybmVkLlxuICAgKiAgIC0gSWYgYVBhdGggaXMgYWJzb2x1dGUsIHRoZSByZXN1bHQgaXMgYVBhdGguXG4gICAqICAgLSBPdGhlcndpc2UgdGhlIHR3byBwYXRocyBhcmUgam9pbmVkIHdpdGggYSBzbGFzaC5cbiAgICogLSBKb2luaW5nIGZvciBleGFtcGxlICdodHRwOi8vJyBhbmQgJ3d3dy5leGFtcGxlLmNvbScgaXMgYWxzbyBzdXBwb3J0ZWQuXG4gICAqL1xuICBmdW5jdGlvbiBqb2luKGFSb290LCBhUGF0aCkge1xuICAgIGlmIChhUm9vdCA9PT0gXCJcIikge1xuICAgICAgYVJvb3QgPSBcIi5cIjtcbiAgICB9XG4gICAgaWYgKGFQYXRoID09PSBcIlwiKSB7XG4gICAgICBhUGF0aCA9IFwiLlwiO1xuICAgIH1cbiAgICB2YXIgYVBhdGhVcmwgPSB1cmxQYXJzZShhUGF0aCk7XG4gICAgdmFyIGFSb290VXJsID0gdXJsUGFyc2UoYVJvb3QpO1xuICAgIGlmIChhUm9vdFVybCkge1xuICAgICAgYVJvb3QgPSBhUm9vdFVybC5wYXRoIHx8ICcvJztcbiAgICB9XG5cbiAgICAvLyBgam9pbihmb28sICcvL3d3dy5leGFtcGxlLm9yZycpYFxuICAgIGlmIChhUGF0aFVybCAmJiAhYVBhdGhVcmwuc2NoZW1lKSB7XG4gICAgICBpZiAoYVJvb3RVcmwpIHtcbiAgICAgICAgYVBhdGhVcmwuc2NoZW1lID0gYVJvb3RVcmwuc2NoZW1lO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVybEdlbmVyYXRlKGFQYXRoVXJsKTtcbiAgICB9XG5cbiAgICBpZiAoYVBhdGhVcmwgfHwgYVBhdGgubWF0Y2goZGF0YVVybFJlZ2V4cCkpIHtcbiAgICAgIHJldHVybiBhUGF0aDtcbiAgICB9XG5cbiAgICAvLyBgam9pbignaHR0cDovLycsICd3d3cuZXhhbXBsZS5jb20nKWBcbiAgICBpZiAoYVJvb3RVcmwgJiYgIWFSb290VXJsLmhvc3QgJiYgIWFSb290VXJsLnBhdGgpIHtcbiAgICAgIGFSb290VXJsLmhvc3QgPSBhUGF0aDtcbiAgICAgIHJldHVybiB1cmxHZW5lcmF0ZShhUm9vdFVybCk7XG4gICAgfVxuXG4gICAgdmFyIGpvaW5lZCA9IGFQYXRoLmNoYXJBdCgwKSA9PT0gJy8nXG4gICAgICA/IGFQYXRoXG4gICAgICA6IG5vcm1hbGl6ZShhUm9vdC5yZXBsYWNlKC9cXC8rJC8sICcnKSArICcvJyArIGFQYXRoKTtcblxuICAgIGlmIChhUm9vdFVybCkge1xuICAgICAgYVJvb3RVcmwucGF0aCA9IGpvaW5lZDtcbiAgICAgIHJldHVybiB1cmxHZW5lcmF0ZShhUm9vdFVybCk7XG4gICAgfVxuICAgIHJldHVybiBqb2luZWQ7XG4gIH1cbiAgZXhwb3J0cy5qb2luID0gam9pbjtcblxuICAvKipcbiAgICogTWFrZSBhIHBhdGggcmVsYXRpdmUgdG8gYSBVUkwgb3IgYW5vdGhlciBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gYVJvb3QgVGhlIHJvb3QgcGF0aCBvciBVUkwuXG4gICAqIEBwYXJhbSBhUGF0aCBUaGUgcGF0aCBvciBVUkwgdG8gYmUgbWFkZSByZWxhdGl2ZSB0byBhUm9vdC5cbiAgICovXG4gIGZ1bmN0aW9uIHJlbGF0aXZlKGFSb290LCBhUGF0aCkge1xuICAgIGlmIChhUm9vdCA9PT0gXCJcIikge1xuICAgICAgYVJvb3QgPSBcIi5cIjtcbiAgICB9XG5cbiAgICBhUm9vdCA9IGFSb290LnJlcGxhY2UoL1xcLyQvLCAnJyk7XG5cbiAgICAvLyBYWFg6IEl0IGlzIHBvc3NpYmxlIHRvIHJlbW92ZSB0aGlzIGJsb2NrLCBhbmQgdGhlIHRlc3RzIHN0aWxsIHBhc3MhXG4gICAgdmFyIHVybCA9IHVybFBhcnNlKGFSb290KTtcbiAgICBpZiAoYVBhdGguY2hhckF0KDApID09IFwiL1wiICYmIHVybCAmJiB1cmwucGF0aCA9PSBcIi9cIikge1xuICAgICAgcmV0dXJuIGFQYXRoLnNsaWNlKDEpO1xuICAgIH1cblxuICAgIHJldHVybiBhUGF0aC5pbmRleE9mKGFSb290ICsgJy8nKSA9PT0gMFxuICAgICAgPyBhUGF0aC5zdWJzdHIoYVJvb3QubGVuZ3RoICsgMSlcbiAgICAgIDogYVBhdGg7XG4gIH1cbiAgZXhwb3J0cy5yZWxhdGl2ZSA9IHJlbGF0aXZlO1xuXG4gIC8qKlxuICAgKiBCZWNhdXNlIGJlaGF2aW9yIGdvZXMgd2Fja3kgd2hlbiB5b3Ugc2V0IGBfX3Byb3RvX19gIG9uIG9iamVjdHMsIHdlXG4gICAqIGhhdmUgdG8gcHJlZml4IGFsbCB0aGUgc3RyaW5ncyBpbiBvdXIgc2V0IHdpdGggYW4gYXJiaXRyYXJ5IGNoYXJhY3Rlci5cbiAgICpcbiAgICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL3NvdXJjZS1tYXAvcHVsbC8zMSBhbmRcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvc291cmNlLW1hcC9pc3N1ZXMvMzBcbiAgICpcbiAgICogQHBhcmFtIFN0cmluZyBhU3RyXG4gICAqL1xuICBmdW5jdGlvbiB0b1NldFN0cmluZyhhU3RyKSB7XG4gICAgcmV0dXJuICckJyArIGFTdHI7XG4gIH1cbiAgZXhwb3J0cy50b1NldFN0cmluZyA9IHRvU2V0U3RyaW5nO1xuXG4gIGZ1bmN0aW9uIGZyb21TZXRTdHJpbmcoYVN0cikge1xuICAgIHJldHVybiBhU3RyLnN1YnN0cigxKTtcbiAgfVxuICBleHBvcnRzLmZyb21TZXRTdHJpbmcgPSBmcm9tU2V0U3RyaW5nO1xuXG4gIGZ1bmN0aW9uIHN0cmNtcChhU3RyMSwgYVN0cjIpIHtcbiAgICB2YXIgczEgPSBhU3RyMSB8fCBcIlwiO1xuICAgIHZhciBzMiA9IGFTdHIyIHx8IFwiXCI7XG4gICAgcmV0dXJuIChzMSA+IHMyKSAtIChzMSA8IHMyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wYXJhdG9yIGJldHdlZW4gdHdvIG1hcHBpbmdzIHdoZXJlIHRoZSBvcmlnaW5hbCBwb3NpdGlvbnMgYXJlIGNvbXBhcmVkLlxuICAgKlxuICAgKiBPcHRpb25hbGx5IHBhc3MgaW4gYHRydWVgIGFzIGBvbmx5Q29tcGFyZUdlbmVyYXRlZGAgdG8gY29uc2lkZXIgdHdvXG4gICAqIG1hcHBpbmdzIHdpdGggdGhlIHNhbWUgb3JpZ2luYWwgc291cmNlL2xpbmUvY29sdW1uLCBidXQgZGlmZmVyZW50IGdlbmVyYXRlZFxuICAgKiBsaW5lIGFuZCBjb2x1bW4gdGhlIHNhbWUuIFVzZWZ1bCB3aGVuIHNlYXJjaGluZyBmb3IgYSBtYXBwaW5nIHdpdGggYVxuICAgKiBzdHViYmVkIG91dCBtYXBwaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gY29tcGFyZUJ5T3JpZ2luYWxQb3NpdGlvbnMobWFwcGluZ0EsIG1hcHBpbmdCLCBvbmx5Q29tcGFyZU9yaWdpbmFsKSB7XG4gICAgdmFyIGNtcDtcblxuICAgIGNtcCA9IHN0cmNtcChtYXBwaW5nQS5zb3VyY2UsIG1hcHBpbmdCLnNvdXJjZSk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICBjbXAgPSBtYXBwaW5nQS5vcmlnaW5hbExpbmUgLSBtYXBwaW5nQi5vcmlnaW5hbExpbmU7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICBjbXAgPSBtYXBwaW5nQS5vcmlnaW5hbENvbHVtbiAtIG1hcHBpbmdCLm9yaWdpbmFsQ29sdW1uO1xuICAgIGlmIChjbXAgfHwgb25seUNvbXBhcmVPcmlnaW5hbCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICBjbXAgPSBzdHJjbXAobWFwcGluZ0EubmFtZSwgbWFwcGluZ0IubmFtZSk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICBjbXAgPSBtYXBwaW5nQS5nZW5lcmF0ZWRMaW5lIC0gbWFwcGluZ0IuZ2VuZXJhdGVkTGluZTtcbiAgICBpZiAoY21wKSB7XG4gICAgICByZXR1cm4gY21wO1xuICAgIH1cblxuICAgIHJldHVybiBtYXBwaW5nQS5nZW5lcmF0ZWRDb2x1bW4gLSBtYXBwaW5nQi5nZW5lcmF0ZWRDb2x1bW47XG4gIH07XG4gIGV4cG9ydHMuY29tcGFyZUJ5T3JpZ2luYWxQb3NpdGlvbnMgPSBjb21wYXJlQnlPcmlnaW5hbFBvc2l0aW9ucztcblxuICAvKipcbiAgICogQ29tcGFyYXRvciBiZXR3ZWVuIHR3byBtYXBwaW5ncyB3aGVyZSB0aGUgZ2VuZXJhdGVkIHBvc2l0aW9ucyBhcmVcbiAgICogY29tcGFyZWQuXG4gICAqXG4gICAqIE9wdGlvbmFsbHkgcGFzcyBpbiBgdHJ1ZWAgYXMgYG9ubHlDb21wYXJlR2VuZXJhdGVkYCB0byBjb25zaWRlciB0d29cbiAgICogbWFwcGluZ3Mgd2l0aCB0aGUgc2FtZSBnZW5lcmF0ZWQgbGluZSBhbmQgY29sdW1uLCBidXQgZGlmZmVyZW50XG4gICAqIHNvdXJjZS9uYW1lL29yaWdpbmFsIGxpbmUgYW5kIGNvbHVtbiB0aGUgc2FtZS4gVXNlZnVsIHdoZW4gc2VhcmNoaW5nIGZvciBhXG4gICAqIG1hcHBpbmcgd2l0aCBhIHN0dWJiZWQgb3V0IG1hcHBpbmcuXG4gICAqL1xuICBmdW5jdGlvbiBjb21wYXJlQnlHZW5lcmF0ZWRQb3NpdGlvbnMobWFwcGluZ0EsIG1hcHBpbmdCLCBvbmx5Q29tcGFyZUdlbmVyYXRlZCkge1xuICAgIHZhciBjbXA7XG5cbiAgICBjbXAgPSBtYXBwaW5nQS5nZW5lcmF0ZWRMaW5lIC0gbWFwcGluZ0IuZ2VuZXJhdGVkTGluZTtcbiAgICBpZiAoY21wKSB7XG4gICAgICByZXR1cm4gY21wO1xuICAgIH1cblxuICAgIGNtcCA9IG1hcHBpbmdBLmdlbmVyYXRlZENvbHVtbiAtIG1hcHBpbmdCLmdlbmVyYXRlZENvbHVtbjtcbiAgICBpZiAoY21wIHx8IG9ubHlDb21wYXJlR2VuZXJhdGVkKSB7XG4gICAgICByZXR1cm4gY21wO1xuICAgIH1cblxuICAgIGNtcCA9IHN0cmNtcChtYXBwaW5nQS5zb3VyY2UsIG1hcHBpbmdCLnNvdXJjZSk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICBjbXAgPSBtYXBwaW5nQS5vcmlnaW5hbExpbmUgLSBtYXBwaW5nQi5vcmlnaW5hbExpbmU7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICBjbXAgPSBtYXBwaW5nQS5vcmlnaW5hbENvbHVtbiAtIG1hcHBpbmdCLm9yaWdpbmFsQ29sdW1uO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmNtcChtYXBwaW5nQS5uYW1lLCBtYXBwaW5nQi5uYW1lKTtcbiAgfTtcbiAgZXhwb3J0cy5jb21wYXJlQnlHZW5lcmF0ZWRQb3NpdGlvbnMgPSBjb21wYXJlQnlHZW5lcmF0ZWRQb3NpdGlvbnM7XG5cbn0pO1xuIiwiLyoqIHZpbTogZXQ6dHM9NDpzdz00OnN0cz00XG4gKiBAbGljZW5zZSBhbWRlZmluZSAxLjAuMCBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxNSwgVGhlIERvam8gRm91bmRhdGlvbiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogQXZhaWxhYmxlIHZpYSB0aGUgTUlUIG9yIG5ldyBCU0QgbGljZW5zZS5cbiAqIHNlZTogaHR0cDovL2dpdGh1Yi5jb20vanJidXJrZS9hbWRlZmluZSBmb3IgZGV0YWlsc1xuICovXG5cbi8qanNsaW50IG5vZGU6IHRydWUgKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcHJvY2VzcyAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWZpbmUgZm9yIG5vZGUuXG4gKiBAcGFyYW0ge09iamVjdH0gbW9kdWxlIHRoZSBcIm1vZHVsZVwiIG9iamVjdCB0aGF0IGlzIGRlZmluZWQgYnkgTm9kZSBmb3IgdGhlXG4gKiBjdXJyZW50IG1vZHVsZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtyZXF1aXJlRm5dLiBOb2RlJ3MgcmVxdWlyZSBmdW5jdGlvbiBmb3IgdGhlIGN1cnJlbnQgbW9kdWxlLlxuICogSXQgb25seSBuZWVkcyB0byBiZSBwYXNzZWQgaW4gTm9kZSB2ZXJzaW9ucyBiZWZvcmUgMC41LCB3aGVuIG1vZHVsZS5yZXF1aXJlXG4gKiBkaWQgbm90IGV4aXN0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBhIGRlZmluZSBmdW5jdGlvbiB0aGF0IGlzIHVzYWJsZSBmb3IgdGhlIGN1cnJlbnQgbm9kZVxuICogbW9kdWxlLlxuICovXG5mdW5jdGlvbiBhbWRlZmluZShtb2R1bGUsIHJlcXVpcmVGbikge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgZGVmaW5lQ2FjaGUgPSB7fSxcbiAgICAgICAgbG9hZGVyQ2FjaGUgPSB7fSxcbiAgICAgICAgYWxyZWFkeUNhbGxlZCA9IGZhbHNlLFxuICAgICAgICBwYXRoID0gcmVxdWlyZSgncGF0aCcpLFxuICAgICAgICBtYWtlUmVxdWlyZSwgc3RyaW5nUmVxdWlyZTtcblxuICAgIC8qKlxuICAgICAqIFRyaW1zIHRoZSAuIGFuZCAuLiBmcm9tIGFuIGFycmF5IG9mIHBhdGggc2VnbWVudHMuXG4gICAgICogSXQgd2lsbCBrZWVwIGEgbGVhZGluZyBwYXRoIHNlZ21lbnQgaWYgYSAuLiB3aWxsIGJlY29tZVxuICAgICAqIHRoZSBmaXJzdCBwYXRoIHNlZ21lbnQsIHRvIGhlbHAgd2l0aCBtb2R1bGUgbmFtZSBsb29rdXBzLFxuICAgICAqIHdoaWNoIGFjdCBsaWtlIHBhdGhzLCBidXQgY2FuIGJlIHJlbWFwcGVkLiBCdXQgdGhlIGVuZCByZXN1bHQsXG4gICAgICogYWxsIHBhdGhzIHRoYXQgdXNlIHRoaXMgZnVuY3Rpb24gc2hvdWxkIGxvb2sgbm9ybWFsaXplZC5cbiAgICAgKiBOT1RFOiB0aGlzIG1ldGhvZCBNT0RJRklFUyB0aGUgaW5wdXQgYXJyYXkuXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJ5IHRoZSBhcnJheSBvZiBwYXRoIHNlZ21lbnRzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRyaW1Eb3RzKGFyeSkge1xuICAgICAgICB2YXIgaSwgcGFydDtcbiAgICAgICAgZm9yIChpID0gMDsgYXJ5W2ldOyBpKz0gMSkge1xuICAgICAgICAgICAgcGFydCA9IGFyeVtpXTtcbiAgICAgICAgICAgIGlmIChwYXJ0ID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICBhcnkuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIGkgLT0gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFydCA9PT0gJy4uJykge1xuICAgICAgICAgICAgICAgIGlmIChpID09PSAxICYmIChhcnlbMl0gPT09ICcuLicgfHwgYXJ5WzBdID09PSAnLi4nKSkge1xuICAgICAgICAgICAgICAgICAgICAvL0VuZCBvZiB0aGUgbGluZS4gS2VlcCBhdCBsZWFzdCBvbmUgbm9uLWRvdFxuICAgICAgICAgICAgICAgICAgICAvL3BhdGggc2VnbWVudCBhdCB0aGUgZnJvbnQgc28gaXQgY2FuIGJlIG1hcHBlZFxuICAgICAgICAgICAgICAgICAgICAvL2NvcnJlY3RseSB0byBkaXNrLiBPdGhlcndpc2UsIHRoZXJlIGlzIGxpa2VseVxuICAgICAgICAgICAgICAgICAgICAvL25vIHBhdGggbWFwcGluZyBmb3IgYSBwYXRoIHN0YXJ0aW5nIHdpdGggJy4uJy5cbiAgICAgICAgICAgICAgICAgICAgLy9UaGlzIGNhbiBzdGlsbCBmYWlsLCBidXQgY2F0Y2hlcyB0aGUgbW9zdCByZWFzb25hYmxlXG4gICAgICAgICAgICAgICAgICAgIC8vdXNlcyBvZiAuLlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyeS5zcGxpY2UoaSAtIDEsIDIpO1xuICAgICAgICAgICAgICAgICAgICBpIC09IDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplKG5hbWUsIGJhc2VOYW1lKSB7XG4gICAgICAgIHZhciBiYXNlUGFydHM7XG5cbiAgICAgICAgLy9BZGp1c3QgYW55IHJlbGF0aXZlIHBhdGhzLlxuICAgICAgICBpZiAobmFtZSAmJiBuYW1lLmNoYXJBdCgwKSA9PT0gJy4nKSB7XG4gICAgICAgICAgICAvL0lmIGhhdmUgYSBiYXNlIG5hbWUsIHRyeSB0byBub3JtYWxpemUgYWdhaW5zdCBpdCxcbiAgICAgICAgICAgIC8vb3RoZXJ3aXNlLCBhc3N1bWUgaXQgaXMgYSB0b3AtbGV2ZWwgcmVxdWlyZSB0aGF0IHdpbGxcbiAgICAgICAgICAgIC8vYmUgcmVsYXRpdmUgdG8gYmFzZVVybCBpbiB0aGUgZW5kLlxuICAgICAgICAgICAgaWYgKGJhc2VOYW1lKSB7XG4gICAgICAgICAgICAgICAgYmFzZVBhcnRzID0gYmFzZU5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICBiYXNlUGFydHMgPSBiYXNlUGFydHMuc2xpY2UoMCwgYmFzZVBhcnRzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgIGJhc2VQYXJ0cyA9IGJhc2VQYXJ0cy5jb25jYXQobmFtZS5zcGxpdCgnLycpKTtcbiAgICAgICAgICAgICAgICB0cmltRG90cyhiYXNlUGFydHMpO1xuICAgICAgICAgICAgICAgIG5hbWUgPSBiYXNlUGFydHMuam9pbignLycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHRoZSBub3JtYWxpemUoKSBmdW5jdGlvbiBwYXNzZWQgdG8gYSBsb2FkZXIgcGx1Z2luJ3NcbiAgICAgKiBub3JtYWxpemUgbWV0aG9kLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1ha2VOb3JtYWxpemUocmVsTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBub3JtYWxpemUobmFtZSwgcmVsTmFtZSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUxvYWQoaWQpIHtcbiAgICAgICAgZnVuY3Rpb24gbG9hZCh2YWx1ZSkge1xuICAgICAgICAgICAgbG9hZGVyQ2FjaGVbaWRdID0gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICBsb2FkLmZyb21UZXh0ID0gZnVuY3Rpb24gKGlkLCB0ZXh0KSB7XG4gICAgICAgICAgICAvL1RoaXMgb25lIGlzIGRpZmZpY3VsdCBiZWNhdXNlIHRoZSB0ZXh0IGNhbi9wcm9iYWJseSB1c2VzXG4gICAgICAgICAgICAvL2RlZmluZSwgYW5kIGFueSByZWxhdGl2ZSBwYXRocyBhbmQgcmVxdWlyZXMgc2hvdWxkIGJlIHJlbGF0aXZlXG4gICAgICAgICAgICAvL3RvIHRoYXQgaWQgd2FzIGl0IHdvdWxkIGJlIGZvdW5kIG9uIGRpc2suIEJ1dCB0aGlzIHdvdWxkIHJlcXVpcmVcbiAgICAgICAgICAgIC8vYm9vdHN0cmFwcGluZyBhIG1vZHVsZS9yZXF1aXJlIGZhaXJseSBkZWVwbHkgZnJvbSBub2RlIGNvcmUuXG4gICAgICAgICAgICAvL05vdCBzdXJlIGhvdyBiZXN0IHRvIGdvIGFib3V0IHRoYXQgeWV0LlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhbWRlZmluZSBkb2VzIG5vdCBpbXBsZW1lbnQgbG9hZC5mcm9tVGV4dCcpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBsb2FkO1xuICAgIH1cblxuICAgIG1ha2VSZXF1aXJlID0gZnVuY3Rpb24gKHN5c3RlbVJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSwgcmVsSWQpIHtcbiAgICAgICAgZnVuY3Rpb24gYW1kUmVxdWlyZShkZXBzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkZXBzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIC8vU3luY2hyb25vdXMsIHNpbmdsZSBtb2R1bGUgcmVxdWlyZSgnJylcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RyaW5nUmVxdWlyZShzeXN0ZW1SZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUsIGRlcHMsIHJlbElkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9BcnJheSBvZiBkZXBlbmRlbmNpZXMgd2l0aCBhIGNhbGxiYWNrLlxuXG4gICAgICAgICAgICAgICAgLy9Db252ZXJ0IHRoZSBkZXBlbmRlbmNpZXMgdG8gbW9kdWxlcy5cbiAgICAgICAgICAgICAgICBkZXBzID0gZGVwcy5tYXAoZnVuY3Rpb24gKGRlcE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZ1JlcXVpcmUoc3lzdGVtUmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlLCBkZXBOYW1lLCByZWxJZCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL1dhaXQgZm9yIG5leHQgdGljayB0byBjYWxsIGJhY2sgdGhlIHJlcXVpcmUgY2FsbC5cbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBkZXBzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYW1kUmVxdWlyZS50b1VybCA9IGZ1bmN0aW9uIChmaWxlUGF0aCkge1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoLmluZGV4T2YoJy4nKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub3JtYWxpemUoZmlsZVBhdGgsIHBhdGguZGlybmFtZShtb2R1bGUuZmlsZW5hbWUpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVQYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBhbWRSZXF1aXJlO1xuICAgIH07XG5cbiAgICAvL0Zhdm9yIGV4cGxpY2l0IHZhbHVlLCBwYXNzZWQgaW4gaWYgdGhlIG1vZHVsZSB3YW50cyB0byBzdXBwb3J0IE5vZGUgMC40LlxuICAgIHJlcXVpcmVGbiA9IHJlcXVpcmVGbiB8fCBmdW5jdGlvbiByZXEoKSB7XG4gICAgICAgIHJldHVybiBtb2R1bGUucmVxdWlyZS5hcHBseShtb2R1bGUsIGFyZ3VtZW50cyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHJ1bkZhY3RvcnkoaWQsIGRlcHMsIGZhY3RvcnkpIHtcbiAgICAgICAgdmFyIHIsIGUsIG0sIHJlc3VsdDtcblxuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIGUgPSBsb2FkZXJDYWNoZVtpZF0gPSB7fTtcbiAgICAgICAgICAgIG0gPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHVyaTogX19maWxlbmFtZSxcbiAgICAgICAgICAgICAgICBleHBvcnRzOiBlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgciA9IG1ha2VSZXF1aXJlKHJlcXVpcmVGbiwgZSwgbSwgaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9Pbmx5IHN1cHBvcnQgb25lIGRlZmluZSBjYWxsIHBlciBmaWxlXG4gICAgICAgICAgICBpZiAoYWxyZWFkeUNhbGxlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYW1kZWZpbmUgd2l0aCBubyBtb2R1bGUgSUQgY2Fubm90IGJlIGNhbGxlZCBtb3JlIHRoYW4gb25jZSBwZXIgZmlsZS4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFscmVhZHlDYWxsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAvL1VzZSB0aGUgcmVhbCB2YXJpYWJsZXMgZnJvbSBub2RlXG4gICAgICAgICAgICAvL1VzZSBtb2R1bGUuZXhwb3J0cyBmb3IgZXhwb3J0cywgc2luY2VcbiAgICAgICAgICAgIC8vdGhlIGV4cG9ydHMgaW4gaGVyZSBpcyBhbWRlZmluZSBleHBvcnRzLlxuICAgICAgICAgICAgZSA9IG1vZHVsZS5leHBvcnRzO1xuICAgICAgICAgICAgbSA9IG1vZHVsZTtcbiAgICAgICAgICAgIHIgPSBtYWtlUmVxdWlyZShyZXF1aXJlRm4sIGUsIG0sIG1vZHVsZS5pZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvL0lmIHRoZXJlIGFyZSBkZXBlbmRlbmNpZXMsIHRoZXkgYXJlIHN0cmluZ3MsIHNvIG5lZWRcbiAgICAgICAgLy90byBjb252ZXJ0IHRoZW0gdG8gZGVwZW5kZW5jeSB2YWx1ZXMuXG4gICAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgICAgICBkZXBzID0gZGVwcy5tYXAoZnVuY3Rpb24gKGRlcE5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcihkZXBOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9DYWxsIHRoZSBmYWN0b3J5IHdpdGggdGhlIHJpZ2h0IGRlcGVuZGVuY2llcy5cbiAgICAgICAgaWYgKHR5cGVvZiBmYWN0b3J5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWN0b3J5LmFwcGx5KG0uZXhwb3J0cywgZGVwcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWN0b3J5O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBtLmV4cG9ydHMgPSByZXN1bHQ7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICBsb2FkZXJDYWNoZVtpZF0gPSBtLmV4cG9ydHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdHJpbmdSZXF1aXJlID0gZnVuY3Rpb24gKHN5c3RlbVJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSwgaWQsIHJlbElkKSB7XG4gICAgICAgIC8vU3BsaXQgdGhlIElEIGJ5IGEgISBzbyB0aGF0XG4gICAgICAgIHZhciBpbmRleCA9IGlkLmluZGV4T2YoJyEnKSxcbiAgICAgICAgICAgIG9yaWdpbmFsSWQgPSBpZCxcbiAgICAgICAgICAgIHByZWZpeCwgcGx1Z2luO1xuXG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIGlkID0gbm9ybWFsaXplKGlkLCByZWxJZCk7XG5cbiAgICAgICAgICAgIC8vU3RyYWlnaHQgbW9kdWxlIGxvb2t1cC4gSWYgaXQgaXMgb25lIG9mIHRoZSBzcGVjaWFsIGRlcGVuZGVuY2llcyxcbiAgICAgICAgICAgIC8vZGVhbCB3aXRoIGl0LCBvdGhlcndpc2UsIGRlbGVnYXRlIHRvIG5vZGUuXG4gICAgICAgICAgICBpZiAoaWQgPT09ICdyZXF1aXJlJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYWtlUmVxdWlyZShzeXN0ZW1SZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUsIHJlbElkKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaWQgPT09ICdleHBvcnRzJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHBvcnRzO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gJ21vZHVsZScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb2FkZXJDYWNoZS5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9hZGVyQ2FjaGVbaWRdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkZWZpbmVDYWNoZVtpZF0pIHtcbiAgICAgICAgICAgICAgICBydW5GYWN0b3J5LmFwcGx5KG51bGwsIGRlZmluZUNhY2hlW2lkXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRlckNhY2hlW2lkXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYoc3lzdGVtUmVxdWlyZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3lzdGVtUmVxdWlyZShvcmlnaW5hbElkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG1vZHVsZSB3aXRoIElEOiAnICsgaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vVGhlcmUgaXMgYSBwbHVnaW4gaW4gcGxheS5cbiAgICAgICAgICAgIHByZWZpeCA9IGlkLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICAgICAgICBpZCA9IGlkLnN1YnN0cmluZyhpbmRleCArIDEsIGlkLmxlbmd0aCk7XG5cbiAgICAgICAgICAgIHBsdWdpbiA9IHN0cmluZ1JlcXVpcmUoc3lzdGVtUmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlLCBwcmVmaXgsIHJlbElkKTtcblxuICAgICAgICAgICAgaWYgKHBsdWdpbi5ub3JtYWxpemUpIHtcbiAgICAgICAgICAgICAgICBpZCA9IHBsdWdpbi5ub3JtYWxpemUoaWQsIG1ha2VOb3JtYWxpemUocmVsSWQpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9Ob3JtYWxpemUgdGhlIElEIG5vcm1hbGx5LlxuICAgICAgICAgICAgICAgIGlkID0gbm9ybWFsaXplKGlkLCByZWxJZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsb2FkZXJDYWNoZVtpZF0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9hZGVyQ2FjaGVbaWRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbHVnaW4ubG9hZChpZCwgbWFrZVJlcXVpcmUoc3lzdGVtUmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlLCByZWxJZCksIG1ha2VMb2FkKGlkKSwge30pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRlckNhY2hlW2lkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvL0NyZWF0ZSBhIGRlZmluZSBmdW5jdGlvbiBzcGVjaWZpYyB0byB0aGUgbW9kdWxlIGFza2luZyBmb3IgYW1kZWZpbmUuXG4gICAgZnVuY3Rpb24gZGVmaW5lKGlkLCBkZXBzLCBmYWN0b3J5KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGlkKSkge1xuICAgICAgICAgICAgZmFjdG9yeSA9IGRlcHM7XG4gICAgICAgICAgICBkZXBzID0gaWQ7XG4gICAgICAgICAgICBpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBmYWN0b3J5ID0gaWQ7XG4gICAgICAgICAgICBpZCA9IGRlcHMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVwcyAmJiAhQXJyYXkuaXNBcnJheShkZXBzKSkge1xuICAgICAgICAgICAgZmFjdG9yeSA9IGRlcHM7XG4gICAgICAgICAgICBkZXBzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkZXBzKSB7XG4gICAgICAgICAgICBkZXBzID0gWydyZXF1aXJlJywgJ2V4cG9ydHMnLCAnbW9kdWxlJ107XG4gICAgICAgIH1cblxuICAgICAgICAvL1NldCB1cCBwcm9wZXJ0aWVzIGZvciB0aGlzIG1vZHVsZS4gSWYgYW4gSUQsIHRoZW4gdXNlXG4gICAgICAgIC8vaW50ZXJuYWwgY2FjaGUuIElmIG5vIElELCB0aGVuIHVzZSB0aGUgZXh0ZXJuYWwgdmFyaWFibGVzXG4gICAgICAgIC8vZm9yIHRoaXMgbm9kZSBtb2R1bGUuXG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgLy9QdXQgdGhlIG1vZHVsZSBpbiBkZWVwIGZyZWV6ZSB1bnRpbCB0aGVyZSBpcyBhXG4gICAgICAgICAgICAvL3JlcXVpcmUgY2FsbCBmb3IgaXQuXG4gICAgICAgICAgICBkZWZpbmVDYWNoZVtpZF0gPSBbaWQsIGRlcHMsIGZhY3RvcnldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVuRmFjdG9yeShpZCwgZGVwcywgZmFjdG9yeSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL2RlZmluZS5yZXF1aXJlLCB3aGljaCBoYXMgYWNjZXNzIHRvIGFsbCB0aGUgdmFsdWVzIGluIHRoZVxuICAgIC8vY2FjaGUuIFVzZWZ1bCBmb3IgQU1EIG1vZHVsZXMgdGhhdCBhbGwgaGF2ZSBJRHMgaW4gdGhlIGZpbGUsXG4gICAgLy9idXQgbmVlZCB0byBmaW5hbGx5IGV4cG9ydCBhIHZhbHVlIHRvIG5vZGUgYmFzZWQgb24gb25lIG9mIHRob3NlXG4gICAgLy9JRHMuXG4gICAgZGVmaW5lLnJlcXVpcmUgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgaWYgKGxvYWRlckNhY2hlW2lkXSkge1xuICAgICAgICAgICAgcmV0dXJuIGxvYWRlckNhY2hlW2lkXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWZpbmVDYWNoZVtpZF0pIHtcbiAgICAgICAgICAgIHJ1bkZhY3RvcnkuYXBwbHkobnVsbCwgZGVmaW5lQ2FjaGVbaWRdKTtcbiAgICAgICAgICAgIHJldHVybiBsb2FkZXJDYWNoZVtpZF07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZGVmaW5lLmFtZCA9IHt9O1xuXG4gICAgcmV0dXJuIGRlZmluZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBhbWRlZmluZTtcbiIsIi8qXG4gKiAqXG4gKiAgQ29weXJpZ2h0IMKpIDIwMTUgVW5jaGFydGVkIFNvZnR3YXJlIEluYy5cbiAqXG4gKiAgUHJvcGVydHkgb2YgVW5jaGFydGVk4oSiLCBmb3JtZXJseSBPY3VsdXMgSW5mbyBJbmMuXG4gKiAgaHR0cDovL3VuY2hhcnRlZC5zb2Z0d2FyZS9cbiAqXG4gKiAgUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICpcbiAqICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mXG4gKiAgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbiAqICB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllc1xuICogIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkb1xuICogIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiAgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqICBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiAgU09GVFdBUkUuXG4gKiAvXG4gKi9cbnZhciBfID0gcmVxdWlyZSgnLi4vdXRpbC91dGlsJyk7XG5cbi8qKlxuICogQmFzZSBpbnRlcmZhY2UgY2xhc3MgZm9yIG9iamVjdHMgdGhhdCB3aXNoIHRvIGVtaXQgZXZlbnRzLlxuICpcbiAqIEBjbGFzcyBJQmluZGFibGVcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBJQmluZGFibGUoKSB7XG4gICAgdGhpcy5faGFuZGxlcnMgPSB7fTtcblx0dGhpcy5fb21uaUhhbmRsZXJzID0gW107XG5cdHRoaXMuX2JvdW5kRm9yd2FyZEV2ZW50ID0gdGhpcy5fZm9yd2FyZEV2ZW50LmJpbmQodGhpcyk7XG59XG5cbi8qKlxuICogQmluZHMgYSBsaXN0IG9mIGV2ZW50cyB0byB0aGUgc3BlY2lmaWVkIGNhbGxiYWNrLlxuICpcbiAqIEBtZXRob2Qgb25cbiAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IGV2ZW50cyAtIEEgc3BhY2Utc2VwYXJhdGVkIGxpc3Qgb2YgZXZlbnRzIHRvIGxpc3RlbiBmb3IuIElmIG51bGwgaXMgcGFzc2VkLCB0aGUgY2FsbGJhY2sgd2lsbCBiZSBpbnZva2VkIGZvciBhbGwgZXZlbnRzLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIHdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAqL1xuSUJpbmRhYmxlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50cywgY2FsbGJhY2spIHtcblx0aWYgKGV2ZW50cyA9PT0gbnVsbCkge1xuXHRcdGlmICh0aGlzLl9vbW5pSGFuZGxlcnMuaW5kZXhPZihjYWxsYmFjaykgPCAwKSB7XG5cdFx0XHR0aGlzLl9vbW5pSGFuZGxlcnMucHVzaChjYWxsYmFjayk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGV2ZW50cy5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHR2YXIgaGFuZGxlcnMgPSB0aGlzLl9oYW5kbGVyc1tldmVudF07XG5cdFx0XHRpZiAoIWhhbmRsZXJzKSB7XG5cdFx0XHRcdGhhbmRsZXJzID0gW107XG5cdFx0XHRcdHRoaXMuX2hhbmRsZXJzW2V2ZW50XSA9IGhhbmRsZXJzO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGhhbmRsZXJzLmluZGV4T2YoY2FsbGJhY2spIDwgMCkge1xuXHRcdFx0XHRoYW5kbGVycy5wdXNoKGNhbGxiYWNrKTtcblx0XHRcdH1cblx0XHR9LmJpbmQodGhpcykpO1xuXHR9XG59O1xuXG4vKipcbiAqIFVuYmluZHMgdGhlIHNwZWNpZmllZCBjYWxsYmFjayBmcm9tIHRoZSBzcGVjaWZpZWQgZXZlbnQuIElmIG5vIGNhbGxiYWNrIGlzIHNwZWNpZmllZCwgYWxsIGNhbGxiYWNrcyBmb3IgdGhlIHNwZWNpZmllZCBldmVudCBhcmUgcmVtb3ZlZC5cbiAqXG4gKiBAbWV0aG9kIG9mZlxuICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gZXZlbnRzIC0gQSBzcGFjZS1zZXBhcmF0ZWQgbGlzdCBvZiBldmVudHMgdG8gbGlzdGVuIGZvci4gSWYgbnVsbCBpcyBwYXNzZWQgdGhlIGNhbGxiYWNrIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBhbGwtZXZlbnQgaGFuZGxlciBsaXN0LlxuICogQHBhcmFtIHtGdW5jdGlvbj19IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIHRvIHJlbW92ZSBmcm9tIHRoZSBldmVudCBvciBub3RoaW5nIHRvIGNvbXBsZXRlbHkgY2xlYXIgdGhlIGV2ZW50IGNhbGxiYWNrcy5cbiAqL1xuSUJpbmRhYmxlLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbihldmVudHMsIGNhbGxiYWNrKSB7XG5cdGlmIChldmVudHMgPT09IG51bGwpIHtcblx0XHRpZiAoIWNhbGxiYWNrKSB7XG5cdFx0XHR0aGlzLl9vbW5pSGFuZGxlcnMubGVuZ3RoID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGluZGV4ID0gdGhpcy5fb21uaUhhbmRsZXJzLmluZGV4T2YoY2FsbGJhY2spO1xuXHRcdFx0aWYgKGluZGV4ID49IDApIHtcblx0XHRcdFx0dGhpcy5fb21uaUhhbmRsZXJzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGV2ZW50cy5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHR2YXIgaGFuZGxlcnMgPSB0aGlzLl9oYW5kbGVyc1tldmVudF07XG5cdFx0XHRpZiAoaGFuZGxlcnMpIHtcblx0XHRcdFx0aWYgKCFjYWxsYmFjaykge1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLl9oYW5kbGVyc1tldmVudF07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHRvUmVtb3ZlID0gaGFuZGxlcnMuaW5kZXhPZihjYWxsYmFjayk7XG5cdFx0XHRcdFx0aWYgKHRvUmVtb3ZlID49IDApIHtcblx0XHRcdFx0XHRcdGhhbmRsZXJzLnNwbGljZSh0b1JlbW92ZSwgMSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0fVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFsbCB0aGUgcmVnaXN0ZXJlZCBoYW5kbGVycyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAqXG4gKiBAbWV0aG9kIGhhbmRsZXJzXG4gKiBAcGFyYW0ge3N0cmluZ30gZXZlbnQgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgZm9yIHdoaWNoIHRvIGZldGNoIGl0cyBoYW5kbGVycy5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IG9taXRPbW5pSGFuZGxlcnMgLSBTaG91bGQgdGhlIGFsbC1ldmVudCBoYW5kbGVycyBiZSBvbWl0dGVkIGZyb20gdGhlIHJlc3VsdGluZyBhcnJheS5cbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuSUJpbmRhYmxlLnByb3RvdHlwZS5oYW5kbGVycyA9IGZ1bmN0aW9uKGV2ZW50LCBvbWl0T21uaUhhbmRsZXJzKSB7XG5cdHZhciBoYW5kbGVycyA9ICh0aGlzLl9oYW5kbGVyc1tldmVudF0gfHwgW10pLnNsaWNlKDApO1xuXHRpZiAoIW9taXRPbW5pSGFuZGxlcnMpIHtcblx0XHRoYW5kbGVycy5wdXNoLmFwcGx5KGhhbmRsZXJzLCB0aGlzLl9vbW5pSGFuZGxlcnMpO1xuXHR9XG5cdHJldHVybiBoYW5kbGVycztcbn07XG5cbi8qKlxuICogRW1pdHMgdGhlIHNwZWNpZmllZCBldmVudCBhbmQgZm9yd2FyZHMgYWxsIHBhc3NlZCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBtZXRob2QgZW1pdFxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50IC0gVGhlIG5hbWUgb2YgdGhlIGV2ZW50IHRvIGVtaXQuXG4gKiBAcGFyYW0gey4uLip9IHZhcl9hcmdzIC0gQXJndW1lbnRzIHRvIGZvcndhcmQgdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNhbGxiYWNrcy5cbiAqL1xuSUJpbmRhYmxlLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQsIHZhcl9hcmdzKSB7XG5cdHZhciBoYW5kbGVycyA9IHRoaXMuX2hhbmRsZXJzW2V2ZW50XTtcblx0aWYgKGhhbmRsZXJzIHx8IHRoaXMuX29tbmlIYW5kbGVycy5sZW5ndGggPiAwKSB7XG5cdFx0dmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cdFx0dmFyIGNvbnRleHQgPSB0aGlzO1xuXHRcdGlmIChoYW5kbGVycykge1xuXHRcdFx0dmFyIHBhcmFtcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MsIDEpO1xuXHRcdFx0aGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmbikge1xuXHRcdFx0XHRmbi5hcHBseShjb250ZXh0LCBwYXJhbXMpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fb21uaUhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZm4pIHtcblx0XHRcdGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuXHRcdH0pO1xuXHR9XG59O1xuXG4vKipcbiAqIEZvcndhcmRzIGFsbCBldmVudHMgdHJpZ2dlcmVkIGJ5IHRoZSBzcGVjaWZpZWQgYGJpbmRhYmxlYCBhcyBpZiB0aGlzIG9iamVjdCB3YXMgZW1pdHRpbmcgdGhlbS5cbiAqXG4gKiBAbWV0aG9kIGZvcndhcmRcbiAqIEBwYXJhbSB7SUJpbmRhYmxlfSBiaW5kYWJsZSAtIFRoZSBgSUJpbmRhYmxlYCBpbnN0YW5jZSBmb3Igd2hpY2ggYWxsIGV2ZW50cyB3aWxsIGJlIGZvcndhcmRlZCB0aHJvdWdoIHRoaXMgaW5zdGFuY2UuXG4gKi9cbklCaW5kYWJsZS5wcm90b3R5cGUuZm9yd2FyZCA9IGZ1bmN0aW9uKGJpbmRhYmxlKSB7XG5cdGJpbmRhYmxlLm9uKG51bGwsIHRoaXMuX2JvdW5kRm9yd2FyZEV2ZW50KTtcbn07XG5cbi8qKlxuICogU3RvcHMgZm9yd2FyZGluZyB0aGUgZXZlbnRzIG9mIHRoZSBzcGVjaWZpZWQgYGJpbmRhYmxlYFxuICpcbiAqIEBtZXRob2QgdW5mb3J3YXJkXG4gKiBAcGFyYW0ge0lCaW5kYWJsZX0gYmluZGFibGUgLSBUaGUgYElCaW5kYWJsZWAgaW5zdGFuY2UgdG8gc3RvcCBmb3J3YXJkaW5nLlxuICovXG5JQmluZGFibGUucHJvdG90eXBlLnVuZm9yd2FyZCA9IGZ1bmN0aW9uKGJpbmRhYmxlKSB7XG5cdGJpbmRhYmxlLm9mZihudWxsLCB0aGlzLl9ib3VuZEZvcndhcmRFdmVudCk7XG59O1xuXG4vKipcbiAqIFVuYmluZHMgYWxsIGV2ZW50cyBib3VuZCB0byB0aGlzIElCaW5kYWJsZSBpbnN0YW5jZS5cbiAqXG4gKiBAbWV0aG9kIGRlc3Ryb3lcbiAqL1xuSUJpbmRhYmxlLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG5cdGRlbGV0ZSB0aGlzLl9oYW5kbGVycztcblx0ZGVsZXRlIHRoaXMuX29tbmlIYW5kbGVycztcblx0ZGVsZXRlIHRoaXMuX2JvdW5kRm9yd2FyZEV2ZW50O1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBtZXRob2QgdXNlZCB0byBmb3J3YXJkIHRoZSBldmVudHMgZnJvbSBvdGhlciBgSUJpbmRhYmxlYCBpbnN0YW5jZXMuXG4gKlxuICogQG1ldGhvZCBfZm9yd2FyZEV2ZW50XG4gKiBAcGFyYW0ge3N0cmluZ30gZXZlbnQgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgdG8gZW1pdC5cbiAqIEBwYXJhbSB7Li4uKn0gdmFyX2FyZ3MgLSBBcmd1bWVudHMgdG8gZm9yd2FyZCB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY2FsbGJhY2tzLlxuICogQHByaXZhdGVcbiAqL1xuSUJpbmRhYmxlLnByb3RvdHlwZS5fZm9yd2FyZEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQsIHZhcl9hcmdzKSB7XG5cdHRoaXMuZW1pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7SUJpbmRhYmxlfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IElCaW5kYWJsZTtcbiIsIi8qXG4gKiAqXG4gKiAgQ29weXJpZ2h0IMKpIDIwMTUgVW5jaGFydGVkIFNvZnR3YXJlIEluYy5cbiAqXG4gKiAgUHJvcGVydHkgb2YgVW5jaGFydGVk4oSiLCBmb3JtZXJseSBPY3VsdXMgSW5mbyBJbmMuXG4gKiAgaHR0cDovL3VuY2hhcnRlZC5zb2Z0d2FyZS9cbiAqXG4gKiAgUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICpcbiAqICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mXG4gKiAgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbiAqICB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllc1xuICogIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkb1xuICogIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiAgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqICBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiAgU09GVFdBUkUuXG4gKiAvXG4gKi9cblxudmFyIF8gPSByZXF1aXJlKCcuLi8uLi91dGlsL3V0aWwnKTtcbnZhciBJQmluZGFibGUgPSByZXF1aXJlKCcuLi9JQmluZGFibGUnKTtcbnZhciBVdGlsID0gcmVxdWlyZSgnLi4vLi4vdXRpbC91dGlsJyk7XG5cbi8qKlxuICogQW4gaW50ZXJmYWNlIGNsYXNzIGZvciBmYWNldHMsIGRlZmluZXMgdGhlIHB1YmxpYyBBUEkgc2hhcmVkIGJ5IGFsbCBmYWNldHMuXG4gKlxuICogQGNsYXNzIEZhY2V0XG4gKiBAcGFyYW0ge2pxdWVyeX0gY29udGFpbmVyIC0gVGhlIGNvbnRhaW5lciBlbGVtZW50IGZvciB0aGlzIGZhY2V0LlxuICogQHBhcmFtIHtHcm91cH0gcGFyZW50R3JvdXAgLSBUaGUgZ3JvdXAgdGhpcyBmYWNldCBiZWxvbmdzIHRvLlxuICogQHBhcmFtIHtPYmplY3R9IHNwZWMgLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGlzIGZhY2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZhY2V0IChjb250YWluZXIsIHBhcmVudEdyb3VwLCBzcGVjKSB7XG5cdElCaW5kYWJsZS5jYWxsKHRoaXMpO1xuXG5cdHRoaXMucGFyZW50R3JvdXAgPSBwYXJlbnRHcm91cDtcblx0dGhpcy5fc3BlYyA9IHNwZWM7XG5cblx0Ly8gZ2VuZXJhdGUgYSB1bmlxdWUgaWQgZm9yIHRoaXMgZmFjZXQgZW50cnkgdGhhdCBjYW4gYmUgZm91bmQgYnkganF1ZXJ5IGZvciB1cGRhdGluZyBjb3VudHNcblx0dGhpcy5fc3BlYy5pZCA9IFV0aWwucmFuZG9tSWQoKTtcblxuXHR0aGlzLl9jb250YWluZXIgPSBjb250YWluZXI7XG5cdHRoaXMuX2VsZW1lbnQgPSBudWxsO1xufVxuXG4vKipcbiAqIEBpbmhlcml0YW5jZSB7SUJpbmRhYmxlfVxuICovXG5GYWNldC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKElCaW5kYWJsZS5wcm90b3R5cGUpO1xuRmFjZXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRmFjZXQ7XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZhY2V0J3Mga2V5LlxuICpcbiAqIEBwcm9wZXJ0eSBrZXlcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0LnByb3RvdHlwZSwgJ2tleScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIHZhbHVlIG9mIHRoaXMgZmFjZXQuXG4gKlxuICogQHByb3BlcnR5IHZhbHVlXG4gKiBAdHlwZSB7Kn1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXQucHJvdG90eXBlLCAndmFsdWUnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoaXMgZmFjZXQncyBjb250YWluZXIgZWxlbWVudC5cbiAqXG4gKiBAcHJvcGVydHkgY29udGFpbmVyXG4gKiBAdHlwZSB7anF1ZXJ5fVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXQucHJvdG90eXBlLCAnY29udGFpbmVyJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fY29udGFpbmVyO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IHRoaXMuX2NvbnRhaW5lciAmJiB0aGlzLl9lbGVtZW50KSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQucmVtb3ZlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKHZhbHVlICYmIHRoaXMuX2VsZW1lbnQpIHtcblx0XHRcdHZhbHVlLmFwcGVuZCh0aGlzLl9lbGVtZW50KTtcblx0XHR9XG5cblx0XHR0aGlzLl9jb250YWluZXIgPSB2YWx1ZTtcblx0fVxufSk7XG5cbi8qKlxuICogRGVmaW5lcyBpZiB0aGlzIGZhY2V0IGhhcyBiZWVuIHZpc3VhbGx5IGNvbXByZXNzZWQgdG8gaXRzIHNtYWxsZXN0IHBvc3NpYmxlIHN0YXRlLlxuICogTm90ZTogQWJicmV2aWF0ZWQgZmFjZXRzIGNhbm5vdCBiZSBpbnRlcmFjdGVkIHdpdGguXG4gKlxuICogQHByb3BlcnR5IGFiYnJldmlhdGVkXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0LnByb3RvdHlwZSwgJ2FiYnJldmlhdGVkJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuXHR9XG59KTtcblxuLyoqXG4gKiBEZWZpbmVzIGlmIHRoaXMgZmFjZXQgaXMgdmlzaWJsZS5cbiAqXG4gKiBAcHJvcGVydHkgdmlzaWJsZVxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldC5wcm90b3R5cGUsICd2aXNpYmxlJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuXHR9XG59KTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoaXMgZmFjZXQncyBzcGVjIHdpdGggdGhlIHBhc3NlZCBkYXRhIGFuZCB0aGVuIHVwZGF0ZXMgdGhlIGZhY2V0J3MgdmlzdWFsIHN0YXRlLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlU3BlY1xuICogQHBhcmFtIHtPYmplY3R9IHNwZWMgLSBUaGUgbmV3IHNwZWMgZm9yIHRoZSBmYWNldFxuICovXG5GYWNldC5wcm90b3R5cGUudXBkYXRlU3BlYyA9IGZ1bmN0aW9uIChzcGVjKSB7XG5cdHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG59O1xuXG4vKipcbiAqIE1hcmtzIHRoaXMgZmFjZXQgYXMgc2VsZWN0ZWQgYW5kIHVwZGF0ZXMgdGhlIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIHNlbGVjdFxuICogQHBhcmFtIHsqfSBkYXRhIC0gVGhlIGRhdGEgdXNlZCB0byBzZWxlY3QgdGhpcyBmYWNldC5cbiAqL1xuRmFjZXQucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8qKlxuICogTWFya3MgdGhpcyBmYWNldCBhcyBub3Qgc2VsZWN0ZWQgYW5kIHVwZGF0ZXMgdGhlIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIGRlc2VsZWN0XG4gKi9cbkZhY2V0LnByb3RvdHlwZS5kZXNlbGVjdCA9IGZ1bmN0aW9uKCkge1xuXHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBVbmJpbmRzIHRoaXMgaW5zdGFuY2UgZnJvbSBhbnkgcmVmZXJlbmNlIHRoYXQgaXQgbWlnaHQgaGF2ZSB3aXRoIGV2ZW50IGhhbmRsZXJzIGFuZCBET00gZWxlbWVudHMuXG4gKlxuICogQG1ldGhvZCBkZXN0cm95XG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBhbmltYXRlZCAtIFNob3VsZCB0aGUgZmFjZXQgYmUgcmVtb3ZlZCBpbiBhbiBhbmltYXRlZCB3YXkgYmVmb3JlIGl0IGJlaW5nIGRlc3Ryb3llZC5cbiAqL1xuRmFjZXQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihhbmltYXRlZCkge1xuXHRJQmluZGFibGUucHJvdG90eXBlLmRlc3Ryb3kuY2FsbCh0aGlzKTtcbn07XG5cbi8qKlxuICogQWRkcyB0aGUgbmVjZXNzYXJ5IGV2ZW50IGhhbmRsZXJzIGZvciB0aGlzIG9iamVjdCB0byBmdW5jdGlvbi5cbiAqXG4gKiBAbWV0aG9kIF9hZGRIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuRmFjZXQucHJvdG90eXBlLl9hZGRIYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuXHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFsbCB0aGUgZXZlbnQgaGFuZGxlcnMgYWRkZWQgYnkgdGhlIGBfYWRkSGFuZGxlcnNgIGZ1bmN0aW9uLlxuICpcbiAqIEBtZXRob2QgX3JlbW92ZUhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldC5wcm90b3R5cGUuX3JlbW92ZUhhbmRsZXJzID0gZnVuY3Rpb24oKSB7XG5cdHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG59O1xuXG4vKipcbiAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gbWFrZSBzdXJlIHRoZSBldmVudCBoYW5kbGVycyBoYXZlIGJlZW4gYWRkZWQgYW5kIGFyZSB1cGRhdGVkLlxuICpcbiAqIEBtZXRob2QgX3NldHVwSGFuZGxlcnNcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0LnByb3RvdHlwZS5fc2V0dXBIYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXHR0aGlzLl9hZGRIYW5kbGVycygpO1xufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7RmFjZXR9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gRmFjZXQ7XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG5cbnZhciBGYWNldEJhciA9IHJlcXVpcmUoJy4vZmFjZXRIaXN0b2dyYW1CYXInKTtcblxuLyoqXG4gKiBUaGlzIGNsYXNzIGNyZWF0ZXMgYSBoaXN0b2dyYW0gaW4gdGhlIGdpdmVuIGBzdmdDb250YWluZXJgIHVzaW5nIHRoZSBkYXRhIHByb3ZpZGVkIGluIHRoZSBgc3BlY2BcbiAqXG4gKiBAY2xhc3MgRmFjZXRIaXN0b2dyYW1cbiAqIEBwYXJhbSB7ZWxlbWVudH0gc3ZnQ29udGFpbmVyIC0gU1ZHIGVsZW1lbnQgd2hlcmUgdGhlIGhpc3RvZ3JhbSBzaG91bGQgYmUgY3JlYXRlZCAoY2FuIGJlIGFuIFNWRyBncm91cClcbiAqIEBwYXJhbSB7T2JqZWN0fSBzcGVjIC0gT2JqZWN0IGRlc2NyaWJpbmcgdGhlIGhpc3RvZ3JhbSB0byBiZSBjcmVhdGVkLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZhY2V0SGlzdG9ncmFtIChzdmdDb250YWluZXIsIHNwZWMpIHtcblx0dGhpcy5fc3ZnID0gc3ZnQ29udGFpbmVyO1xuXHR0aGlzLl9zcGVjID0gc3BlYztcblx0dGhpcy5fdG90YWxXaWR0aCA9IDA7XG5cdHRoaXMuX2JhcldpZHRoID0gMDtcblx0dGhpcy5fbWluQmFyV2lkdGggPSAoJ21pbkJhcldpZHRoJyBpbiBzcGVjKSA/IHNwZWMubWluQmFyV2lkdGggOiAzO1xuXHR0aGlzLl9tYXhCYXJXaWR0aCA9ICgnbWF4QmFyV2lkdGgnIGluIHNwZWMpID8gc3BlYy5tYXhCYXJXaWR0aCA6IE51bWJlci5NQVhfVkFMVUU7XG5cdHRoaXMuX2JhclBhZGRpbmcgPSAoJ2JhclBhZGRpbmcnIGluIHNwZWMpID8gc3BlYy5iYXJQYWRkaW5nIDogMTtcblx0dGhpcy5fYmFycyA9IFtdO1xuXG5cdHRoaXMuaW5pdGlhbGl6ZVNsaWNlcyhzdmdDb250YWluZXIsIHNwZWMuc2xpY2VzLCBzcGVjLnlNYXgpO1xufVxuXG4vKipcbiAqIFRoZSB0b3RhbCB3aWR0aCBvZiB0aGUgaGlzdG9ncmFtLlxuICpcbiAqIEBwcm9wZXJ0eSB0b3RhbFdpZHRoXG4gKiBAdHlwZSB7TnVtYmVyfVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUsICd0b3RhbFdpZHRoJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fdG90YWxXaWR0aDtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIHdpZHRoIG9mIGVhY2ggaW5kaXZpZHVhbCBiYXIgaW4gdGhlIGhpc3RvZ3JhbS5cbiAqXG4gKiBAcHJvcGVydHkgYmFyV2lkdGhcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtLnByb3RvdHlwZSwgJ2JhcldpZHRoJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fYmFyV2lkdGg7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSBhbW91bnQgb2YgcGFkZGluZyB1c2VkIGJldHdlZW4gYmFycyBpbiB0aGUgaGlzdG9ncmFtLlxuICpcbiAqIEBwcm9wZXJ0eSBiYXJQYWRkaW5nXG4gKiBAdHlwZSB7TnVtYmVyfVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUsICdiYXJQYWRkaW5nJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fYmFyUGFkZGluZztcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIGludGVybmFsIGFycmF5IGNvbnRhaW5pbmcgdGhlIGJhcnMgaW4gdGhpcyBoaXN0b2dyYW0uXG4gKlxuICogQHByb3BlcnR5IGJhcnNcbiAqIEB0eXBlIHtBcnJheX1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW0ucHJvdG90eXBlLCAnYmFycycsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2JhcnM7XG5cdH1cbn0pO1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBzbGljZXMgKGJhcnMvYnVja2V0cykgb2YgdGhpcyBoaXN0b2dyYW0gYW5kIHNhdmVzIHRoZW0gdG8gdGhlIGBfYmFyc2AgYXJyYXkuXG4gKlxuICogQG1ldGhvZCBpbml0aWFsaXplU2xpY2VzXG4gKiBAcGFyYW0ge2VsZW1lbnR9IHN2ZyAtIFRoZSBTVkcgZWxlbWVudCB3aGVyZSB0aGUgc2xpY2VzIHNob3VsZCBiZSBjcmVhdGVkLlxuICogQHBhcmFtIHtBcnJheX0gc2xpY2VzIC0gQW4gYXJyYXkgY29udGFpbmluZyB0aGUgc2xpY2VzIHRvIGJlIGNyZWF0ZWQuXG4gKiBAcGFyYW0ge051bWJlcn0geU1heCAtIFRoZSBtYXhpbXVtIHZhbHVlLCBpbiB0aGUgWSBheGlzLCB0aGF0IGFueSBnaXZlbiBzbGljZSB3aWxsIGhhdmUuXG4gKi9cbkZhY2V0SGlzdG9ncmFtLnByb3RvdHlwZS5pbml0aWFsaXplU2xpY2VzID0gZnVuY3Rpb24oc3ZnLCBzbGljZXMsIHlNYXgpIHtcblx0dmFyIHN2Z1dpZHRoID0gc3ZnLndpZHRoKCk7XG5cdHZhciBzdmdIZWlnaHQgPSBzdmcuaGVpZ2h0KCk7XG5cblx0dmFyIG1pbkJhcldpZHRoID0gdGhpcy5fbWluQmFyV2lkdGg7XG5cdHZhciBtYXhCYXJXaWR0aCA9IHRoaXMuX21heEJhcldpZHRoO1xuXHR2YXIgYmFyUGFkZGluZyA9IHRoaXMuX2JhclBhZGRpbmc7XG5cdHZhciB4ID0gMDtcblx0dmFyIGJhcnNMZW5ndGggPSBzbGljZXMubGVuZ3RoO1xuXG5cdHZhciBtYXhCYXJzTnVtYmVyID0gTWF0aC5mbG9vcihzdmdXaWR0aCAvIChtaW5CYXJXaWR0aCArIGJhclBhZGRpbmcpKTtcblx0dmFyIHN0YWNrZWRCYXJzTnVtYmVyID0gTWF0aC5jZWlsKGJhcnNMZW5ndGggLyBtYXhCYXJzTnVtYmVyKTtcblx0dmFyIGJhcnNUb0NyZWF0ZSA9IE1hdGguY2VpbChiYXJzTGVuZ3RoIC8gc3RhY2tlZEJhcnNOdW1iZXIpO1xuXG5cdHZhciBiYXJXaWR0aCA9IE1hdGguZmxvb3IoKHN2Z1dpZHRoIC0gKChiYXJzVG9DcmVhdGUgLSAxKSAqIGJhclBhZGRpbmcpKSAvIGJhcnNUb0NyZWF0ZSk7XG5cdGJhcldpZHRoID0gTWF0aC5tYXgoYmFyV2lkdGgsIG1pbkJhcldpZHRoKTtcblx0YmFyV2lkdGggPSBNYXRoLm1pbihiYXJXaWR0aCwgbWF4QmFyV2lkdGgpO1xuXHR0aGlzLl9iYXJXaWR0aCA9IGJhcldpZHRoO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgYmFyc0xlbmd0aDsgaSArPSBzdGFja2VkQmFyc051bWJlcikge1xuXHRcdHZhciBtZXRhZGF0YSA9IFtdO1xuXHRcdHZhciBjb3VudCA9IDA7XG5cdFx0Zm9yICh2YXIgaWkgPSAwOyBpaSA8IHN0YWNrZWRCYXJzTnVtYmVyICYmIChpICsgaWkpIDwgYmFyc0xlbmd0aDsgKytpaSkge1xuXHRcdFx0dmFyIHNsaWNlID0gc2xpY2VzW2kgKyBpaV07XG5cdFx0XHRjb3VudCA9IE1hdGgubWF4KGNvdW50LCBzbGljZS5jb3VudCk7XG5cdFx0XHRtZXRhZGF0YS5wdXNoKHNsaWNlKTtcblx0XHR9XG5cdFx0dmFyIGJhckhlaWdodCA9IE1hdGguY2VpbChzdmdIZWlnaHQgKiAoY291bnQgLyB5TWF4KSk7XG5cdFx0dmFyIGJhciA9IG5ldyBGYWNldEJhcihzdmcsIHgsIGJhcldpZHRoLCBiYXJIZWlnaHQsIHN2Z0hlaWdodCk7XG5cdFx0YmFyLmhpZ2hsaWdodGVkID0gZmFsc2U7XG5cdFx0YmFyLm1ldGFkYXRhID0gbWV0YWRhdGE7XG5cdFx0dGhpcy5fYmFycy5wdXNoKGJhcik7XG5cdFx0eCArPSBiYXJXaWR0aCArIGJhclBhZGRpbmc7XG5cdH1cblxuXHR0aGlzLl90b3RhbFdpZHRoID0geCAtIGJhclBhZGRpbmc7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgcGl4ZWwgcmFuZ2UgaW50byBhIGJhciByYW5nZS5cbiAqXG4gKiBAbWV0aG9kIHBpeGVsUmFuZ2VUb0JhclJhbmdlXG4gKiBAcGFyYW0ge3tmcm9tOiBudW1iZXIsIHRvOiBudW1iZXJ9fSBwaXhlbFJhbmdlIC0gVGhlIHJhbmdlIGluIHBpeGVscyB0byBjb252ZXJ0LlxuICogQHJldHVybnMge3tmcm9tOiBudW1iZXIsIHRvOiBudW1iZXJ9fVxuICovXG5GYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUucGl4ZWxSYW5nZVRvQmFyUmFuZ2UgPSBmdW5jdGlvbiAocGl4ZWxSYW5nZSkge1xuXHRyZXR1cm4ge1xuXHRcdGZyb206IE1hdGgubWluKHRoaXMuX2JhcnMubGVuZ3RoIC0gMSwgTWF0aC5tYXgoMCwgTWF0aC5yb3VuZChwaXhlbFJhbmdlLmZyb20gLyAodGhpcy5fYmFyV2lkdGggKyB0aGlzLl9iYXJQYWRkaW5nKSkpKSxcblx0XHR0bzogTWF0aC5taW4odGhpcy5fYmFycy5sZW5ndGggLSAxLCBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKChwaXhlbFJhbmdlLnRvIC0gdGhpcy5fYmFyV2lkdGgpIC8gKHRoaXMuX2JhcldpZHRoICsgdGhpcy5fYmFyUGFkZGluZykpKSlcblx0fTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBiYXIgcmFuZ2UgaW50byBhIHBpeGVsIHJhbmdlLlxuICpcbiAqIEBtZXRob2QgYmFyUmFuZ2VUb1BpeGVsUmFuZ2VcbiAqIEBwYXJhbSB7e2Zyb206IG51bWJlciwgdG86IG51bWJlcn19IGJhclJhbmdlIC0gVGhlIGJhciByYW5nZSB0byBjb252ZXJ0LlxuICogQHJldHVybnMge3tmcm9tOiBudW1iZXIsIHRvOiBudW1iZXJ9fVxuICovXG5GYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUuYmFyUmFuZ2VUb1BpeGVsUmFuZ2UgPSBmdW5jdGlvbiAoYmFyUmFuZ2UpIHtcblx0cmV0dXJuIHtcblx0XHRmcm9tOiBiYXJSYW5nZS5mcm9tICogKHRoaXMuX2JhcldpZHRoICsgdGhpcy5fYmFyUGFkZGluZyksXG5cdFx0dG86IChiYXJSYW5nZS50byAqICh0aGlzLl9iYXJXaWR0aCArIHRoaXMuX2JhclBhZGRpbmcpKSArIHRoaXMuX2JhcldpZHRoXG5cdH07XG59O1xuXG4vKipcbiAqIEhpZ2hsaWdodHMgdGhlIGdpdmVuIGJhciByYW5nZS5cbiAqXG4gKiBAbWV0aG9kIGhpZ2hsaWdodFJhbmdlXG4gKiBAcGFyYW0ge3tmcm9tOiBudW1iZXIsIHRvOiBudW1iZXJ9fSByYW5nZSAtIFRoZSBiYXIgcmFuZ2UgdG8gaGlnaGxpZ2h0LlxuICovXG5GYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUuaGlnaGxpZ2h0UmFuZ2UgPSBmdW5jdGlvbiAocmFuZ2UpIHtcblx0dmFyIGJhcnMgPSB0aGlzLl9iYXJzO1xuXHRmb3IgKHZhciBpID0gMCwgbiA9IGJhcnMubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0YmFyc1tpXS5oaWdobGlnaHRlZCA9IChpID49IHJhbmdlLmZyb20gJiYgaSA8PSByYW5nZS50byk7XG5cdH1cbn07XG5cbi8qKlxuICogU2VsZWN0cyB0aGUgc3BlY2lmaWVkIGNvdW50cyBmb3IgZWFjaCBiYXIgYXMgc3BlY2lmaWVkIGluIHRoZSBgc2xpY2VzYCBwYXJhbWV0ZXIuXG4gKlxuICogQG1ldGhvZCBzZWxlY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBzbGljZXMgLSBEYXRhIHVzZWQgdG8gc2VsZWN0IHN1Yi1iYXIgY291bnRzIGluIHRoaXMgaGlzdG9ncmFtLlxuICovXG5GYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKHNsaWNlcykge1xuXHR2YXIgYmFycyA9IHRoaXMuX2JhcnM7XG5cdHZhciB5TWF4ID0gdGhpcy5fc3BlYy55TWF4O1xuXHR2YXIgc3ZnSGVpZ2h0ID0gdGhpcy5fc3ZnLmhlaWdodCgpO1xuXG5cdGZvciAodmFyIGkgPSAwLCBuID0gYmFycy5sZW5ndGg7IGkgPCBuOyArK2kpIHtcblx0XHR2YXIgYmFyID0gYmFyc1tpXTtcblx0XHR2YXIgYmFyTWV0YWRhdGEgPSBiYXIubWV0YWRhdGE7XG5cdFx0Zm9yICh2YXIgaWkgPSAwLCBubiA9IGJhck1ldGFkYXRhLmxlbmd0aDsgaWkgPCBubjsgKytpaSkge1xuXHRcdFx0dmFyIHNsaWNlID0gYmFyTWV0YWRhdGFbaWldO1xuXHRcdFx0dmFyIGNvdW50ID0gMDtcblx0XHRcdGlmIChzbGljZS5sYWJlbCBpbiBzbGljZXMpIHtcblx0XHRcdFx0Y291bnQgPSBzbGljZXNbc2xpY2UubGFiZWxdO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgbmV3SGVpZ2h0ID0gTWF0aC5jZWlsKHN2Z0hlaWdodCAqIChjb3VudCAvIHlNYXgpKTtcblx0XHRcdGlmIChiYXIuc2VsZWN0ZWRIZWlnaHQgPT09IG51bGwpIHtcblx0XHRcdFx0YmFyLnNlbGVjdGVkSGVpZ2h0ID0gbmV3SGVpZ2h0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YmFyLnNlbGVjdGVkSGVpZ2h0ID0gTWF0aC5tYXgoYmFyLnNlbGVjdGVkSGVpZ2h0LCBuZXdIZWlnaHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBDbGVhcnMgdGhlIHNlbGVjdGlvbiBzdGF0ZSBvZiBhbGwgYmFycyBpbiB0aGlzIGhpc3RvZ3JhbS5cbiAqXG4gKiBAbWV0aG9kIGRlc2VsZWN0XG4gKi9cbkZhY2V0SGlzdG9ncmFtLnByb3RvdHlwZS5kZXNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGJhcnMgPSB0aGlzLl9iYXJzO1xuXHRmb3IgKHZhciBpID0gMCwgbiA9IGJhcnMubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0YmFyc1tpXS5zZWxlY3RlZEhlaWdodCA9IG51bGw7XG5cdH1cbn07XG5cbi8qKlxuICogQGV4cG9ydFxuICogQHR5cGUge0hpc3RvZ3JhbX1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBGYWNldEhpc3RvZ3JhbTtcbiIsIi8qXG4gKiAqXG4gKiAgQ29weXJpZ2h0IMKpIDIwMTUgVW5jaGFydGVkIFNvZnR3YXJlIEluYy5cbiAqXG4gKiAgUHJvcGVydHkgb2YgVW5jaGFydGVk4oSiLCBmb3JtZXJseSBPY3VsdXMgSW5mbyBJbmMuXG4gKiAgaHR0cDovL3VuY2hhcnRlZC5zb2Z0d2FyZS9cbiAqXG4gKiAgUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICpcbiAqICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mXG4gKiAgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbiAqICB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllc1xuICogIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkb1xuICogIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiAgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqICBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiAgU09GVFdBUkUuXG4gKiAvXG4gKi9cblxuLyoqXG4gKiBIZWxwZXIgY2xhc3MgdG8gY3JlYXRlIGJhcnMgZm9yIHRoZSBoaXN0b2dyYW0uXG4gKlxuICogQGNsYXNzIEZhY2V0SGlzdG9ncmFtQmFyXG4gKiBAcGFyYW0ge2pRdWVyeX0gY29udGFpbmVyIC0gVGhlIHN2ZyBlbGVtZW50IHRvIGFkZCB0aGUgYmFyIHRvLCBjYW4gYmUgYSBwYXBlciBvciBhIGdyb3VwLlxuICogQHBhcmFtIHtOdW1iZXJ9IHggLSBUaGUgeCBjb29yZGluYXRlIHdoZXJlIHRoZSBiYXIgc2hvdWxkIGJlIGNyZWF0ZWQuXG4gKiBAcGFyYW0ge051bWJlcn0gd2lkdGggLSBUaGUgd2lkdGggb2YgdGhlIGJhci5cbiAqIEBwYXJhbSB7TnVtYmVyfSBoZWlnaHQgLSBUaGUgaGVpZ2h0IG9mIHRoZSBiYXIuXG4gKiBAcGFyYW0ge051bWJlcn0gbWF4SGVpZ2h0IC0gVGhlIG1heGltdW0gaGVpZ2h0IG9mIHRoZSBiYXIuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRmFjZXRIaXN0b2dyYW1CYXIgKGNvbnRhaW5lciwgeCwgd2lkdGgsIGhlaWdodCwgbWF4SGVpZ2h0KSB7XG5cdHRoaXMuX21ldGFkYXRhID0gbnVsbDtcblx0dGhpcy5faGlnaGxpZ2h0ZWQgPSBmYWxzZTtcblxuXHR0aGlzLl9ncm91cEVsZW1lbnQgPSAkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCdnJykpO1xuXHR0aGlzLl9ncm91cEVsZW1lbnQuYXR0cigndHJhbnNmb3JtJywgXCJ0cmFuc2xhdGUoMCwgXCIgKyBtYXhIZWlnaHQgKyBcIiksIHNjYWxlKDEsIC0xKVwiKTtcblx0dGhpcy5fZ3JvdXBFbGVtZW50LmNzcygndHJhbnNmb3JtJywgXCJ0cmFuc2xhdGUoMCwgXCIgKyBtYXhIZWlnaHQgKyBcInB4KSBzY2FsZSgxLCAtMSlcIik7XG5cblx0Y29udGFpbmVyLmFwcGVuZCh0aGlzLl9ncm91cEVsZW1lbnQpO1xuXG5cdHRoaXMuX2JhY2tFbGVtZW50ID0gJChkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywncmVjdCcpKTtcblx0dGhpcy5fYmFja0VsZW1lbnQuYWRkQ2xhc3MoJ2ZhY2V0LWhpc3RvZ3JhbS1iYXInKTtcblx0dGhpcy5fYmFja0VsZW1lbnQuYWRkQ2xhc3MoJ2ZhY2V0LWhpc3RvZ3JhbS1iYXItdHJhbnNmb3JtJyk7XG5cdHRoaXMuX2dyb3VwRWxlbWVudC5hcHBlbmQodGhpcy5fYmFja0VsZW1lbnQpO1xuXG5cdHRoaXMuX2VsZW1lbnQgPSAkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCdyZWN0JykpO1xuXHR0aGlzLl9lbGVtZW50LmFkZENsYXNzKCdmYWNldC1oaXN0b2dyYW0tYmFyJyk7XG5cdHRoaXMuX2VsZW1lbnQuYWRkQ2xhc3MoJ2ZhY2V0LWhpc3RvZ3JhbS1iYXItdHJhbnNmb3JtJyk7XG5cdHRoaXMuX2dyb3VwRWxlbWVudC5hcHBlbmQodGhpcy5fZWxlbWVudCk7XG5cblx0dGhpcy5fc2VsZWN0ZWRIZWlnaHQgPSBudWxsO1xuXG5cdHRoaXMueCA9IHg7XG5cdHRoaXMueSA9IDA7XG5cdHRoaXMud2lkdGggPSB3aWR0aDtcblx0dGhpcy5oZWlnaHQgPSAwO1xuXHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblxuXHR0aGlzLl9vbk1vdXNlRW50ZXJIYW5kbGVyID0gbnVsbDtcblx0dGhpcy5fb25Nb3VzZUxlYXZlSGFuZGxlciA9IG51bGw7XG5cdHRoaXMuX29uQ2xpY2tIYW5kbGVyID0gbnVsbDtcbn1cblxuLyoqXG4gKiBUaGUgeCBwb3NpdGlvbiBvZiB0aGlzIGJhci5cbiAqXG4gKiBAcHJvcGVydHkgeFxuICogQHR5cGUge051bWJlcnxzdHJpbmd9XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICd4Jywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5feDtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0dGhpcy5fZWxlbWVudC5hdHRyKCd4JywgdmFsdWUpO1xuXHRcdHRoaXMuX2JhY2tFbGVtZW50LmF0dHIoJ3gnLCB2YWx1ZSk7XG5cdFx0dGhpcy5feCA9IHZhbHVlO1xuXHR9XG59KTtcblxuLyoqXG4gKiBUaGUgeSBwb3NpdGlvbiBvZiB0aGlzIGJhci4gKGRvZXMgbm90IGFjY291bnQgZm9yIENTUyBzdHlsaW5nKVxuICpcbiAqIEBwcm9wZXJ0eSB5XG4gKiBAdHlwZSB7TnVtYmVyfHN0cmluZ31cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZSwgJ3knLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl95O1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHR0aGlzLl9lbGVtZW50LmF0dHIoJ3knLCB2YWx1ZSk7XG5cdFx0dGhpcy5fYmFja0VsZW1lbnQuYXR0cigneScsIHZhbHVlKTtcblx0XHR0aGlzLl95ID0gdmFsdWU7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSB3aWR0aCBvZiB0aGlzIGJhci5cbiAqXG4gKiBAcHJvcGVydHkgd2lkdGhcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICd3aWR0aCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3dpZHRoO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHR0aGlzLl9lbGVtZW50LmF0dHIoJ3dpZHRoJywgdmFsdWUpO1xuXHRcdHRoaXMuX2JhY2tFbGVtZW50LmF0dHIoJ3dpZHRoJywgdmFsdWUpO1xuXHRcdHRoaXMuX3dpZHRoID0gdmFsdWU7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSBoZWlnaHQgb2YgdGhpcyBiYXIuXG4gKlxuICogQHByb3BlcnR5IGhlaWdodFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZSwgJ2hlaWdodCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2hlaWdodDtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0aWYgKHRoaXMuX3NlbGVjdGVkSGVpZ2h0ID09PSBudWxsKSB7XG5cdFx0XHR0aGlzLl9lbGVtZW50LmF0dHIoJ2hlaWdodCcsIHZhbHVlKTtcblx0XHRcdHRoaXMuX2VsZW1lbnQuY3NzKCdoZWlnaHQnLCB2YWx1ZSk7XG5cdFx0XHR0aGlzLl9lbGVtZW50LmNzcygnaGVpZ2h0Jyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fYmFja0VsZW1lbnQuYXR0cignaGVpZ2h0JywgdmFsdWUpO1xuXHRcdHRoaXMuX2JhY2tFbGVtZW50LmNzcygnaGVpZ2h0JywgdmFsdWUpO1xuXHRcdHRoaXMuX2JhY2tFbGVtZW50LmNzcygnaGVpZ2h0Jyk7XG5cblx0XHR0aGlzLl9oZWlnaHQgPSB2YWx1ZTtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIGhlaWdodCBvZiB0aGUgc2VsZWN0aW9uIGZvciB0aGlzIGJhci5cbiAqXG4gKiBAcHJvcGVydHkgc2VsZWN0ZWRIZWlnaHRcbiAqIEB0eXBlIHtOdW1iZXJ8bnVsbH1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZSwgJ3NlbGVjdGVkSGVpZ2h0Jywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fc2VsZWN0ZWRIZWlnaHQ7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuXHRcdFx0dGhpcy5fZWxlbWVudC5hdHRyKCdoZWlnaHQnLCB2YWx1ZSk7XG5cdFx0XHR0aGlzLl9lbGVtZW50LmNzcygnaGVpZ2h0JywgdmFsdWUpO1xuXHRcdFx0dGhpcy5fZWxlbWVudC5jc3MoJ2hlaWdodCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9lbGVtZW50LmF0dHIoJ2hlaWdodCcsIHRoaXMuX2hlaWdodCk7XG5cdFx0XHR0aGlzLl9lbGVtZW50LmNzcygnaGVpZ2h0JywgdGhpcy5faGVpZ2h0KTtcblx0XHRcdHRoaXMuX2VsZW1lbnQuY3NzKCdoZWlnaHQnKTtcblx0XHR9XG5cblx0XHR0aGlzLl9zZWxlY3RlZEhlaWdodCA9IHZhbHVlO1xuXHR9XG59KTtcblxuLyoqXG4gKiBIb2xkcyBhbnkgb2JqZWN0IGFzIHRoZSBtZXRhZGF0YSBmb3IgdGhpcyBiYXIuXG4gKlxuICogQHByb3BlcnR5IG1ldGFkYXRhXG4gKiBAdHlwZSB7Kn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZSwgJ21ldGFkYXRhJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbWV0YWRhdGE7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdHRoaXMuX21ldGFkYXRhID0gdmFsdWU7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0cyB3aXRoIHRoZSBzeW50aGVzaXplZCBpbmZvIG9mIHRoaXMgYmFyLlxuICpcbiAqIEBwcm9wZXJ0eSBpbmZvXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICdpbmZvJywge1xuXHRnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRsYWJlbDogdGhpcy5fbWV0YWRhdGEubWFwKGZ1bmN0aW9uKGluZm8pIHtcblx0XHRcdFx0cmV0dXJuIGluZm8ubGFiZWw7XG5cdFx0XHR9KSxcblxuXHRcdFx0Y291bnQ6IHRoaXMuX21ldGFkYXRhLm1hcChmdW5jdGlvbihpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBpbmZvLmNvdW50O1xuXHRcdFx0fSksXG5cblx0XHRcdG1ldGFkYXRhOiB0aGlzLl9tZXRhZGF0YS5tYXAoZnVuY3Rpb24oaW5mbykge1xuXHRcdFx0XHRyZXR1cm4gaW5mby5tZXRhZGF0YTtcblx0XHRcdH0pXG5cdFx0fTtcblx0fVxufSk7XG5cbi8qKlxuICogV2hldGhlciBvciBub3QgdGhpcyBiYXIgaXMgY3VycmVudGx5IGhpZ2hsaWdodGVkLlxuICpcbiAqIEBwcm9wZXJ0eSBoaWdobGlnaHRlZFxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICdoaWdobGlnaHRlZCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2hpZ2hsaWdodGVkO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IHRoaXMuX2hpZ2hsaWdodGVkKSB7XG5cdFx0XHR0aGlzLl9lbGVtZW50LnRvZ2dsZUNsYXNzKFwiZmFjZXQtaGlzdG9ncmFtLWJhciBmYWNldC1oaXN0b2dyYW0tYmFyLWhpZ2hsaWdodGVkXCIpO1xuXHRcdH1cblx0XHR0aGlzLl9oaWdobGlnaHRlZCA9IHZhbHVlO1xuXHR9XG59KTtcblxuLyoqXG4gKiBBIGNhbGxiYWNrIGZ1bmN0aW9uIGludm9rZWQgd2hlbiB0aGUgbW91c2UgZW50ZXJzIHRoaXMgYmFyLlxuICpcbiAqIEBwcm9wZXJ0eSBvbk1vdXNlRW50ZXJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZSwgJ29uTW91c2VFbnRlcicsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX29uTW91c2VFbnRlckhhbmRsZXI7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHRoaXMuX29uTW91c2VFbnRlckhhbmRsZXIgPSB2YWx1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fb25Nb3VzZUVudGVySGFuZGxlciA9IG51bGw7XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBBIGNhbGxiYWNrIGZ1bmN0aW9uIGludm9rZWQgd2hlbiB0aGUgbW91c2UgbGVhdmVzIHRoaXMgYmFyLlxuICpcbiAqIEBwcm9wZXJ0eSBvbk1vdXNlTGVhdmVcbiAqIEB0eXBlIHtmdW5jdGlvbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZSwgJ29uTW91c2VMZWF2ZScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX29uTW91c2VMZWF2ZUhhbmRsZXI7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHRoaXMuX29uTW91c2VMZWF2ZUhhbmRsZXIgPSB2YWx1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fb25Nb3VzZUxlYXZlSGFuZGxlciA9IG51bGw7XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBBIGNhbGxiYWNrIGZ1bmN0aW9uIGludm9rZWQgd2hlbiB0aGUgYmFyIGlzIGNsaWNrZWQuXG4gKlxuICogQHByb3BlcnR5IG9uQ2xpY2tcbiAqIEB0eXBlIHtmdW5jdGlvbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZSwgJ29uQ2xpY2snLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9vbkNsaWNrSGFuZGxlcjtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0dGhpcy5fb25DbGlja0hhbmRsZXIgPSB2YWx1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fb25DbGlja0hhbmRsZXIgPSBudWxsO1xuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogQWRkcyB0aGUgcmVxdWlyZWQgZXZlbnQgaGFuZGxlcnMgbmVlZGVkIHRvIHRyaWdnZXIgdGhpcyBiYXIncyBvd24gZXZlbnRzLlxuICpcbiAqIEBtZXRob2QgX2FkZEhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUuX2FkZEhhbmRsZXJzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX2VsZW1lbnQuaG92ZXIoXG5cdFx0dGhpcy5fb25Nb3VzZUVudGVyLmJpbmQodGhpcyksXG5cdFx0dGhpcy5fb25Nb3VzZUxlYXZlLmJpbmQodGhpcylcblx0KTtcblx0dGhpcy5fZWxlbWVudC5jbGljayh0aGlzLl9vbkNsaWNrLmJpbmQodGhpcykpO1xuXG5cdHRoaXMuX2JhY2tFbGVtZW50LmhvdmVyKFxuXHRcdHRoaXMuX29uTW91c2VFbnRlci5iaW5kKHRoaXMpLFxuXHRcdHRoaXMuX29uTW91c2VMZWF2ZS5iaW5kKHRoaXMpXG5cdCk7XG5cdHRoaXMuX2JhY2tFbGVtZW50LmNsaWNrKHRoaXMuX29uQ2xpY2suYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYW55IGFkZGVkIGV2ZW50IGhhbmRsZXJzLCB2aXJ0dWFsbHkgXCJtdXRpbmdcIiB0aGlzIGJhclxuICpcbiAqIEBtZXRob2QgX3JlbW92ZUhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUuX3JlbW92ZUhhbmRsZXJzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX2VsZW1lbnQudW5iaW5kKCdjbGljaycpO1xuXHR0aGlzLl9lbGVtZW50LnVuYmluZCgnaG92ZXInKTtcblxuXHR0aGlzLl9iYWNrRWxlbWVudC51bmJpbmQoJ2NsaWNrJyk7XG5cdHRoaXMuX2JhY2tFbGVtZW50LnVuYmluZCgnaG92ZXInKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB0aGUgYG1vdXNlZW50ZXJgIGV2ZW50LlxuICpcbiAqIEBtZXRob2QgX29uTW91c2VFbnRlclxuICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSBUaGUgZXZlbnQgdHJpZ2dlcmVkLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLl9vbk1vdXNlRW50ZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdGlmICh0aGlzLl9vbk1vdXNlRW50ZXJIYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Nb3VzZUVudGVySGFuZGxlcih0aGlzLCBldmVudCk7XG5cdH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB0aGUgYG1vdXNlbGVhdmVgIGV2ZW50LlxuICpcbiAqIEBtZXRob2QgX29uTW91c2VMZWF2ZVxuICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSBUaGUgZXZlbnQgdHJpZ2dlcmVkLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLl9vbk1vdXNlTGVhdmUgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdGlmICh0aGlzLl9vbk1vdXNlTGVhdmVIYW5kbGVyKSB7XG5cdFx0dGhpcy5fb25Nb3VzZUxlYXZlSGFuZGxlcih0aGlzLCBldmVudCk7XG5cdH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB0aGUgYGNsaWNrYCBldmVudC5cbiAqXG4gKiBAbWV0aG9kIF9vbkNsaWNrXG4gKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIFRoZSBldmVudCB0cmlnZ2VyZWQuXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUuX29uQ2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdGlmICh0aGlzLl9vbkNsaWNrSGFuZGxlcikge1xuXHRcdHRoaXMuX29uQ2xpY2tIYW5kbGVyKHRoaXMsIGV2ZW50KTtcblx0fVxufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7RmFjZXRIaXN0b2dyYW1CYXJ9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRIaXN0b2dyYW1CYXI7XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG5cblxuLyoqXG4gKiBIZWxwZXIgY2xhc3MgdG8gbWFuYWdlIHRoZSByYW5nZSBmaWx0ZXJpbmcgdG9vbHMuXG4gKlxuICogQGNsYXNzIEZhY2V0SGlzdG9ncmFtRmlsdGVyXG4gKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIEEgalF1ZXJ5IHdyYXBwZWQgZWxlbWVudCB0aGF0IGNvbnRhaW5zIGFsbCB0aGUgcmFuZ2UgbWFuaXB1bGF0aW9uIHRvb2xzLlxuICogQHBhcmFtIHtGYWNldEhpc3RvZ3JhbX0gaGlzdG9ncmFtIC0gVGhlIGhpc3RvZ3JhbSB0byB3aGljaCB0aGUgdG9vbHMgd2lsbCBiZSBsaW5rZWQgdG8uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRmFjZXRIaXN0b2dyYW1GaWx0ZXIgKGVsZW1lbnQsIGhpc3RvZ3JhbSkge1xuXHR0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcblx0dGhpcy5faGlzdG9ncmFtID0gaGlzdG9ncmFtO1xuXHR0aGlzLl9yYW5nZUZpbHRlciA9IGVsZW1lbnQuZmluZCgnLmZhY2V0LXJhbmdlLWZpbHRlcicpO1xuXHR0aGlzLl9sZWZ0SGFuZGxlID0gdGhpcy5fcmFuZ2VGaWx0ZXIuZmluZCgnLmZhY2V0LXJhbmdlLWZpbHRlci1sZWZ0Jyk7XG5cdHRoaXMuX3JpZ2h0SGFuZGxlID0gdGhpcy5fcmFuZ2VGaWx0ZXIuZmluZCgnLmZhY2V0LXJhbmdlLWZpbHRlci1yaWdodCcpO1xuXG5cdHRoaXMuX2N1cnJlbnRSYW5nZUxhYmVsID0gZWxlbWVudC5maW5kKCcuZmFjZXQtcmFuZ2UtY3VycmVudCcpO1xuXHR0aGlzLl9wYWdlTGVmdCA9IGVsZW1lbnQuZmluZCgnLmZhY2V0LXBhZ2UtbGVmdCcpO1xuXHR0aGlzLl9wYWdlUmlnaHQgPSBlbGVtZW50LmZpbmQoJy5mYWNldC1wYWdlLXJpZ2h0Jyk7XG5cblx0dGhpcy5fZHJhZ2dpbmdMZWZ0ID0gZmFsc2U7XG5cdHRoaXMuX2RyYWdnaW5nTGVmdFggPSAwO1xuXHR0aGlzLl9jYW5EcmFnTGVmdCA9IGZhbHNlO1xuXG5cdHRoaXMuX2RyYWdnaW5nUmlnaHQgPSBmYWxzZTtcblx0dGhpcy5fZHJhZ2dpbmdSaWdodFggPSAwO1xuXHR0aGlzLl9jYW5EcmFnUmlnaHQgPSBmYWxzZTtcblxuXHR0aGlzLl9waXhlbFJhbmdlID0ge1xuXHRcdGZyb206IDAsXG5cdFx0dG86IDBcblx0fTtcblxuXHR0aGlzLl9iYXJSYW5nZSA9IHtcblx0XHRmcm9tOiAwLFxuXHRcdHRvOiAwXG5cdH07XG5cblx0dGhpcy5fbWF4QmFyUmFuZ2UgPSB7XG5cdFx0ZnJvbTogMCxcblx0XHR0bzogKGhpc3RvZ3JhbS5iYXJzLmxlbmd0aCAtIDEpXG5cdH07XG5cblx0dGhpcy5fb25GaWx0ZXJDaGFuZ2VkID0gbnVsbDtcblxuXHR0aGlzLl9pbml0aWFsaXplRHJhZ2dpbmcoKTtcblx0dGhpcy5faW5pdGlhbGl6ZVBhZ2luYXRpb24oKTtcblxuXHR0aGlzLl9yYW5nZUZpbHRlci5yZW1vdmVDbGFzcygnZmFjZXQtcmFuZ2UtZmlsdGVyLWluaXQnKTtcbn1cblxuLyoqXG4gKiBBIGNhbGxiYWNrIGZ1bmN0aW9uIGludm9rZWQgd2hlbiB0aGUgZmlsdGVyIHJhbmdlIGlzIGNoYW5nZWQuXG4gKlxuICogQHByb3BlcnR5IG9uRmlsdGVyQ2hhbmdlZFxuICogQHR5cGUge2Z1bmN0aW9ufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW1GaWx0ZXIucHJvdG90eXBlLCAnb25GaWx0ZXJDaGFuZ2VkJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fb25GaWx0ZXJDaGFuZ2VkO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHR0aGlzLl9vbkZpbHRlckNoYW5nZWQgPSB2YWx1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fb25GaWx0ZXJDaGFuZ2VkID0gbnVsbDtcblx0XHR9XG5cdH1cbn0pO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGJhciByYW5nZSBvZiB0aGlzIGhpc3RvZ3JhbSBmaWx0ZXIuXG4gKlxuICogQHByb3BlcnR5IGJhclJhbmdlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW1GaWx0ZXIucHJvdG90eXBlLCAnYmFyUmFuZ2UnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9iYXJSYW5nZTtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdHRoaXMuc2V0RmlsdGVyQmFyUmFuZ2UodmFsdWUsIGZhbHNlKTtcblx0fVxufSk7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgcGl4ZWwgcmFuZ2Ugb2YgdGhpcyBoaXN0b2dyYW0gZmlsdGVyLlxuICpcbiAqIEBwcm9wZXJ0eSBwaXhlbFJhbmdlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW1GaWx0ZXIucHJvdG90eXBlLCAncGl4ZWxSYW5nZScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3BpeGVsUmFuZ2U7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHR0aGlzLnNldEZpbHRlclBpeGVsUmFuZ2UodmFsdWUsIGZhbHNlKTtcblx0fVxufSk7XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGRyYWdnaW5nIGZ1bmN0aW9uYWxpdHkgZm9yIHRoZSByYW5nZSBzZWxlY3Rpb24gY29udHJvbHMuXG4gKlxuICogQG1ldGhvZCBfaW5pdGlhbGl6ZURyYWdnaW5nXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhpc3RvZ3JhbUZpbHRlci5wcm90b3R5cGUuX2luaXRpYWxpemVEcmFnZ2luZyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGNhbGN1bGF0ZUZyb20gPSBmdW5jdGlvbiAocmFuZ2UsIG9mZnNldCwgYmFyV2lkdGgsIHRvdGFsV2lkdGgpIHtcblx0XHRyYW5nZS5mcm9tID0gTWF0aC5tYXgoMCwgcmFuZ2UuZnJvbSArIG9mZnNldCk7XG5cdFx0aWYgKHJhbmdlLmZyb20gPiByYW5nZS50byAtIGJhcldpZHRoKSB7XG5cdFx0XHRpZiAocmFuZ2UuZnJvbSArIGJhcldpZHRoIDwgdG90YWxXaWR0aCkge1xuXHRcdFx0XHRyYW5nZS50byA9IHJhbmdlLmZyb20gKyBiYXJXaWR0aDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJhbmdlLmZyb20gPSB0b3RhbFdpZHRoIC0gYmFyV2lkdGg7XG5cdFx0XHRcdHJhbmdlLnRvID0gdG90YWxXaWR0aDtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0dmFyIGNhbGN1bGF0ZVRvID0gZnVuY3Rpb24gKHJhbmdlLCBvZmZzZXQsIGJhcldpZHRoLCB0b3RhbFdpZHRoKSB7XG5cdFx0cmFuZ2UudG8gPSBNYXRoLm1pbih0b3RhbFdpZHRoLCByYW5nZS50byArIG9mZnNldCk7XG5cdFx0aWYgKHJhbmdlLnRvIDwgcmFuZ2UuZnJvbSArIGJhcldpZHRoKSB7XG5cdFx0XHRpZiAocmFuZ2UudG8gLSBiYXJXaWR0aCA+IDApIHtcblx0XHRcdFx0cmFuZ2UuZnJvbSA9IHJhbmdlLnRvIC0gYmFyV2lkdGg7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyYW5nZS5mcm9tID0gMDtcblx0XHRcdFx0cmFuZ2UudG8gPSBiYXJXaWR0aDtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0dmFyIGJhcldpZHRoID0gdGhpcy5faGlzdG9ncmFtLmJhcldpZHRoO1xuXHR2YXIgdG90YWxXaWR0aCA9IHRoaXMuX2hpc3RvZ3JhbS50b3RhbFdpZHRoO1xuXG5cdHZhciBlbmREcmFnZ2luZyA9IGZ1bmN0aW9uIChldmVudCkge1xuXHRcdGlmICh0aGlzLl9kcmFnZ2luZ0xlZnQgfHwgdGhpcy5fZHJhZ2dpbmdSaWdodCkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciByYW5nZSA9IHtcblx0XHRcdFx0ZnJvbTogdGhpcy5fcGl4ZWxSYW5nZS5mcm9tLFxuXHRcdFx0XHR0bzogdGhpcy5fcGl4ZWxSYW5nZS50b1xuXHRcdFx0fTtcblxuXHRcdFx0aWYgKHRoaXMuX2RyYWdnaW5nTGVmdCkge1xuXHRcdFx0XHR0aGlzLl9jYW5EcmFnTGVmdCA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLl9kcmFnZ2luZ0xlZnQgPSBmYWxzZTtcblx0XHRcdFx0Y2FsY3VsYXRlRnJvbShyYW5nZSwgKGV2ZW50LmNsaWVudFggLSB0aGlzLl9kcmFnZ2luZ0xlZnRYKSwgYmFyV2lkdGgsIHRvdGFsV2lkdGgpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fZHJhZ2dpbmdSaWdodCkge1xuXHRcdFx0XHR0aGlzLl9jYW5EcmFnUmlnaHQgPSBmYWxzZTtcblx0XHRcdFx0dGhpcy5fZHJhZ2dpbmdSaWdodCA9IGZhbHNlO1xuXHRcdFx0XHRjYWxjdWxhdGVUbyhyYW5nZSwgKGV2ZW50LmNsaWVudFggLSB0aGlzLl9kcmFnZ2luZ1JpZ2h0WCksIGJhcldpZHRoLCB0b3RhbFdpZHRoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZXRGaWx0ZXJQaXhlbFJhbmdlKHJhbmdlLCB0cnVlKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0uYmluZCh0aGlzKTtcblxuXHR0aGlzLl9lbGVtZW50Lm1vdXNlbGVhdmUoZW5kRHJhZ2dpbmcpO1xuXHR0aGlzLl9lbGVtZW50Lm1vdXNldXAoZW5kRHJhZ2dpbmcpO1xuXG5cdHRoaXMuX2VsZW1lbnQubW91c2Vtb3ZlKGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMuX2NhbkRyYWdMZWZ0IHx8IHRoaXMuX2NhbkRyYWdSaWdodCkge1xuXHRcdFx0dmFyIHJhbmdlID0ge1xuXHRcdFx0XHRmcm9tOiB0aGlzLl9waXhlbFJhbmdlLmZyb20sXG5cdFx0XHRcdHRvOiB0aGlzLl9waXhlbFJhbmdlLnRvXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAodGhpcy5fY2FuRHJhZ0xlZnQpIHtcblx0XHRcdFx0aWYgKCF0aGlzLl9kcmFnZ2luZ0xlZnQpIHtcblx0XHRcdFx0XHR0aGlzLl9kcmFnZ2luZ0xlZnQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGN1bGF0ZUZyb20ocmFuZ2UsIChldmVudC5jbGllbnRYIC0gdGhpcy5fZHJhZ2dpbmdMZWZ0WCksIGJhcldpZHRoLCB0b3RhbFdpZHRoKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX2NhbkRyYWdSaWdodCkge1xuXHRcdFx0XHRpZiAoIXRoaXMuX2RyYWdnaW5nUmlnaHQpIHtcblx0XHRcdFx0XHR0aGlzLl9kcmFnZ2luZ1JpZ2h0ID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxjdWxhdGVUbyhyYW5nZSwgKGV2ZW50LmNsaWVudFggLSB0aGlzLl9kcmFnZ2luZ1JpZ2h0WCksIGJhcldpZHRoLCB0b3RhbFdpZHRoKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGJhclJhbmdlID0gdGhpcy5faGlzdG9ncmFtLnBpeGVsUmFuZ2VUb0JhclJhbmdlKHJhbmdlKTtcblx0XHRcdHRoaXMudXBkYXRlVUkoYmFyUmFuZ2UsIHJhbmdlKTtcblx0XHR9XG5cdH0uYmluZCh0aGlzKSk7XG5cblx0dGhpcy5fbGVmdEhhbmRsZS5tb3VzZWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHR0aGlzLl9jYW5EcmFnTGVmdCA9IHRydWU7XG5cdFx0dGhpcy5fZHJhZ2dpbmdMZWZ0ID0gZmFsc2U7XG5cdFx0dGhpcy5fZHJhZ2dpbmdMZWZ0WCA9IGV2ZW50LmNsaWVudFg7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LmJpbmQodGhpcykpO1xuXG5cdHRoaXMuX3JpZ2h0SGFuZGxlLm1vdXNlZG93bihmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHRoaXMuX2NhbkRyYWdSaWdodCA9IHRydWU7XG5cdFx0dGhpcy5fZHJhZ2dpbmdSaWdodCA9IGZhbHNlO1xuXHRcdHRoaXMuX2RyYWdnaW5nUmlnaHRYID0gZXZlbnQuY2xpZW50WDtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0uYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBwYWdpbmF0aW9uIGZ1bmN0aW9uYWxpdHkgb2YgdGhlIHJhbmdlIG1hbmlwdWxhdGlvbiBjb250cm9scy5cbiAqXG4gKiBAbWV0aG9kIF9pbml0aWFsaXplUGFnaW5hdGlvblxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIaXN0b2dyYW1GaWx0ZXIucHJvdG90eXBlLl9pbml0aWFsaXplUGFnaW5hdGlvbiA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fcGFnZUxlZnQuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZyb20gPSB0aGlzLl9iYXJSYW5nZS5mcm9tO1xuXHRcdHZhciB0byA9IHRoaXMuX2JhclJhbmdlLnRvO1xuXHRcdHZhciBtYXhGcm9tID0gdGhpcy5fbWF4QmFyUmFuZ2UuZnJvbTtcblxuXHRcdGlmIChmcm9tID4gbWF4RnJvbSkge1xuXHRcdFx0dmFyIG9mZnNldCA9IHRvIC0gZnJvbSArIDE7XG5cdFx0XHRpZiAoZnJvbSAtIG9mZnNldCA8IG1heEZyb20pIHtcblx0XHRcdFx0b2Zmc2V0ID0gZnJvbSAtIG1heEZyb207XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2V0RmlsdGVyQmFyUmFuZ2Uoe1xuXHRcdFx0XHRmcm9tOiBmcm9tIC0gb2Zmc2V0LFxuXHRcdFx0XHR0bzogdG8gLSBvZmZzZXRcblx0XHRcdH0sIHRydWUpO1xuXHRcdH1cblx0fS5iaW5kKHRoaXMpKTtcblxuXHR0aGlzLl9wYWdlUmlnaHQuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZyb20gPSB0aGlzLl9iYXJSYW5nZS5mcm9tO1xuXHRcdHZhciB0byA9IHRoaXMuX2JhclJhbmdlLnRvO1xuXHRcdHZhciBtYXhUbyA9IHRoaXMuX21heEJhclJhbmdlLnRvO1xuXG5cdFx0aWYgKHRvIDwgbWF4VG8pIHtcblx0XHRcdHZhciBvZmZzZXQgPSB0byAtIGZyb20gKyAxO1xuXHRcdFx0aWYgKHRvICsgb2Zmc2V0ID4gbWF4VG8pIHtcblx0XHRcdFx0b2Zmc2V0ID0gbWF4VG8gLSB0bztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZXRGaWx0ZXJCYXJSYW5nZSh7XG5cdFx0XHRcdGZyb206IGZyb20gKyBvZmZzZXQsXG5cdFx0XHRcdHRvOiB0byArIG9mZnNldFxuXHRcdFx0fSwgdHJ1ZSk7XG5cdFx0fVxuXHR9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBnaXZlbiBwaXhlbCByYW5nZSBhcyB0aGUgY3VycmVudGx5IGFjdGl2ZSByYW5nZS5cbiAqIE5PVEU6IFRoaXMgZnVuY3Rpb24gcm91bmRzIHRoZSBwaXhlbCByYW5nZSB0byB0aGUgY2xvc2VzIHBvc3NpYmxlIGJhciByYW5nZS5cbiAqXG4gKiBAbWV0aG9kIHNldEZpbHRlclBpeGVsUmFuZ2VcbiAqIEBwYXJhbSB7T2JqZWN0fSBwaXhlbFJhbmdlIC0gQSByYW5nZSBvYmplY3QgY29udGFpbmluZyB0aGUgcGl4ZWwgY29vcmRpbmF0ZXMgdG8gYmUgc2VsZWN0ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBmcm9tVXNlcklucHV0IC0gRGVmaW5lcyBpZiB0aGUgZmlsdGVyIHJhbmdlIGNoYW5nZSB3YXMgdHJpZ2dlcmVkIGJ5IGEgdXNlciBpbnB1dCBpbnRlcmFjdGlvbi5cbiAqL1xuRmFjZXRIaXN0b2dyYW1GaWx0ZXIucHJvdG90eXBlLnNldEZpbHRlclBpeGVsUmFuZ2UgPSBmdW5jdGlvbiAocGl4ZWxSYW5nZSwgZnJvbVVzZXJJbnB1dCkge1xuXHR0aGlzLnNldEZpbHRlckJhclJhbmdlKHRoaXMuX2hpc3RvZ3JhbS5waXhlbFJhbmdlVG9CYXJSYW5nZShwaXhlbFJhbmdlKSwgZnJvbVVzZXJJbnB1dCk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGdpdmVuIGJhciByYW5nZSBhcyB0aGUgY3VycmVudGx5IGFjdGl2ZSByYW5nZS5cbiAqXG4gKiBAbWV0aG9kIHNldEZpbHRlckJhclJhbmdlXG4gKiBAcGFyYW0ge09iamVjdH0gYmFyUmFuZ2UgLSBUaGUgYmFyIHJhbmdlIHRvIHNlbGVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGZyb21Vc2VySW5wdXQgLSBEZWZpbmVzIGlmIHRoZSBmaWx0ZXIgcmFuZ2UgY2hhbmdlIHdhcyB0cmlnZ2VyZWQgYnkgYSB1c2VyIGlucHV0IGludGVyYWN0aW9uLlxuICovXG5GYWNldEhpc3RvZ3JhbUZpbHRlci5wcm90b3R5cGUuc2V0RmlsdGVyQmFyUmFuZ2UgPSBmdW5jdGlvbiAoYmFyUmFuZ2UsIGZyb21Vc2VySW5wdXQpIHtcblx0dmFyIHBpeGVsUmFuZ2UgPSB0aGlzLl9oaXN0b2dyYW0uYmFyUmFuZ2VUb1BpeGVsUmFuZ2UoYmFyUmFuZ2UpO1xuXG5cdHRoaXMuX3BpeGVsUmFuZ2UgPSBwaXhlbFJhbmdlO1xuXHR0aGlzLl9iYXJSYW5nZSA9IGJhclJhbmdlO1xuXG5cdHRoaXMudXBkYXRlVUkoYmFyUmFuZ2UsIHBpeGVsUmFuZ2UpO1xuXG5cdGlmICh0aGlzLl9vbkZpbHRlckNoYW5nZWQpIHtcblx0XHR0aGlzLl9vbkZpbHRlckNoYW5nZWQoYmFyUmFuZ2UsIGZyb21Vc2VySW5wdXQpO1xuXHR9XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIFVJIGNvbXBvbmVudHMgb2YgdGhlIHJhbmdlIG1hbmlwdWxhdGlvbiB0b29scy5cbiAqIE5PVEU6IFRoZSBgYmFyUmFuZ2VgIGFuZCB0aGUgYHBpeGVsUmFuZ2VgIG1heSBiZSBkaWZmZXJlbnQsIHRoaXMgZnVuY3Rpb24gZG9lcyBOT1QgcGVyZm9ybSB0ZXN0cyB0byBtYWtlIHN1cmUgdGhleSBhcmUgZXF1aXZhbGVudC5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVVJXG4gKiBAcGFyYW0ge09iamVjdH0gYmFyUmFuZ2UgLSBUaGUgYmFyIHJhbmdlIHVzZWQgdG8gdXBkYXRlIHRoZSBVSVxuICogQHBhcmFtIHtPYmplY3R9IHBpeGVsUmFuZ2UgLSBUaGUgcGl4ZWwgcmFuZ2UgdG8gdXBkYXRlIHRoZSBVSVxuICovXG5GYWNldEhpc3RvZ3JhbUZpbHRlci5wcm90b3R5cGUudXBkYXRlVUkgPSBmdW5jdGlvbiAoYmFyUmFuZ2UsIHBpeGVsUmFuZ2UpIHtcblx0dmFyIGJhcnMgPSB0aGlzLl9oaXN0b2dyYW0uYmFycztcblx0dmFyIGxlZnRCYXJNZXRhZGF0YSA9IGJhcnNbYmFyUmFuZ2UuZnJvbV0ubWV0YWRhdGE7XG5cdHZhciByaWdodEJhck1ldGFkYXRhID0gYmFyc1tiYXJSYW5nZS50b10ubWV0YWRhdGE7XG5cdHRoaXMuX2N1cnJlbnRSYW5nZUxhYmVsLnRleHQobGVmdEJhck1ldGFkYXRhWzBdLmxhYmVsICsgJyAtICcgKyByaWdodEJhck1ldGFkYXRhW3JpZ2h0QmFyTWV0YWRhdGEubGVuZ3RoIC0gMV0ubGFiZWwpO1xuXG5cdHRoaXMuX2hpc3RvZ3JhbS5oaWdobGlnaHRSYW5nZShiYXJSYW5nZSk7XG5cblx0dGhpcy5fcmFuZ2VGaWx0ZXIuY3NzKCdsZWZ0JywgcGl4ZWxSYW5nZS5mcm9tKTtcblx0dGhpcy5fcmFuZ2VGaWx0ZXIuY3NzKCd3aWR0aCcsIHBpeGVsUmFuZ2UudG8gLSBwaXhlbFJhbmdlLmZyb20pO1xuXG5cdGlmIChiYXJSYW5nZS5mcm9tID09PSB0aGlzLl9tYXhCYXJSYW5nZS5mcm9tICYmIGJhclJhbmdlLnRvID09PSB0aGlzLl9tYXhCYXJSYW5nZS50bykge1xuXHRcdHRoaXMuX2N1cnJlbnRSYW5nZUxhYmVsLmFkZENsYXNzKCdmYWNldC1yYW5nZS1jdXJyZW50LWhpZGRlbicpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX2N1cnJlbnRSYW5nZUxhYmVsLnJlbW92ZUNsYXNzKCdmYWNldC1yYW5nZS1jdXJyZW50LWhpZGRlbicpO1xuXHR9XG5cblx0aWYgKGJhclJhbmdlLmZyb20gPT09IHRoaXMuX21heEJhclJhbmdlLmZyb20pIHtcblx0XHR0aGlzLl9wYWdlTGVmdC5hZGRDbGFzcygnZmFjZXQtcGFnZS1jdHJsLWRpc2FibGVkJyk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fcGFnZUxlZnQucmVtb3ZlQ2xhc3MoJ2ZhY2V0LXBhZ2UtY3RybC1kaXNhYmxlZCcpO1xuXHR9XG5cblx0aWYgKGJhclJhbmdlLnRvID09PSB0aGlzLl9tYXhCYXJSYW5nZS50bykge1xuXHRcdHRoaXMuX3BhZ2VSaWdodC5hZGRDbGFzcygnZmFjZXQtcGFnZS1jdHJsLWRpc2FibGVkJyk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fcGFnZVJpZ2h0LnJlbW92ZUNsYXNzKCdmYWNldC1wYWdlLWN0cmwtZGlzYWJsZWQnKTtcblx0fVxufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7RmFjZXRIaXN0b2dyYW1GaWx0ZXJ9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRIaXN0b2dyYW1GaWx0ZXI7XG5cblxuIiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvdXRpbCcpO1xudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi9mYWNldCcpO1xudmFyIEhpc3RvZ3JhbSA9IHJlcXVpcmUoJy4vZmFjZXRIaXN0b2dyYW0nKTtcbnZhciBIaXN0b2dyYW1GaWx0ZXIgPSByZXF1aXJlKCcuL2ZhY2V0SGlzdG9ncmFtRmlsdGVyJyk7XG52YXIgVGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvZmFjZXRIb3Jpem9udGFsJyk7XG5cbnZhciBBQkJSRVZJQVRFRF9DTEFTUyA9ICdmYWNldHMtZmFjZXQtaG9yaXpvbnRhbC1hYmJyZXZpYXRlZCc7XG52YXIgSElEREVOX0NMQVNTID0gJ2ZhY2V0cy1mYWNldC1ob3Jpem9udGFsLWhpZGRlbic7XG5cbi8qKlxuICogSG9yaXpvbnRhbCBmYWNldCBjbGFzcywgY29udGFpbnMgYSBoaXN0b2dyYW0gYW5kIGNvbnRyb2xzIHRvIHBlcmZvcm0gZmlsdGVycyBvbiBpdC5cbiAqXG4gKiBAY2xhc3MgRmFjZXRIb3Jpem9udGFsXG4gKiBAcGFyYW0ge2pxdWVyeX0gY29udGFpbmVyIC0gVGhlIGNvbnRhaW5lciBlbGVtZW50IGZvciB0aGlzIGZhY2V0LlxuICogQHBhcmFtIHtHcm91cH0gcGFyZW50R3JvdXAgLSBUaGUgZ3JvdXAgdGhpcyBmYWNldCBiZWxvbmdzIHRvLlxuICogQHBhcmFtIHtPYmplY3R9IHNwZWMgLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGlzIGZhY2V0LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZhY2V0SG9yaXpvbnRhbCAoY29udGFpbmVyLCBwYXJlbnRHcm91cCwgc3BlYykge1xuXHRGYWNldC5jYWxsKHRoaXMsIGNvbnRhaW5lciwgcGFyZW50R3JvdXAsIHNwZWMpO1xuXG5cdHRoaXMuX2tleSA9IHNwZWMua2V5O1xuXHR0aGlzLl9zcGVjID0gdGhpcy5wcm9jZXNzU3BlYyhzcGVjKTtcblxuXHR0aGlzLl9pbml0aWFsaXplTGF5b3V0KFRlbXBsYXRlKTtcblx0dGhpcy5zZWxlY3Qoc3BlYyk7XG5cdHRoaXMuX3NldHVwSGFuZGxlcnMoKTtcblxuXHQvKiByZWdpc3RlciB0aGUgYW5pbWF0aW9uIGxpc3RlbmVyLCBhbmltYXRpb25zIGNhbiB0cmlnZ2VyIGFkZC9yZW1vdmUgaGFuZGxlcnMgc28gdGhlaXIgaGFuZGxlciBtdXN0IGJlIGhhbmRsZWQgc2VwYXJhdGVseSAqL1xuXHR0aGlzLl9lbGVtZW50Lm9uKCd0cmFuc2l0aW9uZW5kJywgdGhpcy5faGFuZGxlVHJhbnNpdGlvbkVuZC5iaW5kKHRoaXMpKTtcbn1cblxuLyoqXG4gKiBAaW5oZXJpdGFuY2Uge0ZhY2V0fVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGYWNldC5wcm90b3R5cGUpO1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZhY2V0SG9yaXpvbnRhbDtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZmFjZXQncyBrZXkuXG4gKlxuICogQHByb3BlcnR5IGtleVxuICogQHR5cGUge3N0cmluZ31cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZSwgJ2tleScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2tleTtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIHZhbHVlIG9mIHRoaXMgZmFjZXQuXG4gKlxuICogQHByb3BlcnR5IHZhbHVlXG4gKiBAdHlwZSB7Kn1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZSwgJ3ZhbHVlJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fa2V5OyAvLyBhcyBvZiByaWdodCBub3cgdGhlcmUgY2FuIG9ubHkgYmUgb25lIGZhY2V0IHBlciBncm91cCwgc28gdGhlIGtleSBhbmQgdGhlIHZhbHVlIGFyZSB0aGUgc2FtZVxuXHR9XG59KTtcblxuLyoqXG4gKiBEZWZpbmVzIGlmIHRoaXMgZmFjZXQgaGFzIGJlZW4gdmlzdWFsbHkgY29tcHJlc3NlZCB0byBpdHMgc21hbGxlc3QgcG9zc2libGUgc3RhdGUuXG4gKiBOb3RlOiBBYmJyZXZpYXRlZCBmYWNldHMgY2Fubm90IGJlIGludGVyYWN0ZWQgd2l0aC5cbiAqXG4gKiBAcHJvcGVydHkgYWJicmV2aWF0ZWRcbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZSwgJ2FiYnJldmlhdGVkJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZWxlbWVudC5oYXNDbGFzcyhBQkJSRVZJQVRFRF9DTEFTUyk7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSAhPT0gdGhpcy5hYmJyZXZpYXRlZCkge1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQuYWRkQ2xhc3MoQUJCUkVWSUFURURfQ0xBU1MpO1xuXHRcdFx0XHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fZWxlbWVudC5yZW1vdmVDbGFzcyhBQkJSRVZJQVRFRF9DTEFTUyk7XG5cdFx0XHRcdHRoaXMuX2FkZEhhbmRsZXJzKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBEZWZpbmVzIGlmIHRoaXMgZmFjZXQgaXMgdmlzaWJsZS5cbiAqXG4gKiBAcHJvcGVydHkgdmlzaWJsZVxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhvcml6b250YWwucHJvdG90eXBlLCAndmlzaWJsZScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuICF0aGlzLl9lbGVtZW50Lmhhc0NsYXNzKEhJRERFTl9DTEFTUyk7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSAhPT0gdGhpcy52aXNpYmxlKSB7XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0dGhpcy5fZWxlbWVudC5yZW1vdmVDbGFzcyhISURERU5fQ0xBU1MpO1xuXHRcdFx0XHR0aGlzLl9hZGRIYW5kbGVycygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fZWxlbWVudC5hZGRDbGFzcyhISURERU5fQ0xBU1MpO1xuXHRcdFx0XHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcmFuZ2UgY292ZXJlZCBieSB0aGlzIGZhY2V0J3MgZmlsdGVyLlxuICpcbiAqIEBwcm9wZXJ0eSBmaWx0ZXJSYW5nZVxuICogQHR5cGUge09iamVjdH1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZSwgJ2ZpbHRlclJhbmdlJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgYmFyUmFuZ2UgPSB0aGlzLl9oaXN0b2dyYW1GaWx0ZXIuYmFyUmFuZ2U7XG5cdFx0dmFyIHBpeGVsUmFuZ2UgPSB0aGlzLl9oaXN0b2dyYW1GaWx0ZXIucGl4ZWxSYW5nZTtcblx0XHR2YXIgZnJvbUluZm8gPSB0aGlzLl9oaXN0b2dyYW0uYmFyc1tiYXJSYW5nZS5mcm9tXS5pbmZvO1xuXHRcdHZhciB0b0luZm8gPSB0aGlzLl9oaXN0b2dyYW0uYmFyc1tiYXJSYW5nZS50b10uaW5mbztcblxuXHRcdHJldHVybiB7XG5cdFx0XHRmcm9tOiB7XG5cdFx0XHRcdGluZGV4OiBiYXJSYW5nZS5mcm9tLFxuXHRcdFx0XHRwaXhlbDogcGl4ZWxSYW5nZS5mcm9tLFxuXHRcdFx0XHRsYWJlbDogZnJvbUluZm8ubGFiZWwsXG5cdFx0XHRcdGNvdW50OiBmcm9tSW5mby5jb3VudCxcblx0XHRcdFx0bWV0YWRhdGE6IGZyb21JbmZvLm1ldGFkYXRhXG5cdFx0XHR9LFxuXHRcdFx0dG86IHtcblx0XHRcdFx0aW5kZXg6IGJhclJhbmdlLnRvLFxuXHRcdFx0XHRwaXhlbDogcGl4ZWxSYW5nZS50byxcblx0XHRcdFx0bGFiZWw6IHRvSW5mby5sYWJlbCxcblx0XHRcdFx0Y291bnQ6IHRvSW5mby5jb3VudCxcblx0XHRcdFx0bWV0YWRhdGE6IHRvSW5mby5tZXRhZGF0YVxuXHRcdFx0fVxuXHRcdH07XG5cdH1cbn0pO1xuXG4vKipcbiAqIE1hcmtzIHRoaXMgZmFjZXQgYXMgc2VsZWN0ZWQgYW5kIHVwZGF0ZXMgdGhlIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIHNlbGVjdFxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBEYXRhIHVzZWQgdG8gc2VsZWN0IGEgcmFuZ2UgYW5kIHN1Yi1iYXIgY291bnRzIGluIHRoaXMgZmFjZXQuXG4gKi9cbkZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24oZGF0YSkge1xuXHRpZiAoZGF0YSAmJiAnc2VsZWN0aW9uJyBpbiBkYXRhKSB7XG5cdFx0dmFyIHNlbGVjdGlvbkRhdGEgPSBkYXRhLnNlbGVjdGlvbjtcblxuXHRcdGlmICgncmFuZ2UnIGluIHNlbGVjdGlvbkRhdGEpIHtcblx0XHRcdHZhciBmcm9tID0gc2VsZWN0aW9uRGF0YS5yYW5nZS5mcm9tO1xuXHRcdFx0dmFyIHRvID0gc2VsZWN0aW9uRGF0YS5yYW5nZS50bztcblxuXHRcdFx0dmFyIGZyb21Jc1N0cmluZyA9ICh0eXBlb2YgZnJvbSA9PT0gJ3N0cmluZycgfHwgKHR5cGVvZiBmcm9tID09PSAnb2JqZWN0JyAmJiBmcm9tLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpKTtcblx0XHRcdHZhciB0b0lzU3RyaW5nID0gKHR5cGVvZiB0byA9PT0gJ3N0cmluZycgfHwgKHR5cGVvZiB0byA9PT0gJ29iamVjdCcgJiYgdG8uY29uc3RydWN0b3IgPT09IFN0cmluZykpO1xuXG5cdFx0XHR2YXIgYmFycyA9IHRoaXMuX2hpc3RvZ3JhbS5iYXJzO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIG4gPSBiYXJzLmxlbmd0aDsgaSA8IG4gJiYgKGZyb21Jc1N0cmluZyB8fCB0b0lzU3RyaW5nKTsgKytpKSB7XG5cdFx0XHRcdHZhciBiYXJNZXRhZGF0YSA9IGJhcnNbaV0ubWV0YWRhdGE7XG5cblx0XHRcdFx0Zm9yICh2YXIgaWkgPSAwLCBubiA9IGJhck1ldGFkYXRhLmxlbmd0aDsgaWkgPCBubjsgKytpaSkge1xuXHRcdFx0XHRcdHZhciBzbGljZSA9IGJhck1ldGFkYXRhW2lpXTtcblxuXHRcdFx0XHRcdGlmIChmcm9tSXNTdHJpbmcgJiYgc2xpY2UubGFiZWwgPT09IGZyb20pIHtcblx0XHRcdFx0XHRcdGZyb20gPSBpO1xuXHRcdFx0XHRcdFx0ZnJvbUlzU3RyaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHRvSXNTdHJpbmcgJiYgc2xpY2UubGFiZWwgPT09IHRvKSB7XG5cdFx0XHRcdFx0XHR0byA9IGk7XG5cdFx0XHRcdFx0XHR0b0lzU3RyaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICghZnJvbUlzU3RyaW5nICYmICF0b0lzU3RyaW5nKSB7XG5cdFx0XHRcdHRoaXMuX2hpc3RvZ3JhbUZpbHRlci5zZXRGaWx0ZXJCYXJSYW5nZSh7ZnJvbTogZnJvbSwgdG86IHRvfSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX2hpc3RvZ3JhbUZpbHRlci5zZXRGaWx0ZXJQaXhlbFJhbmdlKHsgZnJvbTogMCwgdG86IHRoaXMuX2hpc3RvZ3JhbS50b3RhbFdpZHRoIH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuX2hpc3RvZ3JhbS5kZXNlbGVjdCgpO1xuXHRcdGlmICgnc2xpY2VzJyBpbiBzZWxlY3Rpb25EYXRhKSB7XG5cdFx0XHR0aGlzLl9oaXN0b2dyYW0uc2VsZWN0KHNlbGVjdGlvbkRhdGEuc2xpY2VzKTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogTWFya3MgdGhpcyBmYWNldCBhcyBub3Qgc2VsZWN0ZWQgYW5kIHVwZGF0ZXMgdGhlIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIGRlc2VsZWN0XG4gKi9cbkZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUuZGVzZWxlY3QgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5faGlzdG9ncmFtRmlsdGVyLnNldEZpbHRlclBpeGVsUmFuZ2UoeyBmcm9tOiAwLCB0bzogdGhpcy5faGlzdG9ncmFtLnRvdGFsV2lkdGggfSk7XG5cdHRoaXMuX2hpc3RvZ3JhbS5kZXNlbGVjdCgpO1xufTtcblxuLyoqXG4gKiBQcm9jZXNzZXMgdGhlIGRhdGEgaW4gdGhlIHByb3ZpZGVkIHNwZWMgYW5kIGJ1aWxkcyBhIG5ldyBzcGVjIHdpdGggZGV0YWlsZWQgaW5mb3JtYXRpb24uXG4gKlxuICogQG1ldGhvZCBwcm9jZXNzU3BlY1xuICogQHBhcmFtIHtPYmplY3R9IGluRGF0YSAtIFRoZSBvcmlnaW5hbCBzcGVjIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLnByb2Nlc3NTcGVjID0gZnVuY3Rpb24oaW5EYXRhKSB7XG5cdHZhciBvdXREYXRhID0ge307XG5cblx0b3V0RGF0YS5oaXN0b2dyYW0gPSB0aGlzLnByb2Nlc3NIaXN0b2dyYW0oaW5EYXRhLmhpc3RvZ3JhbSk7XG5cdG91dERhdGEubGVmdFJhbmdlTGFiZWwgPSBvdXREYXRhLmhpc3RvZ3JhbS5zbGljZXNbMF0ubGFiZWw7XG5cdG91dERhdGEucmlnaHRSYW5nZUxhYmVsID0gb3V0RGF0YS5oaXN0b2dyYW0uc2xpY2VzW291dERhdGEuaGlzdG9ncmFtLnNsaWNlcy5sZW5ndGggLSAxXS5sYWJlbDtcblxuXHRyZXR1cm4gb3V0RGF0YTtcbn07XG5cbi8qKlxuICogUHJvY2Vzc2VzIHRoZSBoaXN0b2dyYW0gZGF0YSBhbmQgYWRkcyBleHRyYSBpbmZvcm1hdGlvbiB0byBpdC5cbiAqIE1ha2VzIHN1cmUgdGhhdCBhbGwgc2xpY2VzIGZvciB0aGUgaGlzdG9ncmFtIGFyZSBwcmVzZW50IGFuZCBhZGRzIDAtY291bnQgc2xpY2VzIGZvciBhbnkgbWlzc2luZyBvbmVzLlxuICpcbiAqIEBtZXRob2QgcHJvY2Vzc0hpc3RvZ3JhbVxuICogQHBhcmFtIHtPYmplY3R9IGluRGF0YSAtIFRoZSBkYXRhIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLnByb2Nlc3NIaXN0b2dyYW0gPSBmdW5jdGlvbihpbkRhdGEpIHtcblx0dmFyIG91dERhdGEgPSB7XG5cdFx0c2xpY2VzOiBbXVxuXHR9O1xuXG5cdHZhciBpblNsaWNlcyA9IGluRGF0YS5zbGljZXM7XG5cdHZhciBvdXRTbGljZXMgPSBvdXREYXRhLnNsaWNlcztcblx0dmFyIHlNYXggPSAwO1xuXG5cdHZhciBpbmRleCA9IDA7XG5cdGZvciAodmFyIGkgPSAwLCBuID0gaW5TbGljZXMubGVuZ3RoOyBpIDwgbjsgKytpLCArK2luZGV4KSB7XG5cdFx0dmFyIHNsaWNlID0gaW5TbGljZXNbaV07XG5cdFx0d2hpbGUgKHNsaWNlLmluZGV4ID4gaW5kZXgpIHtcblx0XHRcdG91dFNsaWNlcy5wdXNoKHtcblx0XHRcdFx0bGFiZWw6ICdVbmtub3duJyxcblx0XHRcdFx0Y291bnQ6IDBcblx0XHRcdH0pO1xuXHRcdFx0KytpbmRleDtcblx0XHR9XG5cblx0XHRvdXRTbGljZXMucHVzaChzbGljZSk7XG5cdFx0eU1heCA9IE1hdGgubWF4KHlNYXgsIHNsaWNlLmNvdW50KTtcblx0fVxuXG5cdG91dERhdGEueU1heCA9IHlNYXg7XG5cblx0cmV0dXJuIG91dERhdGE7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhpcyBmYWNldCdzIHNwZWMgd2l0aCB0aGUgcGFzc2VkIGRhdGEgYW5kIHRoZW4gdXBkYXRlcyB0aGUgZmFjZXQncyB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVTcGVjXG4gKiBAcGFyYW0ge09iamVjdH0gc3BlYyAtIFRoZSBuZXcgc3BlYyBmb3IgdGhlIGZhY2V0XG4gKi9cbkZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUudXBkYXRlU3BlYyA9IGZ1bmN0aW9uIChzcGVjKSB7XG5cdHRoaXMuX3JlbW92ZUhhbmRsZXJzKCk7XG5cdHRoaXMuX2VsZW1lbnQucmVtb3ZlKCk7XG5cdHRoaXMuX3NwZWMuaGlzdG9ncmFtLnB1c2guYXBwbHkodGhpcy5fc3BlYy5oaXN0b2dyYW0sIHNwZWMuaGlzdG9ncmFtKTtcblx0dGhpcy5fc3BlYyA9IHRoaXMucHJvY2Vzc1NwZWModGhpcy5fc3BlYyk7XG5cdHRoaXMuX2luaXRpYWxpemVMYXlvdXQoVGVtcGxhdGUpO1xuXHR0aGlzLnNlbGVjdChzcGVjKTtcblx0dGhpcy5fYWRkSGFuZGxlcnMoKTtcbn07XG5cbi8qKlxuICogVW5iaW5kcyB0aGlzIGluc3RhbmNlIGZyb20gYW55IHJlZmVyZW5jZSB0aGF0IGl0IG1pZ2h0IGhhdmUgd2l0aCBldmVudCBoYW5kbGVycyBhbmQgRE9NIGVsZW1lbnRzLlxuICpcbiAqIEBtZXRob2QgZGVzdHJveVxuICogQHBhcmFtIHtib29sZWFuPX0gYW5pbWF0ZWQgLSBTaG91bGQgdGhlIGZhY2V0IGJlIHJlbW92ZWQgaW4gYW4gYW5pbWF0ZWQgd2F5IGJlZm9yZSBpdCBiZWluZyBkZXN0cm95ZWQuXG4gKi9cbkZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKGFuaW1hdGVkKSB7XG5cdGlmIChhbmltYXRlZCkge1xuXHRcdHZhciBfZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5vZmYoJ2ZhY2V0LWhpc3RvZ3JhbTphbmltYXRpb246dmlzaWJsZS1vZmYnLCBfZGVzdHJveSk7XG5cdFx0XHR0aGlzLl9kZXN0cm95KCk7XG5cdFx0fS5iaW5kKHRoaXMpO1xuXHRcdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX2Rlc3Ryb3koKTtcblx0fVxufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBtZXRob2QgdG8gZGVzdHJveSB0aGlzIGZhY2V0LlxuICpcbiAqIEBtZXRob2QgX2Rlc3Ryb3lcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUuX2Rlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0dGhpcy5fZWxlbWVudC5vZmYoJ3RyYW5zaXRpb25lbmQnKTtcblx0dGhpcy5fZWxlbWVudC5yZW1vdmUoKTtcblx0RmFjZXQucHJvdG90eXBlLmRlc3Ryb3kuY2FsbCh0aGlzKTtcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgYWxsIHRoZSBsYXlvdXQgZWxlbWVudHMgYmFzZWQgb24gdGhlIGB0ZW1wbGF0ZWAgcHJvdmlkZWQuXG4gKlxuICogQG1ldGhvZCBfaW5pdGlhbGl6ZUxheW91dFxuICogQHBhcmFtIHtmdW5jdGlvbn0gdGVtcGxhdGUgLSBUaGUgdGVtcGxhdGluZyBmdW5jdGlvbiB1c2VkIHRvIGNyZWF0ZSB0aGUgbGF5b3V0LlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZS5faW5pdGlhbGl6ZUxheW91dCA9IGZ1bmN0aW9uKHRlbXBsYXRlKSB7XG5cdHRoaXMuX2VsZW1lbnQgPSAkKHRlbXBsYXRlKHRoaXMuX3NwZWMpKTtcblx0dGhpcy5fY29udGFpbmVyLmFwcGVuZCh0aGlzLl9lbGVtZW50KTtcblx0dGhpcy5fc3ZnID0gdGhpcy5fZWxlbWVudC5maW5kKCdzdmcnKTtcblxuXHR0aGlzLl9oaXN0b2dyYW0gPSBuZXcgSGlzdG9ncmFtKHRoaXMuX3N2ZywgdGhpcy5fc3BlYy5oaXN0b2dyYW0pO1xuXHR0aGlzLl9oaXN0b2dyYW1GaWx0ZXIgPSBuZXcgSGlzdG9ncmFtRmlsdGVyKHRoaXMuX2VsZW1lbnQsIHRoaXMuX2hpc3RvZ3JhbSk7XG5cdHRoaXMuX2hpc3RvZ3JhbUZpbHRlci5zZXRGaWx0ZXJQaXhlbFJhbmdlKHsgZnJvbTogMCwgdG86IHRoaXMuX2hpc3RvZ3JhbS50b3RhbFdpZHRoIH0pO1xuXG5cdHRoaXMuX3JhbmdlQ29udHJvbHMgPSB0aGlzLl9lbGVtZW50LmZpbmQoJy5mYWNldC1yYW5nZS1jb250cm9scycpO1xuXG5cdC8qIG1ha2Ugc3VyZSBhbGwgc3R5bGVzIGhhdmUgYmVlbiBhcHBsaWVkICovXG5cdHZhciBpLCBuLCBvZmY7XG5cdGZvciAoaSA9IDAsIG4gPSB0aGlzLl9lbGVtZW50Lmxlbmd0aDsgaSA8IG47ICsraSkge1xuXHRcdG9mZiA9IHRoaXMuX2VsZW1lbnRbaV0ub2Zmc2V0SGVpZ2h0OyAvLyB0cmlnZ2VyIHN0eWxlIHJlY2FsY3VsYXRpb24uXG5cdH1cblxuXHR2YXIgY2hpbGRyZW4gPSB0aGlzLl9lbGVtZW50LmZpbmQoJyonKTtcblx0Zm9yIChpID0gMCwgbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IG47ICsraSkge1xuXHRcdG9mZiA9IGNoaWxkcmVuW2ldLm9mZnNldEhlaWdodDsgLy8gdHJpZ2dlciBzdHlsZSByZWNhbGN1bGF0aW9uLlxuXHR9XG59O1xuXG4vKipcbiAqIEFkZHMgdGhlIHJlcXVpcmVkIGV2ZW50IGhhbmRsZXJzIG5lZWRlZCB0byB0cmlnZ2VyIHRoaXMgZmFjZXQncyBvd24gZXZlbnRzLlxuICpcbiAqIEBtZXRob2QgX2FkZEhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLl9hZGRIYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy52aXNpYmxlKSB7XG5cdFx0dmFyIGJhcnMgPSB0aGlzLl9oaXN0b2dyYW0uYmFycztcblx0XHRmb3IgKHZhciBpID0gMCwgbiA9IGJhcnMubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0XHRiYXJzW2ldLl9hZGRIYW5kbGVycygpO1xuXHRcdFx0YmFyc1tpXS5vbk1vdXNlRW50ZXIgPSB0aGlzLl9vbk1vdXNlRXZlbnRCYXIuYmluZCh0aGlzLCAnZmFjZXQtaGlzdG9ncmFtOm1vdXNlZW50ZXInKTtcblx0XHRcdGJhcnNbaV0ub25Nb3VzZUxlYXZlID0gdGhpcy5fb25Nb3VzZUV2ZW50QmFyLmJpbmQodGhpcywgJ2ZhY2V0LWhpc3RvZ3JhbTptb3VzZWxlYXZlJyk7XG5cdFx0XHRiYXJzW2ldLm9uQ2xpY2sgPSB0aGlzLl9vbk1vdXNlRXZlbnRCYXIuYmluZCh0aGlzLCAnZmFjZXQtaGlzdG9ncmFtOmNsaWNrJyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5faGlzdG9ncmFtRmlsdGVyLm9uRmlsdGVyQ2hhbmdlZCA9IHRoaXMuX29uRmlsdGVyQ2hhbmdlZC5iaW5kKHRoaXMpO1xuXHR9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYW55IGFkZGVkIGV2ZW50IGhhbmRsZXJzLCB2aXJ0dWFsbHkgXCJtdXRpbmdcIiB0aGlzIGZhY2V0XG4gKlxuICogQG1ldGhvZCBfcmVtb3ZlSGFuZGxlcnNcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUuX3JlbW92ZUhhbmRsZXJzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBiYXJzID0gdGhpcy5faGlzdG9ncmFtLmJhcnM7XG5cdGZvciAodmFyIGkgPSAwLCBuID0gYmFycy5sZW5ndGg7IGkgPCBuOyArK2kpIHtcblx0XHRiYXJzW2ldLl9yZW1vdmVIYW5kbGVycygpO1xuXHRcdGJhcnNbaV0ub25Nb3VzZUVudGVyID0gbnVsbDtcblx0XHRiYXJzW2ldLm9uTW91c2VMZWF2ZSA9IG51bGw7XG5cdFx0YmFyc1tpXS5vbkNsaWNrID0gbnVsbDtcblx0fVxuXG5cdHRoaXMuX2hpc3RvZ3JhbUZpbHRlci5vbkZpbHRlckNoYW5nZWQgPSBudWxsO1xufTtcblxuLyoqXG4gKiBGb3J3YXJkcyBhIGJhciBtb3VzZSBldmVudCB1c2luZyB0aGUgZ2l2ZW4gdHlwZS5cbiAqXG4gKiBAbWV0aG9kIF9vbk1vdXNlRXZlbnRCYXJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVGhlIHR5cGUgb2YgdGhlIGV2ZW50IHRvIGZvcndhcmQuXG4gKiBAcGFyYW0ge0ZhY2V0SGlzdG9ncmFtQmFyfSBiYXIgLSBUaGUgYmFyIHdoaWNoIHRyaWdnZXJlZCB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIFRoZSBvcmlnaW5hbCBldmVudCB0cmlnZ2VyZWQuXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLl9vbk1vdXNlRXZlbnRCYXIgPSBmdW5jdGlvbiAodHlwZSwgYmFyLCBldmVudCkge1xuXHR0aGlzLmVtaXQodHlwZSwgZXZlbnQsIHRoaXMuX2tleSwgYmFyLmluZm8pO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHRoZSBldmVudCB3aGVuIHRoZSBmaWx0ZXIgcmFuZ2UgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbmV3QmFyUmFuZ2UgLSBBIHJhbmdlIG9iamVjdCBjb250YWluaW5nIHRoZSBuZXcgYmFyIChzbGljZS9idWNrZXQpIHJhbmdlLlxuICogQHBhcmFtIHtib29sZWFuPX0gZnJvbVVzZXJJbnB1dCAtIERlZmluZXMgaWYgdGhlIGZpbHRlciByYW5nZSBjaGFuZ2Ugd2FzIHRyaWdnZXJlZCBieSBhIHVzZXIgaW5wdXQgaW50ZXJhY3Rpb24uXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLl9vbkZpbHRlckNoYW5nZWQgPSBmdW5jdGlvbiAobmV3QmFyUmFuZ2UsIGZyb21Vc2VySW5wdXQpIHtcblx0dmFyIGV2ZW50ID0gJ2ZhY2V0LWhpc3RvZ3JhbTpyYW5nZWNoYW5nZWQnICsgKGZyb21Vc2VySW5wdXQgPyAndXNlcicgOiAnJyk7XG5cdHRoaXMuZW1pdChldmVudCwgbnVsbCwgdGhpcy5fa2V5LCB0aGlzLmZpbHRlclJhbmdlKTtcbn07XG5cbi8qKlxuICogVHJhbnNpdGlvbiBlbmQgZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldnQgLSBFdmVudCB0byBoYW5kbGUuXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLl9oYW5kbGVUcmFuc2l0aW9uRW5kID0gZnVuY3Rpb24oZXZ0KSB7XG5cdHZhciBwcm9wZXJ0eSA9IGV2dC5vcmlnaW5hbEV2ZW50LnByb3BlcnR5TmFtZTtcblx0aWYgKGV2dC50YXJnZXQgPT09IHRoaXMuX2VsZW1lbnQuZ2V0KDApICYmIHByb3BlcnR5ID09PSAnb3BhY2l0eScpIHtcblx0XHRpZiAodGhpcy52aXNpYmxlKSB7XG5cdFx0XHR0aGlzLmVtaXQoJ2ZhY2V0LWhpc3RvZ3JhbTphbmltYXRpb246dmlzaWJsZS1vbicsIGV2dCwgdGhpcy5fa2V5KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5lbWl0KCdmYWNldC1oaXN0b2dyYW06YW5pbWF0aW9uOnZpc2libGUtb2ZmJywgZXZ0LCB0aGlzLl9rZXkpO1xuXHRcdH1cblx0fSBlbHNlIGlmIChldnQudGFyZ2V0ID09PSB0aGlzLl9yYW5nZUNvbnRyb2xzLmdldCgwKSAmJiBwcm9wZXJ0eSA9PT0gJ29wYWNpdHknKSB7XG5cdFx0aWYgKHRoaXMuYWJicmV2aWF0ZWQpIHtcblx0XHRcdHRoaXMuZW1pdCgnZmFjZXQtaGlzdG9ncmFtOmFuaW1hdGlvbjphYmJyZXZpYXRlZC1vbicsIGV2dCwgdGhpcy5fa2V5KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5lbWl0KCdmYWNldC1oaXN0b2dyYW06YW5pbWF0aW9uOmFiYnJldmlhdGVkLW9mZicsIGV2dCwgdGhpcy5fa2V5KTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogQGV4cG9ydFxuICogQHR5cGUge0ZhY2V0SG9yaXpvbnRhbH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBGYWNldEhvcml6b250YWw7XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG5cbnZhciBfID0gcmVxdWlyZSgnLi4vLi4vdXRpbC91dGlsJyk7XG52YXIgRmFjZXQgPSByZXF1aXJlKCcuL2ZhY2V0Jyk7XG5cbnZhciBmYWNldFZlcnRpY2FsX2ljb24gPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvZmFjZXRWZXJ0aWNhbF9pY29uJyk7XG52YXIgZmFjZXRWZXJ0aWNhbF9saW5rcyA9IHJlcXVpcmUoJy4uLy4uL3RlbXBsYXRlcy9mYWNldFZlcnRpY2FsX2xpbmtzJyk7XG52YXIgZmFjZXRWZXJ0aWNhbF9zZWFyY2ggPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvZmFjZXRWZXJ0aWNhbF9zZWFyY2gnKTtcbnZhciBIYW5kbGViYXJzID0gcmVxdWlyZSgnaGFuZGxlYmFycycpO1xudmFyIFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vLi4vdGVtcGxhdGVzL2ZhY2V0VmVydGljYWwnKTtcblxudmFyIEhJR0hMSUdIVF9DTEFTUyA9ICdmYWNldC1pY29uLWhpZ2hsaWdodGVkJztcbnZhciBBQkJSRVZJQVRFRF9DTEFTUyA9ICdmYWNldHMtZmFjZXQtdmVydGljYWwtYWJicmV2aWF0ZWQnO1xudmFyIEhJRERFTl9DTEFTUyA9ICdmYWNldHMtZmFjZXQtdmVydGljYWwtaGlkZGVuJztcblxuLyoqXG4gKiBWZXJ0aWNhbCBmYWNldCBjbGFzcywgc3RhbmRhcmQgZmFjZXQgY2xhc3MuXG4gKlxuICogQGNsYXNzIEZhY2V0VmVydGljYWxcbiAqIEBwYXJhbSB7anF1ZXJ5fSBjb250YWluZXIgLSBUaGUgY29udGFpbmVyIGVsZW1lbnQgZm9yIHRoaXMgZmFjZXQuXG4gKiBAcGFyYW0ge0dyb3VwfSBwYXJlbnRHcm91cCAtIFRoZSBncm91cCB0aGlzIGZhY2V0IGJlbG9uZ3MgdG8uXG4gKiBAcGFyYW0ge09iamVjdH0gc3BlYyAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoaXMgZmFjZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRmFjZXRWZXJ0aWNhbCAoY29udGFpbmVyLCBwYXJlbnRHcm91cCwgc3BlYykge1xuXHRGYWNldC5jYWxsKHRoaXMsIGNvbnRhaW5lciwgcGFyZW50R3JvdXAsIHNwZWMpO1xuXG5cdHRoaXMuX3ZhbHVlID0gc3BlYy52YWx1ZTtcblx0dGhpcy5fa2V5ID0gc3BlYy5rZXk7XG5cdHRoaXMuX2NvdW50ID0gc3BlYy5jb3VudDtcblx0dGhpcy5fdHlwZSA9IHRoaXMuX3NwZWMuaXNRdWVyeSA/ICdxdWVyeScgOiAnZmFjZXQnO1xuXHR0aGlzLl9oYXNFbWl0dGVkU2VsZWN0ZWRFdmVudCA9IGZhbHNlO1xuXG5cdGlmICh0aGlzLl9zcGVjLmlzUXVlcnkgJiYgdGhpcy5fa2V5ICE9PSAnKicpIHtcblx0XHR0aGlzLl9zcGVjLmRpc3BsYXlWYWx1ZSA9IHRoaXMuX2tleSArICc6JyArICh0aGlzLl9zcGVjLmxhYmVsID8gdGhpcy5fc3BlYy5sYWJlbCA6IHRoaXMuX3NwZWMudmFsdWUpO1xuXHR9XG5cblx0LyogcmVnaXN0ZXIgdGhlIHBhcnRpYWxzIHRvIGJ1aWxkIHRoZSB0ZW1wbGF0ZSAqL1xuXHRIYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCgnZmFjZXRWZXJ0aWNhbF9pY29uJywgZmFjZXRWZXJ0aWNhbF9pY29uKTtcblx0SGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwoJ2ZhY2V0VmVydGljYWxfbGlua3MnLCBmYWNldFZlcnRpY2FsX2xpbmtzKTtcblx0SGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwoJ2ZhY2V0VmVydGljYWxfc2VhcmNoJywgZmFjZXRWZXJ0aWNhbF9zZWFyY2gpO1xuXG5cdHRoaXMuX2luaXRpYWxpemVMYXlvdXQoVGVtcGxhdGUpO1xuXHRpZiAoJ3NlbGVjdGVkJyBpbiB0aGlzLl9zcGVjKSB7XG5cdFx0dGhpcy5zZWxlY3QodGhpcy5fc3BlYy5zZWxlY3RlZCk7XG5cdFx0ZGVsZXRlIHRoaXMuX3NwZWMuc2VsZWN0ZWQ7XG5cdH1cblx0dGhpcy5fc2V0dXBIYW5kbGVycygpO1xuXG5cdC8qIHJlZ2lzdGVyIHRoZSBhbmltYXRpb24gbGlzdGVuZXIsIGFuaW1hdGlvbnMgY2FuIHRyaWdnZXIgYWRkL3JlbW92ZSBoYW5kbGVycyBzbyB0aGVpciBoYW5kbGVyIG11c3QgYmUgaGFuZGxlZCBzZXBhcmF0ZWx5ICovXG5cdHRoaXMuX2VsZW1lbnQub24oJ3RyYW5zaXRpb25lbmQnLCB0aGlzLl9oYW5kbGVUcmFuc2l0aW9uRW5kLmJpbmQodGhpcykpO1xufVxuXG4vKipcbiAqIEBpbmhlcml0YW5jZSB7RmFjZXR9XG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGYWNldC5wcm90b3R5cGUpO1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGYWNldFZlcnRpY2FsO1xuXG4vKipcbiAqIFRoaXMgZmFjZXQncyBrZXkuXG4gKlxuICogQHByb3BlcnR5IGtleVxuICogQHR5cGUge3N0cmluZ31cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUsICdrZXknLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9rZXk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSB2YWx1ZSBvZiB0aGlzIGZhY2V0LlxuICpcbiAqIEBwcm9wZXJ0eSB2YWx1ZVxuICogQHR5cGUgeyp9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0VmVydGljYWwucHJvdG90eXBlLCAndmFsdWUnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl92YWx1ZTtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIGNvbmZpZ3VyZWQgaWNvbiBmb3IgdGhpcyBmYWNldC5cbiAqXG4gKiBAcHJvcGVydHkgaWNvblxuICogQHR5cGUge09iamVjdH1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUsICdpY29uJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fc3BlYy5pY29uO1xuXHR9XG59KTtcblxuLyoqXG4gKiBUaGUgdG90YWwgbnVtYmVyIG9mIG1hdGNoZXMgZm9yIHRoaXMgZmFjZXQuXG4gKlxuICogQHByb3BlcnR5IHRvdGFsXG4gKiBAdHlwZSB7bnVtYmVyfVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUsICd0b3RhbCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NwZWMudG90YWw7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHR0aGlzLl9zcGVjLnRvdGFsID0gdmFsdWU7XG5cdFx0dGhpcy5fdXBkYXRlKCk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSBjb3VudCBvZiBtYXRjaGVzIGZvciB0aGlzIGZhY2V0LlxuICpcbiAqIEBwcm9wZXJ0eSBjb3VudFxuICogQHR5cGUge251bWJlcn1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUsICdjb3VudCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NwZWMuY291bnQ7XG5cdH1cbn0pO1xuXG4vKipcbiAqIERlZmluZXMgaWYgdGhpcyBmYWNldCBoYXMgYmVlbiBoaWdobGlnaHRlZC5cbiAqXG4gKiBAcHJvcGVydHkgaGlnaGxpZ2h0ZWRcbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUsICdoaWdobGlnaHRlZCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2ljb25Db250YWluZXIuaGFzQ2xhc3MoSElHSExJR0hUX0NMQVNTKTtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5faWNvbkNvbnRhaW5lci5hZGRDbGFzcyhISUdITElHSFRfQ0xBU1MpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9pY29uQ29udGFpbmVyLnJlbW92ZUNsYXNzKEhJR0hMSUdIVF9DTEFTUyk7XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBEZWZpbmVzIGlmIHRoaXMgZmFjZXQgaGFzIGJlZW4gdmlzdWFsbHkgY29tcHJlc3NlZCB0byBpdHMgc21hbGxlc3QgcG9zc2libGUgc3RhdGUuXG4gKiBOb3RlOiBBYmJyZXZpYXRlZCBmYWNldHMgY2Fubm90IGJlIGludGVyYWN0ZWQgd2l0aC5cbiAqXG4gKiBAcHJvcGVydHkgYWJicmV2aWF0ZWRcbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUsICdhYmJyZXZpYXRlZCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2VsZW1lbnQuaGFzQ2xhc3MoQUJCUkVWSUFURURfQ0xBU1MpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IHRoaXMuYWJicmV2aWF0ZWQpIHtcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50LmFkZENsYXNzKEFCQlJFVklBVEVEX0NMQVNTKTtcblx0XHRcdFx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2xhc3MoQUJCUkVWSUFURURfQ0xBU1MpO1xuXHRcdFx0XHR0aGlzLl9hZGRIYW5kbGVycygpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogRGVmaW5lcyBpZiB0aGlzIGZhY2V0IGlzIHZpc2libGUuXG4gKlxuICogQHByb3BlcnR5IHZpc2libGVcbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUsICd2aXNpYmxlJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gIXRoaXMuX2VsZW1lbnQuaGFzQ2xhc3MoSElEREVOX0NMQVNTKTtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlICE9PSB0aGlzLnZpc2libGUpIHtcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50LnJlbW92ZUNsYXNzKEhJRERFTl9DTEFTUyk7XG5cdFx0XHRcdHRoaXMuX2FkZEhhbmRsZXJzKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50LmFkZENsYXNzKEhJRERFTl9DTEFTUyk7XG5cdFx0XHRcdHRoaXMuX3JlbW92ZUhhbmRsZXJzKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBNYXJrcyB0aGlzIGZhY2V0IGFzIHNlbGVjdGVkIGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBzZWxlY3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBzZWxlY3RlZENvdW50IC0gVGhlIGNvdW50IG9mIHNlbGVjdGVkIGVsZW1lbnRzIGZvciB0aGlzIGZhY2V0LlxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbihzZWxlY3RlZENvdW50KSB7XG5cdHRoaXMuX3NwZWMuc2VsZWN0ZWQgPSBzZWxlY3RlZENvdW50O1xuXHR0aGlzLl91cGRhdGUoKTtcbn07XG5cbi8qKlxuICogTWFya3MgdGhpcyBmYWNldCBhcyBub3Qgc2VsZWN0ZWQgYW5kIHVwZGF0ZXMgdGhlIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIGRlc2VsZWN0XG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLmRlc2VsZWN0ID0gZnVuY3Rpb24oKSB7XG5cdGRlbGV0ZSB0aGlzLl9zcGVjLnNlbGVjdGVkO1xuXHR0aGlzLl91cGRhdGUoKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGlzIGZhY2V0J3Mgc3BlYyB3aXRoIHRoZSBwYXNzZWQgZGF0YSBhbmQgdGhlbiB1cGRhdGVzIHRoZSBmYWNldCdzIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVNwZWNcbiAqIEBwYXJhbSB7T2JqZWN0fSBzcGVjIC0gVGhlIG5ldyBzcGVjIGZvciB0aGUgZmFjZXRcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUudXBkYXRlU3BlYyA9IGZ1bmN0aW9uIChzcGVjKSB7XG5cdHRoaXMuX3NwZWMgPSBfLmV4dGVuZCh0aGlzLl9zcGVjLCBzcGVjKTtcblx0aWYgKCdzZWxlY3RlZCcgaW4gdGhpcy5fc3BlYykge1xuXHRcdHRoaXMuc2VsZWN0KHRoaXMuX3NwZWMuc2VsZWN0ZWQpO1xuXHRcdGRlbGV0ZSB0aGlzLl9zcGVjLnNlbGVjdGVkO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3VwZGF0ZSgpO1xuXHR9XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGhpdCBjb3VudCBvZiB0aGlzIGZhY2V0IGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVDb3VudFxuICogQHBhcmFtIHtudW1iZXJ9IGNvdW50IC0gVGhlIG5ldyBoaXQgY291bnQgZm9yIHRoaXMgZmFjZXQuXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLnVwZGF0ZUNvdW50ID0gZnVuY3Rpb24oY291bnQpIHtcblx0dGhpcy5fc3BlYy5jb3VudCArPSBjb3VudDtcblx0dGhpcy5fdXBkYXRlKCk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGdyb3VwIHRvdGFsIGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUgKGVxdWl2YWxlbnQgdG8gdGhlIGB0b3RhbGAgcHJvcGVydHkpXG4gKlxuICogQG1ldGhvZCByZXNjYWxlXG4gKiBAcGFyYW0gZ3JvdXBUb3RhbFxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5yZXNjYWxlID0gZnVuY3Rpb24oZ3JvdXBUb3RhbCkge1xuXHR0aGlzLnRvdGFsID0gZ3JvdXBUb3RhbDtcbn07XG5cbi8qKlxuICogVW5iaW5kcyB0aGlzIGluc3RhbmNlIGZyb20gYW55IHJlZmVyZW5jZSB0aGF0IGl0IG1pZ2h0IGhhdmUgd2l0aCBldmVudCBoYW5kbGVycyBhbmQgRE9NIGVsZW1lbnRzLlxuICpcbiAqIEBtZXRob2QgZGVzdHJveVxuICogQHBhcmFtIHtib29sZWFuPX0gYW5pbWF0ZWQgLSBTaG91bGQgdGhlIGZhY2V0IGJlIHJlbW92ZWQgaW4gYW4gYW5pbWF0ZWQgd2F5IGJlZm9yZSBpdCBiZWluZyBkZXN0cm95ZWQuXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihhbmltYXRlZCkge1xuXHRpZiAoYW5pbWF0ZWQpIHtcblx0XHR2YXIgX2Rlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMub2ZmKHRoaXMuX3R5cGUgKyAnOmFuaW1hdGlvbjp2aXNpYmxlLW9mZicsIF9kZXN0cm95KTtcblx0XHRcdHRoaXMuX2Rlc3Ryb3koKTtcblx0XHR9LmJpbmQodGhpcyk7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fZGVzdHJveSgpO1xuXHR9XG5cdEZhY2V0LnByb3RvdHlwZS5kZXN0cm95LmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIG1ldGhvZCB0byBkZXN0cm95IHRoaXMgZmFjZXQuXG4gKlxuICogQG1ldGhvZCBfZGVzdHJveVxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX2Rlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0dGhpcy5fZWxlbWVudC5vZmYoJ3RyYW5zaXRpb25lbmQnKTtcblx0dGhpcy5fZWxlbWVudC5yZW1vdmUoKTtcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgYWxsIHRoZSBsYXlvdXQgZWxlbWVudHMgYmFzZWQgb24gdGhlIGB0ZW1wbGF0ZWAgcHJvdmlkZWQuXG4gKlxuICogQG1ldGhvZCBfaW5pdGlhbGl6ZUxheW91dFxuICogQHBhcmFtIHtmdW5jdGlvbn0gdGVtcGxhdGUgLSBUaGUgdGVtcGxhdGluZyBmdW5jdGlvbiB1c2VkIHRvIGNyZWF0ZSB0aGUgbGF5b3V0LlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX2luaXRpYWxpemVMYXlvdXQgPSBmdW5jdGlvbih0ZW1wbGF0ZSkge1xuXHR0aGlzLl9lbGVtZW50ID0gJCh0ZW1wbGF0ZSh0aGlzLl9zcGVjKSk7XG5cdHRoaXMuX2NvbnRhaW5lci5hcHBlbmQodGhpcy5fZWxlbWVudCk7XG5cblx0dGhpcy5fYmFyQ29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtYmFyLWNvbnRhaW5lcicpO1xuXHR2YXIgYmFycyA9IHRoaXMuX2JhckNvbnRhaW5lci5jaGlsZHJlbignLmZhY2V0LWJhci1iYXNlJyk7XG5cdHRoaXMuX2JhckJhY2tncm91bmQgPSAkKGJhcnNbMF0pO1xuXHR0aGlzLl9iYXJGb3JlZ3JvdW5kID0gJChiYXJzWzFdKTtcblxuXHR0aGlzLl9pY29uQ29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtaWNvbicpO1xuXHR0aGlzLl9pY29uID0gdGhpcy5faWNvbkNvbnRhaW5lci5jaGlsZHJlbignaScpO1xuXHR0aGlzLl9pY29uQ29sb3IgPSB0aGlzLl9zcGVjLmljb24gJiYgdGhpcy5fc3BlYy5pY29uLmNvbG9yID8gdGhpcy5fc3BlYy5pY29uLmNvbG9yIDogbnVsbDtcblxuXHR0aGlzLl9sYWJlbCA9IHRoaXMuX2VsZW1lbnQuZmluZCgnLmZhY2V0LWxhYmVsJyk7XG5cdHRoaXMuX2xhYmVsQ291bnQgPSB0aGlzLl9lbGVtZW50LmZpbmQoJy5mYWNldC1sYWJlbC1jb3VudCcpO1xuXG5cdHRoaXMuX2xpbmtzQ29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtbGlua3MnKTtcblx0dGhpcy5fc2VhcmNoQ29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtc2VhcmNoLWNvbnRhaW5lcicpO1xuXHRpZiAoIXRoaXMuX3NlYXJjaENvbnRhaW5lci5jaGlsZHJlbigpLmxlbmd0aCkge1xuXHRcdHRoaXMuX3NlYXJjaENvbnRhaW5lci5lbXB0eSgpO1xuXHR9XG5cblx0LyogbWFrZSBzdXJlIGFsbCBzdHlsZXMgaGF2ZSBiZWVuIGFwcGxpZWQgKi9cblx0dmFyIGksIG4sIG9mZjtcblx0Zm9yIChpID0gMCwgbiA9IHRoaXMuX2VsZW1lbnQubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0b2ZmID0gdGhpcy5fZWxlbWVudFtpXS5vZmZzZXRIZWlnaHQ7IC8vIHRyaWdnZXIgc3R5bGUgcmVjYWxjdWxhdGlvbi5cblx0fVxuXG5cdHZhciBjaGlsZHJlbiA9IHRoaXMuX2VsZW1lbnQuZmluZCgnKicpO1xuXHRmb3IgKGkgPSAwLCBuID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0b2ZmID0gY2hpbGRyZW5baV0ub2Zmc2V0SGVpZ2h0OyAvLyB0cmlnZ2VyIHN0eWxlIHJlY2FsY3VsYXRpb24uXG5cdH1cbn07XG5cbi8qKlxuICogQWRkcyB0aGUgbmVjZXNzYXJ5IGV2ZW50IGhhbmRsZXJzIGZvciB0aGlzIG9iamVjdCB0byBmdW5jdGlvbi5cbiAqXG4gKiBAbWV0aG9kIF9hZGRIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX2FkZEhhbmRsZXJzID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLnZpc2libGUpIHtcblx0XHR0aGlzLl9pY29uQ29udGFpbmVyLmhvdmVyKFxuXHRcdFx0dGhpcy5fb25Nb3VzZUVudGVyLmJpbmQodGhpcyksXG5cdFx0XHR0aGlzLl9vbk1vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHRcdCk7XG5cdFx0dGhpcy5fZWxlbWVudC5jbGljayh0aGlzLl9vbkNsaWNrLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuX2VsZW1lbnQuZmluZCgnLmZhY2V0LXNlYXJjaC1jb250YWluZXInKS5vbignY2xpY2suZmFjZXRTZWFyY2gnLCB0aGlzLl9vblNlYXJjaC5iaW5kKHRoaXMpKTtcblx0fVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFsbCB0aGUgZXZlbnQgaGFuZGxlcnMgYWRkZWQgYnkgdGhlIGBfYWRkSGFuZGxlcnNgIGZ1bmN0aW9uLlxuICpcbiAqIEBtZXRob2QgX3JlbW92ZUhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5fcmVtb3ZlSGFuZGxlcnMgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5faWNvbkNvbnRhaW5lci5vZmYoJ2hvdmVyJyk7XG5cdHRoaXMuX2VsZW1lbnQub2ZmKCdjbGljaycpO1xuXHR0aGlzLl9lbGVtZW50LmZpbmQoJy5mYWNldC1zZWFyY2gtY29udGFpbmVyJykub2ZmKCdjbGljay5mYWNldFNlYXJjaCcpO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUgb2YgdGhpcyBmYWNldC5cbiAqXG4gKiBAbWV0aG9kIF91cGRhdGVcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNwZWMgPSB0aGlzLl9zcGVjO1xuXG5cdC8qIGljb24gKi8gLy8gVE9ETzogT25seSB1cGRhdGUgaWYgdGhlIGN1cnJlbnQgaWNvbiBpcyBub3QgdGhlIHNhbWUgYXMgdGhlIGljb24gaW4gdGhlIHNwZWMuXG5cdHRoaXMuX2ljb25Db250YWluZXIuZW1wdHkoKTtcblx0dGhpcy5faWNvbkNvbnRhaW5lci5hcHBlbmQoJChmYWNldFZlcnRpY2FsX2ljb24odGhpcy5fc3BlYykpKTtcblx0dGhpcy5faWNvbiA9IHRoaXMuX2ljb25Db250YWluZXIuY2hpbGRyZW4oJ2knKTtcblx0dGhpcy5faWNvbkNvbG9yID0gdGhpcy5fc3BlYy5pY29uICYmIHRoaXMuX3NwZWMuaWNvbi5jb2xvciA/IHRoaXMuX3NwZWMuaWNvbi5jb2xvciA6IG51bGw7XG5cblx0LyogYmFyIGJhY2tncm91bmQgKi9cblx0dGhpcy5fYmFyQmFja2dyb3VuZC5jc3MoJ3dpZHRoJywgKChzcGVjLmNvdW50IC8gc3BlYy50b3RhbCkgKiAxMDApICsgJyUnKTtcblxuXHQvKiBiYXIgZm9yZWdyb3VuZCAqL1xuXHRpZiAoc3BlYy5zZWxlY3RlZCA+PSAwKSB7XG5cdFx0aWYgKCF0aGlzLl9iYXJGb3JlZ3JvdW5kLmhhc0NsYXNzKCdmYWNldC1iYXItc2VsZWN0ZWQnKSkge1xuXHRcdFx0dGhpcy5fYmFyRm9yZWdyb3VuZC5yZW1vdmVBdHRyKCdzdHlsZScpO1xuXHRcdFx0dGhpcy5fYmFyRm9yZWdyb3VuZC5hZGRDbGFzcygnZmFjZXQtYmFyLXNlbGVjdGVkJyk7XG5cdFx0fVxuXHRcdHRoaXMuX2JhckZvcmVncm91bmQuY3NzKCd3aWR0aCcsICgoc3BlYy5zZWxlY3RlZCAvIHNwZWMudG90YWwpICogMTAwKSArICclJyk7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKHRoaXMuX2JhckZvcmVncm91bmQuaGFzQ2xhc3MoJ2ZhY2V0LWJhci1zZWxlY3RlZCcpKSB7XG5cdFx0XHRpZiAodGhpcy5faWNvbkNvbG9yKSB7XG5cdFx0XHRcdHRoaXMuX2JhckZvcmVncm91bmQuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgdGhpcy5faWNvbkNvbG9yKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX2JhckZvcmVncm91bmQucmVtb3ZlQ2xhc3MoJ2ZhY2V0LWJhci1zZWxlY3RlZCcpO1xuXHRcdH1cblx0XHR0aGlzLl9iYXJGb3JlZ3JvdW5kLmNzcygnd2lkdGgnLCAoKHNwZWMuY291bnQgLyBzcGVjLnRvdGFsKSAqIDEwMCkgKyAnJScpO1xuXHR9XG5cblx0LyogbGFiZWwgKi9cblx0aWYgKHNwZWMuZGlzcGxheVZhbHVlKSB7XG5cdFx0bmV3TGFiZWxIVE1MID0gc3BlYy5kaXNwbGF5VmFsdWU7XG5cdH0gZWxzZSBpZiAoc3BlYy5sYWJlbCkge1xuXHRcdG5ld0xhYmVsSFRNTCA9IHNwZWMubGFiZWw7XG5cdH0gZWxzZSB7XG5cdCAgbmV3TGFiZWxIVE1MID0gc3BlYy52YWx1ZTtcblx0fVxuXHRpZiAobmV3TGFiZWxIVE1MICE9PSB0aGlzLl9sYWJlbC5odG1sKCkpIHtcblx0XHR0aGlzLl9sYWJlbC5odG1sKG5ld0xhYmVsSFRNTCk7XG5cdH1cblxuXHQvKiBjb3VudCBsYWJlbCAqL1xuXHRpZiAodGhpcy5fbGFiZWxDb3VudC50ZXh0KCkgIT09IHNwZWMuY291bnQudG9TdHJpbmcoKSkge1xuXHRcdHRoaXMuX2xhYmVsQ291bnQudGV4dChzcGVjLmNvdW50LnRvU3RyaW5nKCkpO1xuXHR9XG5cblx0LyogbGlua3MgKi8gLy8gVE9ETzogT25seSB1cGRhdGUgaWYgdGhlIGN1cnJlbnQgaWNvbiBpcyBub3QgdGhlIHNhbWUgYXMgdGhlIGljb24gaW4gdGhlIHNwZWMuXG5cdHRoaXMuX2xpbmtzQ29udGFpbmVyLmVtcHR5KCk7XG5cdHRoaXMuX2xpbmtzQ29udGFpbmVyLmFwcGVuZChmYWNldFZlcnRpY2FsX2xpbmtzKHRoaXMuX3NwZWMpKTtcblxuXHQvKiBzZWFyY2ggKi8gLy8gVE9ETzogT25seSB1cGRhdGUgaWYgdGhlIGN1cnJlbnQgaWNvbiBpcyBub3QgdGhlIHNhbWUgYXMgdGhlIGljb24gaW4gdGhlIHNwZWMuXG5cdHRoaXMuX3NlYXJjaENvbnRhaW5lci5lbXB0eSgpO1xuXHR0aGlzLl9zZWFyY2hDb250YWluZXIuYXBwZW5kKGZhY2V0VmVydGljYWxfc2VhcmNoKHRoaXMuX3NwZWMpKTtcblx0aWYgKCF0aGlzLl9zZWFyY2hDb250YWluZXIuY2hpbGRyZW4oKS5sZW5ndGgpIHtcblx0XHR0aGlzLl9zZWFyY2hDb250YWluZXIuZW1wdHkoKTtcblx0fVxufTtcblxuLyoqXG4gKiBDbGljayBldmVudCBoYW5kbGVyLlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2dCAtIEV2ZW50IHRvIGhhbmRsZS5cbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLl9vbkNsaWNrID0gZnVuY3Rpb24oZXZ0KSB7XG5cdHRoaXMuZW1pdCh0aGlzLl90eXBlICsgJzpjbGljaycsIGV2dCwgdGhpcy5fa2V5LCB0aGlzLl92YWx1ZSwgdGhpcy5fY291bnQpO1xufTtcblxuLyoqXG4gKiBTZWFyY2ggZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldnQgLSBFdmVudCB0byBoYW5kbGUuXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5fb25TZWFyY2ggPSBmdW5jdGlvbihldnQpIHtcblx0ZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuXHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6c2VhcmNoJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG59O1xuXG4vKipcbiAqIE1vdXNlIGVudGVyIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZ0IC0gRXZlbnQgdG8gaGFuZGxlLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX29uTW91c2VFbnRlciA9IGZ1bmN0aW9uKGV2dCkge1xuXHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6bW91c2VlbnRlcicsIGV2dCwgdGhpcy5fa2V5LCB0aGlzLl92YWx1ZSwgdGhpcy5fY291bnQpO1xufTtcblxuLyoqXG4gKiBNb3VzZSBsZWF2ZSBldmVudCBoYW5kbGVyLlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2dCAtIEV2ZW50IHRvIGhhbmRsZS5cbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLl9vbk1vdXNlTGVhdmUgPSBmdW5jdGlvbihldnQpIHtcblx0dGhpcy5lbWl0KHRoaXMuX3R5cGUgKyAnOm1vdXNlbGVhdmUnLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcbn07XG5cbi8qKlxuICogVHJhbnNpdGlvbiBlbmQgZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldnQgLSBFdmVudCB0byBoYW5kbGUuXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5faGFuZGxlVHJhbnNpdGlvbkVuZCA9IGZ1bmN0aW9uKGV2dCkge1xuXHR2YXIgcHJvcGVydHkgPSBldnQub3JpZ2luYWxFdmVudC5wcm9wZXJ0eU5hbWU7XG5cdGlmIChldnQudGFyZ2V0ID09PSB0aGlzLl9lbGVtZW50LmdldCgwKSAmJiBwcm9wZXJ0eSA9PT0gJ29wYWNpdHknKSB7XG5cdFx0aWYgKHRoaXMudmlzaWJsZSkge1xuXHRcdFx0dGhpcy5lbWl0KHRoaXMuX3R5cGUgKyAnOmFuaW1hdGlvbjp2aXNpYmxlLW9uJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZW1pdCh0aGlzLl90eXBlICsgJzphbmltYXRpb246dmlzaWJsZS1vZmYnLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcblx0XHR9XG5cdH0gZWxzZSBpZiAoZXZ0LnRhcmdldCA9PT0gdGhpcy5faWNvbkNvbnRhaW5lci5nZXQoMCkgJiYgcHJvcGVydHkgPT09ICdvcGFjaXR5Jykge1xuXHRcdGlmICh0aGlzLmFiYnJldmlhdGVkKSB7XG5cdFx0XHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6YW5pbWF0aW9uOmFiYnJldmlhdGVkLW9uJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZW1pdCh0aGlzLl90eXBlICsgJzphbmltYXRpb246YWJicmV2aWF0ZWQtb2ZmJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKGV2dC50YXJnZXQgPT09IHRoaXMuX2JhckJhY2tncm91bmQuZ2V0KDApICYmIHByb3BlcnR5ID09PSAnd2lkdGgnKSB7XG5cdFx0dGhpcy5lbWl0KHRoaXMuX3R5cGUgKyAnOmFuaW1hdGlvbjpiYXItd2lkdGgtY2hhbmdlJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG5cdH0gZWxzZSBpZiAoZXZ0LnRhcmdldCA9PT0gdGhpcy5fYmFyRm9yZWdyb3VuZC5nZXQoMCkgJiYgcHJvcGVydHkgPT09ICd3aWR0aCcpIHtcblx0XHRpZiAoIXRoaXMuX2hhc0VtaXR0ZWRTZWxlY3RlZEV2ZW50ICYmIHRoaXMuX2JhckZvcmVncm91bmQuaGFzQ2xhc3MoJ2ZhY2V0LWJhci1zZWxlY3RlZCcpKSB7XG5cdFx0XHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6YW5pbWF0aW9uOnNlbGVjdGVkLW9uJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG5cdFx0XHR0aGlzLl9oYXNFbWl0dGVkU2VsZWN0ZWRFdmVudCA9IHRydWU7XG5cdFx0fSBlbHNlIGlmICh0aGlzLl9oYXNFbWl0dGVkU2VsZWN0ZWRFdmVudCAmJiAhdGhpcy5fYmFyRm9yZWdyb3VuZC5oYXNDbGFzcygnZmFjZXQtYmFyLXNlbGVjdGVkJykpIHtcblx0XHRcdHRoaXMuZW1pdCh0aGlzLl90eXBlICsgJzphbmltYXRpb246c2VsZWN0ZWQtb2ZmJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG5cdFx0XHR0aGlzLl9oYXNFbWl0dGVkU2VsZWN0ZWRFdmVudCA9IGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7RmFjZXRWZXJ0aWNhbH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBGYWNldFZlcnRpY2FsO1xuIiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwvdXRpbCcpO1xudmFyIElCaW5kYWJsZSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvSUJpbmRhYmxlJyk7XG52YXIgVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvZ3JvdXAnKTtcbnZhciBUZW1wbGF0ZU1vcmUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvZ3JvdXAtbW9yZScpO1xudmFyIEZhY2V0VmVydGljYWwgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0VmVydGljYWwnKTtcbnZhciBGYWNldEhvcml6b250YWwgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0SG9yaXpvbnRhbCcpO1xuXG52YXIgQ09MTEFQU0VEX0NMQVNTID0gJ2ZhY2V0cy1ncm91cC1jb2xsYXBzZWQnO1xudmFyIEVMTElQU0lTX1ZJU0lCTEVfQ0xBU1MgPSAnZ3JvdXAtZmFjZXQtZWxsaXBzaXMtdmlzaWJsZSc7XG52YXIgQ0hFQ0tFRF9UT0dHTEVfQ0xBU1MgPSAnZmEtY2hlY2stc3F1YXJlLW8nO1xudmFyIFVOQ0hFQ0tFRF9UT0dHTEVfQ0xBU1MgPSAnZmEtc3F1YXJlLW8nO1xuXG4vKipcbiAqIEZhY2V0IGdyb3VwIGNsYXNzIGRlc2lnbmVkIHRvIGluc3RhbnRpYXRlIGFuZCBob2xkIGZhY2V0IGluc3RhbmNlcy5cbiAqXG4gKiBAY2xhc3MgR3JvdXBcbiAqIEBwYXJhbSB7RmFjZXRzfSB3aWRnZXQgLSBUaGUgZmFjZXRzIHdpZGdldCB0aGlzIGdyb3VwIGJlbG9uZ3MgdG8uXG4gKiBAcGFyYW0ge2pxdWVyeX0gY29udGFpbmVyIC0gQSBqUXVlcnkgd3JhcHBlZCBlbGVtZW50IHdoZXJlIHRoaXMgZ3JvdXAgd2lsbCByZXNpZGUuXG4gKiBAcGFyYW0ge09iamVjdH0gZ3JvdXBTcGVjIC0gVGhlIGRhdGEgdXNlZCB0byBsb2FkIHRoaXMgZ3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIEFuIE9iamVjdCB3aXRoIHRoZSBvcHRpb25zIGZvciB0aGlzIGdyb3VwLlxuICogQHBhcmFtIHtudW1iZXI9fSBpbmRleCAtIFRoZSBpbmRleCB0aGlzIGdyb3VwIHNob3VsZCBob2xkIGluIHRoZSB3aWRnZXQuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gR3JvdXAod2lkZ2V0LCBjb250YWluZXIsIGdyb3VwU3BlYywgb3B0aW9ucywgaW5kZXgpIHtcblx0SUJpbmRhYmxlLmNhbGwodGhpcyk7XG5cdHRoaXMuX29wdGlvbnMgPSBvcHRpb25zO1xuXHR0aGlzLl93aWRnZXQgPSB3aWRnZXQ7XG5cdHRoaXMuX2tleSA9IGdyb3VwU3BlYy5rZXk7XG5cdHRoaXMuX2NvbnRhaW5lciA9IGNvbnRhaW5lcjtcblx0dGhpcy5fb3duc1RvdGFsID0gZmFsc2U7XG5cdHRoaXMuX3RvdGFsID0gMDtcblxuXHR0aGlzLl9jYW5EcmFnID0gZmFsc2U7XG5cdHRoaXMuX2RyYWdnaW5nID0gZmFsc2U7XG5cdHRoaXMuX2RyYWdnaW5nWCA9IDA7XG5cdHRoaXMuX2RyYWdnaW5nWSA9IDA7XG5cdHRoaXMuX2RyYWdnaW5nWU9mZnNldCA9IDA7XG5cdHRoaXMuX2RyYWdnaW5nR3JvdXBUb3AgPSAwO1xuXHR0aGlzLl9zY3JvbGxFbGVtZW50ID0gbnVsbDtcblx0dGhpcy5fdHJhY2tpbmdUb3VjaElEID0gbnVsbDtcblx0dGhpcy5fdG91Y2hTdGFydFRpbWUgPSAwO1xuXHR0aGlzLl9pbmRleCA9IGluZGV4IHx8IDA7XG5cblx0dGhpcy5fZmFjZXRzID0ge1xuXHRcdHZlcnRpY2FsOiBbXSxcblx0XHRob3Jpem9udGFsOiBbXSxcblx0XHRhbGw6IFtdXG5cdH07XG5cblx0dGhpcy5faW5pdGlhbGl6ZUxheW91dChUZW1wbGF0ZSwgZ3JvdXBTcGVjLmxhYmVsLCBncm91cFNwZWMubW9yZSB8fCAwKTtcblx0dGhpcy5faW5pdGlhbGl6ZUZhY2V0cyhncm91cFNwZWMpO1xuXHQvKiBjb2xsYXBzZWQgc3RhdGUgKi9cblx0aWYgKGdyb3VwU3BlYy5jb2xsYXBzZWQpIHtcblx0XHR0aGlzLmNvbGxhcHNlZCA9IHRydWU7XG5cdH1cblx0dGhpcy5fc2V0dXBIYW5kbGVycygpO1xufVxuXG4vKipcbiAqIEBpbmhlcml0YW5jZSB7SUJpbmRhYmxlfVxuICovXG5Hcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKElCaW5kYWJsZS5wcm90b3R5cGUpO1xuR3JvdXAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gR3JvdXA7XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGdyb3VwJ3MgY29uZmlndXJlZCBrZXkuXG4gKlxuICogQHByb3BlcnR5IGtleVxuICogQHR5cGUge3N0cmluZ31cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoR3JvdXAucHJvdG90eXBlLCAna2V5Jywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fa2V5O1xuXHR9XG59KTtcblxuXG4vKipcbiAqIFJldHVybnMgdGhpcyBncm91cCdzIHRvdGFsIGhpdCBjb3VudC5cbiAqXG4gKiBAcHJvcGVydHkgdG90YWxcbiAqIEB0eXBlIHtudW1iZXJ9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEdyb3VwLnByb3RvdHlwZSwgJ3RvdGFsJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fdG90YWw7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFJldHVybnMgYWxsIG9mIHRoaXMgZ3JvdXAncyBmYWNldHMuXG4gKlxuICogQHByb3BlcnR5IGZhY2V0c1xuICogQHR5cGUge0FycmF5fVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShHcm91cC5wcm90b3R5cGUsICdmYWNldHMnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9mYWNldHMuYWxsO1xuXHR9XG59KTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZ3JvdXAncyBob3Jpem9udGFsIGZhY2V0cy5cbiAqXG4gKiBAcHJvcGVydHkgZmFjZXRzXG4gKiBAdHlwZSB7QXJyYXl9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEdyb3VwLnByb3RvdHlwZSwgJ2hvcml6b250YWxGYWNldHMnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9mYWNldHMuaG9yaXpvbnRhbDtcblx0fVxufSk7XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGdyb3VwJ3MgdmVydGljYWwgZmFjZXRzLlxuICpcbiAqIEBwcm9wZXJ0eSBmYWNldHNcbiAqIEB0eXBlIHtBcnJheX1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoR3JvdXAucHJvdG90eXBlLCAndmVydGljYWxGYWNldHMnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9mYWNldHMudmVydGljYWw7XG5cdH1cbn0pO1xuXG4vKipcbiAqIElzIHRoaXMgZ3JvdXAgdmlzaWJsZS5cbiAqXG4gKiBAcHJvcGVydHkgdmlzaWJsZVxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShHcm91cC5wcm90b3R5cGUsICd2aXNpYmxlJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZWxlbWVudC5pcygnOnZpc2libGUnKTtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5fZWxlbWVudC5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX2VsZW1lbnQuaGlkZSgpO1xuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogUHJvcGVydHkgbWVhbnQgdG8ga2VlcCB0cmFjayBvZiB0aGlzIGdyb3VwJ3MgaW5kZXggaW4gdGhlIHdpZGdldC5cbiAqXG4gKiBAcHJvcGVydHkgaW5kZXhcbiAqIEB0eXBlIHtudW1iZXJ9XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShHcm91cC5wcm90b3R5cGUsICdpbmRleCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2luZGV4O1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlICE9PSB0aGlzLl9pbmRleCkge1xuXHRcdFx0dGhpcy5faW5kZXggPSB2YWx1ZTtcblx0XHRcdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6cmVvcmRlcmVkJywgbnVsbCwgdGhpcy5fa2V5LCB0aGlzLl9pbmRleCk7XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBJcyB0aGlzIGdyb3VwIGNvbGxhcHNlZC5cbiAqXG4gKiBAcHJvcGVydHkgY29sbGFwc2VkXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEdyb3VwLnByb3RvdHlwZSwgJ2NvbGxhcHNlZCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2VsZW1lbnQuaGFzQ2xhc3MoQ09MTEFQU0VEX0NMQVNTKTtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSAhPT0gdGhpcy5jb2xsYXBzZWQpIHtcblx0XHRcdHRoaXMuX3NldENvbGxhcHNlZENsYXNzZXModmFsdWUsIHRoaXMuZmFjZXRzLmxlbmd0aCA+PSAzKTtcblx0XHRcdHRoaXMuX3NldEFiYnJldmlhdGVBbmRIaWRlRmFjZXRzKHZhbHVlLCAzKTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vKipcbiAqIE1ha2VzIHN1cmUgdGhhdCBhbGwgZmFjZXRzIGluIHRoaXMgZ3JvdXAgY2FuIGJlIHNlbGVjdGVkLlxuICpcbiAqIEBtZXRob2QgaW5pdGlhbGl6ZVNlbGVjdGlvblxuICovXG5Hcm91cC5wcm90b3R5cGUuaW5pdGlhbGl6ZVNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy52ZXJ0aWNhbEZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChmYWNldCkge1xuXHRcdGZhY2V0LnNlbGVjdCgwKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIERlc2VsZWN0cyBhbGwgZmFjZXRzIGluIHRoaXMgZ3JvdXAuXG4gKlxuICogQG1ldGhvZCBjbGVhclNlbGVjdGlvblxuICovXG5Hcm91cC5wcm90b3R5cGUuY2xlYXJTZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuZmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0KSB7XG5cdFx0ZmFjZXQuZGVzZWxlY3QoKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIEhpZ2hsaWdodHMgdGhlIGZhY2V0IHdpdGggdGhlIHNwZWNpZmllZCB2YWx1ZS5cbiAqXG4gKiBAbWV0aG9kIGhpZ2hsaWdodFxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmFjZXQgdG8gaGlnaGxpZ2h0LlxuICovXG5Hcm91cC5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdHZhciBleGlzdGluZ0ZhY2V0ID0gdGhpcy5fZ2V0RmFjZXQodmFsdWUpO1xuXHRpZiAoZXhpc3RpbmdGYWNldCkge1xuXHRcdGV4aXN0aW5nRmFjZXQuaGlnaGxpZ2h0ZWQgPSB0cnVlO1xuXHR9XG59O1xuXG4vKipcbiAqIFVuaGlnaGxpZ2h0cyB0aGUgZmFjZXQgd2l0aCB0aGUgc3BlY2lmaWVkIHZhbHVlLlxuICpcbiAqIEBtZXRob2QgdW5oaWdobGlnaHRcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZhY2V0IHRvIHVuaGlnaGxpZ2h0XG4gKi9cbkdyb3VwLnByb3RvdHlwZS51bmhpZ2hsaWdodCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRpZiAodmFsdWUpIHtcblx0XHR2YXIgZXhpc3RpbmdGYWNldCA9IHRoaXMuX2dldEZhY2V0KHZhbHVlKTtcblx0XHRpZiAoZXhpc3RpbmdGYWNldCkge1xuXHRcdFx0ZXhpc3RpbmdGYWNldC5oaWdobGlnaHRlZCA9IGZhbHNlO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHR0aGlzLnZlcnRpY2FsRmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0KSB7XG5cdFx0XHRmYWNldC5oaWdobGlnaHRlZCA9IGZhbHNlO1xuXHRcdH0pO1xuXHR9XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgZmFjZXQgd2l0aCB0aGUgZ2l2ZW4gdmFsdWUgaXMgaGlnaGxpZ2h0ZWQuXG4gKlxuICogQG1ldGhvZCBpc0hpZ2hsaWdodGVkXG4gKiBAcGFyYW0geyp9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBmYWNldCB0byBsb29rIGZvci5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5Hcm91cC5wcm90b3R5cGUuaXNIaWdobGlnaHRlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHR2YXIgcmVzcG9uc2UgPSBmYWxzZSxcblx0XHRleGlzdGluZ0ZhY2V0ID0gdGhpcy5fZ2V0RmFjZXQodmFsdWUpO1xuXG5cdGlmIChleGlzdGluZ0ZhY2V0KSB7XG5cdFx0cmVzcG9uc2UgPSBleGlzdGluZ0ZhY2V0LmhpZ2hsaWdodGVkO1xuXHR9XG5cblx0cmV0dXJuIHJlc3BvbnNlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmaWx0ZXIgcmFuZ2Ugb2YgdGhlIGZhY2V0IHdpdGggdGhlIGdpdmVuIHZhbHVlIG9yIG51bGwgaWYgYW4gZXJyb3Igb2NjdXJzLlxuICpcbiAqIEBtZXRob2QgZ2V0RmlsdGVyUmFuZ2VcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZhY2V0IGZvciB3aGljaCB0aGUgZmlsdGVyIHdpbGwgYmUgcmV0cmlldmVkLlxuICogQHJldHVybnMge09iamVjdHxudWxsfVxuICovXG5Hcm91cC5wcm90b3R5cGUuZ2V0RmlsdGVyUmFuZ2UgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0dmFyIGZhY2V0ID0gdGhpcy5fZ2V0RmFjZXQodmFsdWUpO1xuXHRpZiAoZmFjZXQgJiYgJ2ZpbHRlclJhbmdlJyBpbiBmYWNldCkge1xuXHRcdHJldHVybiBmYWNldC5maWx0ZXJSYW5nZTtcblx0fVxuXHRyZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogQXBwZW5kcyB0aGUgc3BlY2lmaWVkIGRhdGEgdG8gdGhpcyBncm91cC5cbiAqXG4gKiBAbWV0aG9kIGFwcGVuZFxuICogQHBhcmFtIHtPYmplY3R9IGdyb3VwU3BlYyAtIFRoZSBkYXRhIHNwZWNpZmljYXRpb24gdG8gYXBwZW5kLlxuICovXG5Hcm91cC5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKGdyb3VwU3BlYykge1xuXHR2YXIgZXhpc3RpbmdGYWNldDtcblxuXHQvKiByZW1vdmUgZXZlbnQgaGFuZGxlcnMgKi9cblx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblxuXHRncm91cFNwZWMubW9yZSA9IGdyb3VwU3BlYy5tb3JlIHx8IDA7XG5cdHRoaXMuX3VwZGF0ZU1vcmUoZ3JvdXBTcGVjLm1vcmUpO1xuXG5cdC8vIG1ha2Ugc3VyZSB0aGUgZ3JvdXAgaXMgbm90IGNvbGxhcHNlZCAoc28gdGhlIGFwcGVuZCBlZmZlY3QgaXMgdmlzaWJsZSlcblx0dGhpcy5jb2xsYXBzZWQgPSBmYWxzZTtcblxuXHRpZiAoZ3JvdXBTcGVjLnRvdGFsKSB7XG5cdFx0dGhpcy5fb3duc1RvdGFsID0gdHJ1ZTtcblx0XHR0aGlzLl90b3RhbCA9IGdyb3VwU3BlYy50b3RhbDtcblx0fVxuXG5cdC8vIHVwZGF0ZSBhbGwgdGhlIGZhY2V0cyAodGhlIGdyb3VwIHRvdGFsIG1vc3QgbGlrZWx5IGNoYW5nZWQpXG5cdGdyb3VwU3BlYy5mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXRTcGVjKSB7XG5cdFx0aWYgKCF0aGlzLl9vd25zVG90YWwgJiYgISgnaGlzdG9ncmFtJyBpbiBmYWNldFNwZWMpKSB7IC8vIGl0J3Mgbm90IGEgaG9yaXpvbnRhbCBmYWNldFxuXHRcdFx0dGhpcy5fdG90YWwgKz0gZmFjZXRTcGVjLmNvdW50O1xuXHRcdH1cblx0XHRleGlzdGluZ0ZhY2V0ID0gdGhpcy5fZ2V0RmFjZXQoZmFjZXRTcGVjLnZhbHVlKTtcblx0XHRpZiAoZXhpc3RpbmdGYWNldCkge1xuXHRcdFx0ZmFjZXRTcGVjLmNvdW50ICs9IGV4aXN0aW5nRmFjZXQuY291bnQ7XG5cdFx0XHRleGlzdGluZ0ZhY2V0LnVwZGF0ZVNwZWMoZmFjZXRTcGVjKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGZhY2V0ID0gdGhpcy5fY3JlYXRlTmV3RmFjZXQoZmFjZXRTcGVjLCBncm91cFNwZWMua2V5LCB0cnVlKTtcblx0XHRcdGlmIChmYWNldCBpbnN0YW5jZW9mIEZhY2V0SG9yaXpvbnRhbCkge1xuXHRcdFx0XHR0aGlzLmhvcml6b250YWxGYWNldHMucHVzaChmYWNldCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnZlcnRpY2FsRmFjZXRzLnB1c2goZmFjZXQpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5mYWNldHMucHVzaChmYWNldCk7XG5cdFx0XHRmYWNldC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdC8qIGZvcndhcmQgYWxsIHRoZSBldmVudHMgZnJvbSB0aGlzIGZhY2V0ICovXG5cdFx0XHR0aGlzLmZvcndhcmQoZmFjZXQpO1xuXHRcdH1cblx0fSwgdGhpcyk7XG5cblx0Ly8gVXBkYXRlIGZhY2V0IHRvdGFscyBzbyB0aGV5IGNhbiByZXNjYWxlIHRoZWlyIGJhcnNcblx0dGhpcy5mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXQpIHtcblx0XHRmYWNldC50b3RhbCA9IHRoaXMuX3RvdGFsO1xuXHR9LCB0aGlzKTtcblxuXHQvKiBjb2xsYXBzZWQgc3RhdGUgKi9cblx0aWYgKGdyb3VwU3BlYy5jb2xsYXBzZWQpIHtcblx0XHR0aGlzLmNvbGxhcHNlZCA9IHRydWU7XG5cdH1cblxuXHQvLyByZS1yZWdpc3RlciBoYW5kbGVycyB0byBlbnN1cmUgbmV3bHkgYWRkZWQgZWxlbWVudHMgcmVzcG9uZCB0byBldmVudHNcblx0dGhpcy5fYWRkSGFuZGxlcnMoKTtcbn07XG5cbi8qKlxuICogUmVwbGFjZSBhbGwgdGhlIGZhY2V0IGVudHJpZXMgaW4gdGhpcyBncm91cCB3aXRoIG5ldyBvbmVzIGluIGdyb3VwU3BlYy5cbiAqIE1haW50YWlucyBncm91cCBhbmQgZmFjZXQgY2xpZW50IGV2ZW50cy5cbiAqXG4gKiBAbWV0aG9kIHJlcGxhY2VcbiAqIEBwYXJhbSB7T2JqZWN0fSBncm91cFNwZWMgLSBUaGUgZGF0YSBzcGVjaWZpY2F0aW9uIGNvbnRhaW5pbmcgZmFjZXRzIHRvIHJlcGxhY2UuXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24oZ3JvdXBTcGVjKSB7XG5cdC8vIG1ha2Ugc3VyZSB0aGUgZ3JvdXAgaXMgbm90IGNvbGxhcHNlZCAoc28gdGhlIGFwcGVuZCBlZmZlY3QgaXMgdmlzaWJsZSlcblx0dGhpcy5jb2xsYXBzZWQgPSBmYWxzZTtcblxuXHQvKiByZW1vdmUgZXZlbnQgaGFuZGxlcnMgKi9cblx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblxuXHQvLyBEZXN0cm95IGV4aXN0aW5nIGZhY2V0c1xuXHR0aGlzLl9kZXN0cm95RmFjZXRzKCk7XG5cblx0Ly8gaW5pdGlhbGl6ZSB0aGUgbmV3IGZhY2V0c1xuXHR0aGlzLl9pbml0aWFsaXplRmFjZXRzKGdyb3VwU3BlYyk7XG5cblx0Ly8gVXBkYXRlIG1vcmUgbGlua1xuXHRncm91cFNwZWMubW9yZSA9IGdyb3VwU3BlYy5tb3JlIHx8IDA7XG5cdHRoaXMuX3VwZGF0ZU1vcmUoZ3JvdXBTcGVjLm1vcmUpO1xuXG5cdC8qIGNvbGxhcHNlZCBzdGF0ZSAqL1xuXHRpZiAoZ3JvdXBTcGVjLmNvbGxhcHNlZCkge1xuXHRcdHRoaXMuY29sbGFwc2VkID0gdHJ1ZTtcblx0fVxuXG5cdC8vIHJlLXJlZ2lzdGVyIGhhbmRsZXJzIHRvIGVuc3VyZSBuZXdseSBhZGRlZCBlbGVtZW50cyByZXNwb25kIHRvIGV2ZW50c1xuXHR0aGlzLl9hZGRIYW5kbGVycygpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBmYWNldCB3aXRoIHRoZSBzcGVjaWZpZWQgdmFsdWUgZnJvbSB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlRmFjZXRcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSB0aGUgdmFsdWUgb2YgdGhlIGZhY2V0IHRvIHJlbW92ZS5cbiAqL1xuR3JvdXAucHJvdG90eXBlLnJlbW92ZUZhY2V0ID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dmFyIGZhY2V0ID0gdGhpcy5fZ2V0RmFjZXQodmFsdWUpO1xuXHR2YXIgZmFjZXRJbmRleCA9IHRoaXMuZmFjZXRzLmluZGV4T2YoZmFjZXQpO1xuXHRpZiAoZmFjZXRJbmRleCA+PSAwKSB7XG5cdFx0dGhpcy5mYWNldHMuc3BsaWNlKGZhY2V0SW5kZXgsIDEpO1xuXG5cdFx0dmFyIGZhY2V0VHlwZUFycmF5ID0gbnVsbDtcblx0XHRpZiAoZmFjZXQgaW5zdGFuY2VvZiBGYWNldEhvcml6b250YWwpIHtcblx0XHRcdGZhY2V0VHlwZUFycmF5ID0gdGhpcy5ob3Jpem9udGFsRmFjZXRzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmYWNldFR5cGVBcnJheSA9IHRoaXMudmVydGljYWxGYWNldHM7XG5cdFx0fVxuXHRcdGZhY2V0SW5kZXggPSBmYWNldFR5cGVBcnJheS5pbmRleE9mKGZhY2V0KTtcblx0XHRpZiAoZmFjZXRJbmRleCA+PSAwKSB7XG5cdFx0XHRmYWNldFR5cGVBcnJheS5zcGxpY2UoZmFjZXRJbmRleCwgMSk7XG5cdFx0fVxuXG5cdFx0aWYgKCF0aGlzLl9vd25zVG90YWwpIHtcblx0XHRcdHRoaXMuX3RvdGFsICs9IGZhY2V0Ll9zcGVjLmNvdW50O1xuXHRcdFx0Ly8gVXBkYXRlIGZhY2V0IHRvdGFscyBzbyB0aGV5IGNhbiByZXNjYWxlIHRoZWlyIGJhcnNcblx0XHRcdHRoaXMuZmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0KSB7XG5cdFx0XHRcdGZhY2V0LnRvdGFsID0gdGhpcy5fdG90YWw7XG5cdFx0XHR9LCB0aGlzKTtcblx0XHR9XG5cblx0XHQvKiBkZXN0cm95aW5nIGEgZmFjZXQgYXV0b21hdGljYWxseSB1bmZvcndhcmRzIGl0cyBldmVudHMgKi9cblx0XHRmYWNldC5kZXN0cm95KHRydWUpO1xuXHR9XG59O1xuXG4vKipcbiAqIFNldHMgdGhpcyBncm91cCB0byBiZSBnYXJiYWdlIGNvbGxlY3RlZCBieSByZW1vdmluZyBhbGwgcmVmZXJlbmNlcyB0byBldmVudCBoYW5kbGVycyBhbmQgRE9NIGVsZW1lbnRzLlxuICogQ2FsbHMgYGRlc3Ryb3lgIG9uIGl0cyBmYWNldHMuXG4gKlxuICogQG1ldGhvZCBkZXN0cm95XG4gKi9cbkdyb3VwLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXHR0aGlzLl9kZXN0cm95RmFjZXRzKCk7XG5cdHRoaXMuX2VsZW1lbnQucmVtb3ZlKCk7XG5cdElCaW5kYWJsZS5wcm90b3R5cGUuZGVzdHJveS5jYWxsKHRoaXMpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIHRoZSBmYWNldHMgaW4gdGhpcyBncm91cCBhbmQgY2FsbHMgYGRlc3Ryb3lgIG9uIGVhY2ggb25lIG9mIHRoZW0uXG4gKlxuICogQG1ldGhvZCBfZGVzdHJveUZhY2V0c1xuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9kZXN0cm95RmFjZXRzID0gZnVuY3Rpb24gKCkge1xuXHQvLyBkZXN0cm95IGFsbCB0aGUgZmFjZXRzXG5cdHRoaXMuZmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0KSB7XG5cdFx0LyogZGVzdHJveWluZyBhIGZhY2V0IGF1dG9tYXRpY2FsbHkgdW5mb3J3YXJkcyBpdHMgZXZlbnRzICovXG5cdFx0ZmFjZXQuZGVzdHJveSgpO1xuXHR9KTtcblxuXHQvLyByZXNldCB0aGUgZmFjZXRzIHN0cnVjdHVyZVxuXHR0aGlzLl9mYWNldHMgPSB7XG5cdFx0aG9yaXpvbnRhbDogW10sXG5cdFx0dmVydGljYWw6IFtdLFxuXHRcdGFsbDogW11cblx0fTtcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgYWxsIHRoZSBsYXlvdXQgZWxlbWVudHMgYmFzZWQgb24gdGhlIGB0ZW1wbGF0ZWAgcHJvdmlkZWQuXG4gKlxuICogQG1ldGhvZCBfaW5pdGlhbGl6ZUxheW91dFxuICogQHBhcmFtIHtmdW5jdGlvbn0gdGVtcGxhdGUgLSBUaGUgdGVtcGxhdGluZyBmdW5jdGlvbiB1c2VkIHRvIGNyZWF0ZSB0aGUgbGF5b3V0LlxuICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIC0gVGhlIGxhYmVsIHRvIGJlIHVzZWQgZm9yIHRoaXMgZ3JvdXAuXG4gKiBAcGFyYW0geyp9IG1vcmUgLSBBIHZhbHVlIGRlZmluaW5nIHRoZSAnbW9yZScgYmVoYXZpb3VyIG9mIHRoaXMgZ3JvdXAuXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX2luaXRpYWxpemVMYXlvdXQgPSBmdW5jdGlvbiAodGVtcGxhdGUsIGxhYmVsLCBtb3JlKSB7XG5cdHRoaXMuX2VsZW1lbnQgPSAkKHRlbXBsYXRlKHtcblx0XHRsYWJlbDogbGFiZWwsXG5cdFx0bW9yZTogbW9yZVxuXHR9KSk7XG5cdHRoaXMuX2NvbnRhaW5lci5hcHBlbmQodGhpcy5fZWxlbWVudCk7XG5cdHRoaXMuX2ZhY2V0Q29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtZmFjZXQtY29udGFpbmVyJyk7XG5cdHRoaXMuX2dyb3VwQ29udGVudCA9IHRoaXMuX2VsZW1lbnQuZmluZCgnLmZhY2V0cy1ncm91cCcpO1xuXG5cdHRoaXMuX3VwZGF0ZU1vcmUobW9yZSk7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZVxuICogQHBhcmFtIHNwZWNcbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faW5pdGlhbGl6ZUZhY2V0cyA9IGZ1bmN0aW9uIChzcGVjKSB7XG5cdC8vIENhbGN1bGF0ZSB0aGUgZ3JvdXAgdG90YWxcblx0aWYgKHNwZWMudG90YWwpIHtcblx0XHR0aGlzLl9vd25zVG90YWwgPSB0cnVlO1xuXHRcdHRoaXMuX3RvdGFsID0gc3BlYy50b3RhbDtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9vd25zVG90YWwgPSBmYWxzZTtcblx0XHRzcGVjLmZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChmYWNldFNwZWMpIHtcblx0XHRcdGlmICghKCdoaXN0b2dyYW0nIGluIGZhY2V0U3BlYykpIHsgLy8gaXQncyBub3QgYSBob3Jpem9udGFsIGZhY2V0XG5cdFx0XHRcdHRoaXMuX3RvdGFsICs9IGZhY2V0U3BlYy5jb3VudDtcblx0XHRcdH1cblx0XHR9LCB0aGlzKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBlYWNoIGZhY2V0XG5cdHZhciBmYWNldHMgPSBzcGVjLmZhY2V0cztcblx0Zm9yICh2YXIgaSA9IDAsIG4gPSBmYWNldHMubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0dmFyIGZhY2V0U3BlYyA9IGZhY2V0c1tpXTtcblx0XHR2YXIgZmFjZXQgPSB0aGlzLl9jcmVhdGVOZXdGYWNldChmYWNldFNwZWMsIHNwZWMua2V5KTtcblx0XHRpZiAoZmFjZXQgaW5zdGFuY2VvZiBGYWNldEhvcml6b250YWwpIHtcblx0XHRcdHRoaXMuaG9yaXpvbnRhbEZhY2V0cy5wdXNoKGZhY2V0KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy52ZXJ0aWNhbEZhY2V0cy5wdXNoKGZhY2V0KTtcblx0XHR9XG5cdFx0dGhpcy5mYWNldHMucHVzaChmYWNldCk7XG5cdFx0LyogZm9yd2FyZCBhbGwgdGhlIGV2ZW50cyBmcm9tIHRoaXMgZmFjZXQgKi9cblx0XHR0aGlzLmZvcndhcmQoZmFjZXQpO1xuXHR9XG59O1xuXG4vKipcbiAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gbWFrZSBzdXJlIHRoZSBldmVudCBoYW5kbGVycyBoYXZlIGJlZW4gYWRkZWQgYW5kIGFyZSB1cGRhdGVkLlxuICpcbiAqIEBtZXRob2QgX3NldHVwSGFuZGxlcnNcbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fc2V0dXBIYW5kbGVycyA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0dGhpcy5fYWRkSGFuZGxlcnMoKTtcbn07XG5cbi8qKlxuICogQWRkcyB0aGUgbmVjZXNzYXJ5IGV2ZW50IGhhbmRsZXJzIGZvciB0aGlzIG9iamVjdCB0byBmdW5jdGlvbi5cbiAqXG4gKiBAbWV0aG9kIF9hZGRIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9hZGRIYW5kbGVycyA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtZXhwYW5kZXInKS5vbignY2xpY2suZmFjZXRzQ29sbGFwc2VFeHBhbmQnLCB0aGlzLl90b2dnbGVDb2xsYXBzZUV4cGFuZC5iaW5kKHRoaXMpKTtcblx0dGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtbW9yZS10YXJnZXQnKS5vbignY2xpY2suZmFjZXRzR3JvdXBNb3JlJywgdGhpcy5fb25Nb3JlLmJpbmQodGhpcykpO1xuXHR0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1vdGhlci10YXJnZXQnKS5vbignY2xpY2suZmFjZXRzR3JvdXBPdGhlcicsIHRoaXMuX29uT3RoZXIuYmluZCh0aGlzKSk7XG5cdHRoaXMuX2VsZW1lbnQuZmluZCgnLmdyb3VwLWhlYWRlcicpLm9uKCdtb3VzZWRvd24nLCB0aGlzLl9oYW5kbGVIZWFkZXJNb3VzZURvd24uYmluZCh0aGlzKSk7XG5cdCQoZG9jdW1lbnQpLm9uKCdtb3VzZXVwLmdyb3VwLicgKyB0aGlzLl9rZXksIHRoaXMuX2hhbmRsZUhlYWRlck1vdXNlVXAuYmluZCh0aGlzKSk7XG5cdCQoZG9jdW1lbnQpLm9uKCdtb3VzZW1vdmUuZ3JvdXAuJyArIHRoaXMuX2tleSwgdGhpcy5faGFuZGxlSGVhZGVyTW91c2VNb3ZlLmJpbmQodGhpcykpO1xuXG5cdHRoaXMuX2VsZW1lbnQuZmluZCgnLmdyb3VwLWhlYWRlcicpLm9uKCd0b3VjaHN0YXJ0JywgdGhpcy5faGFuZGxlSGVhZGVyVG91Y2hTdGFydC5iaW5kKHRoaXMpKTtcblx0JChkb2N1bWVudCkub24oJ3RvdWNobW92ZS5ncm91cC4nICsgdGhpcy5fa2V5LCB0aGlzLl9oYW5kbGVIZWFkZXJUb3VjaE1vdmUuYmluZCh0aGlzKSk7XG5cdCQoZG9jdW1lbnQpLm9uKCd0b3VjaGVuZC5ncm91cC4nICsgdGhpcy5fa2V5LCB0aGlzLl9oYW5kbGVIZWFkZXJUb3VjaEVuZC5iaW5kKHRoaXMpKTtcblx0JChkb2N1bWVudCkub24oJ3RvdWNoY2FuY2VsLmdyb3VwLicgKyB0aGlzLl9rZXksIHRoaXMuX2hhbmRsZUhlYWRlclRvdWNoRW5kLmJpbmQodGhpcykpO1xuXG5cdHRoaXMuX2VsZW1lbnQub24oJ3RyYW5zaXRpb25lbmQnLCB0aGlzLl9oYW5kbGVUcmFuc2l0aW9uRW5kLmJpbmQodGhpcykpO1xuXG5cdC8qIGFzc3VtZSB0aGF0IHdlIHNob3VsZCB3YWl0IGZvciBhbGwgdGhlIGdyb3VwcyB0byBiZSBpbnN0YW50aWF0ZWQgYmVmb3JlIGFkZGluZyB0aGUgc2Nyb2xsIGhhbmRsZXIgKi9cblx0c2V0VGltZW91dCh0aGlzLl9hZGRTY3JvbGxIYW5kbGVyLmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFsbCB0aGUgZXZlbnQgaGFuZGxlcnMgYWRkZWQgYnkgdGhlIGBfYWRkSGFuZGxlcnNgIGZ1bmN0aW9uLlxuICpcbiAqIEBtZXRob2QgX3JlbW92ZUhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX3JlbW92ZUhhbmRsZXJzID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1leHBhbmRlcicpLm9mZignY2xpY2suZmFjZXRzQ29sbGFwc2VFeHBhbmQnKTtcblx0dGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtbW9yZS10YXJnZXQnKS5vZmYoJ2NsaWNrLmZhY2V0c0dyb3VwTW9yZScpO1xuXHR0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1vdGhlci10YXJnZXQnKS5vZmYoJ2NsaWNrLmZhY2V0c0dyb3VwT3RoZXInKTtcblx0dGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtaGVhZGVyJykub2ZmKCdtb3VzZWRvd24nKTtcblx0JChkb2N1bWVudCkub2ZmKCdtb3VzZXVwLmdyb3VwLicgKyB0aGlzLl9rZXkpO1xuXHQkKGRvY3VtZW50KS5vZmYoJ21vdXNlbW92ZS5ncm91cC4nICsgdGhpcy5fa2V5KTtcblx0JChkb2N1bWVudCkub2ZmKCd0b3VjaG1vdmUuZ3JvdXAuJyArIHRoaXMuX2tleSk7XG5cdCQoZG9jdW1lbnQpLm9mZigndG91Y2hlbmQuZ3JvdXAuJyArIHRoaXMuX2tleSk7XG5cdCQoZG9jdW1lbnQpLm9mZigndG91Y2hjYW5jZWwuZ3JvdXAuJyArIHRoaXMuX2tleSk7XG5cdHRoaXMuX2VsZW1lbnQub2ZmKCd0cmFuc2l0aW9uZW5kJyk7XG5cdHRoaXMuX3JlbW92ZVNjcm9sbEhhbmRsZXIoKTtcbn07XG5cbi8qKlxuICogQWRkcyB0aGUgc2Nyb2xsIGhhbmRsZXIgbmVlZGVkIGZvciBncm91cHMgdG8gd29yayBwcm9wZXJseSB3aGVuIGRyYWdnaW5nLlxuICpcbiAqIEBtZXRob2QgX2FkZFNjcm9sbEhhbmRsZXJcbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fYWRkU2Nyb2xsSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9yZW1vdmVTY3JvbGxIYW5kbGVyKCk7XG5cblx0LyogZmluZCB0aGUgZmlyc3QgZWxlbWVudCB0aGF0IGNhbiBiZSBzY3JvbGxlZCBhbmQgYXR0YWNoIHRvIGl0ICovXG5cdHZhciBjdXJyZW50RWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cdHdoaWxlICh0cnVlKSB7XG5cdFx0aWYgKCFjdXJyZW50RWxlbWVudC5sZW5ndGgpIHtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHZhciByYXdFbGVtZW50ID0gY3VycmVudEVsZW1lbnQuZ2V0KDApO1xuXHRcdGlmIChyYXdFbGVtZW50LnNjcm9sbEhlaWdodCA+IHJhd0VsZW1lbnQuY2xpZW50SGVpZ2h0KSB7XG5cdFx0XHR0aGlzLl9zY3JvbGxFbGVtZW50ID0gY3VycmVudEVsZW1lbnQ7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRjdXJyZW50RWxlbWVudCA9IGN1cnJlbnRFbGVtZW50LnBhcmVudCgpO1xuXHR9XG5cblx0aWYgKHRoaXMuX3Njcm9sbEVsZW1lbnQpIHtcblx0XHR0aGlzLl9zY3JvbGxFbGVtZW50Lm9uKCdzY3JvbGwuZ3JvdXAuJyArIHRoaXMuX2tleSwgdGhpcy5faGFuZGxlSGVhZGVyTW91c2VNb3ZlLmJpbmQodGhpcykpO1xuXHR9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHNjcm9sbCBoYW5kbGVyIGZvciB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgX3JlbW92ZVNjcm9sbEhhbmRsZXJcbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fcmVtb3ZlU2Nyb2xsSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5fc2Nyb2xsRWxlbWVudCkge1xuXHRcdHRoaXMuX3Njcm9sbEVsZW1lbnQub2ZmKCdzY3JvbGwuZ3JvdXAuJyArIHRoaXMuX2tleSk7XG5cdFx0dGhpcy5fc2Nyb2xsRWxlbWVudCA9IG51bGw7XG5cdH1cbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZmFjZXRzIHdpdGggdGhlIGdpdmVuIHZhbHVlLCBpZiBpdCBleGlzdHMgaW4gdGhpcyBncm91cC5cbiAqXG4gKiBAbWV0aG9kIF9nZXRGYWNldFxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoYSB2YWx1ZSB0byBsb29rIGZvci5cbiAqIEByZXR1cm5zIHtGYWNldH1cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fZ2V0RmFjZXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0dmFyIGZhY2V0T2JqID0gdGhpcy5mYWNldHMuZmlsdGVyKGZ1bmN0aW9uIChmKSB7XG5cdFx0cmV0dXJuIGYudmFsdWUgPT09IHZhbHVlO1xuXHR9KTtcblx0aWYgKGZhY2V0T2JqICYmIGZhY2V0T2JqLmxlbmd0aCA+IDApIHtcblx0XHRyZXR1cm4gZmFjZXRPYmpbMF07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgJ21vcmUnIHN0YXRlIG9mIHRoaXMgZ3JvdXAuXG4gKiBUT0RPOiBVc2UgdGhlIGFscmVhZHkgY3JlYXRlZCBlbGVtZW50IGlmIHBvc3NpYmxlIGluc3RlYWQgb2YgY3JlYXRpbmcgYW5ldyBvbmUgZXZlcnkgdGltZS5cbiAqXG4gKiBAbWV0aG9kIF91cGRhdGVNb3JlXG4gKiBAcGFyYW0ge251bWJlcnx8Ym9vbGVhbn0gbW9yZSAtIFRoZSBudW1iZXIgb2YgZXh0cmEgZmFjZXRzIGF2YWlsYWJsZSBvciBhIGJvb2xlYW4gc3BlY2lmeWluZyBvZiB0aGVyZSBhcmUgbW9yZSBlbGVtZW50cy5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fdXBkYXRlTW9yZSA9IGZ1bmN0aW9uIChtb3JlKSB7XG5cdHRoaXMuX21vcmVFbGVtZW50ID0gJChUZW1wbGF0ZU1vcmUoe1xuXHRcdG1vcmU6IG1vcmVcblx0fSkpO1xuXHR0aGlzLl9tb3JlQ29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtbW9yZS1jb250YWluZXInKTtcblx0dGhpcy5fbW9yZUNvbnRhaW5lci5yZXBsYWNlV2l0aCh0aGlzLl9tb3JlRWxlbWVudCk7XG5cdC8qIG1ha2Ugc3VyZSB0aGUgRE9NIGlzIHVwZGF0ZWQgYXQgdGhpcyB0aW1lICovXG5cdHRoaXMuX21vcmVFbGVtZW50LmNzcygnaGVpZ2h0Jyk7XG59O1xuXG4vKipcbiAqIENyZXRlcyBhIG5ldyBmYWNldCBiYXNlZCBvbiB0aGUgc3BlY2lmaWVkIHNwZWMgYW5kIGFwcGVuZHMgaXQgdG8gdGhpcyBncm91cC5cbiAqXG4gKiBAbWV0aG9kIF9jcmVhdGVOZXdGYWNldFxuICogQHBhcmFtIHtPYmplY3R9IGZhY2V0U3BlYyAtIERhdGEgc3BlY2lmaWNhdGlvbiBmb3IgdGhlIGZhY2V0IHRvIGNyZWF0ZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBncm91cEtleSAtIFRoZSBncm91cCBrZXkgdG8gY3JlYXRlIHRoZSBmYWNldCB3aXRoLlxuICogQHBhcmFtIHtib29sZWFuPX0gaGlkZGVuIC0gU3BlY2lmaWVzIGlmIHRoZSBuZXdseSBjcmVhdGVkIGZhY2V0IHNob3VsZCBiZSBjcmVhdGVkIGhpZGRlbi5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fY3JlYXRlTmV3RmFjZXQgPSBmdW5jdGlvbiAoZmFjZXRTcGVjLCBncm91cEtleSwgaGlkZGVuKSB7XG5cdGlmICgnaGlzdG9ncmFtJyBpbiBmYWNldFNwZWMpIHtcblx0XHQvLyBjcmVhdGUgYSBob3Jpem9udGFsIGZhY2V0XG5cdFx0cmV0dXJuIG5ldyBGYWNldEhvcml6b250YWwodGhpcy5fZmFjZXRDb250YWluZXIsIHRoaXMsIF8uZXh0ZW5kKGZhY2V0U3BlYywge1xuXHRcdFx0a2V5OiBncm91cEtleSxcblx0XHRcdGhpZGRlbjogaGlkZGVuXG5cdFx0fSkpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIGNyZWF0ZSBhIHZlcnRpY2FsIGZhY2V0XG5cdFx0cmV0dXJuIG5ldyBGYWNldFZlcnRpY2FsKHRoaXMuX2ZhY2V0Q29udGFpbmVyLCB0aGlzLCBfLmV4dGVuZChmYWNldFNwZWMsIHtcblx0XHRcdGtleTogZ3JvdXBLZXksXG5cdFx0XHR0b3RhbDogdGhpcy5fdG90YWwsXG5cdFx0XHRzZWFyY2g6IHRoaXMuX29wdGlvbnMuc2VhcmNoLFxuXHRcdFx0aGlkZGVuOiBoaWRkZW5cblx0XHR9KSk7XG5cdH1cbn07XG5cbi8qKlxuICogVmlzdWFsbHkgZXhwYW5kcyBvciBjb2xsYXBzZXMgdGhpcyBncm91cC4gQ2FuIGJlIHVzZWQgdG8gaGFuZGxlIGFuIGlucHV0IGV2ZW50LlxuICpcbiAqIEBtZXRob2QgX3RvZ2dsZUNvbGxhcHNlRXhwYW5kXG4gKiBAcGFyYW0ge0V2ZW50PX0gZXZ0IC0gVGhlIGV2ZW50IGJlaW5nIGhhbmRsZSwgaWYgYW55LlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX3RvZ2dsZUNvbGxhcHNlRXhwYW5kID0gZnVuY3Rpb24gKGV2dCkge1xuXHRpZiAoZXZ0KSB7XG5cdFx0ZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0ZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuXHR9XG5cblx0dGhpcy5jb2xsYXBzZWQgPSAhdGhpcy5jb2xsYXBzZWQ7XG5cdGlmICh0aGlzLmNvbGxhcHNlZCkge1xuXHRcdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6Y29sbGFwc2UnLCBldnQsIHRoaXMuX2tleSk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDpleHBhbmQnLCBldnQsIHRoaXMuX2tleSk7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEFkZHMgb3IgcmVtb3ZlcyB0aGUgY29sbGFwc2VkIGNsYXNzZXMgdG8gdGhlIHJlbGV2YW50IGVsZW1lbnRzIGluIHRoaXMgZ3JvdXAuXG4gKiBXQVJOSU5HOiBEbyBub3QgY2FsbCB0aGlzIGZ1bmN0aW9uLCB0aGlzIGlzIGhlcmUgZm9yIHJlYWRhYmlsaXR5IHB1cnBvc2VzLlxuICogRm9yIG1vcmUgaW5mbyAtIGh0dHBzOi8vc3Rhc2gudW5jaGFydGVkLnNvZnR3YXJlL3Byb2plY3RzL1NUT1JJRVMvcmVwb3MvZmFjZXRzL3B1bGwtcmVxdWVzdHMvNDIvb3ZlcnZpZXdcbiAqXG4gKiBAbWV0aG9kIF9zZXRDb2xsYXBzZWRDbGFzc2VzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGlzQ29sbGFwc2VkIC0gSXMgdGhlIGdyb3VwIGNvbGxhcHNlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gc2hvd0VsbGlwc2lzIC0gV2hlbiBjb2xsYXBzZWQsIHNob3VsZCB0aGUgZWxsaXBzaXMgYmUgc2hvd24uXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX3NldENvbGxhcHNlZENsYXNzZXMgPSBmdW5jdGlvbiAoaXNDb2xsYXBzZWQsIHNob3dFbGxpcHNpcykge1xuXHR2YXIgZ3JvdXBDb2xsYXBzZUljb24gPSB0aGlzLl9lbGVtZW50LmZpbmQoJy50b2dnbGUnKSxcblx0XHRncm91cEVsbGlwc2lzID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtZmFjZXQtZWxsaXBzaXMnKTtcblxuXHRpZiAoaXNDb2xsYXBzZWQpIHtcblx0XHQvKiBhZGQgdGhlIGNvbGxhcHNlZCBjbGFzcyB0byB0aGUgZ3JvdXAgKi9cblx0XHR0aGlzLl9lbGVtZW50LmFkZENsYXNzKENPTExBUFNFRF9DTEFTUyk7XG5cblx0XHQvKiBtYWtlIHN1cmUgdGhlIGljb24gaXMgY2hlY2tlZCAqL1xuXHRcdGdyb3VwQ29sbGFwc2VJY29uLnJlbW92ZUNsYXNzKENIRUNLRURfVE9HR0xFX0NMQVNTKTtcblx0XHRncm91cENvbGxhcHNlSWNvbi5hZGRDbGFzcyhVTkNIRUNLRURfVE9HR0xFX0NMQVNTKTtcblxuXHRcdC8qIGlmIHRoZXJlIGFyZSBtb3JlIHRoYW4gdGhyZWUgZmFjZXRzIHNob3cgdGhlIGVsbGlwc2lzICovXG5cdFx0aWYgKHNob3dFbGxpcHNpcykge1xuXHRcdFx0Z3JvdXBFbGxpcHNpcy5hZGRDbGFzcyhFTExJUFNJU19WSVNJQkxFX0NMQVNTKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0LyogcmVtb3ZlIHRoZSBjb2xsYXBzZWQgY2xhc3MgKi9cblx0XHR0aGlzLl9lbGVtZW50LnJlbW92ZUNsYXNzKENPTExBUFNFRF9DTEFTUyk7XG5cblx0XHQvKiBtYWtlIHN1cmUgdGhlIGljb24gaXMgdW5jaGVja2VkICovXG5cdFx0Z3JvdXBDb2xsYXBzZUljb24ucmVtb3ZlQ2xhc3MoVU5DSEVDS0VEX1RPR0dMRV9DTEFTUyk7XG5cdFx0Z3JvdXBDb2xsYXBzZUljb24uYWRkQ2xhc3MoQ0hFQ0tFRF9UT0dHTEVfQ0xBU1MpO1xuXG5cdFx0LyogcmVtb3ZlIHRoZSBlbGxpcHNpcyAqL1xuXHRcdGdyb3VwRWxsaXBzaXMucmVtb3ZlQ2xhc3MoRUxMSVBTSVNfVklTSUJMRV9DTEFTUyk7XG5cdH1cbn07XG5cbi8qKlxuICogU2V0cyB0aGUgYWJicmViaWF0ZWQgYW5kL29yIGhpZGVuIHN0YXRlIG9mIHRoZSBmYWNldHMgaW4gdGhpcyBncm91cCBkZXBlbmRpbmcgb24gdGhlIHBhcmFtZXRlcnMgcGFzc2VkLlxuICogV0FSTklORzogRG8gbm90IGNhbGwgdGhpcyBmdW5jdGlvbiwgdGhpcyBpcyBoZXJlIGZvciByZWFkYWJpbGl0eSBwdXJwb3Nlcy5cbiAqIEZvciBtb3JlIGluZm8gLSBodHRwczovL3N0YXNoLnVuY2hhcnRlZC5zb2Z0d2FyZS9wcm9qZWN0cy9TVE9SSUVTL3JlcG9zL2ZhY2V0cy9wdWxsLXJlcXVlc3RzLzQyL292ZXJ2aWV3XG4gKlxuICogQG1ldGhvZCBfc2V0QWJicmV2aWF0ZUFuZEhpZGVGYWNldHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWJicmV2aWF0ZWQgLSBTaG91bGQgdGhlIGZhY2V0cyBiZSBhYmJyZXZpYXRlZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBtYXhGYWNldHNUb0FiYnJldmlhdGUgLSBNYXhpbXVtIG51bWJlciBvZiBmYWNldHMgdG8gYWJicmV2aWF0ZSwgYW55IGZhY2V0IGFmdGVyIHRoaXMgbnVtYmVyIHdpbGwgYmUgaGlkZGVuLlxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9zZXRBYmJyZXZpYXRlQW5kSGlkZUZhY2V0cyA9IGZ1bmN0aW9uIChhYmJyZXZpYXRlZCwgbWF4RmFjZXRzVG9BYmJyZXZpYXRlKSB7XG5cdHRoaXMuZmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0LCBpKSB7XG5cdFx0aWYgKGkgPCBtYXhGYWNldHNUb0FiYnJldmlhdGUpIHtcblx0XHRcdGZhY2V0LmFiYnJldmlhdGVkID0gYWJicmV2aWF0ZWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZhY2V0LnZpc2libGUgPSAhYWJicmV2aWF0ZWQ7XG5cdFx0fVxuXHR9KTtcbn07XG5cbi8qKlxuICogSGFuZGxlciBmdW5jdGlvbiBjYWxsZWQgd2hlbiB0aGUgdXNlciBjbGljayBvbiB0aGUgJ21vcmUnIGxpbmsuXG4gKlxuICogQG1ldGhvZCBfb25Nb3JlXG4gKiBAcGFyYW0ge0V2ZW50fSBldnQgLSBUaGUgZXZlbnQgYmVpbmcgaGFuZGxlZC5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fb25Nb3JlID0gZnVuY3Rpb24gKGV2dCkge1xuXHRldnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuXHR2YXIgaW5kZXggPSBldnQuY3VycmVudFRhcmdldC5nZXRBdHRyaWJ1dGUoJ2luZGV4Jyk7XG5cdGluZGV4ID0gKGluZGV4ICE9PSBudWxsKSA/IHBhcnNlSW50KGluZGV4KSA6IG51bGw7XG5cdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6bW9yZScsIGV2dCwgdGhpcy5fa2V5LCBpbmRleCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXIgZnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIHVzZXIgY2xpY2sgb24gdGhlICdvdGhlcicgZmFjZXQuXG4gKlxuICogQG1ldGhvZCBfb25PdGhlclxuICogQHBhcmFtIHtFdmVudH0gZXZ0IC0gVGhlIGV2ZW50IGJlaW5nIGhhbmRsZWQuXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX29uT3RoZXIgPSBmdW5jdGlvbiAoZXZ0KSB7XG5cdGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6b3RoZXInLCBldnQsIHRoaXMuX2tleSk7XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGhhbmRsZSBhIG1vdXNlIGRvd24gZXZlbnQgdG8gcHJlcGFyZSBkcmFnZ2luZy5cbiAqXG4gKiBAbWV0aG9kIF9oYW5kbGVIZWFkZXJNb3VzZURvd25cbiAqIEBwYXJhbSB7RXZlbnR9IGV2dCAtIFRoZSBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faGFuZGxlSGVhZGVyTW91c2VEb3duID0gZnVuY3Rpb24gKGV2dCkge1xuXHRpZiAoZXZ0LmJ1dHRvbiA9PT0gMCkge1xuXHRcdGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHRoaXMuX2NhbkRyYWcgPSB0cnVlO1xuXHRcdHRoaXMuX2RyYWdnaW5nID0gZmFsc2U7XG5cdFx0dGhpcy5fZHJhZ2dpbmdYID0gZXZ0LmNsaWVudFg7XG5cdFx0dGhpcy5fZHJhZ2dpbmdZID0gZXZ0LmNsaWVudFk7XG5cdFx0dGhpcy5fZHJhZ2dpbmdZT2Zmc2V0ID0gMDtcblx0XHR0aGlzLl9kcmFnZ2luZ0dyb3VwVG9wID0gdGhpcy5fZWxlbWVudC5vZmZzZXQoKS50b3A7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBoYW5kbGUgYSBtb3VzZSB1cCBldmVudCBhbmQgZW5kIGRyYWdnaW5nLlxuICpcbiAqIEBtZXRob2QgX2hhbmRsZUhlYWRlck1vdXNlVXBcbiAqIEBwYXJhbSB7RXZlbnR9IGV2dCAtIFRoZSBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faGFuZGxlSGVhZGVyTW91c2VVcCA9IGZ1bmN0aW9uIChldnQpIHtcblx0dGhpcy5fY2FuRHJhZyA9IGZhbHNlO1xuXHRpZiAodGhpcy5fZHJhZ2dpbmcpIHtcblx0XHRldnQucHJldmVudERlZmF1bHQoKTtcblx0XHR0aGlzLl9kcmFnZ2luZyA9IGZhbHNlO1xuXHRcdC8qIHJlc2V0IHBvc2l0aW9uICovXG5cdFx0dGhpcy5fZ3JvdXBDb250ZW50LnJlbW92ZUF0dHIoJ3N0eWxlJyk7XG5cdFx0LyogdHJpZ2dlciBkcmFnZ2luZyBlbmQgZXZlbnQgKi9cblx0XHR0aGlzLmVtaXQoJ2ZhY2V0LWdyb3VwOmRyYWdnaW5nOmVuZCcsIGV2dCwgdGhpcy5fa2V5KTtcblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaGFuZGxlIGEgbW91c2UgbW92ZSBldmVudCBhbmQgcGVyZm9ybSBkcmFnZ2luZy5cbiAqXG4gKiBAbWV0aG9kIF9oYW5kbGVIZWFkZXJNb3VzZU1vdmVcbiAqIEBwYXJhbSB7RXZlbnR9IGV2dCAtIFRoZSBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faGFuZGxlSGVhZGVyTW91c2VNb3ZlID0gZnVuY3Rpb24gKGV2dCkge1xuXHRpZiAodGhpcy5fY2FuRHJhZykge1xuXHRcdGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGlmICghdGhpcy5fZHJhZ2dpbmcpIHtcblx0XHRcdHRoaXMuX3N0YXJ0RHJhZ2dpbmcoZXZ0KTtcblx0XHR9XG5cblx0XHR0aGlzLl9wZXJmb3JtRHJhZ2dpbmcoZXZ0KTtcblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBoYW5kbGUgYSB0b3VjaCBzdGFydCBldmVudC5cbiAqXG4gKiBAbWV0aG9kIF9oYW5kbGVIZWFkZXJUb3VjaFN0YXJ0XG4gKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIFRoZSBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX2hhbmRsZUhlYWRlclRvdWNoU3RhcnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0dmFyIHRvdWNoRXZlbnQgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xuXHRpZiAodG91Y2hFdmVudC50b3VjaGVzLmxlbmd0aCA8IDIgJiYgdGhpcy5fdHJhY2tpbmdUb3VjaElEID09PSBudWxsKSB7XG5cdFx0dmFyIHRvdWNoID0gZXZlbnQub3JpZ2luYWxFdmVudC5jaGFuZ2VkVG91Y2hlc1swXTtcblx0XHR0aGlzLl9jYW5EcmFnID0gdHJ1ZTtcblx0XHR0aGlzLl90cmFja2luZ1RvdWNoSUQgPSB0b3VjaC5pZGVudGlmaWVyO1xuXHRcdHRoaXMuX3RvdWNoU3RhcnRUaW1lID0gZXZlbnQudGltZVN0YW1wO1xuXHRcdHRoaXMuX2RyYWdnaW5nWCA9IHRvdWNoLmNsaWVudFg7XG5cdFx0dGhpcy5fZHJhZ2dpbmdZID0gdG91Y2guY2xpZW50WTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9jYW5EcmFnID0gZmFsc2U7XG5cdFx0dGhpcy5fdHJhY2tpbmdUb3VjaElEID0gbnVsbDtcblx0XHR0aGlzLl90b3VjaFN0YXJ0VGltZSA9IDA7XG5cdH1cblx0dGhpcy5fZHJhZ2dpbmcgPSBmYWxzZTtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaGFuZGxlIGEgdG91Y2ggbW92ZSBldmVudC5cbiAqXG4gKiBAbWV0aG9kIF9oYW5kbGVIZWFkZXJUb3VjaE1vdmVcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gVGhlIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faGFuZGxlSGVhZGVyVG91Y2hNb3ZlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdGlmICh0aGlzLl9jYW5EcmFnICYmIHRoaXMuX3RyYWNraW5nVG91Y2hJRCAhPT0gbnVsbCkge1xuXHRcdHZhciB0b3VjaGVzID0gZXZlbnQub3JpZ2luYWxFdmVudC5jaGFuZ2VkVG91Y2hlcztcblx0XHRmb3IgKHZhciBpID0gMCwgbiA9IHRvdWNoZXMubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0XHR2YXIgdG91Y2ggPSB0b3VjaGVzW2ldO1xuXHRcdFx0aWYgKHRvdWNoLmlkZW50aWZpZXIgPT09IHRoaXMuX3RyYWNraW5nVG91Y2hJRCkge1xuXHRcdFx0XHRpZiAodGhpcy5fZHJhZ2dpbmcpIHtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdHRoaXMuX3BlcmZvcm1EcmFnZ2luZyh0b3VjaCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHRpbWVFbGFwc2VkID0gZXZlbnQudGltZVN0YW1wIC0gdGhpcy5fdG91Y2hTdGFydFRpbWU7XG5cdFx0XHRcdFx0dmFyIGRpc3RhbmNlTW92ZWQgPSBNYXRoLnNxcnQoTWF0aC5wb3codG91Y2guY2xpZW50WCAtIHRoaXMuX2RyYWdnaW5nWCwgMikgKyBNYXRoLnBvdyh0b3VjaC5jbGllbnRZIC0gdGhpcy5fZHJhZ2dpbmdZLCAyKSk7XG5cdFx0XHRcdFx0aWYgKHRpbWVFbGFwc2VkID4gMjAwKSB7XG5cdFx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0dGhpcy5fZHJhZ2dpbmdZT2Zmc2V0ID0gMDtcblx0XHRcdFx0XHRcdHRoaXMuX2RyYWdnaW5nR3JvdXBUb3AgPSB0aGlzLl9lbGVtZW50Lm9mZnNldCgpLnRvcDtcblx0XHRcdFx0XHRcdHRoaXMuX3N0YXJ0RHJhZ2dpbmcoZXZlbnQpO1xuXHRcdFx0XHRcdFx0dGhpcy5fcGVyZm9ybURyYWdnaW5nKHRvdWNoKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGRpc3RhbmNlTW92ZWQgPiA3KSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9jYW5EcmFnID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR0aGlzLl90cmFja2luZ1RvdWNoSUQgPSBudWxsO1xuXHRcdFx0XHRcdFx0dGhpcy5fdG91Y2hTdGFydFRpbWUgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaGFuZGxlIGEgdG91Y2ggZW5kIGV2ZW50LlxuICpcbiAqIEBtZXRob2QgX2hhbmRsZUhlYWRlclRvdWNoRW5kXG4gKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIFRoZSBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX2hhbmRsZUhlYWRlclRvdWNoRW5kID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdHRoaXMuX2NhbkRyYWcgPSBmYWxzZTtcblx0dGhpcy5fdHJhY2tpbmdUb3VjaElEID0gbnVsbDtcblx0dGhpcy5fdG91Y2hTdGFydFRpbWUgPSAwO1xuXHRpZiAodGhpcy5fZHJhZ2dpbmcpIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHRoaXMuX2RyYWdnaW5nID0gZmFsc2U7XG5cdFx0LyogcmVzZXQgcG9zaXRpb24gKi9cblx0XHR0aGlzLl9ncm91cENvbnRlbnQucmVtb3ZlQXR0cignc3R5bGUnKTtcblx0XHQvKiB0cmlnZ2VyIGRyYWdnaW5nIGVuZCBldmVudCAqL1xuXHRcdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6ZHJhZ2dpbmc6ZW5kJywgZXZlbnQsIHRoaXMuX2tleSk7XG5cdH1cbn07XG5cbi8qKlxuICogVHJhbnNpdGlvbiBlbmQgZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIEV2ZW50IHRvIGhhbmRsZS5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faGFuZGxlVHJhbnNpdGlvbkVuZCA9IGZ1bmN0aW9uIChldmVudCkge1xuXHR2YXIgcHJvcGVydHkgPSBldmVudC5vcmlnaW5hbEV2ZW50LnByb3BlcnR5TmFtZTtcblx0aWYgKGV2ZW50LnRhcmdldCA9PT0gdGhpcy5fbW9yZUVsZW1lbnQuZ2V0KDApICYmIHByb3BlcnR5ID09PSAnb3BhY2l0eScpIHtcblx0XHRpZiAodGhpcy5jb2xsYXBzZWQpIHtcblx0XHRcdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6YW5pbWF0aW9uOmNvbGxhcHNlLW9uJywgZXZlbnQsIHRoaXMuX2tleSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6YW5pbWF0aW9uOmNvbGxhcHNlLW9mZicsIGV2ZW50LCB0aGlzLl9rZXkpO1xuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBTZXRzIHVwIHRoZSBncm91cCB0byBiZSBkcmFnZ2VkLlxuICpcbiAqIEBtZXRob2QgX3N0YXJ0RHJhZ2dpbmdcbiAqIEBwYXJhbSB7RXZlbnR8VG91Y2h9IGV2ZW50IC0gVGhlIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBkcmFnLlxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9zdGFydERyYWdnaW5nID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdGlmICghdGhpcy5fZHJhZ2dpbmcpIHtcblx0XHR0aGlzLl9kcmFnZ2luZyA9IHRydWU7XG5cdFx0Ly8gZHJhZ2dpbmcgc2V0dXAgLy9cblx0XHR0aGlzLl9ncm91cENvbnRlbnQuY3NzKHtcblx0XHRcdHBvc2l0aW9uOiAncmVsYXRpdmUnLFxuXHRcdFx0dG9wOiAwLFxuXHRcdFx0bGVmdDogMCxcblx0XHRcdCd6LWluZGV4JzogOTk5XG5cdFx0fSk7XG5cdFx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDpkcmFnZ2luZzpzdGFydCcsIGV2ZW50LCB0aGlzLl9rZXkpO1xuXHR9XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIGEgZHJhZ2dpbmcgYWN0aW9uIG9uIHRoaXMgZ3JvdXAgYmFzZWQgb24gdGhlIHNwZWNpZmllZCBldmVudC5cbiAqXG4gKiBAbWV0aG9kIF9wZXJmb3JtRHJhZ2dpbmdcbiAqIEBwYXJhbSB7RXZlbnR8VG91Y2h9IGV2ZW50IC0gdGhlIGV2ZW50IG9yIHRvdWNoIHRoYXQgc2hvdWxkIGJlIHVzZWQgdG8gY2FsY3VsYXRlIHRoZSBkcmFnZ2luZyBkaXN0YW5jZS5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fcGVyZm9ybURyYWdnaW5nID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdC8qIGNhbGN1bGF0ZSB0aGUgZ3JvdXAgZGltZW5zaW9ucyAqL1xuXHR2YXIgZ3JvdXBPZmZzZXQgPSB0aGlzLl9lbGVtZW50Lm9mZnNldCgpO1xuXHR2YXIgZ3JvdXBUb3AgPSBncm91cE9mZnNldC50b3A7XG5cdHZhciBncm91cEhlaWdodCA9IHRoaXMuX2VsZW1lbnQuaGVpZ2h0KCk7XG5cblx0LyogY2FsY3VsYXRlIHRoZSBuZXcgcG9zaXRpb24gKi9cblx0dmFyIG5ld1RvcCwgbmV3TGVmdDtcblx0aWYgKGV2ZW50LnR5cGUgPT09ICdzY3JvbGwnKSB7XG5cdFx0dmFyIGNvbnRlbnRPZmZzZXQgPSB0aGlzLl9ncm91cENvbnRlbnQub2Zmc2V0KCk7XG5cdFx0bmV3VG9wID0gY29udGVudE9mZnNldC50b3AgLSBncm91cFRvcCAtIHRoaXMuX2RyYWdnaW5nWU9mZnNldDtcblx0XHRuZXdMZWZ0ID0gY29udGVudE9mZnNldC5sZWZ0IC0gZ3JvdXBPZmZzZXQubGVmdDtcblx0fSBlbHNlIHtcblx0XHRuZXdUb3AgPSBldmVudC5jbGllbnRZIC0gdGhpcy5fZHJhZ2dpbmdZO1xuXHRcdG5ld0xlZnQgPSBldmVudC5jbGllbnRYIC0gdGhpcy5fZHJhZ2dpbmdYO1xuXHR9XG5cblx0LyogY2FsY3VsYXRlIHRoZSBzY3JvbGwgb2Zmc2V0LCBpZiBhbnkgKi9cblx0dGhpcy5fZHJhZ2dpbmdZT2Zmc2V0ICs9IHRoaXMuX2RyYWdnaW5nR3JvdXBUb3AgLSBncm91cFRvcDtcblx0dGhpcy5fZHJhZ2dpbmdHcm91cFRvcCA9IGdyb3VwVG9wO1xuXHRuZXdUb3AgKz0gdGhpcy5fZHJhZ2dpbmdZT2Zmc2V0O1xuXG5cdC8qIGNhbGN1bGF0ZSB0aGUgY29udGVudCBkaW1lbnNpb25zICovXG5cdHZhciBjb250ZW50VG9wID0gZ3JvdXBUb3AgKyBuZXdUb3A7XG5cdHZhciBjb250ZW50TWlkZGxlID0gY29udGVudFRvcCArIChncm91cEhlaWdodCAqIDAuNSk7XG5cblx0LyogcmV0cmlldmUgYWxsIHRoZSBncm91cHMgKi9cblx0dmFyIGdyb3VwcyA9IHRoaXMuX3dpZGdldC5fZ3JvdXBzO1xuXG5cdC8qIGl0ZXJhdGUgdGhyb3VnaCB0aGUgZ3JvdXBzICovXG5cdGZvciAodmFyIGkgPSAwLCBuID0gZ3JvdXBzLmxlbmd0aDsgaSA8IG47ICsraSkge1xuXHRcdHZhciBncm91cCA9IGdyb3Vwc1tpXTtcblx0XHQvKiBnZXQgdGhlIHRhcmdldCBncm91cCBtZWFzdXJlbWVudHMgKi9cblx0XHR2YXIgdGFyZ2V0SGVpZ2h0ID0gZ3JvdXAuX2VsZW1lbnQuaGVpZ2h0KCk7XG5cdFx0dmFyIHRhcmdldFRvcCA9IGdyb3VwLl9lbGVtZW50Lm9mZnNldCgpLnRvcDtcblx0XHR2YXIgdGFyZ2V0Qm90dG9tID0gdGFyZ2V0VG9wICsgdGFyZ2V0SGVpZ2h0O1xuXHRcdHZhciB0YXJnZXRBcmVhVGhyZXNob2xkID0gTWF0aC5taW4odGFyZ2V0SGVpZ2h0LCBncm91cEhlaWdodCkgKiAwLjU7XG5cblx0XHRpZiAoKGdyb3VwVG9wID4gdGFyZ2V0VG9wICYmIGNvbnRlbnRNaWRkbGUgPj0gdGFyZ2V0VG9wIC0gdGFyZ2V0QXJlYVRocmVzaG9sZCAmJiBjb250ZW50TWlkZGxlIDw9IHRhcmdldFRvcCArIHRhcmdldEFyZWFUaHJlc2hvbGQpIHx8XG5cdFx0XHQoZ3JvdXBUb3AgPCB0YXJnZXRUb3AgJiYgY29udGVudE1pZGRsZSA+PSB0YXJnZXRCb3R0b20gLSB0YXJnZXRBcmVhVGhyZXNob2xkICYmIGNvbnRlbnRNaWRkbGUgPD0gdGFyZ2V0Qm90dG9tICsgdGFyZ2V0QXJlYVRocmVzaG9sZCkpe1xuXHRcdFx0aWYgKGdyb3VwICE9PSB0aGlzKSB7XG5cdFx0XHRcdHZhciB0YXJnZXRPZmZzZXQgPSAwO1xuXHRcdFx0XHRpZiAodGFyZ2V0VG9wIDwgZ3JvdXBUb3ApIHtcblx0XHRcdFx0XHRncm91cC5fZWxlbWVudC5iZWZvcmUodGhpcy5fZWxlbWVudCk7XG5cdFx0XHRcdFx0dGFyZ2V0T2Zmc2V0ID0gKHRhcmdldFRvcCAtIGdyb3VwVG9wKTtcblx0XHRcdFx0XHR0aGlzLl9kcmFnZ2luZ1kgKz0gdGFyZ2V0T2Zmc2V0O1xuXHRcdFx0XHRcdG5ld1RvcCAtPSB0YXJnZXRPZmZzZXQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Z3JvdXAuX2VsZW1lbnQuYWZ0ZXIodGhpcy5fZWxlbWVudCk7XG5cdFx0XHRcdFx0dGFyZ2V0T2Zmc2V0ID0gKHRhcmdldFRvcCAtIGdyb3VwVG9wKSAtIChncm91cEhlaWdodCAtIHRhcmdldEhlaWdodCk7XG5cdFx0XHRcdFx0dGhpcy5fZHJhZ2dpbmdZICs9IHRhcmdldE9mZnNldDtcblx0XHRcdFx0XHRuZXdUb3AgLT0gdGFyZ2V0T2Zmc2V0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuX2RyYWdnaW5nR3JvdXBUb3AgPSB0aGlzLl9lbGVtZW50Lm9mZnNldCgpLnRvcDtcblxuXHRcdFx0XHQvKiB1cGRhdGUgdGhlIGdyb3VwIGluZGljZXMgKi9cblx0XHRcdFx0dGhpcy5fd2lkZ2V0LnVwZGF0ZUdyb3VwSW5kaWNlcygpO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0LyogYXBwbHkgdGhlIG5ldyBwb3NpdGlvbiAqL1xuXHR0aGlzLl9ncm91cENvbnRlbnQuY3NzKHtcblx0XHR0b3A6IG5ld1RvcCxcblx0XHRsZWZ0OiBuZXdMZWZ0XG5cdH0pO1xuXG5cdC8qIHRyaWdnZXIgdGhlIGRyYWcgbW92ZSBldmVudCAqL1xuXHR0aGlzLmVtaXQoJ2ZhY2V0LWdyb3VwOmRyYWdnaW5nOm1vdmUnLCBldmVudCwgdGhpcy5fa2V5KTtcbn07XG5cbi8qKlxuICogQGV4cG9ydFxuICogQHR5cGUge0dyb3VwfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwO1xuIiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwvdXRpbCcpO1xudmFyIElCaW5kYWJsZSA9IHJlcXVpcmUoJy4vSUJpbmRhYmxlJyk7XG52YXIgVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvcXVlcnlncm91cCcpO1xudmFyIEZhY2V0VmVydGljYWwgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0VmVydGljYWwnKTtcbnZhciBGYWNldEhvcml6b250YWwgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0SG9yaXpvbnRhbCcpO1xudmFyIEdyb3VwID0gcmVxdWlyZSgnLi9ncm91cCcpO1xudmFyIENvbG9yID0gcmVxdWlyZSgnLi4vdXRpbC9jb2xvcicpO1xuXG52YXIgREVGQVVMVF9DT0xPUiA9ICcjOEFBRDIwJztcbnZhciBDT0xPUl9TVEVQID0gMC4yO1xuXG4vKipcbiAqIFNwZWNpYWwgZ3JvdXAgY2xhc3MgdXNlZCB0byByZXByZXNlbnQgdGhlIHF1ZXJpZXMgaW4gdGhlIGZhY2V0cyB3aWRnZXQuXG4gKlxuICogQGNsYXNzIFF1ZXJ5R3JvdXBcbiAqIEBwYXJhbSB7anF1ZXJ5fSBjb250YWluZXIgLSBUaGUgY29udGFpbmVyIHdoZXJlIHRoaXMgZ3JvdXAgd2lsbCBiZSBhZGRlZC5cbiAqIEBwYXJhbSB7QXJyYXl9IHF1ZXJpZXMgLSBBbiBhcnJheSB3aXRoIHRoZSBxdWVyaWVzIHRvIGJlIGFkZGVkIHRvIHRoaXMgZ3JvdXAuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUXVlcnlHcm91cChjb250YWluZXIsIHF1ZXJpZXMpIHtcblx0Lyogc2tpcCBpbml0aWFsaXppbmcgdGhlIGBHcm91cGAgKi9cblx0SUJpbmRhYmxlLmNhbGwodGhpcyk7XG5cblx0dGhpcy5fZWxlbWVudCA9ICQoVGVtcGxhdGUoKSk7XG5cblx0Y29udGFpbmVyLmFwcGVuZCh0aGlzLl9lbGVtZW50KTtcblxuXHR0aGlzLl9mYWNldENvbnRhaW5lciA9IHRoaXMuX2VsZW1lbnQuZmluZCgnLmdyb3VwLWZhY2V0LWNvbnRhaW5lcicpO1xuXG5cdC8vIEluaXRpYWxpemUgcXVlcmllcyBhbmQgZmFjZXRzXG5cdHRoaXMuX2ZhY2V0cyA9IFtdO1xuXHR0aGlzLl9xdWVyaWVzID0gW107XG5cdHRoaXMuX3RvdGFsID0gMDtcblx0aWYgKHF1ZXJpZXMgJiYgcXVlcmllcy5sZW5ndGggPiAwKSB7XG5cdFx0cXVlcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChxdWVyeSkge1xuXHRcdFx0dGhpcy5hZGRRdWVyeShxdWVyeSk7XG5cdFx0fSwgdGhpcyk7XG5cdH1cblxuXHR0aGlzLl91cGRhdGVGYWNldFRvdGFscygpO1xuXG5cdGlmICh0aGlzLl9xdWVyaWVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xuXHR9XG59XG5cbi8qKlxuICogQGluaGVyaXRhbmNlIHtHcm91cH1cbiAqL1xuUXVlcnlHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEdyb3VwLnByb3RvdHlwZSk7XG5RdWVyeUdyb3VwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFF1ZXJ5R3JvdXA7XG5cbi8qKlxuICogQSBRdWVyeUdyb3VwJ3Mga2V5IGlzIGFsd2F5cyBgcXVlcmllc2BcbiAqXG4gKiBAcHJvcGVydHkga2V5XG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShRdWVyeUdyb3VwLnByb3RvdHlwZSwgJ2tleScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIFwicXVlcmllc1wiO1xuXHR9XG59KTtcblxuLyoqXG4gKiBNYWtlcyBzdXJlIHRoYXQgYWxsIGZhY2V0cyBpbiB0aGlzIGdyb3VwIGNhbiBiZSBzZWxlY3RlZC5cbiAqXG4gKiBAbWV0aG9kIGluaXRpYWxpemVTZWxlY3Rpb25cbiAqL1xuUXVlcnlHcm91cC5wcm90b3R5cGUuaW5pdGlhbGl6ZVNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fZmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0KSB7XG5cdFx0Ly8gdGVtcG9yYXJ5IGV4Y2VwdGlvbiB1bnRpbCBjYWxsZXJzIGFyZSBhYmxlIHRvIGNhbGN1bGF0ZWQgc2VsZWN0ZWQgY291bnRzIG9uIHNpbXBsZSBxdWVyaWVzXG5cdFx0aWYgKGZhY2V0LmtleSAhPT0gJyonKSB7XG5cdFx0XHRmYWNldC5zZWxlY3QoMCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbi8qKlxuICogRGVzZWxlY3RzIGFsbCBmYWNldHMgaW4gdGhpcyBncm91cC5cbiAqXG4gKiBAbWV0aG9kIGNsZWFyU2VsZWN0aW9uXG4gKi9cblF1ZXJ5R3JvdXAucHJvdG90eXBlLmNsZWFyU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXQpIHtcblx0XHRmYWNldC5kZXNlbGVjdCgpO1xuXHR9KTtcbn07XG5cbi8qKlxuICogVW5oaWdobGlnaHRzIGFsbCB0aGUgcXVlcmllcyBpbiB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgdW5oaWdobGlnaHRBbGxcbiAqL1xuUXVlcnlHcm91cC5wcm90b3R5cGUudW5oaWdobGlnaHRBbGwgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2ZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZhY2V0KSB7XG5cdFx0ZmFjZXQuaGlnaGxpZ2h0ZWQgPSBmYWxzZTtcblx0fSwgdGhpcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBxdWVyeSB0byB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgYWRkUXVlcnlcbiAqIEBwYXJhbSB7T2JqZWN0fSBxdWVyeSAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBxdWVyeSB0byBiZSBhZGRlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IHVwZGF0ZUZhY2V0VG90YWxzIC0gU2hvdWxkIHRoZSBmYWNldCB0b3RhbHMgYmUgdXBkYXRlZCBvbmNlIHRoZSBxdWVyeSBoYXMgYmVlbiBhZGRlZCB0byB0aGUgZ3JvdXAuXG4gKi9cblF1ZXJ5R3JvdXAucHJvdG90eXBlLmFkZFF1ZXJ5ID0gZnVuY3Rpb24gKHF1ZXJ5LCB1cGRhdGVGYWNldFRvdGFscykge1xuXHR0aGlzLl9xdWVyaWVzLnB1c2gocXVlcnkpO1xuXHR0aGlzLl90b3RhbCArPSBxdWVyeS5jb3VudDtcblxuXHRpZiAoIXF1ZXJ5Lmljb24pIHtcblx0XHRxdWVyeS5pY29uID0gdGhpcy5fZ2VuZXJhdGVJY29uKCk7XG5cdH1cblx0aWYgKCFxdWVyeS5pY29uLmNvbG9yKSB7XG5cdFx0cXVlcnkuaWNvbi5jb2xvciA9IHRoaXMuX2dlbmVyYXRlQ29sb3IoKTtcblx0fVxuXHRxdWVyeS5oaWRkZW4gPSB0cnVlO1xuXG5cdC8vIHNwZWNpZnkgdGhhdCB0aGlzIGlzIGEgcXVlcnkgZm9yIGRpc3BsYXlcblx0cXVlcnkuaXNRdWVyeSA9IHRydWU7XG5cblx0dmFyIEZhY2V0Q2xhc3MgPSAoJ2hpc3RvZ3JhbScgaW4gcXVlcnkpID8gRmFjZXRIb3Jpem9udGFsIDogRmFjZXRWZXJ0aWNhbDtcblx0dmFyIGZhY2V0ID0gbmV3IEZhY2V0Q2xhc3ModGhpcy5fZmFjZXRDb250YWluZXIsIHRoaXMsIHF1ZXJ5KTtcblx0dGhpcy5fZmFjZXRzLnB1c2goZmFjZXQpO1xuXHRmYWNldC52aXNpYmxlID0gdHJ1ZTtcblx0LyogZm9yd2FyZCBhbGwgdGhlIGV2ZW50cyBmcm9tIHRoaXMgZmFjZXQgKi9cblx0dGhpcy5mb3J3YXJkKGZhY2V0KTtcblxuXHRpZiAodXBkYXRlRmFjZXRUb3RhbHMpIHtcblx0XHR0aGlzLl91cGRhdGVGYWNldFRvdGFscygpO1xuXHR9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBxdWVyeSBmcm9tIHRoaXMgZ3JvdXAuXG4gKlxuICogQHBhcmFtIHsqfSBrZXkgLSBUaGUga2V5IG9mIHRoZSBxdWVyeSB0byByZW1vdmUuXG4gKiBAcGFyYW0geyp9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSB0byByZW1vdmUuXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSB1cGRhdGVGYWNldFRvdGFscyAtIFNob3VsZCB0aGUgZmFjZXQgdG90YWxzIGJlIHVwZGF0ZWQgb25jZSB0aGUgcXVlcnkgaGFzIGJlZW4gYWRkZWQgdG8gdGhlIGdyb3VwLlxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZS5yZW1vdmVRdWVyeSA9IGZ1bmN0aW9uIChrZXksIHZhbHVlLCB1cGRhdGVGYWNldFRvdGFscykge1xuXHR2YXIgZmFjZXQgPSB0aGlzLl9nZXRRdWVyeShrZXksIHZhbHVlKTtcblx0aWYgKGZhY2V0KSB7XG5cdFx0dmFyIHF1ZXJ5ID0gZmFjZXQuX3NwZWM7XG5cdFx0dmFyIHF1ZXJ5SW5kZXggPSB0aGlzLl9xdWVyaWVzLmluZGV4T2YocXVlcnkpO1xuXHRcdHZhciBmYWNldEluZGV4ID0gdGhpcy5fZmFjZXRzKGZhY2V0KTtcblx0XHRpZiAocXVlcnlJbmRleCA+PSAwICYmIGZhY2V0SW5kZXggPj0gMCkge1xuXHRcdFx0dGhpcy5fcXVlcmllcy5zcGxpY2UocXVlcnlJbmRleCwgMSk7XG5cdFx0XHR0aGlzLl9mYWNldHMuc3BsaWNlKGZhY2V0SW5kZXgsIDEpO1xuXHRcdFx0LyogZGVzdHJveWluZyBhIGZhY2V0IGF1dG9tYXRpY2FsbHkgdW5mb3J3YXJkcyBpdHMgZXZlbnRzICovXG5cdFx0XHRmYWNldC5kZXN0cm95KHRydWUpO1xuXG5cdFx0XHR0aGlzLl90b3RhbCAtPSBxdWVyeS5jb3VudDtcblx0XHRcdGlmICh1cGRhdGVGYWNldFRvdGFscykge1xuXHRcdFx0XHR0aGlzLl91cGRhdGVGYWNldFRvdGFscygpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBTZXRzIHRoaXMgZ3JvdXAgdG8gYmUgZ2FyYmFnZSBjb2xsZWN0ZWQgYnkgcmVtb3ZpbmcgYWxsIHJlZmVyZW5jZXMgdG8gZXZlbnQgaGFuZGxlcnMgYW5kIERPTSBlbGVtZW50cy5cbiAqIENhbGxzIGBkZXN0cm95YCBvbiBpdHMgZmFjZXRzLlxuICpcbiAqIEBtZXRob2QgZGVzdHJveVxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZikge1xuXHRcdC8qIGRlc3Ryb3lpbmcgYSBmYWNldCBhdXRvbWF0aWNhbGx5IHVuZm9yd2FyZHMgaXRzIGV2ZW50cyAqL1xuXHRcdGYuZGVzdHJveSgpO1xuXHR9KTtcblx0dGhpcy5fZmFjZXRzID0gW107XG5cdHRoaXMuX3F1ZXJpZXMgPSBbXTtcblx0dGhpcy5fZWxlbWVudC5yZW1vdmUoKTtcblx0SUJpbmRhYmxlLnByb3RvdHlwZS5kZXN0cm95LmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHRvdGFsIGluIGFsbCB0aGUgZmFjZXRzIGNvbnRhaW5lZCBpbiB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgX3VwZGF0ZUZhY2V0VG90YWxzXG4gKiBAcHJpdmF0ZVxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZS5fdXBkYXRlRmFjZXRUb3RhbHMgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2ZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChmYWNldCkge1xuXHRcdGZhY2V0LnRvdGFsID0gdGhpcy5fdG90YWw7XG5cdH0sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBmYWNldCByZXByZXNlbnRpbmcgdGhlIHF1ZXJ5IHdpdGggdGhlIHNwZWNpZmllZCBrZXkgYW5kIHZhbHVlLlxuICogTm90ZTogUXVlcnlHcm91cCB1c2VzIEZhY2V0IGludGVybmFsbHkgdG8gcmVwcmVzZW50IGVhY2ggcXVlcnkuXG4gKlxuICogQG1ldGhvZCBfZ2V0UXVlcnlcbiAqIEBwYXJhbSB7Kn0ga2V5IC0gVGhlIGtleSB0byBsb29rIGZvci5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gbG9vayBmb3IuXG4gKiBAcmV0dXJucyB7RmFjZXR8bnVsbH1cbiAqL1xuUXVlcnlHcm91cC5wcm90b3R5cGUuX2dldFF1ZXJ5ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0dmFyIGZhY2V0T2JqID0gdGhpcy5fZmFjZXRzLmZpbHRlcihmdW5jdGlvbiAoZikge1xuXHRcdHJldHVybiBmLmtleSA9PT0ga2V5ICYmIGYudmFsdWUgPT09IHZhbHVlO1xuXHR9KTtcblx0aWYgKGZhY2V0T2JqICYmIGZhY2V0T2JqLmxlbmd0aCA+IDApIHtcblx0XHRyZXR1cm4gZmFjZXRPYmpbMF07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGFuIGljb24gYW5kIGNvbG9yIGJhc2VkIG9uIHRoaXMgZ3JvdXAncyBjdXJyZW50IHN0YXRlLlxuICpcbiAqIEBtZXRob2QgX2dlbmVyYXRlSWNvblxuICogQHJldHVybnMge3tjbGFzczogc3RyaW5nLCBjb2xvcn19XG4gKiBAcHJpdmF0ZVxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZS5fZ2VuZXJhdGVJY29uID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4ge1xuXHRcdGNsYXNzOiAnZmEgZmEtc2VhcmNoJywgICAgICAgICAgLy8gVE9ETzogUmVtb3ZlIGZvbnQtYXdlc29tZSBkZXBlbmRlbmN5XG5cdFx0Y29sb3I6IHRoaXMuX2dlbmVyYXRlQ29sb3IoKVxuXHR9O1xufTtcblxuLyoqXG4gKiBHZW5yYXRlcyBhIGNvbG9yIGFuZCByZXR1cm5zIGl0IGFzIGEgaGV4IHN0cmluZy5cbiAqXG4gKiBAbWV0aG9kIF9nZW5lcmF0ZUNvbG9yXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICogQHByaXZhdGVcbiAqL1xuUXVlcnlHcm91cC5wcm90b3R5cGUuX2dlbmVyYXRlQ29sb3IgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzdGFydENvbG9yID0gdGhpcy5fZmFjZXRzLmxlbmd0aCA+IDAgPyBuZXcgQ29sb3IoKS5oZXgodGhpcy5fZmFjZXRzWzBdLmljb24uY29sb3IpIDogbmV3IENvbG9yKCkuaGV4KERFRkFVTFRfQ09MT1IpO1xuXHR2YXIgcG9zaXRpb24gPSB0aGlzLl9mYWNldHMubGVuZ3RoO1xuXHR2YXIgaWNvbkNvbG9yID0gc3RhcnRDb2xvci5zaGFkZShwb3NpdGlvbiAqIENPTE9SX1NURVApO1xuXHRyZXR1cm4gaWNvbkNvbG9yLmhleCgpO1xufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7UXVlcnlHcm91cH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBRdWVyeUdyb3VwO1xuIiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG52YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMnKTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaWZDb25kJywgZnVuY3Rpb24gKHYxLCBvcGVyYXRvciwgdjIsIG9wdGlvbnMpIHtcblxuICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgY2FzZSAnPT0nOlxuICAgICAgICAgICAgcmV0dXJuICh2MSA9PSB2MikgPyBvcHRpb25zLmZuKHRoaXMpIDogb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgICBjYXNlICc9PT0nOlxuICAgICAgICAgICAgcmV0dXJuICh2MSA9PT0gdjIpID8gb3B0aW9ucy5mbih0aGlzKSA6IG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICAgICAgY2FzZSAnPCc6XG4gICAgICAgICAgICByZXR1cm4gKHYxIDwgdjIpID8gb3B0aW9ucy5mbih0aGlzKSA6IG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICAgICAgY2FzZSAnPD0nOlxuICAgICAgICAgICAgcmV0dXJuICh2MSA8PSB2MikgPyBvcHRpb25zLmZuKHRoaXMpIDogb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgICBjYXNlICc+JzpcbiAgICAgICAgICAgIHJldHVybiAodjEgPiB2MikgPyBvcHRpb25zLmZuKHRoaXMpIDogb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgICBjYXNlICc+PSc6XG4gICAgICAgICAgICByZXR1cm4gKHYxID49IHYyKSA/IG9wdGlvbnMuZm4odGhpcykgOiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgICAgIGNhc2UgJyYmJzpcbiAgICAgICAgICAgIHJldHVybiAodjEgJiYgdjIpID8gb3B0aW9ucy5mbih0aGlzKSA6IG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICAgICAgY2FzZSAnfHwnOlxuICAgICAgICAgICAgcmV0dXJuICh2MSB8fCB2MikgPyBvcHRpb25zLmZuKHRoaXMpIDogb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuXHRcdGNhc2UgJ2luc3RhbmNlb2YnOlxuXHRcdFx0aWYgKHR5cGVvZiB2MiA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0aWYgKHR5cGVvZih2MSkgPT09IHYyIHx8ICh3aW5kb3dbdjJdICYmIHYxIGluc3RhbmNlb2Ygd2luZG93W3YyXSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh2MiA9PT0gT2JqZWN0KHYyKSAmJiB2MSBpbnN0YW5jZW9mIHYyKSB7XG5cdFx0XHRcdHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ21hdGgnLGZ1bmN0aW9uKHYxLG9wZXJhdG9yLHYyKSB7XG4gICAgaWYgKHYxID09PSBudWxsIHx8IHYxID09PSB1bmRlZmluZWQgfHwgdjIgPT09IG51bGwgfHwgdjIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgIGNhc2UgJysnOlxuICAgICAgICAgICAgcmV0dXJuICh2MSArIHYyKTtcbiAgICAgICAgY2FzZSAnLSc6XG4gICAgICAgICAgICByZXR1cm4gKHYxIC0gdjIpO1xuICAgICAgICBjYXNlICcqJzpcbiAgICAgICAgICAgIHJldHVybiAodjEgKiB2Mik7XG4gICAgICAgIGNhc2UgJy8nOlxuICAgICAgICAgICAgaWYgKHYyID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKHYxIC8gdjIpO1xuICAgIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdwZXJjZW50YWdlJyxmdW5jdGlvbih2MSx2Mikge1xuICAgIGlmICh2MSA9PT0gbnVsbCB8fCB2MSA9PT0gdW5kZWZpbmVkIHx8IHYyID09PSBudWxsIHx8IHYyID09PSB1bmRlZmluZWQgfHwgdjIgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiB2MSAvIHYyICogMTAwLjA7XG59KTtcblxuJC5mbi5lbnRlcktleSA9IGZ1bmN0aW9uIChmbmMsIG1vZCkge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHRoaXMpLmtleXVwKGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIGtleWNvZGUgPSAoZXYua2V5Q29kZSA/IGV2LmtleUNvZGUgOiBldi53aGljaCk7XG4gICAgICAgICAgICBpZiAoKGtleWNvZGUgPT0gJzEzJyB8fCBrZXljb2RlID09ICcxMCcpICYmICghbW9kIHx8IGV2W21vZCArICdLZXknXSkpIHtcbiAgICAgICAgICAgICAgICBmbmMuY2FsbCh0aGlzLCBldik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcbiIsIi8qXG4gKiAqXG4gKiAgQ29weXJpZ2h0IMKpIDIwMTUgVW5jaGFydGVkIFNvZnR3YXJlIEluYy5cbiAqXG4gKiAgUHJvcGVydHkgb2YgVW5jaGFydGVk4oSiLCBmb3JtZXJseSBPY3VsdXMgSW5mbyBJbmMuXG4gKiAgaHR0cDovL3VuY2hhcnRlZC5zb2Z0d2FyZS9cbiAqXG4gKiAgUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICpcbiAqICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mXG4gKiAgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbiAqICB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllc1xuICogIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkb1xuICogIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiAgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqICBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiAgU09GVFdBUkUuXG4gKiAvXG4gKi9cblxucmVxdWlyZSgnLi9oZWxwZXJzJyk7XG52YXIgXyA9IHJlcXVpcmUoJy4vdXRpbC91dGlsJyk7XG5cbnZhciBJQmluZGFibGUgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvSUJpbmRhYmxlJyk7XG52YXIgR3JvdXAgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ3JvdXAnKTtcbnZhciBRdWVyeUdyb3VwID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3F1ZXJ5Z3JvdXAnKTtcbnZhciBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGVzL21haW4nKTtcblxuLyoqXG4gKiBNYWluIGZhY2V0cyBjbGFzcywgdGhpcyBjbGFzcyBkZWZpbmVzIHRoZSBtYWluIGludGVyZmFjZSBiZXR3ZWVuIHRoZSBhcHAgYW5kIEZhY2V0cy5cbiAqXG4gKiBAY2xhc3MgRmFjZXRzXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fGpRdWVyeX0gY29udGFpbmVyIC0gVGhlIGVsZW1lbnQgd2hlcmUgdGhlIGZhY2V0cyBzaG91bGQgYmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gZ3JvdXBzIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGdyb3VwcyBvZiBmYWNldHMgdG8gYmUgY3JlYXRlZC5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcXVlcmllcyAtIE9wdGlvbmFsIG9iamVjdCBkZXNjcmliaW5nIHRoZSBxdWVyaWVzIHRoYXQgc2hvdWxkIGJlIGNyZWF0ZWQgYWxvbmcgd2l0aCB0aGUgZmFjZXRzLlxuICogQHBhcmFtIHtPYmplY3Q9fSBvcHRpb25zIC0gT3B0aW9uYWwgb2JqZWN0IHdpdGggY29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGlzIGZhY2V0cyBpbnN0YW5jZS5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGYWNldHMoY29udGFpbmVyLCBncm91cHMsIHF1ZXJpZXMsIG9wdGlvbnMpIHtcbiAgICBJQmluZGFibGUuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLl9jb250YWluZXIgPSAkKFRlbXBsYXRlKCkpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5hcHBlbmRUbyhjb250YWluZXIpO1xuICAgIHRoaXMuX2luaXQoZ3JvdXBzLCBxdWVyaWVzKTtcbn1cblxuLyoqXG4gKiBAaW5oZXJpdGFuY2Uge0lCaW5kYWJsZX1cbiAqL1xuRmFjZXRzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSUJpbmRhYmxlLnByb3RvdHlwZSk7XG5GYWNldHMucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRmFjZXRzO1xuXG4vKipcbiAqIFNlbGVjdHMgdGhlIGdpdmVuIGZhY2V0cy5cbiAqXG4gKiBAbWV0aG9kIHNlbGVjdFxuICogQHBhcmFtIHtPYmplY3R9IHN1Ymdyb3VwcyAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBmYWNldHMsIGFuZCBpbiB3aGljaCBncm91cCwgdG8gYmUgc2VsZWN0ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBpc1F1ZXJ5IC0gT3B0aW9uYWwgcGFyYW1ldGVyIHRvIGRlZmluZSBpZiB0aGUgc3ViZ3JvdXAgaXMgYSBxdWVyeSwgaWYgbm90IHNwZWNpZmllZCB0aGUgbWV0aG9kIHdpbGwgdHJ5IHRvIGF1dG8tZGV0ZWN0IHRoZSBncm91cCdzIHR5cGUuXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24oc3ViZ3JvdXBzLCBpc1F1ZXJ5KSB7XG5cdHZhciBncm91cHNJbml0aWFsaXplZCA9IGZhbHNlO1xuXHR2YXIgcXVlcmllc0luaXRpYWxpemVkID0gZmFsc2U7XG5cblx0c3ViZ3JvdXBzLmZvckVhY2goZnVuY3Rpb24oZ3JvdXBTcGVjKSB7XG5cdFx0dmFyIGdyb3VwID0gdGhpcy5fZ2V0R3JvdXAoZ3JvdXBTcGVjLmtleSk7XG5cdFx0aWYgKCFpc1F1ZXJ5ICYmIGdyb3VwKSB7XG5cdFx0XHRpZiAoIWdyb3Vwc0luaXRpYWxpemVkKSB7XG5cdFx0XHRcdC8vIEluaXRpYWxpemUgc2VsZWN0aW9uIHN0YXRlXG5cdFx0XHRcdHRoaXMuX2dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdFx0Z3JvdXAuaW5pdGlhbGl6ZVNlbGVjdGlvbigpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0Z3JvdXBzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzZWxlY3QgZWFjaCBjb250YWluaW5pbmcgZmFjZXRcblx0XHRcdGdyb3VwU3BlYy5mYWNldHMuZm9yRWFjaChmdW5jdGlvbihmYWNldFNwZWMpIHtcblx0XHRcdFx0dmFyIGZhY2V0ID0gZ3JvdXAuX2dldEZhY2V0KGZhY2V0U3BlYy52YWx1ZSk7XG5cdFx0XHRcdGlmIChmYWNldCkge1xuXHRcdFx0XHRcdGZhY2V0LnNlbGVjdChmYWNldFNwZWMuc2VsZWN0ZWQgfHwgZmFjZXRTcGVjKTtcblx0XHRcdFx0fVxuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Z3JvdXBTcGVjLmZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZhY2V0U3BlYykge1xuXHRcdFx0XHR2YXIgcXVlcnkgPSB0aGlzLl9nZXRRdWVyeShncm91cFNwZWMua2V5LCBmYWNldFNwZWMudmFsdWUpO1xuXHRcdFx0XHRpZiAocXVlcnkpIHtcblx0XHRcdFx0XHRpZiAoIXF1ZXJpZXNJbml0aWFsaXplZCkge1xuXHRcdFx0XHRcdFx0Ly8gSW5pdGlhbGl6ZSBzZWxlY3Rpb24gc3RhdGVcblx0XHRcdFx0XHRcdHRoaXMuX3F1ZXJ5R3JvdXAuaW5pdGlhbGl6ZVNlbGVjdGlvbigpO1xuXHRcdFx0XHRcdFx0cXVlcmllc0luaXRpYWxpemVkID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cXVlcnkuc2VsZWN0KGZhY2V0U3BlYy5zZWxlY3RlZCk7XG5cdFx0XHRcdH1cblx0XHRcdH0uYmluZCh0aGlzKSk7XG5cdFx0fVxuXHR9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBEZXNlbGVjdHMgYWxsIHF1ZXJpZXMgYW5kIHRoZSBzcGVjaWZpZWQsIHByZXZpb3VzbHkgc2VsZWN0ZWQgZmFjZXRzLlxuICpcbiAqIEBtZXRob2QgZGVzZWxlY3RcbiAqIEBwYXJhbSB7QXJyYXk9fSBzaW1wbGVHcm91cHMgLSBcdEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGdyb3VwIGtleXMgYW5kIGZhY2V0IHZhbHVlcyB0byBiZSBkZXNlbGVjdGVkLlxuICogXHRcdFx0XHRcdFx0XHRcdFx0SWYgYSBncm91cCBoYXMgYSBrZXkgYnV0IG5vdCBhIHZhbHVlLCBhbGwgZmFjZXRzIGluIHRoZSBncm91cCB3aWxsIGJlIGRlc2VsZWN0ZWQuXG4gKiBcdFx0XHRcdFx0XHRcdFx0XHRJZiB0aGlzIHBhcmFtZXRlciBpcyBvbWl0dGVkIGFsbCBncm91cHMgYW5kIGZhY2V0cyB3aWxsIGJlIGRlc2VsZWN0ZWQuXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuZGVzZWxlY3QgPSBmdW5jdGlvbihzaW1wbGVHcm91cHMpIHtcblx0aWYgKCFzaW1wbGVHcm91cHMpIHtcblx0XHR0aGlzLl9ncm91cHMuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXApIHtcblx0XHRcdGdyb3VwLmNsZWFyU2VsZWN0aW9uKCk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0c2ltcGxlR3JvdXBzLmZvckVhY2goZnVuY3Rpb24oc2ltcGxlR3JvdXApIHtcblx0XHRcdHZhciBncm91cCA9IHRoaXMuX2dldEdyb3VwKHNpbXBsZUdyb3VwLmtleSk7XG5cdFx0XHRpZiAoZ3JvdXApIHtcblx0XHRcdFx0aWYgKCd2YWx1ZScgaW4gc2ltcGxlR3JvdXApIHtcblx0XHRcdFx0XHR2YXIgZmFjZXQgPSBncm91cC5fZ2V0RmFjZXQoc2ltcGxlR3JvdXAudmFsdWUpO1xuXHRcdFx0XHRcdGlmIChmYWNldCkge1xuXHRcdFx0XHRcdFx0ZmFjZXQuZGVzZWxlY3QoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Z3JvdXAuY2xlYXJTZWxlY3Rpb24oKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0uYmluZCh0aGlzKSk7XG5cdH1cblx0dGhpcy5fcXVlcnlHcm91cC5jbGVhclNlbGVjdGlvbigpO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlcyBhbGwgdGhlIGZhY2V0cyB3aXRoIG5ldyBncm91cHMgYW5kIHF1ZXJpZXMgY3JlYXRlZCB1c2luZyB0aGUgcHJvdmlkZWQgaW5mb3JtYXRpb24uXG4gKlxuICogQG1ldGhvZCByZXBsYWNlXG4gKiBAcGFyYW0ge09iamVjdH0gZ3JvdXBzIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGdyb3VwcyBvZiBmYWNldHMgdG8gYmUgY3JlYXRlZC5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcXVlcmllcyAtIE9wdGlvbmFsIG9iamVjdCBkZXNjcmliaW5nIHRoZSBxdWVyaWVzIHRoYXQgc2hvdWxkIGJlIGNyZWF0ZWQgYWxvbmcgd2l0aCB0aGUgZmFjZXRzLlxuICovXG5GYWNldHMucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbihncm91cHMsIHF1ZXJpZXMpIHtcblx0dGhpcy5fZGVzdHJveUNvbnRlbnRzKCk7XG5cdHRoaXMuX2luaXQoZ3JvdXBzLCBxdWVyaWVzKTtcbn07XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIHNwZWNpZmllZCBncm91cCB3aXRoIHRoZSBuZXcgZGF0YS5cbiAqXG4gKiBAbWV0aG9kIHJlcGxhY2VHcm91cFxuICogQHBhcmFtIHtPYmplY3R9IGdyb3VwIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGluZm9ybWF0aW9uIG9mIHRoZSBuZXcgZ3JvdXAuXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUucmVwbGFjZUdyb3VwID0gZnVuY3Rpb24oZ3JvdXApIHtcblx0dmFyIGV4aXN0aW5nR3JvdXAgPSB0aGlzLl9nZXRHcm91cChncm91cC5rZXkpO1xuXHRpZiAoZXhpc3RpbmdHcm91cCkge1xuXHRcdGV4aXN0aW5nR3JvdXAucmVwbGFjZShncm91cCk7XG5cdFx0dGhpcy5fYmluZENsaWVudEV2ZW50cygpO1xuXHR9XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHNwZWNpZmllZCBmYWNldHMgdG8gdGhlaXIgaGlnaGxpZ2h0ZWQgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBoaWdobGlnaHRcbiAqIEBwYXJhbSB7QXJyYXl9IHNpbXBsZUdyb3VwcyAtIEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGdyb3VwIGtleXMgYW5kIGZhY2V0IHZhbHVlcyB0byBiZSBoaWdobGlnaHRlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGlzUXVlcnkgLSBPcHRpb25hbCBwYXJhbWV0ZXIgdG8gZGVmaW5lIGlmIHRoZSBzdWJncm91cCBpcyBhIHF1ZXJ5LCBpZiBub3Qgc3BlY2lmaWVkIHRoZSBtZXRob2Qgd2lsbCB0cnkgdG8gYXV0by1kZXRlY3QgdGhlIGdyb3VwJ3MgdHlwZS5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzaW1wbGVHcm91cHMsIGlzUXVlcnkpIHtcblx0c2ltcGxlR3JvdXBzLmZvckVhY2goZnVuY3Rpb24oc2ltcGxlR3JvdXApIHtcblx0XHR2YXIgZ3JvdXAgPSB0aGlzLl9nZXRHcm91cChzaW1wbGVHcm91cC5rZXkpO1xuXHRcdGlmICghaXNRdWVyeSAmJiBncm91cCkge1xuXHRcdFx0Z3JvdXAuaGlnaGxpZ2h0KHNpbXBsZUdyb3VwLnZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIHF1ZXJ5ID0gdGhpcy5fZ2V0UXVlcnkoc2ltcGxlR3JvdXAua2V5LCBzaW1wbGVHcm91cC52YWx1ZSk7XG5cdFx0XHRpZiAocXVlcnkpIHtcblx0XHRcdFx0cXVlcnkuaGlnaGxpZ2h0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHNwZWNpZmllZCBmYWNldHMgdG8gdGhlaXIgbm90LWhpZ2hsaWdodGVkIHN0YXRlLlxuICpcbiAqIEBtZXRob2QgdW5oaWdobGlnaHRcbiAqIEBwYXJhbSB7QXJyYXl9IHNpbXBsZUdyb3VwcyAtIEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGdyb3VwIGtleXMgYW5kIGZhY2V0IHZhbHVlcyB0byBiZSB1bi1oaWdobGlnaHRlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGlzUXVlcnkgLSBPcHRpb25hbCBwYXJhbWV0ZXIgdG8gZGVmaW5lIGlmIHRoZSBzdWJncm91cCBpcyBhIHF1ZXJ5LCBpZiBub3Qgc3BlY2lmaWVkIHRoZSBtZXRob2Qgd2lsbCB0cnkgdG8gYXV0by1kZXRlY3QgdGhlIGdyb3VwJ3MgdHlwZS5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS51bmhpZ2hsaWdodCA9IGZ1bmN0aW9uKHNpbXBsZUdyb3VwcywgaXNRdWVyeSkge1xuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRzaW1wbGVHcm91cHMuZm9yRWFjaChmdW5jdGlvbihzaW1wbGVHcm91cCkge1xuXHRcdFx0dmFyIGdyb3VwID0gdGhpcy5fZ2V0R3JvdXAoc2ltcGxlR3JvdXAua2V5KTtcblx0XHRcdGlmICghaXNRdWVyeSAmJiBncm91cCkge1xuXHRcdFx0XHRncm91cC51bmhpZ2hsaWdodChzaW1wbGVHcm91cC52YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgcXVlcnkgPSB0aGlzLl9nZXRRdWVyeShzaW1wbGVHcm91cC5rZXksIHNpbXBsZUdyb3VwLnZhbHVlKTtcblx0XHRcdFx0aWYgKHF1ZXJ5KSB7XG5cdFx0XHRcdFx0cXVlcnkuaGlnaGxpZ2h0ZWQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sIHRoaXMpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3VuaGlnaGxpZ2h0QWxsKCk7XG5cdH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgc3BlY2lmaWMgZmFjZXRzIGlzIGluIGl0cyBoaWdobGlnaHRlZCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIGlzSGlnaGxpZ2h0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBzaW1wbGVHcm91cCAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBncm91cCBhbmQgZmFjZXQgdG8gY2hlY2sgZm9yIGEgaGlnaGxpZ2h0ZWQgc3RhdGUuXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBpc1F1ZXJ5IC0gT3B0aW9uYWwgcGFyYW1ldGVyIHRvIGRlZmluZSBpZiB0aGUgc3ViZ3JvdXAgaXMgYSBxdWVyeSwgaWYgbm90IHNwZWNpZmllZCB0aGUgbWV0aG9kIHdpbGwgdHJ5IHRvIGF1dG8tZGV0ZWN0IHRoZSBncm91cCdzIHR5cGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5pc0hpZ2hsaWdodGVkID0gZnVuY3Rpb24oc2ltcGxlR3JvdXAsIGlzUXVlcnkpIHtcblx0dmFyIGdyb3VwID0gdGhpcy5fZ2V0R3JvdXAoc2ltcGxlR3JvdXAua2V5KTtcblx0aWYgKCFpc1F1ZXJ5ICYmIGdyb3VwKSB7XG5cdFx0cmV0dXJuIGdyb3VwLmlzSGlnaGxpZ2h0ZWQoc2ltcGxlR3JvdXAudmFsdWUpO1xuXHR9IGVsc2Uge1xuXHRcdHZhciBxdWVyeSA9IHRoaXMuX2dldFF1ZXJ5KHNpbXBsZUdyb3VwLmtleSwgc2ltcGxlR3JvdXAudmFsdWUpO1xuXHRcdGlmIChxdWVyeSkge1xuXHRcdFx0cmV0dXJuIHF1ZXJ5LmhpZ2hsaWdodGVkO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgZ3JvdXAgd2l0aCB0aGUgc3BlY2lmaWVkIGtleSBpcyBpbiBpdHMgY29sbGFwc2VkIHN0YXRlLlxuICpcbiAqIEBtZXRob2QgaXNDb2xsYXBzZWRcbiAqIEBwYXJhbSB7Kn0ga2V5IC0gVGhlIGtleSBvZiB0aGUgZ3JvdXAgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5pc0NvbGxhcHNlZCA9IGZ1bmN0aW9uKGtleSkge1xuXHR2YXIgZ3JvdXAgPSB0aGlzLl9nZXRHcm91cChrZXkpO1xuXHRpZiAoZ3JvdXApIHtcblx0XHRyZXR1cm4gZ3JvdXAuY29sbGFwc2VkO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZmlsdGVyIHJhbmdlIG9mIHRoZSBmYWNldCB3aXRoIHRoZSBnaXZlbiB2YWx1ZSBpbiB0aGUgZ3JvdXAgd2l0aCB0aGUgZ2l2ZSBrZXksIG9yIG51bGwgaWYgYW4gZXJyb3Igb2NjdXJzLlxuICpcbiAqIEBtZXRob2QgZ2V0RmlsdGVyUmFuZ2VcbiAqIEBwYXJhbSB7Kn0ga2V5IC0gVGhlIGtleSBvZiB0aGUgZ3JvdXAgY29udGFpbmluZyB0aGUgZmFjZXQgZm9yIHdoaWNoIHRoZSBmaWx0ZXIgcmFuZ2Ugc2hvdWxkIGJlIHJldHJpZXZlZC5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZhY2V0IGZvciB3aGljaCB0aGUgZmlsdGVyIHJhbmdlIHNob3VsZCBiZSByZXRyaWV2ZWQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fG51bGx9XG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuZ2V0RmlsdGVyUmFuZ2UgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdHZhciBncm91cCA9IHRoaXMuX2dldEdyb3VwKGtleSk7XG5cdGlmIChncm91cCkge1xuXHRcdHJldHVybiBncm91cC5nZXRGaWx0ZXJSYW5nZSh2YWx1ZSk7XG5cdH1cblx0cmV0dXJuIG51bGw7XG59O1xuXG4vKipcbiAqIEFwcGVuZHMgdGhlIHNwZWNpZmllZCBncm91cHMgYW5kIHF1ZXJpZXMgdG8gdGhlIHdpZGdldC5cbiAqIE5PVEU6IElmIGEgZmFjZXQgb3IgcXVlcnkgYWxyZWFkeSBleGlzdHMsIHRoZSB2YWx1ZSBzcGVjaWZpZWQgaW4gdGhlIGRhdGEgd2lsbCBiZSBhcHBlbmRlZCB0byB0aGUgYWxyZWFkeSBleGlzdGluZyB2YWx1ZS5cbiAqXG4gKiBAbWV0aG9kIGFwcGVuZFxuICogQHBhcmFtIHtPYmplY3R9IGdyb3VwcyAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBncm91cHMgYW5kIGZhY2V0cyB0byBhcHBlbmQuXG4gKiBAcGFyYW0ge09iamVjdH0gcXVlcmllcyAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBxdWVyaWVzIHRvIGFwcGVuZC5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihncm91cHMsIHF1ZXJpZXMpIHtcblx0dmFyIGV4aXN0aW5nR3JvdXA7XG5cblx0Ly8gQXBwZW5kIGdyb3Vwc1xuXHRpZiAoZ3JvdXBzKSB7XG5cdFx0Z3JvdXBzLmZvckVhY2goZnVuY3Rpb24oZ3JvdXBTcGVjKSB7XG5cdFx0XHRleGlzdGluZ0dyb3VwID0gdGhpcy5fZ2V0R3JvdXAoZ3JvdXBTcGVjLmtleSk7XG5cdFx0XHRpZiAoZXhpc3RpbmdHcm91cCkge1xuXHRcdFx0XHRleGlzdGluZ0dyb3VwLmFwcGVuZChncm91cFNwZWMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIGdyb3VwID0gbmV3IEdyb3VwKHRoaXMsIHRoaXMuX2NvbnRhaW5lciwgZ3JvdXBTcGVjLCB0aGlzLl9vcHRpb25zLCB0aGlzLl9ncm91cHMubGVuZ3RoKTtcblx0XHRcdFx0dGhpcy5fZ3JvdXBzLnB1c2goZ3JvdXApO1xuXHRcdFx0fVxuXHRcdH0sIHRoaXMpO1xuXHR9XG5cblx0Ly8gQXBwZW5kIHF1ZXJpZXNcblx0aWYgKHF1ZXJpZXMpIHtcblx0XHRxdWVyaWVzLmZvckVhY2goZnVuY3Rpb24ocXVlcnlTcGVjKSB7XG5cdFx0XHR0aGlzLmFkZFF1ZXJ5KHF1ZXJ5U3BlYyk7XG5cdFx0fSwgdGhpcyk7XG5cdH1cblxuXHR0aGlzLl9iaW5kQ2xpZW50RXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIGZhY2V0IHdpdGggdGhlIHNwZWNpZmllZCB2YWx1ZSBmcm9tIHRoZSBncm91cCB3aXRoIHRoZSBzcGVjaWZpZWQga2V5LlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlRmFjZXRcbiAqIEBwYXJhbSB7Kn0ga2V5IC0gVGhlIGtleSBvZiB0aGUgZ3JvdXAgY29udGFpbmluZyB0aGUgZmFjZXQgdG8gcmVtb3ZlLlxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmFjZXQgdG8gcmVtb3ZlLlxuICovXG5GYWNldHMucHJvdG90eXBlLnJlbW92ZUZhY2V0ID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHR2YXIgZ3JvdXAgPSB0aGlzLl9nZXRHcm91cChrZXkpO1xuXHRpZiAoZ3JvdXApIHtcblx0XHRncm91cC5yZW1vdmVGYWNldCh2YWx1ZSk7XG5cdH1cbn07XG5cbi8qKlxuICogQWRkcyBhIHF1ZXJ5IHRvIHRoZSBxdWVyeSBncm91cCBpbiB0aGlzIHdpZGdldC5cbiAqXG4gKiBAbWV0aG9kIGFkZFF1ZXJ5XG4gKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgcXVlcnkgdG8gYWRkXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuYWRkUXVlcnkgPSBmdW5jdGlvbihxdWVyeSkge1xuXHR0aGlzLl9xdWVyeUdyb3VwLmFkZFF1ZXJ5KHF1ZXJ5LCB0cnVlKTtcblx0dGhpcy5fYmluZENsaWVudEV2ZW50cygpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBxdWVyeSB3aXRoIHRoZSBzcGVjaWZpZWQga2V5IGFuZCB2YWx1ZSBmcm9tIHRoZSBxdWVyeSBncm91cC5cbiAqXG4gKiBAbWV0aG9kIHJlbW92ZVF1ZXJ5XG4gKiBAcGFyYW0geyp9IGtleSAtIFRoZSBrZXkgb2YgdGhlIHF1ZXJ5IHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHRvIHJlbW92ZS5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5yZW1vdmVRdWVyeSA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0dGhpcy5fcXVlcnlHcm91cC5yZW1vdmVRdWVyeShrZXksIHZhbHVlLCB0cnVlKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgZ3JvdXAgaW5kaWNlcyBpbiB0aGlzIHdpZGdldC5cbiAqIE5PVEU6IFRoZSBldmVudCBgZmFjZXQtZ3JvdXA6cmVvcmRlcmVkYCB3aWxsIGJlIHRyaWdnZXJlZCBmb3IgZWFjaCBncm91cCBmbyB3aGljaCBpdHMgaW5kZXggaGFzIGNoYW5nZWQuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVHcm91cEluZGljZXNcbiAqL1xuRmFjZXRzLnByb3RvdHlwZS51cGRhdGVHcm91cEluZGljZXMgPSBmdW5jdGlvbigpIHtcblx0Lyogc29ydCBncm91cCBieSB0aGVpciB0b3Agb2Zmc2V0ICovXG5cdHRoaXMuX2dyb3Vwcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRyZXR1cm4gYS5fZWxlbWVudC5vZmZzZXQoKS50b3AgLSBiLl9lbGVtZW50Lm9mZnNldCgpLnRvcDtcblx0fSk7XG5cblx0Lyogbm90aWZ5IGFsbCBncm91cHMgb2YgdGhlaXIgbmV3IHBvc2l0aW9ucyAqL1xuXHR0aGlzLl9ncm91cHMuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXAsIGluZGV4KSB7XG5cdFx0Z3JvdXAuaW5kZXggPSBpbmRleDtcblx0fSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gYXJyYXkgd2l0aCB0aGUga2V5cyBvZiBhbGwgdGhlIGdyb3VwcyBpbiB0aGlzIHdpZGdldCwgb3JkZXJlZCBieSB0aGVpciBpbmRleC5cbiAqXG4gKiBAbWV0aG9kIGdldEdyb3VwSW5kaWNlc1xuICogQHJldHVybnMge0FycmF5fVxuICovXG5GYWNldHMucHJvdG90eXBlLmdldEdyb3VwSW5kaWNlcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5fZ3JvdXBzLm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdHJldHVybiBncm91cC5rZXk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFsbCBoYW5kbGVycyBhbmQgcHJvcGVybHkgZGVzdHJveXMgdGhpcyB3aWRnZXQgaW5zdGFuY2UuXG4gKlxuICogQG1ldGhvZCBkZXN0cm95XG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9kZXN0cm95Q29udGVudHMoKTtcblx0dGhpcy5fY29udGFpbmVyLnJlbW92ZSgpO1xuXHQvKiBjYWxsIHN1cGVyIGNsYXNzICovXG5cdElCaW5kYWJsZS5wcm90b3R5cGUuZGVzdHJveS5jYWxsKHRoaXMpO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBtZXRob2QgdG8gaW5pdGlhbGl6ZSB0aGUgd2lkZ2V0LlxuICpcbiAqIEBtZXRob2QgX2luaXRcbiAqIEBwYXJhbSB7T2JqZWN0fSBncm91cHMgLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZ3JvdXBzIHRvIGluc3RhbnRpYXRlIHdpdGggdGhpcyB3aWRnZXQuXG4gKiBAcGFyYW0ge09iamVjdD19IHF1ZXJpZXMgLSBBbiBvcHRpb25hbCBvYmplY3QgZGVzY3JpYmluZyB0aGUgcXVlcmllcyB0byBpbnN0YW50aWF0ZSB3aXRoIHRoaXMgd2lkZ2V0LlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKGdyb3VwcywgcXVlcmllcykge1xuXHR0aGlzLl9xdWVyeUdyb3VwID0gbmV3IFF1ZXJ5R3JvdXAodGhpcy5fY29udGFpbmVyLCBxdWVyaWVzIHx8IFtdKTtcblxuXHQvLyBDcmVhdGUgZ3JvdXBzXG5cdHRoaXMuX2dyb3VwcyA9IGdyb3Vwcy5tYXAoZnVuY3Rpb24oZ3JvdXBTcGVjLCBpbmRleCkge1xuXHRcdHJldHVybiBuZXcgR3JvdXAodGhpcywgdGhpcy5fY29udGFpbmVyLCBncm91cFNwZWMsIHRoaXMuX29wdGlvbnMsIGluZGV4KTtcblx0fS5iaW5kKHRoaXMpKTtcblxuXHR0aGlzLl9iaW5kQ2xpZW50RXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIFNldHMgYWxsIGZhY2V0cyBhbmQgcXVlcmllcyBpbiB0aGlzIHdpZGdldCB0byB0aGVpciBub3QtaGlnaGxpZ2h0ZWQgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBfdW5oaWdobGlnaHRBbGxcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuX3VuaGlnaGxpZ2h0QWxsID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX2dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0Z3JvdXAudW5oaWdobGlnaHQoKTtcblx0fSk7XG5cdHRoaXMuX3F1ZXJ5R3JvdXAudW5oaWdobGlnaHRBbGwoKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcXVlcnkgd2l0aCB0aGUgc3BlY2lmaWVkIGtleSBhbmQgdmFsdWUuXG4gKlxuICogQG1ldGhvZCBfZ2V0UXVlcnlcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBUaGUga2V5IG9mIHRoZSBxdWVyeSB0byBmaW5kLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSB0byBmaW5kLlxuICogQHJldHVybnMge0ZhY2V0fG51bGx9XG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldHMucHJvdG90eXBlLl9nZXRRdWVyeSA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0cmV0dXJuIHRoaXMuX3F1ZXJ5R3JvdXAuX2dldFF1ZXJ5KGtleSwgdmFsdWUpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBncm91cCB3aXRoIHRoZSBzcGVjaWZpZWQga2V5LlxuICpcbiAqIEBtZXRob2QgX2dldEdyb3VwXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gVGhlIGtleSBvZiB0aGUgZ3JvdXAgdG8gZmluZC5cbiAqIEByZXR1cm5zIHtHcm91cHxudWxsfVxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5fZ2V0R3JvdXAgPSBmdW5jdGlvbihrZXkpIHtcblx0dmFyIGdyb3VwT2JqID0gdGhpcy5fZ3JvdXBzLmZpbHRlcihmdW5jdGlvbihnKSB7XG5cdFx0cmV0dXJuIGcua2V5ID09PSBrZXk7XG5cdH0pO1xuXHRpZiAoZ3JvdXBPYmogJiYgZ3JvdXBPYmoubGVuZ3RoPjApIHtcblx0XHRyZXR1cm4gZ3JvdXBPYmpbMF07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgbWV0aG9kIHRvIGRlc3Ryb3kgdGhlIGdyb3VwcywgZmFjZXRzIGFuZCBxdWVyaWVzIGNvbnRhaW5lZCBpbiB0aGlzIHdpZGdldC5cbiAqXG4gKiBAbWV0aG9kIF9kZXN0cm95Q29udGVudHNcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuX2Rlc3Ryb3lDb250ZW50cyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9iaW5kQ2xpZW50RXZlbnRzKHRydWUpO1xuXG5cdC8vIHJlbW92ZSBleGlzdGluZyBxdWVyaWVzXG5cdHRoaXMuX3F1ZXJ5R3JvdXAuZGVzdHJveSgpO1xuXG5cdC8vIHJlbW92ZSBleGlzdGluZyBmYWNldHNcblx0aWYgKHRoaXMuX2dyb3Vwcykge1xuXHRcdHRoaXMuX2dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKGcpIHtcblx0XHRcdGcuZGVzdHJveSgpO1xuXHRcdH0pO1xuXHR9XG59O1xuXG4vKipcbiAqIEJpbmRzIHRoZSBmb3J3YXJkaW5nIG1lY2hhbmlzbSBmb3IgYWxsIGNsaWVudCBldmVudHMuXG4gKlxuICogQG1ldGhvZCBfYmluZENsaWVudEV2ZW50c1xuICogQHBhcmFtIHtib29sZWFuPX0gcmVtb3ZlIC0gT3B0aW9uYWwgcGFyYW1ldGVyLiB3aGVuIHNldCB0byB0cnVlIHRoZSBldmVudHMgd2lsbCBiZSByZW1vdmVkLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5fYmluZENsaWVudEV2ZW50cyA9IGZ1bmN0aW9uKHJlbW92ZSkge1xuXHRpZiAocmVtb3ZlKSB7XG5cdFx0dGhpcy51bmZvcndhcmQodGhpcy5fcXVlcnlHcm91cCk7XG5cdFx0dGhpcy5fZ3JvdXBzLmZvckVhY2goZnVuY3Rpb24oX2dyb3VwKSB7XG5cdFx0XHR0aGlzLnVuZm9yd2FyZChfZ3JvdXApO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5mb3J3YXJkKHRoaXMuX3F1ZXJ5R3JvdXApO1xuXHRcdHRoaXMuX2dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKF9ncm91cCkge1xuXHRcdFx0dGhpcy5mb3J3YXJkKF9ncm91cCk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0fVxufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7RmFjZXRzfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0cztcbiIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIik7bW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXHRmYWNldHMtZmFjZXQtaG9yaXpvbnRhbC1oaWRkZW5cXG5cIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiPGRpdiBpZD1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmlkIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pZCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaWRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBjbGFzcz1cXFwiZmFjZXRzLWZhY2V0LWJhc2UgZmFjZXRzLWZhY2V0LWhvcml6b250YWxcXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5oaWRkZW4gOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlXFxcIj5cXG4gICAgICAgIDxzdmcgY2xhc3M9XFxcImZhY2V0LWhpc3RvZ3JhbVxcXCI+PC9zdmc+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1yYW5nZS1maWx0ZXIgZmFjZXQtcmFuZ2UtZmlsdGVyLWluaXRcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlLWZpbHRlci1zbGlkZXIgZmFjZXQtcmFuZ2UtZmlsdGVyLWxlZnRcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlLWZpbHRlci1zbGlkZXIgZmFjZXQtcmFuZ2UtZmlsdGVyLXJpZ2h0XFxcIj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2Plxcblx0PC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlLWxhYmVsc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1yYW5nZS1sYWJlbFxcXCI+XCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmxlZnRSYW5nZUxhYmVsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5sZWZ0UmFuZ2VMYWJlbCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibGVmdFJhbmdlTGFiZWxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1yYW5nZS1sYWJlbFxcXCI+XCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnJpZ2h0UmFuZ2VMYWJlbCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucmlnaHRSYW5nZUxhYmVsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJyaWdodFJhbmdlTGFiZWxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1yYW5nZS1jb250cm9sc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1wYWdlLWxlZnQgZmFjZXQtcGFnZS1jdHJsXFxcIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtY2hldnJvbi1sZWZ0XFxcIj48L2k+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlLWN1cnJlbnRcXFwiPlxcblx0XHRcdFwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5sZWZ0UmFuZ2VMYWJlbCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubGVmdFJhbmdlTGFiZWwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImxlZnRSYW5nZUxhYmVsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIiAtIFwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yaWdodFJhbmdlTGFiZWwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnJpZ2h0UmFuZ2VMYWJlbCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwicmlnaHRSYW5nZUxhYmVsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1wYWdlLXJpZ2h0IGZhY2V0LXBhZ2UtY3RybFxcXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLWNoZXZyb24tcmlnaHRcXFwiPjwvaT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pOyIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIik7bW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXHRmYWNldHMtZmFjZXQtdmVydGljYWwtaGlkZGVuXFxuXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZmFjZXQtYmFyLWJhc2UgZmFjZXQtYmFyLXNlbGVjdGVkXFxcIiBzdHlsZT1cXFwid2lkdGg6XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbigoaGVscGVycy5wZXJjZW50YWdlIHx8IChkZXB0aDAgJiYgZGVwdGgwLnBlcmNlbnRhZ2UpIHx8IGhlbHBlcnMuaGVscGVyTWlzc2luZykuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnNlbGVjdGVkIDogZGVwdGgwKSwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudG90YWwgOiBkZXB0aDApLHtcIm5hbWVcIjpcInBlcmNlbnRhZ2VcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkpXG4gICAgKyBcIiU7XFxcIj48L2Rpdj5cXG5cIjtcbn0sXCI1XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pY29uIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5jb2xvciA6IHN0YWNrMSkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDYsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMucHJvZ3JhbSg4LCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXG5cIjtcbn0sXCI2XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGFsaWFzMT10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1iYXItYmFzZVxcXCIgc3R5bGU9XFxcIndpZHRoOlwiXG4gICAgKyBhbGlhczEoKGhlbHBlcnMucGVyY2VudGFnZSB8fCAoZGVwdGgwICYmIGRlcHRoMC5wZXJjZW50YWdlKSB8fCBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jb3VudCA6IGRlcHRoMCksKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRvdGFsIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJwZXJjZW50YWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pKVxuICAgICsgXCIlOyBiYWNrZ3JvdW5kLWNvbG9yOlwiXG4gICAgKyBhbGlhczEodGhpcy5sYW1iZGEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWNvbiA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY29sb3IgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiPjwvZGl2PlxcblwiO1xufSxcIjhcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1iYXItYmFzZSBmYWNldC1iYXItZGVmYXVsdFxcXCIgc3R5bGU9XFxcIndpZHRoOlwiXG4gICAgKyB0aGlzLmVzY2FwZUV4cHJlc3Npb24oKGhlbHBlcnMucGVyY2VudGFnZSB8fCAoZGVwdGgwICYmIGRlcHRoMC5wZXJjZW50YWdlKSB8fCBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jb3VudCA6IGRlcHRoMCksKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRvdGFsIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJwZXJjZW50YWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pKVxuICAgICsgXCIlO1xcXCI+PC9kaXY+XFxuXCI7XG59LFwiMTBcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlcjtcblxuICByZXR1cm4gXCJcdFx0XHRcdFx0XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmNvdW50TGFiZWwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNvdW50TGFiZWwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVycy5oZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gXCJmdW5jdGlvblwiID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImNvdW50TGFiZWxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxuXCI7XG59LFwiMTJcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlcjtcblxuICByZXR1cm4gXCJcdFx0XHRcdFx0XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmNvdW50IHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jb3VudCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiY291bnRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxuXCI7XG59LFwiMTRcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyO1xuXG4gIHJldHVybiBcIlx0XHRcdFx0XHRcIlxuICAgICsgKChzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmRpc3BsYXlWYWx1ZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuZGlzcGxheVZhbHVlIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlcnMuaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IFwiZnVuY3Rpb25cIiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJkaXNwbGF5VmFsdWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlxcblwiO1xufSxcIjE2XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubGFiZWwgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxNywgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDE5LCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKTtcbn0sXCIxN1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXI7XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHRcdFwiXG4gICAgKyAoKHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubGFiZWwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmxhYmVsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlcnMuaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IFwiZnVuY3Rpb25cIiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJsYWJlbFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxuXCI7XG59LFwiMTlcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyO1xuXG4gIHJldHVybiBcIlx0XHRcdFx0XHRcIlxuICAgICsgKChzdGFjazEgPSAoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnZhbHVlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC52YWx1ZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwidmFsdWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlxcblx0XHRcdFx0XCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyLCBhbGlhczE9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczI9dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIjxkaXYgaWQ9XFxcIlwiXG4gICAgKyBhbGlhczIoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pZCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gXCJmdW5jdGlvblwiID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImlkXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgY2xhc3M9XFxcImZhY2V0cy1mYWNldC1iYXNlIGZhY2V0cy1mYWNldC12ZXJ0aWNhbFxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmhpZGRlbiA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1pY29uXFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSB0aGlzLmludm9rZVBhcnRpYWwocGFydGlhbHMuZmFjZXRWZXJ0aWNhbF9pY29uLGRlcHRoMCx7XCJuYW1lXCI6XCJmYWNldFZlcnRpY2FsX2ljb25cIixcImRhdGFcIjpkYXRhLFwiaW5kZW50XCI6XCJcXHRcXHRcIixcImhlbHBlcnNcIjpoZWxwZXJzLFwicGFydGlhbHNcIjpwYXJ0aWFsc30pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1ibG9ja1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1iYXItY29udGFpbmVyXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1iYXItYmFzZSBmYWNldC1iYXItYmFja2dyb3VuZFxcXCIgc3R5bGU9XFxcIndpZHRoOlwiXG4gICAgKyBhbGlhczIoKGhlbHBlcnMucGVyY2VudGFnZSB8fCAoZGVwdGgwICYmIGRlcHRoMC5wZXJjZW50YWdlKSB8fCBhbGlhczEpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jb3VudCA6IGRlcHRoMCksKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRvdGFsIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJwZXJjZW50YWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pKVxuICAgICsgXCIlO1xcXCI+PC9kaXY+XFxuXCJcbiAgICArICgoc3RhY2sxID0gKGhlbHBlcnMuaWZDb25kIHx8IChkZXB0aDAgJiYgZGVwdGgwLmlmQ29uZCkgfHwgYWxpYXMxKS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc2VsZWN0ZWQgOiBkZXB0aDApLFwiPj1cIiwwLHtcIm5hbWVcIjpcImlmQ29uZFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMywgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IChoZWxwZXJzLmlmQ29uZCB8fCAoZGVwdGgwICYmIGRlcHRoMC5pZkNvbmQpIHx8IGFsaWFzMSkuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnNlbGVjdGVkIDogZGVwdGgwKSxcIj09PVwiLHVuZGVmaW5lZCx7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDUsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCIgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZmFjZXQtbGFiZWwtY29udGFpbmVyXFxcIj5cXG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZmFjZXQtbGFiZWwtY291bnRcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNvdW50TGFiZWwgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxMCwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDEyLCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcdFx0XHQ8L3NwYW4+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcImZhY2V0LWxhYmVsXFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5kaXNwbGF5VmFsdWUgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxNCwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDE2LCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcdFx0XHQ8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJmYWNldC1saW5rc1xcXCI+XFxuXCJcbiAgICArICgoc3RhY2sxID0gdGhpcy5pbnZva2VQYXJ0aWFsKHBhcnRpYWxzLmZhY2V0VmVydGljYWxfbGlua3MsZGVwdGgwLHtcIm5hbWVcIjpcImZhY2V0VmVydGljYWxfbGlua3NcIixcImRhdGFcIjpkYXRhLFwiaW5kZW50XCI6XCJcXHRcXHRcIixcImhlbHBlcnNcIjpoZWxwZXJzLFwicGFydGlhbHNcIjpwYXJ0aWFsc30pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiICAgIDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwiZmFjZXQtc2VhcmNoLWNvbnRhaW5lclxcXCI+XFxuXCJcbiAgICArICgoc3RhY2sxID0gdGhpcy5pbnZva2VQYXJ0aWFsKHBhcnRpYWxzLmZhY2V0VmVydGljYWxfc2VhcmNoLGRlcHRoMCx7XCJuYW1lXCI6XCJmYWNldFZlcnRpY2FsX3NlYXJjaFwiLFwiZGF0YVwiOmRhdGEsXCJpbmRlbnRcIjpcIlxcdFxcdFwiLFwiaGVscGVyc1wiOmhlbHBlcnMsXCJwYXJ0aWFsc1wiOnBhcnRpYWxzfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcdDwvZGl2PlxcbjwvZGl2PlxcblwiO1xufSxcInVzZVBhcnRpYWxcIjp0cnVlLFwidXNlRGF0YVwiOnRydWV9KTsiLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzXCIpO21vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiICAgIDxpIGNsYXNzPVxcXCJcIlxuICAgICsgdGhpcy5lc2NhcGVFeHByZXNzaW9uKHRoaXMubGFtYmRhKCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmljb24gOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxWydjbGFzcyddIDogc3RhY2sxKSwgZGVwdGgwKSlcbiAgICArIFwiXFxcIiBcIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCgoc3RhY2sxID0gKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmljb24gOiBkZXB0aDApKSAhPSBudWxsID8gc3RhY2sxLmNvbG9yIDogc3RhY2sxKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMiwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIiAgICA+PC9pPlxcblwiO1xufSxcIjJcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCJcXG4gICAgICAgc3R5bGU9XFxcImNvbG9yOlwiXG4gICAgKyB0aGlzLmVzY2FwZUV4cHJlc3Npb24odGhpcy5sYW1iZGEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWNvbiA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY29sb3IgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiXFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pY29uIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIjxkaXYgY2xhc3M9XFxcImZhY2V0LWljb24tbWFya2VyXFxcIj5cXG4gICAgPGkgY2xhc3M9XFxcImZhIGZhLWNoZWNrXFxcIj48L2k+XFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTsiLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzXCIpO21vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXI7XG5cbiAgcmV0dXJuIFwiICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1saW5rXFxcIj48L2k+XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmxpbmtzIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5saW5rcyA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibGlua3NcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5saW5rcyA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKTtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pOyIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIik7bW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXNlYXJjaFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXNlYXJjaFxcXCI+PC9pPjwvZGl2PlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc2VhcmNoIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcInVzZURhdGFcIjp0cnVlfSk7IiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKFwiaGFuZGxlYmFyc1wiKTttb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgZ3JvdXAtb3RoZXItdGFyZ2V0XFxcIiBzdHlsZT1cXFwiY3Vyc29yOiBwb2ludGVyO1wiO1xufSxcIjNcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gKChzdGFjazEgPSAoaGVscGVycy5pZkNvbmQgfHwgKGRlcHRoMCAmJiBkZXB0aDAuaWZDb25kKSB8fCBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5tb3JlIDogZGVwdGgwKSxcImluc3RhbmNlb2ZcIixcIm51bWJlclwiLHtcIm5hbWVcIjpcImlmQ29uZFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oNCwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDcsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcIjRcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gKChzdGFjazEgPSAoaGVscGVycy5pZkNvbmQgfHwgKGRlcHRoMCAmJiBkZXB0aDAuaWZDb25kKSB8fCBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5tb3JlIDogZGVwdGgwKSxcIj5cIiwwLHtcIm5hbWVcIjpcImlmQ29uZFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oNSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcIjVcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlcjtcblxuICByZXR1cm4gXCIgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXAtbW9yZS1tYXJrZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGk+4pePPC9pPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXAtb3RoZXItYmxvY2tcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXAtb3RoZXItYmFyXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLWNvbnRhaW5lclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLWNvdW50XFxcIj5cIlxuICAgICsgdGhpcy5lc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubW9yZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubW9yZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibW9yZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCIrPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJncm91cC1vdGhlci1sYWJlbC1vdGhlclxcXCI+b3RoZXI8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLXNob3ctbW9yZSBncm91cC1tb3JlLXRhcmdldFxcXCI+c2hvdyBtb3JlPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcblwiO1xufSxcIjdcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCIgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cC1vdGhlci1ibG9ja1xcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cC1vdGhlci1sYWJlbC1jb250YWluZXJcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IChoZWxwZXJzLmlmQ29uZCB8fCAoZGVwdGgwICYmIGRlcHRoMC5pZkNvbmQpIHx8IGhlbHBlcnMuaGVscGVyTWlzc2luZykuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1vcmUgOiBkZXB0aDApLFwiaW5zdGFuY2VvZlwiLFwiQXJyYXlcIix7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDgsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMucHJvZ3JhbSgxNywgZGF0YSwgMCksXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cIjtcbn0sXCI4XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLXNob3ctbW9yZSBncm91cC1tb3JlLW5vdC10YXJnZXRcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubW9yZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oOSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlx0XHRcdFx0XHRcdDwvc3Bhbj5cXG5cIjtcbn0sXCI5XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuICgoc3RhY2sxID0gKGhlbHBlcnMuaWZDb25kIHx8IChkZXB0aDAgJiYgZGVwdGgwLmlmQ29uZCkgfHwgaGVscGVycy5oZWxwZXJNaXNzaW5nKS5jYWxsKGRlcHRoMCxkZXB0aDAsXCJpbnN0YW5jZW9mXCIsXCJvYmplY3RcIix7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEwLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLnByb2dyYW0oMTUsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcIjEwXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGhlbHBlciwgYWxpYXMxPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMyPVwiZnVuY3Rpb25cIiwgYWxpYXMzPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCJcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcIlwiXG4gICAgKyAoKHN0YWNrMSA9IChoZWxwZXJzLmlmQ29uZCB8fCAoZGVwdGgwICYmIGRlcHRoMC5pZkNvbmQpIHx8IGFsaWFzMSkuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNsaWNrYWJsZSA6IGRlcHRoMCksXCI9PT1cIix0cnVlLHtcIm5hbWVcIjpcImlmQ29uZFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMTEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMFsnY2xhc3MnXSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEzLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxcIiBpbmRleD1cIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW5kZXggfHwgKGRhdGEgJiYgZGF0YS5pbmRleCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW5kZXhcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5sYWJlbCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubGFiZWwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImxhYmVsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvc3Bhbj5cXG5cIjtcbn0sXCIxMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCJncm91cC1tb3JlLXRhcmdldCBcIjtcbn0sXCIxM1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyO1xuXG4gIHJldHVybiB0aGlzLmVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVyc1snY2xhc3MnXSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDBbJ2NsYXNzJ10gOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVycy5oZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gXCJmdW5jdGlvblwiID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImNsYXNzXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpO1xufSxcIjE1XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbih0aGlzLmxhbWJkYShkZXB0aDAsIGRlcHRoMCkpXG4gICAgKyBcIjwvc3Bhbj5cXG5cIjtcbn0sXCIxN1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiAoKHN0YWNrMSA9IChoZWxwZXJzLmlmQ29uZCB8fCAoZGVwdGgwICYmIGRlcHRoMC5pZkNvbmQpIHx8IGhlbHBlcnMuaGVscGVyTWlzc2luZykuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1vcmUgOiBkZXB0aDApLFwiPT09XCIsdHJ1ZSx7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDE4LCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIik7XG59LFwiMThcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLXNob3ctbW9yZSBncm91cC1tb3JlLXRhcmdldFxcXCI+c2hvdyBtb3JlPC9zcGFuPlxcblx0XHRcdFx0XHRcIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcImdyb3VwLW1vcmUtY29udGFpbmVyXCJcbiAgICArICgoc3RhY2sxID0gKGhlbHBlcnMuaWZDb25kIHx8IChkZXB0aDAgJiYgZGVwdGgwLmlmQ29uZCkgfHwgaGVscGVycy5oZWxwZXJNaXNzaW5nKS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubW9yZSA6IGRlcHRoMCksXCJpbnN0YW5jZW9mXCIsXCJudW1iZXJcIix7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1vcmUgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTsiLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzXCIpO21vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyO1xuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcImZhY2V0cy1ncm91cC1jb250YWluZXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiZmFjZXRzLWdyb3VwXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiZ3JvdXAtaGVhZGVyXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cC1leHBhbmRlclxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2hlY2stc3F1YXJlLW8gdG9nZ2xlXFxcIj48L2k+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmxhYmVsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5sYWJlbCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibGFiZWxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cC1mYWNldC1jb250YWluZXItb3V0ZXJcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImdyb3VwLWZhY2V0LWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiZ3JvdXAtbW9yZS1jb250YWluZXJcXFwiPjwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiZ3JvdXAtZmFjZXQtZWxsaXBzaXNcXFwiPi4uLjwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTsiLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzXCIpO21vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJmYWNldHMtcm9vdC1jb250YWluZXJcXFwiPlxcblxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7IiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKFwiaGFuZGxlYmFyc1wiKTttb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFwiZmFjZXRzLWdyb3VwXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXAtaGVhZGVyXFxcIj5RdWVyaWVzPC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJncm91cC1mYWNldC1jb250YWluZXJcXFwiPjwvZGl2PlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7IiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xudmFyIF8gPSByZXF1aXJlICgnLi91dGlsJyk7XG5cbnZhciBDb2xvciA9IGZ1bmN0aW9uKHIsZyxiKSB7XG4gICAgdGhpcy5yID0gciB8fCAwO1xuICAgIHRoaXMuZyA9IGcgfHwgMDtcbiAgICB0aGlzLmIgPSBiIHx8IDA7XG59O1xuXG5Db2xvci5wcm90b3R5cGUgPSBfLmV4dGVuZChDb2xvci5wcm90b3R5cGUsIHtcbiAgICBoZXggOiBmdW5jdGlvbihoZXhTdHIpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBcIiNcIiArICgoMSA8PCAyNCkgKyAodGhpcy5yIDw8IDE2KSArICh0aGlzLmcgPDwgOCkgKyB0aGlzLmIpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGhleE1hdGNoZXIuZXhlYyhoZXhTdHIpO1xuICAgICAgICAgICAgICAgIHRoaXMuciA9IHBhcnNlSW50KHJlc1sxXSwxNik7XG4gICAgICAgICAgICAgICAgdGhpcy5nID0gcGFyc2VJbnQocmVzWzJdLDE2KTtcbiAgICAgICAgICAgICAgICB0aGlzLmIgPSBwYXJzZUludChyZXNbM10sMTYpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRocm93IFwiQ291bGQgbm90IHBhcnNlIGNvbG9yIFwiICsgaGV4U3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTU2MDI0OC9wcm9ncmFtbWF0aWNhbGx5LWxpZ2h0ZW4tb3ItZGFya2VuLWEtaGV4LWNvbG9yLW9yLXJnYi1hbmQtYmxlbmQtY29sb3JzXG4gICAgc2hhZGUgOiBmdW5jdGlvbihwZXJjZW50KSB7XG4gICAgICAgIHZhciB0PXBlcmNlbnQ8MD8wOjI1NSxwPXBlcmNlbnQ8MD9wZXJjZW50Ki0xOnBlcmNlbnQ7XG4gICAgICAgIHZhciBuZXdSID0gTWF0aC5yb3VuZCgodC10aGlzLnIpKnApK3RoaXMucjtcbiAgICAgICAgdmFyIG5ld0cgPSBNYXRoLnJvdW5kKCh0LXRoaXMuZykqcCkrdGhpcy5nO1xuICAgICAgICB2YXIgbmV3QiA9IE1hdGgucm91bmQoKHQtdGhpcy5iKSpwKSt0aGlzLmI7XG4gICAgICAgIHJldHVybiBuZXcgQ29sb3IobmV3UixuZXdHLG5ld0IpO1xuICAgIH1cbn0pO1xuXG52YXIgaGV4TWF0Y2hlciA9IG5ldyBSZWdFeHAoL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3I7IiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG52YXIgczQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAgICAgLnRvU3RyaW5nKDE2KVxuICAgICAgICAuc3Vic3RyaW5nKDEpO1xufTtcblxudmFyIFV0aWwgPSB7XG5cbiAgICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcbiAgICAgICAgdmFyIGtleSwgaSwgc291cmNlO1xuICAgICAgICBmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlc3Q7XG4gICAgfSxcblxuICAgIHJhbmRvbUlkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHM0KCkgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgK1xuICAgICAgICAgICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7XG4iXX0=
