var Handlebars = require('handlebars');module.exports = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"facets-group-container\">\n	<div class=\"facets-group\">\n		<div class=\"group-header\">\n			<div class=\"group-expander\">\n				<i class=\"fa fa-check-square-o toggle\"></i>\n			</div>\n			"
    + container.escapeExpression(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"label","hash":{},"data":data}) : helper)))
    + "\n		</div>\n		<div class=\"group-facet-container-outer\">\n			<div class=\"group-facet-container\"></div>\n			<div class=\"group-more-container\"></div>\n		</div>\n		<div class=\"group-facet-ellipsis\">...</div>\n	</div>\n</div>\n";
},"useData":true})