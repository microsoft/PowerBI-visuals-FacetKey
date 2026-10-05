var Handlebars = require('handlebars/runtime');module.exports = Handlebars.template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <div class=\"facets-group facets-badge-group\">\n    <div class=\"facets-badges\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"badgesTitle") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":6},"end":{"line":8,"column":13}}})) != null ? stack1 : "")
    + "    </div>\n  </div>\n";
},"1":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <span class=\"facets-badges-title\">\n          "
    + container.escapeExpression((lookupProperty(helpers,"safeHtml")||(depth0 && lookupProperty(depth0,"safeHtml"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"badgesTitle") : depth0),{"name":"safeHtml","hash":{},"data":data,"loc":{"start":{"line":6,"column":10},"end":{"line":6,"column":34}}}))
    + "\n        </span>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"enableBadges") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":11,"column":7}}})) != null ? stack1 : "");
},"useData":true})