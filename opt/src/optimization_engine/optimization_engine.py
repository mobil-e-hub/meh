import time
from typing import List
from uuid import uuid4
import json
import logging
import copy

import networkx as nx
from optimization_engine.helpers import load_topology, load_mapping, backtrack_shortest_path
from optimization_engine.datastructures import Hub, Drone, Car, Bus, Parcel, Routes, DroneState, VehicleState, \
    TaskState, Route
from mqtt_client import MQTTClient

# TODO handle stop and pause from vueApp also here --> do not send stuff out!


class OptimizationEngine(MQTTClient):
    """TODO add docstring"""

    def __init__(self):
        MQTTClient.__init__(self)

        self.id = str(uuid4())[0:8]  # TODO necessary for opt_engine? there should be only one --> self.root
        self.project = 'mobil-e-hub'
        self.version = 'vX'

        self.g_topo = load_topology('assets/topology.json')
        self.mapping = load_mapping('assets/topology.json')  # hub_id <-> node_id
        self.pred, self.dist = nx.floyd_warshall_predecessor_and_distance(self.g_topo)

        self.hubs = {}
        self.drones = {}
        self.cars = {}
        self.buses = {}
        self.parcels = {}
        self.orders = {}
        # addresses / customers

        self.add_message_callbacks()

    def create_delivery_route(self, parcel):
        """finds route for given parcel, assigns entities to handle the sub-routes and sends them their missions"""
        try:
            route = self.find_route(parcel)
            drone1 = self._assign_drone(route.air1)
            vehicle, v_type = self._assign_vehicle(route.road)  # v_type is 'car' or 'bus'
            drone2 = self._assign_drone(route.air2)

            logging.debug(
                f"< [{self.client_name}] - Create_delivery_route: Assigned entities to sub-routes  -> starting missions...")
            # TODO if 1 return is None send a failed mission to visualization instead of publishing missions...
            self.create_and_start_mission(parcel, drone1, vehicle, v_type, drone2, route)

            logging.info(f"< [{self.client_name}] - Started delivery mission for parcel: {parcel}")
        except ValueError as e:
            logging.error(f"< [{self.client_name}] - Could not find route for parcel: {parcel}")
            self.reject_parcel(parcel)

        # self.publish("bar/test", "tested/bar")

    def reject_parcel(self, parcel):
        """Called when no delivery route for a parcel can be found -> doesn't exist"""
        # TODO what to do here?? --> send MQTT message
        #   - can this even happen? parcels sanity checked before???
        pass

    def find_route(self, parcel):
        """
            Uses Floyd Warshall algorithm from networkX to find a route for the given parcel
            A route consists of 3 sub-routes:
                hub -> junction 1 (air), junction 1 -> junction 2 (road), junction 2 -> hub (air)
        """
        # TODO consider edge types, currently: parcel start end should be air nodes, then air -> road -> air is selected

        # map hubs to their node location
        carrier_id = parcel.carrier['id']
        node_source = self.hubs[carrier_id].position
        node_destination = self.hubs[parcel.destination['id']].position

        # find closest road junction to source & destination hubs  (parking: both drones and cars can access)
        nodes_road = [x for x, y in self.g_topo.nodes(data=True) if y['type'] == 'parking']  # map n => n.id

        source_min_dist_junctions = [self.dist[node_source][x] for x in nodes_road]
        junction_source = nodes_road[source_min_dist_junctions.index(min(source_min_dist_junctions))]

        dest_min_dist_junctions = [self.dist[x][node_destination] for x in nodes_road]
        junction_destination = nodes_road[dest_min_dist_junctions.index(min(dest_min_dist_junctions))]

        try:
            route1 = Route(distance=self.dist[node_source][junction_source],
                           path=backtrack_shortest_path(self.pred, node_source, junction_source,
                                                        self.dist[node_source][junction_source]))
        except ValueError as e:
            logging.error(f"< [{self.client_name}] - No first route exists: " + str(e))
            raise ValueError("No first route exists: " + str(e))
        try:
            route2 = Route(distance=self.dist[junction_source][junction_destination],
                           path=backtrack_shortest_path(self.pred, junction_source, junction_destination,
                                                        self.dist[junction_source][junction_destination]))
        except ValueError as e:
            logging.error(f"< [{self.client_name}] - No second route 2 exists: " + str(e))
            raise ValueError("No second route 2 exists: " + str(e))
        try:
            route3 = Route(distance=self.dist[junction_destination][node_destination],
                           path=backtrack_shortest_path(self.pred, junction_destination, node_destination,
                                                        self.dist[junction_destination][node_destination]))
        except ValueError as e:
            logging.error(f"< [{self.client_name}] - No third route exists: " + str(e))
            raise ValueError("No third route exists: " + str(e))

        logging.info(f"< [{self.client_name}] - New route for parcel {parcel.id}: {[route1, route2, route3]}")

        route = Routes(air1=route1, road=route2, air2=route3)
        return route

    def _assign_drone(self, route):
        """
            returns id of idle drone for a sub-route. picks closest one to start of route.
        """
        # TODO where save drone speed --> constant at first???
        drone_speed = 2
        idle_drones = self.get_idle_drones()

        try:
            optimal_drone_id, drone_time = self._assign_entity(route, idle_drones, drone_speed)
        except ValueError as e:
            logging.error("Failed to assign drone: " + str(e))

        logging.info(f"< [{self.client_name}] - Assigned Drone to route: {route} -> Drone/{optimal_drone_id}")
        return optimal_drone_id

    def _assign_vehicle(self, route):
        """
            Finds best car and bus for a given route.
            Out of these two returns id of the best suited one and its type ('car' or 'bus').
        """

        car_speed = 10
        idle_cars = self.get_idle_cars()
        vehicle_type = "car"

        try:
            optimal_vehicle, vehicle_time = self._assign_entity(route, idle_cars, car_speed)
        except ValueError as e:
            vehicle_time = float('inf')
            logging.warn(f"[{self.client_name}] - Failed to assign car: " + str(e))

        optimal_bus, bus_time = self._assign_bus(route)  # TODO debug bus -> handle no bus available

        if vehicle_time > bus_time:  # Bus preferred if equal time # TODO undefined if no car was found (value error)
            optimal_vehicle = optimal_bus
            vehicle_type = "bus"

        logging.info(
            f"[{self.client_name}] - Assigned Ground vehicle to route: {route} -> {vehicle_type}/{optimal_vehicle}")

        return optimal_vehicle, vehicle_type

    def _assign_entity(self, route, entities, speed):
        """Finds closest entity (drone or car) to the start node of a route and returns its id"""

        optimal_entity = None
        optimal_entity_index = 0
        optimal_time = float("inf")

        node = route.path[0]  # get first element
        travel_time = [None] * len(entities)

        for idx, entity in enumerate(entities):
            entity_position = self.get_hub_id_by_location(entity[1].position)
            distance = self.dist[entity_position][node]

            travel_time[idx] = (distance + route.distance) / speed

            if optimal_entity is None or travel_time[idx] < travel_time[optimal_entity_index]:
                optimal_entity = entity
                optimal_entity_index = idx
                optimal_time = travel_time[idx]

        # TODO aren't both the same error? --> really an error? --> handle here or later? e.g. in
        if optimal_entity is None:
            raise ValueError(f"No suitable entity could be found for route {route}.")
        if optimal_time is float("inf"):
            raise ValueError("No route was found.")

        return optimal_entity[0], optimal_time

    def _assign_bus(self, route_parcel):
        """Finds bus that is most suitable for handling the route"""
        bus_speed = 10

        buses = self.get_busses_passing_node(route_parcel.path[0], route_parcel.path[-1])
        optimal_time = float("inf")

        optimal_bus = None
        optimal_bus_index = None

        travel_time = [None] * len(buses)

        for idx, bus in enumerate(buses):

            route_bus = copy.deepcopy(bus[1].route)
            travel_time[idx] = self.compute_bus_route_time(route_parcel.path[0], route_parcel.path[-1],
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

        return optimal_bus[0], optimal_time

    def compute_bus_route_time(self, start, end, bus_route, speed):
        """Computes and returns driving time of bus between two nodes given its route.
        Also considers waiting time at stops."""

        t = 0
        started = False
        ended = False

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
                t = t + (distance / speed)  # TODO assumption: not multiple edges between two nodes
                t = t + waiting_time        #     => shortest path = bus_route

            bus_route.append(bus_route.pop(0))
        return t

    def get_busses_passing_node(self, node_start, node_end):
        """ returns list with tuples (id, bus) that pass the first and the final node of the delivery route on their
        route """
        # TODO check bus capacity...

        passing = []

        for (idx, bus) in self.buses.items():
            bus_route = bus.route
            route_nodes = list(map(lambda stop: stop['node'], bus_route))
            if node_start in route_nodes and node_end in route_nodes:
                passing.append((idx, bus))

        return passing

    # TODO encoding keys as string here: python -> json -> js object: here they should no longer be strings....
    def create_and_start_mission(self, parcel, drone1_id, vehicle_id, vehicle_type, drone2_id, route):
        """
            Takes parcel, the three assigned entities and the routes as inputs.
            Then writes task and mission instructions for each entity as a dict for conversion to json.
            Also publishes these missions to their respective entity.
        """
        # TODO handle None inputs = one subroute is not necessary - (drone2drone transaction / car delivers to address)
        #       --> currently: assumes this is not possible
        #       -->  send FAILED / NOT POSSIBLE message?

        t00 = self.create_transaction(parcel, parcel.carrier['type'], parcel.carrier['id'], 'drone', drone1_id)
        t01 = self.create_transaction(parcel, 'drone', drone1_id, vehicle_type, vehicle_id)
        t02 = self.create_transaction(parcel, vehicle_type, vehicle_id, 'drone', drone2_id)
        t03 = self.create_transaction(parcel, 'drone', drone2_id, parcel.destination['type'],
                                      parcel.destination['id'])

        logging.debug(f"< [{self.client_name}] - Create_start_mission: Created all transactions")

        m00 = {
            'id': 'm00',
            'tasks': [
                {'type': 'give', 'transaction': copy.deepcopy(t00)}
            ]
        }

        # TODO Enums (TaskState) not serializable (to json) -> HotFix: encode as String / better: extra parser
        drone_pos = self.drones[drone1_id].position

        # handle multiple nodes on route
        tasks_route_d1 = [{'type': 'move', 'state': 'TaskState.notStarted',
                 'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in route.air1.path]

        node_hub = self.hubs[parcel.carrier['id']].position  # nodeID
        # TODO currently naive approach -> always send 'move'-task: regardless of entity position
        m01 = {
            'id': 'm01',
            'tasks': [
                {'type': 'move', 'state': 'TaskState.notStarted', 'destination':
                    self.g_topo.nodes[node_hub]['position'], 'minimumDuration': 10},
                {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t00)},
                *tasks_route_d1,
                {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t01)},
                # TODO should drone move back afterwards? --> *tasks_route[::-1] --> deep_copy necessary??
                {'type': 'move', 'state': 'TaskState.notStarted', 'destination': drone_pos, 'minimumDuration': 10}
            ]
        }

        drone_pos = self.drones[drone2_id].position
        node_hub = self.hubs[parcel.destination['id']].position  # nodeID

        tasks_route_d2 = [{'type': 'move', 'state': 'TaskState.notStarted',
                        'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in route.air2.path]
        m02 = {
            'id': 'm02',
            'tasks': [
                {'type': 'move', 'state': 'TaskState.notStarted', 'destination': self.g_topo.nodes[route.air2.path[0]]['position'],
                 'minimumDuration': 10},
                {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t02)},
                # {'type': 'move', 'state': 'TaskState.notStarted',
                #  'destination': self.g_topo.nodes[node_hub]['position'], 'minimumDuration': 10},
                *tasks_route_d2,
                {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t03)},
                # TODO should drone move back afterwards?
                {'type': 'move', 'state': 'TaskState.notStarted', 'destination': drone_pos, 'minimumDuration': 10}
            ]
        }

        tasks_route_v = [{'type': 'move', 'state': 'TaskState.notStarted',
                          'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in
                         route.road.path]

        m03 = {}
        if vehicle_type == 'car':
            car_pos = self.cars[vehicle_id].position
            m03 = {
                'id': 'm03',
                'tasks': [
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': self.g_topo.nodes[route.road.path[0]]['position'],
                     'minimumDuration': 10},
                    {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t01)},
                    # {'type': 'move', 'state': 'TaskState.notStarted', 'destination': self.g_topo.nodes[route.road.path[-1]]['position'],
                    #  'minimumDuration': 10},
                    *tasks_route_v,
                    {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t02)},
                    {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t02)},
                ]
            }

        elif vehicle_type == 'bus':
            # TODO check bus mission structure -> refactor where necessary
            # difference to car: no initial and final move instructions...
            m03 = {
                'id': 'm03',
                'tasks': [
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': route.road.path[0],
                     'minimumDuration': 10},
                    {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t01)},
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': route.road.path[-1],
                     'minimumDuration': 10},
                    {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t02)},
                ]
            }
        else:
            logging.error("Vehicle not Car or Bus.")

        m04 = {
            'id': 'm04',
            'tasks': [
                {'type': 'take', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t03)}
            ]
        }

        logging.info(f"[{self.client_name}] - Publish missions to assigned entities ")
        self.publish_to(f"hub/{self.hubs[parcel.carrier['id']].id}", "mission", m00)
        self.publish_to(f"drone/{drone1_id}", "mission", m01)
        self.publish_to(f"drone/{drone2_id}", "mission", m02)
        self.publish_to(f"{vehicle_type}/{vehicle_id}", "mission", m03)
        self.publish_to(f"hub/{self.hubs[parcel.destination['id']].id}", "mission", m04)

    def create_transaction(self, parcel, from_type, from_id, to_type, to_id):
        """creates and returns dict modeling a transaction of a given parcel between the given entities from and to,
         identifiable by a uuid"""
        transaction = {
            'id': self.generate_transaction_id(),
            'from': {'type': from_type, 'id': from_id},
            'to': {'type': to_type, 'id': to_id},
            'parcel': parcel.id
        }
        return transaction

    # TODO better simple increment?  --> how long? --> 4 chars enough?
    # TODO move to helpers (generalize to generate_uuid(length))
    def generate_transaction_id(self):
        """generates and returns an uuid v4 for usage as transaction identifier"""
        return str(uuid4())[0:4]

    def test_init(self):
        """ inits several hubs, drones, vehicles and parcels to allow for some basic testing until
        data exchange with to control-system is ready (MQTT or AzureEG (?))"""

        # tell other modules to load this init setup as well
        self.test_send_init()

        self.hubs['h00'] = Hub(id='h00', position='n05', transactions={}, parcels={})
        self.hubs['h01'] = Hub(id='h01', position='n07', transactions={}, parcels={})
        self.hubs['h02'] = Hub(id='h02', position='n11', transactions={}, parcels={})

        # TODO also position as named tuple?
        self.drones['d00'] = Drone(id='d00', position={'x': -50, 'y': 60, 'z': 0}, speed=0, parcel=None, state=DroneState.IDLE)
        self.drones['d01'] = Drone(id='d01', position={'x': -60, 'y': -60, 'z': 0}, speed=0, parcel=None, state=DroneState.IDLE)
        self.drones['d02'] = Drone(id='d02', position={'x': 60, 'y': 0, 'z': 0}, speed=0, parcel=None, state=DroneState.IDLE)

        # self.cars['v00'] = Car(id='v00', position={'x': -50, 'y': 50, 'z': 0}, speed=0, parcel=None, state=VehicleState.IDLE)

        self.buses['v01'] = Bus(id='v01', position={'x': 50, 'y': 50, 'z': 0}, capacity=3,
                                # Start in top right corner (50,50,0) node0
                                route=[{'node': 'n03', 'time': 10},
                                    {'node': 'n00', 'time': 18}, {'node': 'n01', 'time': 12},
                                    {'node': 'n02', 'time': 6}, {'node': 'n09', 'time': 12}
                                    ],
                                # Start in top left corner (-50,50,0) node3
                                # route=[
                                #         {'node': 'n00', 'time': 20}, {'node': 'n01', 'time': 12},
                                #        {'node': 'n02', 'time': 6}, {'node': 'n09', 'time': 12},
                                #        {'node': 'n03', 'time': 10}],
                                nextStop=None, missions={}, activeMissions={}, speed=0, parcels={}, activeTasks={},
                                tasksAtStop={}, arrivalTimeAtStop={}, state=VehicleState.MOVING)

        self.parcels['p00'] = Parcel(id='p00', carrier={'type': 'hub', 'id': 'h00'},
                                     destination={'type': 'hub', 'id': 'h01'})


    def test_send_init(self):
        # TODO add bus, once enough per entitiy type --> triggers init for all
        self.publish_to('hub/h00', 'test_init', {})
        self.publish_to('drone/d00', 'test_init', {})
        # self.publish_to('drone/d01', 'test_init', {})
        # self.publish_to('car/v00', 'test_init', {})
        self.publish_to('bus/v01', 'test_init', {})
        # self.publish_to('hub/h01', 'test_init', {})
        self.publish_to('parcel/p00', 'test_init', {})

    # def test(self):
    #     """ temporary function for testing during development process.
    #         --> hard coded missions to check execution by simulated entities"""
    #
    #     self.test_init()
    #
    #     transactions = {
    #         't00': {
    #             'id': 't00',
    #             'from': {'type': 'hub', 'id': 'h00'},
    #             'to': {'type': 'drone', 'id': 'd00'},
    #             'parcel': 'p00'
    #         },
    #         't01': {
    #             'id': 't01',
    #             'from': {'type': 'drone', 'id': 'd00'},
    #             'to': {'type': 'car', 'id': 'v00'},
    #             'parcel': 'p00'
    #         },
    #         't02': {
    #             'id': 't02',
    #             'from': {'type': 'car', 'id': 'v00'},
    #             'to': {'type': 'drone', 'id': 'd01'},
    #             'parcel': 'p00'
    #         },
    #         't03': {
    #             'id': 't03',
    #             'from': {'type': 'drone', 'id': 'd01'},
    #             'to': {'type': 'hub', 'id': 'h01'},
    #             'parcel': 'p00'
    #         }
    #     }
    #
    #     missions = {
    #         'm00': {
    #             'id': 'm00',
    #             'tasks': [
    #                 {'type': 'give', 'transaction': copy.deepcopy(transactions['t00'])}
    #             ]
    #         },
    #         'm01': {
    #             'id': 'm01',
    #             'tasks': [
    #                 {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -60, 'y': 60, 'z': 0},
    #     #                  'minimumDuration': 10},
    #                 {'type': 'pickup', 'state': 'TaskState.notStarted',
    #                  'transaction': copy.deepcopy(transactions['t00'])},
    #                 {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -60, 'y': 50, 'z': 0},
    #                  'minimumDuration': 10},
    #                 {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -50, 'y': 50, 'z': 0},
    #                  'minimumDuration': 10},
    #                 {'type': 'dropoff', 'state': 'TaskState.notStarted',
    #                  'transaction': copy.deepcopy(transactions['t01'])},
    #                 {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -50, 'y': 60, 'z': 0},
    #                  'minimumDuration': 10}
    #             ]
    #         },
    #         'm02': {
    #             'id': 'm02',
    #             'tasks': [
    #                 {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -50, 'y': -50, 'z': 0},
    #                  'minimumDuration': 10},
    #                 {'type': 'pickup', 'state': 'TaskState.notStarted',
    #                  'transaction': copy.deepcopy(transactions['t02'])},
    #                 {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -60, 'y': -60, 'z': 0},
    #                  'minimumDuration': 10},
    #                 {'type': 'dropoff', 'state': 'TaskState.notStarted',
    #                  'transaction': copy.deepcopy(transactions['t03'])}
    #             ]
    #         },
    #         'm03': {
    #             'id': 'm03',
    #             'tasks': [
    #                 {'type': 'pickup', 'state': 'TaskState.notStarted',
    #                  'transaction': copy.deepcopy(transactions['t01'])},
    #                 {'type': 'move', 'state': 'TaskState.notStarted', 'destination': {'x': -50, 'y': -50, 'z': 0},
    #                  'minimumDuration': 10},
    #                 {'type': 'dropoff', 'state': 'TaskState.notStarted',
    #                  'transaction': copy.deepcopy(transactions['t02'])}
    #             ]
    #         },
    #         'm04': {
    #             'id': 'm04',
    #             'tasks': [
    #                 {'type': 'take', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(transactions['t03'])}
    #             ]
    #         }
    #     }
    #
    #     self.publish_to('hub/h00', 'mission', missions['m00'])
    #     self.publish_to('drone/d00', 'mission', missions['m01'])
    #     self.publish_to('drone/d01', 'mission', missions['m02'])
    #     self.publish_to('car/v00', 'mission', missions['m03'])
    #     self.publish_to('hub/h01', 'mission', missions['m04'])

    # Find idle / suitable entities for a new mission
    def get_idle_drones(self):
        """ returns list with tuples (id, drone) of all idle drones as known by opt_engine """
        idle = [(idx, drone) for (idx, drone) in self.drones.items() if drone.state == DroneState.IDLE]
        return idle

    def get_idle_cars(self):
        """ returns list with tuples (id, car) of all idle cars as known by opt_engine """
        idle = [(idx, car) for (idx, car) in self.cars.items() if car.state == VehicleState.IDLE]
        return idle

    def get_hub_id_by_location(self, location):
        """returns nodeID for a location {x,y,z}, converts dict to tuple first to match mapping"""
        return self.mapping[tuple(nodeID for (location, nodeID) in location.items())]

    # Methods for handling incoming MQTT messages
    # TODO manage subscriptions here???
    def add_message_callbacks(self):
        """registers functions for handling different message topics to the MQTT client as callbacks"""
        self.subscribe_and_add_callback(f"{self.project}/{self.version}/+/+/+/test", self.on_message_test)

        # entities: state updates
        self.subscribe_and_add_callback(f"{self.project}/{self.version}/+/+/+/state/#", self.on_message_state)

        # entity: connect updates #difference to state update???
        # self.subscribe_and_add_callback(f"{self.project}/{self.version}/+/+/+/connected/#", self.on_message_state) # Sent from simulators, not the models

        self.subscribe_and_add_callback(f"{self.project}/{self.version}/+/+/+/placed/#", self.on_message_placed)

        self.subscribe_and_add_callback(f"{self.project}/{self.version}/+/+/+/delivered/#",
                                        self.on_message_parcel_delivered)
        # TODO default handler is on_message
        # self.subscribe("meh/#")
        # self.client.message_callback_add('meh/#', self.on_message_split)

    def subscribe_and_add_callback(self, topic, callback_function):
        self.subscribe(topic)
        self.client.message_callback_add(topic, callback_function)

    # TODO remove
    def on_message_test(self, client, userdata, msg):
        self.test_init()
        time.sleep(2)
        # self.test()  # hard coded missions to check if execution works
        self.create_delivery_route(self.parcels['p00'])

    def on_message_state(self, client, userdata, msg):
        # TODO add to the respective dict
        [_, _, _, entity, id_, *args] = self.split_topic(msg.topic)
        self.update_state(entity, id_, json.loads(str(msg.payload.decode("utf-8", "ignore"))))
        logging.debug(f"[{self.client_name}] - Updated state of {entity}/{id_}: {msg.payload}")

    def on_message_parcel_delivered(self, client, userdata, msg):
        # TODO handle parcel delivered
        [_, _, _, entity, id_, *args] = self.split_topic(msg.topic)
        pass

    def on_message_placed(self, client, userdata, msg):
        """handles placed messages from parcels and orders"""
        [_, _, _, entity, id_, *args] = self.split_topic(msg.topic)
        # TODO handle parcel / order placed
        if entity == 'parcel':
            pass
        elif entity == 'order':
            pass
        else:
            logging.warn(f"[{self.client_name}] - Could not match PLACED-message: {entity}/{id_} - {msg.payload}")
        pass

    def split_topic(self, topic: str) -> List[str]:
        """splits received MQTT topic into several string values for further processing"""
        # TODO exception handling --> topic always fixes length? or just do for state messages??
        # TODO better use named tuples here?
        project, version, direction, entity, id_, *args = topic.split('/')
        return [project, version, direction, entity, id_, *args]

    # TODO handle unknown id? --> log?
    def update_state(self, entity, id_, state):
        """ finds entity in corresponding dictionary and updates the named_tuple describing its state"""
        if entity == 'hub':
            new_state = state  # TODO parse json state / string
            self.update_hub(id_, state)
        elif entity == 'drone':
            new_state = state  # TODO parse json state / string
            self.update_drone(id_, state)
        elif entity == 'car':
            new_state = state  # TODO parse json state / string
            self.update_car(id_, state)
        elif entity == 'bus':
            new_state = state  # TODO parse json state / string
            self.update_bus(id_, state)
        elif entity == 'parcel':
            new_state = state  # TODO parse json state / string
            self.update_parcel(id_, state)
        else:
            logging.info(
                f"< [{self.client_name}] - Could not match entity {entity}/{id_}:  {state}")  # TODO change to warn

    def update_hub(self, id_, state):
        # logging.warn(f"!!!!!!!!!! UPDATE HUB: --> id:{id_} --> {state} !!!")
        hub = Hub(id=state['id'], position=state['position'], transactions=state['transactions'],
                  parcels=state['parcels'])
        self.hubs[id_] = hub

    def update_drone(self, id_, state):
        # logging.warn(f"!!!!!!!!!! UPDATE DRONE: --> id:{id_} --> {state} !!!")
        drone = Drone(id=state['id'], position=state['position'], speed=state['speed'], parcel=state['parcel'],
                      state=state['state'])
        self.drones[id_] = drone

    def update_car(self, id_, state):
        # logging.warn(f"!!!!!!!!!! UPDATE CAR: --> id:{id_} --> {state} !!!")
        car = Car(id=state['id'], position=state['position'], speed=state['speed'], parcel=state['parcel'],
                  state=state['state'])
        self.cars[id_] = car

    def update_bus(self, id_, state):
        # logging.warn(f"!!!!!!!!!! UPDATE BUS: --> id:{id_} --> {state} !!!")
        bus = Bus(id=state['id'], position=state['position'], capacity=['capacity'], route=['route'],
                  nextStop=['nextStop'], missions=['missions'], activeMissions=['activeMissions'], speed=['speed'],
                  parcels=state["parcels"], activeTasks=['activeTasks'], tasksAtStop=['tasksAtStop'],
                  arrivalTimeAtStop=['arrivalTimeAtStop'], state=[''])
        self.buses[id_] = bus

    def update_parcel(self, id_, state):
        # logging.warn(f"!!!!!!!!!! UPDATE PARCEL: --> id:{id_} --> {state} !!!")
        parcel = Parcel(id=state['id'], carrier=state['carrier'], destination=state['destination'])
        self.parcels[id_] = parcel
