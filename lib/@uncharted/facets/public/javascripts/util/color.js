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