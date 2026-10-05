var Handlebars = require('handlebars/runtime');module.exports = Handlebars.template({"0":function(container,depth0,helpers,partials,data) {
    return "				<div class=\"group-expander\">\n					<i class=\"fa fa-check-square-o toggle\"></i>\n				</div>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"facets-group-container\">\n	<div class=\"facets-group\">\n		<div class=\"group-header\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"collapsible") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":3},"end":{"line":8,"column":10}}})) != null ? stack1 : "")
    + "			"
    + container.escapeExpression((lookupProperty(helpers,"safeHtml")||(depth0 && lookupProperty(depth0,"safeHtml"))||container.hooks.helperMissing).call(alias1,(depth0 != null ? lookupProperty(depth0,"label") : depth0),{"name":"safeHtml","hash":{},"data":data,"loc":{"start":{"line":9,"column":3},"end":{"line":9,"column":21}}}))
    + "\n		</div>\n		<div class=\"group-facet-container-outer\">\n			<div class=\"group-facet-container\"></div>\n			<div class=\"group-more-container\"></div>\n		</div>\n		<div class=\"group-facet-ellipsis\">...</div>\n	</div>\n</div>\n";
},"useData":true})