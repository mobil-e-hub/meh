from uuid import uuid4
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


class OptimizationEngine:

    def __init__(self, event_grid):
        self.id = str(uuid4())[0:8]
        self.event_grid = event_grid

        # Subscribe to relevant events
        # self.event_grid.subscribe('parcel/+/placed', self.run) TODO uncomment

        self.g_topo = load_topology('../../assets/topology.json')  # TODO move to helpers
        self.pred, self.dist = nx.floyd_warshall_predecessor_and_distance(self.g_topo)
        print(self.dist)

    def run(self, topic, message):
        print('opt_engine.run()')
        self.publish('completed', {'drones': [{'id': 'd00'}, {'id': 'd01'}]})

    def publish(self, topic, message='', sender=''):
        sender = sender or f'optimization-engine/{self.id}'
        self.event_grid.publish(f'{sender}/{topic}', message)

    #  TODO implement functions from control center

    def create_delivery_route(self, parcel):
        route = self.find_route()

        drone1 = self.__assign_drone(route[0])
        car = self.__assign_car(route[1])
        drone2 = self.__assign_drone(route[2])

        self.create_and_start_mission(parcel, drone1, car, drone2, route)

    def find_route(self):
        route1, route2, route3 = None, None, None

        return [route1, route2, route3]

    def __assign_drone(self, route):
        drone = route

        return drone

    def __assign_car(self, route):
        car = None

        return car

    def test(self):
        # TODO reset entities to fixed values

        # TODO create transactions

        # TODO create missions

        # TODO publish missions

        pass

    # TODO first transcribe test method from control-system
    def create_and_start_mission(self, parcel, drone1, car, drone2, route):


        # TODO create transactions

        # TODO create missions

        # TODO publish missions
        pass

    def create_transaction(self, parcel, start , dest):

    # TODO
    #       - floyd_warshall
    #       -  backtrack_shortest_path