import json
import networkx as nx

def load_topology(path):
    f = open(path)
    data = json.load(f)

    nodes = data["nodes"]
    edges = data["edges"]

    g = nx.MultiGraph()  # TODO correct Graph type: undirected, parallel edges allowed -> air / road
    g.add_nodes_from(nodes)  # TODO check

    for node in nodes:  # add attribute values
        g.nodes[node]["id"] = nodes[node]["id"]
        g.nodes[node]["position"] = nodes[node]["position"]
        g.nodes[node]["type"] = nodes[node]["type"]

    for edge in edges:  # add edges with attributes
        g.add_edge(*(edges[edge]["from"], edges[edge]["to"]), weight=edges[edge]["distance"],
                   e_type=edges[edge]["type"], id=edges[edge]["id"])  # TODO use weight or length? -> check difference

    # print("Graph:")
    # print(list(g.nodes(data=True)))
    # print(list(g.edges(data=True)))

    # TODO create sub-graphs for air / road / node-types

    return g


def load_mapping(path):
    f = open(path)
    data = json.load(f)

    nodes = data["nodes"]
    # TODO debug --> dict as key possible in python
    mapping = {value: key for key, value in nodes.items()}
    return mapping
