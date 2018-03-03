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

var jsPDF = require('jspdf');
var html2canvas = require('html2canvas');
var check = require('./type-check.js');
var dimensions = require('./dimensions.js');
var Html = require('./html-container.js');
var FormatConfig = require('./format-config.js');
var mapUtils = require('./map-utils.js');
var Dimens = dimensions.Dimens;
var Margin = dimensions.Margin;
var Size = dimensions.Size;

var HtmlObject = Html.HtmlObject;
var UNITS = dimensions.UNITS;
var RENDER_SCALE = 2;

function getOrientedDimensions(dimensions, orientation) {
    if (orientation == 'l') {
        return new Dimens(dimensions.height(), dimensions.width(), dimensions.unit());
    }
    return dimensions;
}

function getRenderFormat(format, orientation, margins) {
    return getOrientedDimensions(FormatConfig.getFormat(format), orientation).subtractMargin(margins);
}

var PdfBuilder = (function() {

    var constructor = function() {
        var format = 'a4';
        var dpi = 300;
        var orientation = 'p';
        var htmlDoc = null;
        var header = null;
        var footer = null;
        var scale = null;
        var css = [];
        var actualPixelRatio = -1;
        var margins = Margin.createPDFMargin(0, UNITS.Points);
        var that = this;

        var _cleanup = function(map) {
            map.remove();
            var parent = htmlDoc.parentNode;
            parent.parentNode.removeChild(parent);
            htmlDoc = null;
            header = null;
            footer = null;
            Object.defineProperty(window, 'devicePixelRatio', {
                get: function() {
                    return actualPixelRatio;
                }
            });
        };
        

        var _printMap = function() {
            return new Promise(function(resolve, reject) {
                var dimensions = FormatConfig.getFormat(format);
                var convMargins = margins.to(dimensions.unit());

                var pdf = new jsPDF({
                    unit: dimensions.unit(),
                    format: FormatConfig.isDefaultFormat(format) ? format : [dimensions.width(), dimensions.height()],
                    orientation: orientation,
                    compress: true
                });
                
                var writeCanvasToPdf = function(canvas) {
                    var renderFormat = getRenderFormat(format, orientation, convMargins);
                    try {
                        pdf.addImage(canvas.toDataURL('image/jpeg', 1), 'JPEG', convMargins.left(), convMargins.top(),
                            renderFormat.width(),
                            renderFormat.height(), null, 'FAST');
                        resolve(pdf);
                    } catch(err) {
                        reject(err);
                    }
                };

                var whenCloned = function(doc) {
                    Html.removeStylesExceptMapbox(doc, css);
                    Html.clearBodyExceptContainer(doc);
                };
                html2canvas(htmlDoc, {
                    letterRendering: true,
                    useCORS: true,
                    scale: RENDER_SCALE,
                    allowTaint: true,
                    onclone: whenCloned
                }).then(writeCanvasToPdf, reject);
            });
        };

        var _decreaseDpiToValidValue = function(mapDimens, map) {
            mapDimens = mapDimens.to(UNITS.Pixels);
            var newDpi = Math.min(
                mapUtils.calculateMaximumDpi(new Size(mapDimens.width(), UNITS.Pixels), map, dpi),
                mapUtils.calculateMaximumDpi(new Size(mapDimens.height(), UNITS.Pixels), map, dpi)
            );
            if (newDpi < dpi) {
                dpi = newDpi;
                Object.defineProperty(window, 'devicePixelRatio', {
                    get: function() {
                        return dpi / 96;
                    }
                });
                var hidden = htmlDoc.parentNode;
                hidden.removeChild(hidden);
                document.body.appendChild(hidden);
            }
        };

        var _createHTMLDocument = function(map) {
            actualPixelRatio = window.devicePixelRatio;
            Object.defineProperty(window, 'devicePixelRatio', {
                get: function() {
                    return dpi / 96;
                }
            });

            var renderFormat = getRenderFormat(format, orientation, margins);
            htmlDoc = Html.createDocumentContainer(renderFormat);
            Html.addHTMLObject(header, htmlDoc, renderFormat);
            var container = Html.createMapContainer(htmlDoc);
            Html.addHTMLObject(footer, htmlDoc, renderFormat);
            
            var mapDimens = new Dimens(container.scrollWidth, container.scrollHeight, UNITS.Pixels);
            _decreaseDpiToValidValue(mapDimens, map);
            Html.replaceSvgSources(htmlDoc, RENDER_SCALE);
            return container;
        };

        this.format = function(nwFormat) {
            if (check.isString(nwFormat) && FormatConfig.formatExists(nwFormat)) {
                format = nwFormat;
            } else if (Dimens.isValidPdfDimensionObject(nwFormat) && nwFormat.hasOwnProperty('name')) {
                var addRes = FormatConfig.addFormat(nwFormat.name, nwFormat);
                if(addRes.error) {
                    console.error(addRes.error);
                } else {
                    format = nwFormat.name;
                }
            }
            return that;
        };

        this.dpi = function(nwDpi) {
            if (nwDpi <= 0) {
                console.error('The dpi must be greater than 0, given value was ' + nwDpi);
                return that;
            }
            dpi = nwDpi;
            return that;
        };

        this.landscape = function() {
            orientation = 'l';
            return that;
        };

        this.portrait = function() {
            orientation = 'p';
            return that;
        };

        this.header = function(nwHeader, elemCallback) {
            var tmpHeader = HtmlObject.from(nwHeader, FormatConfig);
            if (tmpHeader) {
                header = tmpHeader;
                if(check.isFunction(elemCallback)) elemCallback(header.html());
            }
            return that;
        };

        this.footer = function(nwFooter, elemCallback) {
            var tmpFooter = HtmlObject.from(nwFooter, FormatConfig);
            if (tmpFooter) {
                footer = tmpFooter;
                if(check.isFunction(elemCallback)) elemCallback(footer.html());
            }
            return that;
        };


        this.scale = function(nwScale) {
            if (mapUtils.isValidScaleObject(nwScale)) {
                scale = nwScale;
            } else {
                console.error('The given scale is invalid: ' + nwScale);
            }
            return that;
        };

        this.keepCSS = function(_css) {
            if(check.isArray(_css)) {
                css = _css;
            } else if(check.isString(_css)) {
                css = [_css];
            }
            return that;
        };

        this.margins = function(nwMargins, unit) {
            var tmpMargins = Margin.createPDFMargin(nwMargins, unit ? unit : UNITS.Millimeters);
            if (tmpMargins) {
                margins = tmpMargins;
            } else {
                console.error('The provided arguments are invalid: ' + nwMargins + ', ' + unit);
            }
            return that;
        };

        var _waitForStyleToLoad = function(map) {
            var TIMEOUT = 100;
            var maxWait = 10000;
            var waited = -1*TIMEOUT;

            
            return new Promise(function(resolve, reject) {
                var checkStyle = function() {
                    if(map.isStyleLoaded()) {
                        resolve(map);
                    } else {
                        waited += TIMEOUT;
                        if(waited >= maxWait) {
                            reject(new Error('The maps style took too long to load.'));
                        } else {
                            setTimeout(checkStyle, TIMEOUT);
                        }
                    }
                };
                checkStyle();
            });
        };
        this.print = function(map, mapboxgl) {
            
            if (!map.isStyleLoaded()) {
                
                return new Promise(function(resolve, reject) {
                    _waitForStyleToLoad(map).then(function() {
                        that.print(map, mapboxgl).then(resolve, reject);
                    }, reject);
                });
            }
            return new Promise(function(resolve, reject) {
                
                var container = _createHTMLDocument(map);
                
                var afterRenderMapCreate = function(renderMap) {
                    return new Promise(function (res, rej) {
                        mapUtils.addScale(renderMap, scale, mapboxgl)
                            .then(mapUtils.waitForMapToRender)
                            .then(_printMap)
                            .then(function(pdf) {
                                _cleanup(renderMap);
                                res(pdf);
                            }, function(err) {
                                _cleanup(renderMap);
                                rej(err);
                            });
                    });
                };
                mapUtils.createPrintMap(map, mapboxgl, container)
                    .then(afterRenderMapCreate)
                    .then(resolve, reject);
            });
        };

    };
    return constructor;
})();

module.exports = {
    formats: FormatConfig,
    build: function() { return new PdfBuilder(); }
};
