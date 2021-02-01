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
        super('control-system', ['to/control-system/#', 'from/parcel/#', 'from/visualization/#']);

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
            // this.test(message);
            this.findRoute(new Parcel('p00', 'h00', 'h01'));
        }
    }

    createDeliveryRoute(parcel) {
        let route = this.findRoute(parcel);

        let drone1 = this.assignDrone(parcel);

    }

    findRoute(parcel) {
        // Concept:
        // Solve three sub-problems
        // 1) From source hub to the hub's road junction
        // 2) Between the two junctions
        // 3) From the destination hub's road junction to the hub
        // Each problem can be solved with the Floyd-Warshall algorithm which gives all shortest paths in the respective graphs
        // Then, for every vehicle, compute the sum of shortest paths (weighted with the vehicle's speed) from the current location to the pick-up node and from there to the drop-off node
        // Finally, choose the three vehicles which take the shortest time and assign them their respective mission


        // Source and destination are always hubs
        let nodes = Object.keys(topology.nodes);
        let mapping = _.invert(nodes);
        let source = mapping[this.hubSimulator.hubs[parcel.carrier.id]];
        let destination = mapping[this.hubSimulator.hubs[parcel.carrier.id]];

        let dist = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(Infinity));
        let next = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(0));

        for (let e of Object.values(topology.edges)) {
            let from = mapping[e.from], to = mapping[e.to];
            dist[from][to] = e.distance; next[from][to] = to;
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
                    }
                }
            }
        }

        console.log(dist);

    }

    assignDrone(parcel) {

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

        this.publishTo('drone/d00', 'mission', missions.m01);
        this.publishTo('hub/h00', 'mission', missions.m00);
        this.publishTo('drone/d01', 'mission', missions.m02);
        this.publishTo('car/v00', 'mission', missions.m03);
        this.publishTo('hub/h01', 'mission', missions.m04);
    }
};
