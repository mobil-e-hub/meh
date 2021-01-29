// External modules

// Internal modules
const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const Drone = require('../models/drone');

// Class
module.exports = class DroneSimulator extends MQTTClient {
    constructor(numberOfDrones) {
        super('drone-simulator', ['to/drone/#', 'from/visualization/#']);

        this.numberOfDrones = numberOfDrones;
        this.drones = { };

        this.timer = null;
        this.interval = 100;
    }

    start() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.init();
        this.timer = setInterval(this.moveDrones, this.interval);
    }

    pause() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    resume() {
        if (!this.timer) {
            this.timer = setInterval(this.moveDrones, this.interval);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.drones = { };
    }

    init() {
        this.drones = Object.assign({}, ...Array.from({ length: this.numberOfDrones }).map(() => {
            let id = uuid();
            return { [id]: new Drone(id, random.position()) };
        }));
    }

    moveDrones = () => {
        for (const [id, drone] of Object.entries(this.drones)) {
            if (drone.move(this.interval / 1000, this.publishTo.bind(this))) {
                this.publishFrom(`drone/${id}`, 'state', drone);
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
        else if (topic.direction === 'to' && topic.entity === 'drone' && topic.rest === 'tasks') {
            this.drones[topic.id].tasks = message;
        }
    }
};
