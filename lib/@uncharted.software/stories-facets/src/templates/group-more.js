var Handlebars = require('handlebars/runtime');module.exports = Handlebars.template({"0":function(container,depth0,helpers,partials,data) {
    return " group-other-target\" style=\"cursor: pointer;";
},"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"more") : depth0),"instanceof","number",{"name":"ifCond","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(4, data, 0),"data":data,"loc":{"start":{"line":3,"column":2},"end":{"line":35,"column":13}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"more") : depth0),">",0,{"name":"ifCond","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":3},"end":{"line":16,"column":14}}})) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <div class=\"group-more-marker\">\n                    <i>●</i>\n                </div>\n                <div class=\"group-other-block\">\n                    <div class=\"group-other-bar\"></div>\n                    <div class=\"group-other-label-container\">\n                        <span class=\"group-other-label-count\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"more") || (depth0 != null ? lookupProperty(depth0,"more") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"more","hash":{},"data":data,"loc":{"start":{"line":11,"column":62},"end":{"line":11,"column":70}}}) : helper)))
    + "+</span>\n                        <span class=\"group-other-label-other\">other</span>\n                        <span class=\"group-other-label-show-more group-more-target\">show more</span>\n                    </div>\n                </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <div class=\"group-other-block\">\n				<div class=\"group-other-label-container\">\n"
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"more") : depth0),"instanceof","Array",{"name":"ifCond","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(11, data, 0),"data":data,"loc":{"start":{"line":20,"column":5},"end":{"line":32,"column":16}}})) != null ? stack1 : "")
    + "				</div>\n			</div>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "						<span class=\"group-other-label-show-more group-more-not-target\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"more") : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":22,"column":6},"end":{"line":28,"column":15}}})) != null ? stack1 : "")
    + "						</span>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),depth0,"instanceof","object",{"name":"ifCond","hash":{},"fn":container.program(7, data, 0),"inverse":container.program(10, data, 0),"data":data,"loc":{"start":{"line":23,"column":7},"end":{"line":27,"column":18}}})) != null ? stack1 : "");
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "								<span class=\""
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"clickable") : depth0),"===",true,{"name":"ifCond","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":24,"column":21},"end":{"line":24,"column":82}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"class") : depth0),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":24,"column":82},"end":{"line":24,"column":111}}})) != null ? stack1 : "")
    + "\" index="
    + alias4(((helper = (helper = lookupProperty(helpers,"index") || (data && lookupProperty(data,"index"))) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data,"loc":{"start":{"line":24,"column":119},"end":{"line":24,"column":129}}}) : helper)))
    + ">"
    + alias4(((helper = (helper = lookupProperty(helpers,"label") || (depth0 != null ? lookupProperty(depth0,"label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"label","hash":{},"data":data,"loc":{"start":{"line":24,"column":130},"end":{"line":24,"column":139}}}) : helper)))
    + "</span>\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "group-more-target ";
},"9":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"class") || (depth0 != null ? lookupProperty(depth0,"class") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"class","hash":{},"data":data,"loc":{"start":{"line":24,"column":95},"end":{"line":24,"column":104}}}) : helper)));
},"10":function(container,depth0,helpers,partials,data) {
    return "                                <span>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span>\n";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"more") : depth0),"===",true,{"name":"ifCond","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":30,"column":5},"end":{"line":32,"column":5}}})) != null ? stack1 : "");
},"12":function(container,depth0,helpers,partials,data) {
    return "						<span class=\"group-other-label-show-more group-more-target\">show more</span>\n					";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"group-more-container"
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(alias1,(depth0 != null ? lookupProperty(depth0,"more") : depth0),"instanceof","number",{"name":"ifCond","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":32},"end":{"line":1,"column":125}}})) != null ? stack1 : "")
    + "\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"more") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":1},"end":{"line":36,"column":8}}})) != null ? stack1 : "")
    + "</div>\n";
},"useData":true})