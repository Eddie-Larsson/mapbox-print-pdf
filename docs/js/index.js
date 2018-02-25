var mapboxgl = require('mapbox-gl');
var mapPrint = require("../../js/mapbox-print-pdf.js");
var map;

mapboxgl.accessToken = "pk.eyJ1IjoiZWRkaWVsYSIsImEiOiJjamUwbjFkMHQwMXJqMzRxcG9yN2xtZWZxIn0.6hdbZuqt2ZPSXuw9Ybfa8w"

function setFormat(builder) {
    var format = $("#formatInp").val();
    if(format != "") builder.format(format);
}

function setDPI(builder) {
    var dpi = parseInt(($("#dpiInp").val()));
    if(!isNaN(dpi) && dpi > 0) builder.dpi(dpi);
}

function setOrientation(builder) {
    var orientation = $("#orientationInp").val();
    if(orientation === "l") builder.landscape();
}

function setHeader(builder) {
    var header = $("#headerHtmlInp").val();
    if(header == null || header.trim() === "") return;
    var height = parseInt($("#headerHeightInp").val());
    if(height < 1) return;
    var heightUnit = $("#headerHeightUnitInp").val();
    var baseline = $("#headerBaselineFormatInp").val();
    if(baseline.trim() == "") return;
    var orientation = $("#headerBaselineOrientationInp").val();
    builder.header({
      html: header,
      height: {
        value: height,
        unit: heightUnit
      },
      baseline: {
        format: baseline,
        orientation: orientation
      }
    });
}

function setFooter(builder) {
  var footer = $("#footerHtmlInp").val();
  if(footer == null || footer.trim() === "") return;
  var height = parseInt($("#footerHeightInp").val());
  if(height < 1) return;
  var heightUnit = $("#footerHeightUnitInp").val();
  var baseline = $("#footerBaselineFormatInp").val();
  if(baseline.trim() == "") return;
  var orientation = $("#footerBaselineOrientationInp").val();
  builder.footer({
    html: footer,
    height: {
      value: height,
      unit: heightUnit
    },
    baseline: {
      format: baseline,
      orientation: orientation
    }
  });
}

function setScaleControl(builder) {
    var maxWidth = parseInt($("#scaleMaxWidthInp").val());
    if(isNaN(maxWidth) || maxWidth <= 0) return;
    var unit = $("#scaleUnitInp").val();
    builder.scale({maxWidthPercent: maxWidth, unit: unit});
}

function getMargin(id) {
  var val = parseInt($("#"+id).val());
  return isNaN(val) || val < 0 ? 0 : val;
}

function setMargins(builder) {
  var obj = {
    top: getMargin("marginTopInp"),
    right: getMargin("marginRightInp"),
    bottom: getMargin("marginBottomInp"),
    left: getMargin("marginLeftInp")
  };
  builder.margins(obj, $("#marginUnitInp").val());
}
function displayPdf(pdf) {
  pdf.save("map.pdf");
}

function showProgress() {
  $('#progressModal').modal('show');
}

function hideProgress() {
  $('#progressModal').modal('hide');
}
function printMap(e) {
  e.preventDefault();
  $("#pdfContainer").innerHTML = "";
  showProgress();
  var builder = mapPrint.build();
  setFormat(builder);
  setDPI(builder);
  setOrientation(builder);
  setHeader(builder);
  setFooter(builder);
  setScaleControl(builder);
  setMargins(builder);
  builder.print(map, mapboxgl)
  .then(displayPdf)
  .then(hideProgress);
}
$(function() {
  map = new mapboxgl.Map({
  	container: 'map',
  	style: 'mapbox://styles/mapbox/streets-v9',
  	zoom: 11,
  	center: [18.068, 59.329]
  });
  $('#progressModal').modal({
  backdrop: 'static',
  keyboard: false,
  show: false
});
  $('#printForm').on("submit", printMap);
})
