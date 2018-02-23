/*
 * Mapbox Print Pdf - Printing PDFs with high resolution mapbox maps
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
var check = require("./type-check.js");
var scaleElement = require("./scale-element.js");
var dimensions = require("./dimensions.js")
var Dimens = dimensions.Dimens;
var Margin = dimensions.Margin;
var Size = dimensions.Size;
var UNITS = dimensions.UNITS;
var SCALE_UNITS = dimensions.SCALE_UNITS;
var QUIESCE_TIMEOUT = 500;
var HIDDEN_CONTAINER_STYLE = "overflow: hidden; height: 0; width: 0; position: fixed;";



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

  var _formatExists = function(format) {
    return userFormats.hasOwnProperty(format) || DEFAULT_FORMATS.hasOwnProperty(format);
  }

  var _addFormat = function(format, dimension) {
    if (userFormats.hasOwnProperty(format)) return {
      error: "Format " + format + " already exists"
    };
    if (!Dimens.isValidDimensionObject(dimension)) return {
      error: "Dimensions are of an invalid type"
    };
    userFormats[format] = Dimens.todoDimension(dimension);
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
    formatExists: function(format) {
      return _formatExists(format.toLowerCase());
    },
    build: _build
  }
})();

function isValidScaleObject(value) {
  if (!check.isObject(value)) return false;
  if (!value.hasOwnProperty("maxWidthPercent") || !value.hasOwnProperty("unit")) return false;
  if (!check.isNumber(value.maxWidthPercent) || !check.isString(value.unit)) return false;
  if (value.maxWidthPercent <= 0 || SCALE_UNITS.indexOf(value.unit) === -1) return false;
  if (value.maxWidthPercent > 1) value.maxWidthPercent /= 100;
  return true;;
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

function ensureAspectRatio(dimensions, format) {
  var convertedFormat = format.to(dimensions.unit());
  var widthToHeightRatio = convertedFormat.width() / convertedFormat.height();
  var tmpHeight = dimensions.width() / widthToHeightRatio;

  if(tmpHeight < dimensions.height()) {
    return new Dimens(dimensions.height() * widthToHeightRatio, dimensions.height(), dimensions.unit());
  } else {
    return new Dimens(dimensions.width(), dimensions.width() / widthToHeightRatio, dimensions.unit());
  }
}

function growToAtLeastFormat(dimensions, format) {
  var convertedFormat = format.to(dimensions.unit());
  var correctedDimensions = ensureAspectRatio(dimensions, convertedFormat);
  if (correctedDimensions.width() < convertedFormat.width()) return convertedFormat;
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

function ensureValidHTMLObject(obj) {
  if(!Dimens.isValidDimensionObject(obj.min)) obj.min = new Dimens(0, 0, UNITS.Points);
  obj.min = Dimens.toDimension(obj.min);
  if(!Dimens.isValidDimensionObject(obj.max)) obj.max = new Dimens(Number.MAX_VALUE, Number.MAX_VALUE, UNITS.Points);
  obj.max = Dimens.toDimension(obj.max);

  if(!check.isNumber(obj.heightPercent) || obj.heightPercent < 0 || obj.heightPercent >= 100) obj.heightPercent = 5;
  if(check.isObject(obj.scaling)) {
    var scaling = createScalingObject(obj.scaling);
    if(!scaling) {
      obj.scaling = null;
      console.error(scaling + " is not a valid scaling object.");
    } else {
      obj.scaling = scaling;
    }
  }
}

function createScalingObject(val) {
  if(Dimens.isValidDimensionObject(val)) {
    return {baseLine: Dimens.toDimension(val)};
  } else if(check.isString(val) && PrintPdf.formatExists(val)) {
    return {baseLine: PrintPdf.getFormat(val)};
  } else if(check.isObject(val) && val.hasOwnProperty("baseLine")) {
    if(Dimens.isValidDimensionObject(val.baseLine)) {
      val.baseLine = Dimens.toDimension(val.baseLine);
      return val;
    } else if(check.isString(val.baseLine) && PrintPdf.formatExists(val.baseLine)) {
      val.baseLine = PrintPdf.getFormat(val.baseLine);
      return val;
    }
  }
  return null;
}

function getOrientedDimensions(dimensions, orientation) {
  if (orientation == "l") {
    return new Dimens(dimensions.height(), dimensions.width(), dimensions.unit());
  }
  return dimensions;
}

function createOrReturnHTML(html) {
  if (check.isString(html)) {
    var template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
  } else if (check.isHTMLElement(html)) {
    return html;
  } else {
    console.error(html + " is not a html element or string");
    return null;
  }
}

function createHTMLObject(htmlObj) {
  if (check.isString(htmlObj) || check.isHTMLElement(htmlObj)) {
    var tmpHtml = createOrReturnHTML(htmlObj);
    if (tmpHtml) return {
      html: tmpHtml
    };
  } else if (check.isObject(htmlObj) && htmlObj.hasOwnProperty("html")) {
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

function createDocumentContainer() {
  var hidden = document.createElement('div');
  hidden.setAttribute("style", HIDDEN_CONTAINER_STYLE);
  var doc = document.createElement("div");
  doc.setAttribute("style", "display:inline-block;");
  hidden.appendChild(doc);
  document.body.appendChild(hidden);
  return doc;
}

function addHTMLObject(htmlObj, container, dimens) {
  dimens = dimens.to(UNITS.Pixels);
  if(check.isObject(htmlObj) && check.isHTMLElement(htmlObj.html)) {
    var htmlContainer = document.createElement('div');
    htmlContainer.style.width = dimens.width() + dimens.unit();
    htmlContainer.style.height = dimens.height() + dimens.unit();
    htmlContainer.appendChild(htmlObj.html);
    container.appendChild(htmlContainer);
  }
  return htmlObj;
}

function createMapContainer(container, dimens) {
  var mapContainer = document.createElement('div');
  dimens = dimens.to(UNITS.Pixels);
  mapContainer.style.width = dimens.width() + dimens.unit();
  mapContainer.style.height = dimens.height() + dimens.unit();
  mapContainer.style.backgroundColor = "red";
  container.appendChild(mapContainer);
  return mapContainer;
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
  var mapImage = document.createElement("img");
  mapImage.src = map.getCanvas().toDataURL("image/png");
  mapImage.style.width = "100%";
  mapImage.style.height = "100%";

  map.remove();
  container.innerHTML = "";
  container.appendChild(mapImage);
}

function calculateRenderSize(elements, mapDimens, innerFormat) {
  if(!check.isArray(elements)) return null;
  var _elements = [];
  var mapPercent = 100;
  var minHeight = mapDimens.height();
  var minWidth = mapDimens.width();
  for(var i = 0; i < elements.length; ++i) {
    if(!check.isObject(elements[i])) continue;
    var element = elements[i];
    var min = element.min.to(mapDimens.unit());
    var max = element.max.to(mapDimens.unit());
    _elements.push({
      min: min,
      max: max,
      percent: element.heightPercent/100,
    });
    mapPercent -= element.heightPercent;
    minHeight += min.height();
    minWidth = minWidth < min.width() ? min.width() : minWidth;
  }
  mapPercent /= 100;
  var mapMinHeight = mapDimens.height() / mapPercent;
  minHeight = minHeight < mapMinHeight ? mapMinHeight : minHeight;
  for(var i = 0; i < _elements.length; ++i) {
    var element = _elements[i];
    var height = element.percent*minHeight;
    if(height > element.max.height()) {
      minHeight -= (height-element.max.height());
    }
  }
  var pageSize = new Dimens(minWidth, minHeight, mapDimens.unit());
  return growToAtLeastFormat(pageSize, innerFormat).to(mapDimens.unit());
}

function createSubdividedRenderSize(header, footer, renderSize) {
  var renderDimensions = {full: renderSize};
  var headerPercent = check.isObject(header) ? header.heightPercent/100 : 0;
  var footerPercent = check.isObject(footer) ? footer.heightPercent/100 : 0;
  var mapPercent = 1 - headerPercent - footerPercent;
  if(check.isObject(header)) {
    renderDimensions.header = new Dimens(renderSize.width(), renderSize.height()*headerPercent, mapDimens.unit());
  }
  if(check.isObject(footer)) {
    renderDimensions.footer = new Dimens(renderSize.width(), renderSize.height()*footerPercent, mapDimens.unit());
  }
  renderDimensions.map = new Dimens(renderSize.width(), renderSize.height()*mapPercent, mapDimens.unit());

  return pageDimensions;
}

function getRenderFormat(format, orientation, margins) {
  return getOrientedDimensions(PrintPdf.getFormat(format), orientation).subtractMargin(margins);
}

function scaleHTMLObject(htmlObject, newSize) {
  if(!check.isObject(htmlObject)) return;
  var scaling = htmlObject.scaling;
  if(!check.isObject(scaling) || !(scaling.baseLine instanceof Dimens)) return;
  var percent = 0;
  var baseLine = scaling.baseLine;
  newSize = newSize.to(baseLine.unit());
  if(scaling.widthAndHeight) {
    percent = (newSize.width() + newSize.height())/(baseLine.width() + baseLine.height());
  } else if(scaling.height) {
    percent = newSize.height()/baseLine.height();
  } else {
    percent = newSize.width()/baseLine.width();
  }
  var handlers = check.isArray(scaling.handlers) ? scaling.handlers : [];
  scaleElement(htmlObject.html, handlers, percent);
}

var PdfBuilder = (function() {

  var constructor = function() {
    var format = "a4";
    var dpi = 300;
    var orientation = "p";
    var htmlDoc = null;
    var header = null;
    var footer = null;
    var scale = null;
    var actualPixelRatio = -1;
    var margins = Margin.createPDFMargin(0, UNITS.Points);
    var renderDimensions = null;
    var that = this;

    var _cleanup = function() {
      var parent = htmlDoc.parentNode;
      parent.parentNode.removeChild(parent);
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return actualPixelRatio;
        }
      });
    };

    var _printMap = function(map) {
      return new Promise(function(resolve, reject) {
        var dimensions = PrintPdf.getFormat(format);
        var convMargins = margins.to(dimensions.unit());
        replaceMapWithImage(map);

        var pdf = new jsPDF({
          unit: dimensions.unit(),
          format: PrintPdf.isDefaultFormat(format) ? format : [dimensions.width(), dimensions.height()],
          orientation: orientation,
          compress: true
        });
        html2canvas(htmlDoc, {
          letterRendering: true,
          useCORS: true,
          scale: 2
        }).then(function(canvas) {
          pdf.addImage(canvas, 'png', convMargins.left(), convMargins.top(),
            renderingDimensions.width(),
            renderingDimensions.height(), null, 'FAST');
          _cleanup(map)
          resolve(pdf);
        });
      });
    }

    var _adjustDPI = function(mapDimens, map) {
      mapDimens = mapDimens.to(UNITS.Pixels);
      var newDpi = Math.min(
        calculateMaximumValidDpi(new Size(mapDimens.width(), UNITS.Pixels), map, dpi),
        calculateMaximumValidDpi(new Size(mapDimens.height(), UNITS.Pixels), map, dpi)
      );
      if (newDpi != dpi) {
        dpi = newDpi;
        Object.defineProperty(window, 'devicePixelRatio', {
          get: function() {
            return dpi / 96
          }
        });
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

      var renderFormat = getRenderFormat(format, orientation, margins);
      var renderSize = calculateRenderSize([header, footer],
        new Dimens(map._container.scrollWidth, map._container.scrollHeight, UNITS.Pixels), renderFormat);
      renderDimensions = createSubdividedRenderSize(header, footer, renderSize);
      htmlDoc = createDocumentContainer();
      addHTMLObject(header, htmlDoc, renderDimensions.header);
      var container = createMapContainer(htmlDoc, renderDimensions.map);
      addHTMLObject(footer, htmlDoc, renderDimensions.footer);
      _adjustDPI(renderDimensions.map, map);

      scaleHTMLObject(header, renderDimensions.header);
      scaleHTMLObject(footer, renderDimensions.footer);
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
      if (check.isString(nwFormat) && PrintPdf.getFormat(nwFormat)) {
        format = nwFormat;
      } else if (check.isObject(nwFormat)) {
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
      if (tmpHeader) {
        header = tmpHeader;
        ensureValidHTMLObject(header);
      }
      return that;
    }

    this.footer = function(nwFooter) {
      var tmpFooter = createHTMLObject(nwFooter);
      if (tmpFooter) {
        footer = tmpFooter;
        ensureValidHTMLObject(footer);
      }
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
