# Overview

A library for saving high resolution versions of mapbox-gl maps to a pdf with an optional header and/or footer that scales with the size of the format.

## Installation

    npm install mapbox-print-pdf --save
## Example Usage

Example usage for printing a map in A3 format in portrait mode:

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.build()
  .format('a3')
  .portrait() // Unnecessary since it's the default but it's included for clarity.
  .print(map, mapboxgl)
  .then(function(pdf) {
    pdf.save('map.pdf');
  });
```

Example usage for printing a map in a custom format in landscape mode and a dpi of 200:

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.build()
  .format({width: 1280; height: 980; unit: "pt"; name: "my-format"})
  .landscape()
  .dpi(200)
  .print(map, mapboxgl)
  .then(function(pdf) {
    pdf.save("map-custom-format.pdf");
  })
```

Example usage for printing a map in A2 format with a footer and a map scale control:

```css
#footer {
  display:none;
}
.footer {
  width:100%;
  height:auto;
  overflow:hidden;
  margin-top: 10px;
}
.info {
  font-size: 18px;
}
.info > span {
  font-weight:bold;
}
```

```Html
<div data-scale-height="margin-top" id="footer" class="footer">
  <p data-scale-sum="font-size" class="info"><span>Created with</span>: © Mapbox, © OpenStreetMap</p>
  <p data-scale-sum="font-size" class="info"><span>Author</span>: Eddie Larsson</p>
</div>
```
```javascript
var printPdf = require('mapbox-print-pdf');

var elementClonedCb = function(elem) {
  elem.removeAttribute("id");
}

printPdf.build()
  .format("a2")
  .footer({
    html: document.getElementById("footer"),
    baseline: {format: "a4", orientation: "p"}
  }, elementClonedCb)
  .scale({maxWidthPercent: 10, unit: "metric"})
  .print(map, mapboxgl)
  .then(function(pdf) {
    pdf.save("map-with-footer.pdf");
  });
```
The attributes data-scale-height and data-scale-sum are used to allow for scaling of the footer with its content.

## Default formats
* A0-10
* B0-10
* C0-10
* dl (drivers license)
* letter
* government-letter
* legal
* junior-legal
* ledger
* tabloid
* credit-card

### Supported units
* **Pixels**, "px",
* **Points**, "pt",
* **Inches**, "in",
* **Millimiters**, "mm"
* **Centimeters**, "cm"

One important thing to note is that when specifying a custom format or margins pixels can't be used.

## Custom formats
Custom formats can either be supplied when calling format, this is then in the form of an object containg width,height,unit and name of the format. The same form of object can also be added like so:

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.formats.addFormat({
  width: 500,
  height: 500,
  unit: "pt"
}, "format-name");
```

## Scale control
A scale control can be added to the printed map, this is specified with a maximum percentage of the maps width it's allowed to occupy along with the unit to use for the scale.

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.build()
        .scale({maxWidthPercent: 15, unit: "imperial"})
        //...
```

The supported units can be found [here](https://www.mapbox.com/mapbox-gl-js/api/#scalecontrol).<br>
At this time the supported units are:
* metric
* imperial
* nautical

## Margins
Margins can be specified in any unit except pixels, they are considered absolute and do not scale with the size of the format. They can either be specified as a single number, in which case the same margin is used for all sides, or as an object containing the top, right, bottom and left values.

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.build()
        .margins(5, "pt")
        //...
```

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.build()
        .margins({
          top: 6,
          right: 3,
          left: 3,
          bottom:6
        }, "mm")
        //...
```

## Header/footer
A header and/or footer can be specified either by passing in an html string or html object, the latter is usually preferred. In addition to the html itself the baseline format the header/footer was designed for must be provided, this could be a custom format (a name property isn't neccessary) or the name of a registered format. An additional optional property is the orientation of the baseline format (default is portrait). The header/footer height is based on the content height, so specify what it in the normal css.

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.build()
        .header({
          html: '<div><p data-scale-sum="font-size">I\'m a header</p>',
          baseline: {format: 'a4', orientation: 'l'}
        })
        .footer({
          html: document.getElementById('footer-template'),
          baseline: {
            format: {
              height: 500,
              width: 300,
              unit: "pt"
            }
          }
        }, function(elem) {
          elem.removeAttribute("id");
        })
        //...
```

The supported scaling attributes are:
* **data-scale-height**, scale the specified properties by height.
* **data-scale-width**, scale the specified properties by width.
* **data-scale-sum**, scale the specified properties by the sum of the height and sum.
* **data-scale-handler**, scale the element with a custom handler.

The properties to scale should be specified as a space separated list of properties in either camel-case or hyphen-separated. The exception to this is the **data-scale-handler** attribute which should specify the id of a custom scaling function.

Custom scaling functions can be specified in the header/footer object, this should be in the form of an associative array of id: handler. The function should accept two parameters, the element to scale and an object containing information about the scaling. It should return an array of new style values specified as objects with **prop** and **value** properties where prop should be the property name in camelCase and value is the new value.

The second argument to the handler function has the following properties:

* **heightRatio**, the ratio between the baseline height and the current height.
* **widthRatio**, the ratio between the baseline width and the current width.
* **sumRatio**, the ratio between the sum of the width and height of the baseline format and the current format.
* **original**: A dimension object containing width, height and unit of the baseline format.
* **current**: A dimension object containing width, height and unit of the current format.

The dimension objects have the following methods:

* **to(unit)**, returns a new dimension object converted to the specified unit.
* **toString()**, return the dimensions as a string in the format "width:100px;height:100px"
* **add(dimension)**, returns a new dimension which is the sum of the current dimension and the given dimension.
* **area()**, returns the area of the dimension (width*height)
* **sum()**, returns the sum of the width and height
* **width(), height(), unit()**, accessor methods

```Html
<div id="header-template">
  <p data-scale-handler="custom-handler">Passed to the handler</p>
</div>
```
```javascript
var printPdf = require('mapbox-print-pdf');

var customHandler = function(elem, scalingObj) {
  var newStyles = [];
  // Calculate new styles.
  return newStyles;
}

printPdf.build()
        .header({
          html: document.getElementById("header-template"),
          baseline: "a4",
          handlers: {"custom-handler": customHandler}
        }, function(elem) {
          elem.removeAttribute("id");
        })
```

### Styling

The available properties/values are restricted by html2canvas, for a list of supported features see [html2canvas](https://html2canvas.hertzen.com/features).

## Attribution

Attribution of maps is required. See tile provider terms for details.

## License

Licensed under the MIT [License](https://github.com/Eddie-Larsson/mapbox-print-pdf/blob/master/LICENSE).

## Credits

* [Matthew Petroff](http://mpetroff.net/), Based on his work [print-maps](https://github.com/mpetroff/print-maps)
* [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js)
* [jsPDF](https://parall.ax/products/jspdf)
* [html2canvas](https://html2canvas.hertzen.com/)
