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