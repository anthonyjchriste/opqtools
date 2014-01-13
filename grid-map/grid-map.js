var grid = (function() {
    var map;
    var gridLayer;

    /**
     * Defines starting and stopping points (lat, lng) that bound the grid creation algorithms.
     * Currently, the bounding box created by the two points contain the entire Hawaiian island chain.
     * The points would need to be customized to work over other regions of interest. The startPoint should be the
     * NW point of the bounding box, and the endpoint should be the SE point of the bounding box.
     * @type {{startPoint: latLng, endPoint: latLng}}
     */
    var config = {
        startPoint: L.latLng(24.029072, -162.312012),
        endPoint: L.latLng(17.619592, -151.853027)
    };

    /**
     * Convenience bearings for getNextLatLng method. These values can be passed into the method
     * as the bearing parameter.
     * @type {{NORTH: number, NORTH_EAST: number, EAST: number, SOUTH_EAST: number, SOUTH: number, SOUTH_WEST: number, WEST: number, NORTH_WEST: number}}
     */
    var bearing = {
        NORTH: 0,
        NORTH_EAST: 0.7853981625,
        EAST: 1.570796325,
        SOUTH_EAST: 2.3561944875000003,
        SOUTH: 3.14159265,
        SOUTH_WEST: 3.9269908125000006,
        WEST: 4.7123889750000005,
        NORTH_WEST: 5.4977871375000005
    };

    /**
     * Radius of earth in km.
     * @type {number}
     */
    var RADIUS_OF_EARTH = 6371.0;

    /**
     * The constant Pi.
     * @type {number}
     */
    var PI = 3.14159265;

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
     * @returns {number} decimal degrees.
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
     * This algorithm was adapted from http://www.movable-type.co.uk/scripts/latlong.html
     * The new latitude and longitude is calculated using the shortest path between two points over a great arc.
     * @param latDegrees The latitude in decimal degrees.
     * @param lngDegrees The longitude in decimal degrees.
     * @param bearing Direction from the starting point to get to the new point in radians.
     * @param distance The distance from the starting point to the new point in km.
     * @returns {LatLng} A new LatLng object representing the new point in decimal degrees.
     */
    function getNextLatLng(latDegrees, lngDegrees, bear, distance) {
        var lat = rads(latDegrees);
        var lng = rads(lngDegrees);
        var ad = getAngularDistance(distance);
        var newLat = Math.asin((Math.sin(lat) * Math.cos(ad)) + (Math.cos(lat) * Math.sin(ad) * Math.cos(bear)));
        var newLng = lng + Math.atan2(Math.sin(bear) * Math.sin(ad) * Math.cos(lat), Math.cos(ad) - Math.sin(lat) * Math.sin(newLat));
        return L.latLng(degs(newLat), degs(newLng));
    }

    /**
     * Returns a matrix of points representing the corners of each square in our grid.
     * Points are only saved if they are just outside of the bounding box determined by
     * the current viewable area of the map.
     * @param bounds - The bounding box to generate points in.
     * @param distance - The distance east and south and each point in the grid.
     * @returns {Array} - A 2d array where each row is a row of points in the grid.
     */
    function getGridPoints(bounds, distance) {
        var lat = config.startPoint.lat;
        var lng = config.startPoint.lng;

        // Created a padded bounds so points lie just outside of the viewable map
        var boundsSW = getNextLatLng(bounds.getSouth(), bounds.getWest(), bearing.SOUTH_WEST, distance * 2);
        var boundsNE = getNextLatLng(bounds.getNorth(), bounds.getEast(), bearing.NORTH_EAST, distance * 2);

        var paddedBounds = L.latLngBounds(boundsSW, boundsNE);

        var lst = [];
        var row = [];

        var latLng;

        // For each row in the grid
        while (lat > paddedBounds.getSouth() && lat > config.endPoint.lat) {
            row = [];
            lat = getNextLatLng(lat, lng, bearing.SOUTH, distance).lat;

            // For each col in that row
            while (lng < paddedBounds.getEast() && lng < config.endPoint.lng) {
                lng = getNextLatLng(lat, lng, bearing.EAST, distance).lng;
                latLng = L.latLng(lat, lng);

                // If this point is visible on current map, save it
                if (paddedBounds.contains(latLng)) {
                    row.push(latLng);
                }
            }

            lng = config.startPoint.lng;

            lst.push(row);
        }
        return lst;
    }

    /**
     * Swaps the latitude and longitude from a latLng object.
     * @param latLng The latLng to swap.
     * @returns {*[]} Swapped latLng as an array.
     */
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

        // For each point in the grid
        for (var r = 0; r < gridPoints.length; r++) {
            for (var c = 0; c < gridPoints[r].length; c++) {

                // If a square polygon can be made from the current point, make it
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

    /**
     * Redraw the grid.
     * @param distance - The length of the side of each square in the grid.
     */
    function updateGrid(distance) {
        if (map.hasLayer(gridLayer)) {
            map.removeLayer(gridLayer);
        }


        var points = getGridPoints(map.getBounds(), distance);
        var polys = getPolys(points);
        var grid = {"type": "MultiPolygon", "coordinates": [polys]};

        gridLayer = L.geoJson(grid).addTo(map);
    }

    /**
     * Return the distance between points in the grid based on the zoom level of the map.
     * @param zoom - Zoom of the map.
     * @returns {number} distance in km.
     */
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

    /**
     * Get the current zoom level and update the grid.
     * @param e
     */
    function onMapChange(e) {
        var zoom = map.getZoom();
        updateGrid(getDistanceByZoom(zoom));
    }


    return {
        /**
        * Create a map with a grid layer.
        * @param div The div to create the map on.
        * @param center The center of the map view.
        * @param zoom The zoom level of the map.
        */
        initMap: function(div, center, zoom) {
            console.log("initMap bearing " + bearing.NORTH);
            console.log(rads(0));
            console.log(rads(45));
            console.log(rads(90));
                console.log(rads(135));
                    console.log(rads(180));
                        console.log(rads(225));
                            console.log(rads(270));
                                console.log(rads(315));
            var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib = 'Map data © OpenStreetMap contributors';
            var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});
            map = L.map(div, {maxZoom: 15, minZoom: 5});
            map.addLayer(osm);

            map.setView(center, zoom);
            updateGrid(getDistanceByZoom(zoom));

            map.on('zoomend', onMapChange);
            map.on('dragend', onMapChange);
        }
    };
})();


var Island = {
  BIG_ISLAND: {latLng: L.latLng(19.609926, -155.484009), defaultZoom: 9},
  KAUAI: {latLng: L.latLng(22.057244, -159.506378), defaultZoom: 11},
  LANAI: {latLng: L.latLng(20.829093, -156.919785), defaultZoom: 12},
  MAUI: {latLng: L.latLng(20.786128, -156.305237), defaultZoom: 10},
  MOLOKAI: {latLng: L.latLng(21.121454, -156.996689), defaultZoom: 11},
  OAHU: {latLng: L.latLng(21.466700, -157.983300), defaultZoom: 10}
};




