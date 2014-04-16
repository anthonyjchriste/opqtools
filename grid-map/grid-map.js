/*
 This file is part of opq-tools.

 opa-tools is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 opa-tools is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with opq-tools. If not, see <http://www.gnu.org/licenses/>.

 Copyright 2014 Anthony Christe
 */

var grid = (function() {
  "use strict";
  /* ------------------------- Private API -------------------------*/
  /**
   * The div containing the map.
   */
  var map;

  /**
   * The layer which contains the set of polygon grids.
   */
  var gridLayer;

  /**
   * The method which is called when a grid-square is clicked.
   */
  var onGridClickCallback;

  /**
   * List of grid-squares that are colored before a pan so that they can be recolored after a pan.
   * @type {Array}
   */
  var coloredLayers = [];

  /**
   * The grid-square that was previously clicked.
   */
  var oldLayer;

  /**
   * Converts degrees to radians.
   * @param degs - Degrees (as decimal)
   * @returns {number} radians.
   */
  function rads(degs) {
    return degs * (Math.PI / 180);
  }

  /**
   * Converts radians to decimal degrees.
   * @param rads - Radians to convert.
   * @returns {number} decimal degrees.
   */
  function degs(rads) {
    return rads * (180 / Math.PI);
  }

  /**
   * Convenience bearings for getNextLatLng method. These values can be passed into the method
   * as the bearing parameter.
   * @type {{NORTH: number, NORTH_EAST: number, EAST: number, SOUTH_EAST: number, SOUTH: number, SOUTH_WEST: number, WEST: number, NORTH_WEST: number}}
   */
  var bearing = {
    NORTH: 0,
    NORTH_EAST: rads(45),
    EAST: rads(90),
    SOUTH_EAST: rads(135),
    SOUTH: rads(180),
    SOUTH_WEST: rads(225),
    WEST: rads(270),
    NORTH_WEST: rads(315)
  };

  /**
   * Radius of earth in km.
   * @type {number}
   */
  var RADIUS_OF_EARTH = 6371.0;


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
   * This algorithm was adapted from http://www.movable-type.co.uk/scripts/latlong.html
   * The new latitude and longitude is calculated using the shortest path between two points over a great arc.
   * @param latDegrees The latitude in decimal degrees.
   * @param lngDegrees The longitude in decimal degrees.
   * @param bear Direction from the starting point to get to the new point in radians.
   * @param distance The distance from the starting point to the new point in km.
   * @returns {LatLng} A new LatLng object representing the new point in decimal degrees.
   */
  function getNextLatLng(latDegrees, lngDegrees, bear, distance) {
    var lat = rads(latDegrees);
    var lng = rads(lngDegrees);
    var ad = getAngularDistance(distance);
    var newLat = Math.asin((Math.sin(lat) * Math.cos(ad)) + (Math.cos(lat) * Math.sin(ad) * Math.cos(bear)));
    var newLng = lng + Math.atan2(Math.sin(bear) * Math.sin(ad) * Math.cos(lat),
      Math.cos(ad) - Math.sin(lat) * Math.sin(newLat));
    return L.latLng(degs(newLat), degs(newLng));
  }

  /**
   * Given a bounding box, return a new padded bounding box.
   * @param bounds - The bounding box to pad.
   * @param padding - The amount of padding (in km) that will be added in each direction.
   * @returns {*} - The padded ounding box.
   */
  function getPaddedBounds(bounds, padding) {
    var boundsSW = getNextLatLng(bounds.getSouth(), bounds.getWest(), bearing.SOUTH_WEST, padding);
    var boundsNE = getNextLatLng(bounds.getNorth(), bounds.getEast(), bearing.NORTH_EAST, padding);
    return L.latLngBounds(boundsSW, boundsNE);
  }

  /**
   * Returns an object that contains a point, plus the row and col of the point.
   * @param r - Row of the point.
   * @param c - Col of point.
   * @param point
   * @returns {{r: Number, c: Number, point: *}}
   */
  function getAnnotatedPoint(r, c, point) {
    return {r: r, c: c, point: point};
  }

  /**
   * Given a bounding box and distance scale, get the closest NW point that is within the bounding box.
   * @param bounds - The bounding box to find the point inside.
   * @param distance - The scale of the grid squares in km.
   * @returns {*} - The first NW point inside the bounding box, plus its row and col.
   */
  function getNWPoint(bounds, distance) {
    var point = config.startPoint;
    var r = 0;
    var c = 0;

    while (point.lng < bounds.getWest() && point.lng < config.endPoint.lng) {
      point = getNextLatLng(point.lat, point.lng, bearing.EAST, distance);
      c++;
    }

    while (point.lat > bounds.getNorth() && point.lat > config.endPoint.lat) {
      point = getNextLatLng(point.lat, point.lng, bearing.SOUTH, distance);
      r++;
    }

    return getAnnotatedPoint(r, c, point);
  }

  /**
   * Returns a matrix of points representing the corners of each square in our grid.
   * Points are only saved if they are just outside of the bounding box determined by
   * the current viewable area of the map.
   * @param distance - The distance east and south and each point in the grid.
   * @returns {Array} - A 2d array where each row is a row of points in the grid.
   */
  function getGridPoints(distance) {
    // Pad the bounding box so that grid stops just off of screen
    var paddedBounds = getPaddedBounds(map.getBounds(), distance * 4);

    // Find the closest point just NW of our BB
    var nwPoint = getNWPoint(paddedBounds, distance);
    var pointRow = nwPoint.point;
    var pointCol;

    var r = nwPoint.r;
    var c = nwPoint.c;

    var matrix = [];
    var row = [];

    // For each row of our grid
    while (pointRow.lat > paddedBounds.getSouth() && pointRow.lat > config.endPoint.lat) {
      row = [];
      pointCol = pointRow;

      // Reset the column index
      c = nwPoint.c;

      // For each col in that row
      while (pointCol.lng < paddedBounds.getEast() && pointCol.lng < config.endPoint.lng) {
        // If this point is visible on current map, save it
        if (paddedBounds.contains(pointCol)) {
          row.push(getAnnotatedPoint(r, c, pointCol));
        }
        pointCol = getNextLatLng(pointCol.lat, pointCol.lng, bearing.EAST, distance);
        c++;
      }
      pointRow = getNextLatLng(pointRow.lat, pointRow.lng, bearing.SOUTH, distance);
      r++;

      // Don't add empty rows to the matrix
      if (row.length > 0) {
        matrix.push(row);
      }
    }

    return matrix;
  }


  /**
   * Calculates the hierarchical id of a grid square.
   * @param r The row of the grid square.
   * @param c The col of the grid square.
   * @param scale The length of each grid square.
   * @param id The field is used in the recursive call to build the id string.
   * @returns {*} The formatted id for this grid square.
   */
  function getGridSquareId(r, c, scale, id) {
    id = id || "";

    if (scale === 128) {
      return r + "," + c + ":" + id;
    }

    var left = (c % 2) === 0;
    var top = (r % 2) === 0;
    var idPart;

    if (left && top) {
      idPart = "0";
    }
    if (!left && top) {
      idPart = "1";
    }
    if (!left && !top) {
      idPart = "2";
    }
    if (left && !top) {
      idPart = "3";
    }

    return getGridSquareId(Math.floor(r / 2), Math.floor(c / 2), scale * 2, idPart + id);
  }


  /**
   * Creates a polygon given a set of points, a starting point, and the distance between points.
   * @param gridPoints - The matrix of points.
   * @param r - The upper left row of the polygon.
   * @param c = The upper left column of the polygon.
   * @param distance - The distance between points.
   * @returns {{type: string, properties: {row: (*|Number), col: (*|Number), scale: *, popupContent: string},
   * geometry: {type: string, coordinates: *[]}}}
   */
  function getPoly(gridPoints, r, c, distance) {
    /**
     * Swaps the latitude and longitude from a latLng object.
     * @param latLng The latLng to swap.
     * @returns {number[]} Swapped latLng as an array.
     */
    function swapLatLng(latLng) {
      return [latLng.lng, latLng.lat];
    }

    var row = gridPoints[r][c].r;
    var col = gridPoints[r][c].c;
    var id = getGridSquareId(row, col, distance);

    var feature = {
      type: "Feature",
      properties: {
        row: row,
        col: col,
        scale: distance,
        id: id,
        boundingBox: L.latLngBounds(gridPoints[r + 1][c].point, gridPoints[r][c + 1].point),
        popupContent: "row: " + row +
          "<br />col: " + col +
          "<br />scale: " + distance +
          "<br />id: " + id
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            swapLatLng(gridPoints[r][c].point),
            swapLatLng(gridPoints[r + 1][c].point),
            swapLatLng(gridPoints[r + 1][c + 1].point),
            swapLatLng(gridPoints[r][c + 1].point)
          ]
        ]
      }
    };

    return feature;
  }

  /**
   * Points are stored for each polygon in the following order: NW, SW, SE, NE.
   * It should also be noted that the latitude and longitude are switched positionally
   * when creating a multi-polygon compared to the rest of the leaflet api.
   * @param gridPoints
   */
  function getPolys(gridPoints, distance) {
    var polys = [];

    // For each point in the grid
    for (var r = 0; r < gridPoints.length; r++) {
      for (var c = 0; c < gridPoints[r].length; c++) {

        // If a square polygon can be made from the current point, make it
        if (r + 1 < gridPoints.length - 1 && c + 1 < gridPoints[r].length - 1) {
          polys.push(getPoly(gridPoints, r, c, distance));
        }
      }
    }
    return polys;
  }

  /**
   * Redraw the grid.
   * @param distance - The length of the side of each square in the grid.
   */
  function updateGrid(distance) {
    if (map.hasLayer(gridLayer)) {
      map.removeLayer(gridLayer);
    }

    function onEachFeature(feature, layer) {
      if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
      }

      if(callbacks.onGridClick) {
        layer.on({
          click: function() {callbacks.onGridClick(feature, layer)}
        });
      }

      if(config.invariantColorizationMode) {
        for(var i = 0; i < coloredLayers.length; i++) {
          if(coloredLayers[i][0] === feature.properties.id) {
            layer.setStyle({fillColor: coloredLayers[i][1]});
          }
        }
      }
    }

    var points = getGridPoints(distance);
    var polys = getPolys(points, distance);

    gridLayer = L.geoJson(polys, {
      onEachFeature: onEachFeature
    }).addTo(map);
  }

  /**
   * Get the current zoom level and update the grid.
   */
  function onMapChange() {
    var zoom = map.getZoom();
    updateGrid(getDistanceByZoom(zoom));
  }

  /**
   * Return the distance between points in the grid based on the zoom level of the map.
   * @param zoom - Zoom of the map.
   * @returns {number} distance in km.
   */
  function getDistanceByZoom(zoom) {
    switch (zoom) {
      case 5:
      case 6:
      case 7:
        return 128;
      case 8:
      case 9:
        return 64;
      case 10:
        return 32;
      case 11:
        return 16;
      case 12:
        return 8;
      case 13:
        return 4;
      case 14:
        return 2;
      case 15:
        return 1;
      case 16:
        return 0.5;
      case 17:
        return 0.25;
      case 18:
        return 0.125;
    }
  }

  /* ------------------------- Public API -------------------------*/

  /**
   * Defines starting and stopping points (lat, lng) that bound the grid creation algorithms.
   * Currently, the bounding box created by the two points contain the entire Hawaiian island chain.
   * The points would need to be customized to work over other regions of interest. The startPoint should be the
   * NW point of the bounding box, and the endpoint should be the SE point of the bounding box.
   *
   * Our default values are provides below, but any of these can be overridden since they're presented in the public
   * API.
   *
   * @type {{startPoint: latLng, endPoint: latLng}}
   */
  var config = {
    startPoint: L.latLng(22.534353, -161.004639),
    endPoint: L.latLng(16.719592, -151.853027),
    maxZoom: 18,
    minZoom: 5,
    singleSelectionMode: false,
    invariantColorizationMode: false,
    onGridClickCallback: null,
  };

  /**
   * List of public callbacks that users can implement.
   */
  var callbacks = {
    onGridClick: null,
  };


  /**
   * Create a map with a grid layer.
   * @param div The div to create the map on.
   * @param center The center of the map view.
   * @param zoom The zoom level of the map.
   */
  function initMap(div, center, zoom) {
    var osmUrl = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    var osmAttrib = "Map data © OpenStreetMap contributors";
    var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});
    map = L.map(div, {maxZoom: config.maxZoom, minZoom: config.minZoom});
    map.addLayer(osm);

    map.setView(center, zoom);
    updateGrid(getDistanceByZoom(zoom));

    map.on("zoomend", onMapChange);
    map.on("dragend", onMapChange);
  }

  /**
   * Color a grid square represented as a layer.
   * @param feature Contains the row, column, and grid-scale information.
   * @param layer The layer to color.
   * @param color The color to color the layer (can specified in English (i.e. red) or as hex (i.e. #FF0000).
   */
  function colorLayer(feature, layer, color) {
    if(config.singleSelectionMode) {
      if(config.invariantColorizationMode) {
        coloredLayers = [];
        coloredLayers.push([feature.properties.id, color]);
      }
      if(oldLayer) {
        oldLayer.setStyle({fillColor: "#0033FF"})
      }
      oldLayer = layer;
    }
    layer.setStyle({fillColor: color})
  }


  function setOnGridClickCallback(callback) {
    onGridClickCallback = callback;
  }

  /**
   * Draws a small circle on the map which can be used in debugging.
   * @param latLng - The latitude and longitude to place the point.
   * @param color - The color of the point.
   */
  function addDebugPoint(latLng, color) {
    color = color || 'red';
    var debugPoint = L.circle(latLng, 500, {color: color}).addTo(map);
  }

  /**
   * If the map is drawn and the page it is drawn on is dynamically updated, the map may be displayed incorrectly.
   * This method invalidates the map and forces a redraw.
   */
  function invalidateSize() {
    if(map) {
      map.invalidateSize();
    }
  }

  /**
   * Convienience object allowing us to center the map over any of the following Hawaiian islands.
   */
  var island = {
    BIG_ISLAND: {
      latLng: L.latLng(19.609926, -155.484009),
      defaultZoom: 9
    },
    KAUAI: {
      latLng: L.latLng(22.057244, -159.506378),
      defaultZoom: 11
    },
    LANAI: {
      latLng: L.latLng(20.829093, -156.919785),
      defaultZoom: 12
    },
    MAUI: {
      latLng: L.latLng(20.786128, -156.305237),
      defaultZoom: 10
    },
    MOLOKAI: {
      latLng: L.latLng(21.121454, -156.996689),
      defaultZoom: 11
    },
    OAHU: {
      latLng: L.latLng(21.466700, -157.983300),
      defaultZoom: 10
    }
  };

  return {
    config: config,
    callbacks: callbacks,
    initMap: initMap,
    colorLayer: colorLayer,
    setOnGridClickCallback: setOnGridClickCallback,
    addDebugPoint: addDebugPoint,
    invalidateSize: invalidateSize,
    island: island
  };
})();





