// External modules
const { v4: uuid } = require('uuid');
const MQTT = require('mqtt');

// Internal modules
const Vehicle = require('./vehicle');

module.exports = class VehicleSimulator {
    constructor(numberOfVehicles) {
        this.numberOfVehicles = numberOfVehicles;
        this.vehicles = { };

        this.mqtt = {
            client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'),
            root: 'mobil-e-hub/v1',
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(`${this.mqtt.root}/to/vehicle/#`);
            this.mqtt.client.subscribe(`${this.mqtt.root}/from/visualization/#`);

            this.publish('connected');
        });

        this.mqtt.client.on('message', (topic, message) => {
            this.receive(topic.split('/'), JSON.parse(message.toString()));
        });

        this.timer = null;
        this.interval = null;
    }

    start(interval) {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.init();

        this.interval = interval;
        this.timer = setInterval(this.moveVehicles, interval);
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
            return { [id]: new Vehicle(id) };
        }));
    }

    publishState() {
        for (const [id, vehicle] of Object.entries(this.vehicles)) {
            this.publishFrom(`vehicle/${id}`, 'state', vehicle);
        }
    }

    moveVehicles = () => {
        for (const [id, vehicle] of Object.entries(this.vehicles)) {
            vehicle.move(this.interval / 1000);
            this.publishFrom(`vehicle/${id}`, 'state', vehicle);
        }
    };

    publishFrom(sender, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [VehicleSimulator] from/${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    publish(topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/vehicle-simulator/${this.mqtt.id}/${topic}`, JSON.stringify(message));
        console.log(`< [VehicleSimulator] from/vehicle-simulator/${this.mqtt.id}/${topic}: ${JSON.stringify(message)}`);
    }

    publishTo(receiver, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/to/${receiver}/${topic}`, JSON.stringify(message));
        console.log(`< [VehicleSimulator] to/${receiver}/${topic}: ${JSON.stringify(message)}`);
    }

    receive(topic, message) {
        console.log(`> [VehicleSimulator] ${topic.join('/')}: ${JSON.stringify(message)}`);

        if (topic[2] === 'from' && topic[3] === 'visualization' && topic[5] === 'start') {
            this.start(100);
        }
        else if (topic[2] === 'from' && topic[3] === 'visualization' && topic[5] === 'pause') {
            this.pause();
        }
        else if (topic[2] === 'from' && topic[3] === 'visualization' && topic[5] === 'resume') {
            this.resume();
        }
        else if (topic[2] === 'from' && topic[3] === 'visualization' && topic[5] === 'stop') {
            this.stop();
        }
    }
};
