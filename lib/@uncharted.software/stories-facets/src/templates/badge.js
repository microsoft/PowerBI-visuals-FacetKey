var Handlebars = require('handlebars');module.exports = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper;

  return "<div class=\"facets-badge\">\n  <span class=\"badge-label\">"
    + ((stack1 = ((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"label","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</span>\n  <span class=\"badge-close\">\n    <i class=\"fa fa-close badge-close-icon\"></i>\n  </span>\n</div>\n";
},"useData":true})