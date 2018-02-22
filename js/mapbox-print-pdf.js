/*
 * Print Maps - High-resolution maps in the browser, for printing
 * Copyright (c) 2015-2018 Matthew Petroff
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

var jsPDF = require("jspdf");
var html2canvas = require("html2canvas");
var QUIESCE_TIMEOUT = 500;
var ATTRIBUTION_RATIO = 0.01;
var HTML_DOC_STYLE = "display: inline-flex; flex-direction: column;";
var MAP_CONTAINER_STYLE = "flex: 1 0 auto;";
var HIDDEN_CONTAINER_STYLE = "overflow: hidden; height: 0; width: 0; position: fixed;";

var UNITS = {
  Points: "pt",
  Pixels: "px",
  Inches: "in",
  Millimeters: "mm",
  Centimeters: "cm"
}
UNITS.Enumerated = [UNITS.Points, UNITS.Pixels, UNITS.Inches, UNITS.Millimeters, UNITS.Centimeters];

var SCALE_UNITS = ["metric", "imperial", "nautical"];

function isString(obj) {
  return typeof obj === 'string' || obj instanceof String;
}

function isHTMLElement(obj) {
  return obj instanceof Element;
}

function isFunction(obj) {
  return obj instanceof Function;
}

function isObject(obj) {
  return obj === Object(obj);
}

function isNumber(obj) {
  return typeof obj === 'number' || (typeof o == "object" && o.constructor === Number);
}

function isValidPDFUnit(value) {
  return isString(value) && value !== UNITS.Pixels && UNITS.Enumerated.indexOf(value) !== -1;
}

function isSameAspectRatio(first, second) {
  second = second.to(first.unit());
  var firstRatio = first.width() / first.height();
  var secondRatio = second.width() / second.height();
  return Math.floor(100 * firstRatio) === Math.floor(100 * secondRatio);
}

function isValidScaleObject(value) {
  if (!isObject(value)) return false;
  if (!value.hasOwnProperty("maxWidthPercent") || !value.hasOwnProperty("unit")) return false;
  if (!isNumber(value.maxWidthPercent) || !isString(value.unit)) return false;
  if (value.maxWidthPercent <= 0 || SCALE_UNITS.indexOf(value.unit) === -1) return false;
  if (value.maxWidthPercent > 1) value.maxWidthPercent /= 100;
  return true;;
}

function setFontSizeRelativeToFormat(target, format, element) {
  if (!target || !target.fontSize) return;
  var fontSize = target.fontSize;
  format = format.to(element.unit());
  var percent = element.width() / format.width();
  target.html.style.fontSize = fontSize.size * percent + fontSize.unit;
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
    if (!isObject(obj)) return false;
    if (!obj.hasOwnProperty("width") || !obj.hasOwnProperty("height") || !obj.hasOwnProperty("unit")) return flase
    if (!isNumber(obj.width) || !isNumber(obj.height) || !isString(obj.unit)) return false;
    if (obj.width <= 0 || obj.height <= 0 || UNITS.Enumerated.indexOf(obj.unit) == -1) return false;
    return true;
  }

  var _toDimension = function(obj) {
    if (_isValidDimensionObject(obj)) return null;
    return new Dimens(obj.width, obj.height, obj.unit);
  }

  var _createPDFDimension = function(obj) {
    if (_isValidDimensionObject(obj) || !isValidPDFUnit(obj.unit)) return null;
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
  return constructor;
})();

var Margin = (function() {

  var _isValidMargin = function(margin) {
    if (isNumber(margin) && margin >= 0) return true;
    if (!isObject(margin)) return false;
    if (!margin.hasOwnProperty("top") || !margin.hasOwnProperty("bottom") ||
      !margin.hasOwnProperty("right") || !!margin.hasOwnProperty("left")) return false;
    if ((!isNumber(margin.top) || margin.top < 0) ||
      (!isNumber(margin.bottom) || margin.bottom < 0) ||
      (!isNumber(margin.left) || margin.left < 0) ||
      (!isNumber(margin.right) || margin.right < 0)) return false;

    return true;
  }
  var _createPDFMargin = function(margin, unit) {
    if (!isValidPDFUnit(unit) || !_isValidMargin(margin)) return null;
    if (isNumber(margin)) {
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

function calculateMaxSize(map) {
  var maxSize = -1;
  if (map && map.loaded()) {
    var canvas = map.getCanvas();
    var gl = canvas.getContext('experimental-webgl');
    maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  }
  return maxSize;
}

function ensureAspectRatio(dimensions, bounds) {
  var convertedBounds = bounds.to(dimensions.unit());
  var widthToHeightRatio = convertedBounds.width() / convertedBounds.height();
  if (widthToHeightRatio < 1) {
    return new Dimens(dimensions.width(), dimensions.width() / widthToHeightRatio, dimensions.unit());
  } else {
    return new Dimens(dimensions.height() * widthToHeightRatio, dimensions.height(), dimensions.unit());
  }
}

function growToAtLeastBounds(dimensions, bounds) {
  var convertedBounds = bounds.to(dimensions.unit());
  var correctedDimensions = ensureAspectRatio(dimensions, convertedBounds);
  if (correctedDimensions.width() < convertedBounds.width()) return convertedBounds;
  return correctedDimensions;
}

function validateSize(size, dpi, map) {
  var maxSize = calculateMaxSize(map);
  if (maxSize <= 0) return {
    error: "Couldn't calculate the maximum size of the render buffer"
  };
  var inches = size.to(UNITS.Inches);
  if (inches.value() * dpi > maxSize) {
    return {
      error: 'The maximum image dimension is ' + maxSize + 'px, but the size entered is ' + (inches.value() * dpi) + 'px.'
    };
  }
  return {
    success: true
  };
}

function validateDimensions(dimens, dpi, map) {
  var res = validateSize(new Size(dimens.height(), dimens.unit()), dpi, map);
  if (!res.success) return {
    error: "Invalid height: " + res.error
  };
  res = validateSize(new Size(dimens.width(), dimens.unit()), dpi, map);
  if (!res.success) return {
    error: "Invalid width: " + res.error
  };

  return {
    success: true
  };
}

function getDpiForSize(size, map) {
  var maxSize = calculateMaxSize(map);
  if (maxSize <= 0) return {
    error: "Couldn't calculate the maximum size of the render buffer"
  };

  return {
    result: maxSize / size.to(UNITS.Inches).value()
  };
}

/*function drawAttribution(mapCanvas, attribution, font) {
  var canvas = document.createElement('canvas');
  canvas.width = mapCanvas.width;
  canvas.height = mapCanvas.height;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(mapCanvas, 0, 0);
  var fontSize = Math.floor(canvas.width*ATTRIBUTION_RATIO);
  var heightFontSize = Math.floor(canvas.height*ATTRIBUTION_RATIO);
  fontSize = fontSize > heightFontSize ? fontSize : heightFontSize;
  ctx.font = fontSize + "px " + font;

  ctx.textAlign="right";
  ctx.textBaseline="bottom";
  ctx.fillText(attribution, canvas.width-10, canvas.height-10);
  return canvas;
}*/

