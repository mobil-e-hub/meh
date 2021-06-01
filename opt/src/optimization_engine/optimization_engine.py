from uuid import uuid4
import json
import logging
import copy

import networkx as nx
from .helpers import load_topology, load_mapping, backtrack_shortest_path
from .datastructures import Hub, Drone, Car, Bus, Parcel, Routes, DroneState, VehicleState, TaskState, Route
# from ..mqtt_client import MQTTClient

from opt.src.mqtt_client import MQTTClient


# TODO: inherits from mqtt Client to enable notifications on new system states
class OptimizationEngine(MQTTClient):

    def __init__(self):
        MQTTClient.__init__(self)

        logging.basicConfig(level=logging.INFO)

        self.id = str(uuid4())[0:8]
        # self.mqtt_client = mqtt_client

        # Subscribe to relevant events -> MQTT
        # self.event_grid.subscribe('parcel/+/placed', self.run) TODO remove?

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

        self.client.message_callback_add("bar/test/#", self.on_message_bar)

        # test find_route
        self.test_init()
        self.create_delivery_route(self.parcels['p00'])  # TODO trigger by function

    # def run(self, topic, message):
    #     # TODO deprecated
    #     print('opt_engine.run()')
    #     self.publish('completed', {'drones': [{'id': 'd00'}, {'id': 'd01'}]})

    def publish(self, topic, message='', sender=''):
        sender = sender or f'optimization-engine/{self.id}'
        # self.mqtt_client.publish(f'{sender}/{topic}', message)
        super().publish(f'{sender}/{topic}', message)

    def publish_to(self, receiver, topic, message):
        logging.debug(f"Opt_engine publish message to {receiver} on {topic}")
        self.publish(f'{self.root}/to/{receiver}/{topic}', json.dumps(message))

    def create_delivery_route(self, parcel):
        """finds route for given parcel, assigns entities to handle the sub-routes and sends them their missions"""
        try:
            route = self.find_route(parcel)
            drone1 = self.__assign_drone(route.air1)
            vehicle, v_type = self.__assign_vehicle(route.road)  # v_type is 'car' or 'bus'
            drone2 = self.__assign_drone(route.air2)

            logging.debug("Create_delivery_route: Assigned entities to sub-routes  -> starting missions...")
            # TODO if 1 return is None send a failed mission to visualization instead of publishing missions...
            self.create_and_start_mission(parcel, drone1, vehicle, v_type, drone2, route)

            logging.info(f"Started delivery mission for parcel: {parcel}")
        except ValueError as e:
            logging.error(f"Could not find route for parcel: {parcel}")
            self.reject_parcel(parcel)

        self.publish("bar/test", "tested/bar")

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
            logging.error("No first route exists: " + str(e))
            raise ValueError("No first route exists: " + str(e))
        try:
            route2 = Route(distance=self.dist[junction_source][junction_destination],
                           path=backtrack_shortest_path(self.pred, junction_source, junction_destination,
                                                        self.dist[junction_source][junction_destination]))
        except ValueError as e:
            logging.error("No second route 2 exists: " + str(e))
            raise ValueError("No second route 2 exists: " + str(e))
        try:
            route3 = Route(distance=self.dist[junction_destination][node_destination],
                           path=backtrack_shortest_path(self.pred, junction_destination, node_destination,
                                                        self.dist[junction_destination][node_destination]))
        except ValueError as e:
            logging.error("No third route exists: " + str(e))
            raise ValueError("No third route exists: " + str(e))

        logging.info(f"New route for parcel {parcel.id}: {[route1, route2, route3]}")

        route = Routes(air1=route1, road=route2, air2=route3)
        return route

    def __assign_drone(self, route):
        """
            returns id of idle drone for a sub-route. picks closest one to start of route.
        """
        # TODO where save drone speed --> constant at first???
        drone_speed = 2
        idle_drones = self.get_idle_drones()

        try:
            optimal_drone_id, drone_time = self.__assign_entity(route, idle_drones, drone_speed)
        except ValueError as e:
            logging.error("Failed to assign drone: " + str(e))

        logging.info(f"Assigned Drone to route: {route} -> Drone/{optimal_drone_id}")
        return optimal_drone_id

    def __assign_vehicle(self, route):
        """
            Finds best car and bus for a given route.
            Out of these two returns id of the best suited one and its type ('car' or 'bus').
        """

        car_speed = 10
        idle_cars = self.get_idle_cars()
        vehicle_type = "car"

        try:
            optimal_vehicle, vehicle_time = self.__assign_entity(route, idle_cars, car_speed)
        except ValueError as e:
            logging.error("Failed to assign car: " + str(e))

        optimal_bus, bus_time = self.__assign_bus(route)

        if vehicle_time > bus_time:  # Bus preferred if equal time
            optimal_vehicle = optimal_bus
            vehicle_type = "bus"

        logging.info(f"Assigned Ground vehicle to route: {route} -> {vehicle_type}/{optimal_vehicle}")

        return optimal_vehicle, vehicle_type

    def __assign_entity(self, route, entities, speed):
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

    def __assign_bus(self, route_parcel):
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

        time = 0
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
                time = time + (distance / speed)  # TODO assumption: not multiple edges between two nodes
                #         => shortest path = bus_route
                time = time + waiting_time

            bus_route.append(bus_route.pop(0))

        return time

    def get_busses_passing_node(self, node_start, node_end):
        """ returns list with tuples (id, bus) that pass the first and the final node of the delivery route on their
        route """
        # TODO check bus capacity...

        passing = []

        for (idx, bus) in self.busses.items():
            bus_route = bus.route
            route_nodes = list(map(lambda stop: stop['node'], bus_route))
            print(route_nodes)
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

        logging.debug("Create_start_mission: Created all transactions")

        m00 = {
            'id': 'm00',
            'tasks': [
                {'type': 'give', 'transaction': copy.deepcopy(t00)}
            ]
        }

        # TODO Enums (TaskState) not serializable (to json) -> HotFix: encode as String / better: extra parser
        drone_pos = self.drones[drone1_id].position
        # TODO currently naive approach -> always send 'move'-task: regardless of entity position
        m01 = {
            'id': 'm01',
            'tasks': [
                {'type': 'move', 'state': 'TaskState.notStarted', 'destination':
                    self.hubs[parcel.carrier['id']].position, 'minimumDuration': 10},
                {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t00)},
                {'type': 'move', 'state': 'TaskState.notStarted',
                 'destination': route.air1.path[-1], 'minimumDuration': 10},
                {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t01)},
                # TODO should drone move back afterwards?
                {'type': 'move', 'state': 'TaskState.notStarted', 'destination': drone_pos, 'minimumDuration': 10}
            ]
        }

        drone_pos = self.drones[drone2_id].position
        m02 = {
            'id': 'm02',
            'tasks': [
                {'type': 'move', 'state': 'TaskState.notStarted', 'destination': route.air2.path[0],
                 'minimumDuration': 10},
                {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t02)},
                {'type': 'move', 'state': 'TaskState.notStarted',
                 'destination': self.hubs[parcel.destination['id']].position, 'minimumDuration': 10},
                {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t03)},
                # TODO should drone move back afterwards?
                {'type': 'move', 'state': 'TaskState.notStarted', 'destination': drone_pos, 'minimumDuration': 10}
            ]
        }

        m03 = {}
        if vehicle_type == 'car':
            car_pos = self.cars[vehicle_id].position
            m03 = {
                'id': 'm03',
                'tasks': [
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': route.road.path[0],
                     'minimumDuration': 10},
                    {'type': 'pickup', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t01)},
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': route.road.path[-1],
                     'minimumDuration': 10},
                    {'type': 'dropoff', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t02)},
                    # TODO should car move back afterwards?
                    {'type': 'move', 'state': 'TaskState.notStarted', 'destination': car_pos, 'minimumDuration': 10}
                ]
            }

        elif vehicle_type == 'bus':
            # TODO check bus mission structure -> refactor where necessary
            # difference to car: no inital and final move instructions...
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

        m04 = {
            'id': 'm04',
            'tasks': [
                {'type': 'take', 'state': 'TaskState.notStarted', 'transaction': copy.deepcopy(t03)}
            ]
        }

        logging.debug("Publish missions to assigned entities: ")
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

        self.hubs['h00'] = Hub(id='h00', position='n05')
        self.hubs['h01'] = Hub(id='h01', position='n07')
        self.hubs['h02'] = Hub(id='h02', position='n11')

        # TODO also position as named tuple?
        self.drones['d00'] = Drone(id='d00', position={'x': -50, 'y': 60, 'z': 0}, state=DroneState.IDLE)
        self.drones['d01'] = Drone(id='d01', position={'x': -60, 'y': -60, 'z': 0}, state=DroneState.IDLE)
        self.drones['d02'] = Drone(id='d02', position={'x': 60, 'y': 0, 'z': 0}, state=DroneState.IDLE)

        self.cars['v00'] = Car(id='v00', position={'x': -50, 'y': 50, 'z': 0}, state=VehicleState.IDLE)

        self.busses['v01'] = Bus(id='v00', position={'x': 50, 'y': 50, 'z': 0},
                                 # 'route': [{'node': 'n02', 'time': 8}, {'node': 'n03', 'time': 6},
                                 #           {'node': 'n01', 'time': 3}, {'node': 'n00', 'time': 10}],
                                 route=[{'node': 'n00', 'time': 8}, {'node': 'n01', 'time': 6},
                                        {'node': 'n02', 'time': 3}, {'node': 'n09', 'time': 2},
                                        {'node': 'n03', 'time': 10}],
                                 state=VehicleState.MOVING)

        self.parcels['p00'] = Parcel(id='p00', carrier={'type': 'hub', 'id': 'h00'},
                                     destination={'type': 'hub', 'id': 'h01'})

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

    # TODO get data from simulators / some API ???
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

    # TODO add MQTT functionality to opt_engine!
    #   --> better handle from parent MQTT controller class!
    def publishTo(self):
        pass

    # TODO add message handler per topic here!!
    def on_message_bar(self, client, userdata, msg):
        topic = msg.topic
        print("OPT_ENGINE: MSG received: -BAR")
        print(f"Topic: {topic}:  {msg.payload}")
