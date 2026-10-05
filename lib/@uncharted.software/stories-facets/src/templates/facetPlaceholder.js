var Handlebars = require('handlebars/runtime');module.exports = Handlebars.template({"0":function(container,depth0,helpers,partials,data) {
    return "    facets-facet-placeholder-hidden\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div id=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":1,"column":9},"end":{"line":1,"column":15}}}) : helper)))
    + "\" class=\"facets-facet-base facets-facet-placeholder\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"hidden") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":4,"column":7}}})) != null ? stack1 : "")
    + "\">\n    <div class=\"facet-block\">\n        <div class=\"facet-html\">\n            "
    + alias3((lookupProperty(helpers,"safeHtml")||(depth0 && lookupProperty(depth0,"safeHtml"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"html") : depth0),{"name":"safeHtml","hash":{},"data":data,"loc":{"start":{"line":8,"column":12},"end":{"line":8,"column":29}}}))
    + "\n        </div>\n    </div>\n</div>\n";
},"useData":true})