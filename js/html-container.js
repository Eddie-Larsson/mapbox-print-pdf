var check = require("./type-check.js");
var dimensions = require("./dimensions.js");
var Dimens = dimensions.Dimens;
var Size = dimensions.Size;
var UNITS = dimensions.UNITS;
var scaleElement = require("./scale-element.js");

var HIDDEN_CONTAINER_STYLE = "overflow: hidden; height: 0; width: 0; position: fixed;";

var HtmlObject = (function() {
  var constructor = function(html, height, baseline, handlers) {
    var heightPercent = height.value()/baseline.height();
    handlers = check.isObject(handlers) ? handlers : {};
    baseline = new Dimens(baseline.width(), baseline.height()*heightPercent, baseline.unit());
    this.html = function() { return html; }
    this.height = function() { return height; }
    this.baseline = function() { return baseline; }
    this.handlers = function() { return handlers; }
    this.heightPercent = function() { return heightPercent; }
  }

  var _getBaseline = function(baseline, formatConfig) {
    var result = null;
    if(check.isObject(baseline)
    && baseline.hasOwnProperty("format")
    && (check.isString(baseline.format) || Dimens.isValidDimensionObject(baseline.format))) {
      if(check.isString(baseline.format)) {
        result = formatConfig.getFormat(baseline.format);
      } else {
        result = Dimens.toDimension(baseline.format);
      }
      if(baseline.orientation === "l") {
        result = new Dimens(result.height(), result.width(), result.unit());
      }
    } else if(check.isString(baseline) && formatConfig.formatExists(baseline)) {
      result = formatConfig.getFormat(baseline);
    }
    return result;
  }
  constructor.from = function(obj, formatConfig) {
    if(!obj.hasOwnProperty("html")
    || !obj.hasOwnProperty("height")
    || !obj.hasOwnProperty("baseline")) return null;
    var html = createOrReturnHTML(obj.html);

    if(html === null) return null;
    var height = Size.from(obj.height);
    if(height === null) return null;
    var baseline = _getBaseline(obj.baseline, formatConfig);
    if(baseline === null) return null;
    return new HtmlObject(html, height, baseline);
  }
  return constructor;
})();


var createOrReturnHTML = function(html) {
  if (check.isString(html)) {
    var template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
  } else if (check.isHTMLElement(html)) {
    return html.cloneNode(true);
  } else {
    console.error(html + " is not a html element or string");
    return null;
  }
}

var createDocumentContainer = function(dimens) {
  dimens = dimens.to(UNITS.Pixels);
  var hidden = document.createElement('div');
  hidden.setAttribute("style", HIDDEN_CONTAINER_STYLE);
  var doc = document.createElement("div");
  doc.style.width = dimens.width() + dimens.unit();
  doc.style.height = dimens.height() + dimens.unit();
  hidden.appendChild(doc);
  document.body.appendChild(hidden);
  return doc;
}

var addHTMLObject = function(htmlObj, container, dimens) {
  if(htmlObj instanceof HtmlObject) {
    dimens = dimens.to(UNITS.Pixels);
    var htmlContainer = document.createElement('div');
    htmlContainer.style.width = dimens.width() + dimens.unit();
    htmlContainer.style.height = dimens.height() + dimens.unit();
    htmlContainer.appendChild(htmlObj.html());
    container.appendChild(htmlContainer);
    scaleElement(htmlObj.html(), htmlObj.handlers(), htmlObj.baseline(), dimens);
  }
  return htmlObj;
}

var createMapContainer = function(container, dimens) {
  var mapContainer = document.createElement('div');
  dimens = dimens.to(UNITS.Pixels);
  mapContainer.style.width = dimens.width() + dimens.unit();
  mapContainer.style.height = dimens.height() + dimens.unit();
  container.appendChild(mapContainer);
  return mapContainer;
}

module.exports = {
  createMapContainer: createMapContainer,
  addHTMLObject: addHTMLObject,
  createDocumentContainer: createDocumentContainer,
  createOrReturnHTML: createOrReturnHTML,
  HtmlObject: HtmlObject
}
