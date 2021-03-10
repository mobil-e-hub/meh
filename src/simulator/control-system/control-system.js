// External modules
const MQTT = require('mqtt');
const _ = require('lodash');

// Internal modules
const MQTTClient = require('../mqtt-client');
const { random, uuid } = require('../helpers');

const { Drone, DroneState, TaskState } = require('../models/drone');
const { Car, CarState } = require('../models/car');
const Hub = require('../models/hub');
const Parcel = require('../models/parcel');

const topology = require('../../topology');

module.exports = class ControlSystem extends MQTTClient {
    constructor(droneSimulator, carSimulator, hubSimulator, parcelSimulator) {
        super('control-system', ['to/control-system/#', 'from/parcel/+/placed', 'from/parcel/+/delivered', 'from/visualization/#']);

        this.droneSimulator = droneSimulator;
        this.carSimulator = carSimulator;
        this.hubSimulator = hubSimulator;
        this.parcelSimulator = parcelSimulator;
    }

    receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'from/parcel/+/placed')) {
            this.createDeliveryRoute(message);
        }
        if (this.matchTopic(topic, 'from/visualization/+/test')) {
            this.test(message);
            // this.findRoute(new Parcel('p00', 'h00', 'h01'));
        }
    }

    createDeliveryRoute(parcel) {

        //TODO
        //  1. get distances between nodes from parcels (return distance matrix)
        //      --> run Floyd Warshall once or for every mission --> are nodes added / removed dynamically?
        //                                                       --> can only parking (at nodes) entities start new missions (e.g car accepts new mission during repositioning)
        //  2. get available entities
        //      --> centralized control: track status / availability of each entity
        //      --> decentralized "":   Message with route to all entities (inform of offer), they somehow negotiate which routes / entities are best fit and answer
        //  3. compute shortest overall route: Sum(Speed * distance)
        //      --> consider way to source hub         --> also check if battery charge sufficient for mission??
        //      --> consider type of route (road/air)??
        //  4. choose best suited entities
        //      --> decentralised: all intelligent entities do step 3 individually and negotiate step 4 ?
        //  5. assign entity --> send MQTT / Event Grid Messages
        //

        let route = this.findRoute(parcel);

        let drone1 = this.assignDrone(parcel, route.air1);
        let car = this.assignCar(parcel, route.road);
        let drone2 = this.assignDrone(parcel, route.air2)

        //----------------

        // TODO: create Transactions & Missions

        // TODO => MQTT: publish to entities
        //     1. M1: source hub: give
        //     2. M2: drone 1   : move, pickup, move , dropoff, (move? - again to starting pos?)
        //     3. M3: car       :      """
        //     4. M4: drone 2   :      """
        //     5. M5: dest-hub  : take

    }

    findRoute(parcel) {
        // Concept:
        // Solve three sub-problems
        // 1) From source hub to the hub's road junction   TODO: always the same junctions? --> corresponding road junction stored somewhere?
        // 2) Between the two junctions   TODO  --> filter for type: 'parking' (/ road ??)
        // 3) From the destination hub's road junction to the hub
        // Each problem can be solved with the Floyd-Warshall algorithm which gives all shortest paths in the respective graphs
        // Then, for every vehicle, compute the sum of shortest paths (weighted with the vehicle's speed) from the current location to the pick-up node and from there to the drop-off node
        // Finally, choose the three vehicles which take the shortest time and assign them their respective mission


        //TODO
        //      - difference between air and road edges??
        //      -Assumption: Source and destination are always hubs


        // compute shortest pairs matrix
        let nodes = Object.keys(topology.nodes);
        let _floydWarshall = this.floyd_warshall(nodes, parcel);   // TODO consider type of edge here?? --> e.g. road could contain air shortcut or do we trust the map?
        let dist = _floydWarshall[0];
        let next = _floydWarshall[1];

        let mapping = _.invert(nodes);
        let s_h = this.hubSimulator.hubs[parcel.carrier.id];  // TODO sometimes undefined --> crash ... Couldn't reproduce...
        let source = mapping[s_h.position];
        let destination = mapping[this.hubSimulator.hubs[parcel.destination.id].position];

        // find closest road junction to source & destination hubs  (air --> parking)
        // xTODO only type 'parking' ??
        // xTODO check if shortest way exists
        let nodes_road = Object.values(topology.nodes).filter(n => n["type"] == 'parking').map(n => n.id)  //TODO: type 'road' also possible as junction?

        let source_min_dist_junctions = nodes_road.map( h => dist[source][mapping[h]]);
        let junction_source = dist[source].indexOf(Math.min.apply(null, source_min_dist_junctions));
        let dest_min_dist_junctions = nodes_road.map( h => dist[mapping[h]][destination]);
        let junction_destination = dist.flatMap( n => n[destination]).indexOf((Math.min.apply(null, dest_min_dist_junctions))); // transposed!:  junction -> destination : min over column dist[i][dest]!

        //Backtrack shortest Paths
        let shortestRoad = {distance: dist[junction_source][junction_destination], path: this.backtrackShortestPath(next, junction_source, junction_destination)};
        let shortestAir1 = {distance: dist[source][junction_source], path: this.backtrackShortestPath(next, source, junction_source)};
        let shortestAir2 = {distance: dist[junction_destination][destination], path: this.backtrackShortestPath(next, junction_destination, destination)};

        let route = {air1: shortestAir1, road: shortestRoad, air2: shortestAir2};
        return route;
    }

    floyd_warshall(nodes) {
        // works with distance specified in edge, doesn't compute positions!!
        //
        let mapping = _.invert(nodes);

        let dist = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(Infinity));
        let next = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(0));

        for (let e of Object.values(topology.edges)) {
            let from = mapping[e.from], to = mapping[e.to];
            dist[from][to] = e.distance; next[from][to] = parseInt(to);
        }
        for (let n = 0; n < nodes.length; n++) {
            dist[n][n] = 0;
            next[n][n] = n;
        }

        for (let k = 0; k < nodes.length; k++) {
            for (let i = 0; i < nodes.length; i++) {
                for (let j = 0; j < nodes.length; j++) {
                    if (dist[i][j] > dist[i][k] + dist[k][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                        next[i][j] = parseInt(next[i][k]);
                    }
                }
            }
        }
        console.log(dist);

        return [dist, next];
    }

    backtrackShortestPath(matrix_next, start, end) {
        // TODO throw Exception if Infinity: There is no path.
        let path = [start];
        let n = parseInt(start);
        end = parseInt(end);
        while(n != matrix_next[n][end]) {
            n = matrix_next[n][end];
            path.push(n);
        }
        return path;
    }


    assignDrone(parcel, route) {
        //    TODO which one to pick?? always closest idle one / or also utilization / details like enough battery left for this mission??
        //      --> consider Action space!!!

        //  TODO  get idle drones
        //      --> optimize: do not consider all?
        let idle_drones = this.droneSimulator.getIdleDrones();
        let node = route.shift();

        let optimal_drone;
        let travelTime = new Array(idle_drones.length);


        let i = 0;
        for (let drone in idle_drones) {
            // way to route starting point
            let distance = 0; // TODO  compute euclidean distance /
                              //      better: look up in dist matrix form FW  (Assumption, drone is at node!)
                              //            --> map positions of drones to nodes first!!

            travelTime[i] = distance / drone.speed;

            // actual route
            travelTime[i] += route.distance / drone.speed;

            // TODO compare for optimal (min) time --> retrieve that drone!!

            //  TODO get positions of idle drones
            //                - check sum(distance * speed) over drone -> node -> node
            //                - if two equally : --> conflict resolution?
            //                - assign missions --> drone two gets blocked immediately?? (waiting??)
        }
    }

    findClosestEntity(node, entities){
        return 0;
    }

    assignCar(parcel, route) {
        return 0;
    }

    test(message) {
        this.hubSimulator.hubs = { h00: new Hub('h00', 'n05'), h01: new Hub('h01', 'n07') };
        this.droneSimulator.drones = { d00: new Drone('d00', { x: -50, y: 60, z: 0 }), d01: new Drone('d01', { x: -60, y: -60, z: 0 }) };
        this.carSimulator.cars = { v00: new Car ('v00', { x: -50, y: 50, z: 0 }) };
        this.parcelSimulator.parcels = { p00: new Parcel('p00', 'h00', 'h01') };

        let transactions = {
            t00: {
                id: 't00',
                from: { type: 'hub', id: 'h00' },
                to: { type: 'drone', id: 'd00' },
                parcel: 'p00'
            },
            t01: {
                id: 't01',
                from: { type: 'drone', id: 'd00' },
                to: { type: 'car', id: 'v00' },
                parcel: 'p00'
            },
            t02: {
                id: 't02',
                from: { type: 'car', id: 'v00' },
                to: { type: 'drone', id: 'd01' },
                parcel: 'p00'
            },
            t03: {
                id: 't03',
                from: { type: 'drone', id: 'd01' },
                to: { type: 'hub', id: 'h01' },
                parcel: 'p00'
            }
        };
        let missions = {
            m00: {
                id: 'm00',
                tasks: [
                    { type: 'give', transaction: _.clone(transactions.t00) }
                ]
            },
            m01: {
                id: 'm01',
                tasks: [
                    { type: 'move', state: TaskState.notStarted, destination: {x: -60, y: 60, z: 0}, minimumDuration: 10 },
                    { type: 'pickup', state: TaskState.notStarted, transaction: _.clone(transactions.t00) },
                    { type: 'move', state: TaskState.notStarted, destination: {x: -60, y: 50, z: 0}, minimumDuration: 10 },
                    { type: 'move', state: TaskState.notStarted, destination: {x: -50, y: 50, z: 0}, minimumDuration: 10 },
                    { type: 'dropoff', state: TaskState.notStarted, transaction: _.clone(transactions.t01) },
                    { type: 'move', state: TaskState.notStarted, destination: {x: -50, y: 60, z: 0}, minimumDuration: 10 }
                ]
            },
            m02: {
                id: 'm02',
                tasks: [
                    { type: 'move', state: TaskState.notStarted, destination: { x: -50, y: -50, z: 0 }, minimumDuration: 10 },
                    { type: 'pickup', state: TaskState.notStarted, transaction: _.clone(transactions.t02) },
                    { type: 'move', state: TaskState.notStarted, destination: {x: -60, y: -60, z: 0}, minimumDuration: 10 },
                    { type: 'dropoff', state: TaskState.notStarted, transaction: _.clone(transactions.t03) }
                ]
            },
            m03: {
                id: 'm03',
                tasks: [
                    {type: 'pickup', state: TaskState.notStarted, transaction: _.clone(transactions.t01)},
                    { type: 'move', state: TaskState.notStarted, destination: {x: -50, y: -50, z: 0}, minimumDuration: 10 },
                    { type: 'dropoff', state: TaskState.notStarted, transaction: _.clone(transactions.t02) }
                ]
            },
            m04: {
                id: 'm04',
                tasks: [
                    { type: 'take', state: TaskState.notStarted, transaction: _.clone(transactions.t03) }
                ]
            }
        };

        // let transactions = {
        //     t00: {
        //         id: 't00',
        //         from: { type: 'hub', id: 'h00' },
        //         to: { type: 'drone', id: 'd00' },
        //         parcel: 'p00'
        //     },
        //     t01: {
        //         id: 't01',
        //         from: { type: 'drone', id: 'd00' },
        //         to: { type: 'drone', id: 'd01' },
        //         parcel: 'p00'
        //     },
        //     t02: {
        //         id: 't02',
        //         from: { type: 'drone', id: 'd01' },
        //         to: { type: 'hub', id: 'h01' },
        //         parcel: 'p00'
        //     }
        // };
        //
        // let missions = {
        //     m00: {
        //         id: 'm00',
        //         tasks: [
        //             { type: 'give', transaction: _.clone(transactions.t00) }
        //         ]
        //     },
        //     m01: {
        //         id: 'm01',
        //         tasks: [
        //             { type: 'move', state: TaskState.notStarted, destination: { x: -60, y: 60, z: 0 }, minimumDuration: 10 },
        //             { type: 'pickup', state: TaskState.notStarted, transaction: _.clone(transactions.t00) },
        //             { type: 'move', state: TaskState.notStarted, destination: { x: -60, y: 50, z: 0 }, minimumDuration: 10 },
        //             { type: 'move', state: TaskState.notStarted, destination: { x: -50, y: 50, z: 0 }, minimumDuration: 10 },
        //             { type: 'move', state: TaskState.notStarted, destination: { x: -50, y: -50, z: 0 }, minimumDuration: 10 },
        //             { type: 'dropoff', state: TaskState.notStarted, transaction: _.clone(transactions.t01) },
        //             { type: 'move', state: TaskState.notStarted, destination: { x: -50, y: 60, z: 0 }, minimumDuration: 10 }
        //         ]
        //     },
        //     m02: {
        //         id: 'm02',
        //         tasks: [
        //             { type: 'move', state: TaskState.notStarted, destination: { x: -50, y: -50, z: 0 }, minimumDuration: 10 },
        //             { type: 'pickup', state: TaskState.notStarted, transaction: _.clone(transactions.t01) },
        //             { type: 'move', state: TaskState.notStarted, destination: { x: -60, y: -60, z: 0 }, minimumDuration: 10 },
        //             { type: 'dropoff', state: TaskState.notStarted, transaction: _.clone(transactions.t02) }
        //         ]
        //     },
        //     m03: {
        //         id: 'm03',
        //         tasks: [
        //             { type: 'take', state: TaskState.notStarted, transaction: _.clone(transactions.t02) }
        //         ]
        //     }
        // };

        this.hubSimulator.resume();
        this.droneSimulator.resume();
        this.carSimulator.resume();
        this.parcelSimulator.resume();

        this.publishTo('hub/h00', 'mission', missions.m00);
        this.publishTo('drone/d00', 'mission', missions.m01);
        this.publishTo('drone/d01', 'mission', missions.m02);
        this.publishTo('car/v00', 'mission', missions.m03);
        this.publishTo('hub/h01', 'mission', missions.m04);
    }
};


