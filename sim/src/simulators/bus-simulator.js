// External modules
const _ = require('lodash');

// Internal modules
const {random, uuid} = require('../helpers');
const MQTTClient = require('../mqtt-client');
const {Bus} = require("../models/bus");

const topology = require('../../assets/topology');

// TODO s:  - add change route
//          - add abort mission

module.exports = class BusSimulator extends MQTTClient {
    constructor(numberOfBuses) {
        super('bus-simulator', ['to/bus/#', 'from/visualization/#']);

        // TODO create and adapt these functions...
        // this.subscribe('visualization/#', this.handleCommand.bind(this));
        // this.subscribe('bus/+/mission', this.handleMission.bind(this));
        // this.subscribe('bus/+/transaction/+/ready', this.handleTransactionReady.bind(this));
        // this.subscribe('bus/+/transaction/+/execute', this.handleTransactionExecute.bind(this));
        // this.subscribe('bus/+/transaction/+/complete', this.handleTransactionComplete.bind(this));

        this.numberOfBuses = numberOfBuses;
        this.buses = {};

        this.timer = null;
        this.interval = 100;
    }

    start() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.reset();
        this.timer = setInterval(this.moveBuses, this.interval);
    }

    pause() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    resume() {
        if (!this.timer) {
            this.timer = setInterval(this.moveBuses, this.interval);
        }
        for (const [id, bus] of Object.entries(this.buses)) {
            this.publishFrom(`bus/${id}`, 'state', bus);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.buses = {};
    }

    reset() { //TODO change to fixed route along the Rectangle for testing
        this.buses = Object.assign({}, ...Array.from({length: this.numberOfBuses}).map(() => {
            let id = uuid();
            let start = random.key(_.pickBy(topology.nodes, n => ['parking', 'road-junction'].includes(n.type)));
            let route = [{node: 'n00', position: { x: -50, y: 50, z: 0 }, time: 10},
                {node: 'n01', position: { x: -50, y: -50, z: 0 }, time: 3},
                {node: 'n02', position: { x: 50, y: -50, z: 0 }, time: 6},
                {node: 'n09', position: { x: 50, y: 0, z: 0 }, time: 12},
                {node: 'n03', position: { x: 50, y: 50, z: 0 }, time: 20}]// erstmal fixe route nehmen... // TODO replace with better init -> random /

            return {[id]: new Bus(id, topology.nodes['n00'].position, route)};
            // return { [id]: new Bus(id, topology.nodes[start].position, []) };
        }));
        // TODO weg??
        for (const [id, bus] of Object.entries(this.buses)) {
            this.publishFrom(`bus/${id}`, 'state', bus);
        }
    }

    receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'from/visualization/#')) {
            if (['start', 'pause', 'resume', 'stop'].includes(topic.rest)) {
                this[topic.rest]();
            }
        } else if (this.matchTopic(topic, 'to/bus/+/mission')) {
            this.buses[topic.id].setMission(message, this);
        } else if (this.matchTopic(topic, 'to/bus/+/transaction/+/ready')) {
            // This message is only received if the car is the transaction's "from" instance
            let transaction = this.buses[topic.id].missions.find(m => m.task && m).tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction; //TODO multiple missions: find mission -> task -> transaction
            transaction.ready = true;
        } else if (this.matchTopic(topic, 'to/bus/+/transaction/+/execute')) {
            // This message is only received if the car is the transaction's "to" instance and has already sent the "ready" message
            this.buses[topic.id].completeTransaction(this);
        } else if (this.matchTopic(topic, 'to/bus/+/transaction/+/complete')) {
            // This message is only received if the car is the transaction's "from" instance and has already sent the "execute" message
            this.buses[topic.id].completeTask(this);
        }
        // TODO add change route
    }

    moveBuses = () => {
        for (const [id, bus] of Object.entries(this.buses)) {
            if (bus.move(this.interval / 1000, this)) {
                this.publishFrom(`bus/${id}`, 'state', bus);
            }
        }
    };


    //TODO alex enable multiple missions
    handleMission(topic, message) {
        this.buses[topic.id].setMission(message, this);
    }

    //TODO alex enable multiple missions
    handleTransactionReady(topic, message) {
        // This message is only received if the bus is the transaction's "from" instance
        let transaction = this.buses[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
        transaction.ready = true;
    }

    handleTransactionExecute(topic, message) {
        // This message is only received if the bus is the transaction's "to" instance and has already sent the "ready" message
        this.buses[topic.id].completeTransaction(this);
    }

    handleTransactionComplete(topic, message) {
        // This message is only received if the bus is the transaction's "from" instance and has already sent the "execute" message
        this.buses[topic.id].completeTask(this);
    }


};
