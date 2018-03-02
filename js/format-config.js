var dimensions = require('./dimensions.js');
var Dimens = dimensions.Dimens;
var UNITS = dimensions.UNITS;

var FormatConfig = (function() {
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
        var format;
        for (format in DEFAULT_FORMATS) {
            if (DEFAULT_FORMATS.hasOwnProperty(format)) {
                formatsCopy[format] = DEFAULT_FORMATS[format];
            }
        }
        for (format in userFormats) {
            if (userFormats.hasOwnProperty(format)) {
                formatsCopy[format] = userFormats[format];
            }
        }
        return formatsCopy;
    };

    var _isDefaultFormat = function(format) {
        if (userFormats.hasOwnProperty(format)) return false;
        return DEFAULT_FORMATS.hasOwnProperty(format);
    };

    var _formatExists = function(format) {
        return userFormats.hasOwnProperty(format) || DEFAULT_FORMATS.hasOwnProperty(format);
    };

    var _addFormat = function(format, dimension) {
        if (userFormats.hasOwnProperty(format)) return {
            error: 'Format ' + format + ' already exists'
        };
        if (!Dimens.isValidPdfDimensionObject(dimension)) return {
            error: 'Dimensions are of an invalid type'
        };
        userFormats[format] = Dimens.toPdfDimension(dimension);
        return {
            success: true
        };
    };

    var _getFormat = function(format) {
        if (userFormats.hasOwnProperty(format)) return userFormats[format];
        if (DEFAULT_FORMATS.hasOwnProperty(format)) return DEFAULT_FORMATS[format];
        console.error('The format ' + format + ' doesn\'t exist.');
        return null;
    };

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
        }
    };
})();

module.exports = FormatConfig;
