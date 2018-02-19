# Overview

Basic library for saving high resolution versions of mapbox-gl maps to
a pdf. As a side note there's a dependency on mapbox-gl even though it's note
listed as a dependency in the package.json, this is because the library depends
on the user of the library to provide the mapboxgl object. This is mostly
due to the fact that it's easier to use the access token this way.

## Example Usage

Example usage for printing a map in A3 format in portrait mode:

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.build()
  .format('a3')
  .portrait() // Unnecessary since it's the default but it's included for clarity.
  .attribution('© Mapbox, © OpenStreetMap')
  .title('My awesome map')
  .fileName("a3_map.pdf")
  .print(map, mapboxgl);
```

Example usage for printing a map in A4 format in landscape mode:

```javascript
var printPdf = require('mapbox-print-pdf');

printPdf.build()
  .format('a4')
  .landscape()
  .attribution('© Mapbox, © OpenStreetMap')
  .title('My awesome map')
  .fileName("a4_map.pdf")
  .print(map, mapboxgl);
```

Example usage for printing a map in a custom format:

```javascript
var printPdf = require('mapbox-print-pdf');

// The height and width is specified in millimeters.
printPdf.addFormat('my-custom-format', 1200, 1200);

printPdf.build()
  .format('my-custom-format')
  .attribution('© Mapbox, © OpenStreetMap')
  .print(map, mapboxgl);
```

## Supported formats
* A4 (default)
* A3

## Options
The currently supported options for the builder object are:
* Format, the format of the pdf. Can be specified with .format().
* Dpi, the dpi of the printed map. Can be specified with .dpi().
* Orientation, the orientation of the pdf. Can bespecified with .landscape() or .portrait().
* Attribution, the parties that should be attributed. Can be specified with .attribution().
* Subject, the pdf subject. Can be specified with .subject().
* File name, the name of the pdf file. Can be specified with .fileName().
* Title, the title of the pdf. Can be specified with .title().
* Font of the attribution text, can be specified with .attributionFont().

## Attribution

Attribution of maps is required. See tile provider terms for details.

## License

Licensed under the MIT [License](https://github.com/Eddie-Larsson/mapbox-print-pdf/blob/master/LICENSE).

## Credits

* [Matthew Petroff](http://mpetroff.net/), Based on his work [print-maps](https://github.com/mpetroff/print-maps)
* [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js)
* [jsPDF](https://github.com/MrRio/jsPDF)
