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

var UNITS = {
  Points: "pt",
  Pixels: "px",
  Inches: "in",
  Millimeters: "mm",
  Centimeters: "cm"
}
UNITS.Enumerated = [UNITS.Points, UNITS.Pixels, UNITS.Inches, UNITS.Millimeters, UNITS.Centimeters];

var SCALE_UNITS = ["metric", "imperial", "nautical"];

function isValidPDFUnit(value) {
  return check.isString(value) && value !== UNITS.Pixels && UNITS.Enumerated.indexOf(value) !== -1;
}

var Dimens = (function() {
  var IN_TO_CM = 2.54;
  var IN_TO_MM = 10 * IN_TO_CM;
  var IN_TO_PT = 72;
  var IN_TO_PX = 96;

  var _toInches = function(value, unit) {
    if (unit === UNITS.Inches) return value;
    if (unit === UNITS.Centimeters) return value / IN_TO_CM;
    if (unit === UNITS.Millimeters) return value / IN_TO_MM;
    if (unit === UNITS.Points) return value / IN_TO_PT;
    if (unit === UNITS.Pixels) return value / IN_TO_PX;
    console.error("Unrecognized unit: " + unit);
    return -1;
  }

  var _isValidDimensionObject = function(obj) {
    if (!check.isObject(obj)) return false;
    if (!obj.hasOwnProperty("width") || !obj.hasOwnProperty("height") || !obj.hasOwnProperty("unit")) return false;
    if (!check.isNumber(obj.width) || !check.isNumber(obj.height) || !check.isString(obj.unit)) return false;
    if (obj.width < 0 || obj.height < 0 || UNITS.Enumerated.indexOf(obj.unit) == -1) return false;
    return true;
  }

  var _toDimension = function(obj) {
    if(obj instanceof Dimens) return obj;
    if (!_isValidDimensionObject(obj)) return null;
    return new Dimens(obj.width, obj.height, obj.unit);
  }

  var _add = function(dimensOne, dimensTwo) {
    dimensTwo = dimensTwo.to(dimensOne.unit());
    return new Dimens(dimensOne.width() + dimensTwo.width(),
    dimensOne.height() + dimensTwo.height(), dimensOne.unit());
  }

  var _createPDFDimension = function(obj) {
    if(!isValidPDFUnit(obj.unit)) return null;
    if(obj instanceof Dimens) return obj;
    if (!_isValidDimensionObject(obj)) return null;

    return new Dimens(obj.width, obj.height, obj.unit);
  }


  var _subtractMargin = function(dimensions, margins) {
    var convMargins = margins.to(dimensions.unit());
    return new Dimens(dimensions.width() - margins.left() - margins.right(),
      dimensions.height() - margins.top() - margins.bottom(), dimensions.unit());
  }
  var _to = function(value, unitFrom, unitTo) {
    if (unitFrom === unitTo) return value;

    value = _toInches(value, unitFrom);
    if (value === -1) return value;

    if (unitTo === UNITS.Inches) return value;
    if (unitTo === UNITS.Centimeters) return value * IN_TO_CM;
    if (unitTo === UNITS.Millimeters) return value * IN_TO_MM;
    if (unitTo === UNITS.Points) return value * IN_TO_PT;
    if (unitTo === UNITS.Pixels) return value * IN_TO_PX;
    console.error("Unrecognized unit: " + unitTo);
    return -1;
  };
  var constructor = function(width, height, unit) {
    this.to = function(unitTo) {
      return new Dimens(Dimens.to(width, unit, unitTo), Dimens.to(height, unit, unitTo), unitTo);
    };

    this.toString = function() {
      return "width: " + width + unit + "; height: " + height + unit + ";";
    };

    this.subtractMargin = function(margin) {
      return Dimens.subtractMargin(this, margin);
    }

    this.add = function(toAdd) {
      return _add(this, toAdd);
    }

    this.width = function() {
      return width;
    }
    this.height = function() {
      return height;
    }
    this.unit = function() {
      return unit;
    }
  }
  constructor.isValidDimensionObject = _isValidDimensionObject;
  constructor.toDimension = _toDimension;
  constructor.createPDFDimension = _createPDFDimension;
  constructor.subtractMargin = _subtractMargin;
  constructor.to = _to;
  constructor.add = _add;
  return constructor;
})();

var Margin = (function() {

  var _isValidMargin = function(margin) {
    if (check.isNumber(margin) && margin >= 0) return true;
    if (!check.isObject(margin)) return false;
    if (!margin.hasOwnProperty("top") || !margin.hasOwnProperty("bottom") ||
      !margin.hasOwnProperty("right") || !!margin.hasOwnProperty("left")) return false;
    if ((!check.isNumber(margin.top) || margin.top < 0) ||
      (!check.isNumber(margin.bottom) || margin.bottom < 0) ||
      (!check.isNumber(margin.left) || margin.left < 0) ||
      (!check.isNumber(margin.right) || margin.right < 0)) return false;

    return true;
  }
  var _createPDFMargin = function(margin, unit) {
    if (!isValidPDFUnit(unit) || !_isValidMargin(margin)) return null;
    if (check.isNumber(margin)) {
      return new Margin({
        top: margin,
        left: margin,
        right: margin,
        bottom: margin
      }, unit);
    } else {
      return new Margin(margin, unit);
    }
  }
  var constructor = function(margins, unit) {
    var right = margins.right;
    var left = margins.left;
    var top = margins.top;
    var bottom = margins.bottom;

    this.to = function(toUnit) {
      return new Margin({
        right: Dimens.to(right, unit, toUnit),
        left: Dimens.to(left, unit, toUnit),
        top: Dimens.to(top, unit, toUnit),
        bottom: Dimens.to(bottom, unit, toUnit),
      }, toUnit)
    };

    this.top = function() {
      return top;
    }
    this.left = function() {
      return left;
    }
    this.right = function() {
      return right;
    }
    this.bottom = function() {
      return bottom;
    }
    this.toArray = function() {
      return [top, left, bottom, right];
    }
  }

  constructor.createPDFMargin = _createPDFMargin;
  return constructor;
})()

var Size = function(value, unit) {
  this.to = function(toUnit) {
    return new Size(Dimens.to(value, unit, toUnit), toUnit);
  }

  this.value = function() {
    return value;
  }
  this.unit = function() {
    return unit;
  }
}

module.exports = {
  Dimens: Dimens,
  Margin: Margin,
  Size: Size,
  UNITS: UNITS,
  SCALE_UNITS: SCALE_UNITS
}
