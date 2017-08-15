var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    var stack1;

  return "    <i class=\""
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1['class'] : stack1), depth0))
    + "\" "
    + ((stack1 = helpers['if'].call(depth0,((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1),{"name":"if","hash":{},"fn":this.program(2, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "    ></i>\n";
},"2":function(depth0,helpers,partials,data) {
    var stack1;

  return "\n       style=\"color:"
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.icon : depth0)) != null ? stack1.color : stack1), depth0))
    + "\"\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.icon : depth0),{"name":"if","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "<div class=\"facet-icon-marker\">\n    <i class=\"fa fa-check\"></i>\n</div>\n";
},"useData":true});