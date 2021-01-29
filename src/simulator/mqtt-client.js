// External modules
const MQTT = require('mqtt');

// Internal modules
const { random, uuid } = require('./helpers');


module.exports = class MQTTClient {
    constructor(type, subscriptionTopics) {
        this.type = type;

        this.mqtt = {
            client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'),
            root: 'mobil-e-hub/v1',
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(subscriptionTopics.map(topic => `${this.mqtt.root}/${topic}`));
            this.publish('connected');
        });

        this.mqtt.client.on('message', (topic, message) => {
            let [project, version, direction, entity, id, ...args] = topic.split('/');
            this.receive({version, direction, entity, id, args, rest: args.join('/')}, JSON.parse(message.toString()));
        });
    }

    destructor() {
        this.mqtt.client.end();
    }

    publishFrom(sender, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [${this.type}] from/${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    publish(topic, message = '') {
        this.publishFrom(`${this.type}/${this.mqtt.id}`, topic, message);
    }

    publishTo(receiver, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/to/${receiver}/${topic}`, JSON.stringify(message));
        console.log(`< [${this.type}] to/${receiver}/${topic}: ${JSON.stringify(message)}`);
    }

    receive(topic, message) {
        console.log(`> [${this.type}] ${topic.direction}/${topic.entity}/${topic.id}/${topic.rest}: ${JSON.stringify(message)}`);
    }
};
