// External modules
const { v4: uuid } = require('uuid');
const MQTT = require('mqtt');

// Internal modules
const Hub = require('./hub');

module.exports = class HubSimulator {
    constructor(numberOfHubs) {
        this.numberOfHubs = numberOfHubs;
        this.hubs = { };

        this.mqtt = {
            client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'),
            root: 'mobil-e-hub/v1',
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(`${this.mqtt.root}/to/hub/#`);
            this.mqtt.client.subscribe(`${this.mqtt.root}/from/visualization/#`);

            this.publish('connected');
        });

        this.mqtt.client.on('message', (topic, message) => {
            this.receive(topic.split('/'), JSON.parse(message.toString()));
        });
    }

    start() {
        this.init();

        for (const [id, hub] of Object.entries(this.hubs)) {
            this.publishFrom(`hub/${id}`, 'state', hub);
        }
    }

    stop() {
        this.hubs = { };
    }

    init() {
        this.hubs = Object.assign({}, ...Array.from({ length: this.numberOfHubs }).map(() => {
            let id = uuid();
            return { [id]: new Hub(id) };
        }));
    }

    publishFrom(sender, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [HubSimulator] from/${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    publish(topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/drone-simulator/${this.mqtt.id}/${topic}`, JSON.stringify(message));
        console.log(`< [HubSimulator] from/drone-simulator/${this.mqtt.id}/${topic}: ${JSON.stringify(message)}`);
    }

    publishTo(receiver, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/to/${receiver}/${topic}`, JSON.stringify(message));
        console.log(`< [HubSimulator] to/${receiver}/${topic}: ${JSON.stringify(message)}`);
    }

    receive(topic, message) {
        console.log(`> [HubSimulator] ${topic.join('/')}: ${JSON.stringify(message)}`);

        if (topic[2] === 'from' && topic[3] === 'visualization' && topic[5] === 'start') {
            this.start();
        }
        else if (topic[2] === 'from' && topic[3] === 'visualization' && topic[5] === 'stop') {
            this.stop();
        }
    }
};
