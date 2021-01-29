// External modules

// Internal modules
const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const Vehicle = require('../models/vehicle');

module.exports = class VehicleSimulator extends MQTTClient {
    constructor(numberOfVehicles) {
        super('vehicle-simulator', ['to/vehicle/#', 'from/visualization/#']);

        this.numberOfVehicles = numberOfVehicles;
        this.vehicles = { };

        this.timer = null;
        this.interval = 100;
    }

    start() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.init();
        this.timer = setInterval(this.moveVehicles, this.interval);
    }

    pause() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    resume() {
        if (!this.timer) {
            this.timer = setInterval(this.moveVehicles, this.interval);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.vehicles = { };
    }

    init() {
        this.vehicles = Object.assign({}, ...Array.from({ length: this.numberOfVehicles }).map(() => {
            let id = uuid();
            return { [id]: new Vehicle(id, random.position()) };
        }));
    }

    moveVehicles = () => {
        for (const [id, vehicle] of Object.entries(this.vehicles)) {
            vehicle.move(this.interval / 1000);
            this.publishFrom(`vehicle/${id}`, 'state', vehicle);
        }
    };

    receive(topic, message) {
        super.receive(topic, message);

        if (topic.direction === 'from' && topic.entity === 'visualization') {
            if (['start', 'pause', 'resume', 'stop'].includes(topic.rest)) {
                this[topic.rest]();
            }
        }
    }
};
