// External modules
const _ = require('lodash');

// Internal modules
const {random, uuid} = require('../helpers');
const MQTTClient = require('../mqtt-client');
const {Bus} = require("../models/bus");

// TODO s:  - add change route
//          - add abort mission

module.exports = class BusSimulator extends MQTTClient {

    constructor(scenario) {
        super('bus-simulator', ['bus/#', 'visualization/#']);

        this.scenario = scenario;
        this.buses = {};

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
            this.publish(`bus/${id}`, 'state', bus);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.buses = {};
    }

    init() {
        this.buses = Object.assign({}, ...Object.values(this.scenario.entities.buses).map(bus => {
            let id = bus.id || uuid();
            let position = bus.position || random.roadHub().position;
            let route = bus.route || null;

            return {[id]: new Bus(id, position, route)};
        }));

        for (const [id, bus] of Object.entries(this.buses)) {
            this.publish(`bus/${id}`, 'state', bus);
        }
    }

    reset() {
        this.stop();
        this.start();
    }

    receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'visualization/#')) {
            if (['start', 'pause', 'resume', 'stop', 'reset'].includes(topic.rest)) {
                this[topic.rest]();
            }
        } else if (this.matchTopic(topic, 'bus/+/mission')) {
            this.buses[topic.id].setMission(message, this);
        } else if (this.matchTopic(topic, 'bus/+/transaction/+/ready')) {
            // This message is only received if the car is the transaction's "from" instance
            this.setTransactionReady(topic.id, topic.args[1])
        } else if (this.matchTopic(topic, 'bus/+/transaction/+/execute')) {
            // This message is only received if the car is the transaction's "to" instance and has already sent the "ready" message
            this.buses[topic.id].completeTransaction(this, topic.args[1]);
        } else if (this.matchTopic(topic, 'bus/+/transaction/+/complete')) {
            // This message is only received if the car is the transaction's "from" instance and has already sent the "execute" message
            this.buses[topic.id].completeTask(this, topic.args[1]);
        }
        // TODO add change route
    }

    // TODO collisions possible -> same transactionID in different missions assigned to bus
    // TODO!! -> unset ready when Bus drives to next stop!!
    setTransactionReady(busId, transactionId) {

        for (let m in this.buses[busId].missions) {

            let transaction = this.buses[busId].missions[m].tasks.find(t => t.transaction && t.transaction.id === transactionId).transaction; //
            if (typeof transaction !== 'undefined') {
                transaction.ready = true;
                return true
            }
        }
        console.log(`-- Could not find transaction ID in missions of Bus ${busId}`)

    }


    moveBuses = () => {
        for (const [id, bus] of Object.entries(this.buses)) {
            if (bus.move(this.interval / 1000, this)) {
                this.publish(`bus/${id}`, 'state', bus);
            }
        }
    };

    updateBusState(id) {
        let bus = this.buses[id];
        this.publishFrom(`bus/${id}`, 'state', bus);
    }
};
