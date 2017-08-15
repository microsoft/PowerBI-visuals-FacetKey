var Handlebars = require("handlebars");module.exports = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    return " group-other-target\" style=\"cursor: pointer;";
},"3":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),"instanceof","number",{"name":"ifCond","hash":{},"fn":this.program(4, data, 0),"inverse":this.program(7, data, 0),"data":data})) != null ? stack1 : "");
},"4":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),">",0,{"name":"ifCond","hash":{},"fn":this.program(5, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"5":function(depth0,helpers,partials,data) {
    var helper;

  return "                <div class=\"group-more-marker\">\n                    <i>●</i>\n                </div>\n                <div class=\"group-other-block\">\n                    <div class=\"group-other-bar\"></div>\n                    <div class=\"group-other-label-container\">\n                        <span class=\"group-other-label-count\">"
    + this.escapeExpression(((helper = (helper = helpers.more || (depth0 != null ? depth0.more : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"more","hash":{},"data":data}) : helper)))
    + "+</span>\n                        <span class=\"group-other-label-other\">other</span>\n                        <span class=\"group-other-label-show-more group-more-target\">show more</span>\n                    </div>\n                </div>\n";
},"7":function(depth0,helpers,partials,data) {
    var stack1;

  return "            <div class=\"group-other-block\">\n				<div class=\"group-other-label-container\">\n"
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),"instanceof","Array",{"name":"ifCond","hash":{},"fn":this.program(8, data, 0),"inverse":this.program(17, data, 0),"data":data})) != null ? stack1 : "")
    + "				</div>\n			</div>\n";
},"8":function(depth0,helpers,partials,data) {
    var stack1;

  return "						<span class=\"group-other-label-show-more group-more-not-target\">\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.more : depth0),{"name":"each","hash":{},"fn":this.program(9, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "						</span>\n";
},"9":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,depth0,"instanceof","object",{"name":"ifCond","hash":{},"fn":this.program(10, data, 0),"inverse":this.program(15, data, 0),"data":data})) != null ? stack1 : "");
},"10":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "								<span class=\""
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias1).call(depth0,(depth0 != null ? depth0.clickable : depth0),"===",true,{"name":"ifCond","hash":{},"fn":this.program(11, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0['class'] : depth0),{"name":"if","hash":{},"fn":this.program(13, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\" index="
    + alias3(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"index","hash":{},"data":data}) : helper)))
    + ">"
    + alias3(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"label","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"11":function(depth0,helpers,partials,data) {
    return "group-more-target ";
},"13":function(depth0,helpers,partials,data) {
    var helper;

  return this.escapeExpression(((helper = (helper = helpers['class'] || (depth0 != null ? depth0['class'] : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"class","hash":{},"data":data}) : helper)));
},"15":function(depth0,helpers,partials,data) {
    return "                                <span>"
    + this.escapeExpression(this.lambda(depth0, depth0))
    + "</span>\n";
},"17":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),"===",true,{"name":"ifCond","hash":{},"fn":this.program(18, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"18":function(depth0,helpers,partials,data) {
    return "						<span class=\"group-other-label-show-more group-more-target\">show more</span>\n					";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"group-more-container"
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || helpers.helperMissing).call(depth0,(depth0 != null ? depth0.more : depth0),"instanceof","number",{"name":"ifCond","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\">\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.more : depth0),{"name":"if","hash":{},"fn":this.program(3, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"useData":true});