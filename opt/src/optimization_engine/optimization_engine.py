from uuid import uuid4
import json
import copy

import networkx as nx
from .helpers import load_topology, load_mapping


# TODO: inherits from mqtt Client to enable notifications on new system states
class OptimizationEngine:

    def __init__(self, mqtt_client):
        self.id = str(uuid4())[0:8]
        self.mqtt_client = mqtt_client

        # Subscribe to relevant events -> MQTT
        # self.event_grid.subscribe('parcel/+/placed', self.run) TODO uncomment

        self.g_topo = load_topology('../../assets/topology.json')
        self.mapping = load_mapping('../../assets/topology.json')  # hub_id <-> node_id
        self.pred, self.dist = nx.floyd_warshall_predecessor_and_distance(self.g_topo)
        print(self.dist)

        # nothing like control-system that has knowledge of entities...
        #  - update when messages are sent???
        #  - init from json???
        # first hardcode example entities with from a test function

        self.drones = {}
        self.cars = {}
        # self.busses = {}
        self.parcels = {}
        self.orders = {}
        # addresses / customers

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

        drone1 = self.__assign_drone(route[0])
        car = self.__assign_car(route[1])
        drone2 = self.__assign_drone(route[2])

        self.create_and_start_mission(parcel, drone1, car, drone2, route)

    # TODO test debug from fake Parcel!!

    def find_route(self, parcel):
        # TODO from parcel get source-hub and destination hub

        source_hub_id = parcel.carrier["id"]  # TODO debug for parcel   # hub id!!
        s_h = self.hubs[source_hub_id]
        node_source = self.mapping[s_h[1]]  # transform to node_id
        node_destination = self.mapping[self.hubs[parcel.destination["id"]][1]]

        # find closest road junction to source & destination hubs  (parking: both drones and cars can access)
        # xTODO check if shortest way exists
        nodes_road = [x for x, y in self.g_topo.nodes(data=True) if y['type'] == 'parking']  # map n => n.id

        source_min_dest_junctions = map(lambda x: self.dist, nodes_road)
        # let source_min_dist_junctions = nodes_road.map(h= > dist[source][mapping[h]]);
        # let junction_source = dist[source].indexOf(Math.min.apply(null, source_min_dist_junctions));
        # let dest_min_dist_junctions = nodes_road.map(h= > dist[mapping[h]][destination]);
        # let junction_destination = dist.flatMap( n => n[destination]).indexOf((Math.min.apply(null,
        # dest_min_dist_junctions)));
        # // transposed!:  junction -> destination : min over column dist[i][dest]!

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
        self.test_init()

        # TODO create transactions
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

        # TODO create missions
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
        };

        # TODO publish missions
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

    def test_init(self):
        """ inits several hubs, drones, vehicles and parcels to allow for some basic testing until
        data exchange with to control-system is ready (MQTT or )"""
        self.hubs['h00'] = ('h00', 'n05')
        self.hubs['h01'] = ('h01', 'n07')
        self.hubs['h02'] = ('h02', 'n10')

        self.drones['d00'] = ('d00', {'x': -50, 'y': 60, 'z': 0})
        self.drones['d01'] = ('d01', {'x': -60, 'y': -60, 'z': 0})
        self.drones['d02'] = ('d02', {'x': 60, 'y': 0, 'z': 0})

        self.cars['v00'] = ('v00', {'x': -50, 'y': 50, 'z': 0})

        self.busses['v01'] = ('v00', {'x': 50, 'y': 50, 'z': 0})

        self.parcels['p00'] = ('p00', {type: 'hub', id: 'h00'}, {type: 'hub', id: 'h01'})

    # TODO first transcribe test method from control-system
    def create_and_start_mission(self, parcel, drone1, car, drone2, route):
        # TODO create transactions

        # TODO create missions

        # TODO publish missions
        pass

    def create_transaction(self, parcel, start, dest):
        pass

    # TODO
    #       - floyd_warshall
    #       -  backtrack_shortest_path
