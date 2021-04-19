// External modules
const _ = require('lodash');

// Internal modules
const { random, uuid } = require('../helpers');
const EventGridClient = require('../eventgrid-client');
const {Bus} = require("../models/bus");

const topology = require('../../assets/topology');

module.exports = class BusSimulator extends EventGridClient {
    constructor(eventGrid, numberOfBuses) {
        super('bus-simulator',eventGrid);

        // TODO create and adapt these functions...
        this.subscribe('visualization/#', this.handleCommand.bind(this));
        this.subscribe('bus/+/mission', this.handleMission.bind(this));
        this.subscribe('bus/+/transaction/+/ready', this.handleTransactionReady.bind(this));
        this.subscribe('bus/+/transaction/+/execute', this.handleTransactionExecute.bind(this));
        this.subscribe('bus/+/transaction/+/complete', this.handleTransactionComplete.bind(this));

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

    init() { //TODO change to fixed route along the Rectangle for testing
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
            let transaction = this.buses[topic.id].missions.find(m => m.task && m).tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction; //TODO multiple missions: find mission -> task -> transaction
            transaction.ready = true;
        }
        else if (this.matchTopic(topic, 'to/bus/+/transaction/+/execute')) {
            // This message is only received if the car is the transaction's "to" instance and has already sent the "ready" message
            this.buses[topic.id].completeTra nsaction(this);
        }
        else if (this.matchTopic(topic, 'to/bus/+/transaction/+/complete')) {
            // This message is only received if the car is the transaction's "from" instance and has already sent the "execute" message
            this.buses[topic.id].completeTask(this);
        }
        // TODO add change route
    }


};
