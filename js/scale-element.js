/*
 * Mapbox Print Pdf - Printing PDFs with high resolution mapbox maps
 * Copyright (c) 2018 Eddie Larsson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var check = require("./type-check.js");
var Dimens = require("./dimensions.js").Dimens;
var SUPPORTED_UNITS = ["px", "pt", "rem", "cm", "mm", "in", "pc"];
var ATTR_SCALE_WIDTH = "data-scale-width";
var ATTR_SCALE_HEIGHT = "data-scale-height";
var ATTR_SCALE_SUM = "data-scale-sum";
var ATTR_HANDLER = "data-scale-handler";
var UNITS_REGEX = makePropertyRegex(SUPPORTED_UNITS);

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function toCamelCase(string) {
  return str.replace(/-([a-z])/g, function (match) {
    return match[1].toUpperCase();
  });
}

function makePropertyRegex(units) {
  return new RegExp("^(\\d+\\.?\\d*)(" + units.join("|") + ")$");
}

var StyleSize = (function(supportedUnits) {
  var _constructor = function(values) {
    this.scale = function(percent) {
      for (var i = 0; i < values.length; ++i) {
        if (check.isString(values[i]) || supportedUnits.indexOf(values[i].unit) === -1) continue;
        values[i].size *= percent;
      }
      return this;
    }
    this.toString = function() {
      var string = "";
      for (var i = 0; i < values.length; ++i) {
        if (i > 0) string += " ";
        if (check.isString(values[i])) {
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
    for (var i = 0; i < styleValues.length; ++i) {
      var match = regex.exec(styleValues[i]);

      if (!match || match.length != 3) {
        values.push(styleValues[i]);
        continue;
      }
      atLeastOneMatch = true;
      values.push({
        size: Number(match[1]),
        unit: match[2]
      });
    }
    if (!atLeastOneMatch) return null;
    return new _constructor(values);
  }
  return {
    fromString: _fromString
  };
})(SUPPORTED_UNITS);

var Scaling = (function() {
  var constructor = function(percent, properties, exclude) {
    this.properties = properties;
    this.exclude = exclude;

    this.percent = function() {
      return percent;
    }
  }
  return constructor;
})();

function getStyle(elem) {

  if (elem.currentStyle) {
    return {
      style: elem.currentStyle,
      snakeCase: false
    };

    // other browsers
  } else if (document.defaultView &&
    document.defaultView.getComputedStyle) {
    return {
      style: document.defaultView.getComputedStyle(elem),
      snakeCase: true
    };
  } else {
    return null;
  }
}

function scaleSingleElement(element, percent, properties, newStyles) {
  var className = element.className;
    var style = getStyle(element);
    if (style) {
      for (var i = 0; i < properties.length; ++i) {
        var prop = properties[i];
        var propValue = style.snakeCase ? style.style.getPropertyValue(toSnakeCase(prop)) : style.style[prop];
        var scaleValue = StyleSize.fromString(propValue, UNITS_REGEX);
        if (scaleValue) newStyles.push({
          elem: element,
          prop: prop,
          value: scaleValue.scale(percent).toString()
        });
      }
    }
}

function scaleByAttribute(element, attr, percent, newStyles) {
  if(element.hasAttribute(attr)) {
    var properties = toCamelCase(element.getAttribute(attr)).split(" ");
    scaleSingleElement(element, percent, properties, newStyles);
  }
}

function recursiveScale(element, handlers, scalingObj, newStyles) {
  var className = element.className;
  if (element.hasAttribute(ATTR_HANDLER)) {
    var handler = element.getAttribute(ATTR_HANDLER);
    if (handlers.hasOwnProperty(handler) && check.isFunction(handlers[id])) {
      var tmpStyles = handlers[id](element, scalingObj);
      if (check.isArray(tmpStyles)) newStyles.push.apply(newStyles, tmpStyles);
    }
  } else {
    scaleByAttribute(element, ATTR_SCALE_WIDTH, scalingObj.widthRatio, newStyles);
    scaleByAttribute(element, ATTR_SCALE_HEIGHT, scalingObj.heightRatio, newStyles);
    scaleByAttribute(element, ATTR_SCALE_SUM, scalingObj.sumRatio, newStyles);
  }
  for (var i = 0; i < element.children.length; ++i) {
    recursiveScale(element.children[i], handlers, scalingObj, newStyles);
  }
}

function applyStyles(newStyles) {
  for (var i = 0; i < newStyles.length; ++i) {
    var style = newStyles[i];
    style.elem.style[style.prop] = style.value;
  }
}

function scaleElement(element, handlers, orgDimens, currentDimens) {
  if (!check.isHTMLElement(element) || !(orgDimens instanceof Dimens) || !(currentDimens instanceof Dimens)) return;

  currentDimens = currentDimens.to(orgDimens.unit());
  var scalingObj = {original: orgDimens, current: currentDimens};
  scalingObj.heightRatio = currentDimens.height()/orgDimens.height();
  scalingObj.widthRatio = currentDimens.width()/orgDimens.width();
  scalingObj.sumRatio = (currentDimens.sum())/(orgDimens.sum());
  var newStyles = [];
  recursiveScale(element, handlers, scalingObj, newStyles);
  applyStyles(newStyles);
}

module.exports = scaleElement;
