// External modules
const _ = require('lodash');

// Internal modules
const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const { Car, CarState } = require('../models/car');

module.exports = class CarSimulator extends MQTTClient {

    constructor(scenario) {
        super('car-simulator', ['car/#', 'visualization/#']);
        this.scenario = scenario;
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
            this.publish(`car/${id}`, 'state', car);
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
        console.log('init car');
        this.cars = Object.assign({}, ...Object.values(this.scenario.entities.cars).map(car => {
            let id = car.id || uuid();
            let position = car.position || random.roadHub().position;

            return { [id]: new Car (id, position)};
        }));
        for (const [id, car] of Object.entries(this.cars)) {
            this.publish(`car/${id}`, 'state', car);
        }
    }

    reset() {
        this.stop();
        this.start();
    }

    moveCars = () => {
        for (const [id, car] of Object.entries(this.cars)) {
            if (car.move(this.interval / 1000, this)) {
                this.publish(`car/${id}`, 'state', car);
            }
        }
    };

    receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'visualization/#')) {
                if (['start', 'pause', 'resume', 'stop', 'reset'].includes(topic.rest)) {
                    this[topic.rest]();
                }
        }
        else if (this.matchTopic(topic, 'car/+/mission')) {
            this.cars[topic.id].setMission(message, this);
        }
        else if (this.matchTopic(topic, 'car/+/transaction/+/ready')) {
            // This message is only received if the car is the transaction's "from" instance
            let transaction = this.cars[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
            transaction.ready = true;
        }
        else if (this.matchTopic(topic, 'car/+/transaction/+/unready')) {
            // This message is only received if the car is the transaction's "from" instance
            let transaction = this.cars[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
            transaction.ready = false;
        }
        else if (this.matchTopic(topic, 'car/+/transaction/+/execute')) {
            // This message is only received if the car is the transaction's "to" instance and has already sent the "ready" message
            this.cars[topic.id].completeTransaction(this);
        }
        else if (this.matchTopic(topic, 'car/+/transaction/+/complete')) {
            // This message is only received if the car is the transaction's "from" instance and has already sent the "execute" message
            this.cars[topic.id].completeTask(this);
        }
//        else if (this.matchTopic(topic, 'car/+/parcel/+/placed')) {
//            this.cars[topic.id].parcels.append()
//      }
    }

    getIdleCars() {
        return Object.fromEntries(Object.entries(this.cars).filter(d => d[1]['state'] === 0))
    }

    updateCarState(id) {
        let car = this.cars[id];
        this.publish(`car/${id}`, 'state', car);
    }
};
