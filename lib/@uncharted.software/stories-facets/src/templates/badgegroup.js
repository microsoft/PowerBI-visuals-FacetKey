var Handlebars = require('handlebars');module.exports = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "  <div class=\"facets-group facets-badge-group\">\n    <div class=\"facets-badges\">\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.badgesTitle : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n  </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper;

  return "        <span class=\"facets-badges-title\">\n          "
    + ((stack1 = ((helper = (helper = helpers.badgesTitle || (depth0 != null ? depth0.badgesTitle : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"badgesTitle","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\n        </span>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.enableBadges : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"useData":true})