/*
 * Mapbox Print Pdf - Printing PDFs with high resolution mapbox maps
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
module.exports = {
    isString: function(obj) {
        return typeof obj === 'string' || obj instanceof String;
    },

    isHTMLElement: function(obj) {
        return obj instanceof Element;
    },

    isFunction: function(obj) {
        return obj instanceof Function;
    },

    isObject: function(obj) {
        return obj === Object(obj);
    },

    isNumber: function(obj) {
        return typeof obj === 'number' || (typeof o == 'object' && obj.constructor === Number);
    },
    isArray: function(obj) {
        return obj instanceof Array;
    }
};
