import time
from json.decoder import JSONDecodeError
from typing import List
import json
import logging
import copy

import networkx as nx
from optimization_engine.helpers import load_topology, load_mapping, backtrack_shortest_path, generate_transaction_id
from optimization_engine.datastructures import Hub, Drone, Car, Bus, Parcel, Routes, DroneState, VehicleState, \
    TaskState, Route, Position
from mqtt_client import MQTTClient


class OptimizationEngine(MQTTClient):
    """The optimization engine finds delivery routes for new parcels added to the system
    and sends mission with delivery instructions to suitable entities."""

    def __init__(self):
        MQTTClient.__init__(self)

        self.logging_name = "opt_engine"
        self.FLAG_SCRIPTED = True

        self.g_topo = load_topology('assets/testrun/testrun_topology.json')
        self.mapping = load_mapping('assets/testrun/testrun_topology.json')  # hub_id <-> node_id
        self.pred, self.dist = nx.floyd_warshall_predecessor_and_distance(self.g_topo)

        self.hubs = {}
        self.drones = {}
        self.cars = {}
        self.buses = {}
        self.parcels = {}
        self.orders = {}
        # addresses / customers

        self.add_message_callbacks()

        # parameters for the test_missions send in response to mqtt-topic: /test/[1-3]
        self.test_mission_positions = [
            Position(51.25673, 9.54357, 0),
            Position(51.25680, 9.54393, 0),
            Position(51.25703, 9.54386, 0),
            Position(51.25696, 9.54351, 0),
            Position(51.25673, 9.54357, 0),
            Position(51.25661523618747, 9.543280467304413, 0),
            # Position (51.25699626809572, 9.54323274214318) # Punkt I
        ]
        self.test_mission_parcel = 'p01'
        self.test_mission_drone = 'd01'
        self.test_mission_hub1 = 'h01'
        self.test_mission_hub2 = 'h02'

        # parameters for scripted mission for the MeH-testrun (June2022)
        # coordinates for move tasks are set in the json file with the corresponding mission
        self.testrun_hub_id = 'aef6d0fd-d150-4435-9c73-3b3339b77582'
        self.testrun_drone_id = '52715405-c8a0-4f53-8fb5-ffd54696200c'
        self.testrun_car_id = '3406a877-6f20-4d27-bac5-08b62a44326a'
        self.testrun_parcel_id = 'a64bcadb-6967-4407-ba06-8abf2182a1d0'

        # TODO revert to 1, 0 solely for faster testing
        self.expected_number_hubs = 0
        self.expected_number_cars = 0
        self.expected_number_drones = 0


    def on_message_placed(self, client, userdata, msg):
        """handles placed messages from parcels and orders"""
        [_, _, entity, id_, *args] = split_topic(msg.topic)

        if entity == 'parcel':
            try:
                state = json.loads(msg.payload)
                parcel = Parcel(id=state['id'], carrier=state['carrier'],
                                destination=state['destination'])
            except JSONDecodeError as e:
                logging.error(f"[{self.logging_name}] - Error: {e}")
                if not self.FLAG_SCRIPTED: return

            # If flag set: send scripted Mission Instructions:
            if self.FLAG_SCRIPTED:
                logging.warn(f"[{self.logging_name}] - FLAG_SCRIPTED is set: preset Mission instructions are used.")
                if self.check_number_registered_entities(self.expected_number_drones, self.expected_number_cars,
                                                         self.expected_number_hubs):
                    self.send_scripted_mission(parcel)
                else:
                    logging.warn(f"[{self.logging_name}] - CHECK FAILED: wrong number of entities registered.")
                return

            try:
                self.create_delivery_route(parcel)
            except ValueError as e:
                self.publish('error', f"Could not deliver parcel: {msg.payload}.")
                logging.error(f"[{self.logging_name}] - Error: {e}")
            except Exception as e:
                self.publish('error', f"Internal Error.")
                logging.error(f"[{self.logging_name}] - Error: {e}")

        elif entity == 'order':
            logging.warn(
                f"[{self.logging_name}] - Should Create Delivery Route for Order: {entity}/{id_} - {msg.payload} -  "
                f"Not yet Implemented")
        else:
            logging.warn(f"[{self.logging_name}] - Could not match PLACED-message: {entity}/{id_} - {msg.payload}")
        pass

    def send_scripted_mission(self, parcel):
        # TODO remove and find correct test mission
        logging.warn(f"Scripted mission called for parcel {parcel}")

        # TODO load json missions
        f = open('assets/testrun/mission_hub.json')
        mission_hub = json.load(f)
        f = open('assets/testrun/mission_drone.json')
        mission_drone = json.load(f)
        f = open('assets/testrun/mission_car.json')
        mission_car = json.load(f)

        print(f"Type: {type(mission_car)}")

        # TODO first: send out to given IDs
        # TODO after: send out to the three registered entities ;)

        self.publish("mission", mission_hub, f"hub/{self.testrun_hub_id}")
        self.publish("mission", mission_drone, f"drone/{self.testrun_drone_id}")
        self.publish("mission", mission_car, f"car/{self.testrun_car_id}")

    def check_number_registered_entities(self, num_drones, num_cars, num_hubs):
        """Used for MeH-testrun scripted mission,
        checks number of registered entities against the functions input parameters
        """
        print(f"H: {self.hubs}")
        print(f"D: {self.drones}")
        print(f"C: {self.cars}")
        return len(self.hubs) == num_hubs and len(self.drones) == num_drones and len(self.cars) == num_cars

    def mirror_test_mission(self, client, userdata, msg):
        """ Triggered by topic 'test/1'.
        Reads a mission from the message payload and
        simply mirrors it tp the the drone specified in the class variable self.test_mission_drone"""
        try:
            mission = json.loads(msg.payload)
            topic = 'mission'
            sender = f"drone/{self.test_mission_drone}"
        except:
            topic = 'error'
            sender = None
            mission = "Invalid mission."

        self.publish(topic, mission, sender)

    def mirror_test_message_move(self, client, userdata, msg):
        """ Triggered by topic 'test/2'. """
        tasks = [{'type': 'move', 'state': 'TaskState.notStarted',
                  'destination': {'lat': pos.lat, 'long': pos.long, 'alt': pos.alt}, 'minimumDuration': 10} for pos in
                 self.test_mission_positions]

        m02 = {
            'id': 'm02',
            'tasks': [
                *tasks
            ]
        }

        self.publish("mission", m02, f"drone/{self.test_mission_drone}")

    def mirror_test_message_all_tasks(self, client, userdata, msg):
        """ Triggered by topic 'test/3'. """
        parcel_dummy = Parcel(self.test_mission_parcel, self.test_mission_hub1, self.test_mission_hub2)

        pickup = create_transaction(parcel_dummy, 'hub', self.test_mission_hub1, 'drone',
                                    self.test_mission_drone)
        dropoff = create_transaction(parcel_dummy, 'drone', self.test_mission_drone, 'hub',
                                     self.test_mission_hub2)

        tasks = [{'type': 'move', 'state': 'TaskState.notStarted',
                  'destination': {'lat': pos.lat, 'long': pos.long, 'alt': pos.alt}, 'minimumDuration': 10} for pos in
                 self.test_mission_positions]

        m03 = {
            'id': 'm03',
            'tasks': [
                {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(pickup)},
                *tasks,
                {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(dropoff)},
            ]
        }

        self.publish("mission", m03, f"drone/{self.test_mission_drone}")


    def create_delivery_route(self, parcel):
        """finds route for given parcel, assigns entities to handle the sub-routes and sends them their missions"""

        logging.debug(f"< [{self.logging_name}] - Create_delivery_route: Assigned entities to sub-routes  -> starting "
                      f"missions...")
        route = self.find_route(parcel)
        drone1 = self._assign_drone(route.air1)
        vehicle, v_type = self._assign_vehicle(route.road)  # v_type is 'car' or 'bus'
        drone2 = self._assign_drone(route.air2)

        if drone1 is None or vehicle is None or drone2 is None:
            # send error MQTT message
            self.publish("error", f"Could not find route for parcel: {parcel}: {drone1} - "
                                  f"{vehicle} - {drone2}")

            logging.error(f"< [{self.logging_name}] - Could not find route for parcel: {parcel}: {drone1} - {vehicle} -"
                          f" {drone2}")
            self.reject_parcel(parcel)

        else:
            self.create_and_start_mission(parcel, drone1, vehicle, v_type, drone2, route)

            logging.info(f"< [{self.logging_name}] - Started delivery mission for parcel: {parcel}")

    def reject_parcel(self, parcel):
        """Called when no delivery route for a parcel can be found -> doesn't exist"""
        # TODO
        pass

    def find_route(self, parcel):
        """
            Uses Floyd Warshall algorithm from networkX to find a route for the given parcel
            A route consists of 3 sub-routes:
                hub -> junction 1 (air), junction 1 -> junction 2 (road), junction 2 -> hub (air)
        """

        # map hubs to their node location
        try:
            node_source = self.hubs[parcel.carrier['id']].position
        except KeyError as e:
            logging.error(f"Could not find source hub {parcel.carrier['id']}")
            raise ValueError("Could not find source hub: " + str(e))
        try:
            node_destination = self.hubs[parcel.destination['id']].position
        except KeyError as e:
            logging.error(f"Could not find destination hub {parcel.destination['id']}")
            raise ValueError("Could not find destination hub: " + str(e))

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
            logging.error(f"< [{self.logging_name}] - No first route exists: " + str(e))
            self.publish("error", f"No first route exists: " + str(e))
            raise ValueError("No first route exists: " + str(e))
        try:
            route2 = Route(distance=self.dist[junction_source][junction_destination],
                           path=backtrack_shortest_path(self.pred, junction_source, junction_destination,
                                                        self.dist[junction_source][junction_destination]))
        except ValueError as e:
            logging.error(f"< [{self.logging_name}] - No second route 2 exists: " + str(e))
            self.publish("error", f"No second route exists: " + str(e))
            raise ValueError("No second route 2 exists: " + str(e))
        try:
            route3 = Route(distance=self.dist[junction_destination][node_destination],
                           path=backtrack_shortest_path(self.pred, junction_destination, node_destination,
                                                        self.dist[junction_destination][node_destination]))
        except ValueError as e:
            logging.error(f"< [{self.logging_name}] - No third route exists: " + str(e))
            self.publish("error", f"No third route exists: " + str(e))
            raise ValueError("No third route exists: " + str(e))

        logging.info(f"< [{self.logging_name}] - New route for parcel {parcel.id}: {[route1, route2, route3]}")

        route = Routes(air1=route1, road=route2, air2=route3)
        return route

    def _assign_drone(self, route):
        """
            returns id of idle drone for a sub-route. picks closest one to start of route.
        """
        idle_drones = self.get_idle_drones()

        optimal_drone_id = None

        try:
            _, optimal_drone_id, drone_time = self._assign_entity(route, idle_drones)
            logging.info(f"< [{self.logging_name}] - Assigned Drone to route: {route} -> Drone/{optimal_drone_id}")

        except ValueError as e:
            logging.error("Failed to assign drone: " + str(e))

        return optimal_drone_id

    def _assign_vehicle(self, route):
        """
            Finds best car and bus for a given route.
            Out of these two returns id of the best suited one and its type ('car' or 'bus').
        """
        idle_cars = self.get_idle_cars()
        vehicle_type = "car"

        try:
            found_car, optimal_vehicle, vehicle_time = self._assign_entity(route, idle_cars)
        except ValueError as e:
            vehicle_time = float('inf')
            logging.warn(f"[{self.logging_name}] - Failed to assign car: " + str(e))

        found_bus, optimal_bus, bus_time = self._assign_bus(route)

        if found_car and found_bus:
            if vehicle_time >= bus_time:
                optimal_vehicle, vehicle_type = optimal_bus, 'bus'
        elif found_car ^ found_bus:  # XOR
            if found_bus:
                optimal_vehicle, vehicle_type = optimal_bus, 'bus'
        else:
            # nothing found --> send error message
            logging.error(f"[{self.logging_name}] - Failed to find vehicle for route: {route}: ")
            self.publish("error", f"Could not find available ground vehicle for route: {route}: ")

        logging.info(
            f"[{self.logging_name}] - Assigned Ground vehicle to route: {route} -> {vehicle_type}/{optimal_vehicle}")

        return optimal_vehicle, vehicle_type

    def _assign_entity(self, route, entities):
        """Finds closest entity (drone or car) to the start node of a route and returns its id.
        If no suitable entity was found the return value is None."""

        optimal_entity = None
        optimal_entity_index = 0
        optimal_time = float("inf")
        found_entity = True

        node = route.path[0]  # get first element
        travel_time = [None] * len(entities)

        for (idx, entity) in enumerate(entities):
            entity_position = self.get_node_id_by_location(entity[1].position)
            distance = self.dist[entity_position][node]

            travel_time[idx] = (distance + route.distance) / entity[1].speed

            if optimal_entity is None or travel_time[idx] < travel_time[optimal_entity_index]:
                optimal_entity = entity
                optimal_entity_index = idx
                optimal_time = travel_time[idx]

        if optimal_entity is None:
            found_entity = False
            logging.warn(f"No suitable entity could be found for route {route}.")
        if optimal_time is float("inf"):
            found_entity = False
            logging.error("No route was found.")

        optimal_id = optimal_entity[0] if optimal_entity is not None else None

        return found_entity, optimal_id, optimal_time

    def _assign_bus(self, route):
        """Finds bus that is most suitable for handling the route"""
        bus_speed = 10

        buses = self.get_busses_passing_node(route.path[0], route.path[-1])

        optimal_bus = None
        optimal_bus_index = None
        optimal_time = float("inf")
        found_bus = True

        travel_time = [None] * len(buses)

        for idx, bus in enumerate(buses):

            route_bus = copy.deepcopy(bus[1].route)
            travel_time[idx] = self.compute_bus_route_time(route.path[0], route.path[-1],
                                                           route_bus, bus_speed)

            if optimal_bus is None or travel_time[idx] < travel_time[optimal_bus_index]:
                optimal_bus = bus
                optimal_bus_index = idx
                optimal_time = travel_time[idx]

        if optimal_bus is None:
            found_bus = False
            logging.warn(f"No suitable bus could be found for route {route}.")
        if optimal_time is float("inf"):
            found_bus = False
            logging.warn("No bus - route was found.")

        optimal_id = optimal_bus[0] if optimal_bus is not None else None

        return found_bus, optimal_id, optimal_time

    def compute_bus_route_time(self, start, end, bus_route, speed):
        """Computes and returns driving time of bus between two nodes given its route.
        Also considers waiting time at stops."""

        duration = 0

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

                duration = duration + (distance / speed)  # TODO assumption: not multiple edges between two nodes
                #         => shortest path = bus_route
                duration = duration + waiting_time

            bus_route.append(bus_route.pop(0))

        return duration

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

    def create_and_start_mission(self, parcel, drone1_id, vehicle_id, vehicle_type, drone2_id, route):
        """
            Takes parcel, the three assigned entities and the routes as inputs.
            Then writes task and mission instructions for each entity as a dict for conversion to json.
            Also publishes these missions to their respective entity.
        """

        t00 = create_transaction(parcel, parcel.carrier['type'], parcel.carrier['id'], 'drone', drone1_id)
        t01 = create_transaction(parcel, 'drone', drone1_id, vehicle_type, vehicle_id)
        t02 = create_transaction(parcel, vehicle_type, vehicle_id, 'drone', drone2_id)
        t03 = create_transaction(parcel, 'drone', drone2_id, parcel.destination['type'],
                                 parcel.destination['id'])

        logging.debug(f"< [{self.logging_name}] - Create_start_mission: Created all transactions")

        m00 = {
            'id': 'm00',
            'tasks': [
                {'type': 'give', 'transaction': copy.deepcopy(t00)}
            ]
        }

        drone_pos = self.get_node_id_by_location(self.drones[drone1_id].position)
        tasks_prior_d1 = []

        # handle multiple nodes on prior route before pickup
        if drone_pos is not route.air1.path[0]:
            path = backtrack_shortest_path(self.pred, drone_pos, route.air1.path[0],
                                           self.dist[drone_pos][route.air1.path[0]])
            tasks_prior_d1 = [{'type': 'move', 'state': 'TaskState.notStarted',
                               'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in
                              path]

        # handle multiple nodes on main route
        tasks_main_d1 = [{'type': 'move', 'state': 'TaskState.notStarted',
                          'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in
                         route.air1.path]

        m01 = {
            'id': 'm01',
            'tasks': [
                *tasks_prior_d1,
                {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t00)},
                *tasks_main_d1,
                {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t01)},
                # {'type': 'move', 'state': 'TaskState.notStarted', 'destination': drone_pos, 'minimumDuration': 10}
            ]
        }

        drone_pos = self.get_node_id_by_location(self.drones[drone2_id].position)
        tasks_prior_d2 = []

        # handle multiple nodes on prior route before pickup
        if drone_pos is not route.air1.path[0]:
            path = backtrack_shortest_path(self.pred, drone_pos, route.air2.path[0],
                                           self.dist[drone_pos][route.air2.path[0]])
            tasks_prior_d2 = [{'type': 'move', 'state': 'TaskState.notStarted',
                               'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in
                              path]

        tasks_route_d2 = [{'type': 'move', 'state': 'TaskState.notStarted',
                           'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in
                          route.air2.path]
        m02 = {
            'id': 'm02',
            'tasks': [
                *tasks_prior_d2,
                {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t02)},
                *tasks_route_d2,
                {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t03)},
            ]
        }

        tasks_route_v = [{'type': 'move', 'state': 'TaskState.notStarted',
                          'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in
                         route.road.path]

        m03 = {}
        if vehicle_type == 'car':
            car_pos = self.get_node_id_by_location(self.cars[vehicle_id].position)
            tasks_prior_car = []

            # handle multiple nodes on prior route before pickup
            if car_pos is not route.road.path[0]:
                path = backtrack_shortest_path(self.pred, car_pos, route.road.path[0],
                                               self.dist[car_pos][route.road.path[0]])

                tasks_prior_car = [{'type': 'move', 'state': 'TaskState.notStarted',
                                    'destination': self.g_topo.nodes[n]['position'], 'minimumDuration': 10} for n in
                                   path]

            m03 = {
                'id': 'm03',
                'tasks': [
                    *tasks_prior_car,
                    {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t01)},
                    *tasks_route_v,
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

        logging.info(f"[{self.logging_name}] - Publish missions to assigned entities ")
        self.publish("mission", m00, f"hub/{self.hubs[parcel.carrier['id']].id}")
        self.publish("mission", m01, f"drone/{drone1_id}")
        self.publish("mission", m02, f"drone/{drone2_id}")
        self.publish("mission", m03, f"{vehicle_type}/{vehicle_id}")
        self.publish("mission", m04, f"hub/{self.hubs[parcel.destination['id']].id}")

    # Find idle / suitable entities for a new mission
    def get_idle_drones(self):
        """ returns list with tuples (id, drone) of all idle drones as known by opt_engine """
        idle = [(idx, drone) for (idx, drone) in self.drones.items() if drone.state == DroneState.IDLE]
        return idle

    def get_idle_cars(self):
        """ returns list with tuples (id, car) of all idle cars as known by opt_engine """
        idle = [(idx, car) for (idx, car) in self.cars.items() if car.state == 0 and len(car.parcels) < car.capacity]
        return idle

    def get_node_id_by_location(self, location):
        """returns nodeID for a location {x,y,z}, converts dict to tuple first to match mapping"""
        # print(f"self.mapping: {self.mapping}")
        # print(f"location.items(): {location.items()}")
        return self.mapping[tuple(nodeID for (location, nodeID) in location.items())]

    # Methods for handling incoming MQTT messages
    def add_message_callbacks(self):
        """registers functions for handling different message topics to the MQTT client as callbacks"""

        # entities: state updates
        self.subscribe_and_add_callback("+/+/state/#", self.on_message_state)

        self.subscribe_and_add_callback("+/+/error/capacity/exceeded/#",
                                        self.on_message_cap_exceeded)

        self.subscribe_and_add_callback("+/+/placed/#", self.on_message_placed)

        self.subscribe_and_add_callback("+/+/delivered/#",
                                        self.on_message_parcel_delivered)

        # test missions
        self.subscribe_and_add_callback("test/1", self.mirror_test_mission)
        self.subscribe_and_add_callback("test/2", self.mirror_test_message_move)
        self.subscribe_and_add_callback("test/3", self.mirror_test_message_all_tasks)

        self.subscribe_and_add_callback("opt/scripted/#", self.on_message_scripted)

    def subscribe_and_add_callback(self, topic, callback_function):
        self.subscribe(f"{self.project}/{self.version}/{topic}")
        self.client.message_callback_add(f"{self.project}/{self.version}/{topic}", callback_function)

    def on_message_state(self, client, userdata, msg):
        [_, _, entity, id_, *args] = split_topic(msg.topic)
        self.update_state(entity, id_, msg.payload)
        logging.debug(f"[{self.logging_name}] - Updated state of {entity}/{id_}: {msg.payload}")

    def on_message_scripted(self, client, userdata, msg):
        """ Sets the self.FLAG_SCRIPTED value or returns its current value via MQTT. """
        [_, _, entity, id_, *args] = split_topic(msg.topic)
        if args[0] not in ['enable', 'disable', 'status']:
            logging.warn(f"[{self.logging_name}] - Received invalid scripted flag instructions: {msg.topic}")
            # self.publish('error', f"Invalid instructions: {msg.topic} ")
        else:
            if args[0] == 'status':
                self.publish('scripted/current', f"{self.FLAG_SCRIPTED}")
            elif args[0] == 'enable':
                self.FLAG_SCRIPTED = True
                self.publish('scripted/current', f"{self.FLAG_SCRIPTED}")
            elif args[0] == 'disable':
                self.FLAG_SCRIPTED = False
                self.publish('scripted/current', f"{self.FLAG_SCRIPTED}")
            else:
                logging.error(f"[{self.logging_name}] - Invalid scripted instruction processed: {msg.topic}")

    def on_message_parcel_delivered(self, client, userdata, msg):
        # TODO handle parcel delivered
        [_, _, entity, id_, *args] = split_topic(msg.topic)
        pass

    def on_message_cap_exceeded(self, client, userdata, msg):
        """handles error messages from entity that could not accept a parcel because of capacity already full"""
        [_, _, entity, id_, *args] = split_topic(msg.topic)
        logging.error(
            f"[{self.logging_name}] - Error received: Capacity of {entity}/{id_} already full. Could not accept {args[3]}/{args[4]} ")

    def update_state(self, entity, id_, state_json):
        """ finds entity in corresponding dictionary and updates the named_tuple describing its state"""
        state = json.loads(state_json)
        if entity == 'hub':
            self.update_hub(id_, state)
        elif entity == 'drone':
            self.update_drone(id_, state)
        elif entity == 'car':
            self.update_car(id_, state)
        elif entity == 'bus':
            self.update_bus(id_, state)
        elif entity == 'parcel':
            self.update_parcel(id_, state)
        else:
            logging.warn(
                f"< [{self.logging_name}] - Could not match entity {entity}/{id_}:  {state}")

    def update_hub(self, id_, state):

        hub = Hub(id=state['id'], position=state['position'], transactions=state['transactions'],
                  parcels=state['parcels'])
        self.hubs[id_] = hub

    def update_drone(self, id_, state):

        drone = Drone(id=state['id'], position=state['position'], speed=state['speed'], parcel=state['parcel'],
                      state=state['state'])
        self.drones[id_] = drone

    def update_car(self, id_, state):

        car = Car(id=state['id'], position=state['position'], speed=state['speed'], parcels=state['parcels'],
                  capacity=state['capacity'], state=state['state'])
        self.cars[id_] = car

    def update_bus(self, id_, state):

        bus = Bus(id=state['id'], position=state['position'], capacity=state['capacity'], route=state['route'],
                  nextStop=state['nextStop'], missions=state['missions'], speed=state['speed'],
                  parcels=state["parcels"], activeTasks=state['activeTasks'],
                  arrivalTimeAtStop=state['arrivalTimeAtStop'], state=state['state'])
        self.buses[id_] = bus

    def update_parcel(self, id_, state):

        parcel = Parcel(id=state['id'], carrier=state['carrier'], destination=state['destination'])
        self.parcels[id_] = parcel


# Helper Functions
def create_transaction(parcel, from_type, from_id, to_type, to_id):
    """creates and returns dict modeling a transaction of a given parcel between the given entities from and to,
     identifiable by a uuid"""
    transaction = {
        'id': generate_transaction_id(),
        'from': {'type': from_type, 'id': from_id},
        'to': {'type': to_type, 'id': to_id},
        'parcel': parcel.id
    }
    return transaction


def split_topic(topic: str) -> List[str]:
    """splits received MQTT topic into several string values for further processing"""
    project, version, entity, id_, *args = topic.split('/')
    return [project, version, entity, id_, *args]
