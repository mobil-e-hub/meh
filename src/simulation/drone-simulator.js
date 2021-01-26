// External modules
const { v4: uuid } = require('uuid');
const MQTT = require('mqtt');

// Internal modules
const Drone = require('./drone');

module.exports = class DroneSimulator {
    constructor(numberOfDrones) {
        this.drones = Object.assign({}, ...Array.from({ length: numberOfDrones }).map(() => ({ [uuid()]: new Drone() })));
        this.mqtt = {
            client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'),
            root: 'mobil-e-hub/v1',
            id: uuid()
        };
        this.timer = null;
        this.interval = null;

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(`${this.mqtt.root}/to/drone/#`);
            this.mqtt.client.subscribe(`${this.mqtt.root}/from/visualization/#`);

            this.publish('connected');
        });

        this.mqtt.client.on('message', (topic, message) => {
            this.receive(topic.split('/'), JSON.parse(message.toString()));
        });
    }

    start(interval) {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.interval = interval;
        this.timer = setInterval(this.moveDrones, interval);
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
        for (const [id, drone] of Object.entries(this.drones)) {
            drone.reset();
            this.publishFrom(`drone/${id}`, 'state', drone);
        }
    }

    publishState() {
        for (const [id, drone] of Object.entries(this.drones)) {
            this.publishFrom(`drone/${id}`, 'state', drone);
        }
    }

    moveDrones = () => {
        for (const [id, drone] of Object.entries(this.drones)) {
            drone.move(this.interval / 1000);
            this.publishFrom(`drone/${id}`, 'state', drone);
        }
    };

    publishFrom(sender, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [DroneSimulator] from/${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    publish(topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/drone-simulator/${this.mqtt.id}/${topic}`, JSON.stringify(message));
        console.log(`< [DroneSimulator] from/drone-simulator/${this.mqtt.id}/${topic}: ${JSON.stringify(message)}`);
    }

    publishTo(receiver, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/to/${receiver}/${topic}`, JSON.stringify(message));
        console.log(`< [DroneSimulator] to/${receiver}/${topic}: ${JSON.stringify(message)}`);
    }

    receive(topic, message) {
        console.log(`> [DroneSimulator] ${topic.join('/')}: ${JSON.stringify(message)}`);

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
