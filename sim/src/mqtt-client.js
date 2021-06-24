// External modules
const MQTT = require('mqtt');
const mqttMatch = require('mqtt-match');

// Internal modules
const {random, uuid} = require('./helpers');

const mqttBrokerURL = process.env.MQTT_BROKER_test;
const mqttPort = process.env.BROKER_PORT_test;
const mqttRoot = process.env.MQTT_ROOT;

// TODO used in the simulators, but not on the server??

module.exports = class MQTTClient {
    constructor(type, subscriptionTopics) {
        this.type = type;

        this.mqtt = {
            client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'), // TODO use from env: mqttBrokerURL
            root: 'mobil-e-hub/v0', // TODO use from env: mqttRoot,
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(subscriptionTopics.map(topic => `${this.mqtt.root}/${topic}`));
            this.publish(`${this.type}/${this.mqtt.id}: connected`);
        });

        this.mqtt.client.on('message', (topic, message) => {
            let [project, version, direction, entity, id, ...args] = topic.split('/');
            this.receive({
                version,
                direction,
                entity,
                id,
                args,
                rest: args.join('/'),
                string: {long: topic, short: `${direction}/${entity}/${id}/${args.join('/')}`}
            }, JSON.parse(message.toString()));
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
