// External modules
const { v4: uuid } = require('uuid');
const MQTT = require('mqtt');
const random = require('../helpers').random;

// Internal modules

module.exports = class ControlSystem {
    constructor(droneSimulator, vehicleSimulator, hubSimulator, parcelSimulator) {
        this.mqtt = {
            client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'),
            root: 'mobil-e-hub/v1',
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(`${this.mqtt.root}/from/parcel/#`);

            this.publish('connected');
        });

        this.mqtt.client.on('message', (topic, message) => {
            this.receive(topic.split('/'), JSON.parse(message.toString()));
        });

        this.droneSimulator = droneSimulator;
        this.vehicleSimulator = vehicleSimulator;
        this.hubSimulator = hubSimulator;
        this.parcelSimulator = parcelSimulator;
    }

    publishFrom(sender, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [ControlSystem] from/${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    publish(topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/control-system/${this.mqtt.id}/${topic}`, JSON.stringify(message));
        console.log(`< [ControlSystem] from/control-system/${this.mqtt.id}/${topic}: ${JSON.stringify(message)}`);
    }

    publishTo(receiver, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/to/${receiver}/${topic}`, JSON.stringify(message));
        console.log(`< [ControlSystem] to/${receiver}/${topic}: ${JSON.stringify(message)}`);
    }

    receive(topic, message) {
        console.log(`> [ControlSystem] ${topic.join('/')}: ${JSON.stringify(message)}`);

        if (topic[2] === 'from' && topic[3] === 'parcel' && topic[5] === 'state') {
            let hub = this.hubSimulator.hubs[message.position];
            let drone = random.value(this.droneSimulator.drones);
            this.publishTo(`drone/${drone.id}`, 'target', { x: hub.x, y: hub.y });
        }
    }
};