function getOrientedDimensions(dimensions, orientation) {
  if (orientation == "l") {
    return new Dimens(dimensions.height(), dimensions.width(), dimensions.unit());
  }
  return dimensions;
}

function createOrReturnHTML(html) {
  if (isString(html)) {
    var template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
  } else if (isHTMLElement(html)) {
    return html;
  } else {
    console.error(html + " is not a html element or string");
    return null;
  }
}

function createHTMLObject(htmlObj) {
  if (isString(htmlObj) || isHTMLElement(htmlObj)) {
    var tmpHtml = createOrReturnHTML(htmlObj);
    if (tmpHtml) return {
      html: tmpHtml
    };
  } else if (isObject(htmlObj) && htmlObj.hasOwnProperty("html")) {
    var tmpObj = createOrReturnHTML(htmlObj.html);
    if (tmpObj) {
      htmlObj.html = tmpObj;
      return htmlObj;
    } else {
      console.error("Invalid input: " + nwHeader);
    }
  } else {
    console.error("Invalid input: " + nwHeader);
  }
  return null;
}

function calculateMaximumValidDpi(size, map, dpi) {
  var sizeValid = validateSize(size, dpi, map);
  if (sizeValid.success) return dpi;
  console.error(sizeValid.error);
  var dpiRes = getDpiForSize(size, map);
  if (dpiRes.error) {
    console.error("Error when calculating dpi for size: " + dpiRes.error);
    dpiRes.result = dpi;
  }
  return dpiRes.result;
}


