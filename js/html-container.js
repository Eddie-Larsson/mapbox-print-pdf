var check = require("./type-check.js");
var dimensions = require("./dimensions.js");
var Dimens = dimensions.Dimens;
var UNITS = dimensions.UNITS;
var scaleElement = require("./scale-element.js");

var HIDDEN_CONTAINER_STYLE = "overflow: hidden; height: 0; width: 0; position: fixed;";

var scaleHTMLObject = function(htmlObject, newSize) {
  if(!check.isObject(htmlObject)) return;
  var scaling = htmlObject.scaling;
  if(!check.isObject(scaling) || !(scaling.baseLine instanceof Dimens)) return;
  var percent = 0;
  var baseLine = new Dimens(scaling.baseLine.width(), scaling.baseLine.height()*htmlObject.heightPercent, scaling.baseLine.unit());
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

var ensureValidHTMLObject = function(obj, printPDF) {
  if(!Dimens.isValidDimensionObject(obj.min)) obj.min = new Dimens(0, 0, UNITS.Points);
  obj.min = Dimens.toDimension(obj.min);
  if(!Dimens.isValidDimensionObject(obj.max)) obj.max = new Dimens(Number.MAX_VALUE, Number.MAX_VALUE, UNITS.Points);
  obj.max = Dimens.toDimension(obj.max);

  if(!check.isNumber(obj.heightPercent) || obj.heightPercent < 0 || obj.heightPercent >= 100) obj.heightPercent = 5;
  if(obj.heightPercent > 1) obj.heightPercent /= 100;
  if(check.isObject(obj.scaling)) {
    var scaling = createScalingObject(obj.scaling, printPDF);
    if(!scaling) {
      obj.scaling = null;
      console.error(scaling + " is not a valid scaling object.");
    } else {
      obj.scaling = scaling;
    }
  }
}

var createScalingObject = function(val, printPdf) {
  if(Dimens.isValidDimensionObject(val)) {
    return {baseLine: Dimens.toDimension(val)};
  } else if(check.isString(val) && printPdf.formatExists(val)) {
    return {baseLine: printPdf.getFormat(val)};
  } else if(check.isObject(val) && val.hasOwnProperty("baseLine")) {
    if(Dimens.isValidDimensionObject(val.baseLine)) {
      val.baseLine = Dimens.toDimension(val.baseLine);
      return val;
    } else if(check.isString(val.baseLine) && printPdf.formatExists(val.baseLine)) {
      val.baseLine = printPdf.getFormat(val.baseLine);
      return val;
    }
  }
  return null;
}

var createOrReturnHTML = function(html) {
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

var createHTMLObject = function(htmlObj) {
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

var createDocumentContainer = function() {
  var hidden = document.createElement('div');
  hidden.setAttribute("style", HIDDEN_CONTAINER_STYLE);
  var doc = document.createElement("div");
  doc.setAttribute("style", "display:inline-block;");
  hidden.appendChild(doc);
  document.body.appendChild(hidden);
  return doc;
}

var addHTMLObject = function(htmlObj, container, dimens) {
  if(check.isObject(htmlObj) && check.isHTMLElement(htmlObj.html)) {
    dimens = dimens.to(UNITS.Pixels);
    var htmlContainer = document.createElement('div');
    htmlContainer.style.width = dimens.width() + dimens.unit();
    htmlContainer.style.height = dimens.height() + dimens.unit();
    htmlContainer.appendChild(htmlObj.html);
    container.appendChild(htmlContainer);
    scaleHTMLObject(htmlObj, dimens);
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
  createHTMLObject: createHTMLObject,
  createOrReturnHTML: createOrReturnHTML,
  createScalingObject: createScalingObject,
  ensureValidHTMLObject: ensureValidHTMLObject,
  scaleHTMLObject: scaleHTMLObject
}
