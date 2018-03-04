var check = require('./type-check.js');
var dimensions = require('./dimensions.js');
var cssInitials = require('css-initials');
var Dimens = dimensions.Dimens;
var UNITS = dimensions.UNITS;
var CONTAINER_CLASS = '__mapbox-print-pdf-container__';
var ATTR_PRESERVE_CSS = 'data-mpp-preserve';
var DEFAULT_FONT = '"Times New Roman", Times, serif';
var scaleElement = require('./scale-element.js');
var canvg = require('canvg');

var HIDDEN_CONTAINER_STYLE = {overflow: 'hidden', height: 0, width: 0, position: 'fixed', top:0, left:0};

var HtmlObject = (function () {
    var constructor = function (html, baseline, handlers) {
        handlers = check.isObject(handlers) ? handlers : {};
        this.html = function () { return html; };
        this.baseline = function () { return baseline; };
        this.handlers = function () { return handlers; };
    };

    var _getBaseline = function (baseline, formatConfig) {
        var result = null;
        if (check.isObject(baseline)
            && baseline.hasOwnProperty('format')
            && (check.isString(baseline.format) || Dimens.isValidDimensionObject(baseline.format))) {
            if (check.isString(baseline.format)) {
                result = formatConfig.getFormat(baseline.format);
            } else {
                result = Dimens.toDimension(baseline.format);
            }
            if (baseline.orientation === 'l') {
                result = new Dimens(result.height(), result.width(), result.unit());
            }
        } else if (check.isString(baseline) && formatConfig.formatExists(baseline)) {
            result = formatConfig.getFormat(baseline);
        }
        return result;
    };
    constructor.from = function (obj, formatConfig) {
        if (!obj.hasOwnProperty('html')
            || !obj.hasOwnProperty('baseline')) {
            console.error('Missing a required property in the html object');
            return null;
        }
        var html = createOrReturnHTML(obj.html);
        if (html === null) {
            console.error('Html property couldn\'t be parsed to an html object');
            console.error(obj.baseline);
            return null;
        }
        var baseline = _getBaseline(obj.baseline, formatConfig);
        if (baseline === null) {
            console.error('Couldn\'t parse the baseline property of the html object');
            console.error(obj.baseline);
            return null;
        }
        return new HtmlObject(html, baseline, obj.handlers);
    };
    return constructor;
})();

var cloneObject = function(obj) {
    var clone = {};
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop)) clone[prop] = obj[prop];
    }
    return clone;
};

var buildStyleStringFromObject = function(obj, override) {
    var style = '';
    obj = cloneObject(obj);
    for(var prop in override) {
        if(override.hasOwnProperty(prop)) obj[prop] = override[prop];
    }
    for(prop in obj) {
        if(obj.hasOwnProperty(prop)) {
            style += prop + ': ' + obj[prop] + ';';
        }
    }
    return style;
};
var createOrReturnHTML = function (html) {
    if (check.isString(html)) {
        var template = document.createElement('template');
        html = html.trim();
        template.innerHTML = html;
        return template.content.firstChild;
    } else if (check.isHTMLElement(html)) {
        return html.cloneNode(true);
    } else {
        console.error(html + ' is not a html element or string');
        return null;
    }
};

var removeStylesExceptMapbox = function (doc, cssToKeep) {
    var links = Array.prototype.slice.call(doc.getElementsByTagName('LINK'));
    for (var i = 0; i < links.length; ++i) {
        var link = links[i];
        if (link.tagName != 'LINK' || link.href.indexOf('mapbox') != -1 || link.hasAttribute(ATTR_PRESERVE_CSS)) continue;
        if(cssToKeep.indexOf(link.href) !== -1 || cssToKeep.indexOf(link.href.replace(window.location.href, '')) !== -1) continue;
        link.parentNode.removeChild(link);
    }
};

var clearBodyExceptContainer = function(doc) {
    var children = Array.prototype.slice.call(doc.body.children);
    for (var i = 0; i < children.length; ++i) {
        var child = children[i];
        if(child.tagName == 'STYLE') continue;
        if (child.className.indexOf(CONTAINER_CLASS) != -1)  continue;
        child.parentNode.removeChild(child);
    }
};

var createDocumentContainer = function (dimens) {
    dimens = dimens.to(UNITS.Pixels);
    var hidden = document.createElement('div');
    hidden.className = CONTAINER_CLASS;
    hidden.setAttribute('style', buildStyleStringFromObject(HIDDEN_CONTAINER_STYLE));
    var doc = document.createElement('div');
    doc.setAttribute('style', buildStyleStringFromObject(cssInitials));
    doc.style.width = dimens.width() + dimens.unit();
    doc.style.height = dimens.height() + dimens.unit();
    doc.style.fontFamily = DEFAULT_FONT;
    doc.style.display = 'table';
    hidden.appendChild(doc);
    document.body.appendChild(hidden);
    return doc;
};

var addHTMLObject = function (htmlObj, container, dimens) {
    if (htmlObj instanceof HtmlObject) {
        dimens = dimens.to(UNITS.Pixels);
        var htmlContainer = document.createElement('div');
        htmlContainer.style.width = dimens.width() + dimens.unit();
        htmlContainer.style.height = 'auto';
        htmlContainer.style.overflow = 'hidden';
        htmlContainer.appendChild(htmlObj.html());
        container.appendChild(htmlContainer);
        scaleElement(htmlObj.html(), htmlObj.handlers(), htmlObj.baseline(), dimens);
    }
    return htmlObj;
};

var createMapContainer = function (container) {
    var mapContainer = document.createElement('div');
    var tableRow = document.createElement('div');
    tableRow.style.display = 'table-row';
    tableRow.style.height = '100%';
    mapContainer.style.display = 'table-cell';
    tableRow.appendChild(mapContainer);
    container.appendChild(tableRow);
    return mapContainer;
};

var replaceSvgSources = function(container, scaleFactor) {
    var images = Array.prototype.slice.call(container.getElementsByTagName('img'));
    for(var i = 0; i < images.length; ++i) {
        var image = images[i];
        if(image.src.indexOf('.svg') === -1) continue;
        var canvas = document.createElement('canvas');
        canvas.width = image.scrollWidth*scaleFactor;
        canvas.height = image.scrollHeight*scaleFactor;
        canvg(canvas, image.src);
        image.src = canvas.toDataURL('image/png');
    }
};


module.exports = {
    createMapContainer: createMapContainer,
    addHTMLObject: addHTMLObject,
    createDocumentContainer: createDocumentContainer,
    createOrReturnHTML: createOrReturnHTML,
    HtmlObject: HtmlObject,
    removeStylesExceptMapbox: removeStylesExceptMapbox,
    clearBodyExceptContainer: clearBodyExceptContainer,
    replaceSvgSources: replaceSvgSources
};
