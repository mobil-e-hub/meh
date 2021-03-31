// External modules
const _ = require('lodash');

// Internal modules
const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const {Bus} = require("../models/bus");

const topology = require('../../topology');

module.exports = class BusSimulator extends MQTTClient {
    constructor(numberOfBuses) {
        super('bus-simulator', ['to/bus/#', 'from/visualization/#']);

        this.numberOfBuses = numberOfBuses;
        this.buses = { };

        this.timer = null;
        this.interval = 100;
    }

    start() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.init();
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

        this.buses = { };
    }

    init() {
        this.buses = Object.assign({}, ...Array.from({ length: this.numberOfBuses }).map(() => {
            let id = uuid();
            let start = random.key(_.pickBy(topology.nodes, n => ['parking', 'road-junction'].includes(n.type)));
            // let route = erstmal fixe route nehmen... TODO

            return { [id]: new Bus(id, topology.nodes[start].position, []) };
        }));
        for (const [id, bus] of Object.entries(this.buses)) {
            this.publishFrom(`bus/${id}`, 'state', bus);
        }
    }

    moveBuses = () => {
        for (const [id, bus] of Object.entries(this.buses)) {
            if (bus.move(this.interval / 1000, this)) {
                this.publishFrom(`bus/${id}`, 'state', bus);
            }
        }
    };

    receive(topic, message) {
        super.receive(topic, message);

        if (topic.direction === 'from' && topic.entity === 'visualization') {
            if (['start', 'pause', 'resume', 'stop'].includes(topic.rest)) {
                this[topic.rest]();
            }
        }
        else if (this.matchTopic(topic, 'to/bus/+/mission')) {
            this.buses[topic.id].setMission(message, this);
        }
        else if (this.matchTopic(topic, 'to/bus/+/transaction/+/ready')) {
            // This message is only received if the car is the transaction's "from" instance
            let transaction = this.buses[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
            transaction.ready = true;
        }
        else if (this.matchTopic(topic, 'to/bus/+/transaction/+/execute')) {
            // This message is only received if the car is the transaction's "to" instance and has already sent the "ready" message
            this.buses[topic.id].completeTransaction(this);
        }
        else if (this.matchTopic(topic, 'to/bus/+/transaction/+/complete')) {
            // This message is only received if the car is the transaction's "from" instance and has already sent the "execute" message
            this.buses[topic.id].completeTask(this);
        }
        // TODO add change route
    }


};
