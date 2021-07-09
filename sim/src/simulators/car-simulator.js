// External modules
const _ = require('lodash');

// Internal modules
const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const { Car, CarState } = require('../models/car');

const topology = require('../../assets/topology');

module.exports = class CarSimulator extends MQTTClient {
    constructor(numberOfCars) {
        super('car-simulator', ['to/car/#', 'from/visualization/#']);

        this.numberOfCars = numberOfCars;
        this.cars = { };

        this.timer = null;
        this.interval = 100;
    }

    start() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.init();
        this.timer = setInterval(this.moveCars, this.interval);
    }

    pause() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    resume() {
        if (!this.timer) {
            this.timer = setInterval(this.moveCars, this.interval);
        }
        for (const [id, car] of Object.entries(this.cars)) {
            this.publishFrom(`car/${id}`, 'state', car);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.cars = { };
    }

    init() {
        this.cars = Object.assign({}, ...Array.from({ length: this.numberOfCars }).map(() => {
            let id = uuid();
            let start = random.key(_.pickBy(topology.nodes, n => ['parking', 'road-junction'].includes(n.type)));

            return { [id]: new Car (id, topology.nodes[start].position) };
        }));
        for (const [id, car] of Object.entries(this.cars)) {
            this.publishFrom(`car/${id}`, 'state', car);
        }
    }

    reset() {
        this.stop();
        this.start();
    }

    //TODO remove function & remove topic from receive
    test_init() {
        this.cars = { v00: new Car ('v00', { x: -50, y: 50, z: 0 }) };
        this.resume();
    }

    moveCars = () => {
        for (const [id, car] of Object.entries(this.cars)) {
            if (car.move(this.interval / 1000, this)) {
                this.publishFrom(`car/${id}`, 'state', car);
            }
        }
    };

    receive(topic, message) {
        super.receive(topic, message);

        if (topic.direction === 'from' && topic.entity === 'visualization') {
            if (['start', 'pause', 'resume', 'stop', 'reset'].includes(topic.rest)) {
                this[topic.rest]();
            }
        }
        //TODO remove
        else if (this.matchTopic(topic, '+/+/+/test_init')) {
            this.test_init();
        }
        else if (this.matchTopic(topic, 'to/car/+/mission')) {
            this.cars[topic.id].setMission(message, this);
        }
        else if (this.matchTopic(topic, 'to/car/+/transaction/+/ready')) {
            // This message is only received if the car is the transaction's "from" instance
            let transaction = this.cars[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
            transaction.ready = true;
        }
        else if (this.matchTopic(topic, 'to/car/+/transaction/+/execute')) {
            // This message is only received if the car is the transaction's "to" instance and has already sent the "ready" message
            this.cars[topic.id].completeTransaction(this);
        }
        else if (this.matchTopic(topic, 'to/car/+/transaction/+/complete')) {
            // This message is only received if the car is the transaction's "from" instance and has already sent the "execute" message
            this.cars[topic.id].completeTask(this);
        }
    }

    getIdleCars() {
        return Object.fromEntries(Object.entries(this.cars).filter(d => d[1]['state'] === 0))
    }

    updateCarState(id) {
        let car = this.cars[id];
        this.publishFrom(`car/${id}`, 'state', car);
    }
};