function waitForMapToRender(map, callback) {
  var noneLoaded = false;
  var initial = true;
  return new Promise(function(resolve, reject) {
    var quiesce = function() {
      if (!noneLoaded || (!map.loaded() || !map.isStyleLoaded() || !map.areTilesLoaded())) {
        noneLoaded = true;
        setTimeout(quiesce, QUIESCE_TIMEOUT);
      } else {
        map.off('render', renderListener);
        resolve();
      }
    }
    var renderListener = function() {
      noneLoaded = false;
      if (initial && map.loaded() && map.isStyleLoaded() && map.areTilesLoaded()) {
        initial = false;
        quiesce();
      }
    }
    map.on('render', renderListener);
  });

}

function addDocumentContainer() {
  var hidden = document.createElement('div');
  hidden.setAttribute("style", HIDDEN_CONTAINER_STYLE)
  document.body.appendChild(hidden);
  var htmlDoc = document.createElement("div");
  htmlDoc.setAttribute("style", HTML_DOC_STYLE);
  hidden.appendChild(htmlDoc);
  document.body.appendChild(hidden);
  return hidden;
}

function addDocumentHeader(header, doc) {
  if (header) {
    var headerDiv = document.createElement("div");
    headerDiv.appendChild(header.html);
    doc.insertBefore(headerDiv, doc.firstChild);
  }
  return header;
}

function addDocumentFooter(footer, doc) {
  if (footer) {
    var footerDiv = document.createElement("div");
    //footerDiv.setAttribute("style", "flex: 0 0 auto")
    footerDiv.appendChild(footer.html);
    doc.appendChild(footerDiv);
  }
  return footer;
}

function addMapContainer(doc, map) {
  var container = document.createElement('div');

  container.setAttribute("style", MAP_CONTAINER_STYLE + " min-width: " +
    map._container.scrollWidth + "px; min-height: " +
    map._container.scrollHeight + "px;");
  doc.appendChild(container);
  return container;
}



function addScale(map, scale, mapboxgl) {
  if (scale) {
    map.addControl(new mapboxgl.ScaleControl({
      maxWidth: scale.maxWidthPercent * map._container.scrollWidth,
      unit: scale.unit
    }));
  };
}

function replaceMapWithImage(map) {
  var container = map._container;
  var htmlDoc = container.parentNode;
  var mapImage = document.createElement("img");
  mapImage.src = map.getCanvas().toDataURL("image/png");
  mapImage.style.width = "100%";
  mapImage.style.height = "100%";
  map.remove();
  container.innerHTML = "";
  container.appendChild(mapImage);
}

