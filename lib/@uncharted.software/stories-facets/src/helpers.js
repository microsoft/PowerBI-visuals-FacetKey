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

var $ = require('jquery');
var Handlebars = require('handlebars/runtime');
var createDOMPurify = require('dompurify');

/**
 * DOMPurify ships as a factory that must be bound to a `window` the first
 * time it is used (browser UMD builds auto-bind to the ambient global
 * `window`; this explicit fallback also covers environments - like a fresh
 * jsdom `window` passed around rather than installed as `global.window` -
 * where the auto-detection does not apply).
 */
var DOMPurify = (typeof createDOMPurify.sanitize === 'function')
    ? createDOMPurify
    : createDOMPurify(typeof window !== 'undefined' ? window : undefined);

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

/**
 * Sanitizes a trusted-but-possibly-attacker-influenced HTML fragment that is
 * meant to be rendered unescaped (facet/badge/group labels, placeholder html,
 * etc). Unlike Handlebars' default `{{escaping}}`, these fields intentionally
 * allow simple markup (e.g. `<b>`, inline icons, `<a href="...">` links)
 * authored by the consuming application, so we cannot HTML-escape them
 * outright.
 *
 * Sanitization is delegated to DOMPurify (a maintained, actively-fuzzed HTML
 * sanitizer) rather than a hand-written strip list: DOMPurify parses the
 * markup with the real DOM parser bound to this environment's `window`,
 * which is what lets it correctly handle mutation-XSS, HTML/SVG/MathML
 * namespace-confusion payloads, mixed-case/obfuscated tag and attribute
 * names, control-character-split protocols, and `javascript:`/`vbscript:`/
 * `data:` URIs in `href`/`src`/`xlink:href` - all of which a regex-based
 * blocklist (the previous implementation here) is known to miss. The result
 * still keeps plain formatting tags and safe (http/https/mailto/relative)
 * links intact, preserving the existing "rich label"/links feature.
 *
 * @param {*} value - The value to sanitize, including existing SafeString wrappers.
 * @returns {*}
 */
function sanitizeHtml(value) {
    var text = value == null ? '' : String(value);
    var sanitized = DOMPurify.sanitize(text, { RETURN_TRUSTED_TYPE: false });

    return new Handlebars.SafeString(sanitized);
}

Handlebars.registerHelper('safeHtml', sanitizeHtml);
// Imperative widget updates must use the same boundary as initial templates.
exports.sanitizeHtml = sanitizeHtml;

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
