var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "	facets-facet-horizontal-hidden\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "			<div class=\"facet-range-filter facet-range-filter-init\">\n				<div class=\"facet-range-filter-slider facet-range-filter-left\">\n				</div>\n				<div class=\"facet-range-filter-slider facet-range-filter-right\">\n				</div>\n			</div>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "		<div class=\"facet-range-controls\">\n			<div class=\"facet-page-left facet-page-ctrl\">\n				<i class=\"fa fa-chevron-left\"></i>\n			</div>\n			<div class=\"facet-range-current\">\n				"
    + alias4(((helper = (helper = helpers.leftRangeLabel || (depth0 != null ? depth0.leftRangeLabel : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"leftRangeLabel","hash":{},"data":data}) : helper)))
    + " - "
    + alias4(((helper = (helper = helpers.rightRangeLabel || (depth0 != null ? depth0.rightRangeLabel : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rightRangeLabel","hash":{},"data":data}) : helper)))
    + "\n			</div>\n			<div class=\"facet-page-right facet-page-ctrl\">\n				<i class=\"fa fa-chevron-right\"></i>\n			</div>\n		</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div id=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" class=\"facets-facet-base facets-facet-horizontal\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.hidden : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">\n	<div class=\"facet-range\">\n		<svg class=\"facet-histogram\"></svg>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.filterable : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "	</div>\n	<div class=\"facet-range-labels\">\n		<div class=\"facet-range-label\">"
    + alias4(((helper = (helper = helpers.leftRangeLabel || (depth0 != null ? depth0.leftRangeLabel : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"leftRangeLabel","hash":{},"data":data}) : helper)))
    + "</div>\n		<div class=\"facet-range-label\">"
    + alias4(((helper = (helper = helpers.rightRangeLabel || (depth0 != null ? depth0.rightRangeLabel : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rightRangeLabel","hash":{},"data":data}) : helper)))
    + "</div>\n	</div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.filterable : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"useData":true});