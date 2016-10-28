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

},{"../util/util":56}],35:[function(require,module,exports){
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

},{"../../util/util":56,"../IBindable":34}],36:[function(require,module,exports){
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

},{"../../templates/facetHorizontal":45,"../../util/util":56,"./facet":35,"./facetHistogram":36,"./facetHistogramFilter":38}],40:[function(require,module,exports){
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

	if (this._spec.isQuery && this._key != '*') {
		this._spec.displayValue = this._key + ':' + (this._spec.label ? this._spec.label : this._spec.value);
	}

	/* register the partials to build the template */
	Handlebars.registerPartial('facetVertical_icon', facetVertical_icon);
	Handlebars.registerPartial('facetVertical_links', facetVertical_links);
	Handlebars.registerPartial('facetVertical_search', facetVertical_search);
	Handlebars.registerPartial('facetVertical_queryClose', facetVertical_queryClose);

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
 * @param {Object} options - Options object. { countLabel: {string} count label }
 */
FacetVertical.prototype.select = function(selectedCount, options) {
	var opts = options || {};
	this._spec.selected = selectedCount;
	this._spec.selectionCountLabel = opts.countLabel;
	this._update();
};

/**
 * Marks this facet as not selected and updates the visual state.
 *
 * @method deselect
 */
FacetVertical.prototype.deselect = function() {
	delete this._spec.selected;
	delete this._spec.selectionCountLabel;
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
	var countLabel = spec.selectionCountLabel || spec.countLabel || spec.count.toString();
	if (this._labelCount.text() !== countLabel) {
		this._labelCount.text(countLabel);
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

},{"../../templates/facetVertical":46,"../../templates/facetVertical_icon":47,"../../templates/facetVertical_links":48,"../../templates/facetVertical_queryClose":49,"../../templates/facetVertical_search":50,"../../util/util":56,"./facet":35,"handlebars":22}],41:[function(require,module,exports){
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

},{"../components/IBindable":34,"../components/facet/facetHorizontal":39,"../components/facet/facetVertical":40,"../templates/group":52,"../templates/group-more":51,"../util/util":56}],42:[function(require,module,exports){
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

},{"../components/facet/facetHorizontal":39,"../components/facet/facetVertical":40,"../templates/querygroup":54,"../util/color":55,"../util/util":56,"./IBindable":34,"./group":41}],43:[function(require,module,exports){
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
					facet.select(facetSpec.selected || facetSpec, { countLabel: facetSpec.countLabel });
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
					query.select(facetSpec.selected, { countLabel: facetSpec.countLabel });
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

},{"./components/IBindable":34,"./components/group":41,"./components/querygroup":42,"./helpers":43,"./templates/main":53,"./util/util":56}],45:[function(require,module,exports){
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
    var stack1, helper;

  return "                    "
    + ((stack1 = ((helper = (helper = helpers.countLabel || (depth0 != null ? depth0.countLabel : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"countLabel","hash":{},"data":data}) : helper))) != null ? stack1 : "")
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
    + "    </div>\n    <div class=\"facet-query-close\">\n"
    + ((stack1 = this.invokePartial(partials.facetVertical_queryClose,depth0,{"name":"facetVertical_queryClose","data":data,"indent":"        ","helpers":helpers,"partials":partials})) != null ? stack1 : "")
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
    return "    <div class=\"query-close\"><i class=\"fa fa-close\"></i></div>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.isQuery : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"useData":true});
},{"handlebars":22}],50:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    return "    <div class=\"facet-search\"><i class=\"fa fa-search\"></i></div>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.search : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"useData":true});
},{"handlebars":22}],51:[function(require,module,exports){
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
},{"handlebars":22}],52:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"facets-group-container\">\n	<div class=\"facets-group\">\n		<div class=\"group-header\">\n			<div class=\"group-expander\">\n				<i class=\"fa fa-check-square-o toggle\"></i>\n			</div>\n			"
    + this.escapeExpression(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"label","hash":{},"data":data}) : helper)))
    + "\n		</div>\n		<div class=\"group-facet-container-outer\">\n			<div class=\"group-facet-container\"></div>\n			<div class=\"group-more-container\"></div>\n		</div>\n		<div class=\"group-facet-ellipsis\">...</div>\n	</div>\n</div>\n";
},"useData":true});
},{"handlebars":22}],53:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class=\"facets-root-container\">\n\n</div>";
},"useData":true});
},{"handlebars":22}],54:[function(require,module,exports){
var Handlebars = require("handlebars");module.exports = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div class=\"facets-group\">\n    <div class=\"group-header\">Queries</div>\n	<div class=\"group-facet-container\"></div>\n</div>\n";
},"useData":true});
},{"handlebars":22}],55:[function(require,module,exports){
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
},{"./util":56}],56:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9hc3QuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2NvZGUtZ2VuLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlci5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvaGVscGVycy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlci5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvcGFyc2VyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9wcmludGVyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci92aXNpdG9yLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci93aGl0ZXNwYWNlLWNvbnRyb2wuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvbm8tY29uZmxpY3QuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL25vZGVfbW9kdWxlcy9zb3VyY2UtbWFwL2xpYi9zb3VyY2UtbWFwLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbm9kZV9tb2R1bGVzL3NvdXJjZS1tYXAvbGliL3NvdXJjZS1tYXAvYXJyYXktc2V0LmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbm9kZV9tb2R1bGVzL3NvdXJjZS1tYXAvbGliL3NvdXJjZS1tYXAvYmFzZTY0LXZscS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL25vZGVfbW9kdWxlcy9zb3VyY2UtbWFwL2xpYi9zb3VyY2UtbWFwL2Jhc2U2NC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL25vZGVfbW9kdWxlcy9zb3VyY2UtbWFwL2xpYi9zb3VyY2UtbWFwL2JpbmFyeS1zZWFyY2guanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvc291cmNlLW1hcC9saWIvc291cmNlLW1hcC9tYXBwaW5nLWxpc3QuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvc291cmNlLW1hcC9saWIvc291cmNlLW1hcC9zb3VyY2UtbWFwLWNvbnN1bWVyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbm9kZV9tb2R1bGVzL3NvdXJjZS1tYXAvbGliL3NvdXJjZS1tYXAvc291cmNlLW1hcC1nZW5lcmF0b3IuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvc291cmNlLW1hcC9saWIvc291cmNlLW1hcC9zb3VyY2Utbm9kZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL25vZGVfbW9kdWxlcy9zb3VyY2UtbWFwL2xpYi9zb3VyY2UtbWFwL3V0aWwuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvc291cmNlLW1hcC9ub2RlX21vZHVsZXMvYW1kZWZpbmUvYW1kZWZpbmUuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvY29tcG9uZW50cy9JQmluZGFibGUuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvY29tcG9uZW50cy9mYWNldC9mYWNldC5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0SGlzdG9ncmFtLmpzIiwicHVibGljL2phdmFzY3JpcHRzL2NvbXBvbmVudHMvZmFjZXQvZmFjZXRIaXN0b2dyYW1CYXIuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvY29tcG9uZW50cy9mYWNldC9mYWNldEhpc3RvZ3JhbUZpbHRlci5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0SG9yaXpvbnRhbC5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9jb21wb25lbnRzL2ZhY2V0L2ZhY2V0VmVydGljYWwuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvY29tcG9uZW50cy9ncm91cC5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9jb21wb25lbnRzL3F1ZXJ5Z3JvdXAuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvaGVscGVycy5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy9tYWluLmpzIiwicHVibGljL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9mYWNldEhvcml6b250YWwuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdGVtcGxhdGVzL2ZhY2V0VmVydGljYWwuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdGVtcGxhdGVzL2ZhY2V0VmVydGljYWxfaWNvbi5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvZmFjZXRWZXJ0aWNhbF9saW5rcy5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvZmFjZXRWZXJ0aWNhbF9xdWVyeUNsb3NlLmpzIiwicHVibGljL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9mYWNldFZlcnRpY2FsX3NlYXJjaC5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvZ3JvdXAtbW9yZS5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvZ3JvdXAuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdGVtcGxhdGVzL21haW4uanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3F1ZXJ5Z3JvdXAuanMiLCJwdWJsaWMvamF2YXNjcmlwdHMvdXRpbC9jb2xvci5qcyIsInB1YmxpYy9qYXZhc2NyaXB0cy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JpQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2haQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkID0gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9O1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX3J1bnRpbWUgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMucnVudGltZScpO1xuXG52YXIgX3J1bnRpbWUyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3J1bnRpbWUpO1xuXG4vLyBDb21waWxlciBpbXBvcnRzXG5cbnZhciBfQVNUID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2NvbXBpbGVyL2FzdCcpO1xuXG52YXIgX0FTVDIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfQVNUKTtcblxudmFyIF9QYXJzZXIkcGFyc2UgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvY29tcGlsZXIvYmFzZScpO1xuXG52YXIgX0NvbXBpbGVyJGNvbXBpbGUkcHJlY29tcGlsZSA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlcicpO1xuXG52YXIgX0phdmFTY3JpcHRDb21waWxlciA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyJyk7XG5cbnZhciBfSmF2YVNjcmlwdENvbXBpbGVyMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9KYXZhU2NyaXB0Q29tcGlsZXIpO1xuXG52YXIgX1Zpc2l0b3IgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvY29tcGlsZXIvdmlzaXRvcicpO1xuXG52YXIgX1Zpc2l0b3IyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX1Zpc2l0b3IpO1xuXG52YXIgX25vQ29uZmxpY3QgPSByZXF1aXJlKCcuL2hhbmRsZWJhcnMvbm8tY29uZmxpY3QnKTtcblxudmFyIF9ub0NvbmZsaWN0MiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9ub0NvbmZsaWN0KTtcblxudmFyIF9jcmVhdGUgPSBfcnVudGltZTJbJ2RlZmF1bHQnXS5jcmVhdGU7XG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIHZhciBoYiA9IF9jcmVhdGUoKTtcblxuICBoYi5jb21waWxlID0gZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIF9Db21waWxlciRjb21waWxlJHByZWNvbXBpbGUuY29tcGlsZShpbnB1dCwgb3B0aW9ucywgaGIpO1xuICB9O1xuICBoYi5wcmVjb21waWxlID0gZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIF9Db21waWxlciRjb21waWxlJHByZWNvbXBpbGUucHJlY29tcGlsZShpbnB1dCwgb3B0aW9ucywgaGIpO1xuICB9O1xuXG4gIGhiLkFTVCA9IF9BU1QyWydkZWZhdWx0J107XG4gIGhiLkNvbXBpbGVyID0gX0NvbXBpbGVyJGNvbXBpbGUkcHJlY29tcGlsZS5Db21waWxlcjtcbiAgaGIuSmF2YVNjcmlwdENvbXBpbGVyID0gX0phdmFTY3JpcHRDb21waWxlcjJbJ2RlZmF1bHQnXTtcbiAgaGIuUGFyc2VyID0gX1BhcnNlciRwYXJzZS5wYXJzZXI7XG4gIGhiLnBhcnNlID0gX1BhcnNlciRwYXJzZS5wYXJzZTtcblxuICByZXR1cm4gaGI7XG59XG5cbnZhciBpbnN0ID0gY3JlYXRlKCk7XG5pbnN0LmNyZWF0ZSA9IGNyZWF0ZTtcblxuX25vQ29uZmxpY3QyWydkZWZhdWx0J10oaW5zdCk7XG5cbmluc3QuVmlzaXRvciA9IF9WaXNpdG9yMlsnZGVmYXVsdCddO1xuXG5pbnN0WydkZWZhdWx0J10gPSBpbnN0O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBpbnN0O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2Jhc2UnKTtcblxudmFyIGJhc2UgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0KTtcblxuLy8gRWFjaCBvZiB0aGVzZSBhdWdtZW50IHRoZSBIYW5kbGViYXJzIG9iamVjdC4gTm8gbmVlZCB0byBzZXR1cCBoZXJlLlxuLy8gKFRoaXMgaXMgZG9uZSB0byBlYXNpbHkgc2hhcmUgY29kZSBiZXR3ZWVuIGNvbW1vbmpzIGFuZCBicm93c2UgZW52cylcblxudmFyIF9TYWZlU3RyaW5nID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3NhZmUtc3RyaW5nJyk7XG5cbnZhciBfU2FmZVN0cmluZzIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfU2FmZVN0cmluZyk7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9pbXBvcnQyID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQyKTtcblxudmFyIF9pbXBvcnQzID0gcmVxdWlyZSgnLi9oYW5kbGViYXJzL3J1bnRpbWUnKTtcblxudmFyIHJ1bnRpbWUgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfaW1wb3J0Myk7XG5cbnZhciBfbm9Db25mbGljdCA9IHJlcXVpcmUoJy4vaGFuZGxlYmFycy9uby1jb25mbGljdCcpO1xuXG52YXIgX25vQ29uZmxpY3QyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX25vQ29uZmxpY3QpO1xuXG4vLyBGb3IgY29tcGF0aWJpbGl0eSBhbmQgdXNhZ2Ugb3V0c2lkZSBvZiBtb2R1bGUgc3lzdGVtcywgbWFrZSB0aGUgSGFuZGxlYmFycyBvYmplY3QgYSBuYW1lc3BhY2VcbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIGhiID0gbmV3IGJhc2UuSGFuZGxlYmFyc0Vudmlyb25tZW50KCk7XG5cbiAgVXRpbHMuZXh0ZW5kKGhiLCBiYXNlKTtcbiAgaGIuU2FmZVN0cmluZyA9IF9TYWZlU3RyaW5nMlsnZGVmYXVsdCddO1xuICBoYi5FeGNlcHRpb24gPSBfRXhjZXB0aW9uMlsnZGVmYXVsdCddO1xuICBoYi5VdGlscyA9IFV0aWxzO1xuICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICBoYi5WTSA9IHJ1bnRpbWU7XG4gIGhiLnRlbXBsYXRlID0gZnVuY3Rpb24gKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBoYik7XG4gIH07XG5cbiAgcmV0dXJuIGhiO1xufVxuXG52YXIgaW5zdCA9IGNyZWF0ZSgpO1xuaW5zdC5jcmVhdGUgPSBjcmVhdGU7XG5cbl9ub0NvbmZsaWN0MlsnZGVmYXVsdCddKGluc3QpO1xuXG5pbnN0WydkZWZhdWx0J10gPSBpbnN0O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBpbnN0O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLkhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IEhhbmRsZWJhcnNFbnZpcm9ubWVudDtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgVkVSU0lPTiA9ICczLjAuMSc7XG5leHBvcnRzLlZFUlNJT04gPSBWRVJTSU9OO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gNjtcblxuZXhwb3J0cy5DT01QSUxFUl9SRVZJU0lPTiA9IENPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPT0gMS54LngnLFxuICA1OiAnPT0gMi4wLjAtYWxwaGEueCcsXG4gIDY6ICc+PSAyLjAuMC1iZXRhLjEnXG59O1xuXG5leHBvcnRzLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xudmFyIGlzQXJyYXkgPSBVdGlscy5pc0FycmF5LFxuICAgIGlzRnVuY3Rpb24gPSBVdGlscy5pc0Z1bmN0aW9uLFxuICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59XG5cbkhhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbiByZWdpc3RlckhlbHBlcihuYW1lLCBmbikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoZm4pIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpO1xuICAgICAgfVxuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlckhlbHBlcjogZnVuY3Rpb24gdW5yZWdpc3RlckhlbHBlcihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuaGVscGVyc1tuYW1lXTtcbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uIHJlZ2lzdGVyUGFydGlhbChuYW1lLCBwYXJ0aWFsKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBwYXJ0aWFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnQXR0ZW1wdGluZyB0byByZWdpc3RlciBhIHBhcnRpYWwgYXMgdW5kZWZpbmVkJyk7XG4gICAgICB9XG4gICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gcGFydGlhbDtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbiB1bnJlZ2lzdGVyUGFydGlhbChuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMucGFydGlhbHNbbmFtZV07XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIC8vIEEgbWlzc2luZyBmaWVsZCBpbiBhIHt7Zm9vfX0gY29uc3R1Y3QuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb21lb25lIGlzIGFjdHVhbGx5IHRyeWluZyB0byBjYWxsIHNvbWV0aGluZywgYmxvdyB1cC5cbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdNaXNzaW5nIGhlbHBlcjogXCInICsgYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXS5uYW1lICsgJ1wiJyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZiAoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmlkcykge1xuICAgICAgICAgIG9wdGlvbnMuaWRzID0gW29wdGlvbnMubmFtZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgICAgICBvcHRpb25zID0geyBkYXRhOiBkYXRhIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdNdXN0IHBhc3MgaXRlcmF0b3IgdG8gI2VhY2gnKTtcbiAgICB9XG5cbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuLFxuICAgICAgICBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgcmV0ID0gJycsXG4gICAgICAgIGRhdGEgPSB1bmRlZmluZWQsXG4gICAgICAgIGNvbnRleHRQYXRoID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKSArICcuJztcbiAgICB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkge1xuICAgICAgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleGVjSXRlcmF0aW9uKGZpZWxkLCBpbmRleCwgbGFzdCkge1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgZGF0YS5rZXkgPSBmaWVsZDtcbiAgICAgICAgZGF0YS5pbmRleCA9IGluZGV4O1xuICAgICAgICBkYXRhLmZpcnN0ID0gaW5kZXggPT09IDA7XG4gICAgICAgIGRhdGEubGFzdCA9ICEhbGFzdDtcblxuICAgICAgICBpZiAoY29udGV4dFBhdGgpIHtcbiAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gY29udGV4dFBhdGggKyBmaWVsZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ZpZWxkXSwge1xuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBibG9ja1BhcmFtczogVXRpbHMuYmxvY2tQYXJhbXMoW2NvbnRleHRbZmllbGRdLCBmaWVsZF0sIFtjb250ZXh0UGF0aCArIGZpZWxkLCBudWxsXSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgZXhlY0l0ZXJhdGlvbihpLCBpLCBpID09PSBjb250ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcHJpb3JLZXkgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAvLyBXZSdyZSBydW5uaW5nIHRoZSBpdGVyYXRpb25zIG9uZSBzdGVwIG91dCBvZiBzeW5jIHNvIHdlIGNhbiBkZXRlY3RcbiAgICAgICAgICAgIC8vIHRoZSBsYXN0IGl0ZXJhdGlvbiB3aXRob3V0IGhhdmUgdG8gc2NhbiB0aGUgb2JqZWN0IHR3aWNlIGFuZCBjcmVhdGVcbiAgICAgICAgICAgIC8vIGFuIGl0ZXJtZWRpYXRlIGtleXMgYXJyYXkuXG4gICAgICAgICAgICBpZiAocHJpb3JLZXkpIHtcbiAgICAgICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpb3JLZXkgPSBrZXk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwcmlvcktleSkge1xuICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uIChjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkge1xuICAgICAgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cbiAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGJlaGF2aW9yIG9mIGlzRW1wdHkuIEVmZmVjdGl2ZWx5IHRoaXMgZGV0ZXJtaW5lcyBpZiAwIGlzIGhhbmRsZWQgYnkgdGhlIHBvc2l0aXZlIHBhdGggb3IgbmVnYXRpdmUuXG4gICAgaWYgKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbiAoY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7IGZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaCB9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoIVV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gVXRpbHMuYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSk7XG4gICAgICAgIG9wdGlvbnMgPSB7IGRhdGE6IGRhdGEgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uIChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgbWVzc2FnZSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb29rdXAnLCBmdW5jdGlvbiAob2JqLCBmaWVsZCkge1xuICAgIHJldHVybiBvYmogJiYgb2JqW2ZpZWxkXTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMSxcblxuICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uIGxvZyhsZXZlbCwgbWVzc2FnZSkge1xuICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICAoY29uc29sZVttZXRob2RdIHx8IGNvbnNvbGUubG9nKS5jYWxsKGNvbnNvbGUsIG1lc3NhZ2UpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xudmFyIGxvZyA9IGxvZ2dlci5sb2c7XG5cbmV4cG9ydHMubG9nID0gbG9nO1xuXG5mdW5jdGlvbiBjcmVhdGVGcmFtZShvYmplY3QpIHtcbiAgdmFyIGZyYW1lID0gVXRpbHMuZXh0ZW5kKHt9LCBvYmplY3QpO1xuICBmcmFtZS5fcGFyZW50ID0gb2JqZWN0O1xuICByZXR1cm4gZnJhbWU7XG59XG5cbi8qIFthcmdzLCBdb3B0aW9ucyAqLyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbnZhciBBU1QgPSB7XG4gIFByb2dyYW06IGZ1bmN0aW9uIFByb2dyYW0oc3RhdGVtZW50cywgYmxvY2tQYXJhbXMsIHN0cmlwLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdQcm9ncmFtJztcbiAgICB0aGlzLmJvZHkgPSBzdGF0ZW1lbnRzO1xuXG4gICAgdGhpcy5ibG9ja1BhcmFtcyA9IGJsb2NrUGFyYW1zO1xuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcbiAgfSxcblxuICBNdXN0YWNoZVN0YXRlbWVudDogZnVuY3Rpb24gTXVzdGFjaGVTdGF0ZW1lbnQocGF0aCwgcGFyYW1zLCBoYXNoLCBlc2NhcGVkLCBzdHJpcCwgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnTXVzdGFjaGVTdGF0ZW1lbnQnO1xuXG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcyB8fCBbXTtcbiAgICB0aGlzLmhhc2ggPSBoYXNoO1xuICAgIHRoaXMuZXNjYXBlZCA9IGVzY2FwZWQ7XG5cbiAgICB0aGlzLnN0cmlwID0gc3RyaXA7XG4gIH0sXG5cbiAgQmxvY2tTdGF0ZW1lbnQ6IGZ1bmN0aW9uIEJsb2NrU3RhdGVtZW50KHBhdGgsIHBhcmFtcywgaGFzaCwgcHJvZ3JhbSwgaW52ZXJzZSwgb3BlblN0cmlwLCBpbnZlcnNlU3RyaXAsIGNsb3NlU3RyaXAsIGxvY0luZm8pIHtcbiAgICB0aGlzLmxvYyA9IGxvY0luZm87XG4gICAgdGhpcy50eXBlID0gJ0Jsb2NrU3RhdGVtZW50JztcblxuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgdGhpcy5wYXJhbXMgPSBwYXJhbXMgfHwgW107XG4gICAgdGhpcy5oYXNoID0gaGFzaDtcbiAgICB0aGlzLnByb2dyYW0gPSBwcm9ncmFtO1xuICAgIHRoaXMuaW52ZXJzZSA9IGludmVyc2U7XG5cbiAgICB0aGlzLm9wZW5TdHJpcCA9IG9wZW5TdHJpcDtcbiAgICB0aGlzLmludmVyc2VTdHJpcCA9IGludmVyc2VTdHJpcDtcbiAgICB0aGlzLmNsb3NlU3RyaXAgPSBjbG9zZVN0cmlwO1xuICB9LFxuXG4gIFBhcnRpYWxTdGF0ZW1lbnQ6IGZ1bmN0aW9uIFBhcnRpYWxTdGF0ZW1lbnQobmFtZSwgcGFyYW1zLCBoYXNoLCBzdHJpcCwgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnUGFydGlhbFN0YXRlbWVudCc7XG5cbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMucGFyYW1zID0gcGFyYW1zIHx8IFtdO1xuICAgIHRoaXMuaGFzaCA9IGhhc2g7XG5cbiAgICB0aGlzLmluZGVudCA9ICcnO1xuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcbiAgfSxcblxuICBDb250ZW50U3RhdGVtZW50OiBmdW5jdGlvbiBDb250ZW50U3RhdGVtZW50KHN0cmluZywgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnQ29udGVudFN0YXRlbWVudCc7XG4gICAgdGhpcy5vcmlnaW5hbCA9IHRoaXMudmFsdWUgPSBzdHJpbmc7XG4gIH0sXG5cbiAgQ29tbWVudFN0YXRlbWVudDogZnVuY3Rpb24gQ29tbWVudFN0YXRlbWVudChjb21tZW50LCBzdHJpcCwgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnQ29tbWVudFN0YXRlbWVudCc7XG4gICAgdGhpcy52YWx1ZSA9IGNvbW1lbnQ7XG5cbiAgICB0aGlzLnN0cmlwID0gc3RyaXA7XG4gIH0sXG5cbiAgU3ViRXhwcmVzc2lvbjogZnVuY3Rpb24gU3ViRXhwcmVzc2lvbihwYXRoLCBwYXJhbXMsIGhhc2gsIGxvY0luZm8pIHtcbiAgICB0aGlzLmxvYyA9IGxvY0luZm87XG5cbiAgICB0aGlzLnR5cGUgPSAnU3ViRXhwcmVzc2lvbic7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcyB8fCBbXTtcbiAgICB0aGlzLmhhc2ggPSBoYXNoO1xuICB9LFxuXG4gIFBhdGhFeHByZXNzaW9uOiBmdW5jdGlvbiBQYXRoRXhwcmVzc2lvbihkYXRhLCBkZXB0aCwgcGFydHMsIG9yaWdpbmFsLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdQYXRoRXhwcmVzc2lvbic7XG5cbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgIHRoaXMub3JpZ2luYWwgPSBvcmlnaW5hbDtcbiAgICB0aGlzLnBhcnRzID0gcGFydHM7XG4gICAgdGhpcy5kZXB0aCA9IGRlcHRoO1xuICB9LFxuXG4gIFN0cmluZ0xpdGVyYWw6IGZ1bmN0aW9uIFN0cmluZ0xpdGVyYWwoc3RyaW5nLCBsb2NJbmZvKSB7XG4gICAgdGhpcy5sb2MgPSBsb2NJbmZvO1xuICAgIHRoaXMudHlwZSA9ICdTdHJpbmdMaXRlcmFsJztcbiAgICB0aGlzLm9yaWdpbmFsID0gdGhpcy52YWx1ZSA9IHN0cmluZztcbiAgfSxcblxuICBOdW1iZXJMaXRlcmFsOiBmdW5jdGlvbiBOdW1iZXJMaXRlcmFsKG51bWJlciwgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnTnVtYmVyTGl0ZXJhbCc7XG4gICAgdGhpcy5vcmlnaW5hbCA9IHRoaXMudmFsdWUgPSBOdW1iZXIobnVtYmVyKTtcbiAgfSxcblxuICBCb29sZWFuTGl0ZXJhbDogZnVuY3Rpb24gQm9vbGVhbkxpdGVyYWwoYm9vbCwgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnQm9vbGVhbkxpdGVyYWwnO1xuICAgIHRoaXMub3JpZ2luYWwgPSB0aGlzLnZhbHVlID0gYm9vbCA9PT0gJ3RydWUnO1xuICB9LFxuXG4gIFVuZGVmaW5lZExpdGVyYWw6IGZ1bmN0aW9uIFVuZGVmaW5lZExpdGVyYWwobG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnVW5kZWZpbmVkTGl0ZXJhbCc7XG4gICAgdGhpcy5vcmlnaW5hbCA9IHRoaXMudmFsdWUgPSB1bmRlZmluZWQ7XG4gIH0sXG5cbiAgTnVsbExpdGVyYWw6IGZ1bmN0aW9uIE51bGxMaXRlcmFsKGxvY0luZm8pIHtcbiAgICB0aGlzLmxvYyA9IGxvY0luZm87XG4gICAgdGhpcy50eXBlID0gJ051bGxMaXRlcmFsJztcbiAgICB0aGlzLm9yaWdpbmFsID0gdGhpcy52YWx1ZSA9IG51bGw7XG4gIH0sXG5cbiAgSGFzaDogZnVuY3Rpb24gSGFzaChwYWlycywgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnSGFzaCc7XG4gICAgdGhpcy5wYWlycyA9IHBhaXJzO1xuICB9LFxuICBIYXNoUGFpcjogZnVuY3Rpb24gSGFzaFBhaXIoa2V5LCB2YWx1ZSwgbG9jSW5mbykge1xuICAgIHRoaXMubG9jID0gbG9jSW5mbztcbiAgICB0aGlzLnR5cGUgPSAnSGFzaFBhaXInO1xuICAgIHRoaXMua2V5ID0ga2V5O1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgfSxcblxuICAvLyBQdWJsaWMgQVBJIHVzZWQgdG8gZXZhbHVhdGUgZGVyaXZlZCBhdHRyaWJ1dGVzIHJlZ2FyZGluZyBBU1Qgbm9kZXNcbiAgaGVscGVyczoge1xuICAgIC8vIGEgbXVzdGFjaGUgaXMgZGVmaW5pdGVseSBhIGhlbHBlciBpZjpcbiAgICAvLyAqIGl0IGlzIGFuIGVsaWdpYmxlIGhlbHBlciwgYW5kXG4gICAgLy8gKiBpdCBoYXMgYXQgbGVhc3Qgb25lIHBhcmFtZXRlciBvciBoYXNoIHNlZ21lbnRcbiAgICBoZWxwZXJFeHByZXNzaW9uOiBmdW5jdGlvbiBoZWxwZXJFeHByZXNzaW9uKG5vZGUpIHtcbiAgICAgIHJldHVybiAhIShub2RlLnR5cGUgPT09ICdTdWJFeHByZXNzaW9uJyB8fCBub2RlLnBhcmFtcy5sZW5ndGggfHwgbm9kZS5oYXNoKTtcbiAgICB9LFxuXG4gICAgc2NvcGVkSWQ6IGZ1bmN0aW9uIHNjb3BlZElkKHBhdGgpIHtcbiAgICAgIHJldHVybiAvXlxcLnx0aGlzXFxiLy50ZXN0KHBhdGgub3JpZ2luYWwpO1xuICAgIH0sXG5cbiAgICAvLyBhbiBJRCBpcyBzaW1wbGUgaWYgaXQgb25seSBoYXMgb25lIHBhcnQsIGFuZCB0aGF0IHBhcnQgaXMgbm90XG4gICAgLy8gYC4uYCBvciBgdGhpc2AuXG4gICAgc2ltcGxlSWQ6IGZ1bmN0aW9uIHNpbXBsZUlkKHBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoLnBhcnRzLmxlbmd0aCA9PT0gMSAmJiAhQVNULmhlbHBlcnMuc2NvcGVkSWQocGF0aCkgJiYgIXBhdGguZGVwdGg7XG4gICAgfVxuICB9XG59O1xuXG4vLyBNdXN0IGJlIGV4cG9ydGVkIGFzIGFuIG9iamVjdCByYXRoZXIgdGhhbiB0aGUgcm9vdCBvZiB0aGUgbW9kdWxlIGFzIHRoZSBqaXNvbiBsZXhlclxuLy8gbXVzdCBtb2RpZnkgdGhlIG9iamVjdCB0byBvcGVyYXRlIHByb3Blcmx5LlxuZXhwb3J0c1snZGVmYXVsdCddID0gQVNUO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLnBhcnNlID0gcGFyc2U7XG5cbnZhciBfcGFyc2VyID0gcmVxdWlyZSgnLi9wYXJzZXInKTtcblxudmFyIF9wYXJzZXIyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3BhcnNlcik7XG5cbnZhciBfQVNUID0gcmVxdWlyZSgnLi9hc3QnKTtcblxudmFyIF9BU1QyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0FTVCk7XG5cbnZhciBfV2hpdGVzcGFjZUNvbnRyb2wgPSByZXF1aXJlKCcuL3doaXRlc3BhY2UtY29udHJvbCcpO1xuXG52YXIgX1doaXRlc3BhY2VDb250cm9sMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9XaGl0ZXNwYWNlQ29udHJvbCk7XG5cbnZhciBfaW1wb3J0ID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XG5cbnZhciBIZWxwZXJzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2ltcG9ydCk7XG5cbnZhciBfZXh0ZW5kID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuZXhwb3J0cy5wYXJzZXIgPSBfcGFyc2VyMlsnZGVmYXVsdCddO1xuXG52YXIgeXkgPSB7fTtcbl9leHRlbmQuZXh0ZW5kKHl5LCBIZWxwZXJzLCBfQVNUMlsnZGVmYXVsdCddKTtcblxuZnVuY3Rpb24gcGFyc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgLy8gSnVzdCByZXR1cm4gaWYgYW4gYWxyZWFkeS1jb21waWxlZCBBU1Qgd2FzIHBhc3NlZCBpbi5cbiAgaWYgKGlucHV0LnR5cGUgPT09ICdQcm9ncmFtJykge1xuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIF9wYXJzZXIyWydkZWZhdWx0J10ueXkgPSB5eTtcblxuICAvLyBBbHRlcmluZyB0aGUgc2hhcmVkIG9iamVjdCBoZXJlLCBidXQgdGhpcyBpcyBvayBhcyBwYXJzZXIgaXMgYSBzeW5jIG9wZXJhdGlvblxuICB5eS5sb2NJbmZvID0gZnVuY3Rpb24gKGxvY0luZm8pIHtcbiAgICByZXR1cm4gbmV3IHl5LlNvdXJjZUxvY2F0aW9uKG9wdGlvbnMgJiYgb3B0aW9ucy5zcmNOYW1lLCBsb2NJbmZvKTtcbiAgfTtcblxuICB2YXIgc3RyaXAgPSBuZXcgX1doaXRlc3BhY2VDb250cm9sMlsnZGVmYXVsdCddKCk7XG4gIHJldHVybiBzdHJpcC5hY2NlcHQoX3BhcnNlcjJbJ2RlZmF1bHQnXS5wYXJzZShpbnB1dCkpO1xufSIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbi8qZ2xvYmFsIGRlZmluZSAqL1xuXG52YXIgX2lzQXJyYXkgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG52YXIgU291cmNlTm9kZSA9IHVuZGVmaW5lZDtcblxudHJ5IHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICdmdW5jdGlvbicgfHwgIWRlZmluZS5hbWQpIHtcbiAgICAvLyBXZSBkb24ndCBzdXBwb3J0IHRoaXMgaW4gQU1EIGVudmlyb25tZW50cy4gRm9yIHRoZXNlIGVudmlyb25tZW50cywgd2UgYXN1c21lIHRoYXRcbiAgICAvLyB0aGV5IGFyZSBydW5uaW5nIG9uIHRoZSBicm93c2VyIGFuZCB0aHVzIGhhdmUgbm8gbmVlZCBmb3IgdGhlIHNvdXJjZS1tYXAgbGlicmFyeS5cbiAgICB2YXIgU291cmNlTWFwID0gcmVxdWlyZSgnc291cmNlLW1hcCcpO1xuICAgIFNvdXJjZU5vZGUgPSBTb3VyY2VNYXAuU291cmNlTm9kZTtcbiAgfVxufSBjYXRjaCAoZXJyKSB7fVxuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgaWY6IHRlc3RlZCBidXQgbm90IGNvdmVyZWQgaW4gaXN0YW5idWwgZHVlIHRvIGRpc3QgYnVpbGQgICovXG5pZiAoIVNvdXJjZU5vZGUpIHtcbiAgU291cmNlTm9kZSA9IGZ1bmN0aW9uIChsaW5lLCBjb2x1bW4sIHNyY0ZpbGUsIGNodW5rcykge1xuICAgIHRoaXMuc3JjID0gJyc7XG4gICAgaWYgKGNodW5rcykge1xuICAgICAgdGhpcy5hZGQoY2h1bmtzKTtcbiAgICB9XG4gIH07XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIFNvdXJjZU5vZGUucHJvdG90eXBlID0ge1xuICAgIGFkZDogZnVuY3Rpb24gYWRkKGNodW5rcykge1xuICAgICAgaWYgKF9pc0FycmF5LmlzQXJyYXkoY2h1bmtzKSkge1xuICAgICAgICBjaHVua3MgPSBjaHVua3Muam9pbignJyk7XG4gICAgICB9XG4gICAgICB0aGlzLnNyYyArPSBjaHVua3M7XG4gICAgfSxcbiAgICBwcmVwZW5kOiBmdW5jdGlvbiBwcmVwZW5kKGNodW5rcykge1xuICAgICAgaWYgKF9pc0FycmF5LmlzQXJyYXkoY2h1bmtzKSkge1xuICAgICAgICBjaHVua3MgPSBjaHVua3Muam9pbignJyk7XG4gICAgICB9XG4gICAgICB0aGlzLnNyYyA9IGNodW5rcyArIHRoaXMuc3JjO1xuICAgIH0sXG4gICAgdG9TdHJpbmdXaXRoU291cmNlTWFwOiBmdW5jdGlvbiB0b1N0cmluZ1dpdGhTb3VyY2VNYXAoKSB7XG4gICAgICByZXR1cm4geyBjb2RlOiB0aGlzLnRvU3RyaW5nKCkgfTtcbiAgICB9LFxuICAgIHRvU3RyaW5nOiBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgIHJldHVybiB0aGlzLnNyYztcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNhc3RDaHVuayhjaHVuaywgY29kZUdlbiwgbG9jKSB7XG4gIGlmIChfaXNBcnJheS5pc0FycmF5KGNodW5rKSkge1xuICAgIHZhciByZXQgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjaHVuay5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgcmV0LnB1c2goY29kZUdlbi53cmFwKGNodW5rW2ldLCBsb2MpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY2h1bmsgPT09ICdib29sZWFuJyB8fCB0eXBlb2YgY2h1bmsgPT09ICdudW1iZXInKSB7XG4gICAgLy8gSGFuZGxlIHByaW1pdGl2ZXMgdGhhdCB0aGUgU291cmNlTm9kZSB3aWxsIHRocm93IHVwIG9uXG4gICAgcmV0dXJuIGNodW5rICsgJyc7XG4gIH1cbiAgcmV0dXJuIGNodW5rO1xufVxuXG5mdW5jdGlvbiBDb2RlR2VuKHNyY0ZpbGUpIHtcbiAgdGhpcy5zcmNGaWxlID0gc3JjRmlsZTtcbiAgdGhpcy5zb3VyY2UgPSBbXTtcbn1cblxuQ29kZUdlbi5wcm90b3R5cGUgPSB7XG4gIHByZXBlbmQ6IGZ1bmN0aW9uIHByZXBlbmQoc291cmNlLCBsb2MpIHtcbiAgICB0aGlzLnNvdXJjZS51bnNoaWZ0KHRoaXMud3JhcChzb3VyY2UsIGxvYykpO1xuICB9LFxuICBwdXNoOiBmdW5jdGlvbiBwdXNoKHNvdXJjZSwgbG9jKSB7XG4gICAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLndyYXAoc291cmNlLCBsb2MpKTtcbiAgfSxcblxuICBtZXJnZTogZnVuY3Rpb24gbWVyZ2UoKSB7XG4gICAgdmFyIHNvdXJjZSA9IHRoaXMuZW1wdHkoKTtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgIHNvdXJjZS5hZGQoWycgICcsIGxpbmUsICdcXG4nXSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNvdXJjZTtcbiAgfSxcblxuICBlYWNoOiBmdW5jdGlvbiBlYWNoKGl0ZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5zb3VyY2UubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGl0ZXIodGhpcy5zb3VyY2VbaV0pO1xuICAgIH1cbiAgfSxcblxuICBlbXB0eTogZnVuY3Rpb24gZW1wdHkoKSB7XG4gICAgdmFyIGxvYyA9IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy5jdXJyZW50TG9jYXRpb24gfHwgeyBzdGFydDoge30gfSA6IGFyZ3VtZW50c1swXTtcblxuICAgIHJldHVybiBuZXcgU291cmNlTm9kZShsb2Muc3RhcnQubGluZSwgbG9jLnN0YXJ0LmNvbHVtbiwgdGhpcy5zcmNGaWxlKTtcbiAgfSxcbiAgd3JhcDogZnVuY3Rpb24gd3JhcChjaHVuaykge1xuICAgIHZhciBsb2MgPSBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHRoaXMuY3VycmVudExvY2F0aW9uIHx8IHsgc3RhcnQ6IHt9IH0gOiBhcmd1bWVudHNbMV07XG5cbiAgICBpZiAoY2h1bmsgaW5zdGFuY2VvZiBTb3VyY2VOb2RlKSB7XG4gICAgICByZXR1cm4gY2h1bms7XG4gICAgfVxuXG4gICAgY2h1bmsgPSBjYXN0Q2h1bmsoY2h1bmssIHRoaXMsIGxvYyk7XG5cbiAgICByZXR1cm4gbmV3IFNvdXJjZU5vZGUobG9jLnN0YXJ0LmxpbmUsIGxvYy5zdGFydC5jb2x1bW4sIHRoaXMuc3JjRmlsZSwgY2h1bmspO1xuICB9LFxuXG4gIGZ1bmN0aW9uQ2FsbDogZnVuY3Rpb24gZnVuY3Rpb25DYWxsKGZuLCB0eXBlLCBwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSB0aGlzLmdlbmVyYXRlTGlzdChwYXJhbXMpO1xuICAgIHJldHVybiB0aGlzLndyYXAoW2ZuLCB0eXBlID8gJy4nICsgdHlwZSArICcoJyA6ICcoJywgcGFyYW1zLCAnKSddKTtcbiAgfSxcblxuICBxdW90ZWRTdHJpbmc6IGZ1bmN0aW9uIHF1b3RlZFN0cmluZyhzdHIpIHtcbiAgICByZXR1cm4gJ1wiJyArIChzdHIgKyAnJykucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykucmVwbGFjZSgvXFxuL2csICdcXFxcbicpLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKS5yZXBsYWNlKC9cXHUyMDI4L2csICdcXFxcdTIwMjgnKSAvLyBQZXIgRWNtYS0yNjIgNy4zICsgNy44LjRcbiAgICAucmVwbGFjZSgvXFx1MjAyOS9nLCAnXFxcXHUyMDI5JykgKyAnXCInO1xuICB9LFxuXG4gIG9iamVjdExpdGVyYWw6IGZ1bmN0aW9uIG9iamVjdExpdGVyYWwob2JqKSB7XG4gICAgdmFyIHBhaXJzID0gW107XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gY2FzdENodW5rKG9ialtrZXldLCB0aGlzKTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHBhaXJzLnB1c2goW3RoaXMucXVvdGVkU3RyaW5nKGtleSksICc6JywgdmFsdWVdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHZhciByZXQgPSB0aGlzLmdlbmVyYXRlTGlzdChwYWlycyk7XG4gICAgcmV0LnByZXBlbmQoJ3snKTtcbiAgICByZXQuYWRkKCd9Jyk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBnZW5lcmF0ZUxpc3Q6IGZ1bmN0aW9uIGdlbmVyYXRlTGlzdChlbnRyaWVzLCBsb2MpIHtcbiAgICB2YXIgcmV0ID0gdGhpcy5lbXB0eShsb2MpO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGVudHJpZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChpKSB7XG4gICAgICAgIHJldC5hZGQoJywnKTtcbiAgICAgIH1cblxuICAgICAgcmV0LmFkZChjYXN0Q2h1bmsoZW50cmllc1tpXSwgdGhpcywgbG9jKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBnZW5lcmF0ZUFycmF5OiBmdW5jdGlvbiBnZW5lcmF0ZUFycmF5KGVudHJpZXMsIGxvYykge1xuICAgIHZhciByZXQgPSB0aGlzLmdlbmVyYXRlTGlzdChlbnRyaWVzLCBsb2MpO1xuICAgIHJldC5wcmVwZW5kKCdbJyk7XG4gICAgcmV0LmFkZCgnXScpO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxufTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gQ29kZUdlbjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddO1xuXG4vKiBOT1AgKi8iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuQ29tcGlsZXIgPSBDb21waWxlcjtcbmV4cG9ydHMucHJlY29tcGlsZSA9IHByZWNvbXBpbGU7XG5leHBvcnRzLmNvbXBpbGUgPSBjb21waWxlO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4uL2V4Y2VwdGlvbicpO1xuXG52YXIgX0V4Y2VwdGlvbjIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfRXhjZXB0aW9uKTtcblxudmFyIF9pc0FycmF5JGluZGV4T2YgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG52YXIgX0FTVCA9IHJlcXVpcmUoJy4vYXN0Jyk7XG5cbnZhciBfQVNUMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9BU1QpO1xuXG52YXIgc2xpY2UgPSBbXS5zbGljZTtcblxuZnVuY3Rpb24gQ29tcGlsZXIoKSB7fVxuXG4vLyB0aGUgZm91bmRIZWxwZXIgcmVnaXN0ZXIgd2lsbCBkaXNhbWJpZ3VhdGUgaGVscGVyIGxvb2t1cCBmcm9tIGZpbmRpbmcgYVxuLy8gZnVuY3Rpb24gaW4gYSBjb250ZXh0LiBUaGlzIGlzIG5lY2Vzc2FyeSBmb3IgbXVzdGFjaGUgY29tcGF0aWJpbGl0eSwgd2hpY2hcbi8vIHJlcXVpcmVzIHRoYXQgY29udGV4dCBmdW5jdGlvbnMgaW4gYmxvY2tzIGFyZSBldmFsdWF0ZWQgYnkgYmxvY2tIZWxwZXJNaXNzaW5nLFxuLy8gYW5kIHRoZW4gcHJvY2VlZCBhcyBpZiB0aGUgcmVzdWx0aW5nIHZhbHVlIHdhcyBwcm92aWRlZCB0byBibG9ja0hlbHBlck1pc3NpbmcuXG5cbkNvbXBpbGVyLnByb3RvdHlwZSA9IHtcbiAgY29tcGlsZXI6IENvbXBpbGVyLFxuXG4gIGVxdWFsczogZnVuY3Rpb24gZXF1YWxzKG90aGVyKSB7XG4gICAgdmFyIGxlbiA9IHRoaXMub3Bjb2Rlcy5sZW5ndGg7XG4gICAgaWYgKG90aGVyLm9wY29kZXMubGVuZ3RoICE9PSBsZW4pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgb3Bjb2RlID0gdGhpcy5vcGNvZGVzW2ldLFxuICAgICAgICAgIG90aGVyT3Bjb2RlID0gb3RoZXIub3Bjb2Rlc1tpXTtcbiAgICAgIGlmIChvcGNvZGUub3Bjb2RlICE9PSBvdGhlck9wY29kZS5vcGNvZGUgfHwgIWFyZ0VxdWFscyhvcGNvZGUuYXJncywgb3RoZXJPcGNvZGUuYXJncykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdlIGtub3cgdGhhdCBsZW5ndGggaXMgdGhlIHNhbWUgYmV0d2VlbiB0aGUgdHdvIGFycmF5cyBiZWNhdXNlIHRoZXkgYXJlIGRpcmVjdGx5IHRpZWRcbiAgICAvLyB0byB0aGUgb3Bjb2RlIGJlaGF2aW9yIGFib3ZlLlxuICAgIGxlbiA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy5jaGlsZHJlbltpXS5lcXVhbHMob3RoZXIuY2hpbGRyZW5baV0pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBndWlkOiAwLFxuXG4gIGNvbXBpbGU6IGZ1bmN0aW9uIGNvbXBpbGUocHJvZ3JhbSwgb3B0aW9ucykge1xuICAgIHRoaXMuc291cmNlTm9kZSA9IFtdO1xuICAgIHRoaXMub3Bjb2RlcyA9IFtdO1xuICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuc3RyaW5nUGFyYW1zID0gb3B0aW9ucy5zdHJpbmdQYXJhbXM7XG4gICAgdGhpcy50cmFja0lkcyA9IG9wdGlvbnMudHJhY2tJZHM7XG5cbiAgICBvcHRpb25zLmJsb2NrUGFyYW1zID0gb3B0aW9ucy5ibG9ja1BhcmFtcyB8fCBbXTtcblxuICAgIC8vIFRoZXNlIGNoYW5nZXMgd2lsbCBwcm9wYWdhdGUgdG8gdGhlIG90aGVyIGNvbXBpbGVyIGNvbXBvbmVudHNcbiAgICB2YXIga25vd25IZWxwZXJzID0gb3B0aW9ucy5rbm93bkhlbHBlcnM7XG4gICAgb3B0aW9ucy5rbm93bkhlbHBlcnMgPSB7XG4gICAgICBoZWxwZXJNaXNzaW5nOiB0cnVlLFxuICAgICAgYmxvY2tIZWxwZXJNaXNzaW5nOiB0cnVlLFxuICAgICAgZWFjaDogdHJ1ZSxcbiAgICAgICdpZic6IHRydWUsXG4gICAgICB1bmxlc3M6IHRydWUsXG4gICAgICAnd2l0aCc6IHRydWUsXG4gICAgICBsb2c6IHRydWUsXG4gICAgICBsb29rdXA6IHRydWVcbiAgICB9O1xuICAgIGlmIChrbm93bkhlbHBlcnMpIHtcbiAgICAgIGZvciAodmFyIF9uYW1lIGluIGtub3duSGVscGVycykge1xuICAgICAgICBpZiAoX25hbWUgaW4ga25vd25IZWxwZXJzKSB7XG4gICAgICAgICAgb3B0aW9ucy5rbm93bkhlbHBlcnNbX25hbWVdID0ga25vd25IZWxwZXJzW19uYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFjY2VwdChwcm9ncmFtKTtcbiAgfSxcblxuICBjb21waWxlUHJvZ3JhbTogZnVuY3Rpb24gY29tcGlsZVByb2dyYW0ocHJvZ3JhbSkge1xuICAgIHZhciBjaGlsZENvbXBpbGVyID0gbmV3IHRoaXMuY29tcGlsZXIoKSxcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuZXctY2FwXG4gICAgcmVzdWx0ID0gY2hpbGRDb21waWxlci5jb21waWxlKHByb2dyYW0sIHRoaXMub3B0aW9ucyksXG4gICAgICAgIGd1aWQgPSB0aGlzLmd1aWQrKztcblxuICAgIHRoaXMudXNlUGFydGlhbCA9IHRoaXMudXNlUGFydGlhbCB8fCByZXN1bHQudXNlUGFydGlhbDtcblxuICAgIHRoaXMuY2hpbGRyZW5bZ3VpZF0gPSByZXN1bHQ7XG4gICAgdGhpcy51c2VEZXB0aHMgPSB0aGlzLnVzZURlcHRocyB8fCByZXN1bHQudXNlRGVwdGhzO1xuXG4gICAgcmV0dXJuIGd1aWQ7XG4gIH0sXG5cbiAgYWNjZXB0OiBmdW5jdGlvbiBhY2NlcHQobm9kZSkge1xuICAgIHRoaXMuc291cmNlTm9kZS51bnNoaWZ0KG5vZGUpO1xuICAgIHZhciByZXQgPSB0aGlzW25vZGUudHlwZV0obm9kZSk7XG4gICAgdGhpcy5zb3VyY2VOb2RlLnNoaWZ0KCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBQcm9ncmFtOiBmdW5jdGlvbiBQcm9ncmFtKHByb2dyYW0pIHtcbiAgICB0aGlzLm9wdGlvbnMuYmxvY2tQYXJhbXMudW5zaGlmdChwcm9ncmFtLmJsb2NrUGFyYW1zKTtcblxuICAgIHZhciBib2R5ID0gcHJvZ3JhbS5ib2R5LFxuICAgICAgICBib2R5TGVuZ3RoID0gYm9keS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2R5TGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuYWNjZXB0KGJvZHlbaV0pO1xuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucy5ibG9ja1BhcmFtcy5zaGlmdCgpO1xuXG4gICAgdGhpcy5pc1NpbXBsZSA9IGJvZHlMZW5ndGggPT09IDE7XG4gICAgdGhpcy5ibG9ja1BhcmFtcyA9IHByb2dyYW0uYmxvY2tQYXJhbXMgPyBwcm9ncmFtLmJsb2NrUGFyYW1zLmxlbmd0aCA6IDA7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBCbG9ja1N0YXRlbWVudDogZnVuY3Rpb24gQmxvY2tTdGF0ZW1lbnQoYmxvY2spIHtcbiAgICB0cmFuc2Zvcm1MaXRlcmFsVG9QYXRoKGJsb2NrKTtcblxuICAgIHZhciBwcm9ncmFtID0gYmxvY2sucHJvZ3JhbSxcbiAgICAgICAgaW52ZXJzZSA9IGJsb2NrLmludmVyc2U7XG5cbiAgICBwcm9ncmFtID0gcHJvZ3JhbSAmJiB0aGlzLmNvbXBpbGVQcm9ncmFtKHByb2dyYW0pO1xuICAgIGludmVyc2UgPSBpbnZlcnNlICYmIHRoaXMuY29tcGlsZVByb2dyYW0oaW52ZXJzZSk7XG5cbiAgICB2YXIgdHlwZSA9IHRoaXMuY2xhc3NpZnlTZXhwcihibG9jayk7XG5cbiAgICBpZiAodHlwZSA9PT0gJ2hlbHBlcicpIHtcbiAgICAgIHRoaXMuaGVscGVyU2V4cHIoYmxvY2ssIHByb2dyYW0sIGludmVyc2UpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3NpbXBsZScpIHtcbiAgICAgIHRoaXMuc2ltcGxlU2V4cHIoYmxvY2spO1xuXG4gICAgICAvLyBub3cgdGhhdCB0aGUgc2ltcGxlIG11c3RhY2hlIGlzIHJlc29sdmVkLCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBpdCBieSBleGVjdXRpbmcgYGJsb2NrSGVscGVyTWlzc2luZ2BcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgICB0aGlzLm9wY29kZSgnYmxvY2tWYWx1ZScsIGJsb2NrLnBhdGgub3JpZ2luYWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFtYmlndW91c1NleHByKGJsb2NrLCBwcm9ncmFtLCBpbnZlcnNlKTtcblxuICAgICAgLy8gbm93IHRoYXQgdGhlIHNpbXBsZSBtdXN0YWNoZSBpcyByZXNvbHZlZCwgd2UgbmVlZCB0b1xuICAgICAgLy8gZXZhbHVhdGUgaXQgYnkgZXhlY3V0aW5nIGBibG9ja0hlbHBlck1pc3NpbmdgXG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2FtYmlndW91c0Jsb2NrVmFsdWUnKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kJyk7XG4gIH0sXG5cbiAgUGFydGlhbFN0YXRlbWVudDogZnVuY3Rpb24gUGFydGlhbFN0YXRlbWVudChwYXJ0aWFsKSB7XG4gICAgdGhpcy51c2VQYXJ0aWFsID0gdHJ1ZTtcblxuICAgIHZhciBwYXJhbXMgPSBwYXJ0aWFsLnBhcmFtcztcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdVbnN1cHBvcnRlZCBudW1iZXIgb2YgcGFydGlhbCBhcmd1bWVudHM6ICcgKyBwYXJhbXMubGVuZ3RoLCBwYXJ0aWFsKTtcbiAgICB9IGVsc2UgaWYgKCFwYXJhbXMubGVuZ3RoKSB7XG4gICAgICBwYXJhbXMucHVzaCh7IHR5cGU6ICdQYXRoRXhwcmVzc2lvbicsIHBhcnRzOiBbXSwgZGVwdGg6IDAgfSk7XG4gICAgfVxuXG4gICAgdmFyIHBhcnRpYWxOYW1lID0gcGFydGlhbC5uYW1lLm9yaWdpbmFsLFxuICAgICAgICBpc0R5bmFtaWMgPSBwYXJ0aWFsLm5hbWUudHlwZSA9PT0gJ1N1YkV4cHJlc3Npb24nO1xuICAgIGlmIChpc0R5bmFtaWMpIHtcbiAgICAgIHRoaXMuYWNjZXB0KHBhcnRpYWwubmFtZSk7XG4gICAgfVxuXG4gICAgdGhpcy5zZXR1cEZ1bGxNdXN0YWNoZVBhcmFtcyhwYXJ0aWFsLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICB2YXIgaW5kZW50ID0gcGFydGlhbC5pbmRlbnQgfHwgJyc7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5wcmV2ZW50SW5kZW50ICYmIGluZGVudCkge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZENvbnRlbnQnLCBpbmRlbnQpO1xuICAgICAgaW5kZW50ID0gJyc7XG4gICAgfVxuXG4gICAgdGhpcy5vcGNvZGUoJ2ludm9rZVBhcnRpYWwnLCBpc0R5bmFtaWMsIHBhcnRpYWxOYW1lLCBpbmRlbnQpO1xuICAgIHRoaXMub3Bjb2RlKCdhcHBlbmQnKTtcbiAgfSxcblxuICBNdXN0YWNoZVN0YXRlbWVudDogZnVuY3Rpb24gTXVzdGFjaGVTdGF0ZW1lbnQobXVzdGFjaGUpIHtcbiAgICB0aGlzLlN1YkV4cHJlc3Npb24obXVzdGFjaGUpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5ldy1jYXBcblxuICAgIGlmIChtdXN0YWNoZS5lc2NhcGVkICYmICF0aGlzLm9wdGlvbnMubm9Fc2NhcGUpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhcHBlbmRFc2NhcGVkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhcHBlbmQnKTtcbiAgICB9XG4gIH0sXG5cbiAgQ29udGVudFN0YXRlbWVudDogZnVuY3Rpb24gQ29udGVudFN0YXRlbWVudChjb250ZW50KSB7XG4gICAgaWYgKGNvbnRlbnQudmFsdWUpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhcHBlbmRDb250ZW50JywgY29udGVudC52YWx1ZSk7XG4gICAgfVxuICB9LFxuXG4gIENvbW1lbnRTdGF0ZW1lbnQ6IGZ1bmN0aW9uIENvbW1lbnRTdGF0ZW1lbnQoKSB7fSxcblxuICBTdWJFeHByZXNzaW9uOiBmdW5jdGlvbiBTdWJFeHByZXNzaW9uKHNleHByKSB7XG4gICAgdHJhbnNmb3JtTGl0ZXJhbFRvUGF0aChzZXhwcik7XG4gICAgdmFyIHR5cGUgPSB0aGlzLmNsYXNzaWZ5U2V4cHIoc2V4cHIpO1xuXG4gICAgaWYgKHR5cGUgPT09ICdzaW1wbGUnKSB7XG4gICAgICB0aGlzLnNpbXBsZVNleHByKHNleHByKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdoZWxwZXInKSB7XG4gICAgICB0aGlzLmhlbHBlclNleHByKHNleHByKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hbWJpZ3VvdXNTZXhwcihzZXhwcik7XG4gICAgfVxuICB9LFxuICBhbWJpZ3VvdXNTZXhwcjogZnVuY3Rpb24gYW1iaWd1b3VzU2V4cHIoc2V4cHIsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgcGF0aCA9IHNleHByLnBhdGgsXG4gICAgICAgIG5hbWUgPSBwYXRoLnBhcnRzWzBdLFxuICAgICAgICBpc0Jsb2NrID0gcHJvZ3JhbSAhPSBudWxsIHx8IGludmVyc2UgIT0gbnVsbDtcblxuICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgcGF0aC5kZXB0aCk7XG5cbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcblxuICAgIHRoaXMuYWNjZXB0KHBhdGgpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ2ludm9rZUFtYmlndW91cycsIG5hbWUsIGlzQmxvY2spO1xuICB9LFxuXG4gIHNpbXBsZVNleHByOiBmdW5jdGlvbiBzaW1wbGVTZXhwcihzZXhwcikge1xuICAgIHRoaXMuYWNjZXB0KHNleHByLnBhdGgpO1xuICAgIHRoaXMub3Bjb2RlKCdyZXNvbHZlUG9zc2libGVMYW1iZGEnKTtcbiAgfSxcblxuICBoZWxwZXJTZXhwcjogZnVuY3Rpb24gaGVscGVyU2V4cHIoc2V4cHIsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgcGFyYW1zID0gdGhpcy5zZXR1cEZ1bGxNdXN0YWNoZVBhcmFtcyhzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSksXG4gICAgICAgIHBhdGggPSBzZXhwci5wYXRoLFxuICAgICAgICBuYW1lID0gcGF0aC5wYXJ0c1swXTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzW25hbWVdKSB7XG4gICAgICB0aGlzLm9wY29kZSgnaW52b2tlS25vd25IZWxwZXInLCBwYXJhbXMubGVuZ3RoLCBuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNPbmx5KSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnWW91IHNwZWNpZmllZCBrbm93bkhlbHBlcnNPbmx5LCBidXQgdXNlZCB0aGUgdW5rbm93biBoZWxwZXIgJyArIG5hbWUsIHNleHByKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aC5mYWxzeSA9IHRydWU7XG5cbiAgICAgIHRoaXMuYWNjZXB0KHBhdGgpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2ludm9rZUhlbHBlcicsIHBhcmFtcy5sZW5ndGgsIHBhdGgub3JpZ2luYWwsIF9BU1QyWydkZWZhdWx0J10uaGVscGVycy5zaW1wbGVJZChwYXRoKSk7XG4gICAgfVxuICB9LFxuXG4gIFBhdGhFeHByZXNzaW9uOiBmdW5jdGlvbiBQYXRoRXhwcmVzc2lvbihwYXRoKSB7XG4gICAgdGhpcy5hZGREZXB0aChwYXRoLmRlcHRoKTtcbiAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIHBhdGguZGVwdGgpO1xuXG4gICAgdmFyIG5hbWUgPSBwYXRoLnBhcnRzWzBdLFxuICAgICAgICBzY29wZWQgPSBfQVNUMlsnZGVmYXVsdCddLmhlbHBlcnMuc2NvcGVkSWQocGF0aCksXG4gICAgICAgIGJsb2NrUGFyYW1JZCA9ICFwYXRoLmRlcHRoICYmICFzY29wZWQgJiYgdGhpcy5ibG9ja1BhcmFtSW5kZXgobmFtZSk7XG5cbiAgICBpZiAoYmxvY2tQYXJhbUlkKSB7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwQmxvY2tQYXJhbScsIGJsb2NrUGFyYW1JZCwgcGF0aC5wYXJ0cyk7XG4gICAgfSBlbHNlIGlmICghbmFtZSkge1xuICAgICAgLy8gQ29udGV4dCByZWZlcmVuY2UsIGkuZS4gYHt7Zm9vIC59fWAgb3IgYHt7Zm9vIC4ufX1gXG4gICAgICB0aGlzLm9wY29kZSgncHVzaENvbnRleHQnKTtcbiAgICB9IGVsc2UgaWYgKHBhdGguZGF0YSkge1xuICAgICAgdGhpcy5vcHRpb25zLmRhdGEgPSB0cnVlO1xuICAgICAgdGhpcy5vcGNvZGUoJ2xvb2t1cERhdGEnLCBwYXRoLmRlcHRoLCBwYXRoLnBhcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2xvb2t1cE9uQ29udGV4dCcsIHBhdGgucGFydHMsIHBhdGguZmFsc3ksIHNjb3BlZCk7XG4gICAgfVxuICB9LFxuXG4gIFN0cmluZ0xpdGVyYWw6IGZ1bmN0aW9uIFN0cmluZ0xpdGVyYWwoc3RyaW5nKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmcnLCBzdHJpbmcudmFsdWUpO1xuICB9LFxuXG4gIE51bWJlckxpdGVyYWw6IGZ1bmN0aW9uIE51bWJlckxpdGVyYWwobnVtYmVyKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgbnVtYmVyLnZhbHVlKTtcbiAgfSxcblxuICBCb29sZWFuTGl0ZXJhbDogZnVuY3Rpb24gQm9vbGVhbkxpdGVyYWwoYm9vbCkge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoTGl0ZXJhbCcsIGJvb2wudmFsdWUpO1xuICB9LFxuXG4gIFVuZGVmaW5lZExpdGVyYWw6IGZ1bmN0aW9uIFVuZGVmaW5lZExpdGVyYWwoKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgJ3VuZGVmaW5lZCcpO1xuICB9LFxuXG4gIE51bGxMaXRlcmFsOiBmdW5jdGlvbiBOdWxsTGl0ZXJhbCgpIHtcbiAgICB0aGlzLm9wY29kZSgncHVzaExpdGVyYWwnLCAnbnVsbCcpO1xuICB9LFxuXG4gIEhhc2g6IGZ1bmN0aW9uIEhhc2goaGFzaCkge1xuICAgIHZhciBwYWlycyA9IGhhc2gucGFpcnMsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBsID0gcGFpcnMubGVuZ3RoO1xuXG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hIYXNoJyk7XG5cbiAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5wdXNoUGFyYW0ocGFpcnNbaV0udmFsdWUpO1xuICAgIH1cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB0aGlzLm9wY29kZSgnYXNzaWduVG9IYXNoJywgcGFpcnNbaV0ua2V5KTtcbiAgICB9XG4gICAgdGhpcy5vcGNvZGUoJ3BvcEhhc2gnKTtcbiAgfSxcblxuICAvLyBIRUxQRVJTXG4gIG9wY29kZTogZnVuY3Rpb24gb3Bjb2RlKG5hbWUpIHtcbiAgICB0aGlzLm9wY29kZXMucHVzaCh7IG9wY29kZTogbmFtZSwgYXJnczogc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBsb2M6IHRoaXMuc291cmNlTm9kZVswXS5sb2MgfSk7XG4gIH0sXG5cbiAgYWRkRGVwdGg6IGZ1bmN0aW9uIGFkZERlcHRoKGRlcHRoKSB7XG4gICAgaWYgKCFkZXB0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMudXNlRGVwdGhzID0gdHJ1ZTtcbiAgfSxcblxuICBjbGFzc2lmeVNleHByOiBmdW5jdGlvbiBjbGFzc2lmeVNleHByKHNleHByKSB7XG4gICAgdmFyIGlzU2ltcGxlID0gX0FTVDJbJ2RlZmF1bHQnXS5oZWxwZXJzLnNpbXBsZUlkKHNleHByLnBhdGgpO1xuXG4gICAgdmFyIGlzQmxvY2tQYXJhbSA9IGlzU2ltcGxlICYmICEhdGhpcy5ibG9ja1BhcmFtSW5kZXgoc2V4cHIucGF0aC5wYXJ0c1swXSk7XG5cbiAgICAvLyBhIG11c3RhY2hlIGlzIGFuIGVsaWdpYmxlIGhlbHBlciBpZjpcbiAgICAvLyAqIGl0cyBpZCBpcyBzaW1wbGUgKGEgc2luZ2xlIHBhcnQsIG5vdCBgdGhpc2Agb3IgYC4uYClcbiAgICB2YXIgaXNIZWxwZXIgPSAhaXNCbG9ja1BhcmFtICYmIF9BU1QyWydkZWZhdWx0J10uaGVscGVycy5oZWxwZXJFeHByZXNzaW9uKHNleHByKTtcblxuICAgIC8vIGlmIGEgbXVzdGFjaGUgaXMgYW4gZWxpZ2libGUgaGVscGVyIGJ1dCBub3QgYSBkZWZpbml0ZVxuICAgIC8vIGhlbHBlciwgaXQgaXMgYW1iaWd1b3VzLCBhbmQgd2lsbCBiZSByZXNvbHZlZCBpbiBhIGxhdGVyXG4gICAgLy8gcGFzcyBvciBhdCBydW50aW1lLlxuICAgIHZhciBpc0VsaWdpYmxlID0gIWlzQmxvY2tQYXJhbSAmJiAoaXNIZWxwZXIgfHwgaXNTaW1wbGUpO1xuXG4gICAgLy8gaWYgYW1iaWd1b3VzLCB3ZSBjYW4gcG9zc2libHkgcmVzb2x2ZSB0aGUgYW1iaWd1aXR5IG5vd1xuICAgIC8vIEFuIGVsaWdpYmxlIGhlbHBlciBpcyBvbmUgdGhhdCBkb2VzIG5vdCBoYXZlIGEgY29tcGxleCBwYXRoLCBpLmUuIGB0aGlzLmZvb2AsIGAuLi9mb29gIGV0Yy5cbiAgICBpZiAoaXNFbGlnaWJsZSAmJiAhaXNIZWxwZXIpIHtcbiAgICAgIHZhciBfbmFtZTIgPSBzZXhwci5wYXRoLnBhcnRzWzBdLFxuICAgICAgICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICAgIGlmIChvcHRpb25zLmtub3duSGVscGVyc1tfbmFtZTJdKSB7XG4gICAgICAgIGlzSGVscGVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5rbm93bkhlbHBlcnNPbmx5KSB7XG4gICAgICAgIGlzRWxpZ2libGUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXNIZWxwZXIpIHtcbiAgICAgIHJldHVybiAnaGVscGVyJztcbiAgICB9IGVsc2UgaWYgKGlzRWxpZ2libGUpIHtcbiAgICAgIHJldHVybiAnYW1iaWd1b3VzJztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICdzaW1wbGUnO1xuICAgIH1cbiAgfSxcblxuICBwdXNoUGFyYW1zOiBmdW5jdGlvbiBwdXNoUGFyYW1zKHBhcmFtcykge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gcGFyYW1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5wdXNoUGFyYW0ocGFyYW1zW2ldKTtcbiAgICB9XG4gIH0sXG5cbiAgcHVzaFBhcmFtOiBmdW5jdGlvbiBwdXNoUGFyYW0odmFsKSB7XG4gICAgdmFyIHZhbHVlID0gdmFsLnZhbHVlICE9IG51bGwgPyB2YWwudmFsdWUgOiB2YWwub3JpZ2luYWwgfHwgJyc7XG5cbiAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIGlmICh2YWx1ZS5yZXBsYWNlKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvXihcXC4/XFwuXFwvKSovZywgJycpLnJlcGxhY2UoL1xcLy9nLCAnLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAodmFsLmRlcHRoKSB7XG4gICAgICAgIHRoaXMuYWRkRGVwdGgodmFsLmRlcHRoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgdmFsLmRlcHRoIHx8IDApO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmdQYXJhbScsIHZhbHVlLCB2YWwudHlwZSk7XG5cbiAgICAgIGlmICh2YWwudHlwZSA9PT0gJ1N1YkV4cHJlc3Npb24nKSB7XG4gICAgICAgIC8vIFN1YkV4cHJlc3Npb25zIGdldCBldmFsdWF0ZWQgYW5kIHBhc3NlZCBpblxuICAgICAgICAvLyBpbiBzdHJpbmcgcGFyYW1zIG1vZGUuXG4gICAgICAgIHRoaXMuYWNjZXB0KHZhbCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICAgIHZhciBibG9ja1BhcmFtSW5kZXggPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh2YWwucGFydHMgJiYgIV9BU1QyWydkZWZhdWx0J10uaGVscGVycy5zY29wZWRJZCh2YWwpICYmICF2YWwuZGVwdGgpIHtcbiAgICAgICAgICBibG9ja1BhcmFtSW5kZXggPSB0aGlzLmJsb2NrUGFyYW1JbmRleCh2YWwucGFydHNbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChibG9ja1BhcmFtSW5kZXgpIHtcbiAgICAgICAgICB2YXIgYmxvY2tQYXJhbUNoaWxkID0gdmFsLnBhcnRzLnNsaWNlKDEpLmpvaW4oJy4nKTtcbiAgICAgICAgICB0aGlzLm9wY29kZSgncHVzaElkJywgJ0Jsb2NrUGFyYW0nLCBibG9ja1BhcmFtSW5kZXgsIGJsb2NrUGFyYW1DaGlsZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSB2YWwub3JpZ2luYWwgfHwgdmFsdWU7XG4gICAgICAgICAgaWYgKHZhbHVlLnJlcGxhY2UpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvXlxcLlxcLy9nLCAnJykucmVwbGFjZSgvXlxcLiQvZywgJycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMub3Bjb2RlKCdwdXNoSWQnLCB2YWwudHlwZSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmFjY2VwdCh2YWwpO1xuICAgIH1cbiAgfSxcblxuICBzZXR1cEZ1bGxNdXN0YWNoZVBhcmFtczogZnVuY3Rpb24gc2V0dXBGdWxsTXVzdGFjaGVQYXJhbXMoc2V4cHIsIHByb2dyYW0sIGludmVyc2UsIG9taXRFbXB0eSkge1xuICAgIHZhciBwYXJhbXMgPSBzZXhwci5wYXJhbXM7XG4gICAgdGhpcy5wdXNoUGFyYW1zKHBhcmFtcyk7XG5cbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcblxuICAgIGlmIChzZXhwci5oYXNoKSB7XG4gICAgICB0aGlzLmFjY2VwdChzZXhwci5oYXNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcsIG9taXRFbXB0eSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfSxcblxuICBibG9ja1BhcmFtSW5kZXg6IGZ1bmN0aW9uIGJsb2NrUGFyYW1JbmRleChuYW1lKSB7XG4gICAgZm9yICh2YXIgZGVwdGggPSAwLCBsZW4gPSB0aGlzLm9wdGlvbnMuYmxvY2tQYXJhbXMubGVuZ3RoOyBkZXB0aCA8IGxlbjsgZGVwdGgrKykge1xuICAgICAgdmFyIGJsb2NrUGFyYW1zID0gdGhpcy5vcHRpb25zLmJsb2NrUGFyYW1zW2RlcHRoXSxcbiAgICAgICAgICBwYXJhbSA9IGJsb2NrUGFyYW1zICYmIF9pc0FycmF5JGluZGV4T2YuaW5kZXhPZihibG9ja1BhcmFtcywgbmFtZSk7XG4gICAgICBpZiAoYmxvY2tQYXJhbXMgJiYgcGFyYW0gPj0gMCkge1xuICAgICAgICByZXR1cm4gW2RlcHRoLCBwYXJhbV07XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBwcmVjb21waWxlKGlucHV0LCBvcHRpb25zLCBlbnYpIHtcbiAgaWYgKGlucHV0ID09IG51bGwgfHwgdHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiBpbnB1dC50eXBlICE9PSAnUHJvZ3JhbScpIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnWW91IG11c3QgcGFzcyBhIHN0cmluZyBvciBIYW5kbGViYXJzIEFTVCB0byBIYW5kbGViYXJzLnByZWNvbXBpbGUuIFlvdSBwYXNzZWQgJyArIGlucHV0KTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoISgnZGF0YScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRhdGEgPSB0cnVlO1xuICB9XG4gIGlmIChvcHRpb25zLmNvbXBhdCkge1xuICAgIG9wdGlvbnMudXNlRGVwdGhzID0gdHJ1ZTtcbiAgfVxuXG4gIHZhciBhc3QgPSBlbnYucGFyc2UoaW5wdXQsIG9wdGlvbnMpLFxuICAgICAgZW52aXJvbm1lbnQgPSBuZXcgZW52LkNvbXBpbGVyKCkuY29tcGlsZShhc3QsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IGVudi5KYXZhU2NyaXB0Q29tcGlsZXIoKS5jb21waWxlKGVudmlyb25tZW50LCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShpbnB1dCwgX3gsIGVudikge1xuICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMV07XG5cbiAgaWYgKGlucHV0ID09IG51bGwgfHwgdHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiBpbnB1dC50eXBlICE9PSAnUHJvZ3JhbScpIHtcbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnWW91IG11c3QgcGFzcyBhIHN0cmluZyBvciBIYW5kbGViYXJzIEFTVCB0byBIYW5kbGViYXJzLmNvbXBpbGUuIFlvdSBwYXNzZWQgJyArIGlucHV0KTtcbiAgfVxuXG4gIGlmICghKCdkYXRhJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZGF0YSA9IHRydWU7XG4gIH1cbiAgaWYgKG9wdGlvbnMuY29tcGF0KSB7XG4gICAgb3B0aW9ucy51c2VEZXB0aHMgPSB0cnVlO1xuICB9XG5cbiAgdmFyIGNvbXBpbGVkID0gdW5kZWZpbmVkO1xuXG4gIGZ1bmN0aW9uIGNvbXBpbGVJbnB1dCgpIHtcbiAgICB2YXIgYXN0ID0gZW52LnBhcnNlKGlucHV0LCBvcHRpb25zKSxcbiAgICAgICAgZW52aXJvbm1lbnQgPSBuZXcgZW52LkNvbXBpbGVyKCkuY29tcGlsZShhc3QsIG9wdGlvbnMpLFxuICAgICAgICB0ZW1wbGF0ZVNwZWMgPSBuZXcgZW52LkphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgcmV0dXJuIGVudi50ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMpO1xuICB9XG5cbiAgLy8gVGVtcGxhdGUgaXMgb25seSBjb21waWxlZCBvbiBmaXJzdCB1c2UgYW5kIGNhY2hlZCBhZnRlciB0aGF0IHBvaW50LlxuICBmdW5jdGlvbiByZXQoY29udGV4dCwgZXhlY09wdGlvbnMpIHtcbiAgICBpZiAoIWNvbXBpbGVkKSB7XG4gICAgICBjb21waWxlZCA9IGNvbXBpbGVJbnB1dCgpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsZWQuY2FsbCh0aGlzLCBjb250ZXh0LCBleGVjT3B0aW9ucyk7XG4gIH1cbiAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uIChzZXR1cE9wdGlvbnMpIHtcbiAgICBpZiAoIWNvbXBpbGVkKSB7XG4gICAgICBjb21waWxlZCA9IGNvbXBpbGVJbnB1dCgpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsZWQuX3NldHVwKHNldHVwT3B0aW9ucyk7XG4gIH07XG4gIHJldC5fY2hpbGQgPSBmdW5jdGlvbiAoaSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgIGlmICghY29tcGlsZWQpIHtcbiAgICAgIGNvbXBpbGVkID0gY29tcGlsZUlucHV0KCk7XG4gICAgfVxuICAgIHJldHVybiBjb21waWxlZC5fY2hpbGQoaSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gIH07XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGFyZ0VxdWFscyhhLCBiKSB7XG4gIGlmIChhID09PSBiKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAoX2lzQXJyYXkkaW5kZXhPZi5pc0FycmF5KGEpICYmIF9pc0FycmF5JGluZGV4T2YuaXNBcnJheShiKSAmJiBhLmxlbmd0aCA9PT0gYi5sZW5ndGgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghYXJnRXF1YWxzKGFbaV0sIGJbaV0pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtTGl0ZXJhbFRvUGF0aChzZXhwcikge1xuICBpZiAoIXNleHByLnBhdGgucGFydHMpIHtcbiAgICB2YXIgbGl0ZXJhbCA9IHNleHByLnBhdGg7XG4gICAgLy8gQ2FzdGluZyB0byBzdHJpbmcgaGVyZSB0byBtYWtlIGZhbHNlIGFuZCAwIGxpdGVyYWwgdmFsdWVzIHBsYXkgbmljZWx5IHdpdGggdGhlIHJlc3RcbiAgICAvLyBvZiB0aGUgc3lzdGVtLlxuICAgIHNleHByLnBhdGggPSBuZXcgX0FTVDJbJ2RlZmF1bHQnXS5QYXRoRXhwcmVzc2lvbihmYWxzZSwgMCwgW2xpdGVyYWwub3JpZ2luYWwgKyAnJ10sIGxpdGVyYWwub3JpZ2luYWwgKyAnJywgbGl0ZXJhbC5sb2MpO1xuICB9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLlNvdXJjZUxvY2F0aW9uID0gU291cmNlTG9jYXRpb247XG5leHBvcnRzLmlkID0gaWQ7XG5leHBvcnRzLnN0cmlwRmxhZ3MgPSBzdHJpcEZsYWdzO1xuZXhwb3J0cy5zdHJpcENvbW1lbnQgPSBzdHJpcENvbW1lbnQ7XG5leHBvcnRzLnByZXBhcmVQYXRoID0gcHJlcGFyZVBhdGg7XG5leHBvcnRzLnByZXBhcmVNdXN0YWNoZSA9IHByZXBhcmVNdXN0YWNoZTtcbmV4cG9ydHMucHJlcGFyZVJhd0Jsb2NrID0gcHJlcGFyZVJhd0Jsb2NrO1xuZXhwb3J0cy5wcmVwYXJlQmxvY2sgPSBwcmVwYXJlQmxvY2s7XG5cbnZhciBfRXhjZXB0aW9uID0gcmVxdWlyZSgnLi4vZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG5mdW5jdGlvbiBTb3VyY2VMb2NhdGlvbihzb3VyY2UsIGxvY0luZm8pIHtcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gIHRoaXMuc3RhcnQgPSB7XG4gICAgbGluZTogbG9jSW5mby5maXJzdF9saW5lLFxuICAgIGNvbHVtbjogbG9jSW5mby5maXJzdF9jb2x1bW5cbiAgfTtcbiAgdGhpcy5lbmQgPSB7XG4gICAgbGluZTogbG9jSW5mby5sYXN0X2xpbmUsXG4gICAgY29sdW1uOiBsb2NJbmZvLmxhc3RfY29sdW1uXG4gIH07XG59XG5cbmZ1bmN0aW9uIGlkKHRva2VuKSB7XG4gIGlmICgvXlxcWy4qXFxdJC8udGVzdCh0b2tlbikpIHtcbiAgICByZXR1cm4gdG9rZW4uc3Vic3RyKDEsIHRva2VuLmxlbmd0aCAtIDIpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0b2tlbjtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdHJpcEZsYWdzKG9wZW4sIGNsb3NlKSB7XG4gIHJldHVybiB7XG4gICAgb3Blbjogb3Blbi5jaGFyQXQoMikgPT09ICd+JyxcbiAgICBjbG9zZTogY2xvc2UuY2hhckF0KGNsb3NlLmxlbmd0aCAtIDMpID09PSAnfidcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3RyaXBDb21tZW50KGNvbW1lbnQpIHtcbiAgcmV0dXJuIGNvbW1lbnQucmVwbGFjZSgvXlxce1xce34/XFwhLT8tPy8sICcnKS5yZXBsYWNlKC8tPy0/fj9cXH1cXH0kLywgJycpO1xufVxuXG5mdW5jdGlvbiBwcmVwYXJlUGF0aChkYXRhLCBwYXJ0cywgbG9jSW5mbykge1xuICBsb2NJbmZvID0gdGhpcy5sb2NJbmZvKGxvY0luZm8pO1xuXG4gIHZhciBvcmlnaW5hbCA9IGRhdGEgPyAnQCcgOiAnJyxcbiAgICAgIGRpZyA9IFtdLFxuICAgICAgZGVwdGggPSAwLFxuICAgICAgZGVwdGhTdHJpbmcgPSAnJztcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhcnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBwYXJ0ID0gcGFydHNbaV0ucGFydCxcblxuICAgIC8vIElmIHdlIGhhdmUgW10gc3ludGF4IHRoZW4gd2UgZG8gbm90IHRyZWF0IHBhdGggcmVmZXJlbmNlcyBhcyBvcGVyYXRvcnMsXG4gICAgLy8gaS5lLiBmb28uW3RoaXNdIHJlc29sdmVzIHRvIGFwcHJveGltYXRlbHkgY29udGV4dC5mb29bJ3RoaXMnXVxuICAgIGlzTGl0ZXJhbCA9IHBhcnRzW2ldLm9yaWdpbmFsICE9PSBwYXJ0O1xuICAgIG9yaWdpbmFsICs9IChwYXJ0c1tpXS5zZXBhcmF0b3IgfHwgJycpICsgcGFydDtcblxuICAgIGlmICghaXNMaXRlcmFsICYmIChwYXJ0ID09PSAnLi4nIHx8IHBhcnQgPT09ICcuJyB8fCBwYXJ0ID09PSAndGhpcycpKSB7XG4gICAgICBpZiAoZGlnLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ0ludmFsaWQgcGF0aDogJyArIG9yaWdpbmFsLCB7IGxvYzogbG9jSW5mbyB9KTtcbiAgICAgIH0gZWxzZSBpZiAocGFydCA9PT0gJy4uJykge1xuICAgICAgICBkZXB0aCsrO1xuICAgICAgICBkZXB0aFN0cmluZyArPSAnLi4vJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZGlnLnB1c2gocGFydCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyB0aGlzLlBhdGhFeHByZXNzaW9uKGRhdGEsIGRlcHRoLCBkaWcsIG9yaWdpbmFsLCBsb2NJbmZvKTtcbn1cblxuZnVuY3Rpb24gcHJlcGFyZU11c3RhY2hlKHBhdGgsIHBhcmFtcywgaGFzaCwgb3Blbiwgc3RyaXAsIGxvY0luZm8pIHtcbiAgLy8gTXVzdCB1c2UgY2hhckF0IHRvIHN1cHBvcnQgSUUgcHJlLTEwXG4gIHZhciBlc2NhcGVGbGFnID0gb3Blbi5jaGFyQXQoMykgfHwgb3Blbi5jaGFyQXQoMiksXG4gICAgICBlc2NhcGVkID0gZXNjYXBlRmxhZyAhPT0gJ3snICYmIGVzY2FwZUZsYWcgIT09ICcmJztcblxuICByZXR1cm4gbmV3IHRoaXMuTXVzdGFjaGVTdGF0ZW1lbnQocGF0aCwgcGFyYW1zLCBoYXNoLCBlc2NhcGVkLCBzdHJpcCwgdGhpcy5sb2NJbmZvKGxvY0luZm8pKTtcbn1cblxuZnVuY3Rpb24gcHJlcGFyZVJhd0Jsb2NrKG9wZW5SYXdCbG9jaywgY29udGVudCwgY2xvc2UsIGxvY0luZm8pIHtcbiAgaWYgKG9wZW5SYXdCbG9jay5wYXRoLm9yaWdpbmFsICE9PSBjbG9zZSkge1xuICAgIHZhciBlcnJvck5vZGUgPSB7IGxvYzogb3BlblJhd0Jsb2NrLnBhdGgubG9jIH07XG5cbiAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXShvcGVuUmF3QmxvY2sucGF0aC5vcmlnaW5hbCArICcgZG9lc25cXCd0IG1hdGNoICcgKyBjbG9zZSwgZXJyb3JOb2RlKTtcbiAgfVxuXG4gIGxvY0luZm8gPSB0aGlzLmxvY0luZm8obG9jSW5mbyk7XG4gIHZhciBwcm9ncmFtID0gbmV3IHRoaXMuUHJvZ3JhbShbY29udGVudF0sIG51bGwsIHt9LCBsb2NJbmZvKTtcblxuICByZXR1cm4gbmV3IHRoaXMuQmxvY2tTdGF0ZW1lbnQob3BlblJhd0Jsb2NrLnBhdGgsIG9wZW5SYXdCbG9jay5wYXJhbXMsIG9wZW5SYXdCbG9jay5oYXNoLCBwcm9ncmFtLCB1bmRlZmluZWQsIHt9LCB7fSwge30sIGxvY0luZm8pO1xufVxuXG5mdW5jdGlvbiBwcmVwYXJlQmxvY2sob3BlbkJsb2NrLCBwcm9ncmFtLCBpbnZlcnNlQW5kUHJvZ3JhbSwgY2xvc2UsIGludmVydGVkLCBsb2NJbmZvKSB7XG4gIC8vIFdoZW4gd2UgYXJlIGNoYWluaW5nIGludmVyc2UgY2FsbHMsIHdlIHdpbGwgbm90IGhhdmUgYSBjbG9zZSBwYXRoXG4gIGlmIChjbG9zZSAmJiBjbG9zZS5wYXRoICYmIG9wZW5CbG9jay5wYXRoLm9yaWdpbmFsICE9PSBjbG9zZS5wYXRoLm9yaWdpbmFsKSB7XG4gICAgdmFyIGVycm9yTm9kZSA9IHsgbG9jOiBvcGVuQmxvY2sucGF0aC5sb2MgfTtcblxuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKG9wZW5CbG9jay5wYXRoLm9yaWdpbmFsICsgJyBkb2VzblxcJ3QgbWF0Y2ggJyArIGNsb3NlLnBhdGgub3JpZ2luYWwsIGVycm9yTm9kZSk7XG4gIH1cblxuICBwcm9ncmFtLmJsb2NrUGFyYW1zID0gb3BlbkJsb2NrLmJsb2NrUGFyYW1zO1xuXG4gIHZhciBpbnZlcnNlID0gdW5kZWZpbmVkLFxuICAgICAgaW52ZXJzZVN0cmlwID0gdW5kZWZpbmVkO1xuXG4gIGlmIChpbnZlcnNlQW5kUHJvZ3JhbSkge1xuICAgIGlmIChpbnZlcnNlQW5kUHJvZ3JhbS5jaGFpbikge1xuICAgICAgaW52ZXJzZUFuZFByb2dyYW0ucHJvZ3JhbS5ib2R5WzBdLmNsb3NlU3RyaXAgPSBjbG9zZS5zdHJpcDtcbiAgICB9XG5cbiAgICBpbnZlcnNlU3RyaXAgPSBpbnZlcnNlQW5kUHJvZ3JhbS5zdHJpcDtcbiAgICBpbnZlcnNlID0gaW52ZXJzZUFuZFByb2dyYW0ucHJvZ3JhbTtcbiAgfVxuXG4gIGlmIChpbnZlcnRlZCkge1xuICAgIGludmVydGVkID0gaW52ZXJzZTtcbiAgICBpbnZlcnNlID0gcHJvZ3JhbTtcbiAgICBwcm9ncmFtID0gaW52ZXJ0ZWQ7XG4gIH1cblxuICByZXR1cm4gbmV3IHRoaXMuQmxvY2tTdGF0ZW1lbnQob3BlbkJsb2NrLnBhdGgsIG9wZW5CbG9jay5wYXJhbXMsIG9wZW5CbG9jay5oYXNoLCBwcm9ncmFtLCBpbnZlcnNlLCBvcGVuQmxvY2suc3RyaXAsIGludmVyc2VTdHJpcCwgY2xvc2UgJiYgY2xvc2Uuc3RyaXAsIHRoaXMubG9jSW5mbyhsb2NJbmZvKSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoJy4uL2Jhc2UnKTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBfaXNBcnJheSA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciBfQ29kZUdlbiA9IHJlcXVpcmUoJy4vY29kZS1nZW4nKTtcblxudmFyIF9Db2RlR2VuMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9Db2RlR2VuKTtcblxuZnVuY3Rpb24gTGl0ZXJhbCh2YWx1ZSkge1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIEphdmFTY3JpcHRDb21waWxlcigpIHt9XG5cbkphdmFTY3JpcHRDb21waWxlci5wcm90b3R5cGUgPSB7XG4gIC8vIFBVQkxJQyBBUEk6IFlvdSBjYW4gb3ZlcnJpZGUgdGhlc2UgbWV0aG9kcyBpbiBhIHN1YmNsYXNzIHRvIHByb3ZpZGVcbiAgLy8gYWx0ZXJuYXRpdmUgY29tcGlsZWQgZm9ybXMgZm9yIG5hbWUgbG9va3VwIGFuZCBidWZmZXJpbmcgc2VtYW50aWNzXG4gIG5hbWVMb29rdXA6IGZ1bmN0aW9uIG5hbWVMb29rdXAocGFyZW50LCBuYW1lIC8qICwgdHlwZSovKSB7XG4gICAgaWYgKEphdmFTY3JpcHRDb21waWxlci5pc1ZhbGlkSmF2YVNjcmlwdFZhcmlhYmxlTmFtZShuYW1lKSkge1xuICAgICAgcmV0dXJuIFtwYXJlbnQsICcuJywgbmFtZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbcGFyZW50LCAnW1xcJycsIG5hbWUsICdcXCddJ107XG4gICAgfVxuICB9LFxuICBkZXB0aGVkTG9va3VwOiBmdW5jdGlvbiBkZXB0aGVkTG9va3VwKG5hbWUpIHtcbiAgICByZXR1cm4gW3RoaXMuYWxpYXNhYmxlKCd0aGlzLmxvb2t1cCcpLCAnKGRlcHRocywgXCInLCBuYW1lLCAnXCIpJ107XG4gIH0sXG5cbiAgY29tcGlsZXJJbmZvOiBmdW5jdGlvbiBjb21waWxlckluZm8oKSB7XG4gICAgdmFyIHJldmlzaW9uID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMuQ09NUElMRVJfUkVWSVNJT04sXG4gICAgICAgIHZlcnNpb25zID0gX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMuUkVWSVNJT05fQ0hBTkdFU1tyZXZpc2lvbl07XG4gICAgcmV0dXJuIFtyZXZpc2lvbiwgdmVyc2lvbnNdO1xuICB9LFxuXG4gIGFwcGVuZFRvQnVmZmVyOiBmdW5jdGlvbiBhcHBlbmRUb0J1ZmZlcihzb3VyY2UsIGxvY2F0aW9uLCBleHBsaWNpdCkge1xuICAgIC8vIEZvcmNlIGEgc291cmNlIGFzIHRoaXMgc2ltcGxpZmllcyB0aGUgbWVyZ2UgbG9naWMuXG4gICAgaWYgKCFfaXNBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgIHNvdXJjZSA9IFtzb3VyY2VdO1xuICAgIH1cbiAgICBzb3VyY2UgPSB0aGlzLnNvdXJjZS53cmFwKHNvdXJjZSwgbG9jYXRpb24pO1xuXG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHJldHVybiBbJ3JldHVybiAnLCBzb3VyY2UsICc7J107XG4gICAgfSBlbHNlIGlmIChleHBsaWNpdCkge1xuICAgICAgLy8gVGhpcyBpcyBhIGNhc2Ugd2hlcmUgdGhlIGJ1ZmZlciBvcGVyYXRpb24gb2NjdXJzIGFzIGEgY2hpbGQgb2YgYW5vdGhlclxuICAgICAgLy8gY29uc3RydWN0LCBnZW5lcmFsbHkgYnJhY2VzLiBXZSBoYXZlIHRvIGV4cGxpY2l0bHkgb3V0cHV0IHRoZXNlIGJ1ZmZlclxuICAgICAgLy8gb3BlcmF0aW9ucyB0byBlbnN1cmUgdGhhdCB0aGUgZW1pdHRlZCBjb2RlIGdvZXMgaW4gdGhlIGNvcnJlY3QgbG9jYXRpb24uXG4gICAgICByZXR1cm4gWydidWZmZXIgKz0gJywgc291cmNlLCAnOyddO1xuICAgIH0gZWxzZSB7XG4gICAgICBzb3VyY2UuYXBwZW5kVG9CdWZmZXIgPSB0cnVlO1xuICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gIH0sXG5cbiAgaW5pdGlhbGl6ZUJ1ZmZlcjogZnVuY3Rpb24gaW5pdGlhbGl6ZUJ1ZmZlcigpIHtcbiAgICByZXR1cm4gdGhpcy5xdW90ZWRTdHJpbmcoJycpO1xuICB9LFxuICAvLyBFTkQgUFVCTElDIEFQSVxuXG4gIGNvbXBpbGU6IGZ1bmN0aW9uIGNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMsIGNvbnRleHQsIGFzT2JqZWN0KSB7XG4gICAgdGhpcy5lbnZpcm9ubWVudCA9IGVudmlyb25tZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5zdHJpbmdQYXJhbXMgPSB0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zO1xuICAgIHRoaXMudHJhY2tJZHMgPSB0aGlzLm9wdGlvbnMudHJhY2tJZHM7XG4gICAgdGhpcy5wcmVjb21waWxlID0gIWFzT2JqZWN0O1xuXG4gICAgdGhpcy5uYW1lID0gdGhpcy5lbnZpcm9ubWVudC5uYW1lO1xuICAgIHRoaXMuaXNDaGlsZCA9ICEhY29udGV4dDtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0IHx8IHtcbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIGVudmlyb25tZW50czogW11cbiAgICB9O1xuXG4gICAgdGhpcy5wcmVhbWJsZSgpO1xuXG4gICAgdGhpcy5zdGFja1Nsb3QgPSAwO1xuICAgIHRoaXMuc3RhY2tWYXJzID0gW107XG4gICAgdGhpcy5hbGlhc2VzID0ge307XG4gICAgdGhpcy5yZWdpc3RlcnMgPSB7IGxpc3Q6IFtdIH07XG4gICAgdGhpcy5oYXNoZXMgPSBbXTtcbiAgICB0aGlzLmNvbXBpbGVTdGFjayA9IFtdO1xuICAgIHRoaXMuaW5saW5lU3RhY2sgPSBbXTtcbiAgICB0aGlzLmJsb2NrUGFyYW1zID0gW107XG5cbiAgICB0aGlzLmNvbXBpbGVDaGlsZHJlbihlbnZpcm9ubWVudCwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLnVzZURlcHRocyA9IHRoaXMudXNlRGVwdGhzIHx8IGVudmlyb25tZW50LnVzZURlcHRocyB8fCB0aGlzLm9wdGlvbnMuY29tcGF0O1xuICAgIHRoaXMudXNlQmxvY2tQYXJhbXMgPSB0aGlzLnVzZUJsb2NrUGFyYW1zIHx8IGVudmlyb25tZW50LnVzZUJsb2NrUGFyYW1zO1xuXG4gICAgdmFyIG9wY29kZXMgPSBlbnZpcm9ubWVudC5vcGNvZGVzLFxuICAgICAgICBvcGNvZGUgPSB1bmRlZmluZWQsXG4gICAgICAgIGZpcnN0TG9jID0gdW5kZWZpbmVkLFxuICAgICAgICBpID0gdW5kZWZpbmVkLFxuICAgICAgICBsID0gdW5kZWZpbmVkO1xuXG4gICAgZm9yIChpID0gMCwgbCA9IG9wY29kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBvcGNvZGUgPSBvcGNvZGVzW2ldO1xuXG4gICAgICB0aGlzLnNvdXJjZS5jdXJyZW50TG9jYXRpb24gPSBvcGNvZGUubG9jO1xuICAgICAgZmlyc3RMb2MgPSBmaXJzdExvYyB8fCBvcGNvZGUubG9jO1xuICAgICAgdGhpc1tvcGNvZGUub3Bjb2RlXS5hcHBseSh0aGlzLCBvcGNvZGUuYXJncyk7XG4gICAgfVxuXG4gICAgLy8gRmx1c2ggYW55IHRyYWlsaW5nIGNvbnRlbnQgdGhhdCBtaWdodCBiZSBwZW5kaW5nLlxuICAgIHRoaXMuc291cmNlLmN1cnJlbnRMb2NhdGlvbiA9IGZpcnN0TG9jO1xuICAgIHRoaXMucHVzaFNvdXJjZSgnJyk7XG5cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIGlmICh0aGlzLnN0YWNrU2xvdCB8fCB0aGlzLmlubGluZVN0YWNrLmxlbmd0aCB8fCB0aGlzLmNvbXBpbGVTdGFjay5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdDb21waWxlIGNvbXBsZXRlZCB3aXRoIGNvbnRlbnQgbGVmdCBvbiBzdGFjaycpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IHRoaXMuY3JlYXRlRnVuY3Rpb25Db250ZXh0KGFzT2JqZWN0KTtcbiAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xuICAgICAgdmFyIHJldCA9IHtcbiAgICAgICAgY29tcGlsZXI6IHRoaXMuY29tcGlsZXJJbmZvKCksXG4gICAgICAgIG1haW46IGZuXG4gICAgICB9O1xuICAgICAgdmFyIHByb2dyYW1zID0gdGhpcy5jb250ZXh0LnByb2dyYW1zO1xuICAgICAgZm9yIChpID0gMCwgbCA9IHByb2dyYW1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZiAocHJvZ3JhbXNbaV0pIHtcbiAgICAgICAgICByZXRbaV0gPSBwcm9ncmFtc1tpXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5lbnZpcm9ubWVudC51c2VQYXJ0aWFsKSB7XG4gICAgICAgIHJldC51c2VQYXJ0aWFsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgICAgICByZXQudXNlRGF0YSA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy51c2VEZXB0aHMpIHtcbiAgICAgICAgcmV0LnVzZURlcHRocyA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy51c2VCbG9ja1BhcmFtcykge1xuICAgICAgICByZXQudXNlQmxvY2tQYXJhbXMgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jb21wYXQpIHtcbiAgICAgICAgcmV0LmNvbXBhdCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICghYXNPYmplY3QpIHtcbiAgICAgICAgcmV0LmNvbXBpbGVyID0gSlNPTi5zdHJpbmdpZnkocmV0LmNvbXBpbGVyKTtcblxuICAgICAgICB0aGlzLnNvdXJjZS5jdXJyZW50TG9jYXRpb24gPSB7IHN0YXJ0OiB7IGxpbmU6IDEsIGNvbHVtbjogMCB9IH07XG4gICAgICAgIHJldCA9IHRoaXMub2JqZWN0TGl0ZXJhbChyZXQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnNyY05hbWUpIHtcbiAgICAgICAgICByZXQgPSByZXQudG9TdHJpbmdXaXRoU291cmNlTWFwKHsgZmlsZTogb3B0aW9ucy5kZXN0TmFtZSB9KTtcbiAgICAgICAgICByZXQubWFwID0gcmV0Lm1hcCAmJiByZXQubWFwLnRvU3RyaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0ID0gcmV0LnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldC5jb21waWxlck9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmbjtcbiAgICB9XG4gIH0sXG5cbiAgcHJlYW1ibGU6IGZ1bmN0aW9uIHByZWFtYmxlKCkge1xuICAgIC8vIHRyYWNrIHRoZSBsYXN0IGNvbnRleHQgcHVzaGVkIGludG8gcGxhY2UgdG8gYWxsb3cgc2tpcHBpbmcgdGhlXG4gICAgLy8gZ2V0Q29udGV4dCBvcGNvZGUgd2hlbiBpdCB3b3VsZCBiZSBhIG5vb3BcbiAgICB0aGlzLmxhc3RDb250ZXh0ID0gMDtcbiAgICB0aGlzLnNvdXJjZSA9IG5ldyBfQ29kZUdlbjJbJ2RlZmF1bHQnXSh0aGlzLm9wdGlvbnMuc3JjTmFtZSk7XG4gIH0sXG5cbiAgY3JlYXRlRnVuY3Rpb25Db250ZXh0OiBmdW5jdGlvbiBjcmVhdGVGdW5jdGlvbkNvbnRleHQoYXNPYmplY3QpIHtcbiAgICB2YXIgdmFyRGVjbGFyYXRpb25zID0gJyc7XG5cbiAgICB2YXIgbG9jYWxzID0gdGhpcy5zdGFja1ZhcnMuY29uY2F0KHRoaXMucmVnaXN0ZXJzLmxpc3QpO1xuICAgIGlmIChsb2NhbHMubGVuZ3RoID4gMCkge1xuICAgICAgdmFyRGVjbGFyYXRpb25zICs9ICcsICcgKyBsb2NhbHMuam9pbignLCAnKTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBtaW5pbWl6ZXIgYWxpYXMgbWFwcGluZ3NcbiAgICAvL1xuICAgIC8vIFdoZW4gdXNpbmcgdHJ1ZSBTb3VyY2VOb2RlcywgdGhpcyB3aWxsIHVwZGF0ZSBhbGwgcmVmZXJlbmNlcyB0byB0aGUgZ2l2ZW4gYWxpYXNcbiAgICAvLyBhcyB0aGUgc291cmNlIG5vZGVzIGFyZSByZXVzZWQgaW4gc2l0dS4gRm9yIHRoZSBub24tc291cmNlIG5vZGUgY29tcGlsYXRpb24gbW9kZSxcbiAgICAvLyBhbGlhc2VzIHdpbGwgbm90IGJlIHVzZWQsIGJ1dCB0aGlzIGNhc2UgaXMgYWxyZWFkeSBiZWluZyBydW4gb24gdGhlIGNsaWVudCBhbmRcbiAgICAvLyB3ZSBhcmVuJ3QgY29uY2VybiBhYm91dCBtaW5pbWl6aW5nIHRoZSB0ZW1wbGF0ZSBzaXplLlxuICAgIHZhciBhbGlhc0NvdW50ID0gMDtcbiAgICBmb3IgKHZhciBhbGlhcyBpbiB0aGlzLmFsaWFzZXMpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICB2YXIgbm9kZSA9IHRoaXMuYWxpYXNlc1thbGlhc107XG5cbiAgICAgIGlmICh0aGlzLmFsaWFzZXMuaGFzT3duUHJvcGVydHkoYWxpYXMpICYmIG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5yZWZlcmVuY2VDb3VudCA+IDEpIHtcbiAgICAgICAgdmFyRGVjbGFyYXRpb25zICs9ICcsIGFsaWFzJyArICsrYWxpYXNDb3VudCArICc9JyArIGFsaWFzO1xuICAgICAgICBub2RlLmNoaWxkcmVuWzBdID0gJ2FsaWFzJyArIGFsaWFzQ291bnQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IFsnZGVwdGgwJywgJ2hlbHBlcnMnLCAncGFydGlhbHMnLCAnZGF0YSddO1xuXG4gICAgaWYgKHRoaXMudXNlQmxvY2tQYXJhbXMgfHwgdGhpcy51c2VEZXB0aHMpIHtcbiAgICAgIHBhcmFtcy5wdXNoKCdibG9ja1BhcmFtcycpO1xuICAgIH1cbiAgICBpZiAodGhpcy51c2VEZXB0aHMpIHtcbiAgICAgIHBhcmFtcy5wdXNoKCdkZXB0aHMnKTtcbiAgICB9XG5cbiAgICAvLyBQZXJmb3JtIGEgc2Vjb25kIHBhc3Mgb3ZlciB0aGUgb3V0cHV0IHRvIG1lcmdlIGNvbnRlbnQgd2hlbiBwb3NzaWJsZVxuICAgIHZhciBzb3VyY2UgPSB0aGlzLm1lcmdlU291cmNlKHZhckRlY2xhcmF0aW9ucyk7XG5cbiAgICBpZiAoYXNPYmplY3QpIHtcbiAgICAgIHBhcmFtcy5wdXNoKHNvdXJjZSk7XG5cbiAgICAgIHJldHVybiBGdW5jdGlvbi5hcHBseSh0aGlzLCBwYXJhbXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2Uud3JhcChbJ2Z1bmN0aW9uKCcsIHBhcmFtcy5qb2luKCcsJyksICcpIHtcXG4gICcsIHNvdXJjZSwgJ30nXSk7XG4gICAgfVxuICB9LFxuICBtZXJnZVNvdXJjZTogZnVuY3Rpb24gbWVyZ2VTb3VyY2UodmFyRGVjbGFyYXRpb25zKSB7XG4gICAgdmFyIGlzU2ltcGxlID0gdGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSxcbiAgICAgICAgYXBwZW5kT25seSA9ICF0aGlzLmZvcmNlQnVmZmVyLFxuICAgICAgICBhcHBlbmRGaXJzdCA9IHVuZGVmaW5lZCxcbiAgICAgICAgc291cmNlU2VlbiA9IHVuZGVmaW5lZCxcbiAgICAgICAgYnVmZmVyU3RhcnQgPSB1bmRlZmluZWQsXG4gICAgICAgIGJ1ZmZlckVuZCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnNvdXJjZS5lYWNoKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICBpZiAobGluZS5hcHBlbmRUb0J1ZmZlcikge1xuICAgICAgICBpZiAoYnVmZmVyU3RhcnQpIHtcbiAgICAgICAgICBsaW5lLnByZXBlbmQoJyAgKyAnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWZmZXJTdGFydCA9IGxpbmU7XG4gICAgICAgIH1cbiAgICAgICAgYnVmZmVyRW5kID0gbGluZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChidWZmZXJTdGFydCkge1xuICAgICAgICAgIGlmICghc291cmNlU2Vlbikge1xuICAgICAgICAgICAgYXBwZW5kRmlyc3QgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWZmZXJTdGFydC5wcmVwZW5kKCdidWZmZXIgKz0gJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJ1ZmZlckVuZC5hZGQoJzsnKTtcbiAgICAgICAgICBidWZmZXJTdGFydCA9IGJ1ZmZlckVuZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHNvdXJjZVNlZW4gPSB0cnVlO1xuICAgICAgICBpZiAoIWlzU2ltcGxlKSB7XG4gICAgICAgICAgYXBwZW5kT25seSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoYXBwZW5kT25seSkge1xuICAgICAgaWYgKGJ1ZmZlclN0YXJ0KSB7XG4gICAgICAgIGJ1ZmZlclN0YXJ0LnByZXBlbmQoJ3JldHVybiAnKTtcbiAgICAgICAgYnVmZmVyRW5kLmFkZCgnOycpO1xuICAgICAgfSBlbHNlIGlmICghc291cmNlU2Vlbikge1xuICAgICAgICB0aGlzLnNvdXJjZS5wdXNoKCdyZXR1cm4gXCJcIjsnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyRGVjbGFyYXRpb25zICs9ICcsIGJ1ZmZlciA9ICcgKyAoYXBwZW5kRmlyc3QgPyAnJyA6IHRoaXMuaW5pdGlhbGl6ZUJ1ZmZlcigpKTtcblxuICAgICAgaWYgKGJ1ZmZlclN0YXJ0KSB7XG4gICAgICAgIGJ1ZmZlclN0YXJ0LnByZXBlbmQoJ3JldHVybiBidWZmZXIgKyAnKTtcbiAgICAgICAgYnVmZmVyRW5kLmFkZCgnOycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zb3VyY2UucHVzaCgncmV0dXJuIGJ1ZmZlcjsnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFyRGVjbGFyYXRpb25zKSB7XG4gICAgICB0aGlzLnNvdXJjZS5wcmVwZW5kKCd2YXIgJyArIHZhckRlY2xhcmF0aW9ucy5zdWJzdHJpbmcoMikgKyAoYXBwZW5kRmlyc3QgPyAnJyA6ICc7XFxuJykpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnNvdXJjZS5tZXJnZSgpO1xuICB9LFxuXG4gIC8vIFtibG9ja1ZhbHVlXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCB2YWx1ZVxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJldHVybiB2YWx1ZSBvZiBibG9ja0hlbHBlck1pc3NpbmdcbiAgLy9cbiAgLy8gVGhlIHB1cnBvc2Ugb2YgdGhpcyBvcGNvZGUgaXMgdG8gdGFrZSBhIGJsb2NrIG9mIHRoZSBmb3JtXG4gIC8vIGB7eyN0aGlzLmZvb319Li4ue3svdGhpcy5mb299fWAsIHJlc29sdmUgdGhlIHZhbHVlIG9mIGBmb29gLCBhbmRcbiAgLy8gcmVwbGFjZSBpdCBvbiB0aGUgc3RhY2sgd2l0aCB0aGUgcmVzdWx0IG9mIHByb3Blcmx5XG4gIC8vIGludm9raW5nIGJsb2NrSGVscGVyTWlzc2luZy5cbiAgYmxvY2tWYWx1ZTogZnVuY3Rpb24gYmxvY2tWYWx1ZShuYW1lKSB7XG4gICAgdmFyIGJsb2NrSGVscGVyTWlzc2luZyA9IHRoaXMuYWxpYXNhYmxlKCdoZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZycpLFxuICAgICAgICBwYXJhbXMgPSBbdGhpcy5jb250ZXh0TmFtZSgwKV07XG4gICAgdGhpcy5zZXR1cEhlbHBlckFyZ3MobmFtZSwgMCwgcGFyYW1zKTtcblxuICAgIHZhciBibG9ja05hbWUgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgcGFyYW1zLnNwbGljZSgxLCAwLCBibG9ja05hbWUpO1xuXG4gICAgdGhpcy5wdXNoKHRoaXMuc291cmNlLmZ1bmN0aW9uQ2FsbChibG9ja0hlbHBlck1pc3NpbmcsICdjYWxsJywgcGFyYW1zKSk7XG4gIH0sXG5cbiAgLy8gW2FtYmlndW91c0Jsb2NrVmFsdWVdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHZhbHVlXG4gIC8vIENvbXBpbGVyIHZhbHVlLCBiZWZvcmU6IGxhc3RIZWxwZXI9dmFsdWUgb2YgbGFzdCBmb3VuZCBoZWxwZXIsIGlmIGFueVxuICAvLyBPbiBzdGFjaywgYWZ0ZXIsIGlmIG5vIGxhc3RIZWxwZXI6IHNhbWUgYXMgW2Jsb2NrVmFsdWVdXG4gIC8vIE9uIHN0YWNrLCBhZnRlciwgaWYgbGFzdEhlbHBlcjogdmFsdWVcbiAgYW1iaWd1b3VzQmxvY2tWYWx1ZTogZnVuY3Rpb24gYW1iaWd1b3VzQmxvY2tWYWx1ZSgpIHtcbiAgICAvLyBXZSdyZSBiZWluZyBhIGJpdCBjaGVla3kgYW5kIHJldXNpbmcgdGhlIG9wdGlvbnMgdmFsdWUgZnJvbSB0aGUgcHJpb3IgZXhlY1xuICAgIHZhciBibG9ja0hlbHBlck1pc3NpbmcgPSB0aGlzLmFsaWFzYWJsZSgnaGVscGVycy5ibG9ja0hlbHBlck1pc3NpbmcnKSxcbiAgICAgICAgcGFyYW1zID0gW3RoaXMuY29udGV4dE5hbWUoMCldO1xuICAgIHRoaXMuc2V0dXBIZWxwZXJBcmdzKCcnLCAwLCBwYXJhbXMsIHRydWUpO1xuXG4gICAgdGhpcy5mbHVzaElubGluZSgpO1xuXG4gICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgcGFyYW1zLnNwbGljZSgxLCAwLCBjdXJyZW50KTtcblxuICAgIHRoaXMucHVzaFNvdXJjZShbJ2lmICghJywgdGhpcy5sYXN0SGVscGVyLCAnKSB7ICcsIGN1cnJlbnQsICcgPSAnLCB0aGlzLnNvdXJjZS5mdW5jdGlvbkNhbGwoYmxvY2tIZWxwZXJNaXNzaW5nLCAnY2FsbCcsIHBhcmFtcyksICd9J10pO1xuICB9LFxuXG4gIC8vIFthcHBlbmRDb250ZW50XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi5cbiAgLy9cbiAgLy8gQXBwZW5kcyB0aGUgc3RyaW5nIHZhbHVlIG9mIGBjb250ZW50YCB0byB0aGUgY3VycmVudCBidWZmZXJcbiAgYXBwZW5kQ29udGVudDogZnVuY3Rpb24gYXBwZW5kQ29udGVudChjb250ZW50KSB7XG4gICAgaWYgKHRoaXMucGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIGNvbnRlbnQgPSB0aGlzLnBlbmRpbmdDb250ZW50ICsgY29udGVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wZW5kaW5nTG9jYXRpb24gPSB0aGlzLnNvdXJjZS5jdXJyZW50TG9jYXRpb247XG4gICAgfVxuXG4gICAgdGhpcy5wZW5kaW5nQ29udGVudCA9IGNvbnRlbnQ7XG4gIH0sXG5cbiAgLy8gW2FwcGVuZF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBDb2VyY2VzIGB2YWx1ZWAgdG8gYSBTdHJpbmcgYW5kIGFwcGVuZHMgaXQgdG8gdGhlIGN1cnJlbnQgYnVmZmVyLlxuICAvL1xuICAvLyBJZiBgdmFsdWVgIGlzIHRydXRoeSwgb3IgMCwgaXQgaXMgY29lcmNlZCBpbnRvIGEgc3RyaW5nIGFuZCBhcHBlbmRlZFxuICAvLyBPdGhlcndpc2UsIHRoZSBlbXB0eSBzdHJpbmcgaXMgYXBwZW5kZWRcbiAgYXBwZW5kOiBmdW5jdGlvbiBhcHBlbmQoKSB7XG4gICAgaWYgKHRoaXMuaXNJbmxpbmUoKSkge1xuICAgICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24gKGN1cnJlbnQpIHtcbiAgICAgICAgcmV0dXJuIFsnICE9IG51bGwgPyAnLCBjdXJyZW50LCAnIDogXCJcIiddO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMucHVzaFNvdXJjZSh0aGlzLmFwcGVuZFRvQnVmZmVyKHRoaXMucG9wU3RhY2soKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbG9jYWwgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICB0aGlzLnB1c2hTb3VyY2UoWydpZiAoJywgbG9jYWwsICcgIT0gbnVsbCkgeyAnLCB0aGlzLmFwcGVuZFRvQnVmZmVyKGxvY2FsLCB1bmRlZmluZWQsIHRydWUpLCAnIH0nXSk7XG4gICAgICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgICB0aGlzLnB1c2hTb3VyY2UoWydlbHNlIHsgJywgdGhpcy5hcHBlbmRUb0J1ZmZlcignXFwnXFwnJywgdW5kZWZpbmVkLCB0cnVlKSwgJyB9J10pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvLyBbYXBwZW5kRXNjYXBlZF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBFc2NhcGUgYHZhbHVlYCBhbmQgYXBwZW5kIGl0IHRvIHRoZSBidWZmZXJcbiAgYXBwZW5kRXNjYXBlZDogZnVuY3Rpb24gYXBwZW5kRXNjYXBlZCgpIHtcbiAgICB0aGlzLnB1c2hTb3VyY2UodGhpcy5hcHBlbmRUb0J1ZmZlcihbdGhpcy5hbGlhc2FibGUoJ3RoaXMuZXNjYXBlRXhwcmVzc2lvbicpLCAnKCcsIHRoaXMucG9wU3RhY2soKSwgJyknXSkpO1xuICB9LFxuXG4gIC8vIFtnZXRDb250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi5cbiAgLy8gQ29tcGlsZXIgdmFsdWUsIGFmdGVyOiBsYXN0Q29udGV4dD1kZXB0aFxuICAvL1xuICAvLyBTZXQgdGhlIHZhbHVlIG9mIHRoZSBgbGFzdENvbnRleHRgIGNvbXBpbGVyIHZhbHVlIHRvIHRoZSBkZXB0aFxuICBnZXRDb250ZXh0OiBmdW5jdGlvbiBnZXRDb250ZXh0KGRlcHRoKSB7XG4gICAgdGhpcy5sYXN0Q29udGV4dCA9IGRlcHRoO1xuICB9LFxuXG4gIC8vIFtwdXNoQ29udGV4dF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogY3VycmVudENvbnRleHQsIC4uLlxuICAvL1xuICAvLyBQdXNoZXMgdGhlIHZhbHVlIG9mIHRoZSBjdXJyZW50IGNvbnRleHQgb250byB0aGUgc3RhY2suXG4gIHB1c2hDb250ZXh0OiBmdW5jdGlvbiBwdXNoQ29udGV4dCgpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodGhpcy5jb250ZXh0TmFtZSh0aGlzLmxhc3RDb250ZXh0KSk7XG4gIH0sXG5cbiAgLy8gW2xvb2t1cE9uQ29udGV4dF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogY3VycmVudENvbnRleHRbbmFtZV0sIC4uLlxuICAvL1xuICAvLyBMb29rcyB1cCB0aGUgdmFsdWUgb2YgYG5hbWVgIG9uIHRoZSBjdXJyZW50IGNvbnRleHQgYW5kIHB1c2hlc1xuICAvLyBpdCBvbnRvIHRoZSBzdGFjay5cbiAgbG9va3VwT25Db250ZXh0OiBmdW5jdGlvbiBsb29rdXBPbkNvbnRleHQocGFydHMsIGZhbHN5LCBzY29wZWQpIHtcbiAgICB2YXIgaSA9IDA7XG5cbiAgICBpZiAoIXNjb3BlZCAmJiB0aGlzLm9wdGlvbnMuY29tcGF0ICYmICF0aGlzLmxhc3RDb250ZXh0KSB7XG4gICAgICAvLyBUaGUgZGVwdGhlZCBxdWVyeSBpcyBleHBlY3RlZCB0byBoYW5kbGUgdGhlIHVuZGVmaW5lZCBsb2dpYyBmb3IgdGhlIHJvb3QgbGV2ZWwgdGhhdFxuICAgICAgLy8gaXMgaW1wbGVtZW50ZWQgYmVsb3csIHNvIHdlIGV2YWx1YXRlIHRoYXQgZGlyZWN0bHkgaW4gY29tcGF0IG1vZGVcbiAgICAgIHRoaXMucHVzaCh0aGlzLmRlcHRoZWRMb29rdXAocGFydHNbaSsrXSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnB1c2hDb250ZXh0KCk7XG4gICAgfVxuXG4gICAgdGhpcy5yZXNvbHZlUGF0aCgnY29udGV4dCcsIHBhcnRzLCBpLCBmYWxzeSk7XG4gIH0sXG5cbiAgLy8gW2xvb2t1cEJsb2NrUGFyYW1dXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGJsb2NrUGFyYW1bbmFtZV0sIC4uLlxuICAvL1xuICAvLyBMb29rcyB1cCB0aGUgdmFsdWUgb2YgYHBhcnRzYCBvbiB0aGUgZ2l2ZW4gYmxvY2sgcGFyYW0gYW5kIHB1c2hlc1xuICAvLyBpdCBvbnRvIHRoZSBzdGFjay5cbiAgbG9va3VwQmxvY2tQYXJhbTogZnVuY3Rpb24gbG9va3VwQmxvY2tQYXJhbShibG9ja1BhcmFtSWQsIHBhcnRzKSB7XG4gICAgdGhpcy51c2VCbG9ja1BhcmFtcyA9IHRydWU7XG5cbiAgICB0aGlzLnB1c2goWydibG9ja1BhcmFtc1snLCBibG9ja1BhcmFtSWRbMF0sICddWycsIGJsb2NrUGFyYW1JZFsxXSwgJ10nXSk7XG4gICAgdGhpcy5yZXNvbHZlUGF0aCgnY29udGV4dCcsIHBhcnRzLCAxKTtcbiAgfSxcblxuICAvLyBbbG9va3VwRGF0YV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogZGF0YSwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggdGhlIGRhdGEgbG9va3VwIG9wZXJhdG9yXG4gIGxvb2t1cERhdGE6IGZ1bmN0aW9uIGxvb2t1cERhdGEoZGVwdGgsIHBhcnRzKSB7XG4gICAgaWYgKCFkZXB0aCkge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCdkYXRhJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgndGhpcy5kYXRhKGRhdGEsICcgKyBkZXB0aCArICcpJyk7XG4gICAgfVxuXG4gICAgdGhpcy5yZXNvbHZlUGF0aCgnZGF0YScsIHBhcnRzLCAwLCB0cnVlKTtcbiAgfSxcblxuICByZXNvbHZlUGF0aDogZnVuY3Rpb24gcmVzb2x2ZVBhdGgodHlwZSwgcGFydHMsIGksIGZhbHN5KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0IHx8IHRoaXMub3B0aW9ucy5hc3N1bWVPYmplY3RzKSB7XG4gICAgICB0aGlzLnB1c2goc3RyaWN0TG9va3VwKHRoaXMub3B0aW9ucy5zdHJpY3QsIHRoaXMsIHBhcnRzLCB0eXBlKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGxlbiA9IHBhcnRzLmxlbmd0aDtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAvKmVzbGludC1kaXNhYmxlIG5vLWxvb3AtZnVuYyAqL1xuICAgICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24gKGN1cnJlbnQpIHtcbiAgICAgICAgdmFyIGxvb2t1cCA9IF90aGlzLm5hbWVMb29rdXAoY3VycmVudCwgcGFydHNbaV0sIHR5cGUpO1xuICAgICAgICAvLyBXZSB3YW50IHRvIGVuc3VyZSB0aGF0IHplcm8gYW5kIGZhbHNlIGFyZSBoYW5kbGVkIHByb3Blcmx5IGlmIHRoZSBjb250ZXh0IChmYWxzeSBmbGFnKVxuICAgICAgICAvLyBuZWVkcyB0byBoYXZlIHRoZSBzcGVjaWFsIGhhbmRsaW5nIGZvciB0aGVzZSB2YWx1ZXMuXG4gICAgICAgIGlmICghZmFsc3kpIHtcbiAgICAgICAgICByZXR1cm4gWycgIT0gbnVsbCA/ICcsIGxvb2t1cCwgJyA6ICcsIGN1cnJlbnRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE90aGVyd2lzZSB3ZSBjYW4gdXNlIGdlbmVyaWMgZmFsc3kgaGFuZGxpbmdcbiAgICAgICAgICByZXR1cm4gWycgJiYgJywgbG9va3VwXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvKmVzbGludC1lbmFibGUgbm8tbG9vcC1mdW5jICovXG4gICAgfVxuICB9LFxuXG4gIC8vIFtyZXNvbHZlUG9zc2libGVMYW1iZGFdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXNvbHZlZCB2YWx1ZSwgLi4uXG4gIC8vXG4gIC8vIElmIHRoZSBgdmFsdWVgIGlzIGEgbGFtYmRhLCByZXBsYWNlIGl0IG9uIHRoZSBzdGFjayBieVxuICAvLyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBsYW1iZGFcbiAgcmVzb2x2ZVBvc3NpYmxlTGFtYmRhOiBmdW5jdGlvbiByZXNvbHZlUG9zc2libGVMYW1iZGEoKSB7XG4gICAgdGhpcy5wdXNoKFt0aGlzLmFsaWFzYWJsZSgndGhpcy5sYW1iZGEnKSwgJygnLCB0aGlzLnBvcFN0YWNrKCksICcsICcsIHRoaXMuY29udGV4dE5hbWUoMCksICcpJ10pO1xuICB9LFxuXG4gIC8vIFtwdXNoU3RyaW5nUGFyYW1dXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHN0cmluZywgY3VycmVudENvbnRleHQsIC4uLlxuICAvL1xuICAvLyBUaGlzIG9wY29kZSBpcyBkZXNpZ25lZCBmb3IgdXNlIGluIHN0cmluZyBtb2RlLCB3aGljaFxuICAvLyBwcm92aWRlcyB0aGUgc3RyaW5nIHZhbHVlIG9mIGEgcGFyYW1ldGVyIGFsb25nIHdpdGggaXRzXG4gIC8vIGRlcHRoIHJhdGhlciB0aGFuIHJlc29sdmluZyBpdCBpbW1lZGlhdGVseS5cbiAgcHVzaFN0cmluZ1BhcmFtOiBmdW5jdGlvbiBwdXNoU3RyaW5nUGFyYW0oc3RyaW5nLCB0eXBlKSB7XG4gICAgdGhpcy5wdXNoQ29udGV4dCgpO1xuICAgIHRoaXMucHVzaFN0cmluZyh0eXBlKTtcblxuICAgIC8vIElmIGl0J3MgYSBzdWJleHByZXNzaW9uLCB0aGUgc3RyaW5nIHJlc3VsdFxuICAgIC8vIHdpbGwgYmUgcHVzaGVkIGFmdGVyIHRoaXMgb3Bjb2RlLlxuICAgIGlmICh0eXBlICE9PSAnU3ViRXhwcmVzc2lvbicpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3RyaW5nID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLnB1c2hTdHJpbmcoc3RyaW5nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbChzdHJpbmcpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlbXB0eUhhc2g6IGZ1bmN0aW9uIGVtcHR5SGFzaChvbWl0RW1wdHkpIHtcbiAgICBpZiAodGhpcy50cmFja0lkcykge1xuICAgICAgdGhpcy5wdXNoKCd7fScpOyAvLyBoYXNoSWRzXG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgdGhpcy5wdXNoKCd7fScpOyAvLyBoYXNoQ29udGV4dHNcbiAgICAgIHRoaXMucHVzaCgne30nKTsgLy8gaGFzaFR5cGVzXG4gICAgfVxuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbChvbWl0RW1wdHkgPyAndW5kZWZpbmVkJyA6ICd7fScpO1xuICB9LFxuICBwdXNoSGFzaDogZnVuY3Rpb24gcHVzaEhhc2goKSB7XG4gICAgaWYgKHRoaXMuaGFzaCkge1xuICAgICAgdGhpcy5oYXNoZXMucHVzaCh0aGlzLmhhc2gpO1xuICAgIH1cbiAgICB0aGlzLmhhc2ggPSB7IHZhbHVlczogW10sIHR5cGVzOiBbXSwgY29udGV4dHM6IFtdLCBpZHM6IFtdIH07XG4gIH0sXG4gIHBvcEhhc2g6IGZ1bmN0aW9uIHBvcEhhc2goKSB7XG4gICAgdmFyIGhhc2ggPSB0aGlzLmhhc2g7XG4gICAgdGhpcy5oYXNoID0gdGhpcy5oYXNoZXMucG9wKCk7XG5cbiAgICBpZiAodGhpcy50cmFja0lkcykge1xuICAgICAgdGhpcy5wdXNoKHRoaXMub2JqZWN0TGl0ZXJhbChoYXNoLmlkcykpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHRoaXMucHVzaCh0aGlzLm9iamVjdExpdGVyYWwoaGFzaC5jb250ZXh0cykpO1xuICAgICAgdGhpcy5wdXNoKHRoaXMub2JqZWN0TGl0ZXJhbChoYXNoLnR5cGVzKSk7XG4gICAgfVxuXG4gICAgdGhpcy5wdXNoKHRoaXMub2JqZWN0TGl0ZXJhbChoYXNoLnZhbHVlcykpO1xuICB9LFxuXG4gIC8vIFtwdXNoU3RyaW5nXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBxdW90ZWRTdHJpbmcoc3RyaW5nKSwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggYSBxdW90ZWQgdmVyc2lvbiBvZiBgc3RyaW5nYCBvbnRvIHRoZSBzdGFja1xuICBwdXNoU3RyaW5nOiBmdW5jdGlvbiBwdXNoU3RyaW5nKHN0cmluZykge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh0aGlzLnF1b3RlZFN0cmluZyhzdHJpbmcpKTtcbiAgfSxcblxuICAvLyBbcHVzaExpdGVyYWxdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHZhbHVlLCAuLi5cbiAgLy9cbiAgLy8gUHVzaGVzIGEgdmFsdWUgb250byB0aGUgc3RhY2suIFRoaXMgb3BlcmF0aW9uIHByZXZlbnRzXG4gIC8vIHRoZSBjb21waWxlciBmcm9tIGNyZWF0aW5nIGEgdGVtcG9yYXJ5IHZhcmlhYmxlIHRvIGhvbGRcbiAgLy8gaXQuXG4gIHB1c2hMaXRlcmFsOiBmdW5jdGlvbiBwdXNoTGl0ZXJhbCh2YWx1ZSkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh2YWx1ZSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hQcm9ncmFtXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBwcm9ncmFtKGd1aWQpLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCBhIHByb2dyYW0gZXhwcmVzc2lvbiBvbnRvIHRoZSBzdGFjay4gVGhpcyB0YWtlc1xuICAvLyBhIGNvbXBpbGUtdGltZSBndWlkIGFuZCBjb252ZXJ0cyBpdCBpbnRvIGEgcnVudGltZS1hY2Nlc3NpYmxlXG4gIC8vIGV4cHJlc3Npb24uXG4gIHB1c2hQcm9ncmFtOiBmdW5jdGlvbiBwdXNoUHJvZ3JhbShndWlkKSB7XG4gICAgaWYgKGd1aWQgIT0gbnVsbCkge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHRoaXMucHJvZ3JhbUV4cHJlc3Npb24oZ3VpZCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwobnVsbCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFtpbnZva2VIZWxwZXJdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGhlbHBlciBpbnZvY2F0aW9uXG4gIC8vXG4gIC8vIFBvcHMgb2ZmIHRoZSBoZWxwZXIncyBwYXJhbWV0ZXJzLCBpbnZva2VzIHRoZSBoZWxwZXIsXG4gIC8vIGFuZCBwdXNoZXMgdGhlIGhlbHBlcidzIHJldHVybiB2YWx1ZSBvbnRvIHRoZSBzdGFjay5cbiAgLy9cbiAgLy8gSWYgdGhlIGhlbHBlciBpcyBub3QgZm91bmQsIGBoZWxwZXJNaXNzaW5nYCBpcyBjYWxsZWQuXG4gIGludm9rZUhlbHBlcjogZnVuY3Rpb24gaW52b2tlSGVscGVyKHBhcmFtU2l6ZSwgbmFtZSwgaXNTaW1wbGUpIHtcbiAgICB2YXIgbm9uSGVscGVyID0gdGhpcy5wb3BTdGFjaygpLFxuICAgICAgICBoZWxwZXIgPSB0aGlzLnNldHVwSGVscGVyKHBhcmFtU2l6ZSwgbmFtZSksXG4gICAgICAgIHNpbXBsZSA9IGlzU2ltcGxlID8gW2hlbHBlci5uYW1lLCAnIHx8ICddIDogJyc7XG5cbiAgICB2YXIgbG9va3VwID0gWycoJ10uY29uY2F0KHNpbXBsZSwgbm9uSGVscGVyKTtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgIGxvb2t1cC5wdXNoKCcgfHwgJywgdGhpcy5hbGlhc2FibGUoJ2hlbHBlcnMuaGVscGVyTWlzc2luZycpKTtcbiAgICB9XG4gICAgbG9va3VwLnB1c2goJyknKTtcblxuICAgIHRoaXMucHVzaCh0aGlzLnNvdXJjZS5mdW5jdGlvbkNhbGwobG9va3VwLCAnY2FsbCcsIGhlbHBlci5jYWxsUGFyYW1zKSk7XG4gIH0sXG5cbiAgLy8gW2ludm9rZUtub3duSGVscGVyXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCBwYXJhbXMuLi4sIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc3VsdCBvZiBoZWxwZXIgaW52b2NhdGlvblxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBpcyB1c2VkIHdoZW4gdGhlIGhlbHBlciBpcyBrbm93biB0byBleGlzdCxcbiAgLy8gc28gYSBgaGVscGVyTWlzc2luZ2AgZmFsbGJhY2sgaXMgbm90IHJlcXVpcmVkLlxuICBpbnZva2VLbm93bkhlbHBlcjogZnVuY3Rpb24gaW52b2tlS25vd25IZWxwZXIocGFyYW1TaXplLCBuYW1lKSB7XG4gICAgdmFyIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIocGFyYW1TaXplLCBuYW1lKTtcbiAgICB0aGlzLnB1c2godGhpcy5zb3VyY2UuZnVuY3Rpb25DYWxsKGhlbHBlci5uYW1lLCAnY2FsbCcsIGhlbHBlci5jYWxsUGFyYW1zKSk7XG4gIH0sXG5cbiAgLy8gW2ludm9rZUFtYmlndW91c11cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgZGlzYW1iaWd1YXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gaXMgdXNlZCB3aGVuIGFuIGV4cHJlc3Npb24gbGlrZSBge3tmb299fWBcbiAgLy8gaXMgcHJvdmlkZWQsIGJ1dCB3ZSBkb24ndCBrbm93IGF0IGNvbXBpbGUtdGltZSB3aGV0aGVyIGl0XG4gIC8vIGlzIGEgaGVscGVyIG9yIGEgcGF0aC5cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gZW1pdHMgbW9yZSBjb2RlIHRoYW4gdGhlIG90aGVyIG9wdGlvbnMsXG4gIC8vIGFuZCBjYW4gYmUgYXZvaWRlZCBieSBwYXNzaW5nIHRoZSBga25vd25IZWxwZXJzYCBhbmRcbiAgLy8gYGtub3duSGVscGVyc09ubHlgIGZsYWdzIGF0IGNvbXBpbGUtdGltZS5cbiAgaW52b2tlQW1iaWd1b3VzOiBmdW5jdGlvbiBpbnZva2VBbWJpZ3VvdXMobmFtZSwgaGVscGVyQ2FsbCkge1xuICAgIHRoaXMudXNlUmVnaXN0ZXIoJ2hlbHBlcicpO1xuXG4gICAgdmFyIG5vbkhlbHBlciA9IHRoaXMucG9wU3RhY2soKTtcblxuICAgIHRoaXMuZW1wdHlIYXNoKCk7XG4gICAgdmFyIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIoMCwgbmFtZSwgaGVscGVyQ2FsbCk7XG5cbiAgICB2YXIgaGVscGVyTmFtZSA9IHRoaXMubGFzdEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcblxuICAgIHZhciBsb29rdXAgPSBbJygnLCAnKGhlbHBlciA9ICcsIGhlbHBlck5hbWUsICcgfHwgJywgbm9uSGVscGVyLCAnKSddO1xuICAgIGlmICghdGhpcy5vcHRpb25zLnN0cmljdCkge1xuICAgICAgbG9va3VwWzBdID0gJyhoZWxwZXIgPSAnO1xuICAgICAgbG9va3VwLnB1c2goJyAhPSBudWxsID8gaGVscGVyIDogJywgdGhpcy5hbGlhc2FibGUoJ2hlbHBlcnMuaGVscGVyTWlzc2luZycpKTtcbiAgICB9XG5cbiAgICB0aGlzLnB1c2goWycoJywgbG9va3VwLCBoZWxwZXIucGFyYW1zSW5pdCA/IFsnKSwoJywgaGVscGVyLnBhcmFtc0luaXRdIDogW10sICcpLCcsICcodHlwZW9mIGhlbHBlciA9PT0gJywgdGhpcy5hbGlhc2FibGUoJ1wiZnVuY3Rpb25cIicpLCAnID8gJywgdGhpcy5zb3VyY2UuZnVuY3Rpb25DYWxsKCdoZWxwZXInLCAnY2FsbCcsIGhlbHBlci5jYWxsUGFyYW1zKSwgJyA6IGhlbHBlcikpJ10pO1xuICB9LFxuXG4gIC8vIFtpbnZva2VQYXJ0aWFsXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBjb250ZXh0LCAuLi5cbiAgLy8gT24gc3RhY2sgYWZ0ZXI6IHJlc3VsdCBvZiBwYXJ0aWFsIGludm9jYXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gcG9wcyBvZmYgYSBjb250ZXh0LCBpbnZva2VzIGEgcGFydGlhbCB3aXRoIHRoYXQgY29udGV4dCxcbiAgLy8gYW5kIHB1c2hlcyB0aGUgcmVzdWx0IG9mIHRoZSBpbnZvY2F0aW9uIGJhY2suXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uIGludm9rZVBhcnRpYWwoaXNEeW5hbWljLCBuYW1lLCBpbmRlbnQpIHtcbiAgICB2YXIgcGFyYW1zID0gW10sXG4gICAgICAgIG9wdGlvbnMgPSB0aGlzLnNldHVwUGFyYW1zKG5hbWUsIDEsIHBhcmFtcywgZmFsc2UpO1xuXG4gICAgaWYgKGlzRHluYW1pYykge1xuICAgICAgbmFtZSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIGRlbGV0ZSBvcHRpb25zLm5hbWU7XG4gICAgfVxuXG4gICAgaWYgKGluZGVudCkge1xuICAgICAgb3B0aW9ucy5pbmRlbnQgPSBKU09OLnN0cmluZ2lmeShpbmRlbnQpO1xuICAgIH1cbiAgICBvcHRpb25zLmhlbHBlcnMgPSAnaGVscGVycyc7XG4gICAgb3B0aW9ucy5wYXJ0aWFscyA9ICdwYXJ0aWFscyc7XG5cbiAgICBpZiAoIWlzRHluYW1pYykge1xuICAgICAgcGFyYW1zLnVuc2hpZnQodGhpcy5uYW1lTG9va3VwKCdwYXJ0aWFscycsIG5hbWUsICdwYXJ0aWFsJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJhbXMudW5zaGlmdChuYW1lKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdCkge1xuICAgICAgb3B0aW9ucy5kZXB0aHMgPSAnZGVwdGhzJztcbiAgICB9XG4gICAgb3B0aW9ucyA9IHRoaXMub2JqZWN0TGl0ZXJhbChvcHRpb25zKTtcbiAgICBwYXJhbXMucHVzaChvcHRpb25zKTtcblxuICAgIHRoaXMucHVzaCh0aGlzLnNvdXJjZS5mdW5jdGlvbkNhbGwoJ3RoaXMuaW52b2tlUGFydGlhbCcsICcnLCBwYXJhbXMpKTtcbiAgfSxcblxuICAvLyBbYXNzaWduVG9IYXNoXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uLCBoYXNoLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi4sIGhhc2gsIC4uLlxuICAvL1xuICAvLyBQb3BzIGEgdmFsdWUgb2ZmIHRoZSBzdGFjayBhbmQgYXNzaWducyBpdCB0byB0aGUgY3VycmVudCBoYXNoXG4gIGFzc2lnblRvSGFzaDogZnVuY3Rpb24gYXNzaWduVG9IYXNoKGtleSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMucG9wU3RhY2soKSxcbiAgICAgICAgY29udGV4dCA9IHVuZGVmaW5lZCxcbiAgICAgICAgdHlwZSA9IHVuZGVmaW5lZCxcbiAgICAgICAgaWQgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAodGhpcy50cmFja0lkcykge1xuICAgICAgaWQgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgdHlwZSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgfVxuXG4gICAgdmFyIGhhc2ggPSB0aGlzLmhhc2g7XG4gICAgaWYgKGNvbnRleHQpIHtcbiAgICAgIGhhc2guY29udGV4dHNba2V5XSA9IGNvbnRleHQ7XG4gICAgfVxuICAgIGlmICh0eXBlKSB7XG4gICAgICBoYXNoLnR5cGVzW2tleV0gPSB0eXBlO1xuICAgIH1cbiAgICBpZiAoaWQpIHtcbiAgICAgIGhhc2guaWRzW2tleV0gPSBpZDtcbiAgICB9XG4gICAgaGFzaC52YWx1ZXNba2V5XSA9IHZhbHVlO1xuICB9LFxuXG4gIHB1c2hJZDogZnVuY3Rpb24gcHVzaElkKHR5cGUsIG5hbWUsIGNoaWxkKSB7XG4gICAgaWYgKHR5cGUgPT09ICdCbG9ja1BhcmFtJykge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCdibG9ja1BhcmFtc1snICsgbmFtZVswXSArICddLnBhdGhbJyArIG5hbWVbMV0gKyAnXScgKyAoY2hpbGQgPyAnICsgJyArIEpTT04uc3RyaW5naWZ5KCcuJyArIGNoaWxkKSA6ICcnKSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnUGF0aEV4cHJlc3Npb24nKSB7XG4gICAgICB0aGlzLnB1c2hTdHJpbmcobmFtZSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnU3ViRXhwcmVzc2lvbicpIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgndHJ1ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ251bGwnKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gSEVMUEVSU1xuXG4gIGNvbXBpbGVyOiBKYXZhU2NyaXB0Q29tcGlsZXIsXG5cbiAgY29tcGlsZUNoaWxkcmVuOiBmdW5jdGlvbiBjb21waWxlQ2hpbGRyZW4oZW52aXJvbm1lbnQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBlbnZpcm9ubWVudC5jaGlsZHJlbixcbiAgICAgICAgY2hpbGQgPSB1bmRlZmluZWQsXG4gICAgICAgIGNvbXBpbGVyID0gdW5kZWZpbmVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgICBjb21waWxlciA9IG5ldyB0aGlzLmNvbXBpbGVyKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbmV3LWNhcFxuXG4gICAgICB2YXIgaW5kZXggPSB0aGlzLm1hdGNoRXhpc3RpbmdQcm9ncmFtKGNoaWxkKTtcblxuICAgICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zLnB1c2goJycpOyAvLyBQbGFjZWhvbGRlciB0byBwcmV2ZW50IG5hbWUgY29uZmxpY3RzIGZvciBuZXN0ZWQgY2hpbGRyZW5cbiAgICAgICAgaW5kZXggPSB0aGlzLmNvbnRleHQucHJvZ3JhbXMubGVuZ3RoO1xuICAgICAgICBjaGlsZC5pbmRleCA9IGluZGV4O1xuICAgICAgICBjaGlsZC5uYW1lID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtc1tpbmRleF0gPSBjb21waWxlci5jb21waWxlKGNoaWxkLCBvcHRpb25zLCB0aGlzLmNvbnRleHQsICF0aGlzLnByZWNvbXBpbGUpO1xuICAgICAgICB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzW2luZGV4XSA9IGNoaWxkO1xuXG4gICAgICAgIHRoaXMudXNlRGVwdGhzID0gdGhpcy51c2VEZXB0aHMgfHwgY29tcGlsZXIudXNlRGVwdGhzO1xuICAgICAgICB0aGlzLnVzZUJsb2NrUGFyYW1zID0gdGhpcy51c2VCbG9ja1BhcmFtcyB8fCBjb21waWxlci51c2VCbG9ja1BhcmFtcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGNoaWxkLm5hbWUgPSAncHJvZ3JhbScgKyBpbmRleDtcblxuICAgICAgICB0aGlzLnVzZURlcHRocyA9IHRoaXMudXNlRGVwdGhzIHx8IGNoaWxkLnVzZURlcHRocztcbiAgICAgICAgdGhpcy51c2VCbG9ja1BhcmFtcyA9IHRoaXMudXNlQmxvY2tQYXJhbXMgfHwgY2hpbGQudXNlQmxvY2tQYXJhbXM7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBtYXRjaEV4aXN0aW5nUHJvZ3JhbTogZnVuY3Rpb24gbWF0Y2hFeGlzdGluZ1Byb2dyYW0oY2hpbGQpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGVudmlyb25tZW50ID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpXTtcbiAgICAgIGlmIChlbnZpcm9ubWVudCAmJiBlbnZpcm9ubWVudC5lcXVhbHMoY2hpbGQpKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBwcm9ncmFtRXhwcmVzc2lvbjogZnVuY3Rpb24gcHJvZ3JhbUV4cHJlc3Npb24oZ3VpZCkge1xuICAgIHZhciBjaGlsZCA9IHRoaXMuZW52aXJvbm1lbnQuY2hpbGRyZW5bZ3VpZF0sXG4gICAgICAgIHByb2dyYW1QYXJhbXMgPSBbY2hpbGQuaW5kZXgsICdkYXRhJywgY2hpbGQuYmxvY2tQYXJhbXNdO1xuXG4gICAgaWYgKHRoaXMudXNlQmxvY2tQYXJhbXMgfHwgdGhpcy51c2VEZXB0aHMpIHtcbiAgICAgIHByb2dyYW1QYXJhbXMucHVzaCgnYmxvY2tQYXJhbXMnKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudXNlRGVwdGhzKSB7XG4gICAgICBwcm9ncmFtUGFyYW1zLnB1c2goJ2RlcHRocycpO1xuICAgIH1cblxuICAgIHJldHVybiAndGhpcy5wcm9ncmFtKCcgKyBwcm9ncmFtUGFyYW1zLmpvaW4oJywgJykgKyAnKSc7XG4gIH0sXG5cbiAgdXNlUmVnaXN0ZXI6IGZ1bmN0aW9uIHVzZVJlZ2lzdGVyKG5hbWUpIHtcbiAgICBpZiAoIXRoaXMucmVnaXN0ZXJzW25hbWVdKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyc1tuYW1lXSA9IHRydWU7XG4gICAgICB0aGlzLnJlZ2lzdGVycy5saXN0LnB1c2gobmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIHB1c2g6IGZ1bmN0aW9uIHB1c2goZXhwcikge1xuICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBMaXRlcmFsKSkge1xuICAgICAgZXhwciA9IHRoaXMuc291cmNlLndyYXAoZXhwcik7XG4gICAgfVxuXG4gICAgdGhpcy5pbmxpbmVTdGFjay5wdXNoKGV4cHIpO1xuICAgIHJldHVybiBleHByO1xuICB9LFxuXG4gIHB1c2hTdGFja0xpdGVyYWw6IGZ1bmN0aW9uIHB1c2hTdGFja0xpdGVyYWwoaXRlbSkge1xuICAgIHRoaXMucHVzaChuZXcgTGl0ZXJhbChpdGVtKSk7XG4gIH0sXG5cbiAgcHVzaFNvdXJjZTogZnVuY3Rpb24gcHVzaFNvdXJjZShzb3VyY2UpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xuICAgICAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLmFwcGVuZFRvQnVmZmVyKHRoaXMuc291cmNlLnF1b3RlZFN0cmluZyh0aGlzLnBlbmRpbmdDb250ZW50KSwgdGhpcy5wZW5kaW5nTG9jYXRpb24pKTtcbiAgICAgIHRoaXMucGVuZGluZ0NvbnRlbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHNvdXJjZSkge1xuICAgICAgdGhpcy5zb3VyY2UucHVzaChzb3VyY2UpO1xuICAgIH1cbiAgfSxcblxuICByZXBsYWNlU3RhY2s6IGZ1bmN0aW9uIHJlcGxhY2VTdGFjayhjYWxsYmFjaykge1xuICAgIHZhciBwcmVmaXggPSBbJygnXSxcbiAgICAgICAgc3RhY2sgPSB1bmRlZmluZWQsXG4gICAgICAgIGNyZWF0ZWRTdGFjayA9IHVuZGVmaW5lZCxcbiAgICAgICAgdXNlZExpdGVyYWwgPSB1bmRlZmluZWQ7XG5cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIGlmICghdGhpcy5pc0lubGluZSgpKSB7XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgncmVwbGFjZVN0YWNrIG9uIG5vbi1pbmxpbmUnKTtcbiAgICB9XG5cbiAgICAvLyBXZSB3YW50IHRvIG1lcmdlIHRoZSBpbmxpbmUgc3RhdGVtZW50IGludG8gdGhlIHJlcGxhY2VtZW50IHN0YXRlbWVudCB2aWEgJywnXG4gICAgdmFyIHRvcCA9IHRoaXMucG9wU3RhY2sodHJ1ZSk7XG5cbiAgICBpZiAodG9wIGluc3RhbmNlb2YgTGl0ZXJhbCkge1xuICAgICAgLy8gTGl0ZXJhbHMgZG8gbm90IG5lZWQgdG8gYmUgaW5saW5lZFxuICAgICAgc3RhY2sgPSBbdG9wLnZhbHVlXTtcbiAgICAgIHByZWZpeCA9IFsnKCcsIHN0YWNrXTtcbiAgICAgIHVzZWRMaXRlcmFsID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gR2V0IG9yIGNyZWF0ZSB0aGUgY3VycmVudCBzdGFjayBuYW1lIGZvciB1c2UgYnkgdGhlIGlubGluZVxuICAgICAgY3JlYXRlZFN0YWNrID0gdHJ1ZTtcbiAgICAgIHZhciBfbmFtZSA9IHRoaXMuaW5jclN0YWNrKCk7XG5cbiAgICAgIHByZWZpeCA9IFsnKCgnLCB0aGlzLnB1c2goX25hbWUpLCAnID0gJywgdG9wLCAnKSddO1xuICAgICAgc3RhY2sgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgfVxuXG4gICAgdmFyIGl0ZW0gPSBjYWxsYmFjay5jYWxsKHRoaXMsIHN0YWNrKTtcblxuICAgIGlmICghdXNlZExpdGVyYWwpIHtcbiAgICAgIHRoaXMucG9wU3RhY2soKTtcbiAgICB9XG4gICAgaWYgKGNyZWF0ZWRTdGFjaykge1xuICAgICAgdGhpcy5zdGFja1Nsb3QtLTtcbiAgICB9XG4gICAgdGhpcy5wdXNoKHByZWZpeC5jb25jYXQoaXRlbSwgJyknKSk7XG4gIH0sXG5cbiAgaW5jclN0YWNrOiBmdW5jdGlvbiBpbmNyU3RhY2soKSB7XG4gICAgdGhpcy5zdGFja1Nsb3QrKztcbiAgICBpZiAodGhpcy5zdGFja1Nsb3QgPiB0aGlzLnN0YWNrVmFycy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuc3RhY2tWYXJzLnB1c2goJ3N0YWNrJyArIHRoaXMuc3RhY2tTbG90KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudG9wU3RhY2tOYW1lKCk7XG4gIH0sXG4gIHRvcFN0YWNrTmFtZTogZnVuY3Rpb24gdG9wU3RhY2tOYW1lKCkge1xuICAgIHJldHVybiAnc3RhY2snICsgdGhpcy5zdGFja1Nsb3Q7XG4gIH0sXG4gIGZsdXNoSW5saW5lOiBmdW5jdGlvbiBmbHVzaElubGluZSgpIHtcbiAgICB2YXIgaW5saW5lU3RhY2sgPSB0aGlzLmlubGluZVN0YWNrO1xuICAgIHRoaXMuaW5saW5lU3RhY2sgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gaW5saW5lU3RhY2subGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBlbnRyeSA9IGlubGluZVN0YWNrW2ldO1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoZW50cnkgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAgIHRoaXMuY29tcGlsZVN0YWNrLnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHN0YWNrID0gdGhpcy5pbmNyU3RhY2soKTtcbiAgICAgICAgdGhpcy5wdXNoU291cmNlKFtzdGFjaywgJyA9ICcsIGVudHJ5LCAnOyddKTtcbiAgICAgICAgdGhpcy5jb21waWxlU3RhY2sucHVzaChzdGFjayk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBpc0lubGluZTogZnVuY3Rpb24gaXNJbmxpbmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5saW5lU3RhY2subGVuZ3RoO1xuICB9LFxuXG4gIHBvcFN0YWNrOiBmdW5jdGlvbiBwb3BTdGFjayh3cmFwcGVkKSB7XG4gICAgdmFyIGlubGluZSA9IHRoaXMuaXNJbmxpbmUoKSxcbiAgICAgICAgaXRlbSA9IChpbmxpbmUgPyB0aGlzLmlubGluZVN0YWNrIDogdGhpcy5jb21waWxlU3RhY2spLnBvcCgpO1xuXG4gICAgaWYgKCF3cmFwcGVkICYmIGl0ZW0gaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFpbmxpbmUpIHtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgaWYgKCF0aGlzLnN0YWNrU2xvdCkge1xuICAgICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdJbnZhbGlkIHN0YWNrIHBvcCcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhY2tTbG90LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0sXG5cbiAgdG9wU3RhY2s6IGZ1bmN0aW9uIHRvcFN0YWNrKCkge1xuICAgIHZhciBzdGFjayA9IHRoaXMuaXNJbmxpbmUoKSA/IHRoaXMuaW5saW5lU3RhY2sgOiB0aGlzLmNvbXBpbGVTdGFjayxcbiAgICAgICAgaXRlbSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICB9LFxuXG4gIGNvbnRleHROYW1lOiBmdW5jdGlvbiBjb250ZXh0TmFtZShjb250ZXh0KSB7XG4gICAgaWYgKHRoaXMudXNlRGVwdGhzICYmIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiAnZGVwdGhzWycgKyBjb250ZXh0ICsgJ10nO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ2RlcHRoJyArIGNvbnRleHQ7XG4gICAgfVxuICB9LFxuXG4gIHF1b3RlZFN0cmluZzogZnVuY3Rpb24gcXVvdGVkU3RyaW5nKHN0cikge1xuICAgIHJldHVybiB0aGlzLnNvdXJjZS5xdW90ZWRTdHJpbmcoc3RyKTtcbiAgfSxcblxuICBvYmplY3RMaXRlcmFsOiBmdW5jdGlvbiBvYmplY3RMaXRlcmFsKG9iaikge1xuICAgIHJldHVybiB0aGlzLnNvdXJjZS5vYmplY3RMaXRlcmFsKG9iaik7XG4gIH0sXG5cbiAgYWxpYXNhYmxlOiBmdW5jdGlvbiBhbGlhc2FibGUobmFtZSkge1xuICAgIHZhciByZXQgPSB0aGlzLmFsaWFzZXNbbmFtZV07XG4gICAgaWYgKHJldCkge1xuICAgICAgcmV0LnJlZmVyZW5jZUNvdW50Kys7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIHJldCA9IHRoaXMuYWxpYXNlc1tuYW1lXSA9IHRoaXMuc291cmNlLndyYXAobmFtZSk7XG4gICAgcmV0LmFsaWFzYWJsZSA9IHRydWU7XG4gICAgcmV0LnJlZmVyZW5jZUNvdW50ID0gMTtcblxuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgc2V0dXBIZWxwZXI6IGZ1bmN0aW9uIHNldHVwSGVscGVyKHBhcmFtU2l6ZSwgbmFtZSwgYmxvY2tIZWxwZXIpIHtcbiAgICB2YXIgcGFyYW1zID0gW10sXG4gICAgICAgIHBhcmFtc0luaXQgPSB0aGlzLnNldHVwSGVscGVyQXJncyhuYW1lLCBwYXJhbVNpemUsIHBhcmFtcywgYmxvY2tIZWxwZXIpO1xuICAgIHZhciBmb3VuZEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgIHBhcmFtc0luaXQ6IHBhcmFtc0luaXQsXG4gICAgICBuYW1lOiBmb3VuZEhlbHBlcixcbiAgICAgIGNhbGxQYXJhbXM6IFt0aGlzLmNvbnRleHROYW1lKDApXS5jb25jYXQocGFyYW1zKVxuICAgIH07XG4gIH0sXG5cbiAgc2V0dXBQYXJhbXM6IGZ1bmN0aW9uIHNldHVwUGFyYW1zKGhlbHBlciwgcGFyYW1TaXplLCBwYXJhbXMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHt9LFxuICAgICAgICBjb250ZXh0cyA9IFtdLFxuICAgICAgICB0eXBlcyA9IFtdLFxuICAgICAgICBpZHMgPSBbXSxcbiAgICAgICAgcGFyYW0gPSB1bmRlZmluZWQ7XG5cbiAgICBvcHRpb25zLm5hbWUgPSB0aGlzLnF1b3RlZFN0cmluZyhoZWxwZXIpO1xuICAgIG9wdGlvbnMuaGFzaCA9IHRoaXMucG9wU3RhY2soKTtcblxuICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICBvcHRpb25zLmhhc2hJZHMgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgb3B0aW9ucy5oYXNoVHlwZXMgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICBvcHRpb25zLmhhc2hDb250ZXh0cyA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB9XG5cbiAgICB2YXIgaW52ZXJzZSA9IHRoaXMucG9wU3RhY2soKSxcbiAgICAgICAgcHJvZ3JhbSA9IHRoaXMucG9wU3RhY2soKTtcblxuICAgIC8vIEF2b2lkIHNldHRpbmcgZm4gYW5kIGludmVyc2UgaWYgbmVpdGhlciBhcmUgc2V0LiBUaGlzIGFsbG93c1xuICAgIC8vIGhlbHBlcnMgdG8gZG8gYSBjaGVjayBmb3IgYGlmIChvcHRpb25zLmZuKWBcbiAgICBpZiAocHJvZ3JhbSB8fCBpbnZlcnNlKSB7XG4gICAgICBvcHRpb25zLmZuID0gcHJvZ3JhbSB8fCAndGhpcy5ub29wJztcbiAgICAgIG9wdGlvbnMuaW52ZXJzZSA9IGludmVyc2UgfHwgJ3RoaXMubm9vcCc7XG4gICAgfVxuXG4gICAgLy8gVGhlIHBhcmFtZXRlcnMgZ28gb24gdG8gdGhlIHN0YWNrIGluIG9yZGVyIChtYWtpbmcgc3VyZSB0aGF0IHRoZXkgYXJlIGV2YWx1YXRlZCBpbiBvcmRlcilcbiAgICAvLyBzbyB3ZSBuZWVkIHRvIHBvcCB0aGVtIG9mZiB0aGUgc3RhY2sgaW4gcmV2ZXJzZSBvcmRlclxuICAgIHZhciBpID0gcGFyYW1TaXplO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHBhcmFtID0gdGhpcy5wb3BTdGFjaygpO1xuICAgICAgcGFyYW1zW2ldID0gcGFyYW07XG5cbiAgICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICAgIGlkc1tpXSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgICB0eXBlc1tpXSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgICAgY29udGV4dHNbaV0gPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudHJhY2tJZHMpIHtcbiAgICAgIG9wdGlvbnMuaWRzID0gdGhpcy5zb3VyY2UuZ2VuZXJhdGVBcnJheShpZHMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIG9wdGlvbnMudHlwZXMgPSB0aGlzLnNvdXJjZS5nZW5lcmF0ZUFycmF5KHR5cGVzKTtcbiAgICAgIG9wdGlvbnMuY29udGV4dHMgPSB0aGlzLnNvdXJjZS5nZW5lcmF0ZUFycmF5KGNvbnRleHRzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmRhdGEpIHtcbiAgICAgIG9wdGlvbnMuZGF0YSA9ICdkYXRhJztcbiAgICB9XG4gICAgaWYgKHRoaXMudXNlQmxvY2tQYXJhbXMpIHtcbiAgICAgIG9wdGlvbnMuYmxvY2tQYXJhbXMgPSAnYmxvY2tQYXJhbXMnO1xuICAgIH1cbiAgICByZXR1cm4gb3B0aW9ucztcbiAgfSxcblxuICBzZXR1cEhlbHBlckFyZ3M6IGZ1bmN0aW9uIHNldHVwSGVscGVyQXJncyhoZWxwZXIsIHBhcmFtU2l6ZSwgcGFyYW1zLCB1c2VSZWdpc3Rlcikge1xuICAgIHZhciBvcHRpb25zID0gdGhpcy5zZXR1cFBhcmFtcyhoZWxwZXIsIHBhcmFtU2l6ZSwgcGFyYW1zLCB0cnVlKTtcbiAgICBvcHRpb25zID0gdGhpcy5vYmplY3RMaXRlcmFsKG9wdGlvbnMpO1xuICAgIGlmICh1c2VSZWdpc3Rlcikge1xuICAgICAgdGhpcy51c2VSZWdpc3Rlcignb3B0aW9ucycpO1xuICAgICAgcGFyYW1zLnB1c2goJ29wdGlvbnMnKTtcbiAgICAgIHJldHVybiBbJ29wdGlvbnM9Jywgb3B0aW9uc107XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmFtcy5wdXNoKG9wdGlvbnMpO1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgfVxufTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc2VydmVkV29yZHMgPSAoJ2JyZWFrIGVsc2UgbmV3IHZhcicgKyAnIGNhc2UgZmluYWxseSByZXR1cm4gdm9pZCcgKyAnIGNhdGNoIGZvciBzd2l0Y2ggd2hpbGUnICsgJyBjb250aW51ZSBmdW5jdGlvbiB0aGlzIHdpdGgnICsgJyBkZWZhdWx0IGlmIHRocm93JyArICcgZGVsZXRlIGluIHRyeScgKyAnIGRvIGluc3RhbmNlb2YgdHlwZW9mJyArICcgYWJzdHJhY3QgZW51bSBpbnQgc2hvcnQnICsgJyBib29sZWFuIGV4cG9ydCBpbnRlcmZhY2Ugc3RhdGljJyArICcgYnl0ZSBleHRlbmRzIGxvbmcgc3VwZXInICsgJyBjaGFyIGZpbmFsIG5hdGl2ZSBzeW5jaHJvbml6ZWQnICsgJyBjbGFzcyBmbG9hdCBwYWNrYWdlIHRocm93cycgKyAnIGNvbnN0IGdvdG8gcHJpdmF0ZSB0cmFuc2llbnQnICsgJyBkZWJ1Z2dlciBpbXBsZW1lbnRzIHByb3RlY3RlZCB2b2xhdGlsZScgKyAnIGRvdWJsZSBpbXBvcnQgcHVibGljIGxldCB5aWVsZCBhd2FpdCcgKyAnIG51bGwgdHJ1ZSBmYWxzZScpLnNwbGl0KCcgJyk7XG5cbiAgdmFyIGNvbXBpbGVyV29yZHMgPSBKYXZhU2NyaXB0Q29tcGlsZXIuUkVTRVJWRURfV09SRFMgPSB7fTtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHJlc2VydmVkV29yZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY29tcGlsZXJXb3Jkc1tyZXNlcnZlZFdvcmRzW2ldXSA9IHRydWU7XG4gIH1cbn0pKCk7XG5cbkphdmFTY3JpcHRDb21waWxlci5pc1ZhbGlkSmF2YVNjcmlwdFZhcmlhYmxlTmFtZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIHJldHVybiAhSmF2YVNjcmlwdENvbXBpbGVyLlJFU0VSVkVEX1dPUkRTW25hbWVdICYmIC9eW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qJC8udGVzdChuYW1lKTtcbn07XG5cbmZ1bmN0aW9uIHN0cmljdExvb2t1cChyZXF1aXJlVGVybWluYWwsIGNvbXBpbGVyLCBwYXJ0cywgdHlwZSkge1xuICB2YXIgc3RhY2sgPSBjb21waWxlci5wb3BTdGFjaygpLFxuICAgICAgaSA9IDAsXG4gICAgICBsZW4gPSBwYXJ0cy5sZW5ndGg7XG4gIGlmIChyZXF1aXJlVGVybWluYWwpIHtcbiAgICBsZW4tLTtcbiAgfVxuXG4gIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBzdGFjayA9IGNvbXBpbGVyLm5hbWVMb29rdXAoc3RhY2ssIHBhcnRzW2ldLCB0eXBlKTtcbiAgfVxuXG4gIGlmIChyZXF1aXJlVGVybWluYWwpIHtcbiAgICByZXR1cm4gW2NvbXBpbGVyLmFsaWFzYWJsZSgndGhpcy5zdHJpY3QnKSwgJygnLCBzdGFjaywgJywgJywgY29tcGlsZXIucXVvdGVkU3RyaW5nKHBhcnRzW2ldKSwgJyknXTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RhY2s7XG4gIH1cbn1cblxuZXhwb3J0c1snZGVmYXVsdCddID0gSmF2YVNjcmlwdENvbXBpbGVyO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuLyogSmlzb24gZ2VuZXJhdGVkIHBhcnNlciAqL1xudmFyIGhhbmRsZWJhcnMgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJzZXIgPSB7IHRyYWNlOiBmdW5jdGlvbiB0cmFjZSgpIHt9LFxuICAgICAgICB5eToge30sXG4gICAgICAgIHN5bWJvbHNfOiB7IGVycm9yOiAyLCByb290OiAzLCBwcm9ncmFtOiA0LCBFT0Y6IDUsIHByb2dyYW1fcmVwZXRpdGlvbjA6IDYsIHN0YXRlbWVudDogNywgbXVzdGFjaGU6IDgsIGJsb2NrOiA5LCByYXdCbG9jazogMTAsIHBhcnRpYWw6IDExLCBjb250ZW50OiAxMiwgQ09NTUVOVDogMTMsIENPTlRFTlQ6IDE0LCBvcGVuUmF3QmxvY2s6IDE1LCBFTkRfUkFXX0JMT0NLOiAxNiwgT1BFTl9SQVdfQkxPQ0s6IDE3LCBoZWxwZXJOYW1lOiAxOCwgb3BlblJhd0Jsb2NrX3JlcGV0aXRpb24wOiAxOSwgb3BlblJhd0Jsb2NrX29wdGlvbjA6IDIwLCBDTE9TRV9SQVdfQkxPQ0s6IDIxLCBvcGVuQmxvY2s6IDIyLCBibG9ja19vcHRpb24wOiAyMywgY2xvc2VCbG9jazogMjQsIG9wZW5JbnZlcnNlOiAyNSwgYmxvY2tfb3B0aW9uMTogMjYsIE9QRU5fQkxPQ0s6IDI3LCBvcGVuQmxvY2tfcmVwZXRpdGlvbjA6IDI4LCBvcGVuQmxvY2tfb3B0aW9uMDogMjksIG9wZW5CbG9ja19vcHRpb24xOiAzMCwgQ0xPU0U6IDMxLCBPUEVOX0lOVkVSU0U6IDMyLCBvcGVuSW52ZXJzZV9yZXBldGl0aW9uMDogMzMsIG9wZW5JbnZlcnNlX29wdGlvbjA6IDM0LCBvcGVuSW52ZXJzZV9vcHRpb24xOiAzNSwgb3BlbkludmVyc2VDaGFpbjogMzYsIE9QRU5fSU5WRVJTRV9DSEFJTjogMzcsIG9wZW5JbnZlcnNlQ2hhaW5fcmVwZXRpdGlvbjA6IDM4LCBvcGVuSW52ZXJzZUNoYWluX29wdGlvbjA6IDM5LCBvcGVuSW52ZXJzZUNoYWluX29wdGlvbjE6IDQwLCBpbnZlcnNlQW5kUHJvZ3JhbTogNDEsIElOVkVSU0U6IDQyLCBpbnZlcnNlQ2hhaW46IDQzLCBpbnZlcnNlQ2hhaW5fb3B0aW9uMDogNDQsIE9QRU5fRU5EQkxPQ0s6IDQ1LCBPUEVOOiA0NiwgbXVzdGFjaGVfcmVwZXRpdGlvbjA6IDQ3LCBtdXN0YWNoZV9vcHRpb24wOiA0OCwgT1BFTl9VTkVTQ0FQRUQ6IDQ5LCBtdXN0YWNoZV9yZXBldGl0aW9uMTogNTAsIG11c3RhY2hlX29wdGlvbjE6IDUxLCBDTE9TRV9VTkVTQ0FQRUQ6IDUyLCBPUEVOX1BBUlRJQUw6IDUzLCBwYXJ0aWFsTmFtZTogNTQsIHBhcnRpYWxfcmVwZXRpdGlvbjA6IDU1LCBwYXJ0aWFsX29wdGlvbjA6IDU2LCBwYXJhbTogNTcsIHNleHByOiA1OCwgT1BFTl9TRVhQUjogNTksIHNleHByX3JlcGV0aXRpb24wOiA2MCwgc2V4cHJfb3B0aW9uMDogNjEsIENMT1NFX1NFWFBSOiA2MiwgaGFzaDogNjMsIGhhc2hfcmVwZXRpdGlvbl9wbHVzMDogNjQsIGhhc2hTZWdtZW50OiA2NSwgSUQ6IDY2LCBFUVVBTFM6IDY3LCBibG9ja1BhcmFtczogNjgsIE9QRU5fQkxPQ0tfUEFSQU1TOiA2OSwgYmxvY2tQYXJhbXNfcmVwZXRpdGlvbl9wbHVzMDogNzAsIENMT1NFX0JMT0NLX1BBUkFNUzogNzEsIHBhdGg6IDcyLCBkYXRhTmFtZTogNzMsIFNUUklORzogNzQsIE5VTUJFUjogNzUsIEJPT0xFQU46IDc2LCBVTkRFRklORUQ6IDc3LCBOVUxMOiA3OCwgREFUQTogNzksIHBhdGhTZWdtZW50czogODAsIFNFUDogODEsICRhY2NlcHQ6IDAsICRlbmQ6IDEgfSxcbiAgICAgICAgdGVybWluYWxzXzogeyAyOiBcImVycm9yXCIsIDU6IFwiRU9GXCIsIDEzOiBcIkNPTU1FTlRcIiwgMTQ6IFwiQ09OVEVOVFwiLCAxNjogXCJFTkRfUkFXX0JMT0NLXCIsIDE3OiBcIk9QRU5fUkFXX0JMT0NLXCIsIDIxOiBcIkNMT1NFX1JBV19CTE9DS1wiLCAyNzogXCJPUEVOX0JMT0NLXCIsIDMxOiBcIkNMT1NFXCIsIDMyOiBcIk9QRU5fSU5WRVJTRVwiLCAzNzogXCJPUEVOX0lOVkVSU0VfQ0hBSU5cIiwgNDI6IFwiSU5WRVJTRVwiLCA0NTogXCJPUEVOX0VOREJMT0NLXCIsIDQ2OiBcIk9QRU5cIiwgNDk6IFwiT1BFTl9VTkVTQ0FQRURcIiwgNTI6IFwiQ0xPU0VfVU5FU0NBUEVEXCIsIDUzOiBcIk9QRU5fUEFSVElBTFwiLCA1OTogXCJPUEVOX1NFWFBSXCIsIDYyOiBcIkNMT1NFX1NFWFBSXCIsIDY2OiBcIklEXCIsIDY3OiBcIkVRVUFMU1wiLCA2OTogXCJPUEVOX0JMT0NLX1BBUkFNU1wiLCA3MTogXCJDTE9TRV9CTE9DS19QQVJBTVNcIiwgNzQ6IFwiU1RSSU5HXCIsIDc1OiBcIk5VTUJFUlwiLCA3NjogXCJCT09MRUFOXCIsIDc3OiBcIlVOREVGSU5FRFwiLCA3ODogXCJOVUxMXCIsIDc5OiBcIkRBVEFcIiwgODE6IFwiU0VQXCIgfSxcbiAgICAgICAgcHJvZHVjdGlvbnNfOiBbMCwgWzMsIDJdLCBbNCwgMV0sIFs3LCAxXSwgWzcsIDFdLCBbNywgMV0sIFs3LCAxXSwgWzcsIDFdLCBbNywgMV0sIFsxMiwgMV0sIFsxMCwgM10sIFsxNSwgNV0sIFs5LCA0XSwgWzksIDRdLCBbMjIsIDZdLCBbMjUsIDZdLCBbMzYsIDZdLCBbNDEsIDJdLCBbNDMsIDNdLCBbNDMsIDFdLCBbMjQsIDNdLCBbOCwgNV0sIFs4LCA1XSwgWzExLCA1XSwgWzU3LCAxXSwgWzU3LCAxXSwgWzU4LCA1XSwgWzYzLCAxXSwgWzY1LCAzXSwgWzY4LCAzXSwgWzE4LCAxXSwgWzE4LCAxXSwgWzE4LCAxXSwgWzE4LCAxXSwgWzE4LCAxXSwgWzE4LCAxXSwgWzE4LCAxXSwgWzU0LCAxXSwgWzU0LCAxXSwgWzczLCAyXSwgWzcyLCAxXSwgWzgwLCAzXSwgWzgwLCAxXSwgWzYsIDBdLCBbNiwgMl0sIFsxOSwgMF0sIFsxOSwgMl0sIFsyMCwgMF0sIFsyMCwgMV0sIFsyMywgMF0sIFsyMywgMV0sIFsyNiwgMF0sIFsyNiwgMV0sIFsyOCwgMF0sIFsyOCwgMl0sIFsyOSwgMF0sIFsyOSwgMV0sIFszMCwgMF0sIFszMCwgMV0sIFszMywgMF0sIFszMywgMl0sIFszNCwgMF0sIFszNCwgMV0sIFszNSwgMF0sIFszNSwgMV0sIFszOCwgMF0sIFszOCwgMl0sIFszOSwgMF0sIFszOSwgMV0sIFs0MCwgMF0sIFs0MCwgMV0sIFs0NCwgMF0sIFs0NCwgMV0sIFs0NywgMF0sIFs0NywgMl0sIFs0OCwgMF0sIFs0OCwgMV0sIFs1MCwgMF0sIFs1MCwgMl0sIFs1MSwgMF0sIFs1MSwgMV0sIFs1NSwgMF0sIFs1NSwgMl0sIFs1NiwgMF0sIFs1NiwgMV0sIFs2MCwgMF0sIFs2MCwgMl0sIFs2MSwgMF0sIFs2MSwgMV0sIFs2NCwgMV0sIFs2NCwgMl0sIFs3MCwgMV0sIFs3MCwgMl1dLFxuICAgICAgICBwZXJmb3JtQWN0aW9uOiBmdW5jdGlvbiBhbm9ueW1vdXMoeXl0ZXh0LCB5eWxlbmcsIHl5bGluZW5vLCB5eSwgeXlzdGF0ZSwgJCQsIF8kKSB7XG5cbiAgICAgICAgICAgIHZhciAkMCA9ICQkLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBzd2l0Y2ggKHl5c3RhdGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkJFskMCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtKCQkWyQwXSwgbnVsbCwge30sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSAkJFskMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gJCRbJDBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSAkJFskMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5LkNvbW1lbnRTdGF0ZW1lbnQoeXkuc3RyaXBDb21tZW50KCQkWyQwXSksIHl5LnN0cmlwRmxhZ3MoJCRbJDBdLCAkJFskMF0pLCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBuZXcgeXkuQ29udGVudFN0YXRlbWVudCgkJFskMF0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDEwOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB5eS5wcmVwYXJlUmF3QmxvY2soJCRbJDAgLSAyXSwgJCRbJDAgLSAxXSwgJCRbJDBdLCB0aGlzLl8kKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxMTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geyBwYXRoOiAkJFskMCAtIDNdLCBwYXJhbXM6ICQkWyQwIC0gMl0sIGhhc2g6ICQkWyQwIC0gMV0gfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geXkucHJlcGFyZUJsb2NrKCQkWyQwIC0gM10sICQkWyQwIC0gMl0sICQkWyQwIC0gMV0sICQkWyQwXSwgZmFsc2UsIHRoaXMuXyQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDEzOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB5eS5wcmVwYXJlQmxvY2soJCRbJDAgLSAzXSwgJCRbJDAgLSAyXSwgJCRbJDAgLSAxXSwgJCRbJDBdLCB0cnVlLCB0aGlzLl8kKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxNDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geyBwYXRoOiAkJFskMCAtIDRdLCBwYXJhbXM6ICQkWyQwIC0gM10sIGhhc2g6ICQkWyQwIC0gMl0sIGJsb2NrUGFyYW1zOiAkJFskMCAtIDFdLCBzdHJpcDogeXkuc3RyaXBGbGFncygkJFskMCAtIDVdLCAkJFskMF0pIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTU6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IHsgcGF0aDogJCRbJDAgLSA0XSwgcGFyYW1zOiAkJFskMCAtIDNdLCBoYXNoOiAkJFskMCAtIDJdLCBibG9ja1BhcmFtczogJCRbJDAgLSAxXSwgc3RyaXA6IHl5LnN0cmlwRmxhZ3MoJCRbJDAgLSA1XSwgJCRbJDBdKSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE2OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB7IHBhdGg6ICQkWyQwIC0gNF0sIHBhcmFtczogJCRbJDAgLSAzXSwgaGFzaDogJCRbJDAgLSAyXSwgYmxvY2tQYXJhbXM6ICQkWyQwIC0gMV0sIHN0cmlwOiB5eS5zdHJpcEZsYWdzKCQkWyQwIC0gNV0sICQkWyQwXSkgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxNzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geyBzdHJpcDogeXkuc3RyaXBGbGFncygkJFskMCAtIDFdLCAkJFskMCAtIDFdKSwgcHJvZ3JhbTogJCRbJDBdIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTg6XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbnZlcnNlID0geXkucHJlcGFyZUJsb2NrKCQkWyQwIC0gMl0sICQkWyQwIC0gMV0sICQkWyQwXSwgJCRbJDBdLCBmYWxzZSwgdGhpcy5fJCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtID0gbmV3IHl5LlByb2dyYW0oW2ludmVyc2VdLCBudWxsLCB7fSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIHByb2dyYW0uY2hhaW5lZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geyBzdHJpcDogJCRbJDAgLSAyXS5zdHJpcCwgcHJvZ3JhbTogcHJvZ3JhbSwgY2hhaW46IHRydWUgfTtcblxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE5OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSAkJFskMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IHsgcGF0aDogJCRbJDAgLSAxXSwgc3RyaXA6IHl5LnN0cmlwRmxhZ3MoJCRbJDAgLSAyXSwgJCRbJDBdKSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB5eS5wcmVwYXJlTXVzdGFjaGUoJCRbJDAgLSAzXSwgJCRbJDAgLSAyXSwgJCRbJDAgLSAxXSwgJCRbJDAgLSA0XSwgeXkuc3RyaXBGbGFncygkJFskMCAtIDRdLCAkJFskMF0pLCB0aGlzLl8kKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyMjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geXkucHJlcGFyZU11c3RhY2hlKCQkWyQwIC0gM10sICQkWyQwIC0gMl0sICQkWyQwIC0gMV0sICQkWyQwIC0gNF0sIHl5LnN0cmlwRmxhZ3MoJCRbJDAgLSA0XSwgJCRbJDBdKSwgdGhpcy5fJCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsU3RhdGVtZW50KCQkWyQwIC0gM10sICQkWyQwIC0gMl0sICQkWyQwIC0gMV0sIHl5LnN0cmlwRmxhZ3MoJCRbJDAgLSA0XSwgJCRbJDBdKSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyNTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gJCRbJDBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI2OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBuZXcgeXkuU3ViRXhwcmVzc2lvbigkJFskMCAtIDNdLCAkJFskMCAtIDJdLCAkJFskMCAtIDFdLCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyNzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5Lkhhc2goJCRbJDBdLCB5eS5sb2NJbmZvKHRoaXMuXyQpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyODpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5Lkhhc2hQYWlyKHl5LmlkKCQkWyQwIC0gMl0pLCAkJFskMF0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI5OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSB5eS5pZCgkJFskMCAtIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzMDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gJCRbJDBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDMxOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSAkJFskMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzI6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IG5ldyB5eS5TdHJpbmdMaXRlcmFsKCQkWyQwXSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IG5ldyB5eS5OdW1iZXJMaXRlcmFsKCQkWyQwXSwgeXkubG9jSW5mbyh0aGlzLl8kKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IG5ldyB5eS5Cb29sZWFuTGl0ZXJhbCgkJFskMF0sIHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM1OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBuZXcgeXkuVW5kZWZpbmVkTGl0ZXJhbCh5eS5sb2NJbmZvKHRoaXMuXyQpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzNjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gbmV3IHl5Lk51bGxMaXRlcmFsKHl5LmxvY0luZm8odGhpcy5fJCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSAkJFskMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9ICQkWyQwXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geXkucHJlcGFyZVBhdGgodHJ1ZSwgJCRbJDBdLCB0aGlzLl8kKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0MDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0geXkucHJlcGFyZVBhdGgoZmFsc2UsICQkWyQwXSwgdGhpcy5fJCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgICAgICAgICAgICQkWyQwIC0gMl0ucHVzaCh7IHBhcnQ6IHl5LmlkKCQkWyQwXSksIG9yaWdpbmFsOiAkJFskMF0sIHNlcGFyYXRvcjogJCRbJDAgLSAxXSB9KTt0aGlzLiQgPSAkJFskMCAtIDJdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQyOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBbeyBwYXJ0OiB5eS5pZCgkJFskMF0pLCBvcmlnaW5hbDogJCRbJDBdIH1dO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQzOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0NDpcbiAgICAgICAgICAgICAgICAgICAgJCRbJDAgLSAxXS5wdXNoKCQkWyQwXSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDU6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ2OlxuICAgICAgICAgICAgICAgICAgICAkJFskMCAtIDFdLnB1c2goJCRbJDBdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA1MzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gW107XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNTQ6XG4gICAgICAgICAgICAgICAgICAgICQkWyQwIC0gMV0ucHVzaCgkJFskMF0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDU5OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA2MDpcbiAgICAgICAgICAgICAgICAgICAgJCRbJDAgLSAxXS5wdXNoKCQkWyQwXSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNjU6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDY2OlxuICAgICAgICAgICAgICAgICAgICAkJFskMCAtIDFdLnB1c2goJCRbJDBdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA3MzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gW107XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNzQ6XG4gICAgICAgICAgICAgICAgICAgICQkWyQwIC0gMV0ucHVzaCgkJFskMF0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDc3OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA3ODpcbiAgICAgICAgICAgICAgICAgICAgJCRbJDAgLSAxXS5wdXNoKCQkWyQwXSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODE6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDgyOlxuICAgICAgICAgICAgICAgICAgICAkJFskMCAtIDFdLnB1c2goJCRbJDBdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA4NTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kID0gW107XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODY6XG4gICAgICAgICAgICAgICAgICAgICQkWyQwIC0gMV0ucHVzaCgkJFskMF0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDg5OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQgPSBbJCRbJDBdXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA5MDpcbiAgICAgICAgICAgICAgICAgICAgJCRbJDAgLSAxXS5wdXNoKCQkWyQwXSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgOTE6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCA9IFskJFskMF1dO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDkyOlxuICAgICAgICAgICAgICAgICAgICAkJFskMCAtIDFdLnB1c2goJCRbJDBdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRhYmxlOiBbeyAzOiAxLCA0OiAyLCA1OiBbMiwgNDNdLCA2OiAzLCAxMzogWzIsIDQzXSwgMTQ6IFsyLCA0M10sIDE3OiBbMiwgNDNdLCAyNzogWzIsIDQzXSwgMzI6IFsyLCA0M10sIDQ2OiBbMiwgNDNdLCA0OTogWzIsIDQzXSwgNTM6IFsyLCA0M10gfSwgeyAxOiBbM10gfSwgeyA1OiBbMSwgNF0gfSwgeyA1OiBbMiwgMl0sIDc6IDUsIDg6IDYsIDk6IDcsIDEwOiA4LCAxMTogOSwgMTI6IDEwLCAxMzogWzEsIDExXSwgMTQ6IFsxLCAxOF0sIDE1OiAxNiwgMTc6IFsxLCAyMV0sIDIyOiAxNCwgMjU6IDE1LCAyNzogWzEsIDE5XSwgMzI6IFsxLCAyMF0sIDM3OiBbMiwgMl0sIDQyOiBbMiwgMl0sIDQ1OiBbMiwgMl0sIDQ2OiBbMSwgMTJdLCA0OTogWzEsIDEzXSwgNTM6IFsxLCAxN10gfSwgeyAxOiBbMiwgMV0gfSwgeyA1OiBbMiwgNDRdLCAxMzogWzIsIDQ0XSwgMTQ6IFsyLCA0NF0sIDE3OiBbMiwgNDRdLCAyNzogWzIsIDQ0XSwgMzI6IFsyLCA0NF0sIDM3OiBbMiwgNDRdLCA0MjogWzIsIDQ0XSwgNDU6IFsyLCA0NF0sIDQ2OiBbMiwgNDRdLCA0OTogWzIsIDQ0XSwgNTM6IFsyLCA0NF0gfSwgeyA1OiBbMiwgM10sIDEzOiBbMiwgM10sIDE0OiBbMiwgM10sIDE3OiBbMiwgM10sIDI3OiBbMiwgM10sIDMyOiBbMiwgM10sIDM3OiBbMiwgM10sIDQyOiBbMiwgM10sIDQ1OiBbMiwgM10sIDQ2OiBbMiwgM10sIDQ5OiBbMiwgM10sIDUzOiBbMiwgM10gfSwgeyA1OiBbMiwgNF0sIDEzOiBbMiwgNF0sIDE0OiBbMiwgNF0sIDE3OiBbMiwgNF0sIDI3OiBbMiwgNF0sIDMyOiBbMiwgNF0sIDM3OiBbMiwgNF0sIDQyOiBbMiwgNF0sIDQ1OiBbMiwgNF0sIDQ2OiBbMiwgNF0sIDQ5OiBbMiwgNF0sIDUzOiBbMiwgNF0gfSwgeyA1OiBbMiwgNV0sIDEzOiBbMiwgNV0sIDE0OiBbMiwgNV0sIDE3OiBbMiwgNV0sIDI3OiBbMiwgNV0sIDMyOiBbMiwgNV0sIDM3OiBbMiwgNV0sIDQyOiBbMiwgNV0sIDQ1OiBbMiwgNV0sIDQ2OiBbMiwgNV0sIDQ5OiBbMiwgNV0sIDUzOiBbMiwgNV0gfSwgeyA1OiBbMiwgNl0sIDEzOiBbMiwgNl0sIDE0OiBbMiwgNl0sIDE3OiBbMiwgNl0sIDI3OiBbMiwgNl0sIDMyOiBbMiwgNl0sIDM3OiBbMiwgNl0sIDQyOiBbMiwgNl0sIDQ1OiBbMiwgNl0sIDQ2OiBbMiwgNl0sIDQ5OiBbMiwgNl0sIDUzOiBbMiwgNl0gfSwgeyA1OiBbMiwgN10sIDEzOiBbMiwgN10sIDE0OiBbMiwgN10sIDE3OiBbMiwgN10sIDI3OiBbMiwgN10sIDMyOiBbMiwgN10sIDM3OiBbMiwgN10sIDQyOiBbMiwgN10sIDQ1OiBbMiwgN10sIDQ2OiBbMiwgN10sIDQ5OiBbMiwgN10sIDUzOiBbMiwgN10gfSwgeyA1OiBbMiwgOF0sIDEzOiBbMiwgOF0sIDE0OiBbMiwgOF0sIDE3OiBbMiwgOF0sIDI3OiBbMiwgOF0sIDMyOiBbMiwgOF0sIDM3OiBbMiwgOF0sIDQyOiBbMiwgOF0sIDQ1OiBbMiwgOF0sIDQ2OiBbMiwgOF0sIDQ5OiBbMiwgOF0sIDUzOiBbMiwgOF0gfSwgeyAxODogMjIsIDY2OiBbMSwgMzJdLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgMTg6IDMzLCA2NjogWzEsIDMyXSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDQ6IDM0LCA2OiAzLCAxMzogWzIsIDQzXSwgMTQ6IFsyLCA0M10sIDE3OiBbMiwgNDNdLCAyNzogWzIsIDQzXSwgMzI6IFsyLCA0M10sIDM3OiBbMiwgNDNdLCA0MjogWzIsIDQzXSwgNDU6IFsyLCA0M10sIDQ2OiBbMiwgNDNdLCA0OTogWzIsIDQzXSwgNTM6IFsyLCA0M10gfSwgeyA0OiAzNSwgNjogMywgMTM6IFsyLCA0M10sIDE0OiBbMiwgNDNdLCAxNzogWzIsIDQzXSwgMjc6IFsyLCA0M10sIDMyOiBbMiwgNDNdLCA0MjogWzIsIDQzXSwgNDU6IFsyLCA0M10sIDQ2OiBbMiwgNDNdLCA0OTogWzIsIDQzXSwgNTM6IFsyLCA0M10gfSwgeyAxMjogMzYsIDE0OiBbMSwgMThdIH0sIHsgMTg6IDM4LCA1NDogMzcsIDU4OiAzOSwgNTk6IFsxLCA0MF0sIDY2OiBbMSwgMzJdLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgNTogWzIsIDldLCAxMzogWzIsIDldLCAxNDogWzIsIDldLCAxNjogWzIsIDldLCAxNzogWzIsIDldLCAyNzogWzIsIDldLCAzMjogWzIsIDldLCAzNzogWzIsIDldLCA0MjogWzIsIDldLCA0NTogWzIsIDldLCA0NjogWzIsIDldLCA0OTogWzIsIDldLCA1MzogWzIsIDldIH0sIHsgMTg6IDQxLCA2NjogWzEsIDMyXSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDE4OiA0MiwgNjY6IFsxLCAzMl0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyAxODogNDMsIDY2OiBbMSwgMzJdLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgMzE6IFsyLCA3M10sIDQ3OiA0NCwgNTk6IFsyLCA3M10sIDY2OiBbMiwgNzNdLCA3NDogWzIsIDczXSwgNzU6IFsyLCA3M10sIDc2OiBbMiwgNzNdLCA3NzogWzIsIDczXSwgNzg6IFsyLCA3M10sIDc5OiBbMiwgNzNdIH0sIHsgMjE6IFsyLCAzMF0sIDMxOiBbMiwgMzBdLCA1MjogWzIsIDMwXSwgNTk6IFsyLCAzMF0sIDYyOiBbMiwgMzBdLCA2NjogWzIsIDMwXSwgNjk6IFsyLCAzMF0sIDc0OiBbMiwgMzBdLCA3NTogWzIsIDMwXSwgNzY6IFsyLCAzMF0sIDc3OiBbMiwgMzBdLCA3ODogWzIsIDMwXSwgNzk6IFsyLCAzMF0gfSwgeyAyMTogWzIsIDMxXSwgMzE6IFsyLCAzMV0sIDUyOiBbMiwgMzFdLCA1OTogWzIsIDMxXSwgNjI6IFsyLCAzMV0sIDY2OiBbMiwgMzFdLCA2OTogWzIsIDMxXSwgNzQ6IFsyLCAzMV0sIDc1OiBbMiwgMzFdLCA3NjogWzIsIDMxXSwgNzc6IFsyLCAzMV0sIDc4OiBbMiwgMzFdLCA3OTogWzIsIDMxXSB9LCB7IDIxOiBbMiwgMzJdLCAzMTogWzIsIDMyXSwgNTI6IFsyLCAzMl0sIDU5OiBbMiwgMzJdLCA2MjogWzIsIDMyXSwgNjY6IFsyLCAzMl0sIDY5OiBbMiwgMzJdLCA3NDogWzIsIDMyXSwgNzU6IFsyLCAzMl0sIDc2OiBbMiwgMzJdLCA3NzogWzIsIDMyXSwgNzg6IFsyLCAzMl0sIDc5OiBbMiwgMzJdIH0sIHsgMjE6IFsyLCAzM10sIDMxOiBbMiwgMzNdLCA1MjogWzIsIDMzXSwgNTk6IFsyLCAzM10sIDYyOiBbMiwgMzNdLCA2NjogWzIsIDMzXSwgNjk6IFsyLCAzM10sIDc0OiBbMiwgMzNdLCA3NTogWzIsIDMzXSwgNzY6IFsyLCAzM10sIDc3OiBbMiwgMzNdLCA3ODogWzIsIDMzXSwgNzk6IFsyLCAzM10gfSwgeyAyMTogWzIsIDM0XSwgMzE6IFsyLCAzNF0sIDUyOiBbMiwgMzRdLCA1OTogWzIsIDM0XSwgNjI6IFsyLCAzNF0sIDY2OiBbMiwgMzRdLCA2OTogWzIsIDM0XSwgNzQ6IFsyLCAzNF0sIDc1OiBbMiwgMzRdLCA3NjogWzIsIDM0XSwgNzc6IFsyLCAzNF0sIDc4OiBbMiwgMzRdLCA3OTogWzIsIDM0XSB9LCB7IDIxOiBbMiwgMzVdLCAzMTogWzIsIDM1XSwgNTI6IFsyLCAzNV0sIDU5OiBbMiwgMzVdLCA2MjogWzIsIDM1XSwgNjY6IFsyLCAzNV0sIDY5OiBbMiwgMzVdLCA3NDogWzIsIDM1XSwgNzU6IFsyLCAzNV0sIDc2OiBbMiwgMzVdLCA3NzogWzIsIDM1XSwgNzg6IFsyLCAzNV0sIDc5OiBbMiwgMzVdIH0sIHsgMjE6IFsyLCAzNl0sIDMxOiBbMiwgMzZdLCA1MjogWzIsIDM2XSwgNTk6IFsyLCAzNl0sIDYyOiBbMiwgMzZdLCA2NjogWzIsIDM2XSwgNjk6IFsyLCAzNl0sIDc0OiBbMiwgMzZdLCA3NTogWzIsIDM2XSwgNzY6IFsyLCAzNl0sIDc3OiBbMiwgMzZdLCA3ODogWzIsIDM2XSwgNzk6IFsyLCAzNl0gfSwgeyAyMTogWzIsIDQwXSwgMzE6IFsyLCA0MF0sIDUyOiBbMiwgNDBdLCA1OTogWzIsIDQwXSwgNjI6IFsyLCA0MF0sIDY2OiBbMiwgNDBdLCA2OTogWzIsIDQwXSwgNzQ6IFsyLCA0MF0sIDc1OiBbMiwgNDBdLCA3NjogWzIsIDQwXSwgNzc6IFsyLCA0MF0sIDc4OiBbMiwgNDBdLCA3OTogWzIsIDQwXSwgODE6IFsxLCA0NV0gfSwgeyA2NjogWzEsIDMyXSwgODA6IDQ2IH0sIHsgMjE6IFsyLCA0Ml0sIDMxOiBbMiwgNDJdLCA1MjogWzIsIDQyXSwgNTk6IFsyLCA0Ml0sIDYyOiBbMiwgNDJdLCA2NjogWzIsIDQyXSwgNjk6IFsyLCA0Ml0sIDc0OiBbMiwgNDJdLCA3NTogWzIsIDQyXSwgNzY6IFsyLCA0Ml0sIDc3OiBbMiwgNDJdLCA3ODogWzIsIDQyXSwgNzk6IFsyLCA0Ml0sIDgxOiBbMiwgNDJdIH0sIHsgNTA6IDQ3LCA1MjogWzIsIDc3XSwgNTk6IFsyLCA3N10sIDY2OiBbMiwgNzddLCA3NDogWzIsIDc3XSwgNzU6IFsyLCA3N10sIDc2OiBbMiwgNzddLCA3NzogWzIsIDc3XSwgNzg6IFsyLCA3N10sIDc5OiBbMiwgNzddIH0sIHsgMjM6IDQ4LCAzNjogNTAsIDM3OiBbMSwgNTJdLCA0MTogNTEsIDQyOiBbMSwgNTNdLCA0MzogNDksIDQ1OiBbMiwgNDldIH0sIHsgMjY6IDU0LCA0MTogNTUsIDQyOiBbMSwgNTNdLCA0NTogWzIsIDUxXSB9LCB7IDE2OiBbMSwgNTZdIH0sIHsgMzE6IFsyLCA4MV0sIDU1OiA1NywgNTk6IFsyLCA4MV0sIDY2OiBbMiwgODFdLCA3NDogWzIsIDgxXSwgNzU6IFsyLCA4MV0sIDc2OiBbMiwgODFdLCA3NzogWzIsIDgxXSwgNzg6IFsyLCA4MV0sIDc5OiBbMiwgODFdIH0sIHsgMzE6IFsyLCAzN10sIDU5OiBbMiwgMzddLCA2NjogWzIsIDM3XSwgNzQ6IFsyLCAzN10sIDc1OiBbMiwgMzddLCA3NjogWzIsIDM3XSwgNzc6IFsyLCAzN10sIDc4OiBbMiwgMzddLCA3OTogWzIsIDM3XSB9LCB7IDMxOiBbMiwgMzhdLCA1OTogWzIsIDM4XSwgNjY6IFsyLCAzOF0sIDc0OiBbMiwgMzhdLCA3NTogWzIsIDM4XSwgNzY6IFsyLCAzOF0sIDc3OiBbMiwgMzhdLCA3ODogWzIsIDM4XSwgNzk6IFsyLCAzOF0gfSwgeyAxODogNTgsIDY2OiBbMSwgMzJdLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgMjg6IDU5LCAzMTogWzIsIDUzXSwgNTk6IFsyLCA1M10sIDY2OiBbMiwgNTNdLCA2OTogWzIsIDUzXSwgNzQ6IFsyLCA1M10sIDc1OiBbMiwgNTNdLCA3NjogWzIsIDUzXSwgNzc6IFsyLCA1M10sIDc4OiBbMiwgNTNdLCA3OTogWzIsIDUzXSB9LCB7IDMxOiBbMiwgNTldLCAzMzogNjAsIDU5OiBbMiwgNTldLCA2NjogWzIsIDU5XSwgNjk6IFsyLCA1OV0sIDc0OiBbMiwgNTldLCA3NTogWzIsIDU5XSwgNzY6IFsyLCA1OV0sIDc3OiBbMiwgNTldLCA3ODogWzIsIDU5XSwgNzk6IFsyLCA1OV0gfSwgeyAxOTogNjEsIDIxOiBbMiwgNDVdLCA1OTogWzIsIDQ1XSwgNjY6IFsyLCA0NV0sIDc0OiBbMiwgNDVdLCA3NTogWzIsIDQ1XSwgNzY6IFsyLCA0NV0sIDc3OiBbMiwgNDVdLCA3ODogWzIsIDQ1XSwgNzk6IFsyLCA0NV0gfSwgeyAxODogNjUsIDMxOiBbMiwgNzVdLCA0ODogNjIsIDU3OiA2MywgNTg6IDY2LCA1OTogWzEsIDQwXSwgNjM6IDY0LCA2NDogNjcsIDY1OiA2OCwgNjY6IFsxLCA2OV0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyA2NjogWzEsIDcwXSB9LCB7IDIxOiBbMiwgMzldLCAzMTogWzIsIDM5XSwgNTI6IFsyLCAzOV0sIDU5OiBbMiwgMzldLCA2MjogWzIsIDM5XSwgNjY6IFsyLCAzOV0sIDY5OiBbMiwgMzldLCA3NDogWzIsIDM5XSwgNzU6IFsyLCAzOV0sIDc2OiBbMiwgMzldLCA3NzogWzIsIDM5XSwgNzg6IFsyLCAzOV0sIDc5OiBbMiwgMzldLCA4MTogWzEsIDQ1XSB9LCB7IDE4OiA2NSwgNTE6IDcxLCA1MjogWzIsIDc5XSwgNTc6IDcyLCA1ODogNjYsIDU5OiBbMSwgNDBdLCA2MzogNzMsIDY0OiA2NywgNjU6IDY4LCA2NjogWzEsIDY5XSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDI0OiA3NCwgNDU6IFsxLCA3NV0gfSwgeyA0NTogWzIsIDUwXSB9LCB7IDQ6IDc2LCA2OiAzLCAxMzogWzIsIDQzXSwgMTQ6IFsyLCA0M10sIDE3OiBbMiwgNDNdLCAyNzogWzIsIDQzXSwgMzI6IFsyLCA0M10sIDM3OiBbMiwgNDNdLCA0MjogWzIsIDQzXSwgNDU6IFsyLCA0M10sIDQ2OiBbMiwgNDNdLCA0OTogWzIsIDQzXSwgNTM6IFsyLCA0M10gfSwgeyA0NTogWzIsIDE5XSB9LCB7IDE4OiA3NywgNjY6IFsxLCAzMl0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyA0OiA3OCwgNjogMywgMTM6IFsyLCA0M10sIDE0OiBbMiwgNDNdLCAxNzogWzIsIDQzXSwgMjc6IFsyLCA0M10sIDMyOiBbMiwgNDNdLCA0NTogWzIsIDQzXSwgNDY6IFsyLCA0M10sIDQ5OiBbMiwgNDNdLCA1MzogWzIsIDQzXSB9LCB7IDI0OiA3OSwgNDU6IFsxLCA3NV0gfSwgeyA0NTogWzIsIDUyXSB9LCB7IDU6IFsyLCAxMF0sIDEzOiBbMiwgMTBdLCAxNDogWzIsIDEwXSwgMTc6IFsyLCAxMF0sIDI3OiBbMiwgMTBdLCAzMjogWzIsIDEwXSwgMzc6IFsyLCAxMF0sIDQyOiBbMiwgMTBdLCA0NTogWzIsIDEwXSwgNDY6IFsyLCAxMF0sIDQ5OiBbMiwgMTBdLCA1MzogWzIsIDEwXSB9LCB7IDE4OiA2NSwgMzE6IFsyLCA4M10sIDU2OiA4MCwgNTc6IDgxLCA1ODogNjYsIDU5OiBbMSwgNDBdLCA2MzogODIsIDY0OiA2NywgNjU6IDY4LCA2NjogWzEsIDY5XSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDU5OiBbMiwgODVdLCA2MDogODMsIDYyOiBbMiwgODVdLCA2NjogWzIsIDg1XSwgNzQ6IFsyLCA4NV0sIDc1OiBbMiwgODVdLCA3NjogWzIsIDg1XSwgNzc6IFsyLCA4NV0sIDc4OiBbMiwgODVdLCA3OTogWzIsIDg1XSB9LCB7IDE4OiA2NSwgMjk6IDg0LCAzMTogWzIsIDU1XSwgNTc6IDg1LCA1ODogNjYsIDU5OiBbMSwgNDBdLCA2MzogODYsIDY0OiA2NywgNjU6IDY4LCA2NjogWzEsIDY5XSwgNjk6IFsyLCA1NV0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyAxODogNjUsIDMxOiBbMiwgNjFdLCAzNDogODcsIDU3OiA4OCwgNTg6IDY2LCA1OTogWzEsIDQwXSwgNjM6IDg5LCA2NDogNjcsIDY1OiA2OCwgNjY6IFsxLCA2OV0sIDY5OiBbMiwgNjFdLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgMTg6IDY1LCAyMDogOTAsIDIxOiBbMiwgNDddLCA1NzogOTEsIDU4OiA2NiwgNTk6IFsxLCA0MF0sIDYzOiA5MiwgNjQ6IDY3LCA2NTogNjgsIDY2OiBbMSwgNjldLCA3MjogMjMsIDczOiAyNCwgNzQ6IFsxLCAyNV0sIDc1OiBbMSwgMjZdLCA3NjogWzEsIDI3XSwgNzc6IFsxLCAyOF0sIDc4OiBbMSwgMjldLCA3OTogWzEsIDMxXSwgODA6IDMwIH0sIHsgMzE6IFsxLCA5M10gfSwgeyAzMTogWzIsIDc0XSwgNTk6IFsyLCA3NF0sIDY2OiBbMiwgNzRdLCA3NDogWzIsIDc0XSwgNzU6IFsyLCA3NF0sIDc2OiBbMiwgNzRdLCA3NzogWzIsIDc0XSwgNzg6IFsyLCA3NF0sIDc5OiBbMiwgNzRdIH0sIHsgMzE6IFsyLCA3Nl0gfSwgeyAyMTogWzIsIDI0XSwgMzE6IFsyLCAyNF0sIDUyOiBbMiwgMjRdLCA1OTogWzIsIDI0XSwgNjI6IFsyLCAyNF0sIDY2OiBbMiwgMjRdLCA2OTogWzIsIDI0XSwgNzQ6IFsyLCAyNF0sIDc1OiBbMiwgMjRdLCA3NjogWzIsIDI0XSwgNzc6IFsyLCAyNF0sIDc4OiBbMiwgMjRdLCA3OTogWzIsIDI0XSB9LCB7IDIxOiBbMiwgMjVdLCAzMTogWzIsIDI1XSwgNTI6IFsyLCAyNV0sIDU5OiBbMiwgMjVdLCA2MjogWzIsIDI1XSwgNjY6IFsyLCAyNV0sIDY5OiBbMiwgMjVdLCA3NDogWzIsIDI1XSwgNzU6IFsyLCAyNV0sIDc2OiBbMiwgMjVdLCA3NzogWzIsIDI1XSwgNzg6IFsyLCAyNV0sIDc5OiBbMiwgMjVdIH0sIHsgMjE6IFsyLCAyN10sIDMxOiBbMiwgMjddLCA1MjogWzIsIDI3XSwgNjI6IFsyLCAyN10sIDY1OiA5NCwgNjY6IFsxLCA5NV0sIDY5OiBbMiwgMjddIH0sIHsgMjE6IFsyLCA4OV0sIDMxOiBbMiwgODldLCA1MjogWzIsIDg5XSwgNjI6IFsyLCA4OV0sIDY2OiBbMiwgODldLCA2OTogWzIsIDg5XSB9LCB7IDIxOiBbMiwgNDJdLCAzMTogWzIsIDQyXSwgNTI6IFsyLCA0Ml0sIDU5OiBbMiwgNDJdLCA2MjogWzIsIDQyXSwgNjY6IFsyLCA0Ml0sIDY3OiBbMSwgOTZdLCA2OTogWzIsIDQyXSwgNzQ6IFsyLCA0Ml0sIDc1OiBbMiwgNDJdLCA3NjogWzIsIDQyXSwgNzc6IFsyLCA0Ml0sIDc4OiBbMiwgNDJdLCA3OTogWzIsIDQyXSwgODE6IFsyLCA0Ml0gfSwgeyAyMTogWzIsIDQxXSwgMzE6IFsyLCA0MV0sIDUyOiBbMiwgNDFdLCA1OTogWzIsIDQxXSwgNjI6IFsyLCA0MV0sIDY2OiBbMiwgNDFdLCA2OTogWzIsIDQxXSwgNzQ6IFsyLCA0MV0sIDc1OiBbMiwgNDFdLCA3NjogWzIsIDQxXSwgNzc6IFsyLCA0MV0sIDc4OiBbMiwgNDFdLCA3OTogWzIsIDQxXSwgODE6IFsyLCA0MV0gfSwgeyA1MjogWzEsIDk3XSB9LCB7IDUyOiBbMiwgNzhdLCA1OTogWzIsIDc4XSwgNjY6IFsyLCA3OF0sIDc0OiBbMiwgNzhdLCA3NTogWzIsIDc4XSwgNzY6IFsyLCA3OF0sIDc3OiBbMiwgNzhdLCA3ODogWzIsIDc4XSwgNzk6IFsyLCA3OF0gfSwgeyA1MjogWzIsIDgwXSB9LCB7IDU6IFsyLCAxMl0sIDEzOiBbMiwgMTJdLCAxNDogWzIsIDEyXSwgMTc6IFsyLCAxMl0sIDI3OiBbMiwgMTJdLCAzMjogWzIsIDEyXSwgMzc6IFsyLCAxMl0sIDQyOiBbMiwgMTJdLCA0NTogWzIsIDEyXSwgNDY6IFsyLCAxMl0sIDQ5OiBbMiwgMTJdLCA1MzogWzIsIDEyXSB9LCB7IDE4OiA5OCwgNjY6IFsxLCAzMl0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyAzNjogNTAsIDM3OiBbMSwgNTJdLCA0MTogNTEsIDQyOiBbMSwgNTNdLCA0MzogMTAwLCA0NDogOTksIDQ1OiBbMiwgNzFdIH0sIHsgMzE6IFsyLCA2NV0sIDM4OiAxMDEsIDU5OiBbMiwgNjVdLCA2NjogWzIsIDY1XSwgNjk6IFsyLCA2NV0sIDc0OiBbMiwgNjVdLCA3NTogWzIsIDY1XSwgNzY6IFsyLCA2NV0sIDc3OiBbMiwgNjVdLCA3ODogWzIsIDY1XSwgNzk6IFsyLCA2NV0gfSwgeyA0NTogWzIsIDE3XSB9LCB7IDU6IFsyLCAxM10sIDEzOiBbMiwgMTNdLCAxNDogWzIsIDEzXSwgMTc6IFsyLCAxM10sIDI3OiBbMiwgMTNdLCAzMjogWzIsIDEzXSwgMzc6IFsyLCAxM10sIDQyOiBbMiwgMTNdLCA0NTogWzIsIDEzXSwgNDY6IFsyLCAxM10sIDQ5OiBbMiwgMTNdLCA1MzogWzIsIDEzXSB9LCB7IDMxOiBbMSwgMTAyXSB9LCB7IDMxOiBbMiwgODJdLCA1OTogWzIsIDgyXSwgNjY6IFsyLCA4Ml0sIDc0OiBbMiwgODJdLCA3NTogWzIsIDgyXSwgNzY6IFsyLCA4Ml0sIDc3OiBbMiwgODJdLCA3ODogWzIsIDgyXSwgNzk6IFsyLCA4Ml0gfSwgeyAzMTogWzIsIDg0XSB9LCB7IDE4OiA2NSwgNTc6IDEwNCwgNTg6IDY2LCA1OTogWzEsIDQwXSwgNjE6IDEwMywgNjI6IFsyLCA4N10sIDYzOiAxMDUsIDY0OiA2NywgNjU6IDY4LCA2NjogWzEsIDY5XSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDMwOiAxMDYsIDMxOiBbMiwgNTddLCA2ODogMTA3LCA2OTogWzEsIDEwOF0gfSwgeyAzMTogWzIsIDU0XSwgNTk6IFsyLCA1NF0sIDY2OiBbMiwgNTRdLCA2OTogWzIsIDU0XSwgNzQ6IFsyLCA1NF0sIDc1OiBbMiwgNTRdLCA3NjogWzIsIDU0XSwgNzc6IFsyLCA1NF0sIDc4OiBbMiwgNTRdLCA3OTogWzIsIDU0XSB9LCB7IDMxOiBbMiwgNTZdLCA2OTogWzIsIDU2XSB9LCB7IDMxOiBbMiwgNjNdLCAzNTogMTA5LCA2ODogMTEwLCA2OTogWzEsIDEwOF0gfSwgeyAzMTogWzIsIDYwXSwgNTk6IFsyLCA2MF0sIDY2OiBbMiwgNjBdLCA2OTogWzIsIDYwXSwgNzQ6IFsyLCA2MF0sIDc1OiBbMiwgNjBdLCA3NjogWzIsIDYwXSwgNzc6IFsyLCA2MF0sIDc4OiBbMiwgNjBdLCA3OTogWzIsIDYwXSB9LCB7IDMxOiBbMiwgNjJdLCA2OTogWzIsIDYyXSB9LCB7IDIxOiBbMSwgMTExXSB9LCB7IDIxOiBbMiwgNDZdLCA1OTogWzIsIDQ2XSwgNjY6IFsyLCA0Nl0sIDc0OiBbMiwgNDZdLCA3NTogWzIsIDQ2XSwgNzY6IFsyLCA0Nl0sIDc3OiBbMiwgNDZdLCA3ODogWzIsIDQ2XSwgNzk6IFsyLCA0Nl0gfSwgeyAyMTogWzIsIDQ4XSB9LCB7IDU6IFsyLCAyMV0sIDEzOiBbMiwgMjFdLCAxNDogWzIsIDIxXSwgMTc6IFsyLCAyMV0sIDI3OiBbMiwgMjFdLCAzMjogWzIsIDIxXSwgMzc6IFsyLCAyMV0sIDQyOiBbMiwgMjFdLCA0NTogWzIsIDIxXSwgNDY6IFsyLCAyMV0sIDQ5OiBbMiwgMjFdLCA1MzogWzIsIDIxXSB9LCB7IDIxOiBbMiwgOTBdLCAzMTogWzIsIDkwXSwgNTI6IFsyLCA5MF0sIDYyOiBbMiwgOTBdLCA2NjogWzIsIDkwXSwgNjk6IFsyLCA5MF0gfSwgeyA2NzogWzEsIDk2XSB9LCB7IDE4OiA2NSwgNTc6IDExMiwgNTg6IDY2LCA1OTogWzEsIDQwXSwgNjY6IFsxLCAzMl0sIDcyOiAyMywgNzM6IDI0LCA3NDogWzEsIDI1XSwgNzU6IFsxLCAyNl0sIDc2OiBbMSwgMjddLCA3NzogWzEsIDI4XSwgNzg6IFsxLCAyOV0sIDc5OiBbMSwgMzFdLCA4MDogMzAgfSwgeyA1OiBbMiwgMjJdLCAxMzogWzIsIDIyXSwgMTQ6IFsyLCAyMl0sIDE3OiBbMiwgMjJdLCAyNzogWzIsIDIyXSwgMzI6IFsyLCAyMl0sIDM3OiBbMiwgMjJdLCA0MjogWzIsIDIyXSwgNDU6IFsyLCAyMl0sIDQ2OiBbMiwgMjJdLCA0OTogWzIsIDIyXSwgNTM6IFsyLCAyMl0gfSwgeyAzMTogWzEsIDExM10gfSwgeyA0NTogWzIsIDE4XSB9LCB7IDQ1OiBbMiwgNzJdIH0sIHsgMTg6IDY1LCAzMTogWzIsIDY3XSwgMzk6IDExNCwgNTc6IDExNSwgNTg6IDY2LCA1OTogWzEsIDQwXSwgNjM6IDExNiwgNjQ6IDY3LCA2NTogNjgsIDY2OiBbMSwgNjldLCA2OTogWzIsIDY3XSwgNzI6IDIzLCA3MzogMjQsIDc0OiBbMSwgMjVdLCA3NTogWzEsIDI2XSwgNzY6IFsxLCAyN10sIDc3OiBbMSwgMjhdLCA3ODogWzEsIDI5XSwgNzk6IFsxLCAzMV0sIDgwOiAzMCB9LCB7IDU6IFsyLCAyM10sIDEzOiBbMiwgMjNdLCAxNDogWzIsIDIzXSwgMTc6IFsyLCAyM10sIDI3OiBbMiwgMjNdLCAzMjogWzIsIDIzXSwgMzc6IFsyLCAyM10sIDQyOiBbMiwgMjNdLCA0NTogWzIsIDIzXSwgNDY6IFsyLCAyM10sIDQ5OiBbMiwgMjNdLCA1MzogWzIsIDIzXSB9LCB7IDYyOiBbMSwgMTE3XSB9LCB7IDU5OiBbMiwgODZdLCA2MjogWzIsIDg2XSwgNjY6IFsyLCA4Nl0sIDc0OiBbMiwgODZdLCA3NTogWzIsIDg2XSwgNzY6IFsyLCA4Nl0sIDc3OiBbMiwgODZdLCA3ODogWzIsIDg2XSwgNzk6IFsyLCA4Nl0gfSwgeyA2MjogWzIsIDg4XSB9LCB7IDMxOiBbMSwgMTE4XSB9LCB7IDMxOiBbMiwgNThdIH0sIHsgNjY6IFsxLCAxMjBdLCA3MDogMTE5IH0sIHsgMzE6IFsxLCAxMjFdIH0sIHsgMzE6IFsyLCA2NF0gfSwgeyAxNDogWzIsIDExXSB9LCB7IDIxOiBbMiwgMjhdLCAzMTogWzIsIDI4XSwgNTI6IFsyLCAyOF0sIDYyOiBbMiwgMjhdLCA2NjogWzIsIDI4XSwgNjk6IFsyLCAyOF0gfSwgeyA1OiBbMiwgMjBdLCAxMzogWzIsIDIwXSwgMTQ6IFsyLCAyMF0sIDE3OiBbMiwgMjBdLCAyNzogWzIsIDIwXSwgMzI6IFsyLCAyMF0sIDM3OiBbMiwgMjBdLCA0MjogWzIsIDIwXSwgNDU6IFsyLCAyMF0sIDQ2OiBbMiwgMjBdLCA0OTogWzIsIDIwXSwgNTM6IFsyLCAyMF0gfSwgeyAzMTogWzIsIDY5XSwgNDA6IDEyMiwgNjg6IDEyMywgNjk6IFsxLCAxMDhdIH0sIHsgMzE6IFsyLCA2Nl0sIDU5OiBbMiwgNjZdLCA2NjogWzIsIDY2XSwgNjk6IFsyLCA2Nl0sIDc0OiBbMiwgNjZdLCA3NTogWzIsIDY2XSwgNzY6IFsyLCA2Nl0sIDc3OiBbMiwgNjZdLCA3ODogWzIsIDY2XSwgNzk6IFsyLCA2Nl0gfSwgeyAzMTogWzIsIDY4XSwgNjk6IFsyLCA2OF0gfSwgeyAyMTogWzIsIDI2XSwgMzE6IFsyLCAyNl0sIDUyOiBbMiwgMjZdLCA1OTogWzIsIDI2XSwgNjI6IFsyLCAyNl0sIDY2OiBbMiwgMjZdLCA2OTogWzIsIDI2XSwgNzQ6IFsyLCAyNl0sIDc1OiBbMiwgMjZdLCA3NjogWzIsIDI2XSwgNzc6IFsyLCAyNl0sIDc4OiBbMiwgMjZdLCA3OTogWzIsIDI2XSB9LCB7IDEzOiBbMiwgMTRdLCAxNDogWzIsIDE0XSwgMTc6IFsyLCAxNF0sIDI3OiBbMiwgMTRdLCAzMjogWzIsIDE0XSwgMzc6IFsyLCAxNF0sIDQyOiBbMiwgMTRdLCA0NTogWzIsIDE0XSwgNDY6IFsyLCAxNF0sIDQ5OiBbMiwgMTRdLCA1MzogWzIsIDE0XSB9LCB7IDY2OiBbMSwgMTI1XSwgNzE6IFsxLCAxMjRdIH0sIHsgNjY6IFsyLCA5MV0sIDcxOiBbMiwgOTFdIH0sIHsgMTM6IFsyLCAxNV0sIDE0OiBbMiwgMTVdLCAxNzogWzIsIDE1XSwgMjc6IFsyLCAxNV0sIDMyOiBbMiwgMTVdLCA0MjogWzIsIDE1XSwgNDU6IFsyLCAxNV0sIDQ2OiBbMiwgMTVdLCA0OTogWzIsIDE1XSwgNTM6IFsyLCAxNV0gfSwgeyAzMTogWzEsIDEyNl0gfSwgeyAzMTogWzIsIDcwXSB9LCB7IDMxOiBbMiwgMjldIH0sIHsgNjY6IFsyLCA5Ml0sIDcxOiBbMiwgOTJdIH0sIHsgMTM6IFsyLCAxNl0sIDE0OiBbMiwgMTZdLCAxNzogWzIsIDE2XSwgMjc6IFsyLCAxNl0sIDMyOiBbMiwgMTZdLCAzNzogWzIsIDE2XSwgNDI6IFsyLCAxNl0sIDQ1OiBbMiwgMTZdLCA0NjogWzIsIDE2XSwgNDk6IFsyLCAxNl0sIDUzOiBbMiwgMTZdIH1dLFxuICAgICAgICBkZWZhdWx0QWN0aW9uczogeyA0OiBbMiwgMV0sIDQ5OiBbMiwgNTBdLCA1MTogWzIsIDE5XSwgNTU6IFsyLCA1Ml0sIDY0OiBbMiwgNzZdLCA3MzogWzIsIDgwXSwgNzg6IFsyLCAxN10sIDgyOiBbMiwgODRdLCA5MjogWzIsIDQ4XSwgOTk6IFsyLCAxOF0sIDEwMDogWzIsIDcyXSwgMTA1OiBbMiwgODhdLCAxMDc6IFsyLCA1OF0sIDExMDogWzIsIDY0XSwgMTExOiBbMiwgMTFdLCAxMjM6IFsyLCA3MF0sIDEyNDogWzIsIDI5XSB9LFxuICAgICAgICBwYXJzZUVycm9yOiBmdW5jdGlvbiBwYXJzZUVycm9yKHN0ciwgaGFzaCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHN0cik7XG4gICAgICAgIH0sXG4gICAgICAgIHBhcnNlOiBmdW5jdGlvbiBwYXJzZShpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgICAgIHN0YWNrID0gWzBdLFxuICAgICAgICAgICAgICAgIHZzdGFjayA9IFtudWxsXSxcbiAgICAgICAgICAgICAgICBsc3RhY2sgPSBbXSxcbiAgICAgICAgICAgICAgICB0YWJsZSA9IHRoaXMudGFibGUsXG4gICAgICAgICAgICAgICAgeXl0ZXh0ID0gXCJcIixcbiAgICAgICAgICAgICAgICB5eWxpbmVubyA9IDAsXG4gICAgICAgICAgICAgICAgeXlsZW5nID0gMCxcbiAgICAgICAgICAgICAgICByZWNvdmVyaW5nID0gMCxcbiAgICAgICAgICAgICAgICBURVJST1IgPSAyLFxuICAgICAgICAgICAgICAgIEVPRiA9IDE7XG4gICAgICAgICAgICB0aGlzLmxleGVyLnNldElucHV0KGlucHV0KTtcbiAgICAgICAgICAgIHRoaXMubGV4ZXIueXkgPSB0aGlzLnl5O1xuICAgICAgICAgICAgdGhpcy55eS5sZXhlciA9IHRoaXMubGV4ZXI7XG4gICAgICAgICAgICB0aGlzLnl5LnBhcnNlciA9IHRoaXM7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMubGV4ZXIueXlsbG9jID09IFwidW5kZWZpbmVkXCIpIHRoaXMubGV4ZXIueXlsbG9jID0ge307XG4gICAgICAgICAgICB2YXIgeXlsb2MgPSB0aGlzLmxleGVyLnl5bGxvYztcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHl5bG9jKTtcbiAgICAgICAgICAgIHZhciByYW5nZXMgPSB0aGlzLmxleGVyLm9wdGlvbnMgJiYgdGhpcy5sZXhlci5vcHRpb25zLnJhbmdlcztcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy55eS5wYXJzZUVycm9yID09PSBcImZ1bmN0aW9uXCIpIHRoaXMucGFyc2VFcnJvciA9IHRoaXMueXkucGFyc2VFcnJvcjtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHBvcFN0YWNrKG4pIHtcbiAgICAgICAgICAgICAgICBzdGFjay5sZW5ndGggPSBzdGFjay5sZW5ndGggLSAyICogbjtcbiAgICAgICAgICAgICAgICB2c3RhY2subGVuZ3RoID0gdnN0YWNrLmxlbmd0aCAtIG47XG4gICAgICAgICAgICAgICAgbHN0YWNrLmxlbmd0aCA9IGxzdGFjay5sZW5ndGggLSBuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnVuY3Rpb24gbGV4KCkge1xuICAgICAgICAgICAgICAgIHZhciB0b2tlbjtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IHNlbGYubGV4ZXIubGV4KCkgfHwgMTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuID0gc2VsZi5zeW1ib2xzX1t0b2tlbl0gfHwgdG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzeW1ib2wsXG4gICAgICAgICAgICAgICAgcHJlRXJyb3JTeW1ib2wsXG4gICAgICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICAgICAgYWN0aW9uLFxuICAgICAgICAgICAgICAgIGEsXG4gICAgICAgICAgICAgICAgcixcbiAgICAgICAgICAgICAgICB5eXZhbCA9IHt9LFxuICAgICAgICAgICAgICAgIHAsXG4gICAgICAgICAgICAgICAgbGVuLFxuICAgICAgICAgICAgICAgIG5ld1N0YXRlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkO1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlZmF1bHRBY3Rpb25zW3N0YXRlXSkge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSB0aGlzLmRlZmF1bHRBY3Rpb25zW3N0YXRlXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHR5cGVvZiBzeW1ib2wgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ltYm9sID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gdGFibGVbc3RhdGVdICYmIHRhYmxlW3N0YXRlXVtzeW1ib2xdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhYWN0aW9uLmxlbmd0aCB8fCAhYWN0aW9uWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnJTdHIgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlY292ZXJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHAgaW4gdGFibGVbc3RhdGVdKSBpZiAodGhpcy50ZXJtaW5hbHNfW3BdICYmIHAgPiAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQucHVzaChcIidcIiArIHRoaXMudGVybWluYWxzX1twXSArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxleGVyLnNob3dQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyclN0ciA9IFwiUGFyc2UgZXJyb3Igb24gbGluZSBcIiArICh5eWxpbmVubyArIDEpICsgXCI6XFxuXCIgKyB0aGlzLmxleGVyLnNob3dQb3NpdGlvbigpICsgXCJcXG5FeHBlY3RpbmcgXCIgKyBleHBlY3RlZC5qb2luKFwiLCBcIikgKyBcIiwgZ290ICdcIiArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgXCInXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyclN0ciA9IFwiUGFyc2UgZXJyb3Igb24gbGluZSBcIiArICh5eWxpbmVubyArIDEpICsgXCI6IFVuZXhwZWN0ZWQgXCIgKyAoc3ltYm9sID09IDEgPyBcImVuZCBvZiBpbnB1dFwiIDogXCInXCIgKyAodGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sKSArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyc2VFcnJvcihlcnJTdHIsIHsgdGV4dDogdGhpcy5sZXhlci5tYXRjaCwgdG9rZW46IHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCwgbGluZTogdGhpcy5sZXhlci55eWxpbmVubywgbG9jOiB5eWxvYywgZXhwZWN0ZWQ6IGV4cGVjdGVkIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhY3Rpb25bMF0gaW5zdGFuY2VvZiBBcnJheSAmJiBhY3Rpb24ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQYXJzZSBFcnJvcjogbXVsdGlwbGUgYWN0aW9ucyBwb3NzaWJsZSBhdCBzdGF0ZTogXCIgKyBzdGF0ZSArIFwiLCB0b2tlbjogXCIgKyBzeW1ib2wpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFjdGlvblswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHN5bWJvbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2c3RhY2sucHVzaCh0aGlzLmxleGVyLnl5dGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsc3RhY2sucHVzaCh0aGlzLmxleGVyLnl5bGxvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGFjdGlvblsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzeW1ib2wgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmVFcnJvclN5bWJvbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHl5bGVuZyA9IHRoaXMubGV4ZXIueXlsZW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHl5dGV4dCA9IHRoaXMubGV4ZXIueXl0ZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHl5bGluZW5vID0gdGhpcy5sZXhlci55eWxpbmVubztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5eWxvYyA9IHRoaXMubGV4ZXIueXlsbG9jO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyaW5nID4gMCkgcmVjb3ZlcmluZy0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzeW1ib2wgPSBwcmVFcnJvclN5bWJvbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVFcnJvclN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICAgICAgbGVuID0gdGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHl5dmFsLiQgPSB2c3RhY2tbdnN0YWNrLmxlbmd0aCAtIGxlbl07XG4gICAgICAgICAgICAgICAgICAgICAgICB5eXZhbC5fJCA9IHsgZmlyc3RfbGluZTogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5maXJzdF9saW5lLCBsYXN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9saW5lLCBmaXJzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfY29sdW1uLCBsYXN0X2NvbHVtbjogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5sYXN0X2NvbHVtbiB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJhbmdlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHl5dmFsLl8kLnJhbmdlID0gW2xzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0ucmFuZ2VbMF0sIGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ucmFuZ2VbMV1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgciA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHl5dmFsLCB5eXRleHQsIHl5bGVuZywgeXlsaW5lbm8sIHRoaXMueXksIGFjdGlvblsxXSwgdnN0YWNrLCBsc3RhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sgPSBzdGFjay5zbGljZSgwLCAtMSAqIGxlbiAqIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZzdGFjayA9IHZzdGFjay5zbGljZSgwLCAtMSAqIGxlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbHN0YWNrID0gbHN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2c3RhY2sucHVzaCh5eXZhbC4kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxzdGFjay5wdXNoKHl5dmFsLl8kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1N0YXRlID0gdGFibGVbc3RhY2tbc3RhY2subGVuZ3RoIC0gMl1dW3N0YWNrW3N0YWNrLmxlbmd0aCAtIDFdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2gobmV3U3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvKiBKaXNvbiBnZW5lcmF0ZWQgbGV4ZXIgKi9cbiAgICB2YXIgbGV4ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbGV4ZXIgPSB7IEVPRjogMSxcbiAgICAgICAgICAgIHBhcnNlRXJyb3I6IGZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMueXkucGFyc2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMueXkucGFyc2VyLnBhcnNlRXJyb3Ioc3RyLCBoYXNoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3RyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0SW5wdXQ6IGZ1bmN0aW9uIHNldElucHV0KGlucHV0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faW5wdXQgPSBpbnB1dDtcbiAgICAgICAgICAgICAgICB0aGlzLl9tb3JlID0gdGhpcy5fbGVzcyA9IHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMueXlsaW5lbm8gPSB0aGlzLnl5bGVuZyA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLm1hdGNoZWQgPSB0aGlzLm1hdGNoID0gXCJcIjtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrID0gW1wiSU5JVElBTFwiXTtcbiAgICAgICAgICAgICAgICB0aGlzLnl5bGxvYyA9IHsgZmlyc3RfbGluZTogMSwgZmlyc3RfY29sdW1uOiAwLCBsYXN0X2xpbmU6IDEsIGxhc3RfY29sdW1uOiAwIH07XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHRoaXMueXlsbG9jLnJhbmdlID0gWzAsIDBdO1xuICAgICAgICAgICAgICAgIHRoaXMub2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbnB1dDogZnVuY3Rpb24gaW5wdXQoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoID0gdGhpcy5faW5wdXRbMF07XG4gICAgICAgICAgICAgICAgdGhpcy55eXRleHQgKz0gY2g7XG4gICAgICAgICAgICAgICAgdGhpcy55eWxlbmcrKztcbiAgICAgICAgICAgICAgICB0aGlzLm9mZnNldCsrO1xuICAgICAgICAgICAgICAgIHRoaXMubWF0Y2ggKz0gY2g7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXRjaGVkICs9IGNoO1xuICAgICAgICAgICAgICAgIHZhciBsaW5lcyA9IGNoLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgICAgICAgICBpZiAobGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy55eWxpbmVubysrO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2xpbmUrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbisrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykgdGhpcy55eWxsb2MucmFuZ2VbMV0rKztcblxuICAgICAgICAgICAgICAgIHRoaXMuX2lucHV0ID0gdGhpcy5faW5wdXQuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVucHV0OiBmdW5jdGlvbiB1bnB1dChjaCkge1xuICAgICAgICAgICAgICAgIHZhciBsZW4gPSBjaC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgdmFyIGxpbmVzID0gY2guc3BsaXQoLyg/Olxcclxcbj98XFxuKS9nKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX2lucHV0ID0gY2ggKyB0aGlzLl9pbnB1dDtcbiAgICAgICAgICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMueXl0ZXh0LnN1YnN0cigwLCB0aGlzLnl5dGV4dC5sZW5ndGggLSBsZW4gLSAxKTtcbiAgICAgICAgICAgICAgICAvL3RoaXMueXlsZW5nIC09IGxlbjtcbiAgICAgICAgICAgICAgICB0aGlzLm9mZnNldCAtPSBsZW47XG4gICAgICAgICAgICAgICAgdmFyIG9sZExpbmVzID0gdGhpcy5tYXRjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuICAgICAgICAgICAgICAgIHRoaXMubWF0Y2ggPSB0aGlzLm1hdGNoLnN1YnN0cigwLCB0aGlzLm1hdGNoLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgIHRoaXMubWF0Y2hlZCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aCAtIDEpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCAtIDEpIHRoaXMueXlsaW5lbm8gLT0gbGluZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICB2YXIgciA9IHRoaXMueXlsbG9jLnJhbmdlO1xuXG4gICAgICAgICAgICAgICAgdGhpcy55eWxsb2MgPSB7IGZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmZpcnN0X2xpbmUsXG4gICAgICAgICAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubyArIDEsXG4gICAgICAgICAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICBsYXN0X2NvbHVtbjogbGluZXMgPyAobGluZXMubGVuZ3RoID09PSBvbGRMaW5lcy5sZW5ndGggPyB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4gOiAwKSArIG9sZExpbmVzW29sZExpbmVzLmxlbmd0aCAtIGxpbmVzLmxlbmd0aF0ubGVuZ3RoIC0gbGluZXNbMF0ubGVuZ3RoIDogdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIC0gbGVuXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3JbMF0sIHJbMF0gKyB0aGlzLnl5bGVuZyAtIGxlbl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1vcmU6IGZ1bmN0aW9uIG1vcmUoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbW9yZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGVzczogZnVuY3Rpb24gbGVzcyhuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bnB1dCh0aGlzLm1hdGNoLnNsaWNlKG4pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYXN0SW5wdXQ6IGZ1bmN0aW9uIHBhc3RJbnB1dCgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFzdCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aCAtIHRoaXMubWF0Y2gubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHBhc3QubGVuZ3RoID4gMjAgPyBcIi4uLlwiIDogXCJcIikgKyBwYXN0LnN1YnN0cigtMjApLnJlcGxhY2UoL1xcbi9nLCBcIlwiKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cGNvbWluZ0lucHV0OiBmdW5jdGlvbiB1cGNvbWluZ0lucHV0KCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gdGhpcy5tYXRjaDtcbiAgICAgICAgICAgICAgICBpZiAobmV4dC5sZW5ndGggPCAyMCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0ICs9IHRoaXMuX2lucHV0LnN1YnN0cigwLCAyMCAtIG5leHQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIChuZXh0LnN1YnN0cigwLCAyMCkgKyAobmV4dC5sZW5ndGggPiAyMCA/IFwiLi4uXCIgOiBcIlwiKSkucmVwbGFjZSgvXFxuL2csIFwiXCIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNob3dQb3NpdGlvbjogZnVuY3Rpb24gc2hvd1Bvc2l0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBwcmUgPSB0aGlzLnBhc3RJbnB1dCgpO1xuICAgICAgICAgICAgICAgIHZhciBjID0gbmV3IEFycmF5KHByZS5sZW5ndGggKyAxKS5qb2luKFwiLVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJlICsgdGhpcy51cGNvbWluZ0lucHV0KCkgKyBcIlxcblwiICsgYyArIFwiXlwiO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5FT0Y7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5faW5wdXQpIHRoaXMuZG9uZSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgdG9rZW4sIG1hdGNoLCB0ZW1wTWF0Y2gsIGluZGV4LCBjb2wsIGxpbmVzO1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fbW9yZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnl5dGV4dCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF0Y2ggPSBcIlwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcnVsZXMgPSB0aGlzLl9jdXJyZW50UnVsZXMoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRlbXBNYXRjaCA9IHRoaXMuX2lucHV0Lm1hdGNoKHRoaXMucnVsZXNbcnVsZXNbaV1dKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBNYXRjaCAmJiAoIW1hdGNoIHx8IHRlbXBNYXRjaFswXS5sZW5ndGggPiBtYXRjaFswXS5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaCA9IHRlbXBNYXRjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmZsZXgpIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBsaW5lcyA9IG1hdGNoWzBdLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmVzKSB0aGlzLnl5bGluZW5vICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy55eWxsb2MgPSB7IGZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmxhc3RfbGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubyArIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF9jb2x1bW46IGxpbmVzID8gbGluZXNbbGluZXMubGVuZ3RoIC0gMV0ubGVuZ3RoIC0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV0ubWF0Y2goL1xccj9cXG4/LylbMF0ubGVuZ3RoIDogdGhpcy55eWxsb2MubGFzdF9jb2x1bW4gKyBtYXRjaFswXS5sZW5ndGggfTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy55eXRleHQgKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF0Y2ggKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF0Y2hlcyA9IG1hdGNoO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnl5bGVuZyA9IHRoaXMueXl0ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3RoaXMub2Zmc2V0LCB0aGlzLm9mZnNldCArPSB0aGlzLnl5bGVuZ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbW9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pbnB1dCA9IHRoaXMuX2lucHV0LnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF0Y2hlZCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSB0aGlzLnBlcmZvcm1BY3Rpb24uY2FsbCh0aGlzLCB0aGlzLnl5LCB0aGlzLCBydWxlc1tpbmRleF0sIHRoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRvbmUgJiYgdGhpcy5faW5wdXQpIHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5faW5wdXQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRXJyb3IoXCJMZXhpY2FsIGVycm9yIG9uIGxpbmUgXCIgKyAodGhpcy55eWxpbmVubyArIDEpICsgXCIuIFVucmVjb2duaXplZCB0ZXh0LlxcblwiICsgdGhpcy5zaG93UG9zaXRpb24oKSwgeyB0ZXh0OiBcIlwiLCB0b2tlbjogbnVsbCwgbGluZTogdGhpcy55eWxpbmVubyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGV4OiBmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHIgPSB0aGlzLm5leHQoKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGV4KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJlZ2luOiBmdW5jdGlvbiBiZWdpbihjb25kaXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrLnB1c2goY29uZGl0aW9uKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3BTdGF0ZTogZnVuY3Rpb24gcG9wU3RhdGUoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2sucG9wKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX2N1cnJlbnRSdWxlczogZnVuY3Rpb24gX2N1cnJlbnRSdWxlcygpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25zW3RoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGggLSAxXV0ucnVsZXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdG9wU3RhdGU6IGZ1bmN0aW9uIHRvcFN0YXRlKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoIC0gMl07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHVzaFN0YXRlOiBmdW5jdGlvbiBiZWdpbihjb25kaXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKGNvbmRpdGlvbik7XG4gICAgICAgICAgICB9IH07XG4gICAgICAgIGxleGVyLm9wdGlvbnMgPSB7fTtcbiAgICAgICAgbGV4ZXIucGVyZm9ybUFjdGlvbiA9IGZ1bmN0aW9uIGFub255bW91cyh5eSwgeXlfLCAkYXZvaWRpbmdfbmFtZV9jb2xsaXNpb25zLCBZWV9TVEFSVCkge1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBzdHJpcChzdGFydCwgZW5kKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHl5Xy55eXRleHQgPSB5eV8ueXl0ZXh0LnN1YnN0cihzdGFydCwgeXlfLnl5bGVuZyAtIGVuZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBZWVNUQVRFID0gWVlfU1RBUlQ7XG4gICAgICAgICAgICBzd2l0Y2ggKCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgIGlmICh5eV8ueXl0ZXh0LnNsaWNlKC0yKSA9PT0gXCJcXFxcXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpcCgwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh5eV8ueXl0ZXh0LnNsaWNlKC0xKSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmlwKDAsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcImVtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoeXlfLnl5dGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE0O1xuICAgICAgICAgICAgICAgICAgICB9YnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTQ7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTQ7XG5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoNSwgeXlfLnl5bGVuZyAtIDkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxNjtcblxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxNDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxMztcblxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA1OTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNjI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE3O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcInJhd1wiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDIxO1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA1MztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxMTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDI3O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNDU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtyZXR1cm4gNDI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtyZXR1cm4gNDI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTU6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAzMjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxNjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDM3O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE3OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNDk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTg6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA0NjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxOTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnB1dCh5eV8ueXl0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwiY29tXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDEzO1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA0NjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyMjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDY3O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDIzOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNjY7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA2NjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyNTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDgxO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI2OlxuICAgICAgICAgICAgICAgICAgICAvLyBpZ25vcmUgd2hpdGVzcGFjZVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI3OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7cmV0dXJuIDUyO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI4OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7cmV0dXJuIDMxO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI5OlxuICAgICAgICAgICAgICAgICAgICB5eV8ueXl0ZXh0ID0gc3RyaXAoMSwgMikucmVwbGFjZSgvXFxcXFwiL2csIFwiXFxcIlwiKTtyZXR1cm4gNzQ7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzA6XG4gICAgICAgICAgICAgICAgICAgIHl5Xy55eXRleHQgPSBzdHJpcCgxLCAyKS5yZXBsYWNlKC9cXFxcJy9nLCBcIidcIik7cmV0dXJuIDc0O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDMxOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNzk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzI6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA3NjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzMzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDc2O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNzc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzU6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA3ODtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzNjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDc1O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNjk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA3MTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDY2O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQwOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gNjY7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIklOVkFMSURcIjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0MjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBsZXhlci5ydWxlcyA9IFsvXig/OlteXFx4MDBdKj8oPz0oXFx7XFx7KSkpLywgL14oPzpbXlxceDAwXSspLywgL14oPzpbXlxceDAwXXsyLH0/KD89KFxce1xce3xcXFxcXFx7XFx7fFxcXFxcXFxcXFx7XFx7fCQpKSkvLCAvXig/Olxce1xce1xce1xce1xcL1teXFxzIVwiIyUtLFxcLlxcLzstPkBcXFstXFxeYFxcey1+XSsoPz1bPX1cXHNcXC8uXSlcXH1cXH1cXH1cXH0pLywgL14oPzpbXlxceDAwXSo/KD89KFxce1xce1xce1xce1xcLykpKS8sIC9eKD86W1xcc1xcU10qPy0tKH4pP1xcfVxcfSkvLCAvXig/OlxcKCkvLCAvXig/OlxcKSkvLCAvXig/Olxce1xce1xce1xceykvLCAvXig/OlxcfVxcfVxcfVxcfSkvLCAvXig/Olxce1xceyh+KT8+KS8sIC9eKD86XFx7XFx7KH4pPyMpLywgL14oPzpcXHtcXHsofik/XFwvKS8sIC9eKD86XFx7XFx7KH4pP1xcXlxccyoofik/XFx9XFx9KS8sIC9eKD86XFx7XFx7KH4pP1xccyplbHNlXFxzKih+KT9cXH1cXH0pLywgL14oPzpcXHtcXHsofik/XFxeKS8sIC9eKD86XFx7XFx7KH4pP1xccyplbHNlXFxiKS8sIC9eKD86XFx7XFx7KH4pP1xceykvLCAvXig/Olxce1xceyh+KT8mKS8sIC9eKD86XFx7XFx7KH4pPyEtLSkvLCAvXig/Olxce1xceyh+KT8hW1xcc1xcU10qP1xcfVxcfSkvLCAvXig/Olxce1xceyh+KT8pLywgL14oPzo9KS8sIC9eKD86XFwuXFwuKS8sIC9eKD86XFwuKD89KFs9fn1cXHNcXC8uKXxdKSkpLywgL14oPzpbXFwvLl0pLywgL14oPzpcXHMrKS8sIC9eKD86XFx9KH4pP1xcfVxcfSkvLCAvXig/Oih+KT9cXH1cXH0pLywgL14oPzpcIihcXFxcW1wiXXxbXlwiXSkqXCIpLywgL14oPzonKFxcXFxbJ118W14nXSkqJykvLCAvXig/OkApLywgL14oPzp0cnVlKD89KFt+fVxccyldKSkpLywgL14oPzpmYWxzZSg/PShbfn1cXHMpXSkpKS8sIC9eKD86dW5kZWZpbmVkKD89KFt+fVxccyldKSkpLywgL14oPzpudWxsKD89KFt+fVxccyldKSkpLywgL14oPzotP1swLTldKyg/OlxcLlswLTldKyk/KD89KFt+fVxccyldKSkpLywgL14oPzphc1xccytcXHwpLywgL14oPzpcXHwpLywgL14oPzooW15cXHMhXCIjJS0sXFwuXFwvOy0+QFxcWy1cXF5gXFx7LX5dKyg/PShbPX59XFxzXFwvLil8XSkpKSkvLCAvXig/OlxcW1teXFxdXSpcXF0pLywgL14oPzouKS8sIC9eKD86JCkvXTtcbiAgICAgICAgbGV4ZXIuY29uZGl0aW9ucyA9IHsgbXU6IHsgcnVsZXM6IFs2LCA3LCA4LCA5LCAxMCwgMTEsIDEyLCAxMywgMTQsIDE1LCAxNiwgMTcsIDE4LCAxOSwgMjAsIDIxLCAyMiwgMjMsIDI0LCAyNSwgMjYsIDI3LCAyOCwgMjksIDMwLCAzMSwgMzIsIDMzLCAzNCwgMzUsIDM2LCAzNywgMzgsIDM5LCA0MCwgNDEsIDQyXSwgaW5jbHVzaXZlOiBmYWxzZSB9LCBlbXU6IHsgcnVsZXM6IFsyXSwgaW5jbHVzaXZlOiBmYWxzZSB9LCBjb206IHsgcnVsZXM6IFs1XSwgaW5jbHVzaXZlOiBmYWxzZSB9LCByYXc6IHsgcnVsZXM6IFszLCA0XSwgaW5jbHVzaXZlOiBmYWxzZSB9LCBJTklUSUFMOiB7IHJ1bGVzOiBbMCwgMSwgNDJdLCBpbmNsdXNpdmU6IHRydWUgfSB9O1xuICAgICAgICByZXR1cm4gbGV4ZXI7XG4gICAgfSkoKTtcbiAgICBwYXJzZXIubGV4ZXIgPSBsZXhlcjtcbiAgICBmdW5jdGlvbiBQYXJzZXIoKSB7XG4gICAgICAgIHRoaXMueXkgPSB7fTtcbiAgICB9UGFyc2VyLnByb3RvdHlwZSA9IHBhcnNlcjtwYXJzZXIuUGFyc2VyID0gUGFyc2VyO1xuICAgIHJldHVybiBuZXcgUGFyc2VyKCk7XG59KSgpO2V4cG9ydHNbXCJkZWZhdWx0XCJdID0gaGFuZGxlYmFycztcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLnByaW50ID0gcHJpbnQ7XG5leHBvcnRzLlByaW50VmlzaXRvciA9IFByaW50VmlzaXRvcjtcbi8qZXNsaW50LWRpc2FibGUgbmV3LWNhcCAqL1xuXG52YXIgX1Zpc2l0b3IgPSByZXF1aXJlKCcuL3Zpc2l0b3InKTtcblxudmFyIF9WaXNpdG9yMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9WaXNpdG9yKTtcblxuZnVuY3Rpb24gcHJpbnQoYXN0KSB7XG4gIHJldHVybiBuZXcgUHJpbnRWaXNpdG9yKCkuYWNjZXB0KGFzdCk7XG59XG5cbmZ1bmN0aW9uIFByaW50VmlzaXRvcigpIHtcbiAgdGhpcy5wYWRkaW5nID0gMDtcbn1cblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZSA9IG5ldyBfVmlzaXRvcjJbJ2RlZmF1bHQnXSgpO1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLnBhZCA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgdmFyIG91dCA9ICcnO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5wYWRkaW5nOyBpIDwgbDsgaSsrKSB7XG4gICAgb3V0ID0gb3V0ICsgJyAgJztcbiAgfVxuXG4gIG91dCA9IG91dCArIHN0cmluZyArICdcXG4nO1xuICByZXR1cm4gb3V0O1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5Qcm9ncmFtID0gZnVuY3Rpb24gKHByb2dyYW0pIHtcbiAgdmFyIG91dCA9ICcnLFxuICAgICAgYm9keSA9IHByb2dyYW0uYm9keSxcbiAgICAgIGkgPSB1bmRlZmluZWQsXG4gICAgICBsID0gdW5kZWZpbmVkO1xuXG4gIGlmIChwcm9ncmFtLmJsb2NrUGFyYW1zKSB7XG4gICAgdmFyIGJsb2NrUGFyYW1zID0gJ0JMT0NLIFBBUkFNUzogWyc7XG4gICAgZm9yIChpID0gMCwgbCA9IHByb2dyYW0uYmxvY2tQYXJhbXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBibG9ja1BhcmFtcyArPSAnICcgKyBwcm9ncmFtLmJsb2NrUGFyYW1zW2ldO1xuICAgIH1cbiAgICBibG9ja1BhcmFtcyArPSAnIF0nO1xuICAgIG91dCArPSB0aGlzLnBhZChibG9ja1BhcmFtcyk7XG4gIH1cblxuICBmb3IgKGkgPSAwLCBsID0gYm9keS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBvdXQgPSBvdXQgKyB0aGlzLmFjY2VwdChib2R5W2ldKTtcbiAgfVxuXG4gIHRoaXMucGFkZGluZy0tO1xuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLk11c3RhY2hlU3RhdGVtZW50ID0gZnVuY3Rpb24gKG11c3RhY2hlKSB7XG4gIHJldHVybiB0aGlzLnBhZCgne3sgJyArIHRoaXMuU3ViRXhwcmVzc2lvbihtdXN0YWNoZSkgKyAnIH19Jyk7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLkJsb2NrU3RhdGVtZW50ID0gZnVuY3Rpb24gKGJsb2NrKSB7XG4gIHZhciBvdXQgPSAnJztcblxuICBvdXQgPSBvdXQgKyB0aGlzLnBhZCgnQkxPQ0s6Jyk7XG4gIHRoaXMucGFkZGluZysrO1xuICBvdXQgPSBvdXQgKyB0aGlzLnBhZCh0aGlzLlN1YkV4cHJlc3Npb24oYmxvY2spKTtcbiAgaWYgKGJsb2NrLnByb2dyYW0pIHtcbiAgICBvdXQgPSBvdXQgKyB0aGlzLnBhZCgnUFJPR1JBTTonKTtcbiAgICB0aGlzLnBhZGRpbmcrKztcbiAgICBvdXQgPSBvdXQgKyB0aGlzLmFjY2VwdChibG9jay5wcm9ncmFtKTtcbiAgICB0aGlzLnBhZGRpbmctLTtcbiAgfVxuICBpZiAoYmxvY2suaW52ZXJzZSkge1xuICAgIGlmIChibG9jay5wcm9ncmFtKSB7XG4gICAgICB0aGlzLnBhZGRpbmcrKztcbiAgICB9XG4gICAgb3V0ID0gb3V0ICsgdGhpcy5wYWQoJ3t7Xn19Jyk7XG4gICAgdGhpcy5wYWRkaW5nKys7XG4gICAgb3V0ID0gb3V0ICsgdGhpcy5hY2NlcHQoYmxvY2suaW52ZXJzZSk7XG4gICAgdGhpcy5wYWRkaW5nLS07XG4gICAgaWYgKGJsb2NrLnByb2dyYW0pIHtcbiAgICAgIHRoaXMucGFkZGluZy0tO1xuICAgIH1cbiAgfVxuICB0aGlzLnBhZGRpbmctLTtcblxuICByZXR1cm4gb3V0O1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5QYXJ0aWFsU3RhdGVtZW50ID0gZnVuY3Rpb24gKHBhcnRpYWwpIHtcbiAgdmFyIGNvbnRlbnQgPSAnUEFSVElBTDonICsgcGFydGlhbC5uYW1lLm9yaWdpbmFsO1xuICBpZiAocGFydGlhbC5wYXJhbXNbMF0pIHtcbiAgICBjb250ZW50ICs9ICcgJyArIHRoaXMuYWNjZXB0KHBhcnRpYWwucGFyYW1zWzBdKTtcbiAgfVxuICBpZiAocGFydGlhbC5oYXNoKSB7XG4gICAgY29udGVudCArPSAnICcgKyB0aGlzLmFjY2VwdChwYXJ0aWFsLmhhc2gpO1xuICB9XG4gIHJldHVybiB0aGlzLnBhZCgne3s+ICcgKyBjb250ZW50ICsgJyB9fScpO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5Db250ZW50U3RhdGVtZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgcmV0dXJuIHRoaXMucGFkKCdDT05URU5UWyBcXCcnICsgY29udGVudC52YWx1ZSArICdcXCcgXScpO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5Db21tZW50U3RhdGVtZW50ID0gZnVuY3Rpb24gKGNvbW1lbnQpIHtcbiAgcmV0dXJuIHRoaXMucGFkKCd7eyEgXFwnJyArIGNvbW1lbnQudmFsdWUgKyAnXFwnIH19Jyk7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLlN1YkV4cHJlc3Npb24gPSBmdW5jdGlvbiAoc2V4cHIpIHtcbiAgdmFyIHBhcmFtcyA9IHNleHByLnBhcmFtcyxcbiAgICAgIHBhcmFtU3RyaW5ncyA9IFtdLFxuICAgICAgaGFzaCA9IHVuZGVmaW5lZDtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhcmFtcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBwYXJhbVN0cmluZ3MucHVzaCh0aGlzLmFjY2VwdChwYXJhbXNbaV0pKTtcbiAgfVxuXG4gIHBhcmFtcyA9ICdbJyArIHBhcmFtU3RyaW5ncy5qb2luKCcsICcpICsgJ10nO1xuXG4gIGhhc2ggPSBzZXhwci5oYXNoID8gJyAnICsgdGhpcy5hY2NlcHQoc2V4cHIuaGFzaCkgOiAnJztcblxuICByZXR1cm4gdGhpcy5hY2NlcHQoc2V4cHIucGF0aCkgKyAnICcgKyBwYXJhbXMgKyBoYXNoO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5QYXRoRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChpZCkge1xuICB2YXIgcGF0aCA9IGlkLnBhcnRzLmpvaW4oJy8nKTtcbiAgcmV0dXJuIChpZC5kYXRhID8gJ0AnIDogJycpICsgJ1BBVEg6JyArIHBhdGg7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLlN0cmluZ0xpdGVyYWwgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIHJldHVybiAnXCInICsgc3RyaW5nLnZhbHVlICsgJ1wiJztcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuTnVtYmVyTGl0ZXJhbCA9IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgcmV0dXJuICdOVU1CRVJ7JyArIG51bWJlci52YWx1ZSArICd9Jztcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuQm9vbGVhbkxpdGVyYWwgPSBmdW5jdGlvbiAoYm9vbCkge1xuICByZXR1cm4gJ0JPT0xFQU57JyArIGJvb2wudmFsdWUgKyAnfSc7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLlVuZGVmaW5lZExpdGVyYWwgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnVU5ERUZJTkVEJztcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuTnVsbExpdGVyYWwgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnTlVMTCc7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLkhhc2ggPSBmdW5jdGlvbiAoaGFzaCkge1xuICB2YXIgcGFpcnMgPSBoYXNoLnBhaXJzLFxuICAgICAgam9pbmVkUGFpcnMgPSBbXTtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhaXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGpvaW5lZFBhaXJzLnB1c2godGhpcy5hY2NlcHQocGFpcnNbaV0pKTtcbiAgfVxuXG4gIHJldHVybiAnSEFTSHsnICsgam9pbmVkUGFpcnMuam9pbignLCAnKSArICd9Jztcbn07XG5QcmludFZpc2l0b3IucHJvdG90eXBlLkhhc2hQYWlyID0gZnVuY3Rpb24gKHBhaXIpIHtcbiAgcmV0dXJuIHBhaXIua2V5ICsgJz0nICsgdGhpcy5hY2NlcHQocGFpci52YWx1ZSk7XG59O1xuLyplc2xpbnQtZW5hYmxlIG5ldy1jYXAgKi8iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfTtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9FeGNlcHRpb24gPSByZXF1aXJlKCcuLi9leGNlcHRpb24nKTtcblxudmFyIF9FeGNlcHRpb24yID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0V4Y2VwdGlvbik7XG5cbnZhciBfQVNUID0gcmVxdWlyZSgnLi9hc3QnKTtcblxudmFyIF9BU1QyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX0FTVCk7XG5cbmZ1bmN0aW9uIFZpc2l0b3IoKSB7XG4gIHRoaXMucGFyZW50cyA9IFtdO1xufVxuXG5WaXNpdG9yLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFZpc2l0b3IsXG4gIG11dGF0aW5nOiBmYWxzZSxcblxuICAvLyBWaXNpdHMgYSBnaXZlbiB2YWx1ZS4gSWYgbXV0YXRpbmcsIHdpbGwgcmVwbGFjZSB0aGUgdmFsdWUgaWYgbmVjZXNzYXJ5LlxuICBhY2NlcHRLZXk6IGZ1bmN0aW9uIGFjY2VwdEtleShub2RlLCBuYW1lKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5hY2NlcHQobm9kZVtuYW1lXSk7XG4gICAgaWYgKHRoaXMubXV0YXRpbmcpIHtcbiAgICAgIC8vIEhhY2t5IHNhbml0eSBjaGVjazpcbiAgICAgIGlmICh2YWx1ZSAmJiAoIXZhbHVlLnR5cGUgfHwgIV9BU1QyWydkZWZhdWx0J11bdmFsdWUudHlwZV0pKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdVbmV4cGVjdGVkIG5vZGUgdHlwZSBcIicgKyB2YWx1ZS50eXBlICsgJ1wiIGZvdW5kIHdoZW4gYWNjZXB0aW5nICcgKyBuYW1lICsgJyBvbiAnICsgbm9kZS50eXBlKTtcbiAgICAgIH1cbiAgICAgIG5vZGVbbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gUGVyZm9ybXMgYW4gYWNjZXB0IG9wZXJhdGlvbiB3aXRoIGFkZGVkIHNhbml0eSBjaGVjayB0byBlbnN1cmVcbiAgLy8gcmVxdWlyZWQga2V5cyBhcmUgbm90IHJlbW92ZWQuXG4gIGFjY2VwdFJlcXVpcmVkOiBmdW5jdGlvbiBhY2NlcHRSZXF1aXJlZChub2RlLCBuYW1lKSB7XG4gICAgdGhpcy5hY2NlcHRLZXkobm9kZSwgbmFtZSk7XG5cbiAgICBpZiAoIW5vZGVbbmFtZV0pIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKG5vZGUudHlwZSArICcgcmVxdWlyZXMgJyArIG5hbWUpO1xuICAgIH1cbiAgfSxcblxuICAvLyBUcmF2ZXJzZXMgYSBnaXZlbiBhcnJheS4gSWYgbXV0YXRpbmcsIGVtcHR5IHJlc3Buc2VzIHdpbGwgYmUgcmVtb3ZlZFxuICAvLyBmb3IgY2hpbGQgZWxlbWVudHMuXG4gIGFjY2VwdEFycmF5OiBmdW5jdGlvbiBhY2NlcHRBcnJheShhcnJheSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXJyYXkubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0aGlzLmFjY2VwdEtleShhcnJheSwgaSk7XG5cbiAgICAgIGlmICghYXJyYXlbaV0pIHtcbiAgICAgICAgYXJyYXkuc3BsaWNlKGksIDEpO1xuICAgICAgICBpLS07XG4gICAgICAgIGwtLTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgYWNjZXB0OiBmdW5jdGlvbiBhY2NlcHQob2JqZWN0KSB7XG4gICAgaWYgKCFvYmplY3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jdXJyZW50KSB7XG4gICAgICB0aGlzLnBhcmVudHMudW5zaGlmdCh0aGlzLmN1cnJlbnQpO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnQgPSBvYmplY3Q7XG5cbiAgICB2YXIgcmV0ID0gdGhpc1tvYmplY3QudHlwZV0ob2JqZWN0KTtcblxuICAgIHRoaXMuY3VycmVudCA9IHRoaXMucGFyZW50cy5zaGlmdCgpO1xuXG4gICAgaWYgKCF0aGlzLm11dGF0aW5nIHx8IHJldCkge1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9IGVsc2UgaWYgKHJldCAhPT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICB9LFxuXG4gIFByb2dyYW06IGZ1bmN0aW9uIFByb2dyYW0ocHJvZ3JhbSkge1xuICAgIHRoaXMuYWNjZXB0QXJyYXkocHJvZ3JhbS5ib2R5KTtcbiAgfSxcblxuICBNdXN0YWNoZVN0YXRlbWVudDogZnVuY3Rpb24gTXVzdGFjaGVTdGF0ZW1lbnQobXVzdGFjaGUpIHtcbiAgICB0aGlzLmFjY2VwdFJlcXVpcmVkKG11c3RhY2hlLCAncGF0aCcpO1xuICAgIHRoaXMuYWNjZXB0QXJyYXkobXVzdGFjaGUucGFyYW1zKTtcbiAgICB0aGlzLmFjY2VwdEtleShtdXN0YWNoZSwgJ2hhc2gnKTtcbiAgfSxcblxuICBCbG9ja1N0YXRlbWVudDogZnVuY3Rpb24gQmxvY2tTdGF0ZW1lbnQoYmxvY2spIHtcbiAgICB0aGlzLmFjY2VwdFJlcXVpcmVkKGJsb2NrLCAncGF0aCcpO1xuICAgIHRoaXMuYWNjZXB0QXJyYXkoYmxvY2sucGFyYW1zKTtcbiAgICB0aGlzLmFjY2VwdEtleShibG9jaywgJ2hhc2gnKTtcblxuICAgIHRoaXMuYWNjZXB0S2V5KGJsb2NrLCAncHJvZ3JhbScpO1xuICAgIHRoaXMuYWNjZXB0S2V5KGJsb2NrLCAnaW52ZXJzZScpO1xuICB9LFxuXG4gIFBhcnRpYWxTdGF0ZW1lbnQ6IGZ1bmN0aW9uIFBhcnRpYWxTdGF0ZW1lbnQocGFydGlhbCkge1xuICAgIHRoaXMuYWNjZXB0UmVxdWlyZWQocGFydGlhbCwgJ25hbWUnKTtcbiAgICB0aGlzLmFjY2VwdEFycmF5KHBhcnRpYWwucGFyYW1zKTtcbiAgICB0aGlzLmFjY2VwdEtleShwYXJ0aWFsLCAnaGFzaCcpO1xuICB9LFxuXG4gIENvbnRlbnRTdGF0ZW1lbnQ6IGZ1bmN0aW9uIENvbnRlbnRTdGF0ZW1lbnQoKSB7fSxcbiAgQ29tbWVudFN0YXRlbWVudDogZnVuY3Rpb24gQ29tbWVudFN0YXRlbWVudCgpIHt9LFxuXG4gIFN1YkV4cHJlc3Npb246IGZ1bmN0aW9uIFN1YkV4cHJlc3Npb24oc2V4cHIpIHtcbiAgICB0aGlzLmFjY2VwdFJlcXVpcmVkKHNleHByLCAncGF0aCcpO1xuICAgIHRoaXMuYWNjZXB0QXJyYXkoc2V4cHIucGFyYW1zKTtcbiAgICB0aGlzLmFjY2VwdEtleShzZXhwciwgJ2hhc2gnKTtcbiAgfSxcblxuICBQYXRoRXhwcmVzc2lvbjogZnVuY3Rpb24gUGF0aEV4cHJlc3Npb24oKSB7fSxcblxuICBTdHJpbmdMaXRlcmFsOiBmdW5jdGlvbiBTdHJpbmdMaXRlcmFsKCkge30sXG4gIE51bWJlckxpdGVyYWw6IGZ1bmN0aW9uIE51bWJlckxpdGVyYWwoKSB7fSxcbiAgQm9vbGVhbkxpdGVyYWw6IGZ1bmN0aW9uIEJvb2xlYW5MaXRlcmFsKCkge30sXG4gIFVuZGVmaW5lZExpdGVyYWw6IGZ1bmN0aW9uIFVuZGVmaW5lZExpdGVyYWwoKSB7fSxcbiAgTnVsbExpdGVyYWw6IGZ1bmN0aW9uIE51bGxMaXRlcmFsKCkge30sXG5cbiAgSGFzaDogZnVuY3Rpb24gSGFzaChoYXNoKSB7XG4gICAgdGhpcy5hY2NlcHRBcnJheShoYXNoLnBhaXJzKTtcbiAgfSxcbiAgSGFzaFBhaXI6IGZ1bmN0aW9uIEhhc2hQYWlyKHBhaXIpIHtcbiAgICB0aGlzLmFjY2VwdFJlcXVpcmVkKHBhaXIsICd2YWx1ZScpO1xuICB9XG59O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBWaXNpdG9yO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107XG4vKiBjb250ZW50ICovIC8qIGNvbW1lbnQgKi8gLyogcGF0aCAqLyAvKiBzdHJpbmcgKi8gLyogbnVtYmVyICovIC8qIGJvb2wgKi8gLyogbGl0ZXJhbCAqLyAvKiBsaXRlcmFsICovIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfVmlzaXRvciA9IHJlcXVpcmUoJy4vdmlzaXRvcicpO1xuXG52YXIgX1Zpc2l0b3IyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX1Zpc2l0b3IpO1xuXG5mdW5jdGlvbiBXaGl0ZXNwYWNlQ29udHJvbCgpIHt9XG5XaGl0ZXNwYWNlQ29udHJvbC5wcm90b3R5cGUgPSBuZXcgX1Zpc2l0b3IyWydkZWZhdWx0J10oKTtcblxuV2hpdGVzcGFjZUNvbnRyb2wucHJvdG90eXBlLlByb2dyYW0gPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgaXNSb290ID0gIXRoaXMuaXNSb290U2VlbjtcbiAgdGhpcy5pc1Jvb3RTZWVuID0gdHJ1ZTtcblxuICB2YXIgYm9keSA9IHByb2dyYW0uYm9keTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBib2R5Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBjdXJyZW50ID0gYm9keVtpXSxcbiAgICAgICAgc3RyaXAgPSB0aGlzLmFjY2VwdChjdXJyZW50KTtcblxuICAgIGlmICghc3RyaXApIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciBfaXNQcmV2V2hpdGVzcGFjZSA9IGlzUHJldldoaXRlc3BhY2UoYm9keSwgaSwgaXNSb290KSxcbiAgICAgICAgX2lzTmV4dFdoaXRlc3BhY2UgPSBpc05leHRXaGl0ZXNwYWNlKGJvZHksIGksIGlzUm9vdCksXG4gICAgICAgIG9wZW5TdGFuZGFsb25lID0gc3RyaXAub3BlblN0YW5kYWxvbmUgJiYgX2lzUHJldldoaXRlc3BhY2UsXG4gICAgICAgIGNsb3NlU3RhbmRhbG9uZSA9IHN0cmlwLmNsb3NlU3RhbmRhbG9uZSAmJiBfaXNOZXh0V2hpdGVzcGFjZSxcbiAgICAgICAgaW5saW5lU3RhbmRhbG9uZSA9IHN0cmlwLmlubGluZVN0YW5kYWxvbmUgJiYgX2lzUHJldldoaXRlc3BhY2UgJiYgX2lzTmV4dFdoaXRlc3BhY2U7XG5cbiAgICBpZiAoc3RyaXAuY2xvc2UpIHtcbiAgICAgIG9taXRSaWdodChib2R5LCBpLCB0cnVlKTtcbiAgICB9XG4gICAgaWYgKHN0cmlwLm9wZW4pIHtcbiAgICAgIG9taXRMZWZ0KGJvZHksIGksIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChpbmxpbmVTdGFuZGFsb25lKSB7XG4gICAgICBvbWl0UmlnaHQoYm9keSwgaSk7XG5cbiAgICAgIGlmIChvbWl0TGVmdChib2R5LCBpKSkge1xuICAgICAgICAvLyBJZiB3ZSBhcmUgb24gYSBzdGFuZGFsb25lIG5vZGUsIHNhdmUgdGhlIGluZGVudCBpbmZvIGZvciBwYXJ0aWFsc1xuICAgICAgICBpZiAoY3VycmVudC50eXBlID09PSAnUGFydGlhbFN0YXRlbWVudCcpIHtcbiAgICAgICAgICAvLyBQdWxsIG91dCB0aGUgd2hpdGVzcGFjZSBmcm9tIHRoZSBmaW5hbCBsaW5lXG4gICAgICAgICAgY3VycmVudC5pbmRlbnQgPSAvKFsgXFx0XSskKS8uZXhlYyhib2R5W2kgLSAxXS5vcmlnaW5hbClbMV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9wZW5TdGFuZGFsb25lKSB7XG4gICAgICBvbWl0UmlnaHQoKGN1cnJlbnQucHJvZ3JhbSB8fCBjdXJyZW50LmludmVyc2UpLmJvZHkpO1xuXG4gICAgICAvLyBTdHJpcCBvdXQgdGhlIHByZXZpb3VzIGNvbnRlbnQgbm9kZSBpZiBpdCdzIHdoaXRlc3BhY2Ugb25seVxuICAgICAgb21pdExlZnQoYm9keSwgaSk7XG4gICAgfVxuICAgIGlmIChjbG9zZVN0YW5kYWxvbmUpIHtcbiAgICAgIC8vIEFsd2F5cyBzdHJpcCB0aGUgbmV4dCBub2RlXG4gICAgICBvbWl0UmlnaHQoYm9keSwgaSk7XG5cbiAgICAgIG9taXRMZWZ0KChjdXJyZW50LmludmVyc2UgfHwgY3VycmVudC5wcm9ncmFtKS5ib2R5KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJvZ3JhbTtcbn07XG5XaGl0ZXNwYWNlQ29udHJvbC5wcm90b3R5cGUuQmxvY2tTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgdGhpcy5hY2NlcHQoYmxvY2sucHJvZ3JhbSk7XG4gIHRoaXMuYWNjZXB0KGJsb2NrLmludmVyc2UpO1xuXG4gIC8vIEZpbmQgdGhlIGludmVyc2UgcHJvZ3JhbSB0aGF0IGlzIGludm9sZWQgd2l0aCB3aGl0ZXNwYWNlIHN0cmlwcGluZy5cbiAgdmFyIHByb2dyYW0gPSBibG9jay5wcm9ncmFtIHx8IGJsb2NrLmludmVyc2UsXG4gICAgICBpbnZlcnNlID0gYmxvY2sucHJvZ3JhbSAmJiBibG9jay5pbnZlcnNlLFxuICAgICAgZmlyc3RJbnZlcnNlID0gaW52ZXJzZSxcbiAgICAgIGxhc3RJbnZlcnNlID0gaW52ZXJzZTtcblxuICBpZiAoaW52ZXJzZSAmJiBpbnZlcnNlLmNoYWluZWQpIHtcbiAgICBmaXJzdEludmVyc2UgPSBpbnZlcnNlLmJvZHlbMF0ucHJvZ3JhbTtcblxuICAgIC8vIFdhbGsgdGhlIGludmVyc2UgY2hhaW4gdG8gZmluZCB0aGUgbGFzdCBpbnZlcnNlIHRoYXQgaXMgYWN0dWFsbHkgaW4gdGhlIGNoYWluLlxuICAgIHdoaWxlIChsYXN0SW52ZXJzZS5jaGFpbmVkKSB7XG4gICAgICBsYXN0SW52ZXJzZSA9IGxhc3RJbnZlcnNlLmJvZHlbbGFzdEludmVyc2UuYm9keS5sZW5ndGggLSAxXS5wcm9ncmFtO1xuICAgIH1cbiAgfVxuXG4gIHZhciBzdHJpcCA9IHtcbiAgICBvcGVuOiBibG9jay5vcGVuU3RyaXAub3BlbixcbiAgICBjbG9zZTogYmxvY2suY2xvc2VTdHJpcC5jbG9zZSxcblxuICAgIC8vIERldGVybWluZSB0aGUgc3RhbmRhbG9uZSBjYW5kaWFjeS4gQmFzaWNhbGx5IGZsYWcgb3VyIGNvbnRlbnQgYXMgYmVpbmcgcG9zc2libHkgc3RhbmRhbG9uZVxuICAgIC8vIHNvIG91ciBwYXJlbnQgY2FuIGRldGVybWluZSBpZiB3ZSBhY3R1YWxseSBhcmUgc3RhbmRhbG9uZVxuICAgIG9wZW5TdGFuZGFsb25lOiBpc05leHRXaGl0ZXNwYWNlKHByb2dyYW0uYm9keSksXG4gICAgY2xvc2VTdGFuZGFsb25lOiBpc1ByZXZXaGl0ZXNwYWNlKChmaXJzdEludmVyc2UgfHwgcHJvZ3JhbSkuYm9keSlcbiAgfTtcblxuICBpZiAoYmxvY2sub3BlblN0cmlwLmNsb3NlKSB7XG4gICAgb21pdFJpZ2h0KHByb2dyYW0uYm9keSwgbnVsbCwgdHJ1ZSk7XG4gIH1cblxuICBpZiAoaW52ZXJzZSkge1xuICAgIHZhciBpbnZlcnNlU3RyaXAgPSBibG9jay5pbnZlcnNlU3RyaXA7XG5cbiAgICBpZiAoaW52ZXJzZVN0cmlwLm9wZW4pIHtcbiAgICAgIG9taXRMZWZ0KHByb2dyYW0uYm9keSwgbnVsbCwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGludmVyc2VTdHJpcC5jbG9zZSkge1xuICAgICAgb21pdFJpZ2h0KGZpcnN0SW52ZXJzZS5ib2R5LCBudWxsLCB0cnVlKTtcbiAgICB9XG4gICAgaWYgKGJsb2NrLmNsb3NlU3RyaXAub3Blbikge1xuICAgICAgb21pdExlZnQobGFzdEludmVyc2UuYm9keSwgbnVsbCwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgLy8gRmluZCBzdGFuZGFsb25lIGVsc2Ugc3RhdG1lbnRzXG4gICAgaWYgKGlzUHJldldoaXRlc3BhY2UocHJvZ3JhbS5ib2R5KSAmJiBpc05leHRXaGl0ZXNwYWNlKGZpcnN0SW52ZXJzZS5ib2R5KSkge1xuICAgICAgb21pdExlZnQocHJvZ3JhbS5ib2R5KTtcbiAgICAgIG9taXRSaWdodChmaXJzdEludmVyc2UuYm9keSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGJsb2NrLmNsb3NlU3RyaXAub3Blbikge1xuICAgIG9taXRMZWZ0KHByb2dyYW0uYm9keSwgbnVsbCwgdHJ1ZSk7XG4gIH1cblxuICByZXR1cm4gc3RyaXA7XG59O1xuXG5XaGl0ZXNwYWNlQ29udHJvbC5wcm90b3R5cGUuTXVzdGFjaGVTdGF0ZW1lbnQgPSBmdW5jdGlvbiAobXVzdGFjaGUpIHtcbiAgcmV0dXJuIG11c3RhY2hlLnN0cmlwO1xufTtcblxuV2hpdGVzcGFjZUNvbnRyb2wucHJvdG90eXBlLlBhcnRpYWxTdGF0ZW1lbnQgPSBXaGl0ZXNwYWNlQ29udHJvbC5wcm90b3R5cGUuQ29tbWVudFN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIHZhciBzdHJpcCA9IG5vZGUuc3RyaXAgfHwge307XG4gIHJldHVybiB7XG4gICAgaW5saW5lU3RhbmRhbG9uZTogdHJ1ZSxcbiAgICBvcGVuOiBzdHJpcC5vcGVuLFxuICAgIGNsb3NlOiBzdHJpcC5jbG9zZVxuICB9O1xufTtcblxuZnVuY3Rpb24gaXNQcmV2V2hpdGVzcGFjZShib2R5LCBpLCBpc1Jvb3QpIHtcbiAgaWYgKGkgPT09IHVuZGVmaW5lZCkge1xuICAgIGkgPSBib2R5Lmxlbmd0aDtcbiAgfVxuXG4gIC8vIE5vZGVzIHRoYXQgZW5kIHdpdGggbmV3bGluZXMgYXJlIGNvbnNpZGVyZWQgd2hpdGVzcGFjZSAoYnV0IGFyZSBzcGVjaWFsXG4gIC8vIGNhc2VkIGZvciBzdHJpcCBvcGVyYXRpb25zKVxuICB2YXIgcHJldiA9IGJvZHlbaSAtIDFdLFxuICAgICAgc2libGluZyA9IGJvZHlbaSAtIDJdO1xuICBpZiAoIXByZXYpIHtcbiAgICByZXR1cm4gaXNSb290O1xuICB9XG5cbiAgaWYgKHByZXYudHlwZSA9PT0gJ0NvbnRlbnRTdGF0ZW1lbnQnKSB7XG4gICAgcmV0dXJuIChzaWJsaW5nIHx8ICFpc1Jvb3QgPyAvXFxyP1xcblxccyo/JC8gOiAvKF58XFxyP1xcbilcXHMqPyQvKS50ZXN0KHByZXYub3JpZ2luYWwpO1xuICB9XG59XG5mdW5jdGlvbiBpc05leHRXaGl0ZXNwYWNlKGJvZHksIGksIGlzUm9vdCkge1xuICBpZiAoaSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaSA9IC0xO1xuICB9XG5cbiAgdmFyIG5leHQgPSBib2R5W2kgKyAxXSxcbiAgICAgIHNpYmxpbmcgPSBib2R5W2kgKyAyXTtcbiAgaWYgKCFuZXh0KSB7XG4gICAgcmV0dXJuIGlzUm9vdDtcbiAgfVxuXG4gIGlmIChuZXh0LnR5cGUgPT09ICdDb250ZW50U3RhdGVtZW50Jykge1xuICAgIHJldHVybiAoc2libGluZyB8fCAhaXNSb290ID8gL15cXHMqP1xccj9cXG4vIDogL15cXHMqPyhcXHI/XFxufCQpLykudGVzdChuZXh0Lm9yaWdpbmFsKTtcbiAgfVxufVxuXG4vLyBNYXJrcyB0aGUgbm9kZSB0byB0aGUgcmlnaHQgb2YgdGhlIHBvc2l0aW9uIGFzIG9taXR0ZWQuXG4vLyBJLmUuIHt7Zm9vfX0nICcgd2lsbCBtYXJrIHRoZSAnICcgbm9kZSBhcyBvbWl0dGVkLlxuLy9cbi8vIElmIGkgaXMgdW5kZWZpbmVkLCB0aGVuIHRoZSBmaXJzdCBjaGlsZCB3aWxsIGJlIG1hcmtlZCBhcyBzdWNoLlxuLy9cbi8vIElmIG11bGl0cGxlIGlzIHRydXRoeSB0aGVuIGFsbCB3aGl0ZXNwYWNlIHdpbGwgYmUgc3RyaXBwZWQgb3V0IHVudGlsIG5vbi13aGl0ZXNwYWNlXG4vLyBjb250ZW50IGlzIG1ldC5cbmZ1bmN0aW9uIG9taXRSaWdodChib2R5LCBpLCBtdWx0aXBsZSkge1xuICB2YXIgY3VycmVudCA9IGJvZHlbaSA9PSBudWxsID8gMCA6IGkgKyAxXTtcbiAgaWYgKCFjdXJyZW50IHx8IGN1cnJlbnQudHlwZSAhPT0gJ0NvbnRlbnRTdGF0ZW1lbnQnIHx8ICFtdWx0aXBsZSAmJiBjdXJyZW50LnJpZ2h0U3RyaXBwZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgb3JpZ2luYWwgPSBjdXJyZW50LnZhbHVlO1xuICBjdXJyZW50LnZhbHVlID0gY3VycmVudC52YWx1ZS5yZXBsYWNlKG11bHRpcGxlID8gL15cXHMrLyA6IC9eWyBcXHRdKlxccj9cXG4/LywgJycpO1xuICBjdXJyZW50LnJpZ2h0U3RyaXBwZWQgPSBjdXJyZW50LnZhbHVlICE9PSBvcmlnaW5hbDtcbn1cblxuLy8gTWFya3MgdGhlIG5vZGUgdG8gdGhlIGxlZnQgb2YgdGhlIHBvc2l0aW9uIGFzIG9taXR0ZWQuXG4vLyBJLmUuICcgJ3t7Zm9vfX0gd2lsbCBtYXJrIHRoZSAnICcgbm9kZSBhcyBvbWl0dGVkLlxuLy9cbi8vIElmIGkgaXMgdW5kZWZpbmVkIHRoZW4gdGhlIGxhc3QgY2hpbGQgd2lsbCBiZSBtYXJrZWQgYXMgc3VjaC5cbi8vXG4vLyBJZiBtdWxpdHBsZSBpcyB0cnV0aHkgdGhlbiBhbGwgd2hpdGVzcGFjZSB3aWxsIGJlIHN0cmlwcGVkIG91dCB1bnRpbCBub24td2hpdGVzcGFjZVxuLy8gY29udGVudCBpcyBtZXQuXG5mdW5jdGlvbiBvbWl0TGVmdChib2R5LCBpLCBtdWx0aXBsZSkge1xuICB2YXIgY3VycmVudCA9IGJvZHlbaSA9PSBudWxsID8gYm9keS5sZW5ndGggLSAxIDogaSAtIDFdO1xuICBpZiAoIWN1cnJlbnQgfHwgY3VycmVudC50eXBlICE9PSAnQ29udGVudFN0YXRlbWVudCcgfHwgIW11bHRpcGxlICYmIGN1cnJlbnQubGVmdFN0cmlwcGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gV2Ugb21pdCB0aGUgbGFzdCBub2RlIGlmIGl0J3Mgd2hpdGVzcGFjZSBvbmx5IGFuZCBub3QgcHJlY2VlZGVkIGJ5IGEgbm9uLWNvbnRlbnQgbm9kZS5cbiAgdmFyIG9yaWdpbmFsID0gY3VycmVudC52YWx1ZTtcbiAgY3VycmVudC52YWx1ZSA9IGN1cnJlbnQudmFsdWUucmVwbGFjZShtdWx0aXBsZSA/IC9cXHMrJC8gOiAvWyBcXHRdKyQvLCAnJyk7XG4gIGN1cnJlbnQubGVmdFN0cmlwcGVkID0gY3VycmVudC52YWx1ZSAhPT0gb3JpZ2luYWw7XG4gIHJldHVybiBjdXJyZW50LmxlZnRTdHJpcHBlZDtcbn1cblxuZXhwb3J0c1snZGVmYXVsdCddID0gV2hpdGVzcGFjZUNvbnRyb2w7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UsIG5vZGUpIHtcbiAgdmFyIGxvYyA9IG5vZGUgJiYgbm9kZS5sb2MsXG4gICAgICBsaW5lID0gdW5kZWZpbmVkLFxuICAgICAgY29sdW1uID0gdW5kZWZpbmVkO1xuICBpZiAobG9jKSB7XG4gICAgbGluZSA9IGxvYy5zdGFydC5saW5lO1xuICAgIGNvbHVtbiA9IGxvYy5zdGFydC5jb2x1bW47XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIGNvbHVtbjtcbiAgfVxuXG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cblxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBFeGNlcHRpb24pO1xuICB9XG5cbiAgaWYgKGxvYykge1xuICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBjb2x1bW47XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBFeGNlcHRpb247XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG4vKmdsb2JhbCB3aW5kb3cgKi9cblxuZXhwb3J0c1snZGVmYXVsdCddID0gZnVuY3Rpb24gKEhhbmRsZWJhcnMpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgdmFyIHJvb3QgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHdpbmRvdyxcbiAgICAgICRIYW5kbGViYXJzID0gcm9vdC5IYW5kbGViYXJzO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBIYW5kbGViYXJzLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHJvb3QuSGFuZGxlYmFycyA9PT0gSGFuZGxlYmFycykge1xuICAgICAgcm9vdC5IYW5kbGViYXJzID0gJEhhbmRsZWJhcnM7XG4gICAgfVxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH07XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uO1xuXG4vLyBUT0RPOiBSZW1vdmUgdGhpcyBsaW5lIGFuZCBicmVhayB1cCBjb21waWxlUGFydGlhbFxuXG5leHBvcnRzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG5leHBvcnRzLndyYXBQcm9ncmFtID0gd3JhcFByb2dyYW07XG5leHBvcnRzLnJlc29sdmVQYXJ0aWFsID0gcmVzb2x2ZVBhcnRpYWw7XG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO1xuZXhwb3J0cy5ub29wID0gbm9vcDtcblxudmFyIF9pbXBvcnQgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBVdGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9pbXBvcnQpO1xuXG52YXIgX0V4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG5cbnZhciBfRXhjZXB0aW9uMiA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9FeGNlcHRpb24pO1xuXG52YXIgX0NPTVBJTEVSX1JFVklTSU9OJFJFVklTSU9OX0NIQU5HRVMkY3JlYXRlRnJhbWUgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5DT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBfQ09NUElMRVJfUkVWSVNJT04kUkVWSVNJT05fQ0hBTkdFUyRjcmVhdGVGcmFtZS5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgX0V4Y2VwdGlvbjJbJ2RlZmF1bHQnXSgnVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArICdQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgcnVudGltZVZlcnNpb25zICsgJykgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uICgnICsgY29tcGlsZXJWZXJzaW9ucyArICcpLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuICcgKyAnUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgY29tcGlsZXJJbmZvWzFdICsgJykuJyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ05vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZScpO1xuICB9XG4gIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xuICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdVbmtub3duIHRlbXBsYXRlIG9iamVjdDogJyArIHR5cGVvZiB0ZW1wbGF0ZVNwZWMpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgZW52LlZNLmNoZWNrUmV2aXNpb24odGVtcGxhdGVTcGVjLmNvbXBpbGVyKTtcblxuICBmdW5jdGlvbiBpbnZva2VQYXJ0aWFsV3JhcHBlcihwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgICAgY29udGV4dCA9IFV0aWxzLmV4dGVuZCh7fSwgY29udGV4dCwgb3B0aW9ucy5oYXNoKTtcbiAgICB9XG5cbiAgICBwYXJ0aWFsID0gZW52LlZNLnJlc29sdmVQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgdmFyIHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XG5cbiAgICBpZiAocmVzdWx0ID09IG51bGwgJiYgZW52LmNvbXBpbGUpIHtcbiAgICAgIG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHRlbXBsYXRlU3BlYy5jb21waWxlck9wdGlvbnMsIGVudik7XG4gICAgICByZXN1bHQgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkge1xuICAgICAgaWYgKG9wdGlvbnMuaW5kZW50KSB7XG4gICAgICAgIHZhciBsaW5lcyA9IHJlc3VsdC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGluZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCFsaW5lc1tpXSAmJiBpICsgMSA9PT0gbCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGluZXNbaV0gPSBvcHRpb25zLmluZGVudCArIGxpbmVzW2ldO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9IGxpbmVzLmpvaW4oJ1xcbicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGUnKTtcbiAgICB9XG4gIH1cblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIHN0cmljdDogZnVuY3Rpb24gc3RyaWN0KG9iaiwgbmFtZSkge1xuICAgICAgaWYgKCEobmFtZSBpbiBvYmopKSB7XG4gICAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdcIicgKyBuYW1lICsgJ1wiIG5vdCBkZWZpbmVkIGluICcgKyBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9ialtuYW1lXTtcbiAgICB9LFxuICAgIGxvb2t1cDogZnVuY3Rpb24gbG9va3VwKGRlcHRocywgbmFtZSkge1xuICAgICAgdmFyIGxlbiA9IGRlcHRocy5sZW5ndGg7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChkZXB0aHNbaV0gJiYgZGVwdGhzW2ldW25hbWVdICE9IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gZGVwdGhzW2ldW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBsYW1iZGE6IGZ1bmN0aW9uIGxhbWJkYShjdXJyZW50LCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIGN1cnJlbnQgPT09ICdmdW5jdGlvbicgPyBjdXJyZW50LmNhbGwoY29udGV4dCkgOiBjdXJyZW50O1xuICAgIH0sXG5cbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIGludm9rZVBhcnRpYWw6IGludm9rZVBhcnRpYWxXcmFwcGVyLFxuXG4gICAgZm46IGZ1bmN0aW9uIGZuKGkpIHtcbiAgICAgIHJldHVybiB0ZW1wbGF0ZVNwZWNbaV07XG4gICAgfSxcblxuICAgIHByb2dyYW1zOiBbXSxcbiAgICBwcm9ncmFtOiBmdW5jdGlvbiBwcm9ncmFtKGksIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0sXG4gICAgICAgICAgZm4gPSB0aGlzLmZuKGkpO1xuICAgICAgaWYgKGRhdGEgfHwgZGVwdGhzIHx8IGJsb2NrUGFyYW1zIHx8IGRlY2xhcmVkQmxvY2tQYXJhbXMpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uIGRhdGEodmFsdWUsIGRlcHRoKSB7XG4gICAgICB3aGlsZSAodmFsdWUgJiYgZGVwdGgtLSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLl9wYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24gbWVyZ2UocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIG9iaiA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiBwYXJhbSAhPT0gY29tbW9uKSB7XG4gICAgICAgIG9iaiA9IFV0aWxzLmV4dGVuZCh7fSwgY29tbW9uLCBwYXJhbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSxcblxuICAgIG5vb3A6IGVudi5WTS5ub29wLFxuICAgIGNvbXBpbGVySW5mbzogdGVtcGxhdGVTcGVjLmNvbXBpbGVyXG4gIH07XG5cbiAgZnVuY3Rpb24gcmV0KGNvbnRleHQpIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMV07XG5cbiAgICB2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YTtcblxuICAgIHJldC5fc2V0dXAob3B0aW9ucyk7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwgJiYgdGVtcGxhdGVTcGVjLnVzZURhdGEpIHtcbiAgICAgIGRhdGEgPSBpbml0RGF0YShjb250ZXh0LCBkYXRhKTtcbiAgICB9XG4gICAgdmFyIGRlcHRocyA9IHVuZGVmaW5lZCxcbiAgICAgICAgYmxvY2tQYXJhbXMgPSB0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgPyBbXSA6IHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocykge1xuICAgICAgZGVwdGhzID0gb3B0aW9ucy5kZXB0aHMgPyBbY29udGV4dF0uY29uY2F0KG9wdGlvbnMuZGVwdGhzKSA6IFtjb250ZXh0XTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGVtcGxhdGVTcGVjLm1haW4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICB9XG4gIHJldC5pc1RvcCA9IHRydWU7XG5cbiAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMuaGVscGVycywgZW52LmhlbHBlcnMpO1xuXG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZVBhcnRpYWwpIHtcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMucGFydGlhbHMsIGVudi5wYXJ0aWFscyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gIH07XG5cbiAgcmV0Ll9jaGlsZCA9IGZ1bmN0aW9uIChpLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyAmJiAhYmxvY2tQYXJhbXMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdtdXN0IHBhc3MgYmxvY2sgcGFyYW1zJyk7XG4gICAgfVxuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzICYmICFkZXB0aHMpIHtcbiAgICAgIHRocm93IG5ldyBfRXhjZXB0aW9uMlsnZGVmYXVsdCddKCdtdXN0IHBhc3MgcGFyZW50IGRlcHRocycpO1xuICAgIH1cblxuICAgIHJldHVybiB3cmFwUHJvZ3JhbShjb250YWluZXIsIGksIHRlbXBsYXRlU3BlY1tpXSwgZGF0YSwgMCwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gIH07XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIHdyYXBQcm9ncmFtKGNvbnRhaW5lciwgaSwgZm4sIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgZnVuY3Rpb24gcHJvZyhjb250ZXh0KSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzFdO1xuXG4gICAgcmV0dXJuIGZuLmNhbGwoY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEgfHwgZGF0YSwgYmxvY2tQYXJhbXMgJiYgW29wdGlvbnMuYmxvY2tQYXJhbXNdLmNvbmNhdChibG9ja1BhcmFtcyksIGRlcHRocyAmJiBbY29udGV4dF0uY29uY2F0KGRlcHRocykpO1xuICB9XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSBkZXB0aHMgPyBkZXB0aHMubGVuZ3RoIDogMDtcbiAgcHJvZy5ibG9ja1BhcmFtcyA9IGRlY2xhcmVkQmxvY2tQYXJhbXMgfHwgMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgaWYgKCFwYXJ0aWFsKSB7XG4gICAgcGFydGlhbCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXTtcbiAgfSBlbHNlIGlmICghcGFydGlhbC5jYWxsICYmICFvcHRpb25zLm5hbWUpIHtcbiAgICAvLyBUaGlzIGlzIGEgZHluYW1pYyBwYXJ0aWFsIHRoYXQgcmV0dXJuZWQgYSBzdHJpbmdcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJ0aWFsO1xuICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW3BhcnRpYWxdO1xuICB9XG4gIHJldHVybiBwYXJ0aWFsO1xufVxuXG5mdW5jdGlvbiBpbnZva2VQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucy5wYXJ0aWFsID0gdHJ1ZTtcblxuICBpZiAocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IF9FeGNlcHRpb24yWydkZWZhdWx0J10oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBmb3VuZCcpO1xuICB9IGVsc2UgaWYgKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7XG4gIHJldHVybiAnJztcbn1cblxuZnVuY3Rpb24gaW5pdERhdGEoY29udGV4dCwgZGF0YSkge1xuICBpZiAoIWRhdGEgfHwgISgncm9vdCcgaW4gZGF0YSkpIHtcbiAgICBkYXRhID0gZGF0YSA/IF9DT01QSUxFUl9SRVZJU0lPTiRSRVZJU0lPTl9DSEFOR0VTJGNyZWF0ZUZyYW1lLmNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgZGF0YS5yb290ID0gY29udGV4dDtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gU2FmZVN0cmluZy5wcm90b3R5cGUudG9IVE1MID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJycgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IFNhZmVTdHJpbmc7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDtcblxuLy8gT2xkZXIgSUUgdmVyc2lvbnMgZG8gbm90IGRpcmVjdGx5IHN1cHBvcnQgaW5kZXhPZiBzbyB3ZSBtdXN0IGltcGxlbWVudCBvdXIgb3duLCBzYWRseS5cbmV4cG9ydHMuaW5kZXhPZiA9IGluZGV4T2Y7XG5leHBvcnRzLmVzY2FwZUV4cHJlc3Npb24gPSBlc2NhcGVFeHByZXNzaW9uO1xuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTtcbmV4cG9ydHMuYmxvY2tQYXJhbXMgPSBibG9ja1BhcmFtcztcbmV4cG9ydHMuYXBwZW5kQ29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aDtcbnZhciBlc2NhcGUgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgJ1xcJyc6ICcmI3gyNzsnLFxuICAnYCc6ICcmI3g2MDsnXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2csXG4gICAgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqIC8qICwgLi4uc291cmNlICovKSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG4vKmVzbGludC1kaXNhYmxlIGZ1bmMtc3R5bGUsIG5vLXZhciAqL1xudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICBleHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbnZhciBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbi8qZXNsaW50LWVuYWJsZSBmdW5jLXN0eWxlLCBuby12YXIgKi9cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtleHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpbmRleE9mKGFycmF5LCB2YWx1ZSkge1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoYXJyYXlbaV0gPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVFeHByZXNzaW9uKHN0cmluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyAmJiBzdHJpbmcudG9IVE1MKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvSFRNTCgpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9IGVsc2UgaWYgKCFzdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcgKyAnJztcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSAnJyArIHN0cmluZztcbiAgfVxuXG4gIGlmICghcG9zc2libGUudGVzdChzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZztcbiAgfVxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xufVxuXG5mdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gYmxvY2tQYXJhbXMocGFyYW1zLCBpZHMpIHtcbiAgcGFyYW1zLnBhdGggPSBpZHM7XG4gIHJldHVybiBwYXJhbXM7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZENvbnRleHRQYXRoKGNvbnRleHRQYXRoLCBpZCkge1xuICByZXR1cm4gKGNvbnRleHRQYXRoID8gY29udGV4dFBhdGggKyAnLicgOiAnJykgKyBpZDtcbn0iLCIvLyBVU0FHRTpcbi8vIHZhciBoYW5kbGViYXJzID0gcmVxdWlyZSgnaGFuZGxlYmFycycpO1xuLyogZXNsaW50LWRpc2FibGUgbm8tdmFyICovXG5cbi8vIHZhciBsb2NhbCA9IGhhbmRsZWJhcnMuY3JlYXRlKCk7XG5cbnZhciBoYW5kbGViYXJzID0gcmVxdWlyZSgnLi4vZGlzdC9janMvaGFuZGxlYmFycycpWydkZWZhdWx0J107XG5cbnZhciBwcmludGVyID0gcmVxdWlyZSgnLi4vZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9wcmludGVyJyk7XG5oYW5kbGViYXJzLlByaW50VmlzaXRvciA9IHByaW50ZXIuUHJpbnRWaXNpdG9yO1xuaGFuZGxlYmFycy5wcmludCA9IHByaW50ZXIucHJpbnQ7XG5cbm1vZHVsZS5leHBvcnRzID0gaGFuZGxlYmFycztcblxuLy8gUHVibGlzaCBhIE5vZGUuanMgcmVxdWlyZSgpIGhhbmRsZXIgZm9yIC5oYW5kbGViYXJzIGFuZCAuaGJzIGZpbGVzXG5mdW5jdGlvbiBleHRlbnNpb24obW9kdWxlLCBmaWxlbmFtZSkge1xuICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuICB2YXIgdGVtcGxhdGVTdHJpbmcgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZW5hbWUsICd1dGY4Jyk7XG4gIG1vZHVsZS5leHBvcnRzID0gaGFuZGxlYmFycy5jb21waWxlKHRlbXBsYXRlU3RyaW5nKTtcbn1cbi8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG5pZiAodHlwZW9mIHJlcXVpcmUgIT09ICd1bmRlZmluZWQnICYmIHJlcXVpcmUuZXh0ZW5zaW9ucykge1xuICByZXF1aXJlLmV4dGVuc2lvbnNbJy5oYW5kbGViYXJzJ10gPSBleHRlbnNpb247XG4gIHJlcXVpcmUuZXh0ZW5zaW9uc1snLmhicyddID0gZXh0ZW5zaW9uO1xufVxuIiwiLypcbiAqIENvcHlyaWdodCAyMDA5LTIwMTEgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFLnR4dCBvcjpcbiAqIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9CU0QtMy1DbGF1c2VcbiAqL1xuZXhwb3J0cy5Tb3VyY2VNYXBHZW5lcmF0b3IgPSByZXF1aXJlKCcuL3NvdXJjZS1tYXAvc291cmNlLW1hcC1nZW5lcmF0b3InKS5Tb3VyY2VNYXBHZW5lcmF0b3I7XG5leHBvcnRzLlNvdXJjZU1hcENvbnN1bWVyID0gcmVxdWlyZSgnLi9zb3VyY2UtbWFwL3NvdXJjZS1tYXAtY29uc3VtZXInKS5Tb3VyY2VNYXBDb25zdW1lcjtcbmV4cG9ydHMuU291cmNlTm9kZSA9IHJlcXVpcmUoJy4vc291cmNlLW1hcC9zb3VyY2Utbm9kZScpLlNvdXJjZU5vZGU7XG4iLCIvKiAtKi0gTW9kZToganM7IGpzLWluZGVudC1sZXZlbDogMjsgLSotICovXG4vKlxuICogQ29weXJpZ2h0IDIwMTEgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFIG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBkZWZpbmUgPSByZXF1aXJlKCdhbWRlZmluZScpKG1vZHVsZSwgcmVxdWlyZSk7XG59XG5kZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gIHZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbiAgLyoqXG4gICAqIEEgZGF0YSBzdHJ1Y3R1cmUgd2hpY2ggaXMgYSBjb21iaW5hdGlvbiBvZiBhbiBhcnJheSBhbmQgYSBzZXQuIEFkZGluZyBhIG5ld1xuICAgKiBtZW1iZXIgaXMgTygxKSwgdGVzdGluZyBmb3IgbWVtYmVyc2hpcCBpcyBPKDEpLCBhbmQgZmluZGluZyB0aGUgaW5kZXggb2YgYW5cbiAgICogZWxlbWVudCBpcyBPKDEpLiBSZW1vdmluZyBlbGVtZW50cyBmcm9tIHRoZSBzZXQgaXMgbm90IHN1cHBvcnRlZC4gT25seVxuICAgKiBzdHJpbmdzIGFyZSBzdXBwb3J0ZWQgZm9yIG1lbWJlcnNoaXAuXG4gICAqL1xuICBmdW5jdGlvbiBBcnJheVNldCgpIHtcbiAgICB0aGlzLl9hcnJheSA9IFtdO1xuICAgIHRoaXMuX3NldCA9IHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YXRpYyBtZXRob2QgZm9yIGNyZWF0aW5nIEFycmF5U2V0IGluc3RhbmNlcyBmcm9tIGFuIGV4aXN0aW5nIGFycmF5LlxuICAgKi9cbiAgQXJyYXlTZXQuZnJvbUFycmF5ID0gZnVuY3Rpb24gQXJyYXlTZXRfZnJvbUFycmF5KGFBcnJheSwgYUFsbG93RHVwbGljYXRlcykge1xuICAgIHZhciBzZXQgPSBuZXcgQXJyYXlTZXQoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYUFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBzZXQuYWRkKGFBcnJheVtpXSwgYUFsbG93RHVwbGljYXRlcyk7XG4gICAgfVxuICAgIHJldHVybiBzZXQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgZ2l2ZW4gc3RyaW5nIHRvIHRoaXMgc2V0LlxuICAgKlxuICAgKiBAcGFyYW0gU3RyaW5nIGFTdHJcbiAgICovXG4gIEFycmF5U2V0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBBcnJheVNldF9hZGQoYVN0ciwgYUFsbG93RHVwbGljYXRlcykge1xuICAgIHZhciBpc0R1cGxpY2F0ZSA9IHRoaXMuaGFzKGFTdHIpO1xuICAgIHZhciBpZHggPSB0aGlzLl9hcnJheS5sZW5ndGg7XG4gICAgaWYgKCFpc0R1cGxpY2F0ZSB8fCBhQWxsb3dEdXBsaWNhdGVzKSB7XG4gICAgICB0aGlzLl9hcnJheS5wdXNoKGFTdHIpO1xuICAgIH1cbiAgICBpZiAoIWlzRHVwbGljYXRlKSB7XG4gICAgICB0aGlzLl9zZXRbdXRpbC50b1NldFN0cmluZyhhU3RyKV0gPSBpZHg7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBJcyB0aGUgZ2l2ZW4gc3RyaW5nIGEgbWVtYmVyIG9mIHRoaXMgc2V0P1xuICAgKlxuICAgKiBAcGFyYW0gU3RyaW5nIGFTdHJcbiAgICovXG4gIEFycmF5U2V0LnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbiBBcnJheVNldF9oYXMoYVN0cikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy5fc2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbC50b1NldFN0cmluZyhhU3RyKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFdoYXQgaXMgdGhlIGluZGV4IG9mIHRoZSBnaXZlbiBzdHJpbmcgaW4gdGhlIGFycmF5P1xuICAgKlxuICAgKiBAcGFyYW0gU3RyaW5nIGFTdHJcbiAgICovXG4gIEFycmF5U2V0LnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gQXJyYXlTZXRfaW5kZXhPZihhU3RyKSB7XG4gICAgaWYgKHRoaXMuaGFzKGFTdHIpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc2V0W3V0aWwudG9TZXRTdHJpbmcoYVN0cildO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIGFTdHIgKyAnXCIgaXMgbm90IGluIHRoZSBzZXQuJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFdoYXQgaXMgdGhlIGVsZW1lbnQgYXQgdGhlIGdpdmVuIGluZGV4P1xuICAgKlxuICAgKiBAcGFyYW0gTnVtYmVyIGFJZHhcbiAgICovXG4gIEFycmF5U2V0LnByb3RvdHlwZS5hdCA9IGZ1bmN0aW9uIEFycmF5U2V0X2F0KGFJZHgpIHtcbiAgICBpZiAoYUlkeCA+PSAwICYmIGFJZHggPCB0aGlzLl9hcnJheS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hcnJheVthSWR4XTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBlbGVtZW50IGluZGV4ZWQgYnkgJyArIGFJZHgpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBhcnJheSByZXByZXNlbnRhdGlvbiBvZiB0aGlzIHNldCAod2hpY2ggaGFzIHRoZSBwcm9wZXIgaW5kaWNlc1xuICAgKiBpbmRpY2F0ZWQgYnkgaW5kZXhPZikuIE5vdGUgdGhhdCB0aGlzIGlzIGEgY29weSBvZiB0aGUgaW50ZXJuYWwgYXJyYXkgdXNlZFxuICAgKiBmb3Igc3RvcmluZyB0aGUgbWVtYmVycyBzbyB0aGF0IG5vIG9uZSBjYW4gbWVzcyB3aXRoIGludGVybmFsIHN0YXRlLlxuICAgKi9cbiAgQXJyYXlTZXQucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbiBBcnJheVNldF90b0FycmF5KCkge1xuICAgIHJldHVybiB0aGlzLl9hcnJheS5zbGljZSgpO1xuICB9O1xuXG4gIGV4cG9ydHMuQXJyYXlTZXQgPSBBcnJheVNldDtcblxufSk7XG4iLCIvKiAtKi0gTW9kZToganM7IGpzLWluZGVudC1sZXZlbDogMjsgLSotICovXG4vKlxuICogQ29weXJpZ2h0IDIwMTEgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFIG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICpcbiAqIEJhc2VkIG9uIHRoZSBCYXNlIDY0IFZMUSBpbXBsZW1lbnRhdGlvbiBpbiBDbG9zdXJlIENvbXBpbGVyOlxuICogaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jbG9zdXJlLWNvbXBpbGVyL3NvdXJjZS9icm93c2UvdHJ1bmsvc3JjL2NvbS9nb29nbGUvZGVidWdnaW5nL3NvdXJjZW1hcC9CYXNlNjRWTFEuamF2YVxuICpcbiAqIENvcHlyaWdodCAyMDExIFRoZSBDbG9zdXJlIENvbXBpbGVyIEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXRcbiAqIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmVcbiAqIG1ldDpcbiAqXG4gKiAgKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxuICogICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICogICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZVxuICogICAgY29weXJpZ2h0IG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmdcbiAqICAgIGRpc2NsYWltZXIgaW4gdGhlIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZFxuICogICAgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuICogICogTmVpdGhlciB0aGUgbmFtZSBvZiBHb29nbGUgSW5jLiBub3IgdGhlIG5hbWVzIG9mIGl0c1xuICogICAgY29udHJpYnV0b3JzIG1heSBiZSB1c2VkIHRvIGVuZG9yc2Ugb3IgcHJvbW90ZSBwcm9kdWN0cyBkZXJpdmVkXG4gKiAgICBmcm9tIHRoaXMgc29mdHdhcmUgd2l0aG91dCBzcGVjaWZpYyBwcmlvciB3cml0dGVuIHBlcm1pc3Npb24uXG4gKlxuICogVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SU1xuICogXCJBUyBJU1wiIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVFxuICogTElNSVRFRCBUTywgVEhFIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SXG4gKiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIENPUFlSSUdIVFxuICogT1dORVIgT1IgQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsXG4gKiBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyAoSU5DTFVESU5HLCBCVVQgTk9UXG4gKiBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTOyBMT1NTIE9GIFVTRSxcbiAqIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EIE9OIEFOWVxuICogVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICogKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFXG4gKiBPRiBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBkZWZpbmUgPSByZXF1aXJlKCdhbWRlZmluZScpKG1vZHVsZSwgcmVxdWlyZSk7XG59XG5kZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gIHZhciBiYXNlNjQgPSByZXF1aXJlKCcuL2Jhc2U2NCcpO1xuXG4gIC8vIEEgc2luZ2xlIGJhc2UgNjQgZGlnaXQgY2FuIGNvbnRhaW4gNiBiaXRzIG9mIGRhdGEuIEZvciB0aGUgYmFzZSA2NCB2YXJpYWJsZVxuICAvLyBsZW5ndGggcXVhbnRpdGllcyB3ZSB1c2UgaW4gdGhlIHNvdXJjZSBtYXAgc3BlYywgdGhlIGZpcnN0IGJpdCBpcyB0aGUgc2lnbixcbiAgLy8gdGhlIG5leHQgZm91ciBiaXRzIGFyZSB0aGUgYWN0dWFsIHZhbHVlLCBhbmQgdGhlIDZ0aCBiaXQgaXMgdGhlXG4gIC8vIGNvbnRpbnVhdGlvbiBiaXQuIFRoZSBjb250aW51YXRpb24gYml0IHRlbGxzIHVzIHdoZXRoZXIgdGhlcmUgYXJlIG1vcmVcbiAgLy8gZGlnaXRzIGluIHRoaXMgdmFsdWUgZm9sbG93aW5nIHRoaXMgZGlnaXQuXG4gIC8vXG4gIC8vICAgQ29udGludWF0aW9uXG4gIC8vICAgfCAgICBTaWduXG4gIC8vICAgfCAgICB8XG4gIC8vICAgViAgICBWXG4gIC8vICAgMTAxMDExXG5cbiAgdmFyIFZMUV9CQVNFX1NISUZUID0gNTtcblxuICAvLyBiaW5hcnk6IDEwMDAwMFxuICB2YXIgVkxRX0JBU0UgPSAxIDw8IFZMUV9CQVNFX1NISUZUO1xuXG4gIC8vIGJpbmFyeTogMDExMTExXG4gIHZhciBWTFFfQkFTRV9NQVNLID0gVkxRX0JBU0UgLSAxO1xuXG4gIC8vIGJpbmFyeTogMTAwMDAwXG4gIHZhciBWTFFfQ09OVElOVUFUSU9OX0JJVCA9IFZMUV9CQVNFO1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBmcm9tIGEgdHdvLWNvbXBsZW1lbnQgdmFsdWUgdG8gYSB2YWx1ZSB3aGVyZSB0aGUgc2lnbiBiaXQgaXNcbiAgICogcGxhY2VkIGluIHRoZSBsZWFzdCBzaWduaWZpY2FudCBiaXQuICBGb3IgZXhhbXBsZSwgYXMgZGVjaW1hbHM6XG4gICAqICAgMSBiZWNvbWVzIDIgKDEwIGJpbmFyeSksIC0xIGJlY29tZXMgMyAoMTEgYmluYXJ5KVxuICAgKiAgIDIgYmVjb21lcyA0ICgxMDAgYmluYXJ5KSwgLTIgYmVjb21lcyA1ICgxMDEgYmluYXJ5KVxuICAgKi9cbiAgZnVuY3Rpb24gdG9WTFFTaWduZWQoYVZhbHVlKSB7XG4gICAgcmV0dXJuIGFWYWx1ZSA8IDBcbiAgICAgID8gKCgtYVZhbHVlKSA8PCAxKSArIDFcbiAgICAgIDogKGFWYWx1ZSA8PCAxKSArIDA7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydHMgdG8gYSB0d28tY29tcGxlbWVudCB2YWx1ZSBmcm9tIGEgdmFsdWUgd2hlcmUgdGhlIHNpZ24gYml0IGlzXG4gICAqIHBsYWNlZCBpbiB0aGUgbGVhc3Qgc2lnbmlmaWNhbnQgYml0LiAgRm9yIGV4YW1wbGUsIGFzIGRlY2ltYWxzOlxuICAgKiAgIDIgKDEwIGJpbmFyeSkgYmVjb21lcyAxLCAzICgxMSBiaW5hcnkpIGJlY29tZXMgLTFcbiAgICogICA0ICgxMDAgYmluYXJ5KSBiZWNvbWVzIDIsIDUgKDEwMSBiaW5hcnkpIGJlY29tZXMgLTJcbiAgICovXG4gIGZ1bmN0aW9uIGZyb21WTFFTaWduZWQoYVZhbHVlKSB7XG4gICAgdmFyIGlzTmVnYXRpdmUgPSAoYVZhbHVlICYgMSkgPT09IDE7XG4gICAgdmFyIHNoaWZ0ZWQgPSBhVmFsdWUgPj4gMTtcbiAgICByZXR1cm4gaXNOZWdhdGl2ZVxuICAgICAgPyAtc2hpZnRlZFxuICAgICAgOiBzaGlmdGVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGJhc2UgNjQgVkxRIGVuY29kZWQgdmFsdWUuXG4gICAqL1xuICBleHBvcnRzLmVuY29kZSA9IGZ1bmN0aW9uIGJhc2U2NFZMUV9lbmNvZGUoYVZhbHVlKSB7XG4gICAgdmFyIGVuY29kZWQgPSBcIlwiO1xuICAgIHZhciBkaWdpdDtcblxuICAgIHZhciB2bHEgPSB0b1ZMUVNpZ25lZChhVmFsdWUpO1xuXG4gICAgZG8ge1xuICAgICAgZGlnaXQgPSB2bHEgJiBWTFFfQkFTRV9NQVNLO1xuICAgICAgdmxxID4+Pj0gVkxRX0JBU0VfU0hJRlQ7XG4gICAgICBpZiAodmxxID4gMCkge1xuICAgICAgICAvLyBUaGVyZSBhcmUgc3RpbGwgbW9yZSBkaWdpdHMgaW4gdGhpcyB2YWx1ZSwgc28gd2UgbXVzdCBtYWtlIHN1cmUgdGhlXG4gICAgICAgIC8vIGNvbnRpbnVhdGlvbiBiaXQgaXMgbWFya2VkLlxuICAgICAgICBkaWdpdCB8PSBWTFFfQ09OVElOVUFUSU9OX0JJVDtcbiAgICAgIH1cbiAgICAgIGVuY29kZWQgKz0gYmFzZTY0LmVuY29kZShkaWdpdCk7XG4gICAgfSB3aGlsZSAodmxxID4gMCk7XG5cbiAgICByZXR1cm4gZW5jb2RlZDtcbiAgfTtcblxuICAvKipcbiAgICogRGVjb2RlcyB0aGUgbmV4dCBiYXNlIDY0IFZMUSB2YWx1ZSBmcm9tIHRoZSBnaXZlbiBzdHJpbmcgYW5kIHJldHVybnMgdGhlXG4gICAqIHZhbHVlIGFuZCB0aGUgcmVzdCBvZiB0aGUgc3RyaW5nIHZpYSB0aGUgb3V0IHBhcmFtZXRlci5cbiAgICovXG4gIGV4cG9ydHMuZGVjb2RlID0gZnVuY3Rpb24gYmFzZTY0VkxRX2RlY29kZShhU3RyLCBhT3V0UGFyYW0pIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIHN0ckxlbiA9IGFTdHIubGVuZ3RoO1xuICAgIHZhciByZXN1bHQgPSAwO1xuICAgIHZhciBzaGlmdCA9IDA7XG4gICAgdmFyIGNvbnRpbnVhdGlvbiwgZGlnaXQ7XG5cbiAgICBkbyB7XG4gICAgICBpZiAoaSA+PSBzdHJMZW4pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgbW9yZSBkaWdpdHMgaW4gYmFzZSA2NCBWTFEgdmFsdWUuXCIpO1xuICAgICAgfVxuICAgICAgZGlnaXQgPSBiYXNlNjQuZGVjb2RlKGFTdHIuY2hhckF0KGkrKykpO1xuICAgICAgY29udGludWF0aW9uID0gISEoZGlnaXQgJiBWTFFfQ09OVElOVUFUSU9OX0JJVCk7XG4gICAgICBkaWdpdCAmPSBWTFFfQkFTRV9NQVNLO1xuICAgICAgcmVzdWx0ID0gcmVzdWx0ICsgKGRpZ2l0IDw8IHNoaWZ0KTtcbiAgICAgIHNoaWZ0ICs9IFZMUV9CQVNFX1NISUZUO1xuICAgIH0gd2hpbGUgKGNvbnRpbnVhdGlvbik7XG5cbiAgICBhT3V0UGFyYW0udmFsdWUgPSBmcm9tVkxRU2lnbmVkKHJlc3VsdCk7XG4gICAgYU91dFBhcmFtLnJlc3QgPSBhU3RyLnNsaWNlKGkpO1xuICB9O1xuXG59KTtcbiIsIi8qIC0qLSBNb2RlOiBqczsganMtaW5kZW50LWxldmVsOiAyOyAtKi0gKi9cbi8qXG4gKiBDb3B5cmlnaHQgMjAxMSBNb3ppbGxhIEZvdW5kYXRpb24gYW5kIGNvbnRyaWJ1dG9yc1xuICogTGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgbGljZW5zZS4gU2VlIExJQ0VOU0Ugb3I6XG4gKiBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvQlNELTMtQ2xhdXNlXG4gKi9cbmlmICh0eXBlb2YgZGVmaW5lICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGRlZmluZSA9IHJlcXVpcmUoJ2FtZGVmaW5lJykobW9kdWxlLCByZXF1aXJlKTtcbn1cbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG5cbiAgdmFyIGNoYXJUb0ludE1hcCA9IHt9O1xuICB2YXIgaW50VG9DaGFyTWFwID0ge307XG5cbiAgJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG4gICAgLnNwbGl0KCcnKVxuICAgIC5mb3JFYWNoKGZ1bmN0aW9uIChjaCwgaW5kZXgpIHtcbiAgICAgIGNoYXJUb0ludE1hcFtjaF0gPSBpbmRleDtcbiAgICAgIGludFRvQ2hhck1hcFtpbmRleF0gPSBjaDtcbiAgICB9KTtcblxuICAvKipcbiAgICogRW5jb2RlIGFuIGludGVnZXIgaW4gdGhlIHJhbmdlIG9mIDAgdG8gNjMgdG8gYSBzaW5nbGUgYmFzZSA2NCBkaWdpdC5cbiAgICovXG4gIGV4cG9ydHMuZW5jb2RlID0gZnVuY3Rpb24gYmFzZTY0X2VuY29kZShhTnVtYmVyKSB7XG4gICAgaWYgKGFOdW1iZXIgaW4gaW50VG9DaGFyTWFwKSB7XG4gICAgICByZXR1cm4gaW50VG9DaGFyTWFwW2FOdW1iZXJdO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTXVzdCBiZSBiZXR3ZWVuIDAgYW5kIDYzOiBcIiArIGFOdW1iZXIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBEZWNvZGUgYSBzaW5nbGUgYmFzZSA2NCBkaWdpdCB0byBhbiBpbnRlZ2VyLlxuICAgKi9cbiAgZXhwb3J0cy5kZWNvZGUgPSBmdW5jdGlvbiBiYXNlNjRfZGVjb2RlKGFDaGFyKSB7XG4gICAgaWYgKGFDaGFyIGluIGNoYXJUb0ludE1hcCkge1xuICAgICAgcmV0dXJuIGNoYXJUb0ludE1hcFthQ2hhcl07XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJOb3QgYSB2YWxpZCBiYXNlIDY0IGRpZ2l0OiBcIiArIGFDaGFyKTtcbiAgfTtcblxufSk7XG4iLCIvKiAtKi0gTW9kZToganM7IGpzLWluZGVudC1sZXZlbDogMjsgLSotICovXG4vKlxuICogQ29weXJpZ2h0IDIwMTEgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFIG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBkZWZpbmUgPSByZXF1aXJlKCdhbWRlZmluZScpKG1vZHVsZSwgcmVxdWlyZSk7XG59XG5kZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmUgaW1wbGVtZW50YXRpb24gb2YgYmluYXJ5IHNlYXJjaC5cbiAgICpcbiAgICogQHBhcmFtIGFMb3cgSW5kaWNlcyBoZXJlIGFuZCBsb3dlciBkbyBub3QgY29udGFpbiB0aGUgbmVlZGxlLlxuICAgKiBAcGFyYW0gYUhpZ2ggSW5kaWNlcyBoZXJlIGFuZCBoaWdoZXIgZG8gbm90IGNvbnRhaW4gdGhlIG5lZWRsZS5cbiAgICogQHBhcmFtIGFOZWVkbGUgVGhlIGVsZW1lbnQgYmVpbmcgc2VhcmNoZWQgZm9yLlxuICAgKiBAcGFyYW0gYUhheXN0YWNrIFRoZSBub24tZW1wdHkgYXJyYXkgYmVpbmcgc2VhcmNoZWQuXG4gICAqIEBwYXJhbSBhQ29tcGFyZSBGdW5jdGlvbiB3aGljaCB0YWtlcyB0d28gZWxlbWVudHMgYW5kIHJldHVybnMgLTEsIDAsIG9yIDEuXG4gICAqL1xuICBmdW5jdGlvbiByZWN1cnNpdmVTZWFyY2goYUxvdywgYUhpZ2gsIGFOZWVkbGUsIGFIYXlzdGFjaywgYUNvbXBhcmUpIHtcbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHRlcm1pbmF0ZXMgd2hlbiBvbmUgb2YgdGhlIGZvbGxvd2luZyBpcyB0cnVlOlxuICAgIC8vXG4gICAgLy8gICAxLiBXZSBmaW5kIHRoZSBleGFjdCBlbGVtZW50IHdlIGFyZSBsb29raW5nIGZvci5cbiAgICAvL1xuICAgIC8vICAgMi4gV2UgZGlkIG5vdCBmaW5kIHRoZSBleGFjdCBlbGVtZW50LCBidXQgd2UgY2FuIHJldHVybiB0aGUgaW5kZXggb2ZcbiAgICAvLyAgICAgIHRoZSBuZXh0IGNsb3Nlc3QgZWxlbWVudCB0aGF0IGlzIGxlc3MgdGhhbiB0aGF0IGVsZW1lbnQuXG4gICAgLy9cbiAgICAvLyAgIDMuIFdlIGRpZCBub3QgZmluZCB0aGUgZXhhY3QgZWxlbWVudCwgYW5kIHRoZXJlIGlzIG5vIG5leHQtY2xvc2VzdFxuICAgIC8vICAgICAgZWxlbWVudCB3aGljaCBpcyBsZXNzIHRoYW4gdGhlIG9uZSB3ZSBhcmUgc2VhcmNoaW5nIGZvciwgc28gd2VcbiAgICAvLyAgICAgIHJldHVybiAtMS5cbiAgICB2YXIgbWlkID0gTWF0aC5mbG9vcigoYUhpZ2ggLSBhTG93KSAvIDIpICsgYUxvdztcbiAgICB2YXIgY21wID0gYUNvbXBhcmUoYU5lZWRsZSwgYUhheXN0YWNrW21pZF0sIHRydWUpO1xuICAgIGlmIChjbXAgPT09IDApIHtcbiAgICAgIC8vIEZvdW5kIHRoZSBlbGVtZW50IHdlIGFyZSBsb29raW5nIGZvci5cbiAgICAgIHJldHVybiBtaWQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNtcCA+IDApIHtcbiAgICAgIC8vIGFIYXlzdGFja1ttaWRdIGlzIGdyZWF0ZXIgdGhhbiBvdXIgbmVlZGxlLlxuICAgICAgaWYgKGFIaWdoIC0gbWlkID4gMSkge1xuICAgICAgICAvLyBUaGUgZWxlbWVudCBpcyBpbiB0aGUgdXBwZXIgaGFsZi5cbiAgICAgICAgcmV0dXJuIHJlY3Vyc2l2ZVNlYXJjaChtaWQsIGFIaWdoLCBhTmVlZGxlLCBhSGF5c3RhY2ssIGFDb21wYXJlKTtcbiAgICAgIH1cbiAgICAgIC8vIFdlIGRpZCBub3QgZmluZCBhbiBleGFjdCBtYXRjaCwgcmV0dXJuIHRoZSBuZXh0IGNsb3Nlc3Qgb25lXG4gICAgICAvLyAodGVybWluYXRpb24gY2FzZSAyKS5cbiAgICAgIHJldHVybiBtaWQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gYUhheXN0YWNrW21pZF0gaXMgbGVzcyB0aGFuIG91ciBuZWVkbGUuXG4gICAgICBpZiAobWlkIC0gYUxvdyA+IDEpIHtcbiAgICAgICAgLy8gVGhlIGVsZW1lbnQgaXMgaW4gdGhlIGxvd2VyIGhhbGYuXG4gICAgICAgIHJldHVybiByZWN1cnNpdmVTZWFyY2goYUxvdywgbWlkLCBhTmVlZGxlLCBhSGF5c3RhY2ssIGFDb21wYXJlKTtcbiAgICAgIH1cbiAgICAgIC8vIFRoZSBleGFjdCBuZWVkbGUgZWxlbWVudCB3YXMgbm90IGZvdW5kIGluIHRoaXMgaGF5c3RhY2suIERldGVybWluZSBpZlxuICAgICAgLy8gd2UgYXJlIGluIHRlcm1pbmF0aW9uIGNhc2UgKDIpIG9yICgzKSBhbmQgcmV0dXJuIHRoZSBhcHByb3ByaWF0ZSB0aGluZy5cbiAgICAgIHJldHVybiBhTG93IDwgMCA/IC0xIDogYUxvdztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiBiaW5hcnkgc2VhcmNoIHdoaWNoIHdpbGwgYWx3YXlzIHRyeSBhbmQgcmV0dXJuXG4gICAqIHRoZSBpbmRleCBvZiBuZXh0IGxvd2VzdCB2YWx1ZSBjaGVja2VkIGlmIHRoZXJlIGlzIG5vIGV4YWN0IGhpdC4gVGhpcyBpc1xuICAgKiBiZWNhdXNlIG1hcHBpbmdzIGJldHdlZW4gb3JpZ2luYWwgYW5kIGdlbmVyYXRlZCBsaW5lL2NvbCBwYWlycyBhcmUgc2luZ2xlXG4gICAqIHBvaW50cywgYW5kIHRoZXJlIGlzIGFuIGltcGxpY2l0IHJlZ2lvbiBiZXR3ZWVuIGVhY2ggb2YgdGhlbSwgc28gYSBtaXNzXG4gICAqIGp1c3QgbWVhbnMgdGhhdCB5b3UgYXJlbid0IG9uIHRoZSB2ZXJ5IHN0YXJ0IG9mIGEgcmVnaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gYU5lZWRsZSBUaGUgZWxlbWVudCB5b3UgYXJlIGxvb2tpbmcgZm9yLlxuICAgKiBAcGFyYW0gYUhheXN0YWNrIFRoZSBhcnJheSB0aGF0IGlzIGJlaW5nIHNlYXJjaGVkLlxuICAgKiBAcGFyYW0gYUNvbXBhcmUgQSBmdW5jdGlvbiB3aGljaCB0YWtlcyB0aGUgbmVlZGxlIGFuZCBhbiBlbGVtZW50IGluIHRoZVxuICAgKiAgICAgYXJyYXkgYW5kIHJldHVybnMgLTEsIDAsIG9yIDEgZGVwZW5kaW5nIG9uIHdoZXRoZXIgdGhlIG5lZWRsZSBpcyBsZXNzXG4gICAqICAgICB0aGFuLCBlcXVhbCB0bywgb3IgZ3JlYXRlciB0aGFuIHRoZSBlbGVtZW50LCByZXNwZWN0aXZlbHkuXG4gICAqL1xuICBleHBvcnRzLnNlYXJjaCA9IGZ1bmN0aW9uIHNlYXJjaChhTmVlZGxlLCBhSGF5c3RhY2ssIGFDb21wYXJlKSB7XG4gICAgaWYgKGFIYXlzdGFjay5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgcmV0dXJuIHJlY3Vyc2l2ZVNlYXJjaCgtMSwgYUhheXN0YWNrLmxlbmd0aCwgYU5lZWRsZSwgYUhheXN0YWNrLCBhQ29tcGFyZSlcbiAgfTtcblxufSk7XG4iLCIvKiAtKi0gTW9kZToganM7IGpzLWluZGVudC1sZXZlbDogMjsgLSotICovXG4vKlxuICogQ29weXJpZ2h0IDIwMTQgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFIG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBkZWZpbmUgPSByZXF1aXJlKCdhbWRlZmluZScpKG1vZHVsZSwgcmVxdWlyZSk7XG59XG5kZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gIHZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbiAgLyoqXG4gICAqIERldGVybWluZSB3aGV0aGVyIG1hcHBpbmdCIGlzIGFmdGVyIG1hcHBpbmdBIHdpdGggcmVzcGVjdCB0byBnZW5lcmF0ZWRcbiAgICogcG9zaXRpb24uXG4gICAqL1xuICBmdW5jdGlvbiBnZW5lcmF0ZWRQb3NpdGlvbkFmdGVyKG1hcHBpbmdBLCBtYXBwaW5nQikge1xuICAgIC8vIE9wdGltaXplZCBmb3IgbW9zdCBjb21tb24gY2FzZVxuICAgIHZhciBsaW5lQSA9IG1hcHBpbmdBLmdlbmVyYXRlZExpbmU7XG4gICAgdmFyIGxpbmVCID0gbWFwcGluZ0IuZ2VuZXJhdGVkTGluZTtcbiAgICB2YXIgY29sdW1uQSA9IG1hcHBpbmdBLmdlbmVyYXRlZENvbHVtbjtcbiAgICB2YXIgY29sdW1uQiA9IG1hcHBpbmdCLmdlbmVyYXRlZENvbHVtbjtcbiAgICByZXR1cm4gbGluZUIgPiBsaW5lQSB8fCBsaW5lQiA9PSBsaW5lQSAmJiBjb2x1bW5CID49IGNvbHVtbkEgfHxcbiAgICAgICAgICAgdXRpbC5jb21wYXJlQnlHZW5lcmF0ZWRQb3NpdGlvbnMobWFwcGluZ0EsIG1hcHBpbmdCKSA8PSAwO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgZGF0YSBzdHJ1Y3R1cmUgdG8gcHJvdmlkZSBhIHNvcnRlZCB2aWV3IG9mIGFjY3VtdWxhdGVkIG1hcHBpbmdzIGluIGFcbiAgICogcGVyZm9ybWFuY2UgY29uc2Npb3VzIG1hbm5lci4gSXQgdHJhZGVzIGEgbmVnbGliYWJsZSBvdmVyaGVhZCBpbiBnZW5lcmFsXG4gICAqIGNhc2UgZm9yIGEgbGFyZ2Ugc3BlZWR1cCBpbiBjYXNlIG9mIG1hcHBpbmdzIGJlaW5nIGFkZGVkIGluIG9yZGVyLlxuICAgKi9cbiAgZnVuY3Rpb24gTWFwcGluZ0xpc3QoKSB7XG4gICAgdGhpcy5fYXJyYXkgPSBbXTtcbiAgICB0aGlzLl9zb3J0ZWQgPSB0cnVlO1xuICAgIC8vIFNlcnZlcyBhcyBpbmZpbXVtXG4gICAgdGhpcy5fbGFzdCA9IHtnZW5lcmF0ZWRMaW5lOiAtMSwgZ2VuZXJhdGVkQ29sdW1uOiAwfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIHRocm91Z2ggaW50ZXJuYWwgaXRlbXMuIFRoaXMgbWV0aG9kIHRha2VzIHRoZSBzYW1lIGFyZ3VtZW50cyB0aGF0XG4gICAqIGBBcnJheS5wcm90b3R5cGUuZm9yRWFjaGAgdGFrZXMuXG4gICAqXG4gICAqIE5PVEU6IFRoZSBvcmRlciBvZiB0aGUgbWFwcGluZ3MgaXMgTk9UIGd1YXJhbnRlZWQuXG4gICAqL1xuICBNYXBwaW5nTGlzdC5wcm90b3R5cGUudW5zb3J0ZWRGb3JFYWNoID1cbiAgICBmdW5jdGlvbiBNYXBwaW5nTGlzdF9mb3JFYWNoKGFDYWxsYmFjaywgYVRoaXNBcmcpIHtcbiAgICAgIHRoaXMuX2FycmF5LmZvckVhY2goYUNhbGxiYWNrLCBhVGhpc0FyZyk7XG4gICAgfTtcblxuICAvKipcbiAgICogQWRkIHRoZSBnaXZlbiBzb3VyY2UgbWFwcGluZy5cbiAgICpcbiAgICogQHBhcmFtIE9iamVjdCBhTWFwcGluZ1xuICAgKi9cbiAgTWFwcGluZ0xpc3QucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIE1hcHBpbmdMaXN0X2FkZChhTWFwcGluZykge1xuICAgIHZhciBtYXBwaW5nO1xuICAgIGlmIChnZW5lcmF0ZWRQb3NpdGlvbkFmdGVyKHRoaXMuX2xhc3QsIGFNYXBwaW5nKSkge1xuICAgICAgdGhpcy5fbGFzdCA9IGFNYXBwaW5nO1xuICAgICAgdGhpcy5fYXJyYXkucHVzaChhTWFwcGluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3NvcnRlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5fYXJyYXkucHVzaChhTWFwcGluZyk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBmbGF0LCBzb3J0ZWQgYXJyYXkgb2YgbWFwcGluZ3MuIFRoZSBtYXBwaW5ncyBhcmUgc29ydGVkIGJ5XG4gICAqIGdlbmVyYXRlZCBwb3NpdGlvbi5cbiAgICpcbiAgICogV0FSTklORzogVGhpcyBtZXRob2QgcmV0dXJucyBpbnRlcm5hbCBkYXRhIHdpdGhvdXQgY29weWluZywgZm9yXG4gICAqIHBlcmZvcm1hbmNlLiBUaGUgcmV0dXJuIHZhbHVlIG11c3QgTk9UIGJlIG11dGF0ZWQsIGFuZCBzaG91bGQgYmUgdHJlYXRlZCBhc1xuICAgKiBhbiBpbW11dGFibGUgYm9ycm93LiBJZiB5b3Ugd2FudCB0byB0YWtlIG93bmVyc2hpcCwgeW91IG11c3QgbWFrZSB5b3VyIG93blxuICAgKiBjb3B5LlxuICAgKi9cbiAgTWFwcGluZ0xpc3QucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbiBNYXBwaW5nTGlzdF90b0FycmF5KCkge1xuICAgIGlmICghdGhpcy5fc29ydGVkKSB7XG4gICAgICB0aGlzLl9hcnJheS5zb3J0KHV0aWwuY29tcGFyZUJ5R2VuZXJhdGVkUG9zaXRpb25zKTtcbiAgICAgIHRoaXMuX3NvcnRlZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9hcnJheTtcbiAgfTtcblxuICBleHBvcnRzLk1hcHBpbmdMaXN0ID0gTWFwcGluZ0xpc3Q7XG5cbn0pO1xuIiwiLyogLSotIE1vZGU6IGpzOyBqcy1pbmRlbnQtbGV2ZWw6IDI7IC0qLSAqL1xuLypcbiAqIENvcHlyaWdodCAyMDExIE1vemlsbGEgRm91bmRhdGlvbiBhbmQgY29udHJpYnV0b3JzXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBsaWNlbnNlLiBTZWUgTElDRU5TRSBvcjpcbiAqIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9CU0QtMy1DbGF1c2VcbiAqL1xuaWYgKHR5cGVvZiBkZWZpbmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgZGVmaW5lID0gcmVxdWlyZSgnYW1kZWZpbmUnKShtb2R1bGUsIHJlcXVpcmUpO1xufVxuZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcblxuICB2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuICB2YXIgYmluYXJ5U2VhcmNoID0gcmVxdWlyZSgnLi9iaW5hcnktc2VhcmNoJyk7XG4gIHZhciBBcnJheVNldCA9IHJlcXVpcmUoJy4vYXJyYXktc2V0JykuQXJyYXlTZXQ7XG4gIHZhciBiYXNlNjRWTFEgPSByZXF1aXJlKCcuL2Jhc2U2NC12bHEnKTtcblxuICAvKipcbiAgICogQSBTb3VyY2VNYXBDb25zdW1lciBpbnN0YW5jZSByZXByZXNlbnRzIGEgcGFyc2VkIHNvdXJjZSBtYXAgd2hpY2ggd2UgY2FuXG4gICAqIHF1ZXJ5IGZvciBpbmZvcm1hdGlvbiBhYm91dCB0aGUgb3JpZ2luYWwgZmlsZSBwb3NpdGlvbnMgYnkgZ2l2aW5nIGl0IGEgZmlsZVxuICAgKiBwb3NpdGlvbiBpbiB0aGUgZ2VuZXJhdGVkIHNvdXJjZS5cbiAgICpcbiAgICogVGhlIG9ubHkgcGFyYW1ldGVyIGlzIHRoZSByYXcgc291cmNlIG1hcCAoZWl0aGVyIGFzIGEgSlNPTiBzdHJpbmcsIG9yXG4gICAqIGFscmVhZHkgcGFyc2VkIHRvIGFuIG9iamVjdCkuIEFjY29yZGluZyB0byB0aGUgc3BlYywgc291cmNlIG1hcHMgaGF2ZSB0aGVcbiAgICogZm9sbG93aW5nIGF0dHJpYnV0ZXM6XG4gICAqXG4gICAqICAgLSB2ZXJzaW9uOiBXaGljaCB2ZXJzaW9uIG9mIHRoZSBzb3VyY2UgbWFwIHNwZWMgdGhpcyBtYXAgaXMgZm9sbG93aW5nLlxuICAgKiAgIC0gc291cmNlczogQW4gYXJyYXkgb2YgVVJMcyB0byB0aGUgb3JpZ2luYWwgc291cmNlIGZpbGVzLlxuICAgKiAgIC0gbmFtZXM6IEFuIGFycmF5IG9mIGlkZW50aWZpZXJzIHdoaWNoIGNhbiBiZSByZWZlcnJlbmNlZCBieSBpbmRpdmlkdWFsIG1hcHBpbmdzLlxuICAgKiAgIC0gc291cmNlUm9vdDogT3B0aW9uYWwuIFRoZSBVUkwgcm9vdCBmcm9tIHdoaWNoIGFsbCBzb3VyY2VzIGFyZSByZWxhdGl2ZS5cbiAgICogICAtIHNvdXJjZXNDb250ZW50OiBPcHRpb25hbC4gQW4gYXJyYXkgb2YgY29udGVudHMgb2YgdGhlIG9yaWdpbmFsIHNvdXJjZSBmaWxlcy5cbiAgICogICAtIG1hcHBpbmdzOiBBIHN0cmluZyBvZiBiYXNlNjQgVkxRcyB3aGljaCBjb250YWluIHRoZSBhY3R1YWwgbWFwcGluZ3MuXG4gICAqICAgLSBmaWxlOiBPcHRpb25hbC4gVGhlIGdlbmVyYXRlZCBmaWxlIHRoaXMgc291cmNlIG1hcCBpcyBhc3NvY2lhdGVkIHdpdGguXG4gICAqXG4gICAqIEhlcmUgaXMgYW4gZXhhbXBsZSBzb3VyY2UgbWFwLCB0YWtlbiBmcm9tIHRoZSBzb3VyY2UgbWFwIHNwZWNbMF06XG4gICAqXG4gICAqICAgICB7XG4gICAqICAgICAgIHZlcnNpb24gOiAzLFxuICAgKiAgICAgICBmaWxlOiBcIm91dC5qc1wiLFxuICAgKiAgICAgICBzb3VyY2VSb290IDogXCJcIixcbiAgICogICAgICAgc291cmNlczogW1wiZm9vLmpzXCIsIFwiYmFyLmpzXCJdLFxuICAgKiAgICAgICBuYW1lczogW1wic3JjXCIsIFwibWFwc1wiLCBcImFyZVwiLCBcImZ1blwiXSxcbiAgICogICAgICAgbWFwcGluZ3M6IFwiQUEsQUI7O0FCQ0RFO1wiXG4gICAqICAgICB9XG4gICAqXG4gICAqIFswXTogaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZG9jdW1lbnQvZC8xVTFSR0FlaFF3UnlwVVRvdkYxS1JscGlPRnplMGItXzJnYzZmQUgwS1kway9lZGl0P3BsaT0xI1xuICAgKi9cbiAgZnVuY3Rpb24gU291cmNlTWFwQ29uc3VtZXIoYVNvdXJjZU1hcCkge1xuICAgIHZhciBzb3VyY2VNYXAgPSBhU291cmNlTWFwO1xuICAgIGlmICh0eXBlb2YgYVNvdXJjZU1hcCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHNvdXJjZU1hcCA9IEpTT04ucGFyc2UoYVNvdXJjZU1hcC5yZXBsYWNlKC9eXFwpXFxdXFx9Jy8sICcnKSk7XG4gICAgfVxuXG4gICAgdmFyIHZlcnNpb24gPSB1dGlsLmdldEFyZyhzb3VyY2VNYXAsICd2ZXJzaW9uJyk7XG4gICAgdmFyIHNvdXJjZXMgPSB1dGlsLmdldEFyZyhzb3VyY2VNYXAsICdzb3VyY2VzJyk7XG4gICAgLy8gU2FzcyAzLjMgbGVhdmVzIG91dCB0aGUgJ25hbWVzJyBhcnJheSwgc28gd2UgZGV2aWF0ZSBmcm9tIHRoZSBzcGVjICh3aGljaFxuICAgIC8vIHJlcXVpcmVzIHRoZSBhcnJheSkgdG8gcGxheSBuaWNlIGhlcmUuXG4gICAgdmFyIG5hbWVzID0gdXRpbC5nZXRBcmcoc291cmNlTWFwLCAnbmFtZXMnLCBbXSk7XG4gICAgdmFyIHNvdXJjZVJvb3QgPSB1dGlsLmdldEFyZyhzb3VyY2VNYXAsICdzb3VyY2VSb290JywgbnVsbCk7XG4gICAgdmFyIHNvdXJjZXNDb250ZW50ID0gdXRpbC5nZXRBcmcoc291cmNlTWFwLCAnc291cmNlc0NvbnRlbnQnLCBudWxsKTtcbiAgICB2YXIgbWFwcGluZ3MgPSB1dGlsLmdldEFyZyhzb3VyY2VNYXAsICdtYXBwaW5ncycpO1xuICAgIHZhciBmaWxlID0gdXRpbC5nZXRBcmcoc291cmNlTWFwLCAnZmlsZScsIG51bGwpO1xuXG4gICAgLy8gT25jZSBhZ2FpbiwgU2FzcyBkZXZpYXRlcyBmcm9tIHRoZSBzcGVjIGFuZCBzdXBwbGllcyB0aGUgdmVyc2lvbiBhcyBhXG4gICAgLy8gc3RyaW5nIHJhdGhlciB0aGFuIGEgbnVtYmVyLCBzbyB3ZSB1c2UgbG9vc2UgZXF1YWxpdHkgY2hlY2tpbmcgaGVyZS5cbiAgICBpZiAodmVyc2lvbiAhPSB0aGlzLl92ZXJzaW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIHZlcnNpb246ICcgKyB2ZXJzaW9uKTtcbiAgICB9XG5cbiAgICAvLyBTb21lIHNvdXJjZSBtYXBzIHByb2R1Y2UgcmVsYXRpdmUgc291cmNlIHBhdGhzIGxpa2UgXCIuL2Zvby5qc1wiIGluc3RlYWQgb2ZcbiAgICAvLyBcImZvby5qc1wiLiAgTm9ybWFsaXplIHRoZXNlIGZpcnN0IHNvIHRoYXQgZnV0dXJlIGNvbXBhcmlzb25zIHdpbGwgc3VjY2VlZC5cbiAgICAvLyBTZWUgYnVnemlsLmxhLzEwOTA3NjguXG4gICAgc291cmNlcyA9IHNvdXJjZXMubWFwKHV0aWwubm9ybWFsaXplKTtcblxuICAgIC8vIFBhc3MgYHRydWVgIGJlbG93IHRvIGFsbG93IGR1cGxpY2F0ZSBuYW1lcyBhbmQgc291cmNlcy4gV2hpbGUgc291cmNlIG1hcHNcbiAgICAvLyBhcmUgaW50ZW5kZWQgdG8gYmUgY29tcHJlc3NlZCBhbmQgZGVkdXBsaWNhdGVkLCB0aGUgVHlwZVNjcmlwdCBjb21waWxlclxuICAgIC8vIHNvbWV0aW1lcyBnZW5lcmF0ZXMgc291cmNlIG1hcHMgd2l0aCBkdXBsaWNhdGVzIGluIHRoZW0uIFNlZSBHaXRodWIgaXNzdWVcbiAgICAvLyAjNzIgYW5kIGJ1Z3ppbC5sYS84ODk0OTIuXG4gICAgdGhpcy5fbmFtZXMgPSBBcnJheVNldC5mcm9tQXJyYXkobmFtZXMsIHRydWUpO1xuICAgIHRoaXMuX3NvdXJjZXMgPSBBcnJheVNldC5mcm9tQXJyYXkoc291cmNlcywgdHJ1ZSk7XG5cbiAgICB0aGlzLnNvdXJjZVJvb3QgPSBzb3VyY2VSb290O1xuICAgIHRoaXMuc291cmNlc0NvbnRlbnQgPSBzb3VyY2VzQ29udGVudDtcbiAgICB0aGlzLl9tYXBwaW5ncyA9IG1hcHBpbmdzO1xuICAgIHRoaXMuZmlsZSA9IGZpbGU7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgU291cmNlTWFwQ29uc3VtZXIgZnJvbSBhIFNvdXJjZU1hcEdlbmVyYXRvci5cbiAgICpcbiAgICogQHBhcmFtIFNvdXJjZU1hcEdlbmVyYXRvciBhU291cmNlTWFwXG4gICAqICAgICAgICBUaGUgc291cmNlIG1hcCB0aGF0IHdpbGwgYmUgY29uc3VtZWQuXG4gICAqIEByZXR1cm5zIFNvdXJjZU1hcENvbnN1bWVyXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5mcm9tU291cmNlTWFwID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBDb25zdW1lcl9mcm9tU291cmNlTWFwKGFTb3VyY2VNYXApIHtcbiAgICAgIHZhciBzbWMgPSBPYmplY3QuY3JlYXRlKFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZSk7XG5cbiAgICAgIHNtYy5fbmFtZXMgPSBBcnJheVNldC5mcm9tQXJyYXkoYVNvdXJjZU1hcC5fbmFtZXMudG9BcnJheSgpLCB0cnVlKTtcbiAgICAgIHNtYy5fc291cmNlcyA9IEFycmF5U2V0LmZyb21BcnJheShhU291cmNlTWFwLl9zb3VyY2VzLnRvQXJyYXkoKSwgdHJ1ZSk7XG4gICAgICBzbWMuc291cmNlUm9vdCA9IGFTb3VyY2VNYXAuX3NvdXJjZVJvb3Q7XG4gICAgICBzbWMuc291cmNlc0NvbnRlbnQgPSBhU291cmNlTWFwLl9nZW5lcmF0ZVNvdXJjZXNDb250ZW50KHNtYy5fc291cmNlcy50b0FycmF5KCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNtYy5zb3VyY2VSb290KTtcbiAgICAgIHNtYy5maWxlID0gYVNvdXJjZU1hcC5fZmlsZTtcblxuICAgICAgc21jLl9fZ2VuZXJhdGVkTWFwcGluZ3MgPSBhU291cmNlTWFwLl9tYXBwaW5ncy50b0FycmF5KCkuc2xpY2UoKTtcbiAgICAgIHNtYy5fX29yaWdpbmFsTWFwcGluZ3MgPSBhU291cmNlTWFwLl9tYXBwaW5ncy50b0FycmF5KCkuc2xpY2UoKVxuICAgICAgICAuc29ydCh1dGlsLmNvbXBhcmVCeU9yaWdpbmFsUG9zaXRpb25zKTtcblxuICAgICAgcmV0dXJuIHNtYztcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBUaGUgdmVyc2lvbiBvZiB0aGUgc291cmNlIG1hcHBpbmcgc3BlYyB0aGF0IHdlIGFyZSBjb25zdW1pbmcuXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuX3ZlcnNpb24gPSAzO1xuXG4gIC8qKlxuICAgKiBUaGUgbGlzdCBvZiBvcmlnaW5hbCBzb3VyY2VzLlxuICAgKi9cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZSwgJ3NvdXJjZXMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc291cmNlcy50b0FycmF5KCkubWFwKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNvdXJjZVJvb3QgIT0gbnVsbCA/IHV0aWwuam9pbih0aGlzLnNvdXJjZVJvb3QsIHMpIDogcztcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gYF9fZ2VuZXJhdGVkTWFwcGluZ3NgIGFuZCBgX19vcmlnaW5hbE1hcHBpbmdzYCBhcmUgYXJyYXlzIHRoYXQgaG9sZCB0aGVcbiAgLy8gcGFyc2VkIG1hcHBpbmcgY29vcmRpbmF0ZXMgZnJvbSB0aGUgc291cmNlIG1hcCdzIFwibWFwcGluZ3NcIiBhdHRyaWJ1dGUuIFRoZXlcbiAgLy8gYXJlIGxhemlseSBpbnN0YW50aWF0ZWQsIGFjY2Vzc2VkIHZpYSB0aGUgYF9nZW5lcmF0ZWRNYXBwaW5nc2AgYW5kXG4gIC8vIGBfb3JpZ2luYWxNYXBwaW5nc2AgZ2V0dGVycyByZXNwZWN0aXZlbHksIGFuZCB3ZSBvbmx5IHBhcnNlIHRoZSBtYXBwaW5nc1xuICAvLyBhbmQgY3JlYXRlIHRoZXNlIGFycmF5cyBvbmNlIHF1ZXJpZWQgZm9yIGEgc291cmNlIGxvY2F0aW9uLiBXZSBqdW1wIHRocm91Z2hcbiAgLy8gdGhlc2UgaG9vcHMgYmVjYXVzZSB0aGVyZSBjYW4gYmUgbWFueSB0aG91c2FuZHMgb2YgbWFwcGluZ3MsIGFuZCBwYXJzaW5nXG4gIC8vIHRoZW0gaXMgZXhwZW5zaXZlLCBzbyB3ZSBvbmx5IHdhbnQgdG8gZG8gaXQgaWYgd2UgbXVzdC5cbiAgLy9cbiAgLy8gRWFjaCBvYmplY3QgaW4gdGhlIGFycmF5cyBpcyBvZiB0aGUgZm9ybTpcbiAgLy9cbiAgLy8gICAgIHtcbiAgLy8gICAgICAgZ2VuZXJhdGVkTGluZTogVGhlIGxpbmUgbnVtYmVyIGluIHRoZSBnZW5lcmF0ZWQgY29kZSxcbiAgLy8gICAgICAgZ2VuZXJhdGVkQ29sdW1uOiBUaGUgY29sdW1uIG51bWJlciBpbiB0aGUgZ2VuZXJhdGVkIGNvZGUsXG4gIC8vICAgICAgIHNvdXJjZTogVGhlIHBhdGggdG8gdGhlIG9yaWdpbmFsIHNvdXJjZSBmaWxlIHRoYXQgZ2VuZXJhdGVkIHRoaXNcbiAgLy8gICAgICAgICAgICAgICBjaHVuayBvZiBjb2RlLFxuICAvLyAgICAgICBvcmlnaW5hbExpbmU6IFRoZSBsaW5lIG51bWJlciBpbiB0aGUgb3JpZ2luYWwgc291cmNlIHRoYXRcbiAgLy8gICAgICAgICAgICAgICAgICAgICBjb3JyZXNwb25kcyB0byB0aGlzIGNodW5rIG9mIGdlbmVyYXRlZCBjb2RlLFxuICAvLyAgICAgICBvcmlnaW5hbENvbHVtbjogVGhlIGNvbHVtbiBudW1iZXIgaW4gdGhlIG9yaWdpbmFsIHNvdXJjZSB0aGF0XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBjb3JyZXNwb25kcyB0byB0aGlzIGNodW5rIG9mIGdlbmVyYXRlZCBjb2RlLFxuICAvLyAgICAgICBuYW1lOiBUaGUgbmFtZSBvZiB0aGUgb3JpZ2luYWwgc3ltYm9sIHdoaWNoIGdlbmVyYXRlZCB0aGlzIGNodW5rIG9mXG4gIC8vICAgICAgICAgICAgIGNvZGUuXG4gIC8vICAgICB9XG4gIC8vXG4gIC8vIEFsbCBwcm9wZXJ0aWVzIGV4Y2VwdCBmb3IgYGdlbmVyYXRlZExpbmVgIGFuZCBgZ2VuZXJhdGVkQ29sdW1uYCBjYW4gYmVcbiAgLy8gYG51bGxgLlxuICAvL1xuICAvLyBgX2dlbmVyYXRlZE1hcHBpbmdzYCBpcyBvcmRlcmVkIGJ5IHRoZSBnZW5lcmF0ZWQgcG9zaXRpb25zLlxuICAvL1xuICAvLyBgX29yaWdpbmFsTWFwcGluZ3NgIGlzIG9yZGVyZWQgYnkgdGhlIG9yaWdpbmFsIHBvc2l0aW9ucy5cblxuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuX19nZW5lcmF0ZWRNYXBwaW5ncyA9IG51bGw7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUsICdfZ2VuZXJhdGVkTWFwcGluZ3MnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIXRoaXMuX19nZW5lcmF0ZWRNYXBwaW5ncykge1xuICAgICAgICB0aGlzLl9fZ2VuZXJhdGVkTWFwcGluZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fX29yaWdpbmFsTWFwcGluZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcGFyc2VNYXBwaW5ncyh0aGlzLl9tYXBwaW5ncywgdGhpcy5zb3VyY2VSb290KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX19nZW5lcmF0ZWRNYXBwaW5ncztcbiAgICB9XG4gIH0pO1xuXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5fX29yaWdpbmFsTWFwcGluZ3MgPSBudWxsO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlLCAnX29yaWdpbmFsTWFwcGluZ3MnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIXRoaXMuX19vcmlnaW5hbE1hcHBpbmdzKSB7XG4gICAgICAgIHRoaXMuX19nZW5lcmF0ZWRNYXBwaW5ncyA9IFtdO1xuICAgICAgICB0aGlzLl9fb3JpZ2luYWxNYXBwaW5ncyA9IFtdO1xuICAgICAgICB0aGlzLl9wYXJzZU1hcHBpbmdzKHRoaXMuX21hcHBpbmdzLCB0aGlzLnNvdXJjZVJvb3QpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fX29yaWdpbmFsTWFwcGluZ3M7XG4gICAgfVxuICB9KTtcblxuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuX25leHRDaGFySXNNYXBwaW5nU2VwYXJhdG9yID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBDb25zdW1lcl9uZXh0Q2hhcklzTWFwcGluZ1NlcGFyYXRvcihhU3RyKSB7XG4gICAgICB2YXIgYyA9IGFTdHIuY2hhckF0KDApO1xuICAgICAgcmV0dXJuIGMgPT09IFwiO1wiIHx8IGMgPT09IFwiLFwiO1xuICAgIH07XG5cbiAgLyoqXG4gICAqIFBhcnNlIHRoZSBtYXBwaW5ncyBpbiBhIHN0cmluZyBpbiB0byBhIGRhdGEgc3RydWN0dXJlIHdoaWNoIHdlIGNhbiBlYXNpbHlcbiAgICogcXVlcnkgKHRoZSBvcmRlcmVkIGFycmF5cyBpbiB0aGUgYHRoaXMuX19nZW5lcmF0ZWRNYXBwaW5nc2AgYW5kXG4gICAqIGB0aGlzLl9fb3JpZ2luYWxNYXBwaW5nc2AgcHJvcGVydGllcykuXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuX3BhcnNlTWFwcGluZ3MgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX3BhcnNlTWFwcGluZ3MoYVN0ciwgYVNvdXJjZVJvb3QpIHtcbiAgICAgIHZhciBnZW5lcmF0ZWRMaW5lID0gMTtcbiAgICAgIHZhciBwcmV2aW91c0dlbmVyYXRlZENvbHVtbiA9IDA7XG4gICAgICB2YXIgcHJldmlvdXNPcmlnaW5hbExpbmUgPSAwO1xuICAgICAgdmFyIHByZXZpb3VzT3JpZ2luYWxDb2x1bW4gPSAwO1xuICAgICAgdmFyIHByZXZpb3VzU291cmNlID0gMDtcbiAgICAgIHZhciBwcmV2aW91c05hbWUgPSAwO1xuICAgICAgdmFyIHN0ciA9IGFTdHI7XG4gICAgICB2YXIgdGVtcCA9IHt9O1xuICAgICAgdmFyIG1hcHBpbmc7XG5cbiAgICAgIHdoaWxlIChzdHIubGVuZ3RoID4gMCkge1xuICAgICAgICBpZiAoc3RyLmNoYXJBdCgwKSA9PT0gJzsnKSB7XG4gICAgICAgICAgZ2VuZXJhdGVkTGluZSsrO1xuICAgICAgICAgIHN0ciA9IHN0ci5zbGljZSgxKTtcbiAgICAgICAgICBwcmV2aW91c0dlbmVyYXRlZENvbHVtbiA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3RyLmNoYXJBdCgwKSA9PT0gJywnKSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNsaWNlKDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1hcHBpbmcgPSB7fTtcbiAgICAgICAgICBtYXBwaW5nLmdlbmVyYXRlZExpbmUgPSBnZW5lcmF0ZWRMaW5lO1xuXG4gICAgICAgICAgLy8gR2VuZXJhdGVkIGNvbHVtbi5cbiAgICAgICAgICBiYXNlNjRWTFEuZGVjb2RlKHN0ciwgdGVtcCk7XG4gICAgICAgICAgbWFwcGluZy5nZW5lcmF0ZWRDb2x1bW4gPSBwcmV2aW91c0dlbmVyYXRlZENvbHVtbiArIHRlbXAudmFsdWU7XG4gICAgICAgICAgcHJldmlvdXNHZW5lcmF0ZWRDb2x1bW4gPSBtYXBwaW5nLmdlbmVyYXRlZENvbHVtbjtcbiAgICAgICAgICBzdHIgPSB0ZW1wLnJlc3Q7XG5cbiAgICAgICAgICBpZiAoc3RyLmxlbmd0aCA+IDAgJiYgIXRoaXMuX25leHRDaGFySXNNYXBwaW5nU2VwYXJhdG9yKHN0cikpIHtcbiAgICAgICAgICAgIC8vIE9yaWdpbmFsIHNvdXJjZS5cbiAgICAgICAgICAgIGJhc2U2NFZMUS5kZWNvZGUoc3RyLCB0ZW1wKTtcbiAgICAgICAgICAgIG1hcHBpbmcuc291cmNlID0gdGhpcy5fc291cmNlcy5hdChwcmV2aW91c1NvdXJjZSArIHRlbXAudmFsdWUpO1xuICAgICAgICAgICAgcHJldmlvdXNTb3VyY2UgKz0gdGVtcC52YWx1ZTtcbiAgICAgICAgICAgIHN0ciA9IHRlbXAucmVzdDtcbiAgICAgICAgICAgIGlmIChzdHIubGVuZ3RoID09PSAwIHx8IHRoaXMuX25leHRDaGFySXNNYXBwaW5nU2VwYXJhdG9yKHN0cikpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBhIHNvdXJjZSwgYnV0IG5vIGxpbmUgYW5kIGNvbHVtbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBPcmlnaW5hbCBsaW5lLlxuICAgICAgICAgICAgYmFzZTY0VkxRLmRlY29kZShzdHIsIHRlbXApO1xuICAgICAgICAgICAgbWFwcGluZy5vcmlnaW5hbExpbmUgPSBwcmV2aW91c09yaWdpbmFsTGluZSArIHRlbXAudmFsdWU7XG4gICAgICAgICAgICBwcmV2aW91c09yaWdpbmFsTGluZSA9IG1hcHBpbmcub3JpZ2luYWxMaW5lO1xuICAgICAgICAgICAgLy8gTGluZXMgYXJlIHN0b3JlZCAwLWJhc2VkXG4gICAgICAgICAgICBtYXBwaW5nLm9yaWdpbmFsTGluZSArPSAxO1xuICAgICAgICAgICAgc3RyID0gdGVtcC5yZXN0O1xuICAgICAgICAgICAgaWYgKHN0ci5sZW5ndGggPT09IDAgfHwgdGhpcy5fbmV4dENoYXJJc01hcHBpbmdTZXBhcmF0b3Ioc3RyKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIGEgc291cmNlIGFuZCBsaW5lLCBidXQgbm8gY29sdW1uJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE9yaWdpbmFsIGNvbHVtbi5cbiAgICAgICAgICAgIGJhc2U2NFZMUS5kZWNvZGUoc3RyLCB0ZW1wKTtcbiAgICAgICAgICAgIG1hcHBpbmcub3JpZ2luYWxDb2x1bW4gPSBwcmV2aW91c09yaWdpbmFsQ29sdW1uICsgdGVtcC52YWx1ZTtcbiAgICAgICAgICAgIHByZXZpb3VzT3JpZ2luYWxDb2x1bW4gPSBtYXBwaW5nLm9yaWdpbmFsQ29sdW1uO1xuICAgICAgICAgICAgc3RyID0gdGVtcC5yZXN0O1xuXG4gICAgICAgICAgICBpZiAoc3RyLmxlbmd0aCA+IDAgJiYgIXRoaXMuX25leHRDaGFySXNNYXBwaW5nU2VwYXJhdG9yKHN0cikpIHtcbiAgICAgICAgICAgICAgLy8gT3JpZ2luYWwgbmFtZS5cbiAgICAgICAgICAgICAgYmFzZTY0VkxRLmRlY29kZShzdHIsIHRlbXApO1xuICAgICAgICAgICAgICBtYXBwaW5nLm5hbWUgPSB0aGlzLl9uYW1lcy5hdChwcmV2aW91c05hbWUgKyB0ZW1wLnZhbHVlKTtcbiAgICAgICAgICAgICAgcHJldmlvdXNOYW1lICs9IHRlbXAudmFsdWU7XG4gICAgICAgICAgICAgIHN0ciA9IHRlbXAucmVzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLl9fZ2VuZXJhdGVkTWFwcGluZ3MucHVzaChtYXBwaW5nKTtcbiAgICAgICAgICBpZiAodHlwZW9mIG1hcHBpbmcub3JpZ2luYWxMaW5lID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdGhpcy5fX29yaWdpbmFsTWFwcGluZ3MucHVzaChtYXBwaW5nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5fX2dlbmVyYXRlZE1hcHBpbmdzLnNvcnQodXRpbC5jb21wYXJlQnlHZW5lcmF0ZWRQb3NpdGlvbnMpO1xuICAgICAgdGhpcy5fX29yaWdpbmFsTWFwcGluZ3Muc29ydCh1dGlsLmNvbXBhcmVCeU9yaWdpbmFsUG9zaXRpb25zKTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBtYXBwaW5nIHRoYXQgYmVzdCBtYXRjaGVzIHRoZSBoeXBvdGhldGljYWwgXCJuZWVkbGVcIiBtYXBwaW5nIHRoYXRcbiAgICogd2UgYXJlIHNlYXJjaGluZyBmb3IgaW4gdGhlIGdpdmVuIFwiaGF5c3RhY2tcIiBvZiBtYXBwaW5ncy5cbiAgICovXG4gIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5fZmluZE1hcHBpbmcgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX2ZpbmRNYXBwaW5nKGFOZWVkbGUsIGFNYXBwaW5ncywgYUxpbmVOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFDb2x1bW5OYW1lLCBhQ29tcGFyYXRvcikge1xuICAgICAgLy8gVG8gcmV0dXJuIHRoZSBwb3NpdGlvbiB3ZSBhcmUgc2VhcmNoaW5nIGZvciwgd2UgbXVzdCBmaXJzdCBmaW5kIHRoZVxuICAgICAgLy8gbWFwcGluZyBmb3IgdGhlIGdpdmVuIHBvc2l0aW9uIGFuZCB0aGVuIHJldHVybiB0aGUgb3Bwb3NpdGUgcG9zaXRpb24gaXRcbiAgICAgIC8vIHBvaW50cyB0by4gQmVjYXVzZSB0aGUgbWFwcGluZ3MgYXJlIHNvcnRlZCwgd2UgY2FuIHVzZSBiaW5hcnkgc2VhcmNoIHRvXG4gICAgICAvLyBmaW5kIHRoZSBiZXN0IG1hcHBpbmcuXG5cbiAgICAgIGlmIChhTmVlZGxlW2FMaW5lTmFtZV0gPD0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdMaW5lIG11c3QgYmUgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvIDEsIGdvdCAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBhTmVlZGxlW2FMaW5lTmFtZV0pO1xuICAgICAgfVxuICAgICAgaWYgKGFOZWVkbGVbYUNvbHVtbk5hbWVdIDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb2x1bW4gbXVzdCBiZSBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gMCwgZ290ICdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArIGFOZWVkbGVbYUNvbHVtbk5hbWVdKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJpbmFyeVNlYXJjaC5zZWFyY2goYU5lZWRsZSwgYU1hcHBpbmdzLCBhQ29tcGFyYXRvcik7XG4gICAgfTtcblxuICAvKipcbiAgICogQ29tcHV0ZSB0aGUgbGFzdCBjb2x1bW4gZm9yIGVhY2ggZ2VuZXJhdGVkIG1hcHBpbmcuIFRoZSBsYXN0IGNvbHVtbiBpc1xuICAgKiBpbmNsdXNpdmUuXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuY29tcHV0ZUNvbHVtblNwYW5zID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBDb25zdW1lcl9jb21wdXRlQ29sdW1uU3BhbnMoKSB7XG4gICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy5fZ2VuZXJhdGVkTWFwcGluZ3MubGVuZ3RoOyArK2luZGV4KSB7XG4gICAgICAgIHZhciBtYXBwaW5nID0gdGhpcy5fZ2VuZXJhdGVkTWFwcGluZ3NbaW5kZXhdO1xuXG4gICAgICAgIC8vIE1hcHBpbmdzIGRvIG5vdCBjb250YWluIGEgZmllbGQgZm9yIHRoZSBsYXN0IGdlbmVyYXRlZCBjb2x1bW50LiBXZVxuICAgICAgICAvLyBjYW4gY29tZSB1cCB3aXRoIGFuIG9wdGltaXN0aWMgZXN0aW1hdGUsIGhvd2V2ZXIsIGJ5IGFzc3VtaW5nIHRoYXRcbiAgICAgICAgLy8gbWFwcGluZ3MgYXJlIGNvbnRpZ3VvdXMgKGkuZS4gZ2l2ZW4gdHdvIGNvbnNlY3V0aXZlIG1hcHBpbmdzLCB0aGVcbiAgICAgICAgLy8gZmlyc3QgbWFwcGluZyBlbmRzIHdoZXJlIHRoZSBzZWNvbmQgb25lIHN0YXJ0cykuXG4gICAgICAgIGlmIChpbmRleCArIDEgPCB0aGlzLl9nZW5lcmF0ZWRNYXBwaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgbmV4dE1hcHBpbmcgPSB0aGlzLl9nZW5lcmF0ZWRNYXBwaW5nc1tpbmRleCArIDFdO1xuXG4gICAgICAgICAgaWYgKG1hcHBpbmcuZ2VuZXJhdGVkTGluZSA9PT0gbmV4dE1hcHBpbmcuZ2VuZXJhdGVkTGluZSkge1xuICAgICAgICAgICAgbWFwcGluZy5sYXN0R2VuZXJhdGVkQ29sdW1uID0gbmV4dE1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uIC0gMTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBsYXN0IG1hcHBpbmcgZm9yIGVhY2ggbGluZSBzcGFucyB0aGUgZW50aXJlIGxpbmUuXG4gICAgICAgIG1hcHBpbmcubGFzdEdlbmVyYXRlZENvbHVtbiA9IEluZmluaXR5O1xuICAgICAgfVxuICAgIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIG9yaWdpbmFsIHNvdXJjZSwgbGluZSwgYW5kIGNvbHVtbiBpbmZvcm1hdGlvbiBmb3IgdGhlIGdlbmVyYXRlZFxuICAgKiBzb3VyY2UncyBsaW5lIGFuZCBjb2x1bW4gcG9zaXRpb25zIHByb3ZpZGVkLiBUaGUgb25seSBhcmd1bWVudCBpcyBhbiBvYmplY3RcbiAgICogd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqXG4gICAqICAgLSBsaW5lOiBUaGUgbGluZSBudW1iZXIgaW4gdGhlIGdlbmVyYXRlZCBzb3VyY2UuXG4gICAqICAgLSBjb2x1bW46IFRoZSBjb2x1bW4gbnVtYmVyIGluIHRoZSBnZW5lcmF0ZWQgc291cmNlLlxuICAgKlxuICAgKiBhbmQgYW4gb2JqZWN0IGlzIHJldHVybmVkIHdpdGggdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAgIC0gc291cmNlOiBUaGUgb3JpZ2luYWwgc291cmNlIGZpbGUsIG9yIG51bGwuXG4gICAqICAgLSBsaW5lOiBUaGUgbGluZSBudW1iZXIgaW4gdGhlIG9yaWdpbmFsIHNvdXJjZSwgb3IgbnVsbC5cbiAgICogICAtIGNvbHVtbjogVGhlIGNvbHVtbiBudW1iZXIgaW4gdGhlIG9yaWdpbmFsIHNvdXJjZSwgb3IgbnVsbC5cbiAgICogICAtIG5hbWU6IFRoZSBvcmlnaW5hbCBpZGVudGlmaWVyLCBvciBudWxsLlxuICAgKi9cbiAgU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlLm9yaWdpbmFsUG9zaXRpb25Gb3IgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX29yaWdpbmFsUG9zaXRpb25Gb3IoYUFyZ3MpIHtcbiAgICAgIHZhciBuZWVkbGUgPSB7XG4gICAgICAgIGdlbmVyYXRlZExpbmU6IHV0aWwuZ2V0QXJnKGFBcmdzLCAnbGluZScpLFxuICAgICAgICBnZW5lcmF0ZWRDb2x1bW46IHV0aWwuZ2V0QXJnKGFBcmdzLCAnY29sdW1uJylcbiAgICAgIH07XG5cbiAgICAgIHZhciBpbmRleCA9IHRoaXMuX2ZpbmRNYXBwaW5nKG5lZWRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2dlbmVyYXRlZE1hcHBpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJnZW5lcmF0ZWRMaW5lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImdlbmVyYXRlZENvbHVtblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbC5jb21wYXJlQnlHZW5lcmF0ZWRQb3NpdGlvbnMpO1xuXG4gICAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICB2YXIgbWFwcGluZyA9IHRoaXMuX2dlbmVyYXRlZE1hcHBpbmdzW2luZGV4XTtcblxuICAgICAgICBpZiAobWFwcGluZy5nZW5lcmF0ZWRMaW5lID09PSBuZWVkbGUuZ2VuZXJhdGVkTGluZSkge1xuICAgICAgICAgIHZhciBzb3VyY2UgPSB1dGlsLmdldEFyZyhtYXBwaW5nLCAnc291cmNlJywgbnVsbCk7XG4gICAgICAgICAgaWYgKHNvdXJjZSAhPSBudWxsICYmIHRoaXMuc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzb3VyY2UgPSB1dGlsLmpvaW4odGhpcy5zb3VyY2VSb290LCBzb3VyY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc291cmNlOiBzb3VyY2UsXG4gICAgICAgICAgICBsaW5lOiB1dGlsLmdldEFyZyhtYXBwaW5nLCAnb3JpZ2luYWxMaW5lJywgbnVsbCksXG4gICAgICAgICAgICBjb2x1bW46IHV0aWwuZ2V0QXJnKG1hcHBpbmcsICdvcmlnaW5hbENvbHVtbicsIG51bGwpLFxuICAgICAgICAgICAgbmFtZTogdXRpbC5nZXRBcmcobWFwcGluZywgJ25hbWUnLCBudWxsKVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiBudWxsLFxuICAgICAgICBsaW5lOiBudWxsLFxuICAgICAgICBjb2x1bW46IG51bGwsXG4gICAgICAgIG5hbWU6IG51bGxcbiAgICAgIH07XG4gICAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgb3JpZ2luYWwgc291cmNlIGNvbnRlbnQuIFRoZSBvbmx5IGFyZ3VtZW50IGlzIHRoZSB1cmwgb2YgdGhlXG4gICAqIG9yaWdpbmFsIHNvdXJjZSBmaWxlLiBSZXR1cm5zIG51bGwgaWYgbm8gb3JpZ2luYWwgc291cmNlIGNvbnRlbnQgaXNcbiAgICogYXZhaWxpYmxlLlxuICAgKi9cbiAgU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlLnNvdXJjZUNvbnRlbnRGb3IgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX3NvdXJjZUNvbnRlbnRGb3IoYVNvdXJjZSkge1xuICAgICAgaWYgKCF0aGlzLnNvdXJjZXNDb250ZW50KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5zb3VyY2VSb290ICE9IG51bGwpIHtcbiAgICAgICAgYVNvdXJjZSA9IHV0aWwucmVsYXRpdmUodGhpcy5zb3VyY2VSb290LCBhU291cmNlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX3NvdXJjZXMuaGFzKGFTb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNvdXJjZXNDb250ZW50W3RoaXMuX3NvdXJjZXMuaW5kZXhPZihhU291cmNlKV07XG4gICAgICB9XG5cbiAgICAgIHZhciB1cmw7XG4gICAgICBpZiAodGhpcy5zb3VyY2VSb290ICE9IG51bGxcbiAgICAgICAgICAmJiAodXJsID0gdXRpbC51cmxQYXJzZSh0aGlzLnNvdXJjZVJvb3QpKSkge1xuICAgICAgICAvLyBYWFg6IGZpbGU6Ly8gVVJJcyBhbmQgYWJzb2x1dGUgcGF0aHMgbGVhZCB0byB1bmV4cGVjdGVkIGJlaGF2aW9yIGZvclxuICAgICAgICAvLyBtYW55IHVzZXJzLiBXZSBjYW4gaGVscCB0aGVtIG91dCB3aGVuIHRoZXkgZXhwZWN0IGZpbGU6Ly8gVVJJcyB0b1xuICAgICAgICAvLyBiZWhhdmUgbGlrZSBpdCB3b3VsZCBpZiB0aGV5IHdlcmUgcnVubmluZyBhIGxvY2FsIEhUVFAgc2VydmVyLiBTZWVcbiAgICAgICAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9ODg1NTk3LlxuICAgICAgICB2YXIgZmlsZVVyaUFic1BhdGggPSBhU291cmNlLnJlcGxhY2UoL15maWxlOlxcL1xcLy8sIFwiXCIpO1xuICAgICAgICBpZiAodXJsLnNjaGVtZSA9PSBcImZpbGVcIlxuICAgICAgICAgICAgJiYgdGhpcy5fc291cmNlcy5oYXMoZmlsZVVyaUFic1BhdGgpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc291cmNlc0NvbnRlbnRbdGhpcy5fc291cmNlcy5pbmRleE9mKGZpbGVVcmlBYnNQYXRoKV1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgoIXVybC5wYXRoIHx8IHVybC5wYXRoID09IFwiL1wiKVxuICAgICAgICAgICAgJiYgdGhpcy5fc291cmNlcy5oYXMoXCIvXCIgKyBhU291cmNlKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnNvdXJjZXNDb250ZW50W3RoaXMuX3NvdXJjZXMuaW5kZXhPZihcIi9cIiArIGFTb3VyY2UpXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIGFTb3VyY2UgKyAnXCIgaXMgbm90IGluIHRoZSBTb3VyY2VNYXAuJyk7XG4gICAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZ2VuZXJhdGVkIGxpbmUgYW5kIGNvbHVtbiBpbmZvcm1hdGlvbiBmb3IgdGhlIG9yaWdpbmFsIHNvdXJjZSxcbiAgICogbGluZSwgYW5kIGNvbHVtbiBwb3NpdGlvbnMgcHJvdmlkZWQuIFRoZSBvbmx5IGFyZ3VtZW50IGlzIGFuIG9iamVjdCB3aXRoXG4gICAqIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICpcbiAgICogICAtIHNvdXJjZTogVGhlIGZpbGVuYW1lIG9mIHRoZSBvcmlnaW5hbCBzb3VyY2UuXG4gICAqICAgLSBsaW5lOiBUaGUgbGluZSBudW1iZXIgaW4gdGhlIG9yaWdpbmFsIHNvdXJjZS5cbiAgICogICAtIGNvbHVtbjogVGhlIGNvbHVtbiBudW1iZXIgaW4gdGhlIG9yaWdpbmFsIHNvdXJjZS5cbiAgICpcbiAgICogYW5kIGFuIG9iamVjdCBpcyByZXR1cm5lZCB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICpcbiAgICogICAtIGxpbmU6IFRoZSBsaW5lIG51bWJlciBpbiB0aGUgZ2VuZXJhdGVkIHNvdXJjZSwgb3IgbnVsbC5cbiAgICogICAtIGNvbHVtbjogVGhlIGNvbHVtbiBudW1iZXIgaW4gdGhlIGdlbmVyYXRlZCBzb3VyY2UsIG9yIG51bGwuXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuZ2VuZXJhdGVkUG9zaXRpb25Gb3IgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcENvbnN1bWVyX2dlbmVyYXRlZFBvc2l0aW9uRm9yKGFBcmdzKSB7XG4gICAgICB2YXIgbmVlZGxlID0ge1xuICAgICAgICBzb3VyY2U6IHV0aWwuZ2V0QXJnKGFBcmdzLCAnc291cmNlJyksXG4gICAgICAgIG9yaWdpbmFsTGluZTogdXRpbC5nZXRBcmcoYUFyZ3MsICdsaW5lJyksXG4gICAgICAgIG9yaWdpbmFsQ29sdW1uOiB1dGlsLmdldEFyZyhhQXJncywgJ2NvbHVtbicpXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpcy5zb3VyY2VSb290ICE9IG51bGwpIHtcbiAgICAgICAgbmVlZGxlLnNvdXJjZSA9IHV0aWwucmVsYXRpdmUodGhpcy5zb3VyY2VSb290LCBuZWVkbGUuc291cmNlKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGluZGV4ID0gdGhpcy5fZmluZE1hcHBpbmcobmVlZGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3JpZ2luYWxNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3JpZ2luYWxMaW5lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9yaWdpbmFsQ29sdW1uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlsLmNvbXBhcmVCeU9yaWdpbmFsUG9zaXRpb25zKTtcblxuICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgdmFyIG1hcHBpbmcgPSB0aGlzLl9vcmlnaW5hbE1hcHBpbmdzW2luZGV4XTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGxpbmU6IHV0aWwuZ2V0QXJnKG1hcHBpbmcsICdnZW5lcmF0ZWRMaW5lJywgbnVsbCksXG4gICAgICAgICAgY29sdW1uOiB1dGlsLmdldEFyZyhtYXBwaW5nLCAnZ2VuZXJhdGVkQ29sdW1uJywgbnVsbCksXG4gICAgICAgICAgbGFzdENvbHVtbjogdXRpbC5nZXRBcmcobWFwcGluZywgJ2xhc3RHZW5lcmF0ZWRDb2x1bW4nLCBudWxsKVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBsaW5lOiBudWxsLFxuICAgICAgICBjb2x1bW46IG51bGwsXG4gICAgICAgIGxhc3RDb2x1bW46IG51bGxcbiAgICAgIH07XG4gICAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgZ2VuZXJhdGVkIGxpbmUgYW5kIGNvbHVtbiBpbmZvcm1hdGlvbiBmb3IgdGhlIG9yaWdpbmFsIHNvdXJjZVxuICAgKiBhbmQgbGluZSBwcm92aWRlZC4gVGhlIG9ubHkgYXJndW1lbnQgaXMgYW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZ1xuICAgKiBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAgIC0gc291cmNlOiBUaGUgZmlsZW5hbWUgb2YgdGhlIG9yaWdpbmFsIHNvdXJjZS5cbiAgICogICAtIGxpbmU6IFRoZSBsaW5lIG51bWJlciBpbiB0aGUgb3JpZ2luYWwgc291cmNlLlxuICAgKlxuICAgKiBhbmQgYW4gYXJyYXkgb2Ygb2JqZWN0cyBpcyByZXR1cm5lZCwgZWFjaCB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICpcbiAgICogICAtIGxpbmU6IFRoZSBsaW5lIG51bWJlciBpbiB0aGUgZ2VuZXJhdGVkIHNvdXJjZSwgb3IgbnVsbC5cbiAgICogICAtIGNvbHVtbjogVGhlIGNvbHVtbiBudW1iZXIgaW4gdGhlIGdlbmVyYXRlZCBzb3VyY2UsIG9yIG51bGwuXG4gICAqL1xuICBTb3VyY2VNYXBDb25zdW1lci5wcm90b3R5cGUuYWxsR2VuZXJhdGVkUG9zaXRpb25zRm9yID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBDb25zdW1lcl9hbGxHZW5lcmF0ZWRQb3NpdGlvbnNGb3IoYUFyZ3MpIHtcbiAgICAgIC8vIFdoZW4gdGhlcmUgaXMgbm8gZXhhY3QgbWF0Y2gsIFNvdXJjZU1hcENvbnN1bWVyLnByb3RvdHlwZS5fZmluZE1hcHBpbmdcbiAgICAgIC8vIHJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBjbG9zZXN0IG1hcHBpbmcgbGVzcyB0aGFuIHRoZSBuZWVkbGUuIEJ5XG4gICAgICAvLyBzZXR0aW5nIG5lZWRsZS5vcmlnaW5hbENvbHVtbiB0byBJbmZpbml0eSwgd2UgdGh1cyBmaW5kIHRoZSBsYXN0XG4gICAgICAvLyBtYXBwaW5nIGZvciB0aGUgZ2l2ZW4gbGluZSwgcHJvdmlkZWQgc3VjaCBhIG1hcHBpbmcgZXhpc3RzLlxuICAgICAgdmFyIG5lZWRsZSA9IHtcbiAgICAgICAgc291cmNlOiB1dGlsLmdldEFyZyhhQXJncywgJ3NvdXJjZScpLFxuICAgICAgICBvcmlnaW5hbExpbmU6IHV0aWwuZ2V0QXJnKGFBcmdzLCAnbGluZScpLFxuICAgICAgICBvcmlnaW5hbENvbHVtbjogSW5maW5pdHlcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzLnNvdXJjZVJvb3QgIT0gbnVsbCkge1xuICAgICAgICBuZWVkbGUuc291cmNlID0gdXRpbC5yZWxhdGl2ZSh0aGlzLnNvdXJjZVJvb3QsIG5lZWRsZS5zb3VyY2UpO1xuICAgICAgfVxuXG4gICAgICB2YXIgbWFwcGluZ3MgPSBbXTtcblxuICAgICAgdmFyIGluZGV4ID0gdGhpcy5fZmluZE1hcHBpbmcobmVlZGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb3JpZ2luYWxNYXBwaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3JpZ2luYWxMaW5lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9yaWdpbmFsQ29sdW1uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlsLmNvbXBhcmVCeU9yaWdpbmFsUG9zaXRpb25zKTtcbiAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIHZhciBtYXBwaW5nID0gdGhpcy5fb3JpZ2luYWxNYXBwaW5nc1tpbmRleF07XG5cbiAgICAgICAgd2hpbGUgKG1hcHBpbmcgJiYgbWFwcGluZy5vcmlnaW5hbExpbmUgPT09IG5lZWRsZS5vcmlnaW5hbExpbmUpIHtcbiAgICAgICAgICBtYXBwaW5ncy5wdXNoKHtcbiAgICAgICAgICAgIGxpbmU6IHV0aWwuZ2V0QXJnKG1hcHBpbmcsICdnZW5lcmF0ZWRMaW5lJywgbnVsbCksXG4gICAgICAgICAgICBjb2x1bW46IHV0aWwuZ2V0QXJnKG1hcHBpbmcsICdnZW5lcmF0ZWRDb2x1bW4nLCBudWxsKSxcbiAgICAgICAgICAgIGxhc3RDb2x1bW46IHV0aWwuZ2V0QXJnKG1hcHBpbmcsICdsYXN0R2VuZXJhdGVkQ29sdW1uJywgbnVsbClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIG1hcHBpbmcgPSB0aGlzLl9vcmlnaW5hbE1hcHBpbmdzWy0taW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtYXBwaW5ncy5yZXZlcnNlKCk7XG4gICAgfTtcblxuICBTb3VyY2VNYXBDb25zdW1lci5HRU5FUkFURURfT1JERVIgPSAxO1xuICBTb3VyY2VNYXBDb25zdW1lci5PUklHSU5BTF9PUkRFUiA9IDI7XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBlYWNoIG1hcHBpbmcgYmV0d2VlbiBhbiBvcmlnaW5hbCBzb3VyY2UvbGluZS9jb2x1bW4gYW5kIGFcbiAgICogZ2VuZXJhdGVkIGxpbmUvY29sdW1uIGluIHRoaXMgc291cmNlIG1hcC5cbiAgICpcbiAgICogQHBhcmFtIEZ1bmN0aW9uIGFDYWxsYmFja1xuICAgKiAgICAgICAgVGhlIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIHdpdGggZWFjaCBtYXBwaW5nLlxuICAgKiBAcGFyYW0gT2JqZWN0IGFDb250ZXh0XG4gICAqICAgICAgICBPcHRpb25hbC4gSWYgc3BlY2lmaWVkLCB0aGlzIG9iamVjdCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgZXZlcnlcbiAgICogICAgICAgIHRpbWUgdGhhdCBgYUNhbGxiYWNrYCBpcyBjYWxsZWQuXG4gICAqIEBwYXJhbSBhT3JkZXJcbiAgICogICAgICAgIEVpdGhlciBgU291cmNlTWFwQ29uc3VtZXIuR0VORVJBVEVEX09SREVSYCBvclxuICAgKiAgICAgICAgYFNvdXJjZU1hcENvbnN1bWVyLk9SSUdJTkFMX09SREVSYC4gU3BlY2lmaWVzIHdoZXRoZXIgeW91IHdhbnQgdG9cbiAgICogICAgICAgIGl0ZXJhdGUgb3ZlciB0aGUgbWFwcGluZ3Mgc29ydGVkIGJ5IHRoZSBnZW5lcmF0ZWQgZmlsZSdzIGxpbmUvY29sdW1uXG4gICAqICAgICAgICBvcmRlciBvciB0aGUgb3JpZ2luYWwncyBzb3VyY2UvbGluZS9jb2x1bW4gb3JkZXIsIHJlc3BlY3RpdmVseS4gRGVmYXVsdHMgdG9cbiAgICogICAgICAgIGBTb3VyY2VNYXBDb25zdW1lci5HRU5FUkFURURfT1JERVJgLlxuICAgKi9cbiAgU291cmNlTWFwQ29uc3VtZXIucHJvdG90eXBlLmVhY2hNYXBwaW5nID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBDb25zdW1lcl9lYWNoTWFwcGluZyhhQ2FsbGJhY2ssIGFDb250ZXh0LCBhT3JkZXIpIHtcbiAgICAgIHZhciBjb250ZXh0ID0gYUNvbnRleHQgfHwgbnVsbDtcbiAgICAgIHZhciBvcmRlciA9IGFPcmRlciB8fCBTb3VyY2VNYXBDb25zdW1lci5HRU5FUkFURURfT1JERVI7XG5cbiAgICAgIHZhciBtYXBwaW5ncztcbiAgICAgIHN3aXRjaCAob3JkZXIpIHtcbiAgICAgIGNhc2UgU291cmNlTWFwQ29uc3VtZXIuR0VORVJBVEVEX09SREVSOlxuICAgICAgICBtYXBwaW5ncyA9IHRoaXMuX2dlbmVyYXRlZE1hcHBpbmdzO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgU291cmNlTWFwQ29uc3VtZXIuT1JJR0lOQUxfT1JERVI6XG4gICAgICAgIG1hcHBpbmdzID0gdGhpcy5fb3JpZ2luYWxNYXBwaW5ncztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIG9yZGVyIG9mIGl0ZXJhdGlvbi5cIik7XG4gICAgICB9XG5cbiAgICAgIHZhciBzb3VyY2VSb290ID0gdGhpcy5zb3VyY2VSb290O1xuICAgICAgbWFwcGluZ3MubWFwKGZ1bmN0aW9uIChtYXBwaW5nKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBtYXBwaW5nLnNvdXJjZTtcbiAgICAgICAgaWYgKHNvdXJjZSAhPSBudWxsICYmIHNvdXJjZVJvb3QgIT0gbnVsbCkge1xuICAgICAgICAgIHNvdXJjZSA9IHV0aWwuam9pbihzb3VyY2VSb290LCBzb3VyY2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlOiBzb3VyY2UsXG4gICAgICAgICAgZ2VuZXJhdGVkTGluZTogbWFwcGluZy5nZW5lcmF0ZWRMaW5lLFxuICAgICAgICAgIGdlbmVyYXRlZENvbHVtbjogbWFwcGluZy5nZW5lcmF0ZWRDb2x1bW4sXG4gICAgICAgICAgb3JpZ2luYWxMaW5lOiBtYXBwaW5nLm9yaWdpbmFsTGluZSxcbiAgICAgICAgICBvcmlnaW5hbENvbHVtbjogbWFwcGluZy5vcmlnaW5hbENvbHVtbixcbiAgICAgICAgICBuYW1lOiBtYXBwaW5nLm5hbWVcbiAgICAgICAgfTtcbiAgICAgIH0pLmZvckVhY2goYUNhbGxiYWNrLCBjb250ZXh0KTtcbiAgICB9O1xuXG4gIGV4cG9ydHMuU291cmNlTWFwQ29uc3VtZXIgPSBTb3VyY2VNYXBDb25zdW1lcjtcblxufSk7XG4iLCIvKiAtKi0gTW9kZToganM7IGpzLWluZGVudC1sZXZlbDogMjsgLSotICovXG4vKlxuICogQ29weXJpZ2h0IDIwMTEgTW96aWxsYSBGb3VuZGF0aW9uIGFuZCBjb250cmlidXRvcnNcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIGxpY2Vuc2UuIFNlZSBMSUNFTlNFIG9yOlxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL0JTRC0zLUNsYXVzZVxuICovXG5pZiAodHlwZW9mIGRlZmluZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBkZWZpbmUgPSByZXF1aXJlKCdhbWRlZmluZScpKG1vZHVsZSwgcmVxdWlyZSk7XG59XG5kZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuXG4gIHZhciBiYXNlNjRWTFEgPSByZXF1aXJlKCcuL2Jhc2U2NC12bHEnKTtcbiAgdmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbiAgdmFyIEFycmF5U2V0ID0gcmVxdWlyZSgnLi9hcnJheS1zZXQnKS5BcnJheVNldDtcbiAgdmFyIE1hcHBpbmdMaXN0ID0gcmVxdWlyZSgnLi9tYXBwaW5nLWxpc3QnKS5NYXBwaW5nTGlzdDtcblxuICAvKipcbiAgICogQW4gaW5zdGFuY2Ugb2YgdGhlIFNvdXJjZU1hcEdlbmVyYXRvciByZXByZXNlbnRzIGEgc291cmNlIG1hcCB3aGljaCBpc1xuICAgKiBiZWluZyBidWlsdCBpbmNyZW1lbnRhbGx5LiBZb3UgbWF5IHBhc3MgYW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZ1xuICAgKiBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAgIC0gZmlsZTogVGhlIGZpbGVuYW1lIG9mIHRoZSBnZW5lcmF0ZWQgc291cmNlLlxuICAgKiAgIC0gc291cmNlUm9vdDogQSByb290IGZvciBhbGwgcmVsYXRpdmUgVVJMcyBpbiB0aGlzIHNvdXJjZSBtYXAuXG4gICAqL1xuICBmdW5jdGlvbiBTb3VyY2VNYXBHZW5lcmF0b3IoYUFyZ3MpIHtcbiAgICBpZiAoIWFBcmdzKSB7XG4gICAgICBhQXJncyA9IHt9O1xuICAgIH1cbiAgICB0aGlzLl9maWxlID0gdXRpbC5nZXRBcmcoYUFyZ3MsICdmaWxlJywgbnVsbCk7XG4gICAgdGhpcy5fc291cmNlUm9vdCA9IHV0aWwuZ2V0QXJnKGFBcmdzLCAnc291cmNlUm9vdCcsIG51bGwpO1xuICAgIHRoaXMuX3NraXBWYWxpZGF0aW9uID0gdXRpbC5nZXRBcmcoYUFyZ3MsICdza2lwVmFsaWRhdGlvbicsIGZhbHNlKTtcbiAgICB0aGlzLl9zb3VyY2VzID0gbmV3IEFycmF5U2V0KCk7XG4gICAgdGhpcy5fbmFtZXMgPSBuZXcgQXJyYXlTZXQoKTtcbiAgICB0aGlzLl9tYXBwaW5ncyA9IG5ldyBNYXBwaW5nTGlzdCgpO1xuICAgIHRoaXMuX3NvdXJjZXNDb250ZW50cyA9IG51bGw7XG4gIH1cblxuICBTb3VyY2VNYXBHZW5lcmF0b3IucHJvdG90eXBlLl92ZXJzaW9uID0gMztcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBTb3VyY2VNYXBHZW5lcmF0b3IgYmFzZWQgb24gYSBTb3VyY2VNYXBDb25zdW1lclxuICAgKlxuICAgKiBAcGFyYW0gYVNvdXJjZU1hcENvbnN1bWVyIFRoZSBTb3VyY2VNYXAuXG4gICAqL1xuICBTb3VyY2VNYXBHZW5lcmF0b3IuZnJvbVNvdXJjZU1hcCA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwR2VuZXJhdG9yX2Zyb21Tb3VyY2VNYXAoYVNvdXJjZU1hcENvbnN1bWVyKSB7XG4gICAgICB2YXIgc291cmNlUm9vdCA9IGFTb3VyY2VNYXBDb25zdW1lci5zb3VyY2VSb290O1xuICAgICAgdmFyIGdlbmVyYXRvciA9IG5ldyBTb3VyY2VNYXBHZW5lcmF0b3Ioe1xuICAgICAgICBmaWxlOiBhU291cmNlTWFwQ29uc3VtZXIuZmlsZSxcbiAgICAgICAgc291cmNlUm9vdDogc291cmNlUm9vdFxuICAgICAgfSk7XG4gICAgICBhU291cmNlTWFwQ29uc3VtZXIuZWFjaE1hcHBpbmcoZnVuY3Rpb24gKG1hcHBpbmcpIHtcbiAgICAgICAgdmFyIG5ld01hcHBpbmcgPSB7XG4gICAgICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgICAgICBsaW5lOiBtYXBwaW5nLmdlbmVyYXRlZExpbmUsXG4gICAgICAgICAgICBjb2x1bW46IG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChtYXBwaW5nLnNvdXJjZSAhPSBudWxsKSB7XG4gICAgICAgICAgbmV3TWFwcGluZy5zb3VyY2UgPSBtYXBwaW5nLnNvdXJjZTtcbiAgICAgICAgICBpZiAoc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgICAgICBuZXdNYXBwaW5nLnNvdXJjZSA9IHV0aWwucmVsYXRpdmUoc291cmNlUm9vdCwgbmV3TWFwcGluZy5zb3VyY2UpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG5ld01hcHBpbmcub3JpZ2luYWwgPSB7XG4gICAgICAgICAgICBsaW5lOiBtYXBwaW5nLm9yaWdpbmFsTGluZSxcbiAgICAgICAgICAgIGNvbHVtbjogbWFwcGluZy5vcmlnaW5hbENvbHVtblxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAobWFwcGluZy5uYW1lICE9IG51bGwpIHtcbiAgICAgICAgICAgIG5ld01hcHBpbmcubmFtZSA9IG1hcHBpbmcubmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBnZW5lcmF0b3IuYWRkTWFwcGluZyhuZXdNYXBwaW5nKTtcbiAgICAgIH0pO1xuICAgICAgYVNvdXJjZU1hcENvbnN1bWVyLnNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlRmlsZSkge1xuICAgICAgICB2YXIgY29udGVudCA9IGFTb3VyY2VNYXBDb25zdW1lci5zb3VyY2VDb250ZW50Rm9yKHNvdXJjZUZpbGUpO1xuICAgICAgICBpZiAoY29udGVudCAhPSBudWxsKSB7XG4gICAgICAgICAgZ2VuZXJhdG9yLnNldFNvdXJjZUNvbnRlbnQoc291cmNlRmlsZSwgY29udGVudCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGdlbmVyYXRvcjtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBBZGQgYSBzaW5nbGUgbWFwcGluZyBmcm9tIG9yaWdpbmFsIHNvdXJjZSBsaW5lIGFuZCBjb2x1bW4gdG8gdGhlIGdlbmVyYXRlZFxuICAgKiBzb3VyY2UncyBsaW5lIGFuZCBjb2x1bW4gZm9yIHRoaXMgc291cmNlIG1hcCBiZWluZyBjcmVhdGVkLiBUaGUgbWFwcGluZ1xuICAgKiBvYmplY3Qgc2hvdWxkIGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgKlxuICAgKiAgIC0gZ2VuZXJhdGVkOiBBbiBvYmplY3Qgd2l0aCB0aGUgZ2VuZXJhdGVkIGxpbmUgYW5kIGNvbHVtbiBwb3NpdGlvbnMuXG4gICAqICAgLSBvcmlnaW5hbDogQW4gb2JqZWN0IHdpdGggdGhlIG9yaWdpbmFsIGxpbmUgYW5kIGNvbHVtbiBwb3NpdGlvbnMuXG4gICAqICAgLSBzb3VyY2U6IFRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZSAocmVsYXRpdmUgdG8gdGhlIHNvdXJjZVJvb3QpLlxuICAgKiAgIC0gbmFtZTogQW4gb3B0aW9uYWwgb3JpZ2luYWwgdG9rZW4gbmFtZSBmb3IgdGhpcyBtYXBwaW5nLlxuICAgKi9cbiAgU291cmNlTWFwR2VuZXJhdG9yLnByb3RvdHlwZS5hZGRNYXBwaW5nID1cbiAgICBmdW5jdGlvbiBTb3VyY2VNYXBHZW5lcmF0b3JfYWRkTWFwcGluZyhhQXJncykge1xuICAgICAgdmFyIGdlbmVyYXRlZCA9IHV0aWwuZ2V0QXJnKGFBcmdzLCAnZ2VuZXJhdGVkJyk7XG4gICAgICB2YXIgb3JpZ2luYWwgPSB1dGlsLmdldEFyZyhhQXJncywgJ29yaWdpbmFsJywgbnVsbCk7XG4gICAgICB2YXIgc291cmNlID0gdXRpbC5nZXRBcmcoYUFyZ3MsICdzb3VyY2UnLCBudWxsKTtcbiAgICAgIHZhciBuYW1lID0gdXRpbC5nZXRBcmcoYUFyZ3MsICduYW1lJywgbnVsbCk7XG5cbiAgICAgIGlmICghdGhpcy5fc2tpcFZhbGlkYXRpb24pIHtcbiAgICAgICAgdGhpcy5fdmFsaWRhdGVNYXBwaW5nKGdlbmVyYXRlZCwgb3JpZ2luYWwsIHNvdXJjZSwgbmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzb3VyY2UgIT0gbnVsbCAmJiAhdGhpcy5fc291cmNlcy5oYXMoc291cmNlKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2VzLmFkZChzb3VyY2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAobmFtZSAhPSBudWxsICYmICF0aGlzLl9uYW1lcy5oYXMobmFtZSkpIHtcbiAgICAgICAgdGhpcy5fbmFtZXMuYWRkKG5hbWUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9tYXBwaW5ncy5hZGQoe1xuICAgICAgICBnZW5lcmF0ZWRMaW5lOiBnZW5lcmF0ZWQubGluZSxcbiAgICAgICAgZ2VuZXJhdGVkQ29sdW1uOiBnZW5lcmF0ZWQuY29sdW1uLFxuICAgICAgICBvcmlnaW5hbExpbmU6IG9yaWdpbmFsICE9IG51bGwgJiYgb3JpZ2luYWwubGluZSxcbiAgICAgICAgb3JpZ2luYWxDb2x1bW46IG9yaWdpbmFsICE9IG51bGwgJiYgb3JpZ2luYWwuY29sdW1uLFxuICAgICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgICAgbmFtZTogbmFtZVxuICAgICAgfSk7XG4gICAgfTtcblxuICAvKipcbiAgICogU2V0IHRoZSBzb3VyY2UgY29udGVudCBmb3IgYSBzb3VyY2UgZmlsZS5cbiAgICovXG4gIFNvdXJjZU1hcEdlbmVyYXRvci5wcm90b3R5cGUuc2V0U291cmNlQ29udGVudCA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwR2VuZXJhdG9yX3NldFNvdXJjZUNvbnRlbnQoYVNvdXJjZUZpbGUsIGFTb3VyY2VDb250ZW50KSB7XG4gICAgICB2YXIgc291cmNlID0gYVNvdXJjZUZpbGU7XG4gICAgICBpZiAodGhpcy5fc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgIHNvdXJjZSA9IHV0aWwucmVsYXRpdmUodGhpcy5fc291cmNlUm9vdCwgc291cmNlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFTb3VyY2VDb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBzb3VyY2UgY29udGVudCB0byB0aGUgX3NvdXJjZXNDb250ZW50cyBtYXAuXG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBfc291cmNlc0NvbnRlbnRzIG1hcCBpZiB0aGUgcHJvcGVydHkgaXMgbnVsbC5cbiAgICAgICAgaWYgKCF0aGlzLl9zb3VyY2VzQ29udGVudHMpIHtcbiAgICAgICAgICB0aGlzLl9zb3VyY2VzQ29udGVudHMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zb3VyY2VzQ29udGVudHNbdXRpbC50b1NldFN0cmluZyhzb3VyY2UpXSA9IGFTb3VyY2VDb250ZW50O1xuICAgICAgfSBlbHNlIGlmICh0aGlzLl9zb3VyY2VzQ29udGVudHMpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBzb3VyY2UgZmlsZSBmcm9tIHRoZSBfc291cmNlc0NvbnRlbnRzIG1hcC5cbiAgICAgICAgLy8gSWYgdGhlIF9zb3VyY2VzQ29udGVudHMgbWFwIGlzIGVtcHR5LCBzZXQgdGhlIHByb3BlcnR5IHRvIG51bGwuXG4gICAgICAgIGRlbGV0ZSB0aGlzLl9zb3VyY2VzQ29udGVudHNbdXRpbC50b1NldFN0cmluZyhzb3VyY2UpXTtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuX3NvdXJjZXNDb250ZW50cykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5fc291cmNlc0NvbnRlbnRzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgdGhlIG1hcHBpbmdzIG9mIGEgc3ViLXNvdXJjZS1tYXAgZm9yIGEgc3BlY2lmaWMgc291cmNlIGZpbGUgdG8gdGhlXG4gICAqIHNvdXJjZSBtYXAgYmVpbmcgZ2VuZXJhdGVkLiBFYWNoIG1hcHBpbmcgdG8gdGhlIHN1cHBsaWVkIHNvdXJjZSBmaWxlIGlzXG4gICAqIHJld3JpdHRlbiB1c2luZyB0aGUgc3VwcGxpZWQgc291cmNlIG1hcC4gTm90ZTogVGhlIHJlc29sdXRpb24gZm9yIHRoZVxuICAgKiByZXN1bHRpbmcgbWFwcGluZ3MgaXMgdGhlIG1pbmltaXVtIG9mIHRoaXMgbWFwIGFuZCB0aGUgc3VwcGxpZWQgbWFwLlxuICAgKlxuICAgKiBAcGFyYW0gYVNvdXJjZU1hcENvbnN1bWVyIFRoZSBzb3VyY2UgbWFwIHRvIGJlIGFwcGxpZWQuXG4gICAqIEBwYXJhbSBhU291cmNlRmlsZSBPcHRpb25hbC4gVGhlIGZpbGVuYW1lIG9mIHRoZSBzb3VyY2UgZmlsZS5cbiAgICogICAgICAgIElmIG9taXR0ZWQsIFNvdXJjZU1hcENvbnN1bWVyJ3MgZmlsZSBwcm9wZXJ0eSB3aWxsIGJlIHVzZWQuXG4gICAqIEBwYXJhbSBhU291cmNlTWFwUGF0aCBPcHRpb25hbC4gVGhlIGRpcm5hbWUgb2YgdGhlIHBhdGggdG8gdGhlIHNvdXJjZSBtYXBcbiAgICogICAgICAgIHRvIGJlIGFwcGxpZWQuIElmIHJlbGF0aXZlLCBpdCBpcyByZWxhdGl2ZSB0byB0aGUgU291cmNlTWFwQ29uc3VtZXIuXG4gICAqICAgICAgICBUaGlzIHBhcmFtZXRlciBpcyBuZWVkZWQgd2hlbiB0aGUgdHdvIHNvdXJjZSBtYXBzIGFyZW4ndCBpbiB0aGUgc2FtZVxuICAgKiAgICAgICAgZGlyZWN0b3J5LCBhbmQgdGhlIHNvdXJjZSBtYXAgdG8gYmUgYXBwbGllZCBjb250YWlucyByZWxhdGl2ZSBzb3VyY2VcbiAgICogICAgICAgIHBhdGhzLiBJZiBzbywgdGhvc2UgcmVsYXRpdmUgc291cmNlIHBhdGhzIG5lZWQgdG8gYmUgcmV3cml0dGVuXG4gICAqICAgICAgICByZWxhdGl2ZSB0byB0aGUgU291cmNlTWFwR2VuZXJhdG9yLlxuICAgKi9cbiAgU291cmNlTWFwR2VuZXJhdG9yLnByb3RvdHlwZS5hcHBseVNvdXJjZU1hcCA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwR2VuZXJhdG9yX2FwcGx5U291cmNlTWFwKGFTb3VyY2VNYXBDb25zdW1lciwgYVNvdXJjZUZpbGUsIGFTb3VyY2VNYXBQYXRoKSB7XG4gICAgICB2YXIgc291cmNlRmlsZSA9IGFTb3VyY2VGaWxlO1xuICAgICAgLy8gSWYgYVNvdXJjZUZpbGUgaXMgb21pdHRlZCwgd2Ugd2lsbCB1c2UgdGhlIGZpbGUgcHJvcGVydHkgb2YgdGhlIFNvdXJjZU1hcFxuICAgICAgaWYgKGFTb3VyY2VGaWxlID09IG51bGwpIHtcbiAgICAgICAgaWYgKGFTb3VyY2VNYXBDb25zdW1lci5maWxlID09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnU291cmNlTWFwR2VuZXJhdG9yLnByb3RvdHlwZS5hcHBseVNvdXJjZU1hcCByZXF1aXJlcyBlaXRoZXIgYW4gZXhwbGljaXQgc291cmNlIGZpbGUsICcgK1xuICAgICAgICAgICAgJ29yIHRoZSBzb3VyY2UgbWFwXFwncyBcImZpbGVcIiBwcm9wZXJ0eS4gQm90aCB3ZXJlIG9taXR0ZWQuJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgc291cmNlRmlsZSA9IGFTb3VyY2VNYXBDb25zdW1lci5maWxlO1xuICAgICAgfVxuICAgICAgdmFyIHNvdXJjZVJvb3QgPSB0aGlzLl9zb3VyY2VSb290O1xuICAgICAgLy8gTWFrZSBcInNvdXJjZUZpbGVcIiByZWxhdGl2ZSBpZiBhbiBhYnNvbHV0ZSBVcmwgaXMgcGFzc2VkLlxuICAgICAgaWYgKHNvdXJjZVJvb3QgIT0gbnVsbCkge1xuICAgICAgICBzb3VyY2VGaWxlID0gdXRpbC5yZWxhdGl2ZShzb3VyY2VSb290LCBzb3VyY2VGaWxlKTtcbiAgICAgIH1cbiAgICAgIC8vIEFwcGx5aW5nIHRoZSBTb3VyY2VNYXAgY2FuIGFkZCBhbmQgcmVtb3ZlIGl0ZW1zIGZyb20gdGhlIHNvdXJjZXMgYW5kXG4gICAgICAvLyB0aGUgbmFtZXMgYXJyYXkuXG4gICAgICB2YXIgbmV3U291cmNlcyA9IG5ldyBBcnJheVNldCgpO1xuICAgICAgdmFyIG5ld05hbWVzID0gbmV3IEFycmF5U2V0KCk7XG5cbiAgICAgIC8vIEZpbmQgbWFwcGluZ3MgZm9yIHRoZSBcInNvdXJjZUZpbGVcIlxuICAgICAgdGhpcy5fbWFwcGluZ3MudW5zb3J0ZWRGb3JFYWNoKGZ1bmN0aW9uIChtYXBwaW5nKSB7XG4gICAgICAgIGlmIChtYXBwaW5nLnNvdXJjZSA9PT0gc291cmNlRmlsZSAmJiBtYXBwaW5nLm9yaWdpbmFsTGluZSAhPSBudWxsKSB7XG4gICAgICAgICAgLy8gQ2hlY2sgaWYgaXQgY2FuIGJlIG1hcHBlZCBieSB0aGUgc291cmNlIG1hcCwgdGhlbiB1cGRhdGUgdGhlIG1hcHBpbmcuXG4gICAgICAgICAgdmFyIG9yaWdpbmFsID0gYVNvdXJjZU1hcENvbnN1bWVyLm9yaWdpbmFsUG9zaXRpb25Gb3Ioe1xuICAgICAgICAgICAgbGluZTogbWFwcGluZy5vcmlnaW5hbExpbmUsXG4gICAgICAgICAgICBjb2x1bW46IG1hcHBpbmcub3JpZ2luYWxDb2x1bW5cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAob3JpZ2luYWwuc291cmNlICE9IG51bGwpIHtcbiAgICAgICAgICAgIC8vIENvcHkgbWFwcGluZ1xuICAgICAgICAgICAgbWFwcGluZy5zb3VyY2UgPSBvcmlnaW5hbC5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoYVNvdXJjZU1hcFBhdGggIT0gbnVsbCkge1xuICAgICAgICAgICAgICBtYXBwaW5nLnNvdXJjZSA9IHV0aWwuam9pbihhU291cmNlTWFwUGF0aCwgbWFwcGluZy5zb3VyY2UpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIG1hcHBpbmcuc291cmNlID0gdXRpbC5yZWxhdGl2ZShzb3VyY2VSb290LCBtYXBwaW5nLnNvdXJjZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYXBwaW5nLm9yaWdpbmFsTGluZSA9IG9yaWdpbmFsLmxpbmU7XG4gICAgICAgICAgICBtYXBwaW5nLm9yaWdpbmFsQ29sdW1uID0gb3JpZ2luYWwuY29sdW1uO1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsLm5hbWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICBtYXBwaW5nLm5hbWUgPSBvcmlnaW5hbC5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzb3VyY2UgPSBtYXBwaW5nLnNvdXJjZTtcbiAgICAgICAgaWYgKHNvdXJjZSAhPSBudWxsICYmICFuZXdTb3VyY2VzLmhhcyhzb3VyY2UpKSB7XG4gICAgICAgICAgbmV3U291cmNlcy5hZGQoc291cmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuYW1lID0gbWFwcGluZy5uYW1lO1xuICAgICAgICBpZiAobmFtZSAhPSBudWxsICYmICFuZXdOYW1lcy5oYXMobmFtZSkpIHtcbiAgICAgICAgICBuZXdOYW1lcy5hZGQobmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgfSwgdGhpcyk7XG4gICAgICB0aGlzLl9zb3VyY2VzID0gbmV3U291cmNlcztcbiAgICAgIHRoaXMuX25hbWVzID0gbmV3TmFtZXM7XG5cbiAgICAgIC8vIENvcHkgc291cmNlc0NvbnRlbnRzIG9mIGFwcGxpZWQgbWFwLlxuICAgICAgYVNvdXJjZU1hcENvbnN1bWVyLnNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlRmlsZSkge1xuICAgICAgICB2YXIgY29udGVudCA9IGFTb3VyY2VNYXBDb25zdW1lci5zb3VyY2VDb250ZW50Rm9yKHNvdXJjZUZpbGUpO1xuICAgICAgICBpZiAoY29udGVudCAhPSBudWxsKSB7XG4gICAgICAgICAgaWYgKGFTb3VyY2VNYXBQYXRoICE9IG51bGwpIHtcbiAgICAgICAgICAgIHNvdXJjZUZpbGUgPSB1dGlsLmpvaW4oYVNvdXJjZU1hcFBhdGgsIHNvdXJjZUZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc291cmNlUm9vdCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzb3VyY2VGaWxlID0gdXRpbC5yZWxhdGl2ZShzb3VyY2VSb290LCBzb3VyY2VGaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5zZXRTb3VyY2VDb250ZW50KHNvdXJjZUZpbGUsIGNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBBIG1hcHBpbmcgY2FuIGhhdmUgb25lIG9mIHRoZSB0aHJlZSBsZXZlbHMgb2YgZGF0YTpcbiAgICpcbiAgICogICAxLiBKdXN0IHRoZSBnZW5lcmF0ZWQgcG9zaXRpb24uXG4gICAqICAgMi4gVGhlIEdlbmVyYXRlZCBwb3NpdGlvbiwgb3JpZ2luYWwgcG9zaXRpb24sIGFuZCBvcmlnaW5hbCBzb3VyY2UuXG4gICAqICAgMy4gR2VuZXJhdGVkIGFuZCBvcmlnaW5hbCBwb3NpdGlvbiwgb3JpZ2luYWwgc291cmNlLCBhcyB3ZWxsIGFzIGEgbmFtZVxuICAgKiAgICAgIHRva2VuLlxuICAgKlxuICAgKiBUbyBtYWludGFpbiBjb25zaXN0ZW5jeSwgd2UgdmFsaWRhdGUgdGhhdCBhbnkgbmV3IG1hcHBpbmcgYmVpbmcgYWRkZWQgZmFsbHNcbiAgICogaW4gdG8gb25lIG9mIHRoZXNlIGNhdGVnb3JpZXMuXG4gICAqL1xuICBTb3VyY2VNYXBHZW5lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0ZU1hcHBpbmcgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcEdlbmVyYXRvcl92YWxpZGF0ZU1hcHBpbmcoYUdlbmVyYXRlZCwgYU9yaWdpbmFsLCBhU291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYU5hbWUpIHtcbiAgICAgIGlmIChhR2VuZXJhdGVkICYmICdsaW5lJyBpbiBhR2VuZXJhdGVkICYmICdjb2x1bW4nIGluIGFHZW5lcmF0ZWRcbiAgICAgICAgICAmJiBhR2VuZXJhdGVkLmxpbmUgPiAwICYmIGFHZW5lcmF0ZWQuY29sdW1uID49IDBcbiAgICAgICAgICAmJiAhYU9yaWdpbmFsICYmICFhU291cmNlICYmICFhTmFtZSkge1xuICAgICAgICAvLyBDYXNlIDEuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGFHZW5lcmF0ZWQgJiYgJ2xpbmUnIGluIGFHZW5lcmF0ZWQgJiYgJ2NvbHVtbicgaW4gYUdlbmVyYXRlZFxuICAgICAgICAgICAgICAgJiYgYU9yaWdpbmFsICYmICdsaW5lJyBpbiBhT3JpZ2luYWwgJiYgJ2NvbHVtbicgaW4gYU9yaWdpbmFsXG4gICAgICAgICAgICAgICAmJiBhR2VuZXJhdGVkLmxpbmUgPiAwICYmIGFHZW5lcmF0ZWQuY29sdW1uID49IDBcbiAgICAgICAgICAgICAgICYmIGFPcmlnaW5hbC5saW5lID4gMCAmJiBhT3JpZ2luYWwuY29sdW1uID49IDBcbiAgICAgICAgICAgICAgICYmIGFTb3VyY2UpIHtcbiAgICAgICAgLy8gQ2FzZXMgMiBhbmQgMy5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtYXBwaW5nOiAnICsgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGdlbmVyYXRlZDogYUdlbmVyYXRlZCxcbiAgICAgICAgICBzb3VyY2U6IGFTb3VyY2UsXG4gICAgICAgICAgb3JpZ2luYWw6IGFPcmlnaW5hbCxcbiAgICAgICAgICBuYW1lOiBhTmFtZVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfTtcblxuICAvKipcbiAgICogU2VyaWFsaXplIHRoZSBhY2N1bXVsYXRlZCBtYXBwaW5ncyBpbiB0byB0aGUgc3RyZWFtIG9mIGJhc2UgNjQgVkxRc1xuICAgKiBzcGVjaWZpZWQgYnkgdGhlIHNvdXJjZSBtYXAgZm9ybWF0LlxuICAgKi9cbiAgU291cmNlTWFwR2VuZXJhdG9yLnByb3RvdHlwZS5fc2VyaWFsaXplTWFwcGluZ3MgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcEdlbmVyYXRvcl9zZXJpYWxpemVNYXBwaW5ncygpIHtcbiAgICAgIHZhciBwcmV2aW91c0dlbmVyYXRlZENvbHVtbiA9IDA7XG4gICAgICB2YXIgcHJldmlvdXNHZW5lcmF0ZWRMaW5lID0gMTtcbiAgICAgIHZhciBwcmV2aW91c09yaWdpbmFsQ29sdW1uID0gMDtcbiAgICAgIHZhciBwcmV2aW91c09yaWdpbmFsTGluZSA9IDA7XG4gICAgICB2YXIgcHJldmlvdXNOYW1lID0gMDtcbiAgICAgIHZhciBwcmV2aW91c1NvdXJjZSA9IDA7XG4gICAgICB2YXIgcmVzdWx0ID0gJyc7XG4gICAgICB2YXIgbWFwcGluZztcblxuICAgICAgdmFyIG1hcHBpbmdzID0gdGhpcy5fbWFwcGluZ3MudG9BcnJheSgpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbWFwcGluZ3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgbWFwcGluZyA9IG1hcHBpbmdzW2ldO1xuXG4gICAgICAgIGlmIChtYXBwaW5nLmdlbmVyYXRlZExpbmUgIT09IHByZXZpb3VzR2VuZXJhdGVkTGluZSkge1xuICAgICAgICAgIHByZXZpb3VzR2VuZXJhdGVkQ29sdW1uID0gMDtcbiAgICAgICAgICB3aGlsZSAobWFwcGluZy5nZW5lcmF0ZWRMaW5lICE9PSBwcmV2aW91c0dlbmVyYXRlZExpbmUpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSAnOyc7XG4gICAgICAgICAgICBwcmV2aW91c0dlbmVyYXRlZExpbmUrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICBpZiAoIXV0aWwuY29tcGFyZUJ5R2VuZXJhdGVkUG9zaXRpb25zKG1hcHBpbmcsIG1hcHBpbmdzW2kgLSAxXSkpIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQgKz0gJywnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdCArPSBiYXNlNjRWTFEuZW5jb2RlKG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gcHJldmlvdXNHZW5lcmF0ZWRDb2x1bW4pO1xuICAgICAgICBwcmV2aW91c0dlbmVyYXRlZENvbHVtbiA9IG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uO1xuXG4gICAgICAgIGlmIChtYXBwaW5nLnNvdXJjZSAhPSBudWxsKSB7XG4gICAgICAgICAgcmVzdWx0ICs9IGJhc2U2NFZMUS5lbmNvZGUodGhpcy5fc291cmNlcy5pbmRleE9mKG1hcHBpbmcuc291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gcHJldmlvdXNTb3VyY2UpO1xuICAgICAgICAgIHByZXZpb3VzU291cmNlID0gdGhpcy5fc291cmNlcy5pbmRleE9mKG1hcHBpbmcuc291cmNlKTtcblxuICAgICAgICAgIC8vIGxpbmVzIGFyZSBzdG9yZWQgMC1iYXNlZCBpbiBTb3VyY2VNYXAgc3BlYyB2ZXJzaW9uIDNcbiAgICAgICAgICByZXN1bHQgKz0gYmFzZTY0VkxRLmVuY29kZShtYXBwaW5nLm9yaWdpbmFsTGluZSAtIDFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIHByZXZpb3VzT3JpZ2luYWxMaW5lKTtcbiAgICAgICAgICBwcmV2aW91c09yaWdpbmFsTGluZSA9IG1hcHBpbmcub3JpZ2luYWxMaW5lIC0gMTtcblxuICAgICAgICAgIHJlc3VsdCArPSBiYXNlNjRWTFEuZW5jb2RlKG1hcHBpbmcub3JpZ2luYWxDb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIHByZXZpb3VzT3JpZ2luYWxDb2x1bW4pO1xuICAgICAgICAgIHByZXZpb3VzT3JpZ2luYWxDb2x1bW4gPSBtYXBwaW5nLm9yaWdpbmFsQ29sdW1uO1xuXG4gICAgICAgICAgaWYgKG1hcHBpbmcubmFtZSAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gYmFzZTY0VkxRLmVuY29kZSh0aGlzLl9uYW1lcy5pbmRleE9mKG1hcHBpbmcubmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0gcHJldmlvdXNOYW1lKTtcbiAgICAgICAgICAgIHByZXZpb3VzTmFtZSA9IHRoaXMuX25hbWVzLmluZGV4T2YobWFwcGluZy5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gIFNvdXJjZU1hcEdlbmVyYXRvci5wcm90b3R5cGUuX2dlbmVyYXRlU291cmNlc0NvbnRlbnQgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU1hcEdlbmVyYXRvcl9nZW5lcmF0ZVNvdXJjZXNDb250ZW50KGFTb3VyY2VzLCBhU291cmNlUm9vdCkge1xuICAgICAgcmV0dXJuIGFTb3VyY2VzLm1hcChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICAgIGlmICghdGhpcy5fc291cmNlc0NvbnRlbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFTb3VyY2VSb290ICE9IG51bGwpIHtcbiAgICAgICAgICBzb3VyY2UgPSB1dGlsLnJlbGF0aXZlKGFTb3VyY2VSb290LCBzb3VyY2UpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrZXkgPSB1dGlsLnRvU2V0U3RyaW5nKHNvdXJjZSk7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy5fc291cmNlc0NvbnRlbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSlcbiAgICAgICAgICA/IHRoaXMuX3NvdXJjZXNDb250ZW50c1trZXldXG4gICAgICAgICAgOiBudWxsO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfTtcblxuICAvKipcbiAgICogRXh0ZXJuYWxpemUgdGhlIHNvdXJjZSBtYXAuXG4gICAqL1xuICBTb3VyY2VNYXBHZW5lcmF0b3IucHJvdG90eXBlLnRvSlNPTiA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwR2VuZXJhdG9yX3RvSlNPTigpIHtcbiAgICAgIHZhciBtYXAgPSB7XG4gICAgICAgIHZlcnNpb246IHRoaXMuX3ZlcnNpb24sXG4gICAgICAgIHNvdXJjZXM6IHRoaXMuX3NvdXJjZXMudG9BcnJheSgpLFxuICAgICAgICBuYW1lczogdGhpcy5fbmFtZXMudG9BcnJheSgpLFxuICAgICAgICBtYXBwaW5nczogdGhpcy5fc2VyaWFsaXplTWFwcGluZ3MoKVxuICAgICAgfTtcbiAgICAgIGlmICh0aGlzLl9maWxlICE9IG51bGwpIHtcbiAgICAgICAgbWFwLmZpbGUgPSB0aGlzLl9maWxlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX3NvdXJjZVJvb3QgIT0gbnVsbCkge1xuICAgICAgICBtYXAuc291cmNlUm9vdCA9IHRoaXMuX3NvdXJjZVJvb3Q7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5fc291cmNlc0NvbnRlbnRzKSB7XG4gICAgICAgIG1hcC5zb3VyY2VzQ29udGVudCA9IHRoaXMuX2dlbmVyYXRlU291cmNlc0NvbnRlbnQobWFwLnNvdXJjZXMsIG1hcC5zb3VyY2VSb290KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1hcDtcbiAgICB9O1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIHNvdXJjZSBtYXAgYmVpbmcgZ2VuZXJhdGVkIHRvIGEgc3RyaW5nLlxuICAgKi9cbiAgU291cmNlTWFwR2VuZXJhdG9yLnByb3RvdHlwZS50b1N0cmluZyA9XG4gICAgZnVuY3Rpb24gU291cmNlTWFwR2VuZXJhdG9yX3RvU3RyaW5nKCkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMpO1xuICAgIH07XG5cbiAgZXhwb3J0cy5Tb3VyY2VNYXBHZW5lcmF0b3IgPSBTb3VyY2VNYXBHZW5lcmF0b3I7XG5cbn0pO1xuIiwiLyogLSotIE1vZGU6IGpzOyBqcy1pbmRlbnQtbGV2ZWw6IDI7IC0qLSAqL1xuLypcbiAqIENvcHlyaWdodCAyMDExIE1vemlsbGEgRm91bmRhdGlvbiBhbmQgY29udHJpYnV0b3JzXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBsaWNlbnNlLiBTZWUgTElDRU5TRSBvcjpcbiAqIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9CU0QtMy1DbGF1c2VcbiAqL1xuaWYgKHR5cGVvZiBkZWZpbmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgZGVmaW5lID0gcmVxdWlyZSgnYW1kZWZpbmUnKShtb2R1bGUsIHJlcXVpcmUpO1xufVxuZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcblxuICB2YXIgU291cmNlTWFwR2VuZXJhdG9yID0gcmVxdWlyZSgnLi9zb3VyY2UtbWFwLWdlbmVyYXRvcicpLlNvdXJjZU1hcEdlbmVyYXRvcjtcbiAgdmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuICAvLyBNYXRjaGVzIGEgV2luZG93cy1zdHlsZSBgXFxyXFxuYCBuZXdsaW5lIG9yIGEgYFxcbmAgbmV3bGluZSB1c2VkIGJ5IGFsbCBvdGhlclxuICAvLyBvcGVyYXRpbmcgc3lzdGVtcyB0aGVzZSBkYXlzIChjYXB0dXJpbmcgdGhlIHJlc3VsdCkuXG4gIHZhciBSRUdFWF9ORVdMSU5FID0gLyhcXHI/XFxuKS87XG5cbiAgLy8gTmV3bGluZSBjaGFyYWN0ZXIgY29kZSBmb3IgY2hhckNvZGVBdCgpIGNvbXBhcmlzb25zXG4gIHZhciBORVdMSU5FX0NPREUgPSAxMDtcblxuICAvLyBQcml2YXRlIHN5bWJvbCBmb3IgaWRlbnRpZnlpbmcgYFNvdXJjZU5vZGVgcyB3aGVuIG11bHRpcGxlIHZlcnNpb25zIG9mXG4gIC8vIHRoZSBzb3VyY2UtbWFwIGxpYnJhcnkgYXJlIGxvYWRlZC4gVGhpcyBNVVNUIE5PVCBDSEFOR0UgYWNyb3NzXG4gIC8vIHZlcnNpb25zIVxuICB2YXIgaXNTb3VyY2VOb2RlID0gXCIkJCRpc1NvdXJjZU5vZGUkJCRcIjtcblxuICAvKipcbiAgICogU291cmNlTm9kZXMgcHJvdmlkZSBhIHdheSB0byBhYnN0cmFjdCBvdmVyIGludGVycG9sYXRpbmcvY29uY2F0ZW5hdGluZ1xuICAgKiBzbmlwcGV0cyBvZiBnZW5lcmF0ZWQgSmF2YVNjcmlwdCBzb3VyY2UgY29kZSB3aGlsZSBtYWludGFpbmluZyB0aGUgbGluZSBhbmRcbiAgICogY29sdW1uIGluZm9ybWF0aW9uIGFzc29jaWF0ZWQgd2l0aCB0aGUgb3JpZ2luYWwgc291cmNlIGNvZGUuXG4gICAqXG4gICAqIEBwYXJhbSBhTGluZSBUaGUgb3JpZ2luYWwgbGluZSBudW1iZXIuXG4gICAqIEBwYXJhbSBhQ29sdW1uIFRoZSBvcmlnaW5hbCBjb2x1bW4gbnVtYmVyLlxuICAgKiBAcGFyYW0gYVNvdXJjZSBUaGUgb3JpZ2luYWwgc291cmNlJ3MgZmlsZW5hbWUuXG4gICAqIEBwYXJhbSBhQ2h1bmtzIE9wdGlvbmFsLiBBbiBhcnJheSBvZiBzdHJpbmdzIHdoaWNoIGFyZSBzbmlwcGV0cyBvZlxuICAgKiAgICAgICAgZ2VuZXJhdGVkIEpTLCBvciBvdGhlciBTb3VyY2VOb2Rlcy5cbiAgICogQHBhcmFtIGFOYW1lIFRoZSBvcmlnaW5hbCBpZGVudGlmaWVyLlxuICAgKi9cbiAgZnVuY3Rpb24gU291cmNlTm9kZShhTGluZSwgYUNvbHVtbiwgYVNvdXJjZSwgYUNodW5rcywgYU5hbWUpIHtcbiAgICB0aGlzLmNoaWxkcmVuID0gW107XG4gICAgdGhpcy5zb3VyY2VDb250ZW50cyA9IHt9O1xuICAgIHRoaXMubGluZSA9IGFMaW5lID09IG51bGwgPyBudWxsIDogYUxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBhQ29sdW1uID09IG51bGwgPyBudWxsIDogYUNvbHVtbjtcbiAgICB0aGlzLnNvdXJjZSA9IGFTb3VyY2UgPT0gbnVsbCA/IG51bGwgOiBhU291cmNlO1xuICAgIHRoaXMubmFtZSA9IGFOYW1lID09IG51bGwgPyBudWxsIDogYU5hbWU7XG4gICAgdGhpc1tpc1NvdXJjZU5vZGVdID0gdHJ1ZTtcbiAgICBpZiAoYUNodW5rcyAhPSBudWxsKSB0aGlzLmFkZChhQ2h1bmtzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgU291cmNlTm9kZSBmcm9tIGdlbmVyYXRlZCBjb2RlIGFuZCBhIFNvdXJjZU1hcENvbnN1bWVyLlxuICAgKlxuICAgKiBAcGFyYW0gYUdlbmVyYXRlZENvZGUgVGhlIGdlbmVyYXRlZCBjb2RlXG4gICAqIEBwYXJhbSBhU291cmNlTWFwQ29uc3VtZXIgVGhlIFNvdXJjZU1hcCBmb3IgdGhlIGdlbmVyYXRlZCBjb2RlXG4gICAqIEBwYXJhbSBhUmVsYXRpdmVQYXRoIE9wdGlvbmFsLiBUaGUgcGF0aCB0aGF0IHJlbGF0aXZlIHNvdXJjZXMgaW4gdGhlXG4gICAqICAgICAgICBTb3VyY2VNYXBDb25zdW1lciBzaG91bGQgYmUgcmVsYXRpdmUgdG8uXG4gICAqL1xuICBTb3VyY2VOb2RlLmZyb21TdHJpbmdXaXRoU291cmNlTWFwID1cbiAgICBmdW5jdGlvbiBTb3VyY2VOb2RlX2Zyb21TdHJpbmdXaXRoU291cmNlTWFwKGFHZW5lcmF0ZWRDb2RlLCBhU291cmNlTWFwQ29uc3VtZXIsIGFSZWxhdGl2ZVBhdGgpIHtcbiAgICAgIC8vIFRoZSBTb3VyY2VOb2RlIHdlIHdhbnQgdG8gZmlsbCB3aXRoIHRoZSBnZW5lcmF0ZWQgY29kZVxuICAgICAgLy8gYW5kIHRoZSBTb3VyY2VNYXBcbiAgICAgIHZhciBub2RlID0gbmV3IFNvdXJjZU5vZGUoKTtcblxuICAgICAgLy8gQWxsIGV2ZW4gaW5kaWNlcyBvZiB0aGlzIGFycmF5IGFyZSBvbmUgbGluZSBvZiB0aGUgZ2VuZXJhdGVkIGNvZGUsXG4gICAgICAvLyB3aGlsZSBhbGwgb2RkIGluZGljZXMgYXJlIHRoZSBuZXdsaW5lcyBiZXR3ZWVuIHR3byBhZGphY2VudCBsaW5lc1xuICAgICAgLy8gKHNpbmNlIGBSRUdFWF9ORVdMSU5FYCBjYXB0dXJlcyBpdHMgbWF0Y2gpLlxuICAgICAgLy8gUHJvY2Vzc2VkIGZyYWdtZW50cyBhcmUgcmVtb3ZlZCBmcm9tIHRoaXMgYXJyYXksIGJ5IGNhbGxpbmcgYHNoaWZ0TmV4dExpbmVgLlxuICAgICAgdmFyIHJlbWFpbmluZ0xpbmVzID0gYUdlbmVyYXRlZENvZGUuc3BsaXQoUkVHRVhfTkVXTElORSk7XG4gICAgICB2YXIgc2hpZnROZXh0TGluZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbGluZUNvbnRlbnRzID0gcmVtYWluaW5nTGluZXMuc2hpZnQoKTtcbiAgICAgICAgLy8gVGhlIGxhc3QgbGluZSBvZiBhIGZpbGUgbWlnaHQgbm90IGhhdmUgYSBuZXdsaW5lLlxuICAgICAgICB2YXIgbmV3TGluZSA9IHJlbWFpbmluZ0xpbmVzLnNoaWZ0KCkgfHwgXCJcIjtcbiAgICAgICAgcmV0dXJuIGxpbmVDb250ZW50cyArIG5ld0xpbmU7XG4gICAgICB9O1xuXG4gICAgICAvLyBXZSBuZWVkIHRvIHJlbWVtYmVyIHRoZSBwb3NpdGlvbiBvZiBcInJlbWFpbmluZ0xpbmVzXCJcbiAgICAgIHZhciBsYXN0R2VuZXJhdGVkTGluZSA9IDEsIGxhc3RHZW5lcmF0ZWRDb2x1bW4gPSAwO1xuXG4gICAgICAvLyBUaGUgZ2VuZXJhdGUgU291cmNlTm9kZXMgd2UgbmVlZCBhIGNvZGUgcmFuZ2UuXG4gICAgICAvLyBUbyBleHRyYWN0IGl0IGN1cnJlbnQgYW5kIGxhc3QgbWFwcGluZyBpcyB1c2VkLlxuICAgICAgLy8gSGVyZSB3ZSBzdG9yZSB0aGUgbGFzdCBtYXBwaW5nLlxuICAgICAgdmFyIGxhc3RNYXBwaW5nID0gbnVsbDtcblxuICAgICAgYVNvdXJjZU1hcENvbnN1bWVyLmVhY2hNYXBwaW5nKGZ1bmN0aW9uIChtYXBwaW5nKSB7XG4gICAgICAgIGlmIChsYXN0TWFwcGluZyAhPT0gbnVsbCkge1xuICAgICAgICAgIC8vIFdlIGFkZCB0aGUgY29kZSBmcm9tIFwibGFzdE1hcHBpbmdcIiB0byBcIm1hcHBpbmdcIjpcbiAgICAgICAgICAvLyBGaXJzdCBjaGVjayBpZiB0aGVyZSBpcyBhIG5ldyBsaW5lIGluIGJldHdlZW4uXG4gICAgICAgICAgaWYgKGxhc3RHZW5lcmF0ZWRMaW5lIDwgbWFwcGluZy5nZW5lcmF0ZWRMaW5lKSB7XG4gICAgICAgICAgICB2YXIgY29kZSA9IFwiXCI7XG4gICAgICAgICAgICAvLyBBc3NvY2lhdGUgZmlyc3QgbGluZSB3aXRoIFwibGFzdE1hcHBpbmdcIlxuICAgICAgICAgICAgYWRkTWFwcGluZ1dpdGhDb2RlKGxhc3RNYXBwaW5nLCBzaGlmdE5leHRMaW5lKCkpO1xuICAgICAgICAgICAgbGFzdEdlbmVyYXRlZExpbmUrKztcbiAgICAgICAgICAgIGxhc3RHZW5lcmF0ZWRDb2x1bW4gPSAwO1xuICAgICAgICAgICAgLy8gVGhlIHJlbWFpbmluZyBjb2RlIGlzIGFkZGVkIHdpdGhvdXQgbWFwcGluZ1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUaGVyZSBpcyBubyBuZXcgbGluZSBpbiBiZXR3ZWVuLlxuICAgICAgICAgICAgLy8gQXNzb2NpYXRlIHRoZSBjb2RlIGJldHdlZW4gXCJsYXN0R2VuZXJhdGVkQ29sdW1uXCIgYW5kXG4gICAgICAgICAgICAvLyBcIm1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uXCIgd2l0aCBcImxhc3RNYXBwaW5nXCJcbiAgICAgICAgICAgIHZhciBuZXh0TGluZSA9IHJlbWFpbmluZ0xpbmVzWzBdO1xuICAgICAgICAgICAgdmFyIGNvZGUgPSBuZXh0TGluZS5zdWJzdHIoMCwgbWFwcGluZy5nZW5lcmF0ZWRDb2x1bW4gLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdEdlbmVyYXRlZENvbHVtbik7XG4gICAgICAgICAgICByZW1haW5pbmdMaW5lc1swXSA9IG5leHRMaW5lLnN1YnN0cihtYXBwaW5nLmdlbmVyYXRlZENvbHVtbiAtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0R2VuZXJhdGVkQ29sdW1uKTtcbiAgICAgICAgICAgIGxhc3RHZW5lcmF0ZWRDb2x1bW4gPSBtYXBwaW5nLmdlbmVyYXRlZENvbHVtbjtcbiAgICAgICAgICAgIGFkZE1hcHBpbmdXaXRoQ29kZShsYXN0TWFwcGluZywgY29kZSk7XG4gICAgICAgICAgICAvLyBObyBtb3JlIHJlbWFpbmluZyBjb2RlLCBjb250aW51ZVxuICAgICAgICAgICAgbGFzdE1hcHBpbmcgPSBtYXBwaW5nO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBXZSBhZGQgdGhlIGdlbmVyYXRlZCBjb2RlIHVudGlsIHRoZSBmaXJzdCBtYXBwaW5nXG4gICAgICAgIC8vIHRvIHRoZSBTb3VyY2VOb2RlIHdpdGhvdXQgYW55IG1hcHBpbmcuXG4gICAgICAgIC8vIEVhY2ggbGluZSBpcyBhZGRlZCBhcyBzZXBhcmF0ZSBzdHJpbmcuXG4gICAgICAgIHdoaWxlIChsYXN0R2VuZXJhdGVkTGluZSA8IG1hcHBpbmcuZ2VuZXJhdGVkTGluZSkge1xuICAgICAgICAgIG5vZGUuYWRkKHNoaWZ0TmV4dExpbmUoKSk7XG4gICAgICAgICAgbGFzdEdlbmVyYXRlZExpbmUrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAobGFzdEdlbmVyYXRlZENvbHVtbiA8IG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uKSB7XG4gICAgICAgICAgdmFyIG5leHRMaW5lID0gcmVtYWluaW5nTGluZXNbMF07XG4gICAgICAgICAgbm9kZS5hZGQobmV4dExpbmUuc3Vic3RyKDAsIG1hcHBpbmcuZ2VuZXJhdGVkQ29sdW1uKSk7XG4gICAgICAgICAgcmVtYWluaW5nTGluZXNbMF0gPSBuZXh0TGluZS5zdWJzdHIobWFwcGluZy5nZW5lcmF0ZWRDb2x1bW4pO1xuICAgICAgICAgIGxhc3RHZW5lcmF0ZWRDb2x1bW4gPSBtYXBwaW5nLmdlbmVyYXRlZENvbHVtbjtcbiAgICAgICAgfVxuICAgICAgICBsYXN0TWFwcGluZyA9IG1hcHBpbmc7XG4gICAgICB9LCB0aGlzKTtcbiAgICAgIC8vIFdlIGhhdmUgcHJvY2Vzc2VkIGFsbCBtYXBwaW5ncy5cbiAgICAgIGlmIChyZW1haW5pbmdMaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChsYXN0TWFwcGluZykge1xuICAgICAgICAgIC8vIEFzc29jaWF0ZSB0aGUgcmVtYWluaW5nIGNvZGUgaW4gdGhlIGN1cnJlbnQgbGluZSB3aXRoIFwibGFzdE1hcHBpbmdcIlxuICAgICAgICAgIGFkZE1hcHBpbmdXaXRoQ29kZShsYXN0TWFwcGluZywgc2hpZnROZXh0TGluZSgpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBhbmQgYWRkIHRoZSByZW1haW5pbmcgbGluZXMgd2l0aG91dCBhbnkgbWFwcGluZ1xuICAgICAgICBub2RlLmFkZChyZW1haW5pbmdMaW5lcy5qb2luKFwiXCIpKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ29weSBzb3VyY2VzQ29udGVudCBpbnRvIFNvdXJjZU5vZGVcbiAgICAgIGFTb3VyY2VNYXBDb25zdW1lci5zb3VyY2VzLmZvckVhY2goZnVuY3Rpb24gKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBhU291cmNlTWFwQ29uc3VtZXIuc291cmNlQ29udGVudEZvcihzb3VyY2VGaWxlKTtcbiAgICAgICAgaWYgKGNvbnRlbnQgIT0gbnVsbCkge1xuICAgICAgICAgIGlmIChhUmVsYXRpdmVQYXRoICE9IG51bGwpIHtcbiAgICAgICAgICAgIHNvdXJjZUZpbGUgPSB1dGlsLmpvaW4oYVJlbGF0aXZlUGF0aCwgc291cmNlRmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5vZGUuc2V0U291cmNlQ29udGVudChzb3VyY2VGaWxlLCBjb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBub2RlO1xuXG4gICAgICBmdW5jdGlvbiBhZGRNYXBwaW5nV2l0aENvZGUobWFwcGluZywgY29kZSkge1xuICAgICAgICBpZiAobWFwcGluZyA9PT0gbnVsbCB8fCBtYXBwaW5nLnNvdXJjZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbm9kZS5hZGQoY29kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IGFSZWxhdGl2ZVBhdGhcbiAgICAgICAgICAgID8gdXRpbC5qb2luKGFSZWxhdGl2ZVBhdGgsIG1hcHBpbmcuc291cmNlKVxuICAgICAgICAgICAgOiBtYXBwaW5nLnNvdXJjZTtcbiAgICAgICAgICBub2RlLmFkZChuZXcgU291cmNlTm9kZShtYXBwaW5nLm9yaWdpbmFsTGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBwaW5nLm9yaWdpbmFsQ29sdW1uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcHBpbmcubmFtZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAvKipcbiAgICogQWRkIGEgY2h1bmsgb2YgZ2VuZXJhdGVkIEpTIHRvIHRoaXMgc291cmNlIG5vZGUuXG4gICAqXG4gICAqIEBwYXJhbSBhQ2h1bmsgQSBzdHJpbmcgc25pcHBldCBvZiBnZW5lcmF0ZWQgSlMgY29kZSwgYW5vdGhlciBpbnN0YW5jZSBvZlxuICAgKiAgICAgICAgU291cmNlTm9kZSwgb3IgYW4gYXJyYXkgd2hlcmUgZWFjaCBtZW1iZXIgaXMgb25lIG9mIHRob3NlIHRoaW5ncy5cbiAgICovXG4gIFNvdXJjZU5vZGUucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIFNvdXJjZU5vZGVfYWRkKGFDaHVuaykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFDaHVuaykpIHtcbiAgICAgIGFDaHVuay5mb3JFYWNoKGZ1bmN0aW9uIChjaHVuaykge1xuICAgICAgICB0aGlzLmFkZChjaHVuayk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYUNodW5rW2lzU291cmNlTm9kZV0gfHwgdHlwZW9mIGFDaHVuayA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgaWYgKGFDaHVuaykge1xuICAgICAgICB0aGlzLmNoaWxkcmVuLnB1c2goYUNodW5rKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICBcIkV4cGVjdGVkIGEgU291cmNlTm9kZSwgc3RyaW5nLCBvciBhbiBhcnJheSBvZiBTb3VyY2VOb2RlcyBhbmQgc3RyaW5ncy4gR290IFwiICsgYUNodW5rXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQWRkIGEgY2h1bmsgb2YgZ2VuZXJhdGVkIEpTIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhpcyBzb3VyY2Ugbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIGFDaHVuayBBIHN0cmluZyBzbmlwcGV0IG9mIGdlbmVyYXRlZCBKUyBjb2RlLCBhbm90aGVyIGluc3RhbmNlIG9mXG4gICAqICAgICAgICBTb3VyY2VOb2RlLCBvciBhbiBhcnJheSB3aGVyZSBlYWNoIG1lbWJlciBpcyBvbmUgb2YgdGhvc2UgdGhpbmdzLlxuICAgKi9cbiAgU291cmNlTm9kZS5wcm90b3R5cGUucHJlcGVuZCA9IGZ1bmN0aW9uIFNvdXJjZU5vZGVfcHJlcGVuZChhQ2h1bmspIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhQ2h1bmspKSB7XG4gICAgICBmb3IgKHZhciBpID0gYUNodW5rLmxlbmd0aC0xOyBpID49IDA7IGktLSkge1xuICAgICAgICB0aGlzLnByZXBlbmQoYUNodW5rW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoYUNodW5rW2lzU291cmNlTm9kZV0gfHwgdHlwZW9mIGFDaHVuayA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhpcy5jaGlsZHJlbi51bnNoaWZ0KGFDaHVuayk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgXCJFeHBlY3RlZCBhIFNvdXJjZU5vZGUsIHN0cmluZywgb3IgYW4gYXJyYXkgb2YgU291cmNlTm9kZXMgYW5kIHN0cmluZ3MuIEdvdCBcIiArIGFDaHVua1xuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFdhbGsgb3ZlciB0aGUgdHJlZSBvZiBKUyBzbmlwcGV0cyBpbiB0aGlzIG5vZGUgYW5kIGl0cyBjaGlsZHJlbi4gVGhlXG4gICAqIHdhbGtpbmcgZnVuY3Rpb24gaXMgY2FsbGVkIG9uY2UgZm9yIGVhY2ggc25pcHBldCBvZiBKUyBhbmQgaXMgcGFzc2VkIHRoYXRcbiAgICogc25pcHBldCBhbmQgdGhlIGl0cyBvcmlnaW5hbCBhc3NvY2lhdGVkIHNvdXJjZSdzIGxpbmUvY29sdW1uIGxvY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gYUZuIFRoZSB0cmF2ZXJzYWwgZnVuY3Rpb24uXG4gICAqL1xuICBTb3VyY2VOb2RlLnByb3RvdHlwZS53YWxrID0gZnVuY3Rpb24gU291cmNlTm9kZV93YWxrKGFGbikge1xuICAgIHZhciBjaHVuaztcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgY2h1bmsgPSB0aGlzLmNoaWxkcmVuW2ldO1xuICAgICAgaWYgKGNodW5rW2lzU291cmNlTm9kZV0pIHtcbiAgICAgICAgY2h1bmsud2FsayhhRm4pO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmIChjaHVuayAhPT0gJycpIHtcbiAgICAgICAgICBhRm4oY2h1bmssIHsgc291cmNlOiB0aGlzLnNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMuY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLm5hbWUgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIExpa2UgYFN0cmluZy5wcm90b3R5cGUuam9pbmAgZXhjZXB0IGZvciBTb3VyY2VOb2Rlcy4gSW5zZXJ0cyBgYVN0cmAgYmV0d2VlblxuICAgKiBlYWNoIG9mIGB0aGlzLmNoaWxkcmVuYC5cbiAgICpcbiAgICogQHBhcmFtIGFTZXAgVGhlIHNlcGFyYXRvci5cbiAgICovXG4gIFNvdXJjZU5vZGUucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiBTb3VyY2VOb2RlX2pvaW4oYVNlcCkge1xuICAgIHZhciBuZXdDaGlsZHJlbjtcbiAgICB2YXIgaTtcbiAgICB2YXIgbGVuID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XG4gICAgaWYgKGxlbiA+IDApIHtcbiAgICAgIG5ld0NoaWxkcmVuID0gW107XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuLTE7IGkrKykge1xuICAgICAgICBuZXdDaGlsZHJlbi5wdXNoKHRoaXMuY2hpbGRyZW5baV0pO1xuICAgICAgICBuZXdDaGlsZHJlbi5wdXNoKGFTZXApO1xuICAgICAgfVxuICAgICAgbmV3Q2hpbGRyZW4ucHVzaCh0aGlzLmNoaWxkcmVuW2ldKTtcbiAgICAgIHRoaXMuY2hpbGRyZW4gPSBuZXdDaGlsZHJlbjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGwgU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlIG9uIHRoZSB2ZXJ5IHJpZ2h0LW1vc3Qgc291cmNlIHNuaXBwZXQuIFVzZWZ1bFxuICAgKiBmb3IgdHJpbW1pbmcgd2hpdGVzcGFjZSBmcm9tIHRoZSBlbmQgb2YgYSBzb3VyY2Ugbm9kZSwgZXRjLlxuICAgKlxuICAgKiBAcGFyYW0gYVBhdHRlcm4gVGhlIHBhdHRlcm4gdG8gcmVwbGFjZS5cbiAgICogQHBhcmFtIGFSZXBsYWNlbWVudCBUaGUgdGhpbmcgdG8gcmVwbGFjZSB0aGUgcGF0dGVybiB3aXRoLlxuICAgKi9cbiAgU291cmNlTm9kZS5wcm90b3R5cGUucmVwbGFjZVJpZ2h0ID0gZnVuY3Rpb24gU291cmNlTm9kZV9yZXBsYWNlUmlnaHQoYVBhdHRlcm4sIGFSZXBsYWNlbWVudCkge1xuICAgIHZhciBsYXN0Q2hpbGQgPSB0aGlzLmNoaWxkcmVuW3RoaXMuY2hpbGRyZW4ubGVuZ3RoIC0gMV07XG4gICAgaWYgKGxhc3RDaGlsZFtpc1NvdXJjZU5vZGVdKSB7XG4gICAgICBsYXN0Q2hpbGQucmVwbGFjZVJpZ2h0KGFQYXR0ZXJuLCBhUmVwbGFjZW1lbnQpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgbGFzdENoaWxkID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5jaGlsZHJlblt0aGlzLmNoaWxkcmVuLmxlbmd0aCAtIDFdID0gbGFzdENoaWxkLnJlcGxhY2UoYVBhdHRlcm4sIGFSZXBsYWNlbWVudCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5jaGlsZHJlbi5wdXNoKCcnLnJlcGxhY2UoYVBhdHRlcm4sIGFSZXBsYWNlbWVudCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogU2V0IHRoZSBzb3VyY2UgY29udGVudCBmb3IgYSBzb3VyY2UgZmlsZS4gVGhpcyB3aWxsIGJlIGFkZGVkIHRvIHRoZSBTb3VyY2VNYXBHZW5lcmF0b3JcbiAgICogaW4gdGhlIHNvdXJjZXNDb250ZW50IGZpZWxkLlxuICAgKlxuICAgKiBAcGFyYW0gYVNvdXJjZUZpbGUgVGhlIGZpbGVuYW1lIG9mIHRoZSBzb3VyY2UgZmlsZVxuICAgKiBAcGFyYW0gYVNvdXJjZUNvbnRlbnQgVGhlIGNvbnRlbnQgb2YgdGhlIHNvdXJjZSBmaWxlXG4gICAqL1xuICBTb3VyY2VOb2RlLnByb3RvdHlwZS5zZXRTb3VyY2VDb250ZW50ID1cbiAgICBmdW5jdGlvbiBTb3VyY2VOb2RlX3NldFNvdXJjZUNvbnRlbnQoYVNvdXJjZUZpbGUsIGFTb3VyY2VDb250ZW50KSB7XG4gICAgICB0aGlzLnNvdXJjZUNvbnRlbnRzW3V0aWwudG9TZXRTdHJpbmcoYVNvdXJjZUZpbGUpXSA9IGFTb3VyY2VDb250ZW50O1xuICAgIH07XG5cbiAgLyoqXG4gICAqIFdhbGsgb3ZlciB0aGUgdHJlZSBvZiBTb3VyY2VOb2Rlcy4gVGhlIHdhbGtpbmcgZnVuY3Rpb24gaXMgY2FsbGVkIGZvciBlYWNoXG4gICAqIHNvdXJjZSBmaWxlIGNvbnRlbnQgYW5kIGlzIHBhc3NlZCB0aGUgZmlsZW5hbWUgYW5kIHNvdXJjZSBjb250ZW50LlxuICAgKlxuICAgKiBAcGFyYW0gYUZuIFRoZSB0cmF2ZXJzYWwgZnVuY3Rpb24uXG4gICAqL1xuICBTb3VyY2VOb2RlLnByb3RvdHlwZS53YWxrU291cmNlQ29udGVudHMgPVxuICAgIGZ1bmN0aW9uIFNvdXJjZU5vZGVfd2Fsa1NvdXJjZUNvbnRlbnRzKGFGbikge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMuY2hpbGRyZW5baV1baXNTb3VyY2VOb2RlXSkge1xuICAgICAgICAgIHRoaXMuY2hpbGRyZW5baV0ud2Fsa1NvdXJjZUNvbnRlbnRzKGFGbik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHNvdXJjZXMgPSBPYmplY3Qua2V5cyh0aGlzLnNvdXJjZUNvbnRlbnRzKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzb3VyY2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGFGbih1dGlsLmZyb21TZXRTdHJpbmcoc291cmNlc1tpXSksIHRoaXMuc291cmNlQ29udGVudHNbc291cmNlc1tpXV0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgc291cmNlIG5vZGUuIFdhbGtzIG92ZXIgdGhlIHRyZWVcbiAgICogYW5kIGNvbmNhdGVuYXRlcyBhbGwgdGhlIHZhcmlvdXMgc25pcHBldHMgdG9nZXRoZXIgdG8gb25lIHN0cmluZy5cbiAgICovXG4gIFNvdXJjZU5vZGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gU291cmNlTm9kZV90b1N0cmluZygpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcbiAgICB0aGlzLndhbGsoZnVuY3Rpb24gKGNodW5rKSB7XG4gICAgICBzdHIgKz0gY2h1bms7XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0cjtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgc291cmNlIG5vZGUgYWxvbmcgd2l0aCBhIHNvdXJjZVxuICAgKiBtYXAuXG4gICAqL1xuICBTb3VyY2VOb2RlLnByb3RvdHlwZS50b1N0cmluZ1dpdGhTb3VyY2VNYXAgPSBmdW5jdGlvbiBTb3VyY2VOb2RlX3RvU3RyaW5nV2l0aFNvdXJjZU1hcChhQXJncykge1xuICAgIHZhciBnZW5lcmF0ZWQgPSB7XG4gICAgICBjb2RlOiBcIlwiLFxuICAgICAgbGluZTogMSxcbiAgICAgIGNvbHVtbjogMFxuICAgIH07XG4gICAgdmFyIG1hcCA9IG5ldyBTb3VyY2VNYXBHZW5lcmF0b3IoYUFyZ3MpO1xuICAgIHZhciBzb3VyY2VNYXBwaW5nQWN0aXZlID0gZmFsc2U7XG4gICAgdmFyIGxhc3RPcmlnaW5hbFNvdXJjZSA9IG51bGw7XG4gICAgdmFyIGxhc3RPcmlnaW5hbExpbmUgPSBudWxsO1xuICAgIHZhciBsYXN0T3JpZ2luYWxDb2x1bW4gPSBudWxsO1xuICAgIHZhciBsYXN0T3JpZ2luYWxOYW1lID0gbnVsbDtcbiAgICB0aGlzLndhbGsoZnVuY3Rpb24gKGNodW5rLCBvcmlnaW5hbCkge1xuICAgICAgZ2VuZXJhdGVkLmNvZGUgKz0gY2h1bms7XG4gICAgICBpZiAob3JpZ2luYWwuc291cmNlICE9PSBudWxsXG4gICAgICAgICAgJiYgb3JpZ2luYWwubGluZSAhPT0gbnVsbFxuICAgICAgICAgICYmIG9yaWdpbmFsLmNvbHVtbiAhPT0gbnVsbCkge1xuICAgICAgICBpZihsYXN0T3JpZ2luYWxTb3VyY2UgIT09IG9yaWdpbmFsLnNvdXJjZVxuICAgICAgICAgICB8fCBsYXN0T3JpZ2luYWxMaW5lICE9PSBvcmlnaW5hbC5saW5lXG4gICAgICAgICAgIHx8IGxhc3RPcmlnaW5hbENvbHVtbiAhPT0gb3JpZ2luYWwuY29sdW1uXG4gICAgICAgICAgIHx8IGxhc3RPcmlnaW5hbE5hbWUgIT09IG9yaWdpbmFsLm5hbWUpIHtcbiAgICAgICAgICBtYXAuYWRkTWFwcGluZyh7XG4gICAgICAgICAgICBzb3VyY2U6IG9yaWdpbmFsLnNvdXJjZSxcbiAgICAgICAgICAgIG9yaWdpbmFsOiB7XG4gICAgICAgICAgICAgIGxpbmU6IG9yaWdpbmFsLmxpbmUsXG4gICAgICAgICAgICAgIGNvbHVtbjogb3JpZ2luYWwuY29sdW1uXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2VuZXJhdGVkOiB7XG4gICAgICAgICAgICAgIGxpbmU6IGdlbmVyYXRlZC5saW5lLFxuICAgICAgICAgICAgICBjb2x1bW46IGdlbmVyYXRlZC5jb2x1bW5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBuYW1lOiBvcmlnaW5hbC5uYW1lXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdE9yaWdpbmFsU291cmNlID0gb3JpZ2luYWwuc291cmNlO1xuICAgICAgICBsYXN0T3JpZ2luYWxMaW5lID0gb3JpZ2luYWwubGluZTtcbiAgICAgICAgbGFzdE9yaWdpbmFsQ29sdW1uID0gb3JpZ2luYWwuY29sdW1uO1xuICAgICAgICBsYXN0T3JpZ2luYWxOYW1lID0gb3JpZ2luYWwubmFtZTtcbiAgICAgICAgc291cmNlTWFwcGluZ0FjdGl2ZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKHNvdXJjZU1hcHBpbmdBY3RpdmUpIHtcbiAgICAgICAgbWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgIGdlbmVyYXRlZDoge1xuICAgICAgICAgICAgbGluZTogZ2VuZXJhdGVkLmxpbmUsXG4gICAgICAgICAgICBjb2x1bW46IGdlbmVyYXRlZC5jb2x1bW5cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBsYXN0T3JpZ2luYWxTb3VyY2UgPSBudWxsO1xuICAgICAgICBzb3VyY2VNYXBwaW5nQWN0aXZlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBpZHggPSAwLCBsZW5ndGggPSBjaHVuay5sZW5ndGg7IGlkeCA8IGxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgaWYgKGNodW5rLmNoYXJDb2RlQXQoaWR4KSA9PT0gTkVXTElORV9DT0RFKSB7XG4gICAgICAgICAgZ2VuZXJhdGVkLmxpbmUrKztcbiAgICAgICAgICBnZW5lcmF0ZWQuY29sdW1uID0gMDtcbiAgICAgICAgICAvLyBNYXBwaW5ncyBlbmQgYXQgZW9sXG4gICAgICAgICAgaWYgKGlkeCArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgICAgbGFzdE9yaWdpbmFsU291cmNlID0gbnVsbDtcbiAgICAgICAgICAgIHNvdXJjZU1hcHBpbmdBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZU1hcHBpbmdBY3RpdmUpIHtcbiAgICAgICAgICAgIG1hcC5hZGRNYXBwaW5nKHtcbiAgICAgICAgICAgICAgc291cmNlOiBvcmlnaW5hbC5zb3VyY2UsXG4gICAgICAgICAgICAgIG9yaWdpbmFsOiB7XG4gICAgICAgICAgICAgICAgbGluZTogb3JpZ2luYWwubGluZSxcbiAgICAgICAgICAgICAgICBjb2x1bW46IG9yaWdpbmFsLmNvbHVtblxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBnZW5lcmF0ZWQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBnZW5lcmF0ZWQubGluZSxcbiAgICAgICAgICAgICAgICBjb2x1bW46IGdlbmVyYXRlZC5jb2x1bW5cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbmFtZTogb3JpZ2luYWwubmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGdlbmVyYXRlZC5jb2x1bW4rKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMud2Fsa1NvdXJjZUNvbnRlbnRzKGZ1bmN0aW9uIChzb3VyY2VGaWxlLCBzb3VyY2VDb250ZW50KSB7XG4gICAgICBtYXAuc2V0U291cmNlQ29udGVudChzb3VyY2VGaWxlLCBzb3VyY2VDb250ZW50KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IGNvZGU6IGdlbmVyYXRlZC5jb2RlLCBtYXA6IG1hcCB9O1xuICB9O1xuXG4gIGV4cG9ydHMuU291cmNlTm9kZSA9IFNvdXJjZU5vZGU7XG5cbn0pO1xuIiwiLyogLSotIE1vZGU6IGpzOyBqcy1pbmRlbnQtbGV2ZWw6IDI7IC0qLSAqL1xuLypcbiAqIENvcHlyaWdodCAyMDExIE1vemlsbGEgRm91bmRhdGlvbiBhbmQgY29udHJpYnV0b3JzXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBsaWNlbnNlLiBTZWUgTElDRU5TRSBvcjpcbiAqIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9CU0QtMy1DbGF1c2VcbiAqL1xuaWYgKHR5cGVvZiBkZWZpbmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgZGVmaW5lID0gcmVxdWlyZSgnYW1kZWZpbmUnKShtb2R1bGUsIHJlcXVpcmUpO1xufVxuZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcblxuICAvKipcbiAgICogVGhpcyBpcyBhIGhlbHBlciBmdW5jdGlvbiBmb3IgZ2V0dGluZyB2YWx1ZXMgZnJvbSBwYXJhbWV0ZXIvb3B0aW9uc1xuICAgKiBvYmplY3RzLlxuICAgKlxuICAgKiBAcGFyYW0gYXJncyBUaGUgb2JqZWN0IHdlIGFyZSBleHRyYWN0aW5nIHZhbHVlcyBmcm9tXG4gICAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB3ZSBhcmUgZ2V0dGluZy5cbiAgICogQHBhcmFtIGRlZmF1bHRWYWx1ZSBBbiBvcHRpb25hbCB2YWx1ZSB0byByZXR1cm4gaWYgdGhlIHByb3BlcnR5IGlzIG1pc3NpbmdcbiAgICogZnJvbSB0aGUgb2JqZWN0LiBJZiB0aGlzIGlzIG5vdCBzcGVjaWZpZWQgYW5kIHRoZSBwcm9wZXJ0eSBpcyBtaXNzaW5nLCBhblxuICAgKiBlcnJvciB3aWxsIGJlIHRocm93bi5cbiAgICovXG4gIGZ1bmN0aW9uIGdldEFyZyhhQXJncywgYU5hbWUsIGFEZWZhdWx0VmFsdWUpIHtcbiAgICBpZiAoYU5hbWUgaW4gYUFyZ3MpIHtcbiAgICAgIHJldHVybiBhQXJnc1thTmFtZV07XG4gICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICByZXR1cm4gYURlZmF1bHRWYWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdcIicgKyBhTmFtZSArICdcIiBpcyBhIHJlcXVpcmVkIGFyZ3VtZW50LicpO1xuICAgIH1cbiAgfVxuICBleHBvcnRzLmdldEFyZyA9IGdldEFyZztcblxuICB2YXIgdXJsUmVnZXhwID0gL14oPzooW1xcdytcXC0uXSspOik/XFwvXFwvKD86KFxcdys6XFx3KylAKT8oW1xcdy5dKikoPzo6KFxcZCspKT8oXFxTKikkLztcbiAgdmFyIGRhdGFVcmxSZWdleHAgPSAvXmRhdGE6LitcXCwuKyQvO1xuXG4gIGZ1bmN0aW9uIHVybFBhcnNlKGFVcmwpIHtcbiAgICB2YXIgbWF0Y2ggPSBhVXJsLm1hdGNoKHVybFJlZ2V4cCk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBzY2hlbWU6IG1hdGNoWzFdLFxuICAgICAgYXV0aDogbWF0Y2hbMl0sXG4gICAgICBob3N0OiBtYXRjaFszXSxcbiAgICAgIHBvcnQ6IG1hdGNoWzRdLFxuICAgICAgcGF0aDogbWF0Y2hbNV1cbiAgICB9O1xuICB9XG4gIGV4cG9ydHMudXJsUGFyc2UgPSB1cmxQYXJzZTtcblxuICBmdW5jdGlvbiB1cmxHZW5lcmF0ZShhUGFyc2VkVXJsKSB7XG4gICAgdmFyIHVybCA9ICcnO1xuICAgIGlmIChhUGFyc2VkVXJsLnNjaGVtZSkge1xuICAgICAgdXJsICs9IGFQYXJzZWRVcmwuc2NoZW1lICsgJzonO1xuICAgIH1cbiAgICB1cmwgKz0gJy8vJztcbiAgICBpZiAoYVBhcnNlZFVybC5hdXRoKSB7XG4gICAgICB1cmwgKz0gYVBhcnNlZFVybC5hdXRoICsgJ0AnO1xuICAgIH1cbiAgICBpZiAoYVBhcnNlZFVybC5ob3N0KSB7XG4gICAgICB1cmwgKz0gYVBhcnNlZFVybC5ob3N0O1xuICAgIH1cbiAgICBpZiAoYVBhcnNlZFVybC5wb3J0KSB7XG4gICAgICB1cmwgKz0gXCI6XCIgKyBhUGFyc2VkVXJsLnBvcnRcbiAgICB9XG4gICAgaWYgKGFQYXJzZWRVcmwucGF0aCkge1xuICAgICAgdXJsICs9IGFQYXJzZWRVcmwucGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICBleHBvcnRzLnVybEdlbmVyYXRlID0gdXJsR2VuZXJhdGU7XG5cbiAgLyoqXG4gICAqIE5vcm1hbGl6ZXMgYSBwYXRoLCBvciB0aGUgcGF0aCBwb3J0aW9uIG9mIGEgVVJMOlxuICAgKlxuICAgKiAtIFJlcGxhY2VzIGNvbnNlcXV0aXZlIHNsYXNoZXMgd2l0aCBvbmUgc2xhc2guXG4gICAqIC0gUmVtb3ZlcyB1bm5lY2Vzc2FyeSAnLicgcGFydHMuXG4gICAqIC0gUmVtb3ZlcyB1bm5lY2Vzc2FyeSAnPGRpcj4vLi4nIHBhcnRzLlxuICAgKlxuICAgKiBCYXNlZCBvbiBjb2RlIGluIHRoZSBOb2RlLmpzICdwYXRoJyBjb3JlIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIGFQYXRoIFRoZSBwYXRoIG9yIHVybCB0byBub3JtYWxpemUuXG4gICAqL1xuICBmdW5jdGlvbiBub3JtYWxpemUoYVBhdGgpIHtcbiAgICB2YXIgcGF0aCA9IGFQYXRoO1xuICAgIHZhciB1cmwgPSB1cmxQYXJzZShhUGF0aCk7XG4gICAgaWYgKHVybCkge1xuICAgICAgaWYgKCF1cmwucGF0aCkge1xuICAgICAgICByZXR1cm4gYVBhdGg7XG4gICAgICB9XG4gICAgICBwYXRoID0gdXJsLnBhdGg7XG4gICAgfVxuICAgIHZhciBpc0Fic29sdXRlID0gKHBhdGguY2hhckF0KDApID09PSAnLycpO1xuXG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgvXFwvKy8pO1xuICAgIGZvciAodmFyIHBhcnQsIHVwID0gMCwgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBwYXJ0ID0gcGFydHNbaV07XG4gICAgICBpZiAocGFydCA9PT0gJy4nKSB7XG4gICAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIH0gZWxzZSBpZiAocGFydCA9PT0gJy4uJykge1xuICAgICAgICB1cCsrO1xuICAgICAgfSBlbHNlIGlmICh1cCA+IDApIHtcbiAgICAgICAgaWYgKHBhcnQgPT09ICcnKSB7XG4gICAgICAgICAgLy8gVGhlIGZpcnN0IHBhcnQgaXMgYmxhbmsgaWYgdGhlIHBhdGggaXMgYWJzb2x1dGUuIFRyeWluZyB0byBnb1xuICAgICAgICAgIC8vIGFib3ZlIHRoZSByb290IGlzIGEgbm8tb3AuIFRoZXJlZm9yZSB3ZSBjYW4gcmVtb3ZlIGFsbCAnLi4nIHBhcnRzXG4gICAgICAgICAgLy8gZGlyZWN0bHkgYWZ0ZXIgdGhlIHJvb3QuXG4gICAgICAgICAgcGFydHMuc3BsaWNlKGkgKyAxLCB1cCk7XG4gICAgICAgICAgdXAgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnRzLnNwbGljZShpLCAyKTtcbiAgICAgICAgICB1cC0tO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHBhdGggPSBwYXJ0cy5qb2luKCcvJyk7XG5cbiAgICBpZiAocGF0aCA9PT0gJycpIHtcbiAgICAgIHBhdGggPSBpc0Fic29sdXRlID8gJy8nIDogJy4nO1xuICAgIH1cblxuICAgIGlmICh1cmwpIHtcbiAgICAgIHVybC5wYXRoID0gcGF0aDtcbiAgICAgIHJldHVybiB1cmxHZW5lcmF0ZSh1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuICBleHBvcnRzLm5vcm1hbGl6ZSA9IG5vcm1hbGl6ZTtcblxuICAvKipcbiAgICogSm9pbnMgdHdvIHBhdGhzL1VSTHMuXG4gICAqXG4gICAqIEBwYXJhbSBhUm9vdCBUaGUgcm9vdCBwYXRoIG9yIFVSTC5cbiAgICogQHBhcmFtIGFQYXRoIFRoZSBwYXRoIG9yIFVSTCB0byBiZSBqb2luZWQgd2l0aCB0aGUgcm9vdC5cbiAgICpcbiAgICogLSBJZiBhUGF0aCBpcyBhIFVSTCBvciBhIGRhdGEgVVJJLCBhUGF0aCBpcyByZXR1cm5lZCwgdW5sZXNzIGFQYXRoIGlzIGFcbiAgICogICBzY2hlbWUtcmVsYXRpdmUgVVJMOiBUaGVuIHRoZSBzY2hlbWUgb2YgYVJvb3QsIGlmIGFueSwgaXMgcHJlcGVuZGVkXG4gICAqICAgZmlyc3QuXG4gICAqIC0gT3RoZXJ3aXNlIGFQYXRoIGlzIGEgcGF0aC4gSWYgYVJvb3QgaXMgYSBVUkwsIHRoZW4gaXRzIHBhdGggcG9ydGlvblxuICAgKiAgIGlzIHVwZGF0ZWQgd2l0aCB0aGUgcmVzdWx0IGFuZCBhUm9vdCBpcyByZXR1cm5lZC4gT3RoZXJ3aXNlIHRoZSByZXN1bHRcbiAgICogICBpcyByZXR1cm5lZC5cbiAgICogICAtIElmIGFQYXRoIGlzIGFic29sdXRlLCB0aGUgcmVzdWx0IGlzIGFQYXRoLlxuICAgKiAgIC0gT3RoZXJ3aXNlIHRoZSB0d28gcGF0aHMgYXJlIGpvaW5lZCB3aXRoIGEgc2xhc2guXG4gICAqIC0gSm9pbmluZyBmb3IgZXhhbXBsZSAnaHR0cDovLycgYW5kICd3d3cuZXhhbXBsZS5jb20nIGlzIGFsc28gc3VwcG9ydGVkLlxuICAgKi9cbiAgZnVuY3Rpb24gam9pbihhUm9vdCwgYVBhdGgpIHtcbiAgICBpZiAoYVJvb3QgPT09IFwiXCIpIHtcbiAgICAgIGFSb290ID0gXCIuXCI7XG4gICAgfVxuICAgIGlmIChhUGF0aCA9PT0gXCJcIikge1xuICAgICAgYVBhdGggPSBcIi5cIjtcbiAgICB9XG4gICAgdmFyIGFQYXRoVXJsID0gdXJsUGFyc2UoYVBhdGgpO1xuICAgIHZhciBhUm9vdFVybCA9IHVybFBhcnNlKGFSb290KTtcbiAgICBpZiAoYVJvb3RVcmwpIHtcbiAgICAgIGFSb290ID0gYVJvb3RVcmwucGF0aCB8fCAnLyc7XG4gICAgfVxuXG4gICAgLy8gYGpvaW4oZm9vLCAnLy93d3cuZXhhbXBsZS5vcmcnKWBcbiAgICBpZiAoYVBhdGhVcmwgJiYgIWFQYXRoVXJsLnNjaGVtZSkge1xuICAgICAgaWYgKGFSb290VXJsKSB7XG4gICAgICAgIGFQYXRoVXJsLnNjaGVtZSA9IGFSb290VXJsLnNjaGVtZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmxHZW5lcmF0ZShhUGF0aFVybCk7XG4gICAgfVxuXG4gICAgaWYgKGFQYXRoVXJsIHx8IGFQYXRoLm1hdGNoKGRhdGFVcmxSZWdleHApKSB7XG4gICAgICByZXR1cm4gYVBhdGg7XG4gICAgfVxuXG4gICAgLy8gYGpvaW4oJ2h0dHA6Ly8nLCAnd3d3LmV4YW1wbGUuY29tJylgXG4gICAgaWYgKGFSb290VXJsICYmICFhUm9vdFVybC5ob3N0ICYmICFhUm9vdFVybC5wYXRoKSB7XG4gICAgICBhUm9vdFVybC5ob3N0ID0gYVBhdGg7XG4gICAgICByZXR1cm4gdXJsR2VuZXJhdGUoYVJvb3RVcmwpO1xuICAgIH1cblxuICAgIHZhciBqb2luZWQgPSBhUGF0aC5jaGFyQXQoMCkgPT09ICcvJ1xuICAgICAgPyBhUGF0aFxuICAgICAgOiBub3JtYWxpemUoYVJvb3QucmVwbGFjZSgvXFwvKyQvLCAnJykgKyAnLycgKyBhUGF0aCk7XG5cbiAgICBpZiAoYVJvb3RVcmwpIHtcbiAgICAgIGFSb290VXJsLnBhdGggPSBqb2luZWQ7XG4gICAgICByZXR1cm4gdXJsR2VuZXJhdGUoYVJvb3RVcmwpO1xuICAgIH1cbiAgICByZXR1cm4gam9pbmVkO1xuICB9XG4gIGV4cG9ydHMuam9pbiA9IGpvaW47XG5cbiAgLyoqXG4gICAqIE1ha2UgYSBwYXRoIHJlbGF0aXZlIHRvIGEgVVJMIG9yIGFub3RoZXIgcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIGFSb290IFRoZSByb290IHBhdGggb3IgVVJMLlxuICAgKiBAcGFyYW0gYVBhdGggVGhlIHBhdGggb3IgVVJMIHRvIGJlIG1hZGUgcmVsYXRpdmUgdG8gYVJvb3QuXG4gICAqL1xuICBmdW5jdGlvbiByZWxhdGl2ZShhUm9vdCwgYVBhdGgpIHtcbiAgICBpZiAoYVJvb3QgPT09IFwiXCIpIHtcbiAgICAgIGFSb290ID0gXCIuXCI7XG4gICAgfVxuXG4gICAgYVJvb3QgPSBhUm9vdC5yZXBsYWNlKC9cXC8kLywgJycpO1xuXG4gICAgLy8gWFhYOiBJdCBpcyBwb3NzaWJsZSB0byByZW1vdmUgdGhpcyBibG9jaywgYW5kIHRoZSB0ZXN0cyBzdGlsbCBwYXNzIVxuICAgIHZhciB1cmwgPSB1cmxQYXJzZShhUm9vdCk7XG4gICAgaWYgKGFQYXRoLmNoYXJBdCgwKSA9PSBcIi9cIiAmJiB1cmwgJiYgdXJsLnBhdGggPT0gXCIvXCIpIHtcbiAgICAgIHJldHVybiBhUGF0aC5zbGljZSgxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYVBhdGguaW5kZXhPZihhUm9vdCArICcvJykgPT09IDBcbiAgICAgID8gYVBhdGguc3Vic3RyKGFSb290Lmxlbmd0aCArIDEpXG4gICAgICA6IGFQYXRoO1xuICB9XG4gIGV4cG9ydHMucmVsYXRpdmUgPSByZWxhdGl2ZTtcblxuICAvKipcbiAgICogQmVjYXVzZSBiZWhhdmlvciBnb2VzIHdhY2t5IHdoZW4geW91IHNldCBgX19wcm90b19fYCBvbiBvYmplY3RzLCB3ZVxuICAgKiBoYXZlIHRvIHByZWZpeCBhbGwgdGhlIHN0cmluZ3MgaW4gb3VyIHNldCB3aXRoIGFuIGFyYml0cmFyeSBjaGFyYWN0ZXIuXG4gICAqXG4gICAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9zb3VyY2UtbWFwL3B1bGwvMzEgYW5kXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL3NvdXJjZS1tYXAvaXNzdWVzLzMwXG4gICAqXG4gICAqIEBwYXJhbSBTdHJpbmcgYVN0clxuICAgKi9cbiAgZnVuY3Rpb24gdG9TZXRTdHJpbmcoYVN0cikge1xuICAgIHJldHVybiAnJCcgKyBhU3RyO1xuICB9XG4gIGV4cG9ydHMudG9TZXRTdHJpbmcgPSB0b1NldFN0cmluZztcblxuICBmdW5jdGlvbiBmcm9tU2V0U3RyaW5nKGFTdHIpIHtcbiAgICByZXR1cm4gYVN0ci5zdWJzdHIoMSk7XG4gIH1cbiAgZXhwb3J0cy5mcm9tU2V0U3RyaW5nID0gZnJvbVNldFN0cmluZztcblxuICBmdW5jdGlvbiBzdHJjbXAoYVN0cjEsIGFTdHIyKSB7XG4gICAgdmFyIHMxID0gYVN0cjEgfHwgXCJcIjtcbiAgICB2YXIgczIgPSBhU3RyMiB8fCBcIlwiO1xuICAgIHJldHVybiAoczEgPiBzMikgLSAoczEgPCBzMik7XG4gIH1cblxuICAvKipcbiAgICogQ29tcGFyYXRvciBiZXR3ZWVuIHR3byBtYXBwaW5ncyB3aGVyZSB0aGUgb3JpZ2luYWwgcG9zaXRpb25zIGFyZSBjb21wYXJlZC5cbiAgICpcbiAgICogT3B0aW9uYWxseSBwYXNzIGluIGB0cnVlYCBhcyBgb25seUNvbXBhcmVHZW5lcmF0ZWRgIHRvIGNvbnNpZGVyIHR3b1xuICAgKiBtYXBwaW5ncyB3aXRoIHRoZSBzYW1lIG9yaWdpbmFsIHNvdXJjZS9saW5lL2NvbHVtbiwgYnV0IGRpZmZlcmVudCBnZW5lcmF0ZWRcbiAgICogbGluZSBhbmQgY29sdW1uIHRoZSBzYW1lLiBVc2VmdWwgd2hlbiBzZWFyY2hpbmcgZm9yIGEgbWFwcGluZyB3aXRoIGFcbiAgICogc3R1YmJlZCBvdXQgbWFwcGluZy5cbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBhcmVCeU9yaWdpbmFsUG9zaXRpb25zKG1hcHBpbmdBLCBtYXBwaW5nQiwgb25seUNvbXBhcmVPcmlnaW5hbCkge1xuICAgIHZhciBjbXA7XG5cbiAgICBjbXAgPSBzdHJjbXAobWFwcGluZ0Euc291cmNlLCBtYXBwaW5nQi5zb3VyY2UpO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuXG4gICAgY21wID0gbWFwcGluZ0Eub3JpZ2luYWxMaW5lIC0gbWFwcGluZ0Iub3JpZ2luYWxMaW5lO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuXG4gICAgY21wID0gbWFwcGluZ0Eub3JpZ2luYWxDb2x1bW4gLSBtYXBwaW5nQi5vcmlnaW5hbENvbHVtbjtcbiAgICBpZiAoY21wIHx8IG9ubHlDb21wYXJlT3JpZ2luYWwpIHtcbiAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuXG4gICAgY21wID0gc3RyY21wKG1hcHBpbmdBLm5hbWUsIG1hcHBpbmdCLm5hbWUpO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuXG4gICAgY21wID0gbWFwcGluZ0EuZ2VuZXJhdGVkTGluZSAtIG1hcHBpbmdCLmdlbmVyYXRlZExpbmU7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICByZXR1cm4gbWFwcGluZ0EuZ2VuZXJhdGVkQ29sdW1uIC0gbWFwcGluZ0IuZ2VuZXJhdGVkQ29sdW1uO1xuICB9O1xuICBleHBvcnRzLmNvbXBhcmVCeU9yaWdpbmFsUG9zaXRpb25zID0gY29tcGFyZUJ5T3JpZ2luYWxQb3NpdGlvbnM7XG5cbiAgLyoqXG4gICAqIENvbXBhcmF0b3IgYmV0d2VlbiB0d28gbWFwcGluZ3Mgd2hlcmUgdGhlIGdlbmVyYXRlZCBwb3NpdGlvbnMgYXJlXG4gICAqIGNvbXBhcmVkLlxuICAgKlxuICAgKiBPcHRpb25hbGx5IHBhc3MgaW4gYHRydWVgIGFzIGBvbmx5Q29tcGFyZUdlbmVyYXRlZGAgdG8gY29uc2lkZXIgdHdvXG4gICAqIG1hcHBpbmdzIHdpdGggdGhlIHNhbWUgZ2VuZXJhdGVkIGxpbmUgYW5kIGNvbHVtbiwgYnV0IGRpZmZlcmVudFxuICAgKiBzb3VyY2UvbmFtZS9vcmlnaW5hbCBsaW5lIGFuZCBjb2x1bW4gdGhlIHNhbWUuIFVzZWZ1bCB3aGVuIHNlYXJjaGluZyBmb3IgYVxuICAgKiBtYXBwaW5nIHdpdGggYSBzdHViYmVkIG91dCBtYXBwaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gY29tcGFyZUJ5R2VuZXJhdGVkUG9zaXRpb25zKG1hcHBpbmdBLCBtYXBwaW5nQiwgb25seUNvbXBhcmVHZW5lcmF0ZWQpIHtcbiAgICB2YXIgY21wO1xuXG4gICAgY21wID0gbWFwcGluZ0EuZ2VuZXJhdGVkTGluZSAtIG1hcHBpbmdCLmdlbmVyYXRlZExpbmU7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICBjbXAgPSBtYXBwaW5nQS5nZW5lcmF0ZWRDb2x1bW4gLSBtYXBwaW5nQi5nZW5lcmF0ZWRDb2x1bW47XG4gICAgaWYgKGNtcCB8fCBvbmx5Q29tcGFyZUdlbmVyYXRlZCkge1xuICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG5cbiAgICBjbXAgPSBzdHJjbXAobWFwcGluZ0Euc291cmNlLCBtYXBwaW5nQi5zb3VyY2UpO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuXG4gICAgY21wID0gbWFwcGluZ0Eub3JpZ2luYWxMaW5lIC0gbWFwcGluZ0Iub3JpZ2luYWxMaW5lO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuXG4gICAgY21wID0gbWFwcGluZ0Eub3JpZ2luYWxDb2x1bW4gLSBtYXBwaW5nQi5vcmlnaW5hbENvbHVtbjtcbiAgICBpZiAoY21wKSB7XG4gICAgICByZXR1cm4gY21wO1xuICAgIH1cblxuICAgIHJldHVybiBzdHJjbXAobWFwcGluZ0EubmFtZSwgbWFwcGluZ0IubmFtZSk7XG4gIH07XG4gIGV4cG9ydHMuY29tcGFyZUJ5R2VuZXJhdGVkUG9zaXRpb25zID0gY29tcGFyZUJ5R2VuZXJhdGVkUG9zaXRpb25zO1xuXG59KTtcbiIsIi8qKiB2aW06IGV0OnRzPTQ6c3c9NDpzdHM9NFxuICogQGxpY2Vuc2UgYW1kZWZpbmUgMS4wLjAgQ29weXJpZ2h0IChjKSAyMDExLTIwMTUsIFRoZSBEb2pvIEZvdW5kYXRpb24gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIEF2YWlsYWJsZSB2aWEgdGhlIE1JVCBvciBuZXcgQlNEIGxpY2Vuc2UuXG4gKiBzZWU6IGh0dHA6Ly9naXRodWIuY29tL2pyYnVya2UvYW1kZWZpbmUgZm9yIGRldGFpbHNcbiAqL1xuXG4vKmpzbGludCBub2RlOiB0cnVlICovXG4vKmdsb2JhbCBtb2R1bGUsIHByb2Nlc3MgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVmaW5lIGZvciBub2RlLlxuICogQHBhcmFtIHtPYmplY3R9IG1vZHVsZSB0aGUgXCJtb2R1bGVcIiBvYmplY3QgdGhhdCBpcyBkZWZpbmVkIGJ5IE5vZGUgZm9yIHRoZVxuICogY3VycmVudCBtb2R1bGUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcmVxdWlyZUZuXS4gTm9kZSdzIHJlcXVpcmUgZnVuY3Rpb24gZm9yIHRoZSBjdXJyZW50IG1vZHVsZS5cbiAqIEl0IG9ubHkgbmVlZHMgdG8gYmUgcGFzc2VkIGluIE5vZGUgdmVyc2lvbnMgYmVmb3JlIDAuNSwgd2hlbiBtb2R1bGUucmVxdWlyZVxuICogZGlkIG5vdCBleGlzdC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gYSBkZWZpbmUgZnVuY3Rpb24gdGhhdCBpcyB1c2FibGUgZm9yIHRoZSBjdXJyZW50IG5vZGVcbiAqIG1vZHVsZS5cbiAqL1xuZnVuY3Rpb24gYW1kZWZpbmUobW9kdWxlLCByZXF1aXJlRm4pIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIGRlZmluZUNhY2hlID0ge30sXG4gICAgICAgIGxvYWRlckNhY2hlID0ge30sXG4gICAgICAgIGFscmVhZHlDYWxsZWQgPSBmYWxzZSxcbiAgICAgICAgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKSxcbiAgICAgICAgbWFrZVJlcXVpcmUsIHN0cmluZ1JlcXVpcmU7XG5cbiAgICAvKipcbiAgICAgKiBUcmltcyB0aGUgLiBhbmQgLi4gZnJvbSBhbiBhcnJheSBvZiBwYXRoIHNlZ21lbnRzLlxuICAgICAqIEl0IHdpbGwga2VlcCBhIGxlYWRpbmcgcGF0aCBzZWdtZW50IGlmIGEgLi4gd2lsbCBiZWNvbWVcbiAgICAgKiB0aGUgZmlyc3QgcGF0aCBzZWdtZW50LCB0byBoZWxwIHdpdGggbW9kdWxlIG5hbWUgbG9va3VwcyxcbiAgICAgKiB3aGljaCBhY3QgbGlrZSBwYXRocywgYnV0IGNhbiBiZSByZW1hcHBlZC4gQnV0IHRoZSBlbmQgcmVzdWx0LFxuICAgICAqIGFsbCBwYXRocyB0aGF0IHVzZSB0aGlzIGZ1bmN0aW9uIHNob3VsZCBsb29rIG5vcm1hbGl6ZWQuXG4gICAgICogTk9URTogdGhpcyBtZXRob2QgTU9ESUZJRVMgdGhlIGlucHV0IGFycmF5LlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyeSB0aGUgYXJyYXkgb2YgcGF0aCBzZWdtZW50cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0cmltRG90cyhhcnkpIHtcbiAgICAgICAgdmFyIGksIHBhcnQ7XG4gICAgICAgIGZvciAoaSA9IDA7IGFyeVtpXTsgaSs9IDEpIHtcbiAgICAgICAgICAgIHBhcnQgPSBhcnlbaV07XG4gICAgICAgICAgICBpZiAocGFydCA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgYXJ5LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICBpIC09IDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnQgPT09ICcuLicpIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gMSAmJiAoYXJ5WzJdID09PSAnLi4nIHx8IGFyeVswXSA9PT0gJy4uJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9FbmQgb2YgdGhlIGxpbmUuIEtlZXAgYXQgbGVhc3Qgb25lIG5vbi1kb3RcbiAgICAgICAgICAgICAgICAgICAgLy9wYXRoIHNlZ21lbnQgYXQgdGhlIGZyb250IHNvIGl0IGNhbiBiZSBtYXBwZWRcbiAgICAgICAgICAgICAgICAgICAgLy9jb3JyZWN0bHkgdG8gZGlzay4gT3RoZXJ3aXNlLCB0aGVyZSBpcyBsaWtlbHlcbiAgICAgICAgICAgICAgICAgICAgLy9ubyBwYXRoIG1hcHBpbmcgZm9yIGEgcGF0aCBzdGFydGluZyB3aXRoICcuLicuXG4gICAgICAgICAgICAgICAgICAgIC8vVGhpcyBjYW4gc3RpbGwgZmFpbCwgYnV0IGNhdGNoZXMgdGhlIG1vc3QgcmVhc29uYWJsZVxuICAgICAgICAgICAgICAgICAgICAvL3VzZXMgb2YgLi5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBhcnkuc3BsaWNlKGkgLSAxLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgaSAtPSAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZShuYW1lLCBiYXNlTmFtZSkge1xuICAgICAgICB2YXIgYmFzZVBhcnRzO1xuXG4gICAgICAgIC8vQWRqdXN0IGFueSByZWxhdGl2ZSBwYXRocy5cbiAgICAgICAgaWYgKG5hbWUgJiYgbmFtZS5jaGFyQXQoMCkgPT09ICcuJykge1xuICAgICAgICAgICAgLy9JZiBoYXZlIGEgYmFzZSBuYW1lLCB0cnkgdG8gbm9ybWFsaXplIGFnYWluc3QgaXQsXG4gICAgICAgICAgICAvL290aGVyd2lzZSwgYXNzdW1lIGl0IGlzIGEgdG9wLWxldmVsIHJlcXVpcmUgdGhhdCB3aWxsXG4gICAgICAgICAgICAvL2JlIHJlbGF0aXZlIHRvIGJhc2VVcmwgaW4gdGhlIGVuZC5cbiAgICAgICAgICAgIGlmIChiYXNlTmFtZSkge1xuICAgICAgICAgICAgICAgIGJhc2VQYXJ0cyA9IGJhc2VOYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgYmFzZVBhcnRzID0gYmFzZVBhcnRzLnNsaWNlKDAsIGJhc2VQYXJ0cy5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICBiYXNlUGFydHMgPSBiYXNlUGFydHMuY29uY2F0KG5hbWUuc3BsaXQoJy8nKSk7XG4gICAgICAgICAgICAgICAgdHJpbURvdHMoYmFzZVBhcnRzKTtcbiAgICAgICAgICAgICAgICBuYW1lID0gYmFzZVBhcnRzLmpvaW4oJy8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgbm9ybWFsaXplKCkgZnVuY3Rpb24gcGFzc2VkIHRvIGEgbG9hZGVyIHBsdWdpbidzXG4gICAgICogbm9ybWFsaXplIG1ldGhvZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtYWtlTm9ybWFsaXplKHJlbE5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9ybWFsaXplKG5hbWUsIHJlbE5hbWUpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VMb2FkKGlkKSB7XG4gICAgICAgIGZ1bmN0aW9uIGxvYWQodmFsdWUpIHtcbiAgICAgICAgICAgIGxvYWRlckNhY2hlW2lkXSA9IHZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9hZC5mcm9tVGV4dCA9IGZ1bmN0aW9uIChpZCwgdGV4dCkge1xuICAgICAgICAgICAgLy9UaGlzIG9uZSBpcyBkaWZmaWN1bHQgYmVjYXVzZSB0aGUgdGV4dCBjYW4vcHJvYmFibHkgdXNlc1xuICAgICAgICAgICAgLy9kZWZpbmUsIGFuZCBhbnkgcmVsYXRpdmUgcGF0aHMgYW5kIHJlcXVpcmVzIHNob3VsZCBiZSByZWxhdGl2ZVxuICAgICAgICAgICAgLy90byB0aGF0IGlkIHdhcyBpdCB3b3VsZCBiZSBmb3VuZCBvbiBkaXNrLiBCdXQgdGhpcyB3b3VsZCByZXF1aXJlXG4gICAgICAgICAgICAvL2Jvb3RzdHJhcHBpbmcgYSBtb2R1bGUvcmVxdWlyZSBmYWlybHkgZGVlcGx5IGZyb20gbm9kZSBjb3JlLlxuICAgICAgICAgICAgLy9Ob3Qgc3VyZSBob3cgYmVzdCB0byBnbyBhYm91dCB0aGF0IHlldC5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYW1kZWZpbmUgZG9lcyBub3QgaW1wbGVtZW50IGxvYWQuZnJvbVRleHQnKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbG9hZDtcbiAgICB9XG5cbiAgICBtYWtlUmVxdWlyZSA9IGZ1bmN0aW9uIChzeXN0ZW1SZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUsIHJlbElkKSB7XG4gICAgICAgIGZ1bmN0aW9uIGFtZFJlcXVpcmUoZGVwcywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGVwcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAvL1N5bmNocm9ub3VzLCBzaW5nbGUgbW9kdWxlIHJlcXVpcmUoJycpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZ1JlcXVpcmUoc3lzdGVtUmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlLCBkZXBzLCByZWxJZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vQXJyYXkgb2YgZGVwZW5kZW5jaWVzIHdpdGggYSBjYWxsYmFjay5cblxuICAgICAgICAgICAgICAgIC8vQ29udmVydCB0aGUgZGVwZW5kZW5jaWVzIHRvIG1vZHVsZXMuXG4gICAgICAgICAgICAgICAgZGVwcyA9IGRlcHMubWFwKGZ1bmN0aW9uIChkZXBOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHJpbmdSZXF1aXJlKHN5c3RlbVJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSwgZGVwTmFtZSwgcmVsSWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy9XYWl0IGZvciBuZXh0IHRpY2sgdG8gY2FsbCBiYWNrIHRoZSByZXF1aXJlIGNhbGwuXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgZGVwcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFtZFJlcXVpcmUudG9VcmwgPSBmdW5jdGlvbiAoZmlsZVBhdGgpIHtcbiAgICAgICAgICAgIGlmIChmaWxlUGF0aC5pbmRleE9mKCcuJykgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9ybWFsaXplKGZpbGVQYXRoLCBwYXRoLmRpcm5hbWUobW9kdWxlLmZpbGVuYW1lKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gYW1kUmVxdWlyZTtcbiAgICB9O1xuXG4gICAgLy9GYXZvciBleHBsaWNpdCB2YWx1ZSwgcGFzc2VkIGluIGlmIHRoZSBtb2R1bGUgd2FudHMgdG8gc3VwcG9ydCBOb2RlIDAuNC5cbiAgICByZXF1aXJlRm4gPSByZXF1aXJlRm4gfHwgZnVuY3Rpb24gcmVxKCkge1xuICAgICAgICByZXR1cm4gbW9kdWxlLnJlcXVpcmUuYXBwbHkobW9kdWxlLCBhcmd1bWVudHMpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBydW5GYWN0b3J5KGlkLCBkZXBzLCBmYWN0b3J5KSB7XG4gICAgICAgIHZhciByLCBlLCBtLCByZXN1bHQ7XG5cbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICBlID0gbG9hZGVyQ2FjaGVbaWRdID0ge307XG4gICAgICAgICAgICBtID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB1cmk6IF9fZmlsZW5hbWUsXG4gICAgICAgICAgICAgICAgZXhwb3J0czogZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHIgPSBtYWtlUmVxdWlyZShyZXF1aXJlRm4sIGUsIG0sIGlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vT25seSBzdXBwb3J0IG9uZSBkZWZpbmUgY2FsbCBwZXIgZmlsZVxuICAgICAgICAgICAgaWYgKGFscmVhZHlDYWxsZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FtZGVmaW5lIHdpdGggbm8gbW9kdWxlIElEIGNhbm5vdCBiZSBjYWxsZWQgbW9yZSB0aGFuIG9uY2UgcGVyIGZpbGUuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhbHJlYWR5Q2FsbGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy9Vc2UgdGhlIHJlYWwgdmFyaWFibGVzIGZyb20gbm9kZVxuICAgICAgICAgICAgLy9Vc2UgbW9kdWxlLmV4cG9ydHMgZm9yIGV4cG9ydHMsIHNpbmNlXG4gICAgICAgICAgICAvL3RoZSBleHBvcnRzIGluIGhlcmUgaXMgYW1kZWZpbmUgZXhwb3J0cy5cbiAgICAgICAgICAgIGUgPSBtb2R1bGUuZXhwb3J0cztcbiAgICAgICAgICAgIG0gPSBtb2R1bGU7XG4gICAgICAgICAgICByID0gbWFrZVJlcXVpcmUocmVxdWlyZUZuLCBlLCBtLCBtb2R1bGUuaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9JZiB0aGVyZSBhcmUgZGVwZW5kZW5jaWVzLCB0aGV5IGFyZSBzdHJpbmdzLCBzbyBuZWVkXG4gICAgICAgIC8vdG8gY29udmVydCB0aGVtIHRvIGRlcGVuZGVuY3kgdmFsdWVzLlxuICAgICAgICBpZiAoZGVwcykge1xuICAgICAgICAgICAgZGVwcyA9IGRlcHMubWFwKGZ1bmN0aW9uIChkZXBOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHIoZGVwTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vQ2FsbCB0aGUgZmFjdG9yeSB3aXRoIHRoZSByaWdodCBkZXBlbmRlbmNpZXMuXG4gICAgICAgIGlmICh0eXBlb2YgZmFjdG9yeSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFjdG9yeS5hcHBseShtLmV4cG9ydHMsIGRlcHMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFjdG9yeTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbS5leHBvcnRzID0gcmVzdWx0O1xuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVyQ2FjaGVbaWRdID0gbS5leHBvcnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RyaW5nUmVxdWlyZSA9IGZ1bmN0aW9uIChzeXN0ZW1SZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUsIGlkLCByZWxJZCkge1xuICAgICAgICAvL1NwbGl0IHRoZSBJRCBieSBhICEgc28gdGhhdFxuICAgICAgICB2YXIgaW5kZXggPSBpZC5pbmRleE9mKCchJyksXG4gICAgICAgICAgICBvcmlnaW5hbElkID0gaWQsXG4gICAgICAgICAgICBwcmVmaXgsIHBsdWdpbjtcblxuICAgICAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICBpZCA9IG5vcm1hbGl6ZShpZCwgcmVsSWQpO1xuXG4gICAgICAgICAgICAvL1N0cmFpZ2h0IG1vZHVsZSBsb29rdXAuIElmIGl0IGlzIG9uZSBvZiB0aGUgc3BlY2lhbCBkZXBlbmRlbmNpZXMsXG4gICAgICAgICAgICAvL2RlYWwgd2l0aCBpdCwgb3RoZXJ3aXNlLCBkZWxlZ2F0ZSB0byBub2RlLlxuICAgICAgICAgICAgaWYgKGlkID09PSAncmVxdWlyZScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFrZVJlcXVpcmUoc3lzdGVtUmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlLCByZWxJZCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkID09PSAnZXhwb3J0cycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhwb3J0cztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaWQgPT09ICdtb2R1bGUnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vZHVsZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9hZGVyQ2FjaGUuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRlckNhY2hlW2lkXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGVmaW5lQ2FjaGVbaWRdKSB7XG4gICAgICAgICAgICAgICAgcnVuRmFjdG9yeS5hcHBseShudWxsLCBkZWZpbmVDYWNoZVtpZF0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBsb2FkZXJDYWNoZVtpZF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmKHN5c3RlbVJlcXVpcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN5c3RlbVJlcXVpcmUob3JpZ2luYWxJZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtb2R1bGUgd2l0aCBJRDogJyArIGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL1RoZXJlIGlzIGEgcGx1Z2luIGluIHBsYXkuXG4gICAgICAgICAgICBwcmVmaXggPSBpZC5zdWJzdHJpbmcoMCwgaW5kZXgpO1xuICAgICAgICAgICAgaWQgPSBpZC5zdWJzdHJpbmcoaW5kZXggKyAxLCBpZC5sZW5ndGgpO1xuXG4gICAgICAgICAgICBwbHVnaW4gPSBzdHJpbmdSZXF1aXJlKHN5c3RlbVJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSwgcHJlZml4LCByZWxJZCk7XG5cbiAgICAgICAgICAgIGlmIChwbHVnaW4ubm9ybWFsaXplKSB7XG4gICAgICAgICAgICAgICAgaWQgPSBwbHVnaW4ubm9ybWFsaXplKGlkLCBtYWtlTm9ybWFsaXplKHJlbElkKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vTm9ybWFsaXplIHRoZSBJRCBub3JtYWxseS5cbiAgICAgICAgICAgICAgICBpZCA9IG5vcm1hbGl6ZShpZCwgcmVsSWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobG9hZGVyQ2FjaGVbaWRdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRlckNhY2hlW2lkXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGx1Z2luLmxvYWQoaWQsIG1ha2VSZXF1aXJlKHN5c3RlbVJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSwgcmVsSWQpLCBtYWtlTG9hZChpZCksIHt9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBsb2FkZXJDYWNoZVtpZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy9DcmVhdGUgYSBkZWZpbmUgZnVuY3Rpb24gc3BlY2lmaWMgdG8gdGhlIG1vZHVsZSBhc2tpbmcgZm9yIGFtZGVmaW5lLlxuICAgIGZ1bmN0aW9uIGRlZmluZShpZCwgZGVwcywgZmFjdG9yeSkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShpZCkpIHtcbiAgICAgICAgICAgIGZhY3RvcnkgPSBkZXBzO1xuICAgICAgICAgICAgZGVwcyA9IGlkO1xuICAgICAgICAgICAgaWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZmFjdG9yeSA9IGlkO1xuICAgICAgICAgICAgaWQgPSBkZXBzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlcHMgJiYgIUFycmF5LmlzQXJyYXkoZGVwcykpIHtcbiAgICAgICAgICAgIGZhY3RvcnkgPSBkZXBzO1xuICAgICAgICAgICAgZGVwcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZGVwcykge1xuICAgICAgICAgICAgZGVwcyA9IFsncmVxdWlyZScsICdleHBvcnRzJywgJ21vZHVsZSddO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9TZXQgdXAgcHJvcGVydGllcyBmb3IgdGhpcyBtb2R1bGUuIElmIGFuIElELCB0aGVuIHVzZVxuICAgICAgICAvL2ludGVybmFsIGNhY2hlLiBJZiBubyBJRCwgdGhlbiB1c2UgdGhlIGV4dGVybmFsIHZhcmlhYmxlc1xuICAgICAgICAvL2ZvciB0aGlzIG5vZGUgbW9kdWxlLlxuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIC8vUHV0IHRoZSBtb2R1bGUgaW4gZGVlcCBmcmVlemUgdW50aWwgdGhlcmUgaXMgYVxuICAgICAgICAgICAgLy9yZXF1aXJlIGNhbGwgZm9yIGl0LlxuICAgICAgICAgICAgZGVmaW5lQ2FjaGVbaWRdID0gW2lkLCBkZXBzLCBmYWN0b3J5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJ1bkZhY3RvcnkoaWQsIGRlcHMsIGZhY3RvcnkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9kZWZpbmUucmVxdWlyZSwgd2hpY2ggaGFzIGFjY2VzcyB0byBhbGwgdGhlIHZhbHVlcyBpbiB0aGVcbiAgICAvL2NhY2hlLiBVc2VmdWwgZm9yIEFNRCBtb2R1bGVzIHRoYXQgYWxsIGhhdmUgSURzIGluIHRoZSBmaWxlLFxuICAgIC8vYnV0IG5lZWQgdG8gZmluYWxseSBleHBvcnQgYSB2YWx1ZSB0byBub2RlIGJhc2VkIG9uIG9uZSBvZiB0aG9zZVxuICAgIC8vSURzLlxuICAgIGRlZmluZS5yZXF1aXJlID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIGlmIChsb2FkZXJDYWNoZVtpZF0pIHtcbiAgICAgICAgICAgIHJldHVybiBsb2FkZXJDYWNoZVtpZF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVmaW5lQ2FjaGVbaWRdKSB7XG4gICAgICAgICAgICBydW5GYWN0b3J5LmFwcGx5KG51bGwsIGRlZmluZUNhY2hlW2lkXSk7XG4gICAgICAgICAgICByZXR1cm4gbG9hZGVyQ2FjaGVbaWRdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGRlZmluZS5hbWQgPSB7fTtcblxuICAgIHJldHVybiBkZWZpbmU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYW1kZWZpbmU7XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG52YXIgXyA9IHJlcXVpcmUoJy4uL3V0aWwvdXRpbCcpO1xuXG4vKipcbiAqIEJhc2UgaW50ZXJmYWNlIGNsYXNzIGZvciBvYmplY3RzIHRoYXQgd2lzaCB0byBlbWl0IGV2ZW50cy5cbiAqXG4gKiBAY2xhc3MgSUJpbmRhYmxlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gSUJpbmRhYmxlKCkge1xuICAgIHRoaXMuX2hhbmRsZXJzID0ge307XG5cdHRoaXMuX29tbmlIYW5kbGVycyA9IFtdO1xuXHR0aGlzLl9ib3VuZEZvcndhcmRFdmVudCA9IHRoaXMuX2ZvcndhcmRFdmVudC5iaW5kKHRoaXMpO1xufVxuXG4vKipcbiAqIEJpbmRzIGEgbGlzdCBvZiBldmVudHMgdG8gdGhlIHNwZWNpZmllZCBjYWxsYmFjay5cbiAqXG4gKiBAbWV0aG9kIG9uXG4gKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBldmVudHMgLSBBIHNwYWNlLXNlcGFyYXRlZCBsaXN0IG9mIGV2ZW50cyB0byBsaXN0ZW4gZm9yLiBJZiBudWxsIGlzIHBhc3NlZCwgdGhlIGNhbGxiYWNrIHdpbGwgYmUgaW52b2tlZCBmb3IgYWxsIGV2ZW50cy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIHRvIGludm9rZSB3aGVuIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gKi9cbklCaW5kYWJsZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudHMsIGNhbGxiYWNrKSB7XG5cdGlmIChldmVudHMgPT09IG51bGwpIHtcblx0XHRpZiAodGhpcy5fb21uaUhhbmRsZXJzLmluZGV4T2YoY2FsbGJhY2spIDwgMCkge1xuXHRcdFx0dGhpcy5fb21uaUhhbmRsZXJzLnB1c2goY2FsbGJhY2spO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRldmVudHMuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0dmFyIGhhbmRsZXJzID0gdGhpcy5faGFuZGxlcnNbZXZlbnRdO1xuXHRcdFx0aWYgKCFoYW5kbGVycykge1xuXHRcdFx0XHRoYW5kbGVycyA9IFtdO1xuXHRcdFx0XHR0aGlzLl9oYW5kbGVyc1tldmVudF0gPSBoYW5kbGVycztcblx0XHRcdH1cblx0XHRcdGlmIChoYW5kbGVycy5pbmRleE9mKGNhbGxiYWNrKSA8IDApIHtcblx0XHRcdFx0aGFuZGxlcnMucHVzaChjYWxsYmFjayk7XG5cdFx0XHR9XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0fVxufTtcblxuLyoqXG4gKiBVbmJpbmRzIHRoZSBzcGVjaWZpZWQgY2FsbGJhY2sgZnJvbSB0aGUgc3BlY2lmaWVkIGV2ZW50LiBJZiBubyBjYWxsYmFjayBpcyBzcGVjaWZpZWQsIGFsbCBjYWxsYmFja3MgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQgYXJlIHJlbW92ZWQuXG4gKlxuICogQG1ldGhvZCBvZmZcbiAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IGV2ZW50cyAtIEEgc3BhY2Utc2VwYXJhdGVkIGxpc3Qgb2YgZXZlbnRzIHRvIGxpc3RlbiBmb3IuIElmIG51bGwgaXMgcGFzc2VkIHRoZSBjYWxsYmFjayB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgYWxsLWV2ZW50IGhhbmRsZXIgbGlzdC5cbiAqIEBwYXJhbSB7RnVuY3Rpb249fSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayB0byByZW1vdmUgZnJvbSB0aGUgZXZlbnQgb3Igbm90aGluZyB0byBjb21wbGV0ZWx5IGNsZWFyIHRoZSBldmVudCBjYWxsYmFja3MuXG4gKi9cbklCaW5kYWJsZS5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnRzLCBjYWxsYmFjaykge1xuXHRpZiAoZXZlbnRzID09PSBudWxsKSB7XG5cdFx0aWYgKCFjYWxsYmFjaykge1xuXHRcdFx0dGhpcy5fb21uaUhhbmRsZXJzLmxlbmd0aCA9IDA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBpbmRleCA9IHRoaXMuX29tbmlIYW5kbGVycy5pbmRleE9mKGNhbGxiYWNrKTtcblx0XHRcdGlmIChpbmRleCA+PSAwKSB7XG5cdFx0XHRcdHRoaXMuX29tbmlIYW5kbGVycy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRldmVudHMuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0dmFyIGhhbmRsZXJzID0gdGhpcy5faGFuZGxlcnNbZXZlbnRdO1xuXHRcdFx0aWYgKGhhbmRsZXJzKSB7XG5cdFx0XHRcdGlmICghY2FsbGJhY2spIHtcblx0XHRcdFx0XHRkZWxldGUgdGhpcy5faGFuZGxlcnNbZXZlbnRdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhciB0b1JlbW92ZSA9IGhhbmRsZXJzLmluZGV4T2YoY2FsbGJhY2spO1xuXHRcdFx0XHRcdGlmICh0b1JlbW92ZSA+PSAwKSB7XG5cdFx0XHRcdFx0XHRoYW5kbGVycy5zcGxpY2UodG9SZW1vdmUsIDEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0uYmluZCh0aGlzKSk7XG5cdH1cbn07XG5cbi8qKlxuICogUmV0dXJucyBhbGwgdGhlIHJlZ2lzdGVyZWQgaGFuZGxlcnMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gKlxuICogQG1ldGhvZCBoYW5kbGVyc1xuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50IC0gVGhlIG5hbWUgb2YgdGhlIGV2ZW50IGZvciB3aGljaCB0byBmZXRjaCBpdHMgaGFuZGxlcnMuXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBvbWl0T21uaUhhbmRsZXJzIC0gU2hvdWxkIHRoZSBhbGwtZXZlbnQgaGFuZGxlcnMgYmUgb21pdHRlZCBmcm9tIHRoZSByZXN1bHRpbmcgYXJyYXkuXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbklCaW5kYWJsZS5wcm90b3R5cGUuaGFuZGxlcnMgPSBmdW5jdGlvbihldmVudCwgb21pdE9tbmlIYW5kbGVycykge1xuXHR2YXIgaGFuZGxlcnMgPSAodGhpcy5faGFuZGxlcnNbZXZlbnRdIHx8IFtdKS5zbGljZSgwKTtcblx0aWYgKCFvbWl0T21uaUhhbmRsZXJzKSB7XG5cdFx0aGFuZGxlcnMucHVzaC5hcHBseShoYW5kbGVycywgdGhpcy5fb21uaUhhbmRsZXJzKTtcblx0fVxuXHRyZXR1cm4gaGFuZGxlcnM7XG59O1xuXG4vKipcbiAqIEVtaXRzIHRoZSBzcGVjaWZpZWQgZXZlbnQgYW5kIGZvcndhcmRzIGFsbCBwYXNzZWQgcGFyYW1ldGVycy5cbiAqXG4gKiBAbWV0aG9kIGVtaXRcbiAqIEBwYXJhbSB7c3RyaW5nfSBldmVudCAtIFRoZSBuYW1lIG9mIHRoZSBldmVudCB0byBlbWl0LlxuICogQHBhcmFtIHsuLi4qfSB2YXJfYXJncyAtIEFyZ3VtZW50cyB0byBmb3J3YXJkIHRvIHRoZSBldmVudCBsaXN0ZW5lciBjYWxsYmFja3MuXG4gKi9cbklCaW5kYWJsZS5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50LCB2YXJfYXJncykge1xuXHR2YXIgaGFuZGxlcnMgPSB0aGlzLl9oYW5kbGVyc1tldmVudF07XG5cdGlmIChoYW5kbGVycyB8fCB0aGlzLl9vbW5pSGFuZGxlcnMubGVuZ3RoID4gMCkge1xuXHRcdHZhciBhcmdzID0gYXJndW1lbnRzO1xuXHRcdHZhciBjb250ZXh0ID0gdGhpcztcblx0XHRpZiAoaGFuZGxlcnMpIHtcblx0XHRcdHZhciBwYXJhbXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzLCAxKTtcblx0XHRcdGhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZm4pIHtcblx0XHRcdFx0Zm4uYXBwbHkoY29udGV4dCwgcGFyYW1zKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuX29tbmlIYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG5cdFx0XHRmbi5hcHBseShjb250ZXh0LCBhcmdzKTtcblx0XHR9KTtcblx0fVxufTtcblxuLyoqXG4gKiBGb3J3YXJkcyBhbGwgZXZlbnRzIHRyaWdnZXJlZCBieSB0aGUgc3BlY2lmaWVkIGBiaW5kYWJsZWAgYXMgaWYgdGhpcyBvYmplY3Qgd2FzIGVtaXR0aW5nIHRoZW0uXG4gKlxuICogQG1ldGhvZCBmb3J3YXJkXG4gKiBAcGFyYW0ge0lCaW5kYWJsZX0gYmluZGFibGUgLSBUaGUgYElCaW5kYWJsZWAgaW5zdGFuY2UgZm9yIHdoaWNoIGFsbCBldmVudHMgd2lsbCBiZSBmb3J3YXJkZWQgdGhyb3VnaCB0aGlzIGluc3RhbmNlLlxuICovXG5JQmluZGFibGUucHJvdG90eXBlLmZvcndhcmQgPSBmdW5jdGlvbihiaW5kYWJsZSkge1xuXHRiaW5kYWJsZS5vbihudWxsLCB0aGlzLl9ib3VuZEZvcndhcmRFdmVudCk7XG59O1xuXG4vKipcbiAqIFN0b3BzIGZvcndhcmRpbmcgdGhlIGV2ZW50cyBvZiB0aGUgc3BlY2lmaWVkIGBiaW5kYWJsZWBcbiAqXG4gKiBAbWV0aG9kIHVuZm9yd2FyZFxuICogQHBhcmFtIHtJQmluZGFibGV9IGJpbmRhYmxlIC0gVGhlIGBJQmluZGFibGVgIGluc3RhbmNlIHRvIHN0b3AgZm9yd2FyZGluZy5cbiAqL1xuSUJpbmRhYmxlLnByb3RvdHlwZS51bmZvcndhcmQgPSBmdW5jdGlvbihiaW5kYWJsZSkge1xuXHRiaW5kYWJsZS5vZmYobnVsbCwgdGhpcy5fYm91bmRGb3J3YXJkRXZlbnQpO1xufTtcblxuLyoqXG4gKiBVbmJpbmRzIGFsbCBldmVudHMgYm91bmQgdG8gdGhpcyBJQmluZGFibGUgaW5zdGFuY2UuXG4gKlxuICogQG1ldGhvZCBkZXN0cm95XG4gKi9cbklCaW5kYWJsZS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuXHRkZWxldGUgdGhpcy5faGFuZGxlcnM7XG5cdGRlbGV0ZSB0aGlzLl9vbW5pSGFuZGxlcnM7XG5cdGRlbGV0ZSB0aGlzLl9ib3VuZEZvcndhcmRFdmVudDtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgbWV0aG9kIHVzZWQgdG8gZm9yd2FyZCB0aGUgZXZlbnRzIGZyb20gb3RoZXIgYElCaW5kYWJsZWAgaW5zdGFuY2VzLlxuICpcbiAqIEBtZXRob2QgX2ZvcndhcmRFdmVudFxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50IC0gVGhlIG5hbWUgb2YgdGhlIGV2ZW50IHRvIGVtaXQuXG4gKiBAcGFyYW0gey4uLip9IHZhcl9hcmdzIC0gQXJndW1lbnRzIHRvIGZvcndhcmQgdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNhbGxiYWNrcy5cbiAqIEBwcml2YXRlXG4gKi9cbklCaW5kYWJsZS5wcm90b3R5cGUuX2ZvcndhcmRFdmVudCA9IGZ1bmN0aW9uKGV2ZW50LCB2YXJfYXJncykge1xuXHR0aGlzLmVtaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogQGV4cG9ydFxuICogQHR5cGUge0lCaW5kYWJsZX1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBJQmluZGFibGU7XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG5cbnZhciBfID0gcmVxdWlyZSgnLi4vLi4vdXRpbC91dGlsJyk7XG52YXIgSUJpbmRhYmxlID0gcmVxdWlyZSgnLi4vSUJpbmRhYmxlJyk7XG52YXIgVXRpbCA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvdXRpbCcpO1xuXG4vKipcbiAqIEFuIGludGVyZmFjZSBjbGFzcyBmb3IgZmFjZXRzLCBkZWZpbmVzIHRoZSBwdWJsaWMgQVBJIHNoYXJlZCBieSBhbGwgZmFjZXRzLlxuICpcbiAqIEBjbGFzcyBGYWNldFxuICogQHBhcmFtIHtqcXVlcnl9IGNvbnRhaW5lciAtIFRoZSBjb250YWluZXIgZWxlbWVudCBmb3IgdGhpcyBmYWNldC5cbiAqIEBwYXJhbSB7R3JvdXB9IHBhcmVudEdyb3VwIC0gVGhlIGdyb3VwIHRoaXMgZmFjZXQgYmVsb25ncyB0by5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzcGVjIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhpcyBmYWNldC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGYWNldCAoY29udGFpbmVyLCBwYXJlbnRHcm91cCwgc3BlYykge1xuXHRJQmluZGFibGUuY2FsbCh0aGlzKTtcblxuXHR0aGlzLnBhcmVudEdyb3VwID0gcGFyZW50R3JvdXA7XG5cdHRoaXMuX3NwZWMgPSBzcGVjO1xuXG5cdC8vIGdlbmVyYXRlIGEgdW5pcXVlIGlkIGZvciB0aGlzIGZhY2V0IGVudHJ5IHRoYXQgY2FuIGJlIGZvdW5kIGJ5IGpxdWVyeSBmb3IgdXBkYXRpbmcgY291bnRzXG5cdHRoaXMuX3NwZWMuaWQgPSBVdGlsLnJhbmRvbUlkKCk7XG5cblx0dGhpcy5fY29udGFpbmVyID0gY29udGFpbmVyO1xuXHR0aGlzLl9lbGVtZW50ID0gbnVsbDtcbn1cblxuLyoqXG4gKiBAaW5oZXJpdGFuY2Uge0lCaW5kYWJsZX1cbiAqL1xuRmFjZXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJQmluZGFibGUucHJvdG90eXBlKTtcbkZhY2V0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZhY2V0O1xuXG4vKipcbiAqIFJldHVybnMgdGhpcyBmYWNldCdzIGtleS5cbiAqXG4gKiBAcHJvcGVydHkga2V5XG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldC5wcm90b3R5cGUsICdrZXknLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSB2YWx1ZSBvZiB0aGlzIGZhY2V0LlxuICpcbiAqIEBwcm9wZXJ0eSB2YWx1ZVxuICogQHR5cGUgeyp9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0LnByb3RvdHlwZSwgJ3ZhbHVlJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuXHR9XG59KTtcblxuLyoqXG4gKiBUaGlzIGZhY2V0J3MgY29udGFpbmVyIGVsZW1lbnQuXG4gKlxuICogQHByb3BlcnR5IGNvbnRhaW5lclxuICogQHR5cGUge2pxdWVyeX1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0LnByb3RvdHlwZSwgJ2NvbnRhaW5lcicsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlICE9PSB0aGlzLl9jb250YWluZXIgJiYgdGhpcy5fZWxlbWVudCkge1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50LnJlbW92ZSgpO1xuXHRcdH1cblxuXHRcdGlmICh2YWx1ZSAmJiB0aGlzLl9lbGVtZW50KSB7XG5cdFx0XHR2YWx1ZS5hcHBlbmQodGhpcy5fZWxlbWVudCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fY29udGFpbmVyID0gdmFsdWU7XG5cdH1cbn0pO1xuXG4vKipcbiAqIERlZmluZXMgaWYgdGhpcyBmYWNldCBoYXMgYmVlbiB2aXN1YWxseSBjb21wcmVzc2VkIHRvIGl0cyBzbWFsbGVzdCBwb3NzaWJsZSBzdGF0ZS5cbiAqIE5vdGU6IEFiYnJldmlhdGVkIGZhY2V0cyBjYW5ub3QgYmUgaW50ZXJhY3RlZCB3aXRoLlxuICpcbiAqIEBwcm9wZXJ0eSBhYmJyZXZpYXRlZFxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldC5wcm90b3R5cGUsICdhYmJyZXZpYXRlZCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcblx0fVxufSk7XG5cbi8qKlxuICogRGVmaW5lcyBpZiB0aGlzIGZhY2V0IGlzIHZpc2libGUuXG4gKlxuICogQHByb3BlcnR5IHZpc2libGVcbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXQucHJvdG90eXBlLCAndmlzaWJsZScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcblx0fVxufSk7XG5cbi8qKlxuICogVXBkYXRlcyB0aGlzIGZhY2V0J3Mgc3BlYyB3aXRoIHRoZSBwYXNzZWQgZGF0YSBhbmQgdGhlbiB1cGRhdGVzIHRoZSBmYWNldCdzIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVNwZWNcbiAqIEBwYXJhbSB7T2JqZWN0fSBzcGVjIC0gVGhlIG5ldyBzcGVjIGZvciB0aGUgZmFjZXRcbiAqL1xuRmFjZXQucHJvdG90eXBlLnVwZGF0ZVNwZWMgPSBmdW5jdGlvbiAoc3BlYykge1xuXHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBNYXJrcyB0aGlzIGZhY2V0IGFzIHNlbGVjdGVkIGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBzZWxlY3RcbiAqIEBwYXJhbSB7Kn0gZGF0YSAtIFRoZSBkYXRhIHVzZWQgdG8gc2VsZWN0IHRoaXMgZmFjZXQuXG4gKi9cbkZhY2V0LnByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG59O1xuXG4vKipcbiAqIE1hcmtzIHRoaXMgZmFjZXQgYXMgbm90IHNlbGVjdGVkIGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBkZXNlbGVjdFxuICovXG5GYWNldC5wcm90b3R5cGUuZGVzZWxlY3QgPSBmdW5jdGlvbigpIHtcblx0dGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8qKlxuICogVW5iaW5kcyB0aGlzIGluc3RhbmNlIGZyb20gYW55IHJlZmVyZW5jZSB0aGF0IGl0IG1pZ2h0IGhhdmUgd2l0aCBldmVudCBoYW5kbGVycyBhbmQgRE9NIGVsZW1lbnRzLlxuICpcbiAqIEBtZXRob2QgZGVzdHJveVxuICogQHBhcmFtIHtib29sZWFuPX0gYW5pbWF0ZWQgLSBTaG91bGQgdGhlIGZhY2V0IGJlIHJlbW92ZWQgaW4gYW4gYW5pbWF0ZWQgd2F5IGJlZm9yZSBpdCBiZWluZyBkZXN0cm95ZWQuXG4gKi9cbkZhY2V0LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oYW5pbWF0ZWQpIHtcblx0SUJpbmRhYmxlLnByb3RvdHlwZS5kZXN0cm95LmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgdGhlIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyBmb3IgdGhpcyBvYmplY3QgdG8gZnVuY3Rpb24uXG4gKlxuICogQG1ldGhvZCBfYWRkSGFuZGxlcnNcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0LnByb3RvdHlwZS5fYWRkSGFuZGxlcnMgPSBmdW5jdGlvbigpIHtcblx0dGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhbGwgdGhlIGV2ZW50IGhhbmRsZXJzIGFkZGVkIGJ5IHRoZSBgX2FkZEhhbmRsZXJzYCBmdW5jdGlvbi5cbiAqXG4gKiBAbWV0aG9kIF9yZW1vdmVIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuRmFjZXQucHJvdG90eXBlLl9yZW1vdmVIYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuXHR0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBVdGlsaXR5IGZ1bmN0aW9uIHRvIG1ha2Ugc3VyZSB0aGUgZXZlbnQgaGFuZGxlcnMgaGF2ZSBiZWVuIGFkZGVkIGFuZCBhcmUgdXBkYXRlZC5cbiAqXG4gKiBAbWV0aG9kIF9zZXR1cEhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldC5wcm90b3R5cGUuX3NldHVwSGFuZGxlcnMgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0dGhpcy5fYWRkSGFuZGxlcnMoKTtcbn07XG5cbi8qKlxuICogQGV4cG9ydFxuICogQHR5cGUge0ZhY2V0fVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0O1xuIiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG52YXIgRmFjZXRCYXIgPSByZXF1aXJlKCcuL2ZhY2V0SGlzdG9ncmFtQmFyJyk7XG5cbi8qKlxuICogVGhpcyBjbGFzcyBjcmVhdGVzIGEgaGlzdG9ncmFtIGluIHRoZSBnaXZlbiBgc3ZnQ29udGFpbmVyYCB1c2luZyB0aGUgZGF0YSBwcm92aWRlZCBpbiB0aGUgYHNwZWNgXG4gKlxuICogQGNsYXNzIEZhY2V0SGlzdG9ncmFtXG4gKiBAcGFyYW0ge2VsZW1lbnR9IHN2Z0NvbnRhaW5lciAtIFNWRyBlbGVtZW50IHdoZXJlIHRoZSBoaXN0b2dyYW0gc2hvdWxkIGJlIGNyZWF0ZWQgKGNhbiBiZSBhbiBTVkcgZ3JvdXApXG4gKiBAcGFyYW0ge09iamVjdH0gc3BlYyAtIE9iamVjdCBkZXNjcmliaW5nIHRoZSBoaXN0b2dyYW0gdG8gYmUgY3JlYXRlZC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGYWNldEhpc3RvZ3JhbSAoc3ZnQ29udGFpbmVyLCBzcGVjKSB7XG5cdHRoaXMuX3N2ZyA9IHN2Z0NvbnRhaW5lcjtcblx0dGhpcy5fc3BlYyA9IHNwZWM7XG5cdHRoaXMuX3RvdGFsV2lkdGggPSAwO1xuXHR0aGlzLl9iYXJXaWR0aCA9IDA7XG5cdHRoaXMuX21pbkJhcldpZHRoID0gKCdtaW5CYXJXaWR0aCcgaW4gc3BlYykgPyBzcGVjLm1pbkJhcldpZHRoIDogMztcblx0dGhpcy5fbWF4QmFyV2lkdGggPSAoJ21heEJhcldpZHRoJyBpbiBzcGVjKSA/IHNwZWMubWF4QmFyV2lkdGggOiBOdW1iZXIuTUFYX1ZBTFVFO1xuXHR0aGlzLl9iYXJQYWRkaW5nID0gKCdiYXJQYWRkaW5nJyBpbiBzcGVjKSA/IHNwZWMuYmFyUGFkZGluZyA6IDE7XG5cdHRoaXMuX2JhcnMgPSBbXTtcblxuXHR0aGlzLmluaXRpYWxpemVTbGljZXMoc3ZnQ29udGFpbmVyLCBzcGVjLnNsaWNlcywgc3BlYy55TWF4KTtcbn1cblxuLyoqXG4gKiBUaGUgdG90YWwgd2lkdGggb2YgdGhlIGhpc3RvZ3JhbS5cbiAqXG4gKiBAcHJvcGVydHkgdG90YWxXaWR0aFxuICogQHR5cGUge051bWJlcn1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW0ucHJvdG90eXBlLCAndG90YWxXaWR0aCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3RvdGFsV2lkdGg7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSB3aWR0aCBvZiBlYWNoIGluZGl2aWR1YWwgYmFyIGluIHRoZSBoaXN0b2dyYW0uXG4gKlxuICogQHByb3BlcnR5IGJhcldpZHRoXG4gKiBAdHlwZSB7TnVtYmVyfVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUsICdiYXJXaWR0aCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2JhcldpZHRoO1xuXHR9XG59KTtcblxuLyoqXG4gKiBUaGUgYW1vdW50IG9mIHBhZGRpbmcgdXNlZCBiZXR3ZWVuIGJhcnMgaW4gdGhlIGhpc3RvZ3JhbS5cbiAqXG4gKiBAcHJvcGVydHkgYmFyUGFkZGluZ1xuICogQHR5cGUge051bWJlcn1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW0ucHJvdG90eXBlLCAnYmFyUGFkZGluZycsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2JhclBhZGRpbmc7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSBpbnRlcm5hbCBhcnJheSBjb250YWluaW5nIHRoZSBiYXJzIGluIHRoaXMgaGlzdG9ncmFtLlxuICpcbiAqIEBwcm9wZXJ0eSBiYXJzXG4gKiBAdHlwZSB7QXJyYXl9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtLnByb3RvdHlwZSwgJ2JhcnMnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9iYXJzO1xuXHR9XG59KTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyB0aGUgc2xpY2VzIChiYXJzL2J1Y2tldHMpIG9mIHRoaXMgaGlzdG9ncmFtIGFuZCBzYXZlcyB0aGVtIHRvIHRoZSBgX2JhcnNgIGFycmF5LlxuICpcbiAqIEBtZXRob2QgaW5pdGlhbGl6ZVNsaWNlc1xuICogQHBhcmFtIHtlbGVtZW50fSBzdmcgLSBUaGUgU1ZHIGVsZW1lbnQgd2hlcmUgdGhlIHNsaWNlcyBzaG91bGQgYmUgY3JlYXRlZC5cbiAqIEBwYXJhbSB7QXJyYXl9IHNsaWNlcyAtIEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHNsaWNlcyB0byBiZSBjcmVhdGVkLlxuICogQHBhcmFtIHtOdW1iZXJ9IHlNYXggLSBUaGUgbWF4aW11bSB2YWx1ZSwgaW4gdGhlIFkgYXhpcywgdGhhdCBhbnkgZ2l2ZW4gc2xpY2Ugd2lsbCBoYXZlLlxuICovXG5GYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUuaW5pdGlhbGl6ZVNsaWNlcyA9IGZ1bmN0aW9uKHN2Zywgc2xpY2VzLCB5TWF4KSB7XG5cdHZhciBzdmdXaWR0aCA9IHN2Zy53aWR0aCgpO1xuXHR2YXIgc3ZnSGVpZ2h0ID0gc3ZnLmhlaWdodCgpO1xuXG5cdHZhciBtaW5CYXJXaWR0aCA9IHRoaXMuX21pbkJhcldpZHRoO1xuXHR2YXIgbWF4QmFyV2lkdGggPSB0aGlzLl9tYXhCYXJXaWR0aDtcblx0dmFyIGJhclBhZGRpbmcgPSB0aGlzLl9iYXJQYWRkaW5nO1xuXHR2YXIgeCA9IDA7XG5cdHZhciBiYXJzTGVuZ3RoID0gc2xpY2VzLmxlbmd0aDtcblxuXHR2YXIgbWF4QmFyc051bWJlciA9IE1hdGguZmxvb3Ioc3ZnV2lkdGggLyAobWluQmFyV2lkdGggKyBiYXJQYWRkaW5nKSk7XG5cdHZhciBzdGFja2VkQmFyc051bWJlciA9IE1hdGguY2VpbChiYXJzTGVuZ3RoIC8gbWF4QmFyc051bWJlcik7XG5cdHZhciBiYXJzVG9DcmVhdGUgPSBNYXRoLmNlaWwoYmFyc0xlbmd0aCAvIHN0YWNrZWRCYXJzTnVtYmVyKTtcblxuXHR2YXIgYmFyV2lkdGggPSBNYXRoLmZsb29yKChzdmdXaWR0aCAtICgoYmFyc1RvQ3JlYXRlIC0gMSkgKiBiYXJQYWRkaW5nKSkgLyBiYXJzVG9DcmVhdGUpO1xuXHRiYXJXaWR0aCA9IE1hdGgubWF4KGJhcldpZHRoLCBtaW5CYXJXaWR0aCk7XG5cdGJhcldpZHRoID0gTWF0aC5taW4oYmFyV2lkdGgsIG1heEJhcldpZHRoKTtcblx0dGhpcy5fYmFyV2lkdGggPSBiYXJXaWR0aDtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGJhcnNMZW5ndGg7IGkgKz0gc3RhY2tlZEJhcnNOdW1iZXIpIHtcblx0XHR2YXIgbWV0YWRhdGEgPSBbXTtcblx0XHR2YXIgY291bnQgPSAwO1xuXHRcdGZvciAodmFyIGlpID0gMDsgaWkgPCBzdGFja2VkQmFyc051bWJlciAmJiAoaSArIGlpKSA8IGJhcnNMZW5ndGg7ICsraWkpIHtcblx0XHRcdHZhciBzbGljZSA9IHNsaWNlc1tpICsgaWldO1xuXHRcdFx0Y291bnQgPSBNYXRoLm1heChjb3VudCwgc2xpY2UuY291bnQpO1xuXHRcdFx0bWV0YWRhdGEucHVzaChzbGljZSk7XG5cdFx0fVxuXHRcdHZhciBiYXJIZWlnaHQgPSBNYXRoLmNlaWwoc3ZnSGVpZ2h0ICogKGNvdW50IC8geU1heCkpO1xuXHRcdHZhciBiYXIgPSBuZXcgRmFjZXRCYXIoc3ZnLCB4LCBiYXJXaWR0aCwgYmFySGVpZ2h0LCBzdmdIZWlnaHQpO1xuXHRcdGJhci5oaWdobGlnaHRlZCA9IGZhbHNlO1xuXHRcdGJhci5tZXRhZGF0YSA9IG1ldGFkYXRhO1xuXHRcdHRoaXMuX2JhcnMucHVzaChiYXIpO1xuXHRcdHggKz0gYmFyV2lkdGggKyBiYXJQYWRkaW5nO1xuXHR9XG5cblx0dGhpcy5fdG90YWxXaWR0aCA9IHggLSBiYXJQYWRkaW5nO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIHBpeGVsIHJhbmdlIGludG8gYSBiYXIgcmFuZ2UuXG4gKlxuICogQG1ldGhvZCBwaXhlbFJhbmdlVG9CYXJSYW5nZVxuICogQHBhcmFtIHt7ZnJvbTogbnVtYmVyLCB0bzogbnVtYmVyfX0gcGl4ZWxSYW5nZSAtIFRoZSByYW5nZSBpbiBwaXhlbHMgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHt7ZnJvbTogbnVtYmVyLCB0bzogbnVtYmVyfX1cbiAqL1xuRmFjZXRIaXN0b2dyYW0ucHJvdG90eXBlLnBpeGVsUmFuZ2VUb0JhclJhbmdlID0gZnVuY3Rpb24gKHBpeGVsUmFuZ2UpIHtcblx0cmV0dXJuIHtcblx0XHRmcm9tOiBNYXRoLm1pbih0aGlzLl9iYXJzLmxlbmd0aCAtIDEsIE1hdGgubWF4KDAsIE1hdGgucm91bmQocGl4ZWxSYW5nZS5mcm9tIC8gKHRoaXMuX2JhcldpZHRoICsgdGhpcy5fYmFyUGFkZGluZykpKSksXG5cdFx0dG86IE1hdGgubWluKHRoaXMuX2JhcnMubGVuZ3RoIC0gMSwgTWF0aC5tYXgoMCwgTWF0aC5yb3VuZCgocGl4ZWxSYW5nZS50byAtIHRoaXMuX2JhcldpZHRoKSAvICh0aGlzLl9iYXJXaWR0aCArIHRoaXMuX2JhclBhZGRpbmcpKSkpXG5cdH07XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgYmFyIHJhbmdlIGludG8gYSBwaXhlbCByYW5nZS5cbiAqXG4gKiBAbWV0aG9kIGJhclJhbmdlVG9QaXhlbFJhbmdlXG4gKiBAcGFyYW0ge3tmcm9tOiBudW1iZXIsIHRvOiBudW1iZXJ9fSBiYXJSYW5nZSAtIFRoZSBiYXIgcmFuZ2UgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHt7ZnJvbTogbnVtYmVyLCB0bzogbnVtYmVyfX1cbiAqL1xuRmFjZXRIaXN0b2dyYW0ucHJvdG90eXBlLmJhclJhbmdlVG9QaXhlbFJhbmdlID0gZnVuY3Rpb24gKGJhclJhbmdlKSB7XG5cdHJldHVybiB7XG5cdFx0ZnJvbTogYmFyUmFuZ2UuZnJvbSAqICh0aGlzLl9iYXJXaWR0aCArIHRoaXMuX2JhclBhZGRpbmcpLFxuXHRcdHRvOiAoYmFyUmFuZ2UudG8gKiAodGhpcy5fYmFyV2lkdGggKyB0aGlzLl9iYXJQYWRkaW5nKSkgKyB0aGlzLl9iYXJXaWR0aFxuXHR9O1xufTtcblxuLyoqXG4gKiBIaWdobGlnaHRzIHRoZSBnaXZlbiBiYXIgcmFuZ2UuXG4gKlxuICogQG1ldGhvZCBoaWdobGlnaHRSYW5nZVxuICogQHBhcmFtIHt7ZnJvbTogbnVtYmVyLCB0bzogbnVtYmVyfX0gcmFuZ2UgLSBUaGUgYmFyIHJhbmdlIHRvIGhpZ2hsaWdodC5cbiAqL1xuRmFjZXRIaXN0b2dyYW0ucHJvdG90eXBlLmhpZ2hsaWdodFJhbmdlID0gZnVuY3Rpb24gKHJhbmdlKSB7XG5cdHZhciBiYXJzID0gdGhpcy5fYmFycztcblx0Zm9yICh2YXIgaSA9IDAsIG4gPSBiYXJzLmxlbmd0aDsgaSA8IG47ICsraSkge1xuXHRcdGJhcnNbaV0uaGlnaGxpZ2h0ZWQgPSAoaSA+PSByYW5nZS5mcm9tICYmIGkgPD0gcmFuZ2UudG8pO1xuXHR9XG59O1xuXG4vKipcbiAqIFNlbGVjdHMgdGhlIHNwZWNpZmllZCBjb3VudHMgZm9yIGVhY2ggYmFyIGFzIHNwZWNpZmllZCBpbiB0aGUgYHNsaWNlc2AgcGFyYW1ldGVyLlxuICpcbiAqIEBtZXRob2Qgc2VsZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gc2xpY2VzIC0gRGF0YSB1c2VkIHRvIHNlbGVjdCBzdWItYmFyIGNvdW50cyBpbiB0aGlzIGhpc3RvZ3JhbS5cbiAqL1xuRmFjZXRIaXN0b2dyYW0ucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChzbGljZXMpIHtcblx0dmFyIGJhcnMgPSB0aGlzLl9iYXJzO1xuXHR2YXIgeU1heCA9IHRoaXMuX3NwZWMueU1heDtcblx0dmFyIHN2Z0hlaWdodCA9IHRoaXMuX3N2Zy5oZWlnaHQoKTtcblxuXHRmb3IgKHZhciBpID0gMCwgbiA9IGJhcnMubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0dmFyIGJhciA9IGJhcnNbaV07XG5cdFx0dmFyIGJhck1ldGFkYXRhID0gYmFyLm1ldGFkYXRhO1xuXHRcdGZvciAodmFyIGlpID0gMCwgbm4gPSBiYXJNZXRhZGF0YS5sZW5ndGg7IGlpIDwgbm47ICsraWkpIHtcblx0XHRcdHZhciBzbGljZSA9IGJhck1ldGFkYXRhW2lpXTtcblx0XHRcdHZhciBjb3VudCA9IDA7XG5cdFx0XHRpZiAoc2xpY2UubGFiZWwgaW4gc2xpY2VzKSB7XG5cdFx0XHRcdGNvdW50ID0gc2xpY2VzW3NsaWNlLmxhYmVsXTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIG5ld0hlaWdodCA9IE1hdGguY2VpbChzdmdIZWlnaHQgKiAoY291bnQgLyB5TWF4KSk7XG5cdFx0XHRpZiAoYmFyLnNlbGVjdGVkSGVpZ2h0ID09PSBudWxsKSB7XG5cdFx0XHRcdGJhci5zZWxlY3RlZEhlaWdodCA9IG5ld0hlaWdodDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGJhci5zZWxlY3RlZEhlaWdodCA9IE1hdGgubWF4KGJhci5zZWxlY3RlZEhlaWdodCwgbmV3SGVpZ2h0KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogQ2xlYXJzIHRoZSBzZWxlY3Rpb24gc3RhdGUgb2YgYWxsIGJhcnMgaW4gdGhpcyBoaXN0b2dyYW0uXG4gKlxuICogQG1ldGhvZCBkZXNlbGVjdFxuICovXG5GYWNldEhpc3RvZ3JhbS5wcm90b3R5cGUuZGVzZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBiYXJzID0gdGhpcy5fYmFycztcblx0Zm9yICh2YXIgaSA9IDAsIG4gPSBiYXJzLmxlbmd0aDsgaSA8IG47ICsraSkge1xuXHRcdGJhcnNbaV0uc2VsZWN0ZWRIZWlnaHQgPSBudWxsO1xuXHR9XG59O1xuXG4vKipcbiAqIEBleHBvcnRcbiAqIEB0eXBlIHtIaXN0b2dyYW19XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRIaXN0b2dyYW07XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG5cbi8qKlxuICogSGVscGVyIGNsYXNzIHRvIGNyZWF0ZSBiYXJzIGZvciB0aGUgaGlzdG9ncmFtLlxuICpcbiAqIEBjbGFzcyBGYWNldEhpc3RvZ3JhbUJhclxuICogQHBhcmFtIHtqUXVlcnl9IGNvbnRhaW5lciAtIFRoZSBzdmcgZWxlbWVudCB0byBhZGQgdGhlIGJhciB0bywgY2FuIGJlIGEgcGFwZXIgb3IgYSBncm91cC5cbiAqIEBwYXJhbSB7TnVtYmVyfSB4IC0gVGhlIHggY29vcmRpbmF0ZSB3aGVyZSB0aGUgYmFyIHNob3VsZCBiZSBjcmVhdGVkLlxuICogQHBhcmFtIHtOdW1iZXJ9IHdpZHRoIC0gVGhlIHdpZHRoIG9mIHRoZSBiYXIuXG4gKiBAcGFyYW0ge051bWJlcn0gaGVpZ2h0IC0gVGhlIGhlaWdodCBvZiB0aGUgYmFyLlxuICogQHBhcmFtIHtOdW1iZXJ9IG1heEhlaWdodCAtIFRoZSBtYXhpbXVtIGhlaWdodCBvZiB0aGUgYmFyLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZhY2V0SGlzdG9ncmFtQmFyIChjb250YWluZXIsIHgsIHdpZHRoLCBoZWlnaHQsIG1heEhlaWdodCkge1xuXHR0aGlzLl9tZXRhZGF0YSA9IG51bGw7XG5cdHRoaXMuX2hpZ2hsaWdodGVkID0gZmFsc2U7XG5cblx0dGhpcy5fZ3JvdXBFbGVtZW50ID0gJChkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywnZycpKTtcblx0dGhpcy5fZ3JvdXBFbGVtZW50LmF0dHIoJ3RyYW5zZm9ybScsIFwidHJhbnNsYXRlKDAsIFwiICsgbWF4SGVpZ2h0ICsgXCIpLCBzY2FsZSgxLCAtMSlcIik7XG5cdHRoaXMuX2dyb3VwRWxlbWVudC5jc3MoJ3RyYW5zZm9ybScsIFwidHJhbnNsYXRlKDAsIFwiICsgbWF4SGVpZ2h0ICsgXCJweCkgc2NhbGUoMSwgLTEpXCIpO1xuXG5cdGNvbnRhaW5lci5hcHBlbmQodGhpcy5fZ3JvdXBFbGVtZW50KTtcblxuXHR0aGlzLl9iYWNrRWxlbWVudCA9ICQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsJ3JlY3QnKSk7XG5cdHRoaXMuX2JhY2tFbGVtZW50LmFkZENsYXNzKCdmYWNldC1oaXN0b2dyYW0tYmFyJyk7XG5cdHRoaXMuX2JhY2tFbGVtZW50LmFkZENsYXNzKCdmYWNldC1oaXN0b2dyYW0tYmFyLXRyYW5zZm9ybScpO1xuXHR0aGlzLl9ncm91cEVsZW1lbnQuYXBwZW5kKHRoaXMuX2JhY2tFbGVtZW50KTtcblxuXHR0aGlzLl9lbGVtZW50ID0gJChkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywncmVjdCcpKTtcblx0dGhpcy5fZWxlbWVudC5hZGRDbGFzcygnZmFjZXQtaGlzdG9ncmFtLWJhcicpO1xuXHR0aGlzLl9lbGVtZW50LmFkZENsYXNzKCdmYWNldC1oaXN0b2dyYW0tYmFyLXRyYW5zZm9ybScpO1xuXHR0aGlzLl9ncm91cEVsZW1lbnQuYXBwZW5kKHRoaXMuX2VsZW1lbnQpO1xuXG5cdHRoaXMuX3NlbGVjdGVkSGVpZ2h0ID0gbnVsbDtcblxuXHR0aGlzLnggPSB4O1xuXHR0aGlzLnkgPSAwO1xuXHR0aGlzLndpZHRoID0gd2lkdGg7XG5cdHRoaXMuaGVpZ2h0ID0gMDtcblx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0dGhpcy5fb25Nb3VzZUVudGVySGFuZGxlciA9IG51bGw7XG5cdHRoaXMuX29uTW91c2VMZWF2ZUhhbmRsZXIgPSBudWxsO1xuXHR0aGlzLl9vbkNsaWNrSGFuZGxlciA9IG51bGw7XG59XG5cbi8qKlxuICogVGhlIHggcG9zaXRpb24gb2YgdGhpcyBiYXIuXG4gKlxuICogQHByb3BlcnR5IHhcbiAqIEB0eXBlIHtOdW1iZXJ8c3RyaW5nfVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLCAneCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3g7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdHRoaXMuX2VsZW1lbnQuYXR0cigneCcsIHZhbHVlKTtcblx0XHR0aGlzLl9iYWNrRWxlbWVudC5hdHRyKCd4JywgdmFsdWUpO1xuXHRcdHRoaXMuX3ggPSB2YWx1ZTtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIHkgcG9zaXRpb24gb2YgdGhpcyBiYXIuIChkb2VzIG5vdCBhY2NvdW50IGZvciBDU1Mgc3R5bGluZylcbiAqXG4gKiBAcHJvcGVydHkgeVxuICogQHR5cGUge051bWJlcnxzdHJpbmd9XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICd5Jywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5feTtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0dGhpcy5fZWxlbWVudC5hdHRyKCd5JywgdmFsdWUpO1xuXHRcdHRoaXMuX2JhY2tFbGVtZW50LmF0dHIoJ3knLCB2YWx1ZSk7XG5cdFx0dGhpcy5feSA9IHZhbHVlO1xuXHR9XG59KTtcblxuLyoqXG4gKiBUaGUgd2lkdGggb2YgdGhpcyBiYXIuXG4gKlxuICogQHByb3BlcnR5IHdpZHRoXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLCAnd2lkdGgnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl93aWR0aDtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0dGhpcy5fZWxlbWVudC5hdHRyKCd3aWR0aCcsIHZhbHVlKTtcblx0XHR0aGlzLl9iYWNrRWxlbWVudC5hdHRyKCd3aWR0aCcsIHZhbHVlKTtcblx0XHR0aGlzLl93aWR0aCA9IHZhbHVlO1xuXHR9XG59KTtcblxuLyoqXG4gKiBUaGUgaGVpZ2h0IG9mIHRoaXMgYmFyLlxuICpcbiAqIEBwcm9wZXJ0eSBoZWlnaHRcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICdoZWlnaHQnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9oZWlnaHQ7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdGlmICh0aGlzLl9zZWxlY3RlZEhlaWdodCA9PT0gbnVsbCkge1xuXHRcdFx0dGhpcy5fZWxlbWVudC5hdHRyKCdoZWlnaHQnLCB2YWx1ZSk7XG5cdFx0XHR0aGlzLl9lbGVtZW50LmNzcygnaGVpZ2h0JywgdmFsdWUpO1xuXHRcdFx0dGhpcy5fZWxlbWVudC5jc3MoJ2hlaWdodCcpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2JhY2tFbGVtZW50LmF0dHIoJ2hlaWdodCcsIHZhbHVlKTtcblx0XHR0aGlzLl9iYWNrRWxlbWVudC5jc3MoJ2hlaWdodCcsIHZhbHVlKTtcblx0XHR0aGlzLl9iYWNrRWxlbWVudC5jc3MoJ2hlaWdodCcpO1xuXG5cdFx0dGhpcy5faGVpZ2h0ID0gdmFsdWU7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSBoZWlnaHQgb2YgdGhlIHNlbGVjdGlvbiBmb3IgdGhpcyBiYXIuXG4gKlxuICogQHByb3BlcnR5IHNlbGVjdGVkSGVpZ2h0XG4gKiBAdHlwZSB7TnVtYmVyfG51bGx9XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICdzZWxlY3RlZEhlaWdodCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NlbGVjdGVkSGVpZ2h0O1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IG51bGwpIHtcblx0XHRcdHRoaXMuX2VsZW1lbnQuYXR0cignaGVpZ2h0JywgdmFsdWUpO1xuXHRcdFx0dGhpcy5fZWxlbWVudC5jc3MoJ2hlaWdodCcsIHZhbHVlKTtcblx0XHRcdHRoaXMuX2VsZW1lbnQuY3NzKCdoZWlnaHQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fZWxlbWVudC5hdHRyKCdoZWlnaHQnLCB0aGlzLl9oZWlnaHQpO1xuXHRcdFx0dGhpcy5fZWxlbWVudC5jc3MoJ2hlaWdodCcsIHRoaXMuX2hlaWdodCk7XG5cdFx0XHR0aGlzLl9lbGVtZW50LmNzcygnaGVpZ2h0Jyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fc2VsZWN0ZWRIZWlnaHQgPSB2YWx1ZTtcblx0fVxufSk7XG5cbi8qKlxuICogSG9sZHMgYW55IG9iamVjdCBhcyB0aGUgbWV0YWRhdGEgZm9yIHRoaXMgYmFyLlxuICpcbiAqIEBwcm9wZXJ0eSBtZXRhZGF0YVxuICogQHR5cGUgeyp9XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICdtZXRhZGF0YScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX21ldGFkYXRhO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHR0aGlzLl9tZXRhZGF0YSA9IHZhbHVlO1xuXHR9XG59KTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdHMgd2l0aCB0aGUgc3ludGhlc2l6ZWQgaW5mbyBvZiB0aGlzIGJhci5cbiAqXG4gKiBAcHJvcGVydHkgaW5mb1xuICogQHR5cGUge09iamVjdH1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLCAnaW5mbycsIHtcblx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0bGFiZWw6IHRoaXMuX21ldGFkYXRhLm1hcChmdW5jdGlvbihpbmZvKSB7XG5cdFx0XHRcdHJldHVybiBpbmZvLmxhYmVsO1xuXHRcdFx0fSksXG5cblx0XHRcdGNvdW50OiB0aGlzLl9tZXRhZGF0YS5tYXAoZnVuY3Rpb24oaW5mbykge1xuXHRcdFx0XHRyZXR1cm4gaW5mby5jb3VudDtcblx0XHRcdH0pLFxuXG5cdFx0XHRtZXRhZGF0YTogdGhpcy5fbWV0YWRhdGEubWFwKGZ1bmN0aW9uKGluZm8pIHtcblx0XHRcdFx0cmV0dXJuIGluZm8ubWV0YWRhdGE7XG5cdFx0XHR9KVxuXHRcdH07XG5cdH1cbn0pO1xuXG4vKipcbiAqIFdoZXRoZXIgb3Igbm90IHRoaXMgYmFyIGlzIGN1cnJlbnRseSBoaWdobGlnaHRlZC5cbiAqXG4gKiBAcHJvcGVydHkgaGlnaGxpZ2h0ZWRcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLCAnaGlnaGxpZ2h0ZWQnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9oaWdobGlnaHRlZDtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlICE9PSB0aGlzLl9oaWdobGlnaHRlZCkge1xuXHRcdFx0dGhpcy5fZWxlbWVudC50b2dnbGVDbGFzcyhcImZhY2V0LWhpc3RvZ3JhbS1iYXIgZmFjZXQtaGlzdG9ncmFtLWJhci1oaWdobGlnaHRlZFwiKTtcblx0XHR9XG5cdFx0dGhpcy5faGlnaGxpZ2h0ZWQgPSB2YWx1ZTtcblx0fVxufSk7XG5cbi8qKlxuICogQSBjYWxsYmFjayBmdW5jdGlvbiBpbnZva2VkIHdoZW4gdGhlIG1vdXNlIGVudGVycyB0aGlzIGJhci5cbiAqXG4gKiBAcHJvcGVydHkgb25Nb3VzZUVudGVyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICdvbk1vdXNlRW50ZXInLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9vbk1vdXNlRW50ZXJIYW5kbGVyO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHR0aGlzLl9vbk1vdXNlRW50ZXJIYW5kbGVyID0gdmFsdWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX29uTW91c2VFbnRlckhhbmRsZXIgPSBudWxsO1xuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogQSBjYWxsYmFjayBmdW5jdGlvbiBpbnZva2VkIHdoZW4gdGhlIG1vdXNlIGxlYXZlcyB0aGlzIGJhci5cbiAqXG4gKiBAcHJvcGVydHkgb25Nb3VzZUxlYXZlXG4gKiBAdHlwZSB7ZnVuY3Rpb259XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICdvbk1vdXNlTGVhdmUnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9vbk1vdXNlTGVhdmVIYW5kbGVyO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHR0aGlzLl9vbk1vdXNlTGVhdmVIYW5kbGVyID0gdmFsdWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX29uTW91c2VMZWF2ZUhhbmRsZXIgPSBudWxsO1xuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogQSBjYWxsYmFjayBmdW5jdGlvbiBpbnZva2VkIHdoZW4gdGhlIGJhciBpcyBjbGlja2VkLlxuICpcbiAqIEBwcm9wZXJ0eSBvbkNsaWNrXG4gKiBAdHlwZSB7ZnVuY3Rpb259XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldEhpc3RvZ3JhbUJhci5wcm90b3R5cGUsICdvbkNsaWNrJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fb25DbGlja0hhbmRsZXI7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHRoaXMuX29uQ2xpY2tIYW5kbGVyID0gdmFsdWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX29uQ2xpY2tIYW5kbGVyID0gbnVsbDtcblx0XHR9XG5cdH1cbn0pO1xuXG4vKipcbiAqIEFkZHMgdGhlIHJlcXVpcmVkIGV2ZW50IGhhbmRsZXJzIG5lZWRlZCB0byB0cmlnZ2VyIHRoaXMgYmFyJ3Mgb3duIGV2ZW50cy5cbiAqXG4gKiBAbWV0aG9kIF9hZGRIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLl9hZGRIYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9lbGVtZW50LmhvdmVyKFxuXHRcdHRoaXMuX29uTW91c2VFbnRlci5iaW5kKHRoaXMpLFxuXHRcdHRoaXMuX29uTW91c2VMZWF2ZS5iaW5kKHRoaXMpXG5cdCk7XG5cdHRoaXMuX2VsZW1lbnQuY2xpY2sodGhpcy5fb25DbGljay5iaW5kKHRoaXMpKTtcblxuXHR0aGlzLl9iYWNrRWxlbWVudC5ob3Zlcihcblx0XHR0aGlzLl9vbk1vdXNlRW50ZXIuYmluZCh0aGlzKSxcblx0XHR0aGlzLl9vbk1vdXNlTGVhdmUuYmluZCh0aGlzKVxuXHQpO1xuXHR0aGlzLl9iYWNrRWxlbWVudC5jbGljayh0aGlzLl9vbkNsaWNrLmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFueSBhZGRlZCBldmVudCBoYW5kbGVycywgdmlydHVhbGx5IFwibXV0aW5nXCIgdGhpcyBiYXJcbiAqXG4gKiBAbWV0aG9kIF9yZW1vdmVIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLl9yZW1vdmVIYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9lbGVtZW50LnVuYmluZCgnY2xpY2snKTtcblx0dGhpcy5fZWxlbWVudC51bmJpbmQoJ2hvdmVyJyk7XG5cblx0dGhpcy5fYmFja0VsZW1lbnQudW5iaW5kKCdjbGljaycpO1xuXHR0aGlzLl9iYWNrRWxlbWVudC51bmJpbmQoJ2hvdmVyJyk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgdGhlIGBtb3VzZWVudGVyYCBldmVudC5cbiAqXG4gKiBAbWV0aG9kIF9vbk1vdXNlRW50ZXJcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gVGhlIGV2ZW50IHRyaWdnZXJlZC5cbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZS5fb25Nb3VzZUVudGVyID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRpZiAodGhpcy5fb25Nb3VzZUVudGVySGFuZGxlcikge1xuXHRcdHRoaXMuX29uTW91c2VFbnRlckhhbmRsZXIodGhpcywgZXZlbnQpO1xuXHR9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgdGhlIGBtb3VzZWxlYXZlYCBldmVudC5cbiAqXG4gKiBAbWV0aG9kIF9vbk1vdXNlTGVhdmVcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gVGhlIGV2ZW50IHRyaWdnZXJlZC5cbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0SGlzdG9ncmFtQmFyLnByb3RvdHlwZS5fb25Nb3VzZUxlYXZlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRpZiAodGhpcy5fb25Nb3VzZUxlYXZlSGFuZGxlcikge1xuXHRcdHRoaXMuX29uTW91c2VMZWF2ZUhhbmRsZXIodGhpcywgZXZlbnQpO1xuXHR9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgdGhlIGBjbGlja2AgZXZlbnQuXG4gKlxuICogQG1ldGhvZCBfb25DbGlja1xuICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSBUaGUgZXZlbnQgdHJpZ2dlcmVkLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIaXN0b2dyYW1CYXIucHJvdG90eXBlLl9vbkNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRpZiAodGhpcy5fb25DbGlja0hhbmRsZXIpIHtcblx0XHR0aGlzLl9vbkNsaWNrSGFuZGxlcih0aGlzLCBldmVudCk7XG5cdH1cbn07XG5cbi8qKlxuICogQGV4cG9ydFxuICogQHR5cGUge0ZhY2V0SGlzdG9ncmFtQmFyfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0SGlzdG9ncmFtQmFyO1xuIiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG5cbi8qKlxuICogSGVscGVyIGNsYXNzIHRvIG1hbmFnZSB0aGUgcmFuZ2UgZmlsdGVyaW5nIHRvb2xzLlxuICpcbiAqIEBjbGFzcyBGYWNldEhpc3RvZ3JhbUZpbHRlclxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBBIGpRdWVyeSB3cmFwcGVkIGVsZW1lbnQgdGhhdCBjb250YWlucyBhbGwgdGhlIHJhbmdlIG1hbmlwdWxhdGlvbiB0b29scy5cbiAqIEBwYXJhbSB7RmFjZXRIaXN0b2dyYW19IGhpc3RvZ3JhbSAtIFRoZSBoaXN0b2dyYW0gdG8gd2hpY2ggdGhlIHRvb2xzIHdpbGwgYmUgbGlua2VkIHRvLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZhY2V0SGlzdG9ncmFtRmlsdGVyIChlbGVtZW50LCBoaXN0b2dyYW0pIHtcblx0dGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG5cdHRoaXMuX2hpc3RvZ3JhbSA9IGhpc3RvZ3JhbTtcblx0dGhpcy5fcmFuZ2VGaWx0ZXIgPSBlbGVtZW50LmZpbmQoJy5mYWNldC1yYW5nZS1maWx0ZXInKTtcblx0dGhpcy5fbGVmdEhhbmRsZSA9IHRoaXMuX3JhbmdlRmlsdGVyLmZpbmQoJy5mYWNldC1yYW5nZS1maWx0ZXItbGVmdCcpO1xuXHR0aGlzLl9yaWdodEhhbmRsZSA9IHRoaXMuX3JhbmdlRmlsdGVyLmZpbmQoJy5mYWNldC1yYW5nZS1maWx0ZXItcmlnaHQnKTtcblxuXHR0aGlzLl9jdXJyZW50UmFuZ2VMYWJlbCA9IGVsZW1lbnQuZmluZCgnLmZhY2V0LXJhbmdlLWN1cnJlbnQnKTtcblx0dGhpcy5fcGFnZUxlZnQgPSBlbGVtZW50LmZpbmQoJy5mYWNldC1wYWdlLWxlZnQnKTtcblx0dGhpcy5fcGFnZVJpZ2h0ID0gZWxlbWVudC5maW5kKCcuZmFjZXQtcGFnZS1yaWdodCcpO1xuXG5cdHRoaXMuX2RyYWdnaW5nTGVmdCA9IGZhbHNlO1xuXHR0aGlzLl9kcmFnZ2luZ0xlZnRYID0gMDtcblx0dGhpcy5fY2FuRHJhZ0xlZnQgPSBmYWxzZTtcblxuXHR0aGlzLl9kcmFnZ2luZ1JpZ2h0ID0gZmFsc2U7XG5cdHRoaXMuX2RyYWdnaW5nUmlnaHRYID0gMDtcblx0dGhpcy5fY2FuRHJhZ1JpZ2h0ID0gZmFsc2U7XG5cblx0dGhpcy5fcGl4ZWxSYW5nZSA9IHtcblx0XHRmcm9tOiAwLFxuXHRcdHRvOiAwXG5cdH07XG5cblx0dGhpcy5fYmFyUmFuZ2UgPSB7XG5cdFx0ZnJvbTogMCxcblx0XHR0bzogMFxuXHR9O1xuXG5cdHRoaXMuX21heEJhclJhbmdlID0ge1xuXHRcdGZyb206IDAsXG5cdFx0dG86IChoaXN0b2dyYW0uYmFycy5sZW5ndGggLSAxKVxuXHR9O1xuXG5cdHRoaXMuX29uRmlsdGVyQ2hhbmdlZCA9IG51bGw7XG5cblx0dGhpcy5faW5pdGlhbGl6ZURyYWdnaW5nKCk7XG5cdHRoaXMuX2luaXRpYWxpemVQYWdpbmF0aW9uKCk7XG5cblx0dGhpcy5fcmFuZ2VGaWx0ZXIucmVtb3ZlQ2xhc3MoJ2ZhY2V0LXJhbmdlLWZpbHRlci1pbml0Jyk7XG59XG5cbi8qKlxuICogQSBjYWxsYmFjayBmdW5jdGlvbiBpbnZva2VkIHdoZW4gdGhlIGZpbHRlciByYW5nZSBpcyBjaGFuZ2VkLlxuICpcbiAqIEBwcm9wZXJ0eSBvbkZpbHRlckNoYW5nZWRcbiAqIEB0eXBlIHtmdW5jdGlvbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtRmlsdGVyLnByb3RvdHlwZSwgJ29uRmlsdGVyQ2hhbmdlZCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX29uRmlsdGVyQ2hhbmdlZDtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0dGhpcy5fb25GaWx0ZXJDaGFuZ2VkID0gdmFsdWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX29uRmlsdGVyQ2hhbmdlZCA9IG51bGw7XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBiYXIgcmFuZ2Ugb2YgdGhpcyBoaXN0b2dyYW0gZmlsdGVyLlxuICpcbiAqIEBwcm9wZXJ0eSBiYXJSYW5nZVxuICogQHR5cGUge09iamVjdH1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtRmlsdGVyLnByb3RvdHlwZSwgJ2JhclJhbmdlJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fYmFyUmFuZ2U7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHR0aGlzLnNldEZpbHRlckJhclJhbmdlKHZhbHVlLCBmYWxzZSk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHBpeGVsIHJhbmdlIG9mIHRoaXMgaGlzdG9ncmFtIGZpbHRlci5cbiAqXG4gKiBAcHJvcGVydHkgcGl4ZWxSYW5nZVxuICogQHR5cGUge09iamVjdH1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SGlzdG9ncmFtRmlsdGVyLnByb3RvdHlwZSwgJ3BpeGVsUmFuZ2UnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9waXhlbFJhbmdlO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0dGhpcy5zZXRGaWx0ZXJQaXhlbFJhbmdlKHZhbHVlLCBmYWxzZSk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBkcmFnZ2luZyBmdW5jdGlvbmFsaXR5IGZvciB0aGUgcmFuZ2Ugc2VsZWN0aW9uIGNvbnRyb2xzLlxuICpcbiAqIEBtZXRob2QgX2luaXRpYWxpemVEcmFnZ2luZ1xuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIaXN0b2dyYW1GaWx0ZXIucHJvdG90eXBlLl9pbml0aWFsaXplRHJhZ2dpbmcgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjYWxjdWxhdGVGcm9tID0gZnVuY3Rpb24gKHJhbmdlLCBvZmZzZXQsIGJhcldpZHRoLCB0b3RhbFdpZHRoKSB7XG5cdFx0cmFuZ2UuZnJvbSA9IE1hdGgubWF4KDAsIHJhbmdlLmZyb20gKyBvZmZzZXQpO1xuXHRcdGlmIChyYW5nZS5mcm9tID4gcmFuZ2UudG8gLSBiYXJXaWR0aCkge1xuXHRcdFx0aWYgKHJhbmdlLmZyb20gKyBiYXJXaWR0aCA8IHRvdGFsV2lkdGgpIHtcblx0XHRcdFx0cmFuZ2UudG8gPSByYW5nZS5mcm9tICsgYmFyV2lkdGg7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyYW5nZS5mcm9tID0gdG90YWxXaWR0aCAtIGJhcldpZHRoO1xuXHRcdFx0XHRyYW5nZS50byA9IHRvdGFsV2lkdGg7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdHZhciBjYWxjdWxhdGVUbyA9IGZ1bmN0aW9uIChyYW5nZSwgb2Zmc2V0LCBiYXJXaWR0aCwgdG90YWxXaWR0aCkge1xuXHRcdHJhbmdlLnRvID0gTWF0aC5taW4odG90YWxXaWR0aCwgcmFuZ2UudG8gKyBvZmZzZXQpO1xuXHRcdGlmIChyYW5nZS50byA8IHJhbmdlLmZyb20gKyBiYXJXaWR0aCkge1xuXHRcdFx0aWYgKHJhbmdlLnRvIC0gYmFyV2lkdGggPiAwKSB7XG5cdFx0XHRcdHJhbmdlLmZyb20gPSByYW5nZS50byAtIGJhcldpZHRoO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmFuZ2UuZnJvbSA9IDA7XG5cdFx0XHRcdHJhbmdlLnRvID0gYmFyV2lkdGg7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdHZhciBiYXJXaWR0aCA9IHRoaXMuX2hpc3RvZ3JhbS5iYXJXaWR0aDtcblx0dmFyIHRvdGFsV2lkdGggPSB0aGlzLl9oaXN0b2dyYW0udG90YWxXaWR0aDtcblxuXHR2YXIgZW5kRHJhZ2dpbmcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRpZiAodGhpcy5fZHJhZ2dpbmdMZWZ0IHx8IHRoaXMuX2RyYWdnaW5nUmlnaHQpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgcmFuZ2UgPSB7XG5cdFx0XHRcdGZyb206IHRoaXMuX3BpeGVsUmFuZ2UuZnJvbSxcblx0XHRcdFx0dG86IHRoaXMuX3BpeGVsUmFuZ2UudG9cblx0XHRcdH07XG5cblx0XHRcdGlmICh0aGlzLl9kcmFnZ2luZ0xlZnQpIHtcblx0XHRcdFx0dGhpcy5fY2FuRHJhZ0xlZnQgPSBmYWxzZTtcblx0XHRcdFx0dGhpcy5fZHJhZ2dpbmdMZWZ0ID0gZmFsc2U7XG5cdFx0XHRcdGNhbGN1bGF0ZUZyb20ocmFuZ2UsIChldmVudC5jbGllbnRYIC0gdGhpcy5fZHJhZ2dpbmdMZWZ0WCksIGJhcldpZHRoLCB0b3RhbFdpZHRoKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX2RyYWdnaW5nUmlnaHQpIHtcblx0XHRcdFx0dGhpcy5fY2FuRHJhZ1JpZ2h0ID0gZmFsc2U7XG5cdFx0XHRcdHRoaXMuX2RyYWdnaW5nUmlnaHQgPSBmYWxzZTtcblx0XHRcdFx0Y2FsY3VsYXRlVG8ocmFuZ2UsIChldmVudC5jbGllbnRYIC0gdGhpcy5fZHJhZ2dpbmdSaWdodFgpLCBiYXJXaWR0aCwgdG90YWxXaWR0aCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2V0RmlsdGVyUGl4ZWxSYW5nZShyYW5nZSwgdHJ1ZSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9LmJpbmQodGhpcyk7XG5cblx0dGhpcy5fZWxlbWVudC5tb3VzZWxlYXZlKGVuZERyYWdnaW5nKTtcblx0dGhpcy5fZWxlbWVudC5tb3VzZXVwKGVuZERyYWdnaW5nKTtcblxuXHR0aGlzLl9lbGVtZW50Lm1vdXNlbW92ZShmdW5jdGlvbihldmVudCkge1xuXHRcdGlmICh0aGlzLl9jYW5EcmFnTGVmdCB8fCB0aGlzLl9jYW5EcmFnUmlnaHQpIHtcblx0XHRcdHZhciByYW5nZSA9IHtcblx0XHRcdFx0ZnJvbTogdGhpcy5fcGl4ZWxSYW5nZS5mcm9tLFxuXHRcdFx0XHR0bzogdGhpcy5fcGl4ZWxSYW5nZS50b1xuXHRcdFx0fTtcblxuXHRcdFx0aWYgKHRoaXMuX2NhbkRyYWdMZWZ0KSB7XG5cdFx0XHRcdGlmICghdGhpcy5fZHJhZ2dpbmdMZWZ0KSB7XG5cdFx0XHRcdFx0dGhpcy5fZHJhZ2dpbmdMZWZ0ID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxjdWxhdGVGcm9tKHJhbmdlLCAoZXZlbnQuY2xpZW50WCAtIHRoaXMuX2RyYWdnaW5nTGVmdFgpLCBiYXJXaWR0aCwgdG90YWxXaWR0aCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9jYW5EcmFnUmlnaHQpIHtcblx0XHRcdFx0aWYgKCF0aGlzLl9kcmFnZ2luZ1JpZ2h0KSB7XG5cdFx0XHRcdFx0dGhpcy5fZHJhZ2dpbmdSaWdodCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsY3VsYXRlVG8ocmFuZ2UsIChldmVudC5jbGllbnRYIC0gdGhpcy5fZHJhZ2dpbmdSaWdodFgpLCBiYXJXaWR0aCwgdG90YWxXaWR0aCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBiYXJSYW5nZSA9IHRoaXMuX2hpc3RvZ3JhbS5waXhlbFJhbmdlVG9CYXJSYW5nZShyYW5nZSk7XG5cdFx0XHR0aGlzLnVwZGF0ZVVJKGJhclJhbmdlLCByYW5nZSk7XG5cdFx0fVxuXHR9LmJpbmQodGhpcykpO1xuXG5cdHRoaXMuX2xlZnRIYW5kbGUubW91c2Vkb3duKGZ1bmN0aW9uIChldmVudCkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dGhpcy5fY2FuRHJhZ0xlZnQgPSB0cnVlO1xuXHRcdHRoaXMuX2RyYWdnaW5nTGVmdCA9IGZhbHNlO1xuXHRcdHRoaXMuX2RyYWdnaW5nTGVmdFggPSBldmVudC5jbGllbnRYO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fS5iaW5kKHRoaXMpKTtcblxuXHR0aGlzLl9yaWdodEhhbmRsZS5tb3VzZWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHR0aGlzLl9jYW5EcmFnUmlnaHQgPSB0cnVlO1xuXHRcdHRoaXMuX2RyYWdnaW5nUmlnaHQgPSBmYWxzZTtcblx0XHR0aGlzLl9kcmFnZ2luZ1JpZ2h0WCA9IGV2ZW50LmNsaWVudFg7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyB0aGUgcGFnaW5hdGlvbiBmdW5jdGlvbmFsaXR5IG9mIHRoZSByYW5nZSBtYW5pcHVsYXRpb24gY29udHJvbHMuXG4gKlxuICogQG1ldGhvZCBfaW5pdGlhbGl6ZVBhZ2luYXRpb25cbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0SGlzdG9ncmFtRmlsdGVyLnByb3RvdHlwZS5faW5pdGlhbGl6ZVBhZ2luYXRpb24gPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX3BhZ2VMZWZ0LmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdHZhciBmcm9tID0gdGhpcy5fYmFyUmFuZ2UuZnJvbTtcblx0XHR2YXIgdG8gPSB0aGlzLl9iYXJSYW5nZS50bztcblx0XHR2YXIgbWF4RnJvbSA9IHRoaXMuX21heEJhclJhbmdlLmZyb207XG5cblx0XHRpZiAoZnJvbSA+IG1heEZyb20pIHtcblx0XHRcdHZhciBvZmZzZXQgPSB0byAtIGZyb20gKyAxO1xuXHRcdFx0aWYgKGZyb20gLSBvZmZzZXQgPCBtYXhGcm9tKSB7XG5cdFx0XHRcdG9mZnNldCA9IGZyb20gLSBtYXhGcm9tO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNldEZpbHRlckJhclJhbmdlKHtcblx0XHRcdFx0ZnJvbTogZnJvbSAtIG9mZnNldCxcblx0XHRcdFx0dG86IHRvIC0gb2Zmc2V0XG5cdFx0XHR9LCB0cnVlKTtcblx0XHR9XG5cdH0uYmluZCh0aGlzKSk7XG5cblx0dGhpcy5fcGFnZVJpZ2h0LmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdHZhciBmcm9tID0gdGhpcy5fYmFyUmFuZ2UuZnJvbTtcblx0XHR2YXIgdG8gPSB0aGlzLl9iYXJSYW5nZS50bztcblx0XHR2YXIgbWF4VG8gPSB0aGlzLl9tYXhCYXJSYW5nZS50bztcblxuXHRcdGlmICh0byA8IG1heFRvKSB7XG5cdFx0XHR2YXIgb2Zmc2V0ID0gdG8gLSBmcm9tICsgMTtcblx0XHRcdGlmICh0byArIG9mZnNldCA+IG1heFRvKSB7XG5cdFx0XHRcdG9mZnNldCA9IG1heFRvIC0gdG87XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2V0RmlsdGVyQmFyUmFuZ2Uoe1xuXHRcdFx0XHRmcm9tOiBmcm9tICsgb2Zmc2V0LFxuXHRcdFx0XHR0bzogdG8gKyBvZmZzZXRcblx0XHRcdH0sIHRydWUpO1xuXHRcdH1cblx0fS5iaW5kKHRoaXMpKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgZ2l2ZW4gcGl4ZWwgcmFuZ2UgYXMgdGhlIGN1cnJlbnRseSBhY3RpdmUgcmFuZ2UuXG4gKiBOT1RFOiBUaGlzIGZ1bmN0aW9uIHJvdW5kcyB0aGUgcGl4ZWwgcmFuZ2UgdG8gdGhlIGNsb3NlcyBwb3NzaWJsZSBiYXIgcmFuZ2UuXG4gKlxuICogQG1ldGhvZCBzZXRGaWx0ZXJQaXhlbFJhbmdlXG4gKiBAcGFyYW0ge09iamVjdH0gcGl4ZWxSYW5nZSAtIEEgcmFuZ2Ugb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHBpeGVsIGNvb3JkaW5hdGVzIHRvIGJlIHNlbGVjdGVkLlxuICogQHBhcmFtIHtib29sZWFuPX0gZnJvbVVzZXJJbnB1dCAtIERlZmluZXMgaWYgdGhlIGZpbHRlciByYW5nZSBjaGFuZ2Ugd2FzIHRyaWdnZXJlZCBieSBhIHVzZXIgaW5wdXQgaW50ZXJhY3Rpb24uXG4gKi9cbkZhY2V0SGlzdG9ncmFtRmlsdGVyLnByb3RvdHlwZS5zZXRGaWx0ZXJQaXhlbFJhbmdlID0gZnVuY3Rpb24gKHBpeGVsUmFuZ2UsIGZyb21Vc2VySW5wdXQpIHtcblx0dGhpcy5zZXRGaWx0ZXJCYXJSYW5nZSh0aGlzLl9oaXN0b2dyYW0ucGl4ZWxSYW5nZVRvQmFyUmFuZ2UocGl4ZWxSYW5nZSksIGZyb21Vc2VySW5wdXQpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBnaXZlbiBiYXIgcmFuZ2UgYXMgdGhlIGN1cnJlbnRseSBhY3RpdmUgcmFuZ2UuXG4gKlxuICogQG1ldGhvZCBzZXRGaWx0ZXJCYXJSYW5nZVxuICogQHBhcmFtIHtPYmplY3R9IGJhclJhbmdlIC0gVGhlIGJhciByYW5nZSB0byBzZWxlY3QuXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBmcm9tVXNlcklucHV0IC0gRGVmaW5lcyBpZiB0aGUgZmlsdGVyIHJhbmdlIGNoYW5nZSB3YXMgdHJpZ2dlcmVkIGJ5IGEgdXNlciBpbnB1dCBpbnRlcmFjdGlvbi5cbiAqL1xuRmFjZXRIaXN0b2dyYW1GaWx0ZXIucHJvdG90eXBlLnNldEZpbHRlckJhclJhbmdlID0gZnVuY3Rpb24gKGJhclJhbmdlLCBmcm9tVXNlcklucHV0KSB7XG5cdHZhciBwaXhlbFJhbmdlID0gdGhpcy5faGlzdG9ncmFtLmJhclJhbmdlVG9QaXhlbFJhbmdlKGJhclJhbmdlKTtcblxuXHR0aGlzLl9waXhlbFJhbmdlID0gcGl4ZWxSYW5nZTtcblx0dGhpcy5fYmFyUmFuZ2UgPSBiYXJSYW5nZTtcblxuXHR0aGlzLnVwZGF0ZVVJKGJhclJhbmdlLCBwaXhlbFJhbmdlKTtcblxuXHRpZiAodGhpcy5fb25GaWx0ZXJDaGFuZ2VkKSB7XG5cdFx0dGhpcy5fb25GaWx0ZXJDaGFuZ2VkKGJhclJhbmdlLCBmcm9tVXNlcklucHV0KTtcblx0fVxufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBVSSBjb21wb25lbnRzIG9mIHRoZSByYW5nZSBtYW5pcHVsYXRpb24gdG9vbHMuXG4gKiBOT1RFOiBUaGUgYGJhclJhbmdlYCBhbmQgdGhlIGBwaXhlbFJhbmdlYCBtYXkgYmUgZGlmZmVyZW50LCB0aGlzIGZ1bmN0aW9uIGRvZXMgTk9UIHBlcmZvcm0gdGVzdHMgdG8gbWFrZSBzdXJlIHRoZXkgYXJlIGVxdWl2YWxlbnQuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVVSVxuICogQHBhcmFtIHtPYmplY3R9IGJhclJhbmdlIC0gVGhlIGJhciByYW5nZSB1c2VkIHRvIHVwZGF0ZSB0aGUgVUlcbiAqIEBwYXJhbSB7T2JqZWN0fSBwaXhlbFJhbmdlIC0gVGhlIHBpeGVsIHJhbmdlIHRvIHVwZGF0ZSB0aGUgVUlcbiAqL1xuRmFjZXRIaXN0b2dyYW1GaWx0ZXIucHJvdG90eXBlLnVwZGF0ZVVJID0gZnVuY3Rpb24gKGJhclJhbmdlLCBwaXhlbFJhbmdlKSB7XG5cdHZhciBiYXJzID0gdGhpcy5faGlzdG9ncmFtLmJhcnM7XG5cdHZhciBsZWZ0QmFyTWV0YWRhdGEgPSBiYXJzW2JhclJhbmdlLmZyb21dLm1ldGFkYXRhO1xuXHR2YXIgcmlnaHRCYXJNZXRhZGF0YSA9IGJhcnNbYmFyUmFuZ2UudG9dLm1ldGFkYXRhO1xuXHR0aGlzLl9jdXJyZW50UmFuZ2VMYWJlbC50ZXh0KGxlZnRCYXJNZXRhZGF0YVswXS5sYWJlbCArICcgLSAnICsgcmlnaHRCYXJNZXRhZGF0YVtyaWdodEJhck1ldGFkYXRhLmxlbmd0aCAtIDFdLmxhYmVsKTtcblxuXHR0aGlzLl9oaXN0b2dyYW0uaGlnaGxpZ2h0UmFuZ2UoYmFyUmFuZ2UpO1xuXG5cdHRoaXMuX3JhbmdlRmlsdGVyLmNzcygnbGVmdCcsIHBpeGVsUmFuZ2UuZnJvbSk7XG5cdHRoaXMuX3JhbmdlRmlsdGVyLmNzcygnd2lkdGgnLCBwaXhlbFJhbmdlLnRvIC0gcGl4ZWxSYW5nZS5mcm9tKTtcblxuXHRpZiAoYmFyUmFuZ2UuZnJvbSA9PT0gdGhpcy5fbWF4QmFyUmFuZ2UuZnJvbSAmJiBiYXJSYW5nZS50byA9PT0gdGhpcy5fbWF4QmFyUmFuZ2UudG8pIHtcblx0XHR0aGlzLl9jdXJyZW50UmFuZ2VMYWJlbC5hZGRDbGFzcygnZmFjZXQtcmFuZ2UtY3VycmVudC1oaWRkZW4nKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9jdXJyZW50UmFuZ2VMYWJlbC5yZW1vdmVDbGFzcygnZmFjZXQtcmFuZ2UtY3VycmVudC1oaWRkZW4nKTtcblx0fVxuXG5cdGlmIChiYXJSYW5nZS5mcm9tID09PSB0aGlzLl9tYXhCYXJSYW5nZS5mcm9tKSB7XG5cdFx0dGhpcy5fcGFnZUxlZnQuYWRkQ2xhc3MoJ2ZhY2V0LXBhZ2UtY3RybC1kaXNhYmxlZCcpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3BhZ2VMZWZ0LnJlbW92ZUNsYXNzKCdmYWNldC1wYWdlLWN0cmwtZGlzYWJsZWQnKTtcblx0fVxuXG5cdGlmIChiYXJSYW5nZS50byA9PT0gdGhpcy5fbWF4QmFyUmFuZ2UudG8pIHtcblx0XHR0aGlzLl9wYWdlUmlnaHQuYWRkQ2xhc3MoJ2ZhY2V0LXBhZ2UtY3RybC1kaXNhYmxlZCcpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3BhZ2VSaWdodC5yZW1vdmVDbGFzcygnZmFjZXQtcGFnZS1jdHJsLWRpc2FibGVkJyk7XG5cdH1cbn07XG5cbi8qKlxuICogQGV4cG9ydFxuICogQHR5cGUge0ZhY2V0SGlzdG9ncmFtRmlsdGVyfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0SGlzdG9ncmFtRmlsdGVyO1xuXG5cbiIsIi8qXG4gKiAqXG4gKiAgQ29weXJpZ2h0IMKpIDIwMTUgVW5jaGFydGVkIFNvZnR3YXJlIEluYy5cbiAqXG4gKiAgUHJvcGVydHkgb2YgVW5jaGFydGVk4oSiLCBmb3JtZXJseSBPY3VsdXMgSW5mbyBJbmMuXG4gKiAgaHR0cDovL3VuY2hhcnRlZC5zb2Z0d2FyZS9cbiAqXG4gKiAgUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICpcbiAqICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mXG4gKiAgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbiAqICB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllc1xuICogIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkb1xuICogIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiAgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqICBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiAgU09GVFdBUkUuXG4gKiAvXG4gKi9cblxudmFyIF8gPSByZXF1aXJlKCcuLi8uLi91dGlsL3V0aWwnKTtcbnZhciBGYWNldCA9IHJlcXVpcmUoJy4vZmFjZXQnKTtcbnZhciBIaXN0b2dyYW0gPSByZXF1aXJlKCcuL2ZhY2V0SGlzdG9ncmFtJyk7XG52YXIgSGlzdG9ncmFtRmlsdGVyID0gcmVxdWlyZSgnLi9mYWNldEhpc3RvZ3JhbUZpbHRlcicpO1xudmFyIFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vLi4vdGVtcGxhdGVzL2ZhY2V0SG9yaXpvbnRhbCcpO1xuXG52YXIgQUJCUkVWSUFURURfQ0xBU1MgPSAnZmFjZXRzLWZhY2V0LWhvcml6b250YWwtYWJicmV2aWF0ZWQnO1xudmFyIEhJRERFTl9DTEFTUyA9ICdmYWNldHMtZmFjZXQtaG9yaXpvbnRhbC1oaWRkZW4nO1xuXG4vKipcbiAqIEhvcml6b250YWwgZmFjZXQgY2xhc3MsIGNvbnRhaW5zIGEgaGlzdG9ncmFtIGFuZCBjb250cm9scyB0byBwZXJmb3JtIGZpbHRlcnMgb24gaXQuXG4gKlxuICogQGNsYXNzIEZhY2V0SG9yaXpvbnRhbFxuICogQHBhcmFtIHtqcXVlcnl9IGNvbnRhaW5lciAtIFRoZSBjb250YWluZXIgZWxlbWVudCBmb3IgdGhpcyBmYWNldC5cbiAqIEBwYXJhbSB7R3JvdXB9IHBhcmVudEdyb3VwIC0gVGhlIGdyb3VwIHRoaXMgZmFjZXQgYmVsb25ncyB0by5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzcGVjIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhpcyBmYWNldC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGYWNldEhvcml6b250YWwgKGNvbnRhaW5lciwgcGFyZW50R3JvdXAsIHNwZWMpIHtcblx0RmFjZXQuY2FsbCh0aGlzLCBjb250YWluZXIsIHBhcmVudEdyb3VwLCBzcGVjKTtcblxuXHR0aGlzLl9rZXkgPSBzcGVjLmtleTtcblx0dGhpcy5fc3BlYyA9IHRoaXMucHJvY2Vzc1NwZWMoc3BlYyk7XG5cblx0dGhpcy5faW5pdGlhbGl6ZUxheW91dChUZW1wbGF0ZSk7XG5cdHRoaXMuc2VsZWN0KHNwZWMpO1xuXHR0aGlzLl9zZXR1cEhhbmRsZXJzKCk7XG5cblx0LyogcmVnaXN0ZXIgdGhlIGFuaW1hdGlvbiBsaXN0ZW5lciwgYW5pbWF0aW9ucyBjYW4gdHJpZ2dlciBhZGQvcmVtb3ZlIGhhbmRsZXJzIHNvIHRoZWlyIGhhbmRsZXIgbXVzdCBiZSBoYW5kbGVkIHNlcGFyYXRlbHkgKi9cblx0dGhpcy5fZWxlbWVudC5vbigndHJhbnNpdGlvbmVuZCcsIHRoaXMuX2hhbmRsZVRyYW5zaXRpb25FbmQuYmluZCh0aGlzKSk7XG59XG5cbi8qKlxuICogQGluaGVyaXRhbmNlIHtGYWNldH1cbiAqL1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRmFjZXQucHJvdG90eXBlKTtcbkZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGYWNldEhvcml6b250YWw7XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGZhY2V0J3Mga2V5LlxuICpcbiAqIEBwcm9wZXJ0eSBrZXlcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUsICdrZXknLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9rZXk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSB2YWx1ZSBvZiB0aGlzIGZhY2V0LlxuICpcbiAqIEBwcm9wZXJ0eSB2YWx1ZVxuICogQHR5cGUgeyp9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUsICd2YWx1ZScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2tleTsgLy8gYXMgb2YgcmlnaHQgbm93IHRoZXJlIGNhbiBvbmx5IGJlIG9uZSBmYWNldCBwZXIgZ3JvdXAsIHNvIHRoZSBrZXkgYW5kIHRoZSB2YWx1ZSBhcmUgdGhlIHNhbWVcblx0fVxufSk7XG5cbi8qKlxuICogRGVmaW5lcyBpZiB0aGlzIGZhY2V0IGhhcyBiZWVuIHZpc3VhbGx5IGNvbXByZXNzZWQgdG8gaXRzIHNtYWxsZXN0IHBvc3NpYmxlIHN0YXRlLlxuICogTm90ZTogQWJicmV2aWF0ZWQgZmFjZXRzIGNhbm5vdCBiZSBpbnRlcmFjdGVkIHdpdGguXG4gKlxuICogQHByb3BlcnR5IGFiYnJldmlhdGVkXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUsICdhYmJyZXZpYXRlZCcsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2VsZW1lbnQuaGFzQ2xhc3MoQUJCUkVWSUFURURfQ0xBU1MpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IHRoaXMuYWJicmV2aWF0ZWQpIHtcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50LmFkZENsYXNzKEFCQlJFVklBVEVEX0NMQVNTKTtcblx0XHRcdFx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2xhc3MoQUJCUkVWSUFURURfQ0xBU1MpO1xuXHRcdFx0XHR0aGlzLl9hZGRIYW5kbGVycygpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogRGVmaW5lcyBpZiB0aGlzIGZhY2V0IGlzIHZpc2libGUuXG4gKlxuICogQHByb3BlcnR5IHZpc2libGVcbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZSwgJ3Zpc2libGUnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAhdGhpcy5fZWxlbWVudC5oYXNDbGFzcyhISURERU5fQ0xBU1MpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IHRoaXMudmlzaWJsZSkge1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2xhc3MoSElEREVOX0NMQVNTKTtcblx0XHRcdFx0dGhpcy5fYWRkSGFuZGxlcnMoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQuYWRkQ2xhc3MoSElEREVOX0NMQVNTKTtcblx0XHRcdFx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHJhbmdlIGNvdmVyZWQgYnkgdGhpcyBmYWNldCdzIGZpbHRlci5cbiAqXG4gKiBAcHJvcGVydHkgZmlsdGVyUmFuZ2VcbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUsICdmaWx0ZXJSYW5nZScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGJhclJhbmdlID0gdGhpcy5faGlzdG9ncmFtRmlsdGVyLmJhclJhbmdlO1xuXHRcdHZhciBwaXhlbFJhbmdlID0gdGhpcy5faGlzdG9ncmFtRmlsdGVyLnBpeGVsUmFuZ2U7XG5cdFx0dmFyIGZyb21JbmZvID0gdGhpcy5faGlzdG9ncmFtLmJhcnNbYmFyUmFuZ2UuZnJvbV0uaW5mbztcblx0XHR2YXIgdG9JbmZvID0gdGhpcy5faGlzdG9ncmFtLmJhcnNbYmFyUmFuZ2UudG9dLmluZm87XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0ZnJvbToge1xuXHRcdFx0XHRpbmRleDogYmFyUmFuZ2UuZnJvbSxcblx0XHRcdFx0cGl4ZWw6IHBpeGVsUmFuZ2UuZnJvbSxcblx0XHRcdFx0bGFiZWw6IGZyb21JbmZvLmxhYmVsLFxuXHRcdFx0XHRjb3VudDogZnJvbUluZm8uY291bnQsXG5cdFx0XHRcdG1ldGFkYXRhOiBmcm9tSW5mby5tZXRhZGF0YVxuXHRcdFx0fSxcblx0XHRcdHRvOiB7XG5cdFx0XHRcdGluZGV4OiBiYXJSYW5nZS50byxcblx0XHRcdFx0cGl4ZWw6IHBpeGVsUmFuZ2UudG8sXG5cdFx0XHRcdGxhYmVsOiB0b0luZm8ubGFiZWwsXG5cdFx0XHRcdGNvdW50OiB0b0luZm8uY291bnQsXG5cdFx0XHRcdG1ldGFkYXRhOiB0b0luZm8ubWV0YWRhdGFcblx0XHRcdH1cblx0XHR9O1xuXHR9XG59KTtcblxuLyoqXG4gKiBNYXJrcyB0aGlzIGZhY2V0IGFzIHNlbGVjdGVkIGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBzZWxlY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRGF0YSB1c2VkIHRvIHNlbGVjdCBhIHJhbmdlIGFuZCBzdWItYmFyIGNvdW50cyBpbiB0aGlzIGZhY2V0LlxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0aWYgKGRhdGEgJiYgJ3NlbGVjdGlvbicgaW4gZGF0YSkge1xuXHRcdHZhciBzZWxlY3Rpb25EYXRhID0gZGF0YS5zZWxlY3Rpb247XG5cblx0XHRpZiAoJ3JhbmdlJyBpbiBzZWxlY3Rpb25EYXRhKSB7XG5cdFx0XHR2YXIgZnJvbSA9IHNlbGVjdGlvbkRhdGEucmFuZ2UuZnJvbTtcblx0XHRcdHZhciB0byA9IHNlbGVjdGlvbkRhdGEucmFuZ2UudG87XG5cblx0XHRcdHZhciBmcm9tSXNTdHJpbmcgPSAodHlwZW9mIGZyb20gPT09ICdzdHJpbmcnIHx8ICh0eXBlb2YgZnJvbSA9PT0gJ29iamVjdCcgJiYgZnJvbS5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSk7XG5cdFx0XHR2YXIgdG9Jc1N0cmluZyA9ICh0eXBlb2YgdG8gPT09ICdzdHJpbmcnIHx8ICh0eXBlb2YgdG8gPT09ICdvYmplY3QnICYmIHRvLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpKTtcblxuXHRcdFx0dmFyIGJhcnMgPSB0aGlzLl9oaXN0b2dyYW0uYmFycztcblx0XHRcdGZvciAodmFyIGkgPSAwLCBuID0gYmFycy5sZW5ndGg7IGkgPCBuICYmIChmcm9tSXNTdHJpbmcgfHwgdG9Jc1N0cmluZyk7ICsraSkge1xuXHRcdFx0XHR2YXIgYmFyTWV0YWRhdGEgPSBiYXJzW2ldLm1ldGFkYXRhO1xuXG5cdFx0XHRcdGZvciAodmFyIGlpID0gMCwgbm4gPSBiYXJNZXRhZGF0YS5sZW5ndGg7IGlpIDwgbm47ICsraWkpIHtcblx0XHRcdFx0XHR2YXIgc2xpY2UgPSBiYXJNZXRhZGF0YVtpaV07XG5cblx0XHRcdFx0XHRpZiAoZnJvbUlzU3RyaW5nICYmIHNsaWNlLmxhYmVsID09PSBmcm9tKSB7XG5cdFx0XHRcdFx0XHRmcm9tID0gaTtcblx0XHRcdFx0XHRcdGZyb21Jc1N0cmluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICh0b0lzU3RyaW5nICYmIHNsaWNlLmxhYmVsID09PSB0bykge1xuXHRcdFx0XHRcdFx0dG8gPSBpO1xuXHRcdFx0XHRcdFx0dG9Jc1N0cmluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWZyb21Jc1N0cmluZyAmJiAhdG9Jc1N0cmluZykge1xuXHRcdFx0XHR0aGlzLl9oaXN0b2dyYW1GaWx0ZXIuc2V0RmlsdGVyQmFyUmFuZ2Uoe2Zyb206IGZyb20sIHRvOiB0b30pO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9oaXN0b2dyYW1GaWx0ZXIuc2V0RmlsdGVyUGl4ZWxSYW5nZSh7IGZyb206IDAsIHRvOiB0aGlzLl9oaXN0b2dyYW0udG90YWxXaWR0aCB9KTtcblx0XHR9XG5cblx0XHR0aGlzLl9oaXN0b2dyYW0uZGVzZWxlY3QoKTtcblx0XHRpZiAoJ3NsaWNlcycgaW4gc2VsZWN0aW9uRGF0YSkge1xuXHRcdFx0dGhpcy5faGlzdG9ncmFtLnNlbGVjdChzZWxlY3Rpb25EYXRhLnNsaWNlcyk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIE1hcmtzIHRoaXMgZmFjZXQgYXMgbm90IHNlbGVjdGVkIGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBkZXNlbGVjdFxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLmRlc2VsZWN0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX2hpc3RvZ3JhbUZpbHRlci5zZXRGaWx0ZXJQaXhlbFJhbmdlKHsgZnJvbTogMCwgdG86IHRoaXMuX2hpc3RvZ3JhbS50b3RhbFdpZHRoIH0pO1xuXHR0aGlzLl9oaXN0b2dyYW0uZGVzZWxlY3QoKTtcbn07XG5cbi8qKlxuICogUHJvY2Vzc2VzIHRoZSBkYXRhIGluIHRoZSBwcm92aWRlZCBzcGVjIGFuZCBidWlsZHMgYSBuZXcgc3BlYyB3aXRoIGRldGFpbGVkIGluZm9ybWF0aW9uLlxuICpcbiAqIEBtZXRob2QgcHJvY2Vzc1NwZWNcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbkRhdGEgLSBUaGUgb3JpZ2luYWwgc3BlYyB0byBwcm9jZXNzLlxuICogQHJldHVybnMge09iamVjdH1cbiAqL1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZS5wcm9jZXNzU3BlYyA9IGZ1bmN0aW9uKGluRGF0YSkge1xuXHR2YXIgb3V0RGF0YSA9IHt9O1xuXG5cdG91dERhdGEuaGlzdG9ncmFtID0gdGhpcy5wcm9jZXNzSGlzdG9ncmFtKGluRGF0YS5oaXN0b2dyYW0pO1xuXHRvdXREYXRhLmxlZnRSYW5nZUxhYmVsID0gb3V0RGF0YS5oaXN0b2dyYW0uc2xpY2VzWzBdLmxhYmVsO1xuXHRvdXREYXRhLnJpZ2h0UmFuZ2VMYWJlbCA9IG91dERhdGEuaGlzdG9ncmFtLnNsaWNlc1tvdXREYXRhLmhpc3RvZ3JhbS5zbGljZXMubGVuZ3RoIC0gMV0ubGFiZWw7XG5cblx0cmV0dXJuIG91dERhdGE7XG59O1xuXG4vKipcbiAqIFByb2Nlc3NlcyB0aGUgaGlzdG9ncmFtIGRhdGEgYW5kIGFkZHMgZXh0cmEgaW5mb3JtYXRpb24gdG8gaXQuXG4gKiBNYWtlcyBzdXJlIHRoYXQgYWxsIHNsaWNlcyBmb3IgdGhlIGhpc3RvZ3JhbSBhcmUgcHJlc2VudCBhbmQgYWRkcyAwLWNvdW50IHNsaWNlcyBmb3IgYW55IG1pc3Npbmcgb25lcy5cbiAqXG4gKiBAbWV0aG9kIHByb2Nlc3NIaXN0b2dyYW1cbiAqIEBwYXJhbSB7T2JqZWN0fSBpbkRhdGEgLSBUaGUgZGF0YSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge09iamVjdH1cbiAqL1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZS5wcm9jZXNzSGlzdG9ncmFtID0gZnVuY3Rpb24oaW5EYXRhKSB7XG5cdHZhciBvdXREYXRhID0ge1xuXHRcdHNsaWNlczogW11cblx0fTtcblxuXHR2YXIgaW5TbGljZXMgPSBpbkRhdGEuc2xpY2VzO1xuXHR2YXIgb3V0U2xpY2VzID0gb3V0RGF0YS5zbGljZXM7XG5cdHZhciB5TWF4ID0gMDtcblxuXHR2YXIgaW5kZXggPSAwO1xuXHRmb3IgKHZhciBpID0gMCwgbiA9IGluU2xpY2VzLmxlbmd0aDsgaSA8IG47ICsraSwgKytpbmRleCkge1xuXHRcdHZhciBzbGljZSA9IGluU2xpY2VzW2ldO1xuXHRcdHdoaWxlIChzbGljZS5pbmRleCA+IGluZGV4KSB7XG5cdFx0XHRvdXRTbGljZXMucHVzaCh7XG5cdFx0XHRcdGxhYmVsOiAnVW5rbm93bicsXG5cdFx0XHRcdGNvdW50OiAwXG5cdFx0XHR9KTtcblx0XHRcdCsraW5kZXg7XG5cdFx0fVxuXG5cdFx0b3V0U2xpY2VzLnB1c2goc2xpY2UpO1xuXHRcdHlNYXggPSBNYXRoLm1heCh5TWF4LCBzbGljZS5jb3VudCk7XG5cdH1cblxuXHRvdXREYXRhLnlNYXggPSB5TWF4O1xuXG5cdHJldHVybiBvdXREYXRhO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoaXMgZmFjZXQncyBzcGVjIHdpdGggdGhlIHBhc3NlZCBkYXRhIGFuZCB0aGVuIHVwZGF0ZXMgdGhlIGZhY2V0J3MgdmlzdWFsIHN0YXRlLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlU3BlY1xuICogQHBhcmFtIHtPYmplY3R9IHNwZWMgLSBUaGUgbmV3IHNwZWMgZm9yIHRoZSBmYWNldFxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLnVwZGF0ZVNwZWMgPSBmdW5jdGlvbiAoc3BlYykge1xuXHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXHR0aGlzLl9lbGVtZW50LnJlbW92ZSgpO1xuXHR0aGlzLl9zcGVjLmhpc3RvZ3JhbS5wdXNoLmFwcGx5KHRoaXMuX3NwZWMuaGlzdG9ncmFtLCBzcGVjLmhpc3RvZ3JhbSk7XG5cdHRoaXMuX3NwZWMgPSB0aGlzLnByb2Nlc3NTcGVjKHRoaXMuX3NwZWMpO1xuXHR0aGlzLl9pbml0aWFsaXplTGF5b3V0KFRlbXBsYXRlKTtcblx0dGhpcy5zZWxlY3Qoc3BlYyk7XG5cdHRoaXMuX2FkZEhhbmRsZXJzKCk7XG59O1xuXG4vKipcbiAqIFVuYmluZHMgdGhpcyBpbnN0YW5jZSBmcm9tIGFueSByZWZlcmVuY2UgdGhhdCBpdCBtaWdodCBoYXZlIHdpdGggZXZlbnQgaGFuZGxlcnMgYW5kIERPTSBlbGVtZW50cy5cbiAqXG4gKiBAbWV0aG9kIGRlc3Ryb3lcbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGFuaW1hdGVkIC0gU2hvdWxkIHRoZSBmYWNldCBiZSByZW1vdmVkIGluIGFuIGFuaW1hdGVkIHdheSBiZWZvcmUgaXQgYmVpbmcgZGVzdHJveWVkLlxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihhbmltYXRlZCkge1xuXHRpZiAoYW5pbWF0ZWQpIHtcblx0XHR2YXIgX2Rlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMub2ZmKCdmYWNldC1oaXN0b2dyYW06YW5pbWF0aW9uOnZpc2libGUtb2ZmJywgX2Rlc3Ryb3kpO1xuXHRcdFx0dGhpcy5fZGVzdHJveSgpO1xuXHRcdH0uYmluZCh0aGlzKTtcblx0XHR0aGlzLnZpc2libGUgPSBmYWxzZTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9kZXN0cm95KCk7XG5cdH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgbWV0aG9kIHRvIGRlc3Ryb3kgdGhpcyBmYWNldC5cbiAqXG4gKiBAbWV0aG9kIF9kZXN0cm95XG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLl9kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX3JlbW92ZUhhbmRsZXJzKCk7XG5cdHRoaXMuX2VsZW1lbnQub2ZmKCd0cmFuc2l0aW9uZW5kJyk7XG5cdHRoaXMuX2VsZW1lbnQucmVtb3ZlKCk7XG5cdEZhY2V0LnByb3RvdHlwZS5kZXN0cm95LmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIGFsbCB0aGUgbGF5b3V0IGVsZW1lbnRzIGJhc2VkIG9uIHRoZSBgdGVtcGxhdGVgIHByb3ZpZGVkLlxuICpcbiAqIEBtZXRob2QgX2luaXRpYWxpemVMYXlvdXRcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHRlbXBsYXRlIC0gVGhlIHRlbXBsYXRpbmcgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgdGhlIGxheW91dC5cbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0SG9yaXpvbnRhbC5wcm90b3R5cGUuX2luaXRpYWxpemVMYXlvdXQgPSBmdW5jdGlvbih0ZW1wbGF0ZSkge1xuXHR0aGlzLl9lbGVtZW50ID0gJCh0ZW1wbGF0ZSh0aGlzLl9zcGVjKSk7XG5cdHRoaXMuX2NvbnRhaW5lci5hcHBlbmQodGhpcy5fZWxlbWVudCk7XG5cdHRoaXMuX3N2ZyA9IHRoaXMuX2VsZW1lbnQuZmluZCgnc3ZnJyk7XG5cblx0dGhpcy5faGlzdG9ncmFtID0gbmV3IEhpc3RvZ3JhbSh0aGlzLl9zdmcsIHRoaXMuX3NwZWMuaGlzdG9ncmFtKTtcblx0dGhpcy5faGlzdG9ncmFtRmlsdGVyID0gbmV3IEhpc3RvZ3JhbUZpbHRlcih0aGlzLl9lbGVtZW50LCB0aGlzLl9oaXN0b2dyYW0pO1xuXHR0aGlzLl9oaXN0b2dyYW1GaWx0ZXIuc2V0RmlsdGVyUGl4ZWxSYW5nZSh7IGZyb206IDAsIHRvOiB0aGlzLl9oaXN0b2dyYW0udG90YWxXaWR0aCB9KTtcblxuXHR0aGlzLl9yYW5nZUNvbnRyb2xzID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtcmFuZ2UtY29udHJvbHMnKTtcblxuXHQvKiBtYWtlIHN1cmUgYWxsIHN0eWxlcyBoYXZlIGJlZW4gYXBwbGllZCAqL1xuXHR2YXIgaSwgbiwgb2ZmO1xuXHRmb3IgKGkgPSAwLCBuID0gdGhpcy5fZWxlbWVudC5sZW5ndGg7IGkgPCBuOyArK2kpIHtcblx0XHRvZmYgPSB0aGlzLl9lbGVtZW50W2ldLm9mZnNldEhlaWdodDsgLy8gdHJpZ2dlciBzdHlsZSByZWNhbGN1bGF0aW9uLlxuXHR9XG5cblx0dmFyIGNoaWxkcmVuID0gdGhpcy5fZWxlbWVudC5maW5kKCcqJyk7XG5cdGZvciAoaSA9IDAsIG4gPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBuOyArK2kpIHtcblx0XHRvZmYgPSBjaGlsZHJlbltpXS5vZmZzZXRIZWlnaHQ7IC8vIHRyaWdnZXIgc3R5bGUgcmVjYWxjdWxhdGlvbi5cblx0fVxufTtcblxuLyoqXG4gKiBBZGRzIHRoZSByZXF1aXJlZCBldmVudCBoYW5kbGVycyBuZWVkZWQgdG8gdHJpZ2dlciB0aGlzIGZhY2V0J3Mgb3duIGV2ZW50cy5cbiAqXG4gKiBAbWV0aG9kIF9hZGRIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZS5fYWRkSGFuZGxlcnMgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMudmlzaWJsZSkge1xuXHRcdHZhciBiYXJzID0gdGhpcy5faGlzdG9ncmFtLmJhcnM7XG5cdFx0Zm9yICh2YXIgaSA9IDAsIG4gPSBiYXJzLmxlbmd0aDsgaSA8IG47ICsraSkge1xuXHRcdFx0YmFyc1tpXS5fYWRkSGFuZGxlcnMoKTtcblx0XHRcdGJhcnNbaV0ub25Nb3VzZUVudGVyID0gdGhpcy5fb25Nb3VzZUV2ZW50QmFyLmJpbmQodGhpcywgJ2ZhY2V0LWhpc3RvZ3JhbTptb3VzZWVudGVyJyk7XG5cdFx0XHRiYXJzW2ldLm9uTW91c2VMZWF2ZSA9IHRoaXMuX29uTW91c2VFdmVudEJhci5iaW5kKHRoaXMsICdmYWNldC1oaXN0b2dyYW06bW91c2VsZWF2ZScpO1xuXHRcdFx0YmFyc1tpXS5vbkNsaWNrID0gdGhpcy5fb25Nb3VzZUV2ZW50QmFyLmJpbmQodGhpcywgJ2ZhY2V0LWhpc3RvZ3JhbTpjbGljaycpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2hpc3RvZ3JhbUZpbHRlci5vbkZpbHRlckNoYW5nZWQgPSB0aGlzLl9vbkZpbHRlckNoYW5nZWQuYmluZCh0aGlzKTtcblx0fVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFueSBhZGRlZCBldmVudCBoYW5kbGVycywgdmlydHVhbGx5IFwibXV0aW5nXCIgdGhpcyBmYWNldFxuICpcbiAqIEBtZXRob2QgX3JlbW92ZUhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldEhvcml6b250YWwucHJvdG90eXBlLl9yZW1vdmVIYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgYmFycyA9IHRoaXMuX2hpc3RvZ3JhbS5iYXJzO1xuXHRmb3IgKHZhciBpID0gMCwgbiA9IGJhcnMubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0YmFyc1tpXS5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0XHRiYXJzW2ldLm9uTW91c2VFbnRlciA9IG51bGw7XG5cdFx0YmFyc1tpXS5vbk1vdXNlTGVhdmUgPSBudWxsO1xuXHRcdGJhcnNbaV0ub25DbGljayA9IG51bGw7XG5cdH1cblxuXHR0aGlzLl9oaXN0b2dyYW1GaWx0ZXIub25GaWx0ZXJDaGFuZ2VkID0gbnVsbDtcbn07XG5cbi8qKlxuICogRm9yd2FyZHMgYSBiYXIgbW91c2UgZXZlbnQgdXNpbmcgdGhlIGdpdmVuIHR5cGUuXG4gKlxuICogQG1ldGhvZCBfb25Nb3VzZUV2ZW50QmFyXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFRoZSB0eXBlIG9mIHRoZSBldmVudCB0byBmb3J3YXJkLlxuICogQHBhcmFtIHtGYWNldEhpc3RvZ3JhbUJhcn0gYmFyIC0gVGhlIGJhciB3aGljaCB0cmlnZ2VyZWQgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSBUaGUgb3JpZ2luYWwgZXZlbnQgdHJpZ2dlcmVkLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZS5fb25Nb3VzZUV2ZW50QmFyID0gZnVuY3Rpb24gKHR5cGUsIGJhciwgZXZlbnQpIHtcblx0dGhpcy5lbWl0KHR5cGUsIGV2ZW50LCB0aGlzLl9rZXksIGJhci5pbmZvKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB0aGUgZXZlbnQgd2hlbiB0aGUgZmlsdGVyIHJhbmdlIGNoYW5nZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG5ld0JhclJhbmdlIC0gQSByYW5nZSBvYmplY3QgY29udGFpbmluZyB0aGUgbmV3IGJhciAoc2xpY2UvYnVja2V0KSByYW5nZS5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGZyb21Vc2VySW5wdXQgLSBEZWZpbmVzIGlmIHRoZSBmaWx0ZXIgcmFuZ2UgY2hhbmdlIHdhcyB0cmlnZ2VyZWQgYnkgYSB1c2VyIGlucHV0IGludGVyYWN0aW9uLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZS5fb25GaWx0ZXJDaGFuZ2VkID0gZnVuY3Rpb24gKG5ld0JhclJhbmdlLCBmcm9tVXNlcklucHV0KSB7XG5cdHZhciBldmVudCA9ICdmYWNldC1oaXN0b2dyYW06cmFuZ2VjaGFuZ2VkJyArIChmcm9tVXNlcklucHV0ID8gJ3VzZXInIDogJycpO1xuXHR0aGlzLmVtaXQoZXZlbnQsIG51bGwsIHRoaXMuX2tleSwgdGhpcy5maWx0ZXJSYW5nZSk7XG59O1xuXG4vKipcbiAqIFRyYW5zaXRpb24gZW5kIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZ0IC0gRXZlbnQgdG8gaGFuZGxlLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRIb3Jpem9udGFsLnByb3RvdHlwZS5faGFuZGxlVHJhbnNpdGlvbkVuZCA9IGZ1bmN0aW9uKGV2dCkge1xuXHR2YXIgcHJvcGVydHkgPSBldnQub3JpZ2luYWxFdmVudC5wcm9wZXJ0eU5hbWU7XG5cdGlmIChldnQudGFyZ2V0ID09PSB0aGlzLl9lbGVtZW50LmdldCgwKSAmJiBwcm9wZXJ0eSA9PT0gJ29wYWNpdHknKSB7XG5cdFx0aWYgKHRoaXMudmlzaWJsZSkge1xuXHRcdFx0dGhpcy5lbWl0KCdmYWNldC1oaXN0b2dyYW06YW5pbWF0aW9uOnZpc2libGUtb24nLCBldnQsIHRoaXMuX2tleSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZW1pdCgnZmFjZXQtaGlzdG9ncmFtOmFuaW1hdGlvbjp2aXNpYmxlLW9mZicsIGV2dCwgdGhpcy5fa2V5KTtcblx0XHR9XG5cdH0gZWxzZSBpZiAoZXZ0LnRhcmdldCA9PT0gdGhpcy5fcmFuZ2VDb250cm9scy5nZXQoMCkgJiYgcHJvcGVydHkgPT09ICdvcGFjaXR5Jykge1xuXHRcdGlmICh0aGlzLmFiYnJldmlhdGVkKSB7XG5cdFx0XHR0aGlzLmVtaXQoJ2ZhY2V0LWhpc3RvZ3JhbTphbmltYXRpb246YWJicmV2aWF0ZWQtb24nLCBldnQsIHRoaXMuX2tleSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZW1pdCgnZmFjZXQtaGlzdG9ncmFtOmFuaW1hdGlvbjphYmJyZXZpYXRlZC1vZmYnLCBldnQsIHRoaXMuX2tleSk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIEBleHBvcnRcbiAqIEB0eXBlIHtGYWNldEhvcml6b250YWx9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gRmFjZXRIb3Jpem9udGFsO1xuIiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvdXRpbCcpO1xudmFyIEZhY2V0ID0gcmVxdWlyZSgnLi9mYWNldCcpO1xuXG52YXIgZmFjZXRWZXJ0aWNhbF9pY29uID0gcmVxdWlyZSgnLi4vLi4vdGVtcGxhdGVzL2ZhY2V0VmVydGljYWxfaWNvbicpO1xudmFyIGZhY2V0VmVydGljYWxfbGlua3MgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvZmFjZXRWZXJ0aWNhbF9saW5rcycpO1xudmFyIGZhY2V0VmVydGljYWxfc2VhcmNoID0gcmVxdWlyZSgnLi4vLi4vdGVtcGxhdGVzL2ZhY2V0VmVydGljYWxfc2VhcmNoJyk7XG52YXIgZmFjZXRWZXJ0aWNhbF9xdWVyeUNsb3NlID0gcmVxdWlyZSgnLi4vLi4vdGVtcGxhdGVzL2ZhY2V0VmVydGljYWxfcXVlcnlDbG9zZScpO1xudmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYW5kbGViYXJzJyk7XG52YXIgVGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvZmFjZXRWZXJ0aWNhbCcpO1xuXG52YXIgSElHSExJR0hUX0NMQVNTID0gJ2ZhY2V0LWljb24taGlnaGxpZ2h0ZWQnO1xudmFyIEFCQlJFVklBVEVEX0NMQVNTID0gJ2ZhY2V0cy1mYWNldC12ZXJ0aWNhbC1hYmJyZXZpYXRlZCc7XG52YXIgSElEREVOX0NMQVNTID0gJ2ZhY2V0cy1mYWNldC12ZXJ0aWNhbC1oaWRkZW4nO1xuXG4vKipcbiAqIFZlcnRpY2FsIGZhY2V0IGNsYXNzLCBzdGFuZGFyZCBmYWNldCBjbGFzcy5cbiAqXG4gKiBAY2xhc3MgRmFjZXRWZXJ0aWNhbFxuICogQHBhcmFtIHtqcXVlcnl9IGNvbnRhaW5lciAtIFRoZSBjb250YWluZXIgZWxlbWVudCBmb3IgdGhpcyBmYWNldC5cbiAqIEBwYXJhbSB7R3JvdXB9IHBhcmVudEdyb3VwIC0gVGhlIGdyb3VwIHRoaXMgZmFjZXQgYmVsb25ncyB0by5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzcGVjIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhpcyBmYWNldC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGYWNldFZlcnRpY2FsIChjb250YWluZXIsIHBhcmVudEdyb3VwLCBzcGVjKSB7XG5cdEZhY2V0LmNhbGwodGhpcywgY29udGFpbmVyLCBwYXJlbnRHcm91cCwgc3BlYyk7XG5cblx0dGhpcy5fdmFsdWUgPSBzcGVjLnZhbHVlO1xuXHR0aGlzLl9rZXkgPSBzcGVjLmtleTtcblx0dGhpcy5fY291bnQgPSBzcGVjLmNvdW50O1xuXHR0aGlzLl90eXBlID0gdGhpcy5fc3BlYy5pc1F1ZXJ5ID8gJ3F1ZXJ5JyA6ICdmYWNldCc7XG5cdHRoaXMuX2hhc0VtaXR0ZWRTZWxlY3RlZEV2ZW50ID0gZmFsc2U7XG5cblx0aWYgKHRoaXMuX3NwZWMuaXNRdWVyeSAmJiB0aGlzLl9rZXkgIT0gJyonKSB7XG5cdFx0dGhpcy5fc3BlYy5kaXNwbGF5VmFsdWUgPSB0aGlzLl9rZXkgKyAnOicgKyAodGhpcy5fc3BlYy5sYWJlbCA/IHRoaXMuX3NwZWMubGFiZWwgOiB0aGlzLl9zcGVjLnZhbHVlKTtcblx0fVxuXG5cdC8qIHJlZ2lzdGVyIHRoZSBwYXJ0aWFscyB0byBidWlsZCB0aGUgdGVtcGxhdGUgKi9cblx0SGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwoJ2ZhY2V0VmVydGljYWxfaWNvbicsIGZhY2V0VmVydGljYWxfaWNvbik7XG5cdEhhbmRsZWJhcnMucmVnaXN0ZXJQYXJ0aWFsKCdmYWNldFZlcnRpY2FsX2xpbmtzJywgZmFjZXRWZXJ0aWNhbF9saW5rcyk7XG5cdEhhbmRsZWJhcnMucmVnaXN0ZXJQYXJ0aWFsKCdmYWNldFZlcnRpY2FsX3NlYXJjaCcsIGZhY2V0VmVydGljYWxfc2VhcmNoKTtcblx0SGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwoJ2ZhY2V0VmVydGljYWxfcXVlcnlDbG9zZScsIGZhY2V0VmVydGljYWxfcXVlcnlDbG9zZSk7XG5cblx0dGhpcy5faW5pdGlhbGl6ZUxheW91dChUZW1wbGF0ZSk7XG5cdGlmICgnc2VsZWN0ZWQnIGluIHRoaXMuX3NwZWMpIHtcblx0XHR0aGlzLnNlbGVjdCh0aGlzLl9zcGVjLnNlbGVjdGVkKTtcblx0XHRkZWxldGUgdGhpcy5fc3BlYy5zZWxlY3RlZDtcblx0fVxuXHR0aGlzLl9zZXR1cEhhbmRsZXJzKCk7XG5cblx0LyogcmVnaXN0ZXIgdGhlIGFuaW1hdGlvbiBsaXN0ZW5lciwgYW5pbWF0aW9ucyBjYW4gdHJpZ2dlciBhZGQvcmVtb3ZlIGhhbmRsZXJzIHNvIHRoZWlyIGhhbmRsZXIgbXVzdCBiZSBoYW5kbGVkIHNlcGFyYXRlbHkgKi9cblx0dGhpcy5fZWxlbWVudC5vbigndHJhbnNpdGlvbmVuZCcsIHRoaXMuX2hhbmRsZVRyYW5zaXRpb25FbmQuYmluZCh0aGlzKSk7XG59XG5cbi8qKlxuICogQGluaGVyaXRhbmNlIHtGYWNldH1cbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZhY2V0LnByb3RvdHlwZSk7XG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZhY2V0VmVydGljYWw7XG5cbi8qKlxuICogVGhpcyBmYWNldCdzIGtleS5cbiAqXG4gKiBAcHJvcGVydHkga2V5XG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldFZlcnRpY2FsLnByb3RvdHlwZSwgJ2tleScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2tleTtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIHZhbHVlIG9mIHRoaXMgZmFjZXQuXG4gKlxuICogQHByb3BlcnR5IHZhbHVlXG4gKiBAdHlwZSB7Kn1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUsICd2YWx1ZScsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3ZhbHVlO1xuXHR9XG59KTtcblxuLyoqXG4gKiBUaGUgY29uZmlndXJlZCBpY29uIGZvciB0aGlzIGZhY2V0LlxuICpcbiAqIEBwcm9wZXJ0eSBpY29uXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldFZlcnRpY2FsLnByb3RvdHlwZSwgJ2ljb24nLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9zcGVjLmljb247XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSB0b3RhbCBudW1iZXIgb2YgbWF0Y2hlcyBmb3IgdGhpcyBmYWNldC5cbiAqXG4gKiBAcHJvcGVydHkgdG90YWxcbiAqIEB0eXBlIHtudW1iZXJ9XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldFZlcnRpY2FsLnByb3RvdHlwZSwgJ3RvdGFsJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fc3BlYy50b3RhbDtcblx0fSxcblxuXHRzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdHRoaXMuX3NwZWMudG90YWwgPSB2YWx1ZTtcblx0XHR0aGlzLl91cGRhdGUoKTtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIGNvdW50IG9mIG1hdGNoZXMgZm9yIHRoaXMgZmFjZXQuXG4gKlxuICogQHByb3BlcnR5IGNvdW50XG4gKiBAdHlwZSB7bnVtYmVyfVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldFZlcnRpY2FsLnByb3RvdHlwZSwgJ2NvdW50Jywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fc3BlYy5jb3VudDtcblx0fVxufSk7XG5cbi8qKlxuICogRGVmaW5lcyBpZiB0aGlzIGZhY2V0IGhhcyBiZWVuIGhpZ2hsaWdodGVkLlxuICpcbiAqIEBwcm9wZXJ0eSBoaWdobGlnaHRlZFxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldFZlcnRpY2FsLnByb3RvdHlwZSwgJ2hpZ2hsaWdodGVkJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5faWNvbkNvbnRhaW5lci5oYXNDbGFzcyhISUdITElHSFRfQ0xBU1MpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLl9pY29uQ29udGFpbmVyLmFkZENsYXNzKEhJR0hMSUdIVF9DTEFTUyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX2ljb25Db250YWluZXIucmVtb3ZlQ2xhc3MoSElHSExJR0hUX0NMQVNTKTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vKipcbiAqIERlZmluZXMgaWYgdGhpcyBmYWNldCBoYXMgYmVlbiB2aXN1YWxseSBjb21wcmVzc2VkIHRvIGl0cyBzbWFsbGVzdCBwb3NzaWJsZSBzdGF0ZS5cbiAqIE5vdGU6IEFiYnJldmlhdGVkIGZhY2V0cyBjYW5ub3QgYmUgaW50ZXJhY3RlZCB3aXRoLlxuICpcbiAqIEBwcm9wZXJ0eSBhYmJyZXZpYXRlZFxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldFZlcnRpY2FsLnByb3RvdHlwZSwgJ2FiYnJldmlhdGVkJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZWxlbWVudC5oYXNDbGFzcyhBQkJSRVZJQVRFRF9DTEFTUyk7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSAhPT0gdGhpcy5hYmJyZXZpYXRlZCkge1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQuYWRkQ2xhc3MoQUJCUkVWSUFURURfQ0xBU1MpO1xuXHRcdFx0XHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fZWxlbWVudC5yZW1vdmVDbGFzcyhBQkJSRVZJQVRFRF9DTEFTUyk7XG5cdFx0XHRcdHRoaXMuX2FkZEhhbmRsZXJzKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBEZWZpbmVzIGlmIHRoaXMgZmFjZXQgaXMgdmlzaWJsZS5cbiAqXG4gKiBAcHJvcGVydHkgdmlzaWJsZVxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShGYWNldFZlcnRpY2FsLnByb3RvdHlwZSwgJ3Zpc2libGUnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiAhdGhpcy5fZWxlbWVudC5oYXNDbGFzcyhISURERU5fQ0xBU1MpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IHRoaXMudmlzaWJsZSkge1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2xhc3MoSElEREVOX0NMQVNTKTtcblx0XHRcdFx0dGhpcy5fYWRkSGFuZGxlcnMoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnQuYWRkQ2xhc3MoSElEREVOX0NMQVNTKTtcblx0XHRcdFx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG4gLyoqXG4gKiBNYXJrcyB0aGlzIGZhY2V0IGFzIHNlbGVjdGVkIGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBzZWxlY3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBzZWxlY3RlZENvdW50IC0gVGhlIGNvdW50IG9mIHNlbGVjdGVkIGVsZW1lbnRzIGZvciB0aGlzIGZhY2V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPcHRpb25zIG9iamVjdC4geyBjb3VudExhYmVsOiB7c3RyaW5nfSBjb3VudCBsYWJlbCB9XG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uKHNlbGVjdGVkQ291bnQsIG9wdGlvbnMpIHtcblx0dmFyIG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuXHR0aGlzLl9zcGVjLnNlbGVjdGVkID0gc2VsZWN0ZWRDb3VudDtcblx0dGhpcy5fc3BlYy5zZWxlY3Rpb25Db3VudExhYmVsID0gb3B0cy5jb3VudExhYmVsO1xuXHR0aGlzLl91cGRhdGUoKTtcbn07XG5cbi8qKlxuICogTWFya3MgdGhpcyBmYWNldCBhcyBub3Qgc2VsZWN0ZWQgYW5kIHVwZGF0ZXMgdGhlIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIGRlc2VsZWN0XG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLmRlc2VsZWN0ID0gZnVuY3Rpb24oKSB7XG5cdGRlbGV0ZSB0aGlzLl9zcGVjLnNlbGVjdGVkO1xuXHRkZWxldGUgdGhpcy5fc3BlYy5zZWxlY3Rpb25Db3VudExhYmVsO1xuXHR0aGlzLl91cGRhdGUoKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGlzIGZhY2V0J3Mgc3BlYyB3aXRoIHRoZSBwYXNzZWQgZGF0YSBhbmQgdGhlbiB1cGRhdGVzIHRoZSBmYWNldCdzIHZpc3VhbCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIHVwZGF0ZVNwZWNcbiAqIEBwYXJhbSB7T2JqZWN0fSBzcGVjIC0gVGhlIG5ldyBzcGVjIGZvciB0aGUgZmFjZXRcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUudXBkYXRlU3BlYyA9IGZ1bmN0aW9uIChzcGVjKSB7XG5cdHRoaXMuX3NwZWMgPSBfLmV4dGVuZCh0aGlzLl9zcGVjLCBzcGVjKTtcblx0aWYgKCdzZWxlY3RlZCcgaW4gdGhpcy5fc3BlYykge1xuXHRcdHRoaXMuc2VsZWN0KHRoaXMuX3NwZWMuc2VsZWN0ZWQpO1xuXHRcdGRlbGV0ZSB0aGlzLl9zcGVjLnNlbGVjdGVkO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3VwZGF0ZSgpO1xuXHR9XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGhpdCBjb3VudCBvZiB0aGlzIGZhY2V0IGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVDb3VudFxuICogQHBhcmFtIHtudW1iZXJ9IGNvdW50IC0gVGhlIG5ldyBoaXQgY291bnQgZm9yIHRoaXMgZmFjZXQuXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLnVwZGF0ZUNvdW50ID0gZnVuY3Rpb24oY291bnQpIHtcblx0dGhpcy5fc3BlYy5jb3VudCArPSBjb3VudDtcblx0dGhpcy5fdXBkYXRlKCk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGdyb3VwIHRvdGFsIGFuZCB1cGRhdGVzIHRoZSB2aXN1YWwgc3RhdGUgKGVxdWl2YWxlbnQgdG8gdGhlIGB0b3RhbGAgcHJvcGVydHkpXG4gKlxuICogQG1ldGhvZCByZXNjYWxlXG4gKiBAcGFyYW0gZ3JvdXBUb3RhbFxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5yZXNjYWxlID0gZnVuY3Rpb24oZ3JvdXBUb3RhbCkge1xuXHR0aGlzLnRvdGFsID0gZ3JvdXBUb3RhbDtcbn07XG5cbi8qKlxuICogVW5iaW5kcyB0aGlzIGluc3RhbmNlIGZyb20gYW55IHJlZmVyZW5jZSB0aGF0IGl0IG1pZ2h0IGhhdmUgd2l0aCBldmVudCBoYW5kbGVycyBhbmQgRE9NIGVsZW1lbnRzLlxuICpcbiAqIEBtZXRob2QgZGVzdHJveVxuICogQHBhcmFtIHtib29sZWFuPX0gYW5pbWF0ZWQgLSBTaG91bGQgdGhlIGZhY2V0IGJlIHJlbW92ZWQgaW4gYW4gYW5pbWF0ZWQgd2F5IGJlZm9yZSBpdCBiZWluZyBkZXN0cm95ZWQuXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihhbmltYXRlZCkge1xuXHRpZiAoYW5pbWF0ZWQpIHtcblx0XHR2YXIgX2Rlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMub2ZmKHRoaXMuX3R5cGUgKyAnOmFuaW1hdGlvbjp2aXNpYmxlLW9mZicsIF9kZXN0cm95KTtcblx0XHRcdHRoaXMuX2Rlc3Ryb3koKTtcblx0XHR9LmJpbmQodGhpcyk7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fZGVzdHJveSgpO1xuXHR9XG5cdEZhY2V0LnByb3RvdHlwZS5kZXN0cm95LmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIG1ldGhvZCB0byBkZXN0cm95IHRoaXMgZmFjZXQuXG4gKlxuICogQG1ldGhvZCBfZGVzdHJveVxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX2Rlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5fcmVtb3ZlSGFuZGxlcnMoKTtcblx0dGhpcy5fZWxlbWVudC5vZmYoJ3RyYW5zaXRpb25lbmQnKTtcblx0dGhpcy5fZWxlbWVudC5yZW1vdmUoKTtcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgYWxsIHRoZSBsYXlvdXQgZWxlbWVudHMgYmFzZWQgb24gdGhlIGB0ZW1wbGF0ZWAgcHJvdmlkZWQuXG4gKlxuICogQG1ldGhvZCBfaW5pdGlhbGl6ZUxheW91dFxuICogQHBhcmFtIHtmdW5jdGlvbn0gdGVtcGxhdGUgLSBUaGUgdGVtcGxhdGluZyBmdW5jdGlvbiB1c2VkIHRvIGNyZWF0ZSB0aGUgbGF5b3V0LlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX2luaXRpYWxpemVMYXlvdXQgPSBmdW5jdGlvbih0ZW1wbGF0ZSkge1xuXHR0aGlzLl9lbGVtZW50ID0gJCh0ZW1wbGF0ZSh0aGlzLl9zcGVjKSk7XG5cdHRoaXMuX2NvbnRhaW5lci5hcHBlbmQodGhpcy5fZWxlbWVudCk7XG5cblx0dGhpcy5fYmFyQ29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtYmFyLWNvbnRhaW5lcicpO1xuXHR2YXIgYmFycyA9IHRoaXMuX2JhckNvbnRhaW5lci5jaGlsZHJlbignLmZhY2V0LWJhci1iYXNlJyk7XG5cdHRoaXMuX2JhckJhY2tncm91bmQgPSAkKGJhcnNbMF0pO1xuXHR0aGlzLl9iYXJGb3JlZ3JvdW5kID0gJChiYXJzWzFdKTtcblxuXHR0aGlzLl9pY29uQ29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtaWNvbicpO1xuXHR0aGlzLl9pY29uID0gdGhpcy5faWNvbkNvbnRhaW5lci5jaGlsZHJlbignaScpO1xuXHR0aGlzLl9pY29uQ29sb3IgPSB0aGlzLl9zcGVjLmljb24gJiYgdGhpcy5fc3BlYy5pY29uLmNvbG9yID8gdGhpcy5fc3BlYy5pY29uLmNvbG9yIDogbnVsbDtcblxuXHR0aGlzLl9sYWJlbCA9IHRoaXMuX2VsZW1lbnQuZmluZCgnLmZhY2V0LWxhYmVsJyk7XG5cdHRoaXMuX2xhYmVsQ291bnQgPSB0aGlzLl9lbGVtZW50LmZpbmQoJy5mYWNldC1sYWJlbC1jb3VudCcpO1xuXG5cdHRoaXMuX2xpbmtzQ29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtbGlua3MnKTtcblx0dGhpcy5fcXVlcnlDbG9zZUNvbnRhaW5lciA9IHRoaXMuX2VsZW1lbnQuZmluZCgnLmZhY2V0LXF1ZXJ5LWNsb3NlJyk7XG5cdHRoaXMuX3NlYXJjaENvbnRhaW5lciA9IHRoaXMuX2VsZW1lbnQuZmluZCgnLmZhY2V0LXNlYXJjaC1jb250YWluZXInKTtcblx0aWYgKCF0aGlzLl9zZWFyY2hDb250YWluZXIuY2hpbGRyZW4oKS5sZW5ndGgpIHtcblx0XHR0aGlzLl9zZWFyY2hDb250YWluZXIuZW1wdHkoKTtcblx0fVxuXG5cdC8qIG1ha2Ugc3VyZSBhbGwgc3R5bGVzIGhhdmUgYmVlbiBhcHBsaWVkICovXG5cdHZhciBpLCBuLCBvZmY7XG5cdGZvciAoaSA9IDAsIG4gPSB0aGlzLl9lbGVtZW50Lmxlbmd0aDsgaSA8IG47ICsraSkge1xuXHRcdG9mZiA9IHRoaXMuX2VsZW1lbnRbaV0ub2Zmc2V0SGVpZ2h0OyAvLyB0cmlnZ2VyIHN0eWxlIHJlY2FsY3VsYXRpb24uXG5cdH1cblxuXHR2YXIgY2hpbGRyZW4gPSB0aGlzLl9lbGVtZW50LmZpbmQoJyonKTtcblx0Zm9yIChpID0gMCwgbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IG47ICsraSkge1xuXHRcdG9mZiA9IGNoaWxkcmVuW2ldLm9mZnNldEhlaWdodDsgLy8gdHJpZ2dlciBzdHlsZSByZWNhbGN1bGF0aW9uLlxuXHR9XG59O1xuXG4vKipcbiAqIEFkZHMgdGhlIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyBmb3IgdGhpcyBvYmplY3QgdG8gZnVuY3Rpb24uXG4gKlxuICogQG1ldGhvZCBfYWRkSGFuZGxlcnNcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLl9hZGRIYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy52aXNpYmxlKSB7XG5cdFx0dGhpcy5faWNvbkNvbnRhaW5lci5ob3Zlcihcblx0XHRcdHRoaXMuX29uTW91c2VFbnRlci5iaW5kKHRoaXMpLFxuXHRcdFx0dGhpcy5fb25Nb3VzZUxlYXZlLmJpbmQodGhpcylcblx0XHQpO1xuXHRcdHRoaXMuX2VsZW1lbnQuY2xpY2sodGhpcy5fb25DbGljay5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLl9lbGVtZW50LmZpbmQoJy5mYWNldC1zZWFyY2gtY29udGFpbmVyJykub24oJ2NsaWNrLmZhY2V0U2VhcmNoJywgdGhpcy5fb25TZWFyY2guYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtcXVlcnktY2xvc2UnKS5vbignY2xpY2sucXVlcnlDbG9zZScsIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhbGwgdGhlIGV2ZW50IGhhbmRsZXJzIGFkZGVkIGJ5IHRoZSBgX2FkZEhhbmRsZXJzYCBmdW5jdGlvbi5cbiAqXG4gKiBAbWV0aG9kIF9yZW1vdmVIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX3JlbW92ZUhhbmRsZXJzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX2ljb25Db250YWluZXIub2ZmKCdob3ZlcicpO1xuXHR0aGlzLl9lbGVtZW50Lm9mZignY2xpY2snKTtcblx0dGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXQtc2VhcmNoLWNvbnRhaW5lcicpLm9mZignY2xpY2suZmFjZXRTZWFyY2gnKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgdmlzdWFsIHN0YXRlIG9mIHRoaXMgZmFjZXQuXG4gKlxuICogQG1ldGhvZCBfdXBkYXRlXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdHZhciBzcGVjID0gdGhpcy5fc3BlYztcblxuXHQvKiBpY29uICovIC8vIFRPRE86IE9ubHkgdXBkYXRlIGlmIHRoZSBjdXJyZW50IGljb24gaXMgbm90IHRoZSBzYW1lIGFzIHRoZSBpY29uIGluIHRoZSBzcGVjLlxuXHR0aGlzLl9pY29uQ29udGFpbmVyLmVtcHR5KCk7XG5cdHRoaXMuX2ljb25Db250YWluZXIuYXBwZW5kKCQoZmFjZXRWZXJ0aWNhbF9pY29uKHRoaXMuX3NwZWMpKSk7XG5cdHRoaXMuX2ljb24gPSB0aGlzLl9pY29uQ29udGFpbmVyLmNoaWxkcmVuKCdpJyk7XG5cdHRoaXMuX2ljb25Db2xvciA9IHRoaXMuX3NwZWMuaWNvbiAmJiB0aGlzLl9zcGVjLmljb24uY29sb3IgPyB0aGlzLl9zcGVjLmljb24uY29sb3IgOiBudWxsO1xuXG5cdC8qIGJhciBiYWNrZ3JvdW5kICovXG5cdHRoaXMuX2JhckJhY2tncm91bmQuY3NzKCd3aWR0aCcsICgoc3BlYy5jb3VudCAvIHNwZWMudG90YWwpICogMTAwKSArICclJyk7XG5cblx0LyogYmFyIGZvcmVncm91bmQgKi9cblx0aWYgKHNwZWMuc2VsZWN0ZWQgPj0gMCkge1xuXHRcdGlmICghdGhpcy5fYmFyRm9yZWdyb3VuZC5oYXNDbGFzcygnZmFjZXQtYmFyLXNlbGVjdGVkJykpIHtcblx0XHRcdHRoaXMuX2JhckZvcmVncm91bmQucmVtb3ZlQXR0cignc3R5bGUnKTtcblx0XHRcdHRoaXMuX2JhckZvcmVncm91bmQuYWRkQ2xhc3MoJ2ZhY2V0LWJhci1zZWxlY3RlZCcpO1xuXHRcdH1cblx0XHR0aGlzLl9iYXJGb3JlZ3JvdW5kLmNzcygnd2lkdGgnLCAoKHNwZWMuc2VsZWN0ZWQgLyBzcGVjLnRvdGFsKSAqIDEwMCkgKyAnJScpO1xuXHR9IGVsc2Uge1xuXHRcdGlmICh0aGlzLl9iYXJGb3JlZ3JvdW5kLmhhc0NsYXNzKCdmYWNldC1iYXItc2VsZWN0ZWQnKSkge1xuXHRcdFx0aWYgKHRoaXMuX2ljb25Db2xvcikge1xuXHRcdFx0XHR0aGlzLl9iYXJGb3JlZ3JvdW5kLmNzcygnYmFja2dyb3VuZC1jb2xvcicsIHRoaXMuX2ljb25Db2xvcik7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9iYXJGb3JlZ3JvdW5kLnJlbW92ZUNsYXNzKCdmYWNldC1iYXItc2VsZWN0ZWQnKTtcblx0XHR9XG5cdFx0dGhpcy5fYmFyRm9yZWdyb3VuZC5jc3MoJ3dpZHRoJywgKChzcGVjLmNvdW50IC8gc3BlYy50b3RhbCkgKiAxMDApICsgJyUnKTtcblx0fVxuXG5cdC8qIGxhYmVsICovXG5cdGlmIChzcGVjLmRpc3BsYXlWYWx1ZSkge1xuXHRcdG5ld0xhYmVsSFRNTCA9IHNwZWMuZGlzcGxheVZhbHVlO1xuXHR9IGVsc2UgaWYgKHNwZWMubGFiZWwpIHtcblx0XHRuZXdMYWJlbEhUTUwgPSBzcGVjLmxhYmVsO1xuXHR9IGVsc2Uge1xuXHQgIG5ld0xhYmVsSFRNTCA9IHNwZWMudmFsdWU7XG5cdH1cblx0aWYgKG5ld0xhYmVsSFRNTCAhPT0gdGhpcy5fbGFiZWwuaHRtbCgpKSB7XG5cdFx0dGhpcy5fbGFiZWwuaHRtbChuZXdMYWJlbEhUTUwpO1xuXHR9XG5cblx0LyogY291bnQgbGFiZWwgKi9cblx0dmFyIGNvdW50TGFiZWwgPSBzcGVjLnNlbGVjdGlvbkNvdW50TGFiZWwgfHwgc3BlYy5jb3VudExhYmVsIHx8IHNwZWMuY291bnQudG9TdHJpbmcoKTtcblx0aWYgKHRoaXMuX2xhYmVsQ291bnQudGV4dCgpICE9PSBjb3VudExhYmVsKSB7XG5cdFx0dGhpcy5fbGFiZWxDb3VudC50ZXh0KGNvdW50TGFiZWwpO1xuXHR9XG5cblx0LyogbGlua3MgKi8gLy8gVE9ETzogT25seSB1cGRhdGUgaWYgdGhlIGN1cnJlbnQgaWNvbiBpcyBub3QgdGhlIHNhbWUgYXMgdGhlIGljb24gaW4gdGhlIHNwZWMuXG5cdHRoaXMuX2xpbmtzQ29udGFpbmVyLmVtcHR5KCk7XG5cdHRoaXMuX2xpbmtzQ29udGFpbmVyLmFwcGVuZChmYWNldFZlcnRpY2FsX2xpbmtzKHRoaXMuX3NwZWMpKTtcblxuXHQvKiBzZWFyY2ggKi8gLy8gVE9ETzogT25seSB1cGRhdGUgaWYgdGhlIGN1cnJlbnQgaWNvbiBpcyBub3QgdGhlIHNhbWUgYXMgdGhlIGljb24gaW4gdGhlIHNwZWMuXG5cdHRoaXMuX3NlYXJjaENvbnRhaW5lci5lbXB0eSgpO1xuXHR0aGlzLl9zZWFyY2hDb250YWluZXIuYXBwZW5kKGZhY2V0VmVydGljYWxfc2VhcmNoKHRoaXMuX3NwZWMpKTtcblx0aWYgKCF0aGlzLl9zZWFyY2hDb250YWluZXIuY2hpbGRyZW4oKS5sZW5ndGgpIHtcblx0XHR0aGlzLl9zZWFyY2hDb250YWluZXIuZW1wdHkoKTtcblx0fVxufTtcblxuLyoqXG4gKiBDbGljayBldmVudCBoYW5kbGVyLlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2dCAtIEV2ZW50IHRvIGhhbmRsZS5cbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLl9vbkNsaWNrID0gZnVuY3Rpb24oZXZ0KSB7XG5cdHRoaXMuZW1pdCh0aGlzLl90eXBlICsgJzpjbGljaycsIGV2dCwgdGhpcy5fa2V5LCB0aGlzLl92YWx1ZSwgdGhpcy5fY291bnQpO1xufTtcblxuLyoqXG4gKiBTZWFyY2ggZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldnQgLSBFdmVudCB0byBoYW5kbGUuXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5fb25TZWFyY2ggPSBmdW5jdGlvbihldnQpIHtcblx0ZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuXHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6c2VhcmNoJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG59O1xuXG4vKipcbiAqIENsb3NlIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZ0IC0gRXZlbnQgdG8gaGFuZGxlLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX29uQ2xvc2UgPSBmdW5jdGlvbihldnQpIHtcblx0ZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuXHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6Y2xvc2UnLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcbn07XG5cbi8qKlxuICogTW91c2UgZW50ZXIgZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldnQgLSBFdmVudCB0byBoYW5kbGUuXG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldFZlcnRpY2FsLnByb3RvdHlwZS5fb25Nb3VzZUVudGVyID0gZnVuY3Rpb24oZXZ0KSB7XG5cdHRoaXMuZW1pdCh0aGlzLl90eXBlICsgJzptb3VzZWVudGVyJywgZXZ0LCB0aGlzLl9rZXksIHRoaXMuX3ZhbHVlLCB0aGlzLl9jb3VudCk7XG59O1xuXG4vKipcbiAqIE1vdXNlIGxlYXZlIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZ0IC0gRXZlbnQgdG8gaGFuZGxlLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRWZXJ0aWNhbC5wcm90b3R5cGUuX29uTW91c2VMZWF2ZSA9IGZ1bmN0aW9uKGV2dCkge1xuXHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6bW91c2VsZWF2ZScsIGV2dCwgdGhpcy5fa2V5LCB0aGlzLl92YWx1ZSwgdGhpcy5fY291bnQpO1xufTtcblxuLyoqXG4gKiBUcmFuc2l0aW9uIGVuZCBldmVudCBoYW5kbGVyLlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2dCAtIEV2ZW50IHRvIGhhbmRsZS5cbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0VmVydGljYWwucHJvdG90eXBlLl9oYW5kbGVUcmFuc2l0aW9uRW5kID0gZnVuY3Rpb24oZXZ0KSB7XG5cdHZhciBwcm9wZXJ0eSA9IGV2dC5vcmlnaW5hbEV2ZW50LnByb3BlcnR5TmFtZTtcblx0aWYgKGV2dC50YXJnZXQgPT09IHRoaXMuX2VsZW1lbnQuZ2V0KDApICYmIHByb3BlcnR5ID09PSAnb3BhY2l0eScpIHtcblx0XHRpZiAodGhpcy52aXNpYmxlKSB7XG5cdFx0XHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6YW5pbWF0aW9uOnZpc2libGUtb24nLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5lbWl0KHRoaXMuX3R5cGUgKyAnOmFuaW1hdGlvbjp2aXNpYmxlLW9mZicsIGV2dCwgdGhpcy5fa2V5LCB0aGlzLl92YWx1ZSwgdGhpcy5fY291bnQpO1xuXHRcdH1cblx0fSBlbHNlIGlmIChldnQudGFyZ2V0ID09PSB0aGlzLl9pY29uQ29udGFpbmVyLmdldCgwKSAmJiBwcm9wZXJ0eSA9PT0gJ29wYWNpdHknKSB7XG5cdFx0aWYgKHRoaXMuYWJicmV2aWF0ZWQpIHtcblx0XHRcdHRoaXMuZW1pdCh0aGlzLl90eXBlICsgJzphbmltYXRpb246YWJicmV2aWF0ZWQtb24nLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5lbWl0KHRoaXMuX3R5cGUgKyAnOmFuaW1hdGlvbjphYmJyZXZpYXRlZC1vZmYnLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcblx0XHR9XG5cdH0gZWxzZSBpZiAoZXZ0LnRhcmdldCA9PT0gdGhpcy5fYmFyQmFja2dyb3VuZC5nZXQoMCkgJiYgcHJvcGVydHkgPT09ICd3aWR0aCcpIHtcblx0XHR0aGlzLmVtaXQodGhpcy5fdHlwZSArICc6YW5pbWF0aW9uOmJhci13aWR0aC1jaGFuZ2UnLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcblx0fSBlbHNlIGlmIChldnQudGFyZ2V0ID09PSB0aGlzLl9iYXJGb3JlZ3JvdW5kLmdldCgwKSAmJiBwcm9wZXJ0eSA9PT0gJ3dpZHRoJykge1xuXHRcdGlmICghdGhpcy5faGFzRW1pdHRlZFNlbGVjdGVkRXZlbnQgJiYgdGhpcy5fYmFyRm9yZWdyb3VuZC5oYXNDbGFzcygnZmFjZXQtYmFyLXNlbGVjdGVkJykpIHtcblx0XHRcdHRoaXMuZW1pdCh0aGlzLl90eXBlICsgJzphbmltYXRpb246c2VsZWN0ZWQtb24nLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcblx0XHRcdHRoaXMuX2hhc0VtaXR0ZWRTZWxlY3RlZEV2ZW50ID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHRoaXMuX2hhc0VtaXR0ZWRTZWxlY3RlZEV2ZW50ICYmICF0aGlzLl9iYXJGb3JlZ3JvdW5kLmhhc0NsYXNzKCdmYWNldC1iYXItc2VsZWN0ZWQnKSkge1xuXHRcdFx0dGhpcy5lbWl0KHRoaXMuX3R5cGUgKyAnOmFuaW1hdGlvbjpzZWxlY3RlZC1vZmYnLCBldnQsIHRoaXMuX2tleSwgdGhpcy5fdmFsdWUsIHRoaXMuX2NvdW50KTtcblx0XHRcdHRoaXMuX2hhc0VtaXR0ZWRTZWxlY3RlZEV2ZW50ID0gZmFsc2U7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIEBleHBvcnRcbiAqIEB0eXBlIHtGYWNldFZlcnRpY2FsfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0VmVydGljYWw7XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG5cbnZhciBfID0gcmVxdWlyZSgnLi4vdXRpbC91dGlsJyk7XG52YXIgSUJpbmRhYmxlID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9JQmluZGFibGUnKTtcbnZhciBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9ncm91cCcpO1xudmFyIFRlbXBsYXRlTW9yZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9ncm91cC1tb3JlJyk7XG52YXIgRmFjZXRWZXJ0aWNhbCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvZmFjZXQvZmFjZXRWZXJ0aWNhbCcpO1xudmFyIEZhY2V0SG9yaXpvbnRhbCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvZmFjZXQvZmFjZXRIb3Jpem9udGFsJyk7XG5cbnZhciBDT0xMQVBTRURfQ0xBU1MgPSAnZmFjZXRzLWdyb3VwLWNvbGxhcHNlZCc7XG52YXIgRUxMSVBTSVNfVklTSUJMRV9DTEFTUyA9ICdncm91cC1mYWNldC1lbGxpcHNpcy12aXNpYmxlJztcbnZhciBDSEVDS0VEX1RPR0dMRV9DTEFTUyA9ICdmYS1jaGVjay1zcXVhcmUtbyc7XG52YXIgVU5DSEVDS0VEX1RPR0dMRV9DTEFTUyA9ICdmYS1zcXVhcmUtbyc7XG5cbi8qKlxuICogRmFjZXQgZ3JvdXAgY2xhc3MgZGVzaWduZWQgdG8gaW5zdGFudGlhdGUgYW5kIGhvbGQgZmFjZXQgaW5zdGFuY2VzLlxuICpcbiAqIEBjbGFzcyBHcm91cFxuICogQHBhcmFtIHtGYWNldHN9IHdpZGdldCAtIFRoZSBmYWNldHMgd2lkZ2V0IHRoaXMgZ3JvdXAgYmVsb25ncyB0by5cbiAqIEBwYXJhbSB7anF1ZXJ5fSBjb250YWluZXIgLSBBIGpRdWVyeSB3cmFwcGVkIGVsZW1lbnQgd2hlcmUgdGhpcyBncm91cCB3aWxsIHJlc2lkZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBncm91cFNwZWMgLSBUaGUgZGF0YSB1c2VkIHRvIGxvYWQgdGhpcyBncm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gQW4gT2JqZWN0IHdpdGggdGhlIG9wdGlvbnMgZm9yIHRoaXMgZ3JvdXAuXG4gKiBAcGFyYW0ge251bWJlcj19IGluZGV4IC0gVGhlIGluZGV4IHRoaXMgZ3JvdXAgc2hvdWxkIGhvbGQgaW4gdGhlIHdpZGdldC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBHcm91cCh3aWRnZXQsIGNvbnRhaW5lciwgZ3JvdXBTcGVjLCBvcHRpb25zLCBpbmRleCkge1xuXHRJQmluZGFibGUuY2FsbCh0aGlzKTtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG5cdHRoaXMuX3dpZGdldCA9IHdpZGdldDtcblx0dGhpcy5fa2V5ID0gZ3JvdXBTcGVjLmtleTtcblx0dGhpcy5fY29udGFpbmVyID0gY29udGFpbmVyO1xuXHR0aGlzLl9vd25zVG90YWwgPSBmYWxzZTtcblx0dGhpcy5fdG90YWwgPSAwO1xuXG5cdHRoaXMuX2NhbkRyYWcgPSBmYWxzZTtcblx0dGhpcy5fZHJhZ2dpbmcgPSBmYWxzZTtcblx0dGhpcy5fZHJhZ2dpbmdYID0gMDtcblx0dGhpcy5fZHJhZ2dpbmdZID0gMDtcblx0dGhpcy5fZHJhZ2dpbmdZT2Zmc2V0ID0gMDtcblx0dGhpcy5fZHJhZ2dpbmdHcm91cFRvcCA9IDA7XG5cdHRoaXMuX3Njcm9sbEVsZW1lbnQgPSBudWxsO1xuXHR0aGlzLl90cmFja2luZ1RvdWNoSUQgPSBudWxsO1xuXHR0aGlzLl90b3VjaFN0YXJ0VGltZSA9IDA7XG5cdHRoaXMuX2luZGV4ID0gaW5kZXggfHwgMDtcblxuXHR0aGlzLl9mYWNldHMgPSB7XG5cdFx0dmVydGljYWw6IFtdLFxuXHRcdGhvcml6b250YWw6IFtdLFxuXHRcdGFsbDogW11cblx0fTtcblxuXHR0aGlzLl9pbml0aWFsaXplTGF5b3V0KFRlbXBsYXRlLCBncm91cFNwZWMubGFiZWwsIGdyb3VwU3BlYy5tb3JlIHx8IDApO1xuXHR0aGlzLl9pbml0aWFsaXplRmFjZXRzKGdyb3VwU3BlYyk7XG5cdC8qIGNvbGxhcHNlZCBzdGF0ZSAqL1xuXHRpZiAoZ3JvdXBTcGVjLmNvbGxhcHNlZCkge1xuXHRcdHRoaXMuY29sbGFwc2VkID0gdHJ1ZTtcblx0fVxuXHR0aGlzLl9zZXR1cEhhbmRsZXJzKCk7XG59XG5cbi8qKlxuICogQGluaGVyaXRhbmNlIHtJQmluZGFibGV9XG4gKi9cbkdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSUJpbmRhYmxlLnByb3RvdHlwZSk7XG5Hcm91cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBHcm91cDtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZ3JvdXAncyBjb25maWd1cmVkIGtleS5cbiAqXG4gKiBAcHJvcGVydHkga2V5XG4gKiBAdHlwZSB7c3RyaW5nfVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShHcm91cC5wcm90b3R5cGUsICdrZXknLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9rZXk7XG5cdH1cbn0pO1xuXG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGdyb3VwJ3MgdG90YWwgaGl0IGNvdW50LlxuICpcbiAqIEBwcm9wZXJ0eSB0b3RhbFxuICogQHR5cGUge251bWJlcn1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoR3JvdXAucHJvdG90eXBlLCAndG90YWwnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl90b3RhbDtcblx0fVxufSk7XG5cbi8qKlxuICogUmV0dXJucyBhbGwgb2YgdGhpcyBncm91cCdzIGZhY2V0cy5cbiAqXG4gKiBAcHJvcGVydHkgZmFjZXRzXG4gKiBAdHlwZSB7QXJyYXl9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEdyb3VwLnByb3RvdHlwZSwgJ2ZhY2V0cycsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2ZhY2V0cy5hbGw7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFJldHVybnMgdGhpcyBncm91cCdzIGhvcml6b250YWwgZmFjZXRzLlxuICpcbiAqIEBwcm9wZXJ0eSBmYWNldHNcbiAqIEB0eXBlIHtBcnJheX1cbiAqIEByZWFkb25seVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoR3JvdXAucHJvdG90eXBlLCAnaG9yaXpvbnRhbEZhY2V0cycsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2ZhY2V0cy5ob3Jpem9udGFsO1xuXHR9XG59KTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZ3JvdXAncyB2ZXJ0aWNhbCBmYWNldHMuXG4gKlxuICogQHByb3BlcnR5IGZhY2V0c1xuICogQHR5cGUge0FycmF5fVxuICogQHJlYWRvbmx5XG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShHcm91cC5wcm90b3R5cGUsICd2ZXJ0aWNhbEZhY2V0cycsIHtcblx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2ZhY2V0cy52ZXJ0aWNhbDtcblx0fVxufSk7XG5cbi8qKlxuICogSXMgdGhpcyBncm91cCB2aXNpYmxlLlxuICpcbiAqIEBwcm9wZXJ0eSB2aXNpYmxlXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEdyb3VwLnByb3RvdHlwZSwgJ3Zpc2libGUnLCB7XG5cdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9lbGVtZW50LmlzKCc6dmlzaWJsZScpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLl9lbGVtZW50LnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fZWxlbWVudC5oaWRlKCk7XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBQcm9wZXJ0eSBtZWFudCB0byBrZWVwIHRyYWNrIG9mIHRoaXMgZ3JvdXAncyBpbmRleCBpbiB0aGUgd2lkZ2V0LlxuICpcbiAqIEBwcm9wZXJ0eSBpbmRleFxuICogQHR5cGUge251bWJlcn1cbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KEdyb3VwLnByb3RvdHlwZSwgJ2luZGV4Jywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5faW5kZXg7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRpZiAodmFsdWUgIT09IHRoaXMuX2luZGV4KSB7XG5cdFx0XHR0aGlzLl9pbmRleCA9IHZhbHVlO1xuXHRcdFx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDpyZW9yZGVyZWQnLCBudWxsLCB0aGlzLl9rZXksIHRoaXMuX2luZGV4KTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vKipcbiAqIElzIHRoaXMgZ3JvdXAgY29sbGFwc2VkLlxuICpcbiAqIEBwcm9wZXJ0eSBjb2xsYXBzZWRcbiAqIEB0eXBlIHtib29sZWFufVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoR3JvdXAucHJvdG90eXBlLCAnY29sbGFwc2VkJywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZWxlbWVudC5oYXNDbGFzcyhDT0xMQVBTRURfQ0xBU1MpO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlICE9PSB0aGlzLmNvbGxhcHNlZCkge1xuXHRcdFx0dGhpcy5fc2V0Q29sbGFwc2VkQ2xhc3Nlcyh2YWx1ZSwgdGhpcy5mYWNldHMubGVuZ3RoID49IDMpO1xuXHRcdFx0dGhpcy5fc2V0QWJicmV2aWF0ZUFuZEhpZGVGYWNldHModmFsdWUsIDMpO1xuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogTWFrZXMgc3VyZSB0aGF0IGFsbCBmYWNldHMgaW4gdGhpcyBncm91cCBjYW4gYmUgc2VsZWN0ZWQuXG4gKlxuICogQG1ldGhvZCBpbml0aWFsaXplU2VsZWN0aW9uXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5pbml0aWFsaXplU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLnZlcnRpY2FsRmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0KSB7XG5cdFx0ZmFjZXQuc2VsZWN0KDApO1xuXHR9KTtcbn07XG5cbi8qKlxuICogRGVzZWxlY3RzIGFsbCBmYWNldHMgaW4gdGhpcyBncm91cC5cbiAqXG4gKiBAbWV0aG9kIGNsZWFyU2VsZWN0aW9uXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5jbGVhclNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXQpIHtcblx0XHRmYWNldC5kZXNlbGVjdCgpO1xuXHR9KTtcbn07XG5cbi8qKlxuICogSGlnaGxpZ2h0cyB0aGUgZmFjZXQgd2l0aCB0aGUgc3BlY2lmaWVkIHZhbHVlLlxuICpcbiAqIEBtZXRob2QgaGlnaGxpZ2h0XG4gKiBAcGFyYW0geyp9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBmYWNldCB0byBoaWdobGlnaHQuXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0dmFyIGV4aXN0aW5nRmFjZXQgPSB0aGlzLl9nZXRGYWNldCh2YWx1ZSk7XG5cdGlmIChleGlzdGluZ0ZhY2V0KSB7XG5cdFx0ZXhpc3RpbmdGYWNldC5oaWdobGlnaHRlZCA9IHRydWU7XG5cdH1cbn07XG5cbi8qKlxuICogVW5oaWdobGlnaHRzIHRoZSBmYWNldCB3aXRoIHRoZSBzcGVjaWZpZWQgdmFsdWUuXG4gKlxuICogQG1ldGhvZCB1bmhpZ2hsaWdodFxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmFjZXQgdG8gdW5oaWdobGlnaHRcbiAqL1xuR3JvdXAucHJvdG90eXBlLnVuaGlnaGxpZ2h0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdGlmICh2YWx1ZSkge1xuXHRcdHZhciBleGlzdGluZ0ZhY2V0ID0gdGhpcy5fZ2V0RmFjZXQodmFsdWUpO1xuXHRcdGlmIChleGlzdGluZ0ZhY2V0KSB7XG5cdFx0XHRleGlzdGluZ0ZhY2V0LmhpZ2hsaWdodGVkID0gZmFsc2U7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHRoaXMudmVydGljYWxGYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXQpIHtcblx0XHRcdGZhY2V0LmhpZ2hsaWdodGVkID0gZmFsc2U7XG5cdFx0fSk7XG5cdH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBmYWNldCB3aXRoIHRoZSBnaXZlbiB2YWx1ZSBpcyBoaWdobGlnaHRlZC5cbiAqXG4gKiBAbWV0aG9kIGlzSGlnaGxpZ2h0ZWRcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZhY2V0IHRvIGxvb2sgZm9yLlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbkdyb3VwLnByb3RvdHlwZS5pc0hpZ2hsaWdodGVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdHZhciByZXNwb25zZSA9IGZhbHNlLFxuXHRcdGV4aXN0aW5nRmFjZXQgPSB0aGlzLl9nZXRGYWNldCh2YWx1ZSk7XG5cblx0aWYgKGV4aXN0aW5nRmFjZXQpIHtcblx0XHRyZXNwb25zZSA9IGV4aXN0aW5nRmFjZXQuaGlnaGxpZ2h0ZWQ7XG5cdH1cblxuXHRyZXR1cm4gcmVzcG9uc2U7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZpbHRlciByYW5nZSBvZiB0aGUgZmFjZXQgd2l0aCB0aGUgZ2l2ZW4gdmFsdWUgb3IgbnVsbCBpZiBhbiBlcnJvciBvY2N1cnMuXG4gKlxuICogQG1ldGhvZCBnZXRGaWx0ZXJSYW5nZVxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmFjZXQgZm9yIHdoaWNoIHRoZSBmaWx0ZXIgd2lsbCBiZSByZXRyaWV2ZWQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fG51bGx9XG4gKi9cbkdyb3VwLnByb3RvdHlwZS5nZXRGaWx0ZXJSYW5nZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHR2YXIgZmFjZXQgPSB0aGlzLl9nZXRGYWNldCh2YWx1ZSk7XG5cdGlmIChmYWNldCAmJiAnZmlsdGVyUmFuZ2UnIGluIGZhY2V0KSB7XG5cdFx0cmV0dXJuIGZhY2V0LmZpbHRlclJhbmdlO1xuXHR9XG5cdHJldHVybiBudWxsO1xufTtcblxuLyoqXG4gKiBBcHBlbmRzIHRoZSBzcGVjaWZpZWQgZGF0YSB0byB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgYXBwZW5kXG4gKiBAcGFyYW0ge09iamVjdH0gZ3JvdXBTcGVjIC0gVGhlIGRhdGEgc3BlY2lmaWNhdGlvbiB0byBhcHBlbmQuXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoZ3JvdXBTcGVjKSB7XG5cdHZhciBleGlzdGluZ0ZhY2V0O1xuXG5cdC8qIHJlbW92ZSBldmVudCBoYW5kbGVycyAqL1xuXHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXG5cdGdyb3VwU3BlYy5tb3JlID0gZ3JvdXBTcGVjLm1vcmUgfHwgMDtcblx0dGhpcy5fdXBkYXRlTW9yZShncm91cFNwZWMubW9yZSk7XG5cblx0Ly8gbWFrZSBzdXJlIHRoZSBncm91cCBpcyBub3QgY29sbGFwc2VkIChzbyB0aGUgYXBwZW5kIGVmZmVjdCBpcyB2aXNpYmxlKVxuXHR0aGlzLmNvbGxhcHNlZCA9IGZhbHNlO1xuXG5cdGlmIChncm91cFNwZWMudG90YWwpIHtcblx0XHR0aGlzLl9vd25zVG90YWwgPSB0cnVlO1xuXHRcdHRoaXMuX3RvdGFsID0gZ3JvdXBTcGVjLnRvdGFsO1xuXHR9XG5cblx0Ly8gdXBkYXRlIGFsbCB0aGUgZmFjZXRzICh0aGUgZ3JvdXAgdG90YWwgbW9zdCBsaWtlbHkgY2hhbmdlZClcblx0Z3JvdXBTcGVjLmZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChmYWNldFNwZWMpIHtcblx0XHRpZiAoIXRoaXMuX293bnNUb3RhbCAmJiAhKCdoaXN0b2dyYW0nIGluIGZhY2V0U3BlYykpIHsgLy8gaXQncyBub3QgYSBob3Jpem9udGFsIGZhY2V0XG5cdFx0XHR0aGlzLl90b3RhbCArPSBmYWNldFNwZWMuY291bnQ7XG5cdFx0fVxuXHRcdGV4aXN0aW5nRmFjZXQgPSB0aGlzLl9nZXRGYWNldChmYWNldFNwZWMudmFsdWUpO1xuXHRcdGlmIChleGlzdGluZ0ZhY2V0KSB7XG5cdFx0XHRmYWNldFNwZWMuY291bnQgKz0gZXhpc3RpbmdGYWNldC5jb3VudDtcblx0XHRcdGV4aXN0aW5nRmFjZXQudXBkYXRlU3BlYyhmYWNldFNwZWMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgZmFjZXQgPSB0aGlzLl9jcmVhdGVOZXdGYWNldChmYWNldFNwZWMsIGdyb3VwU3BlYy5rZXksIHRydWUpO1xuXHRcdFx0aWYgKGZhY2V0IGluc3RhbmNlb2YgRmFjZXRIb3Jpem9udGFsKSB7XG5cdFx0XHRcdHRoaXMuaG9yaXpvbnRhbEZhY2V0cy5wdXNoKGZhY2V0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMudmVydGljYWxGYWNldHMucHVzaChmYWNldCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmZhY2V0cy5wdXNoKGZhY2V0KTtcblx0XHRcdGZhY2V0LnZpc2libGUgPSB0cnVlO1xuXHRcdFx0LyogZm9yd2FyZCBhbGwgdGhlIGV2ZW50cyBmcm9tIHRoaXMgZmFjZXQgKi9cblx0XHRcdHRoaXMuZm9yd2FyZChmYWNldCk7XG5cdFx0fVxuXHR9LCB0aGlzKTtcblxuXHQvLyBVcGRhdGUgZmFjZXQgdG90YWxzIHNvIHRoZXkgY2FuIHJlc2NhbGUgdGhlaXIgYmFyc1xuXHR0aGlzLmZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChmYWNldCkge1xuXHRcdGZhY2V0LnRvdGFsID0gdGhpcy5fdG90YWw7XG5cdH0sIHRoaXMpO1xuXG5cdC8qIGNvbGxhcHNlZCBzdGF0ZSAqL1xuXHRpZiAoZ3JvdXBTcGVjLmNvbGxhcHNlZCkge1xuXHRcdHRoaXMuY29sbGFwc2VkID0gdHJ1ZTtcblx0fVxuXG5cdC8vIHJlLXJlZ2lzdGVyIGhhbmRsZXJzIHRvIGVuc3VyZSBuZXdseSBhZGRlZCBlbGVtZW50cyByZXNwb25kIHRvIGV2ZW50c1xuXHR0aGlzLl9hZGRIYW5kbGVycygpO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlIGFsbCB0aGUgZmFjZXQgZW50cmllcyBpbiB0aGlzIGdyb3VwIHdpdGggbmV3IG9uZXMgaW4gZ3JvdXBTcGVjLlxuICogTWFpbnRhaW5zIGdyb3VwIGFuZCBmYWNldCBjbGllbnQgZXZlbnRzLlxuICpcbiAqIEBtZXRob2QgcmVwbGFjZVxuICogQHBhcmFtIHtPYmplY3R9IGdyb3VwU3BlYyAtIFRoZSBkYXRhIHNwZWNpZmljYXRpb24gY29udGFpbmluZyBmYWNldHMgdG8gcmVwbGFjZS5cbiAqL1xuR3JvdXAucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbihncm91cFNwZWMpIHtcblx0Ly8gbWFrZSBzdXJlIHRoZSBncm91cCBpcyBub3QgY29sbGFwc2VkIChzbyB0aGUgYXBwZW5kIGVmZmVjdCBpcyB2aXNpYmxlKVxuXHR0aGlzLmNvbGxhcHNlZCA9IGZhbHNlO1xuXG5cdC8qIHJlbW92ZSBldmVudCBoYW5kbGVycyAqL1xuXHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXG5cdC8vIERlc3Ryb3kgZXhpc3RpbmcgZmFjZXRzXG5cdHRoaXMuX2Rlc3Ryb3lGYWNldHMoKTtcblxuXHQvLyBpbml0aWFsaXplIHRoZSBuZXcgZmFjZXRzXG5cdHRoaXMuX2luaXRpYWxpemVGYWNldHMoZ3JvdXBTcGVjKTtcblxuXHQvLyBVcGRhdGUgbW9yZSBsaW5rXG5cdGdyb3VwU3BlYy5tb3JlID0gZ3JvdXBTcGVjLm1vcmUgfHwgMDtcblx0dGhpcy5fdXBkYXRlTW9yZShncm91cFNwZWMubW9yZSk7XG5cblx0LyogY29sbGFwc2VkIHN0YXRlICovXG5cdGlmIChncm91cFNwZWMuY29sbGFwc2VkKSB7XG5cdFx0dGhpcy5jb2xsYXBzZWQgPSB0cnVlO1xuXHR9XG5cblx0Ly8gcmUtcmVnaXN0ZXIgaGFuZGxlcnMgdG8gZW5zdXJlIG5ld2x5IGFkZGVkIGVsZW1lbnRzIHJlc3BvbmQgdG8gZXZlbnRzXG5cdHRoaXMuX2FkZEhhbmRsZXJzKCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIGZhY2V0IHdpdGggdGhlIHNwZWNpZmllZCB2YWx1ZSBmcm9tIHRoaXMgZ3JvdXAuXG4gKlxuICogQG1ldGhvZCByZW1vdmVGYWNldFxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIHRoZSB2YWx1ZSBvZiB0aGUgZmFjZXQgdG8gcmVtb3ZlLlxuICovXG5Hcm91cC5wcm90b3R5cGUucmVtb3ZlRmFjZXQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR2YXIgZmFjZXQgPSB0aGlzLl9nZXRGYWNldCh2YWx1ZSk7XG5cdHZhciBmYWNldEluZGV4ID0gdGhpcy5mYWNldHMuaW5kZXhPZihmYWNldCk7XG5cdGlmIChmYWNldEluZGV4ID49IDApIHtcblx0XHR0aGlzLmZhY2V0cy5zcGxpY2UoZmFjZXRJbmRleCwgMSk7XG5cblx0XHR2YXIgZmFjZXRUeXBlQXJyYXkgPSBudWxsO1xuXHRcdGlmIChmYWNldCBpbnN0YW5jZW9mIEZhY2V0SG9yaXpvbnRhbCkge1xuXHRcdFx0ZmFjZXRUeXBlQXJyYXkgPSB0aGlzLmhvcml6b250YWxGYWNldHM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZhY2V0VHlwZUFycmF5ID0gdGhpcy52ZXJ0aWNhbEZhY2V0cztcblx0XHR9XG5cdFx0ZmFjZXRJbmRleCA9IGZhY2V0VHlwZUFycmF5LmluZGV4T2YoZmFjZXQpO1xuXHRcdGlmIChmYWNldEluZGV4ID49IDApIHtcblx0XHRcdGZhY2V0VHlwZUFycmF5LnNwbGljZShmYWNldEluZGV4LCAxKTtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMuX293bnNUb3RhbCkge1xuXHRcdFx0dGhpcy5fdG90YWwgKz0gZmFjZXQuX3NwZWMuY291bnQ7XG5cdFx0XHQvLyBVcGRhdGUgZmFjZXQgdG90YWxzIHNvIHRoZXkgY2FuIHJlc2NhbGUgdGhlaXIgYmFyc1xuXHRcdFx0dGhpcy5mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXQpIHtcblx0XHRcdFx0ZmFjZXQudG90YWwgPSB0aGlzLl90b3RhbDtcblx0XHRcdH0sIHRoaXMpO1xuXHRcdH1cblxuXHRcdC8qIGRlc3Ryb3lpbmcgYSBmYWNldCBhdXRvbWF0aWNhbGx5IHVuZm9yd2FyZHMgaXRzIGV2ZW50cyAqL1xuXHRcdGZhY2V0LmRlc3Ryb3kodHJ1ZSk7XG5cdH1cbn07XG5cbi8qKlxuICogU2V0cyB0aGlzIGdyb3VwIHRvIGJlIGdhcmJhZ2UgY29sbGVjdGVkIGJ5IHJlbW92aW5nIGFsbCByZWZlcmVuY2VzIHRvIGV2ZW50IGhhbmRsZXJzIGFuZCBET00gZWxlbWVudHMuXG4gKiBDYWxscyBgZGVzdHJveWAgb24gaXRzIGZhY2V0cy5cbiAqXG4gKiBAbWV0aG9kIGRlc3Ryb3lcbiAqL1xuR3JvdXAucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX3JlbW92ZUhhbmRsZXJzKCk7XG5cdHRoaXMuX2Rlc3Ryb3lGYWNldHMoKTtcblx0dGhpcy5fZWxlbWVudC5yZW1vdmUoKTtcblx0SUJpbmRhYmxlLnByb3RvdHlwZS5kZXN0cm95LmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIHRocm91Z2ggdGhlIGZhY2V0cyBpbiB0aGlzIGdyb3VwIGFuZCBjYWxscyBgZGVzdHJveWAgb24gZWFjaCBvbmUgb2YgdGhlbS5cbiAqXG4gKiBAbWV0aG9kIF9kZXN0cm95RmFjZXRzXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX2Rlc3Ryb3lGYWNldHMgPSBmdW5jdGlvbiAoKSB7XG5cdC8vIGRlc3Ryb3kgYWxsIHRoZSBmYWNldHNcblx0dGhpcy5mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXQpIHtcblx0XHQvKiBkZXN0cm95aW5nIGEgZmFjZXQgYXV0b21hdGljYWxseSB1bmZvcndhcmRzIGl0cyBldmVudHMgKi9cblx0XHRmYWNldC5kZXN0cm95KCk7XG5cdH0pO1xuXG5cdC8vIHJlc2V0IHRoZSBmYWNldHMgc3RydWN0dXJlXG5cdHRoaXMuX2ZhY2V0cyA9IHtcblx0XHRob3Jpem9udGFsOiBbXSxcblx0XHR2ZXJ0aWNhbDogW10sXG5cdFx0YWxsOiBbXVxuXHR9O1xufTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyBhbGwgdGhlIGxheW91dCBlbGVtZW50cyBiYXNlZCBvbiB0aGUgYHRlbXBsYXRlYCBwcm92aWRlZC5cbiAqXG4gKiBAbWV0aG9kIF9pbml0aWFsaXplTGF5b3V0XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSB0ZW1wbGF0ZSAtIFRoZSB0ZW1wbGF0aW5nIGZ1bmN0aW9uIHVzZWQgdG8gY3JlYXRlIHRoZSBsYXlvdXQuXG4gKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBUaGUgbGFiZWwgdG8gYmUgdXNlZCBmb3IgdGhpcyBncm91cC5cbiAqIEBwYXJhbSB7Kn0gbW9yZSAtIEEgdmFsdWUgZGVmaW5pbmcgdGhlICdtb3JlJyBiZWhhdmlvdXIgb2YgdGhpcyBncm91cC5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faW5pdGlhbGl6ZUxheW91dCA9IGZ1bmN0aW9uICh0ZW1wbGF0ZSwgbGFiZWwsIG1vcmUpIHtcblx0dGhpcy5fZWxlbWVudCA9ICQodGVtcGxhdGUoe1xuXHRcdGxhYmVsOiBsYWJlbCxcblx0XHRtb3JlOiBtb3JlXG5cdH0pKTtcblx0dGhpcy5fY29udGFpbmVyLmFwcGVuZCh0aGlzLl9lbGVtZW50KTtcblx0dGhpcy5fZmFjZXRDb250YWluZXIgPSB0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1mYWNldC1jb250YWluZXInKTtcblx0dGhpcy5fZ3JvdXBDb250ZW50ID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZmFjZXRzLWdyb3VwJyk7XG5cblx0dGhpcy5fdXBkYXRlTW9yZShtb3JlKTtcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlXG4gKiBAcGFyYW0gc3BlY1xuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9pbml0aWFsaXplRmFjZXRzID0gZnVuY3Rpb24gKHNwZWMpIHtcblx0Ly8gQ2FsY3VsYXRlIHRoZSBncm91cCB0b3RhbFxuXHRpZiAoc3BlYy50b3RhbCkge1xuXHRcdHRoaXMuX293bnNUb3RhbCA9IHRydWU7XG5cdFx0dGhpcy5fdG90YWwgPSBzcGVjLnRvdGFsO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX293bnNUb3RhbCA9IGZhbHNlO1xuXHRcdHNwZWMuZmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0U3BlYykge1xuXHRcdFx0aWYgKCEoJ2hpc3RvZ3JhbScgaW4gZmFjZXRTcGVjKSkgeyAvLyBpdCdzIG5vdCBhIGhvcml6b250YWwgZmFjZXRcblx0XHRcdFx0dGhpcy5fdG90YWwgKz0gZmFjZXRTcGVjLmNvdW50O1xuXHRcdFx0fVxuXHRcdH0sIHRoaXMpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGVhY2ggZmFjZXRcblx0dmFyIGZhY2V0cyA9IHNwZWMuZmFjZXRzO1xuXHRmb3IgKHZhciBpID0gMCwgbiA9IGZhY2V0cy5sZW5ndGg7IGkgPCBuOyArK2kpIHtcblx0XHR2YXIgZmFjZXRTcGVjID0gZmFjZXRzW2ldO1xuXHRcdHZhciBmYWNldCA9IHRoaXMuX2NyZWF0ZU5ld0ZhY2V0KGZhY2V0U3BlYywgc3BlYy5rZXkpO1xuXHRcdGlmIChmYWNldCBpbnN0YW5jZW9mIEZhY2V0SG9yaXpvbnRhbCkge1xuXHRcdFx0dGhpcy5ob3Jpem9udGFsRmFjZXRzLnB1c2goZmFjZXQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnZlcnRpY2FsRmFjZXRzLnB1c2goZmFjZXQpO1xuXHRcdH1cblx0XHR0aGlzLmZhY2V0cy5wdXNoKGZhY2V0KTtcblx0XHQvKiBmb3J3YXJkIGFsbCB0aGUgZXZlbnRzIGZyb20gdGhpcyBmYWNldCAqL1xuXHRcdHRoaXMuZm9yd2FyZChmYWNldCk7XG5cdH1cbn07XG5cbi8qKlxuICogVXRpbGl0eSBmdW5jdGlvbiB0byBtYWtlIHN1cmUgdGhlIGV2ZW50IGhhbmRsZXJzIGhhdmUgYmVlbiBhZGRlZCBhbmQgYXJlIHVwZGF0ZWQuXG4gKlxuICogQG1ldGhvZCBfc2V0dXBIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9zZXR1cEhhbmRsZXJzID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9yZW1vdmVIYW5kbGVycygpO1xuXHR0aGlzLl9hZGRIYW5kbGVycygpO1xufTtcblxuLyoqXG4gKiBBZGRzIHRoZSBuZWNlc3NhcnkgZXZlbnQgaGFuZGxlcnMgZm9yIHRoaXMgb2JqZWN0IHRvIGZ1bmN0aW9uLlxuICpcbiAqIEBtZXRob2QgX2FkZEhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX2FkZEhhbmRsZXJzID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1leHBhbmRlcicpLm9uKCdjbGljay5mYWNldHNDb2xsYXBzZUV4cGFuZCcsIHRoaXMuX3RvZ2dsZUNvbGxhcHNlRXhwYW5kLmJpbmQodGhpcykpO1xuXHR0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1tb3JlLXRhcmdldCcpLm9uKCdjbGljay5mYWNldHNHcm91cE1vcmUnLCB0aGlzLl9vbk1vcmUuYmluZCh0aGlzKSk7XG5cdHRoaXMuX2VsZW1lbnQuZmluZCgnLmdyb3VwLW90aGVyLXRhcmdldCcpLm9uKCdjbGljay5mYWNldHNHcm91cE90aGVyJywgdGhpcy5fb25PdGhlci5iaW5kKHRoaXMpKTtcblx0dGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtaGVhZGVyJykub24oJ21vdXNlZG93bicsIHRoaXMuX2hhbmRsZUhlYWRlck1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblx0JChkb2N1bWVudCkub24oJ21vdXNldXAuZ3JvdXAuJyArIHRoaXMuX2tleSwgdGhpcy5faGFuZGxlSGVhZGVyTW91c2VVcC5iaW5kKHRoaXMpKTtcblx0JChkb2N1bWVudCkub24oJ21vdXNlbW92ZS5ncm91cC4nICsgdGhpcy5fa2V5LCB0aGlzLl9oYW5kbGVIZWFkZXJNb3VzZU1vdmUuYmluZCh0aGlzKSk7XG5cblx0dGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtaGVhZGVyJykub24oJ3RvdWNoc3RhcnQnLCB0aGlzLl9oYW5kbGVIZWFkZXJUb3VjaFN0YXJ0LmJpbmQodGhpcykpO1xuXHQkKGRvY3VtZW50KS5vbigndG91Y2htb3ZlLmdyb3VwLicgKyB0aGlzLl9rZXksIHRoaXMuX2hhbmRsZUhlYWRlclRvdWNoTW92ZS5iaW5kKHRoaXMpKTtcblx0JChkb2N1bWVudCkub24oJ3RvdWNoZW5kLmdyb3VwLicgKyB0aGlzLl9rZXksIHRoaXMuX2hhbmRsZUhlYWRlclRvdWNoRW5kLmJpbmQodGhpcykpO1xuXHQkKGRvY3VtZW50KS5vbigndG91Y2hjYW5jZWwuZ3JvdXAuJyArIHRoaXMuX2tleSwgdGhpcy5faGFuZGxlSGVhZGVyVG91Y2hFbmQuYmluZCh0aGlzKSk7XG5cblx0dGhpcy5fZWxlbWVudC5vbigndHJhbnNpdGlvbmVuZCcsIHRoaXMuX2hhbmRsZVRyYW5zaXRpb25FbmQuYmluZCh0aGlzKSk7XG5cblx0LyogYXNzdW1lIHRoYXQgd2Ugc2hvdWxkIHdhaXQgZm9yIGFsbCB0aGUgZ3JvdXBzIHRvIGJlIGluc3RhbnRpYXRlZCBiZWZvcmUgYWRkaW5nIHRoZSBzY3JvbGwgaGFuZGxlciAqL1xuXHRzZXRUaW1lb3V0KHRoaXMuX2FkZFNjcm9sbEhhbmRsZXIuYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYWxsIHRoZSBldmVudCBoYW5kbGVycyBhZGRlZCBieSB0aGUgYF9hZGRIYW5kbGVyc2AgZnVuY3Rpb24uXG4gKlxuICogQG1ldGhvZCBfcmVtb3ZlSGFuZGxlcnNcbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fcmVtb3ZlSGFuZGxlcnMgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2VsZW1lbnQuZmluZCgnLmdyb3VwLWV4cGFuZGVyJykub2ZmKCdjbGljay5mYWNldHNDb2xsYXBzZUV4cGFuZCcpO1xuXHR0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1tb3JlLXRhcmdldCcpLm9mZignY2xpY2suZmFjZXRzR3JvdXBNb3JlJyk7XG5cdHRoaXMuX2VsZW1lbnQuZmluZCgnLmdyb3VwLW90aGVyLXRhcmdldCcpLm9mZignY2xpY2suZmFjZXRzR3JvdXBPdGhlcicpO1xuXHR0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1oZWFkZXInKS5vZmYoJ21vdXNlZG93bicpO1xuXHQkKGRvY3VtZW50KS5vZmYoJ21vdXNldXAuZ3JvdXAuJyArIHRoaXMuX2tleSk7XG5cdCQoZG9jdW1lbnQpLm9mZignbW91c2Vtb3ZlLmdyb3VwLicgKyB0aGlzLl9rZXkpO1xuXHQkKGRvY3VtZW50KS5vZmYoJ3RvdWNobW92ZS5ncm91cC4nICsgdGhpcy5fa2V5KTtcblx0JChkb2N1bWVudCkub2ZmKCd0b3VjaGVuZC5ncm91cC4nICsgdGhpcy5fa2V5KTtcblx0JChkb2N1bWVudCkub2ZmKCd0b3VjaGNhbmNlbC5ncm91cC4nICsgdGhpcy5fa2V5KTtcblx0dGhpcy5fZWxlbWVudC5vZmYoJ3RyYW5zaXRpb25lbmQnKTtcblx0dGhpcy5fcmVtb3ZlU2Nyb2xsSGFuZGxlcigpO1xufTtcblxuLyoqXG4gKiBBZGRzIHRoZSBzY3JvbGwgaGFuZGxlciBuZWVkZWQgZm9yIGdyb3VwcyB0byB3b3JrIHByb3Blcmx5IHdoZW4gZHJhZ2dpbmcuXG4gKlxuICogQG1ldGhvZCBfYWRkU2Nyb2xsSGFuZGxlclxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9hZGRTY3JvbGxIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX3JlbW92ZVNjcm9sbEhhbmRsZXIoKTtcblxuXHQvKiBmaW5kIHRoZSBmaXJzdCBlbGVtZW50IHRoYXQgY2FuIGJlIHNjcm9sbGVkIGFuZCBhdHRhY2ggdG8gaXQgKi9cblx0dmFyIGN1cnJlbnRFbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblx0d2hpbGUgKHRydWUpIHtcblx0XHRpZiAoIWN1cnJlbnRFbGVtZW50Lmxlbmd0aCkge1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0dmFyIHJhd0VsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5nZXQoMCk7XG5cdFx0aWYgKHJhd0VsZW1lbnQuc2Nyb2xsSGVpZ2h0ID4gcmF3RWxlbWVudC5jbGllbnRIZWlnaHQpIHtcblx0XHRcdHRoaXMuX3Njcm9sbEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudDtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdGN1cnJlbnRFbGVtZW50ID0gY3VycmVudEVsZW1lbnQucGFyZW50KCk7XG5cdH1cblxuXHRpZiAodGhpcy5fc2Nyb2xsRWxlbWVudCkge1xuXHRcdHRoaXMuX3Njcm9sbEVsZW1lbnQub24oJ3Njcm9sbC5ncm91cC4nICsgdGhpcy5fa2V5LCB0aGlzLl9oYW5kbGVIZWFkZXJNb3VzZU1vdmUuYmluZCh0aGlzKSk7XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgc2Nyb2xsIGhhbmRsZXIgZm9yIHRoaXMgZ3JvdXAuXG4gKlxuICogQG1ldGhvZCBfcmVtb3ZlU2Nyb2xsSGFuZGxlclxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9yZW1vdmVTY3JvbGxIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLl9zY3JvbGxFbGVtZW50KSB7XG5cdFx0dGhpcy5fc2Nyb2xsRWxlbWVudC5vZmYoJ3Njcm9sbC5ncm91cC4nICsgdGhpcy5fa2V5KTtcblx0XHR0aGlzLl9zY3JvbGxFbGVtZW50ID0gbnVsbDtcblx0fVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmYWNldHMgd2l0aCB0aGUgZ2l2ZW4gdmFsdWUsIGlmIGl0IGV4aXN0cyBpbiB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgX2dldEZhY2V0XG4gKiBAcGFyYW0geyp9IHZhbHVlIC0gVGhhIHZhbHVlIHRvIGxvb2sgZm9yLlxuICogQHJldHVybnMge0ZhY2V0fVxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9nZXRGYWNldCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHR2YXIgZmFjZXRPYmogPSB0aGlzLmZhY2V0cy5maWx0ZXIoZnVuY3Rpb24gKGYpIHtcblx0XHRyZXR1cm4gZi52YWx1ZSA9PT0gdmFsdWU7XG5cdH0pO1xuXHRpZiAoZmFjZXRPYmogJiYgZmFjZXRPYmoubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBmYWNldE9ialswXTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoZSAnbW9yZScgc3RhdGUgb2YgdGhpcyBncm91cC5cbiAqIFRPRE86IFVzZSB0aGUgYWxyZWFkeSBjcmVhdGVkIGVsZW1lbnQgaWYgcG9zc2libGUgaW5zdGVhZCBvZiBjcmVhdGluZyBhbmV3IG9uZSBldmVyeSB0aW1lLlxuICpcbiAqIEBtZXRob2QgX3VwZGF0ZU1vcmVcbiAqIEBwYXJhbSB7bnVtYmVyfHxib29sZWFufSBtb3JlIC0gVGhlIG51bWJlciBvZiBleHRyYSBmYWNldHMgYXZhaWxhYmxlIG9yIGEgYm9vbGVhbiBzcGVjaWZ5aW5nIG9mIHRoZXJlIGFyZSBtb3JlIGVsZW1lbnRzLlxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl91cGRhdGVNb3JlID0gZnVuY3Rpb24gKG1vcmUpIHtcblx0dGhpcy5fbW9yZUVsZW1lbnQgPSAkKFRlbXBsYXRlTW9yZSh7XG5cdFx0bW9yZTogbW9yZVxuXHR9KSk7XG5cdHRoaXMuX21vcmVDb250YWluZXIgPSB0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1tb3JlLWNvbnRhaW5lcicpO1xuXHR0aGlzLl9tb3JlQ29udGFpbmVyLnJlcGxhY2VXaXRoKHRoaXMuX21vcmVFbGVtZW50KTtcblx0LyogbWFrZSBzdXJlIHRoZSBET00gaXMgdXBkYXRlZCBhdCB0aGlzIHRpbWUgKi9cblx0dGhpcy5fbW9yZUVsZW1lbnQuY3NzKCdoZWlnaHQnKTtcbn07XG5cbi8qKlxuICogQ3JldGVzIGEgbmV3IGZhY2V0IGJhc2VkIG9uIHRoZSBzcGVjaWZpZWQgc3BlYyBhbmQgYXBwZW5kcyBpdCB0byB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgX2NyZWF0ZU5ld0ZhY2V0XG4gKiBAcGFyYW0ge09iamVjdH0gZmFjZXRTcGVjIC0gRGF0YSBzcGVjaWZpY2F0aW9uIGZvciB0aGUgZmFjZXQgdG8gY3JlYXRlLlxuICogQHBhcmFtIHtzdHJpbmd9IGdyb3VwS2V5IC0gVGhlIGdyb3VwIGtleSB0byBjcmVhdGUgdGhlIGZhY2V0IHdpdGguXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBoaWRkZW4gLSBTcGVjaWZpZXMgaWYgdGhlIG5ld2x5IGNyZWF0ZWQgZmFjZXQgc2hvdWxkIGJlIGNyZWF0ZWQgaGlkZGVuLlxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9jcmVhdGVOZXdGYWNldCA9IGZ1bmN0aW9uIChmYWNldFNwZWMsIGdyb3VwS2V5LCBoaWRkZW4pIHtcblx0aWYgKCdoaXN0b2dyYW0nIGluIGZhY2V0U3BlYykge1xuXHRcdC8vIGNyZWF0ZSBhIGhvcml6b250YWwgZmFjZXRcblx0XHRyZXR1cm4gbmV3IEZhY2V0SG9yaXpvbnRhbCh0aGlzLl9mYWNldENvbnRhaW5lciwgdGhpcywgXy5leHRlbmQoZmFjZXRTcGVjLCB7XG5cdFx0XHRrZXk6IGdyb3VwS2V5LFxuXHRcdFx0aGlkZGVuOiBoaWRkZW5cblx0XHR9KSk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gY3JlYXRlIGEgdmVydGljYWwgZmFjZXRcblx0XHRyZXR1cm4gbmV3IEZhY2V0VmVydGljYWwodGhpcy5fZmFjZXRDb250YWluZXIsIHRoaXMsIF8uZXh0ZW5kKGZhY2V0U3BlYywge1xuXHRcdFx0a2V5OiBncm91cEtleSxcblx0XHRcdHRvdGFsOiB0aGlzLl90b3RhbCxcblx0XHRcdHNlYXJjaDogdGhpcy5fb3B0aW9ucy5zZWFyY2gsXG5cdFx0XHRoaWRkZW46IGhpZGRlblxuXHRcdH0pKTtcblx0fVxufTtcblxuLyoqXG4gKiBWaXN1YWxseSBleHBhbmRzIG9yIGNvbGxhcHNlcyB0aGlzIGdyb3VwLiBDYW4gYmUgdXNlZCB0byBoYW5kbGUgYW4gaW5wdXQgZXZlbnQuXG4gKlxuICogQG1ldGhvZCBfdG9nZ2xlQ29sbGFwc2VFeHBhbmRcbiAqIEBwYXJhbSB7RXZlbnQ9fSBldnQgLSBUaGUgZXZlbnQgYmVpbmcgaGFuZGxlLCBpZiBhbnkuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fdG9nZ2xlQ29sbGFwc2VFeHBhbmQgPSBmdW5jdGlvbiAoZXZ0KSB7XG5cdGlmIChldnQpIHtcblx0XHRldnQucHJldmVudERlZmF1bHQoKTtcblx0XHRldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdH1cblxuXHR0aGlzLmNvbGxhcHNlZCA9ICF0aGlzLmNvbGxhcHNlZDtcblx0aWYgKHRoaXMuY29sbGFwc2VkKSB7XG5cdFx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDpjb2xsYXBzZScsIGV2dCwgdGhpcy5fa2V5KTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLmVtaXQoJ2ZhY2V0LWdyb3VwOmV4cGFuZCcsIGV2dCwgdGhpcy5fa2V5KTtcblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogQWRkcyBvciByZW1vdmVzIHRoZSBjb2xsYXBzZWQgY2xhc3NlcyB0byB0aGUgcmVsZXZhbnQgZWxlbWVudHMgaW4gdGhpcyBncm91cC5cbiAqIFdBUk5JTkc6IERvIG5vdCBjYWxsIHRoaXMgZnVuY3Rpb24sIHRoaXMgaXMgaGVyZSBmb3IgcmVhZGFiaWxpdHkgcHVycG9zZXMuXG4gKiBGb3IgbW9yZSBpbmZvIC0gaHR0cHM6Ly9zdGFzaC51bmNoYXJ0ZWQuc29mdHdhcmUvcHJvamVjdHMvU1RPUklFUy9yZXBvcy9mYWNldHMvcHVsbC1yZXF1ZXN0cy80Mi9vdmVydmlld1xuICpcbiAqIEBtZXRob2QgX3NldENvbGxhcHNlZENsYXNzZXNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDb2xsYXBzZWQgLSBJcyB0aGUgZ3JvdXAgY29sbGFwc2VkLlxuICogQHBhcmFtIHtib29sZWFufSBzaG93RWxsaXBzaXMgLSBXaGVuIGNvbGxhcHNlZCwgc2hvdWxkIHRoZSBlbGxpcHNpcyBiZSBzaG93bi5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fc2V0Q29sbGFwc2VkQ2xhc3NlcyA9IGZ1bmN0aW9uIChpc0NvbGxhcHNlZCwgc2hvd0VsbGlwc2lzKSB7XG5cdHZhciBncm91cENvbGxhcHNlSWNvbiA9IHRoaXMuX2VsZW1lbnQuZmluZCgnLnRvZ2dsZScpLFxuXHRcdGdyb3VwRWxsaXBzaXMgPSB0aGlzLl9lbGVtZW50LmZpbmQoJy5ncm91cC1mYWNldC1lbGxpcHNpcycpO1xuXG5cdGlmIChpc0NvbGxhcHNlZCkge1xuXHRcdC8qIGFkZCB0aGUgY29sbGFwc2VkIGNsYXNzIHRvIHRoZSBncm91cCAqL1xuXHRcdHRoaXMuX2VsZW1lbnQuYWRkQ2xhc3MoQ09MTEFQU0VEX0NMQVNTKTtcblxuXHRcdC8qIG1ha2Ugc3VyZSB0aGUgaWNvbiBpcyBjaGVja2VkICovXG5cdFx0Z3JvdXBDb2xsYXBzZUljb24ucmVtb3ZlQ2xhc3MoQ0hFQ0tFRF9UT0dHTEVfQ0xBU1MpO1xuXHRcdGdyb3VwQ29sbGFwc2VJY29uLmFkZENsYXNzKFVOQ0hFQ0tFRF9UT0dHTEVfQ0xBU1MpO1xuXG5cdFx0LyogaWYgdGhlcmUgYXJlIG1vcmUgdGhhbiB0aHJlZSBmYWNldHMgc2hvdyB0aGUgZWxsaXBzaXMgKi9cblx0XHRpZiAoc2hvd0VsbGlwc2lzKSB7XG5cdFx0XHRncm91cEVsbGlwc2lzLmFkZENsYXNzKEVMTElQU0lTX1ZJU0lCTEVfQ0xBU1MpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHQvKiByZW1vdmUgdGhlIGNvbGxhcHNlZCBjbGFzcyAqL1xuXHRcdHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2xhc3MoQ09MTEFQU0VEX0NMQVNTKTtcblxuXHRcdC8qIG1ha2Ugc3VyZSB0aGUgaWNvbiBpcyB1bmNoZWNrZWQgKi9cblx0XHRncm91cENvbGxhcHNlSWNvbi5yZW1vdmVDbGFzcyhVTkNIRUNLRURfVE9HR0xFX0NMQVNTKTtcblx0XHRncm91cENvbGxhcHNlSWNvbi5hZGRDbGFzcyhDSEVDS0VEX1RPR0dMRV9DTEFTUyk7XG5cblx0XHQvKiByZW1vdmUgdGhlIGVsbGlwc2lzICovXG5cdFx0Z3JvdXBFbGxpcHNpcy5yZW1vdmVDbGFzcyhFTExJUFNJU19WSVNJQkxFX0NMQVNTKTtcblx0fVxufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBhYmJyZWJpYXRlZCBhbmQvb3IgaGlkZW4gc3RhdGUgb2YgdGhlIGZhY2V0cyBpbiB0aGlzIGdyb3VwIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVycyBwYXNzZWQuXG4gKiBXQVJOSU5HOiBEbyBub3QgY2FsbCB0aGlzIGZ1bmN0aW9uLCB0aGlzIGlzIGhlcmUgZm9yIHJlYWRhYmlsaXR5IHB1cnBvc2VzLlxuICogRm9yIG1vcmUgaW5mbyAtIGh0dHBzOi8vc3Rhc2gudW5jaGFydGVkLnNvZnR3YXJlL3Byb2plY3RzL1NUT1JJRVMvcmVwb3MvZmFjZXRzL3B1bGwtcmVxdWVzdHMvNDIvb3ZlcnZpZXdcbiAqXG4gKiBAbWV0aG9kIF9zZXRBYmJyZXZpYXRlQW5kSGlkZUZhY2V0c1xuICogQHBhcmFtIHtib29sZWFufSBhYmJyZXZpYXRlZCAtIFNob3VsZCB0aGUgZmFjZXRzIGJlIGFiYnJldmlhdGVkLlxuICogQHBhcmFtIHtudW1iZXJ9IG1heEZhY2V0c1RvQWJicmV2aWF0ZSAtIE1heGltdW0gbnVtYmVyIG9mIGZhY2V0cyB0byBhYmJyZXZpYXRlLCBhbnkgZmFjZXQgYWZ0ZXIgdGhpcyBudW1iZXIgd2lsbCBiZSBoaWRkZW4uXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX3NldEFiYnJldmlhdGVBbmRIaWRlRmFjZXRzID0gZnVuY3Rpb24gKGFiYnJldmlhdGVkLCBtYXhGYWNldHNUb0FiYnJldmlhdGUpIHtcblx0dGhpcy5mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXQsIGkpIHtcblx0XHRpZiAoaSA8IG1heEZhY2V0c1RvQWJicmV2aWF0ZSkge1xuXHRcdFx0ZmFjZXQuYWJicmV2aWF0ZWQgPSBhYmJyZXZpYXRlZDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZmFjZXQudmlzaWJsZSA9ICFhYmJyZXZpYXRlZDtcblx0XHR9XG5cdH0pO1xufTtcblxuLyoqXG4gKiBIYW5kbGVyIGZ1bmN0aW9uIGNhbGxlZCB3aGVuIHRoZSB1c2VyIGNsaWNrIG9uIHRoZSAnbW9yZScgbGluay5cbiAqXG4gKiBAbWV0aG9kIF9vbk1vcmVcbiAqIEBwYXJhbSB7RXZlbnR9IGV2dCAtIFRoZSBldmVudCBiZWluZyBoYW5kbGVkLlxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9vbk1vcmUgPSBmdW5jdGlvbiAoZXZ0KSB7XG5cdGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdHZhciBpbmRleCA9IGV2dC5jdXJyZW50VGFyZ2V0LmdldEF0dHJpYnV0ZSgnaW5kZXgnKTtcblx0aW5kZXggPSAoaW5kZXggIT09IG51bGwpID8gcGFyc2VJbnQoaW5kZXgpIDogbnVsbDtcblx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDptb3JlJywgZXZ0LCB0aGlzLl9rZXksIGluZGV4KTtcbn07XG5cbi8qKlxuICogSGFuZGxlciBmdW5jdGlvbiBjYWxsZWQgd2hlbiB0aGUgdXNlciBjbGljayBvbiB0aGUgJ290aGVyJyBmYWNldC5cbiAqXG4gKiBAbWV0aG9kIF9vbk90aGVyXG4gKiBAcGFyYW0ge0V2ZW50fSBldnQgLSBUaGUgZXZlbnQgYmVpbmcgaGFuZGxlZC5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5fb25PdGhlciA9IGZ1bmN0aW9uIChldnQpIHtcblx0ZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcblx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDpvdGhlcicsIGV2dCwgdGhpcy5fa2V5KTtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaGFuZGxlIGEgbW91c2UgZG93biBldmVudCB0byBwcmVwYXJlIGRyYWdnaW5nLlxuICpcbiAqIEBtZXRob2QgX2hhbmRsZUhlYWRlck1vdXNlRG93blxuICogQHBhcmFtIHtFdmVudH0gZXZ0IC0gVGhlIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9oYW5kbGVIZWFkZXJNb3VzZURvd24gPSBmdW5jdGlvbiAoZXZ0KSB7XG5cdGlmIChldnQuYnV0dG9uID09PSAwKSB7XG5cdFx0ZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dGhpcy5fY2FuRHJhZyA9IHRydWU7XG5cdFx0dGhpcy5fZHJhZ2dpbmcgPSBmYWxzZTtcblx0XHR0aGlzLl9kcmFnZ2luZ1ggPSBldnQuY2xpZW50WDtcblx0XHR0aGlzLl9kcmFnZ2luZ1kgPSBldnQuY2xpZW50WTtcblx0XHR0aGlzLl9kcmFnZ2luZ1lPZmZzZXQgPSAwO1xuXHRcdHRoaXMuX2RyYWdnaW5nR3JvdXBUb3AgPSB0aGlzLl9lbGVtZW50Lm9mZnNldCgpLnRvcDtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGhhbmRsZSBhIG1vdXNlIHVwIGV2ZW50IGFuZCBlbmQgZHJhZ2dpbmcuXG4gKlxuICogQG1ldGhvZCBfaGFuZGxlSGVhZGVyTW91c2VVcFxuICogQHBhcmFtIHtFdmVudH0gZXZ0IC0gVGhlIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9oYW5kbGVIZWFkZXJNb3VzZVVwID0gZnVuY3Rpb24gKGV2dCkge1xuXHR0aGlzLl9jYW5EcmFnID0gZmFsc2U7XG5cdGlmICh0aGlzLl9kcmFnZ2luZykge1xuXHRcdGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHRoaXMuX2RyYWdnaW5nID0gZmFsc2U7XG5cdFx0LyogcmVzZXQgcG9zaXRpb24gKi9cblx0XHR0aGlzLl9ncm91cENvbnRlbnQucmVtb3ZlQXR0cignc3R5bGUnKTtcblx0XHQvKiB0cmlnZ2VyIGRyYWdnaW5nIGVuZCBldmVudCAqL1xuXHRcdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6ZHJhZ2dpbmc6ZW5kJywgZXZ0LCB0aGlzLl9rZXkpO1xuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBoYW5kbGUgYSBtb3VzZSBtb3ZlIGV2ZW50IGFuZCBwZXJmb3JtIGRyYWdnaW5nLlxuICpcbiAqIEBtZXRob2QgX2hhbmRsZUhlYWRlck1vdXNlTW92ZVxuICogQHBhcmFtIHtFdmVudH0gZXZ0IC0gVGhlIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9oYW5kbGVIZWFkZXJNb3VzZU1vdmUgPSBmdW5jdGlvbiAoZXZ0KSB7XG5cdGlmICh0aGlzLl9jYW5EcmFnKSB7XG5cdFx0ZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0aWYgKCF0aGlzLl9kcmFnZ2luZykge1xuXHRcdFx0dGhpcy5fc3RhcnREcmFnZ2luZyhldnQpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3BlcmZvcm1EcmFnZ2luZyhldnQpO1xuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGhhbmRsZSBhIHRvdWNoIHN0YXJ0IGV2ZW50LlxuICpcbiAqIEBtZXRob2QgX2hhbmRsZUhlYWRlclRvdWNoU3RhcnRcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gVGhlIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faGFuZGxlSGVhZGVyVG91Y2hTdGFydCA9IGZ1bmN0aW9uIChldmVudCkge1xuXHR2YXIgdG91Y2hFdmVudCA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XG5cdGlmICh0b3VjaEV2ZW50LnRvdWNoZXMubGVuZ3RoIDwgMiAmJiB0aGlzLl90cmFja2luZ1RvdWNoSUQgPT09IG51bGwpIHtcblx0XHR2YXIgdG91Y2ggPSBldmVudC5vcmlnaW5hbEV2ZW50LmNoYW5nZWRUb3VjaGVzWzBdO1xuXHRcdHRoaXMuX2NhbkRyYWcgPSB0cnVlO1xuXHRcdHRoaXMuX3RyYWNraW5nVG91Y2hJRCA9IHRvdWNoLmlkZW50aWZpZXI7XG5cdFx0dGhpcy5fdG91Y2hTdGFydFRpbWUgPSBldmVudC50aW1lU3RhbXA7XG5cdFx0dGhpcy5fZHJhZ2dpbmdYID0gdG91Y2guY2xpZW50WDtcblx0XHR0aGlzLl9kcmFnZ2luZ1kgPSB0b3VjaC5jbGllbnRZO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX2NhbkRyYWcgPSBmYWxzZTtcblx0XHR0aGlzLl90cmFja2luZ1RvdWNoSUQgPSBudWxsO1xuXHRcdHRoaXMuX3RvdWNoU3RhcnRUaW1lID0gMDtcblx0fVxuXHR0aGlzLl9kcmFnZ2luZyA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBoYW5kbGUgYSB0b3VjaCBtb3ZlIGV2ZW50LlxuICpcbiAqIEBtZXRob2QgX2hhbmRsZUhlYWRlclRvdWNoTW92ZVxuICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSBUaGUgZXZlbnQgdGhhdCB0cmlnZ2VyZWQgdGhpcyBoYW5kbGVyLlxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9oYW5kbGVIZWFkZXJUb3VjaE1vdmUgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0aWYgKHRoaXMuX2NhbkRyYWcgJiYgdGhpcy5fdHJhY2tpbmdUb3VjaElEICE9PSBudWxsKSB7XG5cdFx0dmFyIHRvdWNoZXMgPSBldmVudC5vcmlnaW5hbEV2ZW50LmNoYW5nZWRUb3VjaGVzO1xuXHRcdGZvciAodmFyIGkgPSAwLCBuID0gdG91Y2hlcy5sZW5ndGg7IGkgPCBuOyArK2kpIHtcblx0XHRcdHZhciB0b3VjaCA9IHRvdWNoZXNbaV07XG5cdFx0XHRpZiAodG91Y2guaWRlbnRpZmllciA9PT0gdGhpcy5fdHJhY2tpbmdUb3VjaElEKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9kcmFnZ2luZykge1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0dGhpcy5fcGVyZm9ybURyYWdnaW5nKHRvdWNoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgdGltZUVsYXBzZWQgPSBldmVudC50aW1lU3RhbXAgLSB0aGlzLl90b3VjaFN0YXJ0VGltZTtcblx0XHRcdFx0XHR2YXIgZGlzdGFuY2VNb3ZlZCA9IE1hdGguc3FydChNYXRoLnBvdyh0b3VjaC5jbGllbnRYIC0gdGhpcy5fZHJhZ2dpbmdYLCAyKSArIE1hdGgucG93KHRvdWNoLmNsaWVudFkgLSB0aGlzLl9kcmFnZ2luZ1ksIDIpKTtcblx0XHRcdFx0XHRpZiAodGltZUVsYXBzZWQgPiAyMDApIHtcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHR0aGlzLl9kcmFnZ2luZ1lPZmZzZXQgPSAwO1xuXHRcdFx0XHRcdFx0dGhpcy5fZHJhZ2dpbmdHcm91cFRvcCA9IHRoaXMuX2VsZW1lbnQub2Zmc2V0KCkudG9wO1xuXHRcdFx0XHRcdFx0dGhpcy5fc3RhcnREcmFnZ2luZyhldmVudCk7XG5cdFx0XHRcdFx0XHR0aGlzLl9wZXJmb3JtRHJhZ2dpbmcodG91Y2gpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoZGlzdGFuY2VNb3ZlZCA+IDcpIHtcblx0XHRcdFx0XHRcdHRoaXMuX2NhbkRyYWcgPSBmYWxzZTtcblx0XHRcdFx0XHRcdHRoaXMuX3RyYWNraW5nVG91Y2hJRCA9IG51bGw7XG5cdFx0XHRcdFx0XHR0aGlzLl90b3VjaFN0YXJ0VGltZSA9IDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBoYW5kbGUgYSB0b3VjaCBlbmQgZXZlbnQuXG4gKlxuICogQG1ldGhvZCBfaGFuZGxlSGVhZGVyVG91Y2hFbmRcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gVGhlIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAqIEBwcml2YXRlXG4gKi9cbkdyb3VwLnByb3RvdHlwZS5faGFuZGxlSGVhZGVyVG91Y2hFbmQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0dGhpcy5fY2FuRHJhZyA9IGZhbHNlO1xuXHR0aGlzLl90cmFja2luZ1RvdWNoSUQgPSBudWxsO1xuXHR0aGlzLl90b3VjaFN0YXJ0VGltZSA9IDA7XG5cdGlmICh0aGlzLl9kcmFnZ2luZykge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dGhpcy5fZHJhZ2dpbmcgPSBmYWxzZTtcblx0XHQvKiByZXNldCBwb3NpdGlvbiAqL1xuXHRcdHRoaXMuX2dyb3VwQ29udGVudC5yZW1vdmVBdHRyKCdzdHlsZScpO1xuXHRcdC8qIHRyaWdnZXIgZHJhZ2dpbmcgZW5kIGV2ZW50ICovXG5cdFx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDpkcmFnZ2luZzplbmQnLCBldmVudCwgdGhpcy5fa2V5KTtcblx0fVxufTtcblxuLyoqXG4gKiBUcmFuc2l0aW9uIGVuZCBldmVudCBoYW5kbGVyLlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gRXZlbnQgdG8gaGFuZGxlLlxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9oYW5kbGVUcmFuc2l0aW9uRW5kID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdHZhciBwcm9wZXJ0eSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQucHJvcGVydHlOYW1lO1xuXHRpZiAoZXZlbnQudGFyZ2V0ID09PSB0aGlzLl9tb3JlRWxlbWVudC5nZXQoMCkgJiYgcHJvcGVydHkgPT09ICdvcGFjaXR5Jykge1xuXHRcdGlmICh0aGlzLmNvbGxhcHNlZCkge1xuXHRcdFx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDphbmltYXRpb246Y29sbGFwc2Utb24nLCBldmVudCwgdGhpcy5fa2V5KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5lbWl0KCdmYWNldC1ncm91cDphbmltYXRpb246Y29sbGFwc2Utb2ZmJywgZXZlbnQsIHRoaXMuX2tleSk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIFNldHMgdXAgdGhlIGdyb3VwIHRvIGJlIGRyYWdnZWQuXG4gKlxuICogQG1ldGhvZCBfc3RhcnREcmFnZ2luZ1xuICogQHBhcmFtIHtFdmVudHxUb3VjaH0gZXZlbnQgLSBUaGUgZXZlbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIGRyYWcuXG4gKiBAcHJpdmF0ZVxuICovXG5Hcm91cC5wcm90b3R5cGUuX3N0YXJ0RHJhZ2dpbmcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0aWYgKCF0aGlzLl9kcmFnZ2luZykge1xuXHRcdHRoaXMuX2RyYWdnaW5nID0gdHJ1ZTtcblx0XHQvLyBkcmFnZ2luZyBzZXR1cCAvL1xuXHRcdHRoaXMuX2dyb3VwQ29udGVudC5jc3Moe1xuXHRcdFx0cG9zaXRpb246ICdyZWxhdGl2ZScsXG5cdFx0XHR0b3A6IDAsXG5cdFx0XHRsZWZ0OiAwLFxuXHRcdFx0J3otaW5kZXgnOiA5OTlcblx0XHR9KTtcblx0XHR0aGlzLmVtaXQoJ2ZhY2V0LWdyb3VwOmRyYWdnaW5nOnN0YXJ0JywgZXZlbnQsIHRoaXMuX2tleSk7XG5cdH1cbn07XG5cbi8qKlxuICogUGVyZm9ybXMgYSBkcmFnZ2luZyBhY3Rpb24gb24gdGhpcyBncm91cCBiYXNlZCBvbiB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICpcbiAqIEBtZXRob2QgX3BlcmZvcm1EcmFnZ2luZ1xuICogQHBhcmFtIHtFdmVudHxUb3VjaH0gZXZlbnQgLSB0aGUgZXZlbnQgb3IgdG91Y2ggdGhhdCBzaG91bGQgYmUgdXNlZCB0byBjYWxjdWxhdGUgdGhlIGRyYWdnaW5nIGRpc3RhbmNlLlxuICogQHByaXZhdGVcbiAqL1xuR3JvdXAucHJvdG90eXBlLl9wZXJmb3JtRHJhZ2dpbmcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0LyogY2FsY3VsYXRlIHRoZSBncm91cCBkaW1lbnNpb25zICovXG5cdHZhciBncm91cE9mZnNldCA9IHRoaXMuX2VsZW1lbnQub2Zmc2V0KCk7XG5cdHZhciBncm91cFRvcCA9IGdyb3VwT2Zmc2V0LnRvcDtcblx0dmFyIGdyb3VwSGVpZ2h0ID0gdGhpcy5fZWxlbWVudC5oZWlnaHQoKTtcblxuXHQvKiBjYWxjdWxhdGUgdGhlIG5ldyBwb3NpdGlvbiAqL1xuXHR2YXIgbmV3VG9wLCBuZXdMZWZ0O1xuXHRpZiAoZXZlbnQudHlwZSA9PT0gJ3Njcm9sbCcpIHtcblx0XHR2YXIgY29udGVudE9mZnNldCA9IHRoaXMuX2dyb3VwQ29udGVudC5vZmZzZXQoKTtcblx0XHRuZXdUb3AgPSBjb250ZW50T2Zmc2V0LnRvcCAtIGdyb3VwVG9wIC0gdGhpcy5fZHJhZ2dpbmdZT2Zmc2V0O1xuXHRcdG5ld0xlZnQgPSBjb250ZW50T2Zmc2V0LmxlZnQgLSBncm91cE9mZnNldC5sZWZ0O1xuXHR9IGVsc2Uge1xuXHRcdG5ld1RvcCA9IGV2ZW50LmNsaWVudFkgLSB0aGlzLl9kcmFnZ2luZ1k7XG5cdFx0bmV3TGVmdCA9IGV2ZW50LmNsaWVudFggLSB0aGlzLl9kcmFnZ2luZ1g7XG5cdH1cblxuXHQvKiBjYWxjdWxhdGUgdGhlIHNjcm9sbCBvZmZzZXQsIGlmIGFueSAqL1xuXHR0aGlzLl9kcmFnZ2luZ1lPZmZzZXQgKz0gdGhpcy5fZHJhZ2dpbmdHcm91cFRvcCAtIGdyb3VwVG9wO1xuXHR0aGlzLl9kcmFnZ2luZ0dyb3VwVG9wID0gZ3JvdXBUb3A7XG5cdG5ld1RvcCArPSB0aGlzLl9kcmFnZ2luZ1lPZmZzZXQ7XG5cblx0LyogY2FsY3VsYXRlIHRoZSBjb250ZW50IGRpbWVuc2lvbnMgKi9cblx0dmFyIGNvbnRlbnRUb3AgPSBncm91cFRvcCArIG5ld1RvcDtcblx0dmFyIGNvbnRlbnRNaWRkbGUgPSBjb250ZW50VG9wICsgKGdyb3VwSGVpZ2h0ICogMC41KTtcblxuXHQvKiByZXRyaWV2ZSBhbGwgdGhlIGdyb3VwcyAqL1xuXHR2YXIgZ3JvdXBzID0gdGhpcy5fd2lkZ2V0Ll9ncm91cHM7XG5cblx0LyogaXRlcmF0ZSB0aHJvdWdoIHRoZSBncm91cHMgKi9cblx0Zm9yICh2YXIgaSA9IDAsIG4gPSBncm91cHMubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG5cdFx0dmFyIGdyb3VwID0gZ3JvdXBzW2ldO1xuXHRcdC8qIGdldCB0aGUgdGFyZ2V0IGdyb3VwIG1lYXN1cmVtZW50cyAqL1xuXHRcdHZhciB0YXJnZXRIZWlnaHQgPSBncm91cC5fZWxlbWVudC5oZWlnaHQoKTtcblx0XHR2YXIgdGFyZ2V0VG9wID0gZ3JvdXAuX2VsZW1lbnQub2Zmc2V0KCkudG9wO1xuXHRcdHZhciB0YXJnZXRCb3R0b20gPSB0YXJnZXRUb3AgKyB0YXJnZXRIZWlnaHQ7XG5cdFx0dmFyIHRhcmdldEFyZWFUaHJlc2hvbGQgPSBNYXRoLm1pbih0YXJnZXRIZWlnaHQsIGdyb3VwSGVpZ2h0KSAqIDAuNTtcblxuXHRcdGlmICgoZ3JvdXBUb3AgPiB0YXJnZXRUb3AgJiYgY29udGVudE1pZGRsZSA+PSB0YXJnZXRUb3AgLSB0YXJnZXRBcmVhVGhyZXNob2xkICYmIGNvbnRlbnRNaWRkbGUgPD0gdGFyZ2V0VG9wICsgdGFyZ2V0QXJlYVRocmVzaG9sZCkgfHxcblx0XHRcdChncm91cFRvcCA8IHRhcmdldFRvcCAmJiBjb250ZW50TWlkZGxlID49IHRhcmdldEJvdHRvbSAtIHRhcmdldEFyZWFUaHJlc2hvbGQgJiYgY29udGVudE1pZGRsZSA8PSB0YXJnZXRCb3R0b20gKyB0YXJnZXRBcmVhVGhyZXNob2xkKSl7XG5cdFx0XHRpZiAoZ3JvdXAgIT09IHRoaXMpIHtcblx0XHRcdFx0dmFyIHRhcmdldE9mZnNldCA9IDA7XG5cdFx0XHRcdGlmICh0YXJnZXRUb3AgPCBncm91cFRvcCkge1xuXHRcdFx0XHRcdGdyb3VwLl9lbGVtZW50LmJlZm9yZSh0aGlzLl9lbGVtZW50KTtcblx0XHRcdFx0XHR0YXJnZXRPZmZzZXQgPSAodGFyZ2V0VG9wIC0gZ3JvdXBUb3ApO1xuXHRcdFx0XHRcdHRoaXMuX2RyYWdnaW5nWSArPSB0YXJnZXRPZmZzZXQ7XG5cdFx0XHRcdFx0bmV3VG9wIC09IHRhcmdldE9mZnNldDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRncm91cC5fZWxlbWVudC5hZnRlcih0aGlzLl9lbGVtZW50KTtcblx0XHRcdFx0XHR0YXJnZXRPZmZzZXQgPSAodGFyZ2V0VG9wIC0gZ3JvdXBUb3ApIC0gKGdyb3VwSGVpZ2h0IC0gdGFyZ2V0SGVpZ2h0KTtcblx0XHRcdFx0XHR0aGlzLl9kcmFnZ2luZ1kgKz0gdGFyZ2V0T2Zmc2V0O1xuXHRcdFx0XHRcdG5ld1RvcCAtPSB0YXJnZXRPZmZzZXQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fZHJhZ2dpbmdHcm91cFRvcCA9IHRoaXMuX2VsZW1lbnQub2Zmc2V0KCkudG9wO1xuXG5cdFx0XHRcdC8qIHVwZGF0ZSB0aGUgZ3JvdXAgaW5kaWNlcyAqL1xuXHRcdFx0XHR0aGlzLl93aWRnZXQudXBkYXRlR3JvdXBJbmRpY2VzKCk7XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHQvKiBhcHBseSB0aGUgbmV3IHBvc2l0aW9uICovXG5cdHRoaXMuX2dyb3VwQ29udGVudC5jc3Moe1xuXHRcdHRvcDogbmV3VG9wLFxuXHRcdGxlZnQ6IG5ld0xlZnRcblx0fSk7XG5cblx0LyogdHJpZ2dlciB0aGUgZHJhZyBtb3ZlIGV2ZW50ICovXG5cdHRoaXMuZW1pdCgnZmFjZXQtZ3JvdXA6ZHJhZ2dpbmc6bW92ZScsIGV2ZW50LCB0aGlzLl9rZXkpO1xufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7R3JvdXB9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG5cbnZhciBfID0gcmVxdWlyZSgnLi4vdXRpbC91dGlsJyk7XG52YXIgSUJpbmRhYmxlID0gcmVxdWlyZSgnLi9JQmluZGFibGUnKTtcbnZhciBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9xdWVyeWdyb3VwJyk7XG52YXIgRmFjZXRWZXJ0aWNhbCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvZmFjZXQvZmFjZXRWZXJ0aWNhbCcpO1xudmFyIEZhY2V0SG9yaXpvbnRhbCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvZmFjZXQvZmFjZXRIb3Jpem9udGFsJyk7XG52YXIgR3JvdXAgPSByZXF1aXJlKCcuL2dyb3VwJyk7XG52YXIgQ29sb3IgPSByZXF1aXJlKCcuLi91dGlsL2NvbG9yJyk7XG5cbnZhciBERUZBVUxUX0NPTE9SID0gJyM4QUFEMjAnO1xudmFyIENPTE9SX1NURVAgPSAwLjI7XG5cbi8qKlxuICogU3BlY2lhbCBncm91cCBjbGFzcyB1c2VkIHRvIHJlcHJlc2VudCB0aGUgcXVlcmllcyBpbiB0aGUgZmFjZXRzIHdpZGdldC5cbiAqXG4gKiBAY2xhc3MgUXVlcnlHcm91cFxuICogQHBhcmFtIHtqcXVlcnl9IGNvbnRhaW5lciAtIFRoZSBjb250YWluZXIgd2hlcmUgdGhpcyBncm91cCB3aWxsIGJlIGFkZGVkLlxuICogQHBhcmFtIHtBcnJheX0gcXVlcmllcyAtIEFuIGFycmF5IHdpdGggdGhlIHF1ZXJpZXMgdG8gYmUgYWRkZWQgdG8gdGhpcyBncm91cC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBRdWVyeUdyb3VwKGNvbnRhaW5lciwgcXVlcmllcykge1xuXHQvKiBza2lwIGluaXRpYWxpemluZyB0aGUgYEdyb3VwYCAqL1xuXHRJQmluZGFibGUuY2FsbCh0aGlzKTtcblxuXHR0aGlzLl9lbGVtZW50ID0gJChUZW1wbGF0ZSgpKTtcblxuXHRjb250YWluZXIuYXBwZW5kKHRoaXMuX2VsZW1lbnQpO1xuXG5cdHRoaXMuX2ZhY2V0Q29udGFpbmVyID0gdGhpcy5fZWxlbWVudC5maW5kKCcuZ3JvdXAtZmFjZXQtY29udGFpbmVyJyk7XG5cblx0Ly8gSW5pdGlhbGl6ZSBxdWVyaWVzIGFuZCBmYWNldHNcblx0dGhpcy5fZmFjZXRzID0gW107XG5cdHRoaXMuX3F1ZXJpZXMgPSBbXTtcblx0dGhpcy5fdG90YWwgPSAwO1xuXHRpZiAocXVlcmllcyAmJiBxdWVyaWVzLmxlbmd0aCA+IDApIHtcblx0XHRxdWVyaWVzLmZvckVhY2goZnVuY3Rpb24gKHF1ZXJ5KSB7XG5cdFx0XHR0aGlzLmFkZFF1ZXJ5KHF1ZXJ5KTtcblx0XHR9LCB0aGlzKTtcblx0fVxuXG5cdHRoaXMuX3VwZGF0ZUZhY2V0VG90YWxzKCk7XG5cblx0aWYgKHRoaXMuX3F1ZXJpZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdH1cbn1cblxuLyoqXG4gKiBAaW5oZXJpdGFuY2Uge0dyb3VwfVxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoR3JvdXAucHJvdG90eXBlKTtcblF1ZXJ5R3JvdXAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUXVlcnlHcm91cDtcblxuLyoqXG4gKiBBIFF1ZXJ5R3JvdXAncyBrZXkgaXMgYWx3YXlzIGBxdWVyaWVzYFxuICpcbiAqIEBwcm9wZXJ0eSBrZXlcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKiBAcmVhZG9ubHlcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFF1ZXJ5R3JvdXAucHJvdG90eXBlLCAna2V5Jywge1xuXHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gXCJxdWVyaWVzXCI7XG5cdH1cbn0pO1xuXG4vKipcbiAqIE1ha2VzIHN1cmUgdGhhdCBhbGwgZmFjZXRzIGluIHRoaXMgZ3JvdXAgY2FuIGJlIHNlbGVjdGVkLlxuICpcbiAqIEBtZXRob2QgaW5pdGlhbGl6ZVNlbGVjdGlvblxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZS5pbml0aWFsaXplU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9mYWNldHMuZm9yRWFjaChmdW5jdGlvbiAoZmFjZXQpIHtcblx0XHQvLyB0ZW1wb3JhcnkgZXhjZXB0aW9uIHVudGlsIGNhbGxlcnMgYXJlIGFibGUgdG8gY2FsY3VsYXRlZCBzZWxlY3RlZCBjb3VudHMgb24gc2ltcGxlIHF1ZXJpZXNcblx0XHRpZiAoZmFjZXQua2V5ICE9PSAnKicpIHtcblx0XHRcdGZhY2V0LnNlbGVjdCgwKTtcblx0XHR9XG5cdH0pO1xufTtcblxuLyoqXG4gKiBEZXNlbGVjdHMgYWxsIGZhY2V0cyBpbiB0aGlzIGdyb3VwLlxuICpcbiAqIEBtZXRob2QgY2xlYXJTZWxlY3Rpb25cbiAqL1xuUXVlcnlHcm91cC5wcm90b3R5cGUuY2xlYXJTZWxlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2ZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChmYWNldCkge1xuXHRcdGZhY2V0LmRlc2VsZWN0KCk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBVbmhpZ2hsaWdodHMgYWxsIHRoZSBxdWVyaWVzIGluIHRoaXMgZ3JvdXAuXG4gKlxuICogQG1ldGhvZCB1bmhpZ2hsaWdodEFsbFxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZS51bmhpZ2hsaWdodEFsbCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fZmFjZXRzLmZvckVhY2goZnVuY3Rpb24oZmFjZXQpIHtcblx0XHRmYWNldC5oaWdobGlnaHRlZCA9IGZhbHNlO1xuXHR9LCB0aGlzKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIHF1ZXJ5IHRvIHRoaXMgZ3JvdXAuXG4gKlxuICogQG1ldGhvZCBhZGRRdWVyeVxuICogQHBhcmFtIHtPYmplY3R9IHF1ZXJ5IC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIHF1ZXJ5IHRvIGJlIGFkZGVkLlxuICogQHBhcmFtIHtib29sZWFuPX0gdXBkYXRlRmFjZXRUb3RhbHMgLSBTaG91bGQgdGhlIGZhY2V0IHRvdGFscyBiZSB1cGRhdGVkIG9uY2UgdGhlIHF1ZXJ5IGhhcyBiZWVuIGFkZGVkIHRvIHRoZSBncm91cC5cbiAqL1xuUXVlcnlHcm91cC5wcm90b3R5cGUuYWRkUXVlcnkgPSBmdW5jdGlvbiAocXVlcnksIHVwZGF0ZUZhY2V0VG90YWxzKSB7XG5cdHRoaXMuX3F1ZXJpZXMucHVzaChxdWVyeSk7XG5cdHRoaXMuX3RvdGFsICs9IHF1ZXJ5LmNvdW50O1xuXG5cdGlmICghcXVlcnkuaWNvbikge1xuXHRcdHF1ZXJ5Lmljb24gPSB0aGlzLl9nZW5lcmF0ZUljb24oKTtcblx0fVxuXHRpZiAoIXF1ZXJ5Lmljb24uY29sb3IpIHtcblx0XHRxdWVyeS5pY29uLmNvbG9yID0gdGhpcy5fZ2VuZXJhdGVDb2xvcigpO1xuXHR9XG5cdHF1ZXJ5LmhpZGRlbiA9IHRydWU7XG5cblx0Ly8gc3BlY2lmeSB0aGF0IHRoaXMgaXMgYSBxdWVyeSBmb3IgZGlzcGxheVxuXHRxdWVyeS5pc1F1ZXJ5ID0gdHJ1ZTtcblxuXHR2YXIgRmFjZXRDbGFzcyA9ICgnaGlzdG9ncmFtJyBpbiBxdWVyeSkgPyBGYWNldEhvcml6b250YWwgOiBGYWNldFZlcnRpY2FsO1xuXHR2YXIgZmFjZXQgPSBuZXcgRmFjZXRDbGFzcyh0aGlzLl9mYWNldENvbnRhaW5lciwgdGhpcywgcXVlcnkpO1xuXHR0aGlzLl9mYWNldHMucHVzaChmYWNldCk7XG5cdGZhY2V0LnZpc2libGUgPSB0cnVlO1xuXHQvKiBmb3J3YXJkIGFsbCB0aGUgZXZlbnRzIGZyb20gdGhpcyBmYWNldCAqL1xuXHR0aGlzLmZvcndhcmQoZmFjZXQpO1xuXG5cdGlmICh1cGRhdGVGYWNldFRvdGFscykge1xuXHRcdHRoaXMuX3VwZGF0ZUZhY2V0VG90YWxzKCk7XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHF1ZXJ5IGZyb20gdGhpcyBncm91cC5cbiAqXG4gKiBAcGFyYW0geyp9IGtleSAtIFRoZSBrZXkgb2YgdGhlIHF1ZXJ5IHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IHVwZGF0ZUZhY2V0VG90YWxzIC0gU2hvdWxkIHRoZSBmYWNldCB0b3RhbHMgYmUgdXBkYXRlZCBvbmNlIHRoZSBxdWVyeSBoYXMgYmVlbiBhZGRlZCB0byB0aGUgZ3JvdXAuXG4gKi9cblF1ZXJ5R3JvdXAucHJvdG90eXBlLnJlbW92ZVF1ZXJ5ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUsIHVwZGF0ZUZhY2V0VG90YWxzKSB7XG5cdHZhciBmYWNldCA9IHRoaXMuX2dldFF1ZXJ5KGtleSwgdmFsdWUpO1xuXHRpZiAoZmFjZXQpIHtcblx0XHR2YXIgcXVlcnkgPSBmYWNldC5fc3BlYztcblx0XHR2YXIgcXVlcnlJbmRleCA9IHRoaXMuX3F1ZXJpZXMuaW5kZXhPZihxdWVyeSk7XG5cdFx0dmFyIGZhY2V0SW5kZXggPSB0aGlzLl9mYWNldHMoZmFjZXQpO1xuXHRcdGlmIChxdWVyeUluZGV4ID49IDAgJiYgZmFjZXRJbmRleCA+PSAwKSB7XG5cdFx0XHR0aGlzLl9xdWVyaWVzLnNwbGljZShxdWVyeUluZGV4LCAxKTtcblx0XHRcdHRoaXMuX2ZhY2V0cy5zcGxpY2UoZmFjZXRJbmRleCwgMSk7XG5cdFx0XHQvKiBkZXN0cm95aW5nIGEgZmFjZXQgYXV0b21hdGljYWxseSB1bmZvcndhcmRzIGl0cyBldmVudHMgKi9cblx0XHRcdGZhY2V0LmRlc3Ryb3kodHJ1ZSk7XG5cblx0XHRcdHRoaXMuX3RvdGFsIC09IHF1ZXJ5LmNvdW50O1xuXHRcdFx0aWYgKHVwZGF0ZUZhY2V0VG90YWxzKSB7XG5cdFx0XHRcdHRoaXMuX3VwZGF0ZUZhY2V0VG90YWxzKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIFNldHMgdGhpcyBncm91cCB0byBiZSBnYXJiYWdlIGNvbGxlY3RlZCBieSByZW1vdmluZyBhbGwgcmVmZXJlbmNlcyB0byBldmVudCBoYW5kbGVycyBhbmQgRE9NIGVsZW1lbnRzLlxuICogQ2FsbHMgYGRlc3Ryb3lgIG9uIGl0cyBmYWNldHMuXG4gKlxuICogQG1ldGhvZCBkZXN0cm95XG4gKi9cblF1ZXJ5R3JvdXAucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2ZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XG5cdFx0LyogZGVzdHJveWluZyBhIGZhY2V0IGF1dG9tYXRpY2FsbHkgdW5mb3J3YXJkcyBpdHMgZXZlbnRzICovXG5cdFx0Zi5kZXN0cm95KCk7XG5cdH0pO1xuXHR0aGlzLl9mYWNldHMgPSBbXTtcblx0dGhpcy5fcXVlcmllcyA9IFtdO1xuXHR0aGlzLl9lbGVtZW50LnJlbW92ZSgpO1xuXHRJQmluZGFibGUucHJvdG90eXBlLmRlc3Ryb3kuY2FsbCh0aGlzKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgdG90YWwgaW4gYWxsIHRoZSBmYWNldHMgY29udGFpbmVkIGluIHRoaXMgZ3JvdXAuXG4gKlxuICogQG1ldGhvZCBfdXBkYXRlRmFjZXRUb3RhbHNcbiAqIEBwcml2YXRlXG4gKi9cblF1ZXJ5R3JvdXAucHJvdG90eXBlLl91cGRhdGVGYWNldFRvdGFscyA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fZmFjZXRzLmZvckVhY2goZnVuY3Rpb24gKGZhY2V0KSB7XG5cdFx0ZmFjZXQudG90YWwgPSB0aGlzLl90b3RhbDtcblx0fSwgdGhpcyk7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIGZhY2V0IHJlcHJlc2VudGluZyB0aGUgcXVlcnkgd2l0aCB0aGUgc3BlY2lmaWVkIGtleSBhbmQgdmFsdWUuXG4gKiBOb3RlOiBRdWVyeUdyb3VwIHVzZXMgRmFjZXQgaW50ZXJuYWxseSB0byByZXByZXNlbnQgZWFjaCBxdWVyeS5cbiAqXG4gKiBAbWV0aG9kIF9nZXRRdWVyeVxuICogQHBhcmFtIHsqfSBrZXkgLSBUaGUga2V5IHRvIGxvb2sgZm9yLlxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBsb29rIGZvci5cbiAqIEByZXR1cm5zIHtGYWNldHxudWxsfVxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZS5fZ2V0UXVlcnkgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuXHR2YXIgZmFjZXRPYmogPSB0aGlzLl9mYWNldHMuZmlsdGVyKGZ1bmN0aW9uIChmKSB7XG5cdFx0cmV0dXJuIGYua2V5ID09PSBrZXkgJiYgZi52YWx1ZSA9PT0gdmFsdWU7XG5cdH0pO1xuXHRpZiAoZmFjZXRPYmogJiYgZmFjZXRPYmoubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBmYWNldE9ialswXTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYW4gaWNvbiBhbmQgY29sb3IgYmFzZWQgb24gdGhpcyBncm91cCdzIGN1cnJlbnQgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBfZ2VuZXJhdGVJY29uXG4gKiBAcmV0dXJucyB7e2NsYXNzOiBzdHJpbmcsIGNvbG9yfX1cbiAqIEBwcml2YXRlXG4gKi9cblF1ZXJ5R3JvdXAucHJvdG90eXBlLl9nZW5lcmF0ZUljb24gPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB7XG5cdFx0Y2xhc3M6ICdmYSBmYS1zZWFyY2gnLCAgICAgICAgICAvLyBUT0RPOiBSZW1vdmUgZm9udC1hd2Vzb21lIGRlcGVuZGVuY3lcblx0XHRjb2xvcjogdGhpcy5fZ2VuZXJhdGVDb2xvcigpXG5cdH07XG59O1xuXG4vKipcbiAqIEdlbnJhdGVzIGEgY29sb3IgYW5kIHJldHVybnMgaXQgYXMgYSBoZXggc3RyaW5nLlxuICpcbiAqIEBtZXRob2QgX2dlbmVyYXRlQ29sb3JcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKiBAcHJpdmF0ZVxuICovXG5RdWVyeUdyb3VwLnByb3RvdHlwZS5fZ2VuZXJhdGVDb2xvciA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHN0YXJ0Q29sb3IgPSB0aGlzLl9mYWNldHMubGVuZ3RoID4gMCA/IG5ldyBDb2xvcigpLmhleCh0aGlzLl9mYWNldHNbMF0uaWNvbi5jb2xvcikgOiBuZXcgQ29sb3IoKS5oZXgoREVGQVVMVF9DT0xPUik7XG5cdHZhciBwb3NpdGlvbiA9IHRoaXMuX2ZhY2V0cy5sZW5ndGg7XG5cdHZhciBpY29uQ29sb3IgPSBzdGFydENvbG9yLnNoYWRlKHBvc2l0aW9uICogQ09MT1JfU1RFUCk7XG5cdHJldHVybiBpY29uQ29sb3IuaGV4KCk7XG59O1xuXG4vKipcbiAqIEBleHBvcnRcbiAqIEB0eXBlIHtRdWVyeUdyb3VwfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IFF1ZXJ5R3JvdXA7XG4iLCIvKlxuICogKlxuICogIENvcHlyaWdodCDCqSAyMDE1IFVuY2hhcnRlZCBTb2Z0d2FyZSBJbmMuXG4gKlxuICogIFByb3BlcnR5IG9mIFVuY2hhcnRlZOKEoiwgZm9ybWVybHkgT2N1bHVzIEluZm8gSW5jLlxuICogIGh0dHA6Ly91bmNoYXJ0ZWQuc29mdHdhcmUvXG4gKlxuICogIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqXG4gKiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqICB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiAgdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXNcbiAqICBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbiAqICBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqICBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqICBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqICBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiAgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqICBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogIFNPRlRXQVJFLlxuICogL1xuICovXG5cbnZhciBIYW5kbGViYXJzID0gcmVxdWlyZSgnaGFuZGxlYmFycycpO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpZkNvbmQnLCBmdW5jdGlvbiAodjEsIG9wZXJhdG9yLCB2Miwgb3B0aW9ucykge1xuXG4gICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICBjYXNlICc9PSc6XG4gICAgICAgICAgICByZXR1cm4gKHYxID09IHYyKSA/IG9wdGlvbnMuZm4odGhpcykgOiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgICAgIGNhc2UgJz09PSc6XG4gICAgICAgICAgICByZXR1cm4gKHYxID09PSB2MikgPyBvcHRpb25zLmZuKHRoaXMpIDogb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgICBjYXNlICc8JzpcbiAgICAgICAgICAgIHJldHVybiAodjEgPCB2MikgPyBvcHRpb25zLmZuKHRoaXMpIDogb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgICBjYXNlICc8PSc6XG4gICAgICAgICAgICByZXR1cm4gKHYxIDw9IHYyKSA/IG9wdGlvbnMuZm4odGhpcykgOiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgICAgIGNhc2UgJz4nOlxuICAgICAgICAgICAgcmV0dXJuICh2MSA+IHYyKSA/IG9wdGlvbnMuZm4odGhpcykgOiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgICAgIGNhc2UgJz49JzpcbiAgICAgICAgICAgIHJldHVybiAodjEgPj0gdjIpID8gb3B0aW9ucy5mbih0aGlzKSA6IG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICAgICAgY2FzZSAnJiYnOlxuICAgICAgICAgICAgcmV0dXJuICh2MSAmJiB2MikgPyBvcHRpb25zLmZuKHRoaXMpIDogb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgICBjYXNlICd8fCc6XG4gICAgICAgICAgICByZXR1cm4gKHYxIHx8IHYyKSA/IG9wdGlvbnMuZm4odGhpcykgOiBvcHRpb25zLmludmVyc2UodGhpcyk7XG5cdFx0Y2FzZSAnaW5zdGFuY2VvZic6XG5cdFx0XHRpZiAodHlwZW9mIHYyID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRpZiAodHlwZW9mKHYxKSA9PT0gdjIgfHwgKHdpbmRvd1t2Ml0gJiYgdjEgaW5zdGFuY2VvZiB3aW5kb3dbdjJdKSkge1xuXHRcdFx0XHRcdHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKHYyID09PSBPYmplY3QodjIpICYmIHYxIGluc3RhbmNlb2YgdjIpIHtcblx0XHRcdFx0cmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbWF0aCcsZnVuY3Rpb24odjEsb3BlcmF0b3IsdjIpIHtcbiAgICBpZiAodjEgPT09IG51bGwgfHwgdjEgPT09IHVuZGVmaW5lZCB8fCB2MiA9PT0gbnVsbCB8fCB2MiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgY2FzZSAnKyc6XG4gICAgICAgICAgICByZXR1cm4gKHYxICsgdjIpO1xuICAgICAgICBjYXNlICctJzpcbiAgICAgICAgICAgIHJldHVybiAodjEgLSB2Mik7XG4gICAgICAgIGNhc2UgJyonOlxuICAgICAgICAgICAgcmV0dXJuICh2MSAqIHYyKTtcbiAgICAgICAgY2FzZSAnLyc6XG4gICAgICAgICAgICBpZiAodjIgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAodjEgLyB2Mik7XG4gICAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3BlcmNlbnRhZ2UnLGZ1bmN0aW9uKHYxLHYyKSB7XG4gICAgaWYgKHYxID09PSBudWxsIHx8IHYxID09PSB1bmRlZmluZWQgfHwgdjIgPT09IG51bGwgfHwgdjIgPT09IHVuZGVmaW5lZCB8fCB2MiA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIHYxIC8gdjIgKiAxMDAuMDtcbn0pO1xuXG4kLmZuLmVudGVyS2V5ID0gZnVuY3Rpb24gKGZuYywgbW9kKSB7XG4gICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQodGhpcykua2V5dXAoZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIga2V5Y29kZSA9IChldi5rZXlDb2RlID8gZXYua2V5Q29kZSA6IGV2LndoaWNoKTtcbiAgICAgICAgICAgIGlmICgoa2V5Y29kZSA9PSAnMTMnIHx8IGtleWNvZGUgPT0gJzEwJykgJiYgKCFtb2QgfHwgZXZbbW9kICsgJ0tleSddKSkge1xuICAgICAgICAgICAgICAgIGZuYy5jYWxsKHRoaXMsIGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuIiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG5yZXF1aXJlKCcuL2hlbHBlcnMnKTtcbnZhciBfID0gcmVxdWlyZSgnLi91dGlsL3V0aWwnKTtcblxudmFyIElCaW5kYWJsZSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9JQmluZGFibGUnKTtcbnZhciBHcm91cCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9ncm91cCcpO1xudmFyIFF1ZXJ5R3JvdXAgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcXVlcnlncm91cCcpO1xudmFyIFRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZXMvbWFpbicpO1xuXG4vKipcbiAqIE1haW4gZmFjZXRzIGNsYXNzLCB0aGlzIGNsYXNzIGRlZmluZXMgdGhlIG1haW4gaW50ZXJmYWNlIGJldHdlZW4gdGhlIGFwcCBhbmQgRmFjZXRzLlxuICpcbiAqIEBjbGFzcyBGYWNldHNcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8alF1ZXJ5fSBjb250YWluZXIgLSBUaGUgZWxlbWVudCB3aGVyZSB0aGUgZmFjZXRzIHNob3VsZCBiZSByZW5kZXJlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBncm91cHMgLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZ3JvdXBzIG9mIGZhY2V0cyB0byBiZSBjcmVhdGVkLlxuICogQHBhcmFtIHtPYmplY3Q9fSBxdWVyaWVzIC0gT3B0aW9uYWwgb2JqZWN0IGRlc2NyaWJpbmcgdGhlIHF1ZXJpZXMgdGhhdCBzaG91bGQgYmUgY3JlYXRlZCBhbG9uZyB3aXRoIHRoZSBmYWNldHMuXG4gKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgLSBPcHRpb25hbCBvYmplY3Qgd2l0aCBjb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoaXMgZmFjZXRzIGluc3RhbmNlLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZhY2V0cyhjb250YWluZXIsIGdyb3VwcywgcXVlcmllcywgb3B0aW9ucykge1xuICAgIElCaW5kYWJsZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX29wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuX2NvbnRhaW5lciA9ICQoVGVtcGxhdGUoKSk7XG4gICAgdGhpcy5fY29udGFpbmVyLmFwcGVuZFRvKGNvbnRhaW5lcik7XG4gICAgdGhpcy5faW5pdChncm91cHMsIHF1ZXJpZXMpO1xufVxuXG4vKipcbiAqIEBpbmhlcml0YW5jZSB7SUJpbmRhYmxlfVxuICovXG5GYWNldHMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJQmluZGFibGUucHJvdG90eXBlKTtcbkZhY2V0cy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGYWNldHM7XG5cbi8qKlxuICogU2VsZWN0cyB0aGUgZ2l2ZW4gZmFjZXRzLlxuICpcbiAqIEBtZXRob2Qgc2VsZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gc3ViZ3JvdXBzIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGZhY2V0cywgYW5kIGluIHdoaWNoIGdyb3VwLCB0byBiZSBzZWxlY3RlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGlzUXVlcnkgLSBPcHRpb25hbCBwYXJhbWV0ZXIgdG8gZGVmaW5lIGlmIHRoZSBzdWJncm91cCBpcyBhIHF1ZXJ5LCBpZiBub3Qgc3BlY2lmaWVkIHRoZSBtZXRob2Qgd2lsbCB0cnkgdG8gYXV0by1kZXRlY3QgdGhlIGdyb3VwJ3MgdHlwZS5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbihzdWJncm91cHMsIGlzUXVlcnkpIHtcblx0dmFyIGdyb3Vwc0luaXRpYWxpemVkID0gZmFsc2U7XG5cdHZhciBxdWVyaWVzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuXHRzdWJncm91cHMuZm9yRWFjaChmdW5jdGlvbihncm91cFNwZWMpIHtcblx0XHR2YXIgZ3JvdXAgPSB0aGlzLl9nZXRHcm91cChncm91cFNwZWMua2V5KTtcblx0XHRpZiAoIWlzUXVlcnkgJiYgZ3JvdXApIHtcblx0XHRcdGlmICghZ3JvdXBzSW5pdGlhbGl6ZWQpIHtcblx0XHRcdFx0Ly8gSW5pdGlhbGl6ZSBzZWxlY3Rpb24gc3RhdGVcblx0XHRcdFx0dGhpcy5fZ3JvdXBzLmZvckVhY2goZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0XHRncm91cC5pbml0aWFsaXplU2VsZWN0aW9uKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRncm91cHNJbml0aWFsaXplZCA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNlbGVjdCBlYWNoIGNvbnRhaW5pbmluZyBmYWNldFxuXHRcdFx0Z3JvdXBTcGVjLmZhY2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGZhY2V0U3BlYykge1xuXHRcdFx0XHR2YXIgZmFjZXQgPSBncm91cC5fZ2V0RmFjZXQoZmFjZXRTcGVjLnZhbHVlKTtcblx0XHRcdFx0aWYgKGZhY2V0KSB7XG5cdFx0XHRcdFx0ZmFjZXQuc2VsZWN0KGZhY2V0U3BlYy5zZWxlY3RlZCB8fCBmYWNldFNwZWMsIHsgY291bnRMYWJlbDogZmFjZXRTcGVjLmNvdW50TGFiZWwgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0uYmluZCh0aGlzKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGdyb3VwU3BlYy5mYWNldHMuZm9yRWFjaChmdW5jdGlvbihmYWNldFNwZWMpIHtcblx0XHRcdFx0dmFyIHF1ZXJ5ID0gdGhpcy5fZ2V0UXVlcnkoZ3JvdXBTcGVjLmtleSwgZmFjZXRTcGVjLnZhbHVlKTtcblx0XHRcdFx0aWYgKHF1ZXJ5KSB7XG5cdFx0XHRcdFx0aWYgKCFxdWVyaWVzSW5pdGlhbGl6ZWQpIHtcblx0XHRcdFx0XHRcdC8vIEluaXRpYWxpemUgc2VsZWN0aW9uIHN0YXRlXG5cdFx0XHRcdFx0XHR0aGlzLl9xdWVyeUdyb3VwLmluaXRpYWxpemVTZWxlY3Rpb24oKTtcblx0XHRcdFx0XHRcdHF1ZXJpZXNJbml0aWFsaXplZCA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHF1ZXJ5LnNlbGVjdChmYWNldFNwZWMuc2VsZWN0ZWQsIHsgY291bnRMYWJlbDogZmFjZXRTcGVjLmNvdW50TGFiZWwgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0uYmluZCh0aGlzKSk7XG5cdFx0fVxuXHR9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBEZXNlbGVjdHMgYWxsIHF1ZXJpZXMgYW5kIHRoZSBzcGVjaWZpZWQsIHByZXZpb3VzbHkgc2VsZWN0ZWQgZmFjZXRzLlxuICpcbiAqIEBtZXRob2QgZGVzZWxlY3RcbiAqIEBwYXJhbSB7QXJyYXk9fSBzaW1wbGVHcm91cHMgLSBcdEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGdyb3VwIGtleXMgYW5kIGZhY2V0IHZhbHVlcyB0byBiZSBkZXNlbGVjdGVkLlxuICogXHRcdFx0XHRcdFx0XHRcdFx0SWYgYSBncm91cCBoYXMgYSBrZXkgYnV0IG5vdCBhIHZhbHVlLCBhbGwgZmFjZXRzIGluIHRoZSBncm91cCB3aWxsIGJlIGRlc2VsZWN0ZWQuXG4gKiBcdFx0XHRcdFx0XHRcdFx0XHRJZiB0aGlzIHBhcmFtZXRlciBpcyBvbWl0dGVkIGFsbCBncm91cHMgYW5kIGZhY2V0cyB3aWxsIGJlIGRlc2VsZWN0ZWQuXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuZGVzZWxlY3QgPSBmdW5jdGlvbihzaW1wbGVHcm91cHMpIHtcblx0aWYgKCFzaW1wbGVHcm91cHMpIHtcblx0XHR0aGlzLl9ncm91cHMuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXApIHtcblx0XHRcdGdyb3VwLmNsZWFyU2VsZWN0aW9uKCk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0c2ltcGxlR3JvdXBzLmZvckVhY2goZnVuY3Rpb24oc2ltcGxlR3JvdXApIHtcblx0XHRcdHZhciBncm91cCA9IHRoaXMuX2dldEdyb3VwKHNpbXBsZUdyb3VwLmtleSk7XG5cdFx0XHRpZiAoZ3JvdXApIHtcblx0XHRcdFx0aWYgKCd2YWx1ZScgaW4gc2ltcGxlR3JvdXApIHtcblx0XHRcdFx0XHR2YXIgZmFjZXQgPSBncm91cC5fZ2V0RmFjZXQoc2ltcGxlR3JvdXAudmFsdWUpO1xuXHRcdFx0XHRcdGlmIChmYWNldCkge1xuXHRcdFx0XHRcdFx0ZmFjZXQuZGVzZWxlY3QoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Z3JvdXAuY2xlYXJTZWxlY3Rpb24oKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0uYmluZCh0aGlzKSk7XG5cdH1cblx0dGhpcy5fcXVlcnlHcm91cC5jbGVhclNlbGVjdGlvbigpO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlcyBhbGwgdGhlIGZhY2V0cyB3aXRoIG5ldyBncm91cHMgYW5kIHF1ZXJpZXMgY3JlYXRlZCB1c2luZyB0aGUgcHJvdmlkZWQgaW5mb3JtYXRpb24uXG4gKlxuICogQG1ldGhvZCByZXBsYWNlXG4gKiBAcGFyYW0ge09iamVjdH0gZ3JvdXBzIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGdyb3VwcyBvZiBmYWNldHMgdG8gYmUgY3JlYXRlZC5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcXVlcmllcyAtIE9wdGlvbmFsIG9iamVjdCBkZXNjcmliaW5nIHRoZSBxdWVyaWVzIHRoYXQgc2hvdWxkIGJlIGNyZWF0ZWQgYWxvbmcgd2l0aCB0aGUgZmFjZXRzLlxuICovXG5GYWNldHMucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbihncm91cHMsIHF1ZXJpZXMpIHtcblx0dGhpcy5fZGVzdHJveUNvbnRlbnRzKCk7XG5cdHRoaXMuX2luaXQoZ3JvdXBzLCBxdWVyaWVzKTtcbn07XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIHNwZWNpZmllZCBncm91cCB3aXRoIHRoZSBuZXcgZGF0YS5cbiAqXG4gKiBAbWV0aG9kIHJlcGxhY2VHcm91cFxuICogQHBhcmFtIHtPYmplY3R9IGdyb3VwIC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGluZm9ybWF0aW9uIG9mIHRoZSBuZXcgZ3JvdXAuXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUucmVwbGFjZUdyb3VwID0gZnVuY3Rpb24oZ3JvdXApIHtcblx0dmFyIGV4aXN0aW5nR3JvdXAgPSB0aGlzLl9nZXRHcm91cChncm91cC5rZXkpO1xuXHRpZiAoZXhpc3RpbmdHcm91cCkge1xuXHRcdGV4aXN0aW5nR3JvdXAucmVwbGFjZShncm91cCk7XG5cdFx0dGhpcy5fYmluZENsaWVudEV2ZW50cygpO1xuXHR9XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHNwZWNpZmllZCBmYWNldHMgdG8gdGhlaXIgaGlnaGxpZ2h0ZWQgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBoaWdobGlnaHRcbiAqIEBwYXJhbSB7QXJyYXl9IHNpbXBsZUdyb3VwcyAtIEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGdyb3VwIGtleXMgYW5kIGZhY2V0IHZhbHVlcyB0byBiZSBoaWdobGlnaHRlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGlzUXVlcnkgLSBPcHRpb25hbCBwYXJhbWV0ZXIgdG8gZGVmaW5lIGlmIHRoZSBzdWJncm91cCBpcyBhIHF1ZXJ5LCBpZiBub3Qgc3BlY2lmaWVkIHRoZSBtZXRob2Qgd2lsbCB0cnkgdG8gYXV0by1kZXRlY3QgdGhlIGdyb3VwJ3MgdHlwZS5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzaW1wbGVHcm91cHMsIGlzUXVlcnkpIHtcblx0c2ltcGxlR3JvdXBzLmZvckVhY2goZnVuY3Rpb24oc2ltcGxlR3JvdXApIHtcblx0XHR2YXIgZ3JvdXAgPSB0aGlzLl9nZXRHcm91cChzaW1wbGVHcm91cC5rZXkpO1xuXHRcdGlmICghaXNRdWVyeSAmJiBncm91cCkge1xuXHRcdFx0Z3JvdXAuaGlnaGxpZ2h0KHNpbXBsZUdyb3VwLnZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIHF1ZXJ5ID0gdGhpcy5fZ2V0UXVlcnkoc2ltcGxlR3JvdXAua2V5LCBzaW1wbGVHcm91cC52YWx1ZSk7XG5cdFx0XHRpZiAocXVlcnkpIHtcblx0XHRcdFx0cXVlcnkuaGlnaGxpZ2h0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHNwZWNpZmllZCBmYWNldHMgdG8gdGhlaXIgbm90LWhpZ2hsaWdodGVkIHN0YXRlLlxuICpcbiAqIEBtZXRob2QgdW5oaWdobGlnaHRcbiAqIEBwYXJhbSB7QXJyYXl9IHNpbXBsZUdyb3VwcyAtIEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGdyb3VwIGtleXMgYW5kIGZhY2V0IHZhbHVlcyB0byBiZSB1bi1oaWdobGlnaHRlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGlzUXVlcnkgLSBPcHRpb25hbCBwYXJhbWV0ZXIgdG8gZGVmaW5lIGlmIHRoZSBzdWJncm91cCBpcyBhIHF1ZXJ5LCBpZiBub3Qgc3BlY2lmaWVkIHRoZSBtZXRob2Qgd2lsbCB0cnkgdG8gYXV0by1kZXRlY3QgdGhlIGdyb3VwJ3MgdHlwZS5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS51bmhpZ2hsaWdodCA9IGZ1bmN0aW9uKHNpbXBsZUdyb3VwcywgaXNRdWVyeSkge1xuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRzaW1wbGVHcm91cHMuZm9yRWFjaChmdW5jdGlvbihzaW1wbGVHcm91cCkge1xuXHRcdFx0dmFyIGdyb3VwID0gdGhpcy5fZ2V0R3JvdXAoc2ltcGxlR3JvdXAua2V5KTtcblx0XHRcdGlmICghaXNRdWVyeSAmJiBncm91cCkge1xuXHRcdFx0XHRncm91cC51bmhpZ2hsaWdodChzaW1wbGVHcm91cC52YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgcXVlcnkgPSB0aGlzLl9nZXRRdWVyeShzaW1wbGVHcm91cC5rZXksIHNpbXBsZUdyb3VwLnZhbHVlKTtcblx0XHRcdFx0aWYgKHF1ZXJ5KSB7XG5cdFx0XHRcdFx0cXVlcnkuaGlnaGxpZ2h0ZWQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sIHRoaXMpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3VuaGlnaGxpZ2h0QWxsKCk7XG5cdH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgc3BlY2lmaWMgZmFjZXRzIGlzIGluIGl0cyBoaWdobGlnaHRlZCBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kIGlzSGlnaGxpZ2h0ZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBzaW1wbGVHcm91cCAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBncm91cCBhbmQgZmFjZXQgdG8gY2hlY2sgZm9yIGEgaGlnaGxpZ2h0ZWQgc3RhdGUuXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBpc1F1ZXJ5IC0gT3B0aW9uYWwgcGFyYW1ldGVyIHRvIGRlZmluZSBpZiB0aGUgc3ViZ3JvdXAgaXMgYSBxdWVyeSwgaWYgbm90IHNwZWNpZmllZCB0aGUgbWV0aG9kIHdpbGwgdHJ5IHRvIGF1dG8tZGV0ZWN0IHRoZSBncm91cCdzIHR5cGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5pc0hpZ2hsaWdodGVkID0gZnVuY3Rpb24oc2ltcGxlR3JvdXAsIGlzUXVlcnkpIHtcblx0dmFyIGdyb3VwID0gdGhpcy5fZ2V0R3JvdXAoc2ltcGxlR3JvdXAua2V5KTtcblx0aWYgKCFpc1F1ZXJ5ICYmIGdyb3VwKSB7XG5cdFx0cmV0dXJuIGdyb3VwLmlzSGlnaGxpZ2h0ZWQoc2ltcGxlR3JvdXAudmFsdWUpO1xuXHR9IGVsc2Uge1xuXHRcdHZhciBxdWVyeSA9IHRoaXMuX2dldFF1ZXJ5KHNpbXBsZUdyb3VwLmtleSwgc2ltcGxlR3JvdXAudmFsdWUpO1xuXHRcdGlmIChxdWVyeSkge1xuXHRcdFx0cmV0dXJuIHF1ZXJ5LmhpZ2hsaWdodGVkO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgZ3JvdXAgd2l0aCB0aGUgc3BlY2lmaWVkIGtleSBpcyBpbiBpdHMgY29sbGFwc2VkIHN0YXRlLlxuICpcbiAqIEBtZXRob2QgaXNDb2xsYXBzZWRcbiAqIEBwYXJhbSB7Kn0ga2V5IC0gVGhlIGtleSBvZiB0aGUgZ3JvdXAgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5pc0NvbGxhcHNlZCA9IGZ1bmN0aW9uKGtleSkge1xuXHR2YXIgZ3JvdXAgPSB0aGlzLl9nZXRHcm91cChrZXkpO1xuXHRpZiAoZ3JvdXApIHtcblx0XHRyZXR1cm4gZ3JvdXAuY29sbGFwc2VkO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZmlsdGVyIHJhbmdlIG9mIHRoZSBmYWNldCB3aXRoIHRoZSBnaXZlbiB2YWx1ZSBpbiB0aGUgZ3JvdXAgd2l0aCB0aGUgZ2l2ZSBrZXksIG9yIG51bGwgaWYgYW4gZXJyb3Igb2NjdXJzLlxuICpcbiAqIEBtZXRob2QgZ2V0RmlsdGVyUmFuZ2VcbiAqIEBwYXJhbSB7Kn0ga2V5IC0gVGhlIGtleSBvZiB0aGUgZ3JvdXAgY29udGFpbmluZyB0aGUgZmFjZXQgZm9yIHdoaWNoIHRoZSBmaWx0ZXIgcmFuZ2Ugc2hvdWxkIGJlIHJldHJpZXZlZC5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGZhY2V0IGZvciB3aGljaCB0aGUgZmlsdGVyIHJhbmdlIHNob3VsZCBiZSByZXRyaWV2ZWQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fG51bGx9XG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuZ2V0RmlsdGVyUmFuZ2UgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdHZhciBncm91cCA9IHRoaXMuX2dldEdyb3VwKGtleSk7XG5cdGlmIChncm91cCkge1xuXHRcdHJldHVybiBncm91cC5nZXRGaWx0ZXJSYW5nZSh2YWx1ZSk7XG5cdH1cblx0cmV0dXJuIG51bGw7XG59O1xuXG4vKipcbiAqIEFwcGVuZHMgdGhlIHNwZWNpZmllZCBncm91cHMgYW5kIHF1ZXJpZXMgdG8gdGhlIHdpZGdldC5cbiAqIE5PVEU6IElmIGEgZmFjZXQgb3IgcXVlcnkgYWxyZWFkeSBleGlzdHMsIHRoZSB2YWx1ZSBzcGVjaWZpZWQgaW4gdGhlIGRhdGEgd2lsbCBiZSBhcHBlbmRlZCB0byB0aGUgYWxyZWFkeSBleGlzdGluZyB2YWx1ZS5cbiAqXG4gKiBAbWV0aG9kIGFwcGVuZFxuICogQHBhcmFtIHtPYmplY3R9IGdyb3VwcyAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBncm91cHMgYW5kIGZhY2V0cyB0byBhcHBlbmQuXG4gKiBAcGFyYW0ge09iamVjdH0gcXVlcmllcyAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBxdWVyaWVzIHRvIGFwcGVuZC5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihncm91cHMsIHF1ZXJpZXMpIHtcblx0dmFyIGV4aXN0aW5nR3JvdXA7XG5cblx0Ly8gQXBwZW5kIGdyb3Vwc1xuXHRpZiAoZ3JvdXBzKSB7XG5cdFx0Z3JvdXBzLmZvckVhY2goZnVuY3Rpb24oZ3JvdXBTcGVjKSB7XG5cdFx0XHRleGlzdGluZ0dyb3VwID0gdGhpcy5fZ2V0R3JvdXAoZ3JvdXBTcGVjLmtleSk7XG5cdFx0XHRpZiAoZXhpc3RpbmdHcm91cCkge1xuXHRcdFx0XHRleGlzdGluZ0dyb3VwLmFwcGVuZChncm91cFNwZWMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIGdyb3VwID0gbmV3IEdyb3VwKHRoaXMsIHRoaXMuX2NvbnRhaW5lciwgZ3JvdXBTcGVjLCB0aGlzLl9vcHRpb25zLCB0aGlzLl9ncm91cHMubGVuZ3RoKTtcblx0XHRcdFx0dGhpcy5fZ3JvdXBzLnB1c2goZ3JvdXApO1xuXHRcdFx0fVxuXHRcdH0sIHRoaXMpO1xuXHR9XG5cblx0Ly8gQXBwZW5kIHF1ZXJpZXNcblx0aWYgKHF1ZXJpZXMpIHtcblx0XHRxdWVyaWVzLmZvckVhY2goZnVuY3Rpb24ocXVlcnlTcGVjKSB7XG5cdFx0XHR0aGlzLmFkZFF1ZXJ5KHF1ZXJ5U3BlYyk7XG5cdFx0fSwgdGhpcyk7XG5cdH1cblxuXHR0aGlzLl9iaW5kQ2xpZW50RXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIGZhY2V0IHdpdGggdGhlIHNwZWNpZmllZCB2YWx1ZSBmcm9tIHRoZSBncm91cCB3aXRoIHRoZSBzcGVjaWZpZWQga2V5LlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlRmFjZXRcbiAqIEBwYXJhbSB7Kn0ga2V5IC0gVGhlIGtleSBvZiB0aGUgZ3JvdXAgY29udGFpbmluZyB0aGUgZmFjZXQgdG8gcmVtb3ZlLlxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgZmFjZXQgdG8gcmVtb3ZlLlxuICovXG5GYWNldHMucHJvdG90eXBlLnJlbW92ZUZhY2V0ID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHR2YXIgZ3JvdXAgPSB0aGlzLl9nZXRHcm91cChrZXkpO1xuXHRpZiAoZ3JvdXApIHtcblx0XHRncm91cC5yZW1vdmVGYWNldCh2YWx1ZSk7XG5cdH1cbn07XG5cbi8qKlxuICogQWRkcyBhIHF1ZXJ5IHRvIHRoZSBxdWVyeSBncm91cCBpbiB0aGlzIHdpZGdldC5cbiAqXG4gKiBAbWV0aG9kIGFkZFF1ZXJ5XG4gKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgcXVlcnkgdG8gYWRkXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuYWRkUXVlcnkgPSBmdW5jdGlvbihxdWVyeSkge1xuXHR0aGlzLl9xdWVyeUdyb3VwLmFkZFF1ZXJ5KHF1ZXJ5LCB0cnVlKTtcblx0dGhpcy5fYmluZENsaWVudEV2ZW50cygpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBxdWVyeSB3aXRoIHRoZSBzcGVjaWZpZWQga2V5IGFuZCB2YWx1ZSBmcm9tIHRoZSBxdWVyeSBncm91cC5cbiAqXG4gKiBAbWV0aG9kIHJlbW92ZVF1ZXJ5XG4gKiBAcGFyYW0geyp9IGtleSAtIFRoZSBrZXkgb2YgdGhlIHF1ZXJ5IHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHRvIHJlbW92ZS5cbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5yZW1vdmVRdWVyeSA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0dGhpcy5fcXVlcnlHcm91cC5yZW1vdmVRdWVyeShrZXksIHZhbHVlLCB0cnVlKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgZ3JvdXAgaW5kaWNlcyBpbiB0aGlzIHdpZGdldC5cbiAqIE5PVEU6IFRoZSBldmVudCBgZmFjZXQtZ3JvdXA6cmVvcmRlcmVkYCB3aWxsIGJlIHRyaWdnZXJlZCBmb3IgZWFjaCBncm91cCBmbyB3aGljaCBpdHMgaW5kZXggaGFzIGNoYW5nZWQuXG4gKlxuICogQG1ldGhvZCB1cGRhdGVHcm91cEluZGljZXNcbiAqL1xuRmFjZXRzLnByb3RvdHlwZS51cGRhdGVHcm91cEluZGljZXMgPSBmdW5jdGlvbigpIHtcblx0Lyogc29ydCBncm91cCBieSB0aGVpciB0b3Agb2Zmc2V0ICovXG5cdHRoaXMuX2dyb3Vwcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRyZXR1cm4gYS5fZWxlbWVudC5vZmZzZXQoKS50b3AgLSBiLl9lbGVtZW50Lm9mZnNldCgpLnRvcDtcblx0fSk7XG5cblx0Lyogbm90aWZ5IGFsbCBncm91cHMgb2YgdGhlaXIgbmV3IHBvc2l0aW9ucyAqL1xuXHR0aGlzLl9ncm91cHMuZm9yRWFjaChmdW5jdGlvbiAoZ3JvdXAsIGluZGV4KSB7XG5cdFx0Z3JvdXAuaW5kZXggPSBpbmRleDtcblx0fSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gYXJyYXkgd2l0aCB0aGUga2V5cyBvZiBhbGwgdGhlIGdyb3VwcyBpbiB0aGlzIHdpZGdldCwgb3JkZXJlZCBieSB0aGVpciBpbmRleC5cbiAqXG4gKiBAbWV0aG9kIGdldEdyb3VwSW5kaWNlc1xuICogQHJldHVybnMge0FycmF5fVxuICovXG5GYWNldHMucHJvdG90eXBlLmdldEdyb3VwSW5kaWNlcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5fZ3JvdXBzLm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdHJldHVybiBncm91cC5rZXk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFsbCBoYW5kbGVycyBhbmQgcHJvcGVybHkgZGVzdHJveXMgdGhpcyB3aWRnZXQgaW5zdGFuY2UuXG4gKlxuICogQG1ldGhvZCBkZXN0cm95XG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9kZXN0cm95Q29udGVudHMoKTtcblx0dGhpcy5fY29udGFpbmVyLnJlbW92ZSgpO1xuXHQvKiBjYWxsIHN1cGVyIGNsYXNzICovXG5cdElCaW5kYWJsZS5wcm90b3R5cGUuZGVzdHJveS5jYWxsKHRoaXMpO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBtZXRob2QgdG8gaW5pdGlhbGl6ZSB0aGUgd2lkZ2V0LlxuICpcbiAqIEBtZXRob2QgX2luaXRcbiAqIEBwYXJhbSB7T2JqZWN0fSBncm91cHMgLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZ3JvdXBzIHRvIGluc3RhbnRpYXRlIHdpdGggdGhpcyB3aWRnZXQuXG4gKiBAcGFyYW0ge09iamVjdD19IHF1ZXJpZXMgLSBBbiBvcHRpb25hbCBvYmplY3QgZGVzY3JpYmluZyB0aGUgcXVlcmllcyB0byBpbnN0YW50aWF0ZSB3aXRoIHRoaXMgd2lkZ2V0LlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKGdyb3VwcywgcXVlcmllcykge1xuXHR0aGlzLl9xdWVyeUdyb3VwID0gbmV3IFF1ZXJ5R3JvdXAodGhpcy5fY29udGFpbmVyLCBxdWVyaWVzIHx8IFtdKTtcblxuXHQvLyBDcmVhdGUgZ3JvdXBzXG5cdHRoaXMuX2dyb3VwcyA9IGdyb3Vwcy5tYXAoZnVuY3Rpb24oZ3JvdXBTcGVjLCBpbmRleCkge1xuXHRcdHJldHVybiBuZXcgR3JvdXAodGhpcywgdGhpcy5fY29udGFpbmVyLCBncm91cFNwZWMsIHRoaXMuX29wdGlvbnMsIGluZGV4KTtcblx0fS5iaW5kKHRoaXMpKTtcblxuXHR0aGlzLl9iaW5kQ2xpZW50RXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIFNldHMgYWxsIGZhY2V0cyBhbmQgcXVlcmllcyBpbiB0aGlzIHdpZGdldCB0byB0aGVpciBub3QtaGlnaGxpZ2h0ZWQgc3RhdGUuXG4gKlxuICogQG1ldGhvZCBfdW5oaWdobGlnaHRBbGxcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuX3VuaGlnaGxpZ2h0QWxsID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX2dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0Z3JvdXAudW5oaWdobGlnaHQoKTtcblx0fSk7XG5cdHRoaXMuX3F1ZXJ5R3JvdXAudW5oaWdobGlnaHRBbGwoKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcXVlcnkgd2l0aCB0aGUgc3BlY2lmaWVkIGtleSBhbmQgdmFsdWUuXG4gKlxuICogQG1ldGhvZCBfZ2V0UXVlcnlcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBUaGUga2V5IG9mIHRoZSBxdWVyeSB0byBmaW5kLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBxdWVyeSB0byBmaW5kLlxuICogQHJldHVybnMge0ZhY2V0fG51bGx9XG4gKiBAcHJpdmF0ZVxuICovXG5GYWNldHMucHJvdG90eXBlLl9nZXRRdWVyeSA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0cmV0dXJuIHRoaXMuX3F1ZXJ5R3JvdXAuX2dldFF1ZXJ5KGtleSwgdmFsdWUpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBncm91cCB3aXRoIHRoZSBzcGVjaWZpZWQga2V5LlxuICpcbiAqIEBtZXRob2QgX2dldEdyb3VwXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gVGhlIGtleSBvZiB0aGUgZ3JvdXAgdG8gZmluZC5cbiAqIEByZXR1cm5zIHtHcm91cHxudWxsfVxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5fZ2V0R3JvdXAgPSBmdW5jdGlvbihrZXkpIHtcblx0dmFyIGdyb3VwT2JqID0gdGhpcy5fZ3JvdXBzLmZpbHRlcihmdW5jdGlvbihnKSB7XG5cdFx0cmV0dXJuIGcua2V5ID09PSBrZXk7XG5cdH0pO1xuXHRpZiAoZ3JvdXBPYmogJiYgZ3JvdXBPYmoubGVuZ3RoPjApIHtcblx0XHRyZXR1cm4gZ3JvdXBPYmpbMF07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgbWV0aG9kIHRvIGRlc3Ryb3kgdGhlIGdyb3VwcywgZmFjZXRzIGFuZCBxdWVyaWVzIGNvbnRhaW5lZCBpbiB0aGlzIHdpZGdldC5cbiAqXG4gKiBAbWV0aG9kIF9kZXN0cm95Q29udGVudHNcbiAqIEBwcml2YXRlXG4gKi9cbkZhY2V0cy5wcm90b3R5cGUuX2Rlc3Ryb3lDb250ZW50cyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9iaW5kQ2xpZW50RXZlbnRzKHRydWUpO1xuXG5cdC8vIHJlbW92ZSBleGlzdGluZyBxdWVyaWVzXG5cdHRoaXMuX3F1ZXJ5R3JvdXAuZGVzdHJveSgpO1xuXG5cdC8vIHJlbW92ZSBleGlzdGluZyBmYWNldHNcblx0aWYgKHRoaXMuX2dyb3Vwcykge1xuXHRcdHRoaXMuX2dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKGcpIHtcblx0XHRcdGcuZGVzdHJveSgpO1xuXHRcdH0pO1xuXHR9XG59O1xuXG4vKipcbiAqIEJpbmRzIHRoZSBmb3J3YXJkaW5nIG1lY2hhbmlzbSBmb3IgYWxsIGNsaWVudCBldmVudHMuXG4gKlxuICogQG1ldGhvZCBfYmluZENsaWVudEV2ZW50c1xuICogQHBhcmFtIHtib29sZWFuPX0gcmVtb3ZlIC0gT3B0aW9uYWwgcGFyYW1ldGVyLiB3aGVuIHNldCB0byB0cnVlIHRoZSBldmVudHMgd2lsbCBiZSByZW1vdmVkLlxuICogQHByaXZhdGVcbiAqL1xuRmFjZXRzLnByb3RvdHlwZS5fYmluZENsaWVudEV2ZW50cyA9IGZ1bmN0aW9uKHJlbW92ZSkge1xuXHRpZiAocmVtb3ZlKSB7XG5cdFx0dGhpcy51bmZvcndhcmQodGhpcy5fcXVlcnlHcm91cCk7XG5cdFx0dGhpcy5fZ3JvdXBzLmZvckVhY2goZnVuY3Rpb24oX2dyb3VwKSB7XG5cdFx0XHR0aGlzLnVuZm9yd2FyZChfZ3JvdXApO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5mb3J3YXJkKHRoaXMuX3F1ZXJ5R3JvdXApO1xuXHRcdHRoaXMuX2dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKF9ncm91cCkge1xuXHRcdFx0dGhpcy5mb3J3YXJkKF9ncm91cCk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0fVxufTtcblxuLyoqXG4gKiBAZXhwb3J0XG4gKiBAdHlwZSB7RmFjZXRzfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2V0cztcbiIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIik7bW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXHRmYWNldHMtZmFjZXQtaG9yaXpvbnRhbC1oaWRkZW5cXG5cIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj1cImZ1bmN0aW9uXCIsIGFsaWFzMz10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiPGRpdiBpZD1cXFwiXCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmlkIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pZCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaWRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBjbGFzcz1cXFwiZmFjZXRzLWZhY2V0LWJhc2UgZmFjZXRzLWZhY2V0LWhvcml6b250YWxcXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5oaWRkZW4gOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlXFxcIj5cXG4gICAgICAgIDxzdmcgY2xhc3M9XFxcImZhY2V0LWhpc3RvZ3JhbVxcXCI+PC9zdmc+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1yYW5nZS1maWx0ZXIgZmFjZXQtcmFuZ2UtZmlsdGVyLWluaXRcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlLWZpbHRlci1zbGlkZXIgZmFjZXQtcmFuZ2UtZmlsdGVyLWxlZnRcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlLWZpbHRlci1zbGlkZXIgZmFjZXQtcmFuZ2UtZmlsdGVyLXJpZ2h0XFxcIj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2Plxcblx0PC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlLWxhYmVsc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1yYW5nZS1sYWJlbFxcXCI+XCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmxlZnRSYW5nZUxhYmVsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5sZWZ0UmFuZ2VMYWJlbCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibGVmdFJhbmdlTGFiZWxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1yYW5nZS1sYWJlbFxcXCI+XCJcbiAgICArIGFsaWFzMygoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnJpZ2h0UmFuZ2VMYWJlbCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucmlnaHRSYW5nZUxhYmVsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMSksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJyaWdodFJhbmdlTGFiZWxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1yYW5nZS1jb250cm9sc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1wYWdlLWxlZnQgZmFjZXQtcGFnZS1jdHJsXFxcIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtY2hldnJvbi1sZWZ0XFxcIj48L2k+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXJhbmdlLWN1cnJlbnRcXFwiPlxcblx0XHRcdFwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5sZWZ0UmFuZ2VMYWJlbCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubGVmdFJhbmdlTGFiZWwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImxlZnRSYW5nZUxhYmVsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIiAtIFwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5yaWdodFJhbmdlTGFiZWwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnJpZ2h0UmFuZ2VMYWJlbCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwicmlnaHRSYW5nZUxhYmVsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1wYWdlLXJpZ2h0IGZhY2V0LXBhZ2UtY3RybFxcXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLWNoZXZyb24tcmlnaHRcXFwiPjwvaT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pOyIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIik7bW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXHRmYWNldHMtZmFjZXQtdmVydGljYWwtaGlkZGVuXFxuXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZmFjZXQtYmFyLWJhc2UgZmFjZXQtYmFyLXNlbGVjdGVkXFxcIiBzdHlsZT1cXFwid2lkdGg6XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbigoaGVscGVycy5wZXJjZW50YWdlIHx8IChkZXB0aDAgJiYgZGVwdGgwLnBlcmNlbnRhZ2UpIHx8IGhlbHBlcnMuaGVscGVyTWlzc2luZykuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnNlbGVjdGVkIDogZGVwdGgwKSwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudG90YWwgOiBkZXB0aDApLHtcIm5hbWVcIjpcInBlcmNlbnRhZ2VcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkpXG4gICAgKyBcIiU7XFxcIj48L2Rpdj5cXG5cIjtcbn0sXCI1XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pY29uIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5jb2xvciA6IHN0YWNrMSkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDYsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMucHJvZ3JhbSg4LCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXG5cIjtcbn0sXCI2XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGFsaWFzMT10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1iYXItYmFzZVxcXCIgc3R5bGU9XFxcIndpZHRoOlwiXG4gICAgKyBhbGlhczEoKGhlbHBlcnMucGVyY2VudGFnZSB8fCAoZGVwdGgwICYmIGRlcHRoMC5wZXJjZW50YWdlKSB8fCBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jb3VudCA6IGRlcHRoMCksKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRvdGFsIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJwZXJjZW50YWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pKVxuICAgICsgXCIlOyBiYWNrZ3JvdW5kLWNvbG9yOlwiXG4gICAgKyBhbGlhczEodGhpcy5sYW1iZGEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWNvbiA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY29sb3IgOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiPjwvZGl2PlxcblwiO1xufSxcIjhcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1iYXItYmFzZSBmYWNldC1iYXItZGVmYXVsdFxcXCIgc3R5bGU9XFxcIndpZHRoOlwiXG4gICAgKyB0aGlzLmVzY2FwZUV4cHJlc3Npb24oKGhlbHBlcnMucGVyY2VudGFnZSB8fCAoZGVwdGgwICYmIGRlcHRoMC5wZXJjZW50YWdlKSB8fCBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jb3VudCA6IGRlcHRoMCksKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnRvdGFsIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJwZXJjZW50YWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pKVxuICAgICsgXCIlO1xcXCI+PC9kaXY+XFxuXCI7XG59LFwiMTBcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyO1xuXG4gIHJldHVybiBcIiAgICAgICAgICAgICAgICAgICAgXCJcbiAgICArICgoc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5jb3VudExhYmVsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5jb3VudExhYmVsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlcnMuaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IFwiZnVuY3Rpb25cIiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJjb3VudExhYmVsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXG5cIjtcbn0sXCIxMlwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyO1xuXG4gIHJldHVybiBcIlx0XHRcdFx0XHRcIlxuICAgICsgdGhpcy5lc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuY291bnQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNvdW50IDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlcnMuaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IFwiZnVuY3Rpb25cIiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJjb3VudFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXG5cIjtcbn0sXCIxNFwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXI7XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHRcdFwiXG4gICAgKyAoKHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZGlzcGxheVZhbHVlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5kaXNwbGF5VmFsdWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVycy5oZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gXCJmdW5jdGlvblwiID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImRpc3BsYXlWYWx1ZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxuXCI7XG59LFwiMTZcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5sYWJlbCA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDE3LCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLnByb2dyYW0oMTksIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcIjE3XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGhlbHBlcjtcblxuICByZXR1cm4gXCJcdFx0XHRcdFx0XCJcbiAgICArICgoc3RhY2sxID0gKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5sYWJlbCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubGFiZWwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVycy5oZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gXCJmdW5jdGlvblwiID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImxhYmVsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXG5cIjtcbn0sXCIxOVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXI7XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHRcdFwiXG4gICAgKyAoKHN0YWNrMSA9ICgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudmFsdWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnZhbHVlIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlcnMuaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IFwiZnVuY3Rpb25cIiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJ2YWx1ZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxuXHRcdFx0XHRcIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiPGRpdiBpZD1cXFwiXCJcbiAgICArIGFsaWFzMigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmlkIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pZCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaWRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBjbGFzcz1cXFwiZmFjZXRzLWZhY2V0LWJhc2UgZmFjZXRzLWZhY2V0LXZlcnRpY2FsXFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaGlkZGVuIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LWljb25cXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IHRoaXMuaW52b2tlUGFydGlhbChwYXJ0aWFscy5mYWNldFZlcnRpY2FsX2ljb24sZGVwdGgwLHtcIm5hbWVcIjpcImZhY2V0VmVydGljYWxfaWNvblwiLFwiZGF0YVwiOmRhdGEsXCJpbmRlbnRcIjpcIlxcdFxcdFwiLFwiaGVscGVyc1wiOmhlbHBlcnMsXCJwYXJ0aWFsc1wiOnBhcnRpYWxzfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCIgICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LWJsb2NrXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LWJhci1jb250YWluZXJcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LWJhci1iYXNlIGZhY2V0LWJhci1iYWNrZ3JvdW5kXFxcIiBzdHlsZT1cXFwid2lkdGg6XCJcbiAgICArIGFsaWFzMigoaGVscGVycy5wZXJjZW50YWdlIHx8IChkZXB0aDAgJiYgZGVwdGgwLnBlcmNlbnRhZ2UpIHx8IGFsaWFzMSkuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNvdW50IDogZGVwdGgwKSwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudG90YWwgOiBkZXB0aDApLHtcIm5hbWVcIjpcInBlcmNlbnRhZ2VcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkpXG4gICAgKyBcIiU7XFxcIj48L2Rpdj5cXG5cIlxuICAgICsgKChzdGFjazEgPSAoaGVscGVycy5pZkNvbmQgfHwgKGRlcHRoMCAmJiBkZXB0aDAuaWZDb25kKSB8fCBhbGlhczEpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5zZWxlY3RlZCA6IGRlcHRoMCksXCI+PVwiLDAse1wibmFtZVwiOlwiaWZDb25kXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxuXCJcbiAgICArICgoc3RhY2sxID0gKGhlbHBlcnMuaWZDb25kIHx8IChkZXB0aDAgJiYgZGVwdGgwLmlmQ29uZCkgfHwgYWxpYXMxKS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc2VsZWN0ZWQgOiBkZXB0aDApLFwiPT09XCIsdW5kZWZpbmVkLHtcIm5hbWVcIjpcImlmQ29uZFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oNSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmYWNldC1sYWJlbC1jb250YWluZXJcXFwiPlxcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJmYWNldC1sYWJlbC1jb3VudFxcXCI+XFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuY291bnRMYWJlbCA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEwLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLnByb2dyYW0oMTIsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlx0XHRcdDwvc3Bhbj5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwiZmFjZXQtbGFiZWxcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmRpc3BsYXlWYWx1ZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDE0LCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLnByb2dyYW0oMTYsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlx0XHRcdDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcImZhY2V0LWxpbmtzXFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSB0aGlzLmludm9rZVBhcnRpYWwocGFydGlhbHMuZmFjZXRWZXJ0aWNhbF9saW5rcyxkZXB0aDAse1wibmFtZVwiOlwiZmFjZXRWZXJ0aWNhbF9saW5rc1wiLFwiZGF0YVwiOmRhdGEsXCJpbmRlbnRcIjpcIlxcdFxcdFwiLFwiaGVscGVyc1wiOmhlbHBlcnMsXCJwYXJ0aWFsc1wiOnBhcnRpYWxzfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCIgICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXF1ZXJ5LWNsb3NlXFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSB0aGlzLmludm9rZVBhcnRpYWwocGFydGlhbHMuZmFjZXRWZXJ0aWNhbF9xdWVyeUNsb3NlLGRlcHRoMCx7XCJuYW1lXCI6XCJmYWNldFZlcnRpY2FsX3F1ZXJ5Q2xvc2VcIixcImRhdGFcIjpkYXRhLFwiaW5kZW50XCI6XCIgICAgICAgIFwiLFwiaGVscGVyc1wiOmhlbHBlcnMsXCJwYXJ0aWFsc1wiOnBhcnRpYWxzfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCIgICAgPC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJmYWNldC1zZWFyY2gtY29udGFpbmVyXFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSB0aGlzLmludm9rZVBhcnRpYWwocGFydGlhbHMuZmFjZXRWZXJ0aWNhbF9zZWFyY2gsZGVwdGgwLHtcIm5hbWVcIjpcImZhY2V0VmVydGljYWxfc2VhcmNoXCIsXCJkYXRhXCI6ZGF0YSxcImluZGVudFwiOlwiXFx0XFx0XCIsXCJoZWxwZXJzXCI6aGVscGVycyxcInBhcnRpYWxzXCI6cGFydGlhbHN9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG59LFwidXNlUGFydGlhbFwiOnRydWUsXCJ1c2VEYXRhXCI6dHJ1ZX0pOyIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIik7bW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCIgICAgPGkgY2xhc3M9XFxcIlwiXG4gICAgKyB0aGlzLmVzY2FwZUV4cHJlc3Npb24odGhpcy5sYW1iZGEoKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWNvbiA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazFbJ2NsYXNzJ10gOiBzdGFjazEpLCBkZXB0aDApKVxuICAgICsgXCJcXFwiIFwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKChzdGFjazEgPSAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWNvbiA6IGRlcHRoMCkpICE9IG51bGwgPyBzdGFjazEuY29sb3IgOiBzdGFjazEpLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgyLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiICAgID48L2k+XFxuXCI7XG59LFwiMlwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiBcIlxcbiAgICAgICBzdHlsZT1cXFwiY29sb3I6XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbih0aGlzLmxhbWJkYSgoKHN0YWNrMSA9IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pY29uIDogZGVwdGgwKSkgIT0gbnVsbCA/IHN0YWNrMS5jb2xvciA6IHN0YWNrMSksIGRlcHRoMCkpXG4gICAgKyBcIlxcXCJcXG5cIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmljb24gOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiPGRpdiBjbGFzcz1cXFwiZmFjZXQtaWNvbi1tYXJrZXJcXFwiPlxcbiAgICA8aSBjbGFzcz1cXFwiZmEgZmEtY2hlY2tcXFwiPjwvaT5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pOyIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIik7bW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlcjtcblxuICByZXR1cm4gXCIgICAgPGkgY2xhc3M9XFxcImZhIGZhLWxpbmtcXFwiPjwvaT5cIlxuICAgICsgdGhpcy5lc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubGlua3MgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmxpbmtzIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlcnMuaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IFwiZnVuY3Rpb25cIiA/IGhlbHBlci5jYWxsKGRlcHRoMCx7XCJuYW1lXCI6XCJsaW5rc1wiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXG5cIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmxpbmtzIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcInVzZURhdGFcIjp0cnVlfSk7IiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKFwiaGFuZGxlYmFyc1wiKTttb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgPGRpdiBjbGFzcz1cXFwicXVlcnktY2xvc2VcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jbG9zZVxcXCI+PC9pPjwvZGl2PlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNRdWVyeSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKTtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pOyIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIik7bW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgIDxkaXYgY2xhc3M9XFxcImZhY2V0LXNlYXJjaFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXNlYXJjaFxcXCI+PC9pPjwvZGl2PlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzYsXCI+PSAyLjAuMC1iZXRhLjFcIl0sXCJtYWluXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuICgoc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc2VhcmNoIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcInVzZURhdGFcIjp0cnVlfSk7IiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKFwiaGFuZGxlYmFyc1wiKTttb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgZ3JvdXAtb3RoZXItdGFyZ2V0XFxcIiBzdHlsZT1cXFwiY3Vyc29yOiBwb2ludGVyO1wiO1xufSxcIjNcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gKChzdGFjazEgPSAoaGVscGVycy5pZkNvbmQgfHwgKGRlcHRoMCAmJiBkZXB0aDAuaWZDb25kKSB8fCBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5tb3JlIDogZGVwdGgwKSxcImluc3RhbmNlb2ZcIixcIm51bWJlclwiLHtcIm5hbWVcIjpcImlmQ29uZFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oNCwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5wcm9ncmFtKDcsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcIjRcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gKChzdGFjazEgPSAoaGVscGVycy5pZkNvbmQgfHwgKGRlcHRoMCAmJiBkZXB0aDAuaWZDb25kKSB8fCBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5tb3JlIDogZGVwdGgwKSxcIj5cIiwwLHtcIm5hbWVcIjpcImlmQ29uZFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oNSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcIjVcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlcjtcblxuICByZXR1cm4gXCIgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXAtbW9yZS1tYXJrZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGk+4pePPC9pPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXAtb3RoZXItYmxvY2tcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXAtb3RoZXItYmFyXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLWNvbnRhaW5lclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLWNvdW50XFxcIj5cIlxuICAgICsgdGhpcy5lc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubW9yZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubW9yZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibW9yZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCIrPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJncm91cC1vdGhlci1sYWJlbC1vdGhlclxcXCI+b3RoZXI8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLXNob3ctbW9yZSBncm91cC1tb3JlLXRhcmdldFxcXCI+c2hvdyBtb3JlPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcblwiO1xufSxcIjdcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCIgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cC1vdGhlci1ibG9ja1xcXCI+XFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cC1vdGhlci1sYWJlbC1jb250YWluZXJcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IChoZWxwZXJzLmlmQ29uZCB8fCAoZGVwdGgwICYmIGRlcHRoMC5pZkNvbmQpIHx8IGhlbHBlcnMuaGVscGVyTWlzc2luZykuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1vcmUgOiBkZXB0aDApLFwiaW5zdGFuY2VvZlwiLFwiQXJyYXlcIix7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDgsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMucHJvZ3JhbSgxNywgZGF0YSwgMCksXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8L2Rpdj5cXG5cIjtcbn0sXCI4XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLXNob3ctbW9yZSBncm91cC1tb3JlLW5vdC10YXJnZXRcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubW9yZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiZWFjaFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oOSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6dGhpcy5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIlx0XHRcdFx0XHRcdDwvc3Bhbj5cXG5cIjtcbn0sXCI5XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuICgoc3RhY2sxID0gKGhlbHBlcnMuaWZDb25kIHx8IChkZXB0aDAgJiYgZGVwdGgwLmlmQ29uZCkgfHwgaGVscGVycy5oZWxwZXJNaXNzaW5nKS5jYWxsKGRlcHRoMCxkZXB0aDAsXCJpbnN0YW5jZW9mXCIsXCJvYmplY3RcIix7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEwLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLnByb2dyYW0oMTUsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpO1xufSxcIjEwXCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGhlbHBlciwgYWxpYXMxPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMyPVwiZnVuY3Rpb25cIiwgYWxpYXMzPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCJcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcIlwiXG4gICAgKyAoKHN0YWNrMSA9IChoZWxwZXJzLmlmQ29uZCB8fCAoZGVwdGgwICYmIGRlcHRoMC5pZkNvbmQpIHx8IGFsaWFzMSkuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmNsaWNrYWJsZSA6IGRlcHRoMCksXCI9PT1cIix0cnVlLHtcIm5hbWVcIjpcImlmQ29uZFwiLFwiaGFzaFwiOnt9LFwiZm5cIjp0aGlzLnByb2dyYW0oMTEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMFsnY2xhc3MnXSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEzLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiXFxcIiBpbmRleD1cIlxuICAgICsgYWxpYXMzKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaW5kZXggfHwgKGRhdGEgJiYgZGF0YS5pbmRleCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczEpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwiaW5kZXhcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPlwiXG4gICAgKyBhbGlhczMoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5sYWJlbCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubGFiZWwgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMxKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMyID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImxhYmVsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvc3Bhbj5cXG5cIjtcbn0sXCIxMVwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCJncm91cC1tb3JlLXRhcmdldCBcIjtcbn0sXCIxM1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyO1xuXG4gIHJldHVybiB0aGlzLmVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVyc1snY2xhc3MnXSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDBbJ2NsYXNzJ10gOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogaGVscGVycy5oZWxwZXJNaXNzaW5nKSwodHlwZW9mIGhlbHBlciA9PT0gXCJmdW5jdGlvblwiID8gaGVscGVyLmNhbGwoZGVwdGgwLHtcIm5hbWVcIjpcImNsYXNzXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpO1xufSxcIjE1XCI6ZnVuY3Rpb24oZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbih0aGlzLmxhbWJkYShkZXB0aDAsIGRlcHRoMCkpXG4gICAgKyBcIjwvc3Bhbj5cXG5cIjtcbn0sXCIxN1wiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiAoKHN0YWNrMSA9IChoZWxwZXJzLmlmQ29uZCB8fCAoZGVwdGgwICYmIGRlcHRoMC5pZkNvbmQpIHx8IGhlbHBlcnMuaGVscGVyTWlzc2luZykuY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1vcmUgOiBkZXB0aDApLFwiPT09XCIsdHJ1ZSx7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDE4LCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIik7XG59LFwiMThcIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcImdyb3VwLW90aGVyLWxhYmVsLXNob3ctbW9yZSBncm91cC1tb3JlLXRhcmdldFxcXCI+c2hvdyBtb3JlPC9zcGFuPlxcblx0XHRcdFx0XHRcIjtcbn0sXCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcImdyb3VwLW1vcmUtY29udGFpbmVyXCJcbiAgICArICgoc3RhY2sxID0gKGhlbHBlcnMuaWZDb25kIHx8IChkZXB0aDAgJiYgZGVwdGgwLmlmQ29uZCkgfHwgaGVscGVycy5oZWxwZXJNaXNzaW5nKS5jYWxsKGRlcHRoMCwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubW9yZSA6IGRlcHRoMCksXCJpbnN0YW5jZW9mXCIsXCJudW1iZXJcIix7XCJuYW1lXCI6XCJpZkNvbmRcIixcImhhc2hcIjp7fSxcImZuXCI6dGhpcy5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOnRoaXMubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCJcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm1vcmUgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOnRoaXMucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImludmVyc2VcIjp0aGlzLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTsiLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzXCIpO21vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyO1xuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcImZhY2V0cy1ncm91cC1jb250YWluZXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiZmFjZXRzLWdyb3VwXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiZ3JvdXAtaGVhZGVyXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cC1leHBhbmRlclxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2hlY2stc3F1YXJlLW8gdG9nZ2xlXFxcIj48L2k+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0XCJcbiAgICArIHRoaXMuZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmxhYmVsIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5sYWJlbCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAse1wibmFtZVwiOlwibGFiZWxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cC1mYWNldC1jb250YWluZXItb3V0ZXJcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcImdyb3VwLWZhY2V0LWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiZ3JvdXAtbW9yZS1jb250YWluZXJcXFwiPjwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiZ3JvdXAtZmFjZXQtZWxsaXBzaXNcXFwiPi4uLjwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTsiLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzXCIpO21vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls2LFwiPj0gMi4wLjAtYmV0YS4xXCJdLFwibWFpblwiOmZ1bmN0aW9uKGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJmYWNldHMtcm9vdC1jb250YWluZXJcXFwiPlxcblxcbjwvZGl2PlwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7IiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKFwiaGFuZGxlYmFyc1wiKTttb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNixcIj49IDIuMC4wLWJldGEuMVwiXSxcIm1haW5cIjpmdW5jdGlvbihkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFwiZmFjZXRzLWdyb3VwXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXAtaGVhZGVyXFxcIj5RdWVyaWVzPC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJncm91cC1mYWNldC1jb250YWluZXJcXFwiPjwvZGl2PlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7IiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xudmFyIF8gPSByZXF1aXJlICgnLi91dGlsJyk7XG5cbnZhciBDb2xvciA9IGZ1bmN0aW9uKHIsZyxiKSB7XG4gICAgdGhpcy5yID0gciB8fCAwO1xuICAgIHRoaXMuZyA9IGcgfHwgMDtcbiAgICB0aGlzLmIgPSBiIHx8IDA7XG59O1xuXG5Db2xvci5wcm90b3R5cGUgPSBfLmV4dGVuZChDb2xvci5wcm90b3R5cGUsIHtcbiAgICBoZXggOiBmdW5jdGlvbihoZXhTdHIpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBcIiNcIiArICgoMSA8PCAyNCkgKyAodGhpcy5yIDw8IDE2KSArICh0aGlzLmcgPDwgOCkgKyB0aGlzLmIpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGhleE1hdGNoZXIuZXhlYyhoZXhTdHIpO1xuICAgICAgICAgICAgICAgIHRoaXMuciA9IHBhcnNlSW50KHJlc1sxXSwxNik7XG4gICAgICAgICAgICAgICAgdGhpcy5nID0gcGFyc2VJbnQocmVzWzJdLDE2KTtcbiAgICAgICAgICAgICAgICB0aGlzLmIgPSBwYXJzZUludChyZXNbM10sMTYpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRocm93IFwiQ291bGQgbm90IHBhcnNlIGNvbG9yIFwiICsgaGV4U3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTU2MDI0OC9wcm9ncmFtbWF0aWNhbGx5LWxpZ2h0ZW4tb3ItZGFya2VuLWEtaGV4LWNvbG9yLW9yLXJnYi1hbmQtYmxlbmQtY29sb3JzXG4gICAgc2hhZGUgOiBmdW5jdGlvbihwZXJjZW50KSB7XG4gICAgICAgIHZhciB0PXBlcmNlbnQ8MD8wOjI1NSxwPXBlcmNlbnQ8MD9wZXJjZW50Ki0xOnBlcmNlbnQ7XG4gICAgICAgIHZhciBuZXdSID0gTWF0aC5yb3VuZCgodC10aGlzLnIpKnApK3RoaXMucjtcbiAgICAgICAgdmFyIG5ld0cgPSBNYXRoLnJvdW5kKCh0LXRoaXMuZykqcCkrdGhpcy5nO1xuICAgICAgICB2YXIgbmV3QiA9IE1hdGgucm91bmQoKHQtdGhpcy5iKSpwKSt0aGlzLmI7XG4gICAgICAgIHJldHVybiBuZXcgQ29sb3IobmV3UixuZXdHLG5ld0IpO1xuICAgIH1cbn0pO1xuXG52YXIgaGV4TWF0Y2hlciA9IG5ldyBSZWdFeHAoL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3I7IiwiLypcbiAqICpcbiAqICBDb3B5cmlnaHQgwqkgMjAxNSBVbmNoYXJ0ZWQgU29mdHdhcmUgSW5jLlxuICpcbiAqICBQcm9wZXJ0eSBvZiBVbmNoYXJ0ZWTihKIsIGZvcm1lcmx5IE9jdWx1cyBJbmZvIEluYy5cbiAqICBodHRwOi8vdW5jaGFydGVkLnNvZnR3YXJlL1xuICpcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKlxuICogIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqICB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiAgdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4gKiAgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvXG4gKiAgc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqICBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiAgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqICBTT0ZUV0FSRS5cbiAqIC9cbiAqL1xuXG52YXIgczQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAgICAgLnRvU3RyaW5nKDE2KVxuICAgICAgICAuc3Vic3RyaW5nKDEpO1xufTtcblxudmFyIFV0aWwgPSB7XG5cbiAgICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcbiAgICAgICAgdmFyIGtleSwgaSwgc291cmNlO1xuICAgICAgICBmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlc3Q7XG4gICAgfSxcblxuICAgIHJhbmRvbUlkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHM0KCkgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgK1xuICAgICAgICAgICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7XG4iXX0=
