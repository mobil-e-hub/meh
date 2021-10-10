
// External modules
const MQTT = require('mqtt');
const _ = require('lodash');

// Internal modules
const MQTTClient = require('../mqtt-client');
const { random, uuid, dist2d } = require('../helpers');

const { Drone, DroneState, TaskState } = require('../models/drone');
const { Car, CarState } = require('../models/car');
const {Bus, BusState} = require("../models/bus");
const Hub = require('../models/hub');
const Parcel = require('../models/parcel');

const topology = require('../../assets/topology');


module.exports = class ControlSystem extends MQTTClient {

    constructor(droneSimulator, carSimulator, busSimulator, hubSimulator, parcelSimulator) {
        super('control-system', ['control-system/#', 'parcel/+/placed', 'parcel/+/delivered', 'visualization/#', 'order/+/placed']);

        this.droneSimulator = droneSimulator;
        this.carSimulator = carSimulator;
        this.busSimulator = busSimulator;
        this.hubSimulator = hubSimulator;
        this.parcelSimulator = parcelSimulator;

        this.distances = null;
        this.countTransaction = 0;
        this.countMission = 0;
    }

    receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'parcel/+/placed')) {
            // this.createDeliveryRoute(message);
        }
        if (this.matchTopic(topic, 'visualization/+/test')) {
            // this.test(message);
            // this.findRoute(new Parcel('p00', 'h00', 'h01'));
        }
        if (this.matchTopic(topic, 'order/+/placed')) {
            // this.test(message);
            // this.findRoute(new Parcel('p00', 'h00', 'h01'));
        }
    }

    //TODO check if no idle drone is at a hub --> throw error
    getNodeByPosition(position) {
        return Object.keys(topology.nodes).find(key => topology.nodes[key].position.x === position.x && topology.nodes[key].position.y === position.y) ;
    }


    getHubs(position, radius) {
        return Object.values(this.hubSimulator.hubs).filter(h => dist2d(topology.nodes[h.position].position, position) <= radius);
    }

};
