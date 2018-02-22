
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
  return typeof obj === 'number' || (typeof o == "object" && o.constructor === Number);
},
isArray: function(obj) {
  return obj instanceof Array;
}
}
