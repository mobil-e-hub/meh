from uuid import uuid4
import json
import logging
import copy

import networkx as nx
from .helpers import load_topology, load_mapping, backtrack_shortest_path, DroneState, VehicleState


# TODO: inherits from mqtt Client to enable notifications on new system states
class OptimizationEngine:

    def __init__(self, mqtt_client):
        logging.basicConfig(level=logging.INFO)

        self.id = str(uuid4())[0:8]
        self.mqtt_client = mqtt_client

        # Subscribe to relevant events -> MQTT
        # self.event_grid.subscribe('parcel/+/placed', self.run) TODO uncomment

        self.g_topo = load_topology('../../assets/topology.json')
        self.mapping = load_mapping('../../assets/topology.json')  # hub_id <-> node_id
        self.pred, self.dist = nx.floyd_warshall_predecessor_and_distance(self.g_topo)
        print(self.dist)

        self.hubs = {}
        self.drones = {}
        self.cars = {}
        self.busses = {}
        self.parcels = {}
        self.orders = {}
        # addresses / customers

        # test find_route
        self.test_init()
        self.create_delivery_route(self.parcels['p00'])
        # self.find_route(self.parcels['p00'])  # TODO trigger by function

    def run(self, topic, message):
        print('opt_engine.run()')
        self.publish('completed', {'drones': [{'id': 'd00'}, {'id': 'd01'}]})

    def publish(self, topic, message='', sender=''):
        sender = sender or f'optimization-engine/{self.id}'
        self.mqtt_client.publish(f'{sender}/{topic}', message)

    # --------------------------------
    #  TODO implement functions from control center

    def create_delivery_route(self, parcel):
        route = self.find_route(parcel)

        # TODO drone saved as tuple
        drone1 = self.__assign_drone(route['air1'])
        print(drone1)
        vehicle, v_type = self.__assign_vehicle(route['road'])  # v_type is 'car' or 'bus'
        drone2 = self.__assign_drone(route['air2'])

        print(f"After Assigns: {route}")

        # TODO if 1 return is None send a failed mission to visualization instead of publishing missions...
        self.create_and_start_mission(parcel, drone1, vehicle, drone2, route)  # TODO include v_type

    # TODO test debug from fake Parcel!!

    def find_route(self, parcel):
        # TODO consider edge types, currently: parcel start end should be air nodes, then air -> road -> air is selected

        # map hubs to their node location
        node_source = self.hubs[parcel['carrier']['id']]['position']
        node_destination = self.hubs[parcel['destination']['id']]['position']

        # find closest road junction to source & destination hubs  (parking: both drones and cars can access)
        nodes_road = [x for x, y in self.g_topo.nodes(data=True) if y['type'] == 'parking']  # map n => n.id

        source_min_dist_junctions = [self.dist[node_source][x] for x in nodes_road]
        junction_source = nodes_road[source_min_dist_junctions.index(min(source_min_dist_junctions))]

        dest_min_dist_junctions = [self.dist[x][node_destination] for x in nodes_road]
        junction_destination = nodes_road[dest_min_dist_junctions.index(min(dest_min_dist_junctions))]

        print(f"First Junction:  {junction_source}")
        print(f"Second Junction: {junction_destination}")

        try:
            route1 = {'distance': self.dist[node_source][junction_source],
                      'path': backtrack_shortest_path(self.pred, node_source, junction_source,
                                                      self.dist[node_source][junction_source])}
        except ValueError as e:
            logging.error("No first route exists" + str(e))
        try:
            route2 = {'distance': self.dist[junction_source][junction_destination],
                      'path': backtrack_shortest_path(self.pred, junction_source, junction_destination,
                                                      self.dist[junction_source][junction_destination])}
        except ValueError as e:
            logging.error("No second route 2 exists" + str(e))
        try:
            route3 = {'distance': self.dist[junction_destination][node_destination],
                      'path': backtrack_shortest_path(self.pred, junction_destination, node_destination,
                                                      self.dist[junction_destination][node_destination])}
        except ValueError as e:
            logging.error("No third route exists" + str(e))

        logging.info(f"New route for parcel {parcel['id']}: {[route1, route2, route3]}")

        return {"air1": route1, "road": route2, "air2": route3}

    def __assign_drone(self, route):
        """returns id of idle drone for a sub-route. picks closest one to start of route.
        """
        # TODO where save drone speed --> constant at first???
        drone_speed = 2
        idle_drones = self.get_idle_drones()

        try:
            optimal_drone_id = self.__assign_entity(route, idle_drones, drone_speed)
        except ValueError as e:
            logging.error("Failed to assign drone: " + str(e))

        logging.info(f"Assigned Drone to route: {route} -> Drone/{optimal_drone_id}")
        return optimal_drone_id

    def __assign_vehicle(self, route):

        car_speed = 10
        idle_cars = self.get_idle_cars()
        vehicle_type = "car"

        try:
            optimal_vehicle, vehicle_distance = self.__assign_entity(route, idle_cars, car_speed)
        except ValueError as e:
            logging.error("Failed to assign car: " + str(e))

        # TODO assign_bus
        optimal_bus, bus_distance = self.__assign_bus(route)

        if vehicle_distance > bus_distance:
            optimal_vehicle = optimal_bus
            vehicle_type = "bus"

        # TODO return tuple (id, type, time) or dict with everything??
        logging.info(f"Assigned Ground vehicle to route: {route} -> {vehicle_type}/{optimal_vehicle}")

        # TODO also return whether bus or car???
        return optimal_vehicle, vehicle_type

    def __assign_entity(self, route, entities, speed):
        """Finds closest entity (drone or car) to the start node of a route and returns its id"""
        # TODO copy of route needed

        optimal_entity = None
        optimal_entity_index = 0
        optimal_distance = float("inf")  # TODO change to time??

        node = route['path'][0]  # get first element
        travel_time = [None] * len(entities)

        for idx, entity in enumerate(entities):
            entity_position = self.get_hub_id_by_location(entity[1]['position'])
            distance = self.dist[entity_position][node]

            travel_time[idx] = (distance + route['distance']) / speed  # TODO drone speed put in representation?

            if optimal_entity is None or travel_time[idx] < travel_time[optimal_entity_index]:
                optimal_entity = entity
                optimal_entity_index = idx
                optimal_distance = distance

        if optimal_entity is None:
            raise ValueError(f"No suitable entity could be found for route {route}.")
        if optimal_distance is float("inf"):
            raise ValueError("No route was found.")

        return optimal_entity[0], optimal_distance

    def __assign_bus(self, route_parcel):
        """Finds bus that is most suitable for handling the route"""
        bus_speed = 10

        buses = self.get_busses_passing_node(route_parcel['path'][0], route_parcel['path'][-1])
        optimal_time = float("inf")

        optimal_bus = None
        optimal_bus_index = None

        travel_time = [None] * len(buses)

        # TODO implement this
        # find busses that pass the starting node -> check
        # then check distance bus position, bus current route till starting node reached
        # return bus with fastest route

        for idx, bus in enumerate(buses):

            route_bus = copy.deepcopy(bus[1]['route'])
            travel_time[idx] = self.compute_bus_route_time(route_parcel['path'][0], route_parcel['path'][-1],
                                                           route_bus, bus_speed)

            if optimal_bus is None or travel_time[idx] < travel_time[optimal_bus_index]:
                optimal_bus = bus
                optimal_bus_index = idx
                optimal_time = travel_time[idx]

        # TODO throw exceptions here --> not really an error if none available --> return none, handle this later & log
        # if optimal_entity is None:
        #     raise ValueError(f"No suitable entity could be found for route {route}.")
        # if optimal_distance is float("inf"):
        #     raise ValueError("No route was found.")

        return optimal_bus, optimal_time

    def compute_bus_route_time(self, start, end, bus_route, speed):
        """Computes and returns driving time of bus between two nodes given its route.
        Also considers waiting time at stops."""

        # TODO deep copy necessary?
        time = 0

        started = False
        ended = False

        # 'route': [{'node': 'n00', 'time': 10}, {'node': 'n01', 'time': 3},
        #           {'node': 'n02', 'time': 8}, {'node': 'n03', 'time': 6}],

        while not ended:
            waiting_time = bus_route[0]['time']
            current_node = bus_route[0]['node']
            next_node = bus_route[1]['node']

            if not started:
                if current_node == start:
                    started = True

            if started:

                if next_node == end:
                    ended = True

                distance = self.dist[current_node][next_node]

                time = time + (distance / speed)  # TODO assumption of shortest path between nodes holds?
                time = time + waiting_time

            bus_route.append(bus_route.pop(0))

        return time

    def get_busses_passing_node(self, node_start, node_end):
        """ returns list with tuples (id, bus) that pass the first and the final node of the delivery route on their route """
        # TODO bus needs to pass node 0 and node -1 of route
        # TODO check bus capacity...

        passing = []

        # iterate over busses and get their route nodes
        # busses_nodes = map(lambda bus: bus['route'].)
        for (idx, bus) in self.busses.items():
            bus_route = bus['route']
            route_nodes = list(map(lambda stop: stop['node'], bus_route))
            print(route_nodes)
            if node_start in route_nodes and node_end in route_nodes:
                passing.append((idx, bus))
        # check if both nodes are included
        return passing

    def test_init(self):
        """ inits several hubs, drones, vehicles and parcels to allow for some basic testing until
        data exchange with to control-system is ready (MQTT or AzureEG (?))"""
        self.hubs['h00'] = {'id': 'h00', 'position': 'n05'}
        self.hubs['h01'] = {'id': 'h01', 'position': 'n07'}
        self.hubs['h02'] = {'id': 'h02', 'position': 'n11'}

        self.drones['d00'] = {'id': 'd00', 'position': {'x': -50, 'y': 60, 'z': 0}, 'state': DroneState.IDLE}
        self.drones['d01'] = {'id': 'd01', 'position': {'x': -60, 'y': -60, 'z': 0}, 'state': DroneState.IDLE}
        self.drones['d02'] = {'id': 'd02', 'position': {'x': 60, 'y': 0, 'z': 0}, 'state': DroneState.IDLE}

        self.cars['v00'] = {'id': 'v00', 'position': {'x': 50, 'y': -50, 'z': 0}, 'state': VehicleState.IDLE}

        self.busses['v01'] = {'id': 'v00', 'position': {'x': 50, 'y': 50, 'z': 0},
                              # 'route': [{'node': 'n02', 'time': 8}, {'node': 'n03', 'time': 6},
                              #           {'node': 'n01', 'time': 3}, {'node': 'n00', 'time': 10}],
                              'route': [{'node': 'n00', 'time': 8}, {'node': 'n01', 'time': 6},
                                        {'node': 'n02', 'time': 3}, {'node': 'n09', 'time': 2},
                                        {'node': 'n03', 'time': 10}],
                              'state': VehicleState.MOVING}

        self.parcels['p00'] = {'id': 'p00', 'carrier': {'type': 'hub', 'id': 'h00'},
                               'destination': {'type': 'hub', 'id': 'h01'}}

    def test(self):
        # TODO reset entities to fixed values
        self.test_init()

        transactions = {
            't00': {
                'id': 't00',
                'from': {'type': 'hub', 'id': 'h00'},
                'to': {'type': 'drone', 'id': 'd00'},
                'parcel': 'p00'
            },
            't01': {
                'id': 't01',
                'from': {'type': 'drone', 'id': 'd00'},
                'to': {'type': 'car', 'id': 'v00'},
                'parcel': 'p00'
            },
            't02': {
                'id': 't02',
                'from': {'type': 'car', 'id': 'v00'},
                'to': {'type': 'drone', 'id': 'd01'},
                'parcel': 'p00'
            },
            't03': {
                'id': 't03',
                'from': {'type': 'drone', 'id': 'd01'},
                'to': {'type': 'hub', 'id': 'h01'},
                'parcel': 'p00'
            }
        }

        missions = {
            'm00': {
                'id': 'm00',
                'tasks': [
                    {'type': 'give', 'transaction': copy.deepcopy(transactions['t00'])}
                ]
            },
            'm01': {
                'id': 'm01',
                'tasks': [
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -60, 'y': 60, 'z': 0},
                     'minimumDuration': 10},
                    {'type': 'pickup', 'state': 'TaskState.notStarted',
                     'transaction': copy.deepcopy(transactions['t00'])},
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -60, 'y': 50, 'z': 0},
                     'minimumDuration': 10},
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -50, 'y': 50, 'z': 0},
                     'minimumDuration': 10},
                    {'type': 'dropoff', 'state': 'TaskState.notStarted',
                     'transaction': copy.deepcopy(transactions['t01'])},
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -50, 'y': 60, 'z': 0},
                     'minimumDuration': 10}
                ]
            },
            'm02': {
                'id': 'm02',
                'tasks': [
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -50, 'y': -50, 'z': 0},
                     'minimumDuration': 10},
                    {'type': 'pickup', 'state': 'TaskState.notStarted',
                     'transaction': copy.deepcopy(transactions['t02'])},
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -60, 'y': -60, 'z': 0},
                     'minimumDuration': 10},
                    {'type': 'dropoff', 'state': 'TaskState.notStarted',
                     'transaction': copy.deepcopy(transactions['t03'])}
                ]
            },
            'm03': {
                'id': 'm03',
                'tasks': [
                    {'type': 'pickup', 'state': 'TaskState.notStarted',
                     'transaction': copy.deepcopy(transactions['t01'])},
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -50, 'y': -50, 'z': 0},
                     'minimumDuration': 10},
                    {'type': 'dropoff', 'state': 'TaskState.notStarted',
                     'transaction': copy.deepcopy(transactions['t02'])}
                ]
            },
            'm04': {
                'id': 'm04',
                'tasks': [
                    {'type': 'take', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(transactions['t03'])}
                ]
            }
        }

        # TODO convert mission to json --> probably in publish / publish_mission method
        self.publish('mission', missions['m00'])
        self.publish('mission', missions['m01'])
        self.publish('mission', missions['m02'])
        self.publish('mission', missions['m03'])
        self.publish('mission', missions['m04'])

    #     this.publishTo('hub/h00', 'mission', missions.m00);
    #     this.publishTo('drone/d00', 'mission', missions.m01);
    #     this.publishTo('drone/d01', 'mission', missions.m02);
    #     this.publishTo('car/v00', 'mission', missions.m03);
    #     this.publishTo('hub/h01', 'mission', missions.m04);

    # TODO first transcribe test method from control-system
    def create_and_start_mission(self, parcel, drone1, car, drone2, route):
        # TODO check if parameter is none, send FAILED / NOT POSSIBLE message

        # TODO create transactions

        # TODO create missions

        # TODO publish missions
        pass

    def create_transaction(self, parcel, start, dest):
        pass

    # TODO get data from simulators / some API ???
    def get_idle_drones(self):
        """ returns list with tuples (id, drone) of all idle drones as known by opt_engine """
        idle = [(idx, drone) for (idx, drone) in self.drones.items() if drone['state'] == DroneState.IDLE]
        return idle

    def get_idle_cars(self):
        """ returns list with tuples (id, car) of all idle cars as known by opt_engine """
        idle = [(idx, car) for (idx, car) in self.cars.items() if car['state'] == VehicleState.IDLE]
        return idle



    # Delete since not used???
    def get_idle_vehicles(self, node):
        return self.get_idle_cars(), self.get_busses_passing_node(node)

    # TODO encapsulate here? -> avoid duplication

    def get_hub_id_by_location(self, location):
        """returns nodeID for a location {x,y,z}, converts dict to tuple first to match mapping"""
        return self.mapping[tuple(y for (x, y) in location.items())]
