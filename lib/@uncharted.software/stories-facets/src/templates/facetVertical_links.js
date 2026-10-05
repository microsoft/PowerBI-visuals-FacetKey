var Handlebars = require('handlebars/runtime');module.exports = Handlebars.template({"0":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <i class=\"fa fa-link facet-links-icon\"></i><span class=\"facet-links-count\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"links") || (depth0 != null ? lookupProperty(depth0,"links") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"links","hash":{},"data":data,"loc":{"start":{"line":2,"column":79},"end":{"line":2,"column":88}}}) : helper)))
    + "</span>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"links") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":3,"column":7}}})) != null ? stack1 : "");
},"useData":true})