var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    return "	facets-facet-horizontal-hidden\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "<div id=\""
    + alias3(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" class=\"facets-facet-base facets-facet-horizontal\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.hidden : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\">\n	<div class=\"facet-range\">\n        <svg class=\"facet-histogram\"></svg>\n        <div class=\"facet-range-filter facet-range-filter-init\">\n            <div class=\"facet-range-filter-slider facet-range-filter-left\">\n            </div>\n            <div class=\"facet-range-filter-slider facet-range-filter-right\">\n            </div>\n        </div>\n	</div>\n    <div class=\"facet-range-labels\">\n        <div class=\"facet-range-label\">"
    + alias3(((helper = (helper = helpers.leftRangeLabel || (depth0 != null ? depth0.leftRangeLabel : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"leftRangeLabel","hash":{},"data":data}) : helper)))
    + "</div>\n        <div class=\"facet-range-label\">"
    + alias3(((helper = (helper = helpers.rightRangeLabel || (depth0 != null ? depth0.rightRangeLabel : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"rightRangeLabel","hash":{},"data":data}) : helper)))
    + "</div>\n    </div>\n    <div class=\"facet-range-controls\">\n        <div class=\"facet-page-left facet-page-ctrl\">\n            <i class=\"fa fa-chevron-left\"></i>\n        </div>\n        <div class=\"facet-range-current\">\n			"
    + alias3(((helper = (helper = helpers.leftRangeLabel || (depth0 != null ? depth0.leftRangeLabel : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"leftRangeLabel","hash":{},"data":data}) : helper)))
    + " - "
    + alias3(((helper = (helper = helpers.rightRangeLabel || (depth0 != null ? depth0.rightRangeLabel : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"rightRangeLabel","hash":{},"data":data}) : helper)))
    + "\n        </div>\n        <div class=\"facet-page-right facet-page-ctrl\">\n            <i class=\"fa fa-chevron-right\"></i>\n        </div>\n    </div>\n</div>\n";
},"useData":true});