var PrintPdf = (function() {
  var DEFAULT_FORMATS = {
    'a0': new Dimens(2383.94, 3370.39, UNITS.Points),
    'a1': new Dimens(1683.78, 2383.94, UNITS.Points),
    'a2': new Dimens(1190.55, 1683.78, UNITS.Points),
    'a3': new Dimens(841.89, 1190.55, UNITS.Points),
    'a4': new Dimens(595.28, 841.89, UNITS.Points),
    'a5': new Dimens(419.53, 595.28, UNITS.Points),
    'a6': new Dimens(297.64, 419.53, UNITS.Points),
    'a7': new Dimens(209.76, 297.64, UNITS.Points),
    'a8': new Dimens(147.40, 209.76, UNITS.Points),
    'a9': new Dimens(104.88, 147.40, UNITS.Points),
    'a10': new Dimens(73.70, 104.88, UNITS.Points),
    'b0': new Dimens(2834.65, 4008.19, UNITS.Points),
    'b1': new Dimens(2004.09, 2834.65, UNITS.Points),
    'b2': new Dimens(1417.32, 2004.09, UNITS.Points),
    'b3': new Dimens(1000.63, 1417.32, UNITS.Points),
    'b4': new Dimens(708.66, 1000.63, UNITS.Points),
    'b5': new Dimens(498.90, 708.66, UNITS.Points),
    'b6': new Dimens(354.33, 498.90, UNITS.Points),
    'b7': new Dimens(249.45, 354.33, UNITS.Points),
    'b8': new Dimens(175.75, 249.45, UNITS.Points),
    'b9': new Dimens(124.72, 175.75, UNITS.Points),
    'b10': new Dimens(87.87, 124.72, UNITS.Points),
    'c0': new Dimens(2599.37, 3676.54, UNITS.Points),
    'c1': new Dimens(1836.85, 2599.37, UNITS.Points),
    'c2': new Dimens(1298.27, 1836.85, UNITS.Points),
    'c3': new Dimens(918.43, 1298.27, UNITS.Points),
    'c4': new Dimens(649.13, 918.43, UNITS.Points),
    'c5': new Dimens(459.21, 649.13, UNITS.Points),
    'c6': new Dimens(323.15, 459.21, UNITS.Points),
    'c7': new Dimens(229.61, 323.15, UNITS.Points),
    'c8': new Dimens(161.57, 229.61, UNITS.Points),
    'c9': new Dimens(113.39, 161.57, UNITS.Points),
    'c10': new Dimens(79.37, 113.39, UNITS.Points),
    'dl': new Dimens(311.81, 623.62, UNITS.Points),
    'letter': new Dimens(612, 792, UNITS.Points),
    'government-letter': new Dimens(576, 756, UNITS.Points),
    'legal': new Dimens(612, 1008, UNITS.Points),
    'junior-legal': new Dimens(576, 360, UNITS.Points),
    'ledger': new Dimens(1224, 792, UNITS.Points),
    'tabloid': new Dimens(792, 1224, UNITS.Points),
    'credit-card': new Dimens(153, 243, UNITS.Points)
  };

  var userFormats = {};

  var _getFormats = function() {
    var formatsCopy = {};
    for (var format in DEFAULT_FORMATS) {
      if (DEFAULT_FORMATS.hasOwnProperty(format)) {
        formatsCopy[format] = DEFAULT_FORMATS[format];
      };
    }
    for (var format in userFormats) {
      if (userFormats.hasOwnProperty(format)) {
        formatsCopy[format] = userFormats[format];
      }
    }
    return formatsCopy;
  };

  var _isDefaultFormat = function(format) {
    if (userFormats.hasOwnProperty(format)) return false;
    return DEFAULT_FORMATS.hasOwnProperty(format);
  }

  var _addFormat = function(format, dimension) {
    if (userFormats.hasOwnProperty(format)) return {
      error: "Format " + format + " already exists"
    };
    if (!(dimension instanceof Dimens)) return {
      error: "Dimensions are of an invalid type"
    };
    userFormats[format] = dimension;
    return {
      success: true
    };
  }

  var _getFormat = function(format) {
    if (userFormats.hasOwnProperty(format)) return userFormats[format];
    if (DEFAULT_FORMATS.hasOwnProperty(format)) return DEFAULT_FORMATS[format];
    console.error("The format " + format + " doesn't exist.");
    return null;
  }

  var _build = function() {
    return new PdfBuilder();
  }

  return {
    getFormats: _getFormats,
    isDefaultFormat: function(format) {
      return _isDefaultFormat(format.toLowerCase());
    },
    addFormat: function(format, width, height, unit) {
      return _addFormat(format.toLowerCase(), width, height, unit);
    },
    getFormat: function(format) {
      return _getFormat(format.toLowerCase());
    },
    build: _build
  }
})();


