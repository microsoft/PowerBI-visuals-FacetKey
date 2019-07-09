var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "				<div class=\"group-expander\">\n					<i class=\"fa fa-check-square-o toggle\"></i>\n				</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"facets-group-container\">\n	<div class=\"facets-group\">\n		<div class=\"group-header\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.collapsible : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "			"
    + ((stack1 = ((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"label","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\n		</div>\n		<div class=\"group-facet-container-outer\">\n			<div class=\"group-facet-container\"></div>\n			<div class=\"group-more-container\"></div>\n		</div>\n		<div class=\"group-facet-ellipsis\">...</div>\n	</div>\n</div>\n";
},"useData":true});