// External modules
const MQTT = require('mqtt');
const mqttMatch = require('mqtt-match');
const dotenv = require('dotenv');

// Internal modules
const {random, uuid} = require('./helpers');

dotenv.config({path: `${__dirname}/../../.env`});
const mqttBrokerURL = process.env.MQTT_BROKER_URL;
const mqttBrokerUsername = process.env.MQTT_BROKER_USERNAME;
const mqttBrokerPassword = process.env.MQTT_BROKER_PASSWORD;
const mqttRoot = process.env.MQTT_ROOT;
const mqttVersion = process.env.MQTT_VERSION;

module.exports = class MQTTClient {
    constructor(type, subscriptionTopics) {
        this.type = type;
        this.mqtt = {
            client: MQTT.connect(mqttBrokerURL, {
                username: mqttBrokerUsername,
                password: mqttBrokerPassword
            }),
            root: `${mqttRoot}/${mqttVersion}`,
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(subscriptionTopics.map(topic => `${this.mqtt.root}/${topic}`));
            this.publish(this.type, 'connected');
            if (this.type == 'bus-simulator') {
                this.start();
            }
        });

        this.mqtt.client.on('message', (topic, message) => {
            let [project, version, entity, id, ...args] = topic.split('/');
            try {
                this.receive({
                    version,
                    entity,
                    id,
                    args,
                    rest: args.join('/'),
                    string: {long: topic, short: `${entity}/${id}/${args.join('/')}`}
                }, JSON.parse(message.toString()));
            } catch (e) {
                 console.error(`> [${this.type}] MQTT message with topic ${topic} and message ${message} could not be parsed. ${e}.`);
            }
        });
    }

    destructor() {
        this.mqtt.client.end();
    }

    publish(sender, topic, message = '') {
        if(topic == undefined){
            //e.g. for connect message
            this.mqtt.client.publish(`${this.mqtt.root}/${sender}`, JSON.stringify(message));
            console.log(`< [${this.type}] ${sender}/${topic}: ${JSON.stringify(message)}`);
        }
        else {
        this.mqtt.client.publish(`${this.mqtt.root}/${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [${this.type}] ${sender}/${topic}: ${JSON.stringify(message)}`);
        }
    }

    receive(topic, message) {
        console.log(`> [${this.type}] ${topic.entity}/${topic.id}/${topic.rest}: ${JSON.stringify(message)}`);
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
