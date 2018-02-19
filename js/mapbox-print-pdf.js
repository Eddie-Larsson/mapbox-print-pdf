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
var MM_TO_IN = 25.4;
var QUIESCE_TIMEOUT = 500;
var ATTRIBUTION_RATIO = 0.01;

function toPixels(millimeters) {
    var conversionFactor = 96 / MM_TO_IN;

    return conversionFactor * millimeters;
};

function toMillimeters(pixels) {
  var conversionFactor = 96 / MM_TO_IN;
  return pixels/conversionFactor;
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

function ensureAspectRatio(dimensions, widthToHeightRatio) {
    if(widthToHeightRatio < 1) {
      dimensions.height /= widthToHeightRatio;
    } else {
      dimensions.width *= widthToHeightRatio;
    }
  return dimensions;
}

function growToAtLeastBounds(dimensions, bounds) {
  var correctedDimensions = ensureAspectRatio(dimensions, bounds.width/bounds.height);
  if(correctedDimensions.width < bounds.width) return bounds;
  return correctedDimensions;
}

function validateSize(size, dpi, map) {
  var maxSize = calculateMaxSize(map);
  if(maxSize <= 0) return {error: "Couldn't calculate the maximum size of the render buffer"};
  var inches = size/MM_TO_IN;
  if(size <= 0) return {error: "Size must be a positive integer"};
  if (inches * dpi > maxSize) {
      return {error: 'The maximum image dimension is ' + maxSize + 'px, but the size entered is ' + (inches * dpi) + 'px.'};
  }
  return {success: true};
}

function getDpiForSize(size, map) {
  var maxSize = calculateMaxSize(map);
  if(maxSize <= 0) return {error: "Couldn't calculate the maximum size of the render buffer"};

  return {result: maxSize/(size/MM_TO_IN)};
}

function drawAttribution(mapCanvas, attribution, font) {
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
}

function getOrientedDimensions(dimensions, orientation) {
  var orientedDimensions = {};
  if(orientation == "l") {
    orientedDimensions.width = dimensions.height;
    orientedDimensions.height = dimensions.width;
  } else {
    orientedDimensions.width = dimensions.width;
    orientedDimensions.height = dimensions.height;
  }
  return orientedDimensions;
}



function Format(width, height) {
  this.height = height;
  this.width = width;
};

var PrintPdf = (function() {
  var formats = {
    "a4": new Format(210, 297),
    "a3": new Format(297, 420)
  };
  var constructor = function() {
    this.getFormats = function() {
      var formatsCopy = {};
      for (var format in formats) {
        if (formats.hasOwnProperty(format)) {
          var formatObj = formats[format];
          formatsCopy[format] = new Format(formatObj.width, formatObj.height);
        };
      }
      return formatsCopy;
    };
    this.addFormat = function(format, width, height) {
      if(width <= 0 || height <= 0) return {error: "Invalid parameters, height and width must be greater than 0."};
      if(formats.hasOwnProperty(format)) return {error: "Format " + format + " already exists"};
      formats[format] = new Format(width, height);
      return {success: true};
    };

    this.getFormat = function(format) {
      var tmpFormat = formats[format];
      return new Format(tmpFormat.width, tmpFormat.height);
    }

    this.build = function() {
      return new PdfBuilder();
    }

  };
  return constructor;

})();

var mainConfig = new PrintPdf();

var PdfBuilder = (function() {

  var constructor = function() {
    var format = "a4";
    var dpi = 300;
    var orientation = "p";
    var attribution = "";
    var subject = "";
    var fileName = "map.pdf";
    var attributionFont = "Arial";
    var title = null;
    var onPrint = null;
    var that = this;

    function calculateValidDpi(millimeters, map) {
      var sizeValid = validateSize(millimeters, dpi, map);
      if(sizeValid.success) return dpi;
      console.log(sizeValid.error);
      var dpiRes = getDpiForSize(millimeters, map);
      if(dpiRes.error) {
        console.log("Error when calculating dpi for size: " + dpiRes.error);
        dpiRes.result = dpi;
      }
      return dpiRes.result;
    }

    function calculateFormatedDimensions(map) {
      var dimensions = mainConfig.getFormat(format);
      var originalDimensions = {width: map._container.clientWidth, height: map._container.clientHeight};
      var formatInPixels = getOrientedDimensions({
        width: toPixels(dimensions.width),
        height: toPixels(dimensions.height)
      }, orientation);

      var newSize = growToAtLeastBounds(originalDimensions, formatInPixels);
      var sizeInMm = {width: toMillimeters(newSize.width), height: toMillimeters(newSize.height)}
      dpi = Math.min(calculateValidDpi(sizeInMm.width, map), calculateValidDpi(sizeInMm.height, map));
      return newSize;
    }

    function printMap(map) {
      var dimensions = mainConfig.getFormat(format);
      var pdf = new jsPDF({
          orientation: orientation,
          unit: "mm",
          format: [dimensions.width, dimensions.height],
          compress: true
      });
      dimensions = getOrientedDimensions(dimensions, orientation);
      pdf.addImage(drawAttribution(map.getCanvas(), attribution, attributionFont), 'png', 0, 0, dimensions.width, dimensions.height, null, 'FAST');

      if(!title) title = map.getStyle().name;

      pdf.setProperties({
          title: title,
          subject: subject,
          creator: 'mapbox-print-pdf',
          author: attribution
      });

      pdf.save(fileName);
      if(onPrint && onPrint instanceof Function) onPrint();
    }

    function waitForMap(map, callback) {
      var noneLoaded = false;
      var quiesce = function() {
        if(!noneLoaded || (!map.loaded() || !map.isStyleLoaded() || !map.areTilesLoaded())) {
          noneLoaded = true;
          setTimeout(quiesce, QUIESCE_TIMEOUT);
        } else {
          map.off('render', renderListener);
          printMap(map);
          if(callback) callback();
        }
      }

      var initial = true;
      var renderListener = function() {
        noneLoaded = false;
        if(initial && map.loaded() && map.isStyleLoaded() && map.areTilesLoaded()) {
          initial = false;
          quiesce();
        }
      }
      map.on('render', renderListener);
    };

    function createPrintMap(map, mapboxgl) {
      var newSize = calculateFormatedDimensions(map);

      var actualPixelRatio = window.devicePixelRatio;
      Object.defineProperty(window, 'devicePixelRatio', {
          get: function() {return dpi / 96}
      });
      var hidden = document.createElement('div');
      hidden.setAttribute("style", "overflow: hidden; height: 0; width: 0; position: fixed;");
      document.body.appendChild(hidden);
      var container = document.createElement('div');

      container.style.width = newSize.width + "px";
      container.style.height = newSize.height + "px";
      hidden.appendChild(container);

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

      waitForMap(renderMap, function() {
        renderMap.remove();
        hidden.parentNode.removeChild(hidden);
        Object.defineProperty(window, 'devicePixelRatio', {
            get: function() {return actualPixelRatio}
        });
      });
      /*renderMap.once('load', function() {
        printMap(renderMap);
        renderMap.remove();
        hidden.parentNode.removeChild(hidden);
        Object.defineProperty(window, 'devicePixelRatio', {
            get: function() {return actualPixelRatio}
        });
      })*/
    };

    this.format = function(nwFormat) {
      nwFormat = nwFormat.toLowerCase();
      if(!mainConfig.getFormats().hasOwnProperty(nwFormat)) {
        console.log("The format " + nwFormat + " doesn't exist.");
        return that;
      }
      format = nwFormat;
      return that;
    };

    this.dpi = function(nwDpi) {
      if(nwDpi <= 0) {
        console.log("The dpi must be greater than 0, given value was " + nwDpi);
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

    this.attribution = function(nwAttribution) {
      attribution = nwAttribution;
      return that;
    }

    this.subject = function(nwSubject) {
      subject = nwSubject;
      return that;
    }

    this.fileName = function(nwFileName) {
      fileName = nwFilename;
      return that;
    }

    this.title = function(nwTitle) {
      title = nwTitle;
      return that;
    }

    this.attributionFont = function(nwAttributionFont) {
      attributionFont = nwAttributionFont;
      return that;
    }

    this.onPrint = function(callback) {
      onPrint = callback;
      return that;
    }

    this.print = function(map, mapboxgl) {;
      if(!map.loaded()) return {error: "The given map hasn't been fully loaded"};
      var dimensions = mainConfig.getFormat(format);
      var res = validateSize(dimensions.height, dpi, map);
      if(!res.success) return {error: "Invalid height: " + res.error};
      res = validateSize(dimensions.width, dpi, map);
      if(!res.success) return {error: "Invalid width: " + res.error};
      createPrintMap(map, mapboxgl);
    }

  };
  return constructor;
})();

module.exports = mainConfig;
