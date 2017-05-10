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
