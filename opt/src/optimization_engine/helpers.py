import json
import enum
import logging
import networkx as nx


# TODO added n11 to topology to test a "no existing route" case -> remove


def load_topology(path):
    """Loads topology (map) from json file into a networkX Graph and returns the graph"""
    f = open(path)
    data = json.load(f)

    nodes = data["nodes"]
    edges = data["edges"]

    g = nx.MultiDiGraph()  # TODO clarify Graph type: directed, parallel edges allowed -> air / road
    g.add_nodes_from(nodes)

    for node in nodes:  # add attribute values
        g.nodes[node]["id"] = nodes[node]["id"]
        # g.nodes[node]["position"] = (nodes[node]["position"]["x"], nodes[node]["position"]["y"],
        #                              nodes[node]["position"]["z"])  # TODO position as tuple ??
        g.nodes[node]["position"] = nodes[node]["position"]
        g.nodes[node]["type"] = nodes[node]["type"]

    for edge in edges:  # add edges with attributes
        g.add_edge(*(edges[edge]["from"], edges[edge]["to"]), weight=edges[edge]["distance"],
                   e_type=edges[edge]["type"], id=edges[edge]["id"])  # TODO better use length instead of weight?

    # TODO create sub-graphs for air / road / node-types? -> necessary / nicer?
    return g


def load_mapping(path):
    """Loads topology from json and returns dict that maps position (x,y,z) to the id of the node at that position"""
    f = open(path)
    data = json.load(f)

    nodes = data["nodes"]
    mapping = {(value['position']['x'], value['position']['y'], value['position']['z']):
                   key for key, value in nodes.items()}

    print(mapping)
    return mapping


# TODO not needed?
# def position_dict2tuple(pos_dict):
#     return (pos_dict['x'], pos_dict['y'], pos_dict['z'])


def backtrack_shortest_path(predecessors, start, end, distance):
    """Wraps the nx floyd_warshall reconstruct_path and throws Exception if no path exists"""
    if distance == float("inf"):
        raise ValueError(f"There is no path between these nodes. start: {start}, end: {end}, distance: {distance});")
    path = nx.algorithms.shortest_paths.dense.reconstruct_path(start, end, predecessors)
    return path

