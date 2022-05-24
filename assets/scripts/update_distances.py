from geopy import distance
from openrouteservice import client
import json
import logging

""" 
Python Script that reads a given JSON meh-topology , retrieves the nodes and their coordinates 
and updates the edge lengths with the real distance in meters in JSON file.
- For road edges: query ORS => https://openrouteservice.org/services/
- For air edges: calculate beeline (geodesic) distance using the geopy library

:parameter
- file_path: JSON file with the topology to update
- ors_key: API key for the free ORS Web API
- decimal_places: for final rounding of the computed distance values
"""

##### Parameters
file_path = "../topology_reallabor_1_v1.json"
ors_key = "5b3ce3597851110001cf624873c91b921870496a8a06924ca3131d14"
decimal_places = 2  # number of digits after decimal point for rounding of computed distance value (in meter)
log_level = logging.INFO
#####

logger = logging.getLogger('')
logger.setLevel(log_level)
ors = client.Client(key=ors_key)

topology = json.loads(open(file_path).read())


# Helper functions
def reverse_coordinate_order(coord):
    """Necessary since geopy expects coordinates as (lat, lon), while OpenRouteService uses (lon, lat)."""
    return (coord[1], coord[0])


logging.info(f"Started script: Updating distance values in {file_path}!")
# create Dict with nodeID -> coordinates for lookup during value replacement
# [print(node) for node in topology["topology"]["nodes"]]
node_mapping = {k: v["position"] for (k, v) in topology["topology"]["nodes"].items()}
edges = {k: (v["from"], v["to"], v["type"]) for k, v in topology["topology"]["edges"].items()}

for (e_id, edge) in edges.items():
    # retrieve coordinates
    h1, h2, e_type = edge[0], edge[1], edge[2]
    coord_1 = (node_mapping[h1]["lat"], node_mapping[h1]["long"])
    coord_2 = (node_mapping[h2]["lat"], node_mapping[h2]["long"])

    length = 0
    logging.info(f"Edge {e_id} with coordinates: {coord_1} -> {coord_2}")
    if e_type == "air":
        # get distance from geopy
        length = round(distance.distance(coord_1, coord_2).meters, decimal_places)
        logging.info(f"Computed distance for Drone-route edge {e_id} from geopy: {length}")
    elif e_type == "road":
        # get distance from OpenRouteService
        reverse = (reverse_coordinate_order(coord_1), reverse_coordinate_order(coord_2))
        ors_route = ors.directions(reverse, profile='driving-car')
        # print(ors_route)
        length = round(ors_route['routes'][0]['summary']['distance'], decimal_places)

        logging.info(f"Computed distance for Car-route edge {e_id} from ORS: {length}")
    else:
        logging.error(f"ERROR: unknown edge type {edge['type']}. Expected air or road")

    topology["topology"]["edges"][e_id]["distance"] = length

with open(file_path, "w") as json_file:
    json.dump(topology, json_file)
json_file.close()

logging.info(f"Update of distance values in {file_path} finished!")

