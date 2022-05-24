import json
import enum
import logging
from uuid import uuid4

import networkx as nx


# TODO added n11 to topology to test a "no existing route" case -> remove

def load_topology(path):
    """Loads topology (map) from json file into a networkX Graph and returns the graph"""
    data = _load_data(path)

    nodes = data["nodes"]
    edges = data["edges"]

    g = nx.MultiGraph()  # undirected graph --> walk edges in both directions
    # g = nx.MultiDiGraph()  # directed graph --> walk edges only in declared direction
    g.add_nodes_from(nodes)

    for node in nodes:  # add attribute values
        g.nodes[node]["id"] = nodes[node]["id"]
        g.nodes[node]["position"] = nodes[node]["position"]
        g.nodes[node]["type"] = nodes[node]["type"]

    for edge in edges:  # add edges with attributes
        g.add_edge(*(edges[edge]["from"], edges[edge]["to"]), weight=edges[edge]["distance"],
                   e_type=edges[edge]["type"], id=edges[edge]["id"])

    return g


def load_mapping(path):
    """Loads topology from json and returns dict that maps position (x,y,z) to the id of the node at that position"""

    data = _load_data(path)

    nodes = data["nodes"]

    mapping = {(value['position']['lat'], value['position']['long'], value['position']['alt']):
                   key for key, value in nodes.items()}

    return mapping


def _load_data(path):
    """Ensure that only the topology with information on the map is loaded and not
    the higher level scenario dict with additional information on entities that also contains the needed topology."""
    f = open(path)
    data = json.load(f)

    if "nodes" not in data and "topology" in data:
        data = data["topology"]

    return data




def backtrack_shortest_path(predecessors, start, end, distance):
    """Wraps the nx floyd_warshall reconstruct_path and throws Exception if no path exists"""
    if distance == float("inf"):
        raise ValueError(f"There is no path between these nodes. start: {start}, end: {end}, distance: {distance});")
    path = nx.algorithms.shortest_paths.dense.reconstruct_path(start, end, predecessors)
    return path


def generate_transaction_id():
    """generates and returns an uuid v4 for usage as transaction identifier"""
    return str(uuid4())[0:4]
