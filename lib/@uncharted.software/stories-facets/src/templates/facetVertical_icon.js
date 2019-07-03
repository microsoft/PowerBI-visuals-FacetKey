var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <i class=\""
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1["class"] : stack1), depth0))
    + "\" "
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    ></i>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "\n       style=\"color:"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1), depth0))
    + "\"\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.icon : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<div class=\"facet-icon-marker\">\n    <i class=\"fa fa-check\"></i>\n</div>\n";
},"useData":true});