var PdfBuilder = (function() {

  var constructor = function() {
    var format = "a4";
    var renderingDimensions = null;
    var dpi = 300;
    var orientation = "p";
    var htmlDoc = null;
    var header = null;
    var footer = null;
    var scale = null;
    var actualPixelRatio = -1;
    var margins = Margin.createPDFMargin(0, UNITS.Points);
    var that = this;

    var _cleanup = function() {
      var mainContainer = htmlDoc.parentNode;
      mainContainer.parentNode.removeChild(mainContainer);
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return actualPixelRatio
        }
      });
    };

    var _printMap = function(map) {
      return new Promise(function(resolve, reject) {
        var dimensions = PrintPdf.getFormat(format);
        var orientedDimensions = getOrientedDimensions(dimensions, orientation);
        var convMargins = margins.to(dimensions.unit());
        replaceMapWithImage(map);

        var jsPdfOpts = {
          unit: dimensions.unit(),
          format: [dimensions.width(), dimensions.height()],
          orientation: orientation,
          compress: true
        };
        if (PrintPdf.isDefaultFormat(format)) {
          jsPdfOpts.format = format;
        }
        html2canvas(htmlDoc, {
          letterRendering: true,
          useCORS: true,
          scale: 2
        }).then(function(canvas) {
          var pdf = new jsPDF(jsPdfOpts);

          pdf.addImage(canvas, 'png', convMargins.left(), convMargins.top(),
            orientedDimensions.width() - convMargins.left() - convMargins.right(),
            orientedDimensions.height() - convMargins.top() - convMargins.bottom(), null, 'FAST');

          _cleanup()
          resolve(pdf);
        });
      });

    }

    var _resizeToFormat = function(formatDimens, elem) {
      var newSize;
      var elemDimens = new Dimens(elem.scrollWidth, elem.scrollHeight, UNITS.Pixels);
      do {
        var newSize = growToAtLeastBounds(elemDimens, formatDimens).to(UNITS.Pixels);
        elem.style.width = newSize.width() + newSize.unit();
        elem.style.height = newSize.height() + newSize.unit();

        setFontSizeRelativeToFormat(header, renderingDimensions, newSize);
        setFontSizeRelativeToFormat(footer, renderingDimensions, newSize);

        elemDimens = new Dimens(elem.scrollWidth, elem.scrollHeight, UNITS.Pixels);
      } while (!isSameAspectRatio(elemDimens, formatDimens));
    }

    var _adjustDPI = function(map) {
      var newDpi = Math.min(
        calculateMaximumValidDpi(new Size(map._container.scrollWidth, UNITS.Pixels), map, dpi),
        calculateMaximumValidDpi(new Size(map._container.scrollHeight, UNITS.Pixels), map, dpi)
      );
      if (newDpi != dpi) {
        dpi = newDpi;
        hidden.parentNode.removeChild(hidden);
        document.body.appendChild(hidden);
      }
    };

    var _createHTMLDocument = function(map) {
      actualPixelRatio = window.devicePixelRatio;
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return dpi / 96
        }
      });

      renderingDimensions = getOrientedDimensions(PrintPdf.getFormat(format), orientation).subtractMargin(margins);
      var hidden = addDocumentContainer();
      htmlDoc = hidden.firstChild;
      addDocumentHeader(header, htmlDoc);
      var container = addMapContainer(htmlDoc, map);
      addDocumentFooter(footer, htmlDoc);
      _resizeToFormat(renderingDimensions, htmlDoc);
      _adjustDPI(map);
      return container;
    }

    var _createPrintMap = function(map, mapboxgl, container) {
      var renderMap = new mapboxgl.Map({
        container: container,
        center: map.getCenter(),
        zoom: map.getZoom(),
        style: map.getStyle(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        interactive: false,
        attributionControl: false,
        preserveDrawingBuffer: true
      });

      addScale(renderMap, scale, mapboxgl);
      return renderMap;
    };

    this.format = function(nwFormat) {
      if (isString(nwFormat) && PrintPdf.getFormat(nwFormat)) {
        format = nwFormat;
      } else if (isObject(nwFormat)) {
        var dimensions = Dimens.createPDFDimension(nwFormat);
        if (dimensions == null || !nwFormat.hasOwnProperty("name")) {
          console.error("Invalid format: " + nwFormat);
        } else {
          PrintPdf.addFormat(nwFormat.name, dimensions)
        }
      }
      return that;
    };

    this.dpi = function(nwDpi) {
      if (nwDpi <= 0) {
        console.error("The dpi must be greater than 0, given value was " + nwDpi);
        return that;
      }
      dpi = nwDpi;
      return that;
    };

    this.landscape = function() {
      orientation = "l";
      return that;
    };

    this.portrait = function() {
      orientation = "p";
      return that;
    };

    this.header = function(nwHeader) {
      var tmpHeader = createHTMLObject(nwHeader);
      if (tmpHeader) header = tmpHeader;
      return that;
    }

    this.footer = function(nwFooter) {
      var tmpFooter = createHTMLObject(nwFooter);
      if (tmpFooter) footer = tmpFooter;
      return that;
    }

    this.scale = function(nwScale) {
      if (isValidScaleObject(nwScale)) {
        scale = nwScale;
      } else {
        console.error("The given scale is invalid: " + nwScale);
      }
      return that;
    }

    this.margins = function(nwMargins, unit) {
      var tmpMargins = Margin.createPDFMargin(nwMargins, unit ? unit : UNITS.Millimeters);
      if (tmpMargins) {
        margins = tmpMargins;
      } else {
        console.error("The provided arguments are invalid: " + nwMargins + ", " + unit);
      }
      return that;
    }

    this.print = function(map, mapboxgl) {
      if (!map.loaded()) {
        var that = this;
        return new Promise(function(resolve, reject) {
          map.once('load', function() {
            that.print(map, mapboxgl).then(resolve, reject);
          })
        });
      }
      return new Promise(function(resolve, reject) {
        var res = validateDimensions(PrintPdf.getFormat(format), dpi, map);
        if (!res.success) {
          reject(res);
          return;
        }
        var container = _createHTMLDocument(map);
        var renderMap = _createPrintMap(map, mapboxgl, container);
        waitForMapToRender(renderMap).then(function() {
          _printMap(renderMap).then(resolve);
        });
      });
    }

  };
  return constructor;
})();

module.exports = PrintPdf;
