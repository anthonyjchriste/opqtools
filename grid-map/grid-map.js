var Grid = {};

var

/*
 * For grid squares to always be drawn in the same location, we need a constant reference point.
 * This reference point is the starting location for all of our calculations. For it to be effective,
 * it's important that it lays North West of just outside of the region you will be analyzing.
 *
 * For example, if you're interested is analyzing Hawaii, a good reference point would be just NW of
 * the island of Niihau (23.039297747769726, -161.455078125). This may need some re-thinking if you want
 * to scale it nation wide.
 */
var START_POINT = L.latLng(24.029072, -162.312012);

var END_POINT = L.latLng(17.619592, -151.853027);

var RADIUS_OF_EARTH = 6371.0; // in km
var PI = 3.14159265;

/*
 * Convenience bearings for getNextLatLng method. These values can be passed into the method
 * as the bearing parameter.
 */

var Bearing = {
  NORTH: rads(0),
  NORTH_EAST: rads(45),
  EAST: rads(90),
  SOUTH_EAST: rads(135),
  SOUTH: rads(180),
  SOUTH_WEST: rads(225),
  WEST: rads(270),
  NORTH_WEST: rads(315)
};

var Island = {
  BIG_ISLAND: {latLng: L.latLng(19.609926, -155.484009), defaultZoom: 9},
  KAUAI: {latLng: L.latLng(22.057244, -159.506378), defaultZoom: 11},
  LANAI: {latLng: L.latLng(20.829093, -156.919785), defaultZoom: 12},
  MAUI: {latLng: L.latLng(20.786128, -156.305237), defaultZoom: 10},
  MOLOKAI: {latLng: L.latLng(21.121454, -156.996689), defaultZoom: 11},
  OAHU: {latLng: L.latLng(21.466700, -157.983300), defaultZoom: 10}
};


var map;
var gridLayer;

/**
 * Converts degrees to radians.
 * @param degs - Degrees (as decimal)
 * @returns {number} radians.
 */
function rads(degs) {
  return degs * (PI / 180);
}

/**
 * Converts radians to decimal degrees.
 * @param rads - Radians to convert.
 * @returns {number} degrees.
 */
function degs(rads) {
  return rads * (180 / PI);
}

/**
 * Converts distance to angular distance.
 * @param distance - Non-angular distance.
 * @returns {number} Angular distance.
 */
function getAngularDistance(distance) {
  return distance / RADIUS_OF_EARTH;
}

/**
 * Returns a new latitude and longitude given a starting latitude, longitude, bearing, and distance.
 * This algorithm was adapted from // http://www.movable-type.co.uk/scripts/latlong.html
 * The new latitude and longitude is calculated using the shortest path between two points over a great arc.
 * @param latDegrees The latitude in decimal degrees.
 * @param lngDegrees The longitude in decimal degrees.
 * @param bearing Direction from the starting point to get to the new point in radians.
 * @param distance The distance from the starting point to the new point in km.
 * @returns {LatLng} A new LatLng object representing the new point in decimal degrees.
 */
function getNextLatLng(latDegrees, lngDegrees, bearing, distance) {
  var lat = rads(latDegrees);
  var lng = rads(lngDegrees);
  var ad = getAngularDistance(distance);
  var newLat = Math.asin((Math.sin(lat) * Math.cos(ad)) + (Math.cos(lat) * Math.sin(ad) * Math.cos(bearing)));
  var newLng = lng + Math.atan2(Math.sin(bearing) * Math.sin(ad) * Math.cos(lat), Math.cos(ad) - Math.sin(lat) * Math.sin(newLat));

  return L.latLng(degs(newLat), degs(newLng));
}

function getGridPoints(bounds, scale) {
  var lat = START_POINT.lat;
  var lng = START_POINT.lng;

  var boundsSW = getNextLatLng(bounds.getSouth(), bounds.getWest(), Bearing.SOUTH_WEST, scale * 2);
  var boundsNE = getNextLatLng(bounds.getNorth(), bounds.getEast(), Bearing.NORTH_EAST, scale * 2);
  var paddedBounds = L.latLngBounds(boundsSW, boundsNE);

  var lst = [];
  var row = [];

  var latLng;

  // For each row in the grid
  while (lat > paddedBounds.getSouth() && lat > END_POINT.lat) {
    row = [];
    lat = getNextLatLng(lat, lng, Bearing.SOUTH, scale).lat;

    // For each col in that row
    while (lng < paddedBounds.getEast() && lng < END_POINT.lng) {
      lng = getNextLatLng(lat, lng, Bearing.EAST, scale).lng;
      latLng = L.latLng(lat, lng);

      // If this point is visible on current map, save it
      if (paddedBounds.contains(latLng)) {
        row.push(latLng);
      }
    }

    lng = START_POINT.lng;

    lst.push(row);
  }
  return lst;
}

function swapLatLng(latLng) {
  return [latLng.lng, latLng.lat];
}


/**
 * Points are stored for each polygon in the following order: NW, SW, SE, NE.
 * It should also be noted that the latitude and longitude are switched positionally
 * when creating a multi-polygon compared to the rest of the leaflet api.
 * @param gridPoints
 */
function getPolys(gridPoints) {
  var polys = [];

  for (var r = 0; r < gridPoints.length; r++) {
    for (var c = 0; c < gridPoints[r].length; c++) {
      if (r + 1 < gridPoints.length - 1 && c + 1 < gridPoints[r].length - 1) {
        polys.push([
          swapLatLng(gridPoints[r][c]),
          swapLatLng(gridPoints[r + 1][c]),
          swapLatLng(gridPoints[r + 1][c + 1]),
          swapLatLng(gridPoints[r][c + 1])
        ]);
      }
    }
  }

  return polys;
}

function updateGrid(distance) {

  if (map.hasLayer(gridLayer)) {
    map.removeLayer(gridLayer);
  }


  var points = getGridPoints(map.getBounds(), distance);
  var polys = getPolys(points);
  var grid = {"type": "MultiPolygon", "coordinates": [polys]};

  gridLayer = L.geoJson(grid).addTo(map);
}

function getDistanceByZoom(zoom) {
  switch (zoom) {
    case 4:
    case 5:
    case 6:
    case 7:
      return 128;
    case 8:
      return 64;
    case 9:
      return 32;
    case 10:
      return 32;
    case 11:
      return 16;
    case 12:
      return 4;
    case 13:
      return 2;
    case 14:
    case 15:
      return 1;
    default:
      return 64;
  }
}

function onMapChange(e) {
  var zoom = map.getZoom();
  updateGrid(getDistanceByZoom(zoom));
}

function initMap(div, center, zoom) {
  var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var osmAttrib = 'Map data © OpenStreetMap contributors';
  var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});
  map = L.map(div
      , {maxZoom: 15, minZoom: 5});
  map.addLayer(osm);

  map.setView(center, zoom);
  updateGrid(getDistanceByZoom(zoom));

  map.on('zoomend', onMapChange);
  map.on('dragend', onMapChange);
}


