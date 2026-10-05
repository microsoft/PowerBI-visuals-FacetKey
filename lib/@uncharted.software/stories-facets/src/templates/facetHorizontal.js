var Handlebars = require('handlebars/runtime');module.exports = Handlebars.template({"0":function(container,depth0,helpers,partials,data) {
    return "	facets-facet-horizontal-hidden\n";
},"1":function(container,depth0,helpers,partials,data) {
    return "			<div class=\"facet-range-filter facet-range-filter-init\">\n				<div class=\"facet-range-filter-slider facet-range-filter-left\">\n				</div>\n				<div class=\"facet-range-filter-slider facet-range-filter-right\">\n				</div>\n			</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "		<div class=\"facet-range-controls\">\n			<div class=\"facet-page-left facet-page-ctrl\">\n				<i class=\"fa fa-chevron-left\"></i>\n			</div>\n			<div class=\"facet-range-current\">\n				"
    + alias4(((helper = (helper = lookupProperty(helpers,"leftRangeLabel") || (depth0 != null ? lookupProperty(depth0,"leftRangeLabel") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"leftRangeLabel","hash":{},"data":data,"loc":{"start":{"line":27,"column":4},"end":{"line":27,"column":22}}}) : helper)))
    + " - "
    + alias4(((helper = (helper = lookupProperty(helpers,"rightRangeLabel") || (depth0 != null ? lookupProperty(depth0,"rightRangeLabel") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rightRangeLabel","hash":{},"data":data,"loc":{"start":{"line":27,"column":25},"end":{"line":27,"column":44}}}) : helper)))
    + "\n			</div>\n			<div class=\"facet-page-right facet-page-ctrl\">\n				<i class=\"fa fa-chevron-right\"></i>\n			</div>\n		</div>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div id=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":1,"column":9},"end":{"line":1,"column":15}}}) : helper)))
    + "\" class=\"facets-facet-base facets-facet-horizontal\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"hidden") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":0},"end":{"line":4,"column":7}}})) != null ? stack1 : "")
    + "\">\n	<div class=\"facet-range\">\n		<svg class=\"facet-histogram\"></svg>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"filterable") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":8,"column":2},"end":{"line":15,"column":9}}})) != null ? stack1 : "")
    + "	</div>\n	<div class=\"facet-range-labels\">\n		<div class=\"facet-range-label\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"leftRangeLabel") || (depth0 != null ? lookupProperty(depth0,"leftRangeLabel") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"leftRangeLabel","hash":{},"data":data,"loc":{"start":{"line":18,"column":33},"end":{"line":18,"column":51}}}) : helper)))
    + "</div>\n		<div class=\"facet-range-label\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"rightRangeLabel") || (depth0 != null ? lookupProperty(depth0,"rightRangeLabel") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rightRangeLabel","hash":{},"data":data,"loc":{"start":{"line":19,"column":33},"end":{"line":19,"column":52}}}) : helper)))
    + "</div>\n	</div>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"filterable") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":1},"end":{"line":33,"column":8}}})) != null ? stack1 : "")
    + "</div>\n";
},"useData":true})