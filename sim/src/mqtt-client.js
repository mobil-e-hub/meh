// External modules
const MQTT = require('mqtt');
const mqttMatch = require('mqtt-match');

// Internal modules
const { random, uuid } = require('./helpers');


module.exports = class MQTTClient {
    constructor(type, subscriptionTopics) {
        this.type = type;

        this.mqtt = {
            client: MQTT.connect('wss://ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt'),
            root: 'mobil-e-hub/viz',
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(subscriptionTopics.map(topic => `${this.mqtt.root}/${topic}`));
            this.publish('connected');
        });

        this.mqtt.client.on('message', (topic, message) => {
            let [project, version, direction, entity, id, ...args] = topic.split('/');
            this.receive({ version, direction, entity, id, args, rest: args.join('/'), string: { long: topic, short: `${direction}/${entity}/${id}/${args.join('/')}` } }, JSON.parse(message.toString()));
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

    subscribe(topics) {
        this.mqtt.client.subscribe(topics.map(topic => `${this.mqtt.root}/${topic}`));
    }

    unsubscribe(topics) {
        this.mqtt.client.unsubscribe(topics.map(topic => `${this.mqtt.root}/${topic}`));
    }

    matchTopic(topic, pattern) {
        return mqttMatch(pattern, topic.string.short);
    }
};
