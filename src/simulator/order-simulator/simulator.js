// External modules
const { v4: uuid } = require('uuid');
const MQTT = require('mqtt');
const random = require('../helpers').random;

// Internal modules
const Order = require('./order');

module.exports = class OrderSimulator {
    constructor(hubSimulator) {
        this.orders = {};
        this.mqtt = {
            client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'),
            root: 'mobil-e-hub/v1',
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(`${this.mqtt.root}/to/order/#`);
            this.mqtt.client.subscribe(`${this.mqtt.root}/from/visualization/#`);

            this.publish('connected');
        });

        this.mqtt.client.on('message', (topic, message) => {
            this.receive(topic.split('/'), JSON.parse(message.toString()));
        });

        this.hubSimulator = hubSimulator;
    }

    stop() {
        this.orders = {};
    }

    publishState() {
        for (const [id, order] of Object.entries(this.orders)) {
            this.publishFrom(`order/${id}`, 'state', order);
        }
    }

    publishFrom(sender, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [OrderSimulator] from/${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    publish(topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/order-simulator/${this.mqtt.id}/${topic}`, JSON.stringify(message));
        console.log(`< [OrderSimulator] from/order-simulator/${this.mqtt.id}/${topic}: ${JSON.stringify(message)}`);
    }

    publishTo(receiver, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/to/${receiver}/${topic}`, JSON.stringify(message));
        console.log(`< [OrderSimulator] to/${receiver}/${topic}: ${JSON.stringify(message)}`);
    }

    receive(topic, message) {
        console.log(`> [OrderSimulator] ${topic.join('/')}: ${JSON.stringify(message)}`);

        if (topic[2] === 'from' && topic[3] === 'visualization' && topic[5] === 'stop') {
            this.stop();
        }
        else if (topic[2] === 'from' && topic[3] === 'visualization' && topic[5] === 'place-order') {
            let id = uuid();
            let [source, destination] = random.keys(this.hubSimulator.hubs, 2);
            this.orders[id] = new Order(source, destination);
            this.publishFrom(`order/${id}`, 'state', this.orders[id]);
            this.publishFrom(`parcel/${this.orders[id].parcel.id}`, 'state', this.orders[id].parcel);
        }
    }
};
