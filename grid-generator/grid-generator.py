import argparse
import json
from math import asin, atan2, cos, degrees, radians, sin

# Radius of earth in km
RADIUS_OF_EARTH = 6371.0
NORTH = radians(0)
EAST = radians(90)
SOUTH = radians(180)
WEST = radians(270)


def angular_distance(distance):
    """Returns the angular distance given a distance (in km)."""
    return distance / RADIUS_OF_EARTH


def get_next_lat(lat, distance, bearing):
    """Gets the next latitude given the current latitude, distance (in km), and bearing."""
    ad = angular_distance(distance)
    return asin((sin(lat) * cos(ad)) + (cos(lat) * sin(ad) * cos(bearing)))


def get_next_lon(lat1, lat2, lon, distance, bearing):
    """Gets the next longitude given the current latitude, distance (in km), and bearing."""
    ad = angular_distance(distance)
    left = sin(bearing) * sin(ad) * cos(lat1)
    right = cos(ad) - sin(lat1) * sin(lat2)
    return lon + atan2(left, right)


def get_next_lat_lon(lat, lon, distance, bearing):
    """Gets the next latitude and longitude given the current latitude, distance (in km), and bearing."""
    lat_rads = radians(lat)
    lon_rads = radians(lon)
    lat2 = get_next_lat(lat_rads, distance, bearing)
    lon2 = get_next_lon(lat_rads, lat2, lon_rads, distance, bearing)
    return degrees(lon2), degrees(lat2)


def get_points_south(lat_start, lon_start, lat_end, step_size, points):
    """Find all points (in a straight line) south of a given latitude and longitude.
       The points are separated by step_size (in km) and points should initially be an empty list.
       Points will stop being generated once they reach the ending latitude.
    """
    points.append([lon_start, lat_start])
    if lat_start < lat_end:
        return points

    lon, lat = get_next_lat_lon(lat_start, lon_start, step_size, SOUTH)
    return get_points_south(lat, lon, lat_end, step_size, points)


def get_points_east(lat_start, lon_start, lon_end, step_size, points):
    """Find all points (in a straight line) east of a given latitude and longitude.
       The points are separated by step_size (in km) and points should initially be an empty list.
       Points will stop being generated once they reach the ending longitude.
    """
    points.append([lon_start, lat_start])
    if lon_start > lon_end:
        return points

    lon, lat = get_next_lat_lon(lat_start, lon_start, step_size, EAST)
    return get_points_east(lat, lon, lon_end, step_size, points)


def get_points_south_then_east(lat_start, lon_start, lat_end, lon_end, step_size):
    """Creates a grid of points.
       The points south of a starting point are found, and then for each of those points,
       the points east are found. This should fill a bounding box given by the starting and ending
       points of points separated by step_size in km.
    """
    points = []
    points_south = get_points_south(lat_start, lon_start, lat_end, step_size, [])

    for lon, lat in points_south:
        points.append(get_points_east(lat, lon, lon_end, step_size, []))

    return points


def get_points_east_then_south(lat_start, lon_start, lat_end, lon_end, step_size):
    """Creates a grid of points.
       The points east of a starting point are found, and then for each of those points,
       the points south are found. This should fill a bounding box given by the starting and ending
       points of points separated by step_size in km.
    """
    points = []
    points_east = get_points_east(lat_start, lon_start, lon_end, step_size, [])

    for lon, lat in points_east:
        points.append(get_points_south(lat, lon, lat_end, step_size, []))

    return points


def get_square_at_rc(row, col, points):
    """Given a matrix of points, find four points starting at row, col, that make a square.
       points is the matrix of points.
       The points are returned in such a way that they can be converted into geojson polygons.
    """
    return [points[row][col], points[row + 1][col], points[row + 1][col + 1], points[row][col + 1]]


def get_polygons(points):
    """Given a matrix of points, find all corners that make up a square and return them
       as an array of 4 points, (where each array represents a square).
    """
    polys = []
    # Get a square for every point except points in the last col and row.
    for r in range(len(points) - 1):
        for c in range(len(points[r]) - 1):
            polys.append(get_square_at_rc(r, c, points))

    return polys


def get_geo_json_points(points):
    """Convert all latitude and longitude points into a list of geojson multi-points."""
    coords = []

    for r in points:
        for c in r:
            coords.append(c)

    return json.dumps({'type': 'MultiPoint', 'coordinates': coords})


def get_geo_json_polys(points):
    """Convert all polygons into a geojson multi-polygon object."""
    polys = get_polygons(points)
    return json.dumps({'type': 'MultiPolygon', 'coordinates': [polys]})


def write_geo_json(file_name, data):
    """Write geojson data to a file at file_name"""
    with open(file_name, "w") as f:
        f.write(data)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("nw_lat", help="The North-West latitude in decimal degrees.", type=float)
    parser.add_argument("nw_lon", help="The North-West longitude in decimal degrees.", type=float)
    parser.add_argument("se_lat", help="The South-East latitude in decimal degrees.", type=float)
    parser.add_argument("se_lon", help="The South-East longitude in decimal degrees.", type=float)
    parser.add_argument("square_length", help="The length of an individual square of the grid (in km)", type=int)
    parser.add_argument("out_file", help="Location that json file should be written to.")
    parser.add_argument("-mp", "--multi-point", help="The North-West latitude in decimal degrees.", action="store_true")

    args = parser.parse_args()

    points = get_points_south_then_east(args.nw_lat, args.nw_lon, args.se_lat, args.se_lon, args.square_length)

    if args.multi_point:
        json_result = get_geo_json_points(points)
    else:
        json_result = get_geo_json_polys(points)

    write_geo_json(args.out_file, json_result)
