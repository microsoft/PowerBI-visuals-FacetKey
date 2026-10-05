var Handlebars = require('handlebars/runtime');module.exports = Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"facets-badge\">\n  <span class=\"badge-label\">"
    + container.escapeExpression((lookupProperty(helpers,"safeHtml")||(depth0 && lookupProperty(depth0,"safeHtml"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"label") : depth0),{"name":"safeHtml","hash":{},"data":data,"loc":{"start":{"line":2,"column":28},"end":{"line":2,"column":46}}}))
    + "</span>\n  <span class=\"badge-close\">\n    <i class=\"fa fa-close badge-close-icon\"></i>\n  </span>\n</div>\n";
},"useData":true})