var check = require("./type-check.js");

var SUPPORTED_UNITS = ["px", "pt", "rem", "cm", "mm", "in", "pc"];
var SCALE_PROPERTIES = [
  "backgroundSize",
  "borderWidth",
  "margin", "padding",
  "bottom", "top", "left", "right",
  "columnGap",
  "columnRuleWidth",
  "columnWidth",
  "flexBasis",
  "fontSize", "lineHeight", "letterSpacing", "wordSpacing",
  "minWidth", "minHeight", "maxHeight", "maxWidth",
  "outlineWidth",
  "textIndent"
];
var ATTR_SCALE_PROPS = "data-scale-props";
var ATTR_SCALE_EXCLUDE_PROPS = "data-scale-exlude-props";
var CLASS_SCALE_EXCLUDE = "_scale-exclude";
var CLASS_SCALE_HALT = "_scale-halt";
var CLASS_SCALE_CUSTOM = "_scale-custom";
var UNITS_REGEX = makePropertyRegex(SUPPORTED_UNITS);

function toSnakeCase(string) {
  return string.replace(/([A-Z])/g, "-$1").toLowerCase();
}
function makePropertyRegex(units) {
  return new RegExp("^(\\d+\\.?\\d*)(" + units.join("|") + ")$");
}

var StyleSize = (function(supportedUnits){
  var _constructor = function(values) {
    this.scale = function(percent) {
      for(var i = 0; i < values.length; ++i) {
        if(check.isString(values[i]) || supportedUnits.indexOf(values[i].unit) === -1) continue;
        values[i].size *= percent;
      }
      return this;
    }
    this.toString = function() {
      var string = "";
      for(var i = 0; i < values.length; ++i) {
        if(i > 0) string += " ";
        if(check.isString(values[i])) {
          string += values[i];
          continue;
        }
        string += values[i].size + values[i].unit;
      }
      return string;
    }
  }
  var _fromString = function(string, regex) {
    var styleValues = string.split(" ");
    values = [];
    var atLeastOneMatch = false;
    for(var i = 0; i < styleValues.length; ++i) {
      var match = regex.exec(styleValues[i]);

      if(!match || match.length != 3) {
        values.push(styleValues[i]);
        continue;
      }
      atLeastOneMatch = true;
      values.push({size: Number(match[1]), unit: match[2]});
    }
    if(!atLeastOneMatch) return null;
    return new _constructor(values);
  }
  return {fromString: _fromString};
})(SUPPORTED_UNITS);

var Scaling = (function() {
  var constructor = function(percent, properties, exclude) {
    this.properties = properties;
    this.exclude = exclude;

    this.percent = function() { return percent; }
  }
  return constructor;
})();

function getStyle(elem){

 if (elem.currentStyle) {
   return {style: elem.currentStyle, snakeCase: false};

 // other browsers
 } else if (document.defaultView &&
   document.defaultView.getComputedStyle) {
   return {style: document.defaultView.getComputedStyle(elem), snakeCase: true};
 } else {
   return null;
 }
}

function scaleSingleElement(element, scaleObj, newStyles) {
  var className = element.className;
  if(className.indexOf(CLASS_SCALE_EXCLUDE) === -1) {
    if(element.hasAttribute(ATTR_SCALE_PROPS)) scaleObj.properties = element.getAttribute(ATTR_SCALE_PROPS).split(" ") ;
    if(element.hasAttribute(ATTR_SCALE_EXCLUDE_PROPS)) scaleObj.exclude = element.getAttribute(ATTR_SCALE_EXCLUDE_PROPS).split(" ");
    var style = getStyle(element);
    if(style) {
      for(var i = 0; i < scaleObj.properties.length; ++i) {
        var prop = scaleObj.properties[i];
        if(scaleObj.exclude.indexOf(prop) !== -1) continue;
        var propValue = style.snakeCase ? style.style.getPropertyValue(toSnakeCase(prop)) : style.style[prop];
        var scaleValue = StyleSize.fromString(propValue, UNITS_REGEX);
        if(scaleValue) newStyles.push({elem: element, prop: prop, value: scaleValue.scale(scaleObj.percent()).toString()})
      }
    }
  }

}
function recursiveScale(element, handlers, scaleObj, newStyles) {
  var className = element.className;
  if(className.indexOf(CLASS_SCALE_CUSTOM) !== -1) {
    var id = element.id;
    if(check.isFunction(handlers[id])) {
      var tmpStyles = handlers[id](element, scaleObj.percent());
      if(check.isArray(tmpStyles)) newStyles.push.apply(newStyles, tmpStyles);
    }
  } else {
    scaleSingleElement(element, scaleObj, newStyles);
  }
  if(className.indexOf(CLASS_SCALE_HALT) !== -1) return;
  for(var i = 0; i < element.children.length; ++ i) {
    recursiveScale(element.children[i], handlers, scaleObj, newStyles);
  }
}

function applyStyles(newStyles) {
  for(var i = 0; i < newStyles.length; ++i) {
    var style = newStyles[i];
    style.elem.style[style.prop] = style.value;
  }
}

function scaleElements(elements, handlers, percent) {
  if(!check.isArray(elements) || !check.isNumber(percent) || percent <= 0) return;
  if(Math.round(percent*100) == 100) return;

  var newStyles = [];
  for(var i = 0; i < elements.length; ++i) {
    if(!check.isHTMLElement(elements[i])) continue;
    recursiveScale(elements[i], handlers, new Scaling(percent, SCALE_PROPERTIES, []), newStyles);
  }
  applyStyles(newStyles);
}

module.exports = scaleElements;
